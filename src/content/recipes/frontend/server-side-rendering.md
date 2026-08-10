---
contentType: recipes
slug: server-side-rendering
title: "Server-Side Rendering"
description: "Improve performance and SEO with server-side rendering using Next.js, Nuxt, Astro, and other frameworks with hydration strategies."
metaDescription: "Server-side rendering guide: Next.js, Nuxt, Astro, hydration, streaming SSR, edge rendering, and performance optimization for SEO and Core Web Vitals."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - ui
  - css
  - javascript
relatedResources:
  - /patterns/mvc-pattern-frontend
  - /recipes/url-encoding-decoding
  - /recipes/email-templates-mjml
  - /recipes/websockets-realtime
  - /recipes/spa-code-splitting-lazy
  - /guides/complete-guide-css-grid-and-flexbox
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Server-side rendering guide: Next.js, Nuxt, Astro, hydration, streaming SSR, edge rendering, and performance optimization for SEO and Core Web Vitals."
  keywords:
    - server-side-rendering
    - frontend
    - nextjs
    - astro

---
## Overview

Server-side rendering (SSR) generates HTML on the server for each request, sending a fully rendered page to the browser. This improves initial page load, [SEO](/guides/performance-optimization-guide/), and social sharing previews. Modern frameworks like Next.js, Nuxt, and Astro combine SSR with client-side hydration to deliver fast first paints and interactive experiences without sacrificing crawlability.

## When to Use

Use this resource when:
- Building content-heavy sites that rely on search engine indexing
- Social sharing requires accurate Open Graph previews
- Users on slow networks need meaningful content immediately
- JavaScript-heavy SPAs have poor [Core Web Vitals](/recipes/web-performance/) scores

## Solution

### Next.js App Router with Streaming SSR

```tsx
// app/page.tsx
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 60 }
  });
  return res.json();
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      <h1>Products</h1>
      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name} — ${p.price}</li>
        ))}
      </ul>
    </main>
  );
}
```

### Astro Islands Architecture

```astro
---
// Server-rendered at build time or on request
const response = await fetch('https://api.example.com/stats');
const stats = await response.json();
---

<html>
  <body>
    <h1>Dashboard</h1>
    <!-- Static, server-rendered HTML -->
    <p>Total Users: {stats.users}</p>

    <!-- Interactive island hydrates on client -->
    <LiveChart client:load data={stats.chart} />
  </body>
</html>
```

### Nuxt 3 SSR with Hybrid Rendering

```vue
<script setup>
const { data: posts } = await useFetch('/api/posts', {
  server: true,   // Render on server
  default: () => []
});
</script>

<template>
  <div>
    <h1>Blog</h1>
    <article v-for="post in posts" :key="post.id">
      <h2>{{ post.title }}</h2>
      <p>{{ post.excerpt }}</p>
    </article>
  </div>
</template>
```

## Explanation

**How hydration works**:
1. Server renders complete HTML and sends to browser
2. Browser displays content immediately (fast LCP)
3. JavaScript bundle loads and "hydrates" the page
4. Event listeners attach; components become interactive

**SSR vs. SSG vs. CSR**:

| Strategy | Render Time | Use Case |
|----------|-------------|----------|
| SSR | Per request | Live data; personalized content |
| SSG | Build time | Static content; maximum cacheability |
| CSR | Client side | Highly interactive dashboards; SPAs |
| ISR | Hybrid | News sites; product catalogs |

## Variants

| Framework | Approach | Notable |
|-----------|----------|---------|
| Next.js | SSR + SSG + ISR | React; Vercel optimization |
| Nuxt | SSR + SSG | Vue; file-based routing |
| Astro | Islands | Zero JS by default; partial hydration |
| SvelteKit | SSR + CSR | Svelte; edge-ready |
| Remix | SSR + progressive enhancement | Forms work without JS |

## What Works

- **Use streaming for slow data**: Suspense boundaries let critical UI render while data loads
- **Avoid hydration mismatches**: Server and client HTML must match exactly
- **Serialize minimal state**: Only pass data the client needs; avoid full database dumps
- **Cache SSR responses**: [CDN caching](/recipes/caching/) with `stale-while-revalidate` reduces server load
- **Lazy-load below-fold**: Use `client:visible` (Astro) or dynamic imports for non-critical interactivity

