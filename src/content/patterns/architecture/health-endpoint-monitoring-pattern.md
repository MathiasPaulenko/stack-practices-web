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
  - /patterns/ambassador-pattern
  - /guides/complete-guide-observability-grafana-stack
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

## What Works

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

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.

## Advanced Solutions

### Deep health endpoint with dependency checks

Implement a detailed health endpoint that checks all dependencies:

```javascript
const express = require('express');
const app = express();

const healthChecks = {
  database: async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 'healthy', latency: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },
  cache: async () => {
    try {
      await cache.ping();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },
  messageQueue: async () => {
    try {
      await channel.checkQueue();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
};

app.get('/health/deep', async (req, res) => {
  const results = {};
  let overallHealthy = true;

  for (const [name, check] of Object.entries(healthChecks)) {
    try {
      const start = Date.now();
      const result = await check();
      results[name] = { ...result, checkTime: Date.now() - start };
      if (result.status !== 'healthy') {
        overallHealthy = false;
      }
    } catch (error) {
      results[name] = { status: 'error', error: error.message };
      overallHealthy = false;
    }
  }

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? 'healthy' : 'unhealthy',
    checks: results,
    timestamp: new Date().toISOString()
  });
});
```

### Startup probe for slow-initializing services

Use a startup probe for services that take time to initialize:

```yaml
# Kubernetes deployment with startup probe
apiVersion: apps/v1
kind: Deployment
metadata:
  name: slow-startup-service
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30  # Allow up to 5 minutes to start
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
```

```javascript
// Startup endpoint that returns success only after initialization
let isInitialized = false;

async function initialize() {
  // Perform slow initialization tasks
  await loadConfiguration();
  await warmUpCache();
  await connectToExternalServices();
  isInitialized = true;
}

app.get('/health/startup', (req, res) => {
  if (isInitialized) {
    res.status(200).json({ status: 'initialized' });
  } else {
    res.status(503).json({ status: 'initializing' });
  }
});

// Start initialization in background
initialize();
```

### Health endpoint with circuit breaker

Add circuit breaker pattern to prevent health check storms:

```javascript
class HealthCheckCircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'closed'; // closed, open, half-open
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }

  shouldAllowCheck() {
    if (this.state === 'closed') return true;
    
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.timeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    return true;
  }
}

const circuitBreaker = new HealthCheckCircuitBreaker();

app.get('/health/ready', async (req, res) => {
  if (!circuitBreaker.shouldAllowCheck()) {
    return res.status(503).json({ status: 'circuit open' });
  }

  try {
    const dbHealthy = await checkDatabaseConnection();
    const cacheHealthy = await checkCacheConnection();
    
    if (dbHealthy && cacheHealthy) {
      circuitBreaker.recordSuccess();
      res.status(200).json({ status: 'ready' });
    } else {
      circuitBreaker.recordFailure();
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    circuitBreaker.recordFailure();
    res.status(503).json({ status: 'error', message: error.message });
  }
});
```

## Additional Best Practices


- For a deeper guide, see [Complete Guide to Observability with the Grafana Stack](/guides/complete-guide-observability-grafana-stack/).

1. **Add version information to health endpoints.** Include the service version, build timestamp, and git commit hash in health responses. This helps identify which version is deployed and track deployments.

```javascript
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    version: process.env.APP_VERSION || 'unknown',
    buildTime: process.env.BUILD_TIME || 'unknown',
    commitHash: process.env.COMMIT_HASH || 'unknown'
  });
});
```

2. **Implement health endpoint authentication.** Protect deep health endpoints with authentication tokens or IP allowlists. This prevents unauthorized access to sensitive system information.

```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers['x-health-token'];
  if (token !== process.env.HEALTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/health/deep', authMiddleware, async (req, res) => {
  // Deep health check implementation
});
```

3. **Use health checks for graceful shutdown.** Implement a shutdown endpoint that marks the service as unhealthy, allowing the load balancer to drain traffic before the process exits.

```javascript
let isShuttingDown = false;

app.post('/health/shutdown', (req, res) => {
  isShuttingDown = true;
  res.status(200).json({ status: 'shutting down' });
  
  // Give load balancer time to stop sending traffic
  setTimeout(() => {
    process.exit(0);
  }, 10000);
});

app.get('/health/ready', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }
  // Normal readiness check
});
```

## Additional Common Mistakes

1. **Making health checks too expensive.** Health checks that query large databases or perform complex operations can cause performance degradation. Keep health checks fast (under 100ms) and lightweight.

2. **Forgetting to handle concurrent health check requests.** Multiple health check requests from load balancers can overwhelm the service. Implement rate limiting or caching for health check responses.

## Additional Frequently Asked Questions

### How often should health checks be called?

Configure health check intervals based on your requirements. Typical intervals are 5-10 seconds for readiness probes and 15-30 seconds for liveness probes. More frequent checks provide faster detection but increase load.

### Should health checks return detailed error messages?

For public health endpoints, return generic status only. For internal deep health endpoints, include detailed error messages to help debugging. Never expose sensitive information in public health responses.

### How do I handle health checks during database migrations?

Implement a migration status endpoint that returns the migration state. During migrations, the readiness probe can check this endpoint and return not ready if migrations are in progress. This prevents routing traffic to a service with incompatible schema changes.
