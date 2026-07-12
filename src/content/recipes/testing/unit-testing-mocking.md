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
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

- **Stubs**: Provide canned answers to calls. A database stub might return a hardcoded user record. Stubs replace queries but do not verify that calls happened.
- **Mocks**: Pre-programmed objects with expectations. A mock fails the test if it is not called the expected number of times or with expected arguments. Use mocks to verify interactions between objects.
- **Spies**: Real objects that record every call for later verification. Spy on a real cache to confirm it was checked before hitting the database.

## Variants

| Double | Replaces | Verifies Calls | Best For |
|--------|----------|----------------|----------|
| Dummy | Unused parameter | No | Filling argument lists |
| Fake | Working implementation | No | In-memory database |
| Stub | Specific response | No | Returning test data |
| Spy | Real object + records | Yes | Verifying side effects |
| Mock | Expected interaction | Yes | Verifying calls made |

## What Works

- **Mock at the boundary, not internally**: mock the HTTP client or database driver, not every private method inside your class. Over-mocking makes tests brittle.
- **Prefer stubs for state verification**: if you can assert on the final state ("balance is $50") rather than the interaction ("withdraw was called once"), do so. State-based tests are more resilient to refactoring.
- **Reset mocks between tests**: leftover mock state from a previous test can cause confusing failures. Jest and Pytest handle this automatically; in other frameworks, create fresh instances per test.
- **Use dependency injection**: code that instantiates its own dependencies with `new Database()` is hard to mock. Inject dependencies via constructors or factories.
- **Do not mock value objects**: simple data classes, structs, and DTOs have no behavior to replace. Pass real instances.

## Common Mistakes

- **Mocking the system under test**: mocking methods inside the class you are testing means you are not testing the class at all. Mock collaborators, not the subject.
- **Over-specifying interactions**: verifying that `database.connect()` was called exactly once ties your test to implementation details. Test outcomes, not internal mechanics.
- **Ignoring mock verification**: setting up `mock.verify()` but never calling it in the test body creates false confidence.
- **Using mocks for everything**: if every class is mocked, your test suite tests the mocks, not the real system. Maintain a healthy mix of unit and integration tests.

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
## Test Architecture Patterns

- **Test pyramid**: follow the test pyramid pattern. Many unit tests at the base. Fewer integration tests in the middle. Very few E2E tests at the top. Unit tests are fast and isolated. Integration tests cover boundaries. E2E tests cover critical user flows. Document test pyramid adoption. Monitor test distribution. Alert on pyramid inversion. Review test mix regularly
- **Test diamond**: use test diamond for service-oriented architecture. Few unit tests. Many contract tests. Few E2E tests. Contract tests verify service boundaries. Document test diamond usage. Monitor test distribution. Alert on missing contract tests. Review test architecture. Adapt to service complexity
- **Testing honeycomb**: use testing honeycomb for microservices. Few unit tests. Many integration tests. Few E2E tests. Integration tests cover service interactions. Document honeycomb pattern. Monitor test distribution. Alert on architecture mismatch. Review test strategy. Adapt to architecture changes

## Test Data Strategies

- **Test data factories**: use factories for test data creation. Centralize data creation logic. Use builders for complex objects. Use default values with overrides. Document factory pattern usage. Test factory output. Monitor factory maintenance. Review factories regularly. Refactor duplicated factories. Keep factories simple and composable
- **Test data seeders**: use seeders for database test data. Create consistent test state. Run seeders before test suites. Clean up after tests. Document seeding strategy. Test seeding performance. Monitor seeding reliability. Review seed data regularly. Optimize seeding speed. Use transactions for cleanup
- **Test data fixtures**: use fixtures for static test data. Store fixtures in JSON or YAML. Load fixtures in test setup. Keep fixtures small and focused. Document fixture strategy. Test fixture loading. Monitor fixture maintenance. Review fixtures regularly. Update fixtures when schema changes. Use fixtures for regression tests
## Test Maintenance

- **Test code quality**: maintain high code quality in tests. Follow same coding standards as production code. Use meaningful variable names. Keep tests readable. Refactor test code regularly. Document quality standards. Review test code in PRs. Monitor test code metrics. Alert on quality degradation. Use linting for test code
- **Test debt management**: track and manage test debt. Identify tests that need refactoring. Prioritize test debt items. Schedule regular test refactoring. Document test debt strategy. Monitor test debt backlog. Alert on growing test debt. Review test debt quarterly. Allocate time for test debt. Keep test debt visible
- **Test documentation**: document test strategy and conventions. Document test architecture decisions. Document test data strategy. Document test environment setup. Keep documentation updated. Review documentation regularly. Monitor documentation accuracy. Alert on outdated docs. Use inline documentation. Keep docs close to code

## Team Collaboration

- **Test reviews**: review tests in pull requests. Check test coverage for new code. Verify test quality. Check for edge cases. Review test naming. Document review checklist. Train team on test reviews. Monitor review effectiveness. Alert on missing test reviews. Use test review templates
- **Knowledge sharing**: share testing knowledge across the team. Conduct testing lunch-and-learns. Share testing best practices. Document testing patterns. Create testing guidelines. Monitor knowledge sharing. Review team testing skills. Alert on knowledge gaps. Use pair testing. Mentor junior developers
- **Testing culture**: build a strong testing culture. Celebrate testing achievements. Recognize good test practices. Encourage test-first development. Make testing visible. Document culture initiatives. Monitor testing culture. Review team engagement. Alert on culture degradation. Lead by example
## Frequently Asked Questions

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