---



contentType: recipes
slug: api-mocking
title: "API Mocking para Testing"
description: "Construye tests confiables mockeando APIs externas con WireMock, MockServer y MSW para eliminar flakiness y testear casos edge."
metaDescription: "Estrategias de API mocking para testing: WireMock, MockServer, MSW, definiciones de stubs, response templating y testing de casos edge sin dependencias reales."
difficulty: intermediate
topics:
  - testing
tags:
  - api-mocking
  - testing
  - mocking
  - automation
  - unit-tests
relatedResources:
  - /guides/cicd-pipeline-guide
  - /guides/testing-strategy-guide
  - /guides/test-driven-development-guide
  - /recipes/load-testing-k6
  - /recipes/graphql-mocking-apollo-server
  - /recipes/javascript-msw-mock-service-worker
  - /guides/complete-guide-junit5-modern-testing
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Estrategias de API mocking para testing: WireMock, MockServer, MSW, definiciones de stubs, response templating y testing de casos edge sin dependencias reales."
  keywords:
    - api-mocking
    - testing
    - mocking
    - automation



---
## Visión General

El API mocking reemplaza dependencias externas reales con simulaciones controladas durante el [testing](/guides/testing/testing-strategy-guide). Esto elimina la flakiness de red, reduce el tiempo de ejecución de tests y habilita el testing de casos edge — como errores 500 o timeouts — que son difíciles de reproducir con servicios en vivo. Herramientas modernas como WireMock, MSW y MockServer proveen request matching, response templating y capacidades de verificación que hacen que los mocks se comporten como lo real.

## Cuándo Usar

Usa este recurso cuando:
- Las APIs externas son poco confiables, lentas o tienen rate limits que bloquean [pipelines de CI](/guides/devops/cicd-pipeline-guide)
- Necesitas testear manejo de errores para HTTP 429, 503 o [escenarios de timeout](/recipes/architecture/retry-backoff)
- El servicio real no tiene un sandbox o ambiente de test
- Quieres tests determinísticos que no fallen por cambios de terceros

## Solución

### WireMock Standalone (Java)

```java
import com.github.tomakehurst.wiremock.WireMockServer;
import static com.github.tomakehurst.wiremock.client.WireMock.*;

public class PaymentApiMock {
    private static WireMockServer wireMockServer;

    public static void start() {
        wireMockServer = new WireMockServer(8089);
        wireMockServer.start();

        wireMockServer.stubFor(
            post(urlEqualTo("/payments"))
                .withHeader("Content-Type", equalTo("application/json"))
                .withRequestBody(matchingJsonPath("$.amount"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("{\"id\": \"pay_123\", \"status\": \"succeeded\"}")
                )
        );

        // Escenario de error
        wireMockServer.stubFor(
            post(urlEqualTo("/payments"))
                .withRequestBody(matchingJsonPath("$.amount", equalTo("999999")))
                .willReturn(aResponse()
                    .withStatus(400)
                    .withBody("{\"error\": \"amount_exceeds_limit\"}")
                )
        );
    }

    public static void stop() {
        wireMockServer.stop();
    }
}
```

### MSW (Mock Service Worker) para Browser/Node

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  rest.get('https://api.example.com/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json({ id, name: 'Test User', email: 'test@example.com' })
    );
  }),

  rest.post('https://api.example.com/orders', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ orderId: 'ord_456', total: req.body.total })
    );
  }),

  // Simulación de error de red
  rest.get('https://api.example.com/flaky', (req, res, ctx) => {
    return res(ctx.status(503), ctx.json({ error: 'Service Unavailable' }));
  })
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Python responses Library

```python
import responses
import requests

@responses.activate
def test_payment_api():
    responses.add(
        responses.POST,
        'https://payments.example.com/charge',
        json={'id': 'ch_123', 'status': 'succeeded'},
        status=200
    )

    result = requests.post(
        'https://payments.example.com/charge',
        json={'amount': 100, 'currency': 'USD'}
    )

    assert result.json()['status'] == 'succeeded'
    assert len(responses.calls) == 1
    assert responses.calls[0].request.json()['amount'] == 100
```

## Explicación

**Tres estrategias de mocking**:

| Estrategia | Nivel | Ideal Para |
|------------|-------|------------|
| HTTP server proxy | Red | Tests de integración; verificar clientes HTTP reales |
| Request interceptor | Aplicación | Tests unitarios; mocking unificado browser/Node |
| Service virtualization | Sistema | APIs stateful complejas; contract testing |

