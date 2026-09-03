# Checklist de arreglos — guides/complete-guide-rabbitmq-architecture

## 0. Metadata del recurso

| Campo | Valor |
|-------|-------|
| Slug | complete-guide-rabbitmq-architecture |
| Tipo | guides |
| Topic | messaging |
| Título EN | Complete Guide to RabbitMQ Architecture (39 chars) |
| Título ES | Guía completa de arquitectura RabbitMQ (38 chars) |
| lastUpdated | 2026-08-19 |
| publishedAt | 2026-07-05 |
| estimatedReadTime | MISSING |
| Companion existe | No |
| Reciprocidad | 3/6 (kafka-production, message-queue-guide, event-driven-systems) |
| AI patterns EN | 0 findings |
| AI patterns ES | 0 findings |

## 1. Scorecard y decisión

| Dimensión | Score | Máx | Detalle |
|-----------|-------|-----|---------|
| SEO On-Page | 8 | 15 | metaDescription EN 167 chars (above 160 recommended), 0 internal body links, 0 external links, no See Also, estimatedReadTime MISSING, lastUpdated stale |
| SEO Técnico | 10 | 10 | Canonical, hreflang, sitemap, structured data OK |
| Calidad Contenido | 18 | 25 | Body 1478/1532 words, 19 code blocks, 6 FAQ, 27 H3, no Testing/Security sections, Monitoring present |
| Humanización | 9 | 15 | 0 red words, 0 em dashes, firstPerson 4/0 (ES sin primera persona), contractions 1/0, passiveVoice 5/0, 337/339 double spaces |
| Paridad Bilingüe | 8 | 10 | H2 12/12, H3 27/27, code 19/19, FAQ 6/6, related 6/6, order OK, words diff 54, pero firstPerson 4 vs 0, contractions 1 vs 0, monitoring 1 vs 0 (regex) |
| Medios Visuales | 0 | 5 | No Mermaid, no SVG, no diagram |
| Companion Repo | 0 | 3 | No companion repo |
| GEO / AI Search | 4 | 5 | FAQ 6 items, TechArticle + FAQPage OK, no speakable, FAQ variety 4 "How/What/When/Can" (good variety) |
| **TOTAL** | **57** | **88** | **FIX-THEN-PROMOTE** |

**Decisión: FIX-THEN-PROMOTE**

El recurso tiene base técnica muy sólida (19 code blocks, 27 H3, 6 FAQ con buena variedad, build PASS, AI patterns 0) pero tiene gaps significativos: metaDescription EN 167 chars (>160 recommended), sin enlaces internos ni externos, sin See Also, sin Mermaid, sin companion, reciprocidad 3/6, sin estimatedReadTime, lastUpdated stale, sin primera persona ni contractions en ES, double spaces masivos (337/339), y passive voice EN (5).

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [SEO] metaDescription EN 167 chars (> 160 recommended)**
  - Why: El AGENTS.md recomienda 50-160 chars. 167 está por encima del recomendado (aunque por debajo del hard max de 170).
  - Evidence: `audit43-measure.js` reporta metaLen: 167 EN.
  - How: Acortar metaDescription EN eliminando "and production best practices" o similar.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[CRITICAL] [CONTENT] Double spaces masivos (337 EN, 339 ES)**
  - Why: Los double spaces en el body indican indentación excesiva o artefactos de generación.
  - Evidence: `audit43-measure.js` reporta 337 double spaces EN, 339 ES.
  - How: Reemplazar secuencias de 2+ espacios dentro de líneas de texto con un solo espacio. Preservar indentación de código y YAML.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[CRITICAL] [MEDIA] No hay diagrama Mermaid ni SVG**
  - Why: Una guía de arquitectura RabbitMQ se beneficia enormemente de un diagrama de componentes (Producer→Exchange→Queue→Consumer). El AGENTS.md dice "Use diagrams for architecture overviews when helpful."
  - Evidence: `audit43-measure.js` reporta mermaid: 0 EN, 0 ES.
  - How: Añadir un Mermaid flowchart mostrando Producer→Exchange→Binding→Queue→Consumer con los 4 exchange types.
  - Effort: M
  - Source: 09-companion-media-audit

- [ ] **[CRITICAL] [COMPANION] No hay companion repo**
  - Why: La guía tiene 19 code blocks (Python, bash) que se benefician de un companion con código runnable.
  - Evidence: `D:\Codigo\stack-practices-resources\resources\guides\messaging\complete-guide-rabbitmq-architecture\meta.json` no existe.
  - How: Crear companion con meta.json, ejemplos de código, docker-compose, tests, READMEs.
  - Effort: L
  - Source: 09-companion-media-audit

### High

