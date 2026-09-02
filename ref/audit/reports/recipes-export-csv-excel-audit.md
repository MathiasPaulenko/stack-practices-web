# Checklist de arreglos — recipes/export-csv-excel

> Auditoría MODE=full
> Fecha: 2026-09-03
> Recurso #36 en `ref/checklist-top-recursos-mejoras.md`
> Score: 59/88 — FIX-THEN-PROMOTE

---

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `export-csv-excel` |
| Topic | `file-handling` |
| Ruta EN | `src/content/recipes/file-handling/export-csv-excel.md` |
| Ruta ES | `src/content/recipes/file-handling/export-csv-excel.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/export-csv-excel/` |
| URL producción ES | `https://stackpractices.com/es/recipes/export-csv-excel/` |
| Título EN | `Export Data to CSV and Excel Files` (34 chars) ✅ |
| Título ES | `Exportar Datos a CSV y Excel` (28 chars) ✅ |
| `description` EN | 65 chars ✅ |
| `description` ES | 76 chars ✅ |
| `metaDescription` EN | 137 chars ✅ (coincide con `seo.metaDescription`) |
| `metaDescription` ES | 134 chars ✅ (coincide con `seo.metaDescription`) |
| `lastUpdated` | `2026-08-19` (EN y ES) |
| `publishedAt` | `2026-06-11` |
| `estimatedReadTime` | ausente en ambos ⚠️ |
| `relatedResources` EN/ES | 6 slugs, mismo orden, todos válidos ✅ |
| Palabras body EN | 771 (sin bloques de código) ⚠️ THIN CONTENT |
| Palabras body ES | 766 (sin bloques de código) ⚠️ THIN CONTENT |
| H2 EN/ES | 8 / 8, mismo orden ✅ |
| H3 EN/ES | 10 / 10 ✅ |
| Bloques de código EN/ES | 5 / 5 ✅ |
| FAQ items EN/ES | 6 / 6 ✅ |
| Enlaces internos en body EN/ES | 0 / 0 ⚠️ |
| Enlaces externos en body EN/ES | 0 / 0 ⚠️ |
| Mermaid / imágenes EN/ES | 0 / 0 ⚠️ |
| Companion repo | **MISSING** ⚠️ |
| Enlace companion en body | False / False ⚠️ |
| See Also EN/ES | 0 / 0 ⚠️ |
| Keywords EN | 10 (excede máximo de 8) ⚠️ |
| Keywords ES | 5 ✅ |
| AI detect patterns EN | 0 findings ✅ |
| AI detect patterns ES | 0 findings ✅ |
| Em dashes EN/ES | 0 / 0 ✅ |
| Primera persona EN/ES | 5 / 8 ✅ |
| Red words | 0 ✅ |
| Anglicismos ES | 0 ✅ |
| Oración definitoria "X es Y" | ausente ⚠️ |
| Build | `npm run build` 3,260 páginas, exit 0 ✅ |
| Post-build HTML | H1, TechArticle, FAQPage, WebPage, BreadcrumbList, mainEntityOfPage, hreflang (3), viewport, speakable, canonical, OG tags ✅ EN+ES |

---

## 1. Scorecard y decisiones

| Dimensión | Score | Máx | Motivo |
|-----------|-------|-----|--------|
| SEO On-Page | 11 | 15 | Frontmatter OK, pero 0 internal links, 0 external links, sin estimatedReadTime, keywords EN excede 8 |
| SEO Técnico | 9 | 10 | Structured data, canonical, hreflang, sitemap OK |
| Calidad Contenido | 14 | 25 | Thin content (771/766 palabras), sin métricas comparativas adicionales |
| Humanización | 13 | 15 | 0 AI patterns, 0 red words, primera persona presente (EN 5, ES 8) |
| Paridad Bilingüe | 8 | 10 | H2/H3/code/FAQ paridad OK, pero keywords asimétricos (EN 10 vs ES 5) |
| Medios Visuales | 1 | 5 | Sin Mermaid, sin SVGs |
| Companion Repo | 0 | 3 | No existe companion repo |
| GEO / AI Search | 3 | 5 | FAQ 6/6 OK, speakable OK, sin oración definitoria, sin enlaces externos |
| **TOTAL** | **59** | **88** | **FIX-THEN-PROMOTE** |

**Decisión:** FIX-THEN-PROMOTE — hay 2 CRITICAL (thin content, companion missing) y 3 HIGH (sin enlaces internos, sin enlaces externos, sin diagrama Mermaid) que deben resolverse antes de publicar.

