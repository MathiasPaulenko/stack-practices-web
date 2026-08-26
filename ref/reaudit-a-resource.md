# Mini prompt — Re-auditar recurso tras mejoras

> StackPractices.com
> Copia y pega este prompt AFTER ejecutar `ref/improve-a-resource.md`.
> El agente re-auditará el recurso mejorado, comparará con el score
> anterior y actualizará el checklist en
> `ref/audit/reports/{tipo}-{slug}-audit.md`.
>
> NO es una auditoría completa de 7 sub-auditorías. Es una verificación
> focalizada de que las mejoras funcionaron y los números mejoraron.
>
> Flujo completo: `ref/flujo-mejoras-contenido.md`

---

## Prompt

```text
Re-audita el recurso número {N} de ref/checklist-top-recursos-mejoras.md
tras la ronda de mejoras.

Instrucciones:

1. Lee ref/checklist-top-recursos-mejoras.md y extrae el slug y tipo del
   recurso {N}.
2. Lee el checklist de auditoría existente en:
   ref/audit/reports/{tipo}-{slug}-audit.md
   Este contiene el score anterior y los issues identificados.
3. Lee los archivos EN y ES del recurso (ya mejorados):
   - src/content/{tipo}/{topic}/{slug}.md
   - src/content/{tipo}/{topic}/{slug}.es.md
4. Lee los AGENTS.md que aplican:
   - AGENTS.md (raíz)
   - src/content/{tipo}/AGENTS.md

Verifica los siguientes puntos y reporta score ANTES vs DESPUÉS:

## 1. SEO On-Page (X/15)

- title EN ≤ 60 chars: [medir]
- title ES ≤ 60 chars: [medir]
- metaDescription EN 50-160 chars: [medir]
- metaDescription ES 50-160 chars: [medir]
- metaDescription top-level == seo.metaDescription (ambos): [verificar]
- relatedResources 3-6 slugs, mismo orden EN/ES: [verificar]
- lastUpdated actualizado: [verificar]
- Sin H1 manual en el body: [verificar]
- Secciones válidas (What Works, Troubleshooting, See Also, Further
  Reading): [verificar]

## 2. Technical SEO (X/10)

- Slug kebab-case único: [verificar]
- Sitemap presence (public/sitemap.xml): [verificar]
- hreflang en sitemap: [verificar]
- Structured data (TechArticle + FAQPage + BreadcrumbList): [verificar]
- Internal links con trailing slash: [verificar]
- EN/ES technical parity (H2 count, H3 count, code blocks): [verificar]

## 3. Content Quality (X/25)

- Body words EN: [medir] (mínimo recipes 1.300, patterns 1.500,
  guides 3.000, docs 3.000)
- Body words ES: [medir]
- Thin content: YES/NO (justificar)
- Information gain: LOW/MEDIUM/HIGH
- Over-optimization risk: LOW/MEDIUM/HIGH
- FAQ count: [medir] (mínimo 3-5, sin máximo)
- Duplicación/canibalización: YES/NO

## 4. Humanization (X/15)

- Red words (delve, leverage, robust, seamless, etc.): [contar]
- Generic phrases ("This guide covers", "In today's", "In conclusion"):
  [contar]
- Sentence-ending code tokens restantes: [contar EN y ES]
- Passive voice: [contar EN y ES]
- Rule-of-three patterns evidentes: [contar]
- Em dash overuse: [contar]
- FAQ variety: % de preguntas que NO empiezan con "How do I" / "¿Cómo"
- First-person parity EN/ES: [verificar]

## 5. Bilingual Parity (X/10)

- H2 count EN vs ES: [medir]
- H3 count EN vs ES: [medir]
- Code blocks EN vs ES: [medir]
- Frontmatter parity (title, metaDescription, keywords, relatedResources,
  lastUpdated): [verificar]
- First-person parity: [verificar]

## 6. Mermaid + Visual Assets (X/5)

- Número de bloques Mermaid EN: [contar]
- Número de bloques Mermaid ES: [contar]
- Paridad Mermaid EN/ES: YES/NO
- Si hay Mermaid, verificar en dist/ que se renderiza como
  `<div class="mermaid">`: [verificar tras build]
- `/mermaid-init.js` presente en HTML: [verificar]
- Imágenes/SVG: [contar]
- Alt text en imágenes (si hay): [verificar]

## 7. Companion Repo (X/3)

- Existe `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json`:
  YES/NO
- Si existe, meta.json tiene campos requeridos (title, title_es,
  description, description_es, type, topic, slug, source_urls, language,
  tags, files): [verificar]
- Archivos en `files` existen: [verificar]
- `node scripts/build-catalog.js` pasa en repo hermano: [verificar]

## 8. Validación técnica

Ejecuta en orden y para en el primer fallo:

- npm run content:quality: [PASS/FAIL]
- npm run content:links: [PASS/FAIL]
- npm run content:validate: [PASS/FAIL]
- npm run check: [PASS/FAIL]
- npm run build: [PASS/FAIL] (número de páginas)
- npm run sitemap: [PASS/FAIL] (número de URLs)

## 9. Score comparativo

Reporta una tabla con:

| Dimensión | Antes | Después | Cambio |
|---|---|---|---|
| Technical SEO | X/10 | X/10 | +/- |
| On-Page SEO | X/15 | X/15 | +/- |
| Content Quality | X/25 | X/25 | +/- |
| Humanization | X/15 | X/15 | +/- |
| Bilingual Parity | X/10 | X/10 | +/- |
| Mermaid + Visual | X/5 | X/5 | +/- |
| Companion Repo | X/3 | X/3 | +/- |
| **OVERALL** | **X/100** | **X/100** | **+/-** |

## 10. Issues resueltos vs pendientes

Lista los issues del checklist anterior marcados como:
- ✅ RESUELTO (con evidence de qué cambió)
- ⚠️ PENDIENTE (con justificación de por qué no se resolvió)
- 🔧 OUT OF SCOPE (con razón)

## 11. Actualización del checklist

Sobrescribe `ref/audit/reports/{tipo}-{slug}-audit.md` con:
- Score comparativo (antes vs después)
- Issues resueltos marcados como ✅
- Issues pendientes con estado
- Definition of Done actualizada
- Top 5 acciones pendientes

Reglas críticas:
- No edites los archivos del recurso. Solo auditas y escribes el checklist.
- Usa los AGENTS.md como fuente de verdad.
- Distingue FACT / OBSERVATION / RECOMMENDATION / NOT VERIFIED.
- No inventes métricas. Mide desde el código local.
- Si un issue del checklist anterior ya estaba resuelto, márcalo como ✅.
- Si un issue persiste, márcalo como ⚠️ PENDIENTE con evidence.
- No necesitas ejecutar las 7 sub-auditorías completas. Solo verifica
  los puntos de arriba y compara con el score anterior.
```

---

## Uso

Reemplaza `{N}` con el número del recurso (ej: `1`). El `{tipo}` y
`{slug}` se infieren automáticamente del checklist.

### Requisito previo

El recurso debe tener:

1. Un checklist de auditoría en
   `ref/audit/reports/{tipo}-{slug}-audit.md` (con score anterior).
2. Una ronda de mejoras aplicada con `ref/improve-a-resource.md`.

### Ejemplo

```text
Re-audita el recurso número 1 de ref/checklist-top-recursos-mejoras.md
tras la ronda de mejoras.
```

El agente medirá los puntos clave, comparará con el score anterior,
y actualizará el checklist con el score comparativo y los issues
resueltos/pendientes.
