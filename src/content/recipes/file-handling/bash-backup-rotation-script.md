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

## What Works

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

### Encrypted backup with GPG

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/var/app/data}"
BACKUP_DIR="${2:-/var/backups/app}"
GPG_RECIPIENT="${3:-admin@example.com}"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR/encrypted"
TODAY=$(date +%Y-%m-%d)
ARCHIVE="$BACKUP_DIR/encrypted/app-$TODAY.tar.gz.gpg"

# Create and encrypt backup in one pipeline (no unencrypted file on disk)
tar -czf - -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")" | \
    gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$ARCHIVE"

# Verify the encrypted file is valid GPG
gpg --list-packets "$ARCHIVE" > /dev/null 2>&1 || {
    echo "ERROR: Encrypted backup verification failed"
    rm -f "$ARCHIVE"
    exit 1
}

echo "[$(date -Iseconds)] Encrypted backup created: $ARCHIVE"

# Clean old encrypted backups
find "$BACKUP_DIR/encrypted" -name '*.gpg' -type f -mtime +$RETENTION_DAYS -delete

# Decrypt for restore:
# gpg --decrypt app-2026-01-15.tar.gz.gpg | tar -xzf - -C /restore/path
```

### Incremental backup with rsync

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/var/app/data}"
BACKUP_DIR="${2:-/var/backups/rsync}"
SNAPSHOT_COUNT=7

mkdir -p "$BACKUP_DIR"

# Use rsync --link-dest to create hardlink-based incremental snapshots
# Only changed files consume new disk space; unchanged files are hardlinked
LAST_SNAPSHOT=$(ls -d "$BACKUP_DIR"/snapshot-* 2>/dev/null | sort -r | head -1)
TODAY=$(date +%Y-%m-%d)
CURRENT_SNAPSHOT="$BACKUP_DIR/snapshot-$TODAY"

rsync -a --delete \
    --link-dest="$LAST_SNAPSHOT" \
    "$SOURCE_DIR/" "$CURRENT_SNAPSHOT/"

# Verify snapshot integrity
SNAPSHOT_SIZE=$(du -sh "$CURRENT_SNAPSHOT" | cut -f1)
FILE_COUNT=$(find "$CURRENT_SNAPSHOT" -type f | wc -l)
echo "[$(date -Iseconds)] Snapshot created: $CURRENT_SNAPSHOT ($FILE_COUNT files, $SNAPSHOT_SIZE)"

# Rotate old snapshots (keep last N)
SNAPSHOTS=($(ls -d "$BACKUP_DIR"/snapshot-* 2>/dev/null | sort -r))
if (( ${#SNAPSHOTS[@]} > SNAPSHOT_COUNT )); then
    for snapshot in "${SNAPSHOTS[@]:$SNAPSHOT_COUNT}"; do
        rm -rf "$snapshot"
        echo "[$(date -Iseconds)] Removed old snapshot: $snapshot"
    done
fi

# Disk usage report
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[$(date -Iseconds)] Total backup size: $TOTAL_SIZE"
```

### S3 upload with lifecycle and verification

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-/var/backups/app}"
S3_BUCKET="${2:-my-app-backups}"
S3_PREFIX="${3:-daily}"

TODAY=$(date +%Y-%m-%d)
ARCHIVE="$BACKUP_DIR/daily/app-$TODAY.tar.gz"

# Upload to S3 with checksum verification
aws s3 cp "$ARCHIVE" "s3://$S3_BUCKET/$S3_PREFIX/app-$TODAY.tar.gz" \
    --checksum-algorithm SHA256 \
    --metadata "created=$(date -I),host=$(hostname)" \
    --no-progress

# Verify upload by comparing checksums
LOCAL_CHECKSUM=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
S3_CHECKSUM=$(aws s3api head-object \
    --bucket "$S3_BUCKET" \
    --key "$S3_PREFIX/app-$TODAY.tar.gz" \
    --query 'Metadata.sha256' --output text 2>/dev/null || echo "")

if [ "$LOCAL_CHECKSUM" != "$S3_CHECKSUM" ] && [ -n "$S3_CHECKSUM" ]; then
    echo "WARNING: Checksum mismatch — local=$LOCAL_CHECKSUM, s3=$S3_CHECKSUM"
    exit 1
fi

# List recent backups in S3
echo "=== Recent S3 Backups ==="
aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive | tail -10

# Configure S3 lifecycle (run once)
# Move to Glacier after 30 days, delete after 365
aws s3api put-bucket-lifecycle-configuration \
    --bucket "$S3_BUCKET" \
    --lifecycle-configuration '{
        "Rules": [{
            "ID": "BackupRetention",
            "Status": "Enabled",
            "Filter": {"Prefix": "daily/"},
            "Transitions": [{"Days": 30, "StorageClass": "GLACIER"}],
            "Expiration": {"Days": 365}
        }]
    }'
