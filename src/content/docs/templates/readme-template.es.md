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
  - /patterns/factory-pattern
  - /recipes/git-workflow
  - /guides/rest-api-design-guide
  - /docs/changelog-template
  - /docs/code-of-conduct-template
  - /docs/contributing-guide
  - /docs/onboarding-guide-template
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

## Ejemplo de README

```text
=== README: payment-service ===

# Payment Service

Servicio de procesamiento de pagos para la plataforma.

## Inicio Rapido

Requisitos:
  - Node.js 20+
  - Docker 24+
  - PostgreSQL 16+

Instalacion:
  git clone https://github.com/company/payment-service.git
  cd payment-service
  npm install
  cp .env.example .env  # editar con tus valores
  docker compose up -d  # postgres y redis
  npm run db:migrate
  npm run dev

Tests:
  npm test           # tests unitarios
  npm run test:e2e   # tests end-to-end
  npm run test:cov   # coverage report

## Arquitectura

  Client -> API Gateway -> payment-service -> PostgreSQL
                                       -> Redis (cache)
                                       -> Carrier API (shipping)

## Endpoints

  POST   /payments          Crear un pago
  GET    /payments/:id      Obtener un pago
  POST   /payments/:id/refund  Reembolsar un pago
  GET    /health            Health check

## Configuracion

  Variable          | Requerido | Default | Descripcion
  ------------------|-----------|---------|------------------
  DATABASE_URL      | Si        | -       | URL de PostgreSQL
  REDIS_URL         | Si        | -       | URL de Redis
  CARRIER_API_KEY   | Si        | -       | API key del carrier
  LOG_LEVEL         | No        | info    | Nivel de logging
  PORT              | No        | 3000    | Puerto del servidor

## Monitoreo

  - Dashboard: https://grafana.company.com/d/payment
  - Logs: https://kibana.company.com/app/discover#/payment
  - Alertas: PagerDuty service PD-1234
  - SLO: 99.9% disponibilidad, p95 < 500ms

## Contribuir

  Ver CONTRIBUTING.md para el flujo de contribucion.
  Contacto: #payments-team en Slack.
```


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

### ¿Puedo modificar esta plantilla para mi organización?

Sí. Adapta las secciones, campos y estructura para coincidir con las necesidades de tu organización. Mantén la plantilla mínima para que los miembros del equipo la usen consistentemente.

### ¿Quién debe revisar los documentos creados de esta plantilla?

Asigna revisores según el tipo de documento. Los documentos técnicos necesitan revisión de ingeniería. Los documentos de proceso necesitan revisión de stakeholders. Siempre ten al menos un revisor.

### ¿Cómo versiono los documentos creados de esta plantilla?

Usa tu sistema de control de versiones. Guarda los documentos en un directorio docs/ con naming claro. Tag o branch versiones significativas. Revisa y actualiza documentos vivos trimestralmente.


### Como estructuramos el README para proyectos open source?

Para open source: el README es la primera impresion. Empieza con el nombre y una descripcion de 1 linea. Agrega badges (CI status, coverage, npm version, license). Incluye una seccion "Por que?" — que problema resuelve. Agrega "Inicio Rapido" con comandos copy-paste. Incluye una seccion de requisitos. Agrega ejemplos de uso — no solo instalacion. Incluye un diagrama de arquitectura si es complejo. Agrega una seccion de contribuir con link a CONTRIBUTING.md. Incluye la licencia. Agrega un codigo de conducta. Manten el README conciso — si es muy largo, mueve detalles a docs/. Un README claro atrae mas usuarios y contribuidores que uno exhaustivo pero ilegible.

### Que secciones son obligatorias en un README?

Obligatorio: titulo y descripcion, instalacion/inicio rapido, uso basico, licencia. Recomendado: requisitos, configuracion, tests, contribuir, soporte/contacto. Opcional: arquitectura, roadmap, FAQ, changelog, creditos. Para librerias: tabla de API, ejemplos de codigo, comparacion con alternativas. Para servicios: endpoints, configuracion, monitoreo, deployment. Para monorepos: estructura de directorios, que va en cada paquete. La regla: si un nuevo ingeniero no puede usar el proyecto en 15 minutos leyendo solo el README, el README esta incompleto.

### Como mantenemos el README actualizado?

El README debe vivir en el mismo repo que el codigo — los PRs que cambian el comportamiento deben actualizar el README. Agrega un check en CI que verifique que el README no tiene links rotos. Revisa el README en cada release — si la instalacion cambio, actualizalo. Asigna un owner al README (usualmente el maintainer principal). Usa un linter de markdown para mantener formato consistente. Si el README tiene ejemplos de codigo: automatiza que los ejemplos funcionen con tests. Un README obsoleto es peor que no tener README — engana a los usuarios. Marca el README con fecha de ultima revision en el frontmatter o en un comentario.



































End of document. Review and update quarterly.