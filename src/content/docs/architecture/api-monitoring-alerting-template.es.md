---
contentType: docs
slug: api-monitoring-alerting-template
title: "Plantilla de Monitoreo y Alertas de API"
description: "Una plantilla para definir umbrales de SLA, alertas de tasa de error y dashboards de monitoreo para APIs."
metaDescription: "Usa esta plantilla de monitoreo de APIs para configurar umbrales de SLA, alertas de tasa de error y monitoreo de latencia para tus APIs."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - api
  - monitoring
  - alerting
  - sla
  - template
relatedResources:
  - /docs/api-lifecycle-management-template
  - /docs/microservice-contract-template
  - /docs/service-dependency-map-template
  - /docs/system-diagram-template
  - /docs/technical-spec-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de monitoreo de APIs para configurar umbrales de SLA, alertas de tasa de error y monitoreo de latencia para tus APIs."
  keywords:
    - arquitectura
    - api
    - monitoreo
    - alertas
    - sla
    - plantilla
---
## Visión General

Las APIs fallan en silencio. Un servicio que devuelve 200 OK puede estar roto para los consumidores si la latencia se dispara o las tasas de error aumentan gradualmente. Esta plantilla define SLIs (Indicadores de Nivel de Servicio), SLOs (Objetivos) y umbrales de alerta para que los equipos detecten la degradación antes de que los consumidores se den cuenta.

## Cuándo Usar

Usa este recurso cuando:
- Lanzas una nueva API o versión que necesita garantías de uptime
- Auditas la cobertura de monitoreo existente después de un incidente
- Defines reglas de alerta y políticas de escalamiento para on-call

## Solución

```markdown
# Monitoreo y Alertas de API: `<Nombre de la API>`

## 1. Metadatos del Servicio

| Campo | Valor |
|-------|-------|
| Nombre de API | `nombre` |
| Equipo Responsable | `@team-name` |
| Nivel | `P0 (crítico) / P1 (importante) / P2 (estándar)` |
| Número de Consumidores | Internos: X, Externos: Y |

## 2. SLIs (Indicadores que Medimos)

| SLI | Métrica | Fuente de Datos |
|-----|---------|-----------------|
| Disponibilidad | `% de requests con 2xx/3xx` | Logs de load balancer o gateway |
| Latencia | `p95, p99 de tiempo de respuesta` | APM (Datadog, New Relic) |
| Tasa de Error | `% de respuestas 5xx / total` | Logs de aplicación |
| Throughput | `Requests por minuto` | Servidor de métricas (Prometheus) |
| Saturación | `CPU / Memoria / Conexiones DB` | Métricas de infraestructura |

## 3. SLOs (Objetivos que Prometemos)

| SLO | Objetivo | Ventana de Medición | Alerta de Burn Rate |
|-----|----------|---------------------|---------------------|
| Disponibilidad | 99.9% | 30 días | 2% de presupuesto en 1 hora |
| Latencia p95 | < 200ms | 7 días | 5x normal en 1 hora |
| Tasa de Error | < 0.1% | 30 días | 10% de presupuesto en 1 día |

## 4. Definición de Alertas

### 4.1. Alertas de Página (Despiertan a Alguien)

| Condición | Umbral | Duración | Severidad |
|-----------|--------|----------|-----------|
| Tasa de error > 1% | > 1% | 2 minutos | P1 |
| Latencia p95 > 1s | > 1000ms | 3 minutos | P1 |
| Disponibilidad < 99% | < 99% | 1 minuto | P0 |

### 4.2. Alertas de Advertencia (Ticket / Slack)

| Condición | Umbral | Duración | Acción |
|-----------|--------|----------|--------|
| Tasa de error > 0.1% | > 0.1% | 10 minutos | Crear ticket Jira |
| Latencia p95 > 300ms | > 300ms | 15 minutos | Notificar canal Slack |
| Caída de tráfico > 50% | < 50% baseline | 5 minutos | Página on-call (posible caída) |

### 4.3. Alertas Informativas (Solo Dashboard)

| Condición | Propósito |
|-----------|-----------|
| Throughput > 10x baseline | Detectar tráfico viral o DDoS |
| Tasa de 4xx > 5% | Detectar misconfiguración de clientes |

## 5. Diseño del Dashboard

**Fila 1: Resumen de Salud**
- Gauge de disponibilidad (última 1h, 24h, 7d)
- Heatmap de latencia por endpoint
- Línea de tiempo de tasa de error

**Fila 2: Desglose por Endpoint**
- Top 10 endpoints por latencia
- Top 10 endpoints por tasa de error
- Trazas más lentas (enlazadas a APM)

**Fila 3: Infraestructura**
- CPU y memoria de pods/contenedores
- Pool de conexiones de base de datos
- Profundidad de cola (si es async)

## 6. Enlaces a Runbooks

| Alerta | Runbook |
|--------|---------|
| Pico de tasa de error | `/runbooks/api-error-spike` |
| Degradación de latencia | `/runbooks/api-latency-spike` |
| Caída de tráfico | `/runbooks/api-traffic-drop` |
```

