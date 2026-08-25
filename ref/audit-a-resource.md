# Mini prompt — Auditar recurso del Top 100

> Copia y pega este prompt para auditar un recurso de `ref/checklist-top-recursos-mejoras.md`.
> El agente ejecutará las 7 sub-auditorías en paralelo, sintetizará los resultados
> y escribirá un checklist en `ref/audit/reports/{tipo}-{slug}-audit.md`.

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
6. Sintetiza con 07-final-synthesis.md y escribe el checklist en:
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
- Verifica si existe `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json`.
  Si no existe, marca como RECOMMENDATION: "Subir ejemplos y código a
  stack-practices-resources (repo hermano)".
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
