---


contentType: docs
slug: cdn-cache-rules-template
templateType: guideline
title: "Plantilla de Reglas de CDN Cache"
description: "Plantilla para definir CDN caching rules y edge behavior: cache keys, TTL por content type, query parameter handling, header forwarding, purge strategies y origin shield configuration con ejemplos de codigo."
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

Esta plantilla define CDN caching rules para tu infrastructure. CDN rules controlean como content se cachea en edge locations, que query parametros affectean caching, cuanto tiempo content se queda cached, y cuando cached content se purga. Proper CDN configuration reduce origin load por 80-95% y improvea TTFB globalmente.

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

# Static assets con versioned URLs — immutable
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
# Forwardea selected headers a origin, stripea others
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

# Usage: purgea all product pages despues de catalog update
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
    
    # Purgea everything despues de deployment
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
#   - Reduce origin requests por 90%+ (shield cachea para all edges)
#   - Protege origin de traffic spikes
#   - Single connection pool a origin
  
# When to use:
#   - Origin es un single server (no load balancer)
#   - Traffic > 100 req/s
#   - Origin esta en un single region
```

### 5.2 Multi-Tier Caching

```text
Request flow:
  User → Edge cache (nearest PoP) → Origin shield → Origin server

Edge cache miss rate: ~5-10% de requests reachan origin shield
Shield cache miss rate: ~1-5% de requests reachan origin
Total origin load: ~0.5-1% de total requests
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

## Preguntas Frecuentes

### ¿Deberia cachear HTML pages en el CDN?

Si, con un short edge TTL (60-300 seconds) y `max-age=0` para browser cache. Esto reduce origin load mientras asegura que users vean fresh content dentro del edge TTL. Usa cache tags o purge-by-URL para invalidatear specific pages cuando content updates. Para personalized pages (user dashboard, settings), bypassa CDN caching entirely con un `Cache-Control: no-store` header.

### ¿Cómo handleo cache busting para versioned assets?

Usa content-hash filenames (e.g., `app.a1b2c3d4.js`) y setea `Cache-Control: public, max-age=31536000, immutable`. Cuando el file cambia, el hash cambia, creando un new URL que el CDN cachea fresh. Nunca purgees versioned assets — son immutable. Old versions expirean naturally del CDN cache basado en LRU eviction. Esto elimina la need de purge operations en asset updates.

### ¿Qué query parametros deberia incluir en el cache key?

Solo includee parametros que cambian el response content. Common cache-relevant parameters: `page`, `sort`, `filter`, `category`, `format`, `view`. Siempre excludee tracking parameters (`utm_*`, `ref`, `source`), analytics parameters, y session tokens. Includeir irrelevant parameters en el cache key reduce hit ratio porque cada parameter variant crea un separate cache entry.

### ¿Cómo purgeo cached content despues de un deployment?

Usa purge-by-tag para granular control o purge-everything para simplicity. Para zero-downtime deployments, usa soft purge (marca content como stale en vez de deletearlo). El CDN servee stale content mientras fetchea fresh content del origin en el background. Esto previene origin spikes durante purge. Automatiza purging en tu CI/CD pipeline como un post-deploy step.

### ¿Cuál es la diferencia entre edge TTL y browser TTL?

Edge TTL (`s-maxage` o `CDN-Cache-Control`) controla cuanto tiempo el CDN cachea el response. Browser TTL (`max-age`) controla cuanto tiempo el browser del user cachea el response. Para HTML pages, setea edge TTL a 300s y browser TTL a 0 (always revalidate). Para versioned assets, setea ambos a 1 year. El edge TTL deberia siempre ser shorter que o equal al browser TTL para content que cambia.

## See Also

- [Complete Guide to CDN Caching Strategy](/es/guides/complete-guide-cdn-caching-strategy/)
- [CDN Cache Invalidation Strategies and Patterns](/es/recipes/cdn-cache-invalidation-strategies/)
- [Complete Guide to GraphQL Caching](/es/guides/complete-guide-graphql-caching/)
- [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/)
- [Read-Through Cache Pattern](/es/patterns/read-through-cache-pattern/)

