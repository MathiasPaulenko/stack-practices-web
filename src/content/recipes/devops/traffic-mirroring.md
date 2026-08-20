---
contentType: recipes
slug: traffic-mirroring
title: "Traffic Mirroring for Production Testing and Shadow Deployments"
description: "Mirror production traffic to staging environments for realistic testing, shadow deployments, and performance validation without user impact."
metaDescription: "Traffic mirroring for production testing: shadow deployments, realistic load testing, performance validation, safe environment replication using Nginx, Istio and AWS."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - testing
  - deployment
  - ci-cd
  - nginx
  - istio
  - aws
  - kubernetes
relatedResources:
  - /guides/deployment-strategies-guide
  - /recipes/blue-green-deployment
  - /guides/canary-deployment-guide
  - /recipes/load-testing-k6
  - /recipes/idempotent-api-endpoints
  - /recipes/graceful-shutdown
lastUpdated: "2026-08-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Traffic mirroring for production testing: shadow deployments, realistic load testing, performance validation, safe environment replication using Nginx, Istio and AWS."
  keywords:
    - traffic-mirroring
    - devops
    - testing
    - deployment
    - shadow
    - nginx
    - istio
---

## Overview

Traffic mirroring copies real production requests to a staging or shadow
environment without affecting users. This lets you do realistic load testing,
regression validation, and performance benchmarking against actual traffic
patterns. Unlike synthetic tests, mirrored traffic reveals how systems behave
under genuine request distributions, headers, and payloads.

## When to Use

- Load testing with synthetic data doesn't capture real-world request
complexity.
- Validating a new service version against production traffic before cutover.
- Benchmarking infrastructure changes such as database versions or kernel
  upgrades.
- Testing disaster recovery by replaying production traffic against standby
  systems.

### When to avoid

- The application can't handle duplicated requests safely. Mirroring non-
  idempotent POST or payment calls can cause real side effects.
- Staging shares databases or third-party accounts with production. Writes from
  mirrored traffic corrupt production state.
- You can't isolate side effects. Mirrored traffic shouldn't send real emails,
  charge payments, or trigger webhooks.

## Solution

### AWS VPC Traffic Mirroring

```bash
# Create a traffic mirror target (NLB or ENI)
aws ec2 create-traffic-mirror-target \
  --network-load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/staging-nlb/abc123

# Create a mirror filter for HTTP/HTTPS traffic
aws ec2 create-traffic-mirror-filter-rule \
  --traffic-mirror-filter-id tmf-1234567890abcdef0 \
  --traffic-direction ingress \
  --rule-action accept \
  --protocol 6 \
  --destination-port-range FromPort=80,ToPort=443

# Create the mirror session
aws ec2 create-traffic-mirror-session \
  --network-interface-id eni-1234567890abcdef0 \
  --traffic-mirror-target-id tmt-1234567890abcdef0 \
  --traffic-mirror-filter-id tmf-1234567890abcdef0 \
  --session-number 1 \
  --packet-length 1500
```

### Nginx mirror module

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /api/ {
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

        # Do not block production on staging response
        proxy_connect_timeout 1s;
        proxy_read_timeout 1s;
        proxy_ignore_client_abort on;
    }
}
```

### Istio traffic mirroring (Kubernetes)

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
        value: 10.0
```

### Envoy traffic mirroring

```yaml
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
                          request_mirror_policy:
                            cluster: staging_backend
                            runtime_fraction:
                              default_value:
                                numerator: 10
                                denominator: HUNDRED
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

### GoReplay for TCP-level replay

```bash
# Capture and replay live traffic
gor --input-raw :8080 --output-http http://staging-api:8080

# Mirror 10% of traffic
gor --input-raw :8080 --output-http "http://staging-api:8080|10%"

# Save to file for later replay
gor --input-raw :8080 --output-file requests.gor

# Replay at 2x speed
gor --input-file "requests.gor|200%" --output-http http://staging-api:8080

# Filter POST requests to /api
gor --input-raw :8080 --http-allow-method POST --http-allow-url ^/api --output-http http://staging-api:8080
```

### Response comparison

```javascript
const express = require("express");
const app = express();

