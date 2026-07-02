---
contentType: recipes
slug: cdn-cache-invalidation-strategies
title: "CDN Cache Invalidation Strategies and Patterns"
description: "Implement CDN cache invalidation using purge APIs, surrogate keys, tag-based invalidation, and versioned URLs to keep content fresh"
metaDescription: "Invalidate CDN caches with purge APIs, surrogate keys, and tag-based invalidation. Use versioned URLs and soft purges to keep content fresh without spikes."
difficulty: intermediate
topics:
  - caching
  - performance
tags:
  - cdn
  - cache invalidation
  - cloudflare
  - fastly
  - performance
relatedResources:
  - /recipes/caching/http-cache-control-headers
  - /recipes/caching/redis-cache-aside-pattern
  - /patterns/caching/cdn-cache-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Invalidate CDN caches with purge APIs, surrogate keys, and tag-based invalidation. Use versioned URLs and soft purges to keep content fresh without spikes."
  keywords:
    - cdn cache invalidation
    - cdn purge
    - surrogate keys
    - tag-based invalidation
    - cdn caching
---

# CDN Cache Invalidation Strategies and Patterns

CDN caching reduces latency and origin load, but cached content can become stale. Invalidation tells the CDN to fetch a fresh copy from the origin. This recipe covers four invalidation strategies — URL purge, surrogate key (tag-based) invalidation, versioned URLs, and soft purge — with code examples for Cloudflare and Fastly.

## When to Use This

- Content updates that must appear immediately (news, pricing, product inventory)
- Deployments where old assets should not persist at the edge
- Multi-page sites where updating one page should invalidate related pages

## Prerequisites

- A CDN provider (Cloudflare, Fastly, AWS CloudFront, or similar)
- API credentials for the CDN

## Solution

### 1. URL Purge — Invalidate Specific URLs

**Cloudflare:**

```python
import httpx

CLOUDFLARE_API = "https://api.cloudflare.com/client/v4"

async def purge_cloudflare_urls(zone_id: str, api_token: str, urls: list[str]) -> dict:
    """Purge specific URLs from Cloudflare's cache.

    Args:
        zone_id: Cloudflare zone ID.
        api_token: API token with purge permission.
        urls: List of URLs to purge.

    Returns:
        API response dict.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CLOUDFLARE_API}/zones/{zone_id}/purge_cache",
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
            json={"files": urls},
        )
        return response.json()

# Usage
await purge_cloudflare_urls(
    zone_id="abc123",
    api_token="token",
    urls=["https://example.com/page1", "https://example.com/page2"],
)
```

**Fastly:**

```python
FASTLY_API = "https://api.fastly.com"

async def purge_fastly_urls(service_id: str, api_key: str, urls: list[str]) -> list[dict]:
    """Purge specific URLs from Fastly's cache."""
    results = []
    async with httpx.AsyncClient() as client:
        for url in urls:
            response = await client.post(
                f"{FASTLY_API}/purge/{url}",
                headers={"Fastly-Key": api_key},
            )
            results.append(response.json())
    return results
```

### 2. Surrogate Key Invalidation — Tag-Based Purge

Surrogate keys let you tag related URLs and invalidate them with one API call. This is ideal when updating a product should invalidate its product page, category page, and search results.

**Fastly (native surrogate keys):**

```python
# In your origin response headers:
# Surrogate-Key: product-123 category-456

async def purge_fastly_key(service_id: str, api_key: str, surrogate_key: str) -> dict:
    """Purge all URLs tagged with a surrogate key."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{FASTLY_API}/service/{service_id}/purge/{surrogate_key}",
            headers={"Fastly-Key": api_key},
        )
        return response.json()

# Usage — purge all pages related to product-123
await purge_fastly_key("svc123", "key", "product-123")
```

**Cloudflare (Cache Tags):**

```python
# In your origin response headers:
# Cache-Tag: product-123, category-456

async def purge_cloudflare_tags(zone_id: str, api_token: str, tags: list[str]) -> dict:
    """Purge all URLs with matching cache tags."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CLOUDFLARE_API}/zones/{zone_id}/purge_cache",
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
            json={"tags": tags},
        )
        return response.json()
```

### 3. Versioned URLs — Content-Hash Invalidation

Instead of purging, change the URL when content changes. This eliminates invalidation entirely:

```typescript
// Build step — generate content-hashed asset URLs
import crypto from "crypto";
import fs from "fs";

function generateVersionedAsset(filePath: string): string {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);
  const ext = filePath.split(".").pop();
  const base = filePath.replace(/\.\w+$/, "");
  return `${base}.${hash}.${ext}`;
}

// app.js → app.a1b2c3d4.js
// When content changes, the hash changes, and the CDN fetches the new URL
```

```html
<!-- HTML references the hashed filename -->
<script src="/assets/app.a1b2c3d4.js"></script>
<link rel="stylesheet" href="/assets/styles.e5f6g7h8.css" />
```

### 4. Soft Purge — Graceful Invalidation

