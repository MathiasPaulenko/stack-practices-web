---



contentType: recipes
slug: bash-log-rotation
title: "Log Rotation and Compression in Bash"
description: "Rotate and compress application logs automatically with bash scripts"
metaDescription: "Rotate and compress application logs in bash with logrotate and custom scripts. Automate log cleanup, gzip compression, and retention policies."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - log-rotation
  - compression
  - logrotate
  - automation
relatedResources:
  - /recipes/bash-backup-rotation
  - /recipes/bash-scripting-automation
  - /guides/cicd-pipeline-guide
  - /guides/performance-optimization-guide
  - /recipes/ansible-playbook
  - /recipes/bash-aws-cli-scripts
  - /recipes/bash-disk-usage-monitor
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Rotate and compress application logs in bash with logrotate and custom scripts. Automate log cleanup, gzip compression, and retention policies."
  keywords:
    - bash
    - log-rotation
    - compression
    - logrotate
    - automation



---
## Overview

Log files grow without limit. Without rotation, a single log file can fill the disk and crash the application. Below is a practical approach to two approaches: using `logrotate` (the Linux standard) and writing a custom bash script for environments where `logrotate` is not available.

## When to Use

- You run a web server or application that writes to log files continuously
- You need to keep logs compressed to save disk space
- You want automatic cleanup of old log files
- You are setting up log management on a new server

## Solution

### Using logrotate

```bash
# /etc/logrotate.d/myapp

/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 myapp myapp
    postrotate
        systemctl reload myapp
    endscript
}
```

Test the configuration:

```bash
# Dry run
logrotate -d /etc/logrotate.d/myapp

# Force rotation
logrotate -f /etc/logrotate.d/myapp
```

### Custom log rotation script

```bash
#!/bin/bash

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
MAX_SIZE=$((10 * 1024 * 1024))  # 10 MB
KEEP=14

# Check if rotation needed
if [ ! -f "$LOG_FILE" ]; then
    exit 0
fi

CURRENT_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)

if [ "$CURRENT_SIZE" -lt "$MAX_SIZE" ]; then
    exit 0
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROTATED="${LOG_DIR}/app_${TIMESTAMP}.log"

mv "$LOG_FILE" "$ROTATED"
gzip "$ROTATED"

# Cleanup old rotated logs
find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +${KEEP} -delete

echo "Rotated: ${ROTATED}.gz"
```

### Time-based rotation with cron

```bash
#!/bin/bash

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
TIMESTAMP=$(date +%Y%m%d)

mv "$LOG_FILE" "${LOG_DIR}/app_${TIMESTAMP}.log"
gzip "${LOG_DIR}/app_${TIMESTAMP}.log"
touch "$LOG_FILE"

# Keep 30 days
find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +30 -delete
```

Cron entry:

```bash
# Rotate daily at midnight
0 0 * * * /opt/scripts/log-rotate.sh >> /var/log/rotate.log 2>&1
```

### Signal-based rotation (for running processes)

```bash
#!/bin/bash

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
PID_FILE="/var/run/myapp.pid"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Move current log
mv "$LOG_FILE" "${LOG_DIR}/app_${TIMESTAMP}.log"

# Send HUP signal to reopen log file
if [ -f "$PID_FILE" ]; then
    kill -HUP $(cat "$PID_FILE")
fi

# Compress old log after a delay
sleep 60
gzip "${LOG_DIR}/app_${TIMESTAMP}.log"

# Cleanup
find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +14 -delete
```

### Log rotation with error handling

```bash
#!/bin/bash

set -euo pipefail

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
KEEP=14

mkdir -p "$LOG_DIR"

if [ ! -f "$LOG_FILE" ]; then
    echo "No log file to rotate"
    exit 0
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROTATED="${LOG_DIR}/app_${TIMESTAMP}.log"

mv "$LOG_FILE" "$ROTATED" || { echo "Failed to move log"; exit 1; }
gzip "$ROTATED" || { echo "Failed to compress log"; exit 1; }

find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +${KEEP} -delete

echo "Rotation complete: ${ROTATED}.gz"
```

## Explanation

`logrotate` is the standard Linux tool for log management. It runs daily via cron (`/etc/cron.daily/logrotate`) and processes all configs in `/etc/logrotate.d/`. Key directives:

- **`daily`/`weekly`/`monthly`**: Rotation frequency.
- **`rotate N`**: Keep N rotated files before deleting.
- **`compress`/`delaycompress`**: Compress rotated logs. `delaycompress` waits one rotation cycle before compressing (useful for processes that still write to the old file).
- **`missingok`**: Don't error if the log file doesn't exist.
- **`postrotate`/`endscript`**: Run commands after rotation (e.g., reload the app to reopen log files).

The custom script approach uses `stat` to check file size and `mv` + `gzip` to rotate. It works in containers or minimal systems without `logrotate` installed.

