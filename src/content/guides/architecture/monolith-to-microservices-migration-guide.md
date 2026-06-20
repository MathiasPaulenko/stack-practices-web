---
contentType: guides
slug: monolith-to-microservices-migration-guide
title: "Monolith to Microservices — Migration Strategies"
description: "A practical guide to decomposing monoliths: strangler fig, branch by abstraction, and incremental extraction patterns that reduce risk and preserve business continuity."
metaDescription: "Monolith to microservices migration: strangler fig, branch by abstraction, incremental extraction. Decompose safely without stopping the business."
difficulty: advanced
topics:
  - architecture
  - devops
tags:
  - architecture
  - devops
  - guide
  - microservices
  - migration
  - monolith
  - refactoring
relatedResources:
  - /guides/architecture/microservices-architecture-guide
  - /guides/architecture/domain-driven-design-guide
  - /guides/design/solid-principles-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Monolith to microservices migration: strangler fig, branch by abstraction, incremental extraction. Decompose safely without stopping the business."
  keywords:
    - monolith to microservices
    - migration strategy microservices
    - strangler fig pattern
    - branch by abstraction
    - incremental service extraction
---

# Monolith to Microservices — Migration Strategies

## Introduction

Migrating from a monolith to microservices is one of the riskiest refactoring projects in software engineering. Done wrong, it creates a distributed monolith — slower, more complex, and harder to operate. Done right, it enables team autonomy, independent scaling, and faster delivery. This guide covers strategies that decompose safely.

## Before You Start

### Validate the Decision

| Question | If "no", reconsider |
|----------|-------------------|
| Do you have > 50 engineers? | Monolith + modular boundaries may suffice |
| Are deploys painful (> weekly)? | Fix CI/CD first |
| Can you measure the cost of the monolith? | Quantify pain before justifying migration |
| Do you have operational expertise? | Microservices need SRE/DevOps maturity |
| Is the business stable enough for a long project? | Migration takes 1-3 years for large systems |

### Identify the First Service to Extract

Choose a service that is:
- **Low risk** — not the payment or authentication system
- **High pain** — frequently changed, slow to deploy, or a bottleneck
- **Clear boundary** — minimal shared state with the rest of the monolith
- **Independent value** — useful on its own

Good first candidates: notification service, reporting service, or a feature flag service.

## Migration Patterns

### 1. Strangler Fig Pattern

Gradually replace monolith functionality by routing traffic to new services while the monolith still runs.

```
Phase 1:
  [Users] → [Monolith] → [Database]

Phase 2:
  [Users] → [API Gateway] → [Monolith] → [Database]
                    └──────> [New Service] → [New DB]

Phase 3:
  [Users] → [API Gateway] → [Service A] → [DB A]
                    └──────> [Service B] → [DB B]
                    └──────> [Monolith]   → [DB Legacy]

Phase 4:
  [Users] → [API Gateway] → [All Services]
```

**Implementation:**

```python
# API Gateway routing logic
class Router:
    def route(self, request):
        if self.feature_flags.is_enabled("use-new-catalog", request.user_id):
            return self.catalog_service.handle(request)
        return self.monolith.handle(request)
```

**Why it works:** You can roll back instantly by flipping a feature flag. The monolith is your safety net until the new service is proven.

### 2. Branch by Abstraction

Create an abstraction layer in the monolith, then swap the implementation.

```python
# Step 1: Create abstraction in monolith
class NotificationSender(ABC):
    @abstractmethod
    def send(self, user, message):
        pass

# Step 2: Monolith still uses the old implementation
class MonolithNotificationSender(NotificationSender):
    def send(self, user, message):
        ...  # old monolith logic

# Step 3: Build new service with the same interface
class ServiceNotificationSender(NotificationSender):
    def __init__(self, client):
        self.client = client  # gRPC/HTTP client to new service

    def send(self, user, message):
        self.client.send_notification(user.id, message)

# Step 4: Swap implementations via feature flag
sender = ServiceNotificationSender() if flags.enabled("new-notifications") else MonolithNotificationSender()
```

**Why it works:** The monolith never knows it is talking to a service. Rollback is a one-line change.

### 3. Parallel Run

Run both the old and new implementations, compare outputs, but only serve the old output to users.

```python
# Shadow traffic to new service
old_result = monolith_recommendations.get(user_id)
new_result = recommendations_service.get(user_id)

# Log differences, do not serve new_result yet
if old_result != new_result:
    metrics.increment("recommendation.divergence")
    logger.warning("Divergence detected", old=old_result, new=new_result)

return old_result
```

**When to use:** When correctness is critical (payments, recommendations, pricing) and you need confidence before switching.

### 4. Data Migration Patterns

#### Shared Database (Temporary)

```
[Monolith] ──> [Shared DB]
[New Service] ─┘
```

**Use for:** Weeks, not months. The new service reads from the shared DB while you plan data ownership migration.

#### Change Data Capture (CDC)

```
[Monolith DB] ──> [Debezium] ──> [Kafka] ──> [New Service DB]
```

**Use for:** Keeping new service data in sync without modifying the monolith. Debezium reads the binlog and publishes changes.

#### Synchronize and Switch

1. Dual-write from monolith to both old and new databases
2. Backfill historical data to new database
3. Switch reads to new database
4. Stop writing to old database

```python
# Dual-write in monolith
def create_order(order):
    db.execute("INSERT INTO orders ...")  # old
    new_service_client.create_order(order)  # new
```

## Migration Roadmap

| Quarter | Goal |
|---------|------|
| Q1 | Extract non-critical service (notifications, reports) using Strangler Fig |
| Q2 | Implement [API Gateway](/recipes/serverless/serverless-api-gateway) and [service discovery](/recipes/architecture/service-discovery) |
| Q3 | Extract a medium-critical service with Branch by Abstraction |
| Q4 | Parallel run for a high-critical service (recommendations, search) |
| Year 2 | Extract core services; monolith shrinks to thin orchestration layer |
| Year 3 | Retire monolith; all functionality in services |

## Best Practices

- **Never do a big-bang rewrite** — incremental extraction preserves optionality
- **Measure before and after** — track deployment frequency, lead time, and failure rate
- **Keep the monolith deployable** — do not let the extraction break [CI/CD](/guides/devops/cicd-pipeline-guide)
- **Invest in testing** — [contract tests](/recipes/testing/api-contract-testing) between monolith and new services catch breaking changes
- **Communicate progress** — stakeholders need to see value, not just engineering activity
- **Accept that some code never moves** — legacy modules that change once a year may not be worth extracting

## Common Mistakes

- Extracting services based on technical layers (UI, business logic, data) instead of business capabilities
- Ignoring data consistency — distributed transactions require [sagas](/guides/architecture/event-driven-architecture-guide), not hope
- Underestimating the "last 10%" — the final services are often the hardest and most coupled
- Removing the monolith too early — it is your safety net until services are stable
- Not investing in developer experience — local development and [testing](/guides/testing/testing-strategy-guide) become much harder with microservices

## Frequently Asked Questions

### How long does a monolith-to-microservices migration take?

For a system with 100+ engineers, expect 1-3 years. The first service takes months; the tenth takes weeks. The bottleneck is rarely technical — it is organizational alignment and testing confidence.

### Should we stop feature development during migration?

No. The business does not pause. Run migration as a parallel track: 70% features, 30% migration. If migration takes 100% of capacity, you are extracting too aggressively.

### What if we end up with a distributed monolith?

A distributed monolith happens when services share a database or deploy together. The fix is the same as the prevention: enforce database-per-service and independent deployment pipelines. It is painful to fix, so prevent it from the start.
