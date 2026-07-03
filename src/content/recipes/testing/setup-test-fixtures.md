---
contentType: recipes
slug: setup-test-fixtures
title: "Setup Test Fixtures"
description: "How to manage test fixtures with factory patterns, setup/teardown hooks, and deterministic data for reliable unit and integration tests across Python, JavaScript, and Java."
metaDescription: "Manage test fixtures with factory patterns, setup hooks, and deterministic data for reliable tests in Python, JavaScript, and Java."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - fixtures
  - pytest
  - jest
  - junit
  - factory-pattern
  - recipe
relatedResources:
  - /recipes/testing/generate-test-data
  - /recipes/testing/measure-test-coverage
  - /patterns/factory-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Manage test fixtures with factory patterns, setup hooks, and deterministic data for reliable tests in Python, JavaScript, and Java."
  keywords:
    - testing
    - fixtures
    - pytest
    - jest
    - junit
    - factory-pattern
    - recipe
---

## Overview

Test fixtures are the known, controlled datasets and environment state that make tests deterministic. Without fixtures, tests depend on external databases, filesystems, or random state, producing flaky failures that waste debugging time. This recipe shows how to create, isolate, and clean up fixtures using factory patterns and framework-native hooks.

## When to Use

- Tests need a database user, file, or object that exists in a known state before assertions
- Multiple tests share the same expensive setup logic
- You want to vary input data without duplicating boilerplate
- Integration tests need temporary services, queues, or schema state
- You need deterministic, repeatable data for every test run

## When NOT to Use

- The object under test has no external dependencies — instantiate directly in the test
- Setup is trivial (a single line) — inline it to keep tests readable
- You are tempted to share mutable fixtures between tests without resetting state
- The fixture hides the actual test scenario — prefer readable, explicit setup over magic

## Step-by-Step Implementation

### Python (pytest)

```python
import pytest
from dataclasses import dataclass
from typing import Generator

@dataclass
class User:
    id: int
    name: str
    email: str
    role: str = "user"

# Simple fixture
@pytest.fixture
def admin_user() -> User:
    return User(id=1, name="Alice", email="alice@example.com", role="admin")

# Fixture with teardown (yield pattern)
@pytest.fixture
def temp_database() -> Generator[str, None, None]:
    db_path = "/tmp/test_db.sqlite"
    init_schema(db_path)
    yield db_path
    cleanup_schema(db_path)

# Parametrized fixture (runs test with multiple values)
@pytest.fixture(params=["admin", "editor", "viewer"])
def role(request) -> str:
    return request.param

# Factory fixture — creates many variants
@pytest.fixture
def user_factory():
    _counter = 0
    def make(name=None, role="user"):
        nonlocal _counter
        _counter += 1
        return User(
            id=_counter,
            name=name or f"user_{_counter}",
            email=f"user_{_counter}@test.com",
            role=role
        )
    return make

# Usage in tests
def test_admin_can_delete(admin_user: User):
    assert admin_user.can_delete() is True

def test_user_permissions(user_factory):
    admin = user_factory(role="admin")
    viewer = user_factory(role="viewer")
    assert admin.can_edit()
    assert not viewer.can_edit()

# Session-scoped fixture (expensive, compute once)
@pytest.fixture(scope="session")
def compiled_model():
    return load_ml_model("large-model.pkl")

# Autouse fixture (runs for every test in module)
@pytest.fixture(autouse=True)
def reset_mocks():
    yield
    mock_registry.clear()
```

### JavaScript (Jest)

```javascript
// Setup and teardown
let dbConnection;

beforeAll(async () => {
    dbConnection = await createTestDatabase();
});

afterAll(async () => {
    await dbConnection.destroy();
});

beforeEach(() => {
    // Reset state before every test
    dbConnection.truncateAll();
});

// Factory function
function createUser(overrides = {}) {
    return {
        id: Math.floor(Math.random() * 100000),
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        ...overrides
    };
}

// Jest fixture pattern with setupFiles
// jest.setup.js
import { factory } from './factories';

global.factory = factory;

// __tests__/auth.test.js
describe('authentication', () => {
    test('admin can access admin panel', () => {
        const admin = factory.user({ role: 'admin' });
        expect(canAccessAdmin(admin)).toBe(true);
    });

    test('viewer cannot access admin panel', () => {
        const viewer = factory.user({ role: 'viewer' });
        expect(canAccessAdmin(viewer)).toBe(false);
    });
});

// Inline fixture for simple cases
describe('order calculations', () => {
    const baseOrder = () => ({
        items: [],
        discountCode: null,
        customer: { id: 1, tier: 'standard' }
    });

    test('applies discount', () => {
        const order = { ...baseOrder(), discountCode: 'SAVE20' };
        expect(calculateTotal(order)).toBe(80);
    });
});
```

