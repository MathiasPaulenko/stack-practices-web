---
contentType: recipes
slug: bash-scripting-automation
title: "Bash Scripting for DevOps Automation and System Tasks"
description: "How to write reliable Bash scripts for automating deployments, system monitoring, log rotation, and routine maintenance tasks"
metaDescription: "Bash scripting for DevOps automation. Write reliable scripts for deployments, monitoring, log rotation, and maintenance with error handling and logging."
difficulty: beginner
topics:
  - devops
  - file-handling
tags:
  - bash
  - automation
  - devops
  - ci-cd
  - deployment
relatedResources:
  - /recipes/read-write-file
  - /recipes/pre-commit-hooks
  - /guides/infrastructure-as-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Bash scripting for DevOps automation. Write reliable scripts for deployments, monitoring, log rotation, and maintenance with error handling and logging."
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

### Is this solution production-ready?

Yes, with caveats. The deployment script includes rollback logic, but you should add a proper health check loop instead of `sleep 5`. Test in staging first and ensure your Docker registry is accessible from the target host.

### What are the performance characteristics?

Bash itself adds negligible overhead. Performance bottlenecks come from external commands (`docker`, `curl`, `systemctl`). For high-frequency checks, batch operations and avoid spawning subshells in loops.

### How do I debug issues with this approach?

```bash
# Enable trace mode to see each command before execution
bash -x deploy.sh

# Or add set -x at specific points
set -x
docker pull "myapp:$version"
set +x

# Use shellcheck for static analysis
shellcheck deploy.sh
```

### 5. Parallel Task Execution

```bash
#!/bin/bash
set -euo pipefail

# Run health checks on multiple hosts in parallel
readonly HOSTS=("web1.prod" "web2.prod" "web3.prod" "api1.prod")
readonly MAX_PARALLEL=4
readonly RESULTS_DIR="/tmp/health-results"
mkdir -p "$RESULTS_DIR"

check_host() {
  local host="$1"
  local result_file="${RESULTS_DIR}/${host}.txt"
  if ssh -o ConnectTimeout=5 "$host" "systemctl is-active nginx" > /dev/null 2>&1; then
    echo "OK: $host" > "$result_file"
  else
    echo "FAIL: $host" > "$result_file"
  fi
}

# Launch background jobs with parallelism limit
running=0
for host in "${HOSTS[@]}"; do
  check_host "$host" &
  ((running++))
  if [ "$running" -ge "$MAX_PARALLEL" ]; then
    wait -n  # Wait for any one job to finish
    ((running--))
  fi
done
wait  # Wait for all remaining jobs

# Collect results
cat "$RESULTS_DIR"/*.txt
rm -rf "$RESULTS_DIR"
```

### 6. Trap-Based Cleanup

```bash
#!/bin/bash
set -euo pipefail

TMP_DIR=""
LOCK_FILE=""

cleanup() {
  echo "Cleaning up..."
  [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ] && rm -rf "$TMP_DIR"
  [ -n "$LOCK_FILE" ] && [ -f "$LOCK_FILE" ] && rm -f "$LOCK_FILE"
}

trap cleanup EXIT INT TERM

# Create temp resources
TMP_DIR=$(mktemp -d)
LOCK_FILE="/tmp/myapp.lock"

# Acquire lock
if [ -f "$LOCK_FILE" ]; then
  echo "Another instance is already running"
  exit 1
fi
echo $$ > "$LOCK_FILE"

# Main work
echo "Working in $TMP_DIR..."
# Cleanup happens automatically on exit
```

### 7. Argument Parsing with getopts

```bash
#!/bin/bash
set -euo pipefail

# Usage: ./deploy.sh -v 1.2.3 -e staging -d
VERSION="latest"
ENVIRONMENT="staging"
DRY_RUN=false

usage() {
  echo "Usage: $0 [-v version] [-e environment] [-d]"
  echo "  -v  Version to deploy (default: latest)"
  echo "  -e  Environment (default: staging)"
  echo "  -d  Dry run (show commands without executing)"
  exit 1
}

while getopts ":v:e:dh" opt; do
  case $opt in
    v) VERSION="$OPTARG" ;;
    e) ENVIRONMENT="$OPTARG" ;;
    d) DRY_RUN=true ;;
    h) usage ;;
    \?) echo "Invalid option: -$OPTARG" >&2; usage ;;
    :) echo "Option -$OPTARG requires an argument" >&2; usage ;;
  esac
done

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Would deploy version $VERSION to $ENVIRONMENT"
  echo "[DRY RUN] docker pull myapp:$VERSION"
  echo "[DRY RUN] docker run -d --name myapp -e NODE_ENV=$ENVIRONMENT myapp:$VERSION"
  exit 0
fi

echo "Deploying version $VERSION to $ENVIRONMENT"
docker pull "myapp:$VERSION"
docker run -d --name myapp -e NODE_ENV="$ENVIRONMENT" "myapp:$VERSION"
```

### 8. Config File Sourcing

