---
contentType: recipes
slug: python-dbt-model-transformations
title: "Transform Data in the Warehouse with dbt"
description: "How to use dbt for SQL-based data transformations with models, tests, materializations, macros, and incremental loading in a data warehouse."
metaDescription: "Transform data in the warehouse with dbt. Define SQL models, run schema tests, use materializations, macros, and incremental loads for reliable analytics."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - python
  - dbt
  - sql
  - data-warehouse
  - transformations
  - recipe
relatedResources:
  - /recipes/data/python-pandas-etl-pipeline
  - /recipes/data/sql-cte-recursive-hierarchy
  - /recipes/data/python-airflow-dag-scheduling
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Transform data in the warehouse with dbt. Define SQL models, run schema tests, use materializations, macros, and incremental loads for reliable analytics."
  keywords:
    - data
    - python
    - dbt
    - sql
    - data-warehouse
    - transformations
    - recipe
---

## Overview

dbt (data build tool) is a SQL-first transformation framework that turns your data warehouse into a version-controlled analytics engineering platform. You write `SELECT` statements in `.sql` files, and dbt handles materialization (table, view, incremental), dependency resolution, testing, and documentation. dbt compiles your models into SQL, runs them in the warehouse (BigQuery, Snowflake, Redshift, Postgres), and tracks lineage between models.

## When to Use

- Transforming raw data in a warehouse into analytics-ready tables
- When you want version-controlled, testable SQL transformations
- Building a layered model architecture (staging → intermediate → marts)
- Teams where analysts write SQL but need software engineering practices
- When you need data lineage, documentation, and freshness checks

## When NOT to Use

- Real-time/streaming transformations — dbt is batch-oriented
- Small datasets in pandas — use pandas/Polars directly
- ETL where extraction and loading are the bottleneck — dbt only does the T in ETL
- When you need complex procedural logic (loops, conditionals) — use stored procedures or Python

## Solution

### Project structure

```
dbt_project/
├── dbt_project.yml
├── profiles.yml
├── models/
│   ├── staging/
│   │   ├── stg_orders.sql
│   │   ├── stg_customers.sql
│   │   └── schema.yml
│   ├── intermediate/
│   │   └── int_orders_enriched.sql
│   └── marts/
│       ├── fct_orders.sql
│       ├── dim_customers.sql
│       └── schema.yml
├── macros/
│   └── cents_to_dollars.sql
├── tests/
│   └── assert_order_status.sql
└── snapshots/
    └── snap_customers.sql
```

### Basic model

```sql
-- models/staging/stg_orders.sql
SELECT
    order_id::integer AS order_id,
    customer_id::integer AS customer_id,
    order_date::date AS order_date,
    amount::numeric(10,2) AS amount,
    status::varchar AS status
FROM {{ source('raw', 'orders') }}
```

### Source definitions

```yaml
# models/staging/schema.yml
version: 2

sources:
  - name: raw
    database: warehouse
    schema: raw_data
    tables:
      - name: orders
        columns:
          - name: order_id
            tests:
              - unique
              - not_null
          - name: amount
            tests:
              - not_null
      - name: customers
        columns:
          - name: customer_id
            tests:
              - unique
              - not_null
```

### Model with references

```sql
-- models/marts/fct_orders.sql
SELECT
    o.order_id,
    o.customer_id,
    o.order_date,
    o.amount,
    o.status,
    c.customer_name,
    c.customer_tier,
    c.city
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('stg_customers') }} c
    ON o.customer_id = c.customer_id
WHERE o.status = 'completed'
```

`ref()` creates a dependency — dbt runs `stg_orders` and `stg_customers` before `fct_orders`.

### Materializations

```yaml
# dbt_project.yml
models:
  my_project:
    staging:
      +materialized: view
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      fct_orders:
        +materialized: incremental
```

```sql
-- models/marts/fct_orders.sql — incremental model
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge'
) }}

SELECT
    o.order_id,
    o.customer_id,
    o.order_date,
    o.amount
FROM {{ ref('stg_orders') }} o
WHERE o.status = 'completed'

{% if is_incremental() %}
    AND o.order_date > (SELECT MAX(order_date) FROM {{ this }})
{% endif %}
```

### Schema tests

```yaml
# models/marts/schema.yml
version: 2

models:
  - name: fct_orders
    description: "Completed orders with customer details"
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: amount
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "amount >= 0"
      - name: status
        tests:
          - accepted_values:
              values: ['completed', 'pending', 'cancelled']
```

### Custom singular test

```sql
-- tests/assert_no_negative_amounts.sql
SELECT *
FROM {{ ref('fct_orders') }}
WHERE amount < 0
```

### Macros

