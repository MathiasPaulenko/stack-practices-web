---


contentType: recipes
slug: load-testing
title: "Perform Load Testing on APIs"
description: "How to simulate realistic traffic, measure response times, and identify bottlenecks using k6 and JMeter for APIs and web services."
metaDescription: "Learn load testing with k6 and JMeter. Simulate traffic, measure API response times, identify bottlenecks, and validate scalability under realistic load."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - api-testing
  - benchmarks
  - unit-tests
  - integration
relatedResources:
  - /recipes/integration-testing
  - /recipes/rate-limiting
  - /recipes/connection-pooling
  - /recipes/load-testing-k6
  - /recipes/unit-testing-mocking
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn load testing with k6 and JMeter. Simulate traffic, measure API response times, identify bottlenecks, and validate scalability under realistic load."
  keywords:
    - load testing
    - k6
    - jmeter
    - api performance
    - stress testing
    - scalability testing
    - performance benchmarks


---

## Overview

Load testing measures how a system behaves under a specific volume of concurrent users or requests. Unlike functional tests that verify correctness, load tests reveal performance limits: at what point does response time degrade from 50ms to 2 seconds? At what load do errors spike from 0.1% to 10%? When does the database connection pool exhaust?

Modern load testing tools like k6 and JMeter let you define scenarios in code or configuration, run them from the command line or CI pipelines, and export detailed metrics. The solution below covers how to design realistic load tests, interpret the results, and iterate on performance improvements.

## When to Use

Use this recipe when:

- Preparing for a product launch, marketing campaign, or seasonal traffic spike. See [Connection Pooling](/recipes/databases/database-connection-pooling) for handling concurrent database connections.
- Migrating infrastructure and needing to validate the new platform handles equivalent load
- Establishing performance baselines and Service Level Objectives (SLOs). See [Caching Strategies](/recipes/performance/caching-strategies) for reducing load on backend services.
- Investigating intermittent timeouts or errors that only appear under concurrent load. See [Rate Limiting](/recipes/api/rate-limiting) for protecting APIs under heavy traffic.
- Comparing performance before and after a major code or infrastructure change

## Solution

### k6 (JavaScript/Go-based)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up to 100 users
    { duration: '5m', target: 100 },   // sustain load
    { duration: '2m', target: 200 },   // ramp up to 200 users
    { duration: '5m', target: 200 },   // sustain higher load
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],     // error rate below 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### JMeter (XML/ GUI-based)

```xml
<!-- Test Plan: HTTP Request sampler with Thread Group -->
<ThreadGroup testname="API Load Test" guiclass="ThreadGroupGui">
  <stringProp name="ThreadGroup.num_threads">100</stringProp>
  <stringProp name="ThreadGroup.ramp_time">60</stringProp>
  <stringProp name="ThreadGroup.duration">300</stringProp>
  <elementProp name="HTTPsampler" elementType="HTTPSamplerProxy">
    <stringProp name="HTTPSampler.domain">api.example.com</stringProp>
    <stringProp name="HTTPSampler.path">/users</stringProp>
    <stringProp name="HTTPSampler.method">GET</stringProp>
  </elementProp>
</ThreadGroup>
```

### Analyzing Results (k6)

```
http_req_duration..............: avg=234ms  min=45ms  med=198ms max=1.2s  p(90)=412ms p(95)=567ms
http_req_failed................: 0.23%
data_received..................: 12 MB
iterations.....................: 12000
```

## Explanation

- **Virtual Users (VUs)**: Simulated concurrent users making requests. 100 VUs does not mean 100 requests per second — it depends on think time (`sleep`) and response latency.
- **Ramp-up**: Gradually increasing VUs prevents a sudden thundering herd that would distort results. A 2-minute ramp to 100 VUs is more realistic than instant 100 VUs.
- **Thresholds**: Pass/fail criteria defined before the test. If p(95) latency exceeds 500ms, k6 exits with a non-zero code, failing the CI build.
- **Scenarios**: Different user behaviors modeled simultaneously. A realistic e-commerce test might have 80% browsing users, 15% adding to cart, and 5% checking out.

## Variants

| Tool | Scripting | Best For | Infrastructure |
|------|-----------|----------|----------------|
| k6 | JavaScript/Go | Developer-friendly, CI-native | Self-hosted or cloud |
| JMeter | XML/GUI | Complex protocols, enterprise teams | Self-hosted |
| Artillery | YAML/JS | Quick configuration, Node teams | Self-hosted or cloud |
| Locust | Python | Python ecosystems, custom logic | Self-hosted |

## What Works

- **Test against a production-like environment**: testing localhost with a single-core CPU gives meaningless results. Use staging with identical hardware and data volume.
- **Warm up the system first**: caches, connection pools, and JIT compilation need time to stabilize. Run a 5-minute warm-up before measuring.
- **Monitor server-side metrics during the test**: correlate k6 latency spikes with database slow query logs, CPU usage, and memory pressure.
- **Use realistic data distributions**: if 1% of users generate 50% of load (power users), model that. Uniform random distributions rarely match reality.
- **Test idempotent endpoints**: non-idempotent writes (payments, inventory deductions) require special handling to avoid corrupting production data.

## Common Mistakes

- **Testing from a single machine**: your load generator can become the bottleneck. Use k6 cloud or distributed JMeter when pushing thousands of RPS.
- **Ignoring network latency**: testing an API on the same datacenter underestimates real-world latency. Add realistic network delay or test from remote regions.
- **Running short tests**: a 30-second test tells you almost nothing. Meaningful tests run for at least 10 minutes to capture garbage collection cycles and cache warmup.
- **Not validating responses**: a 200ms response that returns an error page is not a success. Always assert status codes and response body content.

## Frequently Asked Questions

### How many virtual users do I need to simulate real traffic?

Model concurrent users, not total users. If you have 10,000 daily users but only 500 active at any moment, test with 500 VUs (plus a safety margin of 20-50%). Calculate concurrent users from analytics: `concurrent_users = (daily_users * avg_session_duration_seconds) / 86400`. For a site with 100,000 daily users and 5-minute average sessions: `(100000 * 300) / 86400 = 347 concurrent users`. Test with 500 VUs to account for peaks. For API testing, calculate RPS from peak hour traffic: if you handle 360,000 requests in the peak hour, that is 100 RPS. Use k6 scenarios with different arrival rates: `scenarios: { browsing: { executor: 'ramping-arrival-rate', startRate: 10, timeUnit: '1s', stages: [{ target: 100, duration: '2m' }] } }`.

### What is the difference between load testing and stress testing?

Load testing validates behavior at expected traffic levels. Stress testing pushes beyond expected levels to find the breaking point and observe recovery behavior. Soak testing runs at normal load for extended periods (hours) to detect memory leaks and resource exhaustion. Spike testing suddenly increases load to verify the system handles sudden bursts. Breakpoint testing incrementally increases load until the system fails, identifying the exact failure threshold. Each test type serves a different purpose: load tests validate SLO compliance, stress tests reveal failure modes, soak tests catch long-running issues, spike tests verify autoscaling. In k6, implement each: `// Stress test\nexport const options = { stages: [{ duration: '10m', target: 1000 }] };\n// Soak test\nexport const options = { stages: [{ duration: '4h', target: 200 }] };\n// Spike test\nexport const options = { stages: [{ duration: '10s', target: 500 }, { duration: '1m', target: 500 }, { duration: '10s', target: 0 }] }`.

