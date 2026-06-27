---
contentType: docs
slug: architecture-decision-record-adr-template
title: "Plantilla de Architecture Decision Record (ADR)"
description: "Una plantilla ligera para documentar decisiones arquitectonicas significativas, su contexto, opciones consideradas, y el razonamiento detras del enfoque elegido."
metaDescription: "Documenta decisiones arquitectonicas con esta plantilla ADR. Captura contexto, opciones, trade-offs y consecuencias para referencia futura."
difficulty: intermediate
topics:
  - architecture
  - devops
tags:
  - adr
  - architecture-decision-record
  - documentation
  - decision-making
  - technical-planning
relatedResources:
  - /docs/devops/feature-specification-template
  - /docs/devops/engineering-handbook-template
  - /docs/system-diagram-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Documenta decisiones arquitectonicas con esta plantilla ADR. Captura contexto, opciones, trade-offs y consecuencias para referencia futura."
  keywords:
    - architecture decision record
    - plantilla ADR
    - documentacion de decisiones tecnicas
    - razonamiento de arquitectura
    - registro de decisiones
---

## Descripcion General

Cada decision arquitectonica significativa crea contexto que se desvanece en meses. Por que elegimos PostgreSQL sobre MongoDB? Por que el service mesh es Envoy y no Linkerd? Por que shard por tenant ID? Sin registros escritos, nuevos ingenieros re-litigan viejas decisiones, equipos repiten enfoques rechazados, y managers hacen planes que entran en conflicto con restricciones tecnicas. Un Architecture Decision Record (ADR) es un documento unico que captura el contexto, opciones, trade-offs, y consecuencias de una eleccion tecnica significativa.

## Cuando Usar

Usa esta plantilla cuando:
- Una decision afecta a mas de un equipo o servicio
- La decision es dificil de deshacer o sera costosa de revertir
- Evaluaste multiples opciones y necesitas explicar por que una gano
- Esperas que la decision sea cuestionada o revisitada en el futuro
- Integras nuevos ingenieros que necesitan entender "por que el sistema funciona asi"

## Prerrequisitos

Antes de escribir un ADR:
- [ ] Confirma que la decision es lo suficientemente significativa para documentar (no cada PR necesita un ADR)
- [ ] Reune input de stakeholders que seran afectados por la decision
- [ ] Documenta opciones que consideraste seriamente, no solo la ganadora
- [ ] Identifica quien tiene autoridad para aprobar o revocar la decision
- [ ] Elige donde viven los ADRs (repo Git `/docs/adr/`, wiki, o docs site dedicado)

## Solucion

```markdown
# ADR-XXX: `<Titulo de la Decision>`

| Campo | Valor |
|-------|-------|
| Estado | Propuesto / Aceptado / Deprecado / Reemplazado por ADR-YYY |
| Fecha | AAAA-MM-DD |
| Autor | ______ |
| Decisores | ______ |
| Tags | ______ |

## 1. Contexto y Planteamiento del Problema

[Cual es el problema u oportunidad que disparo esta decision? Que fuerzas estan en juego, incluyendo tecnicas, de negocio, y de equipo? Que pasa si no hacemos nada?]

## 2. Motivadores de la Decision

- [Motivador 1: ej., debe soportar 10x crecimiento de trafico en 2 anos]
- [Motivador 2: ej., el equipo tiene expertise profundo en X pero no en Y]
- [Motivador 3: ej., requerimiento de compliance para residencia de datos]
- [Motivador 4: ej., debe integrarse con sistemas existentes sin breaking changes]

## 3. Opciones Consideradas

### Opcion 1: [Nombre]
- **Descripcion:** [Que es?]
- **Pros:** [Por que es atractiva]
- **Contras:** [Por que es riesgosa o problematica]
- **Esfuerzo:** [Estimacion aproximada: pequeno / mediano / grande]

### Opcion 2: [Nombre]
- **Descripcion:**
- **Pros:**
- **Contras:**
- **Esfuerzo:**

### Opcion 3: [Nombre]
- **Descripcion:**
- **Pros:**
- **Contras:**
- **Esfuerzo:**

## 4. Decision

**Opcion elegida:** [Opcion X]

**Razonamiento:** [Por que esta opcion gana. Referencia los motivadores de la decision — cuales satisface mejor?]

**Trade-offs aceptados:** [Que estamos sacrificando al elegir esta opcion?]

## 5. Consecuencias

### Positivas
- ______
- ______

### Negativas
- ______
- ______

### Riesgos
- ______

### Mitigaciones
- ______

## 6. Notas de Implementacion

- [Paso 1: ______]
- [Paso 2: ______]
- [Paso 3: ______]

## 7. Decisiones Relacionadas

| ADR | Relacion |
|-----|----------|
| ADR-___ | Reemplaza / Depende de / Conflicta con / Complementa |

## 8. Registro de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| AAAA-MM-DD | Propuesto | ______ |
| AAAA-MM-DD | Aceptado | ______ |
```

