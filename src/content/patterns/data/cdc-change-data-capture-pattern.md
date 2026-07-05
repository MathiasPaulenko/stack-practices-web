---
contentType: patterns
slug: cdc-change-data-capture-pattern
title: "CDC Change Data Capture Pattern: Stream Database Changes to Downstream Consumers"
description: "How to stream database changes to downstream consumers with CDC. Covers log-based CDC, Debezium, Kafka Connect, outbox pattern, and consumer reconciliation."
metaDescription: "Stream database changes to downstream consumers with CDC. Learn log-based CDC, Debezium, Kafka Connect, outbox pattern, and consumer reconciliation strategies."
difficulty: advanced
topics:
  - data
tags:
  - data
  - cdc
  - streaming
  - kafka
  - debezium
  - pattern
category: architectural
relatedResources:
  - /patterns/etl-extract-transform-load-pattern
  - /patterns/idempotent-load-pattern
  - /patterns/schema-registry-evolution-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Stream database changes to downstream consumers with CDC. Learn log-based CDC, Debezium, Kafka Connect, outbox pattern, and consumer reconciliation strategies."
  keywords:
    - data
    - cdc
    - streaming
    - kafka
    - debezium
    - pattern
---

## Overview

Change Data Capture (CDC) streams every insert, update, and delete from a database to downstream consumers in real time. Instead of polling for changes or doing batch extracts, CDC reads the database transaction log (WAL in PostgreSQL, binlog in MySQL) and publishes each change event to a message broker like Kafka. Consumers subscribe to these events and update their own state — search indexes, caches, analytics warehouses, read models. CDC provides low-latency replication without impacting the source database, because the transaction log is append-only and doesn't add query load.

## When to Use

- Real-time data synchronization between databases and search indexes (Elasticsearch, Algolia)
- Event-driven architectures where services need to react to data changes
- Streaming data from OLTP databases to OLAP warehouses with sub-minute latency
- Maintaining read models in CQRS architectures
- Audit logging at the row level without application code changes

## When NOT to Use

- Batch reporting that doesn't need real-time data — use ETL instead
- Simple data copies with no transformation — use database replication
- Sources without a transaction log (some NoSQL databases)
- When the source database can't handle the additional log read load
- One-time data migrations — use a bulk copy tool

## Solution

### Debezium with PostgreSQL and Kafka

```yaml
# docker-compose.yml — Debezium, Kafka, PostgreSQL
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  postgres:
    image: debezium/postgres:15
    environment:
      POSTGRES_DB: shopdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    command: ["postgres", "-c", "wal_level=logical"]

  connect:
    image: debezium/connect:2.4
    depends_on: [kafka, postgres]
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: connect-cluster
      CONFIG_STORAGE_TOPIC: connect_configs
      OFFSET_STORAGE_TOPIC: connect_offsets
      STATUS_STORAGE_TOPIC: connect_statuses
```

```json
// register-postgres-connector.json — Debezium connector config
{
  "name": "postgres-shop-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "postgres",
    "database.password": "postgres",
    "database.dbname": "shopdb",
    "database.server.name": "shopdb",
    "plugin.name": "pgoutput",
    "table.include.list": "public.customers,public.orders,public.order_items",
    "snapshot.mode": "initial",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}
```

### CDC event structure

```json
// CDC event from Debezium — UPDATE on customers table
{
  "before": {
    "id": 42,
    "email": "old@example.com",
    "status": "inactive"
  },
  "after": {
    "id": 42,
    "email": "new@example.com",
    "status": "active"
  },
  "source": {
    "version": "2.4.0.Final",
    "connector": "postgresql",
    "name": "shopdb",
    "db": "shopdb",
    "schema": "public",
    "table": "customers",
    "ts_ms": 1783305600000,
    "lsn": 12345678,
    "txId": 98765
  },
  "op": "u",
  "ts_ms": 1783305600123
}
```

### Python CDC consumer

```python
# cdc_consumer.py — consume CDC events and update Elasticsearch
from kafka import KafkaConsumer
from elasticsearch import Elasticsearch
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CDCConsumer:
    def __init__(self, kafka_servers, es_host):
        self.consumer = KafkaConsumer(
            'shopdb.public.customers',
            bootstrap_servers=kafka_servers,
            group_id='es-sync',
            auto_offset_reset='earliest',
            enable_auto_commit=False,
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        self.es = Elasticsearch(es_host)
        self.index_name = 'customers'

    def process_events(self):
        for message in self.consumer:
            event = message.value
            op = event.get('op')
            after = event.get('after')
            before = event.get('before')

            try:
                if op == 'c' or op == 'u':
                    # Insert or update
                    self.es.index(
                        index=self.index_name,
                        id=after['id'],
                        document={
                            'email': after['email'],
                            'status': after['status'],
                            'updated_at': after.get('updated_at')
                        }
                    )
                    logger.info(f"Indexed customer {after['id']} (op={op})")

                elif op == 'd':
                    # Delete
                    self.es.delete(
                        index=self.index_name,
                        id=before['id'],
                        ignore=[404]
                    )
                    logger.info(f"Deleted customer {before['id']}")

                # Commit offset only after successful processing
                self.consumer.commit()

            except Exception as e:
                logger.error(f"Failed to process event: {e}")
                # Don't commit — will retry on restart

    def close(self):
        self.consumer.close()
        self.es.close()
```

