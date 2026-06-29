---
contentType: docs
slug: auto-scaling-policy-template
title: "Auto-Scaling Policy Template"
description: "A template for documenting scale-up and scale-down rules for cloud infrastructure."
metaDescription: "Use this auto-scaling policy template to define CPU, memory, and request-based scale-up and scale-down rules for cloud workloads."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - auto-scaling
  - cloud
  - infrastructure
  - policy
  - template
relatedResources:
  - /docs/capacity-planning-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/contributing-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this auto-scaling policy template to define CPU, memory, and request-based scale-up and scale-down rules for cloud workloads."
  keywords:
    - devops
    - auto-scaling
    - cloud
    - infrastructure
    - policy
    - template
---
## Overview

Auto-scaling is the bridge between cost efficiency and availability. Scale too late and your service crashes under load; scale too early and you burn money on idle capacity. This template documents the exact rules, thresholds, and procedures your infrastructure team uses to scale workloads up and down automatically.

## When to Use

Use this resource when:
- Defining scaling rules for a new service deployed to the cloud
- Auditing why an auto-scaling event caused an outage or excessive cost
- Migrating from static instance sizes to live scaling

## Solution

```markdown
# Auto-Scaling Policy: `<Service Name>`

## 1. Service Metadata

| Field | Value |
|-------|-------|
| Service | `name` |
| Platform | `AWS / GCP / Azure / Kubernetes` |
| Owner Team | `@team-name` |
| Last Reviewed | `YYYY-MM-DD` |

## 2. Scale-Up Policy

### 2.1. Triggers

| Metric | Threshold | Duration | Scale Action | Cooldown |
|--------|-----------|----------|--------------|----------|
| CPU utilization | > 60% | 2 minutes | Add 1 instance | 3 minutes |
| Memory utilization | > 70% | 2 minutes | Add 1 instance | 3 minutes |
| Request count | > 5,000 RPS | 1 minute | Add 2 instances | 5 minutes |
| Queue depth | > 100 messages | 3 minutes | Add 1 instance | 3 minutes |
| Latency p95 | > 500ms | 2 minutes | Add 2 instances | 5 minutes |

### 2.2. Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max instances | 20 | Cost ceiling, database connection limit |
| Max scale-up per event | 50% of current | Prevent thundering herd on cold start |
| Scale-up cooldown | 3 minutes | Allow metric stabilization |

## 3. Scale-Down Policy

### 3.1. Triggers

| Metric | Threshold | Duration | Scale Action | Cooldown |
|--------|-----------|----------|--------------|----------|
| CPU utilization | < 30% | 10 minutes | Remove 1 instance | 5 minutes |
| Memory utilization | < 30% | 10 minutes | Remove 1 instance | 5 minutes |
| Request count | < 1,000 RPS | 10 minutes | Remove 1 instance | 5 minutes |

### 3.2. Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Min instances | 3 | Redundancy, rolling deployment buffer |
| Max scale-down per event | 25% of current | Avoid over-correction |
| Scale-down cooldown | 5 minutes | Allow metric stabilization |

## 4. Instance Requirements

### 4.1. Health Checks

- [ ] Load balancer health check passes before instance receives traffic
- [ ] Instance must serve traffic for minimum 5 minutes before scale-down eligibility
- [ ] Connection draining allows in-flight requests to complete (30 seconds)

### 4.2. Warm-Up

- [ ] New instances complete initialization (app start, cache warm-up) before joining pool
- [ ] Warm-up time documented: `60 seconds`
- [ ] Startup probe / readiness probe configured in orchestrator

## 5. Cost Controls

| Control | Value | Notes |
|---------|-------|-------|
| Max hourly spend | $500 | Alert if exceeded |
| Instance type | `c5.large` | CPU-optimized for API workload |
| Spot / Preemptible | 50% of instances | Use for non-critical batch processing only |
| Reserved capacity | Baseline of 3 instances | Commitment discount for minimum |

## 6. Incident Response

| Scenario | Action | Owner |
|----------|--------|-------|
| Scale-up fails (quota exceeded) | Page on-call, escalate to cloud admin | SRE |
| Scale-down causes errors | Pause auto-scaling, investigate | Platform |
| Costs spike > 2x baseline | Review policy, check for runaway jobs | Finance + SRE |
| Latency rises despite scaling | Alert: likely database bottleneck, not compute | DBA + App Team |
```

## Explanation

The template separates **scale-up** (fast, aggressive) from **scale-down** (slow, conservative). Scale-up triggers use shorter durations because you need capacity before failures happen. Scale-down uses longer durations to avoid thrashing instances in and out during normal traffic jitter. The **cooldown** prevents the autoscaler from reacting to metric noise caused by the scaling event itself. **Min instances** exist for redundancy: even at zero traffic, you need enough instances to survive a rolling deployment without downtime.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Kubernetes HPA | Metrics via custom metrics API | Scale on custom metrics (queue length, request latency) |
| AWS EC2 Auto Scaling | CloudWatch alarms | Use predictive scaling for known patterns |
| Serverless (Lambda) | Concurrency limits | No traditional scaling; manage max concurrency and reserved concurrency |
| GPU workloads | Scale on GPU utilization | Longer warm-up, higher cost; avoid spot instances |

## What works

1. Always set max instance limits to prevent runaway scaling from infinite loops or DDoS
2. Use predictive scaling for predictable traffic patterns (nightly batch, business hours)
3. Test scale-up and scale-down events in staging before production
4. Monitor scaling event frequency; frequent events indicate threshold misconfiguration
5. Document why each threshold was chosen so future teams can tune intelligently

## Common Mistakes

1. Setting CPU threshold at 80% or higher, leaving no headroom for spikes
2. Using the same policy for all services regardless of their workload patterns
3. Forgetting connection draining, causing dropped requests during scale-down
4. Scaling only on CPU and ignoring memory, network, or custom metrics
5. Allowing scale-down to zero for stateful services that need persistent connections

## Frequently Asked Questions

### Should I scale on CPU or requests per second?

CPU works for compute-bound workloads (image processing, ML inference). RPS works for I/O-bound workloads (APIs, proxies). Use custom metrics (queue depth, latency) when neither CPU nor RPS correlates with user experience. The best policies use multiple metrics with OR logic.

### What is predictive scaling and when should I use it?

Predictive scaling (AWS, GCP) uses historical traffic to pre-warm instances before the spike arrives. Use it for predictable patterns: daily peaks, weekly batch jobs, or marketing campaigns. Do not use it for unpredictable viral traffic.

### How do I prevent cost explosions from auto-scaling?

Set a hard max instance count. Use budget alerts. Review instance types quarterly (a newer generation may be cheaper and faster). Use reserved instances for baseline capacity and auto-scaling for overflow. Tag instances by service so finance can attribute costs accurately.
