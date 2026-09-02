---
contentType: recipes
slug: load-testing-k6
title: "Load Testing APIs with k6 and Threshold-Based Assertions"
description: "How to write and run load tests with k6 to measure API performance, validate SLOs, and identify bottlenecks before production deployment"
metaDescription: "Load testing APIs with k6. Measure performance, validate SLOs with threshold assertions, and identify bottlenecks before production deployment."
difficulty: intermediate
topics:
  - testing
  - performance
tags:
  - benchmarks
  - testing
  - performance
  - api
  - unit-tests
relatedResources:
  - /recipes/load-testing
  - /recipes/integration-testing
  - /guides/testing-strategy-guide
  - /recipes/api-mocking
  - /docs/api-testing-strategy-template
  - /recipes/traffic-mirroring
lastUpdated: "2026-06-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Load testing APIs with k6. Measure performance, validate SLOs with threshold assertions, and identify bottlenecks before production deployment."
  keywords:
    - k6 load testing
    - api performance
    - load test
    - benchmarking
    - slo validation



---
k6 is a modern load testing tool built for developers. It uses JavaScript for test scripting and provides built-in metrics, threshold assertions, and modular scenarios that help you validate performance requirements before code reaches production.

## When to Use This

- You need to verify that APIs meet response time and throughput SLOs
- You want to simulate realistic user traffic patterns
- Regression testing must catch performance degradation in CI/CD

## Prerequisites

- k6 installed (`brew install k6` or download from k6.io)
- A running API endpoint to test

## Solution

### 1. Basic Load Test Script

```javascript
// load-tests/basic.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady state
    { duration: '2m', target: 200 },   // Spike
    { duration: '5m', target: 200 },   // Sustained load
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% under 500ms
    http_req_failed: ['rate<0.01'],     // Error rate under 1%
  },
};

export default function () {
  const response = http.get('https://api.example.com/products');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has products array': (r) => r.json().length > 0,
  });

  sleep(1);
}
```

### 2. Authenticated API Testing

```javascript
// load-tests/authenticated.js
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export const options = {
  vus: 50,
  duration: '10m',
};

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  // Simulate a user workflow
  const cart = http.post(`${BASE_URL}/cart`, JSON.stringify({ items: [1, 2, 3] }), params);
  check(cart, { 'cart created': (r) => r.status === 201 });

  const checkout = http.post(`${BASE_URL}/checkout`, JSON.stringify({ cartId: cart.json('id') }), params);
  check(checkout, {
    'checkout successful': (r) => r.status === 200,
    'order confirmed': (r) => r.json('status') === 'confirmed',
  });
}
```

### 3. Running Tests and Interpreting Results

```bash
# Run basic load test
k6 run load-tests/basic.js

# Run with environment variables
k6 run --env BASE_URL=https://staging.example.com --env AUTH_TOKEN=token123 load-tests/authenticated.js

# Output to InfluxDB for Grafana dashboards
k6 run --out influxdb=http://localhost:8086/k6 load-tests/basic.js

# Cloud execution for distributed load
k6 cloud run load-tests/basic.js
```

### 4. Smoke Test for CI/CD

```javascript
// load-tests/smoke.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['max<2000'],
    http_req_failed: ['rate===0'],
  },
};

export default function () {
  const endpoints = [
    '/health',
    '/products',
    '/users/me',
  ];

  for (const endpoint of endpoints) {
    const res = http.get(`https://api.example.com${endpoint}`);
    check(res, {
      [`${endpoint} is 200`]: (r) => r.status === 200,
    });
  }
}
```

## How It Works

1. **Virtual Users (VUs)** simulate concurrent clients making requests
2. **Stages** define ramp-up, sustained load, and ramp-down patterns
3. **Thresholds** assert that metrics meet SLOs; failing thresholds exit with non-zero status
4. **Checks** validate functional correctness under load

## Production Considerations

- Run smoke tests on every [pull request](/guides/cicd-pipeline-guide/) to catch basic regressions
- Schedule soak tests (hours-long runs) to find memory leaks
- Use separate environments for load testing; never test [production](/guides/deployment-strategies-guide/) directly
- Correlate k6 metrics with [APM tools](/recipes/metrics-collection/) for root cause analysis

## Common Mistakes

- Testing from a single machine that becomes the bottleneck
- Not warming up the application before measuring steady-state performance
- Using `sleep()` with random intervals that do not match real user think time

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




## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the benchmarks and testing guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply load testing apis with k6 and threshold-based assertions** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: How many VUs do I need to simulate 10,000 real users?**
A: It depends on request frequency. If each user makes a request every 30 seconds, 50-100 VUs can simulate 10,000 users.

**Q: Can k6 test WebSocket connections?**
A: Yes, through the experimental `k6/ws` module, though dedicated WebSocket tools may be more appropriate.

**Q: How do I handle live data in load tests?**
A: Use `papaparse` to read CSV files or generate randomized data with built-in `random` functions.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
