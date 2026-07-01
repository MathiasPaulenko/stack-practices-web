---
contentType: patterns
slug: content-delivery-network-pattern
title: "Content Delivery Network (CDN) Pattern"
description: "Distribute static and live content through geographically dispersed edge servers to reduce latency, improve availability, and offload origin infrastructure."
metaDescription: "Learn the CDN Pattern for edge caching and content distribution. Examples in JavaScript, Python, and Terraform with CloudFront, Fastly, and Vercel Edge."
difficulty: beginner
topics:
  - design
  - architecture
  - infrastructure
  - performance
tags:
  - content-delivery-network
  - pattern
  - design-pattern
  - edge
  - caching
  - performance
  - cloudfront
  - fastly
relatedResources:
  - /patterns/design/static-content-hosting-pattern
  - /patterns/design/throttling-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the CDN Pattern for edge caching and content distribution. Examples in JavaScript, Python, and Terraform with CloudFront, Fastly, and Vercel Edge."
  keywords:
    - cdn
    - content delivery network
    - edge caching
    - performance
    - cloudfront
    - fastly
---

# Content Delivery Network (CDN) Pattern

## Overview

The Content Delivery Network (CDN) Pattern distributes content through a geographically dispersed network of edge servers, placing cached copies of assets closer to end users. Instead of every request traveling to a single origin server, users are routed to the nearest edge location, dramatically reducing latency, improving availability, and offloading traffic from the origin infrastructure.

CDNs serve static content (images, CSS, JavaScript, videos) from edge caches and increasingly support live content acceleration, edge computing (Cloudflare Workers, Lambda@Edge), and DDoS protection. A well-configured CDN can reduce page load times by 50% or more and absorb traffic spikes that would overwhelm an origin server.

## When to Use

Use the CDN Pattern when:
- Users are geographically distributed and latency matters
- Static assets (images, CSS, JS, fonts, videos) account for most of your traffic
- You need to handle traffic spikes without scaling origin infrastructure
- DDoS protection and WAF functionality are required at the edge
- Edge computing logic (A/B testing, geo-routing, authentication) is beneficial

## When to Avoid

- All users are in the same geographic region as the origin server
- Content is highly personalized and cannot be cached (real-time data)
- The application is entirely internal with no external users
- The complexity of cache invalidation outweighs the latency benefit

## Solution

### JavaScript (CloudFront + S3 Origin)

```javascript
// AWS SDK v3 configuration for CDN invalidation
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

const cloudfront = new CloudFrontClient({ region: 'us-east-1' });

/**
 * Invalidate CDN cache for specific paths after deployment
 */
async function invalidateCache(distributionId, paths = ['/*']) {
  const command = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: paths.length,
        Items: paths
      }
    }
  });

  const response = await cloudfront.send(command);
  console.log(`Invalidation created: ${response.Invalidation.Id}`);
  return response.Invalidation.Id;
}

// Usage: invalidate after static asset deployment
await invalidateCache('E1234567890ABC', ['/assets/*', '/index.html']);
```

### Python (CDN Cache Warmup + Edge Logic)

```python
import requests
import hashlib
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor

class CDNManager:
    """Manages CDN interactions for cache warmup, purging, and health checks"""
    def __init__(self, base_url: str, api_key: str = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.edge_locations = [
            "us-east", "us-west", "eu-west", "eu-central",
            "ap-southeast", "ap-northeast", "sa-east"
        ]

    def generate_cache_key(self, path: str, params: Dict = None) -> str:
        """Generate a deterministic cache key for a URL"""
        content = f"{path}:{sorted(params.items()) if params else ''}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def warmup_cache(self, paths: List[str]) -> Dict[str, bool]:
        """Pre-populate CDN edge caches by requesting through each location"""
        results = {}

        def fetch(path):
            try:
                response = requests.get(
                    f"{self.base_url}{path}",
                    headers={"X-Cache-Warmup": "true"},
                    timeout=30
                )
                return path, response.status_code == 200
            except Exception:
                return path, False

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch, p) for p in paths]
            for future in futures:
                path, success = future.result()
                results[path] = success

        return results

    def purge_cache(self, path: str) -> bool:
        """Purge a specific path from the CDN cache"""
        # Implementation varies by CDN provider (Fastly, Cloudflare, etc.)
        # This example uses a generic purge endpoint
        try:
            response = requests.post(
                f"{self.base_url}/__purge",
                json={"path": path},
                headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Purge failed for {path}: {e}")
            return False

    def get_cache_status(self, path: str) -> Dict:
        """Check cache HIT/MISS status for a path"""
        response = requests.get(f"{self.base_url}{path}")
        return {
            "path": path,
            "cache_status": response.headers.get("X-Cache", "unknown"),
            "age": response.headers.get("Age", "0"),
            "ttl_remaining": response.headers.get("Cache-Control", "")
        }


# Usage
cdn = CDNManager("https://cdn.example.com", api_key="secret-key")

# Warmup critical paths after deployment
warmup_results = cdn.warmup_cache([
    "/assets/main.css",
    "/assets/app.js",
    "/api/config"
])
print(f"Cache warmup: {sum(warmup_results.values())}/{len(warmup_results)} successful")

# Check cache status
status = cdn.get_cache_status("/assets/main.css")
print(f"Cache: {status['cache_status']}, Age: {status['age']}s")
```

