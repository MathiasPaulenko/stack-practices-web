---
contentType: docs
slug: alert-runbook-template
title: "Alert Runbook Template"
description: "A standardized runbook for responding to alerts: triage, diagnosis, mitigation, resolution, and post-incident steps with escalation paths."
metaDescription: "Use this alert runbook template to standardize incident response with triage, diagnosis, mitigation, resolution steps, escalation paths, and contacts."
difficulty: intermediate
topics:
  - testing
tags:
  - observability
  - runbook
  - alerting
  - incident-response
  - template
  - on-call
  - sre
relatedResources:
  - /docs/observability/observability-maturity-assessment-template
  - /docs/observability/dashboard-design-template
  - /docs/observability/incident-postmortem-template
  - /guides/observability/complete-guide-structured-logging
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this alert runbook template to standardize incident response with triage, diagnosis, mitigation, resolution steps, escalation paths, and contacts."
  keywords:
    - alert runbook
    - incident response
    - on-call
    - runbook template
    - alerting
    - sre
    - escalation
---

## Overview

An alert runbook gives on-call engineers a structured playbook for responding to a specific alert. Without a runbook, engineers waste time figuring out what the alert means, where to look, and what to do. This template standardizes incident response: triage, diagnose, mitigate, resolve, and document.

## When to Use

- Creating runbooks for the top 20 most frequent or critical alerts
- Onboarding new on-call engineers
- Standardizing incident response across teams
- SRE maturity improvement initiatives
- Compliance requirements for documented incident procedures

## Solution

```markdown
# Alert Runbook: `<Alert Name>`

## Alert Metadata

| Field | Value |
|-------|-------|
| Alert Name | HighErrorRate-PaymentService |
| Severity | Critical (P1) |
| Alert Source | Prometheus / Alertmanager |
| Alert Query | `rate(http_requests_total{service="payment",status=~"5.."}[5m]) / rate(http_requests_total{service="payment"}[5m]) > 0.05` |
| Trigger Condition | Error rate > 5% for 5 minutes |
| Routing | PagerDuty → Payment Team On-Call |
| Runbook Owner | Payment Team |
| Last Reviewed | 2026-07-05 |
| Last Updated | 2026-07-05 |

## Impact Assessment

| User Impact | Business Impact |
|-------------|-----------------|
| Users cannot complete payments | Revenue loss ~$2,000/min during peak |
| Checkout page shows error message | Customer support tickets increase |
| Retry attempts may succeed for transient errors | Reputation damage if prolonged |

## Triage (0-2 minutes)

### Step 1: Acknowledge the Alert

- [ ] Acknowledge in PagerDuty within 2 minutes
- [ ] Post in `#payment-incidents` Slack channel: "Investigating HighErrorRate-PaymentService"
- [ ] Check if this is a known false positive (check recent alert history)

### Step 2: Assess Severity

| Question | If Yes |
|----------|--------|
| Is error rate > 20%? | Escalate to P0, page secondary on-call |
| Is this during peak hours (9-18 UTC)? | Higher priority, revenue impact is greater |
| Are there related alerts firing? | Check for cascade — may be a shared dependency |
| Is this a new deployment? | Check #deployments channel for recent release |
| Is this a known maintenance window? | Check #maintenance channel |

### Step 3: Quick Checks

| Check | How | Expected |
|-------|-----|----------|
| Service health | `curl https://api.example.com/health` | 200 OK |
| Recent deployment | Check `#deployments` channel | Last deploy > 30 min ago |
| Database connectivity | Check Grafana → Payment DB panel | Connections < 80% pool |
| Payment provider status | Check https://status.stripe.com | All systems operational |
| Error logs | `kubectl logs -l app=payment --tail=100` | Look for repeated error patterns |

## Diagnosis (2-15 minutes)

### Step 4: Identify Error Type

