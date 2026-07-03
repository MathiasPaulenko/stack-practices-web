---
contentType: guides
slug: accessibility-wcag-guide
title: "WCAG 2.2 Accesibilidad — Guía para Desarrolladores"
description: "Guía práctica de cumplimiento WCAG 2.2: perceptible, operable, comprensible y confiable, con ejemplos de código para desarrollo web accesible."
metaDescription: "Aprende accesibilidad WCAG 2.2: perceptible, operable, comprensible, confiable. Guía práctica con ejemplos de código para desarrollo web accesible."
difficulty: intermediate
topics:
  - frontend
tags:
  - accessibility
  - wcag
  - wcag-2.2
  - a11y
  - screen-reader
  - keyboard-navigation
  - aria
  - guide
relatedResources:
  - /guides/progressive-web-apps-guide
  - /guides/web-components-guide
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende accesibilidad WCAG 2.2: perceptible, operable, comprensible, confiable. Guía práctica con ejemplos de código para desarrollo web accesible."
  keywords:
    - accesibilidad
    - wcag
    - wcag-2.2
    - a11y
    - lector-pantalla
    - navegacion-teclado
    - aria
    - guia
---

## Visión General

La accesibilidad web (a11y) asegura que las personas con discapacidades puedan percibir, entender, navegar e interactuar con el contenido web. WCAG 2.2 (Pautas de Accesibilidad para Contenido Web) es el estándar actual, organizado en torno a cuatro principios: Perceptible, Operable, Comprensible y Confiable (POUR). Esta guía cubre los criterios de éxito más impactantes con ejemplos de código prácticos.

## Cuándo Usar

- Estás construyendo sitios o aplicaciones web de acceso público
- Necesitas cumplir requisitos legales (ADA, EAA, Sección 508)
- Quieres mejorar la usabilidad para todos los usuarios, incluidos quienes usan lectores de pantalla o navegación por teclado
- Estás realizando una auditoría de accesibilidad

## Los Cuatro Principios (POUR)

| Principio | Qué Significa | Criterios Clave |
|-----------|--------------|----------------|
| **Perceptible** | La información debe presentarse de formas que los usuarios puedan percibir | Texto alternativo, contraste de color, texto redimensionable |
| **Operable** | Los componentes de interfaz deben ser operables por todos los usuarios | Navegación por teclado, indicadores de foco, tiempo |
| **Comprensible** | La información y operación deben ser comprensibles | Texto legible, comportamiento predecible, prevención de errores |
| **Confiable** | El contenido debe funcionar con tecnologías de asistencia actuales y futuras | HTML válido, roles ARIA, nombre-rol-valor |

## Perceptible

### Alternativas de Texto (1.1.1)

Todo contenido no textual debe tener una alternativa de texto.

```html
<!-- Bien: texto alt descriptivo -->
<img src="chart.png" alt="Gráfico de barras mostrando crecimiento de ingresos de Q1 a Q4 de 2M a 5M" />

<!-- Bien: imagen decorativa oculta a lectores de pantalla -->
<img src="decoration.png" alt="" />

<!-- Mal: alt faltante o inútil -->
<img src="chart.png" />
<img src="chart.png" alt="imagen" />
```

### Contraste de Color (1.4.3)

El texto debe tener contraste suficiente contra su fondo.

| Nivel | Texto Normal | Texto Grande |
|-------|-------------|--------------|
| AA | 4.5:1 | 3:1 |
| AAA | 7:1 | 4.5:1 |

```css
/* Verificar con herramientas como WebAIM Contrast Checker */
.text-primary {
  color: #1a1a1a; /* gris oscuro */
  background: #ffffff;
  /* Ratio: 16.1:1 — pasa AAA */
}

.text-muted {
  color: #767676; /* gris medio */
  background: #ffffff;
  /* Ratio: 4.6:1 — pasa AA, no AAA */
}
```

### Texto Redimensionable (1.4.4)

El texto debe ser redimensionable hasta 200% sin pérdida de contenido o funcionalidad.

```css
/* Bien: unidades relativas */
body {
  font-size: 100%; /* respeta la configuración del navegador del usuario */
}

h1 {
  font-size: 2rem; /* escala con el tamaño de fuente raíz */
}

/* Mal: píxeles fijos que rompen el zoom */
body { font-size: 16px; }
```

## Operable

### Accesible por Teclado (2.1.1)

Toda la funcionalidad debe estar disponible desde el teclado.

