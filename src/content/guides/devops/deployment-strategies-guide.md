---





contentType: guides
slug: deployment-strategies-guide
title: "Blue-Green and Canary Deployments"
description: "A practical guide to deployment strategies: blue-green, canary, rolling, and feature flags. Minimize risk and rollback time when releasing to production."
metaDescription: "Deployment strategies guide: blue-green, canary, rolling, and feature flags. Minimize risk and rollback time when releasing to production safely."
difficulty: intermediate
topics:
  - devops
tags:
  - deployment
  - devops
  - feature-flags
  - guide
  - rollback
  - zero-downtime
relatedResources:
  - /guides/cicd-pipeline-guide
  - /guides/infrastructure-as-code-guide
  - /guides/docker-for-developers-guide
  - /recipes/blue-green-deployment
  - /recipes/graceful-shutdown
  - /recipes/traffic-mirroring
  - /guides/complete-guide-ci-cd-github-actions
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Deployment strategies guide: blue-green, canary, rolling, and feature flags. Minimize risk and rollback time when releasing to production safely."
  keywords:
    - blue green deployment
    - canary deployment
    - zero downtime deployment
    - deployment strategies
    - feature flags production





---

# Blue-Green and Canary Deployments

## Introduction

Deploying to production is risky. A bad deployment can take down your service, corrupt data, or degrade user experience for hours. Deployment strategies exist to reduce this risk by controlling how new code reaches users and how quickly you can revert if things go wrong.

## Deployment Strategies Compared

| Strategy | Risk Level | Rollback Time | Complexity | Best For |
|----------|-----------|---------------|------------|----------|
| **Recreate** | High | Slow (redeploy) | Low | Dev/test environments only |
| **Rolling** | Medium | Medium (stop rolling) | Low | Simple stateless services |
| **Blue-Green** | Low | Instant (switch traffic) | Medium | When instant rollback is critical |
| **Canary** | Very Low | Fast (shift traffic back) | High | High-risk changes, gradual rollouts |
| **Feature Flags** | Minimal | Instant (toggle off) | Medium | Decoupling deploy from release |

## Rolling Deployment

Replace old instances gradually with new ones.

```
Phase 1: [Old] [Old] [Old] [Old] [Old]
Phase 2: [New] [Old] [Old] [Old] [Old]
Phase 3: [New] [New] [Old] [Old] [Old]
Phase 4: [New] [New] [New] [New] [New]
```

```bash
# Kubernetes rolling update
kubectl set image deployment/api api=myapp:v2.4.1
kubectl rollout status deployment/api
```

**Trade-off:** During rollout, old and new versions coexist. If v2 breaks a data contract, v1 instances may fail when reading v2-written data.

## Blue-Green Deployment

Maintain two identical environments. One is live (blue), one is idle (green). Deploy to green, test, then switch traffic instantly.

```
Before:  Users → [Load Balancer] → [Blue: v2.4.0]
                                    [Green: v2.4.0 idle]

After:   Users → [Load Balancer] → [Blue: v2.4.0 idle]
                                    [Green: v2.4.1 live]
```

```bash
# Terraform example: blue-green with AWS ALB target groups
# Switch traffic by changing ALB listener rule
aws_lb_target_group_attachment "blue" { target_group_arn = blue_tg.arn }
aws_lb_target_group_attachment "green" { target_group_arn = green_tg.arn }

# Instant rollback: point ALB back to blue
```

**Trade-off:** Doubles infrastructure cost. Requires handling of database schema changes carefully (both versions must work with the same schema).

### Database Considerations

| Change Type | Blue-Green Compatible? |
|-------------|----------------------|
| Add column (nullable) | Yes — old code ignores it |
| Add column (non-nullable) | No — old code cannot insert without it |
| Rename column | No — old code references old name |
| Drop column | No — old code may still read it |
| Add index | Yes — both versions benefit |

**Rule:** Blue-green requires backward-compatible database changes. Use expand-contract pattern: add new column (expand), deploy new code, remove old column (contract).

## Canary Deployment

Route a small percentage of traffic to the new version, monitor metrics, then gradually increase.

```
Step 1: 1%  → [Canary v2.4.1], 99% → [Stable v2.4.0]
Step 2: 5%  → [Canary v2.4.1], 95% → [Stable v2.4.0]
Step 3: 25% → [Canary v2.4.1], 75% → [Stable v2.4.0]
Step 4: 100% → [Canary v2.4.1 becomes stable]
```

```yaml
# Kubernetes with Flagger (automated canary)
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  service:
    port: 80
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
      - name: request-duration
        thresholdRange:
          max: 500
```

**Abort criteria:** If error rate spikes or latency exceeds threshold, Flagger automatically rolls back to 0% canary.

## Feature Flags (Decoupling Deploy from Release)

