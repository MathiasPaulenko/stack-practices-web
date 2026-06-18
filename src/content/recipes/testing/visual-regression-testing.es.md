---
contentType: recipes
slug: visual-regression-testing
title: "Detectar Regresiones Visuales Automáticamente con Visual Testing"
description: "Cómo detectar cambios visuales no intencionales en aplicaciones web usando comparación de screenshots, gestión de baselines y herramientas como Chromatic, Percy y Playwright."
metaDescription: "Aprende visual regression testing para web apps. Detecta cambios visuales no intencionales con comparación de screenshots, baselines y Chromatic, Percy."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - baseline
  - chromatic
relatedResources:
  - /recipes/e2e-testing
  - /recipes/unit-testing
  - /recipes/integration-testing
  - /recipes/integration-testing-strategies
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende visual regression testing para web apps. Detecta cambios visuales no intencionales con comparación de screenshots, baselines y Chromatic, Percy."
  keywords:
    - visual regression testing
    - comparacion screenshots
    - regresion ui
    - testing chromatic
    - percy visual testing
---

## Visión general

Los tests funcionales verifican que los botones clickeen, los forms se envíen y las APIs retornen datos correctos. Pero no detectan un cambio de CSS que desplaza un botón 2 píxeles a la izquierda, una actualización de fuente que rompe alturas de línea, o un cambio de tema que hace texto ilegible. El visual regression testing llena este vacío capturando screenshots de tu aplicación y comparándolos contra baselines aprobadas. Cualquier diferencia de píxel es marcada para revisión humana, previniendo que cambios visuales no intencionales lleguen a producción.

El desafío core es evitar falsos positivos. El anti-aliasing, frames de animación, timestamps y contenido dinámico (ads, precios de acciones, avatares de usuario) crean diferencias benignas que deben filtrarse. Las herramientas modernas de visual testing usan rendering basado en DOM, ignorando ruido sub-pixel, y permiten enmascarar regiones dinámicas. Esta receta cubre comparación de screenshots con Playwright, Chromatic para bibliotecas de componentes y estrategias para baselines estables y mantenibles.

## Cuándo usarlo

Usa esta receta cuando:

- Manteniendo un design system donde cambios de componentes afectan múltiples aplicaciones
- Releasing actualizaciones frecuentes de UI y necesitando confianza de que los cambios son intencionales
- Soportando múltiples navegadores o temas donde la consistencia visual es crítica
- Migrando frameworks de CSS o refactorizando estilos globales con impacto amplio
- Colaborando entre equipos de diseño e ingeniería con estándares visuales compartidos

## Solución

### Comparación Visual con Playwright

```javascript
// playwright.config.js
module.exports = {
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
};

// test.spec.js
const { test, expect } = require('@playwright/test');

test('homepage visual regression', async ({ page }) => {
  await page.goto('https://app.example.com');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('homepage.png', {
    mask: [
      page.locator('[data-testid="timestamp"]'),
      page.locator('[data-testid="user-avatar"]'),
    ],
    fullPage: true,
  });
});
```

### Chromatic para Bibliotecas de Componentes

```javascript
// .storybook/preview.js
export const parameters = {
  chromatic: {
    diffThreshold: 0.2,
    delay: 300,
    viewports: [320, 768, 1280],
  },
};

// Button.stories.js
export const Primary = {
  args: { variant: 'primary', children: 'Click me' },
  parameters: { chromatic: { viewports: [320, 1280] } },
};
```

### Percy con Selenium (Python)

```python
from selenium import webdriver
from percy.selenium import percy_snapshot

driver = webdriver.Chrome()
driver.get("https://app.example.com/dashboard")
percy_snapshot(driver, name="Dashboard", widths=[768, 1280, 1920])
driver.quit()
```

## Explicación

- **Comparación de screenshots**: las herramientas de visual testing capturan un screenshot de la página actual y lo comparan píxel por píxel contra el baseline aprobado. Las diferencias son resaltadas en una vista de diff. Los revisores aprueban cambios intencionales o rechazan regresiones.
- **Gestión de baselines**: el baseline es la versión aprobada de un screenshot. Cuando un test produce una imagen diferente, se marca como "cambiada". El equipo revisa el diff y o bien la aprueba (actualizando el baseline) o la rechaza (arreglando el código). Los baselines típicamente se almacenan en servicios cloud, no en control de versiones.
- **Enmascaramiento y exclusión**: contenido dinámico como timestamps, avatares aleatorios de usuario y ads causan falsos positivos. Enmascara estos elementos seleccionando sus nodos DOM antes de la captura. La herramienta reemplaza las regiones enmascaradas con colores sólidos, ignorándolas durante la comparación.
- **Rendering cross-browser**: fuentes, anti-aliasing y motores de layout varían entre navegadores. Un screenshot tomado en Chrome no coincidirá pixel-perfecto con uno de Safari. Ejecuta tests visuales en los navegadores que soportas, manteniendo baselines separados para cada uno.

