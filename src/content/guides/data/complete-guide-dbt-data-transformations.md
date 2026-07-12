---



contentType: guides
slug: complete-guide-dbt-data-transformations
title: "dbt: Models, Tests, Macros, Materializations"
description: "Master dbt for data transformations: models, tests, macros, materializations, seeds, snapshots, Jinja templating, and production patterns for analytics engineering."
metaDescription: "Master dbt for data transformations: models, tests, macros, materializations, seeds, snapshots, Jinja templating, and production patterns for analytics engineering."
difficulty: advanced
topics:
  - data
tags:
  - guide
  - dbt
  - data-transformations
  - analytics-engineering
  - sql
  - jinja
  - data-engineering
relatedResources:
  - /guides/complete-guide-data-pipeline-architecture
  - /guides/complete-guide-apache-airflow
  - /guides/complete-guide-data-quality
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master dbt for data transformations: models, tests, macros, materializations, seeds, snapshots, Jinja templating, and production patterns for analytics engineering."
  keywords:
    - dbt
    - data transformations
    - dbt models
    - dbt tests
    - dbt macros
    - materializations
    - analytics engineering



---

## Introduction

dbt (data build tool) transforms data in your warehouse using SQL. It brings software engineering practices — version control, testing, documentation, modularity — to analytics. You write SELECT statements as models, dbt compiles them into tables and views, and manages dependencies automatically. The following walks through models, tests, macros, materializations, seeds, snapshots, Jinja templating, and production patterns.

## Core Concepts

```
Model: A SQL SELECT statement that dbt compiles into a table or view
Source: A reference to a table in your warehouse that dbt reads from
Seed: A CSV file loaded into your warehouse as a table (for static reference data)
Snapshot: Type 2 Slowly Changing Dimension — tracks history of changing rows
Test: A SQL assertion that returns rows that should not exist (failing test)
Macro: A reusable Jinja code block for SQL generation
Materialization: How a model is stored (view, table, incremental, ephemeral)
Ref: A function to reference another model, building the dependency graph
Schema.yml: Configuration file defining sources, models, tests, and documentation
```

## Project Structure

```
dbt_project/
├── dbt_project.yml          # Project configuration
├── profiles.yml             # Warehouse connection (usually in ~/.dbt/)
├── models/
│   ├── staging/             # Raw → clean (1:1 with source tables)
│   │   ├── stg_orders.sql
│   │   ├── stg_customers.sql
│   │   └── schema.yml
│   ├── intermediate/        # Join and transform staging models
│   │   ├── int_orders_enriched.sql
│   │   └── schema.yml
│   ├── marts/               # Business-facing models
│   │   ├── core/
│   │   │   ├── fct_orders.sql
│   │   │   ├── dim_customers.sql
│   │   │   └── schema.yml
│   │   └── finance/
│   │       ├── fct_revenue.sql
│   │       └── schema.yml
├── macros/                  # Reusable Jinja macros
│   ├── cents_to_dollars.sql
│   └── date_spine.sql
├── seeds/                   # CSV files loaded as tables
│   └── country_codes.csv
├── snapshots/               # SCD Type 2 snapshots
│   └── snap_customers.sql
├── tests/                   # Custom data tests
│   └── assert_positive_revenue.sql
└── analyses/                # One-off SQL analyses (not materialized)
```

## Models

### Staging models

```sql
-- models/staging/stg_orders.sql — Clean raw data
SELECT
    order_id,
    customer_id,
    CAST(created_at AS TIMESTAMP) AS created_at,
    CAST(updated_at AS TIMESTAMP) AS updated_at,
    CAST(subtotal AS DECIMAL(10, 2)) AS subtotal,
    CAST(tax AS DECIMAL(10, 2)) AS tax,
    CAST(shipping AS DECIMAL(10, 2)) AS shipping,
    TRIM(status) AS status,
    TRIM(currency) AS currency
FROM {{ source('raw', 'orders') }}
WHERE order_id IS NOT NULL
```

### Intermediate models

