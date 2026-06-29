---
contentType: guides
slug: technical-documentation-strategy-guide
title: "Estrategia de Documentación Técnica: Docs as Code"
description: "Guía práctica para tratar la documentación como código: versionado, flujos de review, estructura y herramientas que mantienen los docs precisos, descubribles y mantenibles."
metaDescription: "Estrategia de documentación técnica: docs as code, versionado, flujos de review, estructura. Mantén documentación de ingeniería precisa, descubrible y mantenible."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - docs-as-code
  - documentacion
  - escritura-tecnica
  - gestion-del-conocimiento
  - guia
  - markdown
relatedResources:
  - /guides/design/code-review-best-practices-guide
  - /guides/architecture/domain-driven-design-guide
  - /guides/devops/git-branching-strategies-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Estrategia de documentación técnica: docs as code, versionado, flujos de review, estructura. Mantén documentación de ingeniería precisa, descubrible y mantenible."
  keywords:
    - docs as code
    - estrategia documentacion tecnica
    - documentacion ingenieria
    - flujo documentacion markdown
    - lo que funciona documentacion
---

# Estrategia de Documentación Técnica: Docs as Code

## Introducción

La documentación es la actividad de mayor apalancamiento en ingeniería de software. Un sistema bien documentado reduce el tiempo de onboarding, previene errores repetidos y preserva contexto a través de cambios de equipo. Tratar docs como código significa aplicar la misma rigurosidad — control de versiones, code review, verificaciones automatizadas — a la documentación que aplicas al código fuente.

## Los Cuatro Documentos Esenciales

Cada sistema debería tener estos cuatro docs. Responden diferentes preguntas a diferentes profundidades.

| Documento | Responde | Audiencia | Frecuencia de Actualización |
|-----------|----------|-----------|----------------------------|
| **README** | ¿Qué es esto? ¿Cómo lo ejecuto? | Nuevos desarrolladores, usuarios | Cada cambio mayor |
| **ADR** | ¿Por qué elegimos esto? | Mantenedores actuales y futuros | Una vez por decisión mayor |
| **Runbook** | ¿Cómo lo arreglo cuando se rompe? | Ingenieros on-call | Después de cada incidente |
| **Referencia de API** | ¿Qué hace este endpoint? | Consumidores de API | Auto-generado desde código |

## Flujo de Trabajo Docs as Code

```
Desarrollador escribe docs en Markdown
        ↓
Abre un pull request (mismo repo que el código)
        ↓
Revisor revisa código Y docs
        ↓
CI ejecuta: markdown lint, link checker, spelling
        ↓
Merge → docs se publican automáticamente
```

### Por Qué Funciona

| Principio | Cómo se Aplica en Docs as Code |
|-----------|-------------------------------|
| **Control de versiones** | El historial de Git muestra cuándo cambiaron los docs y por qué |
| **Code review** | Los reviews capturan inexactitudes técnicas, no solo typos |
| **Automatización** | CI asegura formato consistente y links válidos |
| **Branching** | Los cambios de docs se despliegan con el código que describen |

## Estructura del README

Un README debería responder estas preguntas en orden:

```markdown
# Nombre del Servicio

Descripción de una línea de qué hace este servicio.

## Quick Start

Cómo ejecutarlo localmente en menos de 5 minutos.

## Visión General de Arquitectura

Diagrama de alto nivel y dependencias clave.

## Configuración

Variables de entorno requeridas con ejemplos.

## Testing

Cómo ejecutar tests unitarios, de integración y E2E.

## Deployment

Cómo se despliega este servicio (link a CI/CD, lista de ambientes).

## Troubleshooting

Errores comunes y cómo resolverlos.

## Contributing

Link a guías de contribución y código de conducta.
```

## Architecture Decision Records (ADRs)

Los ADRs capturan el contexto y las consecuencias de decisiones técnicas mayores. Previenen debates futuros sobre "¿por qué lo hicimos así?"

### Plantilla de ADR

