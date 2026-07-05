---
contentType: docs
slug: load-test-plan-template
templateType: guideline
title: "Plantilla de Load Test Plan"
description: "Plantilla para planear y documentar load tests: test scenarios, user journey definitions, ramp-up strategies, success criteria, monitoring setup, tool selection (k6, JMeter, Locust), result analysis y reporting con ejemplos de codigo para cada tool."
metaDescription: "Load test plan template: scenarios, user journeys, ramp-up, success criteria, monitoring, k6 JMeter Locust examples, result analysis, reporting."
difficulty: intermediate
topics:
  - performance
  - testing
tags:
  - load-testing
  - k6
  - jmeter
  - locust
  - performance-testing
  - stress-testing
  - capacity-planning
relatedResources:
  - /docs/performance/performance-budget-template
  - /docs/performance/core-web-vitals-audit-checklist
  - /docs/performance/database-query-tuning-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Load test plan template: scenarios, user journeys, ramp-up, success criteria, monitoring, k6 JMeter Locust examples, result analysis, reporting."
  keywords:
    - load test plan
    - performance testing
    - k6
    - jmeter
    - locust
    - stress testing
    - capacity planning
---

## Overview

Esta plantilla define un structured load test plan. Cubre test scenarios, user journey definitions, ramp-up strategies, success criteria, monitoring setup, tool selection (k6, JMeter, Locust), result analysis y reporting. Usa esta plantilla antes de correr load tests en un new service o antes de un major release.

---

## 1. Test Objectives

### 1.1 Goal Definition

```text
Objective                    | Question Answered
─────────────────────────────┼──────────────────────────────────────
Baseline performance         | Cual es current throughput y latency?
Capacity validation          | Podemos handleer expected peak traffic?
Bottleneck identification    | Donde breakea el system first?
Scalability validation       | Funciona horizontal scaling como expected?
Regression detection         | Degrado el latest deploy el performance?
Endurance / soak             | Leakea memory over 24h de load?
Spike readiness              | Podemos sobrevivir un 10x traffic spike?
```

### 1.2 Scope Definition

```text
In scope                          | Out of scope
──────────────────────────────────┼──────────────────────────────────
API endpoints under test          | Third-party API load testing
Database read/write performance   | Browser rendering performance
Cache hit/miss behavior           | Network latency simulation
Connection pool sizing            | Security / penetration testing
Rate limiting behavior            | UI / E2E testing
```

---

## 2. User Journey Definitions

### 2.1 Journey Mapping

```text
Journey name      | Steps                                    | % of traffic | Requests/user
──────────────────┼──────────────────────────────────────────┼──────────────┼──────────────
Browse homepage   | GET / → GET /api/products                | 40%          | 2
View product      | GET / → GET /products/{id} → GET /api/reviews | 25%     | 3
Search            | GET /search?q={query} → GET /api/results | 20%          | 2
Add to cart       | View product → POST /api/cart → GET /api/cart | 10%     | 4
Checkout          | Add to cart → POST /api/checkout → POST /api/payment | 5% | 6
```

### 2.2 Test Data Requirements

```text
Data type         | Source              | Volume needed    | Notes
──────────────────┼─────────────────────┼──────────────────┼──────────────────
Product IDs       | Production snapshot | 10000            | Usa real IDs
User accounts     | Test data generator | 1000             | Pre-created accounts
Search queries    | Query log sample    | 500              | Realistic distribution
Payment tokens    | Stripe test tokens  | 100              | Usa test environment
Session tokens    | Auth API            | Per-test          | Genera durante setup
```

---

## 3. Load Profiles

### 3.1 Ramp-Up Strategies

```text
Profile type    | Pattern                          | Use case
────────────────┼──────────────────────────────────┼──────────────────────────
Linear ramp     | +10 users/sec until target       | Baseline, capacity test
Step load       | 50 → 100 → 200 → 500 (hold 5m)   | Bottleneck identification
Spike           | 0 → 1000 in 10s, hold 2m         | Spike readiness, autoscaling
Soak            | 200 users for 24h                | Memory leaks, resource exhaustion
Stress          | Increase until system fails      | Find breaking point
```

### 3.2 Load Profile Configuration

