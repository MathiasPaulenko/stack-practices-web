---
contentType: docs
slug: adr-template
templateType: adr
title: "Plantilla de ADR"
description: "Una plantilla reutilizable para Architecture Decision Records que captura contexto, decisión y consecuencias."
metaDescription: "Usa esta plantilla de ADR para documentar decisiones de arquitectura con contexto, opciones consideradas, decisión y consecuencias."
difficulty: beginner
topics:
  - architecture
tags:
  - adr
  - architecture
  - arquitectura
  - documentación
  - template
relatedResources:
  - /docs/templates/readme-template
  - /guides/api/rest-api-design-guide
  - /patterns/design/mvc-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa esta plantilla de ADR para documentar decisiones de arquitectura con contexto, opciones consideradas, decisión y consecuencias."
  keywords:
    - adr template
    - architecture decision record
    - registro de decisiones
    - arquitectura de software
    - rfc template
---

## Resumen

Los Architecture Decision Records (ADRs) capturan el "por qué" detrás de las decisiones técnicas. El código muestra qué se construyó; los ADRs explican por qué se construyó así. Sin ADRs, los equipos re-debaten las mismas decisiones, los nuevos miembros adivinan el rationale, y revertir decisiones se siente arriesgado porque nadie recuerda los trade-offs.

Esta plantilla cubre:

1. **Contexto** — fuerzas que motivaron la decisión
2. **Decisión** — una declaración clara de una oración
3. **Consecuencias** — impactos positivos y negativos
4. **Alternativas** — qué se consideró y rechazó, con razones
5. **Ciclo de vida** — cómo los ADRs evolucionan con el tiempo

## Estructura de la plantilla

Usa esta plantilla como base para documentar cualquier decisión de arquitectura en tu proyecto. Combínala con la [Plantilla de Diagramas de Sistema](/docs/templates/adr-template) para visualizar la arquitectura que se decide.

---

## ADR-XXX: [Título corto]

### Estado

- Propuesta
- Aceptada
- Obsoleta
- Reemplazada por [ADR-YYY]

### Contexto

Describe las fuerzas en juego, incluyendo factores tecnológicos, políticos, sociales y del proyecto. Explica el problema que motiva esta decisión y por qué necesita tomarse ahora.

### Decisión

Enuncia la decisión de arquitectura en una sola oración. Sé claro y directo.

> Vamos a [decisión].

### Consecuencias

#### Positivas

- Beneficio 1
- Beneficio 2

#### Negativas / Trade-offs

- Desventaja 1
- Desventaja 2

### Alternativas consideradas

#### Alternativa A: [Nombre]

**Descripción**: Breve descripción.
**Pros**: Por qué era atractiva.
**Contras**: Por qué fue rechazada.

#### Alternativa B: [Nombre]

**Descripción**: Breve descripción.
**Pros**: Por qué era atractiva.
**Contras**: Por qué fue rechazada.

### Decisiones relacionadas

- [ADR-001: Decisión anterior relacionada](link)

### Responsables de la decisión

- Autor: @username
- Fecha: YYYY-MM-DD
- Aprobado por: @stakeholder

---

## Ejemplo Completo

```markdown
## ADR-004: Usar PostgreSQL como Data Store Primario

### Estado

Aceptada

### Contexto

La plataforma usa actualmente MongoDB para todos los datos. Al agregar features de
reporting y analytics, la falta de joins y transacciones ACID está causando pipelines
de agregación complejos y issues de consistencia de datos. El equipo tiene experiencia
con PostgreSQL y el equipo de ops puede gestionarlo con tooling existente. La migración
debe ocurrir antes de Q4 para no bloquear el roadmap de reporting.

### Decisión

> Vamos a migrar el data store primario de MongoDB a PostgreSQL, manteniendo
> MongoDB solo para event logs y audit trails.

### Consecuencias

#### Positivas

- Transacciones ACID eliminan issues de consistencia en reporting
- SQL joins reemplazan 12+ stages de aggregation pipeline
- Productividad del equipo aumenta (experiencia existente con PostgreSQL)
- Mejor tooling para integraciones de BI y reporting

#### Negativas / Trade-offs

- La migración requiere un período de dual-write de 4-6 semanas
- El schema flexible de MongoDB se pierde; se necesita disciplina de schema más estricta
- Complejidad operacional aumenta (dos bases de datos en lugar de una)

### Alternativas consideradas

#### Alternativa A: Mantener MongoDB, agregar PostgreSQL solo para reporting

**Descripción**: Usar MongoDB como primario, PostgreSQL como réplica de lectura para reports.
**Pros**: Sin riesgo de migración, menos disrupción operacional.
**Contras**: Complejidad de dual-write, riesgo de consistencia, dos fuentes de verdad.

#### Alternativa B: Cambiar a una base de datos NewSQL gestionada (CockroachDB)

**Descripción**: Usar CockroachDB para SQL distribuido con escalado horizontal.
**Pros**: Escala horizontalmente, interfaz SQL, compliance ACID.
**Contras**: El equipo no tiene experiencia, mayor costo, over-engineered para escala actual.

### Decisiones relacionadas

- [ADR-001: Elección inicial de MongoDB](link)
- [ADR-003: Adoptar event sourcing para audit trails](link)

### Responsables de la decisión

- Autor: @jane.doe
- Fecha: 2026-07-10
- Aprobado por: @tech-lead, @ops-lead
```

