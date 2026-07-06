---
contentType: guides
slug: complete-guide-kubernetes-ingress
title: "Complete Guide to Kubernetes Ingress"
description: "Configure and troubleshoot Kubernetes Ingress controllers. Covers NGINX Ingress, TLS, path routing, annotations, IngressClass, and common pitfalls."
metaDescription: "Complete guide to Kubernetes Ingress. Configure NGINX Ingress controller, TLS termination, path-based routing, annotations, IngressClass and troubleshooting."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - kubernetes
  - ingress
  - nginx
  - networking
  - guide
  - tls
  - routing
  - load-balancing
relatedResources:
  - /guides/devops/kubernetes-basics-guide
  - /guides/devops/kubernetes-advanced-guide
  - /guides/devops/deployment-strategies-guide
  - /patterns/architecture/gateway-routing-pattern
  - /patterns/design/sidecar-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to Kubernetes Ingress. Configure NGINX Ingress controller, TLS termination, path-based routing, annotations, IngressClass and troubleshooting."
  keywords:
    - kubernetes ingress
    - nginx ingress controller
    - kubernetes tls
    - ingress routing
    - ingressclass
    - kubernetes networking
    - path-based routing k8s
---

# Complete Guide to Kubernetes Ingress

## Introduction

Kubernetes Ingress exposes HTTP and HTTPS routes from outside the cluster to services within the cluster. It provides name-based virtual hosting, path-based routing, TLS termination, and other Layer 7 features that a plain Service (Layer 4) cannot. Below is a practical guide to installing an Ingress controller, configuring routing rules, enabling TLS, using annotations, and troubleshooting common issues.

## What Is Ingress?

Ingress is a Kubernetes resource type that manages external access to cluster services. It is not a controller itself — it defines rules, and an Ingress controller implements them.

- **Ingress Resource**: A set of routing rules (host, path, backend service).
- **Ingress Controller**: A daemon that watches Ingress resources and configures a proxy (NGINX, Traefik, HAProxy, Envoy) to enforce the rules.
- **IngressClass**: A cluster-scoped resource that links Ingress resources to a specific controller.

Without an Ingress controller, Ingress resources have no effect.

## Installing an Ingress Controller

### NGINX Ingress Controller (most common)

```bash
# Install with Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

### Verify the IngressClass

```bash
# Check the IngressClass created by the controller
kubectl get ingressclass

# Output:
# NAME    CONTROLLER                     PARAMETERS   AGE
# nginx   k8s.io/ingress-nginx           <none>       2m
```

## Basic Ingress Resource

### Single service routing

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    ingressClassName: nginx
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

### Path-based routing (multiple services)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-service-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /web
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: default-service
                port:
                  number: 80
```

### Name-based virtual hosting

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vhost-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
    - host: blog.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: blog-service
                port:
                  number: 80
```

## TLS Termination

### Install cert-manager for automatic TLS

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

### ClusterIssuer for Let's Encrypt

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

### Ingress with TLS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls-secret
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

### TLS passthrough (no termination)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: passthrough-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: secure.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: secure-service
                port:
                  number: 443
```

## Common Annotations

### Rewrite target

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

### CORS

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://frontend.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization"
```

### Rate limiting

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-burst: "20"
```

### Basic authentication

```bash
# Create htpasswd secret
htpasswd -c auth admin
kubectl create secret generic basic-auth --from-file=auth -n my-namespace
```

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
```

### Custom timeouts

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
```

### WebSocket support

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```

### Session affinity (sticky sessions)

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"
    nginx.ingress.kubernetes.io/session-cookie-hash: "sha1"
```

## Advanced Configurations

### Default backend (custom 404)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: default-backend-ingress
spec:
  ingressClassName: nginx
  defaultBackend:
    service:
      name: custom-404-service
      port:
        number: 80
```

### Canary deployments

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary-ingress
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: canary-service
                port:
                  number: 80
```

### Multiple Ingress resources for the same host

Multiple Ingress resources matching the same host are merged by the controller. Use this to split routing rules across teams or namespaces.

## Troubleshooting

### Check Ingress status

```bash
# List all Ingress resources
kubectl get ingress -A

# Describe a specific Ingress
kubectl describe ingress my-app-ingress -n my-namespace

# Check Ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check if the Ingress controller is running
kubectl get pods -n ingress-nginx
```

### Common issues

**404 Not Found**:
- The backend service does not exist or has no ready pods
- The path does not match any rule
- The IngressClass is not set or does not match

**502 Bad Gateway**:
- The backend service port is wrong
- The backend pods are crashing
- The backend is not listening on the expected port

**503 Service Unavailable**:
- No healthy pods in the backend service
- The service selector does not match any pods

**TLS certificate not working**:
- cert-manager is not installed or the ClusterIssuer is not ready
- The TLS secret is not in the same namespace as the Ingress
- The domain does not point to the Ingress controller's external IP

### Verify DNS resolution

```bash
# Get the Ingress controller external IP
kubectl get svc -n ingress-nginx

# Check DNS
dig app.example.com
nslookup app.example.com

# Test locally with curl
curl -H "Host: app.example.com" http://<ingress-controller-ip>
```

### Debug with kubectl

```bash
# Check Ingress events
kubectl get events -n my-namespace --field-selector reason=Sync

# Check cert-manager certificates
kubectl get certificate -A
kubectl describe certificate app-tls-secret -n my-namespace

# Check IngressClass
kubectl get ingressclass
kubectl describe ingressclass nginx
```

## Ingress vs Gateway API

Kubernetes Gateway API is the successor to Ingress. It provides more expressive routing (header-based, weight-based) and better multi-tenant support.

| Feature | Ingress | Gateway API |
|---------|---------|-------------|
| Layer | L7 only | L4 and L7 |
| Routing | Host + path | Host, path, header, weight |
| TLS | Per-Ingress | Per-listener |
| Multi-tenant | Limited | Native (Route namespaces) |
| Status | Stable | GA (since K8s 1.25) |

## Best Practices

- **Always set ingressClassName** — without it, the Ingress may not be picked up by any controller
- **Use cert-manager for TLS** — manual certificate management does not scale
- **Set resource limits on the controller** — the Ingress controller is critical infrastructure
- **Monitor the controller** — track 4xx/5xx rates, latency, active connections
- **Use pathType: Prefix** for most cases — `ImplementationSpecific` is controller-dependent
- **Namespace your Ingress resources** — keep them in the same namespace as the backend services
- **Use annotations sparingly** — they are controller-specific and reduce portability
- **Test with curl -H "Host:"** — verify routing before pointing DNS
- **Keep the controller updated** — security patches and bug fixes
- **Run multiple replicas** — a single Ingress controller is a single point of failure

## Frequently Asked Questions

### Do I need an Ingress controller?

Yes. Ingress resources are just rules. Without a controller watching and implementing them, they have no effect. Install NGINX Ingress Controller, Traefik, or another controller.

### Can I use Ingress for TCP/UDP?

Not with the standard Ingress resource. Ingress is HTTP/HTTPS only. For TCP/UDP, use a LoadBalancer Service or the controller's TCP/UDP passthrough configuration (NGINX supports this via ConfigMap).

### How do I route to a service in another namespace?

You cannot directly. Ingress resources must reference services in the same namespace. Use a Service of type ExternalName or a re-export Service in the Ingress namespace.

### What is the difference between Ingress and LoadBalancer?

A LoadBalancer Service gives you a single cloud load balancer pointing at a single service. Ingress gives you one entry point with routing rules to many services — name-based virtual hosting, path-based routing, and TLS termination.
