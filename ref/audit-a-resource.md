# Prompt maestro — Auditoría completa de un recurso de StackPractices

> StackPractices.com
> Prompt orquestador que ejecuta todas las sub-auditorías de `ref/audit/`
> para un recurso, sintetiza los resultados y escribe un checklist de arreglos.
>
> Flujo completo: `ref/flujo-mejoras-contenido.md`

---

## Cómo usar este prompt

Copia el bloque de la sección **Prompt** más abajo, reemplaza `{N}` con el
número del recurso en `ref/checklist-top-recursos-mejoras.md` (o usa un slug
tipo `recipes/api-documentation-openapi`), y pégalo en tu agente.

El agente:
1. Resolverá el recurso (slug, tipo, archivos EN/ES).
2. Leerá las reglas aplicables (`AGENTS.md`, `ref/docs/roadmap.md`).
3. Ejecutará las 8 sub-auditorías en paralelo (si hay cuota) o secuencialmente.
4. Sintetizará todo en un único checklist.
5. Escribirá el informe en `ref/audit/reports/{tipo}-{slug}-audit.md`.

---

## Prompt

```text
Eres un equipo senior de auditoría de contenido y SEO para StackPractices.com.
Tu objetivo es auditar el recurso {N} de ref/checklist-top-recursos-mejoras.md
en MODE=full y producir un único checklist de arreglos en
ref/audit/reports/{tipo}-{slug}-audit.md.

No editas archivos de contenido ni de código. Solo auditas y escribes el informe.

---

## FASE 1 — Resolver el recurso

1. Lee ref/checklist-top-recursos-mejoras.md y extrae la línea del recurso {N}.
   Si {N} es un slug (ej: recipes/api-documentation-openapi), úsalo directamente.
2. Identifica:
   - tipo: recipes | patterns | guides | docs
   - slug: kebab-case
   - topic: subcarpeta si existe (ej: api, data, security)
3. Resuelve las rutas locales:
   - EN: src/content/{tipo}/{topic}/{slug}.md
   - ES: src/content/{tipo}/{topic}/{slug}.es.md
4. Si falta la versión ES, reporta CRITICAL y detén la auditoría.
5. Lee los archivos de reglas aplicables:
   - AGENTS.md (raíz del proyecto)
   - src/content/{tipo}/AGENTS.md
   - ref/docs/roadmap.md (si existe)
6. Lee ref/checklist-top-recursos-mejoras.md para contexto de prioridad.

---

## FASE 2 — Ejecutar sub-auditorías

IMPORTANT: Ejecuta las 8 sub-auditorías. Si tienes cuota de ejecución paralela
(subagents), lánzalas en paralelo para acelerar. Si no, ejecútalas secuencialmente
en el orden indicado.

Para cada sub-auditoría:
1. Lee el archivo de prompt correspondiente en ref/audit/.
2. Sigue su rol, input, principios y estructura de salida.
3. Aplica el análisis sobre el recurso EN y ES.
4. Recoge el resultado para la síntesis final.

Sub-auditorías a ejecutar (todas en español):

| Orden | Archivo | Qué audita |
|-------|---------|------------|
| 1 | ref/audit/01-technical-audit.md | Indexabilidad, canonical, sitemap, structured data, performance |
| 2 | ref/audit/02-seo-audit.md | Frontmatter, title, meta, headings, internal links, SERP |
| 3 | ref/audit/03-content-quality-audit.md | Intención, calidad, thin content, information gain, estructura |
| 4 | ref/audit/04-humanization-audit.md | Patrones IA, tono, humanización |
| 5 | ref/audit/05-bilingual-parity-audit.md | Paridad EN/ES: estructura, metadatos, ejemplos |
| 6 | ref/audit/06-geo-audit.md | GEO / AI Search: entidades, hechos, pasajes extraíbles |
| 7 | ref/audit/08-gsc-ga4-traffic-audit.md | Tráfico, GSC/GA4, CTR, oportunidades |
| 8 | ref/audit/09-companion-media-audit.md | Companion repo, imágenes, diagramas, SEO de imágenes, móvil |

---

## FASE 3 — Detección de patrones IA (línea base)

Ejecuta los scripts de detección de IA para tener una línea base:

- python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.md
- python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.es.md

Guarda los outputs en:
- ref/output/ai-detect-patterns-{slug}.json
- ref/output/ai-detect-patterns-{slug}-es.json

Si python no está disponible, marca AI detection como NOT VERIFIED.

---

## FASE 4 — Build y verificación estática

1. Ejecuta `npm run build` y verifica que pasa sin errores.
   Si hay errores, inclúyelos en el checklist como CRITICAL.
2. Verifica en el HTML del build (dist/{tipo}/{slug}/index.html):
   - El H1 coincide con el title del frontmatter.
   - No hay contenido raw de mermaid (debe ser <img class="mermaid-diagram">).
   - El script /lightbox.js está presente.
   - Los SVGs referenciados existen en dist/assets/diagrams/.
3. Verifica en la versión ES (dist/es/{tipo}/{slug}/index.html) lo mismo.
4. Si hay companion repo, ejecuta `node scripts/build-catalog.js` en el repo hermano.

---

## FASE 5 — Verificación móvil

Además de las verificaciones de cada sub-auditoría, revisa específicamente
la versión móvil del recurso:

1. Si tienes acceso a un navegador (wavexis, playwright, etc.):
   - Abre la URL del recurso en viewport 375px (iPhone SE).
   - Verifica que no hay overflow horizontal.
   - Verifica que los diagramas son legibles o al menos click-to-zoom funciona.
   - Verifica que el lightbox abre con tap y cierra con la X.
   - Verifica que el texto no se corta ni se solapa.
   - Captura un screenshot y guárdalo en ref/audit/reports/screenshots/{slug}-mobile.png.
2. Si no tienes acceso a navegador:
   - Marca las verificaciones visuales como NOT VERIFIED.
   - Usa el HTML del build para verificar structuralmente:
     - <meta name="viewport"> presente.
     - CSS usa media queries o Tailwind responsive classes.
     - No hay elementos con width fijo > 375px.

---

## FASE 6 — Síntesis final

Usa ref/audit/07-final-synthesis.md para consolidar todos los hallazgos:

1. Extrae cada hallazgo de las 8 sub-auditorías.
2. Asigna severidad: CRITICAL | HIGH | MEDIUM | LOW.
3. Asigna categoría: TECHNICAL | SEO | CONTENT | HUMANIZATION | BILINGUAL | GEO | TRAFFIC | MEDIA | COMPANION | MOBILE.
4. Genera ítems con casilla [ ] y campos:
   - Why: por qué es un problema.
   - Evidence: dónde se vio (archivo, línea, HTML).
   - How: cómo arreglarlo.
   - Effort: S | M | L.
   - Source: qué sub-auditoría lo detectó.
5. Genera un Definition of Done con casillas [ ].
6. Genera Top 5 acciones prioritarias.
7. Genera un veredicto de una sola frase.

---

## FASE 7 — Escribir el informe

Escribe el checklist consolidado en:
ref/audit/reports/{tipo}-{slug}-audit.md

Estructura obligatoria del informe:

# Checklist de arreglos — {tipo}/{slug}

## 0. Metadata del recurso
- Slug, tipo, topic, título EN, título ES, lastUpdated, companion existe.

## 1. Scorecard y decisiones
- Tabla con scores por sub-auditoría (0-10 cada una).
- Decisión: PROMOTE | FIX-THEN-PROMOTE | HOLD | REWRITE.

## 2. Checklist de arreglos
### Critical
- [ ] **[CRITICAL] [CATEGORY] Descripción del problema**
  - Why: ...
  - Evidence: ...
  - How: ...
  - Effort: S/M/L
  - Source: 01-technical-audit

### High
- [ ] **[HIGH] [CATEGORY] ...**

### Medium
- [ ] **[MEDIUM] [CATEGORY] ...**

### Low
- [ ] **[LOW] [CATEGORY] ...**

## 3. Definition of Done
- [ ] Todos los CRITICAL resueltos.
- [ ] Todos los HIGH resueltos.
- [ ] Build pasa sin errores.
- [ ] Companion repo build pasa.
- [ ] Verificación móvil sin overflow.
- [ ] Paridad EN/ES verificada.

## 4. Top 5 acciones
1. ...
2. ...
3. ...
4. ...
5. ...

## 5. Veredicto
Una frase que resuma el estado del recurso.

## 6. Anexos
- Resultados de cada sub-auditoría (resumidos).
- Output de ai-detect-patterns (si se ejecutó).
- Screenshots móviles (si se capturaron).

---

## Reglas críticas

- No edites los archivos del recurso. Solo auditas y escribes el informe.
- Usa los AGENTS.md como fuente de verdad. No inventes reglas que no están
  escritas. Si una regla no existe, marca el hallazgo como RECOMMENDATION.
- El layout RecipeArticle.astro renderiza el H1 desde el title del frontmatter.
  NO es una violación que el body empiece con ## Overview.
- No hay límite máximo de FAQ. El mínimo es 3-5.
- metaDescription: 50-160 recomendado, 170 hard max.
- Distingue siempre: FACT / OBSERVATION / RECOMMENDATION / NOT VERIFIED.
- Marca como NOT VERIFIED todo lo que no puedas comprobar desde el código local.
- No inventes métricas de GSC, GA4, Core Web Vitals ni datos de producción.
- Prioriza hallazgos de alto impacto. No inundes con decenas de trivialidades.
- Todo el informe debe estar en español.
- Markdown limpio y linteable. Sin bloques YAML plegados (>) para campos cortos.
- Las tablas deben tener encabezado y separador (| --- | --- |).
```

