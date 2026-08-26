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
   │  (8 sub)    │  → ref/audit/reports/{tipo}-{slug}-audit.md
   │  + AI detect│  → ref/output/ai-detect-*.json
   │  + build    │  → verificar que pasa
   └──────┬──────┘
          │  score inicial
          ▼
   ┌─────────────┐
   │  2. ARREGLAR│  ref/improve-a-resource.md
   │  (8 fases)  │  → content-improvement skill
   │  + Mermaid  │  → diagrama si aplica (flowchart LR)
   │  + companion│  → repo hermano si aplica
   │  + AI detect│  → pre y post Desklib
   │  + móvil    │  → verificación estructural o navegador
   └──────┬──────┘
          │  edits EN/ES + validación
          ▼
   ┌─────────────┐
   │  3. RE-AUDIT│  ref/reaudit-a-resource.md
   │  (9 fases)  │  → checklist actualizado
   │  score antes│     vs después
   │  vs después │  → regresiones detectadas
   │  + regresión│
   └──────┬──────┘
          │  score comparativo
          ▼
   ┌─────────────┐
   │  4. RESUMEN │  ref/summary-a-resource.md
   │  + commits  │  → commits separados por naturaleza
   │  + push     │  → push con aprobación explícita
   └─────────────┘
```

## Paso 1 — Auditar

**Prompt:** `ref/audit-a-resource.md` con el número del recurso del checklist.

**Qué hace:**

- Lee el recurso EN+ES, los AGENTS.md aplicables y el roadmap.
- Lanza 8 sub-auditorías (en paralelo si hay cuota, secuencial si no):
  1. `01-technical-audit.md` — HTTP, indexabilidad, canonical, sitemap, structured data.
  2. `02-seo-audit.md` — Frontmatter, title, meta, headings, enlaces internos, SERP CTR.
  3. `03-content-quality-audit.md` — Intención, SERP, thin content, information gain.
  4. `04-humanization-audit.md` — Patrones IA, palabras rojas, frases genéricas, tono.
  5. `05-bilingual-parity-audit.md` — Paridad EN/ES: estructura, metadatos, ejemplos.
  6. `06-geo-audit.md` — GEO / AI Search: entidades, hechos, citas, pasajes extraíbles.
  7. `08-gsc-ga4-traffic-audit.md` — Tráfico, GSC/GA4, CTR, flujo de usuario.
  8. `09-companion-media-audit.md` — Companion repo, imágenes, diagramas Mermaid, lightbox, móvil.
- Sintetiza con `07-final-synthesis.md`.
- Verifica el build pasa.
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
- Si hay bloques `mermaid`, verifica que los SVGs existen en
  `public/assets/diagrams/`, que el HTML del build contiene
  `<img src="/assets/diagrams/...">`, que `/lightbox.js` está presente,
  y que hay paridad EN/ES (SVGs EN y ES generados).
- Verifica si existe
  `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json`.
  Si existe, verifica que `meta.json` tiene los campos requeridos y que
  los archivos listados en `files` existen.
- Verificación móvil: si hay navegador disponible (wavexis, playwright),
  verifica viewport 375px, overflow, legibilidad de diagramas, click-to-zoom.
  Si no, verificación estructural del HTML y marca `NOT VERIFIED` lo runtime.

## Paso 2 — Arreglar

**Prompt:** `ref/improve-a-resource.md` con el mismo número.

**Qué hace:** Invoca el skill `content-improvement` en modo full
con 8 fases:

| Fase | Qué hace | Scope |
|---|---|---|
| 0 — Diagnóstico | Estado base, thin content, AI detection, imágenes/diagramas, companion repo | Solo lectura |
| 1 — Quick wins SEO | Máximo 5 cambios de frontmatter y SEO on-page | Frontmatter |
| 2 — Calidad + IA | Máximo 4 rondas con Desklib. Corregir tokens, primera persona, patrones | Body |
| 3 — Paridad EN/ES | Verificar equivalencia de secciones, código, frontmatter, enlaces, diagramas | Ambos |
| 4 — Diagramas e imágenes | Añadir/modificar Mermaid (flowchart LR), renderizar SVGs, verificar imágenes | Body + assets |
| 5 — Companion repo | Crear/verificar meta.json, archivos, README EN/ES, build-catalog | Repo hermano |
| 6 — Validación técnica | 7 comandos en orden, parar en primer fallo | Build |
| 7 — Verificación post-build | HTML, SVGs, lightbox, móvil, companion | Verificación |
| 8 — Resumen | git status, diff, tabla de cambios, aprobación para commit | Reporte |

**Validación (parar en el primer fallo):**

```bash
npm run content:quality
npm run content:links
npm run content:validate
npm run check
npm run mermaid:render    # si hay diagramas
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
  directamente en el Markdown (EN y ES). Preferir `flowchart LR`
  (horizontal) sobre `TD` (vertical). El sitio renderiza Mermaid
  a SVG estático en build time (`npm run mermaid:render`) con
  click-to-zoom via lightbox. Mantener simple, etiquetado y
  equivalente EN/ES. No inventes diagramas decorativos.
