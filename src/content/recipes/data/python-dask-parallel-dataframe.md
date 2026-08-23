---
contentType: recipes
slug: python-dask-parallel-dataframe
title: "Parallel DataFrame Operations with Dask"
description: "Scale pandas workflows with Dask. Process out-of-core DataFrames using lazy evaluation, partitions, and the distributed scheduler on datasets from 1 GB to 1 TB."
metaDescription: "Scale pandas workflows with Dask. Process out-of-core DataFrames using lazy evaluation, partitions, and the distributed scheduler on datasets from 1 GB to 1 TB."
difficulty: advanced
topics:
  - data
tags:
  - python
  - dask
  - dataframe
  - pandas
  - parallel
  - big-data
relatedResources:
  - /recipes/python-polars-fast-dataframe
  - /recipes/python-pandas-etl-pipeline
  - /recipes/python-spark-groupby-aggregation
  - /recipes/python-data-validation-pandera
  - /recipes/python-airflow-dag-scheduling
  - /recipes/python-excel-read-write
lastUpdated: "2026-08-23"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Scale pandas workflows with Dask. Process out-of-core DataFrames using lazy evaluation, partitions, and the distributed scheduler on datasets from 1 GB to 1 TB."
  keywords:
    - python
    - dask
    - dataframe
    - pandas
    - parallel
    - big-data
    - out-of-core
---

## Overview

Dask builds on pandas and NumPy to work on datasets larger than memory. It slices a DataFrame into chunks,
called partitions, and each partition is just a normal pandas DataFrame. Dask builds a task graph of
operations and runs them lazily, parallelizing across cores with the local scheduler or
across machines with the distributed scheduler. Because the API mirrors pandas, most existing code works
with only small changes.

## When to Use

Dask shines when datasets range from a few gigabytes to roughly a terabyte, too big for memory but still
manageable on disk. If you already have pandas code that needs to scale, Dask's familiar API saves you from
a major rewrite. It's also handy when you want parallelism without the overhead of a Spark
cluster, or when your ETL pipelines move Parquet, CSV, or HDF5 files around. Finally, choose Dask when your
parallel logic is more than simple group-by and join.

## When to Avoid

Skip Dask when datasets are under 1 GB. pandas is usually faster because it avoids Dask's task graph
overhead. Also avoid it if you need the full pandas ecosystem, because Dask doesn't implement every pandas
method. If you're processing live streams, Flink or Structured Streaming fits better. And if
[Polars](/recipes/python-polars-fast-dataframe/) is sufficient, go with it — it's often quicker and lighter
for most DataFrame work.

## Solution

### Basic Dask DataFrame

```python
import dask.dataframe as dd

# Read CSV lazily — does not load until compute()
ddf = dd.read_csv("data/orders_*.csv")

# Read Parquet
ddf = dd.read_parquet("data/orders/")

# From a pandas DataFrame
import pandas as pd
pdf = pd.read_csv("data.csv")
ddf = dd.from_pandas(pdf, npartitions=4)

# Inspect partitions
print(ddf.npartitions)  # number of partitions
print(ddf.divisions)    # partition boundaries, known if sorted
```

### Lazy Operations

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

# Execute the graph and get a pandas DataFrame
df = result.compute()
print(df.head(10))
```

### Reading and Writing

```python
# Read multiple CSV files
ddf = dd.read_csv("data/2025-*.csv", parse_dates=["order_date"])

# Read with explicit dtypes
ddf = dd.read_csv(
    "data/orders.csv",
    dtype={
        "order_id": "int64",
        "amount": "float64",
        "customer_id": "object",
    },
)

# Write to Parquet (one file per partition by default)
ddf.to_parquet("data/output/", write_index=False)

# Write to one file per partition as CSV
ddf.to_csv("data/output_*.csv", index=False)
```

### Group-by and Aggregation

```python
# Parallel group-by aggregation
result = (
    ddf
    .groupby("customer_id")
    .agg({
        "amount": ["sum", "mean", "count"],
        "order_id": "nunique",
    })
    .compute()
)

# Custom named aggregations
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

# Standard merge; may require a shuffle if not sorted by the join key
joined = orders.merge(customers, on="customer_id", how="left")

# Broadcast join when the right side is small
small_customers = customers.head(1000)  # pandas DataFrame
joined = orders.merge(
    dd.from_pandas(small_customers, npartitions=1),
    on="customer_id",
    how="left",
    broadcast=True,
)

result = joined.compute()
```

### Custom Computation with `map_partitions`

```python
def process_partition(pdf: pd.DataFrame) -> pd.DataFrame:
    pdf["amount_with_tax"] = pdf["amount"] * 1.1
    pdf["order_date"] = pd.to_datetime(pdf["order_date"])
    pdf["month"] = pdf["order_date"].dt.month
    return pdf

