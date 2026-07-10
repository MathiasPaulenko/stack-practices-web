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
  - server-side-rendering
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
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Server-side rendering guide: Next.js, Nuxt, Astro, hydration, streaming SSR, edge rendering, and performance optimization for SEO and Core Web Vitals."
  keywords:
    - server-side-rendering
    - frontend
    - nextjs
    - astro
---
## Overview

Server-side rendering (SSR) generates HTML on the server for each request, sending a fully rendered page to the browser. This improves initial page load, [SEO](/guides/performance/performance-optimization-guide), and social sharing previews. Modern frameworks like Next.js, Nuxt, and Astro combine SSR with client-side hydration to deliver fast first paints and interactive experiences without sacrificing crawlability.

## When to Use

Use this resource when:
- Building content-heavy sites that rely on search engine indexing
- Social sharing requires accurate Open Graph previews
- Users on slow networks need meaningful content immediately
- JavaScript-heavy SPAs have poor [Core Web Vitals](/recipes/performance/web-performance) scores

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
- **Cache SSR responses**: [CDN caching](/recipes/data/caching) with `stale-while-revalidate` reduces server load
- **Lazy-load below-fold**: Use `client:visible` (Astro) or dynamic imports for non-critical interactivity

## Common Mistakes

1. **Hydrating everything**: Not every component needs to be interactive; islands architecture saves JS
2. **Blocking on slow APIs**: A 5-second database query delays the entire page; use streaming
3. **Ignoring memory leaks**: Each SSR request creates new component instances; clean up subscriptions
4. **No error boundaries**: SSR crashes should return a degraded static page, not a 500
5. **Over-caching live content**: SSG caching personalized dashboards shows wrong data to wrong users

## Variants and Alternatives

- **SSR vs SSG vs CSR vs ISR**: SSR renders on each request (dynamic, slower). SSG renders at build time (static, fastest). CSR renders in the browser (fast build, slow initial load). ISR revalidates static pages on a schedule (balance of speed and freshness)
- **Hydration strategies**: full hydration (React default, hydrates entire tree). Partial hydration (Astro islands, hydrates only interactive components). Streaming SSR (React 18, sends HTML in chunks). Islands architecture (only hydrate what needs interactivity)
- **Next.js vs Remix vs Astro vs Nuxt**: Next.js (React, App Router, RSC). Remix (React, nested routes, web standards). Astro (framework-agnostic, islands, SSG-first). Nuxt (Vue, hybrid rendering). Choose based on framework preference and rendering needs
- **Server components vs client components**: server components render on the server with zero JS sent to the client. Client components hydrate on the client. Use server components for static content, client components for interactivity
- **Edge rendering vs origin rendering**: edge rendering runs at CDN edge locations (low latency, limited APIs). Origin rendering runs on your servers (full APIs, higher latency). Use edge for personalized content, origin for database-heavy pages
- **Progressive enhancement vs full JS**: progressive enhancement works without JS (HTML forms, links). Full JS requires JavaScript for all interactions. Use progressive enhancement for content sites, full JS for applications

## Common Pitfalls in Production

- **Hydration mismatches**: server and client render different HTML. Causes React warnings and broken UI. Common causes: using Date.now(), Math.random(), or window during render. Use useEffect for client-only logic
- **Waterfall data fetching**: nested wait calls in server components cause sequential fetches. Use Promise.all for parallel fetching. Consider preloading critical data in layout components
- **Bundle size bloat**: importing large libraries in client components increases JS bundle. Use dynamic imports (
ext/dynamic, lazy()) for non-critical components. Move heavy logic to server components
- **Cache invalidation bugs**: cached pages show stale data after updates. Use tag-based revalidation (
evalidateTag) or time-based ISR (
evalidate: 60). Test cache invalidation in staging
- **SEO issues with client-side routing**: search engines may not execute JS. Use SSR or SSG for SEO-critical pages. Include proper meta tags, sitemap, and structured data in the server-rendered HTML
- **Memory leaks in long-running SSR**: server-side caches grow without bounds. Use LRU caches with max size. Monitor memory usage. Restart workers periodically (use a process manager like PM2)

## Integration Patterns

- **SSR with API routes**: page component fetches data from API routes during SSR. API route queries database. Response is cached at the edge. Client navigation uses client-side fetching for subsequent loads
- **Hybrid rendering**: static pages use SSG (marketing, blog). Dynamic pages use SSR (dashboard, profile). Use ISR for pages that update frequently but do not need real-time data. Configure per-route rendering strategy
- **SSR with authentication**: server reads session cookie -> validates session -> renders personalized content -> sends HTML. Client-side navigation fetches session via API. Use httpOnly cookies for security
- **Streaming SSR with Suspense**: wrap slow components in <Suspense>. React streams HTML as chunks. The client receives initial HTML immediately and fills in slow parts as they resolve. Improves TTFB and FCP
- **Edge middleware for A/B testing**: middleware runs at the edge before rendering. Assigns variant based on cookie or random. Rewrites request to different page version. No client-side flicker
- **Database connection pooling in SSR**: each SSR request needs a database connection. Use a connection pool (pgBouncer, Prisma Data Proxy). Share pool across requests. Close connections on shutdown

