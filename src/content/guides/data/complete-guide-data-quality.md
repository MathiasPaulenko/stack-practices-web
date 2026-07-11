---
contentType: guides
slug: complete-guide-data-quality
title: "Data Quality Guide: Validation, Profiling, Great"
description: "Master data quality: validation frameworks, profiling, schema enforcement, anomaly detection, and monitoring with Great Expectations, Pandera, and Soda for reliable pipelines."
metaDescription: "Master data quality: validation, profiling, anomaly detection, and monitoring with Great Expectations, Pandera, and Soda for reliable data pipelines."
difficulty: advanced
topics:
  - data
tags:
  - guide
  - data-quality
  - validation
  - great-expectations
  - pandera
  - profiling
  - data-engineering
relatedResources:
  - /guides/data/complete-guide-data-pipeline-architecture
  - /guides/data/complete-guide-dbt-data-transformations
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master data quality: validation, profiling, anomaly detection, and monitoring with Great Expectations, Pandera, and Soda for reliable data pipelines."
  keywords:
    - data quality
    - data validation
    - great expectations
    - pandera
    - data profiling
    - anomaly detection
    - soda
---

## Introduction

Data quality issues silently corrupt analytics, ML models, and business decisions. Bad data costs organizations through incorrect reports, broken pipelines, and eroded trust. Data quality frameworks validate schemas, check statistical properties, detect anomalies, and monitor drift. This guide walks through data quality dimensions, profiling, validation with Great Expectations and Pandera, anomaly detection, and integrating quality checks into pipelines.

## Data Quality Dimensions

```
ACCURACY: Does the data match reality?
  - Order total matches payment processor record
  - Customer address exists in postal database

COMPLETENESS: Are required fields populated?
  - No null values in primary keys
  - All expected rows present (row count within range)

CONSISTENCY: Is data consistent across systems?
  - Order count in warehouse matches source DB
  - Customer ID exists in both orders and customers tables

VALIDITY: Does data conform to expected format?
  - Email matches regex pattern
  - Date is in valid range (not in the future)
  - Country code is in ISO 3166 list

UNIQUENESS: Are there duplicates?
  - Primary keys are unique
  - No duplicate orders in the same batch

TIMELINESS: Is data fresh?
  - Pipeline completed within SLA
  - Data is no older than 24 hours
```

## Data Profiling

```python
# profiling/profile_dataset.py — Understand your data before validating
import pandas as pd
import ydata_profiling  # formerly pandas-profiling

df = pd.read_csv("data/orders.csv")

# Generate a full profile report
profile = df.profile_report(
    title="Orders Dataset Profile",
    config={
        "vars": {
            "num": {"low_categorical_threshold": 10},
            "cat": {"length": True, "unicode": True},
        },
        "correlations": {"pearson": {"calculate": True}},
    }
)
profile.to_file("reports/orders_profile.html")

# Manual profiling with pandas
def profile_dataframe(df: pd.DataFrame) -> dict:
    profile = {
        "row_count": len(df),
        "column_count": len(df.columns),
        "null_counts": df.isnull().sum().to_dict(),
        "null_percentages": (df.isnull().sum() / len(df) * 100).round(2).to_dict(),
        "duplicate_rows": df.duplicated().sum(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "unique_counts": {col: df[col].nunique() for col in df.columns},
    }

    for col in df.select_dtypes(include="number").columns:
        profile[col] = {
            "min": float(df[col].min()),
            "max": float(df[col].max()),
            "mean": float(df[col].mean()),
            "median": float(df[col].median()),
            "std": float(df[col].std()),
            "quartiles": df[col].quantile([0.25, 0.5, 0.75]).to_dict(),
        }

    return profile

profile = profile_dataframe(df)
print(f"Rows: {profile['row_count']}, Columns: {profile['column_count']}")
print(f"Nulls: {profile['null_counts']}")
print(f"Duplicates: {profile['duplicate_rows']}")
```

## Great Expectations

### Setup and suite creation

```python
# gx/data_context.py — Great Expectations setup
import great_expectations as gx

context = gx.get_context()

# Create a datasource connection
datasource = context.sources.add_pandas("orders_source")
asset = datasource.add_dataframe_asset(name="orders_df")

# Create expectation suite
suite = context.add_expectation_suite("orders_suite")

# Add expectations
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToNotBeNull(column="order_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeUnique(column="order_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeBetween(
        column="total_amount", min_value=0, max_value=100000
    )
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeInSet(
        column="status",
        value_set=["pending", "processing", "shipped", "completed", "cancelled"],
    )
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToMatchRegex(
        column="email", regex=r"^[^@]+@[^@]+\.[^@]+$"
    )
)
suite.add_expectation(
    gx.expectations.ExpectTableRowCountToBeBetween(
        min_value=100, max_value=1000000
    )
)

context.save_expectation_suite(suite)
```

