---


contentType: docs
slug: bug-reproduction-steps-template
title: "Plantilla de Pasos de Reproducción de Bugs"
description: "Una plantilla para escribir pasos de reproducción mínimos y confiables que ayudan a developers a reproducir y fixear issues rápidamente."
metaDescription: "Usá esta plantilla de pasos de reproducción de bugs para escribir repro steps mínimos con environment, data, expected vs actual y severity."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - bug-report
  - template
  - reproduction
  - qa
  - debugging
relatedResources:
  - /docs/test-case-template
  - /docs/regression-test-checklist
  - /docs/test-strategy-document-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de pasos de reproducción de bugs para escribir repro steps mínimos con environment, data, expected vs actual y severity."
  keywords:
    - bug report
    - reproduction steps
    - bug template
    - qa
    - debugging
    - defect tracking
    - template


---

## Overview

Un bug report es solo useful si un developer puede reproducir el issue. Vague reports como "the login page is broken" wastean time y llevan a back-and-forth questions. Esta plantilla asegura que bug reports contengan la minimum information needed para reproducir, diagnose y fix el issue.

## When to Use


- For alternatives, see [Data Quality Rules Template](/es/docs/data-quality-rules-template/).

- Filing un bug en tu issue tracker (Jira, GitHub Issues, Linear)
- Reportando un production incident para el on-call engineer
- Submiteando un bug bounty report
- Creando un regression test desde un discovered defect
- Communicando un bug a un external vendor o library maintainer

## Solution

```markdown
# Bug Report: BUG-<ID>

## Metadata

| Field | Value |
|-------|-------|
| Bug ID | BUG-001 |
| Title | Login button es unresponsive después de ingresar invalid password 3 times |
| Reporter | <Reporter Name> |
| Date Reported | 2026-07-05 |
| Severity | Major |
| Priority | High |
| Status | Open |
| Assignee | <Developer> |
| Environment | Staging |
| Module | Authentication |
| Related Test Case | TC-001-N6 |

## Severity and Priority

| Level | Definition | Example |
|-------|-----------|---------|
| Critical | System unusable, data loss, security breach | All users locked out, payment data exposed |
| Major | Core feature broken, no workaround | Login fails para 50% de users |
| Minor | Feature broken, workaround exists | Date picker muestra wrong format |
| Trivial | Cosmetic issue, no functional impact | Button color slightly off |

**Severity**: Major (core login functionality broken, pero solo después de 3 failed attempts)
**Priority**: High (affecta a all users que mistypean password, common scenario)

## Environment

| Field | Value |
|-------|-------|
| URL | https://staging.app.example.com/login |
| Browser | Chrome 126.0.6478.126 |
| OS | macOS 14.5 |
| Device | MacBook Pro 14" |
| Screen Resolution | 1512 x 982 |
| User Role | End user (no admin) |
| Account | testuser@example.com |
| Network | Wi-Fi (stable, 50 Mbps) |
| Timestamp | 2026-07-05T14:32:18Z |
| Build Version | v2.4.1-staging (commit abc1234) |

## Preconditions

1. User account existe: `testuser@example.com`
2. User está logged out (no active session)
3. User sabe el correct password: `Test@1234`
4. No previous failed login attempts en el current session

## Reproduction Steps

| Step # | Action | Expected | Actual |
|--------|--------|----------|--------|
| 1 | Navegá a https://staging.app.example.com/login | Login page loads | Login page loads ✅ |
| 2 | Ingresá `testuser@example.com` en email field | Email accepted | Email accepted ✅ |
| 3 | Ingresá `wrongpass1` en password field | Password accepted (masked) | Password accepted ✅ |
| 4 | Clickeá "Log In" button | Error: "Invalid email or password" | Error shown ✅ |
| 5 | Ingresá `wrongpass2` en password field | Password accepted (masked) | Password accepted ✅ |
| 6 | Clickeá "Log In" button | Error: "Invalid email or password" | Error shown ✅ |
| 7 | Ingresá `wrongpass3` en password field | Password accepted (masked) | Password accepted ✅ |
| 8 | Clickeá "Log In" button | Error: "Account locked for 15 minutes" | Button se vuelve unresponsive. No error message. Console muestra `TypeError: Cannot read properties of undefined (reading 'message')` ❌ |
| 9 | Esperá 15 minutes, probá de nuevo | Account unlocks, login works | Button sigue unresponsive ❌ |

## Minimal Reproduction

Después de investigation, los minimal steps para reproducir:

1. Navegá a login page
2. Attempteá login con invalid password 3 times
3. Observá: "Log In" button deja de responder a clicks
4. Console error: `TypeError: Cannot read properties of undefined (reading 'message')` en `auth.js:142`

El issue ocurre porque el account lock response (HTTP 429) returnea un different JSON structure que el invalid credentials response (HTTP 401). El error handler espera `response.error.message` pero el 429 response tiene `response.message` (no `error` wrapper).

## Expected Behavior

Después de 3 failed login attempts, el system debería:
1. Displayear: "Account locked due to too many failed attempts. Try again in 15 minutes."
2. Disablear el login form por 15 minutes
3. Loggear el lock event al audit log
4. Enviar un email notification al user

## Actual Behavior

Después de 3 failed login attempts:
1. El "Log In" button se vuelve unresponsive (no click handler firea)
2. No error message se displayea
3. El form queda enabled pero non-functional
4. Console muestra un JavaScript TypeError
5. El account IS lockedeo server-side, pero el UI no lo reflecta

## Evidence

### Console Output

```
TypeError: Cannot read properties of undefined (reading 'message')
    at handleAuthError (auth.js:142)
    at HTMLButtonElement.<anonymous> (auth.js:87)
    at HTMLButtonElement.dispatch (jquery.min.js:3)
    at HTMLButtonElement.r.handle (jquery.min.js:3)
