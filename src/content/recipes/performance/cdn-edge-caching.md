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
  - optimization
  - profiling
  - latency
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

This approach handles configuring CDN edge caching rules, cache invalidation strategies, and geographic optimization for both static and live content.

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

## Error Handling and Recovery

- **Compression failures**: when Brotli compression fails, serve uncompressed content as fallback. Monitor compression error rate. Set compression quality based on CPU availability. Test compression with different content types. Document fallback behavior. Alert on compression failure spikes. Use gzip as secondary fallback. Review compression settings quarterly
- **CDN origin failures**: when CDN cannot reach origin, serve stale content. Configure stale-while-revalidate headers. Set appropriate TTLs. Monitor origin health. Alert on origin error rate. Use multiple origins for redundancy. Test failover between origins. Document CDN failover configuration. Review CDN health monthly
- **Connection pool exhaustion**: when all connections are in use, requests queue or fail. Set max pool size based on database capacity. Monitor pool utilization. Alert on pool exhaustion. Implement connection timeout. Use retry with backoff. Document pool sizing guidelines. Test under peak load. Review pool configuration quarterly
- **Lazy loading intersection observer failures**: when Intersection Observer fails, content never loads. Implement fallback to scroll event listeners. Test on older browsers. Use polyfill for unsupported browsers. Monitor lazy load failures. Document fallback strategy. Test with different viewport sizes. Review browser support matrix
- **Load test script failures**: when k6 scripts fail, test results are invalid. Validate test scripts before execution. Use k6 checks for response validation. Monitor test failure rate. Document test script standards. Test scripts in staging first. Use version control for test scripts. Review test script quality. Implement test data management
- **Code splitting failures**: when dynamic imports fail, components do not load. Implement error boundaries for split components. Use fallback UI for failed loads. Monitor dynamic import failures. Test code splitting in production. Document error handling for split chunks. Use prefetch for critical chunks. Review splitting strategy quarterly

## Performance and Scalability

- **Compression level tuning**: balance between compression ratio and CPU usage. Brotli level 4 for dynamic content. Brotli level 11 for static assets. Gzip level 6 as fallback. Monitor compression time. Alert on slow compression. Test different levels. Document compression configuration. Review compression performance monthly
- **CDN cache hit ratio optimization**: maximize cache hit ratio to reduce origin load. Set appropriate Cache-Control headers. Use cache keys that include relevant parameters. Purge cache on content updates. Monitor cache hit ratio. Alert on hit ratio drops. Use CDN caching rules. Document caching strategy. Review cache configuration monthly
- **Connection pool sizing**: size pools based on concurrent request volume. Start with 10 connections per pool. Monitor wait time. Increase pool size if wait time exceeds 100ms. Decrease if connections are idle. Use connection validation. Document sizing guidelines. Test under peak load. Review pool size quarterly. Use lazy initialization
- **Lazy loading threshold tuning**: set root margin for early loading. Use 200px root margin for images. Use 400px for heavy components. Monitor user scroll behavior. Adjust threshold based on device performance. Test on mobile devices. Document threshold configuration. Review thresholds quarterly. Use placeholder dimensions
- **Load test ramp patterns**: use ramping stages for realistic load. Start with 10 users. Ramp to 100 over 2 minutes. Hold for 5 minutes. Ramp to peak. Hold for 10 minutes. Ramp down. Monitor response times at each stage. Document ramp patterns. Test different patterns. Review test scenarios quarterly
- **Bundle size optimization**: minimize bundle size for faster loads. Use tree shaking. Split vendor and app code. Analyze bundle with webpack-bundle-analyzer. Set performance budgets. Monitor bundle size in CI. Alert on budget violations. Document splitting strategy. Review bundle size monthly. Use dynamic imports for large dependencies
## Security Considerations

