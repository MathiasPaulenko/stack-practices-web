---
contentType: recipes
slug: generate-test-data
title: "Generar Datos de Test"
description: "Cómo generar datos de test realistas y deterministas con Faker, factory-boy y generadores type-aware para suites de test robustas en Python, JavaScript y Java."
metaDescription: "Genera datos de test realistas y deterministas con Faker, factory-boy y generadores type-aware en Python, JavaScript y Java."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - test-data
  - faker
  - factory-pattern
  - python
  - javascript
  - java
  - recipe
relatedResources:
  - /recipes/testing/setup-test-fixtures
  - /recipes/testing/measure-test-coverage
  - /patterns/factory-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Genera datos de test realistas y deterministas con Faker, factory-boy y generadores type-aware en Python, JavaScript y Java."
  keywords:
    - testing
    - test-data
    - faker
    - factory-pattern
    - python
    - javascript
    - java
    - recipe
---

## Descripción General

Los datos de test hardcodeados (`name = "John"`, `email = "test@test.com"`) rápidamente se vuelven obsoletos, fallan en exponer casos edge y no representan las distribuciones de datos de producción. Los generadores producen datos realistas, variados y deterministas que hacen los tests más robustos mientras reducen el mantenimiento manual de fixtures.

## Cuándo Usar

- Mantienes docenas de objetos de test hardcodeados que divergen del esquema de producción
- Los casos edge (strings vacíos, Unicode, valores muy largos) nunca se testean porque son tediosos de escribir
- Los tests de integración necesitan una base de datos sembrada con cientos de filas realistas
- Quieres que los tests ejerciten reglas de validación con distribuciones de entrada variadas
- Los tests de carga necesitan grandes volúmenes de datos plausibles

## Cuándo NO Usar

- El test requiere un escenario muy específico y conocido — hardcodéalo explícitamente
- El determinismo entre ejecuciones es más importante que la variedad de datos — siembra el generador pero mantén valores mínimos
- El esquema de datos es extremadamente simple (2-3 campos) — un objeto literal es más claro
- Estás testeando una librería tipo Faker en sí misma — usa entradas controladas y predecibles

## Implementación Paso a Paso

### Python

```python
from faker import Faker
from dataclasses import dataclass
from typing import List
import factory
from factory import Faker as FactoryFaker

fake = Faker()
Faker.seed(12345)  # Determinístico entre ejecuciones

# Uso básico de Faker
fake.name()        # 'John Smith'
fake.email()       # 'john.smith@example.com'
fake.ipv4()        # '192.168.1.45'
fake.uuid4()       # '550e8400-e29b-41d4-a716-446655440000'

# factory-boy para objetos ORM
@dataclass
class User:
    id: int
    name: str
    email: str
    age: int
    is_active: bool

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.Sequence(lambda n: n)
    name = FactoryFaker('name')
    email = FactoryFaker('email')
    age = factory.Faker('random_int', min=18, max=90)
    is_active = True

# Uso
user = UserFactory()           # Instancia única
users = UserFactory.build_batch(100)  # 100 instancias
admin = UserFactory(name="Admin User", age=30)

# Proveedor personalizado para datos específicos del dominio
from faker.providers import BaseProvider

class ProductProvider(BaseProvider):
    def sku(self):
        categories = ['ELEC', 'BOOK', 'HOME', 'TOY']
        return f"{self.random_element(categories)}-{self.random_int(1000, 9999)}"

fake.add_provider(ProductProvider)
fake.sku()  # 'ELEC-4521'

# Dataset determinístico para tests property-based
import hypothesis.strategies as st

user_strategy = st.builds(
    User,
    id=st.integers(min_value=1),
    name=st.text(min_size=1, max_size=100),
    email=st.emails(),
    age=st.integers(min_value=0, max_value=120),
    is_active=st.booleans()
)
```

### JavaScript

