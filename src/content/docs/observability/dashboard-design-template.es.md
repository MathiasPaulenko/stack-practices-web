---


contentType: docs
slug: dashboard-design-template
title: "Plantilla de Diseño de Dashboards"
description: "Una plantilla para diseñar dashboards de observabilidad con SLOs, error budgets, service health e información contextual para on-call teams."
metaDescription: "Usá esta plantilla de diseño de dashboards para crear observability dashboards con SLOs, error budgets, service health panels e info contextual."
difficulty: intermediate
topics:
  - testing
tags:
  - observability
  - dashboard
  - template
  - grafana
  - slo
  - error-budget
  - monitoring
relatedResources:
  - /docs/observability-maturity-assessment-template
  - /docs/alert-runbook-template
  - /docs/incident-postmortem-template
  - /guides/complete-guide-structured-logging
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de diseño de dashboards para crear observability dashboards con SLOs, error budgets, service health panels e info contextual."
  keywords:
    - dashboard design
    - observability dashboard
    - grafana template
    - slo dashboard
    - error budget
    - monitoring
    - template


---

## Overview

Un dashboard es un visual interface que answer questions sobre system health. Good dashboards reducen time-to-diagnosis durante incidents. Bad dashboards addean noise y confusion. Esta plantilla define el structure para service dashboards que on-call engineers pueden rely on a las 3 AM.

## When to Use


- For alternatives, see [Alert Runbook Template](/es/docs/alert-runbook-template/).

- Creando un new service dashboard
- Rediseñando un existing dashboard que nadie usa
- Estandarizando dashboard layout across teams
- Seteando SLO y error budget tracking
- Preparando dashboards para on-call handoff

## Solution

```markdown
# Dashboard Design: `<Service Name>`

## Dashboard Metadata

| Field | Value |
|-------|-------|
| Dashboard Title | Payment Service Health |
| Dashboard URL | https://grafana.example.com/d/payment-service |
| Owner | Payment Team |
| Last Reviewed | 2026-07-05 |
| Audience | On-call engineers, developers, SRE |
| Refresh Interval | 30 seconds |
| Time Range Default | Last 1 hour |

## 1. Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ROW 1: Service Status Banner                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Health      │  │ SLO Status  │  │ Error Budget│         │
│  │ OK/WARN/ERR │  │ 99.9%       │  │ 72% remain  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ROW 2: RED Metrics (Rate, Errors, Duration)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Request Rate│  │ Error Rate  │  │ p95 Latency │         │
│  │ (req/s)     │  │ (% of total)│  │ (ms)        │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ROW 3: Traffic and Status Codes                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ Requests by endpoint    │  │ Status code distribution│  │
│  │ (stacked area)          │  │ (pie chart)             │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ROW 4: Infrastructure Health                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ CPU Usage   │  │ Memory      │  │ DB Conns    │         │
│  │ (%)         │  │ (MB)        │  │ (active/idle)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ROW 5: Business Metrics                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Orders/min  │  │ Revenue/min │  │ Success Rate│         │
│  │             │  │ ($)         │  │ (%)         │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ROW 6: Context and Links                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Runbook | Logs | Traces | Alerts | Deploy Info     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. Panel Specifications

### Row 1: Service Status Banner

| Panel | Type | Query | Thresholds | Purpose |
|-------|------|-------|------------|---------|
| Health | Stat | `up{service="payment"}` | OK: 1, WARN: 0.5, ERR: 0 | Quick health check |
| SLO Status | Stat | `payment_slo_availability_ratio` | OK: > 0.999, WARN: > 0.99, ERR: < 0.99 | SLO compliance at a glance |
| Error Budget | Gauge | `payment_error_budget_remaining_pct` | OK: > 30%, WARN: > 10%, ERR: < 10% | Cuánto error budget queda |

### Row 2: RED Metrics

| Panel | Type | Query | Thresholds | Purpose |
|-------|------|-------|------------|---------|
| Request Rate | Time series | `rate(http_requests_total{service="payment"}[5m])` | — | Traffic volume |
| Error Rate | Time series | `rate(http_requests_total{service="payment",status=~"5.."}[5m]) / rate(http_requests_total{service="payment"}[5m])` | WARN: > 1%, ERR: > 5% | Error percentage |
| p95 Latency | Time series | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="payment"}[5m]))` | WARN: > 500ms, ERR: > 1s | Response time |

### Row 3: Traffic and Status Codes

