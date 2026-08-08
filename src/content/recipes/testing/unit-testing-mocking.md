---
contentType: recipes
slug: unit-testing-mocking
title: "Write Unit Tests with Mocks and Stubs"
description: "How to isolate code under test using mock objects, stubs, and spies to replace external dependencies like databases, APIs, and file systems."
metaDescription: "Learn unit testing with mocks and stubs. Isolate code under test by replacing external dependencies like databases, APIs, and file systems for reliable tests."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - jest
  - unit-tests
  - integration
  - tdd
relatedResources:
  - /recipes/unit-testing
  - /recipes/integration-testing
  - /recipes/load-testing
  - /recipes/integration-testing-strategies
  - /recipes/jest-snapshot-testing
  - /recipes/python-mock-external-apis-responses
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Learn unit testing with mocks and stubs. Isolate code under test by replacing external dependencies like databases, APIs, and file systems for reliable tests."
  keywords:
    - unit testing
    - mocking
    - test doubles
    - jest mock
    - pytest mock
    - junit mockito
    - stub objects



---
## Overview

Unit tests verify that a single function or class behaves correctly in isolation. But most code depends on external systems — databases, HTTP APIs, file systems, clocks — that are slow, unreliable, or unavailable during tests. Mocking replaces these dependencies with controlled stand-ins that return predetermined responses, throw exceptions on demand, or record how they were called.

A well-isolated unit test runs in milliseconds, produces the same result every time, and fails only when the code under test — not its dependencies — is broken. Here is how to the three essential test doubles: stubs (fake data), mocks (behavior verification), and spies (call recording).

## When to Use

Use this recipe when:

- Writing unit tests for code that calls databases, APIs, or third-party services. See [Integration Testing](/recipes/testing/integration-testing) for testing with real dependencies.
- Testing error handling for scenarios that are hard to trigger in real systems. See [API Contract Testing](/recipes/testing/api-mocking) for verifying API error responses.
- Speeding up a slow test suite dominated by integration-style tests
- Verifying that a function calls a collaborator with the correct arguments
- Replacing non-deterministic dependencies (random generators, current time, UUIDs). See [Call REST API](/recipes/api/call-rest-api) for testing HTTP client logic.

## Solution

### Jest Mock (JavaScript)

```javascript
import { processPayment } from './payment';
import { sendEmail } from './email';

jest.mock('./email');

test('sends receipt email after successful payment', async () => {
  sendEmail.mockResolvedValue({ messageId: '123' });

  await processPayment({ amount: 100, userId: 'u1' });

  expect(sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'user@example.com',
      subject: 'Payment received',
    })
  );
});

test('handles email service failure gracefully', async () => {
  sendEmail.mockRejectedValue(new Error('SMTP down'));

  const result = await processPayment({ amount: 100, userId: 'u1' });

  expect(result.emailSent).toBe(false);
  expect(result.paymentId).toBeDefined();
});
```

### Pytest Mock (Python)

```python
from unittest.mock import patch, MagicMock
from payment import process_payment

def test_payment_success():
    with patch('payment.send_email') as mock_email:
        mock_email.return_value = {'message_id': '123'}
        result = process_payment(amount=100, user_id='u1')
        assert result['email_sent'] is True
        mock_email.assert_called_once()

def test_payment_email_failure():
    with patch('payment.send_email', side_effect=SMTPError('timeout')):
        result = process_payment(amount=100, user_id='u1')
        assert result['email_sent'] is False
```

### Mockito Stub (Java)

```java
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
    @Test
    void sendsReceiptOnSuccess() {
        EmailService emailMock = mock(EmailService.class);
        when(emailMock.send(any())).thenReturn(new Receipt("123"));

        PaymentService service = new PaymentService(emailMock);
        service.processPayment(100, "u1");

        verify(emailMock, times(1)).send(argThat(receipt ->
            receipt.getSubject().equals("Payment received")
        ));
    }
}
```

## Explanation

- **Stubs**: Provide canned answers to calls.  A database stub might return a hardcoded user record.  Stubs replace queries but do not verify that calls happened.
- **Mocks**: Pre-programmed objects with expectations.  A mock fails the test if it is not called the expected number of times or with expected arguments.
- **Spies**: Real objects that record every call for later verification.  Spy on a real cache to confirm it was checked before hitting the database.