```sql
-- models/intermediate/int_orders_enriched.sql — Join staging models
SELECT
    o.order_id,
    o.customer_id,
    o.created_at,
    o.status,
    o.subtotal + o.tax + o.shipping AS total_amount,
    c.country,
    c.customer_tier,
    CASE
        WHEN c.customer_tier = 'premium' THEN 0.10
        WHEN c.customer_tier = 'gold' THEN 0.05
        ELSE 0.00
    END AS discount_rate
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('stg_customers') }} c
    ON o.customer_id = c.customer_id
```

### Mart models (fact and dimension)

```sql
-- models/marts/core/dim_customers.sql — Dimension table
{{ config(materialized='table') }}

SELECT
    customer_id,
    first_name,
    last_name,
    email,
    country,
    customer_tier,
    created_at,
    COALESCE(first_order_date, '2099-12-31') AS first_order_date
FROM {{ ref('stg_customers') }}
LEFT JOIN (
    SELECT
        customer_id,
        MIN(created_at) AS first_order_date
    FROM {{ ref('stg_orders') }}
    GROUP BY 1
) first_orders USING (customer_id)

-- models/marts/core/fct_orders.sql — Fact table
{{ config(materialized='incremental', unique_key='order_id') }}

SELECT
    o.order_id,
    o.customer_id,
    o.created_at,
    o.status,
    o.total_amount,
    o.discount_rate,
    ROUND(o.total_amount * (1 - o.discount_rate), 2) AS net_amount,
    d.country,
    d.customer_tier
FROM {{ ref('int_orders_enriched') }} o
LEFT JOIN {{ ref('dim_customers') }} d
    ON o.customer_id = d.customer_id
{% if is_incremental() %}
WHERE o.created_at > (SELECT MAX(created_at) FROM {{ this }})
{% endif %}
```

## Materializations

```sql
-- View (default): compiled SQL as a view in the warehouse
{{ config(materialized='view') }}

-- Table: materialized as a physical table (rebuilt on every run)
{{ config(materialized='table') }}

-- Incremental: only insert new rows since last run
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge'  -- or 'append', 'delete+insert'
) }}

-- Ephemeral: not materialized, inlined into dependent models as CTEs
{{ config(materialized='ephemeral') }}
```

### Incremental strategies

```sql
-- Append: fastest, but duplicates if source has updates
{{ config(materialized='incremental', incremental_strategy='append') }}
SELECT * FROM {{ source('raw', 'events') }}
{% if is_incremental() %}
WHERE event_time > (SELECT MAX(event_time) FROM {{ this }})
{% endif %}

-- Merge: upsert based on unique_key (no duplicates)
{{ config(materialized='incremental', unique_key='order_id', incremental_strategy='merge') }}
SELECT * FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
WHERE created_at > (SELECT MAX(created_at) FROM {{ this }})
{% endif %}

-- Delete+insert: delete the partition, then insert fresh data
{{ config(
    materialized='incremental',
    incremental_strategy='delete+insert',
    partition_by={'field': 'created_at', 'data_type': 'date'}
) }}
SELECT * FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
{% endif %}
```

## Tests

### Schema tests

```yaml
# models/staging/schema.yml
version: 2

models:
  - name: stg_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('stg_customers')
              field: customer_id
      - name: status
        tests:
          - accepted_values:
              values: ['pending', 'processing', 'shipped', 'completed', 'cancelled']
      - name: total_amount
        tests:
          - dbt_utils.expression_is_true:
              expression: ">= 0"

  - name: stg_customers
    columns:
      - name: customer_id
        tests:
          - unique
          - not_null
      - name: email
        tests:
          - not_null
          - unique
```

### Custom singular tests

```sql
-- tests/assert_positive_revenue.sql — Custom test
SELECT
    order_id,
    total_amount
FROM {{ ref('fct_orders') }}
WHERE total_amount < 0
-- If any rows return, the test fails

-- tests/assert_no_duplicate_daily_revenue.sql
SELECT
    order_date,
    region,
    COUNT(*) as duplicate_count
FROM {{ ref('fct_daily_revenue') }}
GROUP BY 1, 2
HAVING COUNT(*) > 1
```

## Macros

### Reusable transformations