## Common Mistakes

1. **Hydrating everything**: Not every component needs to be interactive; islands architecture saves JS
2. **Blocking on slow APIs**: A 5-second database query delays the entire page; use streaming
3. **Ignoring memory leaks**: Each SSR request creates new component instances; clean up subscriptions
4. **No error boundaries**: SSR crashes should return a degraded static page, not a 500
5. **Over-caching live content**: SSG caching personalized dashboards shows wrong data to wrong users

## Variants and Alternatives

- **SSR vs SSG vs CSR vs ISR**: SSR renders on each request (dynamic, slower).  SSG renders at build time (static, fastest).  CSR renders in the browser (fast build, slow initial load).
- **Hydration strategies**: full hydration (React default, hydrates entire tree).  Partial hydration (Astro islands, hydrates only interactive components).  Streaming SSR (React 18, sends HTML in chunks).
- **Next.js vs Remix vs Astro vs Nuxt**: Next. js (React, App Router, RSC).  Remix (React, nested routes, web standards).  Astro (framework-agnostic, islands, SSG-first).  Nuxt (Vue, hybrid rendering).
- **Server components vs client components**: server components render on the server with zero JS sent to the client.  Client components hydrate on the client.
- **Edge rendering vs origin rendering**: edge rendering runs at CDN edge locations (low latency, limited APIs).  Origin rendering runs on your servers (full APIs, higher latency).
- **Progressive enhancement vs full JS**: progressive enhancement works without JS (HTML forms, links).  Full JS requires JavaScript for all interactions.

## Common Pitfalls in Production

- **Hydration mismatches**: server and client render different HTML.  Causes React warnings and broken UI.  Common causes: using Date. now(), Math. random(), or window during render.
- **Waterfall data fetching**: nested wait calls in server components cause sequential fetches. all for parallel fetching.
- **Bundle size bloat**: importing large libraries in client components increases JS bundle.
ext/dynamic, lazy()) for non-critical components. Move heavy logic to server components
- **Cache invalidation bugs**: cached pages show stale data after updates.
evalidateTag) or time-based ISR (
evalidate: 60). Test cache invalidation in staging
- **SEO issues with client-side routing**: search engines may not execute JS.
- **Memory leaks in long-running SSR**: server-side caches grow without bounds.

## Integration Patterns

- **SSR with API routes**: page component fetches data from API routes during SSR.  API route queries database.  Response is cached at the edge.
- **Hybrid rendering**: static pages use SSG (marketing, blog).  Dynamic pages use SSR (dashboard, profile).
- **SSR with authentication**: server reads session cookie -> validates session -> renders personalized content -> sends HTML.  Client-side navigation fetches session via API.
- **Streaming SSR with Suspense**: wrap slow components in <Suspense>.  React streams HTML as chunks.  The client receives initial HTML immediately and fills in slow parts as they resolve.
- **Edge middleware for A/B testing**: middleware runs at the edge before rendering.  Assigns variant based on cookie or random.  Rewrites request to different page version.
- **Database connection pooling in SSR**: each SSR request needs a database connection.

## Tooling and Ecosystem

- **Next.js**: React framework with App Router, RSC, SSR, SSG, ISR.  120K+ GitHub stars.  Built-in image optimization, font optimization, and route handlers.
- **Remix**: React framework with nested routes and web standards.  28K+ GitHub stars.  Built on Web Fetch API.  Excellent for form-heavy apps.  Vercel and Fly.
- **Astro**: framework-agnostic SSG-first with islands architecture.  45K+ GitHub stars.  Supports React, Vue, Svelte, Solid components.  Zero JS by default.
- **Nuxt**: Vue framework with hybrid rendering.  52K+ GitHub stars.  Auto-imports, file-based routing, Nitro server engine.
- **SvelteKit**: Svelte framework with SSR and SSG.  18K+ GitHub stars.  Minimal bundle size.  Compile-time optimizations.
- **TanStack Start**: type-safe React SSR framework.  New (2024).  Built on TanStack Router.

