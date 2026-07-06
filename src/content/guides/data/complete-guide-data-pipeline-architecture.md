---
contentType: guides
slug: complete-guide-data-pipeline-architecture
title: "Complete Guide to Data Pipeline Architecture: Batch, Streaming, Lambda, Kappa"
description: "Master data pipeline architecture: batch processing, streaming, lambda and kappa patterns, ETL vs ELT, and choosing the right approach for your data workloads."
metaDescription: "Master data pipeline architecture: batch processing, streaming, lambda and kappa patterns, ETL vs ELT, and choosing the right approach for your data workloads."
difficulty: advanced
topics:
  - data
tags:
  - guide
  - data-engineering
  - pipeline
  - batch
  - streaming
  - lambda
  - kappa
relatedResources:
  - /guides/data/complete-guide-apache-airflow
  - /guides/data/complete-guide-dbt-data-transformations
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master data pipeline architecture: batch processing, streaming, lambda and kappa patterns, ETL vs ELT, and choosing the right approach for your data workloads."
  keywords:
    - data pipeline architecture
    - batch processing
    - streaming
    - lambda architecture
    - kappa architecture
    - etl
    - elt
---

## Introduction

Data pipelines move data from source systems to destinations where it becomes useful. The architecture you choose determines latency, throughput, complexity, and cost. Batch processing handles large volumes on a schedule. Streaming processes events in real-time. Lambda combines both. Kappa simplifies by using streaming for everything. This guide covers each pattern, their trade-offs, and when to use them.

## Pipeline Patterns Overview

```
BATCH:
  Source → Extract → Transform → Load → Warehouse
  Runs on schedule (hourly, daily). High throughput, high latency.
  Tools: Airflow, Spark, dbt, Snowflake

STREAMING:
  Source → Stream → Process → Sink
  Events processed as they arrive. Low latency, continuous.
  Tools: Kafka, Flink, Kinesis, Pulsar

LAMBDA:
  Batch layer (historical, accurate) + Speed layer (real-time, approximate)
  + Serving layer (merges both views)
  Problem: two codebases, two processing logic

KAPPA:
  Everything is streaming. Batch is just a bounded stream.
  One codebase, one processing model.
  Requires replay-capable stream (Kafka log retention)

ETL:
  Extract → Transform → Load
  Transform before loading into warehouse.
  Warehouse stores clean, modeled data only.

ELT:
  Extract → Load → Transform
  Load raw data first, transform inside warehouse.
  Warehouse stores raw + transformed. Leverages warehouse compute.
```

## Batch Processing

### Architecture

```
Sources (DB, APIs, Files)
    ↓
Extract (Airflow DAG, Spark Job)
    ↓
Staging (S3, GCS, Blob Storage)
    ↓
Transform (Spark, dbt, SQL)
    ↓
Warehouse (Snowflake, BigQuery, Redshift)
    ↓
Consumers (BI, ML, APIs)
```

### Implementation with Airflow + Spark

```python
# dags/etl_pipeline.py — Airflow DAG for batch ETL
from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator
from datetime import datetime, timedelta

default_args = {
    "owner": "data-team",
    "depends_on_past": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}

dag = DAG(
    "daily_etl_pipeline",
    default_args=default_args,
    schedule="0 2 * * *",  # Daily at 2 AM
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
)

# Step 1: Extract from source databases to S3
extract_orders = SparkSubmitOperator(
    task_id="extract_orders",
    conn_id="spark_default",
    application="/opt/airflow/jobs/extract_orders.py",
    application_args=["--date", "{{ ds }}", "--output", "s3://staging/orders/"],
    dag=dag,
)

# Step 2: Transform with Spark
transform_orders = SparkSubmitOperator(
    task_id="transform_orders",
    conn_id="spark_default",
    application="/opt/airflow/jobs/transform_orders.py",
    application_args=[
        "--input", "s3://staging/orders/{{ ds }}/",
        "--output", "s3://processed/orders/{{ ds }}/",
    ],
    dag=dag,
)

# Step 3: Load into Snowflake
load_orders = SnowflakeOperator(
    task_id="load_orders",
    sql="""
        COPY INTO orders_staging
        FROM s3://processed/orders/{{ ds }}/
        CREDENTIALS = (AWS_KEY_ID='{{ var.value.aws_key }}' AWS_SECRET_KEY='{{ var.value.aws_secret }}')
        FILE_FORMAT = (TYPE = PARQUET);
    """,
    snowflake_conn_id="snowflake_default",
    dag=dag,
)

# Step 4: dbt models
run_dbt_models = BashOperator(
    task_id="run_dbt_models",
    bash_command="cd /opt/dbt && dbt run --select staging+ --vars '{date: {{ ds }}}'",
    dag=dag,
)

extract_orders >> transform_orders >> load_orders >> run_dbt_models
```

