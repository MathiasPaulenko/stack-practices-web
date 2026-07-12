---



contentType: guides
slug: complete-guide-apache-airflow
title: "Apache Airflow: DAGs, Operators, Scheduling"
description: "Master Apache Airflow: DAGs, operators, sensors, XCom, scheduling, backfilling, connections, variables, and production patterns for data pipeline orchestration."
metaDescription: "Master Apache Airflow: DAGs, operators, sensors, XCom, scheduling, backfilling, connections, variables, and production patterns for data pipeline orchestration."
difficulty: advanced
topics:
  - data
tags:
  - guide
  - apache-airflow
  - airflow
  - dag
  - orchestration
  - scheduling
  - data-engineering
relatedResources:
  - /guides/complete-guide-data-pipeline-architecture
  - /guides/complete-guide-dbt-data-transformations
  - /guides/complete-guide-data-quality
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master Apache Airflow: DAGs, operators, sensors, XCom, scheduling, backfilling, connections, variables, and production patterns for data pipeline orchestration."
  keywords:
    - apache airflow
    - airflow dag
    - operators
    - sensors
    - xcom
    - scheduling
    - pipeline orchestration



---

## Introduction

Apache Airflow is a platform for orchestrating data pipelines through directed acyclic graphs (DAGs). You define tasks and their dependencies in Python, and Airflow schedules, executes, and monitors them. The following guide covers DAGs, operators, sensors, XCom for data passing, scheduling, backfilling, connections, variables, and production patterns.

## Core Concepts

```
DAG: Directed Acyclic Graph — a collection of tasks with dependencies
Task: A unit of work (run a script, call an API, execute SQL)
Operator: A template for creating tasks (BashOperator, PythonOperator, etc.)
Task Instance: A specific run of a task at a specific time
DAG Run: A specific execution of a DAG at a specific time
Scheduler: Process that decides when to run tasks
Executor: Component that executes tasks (Sequential, Local, Celery, Kubernetes)
Worker: Process that runs task instances
XCom: Cross-task communication (small data passing between tasks)
Hook: Interface to external systems (S3Hook, SnowflakeHook, PostgresHook)
Connection: Stored credentials for external systems
Variable: Key-value configuration stored in metadata DB
```

## DAG Basics

### Simple DAG

```python
# dags/simple_dag.py
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    "owner": "data-team",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": False,
    "email_on_retry": False,
}

dag = DAG(
    "simple_etl",
    default_args=default_args,
    description="Simple ETL pipeline",
    schedule="0 2 * * *",  # Daily at 2 AM
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["etl", "daily"],
)

extract = BashOperator(
    task_id="extract",
    bash_command="python /opt/etl/extract.py --date {{ ds }}",
    dag=dag,
)

def transform(**context):
    import pandas as pd
    date = context["ds"]
    df = pd.read_csv(f"/data/raw/{date}/orders.csv")
    df["total"] = df["subtotal"] + df["tax"]
    df.to_csv(f"/data/processed/{date}/orders.csv", index=False)

transform_task = PythonOperator(
    task_id="transform",
    python_callable=transform,
    dag=dag,
)

load = BashOperator(
    task_id="load",
    bash_command="python /opt/etl/load.py --date {{ ds }}",
    dag=dag,
)

extract >> transform_task >> load
```

### TaskFlow API (Airflow 2.x)

```python
# dags/taskflow_dag.py — Modern TaskFlow API
from airflow.decorators import dag, task
from datetime import datetime

@dag(
    schedule="0 2 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["etl", "taskflow"],
)
def orders_pipeline():

    @task
    def extract(date: str) -> dict:
        import requests
        resp = requests.get(f"https://api.example.com/orders?date={date}")
        return resp.json()

    @task
    def transform(raw_data: dict) -> list[dict]:
        orders = []
        for order in raw_data["orders"]:
            orders.append({
                "order_id": order["id"],
                "total": order["subtotal"] + order["tax"] + order["shipping"],
                "status": order["status"],
            })
        return orders

    @task
    def load(orders: list[dict], date: str) -> None:
        from airflow.providers.postgres.hooks.postgres import PostgresHook
        hook = PostgresHook(postgres_conn_id="warehouse")
        for order in orders:
            hook.run(
                "INSERT INTO orders (order_id, total, status, load_date) VALUES (%s, %s, %s, %s) "
                "ON CONFLICT (order_id) DO UPDATE SET total=EXCLUDED.total, status=EXCLUDED.status",
                parameters=(order["order_id"], order["total"], order["status"], date),
            )

    raw = extract("{{ ds }}")
    cleaned = transform(raw)
    load(cleaned, "{{ ds }}")

dag = orders_pipeline()
```

