---
contentType: recipes
slug: unit-testing-mocking
title: "Escribir Unit Tests con Mocks y Stubs"
description: "Cómo aislar código bajo test usando objetos mock, stubs y spies para reemplazar dependencias externas como bases de datos, APIs y sistemas de archivos."
metaDescription: "Aprende unit testing con mocks y stubs. Aísla código bajo test reemplazando dependencias externas como bases de datos, APIs y sistemas de archivos para tests confiables."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - jest
  - unit-tests
  - integration
  - tdd
relatedResources:
  - /recipes/unit-testing
  - /recipes/integration-testing
  - /recipes/load-testing
  - /recipes/integration-testing-strategies
  - /recipes/jest-snapshot-testing
  - /recipes/python-mock-external-apis-responses
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende unit testing con mocks y stubs. Aísla código bajo test reemplazando dependencias externas como bases de datos, APIs y sistemas de archivos para tests confiables."
  keywords:
    - unit testing
    - mocking
    - test doubles
    - jest mock
    - pytest mock
    - junit mockito
    - stub objects



---
## Visión general

Los unit tests verifican que una sola función o clase se comporta correctamente en aislamiento. Pero la mayoría del código depende de sistemas externos — bases de datos, APIs HTTP, sistemas de archivos — que son lentos, poco confiables o no disponibles durante los tests. El mocking reemplaza estas dependencias con sustitutos controlados que devuelven respuestas predeterminadas, lanzan excepciones bajo demanda, o registran cómo fueron llamados.

Un test bien aislado corre en milisegundos, produce el mismo resultado cada vez, y falla solo cuando el código bajo test — no sus dependencias — está roto. A continuacion se cubre los tres test doubles esenciales: stubs (datos falsos), mocks (verificación de comportamiento), y spies (registro de llamadas).

## Cuándo usarlo

Usa esta receta cuando:

- Escribiendo unit tests para código que llama bases de datos, APIs o servicios de terceros. Consulta [Integration Testing](/recipes/testing/integration-testing) para testear con dependencias reales.
- Testeando manejo de errores para escenarios difíciles de disparar en sistemas reales. Consulta [API Contract Testing](/recipes/testing/api-mocking) para verificar respuestas de error de API.
- Acelerando un suite de tests lento dominado por tests de estilo integración
- Verificando que una función llama a un colaborador con los argumentos correctos
- Reemplazando dependencias no determinísticas (generadores random, hora actual, UUIDs). Consulta [Call REST API](/recipes/api/call-rest-api) para testear lógica de clientes HTTP.

## Solución

### Jest Mock (JavaScript)

```javascript
import { processPayment } from './payment';
import { sendEmail } from './email';

jest.mock('./email');

test('sends receipt email after successful payment', async () => {
  sendEmail.mockResolvedValue({ messageId: '123' });
  await processPayment({ amount: 100, userId: 'u1' });
  expect(sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'user@example.com',
      subject: 'Payment received',
    })
  );
});

test('handles email service failure gracefully', async () => {
  sendEmail.mockRejectedValue(new Error('SMTP down'));
  const result = await processPayment({ amount: 100, userId: 'u1' });
  expect(result.emailSent).toBe(false);
  expect(result.paymentId).toBeDefined();
});
```

### Pytest Mock (Python)

```python
from unittest.mock import patch, MagicMock
from payment import process_payment

def test_payment_success():
    with patch('payment.send_email') as mock_email:
        mock_email.return_value = {'message_id': '123'}
        result = process_payment(amount=100, user_id='u1')
        assert result['email_sent'] is True
        mock_email.assert_called_once()

def test_payment_email_failure():
    with patch('payment.send_email', side_effect=SMTPError('timeout')):
        result = process_payment(amount=100, user_id='u1')
        assert result['email_sent'] is False
```

### Mockito Stub (Java)

```java
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
    @Test
    void sendsReceiptOnSuccess() {
        EmailService emailMock = mock(EmailService.class);
        when(emailMock.send(any())).thenReturn(new Receipt("123"));
        PaymentService service = new PaymentService(emailMock);
        service.processPayment(100, "u1");
        verify(emailMock, times(1)).send(argThat(receipt ->
            receipt.getSubject().equals("Payment received")
        ));
    }
}
```

## Explicación

- **Stubs**: Proveen respuestas prefabricadas a llamadas.   Un stub de base de datos podría devolver un registro de usuario hardcodeado.   Los stubs reemplazan queries pero no verifican que las llamadas ocurrieron.
- **Mocks**: Objetos pre-programados con expectativas.   Un mock falla el test si no es llamado el número esperado de veces o con argumentos esperados.
- **Spies**: Objetos reales que registran cada llamada para verificación posterior.   Espía una caché real para confirmar que fue consultada antes de golpear la base de datos.

## Variantes

