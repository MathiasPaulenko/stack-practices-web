---
contentType: docs
slug: post-deployment-checklist-template
templateType: post-deployment-checklist
title: "Plantilla de Checklist Post-Deploy"
description: "Plantilla de checklist para verificar deployments: health checks, smoke tests, validación de métricas y rollback readiness antes de declarar all-clear."
metaDescription: "Checklist post-deployment: health checks, smoke tests, validación de métricas y rollback readiness antes de declarar un deployment exitoso."
difficulty: beginner
topics:
  - devops
tags:
  - deployment
  - devops
  - template
  - ci-cd
  - automation
relatedResources:
  - /docs/templates/release-notes-template
  - /guides/devops/cicd-pipeline-guide
  - /guides/devops/monitoring-alerting-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Checklist post-deployment: health checks, smoke tests, validación de métricas y rollback readiness antes de declarar un deployment exitoso."
  keywords:
    - checklist post deployment template
    - verificacion deploy checklist
    - smoke test template
    - checklist validacion deploy
    - pasos verificacion release
---

# Plantilla de Checklist Post-Deploy

Usa este checklist antes de declarar un deployment exitoso. Combínalo con la [Plantilla de Release Notes](/docs/templates/release-notes-template) para comunicación y la [Guía de CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para automatización.

## Plantilla

```markdown
# Verificación Post-Deploy: [Servicio] v[X.Y.Z]

## Info del Deployment
| Campo | Valor |
|-------|-------|
| **Deployer** | [nombre] |
| **Timestamp** | [AAAA-MM-DD HH:MM UTC] |
| **Ambiente** | [staging / producción] |
| **Commit de rollback** | [SHA] |

## Health Checks

- [ ] Aplicación inicia sin errores
- [ ] Health endpoint retorna 200: `GET /health`
- [ ] Readiness probe pasa
- [ ] Liveness probe pasa
- [ ] Conectividad a base de datos confirmada
- [ ] Conectividad a dependencias externas confirmada

## Smoke Tests

- [ ] Flujo core de usuario: [login → acción → logout]
- [ ] API retorna status codes esperados
- [ ] Flujo crítico de pagos
- [ ] Admin dashboard carga

## Validación de Métricas

| Métrica | Pre-Deploy | Post-Deploy | Delta | Alerta? |
|---------|-----------|-------------|-------|---------|
| Tasa de error | 0.05% | ___ | ___ | ___ |
| Latencia p95 | 120ms | ___ | ___ | ___ |
| Uso de CPU | 45% | ___ | ___ | ___ |

## Rollback Readiness

- [ ] Script de rollback testeado en últimos 30 días
- [ ] Artefactos de versión anterior disponibles
- [ ] Migración de base de datos es backward-compatible
- [ ] Feature flags pueden deshabilitar nuevo código instantáneamente

## Sign-Off

| Rol | Nombre | Hora |
|------|--------|------|
| Deployer | | |
| On-call | | |
```

## Guías de Timing

| Tipo de Check | Cuándo | Duración |
|--------------|--------|----------|
| Health checks | Inmediatamente después del deploy | 2 minutos |
| Smoke tests | 5 minutos post-deploy | 10 minutos |
| Validación de métricas | 15 minutos post-deploy | 10 minutos |
| Validación completa | 1 hora post-deploy | Monitoreo continuo |

## Lo que funciona

- **Automatiza el checklist** — CI debería fallar el deploy si los health checks no pasan. Consulta la [Guía de CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para integración.
- **Testea rollback antes de necesitarlo** — un rollback que nunca testeaste es una apuesta. Consulta la [Plantilla de Plan de Recuperación ante Desastres](/docs/templates/disaster-recovery-plan-template) para planificación amplia.
- **Mantén la versión anterior warm** — deployments blue-green te permiten volver instantáneamente. Consulta la [Guía de Estrategias de Deployment](/guides/devops/deployment-strategies-guide) para patrones.
- **Usa monitoreo sintético** — probes externos detectan issues que tus checks internos no ven
- **Documenta actual vs esperado** — las desviaciones se convierten en datos de respuesta a incidentes

## Errores Comunes

- Saltarse verificación porque "los tests pasaron" — el tráfico de producción es la prueba real
- No chequear tasas de error post-deploy — un deploy que incrementa errores en 0.1% es un deploy fallido
- Asumir que rollback es trivial — testea tu procedimiento de rollback trimestralmente. Para planificación de desastres, consulta la [Plantilla de Plan de Recuperación ante Desastres](/docs/templates/disaster-recovery-plan-template).
- Deployar sin coverage de on-call — si la verificación falla, alguien debe estar disponible para responder

## Preguntas Frecuentes

### ¿Cuánto tiempo debería monitorear después del deployment?

Mínimo: health checks inmediatamente, smoke tests a los 5 minutos, métricas a los 15 minutos, y métricas de negocio a la 1 hora. Para cambios de alto riesgo, extiende a 24 horas con revisión de seguimiento.

### ¿Qué pasa si los smoke tests fallan pero las métricas se ven bien?

Investiga inmediatamente. Los smoke tests cubren paths críticos de usuarios; los dashboards de métricas pueden no detectar regresiones funcionales. No declares éxito hasta que los smoke tests pasen.

### ¿Debería automatizar o manualizar el checklist?

Automatiza health checks y smoke tests en CI. Consulta la [Guía de Monitoreo y Alertas](/guides/devops/monitoring-alerting-guide) para probes. La verificación manual es para juicios de negocio críticos ("¿el flujo de checkout se siente bien?"). El objetivo es gates automatizados con supervisión humana.
