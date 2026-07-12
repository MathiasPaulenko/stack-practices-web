---


contentType: docs
slug: core-web-vitals-audit-checklist
templateType: guideline
title: "Checklist de Auditoria de Core Web Vitals"
description: "Checklist para auditar Core Web Vitals por pagina: LCP optimization steps, INP interaction tuning, CLS layout stability fixes, field data vs lab data analysis, CrUX integration y remediation tracking con ejemplos de codigo para imagenes, fuentes, JavaScript y CSS."
metaDescription: "Core Web Vitals audit checklist: LCP, INP, CLS optimization, field vs lab data, CrUX, remediation tracking, image font JS CSS fixes per page."
difficulty: intermediate
topics:
  - performance
  - frontend
tags:
  - core-web-vitals
  - lcp
  - inp
  - cls
  - audit
  - web-performance
  - lighthouse
relatedResources:
  - /docs/performance-budget-template
  - /docs/database-query-tuning-checklist
  - /docs/load-test-plan-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Core Web Vitals audit checklist: LCP, INP, CLS optimization, field vs lab data, CrUX, remediation tracking, image font JS CSS fixes per page."
  keywords:
    - core web vitals audit
    - lcp optimization
    - inp optimization
    - cls optimization
    - web vitals checklist
    - crux data


---

## Overview

Este checklist guia una auditoria per-page de Core Web Vitals. Cubre LCP optimization, INP interaction tuning, CLS layout stability fixes, field data vs lab data analysis, CrUX integration y remediation tracking. Usa este checklist cuando auditas un existing site o antes de launchear un new page type.

---

## 1. Pre-Audit Setup

### 1.1 Tools Required

```text
Tool                    | Purpose                          | Cost
────────────────────────┼──────────────────────────────────┼──────────
Lighthouse              | Lab data, audits, recommendations| Free
PageSpeed Insights      | Lab + field data combined        | Free
CrUX Dashboard          | Field data from Chrome users     | Free
WebPageTest             | Waterfall, filmstrip, deep analysis| Free/Paid
Chrome DevTools         | Local debugging, performance panel| Free
web-vitals library      | RUM collection en production      | Free
Search Console          | Core Web Vitals report per URL    | Free
```

### 1.2 Audit Scope Template

```text
Page URL              | Page Type   | Priority | Last Audited | Owner
──────────────────────┼─────────────┼──────────┼──────────────┼──────────
/                     | Homepage    | High     | 2026-07-04   | Frontend
/products             | Listing     | High     | 2026-07-04   | Frontend
/products/{slug}      | Detail      | High     | Not yet      | Frontend
/blog/{slug}          | Article     | Medium   | Not yet      | Content
/checkout             | Conversion  | Critical | 2026-07-04   | Frontend
/search?q={query}     | Search      | Medium   | Not yet      | Frontend
/dashboard            | SPA         | Medium   | Not yet      | Frontend
```

---

## 2. LCP (Largest Contentful Paint) Audit

### 2.1 LCP Checklist

```text
- [ ] Identifica el LCP element en la page
  - Abre Chrome DevTools > Performance > Insights
  - Busca el "LCP" marker en el timeline
  - Common LCP elements: hero image, hero text, video poster

- [ ] Optimiza LCP element loading
  - Preloadea el LCP image: <link rel="preload" as="image" href="hero.webp">
  - Usa fetchpriority="high" en el LCP image
  - Sirve responsive images con srcset
  - Usa modern formats (WebP, AVIF)

- [ ] Optimiza TTFB (affecta LCP)
  - Usa CDN para static assets
  - Cachea HTML en el edge
  - Optimiza server response time (< 600ms)
  - Usa SSR o SSG donde possible

- [ ] Elimina render-blocking resources
  - Inlinea critical CSS
  - Defere non-critical CSS: <link rel="preload" ... onload="this.rel='stylesheet'">
  - Defere non-critical JS: <script defer> o <script type="module">
  - Removee unused CSS con PurgeCSS o UnCSS

- [ ] Optimiza font loading
  - Preloadea primary font: <link rel="preload" as="font" type="font/woff2" href="font.woff2" crossorigin>
  - Usa font-display: swap
  - Self-hostea fonts en vez de Google Fonts CDN
  - Subsetea fonts para reducear file size
```

