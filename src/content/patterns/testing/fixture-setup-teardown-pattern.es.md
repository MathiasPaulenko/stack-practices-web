---

contentType: patterns
slug: fixture-setup-teardown-pattern
title: "Patrón Fixture Setup/Teardown"
description: "Cómo usar setup y teardown fixtures para crear contexto de test reutilizable. Cubre beforeEach, factory functions, fixture objects y cleanup con ejemplos."
metaDescription: "Crea contexto de test reutilizable con fixtures de setup/teardown. Aprende beforeEach, factory functions, fixture objects y cleanup en Python, JS y Java."
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
  metaDescription: "Crea contexto de test reutilizable con fixtures de setup/teardown. Aprende beforeEach, factory functions, fixture objects y cleanup en Python, JS y Java."
  keywords:
    - testing
    - fixtures
    - setup
    - teardown
    - test-context
    - pattern

---

## Overview

El patrón fixture setup/teardown estandariza cómo se crea y limpia el contexto de test. En vez de duplicar código de inicialización across tests, los fixtures proveen lógica de setup reutilizable que corre antes de cada test (o test suite) y lógica de teardown que corre después. Esto reduce duplicación de test, asegura starting state consistente, y garantiza cleanup de resources como database connections, temp files, o network sockets.

## When to Use

- Tests que comparten inicialización común (database connections, test data, mock objects)
- Tests que requieren cleanup de resources (temp files, network connections, environment variables)
- Cuando el test setup es complejo o error-prone — centralizalo en un fixture
- Cuando los tests deben correr en aislamiento — los fixtures aseguran clean state entre tests
- Equipos que quieren DRY test code — evitar copy-pasting de setup across dozens de tests

## When NOT to Use

- Tests triviales sin shared setup — inline setup es más simple
- Cuando el setup es unique per test — un fixture agrega indirección sin beneficio
- Para scripts one-off — los fixtures son para structured test suites
- Cuando el fixture es más complejo que los tests que sirve — simplificá

## Solution

### Setup/teardown básico en Jest

```javascript
// JavaScript — Jest setup/teardown
describe('UserService', () => {
  let service;
  let dbConnection;

  beforeEach(() => {
    // Setup: corre antes de cada test
    dbConnection = createInMemoryDB();
    service = new UserService(dbConnection);
    service.createUser('Alice', 'alice@x.com');
  });

  afterEach(() => {
    // Teardown: corre después de cada test
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

### Setup/teardown en pytest

```python
# Python — pytest con fixtures
import pytest
from myapp.services import UserService
from myapp.repositories import FakeUserRepository

@pytest.fixture
def repo():
    """Fresh in-memory repository para cada test."""
    return FakeUserRepository()

@pytest.fixture
def service(repo):
    """UserService con un fresh repository."""
    return UserService(repo)

@pytest.fixture
def service_with_user(service):
    """UserService con un user pre-creado."""
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

### Setup/teardown con yield (pytest)

```python
# Python — pytest fixture con yield para teardown
import pytest
import tempfile
import os

@pytest.fixture
def temp_db():
    """Crear temp SQLite database, yield, después limpiar."""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    db = SQLiteDB(path)
    db.initialize_schema()

    yield db  # El test corre aquí

    # Teardown: corre después del test
    db.close()
    os.unlink(path)

@pytest.fixture
def populated_db(temp_db):
    """Database con seed data."""
    temp_db.insert('users', {'name': 'Alice', 'email': 'alice@x.com'})
    temp_db.insert('users', {'name': 'Bob', 'email': 'bob@x.com'})
    yield temp_db

def test_user_count(populated_db):
    assert populated_db.count('users') == 2

def test_find_alice(populated_db):
    user = populated_db.find_one('users', {'name': 'Alice'})
    assert user['email'] == 'alice@x.com'
```

### Setup/teardown en JUnit

```java
// Java — JUnit 5 setup/teardown
import org.junit.jupiter.api.*;

class UserServiceTest {

    private UserService service;
    private FakeUserRepository repo;

    @BeforeEach
    void setUp() {
        // Corre antes de cada test
        repo = new FakeUserRepository();
        service = new UserService(repo);
        service.createUser("Alice", "alice@x.com");
    }

    @AfterEach
    void tearDown() {
        // Corre después de cada test
        repo.clear();
        service = null;
    }

    @BeforeAll
    static void setUpAll() {
        // Corre una vez antes de todos los tests en la clase
        System.setProperty("TEST_MODE", "true");
    }

    @AfterAll
    static void tearDownAll() {
        // Corre una vez después de todos los tests en la clase
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

### Patrón factory function

```javascript
// JavaScript — factory function para test data
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

### Patrón fixture object