### Can I run load tests in CI/CD pipelines?

Yes. k6 and Artillery are designed for this. Run nightly smoke tests (small load) and pre-release regression tests (full load) in your pipeline. In GitHub Actions: `name: Load Test\non: pull_request\njobs:\n  k6:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: grafana/k6-action@v0.3.1\n        with:\n          filename: tests/load/test.js\n          flags: --quiet --thresholds`. Use k6 thresholds to fail the build: `thresholds: { http_req_duration: ['p(95)<500'], http_req_failed: ['rate<0.01'] }`. For cost-effective CI testing, run smoke tests with 10-20 VUs for 1 minute on every PR, and full load tests with 500+ VUs only on release branches. Use k6 cloud for distributed tests: `k6 cloud test.js --vus 500 --duration 10m`. Cache test dependencies in CI: `npm ci` for k6 scripts, `mvn dependency:resolve` for JMeter.

### Should I test production directly?

Only with extreme caution. Use synthetic transactions, read-only endpoints, and off-peak hours. Prefer staging for destructive or write-heavy tests. For production testing, use shadow traffic: mirror real requests to a test endpoint without affecting users. In k6, use the `--out` flag to export metrics without impacting production: `k6 run --out json=results.json test.js`. For read-only production tests: `export default function () { const res = http.get('https://api.example.com/health'); check(res, { 'status is 200': (r) => r.status === 200 }); }`. Use feature flags to isolate test traffic: route test requests to a separate backend pool. Monitor production metrics during testing: if error rate exceeds 0.5%, abort the test immediately. Use k6's `--abort-on-error` flag: `k6 run --abort-on-error test.js`. For payment systems, use sandbox endpoints that simulate the payment processor without real charges.

### How do I correlate load test results with server-side metrics?

Run load tests while monitoring server-side metrics to identify bottlenecks. Use Prometheus and Grafana: `# docker-compose.yml\nservices:\n  prometheus:\n    image: prom/prometheus\n  grafana:\n    image: grafana/grafana`. In k6, export metrics to Prometheus: `k6 run --out experimental-prometheus=http://prometheus:9090 test.js`. Correlate k6 latency with database metrics: query Prometheus for `pg_stat_database_tup_returned` during the test window. Use distributed tracing with Jaeger: instrument the API with OpenTelemetry, then trace specific slow requests found in k6 results. In k6, add custom tags for tracing: `const res = http.get('https://api.example.com/users', { tags: { test_run: 'nightly-2025-01-15' } });`. Monitor JVM metrics for Java applications: `jcmd <pid> GC.heap_info` during the test. Track connection pool usage: `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'` during the test. Use APM tools like Datadog or New Relic to overlay k6 metrics with server metrics in a single dashboard.

### How do I handle authentication in load tests?

Handle authentication by logging in once per VU iteration and reusing tokens. For Bearer tokens: `import http from 'k6/http';\nconst token = __ENV.API_TOKEN;\nexport default function () {\n  const res = http.get('https://api.example.com/users', {\n    headers: { Authorization: `Bearer ${token}` }\n  });\n};`. For OAuth2 login flows: `export default function () {\n  const loginRes = http.post('https://api.example.com/oauth/token', {\n    client_id: 'test_client',\n    client_secret: 'test_secret',\n    grant_type: 'client_credentials'\n  });\n  const token = loginRes.json('access_token');\n  http.get('https://api.example.com/users', {\n    headers: { Authorization: `Bearer ${token}` }\n  });\n}`. For performance, cache tokens across iterations: `let cachedToken = null;\nexport function setup() {\n  const res = http.post('https://api.example.com/oauth/token', { ... });\n  return { token: res.json('access_token') };\n}\nexport default function (data) {\n  http.get('https://api.example.com/users', {\n    headers: { Authorization: `Bearer ${data.token}` }\n  });\n}`. Use k6's `setup()` and `teardown()` functions for login/logout. For JWT with refresh, handle token expiration: `if (Date.now() > tokenExpiry) { refreshToken(); }`.

### How do I test WebSocket connections with k6?

k6 supports WebSocket testing for real-time applications. Create a WebSocket connection: `import ws from 'k6/ws';\nexport default function () {\n  const url = 'wss://api.example.com/ws';\n  ws.connect(url, {}, (socket) => {\n    socket.on('open', () => {\n      socket.send(JSON.stringify({ type: 'subscribe', channel: 'updates' }));\n    });\n    socket.on('message', (data) => {\n      check(data, { 'has payload': (d) => JSON.parse(d).payload !== undefined });\n    });\n    socket.setInterval(() => {\n      socket.send(JSON.stringify({ type: 'ping' }));\n    }, 30000);\n    socket.setTimeout(() => {\n      socket.close();\n    }, 60000);\n  });\n}`. Test connection stability under load: `export const options = {\n  vus: 100,\n  duration: '5m',\n  thresholds: {\n    ws_sessions_opened: ['count>0'],\n    ws_msgs_received: ['rate>10'],\n    ws_sessions_closed: ['rate<0.1']\n  }\n};`. Measure message latency: `socket.on('message', (data) => {\n  const msg = JSON.parse(data);\n  if (msg.timestamp) {\n    const latency = Date.now() - msg.timestamp;\n    console.log(`WS latency: ${latency}ms`);\n  }\n});`. Test reconnection logic: close connections randomly and verify the client reconnects within 5 seconds.

### How do I parameterize load tests with test data?

Use CSV data files or generate test data dynamically. With k6, load CSV data: `import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';\nconst users = papaparse.parse(open('./users.csv'), { header: true }).data;\nexport default function () {\n  const user = users[Math.floor(Math.random() * users.length)];\n  http.post('https://api.example.com/login', {\n    email: user.email,\n    password: user.password\n  });\n}`. Generate random data: `import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';\nexport default function () {\n  const email = `user${randomIntBetween(1, 10000)}@test.com`;\n  http.post('https://api.example.com/users', { email, name: randomString(8) });\n}`. Use k6 execution contexts for unique data per VU: `export default function () {\n  const vuId = __VU;\n  const iterId = __ITER;\n  const email = `user-${vuId}-${iterId}@test.com`;\n  http.post('https://api.example.com/users', { email });\n}`. For JMeter, use CSV Data Set Config: `<CSVDataSet filename="users.csv" variableNames="email,password" delimiter="," recycle=false/>`. For large datasets, use a database: `const db = sql.open('postgres', 'host=localhost dbname=testdb');\nexport default function () {\n  const user = db.query('SELECT email, password FROM test_users ORDER BY RANDOM() LIMIT 1')[0];\n  http.post('https://api.example.com/login', { email: user.email, password: user.password });\n}`.

### How do I measure percentile latencies correctly?

