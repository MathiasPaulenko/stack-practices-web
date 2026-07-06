---
contentType: patterns
slug: batch-to-streaming-bridge-pattern
title: "Batch-to-Streaming Bridge Pattern: Unify Batch and Streaming Pipelines"
description: "How to bridge batch and streaming pipelines with a data lake. Covers Lambda architecture, Kafka Connect S3 sink, schema alignment, and unified serving layer."
metaDescription: "Bridge batch and streaming pipelines with a data lake. Learn Lambda architecture, Kafka Connect S3 sink, schema alignment, and unified serving layer design."
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
  metaDescription: "Bridge batch and streaming pipelines with a data lake. Learn Lambda architecture, Kafka Connect S3 sink, schema alignment, and unified serving layer design."
  keywords:
    - data
    - streaming
    - batch
    - lambda
    - kafka
    - pattern
---

## Overview

The batch-to-streaming bridge connects batch ETL pipelines with real-time streaming pipelines through a shared data lake. Batch pipelines process historical data in large chunks (daily, hourly). Streaming pipelines process events in real time (seconds). The bridge ensures both paths write to the same storage with the same schema, so downstream consumers can query both without knowing the source. This is the Lambda architecture pattern: a batch layer for completeness and a speed layer for freshness, merged at a serving layer. The key challenge is schema alignment — batch and streaming must produce compatible data formats.

## When to Use

- Systems that need both historical batch processing and real-time streaming
- Migration from batch ETL to streaming — run both in parallel during transition
- Analytics that need fresh data (streaming) and deep history (batch) in one query
- Data lakes where batch and streaming data must coexist in the same tables

## When NOT to Use

- Pure streaming systems with no batch component — use Kafka + Flink directly
- Pure batch systems with no real-time needs — use traditional ETL
- Small datasets where batch latency is acceptable — no need for a speed layer
- Systems where batch and streaming serve completely different use cases with no overlap

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

### Kafka Connect S3 sink for streaming path

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

### Batch path writing to the same data lake

```python
# batch_to_lake.py — batch ETL writing to the same S3 path as streaming
import boto3
import pandas as pd
from datetime import datetime

class BatchToLake:
    def __init__(self, bucket, prefix):
        self.s3 = boto3.client('s3')
        self.bucket = bucket
        self.prefix = prefix

    def load_batch(self, df, table_name, batch_date):
        """Write batch data to the same S3 path format as streaming."""
        # Match the streaming partition format: year=YYYY/month=MM/day=dd
        year, month, day = batch_date.strftime('%Y'), batch_date.strftime('%m'), batch_date.strftime('%d')

        s3_key = f"{self.prefix}/{table_name}/year={year}/month={month}/day={day}/batch_{batch_date.strftime('%Y%m%d')}.parquet"

        # Write Parquet to S3
        parquet_buffer = df.to_parquet(engine='pyarrow', compression='snappy')
        self.s3.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=parquet_buffer
        )

        print(f"Wrote batch to s3://{self.bucket}/{s3_key}")
        return s3_key

    def list_partitions(self, table_name, date):
        """List all files for a given date — both batch and streaming."""
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

### Unified serving layer with Trino/Athena

```sql
-- serving_layer.sql — query batch and streaming data together
-- Both paths write to the same partitioned table in S3
-- Trino/Athena treats them as one table

-- Create an external table over the data lake
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

-- MSCK REPAIR TABLE to discover new partitions
MSCK REPAIR TABLE lake.customers;

-- Query both batch and streaming data in one query
SELECT
    _source,
    COUNT(*) AS row_count,
    MIN(_ingested_at) AS earliest,
    MAX(_ingested_at) AS latest
FROM lake.customers
WHERE year = '2026' AND month = '07' AND day = '05'
GROUP BY _source;

-- Merge batch and streaming into a unified view
CREATE OR REPLACE VIEW warehouse.customers_unified AS
SELECT
    id,
    email,
    status,
    is_active,
    created_at,
    -- Prefer streaming data (fresher), fall back to batch
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

### Flink streaming processor for speed layer

```java
// StreamingProcessor.java — Flink processor for the speed layer
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

        // Source: Kafka with Avro
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

        // Process: enrich and aggregate
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

        // Sink 1: Write back to Kafka for real-time consumers
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

        // Sink 2: Write to Redis for the serving layer
        enriched.addSink(new RedisSink<>()).name("redis-sink");

        env.execute("customer-stream-processor");
    }
}
```

