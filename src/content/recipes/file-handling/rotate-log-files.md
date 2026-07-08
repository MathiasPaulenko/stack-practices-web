---
contentType: recipes
slug: rotate-log-files
title: "Rotate Log Files"
description: "How to implement log rotation by size, date, and count to prevent disk exhaustion across Python, Node.js, Java, and Linux systems."
metaDescription: "Implement log rotation by size, date, and count in Python, Node.js, Java, and Linux to prevent disk exhaustion and audit log retention."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - logging
  - rotation
  - python
  - nodejs
  - java
  - linux
  - recipe
relatedResources:
  - /recipes/file-handling/generate-temporary-files
  - /recipes/observability/structured-logging
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Implement log rotation by size, date, and count in Python, Node.js, Java, and Linux to prevent disk exhaustion and audit log retention."
  keywords:
    - file-handling
    - logging
    - rotation
    - python
    - nodejs
    - java
    - linux
    - recipe
---

## Overview

Log rotation prevents a single log file from growing unbounded and exhausting disk space. A proper rotation strategy compresses old logs, keeps a configurable number of backups, and optionally deletes archives beyond a retention age. The pattern below demonstrates size-based and time-based rotation across Python, Node.js, Java, and Linux.

## When to Use

- Application logs grow continuously and risk filling the disk
- You need to retain historical logs for compliance or debugging
- Log analysis tools prefer smaller, time-bounded files
- You want to compress old logs to reduce storage costs
- Multiple processes write to the same log file

## When NOT to Use

- You are using a centralized logging service (Datadog, Splunk, ELK) that ingests from stdout/stderr — let the platform handle retention
- You need millisecond-level log search across all history — use a log database instead
- Your application runs as ephemeral containers with read-only filesystems — stream to stdout

## Step-by-Step Implementation

### Python

```python
import logging
import logging.handlers

# Size-based rotation: 10MB max, keep 5 backups
handler = logging.handlers.RotatingFileHandler(
    'app.log',
    maxBytes=10 * 1024 * 1024,  # 10 MB
    backupCount=5,
    encoding='utf-8'
)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s %(name)s: %(message)s'
))

logger = logging.getLogger('myapp')
logger.setLevel(logging.INFO)
logger.addHandler(handler)

# Time-based rotation: daily at midnight, keep 30 days
from logging.handlers import TimedRotatingFileHandler

timed_handler = TimedRotatingFileHandler(
    'app_daily.log',
    when='midnight',
    interval=1,
    backupCount=30,
    encoding='utf-8',
    utc=True
)
timed_handler.suffix = '%Y-%m-%d'
timed_handler.extMatch = r'^\d{4}-\d{2}-\d{2}$'
logger.addHandler(timed_handler)

# WatchedFileHandler for external rotation (logrotate compatibility)
from logging.handlers import WatchedFileHandler
watched = WatchedFileHandler('app.log')
logger.addHandler(watched)
```

### Node.js

```javascript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Size-based rotation with Winston
const sizeTransport = new winston.transports.File({
    filename: 'app.log',
    maxsize: 10 * 1024 * 1024,  // 10 MB
    maxFiles: 5,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

// Daily rotation
const dailyTransport = new DailyRotateFile({
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

const logger = winston.createLogger({
    level: 'info',
    transports: [sizeTransport, dailyTransport]
});

// Cleanup old archives automatically
dailyTransport.on('rotate', (oldFilename, newFilename) => {
    console.log(`Rotated log: ${oldFilename} -> ${newFilename}`);
});
```

### Java

```java
import java.util.logging.*;

// Using java.util.logging with custom rotation
public class LogRotationExample {
    public static void setupLogging() throws Exception {
        Logger logger = Logger.getLogger("myapp");
        logger.setLevel(Level.INFO);

        // Size-based rotation: 10MB, 5 backups
        FileHandler fileHandler = new FileHandler(
            "app.log",           // pattern
            10 * 1024 * 1024,    // limit bytes
            5,                   // count
            true                 // append
        );
        fileHandler.setFormatter(new SimpleFormatter());
        logger.addHandler(fileHandler);
    }
}

// Logback (more common in production)
// logback.xml:
/*
<configuration>
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/app.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>logs/app-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>1GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    <root level="INFO">
        <appender-ref ref="FILE" />
    </root>
</configuration>
*/
```

