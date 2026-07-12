---


contentType: docs
slug: onboarding-checklist-backend-engineer
title: "Checklist de Onboarding para Ingenieros Backend"
description: "Una checklist essential para onboardear nuevos ingenieros backend cubriendo configuracion del entorno, orientacion al codebase, entrenamiento de seguridad y metas de la primera semana."
metaDescription: "Onboarda ingenieros backend con esta checklist. Cubre entorno, codebase, seguridad, despliegue y entregables de la primera semana."
difficulty: beginner
topics:
  - devops
  - architecture
tags:
  - onboarding
  - checklist
  - backend
  - new-hire
  - team-process
  - engineering
relatedResources:
  - /docs/engineering-handbook-template
  - /docs/git-branching-strategy-document
  - /docs/code-review-checklist-template
  - /docs/service-ownership-document-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Onboarda ingenieros backend con esta checklist. Cubre entorno, codebase, seguridad, despliegue y entregables de la primera semana."
  keywords:
    - onboarding ingeniero backend
    - checklist onboarding desarrollador
    - nueva contratacion ingenieria
    - plantilla onboarding
    - primera semana ingeniero


---

## Overview

Un onboarding desestructurado desperdicia el primer mes de contribucion de un nuevo ingeniero. Sin una checklist, los nuevos contratados pierden dias descubriendo que repositorios clonar, que canales de Slack importan, y como desplegar su primer cambio. Esta checklist estructura las primeras dos semanas para que los nuevos ingenieros backend se conviertan rapidamente en contribuyentes productivos mientras absorben la cultura del equipo y los estandares tecnicos.

## When to Use


- For alternatives, see [Event-Driven Architecture — Queues, Topics, and Streams](/es/guides/event-driven-architecture-guide/).

Usa esta checklist cuando:
- Un nuevo ingeniero backend se une a tu equipo
- Un ingeniero se transfiere de frontend u otra especializacion
- Estas estandarizando el onboarding entre multiples equipos
- Necesitas medir y mejorar tu proceso de onboarding

## Prerequisites

Antes de que el nuevo contratado empiece:
- [ ] Hardware pedido y configurado (laptop, monitores, perifericos)
- [ ] Cuentas creadas (email, Slack, GitHub, proveedor cloud, VPN)
- [ ] Manager asignado y calendario bloqueado para 1:1s de la primera semana
- [ ] Companero de onboarding asignado del equipo de ingenieria
- [ ] Solicitudes de acceso enviadas para acceso de solo lectura a produccion

## Solution