```sql
-- macros/cents_to_dollars.sql
{% macro cents_to_dollars(column_name) %}
    ROUND({{ column_name }} / 100.0, 2)
{% endmacro %}

-- Usage in a model
SELECT
    order_id,
    {{ cents_to_dollars('subtotal_cents') }} AS subtotal,
    {{ cents_to_dollars('tax_cents') }} AS tax
FROM {{ source('raw', 'orders') }}
```

### Date spine macro

```sql
-- macros/date_spine.sql
{% macro date_spine(start_date, end_date, datepart='day') %}
    WITH RECURSIVE date_spine AS (
        SELECT DATE('{{ start_date }}') AS date_day
        UNION ALL
        SELECT DATE_ADD(date_day, INTERVAL 1 {{ datepart }})
        FROM date_spine
        WHERE date_day < DATE('{{ end_date }}')
    )
    SELECT date_day FROM date_spine
{% endmacro %}

-- Usage
SELECT * FROM ({{ date_spine('2026-01-01', '2026-12-31') }}) AS dates
```

### Macro for safe division

```sql
-- macros/safe_divide.sql
{% macro safe_divide(numerator, denominator, default=0) %}
    CASE
        WHEN {{ denominator }} = 0 OR {{ denominator }} IS NULL THEN {{ default }}
        ELSE {{ numerator }} / {{ denominator }}
    END
{% endmacro %}

-- Usage
SELECT
    region,
    {{ safe_divide('revenue', 'order_count', 'NULL') }} AS avg_order_value
FROM {{ ref('fct_daily_revenue') }}
```

## Seeds

```csv
# seeds/country_codes.csv
country_code,country_name,region
US,United States,North America
CA,Canada,North America
UK,United Kingdom,Europe
DE,Germany,Europe
FR,France,Europe
JP,Japan,Asia
```

```sql
-- Usage in a model
SELECT
    o.order_id,
    c.country_name,
    c.region
FROM {{ ref('stg_orders') }} o
JOIN {{ ref('country_codes') }} c
    ON o.country_code = c.country_code
```

## Snapshots

```sql
-- snapshots/snap_customers.sql — Track changes to customer data
{% snapshot snap_customers %}

{{
    config(
      target_schema='snapshots',
      unique_key='customer_id',
      strategy='timestamp',
      updated_at='updated_at',
    )
}}

SELECT
    customer_id,
    first_name,
    last_name,
    email,
    customer_tier,
    updated_at
FROM {{ source('raw', 'customers') }}

{% endsnapshot %}

-- Query snapshot history
SELECT
    customer_id,
    customer_tier,
    dbt_valid_from,
    dbt_valid_to,
    CASE WHEN dbt_valid_to IS NULL THEN 'current' ELSE 'historical' END AS record_status
FROM {{ ref('snap_customers') }}
WHERE customer_id = '12345'
ORDER BY dbt_valid_from
```

## Jinja Templating

```sql
-- Conditional logic
{% if var('is_production', false) %}
    WHERE status = 'completed'
{% else %}
    WHERE status IN ('completed', 'pending')
{% endif %}

-- Loops
{% set payment_methods = ['credit_card', 'bank_transfer', 'paypal'] %}
SELECT
    order_id,
    {% for method in payment_methods %}
        SUM(CASE WHEN payment_method = '{{ method }}' THEN amount ELSE 0 END)
            AS {{ method }}_amount
        {% if not loop.last %},{% endif %}
    {% endfor %}
FROM {{ ref('stg_payments') }}
GROUP BY 1

-- Variables
{% set start_date = var('start_date', '2026-01-01') %}
WHERE created_at >= '{{ start_date }}'

-- Environment-aware configs
{{ config(
    materialized='incremental',
    schema='analytics' if target.name == 'prod' else 'analytics_dev',
    tags=['prod'] if target.name == 'prod' else ['dev'],
) }}
```

## Production Patterns

### dbt project configuration

```yaml
# dbt_project.yml
name: analytics
version: 1.0.0
profile: analytics

models:
  analytics:
    staging:
      +materialized: view
      +schema: staging
    intermediate:
      +materialized: ephemeral
    marts:
      core:
        +materialized: table
        +schema: core
      finance:
        +materialized: incremental
        +schema: finance
        +incremental_strategy: merge

seeds:
  analytics:
    +schema: reference

snapshots:
  +target_schema: snapshots

tests:
  +severity: error
  +store_failures: true
```