## Explicación

Los SLIs son **qué** mides, los SLOs son **qué tan bueno** debe ser, y las alertas son **cuándo** actuar. La plantilla separa alertas de página (requieren intervención humana) de advertencias (pueden esperar a horario laboral). Las alertas de burn rate detectan violaciones de SLO temprano al rastrear qué tan rápido se consume tu presupuesto de error. Las filas del dashboard agrupan métricas relacionadas para que el ingeniero on-call pueda hacer triaje en menos de 30 segundos.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Microservicios internos | SLOs más bajos, alertas más simples | 99% disponibilidad, alertas solo por Slack |
| API pública SaaS | SLOs estrictos, paging multi-canal | 99.99% disponibilidad, PagerDuty + SMS |
| Serverless / Lambda | Enfocarse en cold start y concurrencia | Alertar por throttling, no CPU |

## Mejores Prácticas

1. Alertar por síntomas (latencia, errores) no por causas (disco lleno) para reducir ruido
2. Definir cada umbral de alerta basado en burn rate de SLO, no en porcentajes arbitrarios
3. Incluir enlaces a runbooks directamente en los mensajes de alerta
4. Revisar y ajustar umbrales mensualmente; los falsos positivos erosionan la confianza
5. Usar canales diferentes para página vs advertencia para que on-call sepa la urgencia inmediatamente

## Errores Comunes

1. Alertar por CPU > 80% sin vincularlo a síntomas que afectan al usuario
2. Establecer el mismo SLO para todas las APIs sin importar su criticidad de negocio
3. Usar latencia promedio en lugar de percentiles (los promedios ocultan outliers)
4. Alertar por errores individuales sin umbral de duración o tasa
5. Olvidar alertar por caídas de tráfico (la ausencia de errores puede significar falla total)

## Preguntas Frecuentes

### ¿Qué es un presupuesto de error y cómo lo calculo?

Presupuesto de error = 100% - objetivo SLO. Para 99.9% de disponibilidad, tu presupuesto es 0.1% de downtime por mes (~43 minutos). Si lo consumes en un día, la alerta de SLO se dispara.

### ¿Debería alertar por errores 4xx?

Generalmente no para alertas de página. Los 4xx indican errores del cliente, no del servidor. Alerta si la tasa de 4xx se dispara por encima de un umbral que sugiere un cambio que rompe clientes (ej. app móvil con endpoint hardcodeado).

### ¿Cómo evito la fatiga de alertas?

Ajusta umbrales para que cada alerta se dispare < 3 veces por semana. Si una alerta se dispara diariamente y siempre es benigna, aumenta el umbral o conviértela en una métrica solo de dashboard. Cada alerta debe tener un runbook documentado.