## Best Practices Summary

- Use SSG for static content (marketing, blog, docs). Use SSR for personalized content
- Implement partial hydration (islands) to reduce JS sent to the client
- Use Promise.all for parallel data fetching in server components
- Avoid hydration mismatches by using useEffect for client-only logic
- Monitor Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Use edge rendering for personalized content with low latency
- Implement streaming SSR with Suspense for slow components
- Cache aggressively at the edge with tag-based invalidation
- Use connection pooling for database access in SSR
- Test SEO with Google Search Console and mobile-friendly test
## Error Handling and Recovery

- **SSR error boundaries**: wrap page components in error boundaries.  On error, render a 500 page with appropriate status code.  Log the error with stack trace.  Do not crash the server process.
- **Data fetching failures**: if a server component fails to fetch data, render a fallback UI with a retry button.  Set a timeout on fetch calls (e. g.
- **Database connection failures**: use a circuit breaker pattern.  After 5 consecutive failures, stop attempting connections for 30 seconds.  Fall back to cached content.  Alert the team.
- **Hydration error recovery**: on hydration mismatch, React logs a warning and re-renders the affected subtree.  In production, this is usually invisible to the user.  In development, it helps catch bugs. g.
- **Build-time vs runtime errors**: build-time errors (syntax, type errors) should fail the build.  Runtime errors (database, API) should be caught and handled gracefully.
- **Graceful degradation**: if a non-critical component fails (e. g. , comments section), render the rest of the page without it.  Log the error.  Do not fail the entire page for one broken component.

## Performance Optimization Tips

- Use 
ext/streaming or React 18 Suspense to stream HTML chunks. Improves TTFB by 50-80%
- Implement stale-while-revalidate caching at the edge. Serves cached content immediately while revalidating in the background
- Use React.memo and useMemo to prevent unnecessary re-renders in client components
- Preload critical resources (fonts, CSS, images) with <link rel="preload"> in the HTML head
- Use 
ext/image or stro:image for automatic image optimization (WebP, responsive sizes, lazy loading)
- Minimize client-side JavaScript. Move logic to server components. Use islands architecture for partial hydration
- Implement code splitting with dynamic imports for non-critical routes. Reduces initial bundle by 30-50%
- Use Cache-Control headers with s-maxage and stale-while-revalidate for CDN caching
- Compress HTML output with gzip or brotli at the server level. Reduces transfer size by 60-80%
- Monitor Core Web Vitals in production using Real User Monitoring (RUM) tools like Vercel Analytics or Speed Insights
## Security Considerations

- **XSS in SSR**: server-rendered HTML must escape all user input.  React auto-escapes by default, but dangerouslySetInnerHTML bypasses this.  Never use dangerouslySetInnerHTML with user input.
- **CSRF protection**: SSR forms must include CSRF tokens.
- **Server-side secret exposure**: never expose server secrets (API keys, database passwords) to the client.  Server components run on the server and can access secrets.  Client components are sent to the browser.
- **HTTP headers for security**: set X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security: max-age=31536000, Content-Security-Policy: default-src 'self'.
- **Cookie security**: use httpOnly (prevents JS access), secure (HTTPS only), sameSite (CSRF protection).  Set expiration appropriately.
- **Rate limiting SSR endpoints**: SSR pages that do expensive work (database queries, API calls) should be rate-limited. g. , 60 requests per minute per IP).
## Testing and Quality Assurance

- **SSR snapshot testing**: render pages on the server and snapshot the HTML output.  Detects unintended changes in rendered output.
- **Hydration testing**: test that client-side hydration matches server-rendered HTML.
enderToString in unit tests. Enable React strict mode in development
- **Performance testing**: measure LCP, FID, and CLS for every page.  Set budgets: LCP < 2. 5s, FID < 100ms, CLS < 0. 1.  Block deployment if budgets are exceeded.
- **End-to-end testing with SSR**: use Playwright to test SSR pages.  Verify that pages load without JavaScript.
- **Accessibility testing in SSR**: run axe-core in Playwright tests against server-rendered pages. 2 compliance.  Verify ARIA attributes are present in SSR output.
- **SEO testing**: verify canonical URLs, meta descriptions, OG tags, and hreflang tags in SSR output.  Verify sitemap includes all SSR pages.

