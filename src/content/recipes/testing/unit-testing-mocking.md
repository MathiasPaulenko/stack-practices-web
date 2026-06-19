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

A well-isolated unit test runs in milliseconds, produces the same result every time, and fails only when the code under test — not its dependencies — is broken. This recipe covers the three essential test doubles: stubs (fake data), mocks (behavior verification), and spies (call recording).

## When to Use

Use this recipe when:

- Writing unit tests for code that calls databases, APIs, or third-party services
- Testing error handling for scenarios that are hard to trigger in real systems
- Speeding up a slow test suite dominated by integration-style tests
- Verifying that a function calls a collaborator with the correct arguments
- Replacing non-deterministic dependencies (random generators, current time, UUIDs)

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

## Best Practices

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

## Frequently Asked Questions

**Q: When should I use a real dependency instead of a mock?**
A: When the dependency is fast, deterministic, and simple — for example, an in-memory Map or a pure function. The closer your test is to production, the more confidence it provides.

**Q: What is the difference between a stub and a mock?**
A: A stub answers calls with preset data. A mock verifies that expected calls were made. You can use a mock as a stub, but not vice versa.

**Q: Should I mock the file system?**
A: For unit tests, yes — use virtual file systems or in-memory streams. For integration tests, write to a temporary directory and clean up afterward.

**Q: Can I mock static methods?**
A: In Java, PowerMock and Mockito inline mock can do this, but it is discouraged. Static methods are hard to test because they cannot be injected. Refactor to instance methods when possible.

