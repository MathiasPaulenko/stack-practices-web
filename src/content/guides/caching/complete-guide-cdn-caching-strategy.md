---
contentType: guides
slug: complete-guide-cdn-caching-strategy
title: "Complete Guide to CDN Caching Strategy"
description: "Design CDN caching for web applications and APIs. Covers edge caching, cache keys, cache headers, invalidation strategies, surrogate keys, and multi-CDN setups for global performance."
metaDescription: "Design CDN caching for web apps and APIs. Covers edge caching, cache keys, headers, invalidation, surrogate keys, and multi-CDN setups for global performance."
difficulty: advanced
topics:
  - caching
  - performance
  - infrastructure
tags:
  - cdn
  - caching
  - guide
  - edge-caching
  - cache-keys
  - invalidation
  - surrogate-keys
  - cloudflare
relatedResources:
  - /guides/caching/complete-guide-redis-caching-strategies
  - /guides/api/complete-guide-graphql-caching
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Design CDN caching for web apps and APIs. Covers edge caching, cache keys, headers, invalidation, surrogate keys, and multi-CDN setups for global performance."
  keywords:
    - cdn caching strategy
    - edge caching
    - cache keys
    - cache headers
    - cache invalidation
    - surrogate keys
    - multi-cdn
---

## Introduction

A Content Delivery Network (CDN) caches your content at edge locations close to users. When a user in Tokyo requests a page served from a data center in Virginia, the CDN serves it from a Tokyo edge node instead. This reduces latency from 200ms to 20ms. But CDN caching only works if you configure it correctly. Poor cache key design, missing cache headers, or aggressive invalidation can make the CDN useless. The following walks through everything you need to design a CDN caching strategy that works.

## How CDN Caching Works

```text
User (Tokyo) → CDN Edge (Tokyo) → Origin (Virginia)
                    ↓
              Cache HIT → Return cached response (20ms)
              Cache MISS → Fetch from origin, cache, return (200ms)
```

1. User requests a URL (e.g., `https://example.com/image.jpg`)
2. CDN checks if the response is cached at the nearest edge node
3. If cached (HIT): return the cached response immediately
4. If not cached (MISS): fetch from origin, store at edge, return to user
5. Subsequent requests for the same URL are served from cache until TTL expires

## Cache Headers

CDNs use HTTP cache headers to determine what to cache and for how long.

### Cache-Control

The `Cache-Control` header is the primary directive for CDN caching.

```http
Cache-Control: public, max-age=3600
```

- `public`: Any cache (CDN, browser) can store the response
- `private`: Only the browser can store the response (not the CDN)
- `max-age=N`: Cache for N seconds
- `s-maxage=N`: Cache for N seconds in shared caches (CDN) only
- `no-cache`: Must revalidate with origin before using cached copy
- `no-store`: Do not cache at all
- `must-revalidate`: Do not serve stale response after expiry
- `stale-while-revalidate=N`: Serve stale while revalidating in background

### Setting Headers by Content Type

```nginx
# nginx configuration

# Static assets: long cache, immutable
location ~* \.(css|js|png|jpg|jpeg|gif|svg|woff2?)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# HTML pages: short cache, must revalidate
location ~* \.html$ {
    add_header Cache-Control "public, max-age=60, must-revalidate";
}

# API responses: no cache by default
location /api/ {
    add_header Cache-Control "no-store";
}

# Public API responses: short cache
location /api/public/ {
    add_header Cache-Control "public, max-age=60";
}
```

### ETag and Last-Modified

`ETag` and `Last-Modified` enable conditional requests. When the CDN's cached copy expires, it sends a conditional request to the origin with `If-None-Match` or `If-Modified-Since`. If the content has not changed, the origin returns `304 Not Modified` (no body), and the CDN refreshes the cached copy's TTL.

```http
# First request
HTTP/1.1 200 OK
ETag: "abc123"
Last-Modified: Wed, 04 Jul 2026 12:00:00 GMT
Cache-Control: public, max-age=3600
Content: <html>...</html>

# Subsequent request (after TTL expires)
GET /page
If-None-Match: "abc123"
If-Modified-Since: Wed, 04 Jul 2026 12:00:00 GMT

# Origin response
HTTP/1.1 304 Not Modified
Cache-Control: public, max-age=3600
# No body — CDN keeps cached copy
```

## Cache Keys

The cache key determines whether two requests hit the same cached response. By default, the cache key is the full URL including query string. But you can customize it.

### Default Cache Key

```
Cache key: https://example.com/page?utm_source=email&utm_campaign=summer
```

