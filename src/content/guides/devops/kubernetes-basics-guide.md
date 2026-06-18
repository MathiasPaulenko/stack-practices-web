---
contentType: guides
slug: kubernetes-basics-guide
title: "Kubernetes Basics for Application Developers"
description: "Learn the core Kubernetes concepts every developer needs: Pods, Services, Deployments, ConfigMaps, and basic kubectl commands."
metaDescription: "Kubernetes basics for developers: Pods, Deployments, Services, ConfigMaps, and kubectl. Practical guide for running containerized apps on K8s."
difficulty: beginner
topics:
  - devops
  - architecture
tags:
  - architecture
  - containers
  - devops
  - guide
  - kubernetes
relatedResources:
  - /guides/devops/docker-for-developers-guide
  - /guides/devops/cicd-pipeline-guide
  - /guides/architecture/software-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Kubernetes basics for developers: Pods, Deployments, Services, ConfigMaps, and kubectl. Practical guide for running containerized apps on K8s."
  keywords:
    - kubernetes basics
    - kubectl tutorial
    - kubernetes pods
    - kubernetes deployments
    - kubernetes services
    - k8s for developers
---

# Kubernetes Basics for Application Developers

## Introduction

Kubernetes (K8s) is an open-source container orchestration platform. It automates deployment, scaling, and management of containerized applications. As a developer, you need to understand the core abstractions to deploy and debug your applications effectively.

## Key Concepts

### Pod

A Pod is the smallest deployable unit in Kubernetes. It wraps one or more containers that share network and storage.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app: myapp
spec:
  containers:
    - name: myapp
      image: myapp:1.0
      ports:
        - containerPort: 3000
      env:
        - name: NODE_ENV
          value: production
```

### Deployment

A Deployment manages a set of identical Pods, ensuring the desired number of replicas are running and enabling rolling updates.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:1.0
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

### Service

A Service exposes a set of Pods as a network service, providing load balancing and stable DNS names.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

| Service Type | Description | Use Case |
|-------------|-------------|----------|
| **ClusterIP** | Internal cluster IP only | Internal communication |
| **NodePort** | Exposes on each node's IP at a static port | Direct external access |
| **LoadBalancer** | Exposes externally using cloud provider's LB | Production ingress |
| **ExternalName** | Maps to external DNS name | External dependencies |

## Essential kubectl Commands

```bash
# Apply a manifest
kubectl apply -f deployment.yaml

# Get resources
kubectl get pods
kubectl get deployments
kubectl get services

# Describe a resource (detailed info + events)
kubectl describe pod myapp-xxx

# Execute a command in a pod
kubectl exec -it myapp-xxx -- sh

# View logs
kubectl logs -f myapp-xxx
kubectl logs -f deployment/myapp --tail=100

# Port-forward for local access
kubectl port-forward svc/myapp-service 8080:80

# Scale a deployment
kubectl scale deployment myapp --replicas=5

# Rollout status and history
kubectl rollout status deployment/myapp
kubectl rollout history deployment/myapp
kubectl rollout undo deployment/myapp
```

## ConfigMaps and Secrets

### ConfigMap

Store non-sensitive configuration data:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  LOG_LEVEL: "info"
  API_TIMEOUT: "30"
```

```yaml
# Use in a Pod
envFrom:
  - configMapRef:
      name: myapp-config
```

### Secret

Store sensitive data (base64 encoded):

```bash
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=secret123
```

```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password
```

## Health Checks

Kubernetes uses probes to determine container health:

| Probe | Purpose | Action on Failure |
|-------|---------|-------------------|
| **Liveness** | Is the app running? | Restart container |
| **Readiness** | Is the app ready to accept traffic? | Remove from Service endpoints |
| **Startup** | Has the app finished starting? | Disable other probes temporarily |

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Namespaces

Namespaces provide logical separation within a cluster:

```bash
# Create a namespace
kubectl create namespace dev

# Set default namespace for context
kubectl config set-context --current --namespace=dev

# List resources in a namespace
kubectl get pods -n dev
```

Common namespace strategies:
- `default` — small projects
- `dev`, `staging`, `prod` — per-environment
- Per-team or per-project isolation

## Best Practices

- **Set resource requests and limits** on every container to prevent noisy neighbors
- **Use readiness probes** to prevent traffic from reaching unready Pods
- **Use liveness probes** to recover from deadlocks and hangs
- **Never run as root** — set `securityContext.runAsNonRoot: true`
- **Pin image tags** — avoid `:latest` in production
- **Use ConfigMaps for configuration**, Secrets for credentials
- **Set graceful termination** — handle SIGTERM in your app (`terminationGracePeriodSeconds`)

## Common Mistakes

- Not setting resource requests/limits, causing cluster instability
- Using `latest` image tags, leading to unpredictable deployments
- Missing readiness probes, causing 502 errors during rollouts
- Storing secrets in ConfigMaps instead of Secrets
- Not handling SIGTERM, causing abrupt shutdowns and data loss
- Deploying everything to the `default` namespace without isolation

## Frequently Asked Questions

**Q: What is the difference between a Pod and a Deployment?**
A: A Pod is a single instance. A Deployment is a controller that manages multiple Pod replicas, handles rolling updates, and self-heals if Pods fail.

**Q: How do I access my application running in Kubernetes locally?**
A: Use `kubectl port-forward` to forward a local port to a Pod or Service. For shared access, use a Service of type LoadBalancer or Ingress.

**Q: What happens during a rolling update?**
A: Kubernetes creates new Pods with the updated image, waits for readiness probes to pass, then gradually scales down old Pods. If the update fails, you can `kubectl rollout undo`.
