---
contentType: guides
slug: complete-guide-kubernetes-config-management
title: "Guía de Kubernetes Config Management"
description: "Dominá Kubernetes config management: ConfigMaps, Secrets, External Secrets Operator, sealed secrets, env injection, volume mounts y patrones de config rotation."
metaDescription: "Dominá Kubernetes config management: ConfigMaps, Secrets, External Secrets Operator, sealed secrets, env injection, volume mounts y patrones de config rotation."
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
  - /guides/devops/complete-guide-helm-charts-production
  - /guides/devops/complete-guide-github-actions-ci-cd
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Dominá Kubernetes config management: ConfigMaps, Secrets, External Secrets Operator, sealed secrets, env injection, volume mounts y patrones de config rotation."
  keywords:
    - kubernetes config management
    - configmaps
    - kubernetes secrets
    - external secrets operator
    - sealed secrets
    - env injection
    - config rotation
---

## Introducción

Kubernetes separa configuration de container images usando ConfigMaps y Secrets. ConfigMaps storean non-sensitive configuration como key-value pairs. Secrets storean sensitive data como passwords y tokens. External Secrets Operator y Sealed Secrets extienden estos para GitOps workflows. A continuación: ConfigMaps, Secrets, environment injection, volume mounts, External Secrets Operator, Sealed Secrets y config rotation patterns.

## ConfigMaps

### Creá un ConfigMap

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

  # Full file content como un key
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

### Creá from files

```bash
# Creá ConfigMap desde un single file
kubectl create configmap nginx-config --from-file=nginx.conf

# Creá from multiple files
kubectl create configmap app-config \
    --from-file=config.json \
    --from-file=settings.yaml \
    --from-file=nginx.conf

# Creá from a directory
kubectl create configmap app-config --from-file=./config/

# Creá from literal values
kubectl create configmap app-config \
    --from-literal=LOG_LEVEL=info \
    --from-literal=DATABASE_HOST=db.internal
```

### Inyectá ConfigMap como environment variables

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

          # All ConfigMap keys como env vars
          envFrom:
            - configMapRef:
                name: app-config
                optional: false  # Pod fails si ConfigMap no existe
```

### Mounteá ConfigMap como un file

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
            # Optional: specificá cuáles keys incluir
            items:
              - key: config.json
                path: config.json
              - key: nginx.conf
                path: nginx.conf
```

### Mounteá ConfigMap con subPath (single file)

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
        subPath: config.json  # Mountea solo este key
        readOnly: true
```

## Secrets

### Creá un Secret

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

### Creá from CLI

```bash
# Creá from literal values
kubectl create secret generic app-secrets \
    --from-literal=DATABASE_PASSWORD=password123 \
    --from-literal=API_KEY=abcdefg

# Creá from file
kubectl create secret generic tls-secret \
    --from-file=tls.crt=cert.pem \
    --from-file=tls.key=key.pem

# Creá Docker registry secret
kubectl create secret docker-registry registry-secret \
    --docker-server=registry.io \
    --docker-username=user \
    --docker-password=pass \
    --docker-email=email@example.com
```

### Inyectá Secret como environment variables

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

    # All Secret keys como env vars
    envFrom:
      - secretRef:
          name: app-secrets
```

### Mounteá Secret como files

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
# Creá TLS secret from files
kubectl create secret tls tls-secret \
    --cert=cert.pem \
    --key=key.pem
```

## External Secrets Operator

### Installéa ESO

```bash
# Installéa via Helm
helm install external-secrets \
    external-secrets/external-secrets \
    --namespace external-secrets \
    --create-namespace
```

### SecretStore (connectea a Vault)

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

### ExternalSecret (syncea from Vault a Kubernetes Secret)

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
    name: app-secrets  # Name del Kubernetes Secret a crear
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

### Installéa Sealed Secrets controller

```bash
helm install sealed-secrets \
    sealed-secrets/sealed-secrets \
    --namespace kube-system \
    --create-namespace
```

### Sealéa un secret

```bash
# Creá un regular secret, luego sealealo
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

# Sealealo (safe para commitear a Git)
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

### Restarteá pods en ConfigMap change

