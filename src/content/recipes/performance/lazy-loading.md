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
author: "Mathias Paulenko"
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

This technique directly improves three key metrics: **Largest Contentful Paint (LCP)** by prioritizing above-the-fold content, **Time to Interactive (TTI)** by reducing JavaScript parsing on startup, and **cumulative bandwidth usage** by avoiding unnecessary downloads. See [performance optimization](/guides/performance/performance-optimization-guide) for more on Core Web Vitals. Modern browsers provide native lazy loading for images via the `loading="lazy"` attribute, while frameworks like React and Vue offer component-level code splitting. Below is a practical approach to images, UI components, and API data.

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
- **Component code splitting**: [bundlers like Webpack, Vite, and Rollup](/recipes/performance/spa-code-splitting-lazy) automatically split dynamic `import()` calls into separate chunks. React's `lazy()` wraps these chunks in a Suspense boundary, showing a fallback while the chunk loads.
- **Infinite scroll / pagination**: instead of loading all data upfront, fetch pages as the user scrolls or clicks "load more." This reduces initial API payload and database query cost.

## Variants

| Technique | Resource type | Browser support | Framework | Best for |
|-----------|--------------|-----------------|-----------|----------|
| `loading="lazy"` | Images | Modern browsers | Any | Simple image galleries |
| Intersection Observer | Images, iframes | Modern browsers | Any | Custom scroll triggers |
| Dynamic `import()` | JS components | Universal | React, Vue, Svelte | Large UI chunks |
| Route-based lazy | Routes | Universal | React Router, Vue Router | SPA navigation |
| Infinite query | Data | Universal | React Query, SWR | Lists, feeds |

## What works

- **Set dimensions on lazy images**: without explicit `width` and `height`, the browser cannot reserve space before the image loads. This causes Cumulative Layout Shift (CLS), a [Core Web Vitals](/guides/performance/performance-optimization-guide) penalty.
- **Use `eager` for above-the-fold images**: the hero image, logo, and primary CTA should load immediately with `loading="eager"`. Only defer content the user cannot see on first paint.
- **Preload critical resources**: for content that is likely to be needed soon (e.g., the next route in a SPA), use `<link rel="preload">` or `prefetch` so it loads in idle time.
- **Show skeleton placeholders**: while a lazy component or image loads, display a lightweight skeleton UI that matches the final layout. Avoid blank spaces or jumping content.
- **Respect `prefers-reduced-data`**: some users enable data saver mode. Honor this by reducing or disabling lazy-loaded heavy content like autoplaying videos.

## Common mistakes

- **Lazy loading the LCP image**: the largest contentful paint element should never be lazy loaded. If the hero image has `loading="lazy"`, LCP will be delayed until the user scrolls — defeating the purpose.
- **Not handling errors**: if a lazy image fails to load (network error, 404), the user sees a broken icon or infinite spinner. Add `onerror` handlers and fallback images.
- **Over-splitting components**: splitting every component into its own chunk creates excessive HTTP requests. Group related components and split only chunks larger than 20-30KB.
- **Forgetting server-side rendering**: if a lazy component is needed for SSR or initial paint, it will block rendering. Consider [SPA code splitting](/recipes/performance/spa-code-splitting-lazy) for above-the-fold content. Use framework-specific `ssr: true` flags or load eagerly for above-the-fold content.

## Error Handling and Recovery