### Spark batch job

```python
# jobs/transform_orders.py — Spark batch transformation
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    spark = SparkSession.builder.appName("TransformOrders").getOrCreate()

    # Read from staging
    df = spark.read.parquet(args.input)

    # Transform: clean, enrich, aggregate
    transformed = (
        df
        .filter(F.col("status").isin("completed", "shipped"))
        .withColumn("order_date", F.to_date("created_at"))
        .withColumn("total_amount", F.col("subtotal") + F.col("tax") + F.col("shipping"))
        .groupBy("order_date", "region")
        .agg(
            F.count("*").alias("order_count"),
            F.sum("total_amount").alias("revenue"),
            F.avg("total_amount").alias("avg_order_value"),
        )
    )

    # Write to processed zone
    transformed.write.mode("overwrite").parquet(args.output)
    spark.stop()

if __name__ == "__main__":
    main()
```

## Streaming Processing

### Architecture

```
Sources (DB CDC, Events, Logs)
    ↓
Stream (Kafka, Kinesis, Pulsar)
    ↓
Process (Flink, Spark Streaming, Kafka Streams)
    ↓
Sink (Warehouse, DB, Real-time Dashboard)
    ↓
Consumers (Alerts, APIs, ML)
```

### Implementation with Kafka + Flink

```java
// OrderStreamingJob.java — Flink streaming job
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.formats.json.JsonNodeDeserializationSchema;
import org.apache.flink.formats.json.JsonNodeSerializationSchema;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Properties;

public class OrderStreamingJob {

    public static void main(String[] args) throws Exception {
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Kafka consumer configuration
        Properties consumerProps = new Properties();
        consumerProps.setProperty("bootstrap.servers", "kafka:9092");
        consumerProps.setProperty("group.id", "order-processor");

        // Consume from Kafka
        DataStream<JsonNode> orders = env.addSource(
            new FlinkKafkaConsumer<>(
                "orders",
                new JsonNodeDeserializationSchema(),
                consumerProps
            )
        );

        // Process: filter, enrich, aggregate
        DataStream<JsonNode> processed = orders
            .filter(node -> node.has("status") && "completed".equals(node.get("status").asText()))
            .map(node -> {
                ObjectMapper mapper = new ObjectMapper();
                ObjectNode enriched = node.deepCopy();
                double subtotal = node.get("subtotal").asDouble();
                double tax = node.get("tax").asDouble();
                double shipping = node.get("shipping").asDouble();
                enriched.put("total_amount", subtotal + tax + shipping);
                enriched.put("processed_at", System.currentTimeMillis());
                return (JsonNode) enriched;
            });

        // Windowed aggregation: 5-minute tumbling windows
        DataStream<JsonNode> aggregated = processed
            .keyBy(node -> node.get("region").asText())
            .window(TumblingEventTimeWindows.of(Time.minutes(5)))
            .aggregate(new OrderAggregator());

        // Write to Kafka output topic
        Properties producerProps = new Properties();
        producerProps.setProperty("bootstrap.servers", "kafka:9092");

        aggregated.addSink(
            new FlinkKafkaProducer<>(
                "order-metrics",
                new JsonNodeSerializationSchema(),
                producerProps,
                FlinkKafkaProducer.Semantic.EXACTLY_ONCE
            )
        );

        env.execute("Order Streaming Job");
    }
}
```

### Python streaming with Faust

