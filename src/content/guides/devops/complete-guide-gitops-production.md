---
contentType: guides
slug: complete-guide-gitops-production
title: "Complete Guide to GitOps in Production"
description: "Implement GitOps with ArgoCD and Flux. Covers declarative infrastructure, drift reconciliation, automated rollbacks, progressive delivery, multi-cluster management, secret management with SOPS, and CI/CD pipeline integration with practical YAML examples."
metaDescription: "GitOps con ArgoCD y Flux. Cubre declarative infrastructure, drift reconciliation, automated rollbacks, progressive delivery, multi-cluster, SOPS."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - architecture
tags:
  - gitops
  - devops
  - guide
  - argocd
  - flux
  - progressive-delivery
  - sops
  - multi-cluster
relatedResources:
  - /guides/devops/complete-guide-kubernetes-networking
  - /guides/devops/complete-guide-terraform-production
  - /guides/devops/complete-guide-monitoring-and-alerting
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "GitOps con ArgoCD y Flux. Cubre declarative infrastructure, drift reconciliation, automated rollbacks, progressive delivery, multi-cluster, SOPS."
  keywords:
    - gitops
    - argocd
    - flux
    - declarative infrastructure
    - drift reconciliation
    - automated rollback
    - progressive delivery
    - sops
---

## Introduction

GitOps uses Git as the single source of truth for infrastructure and application deployment. Every change goes through a pull request, gets reviewed, and is automatically applied to the cluster. Here is a hands-on guide to ArgoCD and Flux setup, drift reconciliation, automated rollbacks, progressive delivery, multi-cluster management, and secret management with SOPS.

## GitOps Principles

```text
GitOps Principles:

1. Declarative — System state is described declaratively in Git
2. Versioned — Git stores the complete history of desired state
3. Pulled — Agents pull changes from Git and apply them (not push)
4. Continuously reconciled — Agents continuously compare actual vs desired state

Benefits:
  - Audit trail: Every change is a Git commit with author and timestamp
  - Rollback: Revert to any previous state with git revert
  - Drift detection: Agents detect and fix manual changes
  - Security: No direct cluster access needed for deployments
  - Collaboration: PRs enable code review for infrastructure changes
```

## ArgoCD Setup

### Installation

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Install ArgoCD CLI
brew install argocd  # macOS
# or
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd && mv argocd /usr/local/bin/
```

### Application Manifest

```yaml
# ArgoCD Application for API service
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-service
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io  # Cascade deletion
spec:
  project: production
  
  source:
    repoURL: https://github.com/myorg/k8s-manifests
    targetRevision: main
    path: production/api-service
    
  destination:
    server: https://kubernetes.default.svc
    namespace: production
    
  syncPolicy:
    automated:
      prune: true       # Delete resources removed from Git
      selfHeal: true     # Revert manual changes
      allowEmpty: false  # Prevent deleting all resources
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - ApplyOutOfSyncOnly=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  
  revisionHistoryLimit: 10  # Keep last 10 sync history
```

### AppProject for Multi-Team

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production environment applications
  
  # Allowed source repositories
  sourceRepos:
    - https://github.com/myorg/k8s-manifests
    - https://github.com/myorg/api-config
  
  # Allowed destination namespaces
  destinations:
    - server: https://kubernetes.default.svc
      namespace: production
    - server: https://kubernetes.default.svc
      namespace: production-*
  
  # Allowed cluster resources
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
    - group: rbac.authorization.k8s.io
      kind: RoleBinding
  
  # Denied resources
  clusterResourceBlacklist:
    - group: ''
      kind: Node
    - group: ''
      kind: PersistentVolume
  
  # Roles for team access
  roles:
    - name: platform-team
      description: Platform team access
      policies:
        - p, proj:production:platform-team, applications, get, production/*, allow
        - p, proj:production:platform-team, applications, sync, production/*, allow
      groups:
        - platform-team
```

