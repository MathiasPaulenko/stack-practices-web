---
contentType: recipes
slug: bash-backup-rotation
title: "Backup Rotation Script in Bash"
description: "Automated backup with retention policies using bash and find."
metaDescription: "Create a bash backup rotation script with retention policies. Automate daily, weekly, monthly backups with find and tar compression examples."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - backup
  - rotation
  - script
  - automation
  - devops
relatedResources:
  - /recipes/bash-scripting-automation
  - /docs/backup-and-restore-template
  - /guides/cicd-pipeline-guide
  - /recipes/ansible-playbook
  - /recipes/cicd-pipeline-setup
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Create a bash backup rotation script with retention policies. Automate daily, weekly, monthly backups with find and tar compression examples."
  keywords:
    - bash
    - backup
    - rotation
    - script
    - automation
    - devops
---
## Overview

Backup rotation keeps a fixed number of backups and deletes old ones automatically. This script uses `tar` for compression and `find` for cleanup. It supports daily, weekly, and monthly retention policies so you always have recent and historical backups without filling the disk.

## When to Use

- You need automated backups for a web app or database
- You want to keep daily backups for 7 days, weekly for 4 weeks, monthly for 6 months
- You are setting up a cron job for periodic backups
- You want compressed archives with automatic cleanup

## Solution

### Basic backup with timestamp

```bash
#!/bin/bash

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

tar -czf "${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz" -C "${SOURCE_DIR}" .
echo "Backup created: backup_${TIMESTAMP}.tar.gz"
```

### Backup with retention policy

```bash
#!/bin/bash

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

# Create backup
tar -czf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .

# Retention: keep last 7 daily backups
find "${BACKUP_DIR}" -name "backup_*.tar.gz" -type f -mtime +7 -delete

echo "Backup created: ${BACKUP_FILE}"
echo "Old backups cleaned (kept last 7 days)"
```

### Tiered retention (daily, weekly, monthly)

```bash
#!/bin/bash

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

# Create daily backup
tar -czf "${BACKUP_DIR}/daily_${TIMESTAMP}.tar.gz" -C "${SOURCE_DIR}" .

# Weekly full backup on Sunday
if [ "$DAY_OF_WEEK" = "7" ]; then
    cp "${BACKUP_DIR}/daily_${TIMESTAMP}.tar.gz" "${BACKUP_DIR}/weekly_${TIMESTAMP}.tar.gz"
fi

# Monthly full backup on the 1st
if [ "$DAY_OF_MONTH" = "01" ]; then
    cp "${BACKUP_DIR}/daily_${TIMESTAMP}.tar.gz" "${BACKUP_DIR}/monthly_${TIMESTAMP}.tar.gz"
fi

# Cleanup: 7 daily, 4 weekly, 6 monthly
find "${BACKUP_DIR}" -name "daily_*.tar.gz" -type f -mtime +7 -delete
find "${BACKUP_DIR}" -name "weekly_*.tar.gz" -type f -mtime +28 -delete
find "${BACKUP_DIR}" -name "monthly_*.tar.gz" -type f -mtime +180 -delete

echo "Backup completed with tiered retention"
```

### Database backup with rotation

```bash
#!/bin/bash

DB_NAME="myapp"
DB_USER="postgres"
BACKUP_DIR="/backups/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"

# Dump database
pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"

# Keep last 14 days
find "${BACKUP_DIR}" -name "db_*.sql.gz" -type f -mtime +14 -delete

echo "Database backup created: db_${TIMESTAMP}.sql.gz"
```

### Cron setup

```bash
# Run daily at 2 AM
0 2 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1

# Run every 6 hours
0 */6 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Backup with integrity check

```bash
#!/bin/bash

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

# Create backup
tar -czf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .

# Verify integrity
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo "OK: ${BACKUP_FILE} verified"
    find "${BACKUP_DIR}" -name "backup_*.tar.gz" -type f -mtime +7 -delete
else
    echo "ERROR: ${BACKUP_FILE} is corrupt"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
```

## Explanation

The `find` command with `-mtime +N` matches files older than N days. `-delete` removes them. This is the simplest retention mechanism: every time the script runs, it creates a new backup and cleans files older than the retention window.

Tiered retention uses file naming prefixes (`daily_`, `weekly_`, `monthly_`) to apply different retention periods. The weekly backup is a copy of Sunday's daily backup. The monthly backup is a copy of the 1st's daily backup. This avoids creating multiple large archives on the same day.

`gzip -t` tests archive integrity without extracting. Run it after every backup to catch disk errors or incomplete writes.

## Variants

| Approach | Tool | Compression | Use When |
|----------|------|-------------|----------|
| tar + find | tar, gzip | gzip | Filesystem backups |
| rsync + find | rsync | None (sync) | Incremental backups |
| pg_dump + gzip | pg_dump | gzip | PostgreSQL backups |
| mysqldump + gzip | mysqldump | gzip | MySQL backups |
| restic | restic | Deduplication | Large-scale, encrypted backups |

## Guidelines

- Always test backup restoration. A backup you cannot restore is useless.
- Use `gzip -t` to verify archive integrity after creation.
- Store backups on a separate disk or remote server. A backup on the same disk fails when the disk fails.
- Set retention policies based on recovery point objectives (RPO). 7 daily + 4 weekly + 6 monthly covers most needs.
- Log backup operations. Append output to a log file via cron redirection.

## Common Mistakes

- Not testing restores. Run a restore drill monthly to verify backups work.
- Storing backups on the same disk as the source. Disk failure loses everything.
- Using `rm` instead of `find -delete`. `find -delete` is safer because it only matches the pattern.
- Not setting `mkdir -p` for the backup directory. The script fails if the directory does not exist.
- Forgetting to make the script executable: `chmod +x backup.sh`.

## Frequently Asked Questions

### How do I encrypt backups in bash?

Use `gpg` after creating the archive: `gpg --symmetric --cipher-algo AES256 backup.tar.gz`. This produces `backup.tar.gz.gpg`. Decrypt with `gpg -d backup.tar.gz.gpg > backup.tar.gz`.

### How do I sync backups to remote storage?

Use `rsync` or `rclone`:

```bash
rsync -avz /backups/ user@remote:/remote_backups/
```

Or for S3-compatible storage:

```bash
rclone sync /backups remote:backup-bucket/
```

### How do I monitor backup failures?

Check the exit code in your cron job and send an alert:

```bash
0 2 * * * /opt/scripts/backup.sh || echo "Backup failed" | mail -s "Backup Alert" admin@example.com
```

### What is the difference between -mtime and -mmin?

`-mtime +7` matches files older than 7 days. `-mmin +60` matches files older than 60 minutes. Use `-mmin` for sub-daily retention policies.
