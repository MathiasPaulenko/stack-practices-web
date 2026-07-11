---
contentType: guides
slug: canary-deployment-guide
title: "Despliegue Canary: Rollouts Graduales con Controles de Seguridad"
description: "Guía práctica sobre despliegues canary: estrategias de división de tráfico, promoción automatizada, disparadores de rollback y despliegue seguro de nuevas versiones a un subconjunto de usuarios."
metaDescription: "Aprende despliegue canary: rollouts graduales, división de tráfico, promoción automatizada, disparadores de rollback y releases seguros."
difficulty: intermediate
topics:
  - devops
  - infrastructure
  - performance
tags:
  - canary
  - deployment
  - gradual-rollout
  - traffic-splitting
  - rollback
  - feature-flags
  - guia
relatedResources:
  - /guides/deployment/blue-green-deployment-guide
  - /guides/deployment/feature-flags-guide
  - /guides/deployment/a-b-testing-guide
  - /guides/devops/sre-practices-guide
  - /guides/observability-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende despliegue canary: rollouts graduales, división de tráfico, promoción automatizada, disparadores de rollback y releases seguros."
  keywords:
    - canary
    - deployment
    - gradual-rollout
    - traffic-splitting
    - rollback
    - feature-flags
    - guia
---

## Overview

El despliegue canary libera una nueva versión primero a un pequeño subconjunto de usuarios, luego aumenta gradualmente el tráfico mientras monitorea problemas. Combina la seguridad de la exposición controlada con la velocidad del despliegue continuo, detectando problemas antes de que impacten a todos los usuarios.

A continuación: división de tráfico, métricas de salud, promoción automatizada y estrategias de rollback.

## When to Use

- Quieres reducir riesgo al desplegar nuevas capacidades
- Tu servicio tiene suficiente tráfico para obtener métricas significativas de 1-5% de usuarios
- Necesitas validar rendimiento bajo carga real antes del rollout completo
- Quieres hacer A/B testing de comportamiento junto con cambios de infraestructura
- Prefieres rollback gradual a cambio instantáneo (blue-green)

## Core Concepts

| Concepto | Descripción |
|----------|-------------|
| **Grupo Canary** | Subconjunto inicial de usuarios que reciben la nueva versión |
| **Split de Tráfico** | Porcentaje de requests enrutadas a canary vs baseline |
| **Promoción** | Aumentar porcentaje de tráfico canary después de validación |
| **Rollback** | Reducir tráfico canary a cero si se detectan problemas |
| **Bake Time** | Período mínimo de observación antes del siguiente paso de promoción |
| **Umbral de Métrica** | Criterios automatizados para promoción o rollback |

## Traffic Splitting Strategies

| Estrategia | Cómo Funciona | Mejor Para |
|------------|---------------|------------|
| **Porcentaje aleatorio** | Dividir X% de requests aleatoriamente | APIs stateless |
| **Basado en usuario** | Enrutar usuarios/grupos específicos consistentemente | Apps con sesiones |
| **Geográfica** | Enrutar por región o data center | Despliegues multi-región |
| **Basada en headers** | Enrutar por header de request (interno, beta) | Testing con clientes específicos |
| **Progresiva** | Empezar en 1%, duplicar cada N minutos | Servicios de alto tráfico |

## Step-by-Step Canary Deployment

### 1. Definir Criterios Canary

Establecer umbrales claros y medibles antes de desplegar:

```yaml
# Ejemplo: Configuración de análisis canary
canary:
  stages:
    - name: "1% canary"
      traffic_percentage: 1
      bake_time_minutes: 15
      thresholds:
        error_rate: "< 0.1%"
        latency_p95: "< 200ms"
        cpu_utilization: "< 70%"
    - name: "10% canary"
      traffic_percentage: 10
      bake_time_minutes: 30
      thresholds:
        error_rate: "< 0.1%"
        latency_p95: "< 200ms"
    - name: "50% canary"
      traffic_percentage: 50
      bake_time_minutes: 30
      thresholds:
        error_rate: "< 0.1%"
        latency_p95: "< 200ms"
    - name: "100% rollout"
      traffic_percentage: 100
```

