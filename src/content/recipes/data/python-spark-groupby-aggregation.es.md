---
contentType: recipes
slug: python-spark-groupby-aggregation
title: "Agregaciones a Gran Escala con PySpark"
description: "Cómo realizar agregaciones group-by en datasets grandes con PySpark, cubriendo window functions, UDFs, broadcast joins y tuning de performance."
metaDescription: "Realiza agregaciones group-by a gran escala con PySpark. Usa window functions, UDFs, broadcast joins y tuning de particiones para procesamiento distribuido."
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
  - /recipes/data/python-polars-fast-dataframe
  - /recipes/data/python-airflow-dag-scheduling
  - /recipes/data/python-dask-parallel-dataframe
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Realiza agregaciones group-by a gran escala con PySpark. Usa window functions, UDFs, broadcast joins y tuning de particiones para procesamiento distribuido."
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

PySpark es la API de Python para Apache Spark, un engine de procesamiento de datos distribuido. Las agregaciones group-by son una de las operaciones más comunes en pipelines de datos — sumar revenue por customer, contar eventos por día, promediar métricas por región. En datasets grandes (100GB+), la forma en que escribes las operaciones group-by afecta la performance dramáticamente. Esta receta cubre agregaciones básicas, window functions, UDAFs, broadcast joins y tuning de particiones.

## When to Use

- Datasets más grandes que 100GB que no caben en una sola máquina
- Agregaciones a través de billones de rows (clickstream, IoT, transaction logs)
- Cuando necesitas procesamiento distribuido a través de un cluster
- Pipelines que leen de/escriben a storage distribuido (S3, HDFS, GCS)
- Cuando pandas/Polars se quedan sin memoria

## When NOT to Use

- Datasets bajo 10GB — pandas o Polars son más rápidos por no tener overhead de serialización
- Análisis interactivo en data pequeña — pandas es más ergonómico
- Procesamiento real-time — usa Structured Streaming o Flink
- Transformaciones simples sin agregación — un SQL query en el warehouse es más simple

## Solution

### Agregación group-by básica

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

spark = SparkSession.builder \
    .appName("aggregations") \
    .config("spark.sql.adaptive.enabled", "true") \
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
    .getOrCreate()

df = spark.read.parquet("s3://data-lake/orders/")

# Group-by básico
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

### Group by múltiples columnas

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

# Definir window specification
window_spec = Window.partitionBy("customer_id").orderBy(F.desc("order_date"))

# Row number — el order más reciente gets 1
df_with_rank = df.withColumn(
    "order_rank",
    F.row_number().over(window_spec)
)

# Running total per customer ordered por date
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

# Lag — amount del order anterior
df_with_lag = df.withColumn(
    "prev_amount",
    F.lag("amount", 1).over(window_spec)
)

# Percentile dentro del group
df_with_pct = df.withColumn(
    "amount_percentile",
    F.percent_rank().over(Window.partitionBy("category").orderBy("amount"))
)
```

### Múltiples agregaciones con diferentes groupings

```python
from pyspark.sql import DataFrame

def aggregate_multiple_ways(df: DataFrame) -> DataFrame:
    """Realizar múltiples agregaciones en un solo pass."""
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

### Broadcast join para tablas de dimensiones pequeñas

```python
# Tabla de dimensiones pequeña — broadcast a todos los executors
customers = spark.read.parquet("s3://data-lake/customers/")
orders = spark.read.parquet("s3://data-lake/orders/")

# Broadcast join — evita shuffle
joined = orders.join(
    F.broadcast(customers),
    on="customer_id",
    how="left"
)

# Sin broadcast — triggerea un shuffle (lento para tablas grandes)
# joined = orders.join(customers, on="customer_id", how="left")
```

### Agregación con pivot

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

# Pandas UDF para agregación custom (vectorized — más rápido que regular UDF)
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

### Tuning de particiones

```python
# Setear shuffle partitions (default es 200 — a menudo demasiado para data pequeña)
spark.conf.set("spark.sql.shuffle.partitions", "50")

# Repartition antes de group-by para evitar skew
df_repartitioned = df.repartition(100, "customer_id")

result = (
    df_repartitioned
    .groupBy("customer_id")
    .agg(F.sum("amount").alias("total"))
)

# Coalesce después de agregación para reducir small files
result = result.coalesce(10)
result.write.parquet("s3://data-lake/aggregated/")
```

### Manejar data skew