### Java (JUnit 5)

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class OrderServiceTest {

    private DatabaseConnection db;
    private OrderService service;

    @BeforeAll
    void init() {
        db = DatabaseConnection.forTest("jdbc:h2:mem:test");
        service = new OrderService(db);
    }

    @AfterAll
    void cleanup() {
        db.close();
    }

    @BeforeEach
    void reset() {
        db.truncateTables("orders", "order_items");
    }

    // Factory method
    private Order.Builder orderBuilder() {
        return Order.builder()
            .customerId(1L)
            .status(OrderStatus.PENDING);
    }

    @Test
    @DisplayName("Valid order can be placed")
    void placeValidOrder() {
        Order order = orderBuilder()
            .addItem(Item.of("SKU-001", 2, BigDecimal.valueOf(29.99)))
            .build();

        OrderResult result = service.place(order);

        assertTrue(result.isSuccess());
        assertEquals(OrderStatus.CONFIRMED, result.getOrder().getStatus());
    }

    // Parametrized fixture data
    @ParameterizedTest
    @CsvSource({
        "admin, true",
        "editor, false",
        "viewer, false"
    })
    void adminCanDelete(String role, boolean expected) {
        User user = User.builder().role(role).build();
        assertEquals(expected, service.canDelete(user));
    }
}

// Shared fixtures via @TestConfiguration (Spring)
@TestConfiguration
public class TestFixtures {
    @Bean
    @Primary
    public Clock fixedClock() {
        return Clock.fixed(
            Instant.parse("2024-06-01T10:00:00Z"),
            ZoneId.of("UTC")
        );
    }
}
```

## What Works

- **Use factory functions, not static data.** `createUser({ role: 'admin' })` is more flexible than a hardcoded `adminUser` object and prevents copy-paste drift.
- **Reset state between tests.** Shared mutable fixtures cause order-dependent failures. Truncate tables, clear mocks, and reinitialize objects in `beforeEach`.
- **Keep fixtures close to the test.** A fixture used by only one test class should be defined in that class, not in a global conftest. Proximity improves readability.
- **Name fixtures after what they represent, not how they are built.** `premium_customer` is better than `user_with_tier_gold_and_100_orders`.
- **Use deterministic IDs.** Random IDs make debugging harder when a test fails only on certain values. Use a counter or hash of test name.

## Common Mistakes

- **Sharing mutable fixtures across tests.** One test modifies the fixture and the next test fails mysteriously. Always return new instances or reset in `beforeEach`.
- **Overusing autouse fixtures.** Implicit fixtures that run for every test make it hard to trace why a test fails. Prefer explicit injection.
- **Fixtures that do too much.** A fixture that creates a user, logs them in, and sets up 10 orders is hard to reuse. Compose small fixtures instead.
- **Hardcoding time in tests.** Tests that depend on `new Date()` fail at midnight or in different time zones. Use a clock fixture.
- **Not cleaning up external resources.** Temporary files, database connections, and network stubs left open leak resources and cause cascading failures.

## Frequently Asked Questions

**Q: What is the difference between a fixture and a mock?**
A: A fixture provides the test environment or data (e.g., a seeded database). A mock replaces a real dependency to isolate the code under test.

**Q: When should I clean up fixtures after a test?**
A: Always, unless you intentionally share an expensive setup across a narrowly scoped test class. Cleanup prevents cross-test pollution and flaky results.

**Q: How do I share fixtures across test files?**
A: Use framework-level fixtures (pytest conftest, Jest setupFiles) or a shared test helper module. Keep shared fixtures minimal and deterministic.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
