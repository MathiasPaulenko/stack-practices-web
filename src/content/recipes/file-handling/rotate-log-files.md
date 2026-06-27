---
contentType: recipes
slug: rotate-log-files
title: "Rotate Log Files"
description: "How to implement log rotation by size, date, and count to prevent disk exhaustion across Python, Node.js, Java, and Linux systems."
metaDescription: "Implement log rotation by size, date, and count in Python, Node.js, Java, and Linux to prevent disk exhaustion."
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
  metaDescription: "Implement log rotation by size, date, and count in Python, Node.js, Java, and Linux to prevent disk exhaustion."
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

Log rotation prevents a single log file from growing unbounded and exhausting disk space. A proper rotation strategy compresses old logs, keeps a configurable number of backups, and optionally deletes archives beyond a retention age. This recipe shows size-based and time-based rotation across Python, Node.js, Java, and Linux.

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

## Best Practices

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

## Related Resources

- [Generate Temporary Files](/recipes/file-handling/generate-temporary-files)
- [Structured Logging](/recipes/observability/structured-logging)
- [Scaling](/guides/devops/scaling-guide)
