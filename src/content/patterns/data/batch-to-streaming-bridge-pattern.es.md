---
contentType: patterns
slug: batch-to-streaming-bridge-pattern
title: "Patrón Batch-to-Streaming Bridge"
description: "Cómo bridgear batch y streaming pipelines con un data lake. Cubre Lambda architecture, Kafka Connect S3 sink, schema alignment, y unified serving layer."
metaDescription: "Bridgea batch y streaming pipelines con un data lake. Aprende Lambda architecture, Kafka Connect S3 sink, schema alignment, y unified serving layer design."
difficulty: advanced
topics:
  - data
tags:
  - data
  - streaming
  - batch
  - lambda
  - kafka
  - pattern
category: architectural
relatedResources:
  - /patterns/etl-extract-transform-load-pattern
  - /patterns/cdc-change-data-capture-pattern
  - /patterns/schema-registry-evolution-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Bridgea batch y streaming pipelines con un data lake. Aprende Lambda architecture, Kafka Connect S3 sink, schema alignment, y unified serving layer design."
  keywords:
    - data
    - streaming
    - batch
    - lambda
    - kafka
    - pattern
---

## Overview

El batch-to-streaming bridge connecta batch ETL pipelines con real-time streaming pipelines a través de un shared data lake. Los batch pipelines processan historical data en large chunks (daily, hourly). Los streaming pipelines processan events en real time (seconds). El bridge asegura que ambos paths writeéan al mismo storage con el mismo schema, para que downstream consumers puedan queryear both sin saber el source. Este es el Lambda architecture pattern: un batch layer para completeness y un speed layer para freshness, merged en un serving layer. El key challenge es schema alignment — batch y streaming deben producir compatible data formats.

## When to Use

- Systems que necesitan both historical batch processing y real-time streaming
- Migration desde batch ETL a streaming — corré both in parallel durante transition
- Analytics que necesitan fresh data (streaming) y deep history (batch) en una query
- Data lakes donde batch y streaming data deben coexistir en las mismas tables

## When NOT to Use

- Pure streaming systems sin batch component — usá Kafka + Flink directamente
- Pure batch systems sin real-time needs — usá traditional ETL
- Datasets chicos donde batch latency es acceptable — no need para un speed layer
- Systems donde batch y streaming servén completely different use cases sin overlap

## Solution

### Lambda architecture overview

```
Source DB ──CDC──> Kafka ──> Stream Processor ──> Speed Layer (Redis/Real-time)
     │                                              │
     └──Batch ETL──> Data Lake (S3) ──> Batch Layer  │
                         │                            │
                         └──────────> Serving Layer <──┘
                                      (Athena/Trino)
```

### Kafka Connect S3 sink para streaming path

```json
// s3-sink-connector.json — Kafka Connect S3 sink connector config
{
  "name": "s3-customers-sink",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "4",
    "topics": "customer-events",
    "s3.bucket.name": "data-lake-shop",
    "s3.region": "us-east-1",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "parquet.codec": "snappy",
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "partition.duration.ms": "3600000",
    "path.format": "year=YYYY/month=MM/day=dd/hour=HH",
    "locale": "en_US",
    "timezone": "UTC",
    "flush.size": "10000",
    "rotate.interval.ms": "600000",
    "schema.compatibility": "BACKWARD",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "value.converter.enhanced.avro.schema.support": "true"
  }
}
```

### Batch path writeando al mismo data lake

