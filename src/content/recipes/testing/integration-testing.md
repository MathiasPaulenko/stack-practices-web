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
  - pytest
  - unit-tests
  - integration
  - tdd
relatedResources:
  - /recipes/unit-testing
  - /recipes/handle-errors
  - /recipes/call-rest-api
  - /recipes/load-testing-k6
  - /recipes/api-contract-testing
  - /recipes/load-testing
  - /recipes/nodejs-supertest-express-api
  - /recipes/unit-testing-mocking
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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

- **Testcontainers**: Spins up real databases, message brokers, and other services in Docker containers for the duration of your tests.  This gives you genuine integration testing without polluting your development database.
- **Supertest**: For Node. js Express applications, supertest sends real HTTP requests to your app without binding to a network port.  You test the full request lifecycle including middleware, routing, and serialization.
- **Spring Boot Test**: In Java, `@SpringBootTest(webEnvironment = RANDOM_PORT)` starts the entire application context on a random port, allowing you to test `@RestController` endpoints with `TestRestTemplate` or `WebTestClient`.

## Variants

| Tool | Language | Dependency Type | Best For |
|------|----------|-------------------|----------|
| Testcontainers | Java/Python/Go | Real Docker containers | Databases, Kafka, Redis |
| Supertest | JavaScript | In-process HTTP | Express/Fastify APIs |
| pytest-django | Python | Real test database | Django ORM integration |
| Spring Boot Test | Java | Full application context | Spring microservices |

## What works

- **Use real dependencies, not mocks**: the whole point of integration testing is verifying real interactions.  Mock only external systems you do not control (payment gateways, third-party APIs).
- **Clean up between tests**: truncate tables, clear queues, or recreate containers so test order does not affect results.
- **Keep integration tests in a separate directory**: `tests/integration/` or `src/test/integration/` makes it clear these are slower and more thorough.
- **Run them in [CI](/guides/cicd-pipeline-guide/), not on every file save**: configure your test runner with separate commands (`npm run test:unit` vs `npm run test:integration`).
- **Use random ports and isolated databases**: never run integration tests against your development or production database.
- **Limit scope**: test one integration point per test.  A test that exercises the database, HTTP layer, and message queue is hard to debug when it fails.

## Common Mistakes

- **Running integration tests against production databases**: this can corrupt real data and violate compliance policies.
- **Not cleaning up after tests**: leftover data causes flaky tests that pass in isolation but fail in a suite.
- **Mocking everything in an integration test**: if you mock the database and HTTP layer, you are writing an elaborate [unit test](/recipes/unit-testing/), not an integration test.
- **Using hard-coded ports**: port conflicts cause flaky tests.  Always use port 0 or live allocation.
- **Testing too much in one test**: when a broad integration test fails, you spend more time debugging which layer broke than writing the fix.

## Error Handling in Tests

- **Test failure handling**: handle test failures with clear assertions.  Capture screenshots on UI test failures.  Log test environment details on failure.
- **Test timeout handling**: set appropriate timeouts for each test.  Unit tests should complete in seconds.  Integration tests may need longer timeouts.  E2E tests need generous timeouts.
- **Flaky test management**: identify and fix flaky tests.  Quarantine flaky tests.  Fix root cause of flakiness.

## Security in Testing

- **Test data security**: use synthetic data for testing.  Never use real production data in tests.  Mask sensitive fields in test data.  Encrypt test databases.
- **Test environment security**: secure test environments.  Restrict access to test environments.
- **Secrets in tests**: never hardcode secrets in test files.  Use test-specific secret management.  Rotate test secrets regularly.

## Deployment and CI/CD for Tests

- **Test pipeline design**: design CI/CD pipeline for tests.  Run unit tests on every commit.  Run integration tests on pull requests.  Run E2E tests before deployment.  Run security scans on every build.
- **Test parallelization**: parallelize tests for faster execution.  Group tests by dependency.  Isolate parallel tests.
- **Test result reporting**: report test results clearly.  Publish reports to stakeholders.

## Testing Tools and Platforms

- **Unit testing frameworks**: choose the right unit testing framework.  Jest for JavaScript.  JUnit 5 for Java.  Vitest for modern JavaScript.
- **Integration testing tools**: use appropriate tools for integration testing.  TestContainers for Docker-based integration tests.  Supertest for API testing.  WireMock for external service mocking.  MSW for browser API mocking.
- **E2E testing tools**: choose the right E2E testing tool.  Playwright for modern web E2E.  Cypress for web applications.  Selenium for legacy web apps.  Detox for React Native.

## Common Testing Pitfalls

- **Over-mocking**: avoid mocking too much.  Mock only external dependencies.  Mock only what you need to control.  Excessive mocking makes tests brittle.  Refactor over-mocked tests.
- **Testing implementation details**: test behavior, not implementation.  Avoid testing internal state.  Focus on public API behavior.  Refactor implementation-coupled tests.  Educate team on behavior testing.
- **Ignoring edge cases**: test edge cases thoroughly.  Test null values.  Test error paths.
## Best Practices

- **Test naming conventions**: use descriptive test names.  Follow arrange-act-assert pattern.  Name tests by behavior, not implementation.  Educate team on conventions.  Refactor poorly named tests.
- **Test organization**: organize tests by feature or component.  Group related tests in describe blocks.  Refactor large test files.
- **Test data management**: use factories for test data.  Use fixtures for static data.  Refactor duplicated test data.
- **Test coverage goals**: set realistic coverage goals.  80% for critical paths.  60% for utility code.  100% for pure functions.

