---





contentType: guides
slug: complete-guide-kubernetes-config-management
title: "Kubernetes Config Management Guide"
description: "Master Kubernetes configuration management: ConfigMaps, Secrets, External Secrets Operator, sealed secrets, env injection, volume mounts, and config rotation patterns."
metaDescription: "Master Kubernetes configuration management: ConfigMaps, Secrets, External Secrets Operator, sealed secrets, env injection, volume mounts, and config rotation patterns."
difficulty: advanced
topics:
  - devops
tags:
  - guide
  - kubernetes
  - configmaps
  - secrets
  - external-secrets
  - configuration
  - k8s
relatedResources:
  - /guides/complete-guide-helm-charts-production
  - /guides/complete-guide-github-actions-ci-cd
  - /recipes/kubernetes-configmap-secret-mounting
  - /guides/complete-guide-gitops-argocd
  - /guides/complete-guide-kubernetes-ingress
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Master Kubernetes configuration management: ConfigMaps, Secrets, External Secrets Operator, sealed secrets, env injection, volume mounts, and config rotation patterns."
  keywords:
    - kubernetes config management
    - configmaps
    - kubernetes secrets
    - external secrets operator
    - sealed secrets
    - env injection
    - config rotation





---

## Introduction

Kubernetes separates configuration from container images using ConfigMaps and Secrets. ConfigMaps store non-sensitive configuration as key-value pairs. Secrets store sensitive data like passwords and tokens. External Secrets Operator and Sealed Secrets extend these for GitOps workflows. The following walks through ConfigMaps, Secrets, environment injection, volume mounts, External Secrets Operator, Sealed Secrets, and config rotation patterns.

## ConfigMaps

### Create a ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # Key-value pairs
  LOG_LEVEL: "info"
  DATABASE_HOST: "db.internal"
  DATABASE_PORT: "5432"
  REDIS_URL: "redis://redis:6379"

  # Full file content as a key
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://backend:3000;
      }
    }

  config.json: |
    {
      "feature_flags": {
        "new_ui": true,
        "beta_features": false
      },
      "limits": {
        "max_connections": 100
      }
    }
```

### Create from files

```bash
# Create ConfigMap from a single file
kubectl create configmap nginx-config --from-file=nginx.conf

# Create from multiple files
kubectl create configmap app-config \
    --from-file=config.json \
    --from-file=settings.yaml \
    --from-file=nginx.conf

# Create from a directory
kubectl create configmap app-config --from-file=./config/

# Create from literal values
kubectl create configmap app-config \
    --from-literal=LOG_LEVEL=info \
    --from-literal=DATABASE_HOST=db.internal
```

### Inject ConfigMap as environment variables

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            # Single value from ConfigMap
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: LOG_LEVEL

            - name: DATABASE_HOST
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: DATABASE_HOST

          # All ConfigMap keys as env vars
          envFrom:
            - configMapRef:
                name: app-config
                optional: false  # Pod fails if ConfigMap doesn't exist
```

### Mount ConfigMap as a file

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          volumeMounts:
            - name: config-volume
              mountPath: /etc/config
              readOnly: true

      volumes:
        - name: config-volume
          configMap:
            name: app-config
            # Optional: specify which keys to include
            items:
              - key: config.json
                path: config.json
              - key: nginx.conf
                path: nginx.conf
```

### Mount ConfigMap with subPath (single file)

```yaml
volumes:
  - name: config-volume
    configMap:
      name: app-config

containers:
  - name: app
    volumeMounts:
      - name: config-volume
        mountPath: /app/config.json
        subPath: config.json  # Mounts only this key
        readOnly: true
```

## Secrets

### Create a Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
data:
  # Base64-encoded values
  DATABASE_PASSWORD: cGFzc3dvcmQxMjM=  # echo -n "password123" | base64
  API_KEY: YWJjZGVmZ2hpamtsbW5vcA==
  JWT_SECRET: c3VwZXItc2VjcmV0LWtleQ==
stringData:
  # Plain text values (auto-encoded by Kubernetes)
  DATABASE_URL: "postgresql://user:pass@db:5432/myapp"
  STRIPE_KEY: "sk_live_abc123"
```

### Create from CLI

```bash
# Create from literal values
kubectl create secret generic app-secrets \
    --from-literal=DATABASE_PASSWORD=password123 \
    --from-literal=API_KEY=abcdefg

# Create from file
kubectl create secret generic tls-secret \
    --from-file=tls.crt=cert.pem \
    --from-file=tls.key=key.pem

# Create Docker registry secret
kubectl create secret docker-registry registry-secret \
    --docker-server=registry.io \
    --docker-username=user \
    --docker-password=pass \
    --docker-email=email@example.com
```

### Inject Secret as environment variables

```yaml
containers:
  - name: app
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

    # All Secret keys as env vars
    envFrom:
      - secretRef:
          name: app-secrets
```

### Mount Secret as files

```yaml
volumes:
  - name: secret-volume
    secret:
      secretName: app-secrets
      defaultMode: 0400  # Read-only by owner

containers:
  - name: app
    volumeMounts:
      - name: secret-volume
        mountPath: /etc/secrets
        readOnly: true
```

### TLS Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

```bash
# Create TLS secret from files
kubectl create secret tls tls-secret \
    --cert=cert.pem \
    --key=key.pem
```

## External Secrets Operator

### Install ESO

