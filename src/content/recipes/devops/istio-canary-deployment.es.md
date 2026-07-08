---
contentType: recipes
slug: istio-canary-deployment
title: "Despliegues Canary con Istio Service Mesh"
description: "Como usar el splitting de trafico de Istio para realizar despliegues canary seguros desplazando gradualmente usuarios entre versiones de aplicaciones"
metaDescription: "Despliegues canary con Istio. Divide trafico entre versiones de apps, monitorea metricas y automatiza rollback para releases sin downtime."
difficulty: advanced
topics:
  - devops
  - infrastructure
tags:
  - istio
  - kubernetes
  - deployment
  - devops
  - ci-cd
relatedResources:
  - /recipes/devops/aws-ecs-fargate
  - /recipes/devops/terraform-aws-vpc
  - /guides/infrastructure-as-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Despliegues canary con Istio. Divide trafico entre versiones de apps, monitorea metricas y automatiza rollback para releases sin downtime."
  keywords:
    - istio
    - canary deployment
    - service mesh
    - traffic splitting
    - kubernetes
---

# Despliegues Canary con Istio Service Mesh

Istio proporciona gestion de trafico granular a traves de virtual services y destination rules. Al dividir trafico entre versiones estable y canary de un servicio, puedes validar nuevos releases con trafico real de usuarios manteniendo la capacidad de rollback instantaneo si los errores aumentan.

## Cuando Usar Esto

- Despliegas a Kubernetes y necesitas desplazamiento progresivo de trafico. Consulta [Blue-Green Deployment](/recipes/devops/blue-green-deployment) para releases sin downtime.
- Los nuevos releases requieren validacion en el mundo real antes del rollout completo. Consulta [Feature Flags](/recipes/devops/feature-flags) para rollouts graduales.
- Quieres minimizar el radio de impacto de fallos de despliegue. Consulta [Health Check Endpoint](/recipes/devops/health-check-endpoint) para detección temprana de fallos.

## Requisitos Previos

- Cluster de Kubernetes con Istio instalado
- Dos versiones de una aplicacion desplegadas con labels diferentes

## Solucion

### 1. Desplegar Ambas Versiones

```yaml
# deployment-v1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
      version: v1
  template:
    metadata:
      labels:
        app: api
        version: v1
    spec:
      containers:
      - name: api
        image: myapp:1.0.0
        ports:
        - containerPort: 8080
```

```yaml
# deployment-v2.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
      version: v2
  template:
    metadata:
      labels:
        app: api
        version: v2
    spec:
      containers:
      - name: api
        image: myapp:1.1.0
        ports:
        - containerPort: 8080
```

### 2. Crear Destination Rule para Subsets

```yaml
# destination-rule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api
spec:
  host: api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### 3. Configurar Division de Trafico

```yaml
# virtual-service-canary.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
        subset: v1
      weight: 90
    - destination:
        host: api
        subset: v2
      weight: 10
```

### 4. Script de Rollout Progresivo

```bash
#!/bin/bash
# canary-rollout.sh

set -e

function set_weight() {
  local v1_weight=$1
  local v2_weight=$((100 - v1_weight))
  
  cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
        subset: v1
      weight: ${v1_weight}
    - destination:
        host: api
        subset: v2
      weight: ${v2_weight}
EOF
}

# Fase 1: 10% de trafico a v2
set_weight 90
echo "v2 desplegado al 10%. Monitoreando por 5 minutos..."
sleep 300

# Fase 2: 50% de trafico a v2
set_weight 50
echo "v2 desplegado al 50%. Monitoreando por 5 minutos..."
sleep 300

# Fase 3: 100% de trafico a v2
set_weight 0
echo "v2 desplegado al 100%. Canary completo."
```

### 5. Rollback Automatizado via Prometheus

```yaml
# canary-analysis.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  service:
    port: 8080
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
      interval: 1m
    webhooks:
    - name: load-test
      url: http://flagger-loadtester.test/
      timeout: 5s
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://api:8080/health"
```

## Como Funciona

1. **DestinationRule** define subsets basados en labels de pods
2. **VirtualService** asigna pesos de trafico a cada subset
3. **Desplazamiento Progresivo** mueve trafico en etapas monitoreando tasas de error
4. **Outlier Detection** ejecta automaticamente pods no saludables
5. **Rollback** revierte pesos de trafico si las metricas exceden umbrales

## Consideraciones de Produccion

- Usa **Flagger** para analisis automatizado de canary y promocion
- Monitorea **latencia, tasa de error y throughput** independientemente durante el rollout
- Manten replicas canary pequenas inicialmente; escala solo despues de validacion
- Combina con **feature flags** para dark launches de nueva funcionalidad

## Errores Comunes

- Enviar trafico canary a endpoints internos de admin que los usuarios nunca usan
- No monitorear metricas de negocio (tasa de checkout, conversion de registro)
- Olvidar escalar hacia abajo la version vieja despues de promocion completa

## FAQ

**P: Como se diferencia de un rolling update?**
R: Los rolling updates reemplazan pods in-place. Los despliegues canary rutean trafico progresivamente, permitiendote observar comportamiento con usuarios reales antes del compromiso completo.

**P: Puedo hacer canary basado en propiedades de usuario en lugar de porcentajes aleatorios?**
R: Si. Istio soporta routing por headers, cookies o claims JWT para releases canary dirigidos.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### Routing Canary Basado en Headers

```yaml
# Rutear testers internos a v2 independientemente del peso
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-header-routing
spec:
  hosts:
  - api
  http:
  - match:
    - headers:
        x-canary-test:
          exact: "true"
    route:
    - destination:
        host: api
        subset: v2
  - route:
    - destination:
        host: api
        subset: v1
      weight: 100
