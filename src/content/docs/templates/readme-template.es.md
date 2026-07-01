---
contentType: docs
slug: readme-template
templateType: readme
title: "Plantilla README"
description: "Una plantilla README lista para producción para proyectos open-source e internos."
metaDescription: "Plantilla README lista para producción para documentar proyectos de software con secciones de instalación, uso, contribución y licencia."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - documentacion
  - markdown
  - open-source
  - plantilla
relatedResources:
  - /patterns/design/factory-pattern
  - /recipes/devops/git-workflow
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla README lista para producción para documentar proyectos de software con secciones de instalación, uso, contribución y licencia."
  keywords:
    - plantilla readme
    - documentacion de proyecto
    - readme open source
    - plantilla markdown
    - documentacion software
---

# Plantilla README

## Overview

Un README es la puerta de entrada de tu proyecto. Combínalo con la [Guía de Contribución](/docs/templates/contributing-guide) y el [Código de Conducta](/docs/templates/code-of-conduct-template) para estándares de comunidad. Es lo primero que los desarrolladores ven en GitHub, npm, PyPI o Docker Hub. Un README bien estructurado reduce la fricción de onboarding, responde preguntas comunes y establece expectativas para los contribuidores.

Esta plantilla proporciona una estructura probada en batalla que puedes copiar, adaptar y usar en minutos.

## When to Use

Usa esta plantilla cuando:
- Empieces un nuevo proyecto open-source
- Documentes una biblioteca o herramienta interna
- Publiques un paquete en un registro público
- Entregues un proyecto a otro equipo

## Solution

Copia la plantilla siguiente y reemplaza los marcadores `[entre corchetes]`:

```markdown
# [Nombre del Proyecto]

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> [Descripción de una línea de lo que hace este proyecto.]

## Tabla de Contenidos

- [Overview](#overview)
- [Instalación](#instalación)
- [Uso](#uso)
- [Referencia API](#referencia-api)
- [Contribución](#contribución)
- [Licencia](#licencia)

## Descripción del Proyecto

[2-3 párrafos explicando qué hace el proyecto, por qué existe y quién debería usarlo.]

## Instalación

### Prerrequisitos

- [Node.js 18+](https://nodejs.org/)
- [Python 3.10+](https://python.org/)

### Inicio Rápido

```bash
# Clonar el repositorio
git clone https://github.com/username/repo.git
cd repo

# Instalar dependencias
npm install

# Ejecutar el proyecto
npm run dev
```

## Uso

### Ejemplo Básico

```javascript
import { myFunction } from 'my-package';

const result = myFunction({ option: true });
console.log(result);
```

### Configuración

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `timeout` | number | `5000` | Timeout de petición en milisegundos |
| `retries` | number | `3` | Número de intentos de reintento |

## Referencia API

Ver [API.md](./API.md) para la documentación API completa.

## Contribución

Aceptamos contribuciones. Lee [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles.

## Licencia

[MIT](LICENSE) © [Nombre del Autor]
```

## Explanation

Cada sección sirve un propósito específico:

- **Badges**: Comunican instantáneamente el estado del build, versión y licencia
- **One-liner**: Engancha al lector en menos de 10 segundos
- **Tabla de Contenidos**: Esencial para READMEs largos; auto-generada en GitHub
- **Instalación**: Reduce la barrera para el primer éxito; incluye comandos copiar-pegar
- **Uso**: Muestra un ejemplo mínimo antes de explicar casos límite
- **Referencia API**: Enlaza a documentación detallada; mantén el README escaneable
- **Contribución**: Establece expectativas para PRs, issues y estilo de código. Enlaza a la [Guía de Contribución](/docs/templates/contributing-guide) para detalles.
- **Licencia**: Protege legalmente tanto a autores como usuarios

## Variants

| Tipo de Proyecto | Secciones a Agregar | Secciones a Omitir |
|-------------|-----------------|------------------|
| **Biblioteca / SDK** | Referencia API, Changelog | Screenshots |
| **Herramienta CLI** | Comandos, Flags, Config | Arquitectura |
| **App Web** | Screenshots, Demo, Deploy | Referencia API |
| **Herramienta Interna** | [Onboarding](/docs/templates/onboarding-guide-template), Slack interno | Licencia, Contribución |

## Lo que funciona

- **Mantén las primeras 100 líneas escaneables** — la mayoría de lectores no scrollean más allá
- **Usa un GIF demo o screenshot** — prueba visual supera párrafos
- **Enlaza, no incluyas** — documentación detallada pertenece a `/docs`, no al README
- **Actualiza el TOC** — TOCs obsoletos frustran; usa `doctoc` o auto-genera
- **Agrega una sección de troubleshooting** — recopila los 3 problemas principales de tu issue tracker
- **Incluye un link de changelog** — los usuarios necesitan saber qué cambió entre versiones. Usa la [Plantilla de Changelog](/docs/templates/changelog-template) para estructura.

## Common Mistakes

- **Sin instrucciones de instalación** — asume que el lector tiene cero contexto
- **Prerrequisitos faltantes** — síndrome de "funciona en mi máquina"
- **Bloques de texto gigantes** — divide en secciones, listas y tablas
- **Ejemplos obsoletos** — código roto erosiona la confianza inmediatamente
- **Sin licencia** — bloquea legalmente el uso y la contribución
- **Copiar de otro proyecto** — links obsoletos y nombres de proyectos incorrectos

## Frequently Asked Questions

**Q: ¿Qué tan largo debe ser un README?**
A: Lo más corto posible mientras responda: ¿Qué es esto? ¿Cómo lo instalo? ¿Cómo lo uso? ¿Dónde obtengo ayuda?

**Q: ¿Debería incluir una Tabla de Contenidos?**
A: Sí, si el README excede 300 líneas. GitHub auto-genera una desde los encabezados H2, pero un TOC manual es más flexible.

**Q: ¿Puedo usar HTML en un README?**
A: Sí, GitHub Flavored Markdown soporta un subconjunto de HTML. Úsalo con moderación para layout (ej. centrado de badges) pero prefiere Markdown para contenido.
