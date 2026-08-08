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
  - design-pattern
  - pattern
relatedResources:
  - /docs/feature-request-template
  - /guides/clean-code-principles-guide
  - /guides/test-driven-development-guide
lastUpdated: "2026-06-12"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: "Plantilla de user story con criterios de aceptación, definición de done y principios INVEST. Conecta necesidades de usuarios con implementación claramente."
  keywords:
    - plantilla user story
    - criterios aceptacion template
    - definition of done template
    - invest user stories
    - formato historia agile

---
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





## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de product-management y template para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica plantilla de user story y criterios de aceptación** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

### ¿Cada historia debería tener criterios de aceptación?

Sí. Una historia sin criterios de aceptación no está lista para desarrollo. Los criterios son la definición de "terminado." Si no puedes escribirlos, no entiendes el requerimiento lo suficientemente bien.

### ¿Qué tan pequeña debería ser una user story?

Lo suficientemente pequeña para completarse en 2-3 días por un desarrollador. Si tus sprints son de 2 semanas, eso es 3-5 historias por desarrollador. Historias más grandes esconden riesgo y hacen que la estimación pierda sentido.

### ¿Puede la deuda técnica ser una user story?

A veces, pero reframéala. "Como desarrollador, quiero actualizar el ORM para obtener patches de seguridad y queries más rápidas" es válida. Consulta la [Plantilla de Auditoría de Dependencias](/docs/templates/dependency-audit-template) para evaluar actualizaciones de librerías. "Actualizar ORM" es una tarea, no una historia. Siempre conecta el trabajo técnico con valor de usuario o desarrollador.


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Bug fix | Formato: "Como usuario, quiero que X no falle para poder Y" | Incluir pasos de reproduccion |
| Feature grande | Dividir en multiples historias con criterios de aceptacion independientes | Evitar historias epicas |
| Deuda tecnica | Formato: "Como equipo, queremos X para poder Y" | El usuario es el equipo |
| Investigacion | Formato: "Como equipo, queremos evaluar X para decidir Y" | Output es un documento, no codigo |
| Spike | Formato: "Como equipo, queremos prototipar X para validar Y" | Timeboxed |

## Ejemplo de Historia de Usuario Completa

```text
=== Historia: Notificaciones push para pedidos ===

Titulo: Como cliente, quiero recibir notificaciones push cuando mi pedido cambie de estado
ID: PROJ-456
Sprint: 2026-S28
Estimacion: 5 puntos
Prioridad: Alta
Owner: alice@company.com

Historia:
  Como cliente de la app movil
  Quiero recibir notificaciones push cuando el estado de mi pedido cambie
  Para poder hacer seguimiento sin abrir la app

Criterios de Aceptacion:
  Dado que tengo un pedido en proceso
  Cuando el estado cambia a "enviado"
  Entonces recibo una notificacion push con el nuevo estado y numero de seguimiento

  Dado que tengo un pedido en proceso
  Cuando el estado cambia a "entregado"
  Entonces recibo una notificacion push y un email de confirmacion

  Dado que tengo notificaciones push deshabilitadas
  Cuando el estado de mi pedido cambia
  Entonces no recibo notificaciones push pero si un email

  Dado que la app esta en primer plano
  Cuando llega una notificacion push
  Entonces se muestra un banner in-app en lugar de una notificacion del sistema

Notas Tecnicas:
  - Usar Firebase Cloud Messaging (FCM) para Android
  - Usar APNs para iOS
  - Crear tabla notification_log para auditoria
  - Rate limit: max 1 notificacion por pedido por cambio de estado
  - El numero de seguimiento viene del carrier via API

Dependencias:
  - Integracion con carrier API (PROJ-450)
  - Configuracion de FCM (ops task)
  - Configuracion de APNs (ops task)

Riesgos:
  - APNs puede tener latencia alta en horas pico
  - FCM tokens pueden expirar; manejar re-registro
  - Notificaciones duplicadas si el webhook del carrier se reenvia

Definicion de Hecho:
  [ ] Codigo revisado y aprobado
  [ ] Tests unitarios y de integracion pasan
  [ ] Tests E2E en staging pasan
  [ ] Documentacion de API actualizada
  [ ] Monitoreo y alertas configurados
  [ ] Desplegado a produccion
```

