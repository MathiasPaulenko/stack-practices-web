---
contentType: guides
slug: etl-pipeline-guide
title: "ETL Pipelines: Extract, Transform, Load for Data Engineers"
description: "A practical guide to ETL pipelines: extracting data from multiple sources, transforming with validation and business logic, and loading into data warehouses. Covers batch scheduling, error handling, and monitoring with Python, dbt, and Airflow."
metaDescription: "Learn ETL pipelines: extract from multiple sources, transform with validation and business logic, and load into data warehouses with Python, dbt, and Airflow."
difficulty: intermediate
topics:
  - data
  - architecture
  - devops
tags:
  - etl
  - data-pipeline
  - data-warehouse
  - airflow
  - dbt
  - batch-processing
  - guide
relatedResources:
  - /guides/data/stream-processing-guide
  - /guides/data/real-time-analytics-guide
  - /guides/data/data-migration-guide
  - /guides/observability/metrics-and-dashboards-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn ETL pipelines: extract from multiple sources, transform with validation and business logic, and load into data warehouses with Python, dbt, and Airflow."
  keywords:
    - etl
    - data-pipeline
    - data-warehouse
    - airflow
    - dbt
    - batch-processing
    - guide
---

## Overview

ETL (Extract, Transform, Load) pipelines move data from operational systems into analytical systems where it can be queried, reported on, and used for decision-making. Unlike stream processing, which handles events as they arrive, ETL processes data in scheduled batches, making it simpler to implement and easier to reason about for many business analytics use cases.

This guide covers pipeline architecture, data extraction strategies, data shaping patterns, loading techniques, and production operational considerations.

## When to Use

- You need to consolidate data from multiple sources into a single analytical database
- Your analytics queries are too slow or disruptive to run on production databases
- You need historical snapshots of data that changes over time
- Your data requires cleansing, enrichment, or aggregation before analysis
- You want to separate operational and analytical workloads
- You need scheduled, repeatable data processing (hourly, daily, weekly)

## When NOT to Use

- You need sub-second latency from event to insight. Use stream processing.
- Your data volume is small enough to query directly from source databases
- You need real-time fraud detection or alerting. Use event streaming.
- Your data changes are discrete events that should trigger immediate actions

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Extract** | Reading data from source systems (databases, APIs, files) |
| **Transform** | Cleaning, validating, enriching, and restructuring data |
| **Load** | Writing processed data to the destination (data warehouse, lake) |
| **Staging** | Intermediate storage for raw data before shaping |
| **Incremental Load** | Processing only new or changed records since last run |
| **Full Refresh** | Reprocessing all data from scratch |
| **SCD** | Slowly Changing Dimension: tracking historical changes |

## ETL Architecture

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Source  │    │  Source  │    │  Source  │
│   CRM    │    │  Orders  │    │   Logs   │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┼───────────────┘
                     │ Extract
                     ▼
            ┌────────────────┐
            │   Staging Area │   (Raw data, schema-on-read)
            │  (S3 / GCS /   │
            │   Temp tables) │
            └───────┬────────┘
                    │ Transform
                    ▼
            ┌────────────────┐
            │  Data Warehouse │   (Clean, modeled data)
            │  (Snowflake /   │
            │   BigQuery /     │
            │   PostgreSQL)    │
            └────────────────┘
```

## Step-by-Step ETL Implementation

### 1. Extract Data from Sources

Extract data reliably without impacting source systems:

```python
# Example: Extract from PostgreSQL with incremental loading
import psycopg2
import pandas as pd
from datetime import datetime

