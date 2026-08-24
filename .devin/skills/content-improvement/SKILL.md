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

## Cuándo NO usar (STOP)

- **Crear un recurso nuevo desde cero** → usar `stackp-content-creator` y sus plantillas.
- **Crear contenido en un solo idioma** → todo recurso debe tener EN y ES; si falta ES, pausar y pedir aprobación.
- **Crear la versión ES automáticamente** → no traducir un recurso completo sin aprobación explícita.
- **Modificar componentes Astro, layouts, CI/CD, `.npmrc` o seguridad** → no es una tarea de mejora de contenido.
- **Añadir backend, suscripciones, autenticación o monetización** → viola el stack estático del proyecto.
- **Hacer commit/push sin aprobación** → siempre pedir confirmación al usuario.

## Skills complementarias recomendadas

Invocar estas skills cuando estén disponibles para que el recurso quede lo más perfecto posible:

|Skill|Cuándo invocar|Propósito|
|---|---|---|
|`humanizer`|Fase 2|Quitar tono IA y frases patrón.|
|`seo`|Fase 1 y antes de publicar|Optimizar meta tags, structured data y enlaces internos.|
|`content-research-writer`|Antes de añadir ejemplos/secciones nuevas|Investigar herramientas, versiones y ejemplos reales.|
|`clean-code`|Fase 2, cuando se revisen snippets|Verificar que el código sea idiomático y mantenible.|
|`bash-defensive-patterns`|Recetas con scripts de shell|Asegurar que los ejemplos Bash sean robustos.|
|`python-code-style`|Recetas con Python|Asegurar que los ejemplos Python sigan PEP 8 y buenas prácticas.|

Si una skill no está disponible, aplicar manualmente las reglas equivalentes de este documento.

### Thin content y longitud mínima

Un recurso es **thin content** cuando el cuerpo queda por debajo del mínimo útil
para su tipo **o** cuando la longitud es suficiente pero aporta poco valor: listas
genéricas, ejemplos inventados, secciones copiadas, FAQ de relleno o explicaciones
que repiten el título sin detalle.

**Mínimos de palabras del cuerpo (body, sin contar frontmatter) para el repaso de contenido:**

| `contentType` | Mínimo de palabras |
| --- | --- |
| `recipes` | 1.000 |
| `patterns` | 1.200 |
| `guides` | 1.500 |
| `docs` | 800 |

- Estos mínimos son **objetivos de profundidad**, no relleno. Si un recurso los
  supera con tablas densas, código útil y explicación de trade-offs, es válido.
- Si un recurso los supera con secciones de relleno, listas genéricas o repeticiones, sigue siendo thin y debe reescribirse.
- En la Fase 0 se mide el conteo base; en la Fase 2 se expande el contenido thin antes de ejecutar Desklib.
- El `content-quality-validator` usa mínimos más conservadores (`recipes` 300,
  `patterns` 400, `guides` 500, `docs` 200) como paso automático del build. El skill
  `content-improvement` exige los mínimos superiores anteriores para contenido
  auditado y listo para publicar.

## Modos de invocación

|Petición del usuario|Modo|Fases activas|
|---|---|---|
|"mejora rápido `slug`"|`quick`|0, 1, 3, 4|
|"audita SEO `slug`"|`seo`|0, 1|
|"humaniza `slug`"|`humanize`|0, 2, 3, 4|
|"mejora `slug`" / sin calificador|`full`|0, 1, 2, 3, 4, 5|

Si el modo no es claro, preguntar antes de empezar.

## Flujo de trabajo acotado

### Fase 0 — Entrada y diagnóstico

- Resolver la ruta del archivo EN: `src/content/{tipo}/{slug}.md`.
- Resolver la ruta del archivo ES: `src/content/{tipo}/{slug}.es.md`.
- **Parada obligatoria**: si falta la versión ES, avisar al usuario y no continuar. No crear
  una traducción completa sin aprobación explícita.
- Leer ambos archivos: frontmatter, cuerpo y secciones principales.
- Anotar el estado base: palabras, longitud de `metaDescription`, `lastUpdated`, `relatedResources`, estructura de secciones.
- Medir si el recurso es **thin content**: comparar el conteo de palabras del body con el mínimo del tipo
  (`recipes` 1.000, `patterns` 1.200, `guides` 1.500, `docs` 800). Anotar el gap.
- Opcional: ejecutar `ai-detect-patterns.py` en EN y ES para tener una línea base de patrones.

**Salida esperada:** un resumen de una o dos líneas con el slug, tipo, palabras y estado base.

