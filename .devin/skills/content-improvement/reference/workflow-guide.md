# Flujo de mejora de contenido — StackPractices

> **Nota para el skill `content-improvement`**: el flujo canónico y acotado para
> mejorar un recurso **existente** está en `.devin/skills/content-improvement/SKILL.md`
> y en `.devin/skills/content-improvement/reference/workflow-prompt.md`.
> Este documento es una guía de referencia más amplia que incluye creación,
> scaffold y detalles adicionales.

Este documento describe el flujo para crear y mejorar recursos de
`StackPractices`: recetas, patrones, guías y plantillas de documentación. El
objetivo es reducir el score de detección de IA, mantener calidad técnica y
cumplir las reglas de SEO/GEO del proyecto.

---

## 1. Elegir tipo y crear el scaffold

- Tipos válidos: `recipes`, `patterns`, `docs`, `guides` (ver
  `src/content.config.ts`).
- Crear ambos archivos:
  - `src/content/{tipo}/{slug}.md`
  - `src/content/{tipo}/{slug}.es.md`
- Frontmatter completo:
  - `contentType`: `recipes`, `patterns`, `docs` o `guides`.
  - `slug`: kebab-case (`api-documentation-openapi`).
  - `title`: < 80 caracteres (ideal < 60 para SEO).
  - `description`: 80-160 caracteres.
  - `metaDescription`: 120-170 caracteres (debe coincidir con
    `seo.metaDescription`).
  - `difficulty`: `beginner`, `intermediate` o `advanced`.
  - `topics`: 1+ de la lista permitida (`src/content.config.ts`).
  - `tags`: 3-8 términos.
  - `relatedResources`: 6 slugs reales de otros recursos (máximo que renderiza
    el detalle).
  - `lastUpdated`: fecha `YYYY-MM-DD`.
  - `seo.keywords`: 3-8 keywords.

Plantillas y ejemplos: ver `ref/docs/content-architecture.md` y
`ref/docs/geo.md`.

---

## 2. Primera pasada de contenido

- Escribir primero el recurso en inglés.
- Crear la versión en español completa y precisa (no una traducción literal
  forzada).
- Estructura recomendada:
  - `## Overview` — problema real y respuesta directa.
  - `## When to Use` — cuándo sí y cuándo NO conviene.
  - `## Solution` — código/comandos/configuración funcional.
  - `## Explanation` — por qué funciona y trade-offs.
  - `## Variants` — alternativas.
  - `## Best Practices` / `## What Works`.
  - `## Common Mistakes` / `## Troubleshooting`.
  - `## FAQ` — 4+ preguntas reales con respuestas concisas.
  - `## See Also` o `## Further Reading`.
- Tono: humano, en primera persona cuando aporta (`I usually...`,
  `I learned...`), con opiniones y matices.
- Prohibido: `This guide covers...`, `In today's fast-paced world...`,
  `In conclusion...`, `Quick Note`, `Executive Summary`, etc.

---

## 3. Humanización

Invocar la skill `humanizer` (`.codeium/windsurf/skills/humanizer/SKILL.md`) antes de
publicar.

Objetivos:

- Eliminar palabras/frases rojas: _delve, underscore, harness, pivotal, nuanced,
  multifaceted, seamless, tapestry, paradigm, synergy, holistic, groundbreaking,
  transformative, leverage, robust, cutting-edge_.
- Sustituir verbos formales: `provides` → `gives you`/`has`, `utilizes` →
  `uses`, `features` → `has`, `enables` → `lets you`, `ensures` → `makes sure`.
- Reescribir bullets genéricos (`Define clear goals`, `Document everything`,
  `Test thoroughly`).
- Evitar aperturas y cierres de relleno.
- Vary the rhythm: no todas las oraciones del mismo largo, no listas con
  exactamente 3 ítems forzados.

Luego ejecutar el checker de patrones para verificar:

```bash
python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.md
python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.es.md
```

Esto es rápido y no carga modelos. Si hay findings, corregirlos antes del
paso 4.

---

## 4. Detección de IA con ai-detect

