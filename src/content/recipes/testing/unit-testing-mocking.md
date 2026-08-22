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
lastUpdated: "2026-08-22"
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

A unit test should verify one function or one class in isolation. The catch is that most code
depends
on things you don't want running in a test suite — databases, HTTP APIs, the file system, the
clock, random number generators. Mocking lets you swap those dependencies for stand-ins that return
whatever value you need, throw a specific exception, or record how they were called.

The examples below cover the three test doubles you'll reach for most often — stubs, mocks, and
spies — with code in JavaScript, Python, and Java.

## When to Use

Mocks and stubs come in handy when your unit tests touch databases, APIs, or third-party services.
They also help when you want to simulate an error that's hard to trigger in a real environment,
speed up a slow suite, verify that a function called a collaborator with the right arguments, or
replace non-deterministic dependencies like the current time, UUIDs, or random values.

## When NOT to Use

If a dependency is fast, deterministic, and simple, use the real thing instead of a mock. When you
need to validate how several real components work together, look at [Integration
Testing](/recipes/integration-testing/). And when the goal is to confirm the actual HTTP contract of
an external service, tools like [WireMock](/recipes/java-wiremock-stub-external/) or [API
Mocking](/recipes/api-mocking/) are usually more appropriate.

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

A stub is a simple stand-in that returns a canned answer. You might build a database stub that hands
back a hardcoded user record. The code under test gets the data it needs, while the stub itself
remains indifferent about whether it was called.

A mock is stricter: it's programmed with expectations and fails the test if it isn't called the
right number of times or with the right arguments. Use a mock when the interaction itself is part of
the contract.

A spy wraps a real object and records its calls so you can verify them later. You might spy on a
cache to confirm the code checked it before falling through to the database.

What matters most is mocking at the boundary, which means replacing the HTTP client or database
driver instead of private methods inside the class you're testing. Over-mocking makes tests brittle
and defeats the point of unit testing.

## Variants

| Double | Replaces | Verifies calls | Best for |
| --- | --- | --- | --- |
| Dummy | Unused parameter | No | Filling argument lists |
| Fake | Working implementation | No | In-memory database |
| Stub | Specific response | No | Returning test data |
| Spy | Real object + records | Yes | Verifying side effects |
| Mock | Expected interaction | Yes | Verifying calls made |

Use a stub when you only need to feed data into the code under test. Use a mock when the
interaction itself matters. Use a spy when the real implementation should run and you only need to
check that it was used.

## Best Practices

- Mock at the boundary, not inside the class under test. Replace the HTTP client or database driver,
  not every private method.
- Prefer stubs for state verification when you can. Asserting on the final state ("balance is $50")
  is usually more resilient to refactoring than asserting on the interaction ("withdraw was called
  once").
- Reset mock state between tests. Jest and Pytest do this automatically; in other frameworks, create
  fresh instances for each test.
- Rely on dependency injection. Code that instantiates its own dependencies with `new Database()` is
  hard to mock. Inject them via constructors or factories.
- Don't mock value objects. Simple data classes, structs, and DTOs have no real behavior, so pass
  real instances.
- Keep mock expectations narrow. Verify only the calls that matter, because over-specifying ties
  your tests to implementation details.

## Common Mistakes

- Mocking the system under test instead of its collaborators means you aren't actually testing the
  class, because internal methods have been replaced.
- Over-specifying interactions, like asserting that `database.connect()` was called exactly once,
  ties the test to implementation details that may change.
- Setting up `verify()` without calling it makes the test look complete, but it only gives the
  illusion of safety.
- Mocking every class in a test is a trap: the suite ends up testing the mocks instead of the real
  system.
- Letting mocks drift from the real contract is dangerous, because an HTTP mock that returns a
  different shape than the production API can hide real bugs.

## FAQ

### When should I use a real dependency instead of a mock?

Use the real implementation when it's fast, deterministic, and simple — for example, an in-memory
Map or a pure function. The closer your test is to production, the more useful confidence it gives
you.

### What is the difference between a stub and a mock?

A stub answers calls with preset data. A mock verifies that the expected calls were made. A mock can
act like a stub, but a stub can't act like a mock.

### Should I mock the file system?

For unit tests, yes — use virtual file systems or in-memory streams. For integration tests, write to
a temporary directory and clean up afterward.

### Can I mock static methods?

In Java, PowerMock and Mockito inline mock can do it, but you generally shouldn't. Static methods
are tricky because they can't be injected, which makes tests awkward. Refactor to instance methods
whenever you can.

### How do I avoid over-mocking?

Mock only the external dependencies that are slow, non-deterministic, or unavailable in tests. If a
collaborator is fast and deterministic, use the real implementation. When you aren't sure which
double fits your test, start with a stub and move to a mock only if you need to verify an
interaction.

### When should I use a spy?

A spy is the right choice when the real object should run and you also need to verify how it was
called. Common examples include checking that a logger wrote a warning or that a cache was consulted
before a slow
query.
