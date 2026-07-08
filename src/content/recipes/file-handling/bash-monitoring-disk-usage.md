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

### Slack alert integration

```bash
#!/usr/bin/env bash
set -euo pipefail

SLACK_WEBHOOK="${SLACK_WEBHOOK:-https://hooks.slack.com/services/XXX}"
THRESHOLD="${1:-80}"
HOSTNAME=$(hostname)

send_slack_alert() {
    local mount="$1" usage="$2" fs="$3"
    local payload
    payload=$(cat <<EOF
{
    "text": "Disk alert on ${HOSTNAME}",
    "attachments": [{
        "color": "danger",
        "fields": [
            {"title": "Mount", "value": "${mount}", "short": true},
            {"title": "Usage", "value": "${usage}", "short": true},
            {"title": "Filesystem", "value": "${fs}", "short": true},
            {"title": "Host", "value": "${HOSTNAME}", "short": true}
        ]
    }]
}
EOF
)
    curl -s -X POST -H 'Content-Type: application/json' -d "$payload" "$SLACK_WEBHOOK"
}

df -Hl | awk 'NR>1 && /^\/dev/{print $1, $5, $6}' | while read -r fs usage mount; do
    usage_val="${usage%\%}"
    if (( usage_val >= THRESHOLD )); then
        send_slack_alert "$mount" "$usage" "$fs"
        echo "[$(date -Iseconds)] WARNING: $mount ($fs) at $usage — Slack alert sent"
    fi
done
```

### Inode monitoring (disk can have space but no inodes)

```bash
#!/usr/bin/env bash
set -euo pipefail

INODE_THRESHOLD="${1:-80}"

df -i | awk 'NR>1 && /^\/dev/{print $1, $5, $6}' | while read -r fs iusage mount; do
    iusage_val="${iusage%\%}"
    if (( iusage_val >= INODE_THRESHOLD )); then
        echo "WARNING: $mount ($fs) inode usage at $iusage"
        # Find directories with the most files
        top_dirs=$(find "$mount" -xdev -type d -exec sh -c 'echo $(find "$0" -maxdepth 1 -type f | wc -l) "$0"' {} \; 2>/dev/null | sort -rn | head -5)
        echo "Top directories by file count:"
        echo "$top_dirs"
    fi
done
```

### Systemd timer for disk monitoring (replaces cron)

```ini
# /etc/systemd/system/disk-monitor.service
[Unit]
Description=Disk usage monitoring
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/disk-monitor.sh 80 admin@example.com
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/disk-monitor.timer
[Unit]
Description=Run disk monitor every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
AccuracySec=30s

[Install]
WantedBy=timers.target
```

```bash
# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now disk-monitor.timer
systemctl list-timers disk-monitor.timer
```

### Prometheus node_exporter disk alerts

```yaml
# prometheus-alerts.yml
groups:
  - name: disk_usage
    rules:
      - alert: HighDiskUsage
        expr: |
          (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk usage high on {{ $labels.instance }}"
          description: "{{ $labels.mountpoint }} is at {{ printf \"%.1f\" $value }}% usage"

      - alert: CriticalDiskUsage
        expr: |
          (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 > 90
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Disk usage critical on {{ $labels.instance }}"
          description: "{{ $labels.mountpoint }} is at {{ printf \"%.1f\" $value }}% usage"

      - alert: HighInodeUsage
        expr: |
          (1 - node_filesystem_files_free / node_filesystem_files) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Inode usage high on {{ $labels.instance }}"
          description: "{{ $labels.mountpoint }} has {{ printf \"%.1f\" $value }}% inode usage"

      - alert: DiskWillFillIn24h
        expr: |
          predict_linear(node_filesystem_avail_bytes[1h], 24 * 3600) < 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Disk will fill within 24h on {{ $labels.instance }}"
          description: "{{ $labels.mountpoint }} predicted to fill based on current rate"
```

### Automatic cleanup with log rotation trigger

```bash
#!/usr/bin/env bash
set -euo pipefail

CLEANUP_THRESHOLD="${1:-90}"
LOG_DIR="${2:-/var/log/app}"
ARCHIVE_DIR="${3:-/var/log/archive}"

df -Hl | awk 'NR>1 && /^\/dev/{print $1, $5, $6}' | while read -r fs usage mount; do
    usage_val="${usage%\%}"
    if (( usage_val >= CLEANUP_THRESHOLD )); then
        echo "[$(date -Iseconds)] CRITICAL: $mount at $usage — triggering cleanup"

        # Compress logs older than 7 days
        find "$LOG_DIR" -name "*.log" -mtime +7 -exec gzip -9 {} \;

        # Move compressed logs to archive
        find "$LOG_DIR" -name "*.gz" -mtime +1 -exec mv {} "$ARCHIVE_DIR/" \;

        # Delete archives older than 90 days
        find "$ARCHIVE_DIR" -name "*.gz" -mtime +90 -delete

        # Clean package manager cache
        if command -v apt-get &>/dev/null; then
            apt-get clean
        elif command -v yum &>/dev/null; then
            yum clean all
        fi

        # Clean Docker if present
        if command -v docker &>/dev/null; then
            docker system prune -f --volumes
        fi

        # Report freed space
        new_usage=$(df -Hl "$mount" | awk 'NR>1 {print $5}')
        echo "[$(date -Iseconds)] Cleanup complete. $mount now at $new_usage"
    fi
done
```

