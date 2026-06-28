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

## Categorías Explicadas

| Categoría | Uso |
|-----------|-----|
| **Added** | Nuevas funcionalidades |
| **Changed** | Cambios en funcionalidad existente |
| **Deprecated** | Funcionalidades marcadas para eliminación. Consulta [Plantilla de Aviso de Deprecación](/docs/api/api-deprecation-notice-template) |
| **Removed** | Funcionalidades eliminadas en esta release |
| **Fixed** | Correcciones de bugs |
| **Security** | Correcciones de vulnerabilidades de seguridad |

## Lo que funciona

- **Fecha cada release** usando formato ISO 8601 (`YYYY-MM-DD`)
- **Agrupa cambios** por categoría dentro de cada release
- **Enlaza a issues/PRs** cuando aplique
- **Menciona breaking changes** prominentemente
- **Mantén una sección Unreleased** al inicio para cambios próximos

## Errores Comunes

- **Volcado de git log**: Un changelog es curado, no un log raw de git
- **Fechas faltantes**: Cada release debe tener fecha
- **Olvidar la sección Unreleased**: Ayuda a los usuarios a ver lo que viene

## Preguntas Frecuentes

### Qué formato debería seguir un changelog?

Usa el formato Keep a Changelog con categorías: Added, Changed, Deprecated, Removed, Fixed y Security. Fecha cada release en formato ISO 8601 y enlaza a issues o PRs cuando aplique.

### Debería incluir cada commit en el changelog?

No. Un changelog es curado, no un log raw de git. Incluye solo cambios notables que afecten a usuarios: nuevas funcionalidades, bug fixes, breaking changes y parches de seguridad.

### Qué es el versionado semántico?

[Versionado Semántico](/guides/api/rest-api-design-guide) (SemVer) usa el formato MAJOR.MINOR.PATCH: incrementa MAJOR para breaking changes, MINOR para nuevas funcionalidades y PATCH para bug fixes.
