---
contentType: docs
slug: feature-request-template
templateType: feature-request
title: "Plantilla de Solicitud de Feature"
description: "Plantilla estructurada de solicitud de features para ayudar equipos a evaluar, priorizar e implementar nuevas capacidades con valor de usuario claro y criterios de aceptación."
metaDescription: "Plantilla de solicitud de features con user story, criterios de aceptación y prioridad. Ayuda a tu equipo a evaluar y construir las features correctas más rápido."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - product-management
  - template
  - user-story
relatedResources:
  - /docs/templates/bug-report-template
  - /docs/templates/user-story-template
  - /guides/design/clean-code-principles-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de solicitud de features con user story, criterios de aceptación y prioridad. Ayuda a tu equipo a evaluar y construir las features correctas más rápido."
  keywords:
    - plantilla solicitud feature
    - formato request producto
    - plantilla user story
    - template criterios aceptacion
    - propuesta feature
---

# Plantilla de Solicitud de Feature

Usa esta plantilla para proponer nuevas features de manera que ayude a equipos de producto e ingeniería a evaluar valor de usuario y esfuerzo de implementación. Combínala con la [Plantilla de User Story](/docs/templates/user-story-template) para requerimientos en formato narrativo.

## Plantilla

```markdown
# Solicitud de Feature

## Resumen
Descripción de una oración de la feature.

## Declaración del Problema
¿Qué problema resuelve? ¿Quién tiene este problema y con qué frecuencia?

## Solución Propuesta
Describe la feature. Incluye mockups, wireframes o diagramas de flujo si están disponibles.

## Criterios de Aceptación
- [ ] Criterio 1: comportamiento específico y testeable
- [ ] Criterio 2: comportamiento específico y testeable
- [ ] Criterio 3: comportamiento específico y testeable

## Valor para el Usuario
- **Usuarios objetivo:** [equipo interno / clientes / admins]
- **Frecuencia:** [diaria / semanal / mensual]
- **Nivel de dolor:** [bloqueante / molesto / nice-to-have]
- **Workaround:** [existe / ninguno]

## Prioridad
- [ ] Crítica — bloquea operación de negocio
- [ ] Alta — dolor significativo de usuario, sin workaround
- [ ] Media — mejora experiencia, workaround existe
- [ ] Baja — nice-to-have

## Contexto Adicional
- Link a solicitudes relacionadas o feedback de clientes
- Análisis competitivo
- Estimaciones o restricciones
```

## Por Qué Funciona Esta Estructura

| Sección | Propósito |
|---------|-----------|
| **Declaración del problema** | Evita "solución en busca de problema" |
| **Solución propuesta** | Da a ingenieros un punto de partida para diseño |
| **Criterios de aceptación** | Define "terminado" antes de empezar a codear |
| **Valor de usuario** | Ayuda a producto a priorizar contra otras solicitudes |

## Consejos para Quienes Solicitan

- **Empieza con el problema, no la solución** — el equipo puede encontrar una solución mejor
- **Incluye una cita de usuario** — "Como [usuario], quiero [feature] para poder [beneficio]". Consulta la [Plantilla de User Story](/docs/templates/user-story-template) para el formato completo.
- **Define una feature por solicitud** — los paquetes son difíciles de evaluar y trackear

## Consejos para Reviewers

- **Rechaza solicitudes poco claras rápidamente** — label "necesita-mas-info" y deadline de 48 horas
- **Estima antes de comprometerte** — t-shirt sizing (S/M/L) es suficiente para triage. Consulta la [Guía de Principios de Clean Code](/guides/design/clean-code-principles-guide) para estándares de implementación.
- **Link al roadmap** — muestra dónde encaja (o no) en los objetivos trimestrales

## Preguntas Frecuentes

### ¿Qué pasa si quien solicita propone una mala solución?

Agradece por identificar el problema, luego colabora en una solución mejor. El objetivo es resolver el dolor del usuario, no implementar su sugerencia exacta.

### ¿Cómo prevengo el feature bloat?

Requiere una sección de "valor de usuario" en cada solicitud. Si la respuesta es "estaría cool" o "el competidor X lo tiene", resiste. Las features deben resolver dolor real y frecuente.

### ¿Las herramientas internas deberían usar la misma plantilla?

Sí, pero relaja la sección de "valor de usuario". Las solicitudes internas necesitan "equipo solicitante" y "tiempo ahorrado por semana" en su lugar. Usa la [Plantilla de Reporte de Bug](/docs/templates/bug-report-template) para tracking de defectos.
