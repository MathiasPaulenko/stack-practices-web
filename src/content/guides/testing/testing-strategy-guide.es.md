---





contentType: guides
slug: testing-strategy-guide
title: "Guía de Estrategia de Testing"
description: "Una guía práctica para construir una estrategia de testing en capas con unit, integration y end-to-end tests."
metaDescription: "Aprende a construir una estrategia de testing con unit tests, integration tests y E2E tests. Cubre pirámide de testing, mocking, integración CI y metas de coverage."
difficulty: intermediate
topics:
  - testing
  - architecture
tags:
  - architecture
  - ci-cd
  - coverage
  - e2e
  - integration-tests
  - mocking
  - test-pyramid
  - testing
  - unit-tests
relatedResources:
  - /recipes/unit-testing
  - /recipes/input-validation
  - /recipes/github-actions
  - /recipes/load-testing-k6
  - /recipes/api-mocking
  - /recipes/jest-snapshot-testing
  - /recipes/measure-test-coverage
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a construir una estrategia de testing con unit tests, integration tests y E2E tests. Cubre pirámide de testing, mocking, integración CI y metas de coverage."
  keywords:
    - estrategia de testing
    - pirámide de testing
    - unit testing
    - integration testing
    - e2e testing
    - test coverage
    - mocking
    - automatización de tests





---

## Introducción

El testing no es solo encontrar bugs. Una estrategia bien diseñada provee confianza para refactoring, documenta comportamiento esperado, atrapa regresiones antes de producción y funciona como especificaciones ejecutables.

## La Pirámide de Testing

```text
      /\
     /  \    E2E Tests (pocos, lentos, costosos)
    /____\
   /      \  Integration Tests (algunos, velocidad media)
  /        \
 /__________\ Unit Tests (muchos, rápidos, baratos)
```

| Capa | Alcance | Velocidad | Costo | Cantidad |
| ---- | ------- | --------- | ----- | -------- |
| **Unit** | Función/clase individual | Milisegundos | Bajo | Muchos (70-80%) |
| **Integration** | Múltiples componentes | Segundos | Medio | Algunos (15-25%) |
| **E2E** | Flujos de usuario completos | Minutos | Alto | Pocos (5-10%) |

## Unit Testing

Tests que verifican funciones o clases individuales en aislamiento.

### Qué testear

- Lógica de negocio y algoritmos
- Casos edge (null, vacío, overflow)
- Paths de manejo de errores
- Condiciones de borde

### Qué NO testear

- Código de framework (ORM, capa HTTP)
- Librerías de terceros
- Getters/setters simples sin lógica

### Ejemplo (Python con pytest)

```python
def calculate_discount(price: float, customer_type: str) -> float:
    if customer_type == "vip":
        return price * 0.8
    return price * 0.95

import pytest

@pytest.mark.parametrize("price,customer_type,expected", [
    (100.0, "vip", 80.0),
    (100.0, "regular", 95.0),
    (0.0, "vip", 0.0),
])
def test_calculate_discount(price, customer_type, expected):
    assert calculate_discount(price, customer_type) == expected
```

## Integration Testing

Verifica que múltiples componentes funcionen juntos correctamente.

### Qué testear (Integration)

- Queries de base de datos y migraciones
- Comportamiento de endpoints de API (con DB real o de test)
- Publicación/consumo de message queues
- Interacciones con servicios externos (con test doubles)

### Ejemplo (Node.js con supertest)

```javascript
const request = require('supertest');
const app = require('../app');

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('alice@example.com');
  });
});
```

## End-to-End Testing

Simula comportamiento de usuario real a través de toda la aplicación.

### Qué testear (E2E)

- Journeys críticos de usuario (login, checkout, signup)
- Compatibilidad cross-browser
- Responsive mobile
- Cumplimiento de accesibilidad

### Herramientas por stack

| Stack | Herramienta recomendada |
| ----- | ----------------------- |
| Web | Playwright, Cypress |
| Mobile | Appium, Maestro |
| API | REST Assured, Postman |

## Metas de Coverage

- **Line coverage**: 70-80% mínimo para lógica de negocio. Consulta [unit testing](/recipes/testing/unit-testing).
- **Branch coverage**: Priorizar sobre line coverage
- **Critical paths**: 100% coverage para payment, auth y [flujos de seguridad](/guides/security/security-best-practices-guide)

## Integración CI/CD

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - run: npm run test:integration
      - run: npm run test:e2e