```

### Network Response (429)

```json
{
  "status": 429,
  "message": "Account locked due to too many failed attempts. Try again in 15 minutes.",
  "lockedUntil": "2026-07-05T14:47:18Z"
}
```

### Network Response (401, for comparison)

```json
{
  "status": 401,
  "error": {
    "message": "Invalid email or password",
    "code": "INVALID_CREDENTIALS"
  }
}
```

### Screenshot

<!-- Screenshot: adjuntar imagen aquí -->

## Impact Assessment

| Area | Impact |
|------|--------|
| Users affected | All users que mistypean password 3+ times |
| Frequency | Common (typos happen frecuentemente) |
| Workaround | Hard refresh de la page (F5) para restorear button functionality |
| Business impact | Users pueden abandonar login y contactear support |
| Support tickets | 3 tickets reportados esta week con el same issue |

## Suggested Fix

El error handler en `auth.js:142` debería handleear ambos response structures:

```typescript
// Current (broken)
function handleAuthError(response) {
  const message = response.error.message; // crashea en 429
  showError(message);
}

// Fixed
function handleAuthError(response) {
  const message = response.error?.message ?? response.message ?? 'An error occurred';
  showError(message);
}
```

## Regression Test

Después del fix, addeá este test para prevenir regression:

```typescript
test('BUG-001: Login button remains responsive after account lock', async ({ page }) => {
  await page.goto('https://staging.app.example.com/login');

  // Attempteá 3 failed logins
  for (let i = 0; i < 3; i++) {
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', `wrongpass${i + 1}`);
    await page.click('[data-testid="login-button"]');
    await page.waitForResponse(res => res.url().includes('/auth/login'));
  }

  // Verificá que lock message se displayee
  await expect(page.locator('[data-testid="error-message"]')).toContainText('Account locked');

  // Verificá que button sigue responsive (puede ser clickeado, muestra lock message again)
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="error-message"]')).toContainText('Account locked');
});
```
```

## Explanation

Un good bug report tiene five elements: environment (dónde pasó), preconditions (en qué state estaba el system), steps (cómo triggerearlo), expected vs actual (qué debería vs qué pasó) y evidence (screenshots, logs, network responses).

La minimal reproduction section es la most valuable. Después de reproducir el bug, strippéa unnecessary steps hasta que tengas el shortest sequence que triggerea el issue. Esto helpa a developers a isolatear la cause y escribir un targeted fix.

La suggested fix section es optional pero helpful. Si el reporter tiene technical knowledge, suggestear un fix direction savea al developer investigation time. Sin embargo, el reporter no debería assume que el fix es correct — el developer debería validarlo.

La regression test section asegura que el bug nunca vuelva. Every bug fix debería incluir un test que habría catcheado el original issue. Esto convierte un negative (findear un bug) en un positive (permanent coverage improvement).


### Escenario Detallado: Reportar un Bug de API con Respuesta Inconsistente

