# Checklist de arreglos — guides/domain-driven-design-guide

## 0. Metadata del recurso

| Campo | Valor |
|-------|-------|
| Slug | domain-driven-design-guide |
| Tipo | guides |
| Topic | architecture |
| Título EN | Domain-Driven Design (DDD): A Practical Guide (45 chars) |
| Título ES | Domain-Driven Design (DDD): Guía Práctica (41 chars) |
| lastUpdated | 2026-08-19 (stale) |
| publishedAt | 2026-06-12 |
| estimatedReadTime | MISSING |
| Companion existe | No |
| Reciprocidad | 5/6 (falta repository-pattern) |
| AI patterns EN | 0 findings |
| AI patterns ES | 0 findings |
| desklib EN | 53.5% |
| desklib ES | 43.9% |

## 1. Scorecard y decisiones

| Dimensión | Score | Max |
|-----------|-------|-----|
| SEO On-Page | 9 | 15 |
| SEO Técnico | 9 | 10 |
| Calidad Contenido | 15 | 25 |
| Humanización | 8 | 15 |
| Paridad Bilingüe | 10 | 10 |
| Medios Visuales | 0 | 5 |
| Companion Repo | 0 | 3 |
| GEO / AI Search | 4 | 5 |
| **TOTAL** | **55** | **88** |

**Decisión: FIX-THEN-PROMOTE**

El recurso tiene estructura sólida y paridad EN/ES perfecta, pero le faltan secciones clave (Testing, Security, See Also), diagramas, companion repo, y tiene desklib AI% alto en ambos idiomas.

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [MEDIA] No hay diagrama Mermaid ni SVG**
  - Why: Una guía de DDD sobre bounded contexts y aggregates se beneficia enormemente de un diagrama visual. Sin diagrama, el contenido es solo texto y código.
  - Evidence: `audit44-measure.js` (mermaid: 0 EN, 0 ES). HTML post-build sin `<img class="mermaid-diagram">`.
  - How: Añadir bloque `mermaid` en Core Concepts o Bounded Context mostrando la relación entre contexts (Sales, Inventory, Shipping). Renderizar SVGs con `npm run mermaid:render`.
  - Effort: S
  - Source: 09-companion-media-audit

- [ ] **[CRITICAL] [COMPANION] No hay companion repo**
  - Why: Las guías de StackPractices deben tener companion repo con ejemplos ejecutables.
  - Evidence: `D:\Codigo\stack-practices-resources\resources\guides\architecture\domain-driven-design-guide\` no existe.
  - How: Crear companion con meta.json, ejemplos Python/Java de entities, value objects, aggregates, repositories, domain events, tests pytest, READMEs EN/ES.
  - Effort: M
  - Source: 09-companion-media-audit

### High

- [ ] **[HIGH] [SEO] estimatedReadTime MISSING**
  - Why: Campo recomendado por AGENTS.md para UX.
  - Evidence: `audit44-measure.js` (estimatedReadTime: "MISSING" ambos).
  - How: Añadir `estimatedReadTime: 7` al frontmatter EN y ES.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [SEO] lastUpdated stale (2026-08-19)**
  - Why: Debe actualizarse cuando se edita el recurso.
  - Evidence: `audit44-measure.js` (lastUpdated: "2026-08-19").
  - How: Actualizar a fecha actual del proyecto.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [CONTENT] No hay enlaces externos (0 EN, 0 ES)**
  - Why: Una guía de DDD debería referenciar fuentes autoritativas (Eric Evans, Martin Fowler, Vaughn Vernon, Microsoft DDD docs).
  - Evidence: `audit44-measure.js` (externalLinks: 0 EN, 0 ES).
  - How: Añadir enlaces externos contextuales en el body y/o See Also (Eric Evans book, Martin Fowler DDD refs, Microsoft DDD docs, Vaughn Vernon).
  - Effort: S
  - Source: 02-seo-audit, 03-content-quality-audit

- [ ] **[HIGH] [CONTENT] No hay sección See Also / Further Reading**
  - Why: Sección recomendada por AGENTS.md para cross-references suplementarias.
  - Evidence: `audit44-measure.js` (seeAlso: 0 EN, 0 ES).
  - How: Añadir `## See Also` con enlaces externos (Eric Evans, Martin Fowler, Vaughn Vernon, Microsoft DDD) + internos.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [HUMANIZATION] desklib EN 53.5% y ES 43.9% (ambos above 40%)**
  - Why: Ambos idiomas superan el threshold de 40%. El contenido es técnico denso con definiciones cortas y código, pero la prosa puede humanizarse más.
  - Evidence: `python scripts/ai-detect-content.py` (EN: 53.5%, ES: 43.9%).
  - How: Añadir primera persona, experiencia personal, contractions EN, voz activa, anécdotas reales. Reducir definiciones template-like.
  - Effort: M
  - Source: 04-humanization-audit

