---
contentType: docs
slug: feature-request-template
templateType: feature-request
title: "Plantilla de Solicitud de Feature"
description: "Plantilla estructurada de solicitud de capacidades para ayudar equipos a evaluar, priorizar e implementar nuevas capacidades con valor de usuario claro y criterios de aceptación."
metaDescription: "Plantilla de solicitud de capacidades con user story, criterios de aceptación y prioridad. Ayuda a tu equipo a evaluar y construir las capacidades correctas más rápido."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - product-management
  - template
  - user-story
  - ci-cd
relatedResources:
  - /docs/templates/bug-report-template
  - /docs/templates/user-story-template
  - /guides/design/clean-code-principles-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de solicitud de capacidades con user story, criterios de aceptación y prioridad. Ayuda a tu equipo a evaluar y construir las capacidades correctas más rápido."
  keywords:
    - plantilla solicitud feature
    - formato request producto
    - plantilla user story
    - template criterios aceptacion
    - propuesta feature
---

# Plantilla de Solicitud de Feature

Usa esta plantilla para proponer nuevas capacidades de manera que ayude a equipos de producto e ingeniería a evaluar valor de usuario y esfuerzo de implementación. Combínala con la [Plantilla de User Story](/docs/templates/user-story-template) para requerimientos en formato narrativo.

## Resumen

Las solicitudes de feature sin estructura desperdician tiempo. Los solicitantes escriben propuestas vagas, los reviewers piden aclaraciones, y el ciclo se repite. Una plantilla obliga a los solicitantes a pensar el problema antes de enviar, y da a los reviewers la información que necesitan para decidir en una sola pasada.

Esta plantilla cubre:

1. **Declaración del problema** — qué dolor existe y quién lo siente
2. **Solución propuesta** — qué construir y por qué este enfoque
3. **Criterios de aceptación** — qué significa "terminado"
4. **Evaluación de valor de usuario** — cómo priorizar contra otras solicitudes
5. **Framework de prioridad** — cómo rankear solicitudes consistentemente

## Plantilla

```markdown
# Solicitud de Feature

## Resumen
Descripción de una oración de la capacidad.

## Declaración del Problema
¿Qué problema resuelve? ¿Quién tiene este problema y con qué frecuencia?

## Solución Propuesta
Describe la capacidad. Incluye mockups, wireframes o diagramas de flujo si están disponibles.

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
- [ ] Alta — dolor importante de usuario, sin workaround
- [ ] Media — mejora experiencia, workaround existe
- [ ] Baja — nice-to-have

## Contexto Adicional
- Link a solicitudes relacionadas o feedback de clientes
- Análisis competitivo
- Estimaciones o restricciones
```

## Ejemplo Completo

```markdown
# Solicitud de Feature: Export CSV desde Dashboard de Analytics

## Resumen
Permitir a los usuarios exportar datos del dashboard de analytics como archivos CSV.

## Declaración del Problema
Los equipos de marketing necesitan compartir datos de analytics con stakeholders que no
tienen acceso al dashboard. Actualmente, toman capturas de pantalla y pegan números en
spreadsheets manualmente. Esto ocurre diariamente en 12+ equipos y toma 20-30 minutos
por reporte. El proceso manual introduce errores de transcripción.

## Solución Propuesta
Agregar un botón "Export CSV" a cada gráfico en el dashboard de analytics. La exportación
debe incluir los datos crudos detrás del gráfico (no los valores agregados) con columnas
para fecha, métrica y desglose por dimensión. Limitar exportaciones a 10,000 filas para
prevenir abuso. Consulta [File Handling](/recipes/file-handling/csv-parsing) para
patrones de implementación.

## Criterios de Aceptación
- [ ] Botón de exportación aparece en todos los tipos de gráfico (línea, barra, pie, tabla)
- [ ] CSV incluye headers que coinciden con los nombres de columnas del dashboard
- [ ] Rango de fechas en exportación coincide con el filtro seleccionado del dashboard
- [ ] Exportación falla graceful si los datos exceden 10,000 filas con mensaje al usuario
- [ ] Archivo descargado se llama `analytics_[chart]_[date].csv`
- [ ] Funciona en Chrome, Firefox, Safari, Edge

## Valor para el Usuario
- **Usuarios objetivo:** Equipos de marketing, account managers
- **Frecuencia:** Diaria (12+ equipos)
- **Nivel de dolor:** Molesto (20-30 min desperdiciados por reporte)
- **Workaround:** Captura manual + entrada en spreadsheet (propenso a errores)

## Prioridad
- [x] Alta — dolor importante de usuario, workaround existe pero es propenso a errores

## Contexto Adicional
- 3 cuentas de cliente han solicitado esto específicamente en el último trimestre
- Competidor X ofrece export PDF; CSV es más flexible para nuestros usuarios
- Esfuerzo estimado: M (2-3 sprints incluyendo QA)
- Relacionado: [Data Export API](/recipes/api/streaming-responses) para acceso via API
```

## Por Qué Funciona Esta Estructura

| Sección | Propósito |
|---------|-----------|
| **Declaración del problema** | Evita "solución en busca de problema" |
| **Solución propuesta** | Da a ingenieros un punto de partida para diseño |
| **Criterios de aceptación** | Define "terminado" antes de empezar a codear |
| **Valor de usuario** | Ayuda a producto a priorizar contra otras solicitudes |
| **Prioridad** | Estandariza urgencia across todas las solicitudes |
| **Contexto adicional** | Captura intel competitiva y restricciones |