- Companion repo `stack-practices-resources`: si el recurso tiene
  ejemplos multi-archivo o plantillas, crear la carpeta
  `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/`
  con `meta.json` (title, title_es, description, description_es, type,
  topic, slug, source_urls, language, tags, files) y los archivos.
  Crear `README.md` y `README.es.md` si es útil. No hacer commit ni
  push del repo hermano sin aprobación explícita.
- Verificación móvil: si hay navegador, verificar viewport 375px,
  overflow horizontal, legibilidad de diagramas, click-to-zoom.
  Si no, verificación estructural del HTML.
- Items que siguen OUT OF SCOPE: speakable schema (modifica
  componentes Astro), HTTP 301, assets descargables externos,
  backlinks outreach, GA4 config.

## Paso 3 — Re-auditar

**Prompt:** `ref/reaudit-a-resource.md` con el mismo número.

**Qué hace:** Verificación focalizada de que las mejoras funcionaron.
NO ejecuta las 8 sub-auditorías completas. Re-mide 8 dimensiones y
compara con el score anterior.

**9 fases:**

| Fase | Qué hace |
|---|---|
| 1 — Resolver recurso | Cargar checklist anterior con scores e issues |
| 2 — Re-medir dimensiones | SEO on-page, técnico, contenido, humanización, bilingüe, medios visuales, companion, GEO |
| 3 — Verificar issues | Cada issue del checklist: ✅ Resuelto / ⚠️ Pendiente / 🔧 Out of scope / 🔄 Regresión |
| 4 — Validación técnica | 7 comandos en orden, parar en primer fallo |
| 5 — Verificación post-build | HTML, SVGs, lightbox, móvil, companion |
| 6 — Score comparativo | Tabla ANTES vs DESPUÉS con cambio y estado |
| 7 — Resumen de issues | Tabla con todos los issues y su estado final |
| 8 — Veredicto | PROMOTE / FIX-THEN-PROMOTE / HOLD / REWRITE |
| 9 — Actualizar checklist | Sobrescribe el reporte con el estado final |

**Verifica:**

- SEO on-page (title, metaDescription, frontmatter)
- Technical SEO (sitemap, hreflang, structured data, canonical)
- Content quality (body words, thin content, FAQ count, information gain)
- Humanization (red words, passive voice, FAQ variety, AI patterns, AI detection)
- Bilingual parity (H2/H3, code blocks, frontmatter, diagramas)
- Medios visuales (Mermaid render, SVGs, lightbox, alt text, paridad EN/ES)
- Companion repo (meta.json, files, README, build-catalog)
- GEO (entidades, citas, pasajes extraíbles, structured data IA)
- Validación técnica (7 comandos en orden)
- Móvil (estructural o con navegador)

**Output:** Checklist actualizado en
`ref/audit/reports/{tipo}-{slug}-audit.md` con:

- Score comparativo (antes vs después) en tabla.
- Issues resueltos marcados como ✅ con evidence.
- Issues pendientes marcados como ⚠️ con justificación.
- Items out of scope marcados como 🔧 con razón.
- Regresiones marcadas como 🔄 con CRITICAL.
- Definition of Done actualizada.
- Top 5 acciones pendientes (re-priorizadas).
- Veredicto y recomendación.

