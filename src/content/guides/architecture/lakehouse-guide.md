---
contentType: guides
slug: lakehouse-guide
title: "Lakehouse Architecture — The Best of Both Worlds"
description: "A practical guide to Lakehouse architecture: combining data lake storage flexibility with data warehouse reliability using open table formats like Delta Lake, Apache Iceberg, and Hudi."
metaDescription: "Learn Lakehouse architecture: combine data lake flexibility with warehouse reliability. Practical guide to Delta Lake, Apache Iceberg, and Hudi with examples."
difficulty: intermediate
topics:
  - architecture
  - data
  - databases
tags:
  - lakehouse
  - delta-lake
  - apache-iceberg
  - apache-hudi
  - open-table-format
  - acid-transactions
  - time-travel
  - guide
relatedResources:
  - /guides/data-lake-guide
  - /guides/data-mesh-guide
  - /guides/database-sharding-implementation-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn Lakehouse architecture: combine data lake flexibility with warehouse reliability. Practical guide to Delta Lake, Apache Iceberg, and Hudi with examples."
  keywords:
    - lakehouse
    - delta-lake
    - apache-iceberg
    - apache-hudi
    - open-table-format
    - acid-transactions
    - guide
---

## Overview

Lakehouse architecture, pioneered by Databricks, unifies the best of Data Lakes and Data Warehouses. It stores data in open formats (Parquet) on low-cost object storage while adding transactional guarantees, schema enforcement, and time travel — capabilities previously only available in proprietary warehouses. Open table formats like Delta Lake, Apache Iceberg, and Hudi make this possible by maintaining metadata layers that track changes, partitions, and statistics without locking data into a vendor-specific format.

## When to Use

- You need warehouse reliability (ACID, schema enforcement) with lake economics
- Vendor lock-in in proprietary warehouses is a concern
- You want one storage layer for both BI and ML workloads
- Time travel and auditability are required
- Data is consumed by multiple engines (Spark, Presto, DuckDB, Snowflake)

## Lake vs Warehouse vs Lakehouse

| Feature | Data Lake | Data Warehouse | Lakehouse |
|---------|-----------|----------------|-----------|
| **Storage cost** | Low (object storage) | High (proprietary) | Low (object storage) |
| **ACID transactions** | No | Yes | Yes |
| **Schema enforcement** | No | Yes | Yes |
| **Time travel** | No | Limited | Yes |
| **Open formats** | Yes | No | Yes |
| **ML/AI support** | Excellent | Limited | Excellent |
| **BI query performance** | Slow | Fast | Fast (with indexing) |

## Open Table Formats

| Format | Key Feature | Best For |
|--------|------------|----------|
| **Delta Lake** | ACID, time travel, schema enforcement | Spark ecosystems, streaming |
| **Apache Iceberg** | Hidden partitioning, partition evolution | Cloud-native, multi-engine |
| **Apache Hudi** | Incremental processing, record-level updates | CDC, near-real-time ingestion |

## Delta Lake Example

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("LakehouseDelta") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

# Create a Delta table with schema enforcement
spark.sql("""
    CREATE TABLE IF NOT EXISTS bronze.orders (
        order_id STRING,
        customer_id STRING,
        total DECIMAL(10,2),
        status STRING,
        created_at TIMESTAMP
    ) USING DELTA
    LOCATION 's3://lakehouse/bronze/orders'
""")

# Insert with ACID guarantees
spark.sql("""
    INSERT INTO bronze.orders
    VALUES ('ord-001', 'cust-123', 99.99, 'placed', current_timestamp())
""")

# Update in place (not possible in plain Parquet)
spark.sql("""
    UPDATE bronze.orders
    SET status = 'shipped'
    WHERE order_id = 'ord-001'
""")

# Time travel — query previous state
spark.read.format("delta") \
    .option("versionAsOf", 0) \
    .load("s3://lakehouse/bronze/orders") \
    .show()
```

## Apache Iceberg Example

```python
from pyiceberg.catalog import load_catalog

# Load a REST catalog (e.g., Tabular, AWS Glue)
catalog = load_catalog("rest", **{
    "uri": "https://catalog.example.com",
    "warehouse": "s3://lakehouse/"
})

# Create a table with hidden partitioning
table = catalog.create_table(
    identifier="silver.events",
    schema=Schema(
        NestedField(1, "event_id", StringType()),
        NestedField(2, "event_type", StringType()),
        NestedField(3, "timestamp", TimestampType()),
        NestedField(4, "payload", StringType())
    ),
    partition_spec=PartitionSpec(
        PartitionField(source_id=3, field_id=1000, transform=Day(), name="day")
    )
)

# Append data
table.append(df)

# Query with partition evolution (change partitioning without rewriting data)
with table.update_spec() as update:
    update.add_field("hour", Hour(source_column="timestamp"))
```

## Apache Hudi Example

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("HudiExample") \
    .getOrCreate()

# Write with record-level upserts
df.write.format("hudi") \
    .option("hoodie.table.name", "customer_orders") \
    .option("hoodie.datasource.write.recordkey.field", "order_id") \
    .option("hoodie.datasource.write.precombine.field", "updated_at") \
    .option("hoodie.datasource.write.operation", "upsert") \
    .mode("append") \
    .save("s3://lakehouse/hudi/customer_orders")

# Incremental read — only new/changed records since last sync
spark.read.format("hudi") \
    .option("hoodie.datasource.query.type", "incremental") \
    .option("hoodie.datasource.read.begin.instanttime", "20240101000000") \
    .load("s3://lakehouse/hudi/customer_orders")
```

## Medallion Architecture with Lakehouse

