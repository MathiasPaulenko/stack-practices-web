---
contentType: guides
slug: sre-practices-guide
title: "Site Reliability Engineering: SRE Practices and Error Budgets"
description: "A practical guide to SRE: defining SLIs, SLOs, and SLAs, managing error budgets, toil reduction, on-call rotations, and building a culture of reliability."
metaDescription: "Learn SRE practices: define SLIs, SLOs, SLAs, manage error budgets, reduce toil, and build on-call rotations for production reliability."
difficulty: intermediate
topics:
  - devops
  - observability
  - performance
tags:
  - sre
  - site-reliability-engineering
  - slo
  - sli
  - sla
  - error-budget
  - toil
  - on-call
  - guide
relatedResources:
  - /guides/observability-guide
  - /guides/chaos-engineering-guide
  - /guides/platform-engineering-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn SRE practices: define SLIs, SLOs, SLAs, manage error budgets, reduce toil, and build on-call rotations for production reliability."
  keywords:
    - sre
    - site-reliability-engineering
    - slo
    - sli
    - sla
    - error-budget
    - toil
    - on-call
    - guide
---

## Overview

Site Reliability Engineering (SRE), pioneered at Google, applies software engineering principles to operations. Instead of treating reliability as a separate function, SRE teams write code to automate operations, manage infrastructure, and measure system health through Service Level Objectives (SLOs). The core tenet: reliability is a feature, not an afterthought. SRE balances the need for velocity (shipping changes) with the need for stability (keeping systems running) through error budgets, toil budgets, and blameless postmortems.

## When to Use

- You operate production systems where downtime has business impact
- Development and operations teams are in conflict over release velocity vs stability
- You need objective, measurable definitions of "reliable"
- Manual operational work consumes substantial engineering time
- Incident response is reactive and ad-hoc rather than structured

## The Hierarchy of Reliability Concepts

| Concept | Definition | Example |
|---------|-----------|---------|
| **SLI** | Service Level Indicator — what you measure | "99th percentile request latency" |
| **SLO** | Service Level Objective — target over time | "p99 latency < 200ms over 30 days" |
| **SLA** | Service Level Agreement — contract with penalty | "99.9% uptime or 10% service credit" |
| **Error budget** | 1 - SLO; amount of acceptable failure | 0.1% error budget = 43m downtime/month |

## Defining SLIs

Choose indicators that users actually care about:

| User-facing | System-facing |
|-------------|---------------|
| Request latency | CPU utilization |
| Error rate | Memory pressure |
| Throughput | Queue depth |
| Availability | Replication lag |

**Latency SLI example:**
```
SLI = proportion of requests with latency < 200ms
measured over a 1-minute window
```

## Setting SLOs

1. **Start with what you can measure** — do not set an SLO you cannot track
2. **Base on historical performance** — look at the last 30-90 days, pick the 50th percentile, not the best case
3. **Leave headroom** — if you are at 99.9%, set SLO at 99.5% to allow for growth
4. **Review quarterly** — tighten or relax based on business needs and technical capability

| SLO | Error budget (monthly) | Use case |
|-----|----------------------|----------|
| 99% | 7.3 hours | Internal tools, non-critical |
| 99.9% | 43 minutes | Customer-facing services |
| 99.99% | 4.3 minutes | Core revenue systems |
| 99.999% | 26 seconds | Rarely justified; extremely expensive |

## Error Budget Policy

```
IF error_budget_remaining > 50%:
    → Full release velocity

IF 25% < error_budget_remaining < 50%:
    → Requires SRE review for risky changes

IF 0% < error_budget_remaining < 25%:
    → Freeze all non-critical releases
    → Prioritize reliability work

IF error_budget_exhausted:
    → All new work stops
    → Only reliability fixes and mitigation
```

## Toil Reduction

**Toil** is manual, repetitive, automatable operational work with no lasting value.

| Toil type | Automation approach |
|-----------|-------------------|
| Manual scaling | Horizontal pod autoscaling, cluster autoscaler |
| Manual deployments | CI/CD pipelines with automated canary analysis |
| Manual log review | Alerting on derived metrics, not raw logs |
| Ticket-driven changes | Self-service portals with guardrails |
| On-call pages for known issues | Auto-remediation runbooks |

**Toil budget:** Google recommends capping toil at 50% of an SRE's time. The other 50% goes to project work that improves the system.

## On-Call Rotation Design

| Pattern | Best for | Roster size |
|---------|----------|-------------|
| **Primary/secondary** | Small teams, critical services | 4-6 people |
| **Follow-the-sun** | Global teams, 24/7 coverage | 3+ regions |
| **No on-call (pagerless)** | Teams with mature automation | Requires substantial investment |

**On-call health metrics:**
- Pages per shift (target: < 2)
- Time to acknowledge (target: < 5 minutes)
- Time to resolve (track, but do not target — quality over speed)
- Post-incident action items closed within 30 days (target: 100%)

## Blameless Postmortem Template

```markdown
## Incident: [Short description] — [Date]

### Impact
- Duration: 23 minutes
- Affected users: ~1,200
- Revenue impact: $0 (free tier)

### Timeline
- 14:32 — Monitoring alert fired
- 14:35 — On-call acknowledged
- 14:40 — Root cause identified (DB connection pool exhaustion)
- 14:55 — Service fully recovered

### Root Cause
The connection pool was sized for 100 connections. A deployment doubled traffic without scaling the pool.

### Contributing Factors
- No load test for the new deployment
- Connection pool size was not exposed as a tunable
- Alert threshold was too high (only fired at 95% error rate)

### Action Items
| Owner | Task | Due |
|-------|------|-----|
| @alice | Add connection pool autoscaling | 2026-07-15 |
| @bob | Run load tests in staging | 2026-07-01 |
| @charlie | Lower error rate alert to 1% | 2026-06-30 |

### Lessons Learned
We need to treat connection pools as elastic resources, not fixed constants.
```

## Common Mistakes

- **Setting SLOs too high** — 99.999% sounds impressive but costs 10x more than 99.9% for marginal benefit
- **Using SLAs as SLOs** — SLAs are external contracts; SLOs are internal targets. SLOs should be stricter than SLAs.
- **No error budget policy** — without consequences for burning budget, SLOs are meaningless
- **Toil that is "just part of the job"** — if it is repetitive and manual, it is toil. Automate it.
- **Blameful postmortems** — focusing on who made a mistake creates fear and hides systemic issues

## FAQ

**What is the difference between SRE and DevOps?**
DevOps is a cultural movement and set of practices. SRE is a specific implementation of DevOps principles with quantitative reliability targets and a 50% toil cap.

**How do I convince management to adopt SLOs?**
Frame SLOs as risk management. They answer "How fast can we ship without breaking customer trust?" Error budgets create a data-driven conversation between engineering and product.

**Should every team have an SRE?**
Not necessarily. Start with SLOs and error budgets. As toil grows, dedicate engineering time to automation. When that is not enough, form a dedicated SRE team.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