### ApplicationSet for Multi-Cluster

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: api-all-clusters
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: us-east-1
            url: https://1.2.3.4
          - cluster: eu-west-1
            url: https://5.6.7.8
          - cluster: ap-southeast-1
            url: https://9.10.11.12
  template:
    metadata:
      name: 'api-{{cluster}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/myorg/k8s-manifests
        targetRevision: main
        path: production/api-service
      destination:
        server: '{{url}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Flux Setup

### Installation

```bash
# Install Flux CLI
brew install fluxcd/tap/flux  # macOS

# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal=false

# Check Flux installation
flux check
flux get kustomizations
flux get helmreleases
```

### Flux Kustomization

```yaml
# clusters/production/api-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-service
  namespace: flux-system
spec:
  interval: 1m  # Reconcile every minute
  path: ./production/api-service
  sourceRef:
    kind: GitRepository
    name: k8s-manifests
  prune: true  # Delete resources removed from Git
  wait: true   # Wait for resources to be ready
  timeout: 5m
  targetNamespace: production
  
  # Health checks
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: api
      namespace: production
    - apiVersion: v1
      kind: Service
      name: api-service
      namespace: production
  
  # Post-build variable substitution
  postBuild:
    substitute:
      cluster_name: production
      cluster_region: us-east-1
```

### Flux GitRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: k8s-manifests
  namespace: flux-system
spec:
  interval: 30s
  url: https://github.com/myorg/k8s-manifests
  ref:
    branch: main
  secretRef:
    name: github-deploy-key  # For private repos
```

### Flux HelmRelease

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    architecture: replication
    auth:
      enabled: true
      existingSecret: redis-secret
      existingSecretPasswordKey: redis-password
    replica:
      replicaCount: 3
      persistence:
        enabled: true
        size: 10Gi
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
```

## Secret Management with SOPS

```bash
# Install SOPS and age
brew install sops age

# Generate age key pair
age-keygen -o sops-key.txt
# Public key: age1xxxxx...
# Private key: AGE-SECRET-KEY-1xxxxx...

# Encrypt a secret file
sops --encrypt --age age1xxxxx... --in-place secret.yaml

# Decrypt a secret file
sops --decrypt secret.yaml

# Edit an encrypted file in-place
sops secret.yaml

# Rotate keys
sops updatekeys secret.yaml
```

```yaml
# Encrypted secret (SOPS)
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: production
type: Opaque
stringData:
  DB_PASSWORD: ENC[AES256_GCM,data:abc123,iv:xxx,tag:yyy,type:str]
  API_KEY: ENC[AES256_GCM,data:def456,iv:xxx,tag:yyy,type:str]
sops:
  age:
    - recipient: age1xxxxx...
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-07-04T12:00:00Z"
  mac: ENC[AES256_GCM,data:mac,iv:xxx,tag:yyy,type:str]
```

```yaml
# Flux Kustomization with SOPS decryption
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-secrets
  namespace: flux-system
spec:
  interval: 1m
  path: ./production/secrets
  sourceRef:
    kind: GitRepository
    name: k8s-manifests
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key  # Secret containing the private key
```

## Progressive Delivery

### Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api
  namespace: production
spec:
  replicas: 10
  strategy:
    canary:
      canaryService: api-canary
      stableService: api-stable
      trafficRouting:
        nginx:
          stableIngress: api-stable-ingress
      steps:
        - setWeight: 10
        - pause: { duration: 2m }
        - setWeight: 25
        - pause: { duration: 2m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 75
        - pause: { duration: 5m }
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 2  # Start analysis after 25% canary
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/myorg/api:latest
          ports:
            - containerPort: 8000
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
```

```yaml
# Analysis template for canary
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: production
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99
      failureLimit: 3  # Abort after 3 failures
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{status!~"5.."}[2m]))
            /
            sum(rate(http_requests_total[2m]))
