---




contentType: recipes
slug: helm-chart-deployment
title: "Deploy Applications to Kubernetes with Helm Charts"
description: "Package, version, and deploy Kubernetes applications using Helm charts with value overrides, template functions, and release management for reproducible infrastructure"
metaDescription: "Deploy applications to Kubernetes with Helm charts. Package, version, and manage releases with value overrides, template functions, and reproducible infrastructure."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - kubernetes
  - devops
  - infrastructure
  - ci-cd
  - automation
relatedResources:
  - /recipes/docker-compose-local-dev
  - /patterns/ambassador-pattern-services
  - /guides/kubernetes-basics-guide
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/cost-optimization
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Deploy applications to Kubernetes with Helm charts. Package, version, and manage releases with value overrides, template functions, and reproducible infrastructure."
  keywords:
    - helm charts
    - kubernetes deployment
    - package management
    - infrastructure as code
    - release management




---

# Deploy Applications to Kubernetes with Helm Charts

Package and deploy applications to Kubernetes using Helm, the package manager for K8s. The following demonstrates how to chart structure, templating with values, release upgrades and rollbacks, and dependency management for production-grade deployments.

## When to Use This

- You deploy the same application to multiple environments with different configurations. See [Environment Variables](/recipes/devops/environment-variables) for per-environment config.
- Kubernetes manifests become repetitive and hard to maintain across teams. See [Docker Compose Local Dev](/recipes/devops/docker-compose-local-dev) for local multi-service templates.
- You need versioned releases with easy rollback capabilities. See [Blue-Green Deployment](/recipes/devops/blue-green-deployment) for instant rollback.

## Solution

### 1. Chart Structure

```
myapp/
  Chart.yaml          # Chart metadata
  values.yaml         # Default configuration values
  values.prod.yaml    # Production overrides
  templates/
    _helpers.tpl      # Named template helpers
    deployment.yaml
    service.yaml
    ingress.yaml
    configmap.yaml
  charts/             # Subchart dependencies
```

### 2. Chart Metadata

```yaml
# Chart.yaml
apiVersion: v2
name: myapp
description: A Helm chart for MyApp
type: application
version: 1.2.0
appVersion: "2.5.1"
dependencies:
  - name: postgresql
    version: 12.x.x
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
```

### 3. Template with Values

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports:
            - containerPort: {{ .Values.service.port }}
          env:
            - name: DATABASE_URL
              value: {{ .Values.database.url | quote }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

### 4. Default and Override Values

```yaml
# values.yaml
replicaCount: 2

image:
  repository: myregistry/myapp
  tag: ""
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: false

database:
  url: "postgres://localhost:5432/myapp"

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

```yaml
# values.prod.yaml
replicaCount: 5

ingress:
  enabled: true
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
```

### 5. Install and Upgrade

```bash
# Install with default values
helm install myapp ./myapp

# Install with production overrides
helm install myapp ./myapp -f values.prod.yaml

# Upgrade existing release
helm upgrade myapp ./myapp -f values.prod.yaml

# Rollback to previous revision
helm rollback myapp 2

# List release history
helm history myapp
```

### 6. Named Template Helpers

```yaml
# templates/_helpers.tpl
{{/* Expand the name of the chart */}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Create a default fully qualified app name */}}
{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}
```

## How It Works

- **Charts** package Kubernetes manifests into versioned, configurable units
- **Templates** use Go templating to inject values into YAML resources
- **Values** files provide environment-specific configuration overrides
- **Releases** track deployed chart versions for easy rollback

## Production Considerations

- Store charts in a registry (Harbor, OCI registry) rather than local files
- Use `helm lint` and `helm template` to validate before deploying
- Pin dependency versions explicitly to prevent unexpected upgrades

## Common Mistakes

- Hardcoding environment values in templates instead of values files
- Forgetting to update `Chart.version` when making changes
- Not testing `helm upgrade` before applying to production

## FAQ

**Q: How is this different from Kustomize?**
A: Helm uses templating and packaging for reusable charts. Kustomize uses overlays and patches without templating. Helm is better for distributing complex applications; Kustomize is simpler for internal overlays.

**Q: Can I use Helm with CI/CD?**
A: Yes. Use `helm upgrade --install` for idempotent deployments in pipelines. Combine with `helm diff` to preview changes before applying.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Helm Subcharts and Dependencies

```yaml
# Chart.yaml
apiVersion: v2
name: my-app
version: 1.2.0
dependencies:
  - name: postgresql
    version: 12.12.x
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
  - name: redis
    version: 17.11.x
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled
```

```yaml
# values.yaml
postgresql:
  enabled: true
  auth:
    postgresPassword: "secretpass"
  primary:
    persistence:
      size: 20Gi

redis:
  enabled: true
  architecture: standalone
  auth:
    password: "redispass"
```

```bash
# Update dependencies
helm dependency update

# Build dependencies into chart
helm dependency build

