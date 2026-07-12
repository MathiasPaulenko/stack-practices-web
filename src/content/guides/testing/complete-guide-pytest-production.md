---




contentType: guides
slug: complete-guide-pytest-production
title: "Pytest in Production Guide"
description: "Master pytest for production codebases: advanced fixtures, plugins, custom markers, parametrized tests, parallel execution with pytest-xdist, and CI integration."
metaDescription: "Master pytest for production: advanced fixtures, plugins, custom markers, parametrized tests, parallel execution with pytest-xdist, and CI integration patterns."
difficulty: intermediate
topics:
  - testing
tags:
  - guide
  - pytest
  - python
  - testing
  - fixtures
  - plugins
  - parallel
  - ci
relatedResources:
  - /guides/test-driven-development-guide
  - /guides/testing-strategy-guide
  - /recipes/api-mocking
  - /guides/complete-guide-property-based-testing
  - /guides/complete-guide-testcontainers-integration
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 25
seo:
  metaDescription: "Master pytest for production: advanced fixtures, plugins, custom markers, parametrized tests, parallel execution with pytest-xdist, and CI integration patterns."
  keywords:
    - pytest production
    - pytest fixtures
    - pytest plugins
    - pytest xdist
    - pytest markers
    - parametrized tests
    - parallel testing python




---

## Introduction

Pytest is the most popular Python testing framework, but most teams only scratch the surface. Production codebases need more than basic `assert` statements — they need reusable fixtures, custom markers for test organization, parallel execution for speed, plugins for shared functionality, and CI integration that provides actionable feedback. Here is a hands-on guide to everything you need to run pytest at scale: from fixture factories and conftest patterns to xdist parallelization and custom plugin development.

## Fixture Fundamentals

### Basic fixtures

```python
# tests/conftest.py — Shared fixtures
import pytest
from myapp.db import Database
from myapp.models import User

@pytest.fixture
def db():
    """Provide a test database connection."""
    db = Database("postgresql://localhost/test_db")
    db.create_tables()
    yield db
    db.drop_tables()
    db.close()

@pytest.fixture
def user(db):
    """Create a test user in the database."""
    return User.create(db, email="test@example.com", name="Test User")
```

### Fixture scopes

```python
# tests/conftest.py — Fixture scopes control lifecycle
import pytest

@pytest.fixture(scope="function")
def function_scoped():
    """Created and destroyed for each test (default)."""
    return {"count": 0}

@pytest.fixture(scope="class")
def class_scoped():
    """Created once per test class."""
    return {"count": 0}

@pytest.fixture(scope="module")
def module_scoped():
    """Created once per module."""
    return {"count": 0}

@pytest.fixture(scope="session")
def session_scoped():
    """Created once for the entire test session."""
    return {"count": 0}

# Scope hierarchy: session > module > class > function
# Higher-scoped fixtures are created first and destroyed last
```

### Fixture factories with closures

```python
# tests/conftest.py — Dynamic fixture factories
import pytest
from myapp.models import Order, Product

@pytest.fixture
def make_order(db):
    """Factory fixture: creates orders with custom data."""
    created = []

    def _make(**kwargs):
        defaults = {
            "product": Product.create(db, name="Widget", price=10.00),
            "quantity": 1,
            "status": "pending",
        }
        defaults.update(kwargs)
        order = Order.create(db, **defaults)
        created.append(order)
        return order

    yield _make

    # Cleanup all created orders
    for order in created:
        order.delete(db)

# Usage
def test_order_processing(db, make_order):
    order = make_order(quantity=5, status="shipped")
    assert order.total == 50.00

def test_multiple_orders(db, make_order):
    o1 = make_order(quantity=2)
    o2 = make_order(quantity=3)
    assert Order.count(db) == 2
```

### Fixture parametrization

```python
# tests/test_calculator.py — Parametrize fixtures
import pytest

@pytest.fixture(params=[
    {"input": [1, 2], "expected": 3},
    {"input": [0, 0], "expected": 0},
    {"input": [-1, 1], "expected": 0},
    {"input": [100, 200], "expected": 300},
])
def calc_case(request):
    return request.param

def test_add(calc_case):
    from myapp.calculator import add
    result = add(*calc_case["input"])
    assert result == calc_case["expected"]
```

