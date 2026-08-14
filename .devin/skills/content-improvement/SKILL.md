---
name: content-improvement
description: Mejora un recurso existente de StackPractices (recipe, pattern, guide, doc) aplicando SEO técnico, calidad de contenido, detección y corrección de patrones IA, humanización, paridad EN/ES y validación completa.
version: 1.0.0
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
2. Si solo se da el slug, infiere el tipo (`recipes`, `patterns`, `docs`, `guides`) a partir de la ruta o pregunta.

## Flujo de trabajo

1. **Identificar el recurso**
   - Resolver la ruta del archivo EN: `src/content/{tipo}/{slug}.md`.
   - Resolver la ruta del archivo ES: `src/content/{tipo}/{slug}.es.md`.
   - Si falta la versión ES, crear una traducción completa antes de continuar.

2. **Leer y evaluar el estado actual**
   - Leer ambos archivos, frontmatter y cuerpo.
   - Revisar `relatedResources`, `metaDescription`, `title`, `description`, `lastUpdated`.

3. **Auditoría SEO técnica (Prompt 17)**
   - Aplicar el contenido de `.devin/skills/content-improvement/reference/17-technical-seo-audit.md` al recurso EN.
   - Generar `ref/output/seo-audit-{slug}.md` solo si hay hallazgos accionables.

4. **Auditoría de calidad de contenido (Prompt 18)**
   - Aplicar `.devin/skills/content-improvement/reference/18-content-quality-auditor.md` a ambas versiones.
   - Generar `ref/output/content-quality-audit-{slug}.md` si procede.

5. **Detección de IA**
   - Ejecutar el detector Desklib en ambos idiomas:
     ```
     python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --es src/content/{tipo}/{slug}.es.md --model desklib
     ```
   - Ejecutar el detector de patrones:
     ```
     python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.md
     python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.es.md
     ```
   - NO usar el modelo `light`.

6. **Aplicar `.devin/skills/content-improvement/reference/ai-detect-analysis.md`**
   - Corregir hallazgos de patrones primero.
   - Humanizar frases con alta probabilidad IA conservando el contenido técnico.
   - Reescribir frases una a una; no reescribir el recurso completo si no es necesario.

7. **Paridad EN/ES**
   - Mismo número y orden de `relatedResources`.
   - Mismos ejemplos de código; traducir comentarios y nombres de variables solo si es idiomático.
   - `title`, `description`, `metaDescription` y `seo.keywords` traducidos.
   - `metaDescription` entre 50 y 170 caracteres en ambos idiomas.
   - Actualizar `lastUpdated` en ambos frontmatter.

8. **Validación técnica**
   - Ejecutar la cadena de validación:
     ```
     npm run content:quality
     npm run content:links
     npm run content:validate
     npm run check
     npm run build
     npm run sitemap
     ```
   - Alternativa: `node scripts/content-improvement-pipeline.cjs <slug>`

9. **Revisión y resumen**
   - Mostrar `git diff` de los archivos modificados.
   - Resumir cambios: qué se corrigió, por qué, y métricas finales (puntuación IA, advertencias, build).
   - Pedir aprobación explícita antes de hacer `git commit` y `git push`.

10. **Commit y push** (solo tras aprobación)
    - Mensaje en inglés, sin mencionar herramientas IA.
    - Incluir `Co-Authored-By` solo si el proyecto lo requiere.

## Reglas críticas

- **No eliminar contenido técnico** solo para bajar la puntuación IA.
- **Usar siempre Desklib**, nunca el detector `light`.
- **No añadir secciones manuales** de recursos relacionados en el cuerpo del Markdown.
- **No inventar** herramientas, versiones, normas o datos.
- **Mantener los ejemplos de código funcionales** y prácticos.
- **Respetar la fase del roadmap**: no introducir monetización ni backend.
- **No modificar** `.npmrc`, políticas de seguridad, ni configuraciones de CI/CD para forzar builds.

## Output esperado

- Archivos `src/content/{tipo}/{slug}.md` y `.es.md` mejorados.
- Informes opcionales en `ref/output/`: `seo-audit-{slug}.md`, `content-quality-audit-{slug}.md`, `ai-detect-{slug}.json`, `ai-detect-patterns-{slug}.json`, `ai-detect-analysis-{slug}.md`.
- `npm run build` exitoso (3.242 páginas construidas).
- `public/sitemap.xml` regenerado.
- Resumen claro para el usuario antes de aprobar commit.
