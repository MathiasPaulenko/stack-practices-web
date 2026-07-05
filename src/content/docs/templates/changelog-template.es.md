---
contentType: docs
templateType: changelog
slug: changelog-template
title: "Plantilla de Changelog"
description: "Plantilla de changelog estructurada siguiendo las convenciones de Keep a Changelog para registrar versiones del proyecto."
metaDescription: "Plantilla de changelog estandarizada siguiendo Keep a Changelog. Registra releases, funcionalidad, fixes y breaking changes consistentemente."
difficulty: beginner
topics:
  - devops
tags:
  - changelog
  - devops
  - release-notes
  - semver
  - versioning
relatedResources:
  - /docs/contributing-guide
  - /docs/readme-template
  - /guides/cicd-pipeline-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Plantilla de changelog estandarizada siguiendo Keep a Changelog. Registra releases, funcionalidad, fixes y breaking changes consistentemente."
  keywords:
    - plantilla changelog
    - keep a changelog
    - notas de release
    - versionado semántico
    - historial de versiones
---

## Resumen

Un changelog es una lista curada y ordenada cronológicamente de los cambios notables de cada versión de un proyecto. Ayuda a usuarios y colaboradores a entender qué cambió entre releases.

## Cuándo Usar

- Mantienes una librería, framework o aplicación con releases versionados
- Necesitas comunicar breaking changes a los consumidores. Combínalo con la [Plantilla de Aviso de Deprecación](/docs/api/api-deprecation-notice-template) cuando desactives funcionalidades.
- Quieres automatizar la generación de notas de release

## Plantilla

```markdown
# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nuevas funcionalidades

### Changed
- Cambios en funcionalidad existente

### Deprecated
- Funcionalidades que se eliminarán próximamente

### Removed
- Funcionalidades eliminadas en esta versión

### Fixed
- Correcciones de bugs

### Security
- Correcciones de vulnerabilidades

## [1.0.0] - YYYY-MM-DD

### Added
- Release inicial con funcionalidad core
```

## Ejemplo Completo

```markdown
# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Export CSV para gráficos del dashboard de analytics (#234)
- Presets de filtros guardados para reutilización del dashboard (#231)

### Changed
- Respuesta de `/api/v1/reports` ahora envuelve campos en objeto `metadata` (#228)

### Deprecated
- Formato plano de respuesta de `/api/v1/reports` — eliminado en v3.0.0, usar objeto `metadata`

### Fixed
- Export CSV retorna archivo vacío cuando el rango de fechas cruza límite de mes (#234)
- Dashboard crashea al cambiar tipos de gráfico con 0 filas (#228)

### Security
- Parcheada vulnerabilidad XSS en rendering de tooltip de gráfico (CVE-2026-1234)

## [2.4.1] - 2026-06-20

### Fixed
- Loop de redirect en login cuando la sesión SSO expira (#220)
- Headers de rate limit faltantes en respuestas 429 (#222)

### Security
- Actualizado `jsonwebtoken` a 9.0.2 para parchear CVE-2026-0987

## [2.4.0] - 2026-06-01

### Added
- Dark mode para panel admin (#210)
- Import masivo de usuarios via CSV upload (#205)

### Changed
- Gráficos del dashboard ahora lazy-load para render inicial más rápido (#215)

### Deprecated
- `GET /api/v1/users?format=xml` — usar formato JSON, XML eliminado en v3.0.0
```

## Categorías Explicadas

| Categoría | Uso |
|-----------|-----|
| **Added** | Nuevas funcionalidades |
| **Changed** | Cambios en funcionalidad existente |
| **Deprecated** | Funcionalidades marcadas para eliminación. Consulta [Plantilla de Aviso de Deprecación](/docs/api/api-deprecation-notice-template) |
| **Removed** | Funcionalidades eliminadas en esta release |
| **Fixed** | Correcciones de bugs |
| **Security** | Correcciones de vulnerabilidades de seguridad |

## Semver y Changelog

| Cambio de versión | Entrada de changelog | Ejemplo |
|-------------------|----------------------|---------|
| MAJOR (X.0.0) | Breaking changes bajo Changed/Removed | `## [3.0.0] - Removed: Formato de respuesta XML` |
| MINOR (X.Y.0) | Nueva funcionalidad bajo Added | `## [2.5.0] - Added: Export CSV` |
| PATCH (X.Y.Z) | Bug fixes bajo Fixed/Security | `## [2.4.1] - Fixed: Loop de redirect en login` |

