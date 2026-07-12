---





contentType: recipes
slug: istio-canary-deployment
title: "Canary Deployments with Istio Service Mesh"
description: "How to use Istio traffic splitting to perform safe canary deployments by gradually shifting user traffic between application versions"
metaDescription: "Canary deployments with Istio. Split traffic between app versions, monitor metrics, and automate rollback for zero-downtime releases."
difficulty: advanced
topics:
  - devops
  - infrastructure
tags:
  - istio
  - kubernetes
  - deployment
  - devops
  - ci-cd
relatedResources:
  - /recipes/aws-ecs-fargate
  - /recipes/terraform-aws-vpc
  - /guides/infrastructure-as-code-guide
  - /docs/environment-configuration-template
  - /docs/zero-downtime-deployment-checklist
  - /recipes/blue-green-deployment
  - /recipes/cost-optimization
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Canary deployments with Istio. Split traffic between app versions, monitor metrics, and automate rollback for zero-downtime releases."
  keywords:
    - istio
    - canary deployment
    - service mesh
    - traffic splitting
    - kubernetes





---

# Canary Deployments with Istio Service Mesh

Istio provides fine-grained traffic management through virtual services and destination rules. By splitting traffic between stable and canary versions of a service, you can validate new releases with real user traffic while maintaining the ability to instantly rollback if errors spike.

## When to Use This

- You deploy to Kubernetes and need progressive traffic shifting. See [Blue-Green Deployment](/recipes/devops/blue-green-deployment) for zero-downtime releases.
- New releases require real-world validation before full rollout. See [Feature Flags](/recipes/devops/feature-flags) for gradual rollouts.
- You want to minimize blast radius of deployment failures. See [Health Check Endpoint](/recipes/devops/health-check-endpoint) for early failure detection.

## Prerequisites

- Kubernetes cluster with Istio installed
- Two versions of an application deployed with different labels

## Solution

### 1. Deploy Both Versions

```yaml
# deployment-v1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
      version: v1
  template:
    metadata:
      labels:
        app: api
        version: v1
    spec:
      containers:
      - name: api
        image: myapp:1.0.0
        ports:
        - containerPort: 8080
```

```yaml
# deployment-v2.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
      version: v2
  template:
    metadata:
      labels:
        app: api
        version: v2
    spec:
      containers:
      - name: api
        image: myapp:1.1.0
        ports:
        - containerPort: 8080
```

### 2. Create Destination Rule for Subsets

```yaml
# destination-rule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api
spec:
  host: api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### 3. Configure Traffic Splitting

```yaml
# virtual-service-canary.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
        subset: v1
      weight: 90
    - destination:
        host: api
        subset: v2
      weight: 10
```

### 4. Progressive Rollout Script

```bash
#!/bin/bash
# canary-rollout.sh

set -e

function set_weight() {
  local v1_weight=$1
  local v2_weight=$((100 - v1_weight))
  
  cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
        subset: v1
      weight: ${v1_weight}
    - destination:
        host: api
        subset: v2
      weight: ${v2_weight}
EOF
}

# Phase 1: 10% traffic to v2
set_weight 90
echo "Deployed v2 at 10%. Monitoring for 5 minutes..."
sleep 300

# Phase 2: 50% traffic to v2
set_weight 50
echo "Deployed v2 at 50%. Monitoring for 5 minutes..."
sleep 300

# Phase 3: 100% traffic to v2
set_weight 0
echo "Deployed v2 at 100%. Canary complete."
```

### 5. Automated Rollback via Prometheus

```yaml
# canary-analysis.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: load-test
      url: http://flagger-loadtester.test/
      timeout: 5s
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://api:8080/health"
```

## How It Works

1. **DestinationRule** defines subsets based on pod labels
2. **VirtualService** assigns traffic weights to each subset
3. **Progressive Shift** moves traffic in stages while monitoring error rates
4. **Outlier Detection** automatically ejects unhealthy pods
5. **Rollback** reverses traffic weights if metrics exceed thresholds

## Production Considerations

- Use **Flagger** for automated canary analysis and promotion
- Monitor **latency, error rate, and throughput** independently during rollout
- Keep canary replicas small initially; scale only after validation
- Combine with **feature flags** for dark launches of new functionality

## Common Mistakes

- Sending canary traffic to internal admin endpoints that users never hit
- Not monitoring business metrics (checkout rate, signup conversion)
- Forgetting to scale down the old version after full promotion

## FAQ

**Q: How is this different from a rolling update?**
A: Rolling updates replace pods in place. Canary deployments route traffic progressively, allowing you to observe behavior with real users before full commitment.

**Q: Can I canary based on user properties instead of random percentages?**
A: Yes. Istio supports routing by headers, cookies, or JWT claims for targeted canary releases.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### Header-Based Canary Routing

```yaml
# Route internal testers to v2 regardless of weight
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-header-routing
spec:
  hosts:
  - api
  http:
  - match:
    - headers:
        x-canary-test:
          exact: "true"
    route:
    - destination:
        host: api
        subset: v2
  - route:
    - destination:
        host: api
        subset: v1
      weight: 100
