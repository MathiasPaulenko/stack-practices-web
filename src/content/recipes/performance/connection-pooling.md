---
contentType: recipes
slug: connection-pooling
title: "Set Up Connection Pooling for Databases and HTTP Clients"
description: "How to set up connection pooling for databases and HTTP clients to improve performance and reliability"
metaDescription: "Set up connection pooling for PostgreSQL, MySQL, Redis, and HTTP clients. Improve throughput, reduce latency, and prevent connection exhaustion."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
  - optimization
  - profiling
  - latency
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/performance-optimization-guide
  - /recipes/cdn-edge-caching
  - /recipes/debounce-throttle
  - /patterns/cache-aside-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Set up connection pooling for PostgreSQL, MySQL, Redis, and HTTP clients. Improve throughput, reduce latency, and prevent connection exhaustion."
  keywords:
    - connection-pooling
    - database
    - postgresql
    - redis
    - http-client
    - performance
---
## Overview

Opening a new database or HTTP connection for every request is expensive. Connection pooling maintains a reusable set of established connections, dramatically reducing latency and preventing resource exhaustion under load. Most production incidents related to "too many connections" are solved by proper pool configuration.

The solution below covers database connection pooling with PostgreSQL, MySQL, and Redis, plus HTTP client pooling for outbound API calls.

## When to Use

Use this resource when:
- Your application opens a new connection per request and throughput is lagging
- You hit "too many connections" errors under load
- You make frequent outbound HTTP API calls and want to reuse TCP connections
- You need to tune concurrency limits for a web service or worker

## Solution

### Python

```python
import psycopg2
from psycopg2 import pool
import requests
from requests.adapters import HTTPAdapter

# PostgreSQL connection pool
pg_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host="localhost",
    database="app",
    user="app",
    password="secret"
)

def get_user(user_id: int):
    conn = pg_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()
    finally:
        pg_pool.putconn(conn)

# HTTP client connection pooling
session = requests.Session()
adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20)
session.mount("https://", adapter)
session.mount("http://", adapter)

resp = session.get("https://api.example.com/data")
```

### JavaScript

```javascript
const { Pool } = require('pg');
const axios = require('axios');

// PostgreSQL connection pool
const pgPool = new Pool({
  host: 'localhost',
  database: 'app',
  user: 'app',
  password: 'secret',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function getUser(userId) {
  const client = await pgPool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// HTTP client with keep-alive
const httpAgent = new (require('http').Agent)({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new (require('https').Agent)({ keepAlive: true, maxSockets: 20 });

const api = axios.create({ httpAgent, httpsAgent });
```

### Java

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;

// HikariCP — the gold standard for JVM connection pooling
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost/app");
config.setUsername("app");
config.setPassword("secret");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setConnectionTimeout(2000);
config.setIdleTimeout(30000);
config.addDataSourceProperty("cachePrepStmts", "true");

HikariDataSource ds = new HikariDataSource(config);

try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    ps.setInt(1, userId);
    ResultSet rs = ps.executeQuery();
    while (rs.next()) {
        System.out.println(rs.getString("name"));
    }
}

// HTTP client with connection pooling (Java 11+)
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
```

## Explanation

Connection pooling works by maintaining a bounded queue of already-established TCP connections. When your code requests a connection, the pool hands out an idle one instead of opening a new socket. When the operation completes, the connection is returned to the pool rather than closed.

**Key pool parameters:**
- **min connections**: Pre-warmed connections ready at startup
- **max connections**: Hard ceiling to protect the database or remote server
- **connection timeout**: How long to wait for an available connection before failing
- **idle timeout**: How long to keep an unused connection open before closing

For HTTP clients, `keep-alive` reuses the underlying TCP connection across multiple requests to the same host, eliminating the TLS handshake overhead on every call.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| PostgreSQL | psycopg2.pool / pg / HikariCP | ThreadedConnectionPool for threads, AsyncConnectionPool for asyncio |
| MySQL | mysql-connector-python / mysql2 / HikariCP | Same pool concepts, watch for `wait_timeout` server setting |
| Redis | redis-py connection pool / ioredis / Lettuce | Redis is fast, but pool still matters at high concurrency |
| HTTP (Python) | requests Session + HTTPAdapter | `pool_maxsize` controls per-host connections |
| HTTP (Node) | axios + http.Agent | `maxSockets` controls parallel connections |
| HTTP (Java) | Apache HttpClient / OkHttp | Built-in connection managers with per-route limits |

## What Works

1. Set `max pool size` to roughly the number of concurrent workers (threads, processes, or event loop concurrency)
2. Always `release()` or `putconn()` connections in a `finally` block to prevent leaks
3. Set `connectionTimeout` lower than your application's overall request timeout
4. Monitor pool metrics: active, idle, waiting, and total connections
5. Use prepared statement caching at the pool level when available (e.g., HikariCP `cachePrepStmts`)

## Common Mistakes

1. **Not releasing connections** — always return connections to the pool, even on exceptions
2. **Pool size = 1** — serializes all database access and kills throughput
3. **Pool too large** — can overwhelm the [database](/guides/databases/database-design-guide) with `max_connections` limits
4. **Ignoring idle timeouts** — stale connections cause silent failures or half-open sockets
5. **No HTTP keep-alive** — reopening TLS for every outbound request wastes milliseconds

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

### What is the optimal pool size?

A good starting point is `(core_count * 2) + effective_spindle_count` for OLTP workloads. For cloud databases, match pool size to application concurrency, not CPU cores. Monitor `waiting` metrics and increase only if connections queue up.

### Should I use one pool or many?

One pool per database per application instance is standard. Creating multiple pools to the same database fragments resources and reduces efficiency. For [microservices](/guides/architecture/microservices-architecture-guide), each service manages its own pool.

### How do I handle pool exhaustion?

Set a reasonable `connectionTimeout` so requests fail fast instead of hanging indefinitely. Add [circuit breakers](/patterns/design/circuit-breaker-pattern) or [retries with backoff](/recipes/architecture/retry-backoff). Monitor pool saturation and scale the database or application workers before exhaustion becomes critical.