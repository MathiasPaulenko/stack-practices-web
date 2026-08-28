# Checklist de arreglos — recipes/database-deadlocks-retries

## 0. Metadata del recurso

- **Tipo (contentType):** recipes
- **Slug:** database-deadlocks-retries
- **Topic:** databases (subcarpeta `src/content/recipes/databases/`)
- **Ruta EN:** `src/content/recipes/databases/database-deadlocks-retries.md`
- **Ruta ES:** `src/content/recipes/databases/database-deadlocks-retries.es.md`
- **URL producción EN:** `https://stackpractices.com/recipes/database-deadlocks-retries/`
- **URL producción ES:** `https://stackpractices.com/es/recipes/database-deadlocks-retries/`
- **Título EN:** Handle Database Deadlocks and Retries (37 chars)
- **Título ES:** Manejar deadlocks y reintentos en bases de datos (48 chars)
- **metaDescription EN:** 150 chars
- **metaDescription ES:** 164 chars
- **lastUpdated:** 2026-08-18 (stale)
- **publishedAt:** 2026-06-13
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
| 02 SEO On-Page | 14 | 15 | ⚠️ |
| 03 Content Quality | 20 | 25 | ⚠️ |
| 04 Humanization | 10 | 15 | ⚠️ |
| 05 Bilingual Parity | 9 | 10 | ⚠️ |
| 06 GEO / AI Search | 4 | 5 | ⚠️ |
| 08 Traffic | 6 | 15 | 🔧 NOT VERIFIED |
| 09 Media / Companion | 7 | 15 | ⚠️ |
| **TOTAL** | **80** | **100** | FIX-THEN-PROMOTE |

**Decisión:** **FIX-THEN-PROMOTE** — El recurso es sólido: 1966/2108 palabras, 6 FAQ, 53 code blocks, validación limpia, build pasa. Los principales gaps son companion repo, 0 enlaces externos, 0 Mermaid, ES first person bajo (1) y lastUpdated stale.

---

## 2. Checklist de arreglos

### Critical

Ninguno.

### High

- [ ] **[HIGH] [COMPANION] No existe companion repo**
  - Why: El recurso tiene ejemplos de Python, JS, Java, C#, SQL y tests de deadlock. Es un candidato ideal para companion repo con scripts ejecutables.
  - Evidence: `../stack-practices-resources/resources/recipes/databases/database-deadlocks-retries/meta.json` no existe.
  - How: Crear `resources/recipes/databases/database-deadlocks-retries/` con `meta.json`, `transfer_funds.py`, `transfer_funds.js`, `TransferFunds.java`, `deadlock_test.py`, `README.md`, `README.es.md`. Ejecutar `node scripts/build-catalog.js`.
  - Effort: M
  - Source: 09-companion-media-audit

- [ ] **[HIGH] [CONTENT] Sin enlaces externos (0)**
  - Why: 0 enlaces externos en ambos idiomas. Un recurso técnico de bases de datos debe citar documentación oficial (PostgreSQL docs, MySQL InnoDB, SQL Server, Polly).
  - Evidence: EN ext links = 0, ES ext links = 0.
  - How: Añadir 5-7 enlaces externos en nueva sección See Also: PostgreSQL deadlock docs, MySQL InnoDB locks, SQL Server deadlock graph, Polly, SQLAlchemy, Knex.js.
  - Effort: S
  - Source: 02-seo-audit, 06-geo-audit

- [ ] **[HIGH] [HUMANIZATION] ES primera persona casi ausente (1)**
  - Why: La versión ES solo tiene 1 referencia en primera persona. Suena genérica e institucional.
  - Evidence: ES first person = 1. EN first person = 5.
  - How: Añadir primera persona en Mejores Prácticas, Errores Comunes, Explicación y FAQ. Usar "he visto", "me ha pasado", "recomiendo", "en mi experiencia".
  - Effort: S
  - Source: 04-humanization-audit

### Medium

