---
contentType: docs
slug: data-quality-rules-template
title: "Plantilla de Reglas de Calidad de Datos"
description: "Una plantilla para definir reglas de validación por dataset y columna: completeness, consistency, accuracy, timeliness y uniqueness checks."
metaDescription: "Usá esta plantilla de reglas de calidad de datos para definir validación por dataset y columna: completeness, consistency, accuracy, timeliness, uniqueness."
difficulty: intermediate
topics:
  - testing
tags:
  - data-engineering
  - data-quality
  - validation
  - template
  - etl
  - testing
  - data
relatedResources:
  - /docs/data-engineering/data-pipeline-design-document-template
  - /docs/data-engineering/etl-job-runbook-template
  - /docs/data-engineering/data-governance-policy-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de reglas de calidad de datos para definir validación por dataset y columna: completeness, consistency, accuracy, timeliness, uniqueness."
  keywords:
    - data quality
    - validation rules
    - data testing
    - data engineering
    - template
    - completeness
    - consistency
---

## Overview

Data quality rules definen qué significa "good data" para cada dataset y columna. Checkean completeness (no nulls), consistency (valid references), accuracy (values en expected ranges), timeliness (data es fresh) y uniqueness (no duplicates). Sin explicit rules, bad data fluye a consumers undetected.

## When to Use

- Definiendo quality checks para un new data pipeline
- Estableciendo data contracts entre producers y consumers
- Seteando up dbt tests o Great Expectations suites
- Compliance requirements para data validation
- Onboardéando new datasets a un data platform

## Solution

```markdown
# Data Quality Rules — `<Dataset Name>`

## Rules Overview

| Field | Value |
|-------|-------|
| Dataset | fct_orders |
| Schema | marts |
| Database | analytics |
| Owner | Data Platform Team |
| Last Updated | 2026-07-05 |
| Total Rules | 28 |
| Critical Rules | 12 |
| Warning Rules | 16 |
| Framework | dbt tests + Great Expectations |
| Execution | Post-load, pre-consumer access |

## 1. Quality Dimensions

| Dimension | Description | Example |
|-----------|-------------|---------|
| Completeness | Required fields no son null | order_id nunca debe ser null |
| Consistency | Data conforma a expected format y relationships | currency debe ser valid ISO 4217 code |
| Accuracy | Values caen dentro de expected ranges | total_amount debe ser positive |
| Timeliness | Data es fresh enough para su purpose | Data debe ser < 24 hours old |
| Uniqueness | No duplicate records | order_id debe ser unique |
| Validity | Values matchean expected patterns | email debe matchear regex pattern |

## 2. Column-Level Rules

### order_id

| Rule ID | Rule | Type | Severity | SQL | Action on Failure |
|---------|------|------|----------|-----|-------------------|
| DQ-001 | Not null | Completeness | Critical | `SELECT COUNT(*) FROM fct_orders WHERE order_id IS NULL` | Fail pipeline |
| DQ-002 | Unique | Uniqueness | Critical | `SELECT order_id, COUNT(*) FROM fct_orders GROUP BY order_id HAVING COUNT(*) > 1` | Fail pipeline |
| DQ-003 | Format: starts con "ord_" | Validity | Critical | `SELECT COUNT(*) FROM fct_orders WHERE order_id NOT LIKE 'ord_%'` | Fail pipeline |
| DQ-004 | Length between 8 y 64 chars | Validity | Warning | `SELECT COUNT(*) FROM fct_orders WHERE LENGTH(order_id) < 8 OR LENGTH(order_id) > 64` | Log + proceed |

### customer_id

| Rule ID | Rule | Type | Severity | SQL | Action on Failure |
|---------|------|------|----------|-----|-------------------|
| DQ-005 | Not null | Completeness | Critical | `SELECT COUNT(*) FROM fct_orders WHERE customer_id IS NULL` | Fail pipeline |
| DQ-006 | Exists en dim_customers | Consistency | Critical | `SELECT COUNT(*) FROM fct_orders o LEFT JOIN dim_customers c ON o.customer_id = c.customer_id WHERE c.customer_id IS NULL` | Fail pipeline |
| DQ-007 | Format: starts con "cus_" | Validity | Warning | `SELECT COUNT(*) FROM fct_orders WHERE customer_id NOT LIKE 'cus_%'` | Log + proceed |

### order_date

| Rule ID | Rule | Type | Severity | SQL | Action on Failure |
|---------|------|------|----------|-----|-------------------|
| DQ-008 | Not null | Completeness | Critical | `SELECT COUNT(*) FROM fct_orders WHERE order_date IS NULL` | Fail pipeline |
| DQ-009 | Not en future | Accuracy | Critical | `SELECT COUNT(*) FROM fct_orders WHERE order_date > CURRENT_TIMESTAMP` | Fail pipeline |
| DQ-010 | Not older que 5 years | Accuracy | Warning | `SELECT COUNT(*) FROM fct_orders WHERE order_date < DATEADD(year, -5, CURRENT_DATE)` | Log + proceed |
| DQ-011 | Date matchea partition | Consistency | Warning | `SELECT COUNT(*) FROM fct_orders WHERE DATE(order_date) != partition_date` | Log + proceed |

### status

| Rule ID | Rule | Type | Severity | SQL | Action on Failure |
|---------|------|------|----------|-----|-------------------|
| DQ-012 | Not null | Completeness | Critical | `SELECT COUNT(*) FROM fct_orders WHERE status IS NULL` | Fail pipeline |
| DQ-013 | Valid enum value | Validity | Critical | `SELECT COUNT(*) FROM fct_orders WHERE status NOT IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')` | Fail pipeline |