### Fixture dependency chains

```python
# tests/conftest.py — Fixtures depending on fixtures
import pytest
from myapp.app import create_app
from myapp.db import Database

@pytest.fixture(scope="session")
def db():
    db = Database("postgresql://localhost/test_db")
    db.create_tables()
    yield db
    db.drop_tables()

@pytest.fixture(scope="session")
def app(db):
    app = create_app(db, testing=True)
    yield app

@pytest.fixture(scope="function")
def client(app):
    """Test client for HTTP requests."""
    with app.test_client() as client:
        yield client

@pytest.fixture(scope="function")
def auth_client(client, db):
    """Authenticated test client."""
    from myapp.models import User
    user = User.create(db, email="test@example.com", password="hashed")
    token = user.generate_token()
    client.headers["Authorization"] = f"Bearer {token}"
    yield client
    user.delete(db)
```

## Custom Markers

### Built-in markers

```python
# tests/test_api.py — Using built-in markers
import pytest

@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    pass

@pytest.mark.skipif(
    sys.platform == "win32",
    reason="Unix-only feature"
)
def test_unix_feature():
    pass

@pytest.mark.xfail(reason="Known bug #123")
def test_known_bug():
    assert buggy_function() == expected

@pytest.mark.slow
def test_large_dataset():
    data = load_large_dataset()
    assert process(data) is not None
```

### Custom markers

```python
# pytest.ini — Register custom markers
```

```ini
[pytest]
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    unit: marks tests as unit tests
    smoke: marks tests as smoke tests
    security: marks tests as security tests
    requires_db: marks tests that need a database
    requires_redis: marks tests that need Redis
```

```python
# tests/test_orders.py — Using custom markers
import pytest

@pytest.mark.unit
def test_order_calculation():
    assert calculate_total(10, 2) == 20

@pytest.mark.integration
@pytest.mark.requires_db
def test_order_persistence(db, make_order):
    order = make_order()
    fetched = Order.get(db, order.id)
    assert fetched.status == "pending"

@pytest.mark.smoke
def test_api_responds(client):
    response = client.get("/health")
    assert response.status_code == 200

@pytest.mark.security
def test_sql_injection_prevention(client):
    response = client.get("/api/users?id=1; DROP TABLE users")
    assert response.status_code == 400
```

### Running by marker

```bash
# Run only unit tests
pytest -m unit

# Run everything except slow tests
pytest -m "not slow"

# Run integration and security tests
pytest -m "integration or security"

# Run smoke tests only, stop on first failure
pytest -m smoke -x

# Run tests that need database but not Redis
pytest -m "requires_db and not requires_redis"
```

## Parametrized Tests

### Basic parametrization

```python
# tests/test_string_utils.py — Parametrized tests
import pytest
from myapp.utils import normalize_email

@pytest.mark.parametrize("input, expected", [
    ("User@Example.COM", "user@example.com"),
    ("  user@example.com  ", "user@example.com"),
    ("USER+tag@example.com", "user+tag@example.com"),
    ("user.name@example.com", "user.name@example.com"),
    ("", ""),
    (None, None),
])
def test_normalize_email(input, expected):
    assert normalize_email(input) == expected
```

### Parametrization with IDs

```python
# tests/test_pagination.py — Named parametrized cases
import pytest

@pytest.mark.parametrize(
    "page, per_page, expected_offset",
    [
        pytest.param(1, 10, 0, id="first-page"),
        pytest.param(2, 10, 10, id="second-page"),
        pytest.param(3, 20, 40, id="third-page-larger"),
        pytest.param(10, 5, 45, id="tenth-page-small"),
    ]
)
def test_pagination_offset(page, per_page, expected_offset):
    assert calculate_offset(page, per_page) == expected_offset
```

### Multi-parameter parametrization

```python
# tests/test_validation.py — Complex parametrization
import pytest
from myapp.validators import validate_password

@pytest.mark.parametrize("password, is_valid, errors_count", [
    ("Short1!", False, 1),
    ("NoDigitsHere!", False, 1),
    ("nouppercase1!", False, 1),
    ("NOLOWERCASE1!", False, 1),
    ("ValidPass1!", True, 0),
    ("AnotherValid123$", True, 0),
])
def test_password_validation(password, is_valid, errors_count):
    result = validate_password(password)
    assert result.is_valid == is_valid
    assert len(result.errors) == errors_count
```

