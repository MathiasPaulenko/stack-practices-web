---
contentType: patterns
slug: etl-extract-transform-load-pattern
title: "Patrón ETL Extract-Transform-Load"
description: "Cómo construir ETL pipelines con extract, transform, y load stages. Cubre staging tables, incremental extraction, idempotent loads, y orchestration."
metaDescription: "Construye ETL pipelines con extract, transform, y load stages. Aprende staging tables, incremental extraction, idempotent loads, orchestration, y scheduling."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - etl
  - pipeline
  - batch
  - orchestration
  - pattern
category: architectural
relatedResources:
  - /patterns/cdc-change-data-capture-pattern
  - /patterns/idempotent-load-pattern
  - /patterns/data-lineage-tracking-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye ETL pipelines con extract, transform, y load stages. Aprende staging tables, incremental extraction, idempotent loads, orchestration, y scheduling."
  keywords:
    - data
    - etl
    - pipeline
    - batch
    - orchestration
    - pattern
---

## Overview

ETL (Extract, Transform, Load) es el classic data integration pattern. Data es extracted desde source systems, transformed para fit el target schema, y loaded en un data warehouse o data lake. El extract stage pulea raw data en un staging area, el transform stage lo cleanéa y reshapéa, y el load stage writeéa el result al destination. Cada stage es un separate step con clear boundaries, haciendo el pipeline debuggable y restartable. ETL es batch-oriented — corre on a schedule (hourly, daily) en vez de processar events en real time.

## When to Use

- Periodic data integration desde múltiples sources en un warehouse
- Batch reporting y analytics que no necesitan real-time data
- Data migrations entre systems con schema transformations
- Regulatory reporting que requiere un consistent snapshot at a point in time
- Scenarios donde los source systems no pueden handlear continuous query load

## When NOT to Use

- Real-time analytics — usá CDC (Change Data Capture) o streaming en su lugar
- Simple data copies sin transformation — usá ELT o direct replication
- Sources que cambian continuamente y requieren sub-minute freshness
- Cuando el transform step necesita el full power del target warehouse (usá ELT)

## Solution

### Python ETL pipeline con staging

```python
# etl_pipeline.py — ETL pipeline con extract, transform, load stages
import pandas as pd
from datetime import datetime, timedelta
import logging
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ETLPipeline:
    def __init__(self, source_conn, staging_conn, warehouse_conn):
        self.source = source_conn
        self.staging = staging_conn
        self.warehouse = warehouse_conn
        self.run_id = hashlib.md5(str(datetime.now()).encode()).hexdigest()[:8]

    def run(self, source_table, target_table, since=None):
        logger.info(f"ETL run {self.run_id} started for {source_table} -> {target_table}")

        try:
            # Stage 1: Extract
            raw_data = self.extract(source_table, since)

            # Stage 2: Transform
            transformed_data = self.transform(raw_data)

            # Stage 3: Load
            self.load(transformed_data, target_table)

            logger.info(f"ETL run {self.run_id} completed successfully")
            return {"run_id": self.run_id, "rows_processed": len(transformed_data)}

        except Exception as e:
            logger.error(f"ETL run {self.run_id} failed: {e}")
            raise

    def extract(self, table, since):
        logger.info(f"Extracting from {table} since {since}")
        query = f"SELECT * FROM {table}"
        if since:
            query += f" WHERE updated_at >= '{since}'"

        df = pd.read_sql(query, self.source)
        df['_etl_run_id'] = self.run_id
        df['_etl_extracted_at'] = datetime.now()

        # Write a staging
        staging_table = f"stg_{table}_{self.run_id}"
        df.to_sql(staging_table, self.staging, index=False, if_exists='replace')
        logger.info(f"Extracted {len(df)} rows to {staging_table}")

        return df

    def transform(self, df):
        logger.info(f"Transforming {len(df)} rows")

        # Remove duplicates
        df = df.drop_duplicates(subset=['id'])

        # Normalize email
        if 'email' in df.columns:
            df['email'] = df['email'].str.lower().str.strip()

        # Parse dates
        if 'created_at' in df.columns:
            df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')

        # Add derived columns
        df['is_active'] = df.get('status') == 'active'
        df['full_name'] = df.get('first_name', '') + ' ' + df.get('last_name', '')

        # Drop ETL metadata columns
        df = df.drop(columns=['_etl_run_id', '_etl_extracted_at'], errors='ignore')

        # Drop rows con null IDs
        df = df.dropna(subset=['id'])

        logger.info(f"Transformed to {len(df)} rows")
        return df

    def load(self, df, target_table):
        logger.info(f"Loading {len(df)} rows to {target_table}")

        # Upsert: delete existing después insert
        with self.warehouse.cursor() as cur:
            if not df.empty:
                ids = tuple(df['id'].tolist())
                cur.execute(f"DELETE FROM {target_table} WHERE id IN %s", (ids,))

        df.to_sql(target_table, self.warehouse, index=False, if_exists='append')
        logger.info(f"Loaded {len(df)} rows to {target_table}")
```