```text
Test phase      | Duration | Users | Ramp rate | Purpose
────────────────┼──────────┼───────┼───────────┼──────────────────────
Warmup          | 2 min    | 10    | 5/sec     | JIT compilation, caches
Baseline        | 10 min   | 50    | 5/sec     | Normal load baseline
Ramp-up         | 5 min    | 200   | 30/sec    | Peak traffic simulation
Peak hold       | 15 min   | 200   | -         | Sustained peak performance
Ramp-down       | 2 min    | 0     | -/sec     | Graceful shutdown
Cooldown        | 2 min    | 0     | -         | Observe recovery
```

---

## 4. Success Criteria

### 4.1 Performance Thresholds

```text
Metric                    | Target      | Hard limit   | Failure action
──────────────────────────┼─────────────┼──────────────┼──────────────────
P50 response time         | < 100ms     | < 200ms      | Investiga
P95 response time         | < 300ms     | < 500ms      | Investiga
P99 response time         | < 500ms     | < 1000ms     | Investiga
Error rate                | < 0.1%      | < 1%         | Para el test
Throughput (req/sec)      | > 500       | > 300        | Investiga
CPU usage                 | < 70%       | < 90%        | Scalea up
Memory usage              | < 75%       | < 90%        | Investiga leaks
DB connection pool usage  | < 60%       | < 80%        | Increase pool
```

### 4.2 Pass/Fail Criteria

```text
Result   | Conditions
─────────┼──────────────────────────────────────────────────────────
PASS     | All metrics within target thresholds
PASS     | P95 within hard limit, P99 slightly over (documented)
FAIL     | Any metric exceeds hard limit
FAIL     | Error rate > 1% en any point durante el test
FAIL     | System crashea o becomes unresponsive
INCONCL. | Test infrastructure issues preventieron valid results
```

---

## 5. Tool Selection

### 5.1 Tool Comparison

```text
Tool    | Language   | Protocol support        | Distributed | Scripting | Best for
────────┼────────────┼─────────────────────────┼─────────────┼───────────┼──────────────
k6      | JavaScript | HTTP, gRPC, WebSocket   | Yes (k6 cloud) | JS/ES6  | API testing, CI/CD
JMeter  | Java       | HTTP, JDBC, JMS, SMTP   | Yes (master/slave) | XML/Groovy | Enterprise, protocol variety
Locust  | Python     | HTTP, custom            | Yes (master/worker) | Python  | Custom protocols, flexibility
Artillery | Node.js  | HTTP, WebSocket, Socket.io | Yes (AWS) | YAML/JS | Quick API tests
Gatling  | Scala     | HTTP, WebSocket         | Yes | Scala DSL | High throughput, detailed reports
```

### 5.2 k6 Script Example

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '10m', target: 50 },
    { duration: '5m', target: 200 },
    { duration: '15m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.001'],
  },
};

export default function () {
  group('Browse homepage', function () {
    const homeRes = http.get('https://staging.example.com/');
    check(homeRes, {
      'homepage status 200': (r) => r.status === 200,
      'homepage LCP < 2.5s': (r) => r.timings.waiting < 2500,
    });
    errorRate.add(homeRes.status !== 200);
    responseTime.add(homeRes.timings.duration);
    sleep(1);
  });

  group('View product', function () {
    const productId = Math.floor(Math.random() * 10000) + 1;
    const productRes = http.get(`https://staging.example.com/api/products/${productId}`);
    check(productRes, {
      'product status 200': (r) => r.status === 200,
      'product has name': (r) => r.json('name') !== undefined,
    });
    errorRate.add(productRes.status !== 200);
    responseTime.add(productRes.timings.duration);
    sleep(2);
  });

  group('Search', function () {
    const queries = ['laptop', 'phone', 'headphones', 'keyboard', 'mouse'];
    const query = queries[Math.floor(Math.random() * queries.length)];
    const searchRes = http.get(`https://staging.example.com/api/search?q=${query}`);
    check(searchRes, {
      'search status 200': (r) => r.status === 200,
      'search returns results': (r) => r.json('results').length > 0,
    });
    errorRate.add(searchRes.status !== 200);
    responseTime.add(searchRes.timings.duration);
    sleep(1.5);
  });
}
```

### 5.3 JMeter Test Plan (XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Load Test Plan">
      <stringProp name="TestPlan.comments">Peak load test — 200 users</stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Users">
        <intProp name="ThreadGroup.num_threads">200</intProp>
        <intProp name="ThreadGroup.ramp_time">300</intProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <stringProp name="ThreadGroup.duration">1800</stringProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy testname="Homepage">
          <stringProp name="HTTPSampler.domain">staging.example.com</stringProp>
          <stringProp name="HTTPSampler.path">/</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
        <hashTree>
          <ResponseAssertion testname="Status 200">
            <collectionProp name="Asserion.test_strings">
              <stringProp>200</stringProp>
            </collectionProp>
          </ResponseAssertion>
        </hashTree>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
```

