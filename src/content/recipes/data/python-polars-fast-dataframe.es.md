---
contentType: recipes
slug: python-polars-fast-dataframe
title: "Operaciones de DataFrame de Alto Rendimiento con Polars"
description: "Cómo usar Polars para operaciones rápidas de DataFrame con lazy evaluation, expression API, streaming e interop con pandas para datasets grandes."
metaDescription: "Usa Polars para operaciones rápidas de DataFrame con lazy evaluation, expression API, streaming engine e interop con pandas. Procesa datasets grandes eficientemente."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - python
  - polars
  - dataframe
  - performance
  - recipe
relatedResources:
  - /recipes/data/python-pandas-etl-pipeline
  - /recipes/data/python-dask-parallel-dataframe
  - /recipes/data/python-spark-groupby-aggregation
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa Polars para operaciones rápidas de DataFrame con lazy evaluation, expression API, streaming engine e interop con pandas. Procesa datasets grandes eficientemente."
  keywords:
    - data
    - python
    - polars
    - dataframe
    - performance
    - recipe
---

## Overview

Polars es una librería de DataFrame escrita en Rust con un binding de Python. Usa Apache Arrow como formato de memoria y un engine de lazy evaluation que optimiza el query plan antes de la ejecución. Polars es 5-30x más rápido que pandas para la mayoría de operaciones porque paraleliza a través de cores, evita el overhead de index y pushea predicados al scan layer. La expression API es diferente de pandas — encadenas expresiones en lugar de operar en columnas directamente.

## When to Use

- Datasets de 1GB a 100GB que no caben cómodamente en pandas
- Operaciones de group-by y join en DataFrames grandes — Polars es significativamente más rápido
- Pipelines donde la optimización de queries importa — lazy evaluation salta columnas innecesarias
- Reemplazar pandas en pipelines ETL por velocidad sin cambiar a Spark
- Leer/escribir archivos Parquet, CSV o IPC (Arrow) a escala

## When NOT to Use

- Datasets pequeños (<100MB) — pandas tiene mejor compatibilidad con el ecosistema
- Cuando necesitas librerías específicas de pandas (geopandas, statsmodels, integración con scikit-learn)
- Notebooks con exploración interactiva pesada — la eager evaluation de pandas es más intuitiva
- Cuando el equipo conoce pandas profundamente y la velocidad no es una preocupación

## Solution

### Operaciones básicas de DataFrame

```python
import polars as pl

# Leer CSV
df = pl.read_csv("data/orders.csv")

# Leer Parquet
df = pl.read_parquet("data/orders.parquet")

# Crear desde dict
df = pl.DataFrame({
    "order_id": [1, 2, 3, 4, 5],
    "customer": ["Alice", "Bob", "Alice", "Charlie", "Bob"],
    "amount": [100.0, 250.0, 75.5, 300.0, 150.0],
    "order_date": ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"],
})

# Seleccionar columnas
df.select(["order_id", "amount"])

# Filtrar filas
df.filter(pl.col("amount") > 100)

# Sort
df.sort("amount", descending=True)

# Agregar columnas derivadas
df.with_columns([
    (pl.col("amount") * 1.1).alias("amount_with_tax"),
    pl.col("customer").str.to_uppercase().alias("customer_upper"),
])

# Group by y aggregate
df.group_by("customer").agg([
    pl.col("amount").sum().alias("total_spent"),
    pl.col("order_id").count().alias("order_count"),
    pl.col("amount").mean().alias("avg_order"),
])
```

### Lazy evaluation

```python
# Usar scan_* para lazy evaluation (no carga data todavía)
lf = pl.scan_parquet("data/orders.parquet")

# Construir query plan — sin ejecución todavía
result = (
    lf
    .filter(pl.col("amount") > 50)
    .with_columns([
        pl.col("order_date").str.strptime(pl.Date, "%Y-%m-%d").alias("date"),
        (pl.col("amount") * pl.col("quantity")).alias("revenue"),
    ])
    .group_by(["customer", pl.col("date").dt.year().alias("year")])
    .agg([
        pl.col("revenue").sum().alias("total_revenue"),
        pl.col("order_id").n_unique().alias("orders"),
    ])
    .sort("total_revenue", descending=True)
)

# Ejecutar — Polars optimiza el plan, solo lee las columnas necesarias
df = result.collect()
```

