---


contentType: recipes
slug: bash-disk-usage-monitor
title: "Monitor Disk Usage with Bash"
description: "Alert when disk space crosses thresholds with bash scripts"
metaDescription: "Monitor disk usage in bash. Set threshold alerts, send email notifications, and automate cleanup when disk space runs low on Linux servers."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - disk-usage
  - monitoring
  - alerts
  - automation
relatedResources:
  - /recipes/bash-backup-rotation
  - /recipes/bash-log-rotation
  - /recipes/bash-scripting-automation
  - /recipes/bash-monitoring-disk-usage
  - /docs/logging-standards-document
  - /recipes/bash-aws-cli-scripts
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Monitor disk usage in bash. Set threshold alerts, send email notifications, and automate cleanup when disk space runs low on Linux servers."
  keywords:
    - bash
    - disk-usage
    - monitoring
    - alerts
    - automation


---
## Overview

Disk space issues cause application crashes, failed writes, and corrupted databases. A monitoring script that checks disk usage and alerts before the disk fills up prevents these problems. Here is how to threshold-based alerts, email notifications, and automatic cleanup of common space hogs.

## When to Use


- For alternatives, see [AWS CLI Automation with Bash](/recipes/bash-aws-cli-scripts/).

- You manage Linux servers and need proactive disk space alerts
- You want to automate cleanup of old logs, temp files, or package caches
- You need different alert thresholds for different partitions
- You are setting up a lightweight monitoring solution without external tools

## Solution

### Basic disk usage check

```bash
#!/bin/bash

THRESHOLD=80
ALERT_EMAIL="admin@example.com"

df -H | grep -vE '^Filesystem|tmpfs|cdrom' | while read -r line; do
    usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    partition=$(echo "$line" | awk '{print $6}')

    if [ "$usage" -ge "$THRESHOLD" ]; then
        echo "WARNING: Partition $partition is at ${usage}% capacity"
    fi
done
```

### Email alert with details

```bash
#!/bin/bash

THRESHOLD=80
ALERT_EMAIL="admin@example.com"
HOSTNAME=$(hostname)

df -H | grep -vE '^Filesystem|tmpfs|cdrom' | while read -r line; do
    usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    partition=$(echo "$line" | awk '{print $6}')
    size=$(echo "$line" | awk '{print $2}')
    used=$(echo "$line" | awk '{print $3}')
    avail=$(echo "$line" | awk '{print $4}')

    if [ "$usage" -ge "$THRESHOLD" ]; then
        SUBJECT="[ALERT] Disk space on ${HOSTNAME}: ${partition} at ${usage}%"
        BODY="Disk space alert on ${HOSTNAME}

Partition: ${partition}
Usage: ${usage}%
Size: ${size}
Used: ${used}
Available: ${avail}

Action required: free up space on this partition."

        echo "$BODY" | mail -s "$SUBJECT" "$ALERT_EMAIL"
        echo "Alert sent for $partition"
    fi
done
```

### Per-partition thresholds

```bash
#!/bin/bash

# Format: "mountpoint:threshold"
PARTITIONS=(
    "/:80"
    "/var:90"
    "/home:75"
    "/tmp:85"
)

ALERT_EMAIL="admin@example.com"

for entry in "${PARTITIONS[@]}"; do
    partition="${entry%%:*}"
    threshold="${entry##*:}"

    usage=$(df -H "$partition" | tail -1 | awk '{print $5}' | sed 's/%//')

    if [ "$usage" -ge "$threshold" ]; then
        echo "ALERT: $partition at ${usage}% (threshold: ${threshold}%)"
        echo "Partition $partition at ${usage}%" | \
            mail -s "Disk alert: $partition" "$ALERT_EMAIL"
    fi
done
```

### Automatic cleanup on high usage

```bash
#!/bin/bash

THRESHOLD=85
LOG_DIR="/var/log"
TMP_DIR="/tmp"
CACHE_DIR="/var/cache/apt/archives"

# Get root partition usage
usage=$(df -H / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$usage" -lt "$THRESHOLD" ]; then
    exit 0
fi

echo "Disk usage at ${usage}%. Starting cleanup..."

# Clean old compressed logs (keep 7 days)
find "$LOG_DIR" -name "*.gz" -type f -mtime +7 -delete
echo "Cleaned old compressed logs"

# Clean tmp files older than 7 days
find "$TMP_DIR" -type f -mtime +7 -delete
echo "Cleaned /tmp"

# Clean apt cache
if [ -d "$CACHE_DIR" ]; then
    apt-get clean
    echo "Cleaned apt cache"
fi

# Check usage after cleanup
new_usage=$(df -H / | tail -1 | awk '{print $5}' | sed 's/%//')
echo "Disk usage after cleanup: ${new_usage}%"
```

