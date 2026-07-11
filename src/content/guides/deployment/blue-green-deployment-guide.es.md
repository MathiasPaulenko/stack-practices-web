---
contentType: guides
slug: blue-green-deployment-guide
title: "Despliegue Blue-Green"
description: "Guía práctica sobre despliegues blue-green: arquitectura, estrategias de cambio de tráfico, migraciones de base de datos y lograr releases sin downtime con rollback instantáneo."
metaDescription: "Aprende despliegue blue-green: releases sin downtime, cambio de tráfico, migraciones de base de datos y estrategias de rollback instantáneo."
difficulty: intermediate
topics:
  - devops
  - infrastructure
  - performance
tags:
  - blue-green
  - deployment
  - zero-downtime
  - rollback
  - traffic-switching
  - infrastructure
  - guia
relatedResources:
  - /guides/deployment/canary-deployment-guide
  - /guides/deployment/feature-flags-guide
  - /guides/devops/sre-practices-guide
  - /guides/planning/capacity-planning-guide
  - /guides/planning/disaster-recovery-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende despliegue blue-green: releases sin downtime, cambio de tráfico, migraciones de base de datos y estrategias de rollback instantáneo."
  keywords:
    - blue-green
    - deployment
    - zero-downtime
    - rollback
    - traffic-switching
    - infrastructure
    - guia
---

## Overview

El despliegue blue-green es una estrategia de release que mantiene dos entornos de producción idénticos: blue (activo) y green (inactivo). Las nuevas versiones se despliegan al entorno inactivo, se validan y luego el tráfico cambia instantáneamente. Si surgen problemas, el rollback es simplemente otro cambio de tráfico.

A continuación: diseño de arquitectura, mecanismos de cambio de tráfico, manejo de migraciones de base de datos y lo que funciona operacionalmente.

## When to Use

- Necesitas despliegues sin downtime para servicios críticos
- La velocidad de rollback es más importante que la eficiencia de recursos
- Tu aplicación puede ejecutarse en dos entornos paralelos completos
- Tienes suficiente capacidad de infraestructura para ejecutar entornos duplicados
- Los cambios de base de datos son compatibles hacia atrás o pueden desacoplarse

## Core Concepts

| Concepto | Descripción |
|----------|-------------|
| **Entorno Blue** | Entorno de producción actualmente activo sirviendo tráfico real |
| **Entorno Green** | Objetivo de despliegue de la nueva versión; inactivo hasta que la validación pase |
| **Cambio de Tráfico** | Enrutar todo el tráfico de usuarios de blue a green instantáneamente |
| **Rollback** | Revertir tráfico a blue si green muestra problemas |
| **Warm-up** | Precargar cachés y conexiones antes de cambiar el tráfico |
| **Compatibilidad de Base de Datos** | Requisito de que los cambios de schema funcionen con código viejo y nuevo |

## Architecture

```
┌─────────────────┐
│   Load Balancer  │
│   (Router/Proxy) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼────┐
│ Blue  │  │ Green │
│ (Live)│  │ (Idle)│
└───────┘  └───────┘
```

## Step-by-Step Blue-Green Deployment

### 1. Preparar el Entorno Green

Despliega la nueva versión al entorno inactivo:

```bash
# Ejemplo: Blue-green de Kubernetes con Services
# Entorno Blue (actual live)
apiVersion: v1
kind: Service
metadata:
  name: myapp-blue
  labels:
    version: blue
spec:
  selector:
    app: myapp
    version: blue
  ports:
    - port: 80
      targetPort: 8080

# Entorno Green (nueva versión)
apiVersion: v1
kind: Service
metadata:
  name: myapp-green
  labels:
    version: green
spec:
  selector:
    app: myapp
    version: green
  ports:
    - port: 80
      targetPort: 8080
```

**Checklist de preparación:**
- Desplegar nueva versión a green con sizing idéntico de recursos
- Ejecutar smoke tests y health checks contra green
- Precalentar cachés y pools de conexiones
- Verificar que green puede manejar carga completa de producción
- Mantener blue corriendo y saludable durante preparación

### 2. Cambiar Tráfico

Mover todo el tráfico de blue a green:

```bash
# Ejemplo: Cambio de tráfico en NGINX
# Actualizar configuración de upstream y recargar
upstream myapp {
    server green-env.internal:8080;  # Cambiar a green
    # server blue-env.internal:8080;  # Comentar blue
}

# Recargar sin downtime
sudo nginx -s reload

# Ejemplo: Cambio de target group en AWS ALB
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/green
```

**Estrategias de cambio de tráfico:**
- **Cambio DNS:** Actualizar CNAME (lento debido a propagación TTL)
- **Load balancer:** Cambiar target group o backend upstream (instantáneo)
- **Service mesh:** Actualizar reglas de routing de virtual service (instantáneo)
- **API gateway:** Actualizar configuración de endpoint backend (instantáneo)

### 3. Monitorear Post-Cambio

Observar problemas inmediatamente después del cambio:

| Métrica | Umbral de Alerta | Acción |
|---------|-------------------|--------|
| Tasa de error | >0.1% de incremento | Disparar rollback |
| Latencia p95 | >20% de incremento | Disparar rollback |
| CPU/Memoria | >80% de utilización | Escala green o rollback |
| KPI de negocio custom | Cualquier regresión | Disparar rollback |

