# Checklist de arreglos — recipes/parse-toml-files

## 0. Metadata del recurso

| Campo | Valor |
|---|---|
| Tipo | recipes |
| Slug | parse-toml-files |
| Topic | data |
| Título EN | Parse and Write TOML Files: Python, Java & JS Examples |
| Título ES | Analizar TOML: Python, Java y JS con Ejemplos |
| lastUpdated | 2026-08-25 |
| Body words EN | ~2,188 |
| Body words ES | ~2,373 |
| H2 count | 18 / 18 |
| H3 count | 9 / 9 |
| Code blocks | 11 / 11 |
| FAQ questions | 6 (mín 3-5 ✅) |
| Mermaid diagrams | 0 / 0 |
| Companion repo | NO existe |
| URL EN | https://stackpractices.com/recipes/parse-toml-files/ |
| URL ES | https://stackpractices.com/es/recipes/parse-toml-files/ |

## 1. Scorecard y decisiones

| Dimensión | Peso | Score | Estado |
|---|---|---|---|
| Search Intent & SERP Fit | 15 | 13.5 | ✅ |
| Content Quality & Helpfulness | 15 | 13.5 | ✅ |
| Information Gain & Originality | 10 | 9.0 | ✅ |
| Semantic / Topical Coverage | 10 | 9.0 | ✅ |
| Internal Linking & Site Architecture | 8 | 7.5 | ✅ |
| Technical SEO & Indexability | 10 | 9.5 | ✅ |
| On-Page SEO & Frontmatter | 10 | 9.0 | ⚠️ |
| Humanization & AI Patterns | 8 | 5.6 | ⚠️ |
| GEO / AI Search Optimization | 7 | 6.5 | ✅ |
| Bilingual Parity | 7 | 6.5 | ✅ |
| Traffic & Growth Potential | 5 | 4.0 | ✅ |
| Medios visuales / imágenes | 2 | 0.5 | ⚠️ |
| Companion repo | 1 | 0.0 | ⚠️ |
| **TOTAL** | **100** | **84.1** | ⚠️ |

**Decisión: FIX-THEN-PROMOTE** — el recurso es sólido pero tiene issues MEDIUM en humanización (AI detection >40%, rule-of-three ES, FAQ variety) y companion repo faltante.

## 2. Checklist de arreglos

### Critical

(none)

### High

- [ ] **[HIGH] [HUMANIZATION] AI detection EN 47.4% (>40% objetivo)**
  - Why: El contenido EN supera el umbral del 40% recomendado por AGENTS.md.
  - Evidence: `ref/output/ai-detect-parse-toml-files.json` — EN 47.4% AI (53 AI / 82 human / 172 total).
  - How: Revisar prosa narrativa con humanizer skill. Reducir frases formulaicas y estructuras repetitivas. El contenido ya tiene primera persona (61 instancias) y tono casual, pero la densidad de código puede inflar la métrica.
  - Effort: M
  - Source: 04-humanization-audit

- [ ] **[HIGH] [HUMANIZATION] AI detection ES 40.7% (>40% objetivo)**
  - Why: El contenido ES está justo por encima del umbral del 40%.
  - Evidence: `ref/output/ai-detect-parse-toml-files.json` — ES 40.7% AI (35 AI / 100 human / 172 total).
  - How: Mismo enfoque que EN. La diferencia es marginal (0.7pp) pero conviene reducir.
  - Effort: S
  - Source: 04-humanization-audit

### Medium

- [ ] **[MEDIUM] [HUMANIZATION] Rule-of-three pattern en ES (6 instancias)**
  - Why: Listas de tres elementos con coma+y son patrón AI detectado en ES.
  - Evidence: "Python, JavaScript y Java" (x2), "valor, arrays y tablas", "mapas, listas y escalares", "fecha, hora y datetime", "n, schedules y timestamps".
  - How: Reescribir listas de tres con estructuras variadas: "Python y JavaScript, además de Java", "mapas, listas y también escalares" o dividir en dos oraciones.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [HUMANIZATION] FAQ variety EN: 3/6 "How do I" (50%)**
  - Why: La mitad de las preguntas FAQ empiezan con "How do I", patrón formulaico.
  - Evidence: Preguntas EN: "Should I use...", "Can I validate...", "How do I merge...", "Does TOML support...", "How do I handle...", "How do I convert...".
  - How: Variar estructura: "What's the best way to merge...", "When should I handle dates...", "Can I convert...".
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [HUMANIZATION] Passive voice EN (1 instancia)**
  - Why: "is tied" en Production Notes es voz pasiva.
  - Evidence: `src/content/recipes/data/parse-toml-files.md` línea ~283: "tomllib is tied to the Python version".
  - How: "tomllib depends on the Python version" o "tomllib ships with the Python version".
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [SEO] ES metaDescription 162 chars (>160 recomendado)**
  - Why: 162 chars supera el recomendado de 160 aunque está dentro del hard max de 170.
  - Evidence: `src/content/recipes/data/parse-toml-files.es.md` frontmatter metaDescription.
  - How: Acortar a ≤160 chars. Ej: "Analiza archivos TOML en Python, Java y JavaScript. Lee, escribe, valida configs, maneja nesting y evita CVEs con ejemplos de código." (148 chars).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [COMPANION] Companion repo no existe**
  - Why: `../stack-practices-resources/resources/recipes/data/parse-toml-files/` no existe.
  - Evidence: `Test-Path` returns False.
  - How: Crear companion con meta.json + archivos de ejemplo (pyproject.toml, config.toml, parse_toml.py, parse_toml.js, parse_toml.java) + README EN/ES.
  - Effort: M
  - Source: 09-companion-media-audit

