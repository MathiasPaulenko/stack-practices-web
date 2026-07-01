---
contentType: recipes
slug: bash-log-rotation-compression
title: "Log Rotation and Compression"
description: "Rotate and compress application logs with Bash to prevent disk exhaustion and simplify log retention."
metaDescription: "Rotate and compress application logs with Bash. Prevent disk exhaustion by archiving old logs with gzip, timestamps, and a clear retention policy."
difficulty: intermediate
topics:
  - file-handling
tags:
  - bash
  - logs
  - rotation
  - compression
  - gzip
relatedResources:
  - /recipes/compress-decompress-files
  - /recipes/bash-scripting-automation
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-loop-over-files
  - /recipes/bash-parallel-execution
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Rotate and compress application logs with Bash. Prevent disk exhaustion by archiving old logs with gzip, timestamps, and a clear retention policy."
  keywords:
    - file-handling
    - bash
    - logs
    - rotation
    - compression
    - gzip
    - /recipes/compress-decompress-files
    - /recipes/bash-scripting-automation
    - /recipes/bash-backup-rotation-script
    - /recipes/bash-loop-over-files
    - /recipes/bash-parallel-execution
    - bash
    - logs
    - rotation
    - compression
    - gzip
---
## Overview

Application logs grow continuously. Without rotation, a single verbose service can fill a disk, crash the host, and make log analysis impractical. A Bash log rotation script renames active logs, compresses old ones, and deletes archives past a retention age. This keeps logs accessible, searchable, and bounded in size without relying on a heavyweight log management agent.

## When to Use

Use this resource when:
- You need to rotate logs on a server without logrotate installed.
- You want custom naming, compression, or retention rules.
- You rotate logs for a container or embedded environment.
- You need to ship compressed logs to cold storage.

## Solution

### Bash log rotation script

```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="${1:-/var/log/app}"
RETENTION_DAYS="${2:-30}"
MAX_SIZE_MB="${3:-100}"

mkdir -p "$LOG_DIR/archive"

for log in "$LOG_DIR"/*.log; do
    [[ -f "$log" ]] || continue
    size_mb=$(du -m "$log" | cut -f1)

    if (( size_mb > MAX_SIZE_MB )); then
        base=$(basename "$log" .log)
        timestamp=$(date +%Y%m%d-%H%M%S)
        rotated="$LOG_DIR/archive/${base}-${timestamp}.log"

        mv "$log" "$rotated"
        gzip "$rotated"
        touch "$log"
    fi
done

# Delete old compressed logs
find "$LOG_DIR/archive" -name '*.gz' -type f -mtime +$RETENTION_DAYS -delete

# Optional: signal the app to reopen logs
# kill -HUP "$APP_PID"

echo "Log rotation completed"
```

## Explanation

The script iterates over `*.log` files in the target directory. If a log exceeds `MAX_SIZE_MB`, it renames the file with a timestamp, compresses it with `gzip`, and creates a new empty log file. Old compressed archives are deleted after `RETENTION_DAYS`. The optional `kill -HUP` tells daemons that expect signal-based reopening to close the old file descriptor and start writing to the new file. This is common for long-running services like nginx or custom apps.

## Variants

| Variant | Compression | Use case |
|---------|-------------|----------|
| gzip | Default | Good balance, widely supported |
| bzip2 | Slower, smaller | Long-term archives |
| zstd | Fast, modern | Large log volumes |
| xz | Smallest, slowest | Compliance archives |

## What Works

1. **Rotate before the disk is full.** Monitor free space and rotate at 70-80% usage, not 99%.
2. **Use copytruncate or signals when possible.** Moving an open log file can cause the app to keep writing to the old inode.
3. **Keep archive permissions restrictive.** Logs may contain sensitive data; set `chmod 640` on archives.
4. **Test rotation on a copy first.** A bad script can delete active logs; validate against a non-production directory.
5. **Centralize logs after rotation.** Ship compressed logs to S3, Loki, or Elasticsearch for retention and search.

## Common Mistakes

1. **Deleting logs before compression.** The archive step can fail; keep the original until gzip succeeds.
2. **Rotating the same file twice.** Timestamped filenames prevent overwriting the same archive.
3. **Not handling log files in subdirectories.** Use `find` with `-maxdepth` if logs are nested.
4. **Running as root unnecessarily.** Use the service account that owns the log files.
5. **Forgetting to reopen file descriptors.** The app may keep writing to the moved file; send HUP or use copytruncate.

## Frequently Asked Questions

**Q: When should I use logrotate instead of a custom script?**
A: Use logrotate for standard Linux servers. Use a custom script when you need behavior that logrotate cannot express, or when logrotate is not available.

**Q: How do I avoid losing log lines during rotation?**
A: Use copytruncate or send HUP to the application. This ensures the app closes the old file and starts writing to the new one.

**Q: Can I rotate logs by date instead of size?**
A: Yes. Run the script from cron daily and remove the size check. The date-based timestamp still archives the previous day.