---

## Ejemplos de uso

### Ejemplo 1 — Recurso número 3 del checklist

```text
Audita el recurso número 3 de ref/checklist-top-recursos-mejoras.md en MODE=full.
```

El agente leerá la línea `3. - [ ] **chatbot-openai** (recipes)`, resolverá los
archivos, lanzará las 8 sub-auditorías y escribirá
`ref/audit/reports/recipes-chatbot-openai-audit.md`.

### Ejemplo 2 — Slug directo

```text
Audita el recurso recipes/api-documentation-openapi en MODE=full.
```

### Ejemplo 3 — Solo SEO y técnico (modo parcial)

Para auditar solo SEO y técnico, ejecuta manualmente los sub-prompts:

```text
Audita el recurso {N} ejecutando solo:
- ref/audit/01-technical-audit.md
- ref/audit/02-seo-audit.md
Sintetiza con ref/audit/07-final-synthesis.md y escribe el checklist en
ref/audit/reports/{tipo}-{slug}-audit.md.
```

---

## Modos disponibles

| Modo | Sub-auditorías | Cuándo usar |
|------|----------------|------------|
| `quick` | 01 (parcial) + 02 (parcial) + 03 (thin content) | Diagnóstico rápido |
| `seo` | 01 + 02 | Solo SEO |
| `content` | 03 | Solo calidad de contenido |
| `humanize` | 04 + 03 (thin content) | Solo humanización |
| `bilingual` | 05 | Solo paridad EN/ES |
| `geo` | 06 | Solo GEO/AI Search |
| `traffic` | 08 | Solo GSC/GA4/tráfico |
| `media` | 09 | Solo companion + imágenes/diagramas |
| `full` | 01-09 (todas) + síntesis | Auditoría completa |

Por defecto se usa `full`.
