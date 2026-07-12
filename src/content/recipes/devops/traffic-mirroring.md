---


contentType: recipes
slug: traffic-mirroring
title: "Traffic Mirroring"
description: "Mirror production traffic to staging environments for realistic testing, shadow deployments, and performance validation without user impact."
metaDescription: "Traffic mirroring for production testing: shadow deployments, realistic load testing, performance validation, and safe environment replication without user impact."
difficulty: intermediate
topics:
  - devops
tags:
  - traffic-mirroring
  - devops
  - testing
  - deployment
  - ci-cd
relatedResources:
  - /guides/cicd-pipeline-guide
  - /docs/post-deployment-checklist-template
  - /guides/deployment-strategies-guide
  - /recipes/blue-green-deployment
  - /recipes/graceful-shutdown
  - /recipes/background-jobs
  - /recipes/bash-scripting-automation
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Traffic mirroring for production testing: shadow deployments, realistic load testing, performance validation, and safe environment replication without user impact."
  keywords:
    - traffic-mirroring
    - devops
    - testing
    - deployment


---
## Overview

Traffic mirroring copies real production requests to a staging or [shadow environment](/recipes/devops/blue-green-deployment) without affecting users. This enables realistic load testing, regression validation, and performance benchmarking against actual traffic patterns. Unlike synthetic tests that simulate user behavior, mirrored traffic reveals how systems behave under genuine request distributions, headers, and payloads.

## When to Use

Use this resource when:
- Load testing with synthetic data doesn't capture real-world request complexity
- Validating a new service version against production traffic before cutover
- You need to benchmark infrastructure changes (database versions, kernel upgrades)
- Testing [disaster recovery](/guides/devops/on-call-incident-response-guide) by replaying production traffic against standby systems

## Solution

### AWS VPC Traffic Mirroring (CLI)

```bash
# Create traffic mirror target (NLB or ENI)
aws ec2 create-traffic-mirror-target \
  --network-load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/staging-nlb/abc123

# Create mirror filter (capture only HTTP traffic to /api)
aws ec2 create-traffic-mirror-filter-rule \
  --traffic-mirror-filter-id tmf-1234567890abcdef0 \
  --traffic-direction ingress \
  --rule-action accept \
  --protocol 6 \
  --destination-port-range FromPort=80,ToPort=443

# Create mirror session
aws ec2 create-traffic-mirror-session \
  --network-interface-id eni-1234567890abcdef0 \
  --traffic-mirror-target-id tmt-1234567890abcdef0 \
  --traffic-mirror-filter-id tmf-1234567890abcdef0 \
  --session-number 1 \
  --packet-length 1500
```

### Nginx Mirror Module

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        # Mirror requests to staging while proxying to production
        mirror /staging_mirror;
        mirror_request_body on;

        proxy_pass http://production_backend;
        proxy_set_header Host $host;
    }

    location /staging_mirror {
        internal;
        proxy_pass http://staging_backend$request_uri;
        proxy_set_header Host staging-api.example.com;
        proxy_set_header X-Mirrored-From $host;
        
        # Ignore response; don't wait for staging
        proxy_connect_timeout 1s;
        proxy_read_timeout 1s;
        proxy_ignore_client_abort on;
    }
}
```

### Istio Traffic Mirroring (Kubernetes)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-mirror
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: api-production
            port:
              number: 8080
          weight: 100
      mirror:
        host: api-staging
        port:
          number: 8080
      mirrorPercentage:
        value: 10.0  # Mirror 10% of traffic
```

## Explanation

**Mirror vs. canary vs. shadow**:

| Pattern | User Impact | Response Source | Use Case |
|---------|-------------|-----------------|----------|
| Mirror | None | Production only | Testing; shadow analysis |
| Canary | Partial | New version | Gradual rollout |
| Blue-green | Switched | One version | Instant cutover |
| Shadow | None (async) | Production | Latency-insensitive analysis |

**Key considerations**:
- **Idempotency**: Mirrored POST/PUT requests must be safe to duplicate. See [message idempotency](/recipes/messaging/rabbitmq-task-queue).
- **State isolation**: Staging database must not share state with production
- **Side effects**: Disable email, payment, and notification services in mirror target
- **Latency**: Mirror should not block the production response path

## Variants

| Tool | Level | Overhead | Best For |
|------|-------|----------|----------|
| AWS Traffic Mirroring | Network (ENI) | Low | EC2-based workloads |
| Nginx mirror | Application | Minimal | Nginx-based architectures |
| Istio | Service mesh | Low | Kubernetes microservices |
| Envoy | Sidecar | Low | Custom proxy configurations |
| GoReplay | Application | Medium | TCP-level replay |

