# Flujo de mejora de contenido — StackPractices

Este documento describe el flujo para crear y mejorar recursos de `StackPractices`: recetas, patrones, guías y plantillas de documentación. El objetivo es reducir el score de detección de IA, mantener calidad técnica y cumplir las reglas de SEO/GEO del proyecto.

---

## 1. Elegir tipo y crear el scaffold

- Tipos válidos: `recipes`, `patterns`, `docs`, `guides` (ver `src/content.config.ts`).
- Crear ambos archivos:
  - `src/content/{tipo}/{slug}.md`
  - `src/content/{tipo}/{slug}.es.md`
- Frontmatter completo:
  - `contentType`: `recipes`, `patterns`, `docs` o `guides`.
  - `slug`: kebab-case (`api-documentation-openapi`).
  - `title`: < 80 caracteres (ideal < 60 para SEO).
  - `description`: 80-160 caracteres.
  - `metaDescription`: 120-170 caracteres (debe coincidir con `seo.metaDescription`).
  - `difficulty`: `beginner`, `intermediate` o `advanced`.
  - `topics`: 1+ de la lista permitida (`src/content.config.ts`).
  - `tags`: 3-8 términos.
  - `relatedResources`: 3-5 slugs reales de otros recursos.
  - `lastUpdated`: fecha `YYYY-MM-DD`.
  - `seo.keywords`: 3-8 keywords.

Plantillas y ejemplos: ver `ref/docs/content-architecture.md` y `ref/docs/geo.md`.

---

## 2. Primera pasada de contenido

- Escribir primero el recurso en inglés.
- Crear la versión en español completa y precisa (no una traducción literal forzada).
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
- Tono: humano, en primera persona cuando aporta (`I usually...`, `I learned...`), con opiniones y matices.
- Prohibido: `This guide covers...`, `In today's fast-paced world...`, `In conclusion...`, `Quick Note`, `Executive Summary`, etc.

---

## 3. Humanización

Invocar la skill `humanize-writing` (`.codeium/windsurf/skills/humanize-writing`) antes de publicar.

Objetivos:

- Eliminar palabras/frases rojas: *delve, underscore, harness, pivotal, nuanced, multifaceted, seamless, tapestry, paradigm, synergy, holistic, groundbreaking, transformative, leverage, robust, cutting-edge*.
- Sustituir verbos formales: `provides` → `gives you`/`has`, `utilizes` → `uses`, `features` → `has`, `enables` → `lets you`, `ensures` → `makes sure`.
- Reescribir bullets genéricos (`Define clear goals`, `Document everything`, `Test thoroughly`).
- Evitar aperturas y cierres de relleno.
- Vary the rhythm: no todas las oraciones del mismo largo, no listas con exactamente 3 ítems forzados.

Luego ejecutar el checker de patrones para verificar:

```bash
python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.md
python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.es.md
```

Esto es rápido y no carga modelos. Si hay findings, corregirlos antes del paso 4.

---

## 4. Detección de IA con ai-detect

Herramienta: `ai_detect` (instalada en `C:\Users\mathi\AppData\Roaming\Python\Python314\site-packages\ai_detect\`).

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
3. Priorizar las oraciones de FAQ repetitivas (`### How do I...`, `### ¿Cómo...`); variar su formulación o convertir algunas en afirmaciones.
4. Volver a ejecutar `scripts/ai-detect-content.py`.
5. Repetir hasta que `model_ai_pct` baje lo máximo posible.

**Target realista:** < 30 % es ideal, pero contenido denso con muchas FAQ puede estabilizarse entre 35 % y 50 % con `desklib`. Lo más importante es que `pattern_totals` esté vacío y el texto sea útil.

Prompt de referencia: `ref/prompts/ai-detect-analysis.md`.

---

## 5. Verificación técnica y SEO

Ejecutar en orden (para un recurso concreto):

```bash
npm run content:quality -- src/content/{tipo}/{slug}.md   # frontmatter, slugs, traducciones, enlaces del recurso
npm run content:links                                      # enlaces rotos en todo el sitio
npm run check                                              # astro check (tipos y schemas)
npm run build                                              # build estático + Pagefind
```

Si quieres una validación global del sitio antes de un release grande, ejecuta `npm run content:quality` sin ruta.

Validar manualmente (con `content:quality` se cubre gran parte):

- [ ] `title` < 80 caracteres.
- [ ] `description` 80-160 caracteres.
- [ ] `metaDescription` 120-170 caracteres y coincide con `seo.metaDescription`.
- [ ] `contentType`, `slug`, `difficulty`, `topics` y `tags` válidos.
- [ ] Body por encima del mínimo por tipo (`recipes` 300, `patterns` 400, `guides` 500, `docs` 200 palabras).
- [ ] `relatedResources` apuntan a slugs existentes (sin barra final).
- [ ] Código con lenguaje especificado y versiones reales.
- [ ] FAQ con 4+ preguntas reales.
- [ ] No hay frases patrón ni secciones de relleno.
- [ ] Tono humano, con opiniones y trade-offs.
- [ ] Traducción al español completa y precisa.

---

## 6. Commit y publicación

```bash
git add src/content/{tipo}/{slug}.md src/content/{tipo}/{slug}.es.md
git add ref/output/ai-detect-{slug}.json ref/output/ai-detect-patterns-{slug}.json
git commit -m "Add {slug} {tipo}"
git push
```

Si el recurso es nuevo, regenerar sitemap:

```bash
npm run sitemap
```

---

## Referencias

- `ref/ai-detection-tools.md` — herramientas y scripts de detección de IA.
- `ref/prompts/ai-detect-analysis.md` — prompt para análisis con ai-detect.
- `ref/prompts-ia/1-auditoria.md` — auditoría editorial y técnica.
- `ref/prompts-ia/2-mejora.md` — mejora de un recurso existente.
- `ref/prompts-ia/3-revision-final.md` — revisión final antes de publicar.
- `ref/docs/content-architecture.md` — esquemas y colecciones.
- `ref/docs/geo.md` — estrategia GEO y estructura de contenido.
- `ref/docs/seo.md` — SEO técnico y on-page.
- `AGENTS.md` — reglas generales del proyecto.