```markdown
# ADR-042: Adoptar Kafka para Event Streaming

## Estado
Aceptado

## Contexto
El servicio de órdenes necesita publicar eventos a 4 consumidores downstream. Los callbacks REST son poco confiables y crean acoplamiento fuerte.

## Decisión
Adoptar Apache Kafka como la plataforma de event streaming.

## Consecuencias

### Positivas
- Desacopla productores de consumidores
- Soporta replay para nuevos consumidores y debugging
- Maneja backpressure vía consumer lag

### Negativas
- Complejidad operativa (ZooKeeper, brokers, particiones). Consulta [arquitectura event-driven](/guides/architecture/event-driven-architecture-guide).
- El equipo necesita aprender [patrones event-driven](/guides/architecture/event-driven-architecture-guide)
- La consistencia eventual requiere Saga pattern para algunos flujos
```

**Regla general:** Escribe un ADR para cualquier decisión que cueste > 2 semanas revertir.

## Runbooks

Un runbook es una guía paso a paso para responder a una alerta conocida o modo de fallo.

### Buena Estructura de Runbook

```markdown
# Runbook: Pool de Conexiones de Base de Datos Agotado

## Síntomas
- Alerta: `db_pool_connections_exhausted`
- Impacto al usuario: Requests de la API hacen timeout después de 5 segundos

## Diagnóstico
1. Verificar uso actual del pool: `SELECT count(*) FROM pg_stat_activity;`
2. Identificar queries lentos: `SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`
3. Revisar logs de aplicación por leaks de conexión

## Resolución
1. Si causado por query lento: matar query, [agregar índice](/recipes/performance/database-indexing), o escalar [réplicas de lectura](/guides/databases/database-design-guide)
2. Si causado por leak de conexión: reiniciar pods de app (temporal), luego deployear fix
3. Si persistente: aumentar tamaño del pool en config y redeployar

## Escalación
Si la resolución falla después de 15 minutos, escalar al equipo de Base de Datos on-call.
```

## Herramientas de Documentación

| Herramienta | Caso de Uso | Pros | Contras |
|-------------|-------------|------|---------|
| **Markdown en Git** | READMEs, ADRs, runbooks | Universal, versionado, gratis | Sin búsqueda integrada |
| **MkDocs / Docusaurus** | Sitios de documentación de producto | Búsqueda, versionado, theming | Requiere build step |
| **Notion / Confluence** | Base de conocimiento viva | WYSIWYG, fácil colaboración | Sin versionado en git |
| **Swagger / OpenAPI** | [Referencia de API](/recipes/api/api-documentation-openapi) | Auto-generado desde código | Limitado a superficie de API |
| **Mermaid / PlantUML** | Diagramas as code | Diagramas versionados y editables | Curva de aprendizaje |

## Lo que funciona

- **Escribe el README primero** — si no puedes explicar cómo ejecutar el servicio, el servicio no está listo
- **Mantén los docs cerca del código** — los docs en un repo separo se pudren más rápido que el código
- **Automatiza el chequeo de links** — links rotos destruyen confianza; [CI](/guides/devops/cicd-pipeline-guide) debería capturarlos
- **Usa diagramas as code** — Mermaid y PlantUML mantienen diagramas versionados y editables
- **Revisa docs en PRs** — un cambio de código sin cambio de doc es un PR incompleto
- **Establece una política de frescura** — marca docs no actualizados en 12 meses para revisión

## Errores Comunes

- Escribir docs solo para principiantes — los expertos también necesitan docs (refs de API, vistas de arquitectura)
- Crear un cementerio de wiki — las wikis se desactualizan porque no hay proceso de review
- Documentar qué, no por qué — el "por qué" es lo que olvidas en 6 meses
- Sobre-documentar — si el código es autoexplicativo, no lo expliques; explica la intención en su lugar
- Separar docs y código en repos diferentes — la fricción del cambio de contexto garantiza que los docs no se actualicen

## Preguntas Frecuentes

### ¿Quién debería escribir la documentación?

El ingeniero que construyó el cambio. Ellos tienen el contexto. Los escritores técnicos pueden pulir, pero la fuente de verdad debe venir del implementador. Haz que escribir docs sea parte de la Definition of Done.

### ¿Cómo evito que la documentación se desactualice?

Trata docs desactualizados como un bug. En tu tracker de bugs, crea una etiqueta "documentation" y priorízala junto a bugs de código. Requiere actualizaciones de README en el mismo PR que cambios de código.

### ¿Deberíamos usar Confluence o Markdown en Git?

Usa ambos para diferentes propósitos. Markdown en Git para docs adyacentes al código (READMEs, ADRs, runbooks) que cambian con el código. Confluence/Notion para conocimiento cross-team, onboarding y docs de proceso que evolucionan independientemente.
