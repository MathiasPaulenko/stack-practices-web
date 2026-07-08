---
contentType: recipes
slug: service-mesh
title: "Secure and Observe Microservices with a Service Mesh"
description: "How to deploy Istio or Linkerd to add mTLS, traffic management, observability, and policy enforcement to microservices without changing application code."
metaDescription: "Learn service mesh for microservices. Deploy Istio or Linkerd to add mTLS, traffic management, observability, and policy enforcement without code changes."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - istio
  - kubernetes
  - design
  - patterns
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/api-gateway
  - /recipes/load-balancing
  - /recipes/secret-management
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn service mesh for microservices. Deploy Istio or Linkerd to add mTLS, traffic management, observability, and policy enforcement without code changes."
  keywords:
    - service mesh
    - istio microservices
    - linkerd
    - mtls encryption
    - traffic management k8s
---

## Overview

Microservices communicate over the network, and the network is untrusted. Every inter-service call crosses pod boundaries, node boundaries, and potentially cluster boundaries. Without encryption, attackers with network access can read or modify traffic. Without identity, any compromised service can impersonate another. Without observability, debugging a request that traverses 10 services is nearly impossible.

A service mesh solves these problems by inserting a proxy — a sidecar container — next to every application pod. All traffic entering or leaving the pod flows through the sidecar. The sidecar handles mutual TLS, traffic routing, retries, timeouts, metrics, and access policies. The application code remains completely unaware. Here is how to service mesh concepts, Istio deployment, traffic policies, and observability.

## When to use it

Use this recipe when:

- Running 10+ microservices in Kubernetes with complex inter-service communication. See [Microservices Patterns](/guides/architecture/microservices-architecture-guide) for resilience strategies.
- Requiring encryption for all service-to-service traffic without modifying applications
- Implementing [canary deployments](/recipes/architecture/load-balancing), A/B testing, or traffic mirroring between service versions
- Needing unified observability (metrics, logs, traces) across all microservices
- Enforcing access policies (e.g., "payment service can only talk to billing and fraud detection")

## Solution

### Istio Installation (istioctl)

```bash
# Install Istio with default profile
istioctl install --set profile=default -y

# Enable automatic sidecar injection in a namespace
kubectl label namespace default istio-injection=enabled

# Restart deployments to pick up sidecars
kubectl rollout restart deployment -n default
```

### Traffic Routing with VirtualService

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service-route
spec:
  hosts:
    - user-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: user-service
            subset: v2
          weight: 100
    - route:
        - destination:
            host: user-service
            subset: v1
          weight: 90
        - destination:
            host: user-service
            subset: v2
          weight: 10

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service-dr
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutiveErrors: 5
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

### mTLS with PeerAuthentication

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT

---
# Allow only specific services to access payment-service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/order-service"
              - "cluster.local/ns/default/sa/billing-service"