## Variants

| Double | Replaces | Verifies Calls | Best For |
|--------|----------|----------------|----------|
| Dummy | Unused parameter | No | Filling argument lists |
| Fake | Working implementation | No | In-memory database |
| Stub | Specific response | No | Returning test data |
| Spy | Real object + records | Yes | Verifying side effects |
| Mock | Expected interaction | Yes | Verifying calls made |

## What Works

- **Mock at the boundary, not internally**: mock the HTTP client or database driver, not every private method inside your class.  Over-mocking makes tests brittle.
- **Prefer stubs for state verification**: if you can assert on the final state ("balance is $50") rather than the interaction ("withdraw was called once"), do so.  State-based tests are more resilient to refactoring.
- **Reset mocks between tests**: leftover mock state from a previous test can cause confusing failures.  Jest and Pytest handle this automatically; in other frameworks, create fresh instances per test.
- **Use dependency injection**: code that instantiates its own dependencies with `new Database()` is hard to mock.  Inject dependencies via constructors or factories.
- **Do not mock value objects**: simple data classes, structs, and DTOs have no behavior to replace.  Pass real instances.

## Common Mistakes

- **Mocking the system under test**: mocking methods inside the class you are testing means you are not testing the class at all.  Mock collaborators, not the subject.
- **Over-specifying interactions**: verifying that `database. connect()` was called exactly once ties your test to implementation details.
- **Ignoring mock verification**: setting up `mock. verify()` but never calling it in the test body creates false confidence.
- **Using mocks for everything**: if every class is mocked, your test suite tests the mocks, not the real system.

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
## Test Architecture Patterns

- **Test pyramid**: follow the test pyramid pattern.  Many unit tests at the base.  Fewer integration tests in the middle.  Very few E2E tests at the top.  Unit tests are fast and isolated.  Integration tests cover boundaries.  E2E tests cover critical user flows.
- **Test diamond**: use test diamond for service-oriented architecture.  Few unit tests.  Many contract tests.  Few E2E tests.  Contract tests verify service boundaries.
- **Testing honeycomb**: use testing honeycomb for microservices.  Few unit tests.  Many integration tests.  Few E2E tests.  Integration tests cover service interactions.

## Test Data Strategies

- **Test data factories**: use factories for test data creation.  Centralize data creation logic.  Use default values with overrides.  Refactor duplicated factories.
- **Test data seeders**: use seeders for database test data.  Create consistent test state.  Run seeders before test suites.
- **Test data fixtures**: use fixtures for static test data.  Load fixtures in test setup.
## Test Maintenance

- **Test code quality**: maintain high code quality in tests.  Follow same coding standards as production code.  Refactor test code regularly.
- **Test debt management**: track and manage test debt.  Allocate time for test debt.
- **Test documentation**: document test strategy and conventions.  Document test data strategy.

## Team Collaboration

- **Test reviews**: review tests in pull requests.  Verify test quality.  Train team on test reviews.
- **Knowledge sharing**: share testing knowledge across the team.  Conduct testing lunch-and-learns.  Create testing guidelines.
- **Testing culture**: build a strong testing culture.  Celebrate testing achievements.  Recognize good test practices.  Encourage test-first development.  Make testing visible.





## Glossary

- **Write Unit Tests with Mocks and Stubs**: core technique or pattern described in this article.
- **Production**: live environment serving real users; requires monitoring and rollback plan.
- **Troubleshooting**: systematic process to diagnose and resolve incidents.

## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the testing and jest guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply write unit tests with mocks and stubs** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: When should I use a real dependency instead of a mock?**
A: When the dependency is fast, deterministic, and simple — for example, an in-memory Map or a pure function. The closer your test is to production, the more confidence it provides.

**Q: What is the difference between a stub and a mock?**
A: A stub answers calls with preset data. A mock verifies that expected calls were made. You can use a mock as a stub, but not vice versa.

**Q: Should I mock the file system?**
A: For unit tests, yes — use virtual file systems or in-memory streams. For integration tests, write to a temporary directory and clean up afterward.

**Q: Can I mock static methods?**
A: In Java, PowerMock and Mockito inline mock can do this, but it is discouraged. Static methods are hard to test because they cannot be injected. Refactor to instance methods when possible.


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
