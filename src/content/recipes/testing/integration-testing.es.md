---
contentType: recipes
slug: integration-testing
title: "Escribir Tests de Integración"
description: "Cómo testear múltiples componentes trabajando juntos usando bases de datos reales, clientes HTTP y colas de mensajes en Python, JavaScript y Java."
metaDescription: "Aprende testing de integración con dependencias reales. Testea endpoints de API, capas de base de datos e interacciones de servicios en Python, JavaScript y Java."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - pytest
  - unit-tests
  - integration
  - tdd
relatedResources:
  - /recipes/unit-testing
  - /recipes/handle-errors
  - /recipes/call-rest-api
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende testing de integración con dependencias reales. Testea endpoints de API, capas de base de datos e interacciones de servicios en Python, JavaScript y Java."
  keywords:
    - testing de integración
    - api testing
    - database testing
    - pytest
    - jest integration
    - junit integration
    - testcontainers
    - testing end-to-end
---

## Visión general

Los tests unitarios verifican funciones individuales de forma aislada, pero las aplicaciones reales son ensamblajes de bases de datos, servicios HTTP, colas de mensajes y sistemas de archivos trabajando juntos. Los tests de integración verifican que estos componentes se conecten correctamente — que un repositorio pueda realmente leer de una base de datos, que un cliente de API maneje comportamiento real de red, y que los eventos se propaguen a través de brokers de mensajes.

Los tests de integración son más lentos y complejos que los unit tests, pero capturan una clase diferente de bugs: errores de connection strings, discrepancias de schema, problemas de serialización, y manejo de timeouts de red. Una suite de tests saludable usa tanto unit tests como tests de integración en diferentes niveles de la pirámide de testing.

## Cuándo usarlo

Usa esta receta cuando:

