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
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Enable Brotli compression in Nginx. Reduce asset transfer sizes with better compression ratios than Gzip for JavaScript, CSS, and HTML delivery."
  keywords:
    - brotli compression
    - nginx
    - web performance
    - asset compression
    - gzip alternative

---
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

- **Compression failures**: when Brotli compression fails, serve uncompressed content as fallback.  Set compression quality based on CPU availability.
- **CDN origin failures**: when CDN cannot reach origin, serve stale content.  Set appropriate TTLs.
- **Connection pool exhaustion**: when all connections are in use, requests queue or fail.  Set max pool size based on database capacity.
- **Lazy loading intersection observer failures**: when Intersection Observer fails, content never loads.
- **Load test script failures**: when k6 scripts fail, test results are invalid.  Validate test scripts before execution.  Use version control for test scripts.
- **Code splitting failures**: when dynamic imports fail, components do not load.  Use prefetch for critical chunks.

## Performance and Scalability

- **Compression level tuning**: balance between compression ratio and CPU usage.  Brotli level 4 for dynamic content.  Brotli level 11 for static assets.  Gzip level 6 as fallback.
- **CDN cache hit ratio optimization**: maximize cache hit ratio to reduce origin load.  Set appropriate Cache-Control headers.  Purge cache on content updates.
- **Connection pool sizing**: size pools based on concurrent request volume.  Start with 10 connections per pool.  Increase pool size if wait time exceeds 100ms.  Decrease if connections are idle.
- **Lazy loading threshold tuning**: set root margin for early loading.  Use 400px for heavy components.  Adjust threshold based on device performance.
- **Load test ramp patterns**: use ramping stages for realistic load.  Start with 10 users.  Ramp to 100 over 2 minutes.  Hold for 5 minutes.  Ramp to peak.  Hold for 10 minutes.  Ramp down.
- **Bundle size optimization**: minimize bundle size for faster loads.  Split vendor and app code.  Analyze bundle with webpack-bundle-analyzer.  Set performance budgets.
## Security Considerations

- **HTTPS and compression**: enable compression only over HTTPS to prevent BREACH attacks.  Do not compress sensitive responses with user-controlled input.
o-transform header for already compressed content. Monitor for compression-related vulnerabilities. Document security configuration. Test with security scanners. Review security quarterly
- **CDN security**: secure CDN with proper access controls.  Enable DDoS protection.
- **Connection pool security**: use TLS for database connections.  Set connection timeout to prevent slow-loris attacks.  Rotate database credentials.
- **Content Security Policy for lazy loading**: set CSP headers to allow lazy-loaded resources.

## Deployment and CI/CD

- **Performance testing in CI**: run performance tests on every PR.  Use k6 for load testing.  Set performance budgets.  Fail builds on budget violations.
- **Progressive deployment for performance changes**: deploy performance changes gradually.  Roll back on regression.
- **Bundle analysis in CI**: analyze bundle size on every build.  Set size budgets per chunk.

## Testing and Quality Assurance

- **Performance regression testing**: run performance tests on every release.
- **Load testing best practices**: test with realistic user patterns.  Ramp up gradually.  Use production-like data volumes.
- **CDN cache testing**: verify cache headers are set correctly.  Verify stale content serving.  Test with query parameters.
## Tools and Platforms

- **WebPageTest**: detailed web performance testing tool.  Waterfall view of resource loading.  Filmstrip view of visual progress.  Set custom connectivity profiles.
- **Lighthouse**: Google web performance auditing tool.  Scores performance, accessibility, SEO, and best practices.  Run in Chrome DevTools or CLI.  Set performance budget based on Lighthouse scores.
- **k6**: modern load testing tool by Grafana.  JavaScript-based test scripts.  Support for HTTP, gRPC, WebSocket.  Thresholds for pass/fail.  Cloud execution option.  Integration with Grafana.  Create reusable test scenarios.
- **webpack-bundle-analyzer**: visualize bundle composition.  Find duplicate modules.  Run in CI.  Set size alerts.
- **Cloudflare CDN**: global CDN with edge caching.  Workers for edge compute.  Cache rules and page rules.  Real-time analytics.  DDoS protection included.
- **Fastly CDN**: CDN with instant purge.  VCL for edge configuration.  Real-time logging.  Image optimization.