app.use(async (req, res, next) => {
  const prodResponse = await fetch(`http://production${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  const prodJson = await prodResponse.json();

  const stagingResponse = await fetch(`http://staging${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  }).catch(() => null);

  if (stagingResponse) {
    const stagingJson = await stagingResponse.json();
    const diff = deepDiff(prodJson, stagingJson);
    if (diff) {
      console.log(JSON.stringify({
        url: req.url,
        method: req.method,
        diff,
        timestamp: new Date().toISOString(),
      }));
    }
  }

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

## Explanation

**Mirror vs. canary vs. shadow**:

| Pattern | User impact | Response source | Use case |
| --- | --- | --- | --- |
| Mirror | None | Production only | Testing and shadow analysis |
| Canary | Partial | New version | Gradual rollout |
| Blue-green | Switched | One version | Instant cutover |
| Shadow | None (async) | Production | Latency-insensitive analysis |

Mirrored traffic is a duplicate. It reaches the mirror target in addition to the
production backend, so the production response path must remain independent.
Network-level mirroring copies packets, while application-level mirroring sends
HTTP requests. Application-level setups can filter by URL, method, and headers
easily.

Key considerations:

- **Idempotency**: mirrored POST/PUT requests must be safe to repeat. See
  [idempotent API endpoints](/recipes/idempotent-api-endpoints/).
- **State isolation**: the staging database must not share state with production.
- **Side effects**: disable email, payment, and notification services in the
  mirror target.
- **Latency**: the mirror should never block the production response.

## Variants

| Tool | Level | Overhead | Best for |
| --- | --- | --- | --- |
| AWS Traffic Mirroring | Network (ENI) | Low | EC2-based workloads |
| Nginx mirror | Application | Minimal | Nginx-based architectures |
| Istio | Service mesh | Low | Kubernetes microservices |
| Envoy | Sidecar | Low | Custom proxy configurations |
| GoReplay | Application | Medium | TCP-level replay and capture |

## Best Practices

- Start with 1% of traffic and increase gradually. Never start at 100%.
- Sanitize mirrored requests. Strip PII, auth tokens, and payment data before
  sending to staging.
- Disable outbound effects in the mirror target: webhooks, emails, third-party
  API calls, and push notifications.
- Monitor the mirror target separately. Mirrored traffic can trigger alerts, so
  use separate thresholds and dashboards.
- Filter out health checks and monitoring requests so they don't pollute staging
  data.
- Filter static assets. Mirroring CSS, JS, and images wastes resources and skews
  metrics.
- Use async fire-and-forget for application-level mirrors. Never `await` the
  mirror response.
- Compare production and mirror responses to detect regressions in shape,
  latency, and status codes.

## Common Mistakes

- Mirroring without idempotency. Charging a customer twice because the payment
  API was mirrored is a real risk. Use idempotency keys for all mutating
  endpoints.
- Sharing databases between production and the mirror target. Writes from
  mirrored traffic corrupt production data.
- Blocking production on mirror target latency. Always set short timeouts and
  ignore mirror errors.
- Mirroring health checks and monitoring requests. This adds noise to staging
  analytics.
- Forgetting to disable side effects. Staging shouldn't send real emails to
  real customers.
- Mirroring traffic to a public staging endpoint without authentication. This
  can leak production data and credentials.

## FAQ

### Does mirroring impact production performance?

Minimal if done correctly. Network-level mirroring adds near-zero overhead.
Application-level mirrors should be async fire-and-forget with short timeouts.

### Can I mirror traffic across regions?

Yes, but latency increases. AWS Traffic Mirroring works within the same VPC.
Cross-region requires VPN, Transit Gateway, or an application-level mirror.

### How is mirroring different from load testing?

Load testing generates artificial traffic to find capacity limits. Mirroring
uses real traffic for realism. Use both: mirror for realistic regression
validation, load testing for capacity and stress.

### How do I avoid data leakage in mirrored traffic?

Sanitize headers and bodies before they leave production. Strip auth tokens,
PII, and payment data. Use a dedicated, isolated staging environment.

### Should I mirror 100% of traffic?

Only after you've validated idempotency, isolated state, disabled side effects,
and confirmed the mirror target can handle the load. Start at 1%.

### How do I compare production and mirror responses?

Log the status code, response time, and a diff of selected fields. Automated
diffing catches regressions before a canary or full cutover.
