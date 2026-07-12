---


contentType: docs
slug: cdn-cache-rules-template
templateType: guideline
title: "CDN Cache Rules Template"
description: "Template for defining CDN caching rules and edge behavior: cache keys, TTL by content type, query parameter handling, header forwarding, purge strategies, and origin shield configuration with code examples."
metaDescription: "Template for CDN cache rules: cache keys, TTL by content type, query params, header forwarding, purge strategies, origin shield, edge behavior, code examples."
difficulty: intermediate
topics:
  - caching
tags:
  - caching
  - cdn
  - cloudflare
  - cache-rules
  - edge-computing
  - performance
relatedResources:
  - /docs/cache-strategy-decision-template
  - /docs/cache-warmup-runbook
  - /docs/cache-eviction-policy-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Template for CDN cache rules: cache keys, TTL by content type, query params, header forwarding, purge strategies, origin shield, edge behavior, code examples."
  keywords:
    - cdn cache rules
    - cdn configuration
    - cloudflare cache
    - edge caching
    - cache purge
    - origin shield
    - cdn ttl


---

## Overview

This template defines CDN caching rules for your infrastructure. CDN rules control how content is cached at edge locations, which query parameters affect caching, how long content stays cached, and when cached content is purged. Proper CDN configuration reduces origin load by 80-95% and improves TTFB globally.

---

## 1. Cache Key Rules

### 1.1 Cache Key Components

```text
Component          | Include in key?  | Reason
───────────────────┼──────────────────┼────────────────────────────
Path               | Always           | Primary cache identifier
Query parameters   | Selective        | Only cache-relevant params
HTTP method        | Always (GET/HEAD)| Only cache safe methods
Headers            | Selective        | Vary by Accept, Accept-Encoding
Cookies            | Never (default)  | Breaks caching for auth
Protocol           | No               | HTTP/HTTPS serve same content
```

### 1.2 Query Parameter Rules

```text
Parameter type      | Example              | Cache behavior
────────────────────┼──────────────────────┼──────────────────────────
Tracking params     | ?utm_source=email    | Ignore (strip from key)
Analytics params    | ?ref=campaign        | Ignore (strip from key)
Content params      | ?page=2&sort=desc    | Include in cache key
Format params       | ?format=json         | Include in cache key
Auth tokens         | ?token=abc123        | Never cache (bypass CDN)
Session IDs         | ?session=xyz         | Never cache (bypass CDN)
```

### 1.3 Cloudflare Configuration

```yaml
# Cloudflare Page Rules / Cache Rules
rules:
  - name: "Ignore tracking parameters"
    url: "*.example.com/*"
    cache_key:
      query_string:
        include: ["page", "sort", "format", "category"]
        exclude: ["utm_source", "utm_medium", "utm_campaign", "ref", "source"]
    
  - name: "API responses - no cache"
    url: "api.example.com/*"
    cache:
      enabled: false
    
  - name: "Static assets - long cache"
    url: "*.example.com/assets/*"
    cache:
      enabled: true
      ttl: 31536000  # 1 year
      browser_ttl: 31536000
```

---

## 2. TTL by Content Type

### 2.1 TTL Matrix

```text
Content type          | Edge TTL    | Browser TTL | Revalidate
──────────────────────┼─────────────┼─────────────┼──────────────
HTML pages            | 60-300s     | 0           | Always
JSON API (public)     | 30-60s      | 0           | Always
JSON API (private)    | 0 (no cache)| 0           | N/A
CSS/JS (versioned)    | 31536000s   | 31536000s   | Never
Images (versioned)    | 31536000s   | 31536000s   | Never
Images (unversioned)  | 3600s       | 3600s       | Hourly
Fonts                 | 31536000s   | 31536000s   | Never
Sitemaps              | 3600s       | 0           | Hourly
Robots.txt            | 3600s       | 0           | Hourly
Redirects             | 3600s       | 3600s       | Hourly
404 pages             | 60s         | 0           | Always
500 errors            | 0 (no cache)| 0           | N/A
```

### 2.2 HTTP Headers Configuration