Herramienta: `ai_detect` (instalada en
`C:\Users\mathi\AppData\Roaming\Python\Python314\site-packages\ai_detect\`).

Para un recurso concreto, limpiar Markdown y ejecutar el modelo `desklib`:

```bash
python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --model desklib
```

El script:

- Elimina frontmatter, código, headings y viñetas antes de analizar.
- Procesa el `.md` en inglés y, si existe, el `.es.md`.
- Escribe el informe en `ref/output/ai-detect-{slug}.json`.
- Muestra `model_ai_pct`, `ai_count`, `human_count` y `pattern_totals`.

Alternativa rápida (pero menos fiable) con el modelo ligero:

```bash
python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --model light
```

### Iteración

1. Si `model_ai_pct` > 40 %, revisar `top_ai_sentences` y `diagnostics_sample`.
2. Reescribir las frases con mayor `ai_prob` manteniendo el significado técnico.
3. Priorizar las oraciones de FAQ repetitivas (`### How do I...`,
   `### ¿Cómo...`); variar su formulación o convertir algunas en afirmaciones.
4. Volver a ejecutar `scripts/ai-detect-content.py`.
5. Repetir hasta que `model_ai_pct` baje lo máximo posible.

**Target realista:** < 30 % es ideal, pero contenido denso con muchas FAQ puede
estabilizarse entre 35 % y 50 % con `desklib`. Lo más importante es que
`pattern_totals` esté vacío y el texto sea útil.

Prompt de referencia: `.devin/skills/content-improvement/reference/prompt-ai-detect-analysis.md`.

---

## 5. Verificación técnica y SEO

Ejecutar en orden (para un recurso concreto):

```bash
npm run content:quality -- src/content/{tipo}/{slug}.md
# frontmatter, slugs, traducciones, enlaces del recurso
npm run content:links
# enlaces rotos en todo el sitio
npm run check
# astro check (tipos y schemas)
npm run build
# build estático + Pagefind
```

Si quieres una validación global del sitio antes de un release grande, ejecuta
`npm run content:quality` sin ruta.

Validar manualmente (con `content:quality` se cubre gran parte):

- [ ] Sin thin content: el body no solo cumple el mínimo de palabras, sino que aporta ejemplos, trade-offs y valor real.
- [ ] `title` < 80 caracteres.
- [ ] `description` 80-160 caracteres.
- [ ] `metaDescription` 120-170 caracteres y coincide con `seo.metaDescription`.
- [ ] `contentType`, `slug`, `difficulty`, `topics` y `tags` válidos.
- [ ] Body por encima del mínimo por tipo (`recipes` 1.000, `patterns` 1.200,
      `guides` 1.500, `docs` 800 palabras).
- [ ] `relatedResources` apuntan a slugs existentes (sin barra final).
- [ ] Código con lenguaje especificado y versiones reales.
- [ ] FAQ con 4+ preguntas reales.
- [ ] No hay frases patrón ni secciones de relleno.
- [ ] Tono humano, con opiniones y trade-offs.
- [ ] Traducción al español completa y precisa.

---

## 6. Commit y publicación

Si el recurso ya existe y se está aplicando el skill `content-improvement`,
mostrar `git diff`, resumir los cambios y **pedir aprobación explícita** antes de
hacer commit.

```bash
git diff --stat
git add src/content/{tipo}/{slug}.md src/content/{tipo}/{slug}.es.md
# añadir informes de ref/output/ solo si procede:
git add ref/output/ai-detect-{slug}.json ref/output/ai-detect-patterns-{slug}.json
```

Solo después de la aprobación del usuario:

```bash
git commit -m "Add {slug} {tipo}"
git push
```

Si el recurso es nuevo o se ha modificado el contenido, regenerar sitemap:

```bash
npm run sitemap
```

Para la validación técnica, preferir:

```bash
node scripts/content-improvement-pipeline.cjs <slug>
```

---

## Referencias

- `ai-detection-tools.md` (este skill) — herramientas y scripts de detección de IA.
- `prompt-ai-detect-analysis.md` (este skill) — prompt para análisis con ai-detect.
- `prompt-17-technical-seo-audit.md` (este skill) — criterios de auditoría SEO técnica.
- `prompt-18-content-quality-auditor.md` (este skill) — criterios de calidad de contenido.
- `ref/docs/content-architecture.md` — esquemas y colecciones.
- `ref/docs/geo.md` — estrategia GEO y estructura de contenido.
- `ref/docs/seo.md` — SEO técnico y on-page.
- `AGENTS.md` — reglas generales del proyecto.
