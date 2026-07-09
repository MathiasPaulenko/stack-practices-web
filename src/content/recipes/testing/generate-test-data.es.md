---
contentType: recipes
slug: generate-test-data
title: "Generar Datos de Test"
description: "Cómo generar datos de test realistas y deterministas con Faker, factory-boy y generadores type-aware para suites de test confiables en Python, JavaScript y Java."
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
lastUpdated: "2026-07-09"
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

Los datos de test hardcodeados (`name = "John"`, `email = "test@test.com"`) rápidamente se vuelven obsoletos, fallan en exponer casos edge y no representan las distribuciones de datos de producción. Los generadores producen datos realistas, variados y deterministas que hacen los tests más confiables mientras reducen el mantenimiento manual de fixtures.

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

## Lo que funciona

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

## Preguntas Frecuentes

### ¿Por qué debería usar factories en lugar de fixtures estáticos?

Las factories generan datos bajo demanda y se adaptan a cambios de schema automáticamente. Los fixtures estáticos se vuelven obsoletos cuando se agregan o eliminan campos — un archivo `users.json` commiteado a git no ejercita nuevas reglas de validación. Las factories también permiten overrides por test: `createUser({ email: 'invalid' })` testea validación sin modificar un fixture compartido. Usa fixtures estáticos solo para tests golden-path donde los datos exactos importan (ej., snapshot tests).

### ¿Cómo mantengo los datos de test deterministas entre CI y runs locales?

Siembra tu generador aleatorio con un valor fijo en un archivo de setup global. En Python, llama `Faker.seed(12345)` en `conftest.py`. En JavaScript, llama `faker.seed(12345)` en un `globalSetup` de Jest. En Java, construye `new Faker(new Random(12345))`. Nunca dependas del system time o `/dev/urandom` para generación de datos de test. Si los tests fallan intermitentemente, revisa generadores sin sembrar en funciones helper o librerías de terceros.

### ¿Qué datos nunca deberían aparecer en tests?

Nunca uses datos personales reales, credenciales de producción o información de pagos. Usa datos sintéticos que se parezcan a los reales sin exponer a nadie. Faker genera nombres, emails y direcciones plausibles que pasan validación de formato sin corresponder a personas reales. Para compliance PII, evita copiar datos de producción a entornos de test — incluso con masking, campos residuales pueden exponer individuos. Usa herramientas de data masking o genera datasets sintéticos frescos para tests de integración.

### ¿Cómo genero datos con relaciones entre entidades?

Pasa objetos relacionados explícitamente: `const user = createUser(); const order = createOrder({ customerId: user.id })`. No hagas que `createOrder()` llame internamente a `createUser()` — esto oculta el usuario del test y hace imposibles las aserciones sobre la relación. Para grafos de objetos complejos, usa un test data builder que construya el grafo completo con referencias explícitas. En Python, usa `factory.SubFactory(UserFactory)` en `factory-boy` para linkear factories.

### ¿Cómo genero datos de edge case sistemáticamente?

Combina Faker con listas explícitas de edge cases. Genera 80% de los datos de test con Faker para cobertura amplia, luego agrega 20% de edge cases dirigidos: strings vacíos, strings de longitud máxima, caracteres Unicode, valores null, números negativos, cero, números muy grandes, fechas en boundaries (epoch, año 9999). Usa property-based testing (Hypothesis, fast-check) para generación exhaustiva de edge cases con shrinking.

### ¿Cómo genero datos para tests de integración de base de datos?

Usa factory-boy con SQLAlchemy o Django ORM: `class UserFactory(factory.django.DjangoModelFactory)` con `Meta: model = User`. Llama `UserFactory.create()` para insertar en la base de datos. Usa un fixture transaccional que haga rollback después de cada test para evitar acumulación de datos. Para datasets grandes (1000+ filas), usa `UserFactory.create_batch(1000)` en un fixture a nivel de módulo. Limpia con `User.objects.all().delete()` en teardown.

### ¿Cómo comparto generadores de datos de test entre test suites?

Extrae factories en un módulo compartido: `tests/factories/user_factory.py`. Importa en archivos de test: `from tests.factories import UserFactory`. Para JavaScript, exporta desde `test-utils/`: `export { createUser, createOrder } from './factories'`. Mantén los generadores framework-agnostic — no importes specifics del test runner en módulos de factory. Versiona el módulo compartido para que los breaking changes sean explícitos.

### ¿Cómo genero payloads de API realistas para contract tests?

Usa Faker para generar valores de campos, luego wrappéalos en el schema esperado de la API. Para specs OpenAPI, usa `@stoplight/prism-cli` para generar mock data desde el spec. Para protobuf, usa `buf` con plugins custom. Valida los payloads generados contra el schema con `ajv` (JSON Schema) o `protobufjs` antes de enviar. Incluye payloads inválidos en un test suite separado para verificar error handling.

### ¿Cómo genero datos de test basados en tiempo para tests de scheduling?

Usa los métodos de fecha de Faker con puntos de referencia fijos. Genera fechas relativas a una base conocida: `faker.date.between({ from: '2026-01-01', to: '2026-12-31' })`. Para tests de scheduling, genera eventos con ventanas de tiempo no superpuestas: `start = baseDate + i * duration`. Evita `faker.date.recent()` en tests — usa `Date.now()` y produce valores no deterministas. Para tests sensibles a timezone, genera fechas en UTC y convierte a la timezone objetivo en la aserción del test. Almacena la fecha base en un fixture para que todos los tests de un suite usen el mismo punto de referencia.

### ¿Cómo genero datasets grandes para load testing?