| Panel | Type | Query | Purpose |
|-------|------|-------|---------|
| Requests by endpoint | Stacked area | `sum(rate(http_requests_total{service="payment"}[5m])) by (endpoint)` | Ver traffic distribution |
| Status code distribution | Pie chart | `sum(rate(http_requests_total{service="payment"}[5m])) by (status)` | Spotear error patterns |

### Row 4: Infrastructure Health

| Panel | Type | Query | Thresholds | Purpose |
|-------|------|-------|------------|---------|
| CPU Usage | Time series | `rate(container_cpu_usage_seconds_total{pod=~"payment.*"}[5m]) * 100` | WARN: > 70%, ERR: > 90% | Resource saturation |
| Memory | Time series | `container_memory_working_set_bytes{pod=~"payment.*"}` | WARN: > 80% limit, ERR: > 95% | Memory pressure |
| DB Connections | Time series | `payment_db_connections_active` / `payment_db_connections_max` | WARN: > 70%, ERR: > 90% | Pool exhaustion |

### Row 5: Business Metrics

| Panel | Type | Query | Thresholds | Purpose |
|-------|------|-------|------------|---------|
| Orders/min | Time series | `rate(payment_orders_total[5m]) * 60` | — | Business throughput |
| Revenue/min | Time series | `rate(payment_revenue_total[5m]) * 60` | — | Revenue tracking |
| Success Rate | Stat | `rate(payment_orders_total{status="success"}[5m]) / rate(payment_orders_total[5m])` | WARN: < 99%, ERR: < 95% | Business health |

### Row 6: Context and Links

| Link | URL | Purpose |
|------|-----|---------|
| Runbook | https://runbooks.example.com/payment-service | Incident response |
| Logs | https://kibana.example.com/app/discover#/?_a=(query:service:payment) | Log search |
| Traces | https://jaeger.example.com/search?service=payment | Distributed traces |
| Alerts | https://alertmanager.example.com/#/alerts?receiver=payment | Active alerts |
| Deploy Info | https://grafana.example.com/d/deployments?service=payment | Recent deployments |

## 3. SLO Configuration

### SLO Definition

| SLO | Target | Window | Error Budget | Measurement |
|-----|--------|--------|-------------|-------------|
| Availability | 99.9% | 30 days | 0.1% = 43.2 min | `1 - (failed_requests / total_requests)` |
| Latency p95 | < 500ms | 30 days | 0.1% = 43.2 min | `histogram_quantile(0.95, ...)` |
| Latency p99 | < 2s | 30 days | 0.1% = 43.2 min | `histogram_quantile(0.99, ...)` |

### Error Budget Tracking

| Metric | Query | Purpose |
|--------|-------|---------|
| Budget remaining | `1 - (rate(errors[30d]) / 0.001)` | Cuánto budget queda |
| Burn rate (1h) | `rate(errors[1h]) / 0.001` | Fast burn detection |
| Burn rate (6h) | `rate(errors[6h]) / 0.001` | Sustained burn detection |
| Budget reset date | `30d - elapsed_in_window` | Cuándo budget resetee |

### Alerting Rules

```yaml
# Fast burn: 2% de budget en 1 hour
- alert: PaymentSLOFastBurn
  expr: |
    (
      sum(rate(http_requests_total{service="payment",status=~"5.."}[1h]))
      /
      sum(rate(http_requests_total{service="payment"}[1h]))
    ) > 0.02
  for: 5m
  labels:
    severity: critical
    service: payment
  annotations:
    summary: "Payment SLO fast burn — 2% budget consumed in 1h"
    runbook: "https://runbooks.example.com/payment-slo-burn"

# Slow burn: 5% de budget en 6 hours
- alert: PaymentSLOSlowBurn
  expr: |
    (
      sum(rate(http_requests_total{service="payment",status=~"5.."}[6h]))
      /
      sum(rate(http_requests_total{service="payment"}[6h]))
    ) > 0.005
  for: 30m
  labels:
    severity: warning
    service: payment
  annotations:
    summary: "Payment SLO slow burn — 5% budget consumed in 6h"
    runbook: "https://runbooks.example.com/payment-slo-burn"
```

## 4. Dashboard Variables

| Variable | Type | Query | Default | Purpose |
|----------|------|-------|---------|---------|
| $datasource | Data source | — | Prometheus | Switch entre environments |
| $environment | Query | `label_values(up, environment)` | production | Filter por environment |
| $instance | Query | `label_values(up{service="payment"}, instance)` | All | Filter por instance |
| $endpoint | Query | `label_values(http_requests_total{service="payment"}, endpoint)` | All | Filter por endpoint |
| $timeframe | Interval | — | 1h | Quick time range switch |

