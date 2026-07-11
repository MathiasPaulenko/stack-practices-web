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

## AWS Auto Scaling Terraform Configuration

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  vpc_zone_identifier = data.aws_subnets.private.ids
  min_size            = 3
  max_size            = 20
  desired_capacity    = 5

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Team"
    value               = "platform"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "scale-up"
  autoscaling_group_name = aws_autoscaling_group.app.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 2
  cooldown               = 300
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "scale-down"
  autoscaling_group_name = aws_autoscaling_group.app.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 600
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]
}

resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "low-cpu"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 10
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 30
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]
}
```

## Kubernetes HPA with Custom Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
        - type: Pods
          value: 4
          periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 120
      selectPolicy: Min
```

## Scaling Event Dashboard Query

```text
=== Scaling Event Log (Last 24h) ===

Time         Direction   Trigger              From -> To   Duration
02:15 UTC    Scale UP    CPU > 70% (2 min)    5 -> 7       45s warm-up
02:45 UTC    Scale UP    CPU > 70% (2 min)    7 -> 9       42s warm-up
04:30 UTC    Scale DOWN  CPU < 30% (10 min)   9 -> 8       15s drain
08:00 UTC    Scale UP    RPS > 1000 (1 min)   8 -> 12      38s warm-up
08:30 UTC    Scale UP    RPS > 1000 (1 min)   12 -> 16     41s warm-up
10:00 UTC    Scale DOWN  CPU < 30% (10 min)   16 -> 14     12s drain
14:00 UTC    Scale DOWN  CPU < 30% (10 min)   14 -> 10     18s drain
18:00 UTC    Scale DOWN  CPU < 30% (10 min)   10 -> 8      15s drain
22:00 UTC    Scale DOWN  CPU < 30% (10 min)   8 -> 5       20s drain

Total scaling events: 9
Scale-up events: 4 (avg warm-up: 41s)
Scale-down events: 5 (avg drain: 16s)
Thrashing detected: No (min 2h between opposing events)
```


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


### How do we handle scaling for stateful services?

Stateful services (databases, caches with persistence) should not use standard auto-scaling. Instead, use read replicas for scaling reads and vertical scaling (larger instances) for write capacity. If you must scale stateful services horizontally, use sticky sessions or consistent hashing to distribute load. Never allow scale-down to zero for stateful services. Document the scaling strategy separately from stateless services.

### What is step scaling vs target tracking?

Target tracking maintains a target metric value (e.g., 70% CPU) by adjusting capacity automatically. It is simpler and requires less tuning. Step scaling uses CloudWatch alarms with specific adjustments (e.g., +2 instances when CPU > 70%, +4 when > 85%). It offers more control but requires more configuration. Use target tracking for most workloads. Use step scaling when you need different responses at different thresholds.

### How do we test auto-scaling policies?

1. Deploy the policy in staging. 2. Generate load with tools like k6, Locust, or Artillery. 3. Verify scale-up triggers at the expected threshold and time window. 4. Stop load and verify scale-down after the cooldown. 5. Check that new instances pass health checks before receiving traffic. 6. Verify connection draining works during scale-down. 7. Monitor cost impact. 8. Document the test results and adjust thresholds if needed.

### What is warm-up time and why does it matter?

Warm-up time is the delay between an instance starting and being ready to serve traffic. During warm-up, the instance consumes resources but does not handle requests. For JVM applications, warm-up can be 60-120 seconds due to JIT compilation. For containerized services, 10-30 seconds is typical. Set the warm-up time in your auto-scaling policy to avoid counting instances that are not yet ready. If warm-up is too short, new instances may fail health checks and trigger unnecessary scale-up events.

### How do we handle scaling during deployments?

Use rolling deployments with max surge and max unavailable settings to control how many new instances are created. For blue-green deployments, scale the green environment before cutting traffic. For canary deployments, scale incrementally as traffic shifts. Pause auto-scaling during deployments if the deployment itself changes resource usage patterns. Resume auto-scaling after the deployment stabilizes. Document the deployment-specific scaling behavior in the deployment runbook.
