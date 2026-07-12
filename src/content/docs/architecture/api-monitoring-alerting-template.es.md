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
  - /docs/api-error-handling-guideline
  - /docs/api-performance-budget-template
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


- For alternatives, see [API Lifecycle Management Template](/es/docs/api-lifecycle-management-template/).

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

## Reglas de Alerta con Prometheus

Define alertas como codigo para que esten versionadas y sean revisables:

```yaml
groups:
  - name: api_slo_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.01
        for: 2m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "Tasa de error arriba de 1% por 2 minutos"
          runbook: "/runbooks/api-error-spike"

      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95, rate(
            http_request_duration_seconds_bucket[5m]
          )) > 1.0
        for: 3m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "Latencia p95 arriba de 1s por 3 minutos"
          runbook: "/runbooks/api-latency-spike"

      - alert: SLOBurnRateFast
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) > 0.002
        for: 5m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "Burn rate de SLO excede 2% del presupuesto en 1 hora"
          runbook: "/runbooks/slo-burn-rate"

      - alert: TrafficDrop
        expr: |
          sum(rate(http_requests_total[5m]))
          <
          sum(rate(http_requests_total[5m] offset 1h)) * 0.5
        for: 5m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "Trafico cayo 50% comparado con hace 1 hora"
          runbook: "/runbooks/api-traffic-drop"
```

## JSON de Dashboard Grafana

Un panel minimal de dashboard para rastreo de tasa de error:

```json
{
  "dashboard": {
    "title": "Resumen de Monitoreo de API",
    "panels": [
      {
        "title": "Tasa de Error (5xx)",
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                { "value": null, "color": "green" },
                { "value": 0.1, "color": "yellow" },
                { "value": 1, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "title": "Latencia p95 por Endpoint",
        "type": "heatmap",
        "gridPos": { "h": 8, "w": 12, "x": 6, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum by (endpoint, le) (rate(http_request_duration_seconds_bucket[5m]))) * 1000",
            "legendFormat": "{{endpoint}}"
          }
        ],
        "fieldConfig": {
          "defaults": { "unit": "ms" }
        }
      }
    ]
  }
}
```

## Plantilla de Runbook

Cada alerta debe enlazar a un runbook. Aqui hay una plantilla minimal:

```markdown
# Runbook: Pico de Errores de API

## Condicion de Alerta
Tasa de error > 1% por 2+ minutos (P1)

## Triaje Rapido (menos de 60 segundos)
1. Revisa el dashboard: que endpoints estan devolviendo 5xx?
2. Revisa despliegues recientes: hubo un release en los ultimos 30 minutos?
3. Revisa salud de dependencias: hay servicios upstream caidos?

## Pasos de Mitigacion
1. Si un despliegue malo causo el pico, revierte a la version anterior
2. Si una dependencia esta caida, activa el fallback del circuit breaker
3. Si el trafico es anormal, activa rate limiting en el gateway

## Post-Incidente
1. Presenta un reporte de incidente dentro de 24 horas
2. Agrega la causa raiz a la lista de problemas conocidos
3. Actualiza este runbook con cualquier nuevo paso de mitigacion
```

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Microservicios internos | SLOs mas bajos, alertas mas simples | 99% disponibilidad, alertas solo por Slack |
| API publica SaaS | SLOs estrictos, paging multi-canal | 99.99% disponibilidad, PagerDuty + SMS |
| Serverless / Lambda | Enfocarse en cold start y concurrencia | Alertar por throttling, no CPU |
| Event-driven | Alertar por lag y profundidad de DLQ | El lag del consumidor es el equivalente de latencia |

## Lo que funciona

1. Alertar por sintomas (latencia, errores) no por causas (disco lleno) para reducir ruido
2. Definir cada umbral de alerta basado en burn rate de SLO, no en porcentajes arbitrarios
3. Incluir enlaces a runbooks directamente en los mensajes de alerta
4. Revisar y ajustar umbrales mensualmente; los falsos positivos erosionan la confianza
5. Usar canales diferentes para pagina vs advertencia para que on-call sepa la urgencia inmediatamente
6. Rastrear volumen de alertas por semana para identificar alertas ruidosas que necesitan ajuste
7. Agregar un boton de "alerta de prueba" en tu herramienta de alertas para verificar que el paging funciona end-to-end

## Errores Comunes

1. Alertar por CPU > 80% sin vincularlo a sintomas que afectan al usuario
2. Establecer el mismo SLO para todas las APIs sin importar su criticidad de negocio
3. Usar latencia promedio en lugar de percentiles (los promedios ocultan outliers)
4. Alertar por errores individuales sin umbral de duracion o tasa
5. Olvidar alertar por caidas de trafico (la ausencia de errores puede significar falla total)
6. No probar la entrega de alertas (rotacion de PagerDuty, webhook de Slack) antes de un incidente
7. Crear alertas sin runbooks, dejando a los ingenieros on-call adivinar pasos de mitigacion

## Preguntas Frecuentes

### ¿Que es un presupuesto de error y como lo calculo?

Presupuesto de error = 100% - objetivo SLO. Para 99.9% de disponibilidad, tu presupuesto es 0.1% de downtime por mes (~43 minutos). Si lo consumes en un dia, la alerta de SLO se dispara.

### ¿Deberia alertar por errores 4xx?

Generalmente no para alertas de pagina. Los 4xx indican errores del cliente, no del servidor. Alerta si la tasa de 4xx se dispara por encima de un umbral que sugiere un cambio que rompe clientes (ej. app movil con endpoint hardcodeado).

### ¿Como evito la fatiga de alertas?

Ajusta umbrales para que cada alerta se dispare < 3 veces por semana. Si una alerta se dispara diariamente y siempre es benigna, aumenta el umbral o conviertela en una metrica solo de dashboard. Cada alerta debe tener un runbook documentado.

### ¿Cual es la diferencia entre SLI, SLO y SLA?

SLI es la metrica que mides (ej. latencia p95). SLO es el objetivo que estableces para esa metrica (ej. p95 < 200ms). SLA es el acuerdo formal con consumidores que incluye consecuencias por no cumplir el SLO (ej. creditos de servicio).

### ¿Como configuro alertas de burn rate?

Una alerta de burn rate se dispara cuando estas consumiendo tu presupuesto de error demasiado rapido. Para un SLO de 30 dias de 99.9%, un burn rate de 1 hora de 14.4x significa que agotaras todo el presupuesto mensual en 2 horas. Configura alertas de burn rapido (ventana 1h, umbral 14.4x) para pagina y burn lento (ventana 6h, umbral 6x) para advertencias.

### ¿Deberia monitorear endpoints individuales o agregar?

Ambos. El monitoreo agregado te dice si la API esta saludable en general. El monitoreo por endpoint te dice que endpoint esta causando el problema. Establece SLOs a nivel de endpoint para caminos criticos y a nivel agregado para salud general.

### ¿Que herramientas debo usar para monitoreo de APIs?

Prometheus para metricas, Grafana para dashboards, PagerDuty u Opsgenie para paging, y una herramienta APM (Datadog, New Relic, Honeycomb) para tracing distribuido. Usa OpenTelemetry para instrumentacion neutral respecto al proveedor.
