---
contentType: recipes
slug: api-contract-testing
title: "Testear Contratos de API con Consumer-Driven Contracts"
description: "Cómo prevenir cambios breaking entre microservicios usando contract testing consumer-driven con Pact y validadores de OpenAPI."
metaDescription: "Aprende API contract testing con Pact. Previene cambios breaking entre microservicios usando consumer-driven contracts y validadores de OpenAPI."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - api-testing
  - consumer-driven-contracts
relatedResources:
  - /recipes/integration-testing
  - /recipes/api-versioning
  - /recipes/call-rest-api
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende API contract testing con Pact. Previene cambios breaking entre microservicios usando consumer-driven contracts y validadores de OpenAPI."
  keywords:
    - contract testing
    - pact
    - consumer driven contracts
    - api contracts
    - microservices testing
    - openapi validation
---

## Visión general

En una arquitectura de microservicios, decenas de servicios se comunican a través de APIs. Cuando un servicio cambia un campo de respuesta o elimina un status code, los consumidores downstream se rompen silenciosamente — a menudo descubiertos solo en producción. Los tests de integración capturan algunos de estos problemas, pero son lentos y requieren que todos los servicios estén corriendo.

El contract testing resuelve esto haciendo que cada consumidor defina sus expectativas de la API del provider (el contrato). Estos contratos se comparten, verifican independientemente, y fallan rápido cuando un provider rompe las asunciones de un consumidor. Pact es el framework más ampliamente adoptado para contract testing consumer-driven.

## Cuándo usarlo

Usa esta receta cuando:

- Gestionas 5+ microservicios con comunicación HTTP o por colas de mensajes. Consulta [Integration Testing](/recipes/testing/integration-testing) para verificar interacciones de componentes.
- Experimentas outages en producción causados por cambios de API en servicios upstream. Consulta [Call REST API](/recipes/api/call-rest-api) para mejores prácticas de clientes API.
- Quieres desacoplar pipelines de deployment para que servicios se deployen independientemente. Consulta [Microservices Patterns](/guides/architecture/microservices-architecture-guide) para guía de arquitectura distribuida.
- Migras de monolito a microservicios y necesitas redes de seguridad para los límites de API
- Trabajas con proveedores de API externos donde no puedes controlar su ciclo de release

## Solución

### Test de Consumidor (Pact JS)

```javascript
const { PactV3 } = require('@pact-foundation/pact');
const { like, regex } = require('@pact-foundation/pact').MatchersV3;

const provider = new PactV3({
  consumer: 'order-service',
  provider: 'user-service',
});

describe('User Service Contract', () => {
  test('returns user by ID', async () => {
    await provider
      .given('user with id 123 exists')
      .uponReceiving('a request for user 123')
      .withRequest({
        method: 'GET',
        path: '/users/123',
      })
      .willRespondWith({
        status: 200,
        body: {
          id: like(123),
          name: like('Alice'),
          email: regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'alice@example.com'),
        },
      });

    await provider.executeTest(async (mockserver) => {
      const user = await fetchUser(mockserver.url, 123);
      expect(user.name).toBe('Alice');
    });
  });
});
```

### Verificación de Provider (Pact JS)

```javascript
const { Verifier } = require('@pact-foundation/pact');

describe('Pact Verification', () => {
  test('validates against consumer contracts', async () => {
    await new Verifier({
      provider: 'user-service',
      providerBaseUrl: 'http://localhost:3000',
      pactBrokerUrl: 'https://pact-broker.example.com',
      publishVerificationResult: true,
      providerBranch: process.env.GIT_BRANCH,
    }).verifyProvider();
  });
});
```

### Validador OpenAPI (Python)

```python
from openapi_spec_validator import validate_spec
import requests

spec = requests.get('https://api.example.com/openapi.json').json()
validate_spec(spec)

from openapi_core import validate_response
validate_response(spec, response)
```

## Explicación

- **Consumer-driven contracts**: El consumidor (cliente) escribe un test que describe exactamente lo que necesita del provider. Pact registra esta interacción y genera un archivo de contrato (JSON).
- **Pact Broker**: Un repositorio central donde los contratos se almacenan y comparten. Rastrea qué versiones de cada servicio son compatibles, habilitando deployments independientes.
- **Provider verification**: El servicio provider ejecuta los contratos contra su API real. Si un campo se elimina o un tipo cambia, la verificación falla antes del deployment.
- **Can-I-Deploy**: Una característica del Pact Broker que chequea si una versión de servicio puede deployarse de forma segura dado el estado actual de todos los contratos de consumidores.

## Variantes

| Herramienta | Lenguaje | Estilo de contrato | Mejor para |
|-------------|----------|--------------------|------------|
| Pact | Multi (JS, JVM, Go, Python) | Consumer-driven | Microservicios internos |
| OpenAPI validators | Multi | Provider-driven | APIs públicas, documentation-first |
| Spring Cloud Contract | JVM | Provider-driven | Ecosistemas Spring |
| BiqQuery data contracts | SQL | Schema-driven | Data warehouses |

## Mejores prácticas

- **Mantén contratos enfocados en campos que usas**: si el consumidor solo necesita `id` y `name`, no asserts el schema de respuesta completo. Esto da al provider libertad para evolucionar campos no usados.
- **Versiona contratos junto al código**: almacena tests de contrato en el mismo repositorio que el servicio consumidor. CI genera y publica contratos en cada build.
- **Usa un Pact Broker para visibilidad**: sin un broker, equipos comparten archivos de contrato manualmente, lo cual se descompone rápidamente a escala.
- **Ejecuta provider verification en CI**: cada pull request en el provider debería verificar contra todos los contratos de consumidores antes de mergear.
- **No testees lógica de negocio en contratos**: los contratos verifican la forma de la API, no la correctitud de cálculos o reglas de negocio.

## Errores comunes

- **Contratos excesivamente estrictos**: assertar cada campo y valores exactos hace los contratos frágiles. Usa matchers (`like`, `regex`) para flexibilidad.
- **Saltar provider verification**: generar contratos sin verificarlos en el lado del provider crea falsa confianza. Ambos lados importan.
- **Almacenar contratos en shared drives o email**: usa un Pact Broker. Rastrea matrices de compatibilidad y habilita checks de can-i-deploy.
- **Testear a través de la UI**: los tests de contrato deberían ejercitar el cliente de API directamente, no Selenium ni Playwright. Los tests de UI van en suites E2E.

## Preguntas frecuentes

**P: ¿El contract testing reemplaza a los tests de integración?**
R: No. Los contract tests verifican compatibilidad de API pero no comportamiento end-to-end, estado de base de datos, o garantías de entrega de colas de mensajes. Usa ambos.

**P: ¿Qué pasa si un provider necesita romper un contrato?**
R: El provider comunica el cambio, los consumidores actualizan sus expectativas, y ambos deployan en secuencia coordinada. Pact Broker rastrea esto.

**P: ¿Puedo usar OpenAPI specs en lugar de Pact?**
R: Sí. OpenAPI es provider-driven (el dueño de la API define el spec). Pact es consumer-driven (los clientes definen lo que necesitan). Muchos equipos usan ambos.

**P: ¿Los contract tests requieren un provider corriendo?**
R: Los tests de consumidor usan mock servers de Pact y no necesitan el provider corriendo. La verificación de provider sí requiere una instancia del provider corriendo.