```

## Explanation

- **Sidecar proxy**: Envoy runs as a sidecar in every pod. It intercepts all network traffic via iptables rules. Applications still talk to `localhost:8080`, but Envoy routes, encrypts, and logs the actual request. The application code requires zero changes.
- **Mutual TLS (mTLS)**: the sidecar provides a certificate to prove its identity and validates the peer's certificate. Traffic is encrypted in transit and authenticated at both ends. Even within the same cluster, services cannot impersonate each other without stealing a certificate.
- **Traffic management**: VirtualService defines routing rules — canary deployments, retries, timeouts, fault injection. DestinationRule configures load balancing, connection pools, and outlier detection (circuit breaker). Traffic policies are declarative and versioned in Git.
- **Observability**: Envoy generates metrics (request count, latency, errors), access logs, and distributed traces. Istio aggregates these in Kiali (topology), Grafana (metrics), and Jaeger (traces). You see the entire service graph without adding instrumentation to applications.

## Variants

| Feature | Istio | Linkerd | Consul Connect | Cilium Service Mesh |
|---------|-------|---------|----------------|---------------------|
| Complexity | High | Low | Medium | Medium |
| Performance | Good | Excellent | Good | Excellent (eBPF) |
| mTLS | Yes | Yes | Yes | Yes |
| Traffic routing | Full | Basic | Basic | Basic |
| Resource usage | Higher | Lower | Medium | Low |

## What Works

- **Start with permissive mTLS, then enforce strict**: begin with `PERMISSIVE` mode to ensure all sidecars are injected and working. After validating traffic flows, switch to `STRICT` to reject unencrypted connections. Sudden strict mode can break services that lack sidecars.
- **Define service accounts per workload**: Kubernetes service accounts map to Istio identities. Use distinct service accounts for each deployment, not the `default` account. This enables fine-grained authorization policies.
- **Configure retry budgets, not just retries**: naive retries can amplify failures. Use Istio's retry budgets (e.g., retry only if the error ratio is below 10%) or configure maximum retry attempts with exponential backoff. Unlimited retries create retry storms.
- **Use [circuit breakers](/recipes/circuit-breaker-pattern-recipe) on every outbound call**: configure `outlierDetection` in DestinationRules. If a downstream service returns 5xx on 50% of requests over a 30-second window, eject it for 30 seconds. This prevents cascading failures.
- **Monitor sidecar resource usage**: Envoy consumes CPU and memory. Set resource requests/limits on the sidecar. In high-throughput services, the sidecar can become the bottleneck before the application. Profile and tune proxy concurrency.

## Common mistakes

- **Forgetting sidecar injection**: a pod without the sidecar bypasses the mesh entirely. Its traffic is unencrypted, unobserved, and unrestricted. Always verify injection with `kubectl get pod -o yaml | grep istio-proxy`.
- **Overly permissive authorization policies**: a default `ALLOW *` policy defeats the purpose. Start with explicit `DENY all`, then add `ALLOW` rules for legitimate paths. Zero-trust means denying by default.
- **Ignoring startup ordering**: during rolling updates, old pods without sidecars may talk to new pods with strict mTLS. Use Helm or Argo Rollouts to manage upgrade waves, or maintain `PERMISSIVE` during the transition window.
- **No egress control**: by default, mesh-internal traffic is controlled but egress (external APIs, databases) is not. Configure `ServiceEntry` resources to explicitly allow external destinations, preventing data exfiltration.

## FAQ

**Q: Does a service mesh replace an [API gateway](/recipes/architecture/api-gateway)?**
A: No. The gateway handles north-south (external to cluster). The mesh handles east-west (service-to-service). Use both. Some meshes include an ingress gateway, but it complements, not replaces, your primary API gateway.

**Q: What is the performance overhead of a service mesh?**
A: Expect 1-5ms latency per hop and 10-20% CPU overhead for the sidecar. Linkerd is optimized for minimal overhead. Istio offers more capabilities at higher cost. For latency-sensitive paths, benchmark before deploying.

**Q: Can I use a service mesh without Kubernetes?**
A: Istio and Linkerd are Kubernetes-native. Consul Connect supports VMs. For non-K8s environments, use application-level mTLS (e.g., AWS App Mesh with ECS) or language-specific libraries.

**Q: How do I debug a 503 in the mesh?**
A: Check three things: (1) is the destination pod healthy? (2) is the sidecar proxy healthy? (`istio-proxy` container logs). (3) is there an authorization policy or destination rule blocking traffic? Use `istioctl proxy-config` to inspect Envoy configuration.


### Linkerd Installation (CLI)

```bash
# Install Linkerd control plane
linkerd install --crd-only | kubectl apply -f -
linkerd install | kubectl apply -f -

# Verify installation
linkerd check

# Add mesh to a namespace
kubectl annotate namespace default linkerd.io/inject=enabled

# Restart deployments
kubectl rollout restart deployment -n default
```

### Traffic Mirroring for Shadow Testing

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-mirror
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
            subset: v1
          weight: 100
      mirror:
        host: payment-service
        subset: v2
      mirrorPercentage:
        value: 100.0
```

### Fault Injection for Resilience Testing

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-fault-injection
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-test-fault:
              exact: "true"
      fault:
        delay:
          percentage:
            value: 50
          fixedDelay: 5s
        abort:
          percentage:
            value: 10
          httpStatus: 503
      route:
        - destination:
            host: order-service
            subset: v1
```

### Observability with Kiali and Prometheus

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-metrics
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: mesh
  endpoints:
    - port: http-monitoring
      interval: 15s
      path: /stats/prometheus
---
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-observability
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 10.0
  metrics:
    - providers:
        - name: prometheus
```