Two requests with different `utm_source` values produce different cache keys, even though the content is identical. This wastes cache space.

### Normalizing Cache Keys

Remove tracking parameters that do not affect content:

```javascript
// Cloudflare Worker: normalize cache key
addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Remove tracking parameters
  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
  for (const param of trackingParams) {
    url.searchParams.delete(param);
  }
  
  // Use normalized URL as cache key
  event.respondWith(fetch(url.toString()));
});
```

### Vary Header

The `Vary` header tells the CDN to include additional request headers in the cache key. This is needed when the response differs based on request headers.

```http
Vary: Accept-Encoding, Accept-Language
```

This creates separate cache entries for different encodings (gzip, br) and languages (en, es). Without `Vary`, a user requesting Spanish might get the cached English response.

### Cache Key Composition

```text
Full cache key = URL + Vary headers + Custom keys
```

Design your cache key to include everything that affects the response and nothing that does not.

## Invalidation Strategies

### TTL-Based Expiration

Set a TTL on cached content. After the TTL expires, the CDN revalidates with the origin. Simple but serves stale content for up to the TTL duration.

```http
Cache-Control: public, max-age=300
```

### Purge by URL

Explicitly remove a URL from the CDN cache. Use this when content changes before the TTL expires.

```bash
# Cloudflare purge by URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{"files": ["https://example.com/page1", "https://example.com/page2"]}'
```

```bash
# Fastly purge by URL
curl -X POST "https://api.fastly.com/purge/{service_id}" \
  -H "Fastly-Key: {api_key}" \
  -d "https://example.com/page1"
```

### Purge by Surrogate Key

Tag cached responses with surrogate keys. Purge by key to remove all tagged responses in one call. This is more efficient than purging individual URLs.

```http
# Response headers
Surrogate-Key: product-42 products category-5
Cache-Control: public, max-age=3600
```

```bash
# Fastly purge by surrogate key
curl -X POST "https://api.fastly.com/purge/{service_id}" \
  -H "Fastly-Key: {api_key}" \
  -H "Surrogate-Key: product-42"
```

This purges all responses tagged with `product-42` across the entire CDN.

### Purge All

Purge everything from the CDN. Use sparingly: it causes a spike in origin traffic as all requests become cache misses.

```bash
# Cloudflare purge everything
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'
```

### Event-Driven Invalidation

Trigger CDN purge when data changes in your backend.

```python
import requests

def update_product(product_id: int, data: dict):
    product = db.products.update(product_id, data)
    
    # Purge CDN cache for this product
    requests.post(
        "https://api.fastly.com/purge/{service_id}",
        headers={"Fastly-Key": API_KEY},
        data={"surrogate_keys": [f"product-{product_id}", "products"]}
    )
    
    return product
```

## Stale Content Strategies

### stale-while-revalidate

Serve stale content while fetching a fresh copy in the background. Users get instant responses; the cache updates asynchronously.

```http
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

For 300 seconds, serve from cache. From 300-360 seconds, serve stale while revalidating. After 360 seconds, fetch from origin synchronously.

### stale-if-error

Serve stale content if the origin is unavailable. This provides resilience during origin outages.

```http
Cache-Control: public, max-age=300, stale-if-error=86400
```

If the origin returns an error (5xx) after the cache expires, serve the stale cached content for up to 86400 seconds (1 day).

## Caching Different Content Types

### Static Assets (CSS, JS, Images)

Cache for a long time with content-based filenames. Use fingerprinting (hash in filename) so new versions get new URLs.

```http
Cache-Control: public, max-age=31536000, immutable
```

```html
<!-- Versioned URLs -->
<link rel="stylesheet" href="/css/main.a1b2c3d4.css">
<script src="/js/app.e5f6g7h8.js"></script>
```

### HTML Pages

Cache for a short time with revalidation. Content changes frequently but should be fresh.

```http
Cache-Control: public, max-age=60, must-revalidate
ETag: "abc123"
```

### API Responses

Cache public API responses with short TTLs. Do not cache authenticated or user-specific responses.

```http
# Public product list
Cache-Control: public, max-age=60

# User-specific data
Cache-Control: private, no-cache

# Real-time data
Cache-Control: no-store
```

### Authentication and CDN Caching

Authenticated responses must not be cached by the CDN. Use `private` or `no-store` for any response that includes user-specific data.

```http
# User profile (private)
Cache-Control: private, no-cache
Set-Cookie: session=abc123; HttpOnly; Secure