```bash
# Install via Helm
helm install external-secrets \
    external-secrets/external-secrets \
    --namespace external-secrets \
    --create-namespace
```

### SecretStore (connects to Vault)

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.internal:8200"
      path: "kv"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
```

### ExternalSecret (syncs from Vault to Kubernetes Secret)

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 1h  # Sync every hour
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-secrets  # Name of the Kubernetes Secret to create
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_PASSWORD
      remoteRef:
        key: production/database
        property: password
    - secretKey: API_KEY
      remoteRef:
        key: production/api
        property: key
    - secretKey: JWT_SECRET
      remoteRef:
        key: production/auth
        property: jwt_secret
```

### AWS Secrets Manager SecretStore

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
```

## Sealed Secrets

### Install Sealed Secrets controller

```bash
helm install sealed-secrets \
    sealed-secrets/sealed-secrets \
    --namespace kube-system \
    --create-namespace
```

### Seal a secret

```bash
# Create a regular secret, then seal it
echo -n 'password123' | base64 > secret.yaml
cat > secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
data:
  DATABASE_PASSWORD: cGFzc3dvcmQxMjM=
EOF

# Seal it (safe to commit to Git)
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
```

### SealedSecret resource

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  encryptedData:
    DATABASE_PASSWORD: AgB...encrypted-blob...
  template:
    metadata:
      name: app-secrets
      namespace: production
    type: Opaque
```

## Config Rotation

### Restart pods on ConfigMap change

```yaml
# ConfigMap change doesn't auto-restart pods.
# Use a hash annotation to force restart on config change.

apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    metadata:
      annotations:
        # Hash of ConfigMap content — changes when ConfigMap updates
        checksum/config: "{{ .Values.configHash }}"
    spec:
      containers:
        - name: app
          envFrom:
            - configMapRef:
                name: app-config
```

### Reloader (automatic restart on config change)

```bash
# Install Reloader — auto-restarts pods when ConfigMaps/Secrets change
helm install reloader stakater/reloader \
    --namespace reloader \
    --create-namespace
```

```yaml
# Annotate deployment to trigger restart on ConfigMap/Secret change
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  annotations:
    configmap.reloader.stakater.com/reload: "app-config"
    secret.reloader.stakater.com/reload: "app-secrets"
```

## Best Practices


- For a deeper guide, see [Mount Configs and Secrets into Kubernetes Pods](/recipes/kubernetes-configmap-secret-mounting/).

- Use ConfigMaps for non-sensitive config — environment variables, feature flags, config files
- Use Secrets for sensitive data — passwords, tokens, API keys, certificates
- Never store Secrets in Git as plain text — use External Secrets Operator or Sealed Secrets
- Use `envFrom` for bulk injection — cleaner than listing each variable individually
- Use volume mounts for config files — enables hot reload without pod restart (with Reloader)
- Use External Secrets Operator for production — syncs from Vault, AWS Secrets Manager, GCP Secret Manager
- Use Sealed Secrets for GitOps — encrypted secrets safe to commit to version control
- Set `optional: false` on critical ConfigMaps — pod fails fast if config is missing
- Use `defaultMode: 0400` on Secret volumes — restrict file permissions
- Use Reloader for automatic restarts — pods pick up config changes without manual intervention
- Namespace your config — use separate ConfigMaps per application or service
- Use `immutable: true` for static config — improves performance and prevents accidental changes

## Common Mistakes

- **Storing secrets in ConfigMaps**: ConfigMaps are not encrypted. Use Secrets or External Secrets Operator.
- **Committing base64 secrets to Git**: base64 is encoding, not encryption. Anyone can decode. Use Sealed Secrets or ESO.
- **No config rotation**: updating a ConfigMap doesn't restart pods. Use Reloader or checksum annotations.
- **Mounting entire ConfigMap when you need one file**: use `subPath` to mount a single key as a file.
- **No namespace scoping**: ConfigMaps are namespace-scoped. A ConfigMap in `default` namespace is invisible to `production`.
- **Using `stringData` and `data` for the same key**: `data` takes precedence. Use one or the other per key.

## FAQ

### What is the difference between ConfigMap and Secret?

ConfigMaps store non-sensitive configuration as plain key-value pairs. Secrets store sensitive data with base64 encoding and additional access controls (RBAC, etcd encryption at rest). Use ConfigMaps for app config, Secrets for credentials.

### Are Kubernetes Secrets encrypted?

By default, Secrets are base64-encoded (not encrypted). Enable encryption at rest in etcd with `--encryption-provider-config`. For true secret management, use External Secrets Operator with Vault or cloud secret managers.

### What is External Secrets Operator?

A Kubernetes operator that syncs secrets from external secret managers (Vault, AWS Secrets Manager, GCP Secret Manager) into Kubernetes Secrets. You define an `ExternalSecret` resource that references a `SecretStore`, and ESO creates and updates the Kubernetes Secret automatically.

### What are Sealed Secrets?

A controller that encrypts Kubernetes Secrets into `SealedSecret` resources. The encrypted SealedSecret is safe to store in Git. Only the controller in your cluster can decrypt it. Useful for GitOps workflows where everything lives in version control.

### How do I update pod config without restarting?

ConfigMaps mounted as volumes are updated automatically (within 60-90 seconds by the kubelet). ConfigMaps injected as environment variables require a pod restart. Use Reloader to automate restarts when ConfigMaps or Secrets change.
