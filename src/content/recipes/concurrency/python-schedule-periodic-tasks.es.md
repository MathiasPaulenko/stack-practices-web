---
contentType: recipes
slug: python-schedule-periodic-tasks
title: "APScheduler BackgroundScheduler: Evitar Jobs Superpuestos"
description: "Ejecuta jobs tipo cron en Python usando APScheduler. Cubre triggers de intervalo, cron y fecha, job stores y scheduling en background."
metaDescription: "Fix APScheduler overlapping jobs con max_instances, config BackgroundScheduler, triggers de intervalo y cron, job stores persistentes y manejo de errores."
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
  - /recipes/python-async-http-requests
  - /recipes/docker-health-check-configuration
  - /patterns/circuit-breaker-pattern
  - /recipes/cron-jobs
  - /guides/complete-guide-python-asyncio-production
  - /guides/complete-guide-python-asyncio
lastUpdated: "2026-08-25"
publishedAt: "2026-07-02"
author: Mathias Paulenko
seo:
  metaDescription: "Fix APScheduler overlapping jobs con max_instances, config BackgroundScheduler, triggers de intervalo y cron, job stores persistentes y manejo de errores."
  keywords:
    - python apscheduler
    - python schedule periodic tasks
    - python cron jobs
    - apscheduler cron trigger
    - python background scheduler
    - python job scheduling
---

## Visión General

APScheduler es una librería de Python que permite ejecutar jobs bajo un schedule sin levantar cron, systemd ni una cola de tareas como Celery. Vive dentro de tu proceso y arranca con tu aplicación, así que es cómoda para tareas tipo cron de complejidad pequeña o media dentro de un solo runtime de Python.

Esta receta recorre los tres triggers de APScheduler - interval, cron y date - además de job stores persistentes con SQLAlchemy, scheduling en background que no bloquea la aplicación y algunas configuraciones de seguridad para que un job que falla no derrumbe el scheduler.

## Cuándo Usar

APScheduler tiene sentido cuando necesitás ejecutar tareas a intervalos regulares o en horarios calendario desde una app Python. Es un buen ajuste para jobs de limpieza, refresh de caché, reportes diarios y tareas one-off diferidas, como enviar un recordatorio o ejecutar una exportación pospuesta. También es una buena opción cuando querés comportamiento tipo cron sin tocar el scheduler del sistema operativo ni desplegar un servicio aparte. Elegilo para scheduling in-process cuando no necesitás workers distribuidos ni entrega garantizada de mensajes.

## Cuándo NO Usar

No uses APScheduler cuando necesitás colas de tareas distribuidas, reintentos o escalado de workers. Para esos casos, usá Celery o RQ. Si el scheduler del sistema operativo es suficiente, el cron a nivel servidor suele ser más simple y confiable; consultá [cron jobs](/es/recipes/cron-jobs/) o systemd timers. No confíes en él para semánticas estrictas de exactamente-una-vez entre muchos procesos, y no ejecutes muchos jobs CPU-bound en un solo proceso sin ProcessPoolExecutor o una cola distribuida.

## Solución

### Instalar APScheduler

```bash
pip install APScheduler
```

### Trigger de intervalo - ejecutar cada N segundos/minutos/horas

```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

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
scheduler.add_job(refresh_cache, "interval", hours=2, next_run_time=datetime.now() + timedelta(seconds=10))

scheduler.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    scheduler.shutdown()
```

### Trigger cron - scheduling estilo cron

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

### Trigger de fecha - tarea programada one-off

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

### Job stores - scheduling persistente con SQLAlchemy

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
# Los jobs sobreviven reinicios - almacenados en SQLite
```

### Gestión dinámica de jobs

```python
# Agregar un job
scheduler.add_job(mi_funcion, "interval", minutes=5, id="new_job")

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

### Ejecutar jobs CPU-bound en un process pool

```python
from apscheduler.executors.pool import ProcessPoolExecutor

executors = {
    "default": ProcessPoolExecutor(max_workers=4),
}
```

APScheduler despacha el trabajo al pool, así que el proceso principal se mantiene responsivo. Para jobs I/O-bound, un thread pool executor suele ser la mejor opción; el ejemplo de arriba usa un process pool para tareas CPU-bound.

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
import atexit

app = Flask(__name__)
scheduler = BackgroundScheduler()

def health_check():
    print(f"Scheduler running: {scheduler.running}")

scheduler.add_job(health_check, "interval", seconds=60, id="health_check")
scheduler.start()
atexit.register(scheduler.shutdown)

