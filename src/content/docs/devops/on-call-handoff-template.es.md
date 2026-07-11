---
contentType: docs
slug: on-call-handoff-template
title: "Plantilla de Entrega de Guardia (On-Call Handoff)"
description: "Una plantilla para transferir contexto operacional entre turnos de guardia incluyendo incidentes activos, alertas en curso y estado de salud del sistema."
metaDescription: "Transfiere contexto de guardia entre turnos con esta plantilla. Cubre incidentes activos, alertas en curso, salud del sistema y cambios proximos."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - on-call
  - handoff
  - runbook
  - incident-management
  - sre
  - template
relatedResources:
  - /docs/devops/incident-communication-template
  - /docs/devops/incident-timeline-template
  - /docs/devops/escalation-policy-template
  - /docs/devops/downtime-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Transfiere contexto de guardia entre turnos con esta plantilla. Cubre incidentes activos, alertas en curso, salud del sistema y cambios proximos."
  keywords:
    - entrega de guardia
    - cambio de turno
    - handoff de incidente
    - plantilla sre
    - plantilla on call
---

## Overview

Las entregas de guardia deficientes son una causa principal de escalamiento de incidentes. Cuando se pierde el contexto entre turnos, el ingeniero entrante pierde minutos preciosos redescubriendo lo que el ingeniente saliente ya sabia. Esta plantilla estandariza el proceso de entrega, asegurando que la informacion critica sobre incidentes activos, alertas en curso y estado del sistema se transfiera completamente y consistentemente.

## When to Use

Usa esta plantilla cuando:
- Transfieres responsabilidad de guardia entre turnos o miembros del equipo
- Te vas de vacaciones o licencia extendida con cobertura de guardia
- Entregas durante un incidente prolongado que abarca multiples turnos
- Rotas responsabilidades de guardia semanalmente o quincenalmente

## Prerequisites

Antes de la entrega:
- [ ] El ingeniero saliente revisa todas las alertas e incidentes activos
- [ ] Los runbooks para problemas en curso se actualizan con los ultimos hallazgos
- [ ] El historial del canal de incidente se resume para contexto
- [ ] Los cambios programados o despliegues proximos se anotan

## Solution

