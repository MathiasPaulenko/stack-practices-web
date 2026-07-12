---



contentType: docs
slug: on-call-runbook-template
title: "On-Call Runbook Template"
description: "A template documenting common alerts and step-by-step response procedures for on-call engineers."
metaDescription: "Use this on-call runbook template to document common alerts, step-by-step response procedures, and troubleshooting steps for on-call engineers."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - on-call
  - runbook
  - alerts
  - operations
  - template
relatedResources:
  - /docs/escalation-policy-template
  - /docs/runbook-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/patch-management-template
  - /docs/dependency-upgrade-template
  - /docs/service-level-objective-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this on-call runbook template to document common alerts, step-by-step response procedures, and troubleshooting steps for on-call engineers."
  keywords:
    - devops
    - on-call
    - runbook
    - alerts
    - operations
    - template



---
## Overview

At 3 a.m., a junior engineer receives a page: "Database connection pool exhausted." Without a runbook, they spend 30 minutes Googling instead of 5 minutes following a checklist. A runbook is not a luxury for large teams—it is a survival tool for whoever is on-call. This template structures common alerts, diagnostic steps, and resolution procedures so on-call engineers act with confidence, not fear.

## When to Use

Use this resource when:
- You are creating your team's first on-call rotation and have no documented procedures
- Your mean-time-to-resolution (MTTR) is high because engineers debug from scratch each time
- You are onboarding new team members who will join the on-call rotation

## Solution

