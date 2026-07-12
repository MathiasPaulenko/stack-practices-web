---



contentType: recipes
slug: kubernetes-configmap-secret-mounting
title: "Mount Configs and Secrets into Kubernetes Pods"
description: "How to mount ConfigMaps and Secrets into Kubernetes pods using env vars, volumes, projected volumes, and secret management with external secrets."
metaDescription: "Mount ConfigMaps and Secrets into Kubernetes pods. Use env vars, volumes, projected volumes, and external secret management for secure configuration."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - kubernetes
  - configmap
  - secrets
  - configuration
  - security
  - recipe
relatedResources:
  - /recipes/kubernetes-helm-chart-templating
  - /recipes/docker-compose-override-environments
  - /recipes/terraform-remote-state-s3-backend
  - /recipes/setup-ssl-certificates
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mount ConfigMaps and Secrets into Kubernetes pods. Use env vars, volumes, projected volumes, and external secret management for secure configuration."
  keywords:
    - devops
    - kubernetes
    - configmap
    - secrets
    - configuration
    - security
    - recipe



---

## Overview

Kubernetes ConfigMaps store non-sensitive configuration data. Secrets store sensitive data like passwords, tokens, and certificates. Both can be mounted into pods as environment variables or files. This approach handles the patterns for injecting configuration and secrets into your applications running in Kubernetes — from basic env vars to projected volumes and external secret operators.

## When to Use

- Injecting configuration into containerized applications
- Managing database connection strings, API keys, and certificates
- When different environments (dev, staging, prod) need different configs
- When you need to update config without rebuilding the image
- When secrets must be mounted as files (e.g., TLS certificates)

## When NOT to Use

- For non-sensitive config that rarely changes — bake it into the image
- When you need complex config templating — use an init container or Helm
- For secrets in git — use SealedSecrets or External Secrets Operator instead

## Solution

### Create a ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  LOG_LEVEL: "info"
  DATABASE_HOST: "db.internal"
  APP_PORT: "8080"
  config.yaml: |
    server:
      port: 8080
      timeout: 30s
    database:
      pool_size: 10
      timeout: 5s
```

### Create a Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: default
type: Opaque
stringData:
  DATABASE_PASSWORD: "supersecret"
  API_KEY: "abc123-def456"
  JWT_SECRET: "my-jwt-secret-key"
```

### Mount ConfigMap as environment variables

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          envFrom:
            - configMapRef:
                name: app-config
          env:
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DATABASE_PASSWORD
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: API_KEY
```

### Mount ConfigMap as a volume

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          volumeMounts:
            - name: config-volume
              mountPath: /etc/app/config
              readOnly: true
      volumes:
        - name: config-volume
          configMap:
            name: app-config
            items:
              - key: config.yaml
                path: config.yaml
```

### Mount Secret as a volume

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          volumeMounts:
            - name: secrets-volume
              mountPath: /etc/app/secrets
              readOnly: true
      volumes:
        - name: secrets-volume
          secret:
            secretName: app-secrets
            defaultMode: 0400  # Read-only for owner
```

### Mount TLS certificate as a volume

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          volumeMounts:
            - name: tls
              mountPath: /etc/tls
              readOnly: true
      volumes:
        - name: tls
          secret:
            secretName: tls-secret
```

### Projected volume (combine ConfigMap + Secret)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          volumeMounts:
            - name: combined-config
              mountPath: /etc/app
              readOnly: true
      volumes:
        - name: combined-config
          projected:
            sources:
              - configMap:
                  name: app-config
              - secret:
                  name: app-secrets
```

### Selective env vars from ConfigMap

```yaml
spec:
  containers:
    - name: app
      image: my-app:latest
      env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_LEVEL
        - name: APP_PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: APP_PORT
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_PASSWORD
```

### Subpath for single file mounting

```yaml
spec:
  containers:
    - name: app
      image: my-app:latest
      volumeMounts:
        - name: config-volume
          mountPath: /app/config.yaml
          subPath: config.yaml
          readOnly: true
  volumes:
    - name: config-volume
      configMap:
        name: app-config
```

### Immutable ConfigMaps and Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
immutable: true
data:
  LOG_LEVEL: "info"
  APP_PORT: "8080"
```

### External Secrets Operator

```yaml
# ExternalSecret — syncs secrets from AWS Secrets Manager / Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_PASSWORD
      remoteRef:
        key: my-app/database
        property: password
    - secretKey: API_KEY
      remoteRef:
        key: my-app/api
        property: key
```

