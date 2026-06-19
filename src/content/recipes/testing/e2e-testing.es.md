---
contentType: recipes
slug: e2e-testing
title: "Escribir Tests End-to-End que Realmente Atrapen Bugs"
description: "Cómo diseñar tests end-to-end confiables usando Playwright y Cypress que simulen viajes de usuario reales, eviten flakiness e integren pipelines CI/CD."
metaDescription: "Aprende testing end-to-end con Playwright y Cypress. Diseña tests E2E confiables que simulen viajes de usuario, eviten flakiness e integren CI/CD."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - playwright
relatedResources:
  - /recipes/integration-testing
  - /recipes/unit-testing-mocking
  - /recipes/load-testing
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende testing end-to-end con Playwright y Cypress. Diseña tests E2E confiables que simulen viajes de usuario, eviten flakiness e integren CI/CD."
  keywords:
    - end to end testing
    - playwright e2e
    - cypress testing
    - user journey testing
    - automated browser testing
---

## Visión general

Los tests end-to-end (E2E) simulan interacciones de usuario reales a través de todo el stack de aplicación — navegador, frontend, API, base de datos y servicios de terceros. A diferencia de los tests unitarios, que verifican funciones aisladas, y los tests de integración, que verifican interacciones de componentes, los tests E2E validan que el sistema completo se comporta correctamente desde la perspectiva del usuario.

El desafío principal del testing E2E es el flakiness — tests que fallan intermitentemente sin cambios de código. El flakiness surge de condiciones de carrera, selectores inestables, deriva ambiental y problemas de timing asíncrono. Un suite E2E bien diseñado usa waits explícitos, selectores estables, datos de prueba determinísticos y entornos aislados para minimizar falsos negativos. Esta receta cubre Playwright y Cypress, los dos frameworks E2E modernos dominantes.

## Cuándo usarlo

Usa esta receta cuando:

- Validando viajes de usuario críticos como login, checkout y flujos de onboarding
- Probando en múltiples navegadores y dispositivos antes del release
- Atrapando regresiones que los tests unitarios y de integración no detectan
- Construyendo confianza para pipelines de continuous deployment
- Reproduciendo bugs reportados por usuarios en producción

## Solución

### Playwright (TypeScript)

```typescript
import { test, expect } from '@playwright/test';

test.describe('flujo de checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('el usuario puede completar una compra', async ({ page }) => {
    await page.goto('/products');
    await page.click('[data-testid="product-42"]');
    await page.click('[data-testid="add-to-cart"]');
    await page.waitForSelector('[data-testid="cart-count"]', { hasText: '1' });

    await page.goto('/checkout');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvc"]', '123');
    await page.click('[data-testid="place-order"]');

    await page.waitForSelector('[data-testid="order-confirmation"]');
    const confirmation = await page.textContent('[data-testid="order-confirmation"]');
    expect(confirmation).toContain('Thank you for your order');
  });
});
```

### Cypress (JavaScript)

```javascript
describe('flujo de checkout', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('el usuario puede completar una compra', () => {
    cy.visit('/products');
    cy.get('[data-testid="product-42"]').click();
    cy.get('[data-testid="add-to-cart"]').click();
    cy.get('[data-testid="cart-count"]').should('have.text', '1');

    cy.visit('/checkout');
    cy.get('[data-testid="card-number"]').type('4242424242424242');
    cy.get('[data-testid="expiry"]').type('12/25');
    cy.get('[data-testid="cvc"]').type('123');
    cy.get('[data-testid="place-order"]').click();

    cy.get('[data-testid="order-confirmation"]')
      .should('be.visible')
      .and('contain', 'Thank you for your order');
  });
});
```

### Integración CI/CD (GitHub Actions)

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Explicación

- **Automatización de navegador real**: Playwright y Cypress controlan navegadores reales de Chromium, Firefox y WebKit. Simulan clics, escritura, navegación y condiciones de red más precisamente que clientes HTTP headless.
- **Espera automática**: ambos frameworks esperan automáticamente a que los elementos aparezcan, se habiliten o dejen de animarse antes de interactuar. Esto elimina el anti-patrón `sleep(1)` que causa flakiness en Selenium.
- **Traza y debug**: Playwright genera trazas (screenshots, logs de red, snapshots del DOM) en fallo. Cypress corre dentro del navegador y proporciona debugging de time-travel. Ambos hacen que diagnosticar fallos sea significativamente más rápido.
- **Aislamiento de tests**: cada test debería crear y limpiar sus propios datos. El estado compartido de base de datos entre tests causa dependencias de ordenamiento y fallos ocultos. Usa APIs o fixtures de base de datos para resetear estado en `beforeEach`.

