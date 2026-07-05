---
contentType: recipes
slug: python-pytest-fixtures-parametrize
title: "Pytest Fixtures and Parametrize"
description: "How to use pytest fixtures and @pytest.mark.parametrize to write data-driven tests with reusable setup logic across Python projects."
metaDescription: "Use pytest fixtures and parametrize to write data-driven tests with reusable setup, teardown, and deterministic inputs across Python projects."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - pytest
  - python
  - fixtures
  - parametrize
  - data-driven
  - recipe
relatedResources:
  - /recipes/testing/setup-test-fixtures
  - /recipes/testing/measure-test-coverage
  - /recipes/testing/python-mock-external-apis-responses
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use pytest fixtures and parametrize to write data-driven tests with reusable setup, teardown, and deterministic inputs across Python projects."
  keywords:
    - testing
    - pytest
    - python
    - fixtures
    - parametrize
    - data-driven
    - recipe
---

## Overview

Pytest fixtures provide a way to set up and tear down test state through dependency injection. The `@pytest.mark.parametrize` decorator lets you run the same test function against multiple input combinations without duplicating code. Together, they eliminate boilerplate and make test intent explicit.

## When to Use

- Multiple tests need the same database, file, or mock object in a known state
- You want to test a function against many input-output pairs without writing separate tests
- Setup logic is expensive and should be shared across tests with session or module scope
- You need deterministic test data that can be varied per test case

## When NOT to Use

- The test has a single scenario with no shared setup — inline the data
- The fixture chain is more than 3 levels deep — it becomes hard to trace
- Parametrize inputs are trivial (e.g., `True`/`False`) — a simple if/else is clearer
- You are testing side effects that depend on execution order — parametrize runs in declaration order, which can hide bugs

## Solution

### Basic fixture with setup and teardown

```python
import pytest
import tempfile
import os
import json

@pytest.fixture
def temp_config_file():
    """Create a temporary config file for testing."""
    config = {"api_key": "test-key", "timeout": 30}
    fd, path = tempfile.mkstemp(suffix=".json")

    with open(path, "w") as f:
        json.dump(config, f)

    yield path  # test runs here

    os.close(fd)
    os.unlink(path)  # teardown

def test_config_loading(temp_config_file):
    with open(temp_config_file) as f:
        loaded = json.load(f)

    assert loaded["api_key"] == "test-key"
    assert loaded["timeout"] == 30
```

### Fixture scopes

```python
import pytest
import sqlite3

@pytest.fixture(scope="session")
def db_schema():
    """Create schema once per test session."""
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE);
        CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, total REAL);
    """)
    yield conn
    conn.close()

@pytest.fixture(scope="function")
def db_session(db_schema):
    """Each test gets a fresh transaction that rolls back."""
    db_schema.execute("DELETE FROM users")
    db_schema.execute("DELETE FROM orders")
    yield db_schema
    db_schema.execute("DELETE FROM users")
    db_schema.execute("DELETE FROM orders")
```

### Parametrize with multiple inputs

```python
import pytest

def is_palindrome(s: str) -> bool:
    cleaned = "".join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

@pytest.mark.parametrize("input,expected", [
    ("racecar", True),
    ("A man a plan a canal Panama", True),
    ("hello", False),
    ("", True),
    ("a", True),
    ("ab", False),
    ("Was it a car or a cat I saw", True),
])
def test_is_palindrome(input, expected):
    assert is_palindrome(input) == expected
```

### Parametrize with fixtures using indirect parameters

```python
import pytest

@pytest.fixture
def user(request):
    """Create a user with the role specified by the indirect parameter."""
    return {"id": 1, "name": "Test User", "role": request.param}

@pytest.mark.parametrize("user", ["admin", "editor", "viewer"], indirect=True)
def test_user_permissions(user):
    if user["role"] == "admin":
        assert user["role"] == "admin"
    elif user["role"] == "editor":
        assert user["role"] == "editor"
    else:
        assert user["role"] == "viewer"
```

### Combining fixtures and parametrize

```python
import pytest

@pytest.fixture
def api_client():
    class MockClient:
        def __init__(self):
            self.base_url = "http://test-api"
            self.headers = {"Authorization": "Bearer test-token"}

        def get(self, path):
            return {"status": 200, "path": path}

    return MockClient()

@pytest.mark.parametrize("endpoint,expected_status", [
    ("/users", 200),
    ("/orders", 200),
    ("/products", 200),
    ("/nonexistent", 404),
])
def test_api_endpoints(api_client, endpoint, expected_status):
    response = api_client.get(endpoint)
    if endpoint == "/nonexistent":
        assert response["status"] == 404
    else:
        assert response["status"] == expected_status
```