```markdown
# Checklist de Onboarding para Ingeniero Backend

## Nuevo Ingreso: ______ | Fecha de Inicio: ______ | Manager: ______ | Companero: ______

---

## Dia 1: Bienvenida y Configuracion

### Administrativo
- [ ] Completar papeleo de RRHH e inscripcion de beneficios
- [ ] Recibir laptop y configuracion de hardware
- [ ] Obtener tarjeta de acceso al edificio / pase de estacionamiento
- [ ] Configurar email y calendario
- [ ] Unirse a canales esenciales de Slack/Teams
  - #general, #engineering, #backend, #incidents, #deployments
- [ ] Agregar foto de perfil y estado a Slack
- [ ] Programar 1:1s con manager, companero y tech lead

### Entorno de Desarrollo
- [ ] Instalar software requerido (ver handbook de ingenieria para versiones)
  - [ ] Git
  - [ ] Docker y Docker Compose
  - [ ] Node.js / Python / Java / Go (stack especifico)
  - [ ] IDE (VS Code / IntelliJ / GoLand) con configuracion del equipo
  - [ ] kubectl y herramientas CLI del proveedor cloud
  - [ ] Postman o cliente API
- [ ] Configurar Git con email de la empresa y clave de firma
- [ ] Clonar repositorios principales
  - [ ] Repositorio de aplicacion principal
  - [ ] Repositorio de infraestructura / despliegue
  - [ ] Repositorio de librerias compartidas / SDK
- [ ] Ejecutar el proyecto localmente siguiendo las instrucciones del README
- [ ] Verificar que los tests locales pasan
- [ ] Hacer una correccion trivial de documentacion y abrir primer PR

### Acceso y Seguridad
- [ ] Completar entrenamiento de concientizacion de seguridad
- [ ] Configurar gestor de contrasenas con acceso al vault del equipo
- [ ] Habilitar MFA en todas las cuentas (GitHub, proveedor cloud, VPN)
- [ ] Solicitar y recibir acceso al entorno de staging
- [ ] Leer y reconocer las politicas de manejo de datos

---

## Semana 1: Orientacion al Codebase

### Arquitectura y Sistemas
- [ ] Asistir a sesion de overview de arquitectura (grabada si no esta disponible en vivo)
- [ ] Revisar diagrama de arquitectura del sistema y documentacion de flujo de datos
- [ ] Identificar los 5 servicios mas criticos que posee el equipo
- [ ] Entender el ciclo de vida de la peticion: cliente → balanceador → servicio → base de datos
- [ ] Revisar documentacion de API (OpenAPI / Swagger)
- [ ] Recorrer la guia de debugging para problemas locales comunes

### Estandares de Codigo
- [ ] Leer el documento de estandares de codigo del equipo
- [ ] Revisar 5 PRs recientemente mergeados para entender patrones de revision
- [ ] Entender reglas de linting y formateo (ejecutar linters localmente)
- [ ] Aprender la filosofia de testing del equipo (unitario vs integracion vs e2e)
- [ ] Revisar patrones de manejo de errores en el codebase

### Procesos
- [ ] Entender el ritmo de sprint/iteracion (planning, standups, retros)
- [ ] Aprender como tomar trabajo (sistema de tickets, tablero Kanban)
- [ ] Asistir a planning de sprint y retrospectiva como observador
- [ ] Entender la rotacion de guardia y procedimientos de escalamiento
- [ ] Revisar runbooks de respuesta a incidentes

### Primera Contribucion
- [ ] Tomar un "good first issue" (etiquetado en el tracker)
- [ ] Abrir un PR siguiendo la plantilla de PR del equipo
- [ ] Recibir y atender feedback de code review
- [ ] Mergear primer PR con guia del companero
- [ ] Verificar que el cambio se despliega exitosamente a staging

---

## Semana 2: Integracion Profunda

### Conciencia de Produccion
- [ ] Observar un turno de un ingeniero de guardia (sin interrumpir)
- [ ] Revisar dashboards de monitoreo de produccion
- [ ] Entender umbrales de alertas y procedimientos de paging
- [ ] Aprender como consultar logs en la herramienta de agregacion del equipo
- [ ] Revisar postmortems recientes (ultimos 3 meses)

### Conocimiento de Dominio
- [ ] Reunirse con product manager para entender el roadmap actual
- [ ] Revisar funcionalidades orientadas al usuario y logica de negocio con experto de dominio
- [ ] Entender el modelo de datos y relaciones entre entidades
- [ ] Revisar puntos de integracion con servicios externos
- [ ] Aprender sobre requisitos de cumplimiento y regulatorios (si aplica)

### Ownership
- [ ] Identificar el servicio o componente que poseeras
- [ ] Revisar documentacion de ownership del servicio
- [ ] Entender el pipeline de despliegue para tu servicio
- [ ] Aprender procedimientos de rollback para tu servicio
- [ ] Agregarte a la rotacion de guardia del servicio (con supervision)

---

## Verificacion de Completitud

| Area | Verificado Por | Fecha | Notas |
|------|----------------|-------|-------|
| Configuracion del Entorno | ______ | ______ | |
| Build Local Funcionando | ______ | ______ | |
| Primer PR Mergeado | ______ | ______ | |
| Entrenamiento de Seguridad | ______ | ______ | |
| Overview de Arquitectura | ______ | ______ | |
| Observacion de Guardia Completa | ______ | ______ | |

## Feedback

**Que fue mas util?**

**Que falto o fue confuso?**

**Cuanto tiempo hasta que te sentiste productivo?**

**Recomendaciones para mejorar esta checklist:**
```

## Explanation

