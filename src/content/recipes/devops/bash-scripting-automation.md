---
contentType: recipes
slug: bash-scripting-automation
title: "Bash Scripting for DevOps Automation and System Tasks"
description: "How to write robust Bash scripts for automating deployments, system monitoring, log rotation, and routine maintenance tasks"
metaDescription: "Bash scripting for DevOps automation. Write robust scripts for deployments, monitoring, log rotation, and maintenance with error handling and logging."
difficulty: beginner
topics:
  - devops
  - file-handling
tags:
  - bash
  - automation
  - devops
relatedResources:
  - /recipes/read-write-file
  - /recipes/pre-commit-hooks
  - /guides/infrastructure-as-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Bash scripting for DevOps automation. Write robust scripts for deployments, monitoring, log rotation, and maintenance with error handling and logging."
  keywords:
    - bash scripting
    - devops automation
    - shell scripting
    - system administration
    - deployment scripts
---

# Bash Scripting for DevOps Automation and System Tasks

Bash remains the lingua franca of system administration and DevOps automation. A well-structured script with proper error handling, logging, and validation can automate deployments, rotate logs, monitor services, and perform routine maintenance across any Unix-like environment without external dependencies.

## When to Use This

- You need to automate repetitive system or deployment tasks. See [Docker Basics](/recipes/devops/docker-basics) for container deployment.
- The environment is minimal (containers, CI runners, VMs) without Node/Python. See [CLI Tool Argument Parsing](/recipes/devops/cli-tool-argument-parsing) for typed CLI alternatives.
- You want self-documenting automation that any sysadmin can read and modify. See [Git Workflow](/recipes/devops/git-workflow) for version-controlled automation.

## Prerequisites

- Bash 4.0+ (check with `bash --version`)
- Basic familiarity with Unix commands and file permissions

## Solution

### 1. Defensive Script Template

```bash
#!/bin/bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/var/log/myapp/deploy.log"
readonly BACKUP_DIR="/var/backups/myapp"

# Logging functions
log() {
  local level="$1"
  shift
  echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $*" | tee -a "$LOG_FILE"
}

error() {
  log "ERROR" "$@" >&2
  exit 1
}

# Ensure required commands exist
check_dependencies() {
  local deps=("docker" "curl" "jq")
  for cmd in "${deps[@]}"; do
    if ! command -v "$cmd" &>/dev/null; then
      error "Missing required command: $cmd"
    fi
  done
}

main() {
  check_dependencies
  log "INFO" "Starting deployment..."
  
  # Your automation logic here
  
  log "INFO" "Deployment completed successfully"
}

main "$@"
```

### 2. Deployment Automation Script

```bash
#!/bin/bash
set -euo pipefail

deploy_app() {
  local version="${1:-latest}"
  local environment="${2:-staging}"
  
  echo "Deploying version $version to $environment"
  
  # Pull new image
  docker pull "myapp:$version"
  
  # Create backup of current container
  if docker ps | grep -q myapp; then
    docker rename myapp myapp-backup
    docker stop myapp-backup
  fi
  
  # Run new container with health check
  docker run -d \
    --name myapp \
    --restart unless-stopped \
    -p 8080:8080 \
    -e NODE_ENV="$environment" \
    --health-cmd="curl -f http://localhost:8080/health || exit 1" \
    --health-interval=30s \
    --health-retries=3 \
    "myapp:$version"
  
  # Wait for health check to pass
  sleep 5
  if ! docker ps | grep -q "myapp"; then
    echo "New container failed to start. Rolling back..."
    docker stop myapp || true
    docker rm myapp || true
    docker rename myapp-backup myapp
    docker start myapp
    exit 1
  fi
  
  # Clean up backup
  docker rm myapp-backup || true
  echo "Deployment successful"
}

deploy_app "$@"
```

### 3. Log Rotation and Cleanup

```bash
#!/bin/bash
set -euo pipefail

readonly LOG_DIR="/var/log/myapp"
readonly MAX_DAYS=30
readonly MAX_SIZE_MB=100

rotate_logs() {
  local log_file="$1"
  local base_name="$(basename "$log_file")"
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  
  if [[ -f "$log_file" ]]; then
    local size_mb
    size_mb=$(du -m "$log_file" | cut -f1)
    
    if [[ "$size_mb" -gt "$MAX_SIZE_MB" ]]; then
      mv "$log_file" "${LOG_DIR}/${base_name}.${timestamp}"
      gzip "${LOG_DIR}/${base_name}.${timestamp}"
      touch "$log_file"
      systemctl reload myapp || true
    fi
  fi
}

cleanup_old_logs() {
  find "$LOG_DIR" -name "*.gz" -mtime +"$MAX_DAYS" -delete
  log "INFO" "Removed logs older than $MAX_DAYS days"
}

# Process all log files
for logfile in "$LOG_DIR"/*.log; do
  [[ -e "$logfile" ]] || continue
  rotate_logs "$logfile"
done

cleanup_old_logs
```

### 4. Service Health Monitoring

```bash
#!/bin/bash
set -euo pipefail

readonly SERVICES=("nginx" "postgresql" "redis")
readonly ALERT_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

check_service() {
  local service="$1"
  
  if systemctl is-active --quiet "$service"; then
    echo "✓ $service is running"
    return 0
  else
    echo "✗ $service is DOWN"
    send_alert "$service"
    
    # Attempt restart
    systemctl restart "$service"
    sleep 2
    
    if systemctl is-active --quiet "$service"; then
      echo "✓ $service restarted successfully"
    else
      echo "✗ $service failed to restart"
    fi
  fi
}

send_alert() {
  local service="$1"
  curl -s -X POST "$ALERT_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"ALERT: Service $service is down on $(hostname)\"}" \
    > /dev/null || true
}

for service in "${SERVICES[@]}"; do
  check_service "$service"
done
```

## How It Works

1. **`set -euo pipefail`** makes the script exit on error, undefined variables, and pipeline failures
2. **`readonly`** prevents accidental variable mutation
3. **Functions** organize code into testable, reusable blocks
4. **Logging** provides an audit trail for troubleshooting

## Production Considerations

- Use **`#!/usr/bin/env bash`** for portability across distributions
- Add **`trap cleanup EXIT`** to ensure temporary files are removed
- Validate all user inputs with parameter expansion (`${1:-default}`)
- Test scripts with **`shellcheck`** before deployment

## Common Mistakes

- Forgetting `set -e` and allowing partial failures to continue silently
- Not quoting variables, causing word splitting on paths with spaces
- Hardcoding absolute paths that differ between environments

## FAQ

**Q: Should I use Bash or Python for automation?**
A: Bash for simple system tasks under 50 lines. Python for complex logic, data parsing, or when you need libraries.

**Q: How do I handle secrets in Bash scripts?**
A: Use environment variables or secret managers. Never hardcode credentials. Pass them as arguments or read from secure files.

**Q: Can I make Bash scripts idempotent?**
A: Yes. Check state before acting (`if ! systemctl is-active nginx; then ...`) and use conditional logic to skip already-completed steps.
