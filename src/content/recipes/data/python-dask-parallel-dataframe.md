---
contentType: recipes
slug: python-dask-parallel-dataframe
title: "Parallel DataFrame Operations with Dask"
description: "How to use Dask for parallel DataFrame operations on datasets larger than memory, covering lazy evaluation, partitions, custom computations, and distributed scheduling."
metaDescription: "Use Dask for parallel DataFrame operations on datasets larger than memory. Lazy evaluation, partition management, custom computations, and distributed scheduling."
difficulty: advanced
topics:
  - data
tags:
  - data
  - python
  - dask
  - dataframe
  - parallel
  - big-data
  - recipe
relatedResources:
  - /recipes/data/python-polars-fast-dataframe
  - /recipes/data/python-pandas-etl-pipeline
  - /recipes/data/python-spark-groupby-aggregation
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use Dask for parallel DataFrame operations on datasets larger than memory. Lazy evaluation, partition management, custom computations, and distributed scheduling."
  keywords:
    - data
    - python
    - dask
    - dataframe
    - parallel
    - big-data
    - recipe
---

## Overview

Dask extends pandas/NumPy to work on datasets larger than memory by splitting DataFrames into partitions and processing them in parallel. A Dask DataFrame is a collection of pandas DataFrames — each partition is a regular pandas DataFrame that fits in memory. Dask builds a task graph of operations and executes them lazily, parallelizing across cores (local scheduler) or machines (distributed scheduler). The API mirrors pandas, so most pandas code works with minimal changes.

## When to Use

- Datasets from 1GB to 1TB that don't fit in memory but fit on disk
- pandas code that needs to scale — Dask mirrors the pandas API
- When you want parallelism without setting up a Spark cluster
- ETL pipelines that read/write Parquet, CSV, or HDF5
- When you need custom parallel computations beyond group-by/join

## When NOT to Use

- Datasets under 1GB — pandas is faster (no task graph overhead)
- When you need the full pandas ecosystem — Dask doesn't support every pandas method
- Real-time/streaming — use Structured Streaming or Flink
- When Polars is sufficient — Polars is faster for most DataFrame operations

## Solution

### Basic Dask DataFrame

```python
import dask.dataframe as dd

# Read CSV (lazy — doesn't load until compute)
ddf = dd.read_csv("data/orders_*.csv")

# Read Parquet
ddf = dd.read_parquet("data/orders/")

# From pandas
import pandas as pd
pdf = pd.read_csv("data.csv")
ddf = dd.from_pandas(pdf, npartitions=4)

# Inspect
print(ddf.npartitions)  # Number of partitions
print(ddf.divisions)    # Partition boundaries (known if sorted)
```

### Lazy operations

```python
# Build task graph — no execution yet
result = (
    ddf
    .query("amount > 100")
    .groupby("customer_id")
    .agg({"amount": "sum"})
    .reset_index()
    .sort_values("amount", ascending=False)
)

# Execute — triggers computation
df = result.compute()  # Returns a pandas DataFrame
print(df.head(10))
```

### Reading and writing

```python
# Read multiple CSV files
ddf = dd.read_csv("data/2025-*.csv", parse_dates=["order_date"])

# Read with dtypes
ddf = dd.read_csv("data/orders.csv", dtype={
    "order_id": "int64",
    "amount": "float64",
    "customer_id": "object",
})

# Write to Parquet (partitioned)
ddf.to_parquet("data/output/", write_index=False)

# Write to a single CSV
ddf.to_csv("data/output_*.csv", index=False)  # One file per partition
```

### Group-by and aggregation

```python
# Group-by aggregation (parallel across partitions)
result = (
    ddf
    .groupby("customer_id")
    .agg({
        "amount": ["sum", "mean", "count"],
        "order_id": "nunique",
    })
    .compute()
)

# Custom aggregation
result = (
    ddf
    .groupby("category")
    .agg(
        total_revenue=("amount", "sum"),
        avg_order=("amount", "mean"),
        order_count=("order_id", "count"),
    )
    .compute()
)
```

### Joins

```python
orders = dd.read_parquet("data/orders/")
customers = dd.read_parquet("data/customers/")

# Join (requires shuffle if not sorted by join key)
joined = orders.merge(customers, on="customer_id", how="left")

# Broadcast join for small right DataFrame
small_customers = customers.head(1000)  # pandas DataFrame
joined = orders.merge(
    dd.from_pandas(small_customers, npartitions=1),
    on="customer_id",
    how="left",
    broadcast=True,
)

result = joined.compute()
```

### Custom parallel computation with map_partitions

```python
def process_partition(pdf: pd.DataFrame) -> pd.DataFrame:
    """Process a single partition (pandas DataFrame)."""
    pdf["amount_with_tax"] = pdf["amount"] * 1.1
    pdf["order_date"] = pd.to_datetime(pdf["order_date"])
    pdf["month"] = pdf["order_date"].dt.month
    return pdf

# Apply function to each partition
ddf_processed = ddf.map_partitions(process_partition)

result = ddf_processed.compute()
```

### Custom computation with delayed