La checklist separa el onboarding en tres fases: Dia 1 (administrativo y configuracion tecnica), Semana 1 (orientacion al codebase y primera contribucion), y Semana 2 (conciencia de produccion y ownership). La estructura reconoce que los nuevos ingenieros necesitan cosas diferentes en diferentes momentos: primero entornos que funcionen, luego contexto, despues ownership. El sistema de companero asegura que nadie se atasca, y la verificacion de completitud crea responsabilidad tanto para el nuevo contratado como para el equipo.

## Plan de Onboarding 30-60-90 Dias

```text
=== Dia 30: Contribuyendo ===

Objetivos:
  - Entorno completamente configurado y funcionando
  - Primeros 3-5 PRs mergeados (bug fixes, features pequenas, tests)
  - Participando en revisiones de codigo (revisando a otros)
  - Entiende el flujo del equipo (standups, planning, retros)
  - Ha conocido a todos los miembros del equipo 1:1
  - Capacitacion de seguridad y compliance completada

Check-in: Manager + buddy revisan progreso, identifican bloqueadores

=== Dia 60: Tomando Responsabilidad ===

Objetivos:
  - Es dueno de un servicio o componente (revisor primario de cambios)
  - Ha sido on-call shadow por 2+ turnos
  - Participando en discusiones de diseno
  - Puede desplegar a staging independientemente
  - Puede debuggear problemas de produccion con guia
  - Ha escrito o actualizado documentacion

Check-in: Manager revisa preparacion para responsabilidad, ajusta alcance

=== Dia 90: Independiente ===

Objetivos:
  - On-call independiente (con backup disponible)
  - Puede desplegar a produccion independientemente
  - Liderando una feature pequena o mejora
  - Mentoreando al proximo nuevo contratado (si aplica)
  - Ha completado o contribuido a un postmortem
  - Revision de desempeno: en camino para las expectativas

Check-in: Manager + skip-level, confirmar onboarding exitoso
```


## Variants

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| Ingeniero senior | Agregar revision de arquitectura, responsabilidades de mentorias, introducciones cross-team | Esperar completion mas rapido (5-7 dias en lugar de 10) |
| Contratista / consultor | Enfocarse en repos especificos del proyecto, omitir procesos/cultura del equipo | Timeline mas ajustado, enfoque en entregables especificos |
| Pasante / ingeniero junior | Agregar revision de fundamentos de programacion, calendario de pair programming | Timeline mas largo, guia mas estructurada |
| Equipo remoto | Agregar normas de comunicacion async, coordinacion de zonas horarias, chats virtuales | No hay setup fisico; mayor enfasis en documentacion |
| Fusion de equipos / adquisicion | Agregar orientacion a sistemas legacy, sensibilidad politica, adopcion de nuevos procesos | Enfocarse en integracion en lugar de inicio fresco |

## Lo que funciona

1. Asigna un companero, no solo un manager. Los companeros responden las preguntas "como hago..." que los managers no pueden.
2. Ten el primer PR listo el dia 1. Una correccion de documentacion o un test agregan confianza inmediatamente.
3. Graba overviews de arquitectura. Las sesiones en vivo son valiosas pero no repetibles; graba para futuros contratados.
4. Mide tiempo-hasta-primer-PR. Rastrea esta metrica para mejorar tu proceso de onboarding.
5. Actualiza la checklist despues de cada nuevo ingreso. Ojos frescos detectan brechas inmediatamente.

## Common Mistakes

1. Enfocarse solo en configuracion tecnica. La cultura, relaciones, y conocimiento de procesos importan tanto como el codigo.
2. Lanzar a nuevos contratados a tareas complejas muy temprano. Las primeras contribuciones deberian ser alcanzables en 1-2 dias.
3. Saltar explicaciones de acceso a produccion. Los nuevos ingenieros necesitan entender que pueden y no pueden tocar.
4. No explicar el "por que" detras de procesos. Seguir reglas sin entender crea comportamiento de culto de carga.
5. Olvidar hacer check-in despues de la semana 2. El onboarding continua por 3-6 meses; la checklist es solo el inicio.

## Frequently Asked Questions