```javascript
import { faker } from '@faker-js/faker';

// Seed para determinismo
faker.seed(12345);

// Generadores básicos
faker.person.fullName();    // 'John Smith'
faker.internet.email();     // 'john.smith@example.com'
faker.number.int({ min: 18, max: 65 });  // 34

// Función factory
function createUser(overrides = {}) {
    return {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        age: faker.number.int({ min: 18, max: 90 }),
        avatar: faker.image.avatar(),
        isActive: true,
        ...overrides
    };
}

// Generar batch
const users = Array.from({ length: 100 }, () => createUser());

// Helpers de faker específicos del dominio
const createOrder = (overrides = {}) => ({
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    items: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
        sku: `SKU-${faker.string.alphanumeric(6).toUpperCase()}`,
        quantity: faker.number.int({ min: 1, max: 10 }),
        price: faker.commerce.price({ min: 5, max: 500 })
    })),
    status: faker.helpers.arrayElement(['pending', 'paid', 'shipped', 'delivered']),
    createdAt: faker.date.past(),
    ...overrides
});

// Datos determinísticos para snapshots
faker.seed(42);
const snapshotUser = createUser({ name: 'Snapshot User' });
```

### Java

```java
import net.datafaker.Faker;
import java.util.List;
import java.util.stream.IntStream;

public class TestDataGenerator {
    private static final Faker faker = new Faker();

    public static User createUser() {
        return User.builder()
            .id(faker.number().randomNumber())
            .name(faker.name().fullName())
            .email(faker.internet().emailAddress())
            .age(faker.number().numberBetween(18, 90))
            .isActive(true)
            .build();
    }

    public static List<User> createUsers(int count) {
        return IntStream.range(0, count)
            .mapToObj(i -> createUser())
            .toList();
    }

    // JUnit 5 parametrizado con datos generados
    public static Stream<Arguments> emailProvider() {
        return Stream.generate(() -> Arguments.of(faker.internet().emailAddress()))
            .limit(50);
    }
}

// Instancio para generación type-aware
import org.instancio.Instancio;
import org.instancio.Select;

User user = Instancio.of(User.class)
    .set(Select.field("role"), "admin")
    .generate(Select.field("age"), gen -> gen.ints().range(18, 90))
    .create();

List<User> users = Instancio.ofList(User.class).size(100).create();
```

## Mejores Prácticas

- **Siempre siembra tu generador aleatorio.** Sin una seed, un test que falla en CI puede pasar localmente porque los datos eran diferentes. Configura `Faker.seed()` o `faker.seed()` en un archivo de setup global.
- **Sobrescribe campos específicos para tests de escenario.** `createUser({ role: 'admin' })` es más claro que esperar que el generador aleatorio produzca un admin.
- **Usa distribuciones realistas.** Una edad aleatoria entre 0 y 120 producirá principalmente datos inválidos. Restringe rangos para que coincidan con tu dominio (18-90 para adultos).
- **Genera datos cerca del test.** Un archivo de fixture global `users.json` diverge del esquema. Genera programáticamente para que agregar un nuevo campo actualice todos los tests automáticamente.
- **Incluye casos edge intencionalmente.** Testea strings vacíos, longitudes máximas, Unicode y valores null explícitamente junto con datos happy-path generados.

## Errores Comunes

- **Datos aleatorios sin seed.** Los tests fallan intermitentemente porque un email aleatorio coincidió con una restricción de unicidad, o un string aleatorio contuvo un patrón de inyección SQL.
- **Rangos demasiado permisivos.** `faker.number.int()` usa rangos grandes por defecto que pueden violar reglas de negocio (precios negativos, nombres de 200 caracteres).
- **Mezclar datos generados y hardcodeados inconsistentemente.** Algunos tests usan Faker, otros literales — el test suite tiene cobertura inconsistente y los desarrolladores no saben cuál usar.
- **No regenerar archivos de fixture estáticos.** Exportar un fixture JSON una vez y commitearlo a git significa que los datos nunca ejercitan nuevas reglas de validación agregadas después del export.
- **Generadores que dependen entre sí.** `createOrder()` llamando `createUser()` internamente oculta el usuario del test, haciendo imposibles las aserciones sobre la relación.

## Recursos Relacionados

- [Configurar Fixtures de Test](/recipes/testing/setup-test-fixtures)
- [Medir Cobertura de Test](/recipes/testing/measure-test-coverage)
- [Factory Pattern](/patterns/factory-pattern)
