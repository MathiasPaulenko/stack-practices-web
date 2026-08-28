# Checklist de arreglos — recipes/generate-pdf-report-python

## 0. Metadata del recurso

- **Tipo (contentType):** recipes
- **Slug:** generate-pdf-report-python
- **Topic:** data (subcarpeta `src/content/recipes/data/`)
- **Ruta EN:** `src/content/recipes/data/generate-pdf-report-python.md`
- **Ruta ES:** `src/content/recipes/data/generate-pdf-report-python.es.md`
- **URL producción EN:** `https://stackpractices.com/recipes/generate-pdf-report-python/`
- **URL producción ES:** `https://stackpractices.com/es/recipes/generate-pdf-report-python/`
- **Título EN:** Generate PDF Reports in Python: ReportLab & fpdf2 Guide (55 chars)
- **Título ES:** Generar Reportes PDF en Python: Guía de ReportLab y fpdf2 (57 chars)
- **metaDescription EN:** 153 chars
- **metaDescription ES:** 157 chars
- **lastUpdated:** 2026-08-25 (actual)
- **publishedAt:** 2026-07-01
- **difficulty:** intermediate
- **author:** Mathias Paulenko
- **relatedResources:** 6 (sin cambios, dentro del rango 3-6)
- **Companion repo:** NO existe
- **Mermaid diagrams:** 0 EN, 0 ES
- **Build ejecutado:** Sí (3258 páginas)
- **Sitemap:** Incluido (EN y ES)

---

## 1. Scorecard y decisiones

| Dimensión | Score | Máx | Estado |
|-----------|-------|-----|--------|
| 01 Technical SEO | 10 | 10 | ✅ |
| 02 SEO On-Page | 13 | 15 | ⚠️ |
| 03 Content Quality | 15 | 25 | ⚠️ |
| 04 Humanization | 8 | 15 | ⚠️ |
| 05 Bilingual Parity | 8 | 10 | ⚠️ |
| 06 GEO / AI Search | 3 | 5 | ⚠️ |
| 08 Traffic | 6 | 15 | 🔧 NOT VERIFIED |
| 09 Media / Companion | 5 | 15 | ⚠️ |
| **TOTAL** | **68** | **100** | FIX-THEN-PROMOTE |

**Decisión:** **FIX-THEN-PROMOTE** — El recurso es técnicamente correcto y el build pasa, pero tiene gaps significativos: body words por debajo de 1300 en ambos idiomas, 0 enlaces externos, 0 Mermaid, companion ausente, humanización ES ausente, em dashes presentes, y AI detection EN >40%.

---

## 2. Checklist de arreglos

### Critical

Ninguno.

### High

- [ ] **[HIGH] [COMPANION] No existe companion repo**
  - Why: El recurso es 100% Python con ejemplos de fpdf2, ReportLab, pandas, matplotlib, WeasyPrint. Es ideal para un companion repo con scripts ejecutables y sample data.
  - Evidence: `../stack-practices-resources/resources/recipes/data/generate-pdf-report-python/meta.json` no existe.
  - How: Crear `resources/recipes/data/generate-pdf-report-python/` con `meta.json`, `basic_fpdf2.py`, `styled_reportlab.py`, `pdf_from_dataframe.py`, `header_footer.py`, `chart_report.py`, `weasyprint_html.py`, `README.md`, `README.es.md`, `requirements.txt`. Ejecutar `node scripts/build-catalog.js`.
  - Effort: M
  - Source: 09-companion-media-audit

- [ ] **[HIGH] [CONTENT] Sin enlaces externos (0)**
  - Why: 0 enlaces externos en ambos idiomas. Un recurso técnico de Python PDF debe citar documentación oficial de fpdf2, ReportLab, pandas, matplotlib, WeasyPrint.
  - Evidence: EN ext links = 0, ES ext links = 0.
  - How: Añadir 5-7 enlaces externos en nueva sección See Also: fpdf2 docs, ReportLab docs, pandas to_html, matplotlib savefig, WeasyPrint docs.
  - Effort: S
  - Source: 02-seo-audit, 06-geo-audit

