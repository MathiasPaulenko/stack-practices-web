---





contentType: guides
slug: complete-guide-web-performance-core-web-vitals
title: "Referencia Detallada de Web Performance y Core Web Vitals"
description: "Optimizar Core Web Vitals. Cubre LCP, INP, CLS measurement y improvement, image optimization, font loading, render-blocking resources, lazy loading, caching strategies y performance monitoring con ejemplos practicos de codigo."
metaDescription: "Optimize Core Web Vitals. Covers LCP, INP, CLS measurement, image optimization, font loading, render-blocking, lazy loading, caching, monitoring."
difficulty: advanced
topics:
  - frontend
  - performance
tags:
  - performance
  - frontend
  - guia
  - core-web-vitals
  - lcp
  - inp
  - cls
  - web-vitals
relatedResources:
  - /guides/complete-guide-bundle-size-optimization
  - /guides/complete-guide-react-19-features
  - /guides/complete-guide-css-grid-and-flexbox
  - /recipes/javascript-debounce-throttle-implementation
  - /recipes/javascript-event-loop
  - /recipes/web-performance
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Optimize Core Web Vitals. Covers LCP, INP, CLS measurement, image optimization, font loading, render-blocking, lazy loading, caching, monitoring."
  keywords:
    - core web vitals
    - lcp optimization
    - inp optimization
    - cls optimization
    - web performance
    - image optimization
    - font loading
    - lazy loading





---

## Introducción

Core Web Vitals son las metrics de Google para medir real user experience. LCP mide loading speed, INP mide interactivity, y CLS mide visual stability. Esta guia recorre como medir, diagnosticar, y optimizar cada metric con practical code examples.

## Core Web Vitals Overview

```text
Core Web Vitals (2024):

LCP (Largest Contentful Paint):
  - Mide loading speed del largest element
  - Good: < 2.5s | Needs improvement: 2.5-4s | Poor: > 4s
  - Usualmente un image, hero banner, o large text block

INP (Interaction to Next Paint):
  - Reemplazo FID en March 2024
  - Mide responsiveness a user input (click, keypress, tap)
  - Good: < 200ms | Needs improvement: 200-500ms | Poor: > 500ms
  - Mide la worst interaction en un session

CLS (Cumulative Layout Shift):
  - Mide visual stability
  - Good: < 0.1 | Needs improvement: 0.1-0.25 | Poor: > 0.25
  - Caused by images sin dimensions, fonts, ads, dynamic content

Other metrics:
  - FCP (First Contentful Paint): < 1.8s
  - TTFB (Time to First Byte): < 800ms
  - TBT (Total Blocking Time): < 200ms (lab data only)
```

## Measuring Core Web Vitals

### Usando web-vitals Library

```javascript
import { onLCP, onINP, onCLS, onFCP, onTTFB } from "web-vitals";

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    delta: metric.delta,
    navigationType: metric.navigationType,
    entries: metric.entries.map((e) => ({
      startTime: e.startTime,
      duration: e.duration,
      name: e.name,
    })),
  });
  
  // Usa sendBeacon para reliability on page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/vitals", body);
  } else {
    fetch("/api/vitals", { body, method: "POST", keepalive: true });
  }
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Server-side Collection

```javascript
// API endpoint para collect vitals
export async function POST(request) {
  const vitals = await request.json();
  
  // Storea en tu analytics backend
  await db.webVitals.insert({
    ...vitals,
    url: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    timestamp: new Date(),
  });
  
  return new Response("ok", { status: 200 });
}
```

### Usando Performance Observer API

```javascript
// Medir LCP directamente
const lcpObserver = new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log("LCP:", lastEntry.startTime, lastEntry.element);
});
lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

// Medir CLS
let clsValue = 0;
const clsObserver = new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
    }
  }
  console.log("CLS:", clsValue);
});
clsObserver.observe({ type: "layout-shift", buffered: true });

// Medir INP
let worstInp = 0;
const inpObserver = new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    const duration = entry.duration;
    if (duration > worstInp) {
      worstInp = duration;
      console.log("INP:", worstInp, entry.target);
    }
  }
});
inpObserver.observe({ type: "interaction", buffered: true });
```

## LCP Optimization

### Image Optimization

```html
<!-- Bad: no dimensions, no loading priority -->
<img src="/hero.jpg" />

<!-- Good: dimensions, fetchpriority, preload -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
<img
  src="/hero.webp"
  width="1200"
  height="630"
  fetchpriority="high"
  alt="Hero image"
/>