### 5.4 Locust Script (Python)

```python
from locust import HttpUser, task, between, events

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://staging.example.com"

    @task(40)
    def browse_homepage(self):
        with self.client.get("/", catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Homepage failed: {response.status_code}")

    @task(25)
    def view_product(self):
        product_id = random.randint(1, 10000)
        with self.client.get(f"/api/products/{product_id}", catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Product failed: {response.status_code}")
            elif response.elapsed.total_seconds() > 0.5:
                response.failure("Product too slow")

    @task(20)
    def search(self):
        queries = ['laptop', 'phone', 'headphones', 'keyboard', 'mouse']
        query = random.choice(queries)
        with self.client.get(f"/api/search?q={query}", catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Search failed: {response.status_code}")

    @task(10)
    def add_to_cart(self):
        product_id = random.randint(1, 10000)
        with self.client.post("/api/cart",
            json={"product_id": product_id, "quantity": 1},
            catch_response=True
        ) as response:
            if response.status_code != 201:
                response.failure(f"Cart failed: {response.status_code}")

    @task(5)
    def checkout(self):
        with self.client.post("/api/checkout",
            json={"payment_token": "test_token", "address_id": 1},
            catch_response=True
        ) as response:
            if response.status_code not in [200, 201]:
                response.failure(f"Checkout failed: {response.status_code}")
```

---

## 6. Monitoring Setup

### 6.1 Metrics para Collectar

```text
Layer        | Metric                    | Tool
─────────────┼───────────────────────────┼──────────────────────────
Application  | Response time percentiles | k6/JMeter/Locust built-in
Application  | Error rate                | k6/JMeter/Locust built-in
Application  | Throughput (req/sec)      | k6/JMeter/Locust built-in
Server       | CPU usage                 | Prometheus + node_exporter
Server       | Memory usage              | Prometheus + node_exporter
Server       | Disk I/O                  | Prometheus + node_exporter
Database     | Active connections        | pg_stat_activity / SHOW PROCESSLIST
Database     | Query latency             | pg_stat_statements / slow query log
Database     | Lock waits                | pg_locks / information_schema
Cache        | Hit rate                  | Redis INFO / Memcached stats
Cache        | Evictions                 | Redis INFO / Memcached stats
Network      | Bandwidth                 | iftop / CloudWatch
```

### 6.2 Grafana Dashboard Panels

```text
Panel name              | Query (Prometheus)
────────────────────────┼──────────────────────────────────────────
Request rate            | rate(http_requests_total[1m])
P95 latency             | histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
Error rate              | rate(http_requests_total{status=~"5.."}[1m]) / rate(http_requests_total[1m])
CPU usage               | 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)
Memory usage            | node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes
DB connections          | pg_stat_activity_count
Cache hit rate          | redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)
```

---

## 7. Result Analysis and Reporting

### 7.1 Report Template

