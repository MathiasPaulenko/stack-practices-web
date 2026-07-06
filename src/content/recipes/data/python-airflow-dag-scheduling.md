---
contentType: recipes
slug: python-airflow-dag-scheduling
title: "Schedule and Monitor DAGs with Apache Airflow"
description: "How to define, schedule, and monitor Directed Acyclic Graphs in Apache Airflow with operators, sensors, XCom, and task dependencies."
metaDescription: "Define, schedule, and monitor DAGs in Apache Airflow. Use operators, sensors, XCom, task dependencies, and catchup for reliable data pipeline orchestration."
difficulty: advanced
topics:
  - data
tags:
  - data
  - python
  - airflow
  - scheduling
  - dag
  - orchestration
  - recipe
relatedResources:
  - /recipes/data/python-pandas-etl-pipeline
  - /recipes/data/python-spark-groupby-aggregation
  - /recipes/data/python-dbt-model-transformations
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Define, schedule, and monitor DAGs in Apache Airflow. Use operators, sensors, XCom, task dependencies, and catchup for reliable data pipeline orchestration."
  keywords:
    - data
    - python
    - airflow
    - scheduling
    - dag
    - orchestration
    - recipe
---

## Overview

Apache Airflow orchestrates data pipelines as Directed Acyclic Graphs (DAGs). Each task in a DAG is an operator that performs a unit of work — running a Python function, executing SQL, triggering a Spark job, or sensing for a file. Airflow schedules DAGs on a cron or interval basis, retries failed tasks, and provides a UI for monitoring pipeline state. The solution below covers DAG definition, scheduling, task dependencies, sensors, XCom for inter-task communication, and production patterns.

## When to Use

- Orchestrating multi-step data pipelines with dependencies between tasks
- Scheduling batch jobs on a cron-like schedule with retry logic
- Pipelines that need monitoring, alerting, and a visual execution history
- Workflows with conditional branching (run task B only if task A succeeds)
- Data pipelines with sensors (wait for file arrival, external service, time)

## When NOT to Use

- Real-time/streaming pipelines — use Flink, Spark Streaming, or Kafka Streams
- Simple cron jobs without dependencies — a crontab entry is simpler
- Long-running services — Airflow is for batch workflows, not daemons
- CI/CD pipelines — use GitHub Actions, Jenkins, or GitLab CI

## Solution

### Basic DAG definition

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "data-team",
    "depends_on_past": False,
    "start_date": datetime(2025, 1, 1),
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}

dag = DAG(
    "etl_daily_pipeline",
    default_args=default_args,
    description="Daily ETL pipeline for orders data",
    schedule_interval="0 2 * * *",  # Daily at 2 AM
    catchup=False,
    tags=["etl", "daily"],
)

def extract(**kwargs):
    import pandas as pd
    df = pd.read_csv("/data/raw/orders.csv")
    kwargs["ti"].xcom_push("row_count", len(df))
    return df.to_json()

def transform(**kwargs):
    import pandas as pd
    ti = kwargs["ti"]
    raw_json = ti.xcom_pull(task_ids="extract")
    df = pd.read_json(raw_json)
    df["order_date"] = pd.to_datetime(df["order_date"])
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["amount"])
    ti.xcom_push("row_count", len(df))
    return df.to_json()

def load(**kwargs):
    import pandas as pd
    ti = kwargs["ti"]
    transformed_json = ti.xcom_pull(task_ids="transform")
    df = pd.read_json(transformed_json)
    df.to_parquet("/data/processed/orders.parquet", index=False)
    print(f"Loaded {len(df)} rows")

extract_task = PythonOperator(
    task_id="extract",
    python_callable=extract,
    dag=dag,
)

transform_task = PythonOperator(
    task_id="transform",
    python_callable=transform,
    dag=dag,
)

load_task = PythonOperator(
    task_id="load",
    python_callable=load,
    dag=dag,
)

extract_task >> transform_task >> load_task
```

### Task dependencies

```python
# Chain: extract >> transform >> load
extract_task >> transform_task >> load_task

# Parallel branches
extract_task >> [transform_task, validate_task] >> load_task

# Mixed dependencies
[task_a, task_b] >> task_c
task_c >> [task_d, task_e, task_f]

