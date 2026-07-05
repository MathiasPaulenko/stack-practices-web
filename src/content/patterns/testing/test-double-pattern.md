---
contentType: patterns
slug: test-double-pattern
title: "Test Double Pattern: Replace Dependencies with Stubs, Spies, Fakes, and Mocks"
description: "How to use test doubles to isolate units under test. Covers stubs, spies, fakes, mocks, and dummy objects with examples in Python, JavaScript, and Java."
metaDescription: "Replace dependencies with test doubles — stubs, spies, fakes, mocks, and dummies. Learn when to use each type with Python, JavaScript, and Java examples."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - test-doubles
  - mocking
  - stubs
  - spies
  - fakes
  - pattern
category: architectural
relatedResources:
  - /patterns/fixture-setup-teardown-pattern
  - /patterns/parameterized-test-pattern
  - /patterns/mock-server-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Replace dependencies with test doubles — stubs, spies, fakes, mocks, and dummies. Learn when to use each type with Python, JavaScript, and Java examples."
  keywords:
    - testing
    - test-doubles
    - mocking
    - stubs
    - spies
    - fakes
    - pattern
---

## Overview

A test double is any object that stands in for a real dependency during testing. The term comes from Gerard Meszaros (xUnit Test Patterns), who categorized test doubles into five types: **dummy**, **stub**, **spy**, **fake**, and **mock**. Each serves a different purpose — providing canned responses, recording interactions, simplifying complex behavior, or verifying calls. Understanding the distinction helps you write tests that are focused, fast, and resilient to external changes.

## When to Use

- Isolating a unit from its dependencies (databases, APIs, file systems, message queues)
- Testing error paths that are hard to trigger with real dependencies
- Speeding up test suites by replacing slow I/O with in-memory alternatives
- Verifying interaction patterns (e.g., "was `send_email` called with the right address?")
- Testing code that depends on external services not available in CI

## When NOT to Use

- Integration tests — use real dependencies to verify end-to-end behavior
- When the dependency is simple and fast — no need to double a pure function
- When the double is more complex than the real thing — test the real dependency instead
- For testing behavior you don't own — if the external API changes, your mock won't catch it

## Solution

### Types of Test Doubles

| Type | Purpose | Example |
|------|---------|---------|
| **Dummy** | Passed but never used | Null logger parameter |
| **Stub** | Returns canned responses | `getUser()` always returns `{id: 1}` |
| **Spy** | Records calls for later verification | Captures `send_email("alice@x.com")` |
| **Fake** | Working but simplified implementation | In-memory database instead of PostgreSQL |
| **Mock** | Pre-programmed expectations | "Expect `save()` called exactly once" |

### Dummy — Placeholder object

```python
# Python — dummy logger passed but never used
class DummyLogger:
    def info(self, msg): pass
    def error(self, msg): pass
    def warning(self, msg): pass

class OrderProcessor:
    def __init__(self, logger):
        self.logger = logger

    def process(self, order):
        # logger is never called in this test scenario
        return order.total * 1.1

def test_process_order():
    processor = OrderProcessor(DummyLogger())
    result = processor.process(Order(total=100))
    assert result == 110.0
```

### Stub — Returns canned responses

```python
# Python — stub for a user repository
class UserRepositoryStub:
    def __init__(self, user=None):
        self.user = user

    def find_by_id(self, user_id):
        return self.user

    def save(self, user):
        pass

def test_get_user_name():
    repo = UserRepositoryStub(user=User(id=1, name="Alice"))
    service = UserService(repo)
    assert service.get_name(1) == "Alice"

def test_get_user_name_not_found():
    repo = UserRepositoryStub(user=None)
    service = UserService(repo)
    with pytest.raises(NotFoundError):
        service.get_name(999)
```

```javascript
// JavaScript — stub with jest
const userRepo = {
  findById: jest.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
  save: jest.fn().mockResolvedValue(true),
};

const service = new UserService(userRepo);

test('getUserName returns name', async () => {
  const name = await service.getUserName(1);
  expect(name).toBe('Alice');
  expect(userRepo.findById).toHaveBeenCalledWith(1);
});
```

### Spy — Records interactions for verification

```python
# Python — spy with unittest.mock
from unittest.mock import MagicMock

def test_email_sent_on_order():
    email_service = MagicMock()
    notifier = OrderNotifier(email_service)

    notifier.notify_order_completed(Order(id=42, customer_email="alice@x.com"))

    # Verify the spy recorded the call
    email_service.send.assert_called_once_with(
        to="alice@x.com",
        subject="Order #42 completed",
    )

def test_email_spy_records_multiple_calls():
    email_service = MagicMock()
    notifier = OrderNotifier(email_service)

    notifier.notify_order_completed(Order(id=1, customer_email="a@x.com"))
    notifier.notify_order_completed(Order(id=2, customer_email="b@x.com"))

    assert email_service.send.call_count == 2
    calls = email_service.send.call_args_list
    assert calls[0].kwargs['to'] == "a@x.com"
    assert calls[1].kwargs['to'] == "b@x.com"
```