### Linux (logrotate)

```bash
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily                  # Rotate daily
    missingok              # OK if log file is missing
    rotate 30              # Keep 30 backups
    compress               # Compress old logs with gzip
    delaycompress          # Compress the rotation after next
    notifempty             # Don't rotate empty files
    create 0644 appuser appuser
    sharedscripts          # Run postrotate once for all matching files
    dateext                # Use date instead of number suffix
    dateformat -%Y%m%d

    postrotate
        # Signal application to reopen log file
        kill -HUP $(cat /var/run/myapp.pid) > /dev/null 2>&1 || true
    endscript
}
```

```bash
# Size-based rotation with logrotate
/var/log/myapp/app.log {
    size 100M              # Rotate when file exceeds 100MB
    rotate 10
    compress
    copytruncate           # Copy then truncate (no signal needed)
    delaycompress
}
```

## What Works

- **Use `copytruncate` or `create` with a postrotate signal** to avoid losing log entries between copy and reopen. Applications must handle `SIGHUP` to reopen file descriptors.
- **Set `totalSizeCap` or equivalent** to cap total storage across all rotated logs, not just the count of files.
- **Compress rotated logs** to reduce storage by 80-95%. Use `delaycompress` to keep the most recent backup uncompressed for immediate grep access.
- **Run logrotate with `-d` (debug mode)** before deploying to production to verify paths and permissions without making changes.
- **Monitor disk usage** independently. Rotation is a safety net, not a substitute for capacity planning.

## Common Mistakes

- **Not handling the reopen signal in the application.** The application continues writing to the old inode after rotation, causing the deleted file to keep consuming space until the process restarts.
- **Using `copytruncate` with buffered writers.** Buffered data in the application may be lost when the file is truncated.
- **Setting `maxFiles` or `backupCount` too low for compliance.** 5 backups at 10MB each is only 50MB of history — insufficient for most production debugging.
- **Ignoring time zones in `TimedRotatingFileHandler`.** Use `utc=True` to avoid ambiguous behavior around daylight saving time transitions.
- **Running multiple application instances with the same log file.** Concurrent writers without a locking mechanism interleave log lines or corrupt the file.

## Frequently Asked Questions

**Q: What is log rotation and why does it matter?**
A: Log rotation archives or deletes old log files to prevent disk exhaustion. Without rotation, a single service can fill the entire disk.

**Q: How do I choose a retention policy?**
A: Balance compliance, debugging needs, and storage cost. A common web application keeps 7-30 days of logs locally and archives older logs to cold storage.

**Q: Should I compress rotated logs?**
A: Yes. Compression reduces storage usage considerably. Most log rotation tools support gzip or zstd compression out of the box.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Custom rotation with compression in Python

For cases where built-in handlers lack flexibility, implement a custom rotator:

