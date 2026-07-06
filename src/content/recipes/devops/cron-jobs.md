---
contentType: recipes
slug: cron-jobs
title: "Cron Jobs"
description: "How to schedule and manage recurring tasks using cron syntax across Linux, Python, and Node.js."
metaDescription: "Practical cron job examples in Linux, Python (schedule library), and Node.js (node-cron). Learn cron syntax, scheduling patterns, and what works."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - automation
  - cron
  - ci-cd
  - deployment
relatedResources:
  - /recipes/docker-basics
  - /recipes/git-workflow
  - /patterns/design/observer-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical cron job examples in Linux, Python (schedule library), and Node.js (node-cron). Learn cron syntax, scheduling patterns, and what works."
  keywords:
    - cron jobs
    - scheduled tasks
    - task automation
    - cron syntax
    - python schedule
    - node-cron
    - linux cron
    - recurring tasks
---

## Overview

Cron is the standard Unix job scheduler for running commands at specified intervals. Whether you need to back up databases, send emails, clean logs, or fetch data, cron provides a reliable mechanism for recurring automation.

Beyond system cron, most programming ecosystems offer scheduling libraries that bring cron-like functionality directly into your application.

## When to Use

Use this recipe when:

- Running periodic tasks on a server (backups, cleanups, reports). See [Background Jobs](/recipes/devops/background-jobs) for task queue patterns.
- Scheduling background jobs within an application. See [Scheduled Jobs](/recipes/devops/background-jobs) for serverless cron.
- Replacing manual processes with automated scripts. See [Bash Scripting Automation](/recipes/devops/bash-scripting-automation) for script automation.
- Coordinating distributed job execution. See [RabbitMQ Task Queue](/recipes/messaging/rabbitmq-task-queue) for distributed task coordination.

## Solution

### Linux (System Cron)

```bash
# Edit crontab
crontab -e

# Every day at 3:00 AM
0 3 * * * /usr/local/bin/backup.sh

# Every 15 minutes
*/15 * * * * /usr/local/bin/check-health.sh

# Every Monday at 9:00 AM
0 9 * * 1 /usr/local/bin/weekly-report.sh

# Every first day of the month at midnight
0 0 1 * * /usr/local/bin/monthly-cleanup.sh
```

### Python

```python
import schedule
import time

def job():
    print("Running scheduled task...")

# Every 10 minutes
schedule.every(10).minutes.do(job)

# Every day at 9:30 AM
schedule.every().day.at("09:30").do(job)

# Every Monday
schedule.every().monday.do(job)

while True:
    schedule.run_pending()
    time.sleep(1)
```

### JavaScript (Node.js)

```javascript
const cron = require('node-cron');

// Every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Running every 15 minutes');
});

// Every day at 3:00 AM
cron.schedule('0 3 * * *', () => {
  console.log('Running daily backup');
});

// Every Monday at 9:00 AM
cron.schedule('0 9 * * 1', () => {
  console.log('Running weekly report');
});
```

## Explanation

Cron expressions use 5 fields:

| Field | Allowed Values | Description |
|-------|---------------|-------------|
| Minute | 0-59 | Minute of the hour |
| Hour | 0-23 | Hour of the day |
| Day of Month | 1-31 | Day of the month |
| Month | 1-12 | Month of the year |
| Day of Week | 0-7 (0 and 7 = Sunday) | Day of the week |

Special characters:

- `*` — any value
- `,` — value list separator
| `-` — range of values |
| `*/n` — every n steps |

## Common Schedules