Percentile latencies (p50, p90, p95, p99) provide better insight than averages. A p99 of 2 seconds means 1% of users experience 2+ second delays. In k6, configure thresholds: `thresholds: {\n  http_req_duration: ['p(50)<200', 'p(90)<500', 'p(95)<800', 'p(99)<2000']\n}`. Interpret percentiles: p50 (median) shows typical user experience, p90 shows the slow end, p99 shows tail latency. Do not use averages for latency: a few 10-second outliers can make a 200ms average misleading. Use histograms for visualization: `k6 run --out json=results.json test.js && jq '.metrics.http_req_duration.values' results.json`. For accurate measurements, run tests long enough: 10+ minutes for stable percentiles. Discard the first 2 minutes (warmup) from analysis. Use k6's `--summary-export` for machine-readable output: `k6 run --summary-export=summary.json test.js`. Compare percentiles across test runs to track regressions: store results in a time series database and alert when p95 increases by more than 20%.

### How do I test API rate limiting under load?

Verify rate limiting behavior by sending requests above the rate limit threshold. In k6: `export const options = {\n  scenarios: {\n    burst: {\n      executor: 'constant-arrival-rate',\n      rate: 200,\n      timeUnit: '1s',\n      duration: '1m',\n      preAllocatedVUs: 300\n    }\n  },\n  thresholds: {\n    http_req_failed: ['rate<0.15']\n  }\n};\nexport default function () {\n  const res = http.get('https://api.example.com/api');\n  check(res, {\n    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,\n    'has rate limit headers': (r) => r.headers['X-RateLimit-Limit'] !== undefined\n  });\n}`. Verify the 429 response includes `Retry-After` header: `check(res, {\n  '429 has Retry-After': (r) => r.status !== 429 || r.headers['Retry-After'] !== undefined\n});`. Test rate limit recovery: after hitting the limit, wait and verify requests succeed again: `if (res.status === 429) {\n  const retryAfter = parseInt(res.headers['Retry-After']);\n  sleep(retryAfter + 1);\n  const retryRes = http.get('https://api.example.com/api');\n  check(retryRes, { 'recovered': (r) => r.status === 200 });\n}`. Test per-user rate limits: use different API keys per VU. Test sliding window vs fixed window behavior: send requests at the boundary of the window.

### How do I distribute load tests across multiple machines?

For high-volume testing (10,000+ VUs), distribute across multiple machines. With k6 cloud: `k6 cloud test.js --vus 10000 --duration 10m`. For self-hosted distributed k6, use k6-operator on Kubernetes: `# k6-operator.yaml\napiVersion: k6.io/v1alpha1\nkind: K6\nmetadata:\n  name: k6-sample\nspec:\n  parallelism: 10\n  script:\n    configMap:\n      name: k6-script\n      file: test.js`. For JMeter distributed testing: `jmeter -n -t test.jmx -r server1,server2,server3 -l results.jtl`. Configure JMeter servers: `jmeter-server -Djava.rmi.server.hostname=server1`. For Locust distributed: `locust --master --host=https://api.example.com` and `locust --worker --master-host=master-host`. Ensure load generators are in the same region as the target to minimize network variance. Monitor load generator CPU: if it exceeds 80%, add more machines. Use a coordinator to aggregate results: `k6 cloud test.js` handles this automatically. For custom aggregation, send results to a shared InfluxDB: `k6 run --out influxdb=http://influxdb:8086/k6 test.js`.

### How do I handle database load testing?

Test database performance under concurrent connections and complex queries. Use k6 with the `k6/x/sql` extension: `import sql from 'k6/x/sql';\nconst db = sql.open('postgres', 'host=localhost dbname=testdb user=test password=test');\nexport const options = { vus: 50, duration: '5m' };\nexport default function () {\n  const rows = db.query('SELECT * FROM users WHERE created_at > NOW() - INTERVAL \'1 day\' LIMIT 100');\n  check(rows, { 'has results': (r) => r.length > 0 });\n}`. Test connection pool exhaustion: `export const options = { vus: 200, duration: '3m' };\nexport default function () {\n  const result = db.query('SELECT pg_sleep(0.5)');\n  // With 200 VUs and 500ms queries, you need 100+ connections\n}`. Monitor database metrics during the test: `SELECT count(*) FROM pg_stat_activity; SELECT * FROM pg_stat_database WHERE datname = 'testdb';`. Test read/write ratios: `// 80% reads, 20% writes\nif (Math.random() < 0.8) {\n  db.query('SELECT * FROM users WHERE id = $1', [randomId]);\n} else {\n  db.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [randomId]);\n}`. For index validation, run `EXPLAIN ANALYZE` on slow queries found during the test. Test transaction deadlocks: `db.exec('BEGIN'); db.query('UPDATE accounts SET balance = balance - 10 WHERE id = $1', [fromId]); db.query('UPDATE accounts SET balance = balance + 10 WHERE id = $1', [toId]); db.exec('COMMIT');`.

### How do I test microservices under load?

Test individual microservices and the full request chain. For individual service testing: target a single service endpoint directly. For end-to-end testing: simulate the full user journey across multiple services. In k6, chain requests: `export default function () {\n  // Step 1: Login\n  const loginRes = http.post('https://api.example.com/auth/login', { email, password });\n  const token = loginRes.json('token');\n  // Step 2: Get profile\n  const profileRes = http.get('https://api.example.com/profile', {\n    headers: { Authorization: `Bearer ${token}` }\n  });\n  // Step 3: Update profile\n  http.put('https://api.example.com/profile', { name: 'Updated' }, {\n    headers: { Authorization: `Bearer ${token}` }\n  });\n}`. Test circuit breaker behavior: send high load to one service and verify the circuit breaker trips: `check(res, {\n  'circuit breaker open': (r) => r.status === 503 && r.headers['X-Circuit-Breaker'] === 'open'\n});`. Test service mesh behavior: verify Istio/Linkerd retry policies under load. Use k6 scenarios to test multiple services simultaneously: `scenarios: {\n  auth: { executor: 'ramping-vus', stages: [{ target: 100, duration: '5m' }], exec: 'authTest' },\n  catalog: { executor: 'ramping-vus', stages: [{ target: 200, duration: '5m' }], exec: 'catalogTest' }\n}`. Monitor distributed tracing during the test to identify cross-service latency.

### How do I create realistic user journey scenarios in k6?

Model realistic user behavior with multiple scenarios and weighted distributions. Define scenarios: `export const options = {\n  scenarios: {\n    browsing: {\n      executor: 'ramping-vus',\n      stages: [{ duration: '5m', target: 80 }],\n      exec: 'browse'\n    },\n    shopping: {\n      executor: 'ramping-vus',\n      stages: [{ duration: '5m', target: 15 }],\n      exec: 'shop'\n    },\n    checkout: {\n      executor: 'ramping-vus',\n      stages: [{ duration: '5m', target: 5 }],\n      exec: 'checkout'\n    }\n  }\n};\nfunction browse() {\n  http.get('https://api.example.com/products');\n  sleep(randomIntBetween(5, 30));\n}\nfunction shop() {\n  http.get('https://api.example.com/products');\n  http.post('https://api.example.com/cart', { productId: 1 });\n  sleep(randomIntBetween(10, 60));\n}\nfunction checkout() {\n  http.post('https://api.example.com/cart/checkout', { paymentMethod: 'card' });\n  sleep(randomIntBetween(30, 120));\n}`. Use think times between requests: real users do not send requests continuously. Add random think time: `sleep(randomIntBetween(1, 10))`. Model different user types: new users (slower, more page views), returning users (faster, direct navigation), power users (API-heavy). Use k6's `exec` function to assign different behaviors per scenario. Add random failures and retries to simulate real browser behavior.

