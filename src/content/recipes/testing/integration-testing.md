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

## What works

- **Use real dependencies, not mocks**: the whole point of integration testing is verifying real interactions. Mock only external systems you do not control (payment gateways, third-party APIs).
- **Clean up between tests**: truncate tables, clear queues, or recreate containers so test order does not affect results.
- **Keep integration tests in a separate directory**: `tests/integration/` or `src/test/integration/` makes it clear these are slower and more thorough.
- **Run them in [CI](/guides/devops/cicd-pipeline-guide), not on every file save**: configure your test runner with separate commands (`npm run test:unit` vs `npm run test:integration`).
- **Use random ports and isolated databases**: never run integration tests against your development or production database.
- **Limit scope**: test one integration point per test. A test that exercises the database, HTTP layer, and message queue is hard to debug when it fails.

## Common Mistakes

- **Running integration tests against production databases**: this can corrupt real data and violate compliance policies.
- **Not cleaning up after tests**: leftover data causes flaky tests that pass in isolation but fail in a suite.
- **Mocking everything in an integration test**: if you mock the database and HTTP layer, you are writing an elaborate [unit test](/recipes/testing/unit-testing), not an integration test.
- **Using hard-coded ports**: port conflicts cause flaky tests. Always use port 0 or live allocation.
- **Testing too much in one test**: when a broad integration test fails, you spend more time debugging which layer broke than writing the fix.

## Error Handling in Tests

- **Test failure handling**: handle test failures with clear assertions. Use descriptive assertion messages. Capture screenshots on UI test failures. Log test environment details on failure. Document failure handling strategy. Test with known failing cases. Monitor failure patterns. Alert on unexpected pass rates. Review failing tests promptly. Use soft assertions for non-critical checks
- **Test timeout handling**: set appropriate timeouts for each test. Unit tests should complete in seconds. Integration tests may need longer timeouts. E2E tests need generous timeouts. Document timeout strategy. Test timeout behavior. Monitor timeout frequency. Alert on timeout spikes. Review timeout values quarterly. Use configurable timeouts
- **Flaky test management**: identify and fix flaky tests. Track flaky test history. Quarantine flaky tests. Fix root cause of flakiness. Document flaky test strategy. Monitor flaky test rate. Alert on flaky test increases. Review quarantined tests regularly. Prioritize flaky test fixes. Use retry strategies carefully

## Security in Testing

- **Test data security**: use synthetic data for testing. Never use real production data in tests. Mask sensitive fields in test data. Encrypt test databases. Document test data security strategy. Test with different data sets. Monitor test data access. Alert on unauthorized access. Review test data regularly. Use data generation tools
- **Test environment security**: secure test environments. Use separate credentials for test environments. Restrict access to test environments. Use VPN for internal test environments. Document test environment security. Test security controls. Monitor access logs. Alert on security violations. Review access permissions regularly. Use least privilege principle
- **Secrets in tests**: never hardcode secrets in test files. Use environment variables for test secrets. Use test-specific secret management. Rotate test secrets regularly. Document secrets management strategy. Test with missing secrets. Monitor secret usage. Alert on secret exposure. Review secret handling code. Use mock secrets for unit tests

## Deployment and CI/CD for Tests

- **Test pipeline design**: design CI/CD pipeline for tests. Run unit tests on every commit. Run integration tests on pull requests. Run E2E tests before deployment. Run security scans on every build. Document pipeline design. Test pipeline performance. Monitor pipeline success rate. Alert on pipeline failures. Optimize pipeline execution time
- **Test parallelization**: parallelize tests for faster execution. Use test runners that support parallel execution. Group tests by dependency. Isolate parallel tests. Document parallelization strategy. Test parallel execution. Monitor parallel test performance. Alert on race conditions. Review parallelization configuration. Balance parallelism and resource usage
- **Test result reporting**: report test results clearly. Generate test reports in CI. Publish reports to stakeholders. Include test coverage in reports. Track test metrics over time. Document reporting strategy. Test report format. Monitor report accuracy. Alert on report failures. Review report content regularly

## Testing Tools and Platforms

