# Checklist de arreglos — recipes/api-documentation-openapi

## 0. Metadata del recurso

| Campo | Valor |
|---|---|
| Tipo | recipes |
| Slug | api-documentation-openapi |
| Ruta EN | `src/content/recipes/api/api-documentation-openapi.md` |
| Ruta ES | `src/content/recipes/api/api-documentation-openapi.es.md` |
| URL EN | `https://stackpractices.com/recipes/api-documentation-openapi/` |
| URL ES | `https://stackpractices.com/es/recipes/api-documentation-openapi/` |
| lastUpdated | 2026-08-25 |
| Body words EN | ~5,175 |
| Body words ES | ~5,653 |
| H2 count | 14 (EN) / 14 (ES) |
| H3 count | 34 (EN) / 34 (ES) |
| Code blocks | 83 (EN) / 81 (ES) |
| FAQ questions | 34 (layout renders max 10) |
| Imágenes/diagramas | NONE (0 Mermaid, 0 SVG, 0 screenshots) |
| stack-practices-resources | NO existe companion repo |

## 1. Scorecard

| Dimensión | Puntaje | Peso | Ponderado |
|---|---|---|---|
| Search Intent & SERP Fit | 14/15 | 15 | 14.0 |
| Content Quality & Helpfulness | 24.5/25 | 15 | 14.7 |
| Information Gain & Originality | 5/5 | 10 | 10.0 |
| Semantic / Topical Coverage | 5/5 | 10 | 10.0 |
| Internal Linking & Site Architecture | 5/5 | 8 | 8.0 |
| Technical SEO & Indexability | 9.5/10 | 10 | 9.5 |
| On-Page SEO & Frontmatter | 14/15 | 10 | 9.3 |
| Humanization & AI Patterns | 12/15 | 8 | 6.4 |
| GEO / AI Search Optimization | 4.3/5 | 7 | 6.0 |
| Bilingual Parity | 9/10 | 7 | 6.3 |
| Traffic & Growth Potential | 12/15 | 5 | 4.0 |
| **OVERALL SCORE** | | **100** | **92.2/100** |

**Verdict:** Recurso de alta calidad (92.2/100). Todos los issues CRITICAL y HIGH
resueltos en ronda 1. Los issues restantes son MEDIUM/LOW y requieren trabajo
editorial (reducción de FAQ) o manual fuera del skill (speakable schema,
diagramas Mermaid, companion repo).

## 2. Sub-auditorías

### 01 — Technical SEO (9.5/10)

| Check | Estado | Evidence |
|---|---|---|
| Slug kebab-case único | PASS | `api-documentation-openapi` |
| Rutas EN/ES correctas | PASS | `/recipes/api-documentation-openapi/` y `/es/recipes/...` |
| Canonical self-referencing | PASS | Seo.astro canonical = URL propia |
| hreflang correcto | PASS | en/es/x-default en sitemap líneas 13478-13480, 34478-34480 |
| Sitemap presence | PASS | EN línea 34474, ES línea 13474, lastmod 2026-08-25 |
| Structured data | PASS | TechArticle + WebPage + FAQPage(10) + BreadcrumbList |
| Internal links trailing slash | PASS | 6 enlaces con `/` finales, coincide con `trailingSlash: 'always'` |
| EN/ES technical parity | PASS | 14 H2, 34 H3, 6 relatedResources idénticos |
| metaDescription rango | PASS | EN 143 chars, ES 150 chars (ambos ≤160) |
| Title rango | PASS | EN 58 chars, ES 48 chars (ambos ≤60) |
| H1 rule | PASS | Body empieza con `## Overview`, sin H1 manual |
| Imágenes/diagramas | WARNING | 0 Mermaid, 0 SVG, 0 imágenes. Recurso se beneficiaría de diagrama code-first vs design-first |
| Companion repo | WARNING | No existe `../stack-practices-resources/resources/recipes/api/api-documentation-openapi/meta.json` |
| FAQ count | WARNING | 34 preguntas, layout renderiza max 10. Duplicación visual |

### 02 — SEO On-Page (14/15)

| Check | Estado | Evidence |
|---|---|---|
| Frontmatter EN completo | PASS | title 58, metaDescription 143, 4 keywords, 6 relatedResources |
| Frontmatter ES completo | PASS | title 48, metaDescription 150, 4 keywords, 6 relatedResources |
| metaDescription top=seo | PASS | EN: idéntico en línea 6 y 27. ES: idéntico en línea 6 y 27 |
| Headings hierarchy | PASS | H2→H3 correcto, sin H1 manual |
| Internal body links | PASS | 6 enlaces contextuales con trailing slash |
| relatedResources parity | PASS | 6 slugs idénticos en orden EN/ES |
| Duplicate meta risk | PASS | Titles y metaDescriptions únicos |
| SERP CTR potential | PASS | Titles concisos, metaDescriptions con keywords |
| Bilingual SEO parity | PASS | Traducción correcta de title, metaDescription, keywords |
| Schema markup | PASS | TechArticle + FAQPage + BreadcrumbList |
| See Also parity | PASS | 5 enlaces en ambos |
| No manual Related Resources | PASS | No existe sección `## Related Resources` en body |

