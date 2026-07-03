---
contentType: docs
slug: user-story-template
templateType: user-story
title: "Plantilla de User Story y Criterios de Aceptación"
description: "Plantilla de user story que conecta necesidades de usuarios con implementación mediante criterios de aceptación claros, definición de done y principios INVEST."
metaDescription: "Plantilla de user story con criterios de aceptación, definición de done y principios INVEST. Conecta necesidades de usuarios con implementación claramente."
difficulty: beginner
topics:
  - design
tags:
  - product-management
  - template
  - user-story
  - design-patterns
  - patterns
relatedResources:
  - /docs/templates/feature-request-template
  - /guides/design/clean-code-principles-guide
  - /guides/testing/test-driven-development-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de user story con criterios de aceptación, definición de done y principios INVEST. Conecta necesidades de usuarios con implementación claramente."
  keywords:
    - plantilla user story
    - criterios aceptacion template
    - definition of done template
    - invest user stories
    - formato historia agile
---

# Plantilla de User Story y Criterios de Aceptación

Usa esta plantilla para escribir user stories listas para desarrollo y testing. Combínala con la [Plantilla de Solicitud de Feature](/docs/templates/feature-request-template) para propuestas iniciales y la [Guía de Test-Driven Development](/guides/testing/test-driven-development-guide) para workflows test-first.

## Plantilla

```markdown
# User Story: [Título Corto]

## Historia
Como [tipo de usuario],
quiero [algún objetivo],
para poder [alguna razón / beneficio].

## Criterios de Aceptación

### Escenario 1: Happy path
Dado [contexto]
Cuando [acción]
Entonces [resultado esperado]

### Escenario 2: Caso de error
Dado [contexto]
Cuando [acción inválida]
Entonces [error esperado / mensaje de validación]

### Escenario 3: Caso borde
Dado [contexto borde]
Cuando [acción]
Entonces [manejo esperado]

## Definition of Done
- [ ] Código revisado y mergeado
- [ ] Unit tests pasan (> 80% cobertura)
- [ ] Integration tests pasan
- [ ] Documentación actualizada
- [ ] Deployado a staging y verificado
- [ ] Product owner aceptó

## Notas Técnicas
- **Cambios de API:** [link a spec]
- **Cambios de base de datos:** [migración requerida / ninguna]
- **Dependencias:** [bloqueado por / bloquea]
- **Esfuerzo estimado:** [story points o horas]

## UI/UX
- **Mockups:** [link a Figma]
- **Accesibilidad:** [navegación por teclado / screen reader / contraste de color]
- **Responsive:** [mobile / tablet / desktop]
```

## Checklist INVEST

| Principio | Pregunta | Esta Historia? |
|-----------|----------|---------------|
| **Independent** | ¿Puede ser desarrollada y deployada sola? | [ ] |
| **Negotiable** | ¿La solución es abierta a discusión? | [ ] |
| **Valuable** | ¿Entrega valor de usuario? | [ ] |
| **Estimable** | ¿El equipo puede estimarla? | [ ] |
| **Small** | ¿Cabe en un sprint? | [ ] |
| **Testable** | ¿Los criterios de aceptación pueden verificarse? | [ ] |

## Buenos vs Malos Criterios de Aceptación

| Malo | Bueno |
|------|-------|
| "El sistema debería ser rápido" | "Resultados de búsqueda retornan en < 500ms en p95" |
| "Maneja errores gracefulmente" | "Si la API retorna 503, mostrar botón de retry con cuenta regresiva de 5s" |
| "Soporta mobile" | "Layout renderiza sin scroll horizontal en iPhone SE (375px)" |

## Lo que funciona

- **Escribe criterios de aceptación antes del código** — son el contrato entre producto e ingeniería. Consulta la [Guía de Principios de Clean Code](/guides/design/clean-code-principles-guide) para estándares de implementación.
- **Usa Given-When-Then para comportamiento** — es testeable y no ambiguo
- **Mantén historias pequeñas** — si no cabe en un sprint, divídela verticalmente (por escenario, no por capa)
- **Incluye criterios no funcionales** — performance, seguridad y accesibilidad también son criterios de aceptación. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/security/web-application-security-guide) para requisitos de seguridad.
- **Rechaza historias sin "para poder"** — si no puedes articular el beneficio, no entiendes el problema

## Errores Comunes

- Tareas técnicas disfrazadas de user stories — "Refactorizar capa de base de datos" no es una user story; es una tarea
- Historias demasiado grandes — "Implementar checkout" es un epic, no una historia
- Criterios de aceptación vagos — "debería funcionar" no es testeable
- Sin definición de done — los equipos discrepan sobre cuándo una historia está terminada. Usa la [Plantilla de Pull Request](/docs/templates/pull-request-template) para estándares de merge.
- Saltarse casos borde — el caso borde que no especificaste será el bug reportado en producción

## Preguntas Frecuentes

### ¿Cada historia debería tener criterios de aceptación?

Sí. Una historia sin criterios de aceptación no está lista para desarrollo. Los criterios son la definición de "terminado." Si no puedes escribirlos, no entiendes el requerimiento lo suficientemente bien.

### ¿Qué tan pequeña debería ser una user story?

Lo suficientemente pequeña para completarse en 2-3 días por un desarrollador. Si tus sprints son de 2 semanas, eso es 3-5 historias por desarrollador. Historias más grandes esconden riesgo y hacen que la estimación pierda sentido.

### ¿Puede la deuda técnica ser una user story?

A veces, pero reframéala. "Como desarrollador, quiero actualizar el ORM para obtener patches de seguridad y queries más rápidas" es válida. Consulta la [Plantilla de Auditoría de Dependencias](/docs/templates/dependency-audit-template) para evaluar actualizaciones de librerías. "Actualizar ORM" es una tarea, no una historia. Siempre conecta el trabajo técnico con valor de usuario o desarrollador.