### Low

- [ ] **[LOW] [MEDIA] Sin diagrama Mermaid**
  - Why: El recurso no tiene diagramas visuales. Es opcional según AGENTS.md.
  - Evidence: 0 bloques mermaid en EN y ES.
  - How: Considerar un flowchart simple del flujo parse → validate → merge, pero solo si aporta claridad. El contenido es simple enough sin diagrama.
  - Effort: S
  - Source: 09-companion-media-audit

- [ ] **[LOW] [CONTENT] lastUpdated stale (2026-08-25)**
  - Why: Si se edita el recurso, debe actualizarse lastUpdated.
  - Evidence: Frontmatter date 2026-08-25.
  - How: Actualizar a la fecha de edición cuando se apliquen mejoras.
  - Effort: S
  - Source: 02-seo-audit

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos.
- [ ] Todos los HIGH resueltos (AI detection EN <40%, ES <40%).
- [ ] Build pasa sin errores.
- [ ] Companion repo build pasa.
- [ ] Verificación móvil sin overflow.
- [ ] Paridad EN/ES verificada.
- [ ] Rule-of-three ES reducido a 0-2 instancias.
- [ ] FAQ variety EN <30% "How do I".
- [ ] Passive voice EN corregida.
- [ ] ES metaDescription ≤160 chars.
- [ ] Companion repo creado con meta.json + archivos.

## 4. Top 5 acciones

1. **Reducir AI detection EN (47.4% → <40%)** — HIGH, humanizer skill sobre prosa EN
2. **Reducir AI detection ES (40.7% → <40%)** — HIGH, humanizer skill sobre prosa ES
3. **Reducir rule-of-three ES (6 → 0-2)** — MEDIUM, variar listas de tres elementos
4. **Variar FAQ structure EN (50% → <30% "How do I")** — MEDIUM, reescribir 2-3 preguntas
5. **Crear companion repo** — MEDIUM, meta.json + 5 archivos + README EN/ES

## 5. Veredicto

Recurso de buena calidad (84.1/100) con prosa humana y primera persona sólida, pero necesita una ronda de humanización para bajar AI detection del 47% al <40%, variar FAQ y reducir rule-of-three en ES.

## 6. Anexos

### Validación técnica

| Comando | Estado | Output |
|---|---|---|
| `npm run content:quality` | PASS | All content passes quality validation |
| `npm run content:links` | PASS | 0 broken relatedResources |
| `npm run content:validate` | PASS | 0 errors, 0 warnings |
| `npm run check` | PASS | 0 errors, 0 warnings, 4 hints |
| `npm run build` | PASS | 3,258 páginas, SRI hashes añadidos |

### Verificación post-build

| Check | EN | ES |
|---|---|---|
| TechArticle | ✅ | ✅ |
| FAQPage | ✅ | ✅ |
| BreadcrumbList | ✅ | ✅ |
| SpeakableSpecification | ✅ | ✅ |
| id="recipe-summary" | ✅ | ✅ |
| id="faq-content" | ✅ | ✅ |
| Canonical self-referencing | ✅ | ✅ |
| hreflang en/es | ✅ | ✅ |
| og:title/description/image/url/locale | ✅ | ✅ |
| viewport | ✅ | ✅ |
| /lightbox.js presente | ✅ | ✅ |
| H1 from frontmatter | ✅ | ✅ |
| Sitemap presence | ✅ | ✅ |

### IA Detection (línea base)

| Idioma | AI% | AI sentences | Human sentences | Total | Patrones |
|---|---|---|---|---|---|
| EN | 47.4% | 53 | 82 | 172 | 0 |
| ES | 40.7% | 35 | 100 | 172 | 0 |

### Móvil (verificación estructural)

| Check | Estado |
|---|---|
| `<meta name="viewport">` presente | ✅ |
| CSS responsive (Tailwind) | ✅ |
| Sin elementos width fijo > 375px | NOT VERIFIED (requiere navegador) |
| Click-to-zoom en móvil | N/A (sin diagramas) |

### Hallazgos descartados como falsos positivos

| Hallazgo | Razón |
|---|---|
| 7 H1 manuales en el body | FALSO: Son comentarios Python/TOML dentro de code blocks (`# tomllib is...`, `# Dotted keys`, etc.) |
| Sin diagrama Mermaid es violación | FALSO: Mermaid es opcional según AGENTS.md. El recipe es simple enough sin diagrama. |
| Secciones "What Works", "Troubleshooting", "Further Reading" inválidas | FALSO: Alternativas válidas según AGENTS.md |
| Key Takeaways es violación | FALSO: Sección opcional válida |
| 6 relatedResources excede límite | FALSO: El límite es 6 y renderiza los primeros 6 |
