---




contentType: recipes
slug: python-pytest-fixtures-parametrize
title: "Pytest Fixtures y Parametrize"
description: "Cómo usar pytest fixtures y @pytest.mark.parametrize para escribir tests data-driven con lógica de setup reutilizable en proyectos Python."
metaDescription: "Usa pytest fixtures y parametrize para escribir tests data-driven con setup reutilizable, teardown e inputs deterministas en proyectos Python."
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
  - /recipes/setup-test-fixtures
  - /recipes/measure-test-coverage
  - /recipes/python-mock-external-apis-responses
  - /recipes/python-coverage-pytest-cov
  - /recipes/python-hypothesis-property-testing
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa pytest fixtures y parametrize para escribir tests data-driven con setup reutilizable, teardown e inputs deterministas en proyectos Python."
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

Los fixtures de pytest proporcionan una forma de configurar y limpiar el estado de los tests mediante inyección de dependencias. El decorador `@pytest.mark.parametrize` permite ejecutar la misma función de test contra múltiples combinaciones de entrada sin duplicar código. Juntos, eliminan el boilerplate y hacen explícita la intención del test.

## When to Use

- Múltiples tests necesitan la misma base de datos, archivo o mock en estado conocido
- Quieres testear una función contra muchos pares entrada-salida sin escribir tests separados
- La lógica de setup es costosa y debería compartirse entre tests con scope session o module
- Necesitas datos de test deterministas que pueden variar por caso

## When NOT to Use

- El test tiene un único escenario sin setup compartido — inlinea los datos
- La cadena de fixtures tiene más de 3 niveles — se vuelve difícil de rastrear
- Los inputs de parametrize son triviales (e.g., `True`/`False`) — un if/else simple es más claro
- Estás testeando side effects que dependen del orden de ejecución — parametrize corre en orden de declaración, lo que puede ocultar bugs

## Solution

### Fixture básico con setup y teardown

```python
import pytest
import tempfile
import os
import json

@pytest.fixture
def temp_config_file():
    """Crea un archivo de config temporal para testing."""
    config = {"api_key": "test-key", "timeout": 30}
    fd, path = tempfile.mkstemp(suffix=".json")

    with open(path, "w") as f:
        json.dump(config, f)

    yield path  # el test corre aquí

    os.close(fd)
    os.unlink(path)  # teardown

def test_config_loading(temp_config_file):
    with open(temp_config_file) as f:
        loaded = json.load(f)

    assert loaded["api_key"] == "test-key"
    assert loaded["timeout"] == 30
```

### Scopes de fixtures

```python
import pytest
import sqlite3

@pytest.fixture(scope="session")
def db_schema():
    """Crea el schema una vez por sesión de test."""
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE);
        CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, total REAL);
    """)
    yield conn
    conn.close()

@pytest.fixture(scope="function")
def db_session(db_schema):
    """Cada test obtiene una transacción fresca que hace rollback."""
    db_schema.execute("DELETE FROM users")
    db_schema.execute("DELETE FROM orders")
    yield db_schema
    db_schema.execute("DELETE FROM users")
    db_schema.execute("DELETE FROM orders")
```

### Parametrize con múltiples inputs

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

### Parametrize con fixtures usando parámetros indirectos

```python
import pytest

@pytest.fixture
def user(request):
    """Crea un usuario con el rol especificado por el parámetro indirecto."""
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

### Combinando fixtures y parametrize

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

### Factory fixtures para datos dinámicos

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
    """Factory que crea órdenes con campos personalizables."""
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

### Conftest.py para fixtures compartidos

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
    """Auto-aplicado a cada test en el directorio."""
    yield
```

## Variants

### Usando `pytest.generate_tests` para parametrización dinámica

```python
def test_dynamic_inputs(db_session):
    pass

def pytest_generate_tests(metafunc):
    if "db_session" in metafunc.fixturenames:
        metafunc.parametrize("db_session", ["sqlite", "postgres"], indirect=True)
```

### Parametrize con `pytest.param` e IDs

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