### Fase 1 — Quick wins SEO/frontmatter (máximo 5 cambios)

- Aplicar `.devin/skills/content-improvement/reference/prompt-17-technical-seo-audit.md` **solo a frontmatter y primer encabezado**.
- Corregir únicamente los hallazgos que afectan a ambas versiones o son críticos:
  - `title` ≤ 60 caracteres.
  - `description` 80-160 caracteres.
  - `metaDescription` 120-170 caracteres y coincide con `seo.metaDescription`.
  - `relatedResources`: 2-6 slugs existentes, mismo orden en EN y ES, y **coherentes con el topic cluster del recurso**.
  - `lastUpdated`: actualizar en ambos frontmatter solo si hay cambios.
  - Enlaces internos en el cuerpo: si el `AGENTS.md` del tipo de contenido exige 2-3
    enlaces contextuales (p. ej. recipes), añadirlos en esta fase y replicarlos en ES.
  - Estructura de secciones: asegurar que sean `Overview`, `When to Use`, `Solution`,
    `Explanation`, `Variants`, `Best Practices`, `Common Mistakes`, `FAQ` y que no haya
    secciones resumen extra.
- Si el recurso es **thin content**, no gastar más de 1-2 correcciones de
  frontmatter en esta fase; marcarlo para expansión en la Fase 2.
- **Corte de esfuerzo**: si no hay hallazgos accionables, saltar a la siguiente fase.
- **Salida esperada:** lista numerada de los cambios realizados (máximo 5) y, si aplica, gap de palabras.

### Fase 2 — Calidad + IA (máximo 4 rondas)

- Antes de detectar IA, aplicar
  `.devin/skills/content-improvement/reference/prompt-19-first-pass-perfect.md` para
  corregir estructura, `relatedResources` coherentes, anglicismos, tokens de código, prosa
  genérica **y thin content**.
- Si el recurso es thin o queda por debajo del mínimo de palabras del tipo, expandirlo **antes**
  de ejecutar Desklib:
  - Añadir 1-2 ejemplos de código con datos/versiones reales.
  - Desarrollar `Explanation` con trade-offs, limitaciones y casos de borde.
  - Convertir listas genéricas en prosa con contexto o en tablas comparativas con análisis.
  - Añadir o completar `FAQ` con 3-5 preguntas reales.
  - Replicar la expansión en ES; no resumir.
- Aplicar `.devin/skills/content-improvement/reference/prompt-18-content-quality-auditor.md`
  a EN y ES.
- Corregir solo los **3-5 hallazgos de mayor impacto** en cada idioma. Una reescritura
  focalizada cuenta como un hallazgo cuando el recurso es una plantilla genérica rellena de
  contenido no relacionado; no es una reescritura arbitraria.
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
  1. Corregir `pattern_totals` primero.
  2. Reescribir una a una las frases con mayor `ai_prob`, **máximo 5-10 frases por idioma
     por ronda**. En modo `full`, ampliar a 10-15 frases en la primera ronda si el contenido
     es denso.
  3. Reescribir frases que terminen con tokens de código o celdas de tabla con código;
     colocar el token en el medio de la oración o rodearlo de contexto.
  4. Conservar el contenido técnico, los ejemplos de código y las versiones reales de
     herramientas.
- Volver a ejecutar `ai-detect-content.py` y `ai-detect-patterns.py`.
- **Umbrales de decisión**:
  - `model_ai_pct` < 30 % y `pattern_totals` vacío: detener.
  - `model_ai_pct` 30-40 %: revisar manualmente las frases marcadas y corregir solo las genéricas.
  - `model_ai_pct` > 40 %: reescribir las frases marcadas como `AI` y repetir.
- **Regla de parada**: detener el bucle cuando `pattern_totals` esté vacío y
  `model_ai_pct` < 40 %, o bien al completar la **ronda 4**. Nunca intentar una quinta ronda.
- **Nota sobre contenido técnico**: en listas de herramientas, tablas y tripletes, Desklib
  puede marcar frases cortas como IA aunque sean reales. Priorizar la corrección de
  `pattern_totals` y la utilidad técnica sobre forzar `model_ai_pct` < 40 %. Si tras 4 rondas
  no hay patrones y el score sigue alto, reportarlo y esperar aprobación para una ronda extra.

**Salida esperada:** puntuación IA antes/después, patrones corregidos y frases reescritas.

### Fase 3 — Paridad EN/ES

