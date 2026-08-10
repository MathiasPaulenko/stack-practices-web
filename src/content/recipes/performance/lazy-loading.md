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
  - performance
  - lazy-loading
  - images
  - optimization
  - profiling
relatedResources:
  - /recipes/cache-invalidation
  - /recipes/cdn-edge-caching
  - /recipes/image-optimization
lastUpdated: "2026-06-13"
publishedAt: "2026-06-14"
author: Mathias Paulenko
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

This technique directly improves three key metrics: **Largest Contentful Paint (LCP)** by prioritizing above-the-fold content, **Time to Interactive (TTI)** by reducing JavaScript parsing on startup, and **cumulative bandwidth usage** by avoiding unnecessary downloads. See [performance optimization](/guides/performance-optimization-guide/) for more on Core Web Vitals. Modern browsers provide native lazy loading for images via the `loading="lazy"` attribute, while frameworks like React and Vue offer component-level code splitting. Below is a practical approach to images, UI components, and API data.

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

- **Native `loading="lazy"`**: the simplest approach.  The browser decides when to fetch the image based on viewport distance.  Supported in all modern browsers.  Always include `width` and `height` to prevent layout shift (CLS).
- **Intersection Observer**: a performant API that watches when elements enter the viewport.  Unlike scroll event listeners, it does not run on the main thread continuously.
- **Component code splitting**: [bundlers like Webpack, Vite, and Rollup](/recipes/spa-code-splitting-lazy/) automatically split dynamic `import()` calls into separate chunks.  React's `lazy()` wraps these chunks in a Suspense boundary, showing a fallback while the chunk loads.
- **Infinite scroll / pagination**: instead of loading all data upfront, fetch pages as the user scrolls or clicks "load more. " This reduces initial API payload and database query cost.

## Variants

| Technique | Resource type | Browser support | Framework | Best for |
|-----------|--------------|-----------------|-----------|----------|
| `loading="lazy"` | Images | Modern browsers | Any | Simple image galleries |
| Intersection Observer | Images, iframes | Modern browsers | Any | Custom scroll triggers |
| Dynamic `import()` | JS components | Universal | React, Vue, Svelte | Large UI chunks |
| Route-based lazy | Routes | Universal | React Router, Vue Router | SPA navigation |
| Infinite query | Data | Universal | React Query, SWR | Lists, feeds |

## What works

- **Set dimensions on lazy images**: without explicit `width` and `height`, the browser cannot reserve space before the image loads.  This causes Cumulative Layout Shift (CLS), a [Core Web Vitals](/guides/performance-optimization-guide/) penalty.
- **Use `eager` for above-the-fold images**: the hero image, logo, and primary CTA should load immediately with `loading="eager"`.  Only defer content the user cannot see on first paint.
- **Preload critical resources**: for content that is likely to be needed soon (e. g. , the next route in a SPA), use `<link rel="preload">` or `prefetch` so it loads in idle time.
- **Show skeleton placeholders**: while a lazy component or image loads, display a lightweight skeleton UI that matches the final layout.
- **Respect `prefers-reduced-data`**: some users enable data saver mode.  Honor this by reducing or disabling lazy-loaded heavy content like autoplaying videos.

## Common mistakes

- **Lazy loading the LCP image**: the largest contentful paint element should never be lazy loaded.  If the hero image has `loading="lazy"`, LCP will be delayed until the user scrolls — defeating the purpose.
- **Not handling errors**: if a lazy image fails to load (network error, 404), the user sees a broken icon or infinite spinner.  Add `onerror` handlers and fallback images.
- **Over-splitting components**: splitting every component into its own chunk creates excessive HTTP requests.  Group related components and split only chunks larger than 20-30KB.
- **Forgetting server-side rendering**: if a lazy component is needed for SSR or initial paint, it will block rendering.  Consider [SPA code splitting](/recipes/spa-code-splitting-lazy/) for above-the-fold content.

## Error Handling and Recovery

- **Compression failures**: when Brotli compression fails, serve uncompressed content as fallback.  Set compression quality based on CPU availability.
- **CDN origin failures**: when CDN cannot reach origin, serve stale content.  Set appropriate TTLs.
- **Connection pool exhaustion**: when all connections are in use, requests queue or fail.  Set max pool size based on database capacity.
- **Lazy loading intersection observer failures**: when Intersection Observer fails, content never loads.
- **Load test script failures**: when k6 scripts fail, test results are invalid.  Validate test scripts before execution.  Use version control for test scripts.
- **Code splitting failures**: when dynamic imports fail, components do not load.  Use prefetch for critical chunks.

## Performance and Scalability

