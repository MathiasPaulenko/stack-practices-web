---
contentType: recipes
slug: python-dbt-model-transformations
title: "Transformar Datos en el Warehouse con dbt"
description: "Cómo usar dbt para transformaciones de datos basadas en SQL con models, tests, materializations, macros e incremental loading en un data warehouse."
metaDescription: "Transforma datos en el warehouse con dbt. Define SQL models, ejecuta schema tests, usa materializations, macros e incremental loads para analytics confiables."
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
  metaDescription: "Transforma datos en el warehouse con dbt. Define SQL models, ejecuta schema tests, usa materializations, macros e incremental loads para analytics confiables."
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

dbt (data build tool) es un framework de transformación SQL-first que convierte tu data warehouse en una plataforma de analytics engineering version-controlled. Escribes `SELECT` statements en archivos `.sql` y dbt maneja materialization (table, view, incremental), resolución de dependencias, testing y documentación. dbt compila tus models en SQL, los corre en el warehouse (BigQuery, Snowflake, Redshift, Postgres) y trackea el lineage entre models.

## When to Use

- Transformar data raw en un warehouse en tablas analytics-ready
- Cuando quieres transformaciones SQL version-controlled y testeables
- Construir una arquitectura de models en capas (staging → intermediate → marts)
- Equipos donde los analysts escriben SQL pero necesitan prácticas de software engineering
- Cuando necesitas data lineage, documentación y freshness checks

## When NOT to Use

- Transformaciones real-time/streaming — dbt es batch-oriented
- Datasets pequeños en pandas — usa pandas/Polars directamente
- ETL donde la extracción y carga son el bottleneck — dbt solo hace la T en ETL
- Cuando necesitas lógica procedural compleja (loops, conditionals) — usa stored procedures o Python

## Solution

### Estructura de proyecto

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

### Model básico

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

### Definiciones de source

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

### Model con references

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

`ref()` crea una dependencia — dbt corre `stg_orders` y `stg_customers` antes de `fct_orders`.

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
-- Usando el macro en un model
SELECT
    order_id,
    {{ cents_to_dollars('amount_cents') }} AS amount_dollars
FROM {{ ref('stg_orders') }}
```

### Snapshots para SCD Type 2

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

Los snapshots trackean cambios a la data source a lo largo del tiempo, creando una tabla de historial con columnas `valid_from`, `valid_to` y `dbt_scd_id`.

### Usar variables

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

### Usar dbt con Airflow

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

### Custom materialization con post-hook

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
-- Usando dbt_utils
{{ dbt_utils.date_spine(
    datepart="day",
    start_date="'2025-01-01'",
    end_date="'2025-12-31'"
) }}
```

## Best Practices

- Usa una arquitectura en capas: staging (cleaning) → intermediate (joins) → marts (business logic)
- Siempre testea primary keys con `unique` y `not_null` — atrapa data quality issues temprano
- Usa materialization `ephemeral` para intermediate models usados solo una vez — evita storage
- Usa `incremental` para fact tables grandes — solo procesa rows nuevas, no el historial completo
- Documenta cada model y columna — `dbt docs generate` crea un sitio de documentación
- Usa `ref()` en lugar de hardcodear table names — dbt resuelve dependencias y orden
- Usa sources para data raw y `ref()` para dbt models — separa external de internal
- Corre `dbt test` en CI — falla el pipeline en data quality issues

## Common Mistakes

- **No testear models**: sin tests, la data mala se propaga silenciosamente. Siempre testea primary keys y campos críticos.
- **Usar materialization `table` para todo**: views son más baratos para models queried infrequentemente. Usa `table` solo para models queried seguido.
- **No usar incremental para tablas grandes**: full refresh en una tabla de 100M rows es lento. Usa `incremental` con `unique_key`.
- **Hardcodear schema names**: usa `{{ target.schema }}` o `{{ this }}` — habilita deployments multi-environment.
- **No usar packages**: `dbt_utils` y `dbt_expectations` proveen macros testeadas para patrones comunes.

## FAQ

### ¿Cuál es la diferencia entre source y ref?

`source()` referencia tablas raw cargadas por un proceso externo (Fivetran, Airflow, ETL custom). `ref()` referencia otros dbt models. dbt construye un DAG de ambos para determinar el orden de ejecución.

### ¿Cómo corro models específicos?

```bash
dbt run --select stg_orders        # Un model
dbt run --select marts.*           # Todos los models en marts/
dbt run --select stg_orders+       # stg_orders y todo lo downstream
dbt run --select +fct_orders       # fct_orders y todo lo upstream
```

### ¿Qué es un ephemeral model?

Un ephemeral model no crea un objeto en la base de datos — dbt inlines su SQL como un CTE en models downstream. Úsalo para transformaciones intermedias usadas por solo uno o dos models.

### ¿Cómo manejo slowly changing dimensions?

Usa snapshots. dbt trackea cambios a source rows usando una estrategia de timestamp o checksum, creando una tabla de historial con períodos de validez.

### ¿Puedo usar dbt con Python?

Sí, dbt soporta Python models en warehouses que los soportan (Snowflake, BigQuery, Databricks). Los Python models usan DataFrames para transformaciones:

```python
def model(dbt, session):
    df = dbt.ref("stg_orders")
    return df.filter(df.status == "completed")
```
