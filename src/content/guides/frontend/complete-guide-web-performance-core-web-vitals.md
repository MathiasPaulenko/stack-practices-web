---
contentType: guides
slug: complete-guide-web-performance-core-web-vitals
title: "Complete Guide to Web Performance and Core Web Vitals"
description: "Optimize Core Web Vitals. Covers LCP, INP, CLS measurement and improvement, image optimization, font loading, render-blocking resources, lazy loading, caching strategies, and performance monitoring with practical code examples."
metaDescription: "Optimize Core Web Vitals. Covers LCP, INP, CLS measurement, image optimization, font loading, render-blocking, lazy loading, caching, monitoring."
difficulty: advanced
topics:
  - frontend
  - performance
tags:
  - performance
  - frontend
  - guide
  - core-web-vitals
  - lcp
  - inp
  - cls
  - web-vitals
relatedResources:
  - /guides/frontend/complete-guide-bundle-size-optimization
  - /guides/frontend/complete-guide-react-19-features
  - /guides/frontend/complete-guide-css-grid-and-flexbox
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

## Introduction

Core Web Vitals are Google's metrics for measuring real user experience. LCP measures loading speed, INP measures interactivity, and CLS measures visual stability. Below is a practical guide to how to measure, diagnose, and optimize each metric with practical code examples.

## Core Web Vitals Overview

```text
Core Web Vitals (2024):

LCP (Largest Contentful Paint):
  - Measures loading speed of the largest element
  - Good: < 2.5s | Needs improvement: 2.5-4s | Poor: > 4s
  - Usually an image, hero banner, or large text block

INP (Interaction to Next Paint):
  - Replaced FID in March 2024
  - Measures responsiveness to user input (click, keypress, tap)
  - Good: < 200ms | Needs improvement: 200-500ms | Poor: > 500ms
  - Measures the worst interaction in a session

CLS (Cumulative Layout Shift):
  - Measures visual stability
  - Good: < 0.1 | Needs improvement: 0.1-0.25 | Poor: > 0.25
  - Caused by images without dimensions, fonts, ads, dynamic content

Other metrics:
  - FCP (First Contentful Paint): < 1.8s
  - TTFB (Time to First Byte): < 800ms
  - TBT (Total Blocking Time): < 200ms (lab data only)
```

## Measuring Core Web Vitals

### Using web-vitals Library

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
  
  // Use sendBeacon for reliability on page unload
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
// API endpoint to collect vitals
export async function POST(request) {
  const vitals = await request.json();
  
  // Store in your analytics backend
  await db.webVitals.insert({
    ...vitals,
    url: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    timestamp: new Date(),
  });
  
  return new Response("ok", { status: 200 });
}
```

### Using Performance Observer API

```javascript
// Measure LCP directly
const lcpObserver = new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log("LCP:", lastEntry.startTime, lastEntry.element);
});
lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

// Measure CLS
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

// Measure INP
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

<!-- Responsive images with srcset -->
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

<!-- font-display: swap to avoid invisible text -->
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
  /* Above-the-fold CSS here */
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
// Use a CDN
// Enable HTTP/2 or HTTP/3
// Use edge rendering where possible

// Cache headers for static assets
const cacheHeaders = {
  "/assets/*": "public, max-age=31536000, immutable",
  "/_next/image/*": "public, max-age=86400, stale-while-revalidate=604800",
  "/api/*": "no-store",
};

// Next.js example: edge runtime for faster TTFB
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

// Good: yield to main thread
async function processItems(items) {
  for (const item of items) {
    doExpensiveWork(item);
    
    // Yield to main thread every 5ms
    if (performance.now() % 5 < 1) {
      await scheduler.yield();
    }
  }
}

// Using requestIdleCallback for non-urgent work
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

### Debounce and Throttle