---

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [CONTENT] Thin content — body de 771/766 palabras**
  - Why: Las recipes de StackPractices típicamente tienen 1,000-1,500 palabras de body. 771 palabras es insuficiente para information gain y para rankear en SERP competitiva de export CSV/Excel.
  - Evidence: `export-csv-excel.md` body word count = 771, `export-csv-excel.es.md` = 766.
  - How: Añadir secciones de contenido práctico: (1) ejemplo de streaming CSV con Express.js y PostgreSQL cursor, (2) ejemplo de Apache POI SXSSF con sliding window, (3) ejemplo de CSV injection sanitization en los tres lenguajes, (4) benchmark comparativo de librerías, (5) ejemplo de export con templates Excel (formatting condicional). Añadir ~400-600 palabras en EN y ES manteniendo paridad.
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[CRITICAL] [COMPANION] Companion repo no existe**
  - Why: El AGENTS.md de recipes recomienda companion repo para ejemplos multi-file. Este recurso tiene ejemplos en 3 lenguajes (Python, JS, Java) ideales para un companion runnable.
  - Evidence: `D:\Codigo\stack-practices-resources\resources\recipes\file-handling\export-csv-excel\` no existe.
  - How: Crear companion con `meta.json`, `export_csv.py` (pandas + streaming), `export_excel.js` (fast-csv + xlsx), `ExportExcel.java` (Apache POI), `requirements.txt`, `package.json`, `pom.xml`, `README.md` y `README.es.md`. Verificar con `node scripts/build-catalog.js`.
  - Effort: M
  - Source: 09-companion-media-audit

### High

- [ ] **[HIGH] [SEO] 0 enlaces internos en body EN/ES**
  - Why: El AGENTS.md de recipes exige 2-3 enlaces internos contextuales en el body. 0 enlaces debilita el link graph interno.
  - Evidence: `export-csv-excel.md` internal links = 0, `export-csv-excel.es.md` = 0.
  - How: Añadir 3-4 enlaces internos contextuales: (1) `/recipes/import-csv-excel/` en mención de "import", (2) `/recipes/parse-csv-files/` en mención de "CSV parsing", (3) `/recipes/read-write-file/` en mención de "file handles", (4) `/recipes/stream-processing/` en mención de "streaming". Mantener paridad EN/ES.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [SEO] 0 enlaces externos a docs oficiales**
  - Why: Sin enlaces a docs oficiales reduces E-E-A-T. Los recursos bien rankeados enlazan a fuentes autoritativas.
  - Evidence: `export-csv-excel.md` external links = 0, `export-csv-excel.es.md` = 0.
  - How: Añadir 4-6 enlaces externos: (1) pandas `to_csv` docs, (2) fast-csv npm, (3) Apache POI docs, (4) Apache Commons CSV docs, (5) OWASP CSV injection guide, (6) MDN Content-Disposition. Mantener paridad EN/ES.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [MEDIA] Sin diagrama Mermaid de flujo de exportación**
  - Why: Un diagrama de flujo mostrando in-memory vs streaming approach mejoraría la comprensión del trade-off central.
  - Evidence: `export-csv-excel.md` mermaid blocks = 0, `export-csv-excel.es.md` = 0.
  - How: Añadir un diagrama Mermaid `flowchart LR` en la sección "Explanation" que muestre: DB → Cursor → Streaming Writer → File (streaming path) vs DB → Load All → DataFrame → File (in-memory path). Añadir `%% alt:` en EN+ES. Regenerar SVGs.
  - Effort: S
  - Source: 09-companion-media-audit

### Medium

- [ ] **[MEDIUM] [SEO] `estimatedReadTime` ausente en EN y ES**
  - Why: El AGENTS.md de recipes recomienda `estimatedReadTime` para UX.
  - Evidence: Frontmatter EN y ES sin campo `estimatedReadTime`.
  - How: Añadir `estimatedReadTime: 4` en EN y ES (771 palabras / 200 wpm ≈ 4 min).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [SEO] Keywords EN excede máximo (10 vs 8)**
  - Why: El AGENTS.md de recipes especifica 3-8 keywords. EN tiene 10.
  - Evidence: `export-csv-excel.md` `seo.keywords` tiene 10 entradas.
  - How: Reducir a 8 keywords más relevantes: `csv`, `excel`, `export`, `pandas`, `xlsx`, `streaming`, `apache poi`, `fast-csv`. Eliminar `data`, `python`, `javascript`, `java` (redundantes con tags).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [BILINGUAL] Keywords asimétricos EN (10) vs ES (5)**
  - Why: EN tiene 10 keywords, ES tiene 5. Falta paridad.
  - Evidence: EN keywords = 10, ES keywords = 5.
  - How: Alinear ambos a 8 keywords. EN: reducir a 8. ES: añadir 3 keywords (`csv`, `excel`, `exportar`) para llegar a 8.
  - Effort: S
  - Source: 05-bilingual-parity-audit

- [ ] **[MEDIUM] [GEO] Falta oración definitoria "X es Y" al inicio**
  - Why: Para GEO/AI citations, una oración definitoria clara al inicio del Overview mejora la extractabilidad.
  - Evidence: `export-csv-excel.md` Overview comienza con "Exporting to CSV or Excel is something almost every admin dashboard..." sin definir qué es exportar a CSV/Excel.
  - How: Añadir al inicio del Overview: "CSV and Excel export is the process of converting structured data into spreadsheet-compatible file formats for download, sharing, or analysis." / "La exportación a CSV y Excel es el proceso de convertir datos estructurados en formatos de archivo compatibles con hojas de cálculo para descarga, compartir o analizar."
  - Effort: S
  - Source: 06-geo-audit

- [ ] **[MEDIUM] [CONTENT] Sin sección "See Also" / "Further Reading"**
  - Why: El AGENTS.md permite `## See Also` para cross-references adicionales.
  - Evidence: `export-csv-excel.md` See Also = 0.
  - How: Añadir `## See Also` / `## Ver También` con 3-5 enlaces: pandas docs, Apache POI docs, OWASP CSV injection, RFC 4180 (CSV format), MDN Content-Disposition.
  - Effort: S
  - Source: 03-content-quality-audit

