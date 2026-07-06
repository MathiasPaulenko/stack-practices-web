---
contentType: recipes
slug: python-schedule-periodic-tasks
title: "Schedule Periodic Tasks in Python with APScheduler"
description: "Run cron-like jobs in Python using APScheduler. Covers interval, cron, and date triggers, job stores, and background scheduling."
metaDescription: "Schedule periodic tasks in Python with APScheduler. Interval, cron and date triggers, persistent job stores, background schedulers and error handling."
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
  - /patterns/circuit-breaker-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Schedule periodic tasks in Python with APScheduler. Interval, cron and date triggers, persistent job stores, background schedulers and error handling."
  keywords:
    - python apscheduler
    - python schedule periodic tasks
    - python cron jobs
    - apscheduler cron trigger
    - python background scheduler
    - python job scheduling
---

## Overview

APScheduler (Advanced Python Scheduler) is a library for scheduling Python jobs to run at specific times or intervals. It supports cron-like scheduling, interval-based execution, and one-off date triggers. Unlike Celery, APScheduler runs in-process and does not require a message broker. The following demonstrates how to the three trigger types, persistent job stores, and background execution.

## When to Use

- You need to run tasks periodically (cleanup, cache refresh, report generation)
- You want cron-like scheduling without a separate cron daemon
- You need to schedule one-off delayed tasks
- You want in-process scheduling without a message broker like Celery

## Solution

### Install APScheduler

```bash
pip install APScheduler
```

### Interval trigger — run every N seconds/minutes/hours

```python
from apscheduler.schedulers.background import BackgroundScheduler
import time

def cleanup_temp_files():
    print("Cleaning up temp files...")

def refresh_cache():
    print("Refreshing cache...")

scheduler = BackgroundScheduler()

# Run every 30 seconds
scheduler.add_job(cleanup_temp_files, "interval", seconds=30, id="cleanup")

# Run every 5 minutes
scheduler.add_job(refresh_cache, "interval", minutes=5, id="cache_refresh")

# Run every 2 hours, starting 10 seconds from now
scheduler.add_job(refresh_cache, "interval", hours=2, next_run_time=time.time() + 10)

scheduler.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    scheduler.shutdown()
```

### Cron trigger — cron-style scheduling

```python
from apscheduler.schedulers.background import BackgroundScheduler

def send_daily_report():
    print("Sending daily report...")

def weekly_backup():
    print("Running weekly backup...")

scheduler = BackgroundScheduler()

# Every day at 9:00 AM
scheduler.add_job(send_daily_report, "cron", hour=9, minute=0, id="daily_report")

# Every Monday at 2:00 AM
scheduler.add_job(weekly_backup, "cron", day_of_week="mon", hour=2, id="weekly_backup")

# Every weekday at 6:00 PM
scheduler.add_job(send_daily_report, "cron", day_of_week="mon-fri", hour=18, id="weekday_report")

# First day of every month at midnight
scheduler.add_job(weekly_backup, "cron", day=1, hour=0, id="monthly_backup")

# Every 15th of January and July at noon
scheduler.add_job(weekly_backup, "cron", month="1,7", day=15, hour=12, id="biannual_backup")

scheduler.start()
```

### Date trigger — one-off scheduled task

```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

def send_reminder(email: str):
    print(f"Sending reminder to {email}")

scheduler = BackgroundScheduler()

# Schedule 1 hour from now
run_time = datetime.now() + timedelta(hours=1)
scheduler.add_job(send_reminder, "date", run_date=run_time, args=["user@example.com"], id="reminder_1")

scheduler.start()
```

### Passing arguments to jobs

```python
def process_order(order_id: int, priority: str = "normal"):
    print(f"Processing order {order_id} with priority {priority}")

# Positional args
scheduler.add_job(process_order, "interval", minutes=10, args=[12345], id="order_12345")

# Keyword args
scheduler.add_job(process_order, "interval", minutes=10, kwargs={"order_id": 12345, "priority": "high"}, id="order_high")
```

### Job stores — persistent scheduling with SQLAlchemy

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
    "coalesce": True,       # Merge missed executions into one
    "max_instances": 1,     # Prevent overlapping runs of same job
    "misfire_grace_time": 60,  # Allow 60s late execution
}

scheduler = BackgroundScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults,
)

scheduler.start()
# Jobs survive restarts — stored in SQLite
```

### Managing jobs dynamically

```python
# Get a job by ID
job = scheduler.get_job("daily_report")
if job:
    print(f"Next run: {job.next_run_time}")