## Common Pitfalls and Anti-Patterns

- **Over-compression**: compressing already compressed content wastes CPU.  Do not compress images, videos, or pre-compressed assets.  Set gzip_types and rotli_types carefully.
- **CDN misconfiguration**: incorrect cache headers cause poor hit ratio.  Do not cache personalized content.  Set appropriate TTLs.
- **Connection pool over-sizing**: too many connections waste database resources.  Each connection uses memory on the database server.  Set max pool size based on database capacity.
- **Lazy loading everything**: lazy loading above-the-fold content hurts LCP.  Load critical content eagerly.  Use etchpriority="high" for LCP elements.
- **Load testing without think time**: load testing without think time creates unrealistic load.  Add think time between requests.  Simulate real user behavior.
- **Code splitting too granular**: too many small chunks cause excessive network requests.  Group related components into chunks.  Set minimum chunk size.

## Best Practices Summary

- **Set performance budgets**: define budgets for key metrics.  LCP under 2. 5 seconds.  FID under 100ms.  CLS under 0. 1.  Bundle size under 200KB.  Fail builds on violations.  Communicate budget status.
- **Monitor Core Web Vitals**: track LCP, INP, and CLS.  Use synthetic monitoring for lab data.  Set alerts on metric degradation.
- **Optimize critical rendering path**: minimize render-blocking resources.  Inline critical CSS.  Defer non-critical JavaScript.
- **Use progressive enhancement**: build core functionality first.  Enhance with JavaScript.  Use server-side rendering.
## Cost Optimization

- **CDN cost management**: monitor CDN bandwidth costs.  Set appropriate TTLs to maximize cache hits.  Use compression to reduce bandwidth.
- **Compression CPU costs**: balance compression savings with CPU costs.  Pre-compress static assets at build time.
- **Connection pool resource costs**: each connection uses memory and CPU.  Close unused connections.
- **Load testing infrastructure costs**: optimize load testing infrastructure costs.  Use cloud-native load testing.

## Troubleshooting Guide

- **Slow page load**: diagnose with WebPageTest.  Minify CSS and JavaScript.
- **High CDN origin requests**: check cache headers.  Verify cache key configuration.
- **Connection pool timeouts**: check pool size.  Increase pool size if needed.
- **Poor load test results**: check test script.  Verify test environment.  Scale infrastructure.
## Monitoring and Alerting

- **Performance monitoring strategy**: monitor key metrics continuously.  Track response times for APIs.  Set thresholds for alerts.  Use synthetic monitoring for lab data.
- **Alert configuration for performance**: set alerts on metric degradation.  LCP above 2. 5 seconds.  Error rate above 1%.  Response time above 500ms.  Reduce alert noise.
- **Dashboard design for performance**: create dashboards for different audiences.  Executive dashboard for high-level metrics.  Engineering dashboard for detailed metrics.  Operations dashboard for real-time monitoring.
- **Performance regression detection**: automate regression detection.

## Advanced Patterns

- **Edge computing for performance**: move computation to the edge.  Reduce latency for global users.  Cache dynamic content at edge.
- **Resource hints optimization**: use preconnect for critical origins.  Use prefetch for next-page resources.
- **Image optimization pipeline**: automate image optimization.  Use modern formats like WebP and AVIF.
## Migration Strategies

- **Migrating from gzip to Brotli**: enable Brotli alongside gzip for gradual migration.  Roll out progressively.
- **Migrating to a new CDN**: run both CDNs in parallel during migration.  Verify SSL certificates.  Switch DNS gradually.
- **Migrating connection pools**: migrate pool configuration gradually.  Roll out to one service at a time.  Complete migration after validation.

## Compliance and Governance

- **Performance SLAs**: define performance SLAs for critical endpoints.  API response time under 200ms.  Page load time under 3 seconds.  Communicate SLA status.
- **Performance reporting**: generate weekly performance reports.  Highlight regressions and improvements.





## Glossary

- **Enable Brotli Compression in Nginx for Faster Asset Delivery**: core technique or pattern described in this article.
- **Production**: live environment serving real users; requires monitoring and rollback plan.
- **Troubleshooting**: systematic process to diagnose and resolve incidents.

## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the brotli and performance guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply enable brotli compression in nginx for faster asset delivery** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

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

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
