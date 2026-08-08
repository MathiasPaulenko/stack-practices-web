---
contentType: recipes
slug: spa-code-splitting-lazy
title: "SPA Performance: Code Splitting and Lazy Loading"
description: "Improve single-page application load times by splitting bundles at route and component level, implementing lazy loading with React.lazy and live imports"
metaDescription: "Improve SPA performance with code splitting and lazy loading. Split bundles at route and component level using React.lazy and live imports for faster loads."
difficulty: intermediate
topics:
  - frontend
  - performance
tags:
  - spa
  - react
  - performance
  - frontend
  - ui
relatedResources:
  - /patterns/composite-pattern-ui
  - /patterns/bridge-pattern-ui-themes
  - /guides/performance-optimization-guide
  - /recipes/email-templates-mjml
  - /recipes/javascript-event-loop
  - /recipes/server-side-rendering
  - /recipes/web-performance
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Improve SPA performance with code splitting and lazy loading. Split bundles at route and component level using React.lazy and live imports for faster loads."
  keywords:
    - code splitting
    - lazy loading
    - react lazy
    - spa performance
    - live imports





---
Reduce initial bundle size in [single-page applications](/recipes/performance/lazy-loading) by splitting code at the route and component level. React.lazy, live imports, and preload strategies that keep time-to-interactive low without sacrificing user experience.

## When to Use This

- Your SPA bundle exceeds 200KB gzipped and loads slowly on mobile
- Not all routes are accessed by every user on first visit
- Heavy components (charts, editors, maps) are only needed on specific pages. See [MVC Pattern Frontend](/patterns/design/mvc-pattern-frontend) for component architecture.

## Solution

### 1. Route-Level Code Splitting

```typescript
// router.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 2. Component-Level Lazy Loading

```typescript
// components/HeavyChart.tsx
import { lazy, Suspense, useState } from 'react';

const Chart = lazy(() => import('./ChartLibrary'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Analytics</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <Chart data={getData()} />
        </Suspense>
      )}
    </div>
  );
}
```

### 3. Prefetch on Hover

```typescript
// utils/prefetch.ts
const lazyPages = {
  '/reports': () => import('./pages/Reports'),
  '/analytics': () => import('./pages/Analytics'),
};

export function prefetchRoute(path: string): void {
  const loader = lazyPages[path as keyof typeof lazyPages];
  if (loader) loader();
}

// Navigation.tsx
import { prefetchRoute } from './utils/prefetch';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <a
      href={to}
      onMouseEnter={() => prefetchRoute(to)}
    >
      {children}
    </a>
  );
}
```

### 4. Vite Configuration for Chunking

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          forms: ['react-hook-form', 'zod'],
        },
      },
    },
  },
});
```

## How It Works

- `React.lazy` wraps a live import and renders a fallback while loading
- `Suspense` boundaries catch loading states and show fallback UI
- Prefetching on hover starts loading before the user clicks
- Manual chunks group shared vendor code into cacheable bundles

## Variation: Intersection Observer for Below-Fold Content

```typescript
// hooks/useLazyLoad.ts
import { useEffect, useRef, useState } from 'react';

function useLazyLoad() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

## Production Considerations

- Set proper `fallback` UI to prevent layout shifts while loading
- Monitor [Core Web Vitals](/guides/performance/performance-optimization-guide) (LCP, INP, CLS) after splitting
- Use `preload` for critical routes accessed by most users

## Common Mistakes

- Wrapping every component in lazy, causing excessive network requests
- Not handling load errors with an `ErrorBoundary`
- Forgetting that lazy-loaded routes still need their data fetched

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





## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the spa and react guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply spa performance: code splitting and lazy loading** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: Does this work with SSR?**
A: Yes, but use `@loadable/component` instead of `React.lazy` for server-side rendering support.

**Q: How small should each chunk be?**
A: Aim for 30-100KB gzipped per route chunk. Too many tiny chunks hurt performance due to request overhead.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