**4 estados de issues:**

- ✅ RESUELTO: corregido completamente, con evidence.
- ⚠️ PENDIENTE: no corregido o corregido parcialmente, con justificación.
- 🔧 OUT OF SCOPE: requiere trabajo manual fuera del skill.
- 🔄 REGRESIÓN: problema nuevo introducido por las mejoras (CRITICAL).

**4 veredictos:**

- PROMOTE: listo para publicación (CRITICAL+HIGH resueltos, sin regresiones).
- FIX-THEN-PROMOTE: arreglos menores antes de publicación.
- HOLD: necesita otra ronda de improve-a-resource.
- REWRITE: necesita reescritura mayor (score < 60 o múltiples regresiones).

**Por qué re-auditar:**

- Verificar que los arreglos aplicados resolvieron los issues.
- Detectar nuevos issues introducidos por las ediciones (regresiones).
- Confirmar que no se rompió paridad EN/ES.
- Obtener un score comparativo objetivo.
- Decidir si el recurso está listo para publicación.

## Paso 4 — Resumen y commit

**Prompt:** `ref/summary-a-resource.md` con el mismo número.

**Qué hace:** Cierra el flujo con un resumen completo, commits
separados por naturaleza, y aprobación para push.

**6 fases:**

| Fase | Qué hace |
|---|---|
| 1 — Resolver recurso | Cargar checklist de re-auditoría con veredicto |
| 2 — Inspeccionar git | git status, git diff --stat, git log |
| 3 — Resumen tabular | 10 tablas: frontmatter, contenido, medios, companion, infra, validación, score, IA, pendientes, móvil |
| 4 — Verificación de seguridad | Sin secretos, sin datos sensibles, sin archivos temporales |
| 5 — Commits separados | Por naturaleza: infra, companion, recurso, reportes |
| 6 — Resumen final y push | Aprobación para push, verificación post-deploy |

**Verificación de seguridad antes de commit:**

- No hay secretos ni credenciales en los cambios.
- No hay datos sensibles (emails personales, IPs internas).
- No hay cambios no relacionados con el recurso.
- No hay archivos temporales (.log, .tmp, .bak, node_modules/, dist/).
- .gitignore actualizado si se añadieron nuevos tipos de archivos.

**Commits separados por naturaleza (recomendado):**

1. `feat(media): ...` — infraestructura de Mermaid/SVG/lightbox.
2. `feat(companion): ...` — recursos en stack-practices-resources.
3. `fix(seo): ...` — cambios de metadata, contenido y humanización del recurso.
4. `docs(audit): ...` — cambios a prompts, reportes y documentación del flujo.

**Reglas de commit:**

- Autor: Mathias Paulenko <mathias.paulenko@outlook.com>.
- Sin Co-authored-by de IA ni trailers de atribución.
- Mensajes en inglés (convención del repo).
- Un commit por naturaleza de cambio.
- Aprobación explícita antes de cada commit.
- Aprobación explícita separada antes de push.
- Sin --force, --amend en commits ya pusheados, ni reescritura de history.

**Formato de commits:**

Separar por naturaleza de cambios:

1. `fix(seo): ...` — cambios de metadata y humanización del recurso.
2. `feat(content-improvement): ...` — cambios al skill, prompts
   y reportes.
3. `docs(agents): ...` — cambios a AGENTS.md.
4. `feat(media): ...` — diagramas Mermaid, SVGs, lightbox.
5. `feat(companion): ...` — recursos en stack-practices-resources.

**Sin push sin aprobación explícita del usuario.**

## Cómo usar el flujo

1. Abre `ref/checklist-top-recursos-mejoras.md` y elige un número.
2. Ejecuta el prompt de `ref/audit-a-resource.md` con ese número.
3. Revisa el reporte en
   `ref/audit/reports/{tipo}-{slug}-audit.md`.
4. Ejecuta el prompt de `ref/improve-a-resource.md` con el mismo
   número.
