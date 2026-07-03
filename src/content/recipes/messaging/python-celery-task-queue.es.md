---
contentType: recipes
slug: python-celery-task-queue
title: "Distribuir Tareas en Background con Python Celery y Redis"
description: "Configurar Celery con Redis broker para procesamiento distribuido de tareas incluyendo chaining, groups, chords, estrategias de retry, tareas programadas con Celery Beat y result backends."
metaDescription: "Distribuye tareas en background con Python Celery y Redis. Usa chaining, groups, chords, retry, programacion con Celery Beat y result backends."
difficulty: intermediate
topics:
  - messaging
  - architecture
  - performance
tags:
  - celery
  - python
  - redis
  - task-queue
  - background-jobs
relatedResources:
  - /recipes/messaging/rabbitmq-python-pika-consumer
  - /recipes/caching/database-query-result-caching
  - /guides/complete-guide-message-queues
  - /guides/complete-guide-celery-patterns
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Distribuye tareas en background con Python Celery y Redis. Usa chaining, groups, chords, retry, programacion con Celery Beat y result backends."
  keywords:
    - python celery redis
    - celery task queue
    - celery beat scheduling
    - celery retry strategy
    - celery chord group chain
---

## Descripcion general

Celery es la cola de tareas distribuida mas popular de Python. Maneja jobs en background, tareas programadas y workflows complejos (chains, groups, chords) entre multiples workers. Con Redis como broker y result backend, la configuracion es minima. A continuacion: configurar Celery, definir tareas con estrategias de retry, componer workflows, programar con Celery Beat y monitorear con Flower.

## Cuando Usar Esto

- Procesamiento en background (envio de emails, generacion de reportes, conversion de archivos)
- Tareas periodicas/programadas (reportes diarios, jobs de limpieza, sync de datos)
- Workflows complejos multi-paso con dependencias entre pasos
- Distribuir trabajo CPU-intensivo entre multiples workers

## Prerrequisitos

- Python 3.10+
- Servidor Redis (local o cloud)
- Paquetes `celery[redis]` y `flower`

## Solucion

### 1. Configuracion de Celery

```python
# celery_app.py
from celery import Celery

app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1',
)

app.conf.update(
    # Serializacion
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],

    # Zona horaria
    timezone='UTC',
    enable_utc=True,

    # Confiabilidad
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    # Resultados
    result_expires=3600,  # Resultados expiran despues de 1 hora
    task_track_started=True,

    # Retry
    task_default_retry_delay=60,
    task_default_max_retries=3,
)

# Auto-descubrir tareas en modulos
app.autodiscover_tasks(['myapp.tasks'])
```

### 2. Tarea Basica con Retry

```python
# tasks.py
from celery_app import app
import time
import logging

logger = logging.getLogger(__name__)

@app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def send_email(self, to: str, subject: str, body: str):
    try:
        smtp = connect_smtp()
        smtp.sendmail(to, subject, body)
        logger.info(f"Email sent to {to}")
        return {'status': 'sent', 'to': to}

    except (ConnectionError, TimeoutError) as exc:
        logger.warning(f"SMTP error, retrying: {exc}")
        raise self.retry(exc=exc)

    except Exception as exc:
        logger.error(f"Failed to send email to {to}: {exc}")
        raise

@app.task
def generate_report(report_type: str, params: dict) -> dict:
    time.sleep(5)  # Simular trabajo
    return {
        'reportType': report_type,
        'params': params,
        'url': f'https://reports.example.com/{report_type}/{params["id"]}.pdf',
    }
```

### 3. Chaining de Tareas (Secuencial)

```python
from celery import chain
from tasks import send_email, generate_report

# Chain: generar reporte → enviar email con link
workflow = chain(
    generate_report.s('monthly', {'id': 'report-123', 'month': '2026-06'}),
    send_email.s('user@example.com', 'Your Monthly Report'),
)

result = workflow.apply_async()
print(f"Workflow ID: {result.id}")

# Acceder al resultado final
final_result = result.get(timeout=30)
print(f"Final result: {final_result}")
```

### 4. Groups de Tareas (Paralelo)

