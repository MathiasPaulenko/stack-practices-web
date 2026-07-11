---
contentType: recipes
slug: integration-testing-strategies
title: "Diseñar Tests de Integración Efectivos para Sistemas"
description: "Cómo escribir tests de integración que verifiquen interacciones de componentes usando test containers, contratos de API, consumer-driven contracts y contract testing en Java, TypeScript y Python."
metaDescription: "Aprende estrategias de testing de integración para sistemas confiables. Verifica interacciones con test containers, contratos de API y consumer-driven contract testing."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - api-testing
  - consumer-driven-contracts
  - unit-tests
  - integration
relatedResources:
  - /recipes/unit-testing-mocking
  - /recipes/api-gateway
  - /recipes/microservices-patterns
  - /recipes/docker-basics
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende estrategias de testing de integración para sistemas confiables. Verifica interacciones con test containers, contratos de API y consumer-driven contract testing."
  keywords:
    - testing integracion
    - test containers
    - contract testing
    - testing contratos API
    - consumer driven contracts
---

## Visión general

Los unit tests verifican que `calculateTotal()` retorna la suma correcta. Mockean la base de datos, el gateway de pagos y el servicio de inventario. Todo pasa. Luego deployas a staging y la aplicación falla al arrancar porque la migración de base de datos nunca se ejecutó. El gateway de pagos rechaza peticiones porque cambió la versión de API. El servicio de inventario retorna 503 porque el ambiente de test está caído.

Los tests de integración verifican que tu código funciona con dependencias reales (o realistas). Capturan los desajustes que los unit tests no pueden: cambios de schema, drift de versión de API, errores de configuración y comportamiento de red. Un test de integración bien diseñado levanta una base de datos real en un container, arranca tu servicio y ejercita los endpoints HTTP reales. El siguiente enfoque cubre test containers, contract testing, consumer-driven contracts y estrategias para testear al nivel correcto de abstracción.

## Cuándo usarlo

Usa esta receta cuando:

- Verificando que tu servicio se integra correctamente con bases de datos, message queues o APIs externas. Consulta [Unit Testing](/recipes/testing/unit-testing) para aislar dependencias con mocks.
- Capturando desajustes de contrato de API entre microservicios antes del deployment. Consulta [API Contract Testing](/recipes/testing/api-mocking) para contratos consumer-driven.
- Testeando migraciones de base de datos y compatibilidad de schema
- Asegurando que configuración y wiring funcionan en un ambiente realista. Consulta [Docker Basics](/recipes/devops/docker-basics) para entornos de test containerizados.
- Complementando unit tests con confianza de que los componentes interactúan correctamente

## Solución

### Test Containers (Java / Spring Boot)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void createOrder_persistsAndReturns() {
        OrderRequest request = new OrderRequest("sku-123", 2);
        ResponseEntity<Order> response = restTemplate.postForEntity(
            "/orders", request, Order.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getId()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("pending");
    }
}
```

### Contract Testing de API (TypeScript / Pact)

```typescript
import { PactV3 } from '@pact-foundation/pact';

const pact = new PactV3({
  consumer: 'OrderFrontend',
  provider: 'OrderAPI',
});