```javascript
// JavaScript — spy with jest
const emailService = {
  send: jest.fn(),
};

const notifier = new OrderNotifier(emailService);

test('email sent on order completion', () => {
  notifier.notifyOrderCompleted({ id: 42, customerEmail: 'alice@x.com' });

  expect(emailService.send).toHaveBeenCalledTimes(1);
  expect(emailService.send).toHaveBeenCalledWith({
    to: 'alice@x.com',
    subject: 'Order #42 completed',
  });
});
```

### Fake — Simplified working implementation

```python
# Python — fake in-memory repository
class FakeUserRepository:
    def __init__(self):
        self._users = {}
        self._next_id = 1

    def create(self, name, email):
        user = User(id=self._next_id, name=name, email=email)
        self._users[self._next_id] = user
        self._next_id += 1
        return user

    def find_by_id(self, user_id):
        return self._users.get(user_id)

    def find_by_email(self, email):
        return next((u for u in self._users.values() if u.email == email), None)

    def delete(self, user_id):
        return self._users.pop(user_id, None) is not None

    def count(self):
        return len(self._users)

def test_create_and_find_user():
    repo = FakeUserRepository()
    service = UserService(repo)

    user = service.create_user("Alice", "alice@x.com")
    found = service.get_user(user.id)

    assert found.name == "Alice"
    assert found.email == "alice@x.com"

def test_duplicate_email_rejected():
    repo = FakeUserRepository()
    service = UserService(repo)

    service.create_user("Alice", "alice@x.com")
    with pytest.raises(DuplicateEmailError):
        service.create_user("Bob", "alice@x.com")
```

```java
// Java — fake in-memory repository
public class FakeUserRepository implements UserRepository {
    private final Map<Long, User> users = new HashMap<>();
    private long nextId = 1;

    @Override
    public User create(String name, String email) {
        User user = new User(nextId, name, email);
        users.put(nextId, user);
        nextId++;
        return user;
    }

    @Override
    public User findById(long id) {
        return users.get(id);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return users.values().stream()
            .filter(u -> u.getEmail().equals(email))
            .findFirst();
    }

    @Override
    public boolean delete(long id) {
        return users.remove(id) != null;
    }

    @Override
    public long count() {
        return users.size();
    }
}

// Test using the fake
@Test
void testCreateAndFindUser() {
    UserRepository repo = new FakeUserRepository();
    UserService service = new UserService(repo);

    User user = service.createUser("Alice", "alice@x.com");
    User found = service.getUser(user.getId());

    assertEquals("Alice", found.getName());
    assertEquals("alice@x.com", found.getEmail());
}
```

### Mock — Pre-programmed expectations

```java
// Java — mock with Mockito
import static org.mockito.Mockito.*;

@Test
void testOrderProcessingCallsRepository() {
    // Create mock
    OrderRepository repo = mock(OrderRepository.class);
    PaymentGateway gateway = mock(PaymentGateway.class);
    OrderProcessor processor = new OrderProcessor(repo, gateway);

    // Program expectations
    when(repo.findById(1L)).thenReturn(new Order(1L, 100.0));
    when(gateway.charge(anyString(), eq(100.0))).thenReturn(true);

    // Execute
    boolean result = processor.processOrder(1L, "card-token-123");

    // Verify interactions
    assertTrue(result);
    verify(repo).findById(1L);
    verify(repo).save(argThat(order -> order.getStatus() == OrderStatus.COMPLETED));
    verify(gateway, times(1)).charge("card-token-123", 100.0);
    verifyNoMoreInteractions(repo, gateway);
}
```

```javascript
// JavaScript — mock with jest
const orderRepo = {
  findById: jest.fn(),
  save: jest.fn(),
};
const paymentGateway = {
  charge: jest.fn(),
};

const processor = new OrderProcessor(orderRepo, paymentGateway);

beforeEach(() => {
  jest.clearAllMocks();
});

test('processOrder completes successfully', async () => {
  orderRepo.findById.mockResolvedValue({ id: 1, total: 100.0 });
  paymentGateway.charge.mockResolvedValue(true);

  const result = await processor.processOrder(1, 'card-token-123');

  expect(result).toBe(true);
  expect(orderRepo.findById).toHaveBeenCalledWith(1);
  expect(paymentGateway.charge).toHaveBeenCalledWith('card-token-123', 100.0);
  expect(orderRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'COMPLETED' })
  );
});
```

### Choosing the right double

