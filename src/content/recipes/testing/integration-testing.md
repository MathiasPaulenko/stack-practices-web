---
contentType: recipes
slug: integration-testing
title: "Write Integration Tests"
description: "How to test multiple components working together using real databases, HTTP clients, and message queues in Python, JavaScript, and Java."
metaDescription: "Learn integration testing with real dependencies. Test API endpoints, database layers, and service interactions in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - integration-testing
  - pytest
relatedResources:
  - /recipes/unit-testing
  - /recipes/handle-errors
  - /recipes/call-rest-api
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn integration testing with real dependencies. Test API endpoints, database layers, and service interactions in Python, JavaScript, and Java."
  keywords:
    - integration testing
    - api testing
    - database testing
    - pytest
    - jest integration
    - junit integration
    - testcontainers
    - end-to-end testing
---

## Overview

Unit tests verify individual functions in isolation, but real applications are assemblies of databases, HTTP services, message queues, and file systems working together. Integration tests verify that these components connect correctly — that a repository can actually read from a database, that an API client handles real network behavior, and that events propagate through message brokers.

Integration tests are slower and more complex than unit tests, but they catch a different class of bugs: connection string errors, schema mismatches, serialization problems, and network timeout handling. A healthy test suite uses both unit and integration tests at different levels of the testing pyramid.

## When to Use

Use this recipe when:

- Verifying database repositories and migrations work correctly
- Testing HTTP API endpoints with real request/response cycles
- Confirming message queue producers and consumers integrate properly
- Validating third-party SDK or API client behavior
- Checking that configuration and environment setup are correct
- Running pre-deployment smoke tests in CI/CD pipelines

## Solution

### Python (pytest + Testcontainers)

```python
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine, text

@pytest.fixture(scope="module")
def db_engine():
    with PostgresContainer("postgres:16") as postgres:
        engine = create_engine(postgres.get_connection_url())
        yield engine

def test_user_repository(db_engine):
    with db_engine.connect() as conn:
        conn.execute(text("CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)"))
        conn.execute(
            text("INSERT INTO users (name) VALUES (:name)"),
            {"name": "Alice"}
        )
        conn.commit()

        result = conn.execute(text("SELECT * FROM users"))
        users = result.fetchall()
        assert len(users) == 1
        assert users[0][1] == "Alice"
```

### JavaScript (Jest + Supertest)

```javascript
const request = require('supertest');
const app = require('./app'); // Express app

describe('POST /api/users', () => {
  afterAll(async () => {
    await app.db.close(); // close test database
  });

  test('creates a user and returns 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('alice@example.com');
  });

  test('returns 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'not-an-email' });

    expect(response.status).toBe(400);
  });
});
```

### Java (JUnit + Testcontainers)

```java
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
public class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16");

    @Test
    void shouldInsertAndRetrieveUser() {
        UserRepository repo = new UserRepository(
            postgres.getJdbcUrl(),
            postgres.getUsername(),
            postgres.getPassword()
        );

        User user = new User("Alice", "alice@example.com");
        repo.save(user);

        User found = repo.findByEmail("alice@example.com");
        assertEquals("Alice", found.getName());
    }
}
```

## Explanation

- **Testcontainers**: Spins up real databases, message brokers, and other services in Docker containers for the duration of your tests. This gives you genuine integration testing without polluting your development database.
- **Supertest**: For Node.js Express applications, supertest sends real HTTP requests to your app without binding to a network port. You test the full request lifecycle including middleware, routing, and serialization.
- **Spring Boot Test**: In Java, `@SpringBootTest(webEnvironment = RANDOM_PORT)` starts the entire application context on a random port, allowing you to test `@RestController` endpoints with `TestRestTemplate` or `WebTestClient`.

## Variants

| Tool | Language | Dependency Type | Best For |
|------|----------|-------------------|----------|
| Testcontainers | Java/Python/Go | Real Docker containers | Databases, Kafka, Redis |
| Supertest | JavaScript | In-process HTTP | Express/Fastify APIs |
| pytest-django | Python | Real test database | Django ORM integration |
| Spring Boot Test | Java | Full application context | Spring microservices |

## Best Practices

- **Use real dependencies, not mocks**: the whole point of integration testing is verifying real interactions. Mock only external systems you do not control (payment gateways, third-party APIs).
- **Clean up between tests**: truncate tables, clear queues, or recreate containers so test order does not affect results.
- **Keep integration tests in a separate directory**: `tests/integration/` or `src/test/integration/` makes it clear these are slower and more comprehensive.
- **Run them in CI, not on every file save**: configure your test runner with separate commands (`npm run test:unit` vs `npm run test:integration`).
- **Use random ports and isolated databases**: never run integration tests against your development or production database.
- **Limit scope**: test one integration point per test. A test that exercises the database, HTTP layer, and message queue is hard to debug when it fails.

## Common Mistakes

- **Running integration tests against production databases**: this can corrupt real data and violate compliance policies.
- **Not cleaning up after tests**: leftover data causes flaky tests that pass in isolation but fail in a suite.
- **Mocking everything in an integration test**: if you mock the database and HTTP layer, you are writing an elaborate unit test, not an integration test.
- **Using hard-coded ports**: port conflicts cause flaky tests. Always use port 0 or dynamic allocation.
- **Testing too much in one test**: when a broad integration test fails, you spend more time debugging which layer broke than writing the fix.

## Frequently Asked Questions

**Q: How are integration tests different from end-to-end tests?**
A: Integration tests verify a specific pair or small group of components. E2E tests exercise the entire application through the UI or public API, often using tools like Selenium, Playwright, or Cypress.

**Q: Should I use an in-memory database like H2 or SQLite for integration tests?**
A: Only if your production database is also SQLite. In-memory databases have different behavior from PostgreSQL or MySQL (transaction isolation, type coercion, JSON support). Testcontainers with the real database engine is the safer choice.

**Q: How do I keep integration tests fast?**
A: Reuse containers across tests (Testcontainers supports this), parallelize test execution, and limit the scope of each test. A well-tuned integration suite should run in under 2 minutes.

**Q: Do I need integration tests if I have 100% unit test coverage?**
A: Yes. Unit tests with mocked dependencies cannot catch wiring errors, schema mismatches, or real network timeout behavior. Both types complement each other.

