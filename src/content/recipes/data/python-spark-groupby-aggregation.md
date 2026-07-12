---



contentType: recipes
slug: python-spark-groupby-aggregation
title: "Large-Scale Aggregation with PySpark"
description: "How to perform group-by aggregations on large datasets with PySpark, covering window functions, UDFs, broadcast joins, and performance tuning."
metaDescription: "Perform large-scale group-by aggregations with PySpark. Use window functions, UDFs, broadcast joins, and partition tuning for distributed data processing."
difficulty: advanced
topics:
  - data
tags:
  - data
  - python
  - spark
  - pyspark
  - aggregation
  - big-data
  - recipe
relatedResources:
  - /recipes/python-polars-fast-dataframe
  - /recipes/python-airflow-dag-scheduling
  - /recipes/python-dask-parallel-dataframe
  - /recipes/sql-cte-recursive-hierarchy
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Perform large-scale group-by aggregations with PySpark. Use window functions, UDFs, broadcast joins, and partition tuning for distributed data processing."
  keywords:
    - data
    - python
    - spark
    - pyspark
    - aggregation
    - big-data
    - recipe



---

## Overview

PySpark is the Python API for Apache Spark, a distributed data processing engine. Group-by aggregations are one of the most common operations in data pipelines — summing revenue by customer, counting events by day, averaging metrics by region. On large datasets (100GB+), the way you write group-by operations affects performance dramatically. This approach handles basic aggregations, window functions, UDAFs, broadcast joins, and partition tuning.

## When to Use

- Datasets larger than 100GB that don't fit on a single machine
- Aggregations across billions of rows (clickstream, IoT, transaction logs)
- When you need distributed processing across a cluster
- Pipelines that read from/write to distributed storage (S3, HDFS, GCS)
- When pandas/Polars run out of memory

## When NOT to Use

- Datasets under 10GB — pandas or Polars are faster due to no serialization overhead
- Interactive analysis on small data — pandas is more ergonomic
- Real-time processing — use Structured Streaming or Flink
- Simple transformations without aggregation — a SQL query on the warehouse is simpler

## Solution

### Basic group-by aggregation

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder \
    .appName("aggregations") \
    .config("spark.sql.adaptive.enabled", "true") \
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
    .getOrCreate()

df = spark.read.parquet("s3://data-lake/orders/")

# Basic group-by
result = (
    df
    .groupBy("customer_id")
    .agg(
        F.sum("amount").alias("total_spent"),
        F.count("order_id").alias("order_count"),
        F.avg("amount").alias("avg_order_value"),
        F.max("order_date").alias("last_order_date"),
        F.min("order_date").alias("first_order_date"),
    )
    .orderBy(F.desc("total_spent"))
)

result.show(20)
```

### Group by multiple columns

```python
result = (
    df
    .groupBy("customer_id", F.date_format("order_date", "yyyy-MM").alias("month"))
    .agg(
        F.sum("amount").alias("monthly_spent"),
        F.countDistinct("order_id").alias("unique_orders"),
    )
    .orderBy("customer_id", "month")
)
```

### Window functions

```python
from pyspark.sql import Window

# Define window specification
window_spec = Window.partitionBy("customer_id").orderBy(F.desc("order_date"))

# Row number — latest order gets 1
df_with_rank = df.withColumn(
    "order_rank",
    F.row_number().over(window_spec)
)

# Running total per customer ordered by date
running_total_window = (
    Window
    .partitionBy("customer_id")
    .orderBy("order_date")
    .rowsBetween(Window.unboundedPreceding, Window.currentRow)
)

df_with_running = df.withColumn(
    "running_total",
    F.sum("amount").over(running_total_window)
)

# Lag — previous order amount
df_with_lag = df.withColumn(
    "prev_amount",
    F.lag("amount", 1).over(window_spec)
)

# Percentile within group
df_with_pct = df.withColumn(
    "amount_percentile",
    F.percent_rank().over(Window.partitionBy("category").orderBy("amount"))
)
```

### Multiple aggregations with different groupings

```python
from pyspark.sql import DataFrame

