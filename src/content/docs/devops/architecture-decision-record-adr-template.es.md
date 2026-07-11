---
contentType: docs
slug: architecture-decision-record-adr-template
title: "Plantilla de Architecture Decision Record (ADR)"
description: "Una plantilla ligera para documentar decisiones arquitectonicas mayores, su contexto, opciones consideradas, y el razonamiento detras del enfoque elegido."
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

Cada decision arquitectonica mayor crea contexto que se desvanece en meses. Por que elegimos PostgreSQL sobre MongoDB? Por que el service mesh es Envoy y no Linkerd? Por que shard por tenant ID? Sin registros escritos, nuevos ingenieros re-litigan viejas decisiones, equipos repiten enfoques rechazados, y managers hacen planes que entran en conflicto con restricciones tecnicas. Un Architecture Decision Record (ADR) es un documento unico que captura el contexto, opciones, trade-offs, y consecuencias de una eleccion tecnica mayor.

## Cuando Usar

Usa esta plantilla cuando:
- Una decision afecta a mas de un equipo o servicio
- La decision es dificil de deshacer o sera costosa de revertir
- Evaluaste multiples opciones y necesitas explicar por que una gano
- Esperas que la decision sea cuestionada o revisitada en el futuro
- Integras nuevos ingenieros que necesitan entender "por que el sistema funciona asi"

## Prerrequisitos

Antes de escribir un ADR:
- [ ] Confirma que la decision es lo suficientemente mayor para documentar (no cada PR necesita un ADR)
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

## Ejemplo Completo de ADR

```markdown
# ADR-015: Migracion a PostgreSQL para almacenamiento de datos principal

## Estado
Aceptado (2026-07-11)

## Contexto
La aplicacion utiliza MySQL 5.7 desde 2023. Con el crecimiento del equipo y los datos, hemos encontrado limitaciones:
- Falta de soporte para JSONB y consultas JSON nativas
- Replicacion logica limitada comparada con PostgreSQL
- Sin soporte para particionamiento declarativo
- Costos de licencia para MySQL Enterprise

El equipo de plataforma necesita particionamiento a nivel de tabla para manejar el crecimiento de la tabla de eventos (actualmente 2TB, creciendo 50% anual).

## Decision
Migrar a PostgreSQL 16 como base de datos principal.

## Alternativas Consideradas

### 1. Permanecer en MySQL 8.0
- Ventajas: Migracion mas simple, equipo familiarizado
- Desventajas: JSONB menos potente, particionamiento mas limitado
- Rechazada: No resuelve el requisito de particionamiento

### 2. Migrar a Amazon Aurora PostgreSQL
- Ventajas: Compatible con PostgreSQL, gestionado, replicacion global
- Desventajas: Costo mas alto, vendor lock-in
- Aplazada: Evaluar despues de migrar a PostgreSQL auto-gestionado

### 3. Migrar a CockroachDB
- Ventajas: Distribuido, SQL compatible con PostgreSQL
- Desventajas: Costo, complejidad, equipo sin experiencia
- Rechazada: Sobre-ingenieria para necesidades actuales

## Consecuencias

### Positivas
- Particionamiento declarativo nativo
- JSONB para datos semi-estructurados
- Replicacion logica robusta
- Comunidad activa y herramientas maduras (pgAdmin, pgBackRest)

### Negativas
- Curva de aprendizaje para el equipo (2-4 semanas)
- Necesidad de migrar queries especificas de MySQL
- Herramientas de monitoreo diferentes (pg_stat_statements vs slow query log)

### Mitigaciones
- Capacitacion del equipo en PostgreSQL antes de la migracion
- Usar pgloader para migracion automatica de esquemas y datos
- Mantener MySQL en paralelo durante 30 dias como fallback

## Notas de Implementacion
1. Fase 1: Configurar PostgreSQL en staging, migrar esquema con pgloader
2. Fase 2: Migrar datos en staging, ejecutar tests de aplicacion
3. Fase 3: Migrar produccion con downtime planificado (ventana de mantenimiento)
4. Fase 4: Monitorear por 30 dias, decomisionar MySQL

## Decisiones Relacionadas

| ADR | Relacion |
|-----|----------|
| ADR-008 | Depende de (monitoreo de base de datos) |
| ADR-012 | Complementa (estrategia de backup) |

## Registro de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-07-04 | Propuesto | alice@example.com |
| 2026-07-11 | Aceptado | platform-team |
```