```nginx
# Nginx origin headers

# HTML pages — short edge cache, revalidate always
location / {
  add_header Cache-Control "public, max-age=0, s-maxage=300";
  add_header Vary "Accept-Encoding";
}

# Static assets with versioned URLs — immutable
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# API endpoints — no CDN cache
location /api/ {
  add_header Cache-Control "no-store, no-cache, must-revalidate";
  add_header CDN-Cache-Control "no-store";
}

# Sitemaps — hourly cache
location /sitemap.xml {
  add_header Cache-Control "public, max-age=0, s-maxage=3600";
}
```

---

## 3. Header Forwarding

### 3.1 Forwarding Rules

```text
Header              | Forward to origin? | Include in cache key? | Reason
────────────────────┼────────────────────┼───────────────────────┼──────────────
Authorization       | No (strip at edge) | No                    | Auth at origin
Accept              | Yes                | Yes                   | Content negotiation
Accept-Encoding     | Yes                | Yes                   | Compression
Accept-Language     | Yes                | Yes                   | i18n variants
User-Agent          | No (strip at edge) | No                    | Breaks caching
Cookie              | Conditional        | No                    | Auth sessions
X-Forwarded-For     | Yes                | No                    | IP logging
X-Request-ID        | Yes                | No                    | Tracing
```

### 3.2 Cloudflare Header Rules

```yaml
# Forward selected headers to origin, strip others
header_rules:
  - name: "Strip User-Agent for caching"
    action: remove
    header: User-Agent
    direction: request
  
  - name: "Forward Accept-Language for i18n"
    action: set
    header: Accept-Language
    cache_key: true
  
  - name: "Strip cookies for static assets"
    action: remove
    header: Cookie
    match: "/assets/*"
```

---

## 4. Purge Strategies

### 4.1 Purge Methods

```text
Method              | Scope              | Speed      | Use when
────────────────────┼────────────────────┼────────────┼──────────────────────
Purge everything    | All cached content | 30-60s     | Deployments, emergencies
Purge by URL        | Single URL         | 5-10s      | Content update
Purge by tag        | Group of URLs      | 10-30s     | Category/product update
Purge by prefix     | Path prefix        | 10-30s     | Section update
Purge by host       | Entire domain      | 30-60s     | Domain migration
Soft purge          | Mark as stale      | Instant    | Graceful refresh
```

### 4.2 Purge API Examples

```python
# Cloudflare purge by URL
import requests

def purge_urls(zone_id: str, api_token: str, urls: list):
    response = requests.post(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache",
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        json={"files": urls},
    )
    return response.json()

# Purge by cache tag (Cloudflare Enterprise)
def purge_by_tag(zone_id: str, api_token: str, tags: list):
    response = requests.post(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache",
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        json={"tags": tags},
    )
    return response.json()

# Usage: purge all product pages after catalog update
purge_by_tag("zone123", "token456", ["products", "catalog"])
```

### 4.3 Automated Purge on Deploy

```python
# GitHub Actions post-deploy purge
import os
import requests

def purge_after_deploy():
    zone_id = os.environ["CLOUDFLARE_ZONE_ID"]
    api_token = os.environ["CLOUDFLARE_API_TOKEN"]
    
    # Purge everything after deployment
    response = requests.post(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache",
        headers={"Authorization": f"Bearer {api_token}"},
        json={"purge_everything": True},
    )
    
    if response.json()["success"]:
        print("CDN purged successfully after deployment")
    else:
        print(f"Purge failed: {response.json()['errors']}")
```

---

## 5. Origin Shield

### 5.1 Origin Shield Configuration

```yaml
# Cloudflare origin shield
origin_shield:
  enabled: true
  region: "us-east-1"  # Primary shield location
  
# Benefits:
#   - Reduces origin requests by 90%+ (shield caches for all edges)
#   - Protects origin from traffic spikes
#   - Single connection pool to origin
  
# When to use:
#   - Origin is a single server (no load balancer)
#   - Traffic > 100 req/s
#   - Origin is in a single region
```

### 5.2 Multi-Tier Caching