### total_amount

| Rule ID | Rule | Type | Severity | SQL | Action on Failure |
|---------|------|------|----------|-----|-------------------|
| DQ-014 | Not null | Completeness | Critical | `SELECT COUNT(*) FROM fct_orders WHERE total_amount IS NULL` | Fail pipeline |
| DQ-015 | Greater que 0 | Accuracy | Critical | `SELECT COUNT(*) FROM fct_orders WHERE total_amount <= 0` | Fail pipeline |
| DQ-016 | Less que 100000 | Accuracy | Warning | `SELECT COUNT(*) FROM fct_orders WHERE total_amount >= 100000` | Log + proceed |
| DQ-017 | Matchea sum de line items | Consistency | Critical | `SELECT COUNT(*) FROM fct_orders o JOIN fct_order_items i ON o.order_id = i.order_id GROUP BY o.order_id HAVING o.total_amount != SUM(i.line_total)` | Fail pipeline |

### currency

| Rule ID | Rule | Type | Severity | SQL | Action on Failure |
|---------|------|------|----------|-----|-------------------|
| DQ-018 | Not null | Completeness | Critical | `SELECT COUNT(*) FROM fct_orders WHERE currency IS NULL` | Fail pipeline |
| DQ-019 | Valid ISO 4217 code | Validity | Critical | `SELECT COUNT(*) FROM fct_orders WHERE currency NOT IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'BRL', 'MXN')` | Fail pipeline |
| DQ-020 | Length es 3 | Validity | Warning | `SELECT COUNT(*) FROM fct_orders WHERE LENGTH(currency) != 3` | Log + proceed |

### payment_method

| Rule ID | Rule | Type | Severity | SQL | Action on Failure |
|---------|------|------|----------|-----|-------------------|
| DQ-021 | Not null cuando status = completed | Completeness | Critical | `SELECT COUNT(*) FROM fct_orders WHERE status = 'completed' AND payment_method IS NULL` | Fail pipeline |
| DQ-022 | Valid enum value | Validity | Warning | `SELECT COUNT(*) FROM fct_orders WHERE payment_method NOT IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto', 'apple_pay', 'google_pay')` | Log + proceed |

## 3. Dataset-Level Rules

| Rule ID | Rule | Type | Severity | SQL | Action on Failure |
|---------|------|------|----------|-----|-------------------|
| DQ-023 | Row count > 0 | Completeness | Critical | `SELECT COUNT(*) FROM fct_orders` (must be > 0) | Fail pipeline |
| DQ-024 | Row count dentro de expected range | Accuracy | Warning | `SELECT COUNT(*) FROM fct_orders` (must be between 100k y 10M) | Log + proceed |
| DQ-025 | Data es fresh (< 24h) | Timeliness | Critical | `SELECT MAX(_ingested_at) FROM fct_orders` (must be < 24h ago) | Fail pipeline |
| DQ-026 | No orphaned records | Consistency | Critical | `SELECT COUNT(*) FROM fct_orders o LEFT JOIN dim_customers c ON o.customer_id = c.customer_id WHERE c.customer_id IS NULL` | Fail pipeline |
| DQ-027 | All completed orders tienen payment events | Consistency | Warning | `SELECT COUNT(*) FROM fct_orders o WHERE o.status = 'completed' AND NOT EXISTS (SELECT 1 FROM fct_payment_events p WHERE p.order_id = o.order_id)` | Log + proceed |
| DQ-028 | Refund amounts no exceden original | Accuracy | Critical | `SELECT COUNT(*) FROM fct_orders WHERE status = 'refunded' AND refund_amount > total_amount` | Fail pipeline |