#### Métricas Clave a Monitorear

- Técnicas: Tasa de error, latencia (p50/p95/p99), throughput, CPU, memoria
- Negocio: Tasa de conversión, abandono de carrito, éxito de login, finalización de pago
- Custom: KPIs específicas de funcionalidad relevantes al cambio desplegado

### 2. Desplegar el Canary

Enrutar un pequeño porcentaje de tráfico a la nueva versión:

```yaml
# Ejemplo: Istio virtual service para canary
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-canary
spec:
  hosts:
    - myapp.example.com
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: myapp
            subset: canary
          weight: 100
    - route:
        - destination:
            host: myapp
            subset: stable
          weight: 99
        - destination:
            host: myapp
            subset: canary
          weight: 1
```

```bash
# Ejemplo: Upstream ponderado en NGINX
upstream myapp {
    server stable.internal:8080 weight=99;
    server canary.internal:8080 weight=1;
}

# Ejemplo: Kubernetes con Flagger
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 80
    targetPort: 8080
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
```

### 3. Monitorear y Validar

Observar métricas canary contra baseline:

```python
# Ejemplo: Script de análisis canary automatizado
import requests
import time

def analyze_canary(baseline_version, canary_version, duration_minutes=15):
    end_time = time.time() + (duration_minutes * 60)
    
    while time.time() < end_time:
        # Obtener métricas del sistema de monitoreo
        baseline_errors = get_error_rate(baseline_version)
        canary_errors = get_error_rate(canary_version)
        
        baseline_latency = get_p95_latency(baseline_version)
        canary_latency = get_p95_latency(canary_version)
        
        # Verificar umbrales
        if canary_errors > baseline_errors * 1.5:
            return "ROLLBACK", f"Tasa de error muy alta: {canary_errors}%"
        
        if canary_latency > baseline_latency * 1.2:
            return "ROLLBACK", f"Regresión de latencia: {canary_latency}ms"
        
        time.sleep(60)
    
    return "PROMOTE", "Todos los umbrales pasaron"

result, reason = analyze_canary("v1.2.3", "v1.3.0")
print(f"Decision: {result} - {reason}")
```

#### Checklist de Monitoreo
- Comparar métricas canary con baseline, no solo valores absolutos
- Buscar picos de tasa de error, regresiones de latencia y agotamiento de recursos
- Monitorear métricas de negocio (revenue, conversión) junto con métricas técnicas
- Configurar alertas para problemas específicos de canary

### 4. Promover o Hacer Rollback

Basado en el análisis, aumentar tráfico o revertir:

```bash
# Ejemplo: Script de promoción automatizada
#!/bin/bash
CANARY_WEIGHT=$1

if [ "$CANARY_WEIGHT" -eq 100 ]; then
  echo "Canary completamente promovido. Removiendo versión vieja."
  kubectl scale deployment myapp-stable --replicas=0
  exit 0
fi

# Actualizar split de tráfico
kubectl patch virtualservice myapp -p \
  '{"spec":{"http":[{"route":[{"destination":{"host":"myapp","subset":"stable"},"weight":'$((100 - CANARY_WEIGHT))'},
  {"destination":{"host":"myapp","subset":"canary"},"weight":'$CANARY_WEIGHT'}]}]}'

echo "Tráfico actualizado: $CANARY_WEIGHT% canary"
```

```bash
# Ejemplo: Rollback instantáneo
#!/bin/bash
echo "Haciendo rollback de canary..."

# Establecer peso canary a 0
kubectl patch virtualservice myapp -p \
  '{"spec":{"http":[{"route":[{"destination":{"host":"myapp","subset":"stable"},"weight":100},
  {"destination":{"host":"myapp","subset":"canary"},"weight":0}]}]}'

# Escala canary a cero
kubectl scale deployment myapp-canary --replicas=0

echo "Rollback completo. Todo el tráfico en estable."
```