Deploy code to production but keep it hidden. Enable for specific users when ready.

```python
# LaunchDarkly-style feature flag
if client.variation("new-checkout-flow", user_context, False):
    return new_checkout.handle(request)
return old_checkout.handle(request)
```

| Use Feature Flags For | Do NOT Use Feature Flags For |
|----------------------|----------------------------|
| New UI capabilities | Security fixes (should not be toggleable) |
| A/B tests | Critical bug patches |
| Gradual capability rollouts | Data migration code |
| Kill switches for risky capabilities | |

## Metrics to Watch During Deployment

| Metric | Canary Threshold | Action If Breached |
|--------|-----------------|-------------------|
| Error rate | < 0.1% | Rollback canary |
| Latency p99 | < baseline + 20% | Rollback canary |
| Throughput | No drop > 10% | Rollback canary |
| Custom business metric | No drop | Rollback canary |

## What Works

- **Automate rollback** — a human pressing a button at 3 AM is unreliable. See [CI/CD pipelines](/guides/devops/cicd-pipeline-guide).
- **Use synthetic traffic** — hit the canary with [automated tests](/recipes/performance/load-testing-k6) before real users
- **Keep deployments small** — smaller changes are easier to debug and faster to rollback
- **One change at a time** — do not combine a deploy with a database migration and a config change
- **Test rollback** — a rollback you have never practiced is a gamble

## Common Mistakes

- Deploying on Friday afternoon — you will be debugging all weekend
- Not having automated rollback — manual rollbacks take 10x longer
- Combining multiple changes in one deploy — when it breaks, you do not know which change caused it
- Ignoring canary metrics because "the tests passed" — production traffic is the only real test
- Forgetting [database schema compatibility](/recipes/databases/schema-evolution) in blue-green — old and new code must coexist during the switch

## Frequently Asked Questions

### Should every deploy use canary?

No. Low-risk changes (dependency updates, typo fixes) can use rolling deploys. Reserve canary for user-facing capabilities, risky refactors, and changes that touch critical paths (payments, authentication).

### How long should a canary run?

Until you have statistical confidence. For high-traffic services, 15-30 minutes may suffice. For low-traffic services, hours or a full business cycle may be needed. Use error budgets and SLOs to define "done."

### What if the database schema needs to change?

Use the expand-contract pattern. Step 1: deploy schema change (add new column, keep old). Step 2: deploy code that writes to both. Step 3: backfill data. Step 4: deploy code that reads from new column only. Step 5: drop old column. This takes multiple deploys but ensures zero downtime.


## Advanced Topics

### Scenario: Deployment Pipeline for E-commerce

```yaml
# ArgoCD Application: canary deployment
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-service
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 5        # 5% traffic to v2
        - pause: { duration: 5m }  # Observe 5 min
        - setWeight: 20       # 20% traffic
        - pause: { duration: 10m }
        - setWeight: 50       # 50% traffic
        - analysis:           # Automatic analysis
            templates:
            - templateName: success-rate
            args:
            - name: service-name
              value: payment-service
        - setWeight: 100      # 100% if passes
  selector:
    matchLabels: { app: payment-service }
  template:
    spec:
      containers:
        - name: payment
          image: registry.example.com/payment:v2.1.0
          resources:
            requests: { cpu: 200m, memory: 256Mi }
            limits: { cpu: 500m, memory: 512Mi }

# AnalysisTemplate: success criteria
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{
              service="{{args.service-name}}",
              status!~"5.."}[2m]))
            / sum(rate(http_requests_total{
              service="{{args.service-name}}"}[2m]))

Strategies by change type:
  | Change | Strategy | Duration |
  |--------|----------|----------|
  | Typo fix | Rolling | 2 min |
  | Dependency update | Rolling | 5 min |
  | New UI feature | Blue-green | 10 min |
  | Logic refactor | Canary 5->20->50->100 | 30 min |
  | DB schema change | Expand-contract | Multi-deploy |
  | Infra migration | Shadow + canary | 1-2 hours |

Automatic rollback:
  - Error rate > 1% for 2 min -> rollback
  - p99 latency > 2x baseline -> rollback
  - AnalysisTemplate fails 3 times -> rollback
  - Rollback: ArgoCD reverts to previous revision in 30s

Lessons:
  - Canary with automatic analysis > manual canary
  - Define success criteria before deploying
  - Automatic rollback reduces MTTR dramatically
  - Expand-contract for schema changes is mandatory
  - Shadow deploy validates without user impact
```

### How do I handle cross-region deployments?

Use ArgoCD ApplicationSet with multiregion clusters. Deploy sequentially: us-east first, then eu-west, then ap-southeast. Pause between regions to detect problems. Use a global load balancer (Route53, Cloudflare) for health checks. If one region fails, the others are already on the new version.













End of document. Review and update quarterly.