- [ ] **[HIGH] [CONTENT] Thin content (1296 EN / 1366 ES palabras)**
  - Why: Body words por debajo del mínimo recomendado para guides (1500+). Falta profundidad en secciones clave.
  - Evidence: `audit44-measure.js` (bodyWords: 1296 EN, 1366 ES).
  - How: Añadir Testing Strategy, Security Considerations, profundizar Core Concepts con más ejemplos, añadir contexto real.
  - Effort: M
  - Source: 03-content-quality-audit

### Medium

- [ ] **[MEDIUM] [CONTENT] No hay sección Testing Strategy**
  - Why: Sección recomendada para guides con código ejecutable.
  - Evidence: `audit44-measure.js` (testing: 0 EN, 0 ES).
  - How: Añadir `## Testing Strategy` con tests para aggregates (invariantes), value objects (igualdad), domain events.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [CONTENT] No hay sección Security Considerations**
  - Why: DDD tiene consideraciones de seguridad relevantes (validación en aggregate root, ACLs, authorization en repositories).
  - Evidence: `audit44-measure.js` (security: 0 EN, 0 ES).
  - How: Añadir `## Security Considerations` con validación de invariantes, ACLs como boundary de seguridad, authorization en repositories.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [SEO] Reciprocidad 5/6 (falta repository-pattern)**
  - Why: `/patterns/repository-pattern` está en relatedResources pero no tiene reciprocidad.
  - Evidence: `audit44-reciprocity.js` (repository-pattern.md MISSING reciprocidad, .es.md MISSING).
  - How: Añadir `/guides/domain-driven-design-guide` a relatedResources de repository-pattern.md y .es.md.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [HUMANIZATION] ES sin primera persona (0) ni contractions (0)**
  - Why: ES carece de voz personal y naturalidad.
  - Evidence: `audit44-measure.js` (firstPerson: 0 ES, contractions: 0 ES).
  - How: Añadir primera persona en ES ("En mi experiencia", "He visto equipos"), voz natural.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [CONTENT] Double spaces masivos (321 EN, 322 ES)**
  - Why: Artefactos de formato que pueden ser limpieza.
  - Evidence: `audit44-measure.js` (doubleSpaces: 321 EN, 322 ES).
  - How: Limpiar con script de normalización. La mayoría puede ser indentación de listas válida.
  - Effort: S
  - Source: 03-content-quality-audit

### Low

- [ ] **[LOW] [GEO] No hay speakable content**
  - Why: Requiere modificar componentes Astro.
  - Evidence: HTML post-build sin speakable schema.
  - How: Añadir speakable schema en BaseLayout.astro (out of scope).
  - Effort: M
  - Source: 06-geo-audit

- [ ] **[LOW] [SEO] dateModified stale en HTML (2026-08-19)**
  - Why: El HTML del build muestra dateModified antiguo.
  - Evidence: `audit44-html.js` (dateModified: 2026-08-19T00:00:00.000Z).
  - How: Se resuelve al actualizar lastUpdated en frontmatter.
  - Effort: S
  - Source: 01-technical-audit

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos (Mermaid + companion).
- [ ] Todos los HIGH resueltos (estimatedReadTime, lastUpdated, external links, See Also, desklib, thin content).
- [ ] Build pasa sin errores.
- [ ] Companion repo build pasa.
- [ ] Verificación móvil sin overflow.
- [ ] Paridad EN/ES verificada.
- [ ] Reciprocidad 6/6.
- [ ] AI patterns 0 EN+ES.
- [ ] desklib EN y ES below 40%.
- [ ] Sin regresiones.

## 4. Top 5 acciones

1. **Añadir Mermaid diagram + SVGs** — Effort S — diagrama de bounded contexts con context map.
2. **Crear companion repo** — Effort M — ejemplos Python/Java de DDD patterns + tests + READMEs.
3. **Añadir secciones faltantes (Testing, Security, See Also) + enlaces externos** — Effort M — profundizar contenido y reducir thin content.
4. **Humanizar prosa (primera persona, contractions, anécdotas)** — Effort M — reducir desklib EN 53.5%→<40%, ES 43.9%→<40%.
5. **Quick wins SEO (estimatedReadTime, lastUpdated, reciprocidad repository-pattern)** — Effort S — frontmatter + 1 reciprocidad.

## 5. Veredicto

FIX-THEN-PROMOTE — El recurso tiene estructura sólida y paridad perfecta, pero necesita diagramas, companion, secciones faltantes, humanización profunda y quick wins SEO para alcanzar PROMOTE.

## 6. Anexos

### Sub-auditoría 01 — Technical Audit

- Canonical: ✅ presente en EN y ES.
- Hreflang: ✅ 3 tags (en, es, x-default).
- Sitemap: ✅ incluido (verificado via build).
- Structured data: ✅ TechArticle 1, FAQPage 1, WebPage 2, BreadcrumbList 1.
- dateModified: 2026-08-19 ⚠️ (stale).
- Viewport: ✅ presente.
- Lightbox: ✅ presente (sin diagramas que usarlo).
- Build: PASS 3,260 páginas.
- Score: 9/10 (-1 por dateModified stale).

### Sub-auditoría 02 — SEO Audit

