---
contentType: docs
slug: core-web-vitals-audit-checklist
templateType: guideline
title: "Core Web Vitals Audit Checklist"
description: "Checklist for auditing Core Web Vitals per page: LCP optimization steps, INP interaction tuning, CLS layout stability fixes, field data vs lab data analysis, CrUX integration, and remediation tracking with code examples for images, fonts, JavaScript, and CSS."
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
  - /docs/performance/performance-budget-template
  - /docs/performance/database-query-tuning-checklist
  - /docs/performance/load-test-plan-template
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

This checklist guides a per-page Core Web Vitals audit. It covers LCP optimization, INP interaction tuning, CLS layout stability fixes, field data vs lab data analysis, CrUX integration, and remediation tracking. Use this checklist when auditing an existing site or before launching a new page type.

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
web-vitals library      | RUM collection in production      | Free
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
- [ ] Identify the LCP element on the page
  - Open Chrome DevTools > Performance > Insights
  - Look for the "LCP" marker in the timeline
  - Common LCP elements: hero image, hero text, video poster

- [ ] Optimize LCP element loading
  - Preload the LCP image: <link rel="preload" as="image" href="hero.webp">
  - Use fetchpriority="high" on the LCP image
  - Serve responsive images with srcset
  - Use modern formats (WebP, AVIF)

- [ ] Optimize TTFB (affects LCP)
  - Use CDN for static assets
  - Cache HTML at the edge
  - Optimize server response time (< 600ms)
  - Use SSR or SSG where possible

- [ ] Eliminate render-blocking resources
  - Inline critical CSS
  - Defer non-critical CSS: <link rel="preload" ... onload="this.rel='stylesheet'">
  - Defer non-critical JS: <script defer> or <script type="module">
  - Remove unused CSS with PurgeCSS or UnCSS

- [ ] Optimize font loading
  - Preload primary font: <link rel="preload" as="font" type="font/woff2" href="font.woff2" crossorigin>
  - Use font-display: swap
  | - Self-host fonts instead of Google Fonts CDN
  | - Subset fonts to reduce file size
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
  /* Above-the-fold critical styles only */
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
- [ ] Identify slow interactions
  - Use Chrome DevTools > Performance > Interactions
  - Look for interactions > 200ms
  - Common slow interactions: button clicks, form inputs, menu toggles

- [ ] Reduce JavaScript execution time
  - Break long tasks with setTimeout or scheduler.yield()
  - Use requestIdleCallback for non-urgent work
  - Debounce/throttle event handlers
  - Move heavy computation to Web Workers

- [ ] Optimize event handlers
  - Use passive event listeners: addEventListener('scroll', handler, { passive: true })
  - Avoid synchronous layout reads (offsetWidth, getBoundingClientRect) in handlers
  - Batch DOM updates with requestAnimationFrame
  - Use event delegation instead of per-element listeners

- [ ] Reduce main thread blocking
  - Code split by route
  - Lazy load heavy components
  | - Defer analytics and third-party scripts
  | - Use Partytown for third-party JS in Web Worker

- [ ] Optimize rendering
  - Use CSS transform and opacity for animations (GPU-accelerated)
  - Avoid animating layout properties (width, height, top, left)
  - Use content-visibility: auto for off-screen content
  - Reduce DOM size (< 1500 nodes)