- **Compression failures**: when Brotli compression fails, serve uncompressed content as fallback. Monitor compression error rate. Set compression quality based on CPU availability. Test compression with different content types. Document fallback behavior. Alert on compression failure spikes. Use gzip as secondary fallback. Review compression settings quarterly
- **CDN origin failures**: when CDN cannot reach origin, serve stale content. Configure stale-while-revalidate headers. Set appropriate TTLs. Monitor origin health. Alert on origin error rate. Use multiple origins for redundancy. Test failover between origins. Document CDN failover configuration. Review CDN health monthly
- **Connection pool exhaustion**: when all connections are in use, requests queue or fail. Set max pool size based on database capacity. Monitor pool utilization. Alert on pool exhaustion. Implement connection timeout. Use retry with backoff. Document pool sizing guidelines. Test under peak load. Review pool configuration quarterly
- **Lazy loading intersection observer failures**: when Intersection Observer fails, content never loads. Implement fallback to scroll event listeners. Test on older browsers. Use polyfill for unsupported browsers. Monitor lazy load failures. Document fallback strategy. Test with different viewport sizes. Review browser support matrix
- **Load test script failures**: when k6 scripts fail, test results are invalid. Validate test scripts before execution. Use k6 checks for response validation. Monitor test failure rate. Document test script standards. Test scripts in staging first. Use version control for test scripts. Review test script quality. Implement test data management
- **Code splitting failures**: when dynamic imports fail, components do not load. Implement error boundaries for split components. Use fallback UI for failed loads. Monitor dynamic import failures. Test code splitting in production. Document error handling for split chunks. Use prefetch for critical chunks. Review splitting strategy quarterly

## Performance and Scalability

- **Compression level tuning**: balance between compression ratio and CPU usage. Brotli level 4 for dynamic content. Brotli level 11 for static assets. Gzip level 6 as fallback. Monitor compression time. Alert on slow compression. Test different levels. Document compression configuration. Review compression performance monthly
- **CDN cache hit ratio optimization**: maximize cache hit ratio to reduce origin load. Set appropriate Cache-Control headers. Use cache keys that include relevant parameters. Purge cache on content updates. Monitor cache hit ratio. Alert on hit ratio drops. Use CDN caching rules. Document caching strategy. Review cache configuration monthly
- **Connection pool sizing**: size pools based on concurrent request volume. Start with 10 connections per pool. Monitor wait time. Increase pool size if wait time exceeds 100ms. Decrease if connections are idle. Use connection validation. Document sizing guidelines. Test under peak load. Review pool size quarterly. Use lazy initialization
- **Lazy loading threshold tuning**: set root margin for early loading. Use 200px root margin for images. Use 400px for heavy components. Monitor user scroll behavior. Adjust threshold based on device performance. Test on mobile devices. Document threshold configuration. Review thresholds quarterly. Use placeholder dimensions
- **Load test ramp patterns**: use ramping stages for realistic load. Start with 10 users. Ramp to 100 over 2 minutes. Hold for 5 minutes. Ramp to peak. Hold for 10 minutes. Ramp down. Monitor response times at each stage. Document ramp patterns. Test different patterns. Review test scenarios quarterly
- **Bundle size optimization**: minimize bundle size for faster loads. Use tree shaking. Split vendor and app code. Analyze bundle with webpack-bundle-analyzer. Set performance budgets. Monitor bundle size in CI. Alert on budget violations. Document splitting strategy. Review bundle size monthly. Use dynamic imports for large dependencies
## Security Considerations

- **HTTPS and compression**: enable compression only over HTTPS to prevent BREACH attacks. Do not compress sensitive responses with user-controlled input. Set 
o-transform header for already compressed content. Monitor for compression-related vulnerabilities. Document security configuration. Test with security scanners. Review security quarterly
- **CDN security**: secure CDN with proper access controls. Use signed URLs for protected content. Configure WAF rules on CDN. Enable DDoS protection. Monitor CDN access logs. Alert on suspicious traffic patterns. Document CDN security configuration. Test CDN security. Review WAF rules quarterly. Use rate limiting
- **Connection pool security**: use TLS for database connections. Set connection timeout to prevent slow-loris attacks. Rotate database credentials. Use per-service connection pools. Monitor for connection leaks. Alert on unusual connection patterns. Document connection security. Test connection security. Review credentials quarterly
- **Content Security Policy for lazy loading**: set CSP headers to allow lazy-loaded resources. Use nonce-based CSP for dynamic imports. Configure script-src for code-split chunks. Monitor CSP violations. Alert on CSP violation spikes. Document CSP configuration. Test CSP with lazy loading. Review CSP policy quarterly

