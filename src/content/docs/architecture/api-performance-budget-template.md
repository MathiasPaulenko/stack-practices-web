---
contentType: docs
slug: api-performance-budget-template
title: "API Performance Budget Template"
description: "A template for setting and tracking API latency and throughput performance budgets."
metaDescription: "Use this API performance budget template to define latency targets, throughput limits, and resource constraints for API design."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - api
  - performance
  - budget
  - latency
  - template
relatedResources:
  - /docs/api-lifecycle-management-template
  - /docs/api-monitoring-alerting-template
  - /docs/microservice-contract-template
  - /docs/service-dependency-map-template
  - /docs/system-diagram-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this API performance budget template to define latency targets, throughput limits, and resource constraints for API design."
  keywords:
    - architecture
    - api
    - performance
    - budget
    - latency
    - template
---
## Overview

Every API endpoint consumes resources: CPU, memory, database connections, and network bandwidth. Without explicit budgets, teams add capabilities until the system collapses under load. This template defines performance budgets as a contract between product requirements and infrastructure capacity, making trade-offs explicit before they become outages.

## When to Use

Use this resource when:
- Designing a new API or adding a new endpoint to an existing one
- Planning capacity for a marketing campaign or seasonal traffic spike
- Investigating why an API is slow under load

## Solution

```markdown
# API Performance Budget: `<API Name>`

## 1. Endpoint Budgets

### 1.1. Latency Budget (p95)

| Endpoint | Target | Current | Buffer | Notes |
|----------|--------|---------|--------|-------|
| `GET /health` | < 10ms | 8ms | 2ms | Must not depend on DB |
| `GET /users/{id}` | < 100ms | 85ms | 15ms | Single DB query allowed |
| `POST /orders` | < 250ms | 210ms | 40ms | Multi-table transaction |
| `GET /reports/aggregate` | < 2s | 1.8s | 200ms | Read replica allowed |

### 1.2. Throughput Budget

| Endpoint | RPS Target | Max Burst | Connection Pool | Notes |
|----------|------------|-----------|-----------------|-------|
| `GET /products` | 5,000 | 10,000 | 50 | Cached in Redis |
| `POST /checkout` | 500 | 1,000 | 20 | DB write, idempotent |

### 1.3. Payload Budget

| Direction | Max Size | Typical | Compression |
|-----------|----------|---------|-------------|
| Request body | 1 MB | 10 KB | Gzip |
| Response body | 5 MB | 50 KB | Gzip + Brotli |
| Header total | 16 KB | 1 KB | None |

### 1.4. Dependency Budget

| Dependency | Max Latency Contribution | Max Concurrent Calls | Fallback |
|------------|--------------------------|----------------------|----------|
| PostgreSQL | 40ms | 20 | Read replica |
| Redis | 5ms | 100 | Skip cache (slower) |
| Payment Gateway | 200ms | 10 | Queue for async |
| Search Service | 100ms | 50 | Basic LIKE query |

## 2. Resource Budgets

| Resource | Baseline | Headroom | Max | Alert At |
|----------|----------|----------|-----|----------|
| CPU / core | 40% | 30% | 70% | 60% |
| Memory / pod | 512 MB | 256 MB | 1 GB | 800 MB |
| DB connections | 50 | 30 | 80 | 70 |
| Network egress | 100 Mbps | 50 Mbps | 200 Mbps | 150 Mbps |

## 3. Budget Enforcement

- [ ] Latency assertions in CI (fail build if p95 exceeds budget)
- [ ] Load test gates in deployment pipeline
- [ ] Payload size validation at API gateway
- [ ] Circuit breaker on dependency calls exceeding max latency
- [ ] Autoscaling triggered at 60% CPU, not 80%

## 4. Review Cadence

| Trigger | Action | Owner |
|---------|--------|-------|
| Weekly | Review dashboards for drift above budget | SRE |
| Monthly | Adjust budgets based on traffic growth | Platform |
| Quarterly | Re-negotiate budgets with product team | Engineering Lead |
| Incident | Post-incident budget audit | Incident Commander |
```

