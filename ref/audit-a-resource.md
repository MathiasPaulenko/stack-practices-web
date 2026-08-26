# Mini prompt — Auditar recurso del Top 100

> StackPractices.com
> Copia y pega este prompt para auditar un recurso de `ref/checklist-top-recursos-mejoras.md`.
> El agente ejecutará las 7 sub-auditorías en paralelo, sintetizará los resultados
> y escribirá un checklist en `ref/audit/reports/{tipo}-{slug}-audit.md`.
>
> Flujo completo: `ref/flujo-mejoras-contenido.md`

---

## Prompt

```text
Audita el recurso número 1 de ref/checklist-top-recursos-mejoras.md en MODE=full.

Instrucciones:

1. Lee ref/checklist-top-recursos-mejoras.md y extrae el slug y tipo del recurso {N}.
2. Lee los archivos EN y ES del recurso:
   - src/content/{tipo}/{topic}/{slug}.md
   - src/content/{tipo}/{topic}/{slug}.es.md
3. Lee los AGENTS.md que aplican:
   - AGENTS.md (raíz)
   - src/content/{tipo}/AGENTS.md
4. Lee ref/docs/roadmap.md si existe.
5. Ejecuta las 7 sub-auditorías en paralelo usando los prompts de ref/audit/:
   - 01-technical-audit.md
   - 02-seo-audit.md
   - 03-content-quality-audit.md
   - 04-humanization-audit.md
   - 05-bilingual-parity-audit.md
   - 06-geo-audit.md
   - 08-gsc-ga4-traffic-audit.md
6. Ejecuta los scripts de AI detection para tener una línea base:
   - python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.md
   - python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.es.md
   Guarda los outputs en ref/output/ai-detect-patterns-{slug}.json y
   ref/output/ai-detect-patterns-{slug}-es.json.
   Si python no está disponible, marca AI detection como NOT VERIFIED.
7. Ejecuta `npm run build` y verifica que el build pasa sin errores.
   Si hay errores, inclúyelos en el checklist como CRITICAL.
8. Sintetiza con 07-final-synthesis.md y escribe el checklist en:
   ref/audit/reports/{tipo}-{slug}-audit.md

Reglas críticas:
- No edites los archivos del recurso. Solo auditas y escribes el checklist.
- Usa los AGENTS.md como fuente de verdad para las reglas. No inventes reglas
  que no están escritas. Si una regla no existe, marca el hallazgo como
  RECOMMENDATION, no como VIOLATION.
- El layout RecipeArticle.astro renderiza el H1 desde el title del frontmatter.
  NO es una violación que el body empiece con ## Overview. NO es una violación
  tener secciones llamadas "What Works", "Troubleshooting", "See Also" o
  "Further Reading" — son alternativas válidas según los AGENTS.md.
- No hay límite máximo de FAQ. El mínimo es 3-5. El layout renderiza max 10
  en el componente visible.
- metaDescription: 50-160 recomendado, 170 hard max.
- Distingue FACT / OBSERVATION / RECOMMENDATION / NOT VERIFIED.
- Marca como NOT VERIFIED todo lo que no puedas comprobar desde el código local.
- No inventes métricas de GSC, GA4, Core Web Vitals ni datos de producción.
- Verifica si el recurso tiene imágenes o diagramas (bloques `mermaid`,
  etiquetas `![alt](...)`, referencias a `public/assets/`). Si no tiene,
  marca como RECOMMENDATION si el recurso se beneficiaría de uno (ej: flujos
  de arquitectura, comparaciones visuales, decision trees).
- Si el recurso tiene bloques `mermaid`, verifica que:
  1. El bloque se renderiza como `<div class="mermaid">` en el HTML del build
     (ejecuta `npm run build` y revisa `dist/{tipo}/{slug}/index.html`).
  2. El script `/mermaid-init.js` está presente en el HTML.
  3. El diagrama tiene paridad EN/ES (mismo número de bloques, contenido
     equivalente traducido).
  4. El diagrama no es decorativo: aporta información que el texto no cubre.
  5. El tamaño del diagrama es razonable (no excede el ancho del contenedor
     en móvil). `useMaxWidth: true` está activado en mermaid-init.js.
  Si algún check falla, marca como WARNING con evidence.
- Verifica si existe `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json`.
  Si existe, verifica que:
  1. `meta.json` tiene los campos requeridos: title, title_es, description,
     description_es, type, topic, slug, source_urls, language, tags, files.
  2. Los archivos listados en `files` existen en la carpeta.
  3. `source_urls` apunta a la URL EN del recurso.
  4. Hay README.md y README.es.md (opcional pero recomendado).
  Si algún check falla, marca como WARNING.
  Si no existe la carpeta, marca como RECOMMENDATION: "Subir ejemplos y
  código a stack-practices-resources (repo hermano)".
```

---

## Uso

Reemplaza `{N}` con el número del recurso (ej: `3`) y `{tipo}` se infiere
automáticamente del checklist.

### Ejemplo

```text
Audita el recurso número 3 de ref/checklist-top-recursos-mejoras.md en MODE=full.
```

El agente leerá la línea `3. - [ ] **chatbot-openai** (recipes)`, resolverá los
archivos, lanzará las 7 sub-auditorías y escribirá
`ref/audit/reports/recipes-chatbot-openai-audit.md`.
