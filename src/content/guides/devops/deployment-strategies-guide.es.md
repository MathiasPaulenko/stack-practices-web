---
contentType: guides
slug: deployment-strategies-guide
title: "Despliegues Blue-Green y Canary"
description: "Guía práctica de estrategias de deploy: blue-green, canary, rolling y feature flags. Minimiza riesgo y tiempo de rollback al liberar a producción."
metaDescription: "Guía de estrategias de deploy: blue-green, canary, rolling y feature flags. Minimiza riesgo y tiempo de rollback al liberar a producción de forma segura."
difficulty: intermediate
topics:
  - devops
tags:
  - cero-downtime
  - deployment
  - devops
  - feature-flags
  - guia
  - rollback
relatedResources:
  - /guides/devops/cicd-pipeline-guide
  - /guides/devops/infrastructure-as-code-guide
  - /guides/devops/docker-for-developers-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de estrategias de deploy: blue-green, canary, rolling y feature flags. Minimiza riesgo y tiempo de rollback al liberar a producción de forma segura."
  keywords:
    - despliegue blue green
    - despliegue canary
    - zero downtime deployment
    - estrategias de deploy
    - feature flags produccion
---

# Despliegues Blue-Green y Canary

## Introducción

Desplegar a producción es riesgoso. Un mal deploy puede caer tu servicio, corromper datos o degradar la experiencia de usuario por horas. Las estrategias de deploy existen para reducir este riesgo controlando cómo el nuevo código llega a los usuarios y qué tan rápido puedes revertir si algo sale mal.

## Estrategias de Deploy Comparadas

| Estrategia | Nivel de Riesgo | Tiempo de Rollback | Complejidad | Mejor Para |
|------------|----------------|-------------------|-------------|-----------|
| **Recreate** | Alto | Lento (redeploy) | Baja | Solo ambientes dev/test |
| **Rolling** | Medio | Medio (detener rolling) | Baja | Servicios stateless simples |
| **Blue-Green** | Bajo | Instantáneo (switch tráfico) | Media | Cuando rollback instantáneo es crítico |
| **Canary** | Muy bajo | Rápido (devolver tráfico) | Alta | Cambios de alto riesgo, rollouts graduales |
| **Feature Flags** | Mínimo | Instantáneo (toggle off) | Media | Desacoplar deploy de release |

## Rolling Deployment

Reemplaza instancias viejas gradualmente con nuevas.

```bash
# Kubernetes rolling update
kubectl set image deployment/api api=myapp:v2.4.1
kubectl rollout status deployment/api
```

**Trade-off:** Durante el rollout, versiones viejas y nuevas coexisten. Si v2 rompe un contrato de datos, instancias v1 pueden fallar al leer datos escritos por v2.

## Blue-Green Deployment

Mantiene dos ambientes idénticos. Uno está activo (blue), otro inactivo (green). Deploya en green, testea, luego cambia tráfico instantáneamente.

```
Antes:  Usuarios → [Load Balancer] → [Blue: v2.4.0]
                                     [Green: v2.4.0 inactivo]

Después: Usuarios → [Load Balancer] → [Blue: v2.4.0 inactivo]
                                     [Green: v2.4.1 activo]
```

**Trade-off:** Duplica costo de infraestructura. Requiere manejo cuidadoso de cambios de esquema de base de datos (ambas versiones deben funcionar con el mismo esquema).

### Consideraciones de Base de Datos

| Tipo de Cambio | ¿Compatible Blue-Green? |
|----------------|--------------------------|
| Agregar columna (nullable) | Sí — código viejo la ignora |
| Agregar columna (non-nullable) | No — código viejo no puede insertar sin ella |
| Renombrar columna | No — código viejo referencia nombre viejo |
| Eliminar columna | No — código viejo puede seguir leyéndola |
| Agregar índice | Sí — ambas versiones se benefician |

**Regla:** Blue-green requiere cambios de base de datos backward-compatible. Usa patrón expand-contract: agregar nueva columna (expand), deployar nuevo código, eliminar columna vieja (contract).

## Canary Deployment