## Explanation

A **latency budget** is a chain: frontend (100ms) + network (50ms) + API (200ms) + database (40ms) = 390ms total. If any single link exceeds its allocation, the whole user experience degrades. The **buffer column** exists because real-world performance is noisy. **Dependency budgets** prevent a slow downstream service from consuming the entire API budget. Throughput budgets define connection pools and cache sizes. Resource budgets prevent one heavy endpoint from starving others on the same host.

## Latency Budget Chain Example

When a user clicks "Place Order", the request traverses multiple layers. Each layer has its own budget:

```
User clicks button (0ms)
  └─ Browser rendering (50ms)
       └─ CDN edge (20ms)
            └─ API gateway (10ms)
                 └─ Order service (80ms)
                      ├─ PostgreSQL (30ms)
                      ├─ Payment gateway (150ms)
                      └─ Inventory service (40ms)
                 └─ Response serialization (5ms)
            └─ CDN edge return (20ms)
       └─ Browser render (50ms)
Total: ~455ms (within 500ms budget)
```

If the payment gateway takes 300ms instead of 150ms, the total jumps to 605ms and the budget is blown. The dependency budget for payment gateway (200ms max) would flag this as a violation before the endpoint budget does.

## CI Enforcement with k6 Load Tests

Use k6 to enforce latency budgets in your CI pipeline:

```javascript
import http from "k6/http";
import { check, fail } from "k6/utils";

export let options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: [
      { endpoint: "GET /health", p(95): 10 },
      { endpoint: "GET /users/{id}", p(95): 100 },
      { endpoint: "POST /orders", p(95): 250 },
    ],
  },
};

export default function () {
  const healthRes = http.get(`${__ENV.BASE_URL}/health`);
  check(healthRes, {
    "health p95 < 10ms": (r) => r.timings.duration < 10,
  });

  const userRes = http.get(`${__ENV.BASE_URL}/users/123`);
  check(userRes, {
    "user lookup p95 < 100ms": (r) => r.timings.duration < 100,
  });

  const orderRes = http.post(
    `${__ENV.BASE_URL}/orders`,
    JSON.stringify({ productId: 1, quantity: 2 }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(orderRes, {
    "order creation p95 < 250ms": (r) => r.timings.duration < 250,
  });
}
```

Run in CI with budget enforcement:

```bash
k6 run --env BASE_URL=https://staging.example.com load-test.js
# Exit code 1 if any threshold is violated, failing the CI build
```

## Monitoring Budget Compliance with Prometheus

Track budget violations in production with PromQL:

```promql
# Percentage of requests within budget (per endpoint)
sum(rate(http_request_duration_seconds_bucket{le="0.1", endpoint="GET /users"}[5m]))
/
sum(rate(http_request_duration_seconds_count{endpoint="GET /users"}[5m]))
* 100

# Alert when more than 1% of requests exceed budget
(
  sum(rate(http_request_duration_seconds_count{endpoint="GET /users"}[5m]))
  -
  sum(rate(http_request_duration_seconds_bucket{le="0.1", endpoint="GET /users"}[5m]))
)
/
sum(rate(http_request_duration_seconds_count{endpoint="GET /users"}[5m]))
> 0.01
```

## Budget Tracking Dashboard

Create a Grafana dashboard panel for each endpoint showing:

1. **Current p95 latency** as a single stat, colored green/yellow/red based on budget
2. **Latency trend** over the last 7 days with a horizontal line at the budget threshold
3. **Budget violation rate** as a percentage of requests exceeding the target
4. **Throughput vs budget** showing current RPS against the RPS target
5. **Dependency latency breakdown** showing each upstream service contribution to total latency

Dashboard JSON for a latency budget panel:

```json
{
  "panels": [
    {
      "title": "GET /users - p95 Latency vs Budget",
      "type": "stat",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{endpoint=\"GET /users\"}[5m])) * 1000",
          "legendFormat": "p95 latency (ms)"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              { "value": null, "color": "green" },
              { "value": 80, "color": "yellow" },
              { "value": 100, "color": "red" }
            ]
          },
          "unit": "ms"
        }
      }
    }
  ]
}
```