### Python unified consumer

```python
# unified_consumer.py — read from both batch and streaming
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
        """Get historical data from batch layer (data lake via Trino)."""
        query = """
            SELECT * FROM warehouse.customers_latest
            WHERE id = ?
        """
        df = pd.read_sql(query, self.trino, params=[customer_id])
        return df

    def get_realtime_updates(self):
        """Stream real-time updates from speed layer (Kafka)."""
        for message in self.kafka:
            event = message.value
            yield event

    def get_unified_view(self, customer_id):
        """Combine batch history with latest streaming update."""
        historical = self.get_historical(customer_id)

        # Get latest streaming update
        latest_stream = None
        for event in self.get_realtime_updates():
            if event['id'] == customer_id:
                latest_stream = event
                break

        if latest_stream:
            # Merge: streaming overrides batch for overlapping fields
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

### Schema alignment between batch and streaming

```python
# schema_alignment.py — ensure batch and streaming produce compatible schemas
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal

class CustomerRecord(BaseModel):
    """Shared schema for both batch and streaming paths."""
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
# kappa_architecture.py — replace batch with replayed streaming
class KappaArchitecture:
    """No batch layer. Process all data through streaming.
    For historical reprocessing, replay the Kafka topic from the beginning."""
    def reprocess(self, kafka_topic, new_processor):
        # Reset consumer offset to earliest
        consumer = KafkaConsumer(
            kafka_topic,
            auto_offset_reset='earliest',
            enable_auto_commit=False,
            group_id=f'reprocess-{datetime.now().timestamp()}'
        )

        for message in consumer:
            new_processor.process(message.value)
```

### Hybrid with materialized views

```sql
-- materialized_view.sql — materialized view for unified serving
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

-- Refresh periodically
REFRESH MATERIALIZED VIEW warehouse.customer_stats_hourly;
```

## Best Practices

- Use a shared schema registry — both batch and streaming must use the same Avro/Protobuf schema
- Tag records with `_source` — so you can distinguish batch from streaming in queries
- Match partition formats — both paths write to `year=YYYY/month=MM/day=dd/hour=HH`
- Use the speed layer for freshness, batch layer for completeness — merge at query time
- Prefer Kappa over Lambda when possible — maintaining two code paths is expensive
- Use idempotent writes — both paths should be idempotent so re-runs don't create duplicates
- Monitor lag between batch and streaming — if streaming falls behind, the serving layer shows stale data
- Use a unified query engine — Trino, Athena, or Spark can query both batch and streaming data in one SQL

## Common Mistakes

- **Schema mismatch between batch and streaming**: batch produces `email` as lowercase, streaming doesn't. Downstream queries get inconsistent data. Use a shared schema.
- **Different partition formats**: batch writes to `date=YYYY-MM-DD/`, streaming to `year=YYYY/month=MM/`. The serving layer can't merge them. Align partition formats.
- **No deduplication at serving layer**: a customer appears twice — once from batch, once from streaming. Use ROW_NUMBER() to deduplicate.
- **Streaming-only without batch fallback**: if the streaming pipeline fails, there's no historical data to fall back on. Always maintain a batch path.
- **Not monitoring lag**: streaming falls behind by hours, but the serving layer shows it as "fresh". Monitor and alert on lag.

## FAQ

### What is the difference between Lambda and Kappa architecture?

Lambda has separate batch and streaming code paths that merge at the serving layer. Kappa has only streaming — historical reprocessing is done by replaying the Kafka topic from the beginning. Kappa is simpler but requires all data to flow through Kafka.

### How do I align schemas between batch and streaming?

Use a shared schema registry (Confluent Schema Registry). Both paths use the same Avro or Protobuf schema. Validate records against the schema before writing to the data lake.

### What is a serving layer?

The layer where batch and streaming data are merged for querying. Typically a SQL engine (Trino, Athena, Spark SQL) over the data lake. It deduplicates records, preferring streaming for freshness and batch for completeness.

### Should I use S3 or HDFS for the data lake?

S3 (or cloud object storage) is preferred — it's cheaper, scales infinitely, and requires no maintenance. HDFS is for on-premise deployments. Both work with Parquet/ORC formats.

### How do I handle late-arriving data in streaming?

Use watermarks and windowing in your stream processor (Flink, Spark Streaming). Allow a grace period (e.g., 5 minutes) for late events. After the window closes, write the final result to the data lake.
