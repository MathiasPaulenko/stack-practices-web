---
contentType: recipes
slug: setup-test-fixtures
title: "Configurar Fixtures de Test"
description: "Cómo gestionar fixtures de test con patrones factory, hooks de setup/teardown y datos deterministas para tests unitarios e integración confiables en Python, JavaScript y Java."
metaDescription: "Gestiona fixtures de test con patrones factory, hooks de setup y datos deterministas para tests confiables en Python, JavaScript y Java."
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
  metaDescription: "Gestiona fixtures de test con patrones factory, hooks de setup y datos deterministas para tests confiables en Python, JavaScript y Java."
  keywords:
    - testing
    - fixtures
    - pytest
    - jest
    - junit
    - factory-pattern
    - recipe
---

## Descripción General

Los fixtures de test son los datasets y estados de entorno conocidos y controlados que hacen los tests deterministas. Sin fixtures, los tests dependen de bases de datos externas, sistemas de archivos o estado aleatorio, produciendo fallos flaky que desperdician tiempo de debugging. Esta receta muestra cómo crear, aislar y limpiar fixtures usando patrones factory y hooks nativos del framework.

## Cuándo Usar

- Los tests necesitan un usuario de base de datos, archivo u objeto que existe en un estado conocido antes de las aserciones
- Múltiples tests comparten la misma lógica de setup costosa
- Quieres variar datos de entrada sin duplicar boilerplate
- Los tests de integración necesitan servicios temporales, colas o estado de esquema
- Necesitas datos deterministas y repetibles para cada ejecución de test

## Cuándo NO Usar

- El objeto bajo test no tiene dependencias externas — instáncialo directamente en el test
- El setup es trivial (una sola línea) — inclúyelo inline para mantener los tests legibles
- Estás tentado a compartir fixtures mutables entre tests sin resetear estado
- El fixture oculta el escenario real del test — prefiere setup explícito y legible sobre magia

## Implementación Paso a Paso

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

# Fixture simple
@pytest.fixture
def admin_user() -> User:
    return User(id=1, name="Alice", email="alice@example.com", role="admin")

# Fixture con teardown (patrón yield)
@pytest.fixture
def temp_database() -> Generator[str, None, None]:
    db_path = "/tmp/test_db.sqlite"
    init_schema(db_path)
    yield db_path
    cleanup_schema(db_path)

# Fixture parametrizado (ejecuta test con múltiples valores)
@pytest.fixture(params=["admin", "editor", "viewer"])
def role(request) -> str:
    return request.param

# Fixture factory — crea muchas variantes
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

# Uso en tests
def test_admin_can_delete(admin_user: User):
    assert admin_user.can_delete() is True

def test_user_permissions(user_factory):
    admin = user_factory(role="admin")
    viewer = user_factory(role="viewer")
    assert admin.can_edit()
    assert not viewer.can_edit()

# Fixture con scope de sesión (costoso, computar una vez)
@pytest.fixture(scope="session")
def compiled_model():
    return load_ml_model("large-model.pkl")

# Fixture autouse (corre para cada test en el módulo)
@pytest.fixture(autouse=True)
def reset_mocks():
    yield
    mock_registry.clear()
```

### JavaScript (Jest)

```javascript
// Setup y teardown
let dbConnection;

beforeAll(async () => {
    dbConnection = await createTestDatabase();
});

afterAll(async () => {
    await dbConnection.destroy();
});

beforeEach(() => {
    // Resetear estado antes de cada test
    dbConnection.truncateAll();
});

// Función factory
function createUser(overrides = {}) {
    return {
        id: Math.floor(Math.random() * 100000),
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        ...overrides
    };
}

// Patrón de fixture Jest con setupFiles
// jest.setup.js
import { factory } from './factories';

global.factory = factory;

// __tests__/auth.test.js
describe('authentication', () => {
    test('admin puede acceder al panel admin', () => {
        const admin = factory.user({ role: 'admin' });
        expect(canAccessAdmin(admin)).toBe(true);
    });

    test('viewer no puede acceder al panel admin', () => {
        const viewer = factory.user({ role: 'viewer' });
        expect(canAccessAdmin(viewer)).toBe(false);
    });
});

// Fixture inline para casos simples
describe('cálculos de orden', () => {
    const baseOrder = () => ({
        items: [],
        discountCode: null,
        customer: { id: 1, tier: 'standard' }
    });

    test('aplica descuento', () => {
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

    // Método factory
    private Order.Builder orderBuilder() {
        return Order.builder()
            .customerId(1L)
            .status(OrderStatus.PENDING);
    }

    @Test
    @DisplayName("Orden válida puede ser colocada")
    void placeValidOrder() {
        Order order = orderBuilder()
            .addItem(Item.of("SKU-001", 2, BigDecimal.valueOf(29.99)))
            .build();

        OrderResult result = service.place(order);

        assertTrue(result.isSuccess());
        assertEquals(OrderStatus.CONFIRMED, result.getOrder().getStatus());
    }

    // Datos de fixture parametrizados
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

// Fixtures compartidos vía @TestConfiguration (Spring)
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

## Mejores Prácticas

- **Usa funciones factory, no datos estáticos.** `createUser({ role: 'admin' })` es más flexible que un objeto `adminUser` hardcodeado y previene el drift de copy-paste.
- **Resetea estado entre tests.** Los fixtures mutables compartidos causan fallos dependientes del orden. Trunca tablas, limpia mocks y reinicializa objetos en `beforeEach`.
- **Mantén fixtures cerca del test.** Un fixture usado por solo una clase de test debería definirse en esa clase, no en un conftest global. La proximidad mejora la legibilidad.
- **Nombra fixtures por lo que representan, no por cómo se construyen.** `premium_customer` es mejor que `user_with_tier_gold_and_100_orders`.
- **Usa IDs deterministas.** Los IDs aleatorios dificultan el debugging cuando un test falla solo en ciertos valores. Usa un contador o hash del nombre del test.

## Errores Comunes

- **Compartir fixtures mutables entre tests.** Un test modifica el fixture y el siguiente falla misteriosamente. Siempre devuelve nuevas instancias o resetea en `beforeEach`.
- **Sobreusar fixtures autouse.** Los fixtures implícitos que corren para cada test dificultan rastrear por qué un test falla. Prefiere inyección explícita.
- **Fixtures que hacen demasiado.** Un fixture que crea un usuario, lo loguea y configura 10 órdenes es difícil de reutilizar. Compón fixtures pequeños en su lugar.
- **Hardcodear tiempo en tests.** Los tests que dependen de `new Date()` fallan a medianoche o en diferentes zonas horarias. Usa un fixture de reloj.
- **No limpiar recursos externos.** Los archivos temporales, conexiones de base de datos y stubs de red dejados abiertos filtran recursos y causan fallos en cascada.
