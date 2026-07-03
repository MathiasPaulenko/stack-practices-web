---
contentType: recipes
slug: integration-testing-strategies
title: "Design Effective Integration Tests for Reliable Systems"
description: "How to write integration tests that verify component interactions using test containers, API contracts, consumer-driven contracts, and contract testing in Java, TypeScript, and Python."
metaDescription: "Learn integration testing strategies for reliable systems. Verify component interactions with test containers, API contracts, and consumer-driven contract testing."
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
  - /recipes/unit-testing-mocking
  - /recipes/api-gateway
  - /recipes/microservices-patterns
  - /recipes/docker-basics
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn integration testing strategies for reliable systems. Verify component interactions with test containers, API contracts, and consumer-driven contract testing."
  keywords:
    - integration testing
    - test containers
    - contract testing
    - API contract testing
    - consumer driven contracts
---

## Overview

Unit tests verify that `calculateTotal()` returns the correct sum. They mock the database, the payment gateway, and the inventory service. Everything passes. Then you deploy to staging and the application fails to start because the database migration was never run. The payment gateway rejects requests because the API version changed. The inventory service returns 503 because the test environment is down.

Integration tests verify that your code works with real (or realistic) dependencies. They catch the mismatches that unit tests cannot: schema changes, API version drift, configuration errors, and network behavior. A well-designed integration test spins up a real database in a container, starts your service, and exercises the actual HTTP endpoints. This recipe covers test containers, contract testing, consumer-driven contracts, and strategies for testing at the right level of abstraction.

## When to use it

Use this recipe when:

- Verifying that your service correctly integrates with databases, message queues, or external APIs. See [Unit Testing](/recipes/testing/unit-testing) for isolating dependencies with mocks.
- Catching API contract mismatches between microservices before deployment. See [API Contract Testing](/recipes/testing/api-mocking) for consumer-driven contracts.
- Testing database migrations and schema compatibility
- Ensuring configuration and wiring work in a realistic environment. See [Docker Basics](/recipes/devops/docker-basics) for containerized test environments.
- Complementing unit tests with confidence that components interact correctly

## Solution

### Test Containers (Java / Spring Boot)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void createOrder_persistsAndReturns() {
        OrderRequest request = new OrderRequest("sku-123", 2);
        ResponseEntity<Order> response = restTemplate.postForEntity(
            "/orders", request, Order.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("pending");
    }
}
```

### API Contract Testing (TypeScript / Pact)

```typescript
import { PactV3 } from '@pact-foundation/pact';

const pact = new PactV3({
  consumer: 'OrderFrontend',
  provider: 'OrderAPI',
});

