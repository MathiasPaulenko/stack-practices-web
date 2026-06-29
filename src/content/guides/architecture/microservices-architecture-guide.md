---
contentType: guides
slug: microservices-architecture-guide
title: "Microservices Architecture — When to Use and When Not To"
description: "A practical guide to microservices: benefits, trade-offs, common patterns, and when to choose them over monoliths. Covers decomposition strategies and operational complexity."
metaDescription: "Microservices architecture guide: when to use them, trade-offs, decomposition strategies, and common patterns. Choose the right architecture for your scale."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - distributed-systems
  - guide
  - microservices
  - monolith
  - scalability
relatedResources:
  - /guides/architecture/system-design-interview-guide
  - /guides/architecture/domain-driven-design-guide
  - /guides/devops/docker-for-developers-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Microservices architecture guide: when to use them, trade-offs, decomposition strategies, and common patterns. Choose the right architecture for your scale."
  keywords:
    - microservices architecture
    - when to use microservices
    - microservices vs monolith
    - service decomposition
    - distributed systems patterns
---

# Microservices Architecture — When to Use and When Not To

## Introduction

Microservices architecture structures an application as a collection of loosely coupled services, each owned by a small team and deployed independently. It solves organizational and technical scaling problems, but introduces major operational complexity. This guide helps you decide when the trade-off is worth it.

## What Are Microservices?

A microservice is a self-contained unit of functionality that:

- **Owns its data** — each service has its own database, no shared schema
- **Is independently deployable** — a change to one service does not require redeploying others
- **Communicates over the network** — via HTTP/gRPC or asynchronous messaging
- **Is owned by a small team** — typically 5-15 engineers per service

## When to Use Microservices

| Signal | Why Microservices Help |
|--------|-----------------------|
| **Multiple teams > 20 engineers** | Reduces coordination overhead; teams deploy independently |
| **Different parts scale differently** | Scale only the hot service, not the entire monolith |
| **Different technology requirements** | One service needs GPU, another needs high I/O — use the right tool |
| **Need for independent release cadence** | Mobile API ships daily, billing service ships monthly |
| **Fault isolation required** | A bug in search should not take down payments |

## When NOT to Use Microservices

| Signal | Better Alternative |
|--------|-------------------|
| **< 10 engineers** | Monolith with modular code boundaries |
| **Unproven product / MVP** | Monolith — iterate faster, split later |
| **Low traffic / simple domain** | Monolith — simpler to operate |
| **No DevOps/SRE culture** | Monolith — microservices require mature operational practices |
| **Tight latency requirements (< 10ms)** | Monolith — network hops add latency |

## The Monolith-First Rule

> Start with a well-modularized monolith. Extract services only when a clear boundary is painful to maintain.

Martin Fowler and Sam Newman both advocate starting with a monolith and decomposing only when the pain is real. Premature decomposition creates distributed monoliths — the worst of both worlds.

## Decomposition Strategies

### 1. Decompose by Business Capability

| Service | Business Capability |
|---------|---------------------|
| User Service | Account management, authentication |
| Catalog Service | Product listings, search, inventory |
| Order Service | Checkout, order history, fulfillment |
| Payment Service | Charging cards, refunds, invoicing |
| Notification Service | Emails, SMS, push notifications |

**Why it works:** boundaries align with how the business thinks and evolves.

### 2. Decompose by Subdomain (DDD)

Use Domain-Driven Design bounded contexts:

```
┌─────────────────────────────────────┐
│          E-Commerce Domain          │
├──────────────┬──────────────┬───────┤
│   Catalog    │   Checkout   │ Loyalty│
│   Context    │   Context    │Context│
│              │              │       │
│ - Products   │ - Orders     │ - Points│
│ - Categories │ - Payments   │ - Tiers │
│ - Search     │ - Shipping   │ - Rewards│
└──────────────┴──────────────┴───────┘
```

### 3. Strangler Fig Pattern

Gradually replace monolith functionality with new services:

```
Phase 1: [Monolith] → all traffic
Phase 2: [Monolith] + [User Service] → traffic split via API Gateway
Phase 3: [Monolith fragments] + [User] + [Catalog] + [Orders]
Phase 4: All services extracted, monolith retired
```

## Communication Patterns

### Synchronous (REST/gRPC)

Best for: real-time queries, simple request/response

