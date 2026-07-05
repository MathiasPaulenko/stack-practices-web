---
contentType: patterns
slug: fixture-setup-teardown-pattern
title: "Fixture Setup/Teardown Pattern: Reusable Test Context Lifecycle"
description: "How to use setup and teardown fixtures to create reusable test context. Covers beforeEach, factory functions, fixture objects, and cleanup with examples."
metaDescription: "Create reusable test context with setup/teardown fixtures. Learn beforeEach, factory functions, fixture objects, and cleanup patterns in Python, JS, and Java."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - fixtures
  - setup
  - teardown
  - test-context
  - pattern
category: architectural
relatedResources:
  - /patterns/test-double-pattern
  - /patterns/parameterized-test-pattern
  - /patterns/snapshot-testing-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Create reusable test context with setup/teardown fixtures. Learn beforeEach, factory functions, fixture objects, and cleanup patterns in Python, JS, and Java."
  keywords:
    - testing
    - fixtures
    - setup
    - teardown
    - test-context
    - pattern
---

## Overview

The fixture setup/teardown pattern standardizes how test context is created and cleaned up. Instead of duplicating initialization code across tests, fixtures provide reusable setup logic that runs before each test (or test suite) and teardown logic that runs after. This reduces test duplication, ensures consistent starting state, and guarantees cleanup of resources like database connections, temp files, or network sockets.

## When to Use

- Tests that share common initialization (database connections, test data, mock objects)
- Tests requiring cleanup of resources (temp files, network connections, environment variables)
- When test setup is complex or error-prone — centralize it in a fixture
- When tests must run in isolation — fixtures ensure clean state between tests
- Teams that want DRY test code — avoid copy-pasting setup across dozens of tests

## When NOT to Use

- Trivial tests with no shared setup — inline setup is simpler
- When setup is unique per test — a fixture adds indirection without benefit
- For one-off scripts — fixtures are for structured test suites
- When the fixture is more complex than the tests it serves — simplify

## Solution

### Basic setup/teardown in Jest

```javascript
// JavaScript — Jest setup/teardown
describe('UserService', () => {
  let service;
  let dbConnection;

  beforeEach(() => {
    // Setup: runs before each test
    dbConnection = createInMemoryDB();
    service = new UserService(dbConnection);
    service.createUser('Alice', 'alice@x.com');
  });

  afterEach(() => {
    // Teardown: runs after each test
    dbConnection.close();
    service = null;
  });

  test('finds existing user', () => {
    const user = service.getUserByEmail('alice@x.com');
    expect(user).toBeDefined();
    expect(user.name).toBe('Alice');
  });

  test('rejects duplicate email', () => {
    expect(() => service.createUser('Bob', 'alice@x.com')).toThrow(DuplicateEmailError);
  });
});
```

### Setup/teardown in pytest

```python
# Python — pytest with fixtures
import pytest
from myapp.services import UserService
from myapp.repositories import FakeUserRepository

@pytest.fixture
def repo():
    """Fresh in-memory repository for each test."""
    return FakeUserRepository()

@pytest.fixture
def service(repo):
    """UserService with a fresh repository."""
    return UserService(repo)

@pytest.fixture
def service_with_user(service):
    """UserService with one pre-created user."""
    service.create_user("Alice", "alice@x.com")
    return service

class TestUserService:
    def test_create_user(self, service):
        user = service.create_user("Bob", "bob@x.com")
        assert user.name == "Bob"
        assert user.email == "bob@x.com"

    def test_find_user(self, service_with_user):
        user = service_with_user.get_user_by_email("alice@x.com")
        assert user.name == "Alice"

    def test_duplicate_email(self, service_with_user):
        with pytest.raises(DuplicateEmailError):
            service_with_user.create_user("Bob", "alice@x.com")
```

### Setup/teardown with yield (pytest)

```python
# Python — pytest fixture with yield for teardown
import pytest
import tempfile
import os

@pytest.fixture
def temp_db():
    """Create a temp SQLite database, yield it, then clean up."""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    db = SQLiteDB(path)
    db.initialize_schema()

    yield db  # Test runs here

    # Teardown: runs after test
    db.close()
    os.unlink(path)

@pytest.fixture
def populated_db(temp_db):
    """Database with seed data."""
    temp_db.insert('users', {'name': 'Alice', 'email': 'alice@x.com'})
    temp_db.insert('users', {'name': 'Bob', 'email': 'bob@x.com'})
    yield temp_db

def test_user_count(populated_db):
    assert populated_db.count('users') == 2

def test_find_alice(populated_db):
    user = populated_db.find_one('users', {'name': 'Alice'})
    assert user['email'] == 'alice@x.com'
```

### Setup/teardown in JUnit