# Public product (cacheable)
Cache-Control: public, max-age=3600
```

## Multi-CDN Strategy

For global applications, use multiple CDNs to optimize cost, performance, and availability.

### CDN Selection by Geography

Route users to the CDN with the best performance in their region.

```javascript
// DNS-based CDN routing (using a DNS provider like NS1 or Route 53)
const cdnRoutes = {
  "asia": "cdn-asia.example.com",     // Cloudflare (strong in Asia)
  "europe": "cdn-europe.example.com",  // Fastly (strong in Europe)
  "default": "cdn-global.example.com", // Cloudfront (global)
};
```

### CDN Selection by Content Type

Route static assets to one CDN and dynamic content to another.

```text
Static assets (CSS, JS, images) → CDN A (cheaper, longer TTL)
Dynamic content (API, HTML) → CDN B (faster origin, shorter TTL)
```

### Failover

If one CDN goes down, route traffic to the backup CDN.

```bash
# Health check script
if ! curl -s --max-time 5 https://cdn-a.example.com/health; then
  # Update DNS to route to CDN B
  aws route53 change-resource-record-sets \
    --hosted-zone-id Z123 \
    --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"cdn.example.com","Type":"CNAME","TTL":60,"ResourceRecords":[{"Value":"cdn-b.example.com"}]}}]}'
fi
```

## Monitoring CDN Performance

### Key Metrics

- **Cache hit ratio**: `hits / (hits + misses)` — should be above 90% for static content
- **Origin shield ratio**: percentage of requests served from origin shield without hitting origin
- **Edge response time**: p50, p95, p99 for edge-served responses
- **Origin response time**: p50, p95, p99 for origin fetches
- **Purge latency**: time from purge request to cache invalidation
- **Bandwidth**: CDN-served bandwidth vs origin-served bandwidth

### Cache Hit Ratio Calculation

```text
Cache Hit Ratio = Cache Hits / (Cache Hits + Cache Misses) * 100
```

A 95% hit ratio means 95 out of 100 requests are served from cache. The remaining 5 go to the origin. Track this per content type:

| Content Type | Target Hit Ratio | Typical TTL |
|--------------|-----------------|-------------|
| Static assets | 99%+ | 1 year |
| HTML pages | 80-90% | 1-5 minutes |
| Public API | 60-80% | 30-60 seconds |
| Private API | 0% (no cache) | N/A |

## Production Checklist

- [ ] Cache-Control headers set for all content types
- [ ] ETag or Last-Modified headers for conditional requests
- [ ] Cache keys normalized (tracking parameters removed)
- [ ] Vary header set for content negotiation (encoding, language)
- [ ] Surrogate keys for targeted purging
- [ ] Event-driven purge on data changes
- [ ] stale-while-revalidate for graceful staleness
- [ ] stale-if-error for origin outage resilience
- [ ] Static assets use fingerprinted filenames
- [ ] Authenticated responses marked private or no-store
- [ ] Cache hit ratio monitored per content type
- [ ] Purge latency monitored
- [ ] Origin shield configured to reduce origin load
- [ ] Failover plan for CDN outage

## FAQ

### What is the difference between browser cache and CDN cache?

Browser cache is stored on the user's device. It reduces requests to the CDN. CDN cache is stored on edge servers. It reduces requests to the origin. Both layers work together: browser cache serves repeat visits, CDN cache serves first visits from any user in the same region.

### Should I cache HTML pages on the CDN?

Yes, with a short TTL (1-5 minutes). HTML pages are expensive to generate server-side. Caching them for even 1 minute reduces origin load considerably. Use `must-revalidate` and ETags so the CDN revalidates efficiently.

### How do I handle user-specific content with a CDN?

Do not cache user-specific content on the CDN. Mark it `private` or `no-store`. For pages with a mix of public and private content, use Edge Side Includes (ESI) or client-side rendering for the personalized parts, and cache the public parts on the CDN.

### What is an origin shield?

An origin shield is a CDN cache layer between the edge nodes and your origin. All edge nodes fetch from the shield, and the shield fetches from the origin. This reduces origin load: if 100 edge nodes request the same content, only 1 request reaches the origin (from the shield).

### How long should I cache static assets?

Cache static assets for 1 year (`max-age=31536000`). Use fingerprinted filenames (hash in filename) so new versions get new URLs. When you deploy a new version, the URL changes, and the CDN fetches the new file. Old URLs remain cached for users who have not updated.

### What is the best CDN for my use case?

Depends on your priorities. Cloudflare has the widest edge network and a generous free tier. Fastly offers instant purging and surrogate keys. CloudFront integrates well with AWS. Akamai is strong for enterprise and large-scale delivery. Test multiple CDNs with real users to find the best fit.
