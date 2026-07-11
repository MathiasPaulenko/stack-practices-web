---
contentType: docs
slug: test-case-template
title: "Plantilla de Caso de Prueba"
description: "Un formato estandarizado de caso de prueba con pasos, resultados esperados, precondiciones y postcondiciones para testing manual y automatizado."
metaDescription: "Usá esta plantilla de caso de prueba para escribir tests estandarizados con pasos, resultados esperados, precondiciones, postcondiciones y trazabilidad."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - test-case
  - template
  - manual-testing
  - test-design
  - traceability
relatedResources:
  - /docs/testing/test-strategy-document-template
  - /docs/testing/test-coverage-report-template
  - /docs/testing/bug-reproduction-steps-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de caso de prueba para escribir tests estandarizados con pasos, resultados esperados, precondiciones, postcondiciones y trazabilidad."
  keywords:
    - test case
    - test template
    - manual testing
    - test design
    - preconditions
    - expected results
    - traceability
---

## Overview

Un test case es un set de conditions bajo las cuales un tester determina si una aplicación meets requirements. Test cases estandarizados aseguran consistent coverage, reproducible results y traceability desde requirements hasta verification. Esta plantilla provee un structure para escribir test cases que son clear, complete y actionable.

## When to Use

- Escribiendo manual test cases para QA cycles
- Creando test documentation para compliance audits
- Onboardéando new QA team members a testing standards
- Convirtiendo manual tests en automated test scripts
- Trackeando test coverage contra requirements

## Solution

```markdown
# Test Case: TC-<ID>

## Metadata

| Field | Value |
|-------|-------|
| Test Case ID | TC-001 |
| Title | Verificar que el usuario puede loguear con credenciales válidas |
| Module | Authentication |
| Feature | Login |
| Priority | Critical |
| Type | Functional |
| Execution Type | Manual / Automated |
| Estimated Time | 5 minutes |
| Created By | <Author> |
| Created Date | 2026-07-05 |
| Last Updated | 2026-07-05 |
| Requirement ID | REQ-AUTH-001 |
| Test Status | Not Run / Pass / Fail / Blocked |

## Preconditions

1. User account existe en el system con email `testuser@example.com`
2. User account está active (no suspended o deleted)
3. User sabe el correct password: `Test@1234`
4. Application está accessible en `https://app.example.com`
5. Browser es Chrome 120+ o Firefox 120+
6. No active session para el test user (logged out)

## Test Steps

| Step # | Action | Expected Result | Actual Result | Status |
|--------|--------|-----------------|---------------|--------|
| 1 | Navegá a `https://app.example.com/login` | Login page loads con email y password fields, y un "Log In" button | | |
| 2 | Ingresá `testuser@example.com` en el email field | Email field displayea el entered value | | |
| 3 | Ingresá `Test@1234` en el password field | Password field displayea masked characters (••••••••) | | |
| 4 | Clickeá el "Log In" button | System procesa el login request | | |
| 5 | Esperá el redirect | User es redirecteado al dashboard en `/dashboard` | | |
| 6 | Verificá el user avatar | User avatar con initials "TU" es visible en el top-right corner | | |
| 7 | Verificá el welcome message | Dashboard displayea "Welcome, Test User" | | |
| 8 | Verificá el session cookie | Un session cookie named `session_id` está seteado con `HttpOnly` y `Secure` flags | | |

## Postconditions

1. User está authenticated y tiene un active session
2. Session token es válido por 24 hours
3. User activity log registra el login event con timestamp y IP
4. User está en el dashboard page

## Test Data

| Field | Value | Notes |
|-------|-------|-------|
| Email | `testuser@example.com` | Pre-created test account |
| Password | `Test@1234` | Changed quarterly |
| Invalid email | `invalid@example.com` | Para negative test case |
| Invalid password | `wrongpass` | Para negative test case |

## Negative Test Cases

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| TC-001-N1 | Login con invalid password | Same que TC-001 pero ingresá `wrongpass` en step 3 | Error message "Invalid email or password" se displayea. User queda en login page. |
| TC-001-N2 | Login con non-existent email | Same que TC-001 pero ingresá `nobody@example.com` en step 2 | Error message "Invalid email or password" se displayea. No account enumeration. |
| TC-001-N3 | Login con empty email field | Skip step 2, clickeá "Log In" | Email field muestra validation error "Email is required" |
| TC-001-N4 | Login con empty password field | Skip step 3, clickeá "Log In" | Password field muestra validation error "Password is required" |
| TC-001-N5 | Login con SQL injection en email | Ingresá `' OR 1=1; --` en email field | Error message "Invalid email format" se displayea. No SQL execution. |
| TC-001-N6 | Login después de 5 failed attempts | Repetí TC-001-N1 cinco times | Account se lockea por 15 minutes. Error message "Account locked due to too many attempts." |