### Java CDC consumer with Kafka Streams

```java
// CdcStreamProcessor.java — Kafka Streams processor for CDC events
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.kstream.Consumed;
import org.apache.kafka.streams.kstream.KStream;
import org.apache.kafka.streams.kstream.Produced;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Properties;

public class CdcStreamProcessor {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "cdc-processor");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        StreamsBuilder builder = new StreamsBuilder();
        ObjectMapper mapper = new ObjectMapper();

        // Read CDC events from Debezium topic
        KStream<String, String> cdcEvents = builder.stream(
            "shopdb.public.customers",
            Consumed.with(Serdes.String(), Serdes.String())
        );

        // Filter only creates and updates
        KStream<String, String> upserts = cdcEvents.filter((key, value) -> {
            try {
                var node = mapper.readTree(value);
                String op = node.get("op").asText();
                return "c".equals(op) || "u".equals(op);
            } catch (Exception e) {
                return false;
            }
        });

        // Transform to search index format
        KStream<String, String> searchDocs = upserts.mapValues(value -> {
            try {
                var node = mapper.readTree(value);
                var after = node.get("after");
                var searchDoc = mapper.createObjectNode();
                searchDoc.put("id", after.get("id").asInt());
                searchDoc.put("email", after.get("email").asText());
                searchDoc.put("status", after.get("status").asText());
                searchDoc.put("is_active", "active".equals(after.get("status").asText()));
                return mapper.writeValueAsString(searchDoc);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        // Write to search index topic
        searchDocs.to("search.customers", Produced.with(Serdes.String(), Serdes.String()));

        // Branch deletes to a separate topic
        cdcEvents.filter((key, value) -> {
            try {
                return "d".equals(mapper.readTree(value).get("op").asText());
            } catch (Exception e) {
                return false;
            }
        }).to("search.customers.deletes");

        var streams = new org.apache.kafka.streams.KafkaStreams(
            builder.build(),
            new StreamsConfig(props)
        );
        streams.start();

        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }
}
```

### Outbox pattern for reliable CDC

```sql
-- outbox.sql — transactional outbox table in the source database
CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Within the same transaction as the business operation
BEGIN;
INSERT INTO orders (id, customer_id, total, status)
VALUES (1001, 42, 99.99, 'confirmed');

INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
VALUES (
    'Order',
    '1001',
    'OrderConfirmed',
    '{"orderId": 1001, "customerId": 42, "total": 99.99}'
);
COMMIT;
```

```python
# outbox_relay.py — relay outbox events to Kafka
from kafka import KafkaProducer
import psycopg2
import json
import time

class OutboxRelay:
    def __init__(self, db_conn_str, kafka_servers):
        self.db = psycopg2.connect(db_conn_str)
        self.producer = KafkaProducer(
            bootstrap_servers=kafka_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )

    def relay(self):
        while True:
            with self.db.cursor() as cur:
                cur.execute("""
                    SELECT id, aggregate_type, aggregate_id, event_type, payload
                    FROM outbox
                    WHERE processed_at IS NULL
                    ORDER BY created_at
                    LIMIT 100
                    FOR UPDATE SKIP LOCKED
                """)

                rows = cur.fetchall()

                for row in rows:
                    event_id, agg_type, agg_id, event_type, payload = row
                    topic = f"events.{agg_type.lower()}"

                    self.producer.send(topic, key=agg_id, value={
                        'eventId': str(event_id),
                        'eventType': event_type,
                        'aggregateId': agg_id,
                        'payload': payload
                    })

                    cur.execute(
                        "UPDATE outbox SET processed_at = NOW() WHERE id = %s",
                        (event_id,)
                    )

                self.db.commit()

            if not rows:
                time.sleep(0.5)
```

### Consumer reconciliation