```html
<!-- Bien: elementos nativos son accesibles por teclado -->
<button onclick="submit()">Enviar</button>
<a href="/next">Siguiente Página</a>

<!-- Mal: div fingiendo ser un botón -->
<div class="btn" onclick="submit()">Enviar</div>

<!-- Bien: componente personalizado con soporte de teclado -->
<div role="button" tabindex="0" 
     onclick="submit()" 
     onkeydown="if(event.key==='Enter') submit()">
  Enviar
</div>
```

### Foco Visible (2.4.7)

El foco del teclado debe estar visualmente indicado.

```css
/* Nunca quites indicadores de foco sin reemplazo */
*:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* Estilo de foco personalizado para elementos interactivos */
button:focus-visible,
a:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 95, 204, 0.4);
}
```

### Bloques de Omisión (2.4.1)

Proporciona una forma de saltar contenido repetitivo.

```html
<!-- Enlace de omisión para usuarios de teclado -->
<a href="#main-content" class="skip-link">Saltar al contenido principal</a>

<nav><!-- navegación --></nav>

<main id="main-content">
  <!-- contenido principal -->
</main>
```

## Comprensible

### Texto Legible (3.1.5)

El contenido debería ser legible a nivel de educación secundaria inferior.

```html
<!-- Bien: lenguaje claro y simple -->
<p>Ingresa tu correo para restablecer tu contraseña.</p>

<!-- Mal: jerga y complejidad -->
<p>Introduzca su dirección de correo electrónico registrada para iniciar el protocolo de recuperación de credenciales.</p>
```

### Prevención de Errores (3.3.4)

Prevenir errores en envíos legales/financieros/de modificación de datos.

```html
<!-- Bien: confirmación para acciones destructivas -->
<form onsubmit="return confirm('Eliminar esta cuenta permanentemente?')">
  <button type="submit">Eliminar Cuenta</button>
</form>

<!-- Bien: revisar antes del envío final -->
<form>
  <fieldset>
    <legend>Revisa tu pedido</legend>
    <!-- resumen del pedido -->
  </fieldset>
  <button type="submit">Confirmar Pago</button>
</form>
```

## Confiable

### HTML y ARIA Válidos (4.1.1, 4.1.2)

Usa marcado válido y roles ARIA apropiados.

```html
<!-- Bien: elemento semántico nativo -->
<nav aria-label="Navegación principal">
  <ul>
    <li><a href="/" aria-current="page">Inicio</a></li>
    <li><a href="/about">Acerca de</a></li>
  </ul>
</nav>

<!-- Bien: ARIA para componentes personalizados -->
<div role="tablist">
  <button role="tab" aria-selected="true" id="tab-1">Pestaña 1</button>
  <button role="tab" aria-selected="false" id="tab-2">Pestaña 2</button>
</div>
<div role="tabpanel" aria-labelledby="tab-1">Contenido del panel</div>
```

## Pruebas de Accesibilidad

| Herramienta | Propósito |
|-------------|-----------|
| axe DevTools | Extensión de navegador para verificaciones automatizadas |
| Lighthouse | Auditoría de accesibilidad integrada en Chrome |
| NVDA / JAWS | Pruebas con lector de pantalla (Windows) |
| VoiceOver | Pruebas con lector de pantalla (macOS) |
| Tecla Tab | Prueba manual de navegación por teclado |
| WAVE | Herramienta de evaluación de accesibilidad de WebAIM |

## Errores Comunes

- **Usar `outline: none` sin reemplazo** — los usuarios de teclado pierden su lugar
- **Depender únicamente del color para errores** — agrega íconos y texto
- **Faltar etiquetas en formularios** — cada entrada necesita una etiqueta asociada
- **Reproducción automática de medios sin controles** — respeta `prefers-reduced-motion`
- **Scroll infinito sin mecanismo de omisión** — proporciona paginación o búsqueda

## FAQ

**Qué nivel de WCAG debería apuntar?**
Nivel AA es el estándar para la mayoría de requisitos legales. Nivel AAA es aspiracional para contenido crítico.

**Necesito probar con lectores de pantalla reales?**
Las herramientas automatizadas detectan ~30% de los problemas. Las pruebas manuales con lectores de pantalla y navegación por teclado encuentran el resto.

**Cómo manejo contenido en vivo (SPA, AJAX)?**
Usa regiones ARIA live para anunciar actualizaciones, gestiona el foco en cambios de ruta y asegura que los modales atrapen el foco.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
