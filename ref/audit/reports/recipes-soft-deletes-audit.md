# Checklist de arreglos — recipes/soft-deletes

## 0. Metadata del recurso

| Campo | Valor |
|-------|-------|
| Slug | soft-deletes |
| Tipo | recipes |
| Topic | databases |
| Título EN | Implement Soft Deletes in Databases with Python, JS and Java (60 chars) |
| Título ES | Implementa borrado lógico en bases de datos con Python, JS y Java (65 chars) |
| lastUpdated | 2026-08-19 |
| publishedAt | 2026-06-11 |
| estimatedReadTime | MISSING |
| Companion existe | No |
| Reciprocidad | 2/6 (solo database-transactions y database-migrations-safely) |
| AI patterns EN | 0 findings |
| AI patterns ES | 0 findings |

## 1. Scorecard y decisión

| Dimensión | Score | Máx | Detalle |
|-----------|-------|-----|---------|
| SEO On-Page | 10 | 15 | title ES 65 chars (>60), internal body links 1 (min 2-3), no See Also, estimatedReadTime MISSING |
| SEO Técnico | 10 | 10 | Canonical, hreflang, sitemap, structured data OK |
| Calidad Contenido | 14 | 25 | Body 1255/1317 words (thin, min recipes 1300), 8 code blocks, 6 FAQ, no Testing/Security/Monitoring sections |
| Humanización | 10 | 15 | 0 red words, 0 em dashes, firstPerson 5/0 (ES sin primera persona), contractions 3/0 (ES sin contractions), passiveVoice 3/0, 142/147 double spaces |
| Paridad Bilingüe | 9 | 10 | H2 8/8, H3 14/14, code 8/8, FAQ 6/6, related 6/6, order OK, words diff 62, pero firstPerson 5 vs 0 y contractions 3 vs 0 |
| Medios Visuales | 0 | 5 | No Mermaid, no SVG, no diagram |
| Companion Repo | 0 | 3 | No companion repo |
| GEO / AI Search | 4 | 5 | FAQ 6 items, TechArticle + FAQPage OK, no speakable, FAQ variety 4/6 "How" (67%) |
| **TOTAL** | **57** | **88** | **FIX-THEN-PROMOTE** |

**Decisión: FIX-THEN-PROMOTE**

El recurso tiene base técnica sólida (8 code blocks multi-lenguaje, 6 FAQ, build PASS, AI patterns 0) pero tiene gaps significativos: title ES excede 60 chars, body words EN por debajo del mínimo (1255 vs 1300), sin secciones Testing/Security/Monitoring/See Also, sin diagrama Mermaid, sin companion repo, reciprocidad 2/6, sin primera persona ni contractions en ES, y double spaces masivos (142/147).

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [SEO] Title ES 65 chars (> 60 max)**
  - Why: El AGENTS.md exige title ≤ 60 chars. 65 chars excede el límite.
  - Evidence: `audit42-measure.js` reporta titleLen: 65 ES.
  - How: Acortar título ES a ≤ 60 chars manteniendo significado.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[CRITICAL] [CONTENT] Double spaces masivos (142 EN, 147 ES)**
  - Why: Los double spaces en el body indican indentación excesiva o artefactos de generación.
  - Evidence: `audit42-measure.js` reporta 142 double spaces EN, 147 ES.
  - How: Reemplazar secuencias de 2+ espacios dentro de líneas de texto con un solo espacio. Preservar indentación de código y YAML.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[CRITICAL] [MEDIA] No hay diagrama Mermaid ni SVG**
  - Why: El flujo soft-delete → purge → restore se beneficia de una visualización. El AGENTS.md dice "Add one only if the flow is non-trivial" — este flujo es no trivial.
  - Evidence: `audit42-measure.js` reporta mermaid: 0 EN, 0 ES.
  - How: Añadir un Mermaid flowchart mostrando el ciclo de vida: Active → Soft Deleted → Purged / Restored.
  - Effort: M
  - Source: 09-companion-media-audit

- [ ] **[CRITICAL] [COMPANION] No hay companion repo**
  - Why: La receta tiene ejemplos multi-lenguaje (Python, JS, Java) + SQL que se benefician de un companion con código runnable.
  - Evidence: `D:\Codigo\stack-practices-resources\resources\recipes\databases\soft-deletes\meta.json` no existe.
  - How: Crear companion con meta.json, ejemplos de código, tests, READMEs.
  - Effort: L
  - Source: 09-companion-media-audit