### How do I interpret load test results and identify bottlenecks?

Analyze k6 output systematically. Check thresholds first: if any threshold fails, the test fails. Review the summary: `http_req_duration: avg=234ms p(95)=567ms` — if p95 exceeds your SLO, investigate. Look for error patterns: `http_req_failed: 5.2%` with 4xx errors suggests rate limiting, 5xx suggests server overload. Correlate with server metrics: high CPU during the test suggests compute-bound bottlenecks, high memory suggests leaks, high disk I/O suggests database issues. Use k6's `--out json=results.json` for detailed analysis: `jq '.data | select(.metric == "http_req_duration") | .value' results.json | sort -n | tail -10` shows the 10 slowest requests. Identify bottleneck layers: if database queries take 800ms but the API responds in 900ms, the database is the bottleneck. If the API responds in 2000ms but database queries take 100ms, the application layer is the bottleneck. Check connection pool stats: if active connections equal max connections, the pool is exhausted. Check thread pool stats: if all threads are busy, the server cannot handle more concurrent requests. Use flame graphs to identify CPU hotspots: `async-profiler --flamegraph flame.html <pid>` for JVM applications.

### How do I test autoscaling under load?

Verify autoscaling behavior by gradually increasing load and observing scale-up. In k6: `export const options = {\n  stages: [\n    { duration: '2m', target: 50 },   // baseline\n    { duration: '5m', target: 200 },   // trigger scale-up\n    { duration: '10m', target: 200 },  // wait for new pods\n    { duration: '5m', target: 500 },   // higher load\n    { duration: '10m', target: 500 },  // verify stability\n    { duration: '5m', target: 0 }      // scale-down\n  ]\n};`. Monitor Kubernetes HPA: `kubectl get hpa -w` during the test. Verify new pods become ready: `kubectl get pods -w | grep Running`. Check that load distributes across pods: `kubectl logs -l app=api --tail=100 | grep request_count`. Verify the autoscaler responds within expected time: if HPA scale-up takes 3 minutes but your test only sustains peak load for 2 minutes, the system never scales. Test scale-down behavior: after load drops, verify pods are removed within the cooldown period. Test cluster autoscaler: if pods are pending due to insufficient nodes, verify new nodes join the cluster. Monitor for thrashing: if the autoscaler rapidly scales up and down, adjust the stabilization window: `behavior: { scaleDown: { stabilizationWindowSeconds: 300 } }`.

### How do I handle test data cleanup after load tests?

Clean up test data to avoid polluting the database. Use k6's teardown function: `export function teardown(data) {\n  // Clean up test users\n  http.del('https://api.example.com/test-users', {\n    headers: { Authorization: `Bearer ${data.adminToken}` }\n  });\n}`. Use unique prefixes for test data: `const testPrefix = `loadtest-${Date.now()}-`;\nhttp.post('https://api.example.com/users', {\n  email: `${testPrefix}user@test.com`,\n  name: 'Load Test User'\n});`. Clean up by prefix: `DELETE FROM users WHERE email LIKE 'loadtest-%';`. Use database transactions that roll back: `BEGIN; INSERT INTO users (...); -- test queries here; ROLLBACK;`. For JMeter, use JSR223 Post Processor: `import groovy.sql.Sql;\ndef sql = Sql.newInstance('jdbc:postgresql://localhost/testdb', 'user', 'pass');\nsql.execute('DELETE FROM test_data WHERE created_at > ?', [testStartTime]);\nsql.close();`. Schedule cleanup jobs: `pg_cron` job that deletes test data older than 1 hour. Use separate test database: `K6_TEST_DATABASE_URL=postgres://test:test@localhost/testdb_loadtest`. Never run load tests against production data without a cleanup plan.

### How do I test gRPC APIs under load?

k6 supports gRPC testing with the `k6/net/grpc` module. Define a gRPC client: `import grpc from 'k6/net/grpc';\nconst client = new grpc.Client();\nclient.load(['./proto'], 'user_service.proto');\nexport const options = { vus: 100, duration: '5m' };\nexport default function () {\n  client.connect('grpc.example.com:443', { plaintext: false });\n  const response = client.invoke('user.UserService/GetUser', { user_id: '123' });\n  check(response, {\n    'status is OK': (r) => r.status === grpc.StatusOK,\n    'has user data': (r) => r.message.user_id === '123'\n  });\n  client.close();\n}`. Test streaming RPCs: `const stream = client.invoke('user.UserService/StreamUsers', {});\nstream.on('data', (msg) => {\n  check(msg, { 'has user': (m) => m.user_id !== undefined });\n});\nstream.on('end', () => { client.close(); });`. Measure gRPC-specific metrics: `grpc_req_duration`, `grpc_streams_msgs_received`. Test with different message sizes: small messages (100 bytes) test throughput, large messages (1MB) test serialization. Test metadata propagation: `client.invoke('user.UserService/GetUser', { user_id: '123' }, { metadata: { 'x-request-id': 'test-123' } });`. Test deadline propagation: `client.invoke('user.UserService/GetUser', { user_id: '123' }, { timeout: '5s' });`. Monitor gRPC server stats: `grpc_server_handled_total`, `grpc_server_msg_received_total`.

### How do I compare load test results across runs?

Track performance regressions by comparing results across test runs. Store results in a time series database: `k6 run --out influxdb=http://influxdb:8086/k6 test.js`. Use Grafana to visualize trends: create dashboards showing p95 latency, error rate, and throughput over time. Define regression thresholds: alert when p95 increases by more than 20% compared to the previous run. Use k6's `--summary-export` for structured output: `k6 run --summary-export=summary.json test.js`. Compare summaries: `jq '.metrics.http_req_duration.values.p95' summary.json` across runs. Use statistical significance: run the same test 3 times and compare medians to account for variance. Use the k6 cloud API for historical comparison: `curl -H 'Authorization: Token $K6_TOKEN' https://api.k6.io/v3/test-runs`. For JMeter, use the Performance Plugin in Jenkins to track trends. For automated regression detection, use a baseline file: `k6 run --out json=baseline.json test.js` and compare future runs against it.

### How do I test CDN caching behavior under load?

