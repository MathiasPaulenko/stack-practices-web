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