### High

- [ ] **[HIGH] [CONTENT] Body words EN 1255 (thin, min recipes 1300)**
  - Why: El body EN está por debajo del mínimo de 1300 words para recipes.
  - Evidence: `audit42-measure.js` reporta bodyWords: 1255 EN.
  - How: Expandir Explanation con trade-offs, o añadir sección Testing Strategy con ejemplos.
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [CONTENT] No hay enlaces internos suficientes (1 EN, 1 ES)**
  - Why: El AGENTS.md exige 2-3 enlaces internos contextuales. Solo hay 1.
  - Evidence: `audit42-measure.js` reporta internalLinks: 1 EN, 1 ES.
  - How: Añadir 1-2 enlaces internos contextuales a database-indexing, repository-pattern, o database-migrations-safely.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [CONTENT] No hay sección See Also / Further Reading**
  - Why: El AGENTS.md recomienda See Also con cross-references adicionales.
  - Evidence: `audit42-measure.js` reporta seeAlso: 0.
  - How: Añadir `## See Also` con enlaces externos (PostgreSQL docs, SQLAlchemy docs, Sequelize paranoid docs, Hibernate docs, GDPR Article 17) y 2-3 enlaces internos.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [CONTENT] No hay sección Testing Strategy**
  - Why: Los soft deletes necesitan tests de restore, cascade, purge.
  - Evidence: `audit42-measure.js` reporta testing: 0.
  - How: Añadir `## Testing Strategy` con tests pytest para SQLAlchemy, Jest para Sequelize, JUnit para Hibernate.
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [SEO] estimatedReadTime MISSING**
  - Why: El AGENTS.md recomienda estimatedReadTime para UX.
  - Evidence: `audit42-measure.js` reporta estimatedReadTime: MISSING en ambos.
  - How: Añadir `estimatedReadTime: 7` al frontmatter (body ~1255 words / 180 wpm = 7 min).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [SEO] lastUpdated stale (2026-08-19)**
  - Why: La fecha debería actualizarse cuando se edite el recurso.
  - Evidence: `audit42-measure.js` reporta lastUpdated: 2026-08-19.
  - How: Actualizar a la fecha de mejora.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [RECIPROCITY] Reciprocidad 2/6**
  - Why: 4 de 6 relatedResources no tienen enlace de vuelta a soft-deletes.
  - Evidence: `audit42-reciprocity.js` reporta NO reciprocidad en database-indexing, database-query-result-caching, repository-pattern, unit-of-work-pattern.
  - How: Añadir `/recipes/soft-deletes` a relatedResources en esos 4 recursos (EN y ES).
  - Effort: M
  - Source: 02-seo-audit

### Medium

- [ ] **[MEDIUM] [CONTENT] Enlaces externos insuficientes (0 EN, 0 ES)**
  - Why: No hay ningún enlace externo. Recursos similares tienen 5-8.
  - Evidence: `audit42-measure.js` reporta externalLinks: 0 EN, 0 ES.
  - How: Añadir enlaces a PostgreSQL docs, SQLAlchemy docs, Sequelize paranoid docs, Hibernate @Filter docs, GDPR Article 17.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [CONTENT] No hay sección Security Considerations**
  - Why: Los soft deletes tienen implications de seguridad (GDPR, PII exposure, audit trails).
  - Evidence: `audit42-measure.js` reporta security: 0.
  - How: Añadir `## Security Considerations` con GDPR compliance, PII en soft-deleted rows, audit logging, access control.
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [CONTENT] No hay sección Monitoring**
  - Why: Los soft deletes necesitan monitoring de purge jobs, storage growth, query performance.
  - Evidence: `audit42-measure.js` reporta monitoring: 0.
  - How: Añadir `## Monitoring` con métricas (soft-deleted rows count, purge job success rate, storage growth, query latency).
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [HUMANIZATION] ES sin primera persona (0) ni contractions (0)**
  - Why: El ES no tiene primera persona ni contractions, mientras que EN tiene 5 y 3 respectivamente. Falta de paridad.
  - Evidence: `audit42-measure.js` reporta firstPerson: 0 ES, contractions: 0 ES.
  - How: Añadir primera persona y contractions naturales en ES donde corresponda.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [HUMANIZATION] Passive voice EN (3 instancias)**
  - Why: 3 instancias de passive voice en EN.
  - Evidence: `audit42-measure.js` reporta passiveVoice: 3 EN, 0 ES.
  - How: Convertir a voz activa donde sea natural.
  - Effort: S
  - Source: 04-humanization-audit