```java
// Java — JUnit 5 setup/teardown
import org.junit.jupiter.api.*;

class UserServiceTest {

    private UserService service;
    private FakeUserRepository repo;

    @BeforeEach
    void setUp() {
        // Runs before each test
        repo = new FakeUserRepository();
        service = new UserService(repo);
        service.createUser("Alice", "alice@x.com");
    }

    @AfterEach
    void tearDown() {
        // Runs after each test
        repo.clear();
        service = null;
    }

    @BeforeAll
    static void setUpAll() {
        // Runs once before all tests in the class
        System.setProperty("TEST_MODE", "true");
    }

    @AfterAll
    static void tearDownAll() {
        // Runs once after all tests in the class
        System.clearProperty("TEST_MODE");
    }

    @Test
    void testFindUser() {
        User user = service.findByEmail("alice@x.com");
        assertEquals("Alice", user.getName());
    }

    @Test
    void testDuplicateEmail() {
        assertThrows(DuplicateEmailException.class, () -> {
            service.createUser("Bob", "alice@x.com");
        });
    }
}
```

### Factory function pattern

```javascript
// JavaScript — factory function for test data
function createTestUser(overrides = {}) {
  return {
    id: 1,
    name: 'Alice',
    email: 'alice@x.com',
    role: 'member',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createTestOrder(overrides = {}) {
  return {
    id: 100,
    userId: 1,
    items: [
      { productId: 1, quantity: 2, price: 10.0 },
      { productId: 2, quantity: 1, price: 25.0 },
    ],
    status: 'pending',
    total: 45.0,
    ...overrides,
  };
}

describe('OrderService', () => {
  let service;

  beforeEach(() => {
    service = new OrderService(new FakeOrderRepository());
  });

  test('calculates order total', () => {
    const order = createTestOrder({
      items: [
        { productId: 1, quantity: 3, price: 15.0 },
      ],
    });
    const total = service.calculateTotal(order);
    expect(total).toBe(45.0);
  });

  test('rejects empty order', () => {
    const order = createTestOrder({ items: [] });
    expect(() => service.calculateTotal(order)).toThrow(EmptyOrderError);
  });

  test('applies discount for premium user', () => {
    const user = createTestUser({ role: 'premium' });
    const order = createTestOrder({ userId: user.id });
    const total = service.calculateTotal(order, user);
    expect(total).toBe(40.5); // 10% discount
  });
});
```

### Fixture object pattern

```python
# Python — fixture object bundling multiple fixtures
@pytest.fixture
def test_context():
    """Bundle all test dependencies into one object."""
    repo = FakeUserRepository()
    service = UserService(repo)
    notifier = MagicMock()
    service.set_notifier(notifier)

    class TestContext:
        def __init__(self, repo, service, notifier):
            self.repo = repo
            self.service = service
            self.notifier = notifier

        def create_user(self, name, email):
            return self.service.create_user(name, email)

        def assert_notified(self, email):
            self.notifier.send.assert_called_once()
            assert self.notifier.send.call_args.kwargs['to'] == email

    return TestContext(repo, service, notifier)

def test_user_creation_notifies(test_context):
    test_context.create_user("Alice", "alice@x.com")
    test_context.assert_notified("alice@x.com")
```

### Scoped fixtures

```python
# Python — pytest fixture scopes
@pytest.fixture(scope="session")
def test_config():
    """Loaded once per test session."""
    return load_config("test.yaml")

@pytest.fixture(scope="module")
def test_database():
    """One database per test module."""
    db = TestDatabase()
    db.connect()
    yield db
    db.disconnect()
    db.drop_all_tables()

@pytest.fixture(scope="function")
def clean_db(test_database):
    """Fresh state per test function."""
    test_database.truncate_all()
    yield test_database
    test_database.truncate_all()

class TestUserRepository:
    def test_create(self, clean_db):
        clean_db.insert('users', {'name': 'Alice'})
        assert clean_db.count('users') == 1

    def test_count_empty(self, clean_db):
        assert clean_db.count('users') == 0  # Truncated by fixture
```

### Environment variable setup/teardown

```python
# Python — manage environment variables in tests
import os
import pytest

@pytest.fixture
def env_vars():
    """Set and restore environment variables."""
    original = dict(os.environ)
    os.environ['APP_ENV'] = 'test'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['REDIS_URL'] = 'redis://localhost:6379/15'

    yield os.environ

    # Restore original environment
    os.environ.clear()
    os.environ.update(original)

def test_app_starts_in_test_mode(env_vars):
    assert env_vars['APP_ENV'] == 'test'
    assert env_vars['DATABASE_URL'] == 'sqlite:///:memory:'
```

### Nested fixtures in Jest