Enruta un pequeño porcentaje de tráfico a la nueva versión, monitorea métricas, luego aumenta gradualmente.

```
Paso 1: 1%  → [Canary v2.4.1], 99% → [Stable v2.4.0]
Paso 2: 5%  → [Canary v2.4.1], 95% → [Stable v2.4.0]
Paso 3: 25% → [Canary v2.4.1], 75% → [Stable v2.4.0]
Paso 4: 100% → [Canary v2.4.1 se convierte en stable]
```

```yaml
# Kubernetes con Flagger (canary automatizado)
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
      - name: request-duration
        thresholdRange:
          max: 500
```

**Criterios de aborto:** Si la tasa de error sube o la latencia excede el umbral, Flagger automáticamente hace rollback a 0% canary.

## Feature Flags (Desacoplando Deploy de Release)

Deploya código a producción pero mantenlo oculto. Actívalo para usuarios específicos cuando esté listo.

```python
# Feature flag estilo LaunchDarkly
if client.variation("new-checkout-flow", user_context, False):
    return new_checkout.handle(request)
return old_checkout.handle(request)
```

| Usa Feature Flags Para | NO Uses Feature Flags Para |
|----------------------|---------------------------|
| Nuevas capacidades de UI | Fixes de seguridad (no deberían ser toggleables) |
| Tests A/B | Parches de bugs críticos |
| Rollouts graduales de capacidades | Código de migración de datos |
| Kill switches para capacidades riesgosas | |

## Métricas a Observar Durante Deploy

| Métrica | Umbral Canary | Acción Si Se Viola |
|---------|--------------|-------------------|
| Tasa de error | < 0.1% | Rollback canary |
| Latencia p99 | < línea base + 20% | Rollback canary |
| Throughput | Sin caída > 10% | Rollback canary |
| Métrica de negocio custom | Sin caída | Rollback canary |

## Lo que funciona

- **Automatiza rollback** — un humano presionando un botón a las 3 AM es poco confiable. Consulta [pipelines CI/CD](/guides/devops/cicd-pipeline-guide).
- **Usa tráfico sintético** — golpea el canary con [tests de carga](/recipes/performance/load-testing-k6) antes que usuarios reales
- **Mantén deploys pequeños** — cambios más pequeños son más fáciles de debuggear y más rápidos de revertir
- **Un cambio a la vez** — no combines un deploy con migración de base de datos y cambio de config
- **Testea rollback** — un rollback que nunca practicaste es una apuesta

## Errores Comunes

- Deployar viernes por la tarde — estarás debuggeando todo el fin de semana
- No tener rollback automatizado — los rollbacks manuales toman 10x más tiempo
- Combinar múltiples cambios en un deploy — cuando falla, no sabes cuál causó el problema
- Ignorar métricas de canary porque "los tests pasaron" — tráfico de producción es la única prueba real
- Olvidar [compatibilidad de esquema](/recipes/databases/schema-evolution) en blue-green — código viejo y nuevo debe coexistir durante el switch

## Preguntas Frecuentes

### ¿Cada deploy debería usar canary?

No. Cambios de bajo riesgo (actualizaciones de dependencias, fixes de typos) pueden usar rolling deploys. Reserva canary para capacidades orientadas a usuarios, refactorizaciones riesgosas y cambios que tocan paths críticos (pagos, autenticación).

### ¿Cuánto debería durar un canary?

Hasta tener confianza estadística. Para servicios de alto tráfico, 15-30 minutos pueden bastar. Para servicios de bajo tráfico, horas o un ciclo completo de negocio pueden ser necesarios. Usa error budgets y SLOs para definir "terminado."

### ¿Qué pasa si el esquema de base de datos necesita cambiar?

Usa el patrón expand-contract. Paso 1: deploy cambio de esquema (agregar nueva columna, mantener vieja). Paso 2: deploy código que escribe a ambas. Paso 3: backfill de datos. Paso 4: deploy código que lee solo de la nueva. Paso 5: eliminar columna vieja. Toma múltiples deploys pero garantiza zero downtime.