# Using set_downstream / set_upstream
extract_task.set_downstream(transform_task)
transform_task.set_downstream(load_task)

# Bitshift operators (equivalent)
extract_task >> transform_task >> load_task
```

### Sensors for waiting on conditions

```python
from airflow.sensors.filesystem import FileSensor
from airflow.sensors.date_time import DateTimeSensor
from airflow.sensors.python import PythonSensor

# Wait for a file to appear
wait_for_file = FileSensor(
    task_id="wait_for_file",
    filepath="/data/raw/orders.csv",
    poke_interval=60,  # Check every 60 seconds
    timeout=60 * 60,   # Give up after 1 hour
    mode="poke",
    dag=dag,
)

# Wait until a specific time
wait_until = DateTimeSensor(
    task_id="wait_until_3am",
    target_time="03:00",
    poke_interval=60,
    mode="reschedule",  # Free up worker slot between pokes
    dag=dag,
)

# Custom sensor with Python
def check_api_ready():
    import requests
    response = requests.get("https://api.example.com/health")
    return response.status_code == 200

wait_for_api = PythonSensor(
    task_id="wait_for_api",
    python_callable=check_api_ready,
    poke_interval=30,
    timeout=300,
    mode="poke",
    dag=dag,
)

wait_for_file >> extract_task
```

### Conditional branching

```python
from airflow.operators.python import BranchPythonOperator

def check_data_quality(**kwargs):
    ti = kwargs["ti"]
    row_count = ti.xcom_pull(task_ids="extract", key="row_count")
    if row_count > 1000:
        return "transform_full"
    else:
        return "transform_sample"

branch_task = BranchPythonOperator(
    task_id="check_data_quality",
    python_callable=check_data_quality,
    dag=dag,
)

transform_full = PythonOperator(
    task_id="transform_full",
    python_callable=transform,
    dag=dag,
)

transform_sample = PythonOperator(
    task_id="transform_sample",
    python_callable=lambda **kwargs: print("Sampling data"),
    dag=dag,
)

extract_task >> branch_task
branch_task >> [transform_full, transform_sample]
```

### TaskFlow API (decorator syntax)

```python
from airflow.decorators import dag, task

@dag(
    schedule_interval="0 2 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    default_args={"owner": "data-team", "retries": 2},
    tags=["etl"],
)
def etl_pipeline():

    @task
    def extract():
        import pandas as pd
        df = pd.read_csv("/data/raw/orders.csv")
        return df.to_dict("records")

    @task
    def transform(records):
        import pandas as pd
        df = pd.DataFrame(records)
        df["order_date"] = pd.to_datetime(df["order_date"])
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
        return df.dropna(subset=["amount"]).to_dict("records")

    @task
    def load(records):
        import pandas as pd
        df = pd.DataFrame(records)
        df.to_parquet("/data/processed/orders.parquet", index=False)
        print(f"Loaded {len(df)} rows")

    load(transform(extract()))

etl_pipeline_dag = etl_pipeline()
```

TaskFlow automatically handles XCom serialization — return values are passed to downstream tasks without manual `xcom_push`/`xcom_pull`.

### Using TaskGroup for organization

```python
from airflow.utils.task_group import TaskGroup

with dag:
    with TaskGroup("processing_group") as processing:
        task_1 = PythonOperator(
            task_id="clean_data",
            python_callable=clean_data,
        )
        task_2 = PythonOperator(
            task_id="validate_data",
            python_callable=validate_data,
        )
        task_3 = PythonOperator(
            task_id="enrich_data",
            python_callable=enrich_data,
        )
        task_1 >> task_2 >> task_3

    with TaskGroup("loading_group") as loading:
        load_parquet = PythonOperator(
            task_id="load_parquet",
            python_callable=load_parquet,
        )
        load_bq = PythonOperator(
            task_id="load_bigquery",
            python_callable=load_bigquery,
        )

    processing >> loading
```

### Catchup and backfill

```python
dag = DAG(
    "backfill_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    start_date=datetime(2025, 1, 1),
    catchup=True,  # Run missed intervals since start_date
    max_active_runs=1,  # Only one run at a time
)
```

### Dynamic task mapping

```python
from airflow.decorators import task, dag

