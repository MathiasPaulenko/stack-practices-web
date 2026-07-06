---
contentType: docs
slug: data-pipeline-design-document-template
title: "Data Pipeline Design Document Template"
description: "A template for documenting data pipeline sources, transformations, sinks, scheduling, error handling, and monitoring with schema definitions."
metaDescription: "Use this data pipeline design document template to define sources, transforms, sinks, scheduling, error handling, monitoring, and data schemas."
difficulty: intermediate
topics:
  - testing
tags:
  - data-engineering
  - pipeline
  - etl
  - design-document
  - template
  - data
  - architecture
relatedResources:
  - /docs/data-engineering/data-quality-rules-template
  - /docs/data-engineering/etl-job-runbook-template
  - /docs/data-engineering/data-governance-policy-template
  - /guides/databases/complete-guide-database-indexing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this data pipeline design document template to define sources, transforms, sinks, scheduling, error handling, monitoring, and data schemas."
  keywords:
    - data pipeline
    - pipeline design
    - etl document
    - data engineering
    - template
    - data architecture
    - pipeline documentation
---

## Overview

A data pipeline design document specifies how data flows from sources through transformations to destinations. It defines schemas, scheduling, error handling, monitoring, and operational procedures. Without a design document, pipelines become opaque systems that only the original author understands.

## When to Use

- Building a new data pipeline
- Modifying an existing pipeline's sources or transforms
- Onboarding engineers to a data platform
- Compliance and audit requirements for data lineage
- Designing pipelines for critical business metrics

## Solution

```markdown
# Data Pipeline Design — `<Pipeline Name>`

## Pipeline Overview

| Field | Value |
|-------|-------|
| Pipeline Name | Orders ETL Pipeline |
| Pipeline ID | PL-ORD-001 |
| Version | 3.2.0 |
| Owner | Data Platform Team |
| Last Updated | 2026-07-05 |
| Status | Production |
| Schedule | Daily at 02:00 UTC |
| Average Runtime | 45 minutes |
| Data Volume | ~2.5M records per run |
| Framework | Apache Airflow + dbt |
| Orchestrator | Airflow on Kubernetes |

## 1. Architecture Overview

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Source  │────▶│  Staging │────▶│ Transform│────▶│   Sink   │
│  (API)   │     │  (S3)    │     │  (dbt)   │     │(Redshift)│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                        │                │
                        ▼                ▼
                  ┌──────────┐     ┌──────────┐
                  │  Quality │     │  Monitor │
                  │  Checks  │     │(Grafana) │
                  └──────────┘     └──────────┘
```

## 2. Data Sources

### Source 1: Orders API

| Field | Value |
|-------|-------|
| Source Name | Orders API |
| Source Type | REST API (paginated) |
| API URL | https://api.example.com/v1/orders |
| Authentication | OAuth 2.0 (client credentials) |
| Pagination | Cursor-based, 1000 records per page |
| Rate Limit | 100 requests per minute |
| Data Format | JSON |
| Extraction Mode | Full load (daily snapshot) |
| Incremental Key | `updated_at` |
| Retry Policy | 3 retries with exponential backoff (1s, 4s, 16s) |
| Timeout | 30 seconds per request |

### Source 2: Payment Gateway Webhook Log

| Field | Value |
|-------|-------|
| Source Name | Payment Gateway Log |
| Source Type | S3 bucket (event notifications) |
| Bucket | s3://example-payment-logs/ |
| File Format | JSON Lines (one event per line) |
| Partitioning | `year/month/day/` |
| Extraction Mode | Incremental (new files since last run) |
| File Pattern | `payment_events_*.jsonl` |

### Source Schema: Orders API