## Edge Cases

| Test Case ID | Description | Expected Result |
|--------------|-------------|-----------------|
| TC-001-E1 | Email con leading/trailing spaces | `  testuser@example.com  ` debería ser trimmed y accepted |
| TC-001-E2 | Email con uppercase | `TestUser@Example.com` debería ser case-insensitive y accepted |
| TC-001-E3 | Password con special characters | Password `Tëst@1234!#$%` debería ser accepted si meets policy |
| TC-001-E4 | Session timeout durante login | Si login toma > 30s, mostrá "Request timeout. Please try again." |
| TC-001-E5 | Concurrent login desde two browsers | Second login debería success. First session debería ser invalidated. |

## Traceability

| Requirement ID | Requirement Description | Test Case IDs |
|----------------|--------------------------|---------------|
| REQ-AUTH-001 | User puede loguear con valid credentials | TC-001 |
| REQ-AUTH-002 | Invalid credentials muestran error sin enumeration | TC-001-N1, TC-001-N2 |
| REQ-AUTH-003 | Account se lockea después de 5 failed attempts | TC-001-N6 |
| REQ-AUTH-004 | Session se invalida en concurrent login | TC-001-E5 |

## Automation Notes

Si automatizás este test case con Playwright:

```typescript
test('TC-001: User can log in with valid credentials', async ({ page }) => {
  // Preconditions: asegurate que test user exista
  await ensureTestUserExists();

  // Step 1: Navegá a login page
  await page.goto('https://app.example.com/login');
  await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

  // Steps 2-3: Ingresá credentials
  await page.fill('[data-testid="email-input"]', 'testuser@example.com');
  await page.fill('[data-testid="password-input"]', 'Test@1234');

  // Step 4: Clickeá login
  await page.click('[data-testid="login-button"]');

  // Step 5: Verificá redirect a dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // Step 6: Verificá user avatar
  await expect(page.locator('[data-testid="user-avatar"]')).toHaveText('TU');

  // Step 7: Verificá welcome message
  await expect(page.locator('[data-testid="welcome-message"]')).toHaveText('Welcome, Test User');

  // Step 8: Verificá session cookie
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'session_id');
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie.httpOnly).toBe(true);
  expect(sessionCookie.secure).toBe(true);

  // Postcondition: clean up
  await page.click('[data-testid="logout-button"]');
});
```
```

## Explanation

El test case template tiene six key sections: metadata (identification y traceability), preconditions (qué debe ser true antes de testing), steps (las actions y expected results), postconditions (qué debería ser true después), test data (inputs needed) y negative/edge cases (qué más verificar).

Preconditions son critical: sin ellos, un test case puede pasar en una machine y fail en otra porque el starting state difiere. Postconditions verifican que el system está en el expected state después del test, no solo que el immediate action funcionó.

Negative test cases son dónde most bugs hide. Testear solo el happy path da false confidence. SQL injection, empty inputs, boundary values y concurrent access son dónde production incidents originan.

La traceability matrix linkea requirements a test cases. Esto es mandatory para compliance (SOC 2, ISO 27001, FDA) y useful para coverage analysis: si un requirement no tiene test cases, está untested.


### Escenario Detallado: Caso de Prueba para API de Creacion de Pedidos

```text
API: POST /v1/orders
Modulo: Orders
Prioridad: Critical
Tipo: Functional + Integration

Precondiciones:
  1. Servicio de orders corriendo en staging
  2. Usuario autenticado con token JWT valido
  3. Al menos 3 productos con stock disponible en BD
  4. Direccion de envio valida creada previamente

Pasos:
  | # | Accion | Resultado Esperado |
  |---|--------|-------------------|
  | 1 | POST /v1/orders con body valido | 201 Created con body {id, status, total} |
  | 2 | Verificar header Location | Contiene /v1/orders/{id} |
  | 3 | GET /v1/orders/{id} | 200 OK con mismo body |
  | 4 | Verificar stock descontado | GET /v1/products/{sku} muestra stock -1 |
  | 5 | Verificar evento publicado | Cola de mensajes tiene evento order.created |
  | 6 | Repetir POST con mismo Idempotency-Key | 200 OK con mismo order (no duplicado) |

Casos Negativos:
  | ID | Descripcion | Resultado |
  |----|-------------|-----------|
  | N1 | customer_id inexistente | 400 con error VALIDATION_ERROR |
  | N2 | items array vacio | 422 con error EMPTY_ITEMS |
  | N3 | quantity <= 0 | 422 con error INVALID_QUANTITY |
  | N4 | SKU sin stock | 409 con error OUT_OF_STOCK |
  | N5 | Sin Authorization header | 401 Unauthorized |
  | N6 | Idempotency-Key repetido con body diferente | 409 Conflict |

