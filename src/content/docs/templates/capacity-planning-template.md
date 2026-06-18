---
contentType: docs
slug: capacity-planning-template
templateType: capacity-planning
title: "Capacity Planning Template"
description: "A reusable template for planning system capacity, estimating growth, and preventing performance bottlenecks before they happen."
metaDescription: "System capacity planning template with resource estimation, load forecasting, bottleneck analysis, and scaling strategies for engineering teams."
difficulty: intermediate
topics:
  - performance
  - infrastructure
  - devops
tags:
  - capacity-planning
  - template
  - scalability
  - performance
  - infrastructure
  - resource-estimation
  - devops
relatedResources:
  - /docs/templates/system-diagram-template
  - /guides/performance/performance-optimization-guide
  - /guides/devops/infrastructure-as-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "System capacity planning template with resource estimation, load forecasting, bottleneck analysis, and scaling strategies for engineering teams."
  keywords:
    - template
---

## Best Practices

- **Plan before the bottleneck** — Capacity planning is proactive, not reactive. If you are already at 80% utilization, you are late
- **Use load testing data** — Do not guess; run load tests to find real breaking points
- **Include a safety margin** — Aim for headroom of at least 30-40% above projected peak load
- **Review quarterly** — Growth assumptions change; revisit capacity plans every quarter
- **Document dependencies** — A database replica limit affects application capacity even if app servers have spare CPU
- **Model burst traffic** — Plan for 2-3x normal peak during marketing campaigns or viral events
- **Account for data retention** — Storage grows continuously even if user growth is flat

## Common Mistakes

- Using average load instead of peak load for planning — averages hide the moments that cause outages
- Ignoring non-linear scaling — Some components degrade faster after a threshold (e.g., database lock contention)
- Not involving finance early — Surprise budget approvals kill timelines
- Forgetting about non-production environments — Staging and CI also need capacity
- Planning only for compute, ignoring storage — Disk capacity exhausts silently and kills services

## Frequently Asked Questions

### How far ahead should I plan?

For stable systems, 12 months is sufficient. For high-growth products or before major launches, plan 18-24 months ahead with quarterly checkpoints.

### Should I over-provision or scale on demand?

Over-provision critical paths (authentication, payment processing) and use auto-scaling for bursty, non-critical workloads. Cost vs. reliability trade-off depends on your SLA.

### What if growth projections are wrong?

Build flexibility into your architecture (containerized workloads, infrastructure as code) so you can pivot between vertical and horizontal scaling without rewriting the application.