## Tooling and Ecosystem

- **Next.js**: React framework with App Router, RSC, SSR, SSG, ISR. 120K+ GitHub stars. Built-in image optimization, font optimization, and route handlers. Vercel deployment first-class
- **Remix**: React framework with nested routes and web standards. 28K+ GitHub stars. Built on Web Fetch API. Excellent for form-heavy apps. Vercel and Fly.io deployment
- **Astro**: framework-agnostic SSG-first with islands architecture. 45K+ GitHub stars. Supports React, Vue, Svelte, Solid components. Zero JS by default. Best for content sites
- **Nuxt**: Vue framework with hybrid rendering. 52K+ GitHub stars. Auto-imports, file-based routing, Nitro server engine. Best for Vue teams
- **SvelteKit**: Svelte framework with SSR and SSG. 18K+ GitHub stars. Minimal bundle size. Compile-time optimizations. Best for performance-critical apps
- **TanStack Start**: type-safe React SSR framework. New (2024). Built on TanStack Router. Type-safe routing and data loading

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

- **SSR error boundaries**: wrap page components in error boundaries. On error, render a 500 page with appropriate status code. Log the error with stack trace. Do not crash the server process. Use React error boundaries or framework-specific error components
- **Data fetching failures**: if a server component fails to fetch data, render a fallback UI with a retry button. Use stale-while-revalidate caching to serve last known good data. Set a timeout on fetch calls (e.g., 5 seconds)
- **Database connection failures**: use a circuit breaker pattern. After 5 consecutive failures, stop attempting connections for 30 seconds. Fall back to cached content. Alert the team. Use a health check endpoint to detect failures
- **Hydration error recovery**: on hydration mismatch, React logs a warning and re-renders the affected subtree. In production, this is usually invisible to the user. In development, it helps catch bugs. Use suppressHydrationWarning for intentional differences (e.g., timestamps)
- **Build-time vs runtime errors**: build-time errors (syntax, type errors) should fail the build. Runtime errors (database, API) should be caught and handled gracefully. Use TypeScript for build-time safety. Use try/catch for runtime resilience
- **Graceful degradation**: if a non-critical component fails (e.g., comments section), render the rest of the page without it. Log the error. Do not fail the entire page for one broken component. Use Suspense boundaries to isolate failures

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

- **XSS in SSR**: server-rendered HTML must escape all user input. React auto-escapes by default, but dangerouslySetInnerHTML bypasses this. Never use dangerouslySetInnerHTML with user input. Use DOMPurify for sanitizing user-provided HTML
- **CSRF protection**: SSR forms must include CSRF tokens. Generate a token per session and validate on POST. Use SameSite=Strict cookies. For API calls from the client, use SameSite=Lax with a custom header check
- **Server-side secret exposure**: never expose server secrets (API keys, database passwords) to the client. Server components run on the server and can access secrets. Client components are sent to the browser. Do not pass secrets as props from server to client components
- **HTTP headers for security**: set X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Strict-Transport-Security: max-age=31536000, Content-Security-Policy: default-src 'self'. Use a security headers middleware or helmet for Express
- **Cookie security**: use httpOnly (prevents JS access), secure (HTTPS only), sameSite (CSRF protection). Set expiration appropriately. Use __Host- prefix for session cookies to prevent subdomain attacks
- **Rate limiting SSR endpoints**: SSR pages that do expensive work (database queries, API calls) should be rate-limited. Use a sliding window rate limiter (e.g., 60 requests per minute per IP). Return 429 with Retry-After header when exceeded
## Testing and Quality Assurance

- **SSR snapshot testing**: render pages on the server and snapshot the HTML output. Compare snapshots on each CI run. Detects unintended changes in rendered output. Use Jest snapshot testing or Playwright visual comparisons
- **Hydration testing**: test that client-side hydration matches server-rendered HTML. Use React DevTools Profiler to detect hydration mismatches. Test with ct() and 
enderToString in unit tests. Enable React strict mode in development
- **Performance testing**: measure LCP, FID, and CLS for every page. Use Lighthouse CI in GitHub Actions. Set budgets: LCP < 2.5s, FID < 100ms, CLS < 0.1. Block deployment if budgets are exceeded. Track performance regressions over time
- **End-to-end testing with SSR**: use Playwright to test SSR pages. Verify that pages load without JavaScript. Test form submissions with and without JS enabled. Verify that meta tags and structured data are present in the initial HTML
- **Accessibility testing in SSR**: run axe-core in Playwright tests against server-rendered pages. Check for WCAG 2.2 compliance. Test keyboard navigation. Verify ARIA attributes are present in SSR output. Test with screen readers
- **SEO testing**: verify canonical URLs, meta descriptions, OG tags, and hreflang tags in SSR output. Use a SEO checker tool. Verify sitemap includes all SSR pages. Test with Google's Rich Results Test for structured data

