---



contentType: guides
slug: complete-guide-data-quality
title: "Guía de Data Quality"
description: "Dominá data quality: frameworks de validación, profiling, schema enforcement, anomaly detection y monitoreo con Great Expectations, Pandera y Soda para pipelines confiables."
metaDescription: "Dominá data quality: validación, profiling, anomaly detection y monitoreo con Great Expectations, Pandera y Soda para pipelines confiables."
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
  - /guides/complete-guide-data-pipeline-architecture
  - /guides/complete-guide-dbt-data-transformations
  - /guides/complete-guide-apache-airflow
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Dominá data quality: validación, profiling, anomaly detection y monitoreo con Great Expectations, Pandera y Soda para pipelines confiables."
  keywords:
    - data quality
    - data validation
    - great expectations
    - pandera
    - data profiling
    - anomaly detection
    - soda



---

## Introducción

Data quality issues silently corrompen analytics, ML models y business decisions. Bad data le cuesta a organizations a través de incorrect reports, broken pipelines y eroded trust. Data quality frameworks validan schemas, checkean statistical properties, detectan anomalies y monitorean drift. A continuación: data quality dimensions, profiling, validación con Great Expectations y Pandera, anomaly detection e integrando quality checks en pipelines.

## Data Quality Dimensions

```
ACCURACY: ¿La data matchea reality?
  - Order total matchea payment processor record
  - Customer address existe en postal database

COMPLETENESS: ¿Los required fields están populated?
  - No null values en primary keys
  - All expected rows present (row count dentro de range)

CONSISTENCY: ¿La data es consistent across systems?
  - Order count en warehouse matchea source DB
  - Customer ID existe en both orders y customers tables

VALIDITY: ¿La data conforma al expected format?
  - Email matchea regex pattern
  - Date está en valid range (no en el future)
  - Country code está en ISO 3166 list

UNIQUENESS: ¿Hay duplicates?
  - Primary keys son unique
  - No duplicate orders en el mismo batch

TIMELINESS: ¿La data es fresh?
  - Pipeline completó dentro de SLA
  - Data no es older than 24 hours
```

## Data Profiling

```python
# profiling/profile_dataset.py — Entendé tu data antes de validar
import pandas as pd
import ydata_profiling  # formerly pandas-profiling

df = pd.read_csv("data/orders.csv")

# Generá un full profile report
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

# Manual profiling con pandas
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

### Setup y suite creation

```python
# gx/data_context.py — Great Expectations setup
import great_expectations as gx

context = gx.get_context()

# Creá un datasource connection
datasource = context.sources.add_pandas("orders_source")
asset = datasource.add_dataframe_asset(name="orders_df")

# Creá expectation suite
suite = context.add_expectation_suite("orders_suite")

# Agregá expectations
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
# gx/validate.py — Runéa validation como part del pipeline
import great_expectations as gx
import pandas as pd

context = gx.get_context()

# Creá checkpoint
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

# Loadéa data y validá
df = pd.read_csv("data/orders.csv")
results = checkpoint.run(batch_request={"runtime_parameters": {"batch_data": df}})

# Checkeá results
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

### Profiling para auto-generate expectations

```python
# gx/auto_profile.py — Auto-generateá expectations desde data
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
# validation/pandera_schemas.py — Schema enforcement para pandas DataFrames
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

# Validá un DataFrame
df = pd.read_csv("data/orders.csv")
try:
    validated = orders_schema.validate(df)
    print(f"Validation passed: {len(validated)} rows")
except pa.errors.SchemaError as e:
    print(f"Validation failed: {e}")
    # e.failure_cases contiene los failing rows y columns

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

### Schema inheritance y composition

```python
# Base schema para common fields
base_schema = pa.DataFrameSchema({
    "id": pa.Column(int, checks=pa.Check.unique(), nullable=False),
    "created_at": pa.Column(pa.DateTime, nullable=False),
    "updated_at": pa.Column(pa.DateTime, nullable=True),
}, strict=False)

# Extendé para specific tables
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
      # Detecta si row count deviates more than 3 standard deviations del historical mean
```

### Running Soda checks

```bash
# Runéa checks contra un data source
soda scan -d warehouse -c soda_config.yml checks/orders_checks.yml

