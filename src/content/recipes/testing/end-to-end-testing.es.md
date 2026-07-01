---
contentType: recipes
slug: end-to-end-testing
title: "End-to-End Testing"
description: "Escribe tests end-to-end confiables que simulan flujos reales de usuarios a través de toda la pila de aplicación."
metaDescription: "Lo que funciona en end-to-end testing: Playwright, Cypress, aislamiento de tests, seeding de datos, integración CI y prevención de tests flaky."
difficulty: intermediate
topics:
  - testing
tags:
  - e2e
  - testing
  - playwright
  - automation
relatedResources:
  - /guides/cicd-pipeline-guide
  - /guides/testing-strategy-guide
  - /recipes/e2e-testing
  - /recipes/playwright-component-testing
  - /guides/test-driven-development-guide
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Lo que funciona en end-to-end testing: Playwright, Cypress, aislamiento de tests, seeding de datos, integración CI y prevención de tests flaky."
  keywords:
    - e2e
    - testing
    - playwright
    - automation
---

## Visión General

Los tests end-to-end (E2E) verifican que una aplicación funciona como un todo al conducirla a través de las mismas interfaces que usaría un usuario real: un navegador, una app móvil o una API pública. A diferencia de los tests unitarios, que aíslan una sola función, o los tests de integración, que verifican un límite de servicio, los tests E2E ejercitan toda la pila: frontend, backend, base de datos, caché, servicios de terceros e infraestructura de red.

El objetivo no es cubrir cada caso borde, sino proteger los flujos críticos de usuario que generan valor de negocio: registrarse, iniciar sesión, completar una compra, pagar o finalizar un workflow. Una buena suite E2E detecta regresiones que ningún otro tipo de test puede capturar, pero una mala es lenta, frágil e ignorada. Esta receta muestra cómo escribir tests E2E rápidos, deterministas y mantenibles usando herramientas y patrones modernos.

## Cuándo Usar

Usa este recurso cuando:
- Pruebes flujos completos de usuario a través de toda la pila de aplicación. Consulta [Component Testing](/recipes/testing/e2e-testing) para validación de UI aislada.
- Verifiques caminos críticos como checkout, registro o flujos de pago. Consulta [Unit Testing](/recipes/testing/unit-testing) para probar lógica de forma aislada.
- Detectes regresiones que los tests de integración no capturan debido al comportamiento real del navegador, el renderizado o la sincronización de red.

## Solución

### Test con Playwright

```javascript
// e2e/checkout.spec.js
import { test, expect } from '@playwright/test';

test('customer completes checkout', async ({ page }) => {
  await page.goto('/products/demo-book');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/checkout');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('Order confirmed')).toBeVisible();
  await expect(page.locator('[data-testid="order-id"]')).not.toBeEmpty();
});
```

### Test con Cypress

```javascript
// cypress/e2e/checkout.cy.js
describe('checkout', () => {
  it('completes a purchase', () => {
    cy.visit('/products/demo-book');
    cy.contains('Add to cart').click();
    cy.visit('/checkout');
    cy.get('[data-testid="email"]').type('customer@example.com');
    cy.get('[data-testid="card"]').type('4242424242424242');
    cy.contains('Pay now').click();
    cy.contains('Order confirmed').should('be.visible');
    cy.get('[data-testid="order-id"]').should('not.be.empty');
  });
});
```

### Python con Playwright

```python
# tests/test_checkout.py
from playwright.sync_api import Page, expect

def test_checkout(page: Page):
    page.goto("/products/demo-book")
    page.get_by_role("button", name="Add to cart").click()
    page.goto("/checkout")
    page.get_by_label("Email").fill("customer@example.com")
    page.get_by_label("Card number").fill("4242424242424242")
    page.get_by_role("button", name="Pay now").click()
    expect(page.get_by_text("Order confirmed")).to_be_visible()
```

## Explicación

Un test E2E bien arquitecturado tiene cuatro capas: **aislamiento**, **setup**, **interacción** y **aserción**.

El **aislamiento** significa que cada test comienza desde un estado limpio y conocido. El test no debe depender de datos dejados por un test anterior. Usa una base de datos de prueba sembrada por test, o restablece el estado de la aplicación antes de ejecutar el test. Playwright y Cypress soportan hooks `beforeEach` y configuración a nivel de proyecto para imponer esto.

El **setup** cubre autenticación, seeding de datos y configuración. En lugar de iniciar sesión a través de la UI en cada test, usa un endpoint de API o inyección de storage del navegador para establecer la cookie de sesión. Esto elimina docenas de pasos lentos de interacción de tests no relacionados.

