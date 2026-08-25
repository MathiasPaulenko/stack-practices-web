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
| lastUpdated | 2026-08-25 (actualizado en ronda de mejoras) |
| Body words EN | ~5,147 |
| Body words ES | ~5,590 |
| H2 count | 14 (EN) / 14 (ES) |
| H3 count | 34 (EN) / 34 (ES) |
| Code blocks | 83 (EN) / 81 (ES) |
| FAQ questions | 34 (layout renders max 10) |
| Imágenes/diagramas | NONE (no Mermaid, no SVG, no screenshots) |
| stack-practices-resources | NO existe companion repo para este recurso |

## 1. Scorecard y decisiones

### Score ANTERIOR (pre-mejoras)

| Dimensión | Puntaje | Peso | Ponderado |
|---|---|---|---|
| Search Intent & SERP Fit | 14/15 | 15 | 14.0 |
| Content Quality & Helpfulness | 23/25 | 15 | 13.8 |
| Information Gain & Originality | HIGH (4/5) | 10 | 8.0 |
| Semantic / Topical Coverage | 5/5 | 10 | 10.0 |
| Internal Linking & Site Architecture | 4/5 | 8 | 6.4 |
| Technical SEO & Indexability | 7.5/10 | 10 | 7.5 |
| On-Page SEO & Frontmatter | 13/15 | 10 | 8.7 |
| Humanization & AI Patterns | 11/15 | 8 | 5.9 |
| GEO / AI Search Optimization | 4.5/5 | 7 | 6.3 |
| Bilingual Parity | 7/10 | 7 | 4.9 |
| Traffic & Growth Potential | 11/15 | 5 | 3.7 |
| **OVERALL SCORE** | | **100** | **89.2/100** |

### Score ACTUAL (post-mejoras)

| Dimensión | Puntaje | Peso | Ponderado | Cambio |
|---|---|---|---|---|
| Search Intent & SERP Fit | 14/15 | 15 | 14.0 | — |
| Content Quality & Helpfulness | 24.5/25 | 15 | 14.7 | +0.9 |
| Information Gain & Originality | HIGH (5/5) | 10 | 10.0 | +2.0 |
| Semantic / Topical Coverage | 5/5 | 10 | 10.0 | — |
| Internal Linking & Site Architecture | 5/5 | 8 | 8.0 | +1.6 |
| Technical SEO & Indexability | 9.5/10 | 10 | 9.5 | +2.0 |
| On-Page SEO & Frontmatter | 14/15 | 10 | 9.3 | +0.6 |
| Humanization & AI Patterns | 12/15 | 8 | 6.4 | +0.5 |
| GEO / AI Search Optimization | 4.3/5 | 7 | 6.0 | -0.3 |
| Bilingual Parity | 9/10 | 7 | 6.3 | +1.4 |
| Traffic & Growth Potential | 12/15 | 5 | 4.0 | +0.3 |
| **OVERALL SCORE** | | **100** | **92.2/100** |

**Verdict post-mejoras:** Recurso de alta calidad (+3.0 puntos). Las correcciones de metadata ES/EN, sentence-ending code tokens y primera persona en ES han resuelto los issues CRITICAL y HIGH. Los issues restantes son MEDIUM/LOW y requieren trabajo editorial (reducción de FAQ) o manual fuera del skill (speakable schema, diagramas Mermaid, companion repo).

## 2. Cambios aplicados (ronda 1)

| # | Cambio | Archivo | Severidad antes | Estado |
|---|---|---|---|---|
| 1 | ES metaDescription 172→150 chars | `.es.md` | CRITICAL | ✅ RESUELTO |
| 2 | ES title 63→48 chars | `.es.md` | HIGH | ✅ RESUELTO |
| 3 | EN metaDescription 162→143 chars | `.md` | CRITICAL | ✅ RESUELTO |
| 4 | lastUpdated actualizado a 2026-08-25 | ambos | — | ✅ APLICADO |
| 5 | 7 sentence-ending code tokens corregidos (EN) | `.md` | HIGH | ✅ RESUELTO |
| 6 | 14 sentence-ending code tokens corregidos (ES) | `.es.md` | HIGH | ✅ RESUELTO |
| 7 | Primera persona añadida en ES ("Suelo elegir design-first...") | `.es.md` | HIGH | ✅ RESUELTO |

### IA Detection (Desklib, post-mejoras)

