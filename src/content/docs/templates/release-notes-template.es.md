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

## Resumen

Las release notes son el canal principal de comunicación entre quienes construyen software y quienes lo usan. Las buenas release notes responden tres preguntas: qué cambió, por qué importa, y qué debo hacer. Las malas release notes vuelcan un git log y dejan al usuario que lo averigüe.

Esta plantilla cubre:

1. **Secciones estructuradas** — highlights, breaking changes, nuevas capacidades, fixes, seguridad
2. **Targeting por audiencia** — diferentes tonos para usuarios, operadores y desarrolladores
3. **Instrucciones de upgrade** — pasos explícitos, no suposiciones
4. **Issues conocidos** — transparencia sobre lo que aún no está arreglado
5. **Alineación con semver** — matching de notas al tipo de version bump

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

## Nuevas Capacidades
- **Nombre de capacidad** — descripción corta y link a docs

## Mejoras
- **Área** — qué mejoró y en cuánto

## Bug Fixes
- **Issue #123** — descripción del bug arreglado

## Seguridad
- **CVE-AAAA-NNNN** — severidad y resumen del fix

## Deprecaciones
- **Capacidad X** — será eliminado en vX.Y+2.0; usa Capacidad Y en su lugar

## Instrucciones de Upgrade
1. Paso 1
2. Paso 2
3. Verificar con: `comando para chequear`

## Issues Conocidos
- **Issue #456** — workaround disponible, fix apuntado para siguiente release

## Changelog Completo
Link al diff completo de commits o archivo changelog.
```

## Ejemplo Completo

```markdown
# Release v2.5.0 — Export CSV y Mejoras de Performance

**Fecha de Release:** 2026-07-15
**Estado:** publicado

## Highlights
Agregado export CSV para dashboards de analytics. Mejorado tiempo de carga del dashboard en 40%.
Arreglado bug donde rangos de fechas que cruzan meses producían exports vacíos.

## Breaking Changes
- **Cambio:** El endpoint `/api/v1/reports` ahora retorna un objeto `metadata` en lugar de campos planos
- **Impacto:** Cualquier cliente que parsee la respuesta como JSON plano se romperá
- **Migración:** Actualiza el parsing de respuesta para leer del objeto `metadata`. Ver guía de migración.

## Nuevas Capacidades
- **Export CSV** — Exporta cualquier gráfico del dashboard como CSV. Ver [docs](/docs/csv-export).
- **Filtros Guardados** — Guarda y nombra presets de filtros del dashboard para reutilizar.

## Mejoras
- **Tiempo de carga del dashboard** — reducido de 3.2s a 1.9s (p95) con lazy-loading de gráficos
- **Rate limits de API** — aumentados de 100 a 200 req/min para tier Pro

## Bug Fixes
- **Issue #234** — Export CSV descarga archivo vacío cuando el rango de fechas cruza límite de mes
- **Issue #231** — Nombres de filtros guardados se truncaban a 20 caracteres
- **Issue #228** — Dashboard crashea al cambiar de tabla a bar chart con 0 filas

## Seguridad
- **CVE-2026-1234** — Vulnerabilidad XSS en rendering de tooltip de gráfico (Alto). Arreglado escapando input de usuario en plantillas de tooltip.

## Deprecaciones
- **Formato plano de respuesta de `/api/v1/reports`** — será eliminado en v3.0.0. Usar formato de objeto `metadata`. Ver [Aviso de Deprecación de API](/docs/api/api-deprecation-notice-template).

## Instrucciones de Upgrade
1. Actualiza el SDK a v2.5.0: `npm install @stackpractices/sdk@2.5.0`
2. Si usas `/api/v1/reports`, actualiza el parsing de respuesta (ver guía de migración)
3. Verifica: `curl -H "Authorization: Bearer $TOKEN" https://api.example.com/v1/reports | jq .metadata`

## Issues Conocidos
- **Issue #240** — Export CSV falla para gráficos con más de 10,000 filas. Workaround: acotar rango de fechas. Fix apuntado para v2.5.1.