## Operators

### Common operators

```python
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.operators.email import EmailOperator
from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator
from airflow.providers.amazon.aws.operators.s3 import S3CopyObjectOperator
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.operators.dummy import DummyOperator

# Bash: run shell commands
run_script = BashOperator(
    task_id="run_script",
    bash_command="python /opt/jobs/process.py --date {{ ds }} --env prod",
)

# Python: call Python functions
process_data = PythonOperator(
    task_id="process_data",
    python_callable=my_function,
    op_kwargs={"date": "{{ ds }}", "batch_size": 1000},
)

# Snowflake: execute SQL
run_sql = SnowflakeOperator(
    task_id="run_sql",
    sql="MERGE INTO orders USING staging_orders ON orders.id = staging_orders.id WHEN MATCHED THEN UPDATE ...",
    snowflake_conn_id="snowflake_prod",
)

# Spark: submit Spark jobs
spark_job = SparkSubmitOperator(
    task_id="spark_job",
    conn_id="spark_default",
    application="/opt/jobs/transform.py",
    application_args=["--input", "s3://data/{{ ds }}/"],
    conf={"spark.executor.memory": "4g", "spark.executor.cores": "2"},
)

# Email: send notifications
notify = EmailOperator(
    task_id="notify",
    to="data-team@company.com",
    subject="Pipeline completed for {{ ds }}",
    html_content="<p>Daily ETL completed successfully.</p>",
)

# Dummy: no-op for grouping
start = DummyOperator(task_id="start")
end = DummyOperator(task_id="end")
```

### Branching

```python
from airflow.operators.python import BranchPythonOperator
from airflow.operators.dummy import DummyOperator

def check_date(**context):
    date = context["ds"]
    day_of_week = datetime.strptime(date, "%Y-%m-%d").weekday()
    if day_of_week == 6:  # Sunday
        return "weekly_aggregation"
    return "daily_aggregation"

branch = BranchPythonOperator(
    task_id="branch",
    python_callable=check_date,
    dag=dag,
)

daily = BashOperator(task_id="daily_aggregation", bash_command="...", dag=dag)
weekly = BashOperator(task_id="weekly_aggregation", bash_command="...", dag=dag)
join = DummyOperator(task_id="join", trigger_rule="none_failed", dag=dag)

branch >> [daily, weekly] >> join
```

## Sensors

```python
from airflow.sensors.filesystem import FileSensor
from airflow.sensors.s3 import S3KeySensor
from airflow.sensors.sql import SqlSensor
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.sensors.date_time import DateTimeSensor

# Wait for a file to appear
wait_for_file = FileSensor(
    task_id="wait_for_file",
    filepath="/data/raw/{{ ds }}/orders.csv",
    poke_interval=60,  # Check every 60 seconds
    timeout=3600,      # Give up after 1 hour
    mode="poke",       # or "reschedule" to free worker slot
    dag=dag,
)

# Wait for S3 object
wait_for_s3 = S3KeySensor(
    task_id="wait_for_s3",
    bucket_key="raw/{{ ds }}/orders.parquet",
    bucket_name="my-data-bucket",
    aws_conn_id="aws_default",
    poke_interval=300,
    timeout=7200,
    dag=dag,
)

# Wait for SQL condition
wait_for_data = SqlSensor(
    task_id="wait_for_data",
    sql="SELECT COUNT(*) FROM staging WHERE load_date = '{{ ds }}' AND status = 'ready'",
    conn_id="warehouse",
    poke_interval=60,
    timeout=3600,
    dag=dag,
)

# Wait for another DAG to complete
wait_for_upstream = ExternalTaskSensor(
    task_id="wait_for_upstream",
    external_dag_id="ingestion_pipeline",
    external_task_id="load_to_warehouse",
    check_existence=True,
    poke_interval=300,
    timeout=7200,
    dag=dag,
)
```