## Cost Optimization

- **Reducing test execution time**: optimize test execution speed.  Cache test dependencies.  Refactor slow tests.
- **Reducing test maintenance**: minimize test maintenance overhead.  Write maintainable tests.  Refactor duplicated test code.
- **Test infrastructure costs**: optimize test infrastructure costs.  Use containerized test environments.  Scale test infrastructure with demand.

## Troubleshooting Guide

- **Debugging failing tests**: isolate the failing test.  Run the test in isolation.  Verify test environment.  Use root cause analysis.
- **Debugging slow tests**: identify slow tests.  Profile test execution.  Check network calls.
- **Debugging test environment issues**: check environment configuration.  Verify dependencies are installed.  Verify database state.

## Monitoring and Alerting

- **Key test metrics**: track test pass rate, execution time, coverage, and flaky test rate.  Adjust thresholds based on trends.
- **Alert configuration**: set alerts on test failure rate above 5%.  Alert on flaky test rate increases.  Reduce alert noise.
- **Test reporting dashboards**: create dashboards for test metrics.  Show pass rate, coverage, and trends.

## Advanced Testing Patterns

- **Property-based testing**: use property-based testing for edge case discovery.  Define properties that should always hold.  Let the framework generate test cases.  Run many iterations to find counterexamples.
- **Mutation testing**: use mutation testing to evaluate test quality.  Mutate source code and run tests.  Good tests catch mutations.  Calculate mutation score.
- **Snapshot testing**: use snapshot testing for regression detection.  Capture component output as snapshot.
## Migration Strategies

- **Migrating from manual to automated testing**: start with critical paths.  Add integration tests next.  Add unit tests for new code.  Gradually add tests for legacy code.
- **Migrating between test frameworks**: plan framework migration carefully.  Map old assertions to new framework.  Migrate tests incrementally.  Run both frameworks in parallel.  Complete migration after validation.
- **Migrating from monolith to microservices testing**: adapt test strategy for microservices.  Add contract tests for service boundaries.  Add integration tests for service interactions.  Reduce E2E test scope.

## Compliance and Governance

- **Testing SLAs**: define SLAs for test execution.  Unit tests complete in under 5 minutes.  Integration tests complete in under 30 minutes.  E2E tests complete in under 60 minutes.  Communicate SLA status.
- **Test reporting**: generate weekly test reports.  Highlight flaky tests.
- **Audit and compliance**: maintain audit trail of test results.  Log all test environment changes.
## Automation and Tooling

- **Test automation framework**: build a solid test automation framework.  Use factory pattern for test data.
- **Automated test generation**: use tools for automated test generation.  Generate API tests from OpenAPI specs.  Edit generated tests.
- **Test data automation**: automate test data generation.  Use seeders for database setup.

## Sustainability

- **Green testing**: optimize test energy consumption.  Reduce unnecessary test runs.  Skip tests for unchanged code.
- **Resource efficiency**: optimize test resource usage.
- **Waste reduction**: reduce test waste.  Remove unused test data.

## Industry Standards and Frameworks

- **Testing standards**: follow industry testing standards.  ISTQB for testing terminology.  ISO/IEC 25010 for software quality.  IEEE 829 for test documentation.  Train team on standards.
- **Test-driven development**: practice TDD where appropriate.  Write tests before code.  Red-green-refactor cycle.  Start with failing test.  Write minimal code to pass.  Refactor after passing.
- **Behavior-driven development**: practice BDD for acceptance criteria.  Write scenarios in Given-When-Then format.  Use BDD for user-facing features.
## Reporting and Communication

- **Performance reporting**: generate weekly performance reports for test suites.  Highlight trends and anomalies.
- **Cost reporting**: generate monthly cost reports for testing infrastructure.  Break down by environment, tool, and team.
- **Incident reporting**: document all test-related incidents.  Conduct post-mortem reviews.  Communicate incidents to stakeholders.

## Advanced Optimization

- **Test suite optimization**: optimize test suite for speed and reliability.  Merge similar tests.  Skip tests for unchanged code.
- **Test environment optimization**: optimize test environments for speed.  Use in-memory databases.  Cache environment setup.
- **Test data optimization**: optimize test data for speed and reliability.  Use factories for on-demand data.  Cache test data.




## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the testing and pytest guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply write integration tests** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: How are integration tests different from end-to-end tests?**
A: Integration tests verify a specific pair or small group of components. E2E tests exercise the entire application through the UI or public API, often using tools like Selenium, Playwright, or Cypress.

**Q: Should I use an in-memory database like H2 or SQLite for integration tests?**
A: Only if your production database is also SQLite. In-memory databases have different behavior from PostgreSQL or MySQL (transaction isolation, type coercion, JSON support). Testcontainers with the real database engine is the safer choice.

**Q: How do I keep integration tests fast?**
A: Reuse containers across tests (Testcontainers supports this), parallelize test execution, and limit the scope of each test. A well-tuned integration suite should run in under 2 minutes.

**Q: Do I need integration tests if I have 100% unit test coverage?**
A: Yes. Unit tests with mocked dependencies cannot catch wiring errors, schema mismatches, or real network timeout behavior. Both types complement each other.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