## Framework de Prioridad

| Prioridad | Criterios | Ejemplo |
|-----------|-----------|---------|
| Crítica | Bloquea operación de negocio o revenue | Procesamiento de pagos roto |
| Alta | Dolor importante de usuario, sin workaround o workaround costoso | No se pueden exportar datos, proceso manual toma 30 min |
| Media | Mejora experiencia, workaround existe y es tolerable | UI lenta pero funcional |
| Baja | Nice-to-have, sin dolor actual | Dark mode para panel admin |

## Ciclo de Vida de Solicitudes

1. **Enviada** — Solicitante completa la plantilla y crea un ticket
2. **Triageada** — Reviewer etiqueta dentro de 48 horas (`needs-info`, `accepted`, `rejected`, `deferred`)
3. **Estimada** — Si es aceptada, ingeniería asigna t-shirt size (S/M/L/XL)
4. **Priorizada** — Producto agrega a roadmap o backlog con trimestre objetivo
5. **Implementada** — Ingeniería construye según criterios de aceptación
6. **Verificada** — Solicitante valida que la implementación coincide con su necesidad
7. **Cerrada** — Ticket cerrado con referencia a release notes

## Consejos para Quienes Solicitan

- **Empieza con el problema, no la solución** — el equipo puede encontrar una solución mejor
- **Incluye una cita de usuario** — "Como [usuario], quiero [capacidad] para poder [beneficio]". Consulta la [Plantilla de User Story](/docs/templates/user-story-template) para el formato completo.
- **Define una capacidad por solicitud** — los paquetes son difíciles de evaluar y trackear
- **Cuantifica el dolor** — "20-30 minutos por reporte, 12 equipos, diariamente" es más convincente que "toma mucho tiempo"
- **Linkea a feedback real** — tickets de clientes, threads de Slack, resultados de encuestas agregan peso
- **Propón una solución pero no la sobre-diseñes** — deja que ingeniería figure out la implementación

## Consejos para Reviewers

- **Rechaza solicitudes poco claras rápidamente** — label "necesita-mas-info" y deadline de 48 horas
- **Estima antes de comprometerte** — t-shirt sizing (S/M/L) es suficiente para triage. Consulta la [Guía de Principios de Clean Code](/guides/design/clean-code-principles-guide) para estándares de implementación.
- **Link al roadmap** — muestra dónde encaja (o no) en los objetivos trimestrales
- **Cierra solicitudes stale** — si una solicitud no ha tenido actividad en 6 meses, ciérrala con una nota
- **Agrupa solicitudes similares** — si 3 solicitudes piden lo mismo, mézclalas y linkea los duplicados

## Variantes

### Ligera (Slack/Teams)

Para equipos pequeños, un mensaje de Slack con formato reducido funciona: "Problema: X. Propuesto: Y. Prioridad: Z. ¿Opiniones?" Úsalo para propuestas rápidas antes de crear un ticket formal.

### Orientada al cliente (portal de feedback)

Al recolectar solicitudes de clientes, usa un formulario simplificado con solo: Resumen, Problema y ¿Qué tan importante es esto? No exponer labels de prioridad internas ni criterios de aceptación a clientes.

### Estilo RFC (equipos con mucha ingeniería)

Para capacidades técnicas (cambios de API, decisiones de arquitectura), expande la plantilla en un RFC con secciones para: Background, Goals, Non-goals, Enfoque propuesto, Alternativas consideradas, Riesgos. Consulta [ADR Template](/docs/templates/adr-template) para architecture decision records.

## Preguntas Frecuentes

### ¿Qué pasa si quien solicita propone una mala solución?

Agradece por identificar el problema, luego colabora en una solución mejor. El objetivo es resolver el dolor del usuario, no implementar su sugerencia exacta.

### ¿Cómo prevengo el bloat de capacidades?

Requiere una sección de "valor de usuario" en cada solicitud. Si la respuesta es "estaría cool" o "el competidor X lo tiene", resiste. Las capacidades deben resolver dolor real y frecuente.

### ¿Las herramientas internas deberían usar la misma plantilla?

Sí, pero relaja la sección de "valor de usuario". Las solicitudes internas necesitan "equipo solicitante" y "tiempo ahorrado por semana" en su lugar. Usa la [Plantilla de Reporte de Bug](/docs/templates/bug-report-template) para tracking de defectos.

### ¿Cuántas solicitudes deberíamos aceptar por trimestre?

Depende de la capacidad del equipo. Una buena regla: aceptar no más del 60-70% de la capacidad de ingeniería disponible. Reservar 30-40% para bugs, deuda técnica y trabajo no planificado.

### ¿Qué pasa si una solicitud es demasiado grande para un trimestre?

Divídela en fases. Crea un epic para la visión completa, luego solicitudes individuales para cada fase. Etiqueta la primera fase como "MVP" y las subsiguientes como "Fase 2", "Fase 3", etc.

### ¿Debería trackear solicitudes rechazadas?

Sí. Mantenlas en estado "rechazada" con una razón. Si la misma solicitud surge múltiples veces, el patrón mismo es señal de que debería reconsiderarse.
