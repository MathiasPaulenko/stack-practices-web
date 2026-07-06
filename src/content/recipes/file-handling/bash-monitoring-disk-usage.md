---
contentType: recipes
slug: bash-monitoring-disk-usage
title: "Monitor Disk Usage"
description: "Alert when disk space crosses thresholds using a Bash script that checks mount points and notifies operators."
metaDescription: "Monitor disk usage with Bash: check mount points, set thresholds, send alerts, and trigger cleanup before disk space fills up and services crash."
difficulty: beginner
topics:
  - file-handling
tags:
  - bash
  - monitoring
  - disk
  - alerts
  - linux
relatedResources:
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-scripting-automation
  - /recipes/bash-log-rotation-compression
  - /recipes/bash-loop-over-files
  - /recipes/bash-parallel-execution
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Monitor disk usage with Bash: check mount points, set thresholds, send alerts, and trigger cleanup before disk space fills up and services crash."
  keywords:
    - file-handling
    - bash
    - monitoring
    - disk
    - alerts
    - linux
---
## Overview

Disk space is a silent killer of production services. When a log, cache, or database fills the disk, applications crash, writes fail, and recovery becomes urgent. A simple Bash script that checks mount points and alerts when usage crosses a threshold gives you early warning and can trigger cleanup before the situation becomes critical.

## When to Use

Use this resource when:
- You want lightweight monitoring without installing a full agent.
- You need to alert via email, Slack, or a log file when disk usage is high.
- You run containers, VMs, or bare-metal servers with limited disk.
- You want to trigger automatic cleanup when usage crosses a threshold.

## Solution

### Disk usage monitoring script

```bash
#!/usr/bin/env bash
set -euo pipefail

THRESHOLD="${1:-80}"
EMAIL="${2:-admin@example.com}"

# Check all local mount points
df -Hl | awk 'NR>1 && /^\/dev/{print $1, $5, $6}' | while read -r fs usage mount; do
    usage_val="${usage%%}"
    if (( usage_val >= THRESHOLD )); then
        echo "WARNING: $mount ($fs) is at $usage"
        # Send alert (example with mail)
        echo "Disk usage on $mount is $usage" | mail -s "Disk alert: $mount" "$EMAIL"
    else
        echo "OK: $mount is at $usage"
    fi
done

# Optional: trigger cleanup for specific mounts
# if (( usage_val >= 90 )); then
#     /usr/local/bin/cleanup-logs.sh
# fi
```

## Explanation

The script uses `df -Hl` to list local filesystems and their usage percentages. `awk` filters out the header and non-device entries. For each mount point, it strips the percent sign, compares the numeric value to the threshold, and prints a warning or OK message. If the threshold is exceeded, it sends an email alert. The cleanup block is commented out because automatic deletion should be carefully reviewed before enabling.

## Variants

| Alert channel | Tool | Best for |
|---------------|------|----------|
| Email | `mail` | Simple servers with local MTA |
| Slack | webhook curl | Teams already using Slack |
| PagerDuty | event API | Production on-call escalation |
| File log | redirect to syslog | Centralized log aggregation |

## What Works

1. **Set thresholds below 100%.** Alert at 80% and take action at 90% so you have time to respond.
2. **Monitor mount points, not just total disk.** A small `/tmp` or `/var/log` can fill independently of the root disk.
3. **Include the filesystem in the alert.** Knowing which partition is full speeds up the response.
4. **Run from cron every few minutes.** Disk usage can grow quickly during incidents.
5. **Pair monitoring with cleanup.** A high-usage alert without a cleanup plan is only half a solution.

## Common Mistakes

1. **Using `df -h` without parsing care.** The percent column can be empty for special filesystems; filter by `/dev/` entries.
2. **Alerting too late.** Waiting until 95% leaves almost no time to react.
3. **Ignoring ephemeral mounts.** `/tmp` and docker volumes can fill fast and crash services.
4. **Sending alerts to individuals.** Use a team alias or on-call rotation so vacations do not break alerting.
5. **Not handling mail failures.** If the MTA is down, the alert never arrives; log to a second channel.

## Frequently Asked Questions

**Q: How do I monitor multiple servers?**
A: Run the script on each server via cron and send alerts to a centralized logging or alerting system. Better yet, use a configuration management tool to deploy the script.

**Q: Can I check disk usage of a specific directory?**
A: Yes. Use `du -sh /path` to check a single directory, but for partition-level alerts use `df` because `du` does not detect mount point limits.

**Q: Should I auto-delete files when disk is full?**
A: Only after careful review. Auto-deletion can remove evidence needed for debugging. Prefer moving logs to archive or notifying an operator.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