```markdown
# On-Call Runbook: `<Service / Team>`

## 1. Alert Index

| Alert Name | Severity | Page? | Runbook Section | Last Verified |
|------------|----------|-------|-----------------|---------------|
| High Error Rate | SEV 2 | Yes | 2.1 | `YYYY-MM-DD` |
| Latency P99 > 2s | SEV 2 | Yes | 2.2 | `YYYY-MM-DD` |
| Disk Usage > 85% | SEV 3 | No | 2.3 | `YYYY-MM-DD` |
| Memory Usage > 90% | SEV 3 | No | 2.4 | `YYYY-MM-DD` |
| SSL Expiry < 7 days | SEV 3 | No | 2.5 | `YYYY-MM-DD` |
| Dependency Unhealthy | SEV 2 | Yes | 2.6 | `YYYY-MM-DD` |
| Job Queue Backlog | SEV 3 | No | 2.7 | `YYYY-MM-DD` |

## 2. Response Procedures

### 2.1. High Error Rate

**Symptoms:**
- Error rate > 1% (or threshold defined in alert)
- Spike in 5xx responses

**Diagnostic Steps:**
1. Check error dashboard for top error types
2. Correlate with recent deployments (last 2 hours)
3. Check downstream dependency health
4. Review application logs for stack traces

**Resolution:**
- If caused by deployment: execute rollback plan
- If caused by dependency failure: see 2.6 Dependency Unhealthy
- If caused by resource exhaustion: see 2.3 or 2.4
- If transient spike: monitor for 10 minutes; auto-recovery common

**Escalation:**
- If error rate > 10% or data-loss errors: page team lead (SEV 1)
- If no root cause within 30 minutes: page team lead

### 2.2. Latency P99 > 2s

**Symptoms:**
- P99 latency above threshold
- User complaints about slow responses

**Diagnostic Steps:**
1. Check database query latency
2. Check cache hit rate (Redis / Memcached)
3. Check for N+1 query patterns in logs
4. Check downstream service latency
5. Review CPU and memory utilization

**Resolution:**
- If database bottleneck: kill long-running queries, scale read replicas
- If cache miss storm: pre-warm cache, increase TTL temporarily
- If downstream latency: see 2.6 Dependency Unhealthy

**Escalation:**
- If latency > 10s or affecting > 50% of users: page team lead
- If caused by DDoS: engage security team immediately

### 2.3. Disk Usage > 85%

**Symptoms:**
- Disk usage alert firing
- Risk of write failures

**Diagnostic Steps:**
1. Identify largest directories (`du -sh /* | sort -rh | head`)
2. Check log rotation configuration
3. Check for temporary files or core dumps
4. Check database size and growth rate

**Resolution:**
- Clean old logs (ensure retention policy allows)
- Truncate oversized tables / partitions
- Expand disk if cloud-hosted (AWS EBS, GCP PD)
- Enable log rotation if disabled

**Escalation:**
- If > 95% and writes failing: page team lead
- If expansion fails: page infrastructure team

### 2.4. Memory Usage > 90%

**Symptoms:**
- Memory usage alert firing
- Risk of OOM kills

**Diagnostic Steps:**
1. Identify memory-hungry processes (`ps aux --sort=-%mem | head`)
2. Check for memory leaks (trend over 7 days)
3. Check cache size and eviction rate
4. Check for unbounded queue growth

**Resolution:**
- Restart service if leak suspected (temporary fix)
- Scale to larger instance if sustained growth
- Reduce cache size or TTL
- Fix code leak in next release

**Escalation:**
- If OOM kills causing restarts: page team lead
- If leak root cause unclear: page team lead

### 2.5. SSL Expiry < 7 Days

**Symptoms:**
- Certificate expiration warning

**Diagnostic Steps:**
1. Confirm certificate details and exact expiry date
2. Verify auto-renewal is configured
3. Check if cert is deployed on all endpoints

**Resolution:**
- If auto-renewal failed: manually renew (see cert runbook)
- If manual cert: create renewal ticket for SRE team
- Deploy renewed cert to all load balancers / CDNs

**Escalation:**
- If expiry < 24 hours: page SRE team lead

### 2.6. Dependency Unhealthy

**Symptoms:**
- Downstream service health check failing
- Timeout errors to specific endpoint

**Diagnostic Steps:**
1. Check dependency status page
2. Check dependency metrics dashboard
3. Verify network connectivity (ping, traceroute)
4. Check for DNS resolution issues
5. Verify authentication tokens / API keys not expired

**Resolution:**
- If dependency outage: enable circuit breaker, serve degraded mode
- If network issue: engage network / cloud provider
- If auth issue: rotate credentials
- If capacity issue: request dependency team scale

**Escalation:**
- If dependency is critical and no degraded mode: page team lead + dependency team

### 2.7. Job Queue Backlog

**Symptoms:**
- Queue depth growing
- Processing lag increasing

**Diagnostic Steps:**
1. Check worker process count and health
2. Check worker CPU / memory utilization
3. Check for dead-letter queue growth
4. Review job failure rate

**Resolution:**
- Scale workers horizontally if CPU < 70%
- Restart stuck workers
- Retry failed jobs from dead-letter queue
- If database bottleneck: scale read replicas

**Escalation:**
- If backlog > 1 hour and growing: page team lead
```

## Explanation

The runbook treats every alert as a **diagnostic workflow**, not just a problem to fix. By forcing the engineer to check specific things in order, it reduces the chance of misdiagnosis (e.g., restarting a service when the issue is a downstream dependency). The escalation rules prevent the on-call engineer from going silent for hours while they struggle alone.

## Variants

| Context | Alert Focus | Key Addition |
|---------|-------------|--------------|
| Kubernetes | Pod restarts, node pressure, ingress errors | kubectl commands for pod inspection |
| Serverless | Lambda errors, cold starts, throttling | CloudWatch Logs Insights queries |
| Mobile backend | Push notification failures, API rate limits | Device-specific error segmentation |
| Data pipeline | Job failures, schema drift, late data | Airflow / Dagster task retry procedures |
| Multi-region | Region-specific latency, replication lag | Failover runbook section |

## What Works

1. Keep each procedure under one page; long runbooks are not read during incidents
2. Include exact commands, not just "check logs"; stress reduces typing accuracy
3. Verify every procedure quarterly; stale runbooks are worse than none
4. Link to dashboards and logs, do not paste screenshots that go stale
5. Include a "when to escalate" decision for every alert; ambiguity causes delay

## Common Mistakes

1. Writing runbooks for experts; they are for the engineer who has never seen this alert
2. Not testing runbook commands in a staging environment
3. Omitting rollback steps; sometimes the fix is "undo the last change"
4. Creating runbooks but not linking them from the alerting system
5. Treating runbooks as static documents; they must be updated after every incident

## Frequently Asked Questions

### How detailed should a runbook be?

Each alert procedure should fit on one screen. Include: what it means, 3–5 diagnostic commands, 2–3 common resolutions, and when to escalate. Do not include architecture explanations—that belongs in documentation. The runbook is a checklist for action, not a textbook.

### Should I have one runbook per service or one per team?

One per service is clearer, but consolidate if you have > 10 microservices. In that case, create a team runbook with an alert index that links to service-specific sub-pages. The key is that the on-call engineer finds the right procedure in under 30 seconds.

### What if the alert is not in the runbook?

Follow a generic "unknown alert" procedure: classify severity, gather basic metrics (CPU, memory, error rate, latency), check the last deployment, and escalate if no hypothesis emerges in 15 minutes. After the incident, add the new alert to the runbook. The first time an alert fires is an opportunity to document it.

## Advanced Solutions

### Automated runbook execution with diagnostic scripts

Pre-wire common diagnostic steps into executable scripts that the on-call engineer can run with a single command:

```bash
#!/bin/bash
# diagnose.sh - Automated diagnostic collector for on-call engineers
# Usage: ./diagnose.sh <service-name>

set -euo pipefail

SERVICE="${1:?Usage: $0 <service-name>}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_DIR="/tmp/diagnostics-${SERVICE}-${TIMESTAMP}"

mkdir -p "$REPORT_DIR"

echo "=== Collecting diagnostics for $SERVICE at $TIMESTAMP ==="

# 1. Service status
echo "Checking service status..."
systemctl status "$SERVICE" 2>&1 | tee "$REPORT_DIR/service-status.txt" || true

# 2. Recent logs (last 100 lines)
echo "Collecting recent logs..."
journalctl -u "$SERVICE" --since "1 hour ago" --no-pager 2>&1 \
  | tail -100 > "$REPORT_DIR/recent-logs.txt" || true

# 3. Resource utilization
echo "Checking resource utilization..."
{
  echo "=== CPU ==="
  top -bn1 | head -20
  echo ""
  echo "=== Memory ==="
  free -h
  echo ""
  echo "=== Disk ==="
  df -h
  echo ""
  echo "=== Top processes by CPU ==="
  ps aux --sort=-%cpu | head -10
  echo ""
  echo "=== Top processes by Memory ==="
  ps aux --sort=-%mem | head -10
} > "$REPORT_DIR/resources.txt"

# 4. Network connectivity
echo "Checking network..."
{
  echo "=== Listening ports ==="
  ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null
  echo ""
  echo "=== Active connections ==="
  ss -tn state established 2>/dev/null | head -20
} > "$REPORT_DIR/network.txt"

# 5. Recent deployments
echo "Checking recent deployments..."
{
  echo "=== Docker containers ==="
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not available"
  echo ""
  echo "=== Kubernetes pods ==="
  kubectl get pods -l app="$SERVICE" 2>/dev/null || echo "kubectl not available or no pods found"
} > "$REPORT_DIR/deployments.txt"

# 6. Health check
echo "Running health check..."
curl -sS -o "$REPORT_DIR/health-response.txt" -w "%{http_code}" \
  "http://localhost:8080/health" 2>&1 | tee "$REPORT_DIR/health-status.txt" || true

echo ""
echo "=== Diagnostics complete ==="
echo "Report saved to: $REPORT_DIR"
echo "Review files and attach to incident ticket."
```

### Kubernetes-specific diagnostic commands

For containerized environments, include kubectl one-liners that on-call engineers can copy-paste:

```bash
# Quick pod status check
kubectl get pods -n production -o wide | grep -v Running

# Get logs from a crashing pod
kubectl logs -n production <pod-name> --previous --tail=50

# Describe a pod for events and conditions
kubectl describe pod -n production <pod-name>

# Check resource usage across nodes
kubectl top nodes
kubectl top pods -n production --sort-by=memory

# Execute into a pod for network debugging
kubectl exec -it -n production <pod-name> -- /bin/sh -c "nslookup <dependency>"

# Check recent events in namespace
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Port-forward for local debugging
kubectl port-forward -n production svc/<service-name> 8080:80
```

### Alert-to-runbook linking with Prometheus annotations

Link alerts directly to runbook sections using Prometheus alert labels so engineers never search for the right procedure:

```yaml
# prometheus/alerts.yml
groups:
  - name: service-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m])
          / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.service }}"
          runbook: "https://wiki.internal/runbooks/on-call#21-high-error-rate"
          dashboard: "https://grafana.internal/d/service-overview?var-service={{ $labels.service }}"

      - alert: DiskUsageHigh
        expr: |
          (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 > 85
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Disk usage > 85% on {{ $labels.instance }}"
          description: "Disk usage is {{ $value }}% on {{ $labels.instance }}"
          runbook: "https://wiki.internal/runbooks/on-call#23-disk-usage--85"
          dashboard: "https://grafana.internal/d/node-overview?var-node={{ $labels.instance }}"
```

### Post-incident runbook update checklist

After every incident, verify the runbook is updated with lessons learned:

```markdown
## Post-Incident Runbook Update

- [ ] Was the alert in the runbook? If no, add it now
- [ ] Were the diagnostic steps accurate? Update if they missed the root cause
- [ ] Were the resolution steps correct? Update if they did not work
- [ ] Was the escalation threshold appropriate? Adjust if too high or too low
- [ ] Did the runbook link from the alert work? Fix if broken
- [ ] Are there new commands that would have helped? Add them
- [ ] Was the "last verified" date updated? Set to today
- [ ] Did the on-call engineer find the runbook useful? Note feedback
```

## Additional Best Practices


- For a deeper guide, see [Escalation Policy Template](/docs/escalation-policy-template/).

1. **Include expected output for each diagnostic command.** On-call engineers under stress may not recognize abnormal output. Show what "normal" looks like:

```markdown
**Expected output:**
```
$ kubectl get pods -l app=api
NAME                   READY   STATUS    RESTARTS   AGE
api-7d9f6c8b5-x2k4m   1/1     Running   0          12h
api-7d9f6c8b5-p8n3q   1/1     Running   0          12h
```
If STATUS is not `Running` or RESTARTS > 0, proceed to diagnostic step 2.
```

2. **Add a "Do Not Do" section to each alert procedure.** Common mistakes during incidents are worth documenting:

```markdown
## 2.1 High Error Rate — Do NOT:
- Do NOT restart all pods simultaneously (causes cascading failures)
- Do NOT scale up without checking if the issue is downstream
- Do NOT deploy a fix without testing in staging first
- Do NOT close the alert until error rate is below threshold for 15 minutes
```

## Additional Common Mistakes

1. **Not including time estimates for each step.** When an engineer sees "check database query latency," they do not know if that takes 30 seconds or 10 minutes. Add rough time estimates so they can gauge progress and know when to escalate:

```markdown
**Diagnostic Steps (estimated: 10 minutes):**
1. Check error dashboard (2 min)
2. Correlate with deployments (3 min)
3. Check dependency health (2 min)
4. Review logs for stack traces (3 min)
```

2. **Writing runbooks in isolation.** Runbooks written by one senior engineer often skip steps that seem obvious to them but are not obvious to a junior on-call engineer at 3 a.m. Have a junior engineer walk through each procedure during a calm period and note where they get stuck. Those are the steps that need more detail.

## Additional Frequently Asked Questions

### How do we keep runbook commands from going stale?

Run runbook commands as part of your CI pipeline. Create a test job that executes diagnostic commands against a staging environment weekly. If a command fails because the API changed or the tool was updated, the CI job alerts the team to update the runbook. This catches stale commands before an incident does.

### Should runbooks be in the same repo as the service code?

Yes, when possible. Keeping runbooks in the service repo means they get updated alongside code changes. A PR that changes error handling should also update the runbook for the error rate alert. If runbooks live in a separate wiki, they get forgotten during code changes. Use a `docs/runbooks/` directory in the service repo and link to them from your alerting system.
