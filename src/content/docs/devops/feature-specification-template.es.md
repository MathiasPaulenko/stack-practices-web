---
contentType: docs
slug: feature-specification-template
title: "Plantilla de Especificacion de Feature"
description: "Una plantilla para escribir especificaciones de features claras y accionables que alineen ingenieria, producto, y diseno antes de que comience el desarrollo."
metaDescription: "Escribe mejores especificaciones de features con esta plantilla. Cubre objetivos, requerimientos, user stories, criterios de aceptacion y plan de rollout."
difficulty: beginner
topics:
  - devops
  - design
tags:
  - specification
  - feature-request
  - requirements
  - product-planning
  - template
relatedResources:
  - /docs/devops/architecture-decision-record-adr-template
  - /docs/devops/engineering-handbook-template
  - /docs/devops/code-review-checklist-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Escribe mejores especificaciones de features con esta plantilla. Cubre objetivos, requerimientos, user stories, criterios de aceptacion y plan de rollout."
  keywords:
    - especificacion de feature
    - documento de requerimientos
    - plantilla de spec de producto
    - criterios de aceptacion
    - user stories
---

## Descripcion General

Los bugs mas costosos no estan en el codigo — estan en requerimientos mal entendidos. Una especificacion de feature es un documento que alinea producto, diseno, e ingenieria sobre que construir, por que importa, y como saber que esta listo. Previene las conversaciones de "yo pense que tu querias decir..." que desvian sprints y generan retrabajo. Una buena spec no es un contrato; es un entendimiento compartido que evoluciona a medida que el equipo aprende.

## Cuando Usar

Usa esta plantilla cuando:
- Un feature toca multiples sistemas, equipos, o journey de usuarios
- Ingenieros y product managers tienen entendimientos diferentes del requerimiento
- El feature tiene casos borde, dependencias, o complejidad de rollout no obvios
- Necesitas estimar esfuerzo antes de comprometerte a un sprint
- El feature afecta a usuarios, datos, o facturacion y necesita sign-off explicito

## Prerrequisitos

Antes de escribir una especificacion de feature:
- [ ] El objetivo de producto esta claro: que problema resolvemos y para quien?
- [ ] Stakeholders (producto, ingenieria, diseno, QA) estan identificados
- [ ] Metricas de exito estan definidas: como sabremos que este feature funciono?
- [ ] Restricciones estan documentadas: tiempo, presupuesto, compliance, o limitaciones tecnicas
- [ ] Has revisado specs relacionadas para evitar duplicar o entrar en conflicto con trabajo existente

## Solucion

```markdown
# Especificacion de Feature: `<Nombre del Feature>`

> Autor: ______ | Product Owner: ______ | Estado: Borrador / En revision / Aprobado
> Creado: AAAA-MM-DD | Ultima actualizacion: AAAA-MM-DD | Release target: ______

## 1. Resumen

**Problema:** [Que dolor de usuario u oportunidad de negocio aborda esto?]

**Solucion propuesta:** [Descripcion de una oracion del feature]

**Criterios de exito:** [Como medimos si este feature resolvio el problema]

## 2. Objetivos y No-Objetivos

### Objetivos
- [Objetivo 1: que lograremos]
- [Objetivo 2]
- [Objetivo 3]

### No-Objetivos
- [Lo que explicitamente no haremos en esta version]
- [Lo que esta fuera de alcance]

## 3. User Stories

| Usuario | Necesidad | Para que | Prioridad |
|---------|-----------|----------|-----------|
| [Persona] | [Accion] | [Resultado] | P0 / P1 / P2 |
| ______ | ______ | ______ | ______ |

## 4. Requerimientos Funcionales

### 4.1 [Area de Requerimiento 1]
- **RF-1.1:** [Requerimiento especifico y testeable]
- **RF-1.2:** [Requerimiento especifico y testeable]

### 4.2 [Area de Requerimiento 2]
- **RF-2.1:** [Requerimiento especifico y testeable]

## 5. Requerimientos No-Funcionales

- **Rendimiento:** [ej., p99 tiempo de respuesta < 200ms]
- **Escalabilidad:** [ej., soportar 10x carga actual]
- **Disponibilidad:** [ej., 99.9% uptime durante rollout]
- **Seguridad:** [ej., datos encriptados en transito y en reposo]
- **Accesibilidad:** [ej., cumple WCAG 2.1 AA]
- **Compliance:** [ej., soporta derecho a borrado GDPR]

## 6. Diseno y UX

- **Figma / mockups:** [Link]
- **Copy y localizacion:** [Link o notas]
- **Flujo de interaccion:** [Paso a paso o diagrama]
- **Casos borde:** [Estados vacios, errores, carga, offline]

## 7. Enfoque Tecnico

### Arquitectura
[Diagrama o descripcion de como este feature encaja en sistemas existentes]

### Cambios al Modelo de Datos
[Nuevas tablas, campos, o cambios de esquema]

### Cambios de API
[Nuevos endpoints, payloads modificados, plan de compatibilidad hacia atras]

### Dependencias
[Servicios, librerias, o equipos de los que depende este feature]

### Estrategia de Rollout
- **Fase 1:** [Testing interno / alpha]
- **Fase 2:** [Beta con usuarios limitados]
- **Fase 3:** [Disponibilidad general]
- **Plan de rollback:** [Como deshacer si algo sale mal]

## 8. Criterios de Aceptacion

- [ ] [Criterio 1: condicion especifica y verificable para done]
- [ ] [Criterio 2]
- [ ] [Criterio 3]

## 9. Preguntas Abiertas

| Pregunta | Dueno | Fecha limite |
|----------|-------|-------------|
| ______ | ______ | ______ |

## 10. Apendice

- **Specs relacionadas:** [Links]
- **Contexto historico:** [Intentos previos, decisiones relacionadas]
- **Glosario:** [Terminos que necesitan definicion]
```