Check the Grafana dashboard for the payment service: [Payment Service Dashboard](https://grafana.example.com/d/payment-service)

| Error Pattern | Likely Cause | Next Step |
|---------------|-------------|-----------|
| 500 Internal Server Error | Application bug or unhandled exception | Go to Step 5A |
| 502 Bad Gateway | Service is down or not responding | Go to Step 5B |
| 503 Service Unavailable | Pod crashes or OOM kills | Go to Step 5C |
| 504 Gateway Timeout | Database slowness or external API timeout | Go to Step 5D |
| 429 Too Many Requests | Rate limiting from payment provider | Go to Step 5E |

### Step 5A: Application Bug (500 Errors)

1. Check error logs for stack traces:
   ```bash
   kubectl logs -l app=payment --tail=200 | grep -A 20 "Error\|Exception\|stack"
   ```
2. Search for the error in Sentry: [Sentry Payment Project](https://sentry.example.com/projects/payment/)
3. Check if a new code deployment introduced the bug:
   ```bash
   kubectl rollout history deployment/payment
   ```
4. If new deployment caused the error, roll back:
   ```bash
   kubectl rollout undo deployment/payment
   ```
5. Verify error rate drops after rollback

### Step 5B: Service Down (502 Errors)

1. Check pod status:
   ```bash
   kubectl get pods -l app=payment -o wide
   ```
2. Check pod events:
   ```bash
   kubectl describe pod <pod-name> | tail -30
   ```
3. Check if pods are crashing:
   ```bash
   kubectl get events --field-selector reason=BackOff --sort-by=.lastTimestamp | tail -10
   ```
4. If pods are crashing, check crash logs:
   ```bash
   kubectl logs <pod-name> --previous
   ```
5. If all pods are down, restart the deployment:
   ```bash
   kubectl rollout restart deployment/payment
   ```
6. Monitor pod startup and health check

### Step 5C: OOM Kills (503 Errors)

1. Check for OOM kills:
   ```bash
   kubectl get pods -l app=payment -o jsonpath="{.items[*].status.containerStatuses[0].lastState.terminated.reason}"
   ```
2. If OOMKilled, check memory usage in Grafana: [Pod Memory Dashboard](https://grafana.example.com/d/pod-memory)
3. Check for memory leak in application:
   ```bash
   kubectl top pods -l app=payment --sort-by=memory
   ```
4. Temporary fix: increase memory limit:
   ```bash
   kubectl patch deployment payment -p '{"spec":{"template":{"spec":{"containers":[{"name":"payment","resources":{"limits":{"memory":"1Gi"}}}]}}}}'
   ```
5. Long-term fix: investigate memory leak, file a bug

### Step 5D: Database Timeout (504 Errors)

1. Check database connection pool:
   ```bash
   kubectl exec -it <payment-pod> -- node -e "console.log(require('./db').pool.stats())"
   ```
2. Check slow queries in database:
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```
3. Check database CPU and IOPS in Grafana: [Database Dashboard](https://grafana.example.com/d/database)
4. If database is overloaded, check for long-running transactions:
   ```sql
   SELECT pid, now() - xact_start AS duration, query, state
   FROM pg_stat_activity
   WHERE state IN ('active', 'idle in transaction')
   ORDER BY duration DESC;
   ```
5. Kill long-running queries if blocking:
   ```sql
   SELECT pg_terminate_backend(<pid>);
   ```

### Step 5E: Rate Limiting (429 Errors)

1. Check Stripe API dashboard for rate limit warnings: [Stripe Dashboard](https://dashboard.stripe.com)
2. Check if request volume spiked:
   ```bash
   kubectl logs -l app=payment --tail=500 | grep "stripe.com" | wc -l
   ```
3. Enable request batching if available
4. Implement client-side rate limiting:
   ```typescript
   // Add rate limiter middleware
   const rateLimiter = new RateLimiter({ maxRequests: 90, perSeconds: 1 });
   ```
5. If Stripe is the bottleneck, consider using Stripe's idempotency keys to retry safely

## Mitigation (5-30 minutes)

### Quick Mitigation Options

| Option | When to Use | Impact | Reversibility |
|--------|-------------|--------|---------------|
| Roll back deployment | New deploy caused errors | Loses new features | Easy — redeploy |
| Scale up pods | High traffic overwhelming service | Higher cost | Easy — scale down |
| Enable circuit breaker | External API is down | Degrades gracefully | Easy — flip flag |
| Enable fallback mode | Database is slow | Read-only mode | Easy — flip flag |
| Rate limit users | Protecting from DDoS | Some users blocked | Easy — remove limit |
| Disable problematic endpoint | One endpoint causing cascade | Feature unavailable | Easy — re-enable |

### Rollback Procedure

```bash
# 1. Check current deployment
kubectl rollout history deployment/payment

# 2. Roll back to previous version
kubectl rollout undo deployment/payment

# 3. Monitor rollout status
kubectl rollout status deployment/payment --timeout=120s

# 4. Verify error rate drops
# Check Grafana: https://grafana.example.com/d/payment-service
# Wait 5 minutes for error rate to normalize
```

## Escalation

| Level | Who | When to Escalate |
|-------|-----|------------------|
| 1 | On-call engineer | Alert received |
| 2 | Secondary on-call | No progress after 15 minutes |
| 3 | Team lead + SRE | No progress after 30 minutes |
| 4 | Engineering manager | Incident > 1 hour or revenue impact > $10k |
| 5 | CTO + VP Engineering | Incident > 4 hours or public impact |

### Escalation Contacts

| Role | Primary | Secondary |
|------|---------|-----------|
| Payment Team On-Call | PagerDuty: payment-primary | PagerDuty: payment-secondary |
| SRE On-Call | PagerDuty: sre-primary | Slack: @sre-oncall |
| Database Admin | Slack: @dba-team | PagerDuty: dba-primary |
| Engineering Manager | Slack: @eng-manager | Phone: x1234 |

## Resolution

### Step 6: Verify Resolution

- [ ] Error rate below 1% for 10 consecutive minutes
- [ ] No new error alerts firing
- [ ] Payment success rate back to normal (> 99%)
- [ ] No user complaints in #support channel
- [ ] All pods healthy and stable

### Step 7: Document

- [ ] Update incident in PagerDuty with resolution summary
- [ ] Post resolution in `#payment-incidents`: "Resolved: HighErrorRate-PaymentService — <brief summary>"
- [ ] Create postmortem document if P1 (within 48 hours)
- [ ] File follow-up tickets for root cause fix
- [ ] Update this runbook with any new learnings

## Post-Incident

### Postmortem Required?

| Severity | Postmortem Required | Due Date |
|----------|-------------------|----------|
| P0 | Yes, blameless postmortem | Within 48 hours |
| P1 | Yes, blameless postmortem | Within 48 hours |
| P2 | Optional, if recurring | Within 1 week |
| P3 | No | N/A |

### Follow-Up Actions

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Fix root cause | | | |
| Add monitoring for root cause | | | |
| Update runbook with new learnings | | | |
| Add test to prevent regression | | | |
```

## Explanation

A runbook serves two audiences: the experienced on-call engineer who needs a quick reference, and the new on-call engineer who needs step-by-step guidance. The triage section is for quick assessment — can this be resolved in 2 minutes or does it need deeper investigation? The diagnosis section branches by error type, so the engineer doesn't waste time checking irrelevant things.

The mitigation section focuses on stopping the bleeding. The goal is not to fix the root cause but to restore service. Rollback, scale up, or enable fallback modes are valid mitigations. Root cause analysis happens post-incident.

The escalation matrix removes ambiguity about when to ask for help. "When in doubt, escalate" should be the culture, but having explicit time-based triggers prevents engineers from struggling alone for too long.

The resolution and post-incident sections ensure the incident is properly closed and learnings are captured. Every P1 incident should produce a postmortem and at least one follow-up action item.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Database alert | Add query analysis and index checks | Include DBA escalation |
| Infrastructure alert | Add Terraform and networking checks | Include SRE escalation |
| Security alert | Add containment and forensics steps | Follow security incident response plan |
| Third-party outage | Add vendor status page checks | Enable fallback mode |
| Scheduled maintenance | Add pre-maintenance checklist | Suppress expected alerts |

## What Works

1. Keep runbooks next to the alert — link the runbook URL in the alert annotation
2. Test runbooks during game days — verify steps work under pressure
3. Update runbooks after every incident — add new learnings while they're fresh
4. Include screenshots and direct links — reduce navigation time during incidents
5. Use checkboxes — engineers can track progress under stress
6. Include time estimates for each section — set expectations for resolution time
7. Keep commands copy-pasteable — no one types kubectl commands from memory at 3 AM

## Common Mistakes

1. Generic runbooks — "check the logs" is not actionable. Specify which logs, which query, which dashboard.
2. No escalation criteria — engineers struggle alone instead of asking for help.
3. Outdated runbooks — service names, dashboard URLs, and commands change. Review quarterly.
4. No mitigation options — runbooks that only describe diagnosis without mitigation leave engineers stuck.
5. Too much background — keep context minimal. The engineer needs action steps, not a history lesson.
6. No post-incident steps — incidents without postmortems repeat.
7. Runbooks not linked from alerts — engineers have to search for the runbook instead of clicking a link.

## Frequently Asked Questions

### How many runbooks do we need?

Start with the top 20 alerts by frequency or severity. Cover all P1 and P2 alerts first. Add runbooks for new alerts as they fire. If an alert fires more than 3 times without a runbook, create one.

### How detailed should each step be?

Detailed enough that a new team member can follow it. Include exact commands, URLs, and expected outputs. If a step requires judgment ("check if the database is slow"), specify what "slow" means (e.g., "p95 query latency > 1 second").

### Should runbooks be in code or a wiki?

In code, next to the alerting rules. Version-controlled runbooks track changes over time and can be reviewed in PRs. Wiki runbooks go stale because no one owns them. Use markdown files in the same repository as your infrastructure code.

### What if the runbook doesn't help?

If the runbook doesn't resolve the issue, escalate. After the incident, update the runbook with the new diagnosis and mitigation steps. A runbook that didn't help is a learning opportunity, not a failure.

### How often should runbooks be reviewed?

Quarterly at minimum. After every incident, review the relevant runbook and update it with any new learnings. During game days, test runbooks and update steps that don't work. Track runbook freshness as a metric: percentage of runbooks reviewed in the last 90 days.