5. El agente aplicará los arreglos, validará y pedirá aprobación.
6. Ejecuta el prompt de `ref/reaudit-a-resource.md` para re-auditar.
7. Revisa el score comparativo, los pendientes y el veredicto.
8. Si el veredicto es HOLD o REWRITE, repite desde el paso 4.
9. Si el veredicto es PROMOTE o FIX-THEN-PROMOTE, ejecuta el prompt
   de `ref/summary-a-resource.md`.
10. El agente generará commits separados, pedirá aprobación para cada
    uno, y luego pedirá aprobación para push.
11. Aprueba los commits y el push (o no).
12. Marca el recurso como completado en
    `ref/checklist-top-recursos-mejoras.md` cambiando `- [ ]` por
    `- [x]` y añadiendo el score final y veredicto, por ejemplo:
    `- [x] **slug** (tipo) — 97.1/100 ✅ PROMOTE`
13. Verifica el deployment en producción.

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

### Prompts orquestadores

| Archivo | Propósito | Fases |
|---|---|---|
| `ref/audit-a-resource.md` | Prompt de auditoría inicial (Paso 1) | 7 fases |
| `ref/improve-a-resource.md` | Prompt de mejora (Paso 2) | 8 fases |
| `ref/reaudit-a-resource.md` | Prompt de re-auditoría (Paso 3) | 9 fases |
| `ref/summary-a-resource.md` | Prompt de resumen y commit (Paso 4) | 6 fases |

### Sub-auditorías

| Archivo | Propósito |
|---|---|
| `ref/audit/00-master-audit.md` | Orquestador de sub-auditorías |
| `ref/audit/01-technical-audit.md` | Sub-auditoría technical SEO |
| `ref/audit/02-seo-audit.md` | Sub-auditoría SEO on-page |
| `ref/audit/03-content-quality-audit.md` | Sub-auditoría calidad |
| `ref/audit/04-humanization-audit.md` | Sub-auditoría humanización e IA |
| `ref/audit/05-bilingual-parity-audit.md` | Sub-auditoría paridad EN/ES |
| `ref/audit/06-geo-audit.md` | Sub-auditoría GEO |
| `ref/audit/07-final-synthesis.md` | Síntesis final |
| `ref/audit/08-gsc-ga4-traffic-audit.md` | Sub-auditoría tráfico |
| `ref/audit/09-companion-media-audit.md` | Sub-auditoría companion + medios visuales |
| `ref/audit/99-site-wide-audit.md` | Auditoría global del sitio |
| `ref/audit/RESOURCE_FULL_AUDIT.md` | Prompt monolítico legacy |

### Skills y reglas

| Archivo | Propósito |
|---|---|
| `.devin/skills/content-improvement/SKILL.md` | Skill con las fases de mejora |
| `src/content/{tipo}/AGENTS.md` | Reglas por tipo de contenido |
| `AGENTS.md` | Reglas generales del proyecto |

### Scripts y herramientas

| Archivo | Propósito |
|---|---|
| `scripts/ai-detect-patterns.py` | Detector de patrones AI por archivo |
| `scripts/ai-detect-content.py` | Detector AI Desklib (EN+ES) |
| `scripts/render-mermaid.mjs` | Renderiza bloques mermaid a SVG estático |
| `public/assets/diagrams/` | SVGs generados por `npm run mermaid:render` |
| `public/lightbox.js` | Click-to-zoom para imágenes y SVGs |
| `src/lib/remark-mermaid-blocks.mjs` | Remark plugin: fenced mermaid → `<img>` |
| `src/styles/global.css` | Estilos para `.mermaid-diagram` y `img[src*="/assets/diagrams/"]` |

### Companion repo

| Archivo | Propósito |
|---|---|
| `../stack-practices-resources/` | Repo hermano con ejemplos descargables |
| `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json` | Metadata del companion |
| `../stack-practices-resources/scripts/build-catalog.js` | Build del catálogo de companions |

### Reportes

| Archivo | Propósito |
|---|---|
| `ref/audit/reports/{tipo}-{slug}-audit.md` | Reporte por recurso (input y output) |
| `ref/audit/reports/site-wide-audit.md` | Reporte global del sitio |
| `ref/output/` | Outputs de AI detection |