| Expression | Schedule |
|-----------|----------|
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 0 * * *` | Every day at midnight |
| `0 9 * * 1` | Every Monday at 9 AM |
| `0 0 1 * *` | First day of every month |
| `0 0 * * 0` | Every Sunday at midnight |

## What Works

- **Use absolute paths** for commands and scripts in crontab
- **Redirect output** to a log file or `/dev/null` to avoid mail spam
- **Set a specific timezone** if your jobs depend on business hours
- **Use a process manager** (systemd, PM2) for application-level schedulers
- **Add error handling** and alerting for failed scheduled tasks
- **Test expressions** with online cron validators before deploying

## Common Mistakes

- Forgetting to make scripts executable (`chmod +x`)
- Using relative paths that fail in cron's minimal environment
- Not handling overlapping job executions (use locking)
- Ignoring daylight saving time changes
- Running too frequent jobs without rate limiting or backoff

## Frequently Asked Questions

**Q: How do I see which cron jobs are running?**
A: Use `crontab -l` for the current user, or `sudo cat /var/spool/cron/crontabs/` for system jobs.

**Q: Can I run cron jobs inside a Docker container?**
A: Yes, but the container must stay running. Consider using the host's cron or an external scheduler like Kubernetes CronJobs.

**Q: What happens if a job takes longer than its interval?**
A: By default, overlapping jobs will run concurrently. Use file locks or a job queue to prevent overlap.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Java (Quartz Scheduler)

```java
import org.quartz.*;
import org.quartz.impl.StdSchedulerFactory;

public class CronScheduler {
    public static void main(String[] args) throws SchedulerException {
        Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();

        JobDetail job = JobBuilder.newJob(BackupJob.class)
            .withIdentity("backupJob", "group1")
            .build();

        // Every day at 3:00 AM
        Trigger trigger = TriggerBuilder.newTrigger()
            .withIdentity("backupTrigger", "group1")
            .withSchedule(CronScheduleBuilder.cronSchedule("0 0 3 * * ?"))
            .build();

        scheduler.scheduleJob(job, trigger);
        scheduler.start();
    }

    public static class BackupJob implements Job {
        @Override
        public void execute(JobExecutionContext context) {
            System.out.println("Running backup: " + java.time.LocalDateTime.now());
        }
    }
}
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 3 * * *"  # Every day at 3:00 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: backup-tool:v1.2
            command: ["/bin/sh", "-c"]
            args: ["pg_dump $DATABASE_URL > /backup/$(date +%Y%m%d).sql"]
            envFrom:
            - secretRef:
                name: db-credentials
          restartPolicy: OnFailure
          activeDeadlineSeconds: 3600  # Kill after 1 hour
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  concurrencyPolicy: Forbid  # Prevent overlapping runs
```

### Go (robfig/cron)

```go
package main

import (
    "fmt"
    "github.com/robfig/cron/v3"
)

func main() {
    c := cron.New()

    // Every 15 minutes
    c.AddFunc("*/15 * * * *", func() {
        fmt.Println("Health check running...")
    })

    // Every day at 3:00 AM
    c.AddFunc("0 3 * * *", func() {
        fmt.Println("Daily backup running...")
    })

    // With seconds field (optional)
    // c.AddFunc("0 */10 * * * *", func() { ... }) // Every 10 seconds

    c.Start()
    select {} // Block forever
}
```

### systemd Timer (Alternative to Cron)

```ini
# /etc/systemd/system/backup.service
[Unit]
Description=Database Backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
User=backup
Environment=DATABASE_URL=postgres://localhost/mydb
```

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Run backup daily at 3:00 AM

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true  # Run missed jobs after boot

[Install]
WantedBy=timers.target
```

```bash
# Enable and start the timer
$ sudo systemctl enable backup.timer
$ sudo systemctl start backup.timer
$ systemctl list-timers --all
```

### Preventing Overlapping Executions with flock

```bash
# crontab entry with flock to prevent overlap
0 3 * * * /usr/bin/flock -n /tmp/backup.lock /usr/local/bin/backup.sh

# -n: non-blocking, fail if lock is held
# -w 60: wait up to 60 seconds for the lock
0 * * * * /usr/bin/flock -w 60 /tmp/cleanup.lock /usr/local/bin/cleanup.sh
```

### Cron Environment Variables

```bash
# Cron has a minimal PATH. Set it explicitly in crontab:
PATH=/usr/local/bin:/usr/bin:/bin
SHELL=/bin/bash
MAILTO=alerts@example.com

# Or source a profile at the start of each job
0 3 * * * . /home/user/.bashrc && /usr/local/bin/backup.sh
```

### Python with APScheduler (Advanced)

