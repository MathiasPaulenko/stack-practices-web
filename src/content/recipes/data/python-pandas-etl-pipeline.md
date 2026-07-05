---
contentType: recipes
slug: python-pandas-etl-pipeline
title: "Build an ETL Pipeline with pandas and Parquet"
description: "How to build an extract-transform-load pipeline using pandas for data processing and Parquet for columnar storage with type coercion and validation."
metaDescription: "Build an ETL pipeline with pandas and Parquet. Extract from CSV/JSON, transform with type coercion and validation, load to columnar Parquet storage."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - python
  - pandas
  - etl
  - parquet
  - recipe
relatedResources:
  - /recipes/data/python-polars-fast-dataframe
  - /recipes/data/python-data-validation-pandera
  - /recipes/data/sql-cte-recursive-hierarchy
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build an ETL pipeline with pandas and Parquet. Extract from CSV/JSON, transform with type coercion and validation, load to columnar Parquet storage."
  keywords:
    - data
    - python
    - pandas
    - etl
    - parquet
    - recipe
---

## Overview

pandas is the standard tool for tabular data processing in Python. Parquet is a columnar storage format that compresses better than CSV and preserves data types (integers, floats, datetimes, categoricals). Combining them in an ETL pipeline gives you type-safe data processing with compact storage. This recipe covers extracting from multiple sources, transforming with type coercion and validation, and loading to partitioned Parquet files.

## When to Use

- Batch data processing jobs that run on a schedule (hourly, daily)
- Transforming CSV/JSON exports into typed Parquet for downstream analytics
- Data pipelines where intermediate files need type preservation
- Building features for ML models from raw data sources
- Any scenario where you need reproducible, auditable data transformations

## When NOT to Use

- Streaming/real-time pipelines — use Spark Structured Streaming or Flink
- Datasets larger than memory — use Polars, Dask, or PySpark instead
- Simple one-off transformations — a single `pd.read_csv().to_parquet()` is enough
- Production data warehouses — use dbt for SQL-based transformations

## Solution

### Basic ETL pipeline structure

```python
import pandas as pd
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_csv(path: str) -> pd.DataFrame:
    """Extract data from a CSV file."""
    logger.info(f"Extracting from {path}")
    df = pd.read_csv(path)
    logger.info(f"Extracted {len(df)} rows, {len(df.columns)} columns")
    return df


def extract_json(path: str) -> pd.DataFrame:
    """Extract data from a JSON file."""
    logger.info(f"Extracting from {path}")
    df = pd.read_json(path, lines=True)
    logger.info(f"Extracted {len(df)} rows")
    return df


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Apply transformations: type coercion, cleaning, derived columns."""
    logger.info("Starting transformation")

    # Type coercion
    df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").astype("Int64")

    # Drop rows with invalid dates or amounts
    df = df.dropna(subset=["order_date", "amount"])

    # Derive columns
    df["year"] = df["order_date"].dt.year
    df["month"] = df["order_date"].dt.month
    df["revenue"] = df["amount"] * df["quantity"]

    # Normalize text columns
    df["customer_name"] = df["customer_name"].str.strip().str.title()

    # Categorical for low-cardinality columns
    df["status"] = df["status"].astype("category")

    logger.info(f"Transformed to {len(df)} rows")
    return df


def load_parquet(df: pd.DataFrame, path: str, partition_cols: list[str] | None = None) -> None:
    """Load DataFrame to Parquet, optionally partitioned."""
    logger.info(f"Loading to {path}")
    if partition_cols:
        df.to_parquet(path, partition_cols=partition_cols, index=False)
    else:
        df.to_parquet(path, index=False)
    logger.info(f"Loaded {len(df)} rows")


def run_pipeline(source_path: str, destination_path: str) -> None:
    """Run the full ETL pipeline."""
    df = extract_csv(source_path)
    df = transform(df)
    load_parquet(df, destination_path, partition_cols=["year", "month"])


if __name__ == "__main__":
    run_pipeline("data/raw/orders.csv", "data/processed/orders")
```

### Extract from multiple sources and merge