## Ciclo de Vida del ADR

| Estado | Significado | Acción |
|--------|-------------|--------|
| **Propuesta** | La decisión está redactada pero no aceptada | Circular para review, recolectar feedback |
| **Aceptada** | La decisión está aprobada y activa | Implementar, linkear desde docs relevantes |
| **Obsoleta** | La decisión ya no está activa pero no fue reemplazada | Marcar con fecha y razón |
| **Reemplazada** | La decisión fue reemplazada por un ADR más nuevo | Agregar link superseded-by, mantener original intacto |

## Lo que funciona para escribir ADRs

- **Una decisión por ADR**: Mantén el alcance enfocado
- **Escribe después de la decisión**: Documenta decisiones ya tomadas, no debates
- **Enlaza ADRs relacionados**: Crea una cadena de decisiones
- **Guarda en control de versiones**: Mantén ADRs junto al código (`docs/adr/`). Consulta la [Plantilla de README](/docs/templates/readme-template) para organizar documentación de proyecto.
- **Usa numeración secuencial**: `0001-use-postgresql.md`, `0002-adopt-graphql.md`
- **Mantén el contexto específico**: nombra los equipos, herramientas y restricciones involucradas
- **Fecha cada ADR**: ayuda a los lectores a entender la línea temporal de decisiones
- **Nombra los tomadores de decisión**: accountability previene decisiones anónimas

## Errores comunes

- Escribir ADRs antes de que la decisión esté tomada (se convierten en debates)
- Omitir el contexto (lectores futuros no entenderán por qué)
- No listar alternativas (hace que la decisión parezca arbitraria)
- Olvidar marcar ADRs como obsoletas cuando son reemplazadas
- Escribir ensayos en lugar de registros concisos — apunta a 1-2 páginas
- No linkear ADRs relacionados — las decisiones existen en una cadena
- Borrar o reescribir ADRs viejos — la historia es el valor

## Ejemplo de ADR

```text
=== ADR-015: Migracion de Express a Fastify ===

# ADR-015: Migracion de Express a Fastify

Fecha: 2026-07-10
Estado: Aceptado
Decisores: Tech Lead, SRE Lead, Product Owner

## Contexto

payment-service usa Express 4.x desde su creacion. El servicio maneja
~10,000 requests/segundo en horas pico. Profiling mostro que Express
agrega overhead significativo:

- Parsing de JSON: 15ms promedio vs 3ms en Fastify
- Routing: 8ms vs 2ms en Fastify
- Memory per request: 2.1KB vs 0.8KB en Fastify

El equipo evaluo tres opciones: quedarse en Express, migrar a Fastify,
o migrar a Hono. Express no resuelve el overhead. Hono es mas nuevo
con menos ecosystem y menos casos de produccion documentados.

## Decision

Migrar payment-service de Express a Fastify.

Motivos:
1. Fastify es 2-3x mas rapido en benchmarks y en nuestro profiling
2. API similar a Express — curva de aprendizaje baja
3. Ecosystem maduro con plugins para todo lo que necesitamos
4. Soporte nativo de JSON Schema validation
5. Logs estructurados integrados (Pino)

## Consecuencias

Positivas:
- Reduccion estimada de latencia p95 de 120ms a 80ms
- Reduccion de uso de memoria por request de 2.1KB a 0.8KB
- Mejor throughput: ~30% mas requests/segundo con misma infra
- Validacion de schema nativa elimina dependencia de Joi

Negativas:
- Esfuerzo de migracion: ~3 sprints (2 ingenieros)
- Algunos middlewares de Express no tienen equivalente en Fastify
- Necesidad de actualizar documentacion de API
- Riesgo de bugs durante la migracion

Neutras:
- Fastify usa Pino para logs (cambio de Winston)
- Fastify usa schema-based serialization (cambio de res.json)

## Plan de Migracion

Fase 1 (Sprint 1): Setup y health endpoints
  - Instalar Fastify en paralelo con Express
  - Migrar /health y /health/ready
  - Verificar que ambos servidores corren en paralelo

Fase 2 (Sprint 2): Migrar endpoints de lectura
  - Migrar GET /payments y GET /payments/:id
  - Migrar GET /orders y GET /orders/:id
  - Tests E2E en paralelo con Express y Fastify

Fase 3 (Sprint 3): Migrar endpoints de escritura
  - Migrar POST /payments y POST /payments/:id/refund
  - Migrar webhooks
  - Remover Express
  - Deploy con feature flag para rollback rapido
```


## Variantes