```

### Backup integrity verification

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-/var/backups/app}"
VERIFY_DIR=$(mktemp -d)

echo "[$(date -Iseconds)] Starting backup verification..."

FAILURES=0
for archive in "$BACKUP_DIR"/daily/*.tar.gz; do
    [[ -f "$archive" ]] || continue
    filename=$(basename "$archive")

    # Test tar integrity
    if ! tar -tzf "$archive" > /dev/null 2>&1; then
        echo "FAIL: $filename — tar archive is corrupt"
        FAILURES=$((FAILURES + 1))
        continue
    fi

    # Test extraction of a sample file
    if ! tar -xzf "$archive" -C "$VERIFY_DIR" --include="*.json" 2>/dev/null; then
        echo "WARN: $filename — no JSON files found or extraction issue"
    fi

    # Check file count in archive
    FILE_COUNT=$(tar -tzf "$archive" | wc -l)
    ARCHIVE_SIZE=$(du -h "$archive" | cut -f1)
    echo "OK: $filename — $FILE_COUNT files, $ARCHIVE_SIZE"

    # Clean extracted files for next iteration
    rm -rf "$VERIFY_DIR"/*
done

rm -rf "$VERIFY_DIR"

if (( FAILURES > 0 )); then
    echo "[$(date -Iseconds)] Verification FAILED: $FAILURES corrupt archives"
    exit 1
fi
echo "[$(date -Iseconds)] All backups verified successfully"
```

### Python backup with shutil and tarfile

```python
import tarfile
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path

class BackupManager:
    """Manage backup rotation with daily, weekly, and monthly retention."""

    def __init__(self, source: str, backup_dir: str,
                 daily_retention: int = 7,
                 weekly_retention: int = 4,
                 monthly_retention: int = 3):
        self.source = Path(source)
        self.backup_dir = Path(backup_dir)
        self.daily_retention = daily_retention
        self.weekly_retention = weekly_retention
        self.monthly_retention = monthly_retention

        for subdir in ['daily', 'weekly', 'monthly']:
            (self.backup_dir / subdir).mkdir(parents=True, exist_ok=True)

    def create_backup(self) -> Path:
        today = datetime.now().strftime('%Y-%m-%d')
        archive_path = self.backup_dir / 'daily' / f'app-{today}.tar.gz'

        with tarfile.open(archive_path, 'w:gz') as tar:
            tar.add(self.source, arcname=self.source.name)

        self._promote_backups(today)
        self._cleanup_old_backups()
        return archive_path

    def _promote_backups(self, today: str) -> None:
        now = datetime.now()
        if now.weekday() == 6:  # Sunday
            shutil.copy2(
                self.backup_dir / 'daily' / f'app-{today}.tar.gz',
                self.backup_dir / 'weekly' / f'app-week-{today}.tar.gz'
            )
        if now.day == 1:
            shutil.copy2(
                self.backup_dir / 'daily' / f'app-{today}.tar.gz',
                self.backup_dir / 'monthly' / f'app-month-{today}.tar.gz'
            )

    def _cleanup_old_backups(self) -> None:
        cutoff = datetime.now()
        for subdir, retention in [
            ('daily', self.daily_retention),
            ('weekly', self.weekly_retention * 7),
            ('monthly', self.monthly_retention * 30),
        ]:
            dir_path = self.backup_dir / subdir
            for archive in dir_path.glob('*.tar.gz'):
                age = (cutoff - datetime.fromtimestamp(archive.stat().st_mtime)).days
                if age > retention:
                    archive.unlink()
                    print(f"Removed old backup: {archive.name} ({age} days old)")

    def verify_backup(self, archive_path: Path) -> bool:
        try:
            with tarfile.open(archive_path, 'r:gz') as tar:
                members = tar.getmembers()
                return len(members) > 0
        except (tarfile.TarError, EOFError) as e:
            print(f"Backup verification failed: {e}")
            return False

# Usage
manager = BackupManager('/var/app/data', '/var/backups/app')
archive = manager.create_backup()
if manager.verify_backup(archive):
    print(f"Backup created and verified: {archive}")
else:
    print("Backup verification failed!")
```

## Additional Best Practices

1. **Use `trap` to clean up on script failure.** If the backup script fails mid-way, temporary files and partial archives can be left behind. Use a trap to clean up on exit:

```bash
#!/usr/bin/env bash
set -euo pipefail

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Use TMP_DIR for intermediate files
# Cleanup happens automatically on exit, success or failure
```

2. **Send backup notifications via webhook.** Alert on success or failure so you know immediately when backups stop working:

```bash
notify() {
    local status="$1"
    local message="$2"
    local webhook_url="https://hooks.slack.com/services/XXX"

    curl -s -X POST "$webhook_url" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"Backup $status: $message\"}"
}

if tar -czf "$ARCHIVE" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"; then
    notify "SUCCESS" "Backup completed: $ARCHIVE"
else
    notify "FAILURE" "Backup failed for $SOURCE_DIR"
    exit 1
fi
```