# En un pipeline (Airflow)
soda scan -d warehouse -c soda_config.yml checks/orders_checks.yml --variable start_date={{ ds }}
```

## Integrando Quality Checks en Pipelines

### Airflow integration

```python
# dags/pipeline_with_quality.py — Data quality en Airflow
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
        schema.validate(df, lazy=True)  # lazy: collecteá all errors, no solo first
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
    # Loadéa al warehouse
    pass

extract_task = PythonOperator(task_id="extract", python_callable=extract, dag=dag)
validate_raw_task = PythonOperator(task_id="validate_raw", python_callable=validate_raw, dag=dag)
transform_task = PythonOperator(task_id="transform", python_callable=transform, dag=dag)
validate_processed_task = PythonOperator(task_id="validate_processed", python_callable=validate_processed, dag=dag)
load_task = PythonOperator(task_id="load", python_callable=load, dag=dag)

extract_task >> validate_raw_task >> transform_task >> validate_processed_task >> load_task
```

### dbt tests como quality checks

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

# Usage: compará today's row count contra last 30 days
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
        "is_anomaly": z_score > threshold,  # Solo flag increases
    }
```

## Best Practices


- For a deeper guide, see [Apache Airflow: DAGs, Operators, Scheduling](/es/guides/complete-guide-apache-airflow/).

- Profileá data antes de escribir validation rules — no podés validar lo que no entendés
- Validá en every pipeline stage — raw, staging y marts tienen different quality concerns
- Failéa fast en critical checks — stopéa el pipeline antes de que bad data llegue al warehouse
- Usá warnings para non-critical checks — loggeá anomalies sin blocking el pipeline
- Trackeá quality metrics over time — null rates, row counts y distributions drift
- Seteá anomaly detection en key metrics — z-score based alerts para sudden changes
- Usá `lazy=True` en Pandera — collecteá all errors at once en vez de stopping en el first
- Storeá validation results — Great Expectations Data Docs provee historical quality reports
- Versioná tus schemas — trackeá changes a validation rules alongside data model changes
- Involucrá domain experts — business rules (valid status values, price ranges) requieren domain knowledge

## Common Mistakes

- **Validar solo el final output**: errors introduced en extraction propagate through transformations. Validá en every stage.
- **No historical baseline para anomaly detection**: sin historical data, no podés detectar anomalies. Collecteá metrics por at least 30 days antes de enabling alerts.
- **Overly strict validation**: rejectear rows con minor issues (missing optional field) blockea el entire pipeline. Usá warnings para non-critical issues.
- **No monitoring después de deployment**: data quality degrades over time as sources change. Seteá ongoing monitoring, no solo one-time validation.
- **Hardcoding thresholds**: thresholds que funcionan today pueden no funcionar next year. Usá statistical thresholds (z-scores) o configurable parameters.

## FAQ

### ¿Qué es data profiling?

Analizar un dataset para entender su structure, content y quality characteristics. Esto incluye row counts, null rates, value distributions, min/max ranges, unique counts y data types. Profiling es el first step antes de escribir validation rules.

### Great Expectations vs. Pandera vs. Soda — ¿cuál debería usar?

Great Expectations es best para warehouse-scale validation con HTML reports y historical tracking. Pandera es best para pandas/Python-native validation en notebooks y scripts. Soda es best para SQL-first validation integrated con data warehouses y orchestrators.

### ¿Qué es anomaly detection en data quality?

Statistical methods que detectan unexpected changes en data metrics. Common approaches incluyen z-score (deviation del historical mean), IQR (interquartile range) y time series decomposition. Anomalies triggeréan alerts para investigation.

### ¿Cuándo debería un data quality check fail el pipeline vs. warn?

Failéa el pipeline cuando: primary keys son null o duplicate, required columns son missing, referential integrity está broken, o row count es zero. Warnéa cuando: null rates están above historical baseline, distributions shift slightly, o optional fields son missing.

### ¿Cómo testeo data quality en CI/CD?

Usá dbt tests en CI con `--select state:modified+` para testear solo changed models. Para Python pipelines, runéa Pandera schema validation como un test step. Usá Soda scans en Airflow como un post-load validation task.
