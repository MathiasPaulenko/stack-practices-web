# Checklist de arreglos — recipes/url-encoding

## 0. Metadata del recurso

- **Tipo (contentType):** recipes
- **Slug:** url-encoding
- **Topic:** data (subcarpeta `src/content/recipes/data/`)
- **Ruta EN:** `src/content/recipes/data/url-encoding.md`
- **Ruta ES:** `src/content/recipes/data/url-encoding.es.md`
- **URL producción EN:** `https://stackpractices.com/recipes/url-encoding/`
- **URL producción ES:** `https://stackpractices.com/es/recipes/url-encoding/`
- **Título EN:** URL Encoding (12 chars)
- **Título ES:** Codificacion de URLs (20 chars)
- **metaDescription EN:** 153 chars
- **metaDescription ES:** 123 chars
- **lastUpdated:** 2026-08-18 (stale)
- **publishedAt:** 2026-06-10
- **difficulty:** beginner
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
| 02 SEO On-Page | 14 | 15 | ⚠️ |
| 03 Content Quality | 17 | 25 | ⚠️ |
| 04 Humanization | 10 | 15 | ⚠️ |
| 05 Bilingual Parity | 8 | 10 | ⚠️ |
| 06 GEO / AI Search | 3 | 5 | ⚠️ |
| 08 Traffic | 6 | 15 | 🔧 NOT VERIFIED |
| 09 Media / Companion | 6 | 15 | ⚠️ |
| **TOTAL** | **74** | **100** | FIX-THEN-PROMOTE |

**Decisión:** **FIX-THEN-PROMOTE** — El recurso tiene base sólida (build pasa, SEO técnico perfecto, structured data completa, 6 FAQ items, 5 body links) pero necesita companion repo, enlaces externos, humanización ES, secciones faltantes, expansión de contenido y diagrama Mermaid antes de promocionar.

---

## 2. Checklist de arreglos

### Critical

Ninguno.

### High

- [ ] **[HIGH] [COMPANION] No existe companion repo**
  - Why: El recurso tiene 3 bloques de código multi-lenguaje (Python, JavaScript, Java) con ejemplos ejecutables ideales para un companion repo.
  - Evidence: `../stack-practices-resources/resources/recipes/data/url-encoding/meta.json` no existe.
  - How: Crear `resources/recipes/data/url-encoding/` con `meta.json`, `url_encoding.py`, `url_encoding.js`, `UrlEncoding.java`, `README.md`, `README.es.md`. Ejecutar `node scripts/build-catalog.js`.
  - Effort: M
  - Source: 09-companion-media-audit

