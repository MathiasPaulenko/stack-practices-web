---




contentType: guides
slug: performance-optimization-guide
title: "Web Performance Optimization Guide"
description: "A thorough guide to optimizing web application performance for better Core Web Vitals and user experience."
metaDescription: "Learn web performance optimization: image compression, lazy loading, caching strategies, bundle splitting, and Core Web Vitals improvement techniques."
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
  - /recipes/caching-strategies
  - /docs/load-test-execution-plan-template
  - /recipes/redis-cache-patterns
  - /recipes/bash-log-rotation
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn web performance optimization: image compression, lazy loading, caching strategies, bundle splitting, and Core Web Vitals improvement techniques."
  keywords:
    - web performance
    - core web vitals
    - page speed
    - caching
    - lazy loading
    - image optimization




---

## Introduction

Performance is a key factor. Slow sites lose users, revenue, and search rankings. This guide walks through practical techniques to improve Core Web Vitals and deliver fast experiences.

## Core Web Vitals

Google measures three metrics for page experience:

| Metric | Target | Measures |
|--------|--------|----------|
| **LCP** | < 2.5s | Largest Contentful Paint — main content load speed |
| **INP** | < 200ms | Interaction to Next Paint — responsiveness |
| **CLS** | < 0.1 | Cumulative Layout Shift — visual stability |

### How to Measure

- **Lighthouse**: Built into Chrome DevTools
- **PageSpeed Insights**: Online tool with field data
- **Web Vitals Extension**: Chrome extension for real-time monitoring
- **CrUX Dashboard**: Chrome User Experience Report for real-world data

## Image Optimization

Images are often the largest asset on a page.

### Modern Formats

| Format | Use Case | Savings |
|--------|----------|---------|
| **WebP** | General replacement for JPEG/PNG | 25-35% |
| **AVIF** | Maximum compression | 50% vs JPEG |
| **SVG** | Icons, logos, simple graphics | Scalable, tiny |

### Implementation

```html
<!-- Responsive images with modern formats -->
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" loading="lazy" width="800" height="600">
</picture>
```

### Lazy Loading

```html
<!-- Native lazy loading -->
<img src="photo.jpg" loading="lazy" alt="...">

<!-- Intersection Observer for custom behavior -->
<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  });
  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
</script>
```

## Caching Strategies

Proper caching eliminates redundant network requests.

### HTTP Cache Headers

```nginx
# Nginx example
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

| Strategy | Use Case | Header |
|----------|----------|--------|
| **Immutable** | Versioned assets (hashed filenames) | `Cache-Control: public, max-age=31536000, immutable` |
| **Revalidate** | HTML pages that may update | `Cache-Control: max-age=0, must-revalidate` |
| **Stale-while-revalidate** | API responses | `Cache-Control: max-age=3600, stale-while-revalidate=86400` |

### Service Worker Caching

```javascript
// Workbox example
workbox.routing.registerRoute(
  ({request}) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);
```

## JavaScript Optimization

### Bundle Splitting

```javascript
// Vite / Webpack: dynamic imports for routes
const HomePage = () => import('./pages/HomePage.js');
const Dashboard = () => import('./pages/Dashboard.js');

// Prefetch on hover
const link = document.createElement('link');
link.rel = 'prefetch';
link.href = '/dashboard.js';
```

### Code Splitting Strategies

| Strategy | When to Use |
|----------|-------------|
| **Route-based** | Each page gets its own bundle |
| **Component-based** | Heavy components load on demand |
| **Library-based** | Common vendors in a separate chunk |

## CSS Optimization

```css
/* Critical CSS inlined in <head> */
<style>
  /* Above-the-fold styles only */
  .header { ... }
  .hero { ... }
</style>

