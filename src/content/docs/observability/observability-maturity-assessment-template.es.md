---


contentType: docs
slug: observability-maturity-assessment-template
title: "Plantilla de Evaluación de Madurez de Observabilidad"
description: "Una plantilla para evaluar madurez de logging, metrics y tracing across teams con scoring, gap analysis y improvement roadmap."
metaDescription: "Usá esta plantilla de evaluación de madurez de observabilidad para scorear logging, metrics, tracing, identify gaps y buildear un improvement roadmap."
difficulty: intermediate
topics:
  - testing
tags:
  - observability
  - assessment
  - template
  - logging
  - metrics
  - tracing
  - maturity-model
relatedResources:
  - /docs/alert-runbook-template
  - /docs/dashboard-design-template
  - /docs/incident-postmortem-template
  - /guides/complete-guide-structured-logging
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de evaluación de madurez de observabilidad para scorear logging, metrics, tracing, identify gaps y buildear un improvement roadmap."
  keywords:
    - observability maturity
    - assessment template
    - logging
    - metrics
    - tracing
    - maturity model
    - gap analysis


---

## Overview

Observability maturity describe qué tan well un team puede answer questions sobre su system sin deployear new code. El spectrum va desde "checkeamos logs cuando algo se rompe" hasta "detectamos anomalies proactivamente antes de que users noten." Esta plantilla provee un structured assessment across logging, metrics, tracing, alerting y culture.

## When to Use


- For alternatives, see [Alert Runbook Template](/es/docs/alert-runbook-template/).

- Quarterly reliability reviews
- Onboardéando un new team a observability standards
- Preparándote para SRE engagement o platform migration
- Justificando observability tooling investment a stakeholders
- Estableciendo un baseline antes de improvement initiatives

## Solution