## Lo que funciona

- **Fecha cada release** usando formato ISO 8601 (`YYYY-MM-DD`)
- **Agrupa cambios** por categoría dentro de cada release
- **Enlaza a issues/PRs** cuando aplique
- **Menciona breaking changes** prominentemente
- **Mantén una sección Unreleased** al inicio para cambios próximos
- **Escribe entradas para humanos** — no mensajes de commit de git
- **Referencia issues** — `(#123)` ayuda a los usuarios a encontrar contexto

## Errores Comunes

- **Volcado de git log**: Un changelog es curado, no un log raw de git
- **Fechas faltantes**: Cada release debe tener fecha
- **Olvidar la sección Unreleased**: Ayuda a los usuarios a ver lo que viene
- **Mezclar categorías**: Pon fixes de seguridad bajo Security, no Fixed
- **Sin referencias a issues**: Los usuarios necesitan trazar cambios a discusiones
- **Formato inconsistente**: Mantén las categorías de Keep a Changelog en cada release

## Automatización

### Conventional Commits + auto-changelog

Usa prefijos de commit convencionales (`feat:`, `fix:`, `BREAKING CHANGE:`) y herramientas como `auto-changelog` o `release-please` para generar entradas de changelog desde mensajes de commit. Revisa el output antes de commitear — las entradas automatizadas necesitan edición para claridad.

### GitHub Release Notes

GitHub Releases puede auto-generar notas desde PRs y commits. Usa filtrado por labels (`breaking`, `feature`, `bug`) para categorizar entradas. Exporta a `CHANGELOG.md` con un script o action.

### Híbrido manual + automatizado

Escribe breaking changes y notas de migración manualmente. Auto-genera entradas de bug fixes y mejoras menores desde commits. Esto balancea precisión para cambios importantes con eficiencia para los rutinarios.

## Variantes

### Changelog de librería

Para librerías y SDKs, incluye snippets de código de migración para breaking changes. Linkea a guías de migración. Nota la versión mínima de lenguaje/runtime requerida para cada release.

### Changelog de servicio interno

Para servicios internos, agrega contexto de deploy: qué ambientes recibieron el release, feature flags habilitados, y links a dashboards de monitoreo. Los operadores necesitan trazar qué cambió en su entorno.

### Changelog de monorepo

En un monorepo, mantén changelogs separados por paquete o usa un changelog unificado con tags de paquete. Herramientas como `changesets` y `lerna` manejan versionado por paquete y generación de changelog.

## Preguntas Frecuentes

### Qué formato debería seguir un changelog?

Usa el formato Keep a Changelog con categorías: Added, Changed, Deprecated, Removed, Fixed y Security. Fecha cada release en formato ISO 8601 y enlaza a issues o PRs cuando aplique.

### Debería incluir cada commit en el changelog?

No. Un changelog es curado, no un log raw de git. Incluye solo cambios notables que afecten a usuarios: nuevas funcionalidades, bug fixes, breaking changes y parches de seguridad.

### Qué es el versionado semántico?

[Versionado Semántico](/guides/api/rest-api-design-guide) (SemVer) usa el formato MAJOR.MINOR.PATCH: incrementa MAJOR para breaking changes, MINOR para nuevas funcionalidades y PATCH para bug fixes.

### Debería la sección Unreleased estar vacía entre releases?

No. Agrega entradas a Unreleased a medida que merges PRs. Así, cuando cortes un release, solo cambias el header de `[Unreleased]` a `[X.Y.Z] - YYYY-MM-DD` y agregas una nueva sección `[Unreleased]` vacía.

### Cómo manejo versiones pre-release?

Usa labels de pre-release de semver: `1.0.0-alpha.1`, `1.0.0-beta.2`, `1.0.0-rc.1`. Documentalas en el changelog con su propia sección y fecha. Márcalas claramente como pre-release para que los usuarios sepan que pueden contener bugs.

### Debería mantener entradas viejas para siempre?

Sí. El changelog es un registro histórico. Los usuarios que actualizan de v1.0 a v3.0 necesitan leer todos los cambios intermedios. Si el archivo se vuelve muy largo, considera dividir por major version (`CHANGELOG-v1.md`, `CHANGELOG-v2.md`) con un índice.
