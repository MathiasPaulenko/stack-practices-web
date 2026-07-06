---
contentType: guides
slug: complete-guide-apache-airflow
title: "Guía Completa de Apache Airflow: DAGs, Operadores, Scheduling"
description: "Dominá Apache Airflow: DAGs, operadores, sensores, XCom, scheduling, backfilling, connections, variables y patrones de producción para orquestación de pipelines."
metaDescription: "Dominá Apache Airflow: DAGs, operadores, sensores, XCom, scheduling, backfilling, connections, variables y patrones de producción para orquestación de pipelines."
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
  - /guides/data/complete-guide-data-pipeline-architecture
  - /guides/data/complete-guide-dbt-data-transformations
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Dominá Apache Airflow: DAGs, operadores, sensores, XCom, scheduling, backfilling, connections, variables y patrones de producción para orquestación de pipelines."
  keywords:
    - apache airflow
    - airflow dag
    - operators
    - sensors
    - xcom
    - scheduling
    - pipeline orchestration
---

## Introducción

Apache Airflow es una platform para orquestar data pipelines through directed acyclic graphs (DAGs). Definís tasks y sus dependencies en Python, y Airflow schedulea, ejecuta y monitorea. Esta guía cubre DAGs, operadores, sensores, XCom para data passing, scheduling, backfilling, connections, variables y production patterns.

## Core Concepts

```
DAG: Directed Acyclic Graph — una collection de tasks con dependencies
Task: Una unit de work (run un script, call una API, execute SQL)
Operator: Un template para crear tasks (BashOperator, PythonOperator, etc.)
Task Instance: Un run específico de un task en un time específico
DAG Run: Una execution específica de un DAG en un time específico
Scheduler: Process que decide cuándo run tasks
Executor: Component que ejecuta tasks (Sequential, Local, Celery, Kubernetes)
Worker: Process que run task instances
XCom: Cross-task communication (small data passing entre tasks)
Hook: Interface a external systems (S3Hook, SnowflakeHook, PostgresHook)
Connection: Stored credentials para external systems
Variable: Key-value configuration stored en metadata DB
```

## DAG Basics

### DAG simple

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
    schedule="0 2 * * *",  # Daily a las 2 AM
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

### Operadores comunes

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

# Dummy: no-op para grouping
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

# Esperá que un file aparezca
wait_for_file = FileSensor(
    task_id="wait_for_file",
    filepath="/data/raw/{{ ds }}/orders.csv",
    poke_interval=60,  # Checkeá cada 60 seconds
    timeout=3600,      # Give up después de 1 hour
    mode="poke",       # o "reschedule" para free worker slot
    dag=dag,
)

# Esperá S3 object
wait_for_s3 = S3KeySensor(
    task_id="wait_for_s3",
    bucket_key="raw/{{ ds }}/orders.parquet",
    bucket_name="my-data-bucket",
    aws_conn_id="aws_default",
    poke_interval=300,
    timeout=7200,
    dag=dag,
)

# Esperá SQL condition
wait_for_data = SqlSensor(
    task_id="wait_for_data",
    sql="SELECT COUNT(*) FROM staging WHERE load_date = '{{ ds }}' AND status = 'ready'",
    conn_id="warehouse",
    poke_interval=60,
    timeout=3600,
    dag=dag,
)

# Esperá que otro DAG complete
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
# XCom pasa small data entre tasks. Para large data, usá external storage.

@task
def extract():
    # Small data: returná directly (passed via XCom)
    return {"total_orders": 1500, "total_revenue": 45000.00}

@task
def validate(stats):
    if stats["total_orders"] < 1:
        raise ValueError("No orders found")
    return stats

@task
def report(stats):
    print(f"Orders: {stats['total_orders']}, Revenue: ${stats['total_revenue']}")

# Para large data, usá external storage (S3, GCS)
@task
def extract_large():
    import pandas as pd
    df = pd.read_sql("SELECT * FROM orders WHERE date = '{{ ds }}'", conn)
    path = f"/tmp/orders_{{{{ ds }}}}.parquet"
    df.to_parquet(path)
    return path  # Pasá el path, no la data

@task
def transform_large(path):
    import pandas as pd
    df = pd.read_parquet(path)
    # Transform...
    return path
```

## Scheduling y Backfilling

```python
# Schedule presets
dag = DAG(
    "scheduled_pipeline",
    schedule="@daily",      # Daily a midnight
    # schedule="@hourly",   # Cada hour
    # schedule="@weekly",   # Weekly en Sunday
    # schedule="@monthly",  # Monthly en el 1st
    # schedule="0 2 * * 1-5",  # 2 AM en weekdays (cron)
    # schedule="*/15 * * * *",  # Cada 15 minutes
    # schedule=None,        # Manual trigger only
    start_date=datetime(2026, 1, 1),
    catchup=True,           # Backfill missing runs
    max_active_runs=1,      # Solo un run a la vez
)
```

### Backfilling

```bash
# Backfilléa un date range
airflow dags backfill orders_pipeline \
    --start-date 2026-01-01 \
    --end-date 2026-01-31