- [ ] **[HIGH] [HUMANIZATION] ES primera persona cero (0)**
  - Why: La versión ES no tiene referencias en primera persona. Suena completamente genérica e institucional.
  - Evidence: ES first person = 0. EN first person = 6.
  - How: Reescribir Overview, When to Use, Explanation, Best Practices, Common Mistakes y FAQ con voz personal. Usar "he usado", "prefiero", "me ha paso", "recomiendo".
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[HIGH] [CONTENT] Body words EN bajo el mínimo 1300 (1187)**
  - Why: El cuerpo EN tiene solo 1187 palabras, por debajo del mínimo de 1300.
  - Evidence: EN words = 1187.
  - How: Expandir Explanation con comparación de librerías, casos de uso concretos, consejos de debugging, y secciones When Not to Use / Key Takeaways.
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [CONTENT] Body words ES bajo el mínimo 1300 (1299)**
  - Why: El cuerpo ES tiene 1299 palabras, justo por debajo del mínimo de 1300.
  - Evidence: ES words = 1299.
  - How: Mismo arreglo que EN: expandir Explicación, Cuándo Usar, agregar Cuándo No Usar y Puntos Clave.
  - Effort: M
  - Source: 03-content-quality-audit

### Medium

- [ ] **[MEDIUM] [MEDIA] Sin diagrama Mermaid**
  - Why: El flujo de generación de un reporte PDF (data → pandas → template → PDF) es no-trivial y se beneficia de visualización.
  - Evidence: Mermaid blocks = 0 en ambos idiomas.
  - How: Añadir diagrama `flowchart LR` mostrando: data source → pandas → template/style → render → PDF. SVGs con `npm run mermaid:render`.
  - Effort: S
  - Source: 09-companion-media-audit

- [ ] **[MEDIUM] [HUMANIZATION] EN first person solo 6**
  - Why: 6 es aceptable pero podría ser más alto (10-15) para autoridad personal y equilibrar con ES.
  - Evidence: EN first person = 6.
  - How: Añadir anécdotas personales en Overview, When to Use, Explanation, Best Practices, Common Mistakes y FAQ.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [CONTENT] Sin sección "See Also"**
  - Why: No hay enlaces cruzados externos ni referencias adicionales más allá de relatedResources.
  - Evidence: No `## See Also` / `## Ver También` en H2.
  - How: Añadir `## See Also` con 5-7 enlaces externos + 2 internos.
  - Effort: S
  - Source: 03-content-quality-audit, 06-geo-audit

### Low

- [ ] **[LOW] [HUMANIZATION] Em dashes presentes (2 EN, 2 ES)**
  - Why: El proyecto penaliza em dashes en humanización.
  - Evidence: EN em dashes = 2, ES em dashes = 2.
  - How: Reemplazar em dashes por comas, punto y coma, o dos puntos según contexto.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[LOW] [GEO] Densidad factual alta pero sin citas**
  - Why: Contenido con datos específicos (librerías, parámetros, dependencias) pero sin enlaces externos.
  - Evidence: Datos específicos abundantes, 0 enlaces externos.
  - How: Mismo arreglo que issue HIGH de enlaces externos.
  - Effort: S
  - Source: 06-geo-audit

### Out of scope

- [ ] **[LOW] [TRAFFIC] GSC/GA4 no verificados** 🔧 OUT OF SCOPE
  - Razón: Sin acceso a Google Search Console y Google Analytics 4.
  - Recomendación: Revisar métricas reales una vez disponible el acceso.

- [ ] **[LOW] [MEDIA] Verificación visual móvil no disponible** 🔧 OUT OF SCOPE
  - Razón: Sin acceso a navegador para verificación a 375px.
  - Evidence estructural: viewport meta presente, CSS responsive, lightbox.js presente.
  - Recomendación: Verificar con wavexis/playwright a 375px en sesión separada.

### Regresiones

Ninguna.

---

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos. (No había items CRITICAL)
- [ ] Todos los HIGH resueltos:
  - [ ] Companion repo creado.
  - [ ] Enlaces externos añadidos (0 → 5-7).
  - [ ] Primera persona añadida en ES (0 → 5-8).
  - [ ] Body words EN ≥ 1300.
  - [ ] Body words ES ≥ 1300.
- [ ] Todos los MEDIUM resueltos:
  - [ ] Mermaid diagram añadido.
  - [ ] EN first person aumentado (6 → 10+).
  - [ ] Sección See Also añadida.
- [ ] Todos los LOW resueltos:
  - [ ] Em dashes eliminados.
  - [ ] Citas añadidas.
- [ ] Build pasa sin errores.
- [ ] Companion repo build pasa.
- [ ] Verificación móvil sin overflow. (estructural OK)
- [ ] Paridad EN/ES verificada.

---

## 4. Top 5 acciones prioritarias

1. **Crear companion repo** — Crear `resources/recipes/data/generate-pdf-report-python/` con scripts ejecutables, sample CSV, requirements.txt, READMEs. Effort: M. Prioridad: ALTA.
2. **Expandir contenido EN y ES** — Llevar ambos a 1400+ palabras con Explanation, When Not to Use, Key Takeaways. Effort: M. Prioridad: ALTA.
3. **Añadir enlaces externos y See Also** — Añadir 5-7 enlaces externos (fpdf2, ReportLab, pandas, matplotlib, WeasyPrint). Effort: S. Prioridad: ALTA.
4. **Humanizar ES** — Reescribir con primera persona. Effort: S. Prioridad: ALTA.
5. **Añadir Mermaid diagram** — Diagrama del flujo data → PDF. Effort: S. Prioridad: MEDIA.