### SQL-based ETL con staging tables

```sql
-- etl_customers.sql — SQL ETL con staging tables

-- Stage 1: Extract — copiá raw data a staging
CREATE TABLE stg_customers AS
SELECT
    id,
    email,
    first_name,
    last_name,
    status,
    created_at,
    updated_at,
    CURRENT_TIMESTAMP AS _extracted_at,
    'daily_batch' AS _source
FROM source_db.customers
WHERE updated_at >= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY);

-- Stage 2: Transform — cleanéa y reshapéa
CREATE TABLE tmp_customers AS
SELECT
    id,
    LOWER(TRIM(email)) AS email,
    TRIM(first_name) AS first_name,
    TRIM(last_name) AS last_name,
    status,
    CASE WHEN status = 'active' THEN TRUE ELSE FALSE END AS is_active,
    CONCAT(TRIM(first_name), ' ', TRIM(last_name)) AS full_name,
    COALESCE(created_at, _extracted_at) AS created_at,
    updated_at
FROM stg_customers
WHERE id IS NOT NULL
  AND email IS NOT NULL;

-- Stage 3: Load — upsert a warehouse
MERGE INTO warehouse.customers AS target
USING tmp_customers AS source
ON target.id = source.id
WHEN MATCHED THEN
    UPDATE SET
        email = source.email,
        first_name = source.first_name,
        last_name = source.last_name,
        status = source.status,
        is_active = source.is_active,
        full_name = source.full_name,
        updated_at = source.updated_at
WHEN NOT MATCHED THEN
    INSERT (id, email, first_name, last_name, status, is_active, full_name, created_at, updated_at)
    VALUES (source.id, source.email, source.first_name, source.last_name,
            source.status, source.is_active, source.full_name, source.created_at, source.updated_at);

-- Cleanup
DROP TABLE stg_customers;
DROP TABLE tmp_customers;
```

### Incremental extraction con watermarks

```python
# incremental_etl.py — incremental extraction usando high-water mark
import json
from datetime import datetime
from pathlib import Path

class IncrementalETL:
    def __init__(self, watermark_file="watermarks.json"):
        self.watermark_file = Path(watermark_file)
        self.watermarks = self._load_watermarks()

    def _load_watermarks(self):
        if self.watermark_file.exists():
            return json.loads(self.watermark_file.read_text())
        return {}

    def _save_watermarks(self):
        self.watermark_file.write_text(json.dumps(self.watermarks, indent=2, default=str))

    def get_watermark(self, table):
        return self.watermarks.get(table)

    def update_watermark(self, table, value):
        self.watermarks[table] = value
        self._save_watermarks()

    def extract_incremental(self, conn, table, timestamp_col="updated_at"):
        last_run = self.get_watermark(table)

        query = f"SELECT * FROM {table}"
        if last_run:
            query += f" WHERE {timestamp_col} > '{last_run}' ORDER BY {timestamp_col}"

        df = pd.read_sql(query, conn)

        if not df.empty:
            new_watermark = df[timestamp_col].max()
            self.update_watermark(table, str(new_watermark))

        return df
```

### Airflow DAG para ETL orchestration