## Changelog Completo
https://github.com/example/repo/compare/v2.4.1...v2.5.0
```

## Versiones por Audiencia

| Audiencia | Enfoque | Tono |
|-----------|---------|------|
| **Usuarios finales** | Nuevas capacidades y bug fixes que afectan su flujo | Amigable, orientado a beneficios |
| **Operadores** | Breaking changes, pasos de upgrade, fixes de seguridad | Preciso, orientado a acción |
| **Desarrolladores** | Cambios de API, deprecaciones, actualizaciones de librerías | Técnico, detallado |

## Alineación con Semver

| Version bump | Cuándo usar | Foco de release notes |
|--------------|-------------|------------------------|
| MAJOR (X.0.0) | Breaking changes | Guía de migración, breaking changes primero |
| MINOR (X.Y.0) | Nueva funcionalidad, backward-compatible | Nuevas capacidades, mejoras |
| PATCH (X.Y.Z) | Bug fixes, backward-compatible | Bug fixes, parches de seguridad |

## Lo que funciona

- **Escribe release notes antes del release** — son un forcing function para review final
- **Destaca breaking changes primero** — usuarios escanean por cosas que podrían romperles
- **Incluye instrucciones de upgrade** — incluso para releases "sin acción requerida", dilo explícitamente
- **Link a documentación** — cada nueva capacidad debería tener una página de docs correspondiente. Enlaza a la [Plantilla de Documentación de API](/docs/templates/api-documentation) para referencia.
- **Incluye comandos de verificación** — da a los usuarios una forma de confirmar que el upgrade funcionó
- **Fecha cada release** — formato ISO 8601 (`YYYY-MM-DD`) para consistencia
- **Link al diff completo** — deja que los desarrolladores profundicen en los commits si quieren

## Errores Comunes

- Listar cada commit — los usuarios no les importa "refactor helper function"
- Omitir breaking changes — esto rompe confianza y causa incidentes. Consulta la [Plantilla de Postmortem](/docs/templates/incident-postmortem-template) para procedimientos de recuperación.
- No dar instrucciones de upgrade — usuarios pierden tiempo adivinando el path de migración. Consulta la [Plantilla de Guía de Configuración de Entorno](/docs/templates/environment-setup-guide-template) para contexto de configuración.
- Saltarse issues conocidos — la transparencia genera confianza; ocultar problemas la destruye
- Descripciones vagas como "varias mejoras" — nombra la mejora y cuantifícala
- Sin link a guía de migración para breaking changes — los usuarios necesitan un path paso a paso

## Variantes

### Release notes automatizadas (release-please, semantic-release)

Herramientas como `release-please` y `semantic-release` generan release notes desde mensajes de commit convencionales. Usa prefijos de commit (`feat:`, `fix:`, `BREAKING CHANGE:`) y la herramienta auto-genera notas categorizadas. Revisa y edita el output antes de publicar — las notas automatizadas son un punto de partida, no un producto terminado.

### Release notes de servicio interno

Para servicios internos, agrega contexto de deploy: qué ambientes fueron actualizados, procedimiento de rollback, feature flags habilitados/deshabilitados, y links a dashboards de monitoreo. Los operadores necesitan saber qué cambió en su entorno, no solo qué cambió en el código.

### Release notes de hotfix

Los hotfix necesitan un formato más corto: "Arreglado [bug] que causaba [síntoma]. Desplegado a [ambiente]. Monitoreando [métrica]. Rollback: [comando]." Sin highlights ni nuevas capacidades — solo el fix y el contexto operacional.

## Preguntas Frecuentes

### ¿Qué tan detalladas deben ser release notes para servicios internos?

Los servicios internos necesitan la misma estructura pero con contexto adicional de deploy: qué ambientes fueron actualizados, procedimiento de rollback, y links a dashboards de monitoreo. Consulta la [Guía de CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para automatización de deployment.

### ¿Debería incluir números CVE para fixes de seguridad?

Sí, siempre. Los usuarios conscientes de seguridad necesitan cross-referenciar con sus scanners de vulnerabilidades. Incluye el CVE, score de severidad, y breve descripción del vector de ataque.

### ¿Los patch releases (0.0.X) necesitan release notes completas?

Sí, pero pueden ser más cortas. Una nota de patch release necesita: "Arreglado [bug] que causaba [síntoma]. Upgrade recomendado. Sin breaking changes."

### ¿Deberían ir release notes en el repositorio o en un sitio web?

Ambos. Mantén un `CHANGELOG.md` en el repositorio para desarrolladores que navegan el código. Publica release notes en un sitio web o mailing list para usuarios que no leen git repos. La versión web puede ser más user-friendly; el CHANGELOG puede ser más técnico.

### ¿Cómo comunico release notes a usuarios que no leen docs?

Usa múltiples canales: notificaciones in-app para breaking changes, email para releases mayores, y anuncios de Slack/Discord para proyectos comunitarios. No dependas de un solo canal — los usuarios se pierden cosas.

### ¿Qué pasa si un release introduce una regresión?

Reconócela rápido. Agrega una sección "Issues Conocidos" a las release notes con la regresión, un workaround si está disponible, y una versión objetivo de fix. Si la regresión es severa, considera retirar el release y re-publicar una vez arreglado.