---

## 5. Veredicto

El recurso es correcto técnicamente y el build pasa, pero es corto (1187/1299 palabras), sin companion, sin enlaces externos, sin Mermaid, con humanización débil en ES y AI detection EN alto (49.9%). Requiere una ronda completa de mejoras antes de PROMOTE.

---

## 6. Anexos

### Anexo 1 — Scorecard detallado por dimensión

#### 01 Technical SEO: 10/10

| Check | Estado |
|-------|--------|
| Slug kebab-case único | ✅ |
| Sitemap presence | ✅ |
| hreflang en sitemap | ✅ |
| Structured data (TechArticle + FAQPage + BreadcrumbList) | ✅ |
| Internal links con trailing slash | ✅ |
| Canonical self-referencing | ✅ |
| Open Graph | ✅ |
| Paridad técnica EN/ES | ✅ |
| Build pasa sin errores | ✅ (3258 páginas) |
| Lightbox.js presente | ✅ |

Score: 10/10

#### 02 SEO On-Page: 13/15

| Check | Estado |
|-------|--------|
| Title EN ≤60 chars | ✅ (55 chars) |
| Title ES ≤60 chars | ✅ (57 chars) |
| metaDescription EN 50-170 | ✅ (153 chars) |
| metaDescription ES 50-170 | ✅ (157 chars) |
| metaDescription top==seo | ✅ |
| relatedResources 3-6 | ✅ (6) |
| lastUpdated actualizado | ✅ (2026-08-25) |
| Sin H1 manual | ✅ |
| Jerarquía H2→H3 | ✅ |
| Secciones válidas | ✅ |
| Body links internos | ⚠️ solo 1 |
| Em dashes | ⚠️ 2 en cada idioma |

Score: 13/15 (-1 pocos links internos, -1 em dashes)

#### 03 Content Quality: 15/25

| Check | Estado |
|-------|--------|
| Body words EN (mín 1300) | ❌ 1187 |
| Body words ES (mín 1300) | ❌ 1299 |
| Thin content | ⚠️ bajo |
| H2 sections | 8 |
| H3 sections | 11 |
| Code blocks | 5 |
| FAQ items | 6 ✅ |
| Information gain | MEDIUM |
| Riesgo sobre-optimización | NONE |
| Page-worthiness | PROBABLY YES |
| Sección See Also | ❌ ausente |
| External links | ❌ 0 |
| Sección When Not to Use | ❌ ausente |
| Sección Key Takeaways | ❌ ausente |

Score: 15/25 (-3 EN words, -2 ES words, -3 See Also, -2 ext links)

#### 04 Humanization: 8/15

| Check | Estado |
|-------|--------|
| Red words | 0 ✅ |
| Generic phrases | 0 ✅ |
| Em dashes EN | 2 ⚠️ |
| Em dashes ES | 2 ⚠️ |
| En dashes EN | 0 ✅ |
| En dashes ES | 0 ✅ |
| First person EN | 6 ⚠️ |
| First person ES | 0 ❌ |
| pattern_totals EN | {} ✅ |
| pattern_totals ES | {} ✅ |
| AI detection EN | 49.9% ⚠️ |
| AI detection ES | 35.1% ✅ |
| Paridad humanización EN/ES | ❌ (6 vs 0) |

Score: 8/15 (-3 ES first person, -2 EN first person bajo, -2 em dashes)

#### 05 Bilingual Parity: 8/10

| Check | EN | ES | Estado |
|-------|-----|-----|--------|
| H2 count | 8 | 8 | ✅ |
| H3 count | 11 | 11 | ✅ |
| Code blocks | 5 | 5 | ✅ |
| Mermaid | 0 | 0 | ✅ (paridad) |
| Body links | 1 | 1 | ✅ |
| Ext links | 0 | 0 | ✅ (paridad) |
| Frontmatter paridad | PASS | PASS | ✅ |
| First person paridad | 6 vs 0 | — | ❌ |
| Body length | 1187 vs 1299 | — | ⚠️ |
| RelatedResources | 6=6 | — | ✅ |
| Em dashes paridad | 2 vs 2 | — | ✅ |

Score: 8/10 (-2 first person paridad)

#### 06 GEO / AI Search: 3/5

