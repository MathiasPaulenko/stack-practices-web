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
  - load-testing
  - performance
  - k6
  - jmeter
  - api-testing
  - scalability
  - stress-testing
  - benchmarks
relatedResources:
  - /recipes/integration-testing
  - /recipes/rate-limiting
  - /recipes/connection-pooling
lastUpdated: "2026-06-13"
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

Modern load testing tools like k6 and JMeter let you define scenarios in code or configuration, run them from the command line or CI pipelines, and export detailed metrics. This recipe covers how to design realistic load tests, interpret the results, and iterate on performance improvements.

## When to Use

Use this recipe when:

- Preparing for a product launch, marketing campaign, or seasonal traffic spike
- Migrating infrastructure and needing to validate the new platform handles equivalent load
- Establishing performance baselines and Service Level Objectives (SLOs)
- Investigating intermittent timeouts or errors that only appear under concurrent load
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

## Best Practices

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

**Q: How many virtual users do I need to simulate real traffic?**
A: Model concurrent users, not total users. If you have 10,000 daily users but only 500 active at any moment, test with 500 VUs (plus a safety margin).

**Q: What is the difference between load testing and stress testing?**
A: Load testing validates behavior at expected traffic levels. Stress testing pushes beyond expected levels to find the breaking point and observe recovery behavior.

**Q: Can I run load tests in CI/CD?**
A: Yes. k6 and Artillery are designed for this. Run nightly smoke tests (small load) and pre-release regression tests (full load) in your pipeline.

**Q: Should I test production directly?**
A: Only with extreme caution. Use synthetic transactions, read-only endpoints, and off-peak hours. Prefer staging for destructive or write-heavy tests.