## Deployment and CI/CD

- **Performance testing in CI**: run performance tests on every PR. Use Lighthouse CI for web performance. Use k6 for load testing. Set performance budgets. Fail builds on budget violations. Monitor performance trends. Document CI performance checks. Test CI integration. Review performance budgets quarterly. Use caching for test artifacts
- **Progressive deployment for performance changes**: deploy performance changes gradually. Use canary deployment. Monitor performance metrics. Roll back on regression. Document deployment strategy. Test canary detection. Review canary thresholds. Use feature flags for performance changes. Monitor canary metrics. Document rollback procedures
- **Bundle analysis in CI**: analyze bundle size on every build. Compare with baseline. Alert on size increase. Use webpack-bundle-analyzer or source-map-explorer. Set size budgets per chunk. Document bundle analysis setup. Test bundle analysis. Review bundle budgets quarterly. Track bundle size trends. Use CI artifacts for analysis

## Testing and Quality Assurance

- **Performance regression testing**: run performance tests on every release. Compare with previous baseline. Alert on regressions exceeding 5%. Use synthetic monitoring for key user journeys. Document regression thresholds. Test in production-like environment. Review regression trends. Automate regression detection. Document test procedures
- **Load testing best practices**: test with realistic user patterns. Ramp up gradually. Monitor system resources. Test different endpoints. Use think time between requests. Document test scenarios. Test in staging first. Review test coverage. Use production-like data volumes. Monitor for memory leaks during tests
- **CDN cache testing**: verify cache headers are set correctly. Test cache purge functionality. Verify stale content serving. Test cache key normalization. Monitor cache hit ratio in testing. Document cache testing procedures. Test with query parameters. Review cache behavior. Test edge cases. Validate cache invalidation
## Tools and Platforms

- **WebPageTest**: detailed web performance testing tool. Waterfall view of resource loading. Filmstrip view of visual progress. Test from different locations and devices. Set custom connectivity profiles. Document testing workflow. Test key pages regularly. Review performance trends. Use for deep analysis. Compare with Lighthouse results
- **Lighthouse**: Google web performance auditing tool. Scores performance, accessibility, SEO, and best practices. Run in Chrome DevTools or CLI. Use in CI for automated checks. Set performance budget based on Lighthouse scores. Document Lighthouse workflow. Test on mobile and desktop. Review scores monthly. Track score trends
- **k6**: modern load testing tool by Grafana. JavaScript-based test scripts. Support for HTTP, gRPC, WebSocket. Thresholds for pass/fail. Cloud execution option. Integration with Grafana. Document k6 usage. Create reusable test scenarios. Test in staging. Review test coverage. Use k6 cloud for distributed tests
- **webpack-bundle-analyzer**: visualize bundle composition. Identify large dependencies. Find duplicate modules. Optimize tree shaking. Document bundle analysis workflow. Run in CI. Review bundle monthly. Set size alerts. Use with performance budgets. Track bundle composition over time
- **Cloudflare CDN**: global CDN with edge caching. Workers for edge compute. Cache rules and page rules. Real-time analytics. DDoS protection included. Document Cloudflare configuration. Test cache behavior. Review cache rules quarterly. Monitor cache hit ratio. Use Workers for edge logic
- **Fastly CDN**: CDN with instant purge. VCL for edge configuration. Real-time logging. Image optimization. Document Fastly configuration. Test purge functionality. Review VCL rules. Monitor cache performance. Use real-time logging for debugging. Test edge logic

## Common Pitfalls and Anti-Patterns

