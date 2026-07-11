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

## Contract Testing with Pact

Consumer-driven contract testing verifies that the provider implementation matches what consumers expect. Here is a Pact test in JavaScript:

```javascript
const { Pact } = require("@pact-foundation/pact");
const path = require("path");

const provider = new Pact({
  consumer: "web-frontend",
  provider: "user-service",
  port: 8080,
  log: path.resolve(__dirname, "logs", "pact.log"),
  dir: path.resolve(__dirname, "pacts"),
});

describe("User Service Contract", () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  it("returns a user by ID", async () => {
    await provider.addInteraction({
      uponReceiving: "a request for user 123",
      withRequest: {
        method: "GET",
        path: "/users/123",
        headers: { Accept: "application/json" },
      },
      willRespondWith: {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          id: 123,
          name: "Alice",
          email: "alice@example.com",
        },
      },
    });

    const res = await fetch("http://localhost:8080/users/123", {
      headers: { Accept: "application/json" },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.id).toBe(123);
    expect(body.name).toBe("Alice");
  });
});
```

The generated pact file is published to a broker (Pact Broker or PactFlow). The provider then verifies all consumer pacts on every build, catching breaking changes before deployment.

## OpenAPI Specification Snippet

The contract should link to a machine-readable spec. Here is a minimal OpenAPI 3.1 fragment:

```yaml
openapi: 3.1.0
info:
  title: User Service API
  version: 2.1.0
  contact:
    name: Platform Team
    email: platform@example.com

paths:
  /users/{id}:
    get:
      summary: Get user by ID
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: User found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404":
          description: User not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

components:
  schemas:
    User:
      type: object
      required: [id, name, email]
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
          format: email
    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
        message:
          type: string
```

## gRPC Contract Example

For gRPC services, the proto file is the contract:

```protobuf
syntax = "proto3";

package users.v2;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc CreateUser(CreateUserRequest) returns (User);
}

message GetUserRequest {
  int32 id = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}
```

Use buf breaking to detect breaking changes between proto versions:

```bash
buf breaking --against ".git#branch=main"
# Fails if field numbers or types changed in a backward-incompatible way
```

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Internal services | Lightweight markdown | Store in shared repo, PR review for changes |
| External partners | Legal SLA appendix | May require formal signatures |
| Event-driven | Async schema registry | Use Avro / JSON Schema with compatibility rules |
| GraphQL | Schema-first contract | Use schema registry and diff detection tools |
| gRPC | Proto file as contract | Use buf for breaking change detection |

## What Works

1. Store contracts in version control and require PR review for changes
2. Link contracts to automated API tests and schema validation
3. Review SLAs quarterly and adjust based on observed metrics
4. Keep a changelog of contract versions with migration guides
5. Use schema registries (Confluent, AWS Glue) for event-driven contracts
6. Generate client SDKs from the contract to reduce integration friction
7. Tag contract versions in git so consumers can pin to a specific version

## Common Mistakes

1. Treating internal APIs as "always compatible" and skipping contracts
2. Changing field semantics without changing the field name
3. Not monitoring consumer usage before removing deprecated endpoints
4. Setting unrealistic SLAs that the provider cannot meet
5. Storing contracts in private wikis where consumers cannot find them
6. Not versioning the contract independently of the service deployment
7. Adding optional fields without documenting default values

## Frequently Asked Questions

### Who owns the contract when multiple consumers use the same API?

The provider owns the contract but must gather input from all consumers before breaking changes. Consider a consumer council for high-traffic APIs where representatives from each consumer team vote on contract changes.

### Should contracts cover internal implementation details?

No. Contracts should only specify the public interface (endpoints, schemas, SLAs). Internal database schemas or deployment details are out of scope. If consumers need to know implementation details, document them separately in a runbook.

### How do I enforce a contract in code?

Use Pact or Spring Cloud Contract for consumer-driven contract testing. These tools verify that the provider implementation matches the agreed contract on every build. For gRPC, use buf breaking to detect proto-level breaking changes.

### What is the difference between a contract and an API spec?

An API spec (OpenAPI, proto) defines the shape of requests and responses. A contract adds SLAs, versioning policies, breaking change procedures, and escalation paths. The spec is a subset of the contract.

### How do I handle backward-compatible additions?

Adding optional fields or new endpoints is backward-compatible. Document the addition in the changelog, update the spec, and notify consumers. No version bump is required for additive changes, but a minor version increment helps track evolution.

### Should I version the contract separately from the API?

Yes. The contract version tracks changes to the agreement (SLA updates, new endpoints). The API version tracks changes to the implementation. They can move independently: you might update the SLA without changing the API, or add a new endpoint without changing the SLA.

### What happens when the provider cannot meet the SLA?

The provider must notify all consumers, document the root cause, and file an incident report. If the SLA miss is recurring, renegotiate the SLA with consumers. Consumers may have penalty clauses in their contracts for SLA violations.