```markdown
# Reporte de Entrega de Guardia

## Metadatos de la Entrega

| Campo | Valor |
|-------|-------|
| Ingeniero saliente | ______ |
| Ingeniero entrante | ______ |
| Fecha/hora de entrega | ______ |
| Duracion del turno | ______ |

## 1. Incidentes Activos

### Incidente #1: `<Titulo>`
| Campo | Valor |
|-------|-------|
| Estado | Investigando / Mitigado / Resuelto |
| Severidad | P1 / P2 / P3 / P4 |
| Hora de inicio | ______ |
| Canal de incidente | ______ |
| Responsable actual | ______ |

**Resumen:**
Parrafo de una oracion describiendo que paso, que se ha intentado y estado actual.

**Proximos pasos:**
- [ ] Item de accion 1 (responsable: ______, fecha limite: ______)
- [ ] Item de accion 2 (responsable: ______, fecha limite: ______)

**Runbook / Referencia:**
Enlace al runbook o guia de troubleshooting relevante.

---

### Incidente #2: `<Titulo>`
(Misma estructura que arriba)

## 2. Alertas y Advertencias en Curso

| Alerta | Estado | Vista por Primera Vez | Notas |
|--------|--------|----------------------|-------|
| Alta latencia en API | WARN | hace 2 horas | Correlaciona con pico de trafico, no util aun |
| Uso de disco > 80% | WARN | hace 1 dia | Limpieza programada para esta noche |
| Lag de replicacion > 5s | OK | Recien resuelto | Auto-resuelto despues de reconstruccion de indice |

## 3. Resumen de Salud del Sistema

| Componente | Estado | Notas |
|------------|--------|-------|
| Latencia p95 de API | Saludable / Degradado / Critico | Valor actual: ______ |
| Tasa de error | Saludable / Degradado / Critico | Valor actual: ______ |
| Conexiones de base de datos | Saludable / Degradado / Critico | Valor actual: ______ |
| Profundidad de cola | Saludable / Degradado / Critico | Valor actual: ______ |
| Tasa de aciertos de cache | Saludable / Degradado / Critico | Valor actual: ______ |
| Uso de disco | Saludable / Degradado / Critico | Valor actual: ______ |

## 4. Cambios y Despliegues

### Completados Este Turno
| Cambio | Hora | Estado | Impacto |
|--------|------|--------|---------|
| Reconstruccion de indice de base de datos | 02:00 UTC | Exito | Redujo tiempo de consulta en 40% |
| Actualizacion de config de caching | 14:30 UTC | Exito | Sin impacto observado |

### Programados para el Proximo Turno
| Cambio | Hora | Riesgo | Preparado? |
|--------|------|--------|------------|
| Actualizacion de Kubernetes | 06:00 UTC | Medio | Rollback probado, guardia informada |
| Renovacion de certificado SSL | 10:00 UTC | Bajo | Auto-renovacion configurada |

## 5. Problemas Conocidos y Soluciones Temporales

| Problema | Solucion Temporal | Ticket | Prioridad |
|----------|---------------------|--------|-----------|
| Fuga de memoria en proceso worker | Reiniciar cada 6 horas | INC-123 | Media |
| Test flaky en pipeline de CI | Reintentar trabajo fallido | DEV-456 | Baja |

## 6. Rutas de Escalamiento

| Escenario | Escalar A | Contacto |
|-----------|-----------|----------|
| Incidente P1 > 30 min | Gerente de Ingenieria | Slack / Telefono |
| Incidente de seguridad | Equipo de Seguridad | PagerDuty |
| Interrupcion de infraestructura | Equipo de Plataforma | Slack / Telefono |
| Problema de integridad de datos | DBA de guardia | PagerDuty |

## 7. Notas y Contexto

**Observaciones inusuales este turno:**
- Cualquier anomalia que no llegue a nivel de alerta pero podria ser precursora de problemas

**Solicitudes de otros equipos:**
- Cualquier peticion no urgente que llego durante el turno

**Recordatorios generales:**
- Cualquier contexto especifico del equipo que el ingeniero entrante deberia saber
```

## Explanation

La plantilla estructura la entrega en **incidentes** (que esta roto), **alertas** (que podria romperse), **salud** (estado actual) y **cambios** (lo que viene). La seccion de ruta de escalamiento es critica para el ingeniero entrante que puede no saber a quien llamar a las 3 AM. La seccion de notas captura el contexto sutil que no encaja en otras categorias pero puede prevenir sorpresas.

## Checklist de Handoff

```text
=== Checklist Pre-Handoff ===

[ ] Todos los incidentes activos documentados con estado actual y proximos pasos
[ ] Todas las alertas de este turno revisadas y disposicion anotada
[ ] Screenshot o link del dashboard de salud del sistema incluido
[ ] Cambios programados para el proximo turno documentados
[ ] Problemas conocidos y workarounds actualizados
[ ] Rutas de escalacion verificadas (contactos aun validos)
[ ] Observaciones inusuales anotadas incluso si no estan alertando
[ ] Peticiones de otros equipos documentadas
[ ] Cronograma de PagerDuty confirmado para el ingeniero entrante
[ ] El ingeniero entrante ha reconocido la recepcion del handoff

=== Flujo de Conversacion de Handoff ===

1. Revisar incidentes activos primero (5 min)
2. Revisar alertas que pueden escalar (3 min)
3. Revisar salud del sistema juntos (2 min)
4. Discutir cambios programados (2 min)
5. Revisar problemas conocidos (2 min)
6. Compartir observaciones inusuales (1 min)
7. El ingeniero entrante hace preguntas (5 min)
8. Ambos confirman que el handoff esta completo
```


## Variants

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Entrega diaria de turno | Version abreviada (15 min) | Enfocarse solo en incidentes activos y alertas |
| Rotacion semanal | Plantilla completa con retrospectiva | Incluir conteo de incidentes, tendencias de MTTR |
| Cobertura de vacaciones | Version extendida | Agregar contexto de proyecto, calendario de reuniones, contactos de stakeholders |
| Entrega a mitad de incidente | Enfocado en incidente | Analisis profundo del incidente activo, de-priorizar items rutinarios |

