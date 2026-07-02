---
contentType: recipes
slug: python-schedule-periodic-tasks
title: "Programa Tareas Periódicas en Python con APScheduler"
description: "Ejecuta jobs tipo cron en Python usando APScheduler. Cubre triggers de intervalo, cron y fecha, job stores y scheduling en background."
metaDescription: "Programa tareas periódicas en Python con APScheduler. Triggers de intervalo, cron y fecha, job stores persistentes, background schedulers y manejo de errores."
difficulty: intermediate
topics:
  - concurrency
  - devops
tags:
  - python
  - apscheduler
  - scheduling
  - cron
  - background-jobs
  - automation
relatedResources:
  - /recipes/concurrency/python-async-http-requests
  - /recipes/devops/docker-health-check-configuration
  - /guides/async-programming-guide
  - /patterns/background-job-pattern
  - /patterns/circuit-breaker-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Programa tareas periódicas en Python con APScheduler. Triggers de intervalo, cron y fecha, job stores persistentes, background schedulers y manejo de errores."
  keywords:
    - python apscheduler
    - python schedule periodic tasks
    - python cron jobs
    - apscheduler cron trigger
    - python background scheduler
    - python job scheduling
---

## Visión General

APScheduler (Advanced Python Scheduler) es una librería para programar jobs de Python para ejecutar en tiempos o intervalos específicos. Soporta scheduling tipo cron, ejecución basada en intervalos y triggers de fecha one-off. A diferencia de Celery, APScheduler se ejecuta in-process y no requiere un message broker. Esta recipe cubre los tres tipos de triggers, job stores persistentes y ejecución en background.

## Cuándo Usar

- Necesitas ejecutar tareas periódicamente (cleanup, refresh de caché, generación de reportes)
- Quieres scheduling tipo cron sin un daemon cron separado
- Necesitas programar tareas diferidas one-off
- Quieres scheduling in-process sin un message broker como Celery

## Solución

### Instalar APScheduler

```bash
pip install APScheduler
```

### Trigger de intervalo — ejecutar cada N segundos/minutos/horas

```python
from apscheduler.schedulers.background import BackgroundScheduler
import time

def cleanup_temp_files():
    print("Cleaning up temp files...")

def refresh_cache():
    print("Refreshing cache...")

scheduler = BackgroundScheduler()

# Ejecutar cada 30 segundos
scheduler.add_job(cleanup_temp_files, "interval", seconds=30, id="cleanup")

# Ejecutar cada 5 minutos
scheduler.add_job(refresh_cache, "interval", minutes=5, id="cache_refresh")

# Ejecutar cada 2 horas, empezando 10 segundos desde ahora
scheduler.add_job(refresh_cache, "interval", hours=2, next_run_time=time.time() + 10)

scheduler.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    scheduler.shutdown()
```

### Trigger cron — scheduling estilo cron

```python
from apscheduler.schedulers.background import BackgroundScheduler

def send_daily_report():
    print("Sending daily report...")

def weekly_backup():
    print("Running weekly backup...")

scheduler = BackgroundScheduler()

# Todos los días a las 9:00 AM
scheduler.add_job(send_daily_report, "cron", hour=9, minute=0, id="daily_report")

# Todos los lunes a las 2:00 AM
scheduler.add_job(weekly_backup, "cron", day_of_week="mon", hour=2, id="weekly_backup")

# Todos los días de semana a las 6:00 PM
scheduler.add_job(send_daily_report, "cron", day_of_week="mon-fri", hour=18, id="weekday_report")

# Primer día de cada mes a medianoche
scheduler.add_job(weekly_backup, "cron", day=1, hour=0, id="monthly_backup")

# Cada 15 de enero y julio al mediodía
scheduler.add_job(weekly_backup, "cron", month="1,7", day=15, hour=12, id="biannual_backup")

scheduler.start()
```

### Trigger de fecha — tarea programada one-off

```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

def send_reminder(email: str):
    print(f"Sending reminder to {email}")

scheduler = BackgroundScheduler()

# Programar 1 hora desde ahora
run_time = datetime.now() + timedelta(hours=1)
scheduler.add_job(send_reminder, "date", run_date=run_time, args=["user@example.com"], id="reminder_1")

scheduler.start()
```