- Title EN: 45 chars ✅ (≤60).
- Title ES: 41 chars ✅.
- metaDescription EN: 134 chars ✅.
- metaDescription ES: 132 chars ✅.
- metaMatch: ✅ ambos.
- Keywords: 6 EN, 6 ES ✅ (≥3).
- Internal body links: 6 EN, 6 ES ✅ (≥2-3).
- External links: 0 EN, 0 ES ⚠️ (MISSING).
- H1: renderizado desde frontmatter ✅.
- H2: 8/8 ✅.
- H3: 14/14 ✅.
- FAQ items: 6/6 ✅ (≥3).
- FAQ variety: 2 "What" + 1 "Can" + 3 "How" ✅ (good variety).
- estimatedReadTime: MISSING ⚠️.
- lastUpdated: stale ⚠️.
- See Also: ausente ⚠️.
- Reciprocidad: 5/6 ⚠️ (falta repository-pattern).
- Score: 9/15.

### Sub-auditoría 03 — Content Quality

- Body words: EN 1296, ES 1366 ⚠️ (below 1500 minimum for guides).
- Code blocks: 7/7 ✅ (pero bajo para una guía advanced).
- Code runnable: ✅ (Python dataclass, Java Spring Boot example).
- Sections presentes: Overview, When to Use, Core Concepts, Strategic vs Tactical, Best Practices, Common Mistakes, FAQ, E-Commerce Domain Example.
- Sections faltantes: Testing Strategy, Security Considerations, See Also, Monitoring.
- Information gain: MEDIUM — conceptos bien explicados pero falta profundidad y experiencia real.
- Thin content: ⚠️ — body words below minimum.
- E-Commerce example: es un bloque `text` (no language-tagged code), lo que reduce el count de code blocks reales.
- Score: 15/25.

### Sub-auditoría 04 — Humanization

- AI patterns: 0 EN, 0 ES ✅.
- Red words (Tier 1): 0 ✅.
- Em dashes: 0 ✅.
- First person: EN 5, ES 0 ⚠️ (ES sin primera persona).
- Contractions: EN 3, ES 0 ⚠️ (ES sin contractions).
- Passive voice: EN 1, ES 0 ✅.
- Double spaces: EN 321, ES 322 — indentación de listas + artefactos.
- Promotional language: 0 ✅.
- Hedging: 0 ✅.
- Vague attributions: 0 ✅.
- desklib EN: 53.5% ⚠️ (above 40%).
- desklib ES: 43.9% ⚠️ (above 40%).
- Score: 8/15.

### Sub-auditoría 05 — Bilingual Parity

- H2: 8/8 ✅.
- H3: 14/14 ✅.
- Code blocks: 7/7 ✅.
- FAQ items: 6/6 ✅.
- Mermaid: 0/0 ✅.
- Related resources: 6/6 ✅.
- Related order: ✅ match.
- Body words diff: 70 ✅ (≤100).
- Keywords: 6 EN, 6 ES ✅.
- metaDescription match: ✅ ambos.
- Score: 10/10.

### Sub-auditoría 06 — GEO / AI Search

- FAQ items: 6 ✅ (≥3).
- FAQ variety: 2 "What" + 1 "Can" + 3 "How" ✅.
- TechArticle: 1 ✅.
- FAQPage: 1 ✅.
- Speakable: NOT VERIFIED.
- Extractable facts: MEDIUM — bounded contexts, entities, value objects, aggregates, repositories, domain events, strategic vs tactical.
- Score: 4/5.

### Sub-auditoría 08 — GSC/GA4 Traffic

- NOT VERIFIED — no hay acceso a GSC/GA4 desde el código local.

### Sub-auditoría 09 — Companion & Media

- Companion repo: ❌ MISSING.
- Mermaid: 0/0 ⚠️.
- SVGs: ❌ no generados.
- Lightbox: ✅ presente (sin uso).
- Mobile viewport: ✅ presente.
- Mobile overflow: NOT VERIFIED (sin navegador).
- Reciprocidad: 5/6 ⚠️.
- Score: 0/8.

### AI Detection

| Idioma | Patterns | desklib AI% |
|--------|----------|-------------|
| EN | 0 findings ✅ | 53.5% ⚠️ |
| ES | 0 findings ✅ | 43.9% ⚠️ |

### HTML post-build

| Métrica | EN | ES |
|---------|----|----|
| H1 | Domain-Driven Design (DDD): A Practical Guide | Domain-Driven Design (DDD): Guía Práctica |
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
| CodeBlocks | 7 | 7 |
| dateModified | 2026-08-19 | 2026-08-19 |
| Viewport | 1 | 1 |

### Validación técnica

| Comando | Estado |
|---------|--------|
| npm run build | PASS 3,260 páginas |
| Companion build-catalog | N/A (companion missing) |

### Verificación móvil

| Check | Estado |
|-------|--------|
| `<meta name="viewport">` | ✅ presente |
| CSS responsive | ✅ Tailwind responsive classes |
| Overflow horizontal (375px) | NOT VERIFIED (sin navegador) |
| Click-to-zoom en móvil | NOT VERIFIED (sin navegador) |
