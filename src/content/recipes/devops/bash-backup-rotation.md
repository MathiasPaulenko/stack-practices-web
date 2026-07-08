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

### Encrypted Backup with GPG

```bash
#!/bin/bash
# encrypted-backup.sh

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups/encrypted"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz.gpg"
PASSPHRASE_FILE="/etc/backup/.gpg_passphrase"

mkdir -p "${BACKUP_DIR}"

# Create and encrypt in one pipeline
tar -czf - -C "${SOURCE_DIR}" . | \
    gpg --batch --passphrase-file "${PASSPHRASE_FILE}" \
        --symmetric --cipher-algo AES256 \
        -o "${BACKUP_FILE}"

# Verify
if gpg --batch --passphrase-file "${PASSPHRASE_FILE}" --verify "${BACKUP_FILE}" 2>/dev/null; then
    echo "OK: ${BACKUP_FILE} encrypted and verified"
    find "${BACKUP_DIR}" -name "backup_*.tar.gz.gpg" -type f -mtime +30 -delete
else
    echo "ERROR: Encryption failed for ${BACKUP_FILE}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
```

### Restore Script

```bash
#!/bin/bash
# restore-backup.sh

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

mkdir -p "${RESTORE_DIR}"

# Check if encrypted
if [[ "$BACKUP_FILE" == *.gpg ]]; then
    gpg -d "${BACKUP_FILE}" | tar -xzf - -C "${RESTORE_DIR}"
else
    tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"
fi

echo "Restored to ${RESTORE_DIR}"
ls -la "${RESTORE_DIR}"
```

### Backup with Pre/Post Hooks

```bash
#!/bin/bash
# backup-with-hooks.sh

SOURCE_DIR="/var/www/myapp"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

# Pre-backup hook: flush database to disk
pre_backup() {
    if command -v mysql &> /dev/null; then
        mysql -u root -e "FLUSH TABLES WITH READ LOCK;"
    fi
    sync
}

# Post-backup hook: unlock and cleanup
post_backup() {
    if command -v mysql &> /dev/null; then
        mysql -u root -e "UNLOCK TABLES;"
    fi
    find "${BACKUP_DIR}" -name "backup_*.tar.gz" -type f -mtime +7 -delete
}

# Execute
pre_backup
tar -czf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .
post_backup

# Verify
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo "OK: ${BACKUP_FILE}"
else
    echo "ERROR: ${BACKUP_FILE} is corrupt"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
```

### Disk Space Check Before Backup

```bash
#!/bin/bash
# backup-with-space-check.sh

BACKUP_DIR="/backups"
SOURCE_DIR="/var/www/myapp"
MIN_SPACE_GB=5

available_kb=$(df "${BACKUP_DIR}" | awk 'NR==2 {print $4}')
available_gb=$((available_kb / 1024 / 1024))

if [ "$available_gb" -lt "$MIN_SPACE_GB" ]; then
    echo "ERROR: Only ${available_gb}GB free in ${BACKUP_DIR}, need ${MIN_SPACE_GB}GB"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf "${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz" -C "${SOURCE_DIR}" .
echo "Backup created with ${available_gb}GB free space"
```

## Additional Best Practices

1. **Use incremental backups with rsync.** Only transfer changed files to save bandwidth:

```bash
#!/bin/bash
# incremental-backup.sh
rsync -avz --link-dest=/backups/yesterday /var/www/myapp/ /backups/today/
```

2. **Send notifications on success and failure.** Use webhook for Slack/Discord:

```bash
notify() {
    local status="$1"
    local message="$2"
    curl -s -X POST "https://hooks.slack.com/services/T000/B000/XXX" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"Backup ${status}: ${message}\"}"
}

if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    notify "success" "${BACKUP_FILE}"
else
    notify "failure" "${BACKUP_FILE} is corrupt"
    exit 1
fi
```

3. **Tag backups with metadata.** Store backup info in a manifest file:

```bash
{
    echo "timestamp: ${TIMESTAMP}"
    echo "size: $(du -h ${BACKUP_FILE} | cut -f1)"
    echo "files: $(tar -tzf ${BACKUP_FILE} | wc -l)"
    echo "checksum: $(sha256sum ${BACKUP_FILE} | cut -d' ' -f1)"
} > "${BACKUP_FILE}.manifest"
```

## Additional Common Mistakes

1. **Not checking disk space before backup.** A full disk corrupts the archive:

```bash
# Always check available space
available=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
if [ "$available" -lt 1048576 ]; then
    echo "Insufficient disk space"
    exit 1
fi
```

2. **Backing up running databases without a dump.** File-level backups of active databases can be inconsistent:

```bash
# Bad: tar an active PostgreSQL data directory
tar -czf pg.tar.gz /var/lib/postgresql/

# Good: use pg_dump for consistent snapshot
pg_dump -U postgres myapp | gzip > db.sql.gz
```

3. **Not rotating logs alongside backups.** Backup logs grow unbounded:

```bash
# Rotate backup logs too
find /var/log -name "backup.log" -type f -mtime +30 -delete
```

## Additional FAQ

### How do I verify all backups in a directory?

```bash
#!/bin/bash
# verify-all-backups.sh

for backup in /backups/*.tar.gz; do
    if gzip -t "$backup" 2>/dev/null; then
        echo "OK: $backup"
    else
        echo "CORRUPT: $backup"
    fi
done
```

### Should I use restic instead of tar?

For large datasets (>10GB) or when you need deduplication, encryption, and incremental backups built in, `restic` is better than tar. For small apps (<1GB), tar + find is simpler and has zero dependencies.

### How do I estimate backup size before running?

```bash
# Estimate compressed size
du -sh "$SOURCE_DIR"
# Rough estimate: compressed size is ~40-60% of original for text files
estimated=$(du -sb "$SOURCE_DIR" | cut -f1)
estimated_compressed=$((estimated * 50 / 100))
echo "Estimated compressed: $((estimated_compressed / 1024 / 1024)) MB"
```

## Performance Tips

1. **Use parallel compression.** `pigz` is a multi-threaded gzip replacement:

```bash
# 4x faster on multi-core systems
tar -I pigz -cf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .
```

2. **Exclude unnecessary files.** Skip caches, logs, and temp files:

```bash
tar -czf "${BACKUP_FILE}" \
    --exclude="*.log" \
    --exclude="*.tmp" \
    --exclude="cache/*" \
    --exclude="node_modules/*" \
    -C "${SOURCE_DIR}" .
```

3. **Use `ionice` for low-priority I/O.** Don't let backups starve production:

```bash
ionice -c 3 tar -czf "${BACKUP_FILE}" -C "${SOURCE_DIR}" .
```
