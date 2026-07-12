---
contentType: guides
slug: performance-optimization-guide
title: "Guía de Optimización de Performance Web"
description: "manual detallado para optimizar el rendimiento de aplicaciones web con mejores Core Web Vitals y experiencia de usuario."
metaDescription: "Aprende optimización de performance web: compresión de imágenes, lazy loading, estrategias de caché, bundle splitting y técnicas de mejora de Core Web Vitals."
difficulty: intermediate
topics:
  - performance
  - devops
tags:
  - bundle-splitting
  - caching
  - cdn
  - compression
  - core-web-vitals
  - devops
  - images
  - lazy-loading
  - performance
relatedResources:
  - /recipes/caching
  - /guides/cicd-pipeline-guide
  - /recipes/middleware
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende optimización de performance web: compresión de imágenes, lazy loading, estrategias de caché, bundle splitting y técnicas de mejora de Core Web Vitals."
  keywords:
    - web performance
    - core web vitals
    - page speed
    - caching
    - lazy loading
    - image optimization
---

## Resumen

La performance es un aspecto clave. Los sitios lentos pierden usuarios, ingresos y rankings de búsqueda. A continuación: técnicas prácticas para mejorar Core Web Vitals y ofrecer experiencias rápidas.

## Core Web Vitals

Google mide tres métricas para la experiencia de página:

| Métrica | Objetivo | Mide |
|---------|----------|------|
| **LCP** | < 2.5s | Largest Contentful Paint — velocidad de carga del contenido principal |
| **INP** | < 200ms | Interaction to Next Paint — capacidad de respuesta |
| **CLS** | < 0.1 | Cumulative Layout Shift — estabilidad visual |

### Cómo Medir

- **Lighthouse**: Integrado en Chrome DevTools
- **PageSpeed Insights**: Herramienta online con datos de campo
- **Web Vitals Extension**: Extensión de Chrome para monitoreo en tiempo real

## Optimización de Imágenes

Las imágenes suelen ser el recurso más pesado de una página.

### Formatos Modernos

| Formato | Caso de Uso | Ahorro |
|---------|-------------|--------|
| **WebP** | Reemplazo general de JPEG/PNG | 25-35% |
| **AVIF** | Máxima compresión | 50% vs JPEG |
| **SVG** | Iconos, logos, gráficos simples | Escalable, diminuto |

### Lazy Loading

```html
<!-- Lazy loading nativo -->
<img src="photo.jpg" loading="lazy" alt="...">
```

## Estrategias de Caché

Un caché adecuado elimina solicitudes de red redundantes.

### Encabezados HTTP de Caché

| Estrategia | Caso de Uso | Header |
|------------|-------------|--------|
| **Immutable** | Assets versionados (nombres con hash) | `Cache-Control: public, max-age=31536000, immutable` |
| **Revalidate** | Páginas HTML que pueden actualizarse | `Cache-Control: max-age=0, must-revalidate` |
| **Stale-while-revalidate** | Respuestas de API | `Cache-Control: max-age=3600, stale-while-revalidate=86400` |

## Optimización de JavaScript

### Bundle Splitting

```javascript
// Vite / Webpack: imports en vivo para rutas
const HomePage = () => import('./pages/HomePage.js');
const Dashboard = () => import('./pages/Dashboard.js');
```

### Estrategias de Code Splitting

| Estrategia | Cuándo Usar |
|------------|-------------|
| **Basada en rutas** | Cada página tiene su propio bundle |
| **Basada en componentes** | Componentes pesados se cargan bajo demanda |
| **Basada en librerías** | Vendors comunes en un chunk separado |

## Optimización de CSS

```css
/* CSS crítico inline en <head> */
<style>
  /* Estilos above-the-fold únicamente */
  .header { ... }
  .hero { ... }
</style>

<!-- CSS no crítico cargado asíncronamente -->
<link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'">
```

## Optimizaciones del Servidor

### Compresión

| Estrategia | Formato | Beneficio |
|------------|---------|-----------|
| **Gzip** | General | Reducción del 60-70% |
| **Brotli** | General | Reducción del 70-80% |

### Uso de CDN

- Servir assets estáticos desde [ubicaciones edge](/recipes/performance/cdn-edge-caching)
- Usar HTTP/2 o HTTP/3 para multiplexación
- Habilitar optimización automática de imágenes

## Lo que funciona

- **Establecer width/height explícitos** en imágenes para prevenir CLS
- **Diferir JavaScript no crítico** con `defer` o `async`
- **Preload recursos críticos**: fuentes, imágenes hero, CSS principal. Consulta [lazy loading](/recipes/performance/lazy-loading).
- **Usar resource hints**: `dns-prefetch`, `preconnect`, `prefetch`
- **Medir antes de optimizar**: Perfilear con DevTools primero