- [ ] **[HIGH] [CONTENT] No hay enlaces internos en el body (0 EN, 0 ES)**
  - Why: El AGENTS.md exige 2-3 enlaces internos contextuales. Hay 0.
  - Evidence: `audit43-measure.js` reporta internalLinks: 0 EN, 0 ES.
  - How: Añadir 2-3 enlaces internos contextuales a rabbitmq-dead-letter-queue, circuit-breaker-pattern, retry-pattern, o complete-guide-kafka-production.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [CONTENT] No hay enlaces externos (0 EN, 0 ES)**
  - Why: No hay ningún enlace externo. Recursos similares tienen 5-8.
  - Evidence: `audit43-measure.js` reporta externalLinks: 0 EN, 0 ES.
  - How: Añadir enlaces a RabbitMQ docs, AMQP spec, pika docs, quorum queues docs, etc.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [CONTENT] No hay sección See Also / Further Reading**
  - Why: El AGENTS.md recomienda See Also con cross-references adicionales.
  - Evidence: `audit43-measure.js` reporta seeAlso: 0.
  - How: Añadir `## See Also` con enlaces externos (RabbitMQ docs, AMQP, pika, quorum queues) y enlaces internos.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [SEO] estimatedReadTime MISSING**
  - Why: El AGENTS.md recomienda estimatedReadTime para UX.
  - Evidence: `audit43-measure.js` reporta estimatedReadTime: MISSING en ambos.
  - How: Añadir `estimatedReadTime: 8` al frontmatter (body ~1478 words / 180 wpm = 8 min).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [SEO] lastUpdated stale (2026-08-19)**
  - Why: La fecha debería actualizarse cuando se edite el recurso.
  - Evidence: `audit43-measure.js` reporta lastUpdated: 2026-08-19.
  - How: Actualizar a la fecha de mejora.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [RECIPROCITY] Reciprocidad 3/6**
  - Why: 3 de 6 relatedResources no tienen enlace de vuelta a complete-guide-rabbitmq-architecture.
  - Evidence: `audit43-reciprocity.js` reporta NO reciprocidad en rabbitmq-dead-letter-queue, circuit-breaker-pattern, retry-pattern.
  - How: Añadir `/guides/complete-guide-rabbitmq-architecture` a relatedResources en esos 3 recursos (EN y ES).
  - Effort: M
  - Source: 02-seo-audit

### Medium

- [ ] **[MEDIUM] [CONTENT] No hay sección Testing Strategy**
  - Why: Los patrones de consumer (ack/nack, prefetch, DLX) necesitan tests de idempotencia, retry, y poison message handling.
  - Evidence: `audit43-measure.js` reporta testing: 0.
  - How: Añadir `## Testing Strategy` con tests para consumer ack/nack, DLX, prefetch, idempotency.
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [CONTENT] No hay sección Security Considerations**
  - Why: RabbitMQ tiene implications de seguridad (TLS, auth, vhost permissions, firewall).
  - Evidence: `audit43-measure.js` reporta security: 0.
  - How: Añadir `## Security Considerations` con TLS, authentication, vhost permissions, network security, credential management.
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [HUMANIZATION] ES sin primera persona (0) ni contractions (0)**
  - Why: El ES no tiene primera persona ni contractions, mientras que EN tiene 4 y 1 respectivamente. Falta de paridad.
  - Evidence: `audit43-measure.js` reporta firstPerson: 0 ES, contractions: 0 ES.
  - How: Añadir primera persona y contractions naturales en ES donde corresponda.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [HUMANIZATION] Passive voice EN (5 instancias)**
  - Why: 5 instancias de passive voice en EN.
  - Evidence: `audit43-measure.js` reporta passiveVoice: 5 EN, 0 ES.
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

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos (metaDescription EN, double spaces, Mermaid, companion).
- [ ] Todos los HIGH resueltos (internal links, external links, See Also, estimatedReadTime, lastUpdated, reciprocidad).
- [ ] Build pasa sin errores.
- [ ] Companion repo build pasa.
- [ ] Verificación móvil sin overflow.
- [ ] Paridad EN/ES verificada.
- [ ] AI patterns 0 EN+ES.
- [ ] Reciprocidad 6/6.

## 4. Top 5 acciones

1. **Acortar metaDescription EN a ≤160 chars** — CRITICAL, Effort S — impacto SEO inmediato.
2. **Limpiar double spaces (337/339)** — CRITICAL, Effort S — calidad de contenido.
3. **Añadir diagrama Mermaid + SVGs** — CRITICAL, Effort M — visualización de arquitectura.
4. **Crear companion repo** — CRITICAL, Effort L — código runnable con docker-compose.
5. **Añadir enlaces internos/externos + See Also + reciprocidad + Testing/Security** — HIGH, Effort M — cierra gaps de contenido y SEO.

## 5. Veredicto

Recurso con base técnica muy sólida (19 code blocks, 27 H3, 6 FAQ con buena variedad, build PASS, AI patterns 0, paridad estructural perfecta) pero con gaps significativos: metaDescription EN 167 chars, sin enlaces internos ni externos, sin See Also, sin Mermaid ni companion, reciprocidad 3/6, sin estimatedReadTime, lastUpdated stale, ES sin humanización, y double spaces masivos. Score 57/88 → FIX-THEN-PROMOTE.

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