## Lo que funciona

1. **Realizar entregas de forma sincronica** — las entregas asincronicas pierden preguntas y matices
2. **Actualizar la plantilla en tiempo real** — no la reconstruyas de memoria al final del turno
3. **Enlazar, no describir** — pega enlaces a dashboards, no capturas de pantalla de metricas
4. **Incluye el "entonces que"** — explica por que importa una alerta, no solo que existe
5. **Verificar el acuse de recibo del ingeniero entrante** — confirma que tiene acceso y entiende el contexto

## Common Mistakes

1. **Solo cubrir incidentes activos** — pierde problemas en gestacion que se convertiran en incidentes
2. **Copiar y pegar descripciones de alertas** — no proporciona contexto sobre lo que se ha investigado
3. **No mencionar cambios programados** — el ingeniero entrante se sorprende con ventanas de mantenimiento
4. **Saltar la ruta de escalamiento** — pierde minutos encontrando a quien llamar durante un P1
5. **Entregar durante un incidente activo** — la transferencia de contexto mientras se depura es incompleta; pausa la investigacion por 5 minutos para documentar

## Frequently Asked Questions

### Que tan detallado debe ser el resumen del incidente?

Apunta a suficiente detalle para que el ingeniero entrante pueda responder "que paso hasta ahora?" y "que deberia intentar despues?" sin leer todo el canal de incidente. Usualmente 2-3 oraciones por incidente, mas pasos especificos siguientes.

### Que pasa si no hay incidentes activos?

Aun asi completa la entrega. Anota cualquier patron inusual en metricas, cambios proximos y problemas conocidos. Una entrega "tranquila" es contexto valioso — establece la linea base de lo que es normal.

### Debo incluir problemas que impactan clientes pero que no han disparado alertas?

Si. Si soporte reporto problemas de clientes o si notaste comportamiento degradado que no ha cruzado umbrales de alerta, documentalo en la seccion de notas. Estos son frecuentemente los primeros indicadores de problemas en gestacion.


### Como manejamos handoffs a traves de zonas horarias?

Para equipos globales: programa una ventana de 15 minutos de superposicion para handoff sincrono. Si no hay superposicion, usa un handoff asincrono con una grabacion de video (Loom) mas el documento escrito. Establece un plazo para que el ingeniero entrante reconozca la recepcion. Para handoffs criticos, ten un contacto de respaldo en la region del ingeniero entrante. Usa un documento de handoff compartido que persista entre turnos (ej., una pagina wiki o hilo de Slack) para que el contexto no se pierda. Rota los horarios de handoff periodicamente para que la misma persona no siempre haga handoffs a horas inconvenientes.

### Que herramientas deberiamos usar para handoffs on-call?

Usa una combinacion de: un documento de handoff escrito (doc compartido, wiki, o plantilla en la herramienta de gestion de incidentes), una conversacion sincrona (videollamada o huddle de Slack), y el dashboard de monitoreo (link compartido, no screenshot). PagerDuty u Opsgenie para visibilidad del cronograma. Slack o Teams para comunicacion en tiempo real. Un repositorio de runbooks compartido para rutas de escalacion y problemas conocidos. Evita email para handoffs — es muy lento y facil de perder. El documento de handoff deberia ser buscable para referencia futura.

### Como capacitamos a nuevos ingenieros en el proceso de handoff?

Empareja al nuevo ingeniero con un ingeniero on-call experimentado por sus primeros 2-3 turnos. Haz que observe el proceso de handoff, luego co-escriba el documento de handoff, luego lidere el handoff con el ingeniero experimentado revisando. Proporciona una guia escrita que explique cada seccion de la plantilla y que informacion se espera. Conduce un handoff simulado durante la capacitacion de onboarding. Revisa el primer handoff solo del nuevo ingeniero y proporciona feedback. Incluye capacitacion de handoff en la checklist de preparacion on-call.

### Que pasa si el ingeniero entrante no esta disponible para el handoff?

