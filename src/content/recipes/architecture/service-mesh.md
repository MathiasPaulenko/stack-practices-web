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

A service mesh solves these problems by inserting a proxy — a sidecar container — next to every application pod. All traffic entering or leaving the pod flows through the sidecar. The sidecar handles mutual TLS, traffic routing, retries, timeouts, metrics, and access policies. The application code remains completely unaware. This recipe covers service mesh concepts, Istio deployment, traffic policies, and observability.

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
- **Mutual TLS (mTLS)**: the sidecar presents a certificate to prove its identity and validates the peer's certificate. Traffic is encrypted in transit and authenticated at both ends. Even within the same cluster, services cannot impersonate each other without stealing a certificate.
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

## Best practices

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
A: Expect 1-5ms latency per hop and 10-20% CPU overhead for the sidecar. Linkerd is optimized for minimal overhead. Istio offers more features at higher cost. For latency-sensitive paths, benchmark before deploying.

**Q: Can I use a service mesh without Kubernetes?**
A: Istio and Linkerd are Kubernetes-native. Consul Connect supports VMs. For non-K8s environments, use application-level mTLS (e.g., AWS App Mesh with ECS) or language-specific libraries.

**Q: How do I debug a 503 in the mesh?**
A: Check three things: (1) is the destination pod healthy? (2) is the sidecar proxy healthy? (`istio-proxy` container logs). (3) is there an authorization policy or destination rule blocking traffic? Use `istioctl proxy-config` to inspect Envoy configuration.