```python
from celery import group
from tasks import generate_report

# Group: generar multiples reportes en paralelo
reports = [
    {'type': 'sales', 'params': {'month': '2026-06'}},
    {'type': 'traffic', 'params': {'month': '2026-06'}},
    {'type': 'revenue', 'params': {'month': '2026-06'}},
]

workflow = group(
    generate_report.s(r['type'], r['params']) for r in reports
)

result = workflow.apply_async()

# Esperar a que todas las tareas completen
results = result.get(timeout=60)
for r in results:
    print(f"Report ready: {r['url']}")
```

### 5. Chord (Paralelo + Callback)

```python
from celery import chord
from tasks import generate_report, send_email

# Chord: generar todos los reportes en paralelo, luego enviar email de resumen
header = group(
    generate_report.s(r['type'], r['params'])
    for r in fetch_report_requests()
)

def send_summary(results, to_email):
    summary = f"Generated {len(results)} reports:\n"
    for r in results:
        summary += f"  - {r['reportType']}: {r['url']}\n"
    send_email_run(to_email, 'Report Summary', summary)
    return {'sent': True, 'count': len(results)}

callback = send_summary.s('admin@example.com')

workflow = chord(header)(callback)
result = workflow.get(timeout=120)
print(f"Summary sent: {result}")
```

### 6. Celery Beat (Tareas Programadas)

```python
# celery_app.py
from celery import Celery
from celery.schedules import crontab

app = Celery('myapp', broker='redis://localhost:6379/0')

app.conf.beat_schedule = {
    # Cada manana a las 6 AM
    'daily-report': {
        'task': 'tasks.generate_report',
        'schedule': crontab(hour=6, minute=0),
        'args': ('daily', {'date': 'today'}),
    },
    # Cada lunes a las 9 AM
    'weekly-cleanup': {
        'task': 'tasks.cleanup_expired_sessions',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),
    },
    # Cada 5 minutos
    'health-check': {
        'task': 'tasks.check_service_health',
        'schedule': 300.0,  # segundos
    },
    # Primer dia de cada mes a medianoche
    'monthly-billing': {
        'task': 'tasks.process_monthly_billing',
        'schedule': crontab(hour=0, minute=0, day_of_month=1),
    },
}
```

### 7. Estado y Resultados de Tareas

```python
from celery_app import app
from celery.result import AsyncResult

# Verificar estado de tarea
def check_task(task_id: str) -> dict:
    result = AsyncResult(task_id, app=app)
    return {
        'task_id': task_id,
        'status': result.status,  # PENDING, STARTED, SUCCESS, FAILURE, RETRY
        'result': result.result if result.successful() else None,
        'traceback': result.traceback if result.failed() else None,
        'date_done': result.date_done,
    }

# Revocar una tarea
def cancel_task(task_id: str):
    app.control.revoke(task_id, terminate=True, signal='SIGTERM')

# Obtener info de tarea
task_info = check_task('some-task-id')
print(f"Status: {task_info['status']}")
```

### 8. Ejecutar Workers y Beat

```bash
# Iniciar un worker
celery -A celery_app worker --loglevel=info --concurrency=4

# Iniciar Beat (scheduler)
celery -A celery_app beat --loglevel=info

# Iniciar Flower (dashboard de monitoreo)
celery -A celery_app flower --port=5555

# Ejecutar una tarea desde CLI
celery -A celery_app call tasks.send_email --args='["user@example.com", "Welcome", "Hello!"]'
```

## Como Funciona

1. **Broker**: Celery usa Redis (o RabbitMQ) como message broker. Las tareas se serializan como JSON y se colocan en una cola. Los workers toman tareas de la cola.
2. **Result backend**: Los resultados de tareas se almacenan en Redis. `result.get()` bloquea hasta que la tarea completa y retorna el resultado. Sin backend, los resultados no se almacenan.
3. **Prefetch**: `worker_prefetch_multiplier=1` significa que cada proceso worker toma una tarea a la vez. Valores mas altos mejoran throughput para tareas rapidas pero pueden causar distribucion desigual para tareas largas.
4. **acks_late**: Con `task_acks_late=True`, el broker acknowledge la tarea solo despues de que completa. Si un worker crashea, la tarea se re-entrega a otro worker.
5. **Chains/Groups/Chords**: Las chains ejecutan tareas secuencialmente (output de una alimenta la siguiente). Los groups ejecutan tareas en paralelo. Los chords ejecutan un group en paralelo, luego un callback con todos los resultados.

## Variantes