- [ ] **[MEDIUM] [MEDIA] Sin diagrama Mermaid**
  - Why: El flujo de detección de deadlock (Transaction A, Transaction B, locks circulares, víctima, retry) es no-trivial y se beneficia de visualización.
  - Evidence: Mermaid blocks = 0 en ambos idiomas.
  - How: Añadir diagrama `flowchart TD` mostrando: A obtiene lock fila 1 → B obtiene lock fila 2 → A espera fila 2 → B espera fila 1 → DB detecta ciclo → elige víctima → rollback + retry con backoff. SVGs con `npm run mermaid:render`.
  - Effort: S
  - Source: 09-companion-media-audit

- [ ] **[MEDIUM] [HUMANIZATION] EN first person solo 5**
  - Why: 5 es aceptable pero podría ser más alto (10-15) para un recurso técnico que necesita autoridad personal.
  - Evidence: EN first person = 5.
  - How: Añadir anécdotas personales en Best Practices, Common Mistakes, FAQ y Key Takeaways.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [CONTENT] Sin sección "See Also"**
  - Why: No hay enlaces cruzados externos ni referencias adicionales más allá de relatedResources.
  - Evidence: No `## See Also` / `## Ver También` en H2.
  - How: Añadir `## See Also` con 5-7 enlaces externos + 2 internos.
  - Effort: S
  - Source: 03-content-quality-audit, 06-geo-audit

### Low

- [ ] **[LOW] [SEO] lastUpdated stale (2026-08-18)**
  - Why: La fecha de última actualización no refleja la fecha actual.
  - Evidence: lastUpdated = 2026-08-18 en ambos archivos.
  - How: Actualizar a 2026-08-28 en ambos archivos.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[LOW] [GEO] Densidad factual alta pero sin citas**
  - Why: El contenido tiene muchos datos específicos (códigos de error, trace flags, hints SQL) pero sin enlaces externos pierde autoridad para AI search.
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
  - [ ] Primera persona añadida en ES (1 → 5-8).
- [ ] Todos los MEDIUM resueltos:
  - [ ] Mermaid diagram añadido.
  - [ ] EN first person aumentado (5 → 10+).
  - [ ] Sección "See Also" añadida.
- [ ] Todos los LOW resueltos:
  - [ ] lastUpdated actualizado.
- [ ] Build pasa sin errores.
  - [ ] Companion repo build pasa.
  - [ ] Verificación móvil sin overflow. (estructural OK)
  - [ ] Paridad EN/ES verificada.

---

## 4. Top 5 acciones prioritarias

1. **Crear companion repo** — Crear `resources/recipes/databases/database-deadlocks-retries/` con scripts Python/JS/Java y deadlock test. Effort: M. Prioridad: ALTA.
2. **Añadir enlaces externos y See Also** — Añadir 5-7 enlaces externos (PostgreSQL, MySQL, SQL Server, Polly, SQLAlchemy). Effort: S. Prioridad: ALTA.
3. **Añadir primera persona en ES** — Reescribir Mejores Prácticas, Errores Comunes, Explicación y FAQ con voz personal. Effort: S. Prioridad: ALTA.
4. **Añadir Mermaid diagram** — Diagrama flowchart del ciclo de deadlock (A y B interbloqueadas, víctima, retry). Effort: S. Prioridad: MEDIA.
5. **Añadir primera persona en EN** — Anécdotas personales en Best Practices, Common Mistakes y FAQ. Effort: S. Prioridad: MEDIA.

---

## 5. Veredicto

El recurso es técnicamente sólido y largo (1966/2108 palabras), con 6 FAQ y 53 bloques de código. Necesita companion repo, enlaces externos, Mermaid, humanización ES y actualizar lastUpdated para alcanzar PROMOTE.

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
| Title EN ≤60 chars | ✅ (37 chars) |
| Title ES ≤60 chars | ✅ (48 chars) |
| metaDescription EN 50-170 | ✅ (150 chars) |
| metaDescription ES 50-170 | ✅ (164 chars) |
| metaDescription top==seo | ✅ |
| relatedResources 3-6 | ✅ (6) |
| lastUpdated actualizado | ⚠️ stale (2026-08-18) |
| Sin H1 manual | ✅ |
| Jerarquía H2→H3 | ✅ |
| Secciones válidas | ✅ |
| Body links internos | ✅ (4, bien distribuidos) |