### Factory fixtures for dynamic test data

```python
import pytest
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Order:
    id: int
    customer_email: str
    total: float
    created_at: datetime

@pytest.fixture
def order_factory():
    """Factory that creates orders with customizable fields."""
    counter = 0

    def _create(email="test@example.com", total=99.99):
        nonlocal counter
        counter += 1
        return Order(
            id=counter,
            customer_email=email,
            total=total,
            created_at=datetime(2026, 1, 1),
        )

    return _create

def test_order_creation(order_factory):
    order = order_factory(email="customer@test.com", total=150.00)
    assert order.id == 1
    assert order.customer_email == "customer@test.com"
    assert order.total == 150.00

def test_multiple_orders(order_factory):
    o1 = order_factory()
    o2 = order_factory()
    assert o1.id != o2.id
```

### Conftest.py for shared fixtures

```python
# tests/conftest.py
import pytest
import os

@pytest.fixture(scope="session")
def test_env():
    os.environ["APP_ENV"] = "test"
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    yield
    os.environ.pop("APP_ENV", None)
    os.environ.pop("DATABASE_URL", None)

@pytest.fixture(autouse=True)
def reset_state(test_env):
    """Auto-applied to every test in the directory."""
    yield
```

## Variants

### Using `pytest.generate_tests` for dynamic parametrization

```python
def test_dynamic_inputs(db_session):
    pass

def pytest_generate_tests(metafunc):
    if "db_session" in metafunc.fixturenames:
        metafunc.parametrize("db_session", ["sqlite", "postgres"], indirect=True)
```

### Parametrize with `pytest.param` and IDs

```python
@pytest.mark.parametrize("a,b,expected", [
    pytest.param(1, 2, 3, id="one_plus_two"),
    pytest.param(10, 20, 30, id="ten_plus_twenty"),
    pytest.param(-1, 1, 0, id="negative_plus_positive"),
])
def test_addition(a, b, expected):
    assert a + b == expected
```

## Best Practices

- Use `conftest.py` for fixtures shared across multiple test files — avoid imports
- Prefer `scope="session"` or `scope="module"` for expensive setup (DB connections, HTTP servers)
- Name fixtures descriptively: `temp_config_file` not `cfg`
- Use `pytest.param` with `id=` to make parametrized test names readable in CI output
- Keep fixture chains shallow — if a fixture depends on 3+ other fixtures, refactor
- Use `autouse=True` sparingly — it makes test behavior implicit and harder to debug

## Common Mistakes

- **Using `scope="session"` for mutable state**: tests share the same object and can pollute each other. Use function scope or add cleanup in the fixture.
- **Forgetting teardown after `yield`**: if the yield fixture raises, teardown still runs, but if teardown raises, the original error is masked.
- **Over-parametrizing**: 50+ parametrize cases slow down the suite. Split into focused tests or use a subset for CI and the full set for nightly runs.
- **Not setting `ids` in parametrize**: default IDs use the raw parameter values, which can be unreadable for complex objects.
- **Importing fixtures across files**: fixtures defined in `conftest.py` are available without import. Defining them in a regular module requires explicit import.

## FAQ

### How do I share fixtures across test directories?

Place them in a `conftest.py` at the root of your test directory. Pytest discovers `conftest.py` files automatically — fixtures defined there are available to all tests in that directory and subdirectories.

### Can I parametrize a fixture instead of a test?

Yes. Use `params` in the `@pytest.fixture` decorator:

```python
@pytest.fixture(params=["sqlite", "postgres", "mysql"])
def db_engine(request):
    engine = create_engine(request.param)
    yield engine
    engine.dispose()
```

Every test that depends on `db_engine` runs once per parameter.

### How do I skip specific parametrize cases?

Use `pytest.param(..., marks=pytest.mark.skip(reason="..."))`:

```python
@pytest.mark.parametrize("input,expected", [
    pytest.param("case1", True, id="normal"),
    pytest.param("case2", False, marks=pytest.mark.skip(reason="Known bug #42"), id="skipped"),
])
def test_logic(input, expected):
    assert check(input) == expected
```

### What is the difference between direct and indirect parametrize?

Direct parametrize passes the raw value to the test function. Indirect parametrize passes the value to a fixture (via `request.param`), which can transform it before the test receives it.

### How do I run only one parametrize case?

Use the node ID: `pytest tests/test_math.py::test_addition[ten_plus_twenty]`. The ID in brackets matches the `id=` parameter or the auto-generated string representation.
