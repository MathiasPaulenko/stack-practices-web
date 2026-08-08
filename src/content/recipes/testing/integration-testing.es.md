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
  - /recipes/load-testing-k6
  - /recipes/api-contract-testing
  - /recipes/load-testing
  - /recipes/nodejs-supertest-express-api
  - /recipes/unit-testing-mocking
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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

- **Testcontainers**: Levanta bases de datos reales, brokers de mensajes y otros servicios en contenedores Docker para la duración de tus tests.   Esto te da testing de integración genuino sin polucionar tu base de datos de desarrollo.
- **Supertest**: Para aplicaciones Express de Node.  js, supertest envía peticiones HTTP reales a tu app sin bindear a un puerto de red.   Testeas el ciclo completo de request incluyendo middleware, routing y serialización.
- **Spring Boot Test**: En Java, `@SpringBootTest(webEnvironment = RANDOM_PORT)` levanta todo el contexto de la aplicación en un puerto aleatorio, permitiéndote testear endpoints `@RestController` con `TestRestTemplate` o `WebTestClient`.

## Variantes

| Herramienta | Lenguaje | Tipo de dependencia | Mejor para |
|-------------|----------|---------------------|------------|
| Testcontainers | Java/Python/Go | Contenedores Docker reales | Bases de datos, Kafka, Redis |
| Supertest | JavaScript | HTTP in-process | APIs Express/Fastify |
| pytest-django | Python | Base de datos de test real | Integración con ORM Django |
| Spring Boot Test | Java | Contexto de aplicación completo | Microservicios Spring |

## Lo que funciona

- **Usa dependencias reales, no mocks**: todo el punto del testing de integración es verificar interacciones reales.   Mockea solo sistemas externos que no controles (gateways de pago, APIs de terceros).
- **Limpia entre tests**: trunca tablas, limpia colas, o recrea contenedores para que el orden de tests no afecte los resultados.
- **Mantén los tests de integración en un directorio separado**: `tests/integration/` o `src/test/integration/` deja claro que estos son más lentos y más exhaustivos.
- **Ejecútalos en CI, no en cada save de archivo**: configura tu test runner con comandos separados (`npm run test:unit` vs `npm run test:integration`).
- **Usa puertos aleatorios y bases de datos aisladas**: nunca ejecutes tests de integración contra tu base de datos de desarrollo o producción.
- **Limita el scope**: Un test que ejercita la base de datos, capa HTTP y cola de mensajes es difícil de debuggear cuando falla.

## Errores comunes

- **Ejecutar tests de integración contra bases de datos de producción**: esto puede corromper datos reales y violar políticas de compliance.
- **No limpiar después de los tests**: datos residuales causan tests flaky que pasan de forma aislada pero fallan en una suite.
- **Mockear todo en un test de integración**: si mockeas la base de datos y la capa HTTP, estás escribiendo un test unitario elaborado, no un test de integración.
- **Usar puertos hard-codeados**: conflictos de puertos causan tests flaky.
- **Testear demasiado en un solo test**: cuando un test de integración amplio falla, pasas más tiempo debuggeando qué capa se rompió que escribiendo el fix.

## Manejo de Errores en Tests

- **Manejo de test failures**: Captura screenshots en UI test failures.
- **Manejo de test timeouts**: setea appropriate timeouts para cada test.   Unit tests deberian completar en seconds.   Integration tests pueden necesitar longer timeouts.   E2E tests necesitan generous timeouts.
- **Gestion de flaky tests**: Quarantinea flaky tests.   Fixea root cause de flakiness.

## Seguridad en Testing

- **Seguridad de test data**: Nunca uses real production data en tests.   Maskea sensitive fields en test data.   Encripta test databases.
- **Seguridad de test environments**: Restringe access a test environments.
- **Secrets en tests**: nunca hardcodees secrets en test files.   Usa test-specific secret management.   Rota test secrets regularmente.

## Deployment y CI/CD para Tests

- **Diseno de test pipeline**: disena CI/CD pipeline para tests.   Corre integration tests en pull requests.   Corre security scans en every build.
- **Test parallelization**: paraleliza tests para faster execution.   Agrupa tests por dependency.   Aisla parallel tests.
- **Test result reporting**: Publica reports a stakeholders.

## Tools y Platforms de Testing

- **Unit testing frameworks**: elige el right unit testing framework.   Jest para JavaScript.   JUnit 5 para Java.   Vitest para modern JavaScript.   Updatea framework versions regularmente.
- **Integration testing tools**: TestContainers para Docker-based integration tests.   Supertest para API testing.   WireMock para external service mocking.   MSW para browser API mocking.
- **E2E testing tools**: elige el right E2E testing tool.   Playwright para modern web E2E.   Cypress para web applications.   Selenium para legacy web apps.   Detox para React Native.   Updatea E2E tools regularmente.

## Pitfalls Comunes de Testing