| Field | Type | Nullable | Description | Example |
|-------|------|----------|-------------|---------|
| order_id | string | No | Unique order identifier | "ord_abc123" |
| customer_id | string | No | Customer reference | "cus_xyz789" |
| order_date | timestamp | No | Order placement time | "2026-07-05T14:30:00Z" |
| status | string | No | Order status enum | "completed" |
| total_amount | decimal(10,2) | No | Order total | 129.99 |
| currency | string | No | ISO 4217 currency code | "USD" |
| items | array | No | Line items | [{...}] |
| shipping_address | object | Yes | Shipping destination | {...} |
| payment_method | string | Yes | Payment method used | "credit_card" |
| discount_code | string | Yes | Applied discount | "SAVE10" |
| created_at | timestamp | No | Record creation time | "2026-07-05T14:30:00Z" |
| updated_at | timestamp | No | Last update time | "2026-07-05T14:35:00Z" |

## 3. Staging Layer

### Staging Tables

| Table | Source | Storage | Retention | Purpose |
|-------|--------|---------|-----------|---------|
| stg_orders | Orders API | S3 (Parquet) | 90 days | Raw order data |
| stg_payment_events | Payment Gateway Log | S3 (Parquet) | 90 days | Raw payment events |

### Staging Schema: stg_orders

```sql
CREATE TABLE stg_orders (
    order_id          VARCHAR(64)    NOT NULL,
    customer_id       VARCHAR(64)    NOT NULL,
    order_date        TIMESTAMP      NOT NULL,
    status            VARCHAR(32)    NOT NULL,
    total_amount      DECIMAL(10,2)  NOT NULL,
    currency          VARCHAR(3)     NOT NULL,
    items             JSON           NOT NULL,
    shipping_address  JSON,
    payment_method    VARCHAR(64),
    discount_code     VARCHAR(32),
    created_at        TIMESTAMP      NOT NULL,
    updated_at        TIMESTAMP      NOT NULL,
    _ingested_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    _source_file      VARCHAR(256),
    PRIMARY KEY (order_id, _ingested_at)
);
```

## 4. Transformations

### Transform 1: Deduplicate Orders

| Field | Value |
|-------|-------|
| Name | deduplicate_orders |
| Tool | dbt |
| Model | stg_orders → int_orders_dedup |
| Logic | Keep latest record per order_id by updated_at |
| Type | Incremental |

```sql
-- int_orders_dedup.sql
{{ config(materialized='incremental', unique_key='order_id') }}

SELECT
    order_id,
    customer_id,
    order_date,
    status,
    total_amount,
    currency,
    items,
    shipping_address,
    payment_method,
    discount_code,
    created_at,
    updated_at
FROM (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY order_id
            ORDER BY updated_at DESC
        ) AS rn
    FROM {{ ref('stg_orders') }}
    {% if is_incremental() %}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
    {% endif %}
)
WHERE rn = 1
```

### Transform 2: Enrich with Customer Data

| Field | Value |
|-------|-------|
| Name | enrich_orders |
| Tool | dbt |
| Model | int_orders_dedup + dim_customers → int_orders_enriched |
| Logic | Join orders with customer dimension |
| Type | Incremental |

```sql
-- int_orders_enriched.sql
SELECT
    o.order_id,
    o.customer_id,
    o.order_date,
    o.status,
    o.total_amount,
    o.currency,
    o.items,
    o.payment_method,
    o.discount_code,
    c.customer_segment,
    c.customer_country,
    c.customer_tier,
    c.is_enterprise
FROM {{ ref('int_orders_dedup') }} o
LEFT JOIN {{ ref('dim_customers') }} c
    ON o.customer_id = c.customer_id
```

### Transform 3: Calculate Order Metrics

| Field | Value |
|-------|-------|
| Name | calculate_metrics |
| Tool | dbt |
| Model | int_orders_enriched → fct_order_metrics |
| Logic | Aggregate daily order metrics |
| Type | Incremental |

