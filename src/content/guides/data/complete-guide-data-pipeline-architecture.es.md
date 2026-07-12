---




contentType: guides
slug: complete-guide-data-pipeline-architecture
title: "Arquitectura de Data Pipelines: Batch, Streaming, Lambda"
description: "Dominá arquitectura de data pipelines: batch processing, streaming, patrones lambda y kappa, ETL vs ELT y cómo elegir el approach correcto para tus data workloads."
metaDescription: "Dominá arquitectura de data pipelines: batch processing, streaming, patrones lambda y kappa, ETL vs ELT y cómo elegir el approach correcto para tus workloads."
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
  - /guides/complete-guide-apache-airflow
  - /guides/complete-guide-dbt-data-transformations
  - /patterns/batch-to-streaming-bridge-pattern
  - /guides/complete-guide-data-quality
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Dominá arquitectura de data pipelines: batch processing, streaming, patrones lambda y kappa, ETL vs ELT y cómo elegir el approach correcto para tus workloads."
  keywords:
    - data pipeline architecture
    - batch processing
    - streaming
    - lambda architecture
    - kappa architecture
    - etl
    - elt




---

## Introducción

Data pipelines mueven data de source systems a destinations donde se vuelve useful. La arquitectura que elegís determina latency, throughput, complexity y cost. Batch processing maneja large volumes en un schedule. Streaming procesa events en real-time. Lambda combina ambos. Kappa simplifica usando streaming para todo. A continuación: cada pattern, sus trade-offs y cuándo usarlos.

## Pipeline Patterns Overview

```
BATCH:
  Source → Extract → Transform → Load → Warehouse
  Runs en schedule (hourly, daily). High throughput, high latency.
  Tools: Airflow, Spark, dbt, Snowflake

STREAMING:
  Source → Stream → Process → Sink
  Events procesados as they arrive. Low latency, continuous.
  Tools: Kafka, Flink, Kinesis, Pulsar

LAMBDA:
  Batch layer (historical, accurate) + Speed layer (real-time, approximate)
  + Serving layer (mergea ambos views)
  Problem: dos codebases, dos processing logic

KAPPA:
  Todo es streaming. Batch es just un bounded stream.
  Un codebase, un processing model.
  Requiere replay-capable stream (Kafka log retention)

ETL:
  Extract → Transform → Load
  Transform antes de loadar al warehouse.
  Warehouse stores clean, modeled data only.

ELT:
  Extract → Load → Transform
  Loadá raw data first, transformá inside del warehouse.
  Warehouse stores raw + transformed. Aprovecha warehouse compute.
```

## Batch Processing

### Arquitectura

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

### Implementación con Airflow + Spark

```python
# dags/etl_pipeline.py — Airflow DAG para batch ETL
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
    schedule="0 2 * * *",  # Daily a las 2 AM
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
)

# Step 1: Extractá de source databases a S3
extract_orders = SparkSubmitOperator(
    task_id="extract_orders",
    conn_id="spark_default",
    application="/opt/airflow/jobs/extract_orders.py",
    application_args=["--date", "{{ ds }}", "--output", "s3://staging/orders/"],
    dag=dag,
)

# Step 2: Transformá con Spark
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

# Step 3: Loadéa en Snowflake
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

    # Write a processed zone
    transformed.write.mode("overwrite").parquet(args.output)
    spark.stop()

if __name__ == "__main__":
    main()
```

## Streaming Processing

### Arquitectura

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

### Implementación con Kafka + Flink

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

        // Consumé de Kafka
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

        // Write a Kafka output topic
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

### Python streaming con Faust

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

Pros: Historical accuracy y real-time latency
Cons: Dos codebases, dos processing logic, complexity
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
  │  Un codebase           │
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

Pros: Un codebase, un processing model, replay para backfilling
Cons: Requiere replay-capable stream, high Kafka storage para long retention
```

## ETL vs ELT

```
ETL (Transform antes de Load):
  Source → Extract → Transform (Spark, Python) → Load → Warehouse
  - Transform happens fuera del warehouse
  - Warehouse stores solo clean data
  - Good para: limited warehouse compute, sensitive data masking antes de storage
  - Tools: Airflow + Spark, Informatica, Talend

ELT (Load antes de Transform):
  Source → Extract → Load → Warehouse → Transform (dbt, SQL) → Models
  - Raw data loaded first, transformá inside del warehouse
  - Warehouse stores raw + transformed (staging + marts)
  - Good para: powerful warehouse (Snowflake, BigQuery), iterative development
  - Tools: Fivetran + dbt, Snowpipe + dbt, Dataflow + BigQuery
