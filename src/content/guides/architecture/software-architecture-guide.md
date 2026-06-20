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
  - /patterns/design/mvc-pattern
  - /patterns/design/repository-pattern
  - /guides/api/rest-api-design-guide
  - /guides/devops/cicd-pipeline-guide
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

**Structure**: Single deployable unit containing all functionality.

**When to Choose**

- Small team (< 10 developers)
- Simple domain with low complexity
- Rapid prototyping phase
- Tight latency requirements within components

**Pros**: Simple deployment, easy testing, low operational overhead.
**Cons**: Tight coupling, harder to scale individual components, risk of cascading failures.

### Microservices Architecture

**Structure**: Independent services communicating over the network.

**When to Choose**

- Large team (> 20 developers)
- Complex domain with clear bounded contexts
- Need for independent scaling and deployment
- Multiple technology stacks required

**Pros**: Independent deployment, team autonomy, polyglot persistence.
**Cons**: Network latency, operational complexity, distributed debugging difficulty.

### Modular Monolith

**Structure**: Single deployable unit with well-defined internal modules.

**When to Choose**

- Mid-sized team (10–30 developers)
- Want to defer [microservices complexity](/guides/architecture/microservices-architecture-guide)
- Clear domain boundaries but shared infrastructure

**Pros**: Simpler operations than microservices, better structure than big-ball-of-mud.
**Cons**: Requires discipline to maintain module boundaries.

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

**Dependency Rule**: Inner layers must not depend on outer layers. See [SOLID principles](/guides/design/solid-principles-guide).

## Data Flow Patterns

### CQRS (Command Query Responsibility Segregation)

Separate read and write models.

**When to Use**

- Read and write workloads differ significantly
- Read models require denormalized / optimized data
- Event sourcing is already in use

**Trade-off**: Adds complexity; only use when reads and writes scale independently.

### Event-Driven Architecture

Components communicate via asynchronous events.

**When to Use**

- Loose coupling between services is required
- Actions can be processed asynchronously
- Audit trail of state changes is valuable

**Event Bus Options**: Apache Kafka, RabbitMQ, AWS SNS/SQS, NATS.

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

Document every significant technology choice with context, alternatives, and consequences. Use the [ADR Template](/docs/templates/adr-template).

## Scalability Patterns

### Horizontal Scaling

Add more instances behind a load balancer.

```
Client -> Load Balancer -> [Instance 1, Instance 2, Instance 3]
```

**Requirement**: State must be externalized (database, cache, object storage).

### Database Scaling

| Pattern | Use Case |
| ------- | -------- |
| Read replicas | Read-heavy workloads |
| [Sharding](/guides/databases/database-sharding-partitioning-guide) | Write-heavy, large datasets |
| [Connection pooling](/recipes/performance/connection-pooling) | Many application instances |
| [Caching](/recipes/performance/caching-strategies) (Redis) | Hot data, session storage |

## Communication Between Components

### Synchronous (REST / gRPC)

- **Pros**: Simple mental model, immediate feedback.
- **Cons**: Tight coupling, cascading failures possible.
- **Use for**: User-facing operations requiring immediate response.

### Asynchronous (Events / Message Queues)

- **Pros**: Decoupled, resilient, scalable.
- **Cons**: Eventual consistency, harder to debug.
- **Use for**: Background processing, notifications, analytics.

## Anti-Patterns

- **Big Ball of Mud**: No architecture, everything coupled
- **Premature Microservices**: Splitting before understanding boundaries
- **Golden Hammer**: Using favorite tech for every problem
- **Not Invented Here**: Rebuilding instead of buying/adopting
- **Over-Engineering**: Solving problems you don't have yet

## Best Practices

- **Start simple**: Begin with a [modular monolith](/guides/architecture/monolith-to-microservices-migration-guide); extract services when needed
- **Define bounded contexts**: Use [Domain-Driven Design](/guides/architecture/domain-driven-design-guide) to find natural boundaries
- **Design for observability**: Every component must expose [metrics, logs, traces](/recipes/observability/metrics-collection)
- **Automate everything**: [CI/CD](/guides/devops/cicd-pipeline-guide), [infrastructure](/guides/devops/infrastructure-as-code-guide), testing, security scanning
- **Document decisions**: ADRs for every significant architectural choice

## FAQ

**Q: When should I split from monolith to microservices?**
A: When teams are stepping on each other during deployments, or when independent scaling of components becomes critical. Most teams should start with a modular monolith.

**Q: How do I choose between REST and gRPC?**
A: REST for public APIs and browser clients; gRPC for internal service-to-service communication requiring performance and type safety.

**Q: Should I use an event bus or direct HTTP calls?**
A: Use HTTP for operations requiring immediate consistency and user feedback. Use events for background work, notifications, and when you need temporal decoupling.