| Double | Reemplaza | Verifica llamadas | Mejor para |
|--------|-----------|-------------------|------------|
| Dummy | Parámetro no usado | No | Llenar listas de argumentos |
| Fake | Implementación funcional | No | Base de datos en memoria |
| Stub | Respuesta específica | No | Devolver datos de test |
| Spy | Objeto real + registra | Sí | Verificar side effects |
| Mock | Interacción esperada | Sí | Verificar llamadas hechas |

## Lo que funciona

- **Mock en el boundary, no internamente**: mock el cliente HTTP o driver de base de datos, no cada método privado dentro de tu clase.   Mock excesivo hace los tests frágiles.
- **Prefiere stubs para verificación de estado**: si puedes assertar en el estado final ("el balance es $50") en lugar de la interacción ("withdraw fue llamado una vez"), hazlo.   Los tests basados en estado son más resilientes al refactoring.
- **Resetea mocks entre tests**: el estado residual de mock de un test previo puede causar fallas confusas.   Jest y Pytest manejan esto automáticamente; en otros frameworks, crea instancias frescas por test.
- **Usa inyección de dependencias**: código que instancia sus propias dependencias con `new Database()` es difícil de mockear.   Inyecta dependencias vía constructores o factories.
- **No mockees objetos de valor**: clases simples de datos, structs y DTOs no tienen comportamiento para reemplazar.   Pasa instancias reales.

## Errores comunes

- **Mockear el sistema bajo test**: mockear métodos dentro de la clase que estás testeando significa que no estás testeando la clase en absoluto.   Mockea colaboradores, no el sujeto.
- **Especificar interacciones en exceso**: verificar que `database.  connect()` fue llamado exactamente una vez ata tu test a detalles de implementación.
- **Ignorar verificación de mock**: configurar `mock.  verify()` pero nunca llamarlo en el cuerpo del test crea falsa confianza.
- **Usar mocks para todo**: si cada clase está mockeada, tu suite de tests testea los mocks, no el sistema real.

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
## Patrones de Arquitectura de Tests

- **Piramide de tests**: sigue el test pyramid pattern.   Many unit tests en la base.   Fewer integration tests en el medio.   Very few E2E tests en el top.   Unit tests son fast y isolated.   Integration tests cubren boundaries.   E2E tests cubren critical user flows.
- **Test diamond**: Few unit tests.   Many contract tests.   Few E2E tests.   Contract tests verifican service boundaries.
- **Testing honeycomb**: Few unit tests.   Many integration tests.   Few E2E tests.   Integration tests cubren service interactions.

## Estrategias de Test Data

- **Test data factories**: Centraliza data creation logic.   Usa default values con overrides.   Refactoriza duplicated factories.
- **Test data seeders**: Crea consistent test state.
- **Test data fixtures**: Carga fixtures en test setup.   Updatea fixtures cuando schema cambia.
## Mantenimiento de Tests

- **Calidad de test code**: mantiene high code quality en tests.   Sigue same coding standards que production code.   Refactoriza test code regularmente.
- **Gestion de test debt**: Aloca time para test debt.
- **Documentacion de tests**: Documenta test architecture decisions.   Documenta test environment setup.

## Colaboracion del Team

- **Test reviews**: Verifica test quality.
- **Knowledge sharing**: Conduce testing lunch-and-learns.   Crea testing guidelines.
- **Testing culture**: construye una strong testing culture.   Celebra testing achievements.   Reconoce good test practices.   Encourages test-first development.   Haz testing visible.




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de testing y jest para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica escribir unit tests con mocks y stubs** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas frecuentes

**P: ¿Cuándo debería usar una dependencia real en lugar de un mock?**
R: Cuando la dependencia es rápida, determinística y simple — por ejemplo, un Map en memoria o una función pura. Mientras más cercano esté tu test a producción, más confianza provee.

**P: ¿Cuál es la diferencia entre un stub y un mock?**
R: Un stub responde llamadas con datos preset. Un mock verifica que se hicieron llamadas esperadas. Puedes usar un mock como stub, pero no viceversa.

**P: ¿Debería mockear el sistema de archivos?**
R: Para tests unitarios, sí — usa sistemas de archivos virtuales o streams en memoria. Para tests de integración, escribe a un directorio temporal y limpia después.

**P: ¿Puedo mockear métodos estáticos?**
R: En Java, PowerMock y Mockito inline mock pueden hacerlo, pero es desalentado. Los métodos estáticos son difíciles de testear porque no pueden inyectarse. Refactoriza a métodos de instancia cuando sea posible.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cuáles son las limitaciones de mocking en unit tests?

Mocking tiene algunas limitations. Excessive mocking hace tests brittle. Mocks pueden divergir de real implementations. Mocks necesitan mantenimiento cuando interfaces cambian. Mocks pueden dar false confidence. Documenta limitations para tu team. Planean mitigation strategies. Testea con real implementations en integration. Monitorea mock maintenance overhead.

### ¿Cuándo debo usar mocking vs real implementations?

Usa mocking para unit tests de components aislados. Usa real implementations para integration tests. Usa mocking cuando external dependencies son lentas o inestables. Usa real implementations cuando necesitas validar behavior end-to-end. Documenta decision criteria para tu team.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