La **interacción** debe usar selectores visibles para el usuario siempre que sea posible: rol, etiqueta, placeholder o texto. Evita selectores CSS frágiles como `.btn-primary-3 > span`. Las bibliotecas modernas de testing fomentan `getByRole`, `getByLabel` y `getByText` porque reflejan cómo los usuarios perciben la página.

La **aserción** debe verificar resultados, no implementación. Asegúrate de que el usuario vea "Order confirmed" o de que el pedido aparezca en su historial. No asserts de que una función específica fue llamada con un argumento específico; eso pertenece a un test unitario.

## Variantes

| Herramienta | Lenguaje | Mejor Para | Notas |
|-------------|----------|------------|-------|
| Playwright | JavaScript, Python, Java, .NET | Navegadores modernos, cross-browser, ejecución paralela | Rápido, usa browser contexts, soporta tracing |
| Cypress | JavaScript | Equipos de frontend, debugging interactivo | Corre en el navegador, limitado a Chromium/WebKit/Firefox |
| Selenium | Java, Python, C#, etc. | Soporte de navegadores legacy, grids empresariales | Más lento, requiere más infraestructura |
| Puppeteer | JavaScript | Automatización solo Chrome, scraping, generación PDF | API más de bajo nivel que Playwright |
| WebdriverIO | JavaScript | Cross-browser con soporte móvil | Modular, soporta Appium |

## Lo que funciona

1. **Prueba el happy path y algunos caminos de fallo críticos.** No intentes cubrir cada mensaje de validación; los tests unitarios son más baratos para eso.
2. **Siembra datos determinísticos antes de cada test.** Usa una factory o API para crear usuarios, productos y pedidos, y límpialos después del test.
3. **Prefiere selectores visibles para el usuario sobre CSS o XPath.** `getByRole('button', { name: 'Submit' })` sobrevive a rediseños mejor que `.btn-primary`.
4. **Ejecuta tests E2E en CI en cada pull request, pero mantenlos rápidos.** Paraleliza por shards, ejecuta solo la suite de smoke en cambios pequeños y usa la suite completa antes del release.
5. **Trata la flakiness como un bug.** Si un test falla intermitentemente, investiga inmediatamente. Las causas comunes son race conditions, awaits faltantes o datos de prueba inestables.

## Errores Comunes

1. **Probar todo a través de la UI.** Login, navegación y setup de datos deben hacerse vía API o inyección de storage cuando sea posible.
2. **Escribir aserciones que dependen del timing.** Usa esperas explícitas, matchers con retry y estados estables en lugar de `sleep` fijos.
3. **Compartir estado mutable entre tests.** Los tests que dependen unos de otros crean fallos confusos e impiden la ejecución paralela.
4. **Ignorar diferencias entre entorno local y CI.** Los tests locales pueden pasar porque el servidor de desarrollo ya está caliente; CI debe construir el bundle de producción y usar un entorno fresco.
5. **No limpiar artefactos de prueba.** Cuentas, pedidos o registros de pago residuales contaminan analytics y pueden causar fallos posteriores.

## Preguntas Frecuentes

**P: ¿Cuántos tests E2E debo escribir?**
R: Enfócate en los flujos críticos de usuario. Una aplicación de tamaño medio suele tener entre 20 y 100 tests E2E. Cubre los caminos que, si se rompen, impedirían a los usuarios alcanzar su objetivo principal.

**P: ¿Los tests E2E deben ejecutarse antes o después del despliegue?**
R: Ejecuta una suite de smoke contra staging antes del despliegue, y la suite completa después del despliegue contra producción (o un entorno similar a producción). Algunos equipos ejecutan tests del camino crítico contra producción de forma continua.

**P: ¿Cómo hago que los tests E2E sean menos flaky?**
R: Siembra datos limpios por test, usa esperas explícitas y aserciones con retry, evita delays fijos, ejecuta tests en browser contexts aislados y trata cada test flaky como un bug que hay que corregir, no como un retry.

**P: ¿Puedo mockear APIs de terceros en tests E2E?**
R: Sí, pero solo cuando el tercero sea poco confiable o costoso. Usa herramientas como Mock Service Worker o la interceptación de red de Playwright. No mockees tu propio backend; eso anula el propósito del E2E testing.

**P: ¿Cuál es la diferencia entre tests E2E y component tests?**
R: Los tests E2E ejecutan la pila completa de la aplicación y el navegador real. Los component tests renderizan un solo componente UI de forma aislada y son más rápidos, pero no verifican la integración con el backend. Usa ambos para diferentes niveles de confianza.