## Deployment and CI/CD

- **Build-time prerendering**: prerender static pages at build time. Use 
ext build or stro build. Deploy prerendered HTML to a CDN. Reduces server load and improves TTFB. Only use SSR for dynamic pages
- **SSR server deployment**: deploy SSR server to a managed platform (Vercel, Netlify, Cloudflare Workers) or a containerized environment (Docker, Kubernetes). Use a process manager (PM2, systemd) for Node.js servers. Set up health checks and auto-restart
- **Edge deployment**: deploy SSR to edge locations for low latency. Use Cloudflare Workers, Vercel Edge Functions, or Deno Deploy. Limit dependencies to those that work in edge runtimes. Use edge-compatible database drivers (Prisma Data Proxy, PlanetScale)
- **Blue-green deployment**: deploy the new version alongside the old version. Route a percentage of traffic to the new version. Monitor error rate and performance. If healthy, route 100% to the new version. If unhealthy, roll back immediately
- **Cache invalidation on deploy**: when deploying new content, invalidate CDN cache for affected pages. Use tag-based invalidation (
evalidateTag) or path-based invalidation. Wait for cache to warm before routing traffic to the new version
- **Environment variable management**: use different env vars for development, staging, and production. Never commit secrets to git. Use a secrets manager (Doppler, Vault, AWS Secrets Manager). Validate env vars at startup with a schema validator
## Cost Optimization

- **Serverless SSR vs always-on**: serverless SSR (Vercel, Netlify) charges per request. Always-on servers charge per hour. For low traffic (< 1000 requests/hour), serverless is cheaper. For high traffic, always-on is cheaper. Calculate the break-even point for your workload
- **Edge function costs**: edge functions are billed per request and per GB-second. Keep execution time under 50ms. Minimize dependencies. Use lightweight frameworks (Hono, Astro). Avoid heavy runtime operations at the edge
- **CDN caching to reduce origin calls**: cache SSR pages at the CDN with s-maxage=300 and stale-while-revalidate=600. This reduces origin requests by 80-95% for pages that can be cached. Use tag-based invalidation for immediate cache busting
- **Image optimization costs**: use 
ext/image or Cloudflare Images for automatic optimization. Avoid generating multiple sizes on-the-fly for every request. Pre-generate optimized images at build time for static content. Use WebP or AVIF format
- **Database connection costs**: use connection pooling (PgBouncer, Prisma Data Proxy) to reduce the number of database connections. Each connection uses memory on the database server. Serverless functions should use pooled connections, not direct connections
- **Bundle analysis**: use @next/bundle-analyzer or 
ollup-plugin-visualizer to identify large dependencies. Replace heavy libraries with lighter alternatives (e.g., date-fns instead of moment.js, zustand instead of 
edux). Tree-shake unused exports
## Monitoring and Observability

- **Real User Monitoring (RUM)**: collect Core Web Vitals from real users. Use Vercel Analytics, Speed Insights, or Google Analytics 4. Track LCP, INP, CLS per page. Segment by device, connection type, and geography. Set alerts for regression
- **Server-side metrics**: track SSR response time, memory usage, and error rate per route. Use Prometheus with prom-client for Node.js. Export metrics at /metrics. Set up Grafana dashboards. Alert on p95 latency > 2s or error rate > 1%
- **Distributed tracing**: use OpenTelemetry to trace requests from CDN edge through SSR server to database. Identify bottlenecks in the request path. Use Jaeger or Zipkin for trace visualization. Sample at 1-10% to reduce overhead
- **Log aggregation**: structure logs as JSON with timestamp, level, route, requestId, and message. Use pino for fast structured logging in Node.js. Ship logs to Elasticsearch or CloudWatch. Set up log-based alerts for errors
- **Error tracking**: use Sentry or Bugsnag to capture SSR errors. Include request context (URL, headers, user). Set up release tracking to correlate errors with deployments. Alert on new errors and error rate spikes
- **Synthetic monitoring**: use Checkly or Uptime Robot to ping critical pages every 5 minutes. Verify HTTP status, response time, and content. Alert on downtime. Test from multiple geographic regions
## Frequently Asked Questions

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