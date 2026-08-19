---
contentType: recipes
slug: python-airflow-dag-scheduling
title: "Programar y Monitorear DAGs con Apache Airflow"
description: "Definí, programá y monitoreá DAGs de Airflow con operators, sensors, XCom, dependencias de tareas y la TaskFlow API."
metaDescription: "Definí, programá y monitoreá DAGs en Apache Airflow. Usá operators, sensors, XCom, dependencias de tareas y la TaskFlow API para orquestación confiable de pipelines."
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
  metaDescription: "Definí, programá y monitoreá DAGs en Apache Airflow. Usá operators, sensors, XCom, dependencias de tareas y la TaskFlow API para orquestación confiable de pipelines."
  keywords:
    - data
    - python
    - airflow
    - scheduling
    - dag
    - orchestration
---

## Visión General

Apache Airflow orquesta pipelines de datos como Directed Acyclic Graphs (DAGs).
Cada tarea es un operator que corre una función Python, ejecuta SQL, dispara un
job o espera una condición. Airflow programa DAGs con cron o intervalos, reintenta
tareas fallidas y ofrece una UI para monitorear el estado del pipeline.

Esta receta cubre definición de DAGs, scheduling, dependencias de tareas,
sensors, XCom y la TaskFlow API. Para una guía más profunda, consultá
[Apache Airflow: la guía completa](/es/guides/complete-guide-apache-airflow/).

## Cuándo Usar

Usá Airflow cuando:

- Orquestás pipelines de datos multi-step con dependencias entre tareas.
- Necesitás batch jobs con schedule tipo cron y reintentos automáticos.
- Los pipelines necesitan monitoreo, alerting e historial visual de ejecución.
- Los workflows incluyen branching condicional o sensors que esperan archivos,
  APIs o un horario.

### Cuándo evitar

- Pipelines real-time o streaming. Usá Flink, Spark Streaming o Kafka Streams.
- Cron jobs simples sin dependencias. Una entrada de crontab es más simple.
- Servicios long-running. Airflow es para workflows batch, no daemons.
- Pipelines de CI/CD. Usá GitHub Actions, Jenkins o GitLab CI.

## Solución

### Definición básica de DAG

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
    schedule="0 2 * * *",  # diario a las 2 AM
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

### Dependencias de tareas

```python
# cadena lineal
extract_task >> transform_task >> load_task

# ramas paralelas
extract_task >> [transform_task, validate_task] >> load_task

# múltiples tareas upstream
[task_a, task_b] >> task_c

# set upstream o downstream de forma explícita
transform_task.set_upstream(extract_task)
transform_task.set_downstream(load_task)
```

### Sensors para esperar condiciones

```python
from airflow.sensors.filesystem import FileSensor
from airflow.sensors.date_time import DateTimeSensor
from airflow.sensors.python import PythonSensor

wait_for_file = FileSensor(
    task_id="wait_for_file",
    filepath="/data/raw/orders.csv",
    poke_interval=60,  # revisa cada 60 segundos
    timeout=60 * 60,   # falla después de 1 hora
    mode="poke",
)

wait_until = DateTimeSensor(
    task_id="wait_until_3am",
    target_time="03:00",
    poke_interval=60,
    mode="reschedule",  # libera el slot de worker entre chequeos
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
)

wait_for_file >> extract_task
```

### Branching condicional

```python
from airflow.operators.python import BranchPythonOperator

def choose_transform(**kwargs):
    row_count = kwargs["ti"].xcom_pull(task_ids="extract", key="row_count")
    return "transform_full" if row_count > 1000 else "transform_sample"

branch = BranchPythonOperator(
    task_id="choose_transform",
    python_callable=choose_transform,
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
def dynamic_dag():

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

dynamic_dag()
```

### Callbacks para éxito o falla

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

## Explicación

