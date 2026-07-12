---



contentType: recipes
slug: python-polars-fast-dataframe
title: "High-Performance DataFrame Operations with Polars"
description: "How to use Polars for fast DataFrame operations with lazy evaluation, expression API, streaming, and interop with pandas for large datasets."
metaDescription: "Use Polars for fast DataFrame operations with lazy evaluation, expression API, streaming engine, and pandas interop. Process large datasets efficiently."
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
  - /recipes/python-pandas-etl-pipeline
  - /recipes/python-dask-parallel-dataframe
  - /recipes/python-spark-groupby-aggregation
  - /recipes/python-data-validation-pandera
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use Polars for fast DataFrame operations with lazy evaluation, expression API, streaming engine, and pandas interop. Process large datasets efficiently."
  keywords:
    - data
    - python
    - polars
    - dataframe
    - performance
    - recipe



---

## Overview

Polars is a DataFrame library written in Rust with a Python binding. It uses Apache Arrow as its memory format and a lazy evaluation engine that optimizes the query plan before execution. Polars is 5-30x faster than pandas for most operations because it parallelizes across cores, avoids index overhead, and pushes predicates down to the scan layer. The expression API is different from pandas — you chain expressions rather than operating on columns directly.

## When to Use

- Datasets from 1GB to 100GB that don't fit in pandas comfortably
- Group-by and join operations on large DataFrames — Polars is considerably faster
- Pipelines where query optimization matters — lazy evaluation skips unnecessary columns
- Replacing pandas in ETL pipelines for speed without changing to Spark
- Reading/writing Parquet, CSV, or IPC (Arrow) files at scale

## When NOT to Use

- Small datasets (<100MB) — pandas has better ecosystem compatibility
- When you need pandas-specific libraries (geopandas, statsmodels, scikit-learn integration)
- Notebooks with heavy interactive exploration — pandas' eager evaluation is more intuitive
- When the team is deeply familiar with pandas and speed isn't a concern

## Solution

### Basic DataFrame operations

```python
import polars as pl

# Read CSV
df = pl.read_csv("data/orders.csv")

# Read Parquet
df = pl.read_parquet("data/orders.parquet")

# Create from dict
df = pl.DataFrame({
    "order_id": [1, 2, 3, 4, 5],
    "customer": ["Alice", "Bob", "Alice", "Charlie", "Bob"],
    "amount": [100.0, 250.0, 75.5, 300.0, 150.0],
    "order_date": ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"],
})

# Select columns
df.select(["order_id", "amount"])

# Filter rows
df.filter(pl.col("amount") > 100)

# Sort
df.sort("amount", descending=True)

# Add derived columns
df.with_columns([
    (pl.col("amount") * 1.1).alias("amount_with_tax"),
    pl.col("customer").str.to_uppercase().alias("customer_upper"),
])

# Group by and aggregate
df.group_by("customer").agg([
    pl.col("amount").sum().alias("total_spent"),
    pl.col("order_id").count().alias("order_count"),
    pl.col("amount").mean().alias("avg_order"),
])
```

### Lazy evaluation

```python
# Use scan_* for lazy evaluation (doesn't load data yet)
lf = pl.scan_parquet("data/orders.parquet")

# Build query plan — no execution yet
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

# Execute — Polars optimizes the plan, only reads needed columns
df = result.collect()
```

Lazy evaluation means Polars can:
- Push the filter (`amount > 50`) to the scan layer — skip reading rows that don't match
- Only read columns that are used — `order_date`, `amount`, `quantity`, `customer`, `order_id`
- Optimize joins by reordering them

### Reading and writing

```python
# Read CSV with schema
df = pl.read_csv("data/orders.csv", schema_overrides={
    "order_id": pl.Int64,
    "amount": pl.Float64,
    "order_date": pl.Date,
}, try_parse_dates=True)

# Write to Parquet
df.write_parquet("data/output.parquet", compression="zstd")

# Write to CSV
df.write_csv("data/output.csv")

# Write to IPC (Arrow format — fastest for Polars)
df.write_ipc("data/output.arrow")

# Read from multiple files
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

# Join with different column names
orders = orders.rename({"customer_id": "cust_id"})
joined = orders.join(customers, left_on="cust_id", right_on="customer_id", how="left")

# Join on multiple columns
joined = orders.join(customers, on=["customer_id", "region"], how="inner")
```

### Conditional expressions