## Explicacion

El formato ADR es intencionalmente ligero. No requiere diagramas UML ni pruebas formales — solo suficiente estructura para que alguien que lo lea en dos anos entienda por que se tomo la decision y que se sacrifico. El **campo de estado** es critico: indica a los lectores si la decision esta activa, obsoleta, o reemplazada. La **seccion de consecuencias** previene el error comun de documentar solo el camino feliz; toda eleccion arquitectonica tiene desventajas, y ocultarlas crea sorpresas despues.

## Variantes

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| ADR a nivel de equipo | Mas corto; enfocado en alcance local y trade-offs inmediatos | No toda decision necesita buy-in a nivel organizacion |
| ADR a nivel de organizacion | Agregar seccion de aprobacion, estimaciones de costo, y timeline de migracion | Decisiones cross-team necesitan sign-off explicito |
| ADR de infraestructura | Agregar capacity planning, impacto en runbooks, y carga operacional | Las elecciones de infraestructura son dificiles de deshacer |
| ADR de seguridad | Agregar modelo de amenazas, mapeo de compliance, y sign-off de revision de seguridad | Las decisiones de seguridad necesitan aprobacion explicita |
| ADR de deprecacion | Documentar por que una vieja decision se revierte y que la reemplaza | La deprecacion merece su propio ADR |

## Mejores Practicas

1. **Numera ADRs secuencialmente** — `ADR-001`, `ADR-002` — para que las referencias sean inequivocas
2. **Almacena ADRs en control de versiones** — deberian revisarse, aprobarse, y rastrearse como codigo
3. **Mantenlos cortos** — si toma mas de 10 minutos leerlo, es demasiado largo
4. **Link ADRs relacionados** — las decisiones no existen en aislamiento; muestra la cadena de razonamiento
5. **Acepta la deprecacion** — marca ADRs como reemplazados cuando surgen mejores opciones; no los borres

## Errores Comunes

1. **Escribir ADRs para todo** — no cada PR o upgrade de libreria necesita un ADR; reservalos para elecciones significativas e irreversibles
2. **Documentar solo la ganadora** — futuros lectores necesitan saber que fue rechazado y por que, o lo propondran de nuevo
3. **Ocultar consecuencias negativas** — toda decision tiene trade-offs; documentarlos genera confianza y previene sorpresas
4. **Dejar que los ADRs se vuelvan obsoletos** — actualiza el estado a "Deprecado" o "Reemplazado" cuando cambien las decisiones
5. **Hacerlos dificiles de encontrar** — los ADRs deberian estar linkeados desde READMEs, docs de onboarding, y overviews de arquitectura

## Preguntas Frecuentes

### En que se diferencia un ADR de un design doc?

Un design doc describe **como** construir algo. Un ADR registra **por que** se eligio un enfoque particular sobre alternativas. Los design docs son planes de implementacion; los ADRs son registros de decisiones. Un proyecto grande puede tener un design doc y multiples ADRs.

### Quien deberia escribir el ADR?

La persona o equipo que propone la decision escribe el primer borrador. Stakeholders afectados por la decision deberian revisarlo y aprobarlo. El autor no necesita ser el ingeniero mas senior — solo necesita entender las opciones y trade-offs.

### Cuando deberia actualizarse un ADR?

Actualiza el estado cuando la decision es aceptada, deprecada, o reemplazada. Actualiza el contenido cuando nueva informacion cambie los trade-offs (ej., una opcion previamente rechazada se vuelve viable). No edites ADRs aceptados para reescribir historia — agrega una entrada al changelog en su lugar.
