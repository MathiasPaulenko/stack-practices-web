---
contentType: guides
slug: complete-guide-pytest-production
title: "Guía de Pytest en Producción: Fixtures, Plugins, Markers, Ejecución Paralela"
description: "Dominá pytest para codebases de producción: fixtures avanzados, plugins, markers personalizados, tests parametrizados, ejecución paralela con pytest-xdist e integración con CI."
metaDescription: "Dominá pytest para producción: fixtures avanzados, plugins, markers personalizados, tests parametrizados, ejecución paralela con pytest-xdist e integración con CI."
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
  - /guides/testing/test-driven-development-guide
  - /guides/testing/testing-strategy-guide
  - /recipes/testing/api-mocking
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 25
seo:
  metaDescription: "Dominá pytest para producción: fixtures avanzados, plugins, markers personalizados, tests parametrizados, ejecución paralela con pytest-xdist e integración con CI."
  keywords:
    - pytest production
    - pytest fixtures
    - pytest plugins
    - pytest xdist
    - pytest markers
    - parametrized tests
    - parallel testing python
---

## Introducción

Pytest es el framework de testing para Python más popular, pero la mayoría de los equipos solo usan lo básico. Los codebases de producción necesitan más que `assert` statements — necesitan fixtures reusables, markers personalizados para organizar tests, ejecución paralela para velocidad, plugins para funcionalidad compartida e integración con CI que provea feedback accionable. Esta guía cubre todo lo que necesitás para correr pytest a escala: desde fixture factories y patrones de conftest hasta paralelización con xdist y desarrollo de plugins personalizados.

## Fundamentos de Fixtures

### Fixtures básicos

```python
# tests/conftest.py — Fixtures compartidos
import pytest
from myapp.db import Database
from myapp.models import User

@pytest.fixture
def db():
    """Provee una conexión a la base de datos de test."""
    db = Database("postgresql://localhost/test_db")
    db.create_tables()
    yield db
    db.drop_tables()
    db.close()

@pytest.fixture
def user(db):
    """Crea un usuario de test en la base de datos."""
    return User.create(db, email="test@example.com", name="Test User")
```

### Scopes de fixtures

```python
# tests/conftest.py — Scopes de fixtures controlan el lifecycle
import pytest

@pytest.fixture(scope="function")
def function_scoped():
    """Creado y destruido para cada test (default)."""
    return {"count": 0}

@pytest.fixture(scope="class")
def class_scoped():
    """Creado una vez por test class."""
    return {"count": 0}

@pytest.fixture(scope="module")
def module_scoped():
    """Creado una vez por module."""
    return {"count": 0}

@pytest.fixture(scope="session")
def session_scoped():
    """Creado una vez para toda la test session."""
    return {"count": 0}

# Jerarquía de scopes: session > module > class > function
# Fixtures de scope más alto se crean primero y se destruyen último
```

### Fixture factories con closures

```python
# tests/conftest.py — Dynamic fixture factories
import pytest
from myapp.models import Order, Product

@pytest.fixture
def make_order(db):
    """Factory fixture: crea orders con data custom."""
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

    # Cleanup de todas las orders creadas
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

### Parametrización de fixtures

```python
# tests/test_calculator.py — Parametrizá fixtures
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

### Cadenas de dependencia entre fixtures

```python
# tests/conftest.py — Fixtures dependiendo de fixtures
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
    """Test client para HTTP requests."""
    with app.test_client() as client:
        yield client

@pytest.fixture(scope="function")
def auth_client(client, db):
    """Test client autenticado."""
    from myapp.models import User
    user = User.create(db, email="test@example.com", password="hashed")
    token = user.generate_token()
    client.headers["Authorization"] = f"Bearer {token}"
    yield client
    user.delete(db)
```

## Markers Personalizados

### Markers built-in

```python
# tests/test_api.py — Usando markers built-in
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

### Markers personalizados

```python
# pytest.ini — Registrá markers personalizados
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
# tests/test_orders.py — Usando markers personalizados
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

### Correr por marker

```bash
# Corré solo unit tests
pytest -m unit

# Corré todo excepto slow tests
pytest -m "not slow"

# Corré integration y security tests
pytest -m "integration or security"

# Corré smoke tests solo, pará en el primer failure
pytest -m smoke -x

# Corré tests que necesitan database pero no Redis
pytest -m "requires_db and not requires_redis"
```

## Tests Parametrizados

### Parametrización básica

```python
# tests/test_string_utils.py — Tests parametrizados
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

### Parametrización con IDs

```python
# tests/test_pagination.py — Casos parametrizados con nombre
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

### Parametrización multi-parámetro