```python
# Técnica de salting para keys skewed
from pyspark.sql.functions import concat, lit, rand, floor, explode, array

# Agregar salt key para splittear grupos grandes
df_salted = df.withColumn(
    "salt",
    floor(rand() * 10).cast("int")
)

# Group by con salt — splittea grupos grandes a través de particiones
partial = (
    df_salted
    .groupBy("customer_id", "salt")
    .agg(F.sum("amount").alias("partial_sum"))
)

# Segunda agregación sin salt para combinar
final = (
    partial
    .groupBy("customer_id")
    .agg(F.sum("partial_sum").alias("total_sum"))
)
```

### Guardar resultados

```python
# Escribir como Parquet partitioned por date
result.write \
    .partitionBy("year", "month") \
    .mode("overwrite") \
    .parquet("s3://data-lake/aggregated/orders_by_month/")

# Escribir como CSV
result.write \
    .mode("overwrite") \
    .option("header", "true") \
    .csv("s3://data-lake/aggregated/orders_csv/")

# Escribir a Hive table
result.write \
    .mode("overwrite") \
    .saveAsTable("analytics.orders_summary")
```

## Variants

### Usar Spark SQL

```python
# Registrar DataFrame como temp view
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

### Agregación streaming con Structured Streaming

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

### Caching para workloads iterativos

```python
# Cachear un DataFrame usado múltiples veces
df_cached = df.filter(F.col("status") == "completed").cache()

# Primera action — materializa el cache
result1 = df_cached.groupBy("customer_id").agg(F.sum("amount").alias("total"))

# Segunda action — usa el cache
result2 = df_cached.groupBy("category").agg(F.avg("amount").alias("avg"))

# Unpersist cuando termines
df_cached.unpersist()
```

## Best Practices

- Setea `spark.sql.shuffle.partitions` basado en el tamaño de data — 200 es default, usa menos para data pequeña
- Usa `broadcast()` para tablas de dimensiones bajo 10MB — evita shuffle expensive
- Usa Pandas UDFs en lugar de regular UDFs — vectorized, 10-100x más rápido
- Filtra temprano — pushea filters antes de joins y agregaciones para reducir el volumen de data
- Usa `coalesce()` en lugar de `repartition()` cuando reduces particiones — evita full shuffle
- Habilita Adaptive Query Execution (`spark.sql.adaptive.enabled=true`) — Spark optimiza en runtime
- Usa `partitionBy` al escribir — habilita predicate pushdown para reads downstream
- Evita `collect()` en DataFrames grandes — trae toda la data al driver

## Common Mistakes

- **No setear shuffle partitions**: default 200 crea tasks tiny para agregaciones pequeñas. Setea a 20-50 para data pequeña.
- **Usar regular UDFs en lugar de Pandas UDFs**: regular UDFs serializan cada row individualmente. Pandas UDFs procesan en batches.
- **No broadcastear tablas pequeñas**: una tabla de dimensión de 5MB shufflada a través de 200 particiones es wasteful. Usa `broadcast()`.
- **Llamar `collect()` en resultados grandes**: trae toda la data al driver y lo crashea. Usa `show()`, `take()` o escribe a storage.
- **No cachear DataFrames reusados**: si usas un DataFrame 3+ veces, cachéalo. Si no, Spark recomputa el lineage cada vez.

## FAQ

### ¿Cuántas shuffle partitions debería setear?

Regla general: apunta a 100-200MB por partición. Para 10GB de data shufflada, usa 50-100 particiones. Para 1TB, usa 5000-10000. Habilita AQE y deja que Spark coalesce automáticamente.

### ¿Cuál es la diferencia entre `repartition()` y `coalesce()`?

`repartition()` hace un full shuffle para redistribuir data. `coalesce()` mergea particiones existentes sin shuffle. Usa `coalesce()` cuando reduces particiones y `repartition()` cuando aumentas o cuando la data está skewed.

### ¿Cómo manejo data skew en group-by?

Usa la técnica de salting: agrega un salt random (0-9) al key, agrega en dos stages. O habilita `spark.sql.adaptive.skewJoin.enabled=true` para join skew.

### ¿Debería usar DataFrame API o Spark SQL?

Ambos compilan al mismo plan del Catalyst optimizer. Usa el que sea más legible para tu equipo. DataFrame API es mejor para queries dinámicos/programáticos, SQL para estáticos.

### ¿Cómo monitoreo la performance de Spark?

Usa la Spark UI (port 4040 por default). Chequea el tab de Stages para tamaños de shuffle read/write, duración de tasks y skew. Usa `explain()` en DataFrames para ver el physical plan.