class PostgresExtractor:
    def __init__(self, connection_string, watermark_table='etl_watermarks'):
        self.conn = psycopg2.connect(connection_string)
        self.watermark_table = watermark_table
        self._ensure_watermark_table()
    
    def _ensure_watermark_table(self):
        """Track last extraction time per table."""
        cursor = self.conn.cursor()
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {self.watermark_table} (
                table_name VARCHAR(255) PRIMARY KEY,
                last_extracted TIMESTAMP,
                last_id BIGINT,
                record_count BIGINT
            )
        """)
        self.conn.commit()
    
    def extract_incremental(self, table, timestamp_column='updated_at', 
                           id_column='id', batch_size=10000):
        """Extract only records changed since last run."""
        cursor = self.conn.cursor()
        
        # Get watermark
        cursor.execute(f"""
            SELECT last_extracted FROM {self.watermark_table} 
            WHERE table_name = %s
        """, (table,))
        row = cursor.fetchone()
        last_extracted = row[0] if row else datetime.min
        
        # Extract new/changed records
        cursor.execute(f"""
            SELECT * FROM {table} 
            WHERE {timestamp_column} > %s 
            ORDER BY {id_column}
            LIMIT %s
        """, (last_extracted, batch_size))
        
        columns = [desc[0] for desc in cursor.description]
        data = cursor.fetchall()
        df = pd.DataFrame(data, columns=columns)
        
        # Update watermark
        if not df.empty:
            max_timestamp = df[timestamp_column].max()
            cursor.execute(f"""
                INSERT INTO {self.watermark_table} (table_name, last_extracted)
                VALUES (%s, %s)
                ON CONFLICT (table_name) DO UPDATE SET last_extracted = EXCLUDED.last_extracted
            """, (table, max_timestamp))
            self.conn.commit()
        
        return df
    
    def extract_full(self, table):
        """Extract entire table (for small reference data)."""
        return pd.read_sql(f"SELECT * FROM {table}", self.conn)
```

```python
# Example: Extract from REST API with pagination
import requests
import json

class APIExtractor:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def extract_paginated(self, endpoint, params=None):
        """Extract all pages from a paginated API."""
        all_data = []
        page = 1
        
        while True:
            response = requests.get(
                f"{self.base_url}/{endpoint}",
                headers=self.headers,
                params={**(params or {}), 'page': page, 'per_page': 100}
            )
            response.raise_for_status()
            
            data = response.json()
            if not data.get('results'):
                break
            
            all_data.extend(data['results'])
            
            if not data.get('has_more', False):
                break
            
            page += 1
        
        return pd.DataFrame(all_data)
    
    def extract_with_backoff(self, endpoint, max_retries=3):
        """Extract with exponential backoff for rate limiting."""
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    f"{self.base_url}/{endpoint}",
                    headers=self.headers
                )
                
                if response.status_code == 429:  # Rate limited
                    wait = 2 ** attempt
                    time.sleep(wait)
                    continue
                
                response.raise_for_status()
                return response.json()
            
            except requests.RequestException as e:
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
```

#### Extraction Strategies

| Strategy | Use Case | Trade-off |
|----------|----------|-----------|
| **Full extract** | Small tables (<1M rows), reference data | Simple, but slow for large tables |
| **Incremental (timestamp)** | Tables with `updated_at` column | Fast, but misses hard deletes |
| **Incremental (ID)** | Tables with auto-incrementing ID | Captures inserts, misses updates |
| **CDC (Change Data Capture)** | All change types, real-time extract | Requires Debezium or database triggers |
| **API polling** | External SaaS data | Rate limits, eventual consistency |

### 2. Transform Data

Clean, validate, and reshape extracted data:

```python
# Example: Data pipeline with validation
import pandas as pd
from typing import Dict, List, Callable

class DataTransformer:
    def __init__(self):
        self.validators: List[Callable] = []
        self.transforms: List[Callable] = []
    
    def add_validator(self, validator: Callable):
        self.validators.append(validator)
    
    def add_transform(self, transform: Callable):
        self.transforms.append(transform)
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Run all validations then transforms."""
        # Validation
        errors = []
        for validator in self.validators:
            result = validator(df)
            if result:
                errors.extend(result)
        
        if errors:
            raise ValidationError(f"Validation failed with {len(errors)} errors: {errors[:5]}")
        
        # Transform
        for transform in self.transforms:
            df = transform(df)
        
        return df

# Define validators
def validate_no_null_ids(df):
    null_count = df['customer_id'].isnull().sum()
    if null_count > 0:
        return [f"{null_count} rows with null customer_id"]
    return []

def validate_email_format(df):
    invalid = df[~df['email'].str.contains(r'^[^@]+@[^@]+\.[^@]+$', na=False)]
    if len(invalid) > 0:
        return [f"{len(invalid)} rows with invalid email format"]
    return []

# Define transforms
def normalize_emails(df):
    df['email'] = df['email'].str.lower().str.strip()
    return df

