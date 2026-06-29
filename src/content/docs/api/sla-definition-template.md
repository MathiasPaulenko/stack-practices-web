---
contentType: docs
slug: sla-definition-template
title: "SLA Definition Template"
description: "A template for defining and documenting Service Level Agreements including uptime targets, response times, error budgets, and escalation procedures."
metaDescription: "Define Service Level Agreements with this SLA template. Covers uptime targets, response times, error budgets, and escalation procedures."
difficulty: intermediate
topics:
  - api
  - architecture
  - devops
tags:
  - sla
  - service-level-agreement
  - uptime
  - availability
  - sre
  - template
relatedResources:
  - /docs/devops/escalation-policy-template
  - /docs/devops/performance-regression-template
  - /docs/devops/auto-scaling-policy-template
  - /docs/devops/downtime-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define Service Level Agreements with this SLA template. Covers uptime targets, response times, error budgets, and escalation procedures."
  keywords:
    - sla
    - service level agreement
    - uptime target
    - availability
    - error budget
    - sre
---

## Overview

An SLA without an error budget is just a promise you will eventually break. Engineering teams need concrete, measurable targets that balance reliability with velocity. This template defines uptime, latency, and error rate commitments — plus the error budgets that let teams ship changes while respecting those commitments.

## When to Use

Use this resource when:
- Launching a production service that external consumers depend on
- Negotiating contractual guarantees with enterprise clients
- Defining internal reliability targets for platform teams
- Setting up SRE practices and on-call rotations

## Solution

```markdown
# Service Level Agreement: `<Service Name>`

**Effective Date:** `2026-07-01`
**Review Cycle:** `Quarterly`
**Owning Team:** `@platform-team`

## 1. Service Level Objectives (SLOs)

| Metric | Target | Measurement Window | Data Source |
|--------|--------|--------------------|-------------|
| Availability | 99.9% | Rolling 30 days | Load balancer health checks |
| Latency p95 | < 200ms | Per minute | Application metrics (Prometheus) |
| Latency p99 | < 500ms | Per minute | Application metrics (Prometheus) |
| Error Rate | < 0.1% | Rolling 7 days | Application logs + APM |
| Throughput | > 1,000 req/s | Per minute | Load balancer metrics |

## 2. Service Level Indicators (SLIs)

| SLI | Good Events | Valid Events | Calculation |
|-----|-------------|--------------|-------------|
| Availability | Successful health checks | All health checks | Good / Valid |
| Latency p95 | Requests < 200ms | All requests | Percentile of valid |
| Error Rate | Responses with status < 500 | All responses | 1 - (errors / total) |

## 3. Error Budget

| SLO | Target | Error Budget (30 days) | Burn Rate Alert |
|-----|--------|------------------------|-----------------|
| 99.9% availability | 43.8 minutes downtime | 2% budget in 1 day = critical |
| < 0.1% error rate | 0.43% error rate allowed | 10% budget in 1 day = warning |

### Burn Rate Alerts

| Burn Rate | Budget Consumed | Action |
|-----------|-----------------|--------|
| 1x | Normal | Monitor |
| 2x | 2x faster than expected | Page on-call (warning) |
| 10x | 10x faster than expected | Page on-call + freeze deploys (critical) |

## 4. Response & Resolution Times

| Severity | Definition | Response Time | Resolution Target | Escalation |
|----------|------------|---------------|-------------------|------------|
| P1 (Critical) | Complete service outage | 15 minutes | 2 hours | VP Engineering |
| P2 (High) | Degraded performance, workaround exists | 1 hour | 8 hours | Engineering Manager |
| P3 (Medium) | Partial feature failure | 4 hours | 3 business days | Team Lead |
| P4 (Low) | Cosmetic issue, no business impact | 1 business day | Next sprint | Ticket queue |

## 5. Exclusions

The following are excluded from SLA calculations:
- **Scheduled maintenance:** Up to 4 hours/month with 7 days notice
- **Third-party outages:** Dependencies outside our control (cloud provider, payment gateway)
- **Force majeure:** Natural disasters, acts of war, internet backbone failures
- **Client-side issues:** Consumer bugs, rate limit violations, invalid requests

## 6. Penalties & Credits

| Monthly Uptime | Service Credit | Trigger |
|----------------|----------------|---------|
| 99.0% - 99.9% | 10% monthly fee | Automatic, no request required |
| 95.0% - 99.0% | 25% monthly fee | Automatic |
| < 95.0% | 50% monthly fee | Automatic + mandatory postmortem |

## 7. Communication Plan

| Event | Audience | Channel | Timing |
|-------|----------|---------|--------|
| Degradation detected | Internal teams | PagerDuty + Slack | Immediate |
| P1 outage starts | Customers | Status page + email | Within 30 minutes |
| P1 resolved | Customers | Status page update | Within 15 minutes of resolution |
| Monthly SLA report | Customers | Email | Within 5 business days of month end |

## 8. Review & Revision

- **Quarterly review:** Engineering + Product + Customer Success
- **Trigger review:** Any P1 incident or SLA miss triggers an ad-hoc review
- **Revision process:** Proposed changes require 14 days notice to affected customers
```

## Explanation

The template separates **objectives** (what you promise) from **indicators** (how you measure) and **error budgets** (how much failure is acceptable). Without error budgets, teams either over-engineer for perfection or ship recklessly. The burn rate alerts translate abstract percentages into concrete actions: at 10x burn rate, stop deploying and fix the issue.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public SaaS | Strict SLA with automatic credits | Customer trust is a competitive advantage |
| Internal platform | Relaxed SLA, focus on SLOs | Internal teams need reliability, not legal contracts |
| Enterprise contract | Custom SLA per deal | Negotiated individually with legal approval |

## What Works

1. **Start with internal SLOs before publishing SLAs** — an SLA is a promise, an SLO is a target
2. **Use percentiles, not averages** — p95 latency reveals what real users experience
3. **Measure from the consumer's perspective** — availability is not just "server up" but "request succeeds"
4. **Review quarterly** — services evolve, targets should evolve with them
5. **Publish real-time status** — a public status page builds trust during incidents

## Common Mistakes

1. **Setting 100% availability as a target** — impossible and expensive, leads to burnout
2. **Measuring server uptime instead of request success rate** — the server can be up while the app is failing
3. **Ignoring latency in SLAs** — slow is the new down
4. **Not defining error budgets** — teams have no framework for balancing reliability and changes
5. **Making SLA reviews reactive only** — schedule quarterly reviews even when everything is green

## Frequently Asked Questions

### What is the difference between SLA, SLO, and SLI?

- **SLI (Indicator):** The metric you measure (e.g., request success rate)
- **SLO (Objective):** The target for that metric (e.g., 99.9% success rate)
- **SLA (Agreement):** The contract with consequences (e.g., 99.9% or 10% credit)

### How do I calculate error budget?

Error budget = 100% - SLO target. For 99.9% availability, the error budget is 0.1% of the measurement window. Over 30 days, that is 43.8 minutes of acceptable downtime.

### Should I include latency in the SLA?

Yes, but be realistic. A p95 latency target of 200ms is achievable for most APIs. Targets below 50ms require significant infrastructure investment and may not be cost-effective.

### What happens if we burn the entire error budget before the window ends?

Freeze non-critical deployments and prioritize reliability work until the budget recovers. This is the core SRE principle: error budget policies should drive engineering priorities.