### Canvas: Chain con Manejo de Errores

```python
from celery import chain

def on_failure(exc, task_id, args, kwargs, einfo):
    logger.error(f"Task {task_id} failed: {exc}")

workflow = chain(
    generate_report.s('monthly', {'id': '123'}).on_error(on_failure),
    send_email.s('user@example.com', 'Report'),
)

result = workflow.apply_async()
```

### Routing a Diferentes Colas

```python
# Enrutar tareas a diferentes colas segun tipo
app.conf.task_routes = {
    'tasks.send_email': {'queue': 'email'},
    'tasks.generate_report': {'queue': 'reports'},
    'tasks.cleanup_*': {'queue': 'maintenance'},
}

# Iniciar workers para colas especificas
# celery -A celery_app worker -Q email --concurrency=2
# celery -A celery_app worker -Q reports --concurrency=4
```

### Tarea Periodica con Database Scheduler

```python
# Usar django-celery-beat para schedules dinamicos almacenados en DB
# pip install django-celery-beat

app.conf.beat_scheduler = 'django_celery_beat.schedulers:DatabaseScheduler'

# Los schedules se gestionan via Django admin — sin reinicio necesario
```

## Mejores Practicas

- **Usar `acks_late=True`**: Asegura que las tareas se re-entreguen si un worker crashea. Sin esto, un crash pierde la tarea.
- **Establecer `worker_prefetch_multiplier=1` para tareas largas**: Previene que un worker acapare tareas mientras otros estan inactivos. Para tareas rapidas (< 1 segundo), usa un multiplier mas alto.
- **Usar `retry_backoff=True`**: El backoff exponencial previene tormentas de retry en fallos transitorios. Agrega `retry_jitter=True` para esparcir reintentos entre workers.
- **Mantener tareas idempotentes**: Una tarea puede ejecutarse mas de una vez (retry, recuperacion de crash). Disena tareas seguras de re-ejecutar.
- **Usar `autoretry_for` para errores transitorios conocidos**: No llames `self.retry()` manualmente para cada error. Deja que Celery lo maneje declarativamente.
- **Monitorear con Flower**: Flower proporciona una UI web para monitorear progreso de tareas, estado de workers y profundidad de cola. Esencial para produccion.

## Errores Comunes

- **Pasar argumentos no serializables**: Celery serializa tareas como JSON. Objetos de base de datos, file handles y clases custom no se pueden pasar. Pasa IDs y fetch dentro de la tarea.
- **No establecer result backend**: Sin backend, `result.get()` lanza un error. Establece `result_backend='redis://...'` si necesitas resultados.
- **Bloquear en `result.get()`**: Llamar `get()` en una peticion web bloquea la peticion. Usa callbacks o polling en su lugar.
- **No manejar fallos de tareas**: Si una tarea en una chain falla, el resto de la chain no se ejecuta. Agrega error handlers con `on_error()`.
- **Ejecutar Beat en multiples instancias**: Multiples procesos Beat causan ejecucion duplicada de tareas. Ejecuta Beat en exactamente una instancia, o usa un scheduler distribuido.

## FAQ

**Celery vs RQ (Redis Queue) — cual deberia usar?**

Celery soporta workflows complejos (chains, groups, chords), scheduling y multiples brokers. RQ es mas simple — solo encola y procesa. Usa Celery para workflows complejos, RQ para jobs simples en background.

**Como ejecuto Celery en produccion?**

Usa `celery worker` con un process manager (systemd, Supervisor, Docker). Establece `--concurrency` al numero de cores de CPU. Ejecuta Flower para monitoreo. Usa Redis Sentinel para HA del broker.

**Que pasa si una tarea excede el time limit?**

Establece `task_time_limit=300` (5 minutos). Celery envia una excepcion `SoftTimeLimitExceeded`, dandole a la tarea oportunidad de limpiar. Despues de `task_soft_time_limit`, se termina forzosamente.

**Puedo usar Celery con Django?**

Si. Agrega `django_celery_results` para result backend y `django_celery_beat` para scheduling. Las tareas se auto-descubren desde `tasks.py` en cada app de Django.

**Como priorizo tareas?**

Usa colas separadas con diferentes niveles de prioridad. Inicia mas workers para colas de alta prioridad. Redis no soporta colas de prioridad nativas — usa RabbitMQ para soporte real de prioridad.