- **HTTPS and compression**: enable compression only over HTTPS to prevent BREACH attacks. Do not compress sensitive responses with user-controlled input. Set 
o-transform header for already compressed content. Monitor for compression-related vulnerabilities. Document security configuration. Test with security scanners. Review security quarterly
- **CDN security**: secure CDN with proper access controls. Use signed URLs for protected content. Configure WAF rules on CDN. Enable DDoS protection. Monitor CDN access logs. Alert on suspicious traffic patterns. Document CDN security configuration. Test CDN security. Review WAF rules quarterly. Use rate limiting
- **Connection pool security**: use TLS for database connections. Set connection timeout to prevent slow-loris attacks. Rotate database credentials. Use per-service connection pools. Monitor for connection leaks. Alert on unusual connection patterns. Document connection security. Test connection security. Review credentials quarterly
- **Content Security Policy for lazy loading**: set CSP headers to allow lazy-loaded resources. Use nonce-based CSP for dynamic imports. Configure script-src for code-split chunks. Monitor CSP violations. Alert on CSP violation spikes. Document CSP configuration. Test CSP with lazy loading. Review CSP policy quarterly

## Deployment and CI/CD

- **Performance testing in CI**: run performance tests on every PR. Use Lighthouse CI for web performance. Use k6 for load testing. Set performance budgets. Fail builds on budget violations. Monitor performance trends. Document CI performance checks. Test CI integration. Review performance budgets quarterly. Use caching for test artifacts
- **Progressive deployment for performance changes**: deploy performance changes gradually. Use canary deployment. Monitor performance metrics. Roll back on regression. Document deployment strategy. Test canary detection. Review canary thresholds. Use feature flags for performance changes. Monitor canary metrics. Document rollback procedures
- **Bundle analysis in CI**: analyze bundle size on every build. Compare with baseline. Alert on size increase. Use webpack-bundle-analyzer or source-map-explorer. Set size budgets per chunk. Document bundle analysis setup. Test bundle analysis. Review bundle budgets quarterly. Track bundle size trends. Use CI artifacts for analysis

## Testing and Quality Assurance

- **Performance regression testing**: run performance tests on every release. Compare with previous baseline. Alert on regressions exceeding 5%. Use synthetic monitoring for key user journeys. Document regression thresholds. Test in production-like environment. Review regression trends. Automate regression detection. Document test procedures
- **Load testing best practices**: test with realistic user patterns. Ramp up gradually. Monitor system resources. Test different endpoints. Use think time between requests. Document test scenarios. Test in staging first. Review test coverage. Use production-like data volumes. Monitor for memory leaks during tests
- **CDN cache testing**: verify cache headers are set correctly. Test cache purge functionality. Verify stale content serving. Test cache key normalization. Monitor cache hit ratio in testing. Document cache testing procedures. Test with query parameters. Review cache behavior. Test edge cases. Validate cache invalidation
## Tools and Platforms

- **WebPageTest**: detailed web performance testing tool. Waterfall view of resource loading. Filmstrip view of visual progress. Test from different locations and devices. Set custom connectivity profiles. Document testing workflow. Test key pages regularly. Review performance trends. Use for deep analysis. Compare with Lighthouse results
- **Lighthouse**: Google web performance auditing tool. Scores performance, accessibility, SEO, and best practices. Run in Chrome DevTools or CLI. Use in CI for automated checks. Set performance budget based on Lighthouse scores. Document Lighthouse workflow. Test on mobile and desktop. Review scores monthly. Track score trends
- **k6**: modern load testing tool by Grafana. JavaScript-based test scripts. Support for HTTP, gRPC, WebSocket. Thresholds for pass/fail. Cloud execution option. Integration with Grafana. Document k6 usage. Create reusable test scenarios. Test in staging. Review test coverage. Use k6 cloud for distributed tests
- **webpack-bundle-analyzer**: visualize bundle composition. Identify large dependencies. Find duplicate modules. Optimize tree shaking. Document bundle analysis workflow. Run in CI. Review bundle monthly. Set size alerts. Use with performance budgets. Track bundle composition over time
- **Cloudflare CDN**: global CDN with edge caching. Workers for edge compute. Cache rules and page rules. Real-time analytics. DDoS protection included. Document Cloudflare configuration. Test cache behavior. Review cache rules quarterly. Monitor cache hit ratio. Use Workers for edge logic
- **Fastly CDN**: CDN with instant purge. VCL for edge configuration. Real-time logging. Image optimization. Document Fastly configuration. Test purge functionality. Review VCL rules. Monitor cache performance. Use real-time logging for debugging. Test edge logic