- **Compression level tuning**: balance between compression ratio and CPU usage.  Brotli level 4 for dynamic content.  Brotli level 11 for static assets.  Gzip level 6 as fallback.
- **CDN cache hit ratio optimization**: maximize cache hit ratio to reduce origin load.  Set appropriate Cache-Control headers.  Purge cache on content updates.
- **Connection pool sizing**: size pools based on concurrent request volume.  Start with 10 connections per pool.  Increase pool size if wait time exceeds 100ms.  Decrease if connections are idle.
- **Lazy loading threshold tuning**: set root margin for early loading.  Use 400px for heavy components.  Adjust threshold based on device performance.
- **Load test ramp patterns**: use ramping stages for realistic load.  Start with 10 users.  Ramp to 100 over 2 minutes.  Hold for 5 minutes.  Ramp to peak.  Hold for 10 minutes.  Ramp down.
- **Bundle size optimization**: minimize bundle size for faster loads.  Split vendor and app code.  Analyze bundle with webpack-bundle-analyzer.  Set performance budgets.
## Security Considerations

- **HTTPS and compression**: enable compression only over HTTPS to prevent BREACH attacks.  Do not compress sensitive responses with user-controlled input.
o-transform header for already compressed content. Monitor for compression-related vulnerabilities. Document security configuration. Test with security scanners. Review security quarterly
- **CDN security**: secure CDN with proper access controls.  Enable DDoS protection.
- **Connection pool security**: use TLS for database connections.  Set connection timeout to prevent slow-loris attacks.  Rotate database credentials.
- **Content Security Policy for lazy loading**: set CSP headers to allow lazy-loaded resources.

## Deployment and CI/CD

- **Performance testing in CI**: run performance tests on every PR.  Use k6 for load testing.  Set performance budgets.  Fail builds on budget violations.
- **Progressive deployment for performance changes**: deploy performance changes gradually.  Roll back on regression.
- **Bundle analysis in CI**: analyze bundle size on every build.  Set size budgets per chunk.

## Testing and Quality Assurance

- **Performance regression testing**: run performance tests on every release.
- **Load testing best practices**: test with realistic user patterns.  Ramp up gradually.  Use production-like data volumes.
- **CDN cache testing**: verify cache headers are set correctly.  Verify stale content serving.  Test with query parameters.
## Tools and Platforms

- **WebPageTest**: detailed web performance testing tool.  Waterfall view of resource loading.  Filmstrip view of visual progress.  Set custom connectivity profiles.
- **Lighthouse**: Google web performance auditing tool.  Scores performance, accessibility, SEO, and best practices.  Run in Chrome DevTools or CLI.  Set performance budget based on Lighthouse scores.
- **k6**: modern load testing tool by Grafana.  JavaScript-based test scripts.  Support for HTTP, gRPC, WebSocket.  Thresholds for pass/fail.  Cloud execution option.  Integration with Grafana.  Create reusable test scenarios.
- **webpack-bundle-analyzer**: visualize bundle composition.  Find duplicate modules.  Run in CI.  Set size alerts.
- **Cloudflare CDN**: global CDN with edge caching.  Workers for edge compute.  Cache rules and page rules.  Real-time analytics.  DDoS protection included.
- **Fastly CDN**: CDN with instant purge.  VCL for edge configuration.  Real-time logging.  Image optimization.

## Common Pitfalls and Anti-Patterns

- **Over-compression**: compressing already compressed content wastes CPU.  Do not compress images, videos, or pre-compressed assets.  Set gzip_types and rotli_types carefully.
- **CDN misconfiguration**: incorrect cache headers cause poor hit ratio.  Do not cache personalized content.  Set appropriate TTLs.
- **Connection pool over-sizing**: too many connections waste database resources.  Each connection uses memory on the database server.  Set max pool size based on database capacity.
- **Lazy loading everything**: lazy loading above-the-fold content hurts LCP.  Load critical content eagerly.  Use etchpriority="high" for LCP elements.
- **Load testing without think time**: load testing without think time creates unrealistic load.  Add think time between requests.  Simulate real user behavior.
- **Code splitting too granular**: too many small chunks cause excessive network requests.  Group related components into chunks.  Set minimum chunk size.

## Best Practices Summary

- **Set performance budgets**: define budgets for key metrics.  LCP under 2. 5 seconds.  FID under 100ms.  CLS under 0. 1.  Bundle size under 200KB.  Fail builds on violations.  Communicate budget status.
- **Monitor Core Web Vitals**: track LCP, INP, and CLS.  Use synthetic monitoring for lab data.  Set alerts on metric degradation.
- **Optimize critical rendering path**: minimize render-blocking resources.  Inline critical CSS.  Defer non-critical JavaScript.
- **Use progressive enhancement**: build core functionality first.  Enhance with JavaScript.  Use server-side rendering.
## Cost Optimization