## 4. dbt Test Configuration

### YAML Schema File

```yaml
version: 2

models:
  - name: fct_orders
    description: "Fact table containing all customer orders"
    columns:
      - name: order_id
        description: "Unique order identifier"
        tests:
          - not_null
          - unique
          - accepted_values:
              values: ["ord_%"]
              quote: false

      - name: customer_id
        description: "Customer reference"
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id

      - name: order_date
        description: "Order placement timestamp"
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "order_date <= CURRENT_TIMESTAMP"

      - name: status
        description: "Order status"
        tests:
          - not_null
          - accepted_values:
              values: ['pending', 'processing', 'completed', 'cancelled', 'refunded']

      - name: total_amount
        description: "Order total in original currency"
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "total_amount > 0"
          - dbt_utils.expression_is_true:
              expression: "total_amount < 100000"

      - name: currency
        description: "ISO 4217 currency code"
        tests:
          - not_null
          - accepted_values:
              values: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'BRL', 'MXN']

    tests:
      - dbt_utils.expression_is_true:
          expression: "status != 'completed' OR payment_method IS NOT NULL"
          name: completed_orders_have_payment_method

      - dbt_utils.expression_is_true:
          expression: "status != 'refunded' OR refund_amount <= total_amount"
          name: refund_does_not_exceed_original
```

### Custom Test: Row Count Range

```sql
-- tests/assert_row_count_range.sql
{{ config(severity='WARN') }}

SELECT
    CASE
        WHEN COUNT(*) < 100000 THEN 'FAIL: row count below minimum'
        WHEN COUNT(*) > 10000000 THEN 'FAIL: row count above maximum'
        ELSE 'OK'
    END AS result
FROM {{ ref('fct_orders') }}
HAVING result != 'OK'
```

### Custom Test: Data Freshness

```sql
-- tests/assert_data_freshness.sql
SELECT
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(_ingested_at))) / 3600 AS hours_since_last_ingest
FROM {{ ref('fct_orders') }}
HAVING hours_since_last_ingest > 24
```

## 5. Great Expectations Suite

```python
import great_expectations as gx

# Create expectation suite
suite = gx.ExpectationSuite("fct_orders_suite")

# Completeness
suite.add_expectation(gx.expect_column_values_to_not_be_null(column="order_id"))
suite.add_expectation(gx.expect_column_values_to_not_be_null(column="customer_id"))
suite.add_expectation(gx.expect_column_values_to_not_be_null(column="order_date"))
suite.add_expectation(gx.expect_column_values_to_not_be_null(column="total_amount"))

# Uniqueness
suite.add_expectation(gx.expect_column_values_to_be_unique(column="order_id"))

# Validity
suite.add_expectation(gx.expect_column_values_to_match_regex(
    column="order_id",
    regex=r"^ord_[a-zA-Z0-9]{5,60}$"
))
suite.add_expectation(gx.expect_column_values_to_be_in_set(
    column="status",
    value_set=["pending", "processing", "completed", "cancelled", "refunded"]
))
suite.add_expectation(gx.expect_column_values_to_be_in_set(
    column="currency",
    value_set=["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "BRL", "MXN"]
))

# Accuracy
suite.add_expectation(gx.expect_column_values_to_be_between(
    column="total_amount",
    min_value=0.01,
    max_value=100000
))
suite.add_expectation(gx.expect_column_values_to_be_between(
    column="order_date",
    min_value="2021-01-01",
    max_value="2026-12-31"
))

# Consistency
suite.add_expectation(gx.expect_column_pair_values_A_to_be_greater_than_B(
    column_A="total_amount",
    column_B="refund_amount",
    or_equal=True,
    row_condition="status == 'refunded'",
    condition_parser="pandas"
))

# Dataset-level
suite.add_expectation(gx.expect_table_row_count_to_be_between(min_value=100000, max_value=10000000))
```

## 6. Rule Execution and Reporting

### Execution Schedule

| When | Rules | Framework | Action |
|------|-------|-----------|--------|
| Post-staging load | DQ-001 to DQ-022 (column-level) | dbt tests | Blockeá transform en critical failure |
| Post-transform | DQ-023 to DQ-028 (dataset-level) | dbt tests + Great Expectations | Blockeá consumer access en critical failure |
| Hourly (continuous) | DQ-025 (freshness) | Custom SQL | Alert on failure |
| Weekly (audit) | All rules | Great Expectations | Generá quality report |

### Quality Report Template