```bash
# Ejemplo: Disparador automatizado de rollback
#!/bin/bash
ERROR_RATE=$(curl -s "http://monitoring/api/v1/query?query=rate(errors[5m])" | jq '.data.result[0].value[1]')
THRESHOLD=0.001

if (( $(echo "$ERROR_RATE > $THRESHOLD" | bc -l) )); then
  echo "Tasa de error $ERROR_RATE excede umbral. Iniciando rollback."
  ./switch-traffic.sh --target=blue
  exit 1
fi
```

### 4. Rollback (Si es Necesario)

Revertir instantáneamente a blue si green falla:

```bash
# Ejemplo: Script de rollback instantáneo
#!/bin/bash
set -e

TARGET=${1:-blue}

echo "Haciendo rollback de tráfico a ${TARGET}..."

# Actualizar load balancer
case $TARGET in
  blue)
    kubectl patch service myapp-active -p '{"spec":{"selector":{"version":"blue"}}}'
    ;;
  green)
    kubectl patch service myapp-active -p '{"spec":{"selector":{"version":"green"}}}'
    ;;
esac

echo "Rollback completo. Verificando salud..."
curl -f http://myapp-active/health
```

**Consideraciones de rollback:**
- Mantener entorno blue corriendo por 1-2 horas post-cambio (o más)
- Asegurar que los cambios de base de datos sean compatibles hacia atrás para rollback
- Tener un runbook con pasos exactos de rollback
- Practicar drills de rollback trimestralmente

### 5. Decomisionar Blue

Después de que green esté estable, desmantelar blue:

```bash
# Ejemplo: Checklist de decomisión segura
# 1. Esperar 24-48 horas de operación estable en green
# 2. Verificar que no hay tráfico hacia blue vía access logs
# 3. Archivar estado del entorno blue (para forense si se necesita)
# 4. Escala blue a cero o eliminar recursos
# 5. Actualizar documentación con nueva baseline (green se convierte en blue para próximo despliegue)
```

## Database Considerations

Los cambios de base de datos son la parte más difícil de los despliegues blue-green:

| Estrategia | Cuándo Usar | Complejidad |
|------------|-------------|-------------|
| **Schema compatible hacia atrás** | Todos los cambios funcionan con código viejo y nuevo | Baja |
| **Patrón expand-contract** | Agregar en un release, eliminar en el siguiente | Media |
| **Base de datos por entorno** | Requiere aislamiento completo de datos | Alta |
| **Read replicas** | Cambiar tráfico de lectura independientemente | Media |

```sql
-- Ejemplo: Migración compatible hacia atrás
-- Paso 1 (antes del despliegue): Agregar nueva columna como nullable
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;

-- Paso 2 (nuevo código escribe en ambas columnas vieja y nueva)
-- Código viejo ignora nueva columna

-- Paso 3 (siguiente release): Rellenar y hacer no-nullable
UPDATE users SET email_verified = false WHERE email_verified IS NULL;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
```

## Lo que funciona

- **Mantén entornos verdaderamente idénticos.** Mismo OS, versiones de runtime, límites de recursos y configuración.
- **Automatiza todo el cambio.** Los cambios manuales de DNS o configuración son propensos a errores.
- **Monitorea antes, durante y después.** Las métricas de baseline ayudan a detectar regresiones.
- **Planifica el drift de base de datos.** Las bases de datos compartidas entre entornos requieren cuidadoso orden de migraciones.
- **Practica el rollback regularmente.** El mejor momento para probar rollback es cuando no lo necesitas.
- **Documenta la decisión de cambio.** Nota por qué ocurrió el cambio y qué se observó.

## Common Mistakes

- **Cambiar tráfico sin health checks.** Siempre valida green antes de enrutar usuarios.
- **Ignorar estado de base de datos.** Los cambios de schema deben ser compatibles con ambos entornos.
- **Eliminar blue demasiado rápido.** Espera un período de horneado antes de decomisionar.
- **Tamaño desigual de entornos.** Green debe manejar 100% del tráfico; no sub-provisiones.
- **Olvidar sesiones persistentes.** Los usuarios con estado de sesión pueden ver logout o pérdida de datos.

## Variants

- **Infraestructura inmutable:** Construir nuevos AMIs/contenedores en lugar de actualizar en su lugar
- **Blue-green con feature flags:** Usar feature flags para controlar porcentaje de tráfico dentro de green
- **Blue-green multi-región:** Cambiar regiones enteras entre blue y green
- **Blue-green de base de datos:** Replicar base de datos y cambiar connection strings

## FAQ

**Q: ¿Cuánta infraestructura extra requiere blue-green?**
100% — ejecutas dos entornos completos. Este es el trade-off por el rollback instantáneo.

**Q: ¿Puedo usar blue-green con servicios stateful?**
Sí, pero con cuidado. El estado de sesión debe ser externalizado (Redis, base de datos). Los cambios de base de datos requieren migraciones compatibles hacia atrás.

**Q: ¿Cuál es la diferencia entre blue-green y canary?**
Blue-green cambia todo el tráfico a la vez. Canary enruta un pequeño porcentaje primero, aumentando gradualmente.

**Q: ¿Cuánto tiempo debo mantener el entorno viejo después del cambio?**
Manténlo por al menos un día hábil (24 horas) o hasta que estés seguro de que la nueva versión es estable.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.

## Conclusion

El despliegue blue-green es el estándar de oro para releases sin downtime con rollback instantáneo. Requiere infraestructura duplicada pero proporciona confianza sin igual. Combínalo con health checks automatizados, migraciones de base de datos compatibles hacia atrás y monitoreo exhaustivo para un proceso de release a prueba de balas.