Lazy evaluation significa que Polars puede:
- Pushear el filter (`amount > 50`) al scan layer — saltar leer filas que no matchean
- Solo leer columnas que se usan — `order_date`, `amount`, `quantity`, `customer`, `order_id`
- Optimizar joins reordenándolos

### Leer y escribir

```python
# Leer CSV con schema
df = pl.read_csv("data/orders.csv", schema_overrides={
    "order_id": pl.Int64,
    "amount": pl.Float64,
    "order_date": pl.Date,
}, try_parse_dates=True)

# Escribir a Parquet
df.write_parquet("data/output.parquet", compression="zstd")

# Escribir a CSV
df.write_csv("data/output.csv")

# Escribir a IPC (formato Arrow — más rápido para Polars)
df.write_ipc("data/output.arrow")

# Leer de múltiples archivos
df = pl.scan_csv("data/part-*.csv").collect()
```

### Joins

```python
orders = pl.DataFrame({
    "order_id": [1, 2, 3],
    "customer_id": [101, 102, 101],
    "amount": [100, 200, 150],
})

customers = pl.DataFrame({
    "customer_id": [101, 102, 103],
    "name": ["Alice", "Bob", "Charlie"],
    "city": ["NYC", "LA", "Chicago"],
})

# Inner join
joined = orders.join(customers, on="customer_id", how="inner")

# Left join
joined = orders.join(customers, on="customer_id", how="left")

# Join con diferentes nombres de columnas
orders = orders.rename({"customer_id": "cust_id"})
joined = orders.join(customers, left_on="cust_id", right_on="customer_id", how="left")

# Join en múltiples columnas
joined = orders.join(customers, on=["customer_id", "region"], how="inner")
```

### Expresiones condicionales

```python
df = df.with_columns([
    pl.when(pl.col("amount") > 200)
    .then(pl.lit("high"))
    .when(pl.col("amount") > 100)
    .then(pl.lit("medium"))
    .otherwise(pl.lit("low"))
    .alias("tier"),
])

# Mapear valores
df = df.with_columns([
    pl.col("status").map_elements({
        "P": "pending",
        "C": "completed",
        "X": "cancelled",
    }).alias("status_label"),
])
```

### Window functions

```python
df = df.with_columns([
    # Running total per customer
    pl.col("amount").cum_sum().over("customer").alias("running_total"),

    # Row number per customer ordered by date
    pl.col("order_id").rank().over("customer").alias("order_seq"),

    # Lag — amount anterior per customer
    pl.col("amount").shift(1).over("customer").alias("prev_amount"),

    # Moving average
    pl.col("amount").rolling_mean(window_size=3).over("customer").alias("ma_3"),
])
```

### Concatenación

```python
# Vertical — stackear filas
df_all = pl.concat([df_jan, df_feb, df_mar])

# Horizontal — lado a lado
df_wide = pl.concat([df_left, df_right], how="horizontal")

# Diagonal — fill missing columns con null
df_combined = pl.concat([df_a, df_b], how="diagonal")
```

### Streaming para datasets grandes

```python
# Stream processing — procesa en chunks, menor uso de memoria
lf = pl.scan_csv("data/huge_file.csv")

result = (
    lf
    .filter(pl.col("amount") > 0)
    .group_by("customer")
    .agg(pl.col("amount").sum())
    .sort("amount", descending=True)
)

# collect_streaming procesa en batches
df = result.collect(streaming=True)
```

### Interop con pandas

```python
import pandas as pd
import polars as pl

# pandas a Polars
pdf = pd.read_csv("data.csv")
plf = pl.from_pandas(pdf)

# Polars a pandas
plf = pl.read_csv("data.csv")
pdf = plf.to_pandas()

# Usar Polars para computación pesada, convertir a pandas para plotting
result = (
    pl.from_pandas(pdf)
    .lazy()
    .filter(pl.col("amount") > 100)
    .group_by("customer")
    .agg(pl.col("amount").sum())
    .collect()
    .to_pandas()
)

result.plot(kind="bar", x="customer", y="amount")
```

### Interfaz SQL