## Additional Best Practices

1. **Monitor inode usage separately.** A disk can have free space but run out of inodes (file slots). This happens with workloads that create millions of small files — mail servers, cache directories, session storage. Check inodes with `df -i` and alert on the same thresholds.

2. **Use predictive alerting.** Instead of alerting on current usage, alert on predicted usage. Prometheus `predict_linear()` can forecast when a disk will fill based on the rate of change. This gives you hours or days of warning instead of minutes.

3. **Exclude read-only and tmpfs mounts.** Filter out `tmpfs`, `devtmpfs`, `overlay`, and read-only filesystems from monitoring. They either cannot be cleaned or are managed by the kernel:

```bash
# Only monitor real block devices, excluding tmpfs and overlays
df -Hl -x tmpfs -x devtmpfs -x overlay -x squashfs | awk 'NR>1 && /^\/dev/{print $1, $5, $6}'
```

4. **Track disk usage trends.** Log daily usage to a file or database. Trends reveal which mounts grow fastest and help plan capacity upgrades before alerts fire:

```bash
# Append daily usage to a CSV for trend analysis
echo "$(date -Iseconds),$(hostname),$mount,$usage" >> /var/log/disk-usage-trends.csv
```

## Additional Common Mistakes

1. **Not monitoring Docker storage.** Docker uses `/var/lib/docker` which can grow rapidly with images, containers, and volumes. Monitor this path separately and schedule regular `docker system prune` jobs. A full Docker storage partition prevents new containers from starting.

2. **Forgetting about mounted network volumes.** NFS and SMB mounts can fill up on the remote server, causing local writes to hang. Monitor network mounts with shorter timeouts and alert on latency as well as usage. Use `timeout` with `df` to avoid hanging on unresponsive NFS servers:

```bash
timeout 10 df -Hl "$NFS_MOUNT" || echo "NFS mount $NFS_MOUNT is unresponsive"
```

3. **Using percentage thresholds on very large or very small disks.** On a 100TB disk, 80% means 20TB free — plenty of space. On a 10GB disk, 80% means 2GB free — critical. Use absolute byte thresholds for small disks and percentage thresholds for large ones:

```bash
# Alert if free space is below 5GB OR usage is above 90%
avail_bytes=$(df -B1 "$mount" | awk 'NR>1 {print $4}')
if (( avail_bytes < 5368709120 )) || (( usage_val >= 90 )); then
    echo "WARNING: $mount has only $((avail_bytes / 1073741824))GB free"
fi
```

## Additional FAQ

### How do I monitor disk usage in Kubernetes?

For Kubernetes, monitor node disk usage via node_exporter and Prometheus. Alert on `node_filesystem_avail_bytes` for node-level disk pressure. For PersistentVolume usage, use kubelet volume stats metrics: `kubelet_volume_stats_available_bytes` and `kubelet_volume_stats_capacity_bytes`. Kubernetes also has built-in disk pressure eviction — configure `--eviction-hard` with `nodefs.available<10%` and `imagefs.available<15%` to automatically evict pods when disk is low.

### Is this solution production-ready?

Yes. The `df`-based monitoring script runs on every Linux distribution without additional dependencies. Slack webhook integration is used by thousands of teams for alerting. Systemd timers are the standard replacement for cron on modern Linux. Prometheus node_exporter is the industry standard for host-level metrics and is used by companies like DigitalOcean, Uber, and GitLab. The cleanup script uses standard `find`, `gzip`, and package manager commands that work across distributions.

### What are the performance characteristics?

`df` completes in under 10ms on local filesystems and under 100ms on NFS mounts. Running it every 5 minutes adds negligible overhead. The `find` commands in the cleanup script can take seconds to minutes on directories with millions of files — run cleanup during off-peak hours. Slack webhook calls add 200-500ms of network latency. Prometheus node_exporter adds 1-5ms per scrape for filesystem metrics. Inode counting with `find` is the most expensive operation and should be rate-limited to once per hour.

### How do I debug issues with this approach?

Run `df -Hl` manually to see what the script sees. Check if `mail` is installed and configured with `echo test | mail -s test your@email.com`. Test Slack webhooks with `curl -X POST -H 'Content-Type: application/json' -d '{"text":"test"}' YOUR_WEBHOOK_URL`. Check systemd timer status with `systemctl status disk-monitor.timer` and logs with `journalctl -u disk-monitor.service`. For Prometheus alerts, verify the expression in the Prometheus UI under Alerts. For cleanup scripts, test `find` and `gzip` commands manually before enabling them in production.
