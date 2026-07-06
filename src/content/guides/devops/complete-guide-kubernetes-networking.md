---
contentType: guides
slug: complete-guide-kubernetes-networking
title: "Complete Guide to Kubernetes Networking"
description: "Master Kubernetes networking. Covers Services, Ingress, NetworkPolicies, CNI plugins, DNS, service mesh, load balancing, external traffic, mTLS, and troubleshooting with practical YAML manifests and configuration examples."
metaDescription: "Master K8s networking. Covers Services, Ingress, NetworkPolicies, CNI plugins, DNS, service mesh, load balancing, mTLS, troubleshooting."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - architecture
tags:
  - kubernetes
  - networking
  - devops
  - guide
  - services
  - ingress
  - network-policies
  - cni
  - service-mesh
relatedResources:
  - /guides/devops/complete-guide-docker-production
  - /guides/devops/complete-guide-monitoring-and-alerting
  - /guides/security/complete-guide-authentication-patterns
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Master K8s networking. Covers Services, Ingress, NetworkPolicies, CNI plugins, DNS, service mesh, load balancing, mTLS, troubleshooting."
  keywords:
    - kubernetes networking
    - k8s services
    - ingress controller
    - network policies
    - cni plugins
    - service mesh
    - kubernetes dns
    - mtls
---

## Introduction

Kubernetes networking is the backbone of every cluster. Every pod needs to communicate with other pods, services need to be exposed, and traffic needs to be controlled. The following guide covers Services (ClusterIP, NodePort, LoadBalancer), Ingress, NetworkPolicies, CNI plugins, DNS, service mesh, and troubleshooting.

## Service Types

### ClusterIP

ClusterIP exposes the service on a cluster-internal IP. This is the default type — pods within the cluster can reach the service, but external traffic cannot.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
  labels:
    app: api
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - name: http
      port: 80
      targetPort: 8000
      protocol: TCP
    - name: metrics
      port: 9090
      targetPort: 9090
      protocol: TCP
```

### NodePort

NodePort exposes the service on each node's IP at a static port (30000-32767). Use for simple external access or when you have an external load balancer.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-nodeport
spec:
  type: NodePort
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8000
      nodePort: 30080  # Optional: K8s assigns if omitted
```

### LoadBalancer

LoadBalancer provisions a cloud provider's external load balancer (AWS NLB, GCP Load Balancer, Azure LB). Use for production external access when not using Ingress.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-lb
  annotations:
    # AWS-specific annotations
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-internal: "false"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: arn:aws:acm:us-east-1:123:certificate/abc
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
    - name: http
      port: 80
      targetPort: 8000
    - name: https
      port: 443
      targetPort: 8000
```

### Headless Service

Headless services (clusterIP: None) return pod IPs directly instead of a single cluster IP. Use for StatefulSet service discovery.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database-headless
spec:
  clusterIP: None  # Headless
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

## Ingress

Ingress manages external HTTP/HTTPS access to services. It provides name-based virtual hosting, TLS termination, and path-based routing.

```yaml
# Ingress with NGINX ingress controller
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-Frame-Options: DENY";
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.stackpractices.com
        - www.stackpractices.com
      secretName: tls-secret
  rules:
    - host: api.stackpractices.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1-service
                port:
                  number: 80
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2-service
                port:
                  number: 80
    - host: www.stackpractices.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

### Ingress with Cert-Manager (Automatic TLS)

```yaml
# ClusterIssuer for Let's Encrypt
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@stackpractices.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx

---
# Ingress with automatic certificate
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress-tls
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.stackpractices.com
      secretName: api-tls-cert  # cert-manager creates this
  rules:
    - host: api.stackpractices.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

## NetworkPolicies

NetworkPolicies control traffic flow between pods. By default, all pods can communicate. NetworkPolicies add firewall rules.

### Default Deny All

```yaml
# Default deny all ingress traffic in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}  # Selects all pods in namespace
  policyTypes:
    - Ingress

---
# Default deny all egress traffic in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

### Allow Specific Traffic

```yaml
# Allow API to receive traffic from Ingress controller only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow-ingress-controller
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8000

---
# Allow API to connect to database only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow-db-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    # Allow DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

### Micro-segmentation with NetworkPolicies

```yaml
# Full micro-segmentation policy set
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - protocol: TCP
          port: 8000
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
```

## CNI Plugins

```text
CNI Plugin Comparison:

Calico:
  - BGP routing, network policies, eBPF dataplane
  - Best for: Production, network policies, large clusters
  - Performance: Excellent (eBPF mode)
  - Policy support: Full Kubernetes NetworkPolicy + Calico CRDs

Cilium:
  - eBPF-based, no kube-proxy, mTLS, observability
  - Best for: Modern clusters, service mesh, observability
  - Performance: Best (kernel-level eBPF)
  - Policy support: Full + Layer 7 (HTTP, Kafka, gRPC)

Flannel:
  - Simple overlay network, no network policies
  - Best for: Simple clusters, learning
  - Performance: Good
  - Policy support: None (needs Calico for policies)

AWS VPC CNI:
  - Native AWS VPC networking, pods get VPC IPs
  - Best for: EKS clusters on AWS
  - Performance: Good (no overlay)
  - Policy support: Via Calico addon
```

## DNS in Kubernetes

```text
Kubernetes DNS Resolution:

Service DNS names:
  - <service>.<namespace>.svc.cluster.local
  - <service>.<namespace>          (within cluster)
  - <service>                       (same namespace)

