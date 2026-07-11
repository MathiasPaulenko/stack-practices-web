---
contentType: docs
slug: capacity-planning-forecast-template
title: "Capacity Planning Forecast Template"
description: "A structured template for forecasting infrastructure growth, identifying resource bottlenecks, and planning capacity before traffic surges cause outages."
metaDescription: "Plan infrastructure growth with this capacity forecast template. Covers traffic projections, resource bottlenecks, scaling triggers, and budget estimates."
difficulty: intermediate
topics:
  - infrastructure
  - devops
tags:
  - capacity-planning
  - forecasting
  - infrastructure
  - scaling
  - performance
relatedResources:
  - /docs/devops/production-readiness-review-template
  - /docs/devops/feature-specification-template
  - /docs/devops/monitoring-alerting-policy-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Plan infrastructure growth with this capacity forecast template. Covers traffic projections, resource bottlenecks, scaling triggers, and budget estimates."
  keywords:
    - capacity planning
    - infrastructure forecast
    - scaling template
    - resource planning
    - traffic projection
---

## Overview

Traffic grows, but infrastructure does not grow by itself. Most outages are not caused by bad code — they are caused by systems that hit a wall nobody measured. Capacity planning is the discipline of looking ahead: how much traffic will we have in six months, what resource will run out first, and what will it cost to stay ahead of demand? A capacity forecast turns panic-driven scaling into a scheduled, budgeted, and tested operation.

## When to Use

Use this template when:
- You are entering a growth phase (marketing campaign, product launch, seasonal spike)
- A service is approaching 60-70% utilization of any critical resource
- You need to justify infrastructure spending to finance or leadership
- You want to move from reactive scaling to proactive planning
- You are evaluating a move from vertical to horizontal scaling

## Prerequisites

Before creating a capacity forecast:
- [ ] Baseline metrics exist: CPU, memory, disk I/O, network throughput, request rate, latency
- [ ] Historical traffic data is available for at least the last three months
- [ ] Growth assumptions are documented (marketing plans, user acquisition targets, feature launches)
- [ ] Cost data is available: cloud provider bills, reserved instance pricing, licensing
- [ ] The team agrees on what "full" means (80%? 90%? 100% with headroom?)

## Solution

```markdown
# Capacity Planning Forecast: `<System / Service>`

> Author: ______ | Date: ______ | Review date: ______
> Service owner: ______ | Team: ______ | Forecast horizon: ______

## 1. Current State

| Metric | Current | Peak (last 30d) | Limit | Headroom |
|--------|---------|-----------------|-------|----------|
| Requests / sec | ______ | ______ | ______ | ______ |
| CPU utilization (%) | ______ | ______ | ______ | ______ |
| Memory utilization (%) | ______ | ______ | ______ | ______ |
| Disk I/O (MB/s or IOPS) | ______ | ______ | ______ | ______ |
| Network throughput (Gbps) | ______ | ______ | ______ | ______ |
| Database connections | ______ | ______ | ______ | ______ |
| Storage used (GB) | ______ | ______ | ______ | ______ |
| Queue depth / backlog | ______ | ______ | ______ | ______ |

**Current infrastructure:**
- ______ instances at ______ size
- ______ databases at ______ tier
- ______ cache nodes
- ______ load balancers
- Estimated monthly cost: ______

## 2. Growth Assumptions

| Driver | Expected Change | Timeframe | Confidence |
|--------|-----------------|-----------|------------|
| ______ | ______ | ______ | High / Medium / Low |
| ______ | ______ | ______ | High / Medium / Low |
| ______ | ______ | ______ | High / Medium / Low |

**Key assumptions:**
- [ ] ______
- [ ] ______

## 3. Traffic Projections

| Period | Projected RPS | Projected MAU | Growth Rate |
|--------|---------------|---------------|-------------|
| Current | ______ | ______ | — |
| +3 months | ______ | ______ | ______ |
| +6 months | ______ | ______ | ______ |
| +12 months | ______ | ______ | ______ |

## 4. Resource Forecast

| Resource | Current | +3m | +6m | +12m | First to Hit Limit? |
|----------|---------|-----|-----|------|---------------------|
| CPU | ______ | ______ | ______ | ______ | Yes / No |
| Memory | ______ | ______ | ______ | ______ | Yes / No |
| Disk I/O | ______ | ______ | ______ | ______ | Yes / No |
| Network | ______ | ______ | ______ | ______ | Yes / No |
| DB connections | ______ | ______ | ______ | ______ | Yes / No |
| Storage | ______ | ______ | ______ | ______ | Yes / No |

## 5. Scaling Plan

### Short Term (0-3 months)
- [ ] ______
- [ ] ______

### Medium Term (3-6 months)
- [ ] ______
- [ ] ______

### Long Term (6-12 months)
- [ ] ______
- [ ] ______

## 6. Cost Projection

| Scenario | Monthly Cost | Annual Cost | Notes |
|----------|-------------|-------------|-------|
| Do nothing | ______ | ______ | Risk of outage |
| Minimum viable | ______ | ______ | Just ahead of demand |
| Comfortable headroom | ______ | ______ | 30-40% buffer |

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Growth exceeds forecast | ______ | ______ | ______ |
| Cloud provider limits | ______ | ______ | ______ |
| Scaling takes longer than expected | ______ | ______ | ______ |
| Budget not approved | ______ | ______ | ______ |

## 8. Action Items

| Task | Owner | Due Date | Status |
|------|-------|----------|--------|
| ______ | ______ | ______ | ______ |

## 9. Appendix

- Links to dashboards: ______
- Historical incident data: ______
- Related ADRs or design docs: ______
```