## 5. Annotation Layers

| Annotation | Query | Purpose |
|------------|-------|---------|
| Deployments | `deployments{service="payment"}` | Correlateá changes con metric shifts |
| Incidents | `incidents{service="payment"}` | Mirá incident impact en metrics |
| Maintenance | `maintenance{service="payment"}` | Expected dips durante maintenance |
| Alerts | `alerts{service="payment"}` | Cuándo alerts firearon relative a metrics |
```

## Explanation

Dashboard design sigue un top-down structure: status first, luego metrics, luego context. El status banner (Row 1) answer "is everything OK?" en un glance. RED metrics (Row 2) answer "what's the rate, errors y duration?" — los three signals que coverean most service issues. Traffic breakdown (Row 3) helpa a identify qué endpoints son problematic. Infrastructure health (Row 4) muestra si el service tiene resources para operate. Business metrics (Row 5) connectea technical health a business impact. Context links (Row 6) proveen quick access a logs, traces y runbooks.

SLOs y error budgets son el quantitative backbone. El SLO define qué "healthy" means objectivamente. El error budget trackea cuánto room tiene el team para errors antes de breakear el SLO. Burn rate alerts catchean both fast-burning incidents (2% budget en 1 hour) y slow-burning trends (5% budget en 6 hours).

Dashboard variables le dejan a engineers filterar sin escribir queries. La `$endpoint` variable es especially useful: cuando un alert firea para un specific endpoint, el engineer puede filterear el dashboard a ese endpoint en un click.

Annotation layers correlatean deployments e incidents con metric changes. Cuando latency spikea, ver un deployment annotation en el same timestamp inmediatamente pointa al cause.

## Checklist de Revision de Dashboard

```text
=== Revision Trimestral de Dashboard ===

