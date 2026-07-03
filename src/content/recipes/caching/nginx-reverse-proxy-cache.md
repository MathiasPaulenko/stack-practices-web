---
contentType: recipes
slug: nginx-reverse-proxy-cache
title: "Cache HTTP Responses with Nginx Reverse Proxy"
description: "Configure Nginx as a caching reverse proxy to cache upstream HTTP responses with TTL zones, cache keys, and conditional purging."
metaDescription: "Cache HTTP responses with Nginx reverse proxy. Configure cache zones, TTL by response code, cache keys, bypass, and purge strategies."
difficulty: intermediate
topics:
  - caching
  - performance
  - infrastructure
tags:
  - nginx
  - reverse-proxy
  - http-cache
  - caching
  - load-balancer
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/cdn-cache-invalidation-strategies
  - /guides/complete-guide-redis-caching-strategies
  - /guides/complete-guide-application-level-caching
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache HTTP responses with Nginx reverse proxy. Configure cache zones, TTL by response code, cache keys, bypass, and purge strategies."
  keywords:
    - nginx reverse proxy cache
    - http caching
    - nginx cache zone
    - proxy_cache
    - cache ttl nginx
---

## Overview

Nginx can cache responses from upstream servers, reducing load on backend applications and cutting latency for repeated requests. The `proxy_cache` directive stores responses in a configurable cache zone on disk, with TTLs per response code, cache keys based on request attributes, and options to bypass cache for specific requests. Below: setting up a caching reverse proxy, tuning cache zones, handling cache invalidation, and conditional caching.

## When to Use This

- API endpoints with cacheable GET responses (product catalogs, search results, static content)
- Reducing load on backend application servers during traffic spikes
- Caching responses from slow upstream services
- Adding a caching layer without modifying application code

## Prerequisites

- Nginx 1.20+
- A backend application server running on localhost or internal network
- Sufficient disk space for the cache zone

## Solution

### 1. Define a Cache Zone

In the `http` block of `nginx.conf`:

```nginx
http {
    # Define cache zone: path, levels (directory hierarchy), size, max_size, inactive
    proxy_cache_path /var/cache/nginx/api
        levels=1:2
        keys_zone=api_cache:10m
        max_size=1g
        inactive=60m
        use_temp_path=off;

    # Another zone for static assets
    proxy_cache_path /var/cache/nginx/assets
        levels=1:2
        keys_zone=asset_cache:50m
        max_size=5g
        inactive=24h
        use_temp_path=off;
}
```