### Running dbt

```bash
# Run all models
dbt run

# Run specific models
dbt run --select stg_orders+
dbt run --select tag:daily
dbt run --select path:models/marts/core/

# Run with variables
dbt run --vars '{"start_date": "2026-01-01", "is_production": true}'

# Test
dbt test
dbt test --select stg_orders
dbt test --select fct_orders+

# Build (run + test)
dbt build --select staging+
dbt build --exclude tag:manual

# Seed and snapshot
dbt seed
dbt snapshot

# Documentation
dbt docs generate
dbt docs serve  # Local documentation server

# Freshness check (sources)
dbt source freshness
```

### CI/CD with GitHub Actions

```yaml
# .github/workflows/dbt_ci.yml
name: dbt CI
on:
  pull_request:
    paths: ['dbt_project/**']

jobs:
  dbt-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dbt
        run: pip install dbt-snowflake
      - name: dbt deps
        run: dbt deps --profiles-dir dbt_project
      - name: dbt build (modified models only)
        env:
          SNOWFLAKE_ACCOUNT: ${{ secrets.SNOWFLAKE_ACCOUNT }}
          SNOWFLAKE_USER: ${{ secrets.SNOWFLAKE_USER }}
          SNOWFLAKE_PASSWORD: ${{ secrets.SNOWFLAKE_PASSWORD }}
        run: |
          dbt build \
            --select state:modified+ \
            --state ./target \
            --profiles-dir dbt_project
      - name: dbt docs generate
        run: dbt docs generate --profiles-dir dbt_project
```

## Best Practices


- For a deeper guide, see [Apache Airflow: DAGs, Operators, Scheduling](/guides/complete-guide-apache-airflow/).

- Follow the staging → intermediate → marts layering — each layer has a clear purpose
- Use `ref()` for all model references — dbt builds the dependency graph automatically
- Name staging models `stg_`, intermediate `int_`, facts `fct_`, dimensions `dim_`
- Test every model — at minimum `unique` and `not_null` on primary keys
- Use incremental materialization for large fact tables — avoid full rebuilds
- Use `ephemeral` materialization for small intermediate models — saves storage
- Document every model and column in `schema.yml` — `dbt docs serve` generates docs
- Use macros for repeated SQL patterns — DRY principle for SQL
- Use snapshots for SCD Type 2 — track history of changing source data
- Set `+store_failures: true` in tests — query failing rows for debugging
- Use `--select state:modified+` in CI — only test what changed
- Version your dbt project with git — same branching strategy as application code

## Common Mistakes

- **Not using `ref()`**: hardcoding table names breaks the dependency graph and materialization order.
- **Overusing `table` materialization**: views are cheaper for staging models that change frequently.
- **No tests on primary keys**: duplicate or null IDs break downstream joins silently.
- **Incremental without `unique_key`**: append strategy creates duplicates when source rows update.
- **Complex logic in marts**: business logic should be in intermediate models, marts should be simple joins.
- **Not using `is_incremental()` guard**: without the guard, incremental models do full rebuilds every run.

## FAQ

### What is dbt?

dbt (data build tool) is a SQL-first transformation tool. You write SELECT statements as models, and dbt compiles them into views/tables in your warehouse, managing dependencies, testing, and documentation.

### What are materializations?

How dbt stores a model in the warehouse. `view` creates a view, `table` creates a physical table (rebuilt each run), `incremental` only adds new rows, and `ephemeral` inlines the model as a CTE into dependent models without materializing.

### What is the difference between sources and refs?

`source()` references a raw table that exists in your warehouse before dbt runs. `ref()` references another dbt model. `ref()` builds the dependency graph — dbt knows to run the referenced model first.

### What are dbt tests?

SQL assertions that return rows that should not exist. `unique` tests that no values repeat. `not_null` tests that no values are null. `relationships` tests referential integrity. If a test returns any rows, it fails.

### What is a snapshot in dbt?

A Type 2 Slowly Changing Dimension. dbt tracks changes to source rows over time, maintaining `dbt_valid_from` and `dbt_valid_to` columns. This lets you query what a row looked like at any point in time.
