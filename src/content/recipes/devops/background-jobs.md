---
contentType: recipes
slug: background-jobs
title: "Background Jobs"
description: "How to schedule and run background jobs using cron, task queues, and workers."
metaDescription: "Learn to schedule background jobs in Python, JavaScript, and Java. Covers cron, Celery, BullMQ, and ScheduledExecutorService."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - ci-cd
  - automation
  - deployment
  - infrastructure
relatedResources:
  - /recipes/cron-jobs
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
  - /patterns/command-pattern
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to schedule background jobs in Python, JavaScript, and Java. Covers cron, Celery, BullMQ, and ScheduledExecutorService."
  keywords:
    - background-jobs
    - cron
    - queue
    - celery
    - bullmq
    - workers
    - python
    - javascript
    - java
---
## Overview

Background jobs offload slow or non-critical work from the request/response cycle. Sending emails, generating reports, processing images, or syncing with third-party APIs should never block a user's HTTP request. Here is a working implementation of task queues, cron scheduling, and worker patterns in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Sending emails or SMS that can wait a few seconds. See [Email Templates MJML](/recipes/frontend/email-templates-mjml) for email content generation.
- Generating exports, reports, or PDFs that take >1s. See [Generate PDFs](/recipes/file-handling/generate-pdfs) for document generation.
- Processing uploaded images, videos, or documents. See [Image Optimization](/recipes/file-handling/image-optimization) for media processing.
- Syncing data with external APIs on a schedule. See [Call REST API](/recipes/api/call-rest-api) for API client patterns.
- Aggregating analytics or running nightly cleanup tasks. See [Scheduled Jobs](/recipes/devops/background-jobs) for cron-based serverless tasks.

## Solution

### Python (Celery + Redis)

```python
from celery import Celery
from celery.schedules import crontab

app = Celery("tasks", broker="redis://localhost:6379/0", backend="redis://localhost:6379/0")

@app.task(bind=True, max_retries=3)
def send_email(self, to, subject, body):
    try:
        # Simulate email sending
        print(f"Sending email to {to}")
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)

@app.task
def generate_report(user_id):
    print(f"Generating report for user {user_id}")
    return f"/reports/{user_id}.pdf"

# Schedule periodic tasks
app.conf.beat_schedule = {
    "daily-cleanup": {
        "task": "tasks.cleanup_old_logs",
        "schedule": crontab(hour=2, minute=0),
    },
}

# Enqueue from web app
send_email.delay("alice@example.com", "Welcome", "Hello!")
```

### JavaScript (BullMQ + Redis)

```javascript
const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({ host: "localhost", port: 6379, maxRetriesPerRequest: null });

const emailQueue = new Queue("emails", { connection });

const worker = new Worker("emails", async (job) => {
  const { to, subject, body } = job.data;
  console.log(`Sending email to ${to}`);
  // Email sending logic here
  return { sent: true };
}, { connection });

// Add job from API route
async function enqueueEmail(to, subject, body) {
  await emailQueue.add("send-email", { to, subject, body }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
}

// Cron job with BullMQ
const cronQueue = new Queue("cron", { connection });
await cronQueue.add("cleanup", {}, { repeat: { cron: "0 2 * * *" } });
```

### Java (ScheduledExecutorService + Spring @Scheduled)

```java
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import java.util.concurrent.CompletableFuture;

@Service
public class JobService {

    // Cron job: runs every day at 2 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupOldLogs() {
        System.out.println("Running nightly cleanup");
    }

    // Fixed rate: runs every 5 minutes
    @Scheduled(fixedRate = 300_000)
    public void syncExternalData() {
        System.out.println("Syncing with external API");
    }
}

// Manual async execution
ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
executor.setCorePoolSize(4);
executor.initialize();

CompletableFuture.runAsync(() -> {
    System.out.println("Running background task");
}, executor);
```

## Explanation

Background jobs separate **what** needs to happen from **when** it happens. The basic architecture has three components:

1. **Producer (API)**: Enqueues a job when an event occurs (user signs up, file uploaded).
2. **Broker (Queue)**: Redis, RabbitMQ, or Amazon SQS hold jobs durably until a worker picks them up.
3. **Consumer (Worker)**: A separate process polls the queue and executes jobs. Workers can run on different machines from the web API.

Cron jobs are a special case: instead of being triggered by user events, they run on a schedule. Most queue systems (Celery Beat, BullMQ, Spring @Scheduled) support both patterns.

## Variants