### 03 — Content Quality (24.5/25)

| Dimensión | Score | Evidence |
|---|---|---|
| Search intent fit | 14/15 | Slug, title y content alineados con "how to document REST API with OpenAPI" |
| Section quality | 24/25 | 14 secciones válidas. Key Takeaways y Common Production Pitfalls son redundantes pero no violaciones |
| Thin content | 25/25 | EN 5,175 palabras, ES 5,653 (mínimo recipes: 1,300) |
| Information gain | 5/5 | Cobertura excepcional: code-first/design-first, 3 lenguajes, auth, versioning, SDKs, webhooks, polimorfismo, observabilidad, etc. |
| Duplication/cannibalization | 5/5 | Slug único, sin solapamiento con otros recursos |
| Semantic SEO | 9/10 | Keywords relevantes, estructura H2/H3 correcta. FAQ excesivo resta 1 punto |
| Topical authority | 5/5 | Cobertura exhaustiva con ejemplos prácticos multi-lenguaje |
| Over-optimization risk | 13/15 | 34 FAQs con 91% patrón "How do I" = riesgo de over-optimization |
| Page-worthiness | 5/5 | Código runnable, comparativas, best practices, troubleshooting |
| EN/ES content parity | 9/10 | Estructura paralela, código preservado, primera persona paritaria |

### 04 — Humanization (12/15)

| Check | Estado | Evidence |
|---|---|---|
| Red words | PASS | 0 instancias de delve, leverage, robust, seamless, etc. |
| Generic phrases | PASS | 0 instancias de "This guide covers", "In today's", "In conclusion" |
| Sentence-ending code tokens | WARNING | Quedan 5 EN (líneas 161, 322, 722, 1329, 1344) y 8 ES (líneas 158, 316, 653, 670, 726, 984, 1352, 1368). Algunas son dentro de code blocks o enlaces válidos |
| Impersonal/filler sections | PASS | Secciones válidas: Overview, When to Use, Solution, Explanation, Variants, What Works, Common Mistakes, Troubleshooting, Further Reading, Production Notes, Key Takeaways, FAQ, See Also, Common Production Pitfalls |
| Bilingual humanization parity | PASS | EN "I tend to choose..." / ES "Suelo elegir...". EN "I reach for..." / ES "que más uso" |
| Rule of three | WARNING | Múltiples listas "A, B and C" (líneas 36, 107, 109, 159, 160, 346, 944, 971, 1101, 1269, 1341 EN) |
| Em dash overuse | PASS | 0 em dashes en ambos |
| Passive voice | WARNING | EN línea 232: "Authentication is described...", EN línea 270: "schemes are defined". ES línea 224: "se describe..." |
| FAQ variety | FAIL | EN: 28/31 "How do I" (90%), 1 "Should I", 1 "Can I". ES: 28/31 "¿Cómo" (90%), 1 "¿Debería", 1 "¿Puedo" |

### 05 — Bilingual Parity (9/10)

| Check | Estado | Evidence |
|---|---|---|
| ES file exists | PASS | `api-documentation-openapi.es.md` |
| Structure parity | PASS | 14 H2, 34 H3 en ambos, orden equivalente |
| Frontmatter parity | PASS | title, metaDescription, keywords, relatedResources, lastUpdated todos paritarios |
| Body length parity | PASS | EN 5,175 / ES 5,653 (diferencia aceptable por traducción) |
| Code examples parity | PASS | 83 blocks EN / 81 ES, código idéntico |
| Anglicisms in ES | WARNING | Términos técnicos aceptables (spec, endpoint, header, lint, CI). No requieren traducción |
| Links parity | PASS | 6 internal + 5 See Also en ambos |
| First-person parity | PASS | EN línea 107 "I tend to choose" / ES línea 108 "Suelo elegir". EN línea 435 "I reach for" / ES línea 430 "que más uso" |
| FAQ count parity | PASS | 34 en ambos |

### 06 — GEO (4.3/5)

