---




contentType: guides
slug: software-architecture-guide
title: "Software Architecture Guide"
description: "A guide to designing software architecture: monoliths vs microservices, layered architecture, data flow, and technology selection criteria."
metaDescription: "Learn software architecture fundamentals: monolith vs microservices, layered architecture, data flow patterns, CQRS, event-driven design, and technology selection."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - architecture
  - cqrs
  - event-driven
  - microservices
  - monolith
  - scalability
relatedResources:
  - /patterns/mvc-pattern
  - /patterns/repository-pattern
  - /guides/rest-api-design-guide
  - /guides/cicd-pipeline-guide
  - /recipes/microservices-communication
  - /recipes/service-discovery
  - /guides/domain-driven-design-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn software architecture fundamentals: monolith vs microservices, layered architecture, data flow patterns, CQRS, event-driven design, and technology selection."
  keywords:
    - software architecture
    - monolith vs microservices
    - layered architecture
    - cqrs pattern
    - event driven architecture
    - system design




---

## Overview

Software architecture defines the structure of a system, the relationships between components, and the principles guiding design and evolution. Good architecture enables teams to move fast without breaking things.

## When to Apply

- Starting a new project or major rewrite
- Scaling a system that is hitting performance limits
- Organizing a large team around code ownership
- Migrating from legacy to modern infrastructure

## Architectural Styles

### Monolithic Architecture

Structure: Single deployable unit containing all functionality.

#### When to Choose

- Small team (< 10 developers)
- Simple domain with low complexity
- Rapid prototyping phase
- Tight latency requirements within components

Pros: Simple deployment, easy testing, low operational overhead.
Cons: Tight coupling, harder to scale individual components, risk of cascading failures.

### Microservices Architecture

Structure: Independent services communicating over the network.

#### When to Choose

- Large team (> 20 developers)
- Complex domain with clear bounded contexts
- Need for independent scaling and deployment
- Multiple technology stacks required

Pros: Independent deployment, team autonomy, polyglot persistence.
Cons: Network latency, operational complexity, distributed debugging difficulty.

### Modular Monolith

Structure: Single deployable unit with well-defined internal modules.

#### When to Choose

- Mid-sized team (10–30 developers)
- Want to defer [microservices complexity](/guides/architecture/microservices-architecture-guide)
- Clear domain boundaries but shared infrastructure

Pros: Simpler operations than microservices, better structure than big-ball-of-mud.
Cons: Requires discipline to maintain module boundaries.

## Layered Architecture

### Classic 3-Layer Model

```
┌──────────────────────────────┐
│ Presentation Layer           │
│ - Controllers, Views, DTOs   │
├──────────────────────────────┤
│ Business Logic Layer         │
│ - Services, Domain Models    │
├──────────────────────────────┤
│ Data Access Layer            │
│ - Repositories, ORM, Queries │
└──────────────────────────────┘
```

Dependency Rule: Inner layers must not depend on outer layers. See [SOLID principles](/guides/design/solid-principles-guide).

## Data Flow Patterns

### CQRS (Command Query Responsibility Segregation)

Separate read and write models.

#### When to Use

- Read and write workloads differ considerably
- Read models require denormalized / optimized data
- Event sourcing is already in use

Trade-off: Adds complexity; only use when reads and writes scale independently.

### Event-Driven Architecture

Components communicate via asynchronous events.

#### When to Use

- Loose coupling between services is required
- Actions can be processed asynchronously
- Audit trail of state changes is valuable

Event Bus Options: Apache Kafka, RabbitMQ, AWS SNS/SQS, NATS.

## Technology Selection Framework

### Criteria Matrix

| Criterion | Weight | Option A | Option B | Option C |
| --------- | ------ | -------- | -------- | -------- |
| Team expertise | High | 5 | 3 | 4 |
| Community support | Medium | 5 | 4 | 3 |
| Performance | Medium | 3 | 5 | 4 |
| Operational cost | High | 4 | 2 | 5 |
| **Weighted Score** | | **4.2** | **3.3** | **4.1** |

### Decision Log

Document every major technology choice with context, alternatives, and consequences. Use the [ADR Template](/docs/templates/adr-template).

## Scalability Patterns

### Horizontal Scaling

Add more instances behind a load balancer.

```
Client -> Load Balancer -> [Instance 1, Instance 2, Instance 3]
```

Requirement: State must be externalized (database, cache, object storage).

### Database Scaling

| Pattern | Use Case |
| ------- | -------- |
| Read replicas | Read-heavy workloads |
| [Sharding](/guides/databases/database-sharding-partitioning-guide) | Write-heavy, large datasets |
| [Connection pooling](/recipes/performance/connection-pooling) | Many application instances |
| [Caching](/recipes/performance/caching-strategies) (Redis) | Hot data, session storage |

## Communication Between Components

### Synchronous (REST / gRPC)

- Pros: Simple mental model, immediate feedback.
- Cons: Tight coupling, cascading failures possible.
- Use for: User-facing operations requiring immediate response.

