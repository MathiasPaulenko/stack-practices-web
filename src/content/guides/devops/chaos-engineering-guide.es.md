---




contentType: guides
slug: chaos-engineering-guide
title: "Chaos Engineering"
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
  - /recipes/circuit-breaker-pattern-recipe
  - /guides/complete-guide-testcontainers-integration
  - /recipes/chaos-engineering
  - /guides/incident-response-guide
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


- For alternatives, see [Disaster Recovery: RTO, RPO, and Resilient Recovery Runbooks](/es/guides/disaster-recovery-guide/).

- Tu sistema afirma ser "altamente disponible" pero nunca ha sido probado bajo fallo
- Quieres validar autoscaling, failover y circuit breakers
- Necesitas descubrir dependencias desconocidas y puntos unicos de fallo
- Los runbooks de respuesta a incidentes existen pero no han sido probados
- Estas corriendo Kubernetes y quieres validar resiliencia de pods

## Los Cinco Principios del Chaos Engineering

1. **Construye una hipotesis alrededor del comportamiento de estado estable** — define metricas normales (tasa de error < 0.1%, latencia p99 < 200ms)
2. **Varia eventos del mundo real** — inyecta fallos que realmente ocurren: particiones de red, fallos de disco, caidas de dependencias
3. **Ejecuta experimentos en produccion** — staging raramente coincide con la topologia y carga de produccion
4. **Automatiza experimentos para que corran continuamente** — los game days manuales son valiosos pero no sostenibles
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

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Game Days para Plataforma E-commerce

```text
Sistema: E-commerce, 15 microservicios, K8s
Objetivo: Validar resiliencia antes de Black Friday

Calendario de Game Days (mensual):
  | Mes | Experimento | Hipotesis | Resultado |
  |-----|-------------|-----------|-----------|
  | Ene | Matar pod de pagos | Auto-scaling reemplaza en < 30s | Pasa |
  | Feb | Latencia 500ms en DB | Circuit breaker activa fallback | Falla: no habia fallback |
  | Mar | Matar AZ completa | Trafico redirige a AZ sana | Pasa |
  | Abr | Latencia en Redis | Cache miss degrada graceful | Falla: timeouts en cascada |
  | May | Matar servicio de search | Catalogo sin search funciona | Pasa |
  | Jun | Corrupt message en Kafka | Consumer maneja poison pill | Falla: consumer se cuelga |

Experimento detallado (Feb):
  Nombre: DB-latency-injection
  Hipotesis: Si la DB tiene 500ms de latencia, el circuit breaker
             activa el fallback de cache en < 5s sin errores 5xx
  Blast radius: 10% del trafico (canary)
  Duracion: 10 minutos
  Aborto: tasa de error > 5% o latencia p99 > 3s

  Ejecucion (Gremlin):
    gremlin attack latency -t 500ms -i 600 --service payment-db
    --tags env=canary

  Monitoreo durante experimento:
    - Tasa de error: 0% -> 12% (FALLO)
    - Latencia p99: 200ms -> 4.5s (FALLO)
    - Circuit breaker: nunca se activo (FALLO)
    - Cache fallback: no implementado (FALLO)

  Analisis post-mortem:
    Causa raiz: Circuit breaker configurado con threshold de 10s
                pero la DB respondia en 500ms (no timeout).
                El fallback de cache no existia.

    Acciones:
    1. Implementar cache fallback para queries de producto
    2. Bajar threshold del circuit breaker a 2s
    3. Agregar timeout de 1s en queries de DB
    4. Re-ejecutar experimento en staging

  Re-ejecucion (Mar):
    - Tasa de error: 0% (PASA)
    - Latencia p99: 200ms -> 350ms (PASA)
    - Circuit breaker: activo a los 3s (PASA)
    - Cache fallback: sirvio datos stale (PASA)

Automatizacion (Chaos Mesh):
  apiVersion: chaos-mesh.org/v1alpha1
  kind: PodChaos
  metadata:
    name: payment-pod-kill
  spec:
    action: pod-kill
    mode: fixed-percent
    value: "10"
    selector:
      namespaces: [production]
      labelSelectors:
        app: payment-service
    scheduler:
      cron: "@every 1h"
```

### Como convence a management de chaos engineering?

Empieza con un game day en staging. Documenta los hallazgos: cada falla descubierta es un incidente de produccion evitado. Cuantifica el impacto: "Este experimento encontro un bug que habria causado 2h de downtime en Black Friday ($500K)". Los game days en staging tienen riesgo cero y alto ROI.


























































End of document. Review and update quarterly.