```python
# streaming/order_processor.py — Faust stream processing
import faust

app = faust.App(
    "order-processor",
    broker="kafka://kafka:9092",
    store="rocksdb://",
)

class Order(faust.Record, serializer="json"):
    order_id: str
    customer_id: str
    status: str
    subtotal: float
    tax: float
    shipping: float
    region: str

class OrderMetric(faust.Record, serializer="json"):
    region: str
    order_count: int
    total_revenue: float

orders_topic = app.topic("orders", value_type=Order)
metrics_topic = app.topic("order-metrics", value_type=OrderMetric)

@app.agent(orders_topic)
async def process_order(orders):
    async for order in orders:
        if order.status == "completed":
            total = order.subtotal + order.tax + order.shipping
            await metrics_topic.send(value=OrderMetric(
                region=order.region,
                order_count=1,
                total_revenue=total,
            ))

# 5-minute tumbling window aggregation
@app.timer(interval=300.0)
async def emit_windowed_metrics():
    # Faust tables provide stateful aggregation
    for region, count in region_counts.items():
        revenue = region_revenue[region]
        await metrics_topic.send(value=OrderMetric(
            region=region,
            order_count=count,
            total_revenue=revenue,
        ))

region_counts = app.Table("region_counts", default=int)
region_revenue = app.Table("region_revenue", default=float)

if __name__ == "__main__":
    app.main()
```

## Lambda Architecture

```
                 ┌──────────────────────────────────────┐
                 │           Serving Layer              │
                 │  (Query: merge batch + speed views)  │
                 └──────────┬───────────┬──────────────┘
                            │           │
              ┌─────────────┘           └──────────────┐
              ↓                                        ↓
  ┌────────────────────┐                  ┌──────────────────────┐
  │   Batch Layer      │                  │    Speed Layer       │
  │  (Spark, Hadoop)   │                  │  (Storm, Flink)      │
  │  Historical data   │                  │  Real-time data      │
  │  Accurate, slow    │                  │  Approximate, fast   │
  └────────┬───────────┘                  └──────────┬───────────┘
           │                                         │
           └──────────────┐    ┌─────────────────────┘
                          ↓    ↓
                    ┌──────────────┐
                    │    Source    │
                    │  (Kafka log) │
                    └──────────────┘

Pros: Both historical accuracy and real-time latency
Cons: Two codebases, two processing logic, complexity
```

## Kappa Architecture

```
                 ┌──────────────────────┐
                 │    Serving Layer     │
                 │  (Query: one view)   │
                 └──────────┬───────────┘
                            │
              ┌─────────────┘
              ↓
  ┌────────────────────────┐
  │   Processing Layer     │
  │  (Flink, Kafka Streams)│
  │  One codebase          │
  │  Replay = reprocess    │
  └────────┬───────────────┘
           │
           ↓
  ┌──────────────────┐
  │   Stream Layer   │
  │  (Kafka log)     │
  │  Retention =     │
  │  history depth   │
  └──────────────────┘

Pros: One codebase, one processing model, replay for backfilling
Cons: Requires replay-capable stream, high Kafka storage for long retention
```

## ETL vs ELT

```
ETL (Transform before Load):
  Source → Extract → Transform (Spark, Python) → Load → Warehouse
  - Transform happens outside the warehouse
  - Warehouse stores only clean data
  - Good for: limited warehouse compute, sensitive data masking before storage
  - Tools: Airflow + Spark, Informatica, Talend

ELT (Load before Transform):
  Source → Extract → Load → Warehouse → Transform (dbt, SQL) → Models
  - Raw data loaded first, transformed inside warehouse
  - Warehouse stores raw + transformed (staging + marts)
  - Good for: powerful warehouse (Snowflake, BigQuery), iterative development
  - Tools: Fivetran + dbt, Snowpipe + dbt, Dataflow + BigQuery
```

### ELT with dbt