- **Unit testing frameworks**: choose the right unit testing framework. Jest for JavaScript. PyTest for Python. JUnit 5 for Java. Vitest for modern JavaScript. Document framework choice. Test framework features. Monitor framework performance. Review framework compatibility. Update framework versions regularly. Use framework-specific best practices
- **Integration testing tools**: use appropriate tools for integration testing. TestContainers for Docker-based integration tests. Supertest for API testing. WireMock for external service mocking. MSW for browser API mocking. Document tool selection. Test tool compatibility. Monitor tool performance. Review tool effectiveness. Update tools regularly
- **E2E testing tools**: choose the right E2E testing tool. Playwright for modern web E2E. Cypress for web applications. Selenium for legacy web apps. Detox for React Native. Document E2E tool choice. Test E2E framework. Monitor E2E test stability. Review E2E test coverage. Update E2E tools regularly. Use page object model

## Common Testing Pitfalls

- **Over-mocking**: avoid mocking too much. Mock only external dependencies. Mock only what you need to control. Excessive mocking makes tests brittle. Document mocking strategy. Review mock usage regularly. Refactor over-mocked tests. Monitor test maintainability. Alert on excessive mock count. Use real implementations where possible
- **Testing implementation details**: test behavior, not implementation. Avoid testing private methods. Avoid testing internal state. Focus on public API behavior. Document testing philosophy. Review tests for implementation coupling. Refactor implementation-coupled tests. Monitor test refactoring needs. Educate team on behavior testing. Use black-box testing approach
- **Ignoring edge cases**: test edge cases thoroughly. Test empty inputs. Test null values. Test boundary conditions. Test error paths. Document edge case testing strategy. Review edge case coverage. Monitor edge case failures. Alert on missing edge cases. Use property-based testing for edge cases. Test with random data
## Best Practices

- **Test naming conventions**: use descriptive test names. Follow arrange-act-assert pattern. Name tests by behavior, not implementation. Use consistent naming across the suite. Document naming conventions. Review test names regularly. Educate team on conventions. Monitor naming compliance. Refactor poorly named tests. Use standard prefixes like "should" or "when"
- **Test organization**: organize tests by feature or component. Group related tests in describe blocks. Keep test files close to source files. Use shared setup in beforeAll or beforeEach. Document test organization strategy. Review test file structure. Monitor test file size. Refactor large test files. Use helper functions for common setup. Keep tests independent
- **Test data management**: use factories for test data. Use builders for complex objects. Use fixtures for static data. Use seeders for database tests. Document test data strategy. Review test data usage. Monitor test data maintenance. Refactor duplicated test data. Use test data generators. Keep test data realistic but synthetic
- **Test coverage goals**: set realistic coverage goals. 80% for critical paths. 60% for utility code. 100% for pure functions. Document coverage goals. Track coverage trends. Alert on coverage drops. Review uncovered code. Prioritize coverage for high-risk code. Use branch coverage over line coverage. Report coverage in CI

## Cost Optimization

- **Reducing test execution time**: optimize test execution speed. Use parallel test execution. Minimize database setup. Use in-memory databases for unit tests. Cache test dependencies. Document optimization strategy. Test execution time regularly. Monitor test duration trends. Alert on slow tests. Refactor slow tests. Use test prioritization
- **Reducing test maintenance**: minimize test maintenance overhead. Write maintainable tests. Avoid brittle assertions. Use page object model for E2E. Refactor duplicated test code. Document maintenance strategy. Review test maintenance effort. Monitor test code churn. Alert on high maintenance tests. Use shared test utilities. Keep tests DRY
- **Test infrastructure costs**: optimize test infrastructure costs. Use shared test environments. Use containerized test environments. Scale test infrastructure with demand. Document cost optimization strategy. Monitor infrastructure costs. Alert on cost spikes. Review infrastructure usage. Use spot instances for CI. Optimize resource allocation

## Troubleshooting Guide

- **Debugging failing tests**: isolate the failing test. Run the test in isolation. Check test dependencies. Verify test environment. Check for race conditions. Document debugging steps. Use debugging tools. Monitor failure patterns. Alert on recurring failures. Use root cause analysis. Fix root cause, not symptoms
- **Debugging slow tests**: identify slow tests. Profile test execution. Check database queries. Check network calls. Check test setup. Document debugging steps. Use profiling tools. Monitor test duration. Alert on slow tests. Optimize slow operations. Use async operations where possible
- **Debugging test environment issues**: check environment configuration. Verify dependencies are installed. Check environment variables. Verify database state. Check network connectivity. Document debugging steps. Test environment setup. Monitor environment health. Alert on environment issues. Use infrastructure as code. Keep environments consistent

