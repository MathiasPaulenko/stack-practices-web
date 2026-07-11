---
contentType: docs
slug: slo-document-template
templateType: slo-document
title: "Plantilla de Documento SLO (Service Level Objective)"
description: "Plantilla de documento SLO que define targets de confiabilidad, presupuestos de error y políticas de escalación para servicios y plataformas."
metaDescription: "Plantilla de documento SLO: define targets de confiabilidad, presupuestos de error y políticas de escalación para servicios. Construye cultura SRE."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - reliability
  - sre
  - template
  - ci-cd
relatedResources:
  - /guides/devops/on-call-incident-response-guide
  - /guides/devops/monitoring-alerting-guide
  - /docs/templates/incident-postmortem-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de documento SLO: define targets de confiabilidad, presupuestos de error y políticas de escalación para servicios. Construye cultura SRE."
  keywords:
    - plantilla slo
    - service level objective
    - plantilla error budget
    - targets sre confiabilidad
    - formato documento slo
---

# Plantilla de Documento SLO (Service Level Objective)

Usa esta plantilla para definir targets de confiabilidad que equilibran felicidad de usuarios con velocidad de ingeniería. Consulta la [Guía de Monitoreo y Alertas](/guides/devops/monitoring-alerting-guide) para recolección de métricas y la [Guía de Respuesta a Incidentes On-Call](/guides/devops/on-call-incident-response-guide) para procedimientos de escalamiento.

## Plantilla

```markdown
# SLO: [Nombre del Servicio]

## Overview
| Campo | Valor |
|-------|-------|
| **Servicio** | [nombre] |
| **Dueño** | [equipo o individuo] |
| **Fecha de revisión** | [trimestral] |

## SLIs (Service Level Indicators)

| SLI | Descripción | Medición |
|-----|-------------|----------|
| **Disponibilidad** | Ratio de requests exitosos | (total - errores) / total |
| **Latencia** | Distribución de tiempo de respuesta | p95, p99 por endpoint |
| **Throughput** | Requests por segundo | RPS en pico |

## SLOs (Targets)

| Objetivo | Target | Ventana de Medición |
|----------|--------|---------------------|
| Disponibilidad | 99.9% | 30 días rolling |
| Latencia p95 | < 200ms | 7 días rolling |
| Tasa de error | < 0.1% | 24 horas rolling |

## Presupuesto de Error

- **Presupuesto:** 100% - target SLO (ej. 0.1% para 99.9% disponibilidad)
- **Período:** 30 días
- **Política:** Cuando el presupuesto de error está > 50% consumido en < 50% del período, congelar deploys no críticos

## Umbrales de Alertas

| Severidad | Umbral | Respuesta |
|-----------|--------|-----------|
| Page | 10% del presupuesto consumido en 1 hora | On-call responde inmediatamente |
| Ticket | 50% del presupuesto consumido en 7 días | Equipo revisa en siguiente sprint |

## Dependencias

| Dependencia | Su SLO | Impacto Si Fallan |
|-------------|--------|-------------------|
| Payment API | 99.95% | Nuestro SLO de checkout baja |
| Identity Provider | 99.9% | Fallas de login afectan disponibilidad |
```

## Elegiendo el SLO Correcto

| Impacto de Usuario | SLO Típico | Razonamiento |
|-------------------|------------|--------------|
| Path crítico (pagos, login) | 99.99% (4 nines) | El downtime bloquea revenue directamente |
| Importante pero no crítico | 99.9% (3 nines) | ~43 min downtime/mes aceptable |
| Herramientas internas | 99% (2 nines) | ~7 horas downtime/mes aceptable |

## Política de Presupuesto de Error

```
Presupuesto restante | Política
---------------------|--------
> 50%               | Operaciones normales
25-50%              | Freeze de deploy para cambios riesgosos
< 25%               | Freeze de deploy excepto fixes críticos
< 10%               | Todos en confiabilidad; detener feature work
```

## Lo que funciona

- **Empieza con métricas visibles para usuarios** — "uso de CPU" no es un SLI; "tasa de requests exitosos" sí. Consulta la [Guía de Monitoreo y Alertas](/guides/devops/monitoring-alerting-guide) para selección de métricas.
- **Define SLOs basados en performance actual** — si estás en 99.5% hoy, no prometas 99.99%
- **Revisa trimestralmente** — ajusta targets basado en feedback de usuarios y capacidad de ingeniería
- **Distingue SLI, SLO y SLA** — SLI es la métrica, SLO es el target, SLA es la promesa contractual a clientes

## Errores Comunes

- SLOs demasiado laxos — 99% para una API de pagos significa 7 horas de downtime "aceptable"
- SLOs demasiado estrictos — 99.999% requiere infraestructura cara por beneficio marginal de usuario
- Trackear SLIs que nadie mira — cada SLI necesita un dueño y un ciclo de revisión
- Ignorar quema de presupuesto de error — el presupuesto existe para proteger velocidad de ingeniería, no para ignorarse. Consulta la [Plantilla de Postmortem de Incidente](/docs/templates/incident-postmortem-template) para cuando los SLOs se incumplen.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre SLO y SLA?

Un SLO es un target interno de confiabilidad. Consulta la [Guía de Respuesta a Incidentes On-Call](/guides/devops/on-call-incident-response-guide) para contexto operacional. Un SLA es una promesa contractual a clientes con penalizaciones financieras. Los SLOs usualmente son más estrictos que los SLAs para tener margen antes de incumplir contratos.

### ¿Cuántos SLOs debería tener un servicio?

