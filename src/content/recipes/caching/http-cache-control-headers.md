---
contentType: recipes
slug: http-cache-control-headers
title: "HTTP Cache-Control Headers for APIs and Static Assets"
description: "Set Cache-Control, ETag, and Last-Modified headers to control browser and CDN caching for API responses and static assets"
metaDescription: "Configure HTTP Cache-Control headers for APIs and static assets. Use ETag, Last-Modified, max-age, and stale-while-revalidate for CDN caching."
difficulty: beginner
topics:
  - caching
  - performance
tags:
  - http
  - cache-control
  - headers
  - cdn
  - caching
relatedResources:
  - /recipes/caching/redis-cache-aside-pattern
  - /patterns/caching/cache-aside-pattern
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configure HTTP Cache-Control headers for APIs and static assets. Use ETag, Last-Modified, max-age, and stale-while-revalidate for CDN caching."
  keywords:
    - http cache-control
    - cache headers
    - etag
    - cdn caching
    - http caching
---

# Configure HTTP Cache-Control Headers for APIs and Static Assets

HTTP caching headers tell browsers and CDNs how long to cache a response, when to revalidate, and whether the response can be served from a shared cache. Properly configured headers reduce latency, lower origin load, and improve Core Web Vitals. The solution below covers `Cache-Control`, `ETag`, `Last-Modified`, and `stale-while-revalidate` for both API responses and static assets.

## When to Use This

- Serving static assets (JS, CSS, images, fonts) that change infrequently
- API responses that are the same for all users or change at predictable intervals
- Any response that benefits from CDN edge caching

## Prerequisites

- A web server or framework that lets you set response headers
- Basic understanding of HTTP request/response cycle

## Solution

### 1. Static Assets — Long Cache with Immutable

Static assets with content hashes in filenames can be cached aggressively:

```nginx
# nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

```typescript
// Express.js
app.use(express.static("public", {
  maxAge: "1y",
  setHeaders: (res, path) => {
    if (path.endsWith(".js") || path.endsWith(".css")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
}));
```

The `immutable` flag tells the browser to never revalidate — the filename changes when the content changes (e.g., `app.abc123.js`).

### 2. API Responses — Short Cache with Revalidation

```typescript
// Express.js — cache API responses for 60 seconds with revalidation
app.get("/api/products", async (req, res) => {
  const products = await getProducts();

  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json(products);
});

// No caching for user-specific data
app.get("/api/users/me", authMiddleware, async (req, res) => {
  const user = await getUser(req.userId);

  res.setHeader("Cache-Control", "private, no-cache");
  res.json(user);
});
```

### 3. ETag for Conditional Requests

```typescript
import crypto from "crypto";

app.get("/api/products", async (req, res) => {
  const products = await getProducts();
  const etag = `"${crypto.createHash("sha256").update(JSON.stringify(products)).digest("hex").slice(0, 16)}"`;

  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }

  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(products);
});
```

The client sends `If-None-Match: "<etag>"` on subsequent requests. If the ETag matches, the server returns `304 Not Modified` with no body — the client uses its cached copy.

### 4. Last-Modified for Conditional Requests

```typescript
app.get("/api/articles/:id", async (req, res) => {
  const article = await getArticle(req.params.id);
  const lastModified = new Date(article.updatedAt).toUTCString();

  if (req.headers["if-modified-since"] === lastModified) {
    return res.status(304).end();
  }

  res.setHeader("Last-Modified", lastModified);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(article);
});
```

### 5. stale-while-revalidate for Background Refresh

```typescript
app.get("/api/trending", async (req, res) => {
  const data = await getTrending();

  // Cache for 60s, then serve stale for up to 300s while revalidating
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=300"
  );
  res.json(data);
});
```

The CDN serves the cached response for 60 seconds. Between 60-360 seconds, it serves the stale response while fetching a fresh copy in the background.

### 6. Python / FastAPI Example

```python
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
import hashlib
import json

app = FastAPI()

app.mount("/static", StaticFiles(directory="public", max_age=31536000), name="static")

@app.get("/api/products")
async def get_products(request: Request):
    products = await fetch_products()
    body = json.dumps(products, default=str)
    etag = f'"{hashlib.sha256(body.encode()).hexdigest()[:16]}"'

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304)

    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            "ETag": etag,
        },
    )
