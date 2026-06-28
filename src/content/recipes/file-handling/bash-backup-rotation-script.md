---
contentType: recipes
slug: bash-backup-rotation-script
title: "Backup Rotation Script"
description: "Automate file backups with retention policies using a Bash script that rotates daily, weekly, and monthly snapshots."
metaDescription: "Automate backups with retention policies using Bash. Rotate daily, weekly, and monthly snapshots, compress archives, and protect data from disk exhaustion."
difficulty: intermediate
topics:
  - file-handling
tags:
  - bash
  - backup
  - retention
  - automation
  - linux
relatedResources:
  - /recipes/bash-scripting-automation
  - /recipes/bash-loop-over-files
  - /recipes/bash-parallel-execution
  - /recipes/bash-text-processing
  - /recipes/generate-temporary-files
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Automate backups with retention policies using Bash. Rotate daily, weekly, and monthly snapshots, compress archives, and protect data from disk exhaustion."
  keywords:
    - file-handling
    - bash
    - backup
    - retention
    - automation
    - linux
    - /recipes/bash-scripting-automation
    - /recipes/bash-loop-over-files
    - /recipes/bash-parallel-execution
    - /recipes/bash-text-processing
    - /recipes/generate-temporary-files
    - bash
    - backup
    - retention
    - automation
    - linux
---
## Overview

Backing up data is only half the job; keeping those backups organized and pruning old ones is the other half. A backup rotation script creates snapshots on a schedule, renames them with timestamps, and deletes archives that exceed your retention window. This prevents the backup directory from growing forever while still giving you enough historical copies to recover from accidental deletion, corruption, or ransomware.

## When to Use

Use this resource when:
- Running scheduled backups on a Linux server or workstation.
- You need to keep daily, weekly, and monthly snapshots without manual cleanup.
- Disk space is limited and you want predictable backup growth.
- You want to compress snapshots before archiving them.

## Solution

### Bash backup rotation script

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/var/app/data}"
BACKUP_DIR="${2:-/var/backups/app}"
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=3

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

TODAY=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

ARCHIVE="$BACKUP_DIR/daily/app-$TODAY.tar.gz"

# Create daily backup
tar -czf "$ARCHIVE" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"

# Promote to weekly on Sundays
if [[ "$DAY_OF_WEEK" == "7" ]]; then
    cp "$ARCHIVE" "$BACKUP_DIR/weekly/app-week-$TODAY.tar.gz"
fi

# Promote to monthly on the first day of the month
if [[ "$DAY_OF_MONTH" == "01" ]]; then
    cp "$ARCHIVE" "$BACKUP_DIR/monthly/app-month-$TODAY.tar.gz"
fi

# Remove old backups
find "$BACKUP_DIR/daily" -maxdepth 1 -type f -mtime +$DAILY_RETENTION -delete
find "$BACKUP_DIR/weekly" -maxdepth 1 -type f -mtime +$((WEEKLY_RETENTION * 7)) -delete
find "$BACKUP_DIR/monthly" -maxdepth 1 -type f -mtime +$((MONTHLY_RETENTION * 30)) -delete

echo "Backup completed: $ARCHIVE"
```

## Explanation

The script takes a source directory and a backup directory as arguments. It creates a compressed tarball named with today's date and stores it in the `daily` folder. On Sundays it copies the daily backup into the `weekly` folder, and on the first day of the month it copies the daily backup into the `monthly` folder. Then it deletes files older than the configured retention thresholds. Using `set -euo pipefail` makes the script fail fast on errors or undefined variables. The `find` command with `-mtime` removes only files, keeping the directories intact.

## Variants

| Schedule | Command | Retention |
|----------|---------|-----------|
| Daily | cron at 2:00 AM | 7 days |
| Weekly | copy on Sunday | 4 weeks |
| Monthly | copy on 1st | 3 months |
| Remote | `rsync` after tar | mirror to S3 or NAS |

## Best Practices

1. **Test restores regularly.** A backup you cannot restore is useless; schedule a monthly restore test.
2. **Keep backups offsite or in object storage.** Local backups are vulnerable to disk failure and ransomware.
3. **Encrypt backups containing sensitive data.** Use `gpg` or `openssl enc` before uploading to shared storage.
4. **Use immutable snapshots when possible.** S3 Object Lock or append-only filesystems prevent backups from being deleted by attackers.
5. **Log every backup run.** Redirect output to a log file and monitor for failures with a simple alerting rule.

## Common Mistakes

1. **Forgetting to verify backup integrity.** `tar` can create a corrupt archive silently; test extraction periodically.
2. **Storing backups on the same disk as the source.** A disk failure destroys both data and backups.
3. **Using weak or predictable filenames.** Timestamps prevent collisions and make sorting easy.
4. **Ignoring exit codes.** A failed backup should stop the retention cleanup so you do not delete old backups while creating none.
5. **Running as root without need.** Use a dedicated backup user with read-only access to the source directory.

## Frequently Asked Questions

**Q: How do I restore a backup?**
A: Extract the tarball with `tar -xzf app-YYYY-MM-DD.tar.gz -C /restore/path`. Verify the extracted contents before overwriting production data.

**Q: Can I use rsync instead of tar?**
A: Yes. `rsync` is better for incremental backups, while `tar` creates self-contained snapshots. You can combine both for speed and portability.

**Q: How do I handle backups that run during file changes?**
A: Use filesystem snapshots (LVM, ZFS, or cloud snapshots) before running the backup so files are consistent during the copy.