```sql
-- models/staging/stg_orders.sql — Staging model (raw → clean)
SELECT
    order_id,
    customer_id,
    CAST(created_at AS TIMESTAMP) AS created_at,
    CAST(subtotal AS DECIMAL(10,2)) AS subtotal,
    CAST(tax AS DECIMAL(10,2)) AS tax,
    CAST(shipping AS DECIMAL(10,2)) AS shipping,
    status,
    region
FROM {{ source('raw', 'orders') }}
WHERE status IS NOT NULL

-- models/marts/fct_daily_revenue.sql — Mart model (clean → business)
SELECT
    DATE(created_at) AS order_date,
    region,
    COUNT(*) AS order_count,
    SUM(subtotal + tax + shipping) AS total_revenue,
    AVG(subtotal + tax + shipping) AS avg_order_value
FROM {{ ref('stg_orders') }}
WHERE status = 'completed'
GROUP BY 1, 2
```

## Choosing the Right Pattern

```
When to use BATCH:
  ✓ Daily/weekly reporting
  ✓ Large historical datasets
  ✓ Complex transformations (joins across many tables)
  ✓ Cost-sensitive (cheaper compute)
  ✓ Data freshness requirement: hours/days

When to use STREAMING:
  ✓ Real-time alerts and monitoring
  ✓ User-facing dashboards with live data
  ✓ Event-driven architectures
  ✓ Data freshness requirement: seconds/minutes

When to use LAMBDA:
  ✓ Need both historical accuracy and real-time
  ✓ Can maintain two codebases
  ✓ Regulatory requirements for exact historical data

When to use KAPPA:
  ✓ Want one codebase for batch and streaming
  ✓ Kafka with long retention for replay
  ✓ Team comfortable with streaming-first thinking
  ✓ Can afford the operational complexity of streaming

When to use ETL:
  ✓ Limited warehouse compute
  ✓ Data masking/PII removal before storage
  ✓ Complex transformations better done in Spark/Python

When to use ELT:
  ✓ Powerful warehouse (Snowflake, BigQuery)
  ✓ Want iterative development with dbt
  ✓ Need raw data for debugging/reprocessing
  ✓ SQL-native team
```

## Best Practices

- Start with batch, add streaming only when needed — batch is simpler and cheaper
- Use ELT when your warehouse can handle it — dbt + Snowflake/BigQuery is the modern standard
- Use Kafka with log retention for replay — enables Kappa architecture and backfilling
- Idempotent pipelines — re-running a pipeline should produce the same result
- Monitor data quality — row counts, null rates, schema changes, freshness
- Version your schemas — use a schema registry for Kafka topics
- Use checkpoints in streaming — Flink/Spark checkpoints enable exactly-once processing
- Separate staging from production — raw → staging → marts layering
- Set up alerting on pipeline failures — Slack/email notifications from Airflow
- Document data lineage — dbt docs, OpenLineage, or custom lineage tracking

## Common Mistakes

- **Starting with streaming**: streaming is complex. Start with batch, add streaming when latency requirements demand it.
- **No idempotency**: re-running a pipeline appends duplicate data. Use merge/upsert patterns.
- **No schema management**: producers and consumers drift. Use a schema registry.
- **Mixing batch and streaming logic**: Lambda architecture requires maintaining two codebases. Consider Kappa if possible.
- **No data quality checks**: pipelines silently produce wrong data. Add Great Expectations or dbt tests.

## FAQ

### What is the difference between batch and streaming?

Batch processes fixed-size datasets on a schedule (hourly, daily). Streaming processes continuous event streams in real-time. Batch has higher latency but simpler infrastructure. Streaming has lower latency but requires Kafka/Flink and more operational complexity.

### What is Lambda architecture?

A hybrid approach with a batch layer for historical accuracy and a speed layer for real-time approximate results. A serving layer merges both views. The downside is maintaining two codebases with the same business logic.

### What is Kappa architecture?

A simplification of Lambda where everything is streaming. Batch processing is replaced by replaying a bounded stream from Kafka. One codebase, one processing model. Requires Kafka with sufficient log retention.

### ETL vs ELT — which should I use?

ELT is the modern standard when using powerful warehouses like Snowflake or BigQuery. Load raw data first, then transform with dbt inside the warehouse. ETL is better when you need to mask sensitive data before storage or have limited warehouse compute.

### What is idempotency in data pipelines?

A pipeline is idempotent if running it multiple times produces the same result as running it once. This means using MERGE/UPSERT instead of INSERT, and partitioning by date so re-running a day overwrites that partition instead of duplicating.