### Validation checkpoint

```python
# gx/validate.py — Run validation as part of pipeline
import great_expectations as gx
import pandas as pd

context = gx.get_context()

# Create checkpoint
checkpoint = context.add_or_update_checkpoint(
    name="orders_checkpoint",
    validations=[
        {
            "batch_request": {
                "datasource_name": "orders_source",
                "data_asset_name": "orders_df",
            },
            "expectation_suite_name": "orders_suite",
        }
    ],
)

# Load data and validate
df = pd.read_csv("data/orders.csv")
results = checkpoint.run(batch_request={"runtime_parameters": {"batch_data": df}})

# Check results
if results["success"]:
    print("All expectations passed!")
else:
    failed = [
        r for r in results["results"] if not r["success"]
    ]
    for f in failed:
        print(f"FAILED: {f['expectation_config']['expectation_type']} "
              f"on column {f['expectation_config']['kwargs'].get('column', 'N/A')}")
    raise ValueError(f"{len(failed)} data quality checks failed")
```

### Profiling to auto-generate expectations

```python
# gx/auto_profile.py — Auto-generate expectations from data
from great_expectations.profiling import UserEditableProfiler

profiler = UserEditableProfiler(
    profile_dataset="orders_df",
    profiler_config={
        "num_sample_rows": 1000,
        "ignored_columns": ["notes", "metadata"],
        "included_expectations": [
            "expect_column_values_to_not_be_null",
            "expect_column_values_to_be_unique",
            "expect_column_values_to_be_in_set",
            "expect_column_values_to_be_between",
            "expect_column_values_to_match_regex",
        ],
    },
)

suite = profiler.profile(context, "orders_auto_suite")
print(f"Generated {len(suite.expectations)} expectations")
```

## Pandera

### DataFrame schema validation

```python
# validation/pandera_schemas.py — Schema enforcement for pandas DataFrames
import pandera as pa
import pandas as pd

orders_schema = pa.DataFrameSchema({
    "order_id": pa.Column(int, checks=pa.Check.unique(), nullable=False),
    "customer_id": pa.Column(int, nullable=False),
    "created_at": pa.Column(pa.DateTime, nullable=False),
    "status": pa.Column(
        str,
        checks=pa.Check.isin(["pending", "processing", "shipped", "completed", "cancelled"]),
        nullable=False,
    ),
    "subtotal": pa.Column(float, checks=pa.Check.ge(0), nullable=False),
    "tax": pa.Column(float, checks=pa.Check.ge(0), nullable=True),
    "shipping": pa.Column(float, checks=pa.Check.ge(0), nullable=True),
    "email": pa.Column(
        str,
        checks=pa.Check.str_matches(r"^[^@]+@[^@]+\.[^@]+$"),
        nullable=True,
    ),
}, strict=True, coerce=True)  # strict: no extra columns, coerce: cast types

# Validate a DataFrame
df = pd.read_csv("data/orders.csv")
try:
    validated = orders_schema.validate(df)
    print(f"Validation passed: {len(validated)} rows")
except pa.errors.SchemaError as e:
    print(f"Validation failed: {e}")
    # e.failure_cases contains the failing rows and columns

# Custom checks
orders_schema_with_custom = pa.DataFrameSchema({
    "order_id": pa.Column(int, checks=pa.Check.unique()),
    "subtotal": pa.Column(float, checks=[
        pa.Check.ge(0),
        pa.Check.le(100000, error="subtotal exceeds maximum"),
    ]),
    "created_at": pa.Column(
        pa.DateTime,
        checks=pa.Check(
            lambda s: s <= pd.Timestamp.now(),
            error="created_at cannot be in the future",
        ),
    ),
})

# Column-level custom check
def no_weekend_orders(series: pd.Series) -> pd.Series:
    return series.dt.dayofweek < 5  # Monday=0, Sunday=6

orders_schema = pa.DataFrameSchema({
    "created_at": pa.Column(
        pa.DateTime,
        checks=pa.Check(no_weekend_orders, element_wise=False, error="No weekend orders allowed"),
    ),
})
```

### Schema inheritance and composition

```python
# Base schema for common fields
base_schema = pa.DataFrameSchema({
    "id": pa.Column(int, checks=pa.Check.unique(), nullable=False),
    "created_at": pa.Column(pa.DateTime, nullable=False),
    "updated_at": pa.Column(pa.DateTime, nullable=True),
}, strict=False)

# Extend for specific tables
customers_schema = base_schema.add_columns({
    "email": pa.Column(str, checks=pa.Check.str_matches(r"^[^@]+@[^@]+$")),
    "country": pa.Column(str, checks=pa.Check.isin(["US", "CA", "UK", "DE", "FR", "JP"])),
})

products_schema = base_schema.add_columns({
    "name": pa.Column(str, nullable=False),
    "price": pa.Column(float, checks=pa.Check.ge(0)),
    "sku": pa.Column(str, checks=pa.Check.str_length(min_value=8, max_value=20)),
})
```

