---
contentType: docs
slug: deployment-checklist-template
title: "Plantilla de Checklist de Despliegue"
description: "Una checklist de verificación pre-release para despliegues seguros en producción."
metaDescription: "Usa esta plantilla de checklist de despliegue para verificar tests, rollbacks, monitoreo y comunicación antes de cada release en producción."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - deployment
  - checklist
  - release
  - verification
  - template
relatedResources:
  - /docs/post-deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/contributing-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de checklist de despliegue para verificar tests, rollbacks, monitoreo y comunicación antes de cada release en producción."
  keywords:
    - devops
    - despliegue
    - checklist
    - release
    - verificación
    - plantilla
---
## Visión General

Los despliegues en producción son momentos de alto riesgo. Un solo paso omitido puede causar caídas, pérdida de datos o exposiciones de seguridad. Esta plantilla de checklist asegura que cada release siga los mismos pasos de verificación, desde tests pre-merge hasta validación post-despliegue.

## Cuándo Usar

Usa este recurso cuando:
- Preparas cualquier despliegue a producción o staging
- Integras nuevos miembros del equipo al proceso de release
- Auditas el proceso de despliegue después de un incidente

## Solución

```markdown
# Checklist de Despliegue: `<Nombre del Release>`

## Metadatos del Release

| Campo | Valor |
|-------|-------|
| Servicio | `nombre` |
| Versión | `x.y.z` |
| Rama / Commit | `main@abc1234` |
| Desplegador | `@username` |
| Fecha | `YYYY-MM-DD HH:MM UTC` |
| Ticket / PR | `PROJ-123` |

## 1. Pre-Despliegue

### 1.1. Código y Tests

- [ ] Todos los checks de CI pasan (lint, tests unitarios, tests de integración)
- [ ] Code review aprobado por al menos un ingeniero senior
- [ ] Sin alertas de seguridad sin resolver (Snyk, Dependabot)
- [ ] Migraciones de base de datos revisadas para compatibilidad hacia atrás
- [ ] Feature flags configuradas y por defecto apagadas

### 1.2. Infraestructura

- [ ] Entorno staging desplegado y validado
- [ ] Capacidad de producción verificada (CPU, memoria, disco)
- [ ] Reglas de autoscaling revisadas (replicas mínimas / máximas)
- [ ] Artefacto de rollback construido y almacenado (imagen Docker, AMI)
- [ ] Plan de invalidación de caché CDN documentado (si aplica)

### 1.3. Comunicación

- [ ] Stakeholders notificados de la ventana de despliegue
- [ ] Ingeniero on-call disponible
- [ ] Página de estado actualizada a "Mantenimiento" (si hay downtime esperado)
- [ ] Equipos de atención al cliente informados de los cambios

## 2. Despliegue

### 2.1. Base de Datos (si aplica)

- [ ] Scripts de migración probados contra una copia de datos de producción
- [ ] Migración ejecutada con `ALTER TABLE ... ADD COLUMN` (no operaciones destructivas primero)
- [ ] Duración de la migración estimada y aprobada por el DBA
- [ ] Script de rollback preparado para cambios destructivos

### 2.2. Aplicación

- [ ] Desplegar usando estrategia blue/green o canary
- [ ] Monitorear tasa de error durante 5 minutos después de cada incremento de canary
- [ ] Verificar que health checks devuelven 200 OK
- [ ] Confirmar que nuevos pods/contenedores reciben tráfico

### 2.3. Verificación

- [ ] Smoke tests pasan contra endpoints de producción
- [ ] Flujos críticos de usuario probados (login, checkout, búsqueda)
- [ ] Logs no muestran errores o excepciones inesperadas
- [ ] Métricas dentro de la línea base (latencia p95, tasa de error, CPU)

## 3. Post-Despliegue

### 3.1. Validación

- [ ] Feature flags habilitadas incrementalmente (5% → 25% → 100%)
- [ ] Resultados de tests A/B monitoreados (si aplica)
- [ ] Soporte al cliente informado de nuevas funcionalidades o cambios
- [ ] Documentación actualizada (docs de API, runbooks, wiki)

### 3.2. Monitoreo

- [ ] Dashboards revisados por anomalías (tráfico, errores, latencia)
- [ ] Alertas disparándose como se espera (sin falsos positivos ni alertas silenciadas)
- [ ] Monitoreo sintético pasando (Pingdom, Datadog Synthetics)
- [ ] Seguimiento de errores revisado (Sentry, Rollbar) para nuevos issues

### 3.3. Limpieza

- [ ] Versiones antiguas escaladas hacia abajo después de confirmar estabilidad (30 min)
- [ ] Ramas de funcionalidad eliminadas
- [ ] Log de despliegue archivado para auditoría
- [ ] Página de estado actualizada a "Operacional"
```

## Explicación

El checklist está ordenado por **riesgo**: calidad de código primero, luego preparación de infraestructura, luego ejecución, luego validación. El artefacto de rollback es un requisito estricto porque no puedes desplegar de forma segura lo que no puedes revertir rápidamente. Los incrementos de canary con health checks detectan problemas antes de que afecten a todos los usuarios. El monitoreo post-despliegue se extiende más allá del momento del despliegue porque algunos problemas (fugas de memoria, calentamiento de caché) solo aparecen después de tráfico sostenido.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Hotfix | Checklist abreviado | Omitir pasos no críticos, enfocarse en tests y rollback |
| Mantenimiento programado | Sección de comunicación extendida | Incluir ventana de mantenimiento, notificaciones a clientes |
| Cambio solo de base de datos | Sección de base de datos enfatizada | Requerir aprobación del DBA, período de estabilización más largo |

## Mejores Prácticas

1. Automatizar cada checkbox que se pueda automatizar (tests, smoke tests, health checks)
2. Ejecutar el checklist en un documento o herramienta compartida para que múltiples personas confirmen pasos
3. Nunca desplegar viernes por la tarde o antes de festivos salvo que sea un fix crítico
4. Mantener el checklist lo suficientemente corto para completarse en 15 minutos para despliegues rutinarios
5. Revisar y actualizar el checklist después de cada incidente que involucre un despliegue

## Errores Comunes

1. Omitir validación en staging porque "el cambio es pequeño"
2. Desplegar sin un plan de rollback probado
3. No monitorear después de que el despliegue está "completo"
4. Desplegar múltiples cambios no relacionados en el mismo release
5. Permitir que desplegadores trabajen solos sin un segundo par de ojos

## Preguntas Frecuentes

### ¿Debería usar este checklist completo para cada despliegue?

No. Para despliegues rutinarios sin cambios de infraestructura, un checklist abreviado (tests, deploy, smoke tests, monitor) es suficiente. Usa el checklist completo para releases con cambios de base de datos, nuevas dependencias o modificaciones arquitectónicas.

### ¿Quién debería ser dueño del checklist?

El ingeniero on-call o release lead es dueño del checklist para un despliegue específico. El equipo de plataforma o SRE es dueño de la plantilla y la actualiza basándose en aprendizajes de incidentes.

### ¿Cómo manejo hotfixes de emergencia?

Usa un checklist abreviado: verificar el fix en staging, construir el artefacto, desplegar con canary, ejecutar smoke tests, monitorear durante 15 minutos. Documenta el despliegue de emergencia en una revisión post-incidente para determinar si vacíos de proceso causaron la urgencia.
