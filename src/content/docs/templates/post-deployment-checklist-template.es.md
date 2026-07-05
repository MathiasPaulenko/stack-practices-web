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

## Resumen

Un deployment no está completo cuando el código llega a producción — está completo cuando has verificado que producción se comporta como esperabas. La verificación post-deployment detecta issues que los tests de CI no ven: mismatches de configuración, variables de entorno faltantes, integraciones rotas y regresiones de performance bajo tráfico real.

Esta plantilla cubre:

1. **Health checks** — conectividad de aplicación, base de datos y dependencias
2. **Smoke tests** — paths críticos de usuario bajo condiciones reales
3. **Validación de métricas** — tasas de error, latencia, uso de recursos
4. **Rollback readiness** — puedes revertir rápidamente si algo sale mal?
5. **Sign-off** — quién aprobó el deployment y cuándo

## Cuándo Usar

- **Cada deployment a producción** — sin excepciones, incluso para cambios pequeños
- **Deployments a staging** — verifica antes de promover a producción
- **Cambios de infraestructura** — updates de configuración, scaling events, cambios de DNS
- **Migraciones de base de datos** — verifica que cambios de schema no rompieron queries
- **Verificación de rollback** — confirma que el rollback restauró el comportamiento esperado
- **Después de hotfixes** — incluso fixes urgentes necesitan verificación antes de sign-off

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

## Lifecycle

### Preparación pre-deploy

Antes de deployar, completa la sección de info del deployment. Confirma rollback readiness. Asegura coverage de on-call. Configura baselines de métricas para comparación.

### Deploy y verificación inmediata

Ejecuta health checks inmediatamente después del deploy. Si cualquier check falla, detente e investiga. No procedas a smoke tests hasta que los health checks pasen.

### Monitoreo post-deploy

Ejecuta smoke tests a los 5 minutos, validación de métricas a los 15 minutos. Continúa monitoreando por 1 hora mínimo. Para cambios de alto riesgo, extiende a 24 horas.

### Sign-off y archival

Una vez que todos los checks pasan, recolecta sign-offs del deployer y on-call. Archiva el checklist en el log de deployment. Enlázalo a las release notes y cualquier ADR relacionado.

## Ejemplo Completo

```markdown
# Verificación Post-Deploy: payments-api v3.2.1

## Info del Deployment
| Campo | Valor |
|-------|-------|
| **Deployer** | Jane Doe |
| **Timestamp** | 2026-07-15 14:30 UTC |
| **Ambiente** | producción |
| **Commit de rollback** | a1b2c3d4e5f6 |

## Health Checks

- [x] Aplicación inicia sin errores
- [x] Health endpoint retorna 200: `GET /health`
- [x] Readiness probe pasa
- [x] Liveness probe pasa
- [x] Conectividad a base de datos confirmada
- [x] Conectividad a dependencias externas confirmada (Stripe, PayPal)

## Smoke Tests

- [x] Flujo core: login → crear orden → checkout → logout
- [x] API retorna status codes esperados (200, 201, 400, 401, 500)
- [x] Path crítico: flujo de pago con tarjeta de crédito
- [x] Admin dashboard carga con nuevas métricas

## Validación de Métricas

| Métrica | Pre-Deploy | Post-Deploy | Delta | Alerta? |
|---------|-----------|-------------|-------|---------|
| Tasa de error | 0.05% | 0.04% | -0.01% | No |
| Latencia p95 | 120ms | 118ms | -2ms | No |
| Uso de CPU | 45% | 48% | +3% | No |
| Memoria | 512MB | 520MB | +8MB | No |
| Throughput | 850 req/s | 860 req/s | +10 | No |

## Rollback Readiness

- [x] Script de rollback testeado en últimos 30 días
- [x] Artefactos de versión anterior disponibles (v3.2.0)
- [x] Migración de base de datos es backward-compatible
- [x] Feature flags pueden deshabilitar nuevo código instantáneamente

## Sign-Off

| Rol | Nombre | Hora |
|------|--------|------|
| Deployer | Jane Doe | 14:35 UTC |
| On-call | Bob Smith | 14:40 UTC |
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
- **Configura thresholds de alerta antes de deployar** — sabe qué es "normal" para la nueva versión
- **Ten un timer de decisión de rollback** — si las métricas degradan en 15 minutos, roll back automático

## Errores Comunes

- Saltarse verificación porque "los tests pasaron" — el tráfico de producción es la prueba real
- No chequear tasas de error post-deploy — un deploy que incrementa errores en 0.1% es un deploy fallido
- Asumir que rollback es trivial — testea tu procedimiento de rollback trimestralmente. Para planificación de desastres, consulta la [Plantilla de Plan de Recuperación ante Desastres](/docs/templates/disaster-recovery-plan-template).
- Deployar sin coverage de on-call — si la verificación falla, alguien debe estar disponible para responder
- Chequear muy pocas métricas — CPU y error rate no son suficientes; chequea métricas de negocio también
- Sin criterios de decisión de rollback — define qué dispara un rollback automático antes de deployar

## Variantes

### Verificación de deployment canary

Para deployments canary, compara métricas entre el grupo canary y el grupo estable. Monitorea delta de error rate, delta de latencia y feedback de usuarios. Roll back del canary si cualquier métrica degrada más allá del threshold. Escala gradualmente: 1% → 5% → 25% → 50% → 100%.

### Verificación de deployment blue-green

Para deployments blue-green, corre la nueva versión (green) junto a la vieja (blue). Rutea una porción de tráfico a green, verifica, luego switcha el router. Mantén blue corriendo para rollback instantáneo si green muestra issues.

### Verificación de migración de base de datos

Para deployments con cambios de schema, verifica: migración completada, backward compatibility, performance de queries y uso de índices. Ten un script de migración de rollback testeado en staging. Consulta la [Plantilla de Documentación de Schema de Base de Datos](/docs/templates/database-schema-documentation-template) para tracking de schema.

## Automatización

### Integración CI/CD

```yaml
post-deploy-verification:
  stage: post-deploy
  script:
    - curl -f https://api.example.com/health || exit 1
    - npm run smoke-tests -- --env=production
    - npm run check-metrics -- --threshold=baseline.json
  after_script:
    - npm run notify-team -- --status=$CI_JOB_STATUS
  only:
    - main