Si el ingeniero entrante no responde dentro de 15 minutos del handoff programado: llamalo directamente (telefono, no solo Slack). Si no hay respuesta despues de 30 minutos: escala al manager on-call. Si no hay respuesta despues de 1 hora: contacta al ingeniero on-call de respaldo. Documenta el handoff perdido en el reporte de turno. El ingeniero saliente debe permanecer on-call hasta que el handoff se complete — nunca dejes el sistema sin un ingeniero on-call. Revisa handoffs perdidos repetidos en la retrospectiva del equipo y ajusta el cronograma o proceso.

### Como mejoramos la calidad del handoff con el tiempo?

Revisa documentos de handoff semanalmente en la reunion del equipo — destaca buenos handoffs e identifica brechas. Rastrea metricas: numero de incidentes perdidos despues del handoff, tiempo hasta la primera respuesta despues del cambio de turno, y satisfaccion del ingeniero entrante con la calidad del handoff. Encuesta a ingenieros entrantes mensualmente: "El handoff te dio suficiente contexto para manejar el turno?" Ajusta la plantilla basada en feedback. Elimina secciones que estan consistentemente vacias. Agrega secciones para brechas recurrentes. Comparte mejores practicas entre equipos.


### Como manejamos handoffs a traves de zonas horarias?

Para equipos globales: programa una ventana de 15 minutos de superposicion para handoff sincrono. Si no hay superposicion, usa un handoff asincrono con una grabacion de video (Loom) mas el documento escrito. Establece un plazo para que el ingeniero entrante reconozca la recepcion. Para handoffs criticos, ten un contacto de respaldo en la region del ingeniero entrante. Usa un documento de handoff compartido que persista entre turnos (ej., una pagina wiki o hilo de Slack) para que el contexto no se pierda. Rota los horarios de handoff periodicamente para que la misma persona no siempre haga handoffs a horas inconvenientes.

### Que herramientas deberiamos usar para handoffs on-call?

Usa una combinacion de: un documento de handoff escrito (doc compartido, wiki, o plantilla en la herramienta de gestion de incidentes), una conversacion sincrona (videollamada o huddle de Slack), y el dashboard de monitoreo (link compartido, no screenshot). PagerDuty u Opsgenie para visibilidad del cronograma. Slack o Teams para comunicacion en tiempo real. Un repositorio de runbooks compartido para rutas de escalacion y problemas conocidos. Evita email para handoffs — es muy lento y facil de perder. El documento de handoff deberia ser buscable para referencia futura.

### Como capacitamos a nuevos ingenieros en el proceso de handoff?

Empareja al nuevo ingeniero con un ingeniero on-call experimentado por sus primeros 2-3 turnos. Haz que observe el proceso de handoff, luego co-escriba el documento de handoff, luego lidere el handoff con el ingeniero experimentado revisando. Proporciona una guia escrita que explique cada seccion de la plantilla y que informacion se espera. Conduce un handoff simulado durante la capacitacion de onboarding. Revisa el primer handoff solo del nuevo ingeniero y proporciona feedback. Incluye capacitacion de handoff en la checklist de preparacion on-call.

### Que pasa si el ingeniero entrante no esta disponible para el handoff?

Si el ingeniero entrante no responde dentro de 15 minutos del handoff programado: llamalo directamente (telefono, no solo Slack). Si no hay respuesta despues de 30 minutos: escala al manager on-call. Si no hay respuesta despues de 1 hora: contacta al ingeniero on-call de respaldo. Documenta el handoff perdido en el reporte de turno. El ingeniero saliente debe permanecer on-call hasta que el handoff se complete — nunca dejes el sistema sin un ingeniero on-call. Revisa handoffs perdidos repetidos en la retrospectiva del equipo y ajusta el cronograma o proceso.

### Como mejoramos la calidad del handoff con el tiempo?

Revisa documentos de handoff semanalmente en la reunion del equipo — destaca buenos handoffs e identifica brechas. Rastrea metricas: numero de incidentes perdidos despues del handoff, tiempo hasta la primera respuesta despues del cambio de turno, y satisfaccion del ingeniero entrante con la calidad del handoff. Encuesta a ingenieros entrantes mensualmente: "El handoff te dio suficiente contexto para manejar el turno?" Ajusta la plantilla basada en feedback. Elimina secciones que estan consistentemente vacias. Agrega secciones para brechas recurrentes. Comparte mejores practicas entre equipos.

































End of document. Review and update quarterly.