```python
def extract_and_merge(orders_path: str, customers_path: str) -> pd.DataFrame:
    """Extract from multiple sources and merge."""
    orders = pd.read_csv(orders_path)
    customers = pd.read_csv(customers_path)

    # Standardize join keys
    orders["customer_id"] = orders["customer_id"].astype(str).str.strip()
    customers["customer_id"] = customers["customer_id"].astype(str).str.strip()

    merged = orders.merge(customers, on="customer_id", how="left")

    logger.info(f"Merged: {len(orders)} orders + {len(customers)} customers = {len(merged)} rows")
    return merged
```

### Transform with validation

```python
def transform_with_validation(df: pd.DataFrame) -> pd.DataFrame:
    """Transform with data quality checks."""
    # Type coercion
    df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

    # Validation: no negative amounts
    negative_count = (df["amount"] < 0).sum()
    if negative_count > 0:
        logger.warning(f"Found {negative_count} negative amounts, filtering out")
        df = df[df["amount"] >= 0]

    # Validation: no duplicate order IDs
    dup_count = df.duplicated(subset=["order_id"]).sum()
    if dup_count > 0:
        logger.warning(f"Found {dup_count} duplicate order IDs, dropping duplicates")
        df = df.drop_duplicates(subset=["order_id"], keep="last")

    # Validation: required columns present
    required_cols = ["order_id", "customer_id", "order_date", "amount"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Derived columns
    df["year"] = df["order_date"].dt.year
    df["month"] = df["order_date"].dt.month
    df["quarter"] = df["order_date"].dt.quarter

    return df
```

### Partitioned Parquet output

```python
def load_partitioned(df: pd.DataFrame, base_path: str) -> None:
    """Load to partitioned Parquet by year and month."""
    # Ensure partition columns are strings (Parquet requirement)
    df["year"] = df["year"].astype(str)
    df["month"] = df["month"].astype(str).str.zfill(2)

    df.to_parquet(
        base_path,
        partition_cols=["year", "month"],
        index=False,
        engine="pyarrow",
        compression="snappy",
    )
    logger.info(f"Partitioned output at {base_path}/year=*/month=*")


def read_partitioned(base_path: str, year: str, month: str | None = None) -> pd.DataFrame:
    """Read specific partitions."""
    if month:
        path = f"{base_path}/year={year}/month={month}"
    else:
        path = f"{base_path}/year={year}"
    return pd.read_parquet(path)
```

### Incremental load (append to existing Parquet)

```python
def load_incremental(df: pd.DataFrame, path: str) -> None:
    """Append new data to existing Parquet dataset."""
    from pathlib import Path

    if Path(path).exists():
        existing = pd.read_parquet(path)
        combined = pd.concat([existing, df], ignore_index=True)
        combined = combined.drop_duplicates(subset=["order_id"], keep="last")
    else:
        combined = df

    combined.to_parquet(path, index=False)
    logger.info(f"Incremental load: {len(df)} new rows, {len(combined)} total")
```

### Pipeline with error handling and retries

```python
import time

def extract_with_retry(path: str, retries: int = 3, delay: int = 5) -> pd.DataFrame:
    """Extract with retry logic for network sources."""
    for attempt in range(retries):
        try:
            if path.startswith("http"):
                df = pd.read_csv(path)
            else:
                df = pd.read_csv(path)
            return df
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
            raise


def run_pipeline_safe(source: str, destination: str) -> bool:
    """Run pipeline with full error handling."""
    try:
        df = extract_with_retry(source)
        df = transform_with_validation(df)
        load_partitioned(df, destination)
        logger.info("Pipeline completed successfully")
        return True
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        return False
```

### Schema enforcement

```python
EXPECTED_SCHEMA = {
    "order_id": "int64",
    "customer_id": "object",
    "order_date": "datetime64[ns]",
    "amount": "float64",
    "quantity": "Int64",
    "status": "category",
}

def enforce_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Enforce expected schema on DataFrame."""
    for col, dtype in EXPECTED_SCHEMA.items():
        if col not in df.columns:
            raise ValueError(f"Missing column: {col}")
        if df[col].dtype != dtype:
            logger.info(f"Converting {col} from {df[col].dtype} to {dtype}")
            if dtype == "datetime64[ns]":
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif dtype == "category":
                df[col] = df[col].astype("category")
            else:
                df[col] = df[col].astype(dtype)
    return df
```