### Parametrize with fixtures (indirect)

```python
# tests/test_api_endpoints.py — Indirect parametrization
import pytest

@pytest.fixture
def api_client(request):
    """Create client with specific auth level."""
    auth_level = request.param
    client = create_test_client(auth=auth_level)
    return client

@pytest.mark.parametrize("api_client", ["admin", "user", "guest"], indirect=True)
def test_get_user_profile(api_client):
    response = api_client.get("/api/profile")
    assert response.status_code in [200, 403]
```

## Parallel Execution with pytest-xdist

### Basic parallel execution

```bash
# Run tests in parallel using all CPU cores
pytest -n auto

# Run with specific number of workers
pytest -n 4

# Run with load balancing (default is load scope)
pytest -n 4 --dist loadscope

# Run with loadfile distribution (per-file)
pytest -n 4 --dist loadfile
```

### Parallel-safe fixtures

```python
# tests/conftest.py — xdist-compatible fixtures
import pytest
import uuid
from myapp.db import Database

@pytest.fixture(scope="session")
def db_url():
    """Each worker gets its own database."""
    worker_id = os.environ.get("PYTEST_XDIST_WORKER", "gw0")
    return f"postgresql://localhost/test_db_{worker_id}"

@pytest.fixture(scope="session")
def db(db_url):
    db = Database(db_url)
    db.create_tables()
    yield db
    db.drop_tables()

@pytest.fixture(scope="function")
def unique_email():
    """Generate unique email per test to avoid collisions."""
    return f"test-{uuid.uuid4()}@example.com"
```

### Controlling parallel scope

```python
# tests/conftest.py — Group tests by class for xdist
import pytest

@pytest.fixture(scope="class")
def shared_state():
    """Shared within a class — xdist runs class tests on same worker."""
    return {"initialized": False}

class TestOrderFlow:
    """All tests in this class run on the same worker."""
    def test_create_order(self, shared_state, client):
        shared_state["initialized"] = True
        response = client.post("/api/orders", json={"item": "widget"})
        assert response.status_code == 201

    def test_view_order(self, shared_state, client):
        assert shared_state["initialized"]
        response = client.get("/api/orders/1")
        assert response.status_code == 200
```

## Plugins

### conftest.py as a local plugin

```python
# tests/conftest.py — Local plugin patterns
import pytest
import time
from pathlib import Path

@pytest.fixture(autouse=True)
def reset_state(db):
    """Auto-used fixture: runs for every test without explicit request."""
    db.reset()
    yield
    db.cleanup()

def pytest_runtest_setup(item):
    """Hook: called before each test."""
    if "requires_db" in item.keywords:
        db = item.funcargs.get("db")
        if not db or not db.is_connected():
            pytest.skip("Database not available")

def pytest_runtest_makereport(item, call):
    """Hook: capture test results for reporting."""
    if call.when == "call":
        outcome = "passed" if call.excinfo is None else "failed"
        print(f"\n{item.nodeid}: {outcome}")

@pytest.fixture
def timer():
    """Measure test execution time."""
    start = time.time()
    yield
    elapsed = time.time() - start
    print(f"\nTest took {elapsed:.3f}s")
```

### Custom assertion rewriting

```python
# tests/conftest.py — Custom assertion messages
import pytest

def pytest_assertrepr_compare(op, left, right):
    """Custom assertion comparison output."""
    if op == "==" and isinstance(left, dict) and isinstance(right, dict):
        missing = set(right.keys()) - set(left.keys())
        if missing:
            return [f"Missing keys: {missing}"]
        for key in left:
            if left[key] != right[key]:
                return [
                    f"Key mismatch for '{key}':",
                    f"  left:  {left[key]}",
                    f"  right: {right[key]}",
                ]
```

### Creating a reusable plugin

