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
  - /recipes/python-async-http-requests
  - /recipes/docker-health-check-configuration
  - /patterns/circuit-breaker-pattern
  - /recipes/cron-jobs
  - /guides/complete-guide-python-asyncio-production
  - /guides/complete-guide-python-asyncio
lastUpdated: "2026-08-14"
publishedAt: "2026-07-02"
author: Mathias Paulenko
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

APScheduler lets you run cron-like jobs from inside your Python process, without standing up cron, systemd, or a broker like Celery. It handles interval, cron, and one-shot date triggers; it can persist jobs to a database; and it runs background jobs in-process without blocking the main thread. That makes it useful for small to medium cron-like work, but don't treat it as a distributed scheduler - that's the fastest way to end up with the same job running twice.

This recipe covers the three triggers, SQLAlchemy-backed job stores, background scheduling, and the settings that keep slow or missed jobs from causing trouble.

## When to Use

Use APScheduler when you need to run tasks on a regular interval or at a calendar time from inside a Python app. It's also a good choice for cron-like behavior without touching the OS scheduler or deploying a separate service. Use it for one-off delayed tasks like sending a reminder or running a deferred export, and for in-process scheduling when you don't need distributed workers or guaranteed delivery.

## When NOT to Use

Don't use APScheduler when:

- You need distributed task queues, retries, or worker scaling: in those cases, reach for Celery or RQ instead.
- The OS scheduler is enough: server-level cron is usually simpler and more reliable; see [cron jobs](/recipes/cron-jobs/) or systemd timers.
- You need strict exactly-once semantics across many processes.
- You're running many CPU-bound jobs in a single process without a process pool or a distributed queue.

## Solution

### Install APScheduler

```bash
pip install APScheduler
```

### Interval trigger - run every N seconds/minutes/hours

```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

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
scheduler.add_job(refresh_cache, "interval", hours=2, next_run_time=datetime.now() + timedelta(seconds=10))

scheduler.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    scheduler.shutdown()
```

### Cron trigger - cron-style scheduling

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

### Date trigger - one-off scheduled task

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

### Job stores - persistent scheduling with SQLAlchemy

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
# Jobs survive restarts - stored in SQLite
```

### Managing jobs dynamically

```python
# Add a job
scheduler.add_job(my_function, "interval", minutes=5, id="new_job")

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

### Run CPU-bound jobs in a process pool

```python
from apscheduler.executors.pool import ProcessPoolExecutor

executors = {
    "default": ProcessPoolExecutor(max_workers=4),
}
```

APScheduler hands CPU-bound work off to a pool of worker processes, so the main process stays responsive. For I/O-bound work, use a thread pool executor; the code example above uses a process pool for CPU-bound tasks.

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

APScheduler separates three concerns: when a job runs, where the job definition lives, and how the job is executed. The trigger decides the schedule, the job store keeps the job definition, and the executor runs it.

The interval trigger waits N seconds, minutes, hours, or days and fires again. The cron trigger is what you want for calendar rules; it uses the same fields as Unix cron, which means day_of_week, hour, and minute behave the same way. The date trigger is for one-shot runs at a specific datetime, like a delayed export or reminder.

The settings that matter most when a job is late or still running are coalesce, max_instances, and misfire_grace_time. Coalesce merges several missed runs into one, so the scheduler doesn't dump a burst of work on startup. A max_instances value of 1 stops a slow job from overlapping with itself. misfire_grace_time is the late window: a job that's only a little behind still runs; a job that's too late is skipped.

You can mix schedulers, job stores, and executors: BackgroundScheduler lives on a background thread, so it doesn't block request handling and fits inside a web app like Flask or FastAPI; BlockingScheduler keeps the process alive and works well for a standalone script; AsyncIOScheduler is built for the asyncio event loop, so it runs async jobs as coroutines alongside other asyncio tasks. An in-memory job store is fast but loses everything on restart, while a SQLAlchemy-backed store survives restarts and can be shared if you respect the single-scheduler rule. A thread pool is fine for I/O-bound work, a process pool helps with CPU-bound work, and an async executor works with the async scheduler.

## Variants

| Tool | Type | Requires Broker | Best For |
|------|------|----------------|----------|
| APScheduler | In-process | No | Simple periodic tasks |
| Celery | Distributed | Yes (Redis/RabbitMQ) | Heavy distributed jobs |
| RQ | Distributed | Yes (Redis) | Simple distributed jobs |
| systemd timers | OS-level | No | Server-level cron |
| cron | OS-level | No | Simple server cron |

## Best Practices

- Pick the scheduler for your runtime: BackgroundScheduler for web apps, BlockingScheduler for standalone scripts, AsyncIOScheduler for asyncio.
- For long jobs, set max_instances to 1: that prevents overlap. Set coalesce to True as well so missed runs don't turn into a restart storm.
- Use a persistent job store when the schedule must survive restarts: SQLite is fine for a single instance; a real database is better if the store is shared.
- Listen for EVENT_JOB_ERROR: a failing job won't crash the scheduler, which is exactly why you need a log entry somewhere you'll actually look.
- Set misfire_grace_time to something that fits the task: sixty seconds is plenty for cleanup jobs; an hourly report can tolerate a few minutes.
- Match the executor to the work: ThreadPoolExecutor for I/O-bound jobs, ProcessPoolExecutor for CPU-bound jobs, AsyncIOExecutor with the async scheduler.
- Always call scheduler.shutdown() on exit, and use unique job IDs: reusing an ID is an easy way to end up with the same job twice, especially after a restart when the in-memory store is empty.