```text
Bug ID: BUG-042
Titulo: GET /v1/orders retorna 200 con body vacio cuando el pedido existe pero no tiene items
Severidad: Major
Entorno: Staging (v2.4.1-staging, commit abc1234)

Comando de reproduccion:
  $ curl -i https://staging.api.example.com/v1/orders/ord_empty_001 \
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

Respuesta actual (bug):
  HTTP/1.1 200 OK
  Content-Type: application/json
  Content-Length: 2

  {}

Respuesta esperada:
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "id": "ord_empty_001",
    "status": "created",
    "items": [],
    "total_cents": 0,
    "currency": "USD",
    "placed_at": "2026-07-05T10:00:00Z"
  }

Pasos de reproduccion:
  1. Crear un pedido sin items: POST /v1/orders con body {"customer_id":"usr_123","items":[]}
  2. Esperar respuesta 201 Created con el order ID
  3. Hacer GET /v1/orders/{order_id}
  4. Observar: respuesta 200 con body {} (vacio)

Causa raiz (investigada):
  El serializer omite campos cuando el array items esta vacio.
  Archivo: src/serializers/order_serializer.ts:45
  El condicional `if (order.items.length > 0)` deberia ser `if (order.items)`

Fix sugerido:
  // order_serializer.ts:45
  // Antes (roto):
  if (order.items.length > 0) {
    serialized.items = order.items.map(serializeItem);
  }

  // Despues (corregido):
  serialized.items = order.items ? order.items.map(serializeItem) : [];

Test de regresion:
  test("BUG-042: GET /v1/orders retorna body completo para pedido sin items", async () => {
    const create = await request.post("/v1/orders").send({
      customer_id: "usr_123",
      items: []
    });
    expect(create.status).toBe(201);
    const orderId = create.body.id;
    const res = await request.get("/v1/orders/" + orderId);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
    expect(res.body.items).toEqual([]);
    expect(res.body.total_cents).toBe(0);
  });
```

### Como reporto un bug intermittente que no puedo reproducir a voluntad?

Documenta la frecuencia estimada (ej: "ocurre 2 de cada 10 intentos"). Incluye todos los factores ambientales: hora del dia, carga del servidor, estado de la cache, navegador y version. Agrega logging adicional temporal para capturar el estado del sistema cuando ocurra. Si el bug involucra concurrencia, documenta el numero de requests simultaneos y el patron de timing. Los bugs intermittentes suelen ser race conditions, cache invalidation o time-sensitive behavior.

### Deberia incluir un video de reproduccion?

Para bugs de UI si, especialmente si el bug involucra interacciones complejas (drag-and-drop, secuencias de clicks, timing). Usa herramientas como Loom o grabacion nativa del navegador. Para bugs de API, un comando curl reproducible es mejor que un video. Manten el video corto (menos de 30 segundos) y enfocado en los pasos minimos.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Production incident | Addeá timeline, impact y mitigation | Usá incident report template en vez |
| API bug | Incluí request/response headers y body | Usá curl o Postman examples |
| Mobile bug | Incluí device model, OS version, app version | Addeá screen recording |
| Performance bug | Incluí profiling data, load conditions | Usá k6 o Lighthouse report |
| Security bug | Incluí vulnerability type (CWE), impact | Seguí responsible disclosure |

## What Works

1. Escribí minimal reproduction steps — strippéa anything not needed para triggerear el bug
2. Incluí exact versions — "latest Chrome" no es specific enough
3. Atacheá console logs y network responses — developers necesitan ver qué el code hizo
4. Compará expected vs actual explícitamente — no hagás al developer guess qué está wrong
5. Suggesteá un fix si podés — savea investigation time
6. Addeá un regression test — previene que el bug vuelva
7. Incluí impact assessment — helpa a priorizar el fix

## Common Mistakes

1. Vague steps ("click around the login area") — sé specific sobre every action
2. Missing environment details — bugs often reproducen solo en specific browsers o OS
3. No evidence — "it doesn't work" sin logs o screenshots no es actionable
4. Combinear multiple bugs — un report por bug, o el fix se complica
5. No minimal reproduction — incluir unrelated steps hace harder de diagnose
6. Assumir que el developer sabe tu workflow — stateá preconditions explícitamente
7. No severity assessment — sin severity, el team no puede priorizar

## Frequently Asked Questions

### ¿Cómo encuentro la minimal reproduction?

Empezá con los full reproduction steps. Remové un step a la vez y tratá de reproducir. Si el bug still ocurre sin ese step, removélo permanentemente. Continuá hasta que no puedas remover más steps sin que el bug desaparezca.

### ¿Qué si no puedo reproducir el bug consistentemente?

Notá el frequency: "reproducea 3 de 5 times." Incluí all environmental factors: network conditions, browser extensions, time of day. Intermittent bugs often involucran race conditions, caching o time-sensitive behavior. Incluí cualquier patterns que notices.

### ¿Debería reportar bugs directamente en code comments?

No. Bug reports pertenecen en el issue tracker dónde pueden ser tracked, prioritized y assigned. Code comments deberían referencear el bug ID: `// BUG-001: Handle 429 response structure`. Esto connecta el code al tracking system.

### ¿Qué severity debería asignar?

Critical: data loss, security breach, system unusable. Major: core feature broken, no workaround. Minor: feature broken, workaround exists. Trivial: cosmetic only. Cuando en doubt, preguntale al product owner o tech lead para confirmar severity.

### ¿Qué tan detailed debería ser el regression test?

Debería coverear el exact scenario que triggereó el bug: same steps, same data, same assertions. El test debería fail antes del fix y pass después. Mantenelo focused — un test por bug, no un detailed suite.