```javascript
// JavaScript — nested describe blocks with scoped setup
describe('OrderService', () => {
  let service;

  beforeEach(() => {
    service = new OrderService();
  });

  describe('with pending order', () => {
    let order;

    beforeEach(() => {
      order = service.createOrder({ userId: 1, total: 100 });
    });

    test('can be cancelled', () => {
      service.cancel(order.id);
      expect(service.getOrder(order.id).status).toBe('cancelled');
    });

    test('can be completed', () => {
      service.complete(order.id);
      expect(service.getOrder(order.id).status).toBe('completed');
    });
  });

  describe('with completed order', () => {
    let order;

    beforeEach(() => {
      order = service.createOrder({ userId: 1, total: 100 });
      service.complete(order.id);
    });

    test('cannot be cancelled', () => {
      expect(() => service.cancel(order.id)).toThrow(InvalidStateError);
    });
  });
});
```

## Variants

### Parameterized fixtures

```python
# Python — parametrized fixture for testing multiple configs
@pytest.fixture(params=[
    {"engine": "sqlite", "url": "sqlite:///:memory:"},
    {"engine": "postgres", "url": "postgresql://localhost/test"},
    {"engine": "mysql", "url": "mysql://localhost/test"},
])
def db(request):
    config = request.param
    db = Database.connect(config["url"])
    db.create_tables()
    yield db
    db.drop_tables()
    db.close()

def test_user_crud(db):
    db.insert('users', {'name': 'Alice'})
    user = db.find_one('users', {'name': 'Alice'})
    assert user is not None
```

### External resource fixtures

```python
# Python — fixture for Docker-based test database
import pytest
import subprocess
import time

@pytest.fixture(scope="session")
def postgres_container():
    """Start a PostgreSQL Docker container for the test session."""
    container_id = subprocess.check_output([
        "docker", "run", "-d", "-p", "5432:5432",
        "-e", "POSTGRES_PASSWORD=test",
        "postgres:16-alpine"
    ]).decode().strip()

    # Wait for PostgreSQL to be ready
    time.sleep(3)

    yield {
        "host": "localhost",
        "port": "5432",
        "password": "test",
    }

    # Teardown: stop and remove container
    subprocess.run(["docker", "stop", container_id])
    subprocess.run(["docker", "rm", container_id])
```

### Snapshot-based setup

```javascript
// JavaScript — save and restore state between tests
describe('Database migrations', () => {
  let db;

  beforeAll(async () => {
    db = await connectToTestDB();
    await db.migrate();
    // Save snapshot of clean state
    await db.snapshot('clean');
  });

  afterEach(async () => {
    // Restore to clean snapshot after each test
    await db.restore('clean');
  });

  afterAll(async () => {
    await db.close();
  });

  test('user table exists', async () => {
    const exists = await db.tableExists('users');
    expect(exists).toBe(true);
  });

  test('can insert user', async () => {
    await db.insert('users', { name: 'Alice' });
    expect(await db.count('users')).toBe(1);
  });

  test('starts with clean state', async () => {
    // This test would fail without snapshot restore
    expect(await db.count('users')).toBe(0);
  });
});
```

## Best Practices

- Keep fixtures small and focused — one fixture per concern
- Use `yield` in pytest for guaranteed teardown — even if the test fails
- Prefer composition over inheritance — compose fixtures from smaller fixtures
- Name fixtures descriptively — `service_with_user` is clearer than `setup`
- Use factory functions for test data — `createTestUser(overrides)` is flexible
- Clean up all resources — database connections, temp files, env vars, network sockets
- Use scoped fixtures wisely — `session` for expensive setup, `function` for isolation
- Don't share state between tests — each test should be independent

## Common Mistakes

- **Forgetting teardown**: leaving temp files, open connections, or modified env vars causes cascading failures. Always pair setup with teardown.
- **Over-sharing fixtures**: a `session`-scoped fixture that modifies state causes test order dependency. Use `function` scope for mutable state.
- **Complex fixtures**: if a fixture takes 50 lines, it's doing too much. Split it into smaller composable fixtures.
- **Not resetting mocks**: mocks retain call history between tests. Always reset in `afterEach` or use `jest.clearAllMocks()`.
- **Hidden side effects**: a fixture that modifies global state (env vars, working directory) without restoring it breaks other tests.

## FAQ

### What is a test fixture?

A fixture is the reusable setup and teardown logic for tests. It creates the preconditions a test needs (objects, data, connections) and cleans up afterward.

### What is the difference between beforeEach and beforeAll?

`beforeEach` runs before every test — ensures isolation. `beforeAll` runs once before all tests in a block — use for expensive setup that doesn't mutate.

### Should I use fixtures or inline setup?

Use fixtures when setup is shared across multiple tests. Use inline setup when it's unique to one test. Don't force everything into fixtures.

### What is a yield fixture in pytest?

A fixture that uses `yield` instead of `return`. Code before `yield` is setup, code after is teardown. This guarantees cleanup even if the test fails.

### How do I share fixtures across test files?

In pytest, put shared fixtures in `conftest.py` — they're automatically available to all tests in that directory. In Jest, use `setupFilesAfterEach` in config or import shared setup modules.
