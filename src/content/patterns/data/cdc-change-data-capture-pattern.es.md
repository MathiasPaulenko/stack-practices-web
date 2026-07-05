---
contentType: patterns
slug: cdc-change-data-capture-pattern
title: "Patrón CDC Change Data Capture: Stream Database Changes a Downstream Consumers"
description: "Cómo streamear database changes a downstream consumers con CDC. Cubre log-based CDC, Debezium, Kafka Connect, outbox pattern, y consumer reconciliation."
metaDescription: "Streamea database changes a downstream consumers con CDC. Aprende log-based CDC, Debezium, Kafka Connect, outbox pattern, y consumer reconciliation strategies."
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
  metaDescription: "Streamea database changes a downstream consumers con CDC. Aprende log-based CDC, Debezium, Kafka Connect, outbox pattern, y consumer reconciliation strategies."
  keywords:
    - data
    - cdc
    - streaming
    - kafka
    - debezium
    - pattern
---

## Overview

Change Data Capture (CDC) streamea cada insert, update, y delete desde un database a downstream consumers en real time. En vez de pollear por changes o hacer batch extracts, CDC leé el database transaction log (WAL en PostgreSQL, binlog en MySQL) y publicéa cada change event a un message broker como Kafka. Los consumers subscriben a estos events y updatean su propio state — search indexes, caches, analytics warehouses, read models. CDC provee low-latency replication sin impactar el source database, porque el transaction log es append-only y no agrega query load.

## When to Use

- Real-time data synchronization entre databases y search indexes (Elasticsearch, Algolia)
- Event-driven architectures donde los services necesitan react a data changes
- Streaming data desde OLTP databases a OLAP warehouses con sub-minute latency
- Mantener read models en CQRS architectures
- Audit logging a nivel row sin application code changes

## When NOT to Use

- Batch reporting que no necesita real-time data — usá ETL en su lugar
- Simple data copies sin transformation — usá database replication
- Sources sin transaction log (algunos NoSQL databases)
- Cuando el source database no puede handlear el additional log read load
- One-time data migrations — usá un bulk copy tool

## Solution

### Debezium con PostgreSQL y Kafka

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
// CDC event desde Debezium — UPDATE en customers table
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
# cdc_consumer.py — consumí CDC events y updateá Elasticsearch
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
                    # Insert o update
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

                # Commit offset solo después de successful processing
                self.consumer.commit()

            except Exception as e:
                logger.error(f"Failed to process event: {e}")
                # No commitees — va a retry on restart

    def close(self):
        self.consumer.close()
        self.es.close()
```

### Java CDC consumer con Kafka Streams

```java
// CdcStreamProcessor.java — Kafka Streams processor para CDC events
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

        // Leé CDC events desde Debezium topic
        KStream<String, String> cdcEvents = builder.stream(
            "shopdb.public.customers",
            Consumed.with(Serdes.String(), Serdes.String())
        );

        // Filterá solo creates y updates
        KStream<String, String> upserts = cdcEvents.filter((key, value) -> {
            try {
                var node = mapper.readTree(value);
                String op = node.get("op").asText();
                return "c".equals(op) || "u".equals(op);
            } catch (Exception e) {
                return false;
            }
        });

        // Transformá a search index format
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

        // Writeéa a search index topic
        searchDocs.to("search.customers", Produced.with(Serdes.String(), Serdes.String()));

        // Branch deletes a un separate topic
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

### Outbox pattern para reliable CDC

```sql
-- outbox.sql — transactional outbox table en el source database
CREATE TABLE outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Dentro de la misma transaction que la business operation
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
# outbox_relay.py — relay outbox events a Kafka
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
# reconciliation.py — verifyá periodicamente que el consumer está in sync
class Reconciliation:
    def __init__(self, source_db, target_es):
        self.source = source_db
        self.target = target_es

    def reconcile(self, table, index):
        # Getteá source counts
        with self.source.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            source_count = cur.fetchone()[0]

            cur.execute(f"SELECT id FROM {table} ORDER BY updated_at DESC LIMIT 100")
            recent_ids = [row[0] for row in cur.fetchall()]

        # Getteá target counts
        target_count = self.target.count(index=index)['count']

        if source_count != target_count:
            logger.warning(f"Count mismatch: source={source_count}, target={target_count}")

            # Checkeá recent IDs
            for doc_id in recent_ids:
                exists = self.target.exists(index=index, id=doc_id)
                if not exists:
                    logger.warning(f"Missing in target: id={doc_id}")
                    # Triggereá un re-sync para este record
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
# polling_cdc.py — simple CDC usando updated_at polling
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
-- Trigger-based CDC — writeéa change records a un delta table
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

- Usá log-based CDC sobre polling — es lower latency, no source impact, y captura deletes
- Usá el outbox pattern para reliable event publishing — asegura que los events se publish en la misma transaction que el data change
- Handleá out-of-order events — usá event timestamps y LSN positions, no arrival order
- Hacé consumers idempotent — processar el mismo event dos veces debería producir el mismo result
- Monitoreá lag — alertá cuando el consumer offset laggea detrás del producer por más de N seconds
- Corré periodic reconciliation — compará source y target counts para detect missed events
- Usá schema registry — evolucioná schemas safely sin breakear consumers
- Handleá schema changes — DDL changes en el source pueden breakear el CDC connector. Testeá migrations contra CDC.

## Common Mistakes

- **Pollear en vez de log-based CDC**: queryear `updated_at > last_run` missea deletes y agrega load al source. Usá log-based CDC con Debezium.
- **No outbox pattern**: publishear events fuera del transaction. Si el publish falla, el data change está committed pero el event se pierde.
- **Consumers non-idempotent**: processar el mismo event dos veces crea duplicates. Usá upserts con el event ID.
- **No monitoring**: CDC pipelines silently fall behind. Monitoreá consumer lag y alertá on it.
- **Ignorar schema changes**: agregar un column al source table puede breakear el CDC connector. Coordiná DDL changes con CDC maintenance.

## FAQ

### ¿Qué es Change Data Capture (CDC)?

Un pattern que streamea cada data change (insert, update, delete) desde un database a downstream consumers. Leé el database transaction log, así que no agrega query load al source.

### ¿Qué es Debezium?

Una open-source CDC platform built on Kafka Connect. Leé transaction logs desde PostgreSQL (WAL), MySQL (binlog), MongoDB, SQL Server, y otros, y publicéa change events a Kafka topics.

### ¿Qué es el outbox pattern?

Writeéar events a un outbox table en la misma transaction que el data change. Un separate relay process leé el outbox y publicéa a Kafka. Esto asegura que el event nunca se pierde, incluso si Kafka está temporarily unavailable.

### ¿En qué se diferencia CDC de ETL?

CDC es real-time y event-driven — cada change se streamea individualmente. ETL es batch-oriented — data se extrae periodicamente en bulk. CDC provee lower latency; ETL es más simple para bulk processing.

### ¿Cómo handleo deletes en CDC?

Log-based CDC captura deletes desde el transaction log. Debezium emite un tombstone event (null value) y un delete event con el `before` state. Los consumers deberían deletear el corresponding record en el target system.
