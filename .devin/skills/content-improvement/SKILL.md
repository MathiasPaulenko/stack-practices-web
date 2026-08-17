---
name: content-improvement
description: Mejora un recurso existente de StackPractices aplicando SEO técnico, calidad de contenido, detección/corrección de patrones IA, humanización, paridad EN/ES y validación completa, con fases acotadas y puntos de parada explícitos.
version: 1.1.0
license: MIT
author: "@stackpractices-agent"
tags:
  - content-improvement
  - seo
  - ai-detection
  - humanization
  - bilingual
  - validation
---

# Mejora de contenido existente

## Trigger

El usuario pide mejorar, auditar, humanizar o actualizar un recurso existente, por ejemplo:

- "mejora la receta `concurrent-data-structures`"
- "aplica el flujo SEO/quality/AI a `src/content/recipes/concurrency/concurrent-data-structures.md`"
- "audita y humaniza `python-schedule-periodic-tasks`"

## Input requerido

1. Slug del recurso o ruta absoluta/relativa del archivo en inglés.
2. Modo de trabajo (implícito en la petición o explícito):
   - `quick` / `rápido`: solo frontmatter y validación mínima.
   - `seo`: solo auditoría SEO/frontmatter.
   - `humanize` / `humaniza`: solo detección/corrección IA + paridad.
   - `full` / por defecto: todas las fases.
3. Si solo se da el slug, infiere el tipo (`recipes`, `patterns`, `docs`, `guides`) a partir de la ruta o pregunta.

## Modos de invocación

| Petición del usuario | Modo | Fases activas |
|---|---|---|
| "mejora rápido `slug`" | `quick` | 0, 1, 3, 4 |
| "audita SEO `slug`" | `seo` | 0, 1 |
| "humaniza `slug`" | `humanize` | 0, 2, 3, 4 |
| "mejora `slug`" / sin calificador | `full` | 0, 1, 2, 3, 4, 5 |

Si el modo no es claro, preguntar antes de empezar.

## Flujo de trabajo acotado

### Fase 0 — Entrada y diagnóstico

- Resolver la ruta del archivo EN: `src/content/{tipo}/{slug}.md`.
- Resolver la ruta del archivo ES: `src/content/{tipo}/{slug}.es.md`.
- **Parada obligatoria**: si falta la versión ES, avisar al usuario y no continuar. No crear una traducción completa sin aprobación explícita.
- Leer ambos archivos: frontmatter, cuerpo y secciones principales.
- Anotar el estado base: palabras, longitud de `metaDescription`, `lastUpdated`, `relatedResources`, estructura de secciones.
- Opcional: ejecutar `ai-detect-patterns.py` en EN y ES para tener una línea base de patrones.

**Salida esperada:** un resumen de una o dos líneas con el slug, tipo, palabras y estado base.

### Fase 1 — Quick wins SEO/frontmatter (máximo 5 cambios)

- Aplicar `.devin/skills/content-improvement/reference/prompt-17-technical-seo-audit.md` **solo a frontmatter y primer encabezado**.
- Corregir únicamente los hallazgos que afectan a ambas versiones o son críticos:
  - `title` ≤ 60 caracteres.
  - `description` 80-160 caracteres.
  - `metaDescription` 120-170 caracteres y coincide con `seo.metaDescription`.
  - `relatedResources`: 2-6 slugs existentes, mismo orden en EN y ES.
  - `lastUpdated`: actualizar en ambos frontmatter solo si hay cambios.
  - Enlaces internos en el cuerpo: si el `AGENTS.md` del tipo de contenido exige 2-3 enlaces contextuales (p. ej. recipes), añadirlos en esta fase y replicarlos en ES.
- **Corte de esfuerzo**: si no hay hallazgos accionables, saltar a la siguiente fase.
- **Salida esperada:** lista numerada de los cambios realizados (máximo 5).

### Fase 2 — Calidad + IA (máximo 2 rondas)

- Aplicar `.devin/skills/content-improvement/reference/prompt-18-content-quality-auditor.md` a EN y ES.
- Corregir solo los **3-5 hallazgos de mayor impacto** en cada idioma. Una reescritura focalizada cuenta como un hallazgo cuando el recurso es una plantilla genérica rellena de contenido no relacionado; no es una reescritura arbitraria.
- Ejecutar el detector de patrones:

  ```bash
  python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.md
  python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.es.md
  ```

- Si ambos `pattern_totals` están vacíos, omitir corrección de patrones.
- Ejecutar Desklib:

  ```bash
  python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --es src/content/{tipo}/{slug}.es.md --model desklib
  ```

- Aplicar `.devin/skills/content-improvement/reference/prompt-ai-detect-analysis.md`:
  1. Corregir patrones primero.
  2. Reescribir una a una las frases con mayor `ai_prob`, **máximo 5-10 frases por idioma por ronda**.
  3. Conservar el contenido técnico, los ejemplos de código y las versiones reales de herramientas.
