# Flujo de mejora de contenido

> Referencia para auditar y mejorar recursos del checklist
> `ref/checklist-top-recursos-mejoras.md`.
> Aplicable a cualquier recurso de cualquier tipo (recipes, patterns, docs, guides).

## Resumen del flujo

```text
ref/checklist-top-recursos-mejoras.md
         │
         ▼
   ┌─────────────┐
   │  1. AUDITAR │  ref/audit-a-resource.md
   │  (7 sub)    │  → ref/audit/reports/{tipo}-{slug}-audit.md
   │  + AI detect│  → ref/output/ai-detect-*.json
   │  + build    │  → verificar que pasa
   └──────┬──────┘
          │  score inicial
          ▼
   ┌─────────────┐
   │  2. ARREGLAR│  ref/improve-a-resource.md
   │  (5 fases)  │  → content-improvement skill
   │  + Mermaid  │  → diagrama si aplica
   │  + companion│  → repo hermano si aplica
   │  + AI detect│  → pre y post Desklib
   └──────┬──────┘
          │  edits EN/ES + validación
          ▼
   ┌─────────────┐
   │  3. RE-AUDIT│  ref/reaudit-a-resource.md
   │  (focalizado)│  → checklist actualizado
   │  score antes│     vs después
   │  vs después │
   └──────┬──────┘
          │  score comparativo
          ▼
   ┌─────────────┐
   │  4. RESUMEN │  git commit (sin push sin aprobación)
   │             │  → pendientes MEDIUM/LOW
   └─────────────┘
```

## Paso 1 — Auditar

**Prompt:** `ref/audit-a-resource.md` con el número del recurso del checklist.

**Qué hace:**

- Lee el recurso EN+ES, los AGENTS.md aplicables y el roadmap.
- Lanza 7 sub-auditorías en paralelo:
  1. `01-technical-audit.md`
  2. `02-seo-audit.md`
  3. `03-content-quality-audit.md`
  4. `04-humanization-audit.md`
  5. `05-bilingual-parity-audit.md`
  6. `06-geo-audit.md`
  7. `08-gsc-ga4-traffic-audit.md`
- Sintetiza con `07-final-synthesis.md`.
- Escribe un checklist en `ref/audit/reports/{tipo}-{slug}-audit.md`.
- **No edita archivos del recurso.**

**Output:** `ref/audit/reports/{tipo}-{slug}-audit.md` con scorecard,
checklist de arreglos por severidad (CRITICAL/HIGH/MEDIUM/LOW),
Definition of Done y Top 5 acciones.

**Reglas clave:**

- Usa los AGENTS.md como fuente de verdad. No inventes reglas.
- El layout renderiza el H1 desde el frontmatter.
  No es violación que el body empiece con `## Overview`.
- Secciones `What Works`, `Troubleshooting`, `See Also`,
  `Further Reading` son válidas.
- No hay máximo de FAQ. Mínimo 3-5.
- `metaDescription`: 50-160 recomendado, 170 hard max.
- Distingue FACT / OBSERVATION / RECOMMENDATION / NOT VERIFIED.
- Marca como NOT VERIFIED lo no verificable desde el código local
  (GSC, GA4, CWV).
- Verifica si el recurso tiene imágenes/diagramas
  (bloques `mermaid`, `![alt](...)`, `public/assets/`).
- Si hay bloques `mermaid`, verifica que se renderizan como
  `<div class="mermaid">` en el HTML del build, que el script
  `/mermaid-init.js` está presente, y que hay paridad EN/ES.
- Verifica si existe
  `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json`.
  Si existe, verifica que `meta.json` tiene los campos requeridos y que
  los archivos listados en `files` existen.

## Paso 2 — Arreglar

**Prompt:** `ref/improve-a-resource.md` con el mismo número.

**Qué hace:** Invoca el skill `content-improvement` en modo full
con 5 fases:

| Fase | Qué hace | Scope |
|---|---|---|
| 0 — Diagnóstico | Estado base, thin content, imágenes/diagramas, companion repo | Solo lectura |
| 1 — Quick wins SEO | Máximo 5 cambios de frontmatter y primer encabezado | Frontmatter |
| 2 — Calidad + IA | Máximo 4 rondas con Desklib. Corregir tokens, primera persona, patrones | Body |
| 3 — Paridad EN/ES | Verificar equivalencia de secciones, código, frontmatter, enlaces | Ambos |
| 4 — Validación técnica | 6 comandos en orden, parar en primer fallo | Build |
| 5 — Resumen | git status, diff, tabla de cambios, aprobación para commit | Reporte |

**Validación (parar en el primer fallo):**

```bash
npm run content:quality
npm run content:links
npm run content:validate
npm run check
npm run build
npm run sitemap
```

**Reglas clave:**

- No inventes reglas que no están en los AGENTS.md.
- No agregues H1 al body (lo renderiza el layout).
- No elimines secciones válidas
  (`What Works`, `Troubleshooting`, etc.).
- No reduzcas FAQ a menos que el checklist lo indique con justificación.
- No elimines contenido técnico para bajar IA.
- No inventes herramientas, versiones, normas o datos.
- No hagas commit/push sin aprobación explícita.
- Diagramas Mermaid: si el recurso se beneficia de uno, añadirlo
  directamente en el Markdown (EN y ES). El sitio renderiza Mermaid
  client-side. Mantener simple, etiquetado y equivalente EN/ES.
- Companion repo `stack-practices-resources`: si el recurso tiene
  ejemplos multi-archivo o plantillas, crear la carpeta
  `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/`
  con `meta.json` y los archivos. No hacer commit ni push del repo
  hermano sin aprobación explícita.