### Pasar argumentos a jobs

```python
def process_order(order_id: int, priority: str = "normal"):
    print(f"Processing order {order_id} with priority {priority}")

# Args posicionales
scheduler.add_job(process_order, "interval", minutes=10, args=[12345], id="order_12345")

# Keyword args
scheduler.add_job(process_order, "interval", minutes=10, kwargs={"order_id": 12345, "priority": "high"}, id="order_high")
```

### Job stores — scheduling persistente con SQLAlchemy

```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor

jobstores = {
    "default": SQLAlchemyJobStore(url="sqlite:///jobs.sqlite"),
}

executors = {
    "default": ThreadPoolExecutor(20),
}

job_defaults = {
    "coalesce": True,       # Fusionar ejecuciones perdidas en una
    "max_instances": 1,     # Prevenir runs superpuestos del mismo job
    "misfire_grace_time": 60,  # Permitir ejecución 60s tarde
}

scheduler = BackgroundScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults,
)

scheduler.start()
# Los jobs sobreviven reinicios — almacenados en SQLite
```

### Gestión dinámica de jobs

```python
# Obtener un job por ID
job = scheduler.get_job("daily_report")
if job:
    print(f"Next run: {job.next_run_time}")

# Pausar un job
scheduler.pause_job("daily_report")

# Reanudar un job
scheduler.resume_job("daily_report")

# Reprogramar un job
scheduler.reschedule_job("daily_report", trigger="cron", hour=10, minute=30)

# Remover un job
scheduler.remove_job("daily_report")

# Listar todos los jobs
for job in scheduler.get_jobs():
    print(f"{job.id}: next_run={job.next_run_time}")
```

### Manejo de errores y listeners

```python
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_MISSED, EVENT_JOB_EXECUTED

def job_listener(event):
    if event.exception:
        print(f"Job {event.job_id} failed: {event.exception}")
    elif event.code == EVENT_JOB_MISSED:
        print(f"Job {event.job_id} missed its run time")
    else:
        print(f"Job {event.job_id} executed successfully")

scheduler.add_listener(job_listener, EVENT_JOB_ERROR | EVENT_JOB_MISSED | EVENT_JOB_EXECUTED)
```

### AsyncScheduler con asyncio

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

async def async_fetch_data():
    print("Fetching data asynchronously...")
    await asyncio.sleep(2)
    print("Data fetched")

async def main():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(async_fetch_data, "interval", seconds=10, id="fetch")
    scheduler.start()

    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        scheduler.shutdown()

asyncio.run(main())
```

### Integración con Flask

```python
from flask import Flask
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
scheduler = BackgroundScheduler(daemon=True)

@app.before_request
def start_scheduler():
    if not scheduler.running:
        scheduler.start()

def health_check():
    import requests
    try:
        r = requests.get("http://localhost:5000/health", timeout=5)
        print(f"Health check: {r.status_code}")
    except requests.RequestException as e:
        print(f"Health check failed: {e}")

scheduler.add_job(health_check, "interval", seconds=60, id="health_check")

@app.route("/health")
def health():
    return {"status": "healthy"}, 200

if __name__ == "__main__":
    scheduler.start()
    app.run(host="0.0.0.0", port=5000)
