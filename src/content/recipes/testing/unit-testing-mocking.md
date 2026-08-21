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
  - unit-tests
  - mocking
  - stubs
  - jest
  - pytest
  - mockito
relatedResources:
  - /recipes/unit-testing
  - /recipes/integration-testing
  - /recipes/api-mocking
  - /recipes/jest-snapshot-testing
  - /recipes/python-mock-external-apis-responses
  - /recipes/java-wiremock-stub-external
lastUpdated: "2026-08-19"
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

Unit tests verify that a single function or class behaves correctly in isolation. Most code depends
on external systems — databases, HTTP APIs, file systems, clocks — that are slow, unreliable, or
unavailable during tests. Mocking replaces these dependencies with controlled stand-ins that return
predetermined responses, throw exceptions on demand, or record how they were called.

A well-isolated unit test runs in milliseconds, produces the same result every time, and fails only
when the code under test is broken. This recipe covers the three essential test doubles — stubs,
mocks, and spies — with examples in JavaScript, Python, and Java.

## When to Use

- Writing unit tests for code that calls databases, APIs, or third-party services. See
  [Integration Testing](/recipes/integration-testing/) for testing with real dependencies.
- Testing error handling for scenarios that are hard to trigger in real systems. See
  [API Mocking](/recipes/api-mocking/) for verifying API error responses.
- Speeding up a slow test suite dominated by integration-style tests.
- Verifying that a function calls a collaborator with the correct arguments.
- Replacing non-deterministic dependencies such as random generators, current time, or UUIDs.

## When NOT to Use

- The dependency is fast, deterministic, and simple — use the real implementation.
- You need to validate how several real components interact — use
  [Integration Testing](/recipes/integration-testing/).
- You want to verify the real HTTP contract of an external service — use
  [WireMock](/recipes/java-wiremock-stub-external/) or [API Mocking](/recipes/api-mocking/).

## Solution

### Jest mock (JavaScript)

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

### Pytest mock (Python)

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

### Mockito stub (Java)

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

- **Stubs** provide canned answers to calls. A database stub might return a hardcoded user record.
  Stubs replace queries but don't verify that calls happened.
- **Mocks** are pre-programmed objects with expectations. A mock fails the test if it's not called
  the expected number of times or with expected arguments.
- **Spies** wrap real objects and record every call for later verification. For example, you can
  spy on a real cache to confirm it was checked before hitting the database.

The key rule is to mock at the boundary. Replace the HTTP client or database driver, not private
methods inside the class you're testing. Over-mocking makes tests brittle and defeats the purpose
of unit testing.

## Variants

| Double | Replaces | Verifies calls | Best for |
| --- | --- | --- | --- |
| Dummy | Unused parameter | No | Filling argument lists |
| Fake | Working implementation | No | In-memory database |
| Stub | Specific response | No | Returning test data |
| Spy | Real object + records | Yes | Verifying side effects |
| Mock | Expected interaction | Yes | Verifying calls made |

Use a **stub** when you only need to feed data into the code under test. Use a **mock** when the
interaction itself is part of the contract. Use a **spy** when you want to keep the real
implementation but check that it was used.

## Best Practices

- **Mock at the boundary, not internally**: mock the HTTP client or database driver, not every
  private method inside your class.
- **Prefer stubs for state verification**: if you can assert on the final state ("balance is $50")
  rather than the interaction ("withdraw was called once"), do so. State-based tests are more
  resilient to refactoring.
- **Reset mocks between tests**: leftover mock state from a previous test can cause confusing
  failures. Jest and Pytest handle this automatically; in other frameworks, create fresh instances
  per test.
- **Use dependency injection**: code that instantiates its own dependencies with `new Database()`
  is hard to mock. Inject dependencies via constructors or factories.
- **Don't mock value objects**: simple data classes, structs, and DTOs have no behavior to
  replace. Pass real instances.
- **Keep mock expectations explicit**: verify only the calls that matter. Over-specifying ties
  tests to implementation details.

## Common Mistakes

- **Mocking the system under test**: mocking methods inside the class you're testing means you're
  not testing the class at all. Mock collaborators, not the subject.
- **Over-specifying interactions**: verifying that `database.connect()` was called exactly once
  ties your test to implementation details.
- **Ignoring mock verification**: setting up `verify()` but never calling it in the test body
  creates false confidence.
- **Using mocks for everything**: if every class is mocked, your test suite tests the mocks, not
  the real system.
- **Letting mocks drift from reality**: an HTTP mock that returns a different shape than the
  production API can hide real bugs. Keep mocks close to real contracts.

## FAQ

### When should I use a real dependency instead of a mock?

Use the real implementation when it's fast, deterministic, and simple — for example, an in-memory
Map or a pure function. The closer your test is to production, the more confidence it gives you.

### What is the difference between a stub and a mock?

A stub answers calls with preset data. A mock verifies that expected calls were made. You can use a
mock as a stub, but not vice versa.

### Should I mock the file system?

For unit tests, yes — use virtual file systems or in-memory streams. For integration tests, write
to a temporary directory and clean up afterward.

### Can I mock static methods?

In Java, PowerMock and Mockito inline mock can do this, but it's discouraged. Static methods are
hard to test because they can't be injected. Refactor to instance methods when possible.

### How do I avoid over-mocking?

Mock only external dependencies that are slow, non-deterministic, or unavailable in tests. If a
collaborator is fast and deterministic, use the real one. When in doubt, prefer a stub over a mock.

### When should I use a spy?

Use a spy when you want the real object to run but also need to verify how it was called. Common
examples include checking that a logger wrote a warning or that a cache was consulted before a
slow query.