### 2.2 LCP Code Fixes

```html
<!-- Preload LCP image -->
<link rel="preload" as="image" href="/images/hero.webp" fetchpriority="high">

<!-- Responsive LCP image -->
<img
  src="/images/hero-800.webp"
  srcset="/images/hero-400.webp 400w, /images/hero-800.webp 800w, /images/hero-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Hero image"
  fetchpriority="high"
  decoding="async"
/>

<!-- Preload critical font -->
<link rel="preload" as="font" type="font/woff2"
  href="/fonts/inter-var.woff2" crossorigin>

<!-- Inline critical CSS -->
<style>
  body { margin: 0; font-family: 'Inter', sans-serif; }
  .hero { min-height: 50vh; display: flex; align-items: center; }
</style>

<!-- Defer non-critical CSS -->
<link rel="preload" href="/styles/non-critical.css" as="style"
  onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles/non-critical.css"></noscript>
```

---

## 3. INP (Interaction to Next Paint) Audit

### 3.1 INP Checklist

```text
- [ ] Identifica slow interactions
  - Usa Chrome DevTools > Performance > Interactions
  - Busca interactions > 200ms
  - Common slow interactions: button clicks, form inputs, menu toggles

- [ ] Reducee JavaScript execution time
  - Breakea long tasks con setTimeout o scheduler.yield()
  - Usa requestIdleCallback para non-urgent work
  - Debouncea/throttlea event handlers
  - Movee heavy computation a Web Workers

- [ ] Optimiza event handlers
  - Usa passive event listeners: addEventListener('scroll', handler, { passive: true })
  - Evita synchronous layout reads (offsetWidth, getBoundingClientRect) en handlers
  - Batchea DOM updates con requestAnimationFrame
  - Usa event delegation en vez de per-element listeners

- [ ] Reducee main thread blocking
  - Code split por route
  - Lazy loadea heavy components
  - Defere analytics y third-party scripts
  - Usa Partytown para third-party JS en Web Worker

- [ ] Optimiza rendering
  - Usa CSS transform y opacity para animations (GPU-accelerated)
  - Evita animar layout properties (width, height, top, left)
  - Usa content-visibility: auto para off-screen content
  - Reducee DOM size (< 1500 nodes)
```

### 3.2 INP Code Fixes

```javascript
// Breakea long tasks con scheduler.yield()
async function processItems(items) {
  for (const item of items) {
    processItem(item);
    if ('scheduler' in window && 'yield' in scheduler) {
      await scheduler.yield();
    } else {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// Debounce input handler
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

searchInput.addEventListener('input', debounce(handleSearch, 150));

// Passive event listener
document.addEventListener('scroll', handleScroll, { passive: true });

// Batchea DOM updates con requestAnimationFrame
function updateList(items) {
  requestAnimationFrame(() => {
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      fragment.appendChild(li);
    }
    listElement.innerHTML = '';
    listElement.appendChild(fragment);
  });
}

// Movee heavy computation a Web Worker
const worker = new Worker('/js/search-worker.js');
worker.postMessage({ query: 'test' });
worker.onmessage = (e) => {
  renderResults(e.data.results);
};
```

---

## 4. CLS (Cumulative Layout Shift) Audit

### 4.1 CLS Checklist

```text
- [ ] Reservea space para images y embeds
  - Setea width y height attributes en all images
  - Usa aspect-ratio CSS para responsive images
  - Reservea space para ads y embeds con min-height

- [ ] Stabiliza font loading
  - Usa font-display: swap (causa slight shift)
  - Usa font-display: optional (no shift si font loads slow)
  - Preloadea fonts para reducear swap window
  - Matchea fallback font metrics a web font

- [ ] Evita injectar content above existing content
  - Banners y notifications deberian pushear content down, no overlay
  - Usa min-height para dynamic content containers
  - Loadea ads en reserved slots, no dynamically inserted

- [ ] Evita animations que shiftean layout
  - Usa transform: translateX/Y para slide animations
  - Usa opacity para fade animations
  - No animes width, height, margin, o padding

- [ ] Handlea dynamic content gracefully
  - Skeleton screens para loading states
  - min-height en card containers
  - Reservea space para third-party widgets
```

### 4.2 CLS Code Fixes