```bash
#!/bin/bash
set -euo pipefail

# Load configuration from external file
CONFIG_FILE="${1:-/etc/myapp/deploy.conf}"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Config file not found: $CONFIG_FILE" >&2
  exit 1
fi

# Source config (defines variables like APP_NAME, REGISTRY, PORTS)
source "$CONFIG_FILE"

# Validate required config
for var in APP_NAME REGISTRY PORTS; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required config: $var" >&2
    exit 1
  fi
done

echo "Deploying $APP_NAME from $REGISTRY"
```

```bash
# /etc/myapp/deploy.conf
APP_NAME="myapp"
REGISTRY="registry.example.com"
PORTS="8080:8080"
ENVIRONMENT="production"
HEALTH_CHECK_URL="http://localhost:8080/health"
```

## Additional Best Practices

1. **Use `set -o pipefail` with `set -e`.** Without `pipefail`, a failed command in a pipeline doesn't trigger `set -e`:

```bash
# Bad: grep failure is silently ignored
set -e
docker logs myapp | grep "ERROR"

# Good: pipefail catches the grep failure
set -eo pipefail
docker logs myapp | grep "ERROR"
```

2. **Use `local` in functions.** Variables leak to global scope without it:

```bash
# Bad: i leaks to global scope
count_items() {
  i=0
  for item in "$@"; do ((i++)); done
}

# Good: i is scoped to the function
count_items() {
  local i=0
  for item in "$@"; do ((i++)); done
  echo "$i"
}
```

3. **Use `[[ ]]` instead of `[ ]`.** More robust, supports pattern matching:

```bash
# Good: pattern matching
if [[ "$file" == *.log ]]; then
  echo "Log file"
fi

# Good: regex matching
if [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Valid semver"
fi
```

## Additional Common Mistakes

1. **Not using `wait` with background jobs.** Script exits before jobs finish:

```bash
# Bad: script exits immediately
ssh host1 "deploy.sh" &
ssh host2 "deploy.sh" &
# Script ends, jobs may be killed

# Good: wait for all jobs
ssh host1 "deploy.sh" &
ssh host2 "deploy.sh" &
wait
```

2. **Using `eval` with untrusted input.** Leads to command injection:

```bash
# Bad: command injection if USER_INPUT is "; rm -rf /"
eval "echo $USER_INPUT"

# Good: use printf or direct variable expansion
echo "$USER_INPUT"
```

3. **Not handling `set -e` in subshells.** `set -e` doesn't propagate to subshells:

```bash
# Bad: failure in subshell is silently ignored
set -e
result=$(failing_command | grep something)
echo "Continuing despite failure"

# Good: check exit status explicitly
set -eo pipefail
if ! result=$(failing_command 2>&1); then
  echo "Command failed: $result"
  exit 1
fi
```

## Additional FAQ

### How do I send Slack alerts from a Bash script?

```bash
send_slack() {
  local message="$1"
  local webhook_url="${SLACK_WEBHOOK:-}"
  [ -z "$webhook_url" ] && return 0

  curl -s -X POST "$webhook_url" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"$(hostname): $message\"}" \
    > /dev/null 2>&1 || true
}

# Usage
send_slack "Deployment completed for version $VERSION"
send_slack "ALERT: Service $service is down"
```

### How do I implement a retry loop in Bash?

```bash
retry() {
  local max_attempts=$1
  local delay=$2
  shift 2
  local attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    if "$@"; then
      return 0
    fi
    echo "Attempt $attempt failed. Retrying in ${delay}s..."
    sleep "$delay"
    ((attempt++))
  done

  echo "All $max_attempts attempts failed"
  return 1
}

# Retry docker pull 3 times with 5s delay
retry 3 5 docker pull "myapp:$VERSION"
```

### How do I lock a script to prevent concurrent execution?

```bash
# Use flock for advisory file locking
exec 200>/tmp/myapp.lock
if ! flock -n 200; then
  echo "Another instance is already running" >&2
  exit 1
fi
# Script runs with exclusive lock on fd 200
```

## Performance Tips

1. **Avoid subshells in loops.** Each `$(...)` spawns a new process:

```bash
# Slow: spawns a subshell for each iteration
for file in *.log; do
  size=$(stat -c%s "$file")
  echo "$file: $size"
done

# Faster: use bash builtins where possible
for file in *.log; do
  echo "$file: $(wc -c < "$file")"
done
```

2. **Batch SSH commands instead of looping.** One SSH connection is faster than many:

```bash
# Slow: 10 SSH connections
for host in "${HOSTS[@]}"; do
  ssh "$host" "uptime"
  ssh "$host" "df -h"
  ssh "$host" "free -m"
done

# Fast: 1 SSH connection per host
for host in "${HOSTS[@]}"; do
  ssh "$host" "uptime; df -h; free -m"
done
```

3. **Use `xargs -P` for parallel batch processing.** Faster than manual background jobs:

```bash
# Process files in parallel (4 at a time)
find /var/log -name "*.gz" -mtime +30 | xargs -P4 -I{} rm {}

# Parallel SSH checks
printf '%s\n' "${HOSTS[@]}" | xargs -P4 -I{} ssh {} "uptime"
```