## Explicacion

La plantilla esta organizada por **audiencia**: producto posee el resumen y objetivos, diseno posee la seccion UX, ingenieria posee el enfoque tecnico, y QA posee los criterios de aceptacion. Separar requerimientos funcionales de no-funcionales previene el error comun de olvidar rendimiento, seguridad, o accesibilidad hasta tarde en el desarrollo. La **seccion de no-objetivos** es particularmente importante: previene el scope creep haciendo explicito lo que esta fuera de alcance.

## Ejemplo de Especificacion de Feature

```markdown
# Spec de Feature: Notificaciones de Orden en Tiempo Real

## Resumen
Agregar notificaciones en tiempo real del estado de ordenes al
dashboard del usuario usando conexiones WebSocket. Los usuarios
veran actualizaciones de ordenes inmediatamente sin refrescar la pagina.

## Objetivos
- Reducir tickets de soporte sobre estado de ordenes en 30%
- Mejorar el engagement del usuario con el dashboard
- Proporcionar entrega de notificaciones sub-segundo

## No-Objetivos
- Notificaciones push moviles (feature separado)
- Notificaciones por email (ya implementado)
- Busqueda en historial de ordenes (feature separado)

## Historias de Usuario
1. Como comprador, quiero ver actualizaciones de estado de orden en
   tiempo real para no necesitar refrescar la pagina.
2. Como vendedor, quiero saber cuando se realiza una orden para poder
   preparar el envio inmediatamente.
3. Como agente de soporte, quiero ver las mismas notificaciones para
   poder responder preguntas de clientes con precision.

## Requisitos Funcionales
- Conexion WebSocket al cargar el dashboard
- Reconexion con backoff exponencial al desconectar
- Payload de notificacion incluye: ID de orden, estado, timestamp
- Las notificaciones aparecen como toast messages y en un panel

## Requisitos No-Funcionales
- Latencia de entrega de notificacion: p95 < 500ms
- Conexiones WebSocket: soportar 10,000 concurrentes
- Fallback a polling si WebSocket falla despues de 3 reintentos
- Accesibilidad: notificaciones anunciadas via ARIA live region

## Enfoque Tecnico
- WebSocket gateway: AWS API Gateway WebSocket
- Message broker: Redis Pub/Sub
- Auth: JWT token pasado en query params de conexion
- Frontend: WebSocket API nativo con wrapper de reconexion

## Cambios de API
- Nuevo endpoint: GET /api/v1/notifications/stream (WebSocket upgrade)
- Nuevo endpoint: GET /api/v1/notifications (REST fallback, polling)
- Sin cambios disruptivos a endpoints existentes

## Estrategia de Rollout
- Fase 1: Testing interno con 10 usuarios (1 semana)
- Fase 2: Beta con 5% de usuarios (2 semanas)
- Fase 3: Disponibilidad general (monitorear por 1 semana)
- Rollback: Deshabilitar feature flag de WebSocket, usuarios caen a polling

## Criterios de Aceptacion
- [ ] WebSocket se conecta al cargar el dashboard
- [ ] Cambios de estado de orden aparecen en 500ms
- [ ] La conexion se recupera automaticamente despues de interrupcion de red
- [ ] Las notificaciones son accesibles via screen reader
- [ ] El sistema maneja 10,000 conexiones concurrentes en load test
```


## Variantes

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| Feature solo de API | Reemplazar seccion UX con diseno de endpoints, schemas de payload, y plan de versionado | Las APIs internas aun necesitan user stories (el usuario es otro desarrollador) |
| Feature de datos / ML | Agregar fuentes de datos, pipeline de entrenamiento de modelos, y metricas de evaluacion | Las specs de ML necesitan tracking de experimentos y reproducibilidad |
| Feature de seguridad | Expandir requerimientos de seguridad; agregar modelo de amenazas y mapeo de compliance | Los features de seguridad necesitan sign-off explicito del equipo de seguridad |
| Feature de plataforma / infraestructura | Reemplazar user stories con equipos afectados y requerimientos de migracion | El trabajo de plataforma tiene usuarios, pero son equipos internos |
| Experimento / A/B test | Agregar hipotesis, metricas de exito, tamano de muestra, y criterios de rollback | Los features experimentales necesitan criterios de kill claros |

## Lo que funciona