- `levels=1:2`: Two-level directory hierarchy for cache files (avoids too many files in one directory)
- `keys_zone=api_cache:10m`: 10MB of shared memory for keys (roughly 80,000 keys)
- `max_size=1g`: Maximum cache size on disk
- `inactive=60m`: Remove files not accessed in 60 minutes (even if TTL hasn't expired)

### 2. Enable Caching in a Server Block

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_cache api_cache;

        # Cache key: method + host + URI + query string
        proxy_cache_key "$request_method$request_uri";

        # TTL by response code
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_valid 500 10s;  # Cache errors briefly to protect backend

        # Add headers showing cache status
        add_header X-Cache-Status $upstream_cache_status;

        # Don't cache responses with these headers
        proxy_no_cache $http_authorization;
        proxy_cache_bypass $http_authorization;
    }

    location /assets/ {
        proxy_pass http://backend:3000;
        proxy_cache asset_cache;
        proxy_cache_key "$request_uri";
        proxy_cache_valid 200 24h;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### 3. Conditional Caching

Skip cache for authenticated requests, POST, or specific query params:

```nginx
server {
    listen 80;
    server_name api.example.com;

    # Skip cache for POST, PUT, DELETE
    set $skip_cache 0;
    if ($request_method != GET) {
        set $skip_cache 1;
    }

    # Skip cache for authenticated requests
    if ($http_authorization) {
        set $skip_cache 1;
    }

    # Skip cache for specific query params
    if ($args ~* "no_cache=1") {
        set $skip_cache 1;
    }

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_cache api_cache;
        proxy_cache_key "$request_method$request_uri";
        proxy_cache_valid 200 10m;

        proxy_no_cache $skip_cache;
        proxy_cache_bypass $skip_cache;

        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### 4. Cache Locking (Prevent Cache Stampede)

When multiple requests arrive for the same uncached key, Nginx can lock so only one request reaches the backend:

```nginx
location /api/ {
    proxy_pass http://backend:3000;
    proxy_cache api_cache;
    proxy_cache_key "$request_method$request_uri";
    proxy_cache_valid 200 10m;

    # Only one request populates the cache
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;    # Wait up to 5s for cache fill
    proxy_cache_lock_age 30s;       # Give up lock after 30s

    # Serve stale content while refreshing
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
    proxy_cache_revalidate on;

    add_header X-Cache-Status $upstream_cache_status;
}
```

### 5. Cache Purge (with nginx-cache-purge module)

```nginx
location ~ /purge(/.*) {
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    deny all;
    proxy_cache_purge api_cache "$request_method$1$is_args$args";
}
```

Purge a specific URL:

```bash
curl -X GET http://api.example.com/purge/api/products?page=1
# Returns: 200 OK - Purge successful
```

### 6. Upstream Cache Control Headers

Nginx respects `Cache-Control` headers from the backend by default. Override them:

```nginx
location /api/ {
    proxy_pass http://backend:3000;
    proxy_cache api_cache;
    proxy_cache_key "$request_uri";

    # Ignore backend Cache-Control headers
    proxy_ignore_headers Cache-Control Expires Set-Cookie;

    # Force caching regardless of backend headers
    proxy_cache_valid 200 10m;

    # Hide backend headers from client
    proxy_hide_header Set-Cookie;
    proxy_hide_header Cache-Control;
}
```

## How It Works

1. **Cache key**: Nginx hashes the `proxy_cache_key` value (e.g., `$request_method$request_uri`) and uses it as the cache file identifier. Identical keys hit the same cache entry.
2. **Cache zone**: The `keys_zone` parameter allocates shared memory for the key lookup table. The actual cached responses are stored on disk under the `proxy_cache_path` directory.
3. **TTL resolution**: Nginx checks `proxy_cache_valid` for the response code. If the backend sends `Cache-Control: max-age`, Nginx uses that unless `proxy_ignore_headers` overrides it.
4. **`$upstream_cache_status`**: Possible values: `HIT`, `MISS`, `BYPASS`, `EXPIRED`, `STALE`, `UPDATING`, `REVALIDATED`, `NONE`.
5. **Cache lock**: When `proxy_cache_lock on`, only the first request for an uncached key reaches the backend. Others wait up to `proxy_cache_lock_timeout` and then receive the cached response.

## Variants

### Cache with Vary Header

Cache different versions of the same URL based on `Accept` header:

```nginx
proxy_cache_key "$request_method$request_uri$http_accept";
```

### Cache with Cookie Awareness

```nginx
# Cache differently based on user role cookie
proxy_cache_key "$request_method$request_uri$cookie_user_role";
```

### Microcaching (1-Second Cache)

Cache for a very short TTL to absorb traffic bursts:

```nginx
location /api/ {
    proxy_pass http://backend:3000;
    proxy_cache api_cache;
    proxy_cache_key "$request_method$request_uri";
    proxy_cache_valid 200 1s;        # Very short TTL
    proxy_cache_lock on;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### Cache Warming

Pre-populate cache by fetching URLs after deployment:

```bash
#!/bin/bash
# warm-cache.sh
URLS=(
    "https://api.example.com/api/products?page=1"
    "https://api.example.com/api/products?page=2"
    "https://api.example.com/api/categories"
)

for url in "${URLS[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    echo "$url -> $status"
done
```

## Best Practices

- **Size `keys_zone` correctly**: 1MB of shared memory holds roughly 8,000 cache keys. For 100K cached items, allocate 13MB.
- **Use `proxy_cache_lock`**: Prevents cache stampede when many requests hit the same uncached key simultaneously.
- **Enable `proxy_cache_use_stale`**: Serves stale content during backend failures, improving resilience.
- **Monitor cache hit rate**: Check `X-Cache-Status` headers or parse Nginx access logs.
- **Set `inactive` lower than `max_age`**: Removes infrequently accessed files even if their TTL hasn't expired, keeping disk usage manageable.
- **Don't cache authenticated responses**: Use `proxy_cache_bypass` with `$http_authorization` to skip cache for logged-in users.

## Common Mistakes

- **Caching POST/PUT/DELETE**: Only GET and HEAD should be cached. Use `if ($request_method != GET)` to skip others.
- **Forgetting `proxy_cache_key`**: Without an explicit key, Nginx uses a default that may not include query strings, causing incorrect cache hits.
- **Not handling Set-Cookie**: If the backend sets cookies, caching the response leaks one user's session to another. Use `proxy_hide_header Set-Cookie`.
- **Cache zone too small**: If `keys_zone` is undersized, Nginx evicts entries prematurely. Monitor with `nginx -V` and cache stats.
- **No `proxy_cache_lock`**: Without locking, a cache miss triggers N concurrent backend requests — the cache stampede.

## FAQ

**How much disk space does Nginx cache use?**

Up to `max_size` per cache zone. Nginx uses a background cache manager process to remove least recently used files when the cache exceeds `max_size`.

**Can I cache HTTPS responses?**

Yes. Nginx terminates TLS and proxies to the backend over HTTP. The cache works on the decrypted response — TLS is transparent to the cache layer.

**How do I purge the entire cache?**

Delete the cache directory contents: `rm -rf /var/cache/nginx/api/*`. Nginx will rebuild the cache on subsequent requests. For targeted purges, use the `proxy_cache_purge` directive.

**Does Nginx cache compression (gzip)?**

Nginx caches the uncompressed response from the backend and compresses it per-request with `gzip on`. To cache compressed responses, enable `gzip_proxied` and configure the backend to send pre-compressed content.

**What is microcaching?**

A caching strategy with a very short TTL (1-5 seconds). It absorbs traffic bursts by caching responses briefly, reducing backend load during spikes without serving stale data for long.