```yaml
# ConfigMap change no auto-restartea pods.
# Usá un hash annotation para force restart en config change.

apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    metadata:
      annotations:
        # Hash del ConfigMap content — cambia cuando ConfigMap updates
        checksum/config: "{{ .Values.configHash }}"
    spec:
      containers:
        - name: app
          envFrom:
            - configMapRef:
                name: app-config
```

### Reloader (automatic restart en config change)

```bash
# Installéa Reloader — auto-restartea pods cuando ConfigMaps/Secrets cambian
helm install reloader stakater/reloader \
    --namespace reloader \
    --create-namespace
```

```yaml
# Annotateá deployment para trigger restart en ConfigMap/Secret change
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  annotations:
    configmap.reloader.stakater.com/reload: "app-config"
    secret.reloader.stakater.com/reload: "app-secrets"
```

## Best Practices

- Usá ConfigMaps para non-sensitive config — environment variables, feature flags, config files
- Usá Secrets para sensitive data — passwords, tokens, API keys, certificates
- Nunca storees Secrets en Git como plain text — usá External Secrets Operator o Sealed Secrets
- Usá `envFrom` para bulk injection — cleaner que listing each variable individually
- Usá volume mounts para config files — habilita hot reload sin pod restart (con Reloader)
- Usá External Secrets Operator para production — syncea desde Vault, AWS Secrets Manager, GCP Secret Manager
- Usá Sealed Secrets para GitOps — encrypted secrets safe para commitear a version control
- Seteá `optional: false` en critical ConfigMaps — pod fails fast si config está missing
- Usá `defaultMode: 0400` en Secret volumes — restrictí file permissions
- Usá Reloader para automatic restarts — pods pickéan up config changes sin manual intervention
- Namespaceá tu config — usá separate ConfigMaps per application o service
- Usá `immutable: true` para static config — improvea performance y prevente accidental changes

## Common Mistakes

- **Storear secrets en ConfigMaps**: ConfigMaps no son encrypted. Usá Secrets o External Secrets Operator.
- **Commitear base64 secrets a Git**: base64 es encoding, no encryption. Anyone puede decode. Usá Sealed Secrets o ESO.
- **No config rotation**: updatear un ConfigMap no restartea pods. Usá Reloader o checksum annotations.
- **Mountear entire ConfigMap cuando necesitás un file**: usá `subPath` para mountear un single key como un file.
- **No namespace scoping**: ConfigMaps son namespace-scoped. Un ConfigMap en `default` namespace es invisible a `production`.
- **Usar `stringData` y `data` para el mismo key**: `data` takes precedence. Usá one or the other per key.

## FAQ

### ¿Cuál es la diferencia entre ConfigMap y Secret?

ConfigMaps storean non-sensitive configuration como plain key-value pairs. Secrets storean sensitive data con base64 encoding y additional access controls (RBAC, etcd encryption at rest). Usá ConfigMaps para app config, Secrets para credentials.

### ¿Están encrypted los Kubernetes Secrets?

By default, Secrets son base64-encoded (no encrypted). Habilitá encryption at rest en etcd con `--encryption-provider-config`. Para true secret management, usá External Secrets Operator con Vault o cloud secret managers.

### ¿Qué es External Secrets Operator?

Un Kubernetes operator que syncea secrets desde external secret managers (Vault, AWS Secrets Manager, GCP Secret Manager) into Kubernetes Secrets. Definís un `ExternalSecret` resource que referencea un `SecretStore`, y ESO crea y updatea el Kubernetes Secret automáticamente.

### ¿Qué son Sealed Secrets?

Un controller que encryptea Kubernetes Secrets into `SealedSecret` resources. El encrypted SealedSecret es safe para storear en Git. Solo el controller en tu cluster puede decryptarlo. Useful para GitOps workflows donde todo vive en version control.

### ¿Cómo updateo pod config sin restarting?

ConfigMaps mounted como volumes son updated automáticamente (within 60-90 seconds por el kubelet). ConfigMaps injected como environment variables requiren un pod restart. Usá Reloader para automatizar restarts cuando ConfigMaps o Secrets cambian.
