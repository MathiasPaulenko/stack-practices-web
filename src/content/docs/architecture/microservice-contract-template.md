---
contentType: docs
slug: microservice-contract-template
title: "Microservice Contract Template"
description: "A template for defining service contracts and API agreements between microservices."
metaDescription: "Use this microservice contract template to document API agreements, SLAs, versioning policies, and breaking change procedures between services."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - microservices
  - api
  - contract
  - template
relatedResources:
  - /docs/adr-template
  - /docs/database-schema-documentation-template
  - /docs/engineering-handbook-template
  - /guides/rest-api-design-guide
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this microservice contract template to document API agreements, SLAs, versioning policies, and breaking change procedures between services."
  keywords:
    - architecture
    - microservices
    - api
    - contract
    - template
---
## Overview

Microservices depend on explicit contracts to communicate reliably. Without a written agreement, teams make incompatible changes that break consumers at runtime. This template documents API boundaries, SLAs, versioning rules, and breaking change procedures between services.

## When to Use

Use this resource when:
- A new service needs to expose an API to other internal services
- Two teams agree on an integration point and want to formalize expectations
- Reviewing or renegotiating an existing service boundary

## Solution

```markdown
# Microservice Contract: `<Consumer>` ↔ `<Provider>`

## 1. Parties

| Role | Service | Team | Contact |
|------|---------|------|---------|
| Provider | `service-name` | `@team` | `email / slack` |
| Consumer | `consumer-name` | `@team` | `email / slack` |

## 2. API Specification

- **Protocol**: REST / gRPC / GraphQL / Message Queue
- **Base URL / Topic**: `https://api.internal/...` or `kafka://events/...`
- **OpenAPI / Schema Link**: `link-to-spec`
- **Authentication**: mTLS / JWT / API Key / None

## 3. Endpoints / Operations

| Name | Method / Operation | Path / Topic | Purpose |
|------|-------------------|--------------|---------|
| GetUser | GET | `/users/{id}` | Retrieve user profile |
| CreateOrder | POST | `/orders` | Submit a new order |
| OrderCreated | Event | `orders.created` | Notify downstream systems |

## 4. Service Level Agreement

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% | Monthly uptime |
| p95 Latency | < 200ms | Per endpoint |
| Error Rate | < 0.1% | 5xx / timeout ratio |
| RPO | 1 hour | Max acceptable data loss |
| RTO | 30 minutes | Max recovery time |

## 5. Versioning Policy

- **Current Version**: `v2`
- **Strategy**: URL path (`/v1/`, `/v2/`) / Header / Content negotiation
- **Deprecation Window**: 6 months after new version release
- **Sunset Notice**: 30 days before removal

## 6. Breaking Changes

A change is breaking if it:
- Removes a field or endpoint
- Changes field type or format
- Tightens validation rules
- Changes error response structure

**Procedure**:
1. Notify consumers 30 days in advance
2. Release new version alongside old version
3. Monitor old version usage
4. Remove old version after deprecation window

## 7. Error Handling

| Error Code | HTTP / gRPC | Meaning | Retryable |
|------------|-------------|---------|-----------|
| 400 / INVALID_ARGUMENT | Client error | No |
| 429 / RESOURCE_EXHAUSTED | Rate limited | Yes (with backoff) |
| 500 / INTERNAL | Server error | Yes (with backoff) |

## 8. Escalation

- **P1 (outage)**: Page on-call within 15 minutes
- **P2 (degraded)**: Slack channel alert, respond within 1 hour
- **P3 (question)**: Open a ticket, respond within 1 business day
```

## Explanation

The contract acts as a **shared source of truth** between provider and consumer teams. It removes ambiguity about who owns what, how fast things should respond, and what happens when things break. The versioning policy prevents surprise removals. The SLA sets measurable expectations. The breaking change procedure gives consumers time to migrate.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Internal services | Lightweight markdown | Store in shared repo, PR review for changes |
| External partners | Legal SLA appendix | May require formal signatures |
| Event-driven | Async schema registry | Use Avro / JSON Schema with compatibility rules |

## Best Practices

1. Store contracts in version control and require PR review for changes
2. Link contracts to automated API tests and schema validation
3. Review SLAs quarterly and adjust based on observed metrics
4. Keep a changelog of contract versions with migration guides
5. Use schema registries (Confluent, AWS Glue) for event-driven contracts

## Common Mistakes

1. Treating internal APIs as "always compatible" and skipping contracts
2. Changing field semantics without changing the field name
3. Not monitoring consumer usage before removing deprecated endpoints
4. Setting unrealistic SLAs that the provider cannot meet
5. Storing contracts in private wikis where consumers cannot find them

## Frequently Asked Questions

### Who owns the contract when multiple consumers use the same API?

The provider owns the contract but must gather input from all consumers before breaking changes. Consider a consumer council for high-traffic APIs.

### Should contracts cover internal implementation details?

No. Contracts should only specify the public interface (endpoints, schemas, SLAs). Internal database schemas or deployment details are out of scope.

### How do I enforce a contract in code?

Use Pact or Spring Cloud Contract for consumer-driven contract testing. These tools verify that the provider implementation matches the agreed contract on every build.