```markdown
# Observability Maturity Assessment — `<Team / Service>`

## Assessment Information

| Field | Value |
|-------|-------|
| Assessed By | <Name> |
| Date | 2026-07-05 |
| Team / Service | Payments Team |
| Current Score | 2.4 / 5.0 |
| Target Score | 4.0 / 5.0 |
| Target Date | 2026-10-05 |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Reactive | Logs existen pero unstructured. No metrics o traces. Debugging es manual. |
| 2 | Basic | Structured logs. Key metrics collected. No tracing. Alerts son noisy. |
| 3 | Proactive | Structured logs + dashboards + distributed tracing. SLOs defined. Alerts son actionable. |
| 4 | Predictive | Anomaly detection. SLO-based alerting. Error budgets tracked. Runbooks para all alerts. |
| 5 | Autonomous | Automated remediation. Continuous profiling. Self-healing systems. Observability as code. |

## 1. Logging Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| Log structure | Structured JSON | 3 | All services usan `pino` con JSON output | — |
| Log levels | Used correctamente | 2 | Debug logs left en production, noisy | Addeá log level policies |
| Correlation IDs | Present en all requests | 3 | `X-Request-ID` propagated via middleware | — |
| Log retention | 30 days hot, 90 cold | 3 | ELK stack con ILM policies | — |
| Log searchability | Queryable by field | 3 | Elasticsearch con structured fields | — |
| Sensitive data | Scrubbed antes de logging | 2 | Algunos endpoints loggean full request bodies | Addeá PII redaction filter |
| **Logging Average** | | **2.7** | | |

### Logging Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| Debug logs en production | Level 2 | Level 3 | Seteá production log level a `info`, remové debug statements | 1 day |
| PII en request logs | Level 2 | Level 4 | Addeá redaction filter para email, phone, SSN fields | 2 days |
| No log-based alerts | Level 2 | Level 3 | Creá alerts para error log spikes per service | 1 day |

## 2. Metrics Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| RED metrics (Rate, Errors, Duration) | Collected para all services | 3 | Prometheus + custom exporters | Addeá duration histograms para 2 services |
| USE metrics (Utilization, Saturation, Errors) | Collected para infrastructure | 3 | Node exporter, cAdvisor | — |
| Business metrics | Order count, revenue, conversion | 2 | Algunos metrics en Mixpanel, no en Prometheus | Exposeá business metrics desde app |
| Metric cardinality | Controlled | 2 | Algunos high-cardinality labels (user_id) | Remové user_id labels, usá exemplars |
| Dashboards | Per-service dashboards | 3 | Grafana dashboards para cada service | Addeá business metrics dashboard |
| SLO dashboards | Defined y tracked | 1 | No SLOs defined | Definí SLOs para payment service |
| **Metrics Average** | | **2.3** | | |

### Metrics Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| No SLOs | Level 1 | Level 4 | Definí SLOs: 99.9% availability, p95 < 500ms | 3 days |
| High cardinality labels | Level 2 | Level 3 | Remové user_id de metrics, usá traces para per-user analysis | 1 day |
| Missing business metrics | Level 2 | Level 3 | Exposeá order_count, revenue_total, conversion_rate desde app | 2 days |
| No latency histograms | Level 2 | Level 3 | Reemplazá counter-based duration con Prometheus histograms | 1 day |

## 3. Tracing Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| Distributed tracing | Implemented | 2 | OpenTelemetry SDK en 3 de 8 services | Instrumentá remaining services |
| Trace propagation | W3C trace context | 3 | `traceparent` header propagated | — |
| Span attributes | Standardized | 2 | Algunos services tienen rich spans, otros minimal | Addeá span attributes para DB queries |
| Trace sampling | Head-based + tail-based | 2 | Head-based at 10%, no tail-based | Addeá tail-based sampling para errors |
| Trace correlation | Linked a logs y metrics | 2 | trace_id en logs, pero no en metrics | Addeá exemplars linkeando traces a metrics |
| Service maps | Auto-generated | 3 | Service mesh genera dependency map | — |
| **Tracing Average** | | **2.3** | | |

### Tracing Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| 5 services no instrumentados | Level 2 | Level 4 | Addeá OpenTelemetry SDK a remaining 5 services | 5 days |
| No tail-based sampling | Level 2 | Level 4 | Deployeá OpenTelemetry Collector con tail-based sampling | 2 days |
| Missing DB span attributes | Level 2 | Level 3 | Addeá db.system, db.statement, db.operation attributes | 1 day |
| No trace-to-metric exemplars | Level 2 | Level 4 | Configurá Prometheus exemplars linkeando a trace IDs | 2 days |

## 4. Alerting Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| Alert noise | Low false positive rate | 2 | ~40% de alerts son actionable | Tuneá alert thresholds, remové noisy alerts |
| Alert routing | Routed al correct team | 3 | Alertmanager routea by service label | — |
| Runbooks | Linked a alerts | 1 | Most alerts no tienen runbook | Creá runbooks para top 20 alerts |
| SLO-based alerting | Multi-window burn rate | 1 | No SLO-based alerts | Implementá SLO-based alerting una vez SLOs defined |
| Alert escalation | Defined escalation policy | 3 | PagerDuty con 3-level escalation | — |
| Alert context | Incluye dashboard links, logs | 2 | Algunos alerts incluyen Grafana links | Addeá runbook y log links a all alerts |
| **Alerting Average** | | **2.0** | | |

### Alerting Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| No runbooks | Level 1 | Level 4 | Escribí runbooks para top 20 alerts | 5 days |
| 60% false positives | Level 2 | Level 4 | Auditeá all alerts, tuneá o remové noisy ones | 3 days |
| No SLO-based alerting | Level 1 | Level 4 | Implementá multi-window burn rate alerts | 3 days |
| Missing alert context | Level 2 | Level 3 | Addeá runbook URL, dashboard URL, log query a alert annotations | 1 day |

## 5. Culture and Process Assessment

| Criterion | Level | Score | Evidence | Gap |
|-----------|-------|-------|----------|-----|
| Observability ownership | Cada team owns sus dashboards | 3 | Teams crean y mantienen sus own dashboards | — |
| Incident review | Postmortems para all incidents | 3 | Blameless postmortems within 48 hours | — |
| Action item tracking | Tracked a completion | 2 | Action items created pero ~40% overdue | Addeá monthly action item review |
| On-call culture | Sustainable rotation | 3 | 1-week rotation, 3 engineers, follow-the-sun | — |
| Observability training | New hires trained | 1 | No formal onboarding para observability tools | Creá observability onboarding guide |
| **Culture Average** | | **2.4** | | |

### Culture Gaps

| Gap | Current | Target | Action | Effort |
|-----|---------|--------|--------|--------|
| No observability onboarding | Level 1 | Level 3 | Creá onboarding guide para logging, metrics, tracing tools | 2 days |
| Action items overdue | Level 2 | Level 4 | Monthly review de postmortem action items, assigná owners | 0.5 days |

## 6. Overall Score

| Dimension | Score | Target | Gap |
|-----------|-------|--------|-----|
| Logging | 2.7 | 4.0 | 1.3 |
| Metrics | 2.3 | 4.0 | 1.7 |
| Tracing | 2.3 | 4.0 | 1.7 |
| Alerting | 2.0 | 4.0 | 2.0 |
| Culture | 2.4 | 4.0 | 1.6 |
| **Overall** | **2.3** | **4.0** | **1.7** |

## 7. Improvement Roadmap

| Quarter | Initiative | Dimension | Target Level | Effort | Owner |
|---------|-----------|-----------|-------------|--------|-------|
| Q3 2026 | Definí SLOs para all critical services | Metrics | 3→4 | 3 days | SRE |
| Q3 2026 | Instrumentá remaining 5 services con OTel | Tracing | 2→4 | 5 days | Platform |
| Q3 2026 | Escribí runbooks para top 20 alerts | Alerting | 1→4 | 5 days | Each team |
| Q3 2026 | Auditeá y tuneá noisy alerts | Alerting | 2→4 | 3 days | SRE |
| Q4 2026 | Implementá tail-based sampling | Tracing | 2→4 | 2 days | Platform |
| Q4 2026 | Addeá PII redaction a logs | Logging | 2→4 | 2 days | Platform |
| Q4 2026 | Creá observability onboarding guide | Culture | 1→3 | 2 days | SRE |
| Q4 2026 | Implementá SLO-based alerting | Alerting | 1→4 | 3 days | SRE |
| Q1 2027 | Addeá business metrics a Prometheus | Metrics | 2→3 | 2 days | Backend |
| Q1 2027 | Monthly action item review process | Culture | 2→4 | 0.5 days | Eng Manager |
```