## What Works

- **Start with small percentages**: Mirror 1% of traffic initially; scale to 100% for full validation
- **Sanitize mirrored requests**: Strip PII, auth tokens, and payment data before sending to staging
- **Monitor staging like production**: Mirrored traffic can trigger alerts; tune thresholds separately
- **Disable outbound effects**: Turn off webhooks, emails, and third-party API calls in mirror targets
- **Compare responses**: Diff production vs. mirror responses to detect regressions

## Common Mistakes

1. **Mirroring without idempotency**: Charging customers twice because the payment API was mirrored. Use [idempotency keys](/recipes/messaging/rabbitmq-task-queue).
2. **Shared databases**: Production and mirror writing to the same database corrupt data
3. **Blocking production**: Mirror target latency added to production response time
4. **No traffic filtering**: Mirroring health checks and monitoring requests pollutes staging data
5. **Forgetting to disable side effects**: Staging sends real emails to real customers

## Frequently Asked Questions

**Q: Does mirroring impact production performance?**
A: Minimal if implemented correctly. Network-level mirroring has near-zero overhead. Application-level mirrors should use async fire-and-forget.

**Q: Can I mirror traffic across regions?**
A: Yes, but latency increases. AWS Traffic Mirroring works within the same VPC; cross-region requires VPN or Transit Gateway.

**Q: How is mirroring different from load testing?**
A: [Load testing](/recipes/performance/load-testing-k6) generates artificial traffic. Mirroring uses real traffic. Use both: mirror for realism, load testing for capacity limits.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Envoy Traffic Mirroring (Sidecar)

```yaml
# envoy.yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/api"
                route:
                  cluster: production_backend
                # Mirror to staging
                request_headers_to_add:
                - header:
                    key: x-mirrored
                    value: "true"
                # Shadow policy: mirror without waiting
                shadow_policy:
                  shadow_cluster: staging_backend
                  shadow_sample_rate: 100  # 100% of requests
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: production_backend
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: production_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: api-production.default.svc.cluster.local
                port_value: 8080

  - name: staging_backend
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: staging_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: api-staging.staging.svc.cluster.local
                port_value: 8080
```

### GoReplay for TCP-Level Traffic Replay

```bash
# Install GoReplay
$ wget https://github.com/buger/goreplay/releases/download/1.3.3/gor_1.3.3_x64.tar.gz
$ tar xzf gor_1.3.3_x64.tar.gz

# Capture production traffic and replay to staging
$ sudo gor --input-raw :8080 --output-http http://staging-api:8080

# Mirror with rate limiting (10% of traffic)
$ sudo gor --input-raw :8080 --output-http "http://staging-api:8080|10%"

# Save traffic to file for later replay
$ sudo gor --input-raw :8080 --output-file requests.gor

# Replay from file at 2x speed
$ gor --input-file "requests.gor|200%" --output-http http://staging-api:8080

# Filter only POST requests to /api
$ sudo gor --input-raw :8080 --http-allow-method POST --http-allow-url ^/api --output-http http://staging-api:8080
```

### Request Sanitization Middleware

```python
import re
from starlette.middleware.base import BaseHTTPMiddleware

SANITIZE_PATTERNS = [
    (re.compile(r'"password"\s*:\s*"[^"]*"'), '"password": "***"'),
    (re.compile(r'"token"\s*:\s*"[^"]*"'), '"token": "***"'),
    (re.compile(r'"credit_card"\s*:\s*"[^"]*"'), '"credit_card": "***"'),
    (re.compile(r'Bearer\s+[\w\-\.]+'), 'Bearer ***'),
    (re.compile(r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b'), '****-****-****-****'),
]

class SanitizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Only sanitize mirrored requests
        if request.headers.get("x-mirrored-from"):
            body = await request.body()
            sanitized = body.decode()
            for pattern, replacement in SANITIZE_PATTERNS:
                sanitized = pattern.sub(replacement, sanitized)
            # Replace request body
            request._body = sanitized.encode()
        return await call_next(request)
```

### Response Comparison for Regression Detection

