---
contentType: recipes
slug: python-airflow-dag-scheduling
title: "Schedule and Monitor DAGs with Apache Airflow"
description: "Define, schedule, and monitor Airflow DAGs with operators, sensors, XCom, task dependencies, and the TaskFlow API."
metaDescription: "Define, schedule, and monitor DAGs in Apache Airflow. Use operators, sensors, XCom, task dependencies, and the TaskFlow API for reliable data pipeline orchestration."
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
relatedResources:
  - /recipes/python-pandas-etl-pipeline
  - /recipes/python-spark-groupby-aggregation
  - /recipes/python-dbt-model-transformations
  - /recipes/cron-jobs
  - /recipes/python-celery-task-queue
  - /guides/complete-guide-apache-airflow
lastUpdated: "2026-08-19"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Define, schedule, and monitor DAGs in Apache Airflow. Use operators, sensors, XCom, task dependencies, and the TaskFlow API for reliable data pipeline orchestration."
  keywords:
    - data
    - python
    - airflow
    - scheduling
    - dag
    - orchestration
---

## Overview

Apache Airflow models data pipelines as Directed Acyclic Graphs (DAGs).
A task is an operator that does one job. It might run a Python function, execute
SQL, trigger a job, or wait on a sensor. Airflow schedules DAGs on a cron or interval, retries
failed tasks, and gives you a UI to monitor pipeline state.

This recipe shows how to build Airflow DAGs, schedule them, wire task
dependencies, use sensors, share data through XCom, and write cleaner pipelines
with the TaskFlow API. See the [Apache Airflow guide](/guides/complete-guide-apache-airflow/) for more.

## When to Use

Airflow is a good fit when you're wiring together multi-step pipelines where
tasks depend on each other.

- You want batch jobs on a cron-like schedule with built-in retries.
- Pipelines need monitoring, alerting, and a visual history of runs.
- Workflows include conditional branching or sensors that wait for files, APIs, or
  time.

### When to avoid

- Real-time or streaming pipelines. Use Flink, Spark Streaming, or Kafka Streams for those.
- Simple cron jobs without dependencies. A plain crontab entry is simpler.
- Long-running services. Airflow is for batch workflows, not for daemons.
- CI/CD pipelines. GitHub Actions, Jenkins, or GitLab CI are usually a better fit for those.

## Solution

### Basic DAG definition

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

with DAG(
    dag_id="etl_daily_pipeline",
    default_args={
        "owner": "data-team",
        "depends_on_past": False,
        "email_on_failure": False,
        "email_on_retry": False,
        "retries": 3,
        "retry_delay": timedelta(minutes=5),
    },
    start_date=datetime(2025, 1, 1),
    schedule="0 2 * * *",  # daily at 2 AM
    catchup=False,
    tags=["etl", "daily"],
) as dag:

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

    extract_task = PythonOperator(task_id="extract", python_callable=extract)
    transform_task = PythonOperator(task_id="transform", python_callable=transform)
    load_task = PythonOperator(task_id="load", python_callable=load)

    extract_task >> transform_task >> load_task
```

### Task dependencies

```python
# linear chain
extract_task >> transform_task >> load_task

# parallel branches
extract_task >> [transform_task, validate_task] >> load_task

# multiple upstream tasks
[task_a, task_b] >> task_c

# set upstream or downstream explicitly
transform_task.set_upstream(extract_task)
transform_task.set_downstream(load_task)
```

### Sensors for waiting on conditions

```python
from airflow.sensors.filesystem import FileSensor
from airflow.sensors.date_time import DateTimeSensor
from airflow.sensors.python import PythonSensor

wait_for_file = FileSensor(
    task_id="wait_for_file",
    filepath="/data/raw/orders.csv",
    poke_interval=60,  # check every 60 seconds
    timeout=60 * 60,   # fail after 1 hour
    mode="poke",
    dag=dag,
)

wait_until = DateTimeSensor(
    task_id="wait_until_3am",
    target_time="03:00",
    poke_interval=60,
    mode="reschedule",  # free the worker slot between pokes
    dag=dag,
)

def api_is_ready():
    import requests
    return requests.get("https://api.example.com/health").ok

wait_for_api = PythonSensor(
    task_id="wait_for_api",
    python_callable=api_is_ready,
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

def choose_transform(**kwargs):
    row_count = kwargs["ti"].xcom_pull(task_ids="extract", key="row_count")
    return "transform_full" if row_count > 1000 else "transform_sample"

def transform_full_fn(**kwargs):
    import pandas as pd
    ti = kwargs["ti"]
    raw_json = ti.xcom_pull(task_ids="extract")
    df = pd.read_json(raw_json)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["amount"])
    print(f"Full transform: {len(df)} rows")
    return df.to_json()

def transform_sample_fn(**kwargs):
    import pandas as pd
    ti = kwargs["ti"]
    raw_json = ti.xcom_pull(task_ids="extract")
    df = pd.read_json(raw_json)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["amount"]).head(100)
    print(f"Sample transform: {len(df)} rows")
    return df.to_json()

transform_full = PythonOperator(
    task_id="transform_full",
    python_callable=transform_full_fn,
    dag=dag,
)