| Check | Estado |
|-------|--------|
| Claridad de entidades | HIGH |
| Densidad factual | MEDIUM-HIGH |
| Citas | INSUFFICIENT (0) |
| Pasajes extraíbles | MEDIUM |
| Structured data IA | OK |
| See Also | NO |

Score: 3/5 (-1 citas insuficientes, -1 no See Also)

#### 08 Traffic: 6/15 (NOT VERIFIED)

| Check | Estado |
|-------|--------|
| GSC impressions | NOT VERIFIED |
| GSC CTR | NOT VERIFIED |
| GSC position | NOT VERIFIED |
| GA4 pageviews | NOT VERIFIED |
| Core Web Vitals | NOT VERIFIED |

Score: 6/15 (NOT VERIFIED, score base)

#### 09 Media / Companion: 5/15

| Check | Estado |
|-------|--------|
| Mermaid EN | ❌ 0 |
| Mermaid ES | ❌ 0 |
| SVGs generados | ❌ 0 |
| Companion repo | ❌ no existe |
| meta.json | ❌ no existe |
| README.md / README.es.md | ❌ no existe |
| viewport meta | ✅ |
| CSS responsive | ✅ |
| Lightbox.js | ✅ |
| Overflow horizontal (375px) | NOT VERIFIED |

Score: 5/15 (-5 sin mermaid, -5 sin companion)

### Anexo 2 — AI Pattern Detection

| Idioma | Total sentences | Findings | pattern_totals |
|--------|-----------------|----------|----------------|
| EN | N/A | 0 | {} |
| ES | N/A | 0 | {} |

Línea base limpia en ambos idiomas. Sin patrones de AI slop detectados.

### Anexo 3 — AI Content Detection

| Idioma | AI% | pattern_totals | Notas |
|--------|-----|----------------|-------|
| EN | 49.9% (25 AI / 23 human / 52 total) | {} | >40% (técnico, código denso) |
| ES | 35.1% (12 AI / 37 human / 100 total) | {} | ✅ <40% |

EN por encima del umbral. pattern_totals vacío en ambos.

### Anexo 4 — Validación técnica

| Comando | Estado | Output |
|---------|--------|--------|
| npm run content:quality | PASS | 0 errors, 0 warnings |
| npm run content:links | PASS | 0 broken, all relatedResources valid |
| npm run content:validate | PASS | 0 errors, 0 warnings |
| npm run check | PASS | 0 errors, 0 warnings, 3 hints |
| npm run build | PASS | 3258 páginas, 148.2s |
| npm run sitemap | PASS | 3256 URLs, 6602 image entries |

### Anexo 5 — Post-build HTML verification

| Check | EN | ES |
|-------|-----|-----|
| H1 presente | ✅ | ✅ |
| Mermaid img | 0 | 0 |
| Raw mermaid en HTML | false | false |
| Lightbox.js | true | true |
| TechArticle | true | true |
| FAQPage | true | true |
| BreadcrumbList | true | true |
| hreflang en/es/x-default | true | true |
| canonical | ✅ | ✅ |
| viewport | true | N/A |
| inLanguage | true | true |
| speakable | true | N/A |
| educationalLevel | true | N/A |
| Sitemap | ✅ | ✅ |

### Anexo 6 — Mediciones actuales

| Métrica | EN | ES |
|---------|-----|-----|
| Body words | 1187 | 1299 |
| H2 sections | 8 | 8 |
| H3 sections | 11 | 11 |
| Code blocks | 5 | 5 |
| Mermaid blocks | 0 | 0 |
| FAQ items | 6 | 6 |
| Body internal links | 1 | 1 |
| External links | 0 | 0 |
| First person | 6 | 0 |
| Em dashes | 2 | 2 |
| En dashes | 0 | 0 |
| Red words | 0 | 0 |
| pattern_totals | {} | {} |

### Anexo 7 — H2 sections (paridad EN/ES)

| EN | ES |
|----|-----|
| Overview | Visión General |
| When to Use | Cuándo Usar |
| Solution | Solución |
| Explanation | Explicación |
| Variants | Variantes |
| Best Practices | Mejores Prácticas |
| Common Mistakes | Errores Comunes |
| FAQ | Preguntas Frecuentes |

### Anexo 8 — relatedResources

| # | Slug | Tipo |
|---|------|------|
| 1 | /recipes/parse-csv-python-pandas | recipes |
| 2 | /recipes/python-excel-read-write | recipes |
| 3 | /recipes/convert-csv-to-json | recipes |
| 4 | /recipes/convert-json-to-csv | recipes |
| 5 | /recipes/python-generate-qr-code | recipes |
| 6 | /recipes/parse-csv-files | recipes |

Todos validados por `content:links` (0 broken).