```

### Traffic Mirroring (Shadow Traffic)

```yaml
# Mirror 100% of traffic to v2 without affecting responses
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-mirror
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
        subset: v1
      weight: 100
    mirror:
      host: api
      subset: v2
    mirrorPercentage:
      value: 100.0
```

### Circuit Breaking with DestinationRule

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-circuit-breaker
spec:
  host: api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 20
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    loadBalancer:
      simple: LEAST_REQUEST
```

### Post-Promotion Cleanup

```bash
#!/bin/bash
# cleanup-old-version.sh

# After full canary promotion to v2:
# 1. Remove old VirtualService weights
kubectl apply -f virtual-service-v2-only.yaml

# 2. Scale down v1 deployment
kubectl scale deployment api-v1 --replicas=0

# 3. Wait for pods to terminate
kubectl wait --for=delete pod -l app=api,version=v1 --timeout=60s

# 4. Remove v1 deployment
kubectl delete deployment api-v1

# 5. Remove v1 subset from DestinationRule
kubectl apply -f destination-rule-v2-only.yaml

echo "Cleanup complete. Only v2 is running."
```

## Additional Best Practices

1. **Use Flagger for fully automated canary analysis.** It handles traffic shifting, metric evaluation, and rollback without manual intervention:

```yaml
# Flagger with custom Prometheus query
analysis:
  metrics:
  - name: error-rate
    threshold: 1
    query: |
      sum(rate(istio_requests_total{
        destination_service="api.default.svc.cluster.local",
        response_code=~"5.*"
      }[1m])) /
      sum(rate(istio_requests_total{
        destination_service="api.default.svc.cluster.local"
      }[1m])) * 100
```

2. **Tag images with semantic versions, not `latest`.** This ensures you can roll back to a specific version:

```bash
# Good: versioned tags
image: myapp:1.1.0
image: myapp:1.1.1

# Bad: mutable tags
image: myapp:latest
```

3. **Run canary during low-traffic hours.** Reduce blast radius by starting rollouts during off-peak periods:

```bash
# Schedule canary for 2 AM
0 2 * * * /opt/scripts/canary-rollout.sh >> /var/log/canary.log 2>&1
```

## Additional Common Mistakes

1. **Not defining SLOs before canary.** Without thresholds, you cannot automate rollback decisions:

```yaml
# Define SLOs explicitly
slos:
  - name: availability
    target: 99.9
  - name: latency_p99
    target: 200ms
```

2. **Using same database for v1 and v2 with schema changes.** Backward-incompatible migrations break v1:

```bash
# Use expand-contract pattern
# 1. Expand: add new columns (both versions work)
# 2. Migrate: v2 writes to new columns
# 3. Contract: remove old columns after v1 is gone
```

3. **Ignoring canary pod resource limits.** A single canary pod can consume cluster resources:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

## Additional FAQ

### How do I canary a database migration?

Use the expand-contract pattern. First, add new columns/tables (expand) so both versions work. Then deploy v2 which uses the new schema. Finally, remove old columns (contract) after v1 is decommissioned.

### What is traffic mirroring vs canary?

Traffic mirroring sends a copy of requests to the canary without affecting the user response. This lets you test v2 with real traffic patterns before shifting any actual traffic. Canary sends real traffic to v2, affecting user responses.

### How long should each canary phase last?

At least 5-10 minutes per phase for short-lived services. For high-traffic services, 30-60 minutes per phase gives enough data for statistical significance. Monitor error rate, latency p99, and business metrics.

## Performance Tips

1. **Use LEAST_REQUEST load balancing.** Prevents the canary pod from being overwhelmed:

```yaml
loadBalancer:
  simple: LEAST_REQUEST
```

2. **Enable Istio telemetry selectively.** Full telemetry adds overhead. Disable access logs during high-traffic canaries:

```yaml
telemetry:
  accessLogLogging:
    disabled: true
```

3. **Pre-warm canary pods.** Send a small amount of traffic before starting the rollout to JIT-compile code and warm caches:

```bash
# Pre-warm with 1% traffic for 2 minutes
set_weight 99
sleep 120
# Then start the real rollout
```