```python
# batch_to_lake.py — batch ETL writeando al mismo S3 path que streaming
import boto3
import pandas as pd
from datetime import datetime

class BatchToLake:
    def __init__(self, bucket, prefix):
        self.s3 = boto3.client('s3')
        self.bucket = bucket
        self.prefix = prefix

    def load_batch(self, df, table_name, batch_date):
        """Writeéa batch data al mismo S3 path format que streaming."""
        # Matcheá el streaming partition format: year=YYYY/month=MM/day=dd
        year, month, day = batch_date.strftime('%Y'), batch_date.strftime('%m'), batch_date.strftime('%d')

        s3_key = f"{self.prefix}/{table_name}/year={year}/month={month}/day={day}/batch_{batch_date.strftime('%Y%m%d')}.parquet"

        # Writeéa Parquet a S3
        parquet_buffer = df.to_parquet(engine='pyarrow', compression='snappy')
        self.s3.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=parquet_buffer
        )

        print(f"Wrote batch to s3://{self.bucket}/{s3_key}")
        return s3_key

    def list_partitions(self, table_name, date):
        """Listá todos los files para un given date — both batch y streaming."""
        year, month, day = date.strftime('%Y'), date.strftime('%m'), date.strftime('%d')
        prefix = f"{self.prefix}/{table_name}/year={year}/month={month}/day={day}/"

        response = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=prefix)

        files = []
        for obj in response.get('Contents', []):
            files.append({
                'key': obj['Key'],
                'size': obj['Size'],
                'source': 'batch' if 'batch_' in obj['Key'] else 'streaming'
            })

        return files
```

### Unified serving layer con Trino/Athena

```sql
-- serving_layer.sql — queryeá batch y streaming data juntos
-- Both paths writeéan al mismo partitioned table en S3
-- Trino/Athena los treatéa como un table

-- Creá un external table over el data lake
CREATE EXTERNAL TABLE IF NOT EXISTS lake.customers (
    id BIGINT,
    email VARCHAR,
    status VARCHAR,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    _source VARCHAR,
    _ingested_at TIMESTAMP
)
STORED AS PARQUET
LOCATION 's3://data-lake-shop/customers/'
PARTITIONED BY (
    year VARCHAR,
    month VARCHAR,
    day VARCHAR,
    hour VARCHAR
);

-- MSCK REPAIR TABLE para discover new partitions
MSCK REPAIR TABLE lake.customers;

-- Queryeá both batch y streaming data en una query
SELECT
    _source,
    COUNT(*) AS row_count,
    MIN(_ingested_at) AS earliest,
    MAX(_ingested_at) AS latest
FROM lake.customers
WHERE year = '2026' AND month = '07' AND day = '05'
GROUP BY _source;

-- Mergeá batch y streaming en un unified view
CREATE OR REPLACE VIEW warehouse.customers_unified AS
SELECT
    id,
    email,
    status,
    is_active,
    created_at,
    -- Preferí streaming data (fresher), fall back a batch
    ROW_NUMBER() OVER (
        PARTITION BY id
        ORDER BY
            CASE _source WHEN 'streaming' THEN 1 WHEN 'batch' THEN 2 END,
            _ingested_at DESC
    ) AS rn
FROM lake.customers
WHERE year = CAST(YEAR(CURRENT_DATE) AS VARCHAR)
  AND month = LPAD(CAST(MONTH(CURRENT_DATE) AS VARCHAR), 2, '0');

-- Final deduplicated view
CREATE OR REPLACE VIEW warehouse.customers_latest AS
SELECT id, email, status, is_active, created_at
FROM warehouse.customers_unified
WHERE rn = 1;
```

### Flink streaming processor para speed layer

```java
// StreamingProcessor.java — Flink processor para el speed layer
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.formats.avro.AvroDeserializationSchema;
import org.apache.flink.formats.avro.AvroSerializationSchema;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;

public class StreamingProcessor {
    public static void main(String[] args) throws Exception {
        var env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Source: Kafka con Avro
        KafkaSource<Customer> source = KafkaSource.<Customer>builder()
            .setBootstrapServers("kafka:9092")
            .setTopics("customer-events")
            .setGroupId("flink-processor")
            .setValueOnlyDeserializer(
                AvroDeserializationSchema.forSpecific(Customer.class)
            )
            .build();

        DataStream<Customer> events = env.fromSource(
            source,
            WatermarkStrategy.noWatermarks(),
            "customer-events"
        );

        // Process: enrich y aggregate
        DataStream<CustomerEnriched> enriched = events
            .map(customer -> {
                var e = new CustomerEnriched();
                e.setId(customer.getId());
                e.setEmail(customer.getEmail().toLowerCase());
                e.setStatus(customer.getStatus());
                e.setActive("active".equals(customer.getStatus()));
                e.setProcessedAt(System.currentTimeMillis());
                return e;
            })
            .name("enrich");

        // Sink 1: Writeéa back a Kafka para real-time consumers
        KafkaSink<CustomerEnriched> kafkaSink = KafkaSink.<CustomerEnriched>builder()
            .setBootstrapServers("kafka:9092")
            .setRecordSerializer(
                KafkaRecordSerializationSchema.builder()
                    .setTopic("customer-events-enriched")
                    .setValueSerializationSchema(
                        AvroSerializationSchema.forSpecific(CustomerEnriched.class)
                    )
                    .build()
            )
            .build();

        enriched.sinkTo(kafkaSink).name("kafka-sink");

        // Sink 2: Writeéa a Redis para el serving layer
        enriched.addSink(new RedisSink<>()).name("redis-sink");

        env.execute("customer-stream-processor");
    }
}
```

