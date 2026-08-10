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
  - /recipes/redis-cache-patterns
  - /recipes/cache-invalidation
  - /recipes/database-indexing
  - /recipes/query-optimization
lastUpdated: "2026-06-12"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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
3. Set `connectionTimeout` lower than your application's end-to-end request timeout
4. Monitor pool metrics: active, idle, waiting, and total connections
5. Use prepared statement caching at the pool level when available (e.g., HikariCP `cachePrepStmts`)

## Common Mistakes

1. **Not releasing connections** — always return connections to the pool, even on exceptions
2. **Pool size = 1** — serializes all database access and kills throughput
3. **Pool too large** — can overwhelm the [database](/guides/database-design-guide/) with `max_connections` limits
4. **Ignoring idle timeouts** — stale connections cause silent failures or half-open sockets
5. **No HTTP keep-alive** — reopening TLS for every outbound request wastes milliseconds

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
- **Related guides**: explore the performance and database guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply set up connection pooling for databases and http clients** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

### What is the optimal pool size?

A good starting point is `(core_count * 2) + effective_spindle_count` for OLTP workloads. For cloud databases, match pool size to application concurrency, not CPU cores. Monitor `waiting` metrics and increase only if connections queue up.

### Should I use one pool or many?

One pool per database per application instance is standard. Creating multiple pools to the same database fragments resources and reduces efficiency. For [microservices](/guides/microservices-architecture-guide/), each service manages its own pool.

### How do I handle pool exhaustion?

Set a reasonable `connectionTimeout` so requests fail fast instead of hanging indefinitely. Add [circuit breakers](/patterns/circuit-breaker-pattern/) or [retries with backoff](/recipes/retry-backoff/). Monitor pool saturation and scale the database or application workers before exhaustion becomes critical.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
