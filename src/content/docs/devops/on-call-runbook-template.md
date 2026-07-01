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