## Errores Comunes

- [Optimización prematura](/guides/performance/performance-optimization-guide) sin medición
- Cachear excesivamente respuestas de API que cambian frecuentemente
- Cargar todas las imágenes eager en páginas largas
- No [comprimir respuestas de API](/recipes/performance/brotli-nginx-compression) (JSON)

## Preguntas Frecuentes

### Cuál es la optimización de performance más útil para web apps?

La optimización de imágenes típicamente entrega el mayor impacto. Convertir a WebP/AVIF, usar imágenes responsive y lazy loading de imágenes below-the-fold a menudo reduce el peso de página en 50% o más.

### Debería usar un CDN para assets estáticos?

Sí. Un CDN reduce la latencia sirviendo assets desde ubicaciones edge cercanas a tus usuarios. También descarga tráfico de tu servidor origen y provee compresión y HTTP/2 integrados.

### Cómo mejoro Core Web Vitals rápidamente?

Para LCP: optimiza tu elemento de contenido más grande (usualmente una imagen hero). Para CLS: siempre establece width/height en imágenes e iframes. Para INP: divide tareas largas de JavaScript y diferir scripts no críticos.


## Temas Avanzados

### Escenario: Optimizacion de Web App E-commerce

```text
Sistema: E-commerce, 3s LCP, 0.3s INP, 0.25 CLS
Objetivo: LCP < 1.5s, INP < 0.2s, CLS < 0.1

Fase 1: Diagnostico (Lighthouse + WebPageTest)
  | Metrica | Antes | Objetivo | Herramienta |
  |---------|-------|----------|-------------|
  | LCP | 3.2s | < 1.5s | Lighthouse |
  | INP | 320ms | < 200ms | WebPageTest |
  | CLS | 0.25 | < 0.1 | Lighthouse |
  | TTFB | 800ms | < 200ms | curl |
  | Total weight | 3.2MB | < 1MB | DevTools |
  | JS bundle | 850KB | < 200KB | webpack-bundle-analyzer |

Fase 2: Optimizacion de imagenes (mayor impacto)
  - Convertir JPG/PNG a WebP (50% reduccion)
  - Convertir hero a AVIF (70% reduccion)
  - Responsive images: srcset + sizes
  - Lazy loading: loading="lazy" en below-the-fold
  - Width/height en todas las imagenes (prevenir CLS)
  - Resultado: LCP 3.2s -> 1.8s, weight 3.2MB -> 1.8MB

Fase 3: Optimizacion de JavaScript
  - Code splitting: route-based lazy loading
  - Tree shaking: eliminar imports no usados
  - Diferir scripts no criticos: defer + async
  - Reemplazar librerias pesadas:
    moment.js -> date-fns (280KB -> 13KB)
    lodash -> lodash-es + tree shaking
  - Resultado: JS bundle 850KB -> 180KB, INP 320ms -> 180ms

Fase 4: Optimizacion de red
  - CDN para assets estaticos (CloudFront)
  - HTTP/2 o HTTP/3 (multiplexing)
  - Brotli compression (mejor que gzip)
  - Cache-Control: max-age=31536000 para assets hashed
  - Service Worker para cache offline
  - Resultado: TTFB 800ms -> 180ms

Fase 5: Optimizacion de CSS
  - Critical CSS inline (above-the-fold)
  - Async load del resto: media="print" onload
  - PurgeCSS para eliminar estilos no usados
  - Resultado: CLS 0.25 -> 0.05

Fase 6: Resultados finales
  | Metrica | Antes | Despues | Objetivo |
  |---------|-------|---------|----------|
  | LCP | 3.2s | 1.3s | < 1.5s |
  | INP | 320ms | 165ms | < 200ms |
  | CLS | 0.25 | 0.05 | < 0.1 |
  | TTFB | 800ms | 180ms | < 200ms |
  | Weight | 3.2MB | 0.9MB | < 1MB |
  | JS bundle | 850KB | 180KB | < 200KB |

Lecciones:
  - Optimizacion de imagenes es el win mas rapido
  - Code splitting reduce bundle y mejora INP
  - CDN + HTTP/2 reduce TTFB dramaticamente
  - Critical CSS inline mejora LCP y CLS
  - Mide antes y despues: sin datos no hay optimizacion
```

### Como priorizo optimizaciones de performance?

Empieza por LCP: es la metrica que mas afecta UX. Optimiza el elemento mas grande (usualmente una imagen hero). Despues CLS: fijar width/height en imagenes e iframes. Finalmente INP: dividir tareas largas de JS y deferir scripts. Usa Lighthouse para identificar oportunidades por impacto estimado. Una optimizacion que reduce 1s de LCP vale mas que una que reduce 50ms de TTFB.


































































End of document. Review and update quarterly.