Casos Limite:
  | ID | Descripcion | Resultado |
  |----|-------------|-----------|
  | E1 | Pedido con 100 items | 201 Created, latencia < 2s |
  | E2 | Pedido con caracteres unicode en direccion | 201 Created, datos preservados |
  | E3 | quantity = 999999 | 201 Created o 422 si excede max permitido |
  | E4 | Concurrencia: 2 pedidos del mismo SKU simultaneos | Solo uno pasa, otro 409 OUT_OF_STOCK |

Trazabilidad:
  | Requisito | Casos |
  |-----------|-------|
  | REQ-ORD-001 | TC-ORD-001 (happy path) |
  | REQ-ORD-002 | TC-ORD-N1..N6 (validacion) |
  | REQ-ORD-003 | TC-ORD-E4 (concurrencia) |
  | REQ-ORD-004 | TC-ORD-001 paso 6 (idempotencia) |
```

### Como documento test cases para flujos asincronos?

Para flujos asincronos (colas de mensajes, webhooks, eventos), documenta el evento esperado como resultado. En lugar de verificar una respuesta HTTP inmediata, verifica: (1) el mensaje publicado en la cola, (2) el estado final despues del procesamiento, (3) el timeout maximo aceptable. Usa polling con retry en automatizacion: verificar cada 500ms hasta 10s maximo.

### Deberia usar BDD (Gherkin) para escribir test cases?

BDD (Given-When-Then) es util cuando trabajas con product managers o stakeholders que necesitan leer los test cases. Para equipos tecnicos, el formato tabular es mas directo. Si usas Cucumber o Behave, el formato Gherkin es obligatorio. Para Playwright o Vitest, el formato tabular mapea directamente a codigo.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| API testing | Reemplazá UI steps con HTTP requests | Usá status codes y response body assertions |
| Mobile testing | Addeá device/OS a preconditions | Testeá en multiple screen sizes |
| Performance testing | Addeá load parameters y latency thresholds | Usá k6 o JMeter scripts |
| Compliance testing | Addeá regulatory requirement mapping | FDA 21 CFR Part 11, GDPR |
| Exploratory testing | Usá charter-based format en vez de steps | Time-boxed exploration con debrief |

## What Works

1. Escribí preconditions explícitamente — implicit assumptions causan false failures
2. Incluí negative y edge cases en every test case — no como separate documents
3. Usá data-testid attributes en automation — más stable que CSS selectors
4. Linkeá every test case a un requirement — no orphan tests
5. Mantené test data en un shared location — no hardcoded en cada test case
6. Revieweá test cases como code — peer review catchea missing steps
7. Versioneá test cases junto con requirements — trackeá changes over time

## Common Mistakes

1. Vague expected results ("page loads correctly" — ¿qué significa correct?)
2. Missing preconditions ("assumes user is logged in" — statealo explícitamente)
3. Testear solo el happy path — negative cases encuentran los real bugs
4. Hardcodear test data en steps — usá un test data table para maintainability
5. No traceability a requirements — no podés probar coverage para audits
6. Overly detailed steps para automated tests — el script es el documentation
7. No updatear test cases cuando requirements cambian — stale tests wastean time

## Frequently Asked Questions

### ¿Qué tan detailed deberían ser los test steps?

Detailed enough que alguien unfamiliar con el feature pueda ejecutar el test y verificar el result. Cada step debería tener one action y one expected result. Si un step tiene multiple actions, splitealo. Para automated tests, el code es el documentation — steps son para manual execution.

### ¿Debería escribir test cases antes o después del development?

Antes. Test cases se derivan de requirements, no del implementation. Escribir test cases first (o junto con acceptance criteria) catchea requirement ambiguities antes de que code se escriba. Esto es la essence de behavior-driven development (BDD).

### ¿Cómo handleo test cases que cambian frecuentemente?

Usá parameterized test cases. Mantené los steps stable y parameterizeá el data. Por ejemplo, un login test case con un data table de 10 different credential combinations es más maintainable que 10 separate test cases.

### ¿Cuál es la difference entre un test case y un test scenario?

Un test scenario es un high-level description de qué testear ("verify login works"). Un test case es un detailed set de steps con specific inputs y expected results. Un scenario típicamente tiene multiple test cases: happy path, negative cases, edge cases.

### ¿Cuántos test cases por feature?

Depende de complexity. Un simple feature podría necesitar 5-10 test cases (happy path, 3-5 negative, 2-3 edge). Un complex feature como payment processing podría necesitar 50+. Usá risk-based testing: más test cases para higher-risk features. No escribas test cases para trivial UI changes.
