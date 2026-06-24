---
contentType: guides
slug: chaos-engineering-guide
title: "Chaos Engineering — Principios, Herramientas y Experimentos Seguros"
description: "Guia practica de chaos engineering: construye sistemas resilientes inyectando fallos intencionalmente. Aprende los cinco principios, Litmus, Gremlin y Chaos Mesh."
metaDescription: "Aprende chaos engineering: construye sistemas resilientes inyectando fallos. Cinco principios, herramientas como Litmus y Chaos Mesh, y diseno seguro de experimentos."
difficulty: advanced
topics:
  - devops
  - testing
  - infrastructure
tags:
  - chaos-engineering
  - resiliencia
  - litmus
  - gremlin
  - chaos-mesh
  - fault-injection
  - sre
  - guia
relatedResources:
  - /guides/sre-practices-guide
  - /guides/observability-guide
  - /guides/service-mesh-guide
  - /patterns/resilience/circuit-breaker-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende chaos engineering: construye sistemas resilientes inyectando fallos. Cinco principios, herramientas como Litmus y Chaos Mesh, y diseno seguro de experimentos."
  keywords:
    - chaos-engineering
    - resiliencia
    - litmus
    - gremlin
    - chaos-mesh
    - fault-injection
    - guia
---

## Overview

Chaos engineering es la disciplina de experimentar en un sistema para construir confianza en su capacidad de soportar condiciones turbulentas. En lugar de esperar a que los fallos ocurran en produccion, los inyectas intencionalmente — kills de pods, latencia de red, agotamiento de CPU, llenado de disco — para validar que tu sistema se degrada gracefulmente y se recupera automaticamente. Originado en Netflix con Chaos Monkey, ha evolucionado hacia una practica estructurada con principios, herramientas y salvaguardas de seguridad.

## When to Use

- Tu sistema afirma ser "altamente disponible" pero nunca ha sido probado bajo fallo
- Quieres validar autoscaling, failover y circuit breakers
- Necesitas descubrir dependencias desconocidas y puntos unicos de fallo
- Los runbooks de respuesta a incidentes existen pero no han sido probados
- Estas corriendo Kubernetes y quieres validar resiliencia de pods

## Los Cinco Principios del Chaos Engineering

1. **Construye una hipotesis alrededor del comportamiento de estado estable** — define metricas normales (tasa de error < 0.1%, latencia p99 < 200ms)
2. **Varia eventos del mundo real** — inyecta fallos que realmente ocurren: particiones de red, fallos de disco, caidas de dependencias
3. **Ejecuta experimentos en produccion** — staging raramente coincide con la topologia y carga de produccion
4. **Automatiza experimentos para que corran continuamente** — los game days manuales son valiosos pero no escalables
5. **Minimiza el radio de impacto** — comienza pequeno (un pod, una AZ), aborta si los SLOs se rompen

## Diseno de Experimentos

```
┌─────────────────┐
│ 1. Estado estable │ ← Define normal via metricas
│ 2. Hipotesis     │ ← "Si X falla, Y autoscala en < 60s"
│ 3. Inyecta fallo │ ← Mata pod, agrega latencia, llena disco
│ 4. Observa       │ ← Compara actual vs hipotesis
│ 5. Revierte      │ ← Aborta si el radio de impacto excede limites
│ 6. Aprende       │ ← Arregla debilidades, automatiza fix
└─────────────────┘
```

## Ejemplo Chaos Mesh (Kubernetes)

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-api
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: api
  duration: 30s
  scheduler:
    cron: "@every 10m"
```

## Ejemplo LitmusChaos

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: api-pod-delete
  namespace: litmus
spec:
  appinfo:
    appns: production
    applabel: "app=api"
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "30"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "false"
```

## Tipos de Experimentos Comunes

| Experimento | Valida | Herramienta |
|-------------|--------|------------|
| **Matar pod** | Reprogramacion de Kubernetes, readiness probes | Chaos Mesh, Litmus |
| **Latencia de red** | Manejo de timeouts, circuit breakers | Chaos Mesh, Gremlin |
| **Stress CPU/memoria** | Triggers de autoscaling, limites de recursos | Stress-ng, Gremlin |
| **Llenar disco** | Rotacion de logs, alertas de storage | Litmus, Gremlin |
| **Caida de zona** | Failover multi-AZ | AWS FIS, Gremlin |

## Salvaguardas de Seguridad

- **Condiciones de aborto** — auto-detener experimento si tasa de error > 1% o p99 > 500ms
- **Tiempo limitado** — limitar duracion del experimento (30s, 5m, no indefinido)
- **Alcance pequeno** — un pod → un deployment → un namespace → una AZ
- **Horario laboral** — ejecutar experimentos cuando ingenieros estan disponibles
- **Comunicacion clara** — anunciar experimentos para evitar duplicacion de incidentes

## Common Mistakes

- **Sin definicion de estado estable** — no puedes detectar degradacion si no sabes como es lo normal
- **Radio de impacto demasiado grande** — comenzar con una caida de region completa puede impactar clientes reales
- **Sin mecanismo de aborto** — los experimentos deben auto-terminar si los SLOs se rompen
- **Culpar a individuos por fallos encontrados** — chaos engineering encuentra debilidades del sistema, no errores humanos
- **Ejecutar experimentos sin runbooks** — si el experimento encuentra un bug, necesitas un plan de remediacion

## FAQ

**El chaos engineering es seguro para produccion?**
Si, si se hace con salvaguardas. Comienza con el radio de impacto mas pequeno posible y condiciones de aborto. El riesgo de un sistema no probado fallando en produccion es a menudo mayor que un experimento controlado.

**Cual es la diferencia entre chaos engineering y testing?**
El testing valida que el codigo se comporta correctamente bajo condiciones conocidas. El chaos engineering valida que el sistema como un todo se comporta bajo condiciones de fallo desconocidas del mundo real.

**Necesito Kubernetes para hacer chaos engineering?**
No. Gremlin soporta VMs, contenedores y serverless. AWS Fault Injection Simulator funciona con EC2 y RDS. Kubernetes solo hace mas faciles los experimentos a nivel de pod.
