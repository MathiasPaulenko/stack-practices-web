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

## Mejores Prácticas

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