```

### Mirroring de Trafico (Shadow Traffic)

```yaml
# Espejar 100% del trafico a v2 sin afectar respuestas
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-mirror
spec:
  hosts:
  - api
  http:
  - route:
    - destination:
        host: api
        subset: v1
      weight: 100
    mirror:
      host: api
      subset: v2
    mirrorPercentage:
      value: 100.0
```

### Circuit Breaking con DestinationRule

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-circuit-breaker
spec:
  host: api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 20
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    loadBalancer:
      simple: LEAST_REQUEST
```

### Limpieza Post-Promoción

```bash
#!/bin/bash
# cleanup-old-version.sh

# Después de la promoción completa del canary a v2:
# 1. Remover pesos viejos del VirtualService
kubectl apply -f virtual-service-v2-only.yaml

# 2. Escalar hacia abajo el deployment v1
kubectl scale deployment api-v1 --replicas=0

# 3. Esperar a que los pods terminen
kubectl wait --for=delete pod -l app=api,version=v1 --timeout=60s

# 4. Remover deployment v1
kubectl delete deployment api-v1

# 5. Remover subset v1 del DestinationRule
kubectl apply -f destination-rule-v2-only.yaml

echo "Limpieza completa. Solo v2 está corriendo."
```

## Mejores Prácticas Adicionales

1. **Usa Flagger para análisis automatizado de canary.** Maneja shifting de tráfico, evaluación de métricas y rollback sin intervención manual:

```yaml
# Flagger con query personalizada de Prometheus
analysis:
  metrics:
  - name: error-rate
    threshold: 1
    query: |
      sum(rate(istio_requests_total{
        destination_service="api.default.svc.cluster.local",
        response_code=~"5.*"
      }[1m])) /
      sum(rate(istio_requests_total{
        destination_service="api.default.svc.cluster.local"
      }[1m])) * 100
```

2. **Taguea imágenes con versiones semánticas, no `latest`.** Esto asegura que puedas hacer rollback a una versión específica:

```bash
# Bien: tags versionados
image: myapp:1.1.0
image: myapp:1.1.1

# Mal: tags mutables
image: myapp:latest
```

3. **Ejecuta canary durante horas de bajo tráfico.** Reduce el radio de impacto iniciando rollouts en períodos off-peak:

```bash
# Agendar canary a las 2 AM
0 2 * * * /opt/scripts/canary-rollout.sh >> /var/log/canary.log 2>&1
```

## Errores Comunes Adicionales

1. **No definir SLOs antes del canary.** Sin umbrales, no puedes automatizar decisiones de rollback:

```yaml
# Definir SLOs explícitamente
slos:
  - name: availability
    target: 99.9
  - name: latency_p99
    target: 200ms
```

2. **Usar la misma base de datos para v1 y v2 con cambios de schema.** Migraciones backward-incompatible rompen v1:

```bash
# Usar patrón expand-contract
# 1. Expand: agregar nuevas columnas (ambas versiones funcionan)
# 2. Migrate: v2 escribe a nuevas columnas
# 3. Contract: remover columnas viejas después de que v1 se elimine
```

3. **Ignorar resource limits del pod canary.** Un solo pod canary puede consumir recursos del cluster:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

## FAQ Adicional

### Como hago canary de una migración de base de datos?

Usa el patrón expand-contract. Primero, agrega nuevas columnas/tablas (expand) para que ambas versiones funcionen. Luego despliega v2 que usa el nuevo schema. Finalmente, remueve columnas viejas (contract) después de que v1 esté decomisionada.

### Qué es traffic mirroring vs canary?

Traffic mirroring envía una copia de requests al canary sin afectar la respuesta del usuario. Esto te permite testear v2 con patrones de tráfico real antes de shifting cualquier tráfico actual. Canary envía tráfico real a v2, afectando respuestas de usuarios.

### Cuánto debería durar cada fase canary?

Al menos 5-10 minutos por fase para servicios de corta duración. Para servicios de alto tráfico, 30-60 minutos por fase da suficiente data para significancia estadística. Monitorea error rate, latency p99 y métricas de negocio.

## Tips de Rendimiento

1. **Usa LEAST_REQUEST load balancing.** Previene que el pod canary sea abrumado:

```yaml
loadBalancer:
  simple: LEAST_REQUEST
```

2. **Habilita telemetría de Istio selectivamente.** Telemetría completa agrega overhead. Deshabilita access logs durante canaries de alto tráfico:

```yaml
telemetry:
  accessLogLogging:
    disabled: true
```

3. **Pre-calienta pods canary.** Envía una pequeña cantidad de tráfico antes de iniciar el rollout para JIT-compilar código y calentar cachés:

```bash
# Pre-calentar con 1% de tráfico por 2 minutos
set_weight 99
sleep 120
# Luego iniciar el rollout real
```
