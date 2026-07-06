---
contentType: recipes
slug: integration-testing-strategies
title: "Diseñar Tests de Integración Efectivos para Sistemas Confiables"
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