```
Bronze (Raw)
    ├── Delta Lake / Iceberg / Hudi tables
    ├── Minimal transformation
    └── Full history retained

Silver (Cleaned)
    ├── Deduplicated, typed, validated
    ├── Joined with reference data
    └── Quality checks enforced

Gold (Curated)
    ├── Aggregated business metrics
    ├── Optimized for BI consumption
    └── Managed as data products
```

## Common Mistakes

- **Treating lakehouse as just storage** — the table format layer is critical; without it, you just have a lake
- **Over-optimizing prematurely** — start with one format (Delta is most mature), add others only if needed
- **No compaction strategy** — small files kill performance; schedule regular compaction jobs
- **Ignoring metastore** — Glue, Hive, or Unity Catalog are essential for table discovery and governance
- **Mixing table formats in one pipeline** — each format has different semantics; mixing them adds complexity

## FAQ

**Which table format should I choose?**
- **Delta Lake**: Best for Spark-centric pipelines and streaming workloads
- **Iceberg**: Best for multi-engine environments and partition evolution
- **Hudi**: Best for CDC and incremental data processing

**Can I query lakehouse tables from Snowflake or BigQuery?**
Yes. Snowflake supports Iceberg tables natively. BigQuery supports BigLake tables over Iceberg and Delta via connectors.

**Is Lakehouse cheaper than a traditional warehouse?**
Storage is considerably cheaper (S3/GCS vs proprietary storage). Compute costs depend on engine choice. Overall TCO is usually lower, especially for large datasets.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: Lakehouse Pipeline with Delta Lake

```text
System: Streaming analytics platform
Volume: 100M events/day (clicks, views, transactions)
Platform: AWS EMR + S3 + Delta Lake + Athena

Medallion Architecture:
  Bronze: Kinesis -> S3 (raw JSON, untransformed)
  Silver: Spark job -> S3 (Delta Lake, cleaned, typed)
  Gold: Spark job -> S3 (Delta Lake, business aggregates)
  Serving: Athena/Trino over S3 Gold -> BI tools

Step 1: Ingest to Bronze
  Kinesis Firehose writes to s3://lakehouse/bronze/events/dt=2026-07-11/
  Format: JSON line-delimited, no Delta partition
  Retention: 30 days (raw backup)

Step 2: Bronze to Silver (cleaning + Delta)
  $ spark-submit --master yarn --num-executors 30 \
      --executor-memory 16g \
      bronze_to_silver_delta.py

  # bronze_to_silver_delta.py
  from delta.tables import DeltaTable
  from pyspark.sql import SparkSession

  spark = SparkSession.builder.appName("BronzeToSilver").getOrCreate()

  raw = spark.read.json("s3://lakehouse/bronze/events/dt=2026-07-11/")
  cleaned = (raw
      .filter("event_id is not null and user_id is not null")
      .withColumn("event_time", to_timestamp("timestamp"))
      .withColumn("event_date", to_date("event_time"))
      .dropDuplicates(["event_id"]))

  # Write with merge (upsert) into existing Delta table
  if DeltaTable.isDeltaTable(spark, "s3://lakehouse/silver/events/"):
      delta_table = DeltaTable.forPath(spark, "s3://lakehouse/silver/events/")
      (delta_table.alias("target")
          .merge(cleaned.alias("source"), "target.event_id = source.event_id")
          .whenMatchedUpdateAll()
          .whenNotMatchedInsertAll()
          .execute())
  else:
      cleaned.write.format("delta")
          .mode("overwrite")
          .partitionBy("event_date")
          .save("s3://lakehouse/silver/events/")

Step 3: Silver to Gold (aggregates)
  silver = spark.read.format("delta").load("s3://lakehouse/silver/events/")

  # Daily aggregate by event type
  daily = (silver.groupBy("event_date", "event_type")
      .agg(count("*").alias("total_events"),
           countDistinct("user_id").alias("unique_users"),
           sum("amount").alias("revenue")))

  daily.write.format("delta")
      .mode("overwrite")
      .option("overwriteSchema", "true")
      .save("s3://lakehouse/gold/daily_metrics/")

Step 4: Optimization and maintenance
  # Compact small files (weekly)
  delta_silver = DeltaTable.forPath(spark, "s3://lakehouse/silver/events/")
  delta_silver.optimize().compact(minFileSize="10MB")

  # Z-Order by user_id for filtered queries
  delta_silver.optimize().zOrder("user_id")

  # Vacuum: remove old versions (retain 7 days)
  delta_silver.vacuum(retentionHours=168)

Step 5: Query from Athena
  -- Create external table over Delta Lake
  CREATE EXTERNAL TABLE silver_events
  STORED AS PARQUET
  LOCATION "s3://lakehouse/silver/events/"
  TBLPROPERTIES ("parquet.compression"="SNAPPY");

  -- Direct query
  SELECT event_type, count(*) as total
  FROM silver_events
  WHERE event_date >= DATE("2026-07-01")
  GROUP BY event_type
  ORDER BY total DESC;

Monitoring:
  - CloudWatch: job duration, memory usage, output file count
  - Alert if Silver has > 1000 small files (< 10MB)
  - Delta Lake transaction log monitoring via DeltaTable.history()
  - Data quality: Great Expectations validates schema and nulls in Silver

Estimated monthly cost:
  S3 storage (100TB): ~$2,300
  EMR (30 executors x 6h/day): ~$2,400
  Athena (BI queries): ~$500
  Total: ~$5,200/month
```

### How do I choose between Delta Lake, Iceberg, and Hudi?

Delta Lake is the best option if you use Spark intensively: native integration, maturity, and abundant documentation. Iceberg is better if you need multi-engine support (Trino, Flink, Snowflake, DuckDB) with hidden partitioning and schema evolution. Hudi is better for CDC and incremental processing with record-level upserts. If you do not have a specific requirement, start with Delta Lake for its simplicity and maturity.