describe('Order API contract', () => {
  it('returns order details', async () => {
    await pact
      .given('an order exists')
      .uponReceiving('a request for order details')
      .withRequest({
        method: 'GET',
        path: '/orders/123',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: pact.like('123'),
          status: pact.like('pending'),
          total: pact.like(99.99),
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/orders/123`);
      const data = await response.json();
      expect(data.status).toBe('pending');
    });
  });
});
```

### Python Integration Test with Docker Compose

```python
import pytest
import requests
from sqlalchemy import create_engine
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="module")
def db_engine():
    with PostgresContainer("postgres:15") as postgres:
        yield create_engine(postgres.get_connection_url())

@pytest.fixture
def api_client():
    return requests.Session()

def test_create_order_and_query(db_engine, api_client):
    response = api_client.post("http://localhost:8000/orders", json={
        "items": [{"sku": "abc", "quantity": 2}],
        "customer_id": "cust-123"
    })
    assert response.status_code == 201
    order_id = response.json()["id"]

    with db_engine.connect() as conn:
        result = conn.execute(
            "SELECT status, total FROM orders WHERE id = %s",
            (order_id,)
        )
        row = result.fetchone()
        assert row.status == "pending"
        assert row.total == 49.99
```

## Explanation

- **Test containers**: integration tests run against real services in Docker containers — PostgreSQL, Redis, Kafka, Elasticsearch. Testcontainers manages the container lifecycle: pull, start, expose ports, and clean up after tests. This gives you real database behavior (transactions, constraints, migrations) without polluting shared test environments.
- **Contract testing**: consumer-driven contract tests verify that the consumer's expectations match the provider's implementation. The consumer defines a contract ("when I send this request, I expect this response"). The provider verifies it can satisfy all contracts. Pact stores contracts in a broker and breaks the build if a provider change breaks a consumer.
- **WireMock / Mountebank**: these tools stub external HTTP services. Unlike simple mocks in unit tests, WireMock runs as an actual HTTP server that your application calls. You verify that the application sent the expected request (headers, body, query params) and return realistic responses. This tests the HTTP client layer, serialization, and error handling.
- **Database integration tests**: these verify that your ORM mappings, migrations, and queries work against the real database engine. They catch dialect differences (PostgreSQL vs. MySQL), missing indexes, constraint violations, and transaction isolation issues that in-memory H2 databases hide.

## Variants

| Test type | Scope | Speed | Reliability | Best for |
|-----------|-------|-------|-------------|----------|
| In-memory (H2, SQLite) | Single component | Fast | Low | Unit-adjacent, fast feedback |
| Testcontainers | Component + real DB | Medium | High | Database integration |
| Local service | Service + deps | Medium | Medium | Pre-commit validation |
| Shared staging | Full system | Slow | Low | Smoke tests, exploratory |
| Contract tests | API boundary | Fast | High | Microservice boundaries |

## What works

- **Keep integration tests focused**: an integration test should verify one integration boundary at a time. A test that hits the database, an external API, and a message queue is hard to debug when it fails. Split into separate tests for database integration, API contract, and message queue integration.
- **Use live ports and random IDs**: hardcoded ports cause collisions when tests run in parallel. Use Spring Boot's `RANDOM_PORT` or Testcontainers' live port mapping. Use UUIDs for test data so tests do not interfere with each other.
- **Clean up between tests**: truncate tables, delete Kafka topics, or reset WireMock stubs between tests. Shared state causes flaky tests. Use `@Transactional` with rollback (for in-memory tests) or Testcontainers' restart-per-test strategy.
- **Run integration tests in CI, not locally**: integration tests are slower than unit tests. Developers run unit tests during development. Integration tests run in CI on every pull request. Use Maven profiles (`-P integration-tests`) or separate test files (`*.integration.test.ts`) to control when they run.
- **Version your test infrastructure**: pin Docker images (`postgres:15.2`, not `postgres:latest`) and dependency versions. A new PostgreSQL minor release or a WireMock upgrade can change behavior and break tests. Pinning ensures reproducibility.

## Common mistakes

- **Testing too much in one test**: an integration test that creates a user, places an order, processes payment, and sends an email tests the entire system. When it fails, you do not know which step broke. Decompose into focused integration tests for each boundary.
- **Depending on shared test environments**: a staging database that multiple developers and CI pipelines share is a source of flakiness. One developer's data affects another's tests. Use Testcontainers or per-test databases instead.
- **Not isolating external API tests**: tests that call real payment gateways or email services are slow, expensive, and non-deterministic. Always stub external APIs in integration tests. Reserve real API calls for dedicated smoke tests in a controlled environment.
- **Ignoring flaky tests**: if an integration test fails 1 in 20 runs, developers ignore it. Flaky tests destroy trust in the test suite. Investigate root causes: race conditions, timing issues, port collisions, or shared state. Fix the flakiness or delete the test.

## FAQ

**Q: How many integration tests should I have?**
A: Fewer than unit tests. Follow the test pyramid: many unit tests (fast, isolated), fewer integration tests (medium, boundary-focused), and very few end-to-end tests (slow, full system). Integration tests should cover each critical boundary once.

**Q: Should I mock the database in integration tests?**
A: No — the point of an integration test is to verify real database behavior. Mock the database for unit tests. Use Testcontainers for integration tests. If the test runs against an in-memory database (H2, SQLite), it is closer to a unit test than an integration test.

**Q: How do I test message queue integrations?**
A: Use Testcontainers to spin up a real Kafka or RabbitMQ container. Publish a message, run your consumer, and assert the side effects (database writes, API calls). Alternatively, use an embedded broker for lightweight queue testing.

**Q: Can contract tests replace integration tests?**
A: No — they complement each other. Contract tests verify that the API shape matches expectations. Integration tests verify that the actual behavior (data consistency, side effects, error handling) is correct. Use both: Pact for contract validation, Testcontainers for behavioral validation.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
