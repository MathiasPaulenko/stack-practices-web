---
contentType: docs
slug: api-status-page-template
templateType: api-status-page
title: "Plantilla de Página de Estado de API"
description: "Una plantilla para una página de estado de API pública que comunica uptime, incidentes y ventanas de mantenimiento a los consumidores."
metaDescription: "Plantilla de página de estado de API con comunicación de incidentes, ventanas de mantenimiento, definiciones de SLA y mejores prácticas de reporte transparente."
difficulty: beginner
topics:
  - api
  - devops
tags:
  - api
  - status-page
  - template
  - uptime
  - incident-communication
  - sla
  - transparency
  - devops
relatedResources:
  - /docs/templates/incident-communication-template
  - /docs/templates/api-deprecation-notice-template
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de página de estado de API con comunicación de incidentes, ventanas de mantenimiento, definiciones de SLA y mejores prácticas de reporte transparente."
  keywords:
    - template
---

## Mejores Prácticas

- **Actualiza cada 15-30 minutos durante incidentes activos** — El silencio hace que los consumidores asuman lo peor
- **Publica mantenimientos programados con 7 días de anticipación** — Da tiempo a los consumidores para preparar alternativas
- **Usa un dominio separado** — `status.example.com` no debe depender de la API que monitorea. Consulta [Circuit Breaker](/patterns/design/circuit-breaker-pattern) para patrones de resiliencia.
- **Ofrece suscripciones RSS / email / Slack** — Permite que los consumidores elijan cómo recibir actualizaciones
- **Muestra uptime histórico** — Un gráfico de 30 o 90 días genera confianza
- **Sé honesto sobre rendimiento degradado** — No marques un servicio como "operacional" cuando la latencia es 10x la normal. Consulta [Performance Optimization](/guides/performance/performance-optimization-guide) para métricas de monitoreo.
- **Enlaza a [postmortems de incidentes](/docs/templates/incident-postmortem-template)** — La transparencia después de la resolución genera confianza a largo plazo

## Errores Comunes

- Usar la misma infraestructura que la API para la página de estado — si la API cae, la página de estado también
- Marcar incidentes como resueltos demasiado pronto — espera hasta que las métricas confirmen recuperación por al menos 10 minutos
- Borrar o editar el historial de incidentes resueltos — los consumidores necesitan referenciar incidentes pasados
- Actualizaciones vagas como "estamos investigando" — comparte lo que sabes y lo que no sabes
- No definir niveles de severidad — los consumidores no pueden evaluar el impacto sin definiciones claras

## Preguntas Frecuentes

### ¿La página de estado debería ser pública o solo interna?

Pública para APIs orientadas a clientes. Solo interna para servicios puramente internos. Las páginas de estado públicas reducen tickets de soporte y demuestran madurez operacional.

### ¿Con qué frecuencia debo actualizar durante un incidente?

Cada 15-30 minutos, incluso si no hay información nueva. Un mensaje como "Seguimos investigando la causa raíz, próxima actualización a las 15:00 UTC" es mejor que silencio.

### ¿Qué debo hacer si un incidente excede el SLA?

Comunícate proactivamente. No esperes a que los clientes se quejen. Consulta la [Plantilla de Comunicación de Incidentes](/docs/templates/incident-postmortem-template) para actualizaciones estructuradas. Emite un resumen explicando qué pasó, por qué excedió el SLA y qué medidas se están tomando para prevenir recurrencias. Algunas empresas ofrecen créditos de servicio por incumplimientos de SLA.