| Dimensión | Score | Evidence |
|---|---|---|
| Entity clarity | 4.5/5 | OpenAPI, Swagger UI, Redoc, FastAPI, SpringDoc bien definidos |
| Factual statements | 5/5 | Todas las afirmaciones técnicas son precisas |
| Citations | 4/5 | Further Reading con 4 enlaces autoritativos. Sin citas inline |
| Extractable passages | 4.5/5 | Párrafos cortos, código separado. Tokens corregidos mejoran extractabilidad |
| Consistency | 4/5 | Estructura consistente. Comentarios de código en EN dentro de ES |
| AI structured data | 3.5/5 | TechArticle + FAQPage + BreadcrumbList OK. speakable MISSING |
| Bilingual GEO parity | 4/5 | Paridad estructural OK. Comentarios de código no traducidos en ES |
| FAQ quality | 5/5 | Cobertura exhaustiva pero excesiva (34 preguntas) |
| Code explanations | 4.5/5 | Código en 3 lenguajes con contexto explicativo |
| Trust signals | 4/5 | Autor, fechas, dificultad declarados. Sin foto/bio del autor |

### 08 — Traffic & Growth (12/15)

| Dimensión | Score | Evidence |
|---|---|---|
| GSC metrics | NOT VERIFIED | Sin acceso a GSC |
| GA4 metrics | NOT VERIFIED | Sin acceso a GA4 |
| Title/metaDescription CTR | 3/3 | Titles ≤60, metaDescriptions ≤160, keywords relevantes |
| Mobile UX | 2/3 | Estructura clara pero 34 FAQs = scroll excesivo en móvil |
| Backlink potential | 3/3 | Multi-lenguaje, comparativas, código runnable = linkable asset |
| Growth opportunities | 2/3 | Featured snippets potenciales pero FAQ excesivo = riesgo de penalización |
| Content differentiation | 2/3 | Bueno pero sin datos originales ni elementos visuales |
| Imágenes/diagramas | WARNING | Sin diagramas. Un decision tree code-first vs design-first añadiría diferenciación |
| Companion repo | WARNING | Sin companion repo. Subir ejemplos aumentaría linkability |

## 3. Cambios aplicados (ronda 1)

| # | Cambio | Archivo | Severidad antes | Estado |
|---|---|---|---|---|
| 1 | ES metaDescription 172→150 chars | `.es.md` | CRITICAL | ✅ RESUELTO |
| 2 | ES title 63→48 chars | `.es.md` | HIGH | ✅ RESUELTO |
| 3 | EN metaDescription 162→143 chars | `.md` | CRITICAL | ✅ RESUELTO |
| 4 | lastUpdated actualizado a 2026-08-25 | ambos | — | ✅ APLICADO |
| 5 | 7 sentence-ending code tokens corregidos (EN) | `.md` | HIGH | ✅ RESUELTO |
| 6 | 14 sentence-ending code tokens corregidos (ES) | `.es.md` | HIGH | ✅ RESUELTO |
| 7 | Primera persona añadida en ES | `.es.md` | HIGH | ✅ RESUELTO |

### IA Detection (Desklib)

| Idioma | AI% | AI sentences | Human sentences | Patterns |
|---|---|---|---|---|
| EN | 40.6% | 49 | 116 | {} vacío |
| ES | 38.0% | 60 | 168 | {} vacío |

## 4. Checklist de arreglos pendientes

### Critical

(none)

### High

(none)

### Medium

- [ ] **[MEDIUM] FAQ duplication: 34 preguntas, layout renderiza solo 10**
  - 34 H3 en `## FAQ`. Layout `faqs.slice(0, 10)`. Las 24 adicionales solo
    aparecen como HTML plano, creando duplicación visual y riesgo de
    over-optimization.
  - **How:** Reducir a 10-12 FAQs de mayor impacto. Asegurar paridad EN/ES.
  - **Effort:** Medium — requiere decisión editorial

- [ ] **[MEDIUM] FAQ sin variedad de estructura**
  - 28/31 preguntas EN empiezan con "How do I" (90%).
    28/31 ES con "¿Cómo" (90%).
  - **How:** Variar: "Why should I...", "What happens when...",
    "Is it possible to...", "Which approach is better..."
  - **Effort:** Low (si se hace junto con reducción de FAQ)

- [ ] **[MEDIUM] Rule-of-three pattern frecuente**
  - Múltiples listas "A, B and C" en EN líneas 36, 107, 109, 159, 160,
    346, 944, 971, 1101, 1269, 1341.
  - **How:** Variar estructura. No es necesario cambiar todas.
  - **Effort:** Low

- [ ] **[MEDIUM] Passive voice (2 EN, 1 ES)**
  - EN línea 232: "Authentication is described..."
  - EN línea 270: "schemes are defined"
  - ES línea 224: "se describe..."
  - **How:** Convertir a voz activa.
  - **Effort:** Low

- [ ] **[MEDIUM] speakable structured data faltante**
  - `src/lib/schema.ts` no tiene `speakable`. `RecipeArticle.astro`
    no inyecta speakable.
  - **How:** Añadir `SpeakableSpecification` con selectores CSS.
  - **Effort:** Medium
  - **Estado:** OUT OF SCOPE — requiere modificar componentes Astro