### Low

- [ ] **[LOW] [BILINGUAL] `relatedResources` bidireccionalidad 3/6**
  - Why: Solo 3 de 6 relatedResources enlazan de vuelta (read-write-file, import-csv-excel, file-upload-validation). Faltan 3 (parse-csv-files, background-jobs, stream-processing).
  - Evidence: `grep -r "export-csv-excel" src/content/recipes/` muestra 3/6 relatedResources recíprocos.
  - How: Añadir `/recipes/export-csv-excel` a los `relatedResources` de `parse-csv-files.md`, `background-jobs.md`, `stream-processing.md` (y sus versiones ES).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[LOW] [SEO] `lastUpdated` stale (2026-08-19)**
  - Why: La fecha está desactualizada respecto a la fecha actual de auditoría.
  - Evidence: Frontmatter `lastUpdated: "2026-08-19"`.
  - How: Actualizar a `2026-09-03` tras aplicar mejoras.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[LOW] [CONTENT] Sin ejemplo de CSV injection sanitization en código**
  - Why: Best Practices menciona sanitization de `=`, `+`, `-`, `@` pero no hay ejemplo de código.
  - Evidence: `export-csv-excel.md` Best Practices línea 200-201.
  - How: Añadir función `sanitize_csv_cell()` en Python, JS y Java en la sección "Solution" o "Best Practices".
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[LOW] [CONTENT] Sin ejemplo de Apache POI SXSSF**
  - Why: Variants menciona SXSSF pero no hay ejemplo de código del sliding window.
  - Evidence: `export-csv-excel.md` Variants tabla línea 191.
  - How: Añadir ejemplo breve de SXSSFWorkbook con window size en la sección "Solution" o "Variants".
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[LOW] [CONTENT] Sin ejemplo de Express.js streaming endpoint completo**
  - Why: El ejemplo JS muestra `streamCsv` pero no un endpoint Express completo con manejo de errores.
  - Evidence: `export-csv-excel.md` línea 116-121.
  - How: Añadir ejemplo de Express route con error handling y abort signal.
  - Effort: S
  - Source: 03-content-quality-audit

---

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos (thin content + companion repo)
- [ ] Todos los HIGH resueltos (internal links + external links + Mermaid)
- [ ] Build pasa sin errores
- [ ] Companion repo build pasa
- [ ] Verificación móvil sin overflow
- [ ] Paridad EN/ES verificada (incluyendo keywords 8=8)
- [ ] `npm run content:quality` PASS
- [ ] `npm run content:links` PASS
- [ ] `npm run content:validate` PASS
- [ ] `npm run check` PASS
- [ ] `npm run mermaid:render` PASS
- [ ] `npm run build` PASS
- [ ] `npm run sitemap` PASS
- [ ] Post-build HTML checks PASS EN+ES
- [ ] Sin regresiones

---

## 4. Top 5 acciones

1. **[CRITICAL] Añadir ~500 palabras de contenido práctico** — SXSSF sliding window, CSV injection sanitization en 3 lenguajes, Express endpoint completo, benchmark comparativo. Mantener paridad EN/ES. Esfuerzo: M.
2. **[CRITICAL] Crear companion repo** — `export_csv.py`, `export_excel.js`, `ExportExcel.java`, `requirements.txt`, `package.json`, `pom.xml`, `README.md`+`README.es.md`, `meta.json`. Esfuerzo: M.
3. **[HIGH] Añadir 3-4 enlaces internos contextuales** — import-csv-excel, parse-csv-files, read-write-file, stream-processing. Esfuerzo: S.
4. **[HIGH] Añadir 4-6 enlaces externos a docs oficiales** — pandas, fast-csv, Apache POI, Apache Commons CSV, OWASP CSV injection, MDN Content-Disposition. Esfuerzo: S.
5. **[HIGH] Añadir diagrama Mermaid de flujo in-memory vs streaming** — `flowchart LR` mostrando ambos paths. Regenerar SVGs. Esfuerzo: S.