- For a deeper guide, see [Pytest in Production Guide](/es/guides/complete-guide-pytest-production/).

- Usa `conftest.py` para fixtures compartidos entre múltiples archivos de test — evita imports
- Prefiere `scope="session"` o `scope="module"` para setup costoso (conexiones DB, servidores HTTP)
- Nombra los fixtures descriptivamente: `temp_config_file` no `cfg`
- Usa `pytest.param` con `id=` para hacer los nombres de tests parametrizados legibles en CI
- Mantén las cadenas de fixtures poco profundas — si un fixture depende de 3+ otros, refactoriza
- Usa `autouse=True` con moderación — hace el comportamiento del test implícito y más difícil de debuggear

## Common Mistakes

- **Usar `scope="session"` para estado mutable**: los tests comparten el mismo objeto y se pueden contaminar. Usa scope function o agrega cleanup en el fixture.
- **Olvidar el teardown después de `yield`**: si el yield fixture lanza una excepción, el teardown igual corre, pero si el teardown lanza, el error original se enmascara.
- **Sobre-parametrizar**: 50+ casos de parametrize ralentizan la suite. Divide en tests enfocados o usa un subset para CI y el conjunto completo para runs nocturnos.
- **No setear `ids` en parametrize**: los IDs default usan los valores raw de parámetros, que pueden ser ilegibles para objetos complejos.
- **Importar fixtures entre archivos**: los fixtures definidos en `conftest.py` están disponibles sin import. Definirlos en un módulo regular requiere import explícito.

## FAQ

### ¿Cómo comparto fixtures entre directorios de test?

Colócalos en un `conftest.py` en la raíz de tu directorio de tests. Pytest descubre los archivos `conftest.py` automáticamente — los fixtures definidos ahí están disponibles para todos los tests en ese directorio y subdirectorios.

### ¿Puedo parametrizar un fixture en lugar de un test?

Sí. Usa `params` en el decorador `@pytest.fixture`:

```python
@pytest.fixture(params=["sqlite", "postgres", "mysql"])
def db_engine(request):
    engine = create_engine(request.param)
    yield engine
    engine.dispose()
```

Cada test que depende de `db_engine` corre una vez por parámetro.

### ¿Cómo salteo casos específicos de parametrize?

Usa `pytest.param(..., marks=pytest.mark.skip(reason="..."))`:

```python
@pytest.mark.parametrize("input,expected", [
    pytest.param("case1", True, id="normal"),
    pytest.param("case2", False, marks=pytest.mark.skip(reason="Known bug #42"), id="skipped"),
])
def test_logic(input, expected):
    assert check(input) == expected
```

### ¿Cuál es la diferencia entre parametrize directo e indirecto?

Parametrize directo pasa el valor raw a la función de test. Parametrize indirecto pasa el valor a un fixture (vía `request.param`), que puede transformarlo antes de que el test lo reciba.

### ¿Cómo corro solo un caso de parametrize?

Usa el node ID: `pytest tests/test_math.py::test_addition[ten_plus_twenty]`. El ID entre corchetes coincide con el parámetro `id=` o la representación de string auto-generada.

### ¿Cómo parametrizo un fixture con múltiples argumentos?

Usa `params` con `request.param` como dict o tuple:

```python
@pytest.fixture(params=[
    {"input": "hello", "expected": 5},
    {"input": "world", "expected": 5},
], ids=lambda x: x["input"])
def text_data(request):
    return request.param

def test_length(text_data):
    assert len(text_data["input"]) == text_data["expected"]
```

### ¿Puedo combinar `@pytest.mark.parametrize` con fixtures?

Sí. Parametriza la función de test para un argumento y usa un fixture para otro. PyTest ejecuta los casos parametrizados para cada instancia del fixture:

```python
@pytest.fixture(params=["sqlite", "postgres"])
def db(request):
    return create_db(request.param)

@pytest.mark.parametrize("table", ["users", "orders"])
def test_query(db, table):
    assert db.query(table).count() >= 0
```