### Low

- [ ] **[LOW] [GEO] No hay speakable content**
  - Why: El AGENTS.md menciona speakable data para GEO pero requiere componentes Astro.
  - Evidence: HTML post-build no incluye speakable.
  - How: OUT OF SCOPE — requiere cambios en componentes Astro.
  - Effort: L
  - Source: 06-geo-audit

- [ ] **[LOW] [GEO] FAQ variety 67% "How" (4/6)**
  - Why: 4 de 6 FAQ empiezan con "How". El AGENTS.md recomienda variedad.
  - Evidence: `audit42-measure.js` reporta h3List con 4 "How" + 1 "Does" + 1 "When".
  - How: Reformular 1-2 preguntas para empezar con "Why" o "What".
  - Effort: S
  - Source: 06-geo-audit

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos (title ES, double spaces, Mermaid, companion).
- [ ] Todos los HIGH resueltos (body words, internal links, See Also, Testing, estimatedReadTime, lastUpdated, reciprocidad).
- [ ] Build pasa sin errores.
- [ ] Companion repo build pasa.
- [ ] Verificación móvil sin overflow.
- [ ] Paridad EN/ES verificada.
- [ ] AI patterns 0 EN+ES.
- [ ] Reciprocidad 6/6.

## 4. Top 5 acciones

1. **Acortar title ES a ≤60 chars** — CRITICAL, Effort S — impacto SEO inmediato.
2. **Limpiar double spaces (142/147)** — CRITICAL, Effort S — calidad de contenido.
3. **Añadir diagrama Mermaid + SVGs** — CRITICAL, Effort M — visualización del ciclo de vida.
4. **Crear companion repo** — CRITICAL, Effort L — código runnable con tests.
5. **Añadir secciones Testing/Security/Monitoring/See Also + enlaces internos + reciprocidad** — HIGH, Effort M — cierra gaps de contenido y SEO.

## 5. Veredicto

Recurso con base técnica sólida (8 code blocks, 6 FAQ, build PASS, AI patterns 0) pero con gaps significativos: title ES excede 60 chars, body EN thin (1255 < 1300), sin secciones Testing/Security/Monitoring/See Also, sin diagrama ni companion, reciprocidad 2/6, y ES sin humanización (sin primera persona ni contractions). Score 57/88 → FIX-THEN-PROMOTE.

## 6. Anexos

### Sub-auditoría 01 — Technical Audit

- Canonical: ✅ presente en EN y ES.
- Hreflang: ✅ 3 tags (en, es, x-default).
- Sitemap: ✅ incluido (verificado via build).
- Structured data: ✅ TechArticle 1, FAQPage 1, WebPage 2, BreadcrumbList 1.
- dateModified: 2026-08-19T00:00:00.000Z (stale).
- Viewport: ✅ presente.
- Lightbox: ✅ presente (pero sin diagramas).
- Build: PASS 3,260 páginas.

### Sub-auditoría 02 — SEO Audit

- Title EN: 60 chars ✅ (≤60, en el límite).
- Title ES: 65 chars ❌ (>60).
- metaDescription EN: 146 chars ✅.
- metaDescription ES: 157 chars ✅.
- metaMatch: ✅ ambos.
- Keywords: 5 EN, 4 ES ✅ (≥3).
- Internal body links: 1 ⚠️ (should be 2-3).
- External links: 0 ❌.
- H1: renderizado desde frontmatter ✅.
- H2: 8/8 ✅.
- H3: 14/14 ✅.
- FAQ items: 6/6 ✅ (≥3).
- FAQ variety: 4 "How" + 1 "Does" + 1 "When" ⚠️ (67% "How").
- estimatedReadTime: MISSING ❌.
- Reciprocidad: 2/6 ❌.

### Sub-auditoría 03 — Content Quality