Pod DNS names (headless services):
  - <pod-ip>.<namespace>.pod.cluster.local
  - <pod-name>.<service>.<namespace>.svc.cluster.local (StatefulSet)

Examples:
  api-service.production.svc.cluster.local    # Service
  postgres-0.database.production.svc.cluster.local  # StatefulSet pod
  10-0-1-5.default.pod.cluster.local         # Individual pod

DNS troubleshooting:
  kubectl exec -it <pod> -- nslookup <service>
  kubectl exec -it <pod> -- dig <service>.<namespace>.svc.cluster.local
  kubectl get pods -n kube-system -l k8s-app=kube-dns
```

```yaml
# Custom DNS configuration for a pod
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns-pod
spec:
  dnsPolicy: None
  dnsConfig:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
    searches:
      - stackpractices.com
      - production.svc.cluster.local
    options:
      - name: ndots
        value: "5"
  containers:
    - name: app
      image: myapp:latest
```

## Service Mesh

### Istio mTLS

```yaml
# Enable strict mTLS for entire namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT

---
# Enable mTLS for specific service
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: api-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE  # Allow plaintext for metrics endpoint
```

### Istio Traffic Management

```yaml
# Canary deployment with Istio
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-virtualservice
  namespace: production
spec:
  hosts:
    - api.stackpractices.com
  gateways:
    - istio-system/ingress-gateway
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: api-service
            subset: v2
            port:
              number: 80
    - route:
        - destination:
            host: api-service
            subset: v1
            port:
              number: 80
          weight: 90
        - destination:
            host: api-service
            subset: v2
            port:
              number: 80
          weight: 10

---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-destination
  namespace: production
spec:
  host: api-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## Troubleshooting

```bash
# Debug DNS issues
kubectl exec -it <pod> -- nslookup kubernetes.default
kubectl exec -it <pod> -- nslookup api-service.production
kubectl get svc -n kube-system kube-dns
kubectl logs -n kube-system <dns-pod> --tail=50

# Debug Service connectivity
kubectl get endpoints api-service -n production
kubectl describe svc api-service -n production
kubectl exec -it <pod> -- curl -v http://api-service.production:80

# Debug NetworkPolicy
kubectl get networkpolicy -n production
kubectl describe networkpolicy <policy-name> -n production

# Check if CNI is running
kubectl get pods -n kube-system | grep -E "calico|cilium|flannel"
kubectl logs -n kube-system <cni-pod>

# Debug Ingress
kubectl get ingress -n production
kubectl describe ingress <ingress-name> -n production
kubectl logs -n ingress-nginx <controller-pod>

# Trace packet path
kubectl exec -it <pod> -- traceroute api-service.production
kubectl exec -it <pod> -- tcpdump -i any port 80 -nn

# Check conntrack table
kubectl exec -it <node-pod> -- cat /proc/net/nf_conntrack | wc -l
```

## FAQ

### What is the difference between ClusterIP and NodePort?

ClusterIP exposes the service on an internal IP reachable only within the cluster. NodePort exposes the service on a static port (30000-32767) on every node's IP. Use ClusterIP for internal communication between services. Use NodePort when you need external access and have an external load balancer that routes to node IPs. In production, use LoadBalancer or Ingress instead of NodePort directly.

### When should I use Ingress vs LoadBalancer service?

Use Ingress when you have multiple HTTP services sharing the same IP (name-based virtual hosting, path-based routing, TLS termination). Use LoadBalancer when you have a single TCP/UDP service that needs external access, or when you need non-HTTP protocols. Ingress is more cost-effective (one load balancer for many services) and provides features like rate limiting, authentication, and URL rewriting.

### How do NetworkPolicies work?

NetworkPolicies are firewall rules for pod-to-pod communication. By default, all pods can communicate with all other pods (no isolation). When a NetworkPolicy selects a pod, it becomes isolated — only traffic explicitly allowed by a policy is permitted. Policies are additive: if multiple policies select the same pod, the union of all allowed traffic is permitted. You need a CNI plugin that supports NetworkPolicies (Calico, Cilium, AWS VPC CNI + Calico).

### What CNI plugin should I choose?

Choose Cilium for modern clusters that need eBPF performance, Layer 7 policies, and built-in observability. Choose Calico for production clusters that need reliable network policies and BGP routing. Choose Flannel for simple clusters where you do not need network policies. On EKS, use AWS VPC CNI for native VPC networking and add Calico for policies. On GKE, the default CNI is sufficient for most use cases.

### How does DNS resolution work in Kubernetes?

CoreDNS runs in the kube-system namespace and serves DNS queries for the cluster. Services get DNS names in the format `<service>.<namespace>.svc.cluster.local`. Pods get DNS names from headless services in the format `<pod-name>.<service>.<namespace>.svc.cluster.local`. The `ndots` setting (default 5) controls when a name is considered fully qualified. If a name has fewer dots than ndots, the cluster search domain is appended before querying.

### Should I use a service mesh?

Use a service mesh when you need mTLS between services, advanced traffic routing (canary, circuit breaking, retry), and deep observability (distributed tracing, traffic metrics). The overhead is complexity and resource usage. For small clusters with simple networking, Kubernetes native resources (Services, Ingress, NetworkPolicies) are sufficient. For large microservice architectures with many services, a service mesh like Istio or Linkerd provides significant value.