## Variantes

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| ADR a nivel de equipo | Mas corto; enfocado en alcance local y trade-offs inmediatos | No toda decision necesita buy-in a nivel organizacion |
| ADR a nivel de organizacion | Agregar seccion de aprobacion, estimaciones de costo, y timeline de migracion | Decisiones cross-team necesitan sign-off explicito |
| ADR de infraestructura | Agregar capacity planning, impacto en runbooks, y carga operacional | Las elecciones de infraestructura son dificiles de deshacer |
| ADR de seguridad | Agregar modelo de amenazas, mapeo de compliance, y sign-off de revision de seguridad | Las decisiones de seguridad necesitan aprobacion explicita |
| ADR de deprecacion | Documentar por que una vieja decision se revierte y que la reemplaza | La deprecacion merece su propio ADR |

## Lo que funciona

1. **Numera ADRs secuencialmente** — `ADR-001`, `ADR-002` — para que las referencias sean inequivocas
2. **Almacena ADRs en control de versiones** — deberian revisarse, aprobarse, y rastrearse como codigo
3. **Mantenlos cortos** — si toma mas de 10 minutos leerlo, es demasiado largo
4. **Link ADRs relacionados** — las decisiones no existen en aislamiento; muestra la cadena de razonamiento
5. **Acepta la deprecacion** — marca ADRs como reemplazados cuando surgen mejores opciones; no los borres

## Errores Comunes

1. **Escribir ADRs para todo** — no cada PR o upgrade de libreria necesita un ADR; reservalos para elecciones mayores e irreversibles
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


### Como organizamos los ADRs en el repositorio?

Crea un directorio `docs/adr/` en el repositorio. Nombra cada archivo como `ADR-NNN-titulo-descriptivo.md` (ej., `ADR-015-migracion-postgresql.md`). Mantén un archivo `README.md` en el directorio que liste todos los ADRs con su estado actual. Usa links relativos entre ADRs relacionados. Agrega el directorio de ADRs al onboarding documentation para que nuevos ingenieros puedan revisar decisiones pasadas. Considera usar una herramienta como `adr-tools` para crear y vincular ADRs automaticamente.

### Cuando un ADR debe ser reemplazado?

Un ADR debe ser reemplazado cuando: la tecnologia elegida llega al final de su vida, una nueva opcion se vuelve claramente superior, los requisitos cambiaron significativamente, o la decision causo problemas operacionales que superan los beneficios. No edites el ADR original — crea un nuevo ADR que referencie al anterior, marque su estado como "Reemplazado por ADR-NNN", y explique por que se cambia. Mantén el ADR original en el repositorio para referencia historica.

### Como integramos ADRs con el flujo de pull requests?

Cuando un pull request introduce un cambio arquitectonico significativo, requiere un ADR como parte del PR. El ADR se revisa junto con el codigo. Usa una plantilla de PR que pregunte: "Este PR introduce un cambio arquitectonico? Si si, enlaza el ADR." Etiqueta PRs con ADRs para que sean faciles de encontrar. Requiere aprobacion del equipo de plataforma o arquitectura para ADRs a nivel organizacion. Para ADRs a nivel de equipo, peer review es suficiente.

### Que herramientas existen para gestionar ADRs?

Herramientas populares: `adr-tools` (CLI para crear y vincular ADRs), `log4brains` (generador de sitio web estatico para ADRs), `adr-viewer` (visualizador web de ADRs en markdown), y `backstage` (plataforma de developer portal con soporte para ADRs). Tambien puedes usar simplemente markdown en un directorio versionado — la simplicidad es una ventaja. La mejor herramienta es la que tu equipo realmente usara. Comienza con markdown simple y adopta herramientas si la gestion se vuelve manual.

### Como evitamos que los ADRs se vuelvan obsoletos?

Revisa ADRs trimestralmente durante las revisiones de arquitectura. Verifica que el estado sea correcto (Aceptado, Deprecado, Reemplazado). Para ADRs de mas de 2 anos, verifica si la decision sigue siendo relevante. Si la tecnologia elegida ya no se usa, marca el ADR como "Obsoleto". Si una nueva decision reemplaza una vieja, actualiza el estado del ADR viejo inmediatamente. Asigna un owner a cada ADR responsable de mantener su estado actualizado. Incluye la revision de ADRs en el checklist de revision de arquitectura.


### Como fomentamos una cultura de ADRs en el equipo?

Comienza con un taller donde el equipo crea un ADR juntos para una decision reciente. Integra ADRs en el proceso de revision: agrega un paso en el template de PR que pregunte si se necesita un ADR. Celebra buenos ADRs en retrospectivas de equipo. Mantén el proceso ligero — si crear un ADR toma mas de 30 minutos, el proceso es demasiado pesado. Comparte ADRs nuevos en el canal de Slack del equipo para visibilidad. Asigna a un ingeniero senior como "campeon de ADRs" para responder preguntas y mantener la calidad.


Fin del documento. Revisa los ADRs trimestralmente durante las revisiones de arquitectura. Mantén el directorio de ADRs organizado y accesible para todo el equipo.









End of document. Review and update quarterly.