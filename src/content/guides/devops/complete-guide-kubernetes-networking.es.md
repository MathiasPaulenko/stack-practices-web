---
contentType: guides
slug: complete-guide-kubernetes-networking
title: "Guía Completa de Kubernetes Networking"
description: "Dominar Kubernetes networking. Cubre Services, Ingress, NetworkPolicies, CNI plugins, DNS, service mesh, load balancing, external traffic, mTLS y troubleshooting con ejemplos practicos de YAML manifests y configuracion."
metaDescription: "Dominar K8s networking. Cubre Services, Ingress, NetworkPolicies, CNI plugins, DNS, service mesh, load balancing, mTLS, troubleshooting."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - architecture
tags:
  - kubernetes
  - networking
  - devops
  - guia
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
  metaDescription: "Dominar K8s networking. Cubre Services, Ingress, NetworkPolicies, CNI plugins, DNS, service mesh, load balancing, mTLS, troubleshooting."
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

## Introducción

Kubernetes networking es el backbone de every cluster. Every pod necesita comunicar con other pods, services necesitan ser exposed, y traffic necesita ser controlled. Esta guia cubre Services (ClusterIP, NodePort, LoadBalancer), Ingress, NetworkPolicies, CNI plugins, DNS, service mesh, y troubleshooting.

## Service Types

### ClusterIP

ClusterIP expone el service en una cluster-internal IP. Este es el default type — pods dentro del cluster pueden reach el service, pero external traffic no.

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

NodePort expone el service en each node's IP en un static port (30000-32767). Usar para simple external access o cuando tenes un external load balancer.

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
      nodePort: 30080  # Optional: K8s assigns si omitted
```

### LoadBalancer

LoadBalancer provisions un cloud provider's external load balancer (AWS NLB, GCP Load Balancer, Azure LB). Usar para production external access cuando no usas Ingress.

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

Headless services (clusterIP: None) return pod IPs directamente en vez de un single cluster IP. Usar para StatefulSet service discovery.

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

Ingress maneja external HTTP/HTTPS access a services. Provee name-based virtual hosting, TLS termination, y path-based routing.

```yaml
# Ingress con NGINX ingress controller
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

### Ingress con Cert-Manager (Automatic TLS)

```yaml
# ClusterIssuer para Let's Encrypt
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
# Ingress con automatic certificate
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

NetworkPolicies controlan traffic flow entre pods. Por default, todos los pods pueden comunicar. NetworkPolicies add firewall rules.

### Default Deny All

```yaml
# Default deny all ingress traffic en namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}  # Selects all pods en namespace
  policyTypes:
    - Ingress

---
# Default deny all egress traffic en namespace
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
# Allow API recibir traffic desde Ingress controller only
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
# Allow API conectar a database only
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

### Micro-segmentation con NetworkPolicies

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
  - Policy support: None (needs Calico para policies)

AWS VPC CNI:
  - Native AWS VPC networking, pods get VPC IPs
  - Best for: EKS clusters en AWS
  - Performance: Good (no overlay)
  - Policy support: Via Calico addon
```

## DNS en Kubernetes

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
# Custom DNS configuration para un pod
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
# Enable strict mTLS para entire namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT

---
# Enable mTLS para specific service
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
      mode: PERMISSIVE  # Allow plaintext para metrics endpoint
```

### Istio Traffic Management

```yaml
# Canary deployment con Istio
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

# Check si CNI esta running
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

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre ClusterIP y NodePort?

ClusterIP expone el service en una internal IP reachable solo dentro del cluster. NodePort expone el service en un static port (30000-32767) en every node's IP. Usa ClusterIP para internal communication entre services. Usa NodePort cuando necesitas external access y tenes un external load balancer que routea a node IPs. En production, usa LoadBalancer o Ingress en vez de NodePort directamente.

### ¿Cuándo deberia usar Ingress vs LoadBalancer service?

Usa Ingress cuando tenes multiple HTTP services sharing el mismo IP (name-based virtual hosting, path-based routing, TLS termination). Usa LoadBalancer cuando tenes un single TCP/UDP service que necesita external access, o cuando necesitas non-HTTP protocols. Ingress es mas cost-effective (un load balancer para many services) y provee features como rate limiting, authentication, y URL rewriting.

### ¿Cómo funcionan NetworkPolicies?

NetworkPolicies son firewall rules para pod-to-pod communication. Por default, todos los pods pueden comunicar con todos los other pods (no isolation). Cuando un NetworkPolicy selecciona un pod, se vuelve isolated — solo traffic explicitamente allowed por un policy es permitted. Policies son additive: si multiple policies seleccionan el mismo pod, la union de todo el allowed traffic es permitted. Necesitas un CNI plugin que soporte NetworkPolicies (Calico, Cilium, AWS VPC CNI + Calico).

### ¿Qué CNI plugin deberia elegir?

Elegi Cilium para modern clusters que necesitan eBPF performance, Layer 7 policies, y built-in observability. Elegi Calico para production clusters que necesitan reliable network policies y BGP routing. Elegi Flannel para simple clusters donde no necesitas network policies. En EKS, usa AWS VPC CNI para native VPC networking y add Calico para policies. En GKE, el default CNI es sufficient para most use cases.

### ¿Cómo funciona DNS resolution en Kubernetes?

CoreDNS corre en el kube-system namespace y sirve DNS queries para el cluster. Services get DNS names en el format `<service>.<namespace>.svc.cluster.local`. Pods get DNS names desde headless services en el format `<pod-name>.<service>.<namespace>.svc.cluster.local`. El `ndots` setting (default 5) controla cuando un name es considered fully qualified. Si un name tiene fewer dots que ndots, el cluster search domain es appended antes de querying.

### ¿Debería usar un service mesh?

Usa un service mesh cuando necesitas mTLS entre services, advanced traffic routing (canary, circuit breaking, retry), y deep observability (distributed tracing, traffic metrics). El overhead es complexity y resource usage. Para small clusters con simple networking, Kubernetes native resources (Services, Ingress, NetworkPolicies) son sufficient. Para large microservice architectures con many services, un service mesh como Istio o Linkerd provee significant value.