## Explanation

The template separates **measurement** (current state) from **prediction** (growth assumptions and traffic projections) from **decision** (scaling plan and cost projection). The **resource forecast table** highlights which resource will hit its limit first — this is the bottleneck that determines your scaling timeline. The **cost projection** frames the technical plan in business terms, making it easier to secure budget.

## Capacity Forecast Dashboard Example

```text
=== Capacity Forecast Dashboard — Q3 2026 ===

CURRENT STATE (as of 2026-07-11):
  CPU utilization (avg):     42%
  CPU utilization (peak):    68%
  Memory utilization (avg):  55%
  Memory utilization (peak): 78%
  Disk usage:                3.2 TB / 5 TB (64%)
  Network throughput (avg):  120 Mbps
  Network throughput (peak): 450 Mbps
  DB connections (avg):      45 / 100
  DB connections (peak):     82 / 100

GROWTH ASSUMPTIONS:
  User growth rate:          8% / month (based on last 6 months)
  Traffic growth rate:       12% / month (traffic grows faster than users)
  Data growth rate:          50 GB / month
  Seasonal peak factor:      2.5x (Black Friday, holiday season)

6-MONTH PROJECTION:
  Month    | CPU Peak | Mem Peak | Disk    | DB Conn Peak
  ---------|----------|----------|---------|-------------
  Aug 2026 | 72%      | 82%      | 3.7 TB  | 88
  Sep 2026 | 78%      | 86%      | 4.2 TB  | 94
  Oct 2026 | 85%      | 91%      | 4.7 TB  | 102 (OVER!)
  Nov 2026 | 95%      | 96%      | 5.2 TB  | 115 (OVER!)
  Dec 2026 | 98%      | 98%      | 5.7 TB  | 125 (OVER!)
  Jan 2027 | 100%+    | 100%+    | 6.2 TB  | 140 (OVER!)

BOTTLENECK: Database connections hit limit in October 2026
ACTION: Increase connection pool to 200 by September 2026

BOTTLENECK: Disk hits 5 TB limit in November 2026
ACTION: Add 3 TB storage by October 2026

BOTTLENECK: CPU hits 90% in November 2026 (seasonal peak)
ACTION: Add 4 instances to auto-scaling group by October 2026
```


## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Database-specific | Add query throughput, index growth, replication lag, and connection pool limits | Databases hit limits differently than compute |
| Storage-heavy systems | Add data retention policies, compression plans, and tiered storage costs | Storage grows predictably but is expensive |
| Event-driven / queue-based | Add throughput per shard, consumer lag, and dead-letter queue growth | Queues hide backpressure until they overflow |
| Multi-region | Add cross-region replication bandwidth and per-region capacity | Each region may have different growth |
| Serverless | Add invocation counts, concurrency limits, and cold-start frequency | Serverless limits are different from instance limits |

## What Works