- Title EN: 39 chars ✅ (≤60).
- Title ES: 38 chars ✅.
- metaDescription EN: 167 chars ⚠️ (>160 recommended, <170 hard max).
- metaDescription ES: 160 chars ✅ (en el límite).
- metaMatch: ✅ ambos.
- Keywords: 8 EN, 8 ES ✅ (≥3).
- Internal body links: 0 ❌.
- External links: 0 ❌.
- H1: renderizado desde frontmatter ✅.
- H2: 12/12 ✅.
- H3: 27/27 ✅.
- FAQ items: 6/6 ✅ (≥3).
- FAQ variety: 1 "When" + 2 "What" + 2 "How" + 1 "Can" ✅ (good variety).
- estimatedReadTime: MISSING ❌.
- Reciprocidad: 3/6 ❌.

### Sub-auditoría 03 — Content Quality

- Body words: EN 1478, ES 1532 ✅ (≥1300 for guides).
- Code blocks: 19/19 ✅ (Python x14, bash x3, text x1, Python RPC x1).
- Code runnable: ✅ (ejemplos prácticos con pika, rabbitmqctl, requests).
- Sections presentes: Overview, When to Use, Architecture, Exchange Types, Queue Features, Consumer Patterns, Clustering and HA, Performance Tuning, Monitoring, Best Practices, Common Mistakes, FAQ.
- Sections faltantes: Testing Strategy, Security Considerations, See Also.
- Information gain: HIGH — cubre 4 exchange types, 4 queue features, 3 consumer patterns, clustering, performance tuning, monitoring.
- Thin content: No — body words above minimum.

### Sub-auditoría 04 — Humanization

- AI patterns: 0 EN, 0 ES ✅.
- Red words (Tier 1): 0 ✅.
- Em dashes: 0 ✅.
- First person: EN 4, ES 0 ⚠️ (falta de paridad).
- Contractions: EN 1, ES 0 ⚠️ (falta de paridad).
- Passive voice: EN 5, ES 0 ⚠️.
- Double spaces: EN 337, ES 339 ❌ CRITICAL.
- Promotional language: 0 ✅.
- Hedging: 0 ✅.
- Vague attributions: 0 ✅.

### Sub-auditoría 05 — Bilingual Parity

- H2: 12/12 ✅.
- H3: 27/27 ✅.
- Code blocks: 19/19 ✅.
- FAQ items: 6/6 ✅.
- Mermaid: 0/0 ✅ (both missing).
- Related resources: 6/6 ✅.
- Related order: ✅ match.
- Body words diff: 54 ✅ (≤60).
- Keywords: 8 EN, 8 ES ✅.
- metaDescription match: ✅ ambos.
- First person paridad: ❌ (4 vs 0).
- Contractions paridad: ❌ (1 vs 0).
- Monitoring paridad: ⚠️ (1 vs 0 — regex no detecta "Monitoreo" en ES).

### Sub-auditoría 06 — GEO / AI Search

- FAQ items: 6 ✅ (≥3).
- FAQ variety: 1 "When" + 2 "What" + 2 "How" + 1 "Can" ✅ (good variety).
- TechArticle: 1 ✅.
- FAQPage: 1 ✅.
- Speakable: NOT VERIFIED (requires Astro component changes).
- Extractable facts: HIGH — exchange types, queue features, consumer patterns, clustering, quorum queues, prefetch, publisher confirms, DLX.

### Sub-auditoría 08 — GSC/GA4 Traffic

- NOT VERIFIED — no hay acceso a GSC/GA4 desde el código local.

### Sub-auditoría 09 — Companion & Media

- Companion repo: ❌ MISSING.
- Mermaid: 0 ❌.
- SVG: 0 ❌.
- Lightbox: ✅ presente (pero sin diagramas).
- Mobile viewport: ✅ presente.
- Mobile overflow: NOT VERIFIED (sin navegador).
- Reciprocidad: 3/6 ❌ (rabbitmq-dead-letter-queue, circuit-breaker-pattern, retry-pattern sin reciprocidad).

### AI Detection

- `ref/output/ai-detect-patterns-complete-guide-rabbitmq-architecture.json` — 0 findings ✅.
- `ref/output/ai-detect-patterns-complete-guide-rabbitmq-architecture-es.json` — 0 findings ✅.
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
| H1 | Complete Guide to RabbitMQ Architecture | Guía completa de arquitectura RabbitMQ |
| H2 renderizado | 17 | 17 |
| H3 renderizado | 27 | 27 |
| Mermaid | 0 | 0 |
| Lightbox | 1 | 1 |
| TechArticle | 1 | 1 |
| FAQPage | 1 | 1 |
| WebPage | 2 | 2 |
| BreadcrumbList | 1 | 1 |
| Canonical | 1 | 1 |
| Hreflang | 3 | 3 |
| CodeBlocks | 19 | 19 |
| dateModified | 2026-08-19 | 2026-08-19 |
| Viewport | 1 | 1 |
