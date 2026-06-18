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
relatedResources:
  - /recipes/devops/aws-ecs-fargate
  - /recipes/devops/terraform-aws-vpc
  - /guides/infrastructure-as-code-guide
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

- You deploy to Kubernetes and need progressive traffic shifting
- New releases require real-world validation before full rollout
- You want to minimize blast radius of deployment failures

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