transform_sample = PythonOperator(
    task_id="transform_sample",
    python_callable=transform_sample_fn,
    dag=dag,
)

branch = BranchPythonOperator(
    task_id="choose_transform",
    python_callable=choose_transform,
    dag=dag,
)

extract_task >> branch
branch >> [transform_full, transform_sample]
```

### TaskFlow API

```python
from airflow.decorators import dag, task

@dag(
    start_date=datetime(2025, 1, 1),
    schedule="0 2 * * *",
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

### Dynamic task mapping

```python
from airflow.decorators import dag, task

@dag(start_date=datetime(2025, 1, 1), schedule="@daily", catchup=False)
def process_many_files():

    @task
    def list_files():
        from pathlib import Path
        return [str(f) for f in Path("/data/raw").glob("*.csv")]

    @task
    def process_file(filepath):
        import pandas as pd
        df = pd.read_csv(filepath)
        print(f"Processed {filepath}: {len(df)} rows")
        return filepath

    files = list_files()
    process_file.expand(filepath=files)

many_files_dag = process_many_files()
```

### Callbacks for success or failure

```python
def on_failure_callback(context):
    ti = context["task_instance"]
    print(f"Task {ti.task_id} failed: {context.get('exception')}")

def on_success_callback(context):
    ti = context["task_instance"]
    print(f"Task {ti.task_id} succeeded")

with DAG(
    "monitored_pipeline",
    default_args={
        "on_failure_callback": on_failure_callback,
        "on_success_callback": on_success_callback,
    },
    schedule="@daily",
    start_date=datetime(2025, 1, 1),
    catchup=False,
) as dag:
    ...
```

## Explanation

A DAG is a collection of tasks with directed dependencies and no cycles.
The scheduler parses the DAG file, creates a `DagRun` for each schedule interval,
and queues the tasks. An executor picks up queued tasks and runs them.

XCom lets tasks share small bits of data. A task pushes a value with
`xcom_push` or by returning it; downstream tasks pull it with `xcom_pull`.
With TaskFlow, values move from one task to the next through plain Python return
values. For large data, write to a file or object storage and pass the path
instead of pushing the whole payload.

Sensors poll for an external condition. `mode="poke"` holds a worker slot while
checking; `mode="reschedule"` frees the slot between checks. For long waits, pick
`reschedule` mode.

`catchup=True` makes Airflow run every missed interval between `start_date` and
now; `catchup=False` starts from the present. `max_active_runs` controls how
many DagRuns can run at the same time.

## Variants

| Operator | Use case | Notes |
| --- | --- | --- |
| `PythonOperator` | Python functions | Best for small, custom logic |
| `BashOperator` | Shell scripts or commands | Quick glue code |
| `DockerOperator` | Containerized tasks | Isolated dependencies |
| `KubernetesPodOperator` | Jobs on a Kubernetes cluster | Scalable and resource-managed |
| `BranchPythonOperator` | Conditional branching | Returns the `task_id` to run next |

## Best Practices

- Set `catchup=False` for new DAGs so you don't accidentally backfill months of
  runs.
- Prefer `schedule` over the deprecated `schedule_interval`.
- Pick `mode="reschedule"` for sensors with long timeouts to free worker slots.
- Keep tasks idempotent. Re-running a task for the same date should give the same result.
- Set `max_active_runs=1` for pipelines where overlap isn't allowed.
- Push small data via XCom; for large data, write to a file or object storage and
  pass the path.
- Prefer the TaskFlow API for new DAGs — it's cleaner and handles XCom for you.
- Tag DAGs so filtering them in the UI is easier.
- Set `retries` and `retry_delay` for transient failures like API timeouts.

## Common Mistakes

- Running `@daily` without `catchup=False` can launch hundreds of backfill runs.
- Pushing large DataFrames via XCom. Don't push large data into the Airflow
  metadata database; it's for state, not storage.
- Writing non-idempotent tasks that append duplicate data on retry.
- Reaching for `PythonOperator` for everything instead of specialized operators.
- Writing `start_date=datetime.now()` or any other dynamic value; keep it
  static.

## FAQ

### What is a DAG in Airflow?

A DAG is a set of tasks tied together by dependencies, where data flows one way
and there are no cycles. Every DAG carries its own schedule, a fixed start date, and default arguments.

### What is XCom?

Cross-communication. Tasks push values with `xcom_push` or by returning them, and
pull values with `xcom_pull`. With TaskFlow, return values move automatically
without extra code.

### Should I use `poke` or `reschedule` mode for sensors?

Use `poke` for waits under a few minutes. For long waits, `reschedule` mode frees
the worker slot between checks.

### How do I handle timezone-aware scheduling?

Use `pendulum` to set a timezone-aware start date:

```python
import pendulum

with DAG(
    "tz_aware_dag",
    start_date=pendulum.datetime(2025, 1, 1, tz="America/New_York"),
    schedule="0 2 * * *",
    catchup=False,
) as dag:
    ...
```

### What is the difference between `schedule` and `timetable`?

`schedule` accepts cron expressions, `@daily`, `@hourly`, or `timedelta`.
For schedules too complex for a cron expression, Airflow 2.2+ lets you define a
custom `timetable`.