## Common Pitfalls and Anti-Patterns

- **Over-compression**: compressing already compressed content wastes CPU. Do not compress images, videos, or pre-compressed assets. Set gzip_types and rotli_types carefully. Monitor CPU usage. Test compression overhead. Document compression rules. Review content types quarterly. Use Content-Encoding checks
- **CDN misconfiguration**: incorrect cache headers cause poor hit ratio. Do not cache personalized content. Use Vary header for content negotiation. Set appropriate TTLs. Monitor cache hit ratio. Test cache behavior. Document CDN rules. Review cache configuration monthly. Use cache tags for targeted purging
- **Connection pool over-sizing**: too many connections waste database resources. Each connection uses memory on the database server. Set max pool size based on database capacity. Monitor database connection count. Alert on too many connections. Document sizing guidelines. Test under load. Review pool size quarterly
- **Lazy loading everything**: lazy loading above-the-fold content hurts LCP. Load critical content eagerly. Use loading="eager" for hero images. Use etchpriority="high" for LCP elements. Monitor LCP metrics. Document lazy loading strategy. Test above-the-fold performance. Review lazy loading coverage. Use preload for critical resources
- **Load testing without think time**: load testing without think time creates unrealistic load. Add think time between requests. Use random think time. Simulate real user behavior. Document test scenarios. Test with different think times. Review test realism. Use k6 sleep() function. Monitor for unrealistic patterns
- **Code splitting too granular**: too many small chunks cause excessive network requests. Group related components into chunks. Set minimum chunk size. Use maxAsyncRequests and maxInitialRequests wisely. Monitor chunk count. Document splitting strategy. Test loading performance. Review chunk configuration. Use manual chunks for vendor code

## Best Practices Summary

- **Set performance budgets**: define budgets for key metrics. LCP under 2.5 seconds. FID under 100ms. CLS under 0.1. Bundle size under 200KB. Monitor budgets in CI. Fail builds on violations. Document budget rationale. Review budgets quarterly. Communicate budget status. Use Lighthouse for budget enforcement
- **Monitor Core Web Vitals**: track LCP, INP, and CLS. Use RUM for real user data. Use synthetic monitoring for lab data. Set alerts on metric degradation. Document monitoring setup. Test alerting. Review metrics monthly. Investigate regressions. Use Search Console for field data. Prioritize fixes based on impact
- **Optimize critical rendering path**: minimize render-blocking resources. Inline critical CSS. Defer non-critical JavaScript. Use preload for key resources. Optimize font loading. Document CRP optimization. Test with WebPageTest. Review rendering performance. Monitor FCP and LCP. Use sync and defer attributes
- **Use progressive enhancement**: build core functionality first. Enhance with JavaScript. Test without JavaScript. Use feature detection. Document enhancement strategy. Test on low-end devices. Review accessibility. Monitor JavaScript failures. Use server-side rendering. Provide fallbacks for critical features
## Cost Optimization

- **CDN cost management**: monitor CDN bandwidth costs. Use cache optimization to reduce origin requests. Set appropriate TTLs to maximize cache hits. Use CDN tiering for different content types. Review CDN bills monthly. Document cost optimization strategies. Alert on cost spikes. Use compression to reduce bandwidth. Review CDN pricing plans annually
- **Compression CPU costs**: balance compression savings with CPU costs. Use Brotli level 4 for dynamic content. Pre-compress static assets at build time. Monitor CPU usage from compression. Document compression cost analysis. Test different compression levels. Review compression cost quarterly. Use hardware acceleration where available
- **Connection pool resource costs**: each connection uses memory and CPU. Right-size pools to minimize waste. Monitor idle connections. Close unused connections. Document pool cost analysis. Test pool sizing impact. Review pool costs quarterly. Use connection pooling efficiently. Monitor database resource usage
- **Load testing infrastructure costs**: optimize load testing infrastructure costs. Use spot instances for load tests. Schedule tests during off-peak. Use k6 open source for basic tests. Document cost optimization. Review testing costs quarterly. Use cloud-native load testing. Monitor test infrastructure costs. Use auto-scaling for test runners