Un DAG es una colección de tareas con dependencias dirigidas y sin ciclos. El
scheduler de Airflow lee el archivo del DAG, crea un `DagRun` para cada intervalo
y encola las tareas en el orden correcto. Un executor toma las tareas encoladas y
las ejecuta.

XCom permite compartir datos chicos entre tareas. Una tarea empuja un valor con
`xcom_push` o retornándolo; las tareas downstream lo leen con `xcom_pull`. La
TaskFlow API hace esto automáticamente con los valores de retorno. Para datos
grandes, escribí en un archivo o almacenamiento de objetos y pasá el path en
lugar de empujar todo el payload.

Los sensors esperan una condición externa. `mode="poke"` mantiene un slot de
worker mientras revisa; `mode="reschedule"` lo libera entre chequeos. Usá
`reschedule` para esperas largas.

`catchup=True` hace que Airflow ejecute todos los intervalos perdidos entre
`start_date` y ahora; `catchup=False` arranca desde el presente.
`max_active_runs` controla cuántos `DagRun` pueden correr al mismo tiempo.

## Variantes

| Operator | Caso de uso | Notas |
| --- | --- | --- |
| `PythonOperator` | Funciones Python | Ideal para lógica custom chica |
| `BashOperator` | Scripts o comandos shell | Pegamento rápido |
| `DockerOperator` | Tareas en contenedores | Dependencias aisladas |
| `KubernetesPodOperator` | Jobs en un cluster de Kubernetes | Escalable y con control de recursos |
| `BranchPythonOperator` | Branching condicional | Devuelve el `task_id` a ejecutar |

## Mejores Prácticas

- Seteá `catchup=False` en DAGs nuevos para no backfillearmes accidentalmente
  meses de ejecuciones.
- Usá `schedule` en lugar del deprecado `schedule_interval`.
- Usá `mode="reschedule"` en sensors con timeouts largos para liberar slots de
  worker.
- Mantené las tareas idempotentes. Re-ejecutar la misma fecha debería dar el
  mismo resultado.
- Usá `max_active_runs=1` para pipelines que no pueden solaparse.
- Empujá datos chicos por XCom; para datos grandes, escribí en archivo o storage
  y pasá el path.
- Preferí la TaskFlow API para DAGs nuevos: es más limpia y maneja XCom sola.
- Etiquetá los DAGs para filtrarlos fácil en la UI.
- Seteá `retries` y `retry_delay` para fallas transitorias como timeouts de API.

## Errores Comunes

- Usar `@daily` sin `catchup=False`, lo que puede lanzar cientos de backfills.
- Pasar DataFrames grandes por XCom. La metadata DB no es un data store.
- Escribir tareas no idempotentes que agregan datos duplicados al reintentar.
- Usar `PythonOperator` para todo en lugar de operators especializados.
- Usar un `start_date` dinámico como `datetime.now()`. Mantenelo estático.

## Preguntas Frecuentes

### ¿Qué es un DAG en Airflow?

Un Directed Acyclic Graph: un conjunto de tareas con dependencias, donde los
datos fluyen en una dirección y no hay ciclos. Cada DAG tiene un schedule, una
fecha de inicio y argumentos por defecto.

### ¿Qué es XCom?

Cross-communication. Las tareas empujan valores con `xcom_push` o retornándolos,
y los leen con `xcom_pull`. La TaskFlow API pasa los valores de retorno
automáticamente.

### ¿Debería usar `poke` o `reschedule` en sensors?

Usá `poke` para esperas cortas de pocos minutos. Usá `reschedule` para esperas
largas así el slot de worker se libera entre chequeos.

### ¿Cómo manejo scheduling con zona horaria?

Usá `pendulum` para setear una fecha de inicio con zona horaria:

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

### ¿Cuál es la diferencia entre `schedule` y `timetable`?

`schedule` acepta expresiones cron, `@daily`, `@hourly` o `timedelta`.
`timetable` es un mecanismo de scheduling custom en Airflow 2.2+ para horarios
complejos que no entran en una regla cron simple.