| Tool | Language | Persistence | Scheduling | Best For |
|------|----------|-------------|------------|----------|
| Celery + Redis | Python | Redis (or RabbitMQ) | Celery Beat | Full-featured task queues |
| BullMQ | JavaScript | Redis | Built-in cron | Node.js, TypeScript projects |
| Sidekiq | Ruby | Redis | Sidekiq-cron | Ruby on Rails |
| Hangfire | C# | SQL Server/Redis | Built-in | .NET ecosystem |
| Spring @Scheduled | Java | N/A (in-process) | Cron expressions | Simple scheduled tasks |
| AWS Lambda + EventBridge | Any | N/A (serverless) | EventBridge rules | Cloud-native, pay-per-use |

## What Works

- **Make jobs idempotent**: Running the same job twice should produce the same result. Use unique job IDs to prevent duplicates.
- **Set retry policies with backoff**: Transient failures (network blips) should retry 3-5 times with exponential backoff.
- **Log job context**: Include job ID, user ID, and timestamp in every log line for debugging.
- **Separate queues by priority**: Put payment processing in a `high` queue, email sending in a `default` queue.
- **Monitor dead letter queues**: Jobs that fail all retries need manual inspection. Alert when DLQ grows.

## Common Mistakes

- **Running heavy tasks in the web process**: Generating a 100-page PDF during an HTTP request will timeout and degrade user experience.
- **No retry or dead letter handling**: A single Redis restart can lose all pending jobs if you don't persist them.
- **Assuming exact cron timing**: Cron is "run at or after" the scheduled time, not exactly at. Don't depend on millisecond precision.
- **Not handling worker crashes**: If a worker dies mid-job, the job may be lost. Use acknowledgments and visibility timeouts.
- **Overloading the queue**: Enqueuing 100K jobs at once can overwhelm workers. Use rate limiting or batch enqueue.

## Frequently Asked Questions

### Should I use Redis or RabbitMQ for my task queue?

**Redis** is simpler to operate and sufficient for most workloads (<10K jobs/sec). **RabbitMQ** offers better durability guarantees, routing flexibility, and AMQP protocol support. For mission-critical financial or healthcare data, RabbitMQ or Amazon SQS is safer. For most web apps, Redis is fine.

### How do I pass large payloads to a background job?

Don't pass large data in the job itself. Store the data in a database or object storage (S3) and pass only the ID to the worker. This keeps the queue lightweight and prevents Redis/RabbitMQ from running out of memory.

### What happens if a worker crashes while processing a job?

It depends on the queue system. **Celery** uses acknowledgments: the job is removed from the queue only after completion. **BullMQ** uses a visibility timeout: if the worker doesn't complete the job in time, it reappears in the queue. **Spring @Scheduled** runs in-process, so a JVM crash loses the in-flight task. Always design for at-least-once delivery and idempotent jobs.

### Docker Compose Setup for Local Development

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  worker:
    build: .
    command: celery -A tasks worker --loglevel=info --concurrency=4
    depends_on: [redis]
    environment:
      - REDIS_URL=redis://redis:6379/0

  beat:
    build: .
    command: celery -A tasks beat --loglevel=info
    depends_on: [redis, worker]
    environment:
      - REDIS_URL=redis://redis:6379/0

  api:
    build: .
    ports: ["8000:8000"]
    depends_on: [redis]
    environment:
      - REDIS_URL=redis://redis:6379/0
```

### Priority Queues in Celery

```python
from celery import Celery

app = Celery("tasks", broker="redis://localhost:6379/0")

# Define queues with priorities
app.conf.task_queues = {
    "high": Queue("high", routing_key="high.#"),
    "default": Queue("default", routing_key="default.#"),
    "low": Queue("low", routing_key="low.#"),
}

app.conf.task_routes = {
    "tasks.process_payment": {"queue": "high"},
    "tasks.send_email": {"queue": "default"},
    "tasks.cleanup_logs": {"queue": "low"},
}

# Enqueue with priority
process_payment.apply_async(args=[order_id], queue="high")
```

### Dead Letter Queue Handling in BullMQ

```javascript
const { Queue, Worker, QueueEvents } = require("bullmq");

const emailQueue = new Queue("emails", { connection });

// Worker with failed job handling
const worker = new Worker("emails", async (job) => {
  const { to, subject, body } = job.data;
  // Simulate failure for demo
  if (to.includes("fail")) throw new Error("Simulated failure");
  console.log(`Email sent to ${to}`);
}, {
  connection,
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
});

// Listen for failed jobs
worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
  // Move to dead letter queue for manual inspection
  dlqQueue.add("failed-email", job.data, { removeOnComplete: true });
});

