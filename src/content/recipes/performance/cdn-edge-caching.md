---
contentType: recipes
slug: cdn-edge-caching
title: "Implement CDN Edge Caching"
description: "Configure content delivery networks with edge caching rules, cache invalidation, and geographic optimization for static and live content."
metaDescription: "Implement CDN edge caching with cache rules, invalidation, and geo-optimization. Configure CloudFront, Cloudflare, and Fastly for static and live content."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - cdn
relatedResources:
  - /guides/performance-optimization-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/debounce-throttle
  - /guides/system-design-interview-guide
  - /guides/logging-monitoring-observability-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement CDN edge caching with cache rules, invalidation, and geo-optimization. Configure CloudFront, Cloudflare, and Fastly for static and live content."
  keywords:
    - cdn
    - edge-caching
    - cache-invalidation
    - cloudfront
    - cloudflare
    - performance
---
# Implement CDN Edge Caching

## Overview

A Content Delivery Network (CDN) distributes your content across geographically dispersed edge servers, reducing latency by serving users from the nearest location, improving [performance](/guides/performance/performance-optimization-guide). Properly configured edge caching can cut page load times by 50–80% and considerably reduce origin server load.

This recipe covers configuring CDN edge caching rules, cache invalidation strategies, and geographic optimization for both static and live content.

## When to Use

Use this resource when:
- Your global audience experiences slow load times from a single origin
- Your origin server is overwhelmed with repeated requests for the same content
- You need to cache [API responses](/recipes/api/call-rest-api) or live generated pages
- You want to reduce bandwidth costs and improve [fault tolerance](/guides/devops/logging-monitoring-observability-guide)

## Solution

### Cloudflare (Configuration API)

```bash
# Set cache rules for static assets
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/pagerules" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [{"target": "url", "constraint": {"operator": "matches", "value": "*.css"}}],
    "actions": [{"id": "cache_level", "value": "cache_everything"}],
    "priority": 1
  }'
```

### AWS CloudFront (Terraform)

```hcl
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "S3Origin"
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.default.id
  }
}

resource "aws_cloudfront_cache_policy" "default" {
  name = "static-assets-policy"
  default_ttl = 86400
  max_ttl     = 31536000
  parameters_in_cache_key {
    headers_config { header_behavior = "none" }
    cookies_config { cookie_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}
```

### Fastly (VCL)

```vcl
sub vcl_recv {
  # Cache static assets for 1 year
  if (req.url.ext ~ "^(css|js|png|jpg|woff2)$") {
    set req.http.X-Static = "true";
  }
}

sub vcl_fetch {
  if (req.http.X-Static == "true") {
    set beresp.ttl = 365d;
    set beresp.http.Cache-Control = "public, max-age=31536000, immutable";
  }
}
```

## Explanation

CDNs operate on a simple principle: replicate content closer to users. Key concepts:
- **Edge locations**: Points of presence (PoPs) worldwide where content is cached
- **Cache hit**: Content found at the edge; served directly to user
- **Cache miss**: Content not at edge; fetched from origin, then cached
- **TTL (Time to Live)**: How long cached content remains valid before revalidation

Live content caching requires careful header configuration. Use `Cache-Control: max-age=0, s-maxage=60` to allow CDN caching while preventing browser caching, or use surrogate keys for fine-grained invalidation.

## Variants

| Provider | Configuration | Best For | Live Caching |
|----------|--------------|----------|----------------|
| Cloudflare | Dashboard, API, Terraform | General purpose, DNS integration | Cache Rules, Workers |
| AWS CloudFront | Console, Terraform, SAM | AWS ecosystem, S3 origins | Cache Policies, Lambda@Edge |
| Fastly | VCL, API, Terraform | High-traffic, real-time purge | Surrogate Keys, VCL logic |
| Akamai | Control Center, PAPI | Enterprise, media streaming | EdgeWorkers, mPulse |

## What Works

- **Set long TTLs for immutable assets**: Version filenames (`app.v2.js`) and cache for 1 year
- **Use cache busting for deployments**: Change URLs instead of invalidating — it's faster and more reliable
- **Configure stale-while-revalidate**: Serve stale content while fetching updates in background
- **Enable compression at the edge**: Brotli or Gzip reduces transfer size by 60–80%
- **Use surrogate keys for targeted invalidation**: Tag content groups and purge by tag instead of flushing everything

## Common Mistakes

- **Caching without proper headers**: Missing `Cache-Control` causes unpredictable behavior across browsers and CDNs
- **Over-invalidation**: Flushing the entire cache on every deployment defeats the purpose of a CDN
- **Ignoring query string normalization**: `?v=1` and `?v=2` should be treated as the same cache key for static assets
- **Not monitoring cache hit ratio**: Low hit ratios indicate misconfiguration — aim for 85%+
- **Caching authenticated content**: Never cache responses with `Set-Cookie` or personalized data without proper Vary headers

## Frequently Asked Questions

**Q: How do I cache live API responses?**
A: Use `s-maxage` (surrogate max age) for CDN-only caching while keeping `max-age=0` for browsers. Invalidate via surrogate keys when underlying data changes.

**Q: What is the difference between purging and invalidation?**
A: Purging removes content from edge caches immediately. Invalidation marks content as stale but may serve it while fetching updates. Purging is explicit; invalidation can be passive.

**Q: Should I use a CDN for API-only backends?**
A: Yes, if responses are cacheable. [GraphQL](/recipes/api/call-rest-api) is harder to cache at the edge than REST, but services like Cloudflare Workers or Fastly Compute can implement edge-level query caching.