### Sealed Secrets for gitOps

```yaml
# SealedSecret — encrypted secret safe to store in git
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-secrets
spec:
  encryptedData:
    DATABASE_PASSWORD: AgB...
    API_KEY: AgC...
  template:
    metadata:
      name: app-secrets
    type: Opaque
```

### Init container with config rendering

```yaml
spec:
  initContainers:
    - name: config-renderer
      image: my-config-renderer:latest
      env:
        - name: APP_ENV
          value: "production"
      volumeMounts:
        - name: config-template
          mountPath: /templates
        - name: rendered-config
          mountPath: /output
      command:
        - sh
        - -c
        - |
          envsubst < /templates/config.yaml.tpl > /output/config.yaml
  containers:
    - name: app
      image: my-app:latest
      volumeMounts:
        - name: rendered-config
          mountPath: /etc/app/config
          readOnly: true
  volumes:
    - name: config-template
      configMap:
        name: app-config-template
    - name: rendered-config
      emptyDir: {}
```

## Variants

### Using envFrom with prefix

```yaml
spec:
  containers:
    - name: app
      image: my-app:latest
      envFrom:
        - configMapRef:
            name: app-config
          prefix: APP_
        - secretRef:
            name: app-secrets
          prefix: SECRET_
```

### Hot-reloading ConfigMap in a volume

```yaml
# ConfigMaps mounted as volumes are auto-updated (typically within 60s)
# Use a file watcher in your app to pick up changes
spec:
  containers:
    - name: app
      image: my-app:latest
      volumeMounts:
        - name: config
          mountPath: /etc/app/config
          readOnly: true
      # App should watch for file changes
      # e.g., fsnotify in Go, chokidar in Node.js
  volumes:
    - name: config
      configMap:
        name: app-config
```

### Docker config secret for image pulls

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      imagePullSecrets:
        - name: registry-credentials
      containers:
        - name: app
          image: private-registry.io/my-app:latest
```

## Best Practices


- For a deeper guide, see [Kubernetes Config Management Guide](/guides/complete-guide-kubernetes-config-management/).

- Use ConfigMaps for non-sensitive data, Secrets for sensitive data — never the reverse
- Set `readOnly: true` on volume mounts — prevents apps from modifying config at runtime
- Use `immutable: true` for stable configs — improves performance and prevents accidental changes
- Use `defaultMode: 0400` for secret volumes — restricts file permissions
- Use External Secrets Operator for production — keeps secrets out of etcd and git
- Use SealedSecrets for GitOps — encrypts secrets at rest in git
- Don't store secrets in ConfigMaps — they're not encrypted at rest in etcd
- Use `envFrom` for bulk loading — cleaner than individual `env` entries

## Common Mistakes

- **Storing secrets in ConfigMaps**: ConfigMaps are not encrypted. Use Secrets (which are base64-encoded, still not truly encrypted — use ESO or SealedSecrets for real encryption).
- **Not setting `readOnly: true`**: apps can modify mounted config files, causing inconsistent behavior across pod restarts.
- **Mounting entire ConfigMap when you need one file**: use `subPath` to mount a single file without overwriting the directory.
- **Forgetting that Secrets are base64, not encrypted**: anyone with `kubectl get secret` can decode them. Use RBAC to restrict access.
- **Not using `immutable: true`**: mutable ConfigMaps cause pod restarts on update. Immutable ones are safer and faster.

## FAQ

### What is the difference between ConfigMap and Secret?

ConfigMaps store non-sensitive data as plaintext. Secrets store sensitive data as base64-encoded strings. Secrets have additional RBAC controls and can be encrypted at rest in etcd.

### Are Kubernetes Secrets encrypted?

By default, Secrets are base64-encoded (not encrypted). Enable encryption at rest in etcd with `--encryption-provider-config`. For true encryption, use External Secrets Operator with AWS KMS or HashiCorp Vault.

### How do I update a ConfigMap without restarting pods?

ConfigMaps mounted as volumes are auto-updated (within ~60s). ConfigMaps loaded as env vars require a pod restart. Use a file watcher in your app for hot-reloading volume-mounted configs.

### What is a projected volume?

A volume that combines multiple sources (ConfigMaps, Secrets, downward API) into a single directory. Useful for mounting config and secrets together without multiple volume mounts.

### How do I create a Secret from a file?

```bash
kubectl create secret generic app-secrets \
  --from-file=ssl.crt=certs/tls.crt \
  --from-file=ssl.key=certs/tls.key \
  --from-literal=api-key=abc123
```
