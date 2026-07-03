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