```python
# Decision guide:
# 1. Need to pass something but it's never called? → DUMMY
# 2. Need controlled return values? → STUB
# 3. Need to verify a method was called? → SPY
# 4. Need working but simplified behavior? → FAKE
# 5. Need to assert exact call sequences? → MOCK

# Example: Use a FAKE for repository, SPY for email
class TestOrderService:
    def setup_method(self):
        self.repo = FakeOrderRepository()  # Fake — working implementation
        self.email_service = MagicMock()   # Spy — verify calls
        self.service = OrderService(self.repo, self.email_service)

    def test_order_triggers_email(self):
        order = self.service.create_order(customer_id=1, total=50.0)

        # Verify state with fake
        saved = self.repo.find_by_id(order.id)
        assert saved.status == "PENDING"

        # Verify interaction with spy
        self.email_service.send.assert_called_once()
        call_args = self.email_service.send.call_args
        assert "order" in call_args.kwargs['subject'].lower()
```

## Variants

### Auto-mocking with dependency injection

```python
# Python — pytest with fixture-based auto-mocking
@pytest.fixture
def mock_repo():
    return MagicMock(spec=UserRepository)

@pytest.fixture
def service(mock_repo):
    return UserService(mock_repo)

def test_get_user(service, mock_repo):
    mock_repo.find_by_id.return_value = User(id=1, name="Alice")
    result = service.get_user(1)
    assert result.name == "Alice"
```

### Mock vs Fake for database tests

```python
# Approach 1: Mock the repository (fast but brittle)
def test_with_mock():
    repo = MagicMock()
    repo.find_by_id.return_value = User(id=1, name="Alice")
    # Test breaks if implementation calls repo differently

# Approach 2: Fake repository (fast and resilient)
def test_with_fake():
    repo = FakeUserRepository()
    repo.create("Alice", "alice@x.com")
    # Test focuses on behavior, not implementation details
```

### Partial mock — spy on real object

```python
# Python — partial mock: real object with one method spied
from unittest.mock import patch

def test_with_partial_mock():
    service = RealOrderService(real_repo, real_email)

    # Only mock the email call, everything else is real
    with patch.object(service, 'send_notification') as mock_send:
        service.process_order(Order(id=1, total=100))
        mock_send.assert_called_once()
```

### Test double with dependency injection container

```java
// Java — Spring test with mocked beans
@SpringBootTest
class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @MockBean
    private PaymentGateway paymentGateway;

    @Test
    void testOrderWithMockedPayment() {
        when(paymentGateway.charge(anyString(), anyDouble()))
            .thenReturn(true);

        Order order = orderService.createOrder(1L, 100.0);

        assertEquals(OrderStatus.COMPLETED, order.getStatus());
        verify(paymentGateway).charge(anyString(), eq(100.0));
    }
}
```

## Best Practices

- Prefer fakes over mocks — fakes test behavior, mocks test implementation
- Use the simplest double that works — dummy > stub > spy > fake > mock
- Mock at boundaries — double external APIs, databases, file systems; not your own logic
- Reset spies/mocks between tests — avoid state leakage
- Don't mock value objects — use real instances instead
- Verify behavior, not implementation — assert what was called, not how it was called
- Keep fakes realistic — a fake that doesn't behave like the real thing gives false confidence
- Use `spec` in Python / `jest.fn()` typing — ensures the double matches the real interface

## Common Mistakes

- **Over-mocking**: mocking every dependency makes tests brittle and tests the mocks, not the code. Use fakes or real implementations where possible.
- **Mocking what you don't own**: if the external API changes, your mock won't catch it. Use contract tests instead.
- **Not resetting mocks**: state from a previous test leaks into the next. Always reset in `beforeEach` / `setup`.
- **Verifying too many details**: `verify(mock).method(arg1, arg2, arg3)` with exact args is brittle. Use matchers for flexibility.
- **Using mocks for simple value returns**: if a method just returns data, use a stub or fake. Mocks add unnecessary complexity.

## FAQ

### What is the difference between a mock and a stub?

A stub returns canned responses — you control what it returns. A mock has expectations — you verify it was called with specific arguments. Stubs are about state, mocks are about interaction.

### What is a fake?

A fake is a working but simplified implementation of a dependency. An in-memory database is a fake — it works like a real database but doesn't persist. Fakes are preferred over mocks because they test behavior, not implementation.

### When should I use a spy vs a mock?

Use a spy when you want to record calls and verify them after. Use a mock when you want to set up expectations before the call. Spies are more flexible, mocks are more strict.

### Should I mock the database or use a real one?

Prefer a fake (in-memory) or a real test database over mocking. Mocking the database tests your mock, not your queries. Use a real database for integration tests and a fake for unit tests.

### What is a dummy object?

A dummy is a placeholder passed to satisfy an interface but never actually used. For example, passing `null` or a no-op logger when the code under test doesn't log anything.