```python
# tests/test_validation.py — Parametrización compleja
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

### Parametrizá con fixtures (indirect)

```python
# tests/test_api_endpoints.py — Parametrización indirecta
import pytest

@pytest.fixture
def api_client(request):
    """Creá client con auth level específico."""
    auth_level = request.param
    client = create_test_client(auth=auth_level)
    return client

@pytest.mark.parametrize("api_client", ["admin", "user", "guest"], indirect=True)
def test_get_user_profile(api_client):
    response = api_client.get("/api/profile")
    assert response.status_code in [200, 403]
```

## Ejecución Paralela con pytest-xdist

### Ejecución paralela básica

```bash
# Corré tests en paralelo usando todos los CPU cores
pytest -n auto

# Corré con número específico de workers
pytest -n 4

# Corré con load balancing (default es load scope)
pytest -n 4 --dist loadscope

# Corré con loadfile distribution (per-file)
pytest -n 4 --dist loadfile
```

### Fixtures compatibles con paralelización

```python
# tests/conftest.py — Fixtures compatibles con xdist
import pytest
import uuid
from myapp.db import Database

@pytest.fixture(scope="session")
def db_url():
    """Cada worker obtiene su propia database."""
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
    """Generá email único por test para evitar colisiones."""
    return f"test-{uuid.uuid4()}@example.com"
```

### Controlar scope paralelo

```python
# tests/conftest.py — Groupéa tests por class para xdist
import pytest

@pytest.fixture(scope="class")
def shared_state():
    """Shared dentro de una class — xdist corre class tests en mismo worker."""
    return {"initialized": False}

class TestOrderFlow:
    """Todos los tests en esta class corren en el mismo worker."""
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

### conftest.py como plugin local

```python
# tests/conftest.py — Patrones de plugin local
import pytest
import time
from pathlib import Path

@pytest.fixture(autouse=True)
def reset_state(db):
    """Auto-used fixture: corre para cada test sin explicit request."""
    db.reset()
    yield
    db.cleanup()

def pytest_runtest_setup(item):
    """Hook: llamado antes de cada test."""
    if "requires_db" in item.keywords:
        db = item.funcargs.get("db")
        if not db or not db.is_connected():
            pytest.skip("Database not available")

def pytest_runtest_makereport(item, call):
    """Hook: capturá resultados de test para reporting."""
    if call.when == "call":
        outcome = "passed" if call.excinfo is None else "failed"
        print(f"\n{item.nodeid}: {outcome}")

@pytest.fixture
def timer():
    """Medí el tiempo de ejecución del test."""
    start = time.time()
    yield
    elapsed = time.time() - start
    print(f"\nTest took {elapsed:.3f}s")
```

### Custom assertion rewriting

```python
# tests/conftest.py — Mensajes de assertion personalizados
import pytest

def pytest_assertrepr_compare(op, left, right):
    """Output de comparación de assertion personalizado."""
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

### Crear un plugin reutilizable

```python
# mypytestplugin/plugin.py — Plugin de pytest instalable
import pytest
import os
import tempfile

def pytest_addoption(parser):
    """Agregá custom command-line options."""
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
    """Registrá markers y configurá."""
    config.addinivalue_line("markers", "flaky: test may fail intermittently")

# setup.py o pyproject.toml
# [project.entry-points.pytest11]
# mypytestplugin = "mypytestplugin.plugin"
```

## Organización de Tests

### Estructura de directorios

```
tests/
├── conftest.py              # Root conftest: fixtures compartidos
├── unit/
│   ├── conftest.py          # Fixtures de unit tests
│   ├── test_models.py
│   ├── test_validators.py
│   └── test_utils.py
├── integration/
│   ├── conftest.py          # Fixtures de integration (db, redis)
│   ├── test_api_orders.py
│   ├── test_api_users.py
│   └── test_db_queries.py
├── e2e/
│   ├── conftest.py          # Fixtures de E2E (selenium, playwright)
│   ├── test_checkout_flow.py
│   └── test_user_registration.py
└── fixtures/
    ├── __init__.py
    ├── factories.py          # Test data factories
    └── mock_data.py          # Static mock data
```

### Test factories

```python
# tests/fixtures/factories.py — Test data factories reusables
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

## Integración con CI

### GitHub Actions

```yaml
# .github/workflows/tests.yml — Pytest en GitHub Actions
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

### Configuración de coverage

```ini
# .coveragerc — Settings de coverage
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

### Configuración de pytest

```ini
# pytest.ini — Configuración de pytest para producción
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

## Patrones Avanzados

### Snapshot testing

```python
# tests/test_api_snapshots.py — Snapshot testing con syrupy
import pytest
from myapp.app import create_app