<!-- Non-critical CSS loaded asynchronously -->
<link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'">
```

## Server-Side Optimizations

### Compression

```nginx
# Enable gzip
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# Or use Brotli (better compression)
brotli on;
brotli_types text/plain text/css application/json application/javascript;
```

### CDN Usage

- Serve static assets from [edge locations](/recipes/performance/cdn-edge-caching)
- Use HTTP/2 or HTTP/3 for multiplexing
- Enable automatic image optimization (Cloudflare, Cloudinary)

## What Works

- **Set explicit width/height** on images to prevent CLS
- **Defer non-critical JavaScript** with `defer` or `async`
- **Preload critical resources**: fonts, hero images, main CSS. See [lazy loading](/recipes/performance/lazy-loading).
- **Use resource hints**: `dns-prefetch`, `preconnect`, `prefetch`
- **Measure before optimizing**: Profile with DevTools first

## Common Mistakes

- [Premature optimization](/guides/performance/performance-optimization-guide) without measurement
- Over-caching API responses that change frequently
- Loading all images eagerly on long pages
- Not [compressing API responses](/recipes/performance/brotli-nginx-compression) (JSON)

## Frequently Asked Questions

### What is the most useful performance optimization for web apps?

Image optimization typically delivers the biggest impact. Converting to WebP/AVIF, using responsive images, and lazy loading below-the-fold images often reduces page weight by 50% or more.

### Should I use a CDN for static assets?

Yes. A CDN reduces latency by serving assets from edge locations near your users. It also offloads traffic from your origin server and provides built-in compression and HTTP/2 support.

### How do I improve Core Web Vitals quickly?

For LCP: optimize your largest content element (usually a hero image). For CLS: always set width/height on images and iframes. For INP: break up long JavaScript tasks and defer non-critical scripts.



## Advanced Topics

### Scenario: Web App Optimization for E-commerce

```text
System: E-commerce, 3s LCP, 0.3s INP, 0.25 CLS
Goal: LCP < 1.5s, INP < 0.2s, CLS < 0.1

Phase 1: Diagnosis (Lighthouse + WebPageTest)
  | Metric | Before | Target | Tool |
  |--------|--------|--------|------|
  | LCP | 3.2s | < 1.5s | Lighthouse |
  | INP | 320ms | < 200ms | WebPageTest |
  | CLS | 0.25 | < 0.1 | Lighthouse |
  | TTFB | 800ms | < 200ms | curl |
  | Total weight | 3.2MB | < 1MB | DevTools |
  | JS bundle | 850KB | < 200KB | webpack-bundle-analyzer |

Phase 2: Image optimization (biggest impact)
  - Convert JPG/PNG to WebP (50% reduction)
  - Convert hero to AVIF (70% reduction)
  - Responsive images: srcset + sizes
  - Lazy loading: loading="lazy" on below-the-fold
  - Width/height on all images (prevent CLS)
  - Result: LCP 3.2s -> 1.8s, weight 3.2MB -> 1.8MB

Phase 3: JavaScript optimization
  - Code splitting: route-based lazy loading
  - Tree shaking: remove unused imports
  - Defer non-critical scripts: defer + async
  - Replace heavy libraries:
    moment.js -> date-fns (280KB -> 13KB)
    lodash -> lodash-es + tree shaking
  - Result: JS bundle 850KB -> 180KB, INP 320ms -> 180ms

Phase 4: Network optimization
  - CDN for static assets (CloudFront)
  - HTTP/2 or HTTP/3 (multiplexing)
  - Brotli compression (better than gzip)
  - Cache-Control: max-age=31536000 for hashed assets
  - Service Worker for offline cache
  - Result: TTFB 800ms -> 180ms

Phase 5: CSS optimization
  - Critical CSS inline (above-the-fold)
  - Async load the rest: media="print" onload
  - PurgeCSS to remove unused styles
  - Result: CLS 0.25 -> 0.05

Phase 6: Final results
  | Metric | Before | After | Target |
  |--------|--------|-------|--------|
  | LCP | 3.2s | 1.3s | < 1.5s |
  | INP | 320ms | 165ms | < 200ms |
  | CLS | 0.25 | 0.05 | < 0.1 |
  | TTFB | 800ms | 180ms | < 200ms |
  | Weight | 3.2MB | 0.9MB | < 1MB |
  | JS bundle | 850KB | 180KB | < 200KB |

Lessons:
  - Image optimization is the fastest win
  - Code splitting reduces bundle and improves INP
  - CDN + HTTP/2 reduces TTFB dramatically
  - Critical CSS inline improves LCP and CLS
  - Measure before and after: no data, no optimization
```

### How do I prioritize performance optimizations?

Start with LCP: it is the metric that most affects UX. Optimize the largest element (usually a hero image). Then CLS: fix width/height on images and iframes. Finally INP: break up long JS tasks and defer scripts. Use Lighthouse to identify opportunities by estimated impact. An optimization that reduces 1s of LCP is worth more than one that reduces 50ms of TTFB.


End of document. Review and update quarterly.