### Low

- [ ] **[LOW] Key Takeaways podría fusionarse con What Works**
  - Redundante pero no es violación.
  - **Estado:** Opcional

- [ ] **[LOW] Common Production Pitfalls se solapa con Common Mistakes y Production Notes**
  - Tres secciones cubren ángulos similares.
  - **Estado:** Opcional

- [ ] **[LOW] Comentarios de código en inglés dentro de ES**
  - ES líneas 58, 98, 323-328 mantienen comentarios en inglés.
  - AGENTS.md permite: "translate comments only when idiomatic".
  - **Estado:** Opcional

- [ ] **[LOW] Sin companion repo en stack-practices-resources**
  - No existe `../stack-practices-resources/resources/recipes/api/api-documentation-openapi/meta.json`.
  - **How:** Subir ejemplos (Python/FastAPI, JS/Express, Java/SpringDoc,
    OpenAPI YAML) al repo hermano.
  - **Estado:** OUT OF SCOPE — requiere trabajo manual en repo hermano

- [ ] **[LOW] Sin diagramas ni imágenes**
  - 0 Mermaid, 0 SVG, 0 imágenes.
  - **How:** Considerar diagrama Mermaid en Explanation (code-first vs
    design-first) o decision tree (Swagger UI vs Redoc).
  - **Estado:** OUT OF SCOPE — requiere decisión editorial y diseño

- [ ] **[LOW] Sentence-ending code tokens restantes**
  - Quedan 5 EN y 8 ES. Algunas son dentro de code blocks o enlaces
    válidos (línea 161 EN = enlace FastAPI docs).
  - **Estado:** Opcional — la mayoría son aceptables

## 5. Definition of Done

- [x] ES metaDescription ≤ 160 chars — 150 chars ✅
- [x] EN metaDescription ≤ 160 chars — 143 chars ✅
- [x] ES title ≤ 60 chars — 48 chars ✅
- [x] EN title ≤ 60 chars — 58 chars ✅
- [x] metaDescription coincide en top-level y seo.metaDescription ✅
- [x] Sentence-ending code tokens corregidos (mayoría) ✅
- [x] Primera persona añadida en ES ✅
- [x] lastUpdated sincronizado (2026-08-25) ✅
- [x] `npm run content:quality` pasa ✅
- [x] `npm run content:links` pasa ✅
- [x] `npm run content:validate` pasa ✅
- [x] `npm run check` pasa ✅
- [x] `npm run build` genera 3,258 páginas ✅
- [x] `npm run sitemap` regenera sitemap.xml ✅
- [ ] FAQ reducido a 10-12 preguntas — PENDIENTE
- [ ] Estructura de preguntas FAQ variada — PENDIENTE
- [ ] Passive voice corregida — PENDIENTE
- [ ] speakable structured data — OUT OF SCOPE
- [ ] Companion repo en stack-practices-resources — OUT OF SCOPE
- [ ] Diagrama Mermaid — OUT OF SCOPE

## 6. Top 5 acciones pendientes

1. **Reducir FAQ de 34 a 10-12** — MEDIUM, decisión editorial
2. **Variar estructura de preguntas FAQ** — MEDIUM, junto con reducción
3. **Corregir passive voice (2 EN, 1 ES)** — MEDIUM, corrección menor
4. **Añadir diagrama Mermaid (code-first vs design-first)** — LOW, OUT OF SCOPE
5. **Subir ejemplos a stack-practices-resources** — LOW, OUT OF SCOPE

## 7. One-sentence verdict

Recurso técnicamente sólido (92.2/100) con todos los issues CRITICAL y HIGH
resueltos; los pendientes son reducción de FAQ (decisión editorial),
humanización menor (passive voice, rule-of-three), y mejoras visuales/repo
que requieren trabajo manual fuera del skill.

## 8. Hallazgos descartados como falsos positivos

| Hallazgo | Razón |
|---|---|
| Enlaces con trailing slash son error | FALSO: `trailingSlash: 'always'` en astro.config.mjs |
| Falta H1 en el body | FALSO: Layout renderiza H1 desde frontmatter |
| Secciones What Works, Troubleshooting, See Also, Further Reading inválidas | FALSO: Alternativas válidas según AGENTS.md |
| Key Takeaways es violación | FALSO: No es violación, es opcional fusionarlo |
| Common Production Pitfalls es violación | FALSO: Sección adicional válida |
| Límite máximo de FAQ | FALSO: No hay máximo en AGENTS.md. Mínimo 3-5 |
| Comentarios `#` en YAML confunden parsers | FALSO: Son comentarios válidos en code blocks |
| Primera persona en ES es error | FALSO: Añadida intencionalmente para paridad con EN |
