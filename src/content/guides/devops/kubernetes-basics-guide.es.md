---
contentType: guides
slug: kubernetes-basics-guide
title: "Kubernetes Básico para Desarrolladores de Aplicaciones"
description: "Aprende los conceptos core de Kubernetes que todo desarrollador necesita: Pods, Services, Deployments, ConfigMaps y comandos básicos de kubectl."
metaDescription: "Básicos de Kubernetes para desarrolladores: Pods, Deployments, Services, ConfigMaps y kubectl. Guía práctica para ejecutar apps containerizadas en K8s."
difficulty: beginner
topics:
  - devops
  - architecture
tags:
  - architecture
  - contenedores
  - devops
  - guia
  - kubernetes
  - orquestacion
relatedResources:
  - /guides/devops/docker-for-developers-guide
  - /guides/devops/cicd-pipeline-guide
  - /guides/architecture/software-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Básicos de Kubernetes para desarrolladores: Pods, Deployments, Services, ConfigMaps y kubectl. Guía práctica para ejecutar apps containerizadas en K8s."
  keywords:
    - kubernetes basico
    - tutorial kubectl
    - pods kubernetes
    - deployments kubernetes
    - services kubernetes
    - k8s para desarrolladores
---

# Kubernetes Básico para Desarrolladores de Aplicaciones

## Introducción

Kubernetes (K8s) es una plataforma open-source de orquestación de contenedores. Automatiza el despliegue, el escalado y la gestión de aplicaciones containerizadas. Como desarrollador, necesitas entender las abstracciones core para desplegar y depurar tus aplicaciones bien.

## Conceptos Clave

### Pod

Un Pod es la unidad desplegable más pequeña en Kubernetes. Encapsula uno o más contenedores que comparten red y almacenamiento.

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

Un Deployment gestiona un conjunto de Pods idénticos, asegurando que el número deseado de réplicas esté en ejecución y permitiendo actualizaciones rolling.

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

Un Service expone un conjunto de Pods como un servicio de red, proporcionando balanceo de carga y nombres DNS estables.

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

| Tipo de Service | Descripción | Caso de Uso |
|----------------|-------------|-------------|
| **ClusterIP** | IP interna del cluster solo | Comunicación interna |
| **NodePort** | Expone en el IP de cada nodo en un puerto estático | Acceso externo directo |
| **LoadBalancer** | Expone externamente usando el LB del proveedor cloud | Ingress de producción |
| **ExternalName** | Mapea a un nombre DNS externo | Dependencias externas |

## Comandos Esenciales de kubectl

```bash
# Aplicar un manifiesto
kubectl apply -f deployment.yaml

# Obtener recursos
kubectl get pods
kubectl get deployments
kubectl get services

# Describir un recurso (info detallada + eventos)
kubectl describe pod myapp-xxx

# Ejecutar un comando en un pod
kubectl exec -it myapp-xxx -- sh

# Ver logs
kubectl logs -f myapp-xxx
kubectl logs -f deployment/myapp --tail=100

# Port-forward para acceso local
kubectl port-forward svc/myapp-service 8080:80

# Escalar un deployment
kubectl scale deployment myapp --replicas=5

# Estado e historial de rollout
kubectl rollout status deployment/myapp
kubectl rollout history deployment/myapp
kubectl rollout undo deployment/myapp
```

## ConfigMaps y Secrets

### ConfigMap

Almacena datos de configuración no sensibles:

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
# Usar en un Pod
envFrom:
  - configMapRef:
      name: myapp-config
```

### Secret

Almacena datos sensibles (codificados en base64):

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

Kubernetes usa probes para determinar la salud del contenedor:

| Probe | Propósito | Acción al Fallar |
|-------|-----------|------------------|
| **Liveness** | ¿La app está ejecutándose? | Reiniciar el contenedor |
| **Readiness** | ¿La app está lista para recibir tráfico? | Eliminar de los endpoints del Service |
| **Startup** | ¿La app terminó de iniciar? | Desactivar temporalmente otras probes |

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

Los namespaces proporcionan separación lógica dentro de un cluster:

```bash
# Crear un namespace
kubectl create namespace dev

# Establecer namespace por defecto para el contexto
kubectl config set-context --current --namespace=dev