- **CDN cost management**: monitor CDN bandwidth costs.  Set appropriate TTLs to maximize cache hits.  Use compression to reduce bandwidth.
- **Compression CPU costs**: balance compression savings with CPU costs.  Pre-compress static assets at build time.
- **Connection pool resource costs**: each connection uses memory and CPU.  Close unused connections.
- **Load testing infrastructure costs**: optimize load testing infrastructure costs.  Use cloud-native load testing.

## Troubleshooting Guide

- **Slow page load**: diagnose with WebPageTest.  Minify CSS and JavaScript.
- **High CDN origin requests**: check cache headers.  Verify cache key configuration.
- **Connection pool timeouts**: check pool size.  Increase pool size if needed.
- **Poor load test results**: check test script.  Verify test environment.  Scale infrastructure.
## Monitoring and Alerting

- **Performance monitoring strategy**: monitor key metrics continuously.  Track response times for APIs.  Set thresholds for alerts.  Use synthetic monitoring for lab data.
- **Alert configuration for performance**: set alerts on metric degradation.  LCP above 2. 5 seconds.  Error rate above 1%.  Response time above 500ms.  Reduce alert noise.
- **Dashboard design for performance**: create dashboards for different audiences.  Executive dashboard for high-level metrics.  Engineering dashboard for detailed metrics.  Operations dashboard for real-time monitoring.
- **Performance regression detection**: automate regression detection.

## Advanced Patterns

- **Edge computing for performance**: move computation to the edge.  Reduce latency for global users.  Cache dynamic content at edge.
- **Resource hints optimization**: use preconnect for critical origins.  Use prefetch for next-page resources.
- **Image optimization pipeline**: automate image optimization.  Use modern formats like WebP and AVIF.
## Migration Strategies

- **Migrating from gzip to Brotli**: enable Brotli alongside gzip for gradual migration.  Roll out progressively.
- **Migrating to a new CDN**: run both CDNs in parallel during migration.  Verify SSL certificates.  Switch DNS gradually.
- **Migrating connection pools**: migrate pool configuration gradually.  Roll out to one service at a time.  Complete migration after validation.

## Compliance and Governance

- **Performance SLAs**: define performance SLAs for critical endpoints.  API response time under 200ms.  Page load time under 3 seconds.  Communicate SLA status.
- **Performance reporting**: generate weekly performance reports.  Highlight regressions and improvements.





## Glossary

- **Implement Lazy Loading for Images, Components, and Data**: core technique or pattern described in this article.
- **Production**: live environment serving real users; requires monitoring and rollback plan.
- **Troubleshooting**: systematic process to diagnose and resolve incidents.

## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the performance and lazy-loading guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply implement lazy loading for images, components, and data** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: Does lazy loading hurt SEO?**
A: No. Googlebot renders lazy-loaded images and content. As long as images are in the initial HTML or loaded via standard JavaScript (not user interaction), search engines will index them. Use `<noscript>` fallbacks for absolute safety.

**Q: What is the difference between lazy loading and prefetching?**
A: Lazy loading defers until needed. Prefetching loads in advance during idle time. Use lazy loading for below-the-fold content and prefetching for likely next navigation targets.

**Q: Can I lazy load CSS?**
A: Yes. Use `rel="preload"` for critical CSS and load non-critical stylesheets asynchronously with `media="print"` trick or `loadCSS`. However, unstyled content flashing (FOUC) is a risk — test carefully.

**Q: How do I test lazy loading performance?**
A: Use Chrome DevTools Network panel, throttle to "Slow 3G," and scroll through the page. Check the waterfall chart — images and chunks should load only when entering the viewport, not at page start.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### What is the difference between lazy loading and code splitting?

Lazy loading defers loading of content until it is needed, typically when it enters the viewport. Code splitting divides bundles into smaller chunks loaded on demand. Lazy loading is for content like images and components. Code splitting is for JavaScript bundles. Both reduce initial page load. Use them together for maximum impact.

### How do I measure lazy loading effectiveness?

Track LCP, FCP, and TBT metrics. Compare page load with and without lazy loading. Use Lighthouse to measure impact. Monitor scroll depth and engagement. Check that below-fold content loads on scroll. Use WebPageTest for waterfall analysis. Document performance gains.

### Should I use native loading="lazy" or a JavaScript library?

Start with native `loading="lazy"` attribute. It is supported by all modern browsers. Use a JavaScript library only if you need advanced features like custom thresholds, animations, or placeholders. Test native lazy loading first. Monitor browser support. Use polyfill for older browsers. Document your approach.

### How do I handle SEO with lazy loaded images?

Search engines may not load lazy images during crawling. Provide descriptive `alt` text for all images. Use `noscript` fallback with image tags for crawlers that do not execute JavaScript. Include image URLs in your sitemap. Use structured data for images. Test with Google Search Console URL Inspector. Monitor indexed image count.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