## Common Mistakes

- A background scheduler does nothing until you call its start method, and that's an easy step to miss. In Flask, start the scheduler once when the app boots instead of on every request.
- The process won't exit cleanly: orphaned daemon threads can keep the process from exiting, or keep running in the background when you don't mean them to. Always shut the scheduler down when the app exits.
- Jobs pile up: a slow job that triggers every 30 seconds can overlap with itself. A max_instances of 1 means the next trigger is skipped while the current one is still going.
- Critical jobs disappear on restart: an in-memory store loses jobs when the process stops, so use a SQLAlchemy-backed store if the schedule must survive.
- Silent job failures: a failing job logs an error but keeps going. A listener that logs errors explicitly is a small addition that pays off quickly.
- Blocking the request loop: a blocking scheduler in a web app stops request handling, so choose a background scheduler or the asyncio scheduler instead.
- A restart storm: if you forget misfire_grace_time, jobs that missed their window can fire immediately on startup and overload the system.
- Duplicate job IDs: reusing an ID after a restart, especially with an in-memory store, creates duplicate jobs.

## Production Notes

- Jobs fire at the wrong time: APScheduler uses the scheduler's timezone. If you pass naive datetime objects or the server changes time zones, jobs fire at unexpected times. Install pytz (or use zoneinfo on Python 3.9+) and pass timezone-aware datetimes, especially for cron triggers.
- The process hangs on exit: BackgroundScheduler uses daemon threads that won't keep the main process alive and will be killed abruptly when the process exits. Call shutdown() with a timeout so active jobs can finish.
- No failure visibility: by default, job output goes to stdout and APScheduler logs at WARNING. In production, wire up a logger and a listener so you know when jobs fail or misfire.
- Duplicate runs across workers: a shared SQLAlchemy job store should only have one active scheduler process. Several schedulers polling the same store can race and run the same job twice. A process lock or a single-instance deployment stops that from happening.
- No health signal: if the scheduler is critical, expose a health endpoint that checks the scheduler status, recent job executions, and the listener event stream. See [Docker health check configuration](/recipes/docker-health-check-configuration/) for a concrete pattern.
- next_run_time takes a datetime: it expects a datetime, not a Unix timestamp, so pass datetime.now() + timedelta(...) or a timezone-aware datetime. In Flask, don't rely on before_request to start the scheduler. With two or more workers or threads you can end up with several instances. Start the scheduler once when the app boots, and if the app has more than one gunicorn worker, use a process lock or a single dedicated process to avoid duplicate runs.

## FAQ

### Can APScheduler replace Celery?

For simple periodic tasks, APScheduler is a good fit; it's lighter and doesn't need a broker. For heavy distributed work with retries, task routing, and worker scaling, Celery is the better choice.

### How do I prevent overlapping job executions?

Set it in the job defaults to apply the rule to all jobs, or on the job itself to apply it to just one. The next run is skipped whenever the previous one is still going.

### What happens if the server is down when a job is scheduled?

If you rely on an in-memory store, the job disappears when the process stops. With a SQLAlchemy store, the job is kept and runs on the next startup if it's still within the grace time. Set coalesce to True to merge several missed runs into one.

### Can I run async functions with APScheduler?

For async functions, use AsyncIOScheduler with AsyncIOExecutor, which integrates into the asyncio event loop and runs async jobs as coroutines.

### How do I run different jobs on different processes?

A ProcessPoolExecutor handles CPU-bound work. The Solution section has a configuration example that sets up four worker processes.

### Can I dynamically add or remove jobs at runtime?

Yes. You can manage jobs while the scheduler is running; the "Managing jobs dynamically" example in the Solution section shows the calls.

## Key Takeaways

APScheduler is an in-process scheduler for Python, not a distributed task queue. It supports interval, cron, and one-shot date triggers. Use a background scheduler in web apps and a blocking scheduler in standalone scripts. Set max_instances to 1 and coalesce to True so slow or missed jobs don't pile up. Store jobs in a SQLAlchemy-backed store if they must survive restarts, and always handle errors with listeners and shut down the scheduler cleanly.

## Further Reading

- [APScheduler documentation](https://apscheduler.readthedocs.io/en/stable/)
- [Flask with APScheduler guide](https://apscheduler.readthedocs.io/en/stable/userguide.html#scheduling-background-jobs)
- [APScheduler job stores and executors](https://apscheduler.readthedocs.io/en/stable/userguide.html#configuring-the-scheduler)
- Internal: [Cron Jobs](/recipes/cron-jobs/)
- Internal: [Docker health check configuration](/recipes/docker-health-check-configuration/)
- Internal: [Circuit breaker pattern](/patterns/circuit-breaker-pattern/)
- Internal: [Python asyncio production guide](/guides/complete-guide-python-asyncio-production/)
