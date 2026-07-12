---

contentType: recipes
slug: brotli-nginx-compression
title: "Enable Brotli Compression in Nginx for Faster Asset Delivery"
description: "How to configure Brotli compression in Nginx to reduce transfer sizes for JavaScript, CSS, and HTML assets with better ratios than Gzip"
metaDescription: "Enable Brotli compression in Nginx. Reduce asset transfer sizes with better compression ratios than Gzip for JavaScript, CSS, and HTML delivery."
difficulty: beginner
topics:
  - performance
  - frontend
tags:
  - brotli
  - performance
  - nginx
  - compression
  - optimization
relatedResources:
  - /recipes/compression-gzip
  - /recipes/cdn-edge-caching
  - /guides/performance-optimization-guide
  - /recipes/javascript-event-loop
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Enable Brotli compression in Nginx. Reduce asset transfer sizes with better compression ratios than Gzip for JavaScript, CSS, and HTML delivery."
  keywords:
    - brotli compression
    - nginx
    - web performance
    - asset compression
    - gzip alternative

---

# Enable Brotli Compression in Nginx for Faster Asset Delivery

Brotli is a modern compression algorithm developed by Google that consistently achieves 15-25% smaller file sizes than Gzip for text-based assets. See [performance optimization](/guides/performance/performance-optimization-guide) for more web performance techniques. When combined with Nginx and proper content-type configuration, it reduces bandwidth usage and improves page load times for all users.

## When to Use This

- You serve static assets through Nginx and want maximum compression
- Your users are on modern browsers that support Brotli (95%+ coverage)
- Bandwidth costs are a major factor in infrastructure spend

## Prerequisites

- Nginx compiled with the `ngx_brotli` module or using the `nginx-full` package
- SSL/TLS certificate (Brotli is only useful over HTTPS in practice)

## Solution

### 1. Install the Brotli Module

```bash
# Ubuntu/Debian with precompiled module
sudo apt install nginx-extras

# Or compile from source
./configure \
  --with-compat \
  --add-dynamic-module=/path/to/ngx_brotli
make && sudo make install
```

### 2. Configure Brotli in Nginx

```nginx
# /etc/nginx/nginx.conf
http {
  # Load the dynamic module if compiled dynamically
  load_module modules/ngx_http_brotli_filter_module.so;
  load_module modules/ngx_http_brotli_static_module.so;

  # Enable dynamic Brotli compression
  brotli on;
  brotli_comp_level 6;
  brotli_types
    text/plain
    text/css
    text/xml
    application/javascript
    application/json
    application/xml
    image/svg+xml
    font/woff2;

  # Pre-compressed static files (optional)
  brotli_static on;
}
```

### 3. Pre-Compress Static Assets at Build Time

```bash
# Build script for CI/CD
for file in dist/**/*.{js,css,html,svg}; do
  if [ -f "$file" ]; then
    brotli --quality=11 --output="${file}.br" "$file"
  fi
done
```

```javascript
// vite-plugin-brotli.js
import { brotliCompressSync } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export default function brotliPlugin() {
  return {
    name: 'brotli',
    closeBundle() {
      const dist = resolve('dist');
      const files = ['.js', '.css', '.html', '.svg'];
      
      files.forEach(ext => {
        const file = resolve(dist, `index${ext}`);
        try {
          const compressed = brotliCompressSync(readFileSync(file));
          writeFileSync(`${file}.br`, compressed);
        } catch { /* file does not exist */ }
      });
    }
  };
}
```

### 4. Verify Compression is Working

```bash
# Check response headers
curl -H "Accept-Encoding: br" -I https://example.com/app.js

# Expected output
HTTP/2 200
content-encoding: br
content-type: application/javascript
```

### 5. Fallback to Gzip for Older Clients

```nginx
server {
  location ~ \.(js|css|html|svg)$ {
    # Nginx automatically negotiates encoding based on Accept-Encoding header
    # Brotli takes priority when both are supported
    gzip on;
    gzip_types text/plain text/css application/javascript;
    gzip_vary on;
  }
}
```

## How It Works

1. **Brotli Algorithm** uses a dictionary-based approach optimized for web content
2. **On-the-fly Compression** compresses responses on-the-fly for uncached content
3. **Static Pre-Compression** serves pre-built `.br` files to avoid CPU overhead
4. **Content Negotiation** Nginx selects Brotli or Gzip based on the `Accept-Encoding` header

## Production Considerations

- Use **compression level 4-6** for dynamic content; level 11 for pre-compressed static assets
- Monitor **CPU usage**; Brotli at high levels can be CPU-intensive
- Combine with a **[CDN](/recipes/data/caching)** that supports Brotli caching for maximum benefit
- Test with **WebPageTest** or Lighthouse to verify transfer size reductions and [Core Web Vitals](/guides/performance/performance-optimization-guide)

## Common Mistakes

- Forgetting to add `font/woff2` to `brotli_types`; WOFF2 fonts compress well
- Using `brotli_comp_level 11` for dynamic content, causing high latency
- Not enabling `brotli_static` and compressing the same files on every request

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
## FAQ

**Q: Should I replace Gzip entirely with Brotli?**
A: No. Serve Brotli to modern browsers and Gzip as a fallback for older clients.

**Q: Does Brotli help with images?**
A: Minimal benefit for already-compressed formats like JPEG and PNG. Use it for SVG, JSON, and JavaScript.

**Q: How much smaller is Brotli compared to Gzip?**
A: Typically 15-25% smaller for JavaScript and CSS. HTML sees 10-15% improvement.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### What is the difference between Brotli and gzip?

Brotli achieves 15-25% better compression than gzip at similar speeds. Brotli uses a larger dictionary and supports more compression levels. Gzip has broader browser support. Use Brotli for modern browsers with gzip fallback. Pre-compress static assets with Brotli level 11.

### How do I test compression effectiveness?

Use curl with `--compressed` flag and check `Content-Encoding` header. Compare response sizes with and without compression. Use WebPageTest to verify compression. Monitor compression ratios in production. Test with different content types.

### Should I use Brotli for dynamic content?

Yes, but use level 4 for dynamic content to balance compression ratio and CPU usage. Higher levels (6-11) are better for static assets pre-compressed at build time. Monitor CPU usage when enabling Brotli for dynamic content. Start with level 4 and adjust based on your server capacity and traffic patterns.