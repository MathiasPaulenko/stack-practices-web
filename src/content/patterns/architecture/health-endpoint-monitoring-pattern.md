---
contentType: patterns
slug: health-endpoint-monitoring-pattern
title: "Health Endpoint Monitoring Pattern"
description: "Expose lightweight health endpoints so orchestrators, load balancers, and monitoring tools can verify service availability."
metaDescription: "Verify service health with the Health Endpoint Monitoring Pattern. Expose probes for load balancers, orchestrators, and alerting systems."
difficulty: beginner
category: architectural
topics:
  - architecture
  - observability
  - infrastructure
tags:
  - health-endpoint-monitoring
  - pattern
  - observability
  - microservices
  - health-check
relatedResources:
  - /patterns/gateway-routing-pattern
  - /patterns/anti-corruption-layer-pattern
  - /patterns/content-delivery-network-pattern
  - /guides/api-gateway-design-guide
  - /patterns/database-per-service-pattern
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Verify service health with the Health Endpoint Monitoring Pattern. Expose probes for load balancers, orchestrators, and alerting systems."
  keywords:
    - health-endpoint-monitoring
    - pattern
    - observability
    - microservices
    - health-check
---
## Overview

The Health Endpoint Monitoring Pattern exposes lightweight endpoints that report whether a service is alive and ready to handle traffic. Load balancers, container orchestrators, and monitoring tools can call these endpoints to decide whether to route traffic to an instance or restart it.

This pattern is the foundation of self-healing systems and is essential for any service that runs in a dynamic environment where instances can fail or restart at any time.

## When to Use

Use this pattern when:
- You run services in containers or behind a load balancer
- You want an orchestrator to restart unhealthy instances automatically
- You need to distinguish between "the process is running" and "the service is usable"
- You want to add dependency health checks without modifying client code
- You need to surface health data to a monitoring dashboard or alert system

## Solution

```javascript
// Express health endpoints with liveness and readiness probes
const express = require('express');
const app = express();

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const cacheHealthy = await checkCacheConnection();
  if (dbHealthy && cacheHealthy) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

app.listen(3000);
```

```yaml
# Kubernetes liveness and readiness probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      containers:
      - name: api
        image: api:latest
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Explanation

Health endpoints separate two concerns:
- **Liveness**: the process is running and should not be restarted. If liveness fails, the orchestrator kills the container and starts a new one.
- **Readiness**: the service is ready to accept traffic. If readiness fails, the load balancer stops sending requests but does not restart the instance.

By checking dependencies such as databases, caches, and message queues, readiness probes prevent traffic from reaching an instance that cannot serve requests correctly. This improves reliability and reduces error rates during deployments or outages.

## Variants

| Endpoint | Purpose | Response |
|----------|---------|----------|
| **Liveness** | Is the process alive? | `200` when running, `500` otherwise |
| **Readiness** | Can it handle traffic? | `200` when dependencies are healthy, `503` otherwise |
| **Startup** | Has it finished starting? | `200` after initialization is complete |
| **Deep health** | Detailed subsystem status | JSON with per-dependency health |

## Best Practices

- Keep the **liveness** probe lightweight and dependency-free
- Make the **readiness** probe reflect the actual ability to serve requests
- Return **consistent status codes** (`200` for healthy, `503` for unhealthy)
- Avoid heavy operations in health checks to prevent false failures
- Add **timeouts** and **retry budgets** for dependency checks
- Log health check failures for debugging but do not spam logs on every call

## Common Mistakes

- Using a single endpoint that returns OK even when the service is broken
- Making health checks depend on **external services** that are not critical
- Returning `500` for liveness, causing unnecessary restarts
- Forgetting to test readiness probes during deployment rollouts
- Exposing health endpoints publicly without authentication or rate limiting

## Frequently Asked Questions

**Q: Should a liveness probe check the database?**
A: No. Liveness should only verify that the process is running. If the database is down, a readiness probe should fail, not the liveness probe.

**Q: What status code should a readiness probe return when unhealthy?**
A: Return `503 Service Unavailable`. This tells the orchestrator to stop routing traffic without restarting the container.

**Q: Can I expose health endpoints to the public internet?**
A: Only if they do not leak sensitive information. Internal deep-health endpoints should be protected by network policies or authentication.