Score: 14/15 (-1 lastUpdated stale)

#### 03 Content Quality: 20/25

| Check | Estado |
|-------|--------|
| Body words EN (mín 1300) | ✅ 1966 |
| Body words ES (mín 1300) | ✅ 2108 |
| Thin content | NONE |
| H2 sections | 8 |
| H3 sections | 15 |
| Code blocks | 8 (multi-language) |
| FAQ items | 6 ✅ |
| Information gain | HIGH |
| Riesgo sobre-optimización | NONE |
| Page-worthiness | YES |
| Sección "See Also" | ❌ ausente |
| External links | ❌ 0 |

Score: 20/25 (-3 See Also, -2 external links)

#### 04 Humanization: 10/15

| Check | Estado |
|-------|--------|
| Red words | 0 ✅ |
| Generic phrases | 0 ✅ |
| Em dashes EN | 0 ✅ |
| Em dashes ES | 0 ✅ |
| En dashes EN | 0 ✅ |
| En dashes ES | 0 ✅ |
| First person EN | 5 ⚠️ |
| First person ES | 1 ❌ |
| pattern_totals EN | {} ✅ |
| pattern_totals ES | {} ✅ |
| Paridad humanización EN/ES | ⚠️ (5 vs 1) |

Score: 10/15 (-3 ES first person bajo, -2 EN first person bajo)

#### 05 Bilingual Parity: 9/10

| Check | EN | ES | Estado |
|-------|-----|-----|--------|
| H2 count | 8 | 8 | ✅ |
| H3 count | 15 | 15 | ✅ |
| Code blocks | 8 | 8 | ✅ |
| Mermaid | 0 | 0 | ✅ (paridad) |
| Body links | 4 | 4 | ✅ |
| Ext links | 0 | 0 | ✅ (paridad) |
| Frontmatter paridad | PASS | PASS | ✅ |
| First person paridad | 5 vs 1 | — | ⚠️ |
| Body length | 1966 vs 2108 | — | ✅ (similar) |
| RelatedResources | 6=6 | — | ✅ |

Score: 9/10 (-1 first person paridad)

#### 06 GEO / AI Search: 4/5

| Check | Estado |
|-------|--------|
| Claridad de entidades | HIGH |
| Densidad factual | HIGH |
| Citas | INSUFFICIENT (0) |
| Pasajes extraíbles | HIGH |
| Structured data IA | OK |
| See Also | NO |

Score: 4/5 (-1 citas insuficientes)

#### 08 Traffic: 6/15 (NOT VERIFIED)

| Check | Estado |
|-------|--------|
| GSC impressions | NOT VERIFIED |
| GSC CTR | NOT VERIFIED |
| GSC position | NOT VERIFIED |
| GA4 pageviews | NOT VERIFIED |
| Core Web Vitals | NOT VERIFIED |

Score: 6/15 (NOT VERIFIED, score base)

#### 09 Media / Companion: 7/15

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

Score: 7/15 (-5 sin mermaid, -3 sin companion)

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
| npm run build | PASS | 3258 páginas, 110.7s |

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
| Body words | 1966 | 2108 |
| H2 sections | 8 | 8 |
| H3 sections | 15 | 15 |
| Code blocks | 8 | 8 |
| Mermaid blocks | 0 | 0 |
| FAQ items | 6 | 6 |
| Body internal links | 4 | 4 |
| External links | 0 | 0 |
| First person | 5 | 1 |
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

### Anexo 7 — relatedResources

| # | Slug | Tipo |
|---|------|------|
| 1 | /recipes/database-transactions | recipes |
| 2 | /recipes/retry-backoff | recipes |
| 3 | /recipes/locks-and-mutexes | recipes |
| 4 | /recipes/database-indexing | recipes |
| 5 | /recipes/database-connection-pooling | recipes |
| 6 | /recipes/deadlock-prevention-sql | recipes |

Todos validados por `content:links` (0 broken).