## Explanation

El assessment usa un 5-level maturity model across five dimensions: logging, metrics, tracing, alerting y culture. Cada dimension se scorea independently, luego se averagea para un overall score. El scoring es evidence-based: every score debe incluir concrete evidence (tools used, policies in place, metrics collected).

El gap analysis es el actionable output. Para cada criterion below target, el template identify qué está missing, qué necesita pasar y el estimated effort. Esto feedea directamente al improvement roadmap.

El roadmap sequencea improvements by quarter, balanceando quick wins (tunear alerts, addear log levels) con larger initiatives (SLO definition, full tracing instrumentation). Cada item tiene un owner y effort estimate, haciéndolo actionable para sprint planning.

## Definiciones de Niveles de Madurez

```text
=== Nivel 1: Ad Hoc ===
  Logging:    No estructurado, ad-hoc, sin centralizacion
  Metricas:   Metricas basicas de infra (CPU, memoria, disco)
  Tracing:    Ninguno o correlacion basada en logs
  Alertas:    Basadas en umbrales, alta tasa de falsos positivos
  Cultura:    Reactiva, sin postmortems, sin SLOs

=== Nivel 2: Basico ===
  Logging:    Centralizado pero no estructurado (ELK, CloudWatch)
  Metricas:   RED metrics para algunos servicios, dashboards Grafana
  Tracing:    Algunos servicios instrumentados, propagacion basica
  Alertas:    Basadas en umbrales, algunos runbooks, routing PagerDuty
  Cultura:    Postmortems para incidentes mayores, on-call basico

=== Nivel 3: Estructurado ===
  Logging:    JSON estructurado, centralizado, correlation IDs
  Metricas:   RED metrics para todos, SLOs definidos
  Tracing:    OpenTelemetry en todos, propagacion de traces
  Alertas:    Alertas basadas en SLO, runbooks para todas
  Cultura:    Postmortems blameless, tracking de action items, capacitacion on-call

=== Nivel 4: Proactivo ===
  Logging:    Estructurado, PII redacted, alertas basadas en logs
  Metricas:   USE + RED + metricas de negocio, alertas SLO
  Tracing:    Tail-based sampling, exemplars trace-to-metric
  Alertas:    Multi-window burn rate, deteccion de anomalias
  Cultura:    Mejora proactiva, onboarding de observability, revisiones trimestrales

=== Nivel 5: Autonomo ===
  Logging:    Analisis automatizado de logs, deteccion de patrones
  Metricas:   Alertas predictivas, forecast de capacidad
  Tracing:    Analisis automatizado de causa raiz desde traces
  Alertas:    Self-healing, remediacion automatizada
  Cultura:    Optimizacion continua, observability as code
```


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Small team (< 10) | Simplificá a 3 dimensions: logs, metrics, alerts | Skippeá tracing si single service |
| Enterprise | Assessá per team, aggregateá para org | Compará teams para identify shared gaps |
| Startup | Focus en basics: structured logs + key metrics | Targeteá Level 2 first |
| Regulated industry | Addeá audit trail y compliance dimension | FDA, SOX, GDPR requirements |
| Microservices | Enfatizá tracing y service maps | Distributed systems necesitan distributed tracing |