Verify CDN cache hit ratios and TTL behavior under load. Send requests with cache-busting parameters: `export default function () {\\n  const cacheBuster = __ITER;\\n  http.get(`https://cdn.example.com/assets/app.js?v=${cacheBuster}`);\\n}`. Test cache warm-up: `export const options = {\\n  stages: [\\n    { duration: '2m', target: 10 },   // warm cache\\n    { duration: '5m', target: 100 },   // test cached responses\\n    { duration: '2m', target: 0 }\\n  ]\\n};`. Verify cache headers: `check(res, {\\n  'has cache-control': (r) => r.headers['Cache-Control'] !== undefined,\\n  'has ETag': (r) => r.headers['ETag'] !== undefined,\\n  'cache hit from CDN': (r) => r.headers['X-Cache'] === 'HIT' || r.headers['CF-Cache-Status'] === 'HIT'\\n});`. Test conditional requests with If-None-Match: `const etag = previousRes.headers['ETag'];\\nconst res = http.get('https://cdn.example.com/assets/app.js', {\\n  headers: { 'If-None-Match': etag }\\n});\\ncheck(res, { '304 Not Modified': (r) => r.status === 304 });`. Measure cache hit rate: `const cacheHits = new Counter('cache_hits');\\nexport default function () {\\n  const res = http.get('https://cdn.example.com/image.png');\\n  if (res.headers['X-Cache'] === 'HIT') cacheHits.add(1);\\n}`. Test cache eviction: send requests for many unique URLs to fill the cache, then verify older entries are evicted. Test stale-while-revalidate: `check(res, {\\n  'stale content served': (r) => r.headers['Age'] > 3600 && r.status === 200\\n});`.

### How do I test API pagination performance under load?

Pagination can cause performance degradation at deep offsets. Test cursor-based pagination: `export default function () {\\n  let cursor = null;\\n  for (let i = 0; i < 100; i++) {\\n    const url = cursor\\n      ? `https://api.example.com/users?cursor=${cursor}`\\n      : 'https://api.example.com/users';\\n    const res = http.get(url);\\n    check(res, { 'status is 200': (r) => r.status === 200 });\\n    cursor = res.json('next_cursor');\\n    if (!cursor) break;\\n  }\\n}`. Test offset-based pagination performance degradation: `export default function () {\\n  const offsets = [0, 1000, 10000, 50000, 100000];\\n  for (const offset of offsets) {\\n    const res = http.get(`https://api.example.com/users?offset=${offset}&limit=100`);\\n    console.log(`offset=${offset} duration=${res.timings.duration}ms`);\\n  }\\n}`. Compare cursor vs offset performance: cursor pagination should maintain constant latency regardless of depth, while offset pagination degrades. Set thresholds for deep pagination: `thresholds: {\\n  http_req_duration: [{ threshold: 'p(95)<500', method: 'cursor' }, { threshold: 'p(95)<2000', method: 'offset' }]\\n}`. Test page size impact: `const pageSizes = [10, 50, 100, 500, 1000];\\nfor (const size of pageSizes) {\\n  const res = http.get(`https://api.example.com/users?limit=${size}`);\\n  console.log(`limit=${size} duration=${res.timings.duration}ms`);\\n}`. Monitor database query execution time for pagination queries with `EXPLAIN ANALYZE`.

### How do I test API concurrency and race conditions?

Load testing can reveal race conditions that unit tests miss. Test concurrent writes to the same resource: `export default function () {\\n  const userId = 1; // all VUs target the same user\\n  http.patch(`https://api.example.com/users/${userId}`, {\\n    balance: Math.random() * 100\\n  });\\n}`. Verify optimistic locking: `const res = http.get('https://api.example.com/users/1');\\nconst version = res.json('version');\\nconst updateRes = http.patch('https://api.example.com/users/1', {\\n  name: 'Updated',\\n  version: version\\n});\\ncheck(updateRes, {\\n  'success or conflict': (r) => r.status === 200 || r.status === 409\\n});`. Test idempotency keys: `const idempotencyKey = `key-${__VU}-${__ITER}`;\\nhttp.post('https://api.example.com/charges', { amount: 100 }, {\\n  headers: { 'Idempotency-Key': idempotencyKey }\\n});`. Send the same key twice: `http.post('https://api.example.com/charges', { amount: 100 }, {\\n  headers: { 'Idempotency-Key': idempotencyKey }\\n});` and verify the second response returns the same result. Test database transaction isolation: `// Concurrent transfers between accounts\\nhttp.post('https://api.example.com/transfer', { from: 1, to: 2, amount: 10 });` with 100 VUs targeting the same accounts. Verify total balance is conserved after the test.

### How do I test API error handling under load?

Verify the API handles errors gracefully under stress. Test timeout behavior: `export const options = {\\n  vus: 500,\\n  duration: '5m',\\n  thresholds: {\\n    http_req_failed: ['rate<0.05']\\n  }\\n};`. Verify error responses are structured: `check(res, {\\n  'error has code': (r) => r.status >= 400 && r.json('error.code') !== undefined,\\n  'error has message': (r) => r.status >= 400 && r.json('error.message') !== undefined\\n});`. Test circuit breaker fallback responses: `check(res, {\\n  'fallback response': (r) => r.status === 200 || (r.status === 503 && r.json('error.fallback') === true)\\n});`. Test retry behavior: `// First request may fail, retry should succeed\\nlet res = http.get('https://api.example.com/unstable');\\nif (res.status >= 500) {\\n  sleep(1);\\n  res = http.get('https://api.example.com/unstable');\\n  check(res, { 'retry succeeded': (r) => r.status === 200 });\\n}`. Verify rate limit error responses include useful headers: `check(res, {\\n  '429 has Retry-After': (r) => r.status !== 429 || r.headers['Retry-After'] !== undefined,\\n  '429 has rate limit info': (r) => r.status !== 429 || r.headers['X-RateLimit-Reset'] !== undefined\\n});`. Test error response time: errors should return quickly, not hang: `check(res, {\\n  'errors respond fast': (r) => r.status < 500 || r.timings.duration < 100\\n});`.

### How do I test API file upload performance under load?

File uploads stress different system components than JSON APIs. Test multipart uploads: `export default function () {\\n  const file = {\\n    type: 'image/jpeg',\\n    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='\\n  };\\n  const res = http.post('https://api.example.com/upload', {\\n    file: http.file(file.data, 'test.jpg', file.type)\\n  });\\n  check(res, { 'upload succeeded': (r) => r.status === 201 });\\n}`. Test large file uploads: generate a 10MB payload: `const largeFile = new Array(10 * 1024 * 1024).fill('a').join('');\\nhttp.post('https://api.example.com/upload', {\\n  file: http.file(largeFile, 'large.bin', 'application/octet-stream')\\n});`. Test concurrent uploads: `export const options = { vus: 50, duration: '5m' };` to verify the upload service handles parallel uploads without corruption. Test upload timeout: `export const options = {\\n  vus: 10,\\n  duration: '2m',\\n  httpDebug: 'full'\\n};` and monitor for timeout errors. Test chunked uploads: `const chunkSize = 5 * 1024 * 1024; // 5MB chunks\\nfor (let i = 0; i < totalChunks; i++) {\\n  http.put(`https://api.example.com/upload/${uploadId}?chunk=${i}`, chunkData);\\n}`. Verify upload integrity: compare checksum of uploaded file with original. Monitor disk I/O during uploads: `iostat -x 1` on the server. Test upload to CDN-backed storage: verify direct-to-S3 uploads work under load.

### How do I test API memory leaks with soak testing?