```python
# reconciliation.py — periodically verify consumer is in sync
class Reconciliation:
    def __init__(self, source_db, target_es):
        self.source = source_db
        self.target = target_es

    def reconcile(self, table, index):
        # Get source counts
        with self.source.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            source_count = cur.fetchone()[0]

            cur.execute(f"SELECT id FROM {table} ORDER BY updated_at DESC LIMIT 100")
            recent_ids = [row[0] for row in cur.fetchall()]

        # Get target counts
        target_count = self.target.count(index=index)['count']

        if source_count != target_count:
            logger.warning(f"Count mismatch: source={source_count}, target={target_count}")

            # Check recent IDs
            for doc_id in recent_ids:
                exists = self.target.exists(index=index, id=doc_id)
                if not exists:
                    logger.warning(f"Missing in target: id={doc_id}")
                    # Trigger a re-sync for this record
                    self.resync_record(table, index, doc_id)

    def resync_record(self, table, index, doc_id):
        with self.source.cursor() as cur:
            cur.execute(f"SELECT * FROM {table} WHERE id = %s", (doc_id,))
            row = cur.fetchone()
            if row:
                self.target.index(index=index, id=doc_id, document=dict(row))
                logger.info(f"Re-synced record {doc_id}")
```

## Variants

### Query-based CDC (polling)

```python
# polling_cdc.py — simple CDC using updated_at polling
class PollingCDC:
    def __init__(self, conn, poll_interval=5):
        self.conn = conn
        self.poll_interval = poll_interval
        self.last_timestamp = None

    def poll(self, table, callback):
        while True:
            query = f"SELECT * FROM {table}"
            if self.last_timestamp:
                query += f" WHERE updated_at > '{self.last_timestamp}'"
            query += " ORDER BY updated_at"

            with self.conn.cursor() as cur:
                cur.execute(query)
                rows = cur.fetchall()

                for row in rows:
                    callback(row)
                    self.last_timestamp = row['updated_at']

            time.sleep(self.poll_interval)
```

### Trigger-based CDC

```sql
-- Trigger-based CDC — write change records to a delta table
CREATE TABLE customers_delta (
    delta_id SERIAL PRIMARY KEY,
    operation CHAR(1) NOT NULL,
    id INTEGER,
    email VARCHAR(255),
    status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION customers_audit() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO customers_delta (operation, id, email, status)
        VALUES ('D', OLD.id, OLD.email, OLD.status);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO customers_delta (operation, id, email, status)
        VALUES ('U', NEW.id, NEW.email, NEW.status);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO customers_delta (operation, id, email, status)
        VALUES ('I', NEW.id, NEW.email, NEW.status);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION customers_audit();
```

## Best Practices

- Use log-based CDC over polling — it's lower latency, no source impact, and captures deletes
- Use the outbox pattern for reliable event publishing — ensures events are published in the same transaction as the data change
- Handle out-of-order events — use event timestamps and LSN positions, not arrival order
- Make consumers idempotent — processing the same event twice should produce the same result
- Monitor lag — alert when consumer offset lags behind the producer by more than N seconds
- Run periodic reconciliation — compare source and target counts to detect missed events
- Use schema registry — evolve schemas safely without breaking consumers
- Handle schema changes — DDL changes in the source can break CDC connectors. Test migrations against CDC.

## Common Mistakes

- **Polling instead of log-based CDC**: querying `updated_at > last_run` misses deletes and adds load to the source. Use log-based CDC with Debezium.
- **No outbox pattern**: publishing events outside the transaction. If the publish fails, the data change is committed but the event is lost.
- **Non-idempotent consumers**: processing the same event twice creates duplicates. Use upserts with the event ID.
- **No monitoring**: CDC pipelines silently fall behind. Monitor consumer lag and alert on it.
- **Ignoring schema changes**: adding a column to the source table can break the CDC connector. Coordinate DDL changes with CDC maintenance.

## FAQ

### What is Change Data Capture (CDC)?

A pattern that streams every data change (insert, update, delete) from a database to downstream consumers. It reads the database transaction log, so it doesn't add query load to the source.

### What is Debezium?

An open-source CDC platform built on Kafka Connect. It reads transaction logs from PostgreSQL (WAL), MySQL (binlog), MongoDB, SQL Server, and others, and publishes change events to Kafka topics.

### What is the outbox pattern?

Writing events to an outbox table in the same transaction as the data change. A separate relay process reads the outbox and publishes to Kafka. This ensures the event is never lost, even if Kafka is temporarily unavailable.

### How is CDC different from ETL?

CDC is real-time and event-driven — each change is streamed individually. ETL is batch-oriented — data is extracted periodically in bulk. CDC provides lower latency; ETL is simpler for bulk processing.

### How do I handle deletes in CDC?

Log-based CDC captures deletes from the transaction log. Debezium emits a tombstone event (null value) and a delete event with the `before` state. Consumers should delete the corresponding record in the target system.