```python
# Catalog service queries User service synchronously
user = requests.get(f"https://user-service/users/{user_id}", timeout=0.5)
```

**Trade-off:** Creates temporal coupling. If User service is down, Catalog service degrades.

### Asynchronous (Event-driven)

Best for: background work, high throughput, decoupling

```python
# Order placed event → published to message bus
from kafka import KafkaProducer

producer = KafkaProducer(bootstrap_servers='kafka:9092')
producer.send('orders', json.dumps({"order_id": order.id, "user_id": user_id}))

# Payment service listens and processes independently
```

**Trade-off:** Eventual consistency. Debugging is harder because execution is not linear.

## Data Ownership and Consistency

### Database Per Service

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │  Order   │    │ Payment  │
│ Service  │    │ Service  │    │ Service  │
├──────────┤    ├──────────┤    ├──────────┤
│ Users DB │    │ Orders DB│    │Payment DB│
└──────────┘    └──────────┘    └──────────┘
```

**Never share a database between services.** It creates hidden coupling.

### Handling Cross-Service Data Needs

When a service needs data owned by another:

- **API Composition:** query both services and join in the client
- **CQRS + Read Models:** denormalize data via events into a local read-optimized store
- **Saga Pattern:** coordinate distributed transactions using compensating transactions

## Common Patterns

| Pattern | Problem It Solves |
|---------|-------------------|
| **API Gateway** | Single entry point, routing, auth, rate limiting |
| **Service Discovery** | Find service instances without hardcoding IPs |
| **Circuit Breaker** | Fail fast when downstream services are unhealthy |
| **Bulkhead** | Isolate thread pools to prevent cascading failure |
| **Saga** | Manage distributed transactions across services |
| **CQRS** | Separate read and write models for performance |

## Operational Challenges

| Challenge | Mitigation |
|-----------|------------|
| Distributed debugging | Distributed tracing (OpenTelemetry, Jaeger) |
| Deployment complexity | CI/CD pipelines per service, GitOps, feature flags |
| Configuration drift | Infrastructure as Code (Terraform, Pulumi) |
| Observability | Centralized logging (ELK/Loki), metrics (Prometheus), dashboards (Grafana) |
| Local development | Docker Compose, Tilt, or cloud dev environments |

## What Works

- **Own the full lifecycle** — teams build, run, and support their services (you build it, you run it)
- **Design for failure** — assume any dependency can fail; use [retries with backoff](/recipes/architecture/retry-backoff), [circuit breakers](/recipes/circuit-breaker-pattern-recipe), and graceful degradation
- **Automate everything** — if a deployment or rollback requires a runbook, automate it
- **Standardize observability** — every service must emit [logs](/recipes/observability/log-aggregation), [metrics](/recipes/observability/metrics-collection), and [traces](/recipes/observability/distributed-tracing) in a consistent format
- **Limit service dependencies** — avoid deep dependency chains; prefer fan-out over deep trees

## Common Mistakes

- Creating too many services too early — 5 services for 3 engineers is overkill
- Sharing databases between services — this is a distributed monolith. See [database design](/guides/databases/database-design-guide).
- Ignoring network latency — every sync call is a potential timeout or [retry storm](/recipes/architecture/retry-backoff)
- Underestimating operational cost — microservices need mature [DevOps practices](/guides/devops/docker-for-developers-guide)
- Building a custom RPC framework — use proven standards (gRPC, [HTTP/REST](/guides/api/rest-api-design-guide), or [message brokers](/guides/architecture/event-driven-architecture-guide))

## Frequently Asked Questions

### Should every startup start with microservices?

No. Start with a [monolith](/guides/architecture/monolith-to-microservices-migration-guide). Extract services when a module becomes painful to deploy, scale, or reason about independently. Premature decomposition is a common cause of engineering slowdown.

### How big should a microservice be?

Small enough to be rewritten in 2-4 weeks. If a service requires 6+ engineers and months to refactor, it is probably multiple services in disguise. The "micro" refers to team size and scope, not lines of code.

### What is the biggest risk of microservices?

Distributed complexity. [Debugging](/recipes/observability/distributed-tracing), testing, and reasoning about a system that spans dozens of services is considerably harder than a monolith. Without strong [observability](/recipes/observability/log-aggregation) and automation, the architecture will slow you down rather than speed you up.