[ ] Todos los paneles tienen fuentes de datos validas (sin paneles "No data")
[ ] Los umbrales reflejan SLOs y baselines de rendimiento actuales
[ ] Las variables retornan valores correctos (entornos, instancias, endpoints)
[ ] Las capas de anotaciones siguen recibiendo eventos (deploys, incidentes)
[ ] Los links a runbooks, logs, y traces no estan rotos
[ ] Ningun panel tiene mas de 10 series (check de cardinalidad)
[ ] La codificacion de colores es consistente (verde/amarillo/rojo en todos)
[ ] El dashboard carga en menos de 3 segundos
[ ] La vista movil es legible (ingenieros on-call revisan desde el telefono)
[ ] Al menos otro ingeniero puede interpretar el dashboard sin explicacion
[ ] Los paneles de SLO coinciden con las definiciones actuales de SLO
[ ] El panel de error budget es preciso y no muestra datos obsoletos
[ ] Los paneles de metricas de negocio reflejan los KPIs actuales
[ ] Los paneles no usados fueron removidos (revisar metrica de vistas de Grafana)
[ ] El dashboard esta etiquetado con nombre de servicio y equipo dueno
```


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Database dashboard | Reemplazá RED con USE (Utilization, Saturation, Errors) | Focus en resource metrics |
| Queue consumer | Addeá lag, throughput y processing time | Consumer-specific metrics |
| Multi-service overview | Aggregateá RED metrics across services | Usá service map para dependencies |
| Business dashboard | Focus en business KPIs, no infrastructure | Revenue, conversion, churn |
| On-call handoff | Addeá shift notes, open incidents, action items | Context para incoming on-call |

## What Works

1. Poné la most important information arriba — health status y SLO deberían ser visible sin scrollear
2. Usá consistent color coding — green = OK, yellow = warning, red = error across all panels
3. Linkeá a runbooks, logs y traces — reducí navigation time durante incidents
4. Usá variables para filtering — le dejá a engineers drill down sin escribir queries
5. Addeá deployment annotations — correlateá changes con metric shifts
6. Seteá realistic thresholds — basá en historical data, no guesses
7. Revieweá dashboards quarterly — remové panels que nadie mira, addeá missing metrics
8. Mantené dashboards readable en un phone — on-call engineers checkean desde mobile

## Common Mistakes

1. Too many panels — dashboards con 50 panels son walls de noise. Mantené under 15 panels.
2. No status summary — forzando a engineers a interpret 10 charts para saber si things están OK
3. No thresholds — lines sin thresholds requieren interpretation. Seteá visual thresholds.
4. No links a context — dashboards sin links a logs, traces y runbooks son dead ends
5. Stale dashboards — metrics cambian, services evolucionan. Revieweá quarterly.
6. Mixing audiences — un dashboard para executives y un dashboard para on-call engineers son different things
7. No variables — forzando a engineers a editar queries para filter por endpoint o instance
8. Too high cardinality — panels con 100 series son unreadable. Aggregateá appropriately.

## Frequently Asked Questions

### ¿Cuántos panels debería tener un dashboard?

8-15 panels. Más que eso y el dashboard se vuelve un wall de noise. Si necesitás más, spliteá en multiple dashboards: un overview, un detailed. El overview debería answer "is everything OK?" en 5 seconds.

### ¿Deberíamos usar Grafana o buildear un custom dashboard?

Grafana para engineering dashboards. Integra con Prometheus, tiene variables, annotations y alerting. Custom dashboards para business-facing views dónde branding matters. No buildees custom dashboards para engineering use — Grafana es better y free.

### ¿Cómo elegimos SLO targets?

Basalos en historical performance, no aspiration. Si tu service ha estado en 99.5% availability por 6 months, setear un 99.99% SLO es unrealistic. Empezá con current performance, luego tighten over time. El SLO debería ser achievable pero requiring effort para maintain.

### ¿Qué es un error budget?

El error budget es el amount de unreliability que te podés afford mientras todavía meets tu SLO. Para un 99.9% SLO over 30 days, el error budget es 43.2 minutes de downtime. Cuando el budget se exhaust, el team debería stoppear shipping features y focus en reliability.

### ¿Deberíamos tener separate dashboards para cada environment?

Sí. Production, staging y development tienen different metrics, different traffic patterns y different audiences. Un production dashboard es para on-call engineers. Un staging dashboard es para QA. Mantenelos separados para avoid confusion.


### Como manejamos la proliferacion de dashboards?

La proliferacion de dashboards ocurre cuando cada ingeniero crea dashboards sin gobernanza. Para manejarlo: asigna un dueno de dashboard para cada dashboard. Etiqueta dashboards con nombre de servicio y equipo. Revisa dashboards trimestralmente — si un dashboard no ha sido visto en 30 dias, archivalo. Usa carpetas de Grafana para organizar por equipo o servicio. Crea un conjunto de "dashboards dorados" que son mantenidos y confiables. Desalienta dashboards personales en carpetas compartidas. Proporciona plantillas para que los ingenieros empiecen desde una base consistente. Rastrea metricas de uso de dashboards para identificar dashboards abandonados.

### Que metricas deberia tener cada dashboard de servicio?

Cada dashboard de servicio deberia incluir las metricas RED: Rate (requests por segundo), Errors (porcentaje de tasa de error), y Duration (latencia p95 y p99). Adicionalmente: utilizacion de CPU y memoria, uso del pool de conexiones de base de datos, y salud de dependencias (upstream y downstream). Para servicios criticos de negocio, agrega metricas de negocio (ordenes/min, ingresos/min, tasa de conversion). Para consumidores de cola, agrega lag, throughput, y tiempo de procesamiento. Las metricas RED cubren el 80% de la salud del servicio — el resto es especifico del servicio.

### Como disenamos dashboards para respuesta a incidentes?

Durante un incidente, los ingenieros necesitan informacion rapida. Disena para respuesta a incidentes: pon el banner de estado arriba (indicador verde/rojo). Muestra las metricas RED despues — estas identifican la mayoria de los problemas. Usa paneles grandes con umbrales claros para que sean legibles desde el otro lado del cuarto. Agrega links a logs, traces, y runbooks directamente en el dashboard. Usa capas de anotaciones para despliegues para que los ingenieros puedan correlacionar cambios. Evita queries complejas que cargan lentamente — un dashboard que tarda 10 segundos en cargar es inutil durante un incidente. Prueba el dashboard durante un ejercicio de simulacro para verificar que proporciona la informacion correcta.

### Como compartimos dashboards con stakeholders no tecnicos?

Para ejecutivos y product managers: crea un dashboard separado orientado a negocio con KPIs (ingresos, conversion, porcentaje de uptime, usuarios activos). Evita metricas tecnicas (CPU, latencia p99, pools de conexiones). Usa visualizaciones simples (paneles stat, gauges, numeros individuales). Agrega un banner de estado que muestre verde/rojo. Programa capturas de pantalla regulares o exportaciones PDF via reporting de Grafana. Manten el dashboard simple — si un stakeholder pregunta "que significa esto?" el dashboard ha fallado. Actualiza el dashboard cuando las prioridades de negocio cambien.
