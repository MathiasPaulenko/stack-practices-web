---
contentType: docs
templateType: postmortem
slug: incident-postmortem-template
title: "Plantilla de Postmortem de Incidente"
description: "Plantilla de postmortem estructurada para analizar incidentes de sistema, identificar causas raíz y prevenir recurrencia."
metaDescription: "Plantilla de postmortem de incidente para retros sin culpa. Analiza caídas, identifica causas raíz y define acciones preventivas."
difficulty: intermediate
topics:
  - devops
tags:
  - postmortem
  - incident-response
  - sre
  - reliability
relatedResources:
  - /es/docs/runbook-template
  - /es/guides/cicd-pipeline-guide
  - /es/guides/security-best-practices-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Plantilla de postmortem de incidente para retros sin culpa. Analiza caídas, identifica causas raíz y define acciones preventivas."
---

## Resumen

Un postmortem es un registro escrito de un incidente, su impacto, las acciones tomadas para mitigarlo o resolverlo, y las acciones de seguimiento para prevenir su recurrencia. Sigue una cultura sin culpa.

## Cuándo Usar

- Después de cualquier incidente significativo en producción
- Cuando se violan objetivos de SLA/SLO
- Para documentar lecciones aprendidas para el equipo
- Requerido por estándares de cumplimiento o regulatorios

## Plantilla

```markdown
# Postmortem de Incidente: [Título del Incidente]

## Metadatos
- **Fecha**: YYYY-MM-DD
- **Severidad**: P1 / P2 / P3 / P4
- **Duración**: HH:MM
- **Impacto**: [Servicios afectados, usuarios impactados]
- **Reportero**: [Nombre]
- **Estado**: Resuelto

## Resumen

[Descripción de 2-3 oraciones de lo que pasó y su impacto]

## Cronología (UTC)

| Hora | Evento |
|------|--------|
| 09:00 | Alerta activada: pool de conexiones de BD agotado |
| 09:05 | Ingeniero reconoció la alerta |
| 09:15 | Servicio escalado temporalmente |
| 09:45 | Causa raíz identificada: leak de conexión en v2.3.1 |
| 10:00 | Hotfix desplegado, incidente resuelto |

## Causa Raíz

[Explicación detallada de qué causó el incidente. Incluye snippets de código,
configuración o diagramas de arquitectura si aplica.]

## Evaluación de Impacto

- **Usuarios afectados**: ~15,000
- **Pico de tasa de error**: 42%
- **Impacto en ingresos**: Mínimo (degradación, no caída total)

## Resolución

[Pasos tomados para resolver el incidente, incluyendo workarounds.]

## Lecciones Aprendidas

### Qué Funcionó Bien
- El monitoreo detectó el problema en 5 minutos
- El runbook estaba actualizado y fue efectivo

### Qué Salió Mal
- El leak de conexión no se detectó en staging
- El procedimiento de rollback fue más lento de lo esperado

## Acciones de Seguimiento

| Acción | Responsable | Fecha Límite | Prioridad |
|--------|-------------|---------------|-----------|
| Agregar monitoreo de pool de conexiones | @sre-team | 2026-06-18 | Alta |
| Mejorar tests de carga en staging | @backend-team | 2026-06-25 | Media |
| Documentar pasos de rollback más rápidos | @sre-team | 2026-06-15 | Alta |
```

## Niveles de Severidad

| Nivel | Descripción | Ejemplo |
|-------|-------------|---------|
| **P1** | Caída crítica | Indisponibilidad total del servicio |
| **P2** | Degradación mayor | Funcionalidades core rotas |
| **P3** | Impacto menor | Funcionalidades no críticas afectadas |
| **P4** | Informativo | Sin impacto en usuarios, riesgo potencial |

## Buenas Prácticas

- **Sin culpa**: Enfócate en fallas de sistema y proceso, no en individuos
- **Específico**: Incluye tiempos exactos, métricas y sistemas afectados
- **Accionable**: Cada postmortem debe tener acciones de seguimiento
- **Oportuno**: Publicar dentro de 48 horas de la resolución
- **Compartido**: Distribuir a todos los stakeholders y almacenar centralmente

## Errores Comunes

- **Enfoque en culpa**: Nombrar individuos en vez de analizar sistemas
- **Cronologías vagas**: Faltan timestamps exactos
- **Sin acciones**: Documentar sin prevenir recurrencia