## Variants

### Using PyArrow directly for large files

```python
import pyarrow.parquet as pq
import pyarrow as pa

def load_with_pyarrow(df: pd.DataFrame, path: str) -> None:
    """Write Parquet using PyArrow for more control."""
    table = pa.Table.from_pandas(df, preserve_index=False)
    pq.write_table(
        table,
        path,
        compression="zstd",
        compression_level=3,
        use_dictionary=True,
        write_statistics=True,
    )
```

### Pipeline with logging to file

```python
import logging.handlers

def setup_logging(log_path: str = "logs/etl.log") -> None:
    """Set up file + console logging."""
    handler = logging.handlers.RotatingFileHandler(
        log_path, maxBytes=10_000_000, backupCount=5
    )
    handler.setFormatter(logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    ))
    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler, logging.StreamHandler()],
    )
```

### Pipeline orchestration with config

```python
import yaml

def load_config(config_path: str) -> dict:
    with open(config_path) as f:
        return yaml.safe_load(f)

def run_pipeline_from_config(config_path: str) -> None:
    config = load_config(config_path)

    df = pd.read_csv(config["source"])
    for transform_config in config.get("transforms", []):
        if transform_config["type"] == "rename":
            df = df.rename(columns=transform_config["mapping"])
        elif transform_config["type"] == "filter":
            df = df.query(transform_config["condition"])
        elif transform_config["type"] == "cast":
            df[transform_config["column"]] = df[transform_config["column"]].astype(
                transform_config["dtype"]
            )

    df.to_parquet(
        config["destination"],
        partition_cols=config.get("partition_cols"),
        index=False,
    )
```

## Best Practices

- Use `errors="coerce"` in `pd.to_numeric` and `pd.to_datetime` — converts invalid values to `NaN` instead of raising
- Partition by date columns (year, month) — enables efficient reads of specific time ranges
- Use `snappy` compression for speed, `zstd` for better compression ratio
- Log row counts at each stage — makes debugging pipeline issues easier
- Validate data before writing — catch issues early, don't propagate bad data
- Use `Int64` (nullable integer) instead of `int64` when data may have missing values
- Write statistics in Parquet — enables predicate pushdown for faster queries

## Common Mistakes

- **Not handling missing values**: `pd.to_numeric` without `errors="coerce"` raises on invalid data. Use `errors="coerce"` and handle `NaN` downstream.
- **Using CSV as intermediate format**: CSV loses type information. Use Parquet for intermediate storage.
- **Not partitioning large datasets**: a single 10GB Parquet file is slow to read. Partition by date.
- **Ignoring dtypes after reading**: `pd.read_csv` infers types, which may be wrong. Explicitly cast columns after reading.
- **Not deduplicating on incremental loads**: appending without deduplication creates duplicate rows. Use `drop_duplicates`.

## FAQ

### Why use Parquet instead of CSV?

Parquet preserves data types (integers stay integers, dates stay dates), compresses 3-10x better than CSV, and supports columnar reads (only read the columns you need). CSV requires re-parsing types on every read.

### How do I handle datasets larger than memory?

Use `chunksize` parameter in `pd.read_csv` to process in batches, or switch to Polars/Dask which handle out-of-core computation natively.

### What compression should I use?

`snappy` for fast read/write (good for intermediate files). `zstd` for best compression ratio (good for archival). `gzip` for compatibility but slower than both.

### How do I read specific partitions?

```python
df = pd.read_parquet("data/orders/year=2025/month=01")
```

Parquet partitioning creates directory structures that pandas can read directly.

### Should I use pandas or Polars for ETL?

Use pandas for datasets under 1GB and when you need ecosystem compatibility. Use Polars for larger datasets or when speed is critical — it's 5-30x faster for most operations.