@dag(schedule_interval="@daily", start_date=datetime(2025, 1, 1), catchup=False)
def dynamic_dag():

    @task
    def get_files():
        from pathlib import Path
        return [str(f) for f in Path("/data/raw").glob("*.csv")]

    @task
    def process_file(filepath):
        import pandas as pd
        df = pd.read_csv(filepath)
        print(f"Processed {filepath}: {len(df)} rows")
        return filepath

    files = get_files()
    process_file.expand(filepath=files)

dynamic_dag_instance = dynamic_dag()
```

## Variants

### Using KubernetesPodOperator

```python
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator

run_spark = KubernetesPodOperator(
    task_id="run_spark_job",
    image="my-spark:latest",
    cmds=["spark-submit"],
    arguments=["--master", "k8s://https://kubernetes:443", "/app/job.py"],
    namespace="airflow",
    name="spark-job",
    get_logs=True,
    dag=dag,
)
```

### Using DockerOperator

```python
from airflow.providers.docker.operators.docker import DockerOperator

run_etl = DockerOperator(
    task_id="run_etl_container",
    image="my-etl:latest",
    command="python /app/etl.py --date {{ ds }}",
    docker_url="unix://var/run/docker.sock",
    network_mode="bridge",
    mounts=["/data:/data"],
    dag=dag,
)
```

### Callbacks for success/failure

```python
def on_failure_callback(context):
    """Send alert on task failure."""
    task_instance = context["task_instance"]
    exception = context.get("exception")
    print(f"Task {task_instance.task_id} failed: {exception}")

def on_success_callback(context):
    """Log success metrics."""
    task_instance = context["task_instance"]
    print(f"Task {task_instance.task_id} succeeded")

default_args = {
    "on_failure_callback": on_failure_callback,
    "on_success_callback": on_success_callback,
}
```

## Best Practices

- Set `catchup=False` for new DAGs — prevents accidental backfill of months of runs
- Use `mode="reschedule"` for sensors with long timeouts — frees worker slots between pokes
- Keep tasks idempotent — re-running a task for the same date should produce the same result
- Use `max_active_runs=1` for pipelines that can't overlap — prevents concurrent runs
- Push small data via XCom — for large data, write to a file/storage and pass the path
- Use TaskFlow API for new DAGs — cleaner syntax, automatic XCom handling
- Tag DAGs — enables filtering in the Airflow UI
- Set `retries` and `retry_delay` — transient failures are common in data pipelines

## Common Mistakes

- **Using `@daily` without `catchup=False`**: Airflow runs every missed day since `start_date`, potentially launching hundreds of runs.
- **Passing large data through XCom**: XCom stores data in the metadata database. For DataFrames, write to a file and pass the path.
- **Non-idempotent tasks**: re-running a task appends duplicate data. Always overwrite or upsert.
- **Using `PythonOperator` for everything**: use specialized operators (BashOperator, DockerOperator, KubernetesPodOperator) for non-Python work.
- **Not setting `start_date` correctly**: `start_date` should be static, not `datetime.now()`. Dynamic start dates cause issues with scheduler.

## FAQ

### What is a DAG in Airflow?

A Directed Acyclic Graph — a collection of tasks with dependencies, where data flows in one direction and there are no cycles. Each DAG has a schedule, start date, and default arguments.

### What is XCom?

Cross-communication — a mechanism for tasks to exchange small pieces of data. Tasks push values with `xcom_push` and pull them with `xcom_pull`. TaskFlow API handles this automatically via return values.

### Should I use `poke` or `reschedule` mode for sensors?

Use `poke` for short waits (under a few minutes) — the sensor holds a worker slot. Use `reschedule` for long waits (hours) — the sensor releases the slot between pokes.

### How do I handle timezone-aware scheduling?

Set `timezone` in `default_args` or use `pendulum`:

```python
import pendulum

dag = DAG(
    "tz_aware_dag",
    start_date=pendulum.datetime(2025, 1, 1, tz="America/New_York"),
    schedule_interval="0 2 * * *",
    catchup=False,
)
```

### What is the difference between `schedule_interval` and `timetable`?

`schedule_interval` accepts cron expressions, `@daily`, `@hourly`, or `timedelta`. `timetable` is a more flexible custom scheduling mechanism introduced in Airflow 2.2+ for complex schedules.