## XCom (Cross-Task Communication)

```python
# XCom passes small data between tasks. For large data, use external storage.

@task
def extract():
    # Small data: return directly (passed via XCom)
    return {"total_orders": 1500, "total_revenue": 45000.00}

@task
def validate(stats):
    if stats["total_orders"] < 1:
        raise ValueError("No orders found")
    return stats

@task
def report(stats):
    print(f"Orders: {stats['total_orders']}, Revenue: ${stats['total_revenue']}")

# For large data, use external storage (S3, GCS)
@task
def extract_large():
    import pandas as pd
    df = pd.read_sql("SELECT * FROM orders WHERE date = '{{ ds }}'", conn)
    path = f"/tmp/orders_{{{{ ds }}}}.parquet"
    df.to_parquet(path)
    return path  # Pass the path, not the data

@task
def transform_large(path):
    import pandas as pd
    df = pd.read_parquet(path)
    # Transform...
    return path
```

## Scheduling and Backfilling

```python
# Schedule presets
dag = DAG(
    "scheduled_pipeline",
    schedule="@daily",      # Daily at midnight
    # schedule="@hourly",   # Every hour
    # schedule="@weekly",   # Weekly on Sunday
    # schedule="@monthly",  # Monthly on the 1st
    # schedule="0 2 * * 1-5",  # 2 AM on weekdays (cron)
    # schedule="*/15 * * * *",  # Every 15 minutes
    # schedule=None,        # Manual trigger only
    start_date=datetime(2026, 1, 1),
    catchup=True,           # Backfill missing runs
    max_active_runs=1,      # Only one run at a time
)
```

### Backfilling

```bash
# Backfill a date range
airflow dags backfill orders_pipeline \
    --start-date 2026-01-01 \
    --end-date 2026-01-31

# Backfill with specific run ID
airflow dags run orders_pipeline \
    --start-date 2026-06-01
```

## Connections and Variables

```python
# Connections: stored in Airflow metadata DB or environment variables
# Set via UI: Admin → Connections
# Or via CLI: airflow connections add ...

from airflow.providers.postgres.hooks.postgres import PostgresHook

# Use connection in a task
def load_data(**context):
    hook = PostgresHook(postgres_conn_id="warehouse_prod")
    conn = hook.get_conn()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO ... VALUES (%s)", (context["ds"],))
    conn.commit()

# Variables: key-value config stored in metadata DB
from airflow.models import Variable

def get_config():
    batch_size = Variable.get("batch_size", default_var=1000)
    api_url = Variable.get("api_url")
    return {"batch_size": int(batch_size), "api_url": api_url}

# Environment variable fallback
# AIRFLOW_VAR_API_URL=https://api.example.com
api_url = Variable.get("api_url")  # Falls back to AIRFLOW_VAR_API_URL
```

## Production Patterns

### Dynamic DAG generation

```python
# Generate DAGs from config
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import yaml

with open("/opt/airflow/configs/pipelines.yaml") as f:
    pipelines = yaml.safe_load(f)

for pipeline in pipelines:
    dag_id = f"pipeline_{pipeline['name']}"

    def create_dag(pipeline):
        dag = DAG(
            dag_id=f"pipeline_{pipeline['name']}",
            schedule=pipeline["schedule"],
            start_date=datetime(2026, 1, 1),
            catchup=False,
        )

        for step in pipeline["steps"]:
            task = PythonOperator(
                task_id=step["name"],
                python_callable=globals()[step["function"]],
                dag=dag,
            )

        return dag

    globals()[dag_id] = create_dag(pipeline)
```

### Error handling and retries