**Jerarquía de request matching**:
1. **URL exacta** — `GET /users/123`
2. **Patrón de path** — `GET /users/*`
3. **Match de header** — `Content-Type: application/json`
4. **Match de body** — JSON path o regex en request body
5. **State-dependent** — Retornar respuesta diferente en segunda llamada

## Variantes

| Herramienta | Lenguaje | Mejor Feature |
|-------------|----------|---------------|
| WireMock | Java/Cualquiera | Escenarios stateful; proxy recording |
| MSW | TypeScript | Mismos mocks en browser, Node y tests |
| MockServer | Cualquiera | API de expectativas JSON; verificación |
| responses | Python | Basado en decoradores; assertions simples |
| Nock | Node.js | API encadenada; modo recorder |

## Lo que funciona

- **Mock en el boundary**: Mockea HTTP, no métodos internos — los tests deberían ejercitar el stack completo.
- **Verifica requests, no solo responses**: Asegúrate de que tu código envía el payload y headers correctos
- **Usa record/replay para APIs complejas**: Captura tráfico real una vez, luego replay en tests
- **Mantén mocks cerca de la realidad**: Actualiza mocks cuando la API real cambia; mocks obsoletos ocultan bugs
- **Reset entre tests**: Limpia estado para prevenir que el setup de un test afecte otro

## Errores Comunes

1. **Mockear métodos internos**: Testeas el mock, no el código
2. **Matchers demasiado permisivos**: Matchers `any()` dejan pasar bugs que matchers específicos detectan
3. **Sin cobertura de escenarios de error**: Solo testear 200 OK omite la mitad del código de [manejo de errores](/recipes/api/handle-errors)
4. **Estado mutable compartido**: Estado de mock global filtra entre tests
5. **Olvidar verificar**: Un test que pasa con un mock no usado significa que nada fue realmente testeado

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
## Reporting y Comunicacion

- **Performance reporting**: genera weekly performance reports para test suites. Incluye execution time, pass rate, coverage y flaky test count. Compara con previous week. Highlighta trends y anomalies. Comparte con engineering team. Documenta reporting methodology. Automatiza report generation. Revisa report content mensualmente. Usa reports para optimization decisions
- **Cost reporting**: genera monthly cost reports para testing infrastructure. Break down por environment, tool y team. Compara con budget. Identifica cost optimization opportunities. Comparte con stakeholders. Documenta cost reporting strategy. Automatiza cost report generation. Revisa cost trends trimestralmente. Usa reports para budget planning
- **Incident reporting**: documenta all test-related incidents. Incluye root cause, impact y resolution. Comparte incident reports con team. Conduce post-mortem reviews. Documenta action items. Trackea action item completion. Revisa incident patterns. Usa incidents para improvement. Comunica incidents a stakeholders. Manten incident history

## Optimizacion Avanzada

- **Test suite optimization**: optimiza test suite para speed y reliability. Remueve duplicate tests. Mergea similar tests. Skipea tests para unchanged code. Usa test prioritization. Documenta optimization strategy. Testea suite performance. Monitorea execution time. Alerta en slow suites. Revisa suite regularmente. Manten suite lean
- **Test environment optimization**: optimiza test environments para speed. Usa containerized environments. Usa in-memory databases. Usa mock services. Cachea environment setup. Documenta optimization strategy. Testea environment performance. Monitorea environment health. Alerta en environment issues. Revisa environments regularmente
- **Test data optimization**: optimiza test data para speed y reliability. Usa minimal data sets. Usa factories para on-demand data. Usa seeders para consistent state. Cachea test data. Documenta optimization strategy. Testea data performance. Monitorea data quality. Alerta en data issues. Revisa test data regularmente. Manten data minimal
## Preguntas Frecuentes

**P: ¿Debería mockear la base de datos de mi propio servicio?**
R: No. Usa una base de datos en memoria o TestContainers. Mockea APIs externas, no tus propias dependencias.

**P: ¿Cuál es la diferencia entre mocking y stubbing?**
R: Los stubs retornan respuestas predefinidas. Los mocks también verifican interacciones (¿se llamó este método con estos args?).

**P: ¿Los mocks pueden reemplazar el contract testing?**
R: No. Los mocks testean tus suposiciones sobre la API. El contract testing verifica que ambos lados concuerden en el schema.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.