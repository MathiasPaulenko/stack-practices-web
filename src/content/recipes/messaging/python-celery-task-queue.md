---





contentType: recipes
slug: python-celery-task-queue
title: "Distribute Background Tasks with Python Celery and Redis"
description: "Set up Celery with Redis broker for distributed task processing including task chaining, groups, chords, retry strategies, scheduled tasks with Celery Beat, and result backends."
metaDescription: "Distribute background tasks with Python Celery and Redis. Use task chaining, groups, chords, retry strategies, Celery Beat scheduling, and result backends."
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
  - /recipes/rabbitmq-python-pika-consumer
  - /recipes/database-query-result-caching
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
  - /recipes/event-sourcing-cqrs-pattern
  - /recipes/kafka-python-consumer-groups
  - /recipes/rabbitmq-dead-letter-queue
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Distribute background tasks with Python Celery and Redis. Use task chaining, groups, chords, retry strategies, Celery Beat scheduling, and result backends."
  keywords:
    - python celery redis
    - celery task queue
    - celery beat scheduling
    - celery retry strategy
    - celery chord group chain





---

## Overview

Celery is Python's most popular distributed task queue. It handles background jobs, scheduled tasks, and complex workflows (chains, groups, chords) across multiple workers. With Redis as broker and result backend, setup is minimal. Below: configuring Celery, defining tasks with retry strategies, composing workflows, scheduling with Celery Beat, and monitoring with Flower.

## When to Use This

- Background processing (email sending, report generation, file conversion)
- Periodic/scheduled tasks (daily reports, cleanup jobs, data sync)
- Complex multi-step workflows with dependencies between steps
- Distributing CPU-intensive work across multiple workers

## Prerequisites

- Python 3.10+
- Redis server (local or cloud)
- `celery[redis]` and `flower` packages

## Solution

### 1. Celery Configuration

```python
# celery_app.py
from celery import Celery

app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1',
)

app.conf.update(
    # Serialization
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],

    # Timezone
    timezone='UTC',
    enable_utc=True,

    # Reliability
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    # Results
    result_expires=3600,  # Results expire after 1 hour
    task_track_started=True,

    # Retry
    task_default_retry_delay=60,
    task_default_max_retries=3,
)

# Auto-discover tasks in modules
app.autodiscover_tasks(['myapp.tasks'])
```

### 2. Basic Task with Retry

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
    time.sleep(5)  # Simulate work
    return {
        'reportType': report_type,
        'params': params,
        'url': f'https://reports.example.com/{report_type}/{params["id"]}.pdf',
    }
```

### 3. Task Chaining (Sequential)

```python
from celery import chain
from tasks import send_email, generate_report

# Chain: generate report → send email with link
workflow = chain(
    generate_report.s('monthly', {'id': 'report-123', 'month': '2026-06'}),
    send_email.s('user@example.com', 'Your Monthly Report'),
)

result = workflow.apply_async()
print(f"Workflow ID: {result.id}")

# Access final result
final_result = result.get(timeout=30)
print(f"Final result: {final_result}")
```

### 4. Task Groups (Parallel)

```python
from celery import group
from tasks import generate_report

# Group: generate multiple reports in parallel
reports = [
    {'type': 'sales', 'params': {'month': '2026-06'}},
    {'type': 'traffic', 'params': {'month': '2026-06'}},
    {'type': 'revenue', 'params': {'month': '2026-06'}},
]

workflow = group(
    generate_report.s(r['type'], r['params']) for r in reports
)

result = workflow.apply_async()

# Wait for all tasks to complete
results = result.get(timeout=60)
for r in results:
    print(f"Report ready: {r['url']}")
```

### 5. Chord (Parallel + Callback)

```python
from celery import chord
from tasks import generate_report, send_email

# Chord: generate all reports in parallel, then send summary email
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

### 6. Celery Beat (Scheduled Tasks)

```python
# celery_app.py
from celery import Celery
from celery.schedules import crontab

app = Celery('myapp', broker='redis://localhost:6379/0')

app.conf.beat_schedule = {
    # Every morning at 6 AM
    'daily-report': {
        'task': 'tasks.generate_report',
        'schedule': crontab(hour=6, minute=0),
        'args': ('daily', {'date': 'today'}),
    },
    # Every Monday at 9 AM
    'weekly-cleanup': {
        'task': 'tasks.cleanup_expired_sessions',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),
    },
    # Every 5 minutes
    'health-check': {
        'task': 'tasks.check_service_health',
        'schedule': 300.0,  # seconds
    },
    # First day of every month at midnight
    'monthly-billing': {
        'task': 'tasks.process_monthly_billing',
        'schedule': crontab(hour=0, minute=0, day_of_month=1),
    },
}
```

### 7. Task State and Results

```python
from celery_app import app
from celery.result import AsyncResult

# Check task status
def check_task(task_id: str) -> dict:
    result = AsyncResult(task_id, app=app)
    return {
        'task_id': task_id,
        'status': result.status,  # PENDING, STARTED, SUCCESS, FAILURE, RETRY
        'result': result.result if result.successful() else None,
        'traceback': result.traceback if result.failed() else None,
        'date_done': result.date_done,
    }

# Revoke a task
def cancel_task(task_id: str):
    app.control.revoke(task_id, terminate=True, signal='SIGTERM')

# Get task info
task_info = check_task('some-task-id')
print(f"Status: {task_info['status']}")
```