Soft purge marks cached content as stale instead of deleting it. The CDN serves the stale content while fetching a fresh copy in the background, avoiding origin spikes.

**Fastly Soft Purge:**

```python
async def soft_purge_fastly(service_id: str, api_key: str, surrogate_key: str) -> dict:
    """Soft purge — mark as stale, serve while refreshing."""
    async with httpx.AsyncClient() as client:
        response = await client.request(
            "POST",
            f"{FASTLY_API}/service/{service_id}/purge/{surrogate_key}",
            headers={
                "Fastly-Key": api_key,
                "Fastly-Soft-Purge": "1",
                "Fastly-Soft-Purge-TTL": "30",
            },
        )
        return response.json()
```

### 5. Automated Invalidation on Deploy

```python
import os

async def invalidate_on_deploy():
    """Purge CDN cache after a deployment."""
    cdn = os.getenv("CDN_PROVIDER")
    service_id = os.getenv("CDN_SERVICE_ID")
    api_key = os.getenv("CDN_API_KEY")

    if cdn == "fastly":
        # Purge everything via surrogate key "all"
        await purge_fastly_key(service_id, api_key, "all")
    elif cdn == "cloudflare":
        zone_id = os.getenv("CLOUDFLARE_ZONE_ID")
        api_token = os.getenv("CLOUDFLARE_API_TOKEN")
        # Purge everything
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{CLOUDFLARE_API}/zones/{zone_id}/purge_cache",
                headers={"Authorization": f"Bearer {api_token}"},
                json={"purge_everything": True},
            )

    print("CDN cache invalidated after deploy")
```

## How It Works

1. **URL purge** sends an API call to the CDN to delete specific URLs from edge cache. The next request fetches from the origin.
2. **Surrogate keys** (Fastly) and **cache tags** (Cloudflare) group URLs by tag. Purging a tag invalidates all URLs with that tag in one call, avoiding the need to enumerate every URL.
3. **Versioned URLs** eliminate invalidation — the URL changes when content changes, so the CDN always fetches the new file. Old URLs remain cached until their TTL expires.
4. **Soft purge** sets the cached object's TTL to a short value (e.g., 30 seconds) instead of deleting it. The CDN serves stale content while asynchronously fetching a fresh copy.

## Variants

### AWS CloudFront Invalidation

```python
import boto3

def invalidate_cloudfront(distribution_id: str, paths: list[str]) -> dict:
    """Create a CloudFront invalidation."""
    client = boto3.client("cloudfront")
    response = client.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "Paths": {
                "Quantity": len(paths),
                "Items": paths,
            },
            "CallerReference": str(int(time.time())),
        },
    )
    return response
```

### Selective Invalidation by Content Type

```python
async def invalidate_product(product_id: str):
    """Invalidate all cache entries related to a product."""
    tags = [
        f"product-{product_id}",
        f"category-{get_product_category(product_id)}",
        "search-results",
        "product-feed",
    ]
    await purge_cloudflare_tags(zone_id, api_token, tags)
```

### Invalidation Webhook

```python
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.post("/webhook/cdn-invalidate")
async def invalidate_webhook(request: Request):
    """Webhook endpoint for CMS-triggered invalidation."""
    payload = await request.json()
    if payload.get("secret") != os.getenv("WEBHOOK_SECRET"):
        raise HTTPException(status_code=403)

    if payload["type"] == "product_updated":
        await invalidate_product(payload["product_id"])
    elif payload["type"] == "full_deploy":
        await invalidate_on_deploy()

    return {"status": "ok"}
```

## Best Practices

- **Use surrogate keys for related content** — purging one key invalidates all related URLs without enumerating them
- **Prefer versioned URLs for static assets** — eliminates the need for invalidation entirely
- **Use soft purge for high-traffic pages** — avoids origin spikes from simultaneous cache misses
- **Batch purge requests** — most CDNs rate-limit purge API calls; batch URLs or use tags

## Common Mistakes

- **Purging everything on every deploy** — causes origin spikes; use surrogate keys for targeted invalidation
- **Not setting `Surrogate-Key` headers** — without tags, you can only purge by URL, which requires knowing every affected URL
- **Purging instead of versioning** — for static assets, versioned URLs are simpler and more reliable
- **Not handling purge API rate limits** — Cloudflare allows 30 purge requests per minute per zone; batch accordingly

## FAQ

**Q: How long does CDN invalidation take?**
A: Typically 30-60 seconds for Cloudflare, 1-5 seconds for Fastly. It depends on the CDN's edge propagation speed.

**Q: Should I purge or use short TTLs?**
A: Use short TTLs (60-300 seconds) for content that changes frequently. Use purge for immediate invalidation when TTLs are too slow.

**Q: Can I purge by URL pattern (e.g., /products/*)?**
A: Cloudflare supports prefix purging with `"prefixes": ["/products/"]`. Fastly uses surrogate keys for the same effect.

**Q: What is the cost of CDN purge API calls?**
A: Cloudflare includes purge in all plans. Fastly includes it but rate-limits by plan. AWS CloudFront charges per invalidation path after the first 1,000/month.
