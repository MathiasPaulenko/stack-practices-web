---
contentType: docs
slug: release-notes-template
templateType: release-notes
title: "Plantilla de Release Notes"
description: "Plantilla de release notes que comunica cambios claramente a usuarios, operadores y stakeholders con categorías, instrucciones de upgrade e issues conocidos."
metaDescription: "Plantilla de release notes con categorías, instrucciones de upgrade e issues conocidos. Comunica cambios de software claramente a usuarios y operadores."
difficulty: beginner
topics:
  - devops
tags:
  - changelog
  - devops
  - release-notes
  - semver
  - template
  - versioning
relatedResources:
  - /docs/templates/bug-report-template
  - /guides/devops/cicd-pipeline-guide
  - /docs/templates/post-deployment-checklist-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de release notes con categorías, instrucciones de upgrade e issues conocidos. Comunica cambios de software claramente a usuarios y operadores."
  keywords:
    - plantilla release notes
    - template changelog
    - notas de lanzamiento software
    - formato release version
    - semver release notes
---

# Plantilla de Release Notes

Usa esta plantilla para comunicar qué cambió, por qué importa y qué deben hacer los usuarios. Combínala con la [Plantilla de Changelog](/docs/templates/changelog-template) para tracking y la [Plantilla de Checklist Post-Deploy](/docs/templates/post-deployment-checklist-template) para verificación.

## Plantilla

```markdown
# Release vX.Y.Z — [Título del Release]

**Fecha de Release:** AAAA-MM-DD
**Estado:** [borrador / publicado / obsoleto]

## Highlights
2-3 oraciones resumiendo los cambios más importantes para usuarios.

## Breaking Changes
- **Cambio:** Descripción de qué cambió
- **Impacto:** Quién está afectado y cómo
- **Migración:** Pasos exactos para adaptarse

## Nuevas Features
- **Nombre de feature** — descripción corta y link a docs

## Mejoras
- **Área** — qué mejoró y en cuánto

## Bug Fixes
- **Issue #123** — descripción del bug arreglado

## Seguridad
- **CVE-AAAA-NNNN** — severidad y resumen del fix

## Deprecaciones
- **Feature X** — será eliminado en vX.Y+2.0; usa Feature Y en su lugar

## Instrucciones de Upgrade
1. Paso 1
2. Paso 2
3. Verificar con: `comando para chequear`

## Issues Conocidos
- **Issue #456** — workaround disponible, fix apuntado para siguiente release

## Changelog Completo
Link al diff completo de commits o archivo changelog.
```

## Versiones por Audiencia

| Audiencia | Enfoque | Tono |
|-----------|---------|------|
| **Usuarios finales** | Nuevas features y bug fixes que afectan su flujo | Amigable, orientado a beneficios |
| **Operadores** | Breaking changes, pasos de upgrade, fixes de seguridad | Preciso, orientado a acción |
| **Desarrolladores** | Cambios de API, deprecaciones, actualizaciones de librerías | Técnico, detallado |

## Mejores Prácticas

- **Escribe release notes antes del release** — son un forcing function para review final
- **Destaca breaking changes primero** — usuarios escanean por cosas que podrían romperles
- **Incluye instrucciones de upgrade** — incluso para releases "sin acción requerida", dilo explícitamente
- **Link a documentación** — cada nueva feature debería tener una página de docs correspondiente. Enlaza a la [Plantilla de Documentación de API](/docs/templates/api-documentation) para referencia.

## Errores Comunes

- Listar cada commit — los usuarios no les importa "refactor helper function"
- Omitir breaking changes — esto rompe confianza y causa incidentes. Consulta la [Plantilla de Postmortem](/docs/templates/incident-postmortem-template) para procedimientos de recuperación.
- No dar instrucciones de upgrade — usuarios pierden tiempo adivinando el path de migración. Consulta la [Plantilla de Guía de Configuración de Entorno](/docs/templates/environment-setup-guide-template) para contexto de configuración.
- Saltarse issues conocidos — la transparencia genera confianza; ocultar problemas la destruye

## Preguntas Frecuentes

### ¿Qué tan detalladas deben ser release notes para servicios internos?

Los servicios internos necesitan la misma estructura pero con contexto adicional de deploy: qué ambientes fueron actualizados, procedimiento de rollback, y links a dashboards de monitoreo. Consulta la [Guía de CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para automatización de deployment.

### ¿Debería incluir números CVE para fixes de seguridad?

Sí, siempre. Los usuarios conscientes de seguridad necesitan cross-referenciar con sus scanners de vulnerabilidades. Incluye el CVE, score de severidad, y breve descripción del vector de ataque.

### ¿Los patch releases (0.0.X) necesitan release notes completas?

Sí, pero pueden ser más cortas. Una nota de patch release necesita: "Arreglado [bug] que causaba [síntoma]. Upgrade recomendado. Sin breaking changes."