### Python unified consumer

```python
# unified_consumer.py — leé desde both batch y streaming
import trino
import pandas as pd
from kafka import KafkaConsumer
import json

class UnifiedConsumer:
    def __init__(self, trino_host, kafka_servers):
        self.trino = trino.dbapi.connect(
            host=trino_host,
            port=443,
            user="analyst"
        )
        self.kafka = KafkaConsumer(
            'customer-events-enriched',
            bootstrap_servers=kafka_servers,
            group_id='unified-consumer',
            auto_offset_reset='latest',
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )

    def get_historical(self, customer_id):
        """Getteá historical data desde batch layer (data lake vía Trino)."""
        query = """
            SELECT * FROM warehouse.customers_latest
            WHERE id = ?
        """
        df = pd.read_sql(query, self.trino, params=[customer_id])
        return df

    def get_realtime_updates(self):
        """Streameá real-time updates desde speed layer (Kafka)."""
        for message in self.kafka:
            event = message.value
            yield event

    def get_unified_view(self, customer_id):
        """Combiná batch history con latest streaming update."""
        historical = self.get_historical(customer_id)

        # Getteá latest streaming update
        latest_stream = None
        for event in self.get_realtime_updates():
            if event['id'] == customer_id:
                latest_stream = event
                break

        if latest_stream:
            # Mergeá: streaming overridea batch para overlapping fields
            result = historical.iloc[0].to_dict() if not historical.empty else {}
            result.update({
                'email': latest_stream.get('email', result.get('email')),
                'status': latest_stream.get('status', result.get('status')),
                'is_active': latest_stream.get('active', result.get('is_active')),
                '_source': 'merged'
            })
            return result

        return historical.iloc[0].to_dict() if not historical.empty else None
```

### Schema alignment entre batch y streaming

```python
# schema_alignment.py — asegurá que batch y streaming producen compatible schemas
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal

class CustomerRecord(BaseModel):
    """Shared schema para both batch y streaming paths."""
    id: int
    email: str
    status: Literal["active", "inactive", "banned", "suspended"]
    is_active: bool
    created_at: datetime
    _source: Literal["batch", "streaming"]
    _ingested_at: datetime

class BatchProducer:
    def produce(self, row):
        return CustomerRecord(
            id=row['id'],
            email=row['email'].lower().strip(),
            status=row['status'],
            is_active=row['status'] == 'active',
            created_at=row['created_at'],
            _source="batch",
            _ingested_at=datetime.now()
        )

class StreamingProducer:
    def produce(self, event):
        return CustomerRecord(
            id=event['after']['id'],
            email=event['after']['email'].lower().strip(),
            status=event['after']['status'],
            is_active=event['after']['status'] == 'active',
            created_at=event['after']['created_at'],
            _source="streaming",
            _ingested_at=datetime.now()
        )
```

## Variants

### Kappa architecture (streaming-only)