def calculate_order_totals(df):
    df['order_total'] = df['quantity'] * df['unit_price'] * (1 - df['discount'])
    return df

def add_derived_columns(df):
    df['order_year'] = pd.to_datetime(df['order_date']).dt.year
    df['order_month'] = pd.to_datetime(df['order_date']).dt.month
    df['customer_segment'] = pd.cut(
        df['lifetime_value'],
        bins=[0, 100, 500, 1000, float('inf')],
        labels=['Bronze', 'Silver', 'Gold', 'Platinum']
    )
    return df

# Build pipeline
transformer = DataTransformer()
transformer.add_validator(validate_no_null_ids)
transformer.add_validator(validate_email_format)
transformer.add_transform(normalize_emails)
transformer.add_transform(calculate_order_totals)
transformer.add_transform(add_derived_columns)

# Run pipeline
clean_data = transformer.transform(raw_data)
```

#### Transform Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| **Cleansing** | Remove/fix invalid data | Null handling, deduplication |
| **Normalization** | Standardize formats | Dates, currencies, units |
| **Enrichment** | Add derived data | Geo-location from IP, customer segment |
| **Aggregation** | Summarize granular data | Daily sales from order lines |
| **Joining** | Combine multiple sources | Orders + Customers + Products |
| **Type casting** | Convert data types | String → Date, String → Numeric |
| **Filtering** | Exclude irrelevant rows | Test data, cancelled orders |

### 3. Load into Data Warehouse

Load transformed data efficiently:

```python
# Example: Load to PostgreSQL with upsert (merge)
import psycopg2
from psycopg2.extras import execute_values

class PostgresLoader:
    def __init__(self, connection_string):
        self.conn = psycopg2.connect(connection_string)
    
    def upsert(self, df, table, key_columns, batch_size=1000):
        """Insert or update records using ON CONFLICT."""
        cursor = self.conn.cursor()
        
        columns = list(df.columns)
        column_str = ', '.join(columns)
        
        # Build update clause for non-key columns
        update_columns = [c for c in columns if c not in key_columns]
        update_clause = ', '.join([f"{c} = EXCLUDED.{c}" for c in update_columns])
        
        # Batch insert with upsert
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            values = [tuple(row) for _, row in batch.iterrows()]
            
            query = f"""
                INSERT INTO {table} ({column_str})
                VALUES %s
                ON CONFLICT ({', '.join(key_columns)}) DO UPDATE SET {update_clause}
            """
            
            execute_values(cursor, query, values)
            self.conn.commit()
    
    def bulk_load(self, df, table, staging_table=None):
        """Fast load using COPY command via staging table."""
        staging = staging_table or f"{table}_staging"
        cursor = self.conn.cursor()
        
        # Create staging table like target
        cursor.execute(f"DROP TABLE IF EXISTS {staging}")
        cursor.execute(f"CREATE TABLE {staging} (LIKE {table} INCLUDING ALL)")
        
        # COPY data to staging
        from io import StringIO
        buffer = StringIO()
        df.to_csv(buffer, index=False, header=False, sep='\t', na_rep='\\N')
        buffer.seek(0)
        
        cursor.copy_from(buffer, staging, columns=list(df.columns), sep='\t', null='\\N')
        
        # Merge staging to target
        cursor.execute(f"""
            INSERT INTO {table}
            SELECT * FROM {staging}
            ON CONFLICT DO NOTHING
        """)
        
        cursor.execute(f"DROP TABLE {staging}")
        self.conn.commit()
```

```python
# Example: Load to Snowflake using Snowpark
from snowflake.snowpark import Session