| Idioma | AI% | AI sentences | Human sentences | Total | Patterns |
|---|---|---|---|---|---|
| EN | 40.6% | 49 | 116 | 166 | {} vacío |
| ES | 38.0% | 60 | 168 | 232 | {} vacío |

- `pattern_totals` vacío en ambos → no hay patrones AI detectados
- EN 40.6% está en el límite (contenido técnico denso con YAML/comandos)
- ES 38.0% por debajo del umbral del 40%

## 3. Checklist de arreglos pendientes

### Critical

(none — todos resueltos en ronda 1)

### High

(none — todos resueltos en ronda 1)

### Medium

- [ ] **[MEDIUM] [CONTENT] FAQ duplication: 34 preguntas, layout renderiza solo 10**
  - **Why:** El body tiene 34 preguntas FAQ. `RecipeArticle.astro` extrae las primeras 10 para el componente FAQ visible y FAQPage JSON-LD. Las 24 adicionales solo aparecen como HTML plano en el body, creando duplicación visual y riesgo de over-optimization.
  - **Evidence:** 34 H3 dentro de `## FAQ` (EN y ES). Layout línea 212: `faqs.slice(0, 10)`.
  - **How:** Reducir a 10-12 FAQs de mayor impacto. Mover las menos esenciales a secciones dedicadas o eliminar las que aportan menos valor. Asegurar paridad EN/ES exacta.
  - **Effort:** Medium
  - **Source:** 01-technical, 03-content-quality, 06-geo, 08-traffic
  - **Estado:** PENDIENTE — requiere decisión editorial sobre cuáles conservar

- [ ] **[MEDIUM] [HUMANIZATION] FAQ sin variedad de estructura de preguntas**
  - **Why:** 31/34 preguntas en EN empiezan con "How do I" (91%). 30/34 en ES con "¿Cómo" (88%). Patrón formulaico detectable como AI.
  - **Evidence:** Solo 3 variaciones en EN (How do I, Should I, Can I). Solo 3 en ES (¿Cómo, ¿Puedo, ¿Debería).
  - **How:** Variar estructura: "Why should I...", "What happens when...", "Is it possible to...", "Which approach is better...". Aplicar junto con la reducción de FAQ.
  - **Effort:** Low (si se hace junto con la reducción de FAQ)
  - **Source:** 04-humanization-audit
  - **Estado:** PENDIENTE — mejor hacer junto con reducción de FAQ

- [ ] **[MEDIUM] [HUMANIZATION] Rule-of-three pattern frecuente**
  - **Why:** Múltiples listas siguen el patrón "A, B and C" que es un patrón detectable como AI.
  - **Evidence:** EN líneas 36, 107, 109, 159, 160, 346, 944, 971, 1101, 1269, 1341.
  - **How:** Variar estructura: "A and B, plus C", "A; B; and C", o separar en oraciones distintas. No es necesario cambiar todas, solo las más evidentes.
  - **Effort:** Low
  - **Source:** 04-humanization-audit
  - **Estado:** PENDIENTE — mejor en una pasada de humanización separada

- [ ] **[MEDIUM] [GEO] speakable structured data faltante**
  - **Why:** El schema.ts y RecipeArticle.astro no incluyen `speakable` para marcar pasajes citables por voice assistants.
  - **Evidence:** `src/lib/schema.ts` no tiene función `speakable`. `RecipeArticle.astro` no inyecta speakable.
  - **How:** Añadir `speakable` al schema con selectores CSS para las secciones más citables (Overview, What Works, Key Takeaways). Esto requiere modificar `schema.ts` y `RecipeArticle.astro`.
  - **Effort:** Medium
  - **Source:** 06-geo-audit
  - **Estado:** OUT OF SCOPE — requiere modificar componentes Astro

- [ ] **[MEDIUM] [HUMANIZATION] Passive voice (2 EN, 1 ES)**
  - **Why:** Voces pasivas detectadas en EN líneas 232, 270 y ES línea 224.
  - **How:** Convertir a voz activa. Ej EN 232: "Describe authentication under `components/securitySchemes`..."
  - **Effort:** Low
  - **Source:** 04-humanization-audit
  - **Estado:** PENDIENTE — corrección menor

### Low

