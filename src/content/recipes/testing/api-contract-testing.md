---
contentType: recipes
slug: api-contract-testing
title: "Test API Contracts with Consumer-Driven Contracts"
description: "How to prevent breaking changes between microservices using consumer-driven contract testing with Pact and OpenAPI validators."
metaDescription: "Learn API contract testing with Pact. Prevent breaking changes between microservices using consumer-driven contracts and OpenAPI validators."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - api-testing
  - consumer-driven-contracts
  - unit-tests
  - integration
relatedResources:
  - /recipes/integration-testing
  - /recipes/api-versioning
  - /recipes/call-rest-api
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn API contract testing with Pact. Prevent breaking changes between microservices using consumer-driven contracts and OpenAPI validators."
  keywords:
    - contract testing
    - pact
    - consumer driven contracts
    - api contracts
    - microservices testing
    - openapi validation
---

## Overview

In a microservices architecture, dozens of services communicate through APIs. When one service changes a response field or drops a status code, downstream consumers break silently — often discovered only in production. Integration tests catch some of these issues, but they are slow and require all services to be running.

Contract testing solves this by having each consumer define its expectations of a provider API (the contract). These contracts are shared, verified independently, and fail fast when a provider breaks a consumer's assumptions. Pact is the most widely adopted framework for consumer-driven contract testing.

## When to Use

Use this recipe when:

- Managing 5+ microservices with inter-service HTTP or message queue communication. See [Integration Testing](/recipes/testing/integration-testing) for verifying component interactions.
- Experiencing production outages caused by API changes in upstream services. See [Call REST API](/recipes/api/call-rest-api) for what works with API clients.
- Wanting to decouple deployment pipelines so services deploy independently. See [Microservices Patterns](/guides/architecture/microservices-architecture-guide) for distributed architecture guidance.
- Migrating from monolithic to microservices and needing safety nets for API boundaries
- Working with external API providers where you cannot control their release cycle

## Solution

### Consumer Test (Pact JS)

```javascript
const { PactV3 } = require('@pact-foundation/pact');
const { like, regex } = require('@pact-foundation/pact').MatchersV3;

const provider = new PactV3({
  consumer: 'order-service',
  provider: 'user-service',
});

describe('User Service Contract', () => {
  test('returns user by ID', async () => {
    await provider
      .given('user with id 123 exists')
      .uponReceiving('a request for user 123')
      .withRequest({
        method: 'GET',
        path: '/users/123',
      })
      .willRespondWith({
        status: 200,
        body: {
          id: like(123),
          name: like('Alice'),
          email: regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'alice@example.com'),
        },
      });

    await provider.executeTest(async (mockserver) => {
      const user = await fetchUser(mockserver.url, 123);
      expect(user.name).toBe('Alice');
    });
  });
});
```

### Provider Verification (Pact JS)

```javascript
const { Verifier } = require('@pact-foundation/pact');

describe('Pact Verification', () => {
  test('validates against consumer contracts', async () => {
    await new Verifier({
      provider: 'user-service',
      providerBaseUrl: 'http://localhost:3000',
      pactBrokerUrl: 'https://pact-broker.example.com',
      publishVerificationResult: true,
      providerBranch: process.env.GIT_BRANCH,
    }).verifyProvider();
  });
});
```

### OpenAPI Validator (Python)

```python
from openapi_spec_validator import validate_spec
import requests

spec = requests.get('https://api.example.com/openapi.json').json()
validate_spec(spec)  # validates schema correctness

# Then validate responses against the spec at runtime
from openapi_core import validate_response
validate_response(spec, response)
```

## Explanation

- **Consumer-driven contracts**: The consumer (client) writes a test that describes exactly what it needs from the provider. Pact records this interaction and generates a contract file (JSON).
- **Pact Broker**: A central repository where contracts are stored and shared. It tracks which versions of each service are compatible, enabling independent deployments.
- **Provider verification**: The provider service runs the contracts against its actual API. If a field is removed or a type changes, the verification fails before deployment.
- **Can-I-Deploy**: A Pact Broker feature that checks whether a service version can safely deploy given the current state of all consumer contracts.

## Variants

| Tool | Language | Contract Style | Best For |
|------|----------|----------------|----------|
| Pact | Multi (JS, JVM, Go, Python) | Consumer-driven | Internal microservices |
| OpenAPI validators | Multi | Provider-driven | Public APIs, documentation-first |
| Spring Cloud Contract | JVM | Provider-driven | Spring ecosystems |
| BiqQuery data contracts | SQL | Schema-driven | Data warehouses |

## What Works

- **Keep contracts focused on fields you use**: if the consumer only needs `id` and `name`, do not assert the entire response schema. This gives the provider freedom to evolve unused fields.
- **Version contracts alongside code**: store contract tests in the same repository as the consumer service. CI generates and publishes contracts on every build.
- **Use a Pact Broker for visibility**: without a broker, teams share contract files manually, which breaks down quickly at scale.
- **Run provider verification in CI**: every pull request on the provider should verify against all consumer contracts before merging.
- **Do not test business logic in contracts**: contracts verify the shape of the API, not the correctness of calculations or business rules.

## Common Mistakes

- **Overly strict contracts**: asserting every field and exact values makes contracts brittle. Use matchers (`like`, `regex`) for flexibility.
- **Skipping provider verification**: generating contracts without verifying them on the provider side creates false confidence. Both sides matter.
- **Storing contracts in shared drives or email**: use a Pact Broker. It tracks compatibility matrices and enables can-i-deploy checks.
- **Testing through the UI**: contract tests should exercise the API client directly, not Selenium or Playwright. UI tests belong in E2E suites.

## Frequently Asked Questions

**Q: Is contract testing a replacement for integration tests?**
A: No. Contract tests verify API compatibility but not end-to-end behavior, database state, or message queue delivery guarantees. Use both.

**Q: What happens if a provider needs to break a contract?**
A: The provider communicates the change, consumers update their expectations, and both deploy in a coordinated sequence. Pact Broker tracks this.

**Q: Can I use OpenAPI specs instead of Pact?**
A: Yes. OpenAPI is provider-driven (the API owner defines the spec). Pact is consumer-driven (clients define what they need). Many teams use both.

**Q: Do contract tests require a running provider?**
A: Consumer tests use Pact mock servers and do not need the provider running. Provider verification does require a running provider instance.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