class SnowflakeLoader:
    def __init__(self, account, user, password, database, schema):
        self.session = Session.builder.configs({
            "account": account,
            "user": user,
            "password": password,
            "database": database,
            "schema": schema
        }).create()
    
    def load_dataframe(self, df, table):
        """Load pandas DataFrame to Snowflake table."""
        snowpark_df = self.session.create_dataframe(df)
        snowpark_df.write.mode("overwrite").save_as_table(table)
    
    def merge_dataframe(self, df, table, key_columns):
        """Merge (upsert) DataFrame into existing table."""
        temp_table = f"{table}_temp"
        
        # Create temp table from DataFrame
        snowpark_df = self.session.create_dataframe(df)
        snowpark_df.write.mode("overwrite").save_as_table(temp_table)
        
        # Execute MERGE statement
        key_match = " AND ".join([f"t.{k} = s.{k}" for k in key_columns])
        update_set = ", ".join([f"t.{c} = s.{c}" for c in df.columns if c not in key_columns])
        insert_cols = ", ".join(df.columns)
        insert_vals = ", ".join([f"s.{c}" for c in df.columns])
        
        merge_sql = f"""
            MERGE INTO {table} t
            USING {temp_table} s
            ON ({key_match})
            WHEN MATCHED THEN UPDATE SET {update_set}
            WHEN NOT MATCHED THEN INSERT ({insert_cols}) VALUES ({insert_vals})
        """
        
        self.session.sql(merge_sql).collect()
        self.session.sql(f"DROP TABLE IF EXISTS {temp_table}").collect()
```

#### Loading Strategies

| Strategy | Best For | Trade-off |
|----------|----------|-----------|
| **Full refresh (TRUNCATE + INSERT)** | Small tables, data marts | Simple, but downtime for large tables |
| **Upsert/Merge** | Incremental loads, dimension tables | Preserves history, complex |
| **Staging + swap** | Large fact tables | Zero downtime, requires 2× space temporarily |
| **Partition replacement** | Partitioned tables (date) | Fast, but requires partition alignment |
| **Stream insert** | Near-real-time micro-batches | Higher complexity, lower latency |

### 4. Orchestrate with Apache Airflow

Schedule and monitor ETL workflows:

```python
# Example: Airflow DAG for daily ETL
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.amazon.aws.hooks.s3 import S3Hook
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'email': ['data-alerts@company.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'daily_sales_etl',
    default_args=default_args,
    description='Daily sales data ETL from production to warehouse',
    schedule_interval='0 2 * * *',  # Run at 2 AM daily
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['sales', 'etl'],
) as dag:
    
    def extract_orders(**context):
        pg_hook = PostgresHook(postgres_conn_id='production_db')
        sql = """
            SELECT * FROM orders 
            WHERE created_at >= %s AND created_at < %s
        """
        execution_date = context['ds']
        next_date = (datetime.strptime(execution_date, '%Y-%m-%d') + 
                     timedelta(days=1)).strftime('%Y-%m-%d')
        
        df = pg_hook.get_pandas_df(sql, parameters=(execution_date, next_date))
        
        # Save to staging S3
        s3_hook = S3Hook(aws_conn_id='aws_default')
        s3_hook.load_string(
            df.to_csv(index=False),
            key=f"staging/orders/{execution_date}.csv",
            bucket_name='data-lake',
            replace=True
        )
        
        return f"Extracted {len(df)} orders"
    
    def transform_orders(**context):
        s3_hook = S3Hook(aws_conn_id='aws_default')
        execution_date = context['ds']
        
        # Read from staging
        csv_data = s3_hook.read_key(
            key=f"staging/orders/{execution_date}.csv",
            bucket_name='data-lake'
        )
        df = pd.read_csv(pd.io.common.StringIO(csv_data))
        
        # Transform
        transformer = DataTransformer()
        transformer.add_transform(calculate_order_totals)
        transformer.add_transform(add_derived_columns)
        clean_df = transformer.transform(df)
        
        # Write to processed
        s3_hook.load_string(
            clean_df.to_csv(index=False),
            key=f"processed/orders/{execution_date}.csv",
            bucket_name='data-lake',
            replace=True
        )
        
        return f"Transformed {len(clean_df)} orders"
    
    def load_to_warehouse(**context):
        execution_date = context['ds']
        
        # Read processed data
        s3_hook = S3Hook(aws_conn_id='aws_default')
        csv_data = s3_hook.read_key(
            key=f"processed/orders/{execution_date}.csv",
            bucket_name='data-lake'
        )
        df = pd.read_csv(pd.io.common.StringIO(csv_data))
        
        # Load to Snowflake
        loader = SnowflakeLoader(...)
        loader.merge_dataframe(df, 'fact_orders', ['order_id'])
        
        return f"Loaded {len(df)} orders to warehouse"
    
    extract_task = PythonOperator(
        task_id='extract_orders',
        python_callable=extract_orders,
    )
    
    transform_task = PythonOperator(
        task_id='transform_orders',
        python_callable=transform_orders,
    )
    
    load_task = PythonOperator(
        task_id='load_to_warehouse',
        python_callable=load_to_warehouse,
    )
    
    extract_task >> transform_task >> load_task
