---
contentType: guides
slug: complete-guide-gitops-argocd
title: "Complete Guide to GitOps with ArgoCD"
description: "Deploy Kubernetes applications with GitOps using ArgoCD. Covers installation, ApplicationSets, sync strategies, Helm/Kustomize, RBAC, and multi-cluster management."
metaDescription: "Complete guide to GitOps with ArgoCD. Install, configure ApplicationSets, sync strategies, Helm, Kustomize, RBAC, and multi-cluster management for Kubernetes."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - gitops
  - argocd
  - kubernetes
  - continuous-deployment
  - helm
  - kustomize
  - guide
  - devops
relatedResources:
  - /guides/devops/kubernetes-basics-guide
  - /guides/devops/cicd-pipeline-guide
  - /guides/devops/deployment-strategies-guide
  - /guides/devops/complete-guide-kubernetes-ingress
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to GitOps with ArgoCD. Install, configure ApplicationSets, sync strategies, Helm, Kustomize, RBAC, and multi-cluster management for Kubernetes."
  keywords:
    - gitops
    - argocd
    - kubernetes deployment
    - continuous deployment
    - helm argocd
    - kustomize argocd
    - applicationset
    - multi-cluster
---

# Complete Guide to GitOps with ArgoCD

## Introduction

GitOps uses Git as the single source of truth for infrastructure and application deployment. ArgoCD is a Kubernetes-native continuous delivery tool that implements GitOps — it watches a Git repository and syncs the desired state to Kubernetes clusters. The following guide covers installation, application configuration, sync strategies, Helm/Kustomize integration, RBAC, and multi-cluster management.

## GitOps Principles

1. **Declarative**: System state is described declaratively in Git
2. **Versioned**: Git provides versioning, history, and rollback
3. **Pulled**: ArgoCD pulls changes from Git (no push from CI)
4. **Continuously reconciled**: ArgoCD detects drift and corrects it

## Installing ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port-forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

## Basic Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/my-app-deploy
    targetRevision: main
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## ApplicationSet (Multi-Environment)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-multi-env
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            cluster: https://dev-cluster:6443
          - env: staging
            cluster: https://staging-cluster:6443
          - env: prod
            cluster: https://prod-cluster:6443
  template:
    metadata:
      name: "my-app-{{env}}"
    spec:
      project: default
      source:
        repoURL: https://github.com/example/my-app-deploy
        targetRevision: main
        path: "manifests/{{env}}"
      destination:
        server: "{{cluster}}"
        namespace: my-app
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Git Generator (Auto-discover repos)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: auto-discover
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/example/org-deployments
        directories:
          - path: "*/"
  template:
    metadata:
      name: "{{path.basename}}"
    spec:
      project: default
      source:
        repoURL: https://github.com/example/org-deployments
        targetRevision: main
        path: "{{path}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{path.basename}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Helm Integration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-helm
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/my-app-deploy
    targetRevision: main
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        - values-prod.yaml
      parameters:
        - name: image.tag
          value: "v1.2.3"
        - name: replicaCount
          value: "3"
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Kustomize Integration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-kustomize
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/my-app-deploy
    targetRevision: main
    path: overlays/production
    kustomize:
      images:
        - my-app:v1.2.3
      commonLabels:
        env: production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Sync Strategies

### Automated sync

```yaml
syncPolicy:
  automated:
    prune: true       # Delete resources removed from Git
    selfHeal: true    # Revert manual changes
```

### Manual sync with hooks

```yaml
syncPolicy:
  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
# Manual sync via CLI: argocd app sync my-app
```

### Sync waves (ordered deployment)

```yaml
# In your manifests, add annotations:
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Runs first
---
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Runs second
---
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "2"  # Runs third
```

### Pre/Post sync hooks

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migration
          image: my-app/migrate:v1.2.3
          command: ["./migrate", "up"]
      restartPolicy: Never
  backoffLimit: 3
```

## RBAC

```yaml
# argocd-rbac-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    p, role:dev-team, applications, sync, dev/*, allow
    p, role:dev-team, applications, get, dev/*, allow
    p, role:dev-team, applications, action/override, dev/*, deny
    p, role:ops-team, applications, *, */*, allow
    g, dev-team, role:dev-team
    g, ops-team, role:ops-team
```

## Multi-Cluster Management

```bash
# Register a cluster with ArgoCD
argocd cluster add prod-cluster --label environment=production

# List registered clusters
argocd cluster list
```

```yaml
# Deploy to a specific cluster
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-prod
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/example/my-app-deploy
    targetRevision: main
    path: overlays/production
  destination:
    server: https://prod-cluster:6443  # or name: prod-cluster
    namespace: my-app
```

## ArgoCD CLI

```bash
# Login
argocd login localhost:8080 --username admin --password <password>

# Application management
argocd app create my-app \
  --repo https://github.com/example/my-app-deploy \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app

argocd app sync my-app
argocd app get my-app
argocd app history my-app
argocd app rollback my-app <version>
argocd app delete my-app

# Diff between Git and cluster
argocd app diff my-app
```

## Notifications

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-deployed]
  template.app-deployed: |
    message: |
      {{.app.metadata.name}} deployed to {{.app.status.sync.status}}
```

## Best Practices

- **Store manifests separately from app code** — separate deploy repo or directory
- **Use Kustomize overlays** — base + per-environment overlays
- **Enable selfHeal** — revert manual kubectl changes automatically
- **Use sync waves** — ensure CRDs are applied before resources that use them
- **Use AppProject for isolation** — restrict which repos, clusters, and namespaces each team can access
- **Pin ArgoCD version** — do not use `latest` in production
- **Use SSO for ArgoCD** — integrate with GitHub, Google, or OIDC
- **Monitor ArgoCD itself** — it is critical infrastructure
- **Use ApplicationSets for scale** — avoid creating individual Applications for each microservice
- **Enable notifications** — alert on sync failures and drift detection

## Common Mistakes

- Storing manifests in the app repo — coupling deploy frequency to app release frequency
- Not using selfHeal — manual changes persist and cause drift
- Giving all teams admin access — use RBAC with least privilege
- Not using sync waves — CRDs and operators fail if applied out of order
- Not testing sync before merging — use ArgoCD diff or `argocd app sync --dry-run`
- Using automated sync in production without canary — consider manual sync for prod
- Not monitoring drift — enable notifications for out-of-sync status
- Forgetting to prune — old resources persist if `prune: false`

## Frequently Asked Questions

### How is GitOps different from CI/CD?

CI builds and tests code. GitOps handles CD — deployment to environments. In GitOps, the deployment is triggered by Git changes, not by CI pushing to a cluster. CI builds images and updates manifests in Git; ArgoCD picks up the manifest change and deploys.

### Should I use automated sync in production?

It depends. Automated sync with selfHeal is great for dev and staging. For production, consider manual sync with approval gates, or automated sync with progressive delivery (Argo Rollouts) for canary/blue-green deployments.

### How do I handle secrets in GitOps?

Do not store plain secrets in Git. Use Sealed Secrets, SOPS, or External Secrets Operator. These encrypt secrets at rest in Git and decrypt them in the cluster. ArgoCD syncs the encrypted version; the operator handles decryption.