```

## Lo que funciona

- **Escribe tests primero** ([TDD](/guides/testing/test-driven-development-guide)) para lógica compleja o fixes de bugs
- **Usa test data builders** en lugar de hardcodear fixtures
- **Mock servicios externos** en los boundaries de [integration tests](/recipes/testing/integration-testing)
- **Ejecuta tests en paralelo** para mantener feedback loops rápidos
- **Falla [CI](/guides/devops/cicd-pipeline-guide) en regresión de coverage**, no en targets arbitrarios
- **Mantén E2E tests determinísticos**: evita assertions que dependen de timing

## Anti-patrones comunes

- Testear detalles de implementación en lugar de comportamiento
- Compartir estado mutable entre tests
- Usar sleep() en lugar de waits explícitos en E2E tests
- Hacer mock de todo en integration tests
- Ignorar tests flaky en lugar de arreglar las causas raíz

## Checklist resumen

- [ ] Unit tests para toda lógica de negocio
- [ ] Integration tests para capa de DB y API
- [ ] E2E tests para journeys críticos de usuario
- [ ] Tests ejecutados en [CI](/guides/devops/cicd-pipeline-guide) en cada pull request
- [ ] Coverage trackeado y reportado
- [ ] Tests flaky identificados y arreglados rápidamente

## Preguntas Frecuentes

### Qué es la pirámide de testing?

La pirámide de testing es un modelo que sugiere tener muchos [unit tests](/recipes/testing/unit-testing) en la base, menos [integration tests](/recipes/testing/integration-testing) en el medio y muy pocos end-to-end tests en la cima. Esto mantiene el test suite rápido, confiable y económico.

### Cuánto coverage de tests debería aspirar?

Aspira a 70-80% de coverage en lógica de negocio crítica. Mayor coverage es mejor, pero 100% no garantiza corrección. Enfócate en comportamiento y casos edge en lugar de porcentajes arbitrarios.

### Debería hacer mock de APIs externas en integration tests?

Sí, haz mock de APIs externas en los boundaries de integration tests usando librerías como WireMock o MSW. Esto mantiene los tests determinísticos y rápidos mientras verifica los patrones de interacción de tu sistema.


## Temas Avanzados

### Escenario: Estrategia de Testing para Microservicios

```text
Sistema: 8 microservicios, API REST + queue workers
Objetivo: 80% coverage, CI < 10 min, 0 flaky tests

Piramide de testing:
  | Nivel | Cantidad | Duracion | Herramienta |
  |-------|----------|----------|-------------|
  | Unit | 1200 | 2 min | Vitest + Jest |
  | Integration | 300 | 4 min | Vitest + Testcontainers |
  | Contract | 80 | 1 min | Pact |
  | E2E | 40 | 3 min | Playwright |
  | Total | 1620 | 10 min | |

Estrategia por servicio:
  | Servicio | Unit | Integration | Contract | E2E |
  |----------|------|-------------|----------|-----|
  | auth-service | 200 | 40 | 10 | 5 |
  | payment-service | 180 | 50 | 15 | 8 |
  | user-service | 150 | 35 | 8 | 5 |
  | order-service | 170 | 45 | 12 | 7 |
  | notification-service | 120 | 30 | 5 | 3 |
  | search-service | 130 | 25 | 8 | 4 |
  | analytics-service | 100 | 20 | 5 | 2 |
  | api-gateway | 150 | 55 | 17 | 6 |

Reglas de testing:
  | Regla | Razon |
  |-------|-------|
  | Unit tests < 1s cada uno | Feedback rapido |
  | Integration tests < 5s cada uno | Testcontainers |
  | E2E tests < 30s cada uno | Playwright + headed |
  | 0 flaky tests | Re-run 3x, si falla 1x, fix |
  | Coverage min 70% en logica de negocio | Gate en CI |
  | Coverage min 90% en payment-service | Critico |
  | PR bloqueado si coverage baja | --coverage --check |
  | Tests deterministicos | No depender de tiempo/orden |

CI pipeline (10 min total):
  1. Lint + type check (1 min)
  2. Unit tests (2 min)
  3. Integration tests (4 min)
  4. Contract tests (1 min)
  5. Build (1 min)
  6. E2E tests en staging (3 min, paralelo con deploy)

Lecciones:
  - La piramide: muchos unit, pocos E2E
  - Contract tests entre servicios son obligatorios
  - 0 flaky tests: un test flaky es peor que no tener test
  - CI < 10 min: si tarda mas, los devs pierden confianza
  - Coverage es un proxy, no el objetivo: test behavior
```

### Como manejo tests de servicios externos?

Usa contract testing con Pact: el consumidor define las expectativas, el proveedor las verifica. Para APIs de terceros (Stripe, GitHub), usa VCR o cassettes: graba la respuesta una vez, replay en tests. Para DB, usa Testcontainers: levanta un container real por test suite. Evita mocks manuales: son frágiles y no detectan cambios reales.

































End of document. Review and update quarterly.