```python
# mypytestplugin/plugin.py — Installable pytest plugin
import pytest
import os
import tempfile

def pytest_addoption(parser):
    """Add custom command-line options."""
    parser.addoption(
        "--env",
        action="store",
        default="test",
        help="Test environment: test, staging, prod"
    )
    parser.addoption(
        "--retry",
        action="store",
        type=int,
        default=0,
        help="Number of retries for failed tests"
    )

@pytest.fixture(scope="session")
def env(request):
    return request.config.getoption("--env")

@pytest.fixture(scope="session")
def retry_count(request):
    return request.config.getoption("--retry")

def pytest_configure(config):
    """Register markers and configure."""
    config.addinivalue_line("markers", "flaky: test may fail intermittently")

# setup.py or pyproject.toml
# [project.entry-points.pytest11]
# mypytestplugin = "mypytestplugin.plugin"
```

## Test Organization

### Directory structure

```
tests/
├── conftest.py              # Root conftest: shared fixtures
├── unit/
│   ├── conftest.py          # Unit test fixtures
│   ├── test_models.py
│   ├── test_validators.py
│   └── test_utils.py
├── integration/
│   ├── conftest.py          # Integration fixtures (db, redis)
│   ├── test_api_orders.py
│   ├── test_api_users.py
│   └── test_db_queries.py
├── e2e/
│   ├── conftest.py          # E2E fixtures (selenium, playwright)
│   ├── test_checkout_flow.py
│   └── test_user_registration.py
└── fixtures/
    ├── __init__.py
    ├── factories.py          # Test data factories
    └── mock_data.py          # Static mock data
```

### Test factories

```python
# tests/fixtures/factories.py — Reusable test data factories
import factory
from myapp.models import User, Order, Product

class UserFactory(factory.Factory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker("name")
    is_active = True

class ProductFactory(factory.Factory):
    class Meta:
        model = Product

    name = factory.Faker("word")
    price = factory.Faker("pydecimal", left_digits=2, right_digits=2, positive=True)

class OrderFactory(factory.Factory):
    class Meta:
        model = Order

    user = factory.SubFactory(UserFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = 1
    status = "pending"
```

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/tests.yml — Pytest in GitHub Actions
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12", "3.13"]

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -e ".[test]"
      - run: pytest -n auto --cov=myapp --cov-report=xml -m "not slow"
      - uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