1. **Forecast monthly, review quarterly** — assumptions change; refresh the forecast before it becomes fiction
2. **Use percentiles, not averages** — p99 latency and peak CPU matter more than mean values
3. **Include a "do nothing" scenario** — it makes the cost of inaction explicit
4. **Test your scaling plan** — run a load test that simulates your 6-month projection before you need it
5. **Share the forecast broadly** — product, finance, and engineering should all see the same numbers

## Common Mistakes

1. **Planning based on averages** — a system at 50% average CPU can be at 95% during peak hours
2. **Ignoring the database** — compute scales horizontally; databases often do not
3. **Forgetting about downstream services** — scaling your API is useless if your cache or database cannot keep up
4. **No confidence levels on assumptions** — marketing campaigns fail; build scenarios for high, medium, and low growth
5. **Waiting until 90% utilization** — by then you are already in emergency mode; plan at 70%

## Frequently Asked Questions

### How far ahead should we forecast?

Twelve months is typical for infrastructure planning, but review quarterly. Beyond 12 months, assumptions become guesses. For high-growth startups, 6 months may be more realistic. The key is not the horizon — it is the review cadence.

### What if we are wrong?

Build contingency into the plan: auto-scaling for unexpected spikes, reserved instances for predictable base load, and a documented emergency scaling runbook. The goal is not perfect prediction; it is knowing what to do when reality diverges from the forecast.

### Who should own capacity planning?

Platform or SRE teams usually own the process, but product and engineering must provide the growth assumptions. Finance should review cost projections. It is a cross-functional document, not a solo exercise.


### How do we forecast for seasonal traffic spikes?

Analyze historical traffic data for seasonal patterns: holiday shopping, tax season, back-to-school, or industry-specific events. Identify the peak multiplier (e.g., 2.5x normal traffic). Plan capacity for the peak, not the average. Pre-scale before the season starts — scaling takes time, and doing it during the spike is too late. Use reserved instances for the base load and on-demand for the seasonal peak. After the season, scale down and review the forecast accuracy. Document the actual vs. forecast for future planning. Set up alerts that trigger at 70% of seasonal peak capacity.

### What is the difference between vertical and horizontal scaling?

Vertical scaling (scaling up) means adding more resources to existing instances (more CPU, more RAM). It is simpler but has a hard limit — the maximum instance size. It often requires downtime. Horizontal scaling (scaling out) means adding more instances. It is more complex (requires load balancing, stateless services) but has no theoretical limit. Most systems use a combination: vertical for databases (which are hard to scale horizontally), horizontal for stateless services (which are easy to scale). Plan for both in your capacity forecast.

### How do we handle capacity planning for serverless architectures?

For serverless: track invocation counts, concurrent executions, and cold-start frequency. Monitor service quotas (AWS Lambda: 1000 concurrent executions by default). Forecast based on request rate growth, not CPU or memory. Plan for cold starts during traffic spikes — pre-warm functions if needed. Consider provisioned concurrency for latency-sensitive paths. Monitor cost per invocation — serverless costs can scale super-linearly with traffic. Include timeout and memory configuration in the capacity plan. Document the scaling behavior and limits of each serverless service in use.

### How do we communicate capacity needs to leadership?

Translate technical metrics into business terms: "At current growth, we will run out of database capacity in October. This will cause slow responses for 30% of users. The fix costs $5,000/month and takes 3 weeks to implement." Use the cost projection table to show the cost of inaction vs. the cost of action. Include a timeline with deadlines. Use visual aids — a chart showing utilization trending toward 100% is more compelling than a table. Present the forecast in the monthly engineering review, not as an emergency when capacity is already exhausted. Tie capacity to business metrics (users, revenue, transactions).

### What tools help with capacity planning?

Useful tools: Cloud provider dashboards (AWS CloudWatch, GCP Monitoring, Azure Monitor) for current metrics. Datadog or New Relic for unified observability. Kubernetes metrics-server and cluster autoscaler for containerized workloads. Terraform for infrastructure as code (to provision capacity quickly). Cost management tools (AWS Cost Explorer, CloudHealth) for cost projections. Spreadsheet models for forecasting (simple but effective). Grafana for custom capacity dashboards. The best tool is one that integrates with your existing monitoring and provides historical data for trend analysis.



































End of document. Review and update quarterly.