Soak tests run for extended periods to detect memory leaks and resource exhaustion. Run a 4-hour test: `export const options = {\\n  vus: 100,\\n  duration: '4h',\\n  thresholds: {\\n    http_req_duration: ['p(95)<500'],\\n    http_req_failed: ['rate<0.01']\\n  }\\n};`. Monitor server memory during the test: `while true; do free -m >> memory.log; sleep 60; done`. Plot memory usage over time: if memory increases linearly, there is a leak. In Kubernetes, monitor pod memory: `kubectl top pods -l app=api --containers | sort -k3 -h`. Detect connection leaks: `SELECT count(*) FROM pg_stat_activity GROUP BY state` should not increase over time. Detect file descriptor leaks: `ls /proc/<pid>/fd | wc -l` should stabilize. Detect thread leaks: `ps -eLf | grep <process> | wc -l` should not grow unbounded. Use k6 custom metrics to track server-side metrics: `import { Counter, Gauge } from 'k6/metrics';\\nconst serverMemory = new Gauge('server_memory_mb');\\nexport default function () {\\n  const res = http.get('https://api.example.com/metrics');\\n  serverMemory.add(res.json('memory.used_mb'));\\n}`. Set memory thresholds: `thresholds: {\\n  server_memory_mb: ['value<1024']\\n}`. After the test, verify memory returns to baseline: if memory stays elevated, there is a leak that was not garbage collected.

### How do I test API response compression under load?

Verify gzip and brotli compression behavior under load. Test with Accept-Encoding header: `export default function () {\\n  const res = http.get('https://api.example.com/users', {\\n    headers: { 'Accept-Encoding': 'gzip, br' }\\n  });\\n  check(res, {\\n    'content is compressed': (r) => r.headers['Content-Encoding'] === 'gzip' || r.headers['Content-Encoding'] === 'br',\\n    'response is smaller': (r) => r.headers['Content-Length'] < 10000\\n  });\\n}`. Compare compressed vs uncompressed: `const uncompressed = http.get('https://api.example.com/users', {\\n  headers: { 'Accept-Encoding': 'identity' }\\n});\\nconst compressed = http.get('https://api.example.com/users', {\\n  headers: { 'Accept-Encoding': 'gzip' }\\n});\\nconsole.log(`Uncompressed: ${uncompressed.headers['Content-Length']} bytes`);\\nconsole.log(`Compressed: ${compressed.headers['Content-Length']} bytes`);`. Measure compression overhead: `check(compressed, {\\n  'compression faster than uncompressed': (r) => r.timings.duration < uncompressed.timings.duration\\n});`. Test compression with different payload sizes: small payloads may be slower with compression due to overhead. Test brotli vs gzip: brotli typically achieves 15-20% better compression but uses more CPU. Monitor server CPU during compression tests: if CPU exceeds 80%, consider disabling compression for already-compressed formats (images, videos). Test conditional compression: `Accept-Encoding: gzip, deflate, br` should negotiate the best available encoding.

### How do I test API connection pooling under load?

Verify connection pool behavior under concurrent load. Monitor pool metrics: `SELECT count(*) as total, state FROM pg_stat_activity GROUP BY state;` during the test. Test pool exhaustion: `export const options = {\\n  vus: 500,\\n  duration: '5m',\\n  thresholds: {\\n    http_req_failed: ['rate<0.01']\\n  }\\n};` and verify no connection timeout errors. Test pool configuration: adjust `max_connections` and `pool_size` to find optimal values. In k6, control HTTP connections: `import http from 'k6/http';\\nexport const options = {\\n  vus: 100,\\n  duration: '5m',\\n  noConnectionReuse: false,\\n};` to test connection reuse. Test with `noConnectionReuse: true` to compare: `export const options = {\\n  vus: 100,\\n  duration: '5m',\\n  noConnectionReuse: true,\\n};` — this forces a new connection per request, simulating clients without keep-alive. Monitor for connection leaks: `netstat -an | grep ESTABLISHED | wc -l` should stabilize, not grow. Test connection timeout: `export const options = {\\n  vus: 1000,\\n  duration: '3m',\\n};` with server `max_connections = 100` to verify the API queues requests instead of crashing. Test pool warm-up: `export function setup() {\\n  // Pre-warm connections\\n  for (let i = 0; i < 10; i++) {\\n    http.get('https://api.example.com/health');\\n  }\\n}`. Verify idle connections are closed: `idle_timeout = 300s` should close unused connections.

### How do I test API caching layers under load?

Test multi-layer caching (CDN, application, database) under load. Test cache invalidation: `// Write to API\\nhttp.post('https://api.example.com/users', { name: 'Test' });\\n// Read immediately - should reflect the write\\nconst res = http.get('https://api.example.com/users');\\ncheck(res, { 'reflects write': (r) => r.json('data.0.name') === 'Test' });`. Test cache stampede: remove cache and send high concurrent reads: `export const options = {\\n  scenarios: {\\n    stampede: {\\n      executor: 'constant-arrival-rate',\\n      rate: 1000,\\n      timeUnit: '1s',\\n      duration: '30s',\\n      preAllocatedVUs: 2000\\n    }\\n  }\\n};`. Verify cache warming: `export function setup() {\\n  http.get('https://api.example.com/users?warm=true');\\n}`. Test TTL expiration: `// First request populates cache\\nhttp.get('https://api.example.com/users');\\n// Wait for TTL to expire\\nsleep(60);\\n// Second request should repopulate\\nhttp.get('https://api.example.com/users');`. Monitor cache hit rate: `const cacheHits = new Counter('cache_hits');\\nconst cacheMisses = new Counter('cache_misses');\\nexport default function () {\\n  const res = http.get('https://api.example.com/users');\\n  if (res.headers['X-Cache'] === 'HIT') cacheHits.add(1);\\n  else cacheMisses.add(1);\\n}`. Test cache with query parameters: `http.get('https://api.example.com/users?page=1&sort=name')` and `http.get('https://api.example.com/users?page=1&sort=email')` should cache separately. Test Redis cache performance: monitor `INFO stats` for `keyspace_hits` and `keyspace_misses` during the test.

### How do I test API idempotency under load?

Verify idempotency guarantees under concurrent duplicate requests. Test duplicate POST requests: `const idempotencyKey = 'key-123';\\n// Send the same request twice concurrently\\nhttp.asyncPost('https://api.example.com/charges', {\\n  body: JSON.stringify({ amount: 100 }),\\n  headers: { 'Idempotency-Key': idempotencyKey }\\n});\\nhttp.asyncPost('https://api.example.com/charges', {\\n  body: JSON.stringify({ amount: 100 }),\\n  headers: { 'Idempotency-Key': idempotencyKey }\\n});` and verify only one charge is created. Test with 100 concurrent duplicates: `export const options = {\\n  vus: 100,\\n  duration: '10s',\\n};\\nexport default function () {\\n  http.post('https://api.example.com/charges', { amount: 100 }, {\\n    headers: { 'Idempotency-Key': 'same-key' }\\n  });\\n}` and verify the database has exactly one record. Test idempotency key expiration: after the key expires, a new request with the same key should create a new resource. Test idempotency with different payloads: same key with different payload should return 422 or the original response. Monitor for race conditions in idempotency storage: use database unique constraints: `CREATE UNIQUE INDEX idx_idempotency_keys ON idempotency_records(key);`. Test idempotency key TTL: `EXPIRE idempotency:key-123 86400` should expire after 24 hours. Verify idempotency works across retries: if the first request times out, the retry with the same key should not duplicate the operation.

### How do I test API webhook delivery under load?

