---
contentType: recipes
slug: kubernetes-configmap-secret-mounting
title: "Montar Configs y Secrets en Pods de Kubernetes"
description: "Cómo montar ConfigMaps y Secrets en pods de Kubernetes usando env vars, volumes, projected volumes y secret management con external secrets."
metaDescription: "Monta ConfigMaps y Secrets en pods de Kubernetes. Usa env vars, volumes, projected volumes y external secret management para configuración segura."
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
  - /recipes/devops/kubernetes-helm-chart-templating
  - /recipes/devops/docker-compose-override-environments
  - /recipes/devops/terraform-remote-state-s3-backend
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Monta ConfigMaps y Secrets en pods de Kubernetes. Usa env vars, volumes, projected volumes y external secret management para configuración segura."
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

Los ConfigMaps de Kubernetes almacenan data de configuración no sensible. Los Secrets almacenan data sensible como passwords, tokens y certificados. Ambos pueden ser montados en pods como environment variables o archivos. Esta recipe cubre los patterns para inyectar configuración y secrets en tus aplicaciones que corren en Kubernetes — desde env vars básicas hasta projected volumes y external secret operators.

## When to Use

- Inyectar configuración en aplicaciones containerizadas
- Manejar database connection strings, API keys y certificados
- Cuando diferentes entornos (dev, staging, prod) necesitan diferentes configs
- Cuando necesitás actualizar config sin rebuildar la imagen
- Cuando los secrets deben ser montados como archivos (e.g., TLS certificates)

## When NOT to Use

- Para config no sensible que raramente cambia — bakeala en la imagen
- Cuando necesitás config templating complejo — usá un init container o Helm
- Para secrets en git — usá SealedSecrets o External Secrets Operator en su lugar

## Solution

### Crear un ConfigMap

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

### Crear un Secret

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

### Montar ConfigMap como environment variables

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

### Montar ConfigMap como volume

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

### Montar Secret como volume

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

### Montar TLS certificate como volume

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

### Projected volume (combinar ConfigMap + Secret)

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

### Env vars selectivos desde ConfigMap

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

### Subpath para montar un solo archivo

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

### ConfigMaps y Secrets immutables

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
# ExternalSecret — sincroniza secrets desde AWS Secrets Manager / Vault
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

### Sealed Secrets para GitOps

```yaml
# SealedSecret — secret encrypted seguro para guardar en git
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

### Init container con config rendering

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

### Usar envFrom con prefix

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

### Hot-reloading de ConfigMap en un volume

```yaml
# Los ConfigMaps montados como volumes se auto-updatean (típicamente dentro de 60s)
# Usá un file watcher en tu app para pick up changes
spec:
  containers:
    - name: app
      image: my-app:latest
      volumeMounts:
        - name: config
          mountPath: /etc/app/config
          readOnly: true
      # La app debería watchear file changes
      # e.g., fsnotify in Go, chokidar in Node.js
  volumes:
    - name: config
      configMap:
        name: app-config
```

### Docker config secret para image pulls

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

- Usá ConfigMaps para data no sensible, Secrets para data sensible — nunca al revés
- Seteá `readOnly: true` en volume mounts — previene que las apps modifiquen config en runtime
- Usá `immutable: true` para configs estables — mejora performance y previene cambios accidentales
- Usá `defaultMode: 0400` para secret volumes — restringe file permissions
- Usá External Secrets Operator para producción — mantiene secrets fuera de etcd y git
- Usá SealedSecrets para GitOps — encrypta secrets at rest en git
- No guardes secrets en ConfigMaps — no están encrypted at rest en etcd
- Usá `envFrom` para bulk loading — más limpio que entries individuales de `env`

## Common Mistakes

- **Guardar secrets en ConfigMaps**: los ConfigMaps no están encrypted. Usá Secrets (que están base64-encoded, igual no están truly encrypted — usá ESO o SealedSecrets para encryption real).
- **No setear `readOnly: true`**: las apps pueden modificar config files montados, causando comportamiento inconsistente a través de pod restarts.
- **Montar todo el ConfigMap cuando necesitás un archivo**: usá `subPath` para montar un solo archivo sin sobrescribir el directorio.
- **Olvidar que los Secrets son base64, no encrypted**: cualquiera con `kubectl get secret` puede decodearlos. Usá RBAC para restringir acceso.
- **No usar `immutable: true`**: los ConfigMaps mutables causan pod restarts en update. Los immutables son más seguros y rápidos.

## FAQ

### ¿Cuál es la diferencia entre ConfigMap y Secret?

Los ConfigMaps almacenan data no sensible como plaintext. Los Secrets almacenan data sensible como strings base64-encoded. Los Secrets tienen controles RBAC adicionales y pueden ser encrypted at rest en etcd.

### ¿Los Kubernetes Secrets están encrypted?

Por default, los Secrets están base64-encoded (no encrypted). Habilitá encryption at rest en etcd con `--encryption-provider-config`. Para encryption real, usá External Secrets Operator con AWS KMS o HashiCorp Vault.

### ¿Cómo actualizo un ConfigMap sin restartear pods?

Los ConfigMaps montados como volumes se auto-updatean (dentro de ~60s). Los ConfigMaps cargados como env vars requieren un pod restart. Usá un file watcher en tu app para hot-reloading de configs montados como volume.

### ¿Qué es un projected volume?

Un volume que combina múltiples sources (ConfigMaps, Secrets, downward API) en un solo directorio. Útil para montar config y secrets juntos sin múltiples volume mounts.

### ¿Cómo creo un Secret desde un archivo?

```bash
kubectl create secret generic app-secrets \
  --from-file=ssl.crt=certs/tls.crt \
  --from-file=ssl.key=certs/tls.key \
  --from-literal=api-key=abc123
```