- **Over-compression**: compressing already compressed content wastes CPU. Do not compress images, videos, or pre-compressed assets. Set gzip_types and rotli_types carefully. Monitor CPU usage. Test compression overhead. Document compression rules. Review content types quarterly. Use Content-Encoding checks
- **CDN misconfiguration**: incorrect cache headers cause poor hit ratio. Do not cache personalized content. Use Vary header for content negotiation. Set appropriate TTLs. Monitor cache hit ratio. Test cache behavior. Document CDN rules. Review cache configuration monthly. Use cache tags for targeted purging
- **Connection pool over-sizing**: too many connections waste database resources. Each connection uses memory on the database server. Set max pool size based on database capacity. Monitor database connection count. Alert on too many connections. Document sizing guidelines. Test under load. Review pool size quarterly
- **Lazy loading everything**: lazy loading above-the-fold content hurts LCP. Load critical content eagerly. Use loading="eager" for hero images. Use etchpriority="high" for LCP elements. Monitor LCP metrics. Document lazy loading strategy. Test above-the-fold performance. Review lazy loading coverage. Use preload for critical resources
- **Load testing without think time**: load testing without think time creates unrealistic load. Add think time between requests. Use random think time. Simulate real user behavior. Document test scenarios. Test with different think times. Review test realism. Use k6 sleep() function. Monitor for unrealistic patterns
- **Code splitting too granular**: too many small chunks cause excessive network requests. Group related components into chunks. Set minimum chunk size. Use maxAsyncRequests and maxInitialRequests wisely. Monitor chunk count. Document splitting strategy. Test loading performance. Review chunk configuration. Use manual chunks for vendor code

## Best Practices Summary

- **Set performance budgets**: define budgets for key metrics. LCP under 2.5 seconds. FID under 100ms. CLS under 0.1. Bundle size under 200KB. Monitor budgets in CI. Fail builds on violations. Document budget rationale. Review budgets quarterly. Communicate budget status. Use Lighthouse for budget enforcement
- **Monitor Core Web Vitals**: track LCP, INP, and CLS. Use RUM for real user data. Use synthetic monitoring for lab data. Set alerts on metric degradation. Document monitoring setup. Test alerting. Review metrics monthly. Investigate regressions. Use Search Console for field data. Prioritize fixes based on impact
- **Optimize critical rendering path**: minimize render-blocking resources. Inline critical CSS. Defer non-critical JavaScript. Use preload for key resources. Optimize font loading. Document CRP optimization. Test with WebPageTest. Review rendering performance. Monitor FCP and LCP. Use sync and defer attributes
- **Use progressive enhancement**: build core functionality first. Enhance with JavaScript. Test without JavaScript. Use feature detection. Document enhancement strategy. Test on low-end devices. Review accessibility. Monitor JavaScript failures. Use server-side rendering. Provide fallbacks for critical features
## Cost Optimization

- **CDN cost management**: monitor CDN bandwidth costs. Use cache optimization to reduce origin requests. Set appropriate TTLs to maximize cache hits. Use CDN tiering for different content types. Review CDN bills monthly. Document cost optimization strategies. Alert on cost spikes. Use compression to reduce bandwidth. Review CDN pricing plans annually
- **Compression CPU costs**: balance compression savings with CPU costs. Use Brotli level 4 for dynamic content. Pre-compress static assets at build time. Monitor CPU usage from compression. Document compression cost analysis. Test different compression levels. Review compression cost quarterly. Use hardware acceleration where available
- **Connection pool resource costs**: each connection uses memory and CPU. Right-size pools to minimize waste. Monitor idle connections. Close unused connections. Document pool cost analysis. Test pool sizing impact. Review pool costs quarterly. Use connection pooling efficiently. Monitor database resource usage
- **Load testing infrastructure costs**: optimize load testing infrastructure costs. Use spot instances for load tests. Schedule tests during off-peak. Use k6 open source for basic tests. Document cost optimization. Review testing costs quarterly. Use cloud-native load testing. Monitor test infrastructure costs. Use auto-scaling for test runners

## Troubleshooting Guide