## Variants

| Approach | Tool | Compression | Use When |
|----------|------|-------------|----------|
| logrotate | logrotate | gzip | Standard Linux servers |
| Custom size-based | bash + stat | gzip | Containers, minimal systems |
| Time-based cron | bash + cron | gzip | Simple setups, predictable schedules |
| Signal-based | bash + kill | gzip | Long-running processes with HUP support |
| logrotate with copytruncate | logrotate | gzip | Processes that don't support signals |

## Guidelines

- Use `logrotate` when available. It handles edge cases, permissions, and signal sending.
- Use `delaycompress` with `postrotate` if your process keeps writing to the old file handle.
- Set `missingok` to avoid errors when the log file doesn't exist yet.
- Test with `logrotate -d` (dry run) before applying to production.
- Monitor disk space after rotation. A spike means rotation isn't running.

## Common Mistakes

- Not sending a signal after rotation. The process keeps writing to the deleted file handle and logs disappear.
- Forgetting `delaycompress`. The process may still have the old file open when gzip tries to compress it.
- Not setting `missingok`. The script errors on first run when no log file exists.
- Using `copytruncate` without understanding it copies the entire file first, doubling disk usage briefly.
- Running rotation too frequently for small logs. Daily is enough for most applications.

## Frequently Asked Questions

### What is the difference between postrotate and prerotate?

`prerotate` runs before the log is rotated. `postrotate` runs after. Use `prerotate` to stop a service and `postrotate` to restart it. Both use `endscript` to close the block.

### How do I rotate logs in a Docker container?

Mount the log directory as a volume and run `logrotate` on the host:

```bash
docker run -v /var/log/myapp:/logs myapp
# On host: logrotate config targets /var/log/myapp/*.log
```

Or use a custom script inside the container with cron installed.

### How do I handle multiple log files with different policies?

Create separate logrotate configs in `/etc/logrotate.d/`:

```bash
# /etc/logrotate.d/myapp-access
/var/log/myapp/access.log {
    daily
    rotate 7
    compress
}

# /etc/logrotate.d/myapp-error
/var/log/myapp/error.log {
    weekly
    rotate 52
    compress
}
```

### What does copytruncate do?

`copytruncate` copies the current log to a rotated file, then truncates the original to zero length. This is useful for processes that don't support signals to reopen log files. The trade-off is a brief window where log entries can be lost during the copy.

### Size-Based Rotation with logrotate

```bash
# /etc/logrotate.d/myapp-size
/var/log/myapp/*.log {
    size 50M
    rotate 10
    compress
    delaycompress
    missingok
    notifempty
    create 0644 myapp myapp
    postrotate
        systemctl reload myapp
    endscript
}
```

### copytruncate for Processes Without Signal Support

```bash
# /etc/logrotate.d/myapp-truncate
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    copytruncate
    missingok
    notifempty
}
```

### Parallel Compression for Large Logs

```bash
#!/bin/bash
# rotate-parallel.sh

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
KEEP=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ ! -f "$LOG_FILE" ]; then
    exit 0
fi

CURRENT_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
MAX_SIZE=$((50 * 1024 * 1024))  # 50 MB

if [ "$CURRENT_SIZE" -lt "$MAX_SIZE" ]; then
    exit 0
fi

ROTATED="${LOG_DIR}/app_${TIMESTAMP}.log"
mv "$LOG_FILE" "$ROTATED"

# Use pigz for parallel compression (2x faster on multi-core)
if command -v pigz &> /dev/null; then
    pigz "$ROTATED"
else
    gzip "$ROTATED"
fi

find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +${KEEP} -delete

echo "Rotated and compressed: ${ROTATED}.gz"
```

### Log Rotation with Disk Space Monitoring

```bash
#!/bin/bash
# rotate-with-check.sh

set -euo pipefail

LOG_DIR="/var/log/myapp"
LOG_FILE="${LOG_DIR}/app.log"
KEEP=14
MIN_DISK_PERCENT=10  # Minimum free disk space percentage

# Check disk space before rotating
FREE_PERCENT=$(df "$LOG_DIR" | awk 'NR==2 {print int($5)}')
USED_PERCENT=100 - $FREE_PERCENT

if [ "$USED_PERCENT" -gt 90 ]; then
    echo "CRITICAL: Disk usage at ${USED_PERCENT}%. Rotating aggressively."
    KEEP=3  # Reduce retention on low disk
fi

if [ ! -f "$LOG_FILE" ]; then
    exit 0
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROTATED="${LOG_DIR}/app_${TIMESTAMP}.log"

mv "$LOG_FILE" "$ROTATED" || { echo "Failed to move log"; exit 1; }
gzip "$ROTATED" || { echo "Failed to compress log"; exit 1; }

find "$LOG_DIR" -name "app_*.log.gz" -type f -mtime +${KEEP} -delete

# Alert if disk is still critical
FREE_PERCENT=$(df "$LOG_DIR" | awk 'NR==2 {print int($5)}')
if [ "$FREE_PERCENT" -gt 90 ]; then
    echo "WARNING: Disk still at ${FREE_PERCENT}% after rotation"
fi

echo "Rotation complete: ${ROTATED}.gz"
```