def aggregate_multiple_ways(df: DataFrame) -> DataFrame:
    """Perform multiple aggregations in a single pass."""
    return (
        df
        .groupBy("customer_id")
        .agg(
            F.sum("amount").alias("total_spent"),
            F.sum(F.when(F.col("status") == "completed", F.col("amount")).otherwise(0)).alias("completed_amount"),
            F.sum(F.when(F.col("status") == "cancelled", F.col("amount")).otherwise(0)).alias("cancelled_amount"),
            F.count(F.when(F.col("amount") > 100, 1)).alias("large_orders"),
            F.collect_set("category").alias("categories"),
            F.expr("percentile(amount, 0.95)").alias("p95_amount"),
        )
    )
```

### Broadcast join for small dimension tables

```python
# Small dimension table — broadcast to all executors
customers = spark.read.parquet("s3://data-lake/customers/")
orders = spark.read.parquet("s3://data-lake/orders/")

# Broadcast join — avoids shuffle
joined = orders.join(
    F.broadcast(customers),
    on="customer_id",
    how="left"
)

# Without broadcast — triggers a shuffle (slow for large tables)
# joined = orders.join(customers, on="customer_id", how="left")
```

### Aggregation with pivot

```python
# Pivot: rows=customer, columns=month, values=sum(amount)
pivoted = (
    df
    .groupBy("customer_id")
    .pivot("month")  # or .pivot("month", ["2025-01", "2025-02", "2025-03"])
    .agg(F.sum("amount"))
)
```

### User Defined Aggregate Function (UDAF)

```python
from pyspark.sql.types import DoubleType
from pyspark.sql.functions import udf
from pyspark.sql.functions import struct

# Pandas UDF for custom aggregation (vectorized — faster than regular UDF)
@F.pandas_udf(DoubleType())
def custom_metric(amounts: pd.Series, quantities: pd.Series) -> float:
    """Weighted average price."""
    total_qty = quantities.sum()
    if total_qty == 0:
        return 0.0
    return (amounts * quantities).sum() / total_qty

result = (
    df
    .groupBy("customer_id")
    .agg(
        custom_metric(F.col("amount"), F.col("quantity")).alias("weighted_avg_price")
    )
)
```

### Partition tuning

```python
# Set shuffle partitions (default is 200 — often too many for small data)
spark.conf.set("spark.sql.shuffle.partitions", "50")

# Repartition before group-by to avoid skew
df_repartitioned = df.repartition(100, "customer_id")

result = (
    df_repartitioned
    .groupBy("customer_id")
    .agg(F.sum("amount").alias("total"))
)

# Coalesce after aggregation to reduce small files
result = result.coalesce(10)
result.write.parquet("s3://data-lake/aggregated/")
```

### Handling data skew

```python
# Salting technique for skewed keys
from pyspark.sql.functions import concat, lit, rand, floor, explode, array

# Add a salt key to split large groups
df_salted = df.withColumn(
    "salt",
    floor(rand() * 10).cast("int")
)

# Group by with salt — splits large groups across partitions
partial = (
    df_salted
    .groupBy("customer_id", "salt")
    .agg(F.sum("amount").alias("partial_sum"))
)

# Second aggregation without salt to combine
final = (
    partial
    .groupBy("customer_id")
    .agg(F.sum("partial_sum").alias("total_sum"))
)
```

### Saving results

```python
# Write as Parquet partitioned by date
result.write \
    .partitionBy("year", "month") \
    .mode("overwrite") \
    .parquet("s3://data-lake/aggregated/orders_by_month/")

# Write as CSV
result.write \
    .mode("overwrite") \
    .option("header", "true") \
    .csv("s3://data-lake/aggregated/orders_csv/")

# Write to Hive table
result.write \
    .mode("overwrite") \
    .saveAsTable("analytics.orders_summary")