# Backfilléa con specific run ID
airflow dags run orders_pipeline \
    --start-date 2026-06-01
```

## Connections y Variables

```python
# Connections: stored en Airflow metadata DB o environment variables
# Seteá via UI: Admin → Connections
# O via CLI: airflow connections add ...

from airflow.providers.postgres.hooks.postgres import PostgresHook

# Usá connection en un task
def load_data(**context):
    hook = PostgresHook(postgres_conn_id="warehouse_prod")
    conn = hook.get_conn()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO ... VALUES (%s)", (context["ds"],))
    conn.commit()

# Variables: key-value config stored en metadata DB
from airflow.models import Variable

def get_config():
    batch_size = Variable.get("batch_size", default_var=1000)
    api_url = Variable.get("api_url")
    return {"batch_size": int(batch_size), "api_url": api_url}

# Environment variable fallback
# AIRFLOW_VAR_API_URL=https://api.example.com
api_url = Variable.get("api_url")  # Falls back a AIRFLOW_VAR_API_URL
```

## Production Patterns

### Dynamic DAG generation

```python
# Generá DAGs desde config
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

### Error handling y retries

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
                # No retries — failá immediately
                raise AirflowFailException(f"API failed after {max_attempts} attempts: {e}")
            # Airflow va a retry basado en retries en default_args
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
    default_args={"sla": timedelta(hours=1)},  # SLA: 1 hour desde scheduled time
)

def sla_miss_alert(dag, task_list, blocking_task_list, slas, blocking_tis):
    """Called cuando un task misséa su SLA."""
    for task in task_list:
        print(f"SLA missed for {task.task_id} in DAG {dag.dag_id}")
```

## Best Practices

- Usá TaskFlow API para new DAGs — cleaner, less boilerplate que traditional operators
- Seteá `catchup=False` para new DAGs — evitá accidental backfills de years de data
- Usá `max_active_runs=1` para pipelines que no deberían overlap — previene race conditions
- Usá sensors con `mode="reschedule"` para long waits — freea worker slots
- Pasá large data via external storage (S3, GCS), no XCom — XCom es para small metadata
- Usá `retries` y `retry_delay` en `default_args` — transient failures son common
- Usá `retry_exponential_backoff=True` — evitá hammering failing APIs
- Storeá credentials en Connections, no en code — usá Airflow UI o CLI
- Usá Variables para environment-specific config — no hardcoded values
- Taggeá tus DAGs — `tags=["etl", "daily", "prod"]` para filtering en UI
- Mantené DAG files under 1000 lines — spliteá complex pipelines en multiple DAGs
- Usá `ExternalTaskSensor` para cross-DAG dependencies — no dupliques upstream logic

## Common Mistakes

- **Usar `datetime.now()` como `start_date`**: DAGs nunca start porque el scheduler busca el next run después de start_date. Usá un fixed date.
- **Setear `catchup=True` accidentalmente**: Airflow trata de run every missed run desde start_date. Usá `catchup=False` para new DAGs.
- **Pasar large data through XCom**: XCom storea data en el metadata DB. Usá S3/GCS paths en vez.
- **No setear `max_active_runs`**: overlapping runs causan race conditions y duplicate data.
- **Hardcoding credentials**: usá Connections y Variables. Nunca pongas passwords en DAG files.
- **Usar `PythonOperator` para todo**: usá specialized operators (SnowflakeOperator, SparkSubmitOperator) para better logging y error handling.

## FAQ

### ¿Qué es un DAG en Airflow?

Un Directed Acyclic Graph — una collection de tasks con defined dependencies. Tasks ejecutan en order basado en el dependency graph. "Acyclic" significa no circular dependencies.

### ¿Cuál es la diferencia entre `schedule` y `start_date`?

`start_date` es cuándo el DAG's first run es eligible para execute. `schedule` determina cuán seguido run después de eso. El scheduler solo crea runs para dates >= `start_date` al specified interval.

### ¿Qué es XCom?

Cross-task communication. Tasks pueden push y pull small data (unos KB) through XCom. Para larger data, write a external storage (S3, GCS) y pasá el file path via XCom.

### ¿Cuál es la diferencia entre `poke` y `reschedule` sensor modes?

En `poke` mode, el sensor occupy un worker slot mientras waiting. En `reschedule` mode, el sensor releasea el worker slot entre checks. Usá `reschedule` para long waits (>1 minute) para evitar blocking workers.

### ¿Debería usar TaskFlow API o traditional operators?

TaskFlow API (Airflow 2.x) es cleaner y handlea XCom automáticamente through function return values. Usalo para new DAGs. Traditional operators son still needed para specialized cases como SparkSubmitOperator o SnowflakeOperator.