<!-- Responsive images con srcset -->
<img
  src="/hero-800.webp"
  srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  width="1200"
  height="630"
  fetchpriority="high"
  alt="Hero image"
/>
```

### Font Optimization

```html
<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<!-- font-display: swap para avoid invisible text -->
<style>
  @font-face {
    font-family: "Inter";
    src: url("/fonts/inter-var.woff2") format("woff2");
    font-display: swap;
    font-weight: 100 900;
  }
</style>
```

### Eliminate Render-Blocking Resources

```html
<!-- Inline critical CSS -->
<style>
  /* Above-the-fold CSS aca */
  body { margin: 0; font-family: system-ui, sans-serif; }
  .hero { min-height: 50vh; display: grid; place-items: center; }
</style>

<!-- Defer non-critical CSS -->
<link rel="preload" href="/styles/non-critical.css" as="style" onload="this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="/styles/non-critical.css" /></noscript>

<!-- Defer JavaScript -->
<script src="/app.js" defer></script>
<script src="/analytics.js" async></script>
```

### Server Response Time (TTFB)

```javascript
// Usa un CDN
// Enablea HTTP/2 o HTTP/3
// Usa edge rendering donde sea possible

// Cache headers para static assets
const cacheHeaders = {
  "/assets/*": "public, max-age=31536000, immutable",
  "/_next/image/*": "public, max-age=86400, stale-while-revalidate=604800",
  "/api/*": "no-store",
};

// Next.js example: edge runtime para faster TTFB
export const runtime = "edge";

export default async function handler(req) {
  const data = await fetch("https://api.example.com/data", {
    next: { revalidate: 60 },
  });
  return new Response(await data.text(), {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=600" },
  });
}
```

## INP Optimization

### Break Up Long Tasks

```javascript
// Bad: long blocking task
function processItems(items) {
  items.forEach((item) => {
    // Heavy computation
    doExpensiveWork(item);
  });
}

// Good: yield al main thread
async function processItems(items) {
  for (const item of items) {
    doExpensiveWork(item);
    
    // Yield al main thread every 5ms
    if (performance.now() % 5 < 1) {
      await scheduler.yield();
    }
  }
}

// Usando requestIdleCallback para non-urgent work
function processBackground(items) {
  requestIdleCallback((deadline) => {
    while (items.length > 0 && deadline.timeRemaining() > 0) {
      doExpensiveWork(items.shift());
    }
    
    if (items.length > 0) {
      processBackground(items);
    }
  });
}
```

### Debounce y Throttle

```javascript
// Debounce: delay hasta que input stops
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Throttle: limita rate de execution
function throttle(fn, limit) {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Uso
const handleSearch = debounce((query) => {
  fetchResults(query);
}, 300);

const handleScroll = throttle(() => {
  updateScrollPosition();
}, 16);  // ~60fps

input.addEventListener("input", (e) => handleSearch(e.target.value));
window.addEventListener("scroll", handleScroll);
```

### Use Web Workers

```javascript
// main.js
const worker = new Worker("/worker.js");

worker.postMessage({ items: largeDataSet });

worker.onmessage = (e) => {
  const results = e.data;
  renderResults(results);
};

// worker.js
self.onmessage = (e) => {
  const results = e.data.items.map(doExpensiveWork);
  self.postMessage(results);
};
```

## CLS Optimization

### Reserve Space para Images y Ads

```css
/* Bad: no dimensions causa layout shift */
img {
  max-width: 100%;
  height: auto;
}

/* Good: aspect-ratio reservea space */
img {
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
}

/* Reservea space para ad slots */
.ad-slot {
  min-height: 250px;
  width: 100%;
}

/* Reservea space para embeds */
.embed-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
}

.embed-container iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
```

### Font Loading para prevenir CLS

```css
/* Usa font-display: optional para prevenir FOUT/FOIT layout shifts */
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter.woff2") format("woff2");
  font-display: optional;  /* Browser usa fallback si font not loaded in time */
}

/* Size-adjust fallback fonts para matchear custom font metrics */
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 100.5%;
  ascent-override: 92%;
  descent-override: 22%;
}

body {
  font-family: "Inter", "Inter Fallback", sans-serif;
}
```

### Avoid Dynamic Content Injection

```javascript
// Bad: insertar content pushea existing elements down
function loadMore() {
  const newContent = document.createElement("div");
  newContent.innerHTML = "New content";
  document.body.insertBefore(newContent, document.getElementById("existing"));
}