- Verificas que repositorios de base de datos y migraciones funcionan correctamente. Consulta [Connection Pooling](/recipes/performance/connection-pooling) para gestión de conexiones.
- Testeas endpoints de API HTTP con ciclos reales de request/response. Consulta [Call REST API](/recipes/api/call-rest-api) para diseño de APIs.
- Confirmas que productores y consumidores de colas de mensajes se integran apropiadamente. Consulta [Kafka Event Streaming](/recipes/messaging/kafka-event-streaming) para mensajería.
- Validas comportamiento de SDKs o APIs de terceros. Consulta [Handle Errors](/recipes/api/handle-errors) para manejo de fallos.
- Chequeas que la configuración y el setup del entorno sean correctos. Consulta [Environment Variables](/recipes/devops/environment-variables) para configuración.
- Ejecutas smoke tests pre-despliegue en pipelines de CI/CD. Consulta [CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para pipelines.

## Solución

### Python (pytest + Testcontainers)

```python
import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine, text

@pytest.fixture(scope="module")
def db_engine():
    with PostgresContainer("postgres:16") as postgres:
        engine = create_engine(postgres.get_connection_url())
        yield engine

def test_user_repository(db_engine):
    with db_engine.connect() as conn:
        conn.execute(text("CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)"))
        conn.execute(
            text("INSERT INTO users (name) VALUES (:name)"),
            {"name": "Alice"}
        )
        conn.commit()

        result = conn.execute(text("SELECT * FROM users"))
        users = result.fetchall()
        assert len(users) == 1
        assert users[0][1] == "Alice"
```

### JavaScript (Jest + Supertest)

```javascript
const request = require('supertest');
const app = require('./app'); // Express app

describe('POST /api/users', () => {
  afterAll(async () => {
    await app.db.close(); // cierra base de datos de test
  });

  test('crea un usuario y devuelve 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('alice@example.com');
  });

  test('devuelve 400 para email inválido', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'not-an-email' });

    expect(response.status).toBe(400);
  });
});
```

### Java (JUnit + Testcontainers)

```java
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
public class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16");

    @Test
    void shouldInsertAndRetrieveUser() {
        UserRepository repo = new UserRepository(
            postgres.getJdbcUrl(),
            postgres.getUsername(),
            postgres.getPassword()
        );

        User user = new User("Alice", "alice@example.com");
        repo.save(user);

        User found = repo.findByEmail("alice@example.com");
        assertEquals("Alice", found.getName());
    }
}
```

## Explicación

- **Testcontainers**: Levanta bases de datos reales, brokers de mensajes y otros servicios en contenedores Docker para la duración de tus tests. Esto te da testing de integración genuino sin polucionar tu base de datos de desarrollo.
- **Supertest**: Para aplicaciones Express de Node.js, supertest envía peticiones HTTP reales a tu app sin bindear a un puerto de red. Testeas el ciclo completo de request incluyendo middleware, routing y serialización.
- **Spring Boot Test**: En Java, `@SpringBootTest(webEnvironment = RANDOM_PORT)` levanta todo el contexto de la aplicación en un puerto aleatorio, permitiéndote testear endpoints `@RestController` con `TestRestTemplate` o `WebTestClient`.

## Variantes

| Herramienta | Lenguaje | Tipo de dependencia | Mejor para |
|-------------|----------|---------------------|------------|
| Testcontainers | Java/Python/Go | Contenedores Docker reales | Bases de datos, Kafka, Redis |
| Supertest | JavaScript | HTTP in-process | APIs Express/Fastify |
| pytest-django | Python | Base de datos de test real | Integración con ORM Django |
| Spring Boot Test | Java | Contexto de aplicación completo | Microservicios Spring |

## Lo que funciona

- **Usa dependencias reales, no mocks**: todo el punto del testing de integración es verificar interacciones reales. Mockea solo sistemas externos que no controles (gateways de pago, APIs de terceros).
- **Limpia entre tests**: trunca tablas, limpia colas, o recrea contenedores para que el orden de tests no afecte los resultados.
- **Mantén los tests de integración en un directorio separado**: `tests/integration/` o `src/test/integration/` deja claro que estos son más lentos y más exhaustivos.
- **Ejecútalos en CI, no en cada save de archivo**: configura tu test runner con comandos separados (`npm run test:unit` vs `npm run test:integration`).
- **Usa puertos aleatorios y bases de datos aisladas**: nunca ejecutes tests de integración contra tu base de datos de desarrollo o producción.
- **Limita el scope**: testea un punto de integración por test. Un test que ejercita la base de datos, capa HTTP y cola de mensajes es difícil de debuggear cuando falla.

## Errores comunes

- **Ejecutar tests de integración contra bases de datos de producción**: esto puede corromper datos reales y violar políticas de compliance.
- **No limpiar después de los tests**: datos residuales causan tests flaky que pasan de forma aislada pero fallan en una suite.
- **Mockear todo en un test de integración**: si mockeas la base de datos y la capa HTTP, estás escribiendo un test unitario elaborado, no un test de integración.
- **Usar puertos hard-codeados**: conflictos de puertos causan tests flaky. Usa siempre puerto 0 o asignación live.
- **Testear demasiado en un solo test**: cuando un test de integración amplio falla, pasas más tiempo debuggeando qué capa se rompió que escribiendo el fix.

## Preguntas frecuentes

**P: ¿En qué se diferencian los tests de integración de los tests end-to-end?**
R: Los tests de integración verifican un par o pequeño grupo específico de componentes. Los tests E2E ejercitan la aplicación completa a través de la UI o API pública, a menudo usando herramientas como Selenium, Playwright o Cypress.

**P: ¿Debería usar una base de datos en memoria como H2 o SQLite para tests de integración?**
R: Solo si tu base de datos de producción también es SQLite. Las bases de datos en memoria tienen comportamiento diferente de PostgreSQL o MySQL (aislamiento de transacciones, coerción de tipos, soporte JSON). Testcontainers con el motor real de base de datos es la opción más segura.

**P: ¿Cómo mantengo los tests de integración rápidos?**
R: Reusa contenedores entre tests (Testcontainers lo soporta), paraleliza la ejecución de tests, y limita el scope de cada test. Una suite de integración bien afinada debería ejecutarse en menos de 2 minutos.

**P: ¿Necesito tests de integración si tengo 100% de cobertura de unit tests?**
R: Sí. Los unit tests con dependencias mockeadas no pueden capturar errores de wiring, discrepancias de schema, o comportamiento real de timeouts de red. Ambos tipos se complementan.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
