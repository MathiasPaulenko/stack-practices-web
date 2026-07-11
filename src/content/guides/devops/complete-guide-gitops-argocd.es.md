---
contentType: guides
slug: complete-guide-gitops-argocd
title: "Guía Completa de GitOps con ArgoCD"
description: "Despliega aplicaciones Kubernetes con GitOps usando ArgoCD. Cubre instalación, ApplicationSets, estrategias de sync, Helm/Kustomize, RBAC y multi-cluster."
metaDescription: "Guía completa de GitOps con ArgoCD. Instala, configura ApplicationSets, estrategias de sync, Helm, Kustomize, RBAC y multi-cluster para Kubernetes."
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
  metaDescription: "Guía completa de GitOps con ArgoCD. Instala, configura ApplicationSets, estrategias de sync, Helm, Kustomize, RBAC y multi-cluster para Kubernetes."
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

# Guía Completa de GitOps con ArgoCD

## Introducción

GitOps usa Git como única fuente de verdad para infraestructura y deployment de aplicaciones. ArgoCD es una herramienta de continuous delivery Kubernetes-native que implementa GitOps — watchea un repo Git y sincroniza el estado deseado a clusters de Kubernetes. A continuación: instalación, configuración de aplicaciones, estrategias de sync, integración Helm/Kustomize, RBAC y multi-cluster management.

## Principios de GitOps

1. **Declarativo**: El estado del sistema se describe declarativamente en Git
2. **Versionado**: Git provee versioning, history y rollback
3. **Pulled**: ArgoCD pulla cambios desde Git (no push desde CI)
4. **Reconciliación continua**: ArgoCD detecta drift y lo corrige

## Instalar ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Obtener password de admin
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port-forward para acceder UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

## Aplicación Básica

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

## ApplicationSet (Multi-Entorno)

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

## Git Generator (Auto-descubrir repos)

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

## Integración Helm

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

## Integración Kustomize

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

## Estrategias de Sync

### Sync automatizado

```yaml
syncPolicy:
  automated:
    prune: true       # Eliminar recursos removidos de Git
    selfHeal: true    # Revertir cambios manuales
```

### Sync manual con hooks

```yaml
syncPolicy:
  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
# Sync manual vía CLI: argocd app sync my-app
```

### Sync waves (deployment ordenado)

```yaml
# En tus manifests, añadir annotations:
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Corre primero
---
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Corre segundo
---
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "2"  # Corre tercero
```

### Hooks Pre/Post sync

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
# Registrar un cluster con ArgoCD
argocd cluster add prod-cluster --label environment=production

# Listar clusters registrados
argocd cluster list
```

```yaml
# Deployar a un cluster específico
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
    server: https://prod-cluster:6443  # o name: prod-cluster
    namespace: my-app
```

## CLI de ArgoCD

```bash
# Login
argocd login localhost:8080 --username admin --password <password>

# Gestión de aplicaciones
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

# Diff entre Git y cluster
argocd app diff my-app
```

## Notificaciones

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

## Pautas

- **Guardar manifests separados del código de app** — repo o directorio de deploy separado
- **Usar overlays de Kustomize** — base + overlays por entorno
- **Habilitar selfHeal** — revertir cambios manuales de kubectl automáticamente
- **Usar sync waves** — asegurar que CRDs se apliquen antes que recursos que los usan
- **Usar AppProject para aislamiento** — restringir qué repos, clusters y namespaces puede acceder cada equipo
- **Pinear versión de ArgoCD** — no usar `latest` en producción
- **Usar SSO para ArgoCD** — integrar con GitHub, Google u OIDC
- **Monitorear ArgoCD mismo** — es infraestructura crítica
- **Usar ApplicationSets para escalar** — evitar crear Applications individuales para cada microservicio
- **Habilitar notificaciones** — alertar en sync failures y drift detection

## Errores Comunes

- Guardar manifests en el repo de app — acoplar frecuencia de deploy a frecuencia de release
- No usar selfHeal — cambios manuales persisten y causan drift
- Dar acceso admin a todos los equipos — usar RBAC con least privilege
- No usar sync waves — CRDs y operators fallan si se aplican fuera de orden
- No testear sync antes de mergear — usar ArgoCD diff o `argocd app sync --dry-run`
- Usar sync automatizado en producción sin canary — considerar sync manual para prod
- No monitorear drift — habilitar notificaciones para estado out-of-sync
- Olvidar prune — recursos viejos persisten si `prune: false`

## Preguntas Frecuentes

### ¿En qué se diferencia GitOps de CI/CD?

CI builda y testea código. GitOps maneja CD — deployment a entornos. En GitOps, el deployment se triggera por cambios en Git, no por CI pusheando a un cluster. CI builda imágenes y actualiza manifests en Git; ArgoCD picka el cambio de manifest y deploya.

### ¿Debo usar sync automatizado en producción?

Depende. Sync automatizado con selfHeal es bueno para dev y staging. Para producción, considerar sync manual con approval gates, o sync automatizado con progressive delivery (Argo Rollouts) para deployments canary/blue-green.

### ¿Cómo manejo secrets en GitOps?

No guardar secrets en plain en Git. Usar Sealed Secrets, SOPS o External Secrets Operator. Estos encriptan secrets at rest en Git y los desencriptan en el cluster. ArgoCD syncea la versión encriptada; el operator maneja la desencriptación.