### Como dividimos historias grandes (epicas)?

Una epica es una historia demasiado grande para un sprint. Para dividirla: identifica los criterios de aceptacion independientes — cada uno puede ser su propia historia. Usa el patron "vertical slice": cada historia entrega valor de usuario completo, no solo una capa tecnica. Evita dividir por capas (frontend, backend, database) — esto crea historias que no entregan valor por si solas. Usa el patron INVEST: Independent, Negotiable, Valuable, Estimable, Small, Testable. Si una historia no es Small, dividela. Documenta la relacion entre historias divididas con links. El Product Owner es responsable de priorizar las historias divididas.

### Como estimamos historias de usuario?

Usa Planning Poker con la secuencia Fibonacci (1, 2, 3, 5, 8, 13, 21). Cada ingeniero estima independientemente, luego discute diferencias. La estimacion es relativa, no absoluta — una historia de 5 puntos es mas grande que una de 3, no necesariamente 5 dias. Incluye en la estimacion: desarrollo, testing, code review, documentacion, y riesgo. Una historia de 1 punto deberia ser completable en 1-2 dias. Si una historia es 13 o mas, dividela. Revisa estimaciones vs. tiempo real en el retro para calibrar. No uses estimaciones para evaluar desempeno individual — son para planificacion, no para medicion.

### Como manejamos historias que cambian durante el sprint?

Si una historia cambia durante el sprint: evalua el impacto. Si el cambio es pequeno (un criterio de aceptacion adicional): agrega el criterio y continua. Si el cambio es grande (nuevo alcance significativo): mueve la historia de vuelta al backlog y crea una nueva con el alcance actualizado. El Product Owner debe aprobar cualquier cambio. Documenta el cambio y la razon. Si el cambio es causado por un descubrimiento tecnico (ej., la API no soporta lo que pensabamos): documenta el descubrimiento y ajusta la historia. No fuerces una historia a encajar si el alcance cambio considerablemente — es mejor ser transparente sobre el cambio.

### Como escribimos criterios de aceptacion efectivos?

Usa el formato Gherkin (Given-When-Then) para criterios de aceptacion. "Dado que [contexto], cuando [accion], entonces [resultado esperado]." Cada criterio debe ser testeable — si no puedes escribir un test para el, no es un buen criterio. Incluye criterios negativos: "Dado que el usuario no tiene permisos, cuando intenta X, entonces recibe un error 403." Incluye casos extremos: "Dado que la base de datos no responde, cuando el usuario hace X, entonces recibe un mensaje de error amigable." Evita criterios vagos como "la UI debe verse bien" — especifica exactamente que. El Product Owner y el ingeniero deben estar de acuerdo en que cada criterio significa antes de empezar el desarrollo.



















































































End of document. Review and update quarterly.

## Troubleshooting

- **Pattern does not fit the problem**: re-evaluate the forces (performance, scalability, team size, coupling). A pattern is only appropriate when its trade-offs match your constraints.
- **Too many abstractions**: if adding a pattern increases complexity without a clear benefit, simplify. Not every module needs a factory, decorator, or strategy.
- **Tight coupling after refactoring**: check that interfaces are stable and dependencies point inward. Use dependency inversion to break accidental coupling.
- **Tests break when the design changes**: favor stable contracts over internal structure. Test observable behavior, not private helpers.
- **Performance regression from indirection**: measure before and after. Layers, decorators, and adapters can add latency; cache or inline hot paths if needed.

## Errores Comunes en Producción

- Dejar campos requeridos vacíos o usar respuestas vagas de una palabra.
- Llenar el documento una vez y nunca actualizarlo cuando cambia el alcance o las decisiones.
- Guardar el documento donde el equipo no lo busque durante incidentes o revisiones.
- No asignar un responsable, fecha límite o cadencia de revisión.
- Copiar texto base sin eliminar secciones que no aplican.
- Saltar el control de versiones, lo que impide rollback y responsabilidad.
- No vincular el documento con decisiones relacionadas o acciones de seguimiento.
- Evitar revisiones trimestrales que retirarían secciones obsoletas o sin uso.