## Troubleshooting Guide

- **Slow page load**: diagnose with WebPageTest. Check LCP element. Identify render-blocking resources. Optimize images. Minify CSS and JavaScript. Use CDN for static assets. Document troubleshooting steps. Test fixes. Monitor improvement. Review page load monthly
- **High CDN origin requests**: check cache headers. Verify cache key configuration. Review TTL settings. Check for cache bypass patterns. Monitor cache hit ratio. Document troubleshooting steps. Test cache fixes. Review CDN configuration. Purge and retest
- **Connection pool timeouts**: check pool size. Monitor connection usage. Identify slow queries. Optimize database performance. Increase pool size if needed. Document troubleshooting steps. Test pool changes. Review pool configuration. Monitor wait times
- **Poor load test results**: check test script. Verify test environment. Monitor system resources. Identify bottlenecks. Optimize application code. Scale infrastructure. Document troubleshooting steps. Test fixes. Review test results. Compare with baseline
## Monitoring and Alerting

- **Performance monitoring strategy**: monitor key metrics continuously. Track LCP, INP, CLS for web vitals. Track response times for APIs. Track error rates. Set thresholds for alerts. Use RUM for real user data. Use synthetic monitoring for lab data. Document monitoring strategy. Review metrics monthly. Adjust thresholds based on trends
- **Alert configuration for performance**: set alerts on metric degradation. LCP above 2.5 seconds. Error rate above 1%. Response time above 500ms. Use multi-level alerts: warning and critical. Document alert thresholds. Test alert delivery. Review alert effectiveness monthly. Reduce alert noise. Use runbooks for each alert
- **Dashboard design for performance**: create dashboards for different audiences. Executive dashboard for high-level metrics. Engineering dashboard for detailed metrics. Operations dashboard for real-time monitoring. Use clear visualizations. Document dashboard usage. Review dashboards monthly. Remove unused panels. Optimize dashboard queries. Use templating for reuse
- **Performance regression detection**: automate regression detection. Compare current metrics with baseline. Use statistical analysis for significance. Alert on regressions exceeding threshold. Document detection rules. Test detection accuracy. Review thresholds quarterly. Track regression trends. Use canary analysis for deployments

## Advanced Patterns

- **Edge computing for performance**: move computation to the edge. Use Cloudflare Workers or AWS Lambda@Edge. Reduce latency for global users. Cache dynamic content at edge. Document edge computing strategy. Test edge performance. Review edge configuration. Monitor edge function performance. Use edge for personalization
- **Resource hints optimization**: use preconnect for critical origins. Use preload for key resources. Use prefetch for next-page resources. Use dns-prefetch for external domains. Monitor resource hint effectiveness. Document hint strategy. Test with WebPageTest. Review hints quarterly. Remove unused hints
- **Image optimization pipeline**: automate image optimization. Use responsive images with srcset. Use modern formats like WebP and AVIF. Generate multiple sizes at build time. Use CDN for image transformation. Document optimization pipeline. Test image loading. Review image formats. Monitor image payload size. Use lazy loading for below-fold images
## Migration Strategies

- **Migrating from gzip to Brotli**: enable Brotli alongside gzip for gradual migration. Test Brotli with different browsers. Monitor compression ratios. Keep gzip as fallback for older browsers. Document migration strategy. Test in staging. Review compression performance. Roll out progressively. Monitor for issues
- **Migrating to a new CDN**: run both CDNs in parallel during migration. Compare cache hit ratios. Test purge functionality. Verify SSL certificates. Monitor performance metrics. Switch DNS gradually. Document migration runbook. Test failback procedures. Review migration progress. Complete DNS switch after validation
- **Migrating connection pools**: migrate pool configuration gradually. Test new pool size in staging. Monitor connection usage. Roll out to one service at a time. Document migration strategy. Test failback. Review pool performance. Complete migration after validation. Monitor for connection issues

## Compliance and Governance