Webhooks require testing both delivery reliability and retry logic. Simulate webhook delivery: `export default function () {\\n  const payload = JSON.stringify({ event: 'order.created', data: { id: 1 } });\\n  const res = http.post('https://client.example.com/webhook', payload, {\\n    headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=abc123' }\\n  });\\n  check(res, {\\n    'webhook accepted': (r) => r.status === 200,\\n    'responded quickly': (r) => r.timings.duration < 5000\\n  });\\n}`. Test webhook retry logic: `// Simulate endpoint that fails first, succeeds on retry\\nlet res = http.post('https://client.example.com/webhook', payload);\\nif (res.status >= 500) {\\n  sleep(5); // exponential backoff\\n  res = http.post('https://client.example.com/webhook', payload);\\n  check(res, { 'retry succeeded': (r) => r.status === 200 });\\n}`. Test webhook signing: verify HMAC signature validation: `const crypto = require('k6/crypto');\\nconst signature = crypto.hmac('sha256', secret, payload, 'hex');\\nhttp.post('https://client.example.com/webhook', payload, {\\n  headers: { 'X-Webhook-Signature': `sha256=${signature}` }\\n});`. Test webhook ordering: send events out of order and verify the client handles them correctly. Monitor webhook queue depth: if the queue grows unbounded, the consumer cannot keep up. Test webhook timeout: `export const options = {\\n  vus: 50,\\n  duration: '5m',\\n  thresholds: {\\n    http_req_failed: ['rate<0.05'],\\n    http_req_duration: ['p(95)<10000']\\n  }\\n};` to verify the system handles slow webhook endpoints. Test dead letter queue: after max retries, verify failed webhooks are stored for manual replay.

### How do I test API GraphQL query complexity under load?

GraphQL queries can vary in complexity and resource usage. Test simple vs complex queries: `const simpleQuery = '{ user(id: 1) { name } }';\\nconst complexQuery = '{ user(id: 1) { name posts { title comments { text author { name } } } } }';\\nhttp.post('https://api.example.com/graphql', JSON.stringify({ query: simpleQuery }));\\nhttp.post('https://api.example.com/graphql', JSON.stringify({ query: complexQuery }));`. Measure query depth impact: `const depths = [1, 3, 5, 7, 10];\\nfor (const depth of depths) {\\n  const query = buildNestedQuery(depth);\\n  const res = http.post('https://api.example.com/graphql', JSON.stringify({ query }));\\n  console.log(`depth=${depth} duration=${res.timings.duration}ms`);\\n}`. Test query complexity analysis: verify the server rejects overly complex queries: `check(res, {\\n  'complexity rejected': (r) => r.status === 400 && r.json('errors[0].message').includes('complexity')\\n});`. Test batch queries: `const batch = [\\n  { query: '{ user(id: 1) { name } }' },\\n  { query: '{ user(id: 2) { name } }' },\\n  { query: '{ user(id: 3) { name } }' }\\n];\\nhttp.post('https://api.example.com/graphql', JSON.stringify(batch));`. Test N+1 query detection: monitor database query count per GraphQL request. If a query for 10 users generates 10+1 database queries, there is an N+1 problem. Use DataLoader pattern to batch database calls. Test persisted queries: `http.post('https://api.example.com/graphql', JSON.stringify({ extensions: { persistedQuery: { sha256Hash: 'abc123' } } }));`.

### How do I test API rate limit headers and behavior under load?

Verify rate limit headers are present and accurate. Check standard headers: `check(res, {\\n  'has X-RateLimit-Limit': (r) => r.headers['X-RateLimit-Limit'] !== undefined,\\n  'has X-RateLimit-Remaining': (r) => r.headers['X-RateLimit-Remaining'] !== undefined,\\n  'has X-RateLimit-Reset': (r) => r.headers['X-RateLimit-Reset'] !== undefined\\n});`. Verify remaining count decrements: `const res1 = http.get('https://api.example.com/data');\\nconst remaining1 = parseInt(res1.headers['X-RateLimit-Remaining']);\\nconst res2 = http.get('https://api.example.com/data');\\nconst remaining2 = parseInt(res2.headers['X-RateLimit-Remaining']);\\ncheck(remaining2, { 'decremented': (r) => r === remaining1 - 1 });`. Test rate limit reset: `const resetTime = parseInt(res.headers['X-RateLimit-Reset']);\\nconst now = Math.floor(Date.now() / 1000);\\ncheck(resetTime, { 'reset is in future': (r) => r > now });`. Test different rate limit tiers: `// Free tier: 100 req/hour\\n// Pro tier: 1000 req/hour\\nconst freeToken = __ENV.FREE_TOKEN;\\nconst proToken = __ENV.PRO_TOKEN;\\n// Test free tier limit\\nfor (let i = 0; i < 101; i++) {\\n  const res = http.get('https://api.example.com/data', {\\n    headers: { Authorization: `Bearer ${freeToken}` }\\n  });\\n  if (i === 100) check(res, { 'free tier limited': (r) => r.status === 429 });\\n}`. Test rate limit by IP: `// k6 does not support multiple source IPs natively\\n// Use k6 cloud or distributed runners for IP-based rate limit testing`. Test rate limit bypass: verify authenticated users get higher limits than anonymous users.

### How do I test API bulk operations under load?

Bulk endpoints process multiple items in a single request, stressing different code paths than single-item operations. Test bulk create: `const items = [];\\nfor (let i = 0; i < 1000; i++) {\\n  items.push({ name: `item-${i}`, value: i });\\n}\\nconst res = http.post('https://api.example.com/items/bulk', JSON.stringify(items), {\\n  headers: { 'Content-Type': 'application/json' }\\n});\\ncheck(res, {\\n  'bulk created': (r) => r.status === 201,\\n  'all items created': (r) => r.json('created') === 1000\\n});`. Test bulk update: `const updates = items.map(i => ({ id: i.id, name: `updated-${i.name}` }));\\nhttp.patch('https://api.example.com/items/bulk', JSON.stringify(updates));`. Test bulk delete: `http.del('https://api.example.com/items/bulk', JSON.stringify({ ids: [1, 2, 3, 4, 5] }));`. Measure bulk vs single operation performance: `// Single: 100 individual requests\\nfor (let i = 0; i < 100; i++) {\\n  http.post('https://api.example.com/items', { name: `item-${i}` });\\n}\\n// Bulk: 1 request with 100 items\\nhttp.post('https://api.example.com/items/bulk', JSON.stringify(items));` — bulk should be 5-10x faster. Test bulk size limits: `const sizes = [10, 100, 1000, 10000];\\nfor (const size of sizes) {\\n  const res = http.post('https://api.example.com/items/bulk', JSON.stringify(generateItems(size)));\\n  console.log(`size=${size} status=${res.status} duration=${res.timings.duration}ms`);\\n}`. Test partial bulk failure: `const items = [\\n  { name: 'valid' },\\n  { name: '', }, // invalid\\n  { name: 'valid2' }\\n];\\nconst res = http.post('https://api.example.com/items/bulk', JSON.stringify(items));\\ncheck(res, {\\n  'partial success': (r) => r.status === 207,\\n  'has errors': (r) => r.json('errors').length > 0\\n});`. Monitor database transaction behavior: bulk operations should use a single transaction or batched transactions.