```python
# kappa_architecture.py — replaceá batch con replayed streaming
class KappaArchitecture:
    """No batch layer. Processá all data a través de streaming.
    Para historical reprocessing, replayeá el Kafka topic desde el beginning."""
    def reprocess(self, kafka_topic, new_processor):
        # Resetéa consumer offset a earliest
        consumer = KafkaConsumer(
            kafka_topic,
            auto_offset_reset='earliest',
            enable_auto_commit=False,
            group_id=f'reprocess-{datetime.now().timestamp()}'
        )

        for message in consumer:
            new_processor.process(message.value)
```

### Hybrid con materialized views

```sql
-- materialized_view.sql — materialized view para unified serving
CREATE MATERIALIZED VIEW warehouse.customer_stats_hourly AS
SELECT
    DATE_TRUNC('hour', _ingested_at) AS hour,
    _source,
    COUNT(*) AS event_count,
    COUNT(DISTINCT id) AS unique_customers,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_count
FROM lake.customers
WHERE year = CAST(YEAR(CURRENT_DATE) AS VARCHAR)
  AND month = LPAD(CAST(MONTH(CURRENT_DATE) AS VARCHAR), 2, '0')
GROUP BY DATE_TRUNC('hour', _ingested_at), _source;

-- Refreshéa periodicamente
REFRESH MATERIALIZED VIEW warehouse.customer_stats_hourly;
```

## Best Practices

- Usá un shared schema registry — both batch y streaming deben usar el mismo Avro/Protobuf schema
- Tageéa records con `_source` — para que podás distinguish batch de streaming en queries
- Matcheá partition formats — both paths writeéan a `year=YYYY/month=MM/day=dd/hour=HH`
- Usá el speed layer para freshness, batch layer para completeness — mergeá at query time
- Preferí Kappa sobre Lambda cuando sea possible — mantener dos code paths es expensive
- Usá idempotent writes — both paths deberían ser idempotent para que re-runs no creen duplicates
- Monitoreá lag entre batch y streaming — si streaming fall behind, el serving layer showéa stale data
- Usá un unified query engine — Trino, Athena, o Spark pueden queryear both batch y streaming data en un SQL

## Common Mistakes

- **Schema mismatch entre batch y streaming**: batch produce `email` como lowercase, streaming no. Downstream queries gettean inconsistent data. Usá un shared schema.
- **Different partition formats**: batch writeéa a `date=YYYY-MM-DD/`, streaming a `year=YYYY/month=MM/`. El serving layer no puede mergearlos. Aligná partition formats.
- **No deduplication en serving layer**: un customer aparece dos veces — una desde batch, una desde streaming. Usá ROW_NUMBER() para deduplicar.
- **Streaming-only sin batch fallback**: si el streaming pipeline falla, no hay historical data para fall back. Siempre mantené un batch path.
- **No monitorear lag**: streaming fall behind por hours, pero el serving layer lo showéa como "fresh". Monitoreá y alertá en lag.

## FAQ

### ¿Cuál es la diferencia entre Lambda y Kappa architecture?

Lambda tiene separate batch y streaming code paths que mergean en el serving layer. Kappa tiene solo streaming — historical reprocessing se hace replayeando el Kafka topic desde el beginning. Kappa es más simple pero require que todo el data fluya a través de Kafka.

### ¿Cómo aligno schemas entre batch y streaming?

Usá un shared schema registry (Confluent Schema Registry). Both paths usan el mismo Avro o Protobuf schema. Validá records contra el schema antes de writeéar al data lake.

### ¿Qué es un serving layer?

El layer donde batch y streaming data se mergean para querying. Típicamente un SQL engine (Trino, Athena, Spark SQL) over el data lake. Deduplica records, prefiriendo streaming para freshness y batch para completeness.

### ¿Debería usar S3 o HDFS para el data lake?

S3 (o cloud object storage) es preferred — es más barato, scalea infinitely, y no require maintenance. HDFS es para on-premise deployments. Both funcionan con Parquet/ORC formats.

### ¿Cómo handleo late-arriving data en streaming?

Usá watermarks y windowing en tu stream processor (Flink, Spark Streaming). Allowéa un grace period (e.g., 5 minutes) para late events. Después que el window closeéa, writeéa el final result al data lake.