- [ ] **[HIGH] [CONTENT] Sin enlaces externos (0)**
  - Why: 0 enlaces externos en ambos idiomas. Recursos técnicos deben enlazar documentación oficial (RFC 3986, MDN, Python urllib, Java URLEncoder).
  - Evidence: EN ext links = 0, ES ext links = 0.
  - How: Añadir 6-8 enlaces externos en See Also y body: RFC 3986 (https://datatracker.ietf.org/doc/html/rfc3986), MDN encodeURIComponent (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent), Python urllib (https://docs.python.org/3/library/urllib.parse.html), Java URLEncoder (https://docs.oracle.com/javase/8/docs/api/java/net/URLEncoder.html), WHATWG URL spec (https://url.spec.whatwg.org/).
  - Effort: S
  - Source: 02-seo-audit, 06-geo-audit

- [ ] **[HIGH] [HUMANIZATION] ES primera persona cero (0 ocurrencias)**
  - Why: La versión ES no tiene ninguna referencia en primera persona. El contenido suena genérico e institucional.
  - Evidence: ES first person = 0. EN first person = 4.
  - How: Añadir primera persona en Mejores Prácticas, Errores Comunes, Explicación, FAQ y Puntos Clave. Usar "he visto", "me ha pasado", "uso", "recomiendo".
  - Effort: S
  - Source: 04-humanization-audit

### Medium

- [ ] **[MEDIUM] [CONTENT] Body words EN por debajo del mínimo 1300**
  - Why: EN 1150 palabras, por debajo del mínimo del workflow de 1300. ES 1171 también por debajo.
  - Evidence: EN words = 1150, ES words = 1171.
  - How: Expandir con sección "When Not to Use" (~150 palabras), "Key Takeaways" (~100 palabras), "See Also" (~50 palabras). Esto llevará EN a ~1450 palabras.
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [CONTENT] Sin sección "When Not to Use"**
  - Why: No hay guía sobre cuándo NO usar URL encoding o cuándo preferir alternativas.
  - Evidence: H2 sections = 8 (Overview, When to Use, Solution, Explanation, Variants, Best Practices, Common Mistakes, FAQ). No "When Not to Use".
  - How: Añadir `## When Not to Use` con 4-5 casos: URLs already encoded, base64 in path segments, IDN domains, static URLs without user input, URLs in HTML attributes.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [CONTENT] Sin sección "Key Takeaways"**
  - Why: No hay resumen de puntos clave al final del artículo.
  - Evidence: No `## Key Takeaways` / `## Puntos Clave` en H2.
  - How: Añadir `## Key Takeaways` con 5 puntos accionables: always encode user input, use encodeURIComponent not encodeURI, + vs %20, avoid double-encoding, use URLSearchParams.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [CONTENT] Sin sección "See Also"**
  - Why: No hay enlaces cruzados externos ni referencias adicionales más allá de relatedResources.
  - Evidence: No `## See Also` / `## Ver También` en H2.
  - How: Añadir `## See Also` con 6-8 enlaces: RFC 3986, MDN encodeURIComponent, Python urllib, Java URLEncoder, WHATWG URL, Input Validation recipe, Regular Expressions recipe.
  - Effort: S
  - Source: 03-content-quality-audit, 06-geo-audit

- [ ] **[MEDIUM] [MEDIA] Sin diagrama Mermaid**
  - Why: El flujo de URL encoding (user input → encode → URL → server → decode → original value) es no-trivial y se beneficia de visualización.
  - Evidence: Mermaid blocks = 0 en ambos idiomas.
  - How: Añadir diagrama `flowchart LR` mostrando: User Input → Encode (quote/encodeURIComponent/URLEncoder) → URL with %XX → Server → Decode (unquote/decodeURIComponent/URLDecoder) → Original Value. SVGs generados con `npm run mermaid:render`.
  - Effort: S
  - Source: 09-companion-media-audit

- [ ] **[MEDIUM] [HUMANIZATION] EN first person solo 4 ocurrencias**
  - Why: 4 es aceptable pero podría ser más alto (15-20) para contenido técnico humanizado.
  - Evidence: EN first person = 4.
  - How: Añadir más anécdotas personales en Best Practices, Common Mistakes, FAQ y Key Takeaways.
  - Effort: S
  - Source: 04-humanization-audit

### Low

- [ ] **[LOW] [SEO] lastUpdated stale (2026-08-18)**
  - Why: La fecha de última actualización no refleja la fecha actual.
  - Evidence: lastUpdated = 2026-08-18 en ambos archivos.
  - How: Actualizar a 2026-08-28 en ambos archivos.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[LOW] [GEO] Densidad factual media**
  - Why: El contenido tiene datos específicos (unreserved set, %20, %26, %3F, UTF-8) pero podría tener más datos concretos en Key Takeaways.
  - Evidence: Datos específicos presentes pero dispersos.
  - How: Añadir datos específicos en Key Takeaways: "unreserved set A-Z a-z 0-9 - _ . ~", "%20 for paths, + for queries", "RFC 3986 standard", "UTF-8 byte sequences".
  - Effort: S
  - Source: 06-geo-audit

- [ ] **[LOW] [GEO] Citas insuficientes (0 enlaces externos)**
  - Why: Sin enlaces a documentación oficial, el contenido tiene menor autoridad para AI search engines.
  - Evidence: 0 enlaces externos en ambos idiomas.
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
  - [ ] Enlaces externos añadidos (0 → 6-8).
  - [ ] Primera persona añadida en ES (0 → 5-8).
- [ ] Todos los MEDIUM resueltos:
  - [ ] Body words ≥ 1300 en ambos idiomas.
  - [ ] Sección "When Not to Use" añadida.
  - [ ] Sección "Key Takeaways" añadida.
  - [ ] Sección "See Also" añadida.
  - [ ] Mermaid diagram añadido.
  - [ ] EN first person aumentado (4 → 15+).
- [ ] Todos los LOW resueltos:
  - [ ] lastUpdated actualizado.
  - [ ] Densidad factual mejorada.
- [ ] Build pasa sin errores.
- [ ] Companion repo build pasa.
- [ ] Verificación móvil sin overflow. (estructural OK)
- [ ] Paridad EN/ES verificada.

---

## 4. Top 5 acciones prioritarias

1. **Crear companion repo** — Crear `resources/recipes/data/url-encoding/` con url_encoding.py, url_encoding.js, UrlEncoding.java, README.md, README.es.md. Effort: M. Prioridad: ALTA.
2. **Añadir enlaces externos y See Also** — Añadir 6-8 enlaces externos (RFC 3986, MDN, Python urllib, Java URLEncoder, WHATWG URL) en nueva sección See Also. Effort: S. Prioridad: ALTA.
3. **Añadir primera persona en ES** — Reescribir Mejores Prácticas, Errores Comunes, Explicación y FAQ con voz personal en ES. Effort: S. Prioridad: ALTA.
4. **Expandir contenido con secciones faltantes** — Añadir When Not to Use, Key Takeaways, See Also para superar 1300 palabras. Effort: M. Prioridad: MEDIA.
5. **Añadir Mermaid diagram** — Diagrama flowchart del pipeline URL encoding (user input → encode → URL → server → decode → original). Effort: S. Prioridad: MEDIA.

---

## 5. Veredicto

El recurso tiene base técnica sólida (SEO técnico 10/10, build pasa, 6 FAQ items, 5 body links, structured data completa) pero necesita companion repo, enlaces externos, humanización ES, secciones faltantes, expansión de contenido y diagrama Mermaid para alcanzar PROMOTE.

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

#### 02 SEO On-Page: 14/15

| Check | Estado |
|-------|--------|
| Title EN ≤60 chars | ✅ (12 chars) |
| Title ES ≤60 chars | ✅ (20 chars) |
| metaDescription EN 50-170 | ✅ (153 chars) |
| metaDescription ES 50-170 | ✅ (123 chars) |
| metaDescription top==seo | ✅ |
| relatedResources 3-6 | ✅ (6) |
| lastUpdated actualizado | ⚠️ stale (2026-08-18) |
| Sin H1 manual | ✅ |
| Jerarquía H2→H3 | ✅ |
| Secciones válidas | ✅ |
| Body links internos | ✅ (5, bien distribuidos) |

Score: 14/15 (-1 lastUpdated stale)

#### 03 Content Quality: 17/25

| Check | Estado |
|-------|--------|
| Body words EN (mín 1300) | ⚠️ 1150 (por debajo) |
| Body words ES (mín 1300) | ⚠️ 1171 (por debajo) |
| Thin content | LOW |
| H2 sections | 8 |
| H3 sections | 9 |
| Code blocks | 3 (multi-language) |
| FAQ items | 6 ✅ |
| Information gain | MODERATE |
| Riesgo sobre-optimización | NONE |
| Page-worthiness | PROBABLY YES |
| Sección "When Not to Use" | ❌ ausente |
| Sección "Key Takeaways" | ❌ ausente |
| Sección "See Also" | ❌ ausente |
| External links | ❌ 0 |

Score: 17/25 (-2 body words bajo, -2 When Not to Use, -1 Key Takeaways, -3 See Also)

#### 04 Humanization: 10/15

| Check | Estado |
|-------|--------|
| Red words | 0 ✅ |
| Generic phrases | 0 ✅ |
| Em dashes EN | 0 ✅ |
| Em dashes ES | 0 ✅ |
| En dashes EN | 0 ✅ |
| En dashes ES | 0 ✅ |
| First person EN | 4 ⚠️ |
| First person ES | 0 ❌ |
| pattern_totals EN | {} ✅ |
| pattern_totals ES | {} ✅ |
| Paridad humanización EN/ES | ⚠️ (4 vs 0) |

Score: 10/15 (-3 ES first person cero, -2 EN first person bajo)

#### 05 Bilingual Parity: 8/10

| Check | EN | ES | Estado |
|-------|-----|-----|--------|
| H2 count | 8 | 8 | ✅ |
| H3 count | 9 | 9 | ✅ |
| Code blocks | 3 | 3 | ✅ |
| Mermaid | 0 | 0 | ✅ (paridad) |
| Body links | 5 | 5 | ✅ |
| Ext links | 0 | 0 | ✅ (paridad) |
| Frontmatter paridad | PASS | PASS | ✅ |
| First person paridad | 4 vs 0 | — | ⚠️ |
| Body length | 1150 vs 1171 | — | ✅ (similar) |
| RelatedResources | 6=6 | — | ✅ |

Score: 8/10 (-2 first person paridad)

#### 06 GEO / AI Search: 3/5

| Check | Estado |
|-------|--------|
| Claridad de entidades | MEDIUM |
| Densidad factual | MEDIUM |
| Citas | INSUFFICIENT (0) |
| Pasajes extraíbles | MEDIUM |
| Structured data IA | OK |
| See Also | NO |

Score: 3/5 (-1 densidad factual, -1 citas insuficientes)

#### 08 Traffic: 6/15 (NOT VERIFIED)

| Check | Estado |
|-------|--------|
| GSC impressions | NOT VERIFIED |
| GSC CTR | NOT VERIFIED |
| GSC position | NOT VERIFIED |
| GA4 pageviews | NOT VERIFIED |
| Core Web Vitals | NOT VERIFIED |

Score: 6/15 (NOT VERIFIED, score base)

#### 09 Media / Companion: 6/15

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

Score: 6/15 (-5 sin mermaid, -4 sin companion)

### Anexo 2 — AI Pattern Detection

| Idioma | Total sentences | Findings | pattern_totals |
|--------|-----------------|----------|----------------|
| EN | N/A | 0 | {} |
| ES | N/A | 0 | {} |

Línea base limpia en ambos idiomas. Sin patrones de AI slop detectados.

### Anexo 3 — Validación técnica

| Comando | Estado | Output |
|---------|--------|--------|
| npm run content:quality | PASS | 0 errors, 0 warnings |
| npm run content:links | PASS | 0 broken, all relatedResources valid |
| npm run content:validate | PASS | 0 errors, 0 warnings |
| npm run check | PASS | 0 errors, 0 warnings, 3 hints |
| npm run build | PASS | 3258 páginas, 149.4s |

### Anexo 4 — Post-build HTML verification

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

### Anexo 5 — Mediciones actuales

| Métrica | EN | ES |
|---------|-----|-----|
| Body words | 1150 | 1171 |
| H2 sections | 8 | 8 |
| H3 sections | 9 | 9 |
| Code blocks | 3 | 3 |
| Mermaid blocks | 0 | 0 |
| FAQ items | 6 | 6 |
| Body internal links | 5 | 5 |
| External links | 0 | 0 |
| First person | 4 | 0 |
| Em dashes | 0 | 0 |
| En dashes | 0 | 0 |
| Red words | 0 | 0 |
| pattern_totals | {} | {} |

### Anexo 6 — H2 sections (paridad EN/ES)

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

Secciones faltantes (a añadir): When Not to Use / Cuándo No Usar, Key Takeaways / Puntos Clave, See Also / Ver También.

### Anexo 7 — relatedResources

| # | Slug | Tipo |
|---|------|------|
| 1 | /recipes/call-rest-api | recipes |
| 2 | /recipes/parse-json | recipes |
| 3 | /recipes/input-validation | recipes |
| 4 | /recipes/data-validation | recipes |
| 5 | /recipes/regular-expressions | recipes |
| 6 | /recipes/parse-csv-python-pandas | recipes |

Todos validados por `content:links` (0 broken).