```

## How It Works

1. **`max-age`** — the number of seconds the response is considered fresh. The browser serves from cache without revalidation during this period.
2. **`public`** — allows shared caches (CDNs, proxies) to store the response. Use `private` for user-specific data.
3. **`immutable`** — tells the browser the response will never change during its freshness lifetime, skipping conditional revalidation entirely.
4. **`ETag`** — a content fingerprint. The client sends `If-None-Match` on subsequent requests; a match returns `304 Not Modified`.
5. **`stale-while-revalidate`** — after `max-age` expires, the CDN serves stale content while fetching a fresh copy asynchronously, eliminating latency for the user.

## Variants

### No-Store for Sensitive Data

```typescript
app.get("/api/user/billing", authMiddleware, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(billingData);
});
```

`no-store` prevents any cache — browser, CDN, or proxy — from storing the response.

### Vary Header for Content Negotiation

```typescript
app.get("/api/products", (req, res) => {
  res.setHeader("Vary", "Accept-Encoding, Accept-Language");
  res.setHeader("Cache-Control", "public, max-age=300");
  // Response varies by encoding (gzip, br) and language
  res.json(products);
});
```

### Surrogate-Control for CDN-Specific Caching

```typescript
res.setHeader("Surrogate-Control", "max-age=3600");
res.setHeader("Cache-Control", "max-age=60");
```

CDNs use the longer `Surrogate-Control` TTL, while browsers use the shorter `Cache-Control` TTL.

## Best Practices

- **Hash filenames for static assets** — enables `immutable` caching with `max-age=31536000`
- **Use `no-store` for sensitive data** — billing, auth tokens, personal information
- **Set `Vary` correctly** — omitting `Accept-Encoding` causes compressed and uncompressed responses to collide in cache
- **Use `stale-while-revalidate` for APIs** — eliminates user-facing latency during revalidation

## Common Mistakes

- **Caching user-specific responses with `public`** — leaks data between users through the CDN
- **Setting `max-age=0` without `no-cache`** — `max-age=0` forces revalidation but still stores the response; `no-store` prevents storage
- **Forgetting `Vary: Accept-Encoding`** — a gzipped response cached for a client that doesn't support gzip causes errors
- **Using `Expires` instead of `Cache-Control`** — `Expires` is HTTP/1.0 and less flexible; prefer `Cache-Control`

## FAQ

**Q: What is the difference between `no-cache` and `no-store`?**
A: `no-cache` stores the response but requires revalidation before use. `no-store` prevents storage entirely. Use `no-store` for sensitive data.

**Q: Should I use ETag or Last-Modified?**
A: ETag is more precise (content hash vs. timestamp). Use both — clients that support ETag use it; others fall back to Last-Modified.

**Q: How long should I cache static assets?**
A: One year (`max-age=31536000`) with `immutable` if filenames are content-hashed. Otherwise, use a shorter TTL with revalidation.

**Q: Does `stale-while-revalidate` work in browsers?**
A: It works in Chrome and Firefox. Safari ignores it. CDNs like Cloudflare and Fastly support it regardless of browser.

### How do I invalidate cached responses?

Use `Cache-Control: no-cache` with `ETag` validation. When the resource changes, the server returns a new ETag, forcing the client to revalidate. For CDN invalidation, use the CDN's purge API (e.g., `POST /purge` on Cloudflare). Tag-based purging lets you invalidate groups of URLs by cache-tag (e.g., `user-123`). Avoid `Clear-Site-Data` for cache invalidation — it clears everything including cookies and storage.

### How do I handle caching for authenticated requests?

Set `Cache-Control: private` so shared caches (CDNs, proxies) do not store user-specific responses. Use `Vary: Authorization` to ensure the cache key includes the auth header. For user-specific data that changes rarely, use `stale-while-revalidate=60` so the client serves stale data while revalidating in the background. Never cache responses containing tokens or session IDs in shared caches.

### What is the difference between `max-age` and `s-maxage`?

`max-age` applies to all caches (browser and CDN). `s-maxage` applies only to shared caches (CDNs, proxies) and overrides `max-age` for them. Use `s-maxage=600, max-age=60` to let CDNs cache for 10 minutes while browsers revalidate every minute. This pattern is useful for APIs where data changes frequently but can tolerate short staleness.

### How do I cache API responses with query parameters?

The cache key includes the full URL with query string by default. Ensure `Vary: Accept` if responses vary by content type. For pagination, cache each page separately by including the cursor or page number in the URL. Avoid caching responses with mutable query parameters like timestamps or random nonces — they create unique cache entries that are never reused.

### How do I implement cache busting for hashed assets?

Use content-hash in filenames: `app.a1b2c3d4.js`. Set `Cache-Control: public, max-age=31536000, immutable` for these files. When the file content changes, the hash changes, creating a new URL that the browser fetches fresh. Reference the hashed filenames in your HTML, which should use `no-cache` so the browser always gets the latest references.

### How do I debug caching issues?

Use `curl -I` to inspect response headers. Check `Cache-Control`, `ETag`, `Last-Modified`, `Age`, and `X-Cache` headers. Browser DevTools Network tab shows cache hit/miss status. Use the `Cache-Control: no-cache` header in a request to force revalidation. For CDN issues, check the CDN's dashboard for cache hit ratios and edge locations serving stale content.

### How do I handle caching with Vary headers?

`Vary` tells caches which request headers affect the response. `Vary: Accept-Encoding` caches gzip and brotli responses separately. `Vary: Accept` caches JSON and HTML responses separately. Avoid `Vary: *` — it disables caching entirely. Over-specifying `Vary` (e.g., `Vary: User-Agent`) fragments cache keys and reduces hit rates. Use `Vary: Accept, Accept-Encoding` for APIs that return multiple content types.

### How do I use surrogate keys for CDN cache invalidation?

Surrogate keys (or cache tags) let you invalidate groups of URLs with a single request. Add `Cache-Tag: user-123, posts` to responses. When user 123 updates their profile, send a purge request for the `user-123` tag. Cloudflare and Fastly support this natively. This is more efficient than purging individual URLs — a single tag purge can invalidate thousands of cached responses.

### How do I handle cache for Server-Side Rendered pages?

Set `Cache-Control: public, max-age=300, s-maxage=3600` for SSR pages. The browser revalidates every 5 minutes while the CDN serves cached HTML for 1 hour. Use `stale-while-revalidate=60` so the CDN serves stale HTML while fetching a fresh render in the background. For personalized SSR pages, use `Cache-Control: private, no-cache` and rely on client-side hydration for user-specific content.

### How do I handle caching for API versioning?

When you version your API (e.g., `/v1/users` vs `/v2/users`), each version has its own cache namespace naturally. Include the version in the URL path rather than in a header so caches key on it correctly. Set `Cache-Control: no-store` for deprecated API versions to prevent stale caching. When deprecating a version, set a sunset date in the `Deprecation` header and `Sunset` header so clients know when to migrate.

### How do I handle caching with CORS?

CORS preflight responses (`OPTIONS` requests) can be cached with `Access-Control-Max-Age: 86400` (24 hours). This tells the browser to skip preflight for same-origin requests within that period. Set `Vary: Origin` if your server returns different CORS headers per origin. Do not cache actual CORS responses with `Access-Control-Allow-Origin: *` alongside `Vary: Origin` — this creates conflicting cache entries.

### What is the `Age` header?

The `Age` header indicates how long (in seconds) a response has been cached by a CDN or proxy. It increments while the response sits in cache. Use `Age` to debug stale content — if `Age` exceeds `max-age`, the response is stale and should be revalidated. CDNs set this header automatically. Browsers do not set `Age` — it is a shared-cache-only header. Check `Age` alongside `X-Cache` (HIT/MISS) to understand cache behavior end-to-end.

### How do I handle caching for A/B testing?

Use `Vary: Cookie` if the A/B variant is set via a cookie. Alternatively, include the experiment variant in the URL (e.g., `?variant=b`) so each variant gets its own cache entry. Do not use `Vary: User-Agent` for A/B testing — it fragments the cache. Set `Cache-Control: private` if the variant is user-specific. For server-side A/B testing, inject the variant assignment before the CDN cache layer so the CDN caches each variant separately.