# Pause a job
scheduler.pause_job("daily_report")

# Resume a job
scheduler.resume_job("daily_report")

# Reschedule a job
scheduler.reschedule_job("daily_report", trigger="cron", hour=10, minute=30)

# Remove a job
scheduler.remove_job("daily_report")

# List all jobs
for job in scheduler.get_jobs():
    print(f"{job.id}: next_run={job.next_run_time}")
```

### Error handling and listeners

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

### AsyncScheduler with asyncio

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

### Integration with Flask

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

## Explanation

APScheduler has three trigger types:

- **Interval**: Runs every N seconds, minutes, hours, or days. Simple and predictable.
- **Cron**: Cron-style expressions (day_of_week, hour, minute, month, day). Flexible for complex schedules.
- **Date**: Runs once at a specific datetime. For one-off delayed tasks.

Key concepts:

- **Scheduler**: Manages jobs. `BackgroundScheduler` runs in a thread, `AsyncIOScheduler` integrates with asyncio, `BlockingScheduler` blocks the main thread.
- **JobStore**: Stores job definitions. `MemoryJobStore` (default, lost on restart) or `SQLAlchemyJobStore` (persistent, survives restarts).
- **Executor**: Runs jobs. `ThreadPoolExecutor` for sync jobs, `ProcessPoolExecutor` for CPU-bound, `AsyncIOExecutor` for async.
- **coalesce**: When a job misses multiple runs, merge them into one execution instead of running multiple catch-up runs.
- **max_instances**: Prevents overlapping runs of the same job. Set to 1 to avoid concurrent execution.
- **misfire_grace_time**: How late a job can run after its scheduled time before it is skipped.

## Variants

| Tool | Type | Requires Broker | Use When |
|------|------|----------------|----------|
| APScheduler | In-process | No | Simple periodic tasks |
| Celery | Distributed | Yes (Redis/RabbitMQ) | Heavy distributed jobs |
| RQ | Distributed | Yes (Redis) | Simple distributed jobs |
| systemd timers | OS-level | No | Server-level cron |
| cron | OS-level | No | Simple server cron |

## Guidelines

- Use `BackgroundScheduler` for web apps (Flask, Django). Use `BlockingScheduler` for standalone scripts.
- Set `max_instances=1` to prevent overlapping runs of long jobs.
- Set `coalesce=True` to avoid running missed jobs multiple times.
- Use persistent job stores (SQLAlchemy) for jobs that must survive restarts.
- Handle job errors with event listeners. Failed jobs should not crash the scheduler.
- Set `misfire_grace_time` to avoid running very late jobs that are no longer relevant.
- Use `ThreadPoolExecutor` for I/O-bound jobs, `ProcessPoolExecutor` for CPU-bound.
- Shut down the scheduler properly on app exit to avoid orphaned threads.
- Use unique job IDs to manage jobs dynamically.

## Common Mistakes

- Not shutting down the scheduler. Orphaned threads keep running after the app exits.
- Allowing overlapping runs. A slow job running every 30 seconds can pile up. Set `max_instances=1`.
- Using `MemoryJobStore` for critical jobs. Jobs are lost on restart. Use `SQLAlchemyJobStore`.
- Not handling job exceptions. A failing job logs an error but continues silently. Add event listeners.
- Running the scheduler in the main thread of a web app. Use `BackgroundScheduler` to avoid blocking requests.
- Forgetting `misfire_grace_time`. Jobs that miss their window run immediately on startup, potentially overloading the system.
- Not using unique job IDs. Duplicate jobs are created on restart with `MemoryJobStore`.

## Frequently Asked Questions

### Can APScheduler replace Celery?

For simple periodic tasks, yes. APScheduler is simpler and does not require a broker. For heavy distributed task processing, Celery is more reliable with retries, task routing, and worker scaling.

### How do I prevent overlapping job executions?

Set `max_instances=1` in job defaults or per job. If a job is still running when the next scheduled time arrives, the new execution is skipped.

### What happens if the server is down when a job is scheduled?

With `MemoryJobStore`, the job is lost. With `SQLAlchemyJobStore`, the job is stored and runs on next startup if within `misfire_grace_time`. Set `coalesce=True` to merge multiple missed runs into one.

### Can I run async functions with APScheduler?

Yes. Use `AsyncIOScheduler` with `AsyncIOExecutor`. The scheduler integrates with the asyncio event loop and runs async jobs as coroutines.