```sql
-- fct_order_metrics.sql
{{ config(materialized='incremental', unique_key='order_date') }}

SELECT
    DATE(order_date) AS order_date,
    COUNT(*) AS total_orders,
    COUNT(DISTINCT customer_id) AS unique_customers,
    SUM(total_amount) AS gross_revenue,
    SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END) AS refund_amount,
    SUM(CASE WHEN discount_code IS NOT NULL THEN 1 ELSE 0 END) AS discounted_orders,
    AVG(total_amount) AS avg_order_value,
    SUM(CASE WHEN c.is_enterprise THEN 1 ELSE 0 END) AS enterprise_orders,
    SUM(CASE WHEN c.is_enterprise THEN total_amount ELSE 0 END) AS enterprise_revenue
FROM {{ ref('int_orders_enriched') }}
{% if is_incremental() %}
WHERE DATE(order_date) > (SELECT MAX(order_date) FROM {{ this }})
{% endif %}
GROUP BY DATE(order_date)
```

## 5. Data Sinks

### Sink 1: Redshift — Fact Table

| Field | Value |
|-------|-------|
| Target Table | fct_order_metrics |
| Database | analytics |
| Schema | marts |
| Write Mode | Upsert (merge on order_date) |
| Cluster | analytics-cluster-prod |
| Distribution Key | order_date |
| Sort Key | order_date |

### Sink 2: Redshift — Enriched Orders

| Field | Value |
|-------|-------|
| Target Table | fct_orders_enriched |
| Database | analytics |
| Schema | marts |
| Write Mode | Append (partitioned by order_date) |
| Cluster | analytics-cluster-prod |
| Distribution Key | customer_id |
| Sort Key | order_date |

### Sink 3: S3 — Data Lake Export

| Field | Value |
|-------|-------|
| Target Path | s3://example-data-lake/marts/order_metrics/ |
| Format | Parquet (snappy compressed) |
| Partitioning | `order_date=YYYY-MM-DD/` |
| Purpose | BI tools, ML feature store, archival |

## 6. Scheduling and Orchestration

### Airflow DAG Configuration

| Field | Value |
|-------|-------|
| DAG ID | orders_etl_pipeline |
| Schedule | `0 2 * * *` (daily at 02:00 UTC) |
| Start Date | 2026-01-01 |
| Catchup | False |
| Max Active Runs | 1 |
| Retries | 3 |
| Retry Delay | 5 minutes |
| SLA | 90 minutes |
| Owner | data-platform |
| Email on Failure | data-platform@example.com |
| Email on Retry | False |

### DAG Task Dependencies

```
extract_orders_api >> stage_orders >> quality_check_staging
extract_payment_logs >> stage_payments >> quality_check_staging
quality_check_staging >> transform_dedup >> transform_enrich >> transform_metrics
transform_metrics >> quality_check_final >> load_redshift >> export_s3 >> notify_success
quality_check_final >> notify_failure
```

### Airflow DAG Definition

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.providers.amazon.aws.operators.s3 import S3ListOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-platform',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'email': ['data-platform@example.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'sla': timedelta(minutes=90),
}

dag = DAG(
    'orders_etl_pipeline',
    default_args=default_args,
    schedule='0 2 * * *',
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=['etl', 'orders', 'production'],
)

extract_orders = PythonOperator(
    task_id='extract_orders_api',
    python_callable=extract_orders_from_api,
    dag=dag,
)

stage_orders = BashOperator(
    task_id='stage_orders',
    bash_command='cd /opt/etl && python stage_orders.py --date {{ ds }}',
    dag=dag,
)

run_dbt = BashOperator(
    task_id='run_dbt_transforms',
    bash_command='cd /opt/dbt && dbt run --select int_orders_dedup int_orders_enriched fct_order_metrics',
    dag=dag,
)

quality_check = BashOperator(
    task_id='quality_checks',
    bash_command='cd /opt/dbt && dbt test --select fct_order_metrics',
    dag=dag,
)