```python
# etl_dag.py — Airflow DAG para ETL pipeline orchestration
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'etl_customers_daily',
    default_args=default_args,
    description='Daily ETL for customers table',
    schedule_interval='0 2 * * *',
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=['etl', 'daily'],
)

def extract(**context):
    from etl.pipeline import ETLPipeline
    pipeline = ETLPipeline(source_conn, staging_conn, warehouse_conn)
    result = pipeline.extract('customers', since=context['ds'])
    context['ti'].xcom_push(key='row_count', value=len(result))
    return len(result)

def transform(**context):
    from etl.pipeline import ETLPipeline
    pipeline = ETLPipeline(source_conn, staging_conn, warehouse_conn)
    result = pipeline.transform_staging(context['run_id'])
    return len(result)

def load(**context):
    from etl.pipeline import ETLPipeline
    pipeline = ETLPipeline(source_conn, staging_conn, warehouse_conn)
    pipeline.load_to_warehouse('customers', context['run_id'])

def validate(**context):
    from etl.validators import validate_load
    count = context['ti'].xcom_pull(task_ids='extract', key='row_count')
    validate_load('warehouse.customers', expected_min_rows=count * 0.95)

extract_task = PythonOperator(
    task_id='extract',
    python_callable=extract,
    provide_context=True,
    dag=dag,
)

transform_task = PythonOperator(
    task_id='transform',
    python_callable=transform,
    provide_context=True,
    dag=dag,
)

load_task = PythonOperator(
    task_id='load',
    python_callable=load,
    provide_context=True,
    dag=dag,
)

validate_task = PythonOperator(
    task_id='validate',
    python_callable=validate,
    provide_context=True,
    dag=dag,
)

cleanup_task = BashOperator(
    task_id='cleanup',
    bash_command='rm -rf /tmp/etl_{{ run_id }}',
    dag=dag,
)

extract_task >> transform_task >> load_task >> validate_task >> cleanup_task
```

### Java ETL con Spring Batch

```java
// CustomerEtlJob.java — Spring Batch ETL job
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.EnableBatchProcessing;
import org.springframework.batch.core.configuration.annotation.JobBuilderFactory;
import org.springframework.batch.core.configuration.annotation.StepBuilderFactory;
import org.springframework.batch.item.database.BeanPropertyItemSqlParameterSourceProvider;
import org.springframework.batch.item.database.JdbcBatchItemWriter;
import org.springframework.batch.item.database.JdbcCursorItemReader;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration
@EnableBatchProcessing
public class CustomerEtlJob {

    @Autowired
    private JobBuilderFactory jobBuilderFactory;

    @Autowired
    private StepBuilderFactory stepBuilderFactory;

    @Autowired
    private DataSource dataSource;

    @Bean
    public JdbcCursorItemReader<Customer> reader() {
        JdbcCursorItemReader<Customer> reader = new JdbcCursorItemReader<>();
        reader.setDataSource(dataSource);
        reader.setSql("SELECT id, email, first_name, last_name, status FROM source.customers WHERE updated_at >= ?");
        reader.setRowMapper(new CustomerRowMapper());
        return reader;
    }

    @Bean
    public ItemProcessor<Customer, Customer> processor() {
        return customer -> {
            customer.setEmail(customer.getEmail().toLowerCase().trim());
            customer.setFirstName(customer.getFirstName().trim());
            customer.setLastName(customer.getLastName().trim());
            customer.setFullName(customer.getFirstName() + " " + customer.getLastName());
            customer.setActive("active".equals(customer.getStatus()));
            return customer;
        };
    }

    @Bean
    public JdbcBatchItemWriter<Customer> writer() {
        JdbcBatchItemWriter<Customer> writer = new JdbcBatchItemWriter<>();
        writer.setDataSource(dataSource);
        writer.setSql("""
            MERGE INTO warehouse.customers target
            USING (VALUES (:id, :email, :firstName, :lastName, :status, :active, :fullName)) source
            ON target.id = source.id
            WHEN MATCHED THEN UPDATE SET email = source.email, first_name = source.first_name,
                last_name = source.last_name, status = source.status, is_active = source.active,
                full_name = source.full_name
            WHEN NOT MATCHED THEN INSERT (id, email, first_name, last_name, status, is_active, full_name)
                VALUES (source.id, source.email, source.first_name, source.last_name, source.status, source.active, source.full_name)
            """);
        writer.setItemSqlParameterSourceProvider(new BeanPropertyItemSqlParameterSourceProvider<>());
        return writer;
    }

    @Bean
    public Step etlStep() {
        return stepBuilderFactory.get("etlStep")
                .<Customer, Customer>chunk(1000)
                .reader(reader())
                .processor(processor())
                .writer(writer())
                .build();
    }

    @Bean
    public Job etlJob() {
        return jobBuilderFactory.get("etlCustomersJob")
                .start(etlStep())
                .build();
    }
}
```