```

### 3.2 INP Code Fixes

```javascript
// Break long tasks with scheduler.yield()
async function processItems(items) {
  for (const item of items) {
    processItem(item);
    // Yield to main thread periodically
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

// Batch DOM updates with requestAnimationFrame
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

// Move heavy computation to Web Worker
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
- [ ] Reserve space for images and embeds
  - Set width and height attributes on all images
  - Use aspect-ratio CSS for responsive images
  - Reserve space for ads and embeds with min-height

- [ ] Stabilize font loading
  - Use font-display: swap (causes slight shift)
  - Use font-display: optional (no shift if font loads slow)
  - Preload fonts to reduce swap window
  - Match fallback font metrics to web font

- [ ] Avoid injecting content above existing content
  - Banners and notifications should push content down, not overlay
  - Use min-height for dynamic content containers
  - Load ads in reserved slots, not dynamically inserted

- [ ] Avoid animations that shift layout
  - Use transform: translateX/Y for slide animations
  - Use opacity for fade animations
  - Do not animate width, height, margin, or padding

- [ ] Handle dynamic content gracefully
  - Skeleton screens for loading states
  - min-height on card containers
  - Reserve space for third-party widgets
```

### 4.2 CLS Code Fixes

```html
<!-- Reserve space for images with aspect-ratio -->
<img
  src="/images/product.webp"
  width="800"
  height="600"
  style="aspect-ratio: 4 / 3;"
  alt="Product image"
/>

<!-- Reserve space for ads -->
<div class="ad-slot" style="min-height: 250px;">
  <!-- Ad loads here -->
</div>

<!-- Skeleton screen for loading state -->
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

/* content-visibility for off-screen content */
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
1. Collect field data (CrUX, RUM) for the page over 28 days
2. Collect lab data (Lighthouse) for the same page
3. Compare metrics:
   - If field LCP > lab LCP: users on slower devices/networks
   - If field INP > lab INP: users interacting more than test script
   - If field CLS > lab CLS: dynamic content not captured in lab
4. Investigate discrepancies:
   - Check device distribution in CrUX (mobile vs desktop)
   - Check connection types (4G, 3G, WiFi)
   - Check page variations (A/B tests, personalization)
5. Prioritize fixes based on field data (real user impact)
6. Verify fixes with lab data (reproducible testing)
7. Monitor field data after deployment to confirm improvement
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

## FAQ

### What is the difference between field data and lab data?

Field data comes from real users visiting your site in their actual browser, device, and network conditions. Google's CrUX report aggregates field data from Chrome users. Lab data comes from simulated tests in a controlled environment (Lighthouse, WebPageTest). Field data shows what real users experience, but is delayed (28-day window) and cannot test changes before deployment. Lab data is immediate and reproducible, but may not reflect real user conditions. Use field data to identify problems and measure long-term trends. Use lab data to diagnose root causes and verify fixes. Always check both — a page can pass lab tests but fail in the field if real users have slower devices or worse network conditions than the lab simulation.

### How do I find which element is the LCP element?

Open Chrome DevTools, go to the Performance panel, and record a page load. In the timeline, look for the "LCP" marker — it shows which element triggered the Largest Contentful Paint. Alternatively, use Lighthouse — the "Largest Contentful Paint element" audit lists the LCP element. You can also use the `web-vitals` library in production to log the LCP element to your analytics. Common LCP elements are hero images, large headings, or video posters. Once you know the LCP element, optimize its loading path first — preload it, serve it in a modern format, and ensure it is not blocked by render-blocking resources.

### Why is my INP high even though my page loads fast?

INP measures interaction responsiveness, not load speed. A page can load quickly but respond slowly to user input if JavaScript blocks the main thread when the user clicks or types. Common causes: long event handlers, synchronous DOM reads triggering layout reflow, heavy third-party scripts running on the main thread, or large JavaScript bundles that take time to parse and execute. To fix high INP, identify which interactions are slow using Chrome DevTools Interactions panel, break long tasks with `scheduler.yield()` or `setTimeout`, debounce input handlers, move heavy computation to Web Workers, and defer non-critical JavaScript. INP replaced FID (First Input Delay) in March 2024 — it measures all interactions, not just the first one.

### How do I fix CLS caused by images?

Set explicit `width` and `height` attributes on all `<img>` elements. The browser uses these to calculate the aspect ratio and reserve space before the image loads. For responsive images, use the `aspect-ratio` CSS property as a fallback. For dynamically loaded images (user-generated content, product images), use a container with `min-height` or `aspect-ratio` to reserve space. For background images, set `min-height` on the container. For lazy-loaded images, the same rules apply — the browser needs to know the dimensions before the image loads. If images are loaded via JavaScript, set the dimensions on the placeholder or skeleton element. Audit your site with Lighthouse — the "Cumulative Layout Shift" audit lists each element that contributes to CLS.

### How often should I audit Core Web Vitals?

Run a full audit quarterly for all page types. Monitor field data continuously via CrUX or RUM — set up alerts for when P75 metrics cross thresholds. Run Lighthouse CI on every PR to catch regressions before deployment. After major changes (new features, architecture changes, third-party additions), run a targeted audit on affected pages. Before major traffic events (product launches, marketing campaigns), audit the pages that will receive traffic. Track audit results over time in a spreadsheet or dashboard to see trends. If metrics are stable, reduce audit frequency. If metrics are volatile or worsening, increase frequency.