#### Promoción: Lo que Funciona

- Nunca saltear bake time. Incluso si las métricas se ven bien.
- Duplicar tráfico por etapas (1% → 5% → 10% → 25% → 50% → 100%)
- Requerir aprobación manual para etapas sobre 50%
- Mantener versión vieja escalada hasta 100% de promoción

## Automated Canary Analysis Tools

| Herramienta | Plataforma | Capacidades Clave |
|-------------|------------|----------------------|
| **Flagger** | Kubernetes | Canary automatizado, A/B testing, progressive delivery |
| **Spinnaker** | Multi-cloud | Canary driven por pipelines con análisis de métricas |
| **Argo Rollouts** | Kubernetes | Blue-green, canary y templates de análisis |
| **AWS App Mesh** | AWS | Traffic shifting con métricas de CloudWatch |
| **Google Cloud Traffic Director** | GCP | División de tráfico basada en porcentaje |

## Lo que funciona

- Empieza pequeño. 1% de canary detecta la mayoría de problemas sin impacto mayor de usuarios.
- Usa métricas significativas. Las métricas de negocio a menudo detectan problemas que las métricas técnicas no ven.
- Mantén sesiones persistentes. Enruta el mismo usuario a la misma versión para evitar inconsistencia.
- Ten un rollback instantáneo. El canary debe revertir en segundos, no minutos.
- Practica el rollback. Prueba tu procedimiento de rollback antes de necesitarlo.
- Documenta cada canary. Nota qué cambió, qué se observó y la decisión final.

## Common Mistakes

- Acelerar la promoción. Saltear bake time porque "se ve bien" lleva a incidentes.
- Monitorear solo métricas técnicas. Un bug de cambio puede no mostrarse en tasas de error pero afectará conversiones.
- Enrutamiento inconsistente. Usuarios rebotando entre versiones crean confusión y bugs.
- Olvidar compatibilidad de base de datos. Ambas versiones deben funcionar con el schema actual.
- No escalar canary apropiadamente. Canaries sub-provisionados fallan bajo carga, causando rollbacks falsos.

## Variants

- Shadow canary: Enviar tráfico duplicado a canary sin impactar al usuario (sin riesgo, pero duplica carga)
- Dark launch: Desplegar a producción pero ocultar detrás de feature flags
- Canary geográfico: Rollout región por región (US-East primero, luego Europa, luego Asia)
- Canary basado en tiempo: Enrutar usuarios internos durante horas hábiles, luego externos después de validación

## FAQ

**Q: ¿Con qué porcentaje debería empezar un canary?**
Empieza con 1% para servicios de alto tráfico, 5-10% para menor tráfico. El objetivo es suficiente tráfico para métricas estadísticamente significativas.

**Q: ¿Cuánto debería durar cada etapa de canary?**
Mínimo 10-15 minutos por etapa para servicios de alto tráfico. Para bajo tráfico, extiende a 30-60 minutos para reunir suficientes datos.

**Q: ¿Cuál es la diferencia entre canary y A/B testing?**
Canary prueba salud de infraestructura y regresión. A/B testing prueba comportamiento de usuario y efectividad de funcionalidad. Se pueden combinar.

**Q: ¿Debería usar canary para cada despliegue?**
Para servicios críticos, sí. Para herramientas internas o cambios de bajo riesgo, el despliegue directo puede ser aceptable.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.

## Conclusion

El despliegue canary es la forma más segura de liberar software a escala. Al exponer cambios a una audiencia pequeña y controlada primero, detectas problemas temprano, minimizas el radio de explosión y construyes confianza en cada release. Combina análisis automatizado de métricas con promoción gradual para un proceso de despliegue de primer nivel.