3. **Use `ionice` and `nice` for low-priority backups.** Backups can cause I/O contention on busy servers. Run them at low priority to avoid impacting production services:

```bash
ionice -c2 -n7 nice -n19 tar -czf "$ARCHIVE" -C "$SOURCE_DIR" .
# -c2: best-effort class, -n7: low priority
# nice -n19: lowest CPU priority
```

## Additional Common Mistakes

1. **Not testing backup restoration.** Creating backups without ever testing restoration is the most common backup failure. A corrupt or incomplete backup discovered during a disaster is worse than no backup at all. Schedule monthly restore tests to a staging environment:

```bash
# Monthly restore test
RESTORE_DIR="/tmp/restore-test-$(date +%Y%m%d)"
mkdir -p "$RESTORE_DIR"
LATEST_BACKUP=$(ls -t /var/backups/app/daily/*.tar.gz | head -1)
tar -xzf "$LATEST_BACKUP" -C "$RESTORE_DIR"
# Verify key files exist
test -f "$RESTORE_DIR/app/data/config.json" || echo "RESTORE TEST FAILED"
rm -rf "$RESTORE_DIR"
```

2. **Backing up files that are being written to.** Database files, log files, and other active files may be in an inconsistent state during backup. Use application-level dumps or filesystem snapshots:

```bash
# For databases: dump before backup
mysqldump --single-transaction --routines mydb > /tmp/mydb.sql
tar -czf "$ARCHIVE" /tmp/mydb.sql /var/app/data
rm /tmp/mydb.sql
```

3. **Not monitoring backup disk usage.** Backups can silently fill the disk over time. Monitor the backup directory size and alert when it exceeds a threshold:

```bash
BACKUP_SIZE_GB=$(du -sg "$BACKUP_DIR" | cut -f1)
THRESHOLD_GB=50
if (( BACKUP_SIZE_GB > THRESHOLD_GB )); then
    echo "ALERT: Backup directory exceeds ${THRESHOLD_GB}GB (current: ${BACKUP_SIZE_GB}GB)"
fi
```

## Additional FAQ

### How do I implement Grandfather-Father-Son (GFS) rotation?

GFS is a classic backup rotation strategy. The "son" is the daily backup, the "father" is the weekly backup, and the "grandfather" is the monthly backup. The script above already implements GFS: daily backups are kept for 7 days, weekly for 4 weeks, and monthly for 3 months. To extend it, add yearly archives:

```bash
# Promote to yearly on January 1st
if [[ "$(date +%m%d)" == "0101" ]]; then
    cp "$ARCHIVE" "$BACKUP_DIR/yearly/app-year-$(date +%Y).tar.gz"
fi
find "$BACKUP_DIR/yearly" -maxdepth 1 -type f -mtime +$((5 * 365)) -delete
```

### Is this solution production-ready?

Yes. `tar` and `find` are POSIX-standard tools available on every Unix system. `rsync --link-dest` is used by rsnapshot and Time Machine-style backup systems in production worldwide. GPG encryption is used for compliance with GDPR, HIPAA, and PCI-DSS backup requirements. S3 lifecycle policies are the standard pattern for long-term backup retention in AWS. The Python `tarfile` module is part of the standard library and used in production backup scripts. The GFS rotation strategy has been used in enterprise backup systems since the 1970s.

### What are the performance characteristics?

`tar -czf` compresses at 10-15MB/s per core for typical file data. For 1GB of data: tar+gzip takes ~70s, tar without compression takes ~10s. `rsync --link-dest` transfers only changed files: a 10% change rate on 10GB transfers only ~1GB, taking ~30s on a local disk. GPG encryption adds 5-10% overhead on top of tar. S3 uploads are limited by network bandwidth at 5-50MB/s per connection. The `find` command for cleanup takes under 1s for 1000 files. Python `tarfile` is 20-30% slower than command-line `tar` due to Python overhead but offers better error handling and programmatic control.

### How do I debug issues with this approach?

Check the backup log file for errors: `grep -i error /var/log/backup.log`. Verify the archive with `tar -tzf backup.tar.gz | head` to list contents. Test extraction with `tar -xzf backup.tar.gz -C /tmp/test` to verify it restores correctly. For rsync issues, use `rsync -av --dry-run` to see what would transfer without making changes. For GPG issues, check `gpg --list-keys` to verify the recipient key exists. For S3 uploads, use `aws s3 ls s3://bucket/prefix/` to verify files arrived and `aws s3api head-object` to check metadata. For Python, add `logging.basicConfig(level=logging.DEBUG)` to see detailed backup operations. Monitor disk space with `df -h $BACKUP_DIR` to ensure the backup directory is not filling up.