## What Works

1. Requerí evidence para every score — "tenemos metrics" no es evidence; "Prometheus collectea RED metrics para all 8 services" sí
2. Scoreá independently per dimension — un team puede ser Level 4 en logging pero Level 1 en tracing
3. Involucrá al team en scoring — self-assessment surfacea issues que outsiders missean
4. Reassessá quarterly — trackeá progress over time, no solo once
5. Priorizá por gap size y effort — fixeá los biggest gaps con el least effort first
6. Assigná owners a roadmap items — unowned improvements no pasan
7. Shareá results across teams — un team's gaps pueden ser otro team's strengths

## Common Mistakes

1. Scorear aspirationalmente — scoreeando dónde querés estar, no dónde estás
2. No evidence — scores sin proof son meaningless
3. One-time assessment — sin reassessment, no podés medir progress
4. Focus solo en tools — culture y process son equally important
5. Ignorar alerting quality — tener alerts no es lo same que tener good alerts
6. No action items — assessment sin improvement plan es wasted effort
7. Comparar teams públicamente sin context — different services tienen different needs

## Frequently Asked Questions

### ¿Cuánto toma un assessment?

Un self-assessment con el team toma 2-4 hours. Gatherear evidence (checkear dashboards, alert configs, tracing setup) toma otro 2-4 hours. Planificá un half-day per team. Para un full organization, assessá un team per day.

### ¿Qué si no tenemos tracing at all?

Scoreá tracing como Level 1. El gap analysis va a identify instrumentar services como el first action. No skippeés el dimension — un Level 1 score communicatea el gap clearly a stakeholders.

### ¿Deberíamos apuntar a Level 5?

No necesariamente. Level 5 (autonomous remediation, self-healing) requiere significant engineering investment y es solo justified para large-scale systems. Most teams deberían targetear Level 3-4. Focus en las dimensions que matter most para tu service.

### ¿Cómo justificamos el investment a stakeholders?

Traducí gaps en business impact: "60% de alerts son false positives, costeando 20 engineering hours per week en interruptions." "No SLOs means que no podemos medir reliability objectivamente." "5 services les falta tracing, haciendo incident diagnosis 3x slower." Usá el roadmap para mostrar ROI: "3 days de SLO definition habilita objective reliability measurement."

### ¿Qué tools necesitamos para cada level?

Level 1-2: Structured logging (pino, Winston), Prometheus, Grafana. Level 3: Addeá OpenTelemetry, Jaeger/Tempo, Alertmanager. Level 4: Addeá SLO tooling (Sloth, Prometheus Operator), anomaly detection. Level 5: Addeá automated remediation (Kubernetes operators, policy engines).


### Como empezamos si estamos en Nivel 1?

Empieza con logging: centraliza todos los logs en un solo lugar (ELK, CloudWatch, Loki). Agrega logging estructurado (formato JSON con campos) a tu servicio mas critico. Luego agrega metricas basicas: CPU, memoria, disco, y tasa de requests para tus top 3 servicios. Crea un solo dashboard de Grafana con estas metricas. Configura alertas basicas: alertas basadas en umbrales para CPU > 80%, tasa de error > 5%. Escribe runbooks para las top 5 alertas. Esto toma 1-2 semanas y te mueve de Nivel 1 a Nivel 2. No intentes implementar todo a la vez — progreso incremental es progreso sostenible.

### Como involucramos a todo el equipo en la evaluacion?

Programa un taller de medio dia con el equipo de ingenieria. Recorre cada dimension juntos. Para cada criterio, pregunta al equipo: "Que evidencia tenemos?" Deja que el equipo se auto-evalue — ellos conocen la realidad mejor que un evaluador externo. Documenta desacuerdos — si un ingeniero evalua Nivel 3 y otro Nivel 1, eso es un hallazgo. Discute las brechas y haz brainstorm de acciones. Asigna duenos y estimaciones de esfuerzo para cada action item. Comparte los resultados con liderazgo. Haz de la evaluacion una cadencia regular — trimestral es ideal.

