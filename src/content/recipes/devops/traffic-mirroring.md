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
relatedResources:
  - /guides/cicd-pipeline-guide
  - /docs/post-deployment-checklist-template
  - /guides/deployment-strategies-guide
  - /recipes/blue-green-deployment
  - /recipes/graceful-shutdown
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

Traffic mirroring copies real production requests to a staging or shadow environment without affecting users. This enables realistic load testing, regression validation, and performance benchmarking against actual traffic patterns. Unlike synthetic tests that simulate user behavior, mirrored traffic reveals how systems behave under genuine request distributions, headers, and payloads.

## When to Use

Use this resource when:
- Load testing with synthetic data doesn't capture real-world request complexity
- Validating a new service version against production traffic before cutover
- You need to benchmark infrastructure changes (database versions, kernel upgrades)
- Testing disaster recovery by replaying production traffic against standby systems

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
- **Idempotency**: Mirrored POST/PUT requests must be safe to duplicate
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

## Best Practices

- **Start with small percentages**: Mirror 1% of traffic initially; scale to 100% for full validation
- **Sanitize mirrored requests**: Strip PII, auth tokens, and payment data before sending to staging
- **Monitor staging like production**: Mirrored traffic can trigger alerts; tune thresholds separately
- **Disable outbound effects**: Turn off webhooks, emails, and third-party API calls in mirror targets
- **Compare responses**: Diff production vs. mirror responses to detect regressions

## Common Mistakes

1. **Mirroring without idempotency**: Charging customers twice because the payment API was mirrored
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
A: Load testing generates artificial traffic. Mirroring uses real traffic. Use both: mirror for realism, load testing for capacity limits.