```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backup_job():
    logger.info("Starting database backup...")
    # Backup logic here
    logger.info("Backup completed.")

scheduler = BackgroundScheduler(timezone="UTC")

# Every day at 3:00 AM UTC
scheduler.add_job(
    backup_job,
    CronTrigger(hour=3, minute=0),
    id="backup",
    max_instances=1,  # Prevent overlap
    coalesce=True,    # Merge missed runs
)

# Every 15 minutes with jitter
scheduler.add_job(
    health_check,
    CronTrigger(minute="*/15"),
    id="health_check",
    max_instances=1,
    jitter=60,  # Random delay up to 60 seconds
)

scheduler.start()
```

## Additional Best Practices

7. **Use `flock` or distributed locks.** Prevent overlapping job executions:

```bash
# File lock for single-server jobs
/usr/bin/flock -n /tmp/job.lock /path/to/job.sh
```

```python
# Redis lock for distributed jobs
import redis
import fcntl

r = redis.Redis()
lock = r.lock("backup-job", timeout=3600, blocking_timeout=10)
if lock.acquire(blocking=False):
    try:
        run_backup()
    finally:
        lock.release()
else:
    print("Another instance is running, skipping.")
```

8. **Log to structured format.** Make cron job logs parseable:

```bash
#!/bin/bash
# backup.sh
logger -t backup "started at $(date -Iseconds)"
pg_dump "$DATABASE_URL" > /backup/$(date +%Y%m%d).sql 2>&1
if [ $? -eq 0 ]; then
    logger -t backup "completed successfully"
else
    logger -t backup "FAILED with exit code $?"
    exit 1
fi
```

## Additional Common Mistakes

6. **Not setting `MAILTO`**. Cron emails output by default. Set `MAILTO=""` to disable or route to an alert system:

```bash
# Disable email notifications
MAILTO=""
0 3 * * * /usr/local/bin/backup.sh > /dev/null 2>&1

# Or route to a monitoring address
MAILTO=alerts@example.com
```

7. **Using `%` in crontab without escaping.** The `%` character is special in crontab (converted to newline):

```bash
# Wrong: % will be interpreted as newline
0 3 * * * date +%Y%m%d > /tmp/date.txt

# Correct: escape % with backslash
0 3 * * * date +\%Y\%m\%d > /tmp/date.txt
```

## Additional FAQ

### How do I handle timezone-specific cron jobs?

Set the `CRON_TZ` or `TZ` variable in crontab:

```bash
# Run at 9:00 AM New York time
CRON_TZ=America/New_York
0 9 * * * /usr/local/bin/report.sh
```

For Kubernetes CronJobs, use `timeZone` in the spec:

```yaml
spec:
  schedule: "0 9 * * *"
  timeZone: "America/New_York"
```

### How do I monitor cron job failures?

Use a dead man's switch pattern. Each job pings a monitoring service on success. If no ping arrives, the monitor alerts:

```bash
#!/bin/bash
# At the end of a successful job
curl -s https://healthchecks.io/ping/your-uuid-here

# On failure
curl -s https://healthchecks.io/ping/your-uuid-here/fail
```

## Performance Tips

1. **Stagger job schedules.** Avoid running multiple heavy jobs at the same time:

```bash
# Bad: all at midnight
0 0 * * * /usr/local/bin/backup.sh
0 0 * * * /usr/local/bin/cleanup.sh
0 0 * * * /usr/local/bin/report.sh

# Good: stagger by 30 minutes
0 0 * * * /usr/local/bin/backup.sh
30 0 * * * /usr/local/bin/cleanup.sh
0 1 * * * /usr/local/bin/report.sh
```

2. **Use jitter for distributed jobs.** Add random delay to prevent thundering herd:

```python
import random
import time

def run_with_jitter(max_delay=300):
    delay = random.randint(0, max_delay)
    time.sleep(delay)
    run_job()
```

3. **Set timeouts.** Prevent runaway jobs from consuming resources:

```bash
# Kill job after 1 hour
0 3 * * * timeout 3600 /usr/local/bin/backup.sh
```

```yaml
# Kubernetes CronJob
spec:
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3600
```

4. **Clean up old job artifacts.** Set retention policies:

```bash
# Delete backups older than 30 days
0 4 * * * find /backup -name "*.sql" -mtime +30 -delete
```

```yaml
# Kubernetes CronJob
spec:
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
```
