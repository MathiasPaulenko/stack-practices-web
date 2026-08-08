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
  - mocking
  - testing
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
  - /guides/complete-guide-pytest-production
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
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



## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de mocking y testing para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica api mocking para testing** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

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

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