```python
df = df.with_columns([
    pl.when(pl.col("amount") > 200)
    .then(pl.lit("high"))
    .when(pl.col("amount") > 100)
    .then(pl.lit("medium"))
    .otherwise(pl.lit("low"))
    .alias("tier"),
])

# Map values
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

    # Lag — previous amount per customer
    pl.col("amount").shift(1).over("customer").alias("prev_amount"),

    # Moving average
    pl.col("amount").rolling_mean(window_size=3).over("customer").alias("ma_3"),
])
```

### Concatenation

```python
# Vertical — stack rows
df_all = pl.concat([df_jan, df_feb, df_mar])

# Horizontal — side by side
df_wide = pl.concat([df_left, df_right], how="horizontal")

# Diagonal — fill missing columns with null
df_combined = pl.concat([df_a, df_b], how="diagonal")
```

### Streaming for large datasets

```python
# Stream processing — processes in chunks, lower memory usage
lf = pl.scan_csv("data/huge_file.csv")

result = (
    lf
    .filter(pl.col("amount") > 0)
    .group_by("customer")
    .agg(pl.col("amount").sum())
    .sort("amount", descending=True)
)

# collect_streaming processes in batches
df = result.collect(streaming=True)
```

### Interop with pandas

```python
import pandas as pd
import polars as pl

# pandas to Polars
pdf = pd.read_csv("data.csv")
plf = pl.from_pandas(pdf)

# Polars to pandas
plf = pl.read_csv("data.csv")
pdf = plf.to_pandas()

# Use Polars for heavy computation, convert back to pandas for plotting
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

### SQL interface

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

### Using with PyArrow

```python
import pyarrow as pa
import polars as pl

# PyArrow Table to Polars
table = pa.Table.from_pandas(pd_df)
plf = pl.from_arrow(table)

# Polars to PyArrow Table
table = plf.to_arrow()
```

### Custom aggregation functions

```python
# Custom aggregation with map_elements
df.group_by("customer").agg([
    pl.col("amount").map_elements(lambda x: x.quantile(0.95)).alias("p95_amount"),
    pl.col("amount").std().alias("std_amount"),
    pl.col("amount").median().alias("median_amount"),
])

# Custom with struct output
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


- For a deeper guide, see [Parallel DataFrame Operations with Dask](/recipes/python-dask-parallel-dataframe/).

- Use `scan_*` (lazy) instead of `read_*` (eager) for files — enables query optimization
- Call `.collect()` only at the end — let Polars optimize the full plan
- Use `pl.col()` expressions instead of string column names — enables method chaining
- Filter early in lazy pipelines — Polars pushes predicates to the scan layer
- Use `zstd` compression for Parquet — best ratio with good speed
- Use `streaming=True` for datasets that don't fit in memory
- Avoid `map_elements` for simple operations — use built-in expressions for better performance
- Use `over()` for window functions instead of sorting and manual grouping

## Common Mistakes

- **Using eager mode for large files**: `pl.read_csv` loads everything into memory. Use `pl.scan_csv` with `.collect()` for optimization.
- **Converting to pandas unnecessarily**: `to_pandas()` copies data and loses Arrow format benefits. Stay in Polars for as long as possible.
- **Using `map_elements` for built-in operations**: `map_elements` is slow because it calls Python per element. Use Polars expressions like `pl.col().str.to_uppercase()`.
- **Not using lazy evaluation**: eager mode skips query optimization. `scan_*.lazy().collect()` is faster than `read_*`.
- **Ignoring `schema_overrides`**: Polars infers types from a sample. For large files, the sample may miss edge cases. Specify types explicitly.

## FAQ

### How is Polars different from pandas?

Polars uses Apache Arrow (columnar, zero-copy), has no index, uses a lazy evaluation engine, and parallelizes across cores. pandas uses NumPy arrays, has an index, evaluates eagerly, and is mostly single-threaded.

### Is Polars a replacement for pandas?

For most data processing tasks, yes. For ecosystem compatibility (scikit-learn, geopandas, statsmodels), pandas is still needed. Use `to_pandas()` to convert when necessary.

### How does lazy evaluation work?

You build a query plan with `scan_*` and expression chaining. When you call `.collect()`, Polars optimizes the plan (predicate pushdown, projection pushdown, join reordering) and executes it. This skips reading unnecessary data.

### Can Polars handle datasets larger than memory?

Yes. Use `streaming=True` in `.collect()`. Polars processes data in batches, spilling to disk if needed. This works for group-by, join, and sort operations.

### How do I migrate from pandas to Polars?

Start by replacing `pd.read_csv` with `pl.read_csv` and `df.groupby().agg()` with `df.group_by().agg()`. The expression API (`pl.col()`) replaces direct column access. Use `pl.from_pandas()` and `to_pandas()` for gradual migration.
