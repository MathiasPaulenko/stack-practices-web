# Prompt: análisis y corrección con ai-detect — StackPractices

## Input

1. Ruta del recurso Markdown en inglés: `src/content/{tipo}/{slug}.md`
2. Ruta del recurso en español: `src/content/{tipo}/{slug}.es.md`
3. Informe de `ai-detect`:
   - `ref/output/ai-detect-{slug}.json`
   - `ref/output/ai-detect-patterns-{slug}.json`

## Herramientas disponibles

- `scripts/ai-detect-content.py` — detector neuronal con limpieza de Markdown.
- `scripts/ai-detect-patterns.py` — detector de patrones rápido.
- Skill `humanize-writing` para reescribir frases con tono humano.

## Flujo de trabajo

1. Leer el recurso Markdown y su traducción.
2. Ejecutar `python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --model desklib`.
3. Interpretar el resultado:
   - `model_ai_pct`: porcentaje estimado de contenido con patrón IA.
   - `sentences`: lista de oraciones con `ai_prob` y `label`.
   - `pattern_totals`: resumen de patrones detectados.
   - `top_ai_sentences`: frases con mayor probabilidad de IA.
   - `diagnostics_sample`: hallazgos de patrones (vague_abstraction, formal_verb, missing_contraction, ai_slop, etc.).
   - `text_metrics`: estadísticas de longitud de oraciones (SDSL).
4. Si `pattern_totals` no está vacío, corregir esos patrones primero. Son los cambios más rápidos y visibles.
5. Si `model_ai_pct` > 40 %, identificar las `top_ai_sentences` y reescribirlas conservando el significado técnico.
6. Reescribir frases problemáticas una a una. No reescribir el recurso completo si no es necesario.
7. Evitar:
   - **Verbos rojos:** *delve, underscore, harness, facilitate, foster, resonate, transcend, embark, embrace, elevate, empower*.
   - **Adjetivos rojos:** *pivotal, nuanced, multifaceted, seamless, groundbreaking, transformative, holistic*.
   - **Sustantivos rojos:** *tapestry, beacon, testament, paradigm, synergy, mosaic, nexus*.
   - **Aperturas genéricas:** *"In today's fast-paced world...", "In the realm of...", "Let's dive in..."*.
   - **Cierres genéricos:** *"In conclusion...", "The possibilities are endless..."*.
   - **Contracciones evitables:** `does not`, `is not`, `it is`, etc. cuando el tono lo permita.
   - **Falta de concreción:** `multiple`, `various`, `numerous` → especificar o usar `several`/`a few`.
   - **Anglicismos crudos en ES:** `flattening` → `aplanar`, `unflattening` → `reconstruir`, `round-trip` → `ciclo de ida y vuelta`, `output` → `resultado`, `input` → `entrada`.
8. Variar la estructura de FAQ si todas las preguntas usan el mismo patrón (`How do I...`, `¿Cómo...`). Mezclar con afirmaciones o preguntas de otro tipo.
9. **Manejo de tokens de código:**
   - No terminar una oración con un token en backticks (`WeakSet`, `[Circular]`, `Flatten<T>`, etc.).
   - Reescribir para que el token quede en el medio y la frase tenga predicado después.
   - Si el detector marca una tabla con celdas de código, añadir una introducción y conclusión en prosa, o convertirla a subsecciones descriptivas.
10. Re-ejecutar `scripts/ai-detect-content.py` y `scripts/ai-detect-patterns.py` después de cada ronda.
11. Aplicar los mismos cambios a la versión en español, ajustando el idioma y manteniendo la traducción precisa.

## Reglas de calidad

- No eliminar contenido técnico ni ejemplos reales.
- No inventar herramientas, versiones ni normas.
- Conservar H1, frontmatter, `relatedResources` y estructura SEO.
- Mantener `description` y `metaDescription` dentro de los rangos del schema.
- Si el contenido es `docs` o `patterns`, asegurar que los ejemplos sigan siendo concretos y accionables.

## Output esperado

- Archivos `{slug}.md` y `{slug}.es.md` actualizados.
- Resumen corto con el `model_ai_pct` inicial y final (desklib, con limpieza de Markdown).
- Lista de los cambios más importantes realizados.