load_redshift = BashOperator(
    task_id='load_redshift',
    bash_command='cd /opt/etl && python load_redshift.py --date {{ ds }}',
    dag=dag,
)

export_s3 = BashOperator(
    task_id='export_s3',
    bash_command='cd /opt/etl && python export_s3.py --date {{ ds }}',
    dag=dag,
)

extract_orders >> stage_orders >> run_dbt >> quality_check >> load_redshift >> export_s3
```

## 7. Error Handling

| Error Scenario | Detection | Action | Notification |
|---------------|-----------|--------|-------------|
| API authentication failure | HTTP 401 from source API | Retry 3x, then fail DAG | Email + PagerDuty |
| API rate limit hit | HTTP 429 from source API | Exponential backoff, retry up to 5x | Slack warning |
| Source schema change | Schema validation check | Fail DAG, quarantine data | Email + Slack |
| Duplicate records | Quality check (row count delta) | Log warning, proceed with dedup | Slack warning |
| Transform failure | dbt run error | Fail DAG, alert on-call | PagerDuty |
| Quality check failure | dbt test failure | Fail DAG, prevent load | PagerDuty |
| Sink connection failure | Connection timeout | Retry 3x, then fail DAG | PagerDuty |
| Sink disk full | Write error | Fail DAG, alert infrastructure | PagerDuty |
| DAG timeout | SLA miss | Kill DAG, alert on-call | PagerDuty + Email |

### Dead Letter Queue

| Field | Value |
|-------|-------|
| DLQ Location | s3://example-dlq/orders_etl/ |
| Retention | 30 days |
| Trigger | Any failed record during transform |
| Review Process | Weekly review by data platform team |

## 8. Monitoring and Alerting

### Metrics

| Metric | Source | Threshold | Alert |
|--------|--------|-----------|-------|
| Pipeline duration | Airflow | > 90 min | Warning |
| Pipeline duration | Airflow | > 120 min | Critical |
| Records ingested | Staging table count | < 100k (expected ~2.5M) | Warning |
| Records ingested | Staging table count | < 10k | Critical |
| Transform error rate | dbt logs | > 0% | Critical |
| Quality check failures | dbt test results | > 0 | Critical |
| Sink write latency | Redshift query logs | > 10 min | Warning |
| DAG success rate | Airflow metrics | < 90% (7-day rolling) | Warning |

### Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Pipeline Health | https://grafana.example.com/d/pipeline-health | Overall pipeline status |
| Data Quality | https://grafana.example.com/d/data-quality | Quality check results |
| Data Volume | https://grafana.example.com/d/data-volume | Record counts and trends |
| Pipeline Latency | https://grafana.example.com/d/pipeline-latency | Runtime trends |

## 9. Data Quality Checks

| Check | Type | Threshold | Action on Failure |
|-------|------|-----------|-------------------|
| Row count not null | dbt test | > 0 | Fail pipeline |
| Row count within expected range | Custom | 1M - 5M | Warning + proceed |
| No duplicate order_ids | dbt test (unique) | 0 duplicates | Fail pipeline |
| No null order_dates | dbt test (not_null) | 0 nulls | Fail pipeline |
| total_amount positive | dbt test (accepted_range) | > 0 | Fail pipeline |
| Referential integrity (customer_id) | dbt test (relationships) | 0 orphans | Warning + proceed |
| Freshness check | dbt test (freshness) | < 24 hours old | Warning |
| Schema drift | Custom schema check | No new columns | Fail + alert |

## 10. Operational Procedures

### Manual Re-run

```bash
# Trigger DAG manually for a specific date
airflow dags trigger orders_etl_pipeline --conf '{"date": "2026-07-04"}'

# Re-run from a specific task
airflow tasks run orders_etl_pipeline run_dbt_transforms 2026-07-05