@pytest.fixture
def snapshot_json(snapshot):
    """Custom snapshot fixture para JSON comparison."""
    snapshot.snapshot_dir = "tests/snapshots"
    return snapshot

def test_user_list(client, snapshot_json):
    response = client.get("/api/users")
    assert response.json == snapshot_json

# Updateá snapshots: pytest --snapshot-update
```

### Property-based testing con Hypothesis

```python
# tests/test_sort_property.py — Property-based testing
from hypothesis import given, strategies as st, settings
from myapp.sorting import quick_sort

@given(st.lists(st.integers(), min_size=0, max_size=100))
@settings(max_examples=500)
def test_sort_idempotent(items):
    """Sortear dos veces produce el mismo resultado."""
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

### Mockeando servicios externos

```python
# tests/test_external_api.py — Mockeá HTTP calls externos
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

## Debuggeando Tests Fallidos

### Flags útiles

```bash
# Corré solo los últimos tests que fallaron
pytest --lf

# Corré los tests que fallaron hasta que pasen
pytest --lf --ff

# Entrá al debugger en failure
pytest --pdb

# Mostrá variables locales en failure
pytest --showlocals

# Corré con máxima verbosity
pytest -vv -s

# Pará en el primer failure, mostrá traceback
pytest -x --tb=long

# Corré solo tests que matchean el pattern
pytest -k "test_order"

# Mostrá los 10 tests más lentos
pytest --durations=10
```

### Usando breakpoints

```python
# tests/test_debug.py — Debuggeando con breakpoints
import pytest

def test_complex_logic(db, make_order):
    order = make_order(quantity=5)
    result = process_order(order)

    # Entrá al debugger si la assertion falla
    assert result.status == "shipped"
    assert result.tracking_number is not None

# Corré con: pytest -s --pdb tests/test_debug.py
# El flag -s deshabilita output capture para que puedas interactuar con pdb
```

## Best Practices

- Usá `conftest.py` para fixtures compartidos — no importeés fixtures across modules
- Mantené unit tests rápidos — mockeá dependencias externas, usá in-memory databases
- Usá markers consistentemente — habilita selective test runs en CI
- Parametrizá en vez de copy-pastear — una test function, muchos inputs
- Seteá `--strict-markers` — capturá typos en marker names
- Usá `--cov-fail-under` en CI — prevení coverage regression
- Aislá tests — ningún test debería depender de side effects de otro
- Nombrá tests descriptivamente — `test_order_total_includes_tax` no `test_order_1`
- Usá factory fixtures para objetos complejos — evitá long setup blocks en cada test
- Corré tests rápidos primero — usá `-m "not slow"` para feedback rápido en development

## Common Mistakes

- **Estado compartido entre tests**: tests pasan individualmente pero fallan cuando corren juntos. Usá function-scoped fixtures o cleanup explícito.
- **Tests que dependen del orden**: test B depende de que test A corra primero. Cada test debería ser independiente.
- **Over-mocking**: mockear todo hace los tests brittle y testea los mocks, no el code. Mockeá solo en boundaries.
- **No testing paralelo**: test suite tarda 10 minutos porque corre serialmente. Agregá `pytest-xdist` y `-n auto`.
- **Fixture scope demasiado broad**: session-scoped mutable fixtures causan flaky tests. Usá function scope para data mutable.
- **Missing `--strict-markers`**: typos en markers pasan silenciosamente. Siempre habilitá strict mode.

## FAQ

### ¿Cuál es la diferencia entre conftest.py y archivos de test regulares?

Los archivos `conftest.py` contienen fixtures y hooks compartidos. Pytest los descubre automáticamente sin imports. Poné un `conftest.py` en cada directorio para scopear fixtures a ese directorio y sus subdirectorios.

### ¿Cómo corro tests en paralelo con pytest?

Instalá `pytest-xdist` y corré `pytest -n auto`. Usá `--dist loadscope` para groupéar tests por class o module, lo cual reduce el overhead de fixture setup.

### ¿Cuál es el mejor scope de fixture para database connections?

Usá `scope="session"` para la database connection (caro de crear) y `scope="function"` para test data (necesita isolation). Esto te da speed del session scope e isolation del function scope.

### ¿Cómo skipeo tests condicionalmente?

Usá `pytest.mark.skipif` con una condición, o usá `pytest.skip()` dentro de un fixture o test. Para skips que dependen del environment, usá un hook `pytest_runtest_setup` que checkee markers.

### ¿Cómo mido test coverage?

Instalá `pytest-cov` y corré `pytest --cov=myapp --cov-report=term-missing`. Agregá `--cov-fail-under=80` para que CI falle cuando coverage baje de 80%.