```markdown
## Load Test Report — {Service Name}

**Date:** 2026-07-04
**Tester:** {Name}
**Environment:** Staging (replica of production)
**Tool:** k6 0.50.0

### Test Configuration

| Parameter       | Value          |
|-----------------|----------------|
| Max users       | 200            |
| Duration        | 34 min         |
| Ramp-up         | 5 min to 200   |
| Peak hold       | 15 min at 200  |

### Results Summary

| Metric              | Target  | Actual  | Status |
|---------------------|---------|---------|--------|
| P50 response time   | < 100ms | 45ms    | PASS   |
| P95 response time   | < 300ms | 180ms   | PASS   |
| P99 response time   | < 500ms | 420ms   | PASS   |
| Error rate          | < 0.1%  | 0.02%   | PASS   |
| Throughput          | > 500   | 680 rps | PASS   |
| Peak CPU            | < 70%   | 65%     | PASS   |
| Peak memory         | < 75%   | 68%     | PASS   |

### Bottlenecks Identified

1. Database connection pool saturated at 180 users (pool size: 20)
   - Fix: Increase pool size to 40 or add PgBouncer

2. Search API P95 spikes at 200 users (180ms → 350ms)
   - Fix: Add Elasticsearch for search instead of PostgreSQL ILIKE

3. Redis eviction rate increases at peak (0 → 15/sec)
   - Fix: Increase Redis maxmemory or add cache warming

### Recommendations

1. Increase DB connection pool to 40 before next traffic event
2. Migrate search to Elasticsearch (tracked in JIRA-1234)
3. Add autoscaling rule: scale at 70% CPU, not 80%
4. Re-run load test after fixes to verify improvements
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre load testing y stress testing?

Load testing valida que el system handlee expected production traffic within performance targets. Simulas realistic user loads (e.g., 200 concurrent users) y verifyeas que response times, error rates y resource usage se queden within thresholds. Stress testing pushea el system mas alla de expected capacity para find su breaking point — sigues increaseando load hasta que errors spiken o el system crashea. Load testing answer "podemos handleer nuestro expected traffic?" Stress testing answer "que pasa cuando lo exceedemos?" Corre load tests antes de every major release. Corre stress tests quarterly o antes de major traffic events (Black Friday, product launches) para entender tu system's limits y autoscaling behavior.

### ¿Cuántos concurrent users deberia testear?

Empieza con tu current peak traffic — checkea analytics para el highest concurrent user count en los last 30 days. Testea a 1x (current peak), 2x (expected growth) y 5x (stress scenario). Si no tienes analytics data, estima desde request volume: si gets 100,000 requests per hour, eso es roughly 28 req/sec, que translates a about 50-100 concurrent users dependiendo del journey length. Para un new service sin traffic data, empieza con 100 users y scalea up. Siempre testea en un environment que mirror production — testear en un scaled-down staging environment da misleading results.

### ¿Qué load testing tool deberia elegir?

Para API testing con CI/CD integration, k6 es el best choice — scriptea en JavaScript, tiene built-in thresholds para pass/fail y integra con GitHub Actions. Para enterprise environments con diverse protocols (JMS, SMTP, JDBC), JMeter tiene el broadest protocol support y un GUI para non-developers. Para custom protocols o cuando needeas full programming flexibility, Locust (Python) es ideal. Para quick HTTP API tests, Artillery (Node.js) tiene el simplest YAML-based configuration. Considera tu team's language expertise — un Python team estara mas comodo con Locust, un JavaScript team con k6. All four tools soportan distributed testing para high-load scenarios.

### ¿Cómo simulo realistic user behavior?

Mappea real user journeys desde tu analytics — que porcentaje de users browsean, searchean, view products, checkeout? Asigna weights a cada journey en tu test script (k6: `@task(40)`, Locust: `@task(40)`). Addea think time entre requests (1-5 seconds) — real users no sendean requests back-to-back. Usa realistic test data — real product IDs, real search queries desde tu query log, no random strings. Varia el data per request para que caches no skween results. Incluye authentication — most production traffic es authenticated. Testea el full journey, no solo individual endpoints — el system behavior bajo un sequence de requests difiere de isolated calls. Si tienes session management, testea session creation y expiry.

### ¿Qué deberia hacer si el load test failea?

Primero, determina cual threshold se excedio. Si error rate es high, checkea server logs para exceptions y database logs para connection issues. Si response times son high, checkea CPU y memory usage durante el test — si CPU hitteo 90%, el server esta under-provisioned. Si database connections estan exhausted, increasea el pool size. Si el system crasheo, checkea para memory leaks (corre un soak test) o resource exhaustion. Documenta el failure en el test report con el specific metric, el actual value y el root cause. Fixea el issue y re-corre el test. No lowerees thresholds para hacer un faileando test pasar — eso defeat el purpose. Si el failure es due a test infrastructure (no el application), markea el result como inconclusive y re-corre con fixed infrastructure.