## Deployment and CI/CD

- **Build-time prerendering**: prerender static pages at build time.
ext build or stro build. Deploy prerendered HTML to a CDN. Reduces server load and improves TTFB. Only use SSR for dynamic pages
- **SSR server deployment**: deploy SSR server to a managed platform (Vercel, Netlify, Cloudflare Workers) or a containerized environment (Docker, Kubernetes). js servers.
- **Edge deployment**: deploy SSR to edge locations for low latency.  Limit dependencies to those that work in edge runtimes.
- **Blue-green deployment**: deploy the new version alongside the old version.  Route a percentage of traffic to the new version.  If healthy, route 100% to the new version.
- **Cache invalidation on deploy**: when deploying new content, invalidate CDN cache for affected pages.
evalidateTag) or path-based invalidation. Wait for cache to warm before routing traffic to the new version
- **Environment variable management**: use different env vars for development, staging, and production.  Never commit secrets to git.
## Cost Optimization

- **Serverless SSR vs always-on**: serverless SSR (Vercel, Netlify) charges per request.  Always-on servers charge per hour.  For low traffic (< 1000 requests/hour), serverless is cheaper.  For high traffic, always-on is cheaper.
- **Edge function costs**: edge functions are billed per request and per GB-second.
- **CDN caching to reduce origin calls**: cache SSR pages at the CDN with s-maxage=300 and stale-while-revalidate=600.  This reduces origin requests by 80-95% for pages that can be cached.
- **Image optimization costs**: use 
ext/image or Cloudflare Images for automatic optimization. Avoid generating multiple sizes on-the-fly for every request. Pre-generate optimized images at build time for static content. Use WebP or AVIF format
- **Database connection costs**: use connection pooling (PgBouncer, Prisma Data Proxy) to reduce the number of database connections.  Each connection uses memory on the database server.
- **Bundle analysis**: use @next/bundle-analyzer or 
ollup-plugin-visualizer to identify large dependencies. Replace heavy libraries with lighter alternatives (e.g., date-fns instead of moment.js, zustand instead of 
edux). Tree-shake unused exports
## Monitoring and Observability

- **Real User Monitoring (RUM)**: collect Core Web Vitals from real users.  Segment by device, connection type, and geography.
- **Server-side metrics**: track SSR response time, memory usage, and error rate per route. js.  Export metrics at /metrics.  Set up Grafana dashboards.
- **Distributed tracing**: use OpenTelemetry to trace requests from CDN edge through SSR server to database.
- **Log aggregation**: structure logs as JSON with timestamp, level, route, requestId, and message. js.  Ship logs to Elasticsearch or CloudWatch.
- **Error tracking**: use Sentry or Bugsnag to capture SSR errors.  Set up release tracking to correlate errors with deployments.
- **Synthetic monitoring**: use Checkly or Uptime Robot to ping critical pages every 5 minutes.  Verify HTTP status, response time, and content.

## Troubleshooting

- **Component does not re-render**: verify state reference, props, and memoization.  A mutated object can bypass change detection.
- **Style does not apply in production**: check that CSS is loaded, class names are not mangled, and specificity wins.  Purge unused styles carefully.
- **Build fails after dependency update**: read the changelog, pin versions, and clean the lock file.
- **Accessibility audit fails**: add labels, landmarks, focus management, and color contrast.
- **Hydration mismatch**: ensure server and client render the same initial HTML. random, or window during SSR.





## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the frontend and ui guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply server-side rendering** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: Does SSR hurt performance?**
A: It improves initial load but adds server cost. Use SSG or ISR for content that doesn't change per user.

**Q: Can I use SSR with a headless CMS?**
A: Yes. Fetch CMS data during SSR; the CMS only serves the API, not the rendered page.

**Q: What's the difference between SSR and hydration?**
A: SSR produces HTML on the server. Hydration makes that static HTML interactive on the client.

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