## Monitoring and Alerting

- **Key test metrics**: track test pass rate, execution time, coverage, and flaky test rate. Monitor test count trends. Track test maintenance effort. Document metrics strategy. Configure dashboards for key metrics. Review metrics regularly. Adjust thresholds based on trends. Alert on critical metrics. Use metrics for improvement decisions
- **Alert configuration**: set alerts on test failure rate above 5%. Alert on coverage drops. Alert on flaky test rate increases. Alert on test execution time spikes. Use multi-level alerts: warning and critical. Document alert thresholds. Test alert delivery. Review alert effectiveness monthly. Reduce alert noise. Use runbooks for each alert
- **Test reporting dashboards**: create dashboards for test metrics. Show pass rate, coverage, and trends. Share with stakeholders. Update dashboards in real-time. Document dashboard strategy. Review dashboard content. Monitor dashboard usage. Alert on dashboard failures. Use dashboards for decision making. Keep dashboards simple and focused

## Advanced Testing Patterns

- **Property-based testing**: use property-based testing for edge case discovery. Define properties that should always hold. Let the framework generate test cases. Run many iterations to find counterexamples. Document property-based testing strategy. Test with different generators. Monitor property test effectiveness. Review properties regularly. Use shrinking for debugging. Combine with example-based tests
- **Mutation testing**: use mutation testing to evaluate test quality. Mutate source code and run tests. Good tests catch mutations. Calculate mutation score. Document mutation testing strategy. Test with different mutators. Monitor mutation score trends. Review surviving mutants. Use mutation testing for critical code. Balance mutation testing cost and value
- **Snapshot testing**: use snapshot testing for regression detection. Capture component output as snapshot. Compare future runs against snapshot. Review snapshot diffs carefully. Document snapshot testing strategy. Test snapshot update process. Monitor snapshot drift. Alert on large snapshot changes. Use snapshots for serializable output. Keep snapshots small and focused
## Migration Strategies

- **Migrating from manual to automated testing**: start with critical paths. Automate smoke tests first. Add integration tests next. Add unit tests for new code. Gradually add tests for legacy code. Document migration strategy. Test automation progress. Monitor test coverage growth. Alert on coverage stagnation. Review migration progress quarterly
- **Migrating between test frameworks**: plan framework migration carefully. Map old assertions to new framework. Migrate tests incrementally. Run both frameworks in parallel. Document migration strategy. Test migrated tests. Monitor migration progress. Alert on migration blockers. Complete migration after validation. Clean up old framework
- **Migrating from monolith to microservices testing**: adapt test strategy for microservices. Add contract tests for service boundaries. Add integration tests for service interactions. Reduce E2E test scope. Document microservices testing strategy. Test service contracts. Monitor test execution. Alert on contract violations. Review test architecture. Use service virtualization

## Compliance and Governance

- **Testing SLAs**: define SLAs for test execution. Unit tests complete in under 5 minutes. Integration tests complete in under 30 minutes. E2E tests complete in under 60 minutes. Track SLA compliance. Alert on SLA violations. Document SLA definitions. Review SLAs quarterly. Communicate SLA status. Use SLA for prioritization
- **Test reporting**: generate weekly test reports. Include pass rate, coverage, and trends. Highlight flaky tests. Share with stakeholders. Document reporting methodology. Automate report generation. Review report content. Track metrics over time. Use reports for planning and optimization
- **Audit and compliance**: maintain audit trail of test results. Track who ran tests and when. Log all test environment changes. Use version control for test code. Document audit strategy. Test audit log completeness. Monitor audit log retention. Review compliance requirements regularly. Alert on audit log gaps
## Automation and Tooling

