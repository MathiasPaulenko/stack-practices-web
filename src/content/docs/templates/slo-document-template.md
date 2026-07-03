---
contentType: docs
slug: slo-document-template
templateType: slo-document
title: "Service Level Objective (SLO) Document Template"
description: "An SLO document template that defines reliability targets, error budgets, and escalation policies for services and platforms."
metaDescription: "SLO document template: define reliability targets, error budgets, and escalation policies for services. Build an SRE culture with measurable commitments."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - reliability
  - sre
  - template
  - ci-cd
relatedResources:
  - /guides/devops/on-call-incident-response-guide
  - /guides/devops/monitoring-alerting-guide
  - /docs/templates/incident-postmortem-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "SLO document template: define reliability targets, error budgets, and escalation policies for services. Build an SRE culture with measurable commitments."
  keywords:
    - slo template
    - service level objective
    - error budget template
    - sre reliability targets
    - slo document format
---

# Service Level Objective (SLO) Document Template

Use this template to define reliability targets that balance user happiness with engineering velocity. See [Monitoring and Alerting Guide](/guides/devops/monitoring-alerting-guide) for metric collection and [On-Call Incident Response Guide](/guides/devops/on-call-incident-response-guide) for escalation procedures.

## Template

```markdown
# SLO: [Service Name]

## Overview
| Field | Value |
|-------|-------|
| **Service** | [name] |
| **Owner** | [team or individual] |
| **Review date** | [quarterly] |

## SLIs (Service Level Indicators)

| SLI | Description | Measurement |
|-----|-------------|-------------|
| **Availability** | Ratio of successful requests | (total - errors) / total |
| **Latency** | Response time distribution | p95, p99 per endpoint |
| **Throughput** | Requests per second | RPS at peak |

## SLOs (Targets)

| Objective | Target | Measurement Window |
|-----------|--------|-------------------|
| Availability | 99.9% | Rolling 30 days |
| Latency p95 | < 200ms | Rolling 7 days |
| Error rate | < 0.1% | Rolling 24 hours |

## Error Budget

- **Budget:** 100% - SLO target (e.g., 0.1% for 99.9% availability)
- **Period:** 30 days
- **Policy:** When error budget is > 50% consumed in < 50% of period, freeze non-critical deploys

## Alerting Thresholds

| Severity | Threshold | Response |
|----------|-----------|----------|
| Page | Error budget 10% consumed in 1 hour | On-call responds immediately |
| Ticket | Error budget 50% consumed in 7 days | Team reviews in next sprint |

## Dependencies

| Dependency | Their SLO | Impact If They Miss |
|------------|-----------|-------------------|
| Payment API | 99.95% | Our checkout SLO drops |
| Identity Provider | 99.9% | Login failures affect availability |
```

## Choosing the Right SLO

| User Impact | Typical SLO | Rationale |
|-------------|-------------|-----------|
| Critical path (payments, login) | 99.99% (4 nines) | Downtime directly blocks revenue |
| Important but not critical | 99.9% (3 nines) | ~43 min downtime/month acceptable |
| Internal tools | 99% (2 nines) | ~7 hours downtime/month acceptable |

## Error Budget Policy

```
Budget remaining | Policy
-------------------|--------
> 50%              | Normal operations
25-50%             | Deploy freeze for risky changes
< 25%              | Deploy freeze except critical fixes
< 10%              | All hands on reliability; halt feature work
```

## What Works

- **Start with user-visible metrics** — "CPU usage" is not an SLI; "request success rate" is. See [Monitoring and Alerting Guide](/guides/devops/monitoring-alerting-guide) for metric selection.
- **Set SLOs based on current performance** — if you are at 99.5% today, do not promise 99.99%
- **Review quarterly** — adjust targets based on user feedback and engineering capacity
- **Distinguish SLI, SLO, and SLA** — SLI is the metric, SLO is the target, SLA is the contractual promise to customers

## Common Mistakes

- SLOs that are too loose — 99% for a payment API means 7 hours of downtime is "acceptable"
- SLOs that are too tight — 99.999% requires expensive infrastructure for marginal user benefit
- Tracking SLIs no one looks at — every SLI needs an owner and a review cadence
- Ignoring error budget burn — the budget exists to protect engineering velocity, not to be ignored. See [Incident Postmortem Template](/docs/templates/incident-postmortem-template) for when SLOs are breached.

## Frequently Asked Questions

### What is the difference between SLO and SLA?

An SLO is an internal reliability target. See [On-Call Incident Response Guide](/guides/devops/on-call-incident-response-guide) for operational context. An SLA is a contractual promise to customers with financial penalties. SLOs are usually stricter than SLAs so you have buffer before breaching contracts.

### How many SLOs should a service have?

2-4. One availability SLO, one latency SLO, and optionally one throughput or freshness SLO. More than 4 becomes unmanageable and dilutes focus.

### Should every microservice have its own SLO?

Yes, but keep it proportional. A critical user-facing service needs detailed SLOs. An internal batch processor might only need an availability SLO. Not every service needs a latency SLO.