- Volver a ejecutar `ai-detect-content.py` y `ai-detect-patterns.py`.
- **Regla de parada**: detener el bucle cuando `pattern_totals` esté vacío y `model_ai_pct` < 40 %, o bien al completar la **ronda 2**. Nunca intentar una tercera ronda.
- **Nota sobre contenido técnico**: en listas de herramientas, tablas y tripletes, Desklib puede marcar frases cortas como IA aunque sean reales. Priorizar la corrección de `pattern_totals` y la utilidad técnica sobre forzar `model_ai_pct` < 40 %. Si tras 2 rondas no hay patrones y el score sigue alto, reportarlo y esperar aprobación para una ronda extra.

**Salida esperada:** puntuación IA antes/después, patrones corregidos y frases reescritas.

### Fase 3 — Paridad EN/ES

- Verificar que ambos archivos tengan:
  - Mismo número y orden de `relatedResources`.
  - `title`, `description`, `metaDescription` y `seo.keywords` traducidos correctamente.
  - `metaDescription` entre 50 y 170 caracteres en ambos idiomas.
  - `lastUpdated` actualizado en ambos.
  - Ejemplos de código equivalentes; traducir comentarios y nombres de variables solo si es idiomático.
  - Estructura de secciones equivalente.
  - Idioma natural en ES: revisar anglicismos crudos (`stream` → `streaming`, `log store` → `almacén de logs`, `baseline` → `línea base`, `PII` → `datos personales`, `match` → `coincidir`) salvo que el término esté asentado en el contexto técnico.
- Corregir las discrepancias detectadas.

**Salida esperada:** check de paridad (OK o lista de ajustes).

### Fase 4 — Validación técnica

- Ejecutar la cadena de validación de forma acotada:

  ```bash
  npm run content:quality
  npm run content:links
  npm run content:validate
  npm run check
  npm run build
  npm run sitemap
  ```

- Alternativa preferente: `node scripts/content-improvement-pipeline.cjs <slug>`.
- **Regla de parada**: si un paso falla, detenerse inmediatamente, mostrar el error y no continuar con el siguiente.
- Si todo pasa, confirmar 3.242 páginas construidas y `public/sitemap.xml` regenerado.

**Salida esperada:** resumen de validación (OK / fallo con paso y mensaje).

### Fase 5 — Resumen y aprobación

- Mostrar `git status` y `git diff --stat`.
- Mostrar extractos clave del diff si hay dudas.
- Resumir en una tabla:
  - Cambios de frontmatter.
  - Hallazgos de calidad corregidos.
  - Puntuación IA antes/después.
  - Estado de paridad.
  - Resultado de validación.
- Preguntar de forma explícita si se aprueba `git commit` y `git push`.
- **No hacer commit/push sin aprobación.**

## Reglas críticas

- **No eliminar contenido técnico** solo para bajar la puntuación IA.
- **Usar siempre Desklib**, nunca el detector `light`.
- **No reescribir el recurso completo** si no es necesario. Reescribir frases aisladas.
- **Máximo 2 rondas de detección/corrección IA**.
- **No añadir secciones manuales** de recursos relacionados en el cuerpo del Markdown.
- **No inventar** herramientas, versiones, normas o datos.
- **Mantener los ejemplos de código funcionales** y prácticos.
- **Respetar la fase del roadmap**: no introducir monetización ni backend.
- **No modificar** `.npmrc`, políticas de seguridad, ni configuraciones de CI/CD para forzar builds.
- **No crear ni mover archivos fuera del flujo** sin aprobación del usuario.

## Output esperado

- Archivos `src/content/{tipo}/{slug}.md` y `.es.md` mejorados.
- Informes opcionales en `ref/output/`: `seo-audit-{slug}.md`, `content-quality-audit-{slug}.md`, `ai-detect-{slug}.json`, `ai-detect-patterns-{slug}.json`, `ai-detect-analysis-{slug}.md`.
- `npm run build` exitoso (3.242 páginas construidas) o `node scripts/content-improvement-pipeline.cjs <slug>` OK.
- `public/sitemap.xml` regenerado.
- Resumen claro y pedido de aprobación antes de commit/push.

## Referencias del skill

- `.devin/skills/content-improvement/reference/workflow-prompt.md` — prompt maestro para copiar y pegar.
- `.devin/skills/content-improvement/reference/workflow-guide.md` — guía detallada del flujo (creación y mejora).
- `.devin/skills/content-improvement/reference/ai-detection-tools.md` — cómo usar los scripts de detección IA.
- `.devin/skills/content-improvement/reference/prompt-17-technical-seo-audit.md` — criterios de auditoría SEO técnica.
- `.devin/skills/content-improvement/reference/prompt-18-content-quality-auditor.md` — criterios de calidad de contenido.
- `.devin/skills/content-improvement/reference/prompt-ai-detect-analysis.md` — cómo corregir hallazgos de IA.

Para elegir qué recurso mejorar, usa `ref/top-100-checklist.md` (o `ref/top-100-resources.md`), que se genera automáticamente.