```

### Coverage configuration

```ini
# .coveragerc — Coverage settings
[run]
source = myapp
omit =
    myapp/__init__.py
    myapp/migrations/*
    myapp/tests/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
    if __name__ == .__main__.:
    @abstractmethod
fail_under = 80
show_missing = True

[html]
directory = htmlcov
```

### pytest configuration

```ini
# pytest.ini — Production pytest configuration
[pytest]
minversion = 8.0
testpaths = tests
addopts =
    -v
    --strict-markers
    --strict-config
    --tb=short
    --cov=myapp
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
    smoke: marks tests as smoke tests
    security: marks tests as security tests
    requires_db: marks tests that need a database
    requires_redis: marks tests that need Redis
    flaky: marks tests that may fail intermittently
filterwarnings =
    error
    ignore::DeprecationWarning:myapp.legacy.*
```

## Advanced Patterns

### Snapshot testing

```python
# tests/test_api_snapshots.py — Snapshot testing with syrupy
import pytest
from myapp.app import create_app

@pytest.fixture
def snapshot_json(snapshot):
    """Custom snapshot fixture for JSON comparison."""
    snapshot.snapshot_dir = "tests/snapshots"
    return snapshot

def test_user_list(client, snapshot_json):
    response = client.get("/api/users")
    assert response.json == snapshot_json

# Update snapshots: pytest --snapshot-update
```

### Property-based testing with Hypothesis

```python
# tests/test_sort_property.py — Property-based testing
from hypothesis import given, strategies as st, settings
from myapp.sorting import quick_sort

@given(st.lists(st.integers(), min_size=0, max_size=100))
@settings(max_examples=500)
def test_sort_idempotent(items):
    """Sorting twice produces the same result."""
    sorted_once = quick_sort(items)
    sorted_twice = quick_sort(sorted_once)
    assert sorted_once == sorted_twice

@given(st.lists(st.integers(), min_size=1))
def test_sort_preserves_length(items):
    assert len(quick_sort(items)) == len(items)

@given(st.lists(st.integers(), min_size=1))
def test_sort_first_element_is_min(items):
    sorted_items = quick_sort(items)
    assert sorted_items[0] == min(items)
```

### Mocking external services

```python
# tests/test_external_api.py — Mock external HTTP calls
import pytest
from unittest.mock import patch, Mock
from myapp.services import PaymentService

@patch("myapp.services.requests.post")
def test_payment_success(mock_post, db, make_order):
    mock_post.return_value = Mock(
        status_code=200,
        json=lambda: {"id": "pay_123", "status": "succeeded"}
    )

    order = make_order(quantity=1)
    result = PaymentService.charge(order, amount=10.00)

    assert result.status == "succeeded"
    mock_post.assert_called_once()

@patch("myapp.services.requests.post")
def test_payment_retry_on_timeout(mock_post, db, make_order):
    mock_post.side_effect = [
        TimeoutError("Connection timeout"),
        Mock(status_code=200, json=lambda: {"status": "succeeded"}),
    ]

    order = make_order()
    result = PaymentService.charge(order, amount=10.00)

    assert result.status == "succeeded"
    assert mock_post.call_count == 2
```

## Debugging Failed Tests

### Useful flags

```bash
# Run last failed tests only
pytest --lf

# Run tests that failed until they pass
pytest --lf --ff

# Drop to debugger on failure
pytest --pdb

# Show local variables on failure
pytest --showlocals

# Run with maximum verbosity
pytest -vv -s

# Stop on first failure, show traceback
pytest -x --tb=long

# Run only tests matching pattern
pytest -k "test_order"

# Show slowest 10 tests
pytest --durations=10
```

### Using breakpoints

```python
# tests/test_debug.py — Debugging with breakpoints
import pytest

def test_complex_logic(db, make_order):
    order = make_order(quantity=5)
    result = process_order(order)

    # Drop into debugger if assertion fails
    assert result.status == "shipped"
    assert result.tracking_number is not None

# Run with: pytest -s --pdb tests/test_debug.py
# The -s flag disables output capture so you can interact with pdb
```

## Best Practices


- For a deeper guide, see [Measure Test Coverage with pytest-cov](/recipes/python-coverage-pytest-cov/).

- Use `conftest.py` for shared fixtures — don't import fixtures across modules
- Keep unit tests fast — mock external dependencies, use in-memory databases
- Use markers consistently — enables selective test runs in CI
- Parametrize instead of copy-pasting — one test function, many inputs
- Set `--strict-markers` — catch typos in marker names
- Use `--cov-fail-under` in CI — prevent coverage regression
- Isolate tests — no test should depend on another test's side effects
- Name tests descriptively — `test_order_total_includes_tax` not `test_order_1`
- Use factory fixtures for complex objects — avoid long setup blocks in each test
- Run fast tests first — use `-m "not slow"` for quick feedback in development

## Common Mistakes

- **Shared state between tests**: tests pass individually but fail when run together. Use function-scoped fixtures or explicit cleanup.
- **Order-dependent tests**: test B depends on test A running first. Each test should be independent.
- **Over-mocking**: mocking everything makes tests brittle and tests the mocks, not the code. Mock at boundaries only.
- **No parallel testing**: test suite takes 10 minutes because it runs serially. Add `pytest-xdist` and `-n auto`.
- **Fixture scope too broad**: session-scoped mutable fixtures cause flaky tests. Use function scope for mutable data.
- **Missing `--strict-markers`**: typos in markers silently pass. Always enable strict mode.

## FAQ

### What is the difference between conftest.py and regular test files?

`conftest.py` files contain shared fixtures and hooks. Pytest automatically discovers them without imports. Place a `conftest.py` in each directory to scope fixtures to that directory and its subdirectories.

### How do I run tests in parallel with pytest?

Install `pytest-xdist` and run `pytest -n auto`. Use `--dist loadscope` to group tests by class or module, which reduces fixture setup overhead.

### What is the best fixture scope for database connections?

Use `scope="session"` for the database connection (expensive to create) and `scope="function"` for test data (needs isolation). This gives you speed from session scope and isolation from function scope.

### How do I skip tests conditionally?

Use `pytest.mark.skipif` with a condition, or use `pytest.skip()` inside a fixture or test. For environment-dependent skips, use a `pytest_runtest_setup` hook that checks markers.

### How do I measure test coverage?

Install `pytest-cov` and run `pytest --cov=myapp --cov-report=term-missing`. Add `--cov-fail-under=80` to fail CI when coverage drops below 80%.