```

### ELT con dbt

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

## Cómo Elegir el Pattern Correcto

```
Cuándo usar BATCH:
  ✓ Daily/weekly reporting
  ✓ Large historical datasets
  ✓ Complex transformations (joins across many tables)
  ✓ Cost-sensitive (cheaper compute)
  ✓ Data freshness requirement: hours/days

Cuándo usar STREAMING:
  ✓ Real-time alerts y monitoring
  ✓ User-facing dashboards con live data
  ✓ Event-driven architectures
  ✓ Data freshness requirement: seconds/minutes

Cuándo usar LAMBDA:
  ✓ Necesitás historical accuracy y real-time
  ✓ Podés mantener dos codebases
  ✓ Regulatory requirements para exact historical data

Cuándo usar KAPPA:
  ✓ Querés un codebase para batch y streaming
  ✓ Kafka con long retention para replay
  ✓ Team comfortable con streaming-first thinking
  ✓ Podés afford la operational complexity de streaming

Cuándo usar ETL:
  ✓ Limited warehouse compute
  ✓ Data masking/PII removal antes de storage
  ✓ Complex transformations better en Spark/Python

Cuándo usar ELT:
  ✓ Powerful warehouse (Snowflake, BigQuery)
  ✓ Querés iterative development con dbt
  ✓ Necesitás raw data para debugging/reprocessing
  ✓ SQL-native team
```

## Best Practices


- For a deeper guide, see [Batch-to-Streaming Bridge](/es/patterns/batch-to-streaming-bridge-pattern/).

- Empezá con batch, agregá streaming solo cuando needed — batch es simpler y cheaper
- Usá ELT cuando tu warehouse puede handlearlo — dbt + Snowflake/BigQuery es el modern standard
- Usá Kafka con log retention para replay — habilita Kappa architecture y backfilling
- Pipelines idempotent — re-running un pipeline debería producir el mismo result
- Monitoreá data quality — row counts, null rates, schema changes, freshness
- Versioná tus schemas — usá un schema registry para Kafka topics
- Usá checkpoints en streaming — Flink/Spark checkpoints habilitan exactly-once processing
- Separá staging de production — raw → staging → marts layering
- Seteá alerting en pipeline failures — Slack/email notifications desde Airflow
- Documentá data lineage — dbt docs, OpenLineage, o custom lineage tracking

## Common Mistakes

- **Empezar con streaming**: streaming es complex. Empezá con batch, agregá streaming cuando latency requirements lo demanden.
- **No idempotency**: re-running un pipeline appendéa duplicate data. Usá merge/upsert patterns.
- **No schema management**: producers y consumers drift. Usá un schema registry.
- **Mezclar batch y streaming logic**: Lambda architecture requiere mantener dos codebases. Considerá Kappa si posible.
- **No data quality checks**: pipelines silently producen wrong data. Agregá Great Expectations o dbt tests.

## FAQ

### ¿Cuál es la diferencia entre batch y streaming?

Batch procesa fixed-size datasets en un schedule (hourly, daily). Streaming procesa continuous event streams en real-time. Batch tiene higher latency pero simpler infrastructure. Streaming tiene lower latency pero requiere Kafka/Flink y más operational complexity.

### ¿Qué es Lambda architecture?

Un hybrid approach con un batch layer para historical accuracy y un speed layer para real-time approximate results. Un serving layer mergea ambos views. El downside es mantener dos codebases con el mismo business logic.

### ¿Qué es Kappa architecture?

Una simplificación de Lambda donde todo es streaming. Batch processing es reemplazado por replaying un bounded stream desde Kafka. Un codebase, un processing model. Requiere Kafka con sufficient log retention.

### ETL vs ELT — ¿cuál debería usar?

ELT es el modern standard cuando usás capable warehouses como Snowflake o BigQuery. Loadá raw data first, luego transformá con dbt inside del warehouse. ETL es mejor cuando necesitás mask sensitive data antes de storage o tenés limited warehouse compute.

### ¿Qué es idempotency en data pipelines?

Un pipeline es idempotent si running multiple times produce el mismo result que running una vez. Esto significa usar MERGE/UPSERT en vez de INSERT, y partitionar por date para que re-running un day overwrite esa partition en vez de duplicar.