- Verificar que ambos archivos tengan:
  - Mismo número y orden de `relatedResources`.
  - `title`, `description`, `metaDescription` y `seo.keywords` traducidos correctamente.
  - `metaDescription` entre 50 y 170 caracteres en ambos idiomas.
  - `lastUpdated` actualizado en ambos.
  - Ejemplos de código equivalentes; traducir comentarios y nombres de variables solo si es idiomático.
  - Estructura de secciones equivalente.
  - Idioma natural en ES: revisar anglicismos crudos (`stream` → `streaming`,
    `log store` → `almacén de logs`, `baseline` → `línea base`, `PII` → `datos personales`,
    `match` → `coincidir`) salvo que el término esté asentado en el contexto técnico.
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
- **Regla de parada**: si un paso falla, detenerse inmediatamente, mostrar el error y no
  continuar con el siguiente.
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
- **Aplicar el Checklist PERFECTO** (`reference/perfect-close-checklist.md`) antes de pedir
  aprobación. Si algún ítem falla, corregirlo antes de continuar.
  - Verificar específicamente el mínimo de palabras del body y que no se haya rellenado con
    contenido genérico.
- Si el usuario dio un número de `ref/top-100-checklist.md`, usar `reference/prompt-master.md`
  para estructurar el resumen y la pregunta de aprobación.
- Preguntar de forma explícita si se aprueba `git commit` y `git push`.
- **No hacer commit/push sin aprobación.**

## Reglas críticas

- **Aplicar el pre-check** de `prompt-19-first-pass-perfect.md` antes de ejecutar Desklib.
- **No eliminar contenido técnico** solo para bajar la puntuación IA.
- **No reducir el contenido para bajar IA** si eso deja el recurso por debajo del mínimo de palabras.
- **No aumentar palabras con relleno**: la expansión de thin content debe aportar ejemplos,
  casos reales y profundidad técnica.
- **Usar siempre Desklib**, nunca el detector `light`.
- **No reescribir el recurso completo** si no es necesario. Reescribir frases aisladas.
- **Máximo 4 rondas de detección/corrección IA**.
- **No añadir secciones manuales** de recursos relacionados en el cuerpo del Markdown.
- **No inventar** herramientas, versiones, normas o datos.
- **Mantener los ejemplos de código funcionales** y prácticos.
- **Respetar la fase del roadmap**: no introducir monetización ni backend.
- **No modificar** `.npmrc`, políticas de seguridad, ni configuraciones de CI/CD para forzar
  builds.
- **No crear ni mover archivos fuera del flujo** sin aprobación del usuario.

## Output esperado

- Archivos `src/content/{tipo}/{slug}.md` y `.es.md` mejorados.
- Body por encima del mínimo de palabras del tipo y sin secciones de relleno.
- Informes opcionales en `ref/output/`: `seo-audit-{slug}.md`,
  `content-quality-audit-{slug}.md`, `ai-detect-{slug}.json`,
  `ai-detect-patterns-{slug}.json`, `ai-detect-analysis-{slug}.md`.
- `npm run build` exitoso (3.242 páginas construidas) o
  `node scripts/content-improvement-pipeline.cjs <slug>` OK.
- `public/sitemap.xml` regenerado.
- Resumen claro y pedido de aprobación antes de commit/push.

## Referencias del skill

- `.devin/skills/content-improvement/reference/workflow-prompt.md` — prompt maestro para copiar y pegar.
- `.devin/skills/content-improvement/reference/workflow-guide.md` — guía detallada del flujo (creación y mejora).
- `.devin/skills/content-improvement/reference/ai-detection-tools.md` — cómo usar los scripts de detección IA.
- `.devin/skills/content-improvement/reference/prompt-17-technical-seo-audit.md` — criterios de auditoría SEO técnica.
- `.devin/skills/content-improvement/reference/prompt-18-content-quality-auditor.md` — criterios de calidad de contenido.
- `.devin/skills/content-improvement/reference/prompt-19-first-pass-perfect.md` — pre-check
  estructural, `relatedResources` coherentes, humanización y manejo de tokens de código.
- `.devin/skills/content-improvement/reference/prompt-ai-detect-analysis.md` — cómo corregir hallazgos de IA.
- `.devin/skills/content-improvement/reference/prompt-master.md` — mejorar un recurso indicando solo su número en `ref/top-100-checklist.md`.
- `.devin/skills/content-improvement/reference/perfect-close-checklist.md` — checklist final antes de pedir aprobación.

Para elegir qué recurso mejorar, usa `ref/top-100-checklist.md` (o `ref/top-100-resources.md`), que se genera automáticamente.