```text
Request flow:
  User → Edge cache (nearest PoP) → Origin shield → Origin server

Edge cache miss rate: ~5-10% of requests reach origin shield
Shield cache miss rate: ~1-5% of requests reach origin
Total origin load: ~0.5-1% of total requests
```

---

## 6. Monitoring

### 6.1 CDN Metrics

```text
Metric                    | Source          | Alert threshold
──────────────────────────┼─────────────────┼──────────────────
Cache hit ratio           | CDN analytics   | < 90%
Origin requests           | CDN analytics   | > 10% of total
Edge response time p95    | CDN analytics   | > 100ms
Origin response time p95  | Origin logs     | > 500ms
Purge operations          | CDN API         | > 10/hour
Bandwidth (edge)          | CDN analytics   | Monthly budget
Cache size                | CDN analytics   | Near plan limit
```

### 6.2 Monitoring Script

```python
def check_cdn_health(zone_id: str, api_token: str):
    response = requests.get(
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/analytics/dashboard",
        headers={"Authorization": f"Bearer {api_token}"},
        params={"since": "-1440", "until": "now"},
    )
    
    data = response.json()["result"]["totals"]
    
    total_requests = data["requests"]["all"]
    cached_requests = data["requests"]["cached"]
    hit_ratio = (cached_requests / total_requests * 100) if total_requests else 0
    
    print(f"CDN Health Report:")
    print(f"  Total requests: {total_requests:,}")
    print(f"  Cached requests: {cached_requests:,}")
    print(f"  Hit ratio: {hit_ratio:.1f}%")
    print(f"  Bandwidth: {data['bandwidth']['all'] / 1e9:.1f} GB")
    
    if hit_ratio < 90:
        print("ALERT: CDN hit ratio below 90%")
    
    return hit_ratio
```

## FAQ

### Should I cache HTML pages at the CDN?

Yes, with a short edge TTL (60-300 seconds) and `max-age=0` for browser cache. This reduces origin load while ensuring users see fresh content within the edge TTL. Use cache tags or purge-by-URL to invalidate specific pages when content updates. For personalized pages (user dashboard, settings), bypass CDN caching entirely with a `Cache-Control: no-store` header.

### How do I handle cache busting for versioned assets?

Use content-hash filenames (e.g., `app.a1b2c3d4.js`) and set `Cache-Control: public, max-age=31536000, immutable`. When the file changes, the hash changes, creating a new URL that the CDN caches fresh. Never purge versioned assets — they are immutable. Old versions expire naturally from the CDN cache based on LRU eviction. This eliminates the need for purge operations on asset updates.

### What query parameters should I include in the cache key?

Only include parameters that change the response content. Common cache-relevant parameters: `page`, `sort`, `filter`, `category`, `format`, `view`. Always exclude tracking parameters (`utm_*`, `ref`, `source`), analytics parameters, and session tokens. Including irrelevant parameters in the cache key reduces hit ratio because each parameter variant creates a separate cache entry.

### How do I purge cached content after a deployment?

Use purge-by-tag for granular control or purge-everything for simplicity. For zero-downtime deployments, use soft purge (marks content as stale rather than deleting). The CDN serves stale content while fetching fresh content from the origin in the background. This prevents origin spikes during purge. Automate purging in your CI/CD pipeline as a post-deploy step.

### What is the difference between edge TTL and browser TTL?

Edge TTL (`s-maxage` or `CDN-Cache-Control`) controls how long the CDN caches the response. Browser TTL (`max-age`) controls how long the user's browser caches the response. For HTML pages, set edge TTL to 300s and browser TTL to 0 (always revalidate). For versioned assets, set both to 1 year. The edge TTL should always be shorter than or equal to the browser TTL for content that changes.

## See Also

- [Complete Guide to CDN Caching Strategy](/guides/complete-guide-cdn-caching-strategy/)
- [CDN Cache Invalidation Strategies and Patterns](/recipes/cdn-cache-invalidation-strategies/)
- [Complete Guide to GraphQL Caching](/guides/complete-guide-graphql-caching/)
- [Complete Guide to Redis Caching Strategies](/guides/complete-guide-redis-caching-strategies/)
- [Read-Through Cache Pattern](/patterns/read-through-cache-pattern/)