```javascript
// Debounce: delay until input stops
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Throttle: limit rate of execution
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

// Usage
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

### Reserve Space for Images and Ads

```css
/* Bad: no dimensions causes layout shift */
img {
  max-width: 100%;
  height: auto;
}

/* Good: aspect-ratio reserves space */
img {
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
}

/* Reserve space for ad slots */
.ad-slot {
  min-height: 250px;
  width: 100%;
}

/* Reserve space for embeds */
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

### Font Loading to Prevent CLS

```css
/* Use font-display: optional to prevent FOUT/FOIT layout shifts */
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter.woff2") format("woff2");
  font-display: optional;  /* Browser uses fallback if font not loaded in time */
}

/* Size-adjust fallback fonts to match custom font metrics */
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
// Bad: inserting content pushes existing elements down
function loadMore() {
  const newContent = document.createElement("div");
  newContent.innerHTML = "New content";
  document.body.insertBefore(newContent, document.getElementById("existing"));
}

// Good: reserve space or use transform
function loadMore() {
  const placeholder = document.getElementById("placeholder");
  placeholder.style.transform = "translateY(0)";  // Use transform, not layout
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
  // Cache-first for static assets
  if (event.request.url.includes("/assets/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached || fetch(event.request)
      )
    );
    return;
  }
  
  // Stale-while-revalidate for API calls
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
  
  // Network-first for pages
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

## FAQ

### What is the difference between lab data and field data?

Lab data is collected in a controlled environment (Lighthouse, WebPageTest) with simulated device and network conditions. It is consistent and reproducible but does not reflect real user experience. Field data (CrUX, RUM) is collected from real users with their actual devices and network conditions. It reflects reality but is noisy and has less detail. Use lab data for debugging and regression testing, field data for tracking real user experience.

### How do I find what is causing high INP?

Use the Performance panel in Chrome DevTools. Record a trace while interacting with the page. Look for long tasks (yellow blocks) in the main thread. The Interaction tab shows which interactions are slow. Use `PerformanceObserver` with `type: "interaction"` to log slow interactions in production. Common causes: expensive event handlers, synchronous layout reads (forced reflow), large DOM updates, and third-party scripts.

### What is the most effective way to improve LCP?

Identify your LCP element using Chrome DevTools or the `web-vitals` library. Common LCP elements are hero images, large text blocks, or video posters. Optimize the LCP element first: preload it, use modern formats (WebP/AVIF), set width and height, and use `fetchpriority="high"`. Then reduce TTFB with a CDN, edge rendering, and caching. Finally, eliminate render-blocking CSS and JavaScript that delay the LCP element from painting.

### How do I prevent layout shifts from images?

Always specify `width` and `height` attributes on images. The browser uses these to reserve space before the image loads. Alternatively, use CSS `aspect-ratio` to reserve space. For responsive images, use `srcset` with corresponding `sizes` and set `aspect-ratio` in CSS. For dynamically loaded images, render a placeholder with the correct dimensions before the image loads. For ads, reserve a fixed-size slot that does not collapse when empty.

### Should I use server-side rendering for better Core Web Vitals?

SSR improves FCP and LCP because the browser receives HTML immediately without waiting for JavaScript to download and execute. However, SSR can increase TTFB if the server is slow. Use streaming SSR to send HTML in chunks — the browser can render the first chunk while the server prepares the rest. For content-heavy pages, SSR or SSG is recommended. For interactive apps where LCP is text-based, client-side rendering with proper loading states may be sufficient.

### How do third-party scripts affect Core Web Vitals?

Third-party scripts (analytics, ads, chat widgets, A/B testing) can block the main thread, delay LCP, cause CLS, and increase INP. Audit third-party scripts with the Coverage tab in DevTools. Load non-critical scripts with `async` or `defer`. Use the `loading="lazy"` attribute for iframes. Consider server-side analytics instead of client-side. Use a consent management platform that loads scripts only after consent. Set up a Content Security Policy to control which third-party domains can execute scripts.