### Asynchronous (Events / Message Queues)

- Pros: Decoupled, resilient, scalable.
- Cons: Eventual consistency, harder to debug.
- Use for: Background processing, notifications, analytics.

## Anti-Patterns

- Big Ball of Mud: No architecture, everything coupled
- Premature Microservices: Splitting before understanding boundaries
- Golden Hammer: Using favorite tech for every problem
- Not Invented Here: Rebuilding instead of buying/adopting
- Over-Engineering: Solving problems you don't have yet

## What Works

- Start simple: Begin with a [modular monolith](/guides/architecture/monolith-to-microservices-migration-guide); extract services when needed
- Define bounded contexts: Use [Domain-Driven Design](/guides/architecture/domain-driven-design-guide) to find natural boundaries
- Design for observability: Every component must expose [metrics, logs, traces](/recipes/observability/metrics-collection)
- Automate everything: [CI/CD](/guides/devops/cicd-pipeline-guide), [infrastructure](/guides/devops/infrastructure-as-code-guide), testing, security scanning
- Document decisions: ADRs for every major architectural choice

## FAQ

Q: When should I split from monolith to microservices?
A: When teams are stepping on each other during deployments, or when independent scaling of components becomes critical. Most teams should start with a modular monolith.

Q: How do I choose between REST and gRPC?
A: REST for public APIs and browser clients; gRPC for internal service-to-service communication requiring performance and type safety.

Q: Should I use an event bus or direct HTTP calls?
A: Use HTTP for operations requiring immediate consistency and user feedback. Use events for background work, notifications, and when you need temporal decoupling.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: Architecture Selection for E-commerce

```text
Project: E-commerce platform (Python + Django)
Team: 8 developers (growing to 15 in 12 months)
Volume: 50k active users, 10k orders/day
Domain: Catalog, Orders, Payments, Users, Notifications

Phase 1: Modular monolith (month 0-6)
  - Django with modules separated by bounded context
  - PostgreSQL schema per module (no FKs across modules)
  - Communication via internal services (no direct DB access)
  - Deploy: 1 binary, CI/CD with GitHub Actions

  Structure:
    shop/
      modules/
        catalog/
          domain/          # Product, Category, SKU
          application/     # CreateProductService, SearchService
          infrastructure/  # ProductRepository (Django ORM)
          api/             # CatalogApi (public interface)
          views/           # HTTP views
        orders/
          domain/          # Order, OrderLine, OrderStatus
          application/     # PlaceOrderService, CancelOrderService
          infrastructure/  # OrderRepository
          api/             # OrdersApi
          views/
        payments/
          domain/          # Payment, Transaction
          application/     # ProcessPaymentService
          infrastructure/  # StripeGateway, PaymentRepository
          api/
          views/
      shared/
        kernel/            # BaseEntity, Money, DomainEvent

  Boundary rules:
    - catalog does NOT import from orders or payments
    - orders imports CatalogApi (interface), not implementation
    - payments imports OrdersApi (interface)
    - Verified with pylint-import-checker in CI

  Testing:
    - Unit per module: < 10ms (no DB)
    - Integration per module: < 200ms (in-memory SQLite)
    - Cross-module: in-memory fakes of other modules
    - E2E: Django test client, < 2s per test

Phase 2: Extract notifications (month 6-9)
  - Notifications is the module with lowest coupling
  - Extract to independent microservice (Go + RabbitMQ)
  - Replace in-process NotificationApi with HTTP client
  - Migrate data with CDC (Debezium -> Kafka -> new DB)
  - Gradual traffic shift: 5% -> 25% -> 50% -> 100%

Phase 3: Extract catalog (month 12-18)
  - Catalog needs independent scaling (search-intensive)
  - Extract to microservice (Python + Elasticsearch)
  - Migrate from PostgreSQL to Elasticsearch for search
  - Keep PostgreSQL for writes (CQRS)

Extraction decision matrix:
  | Module | Risk | Value | Effort | Priority |
  |--------|------|-------|--------|----------|
  | Notifications | Low | Medium | 4 wk | 1 |
  | Catalog | Medium | High | 8 wk | 2 |
  | Payments | High | High | 12 wk | 3 |
  | Orders | High | Critical | 16 wk | 4 |
  | Users | Medium | High | 8 wk | 5 |

Lessons learned:
  - Modular monolith enabled mechanical extraction (not architectural)
  - Cross-module tests with fakes caught breaking changes
  - Gradual traffic shift gave business confidence
  - CDC avoided dual-write and potential inconsistencies
```

### How do I document architectural decisions?

Use ADRs (Architecture Decision Records). Each ADR documents: context, decision, alternatives considered, consequences. Store ADRs in the repository alongside code (docs/adr/ folder). Use sequential numbering (ADR-001, ADR-002). An ADR is never deleted or edited; if the decision changes, create a new ADR that supersedes it. This creates an auditable history of decisions and their reasoning.