- **Over-mocking**: Mockea solo external dependencies.   Mockea solo lo que necesitas controlar.   Excessive mocking hace tests brittle.   Refactoriza over-mocked tests.
- **Testear implementation details**: Evita testear internal state.   Focate en public API behavior.   Refactoriza implementation-coupled tests.   Educa team en behavior testing.
- **Ignorar edge cases**: Testea empty inputs.   Testea boundary conditions.
## Best Practices

- **Convenciones de naming de tests**: usa descriptive test names.   Sigue arrange-act-assert pattern.   Nombra tests por behavior, no implementation.   Educa team en conventions.   Refactoriza poorly named tests.
- **Organizacion de tests**: organiza tests por feature o component.   Agrupa related tests en describe blocks.   Refactoriza large test files.
- **Gestion de test data**: usa factories para test data.   Usa fixtures para static data.   Refactoriza duplicated test data.
- **Test coverage goals**: setea realistic coverage goals.   80% para critical paths.   60% para utility code.   100% para pure functions.

## Optimizacion de Costos

- **Reduccion de test execution time**: Cachea test dependencies.   Refactoriza slow tests.
- **Reduccion de test maintenance**: Escribe maintainable tests.   Refactoriza duplicated test code.
- **Costos de test infrastructure**: Usa containerized test environments.   Escala test infrastructure con demand.

## Guia de Troubleshooting

- **Debugging failing tests**: aisla el failing test.   Verifica test environment.   Usa root cause analysis.
- **Debugging slow tests**: Profilea test execution.   Chequea network calls.
- **Debugging de test environment issues**: chequea environment configuration.   Verifica dependencies estan installed.   Verifica database state.

## Monitoring y Alerting

- **Key test metrics**: Ajusta thresholds basado en trends.
- **Configuracion de alerts**: setea alerts en test failure rate above 5%.   Alerta en flaky test rate increases.   Reduce alert noise.
- **Test reporting dashboards**: crea dashboards para test metrics.   Muestra pass rate, coverage y trends.   Updatea dashboards en real-time.

## Patrones Avanzados de Testing

- **Property-based testing**: usa property-based testing para edge case discovery.   Define properties que deberian siempre hold.
- **Mutation testing**: usa mutation testing para evaluar test quality.   Mutatea source code y corre tests.   Good tests catch mutations.   Calcula mutation score.
- **Snapshot testing**: usa snapshot testing para regression detection.   Captura component output como snapshot.
## Estrategias de Migracion

- **Migracion de manual a automated testing**: empieza con critical paths.   Agrega integration tests despues.   Agrega unit tests para new code.   Gradualmente agrega tests para legacy code.
- **Migracion entre test frameworks**: planea framework migration cuidadosamente.   Mapea old assertions a new framework.   Migra tests incrementalmente.   Completa migration despues de validation.
- **Migracion de monolith a microservices testing**: adapta test strategy para microservices.   Agrega contract tests para service boundaries.   Agrega integration tests para service interactions.   Reduce E2E test scope.

## Compliance y Governance

- **Testing SLAs**: define SLAs para test execution.   Unit tests completan en under 5 minutos.   Integration tests completan en under 30 minutos.   E2E tests completan en under 60 minutos.
- **Test reporting**: genera weekly test reports.
- **Audit y compliance**: manten audit trail de test results.
## Automatizacion y Tooling

- **Test automation framework**: construye un robusto test automation framework.   Usa factory pattern para test data.   Updatea framework con best practices.
- **Automated test generation**: Genera API tests desde OpenAPI specs.   Edita generated tests.
- **Test data automation**: Usa seeders para database setup.   Updatea automation regularmente.

## Sustentabilidad

- **Green testing**: Reduce unnecessary test runs.   Skipea tests para unchanged code.
- **Eficiencia de resources**: optimiza test resource usage.
- **Reduccion de waste**: reduce test waste.   Remueve unused test data.

## EstÃ¡ndares de Industria y Frameworks

- **Testing standards**: sigue industry testing standards.   ISTQB para testing terminology.   ISO/IEC 25010 para software quality.   IEEE 829 para test documentation.
- **Test-driven development**: practica TDD donde sea apropiado.   Escribe tests antes de code.   Red-green-refactor cycle.   Empieza con failing test.   Escribe minimal code para pass.   Refactoriza despues de passing.
- **Behavior-driven development**: practica BDD para acceptance criteria.   Escribe scenarios en Given-When-Then format.   Usa BDD para user-facing features.
## Reporting y Comunicacion

- **Performance reporting**: genera weekly performance reports para test suites.
- **Cost reporting**: Break down por environment, tool y team.
- **Incident reporting**: Conduce post-mortem reviews.

## Optimizacion Avanzada

- **Test suite optimization**: Mergea similar tests.   Skipea tests para unchanged code.
- **Test environment optimization**: Usa in-memory databases.   Cachea environment setup.
- **Test data optimization**: Usa factories para on-demand data.   Cachea test data.




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de testing y pytest para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica escribir tests de integración** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

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

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