## Variantes

| Herramienta | Alcance | Integración CI | Costo | Mejor para |
|-------------|---------|----------------|-------|------------|
| Playwright | Página completa + componente | Built-in | Gratis | Equipos ya usando Playwright |
| Chromatic | Componentes Storybook | GitHub/CI | Pago | Design systems |
| Percy | Página completa + componente | Multi-plataforma | Pago | Testing cross-browser |
| Applitools | AI-powered | Enterprise | Pago | Visual testing a gran escala |

## Mejores prácticas

- **Estabiliza antes de capturar**: espera a que las fuentes carguen, las animaciones completen y los requests de red se resuelvan antes de tomar screenshots. Usa `networkidle`, waits explícitas o el parámetro `delay` de Chromatic. Screenshots de spinners de carga son inútiles.
- **Aísla componentes en Storybook**: testear componentes en aislamiento (vía Storybook) produce baselines más estables que screenshots de página completa. Un componente Button tiene menos variables que una página Dashboard completa. Usa ambos: Storybook para cobertura de componentes, página completa para integración.
- **Enmascara todo contenido dinámico**: identifica cada elemento que cambia entre ejecuciones — fechas, usernames, IDs, imágenes random, variaciones de A/B tests. Enmáscaralos agresivamente. Contenido dinámico no enmascarado es la causa #1 de tests visuales flaky.
- **Revisa diffs en CI, no localmente**: el visual testing produce muchas imágenes. Revisarlas en pull requests vía integraciones CI (GitHub Checks, GitLab MRs) es más eficiente que descargar y comparar localmente. Aprueba baselines a través de la web UI.
- **Limita combinaciones de viewport**: testear cada componente en 12 breakpoints es lento y costoso. Identifica tus top 3 breakpoints (mobile, tablet, desktop) y testea solo esos. Usa principios de diseño responsive para inferir comportamiento intermedio.

## Errores comunes

- **Testear páginas completas sin enmascarar**: una página con un timestamp vivo, banner rotatorio y saludo específico de usuario fallará en cada ejecución. O enmascaras estos elementos o usas datos mockeados que sean idénticos entre ejecuciones de test.
- **Almacenar baselines en Git**: los screenshots son archivos binarios grandes que inflan repositorios. Usa almacenamiento cloud de baselines (Chromatic, Percy o tu propio bucket S3). Git debería almacenar solo el código de test, no las imágenes.
- **Ejecutar tests visuales en cada commit**: los tests visuales son más lentos que los unit tests. Ejecútalos en pull requests y antes de releases, no en cada push a branches de feature. Usa tu pipeline de CI para gatear releases, no la velocidad de desarrollo.
- **Ignorar viewports móviles**: un componente que se ve bien a 1280px puede desbordarse a 375px. Siempre incluye al menos un viewport móvil en tu matriz de test visual. El tráfico móvil frecuentemente excede al desktop en aplicaciones de consumo.

## Preguntas frecuentes

**P: ¿Los tests visuales reemplazan a los unit tests?**
R: No. Los tests visuales detectan regresiones visuales; los unit tests detectan bugs de lógica. Se complementan mutuamente. Un botón puede verse correcto pero enviar el formulario equivocado. Un formulario puede calcular correctamente pero ser invisible debido a un bug de CSS. Usa ambos.

**P: ¿Cómo manejo cambios de diseño intencionales?**
R: Cuando un PR intencionalmente cambia la UI, el test visual marcará un diff. El revisor aprueba el nuevo screenshot, que se convierte en el nuevo baseline. Este es el workflow normal — los tests visuales no bloquean cambios, aseguran que los cambios sean revisados.

**P: ¿Puedo testear animaciones responsive?**
R: La mayoría de herramientas de visual testing capturan screenshots estáticos, no videos. Para animaciones, usa un delay para capturar el estado final, o enmascara la región animada. Para testing específico de motion, usa herramientas dedicadas de test de animación o QA manual.

**P: ¿Qué causa tests visuales flaky?**
R: Datos inestables, estados de carga, animaciones, diferencias de versión de navegador y rendering no determinístico. Arregla flakiness enmascarando regiones dinámicas, usando datos mockeados, esperando estabilidad y fijando versiones de navegador en CI.

