---
contentType: recipes
slug: python-airflow-dag-scheduling
title: "Programar y Monitorear DAGs con Apache Airflow"
description: "Cómo definir, programar y monitorear Directed Acyclic Graphs en Apache Airflow con operators, sensors, XCom y dependencias de tareas."
metaDescription: "Define, programa y monitorea DAGs en Apache Airflow. Usa operators, sensors, XCom, dependencias de tareas y catchup para orquestación confiable de pipelines."
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
  metaDescription: "Define, programa y monitorea DAGs en Apache Airflow. Usa operators, sensors, XCom, dependencias de tareas y catchup para orquestación confiable de pipelines."
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

Apache Airflow orquesta pipelines de datos como Directed Acyclic Graphs (DAGs). Cada tarea en un DAG es un operator que performs una unidad de trabajo — correr una función Python, ejecutar SQL, disparar un Spark job, o sensar un archivo. Airflow programa DAGs en base a cron o intervalos, reintenta tareas fallidas y provee una UI para monitorear el estado del pipeline. Lo siguiente cubre definición de DAGs, scheduling, dependencias de tareas, sensors, XCom para comunicación inter-task y patrones de producción.

## When to Use

- Orquestar pipelines de datos multi-step con dependencias entre tareas
- Programar batch jobs en un schedule tipo cron con lógica de retry
- Pipelines que necesitan monitoreo, alerting e historial visual de ejecución
- Workflows con branching condicional (correr task B solo si task A tiene éxito)
- Pipelines de datos con sensors (esperar arrival de archivo, servicio externo, hora)

## When NOT to Use

- Pipelines real-time/streaming — usa Flink, Spark Streaming o Kafka Streams
- Cron jobs simples sin dependencias — un entry de crontab es más simple
- Servicios long-running — Airflow es para workflows batch, no daemons
- Pipelines de CI/CD — usa GitHub Actions, Jenkins o GitLab CI

## Solution

### Definición básica de DAG

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
    schedule_interval="0 2 * * *",  # Diario a las 2 AM
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

### Dependencias de tareas

```python
# Cadena: extract >> transform >> load
extract_task >> transform_task >> load_task

# Branches paralelos
extract_task >> [transform_task, validate_task] >> load_task

# Dependencias mixtas
[task_a, task_b] >> task_c
task_c >> [task_d, task_e, task_f]

# Usando set_downstream / set_upstream
extract_task.set_downstream(transform_task)
transform_task.set_downstream(load_task)

# Operadores bitshift (equivalente)
extract_task >> transform_task >> load_task
```

### Sensors para esperar condiciones

```python
from airflow.sensors.filesystem import FileSensor
from airflow.sensors.date_time import DateTimeSensor
from airflow.sensors.python import PythonSensor

# Esperar que aparezca un archivo
wait_for_file = FileSensor(
    task_id="wait_for_file",
    filepath="/data/raw/orders.csv",
    poke_interval=60,  # Chequear cada 60 segundos
    timeout=60 * 60,   # Rendirse después de 1 hora
    mode="poke",
    dag=dag,
)

# Esperar hasta una hora específica
wait_until = DateTimeSensor(
    task_id="wait_until_3am",
    target_time="03:00",
    poke_interval=60,
    mode="reschedule",  # Liberar worker slot entre pokes
    dag=dag,
)

# Sensor custom con Python
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

### Branching condicional

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

### TaskFlow API (sintaxis con decoradores)

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

TaskFlow maneja automáticamente la serialización de XCom — los return values se pasan a tareas downstream sin `xcom_push`/`xcom_pull` manual.

### Usar TaskGroup para organización

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

### Catchup y backfill

```python
dag = DAG(
    "backfill_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    start_date=datetime(2025, 1, 1),
    catchup=True,  # Correr intervals perdidos desde start_date
    max_active_runs=1,  # Solo un run a la vez
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

### Usar KubernetesPodOperator

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

### Usar DockerOperator

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

### Callbacks para éxito/fallo

```python
def on_failure_callback(context):
    """Enviar alerta en fallo de tarea."""
    task_instance = context["task_instance"]
    exception = context.get("exception")
    print(f"Task {task_instance.task_id} failed: {exception}")

def on_success_callback(context):
    """Loggear métricas de éxito."""
    task_instance = context["task_instance"]
    print(f"Task {task_instance.task_id} succeeded")

default_args = {
    "on_failure_callback": on_failure_callback,
    "on_success_callback": on_success_callback,
}
```

## Best Practices

- Setea `catchup=False` para nuevos DAGs — previene backfill accidental de meses de runs
- Usa `mode="reschedule"` para sensors con timeouts largos — libera worker slots entre pokes
- Mantén las tareas idempotentes — re-correr una tarea para la misma fecha debería producir el mismo resultado
- Usa `max_active_runs=1` para pipelines que no pueden superponerse — previene runs concurrentes
- Pushea data pequeña vía XCom — para data grande, escribe a un archivo/storage y pasa el path
- Usa TaskFlow API para nuevos DAGs — sintaxis más limpia, handling automático de XCom
- Taguea los DAGs — habilita filtrado en la UI de Airflow
- Setea `retries` y `retry_delay` — fallos transientes son comunes en pipelines de datos

## Common Mistakes

- **Usar `@daily` sin `catchup=False`**: Airflow corre cada día perdido desde `start_date`, potencialmente lanzando cientos de runs.
- **Pasar data grande por XCom**: XCom almacena data en la metadata database. Para DataFrames, escribe a un archivo y pasa el path.
- **Tareas no idempotentes**: re-correr una tarea appendea data duplicada. Siempre overwritea o upserta.
- **Usar `PythonOperator` para todo**: usa operators especializados (BashOperator, DockerOperator, KubernetesPodOperator) para trabajo non-Python.
- **No setear `start_date` correctamente**: `start_date` debería ser estático, no `datetime.now()`. Start dates dinámicos causan issues con el scheduler.

## FAQ

### ¿Qué es un DAG en Airflow?

Un Directed Acyclic Graph — una colección de tareas con dependencias, donde la data fluye en una dirección y no hay ciclos. Cada DAG tiene un schedule, start date y argumentos default.

### ¿Qué es XCom?

Cross-communication — un mecanismo para que las tareas intercambien pequeñas piezas de data. Las tareas pushean valores con `xcom_push` y los pullean con `xcom_pull`. TaskFlow API maneja esto automáticamente vía return values.

### ¿Debería usar modo `poke` o `reschedule` para sensors?

Usa `poke` para esperas cortas (menos de unos minutos) — el sensor mantiene un worker slot. Usa `reschedule` para esperas largas (horas) — el sensor libera el slot entre pokes.

### ¿Cómo manejo scheduling con timezone?

Setea `timezone` en `default_args` o usa `pendulum`:

```python
import pendulum

dag = DAG(
    "tz_aware_dag",
    start_date=pendulum.datetime(2025, 1, 1, tz="America/New_York"),
    schedule_interval="0 2 * * *",
    catchup=False,
)
```

### ¿Cuál es la diferencia entre `schedule_interval` y `timetable`?

`schedule_interval` acepta expresiones cron, `@daily`, `@hourly` o `timedelta`. `timetable` es un mecanismo de scheduling custom más flexible introducido en Airflow 2.2+ para schedules complejos.