2-4. Uno de disponibilidad, uno de latencia, y opcionalmente uno de throughput o frescura. Más de 4 se vuelven inmanejables y diluyen el foco.

### ¿Cada microservicio debería tener su propio SLO?

Sí, pero mantenlo proporcional. Un servicio crítico orientado a usuarios necesita SLOs detallados. Un procesador batch interno podría solo necesitar un SLO de disponibilidad. No cada servicio necesita un SLO de latencia.


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Startup | SLOs basicos: disponibilidad y latencia | Objetivo Nivel 2 primero |
| Enterprise | SLOs multi-ventana + error budget policies | Nivel 3-4 con revisiones trimestrales |
| Microservicios | SLOs por servicio + SLOs de dependencia | Incluir SLOs de servicios upstream |
| Batch processing | SLOs de frescura y throughput | La latencia no aplica igual |

## Ejemplo de SLO Completo

```text
=== SLO: payment-service ===

SLI: Tasa de exito de transacciones
  Definicion: requests HTTP 2xx+3xx / total requests HTTP
  Fuente: Prometheus (http_requests_total)
  Query: sum(rate(http_requests_total{service="payment",status!~"5.."}[5m])) / sum(rate(http_requests_total{service="payment"}[5m]))

SLO: 99.9% de exito en ventana de 30 dias
  Error budget: 0.1% = 43.2 minutos de errores en 30 dias
  Alerta fast burn: 2% del budget en 1 hora
  Alerta slow burn: 5% del budget en 6 horas

SLI: Latencia p95
  Definicion: percentil 95 del tiempo de respuesta
  Fuente: Prometheus (http_request_duration_seconds)
  Query: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="payment"}[5m]))

SLO: p95 < 500ms en ventana de 30 dias
  Error budget: 0.1% de requests pueden exceder 500ms

Revision: Trimestral
Owner: Team Payments
```

## Politica de Error Budget

```text
=== Politica de Error Budget ===

Budget restante | Accion
----------------|--------
75-100%         | Desarrollo normal; feature work prioritizado
50-75%          | Desarrollo normal; monitorear tendencias
25-50%          | Freeze de deploys para cambios riesgosos
< 25%           | Freeze excepto fixes criticos
< 10%           | Todos manos a fiabilidad; detener feature work

Excepciones:
- Hotfixes de seguridad: siempre permitidos
- Fixes que restauran budget: siempre permitidos
- Feature flags deshabilitadas: permitidas (no afectan budget)
```

### Como definimos SLIs que importan a los usuarios?

Un buen SLI mide lo que los usuarios experimentan, no lo que la infraestructura hace. "Uso de CPU" no es un SLI — a los usuarios no les importa el CPU. "Tasa de exito de requests" si es un SLI — los usuarios notan cuando sus requests fallan. Para definir SLIs: identifica el viaje del usuario (ej., "usuario hace un pago"). Para cada paso del viaje, define que significa "exitoso" (ej., "transaccion completada en < 500ms"). Mide eso. Evita SLIs de infraestructura (CPU, memoria, disco) a menos que esten directamente correlacionados con la experiencia del usuario. Usa el modelo RED (Rate, Errors, Duration) para servicios y USE (Utilization, Saturation, Errors) para infraestructura.

### Como ajustamos SLOs que son demasiado agresivos?

Si un SLO es demasiado agresivo (el equipo consistentemente quema el error budget): no bajes el SLO inmediatamente. Primero, investiga por que el SLO no se cumple: hay bugs recurrentes? dependencias inestables? deuda tecnica? Si la causa es sistemica: crea un plan de mejora de fiabilidad antes de ajustar el SLO. Si despues de 1-2 trimestres de mejora el SLO sigue sin cumplirse: ajusta el SLO a un nivel alcanzable. Documenta el cambio y la razon. Comunica a stakeholders que el SLO se ajusta para ser realista. Nunca ajustes un SLO despues de un solo mal mes — puede ser una anomalia. Usa datos de 2-3 meses para decisiones de ajuste de SLO.

### Como comunicamos SLOs a stakeholders no tecnicos?

Traduce SLOs a lenguaje de negocio: "99.9% de disponibilidad significa que el servicio puede estar caido 43 minutos por mes." En lugar de "p95 < 500ms", usa "el 95% de las requests se completan en menos de medio segundo." Conecta SLOs a impacto de negocio: "cada minuto de caida del servicio de pagos cuesta $10,000 en transacciones perdidas." Usa dashboards visuales con semaforos (verde/amarillo/rojo) en lugar de numeros. Reporta SLOs mensualmente a liderazgo. Incluye el error budget restante y las acciones tomadas cuando se agota. No uses jerga (SLI, SLO, burn rate) con stakeholders no tecnicos — traduce a impacto.

### Que herramientas necesitamos para implementar SLOs?

Para implementar SLOs necesitas: un sistema de monitoreo (Prometheus, Datadog) para recolectar metricas. Un sistema de dashboards (Grafana) para visualizar SLOs y error budgets. Un sistema de alertas (Alertmanager, PagerDuty) para alertas basadas en burn rate. Opcionalmente: una herramienta de SLO (Sloth, Prometheus Operator, Nobl9) para automatizar el calculo de error budget y las alertas. Para servicios sin metricas tradicionales (batch, event-driven): usa herramientas como OpenTelemetry para generar metricas personalizadas. Empieza simple — Prometheus + Grafana es suficiente para Nivel 2. Agrega herramientas especializadas cuando alcances Nivel 3-4.


































































































End of document. Review and update quarterly.