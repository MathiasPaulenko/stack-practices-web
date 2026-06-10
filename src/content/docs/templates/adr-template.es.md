---
contentType: docs
slug: adr-template
templateType: adr
title: "Plantilla de ADR"
description: "Una plantilla reutilizable para Architecture Decision Records que captura contexto, decisión y consecuencias."
metaDescription: "Usa esta plantilla de ADR para documentar decisiones de arquitectura con contexto, opciones consideradas, decisión y consecuencias."
difficulty: beginner
topics:
  - architecture
tags:
  - adr
  - template
  - arquitectura
  - decision-records
  - documentación
  - rfc
relatedResources:
  - /docs/templates/readme-template
  - /guides/api/rest-api-design-guide
  - /patterns/design/mvc-pattern
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de ADR para documentar decisiones de arquitectura con contexto, opciones consideradas, decisión y consecuencias."
  keywords:
    - adr template
    - architecture decision record
    - registro de decisiones
    - arquitectura de software
    - rfc template
---

## Estructura de la plantilla

Usa esta plantilla como base para documentar cualquier decisión de arquitectura en tu proyecto.

---

## ADR-XXX: [Título corto]

### Estado

- Propuesta
- Aceptada
- Obsoleta
- Reemplazada por [ADR-YYY]

### Contexto

Describe las fuerzas en juego, incluyendo factores tecnológicos, políticos, sociales y del proyecto. Explica el problema que motiva esta decisión y por qué necesita tomarse ahora.

### Decisión

Enuncia la decisión de arquitectura en una sola oración. Sé claro y directo.

> Vamos a [decisión].

### Consecuencias

#### Positivas

- Beneficio 1
- Beneficio 2

#### Negativas / Trade-offs

- Desventaja 1
- Desventaja 2

### Alternativas consideradas

#### Alternativa A: [Nombre]

**Descripción**: Breve descripción.
**Pros**: Por qué era atractiva.
**Contras**: Por qué fue rechazada.

#### Alternativa B: [Nombre]

**Descripción**: Breve descripción.
**Pros**: Por qué era atractiva.
**Contras**: Por qué fue rechazada.

### Decisiones relacionadas

- [ADR-001: Decisión anterior relacionada](link)

### Responsables de la decisión

- Autor: @username
- Fecha: YYYY-MM-DD
- Aprobado por: @stakeholder

---

## Mejores prácticas para escribir ADRs

- **Una decisión por ADR**: Mantén el alcance enfocado
- **Escribe después de la decisión**: Documenta decisiones ya tomadas, no debates
- **Enlaza ADRs relacionados**: Crea una cadena de decisiones
- **Guarda en control de versiones**: Mantén ADRs junto al código (`docs/adr/`)
- **Usa numeración secuencial**: `0001-use-postgresql.md`, `0002-adopt-graphql.md`

## Errores comunes

- Escribir ADRs antes de que la decisión esté tomada (se convierten en debates)
- Omitir el contexto (lectores futuros no entenderán por qué)
- No listar alternativas (hace que la decisión parezca arbitraria)
- Olvidar marcar ADRs como obsoletas cuando son reemplazadas