## Soda

### Soda checks YAML

```yaml
# checks/orders_checks.yml — Soda Core checks
checks for orders:
  - row_count > 0
  - row_count < 1000000
  - missing_count(order_id) = 0
  - duplicate_count(order_id) = 0
  - missing_count(customer_id) = 0
  - invalid_count(email) = 0:
      valid regex: ^[^@]+@[^@]+\.[^@]+$
  - invalid_count(status) = 0:
      valid values: [pending, processing, shipped, completed, cancelled]
  - min(total_amount) >= 0
  - max(total_amount) <= 100000
  - schema:
      warn: when forbidden column present [ssn, credit_card_number]
      fail: when required column missing [order_id, customer_id, status]
  - freshness(created_at) < 1d

# Anomaly detection
  - anomaly_score for row_count:
      default threshold: 3
      # Detects if row count deviates more than 3 standard deviations from historical mean
```

### Running Soda checks

```bash
# Run checks against a data source
soda scan -d warehouse -c soda_config.yml checks/orders_checks.yml

# In a pipeline (Airflow)
soda scan -d warehouse -c soda_config.yml checks/orders_checks.yml --variable start_date={{ ds }}
```

## Integrating Quality Checks into Pipelines

### Airflow integration

```python
# dags/pipeline_with_quality.py — Data quality in Airflow
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

dag = DAG(
    "pipeline_with_quality_checks",
    schedule="0 2 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
)

def extract(**context):
    import pandas as pd
    df = pd.read_sql(f"SELECT * FROM source WHERE date = '{context['ds']}'", conn)
    df.to_csv(f"/data/raw/{context['ds']}/orders.csv", index=False)
    return len(df)

def validate_raw(**context):
    import pandera as pa
    import pandas as pd

    df = pd.read_csv(f"/data/raw/{context['ds']}/orders.csv")
    schema = pa.DataFrameSchema({
        "order_id": pa.Column(int, checks=pa.Check.unique(), nullable=False),
        "status": pa.Column(str, checks=pa.Check.isin(
            ["pending", "processing", "shipped", "completed", "cancelled"]
        )),
    })
    try:
        schema.validate(df, lazy=True)  # lazy: collect all errors, not just first
    except pa.errors.SchemaErrors as e:
        failure_count = len(e.failure_cases)
        raise ValueError(f"Raw data validation failed: {failure_count} issues found")

def transform(**context):
    import pandas as pd
    df = pd.read_csv(f"/data/raw/{context['ds']}/orders.csv")
    df["total"] = df["subtotal"] + df["tax"] + df["shipping"]
    df.to_csv(f"/data/processed/{context['ds']}/orders.csv", index=False)

def validate_processed(**context):
    import pandera as pa
    import pandas as pd

    df = pd.read_csv(f"/data/processed/{context['ds']}/orders.csv")
    schema = pa.DataFrameSchema({
        "order_id": pa.Column(int, checks=pa.Check.unique()),
        "total": pa.Column(float, checks=pa.Check.ge(0)),
    })
    schema.validate(df, lazy=True)

def load(**context):
    # Load to warehouse
    pass

extract_task = PythonOperator(task_id="extract", python_callable=extract, dag=dag)
validate_raw_task = PythonOperator(task_id="validate_raw", python_callable=validate_raw, dag=dag)
transform_task = PythonOperator(task_id="transform", python_callable=transform, dag=dag)
validate_processed_task = PythonOperator(task_id="validate_processed", python_callable=validate_processed, dag=dag)
load_task = PythonOperator(task_id="load", python_callable=load, dag=dag)

extract_task >> validate_raw_task >> transform_task >> validate_processed_task >> load_task
```

### dbt tests as quality checks

```sql
-- tests/assert_order_count_within_range.sql
SELECT 1
WHERE (
    SELECT COUNT(*) FROM {{ ref('stg_orders') }}
    WHERE created_at = CURRENT_DATE()
) < 10 OR (
    SELECT COUNT(*) FROM {{ ref('stg_orders') }}
    WHERE created_at = CURRENT_DATE()
) > 100000

-- tests/assert_no_negative_totals.sql
SELECT order_id, total_amount
FROM {{ ref('fct_orders') }}
WHERE total_amount < 0

-- tests/assert_revenue_matches_source.sql
SELECT
    warehouse.revenue AS warehouse_revenue,
    source.revenue AS source_revenue,
    ABS(warehouse.revenue - source.revenue) AS discrepancy
FROM (
    SELECT SUM(total_amount) AS revenue FROM {{ ref('fct_orders') }}
    WHERE created_at >= CURRENT_DATE() - INTERVAL '7 days'
) warehouse
CROSS JOIN (
    SELECT SUM(total_amount) AS revenue FROM {{ source('raw', 'orders') }}
    WHERE created_at >= CURRENT_DATE() - INTERVAL '7 days'
) source
WHERE ABS(warehouse.revenue - source.revenue) > 0.01
```