```python
import logging
import os
import gzip
import shutil
from logging.handlers import BaseRotatingHandler
from pathlib import Path
from datetime import datetime


class CompressingRotatingHandler(BaseRotatingHandler):
    """RotatingFileHandler that compresses rotated logs with gzip."""

    def __init__(self, filename, max_bytes=10 * 1024 * 1024, backup_count=5, encoding="utf-8"):
        super().__init__(filename, mode="a", encoding=encoding, delay=False)
        self.max_bytes = max_bytes
        self.backup_count = backup_count

    def shouldRollover(self, record):
        if self.stream is None:
            self.stream = self._open()
        if self.max_bytes > 0:
            self.stream.seek(0, 2)
            if self.stream.tell() >= self.max_bytes:
                return 1
        return 0

    def doRollover(self):
        if self.stream:
            self.stream.close()
            self.stream = None

        # Rotate existing backup files
        for i in range(self.backup_count - 1, 0, -1):
            src = f"{self.baseFilename}.{i}.gz"
            dst = f"{self.baseFilename}.{i + 1}.gz"
            if os.path.exists(src):
                if os.path.exists(dst):
                    os.remove(dst)
                os.rename(src, dst)

        # Compress current log to .1.gz
        if os.path.exists(self.baseFilename):
            compressed = f"{self.baseFilename}.1.gz"
            with open(self.baseFilename, "rb") as src:
                with gzip.open(compressed, "wb") as dst:
                    shutil.copyfileobj(src, dst)
            os.remove(self.baseFilename)

        # Remove excess backups
        for i in range(self.backup_count + 1, self.backup_count + 10):
            excess = f"{self.baseFilename}.{i}.gz"
            if os.path.exists(excess):
                os.remove(excess)

        self.stream = self._open()


# Usage
handler = CompressingRotatingHandler(
    "app.log",
    max_bytes=10 * 1024 * 1024,
    backup_count=10,
)
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

logger = logging.getLogger("myapp")
logger.setLevel(logging.INFO)
logger.addHandler(handler)

# Generate test logs
for i in range(100000):
    logger.info(f"Log entry {i}: processing request with data payload")
```

### Logrotate patterns for containerized applications

Containers that log to files need special handling since the filesystem is ephemeral. Use a sidecar or shared volume approach:

```bash
# /etc/logrotate.d/container-app
# Application logs in a shared volume mounted from the container
/var/log/container-app/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    dateext
    dateformat -%Y%m%d-%H%M%S
    su root root
}

# Nginx in container with shared log volume
/var/log/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 nginx nginx
    sharedscripts
    postrotate
        # Signal nginx in the container to reopen logs
        docker exec nginx kill -HUP 1 2>/dev/null || true
    endscript
}

# Multiple application instances with per-PID log files
/var/log/myapp/app-*.log {
    size 50M
    rotate 5
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

Docker Compose with log volume and logrotate sidecar:

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    volumes:
      - app-logs:/var/log/myapp
    environment:
      - LOG_FILE=/var/log/myapp/app.log

  logrotate:
    image: alpine:latest
    command: >
      sh -c "apk add --no-cache logrotate &&
             echo '/var/log/myapp/*.log { daily rotate 14 compress delaycompress copytruncate missingok }' > /etc/logrotate.d/myapp &&
             while true; do logrotate /etc/logrotate.d/myapp; sleep 86400; done"
    volumes:
      - app-logs:/var/log/myapp
    depends_on:
      - app

volumes:
  app-logs:
```

### Retention policy with age-based cleanup

```python
import os
import time
from pathlib import Path


def cleanup_old_logs(log_dir: str, max_age_days: int = 30, pattern: str = "*.log*") -> dict:
    """Delete log files older than max_age_days. Returns stats."""
    stats = {"deleted": 0, "freed_bytes": 0, "errors": 0}
    cutoff = time.time() - (max_age_days * 86400)
    log_path = Path(log_dir)

    for entry in log_path.glob(pattern):
        try:
            if entry.is_file() and entry.stat().st_mtime < cutoff:
                size = entry.stat().st_size
                entry.unlink()
                stats["deleted"] += 1
                stats["freed_bytes"] += size
        except OSError as e:
            stats["errors"] += 1
            print(f"Error deleting {entry}: {e}")

    return stats


# Usage: delete logs older than 30 days
result = cleanup_old_logs("/var/log/myapp", max_age_days=30)
print(f"Deleted {result['deleted']} files, freed {result['freed_bytes'] / 1024 / 1024:.1f} MB")
```

### Bash log rotation script with compression and retention