### Find largest files and directories

```bash
#!/bin/bash

echo "=== Top 10 largest directories ==="
du -sh /* 2>/dev/null | sort -rh | head -10

echo ""
echo "=== Top 10 largest files ==="
find / -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10

echo ""
echo "=== Disk usage by partition ==="
df -h
```

### Cron setup for continuous monitoring

```bash
# Add to crontab

# Check every hour
0 * * * * /opt/scripts/disk-monitor.sh >> /var/log/disk-monitor.log 2>&1

# Cleanup daily at 3 AM
0 3 * * * /opt/scripts/disk-cleanup.sh
```

### Slack webhook alert

```bash
#!/bin/bash

THRESHOLD=80
SLACK_WEBHOOK="https://hooks.slack.com/services/XXX/YYY/ZZZ"
HOSTNAME=$(hostname)

df -H | grep -vE '^Filesystem|tmpfs|cdrom' | while read -r line; do
    usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    partition=$(echo "$line" | awk '{print $6}')

    if [ "$usage" -ge "$THRESHOLD" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Disk alert on ${HOSTNAME}: ${partition} at ${usage}%\"}" \
            "$SLACK_WEBHOOK"
    fi
done
```

## Explanation

`df -H` reports disk usage in human-readable format (powers of 1000). The script filters out virtual filesystems (`tmpfs`, `cdrom`) and checks each remaining partition against the threshold.

The cleanup script targets common space consumers: old compressed logs, stale temp files, and package caches. It runs only when usage exceeds the threshold, avoiding unnecessary work.

Per-partition thresholds let you be more lenient with `/var` (logs are expected to grow) and stricter with `/` (root partition filling up is critical).

## Variants

| Approach | Alert Method | Cleanup | Use When |
|----------|-------------|---------|----------|
| Basic check | Console output | No | Quick manual checks |
| Email alert | mail command | No | Servers with mail configured |
| Per-partition | Email | No | Mixed partition sizes |
| Auto cleanup | Console | Yes | Self-healing servers |
| Slack webhook | HTTP POST | No | Teams using Slack |

## Guidelines

- Set realistic thresholds. 80% warning, 90% critical is a common pattern.
- Exclude virtual filesystems (`tmpfs`, `devtmpfs`, `cdrom`) from monitoring.
- Test cleanup scripts in a non-production environment first.
- Log all cleanup actions for audit purposes.
- Monitor inode usage separately. A disk can have free space but no inodes.

## Common Mistakes

- Setting the threshold too low (50%) and getting constant false alerts.
- Not excluding `tmpfs` and virtual filesystems. These report 100% usage but are not real disks.
- Running cleanup without checking what will be deleted. `find -delete` is irreversible.
- Forgetting to set up cron. The script runs once and is never checked again.
- Only monitoring root partition. `/var` or `/home` can fill up independently.

## Frequently Asked Questions

### How do I monitor inode usage instead of disk space?

```bash
df -i | grep -vE '^Filesystem|tmpfs' | while read -r line; do
    iuse=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    partition=$(echo "$line" | awk '{print $6}')
    if [ "$iuse" -ge 80 ]; then
        echo "Inode alert: $partition at ${iuse}%"
    fi
done
```

### How do I find what is consuming disk space?

Use `du` to find large directories and `find` to locate large files:

```bash
# Largest directories
du -sh /var/* 2>/dev/null | sort -rh | head -10

# Largest files
find /var -type f -size +100M -exec ls -lh {} +
```

### Can I use this with Docker containers?

Yes. Monitor the Docker data directory (`/var/lib/docker`) and run `docker system prune` in the cleanup script:

```bash
if [ "$usage" -ge "$THRESHOLD" ]; then
    docker system prune -af --volumes
fi
```

### How do I avoid alert fatigue?

Use a state file to track which partitions have already been alerted:

```bash
STATE_FILE="/tmp/disk-alert-state"

# Only alert if not already in state
if [ "$usage" -ge "$THRESHOLD" ] && ! grep -q "$partition" "$STATE_FILE" 2>/dev/null; then
    # Send alert
    echo "$partition" >> "$STATE_FILE"
fi

# Clear state when usage drops
if [ "$usage" -lt "$THRESHOLD" ]; then
    sed -i "/$partition/d" "$STATE_FILE"
fi
```