Usa generación en batch con `factory.build_batch(N)` en Python o `Array.from({ length: N }, () => createUser())` en JavaScript. Para 100K+ filas, streamea data a un archivo o base de datos en lugar de tener todo en memoria. En Python, usa `factory.build_batch(10000)` en un loop y escribe a CSV con `csv.writer`. En JavaScript, usa `createWriteStream` y escribe JSONL un registro a la vez. Siembra Faker una vez al inicio — re-sembrar mid-generation resetea la secuencia aleatoria y produce duplicados. Para seeding de base de datos, usa `COPY FROM` (PostgreSQL) o `LOAD DATA INFILE` (MySQL) para inserts 10x más rápidos que llamadas ORM row-by-row.

### ¿Cómo manejo constraints de unicidad con datos generados?

Faker no garantiza unicidad. Para emails, agrega un counter: `f"user{n}@example.com"`. Para UUIDs, usa `faker.string.uuid()` que es único por diseño. Para nombres únicos en un batch, usa `factory.Sequence(lambda n: f"user_{n}")` en factory-boy. En JavaScript, usa un counter: `let i = 0; const email = \`user\${i++}@example.com\``. Para tests de base de datos, wrappea la creación en try-catch y reintenta con un nuevo valor si ocurre una violación de unique constraint. No dependas de generación aleatoria para unicidad — la probabilidad de colisión aumenta con el batch size (birthday paradox).

### ¿Cómo genero datos con constraints de foreign key?

Crea padres antes que hijos: `user = UserFactory.create(); post = PostFactory.create(user_id=user.id)`. En factory-boy, usa `SubFactory`: `user = factory.SubFactory(UserFactory)`. Para constraints circulares (A referencia B, B referencia A), crea un registro placeholder primero, luego actualízalo. En tests de integración, usa `factory.PostGeneration` para crear registros dependientes después del padre. Limpia en orden inverso (hijos antes que padres) para evitar violaciones de foreign key. Usa `ON DELETE CASCADE` en el schema para que la limpieza sea automática.

### ¿Cómo genero datos para tests de i18n y localización?

Usa Faker con locales específicos: `Faker('es_ES')` para español, `Faker('ja_JP')` para japonés. Genera nombres, direcciones y números de teléfono que coincidan con el formato del locale. Testea validación de Unicode: caracteres CJK, emojis, caracteres RTL (árabe, hebreo). Genera strings con longitudes que excedan límites de bytes vs caracteres (un carácter CJK puede ser 3 bytes en UTF-8). Para tests de timezone, genera fechas en diferentes offsets y verifica que el sistema las convierta correctamente a UTC.

### ¿Cómo genero datos para tests de concurrency?

Genera N registros en paralelo y verifica que el sistema maneje concurrent writes correctamente. En Python, usa `concurrent.futures.ThreadPoolExecutor` para crear registros en paralelo. En JavaScript, usa `Promise.all` con múltiples factory calls. Testea race conditions: dos threads creando un registro con el mismo unique key simultáneamente. Verifica que las transactions se rollbackeen correctamente en deadlocks. Genera timestamps muy cercanos (dentro del mismo milisegundo) para testear ordering. Usa `factory.build_batch(N)` para generar datos sin persistir, luego persiste en paralelo para testear el database layer.

### ¿Cómo genero datos para tests de edge cases?

Genera valores en los límites: strings vacíos, strings de longitud máxima, null/undefined, números negativos, cero, `Number.MAX_SAFE_INTEGER`, fechas en el pasado lejano y futuro lejano. Para strings, prueba con caracteres especiales: comillas, backslashes, newlines, null bytes. Para arrays, prueba vacío, un elemento, y el máximo esperado. Para enums, prueba cada valor válido y un valor inválido. Usa property-based testing con `fast-check` (JavaScript) o `hypothesis` (Python) para generar casos de test automáticamente a partir de propiedades definidas.

### ¿Cómo genero datos para tests de API contract testing?

Genera payloads que coincidan exactamente con el schema del API contract. Usa los schemas OpenAPI/JSON Schema para crear datos válidos: extrae required fields, types, y constraints del schema. En JavaScript, usa `@faker-js/faker` con `openapi-backend` para generar requests válidos automáticamente. En Python, usa `hypothesis` con strategies basadas en el JSON Schema. Genera también payloads inválidos para testear validación: missing required fields, wrong types, valores fuera de rango. Para versioned APIs, genera payloads para cada versión y verifica que el server los maneje correctamente.

### ¿Cómo genero datos para tests de performance y benchmarks?

Genera datasets representativos de producción: misma distribución de tamaños de registros, misma proporción de tipos. Usa datos sintéticos con realismo estadístico: distribuciones gaussianas para edades, power-law para frecuencias de acceso. Para benchmarks de query, genera datasets de tamaños específicos (1K, 10K, 100K, 1M rows) y mide el tiempo de query en cada nivel. Genera índices con cardinalidad realista para testear el query planner. Para benchmarks de write, genera batches de diferentes tamaños y mide throughput. Usa `timeit` en Python o `benchmark.js` para mediciones precisas. Documenta los parámetros de generación para que los benchmarks sean reproducibles.

### ¿Cómo limpio datos de test generados después de los tests?

Usa transactional test fixtures: wrappea cada test en una database transaction y roll back al final. En pytest, usa el plugin `pytest-postgresql` o `factory-boy`'s `SQLAlchemyModelFactory` con fixtures session-scoped. En Jest, usa `beforeEach`/`afterEach` para setear y tear down data. Para estado compartido across tests, usa un schema o database dedicado que se trunca entre test runs. Nunca corras tests contra un production database. Usa `TRUNCATE TABLE` con `CASCADE` para fast cleanup entre test suites. Para file-based test data, usa directorios `tempfile` que se limpian automáticamente por el OS.