```python
df = pl.read_parquet("data/orders.parquet")

result = pl.sql("""
    SELECT customer, SUM(amount) as total, COUNT(*) as orders
    FROM df
    WHERE amount > 50
    GROUP BY customer
    ORDER BY total DESC
""").collect()
```

## Variants

### Usar con PyArrow

```python
import pyarrow as pa
import polars as pl

# PyArrow Table a Polars
table = pa.Table.from_pandas(pd_df)
plf = pl.from_arrow(table)

# Polars a PyArrow Table
table = plf.to_arrow()
```

### Funciones de agregación custom

```python
# Agregación custom con map_elements
df.group_by("customer").agg([
    pl.col("amount").map_elements(lambda x: x.quantile(0.95)).alias("p95_amount"),
    pl.col("amount").std().alias("std_amount"),
    pl.col("amount").median().alias("median_amount"),
])

# Custom con struct output
df.group_by("customer").agg([
    pl.struct(["amount", "order_id"]).alias("order_details"),
])
```

### Pivot tables

```python
# Pivot: rows=customer, columns=month, values=amount
pivoted = (
    df
    .with_columns(pl.col("order_date").dt.month().alias("month"))
    .pivot(values="amount", index="customer", columns="month", aggregate_function="sum")
)
```

## Best Practices

- Usa `scan_*` (lazy) en lugar de `read_*` (eager) para archivos — habilita optimización de queries
- Llama `.collect()` solo al final — deja que Polars optimice el plan completo
- Usa expresiones `pl.col()` en lugar de nombres de columna strings — habilita method chaining
- Filtra temprano en pipelines lazy — Polars pushea predicados al scan layer
- Usa compresión `zstd` para Parquet — mejor ratio con buena velocidad
- Usa `streaming=True` para datasets que no caben en memoria
- Evita `map_elements` para operaciones simples — usa expresiones built-in para mejor performance
- Usa `over()` para window functions en lugar de sortear y agrupar manualmente

## Common Mistakes

- **Usar modo eager para archivos grandes**: `pl.read_csv` carga todo en memoria. Usa `pl.scan_csv` con `.collect()` para optimización.
- **Convertir a pandas innecesariamente**: `to_pandas()` copia data y pierde los beneficios del formato Arrow. Quédate en Polars el mayor tiempo posible.
- **Usar `map_elements` para operaciones built-in**: `map_elements` es lento porque llama Python por elemento. Usa expresiones de Polars como `pl.col().str.to_uppercase()`.
- **No usar lazy evaluation**: modo eager salta la optimización de queries. `scan_*.lazy().collect()` es más rápido que `read_*`.
- **Ignorar `schema_overrides`**: Polars infiere tipos de un sample. Para archivos grandes, el sample puede perder edge cases. Especifica tipos explícitamente.

## FAQ

### ¿En qué se diferencia Polars de pandas?

Polars usa Apache Arrow (columnar, zero-copy), no tiene index, usa un engine de lazy evaluation y paraleliza a través de cores. pandas usa arrays NumPy, tiene index, evalúa eager y es mayormente single-threaded.

### ¿Polars es un reemplazo para pandas?

Para la mayoría de tareas de procesamiento de datos, sí. Para compatibilidad con el ecosistema (scikit-learn, geopandas, statsmodels), pandas sigue siendo necesario. Usa `to_pandas()` para convertir cuando sea necesario.

### ¿Cómo funciona lazy evaluation?

Construyes un query plan con `scan_*` y chaining de expresiones. Cuando llamas `.collect()`, Polars optimiza el plan (predicate pushdown, projection pushdown, join reordering) y lo ejecuta. Esto salta leer data innecesaria.

### ¿Polars puede manejar datasets más grandes que la memoria?

Sí. Usa `streaming=True` en `.collect()`. Polars procesa data en batches, spilling a disco si es necesario. Esto funciona para group-by, join y sort.

### ¿Cómo migro de pandas a Polars?

Empieza reemplazando `pd.read_csv` con `pl.read_csv` y `df.groupby().agg()` con `df.group_by().agg()`. La expression API (`pl.col()`) reemplaza el acceso directo a columnas. Usa `pl.from_pandas()` y `to_pandas()` para migración gradual.