```

## Explicación

APScheduler tiene tres tipos de triggers:

- **Interval**: Ejecuta cada N segundos, minutos, horas o días. Simple y predecible.
- **Cron**: Expresiones estilo cron (day_of_week, hour, minute, month, day). Flexible para schedules complejos.
- **Date**: Ejecuta una vez en un datetime específico. Para tareas diferidas one-off.

Conceptos clave:

- **Scheduler**: Gestiona jobs. `BackgroundScheduler` se ejecuta en un hilo, `AsyncIOScheduler` se integra con asyncio, `BlockingScheduler` bloquea el hilo principal.
- **JobStore**: Almacena definiciones de jobs. `MemoryJobStore` (default, se pierde al reiniciar) o `SQLAlchemyJobStore` (persistente, sobrevive reinicios).
- **Executor**: Ejecuta jobs. `ThreadPoolExecutor` para jobs síncronos, `ProcessPoolExecutor` para CPU-bound, `AsyncIOExecutor` para async.
- **coalesce**: Cuando un job pierde múltiples runs, los fusiona en una ejecución en lugar de ejecutar múltiples runs de catch-up.
- **max_instances**: Previene runs superpuestos del mismo job. Establecer a 1 para evitar ejecución concurrente.
- **misfire_grace_time**: Qué tan tarde puede ejecutarse un job después de su tiempo programado antes de que se skip.

## Variantes

| Herramienta | Tipo | Requiere Broker | Usar Cuando |
|------|------|----------------|----------|
| APScheduler | In-process | No | Tareas periódicas simples |
| Celery | Distribuido | Sí (Redis/RabbitMQ) | Jobs distribuidos pesados |
| RQ | Distribuido | Sí (Redis) | Jobs distribuidos simples |
| systemd timers | OS-level | No | Cron a nivel servidor |
| cron | OS-level | No | Cron simple de servidor |

## Pautas

- Usar `BackgroundScheduler` para web apps (Flask, Django). Usar `BlockingScheduler` para scripts standalone.
- Establecer `max_instances=1` para prevenir runs superpuestos de jobs largos.
- Establecer `coalesce=True` para evitar ejecutar jobs perdidos múltiples veces.
- Usar job stores persistentes (SQLAlchemy) para jobs que deben sobrevivir reinicios.
- Manejar errores de jobs con event listeners. Jobs fallidos no deberían crashear el scheduler.
- Establecer `misfire_grace_time` para evitar ejecutar jobs muy tarde que ya no son relevantes.
- Usar `ThreadPoolExecutor` para jobs I/O-bound, `ProcessPoolExecutor` para CPU-bound.
- Shut down del scheduler correctamente en el exit de la app para evitar threads huérfanos.
- Usar job IDs únicos para gestionar jobs dinámicamente.

## Errores Comunes

- No hacer shut down del scheduler. Threads huérfanos siguen corriendo después del exit de la app.
- Permitir runs superpuestos. Un job lento que corre cada 30 segundos puede acumularse. Establecer `max_instances=1`.
- Usar `MemoryJobStore` para jobs críticos. Los jobs se pierden al reiniciar. Usar `SQLAlchemyJobStore`.
- No manejar excepciones de jobs. Un job que falla loguea un error pero continúa silenciosamente. Añadir event listeners.
- Ejecutar el scheduler en el hilo principal de una web app. Usar `BackgroundScheduler` para evitar bloquear requests.
- Olvidar `misfire_grace_time`. Jobs que pierden su ventana se ejecutan inmediatamente al startup, potencialmente sobrecargando el sistema.
- No usar job IDs únicos. Se crean jobs duplicados al reiniciar con `MemoryJobStore`.

## Preguntas Frecuentes

### ¿Puede APScheduler reemplazar Celery?

Para tareas periódicas simples, sí. APScheduler es más simple y no requiere un broker. Para procesamiento pesado de tareas distribuidas, Celery es más robusto con reintentos, routing de tareas y escalado de workers.

### ¿Cómo prevengo ejecuciones superpuestas de jobs?

Establecer `max_instances=1` en job defaults o por job. Si un job sigue corriendo cuando el próximo tiempo programado llega, la nueva ejecución se skip.

### ¿Qué pasa si el servidor está caído cuando un job está programado?

Con `MemoryJobStore`, el job se pierde. Con `SQLAlchemyJobStore`, el job se almacena y se ejecuta en el próximo startup si está dentro de `misfire_grace_time`. Establecer `coalesce=True` para fusionar múltiples runs perdidos en uno.

### ¿Puedo ejecutar funciones async con APScheduler?

Sí. Usar `AsyncIOScheduler` con `AsyncIOExecutor`. El scheduler se integra con el event loop de asyncio y ejecuta jobs async como coroutines.