```python
from airflow.operators.python import PythonOperator
from airflow.exceptions import AirflowFailException

def process_with_retry(**context):
    import requests
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            resp = requests.get(f"https://api.example.com/data?date={context['ds']}")
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            if attempt == max_attempts - 1:
                # Don't retry — fail immediately
                raise AirflowFailException(f"API failed after {max_attempts} attempts: {e}")
            # Airflow will retry based on retries in default_args
            raise Exception(f"Attempt {attempt + 1} failed: {e}")

task = PythonOperator(
    task_id="process_api",
    python_callable=process_with_retry,
    retries=3,
    retry_delay=timedelta(minutes=5),
    retry_exponential_backoff=True,
    max_retry_delay=timedelta(minutes=30),
    dag=dag,
)
```

### SLA monitoring

```python
from datetime import timedelta

dag = DAG(
    "sla_monitored",
    schedule="0 2 * * *",
    start_date=datetime(2026, 1, 1),
    sla_miss_callback=sla_miss_alert,
    default_args={"sla": timedelta(hours=1)},  # SLA: 1 hour from scheduled time
)

def sla_miss_alert(dag, task_list, blocking_task_list, slas, blocking_tis):
    """Called when a task misses its SLA."""
    for task in task_list:
        print(f"SLA missed for {task.task_id} in DAG {dag.dag_id}")
```

## Best Practices


- For a deeper guide, see [Schedule and Monitor DAGs with Apache Airflow](/recipes/python-airflow-dag-scheduling/).

- Use TaskFlow API for new DAGs — cleaner, less boilerplate than traditional operators
- Set `catchup=False` for new DAGs — avoid accidental backfills of years of data
- Use `max_active_runs=1` for pipelines that shouldn't overlap — prevents race conditions
- Use sensors with `mode="reschedule"` for long waits — frees worker slots
- Pass large data via external storage (S3, GCS), not XCom — XCom is for small metadata
- Use `retries` and `retry_delay` in `default_args` — transient failures are common
- Use `retry_exponential_backoff=True` — avoid hammering failing APIs
- Store credentials in Connections, not in code — use Airflow UI or CLI
- Use Variables for environment-specific config — not hardcoded values
- Tag your DAGs — `tags=["etl", "daily", "prod"]` for filtering in UI
- Keep DAG files under 1000 lines — split complex pipelines into multiple DAGs
- Use `ExternalTaskSensor` for cross-DAG dependencies — don't duplicate upstream logic

## Common Mistakes

- **Using `datetime.now()` as `start_date`**: DAGs never start because the scheduler looks for the next run after start_date. Use a fixed date.
- **Setting `catchup=True` accidentally**: Airflow tries to run every missed run since start_date. Use `catchup=False` for new DAGs.
- **Passing large data through XCom**: XCom stores data in the metadata DB. Use S3/GCS paths instead.
- **Not setting `max_active_runs`**: overlapping runs cause race conditions and duplicate data.
- **Hardcoding credentials**: use Connections and Variables. Never put passwords in DAG files.
- **Using `PythonOperator` for everything**: use specialized operators (SnowflakeOperator, SparkSubmitOperator) for better logging and error handling.

## FAQ

### What is a DAG in Airflow?

A Directed Acyclic Graph — a collection of tasks with defined dependencies. Tasks execute in order based on the dependency graph. "Acyclic" means no circular dependencies.

### What is the difference between `schedule` and `start_date`?

`start_date` is when the DAG's first run is eligible to execute. `schedule` determines how often it runs after that. The scheduler only creates runs for dates >= `start_date` at the specified interval.

### What is XCom?

Cross-task communication. Tasks can push and pull small data (a few KB) through XCom. For larger data, write to external storage (S3, GCS) and pass the file path via XCom.

### What is the difference between `poke` and `reschedule` sensor modes?

In `poke` mode, the sensor occupies a worker slot while waiting. In `reschedule` mode, the sensor releases the worker slot between checks. Use `reschedule` for long waits (>1 minute) to avoid blocking workers.

### Should I use TaskFlow API or traditional operators?

TaskFlow API (Airflow 2.x) is cleaner and handles XCom automatically through function return values. Use it for new DAGs. Traditional operators are still needed for specialized cases like SparkSubmitOperator or SnowflakeOperator.