### Cuanto deberia durar el onboarding?

Para ingenieros backend experimentados: 1-2 semanas hasta primera contribucion significativa, 1 mes hasta productividad completa. Para ingenieros junior: 2-4 semanas hasta primera contribucion, 2-3 meses hasta productividad completa. Son guias; ajusta basado en complejidad del codebase y requisitos de conocimiento de dominio.

### Deberian los nuevos ingenieros entrar a guardia inmediatamente?

No. Primero observa guardia (sin responsabilidad), luego unete a rotacion con un companero experimentado disponible. La mayoria de los equipos esperan 1-2 meses antes de guardia independiente. El timeline exacto depende de la complejidad del sistema y calidad de la documentacion.

### Que pasa si el nuevo contratado termina todo temprano?

Esa es una senal de un proceso bien ejecutado. Usa el tiempo extra para exploracion mas profunda del dominio, contribuciones a mejoras de herramientas, o observacion de otros equipos. La terminacion temprana tambien indica que tu documentacion y tooling estan en buena forma.


### Como medimos el exito del onboarding?

Rastrea estas metricas: tiempo al primer PR (objetivo: < 3 dias), tiempo al primer despliegue a produccion (objetivo: < 2 semanas), tiempo a on-call independiente (objetivo: < 2 meses), puntaje de satisfaccion del nuevo contratado (encuesta al dia 30, 60, 90), puntaje de satisfaccion del buddy, y tasa de retencion a 6 meses. Revisa metricas trimestralmente y ajusta el proceso de onboarding. Compara metricas entre equipos para identificar mejores practicas. Comparte patrones de onboarding exitosos con otros equipos. Un buen proceso de onboarding mejora la retencion y reduce el tiempo a productividad.

### Que deberia incluir el rol de buddy?

El buddy es la persona de referencia del nuevo contratado para preguntas del dia a dia. Responsabilidades: ayudar con la configuracion del entorno, responder preguntas de "como hago...", revisar los primeros PRs, explicar normas del equipo no escritas, presentar a otros miembros del equipo, y hacer check-in diario durante la semana 1. El buddy no es un mentor (crecimiento profesional) ni un manager (desempeno) — es un guia par. Asigna el buddy antes del dia 1. El buddy deberia haber estado en el equipo por al menos 6 meses. Rota las asignaciones de buddy para prevenir burnout. Reconoce las contribuciones del buddy en revisiones de desempeno.

### Como manejamos el onboarding remoto?

Para onboarding remoto: envia el hardware para que llegue antes del dia 1. Programa una videollamada para la primera manana (no solo un mensaje de Slack). Usa screen sharing para la configuracion del entorno. Graba todas las revisiones de arquitectura e introducciones del equipo. Crea un canal virtual de "water cooler" para chat informal. Programa check-ins diarios de 15 minutos con el buddy para la semana 1. Usa sesiones de pair programming para el primer PR. Se explicito sobre las normas de comunicacion (que canales para que, expectativas de tiempo de respuesta). Envia un paquete de bienvenida (swag de la empresa, cuaderno) a la casa del nuevo contratado. Considera diferencias de zona horaria al programar reuniones.

### Que pasa si el nuevo contratado esta teniendo dificultades?

Si un nuevo contratado esta teniendo dificultades: identifica el area especifica (tecnica, conocimiento de dominio, proceso, social). Ajusta el plan de onboarding: agrega mas tiempo 1:1 con el buddy, divide tareas en piezas mas pequenas, proporciona recursos de capacitacion adicionales, o programa mas pair programming. Programa un check-in con el manager para discutir preocupaciones abierta y constructivamente. Documenta ejemplos especificos y feedback accionable. Establece expectativas claras y un cronograma para mejora. Si la dificultad es sistemica (no culpa del contratado), revisa el proceso de onboarding por brechas. La mayoria de las dificultades son solucionables con soporte dirigido — no esperes para actuar.

### Como mantenemos la checklist actualizada?