# Deploy with subcharts
helm upgrade --install my-app ./my-app -f values.yaml
```

### CI/CD Pipeline with Helm

```yaml
# .github/workflows/helm-deploy.yml
name: Helm Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure Helm
        uses: azure/setup-helm@v3

      - name: Login to cluster
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Lint chart
        run: helm lint ./charts/my-app

      - name: Template and diff
        run: |
          helm template my-app ./charts/my-app -f values-prod.yaml > new.yaml
          helm get manifest my-app > current.yaml
          diff current.yaml new.yaml || true

      - name: Deploy
        run: |
          helm upgrade --install my-app ./charts/my-app \
            -f values-prod.yaml \
            --atomic \
            --timeout 5m \
            --wait

      - name: Verify
        run: helm test my-app
```

### Helm Secrets with SOPS

```bash
# Install helm-secrets plugin
helm plugin install https://github.com/jkroepke/helm-secrets

# Encrypt values file
sops --encrypt --in-place secrets.yaml

# Deploy with encrypted secrets
helm secrets upgrade my-app ./my-app -f secrets.yaml

# The plugin decrypts on-the-fly and never writes plaintext to disk
```

```yaml
# secrets.yaml (encrypted with SOPS)
database:
  password: ENC[AES256_GCM,data:abc123==,iv:...]
adminToken: ENC[AES256_GCM,data:def456==,iv:...]
```

### Helm Hooks

```yaml
# templates/hooks/pre-install-hook.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-db-migrate
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command: ["./migrate", "up"]
```

```yaml
# templates/hooks/post-install-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: {{ .Release.Name }}-test
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
    - name: test
      image: curlimages/curl
      command: ["curl", "-f", "http://{{ .Release.Name }}-service/health"]
```

### Rollback Strategy

```bash
# View release history
helm history my-app

# Rollback to previous revision
helm rollback my-app 3

# Rollback with cleanup
helm rollback my-app 3 --cleanup-on-fail

# View values of a specific revision
helm get values my-app --revision 3

# Compare current vs previous
diff <(helm get values my-app --revision 2 -o yaml) \
     <(helm get values my-app --revision 3 -o yaml)
```

## Additional Best Practices

1. **Use `--atomic` in production.** Roll back automatically on failure:

```bash
helm upgrade --install my-app ./my-app \
  --atomic \
  --timeout 5m \
  --wait
```

1. **Template before deploying.** Catch YAML errors early:

```bash
helm template my-app ./my-app -f values.yaml | kubectl apply --dry-run=client -f -
```

1. **Use `helm diff` to preview changes.** See exactly what changes before applying:

```bash
helm plugin install https://github.com/databus23/helm-diff
helm diff upgrade my-app ./my-app -f values.yaml
```

## Additional Common Mistakes

1. **Not using `--wait` flag.** Helm reports success before pods are ready:

```bash
# Without --wait: Helm returns immediately
helm upgrade my-app ./my-app

# With --wait: Helm waits for all resources to be ready
helm upgrade my-app ./my-app --wait --timeout 5m
```

1. **Overriding subchart values incorrectly.** Use the subchart name as prefix:

```yaml
# Wrong
password: "secretpass"

# Right
postgresql:
  auth:
    postgresPassword: "secretpass"
```

1. **Not cleaning up failed releases.** Failed releases consume resources:

```bash
# List all releases including failed
helm list --all

# Uninstall failed release
helm uninstall my-app --keep-history  # Keep history for audit
```

## Additional FAQ

### How do I package and distribute a Helm chart?

```bash
# Package chart
helm package ./my-app --version 1.2.0

# Push to OCI registry
helm push my-app-1.2.0.tgz oci://registry.example.com/charts

# Pull from OCI registry
helm pull oci://registry.example.com/charts/my-app --version 1.2.0
```

### How do I manage multiple environments?

Use separate values files per environment:

```bash
helm upgrade --install my-app ./my-app -f values.yaml -f values-dev.yaml
helm upgrade --install my-app ./my-app -f values.yaml -f values-staging.yaml
helm upgrade --install my-app ./my-app -f values.yaml -f values-prod.yaml
```

### Should I use Helm or Kustomize?

Use Helm when you need: templating, packaging, dependency management, and distribution. Use Kustomize when you need: simple overlays without templating, and your team prefers plain YAML.

## Performance Tips

1. **Use `helm template` for validation.** Faster than full deploy:

```bash
helm template my-app ./my-app -f values.yaml > manifest.yaml
kubectl apply --dry-run=client -f manifest.yaml
```

1. **Cache chart dependencies.** Avoid re-downloading subcharts:

```bash
# Dependencies are cached in charts/ directory
helm dependency build  # Downloads once
helm dependency update  # Only updates changed deps
```

1. **Use `--reuse-values` for minor updates.** Avoid re-specifying all values:

```bash
# Only override specific values, keep the rest
helm upgrade my-app ./my-app --reuse-values --set image.tag=v2.0.1
```

1. **Parallelize tests with `helm test`.** Run multiple test pods:

```yaml
# templates/tests/
# test-1.yaml, test-2.yaml, test-3.yaml
# All run in parallel when you execute: helm test my-app
```