---

## 5. Veredicto

El recurso tiene base técnica sólida (0 AI patterns, paridad estructural EN/ES, structured data OK, primera persona presente) pero sufre de thin content (771 palabras), falta de companion repo, ausencia total de enlaces internos/externos y diagramas, y asimetría de keywords. Debe resolver 2 CRITICAL y 3 HIGH antes de publicar.

**FIX-THEN-PROMOTE** — resolver thin content, companion, enlaces, keywords y Mermaid antes de publicar.

---

## 6. Anexos

### 6.1 Sub-auditorías resumidas

| # | Sub-auditoría | Hallazgos clave |
|---|---------------|-----------------|
| 1 | Technical | Structured data OK, canonical OK, hreflang OK, sitemap OK, build PASS |
| 2 | SEO | Frontmatter OK, 0 internal links, 0 external links, sin estimatedReadTime, keywords EN 10 (excede 8) |
| 3 | Content Quality | Thin content 771/766 palabras, sin ejemplos avanzados (SXSSF, sanitization, Express completo) |
| 4 | Humanization | 0 AI patterns, 0 red words, primera persona presente (EN 5, ES 8) |
| 5 | Bilingual Parity | H2/H3/code/FAQ paridad OK, keywords asimétricos (EN 10 vs ES 5) |
| 6 | GEO | FAQ 6/6 OK, speakable OK, sin oración definitoria, sin enlaces externos |
| 7 | Traffic | NOT VERIFIED (sin acceso a GSC/GA4) |
| 8 | Companion/Media | Companion MISSING, sin Mermaid, sin SVGs |

### 6.2 AI Detection outputs

| Métrica | EN | ES |
|---------|----|----|
| Patterns | 0 findings ✅ | 0 findings ✅ |
| Desklib | NOT VERIFIED | NOT VERIFIED |

- `ref/output/ai-detect-patterns-export-csv-excel.json` — EN: 0 findings
- `ref/output/ai-detect-patterns-export-csv-excel-es.json` — ES: 0 findings

### 6.3 Post-build HTML checks

| Check | EN | ES |
|-------|----|----|
| H1 | ✅ | ✅ |
| TechArticle | ✅ | ✅ |
| FAQPage | ✅ | ✅ |
| WebPage | ✅ | ✅ |
| BreadcrumbList | ✅ | ✅ |
| mainEntityOfPage | ✅ | ✅ |
| hreflang (3) | ✅ | ✅ |
| viewport | ✅ | ✅ |
| speakable | ✅ | ✅ |
| canonical | ✅ | ✅ |
| OG tags | ✅ | ✅ |
| mermaid-diagram | 0 (sin diagrama) | 0 (sin diagrama) |
| companion link | 0 (sin companion) | 0 (sin companion) |
| H2 count | 13 | 13 |
| H3 count | 10 | 10 |

### 6.4 Verificación móvil

| Check | Estado |
|-------|--------|
| <meta name="viewport"> | ✅ |
| Overflow horizontal (375px) | NOT VERIFIED (sin acceso a navegador) |
| Diagramas max-width: 100% | N/A (sin diagramas) |
| Click-to-zoom (lightbox) | N/A (sin diagramas) |
| Screenshot visual | NOT VERIFIED |

### 6.5 Companion repo

| Check | Estado |
|-------|--------|
| Directorio existe | ❌ MISSING |
| meta.json válido | ❌ N/A |
| Archivos esperados | ❌ N/A |
| build-catalog.js | NOT VERIFIED (sin companion) |

### 6.6 Related resources bidireccionalidad

| Recurso relacionado | Recíproco | Estado |
|---------------------|-----------|--------|
| import-csv-excel | ✅ | OK |
| parse-csv-files | ❌ | Pendiente |
| file-upload-validation | ✅ | OK |
| background-jobs | ❌ | Pendiente |
| stream-processing | ❌ | Pendiente |
| read-write-file | ✅ | OK |

### 6.7 Keywords parity

| Idioma | Count | Keywords |
|--------|-------|----------|
| EN | 10 ⚠️ | csv, excel, export, data, pandas, xlsx, streaming, python, javascript, java |
| ES | 5 ✅ | exportar csv excel python, pandas csv tutorial, apache poi java excel, streaming csv javascript, exportar datos grandes |

EN excede máximo de 8. ES tiene 5. Falta paridad.