### ADR Ligero (equipos pequeños)

Para equipos pequeños, reduce la plantilla a: Título, Contexto (2-3 oraciones), Decisión (1 oración), Fecha. Omite alternativas y consecuencias para decisiones de bajo impacto. Expande a la plantilla completa para decisiones que afectan a múltiples equipos o son costosas de revertir.

### Estilo RFC (organizaciones grandes)

Para organizaciones grandes, expande la plantilla con: Background, Goals, Non-goals, Propuesta detallada, Plan de rollout, Riesgos y mitigaciones. Circula como Request for Comments antes de marcar como Aceptada. Consulta la [Plantilla de Solicitud de Feature](/docs/templates/feature-request-template) para la variante RFC.

### MADR (Markdown ADR)

MADR es un formato markdown estructurado para ADRs con campos frontmatter específicos. Agrega `status`, `deciders`, `date`, y `tags` como metadata machine-readable. Útil cuando quieres generar un índice o dashboard de ADRs automáticamente.

## Preguntas Frecuentes

### Cuándo debería escribir un ADR?

Escribe un ADR después de tomar una decisión arquitectónica mayor — típicamente cuando la decisión afecta a múltiples equipos, es costosa de revertir o tiene implicaciones de mantenimiento a largo plazo. Para decisiones de infraestructura de alto impacto, documenta también los planes de capacidad usando la [Plantilla de Planificación de Capacidad](/docs/templates/capacity-planning-template). No escribas ADRs para elecciones triviales.

### Quién debería leer los ADRs?

Nuevos miembros del equipo, revisores externos y mantenedores futuros. Los ADRs sirven como registro histórico que ayuda a entender por qué el sistema está construido de cierta manera, reduciendo debates repetidos y suposiciones incorrectas.

### Cómo manejo una decisión que cambia más tarde?

Marca el ADR original como obsoleto con un link superseded-by al nuevo ADR. No borres ni reescribas ADRs históricos. La evolución de las decisiones es en sí misma contexto valioso.

### Deberían los ADRs ser públicos o privados?

Por defecto, públicos dentro de tu organización. ADRs privados son apropiados para decisiones que involucran arquitectura de seguridad, pricing de vendors, o estrategia competitiva. Usa un repositorio privado separado para ADRs sensibles.

### Qué tan largo debería ser un ADR?

1-2 páginas. Si es más largo, la decisión probablemente no está bien delimitada o el contexto es demasiado amplio. Divide decisiones complejas en múltiples ADRs que cada uno aborde un aspecto.

### Debería usar una herramienta para gestionar ADRs?

Un directorio `docs/adr/` en control de versiones es suficiente para la mayoría de equipos. Herramientas como `adr-tools` (CLI) y `log4brains` (web UI) agregan automatización de numeración y búsqueda. Empieza simple y adopta una herramienta solo si gestionar ADRs manualmente se vuelve una carga.


### Cuando debemos crear un ADR?

Crea un ADR cuando la decision: tiene impacto a largo plazo (dificil de revertir), afecta a multiples equipos o servicios, tiene alternativas significativas, o establece un precedente. No crees un ADR para: decisiones triviales (nombre de variable), decisiones que se pueden revertir facilmente, o decisiones que solo afectan a un servicio sin dependencias. Si dudas: crea el ADR — es mejor documentar de mas que de menos. El costo de un ADR es bajo (1-2 horas de escritura); el costo de una decision no documentada es alto (alguien la revierte sin entender el contexto). Los ADRs son inmutables una vez aceptados — si la decision cambia, crea un nuevo ADR que supersede el anterior.

### Como aseguramos que los ADRs se sigan?

Los ADRs no son solo documentos — son acuerdos. Para asegurar cumplimiento: enlaza el ADR en el README del servicio afectado. En code review: si un PR contradice un ADR, el reviewer debe bloquear el merge. En arquitectura reviews: verifica que nuevos servicios cumplan con los ADRs relevantes. En onboarding: incluye los ADRs relevantes en la lectura de la primera semana. Si un ADR es dificil de seguir: evalua si el ADR es correcto o si el equipo necesita soporte. Nunca ignores un ADR silenciosamente — si crees que el ADR es incorrecto, crea un nuevo ADR que lo supersede con la nueva decision y la razon del cambio.

### Donde almacenamos los ADRs?

Almacena los ADRs en el repo del proyecto, usualmente en docs/adr/. Usa nombres numerados: adr-001-titulo.md, adr-002-titulo.md. Manten un indice en docs/adr/README.md con el estado de cada ADR (Propuesto, Aceptado, Rechazado, Superseded). Para decisiones que afectan a multiples servicios: almacena el ADR en el repo de infraestructura o en un repo de documentacion compartida. Versiona los ADRs con git — el historial de cambios es valioso. Nunca almacenes ADRs en un wiki separado del codigo — se desconectan del codigo y se vuelven obsoletos. Los ADRs deben vivir cerca del codigo que afectan.