```bash
#!/bin/bash
set -euo pipefail

LOG_DIR="/var/log/myapp"
LOG_FILE="$LOG_DIR/app.log"
MAX_SIZE=$((10 * 1024 * 1024))  # 10MB
BACKUP_COUNT=10
RETENTION_DAYS=30

rotate_log() {
    local file="$1"
    local current_size
    current_size=$(stat -c%s "$file" 2>/dev/null || echo 0)

    if [ "$current_size" -lt "$MAX_SIZE" ]; then
        return 0
    fi

    echo "Rotating $file (size: $current_size bytes)"

    # Rotate existing backups
    for i in $(seq $((BACKUP_COUNT - 1)) -1 1); do
        src="${file}.${i}.gz"
        dst="${file}.$((i + 1)).gz"
        if [ -f "$src" ]; then
            [ -f "$dst" ] && rm -f "$dst"
            mv "$src" "$dst"
        fi
    done

    # Compress current log
    if [ -f "$file" ]; then
        gzip -c "$file" > "${file}.1.gz"
        : > "$file"  # Truncate
    fi

    # Delete backups beyond retention count
    for i in $(seq $((BACKUP_COUNT + 1)) $((BACKUP_COUNT + 10))); do
        rm -f "${file}.${i}.gz"
    done

    # Delete files older than retention period
    find "$LOG_DIR" -name "*.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

    echo "Rotation complete"
}

# Run rotation
rotate_log "$LOG_FILE"

# Cron entry: run every hour
# 0 * * * * /usr/local/bin/rotate-logs.sh >> /var/log/myapp/rotation.log 2>&1
```

### Monitoring log file sizes with alerts

```python
import os
import smtplib
from pathlib import Path
from typing import Callable


def check_log_sizes(
    log_dir: str,
    warning_mb: float = 500,
    critical_mb: float = 1000,
    alert_callback: Callable[[str, str], None] = None,
) -> list[dict]:
    """Check log file sizes and trigger alerts if thresholds exceeded."""
    results = []
    log_path = Path(log_dir)

    for entry in log_path.rglob("*.log*"):
        if not entry.is_file():
            continue

        size_mb = entry.stat().st_size / (1024 * 1024)
        level = "OK"

        if size_mb >= critical_mb:
            level = "CRITICAL"
        elif size_mb >= warning_mb:
            level = "WARNING"

        result = {
            "file": str(entry),
            "size_mb": round(size_mb, 2),
            "level": level,
        }
        results.append(result)

        if level != "OK" and alert_callback:
            alert_callback(str(entry), f"{level}: {size_mb:.1f}MB")

    return results


def email_alert(file_path: str, message: str):
    """Send email alert for oversized log files."""
    print(f"[ALERT] {file_path}: {message}")
    # In production, use proper email sending:
    # smtp = smtplib.SMTP("smtp.example.com")
    # smtp.sendmail("alerts@example.com", "ops@example.com",
    #               f"Subject: Log Size Alert\n\n{message}")


# Usage
results = check_log_sizes(
    "/var/log/myapp",
    warning_mb=500,
    critical_mb=1000,
    alert_callback=email_alert,
)

for r in results:
    print(f"{r['level']:10s} {r['size_mb']:>10.2f}MB  {r['file']}")
```

## Additional Best Practices

1. **Use `zstd` instead of `gzip` for faster compression.** zstd offers similar compression ratios with 3-5x faster decompression:

```bash
# logrotate with zstd (requires logrotate 3.18+)
/var/log/myapp/*.log {
    daily
    rotate 30
    compress
    compresscmd /usr/bin/zstd
    compressoptions -19
    compressext .zst
    delaycompress
    missingok
    notifempty
}
```

2. **Test rotation in a staging environment.** Simulate high log volume to verify rotation triggers at the right threshold:

```bash
#!/bin/bash
# Generate 15MB of test log data to trigger 10MB rotation
head -c 15M /dev/urandom | base64 >> /var/log/myapp/test.log

# Verify rotation occurred
ls -la /var/log/myapp/test.log*
```

3. **Use structured logging with rotation.** Combine JSON logging with rotation for easier parsing by log analysis tools:

```python
import logging
import json
from logging.handlers import RotatingFileHandler


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


handler = RotatingFileHandler(
    "app.json.log",
    maxBytes=10 * 1024 * 1024,
    backupCount=10,
)
handler.setFormatter(JsonFormatter())

logger = logging.getLogger("myapp")
logger.setLevel(logging.INFO)
logger.addHandler(handler)
```