- Body words: EN 1255, ES 1317 ⚠️ (EN below 1300 minimum for recipes).
- Code blocks: 8/8 ✅ (Python, JS, Java, SQL x4, Python restore, Python purge).
- Code runnable: ✅ (ejemplos prácticos con SQLAlchemy, Sequelize, Hibernate, SQL).
- Sections presentes: Overview, When to Use, Solution, Explanation, Variants, Best Practices, Common Mistakes, FAQ.
- Sections faltantes: Testing Strategy, Security Considerations, Monitoring, See Also.
- Information gain: MODERATE — cubre soft deletes bien pero no profundiza en testing, security, ni monitoring.
- Thin content: LOW — EN ligeramente por debajo del mínimo, ES por encima.

### Sub-auditoría 04 — Humanization

- AI patterns: 0 EN, 0 ES ✅.
- Red words (Tier 1): 0 ✅.
- Em dashes: 0 ✅.
- First person: EN 5, ES 0 ⚠️ (falta de paridad).
- Contractions: EN 3, ES 0 ⚠️ (falta de paridad).
- Passive voice: EN 3, ES 0 ⚠️.
- Double spaces: EN 142, ES 147 ❌ CRITICAL.
- Promotional language: 0 ✅.
- Hedging: 0 ✅.
- Vague attributions: 0 ✅.

### Sub-auditoría 05 — Bilingual Parity

- H2: 8/8 ✅.
- H3: 14/14 ✅.
- Code blocks: 8/8 ✅.
- FAQ items: 6/6 ✅.
- Mermaid: 0/0 ✅ (both missing).
- Related resources: 6/6 ✅.
- Related order: ✅ match.
- Body words diff: 62 ✅ (≤60 threshold, borderline).
- Keywords: 5 EN, 4 ES ⚠️ (diferencia de 1).
- metaDescription match: ✅ ambos.
- First person paridad: ❌ (5 vs 0).
- Contractions paridad: ❌ (3 vs 0).

### Sub-auditoría 06 — GEO / AI Search

- FAQ items: 6 ✅ (≥3).
- FAQ variety: 4 "How" + 1 "Does" + 1 "When" ⚠️ (67% "How").
- TechArticle: 1 ✅.
- FAQPage: 1 ✅.
- Speakable: NOT VERIFIED (requires Astro component changes).
- Extractable facts: Presentes (deleted_at column, partial unique index, GDPR Article 17, purge jobs, restore flow).

### Sub-auditoría 08 — GSC/GA4 Traffic

- NOT VERIFIED — no hay acceso a GSC/GA4 desde el código local.

### Sub-auditoría 09 — Companion & Media

- Companion repo: ❌ MISSING.
- Mermaid: 0 ❌.
- SVG: 0 ❌.
- Lightbox: ✅ presente (pero sin diagramas).
- Mobile viewport: ✅ presente.
- Mobile overflow: NOT VERIFIED (sin navegador).
- Reciprocidad: 2/6 ❌ (database-indexing, database-query-result-caching, repository-pattern, unit-of-work-pattern sin reciprocidad).

### AI Detection

- `ref/output/ai-detect-patterns-soft-deletes.json` — 0 findings ✅.
- `ref/output/ai-detect-patterns-soft-deletes-es.json` — 0 findings ✅.
- desklib detector: NOT RUN (se ejecutará en fase de mejora si se solicita).

### Validación técnica

| Comando | Estado | Output |
|---------|--------|--------|
| npm run content:quality | PASS | 0 errors, 0 warnings |
| npm run content:links | PASS | 0 broken |
| npm run content:validate | PASS | 0 errors, 0 warnings |
| npm run build | PASS | 3,260 páginas |

### HTML post-build

| Métrica | EN | ES |
|---------|----|----|
| H1 | Implement Soft Deletes in Databases with Python, J | Implementa borrado lógico en bases de datos con Py |
| H2 renderizado | 13 | 13 |
| H3 renderizado | 14 | 14 |
| Mermaid | 0 | 0 |
| Lightbox | 1 | 1 |
| TechArticle | 1 | 1 |
| FAQPage | 1 | 1 |
| WebPage | 2 | 2 |
| BreadcrumbList | 1 | 1 |
| Canonical | 1 | 1 |
| Hreflang | 3 | 3 |
| CodeBlocks | 8 | 8 |
| dateModified | 2026-08-19 | 2026-08-19 |
| Viewport | 1 | 1 |
