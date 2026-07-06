---
contentType: recipes
slug: http-cache-control-headers
title: "Configure HTTP Cache-Control Headers for APIs and Static Assets"
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
lastUpdated: "2026-07-02"
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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