## Variants

### ELT (Extract-Load-Transform)

```sql
-- ELT: loadéá raw data primero, transformá en warehouse
-- Step 1: Extract + Load raw
COPY raw.customers FROM 's3://bucket/customers/2026-07-05/' FORMAT PARQUET;

-- Step 2: Transform en warehouse (usando warehouse compute)
CREATE TABLE warehouse.customers AS
SELECT
    id,
    LOWER(TRIM(email)) AS email,
    TRIM(first_name) AS first_name,
    TRIM(last_name) AS last_name,
    status,
    status = 'active' AS is_active
FROM raw.customers
WHERE id IS NOT NULL;
```

### Parallel extraction desde múltiples sources

```python
# parallel_etl.py — extract desde múltiples sources concurrently
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd

class ParallelETL:
    def __init__(self, sources):
        self.sources = sources  # dict of {name: connection}

    def extract_all(self, tables_config):
        results = {}

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {}
            for source_name, tables in tables_config.items():
                for table in tables:
                    future = executor.submit(self._extract_from, source_name, table)
                    futures[future] = (source_name, table)

            for future in as_completed(futures):
                source_name, table = futures[future]
                try:
                    results[f"{source_name}.{table}"] = future.result()
                except Exception as e:
                    logger.error(f"Failed to extract {source_name}.{table}: {e}")
                    results[f"{source_name}.{table}"] = None

        return results

    def _extract_from(self, source_name, table):
        conn = self.sources[source_name]
        return pd.read_sql(f"SELECT * FROM {table}", conn)
```

## Best Practices

- Usá staging tables — nunca transformés in-place en el source; siempre extractá a un staging area primero
- Hacé pipelines idempotent — correr el mismo pipeline dos veces debería producir el mismo result
- Usá incremental extraction — extractá solo changed rows usando un watermark column
- Loggeá cada stage — row counts en cada step, timing, errors, y el run ID para debugging
- Validá después del load — checkeá row counts, null checks, y referential integrity
- Handleá failures gracefully — retry con backoff, alert on failure, y allow restart desde el failed step
- Usá un orchestrator — Airflow, Dagster, o Prefect para scheduling, retries, y dependencies
- Mantené transformations separate — no mezcles extract logic con transform logic en una function

## Common Mistakes

- **No staging area**: transformar directamente en el source. Si el transform falla, el source data está corrupted.
- **Full table extraction every run**: extractar millones de rows cuando solo unos pocos hundreds cambiaron. Usá incremental extraction.
- **No error handling**: si el load falla después del transform, data se pierde. Usá transactions o staging tables.
- **Hardcoded timestamps**: usar `CURRENT_DATE - 1` en vez de un watermark table. Missed o duplicated rows on re-runs.
- **No validation**: loadear data sin checkear row counts o nulls. Bad data silently entra al warehouse.

## FAQ

### ¿Cuál es la diferencia entre ETL y ELT?

ETL transforma data antes de loadearla en el warehouse. ELT loadea raw data primero y transforma adentro del warehouse usando su compute power. ELT es preferred cuando el warehouse es powerful (Snowflake, BigQuery) y el transform es SQL-based.

### ¿Qué es una staging table?

Una temporary table donde raw extracted data se storea antes del transformation. Isola el source del transform logic y provee un checkpoint para debugging y restarts.

### ¿Cómo hago ETL pipelines idempotent?

Usá upserts (MERGE) en vez de inserts. Deleteá y re-insertá rows para la misma partition. Usá un run ID para trackear qué rows pertenecen a qué run. Correr el pipeline dos veces debería producir el mismo final state.

### ¿Qué es incremental extraction?

Extractar solo rows que cambiaron desde el last run, usando un timestamp column (e.g., `updated_at`) como high-water mark. Esto reduce el load en el source y speed up el pipeline.

### ¿Debería usar Airflow para ETL?

Sí, si tenés múltiples pipelines con dependencies, schedules, y retry requirements. Airflow provee scheduling, dependency management, retries, y monitoring out of the box. Para simple single-pipeline cases, un cron job con un script puede suffice.