```

### Flux Flagger

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  service:
    port: 80
    targetPort: 8000
    gateways:
      - public-gateway.istio-system.svc.cluster.local
    hosts:
      - api.stackpractices.com
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
        interval: 30s
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://api.production:80/"
```

## Automated Rollback

```yaml
# ArgoCD: Rollback with Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-service
  namespace: argocd
spec:
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
  # To rollback: pin to a previous revision
  # kubectl argocd app rollback api-service <revision>
  
  # Or disable auto-sync and manually sync to old revision
  # kubectl argocd app set api-service --sync-policy none
  # kubectl argocd app sync api-service --revision <old-sha>
```

```bash
# ArgoCD rollback commands
argocd app history api-service
argocd app rollback api-service <version>

# Flux: rollback by reverting the Git commit
git revert <commit-sha>
git push origin main
# Flux will automatically sync to the reverted state
```

## CI/CD Integration

```yaml
# GitHub Actions: Build and update GitOps repo
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and push image
        run: |
          docker build -t ghcr.io/myorg/api:${{ github.sha }} .
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/myorg/api:${{ github.sha }}
      
      - name: Update GitOps repo
        run: |
          git clone https://github.com/myorg/k8s-manifests.git
          cd k8s-manifests
          
          # Update image tag in manifest
          sed -i "s|ghcr.io/myorg/api:.*|ghcr.io/myorg/api:${{ github.sha }}|" production/api-service/deployment.yaml
          
          git config user.name "CI Bot"
          git config user.email "ci@stackpractices.com"
          git add .
          git commit -m "Deploy api:${{ github.sha }}"
          git push
```

## FAQ

### What is the difference between ArgoCD and Flux?

Both implement GitOps for Kubernetes. ArgoCD provides a web UI, supports multi-cluster from a single control plane, and has ApplicationSets for templating. Flux is lighter, uses CRDs for everything, and integrates well with Helm and Kustomize natively. Choose ArgoCD if you need a UI and multi-cluster management. Choose Flux if you prefer CLI-driven workflows and want tighter Helm integration.

### How does drift reconciliation work?

The GitOps agent (ArgoCD or Flux) continuously compares the actual cluster state with the desired state in Git. When a difference is detected (someone manually edited a resource, or a resource was accidentally deleted), the agent applies the Git state to fix the drift. With `selfHeal: true` in ArgoCD or `prune: true` in Flux, manual changes are automatically reverted. Without self-heal, drift is reported but not fixed.

### How do I handle secrets in GitOps?

Never store plaintext secrets in Git. Use SOPS (SOPS + age or AWS KMS) to encrypt secret files, then commit them to Git. The GitOps agent decrypts them using a private key stored in the cluster. Alternatively, use External Secrets Operator to fetch secrets from AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault at runtime. Sealed Secrets is another option — encrypt secrets at client side, store in Git, and decrypt in cluster.

### What is progressive delivery in GitOps?

Progressive delivery gradually rolls out new versions instead of updating all pods at once. Argo Rollouts and Flux Flagger implement canary deployments: route 10% of traffic to the new version, check metrics (error rate, latency), then increase to 25%, 50%, 75%, 100%. If metrics fail, automatically roll back. This reduces blast radius of bad deployments and provides automated quality gates.

### Should I use one Git repo or multiple repos for GitOps?

Use a single GitOps repo for each cluster or environment. This makes it easy to see the complete desired state and apply changes atomically. Store application source code in separate repos. The CI pipeline builds images and pushes to the registry, then updates the GitOps repo with the new image tag. This separation of concerns keeps application code and deployment configuration independent.

### How do I roll back a deployment in GitOps?

In Flux: revert the Git commit that introduced the change. Flux will automatically sync to the reverted state. In ArgoCD: use `argocd app rollback` to pin to a previous revision, or revert the Git commit if auto-sync is enabled. The key insight is that rollback is just another Git operation — no kubectl commands, no direct cluster access. This is one of the main benefits of GitOps.
