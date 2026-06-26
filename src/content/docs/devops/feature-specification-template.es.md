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

## Variantes

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| Feature solo de API | Reemplazar seccion UX con diseno de endpoints, schemas de payload, y plan de versionado | Las APIs internas aun necesitan user stories (el usuario es otro desarrollador) |
| Feature de datos / ML | Agregar fuentes de datos, pipeline de entrenamiento de modelos, y metricas de evaluacion | Las specs de ML necesitan tracking de experimentos y reproducibilidad |
| Feature de seguridad | Expandir requerimientos de seguridad; agregar modelo de amenazas y mapeo de compliance | Los features de seguridad necesitan sign-off explicito del equipo de seguridad |
| Feature de plataforma / infraestructura | Reemplazar user stories con equipos afectados y requerimientos de migracion | El trabajo de plataforma tiene usuarios, pero son equipos internos |
| Experimento / A/B test | Agregar hipotesis, metricas de exito, tamano de muestra, y criterios de rollback | Los features experimentales necesitan criterios de kill claros |

## Mejores Practicas

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

Actualiza la spec y notifica a los stakeholders. Si el cambio es significativo, re-estima y re-prioriza. La spec es un documento viviente, no un contrato. Lo peligroso es la divergencia silenciosa — cuando el codigo va por un lado y la spec dice otro.