```html
<!-- Reservea space para images con aspect-ratio -->
<img
  src="/images/product.webp"
  width="800"
  height="600"
  style="aspect-ratio: 4 / 3;"
  alt="Product image"
/>

<!-- Reservea space para ads -->
<div class="ad-slot" style="min-height: 250px;">
  <!-- Ad loads here -->
</div>

<!-- Skeleton screen para loading state -->
<div class="card-skeleton" style="min-height: 200px;">
  <div class="skeleton-line"></div>
  <div class="skeleton-line"></div>
  <div class="skeleton-line"></div>
</div>
```

```css
/* Font fallback metrics matching */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
}

body {
  font-family: 'Inter', 'Inter Fallback', sans-serif;
}

/* content-visibility para off-screen content */
.long-article-section {
  content-visibility: auto;
  contain-intrinsic-size: 500px;
}
```

---

## 5. Field Data vs Lab Data

### 5.1 Data Source Comparison

```text
Source         | Type   | Users          | Environment     | Use Case
───────────────┼────────┼────────────────┼─────────────────┼──────────────────────
CrUX           | Field  | Real Chrome    | Real devices    | Track P75 over time
PageSpeed      | Both   | Lab + CrUX     | Simulated       | Quick check
Lighthouse CI  | Lab    | None           | Simulated       | CI/CD regression
RUM (custom)   | Field  | All browsers   | Real devices    | Cross-browser data
Search Console | Field  | Real Chrome    | Real devices    | URL-level reporting
WebPageTest    | Lab    | None           | Configurable    | Deep waterfall analysis
```

### 5.2 Reconciliation Process

```text
1. Collecta field data (CrUX, RUM) para la page por 28 days
2. Collecta lab data (Lighthouse) para el same page
3. Compara metrics:
   - Si field LCP > lab LCP: users en slower devices/networks
   - Si field INP > lab INP: users interactuando mas que el test script
   - Si field CLS > lab CLS: dynamic content no capturado en lab
4. Investiga discrepancies:
   - Checkea device distribution en CrUX (mobile vs desktop)
   - Checkea connection types (4G, 3G, WiFi)
   - Checkea page variations (A/B tests, personalization)
5. Prioritiza fixes basado en field data (real user impact)
6. Verifica fixes con lab data (reproducible testing)
7. Monitora field data despues de deployment para confirmar improvement
```

---

## 6. Remediation Tracking

### 6.1 Issue Tracker Template

```text
ID  | Page       | Metric | Current | Target | Issue                    | Status    | Owner
────┼────────────┼────────┼─────────┼────────┼──────────────────────────┼───────────┼──────────
001 | /          | LCP    | 3.2s    | 2.5s   | Hero image not preloaded | Fixed     | Alice
002 | /          | CLS    | 0.15    | 0.1    | Font swap causing shift  | In progress| Bob
003 | /products  | INP    | 280ms   | 200ms  | Search handler blocking  | Open      | Carol
004 | /checkout  | LCP    | 2.8s    | 2.5s   | Render-blocking CSS      | Fixed     | Alice
005 | /blog/*    | CLS    | 0.12    | 0.1    | Image dimensions missing | Open      | Dan
```

### 6.2 Audit Report Template

