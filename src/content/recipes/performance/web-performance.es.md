---
contentType: recipes
slug: web-performance
title: "Optimización de Performance Web"
description: "Mejora Core Web Vitals, reduce tamaños de bundle y optimiza performance frontend con lazy loading, code splitting y herramientas de build modernas."
metaDescription: "Guía de optimización de performance web: Core Web Vitals, lazy loading, code splitting, análisis de bundles, optimización de imágenes y herramientas modernas."
difficulty: intermediate
topics:
  - performance
tags:
  - web-performance
  - performance
  - frontend
  - core-web-vitals
  - optimization
relatedResources:
  - /guides/performance-optimization-guide
  - /recipes/spa-code-splitting-lazy
  - /docs/capacity-planning-template
  - /guides/system-design-interview-guide
  - /guides/sql-performance-tuning-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Guía de optimización de performance web: Core Web Vitals, lazy loading, code splitting, análisis de bundles, optimización de imágenes y herramientas modernas."
  keywords:
    - web-performance
    - performance
    - frontend
    - core-web-vitals
---
## Visión General

El performance web impacta directamente el engagement de usuarios, tasas de conversión y [rankings de búsqueda](/guides/performance/performance-optimization-guide). Los Core Web Vitals de Google — Largest Contentful Paint (LCP), Interaction to Next Paint (INP) y Cumulative Layout Shift (CLS) — proveen targets medibles. Este recurso cubre técnicas prácticas: lazy loading, code splitting, optimización de imágenes, critical CSS y modern build tooling para lograr cargas de página bajo 3 segundos.

## Cuándo Usar

Usa este recurso cuando:
- Los scores de Core Web Vitals están fallando (LCP > 2.5s, CLS > 0.1)
- Usuarios móviles en redes 3G abandonan páginas antes de que carguen
- Los bundle sizes exceden 200KB e impactan el time-to-interactive
- [Scripts de terceros](/recipes/security/security-headers) (analytics, ads) bloquean el main thread

## Solución

### Critical CSS Inline + Async Load (HTML)

```html
<head>
  <!-- Inline critical CSS (~14KB max) -->
  <style>
    /* Above-fold styles: header, hero, layout skeleton */
    body{margin:0;font-family:system-ui}
    .hero{background:#3b82f6;min-height:60vh}
  </style>

  <!-- Preload key resources -->
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/hero-image.webp" as="image" fetchpriority="high">

  <!-- Async load non-critical CSS -->
  <link rel="preload" href="/styles.css" as="style" onload="this.rel='stylesheet'">
</head>
```

### Lazy Loading Images con API Nativa

```html
<!-- Native lazy loading — no requiere JavaScript -->
<img src="hero.webp" alt="Hero" fetchpriority="high" width="800" height="400">
<img src="below-fold-1.webp" alt="Product" loading="lazy" width="400" height="300">
<img src="below-fold-2.webp" alt="Team" loading="lazy" width="400" height="300">
```

### Code Splitting con Live Imports (React)

```tsx
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

function Dashboard() {
  return (
    <div>
      <CriticalStats /> {/* Siempre cargado */}
      <Suspense fallback={<Spinner />}>
        <HeavyChart /> {/* Cargado on demand */}
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <AnalyticsDashboard /> {/* Chunk separado */}
      </Suspense>
    </div>
  );
}
```

## Explicación

**Targets de Core Web Vitals**:

| Métrica | Bueno | Malo | Mide |
|---------|-------|------|------|
| LCP | < 2.5s | > 4s | Tiempo de carga del elemento visible más grande |
| INP | < 200ms | > 500ms | Responsividad de interacciones |
| CLS | < 0.1 | > 0.25 | Estabilidad visual (layout shifts) |
| TTFB | < 600ms | > 1.8s | Time to first byte |

**Ejemplo de performance budget**:
- JavaScript: 150KB (gzipped)
- Imágenes: 250KB total
- CSS: 50KB (incluyendo critical inline)
- Fonts: 40KB (subsetted)
- Terceros: 100KB máximo

## Variantes

| Técnica | Impacto | Esfuerzo |
|---------|---------|-----------|
| Optimización de imágenes (WebP/AVIF) | -50% bytes de imagen | Bajo |
| Font subsetting | -80% bytes de font | Bajo |
| Code splitting | -60% JS inicial | Medio |
| Edge caching | -90% TTFB | Bajo |
| Service Worker | Visitas repetidas instantáneas | Medio |
| HTTP/3 + QUIC | Más rápido en redes con pérdida | Bajo (CDN) |

## Lo que funciona

- **Mide usuarios reales, no tests de lab**: Field data de Chrome UX Report refleja condiciones actuales
- **Optimiza el critical path**: Cualquier cosa bloqueando `<head>` debería estar bajo 50KB total. Consulta [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
- **Self-host fonts y analytics**: Conexiones de terceros agregan overhead de DNS + TLS + TCP
- **Usa `content-visibility: auto`**: Los browsers skip rendering de contenido off-screen
- **Defer JavaScript no crítico**: `defer` o `type="module"` para scripts no necesarios inmediatamente

## Errores Comunes

1. **Imágenes hero oversized**: Un PNG hero de 4MB destruye LCP; usa imágenes responsive con `srcset`
2. **Terceros render-blocking**: Google Fonts cargados síncronamente retrasan first paint
3. **Sin resource hints**: `preload`, `prefetch` y `preconnect` son wins de performance gratuitos
4. **Hidratar todo**: [Arquitectura de islands](/recipes/performance/spa-code-splitting-lazy) (Astro, Fresh) envía zero JS para contenido estático
5. **Ignorar mobile**: 70% de usuarios están en mobile; testea en dispositivos reales, no solo DevTools

## Preguntas Frecuentes

**P: ¿Cuál es la única mejora de performance más grande?**
R: Optimización de imágenes. Las imágenes son típicamente 60-80% del peso de página. Usa formatos modernos, sizing responsive y lazy loading.

**P: ¿Debería usar un CDN?**
R: Sí. Un [CDN](/recipes/data/caching) reduce TTFB sirviendo desde edge locations cercanas a los usuarios. Esencial para audiencias globales.

**P: ¿Cómo balanceo performance con developer experience?**
R: Usa frameworks que optimizan por default (Astro, SvelteKit, Next.js con App Router). No luches contra las herramientas.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