- [ ] **[LOW] [CONTENT] Key Takeaways podría fusionarse con What Works**
  - **Why:** "Key Takeaways" es redundante con "What Works". El skill content-improvement sugiere fusionarlo, pero no es obligatorio.
  - **Evidence:** EN líneas 171-177 (Key Takeaways) vs 121-128 (What Works).
  - **How:** Mover los 4 puntos de Key Takeaways a What Works o eliminar si ya están cubiertos. Opcional.
  - **Effort:** Low
  - **Source:** 03-content-quality
  - **Estado:** Opcional — no es violación

- [ ] **[LOW] [CONTENT] Common Production Pitfalls se solapa con Common Mistakes y Production Notes**
  - **Why:** Tres secciones cubren errores/pitfalls desde ángulos similares.
  - **Evidence:** EN líneas 129-141 (Common Mistakes), 164-170 (Production Notes), 1339+ (Common Production Pitfalls).
  - **How:** Fusionar Common Production Pitfalls con Production Notes o Common Mistakes. Opcional.
  - **Effort:** Low
  - **Source:** 03-content-quality
  - **Estado:** Opcional — no es violación

- [ ] **[LOW] [GEO] Comentarios de código en inglés dentro de ES**
  - **Why:** Los comentarios en bloques de código están en inglés en la versión ES (ej: `"""Retrieve a book by its ID."""`, `// springdoc-openapi auto-generates...`).
  - **Evidence:** ES líneas 58, 98, 323-328.
  - **How:** Traducir comentarios en ES cuando sea idiomático. El AGENTS.md dice "translate comments and variable names only when idiomatic".
  - **Effort:** Low
  - **Source:** 06-geo-audit
  - **Estado:** Opcional — permitido por AGENTS.md

- [ ] **[LOW] [TRAFFIC] Sin assets descargables ni companion repo**
  - **Why:** El recurso no ofrece plantillas OpenAPI descargables ni tiene companion repo en `stack-practices-resources`.
  - **Evidence:** No existe `../stack-practices-resources/resources/recipes/api/api-documentation-openapi/meta.json`.
  - **How:** Considerar subir los ejemplos de código (Python/FastAPI, JS/Express, Java/SpringDoc, OpenAPI YAML) al repo hermano `stack-practices-resources`. Crear `meta.json` con los campos requeridos. Fuera del scope del skill content-improvement.
  - **Effort:** Medium
  - **Source:** 08-traffic-audit, verificación manual
  - **Estado:** OUT OF SCOPE — requiere trabajo manual en repo hermano

- [ ] **[LOW] [VISUAL] Sin diagramas ni imágenes**
  - **Why:** El recurso no tiene bloques Mermaid, SVG ni imágenes. Un recurso de esta extensión sobre OpenAPI se beneficiaría de un diagrama de flujo code-first vs design-first o un decision tree.
  - **Evidence:** 0 bloques `mermaid`, 0 etiquetas `![alt](...)`, 0 referencias a `public/assets/`.
  - **How:** Considerar añadir un diagrama Mermaid en la sección "Explanation" mostrando el flujo code-first vs design-first, o un decision tree para elegir entre Swagger UI y Redoc. Fuera del scope del skill content-improvement.
  - **Effort:** Medium
  - **Source:** verificación manual, recomendación de traffic-audit
  - **Estado:** OUT OF SCOPE — requiere decisión editorial y diseño

## 4. Definition of Done

- [x] ES metaDescription ≤ 160 chars (recomendado) — 150 chars ✅
- [x] EN metaDescription ≤ 160 chars (recomendado) — 143 chars ✅
- [x] ES title ≤ 60 chars — 48 chars ✅
- [x] EN title ≤ 60 chars — 58 chars ✅
- [x] metaDescription coincide en top-level y seo.metaDescription (ambos idiomas) ✅
- [x] Sentence-ending code tokens corregidos en EN y ES ✅
- [x] Primera persona añadida en ES donde EN la usa ✅
- [x] lastUpdated sincronizado en ambos (2026-08-25) ✅
- [x] `npm run content:quality` pasa sin errores ✅
- [x] `npm run content:links` pasa sin errores ✅
- [x] `npm run content:validate` pasa sin errores ✅
- [x] `npm run check` pasa sin errores ✅
- [x] `npm run build` genera 3,258 páginas ✅
- [x] `npm run sitemap` regenera sitemap.xml ✅
- [ ] FAQ reducido a 10-12 preguntas de mayor impacto (ambos idiomas) — PENDIENTE
- [ ] Estructura de preguntas FAQ variada — PENDIENTE
- [ ] Rule-of-three patterns reducidos — PENDIENTE
- [ ] Passive voice corregida (2 EN, 1 ES) — PENDIENTE
- [ ] speakable structured data — OUT OF SCOPE
- [ ] Companion repo en stack-practices-resources — OUT OF SCOPE
- [ ] Diagrama Mermaid — OUT OF SCOPE