describe('Order API contract', () => {
  it('returns order details', async () => {
    await pact
      .given('an order exists')
      .uponReceiving('a request for order details')
      .withRequest({
        method: 'GET',
        path: '/orders/123',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: pact.like('123'),
          status: pact.like('pending'),
          total: pact.like(99.99),
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/orders/123`);
      const data = await response.json();
      expect(data.status).toBe('pending');
    });
  });
});
```

### Python Integration Test con Docker Compose

```python
import pytest
import requests
from sqlalchemy import create_engine
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="module")
def db_engine():
    with PostgresContainer("postgres:15") as postgres:
        yield create_engine(postgres.get_connection_url())

@pytest.fixture
def api_client():
    return requests.Session()

def test_create_order_and_query(db_engine, api_client):
    response = api_client.post("http://localhost:8000/orders", json={
        "items": [{"sku": "abc", "quantity": 2}],
        "customer_id": "cust-123"
    })
    assert response.status_code == 201
    order_id = response.json()["id"]

    with db_engine.connect() as conn:
        result = conn.execute(
            "SELECT status, total FROM orders WHERE id = %s",
            (order_id,)
        )
        row = result.fetchone()
        assert row.status == "pending"
        assert row.total == 49.99
```

## Explicación

- **Test containers**: los tests de integración corren contra servicios reales en containers Docker — PostgreSQL, Redis, Kafka, Elasticsearch. Testcontainers gestiona el ciclo de vida del container: pull, arranque, exposición de puertos y limpieza después de los tests. Esto te da comportamiento real de base de datos (transacciones, constraints, migraciones) sin contaminar ambientes de test compartidos.
- **Contract testing**: los tests de contrato consumer-driven verifican que las expectativas del consumidor coinciden con la implementación del provider. El consumidor define un contrato ("cuando envío esta petición, espero esta respuesta"). El provider verifica que puede satisfacer todos los contratos. Pact almacena contratos en un broker y rompe el build si un cambio del provider rompe un consumidor.
- **WireMock / Mountebank**: estas herramientas stubbean servicios HTTP externos. A diferencia de mocks simples en unit tests, WireMock corre como un servidor HTTP real al que tu aplicación llama. Verificas que la aplicación envió la petición esperada (headers, body, query params) y retornas respuestas realistas. Esto testea la capa de cliente HTTP, serialización y manejo de errores.
- **Tests de integración de base de datos**: estos verifican que tus mappings de ORM, migraciones y queries funcionan contra el motor de base de datos real. Capturan diferencias de dialecto (PostgreSQL vs. MySQL), índices faltantes, violaciones de constraints y problemas de aislamiento de transacciones que bases de datos en memoria como H2 ocultan.

## Variantes

| Tipo de test | Alcance | Velocidad | Confiabilidad | Mejor para |
|-------------|---------|-----------|---------------|------------|
| In-memory (H2, SQLite) | Componente único | Rápido | Baja | Cercano a unit, feedback rápido |
| Testcontainers | Componente + DB real | Medio | Alta | Integración de base de datos |
| Servicio local | Servicio + deps | Medio | Media | Validación pre-commit |
| Staging compartido | Sistema completo | Lento | Baja | Smoke tests, exploratorios |
| Contract tests | Límite de API | Rápido | Alta | Límites entre microservicios |

## Lo que funciona

- **Mantén los tests de integración enfocados**: un test de integración debería verificar un límite de integración a la vez. Un test que golpea la base de datos, una API externa y una message queue es difícil de debuggear cuando falla. Separa en tests distintos para integración de base de datos, contrato de API e integración de message queue.
- **Usa puertos live e IDs aleatorios**: puertos hardcodeados causan colisiones cuando los tests corren en paralelo. Usa `RANDOM_PORT` de Spring Boot o mapeo live de puertos de Testcontainers. Usa UUIDs para datos de test para que los tests no interfieran entre sí.
- **Limpia entre tests**: trunca tablas, elimina topics de Kafka o resetea stubs de WireMock entre tests. El estado compartido causa tests flaky. Usa `@Transactional` con rollback (para tests en memoria) o estrategia de restart-per-test de Testcontainers.
- **Corre tests de integración en CI, no localmente**: los tests de integración son más lentos que unit tests. Los desarrolladores corren unit tests durante desarrollo. Los tests de integración corren en CI en cada pull request. Usa profiles de Maven (`-P integration-tests`) o archivos de test separados (`*.integration.test.ts`) para controlar cuándo corren.
- **Versiona tu infraestructura de test**: pinnea imágenes Docker (`postgres:15.2`, no `postgres:latest`) y versiones de dependencias. Un nuevo release menor de PostgreSQL o un upgrade de WireMock puede cambiar comportamiento y romper tests. El pinning asegura reproducibilidad.

## Errores comunes

- **Testear demasiado en un solo test**: un test de integración que crea un usuario, coloca una orden, procesa el pago y envía un email testea todo el sistema. Cuando falla, no sabes qué paso se rompió. Descompón en tests de integración enfocados para cada límite.
- **Depender de ambientes de test compartidos**: una base de datos de staging que múltiples desarrolladores y pipelines de CI comparten es una fuente de flakiness. Los datos de un desarrollador afectan los tests de otro. Usa Testcontainers o bases de datos por test.
- **No aislar tests de APIs externas**: tests que llaman gateways de pago reales o servicios de email son lentos, caros y no deterministas. Siempre stubbean APIs externas en tests de integración. Reserva llamadas a APIs reales para tests de humo dedicados en un ambiente controlado.
- **Ignorar tests flaky**: si un test de integración falla 1 en 20 ejecuciones, los desarrolladores lo ignoran. Los tests flaky destruyen la confianza en el test suite. Investiga causas raíz: condiciones de carrera, timing issues, colisiones de puertos o estado compartido. Arregla el flakiness o elimina el test.

## Manejo de Errores en Tests

- **Manejo de test failures**: maneja test failures con clear assertions. Usa descriptive assertion messages. Captura screenshots en UI test failures. Loggea test environment details en failure. Documenta failure handling strategy. Testea con known failing cases. Monitorea failure patterns. Alerta en unexpected pass rates. Revisa failing tests promptamente. Usa soft assertions para non-critical checks
- **Manejo de test timeouts**: setea appropriate timeouts para cada test. Unit tests deberian completar en seconds. Integration tests pueden necesitar longer timeouts. E2E tests necesitan generous timeouts. Documenta timeout strategy. Testea timeout behavior. Monitorea timeout frequency. Alerta en timeout spikes. Revisa timeout values trimestralmente. Usa configurable timeouts
- **Gestion de flaky tests**: identifica y fixea flaky tests. Trackea flaky test history. Quarantinea flaky tests. Fixea root cause de flakiness. Documenta flaky test strategy. Monitorea flaky test rate. Alerta en flaky test increases. Revisa quarantined tests regularmente. Prioriza flaky test fixes. Usa retry strategies cuidadosamente

## Seguridad en Testing

- **Seguridad de test data**: usa synthetic data para testing. Nunca uses real production data en tests. Maskea sensitive fields en test data. Encripta test databases. Documenta test data security strategy. Testea con different data sets. Monitorea test data access. Alerta en unauthorized access. Revisa test data regularmente. Usa data generation tools
- **Seguridad de test environments**: asegura test environments. Usa separate credentials para test environments. Restringe access a test environments. Usa VPN para internal test environments. Documenta test environment security. Testea security controls. Monitorea access logs. Alerta en security violations. Revisa access permissions regularmente. Usa least privilege principle
- **Secrets en tests**: nunca hardcodees secrets en test files. Usa environment variables para test secrets. Usa test-specific secret management. Rota test secrets regularmente. Documenta secrets management strategy. Testea con missing secrets. Monitorea secret usage. Alerta en secret exposure. Revisa secret handling code. Usa mock secrets para unit tests

## Deployment y CI/CD para Tests

- **Diseno de test pipeline**: disena CI/CD pipeline para tests. Corre unit tests en every commit. Corre integration tests en pull requests. Corre E2E tests antes de deployment. Corre security scans en every build. Documenta pipeline design. Testea pipeline performance. Monitorea pipeline success rate. Alerta en pipeline failures. Optimiza pipeline execution time
- **Test parallelization**: paraleliza tests para faster execution. Usa test runners que soportan parallel execution. Agrupa tests por dependency. Aisla parallel tests. Documenta parallelization strategy. Testea parallel execution. Monitorea parallel test performance. Alerta en race conditions. Revisa parallelization configuration. Balancea parallelism y resource usage
- **Test result reporting**: reporta test results claramente. Genera test reports en CI. Publica reports a stakeholders. Incluye test coverage en reports. Trackea test metrics en el tiempo. Documenta reporting strategy. Testea report format. Monitorea report accuracy. Alerta en report failures. Revisa report content regularmente

## Tools y Platforms de Testing

- **Unit testing frameworks**: elige el right unit testing framework. Jest para JavaScript. PyTest para Python. JUnit 5 para Java. Vitest para modern JavaScript. Documenta framework choice. Testea framework features. Monitorea framework performance. Revisa framework compatibility. Updatea framework versions regularmente. Usa framework-specific best practices
- **Integration testing tools**: usa appropriate tools para integration testing. TestContainers para Docker-based integration tests. Supertest para API testing. WireMock para external service mocking. MSW para browser API mocking. Documenta tool selection. Testea tool compatibility. Monitorea tool performance. Revisa tool effectiveness. Updatea tools regularmente
- **E2E testing tools**: elige el right E2E testing tool. Playwright para modern web E2E. Cypress para web applications. Selenium para legacy web apps. Detox para React Native. Documenta E2E tool choice. Testea E2E framework. Monitorea E2E test stability. Revisa E2E test coverage. Updatea E2E tools regularmente. Usa page object model

## Pitfalls Comunes de Testing

- **Over-mocking**: evita mockear demasiado. Mockea solo external dependencies. Mockea solo lo que necesitas controlar. Excessive mocking hace tests brittle. Documenta mocking strategy. Revisa mock usage regularmente. Refactoriza over-mocked tests. Monitorea test maintainability. Alerta en excessive mock count. Usa real implementations donde sea posible
- **Testear implementation details**: testea behavior, no implementation. Evita testear private methods. Evita testear internal state. Focate en public API behavior. Documenta testing philosophy. Revisa tests para implementation coupling. Refactoriza implementation-coupled tests. Monitorea test refactoring needs. Educa team en behavior testing. Usa black-box testing approach
- **Ignorar edge cases**: testea edge cases thoroughly. Testea empty inputs. Testea null values. Testea boundary conditions. Testea error paths. Documenta edge case testing strategy. Revisa edge case coverage. Monitorea edge case failures. Alerta en missing edge cases. Usa property-based testing para edge cases. Testea con random data
## Best Practices

- **Convenciones de naming de tests**: usa descriptive test names. Sigue arrange-act-assert pattern. Nombra tests por behavior, no implementation. Usa consistent naming across the suite. Documenta naming conventions. Revisa test names regularmente. Educa team en conventions. Monitorea naming compliance. Refactoriza poorly named tests. Usa standard prefixes como "should" o "when"
- **Organizacion de tests**: organiza tests por feature o component. Agrupa related tests en describe blocks. Manten test files cerca de source files. Usa shared setup en beforeAll o beforeEach. Documenta test organization strategy. Revisa test file structure. Monitorea test file size. Refactoriza large test files. Usa helper functions para common setup. Manten tests independent
- **Gestion de test data**: usa factories para test data. Usa builders para complex objects. Usa fixtures para static data. Usa seeders para database tests. Documenta test data strategy. Revisa test data usage. Monitorea test data maintenance. Refactoriza duplicated test data. Usa test data generators. Manten test data realistic pero synthetic
- **Test coverage goals**: setea realistic coverage goals. 80% para critical paths. 60% para utility code. 100% para pure functions. Documenta coverage goals. Trackea coverage trends. Alerta en coverage drops. Revisa uncovered code. Prioriza coverage para high-risk code. Usa branch coverage sobre line coverage. Reporta coverage en CI

## Optimizacion de Costos

- **Reduccion de test execution time**: optimiza test execution speed. Usa parallel test execution. Minimiza database setup. Usa in-memory databases para unit tests. Cachea test dependencies. Documenta optimization strategy. Testea execution time regularmente. Monitorea test duration trends. Alerta en slow tests. Refactoriza slow tests. Usa test prioritization
- **Reduccion de test maintenance**: minimiza test maintenance overhead. Escribe maintainable tests. Evita brittle assertions. Usa page object model para E2E. Refactoriza duplicated test code. Documenta maintenance strategy. Revisa test maintenance effort. Monitorea test code churn. Alerta en high maintenance tests. Usa shared test utilities. Manten tests DRY
- **Costos de test infrastructure**: optimiza test infrastructure costs. Usa shared test environments. Usa containerized test environments. Escala test infrastructure con demand. Documenta cost optimization strategy. Monitorea infrastructure costs. Alerta en cost spikes. Revisa infrastructure usage. Usa spot instances para CI. Optimiza resource allocation

## Guia de Troubleshooting

- **Debugging failing tests**: aisla el failing test. Corre el test en isolation. Chequea test dependencies. Verifica test environment. Chequea race conditions. Documenta debugging steps. Usa debugging tools. Monitorea failure patterns. Alerta en recurring failures. Usa root cause analysis. Fixea root cause, no symptoms
- **Debugging slow tests**: identifica slow tests. Profilea test execution. Chequea database queries. Chequea network calls. Chequea test setup. Documenta debugging steps. Usa profiling tools. Monitorea test duration. Alerta en slow tests. Optimiza slow operations. Usa async operations donde sea posible
- **Debugging de test environment issues**: chequea environment configuration. Verifica dependencies estan installed. Chequea environment variables. Verifica database state. Chequea network connectivity. Documenta debugging steps. Testea environment setup. Monitorea environment health. Alerta en environment issues. Usa infrastructure as code. Manten environments consistent

## Monitoring y Alerting

- **Key test metrics**: trackea test pass rate, execution time, coverage y flaky test rate. Monitorea test count trends. Trackea test maintenance effort. Documenta metrics strategy. Configura dashboards para key metrics. Revisa metrics regularmente. Ajusta thresholds basado en trends. Alerta en critical metrics. Usa metrics para improvement decisions
- **Configuracion de alerts**: setea alerts en test failure rate above 5%. Alerta en coverage drops. Alerta en flaky test rate increases. Alerta en test execution time spikes. Usa multi-level alerts: warning y critical. Documenta alert thresholds. Testea alert delivery. Revisa alert effectiveness mensualmente. Reduce alert noise. Usa runbooks para cada alert
- **Test reporting dashboards**: crea dashboards para test metrics. Muestra pass rate, coverage y trends. Comparte con stakeholders. Updatea dashboards en real-time. Documenta dashboard strategy. Revisa dashboard content. Monitorea dashboard usage. Alerta en dashboard failures. Usa dashboards para decision making. Manten dashboards simple y focused

## Patrones Avanzados de Testing

- **Property-based testing**: usa property-based testing para edge case discovery. Define properties que deberian siempre hold. Deja al framework generar test cases. Corre many iterations para encontrar counterexamples. Documenta property-based testing strategy. Testea con different generators. Monitorea property test effectiveness. Revisa properties regularmente. Usa shrinking para debugging. Combina con example-based tests
- **Mutation testing**: usa mutation testing para evaluar test quality. Mutatea source code y corre tests. Good tests catch mutations. Calcula mutation score. Documenta mutation testing strategy. Testea con different mutators. Monitorea mutation score trends. Revisa surviving mutants. Usa mutation testing para critical code. Balancea mutation testing cost y value
- **Snapshot testing**: usa snapshot testing para regression detection. Captura component output como snapshot. Compara future runs contra snapshot. Revisa snapshot diffs cuidadosamente. Documenta snapshot testing strategy. Testea snapshot update process. Monitorea snapshot drift. Alerta en large snapshot changes. Usa snapshots para serializable output. Manten snapshots small y focused
## Estrategias de Migracion

- **Migracion de manual a automated testing**: empieza con critical paths. Automatiza smoke tests primero. Agrega integration tests despues. Agrega unit tests para new code. Gradualmente agrega tests para legacy code. Documenta migration strategy. Testea automation progress. Monitorea test coverage growth. Alerta en coverage stagnation. Revisa migration progress trimestralmente
- **Migracion entre test frameworks**: planea framework migration cuidadosamente. Mapea old assertions a new framework. Migra tests incrementalmente. Corre ambos frameworks en paralelo. Documenta migration strategy. Testea migrated tests. Monitorea migration progress. Alerta en migration blockers. Completa migration despues de validation. Limpia old framework
- **Migracion de monolith a microservices testing**: adapta test strategy para microservices. Agrega contract tests para service boundaries. Agrega integration tests para service interactions. Reduce E2E test scope. Documenta microservices testing strategy. Testea service contracts. Monitorea test execution. Alerta en contract violations. Revisa test architecture. Usa service virtualization

## Compliance y Governance

- **Testing SLAs**: define SLAs para test execution. Unit tests completan en under 5 minutos. Integration tests completan en under 30 minutos. E2E tests completan en under 60 minutos. Trackea SLA compliance. Alerta en SLA violations. Documenta SLA definitions. Revisa SLAs trimestralmente. Comunica SLA status. Usa SLA para priorizacion
- **Test reporting**: genera weekly test reports. Incluye pass rate, coverage y trends. Highlighta flaky tests. Comparte con stakeholders. Documenta reporting methodology. Automatiza report generation. Revisa report content. Trackea metrics en el tiempo. Usa reports para planning y optimization
- **Audit y compliance**: manten audit trail de test results. Trackea quien corrio tests y cuando. Loggea all test environment changes. Usa version control para test code. Documenta audit strategy. Testea audit log completeness. Monitorea audit log retention. Revisa compliance requirements regularmente. Alerta en audit log gaps
## Automatizacion y Tooling

- **Test automation framework**: construye un robusto test automation framework. Usa page object model para UI tests. Usa factory pattern para test data. Usa builder pattern para complex objects. Documenta framework architecture. Testea framework components. Monitorea framework performance. Revisa framework regularmente. Updatea framework con best practices. Manten framework maintainable
- **Automated test generation**: usa tools para automated test generation. Genera unit tests desde code analysis. Genera API tests desde OpenAPI specs. Genera E2E tests desde user flows. Documenta generation strategy. Testea generated tests. Monitorea generation quality. Revisa generated tests. Edita generated tests. Usa generation para coverage gaps
- **Test data automation**: automatiza test data generation. Usa factories para consistent data. Usa seeders para database setup. Usa mock servers para external APIs. Documenta automation strategy. Testea data automation. Monitorea data quality. Revisa automation effectiveness. Updatea automation regularmente. Manten data realistic

## Sustentabilidad

- **Green testing**: optimiza test energy consumption. Reduce unnecessary test runs. Usa incremental testing. Skipea tests para unchanged code. Usa parallel execution para reducir wall time. Documenta green testing strategy. Monitorea test energy usage. Revisa testing efficiency. Optimiza test resources. Usa cloud-native testing tools
- **Eficiencia de resources**: optimiza test resource usage. Right-sizea test environments. Usa containerized tests. Comparte test resources across teams. Limpia test data despues de runs. Documenta resource efficiency strategy. Monitorea resource utilization. Revisa efficiency metrics. Optimiza resource allocation. Usa ephemeral environments
- **Reduccion de waste**: reduce test waste. Deletea obsolete tests. Remueve duplicate tests. Limpia test artifacts. Remueve unused test data. Monitorea idle test resources. Documenta waste reduction strategy. Revisa test suite regularmente. Alerta en waste indicators. Automatiza cleanup procedures

## EstÃ¡ndares de Industria y Frameworks

- **Testing standards**: sigue industry testing standards. ISTQB para testing terminology. ISO/IEC 25010 para software quality. IEEE 829 para test documentation. Documenta standards usage. Testea compliance con standards. Monitorea standards adoption. Revisa standards regularmente. Entrena team en standards. Usa standards para test design
- **Test-driven development**: practica TDD donde sea apropiado. Escribe tests antes de code. Red-green-refactor cycle. Empieza con failing test. Escribe minimal code para pass. Refactoriza despues de passing. Documenta TDD practices. Testea TDD adoption. Monitorea TDD effectiveness. Revisa TDD code quality. Usa TDD para critical features
- **Behavior-driven development**: practica BDD para acceptance criteria. Escribe scenarios en Given-When-Then format. Usa Cucumber o SpecFlow para BDD. Documenta BDD practices. Testea BDD scenarios. Monitorea BDD adoption. Revisa BDD effectiveness. Usa BDD para user-facing features. Manten scenarios readable. Automatiza BDD scenarios
## Preguntas frecuentes

**P: ¿Cuántos tests de integración debería tener?**
R: Menos que unit tests. Sigue la pirámide de tests: muchos unit tests (rápidos, aislados), menos tests de integración (medios, enfocados en límites), y muy pocos end-to-end tests (lentos, sistema completo). Los tests de integración deberían cubrir cada límite crítico una vez.

**P: ¿Debería mockear la base de datos en tests de integración?**
R: No — el punto de un test de integración es verificar comportamiento real de base de datos. Mockea la base de datos para unit tests. Usa Testcontainers para tests de integración. Si el test corre contra una base de datos en memoria (H2, SQLite), es más cercano a un unit test que a un test de integración.

**P: ¿Cómo testeo integraciones con message queues?**
R: Usa Testcontainers para levantar un container real de Kafka o RabbitMQ. Publica un mensaje, corre tu consumidor, y aserte los efectos secundarios (escrituras a base de datos, llamadas a API). Alternativamente, usa un broker embebido para testing ligero de colas.

**P: ¿Pueden los contract tests reemplazar los tests de integración?**
R: No — se complementan. Los contract tests verifican que la forma de la API coincide con expectativas. Los tests de integración verifican que el comportamiento real (consistencia de datos, efectos secundarios, manejo de errores) es correcto. Usa ambos: Pact para validación de contrato, Testcontainers para validación de comportamiento.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.