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
relatedResources:
  - /recipes/load-testing
  - /recipes/integration-testing
  - /guides/testing-strategy-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Load testing APIs with k6. Measure performance, validate SLOs with threshold assertions, and identify bottlenecks before production deployment."
  keywords:
    - k6 load testing
    - api performance
    - load test
    - benchmarking
    - slo validation
---

# Load Testing APIs with k6 and Threshold-Based Assertions

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

- Run smoke tests on every [pull request](/guides/cicd-pipeline-guide) to catch basic regressions
- Schedule soak tests (hours-long runs) to find memory leaks
- Use separate environments for load testing; never test [production](/guides/devops/deployment-strategies-guide) directly
- Correlate k6 metrics with [APM tools](/recipes/observability/metrics-collection) for root cause analysis

## Common Mistakes

- Testing from a single machine that becomes the bottleneck
- Not warming up the application before measuring steady-state performance
- Using `sleep()` with random intervals that do not match real user think time

## FAQ

**Q: How many VUs do I need to simulate 10,000 real users?**
A: It depends on request frequency. If each user makes a request every 30 seconds, 50-100 VUs can simulate 10,000 users.

**Q: Can k6 test WebSocket connections?**
A: Yes, through the experimental `k6/ws` module, though dedicated WebSocket tools may be more appropriate.

**Q: How do I handle dynamic data in load tests?**
A: Use `papaparse` to read CSV files or generate randomized data with built-in `random` functions.