- **Test automation framework**: build a solid test automation framework. Use page object model for UI tests. Use factory pattern for test data. Use builder pattern for complex objects. Document framework architecture. Test framework components. Monitor framework performance. Review framework regularly. Update framework with best practices. Keep framework maintainable
- **Automated test generation**: use tools for automated test generation. Generate unit tests from code analysis. Generate API tests from OpenAPI specs. Generate E2E tests from user flows. Document generation strategy. Test generated tests. Monitor generation quality. Review generated tests. Edit generated tests. Use generation for coverage gaps
- **Test data automation**: automate test data generation. Use factories for consistent data. Use seeders for database setup. Use mock servers for external APIs. Document automation strategy. Test data automation. Monitor data quality. Review automation effectiveness. Update automation regularly. Keep data realistic

## Sustainability

- **Green testing**: optimize test energy consumption. Reduce unnecessary test runs. Use incremental testing. Skip tests for unchanged code. Use parallel execution to reduce wall time. Document green testing strategy. Monitor test energy usage. Review testing efficiency. Optimize test resources. Use cloud-native testing tools
- **Resource efficiency**: optimize test resource usage. Right-size test environments. Use containerized tests. Share test resources across teams. Clean up test data after runs. Document resource efficiency strategy. Monitor resource utilization. Review efficiency metrics. Optimize resource allocation. Use ephemeral environments
- **Waste reduction**: reduce test waste. Delete obsolete tests. Remove duplicate tests. Clean up test artifacts. Remove unused test data. Monitor for idle test resources. Document waste reduction strategy. Review test suite regularly. Alert on waste indicators. Automate cleanup procedures

## Industry Standards and Frameworks

- **Testing standards**: follow industry testing standards. ISTQB for testing terminology. ISO/IEC 25010 for software quality. IEEE 829 for test documentation. Document standards usage. Test compliance with standards. Monitor standards adoption. Review standards regularly. Train team on standards. Use standards for test design
- **Test-driven development**: practice TDD where appropriate. Write tests before code. Red-green-refactor cycle. Start with failing test. Write minimal code to pass. Refactor after passing. Document TDD practices. Test TDD adoption. Monitor TDD effectiveness. Review TDD code quality. Use TDD for critical features
- **Behavior-driven development**: practice BDD for acceptance criteria. Write scenarios in Given-When-Then format. Use Cucumber or SpecFlow for BDD. Document BDD practices. Test BDD scenarios. Monitor BDD adoption. Review BDD effectiveness. Use BDD for user-facing features. Keep scenarios readable. Automate BDD scenarios
## Reporting and Communication

- **Performance reporting**: generate weekly performance reports for test suites. Include execution time, pass rate, coverage, and flaky test count. Compare with previous week. Highlight trends and anomalies. Share with engineering team. Document reporting methodology. Automate report generation. Review report content monthly. Use reports for optimization decisions
- **Cost reporting**: generate monthly cost reports for testing infrastructure. Break down by environment, tool, and team. Compare with budget. Identify cost optimization opportunities. Share with stakeholders. Document cost reporting strategy. Automate cost report generation. Review cost trends quarterly. Use reports for budget planning
- **Incident reporting**: document all test-related incidents. Include root cause, impact, and resolution. Share incident reports with team. Conduct post-mortem reviews. Document action items. Track action item completion. Review incident patterns. Use incidents for improvement. Communicate incidents to stakeholders. Maintain incident history

## Advanced Optimization

- **Test suite optimization**: optimize test suite for speed and reliability. Remove duplicate tests. Merge similar tests. Skip tests for unchanged code. Use test prioritization. Document optimization strategy. Test suite performance. Monitor execution time. Alert on slow suites. Review suite regularly. Keep suite lean
- **Test environment optimization**: optimize test environments for speed. Use containerized environments. Use in-memory databases. Use mock services. Cache environment setup. Document optimization strategy. Test environment performance. Monitor environment health. Alert on environment issues. Review environments regularly
- **Test data optimization**: optimize test data for speed and reliability. Use minimal data sets. Use factories for on-demand data. Use seeders for consistent state. Cache test data. Document optimization strategy. Test data performance. Monitor data quality. Alert on data issues. Review test data regularly. Keep data minimal
## Frequently Asked Questions

**Q: How are integration tests different from end-to-end tests?**
A: Integration tests verify a specific pair or small group of components. [E2E tests](/recipes/testing/e2e-testing) exercise the entire application through the UI or public API, often using tools like Selenium, Playwright, or Cypress.

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