### Terraform (AWS CloudFront Distribution)

```hcl
# Infrastructure as Code for CloudFront CDN
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StackPractices CDN"
  default_root_object = "index.html"
  price_class         = "PriceClass_All" # Global distribution

  # Origin: S3 bucket for static assets
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-assets"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  # Origin: ALB for live API
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior: static assets from S3
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-assets"
    compress         = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 1 day
    max_ttl                = 31536000 # 1 year
  }

  # Ordered cache behavior: API calls with no caching
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-api"
    compress         = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin"]
      cookies { forward = "all" }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # Edge caching for specific asset types
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-assets"
    compress         = true

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400    # 1 day
    default_ttl            = 604800    # 1 week
    max_ttl                = 31536000  # 1 year
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cdn.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = "production"
    Service     = "cdn"
  }
}
```

## Explanation

A CDN operates on three principles:

1. **Geographic distribution**: Edge servers in hundreds of locations worldwide serve content from the nearest point to the user
2. **Caching hierarchy**: Content is cached at edge, regional, and origin tiers with TTL-based expiration
3. **Request routing**: DNS-based or anycast routing directs users to the optimal edge location

Cache behavior is controlled through:
- **TTL headers**: `Cache-Control: max-age=3600` tells the CDN how long to cache
- **Cache keys**: Unique identifiers determining when content is considered identical
- **Invalidation**: Explicitly removing cached content when it becomes stale

## Variants

| Variant | Use Case | Example |
|---------|----------|---------|
| **Static asset CDN** | Images, CSS, JS, fonts | CloudFront + S3 |
| **Edge acceleration** | API responses, HTML pages | Cloudflare Argo, Fastly |
| **Video streaming** | HLS/DASH segments, live streams | AWS MediaPackage, Akamai |
| **Edge computing** | A/B testing, auth, personalization | Cloudflare Workers, Lambda@Edge |
| **Multi-CDN** | Resilience and cost optimization | CloudFront + Fastly failover |

## What works

- **Use versioned filenames for cache-busting.** `app.v2.js` instead of `app.js` with aggressive caching.
- **Set appropriate TTLs.** Static assets: 1 year. HTML: short or no cache. API: context-dependent.
- **Configure custom cache keys carefully.** Query parameters, headers, and cookies affect cache hit rate.
- **Implement graceful degradation.** If the CDN fails, requests should fall back to origin.
- **Monitor cache hit ratio.** Below 80% suggests configuration issues; above 95% is excellent.

## Common Mistakes

- **Forgetting to invalidate after deployment.** Users see stale content because cache was not purged.
- **Over-caching personalized content.** Personalized pages cached publicly leak data between users.
- **Ignoring cache key variations.** `?utm_source=x` and `?utm_source=y` create duplicate cached entries.
- **Not compressing at the edge.** Gzip/Brotli should be applied by the CDN, not just the origin.
- **Single point of failure.** Using one CDN provider without origin fallback is risky.

## Real-World Examples

### Netflix Open Connect

Netflix deploys its own CDN appliances inside ISP networks. This reduces transit costs and delivers 4K video with minimal buffering by placing content within the ISP's own infrastructure.

### StackPractices.com

This site uses GitHub Pages with Cloudflare in front. Static HTML, CSS, and JS are cached at Cloudflare's edge, reducing origin load and improving global load times.

### Shopify Storefronts

Shopify uses Fastly to serve millions of storefronts. Each store's theme assets are cached at edge locations, enabling sub-second page loads globally even though the origin platform is centralized.

## Frequently Asked Questions

**Q: Does a CDN only work for static content?**
A: No. Modern CDNs accelerate live content by optimizing TCP connections, routing, and TLS termination. Edge computing also enables live logic at the edge.

**Q: How do I handle cache invalidation?**
A: Use versioned filenames for static assets (immutable). For named resources, use CDN purge APIs or set short TTLs. A common pattern is `Cache-Control: max-age=0, s-maxage=3600` for CDNs while keeping the browser from caching.

**Q: What is the difference between pull and push CDN?**
A: Pull CDNs fetch content from origin on first request. Push CDNs require you to upload content explicitly. Most modern CDNs are pull-based with optional origin shielding.

**Q: Should I use a CDN for an internal application?**
A: Usually not, unless users are distributed across offices. Internal apps typically benefit more from optimizing the origin than from geographic distribution.