- **Slow page load**: diagnose with WebPageTest. Check LCP element. Identify render-blocking resources. Optimize images. Minify CSS and JavaScript. Use CDN for static assets. Document troubleshooting steps. Test fixes. Monitor improvement. Review page load monthly
- **High CDN origin requests**: check cache headers. Verify cache key configuration. Review TTL settings. Check for cache bypass patterns. Monitor cache hit ratio. Document troubleshooting steps. Test cache fixes. Review CDN configuration. Purge and retest
- **Connection pool timeouts**: check pool size. Monitor connection usage. Identify slow queries. Optimize database performance. Increase pool size if needed. Document troubleshooting steps. Test pool changes. Review pool configuration. Monitor wait times
- **Poor load test results**: check test script. Verify test environment. Monitor system resources. Identify bottlenecks. Optimize application code. Scale infrastructure. Document troubleshooting steps. Test fixes. Review test results. Compare with baseline
## Monitoring and Alerting

- **Performance monitoring strategy**: monitor key metrics continuously. Track LCP, INP, CLS for web vitals. Track response times for APIs. Track error rates. Set thresholds for alerts. Use RUM for real user data. Use synthetic monitoring for lab data. Document monitoring strategy. Review metrics monthly. Adjust thresholds based on trends
- **Alert configuration for performance**: set alerts on metric degradation. LCP above 2.5 seconds. Error rate above 1%. Response time above 500ms. Use multi-level alerts: warning and critical. Document alert thresholds. Test alert delivery. Review alert effectiveness monthly. Reduce alert noise. Use runbooks for each alert
- **Dashboard design for performance**: create dashboards for different audiences. Executive dashboard for high-level metrics. Engineering dashboard for detailed metrics. Operations dashboard for real-time monitoring. Use clear visualizations. Document dashboard usage. Review dashboards monthly. Remove unused panels. Optimize dashboard queries. Use templating for reuse
- **Performance regression detection**: automate regression detection. Compare current metrics with baseline. Use statistical analysis for significance. Alert on regressions exceeding threshold. Document detection rules. Test detection accuracy. Review thresholds quarterly. Track regression trends. Use canary analysis for deployments

## Advanced Patterns

- **Edge computing for performance**: move computation to the edge. Use Cloudflare Workers or AWS Lambda@Edge. Reduce latency for global users. Cache dynamic content at edge. Document edge computing strategy. Test edge performance. Review edge configuration. Monitor edge function performance. Use edge for personalization
- **Resource hints optimization**: use preconnect for critical origins. Use preload for key resources. Use prefetch for next-page resources. Use dns-prefetch for external domains. Monitor resource hint effectiveness. Document hint strategy. Test with WebPageTest. Review hints quarterly. Remove unused hints
- **Image optimization pipeline**: automate image optimization. Use responsive images with srcset. Use modern formats like WebP and AVIF. Generate multiple sizes at build time. Use CDN for image transformation. Document optimization pipeline. Test image loading. Review image formats. Monitor image payload size. Use lazy loading for below-fold images
## Migration Strategies

- **Migrating from gzip to Brotli**: enable Brotli alongside gzip for gradual migration. Test Brotli with different browsers. Monitor compression ratios. Keep gzip as fallback for older browsers. Document migration strategy. Test in staging. Review compression performance. Roll out progressively. Monitor for issues
- **Migrating to a new CDN**: run both CDNs in parallel during migration. Compare cache hit ratios. Test purge functionality. Verify SSL certificates. Monitor performance metrics. Switch DNS gradually. Document migration runbook. Test failback procedures. Review migration progress. Complete DNS switch after validation
- **Migrating connection pools**: migrate pool configuration gradually. Test new pool size in staging. Monitor connection usage. Roll out to one service at a time. Document migration strategy. Test failback. Review pool performance. Complete migration after validation. Monitor for connection issues

## Compliance and Governance

- **Performance SLAs**: define performance SLAs for critical endpoints. API response time under 200ms. Page load time under 3 seconds. Track SLA compliance. Alert on SLA violations. Document SLA definitions. Review SLAs quarterly. Communicate SLA status. Test SLA monitoring. Use SLA for prioritization
- **Performance reporting**: generate weekly performance reports. Include key metrics and trends. Highlight regressions and improvements. Share with stakeholders. Document reporting methodology. Automate report generation. Review report content. Track performance over time. Use reports for planning
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