Despues de que cada nuevo contratado complete el onboarding: pidele que revise la checklist y anote que falto, que esta desactualizado, o que fue confuso. Actualiza la checklist dentro de 1 semana mientras el feedback es fresco. Revisa la checklist trimestralmente con el equipo — los servicios cambian, las herramientas cambian, los procesos cambian. Asigna un dueno de checklist (usualmente el manager de ingenieria o un ingeniero senior. Versiona la checklist para que los cambios sean rastreados. Comparte actualizaciones con el equipo para que todos sepan que cambio. Una checklist obsoleta es peor que ninguna checklist — engana a los nuevos contratados y erosiona la confianza en el proceso.


### Como medimos el exito del onboarding?

Rastrea estas metricas: tiempo al primer PR (objetivo: < 3 dias), tiempo al primer despliegue a produccion (objetivo: < 2 semanas), tiempo a on-call independiente (objetivo: < 2 meses), puntaje de satisfaccion del nuevo contratado (encuesta al dia 30, 60, 90), puntaje de satisfaccion del buddy, y tasa de retencion a 6 meses. Revisa metricas trimestralmente y ajusta el proceso de onboarding. Compara metricas entre equipos para identificar mejores practicas. Comparte patrones de onboarding exitosos con otros equipos. Un buen proceso de onboarding mejora la retencion y reduce el tiempo a productividad.

### Que deberia incluir el rol de buddy?

El buddy es la persona de referencia del nuevo contratado para preguntas del dia a dia. Responsabilidades: ayudar con la configuracion del entorno, responder preguntas de "como hago...", revisar los primeros PRs, explicar normas del equipo no escritas, presentar a otros miembros del equipo, y hacer check-in diario durante la semana 1. El buddy no es un mentor (crecimiento profesional) ni un manager (desempeno) — es un guia par. Asigna el buddy antes del dia 1. El buddy deberia haber estado en el equipo por al menos 6 meses. Rota las asignaciones de buddy para prevenir burnout. Reconoce las contribuciones del buddy en revisiones de desempeno.

### Como manejamos el onboarding remoto?

Para onboarding remoto: envia el hardware para que llegue antes del dia 1. Programa una videollamada para la primera manana (no solo un mensaje de Slack). Usa screen sharing para la configuracion del entorno. Graba todas las revisiones de arquitectura e introducciones del equipo. Crea un canal virtual de "water cooler" para chat informal. Programa check-ins diarios de 15 minutos con el buddy para la semana 1. Usa sesiones de pair programming para el primer PR. Se explicito sobre las normas de comunicacion (que canales para que, expectativas de tiempo de respuesta). Envia un paquete de bienvenida (swag de la empresa, cuaderno) a la casa del nuevo contratado. Considera diferencias de zona horaria al programar reuniones.

### Que pasa si el nuevo contratado esta teniendo dificultades?

Si un nuevo contratado esta teniendo dificultades: identifica el area especifica (tecnica, conocimiento de dominio, proceso, social). Ajusta el plan de onboarding: agrega mas tiempo 1:1 con el buddy, divide tareas en piezas mas pequenas, proporciona recursos de capacitacion adicionales, o programa mas pair programming. Programa un check-in con el manager para discutir preocupaciones abierta y constructivamente. Documenta ejemplos especificos y feedback accionable. Establece expectativas claras y un cronograma para mejora. Si la dificultad es sistemica (no culpa del contratado), revisa el proceso de onboarding por brechas. La mayoria de las dificultades son solucionables con soporte dirigido — no esperes para actuar.

### Como mantenemos la checklist actualizada?

Despues de que cada nuevo contratado complete el onboarding: pidele que revise la checklist y anote que falto, que esta desactualizado, o que fue confuso. Actualiza la checklist dentro de 1 semana mientras el feedback es fresco. Revisa la checklist trimestralmente con el equipo — los servicios cambian, las herramientas cambian, los procesos cambian. Asigna un dueno de checklist (usualmente el manager de ingenieria o un ingeniero senior). Versiona la checklist para que los cambios sean rastreados. Comparte actualizaciones con el equipo para que todos sepan que cambio. Una checklist obsoleta es peor que ninguna checklist — engana a los nuevos contratados y erosiona la confianza en el proceso.