### How do I test API long polling and SSE under load?

Server-Sent Events (SSE) and long polling maintain persistent connections, consuming server resources differently than request-response APIs. Test SSE connections: `import http from 'k6/http';\\nexport default function () {\\n  const res = http.get('https://api.example.com/events', {\\n    headers: { 'Accept': 'text/event-stream' }\\n  });\\n  check(res, {\\n    'SSE connected': (r) => r.status === 200,\\n    'has event-stream content type': (r) => r.headers['Content-Type'] === 'text/event-stream'\\n  });\\n}`. Test connection duration: SSE connections stay open, consuming a connection from the pool. Test with 1000 concurrent SSE connections: `export const options = {\\n  vus: 1000,\\n  duration: '5m',\\n  thresholds: {\\n    http_req_failed: ['rate<0.01']\\n  }\\n};`. Monitor server file descriptors: `ls /proc/<pid>/fd | wc -l` should not exceed `ulimit -n`. Test long polling timeout: `export default function () {\\n  const res = http.get('https://api.example.com/poll?timeout=30');\\n  check(res, {\\n    'poll completed': (r) => r.status === 200,\\n    'response within timeout': (r) => r.timings.duration < 35000\\n  });\\n}`. Test SSE reconnection: `// k6 does not natively support SSE reconnection\\n// Use browser-based testing with Playwright for SSE reconnection tests`. Test event delivery latency: measure time between event generation and client receipt. Test backpressure: send events faster than the client can consume them and verify the server handles backpressure gracefully. Monitor memory per connection: SSE connections buffer events, so memory grows with connection count.

### How do I test API observability under load?

Verify that logging, metrics, and tracing remain functional under load. Test log volume: high traffic should not cause log buffering or loss. Monitor log aggregation: `Filebeat` or `Fluentd` should keep up with log volume during the test. Test metrics collection: verify Prometheus scrapes complete within the scrape interval: `scrape_duration_seconds < 15s`. Test distributed tracing: verify trace sampling does not drop all traces under load. In k6, inject trace headers: `http.get('https://api.example.com/users', {\\n  headers: { 'traceparent': '00-abcdef1234567890-1234567890abcdef-01' }\\n});`. Verify trace propagation: check that the trace ID appears in downstream service logs. Test alerting thresholds: verify that alerts fire correctly during load spikes. Test dashboard refresh: Grafana dashboards should update in real-time during the test. Monitor metrics cardinality: high-cardinality labels (like user IDs) can cause Prometheus memory issues under load. Test log structured output: `check(res, {\\n  'response has trace ID': (r) => r.headers['X-Trace-Id'] !== undefined\\n});`. Verify audit logs: critical operations should be logged even under high load. Test log rotation: verify log files rotate before filling disk space. Monitor APM agent overhead: if the APM agent adds more than 5% overhead, consider reducing instrumentation. Test health check endpoint: `http.get('https://api.example.com/health')` should return 200 throughout the test.

### How do I test API backward compatibility under load?

Verify that new API versions do not break existing clients under load. Test version coexistence: `// v1 and v2 running simultaneously\\nhttp.get('https://api.example.com/v1/users');\\nhttp.get('https://api.example.com/v2/users');` with both endpoints handling the same load. Test deprecation headers: `check(res, {\\n  'has deprecation header': (r) => r.headers['Deprecation'] !== undefined || r.headers['Sunset'] !== undefined\\n});`. Test backward-compatible schema changes: add optional fields and verify old clients still work. Test field removal: `// v1 returns field 'name', v2 returns 'fullName'\\nconst v1Res = http.get('https://api.example.com/v1/users/1');\\nconst v2Res = http.get('https://api.example.com/v2/users/1');\\ncheck(v1Res, { 'has name': (r) => r.json('name') !== undefined });\\ncheck(v2Res, { 'has fullName': (r) => r.json('fullName') !== undefined });`. Test response format changes: verify XML-to-JSON migration works under load. Test authentication changes: if v2 uses a different auth scheme, verify both schemes work simultaneously. Monitor error rates per version: if v1 error rate spikes after v2 deployment, there may be a shared resource conflict. Test API gateway routing: verify the gateway routes requests correctly under load to both versions.

### How do I test API content negotiation under load?

Content negotiation allows clients to request different response formats. Test multiple Accept headers: `const formats = ['application/json', 'application/xml', 'text/csv', 'application/yaml'];\\nfor (const format of formats) {\\n  const res = http.get('https://api.example.com/users', {\\n    headers: { Accept: format }\\n  });\\n  check(res, {\\n    'correct content type': (r) => r.headers['Content-Type'].includes(format.split('/')[1])\\n  });\\n}`. Test unsupported formats: `const res = http.get('https://api.example.com/users', {\\n  headers: { Accept: 'application/xml' }\\n});\\ncheck(res, { 'returns 406': (r) => r.status === 406 });` if XML is not supported. Test format-specific performance: JSON serialization may be faster than XML. Test Accept-Language: `http.get('https://api.example.com/users', {\\n  headers: { 'Accept-Language': 'es-ES, en;q=0.8' }\\n});` and verify localized responses. Test content negotiation caching: `Accept: application/json` and `Accept: application/xml` should cache separately. Monitor serialization overhead: `const jsonRes = http.get('https://api.example.com/users', { headers: { Accept: 'application/json' } });\\nconst xmlRes = http.get('https://api.example.com/users', { headers: { Accept: 'application/xml' } });\\nconsole.log(`JSON: ${jsonRes.timings.duration}ms, XML: ${xmlRes.timings.duration}ms`);`.

### How do I test API CORS configuration under load?

Cross-Origin Resource Sharing (CORS) adds preflight OPTIONS requests that increase latency. Test preflight caching: `// First request triggers preflight\\nhttp.options('https://api.example.com/users', {\\n  headers: {\\n    'Origin': 'https://app.example.com',\\n    'Access-Control-Request-Method': 'GET'\\n  }\\n});\\n// Second request should not trigger preflight if cached\\nhttp.get('https://api.example.com/users', {\\n  headers: { Origin: 'https://app.example.com' }\\n});`. Verify CORS headers: `check(res, {\\n  'has Access-Control-Allow-Origin': (r) => r.headers['Access-Control-Allow-Origin'] !== undefined,\\n  'has Access-Control-Allow-Methods': (r) => r.headers['Access-Control-Allow-Methods'] !== undefined\\n});`. Test wildcard vs specific origins: `Access-Control-Allow-Origin: *` does not support credentials. Monitor preflight overhead: each preflight adds a round trip. Set `Access-Control-Max-Age: 86400` to cache preflight for 24 hours.

## See Also

- [Integration Testing](/recipes/testing/integration-testing) — testing service interactions
- [Rate Limiting](/recipes/api/rate-limiting) — protecting APIs under heavy traffic
- [Connection Pooling](/recipes/databases/database-connection-pooling) — handling concurrent database connections
- [Caching Strategies](/recipes/performance/caching-strategies) — reducing backend load
- [API Documentation OpenAPI](/recipes/api/api-documentation-openapi) — documenting API contracts

---

*Last updated: 2026-07-09*