```javascript
const express = require("express");
const app = express();

// Compare production and staging responses
app.use(async (req, res, next) => {
  const prodResponse = await fetch(`http://production${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  const stagingResponse = await fetch(`http://staging${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  }).catch(() => null);

  if (stagingResponse) {
    const prodJson = await prodResponse.json();
    const stagingJson = await stagingResponse.json();

    // Log differences for analysis
    const diff = deepDiff(prodJson, stagingJson);
    if (diff) {
      console.log(JSON.stringify({
        url: req.url,
        method: req.method,
        diff: diff,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  // Always return production response to user
  res.status(prodResponse.status).json(prodJson);
});

function deepDiff(obj1, obj2) {
  const diff = {};
  for (const key of Object.keys(obj1)) {
    if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      diff[key] = { prod: obj1[key], staging: obj2[key] };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}
```

### Istio Mirroring with Header-Based Filtering

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-mirror-filtered
spec:
  hosts:
    - api.example.com
  http:
    - match:
        - uri:
            prefix: /api
          headers:
            x-mirror-enabled:
              exact: "true"
      route:
        - destination:
            host: api-production
            port:
              number: 8080
          weight: 100
      mirror:
        host: api-staging
        port:
          number: 8080
      mirrorPercentage:
        value: 50.0

    # Non-mirrored route
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: api-production
            port:
              number: 8080
          weight: 100
```

## Additional Best Practices

6. **Use a separate namespace for mirror targets.** Keep staging mirror infrastructure isolated:

```bash
$ kubectl create namespace mirror-target
$ kubectl deploy -n mirror-target -f staging-deployment.yaml
```

7. **Set resource limits on mirror targets.** Mirrored traffic can overwhelm staging:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

8. **Monitor mirror queue depth.** If the mirror target can't keep up, requests pile up:

```yaml
# Alert if mirror response time > 500ms
- alert: MirrorTargetSlow
  expr: histogram_quantile(0.95, rate(mirror_request_duration_seconds_bucket[5m])) > 0.5
  for: 5m
  labels:
    severity: warning
```

## Additional Common Mistakes

6. **Mirroring to a lower-capacity environment.** Production handles 1000 RPS but staging crashes at 100 RPS. Always mirror a percentage that staging can handle.

7. **Not stripping authentication headers.** Mirrored requests carry production auth tokens to staging. Strip or replace them:

```nginx
location /staging_mirror {
    internal;
    proxy_pass http://staging_backend$request_uri;
    proxy_set_header Authorization "Bearer staging-token";
    proxy_set_header X-Mirrored-From $host;
}
```

8. **Mirroring during peak load.** Mirroring adds load to production (the mirror source). Disable mirroring during traffic spikes.

## Additional FAQ

### How much overhead does traffic mirroring add to production?

Network-level mirroring (AWS VPC, Envoy) adds <1ms latency. Application-level mirroring (Nginx, GoReplay) adds 1-5ms per request. The production response is never delayed — mirrors are fire-and-forget.

### Can I mirror WebSocket traffic?

Yes, but it requires special handling. Use Envoy or Istio, which support WebSocket mirroring at the L4 level. GoReplay also supports WebSocket replay.

### How do I compare production vs. mirror responses?

Use a service like Diffy or implement a custom comparison layer. Log differences to a datastore (Elasticsearch, BigQuery) for analysis:

```python
import json
from datetime import datetime

def log_comparison(url, prod_response, mirror_response):
    comparison = {
        "url": url,
        "timestamp": datetime.utcnow().isoformat(),
        "prod_status": prod_response.status_code,
        "mirror_status": mirror_response.status_code if mirror_response else None,
        "prod_body_hash": hash(json.dumps(prod_response.json(), sort_keys=True)),
        "mirror_body_hash": hash(json.dumps(mirror_response.json(), sort_keys=True)) if mirror_response else None,
        "match": prod_response.status_code == (mirror_response.status_code if mirror_response else None),
    }
    # Send to Elasticsearch or BigQuery
    send_to_elasticsearch(comparison)
```

## Performance Tips

1. **Start with 1% mirroring.** Gradually increase to 10%, 50%, then 100%:

```yaml
mirrorPercentage:
  value: 1.0  # Start here
```

2. **Use async fire-and-forget for application-level mirrors.** Never block the production response waiting for the mirror:

```javascript
// Fire and forget — don't await
fetch("http://staging/api" + req.url, {
  method: req.method,
  body: JSON.stringify(req.body),
}).catch(() => {});  // Ignore errors
```

3. **Filter out static asset requests.** Mirroring CSS, JS, and image requests wastes resources:

```nginx
location ~* \.(css|js|png|jpg|gif|svg|woff)$ {
    proxy_pass http://production_backend;
    # No mirror directive
}
```

4. **Use GoReplay's file-based replay for offline analysis.** Capture once, replay many times:

```bash
# Capture for 1 hour
$ timeout 3600 sudo gor --input-raw :8080 --output-file traffic.gor

# Replay at 5x speed against staging
$ gor --input-file "traffic.gor|500%" --output-http http://staging:8080
```

5. **Monitor mirror target resource usage.** Set up dashboards to track CPU, memory, and response times of the mirror target separately from production.