```sql
-- macros/cents_to_dollars.sql
{% macro cents_to_dollars(column_name) %}
    ({{ column_name }} / 100.0)
{% endmacro %}
```

```sql
-- Using the macro in a model
SELECT
    order_id,
    {{ cents_to_dollars('amount_cents') }} AS amount_dollars
FROM {{ ref('stg_orders') }}
```

### Snapshots for SCD Type 2

```sql
-- snapshots/snap_customers.sql
{% snapshot snap_customers %}
{{
    config(
      target_schema='snapshots',
      unique_key='customer_id',
      strategy='timestamp',
      updated_at='updated_at',
    )
}}
SELECT * FROM {{ source('raw', 'customers') }}
{% endsnapshot %}
```

Snapshots track changes to source data over time, creating a history table with `valid_from`, `valid_to`, and `dbt_scd_id` columns.

### Using variables

```sql
-- models/marts/fct_orders.sql
SELECT *
FROM {{ ref('stg_orders') }}
WHERE order_date >= '{{ var('start_date', '2025-01-01') }}'
```

```bash
dbt run --vars '{"start_date": "2025-06-01"}'
```

### Hooks

```yaml
# dbt_project.yml
on-run-start:
  - "CREATE SCHEMA IF NOT EXISTS {{ target.schema }}"
on-run-end:
  - "{{ log('Model run complete', info=True) }}"
```

## Variants

### Using dbt with Airflow

```python
from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime

dag = DAG("dbt_pipeline", schedule_interval="@daily", start_date=datetime(2025, 1, 1))

dbt_run = BashOperator(
    task_id="dbt_run",
    bash_command="cd /opt/dbt && dbt run --select marts.*",
    dag=dag,
)

dbt_test = BashOperator(
    task_id="dbt_test",
    bash_command="cd /opt/dbt && dbt test --select marts.*",
    dag=dag,
)

dbt_run >> dbt_test
```

### Custom materialization with post-hook

```sql
{{ config(
    materialized='table',
    post_hook="CREATE INDEX IF NOT EXISTS idx_orders_date ON {{ this }} (order_date)"
) }}

SELECT * FROM {{ ref('stg_orders') }}
```

### Packages

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.1.1
  - package: calogica/dbt_expectations
    version: 0.10.3
```

```bash
dbt deps
```

```sql
-- Using dbt_utils
{{ dbt_utils.date_spine(
    datepart="day",
    start_date="'2025-01-01'",
    end_date="'2025-12-31'"
) }}
```

## Best Practices

- Use a layered architecture: staging (cleaning) → intermediate (joins) → marts (business logic)
- Always test primary keys with `unique` and `not_null` — catches data quality issues early
- Use `ephemeral` materialization for intermediate models used only once — avoids storage
- Use `incremental` for large fact tables — only process new rows, not the full history
- Document every model and column — `dbt docs generate` creates a documentation site
- Use `ref()` instead of hardcoding table names — dbt resolves dependencies and order
- Use sources for raw data and `ref()` for dbt models — separates external from internal
- Run `dbt test` in CI — fail the pipeline on data quality issues

## Common Mistakes

- **Not testing models**: without tests, bad data propagates silently. Always test primary keys and critical fields.
- **Using `table` materialization for everything**: views are cheaper for models queried infrequently. Use `table` only for models queried often.
- **Not using incremental for large tables**: full refresh on a 100M row table is slow. Use `incremental` with a `unique_key`.
- **Hardcoding schema names**: use `{{ target.schema }}` or `{{ this }}` — enables multi-environment deployments.
- **Not using packages**: `dbt_utils` and `dbt_expectations` provide tested macros for common patterns.

## FAQ

### What is the difference between a source and a ref?

`source()` references raw tables loaded by an external process (Fivetran, Airflow, custom ETL). `ref()` references other dbt models. dbt builds a DAG from both to determine execution order.

### How do I run specific models?

```bash
dbt run --select stg_orders        # One model
dbt run --select marts.*           # All models in marts/
dbt run --select stg_orders+       # stg_orders and all downstream
dbt run --select +fct_orders       # fct_orders and all upstream
```

### What is an ephemeral model?

An ephemeral model doesn't create a database object — dbt inlines its SQL as a CTE in downstream models. Use it for intermediate transformations used by only one or two models.

### How do I handle slowly changing dimensions?

Use snapshots. dbt tracks changes to source rows using a timestamp or checksum strategy, creating a history table with validity periods.

### Can I use dbt with Python?

Yes, dbt supports Python models in warehouses that support them (Snowflake, BigQuery, Databricks). Python models use DataFrames for transformations:

```python
def model(dbt, session):
    df = dbt.ref("stg_orders")
    return df.filter(df.status == "completed")
```