# Listar recursos en un namespace
kubectl get pods -n dev
```

Estrategias comunes de namespaces:
- `default` — proyectos pequeños
- `dev`, `staging`, `prod` — por entorno
- Por equipo o por proyecto para aislamiento

## Lo que funciona

- **Establece [requests y limits de recursos](/guides/performance/performance-optimization-guide)** en cada contenedor para prevenir vecinos ruidosos
- **Usa readiness probes** para evitar que el tráfico llegue a Pods no listos
- **Usa liveness probes** para recuperarse de deadlocks y bloqueos
- **Nunca ejecutes como root** — establece `securityContext.runAsNonRoot: true`. Consulta [seguridad de contenedores](/recipes/security/container-security).
- **Fija las etiquetas de imagen** — evita `:latest` en producción
- **Usa ConfigMaps para configuración**, [Secrets](/guides/security/security-best-practices-guide) para credenciales
- **Establece terminación graceful** — maneja SIGTERM en tu app (`terminationGracePeriodSeconds`). Consulta [estrategias de deployment](/guides/devops/deployment-strategies-guide).

## Errores Comunes

- No establecer requests/limits de recursos, causando inestabilidad del cluster
- Usar etiquetas de imagen `latest`, llevando a [despliegues](/guides/devops/deployment-strategies-guide) impredecibles
- Faltar readiness probes, causando errores 502 durante rollouts
- Almacenar secretos en ConfigMaps en lugar de Secrets
- No manejar SIGTERM, causando shutdowns abruptos y pérdida de datos
- Desplegar todo al namespace `default` sin aislamiento

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre un Pod y un Deployment?**
R: Un Pod es una sola instancia. Un Deployment es un controlador que gestiona múltiples réplicas de Pods, maneja actualizaciones rolling y se auto-recupera si los Pods fallan.

**P: ¿Cómo accedo a mi aplicación ejecutándose en Kubernetes localmente?**
R: Usa `kubectl port-forward` para reenviar un puerto local a un Pod o Service. Para acceso compartido, usa un Service de tipo LoadBalancer o Ingress.

**P: ¿Qué sucede durante una rolling update?**
R: Kubernetes crea nuevos Pods con la imagen actualizada, espera a que las readiness probes pasen, y luego reduce gradualmente los Pods antiguos. Si la actualización falla, puedes hacer `kubectl rollout undo`.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Despliegue K8s en Produccion para E-commerce

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
  labels: { app: payment-service }
spec:
  replicas: 4
  strategy:
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector:
    matchLabels: { app: payment-service }
  template:
    metadata:
      labels: { app: payment-service }
    spec:
      containers:
        - name: payment
          image: registry.example.com/payment:v2.1.0
          ports: [{ containerPort: 3000 }]
          resources:
            requests: { cpu: 200m, memory: 256Mi }
            limits: { cpu: 500m, memory: 512Mi }
          readinessProbe:
            httpGet: { path: /health, port: 3000 }
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /health, port: 3000 }
            initialDelaySeconds: 15
            periodSeconds: 20
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef: { name: db-secret, key: url }
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector: { matchLabels: { app: payment-service } }
                topologyKey: kubernetes.io/hostname

# hpa.yaml - Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: payment-service }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: payment-service }
  minReplicas: 4
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
    - type: Resource
      resource: { name: memory, target: { type: Utilization, averageUtilization: 80 } }

# pdb.yaml - Pod Disruption Budget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: payment-service }
spec:
  minAvailable: 3
  selector: { matchLabels: { app: payment-service } }

Checklist de produccion:
  | Item | Estado |
  |------|--------|
  | Resource limits | Configurados |
  | Readiness probe | Configurado |
  | Liveness probe | Configurado |
  | HPA | Habilitado |
  | PDB | minAvailable set |
  | Anti-affinity | Distribuido entre nodos |
  | Secrets | Desde Secret Manager |
  | Rolling update | maxUnavailable: 0 |
  | Image tag | Fijado (no latest) |
  | Namespace | Dedicado |
```

### Como depuro un CrashLoopBackOff?

Verifica eventos: `kubectl describe pod <name>`. Verifica logs: `kubectl logs <name> --previous` (crash anterior del container). Causas comunes: env vars faltantes, comando incorrecto, OOMKilled (aumentar limite de memoria), readiness probe fallido (verificar path y puerto), problemas de permisos (verificar service account y RBAC). Arregla la causa raiz, no solo reinicies el pod.