```python
import dask

@dask.delayed
def load_file(path):
    return pd.read_csv(path)

@dask.delayed
def process(df):
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    return df.dropna(subset=["amount"])

@dask.delayed
def aggregate(dfs):
    combined = pd.concat(dfs)
    return combined.groupby("customer_id")["amount"].sum()

# Build task graph
files = ["data/jan.csv", "data/feb.csv", "data/mar.csv"]
processed = [process(load_file(f)) for f in files]
result = aggregate(processed)

# Execute
df = result.compute()
```

### Repartitioning

```python
# Set number of partitions
ddf = ddf.repartition(npartitions=10)

# Set partition size (e.g., 100MB per partition)
ddf = ddf.repartition(partition_size="100MB")

# Reset index to make divisions known
ddf = ddf.reset_index(drop=True)
ddf = ddf.set_index("customer_id")  # Shuffles data
```

### Using Dask Distributed

```python
from dask.distributed import Client

# Local cluster (uses all cores)
client = Client(n_workers=4, threads_per_worker=2, memory_limit="4GB")

# Now all .compute() calls use the distributed scheduler
ddf = dd.read_parquet("data/orders/")
result = ddf.groupby("customer_id")["amount"].sum().compute()

# Connect to existing cluster
# client = Client("scheduler-address:8786")

# Close when done
client.close()
```

### Persisting data in memory

```python
# Persist — load into distributed memory across workers
ddf_persisted = ddf.persist()

# Now operations on ddf_persisted are fast (data is in memory)
result = ddf_persisted.groupby("customer_id")["amount"].sum().compute()
```

### Progress monitoring

```python
from dask.distributed import progress

# Compute with progress bar
result = ddf.groupby("customer_id")["amount"].sum()
future = client.compute(result)
progress(future)
df = future.result()
```

## Variants

### Using Dask with S3

```python
ddf = dd.read_parquet(
    "s3://my-bucket/data/orders/",
    storage_options={"key": "aws-key", "secret": "aws-secret"},
)

ddf.to_parquet(
    "s3://my-bucket/data/output/",
    storage_options={"key": "aws-key", "secret": "aws-secret"},
)
```

### Dask Bag for unstructured data

```python
import dask.bag as db

# Read JSON lines
bag = db.read_text("data/events_*.jsonl").map(json.loads)

# Process in parallel
result = (
    bag
    .filter(lambda x: x["event_type"] == "purchase")
    .map(lambda x: {"user": x["user_id"], "amount": x["amount"]})
    .to_dataframe()
    .compute()
)
```

### Dask Array for NumPy operations

```python
import dask.array as da

# Create a large array
x = da.random.random((10000, 10000), chunks=(1000, 1000))

# Lazy computation
mean = x.mean(axis=0)
result = mean.compute()
```

## Best Practices

- Use `npartitions` equal to 2-4x the number of cores — enough parallelism without overhead
- Partition size should be 50-200MB — too small adds overhead, too large reduces parallelism
- Call `.compute()` only at the end — let Dask optimize the task graph
- Use `.persist()` for DataFrames used multiple times — keeps data in memory
- Read Parquet instead of CSV — Parquet preserves types and is faster to read
- Use `map_partitions` for operations not supported by Dask's API
- Avoid `.set_index()` on large DataFrames — it triggers a full shuffle
- Use Dask Distributed even for local work — better diagnostics and dashboard

## Common Mistakes

- **Calling `.compute()` too early**: materializes intermediate results. Chain operations and compute once at the end.
- **Too many partitions**: 1000 partitions of 1MB each adds huge scheduling overhead. Repartition to 50-200MB chunks.
- **Not using `.persist()` for reused data**: Dask recomputes the task graph every time. Persist to keep in memory.
- **Using CSV instead of Parquet**: CSV requires parsing on every read. Parquet is columnar, typed, and compressed.
- **Not setting `dtype` when reading CSV**: Dask reads a sample to infer types, which may be wrong. Specify dtypes explicitly.

## FAQ

### How is Dask different from pandas?

Dask splits data into partitions and processes them in parallel. pandas loads everything into a single DataFrame. Dask mirrors the pandas API but evaluates lazily — operations build a task graph that's executed on `.compute()`.

### How is Dask different from Spark?

Dask is Python-native and uses pandas DataFrames as partitions. Spark uses its own internal format and converts to/from pandas. Dask is lighter weight and easier to set up, but Spark has better ecosystem support for big data tools.

### How many partitions should I use?

Aim for partitions of 50-200MB each. For a 10GB dataset, use 50-200 partitions. For local execution, use 2-4x the number of CPU cores. Use `ddf.npartitions` to check.

### Can I use Dask on a cluster?

Yes. Use `dask.distributed.Client("scheduler-address:8786")` to connect to a remote Dask cluster. Set up a scheduler with `dask-scheduler` and workers with `dask-worker`.

### Does Dask support all pandas operations?

Most common operations are supported (groupby, merge, join, filter, map_partitions). Some less common methods are not implemented. Check the Dask API docs for the full list of supported methods.