- Items que siguen OUT OF SCOPE: speakable schema (modifica
  componentes Astro), HTTP 301, assets descargables externos.

## Paso 3 — Re-auditar

**Prompt:** `ref/reaudit-a-resource.md` con el mismo número.

**Qué hace:** Verificación focalizada de que las mejoras funcionaron.
NO ejecuta las 7 sub-auditorías completas. Mide los puntos clave y
compara con el score anterior.

**Verifica:**

- SEO on-page (title, metaDescription, frontmatter)
- Technical SEO (sitemap, hreflang, structured data)
- Content quality (body words, thin content, FAQ count)
- Humanization (red words, passive voice, FAQ variety, AI patterns)
- Bilingual parity (H2/H3, code blocks, frontmatter)
- Mermaid + visual assets (render en build, paridad EN/ES)
- Companion repo (meta.json, files, build-catalog)
- Validación técnica (6 comandos en orden)

**Output:** Checklist actualizado en
`ref/audit/reports/{tipo}-{slug}-audit.md` con:

- Score comparativo (antes vs después) en tabla.
- Issues resueltos marcados como ✅.
- Issues pendientes con estado
  (PENDIENTE / OUT OF SCOPE / Opcional).
- Definition of Done actualizada.
- Top 5 acciones pendientes.

**Por qué re-auditar:**

- Verificar que los arreglos aplicados resolvieron los issues.
- Detectar nuevos issues introducidos por las ediciones.
- Confirmar que no se rompió paridad EN/ES.
- Obtener un score comparativo objetivo.

## Paso 4 — Resumen de mejoras

**Qué hace:**

- Muestra `git status` y `git diff --stat`.
- Resume en tabla: cambios de frontmatter, hallazgos corregidos,
  IA antes/después, paridad, validación, imágenes/diagramas,
  companion repo.
- Lista items OUT OF SCOPE.
- Pide aprobación para commit.
- Hace commit (sin push sin aprobación explícita).

**Formato de commits:**

Separar por naturaleza de cambios:

1. `fix(seo): ...` — cambios de metadata y humanización del recurso.
2. `feat(content-improvement): ...` — cambios al skill, prompts
   y reportes.
3. `docs(agents): ...` — cambios a AGENTS.md.

**Sin push sin aprobación explícita del usuario.**

## Cómo usar el flujo

1. Abre `ref/checklist-top-recursos-mejoras.md` y elige un número.
2. Ejecuta el prompt de `ref/audit-a-resource.md` con ese número.
3. Revisa el reporte en
   `ref/audit/reports/{tipo}-{slug}-audit.md`.
4. Ejecuta el prompt de `ref/improve-a-resource.md` con el mismo
   número.
5. El agente aplicará los arreglos, validará y pedirá aprobación.
6. Aprueba el commit (o no).
7. Ejecuta el prompt de `ref/reaudit-a-resource.md` para re-auditar.
8. Revisa el score comparativo y los pendientes.
9. Repite desde el paso 4 si quedan issues accionables.
10. Cuando el recurso esté listo, haz push (con aprobación).

## Mínimos de palabras por tipo

| `contentType` | Mínimo body words |
|---|---|
| `recipes` | 1.300 |
| `patterns` | 1.500 |
| `guides` | 3.000 |
| `docs` | 3.000 |

Estos son objetivos de profundidad, no de relleno. Un recurso puede
superarlos con tablas densas, código útil y trade-offs. Un recurso
que los supera con listas genéricas o FAQ de relleno sigue siendo
thin content.

## Archivos del flujo

| Archivo | Propósito |
|---|---|
| `ref/checklist-top-recursos-mejoras.md` | Lista de recursos priorizados |
| `ref/audit-a-resource.md` | Prompt reutilizable para auditar (Paso 1) |
| `ref/improve-a-resource.md` | Prompt reutilizable para mejorar (Paso 2) |
| `ref/reaudit-a-resource.md` | Prompt reutilizable para re-auditar (Paso 3) |
| `ref/audit/00-master-audit.md` | Prompt maestro de las 7 sub-auditorías |
| `ref/audit/01-technical-audit.md` | Sub-auditoría technical SEO |
| `ref/audit/02-seo-audit.md` | Sub-auditoría SEO on-page |
| `ref/audit/03-content-quality-audit.md` | Sub-auditoría calidad |
| `ref/audit/04-humanization-audit.md` | Sub-auditoría humanización e IA |
| `ref/audit/05-bilingual-parity-audit.md` | Sub-auditoría paridad EN/ES |
| `ref/audit/06-geo-audit.md` | Sub-auditoría GEO |
| `ref/audit/07-final-synthesis.md` | Síntesis final |
| `ref/audit/08-gsc-ga4-traffic-audit.md` | Sub-auditoría tráfico |
| `ref/audit/reports/{tipo}-{slug}-audit.md` | Reporte por recurso |
| `.devin/skills/content-improvement/SKILL.md` | Skill con las 5 fases |
| `src/content/{tipo}/AGENTS.md` | Reglas por tipo de contenido |
| `AGENTS.md` | Reglas generales del proyecto |
| `scripts/ai-detect-patterns.py` | Detector de patrones AI por archivo |
| `scripts/ai-detect-content.py` | Detector AI Desklib (EN+ES) |
| `public/mermaid.min.js` | Mermaid.js self-hosted (CSP compliant) |
| `public/mermaid-init.js` | Loader de Mermaid (solo si hay bloques) |
| `src/lib/remark-mermaid-blocks.mjs` | Remark plugin: fenced mermaid → div |
| `../stack-practices-resources/` | Repo hermano con ejemplos descargables |