| Metric | Value | Status |
|--------|-------|--------|
| Total rules executed | 28 | — |
| Rules passed | 26 | ✅ |
| Rules failed (critical) | 0 | ✅ |
| Rules failed (warning) | 2 | ⚠️ |
| Row count | 2,543,210 | ✅ |
| Null rate (order_id) | 0% | ✅ |
| Null rate (payment_method) | 12.3% | ⚠️ (expected para non-completed) |
| Duplicate rate | 0% | ✅ |
| Freshness (hours) | 2.5 | ✅ |
| Referential integrity | 100% | ✅ |
```

## Explanation

Data quality rules son el safety net entre data pipelines y data consumers. Sin ellos, bad data llega a dashboards, ML models y business reports, leading a incorrect decisions. El rules template coverea six quality dimensions: completeness, consistency, accuracy, timeliness, uniqueness y validity.

Column-level rules checkean individual fields: not null, unique, valid format, within range. Estos son los most common checks y catchean los most frequent data issues. Dataset-level rules checkean el table como un whole: row count, freshness, referential integrity, cross-table consistency.

El severity field determina qué pasa on failure. Critical rules blockean el pipeline — bad data no llega a consumers. Warning rules loguean el issue pero allow el pipeline a proceed — esto handlea edge cases dónde un small number de violations es acceptable.

dbt tests son el primary framework para SQL-based checks. Se integran con el pipeline y corren automáticamente después de transforms. Great Expectations se usa para more complex checks y genera detailed quality reports. Ambos frameworks pueden coexistir.

El execution schedule separa rules por cuándo deberían correr. Column-level rules corren después de staging load para catchear issues early. Dataset-level rules corren después de transforms para verify el final output. Freshness checks corren hourly para detectar stale data entre pipeline runs.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Streaming pipeline | Usá sliding window checks | Reemplazá batch checks con windowed aggregates |
| ML feature store | Addeá feature distribution checks | Detectá data drift y schema changes |
| Compliance data | Addeá PII detection y masking checks | GDPR, CCPA requirements |
| Financial data | Stricter accuracy rules | Cada cent debe reconcile |
| User-generated content | Addeá content quality checks | Profanity, spam, encoding issues |

## What Works

1. Empezá con critical rules first — not null, unique, referential integrity
2. Usá warnings para edge cases — 100% strictness blockea pipelines unnecessarily
3. Corré rules en el pipeline, no después — blockeá bad data antes de que llegue a consumers
4. Trackeá quality metrics over time — degrading quality es un early warning signal
5. Documentá el business reason de cada rule — "¿por qué importa esto?"
6. Revieweá rules quarterly — schemas y business logic cambian
7. Alert on rule failures — silent failures defeat el purpose

## Common Mistakes

1. No quality rules at all — "lo checkearemos manualmente" nunca pasa
2. All rules critical — too many critical rules blockean pipelines constantemente
3. No action on failure — rules que loguean pero no blockean se ignorean
4. Rules not versioned — schema changes breakean rules silently
5. No freshness check — stale data se ve fresh sin explicit checks
6. Rules too strict — 100% completeness en optional fields blockea valid data
7. No documentation — rules sin context se remueven cuando failan

## Frequently Asked Questions

### ¿Cuántas quality rules deberíamos tener?

Empezá con 5-10 critical rules per dataset: not null en primary keys, unique en identifiers, referential integrity en foreign keys y row count > 0. Addeá warning rules a medida que descubrís edge cases. Un mature dataset típicamente tiene 20-30 rules. Más rules significan más maintenance y más false positives.

### ¿Cuál es la difference entre critical y warning severity?

Critical rules blockean el pipeline — data no llega a consumers si el rule fail. Warning rules loguean el issue pero allow el pipeline a proceed. Usá critical para rules que indican broken data (null primary key, duplicate records). Usá warning para rules que indican unusual pero possible data (high order amount, old records).

### ¿Deberíamos usar dbt tests o Great Expectations?

Ambos, para different purposes. dbt tests son SQL-based y se integran con el pipeline — usalos para standard checks (not null, unique, relationships). Great Expectations es Python-based y genera detailed reports — usalo para complex checks y audit reporting. Se complementan.

### ¿Cómo handleamos rules que failan intermintently?

Si un rule faila intermintently, o el rule es too strict o el data tiene un quality issue que va y viene. Investigá el failure pattern: ¿es time-based? ¿Source-based? Si el rule es too strict, downgradé de critical a warning. Si el data tiene un real issue, fixeá el source.

### ¿Cómo medimos data quality over time?

Trackeá estos metrics: rule pass rate (percentage de rules passing per run), null rate per column, duplicate rate, freshness lag y row count variance. Plotealos en un dashboard. Degrading trends indican source system issues, pipeline bugs o schema drift. Seteá alerts en trend changes, no solo en absolute thresholds.
