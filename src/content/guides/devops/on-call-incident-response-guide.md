---
contentType: guides
slug: on-call-incident-response-guide
title: "On-Call and Incident Response Playbook"
description: "A practical playbook for on-call engineers: triage, escalation, communication, and postmortems. Reduce MTTR and build a resilient incident response culture."
metaDescription: "On-call and incident response playbook: triage, escalation, communication, postmortems. Reduce MTTR and build a resilient incident response culture."
difficulty: intermediate
topics:
  - devops
tags:
  - on-call
  - incident-response
  - sre
  - postmortem
  - mttr
  - observability
  - guide
relatedResources:
  - /guides/devops/docker-for-developers-guide
  - /guides/security/web-application-security-guide
  - /guides/devops/technical-documentation-strategy-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "On-call and incident response playbook: triage, escalation, communication, postmortems. Reduce MTTR and build a resilient incident response culture."
  keywords:
    - on call playbook
    - incident response process
    - site reliability engineering
    - reduce mttr
    - incident postmortem template
---

# On-Call and Incident Response Playbook

## Introduction

Incidents are inevitable. What separates resilient teams from fragile ones is not the absence of failures, but the speed and quality of their response. This playbook provides a structured approach to handling production incidents — from the first alert to the postmortem.

## The Incident Response Lifecycle

```
Detect → Triage → Mitigate → Resolve → Postmortem
   ↑                                          │
   └────────── Monitor & Communicate ─────────┘
```

## 1. Detection

### Alerting Principles

| Alert | Why It Matters | Threshold |
|-------|---------------|-----------|
| **Error rate spike** | Users are seeing failures | > 0.1% of requests for 2 minutes |
| **Latency p99** | Degraded user experience | > 500ms for 5 minutes |
| **Saturation** | Resource exhaustion approaching | CPU > 80%, memory > 85%, disk > 90% |
| **Dependency failure** | Downstream service is down | Health check fails 3 times |

### Alert Fatigue Is Real

If an alert fires and the on-call engineer does not take action, it is not an alert — it is noise. Remove or downgrade alerts with > 80% false positive rate.

## 2. Triage

### The FIRST Minute Checklist

When paged, answer these questions in order:

1. **What is failing?** — service name, endpoint, region
2. **Who is affected?** — all users, a subset, internal only?
3. **When did it start?** — exact time of first failure (check deployment logs)
4. **What changed?** — any deploy, config change, or dependency shift?
5. **Is it getting worse?** — trend of error rate over time

### Severity Levels

| Severity | Definition | Response Time | Example |
|----------|-----------|---------------|---------|
| **SEV-1** | Complete service outage or data loss | 15 minutes | Payment system down for all users |
| **SEV-2** | Major functionality degraded | 30 minutes | Search returns empty for 50% of users |
| **SEV-3** | Minor impact or workaround exists | 2 hours | Admin dashboard slow, API still fast |
| **SEV-4** | No user impact, potential risk | Next business day | Log volume spike, no errors yet |

## 3. Mitigation

### Stop the Bleeding First

Your first goal is not to fix the root cause — it is to restore service. Prefer rollback over forward-fix during an incident.

```bash
# Rollback a bad deployment
kubectl rollout undo deployment/api-service

# Enable a feature flag kill switch
curl -X POST "https://config-service/flags/checkout-v2" \
  -d '{"enabled": false}'

# Scale up to absorb load
kubectl scale deployment/api-service --replicas=20
```

### Common Mitigation Tactics

| Problem | Fast Mitigation |
|---------|---------------|
| Bad deployment | Rollback to last known good version |
| Traffic spike | Scale horizontally, enable rate limiting |
| Dependency failure | Enable circuit breaker, serve stale cache |
| Database overload | Kill slow queries, add read replicas |
| Configuration error | Revert config, restart with previous values |

## 4. Communication

### Internal Status Updates

Post in your incident channel every 10 minutes:

```
[SEV-2] Checkout latency elevated
- Started: 14:32 UTC
- Impact: ~30% of checkout requests timeout
- Cause: database connection pool exhausted after v2.4.1 deploy
- Mitigation: rolled back to v2.4.0 at 14:45, monitoring recovery
- ETA: 15:00 UTC if trend holds
- Commander: @alice
```

### External Communication

| Severity | External Notice? | Who |
|----------|-----------------|-----|
| SEV-1 | Yes, immediate | Customer support + status page |
| SEV-2 | Yes, if > 30 min | Customer support + status page |
| SEV-3 | No, unless asked | Internal only |
| SEV-4 | No | Internal only |

### Blameless Communication Rules

- Do not name individuals as causes
- Do not use "human error" as a root cause
- Focus on what happened, what was done, and what is next

## 5. Resolution

### Definition of Resolved

An incident is resolved when:
- Error rates return to baseline for 10 minutes
- All mitigations are stable
- No new symptoms have appeared
- The incident commander declares "all clear"

### After All Clear

1. Stop the clock (log total incident duration)
2. Schedule postmortem within 24 hours for SEV-1/2
3. Create follow-up tickets with owners and due dates
4. Update runbooks with anything learned

## 6. Postmortem

### The Five Whys

Ask "why" recursively until you reach a systemic issue, not a symptom.

```
Problem: Payment API returned 500 errors for 20 minutes.

Why? → Database connection pool was exhausted.
Why? → v2.4.1 increased default pool size but forgot to close connections in new retry logic.
Why? → The change was not tested under load.
Why? → Load tests do not cover the checkout flow.
Why? → Load test scenarios were last updated 6 months ago.

Action: Add checkout flow to weekly load tests; require load test pass in CI.
```

### Postmortem Template

```markdown
# Postmortem: [Incident Name] ([SEV-X])

## Summary
- Date: 2024-06-12
- Duration: 23 minutes
- Impact: 12% of checkout attempts failed

## Timeline
- 14:32 — First alert: error rate spike on /api/checkout
- 14:35 — On-call acknowledged
- 14:40 — Identified connection pool exhaustion
- 14:45 — Rolled back to v2.4.0
- 14:55 — Error rates returned to baseline

## Root Cause
v2.4.1 introduced a retry loop that leaked database connections.

## What Went Well
- Rollback completed in under 5 minutes
- Monitoring clearly pointed to connection pool exhaustion

## What Went Wrong
- Load tests did not cover the new retry logic
- No connection leak detection in staging

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| Add checkout flow to load tests | @bob | 2024-06-19 |
| Add connection leak alert | @alice | 2024-06-15 |
```

## Best Practices

- **Rotate on-call fairly** — no one should be on-call more than 1 week in 4
- **Compensate for off-hours** — pay extra or give time off in lieu
- **Shadow on-call** — new engineers shadow for 2-4 weeks before taking the pager
- **Automate runbooks** — if a runbook step is manual, add it to your automation backlog
- **Review alerts quarterly** — remove noise, tune thresholds, fix flapping alerts

## Common Mistakes

- Skipping postmortems because "we are too busy"
- Blaming individuals instead of fixing systems
- Forward-fixing during an incident instead of rolling back
- Communicating too late to customers
- Not having a secondary on-call for escalation
- Keeping the same person on-call for weeks

## Frequently Asked Questions

### What if I do not know how to fix the issue?

That is expected. Your job is to contain the impact and find the right person — not to know every system. Escalate early and clearly. A 5-minute escalation is better than a 30-minute solo struggle.

### How do I balance incident response with feature work?

Incidents are unplanned work. Track them. If a team spends > 20% of sprint capacity on incidents, that is a signal to invest in reliability (tests, automation, refactoring) rather than new features.

### Should junior engineers be on-call?

Yes, with mentorship. Shadowing senior engineers during incidents is one of the fastest ways to learn how systems fail. Start with low-severity rotations and pair them with a senior for the first month.