## Variantes

| Framework | Lenguaje | Multi-navegador | Paralelo | Mejor para |
|-----------|----------|-----------------|----------|------------|
| Playwright | TypeScript | Chromium, Firefox, WebKit | Nativo | Equipos que necesitan velocidad y cobertura |
| Cypress | JavaScript | Chromium, Electron | Vía dashboard | Equipos que quieren debugging en navegador |
| Selenium | Multi | Todos los principales | Vía Grid | Soporte enterprise legacy |
| Puppeteer | JavaScript | Solo Chromium | Manual | Scraping/testing específico de Chrome |

## Mejores prácticas

- **Usa selectores `data-testid`**: evita seleccionar por clase CSS o posición del DOM. Las clases cambian durante refactors; los atributos `data-testid` son contratos estables entre frontend y suite de tests.
- **Testea viajes de usuario, no detalles de implementación**: un buen test E2E se lee como una historia de usuario — "el usuario inicia sesión, agrega un producto al carrito y compra." No aserta sobre estado interno de Redux ni payloads de respuesta de API.
- **Ejecuta E2E en CI en cada PR**: los tests E2E son lentos, pero ejecutarlos en pull requests atrapa regresiones antes de que lleguen a staging. Usa sharding (workers paralelos) para mantener el tiempo total bajo 10 minutos.
- **Mockea dependencias externas**: procesadores de pago de terceros, servicios de email y analytics deberían ser stubeados o interceptados. Los tests que dependen de servicios externos reales son lentos e poco confiables.
- **Reintenta tests fallidos con cautela**: la mayoría de frameworks soporta reintentos automáticos. Úsalos con moderación — los reintentos enmascaran flakiness real. Arregla la causa raíz en lugar de reintentar indefinidamente.

## Errores comunes

- **Testear todo a través de la UI**: no cada feature necesita un test E2E. Los caminos críticos de negocio (checkout, login, pagos) merecen cobertura E2E. Las utilidades de admin internas se sirven mejor con tests de integración.
- **Hardcodear timeouts**: waits explícitos como `cy.wait(3000)` hacen los tests lentos y aún fallan en runners de CI más lentos. Usa espera automática del framework o aserta sobre condiciones del DOM en su lugar.
- **Compartir cuentas de test**: los tests que inician sesión con la misma cuenta crean condiciones de carrera. Usa cuentas específicas de test o usuarios efímeros creados vía API antes de cada test.
- **Ignorar viewports móviles**: los usuarios interactúan con tu aplicación en teléfonos, tablets y desktops. Ejecuta tests E2E contra múltiples tamaños de viewport para atrapar bugs de layout responsive.

## Preguntas frecuentes

**P: ¿Cuántos tests E2E debería escribir?**
R: Sigue la pirámide de tests — muchos tests unitarios, menos tests de integración, y un pequeño número de tests E2E cubriendo viajes de usuario críticos. Una aplicación típica tiene 20-50 tests E2E, no cientos.

**P: ¿Los tests E2E deberían ejecutarse contra producción?**
R: Ejecuta monitoreo sintético (smoke tests) contra producción, pero no el suite E2E completo. Los tests de producción mutan datos reales y dependen de servicios externos fuera de tu control.

**P: ¿Cómo manejo autenticación en tests E2E?**
R: Usa endpoints de API para crear y autenticar usuarios de test antes de cada test. Almacena tokens de sesión en `localStorage` o cookies vía `page.addInitScript` para bypassear el flujo de login de UI.

**P: ¿Cuál es la diferencia entre E2E e integración?**
R: Los tests E2E conducen la aplicación a través de la UI como lo haría un usuario. Los tests de integración verifican que componentes backend (API + base de datos + servicio) funcionen juntos, frecuentemente vía llamadas HTTP directas sin navegador.