## Anomaly Detection

```python
# monitoring/anomaly_detection.py — Statistical anomaly detection
import pandas as pd
import numpy as np

def detect_row_count_anomalies(
    current_count: int,
    historical_counts: list[int],
    threshold: float = 3.0,
) -> dict:
    mean = np.mean(historical_counts)
    std = np.std(historical_counts)
    z_score = (current_count - mean) / std if std > 0 else 0
    is_anomaly = abs(z_score) > threshold
    return {
        "current": current_count,
        "mean": round(mean, 2),
        "std": round(std, 2),
        "z_score": round(z_score, 2),
        "is_anomaly": is_anomaly,
        "direction": "high" if z_score > 0 else "low",
    }

# Usage: compare today's row count against last 30 days
historical = [1200, 1150, 1300, 1250, 1180, 1220, 1190, 1210, 1240, 1170,
              1230, 1260, 1200, 1180, 1220, 1190, 1210, 1240, 1170, 1230,
              1260, 1200, 1180, 1220, 1190, 1210, 1240, 1170, 1230, 1260]
current = 500  # Suspiciously low

result = detect_row_count_anomalies(current, historical)
print(result)
# {'current': 500, 'mean': 1213.33, 'std': 34.99, 'z_score': -20.38, 'is_anomaly': True, 'direction': 'low'}

# Column-level anomaly: null rate spike
def detect_null_rate_anomaly(
    current_null_rate: float,
    historical_rates: list[float],
    threshold: float = 3.0,
) -> dict:
    mean = np.mean(historical_rates)
    std = np.std(historical_rates)
    z_score = (current_null_rate - mean) / std if std > 0 else 0
    return {
        "current_rate": current_null_rate,
        "mean_rate": round(mean, 4),
        "z_score": round(z_score, 2),
        "is_anomaly": z_score > threshold,  # Only flag increases
    }
```

## Best Practices

- Profile data before writing validation rules — you can't validate what you don't understand
- Validate at every pipeline stage — raw, staging, and marts each have different quality concerns
- Fail fast on critical checks — stop the pipeline before bad data reaches the warehouse
- Use warnings for non-critical checks — log anomalies without blocking the pipeline
- Track quality metrics over time — null rates, row counts, and distributions drift
- Set up anomaly detection on key metrics — z-score based alerts for sudden changes
- Use `lazy=True` in Pandera — collect all errors at once instead of stopping at the first
- Store validation results — Great Expectations Data Docs provide historical quality reports
- Version your schemas — track changes to validation rules alongside data model changes
- Involve domain experts — business rules (valid status values, price ranges) require domain knowledge

## Common Mistakes

- **Validating only the final output**: errors introduced in extraction propagate through transformations. Validate at every stage.
- **No historical baseline for anomaly detection**: without historical data, you can't detect anomalies. Collect metrics for at least 30 days before enabling alerts.
- **Overly strict validation**: rejecting rows with minor issues (missing optional field) blocks the entire pipeline. Use warnings for non-critical issues.
- **No monitoring after deployment**: data quality degrades over time as sources change. Set up ongoing monitoring, not just one-time validation.
- **Hardcoding thresholds**: thresholds that work today may not work next year. Use statistical thresholds (z-scores) or configurable parameters.

## FAQ

### What is data profiling?

Analyzing a dataset to understand its structure, content, and quality characteristics. This includes row counts, null rates, value distributions, min/max ranges, unique counts, and data types. Profiling is the first step before writing validation rules.

### Great Expectations vs. Pandera vs. Soda — which should I use?

Great Expectations is best for warehouse-scale validation with HTML reports and historical tracking. Pandera is best for pandas/Python-native validation in notebooks and scripts. Soda is best for SQL-first validation integrated with data warehouses and orchestrators.

### What is anomaly detection in data quality?

Statistical methods that detect unexpected changes in data metrics. Common approaches include z-score (deviation from historical mean), IQR (interquartile range), and time series decomposition. Anomalies trigger alerts for investigation.

### When should a data quality check fail the pipeline vs. warn?

Fail the pipeline when: primary keys are null or duplicate, required columns are missing, referential integrity is broken, or row count is zero. Warn when: null rates are above historical baseline, distributions shift slightly, or optional fields are missing.

### How do I test data quality in CI/CD?

Use dbt tests in CI with `--select state:modified+` to test only changed models. For Python pipelines, run Pandera schema validation as a test step. Use Soda scans in Airflow as a post-load validation task.
