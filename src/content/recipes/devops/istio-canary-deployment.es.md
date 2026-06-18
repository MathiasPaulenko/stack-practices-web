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

- Despliegas a Kubernetes y necesitas desplazamiento progresivo de trafico
- Los nuevos releases requieren validacion en el mundo real antes del rollout completo
- Quieres minimizar el radio de impacto de fallos de despliegue

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