```python
# Python — fixture object bundleando múltiples fixtures
@pytest.fixture
def test_context():
    """Bundlear todas las dependencias de test en un objeto."""
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
    """Cargado una vez por test session."""
    return load_config("test.yaml")

@pytest.fixture(scope="module")
def test_database():
    """Una database por test module."""
    db = TestDatabase()
    db.connect()
    yield db
    db.disconnect()
    db.drop_all_tables()

@pytest.fixture(scope="function")
def clean_db(test_database):
    """Fresh state por test function."""
    test_database.truncate_all()
    yield test_database
    test_database.truncate_all()

class TestUserRepository:
    def test_create(self, clean_db):
        clean_db.insert('users', {'name': 'Alice'})
        assert clean_db.count('users') == 1

    def test_count_empty(self, clean_db):
        assert clean_db.count('users') == 0  # Truncated por fixture
```

### Setup/teardown de environment variables

```python
# Python — manejar environment variables en tests
import os
import pytest

@pytest.fixture
def env_vars():
    """Setear y restaurar environment variables."""
    original = dict(os.environ)
    os.environ['APP_ENV'] = 'test'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['REDIS_URL'] = 'redis://localhost:6379/15'

    yield os.environ

    # Restaurar environment original
    os.environ.clear()
    os.environ.update(original)

def test_app_starts_in_test_mode(env_vars):
    assert env_vars['APP_ENV'] == 'test'
    assert env_vars['DATABASE_URL'] == 'sqlite:///:memory:'
```

### Nested fixtures en Jest

```javascript
// JavaScript — nested describe blocks con scoped setup
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
# Python — parametrized fixture para testear múltiples configs
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

### Fixtures de recursos externos

```python
# Python — fixture para test database basada en Docker
import pytest
import subprocess
import time

@pytest.fixture(scope="session")
def postgres_container():
    """Iniciar un PostgreSQL Docker container para la test session."""
    container_id = subprocess.check_output([
        "docker", "run", "-d", "-p", "5432:5432",
        "-e", "POSTGRES_PASSWORD=test",
        "postgres:16-alpine"
    ]).decode().strip()

    # Esperar a que PostgreSQL esté ready
    time.sleep(3)

    yield {
        "host": "localhost",
        "port": "5432",
        "password": "test",
    }

    # Teardown: stop y remove container
    subprocess.run(["docker", "stop", container_id])
    subprocess.run(["docker", "rm", container_id])
```

### Setup basado en snapshots

```javascript
// JavaScript — save y restore state entre tests
describe('Database migrations', () => {
  let db;

  beforeAll(async () => {
    db = await connectToTestDB();
    await db.migrate();
    // Guardar snapshot de clean state
    await db.snapshot('clean');
  });

  afterEach(async () => {
    // Restaurar a clean snapshot después de cada test
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
    // Este test fallaría sin snapshot restore
    expect(await db.count('users')).toBe(0);
  });
});
```

## Best Practices


- For a deeper guide, see [Pytest in Production Guide](/es/guides/complete-guide-pytest-production/).

- Mantené los fixtures pequeños y enfocados — un fixture por concern
- Usá `yield` en pytest para teardown garantizado — incluso si el test falla
- Preferí composition sobre inheritance — componé fixtures desde fixtures más pequeños
- Nombrá los fixtures descriptivamente — `service_with_user` es más claro que `setup`
- Usá factory functions para test data — `createTestUser(overrides)` es flexible
- Limpiá todos los resources — database connections, temp files, env vars, network sockets
- Usá scoped fixtures sabiamente — `session` para setup expensive, `function` para isolation
- No compartas state entre tests — cada test debería ser independiente

## Common Mistakes

- **Olvidar teardown**: dejar temp files, open connections, o env vars modificadas causa cascading failures. Siempre pareá setup con teardown.
- **Over-sharing fixtures**: un `session`-scoped fixture que modifica state causa test order dependency. Usá `function` scope para mutable state.
- **Fixtures complejos**: si un fixture toma 50 líneas, está haciendo demasiado. Splittealo en fixtures más pequeños composables.
- **No resetear mocks**: los mocks retienen call history entre tests. Siempre reseteá en `afterEach` o usá `jest.clearAllMocks()`.
- **Side effects ocultos**: un fixture que modifica global state (env vars, working directory) sin restaurarlo rompe otros tests.

## FAQ

### ¿Qué es un test fixture?

Un fixture es la lógica reusable de setup y teardown para tests. Crea las precondiciones que un test necesita (objetos, data, connections) y limpia después.

### ¿Cuál es la diferencia entre beforeEach y beforeAll?

`beforeEach` corre antes de cada test — asegura aislamiento. `beforeAll` corre una vez antes de todos los tests en un block — usalo para setup expensive que no muta.

### ¿Debería usar fixtures o inline setup?

Usá fixtures cuando el setup se comparte across múltiples tests. Usá inline setup cuando es unique a un test. No fuerces todo en fixtures.

### ¿Qué es un yield fixture en pytest?

Un fixture que usa `yield` en vez de `return`. El código antes de `yield` es setup, el código después es teardown. Esto garantiza cleanup incluso si el test falla.

### ¿Cómo comparto fixtures across test files?

En pytest, poné shared fixtures en `conftest.py` — están automáticamente disponibles para todos los tests en ese directorio. En Jest, usá `setupFilesAfterEach` en config o importá shared setup modules.