### Egress Gateway for External API Control

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.stripe.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: egress-stripe
spec:
  hosts:
    - api.stripe.com
  http:
    - route:
        - destination:
            host: api.stripe.com
            port:
              number: 443
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure
```

## Additional Best Practices

1. **Use canary deployments with weighted routing.** Gradually shift traffic to the new version based on error rates and latency metrics:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: canary-deployment
spec:
  hosts:
    - user-service
  http:
    - route:
        - destination:
            host: user-service
            subset: stable
          weight: 95
        - destination:
            host: user-service
            subset: canary
          weight: 5
      retries:
        attempts: 2
        retryOn: 5xx
        perTryTimeout: 2s
```

2. **Set resource limits on sidecars.** Envoy proxies consume CPU and memory. Without limits, they can starve the application container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-server
  annotations:
    sidecar.istio.io/proxyCPU: "500m"
    sidecar.istio.io/proxyMemory: "256Mi"
    sidecar.istio.io/proxyCPULimit: "1000m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"
spec:
  containers:
    - name: api-server
      image: myapp:latest
      resources:
        requests:
          cpu: 250m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi
```

3. **Use locality-aware load balancing.** Route traffic to the closest available instance to reduce latency:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: locality-lb
spec:
  host: user-service
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: us-east-1a/*
            to:
              us-east-1a/*: 80
              us-east-1b/*: 20
    outlierDetection:
      consecutiveErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Additional Common Mistakes

1. **Sidecar resource starvation.** The Envoy proxy competes with the application container for CPU and memory. In high-throughput scenarios, the sidecar can consume 50%+ of pod resources. Always set explicit resource requests and limits on the sidecar:

```yaml
# Without limits, Envoy can OOM-kill the application
annotations:
  sidecar.istio.io/proxyCPU: "1000m"
  sidecar.istio.io/proxyMemory: "512Mi"
```

2. **Breaking mTLS during migrations.** When upgrading from permissive to strict mTLS, services without sidecars get rejected. Use a migration window with permissive mode, verify all pods have sidecars, then enforce strict:

```bash
# Check which pods lack sidecars
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{" "}{.spec.containers[*].name}{"\n"}{end}' | grep -v istio-proxy

# Only switch to strict when no pods are missing sidecars
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT
EOF
```

3. **No egress traffic monitoring.** By default, services can call any external endpoint. Without egress control, a compromised service can exfiltrate data. Use ServiceEntry and egress gateways to restrict and monitor outbound traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: allow-database
spec:
  hosts:
    - db.internal.stackpractices.com
  ports:
    - number: 5432
      name: tcp
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

## Additional FAQ

### How do I test service mesh configuration?

Use `istioctl analyze` to validate configuration before applying. It catches common errors like missing DestinationRules, conflicting VirtualServices, and invalid references. For traffic testing, use fault injection to simulate failures and verify retry/timeout behavior. For mTLS, use `istioctl authn tls-check` to verify encryption status between services. For authorization policies, test with `istioctl authz check` to see which policies apply to a pod.

### Is this solution production-ready?

Yes. Istio is used in production by Google Cloud, IBM, and Airbnb. Linkerd is used in production by Buoyant, Nordstrom, and Hepsiburada. Consul Connect is used by HashiCorp customers in hybrid K8s/VM environments. Cilium Service Mesh is used by Google GKE and AWS EKS customers with eBPF. The traffic mirroring pattern is used by Netflix for shadow traffic testing. Fault injection is standard practice in chaos engineering with service meshes.

### What are the performance characteristics?

Istio adds 1-5ms latency per hop and 10-20% CPU overhead for the Envoy sidecar. Linkerd adds 0.5-2ms latency and 5-10% CPU overhead due to its Rust-based proxy. Cilium Service Mesh with eBPF adds near-zero latency for L3/L4 traffic. Memory overhead is 50-100MB per sidecar. Control plane overhead is 500MB-1GB for Istio, 200-400MB for Linkerd. Locality-aware load balancing adds no overhead — it uses Kubernetes topology labels. Traffic mirroring doubles the load on the mirrored service. Fault injection adds configurable delay with no baseline overhead.

### How do I debug issues with this approach?

Use `istioctl proxy-config <pod>` to inspect the Envoy configuration applied to a pod. Use `istioctl proxy-status` to see if all proxies are in sync with the control plane. For 503 errors, check `istioctl proxy-config cluster <pod>` to verify upstream clusters. For mTLS issues, use `istioctl authn tls-check <source-pod> <destination-service>`. For authorization denials, check `istioctl authz check <pod>`. Use Kiali for a visual topology view of the mesh. Use Jaeger to trace requests through the mesh and identify which hop failed.
