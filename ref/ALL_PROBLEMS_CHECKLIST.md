# ALL_PROBLEMS_CHECKLIST.md

Checklist consolidada de problemas detectados en `ref/`. Actualizada el 2026-08-22.

## 1. Métricas globales del sitio

| Métrica | Valor | Fuente |
| --- | --- | --- |
| Páginas en dist | 3258 | build reciente |
| Markdown files | 2042 | conteo reciente |
| URLs en sitemap | 3254 | sitemap reciente |
| Build HTML total | 131.8 MB | ref/audit-summary.md |
| Build JS size | 449.8 KB | ref/audit-summary.md |
| Build CSS size | 179.3 KB | ref/audit-summary.md |
| Build image size | 253.6 KB | ref/audit-summary.md |
| Archivos en ref/output | 211 (37 .md / 174 .json) | conteo reciente |

## 2. Problemas técnicos / SEO

### 2.1 Issues resueltos

| Issue | Count | Estado |
| --- | --- | --- |
| inDistNotSitemap | 4 | ✅ Resuelto — son páginas `noindex` (404, search) correctamente excluidas |
| canonicalMismatch | 1 | ✅ Resuelto — hreflang eliminados de las páginas 404 |
| bidirectional link gaps | 24 | ✅ Resuelto — 42 body links añadidos en 26 archivos |
| pagesWithLowIncomingLinks | 8 | ✅ Resuelto — 48 incoming links añadidos desde same-topic resources |
| low body links (docs) | 30+ | ✅ Resuelto — 180 body links añadidos en 60 archivos (30 docs EN+ES) |
| broken body links | 118 | ✅ Resuelto — 60 links patrón `/tipo/topic/slug` + 58 links con slugs renombrados |

### 2.2 Pendiente

- [ ] **Thin content**: 1.784 archivos por debajo de los nuevos targets (recipes 1.300, patterns 1.500, guides 3.000, docs 3.000). Se abordará recurso por recurso en el workflow de mejora de contenido, no en batch.

## 3. Roadmap de contenido pendiente

- [ ] Batch 3 pending recipes: 50
- [ ] Batch 3 pending patterns: 40
- [ ] Batch 3 pending guides: 35
- [ ] Batch 3 pending docs: 25
  - Fuente: `ref/content-roadmap.md`

## 4. Artefactos de auditoría por recurso (ref/output)

- [ ] Revisar/clean 211 archivos en `ref/output/` (37 .md, 174 .json).
- [ ] Priorizar los reports de `api-documentation-openapi` (12 reports en `ref/output/`) dado que tiene la mayor impresión en GSC pero CTR bajo.
- [ ] Revisar periódicamente `content-quality-audit-*.md`, `seo-audit-*.md` e `improvement-pipeline-*.md` y convertir hallazgos en acciones.

## 5. Observaciones GA4 / GSC recientes

- [ ] GSC: CTR bajó del 0,50 % al 0,31 % a pesar de +253 % impresiones; posición media empeoró de 27,2 a 32,7.
- [ ] `/recipes/api-documentation-openapi/` tiene 1.166 impresiones y solo 2 clics (CTR 0,17 %); posición cayó a ~55-65 en agosto.
- [ ] `/recipes/optimistic-locking/` es la página con más clics (3) y subió +265 impresiones vs el período anterior.
- [ ] GA4: solo 41 sesiones, 68 pageviews, 13 usuarios activos en 28 días; tráfico todavía residual.