ddf_processed = ddf.map_partitions(process_partition)
result = ddf_processed.compute()
```

### Custom Task Graphs with `delayed`

```python
import dask

@dask.delayed
def load_file(path):
    return pd.read_csv(path)

@dask.delayed
def clean(df):
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    return df.dropna(subset=["amount"])

@dask.delayed
def combine(dfs):
    return pd.concat(dfs).groupby("customer_id")["amount"].sum()

files = ["data/jan.csv", "data/feb.csv", "data/mar.csv"]
processed = [clean(load_file(f)) for f in files]
result = combine(processed)

df = result.compute()
```

### Repartitioning

```python
# Set a target number of partitions
ddf = ddf.repartition(npartitions=10)

# Or target a partition size
ddf = ddf.repartition(partition_size="100MB")

# Set a sorted index so divisions are known
ddf = ddf.reset_index(drop=True)
ddf = ddf.set_index("customer_id")  # triggers a shuffle
```

### Using Dask Distributed

```python
from dask.distributed import Client

# Local cluster using all cores
client = Client(n_workers=4, threads_per_worker=2, memory_limit="4GB")

# All .compute() calls now use the distributed scheduler
ddf = dd.read_parquet("data/orders/")
result = ddf.groupby("customer_id")["amount"].sum().compute()

# Close the client when done
client.close()
```

### Persisting Data in Memory

```python
# Load into distributed memory across workers
ddf_persisted = ddf.persist()

# Reuse the persisted object for faster repeated operations
result = ddf_persisted.groupby("customer_id")["amount"].sum().compute()
```

### Progress Monitoring

```python
from dask.distributed import progress

result = ddf.groupby("customer_id")["amount"].sum()
future = client.compute(result)
progress(future)
df = future.result()
```

## Variants

### Dask with S3

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

### Dask Bag for Unstructured Data

```python
import dask.bag as db

bag = db.read_text("data/events_*.jsonl").map(json.loads)

result = (
    bag
    .filter(lambda x: x["event_type"] == "purchase")
    .map(lambda x: {"user": x["user_id"], "amount": x["amount"]})
    .to_dataframe()
    .compute()
)
```

### Dask Array for NumPy Workloads

```python
import dask.array as da

x = da.random.random((10000, 10000), chunks=(1000, 1000))
mean = x.mean(axis=0)
result = mean.compute()
```

## Best Practices

For local work, I start with `npartitions` around two to four times the number of cores. That balance gives
you parallelism without drowning the scheduler in tiny tasks. Shoot for 50–200 MB chunks. Tiny partitions
waste time on scheduling; huge ones leave cores idle.

Only call `.compute()` at the end of a chain so Dask can optimize the full task graph. Use `.persist()` when
you'll touch a DataFrame more than once; that keeps it in worker memory.

I reach for Parquet instead of CSV because it keeps types, supports column pruning, and reads faster. For
operations that Dask's API doesn't expose directly, drop down to `map_partitions` and write normal pandas
code on each chunk. Avoid `.set_index()` on large DataFrames because it triggers a full shuffle. For local
development, use the Dask Distributed scheduler; it adds a dashboard and better diagnostics than the default
synchronous scheduler.

## Common Mistakes

Calling `.compute()` too early materializes intermediate results and breaks graph optimization. Chain
operations and call `.compute()` once at the end. Too many partitions, such as 1,000 tiny 1 MB chunks,
create huge scheduling overhead. Call `.repartition()` to land in the 50–200 MB range.

Not using `.persist()` for reused data means Dask recomputes the task graph every time. Keep reused objects
in memory with `.persist()`. CSV is slower because it re-parses types on every read and skips column
pruning. Dask also reads a sample to infer CSV `dtype`, which can be wrong. Spell out the dtypes to avoid
nasty type errors.

## FAQ

### How is Dask different from pandas?

Dask breaks data into partitions and processes them in parallel. pandas puts the whole dataset into one
in-memory DataFrame. Dask mirrors the pandas API but evaluates lazily, so operations build a task graph that runs on
`.compute()`.

### How is Dask different from Spark?

Dask is Python-native and uses pandas DataFrames as partitions. Spark uses its own internal format and
converts to and from pandas. Dask is lighter and easier to set up; Spark has a broader big-data ecosystem.

### How many partitions should I use?

A good target is 50–200 MB per partition. A 10 GB file breaks into 50–200 chunks at that size. For local runs, I
usually start with two to four times my CPU core count, then I check `ddf.npartitions` after repartitioning.

### Can I use Dask on a cluster?

Yes. Point a `dask.distributed.Client` to `scheduler-address:8786` to connect to a remote scheduler. Start
the scheduler with `dask-scheduler` and workers with `dask-worker`.

### Does Dask support all pandas operations?

Most common operations are supported, including groupby, merge, join, filter, `map_partitions`, and many
window operations. Some less common ones aren't implemented. Check the Dask API docs for the latest list.