// Alert when DLQ grows
const dlqEvents = new QueueEvents("dlq", { connection });
dlqEvents.on("completed", () => {
  console.warn("DLQ has new entries — manual inspection needed");
});
```

### Job Progress Tracking

```python
from celery import Celery

app = Celery("tasks", broker="redis://localhost:6379/0")

@app.task(bind=True)
def long_running_task(self, items):
    total = len(items)
    for i, item in enumerate(items):
        # Process item
        process(item)
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"current": i + 1, "total": total, "percent": (i + 1) / total * 100}
        )
    return {"status": "complete", "processed": total}

# Check progress from API
from celery.result import AsyncResult
result = AsyncResult(task_id)
print(result.info)  # {'current': 50, 'total': 100, 'percent': 50.0}
```

## Additional Best Practices

1. **Set timeouts on every job.** A stuck job blocks a worker slot indefinitely:

```python
@app.task(bind=True, time_limit=300, soft_time_limit=240)
def process_video(self, video_id):
    # Soft limit: 240s — cleanup and save partial work
    # Hard limit: 300s — SIGKILL
    pass
```

2. **Use separate worker processes for different task types.** CPU-bound and I/O-bound tasks need different concurrency:

```bash
# I/O-bound: high concurrency
celery -A tasks worker -Q emails --concurrency=20

# CPU-bound: low concurrency (match CPU cores)
celery -A tasks worker -Q video_processing --concurrency=4
```

3. **Graceful shutdown with warmup.** Let workers finish current jobs before stopping:

```bash
# Docker stop with grace period
docker stop -t 30 worker

# Celery: send TERM signal, wait for jobs to complete
kill -SIGTERM $(cat /var/run/celery/worker.pid)
```

## Additional Common Mistakes

1. **Not setting concurrency limits.** Too many workers can exhaust database connections:

```python
# Bad: unlimited concurrency
celery -A tasks worker --concurrency=100

# Good: match to DB connection pool size
celery -A tasks worker --concurrency=10  # DB pool is 20
```

2. **Using cron for everything.** Some tasks are event-driven, not time-driven:

```python
# Bad: poll every minute for new uploads
@shared_task
def check_uploads():
    new = Upload.objects.filter(processed=False)
    for u in new:
        process(u)

# Good: enqueue on upload event
def on_upload_complete(upload_id):
    process_upload.delay(upload_id)
```

3. **Not monitoring queue lag.** Jobs piling up means workers can't keep up:

```bash
# Monitor Redis queue length
redis-cli llen celery

# Alert if queue > 1000
QUEUE_LEN=$(redis-cli llen celery)
if [ "$QUEUE_LEN" -gt 1000 ]; then
  echo "ALERT: Queue backlog: $QUEUE_LEN"
fi
```

## Additional FAQ

### How do I test background jobs locally without Redis?

Use Celery's eager mode for development. Tasks execute synchronously instead of enqueuing:

```python
# settings_dev.py
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
```

### Can I use background jobs with serverless functions?

Yes. AWS Lambda + EventBridge, Google Cloud Tasks, and Azure Functions with Timer triggers all support background processing. The tradeoff: serverless has cold start latency and execution time limits (15 min for Lambda).

### How do I handle job dependencies (task A must complete before task B)?

Use task chains or groups:

```python
from celery import chain, group

# Chain: A -> B -> C (sequential)
workflow = chain(task_a.s(1), task_b.s(), task_c.s())
workflow.apply_async()

# Group: A, B, C in parallel, then D
parallel = group([task_a.s(1), task_b.s(2), task_c.s(3)])
workflow = chord(parallel)(task_d.s())
```

## Performance Tips

1. **Batch small jobs.** Processing 1000 items one-by-one is slower than batching:

```python
@app.task
def process_batch(item_ids):
    items = Item.objects.filter(id__in=item_ids)
    for item in items.iterator():
        process(item)

# Enqueue in batches of 100
for i in range(0, len(ids), 100):
    process_batch.delay(ids[i:i+100])
```

2. **Use prefetch limits.** Prevent one worker from hoarding all jobs:

```bash
# Each worker fetches only 1 job at a time
celery -A tasks worker --prefetch-multiplier=1 --concurrency=4
```

3. **Separate queues by latency requirements.** Real-time jobs need dedicated workers:

```bash
# Dedicated worker for real-time queue (no long-running tasks blocking it)
celery -A tasks worker -Q realtime --concurrency=8

# General worker for batch queue
celery -A tasks worker -Q batch --concurrency=2
```