```markdown
## Core Web Vitals Audit Report — {Page URL}

**Date:** 2026-07-04
**Auditor:** {Name}
**Page type:** {Homepage/Product/Article/etc}

### Field Data (CrUX, 28-day window)

| Metric | P75 | Rating | Trend |
|--------|-----|--------|-------|
| LCP    | 3.2s| Poor   | Worsening |
| INP    | 180ms| Good  | Stable |
| CLS    | 0.15| Needs improvement | Stable |

### Lab Data (Lighthouse)

| Metric | Value | Score |
|--------|-------|-------|
| LCP    | 2.9s  | 45    |
| INP    | 150ms | 90    |
| CLS    | 0.12  | 80    |
| TBT    | 300ms | 70    |

### Findings

1. LCP element: Hero image (1.2MB, not preloaded)
2. Render-blocking: 3 CSS files, 2 JS files
3. CLS source: Font swap on header text
4. INP: Search input handler takes 280ms

### Remediation Plan

1. Preload hero image and convert to WebP — Owner: Alice, Due: 2026-07-06
2. Inline critical CSS, defer rest — Owner: Alice, Due: 2026-07-06
3. Preload font, use font-display: optional — Owner: Bob, Due: 2026-07-08
4. Debounce search handler — Owner: Carol, Due: 2026-07-08

### Expected Impact

- LCP: 3.2s → 2.3s (preloading + WebP)
- CLS: 0.15 → 0.05 (font fix)
- INP: 180ms → 150ms (debounce)
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre field data y lab data?

Field data viene de real users visitando tu site en su actual browser, device y network conditions. El CrUX report de Google agrega field data desde Chrome users. Lab data viene de simulated tests en un controlled environment (Lighthouse, WebPageTest). Field data muestra que real users experimentan, pero esta delayed (28-day window) y no puede testear changes antes de deployment. Lab data es immediate y reproducible, pero puede no reflectar real user conditions. Usa field data para identifyear problems y medir long-term trends. Usa lab data para diagnosear root causes y verifyear fixes. Siempre checkea both — una page puede pasar lab tests pero failear en el field si real users tienen slower devices o worse network conditions que el lab simulation.

### ¿Cómo encuentro cual element es el LCP element?

Abre Chrome DevTools, ve al Performance panel, y graba un page load. En el timeline, busca el "LCP" marker — muestra cual element triggereo el Largest Contentful Paint. Alternativamente, usa Lighthouse — el "Largest Contentful Paint element" audit lista el LCP element. Tambien puedes usar el `web-vitals` library en production para loggear el LCP element a tu analytics. Common LCP elements son hero images, large headings, o video posters. Una vez que sabes el LCP element, optimiza su loading path first — preloadealo, sirvelo en un modern format, y asegurate que no este blocked por render-blocking resources.

### ¿Por que mi INP es high aunque mi page loadsea fast?

INP mide interaction responsiveness, no load speed. Una page puede loadesar quickly pero responser slowly a user input si JavaScript blockea el main thread cuando el user clicksea o typsea. Common causes: long event handlers, synchronous DOM reads triggereando layout reflow, heavy third-party scripts corriendo en el main thread, o large JavaScript bundles que toman time para parsear y execute. Para fixear high INP, identifica cuales interactions son slow usando Chrome DevTools Interactions panel, breakea long tasks con `scheduler.yield()` o `setTimeout`, debouncea input handlers, movee heavy computation a Web Workers, y defere non-critical JavaScript. INP reemplazo FID (First Input Delay) en March 2024 — mide all interactions, no solo el first one.

### ¿Cómo fixeo CLS causado por images?

Setea explicit `width` y `height` attributes en all `<img>` elements. El browser usa estos para calculatear el aspect ratio y reservear space antes que el image loadee. Para responsive images, usa el `aspect-ratio` CSS property como fallback. Para dynamically loaded images (user-generated content, product images), usa un container con `min-height` o `aspect-ratio` para reservear space. Para background images, setea `min-height` en el container. Para lazy-loaded images, el same rules aplican — el browser needea saber el dimensions antes que el image loadee. Si images se loadsean via JavaScript, setea el dimensions en el placeholder o skeleton element. Audita tu site con Lighthouse — el "Cumulative Layout Shift" audit lista cada element que contribuye a CLS.

### ¿Qué tan seguido deberia auditar Core Web Vitals?

Corre un full audit quarterly para all page types. Monitora field data continuously via CrUX o RUM — setea up alerts para cuando P75 metrics crosseen thresholds. Corre Lighthouse CI en every PR para catchear regressions antes de deployment. Despues de major changes (new features, architecture changes, third-party additions), corre un targeted audit en affected pages. Antes de major traffic events (product launches, marketing campaigns), audita el pages que recibiran traffic. Trackea audit results over time en un spreadsheet o dashboard para ver trends. Si metrics estan stable, reduce audit frequency. Si metrics estan volatile o worsening, increasea frequency.

## See Also

- [Complete Guide to Web Performance and Core Web Vitals](/es/guides/complete-guide-web-performance-core-web-vitals/)
- [Performance Budget Template](/es/docs/performance-budget-template/)
- [Feature Flags: Progressive Release and Safe Experimentation](/es/guides/feature-flags-guide/)
- [Complete Guide to Bundle Size Optimization](/es/guides/complete-guide-bundle-size-optimization/)
- [Complete Guide to React 19 Features](/es/guides/complete-guide-react-19-features/)