@app.route("/health")
def health():
    return {"status": "healthy" if scheduler.running else "unhealthy"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

El scheduler arranca antes de que la app de Flask empiece a servir tráfico, así que ya está corriendo cuando llega el primer request. Mantener el inicio del scheduler fuera de los request handlers evita instancias duplicadas.

## Explicación

APScheduler separa tres responsabilidades: cuándo corre un job, dónde vive su definición y cómo se ejecuta. El trigger decide el schedule, el job store guarda la definición del job y el executor lo ejecuta.

El trigger de intervalo es el más simple de los tres; solo espera N segundos, minutos, horas o días y vuelve a disparar. Usá el trigger cron cuando necesitás reglas de calendario, como "lunes a las 2 AM" o "el primer día de cada mes". Usa los mismos campos del cron de Unix, así que day_of_week, hour y minute funcionan como esperarías. El trigger de fecha es para trabajo one-off, como un recordatorio diferido o una exportación única, y dispara una vez en el datetime que le des.

Algunos settings deciden qué pasa cuando un job pierde su ventana o todavía está corriendo desde la vuelta anterior. Un valor de coalesce True colapsa varias ejecuciones perdidas en una, así que el scheduler no tira una ráfaga de trabajo al inicio. Un valor de max_instances 1 evita que un job lento se solape consigo mismo. Y misfire_grace_time es la ventana de tardanza: si un job está apenas atrasado, todavía corre; si está demasiado tarde, se saltea.

Podés mezclar schedulers, job stores y executors para ajustarlos a la carga. El background scheduler corre en un hilo daemon, así que no bloquea el manejo de requests y es bueno dentro de una web app. El blocking scheduler mantiene el proceso vivo y funciona bien para scripts standalone, mientras que el asyncio scheduler se engancha a un event loop y ejecuta coroutines directamente. Un job store en memoria es rápido pero pierde todo al reiniciar, mientras que uno basado en SQLAlchemy sobrevive a los reinicios y puede compartirse si un solo scheduler activo lo consulta. Un thread pool sirve para trabajo I/O-bound, un process pool ayuda para trabajo CPU-bound y un async executor va con el scheduler async.

## Variantes

| Herramienta | Tipo | Requiere Broker | Mejor para |
|------|------|----------------|----------|
| APScheduler | In-process | No | Tareas periódicas simples |
| Celery | Distribuido | Sí (Redis/RabbitMQ) | Jobs distribuidos pesados |
| RQ | Distribuido | Sí (Redis) | Jobs distribuidos simples |
| systemd timers | OS-level | No | Cron a nivel servidor |
| cron | OS-level | No | Cron simple de servidor |

## Buenas Prácticas

Elegí el scheduler adecuado para tu runtime. BackgroundScheduler es lo que querés dentro de una web app, BlockingScheduler mantiene vivo un script standalone y AsyncIOScheduler funciona con asyncio.

Para jobs largos, establecé max_instances en 1 para que no se solapen consigo mismos. También establecé coalesce en True, que colapsa varias ejecuciones perdidas en una y previene una tormenta al reinicio.

Usá un job store persistente cuando el schedule deba sobrevivir a los reinicios. SQLite alcanza para una instancia sola, pero buscá una base de datos real si varios procesos comparten el store.

Agregá un listener para EVENT_JOB_ERROR. Un job que falla no derrumba el scheduler, así que un log visible es la única forma de saber que se rompió.

Elegí un misfire grace time que se ajuste a la tarea. Sesenta segundos suelen ser suficientes para jobs de limpieza; un reporte horario puede tolerar unos pocos minutos.

Ajustá el executor al trabajo. ThreadPoolExecutor funciona para jobs I/O-bound, ProcessPoolExecutor ayuda para jobs CPU-bound y AsyncIOExecutor va con el scheduler async.

Siempre llamá scheduler.shutdown() al salir, y usá job IDs únicos. IDs duplicados pueden crear jobs duplicados, especialmente cuando el scheduler reinicia con un store en memoria.

## Errores Comunes

Un BackgroundScheduler no corre jobs hasta que llamás start(). En Flask, iniciarlo una vez al arrancar la app; no en cada request.

Threads daemon huérfanos pueden impedir que el proceso termine limpiamente o seguir corriendo en background sin querer, así que siempre terminá el scheduler.

Un job lento que dispara cada 30 segundos puede acumularse. Establecé max_instances en 1 para evitar runs superpuestos.

Usar un store en memoria para jobs críticos es riesgoso porque los jobs se pierden al reiniciar. Usá un store respaldado por SQLAlchemy si el schedule debe sobrevivir a los reinicios.

Un job que falla loguea un evento de error pero sigue adelante, así que agregá un listener y manejá los errores de forma explícita. No los dejes pasar desapercibidos.

Un scheduler bloqueante no tiene lugar en una web app porque bloquea el manejo de requests. Usá BackgroundScheduler o AsyncIOScheduler en su lugar.

Si te olvidás de misfire_grace_time, los jobs que perdieron su ventana pueden ejecutarse inmediatamente al inicio y sobrecargar el sistema.

Los IDs de job duplicados al reiniciar son otro gotcha. Sin un store persistente, el scheduler agrega los mismos jobs de nuevo y crea duplicados.

## Notas de Producción

APScheduler usa el timezone del scheduler. Si pasás objetos datetime naive o el servidor cambia de zona, los jobs pueden dispararse en momentos inesperados. Instalá pytz (o usá zoneinfo en Python 3.9+) y pasá datetimes con zona horaria, especialmente para triggers cron.

BackgroundScheduler usa threads daemon. No mantienen vivo el proceso principal y se matan abruptamente al salir. Llamá shutdown() con un timeout para darles tiempo a los jobs activos a terminar.

Por default, la salida del job va a stdout y APScheduler loguea a WARNING. En producción, conectá un logger y un listener para saber cuándo los jobs fallan o misfirean.

Cuando usás un job store SQLAlchemy compartido, solo debe haber un proceso scheduler activo. Varios schedulers leyendo el mismo store pueden competir y ejecutar el mismo job dos veces. Usá un lock de proceso o hacé que el scheduler sea un despliegue de una sola instancia para evitar duplicados.

Si el scheduler es crítico, exponé un endpoint de salud que verifique el estado del scheduler, las ejecuciones recientes y el stream de eventos del listener. Consultá [Docker health check configuration](/es/recipes/docker-health-check-configuration/) para un patrón concreto.

El argumento next_run_time espera un datetime, no un timestamp de Unix, así que pasá datetime.now() + timedelta(...) o un datetime con zona horaria.

Con varios workers de gunicorn podés terminar con varios schedulers corriendo el mismo job dos veces. Usá un lock de proceso o corré el scheduler en un proceso dedicado.

## Preguntas Frecuentes

### ¿Puede APScheduler reemplazar Celery?

Para tareas periódicas simples, sí. APScheduler es más liviano y no necesita un broker. Para trabajo distribuido pesado con reintentos, routing de tareas y escalado de workers, Celery es la mejor opción.

### ¿Cómo prevengo ejecuciones superpuestas de jobs?

Establecé la opción max_instances en 1 en los job defaults o en el job mismo. Si el job todavía está corriendo cuando llega el próximo horario programado, esa ejecución se saltea.

### ¿Qué pasa si el servidor está caído cuando un job está programado?

Si confiás en un store en memoria, el job desaparece cuando se detiene el proceso. Con un store SQLAlchemy, el job se guarda y corre en el próximo inicio si todavía está dentro del grace time. Establecé coalesce en True para fusionar varios runs perdidos en uno.

### ¿Puedo ejecutar funciones async con APScheduler?

Sí. Usá AsyncIOScheduler con AsyncIOExecutor. El scheduler se integra con el event loop de asyncio y ejecuta jobs async como coroutines.

### ¿Cómo ejecuto diferentes jobs en diferentes procesos?

Un ProcessPoolExecutor maneja tareas CPU-bound. La sección Solución tiene un ejemplo de configuración con cuatro procesos workers.

### ¿Puedo agregar o eliminar jobs dinámicamente en runtime?

Sí. Podés gestionar jobs mientras el scheduler está corriendo; el ejemplo "Gestión dinámica de jobs" en la sección Solución muestra las llamadas.

## Puntos Clave

APScheduler es un scheduler in-process para Python, no una cola de tareas distribuida. Soporta triggers de intervalo, cron y fecha one-off, y es útil mientras elijas el scheduler adecuado para el runtime.

Usá un background scheduler en web apps y un blocking scheduler en scripts standalone. Establecé max_instances en 1 y coalesce en True para que jobs lentos o perdidos no se acumulen. Almacená los jobs en un store respaldado por SQLAlchemy si deben sobrevivir a los reinicios, y manejá errores con listeners. Siempre terminá el scheduler de forma limpia.

## Lecturas Adicionales

- [Documentación de APScheduler](https://apscheduler.readthedocs.io/en/stable/)
- [Guía de APScheduler con Flask](https://apscheduler.readthedocs.io/en/stable/userguide.html#scheduling-background-jobs)
- [Job stores y executors de APScheduler](https://apscheduler.readthedocs.io/en/stable/userguide.html#configuring-the-scheduler)
- Interno: [Cron Jobs](/es/recipes/cron-jobs/)
- Interno: [Docker health check configuration](/es/recipes/docker-health-check-configuration/)
- Interno: [Circuit breaker pattern](/es/patterns/circuit-breaker-pattern/)
- Interno: [Guía de producción de asyncio en Python](/es/guides/complete-guide-python-asyncio-production/)
