---
contentType: recipes
slug: lazy-loading
title: "Implement Lazy Loading for Images, Components, and Data"
description: "How to defer loading of non-critical resources until they are needed, improving initial page load time, reducing bandwidth, and optimizing Core Web Vitals."
metaDescription: "Learn lazy loading for images, components, and data. Defer non-critical resources until needed to improve page load time, reduce bandwidth, and optimize Core Web Vitals."
difficulty: beginner
topics:
  - performance
tags:
  - lazy-loading
  - images
  - components
  - intersection-observer
  - core-web-vitals
  - bandwidth
  - frontend
  - performance
relatedResources:
  - /recipes/cache-invalidation
  - /recipes/cdn-edge-caching
  - /recipes/image-optimization
lastUpdated: "2026-06-13"
author: "StackPractices"
seo:
  metaDescription: "Learn lazy loading for images, components, and data. Defer non-critical resources until needed to improve page load time, reduce bandwidth, and optimize Core Web Vitals."
  keywords:
    - lazy loading
    - defer loading
    - intersection observer
    - image lazy load
    - component lazy load
---

## Overview

Lazy loading is a performance optimization strategy that defers the loading of non-critical resources until they are actually needed. Instead of downloading every image, component, and data chunk on initial page load, the application only fetches what the user can immediately see or interact with. Resources below the fold, hidden tabs, or off-screen carousels load on demand — typically when the user scrolls, clicks, or hovers.

This technique directly improves three key metrics: **Largest Contentful Paint (LCP)** by prioritizing above-the-fold content, **Time to Interactive (TTI)** by reducing JavaScript parsing on startup, and **cumulative bandwidth usage** by avoiding unnecessary downloads. Modern browsers provide native lazy loading for images via the `loading="lazy"` attribute, while frameworks like React and Vue offer component-level code splitting. This recipe covers images, UI components, and API data.

## When to use it

Use this recipe when:

- A page contains many images or media files below the initial viewport
- Your JavaScript bundle is large and slows down initial render
- Dashboards or admin panels have tabs, modals, or sections rarely accessed
- Lists or tables load hundreds of rows where only the first ten are visible
- Mobile users on slow connections experience long initial load times

## Solution

### Native Image Lazy Loading (HTML)

```html
<img src="hero.jpg" alt="Hero" loading="eager" width="1200" height="600">

<img src="gallery-1.jpg" alt="Gallery" loading="lazy" width="800" height="600">
<img src="gallery-2.jpg" alt="Gallery" loading="lazy" width="800" height="600">
<img src="gallery-3.jpg" alt="Gallery" loading="lazy" width="800" height="600">
```

### Intersection Observer (Vanilla JavaScript)

```javascript
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      observer.unobserve(img);
    }
  });
}, {
  rootMargin: '50px 0px',
  threshold: 0.01
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

### React Lazy Loading (Components)

```jsx
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const VideoPlayer = lazy(() => import('./VideoPlayer'));

function Dashboard() {
  return (
    <div>
      <SummaryCards />
      <Suspense fallback={<SkeletonChart />}>
        <HeavyChart />
      </Suspense>
      <Suspense fallback={<SkeletonPlayer />}>
        <VideoPlayer />
      </Suspense>
    </div>
  );
}
```

### Data Lazy Loading (React Query / TanStack Query)

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function ProductList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['products'],
      queryFn: ({ pageParam = 1 }) =>
        fetch(`/api/products?page=${pageParam}`).then(r => r.json()),
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    });

  return (
    <>
      {data?.pages.map(page =>
        page.products.map(p => <ProductCard key={p.id} product={p} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </>
  );
}
```

## Explanation

- **Native `loading="lazy"`**: the simplest approach. The browser decides when to fetch the image based on viewport distance. Supported in all modern browsers. Always include `width` and `height` to prevent layout shift (CLS).
- **Intersection Observer**: a performant API that watches when elements enter the viewport. Unlike scroll event listeners, it does not run on the main thread continuously. Use it for custom lazy loading behaviors, background images, or iframes.
- **Component code splitting**: bundlers like Webpack, Vite, and Rollup automatically split dynamic `import()` calls into separate chunks. React's `lazy()` wraps these chunks in a Suspense boundary, showing a fallback while the chunk loads.
- **Infinite scroll / pagination**: instead of loading all data upfront, fetch pages as the user scrolls or clicks "load more." This reduces initial API payload and database query cost.

## Variants

| Technique | Resource type | Browser support | Framework | Best for |
|-----------|--------------|-----------------|-----------|----------|
| `loading="lazy"` | Images | Modern browsers | Any | Simple image galleries |
| Intersection Observer | Images, iframes | Modern browsers | Any | Custom scroll triggers |
| Dynamic `import()` | JS components | Universal | React, Vue, Svelte | Large UI chunks |
| Route-based lazy | Routes | Universal | React Router, Vue Router | SPA navigation |
| Infinite query | Data | Universal | React Query, SWR | Lists, feeds |

## Best practices

- **Set dimensions on lazy images**: without explicit `width` and `height`, the browser cannot reserve space before the image loads. This causes Cumulative Layout Shift (CLS), a Core Web Vitals penalty.
- **Use `eager` for above-the-fold images**: the hero image, logo, and primary CTA should load immediately with `loading="eager"`. Only defer content the user cannot see on first paint.
- **Preload critical resources**: for content that is likely to be needed soon (e.g., the next route in a SPA), use `<link rel="preload">` or `prefetch` so it loads in idle time.
- **Show skeleton placeholders**: while a lazy component or image loads, display a lightweight skeleton UI that matches the final layout. Avoid blank spaces or jumping content.
- **Respect `prefers-reduced-data`**: some users enable data saver mode. Honor this by reducing or disabling lazy-loaded heavy content like autoplaying videos.

## Common mistakes

- **Lazy loading the LCP image**: the largest contentful paint element should never be lazy loaded. If the hero image has `loading="lazy"`, LCP will be delayed until the user scrolls — defeating the purpose.
- **Not handling errors**: if a lazy image fails to load (network error, 404), the user sees a broken icon or infinite spinner. Add `onerror` handlers and fallback images.
- **Over-splitting components**: splitting every component into its own chunk creates excessive HTTP requests. Group related components and split only chunks larger than 20-30KB.
- **Forgetting server-side rendering**: if a lazy component is needed for SSR or initial paint, it will block rendering. Use framework-specific `ssr: true` flags or load eagerly for above-the-fold content.

## FAQ

**Q: Does lazy loading hurt SEO?**
A: No. Googlebot renders lazy-loaded images and content. As long as images are in the initial HTML or loaded via standard JavaScript (not user interaction), search engines will index them. Use `<noscript>` fallbacks for absolute safety.

**Q: What is the difference between lazy loading and prefetching?**
A: Lazy loading defers until needed. Prefetching loads in advance during idle time. Use lazy loading for below-the-fold content and prefetching for likely next navigation targets.

**Q: Can I lazy load CSS?**
A: Yes. Use `rel="preload"` for critical CSS and load non-critical stylesheets asynchronously with `media="print"` trick or `loadCSS`. However, unstyled content flashing (FOUC) is a risk — test carefully.

**Q: How do I test lazy loading performance?**
A: Use Chrome DevTools Network panel, throttle to "Slow 3G," and scroll through the page. Check the waterfall chart — images and chunks should load only when entering the viewport, not at page start.