1. **Escribe la spec antes de que comience el coding** — el objetivo es entendimiento compartido, no documentacion despues del hecho
2. **Manten el resumen en una pagina** — stakeholders ocupados deberian captar el feature en 60 segundos
3. **Haz los requerimientos testeables** — requerimientos vagos como "rapido" se convierten en "p99 < 200ms"
4. **Incluye no-objetivos explicitamente** — esta es tu mejor defensa contra expansion de alcance a mitad de sprint
5. **Revisa la spec con ingenieria antes de estimar** — los ingenieros detectan casos borde que producto omite

## Errores Comunes

1. **Escribir la spec solo** — una spec escrita por producto sin input de ingenieria se vuelve ficcion
2. **Saltarse requerimientos no-funcionales** — rendimiento, seguridad, y accesibilidad no son "nice to have"; son requerimientos
3. **Hacer criterios de aceptacion vagos** — "funciona como se espera" no es un criterio; "el usuario puede completar checkout en menos de 3 clicks" si lo es
4. **No actualizar cuando cambia el alcance** — specs que divergen de la realidad confunden a QA, soporte, y futuros mantenedores
5. **Olvidar rollout y rollback** — el feature no esta listo cuando el codigo se mergea; esta listo cuando los usuarios lo usan exitosamente

## Preguntas Frecuentes

### Que tan larga deberia ser una spec de feature?

Lo suficiente para eliminar ambiguedad, lo suficientemente corta para que la lean. Un feature simple puede ser dos paginas; un cambio de plataforma complejo puede ser diez. El resumen siempre deberia caber en una pagina. Si la spec completa es larga, agrega una tabla de contenidos.

### Quien es dueno de la spec?

Producto es dueno del problema, objetivos, y criterios de exito. Ingenieria es duena del enfoque tecnico y factibilidad. Diseno es dueno de la UX. El autor (usualmente producto o tech lead) coordina las revisiones. La aprobacion deberia requerir sign-off de las tres disciplinas.

### Que pasa si los requerimientos cambian durante el desarrollo?

Actualiza la spec y notifica a los stakeholders. Si el cambio es mayor, re-estima y re-prioriza. La spec es un documento viviente, no un contrato. Lo peligroso es la divergencia silenciosa — cuando el codigo va por un lado y la spec dice otro.


### Como manejamos cambios de alcance durante el desarrollo?

Cuando el alcance cambia: actualiza la spec inmediatamente y notifica a todos los stakeholders. Si el cambio es significativo (nuevos requisitos, cronograma cambiado, enfoque diferente), re-estima el trabajo y re-prioriza. Realiza una breve reunion de revision con ingenieria, producto y diseno para confirmar la spec actualizada. Documenta la razon del cambio en el changelog de la spec. Nunca dejes que la spec y la implementacion diverjan silenciosamente — la divergencia es como ocurren bugs y requisitos perdidos.

### Cual es la diferencia entre una spec de feature y un documento de requisitos de producto (PRD)?

Un PRD es un documento de mayor nivel que describe la oportunidad de mercado, las necesidades del usuario, los objetivos de negocio y el panorama competitivo. Una spec de feature es mas tactica: describe el enfoque de implementacion especifico, el diseno tecnico, los cambios de API y los criterios de aceptacion. Un PRD responde "por que construir esto?" y "que problema resuelve?" Una spec de feature responde "como lo construiremos?" y "como sabremos que esta terminado?" Las features grandes pueden tener tanto un PRD como una spec de feature.

### Como estimamos el trabajo a partir de una spec de feature?

Divide la spec en tareas de ingenieria durante una reunion de planificacion. Estima cada tarea usando story points o tiempo. Identifica dependencias entre tareas. Agrega tiempo para testing, revision de codigo e integracion. Agrega un buffer para desconocidos (tipicamente 20%). Compara la estimacion total con la velocidad del equipo. Si la estimacion excede la capacidad del sprint, divide la feature en incrementos entregables mas pequenos. Documenta la estimacion y comparala con los reales despues de la entrega para mejorar estimaciones futuras.

### Deberian las specs incluir wireframes o mockups?

Si, para features con cambios de UI orientados al usuario. Los wireframes o mockups aclaran la experiencia del usuario y previenen malentendidos entre diseno e ingenieria. Enlaza a archivos de Figma o Sketch en lugar de embeber imagenes en la spec. Para features solo de API o backend, incluye schemas de API y diagramas de secuencia en su lugar. Mantén los artefactos visuales enlazados, no embebidos, para que se mantengan sincronizados con la herramienta de diseno.

### Como aseguramos que las specs sean leidas y comprendidas?

Revisa la spec en una reunion con todos los stakeholders antes de que comience la implementacion. Usa la reunion para recorrer el resumen, objetivos y requisitos clave. Fomenta preguntas y documenta decisiones. Despues de la reunion, los stakeholders confirman que han leido y comprendido la spec (ej., un thumbs up en el documento o un comentario). Mantén la spec en una ubicacion que el equipo visite diariamente (ej., el wiki del proyecto o enlazada desde el ticket de Jira). Referencia la spec en pull requests que la implementan.


















End of document. Review and update quarterly.