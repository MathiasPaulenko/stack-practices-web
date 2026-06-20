---
contentType: recipes
slug: cost-optimization
title: "Cloud Cost Optimization"
description: "Reduce cloud infrastructure costs with right-sizing, reserved instances, spot instances, and automated resource scheduling across AWS, GCP, and Azure."
metaDescription: "Cloud cost optimization strategies: right-sizing, reserved instances, spot instances, auto-scaling policies, and automated resource scheduling for AWS, GCP, and Azure."
difficulty: intermediate
topics:
  - infrastructure
tags:
  - cost-optimization
  - infrastructure
  - aws
  - devops
relatedResources:
  - /docs/capacity-planning-template
  - /recipes/helm-chart-deployment
  - /recipes/terraform-aws-vpc
  - /recipes/docker-compose-local-dev
  - /recipes/istio-canary-deployment
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Cloud cost optimization strategies: right-sizing, reserved instances, spot instances, auto-scaling policies, and automated resource scheduling for AWS, GCP, and Azure."
  keywords:
    - cost-optimization
    - infrastructure
    - aws
    - devops
---
## Overview

Cloud costs can spiral unexpectedly — unused resources, oversized instances, and forgotten development environments silently drain budgets. Cost optimization isn't just about cutting spending; it's about aligning infrastructure [capacity](/guides/devops/infrastructure-as-code-guide) with actual demand. This resource covers right-sizing, purchasing strategies (reserved vs. spot), automated scheduling, and FinOps practices that reduce waste without impacting reliability.

## When to Use

Use this resource when:
- Monthly cloud bills are growing faster than user traffic
- Development and staging environments run 24/7 despite only being used during business hours
- You're paying for overprovisioned instances that use <20% CPU
- You need to justify infrastructure costs to finance or leadership

## Solution

### AWS Cost Explorer Analysis (AWS CLI)

```bash
# Find top cost drivers by service
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[?Metrics.BlendedCost.Amount > \`100\`].Keys'

# Find unattached EBS volumes
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId,Size,CreateTime]'
```

### Terraform Scheduled Scaling

```hcl
resource "aws_autoscaling_schedule" "dev_office_hours" {
  scheduled_action_name  = "dev-office-hours"
  min_size               = 1
  max_size               = 3
  desired_capacity       = 2
  recurrence             = "0 9 * * MON-FRI"  # 9 AM UTC
  autoscaling_group_name = aws_autoscaling_group.dev.name
}

resource "aws_autoscaling_schedule" "dev_night_shutdown" {
  scheduled_action_name  = "dev-night-shutdown"
  min_size               = 0
  max_size               = 0
  desired_capacity       = 0
  recurrence             = "0 18 * * MON-FRI" # 6 PM UTC
  autoscaling_group_name = aws_autoscaling_group.dev.name
}
```

### Spot Instance with Fallback (Kubernetes)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spot-workload
spec:
  replicas: 5
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: node-type
                    operator: In
                    values: [spot]
      tolerations:
        - key: spot
          operator: Equal
          value: "true"
          effect: NoSchedule
      containers:
        - name: app
          image: myapp:latest
```

## Explanation

**Four pillars of cloud cost optimization**:

1. **Right-size**: Match instance type to actual usage; downsize overprovisioned resources
2. **Reserved capacity**: Commit to 1-3 year reserved instances for predictable workloads (40-60% savings)
3. **Spot/preemptible**: Use interruptible instances for fault-tolerant batch jobs (60-90% savings)
4. **Auto-scheduling**: Turn off dev/staging environments nights and weekends

**FinOps lifecycle**:
- **Inform**: Visibility into cloud spend per team, project, and environment
- **Optimize**: Technical and rate optimizations (RI, spot, rightsizing)
- **Operate**: Continuous governance, budgets, and automated policies

## Variants

| Strategy | Savings | Effort | Risk |
|----------|---------|--------|------|
| Reserved instances | 40-60% | Low | Commitment lock-in |
| Spot instances | 60-90% | Medium | Interruption |
| Scheduled shutdown | 50-70% | Low | Manual oversight |
| Storage tiering | 30-50% | Low | Access latency |
| Serverless | Variable | Medium | Cold start |

## Best Practices

- **Tag everything**: Cost allocation tags (team, project, environment) enable chargeback
- **Set budgets and alerts**: Alert at 80% of monthly budget; investigate immediately
- **Review unused resources weekly**: Dangling IPs, orphaned volumes, and stale snapshots add up
- **Use Savings Plans over RIs**: More flexible; apply across instance families and regions
- **Implement auto-scaling**: Scale to zero for dev environments; scale up for production peaks. See [autoscaling policies](/recipes/devops/terraform-aws-vpc).

## Common Mistakes

1. **No cost ownership**: When engineering doesn't see the bill, waste accumulates
2. **Overcommitting to reserved instances**: Buying 3-year RIs for workloads that may migrate to [serverless](/guides/architecture/event-driven-architecture-guide)
3. **Ignoring data transfer costs**: NAT Gateway, cross-AZ traffic, and egress can exceed compute costs
4. **Leaving preview resources running**: POCs and experiments that become permanent line items
5. **One-size-fits-all pricing**: Production needs stability; dev can tolerate spot interruptions

## Frequently Asked Questions

**Q: Should I use spot instances for production?**
A: Only for stateless, fault-tolerant workloads with proper fallback to on-demand. Never for databases or singleton services.

**Q: How do I prevent developers from creating expensive resources?**
A: [SCPs (Service Control Policies)](/guides/security/security-best-practices-guide) restrict instance types by OU. Terraform policies enforce approved instance families.

**Q: What's the difference between FinOps and DevOps?**
A: [DevOps](/guides/devops/docker-for-developers-guide) optimizes for speed and reliability. FinOps adds cost as a first-class metric, with cross-functional accountability.