// Good: reservea space o usa transform
function loadMore() {
  const placeholder = document.getElementById("placeholder");
  placeholder.style.transform = "translateY(0)";  // Usa transform, no layout
  placeholder.innerHTML = "New content";
}
```

## Caching Strategies

```javascript
// Service Worker caching
const CACHE_NAME = "v1";
const STATIC_ASSETS = ["/", "/styles.css", "/app.js", "/fonts/inter.woff2"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("fetch", (event) => {
  // Cache-first para static assets
  if (event.request.url.includes("/assets/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached || fetch(event.request)
      )
    );
    return;
  }
  
  // Stale-while-revalidate para API calls
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
  
  // Network-first para pages
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
```

## Performance Budgets

```javascript
// webpack.config.js — performance budgets
module.exports = {
  performance: {
    hints: "error",
    maxAssetSize: 244 * 1024,  // 244 KB
    maxEntrypointSize: 244 * 1024,
    assetFilter: (assetFilename) => {
      return !assetFilename.endsWith(".map");
    },
  },
};

// Lighthouse CI — budgets
// lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "first-contentful-paint": ["error", { maxNumericValue: 1800 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 200 }],
      },
    },
  },
};
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre lab data y field data?

Lab data es collected en un controlled environment (Lighthouse, WebPageTest) con simulated device y network conditions. Es consistent y reproducible pero no reflects real user experience. Field data (CrUX, RUM) es collected de real users con sus actual devices y network conditions. Reflects reality pero es noisy y tiene less detail. Usa lab data para debugging y regression testing, field data para trackear real user experience.

### ¿Cómo encuentro que esta causando high INP?

Usa el Performance panel en Chrome DevTools. Graba un trace mientras interactuas con la page. Busca long tasks (yellow blocks) en el main thread. El Interaction tab muestra que interactions son slow. Usa `PerformanceObserver` con `type: "interaction"` para loggear slow interactions en production. Common causes: expensive event handlers, synchronous layout reads (forced reflow), large DOM updates, y third-party scripts.

### ¿Cuál es la forma mas effective de mejorar LCP?

Identifica tu LCP element usando Chrome DevTools o la `web-vitals` library. Common LCP elements son hero images, large text blocks, o video posters. Optimiza el LCP element primero: preloadalo, usa modern formats (WebP/AVIF), setea width y height, y usa `fetchpriority="high"`. Luego reduce TTFB con un CDN, edge rendering, y caching. Finalmente, eliminate render-blocking CSS y JavaScript que delay el LCP element de painting.

### ¿Cómo prevengo layout shifts de images?

Siempre specifica `width` y `height` attributes en images. El browser los usa para reservear space antes de que el image loadee. Alternativamente, usa CSS `aspect-ratio` para reservear space. Para responsive images, usa `srcset` con corresponding `sizes` y setea `aspect-ratio` en CSS. Para dynamically loaded images, renderea un placeholder con las correct dimensions antes de que el image loadee. Para ads, reservea un fixed-size slot que no colapsea cuando empty.

### ¿Deberia usar server-side rendering para mejores Core Web Vitals?

SSR mejora FCP y LCP porque el browser recibe HTML immediately sin esperar JavaScript para download y execute. Sin embargo, SSR puede increase TTFB si el server es slow. Usa streaming SSR para mandar HTML en chunks — el browser puede renderear el first chunk mientras el server preparea el rest. Para content-heavy pages, SSR o SSG es recommended. Para interactive apps donde LCP es text-based, client-side rendering con proper loading states puede ser sufficient.

### ¿Cómo affectan third-party scripts los Core Web Vitals?

Third-party scripts (analytics, ads, chat widgets, A/B testing) pueden blockear el main thread, delay LCP, cause CLS, y increase INP. Auditea third-party scripts con el Coverage tab en DevTools. Loadea non-critical scripts con `async` o `defer`. Usa el `loading="lazy"` attribute para iframes. Considera server-side analytics en vez de client-side. Usa una consent management platform que loadea scripts solo despues de consent. Setea up un Content Security Policy para controlar que third-party domains pueden ejecutar scripts.

## See Also

- [Core Web Vitals Audit Checklist](/es/docs/core-web-vitals-audit-checklist/)
- [Complete Guide to Bundle Size Optimization](/es/guides/complete-guide-bundle-size-optimization/)
- [Complete Guide to React Performance Optimization](/es/guides/complete-guide-react-performance-optimization/)
- [Complete Guide to React 19 Features](/es/guides/complete-guide-react-19-features/)
- [SPA Performance: Code Splitting and Lazy Loading](/es/recipes/spa-code-splitting-lazy/)

