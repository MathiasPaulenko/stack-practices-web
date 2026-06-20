---
contentType: recipes
slug: playwright-component-testing
title: "Testing de Componentes con Playwright y Storybook"
description: "Como testear componentes React de forma aislada usando tests de componentes de Playwright combinados con historias de Storybook para validacion visual y de comportamiento"
metaDescription: "Testing de componentes con Playwright y Storybook. Testea componentes React de forma aislada, valida interacciones y detecta regresiones visuales antes del despliegue."
difficulty: beginner
topics:
  - testing
tags:
  - playwright
  - testing
  - react
relatedResources:
  - /recipes/jest-snapshot-testing
  - /recipes/visual-regression-testing
  - /guides/testing-strategy-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Testing de componentes con Playwright y Storybook. Testea componentes React de forma aislada, valida interacciones y detecta regresiones visuales antes del despliegue."
  keywords:
    - playwright
    - component testing
    - react testing
    - storybook
    - visual regression
---

# Testing de Componentes con Playwright y Storybook

Los tests de componentes de Playwright te permiten montar, interactuar y hacer assertions sobre componentes React en un navegador real. Combinados con historias de Storybook como fixtures de test, obtienes testing de componentes aislado que detecta tanto regresiones funcionales como visuales.

## Cuando Usar Esto

- Quieres testear componentes de forma aislada sin levantar la aplicacion completa. Consulta [Jest Snapshot Testing](/recipes/testing/unit-testing) para comparaciones de render output.
- Interacciones como hover, focus y navegacion por teclado deben ser validadas. Consulta [Unit Testing](/recipes/testing/unit-testing) para testear event handlers en aislamiento.
- Las regresiones visuales en componentes individuales deben detectarse antes del despliegue. Consulta [Visual Regression Testing](/recipes/testing/e2e-testing) para comparaciones basadas en screenshots.

## Requisitos Previos

- Proyecto React con Playwright instalado
- Storybook configurado (opcional pero recomendado para fixtures)

## Solucion

### 1. Instalar Dependencias

```bash
npm init playwright@latest -- --ct
npm install -D @playwright/experimental-ct-react
```

### 2. Configurar Playwright para Componentes

```typescript
// playwright-ct.config.ts
import { defineConfig, devices } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './src/components',
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### 3. Escribir Tests de Componentes

```tsx
// Button.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test.describe('Button', () => {
  test('renderiza con variante primary', async ({ mount }) => {
    const component = await mount(<Button variant="primary">Submit</Button>);
    await expect(component).toHaveText('Submit');
    await expect(component).toHaveClass(/primary/);
  });

  test('maneja eventos de click', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button onClick={() => { clicked = true; }}>Click me</Button>
    );
    await component.click();
    expect(clicked).toBe(true);
  });

  test('estado disabled previene interaccion', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button disabled onClick={() => { clicked = true; }}>Disabled</Button>
    );
    await component.click({ force: true });
    expect(clicked).toBe(false);
    await expect(component).toBeDisabled();
  });

  test('estado de focus es visible', async ({ mount, page }) => {
    const component = await mount(<Button>Focusable</Button>);
    await component.focus();
    await expect(page.locator('button:focus-visible')).toBeVisible();
  });
});
```

### 4. Reusar Historias de Storybook como Fixtures

```tsx
// Card.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import * as Stories from './Card.stories';

test.describe('Card', () => {
  test('estado loading coincide con la historia', async ({ mount }) => {
    const component = await mount(<Stories.Loading {...Stories.Loading.args} />);
    await expect(component.locator('[data-testid="skeleton"]')).toHaveCount(3);
  });

  test('card es accesible via teclado', async ({ mount, page }) => {
    const component = await mount(<Stories.WithActions {...Stories.WithActions.args} />);
    await component.locator('button').first().focus();
    await page.keyboard.press('Tab');
    await expect(component.locator('button:focus')).toHaveText('Edit');
  });
});
```

### 5. Testing de Regresion Visual

```tsx
// Alert.test.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Alert } from './Alert';

test('apariencia visual de alerta warning', async ({ mount }) => {
  const component = await mount(
    <Alert type="warning">Disk space is low</Alert>
  );
  await expect(component).toHaveScreenshot('alert-warning.png');
});
```

## Como Funciona

1. **Mount API** renderiza componentes en un contexto de navegador aislado
2. **Navegador Real** ejecuta tests con layout real, focus y manejo de eventos
3. **Integracion con Storybook** reusa historias existentes como fixtures de test
4. **Comparacion de Screenshots** captura y compara estados visuales entre builds

## Consideraciones de Produccion

- Ejecuta tests de componentes en CI antes de cada pull request
- Almacena screenshots baseline en control de versiones para comparacion deterministica
- Usa `toHaveScreenshot` con un threshold para diferencias de pixeles aceptables
- Combina con tests unitarios para logica y tests E2E para flujos de usuario

## FAQ

**P: Como se diferencia de React Testing Library?**
R: React Testing Library usa jsdom, que no soporta layout real ni CSS. Los tests de componentes de Playwright ejecutan en un navegador y detectan bugs visuales y de interaccion que jsdom no puede.

**P: Deberia reemplazar Jest con Playwright para todos los tests de componentes?**
R: Manten Jest para tests rapidos de logica. Usa tests de componentes de Playwright para interacciones, focus y regresion visual.

**P: Puedo testear componentes que usan context providers?**
R: Si. Envuelve el componente con providers en la llamada mount, o crea un componente wrapper de test.