```

## Variants

### Using Spark SQL

```python
# Register DataFrame as a temp view
df.createOrReplaceTempView("orders")

result = spark.sql("""
    SELECT
        customer_id,
        SUM(amount) AS total_spent,
        COUNT(DISTINCT order_id) AS unique_orders,
        PERCENTILE(amount, 0.95) AS p95_amount
    FROM orders
    WHERE status = 'completed'
    GROUP BY customer_id
    ORDER BY total_spent DESC
""")
```

### Streaming aggregation with Structured Streaming

```python
streaming_df = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "orders") \
    .load()

aggregated = (
    streaming_df
    .selectExpr("CAST(value AS STRING) AS json")
    .selectExpr("json_tuple(json, 'customer_id', 'amount') AS (customer_id, amount)")
    .groupBy("customer_id")
    .agg(F.sum("amount").alias("total"))
)

query = aggregated \
    .writeStream \
    .outputMode("complete") \
    .format("console") \
    .start()
```

### Caching for iterative workloads

```python
# Cache a DataFrame used multiple times
df_cached = df.filter(F.col("status") == "completed").cache()

# First action — materializes cache
result1 = df_cached.groupBy("customer_id").agg(F.sum("amount").alias("total"))

# Second action — uses cache
result2 = df_cached.groupBy("category").agg(F.avg("amount").alias("avg"))

# Unpersist when done
df_cached.unpersist()
```

## Best Practices


- For a deeper guide, see [Parallel DataFrame Operations with Dask](/recipes/python-dask-parallel-dataframe/).

- Set `spark.sql.shuffle.partitions` based on data size — 200 is default, use fewer for small data
- Use `broadcast()` for dimension tables under 10MB — avoids expensive shuffle
- Use Pandas UDFs instead of regular UDFs — vectorized, 10-100x faster
- Filter early — push filters before joins and aggregations to reduce data volume
- Use `coalesce()` instead of `repartition()` when reducing partitions — avoids full shuffle
- Enable Adaptive Query Execution (`spark.sql.adaptive.enabled=true`) — Spark optimizes at runtime
- Use `partitionBy` when writing — enables predicate pushdown for downstream reads
- Avoid `collect()` on large DataFrames — brings all data to the driver

## Common Mistakes

- **Not setting shuffle partitions**: default 200 creates tiny tasks for small aggregations. Set to 20-50 for small data.
- **Using regular UDFs instead of Pandas UDFs**: regular UDFs serialize each row individually. Pandas UDFs process in batches.
- **Not broadcasting small tables**: a 5MB dimension table shuffled across 200 partitions is wasteful. Use `broadcast()`.
- **Calling `collect()` on large results**: brings all data to the driver and crashes it. Use `show()`, `take()`, or write to storage.
- **Not caching reused DataFrames**: if you use a DataFrame 3+ times, cache it. Otherwise Spark recomputes the lineage each time.

## FAQ

### How many shuffle partitions should I set?

Rule of thumb: aim for 100-200MB per partition. For 10GB of shuffled data, use 50-100 partitions. For 1TB, use 5000-10000. Enable AQE and let Spark coalesce automatically.

### What is the difference between `repartition()` and `coalesce()`?

`repartition()` does a full shuffle to redistribute data. `coalesce()` merges existing partitions without shuffle. Use `coalesce()` when reducing partitions and `repartition()` when increasing or when data is skewed.

### How do I handle data skew in group-by?

Use the salting technique: add a random salt (0-9) to the key, aggregate in two stages. Or enable `spark.sql.adaptive.skewJoin.enabled=true` for join skew.

### Should I use DataFrame API or Spark SQL?

Both compile to the same Catalyst optimizer plan. Use whichever is more readable for your team. DataFrame API is better for dynamic/programmatic queries, SQL for static ones.

### How do I monitor Spark performance?

Use the Spark UI (port 4040 by default). Check the Stages tab for shuffle read/write sizes, task duration, and skew. Use `explain()` on DataFrames to see the physical plan.
