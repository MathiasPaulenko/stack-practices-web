---
contentType: guides
slug: complete-guide-gitops-production
title: "Referencia Detallada de GitOps en Producción"
description: "Implementar GitOps con ArgoCD y Flux. Cubre declarative infrastructure, drift reconciliation, automated rollbacks, progressive delivery, multi-cluster management, secret management con SOPS y CI/CD pipeline integration con ejemplos practicos de YAML."
metaDescription: "GitOps con ArgoCD y Flux. Cubre declarative infrastructure, drift reconciliation, automated rollbacks, progressive delivery, multi-cluster, SOPS."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - architecture
tags:
  - gitops
  - devops
  - guia
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

## Introducción

GitOps usa Git como el single source of truth para infrastructure y application deployment. Every change va a traves de un pull request, gets reviewed, y es automaticamente applied al cluster. Lo siguiente es una guia practica para ArgoCD y Flux setup, drift reconciliation, automated rollbacks, progressive delivery, multi-cluster management, y secret management con SOPS.

## GitOps Principles

```text
GitOps Principles:

1. Declarative — System state es described declaratively en Git
2. Versioned — Git storea el complete history del desired state
3. Pulled — Agents pull changes desde Git y los apply (no push)
4. Continuously reconciled — Agents continuamente comparan actual vs desired state

Benefits:
  - Audit trail: Every change es un Git commit con author y timestamp
  - Rollback: Revert a cualquier previous state con git revert
  - Drift detection: Agents detectan y fixean manual changes
  - Security: No direct cluster access needed para deployments
  - Collaboration: PRs enable code review para infrastructure changes
```

## ArgoCD Setup

### Installation

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward para access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Install ArgoCD CLI
brew install argocd  # macOS
# or
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd && mv argocd /usr/local/bin/
```

### Application Manifest

```yaml
# ArgoCD Application para API service
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
      prune: true       # Delete resources removed desde Git
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

### AppProject para Multi-Team

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
  
  # Roles para team access
  roles:
    - name: platform-team
      description: Platform team access
      policies:
        - p, proj:production:platform-team, applications, get, production/*, allow
        - p, proj:production:platform-team, applications, sync, production/*, allow
      groups:
        - platform-team
```

### ApplicationSet para Multi-Cluster

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

# Bootstrap Flux con GitHub
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
  prune: true  # Delete resources removed desde Git
  wait: true   # Wait para resources ser ready
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
    name: github-deploy-key  # Para private repos
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

## Secret Management con SOPS

```bash
# Install SOPS y age
brew install sops age

# Generate age key pair
age-keygen -o sops-key.txt
# Public key: age1xxxxx...
# Private key: AGE-SECRET-KEY-1xxxxx...

# Encrypt un secret file
sops --encrypt --age age1xxxxx... --in-place secret.yaml

# Decrypt un secret file
sops --decrypt secret.yaml

# Edit un encrypted file in-place
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
# Flux Kustomization con SOPS decryption
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
      name: sops-age-key  # Secret containing el private key
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
        startingStep: 2  # Start analysis despues de 25% canary
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
# Analysis template para canary
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
      failureLimit: 3  # Abort despues de 3 failures
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
# ArgoCD: Rollback con Application
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
  # Para rollback: pin a un previous revision
  # kubectl argocd app rollback api-service <revision>
  
  # O disable auto-sync y manually sync a old revision
  # kubectl argocd app set api-service --sync-policy none
  # kubectl argocd app sync api-service --revision <old-sha>
```

```bash
# ArgoCD rollback commands
argocd app history api-service
argocd app rollback api-service <version>

# Flux: rollback reverting el Git commit
git revert <commit-sha>
git push origin main
# Flux va a automatically sync al reverted state
```

## CI/CD Integration

```yaml
# GitHub Actions: Build y update GitOps repo
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
          
          # Update image tag en manifest
          sed -i "s|ghcr.io/myorg/api:.*|ghcr.io/myorg/api:${{ github.sha }}|" production/api-service/deployment.yaml
          
          git config user.name "CI Bot"
          git config user.email "ci@stackpractices.com"
          git add .
          git commit -m "Deploy api:${{ github.sha }}"
          git push
```

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre ArgoCD y Flux?

Ambos implementan GitOps para Kubernetes. ArgoCD provee un web UI, soporta multi-cluster desde un single control plane, y tiene ApplicationSets para templating. Flux es lighter, usa CRDs para everything, y integra well con Helm y Kustomize nativamente. Elegi ArgoCD si necesitas un UI y multi-cluster management. Elegi Flux si preferis CLI-driven workflows y queres tighter Helm integration.

### ¿Cómo funciona drift reconciliation?

El GitOps agent (ArgoCD o Flux) continuamente compara el actual cluster state con el desired state en Git. Cuando una difference es detected (alguno manually edited un resource, o un resource fue accidentally deleted), el agent apply el Git state para fix el drift. Con `selfHeal: true` en ArgoCD o `prune: true` en Flux, manual changes son automaticamente reverted. Sin self-heal, drift es reported pero no fixed.

### ¿Cómo manejo secrets en GitOps?

Nunca stores plaintext secrets en Git. Usa SOPS (SOPS + age o AWS KMS) para encrypt secret files, luego commitealos a Git. El GitOps agent los decrypt usando un private key stored en el cluster. Alternativamente, usa External Secrets Operator para fetch secrets desde AWS Secrets Manager, HashiCorp Vault, o Azure Key Vault at runtime. Sealed Secrets es otra option — encrypt secrets at client side, storea en Git, y decrypt en cluster.

### ¿Qué es progressive delivery en GitOps?

Progressive delivery gradually roll out new versions en vez de updating all pods at once. Argo Rollouts y Flux Flagger implementan canary deployments: route 10% del traffic al new version, checkea metrics (error rate, latency), luego increase a 25%, 50%, 75%, 100%. Si metrics fail, automaticamente roll back. Esto reduce blast radius de bad deployments y provee automated quality gates.

### ¿Debería usar un Git repo o multiple repos para GitOps?

Usa un single GitOps repo para cada cluster o environment. Esto hace easy ver el complete desired state y apply changes atomicamente. Storea application source code en separate repos. El CI pipeline build images y pushea al registry, luego update el GitOps repo con el new image tag. Esta separation of concerns keep application code y deployment configuration independent.

### ¿Cómo hago rollback de un deployment en GitOps?

En Flux: revert el Git commit que introduced el change. Flux va a automatically sync al reverted state. En ArgoCD: usa `argocd app rollback` para pin a un previous revision, o revert el Git commit si auto-sync esta enabled. El key insight es que rollback es just another Git operation — no kubectl commands, no direct cluster access. Esto es uno de los main benefits de GitOps.
