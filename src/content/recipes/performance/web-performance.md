---
contentType: recipes
slug: web-performance
title: "Web Performance Optimization"
description: "Improve Core Web Vitals, reduce bundle sizes, and optimize frontend performance with lazy loading, code splitting, and modern build tools."
metaDescription: "Web performance optimization guide: Core Web Vitals, lazy loading, code splitting, bundle analysis, image optimization, and modern build tools for faster websites."
difficulty: intermediate
topics:
  - performance
tags:
  - web-performance
  - performance
  - frontend
  - core-web-vitals
relatedResources:
  - /guides/performance-optimization-guide
  - /recipes/spa-code-splitting-lazy
  - /docs/capacity-planning-template
  - /guides/system-design-interview-guide
  - /guides/sql-performance-tuning-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Web performance optimization guide: Core Web Vitals, lazy loading, code splitting, bundle analysis, image optimization, and modern build tools for faster websites."
  keywords:
    - web-performance
    - performance
    - frontend
    - core-web-vitals
---
## Overview

Web performance directly impacts user engagement, conversion rates, and search rankings. Google's Core Web Vitals — Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS) — provide measurable targets. This resource covers practical techniques: lazy loading, code splitting, image optimization, critical CSS, and modern build tooling to hit sub-3-second page loads.

## When to Use

Use this resource when:
- Core Web Vitals scores are failing (LCP > 2.5s, CLS > 0.1)
- Mobile users on 3G networks abandon pages before they load
- Bundle sizes exceed 200KB and impact time-to-interactive
- Third-party scripts (analytics, ads) block the main thread

## Solution

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

### Lazy Loading Images with Native API

```html
<!-- Native lazy loading — no JavaScript required -->
<img src="hero.webp" alt="Hero" fetchpriority="high" width="800" height="400">
<img src="below-fold-1.webp" alt="Product" loading="lazy" width="400" height="300">
<img src="below-fold-2.webp" alt="Team" loading="lazy" width="400" height="300">
```

### Code Splitting with Dynamic Imports (React)

```tsx
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

function Dashboard() {
  return (
    <div>
      <CriticalStats /> {/* Always loaded */}
      <Suspense fallback={<Spinner />}>
        <HeavyChart /> {/* Loaded on demand */}
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <AnalyticsDashboard /> {/* Separate chunk */}
      </Suspense>
    </div>
  );
}
```

## Explanation

**Core Web Vitals targets**:

| Metric | Good | Poor | Measures |
|--------|------|------|----------|
| LCP | < 2.5s | > 4s | Largest visible element load time |
| INP | < 200ms | > 500ms | Interaction responsiveness |
| CLS | < 0.1 | > 0.25 | Visual stability (layout shifts) |
| TTFB | < 600ms | > 1.8s | Time to first byte |

**Performance budget example**:
- JavaScript: 150KB (gzipped)
- Images: 250KB total
- CSS: 50KB (including critical inline)
- Fonts: 40KB (subsetted)
- Third-party: 100KB max

## Variants

| Technique | Impact | Effort |
|-----------|--------|--------|
| Image optimization (WebP/AVIF) | -50% image bytes | Low |
| Font subsetting | -80% font bytes | Low |
| Code splitting | -60% initial JS | Medium |
| Edge caching | -90% TTFB | Low |
| Service Worker | Instant repeat visits | Medium |
| HTTP/3 + QUIC | Faster on lossy networks | Low (CDN) |

## Best Practices

- **Measure real users, not lab tests**: Field data from Chrome UX Report reflects actual conditions
- **Optimize the critical path**: Anything blocking `<head>` should be under 50KB total
- **Self-host fonts and analytics**: Third-party connections add DNS + TLS + TCP overhead
- **Use `content-visibility: auto`**: Browsers skip rendering off-screen content
- **Defer non-critical JavaScript**: `defer` or `type="module"` for scripts that aren't needed immediately

## Common Mistakes

1. **Oversized hero images**: A 4MB PNG hero destroys LCP; use responsive images with `srcset`
2. **Render-blocking third parties**: Google Fonts loaded synchronously delays first paint
3. **No resource hints**: `preload`, `prefetch`, and `preconnect` are free performance wins
4. **Hydrating everything**: Islands architecture (Astro, Fresh) ships zero JS for static content
5. **Ignoring mobile**: 70% of users are on mobile; test on real devices, not just DevTools

## Frequently Asked Questions

**Q: What's the single biggest performance win?**
A: Image optimization. Images are typically 60-80% of page weight. Use modern formats, responsive sizing, and lazy loading.

**Q: Should I use a CDN?**
A: Yes. A CDN reduces TTFB by serving from edge locations close to users. Essential for global audiences.

**Q: How do I balance performance with developer experience?**
A: Use frameworks that optimize by default (Astro, SvelteKit, Next.js with App Router). Don't fight the tooling.