The green/yellow/red thresholds map directly to the budget: green is within 80% of budget, yellow is 80-100%, and red is over budget.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| GraphQL | Query complexity budget | Limit total field cost per query, not just depth |
| Streaming API | Throughput per shard | Budget per partition, not global |
| Mobile SDK | Bundle size + call frequency | Budget includes payload size and number of parallel requests |
| gRPC | Per-method deadline propagation | Use context deadlines to enforce budgets across hops |

## What Works

1. Set budgets during design, not after launch
2. Include budgets in API design review checklists
3. Fail CI builds when latency tests exceed budget by any margin
4. Reserve 20-30% buffer in every budget for traffic spikes
5. Document who can approve budget exceptions (usually engineering lead)
6. Track budget burn rate, not just current values
7. Separate read and write budgets since they have different cost profiles

## Common Mistakes

1. Basing budgets on best-case lab conditions instead of production percentiles
2. Ignoring dependency latency when calculating endpoint budgets
3. Setting one global budget for all endpoints regardless of criticality
4. Treating budgets as one-time decisions instead of living documents
5. Failing to enforce budgets in CI or deployment gates
6. Not accounting for cold starts in serverless architectures
7. Setting budgets without input from the product team, leading to unrealistic targets

## Frequently Asked Questions

### What happens when an endpoint exceeds its budget?

First, optimize: add caching, denormalize queries, or paginate. If the endpoint fundamentally needs more time, escalate to the engineering lead who can either approve a budget increase or downgrade the SLO. Never silently ignore budget violations.

### How do I budget for endpoints with unknown traffic patterns?

Start with conservative estimates based on similar endpoints. Monitor for 2 weeks after launch, then adjust. Use feature flags to ramp traffic gradually so you can observe real performance before committing to a budget.

### Should budgets apply to batch / async endpoints?

Yes, but use different metrics. For async, budget on queue depth, processing rate (items/second), and end-to-end latency from enqueue to completion. Throughput matters more than response time for batch jobs.

### How do I handle budget violations during a traffic spike?

Autoscaling should trigger before budget exhaustion (at 60% CPU, not 80%). If the spike is unexpected, temporarily increase the budget and schedule a post-incident review. If the spike is expected (campaign, launch), pre-provision capacity and raise budgets in advance.

### What is the difference between a performance budget and an SLO?

An SLO is a reliability target agreed with consumers (e.g., 99.9% of requests under 200ms). A performance budget is an internal engineering constraint that helps you meet the SLO (e.g., database queries under 40ms so the API can stay under 200ms). Budgets are the decomposition of SLOs into per-layer allocations.

### Should I use p95 or p99 for latency budgets?

Use p95 for user-facing endpoints where the majority of experience matters. Use p99 for critical paths like payment and authentication where every request counts. Using p50 (median) hides tail latency problems that affect real users.

### How often should I review and adjust budgets?

Review monthly for fast-growing services. Quarterly for stable services. After any P1 incident, audit whether the budget was realistic or needs adjustment. Budgets that are never updated are budgets that are never checked.

### How do I set a payload size budget?

Measure the 95th percentile of request and response sizes in production. Set the budget at 2x the p95 to allow headroom. Enforce the budget at the API gateway with a hard reject for payloads exceeding the limit. For responses, use pagination and field selection to keep payload sizes within budget.

### Can I have different budgets for the same endpoint in different regions?

Yes. Latency budgets should account for geographic distance. An endpoint serving users in Europe from a US data center will have higher latency than the same endpoint serving US users. Set per-region budgets and consider edge caching or regional deployments for latency-sensitive endpoints.

### What tools should I use to track budget compliance?

Use Prometheus for metrics collection, Grafana for dashboards, and k6 or Locust for load testing in CI. For budget alerting, configure Prometheus alertmanager to page on-call when budget violation rate exceeds 1% over 5 minutes.