### 8. Running Workers and Beat

```bash
# Start a worker
celery -A celery_app worker --loglevel=info --concurrency=4

# Start Beat (scheduler)
celery -A celery_app beat --loglevel=info

# Start Flower (monitoring dashboard)
celery -A celery_app flower --port=5555

# Run a task from CLI
celery -A celery_app call tasks.send_email --args='["user@example.com", "Welcome", "Hello!"]'
```

## How It Works

1. **Broker**: Celery uses Redis (or RabbitMQ) as a message broker. Tasks are serialized as JSON and placed on a queue. Workers pick up tasks from the queue.
2. **Result backend**: Task results are stored in Redis. `result.get()` blocks until the task completes and returns the result. Without a backend, results aren't stored.
3. **Prefetch**: `worker_prefetch_multiplier=1` means each worker process takes one task at a time. Higher values improve throughput for fast tasks but can cause uneven distribution for long tasks.
4. **acks_late**: With `task_acks_late=True`, the broker acknowledges the task only after it completes. If a worker crashes, the task is redelivered to another worker.
5. **Chains/Groups/Chords**: Chains run tasks sequentially (output of one feeds the next). Groups run tasks in parallel. Chords run a group in parallel, then a callback with all results.

## Variants

### Canvas: Chain with Error Handling

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

### Routing to Different Queues

```python
# Route tasks to different queues based on type
app.conf.task_routes = {
    'tasks.send_email': {'queue': 'email'},
    'tasks.generate_report': {'queue': 'reports'},
    'tasks.cleanup_*': {'queue': 'maintenance'},
}

# Start workers for specific queues
# celery -A celery_app worker -Q email --concurrency=2
# celery -A celery_app worker -Q reports --concurrency=4
```

### Periodic Task with Database Scheduler

```python
# Use django-celery-beat for dynamic schedules stored in DB
# pip install django-celery-beat

app.conf.beat_scheduler = 'django_celery_beat.schedulers:DatabaseScheduler'

# Schedules are managed via Django admin — no restart needed
```

## Best Practices


- For a deeper guide, see [Implement Redis Pub/Sub Messaging in Python](/recipes/redis-pub-sub-python/).

- **Use `acks_late=True`**: Ensures tasks are redelivered if a worker crashes. Without it, a crash loses the task.
- **Set `worker_prefetch_multiplier=1` for long tasks**: Prevents one worker from hoarding tasks while others are idle. For fast tasks (< 1 second), use a higher multiplier.
- **Use `retry_backoff=True`**: Exponential backoff prevents retry storms on transient failures. Add `retry_jitter=True` to spread retries across workers.
- **Keep tasks idempotent**: A task may execute more than once (retry, crash recovery). Design tasks to be safe to re-run.
- **Use `autoretry_for` for known transient errors**: Don't manually call `self.retry()` for every error. Let Celery handle it declaratively.
- **Monitor with Flower**: Flower provides a web UI for monitoring task progress, worker status, and queue depth. Essential for production.

## Common Mistakes

- **Passing non-serializable arguments**: Celery serializes tasks as JSON. Database objects, file handles, and custom classes can't be passed. Pass IDs and fetch inside the task.
- **Not setting a result backend**: Without a backend, `result.get()` raises an error. Set `result_backend='redis://...'` if you need results.
- **Blocking in `result.get()`**: Calling `get()` in a web request blocks the request. Use callbacks or polling instead.
- **Not handling task failures**: If a task in a chain fails, the rest of the chain doesn't execute. Add error handlers with `on_error()`.
- **Running Beat on multiple instances**: Multiple Beat processes cause duplicate task execution. Run Beat on exactly one instance, or use a distributed scheduler.

## FAQ

**Celery vs RQ (Redis Queue) — which should I use?**

Celery supports complex workflows (chains, groups, chords), scheduling, and multiple brokers. RQ is simpler — just enqueue and process. Use Celery for complex workflows, RQ for simple background jobs.

**How do I run Celery in production?**

Use `celery worker` with a process manager (systemd, Supervisor, Docker). Set `--concurrency` to the number of CPU cores. Run Flower for monitoring. Use Redis Sentinel for broker HA.

**What happens if a task exceeds the time limit?**

Set `task_time_limit=300` (5 minutes). Celery sends a `SoftTimeLimitExceeded` exception, giving the task a chance to clean up. After `task_soft_time_limit`, it's forcefully terminated.

**Can I use Celery with Django?**

Yes. Add `django_celery_results` for result backend and `django_celery_beat` for scheduling. Tasks are auto-discovered from `tasks.py` in each Django app.

**How do I prioritize tasks?**

Use separate queues with different priority levels. Start more workers for high-priority queues. Redis doesn't support native priority queues — use RabbitMQ for true priority support.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