```

## Slowly Changing Dimensions (SCD)

Track how dimension data changes over time:

```sql
-- SCD Type 2: Keep history with valid dates
CREATE TABLE dim_customers (
    customer_sk BIGINT PRIMARY KEY,        -- Surrogate key
    customer_id BIGINT NOT NULL,            -- Natural key
    name VARCHAR(255),
    email VARCHAR(255),
    segment VARCHAR(50),
    valid_date DATE NOT NULL,
    expiration_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    UNIQUE(customer_id, valid_date)
);

-- Insert new version when customer changes
INSERT INTO dim_customers (customer_id, name, email, segment, valid_date)
SELECT 
    s.customer_id,
    s.name,
    s.email,
    s.segment,
    CURRENT_DATE
FROM staging_customers s
LEFT JOIN dim_customers d ON s.customer_id = d.customer_id AND d.is_current = TRUE
WHERE d.customer_sk IS NULL  -- New customer
   OR (d.name <> s.name OR d.email <> s.email OR d.segment <> s.segment);  -- Changed

-- Expire old version
UPDATE dim_customers d
SET expiration_date = CURRENT_DATE - 1,
    is_current = FALSE
FROM staging_customers s
WHERE d.customer_id = s.customer_id 
  AND d.is_current = TRUE
  AND (d.name <> s.name OR d.email <> s.email OR d.segment <> s.segment);
```

## What works

- Use staging tables. Never transform data directly in production tables. Stage, validate, then load.
- Make pipelines idempotent. Running the same DAG twice should produce the same result.
- Validate early, validate often. Catch data quality issues in staging, not in the warehouse.
- Partition large tables. Load data by partition to enable fast replacement and pruning.
- Monitor data freshness. Alert when tables have not been updated within SLA.
- Document lineage. Track which source tables feed which warehouse tables.
- Test the transform logic. Unit test business logic just like application code.

## Common Mistakes

- No data validation. Bad data silently corrupts reports and dashboards.
- Transforming in production. Running UPDATE statements directly on the warehouse is risky and hard to rollback.
- No incremental loading. Full refreshes of large tables take hours and waste resources.
- Missing SLA monitoring. Stakeholders do not know the pipeline failed until they see stale dashboards.
- Hard-coded credentials. Use connection managers (Airflow, AWS Secrets Manager) instead.
- No retry logic. Transient network failures should not fail the entire pipeline.

## Variants

- ELT (Extract, Load, Transform): Load raw data to the warehouse first, then transform with SQL (dbt, Snowflake). Simpler for SQL-native teams.
- Reverse ETL: Push warehouse data back to operational systems (CRM, marketing tools)
- Zero-ETL: Direct query federation without moving data (BigQuery Federated Queries, Snowflake External Tables)
- Change Data Capture (CDC): Real-time extraction using database logs instead of batch polling

## FAQ

**Q: Should I use ETL or ELT?**
Use ETL when the reshaping is complex (Python, external APIs) or when you need to cleanse data before it reaches the warehouse. Use ELT when the reshaping is SQL-based and your warehouse is capable enough to handle it (Snowflake, BigQuery, Redshift).

**Q: How do I handle late-arriving data?**
Implement a "late arriving data" process that reprocesses past partitions when data arrives after the initial load. Or use streaming ingestion that handles out-of-order events.

**Q: How do I backfill historical data?**
Run your pipeline in a loop over historical date ranges, or use a parameterized DAG that accepts a date range and processes it in chunks.

**Q: What is the difference between a data lake and a data warehouse?**
A data lake stores raw, unprocessed data in files (S3, GCS) with schema-on-read. A data warehouse stores structured, processed data in tables with schema-on-write. ETL typically moves data from sources → lake → warehouse.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.

## Conclusion

ETL pipelines are the backbone of business intelligence and analytics. By extracting data reliably, transforming it with validation, and loading it efficiently, you create a trustworthy data foundation for reporting, dashboards, and machine learning.