# Clear task state and re-run
airflow tasks clear orders_etl_pipeline -t run_dbt_transforms -s 2026-07-05 -e 2026-07-05
```

### Backfill Procedure

```bash
# Backfill for a date range
airflow dags backfill orders_etl_pipeline \
  --start-date 2026-06-01 \
  --end-date 2026-06-30 \
  --reset-dagruns
```
```

## Explanation

A data pipeline design document serves three audiences: the engineers building it, the operators running it, and the consumers relying on its output. Engineers need the source schemas, transformation logic, and sink specifications. Operators need the scheduling, error handling, and monitoring sections. Consumers need to know what data is available, how fresh it is, and what quality checks it passes.

The architecture diagram provides a quick visual overview of data flow. The sources section documents each source's connection details, authentication, pagination, and schema. The staging layer defines where raw data lands before transformation — this separation allows reprocessing without re-extraction.

Transformations are documented as a chain: deduplicate, enrich, aggregate. Each step specifies the input model, output model, and logic. Using dbt models makes the transformations version-controlled and testable.

The scheduling section defines when the pipeline runs, how long it should take, and what happens when it fails. Airflow DAG configuration includes retries, SLA, and notification settings. Task dependencies show the execution order.

Error handling covers the most common failure scenarios: API failures, schema changes, transform errors, and sink issues. Each scenario has a detection method, an action, and a notification channel. The dead letter queue captures failed records for later analysis.

Monitoring and alerting track pipeline health metrics: duration, record counts, error rates, and quality check results. Dashboards provide visibility into pipeline status for operators and stakeholders.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Real-time pipeline | Replace batch with streaming (Kafka + Flink) | Add latency requirements |
| ELT pipeline | Load raw data first, transform in warehouse | Skip staging layer |
| Multi-source pipeline | Document each source separately | Add source priority and conflict resolution |
| ML feature pipeline | Add feature store as sink | Document feature definitions and versions |
| Compliance pipeline | Add PII detection and masking | Document data retention and deletion |

## What Works

1. Document sources with exact connection details — operators need them at 3 AM
2. Version the design document with the pipeline code — changes are tracked
3. Include schema definitions — schemas are the contract between pipeline and consumers
4. Define quality checks in the design — not as an afterthought
5. Document error scenarios with specific actions — "check logs" is not an action
6. Include manual re-run and backfill procedures — operators need them
7. Link dashboards and alerts — reduce time to diagnosis

## Common Mistakes

1. No schema documentation — consumers don't know what fields exist
2. No error handling section — operators improvise when things break
3. No quality checks — bad data flows to consumers undetected
4. No monitoring — pipelines fail silently until someone notices stale data
5. No backfill procedure — historical reprocessing is ad-hoc and error-prone
6. Outdated documentation — pipeline changes without doc updates
7. No data lineage — consumers can't trace a metric back to its source

## Frequently Asked Questions

### How detailed should the transformation logic be?

Detailed enough that another engineer can reproduce the transformation from the document. Include SQL, configuration, and test cases. If using dbt, reference the model names and include the SQL in the document or link to the model files.

### Should we document internal staging tables?

Yes. Staging tables are part of the pipeline contract. If a staging table schema changes, downstream transforms may break. Documenting staging tables makes schema changes visible during code review.

### How do we handle schema changes in source systems?

Detect schema changes with a schema validation check in the staging layer. When a new column appears, the check fails and alerts the team. Evaluate the change, update the pipeline and documentation, then re-run. Never silently accept schema changes.

### What is the difference between ELT and ETL?

ETL extracts data, transforms it in a processing engine, then loads it to the warehouse. ELT loads raw data to the warehouse first, then transforms it using warehouse compute. ELT is simpler because it skips the staging processing step, but requires a powerful warehouse. Document which approach your pipeline uses.

### How do we version the pipeline design document?

Store it in the same repository as the pipeline code. Use semantic versioning: major for breaking schema changes, minor for new features, patch for fixes. Update the version field in the document header on every change. Review the document in the same PR that changes the pipeline.
