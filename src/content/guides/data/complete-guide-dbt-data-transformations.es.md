---
contentType: guides
slug: complete-guide-dbt-data-transformations
title: "dbt: Modelos, Tests, Macros, Materializations"
description: "Dominá dbt para data transformations: modelos, tests, macros, materializations, seeds, snapshots, Jinja templating y patrones de producción para analytics engineering."
metaDescription: "Dominá dbt para data transformations: modelos, tests, macros, materializations, seeds, snapshots, Jinja templating y patrones de producción para analytics engineering."
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
  - /guides/data/complete-guide-data-pipeline-architecture
  - /guides/data/complete-guide-apache-airflow
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Dominá dbt para data transformations: modelos, tests, macros, materializations, seeds, snapshots, Jinja templating y patrones de producción para analytics engineering."
  keywords:
    - dbt
    - data transformations
    - dbt models
    - dbt tests
    - dbt macros
    - materializations
    - analytics engineering
---

## Introducción

dbt (data build tool) transforma data en tu warehouse usando SQL. Trae software engineering practices — version control, testing, documentation, modularity — a analytics. Escribís SELECT statements como models, dbt los compila en tables y views, y maneja dependencies automáticamente. A continuación: models, tests, macros, materializations, seeds, snapshots, Jinja templating y production patterns.

## Core Concepts

```
Model: Un SQL SELECT statement que dbt compila en un table o view
Source: Una reference a un table en tu warehouse que dbt lee
Seed: Un CSV file loaded en tu warehouse como table (para static reference data)
Snapshot: Type 2 Slowly Changing Dimension — trackea history de changing rows
Test: Una SQL assertion que retorna rows que no deberían existir (failing test)
Macro: Un reusable Jinja code block para SQL generation
Materialization: Cómo un model es stored (view, table, incremental, ephemeral)
Ref: Una function para referencear otro model, buildando el dependency graph
Schema.yml: Configuration file definiendo sources, models, tests y documentation
```

## Project Structure

```
dbt_project/
├── dbt_project.yml          # Project configuration
├── profiles.yml             # Warehouse connection (usually in ~/.dbt/)
├── models/
│   ├── staging/             # Raw → clean (1:1 con source tables)
│   │   ├── stg_orders.sql
│   │   ├── stg_customers.sql
│   │   └── schema.yml
│   ├── intermediate/        # Join y transform staging models
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
├── seeds/                   # CSV files loaded como tables
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

### Mart models (fact y dimension)

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
-- View (default): compiled SQL como un view en el warehouse
{{ config(materialized='view') }}

-- Table: materialized como un physical table (rebuilt en every run)
{{ config(materialized='table') }}

-- Incremental: solo inserta new rows desde last run
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge'  -- o 'append', 'delete+insert'
) }}

-- Ephemeral: not materialized, inlined en dependent models como CTEs
{{ config(materialized='ephemeral') }}
```

### Incremental strategies

```sql
-- Append: fastest, pero duplica si source tiene updates
{{ config(materialized='incremental', incremental_strategy='append') }}
SELECT * FROM {{ source('raw', 'events') }}
{% if is_incremental() %}
WHERE event_time > (SELECT MAX(event_time) FROM {{ this }})
{% endif %}

-- Merge: upsert basado en unique_key (no duplicates)
{{ config(materialized='incremental', unique_key='order_id', incremental_strategy='merge') }}
SELECT * FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
WHERE created_at > (SELECT MAX(created_at) FROM {{ this }})
{% endif %}

-- Delete+insert: deleteá la partition, luego insertá fresh data
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
-- Si cualquier row retorna, el test fails

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

-- Usage en un model
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

### Macro para safe division

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
-- Usage en un model
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
-- snapshots/snap_customers.sql — Trackeá changes a customer data
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

-- Queryéa snapshot history
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

# Run con variables
dbt run --vars '{"start_date": "2026-01-01", "is_production": true}'

# Test
dbt test
dbt test --select stg_orders
dbt test --select fct_orders+

# Build (run + test)
dbt build --select staging+
dbt build --exclude tag:manual

# Seed y snapshot
dbt seed
dbt snapshot

# Documentation
dbt docs generate
dbt docs serve  # Local documentation server

# Freshness check (sources)
dbt source freshness
```

### CI/CD con GitHub Actions

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

- Seguí el staging → intermediate → marts layering — cada layer tiene un clear purpose
- Usá `ref()` para todos los model references — dbt builda el dependency graph automáticamente
- Nombrá staging models `stg_`, intermediate `int_`, facts `fct_`, dimensions `dim_`
- Testeá cada model — at minimum `unique` y `not_null` en primary keys
- Usá incremental materialization para large fact tables — evitá full rebuilds
- Usá `ephemeral` materialization para small intermediate models — savea storage
- Documentá cada model y column en `schema.yml` — `dbt docs serve` genera docs
- Usá macros para repeated SQL patterns — DRY principle para SQL
- Usá snapshots para SCD Type 2 — trackeá history de changing source data
- Seteá `+store_failures: true` en tests — queryéa failing rows para debugging
- Usá `--select state:modified+` en CI — solo testéa lo que cambió
- Versioná tu dbt project con git — same branching strategy que application code

## Common Mistakes

- **No usar `ref()`**: hardcoding table names break el dependency graph y materialization order.
- **Overusar `table` materialization**: views son cheaper para staging models que cambian frecuentemente.
- **No tests en primary keys**: duplicate o null IDs break downstream joins silently.
- **Incremental sin `unique_key`**: append strategy crea duplicates cuando source rows update.
- **Complex logic en marts**: business logic debería estar en intermediate models, marts deberían ser simple joins.
- **No usar `is_incremental()` guard**: sin el guard, incremental models hacen full rebuilds en every run.

## FAQ

### ¿Qué es dbt?

dbt (data build tool) es un SQL-first transformation tool. Escribís SELECT statements como models, y dbt los compila en views/tables en tu warehouse, manejando dependencies, testing y documentation.

### ¿Qué son materializations?

Cómo dbt storea un model en el warehouse. `view` crea un view, `table` crea un physical table (rebuilt cada run), `incremental` solo agrega new rows, y `ephemeral` inlinea el model como un CTE en dependent models sin materializar.

### ¿Cuál es la diferencia entre sources y refs?

`source()` referencea un raw table que existe en tu warehouse antes de que dbt run. `ref()` referencea otro dbt model. `ref()` builda el dependency graph — dbt sabe que tiene que run el referenced model first.

### ¿Qué son dbt tests?

SQL assertions que retornan rows que no deberían existir. `unique` testea que no values repeat. `not_null` testea que no values sean null. `relationships` testea referential integrity. Si un test retorna cualquier row, fails.

### ¿Qué es un snapshot en dbt?

Un Type 2 Slowly Changing Dimension. dbt trackea changes a source rows over time, manteniendo `dbt_valid_from` y `dbt_valid_to` columns. Esto te deja queryear cómo se veía un row en cualquier point en el time.