## 5. Top 5 acciones pendientes

1. **Reducir FAQ de 34 a 10-12** — MEDIUM, esfuerzo medio, impacto alto en UX, SEO y over-optimization. Requiere decisión editorial.
2. **Variar estructura de preguntas FAQ** — MEDIUM, esfuerzo bajo si se hace junto con la reducción.
3. **Corregir passive voice (2 EN, 1 ES)** — MEDIUM, esfuerzo bajo.
4. **Añadir diagrama Mermaid (code-first vs design-first)** — LOW, esfuerzo medio, impacto medio en UX y diferenciación.
5. **Subir ejemplos a stack-practices-resources** — LOW, esfuerzo medio, impacto medio en linkability.

## 6. One-sentence verdict

Recurso técnicamente sólido y exhaustivo (92.2/100, +3.0 tras mejoras) que ha resuelto todos los issues CRITICAL y HIGH; los issues restantes son reducción de FAQ (decisión editorial), humanización menor (passive voice, rule-of-three), y mejoras visuales/repo que requieren trabajo manual fuera del skill.

## 7. Anexos

### Sub-auditorías ejecutadas (post-mejoras)

| Sub-auditoría | Score antes | Score después | Hallazgos clave |
|---|---|---|---|
| 01-technical-audit | 7.5/10 | 9.5/10 | Metadata corregida. Trailing slash correcto. H1 por layout. FAQ excesivo persiste. |
| 02-seo-audit | 13/15 | 14/15 | Frontmatter EN/ES dentro de rango. Schema markup correcto. See Also parity OK. |
| 03-content-quality-audit | 23/25 | 24.5/25 | Information gain excepcional. Thin content: NONE. FAQ excesivo persiste. |
| 04-humanization-audit | 11/15 | 12/15 | No red words. Tokens corregidos. First-person parity OK. FAQ sin variedad (91% "How do I"). Passive voice (3 instancias). |
| 05-bilingual-parity-audit | 7/10 | 9/10 | Estructura paralela. Frontmatter parity OK. First-person parity OK. Anglicisms aceptables. |
| 06-geo-audit | 4.5/5 | 4.3/5 | Entity clarity HIGH. speakable MISSING. Comentarios de código en ES no traducidos. 1 FAQ menos en ES (23 vs 24). |
| 08-traffic-audit | 11/15 | 12/15 | GSC/GA4 NOT VERIFIED. CTR potential mejorado (titles acortados). Sin descargables ni companion repo. |

### Hallazgos descartados como falsos positivos

| Hallazgo | Razón de descarte |
|---|---|
| Enlaces con trailing slash en See Also son error | FALSO: el sitio usa `trailingSlash: 'always'` en astro.config.mjs. Los enlaces con `/` son correctos. |
| Falta H1 en el body | FALSO: `RecipeArticle.astro` renderiza el H1 desde el frontmatter `title`. El body debe empezar con `## Overview`. |
| Secciones `What Works`, `Troubleshooting`, `See Also`, `Further Reading` son inválidas | FALSO: Son alternativas válidas según `src/content/recipes/AGENTS.md`. |
| `Key Takeaways` es una violación | FALSO: No es una violación. El skill sugiere fusionarlo con Best Practices, pero no es obligatorio. |
| `Common Production Pitfalls` es una violación | FALSO: Es una sección adicional válida. |
| Límite máximo de FAQ de 8-12 | FALSO: No hay máximo estricto en AGENTS.md. El mínimo es 3-5. La reducción recomendada aquí es por duplicación de renderizado y over-optimization, no por regla. |
| Comentarios de código con `#` confunden parsers | NO VERIFICADO: Dentro de bloques de código YAML, los `#` son comentarios válidos, no headings. |
| Primera persona en ES es un error (traffic-audit) | FALSO: La primera persona en ES ("Suelo elegir...") fue añadida intencionalmente para paridad con EN ("I tend to choose..."). Es correcta. |