```

### Probes de health automatizados

Configura monitoreo sintético que hit tus health endpoints cada 60 segundos. Configura alertas para cualquier respuesta non-200. Usa herramientas como Pingdom, UptimeRobot o AWS CloudWatch Synthetics.

### Auto-rollback basado en métricas

Configura tu sistema de deployment para auto-rollback cuando el error rate exceda un umbral dentro de los primeros 15 minutos. Kubernetes canaries con Argo Rollouts o AWS CodeDeploy soportan esto nativamente.

## Preguntas Frecuentes

### ¿Cuánto tiempo debería monitorear después del deployment?

Mínimo: health checks inmediatamente, smoke tests a los 5 minutos, métricas a los 15 minutos, y métricas de negocio a la 1 hora. Para cambios de alto riesgo, extiende a 24 horas con revisión de seguimiento.

### ¿Qué pasa si los smoke tests fallan pero las métricas se ven bien?

Investiga inmediatamente. Los smoke tests cubren paths críticos de usuarios; los dashboards de métricas pueden no detectar regresiones funcionales. No declares éxito hasta que los smoke tests pasen.

### ¿Debería automatizar o manualizar el checklist?

Automatiza health checks y smoke tests en CI. Consulta la [Guía de Monitoreo y Alertas](/guides/devops/monitoring-alerting-guide) para probes. La verificación manual es para juicios de negocio críticos ("¿el flujo de checkout se siente bien?"). El objetivo es gates automatizados con supervisión humana.

### ¿Qué métricas debería trackear post-deployment?

Trackea cuatro categorías: infraestructura (CPU, memoria, disco), aplicación (error rate, latencia, throughput), negocio (conversion rate, revenue, active users) y externas (tiempo de respuesta de APIs de terceros, tasa de entrega de webhooks). Compara cada una contra baselines pre-deploy.

### ¿Cuándo debería hacer rollback vs fix forward?

Roll back cuando: el error rate aumenta significativamente, flujos críticos de usuario se rompen, o la seguridad se compromete. Fix forward cuando: el issue es cosmético, un bug menor con fix rápido disponible, o rollback causaría pérdida de datos. En duda, roll back — es más seguro y rápido.

### ¿Cómo manejo deployments con breaking changes de base de datos?

Usa el patrón expand-contract: deploya el nuevo código que soporta ambos schemas (viejo y nuevo), migra los datos, luego deploya código que usa solo el nuevo schema. Nunca deployes breaking schema changes y code changes en el mismo release. Consulta la [Plantilla de Documentación de Schema](/docs/templates/database-schema-documentation-template) para tracking de migraciones.

### ¿Quién debería completar el checklist?

El deployer completa la info del deployment y corre health checks. El ingeniero on-call verifica métricas y firma. Para cambios de alto riesgo, una tercera persona (release manager o tech lead) debería revisar el checklist completo antes de declarar éxito.

### ¿Qué pasa si no tengo un script de rollback?

Crea uno antes de tu próximo deployment. Un script de rollback debería: detener la nueva versión, restaurar el artefacto anterior, revertir migraciones de base de datos si es necesario, y reiniciar el servicio. Testéalo en staging primero. Sin un rollback testeado, estás deployando sin red de seguridad.

### ¿Cómo verifico dependencias externas post-deploy?

Llama cada dependencia externa directamente: hit al health endpoint del payment gateway, verifica que el email service responde, chequea que el CDN sirve assets. No asumas que los servicios externos están saludables porque tu app inició — pueden estar degradados en formas que solo aparecen bajo operaciones específicas.

### ¿Debería notificar a stakeholders después del deployment?

Sí. Envía un mensaje breve al canal del equipo: qué se deployó, dónde, cuándo, y si la verificación pasó. Para cambios user-facing, notifica a customer support. Para cambios de infraestructura, notifica al equipo on-call. Mantenlo corto — un párrafo, no un reporte.

### ¿Cómo manejo deployments multi-región?

Deploya a una región primero. Corre el checklist completo ahí. Una vez verificado, deploya a la siguiente región. Monitorea el lag de replicación cross-región. Ten un plan de rollback a nivel región. Si una región falla, rutea tráfico a regiones saludables mientras investigas.

### ¿Qué pasa si el deployment tiene éxito pero el performance degrada?

Verifica si la degradación está dentro de thresholds aceptables. Si latencia p95 aumentó menos de 10% y error rate sin cambios, monitorea de cerca. Si latencia aumentó más de 20% o error rate spikeó, roll back inmediatamente. Degradación de performance suele indicar un índice faltante, N+1 query o resource contention.

### Debería correr el checklist para deployments a staging?

Sí. La verificación en staging detecta issues antes de producción. Corre una versión condensada: health checks y smoke tests son suficientes. Omite la validación completa de métricas a menos que staging refleje tráfico de producción. Los checks en staging te dan confianza antes del deploy a producción.