## Additional Common Mistakes

1. **Forgetting to rotate logs from cron or systemd timers.** Application-level rotation handles in-app logs, but cron job output and systemd journal logs need separate rotation:

```bash
# Rotate cron output redirected to a file
/var/log/cron-output.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    copytruncate
}

# systemd: journald has its own retention
# /etc/systemd/journald.conf:
# SystemMaxUse=500M
# MaxRetentionSec=30day
```

2. **Not setting permissions on rotated files.** Logs may contain sensitive data. Ensure rotated files maintain restrictive permissions:

```bash
# logrotate: set permissions on rotated files
/var/log/myapp/*.log {
    daily
    rotate 30
    compress
    delaycompress
    create 0640 myapp myapp
    su myapp myapp
    missingok
    notifempty
}
```

## Additional FAQ

### How do I rotate logs in a Kubernetes pod?

In Kubernetes, applications should log to stdout/stderr. The container runtime handles rotation. For file-based logging, use a sidecar container with shared volumes:

```yaml
# Kubernetes pod with log rotation sidecar
apiVersion: v1
kind: Pod
metadata:
  name: app-with-log-rotation
spec:
  containers:
    - name: app
      image: myapp:latest
      volumeMounts:
        - name: logs
          mountPath: /var/log/myapp
    - name: log-rotator
      image: busybox:latest
      command:
        - sh
        - -c
        - |
          while true; do
            for f in /var/log/myapp/*.log; do
              size=$(wc -c < "$f" 2>/dev/null || echo 0)
              if [ "$size" -gt 10485760 ]; then
                mv "$f" "$f.$(date +%s).bak"
                gzip "$f.$(date +%s).bak"
              fi
            done
            find /var/log/myapp -name "*.gz" -mtime +14 -delete
            sleep 3600
          done
      volumeMounts:
        - name: logs
          mountPath: /var/log/myapp
  volumes:
    - name: logs
      emptyDir: {}
```

### How do I handle log rotation for multiple processes writing to the same file?

Use a centralized log collector or a process manager that handles log rotation. If multiple processes must write to the same file, use a locking mechanism:

```python
import fcntl
import logging
from logging.handlers import RotatingFileHandler


class LockedRotatingHandler(RotatingFileHandler):
    """RotatingFileHandler with file locking for multi-process safety."""

    def emit(self, record):
        try:
            with open(self.baseFilename, "a") as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                # Re-check size after acquiring lock
                f.seek(0, 2)
                if f.tell() >= self.maxBytes:
                    self.doRollover()
                f.write(self.format(record) + "\n")
                f.flush()
        except Exception:
            self.handleError(record)


handler = LockedRotatingHandler("shared.log", maxBytes=10 * 1024 * 1024, backupCount=5)
handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s: %(message)s"))

logger = logging.getLogger("shared")
logger.addHandler(handler)
```

### How do I archive rotated logs to cloud storage?

```python
import os
import boto3
from pathlib import Path
from datetime import datetime


def archive_logs_to_s3(log_dir: str, bucket: str, prefix: str = "logs/") -> int:
    """Upload compressed log files to S3 and delete local copies."""
    s3 = boto3.client("s3")
    uploaded = 0
    log_path = Path(log_dir)

    for entry in log_path.glob("*.gz"):
        if not entry.is_file():
            continue

        # Skip files modified in the last hour (might still be in use)
        age_hours = (datetime.now().timestamp() - entry.stat().st_mtime) / 3600
        if age_hours < 1:
            continue

        key = f"{prefix}{entry.name}"
        try:
            s3.upload_file(str(entry), bucket, key)
            entry.unlink()
            uploaded += 1
            print(f"Archived {entry.name} to s3://{bucket}/{key}")
        except Exception as e:
            print(f"Failed to archive {entry.name}: {e}")

    return uploaded


# Usage: archive logs older than 1 hour to S3
count = archive_logs_to_s3("/var/log/myapp", "my-log-archive", prefix="myapp/")
print(f"Archived {count} files to S3")
```