### Logrotate with Email Notifications

```bash
# /etc/logrotate.d/myapp-notify
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 myapp myapp
    postrotate
        systemctl reload myapp
        echo "Log rotated on $(hostname) at $(date)" | \
            mail -s "Log rotation: myapp" ops@example.com
    endscript
}
```

## Additional Best Practices


- For a deeper guide, see [AWS CLI Automation with Bash](/recipes/bash-aws-cli-scripts/).

1. **Use `dateext` for readable rotated filenames.** Default uses `.1`, `.2` suffixes:

```bash
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    dateext
    dateformat -%Y%m%d
    missingok
    notifempty
}
```

This produces `app.log-20260701.gz` instead of `app.log.1.gz`.

2. **Set `su` directive for permission issues.** When log files are owned by a different user:

```bash
/var/log/myapp/*.log {
    su myapp myapp
    daily
    rotate 14
    compress
    create 0644 myapp myapp
}
```

3. **Use `olddir` to separate rotated logs.** Keep active and rotated logs in different directories:

```bash
/var/log/myapp/*.log {
    daily
    rotate 30
    compress
    olddir /var/log/myapp/archive
    create 0644 myapp myapp
}
```

## Additional Common Mistakes

1. **Not testing logrotate config before deploying.** Syntax errors silently break rotation:

```bash
# Always test first
logrotate -d /etc/logrotate.d/myapp
# -d = debug/dry run, no changes made
```

2. **Using `size` without `rotate`.** Logs rotate but old ones never get deleted:

```bash
# Bad: no rotate directive
/var/log/myapp/*.log {
    size 50M
    compress
}

# Good: specify retention
/var/log/myapp/*.log {
    size 50M
    rotate 10
    compress
}
```

3. **Not handling logrotate state file.** If state file gets corrupted, rotation stops:

```bash
# Check state
cat /var/lib/logrotate/status

# Reset state if corrupted
rm /var/lib/logrotate/status
logrotate -f /etc/logrotate.d/myapp
```

## Additional FAQ

### How do I rotate logs by hour instead of daily?

Use `hourly` with a cron job running every hour:

```bash
# /etc/logrotate.d/myapp-hourly
/var/log/myapp/*.log {
    hourly
    rotate 24
    compress
    missingok
    notifempty
}
```

```bash
# /etc/cron.d/logrotate-hourly
0 * * * * root /usr/sbin/logrotate /etc/logrotate.d/myapp-hourly
```

### How do I compress rotated logs with zstd instead of gzip?

```bash
# /etc/logrotate.d/myapp-zstd
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    compresscmd /usr/bin/zstd
    compressoptions -19
    compressext .zst
    missingok
    notifempty
}
```

zstd offers 2-3x faster decompression than gzip at similar compression ratios.

### How do I monitor that log rotation is working?

Add a check to your monitoring script:

```bash
#!/bin/bash
# check-rotation.sh
LOG_DIR="/var/log/myapp"
LATEST_ROTATED=$(find "$LOG_DIR" -name "app_*.log.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1)

if [ -z "$LATEST_ROTATED" ]; then
    echo "WARNING: No rotated logs found. Rotation may not be running."
    exit 1
fi

ROTATION_DATE=$(echo "$LATEST_ROTATED" | awk '{print $2}' | xargs stat -c%y)
DAYS_SINCE=$(( ($(date +%s) - $(date -d "$ROTATION_DATE" +%s)) / 86400 ))

if [ "$DAYS_SINCE" -gt 2 ]; then
    echo "WARNING: Last rotation was $DAYS_SINCE days ago"
    exit 1
fi

echo "OK: Last rotation $DAYS_SINCE day(s) ago"
```

## Performance Tips

1. **Use `pigz` instead of `gzip` for large logs.** Parallel compression on multi-core systems:

```bash
# Install pigz
apt install pigz  # Debian/Ubuntu
yum install pigz  # RHEL/CentOS

# Use in custom scripts
pigz -4 "$ROTATED"  # Level 4, good balance of speed/ratio
```

2. **Use lower compression levels for speed.** Level 1 is 5x faster than level 9:

```bash
# Fast rotation with minimal compression
gzip -1 "$ROTATED"

# Or with logrotate
compressoptions -1
```

3. **Run rotation during low-traffic periods.** Schedule cron for off-peak hours:

```bash
# Rotate at 4 AM instead of midnight
0 4 * * * /usr/sbin/logrotate /etc/logrotate.d/myapp
```