### Cual es la relacion entre SLOs y madurez de observability?

Los SLOs (Service Level Objectives) son una practica de Nivel 3-4. Requieren: indicadores de nivel de servicio definidos (metricas), tracking de error budget, y alertas basadas en SLO. No puedes tener SLOs significativos sin metricas de Nivel 2+. Los SLOs dirigen la inversion en observability: si tu SLO es 99.9% de disponibilidad, necesitas monitoreo que pueda detectar degradacion del 0.1%. Los SLOs tambien priorizan las alertas — las alertas de burn rate se enfocan en lo que importa a los usuarios, no en lo que importa a la infraestructura. Empieza la implementacion de SLOs con tu servicio mas critico y expande desde ahi.

### Como medimos el ROI de mejoras de observability?

Rastrea estas metricas antes y despues de mejoras: tiempo medio a deteccion (MTTD) de incidentes, tiempo medio a resolucion (MTTR), numero de incidentes detectados por monitoreo vs. reportados por usuarios, tasa de falsos positivos de alertas, horas de ingenieria gastadas en alertas, y puntaje de satisfaccion on-call. Calcula el costo de incidentes antes y despues. Ejemplo: "Antes de tracing, MTTR era 45 minutos. Despues de tracing, MTTR es 15 minutos. A 4 incidentes/mes, esto ahorra 20 horas de ingenieria/mes." Presenta ROI en terminos de horas de ingenieria ahorradas, incidentes prevenidos, e impacto al cliente reducido.


### Como empezamos si estamos en Nivel 1?

Empieza con logging: centraliza todos los logs en un solo lugar (ELK, CloudWatch, Loki). Agrega logging estructurado (formato JSON con campos) a tu servicio mas critico. Luego agrega metricas basicas: CPU, memoria, disco, y tasa de requests para tus top 3 servicios. Crea un solo dashboard de Grafana con estas metricas. Configura alertas basicas: alertas basadas en umbrales para CPU > 80%, tasa de error > 5%. Escribe runbooks para las top 5 alertas. Esto toma 1-2 semanas y te mueve de Nivel 1 a Nivel 2. No intentes implementar todo a la vez — progreso incremental es progreso sostenible.

### Como involucramos a todo el equipo en la evaluacion?

Programa un taller de medio dia con el equipo de ingenieria. Recorre cada dimension juntos. Para cada criterio, pregunta al equipo: "Que evidencia tenemos?" Deja que el equipo se auto-evalue — ellos conocen la realidad mejor que un evaluador externo. Documenta desacuerdos — si un ingeniero evalua Nivel 3 y otro Nivel 1, eso es un hallazgo. Discute las brechas y haz brainstorm de acciones. Asigna duenos y estimaciones de esfuerzo para cada action item. Comparte los resultados con liderazgo. Haz de la evaluacion una cadencia regular — trimestral es ideal.

### Cual es la relacion entre SLOs y madurez de observability?

Los SLOs (Service Level Objectives) son una practica de Nivel 3-4. Requieren: indicadores de nivel de servicio definidos (metricas), tracking de error budget, y alertas basadas en SLO. No puedes tener SLOs significativos sin metricas de Nivel 2+. Los SLOs dirigen la inversion en observability: si tu SLO es 99.9% de disponibilidad, necesitas monitoreo que pueda detectar degradacion del 0.1%. Los SLOs tambien priorizan las alertas — las alertas de burn rate se enfocan en lo que importa a los usuarios, no en lo que importa a la infraestructura. Empieza la implementacion de SLOs con tu servicio mas critico y expande desde ahi.

### Como medimos el ROI de mejoras de observability?

Rastrea estas metricas antes y despues de mejoras: tiempo medio a deteccion (MTTD) de incidentes, tiempo medio a resolucion (MTTR), numero de incidentes detectados por monitoreo vs. reportados por usuarios, tasa de falsos positivos de alertas, horas de ingenieria gastadas en alertas, y puntaje de satisfaccion on-call. Calcula el costo de incidentes antes y despues. Ejemplo: "Antes de tracing, MTTR era 45 minutos. Despues de tracing, MTTR es 15 minutos. A 4 incidentes/mes, esto ahorra 20 horas de ingenieria/mes." Presenta ROI en terminos de horas de ingenieria ahorradas, incidentes prevenidos, e impacto al cliente reducido.