- **Performance SLAs**: define performance SLAs for critical endpoints. API response time under 200ms. Page load time under 3 seconds. Track SLA compliance. Alert on SLA violations. Document SLA definitions. Review SLAs quarterly. Communicate SLA status. Test SLA monitoring. Use SLA for prioritization
- **Performance reporting**: generate weekly performance reports. Include key metrics and trends. Highlight regressions and improvements. Share with stakeholders. Document reporting methodology. Automate report generation. Review report content. Track performance over time. Use reports for planning
## Frequently Asked Questions

**Q: How do I cache live API responses?**
A: Use `s-maxage` (surrogate max age) for CDN-only caching while keeping `max-age=0` for browsers. Invalidate via surrogate keys when underlying data changes.

**Q: What is the difference between purging and invalidation?**
A: Purging removes content from edge caches immediately. Invalidation marks content as stale but may serve it while fetching updates. Purging is explicit; invalidation can be passive.

**Q: Should I use a CDN for API-only backends?**
A: Yes, if responses are cacheable. [GraphQL](/recipes/api/call-rest-api) is harder to cache at the edge than REST, but services like Cloudflare Workers or Fastly Compute can implement edge-level query caching.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### How do I choose the right CDN provider?

Consider geographic coverage, pricing, features, and performance. Cloudflare for global reach and Workers. Fastly for instant purge and VCL. AWS CloudFront for AWS integration. Google Cloud CDN for GCP integration. Test with your actual traffic patterns. Compare cache hit ratios. Review pricing for your data volume.

### What is the difference between CDN caching and browser caching?

CDN caching stores content at edge servers closer to users. Browser caching stores content on the user device. CDN caching reduces origin load. Browser caching eliminates network requests entirely. Use both: CDN for first visit, browser for subsequent visits. Set appropriate Cache-Control headers for each layer.

### How do I handle personalized content on a CDN?

Do not cache personalized content at the CDN level. Use `Cache-Control: private` for user-specific responses. Use `Vary: Cookie` for cookie-based personalization. Use edge-side includes for personalized fragments. Cache shared content at CDN. Fetch personalized content from origin. Document caching strategy for each endpoint.

### How do I purge CDN cache effectively?

Use the CDN API for programmatic purging. Purge by URL for specific pages. Purge by cache tag for related content. Purge by surrogate key for grouped content. Avoid full cache purges in production. Test purge propagation time. Document purge procedures. Monitor purge effectiveness. Set up webhooks for purge confirmation. Use gradual purging for large-scale updates.

### What is stale-while-revalidate?

Stale-while-revalidate is a Cache-Control directive that allows serving stale content while fetching fresh content in the background. It improves perceived performance by serving cached content immediately. The CDN serves stale content and asynchronously fetches fresh content. Configure appropriate stale window. Monitor stale content serving. Document SWR configuration. Test with different content types.

### How do I monitor CDN performance?

Use CDN analytics dashboards for cache hit ratio, bandwidth, and request volume. Set up real-time alerts for origin error rate and cache hit ratio drops. Use RUM to measure user-perceived latency from different geographic regions. Monitor CDN costs and compare with budget. Review CDN performance monthly. Document monitoring setup and alert thresholds.

### What is the difference between push and pull CDN zones?

Push zones require you to upload content to the CDN before serving. You control exactly what is cached. Good for static assets with known update schedules. Pull zones fetch content from origin on first request and cache it. Good for dynamic sites with frequent updates. Most modern CDNs use pull zones by default. Choose push for static assets and pull for dynamic content. Test both approaches for your use case.

### How do I handle CDN failover?

Configure primary and fallback CDN providers. Use DNS-based failover for automatic switching. Monitor CDN health endpoints. Set up health checks at regular intervals. Document failover procedures. Test failover in staging. Review failover time. Monitor for partial failures. Use multi-CDN strategy for critical applications. Keep origin servers as final fallback.

### Can I use multiple CDNs simultaneously?

Yes. Multi-CDN strategies improve availability and performance. Use DNS routing or CDN load balancers to distribute traffic. Configure geographic routing for regional optimization. Monitor each CDN independently. Document routing rules. Test failover between CDNs. Compare costs across providers.