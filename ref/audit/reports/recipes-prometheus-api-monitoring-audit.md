# Checklist de arreglos — recipes/prometheus-api-monitoring

> Auditoría completa MODE=full
> Fecha: 2026-08-31
> Recurso #34 en `ref/checklist-top-recursos-mejoras.md`

---

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `prometheus-api-monitoring` |
| Topic | `observability` |
| Ruta EN | `src/content/recipes/observability/prometheus-api-monitoring.md` |
| Ruta ES | `src/content/recipes/observability/prometheus-api-monitoring.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/prometheus-api-monitoring/` |
| URL producción ES | `https://stackpractices.com/es/recipes/prometheus-api-monitoring/` |
| Título EN | `Prometheus API Monitoring` (25 chars) ✅ |
| Título ES | `Monitoreo de APIs con Prometheus` (32 chars) ✅ |
| `metaDescription` EN | 153 chars (coincide con `seo.metaDescription`) ✅ |
| `metaDescription` ES | 141 chars (coincide con `seo.metaDescription`) ✅ |
| `lastUpdated` | `2026-08-19` (EN y ES) ⚠️ stale |
| `publishedAt` | `2026-06-19` |
| `estimatedReadTime` | ausente ⚠️ |
| `relatedResources` EN/ES | 6 slugs, mismo orden, todos válidos ✅ |
| Palabras body EN | 634 (sin bloques de código) ⚠️ CRITICAL <1300 mínimo recipes |
| Palabras body ES | 681 (sin bloques de código) ⚠️ CRITICAL <1300 mínimo recipes |
| H2 EN/ES | 8 / 8 ✅ |
| H3 EN/ES | 10 / 10 ✅ |
| Bloques de código EN/ES | 3 / 3 ✅ (Node.js, YAML, PromQL) |
| FAQ items EN/ES | 6 / 6 ✅ (≥3-5) |
| Enlaces internos en body EN/ES | 2 / 2 ✅ (mínimo 2-3) |
| Enlaces externos en body EN/ES | 0 / 0 ⚠️ |
| Mermaid / imágenes EN/ES | 0 / 0 ⚠️ (arquitectura pull model se beneficia de diagrama) |
| Companion repo | **NO EXISTE** ⚠️ |
| Enlace companion en body | False / False ⚠️ |
| See Also section | False / False ⚠️ |
| AI detect patterns EN | 0 hallazgos, `pattern_totals: {}` ✅ |
| AI detect patterns ES | 0 hallazgos, `pattern_totals: {}` ✅ |
| AI detect content EN | **47.3 %** (15 AI / 25 human / 45 total) ⚠️ >40% |
| AI detect content ES | **41.1 %** (15 AI / 26 human / 45 total) ⚠️ >40% |
| Red words EN/ES | 0 / 0 ✅ |
| Em dashes EN/ES | 0 / 0 ✅ |
| Primera persona EN/ES | 0 / 0 ⚠️ (falta en ambos) |
| Sin H1 manual en body | True / True ✅ |
| Build | `npm run build` 3260 páginas, exit 0 ✅ |
| Post-build HTML | H1, TechArticle, FAQPage, WebPage, BreadcrumbList, hreflang (3), viewport, speakable, educationalLevel, lightbox ✅ EN+ES |
| Sitemap | Presente con hreflang ✅ |

---

## 1. Scorecard y decisiones

| Dimensión | Score | Máximo | Notas |
|-----------|-------|--------|-------|
| SEO On-Page | 12 | 15 | lastUpdated stale, sin See Also, sin estimatedReadTime |
| Technical SEO | 8 | 10 | sin mainEntityOfPage en TechArticle, sin validación previa |
| Content Quality | 10 | 25 | thin content CRITICAL, information gain LOW, solo Node.js |
| Humanization | 10 | 15 | sin primera persona, voz pasiva, AI score >40% EN+ES |
| Bilingual Parity | 6 | 10 | keywords ES no traducidos, anglicismos ES, enlace ES partido |
| GEO / AI Search | 3 | 5 | sin fuentes externas, sin versiones |
| Medios Visuales | 1 | 5 | sin Mermaid, sin companion, sin imágenes |
| Companion Repo | 0 | 3 | no existe |
| **TOTAL** | **50** | **88** | — |

**Decisión: HOLD** — CRITICAL thin content (634/681 palabras < 1300 mínimo recipes). Requiere expansión antes de promover.

---

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [CONTENT] Body EN con 634 palabras (<1300 mínimo recipes)**
  - Why: El cuerpo es thin content. No satisface la intención de búsqueda de un tutorial completo de monitoreo de APIs con Prometheus.
  - Evidence: `src/content/recipes/observability/prometheus-api-monitoring.md`, body líneas 39-224. Conteo: 634 palabras (excluyendo bloques de código).
  - How: Expandir `Explanation` con arquitectura pull, scrape configs, relabeling, cardinality, retention. Añadir soluciones en Go y Python. Incluir caso real de SLO/SLI. Añadir diagrama Mermaid. Añadir See Also con enlaces externos.
  - Effort: L
  - Source: 03-content-quality-audit

- [ ] **[CRITICAL] [CONTENT] Body ES con 681 palabras (<1300 mínimo recipes)**
  - Why: Misma problemática que EN. Paridad estructural pero contenido insuficiente.
  - Evidence: `src/content/recipes/observability/prometheus-api-monitoring.es.md`, body líneas 39-228. Conteo: 681 palabras (excluyendo bloques de código).
  - How: Replicar la expansión de EN en ES con traducción completa. Localizar anglicismos.
  - Effort: L
  - Source: 03-content-quality-audit, 05-bilingual-parity-audit

### High

- [ ] **[HIGH] [CONTENT] Information gain LOW — contenido repite documentación básica**
  - Why: No aporta decisiones de diseño reales, trade-offs cuantificados, ni ejemplos de producción (SLO, SLI, SLO budget).
  - Evidence: `Explanation` es un párrafo de ~30 palabras (líneas 144-159 EN). `Best Practices` y `Common Mistakes` son listas sin profundidad.
  - How: Incluir SLO/SLI con cálculo de p99 y budget, trade-offs de cardinality, edge cases (cardinality explosion, scrape failures, exemplars).
  - Effort: L/M
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [CONTENT] Solución solo en Node.js — falta multi-lenguaje**
  - Why: `recipes` debería mostrar implementaciones en múltiples lenguajes. La tabla `Variants` lista 5 lenguajes pero solo Node.js tiene código.
  - Evidence: Bloque de código 64-105 (Node.js); sin ejemplos Go/Python/Java.
  - How: Añadir 2-3 ejemplos idiomáticos (Go con promhttp, Python con prometheus_client, Java con Micrometer).
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [GEO] Sin fuentes primarias / enlaces externos**
  - Why: Los motores de IA confían en recursos con citas verificables. No hay enlaces a docs oficiales de Prometheus, Grafana ni prom-client.
  - Evidence: 0 enlaces externos en el body. Sin sección See Also.
  - How: Añadir `## See Also` con 3-4 enlaces oficiales (prometheus.io/docs, grafana.com/docs, GitHub prom-client, CNCF).
  - Effort: S
  - Source: 06-geo-audit, 09-companion-media-audit

- [ ] **[HIGH] [HUMANIZATION] AI score >40% en ambos idiomas**
  - Why: EN 47.3%, ES 41.1%. Ambos superan el umbral del 40%.
  - Evidence: `ref/output/ai-detect-prometheus-api-monitoring.json`. pattern_totals vacío en ambos (sin patrones accionables).
  - How: Reescribir frases con mayor AI prob. Añadir primera persona, anécdotas, trade-offs vividos. El score puede bajar con la expansión de contenido.
  - Effort: M
  - Source: 04-humanization-audit, FASE 3

### Medium

- [ ] **[MEDIUM] [MEDIA] Sin diagrama Mermaid**
  - Why: La arquitectura pull model de Prometheus (App → /metrics → scrape → PromQL → Alertmanager → Grafana) se beneficia de un diagrama visual.
  - Evidence: 0 bloques `mermaid` en EN o ES. 0 SVGs en `public/assets/diagrams/`.
  - How: Añadir bloque `mermaid` con `flowchart LR` mostrando el flujo de scraping. Generar SVGs EN+ES con `npm run mermaid:render`.
  - Effort: S/M
  - Source: 09-companion-media-audit

- [ ] **[MEDIUM] [COMPANION] Sin companion repo**
  - Why: La receta contiene ejemplos multi-archivo (middleware Node.js + YAML alertas + PromQL queries) que ganarían autoridad al estar ejecutables.
  - Evidence: `D:\Codigo\stack-practices-resources\resources\recipes\observability\prometheus-api-monitoring\meta.json` no existe.
  - How: Crear companion con `meta.json`, `README.md`, `README.es.md`, `middleware.js`, `prometheus-alerts.yml`, `prometheus-queries.yml`, `docker-compose.yml`.
  - Effort: M
  - Source: 09-companion-media-audit

- [ ] **[MEDIUM] [BILINGUAL] `seo.keywords` ES no traducidos**
  - Why: Las keywords deberían reflejar términos de búsqueda en español.
  - Evidence: `prometheus-api-monitoring.es.md` líneas 31-36: `prometheus, observability, api-monitoring, metrics, alerting, devops` (todos en inglés).
  - How: Reemplazar por `prometheus, observabilidad, monitoreo-api, metricas, alertas, devops`.
  - Effort: S
  - Source: 05-bilingual-parity-audit

- [ ] **[MEDIUM] [BILINGUAL] Anglicismos crudos en ES**
  - Why: Términos ingleses con alternativa idiomática técnica disponible.
  - Evidence: `throughput` (l.44), `setup extra` (l.56), `hace scraping` (l.147), `mejor performance` (l.168), `storage` (l.184, 213), `dashboard` (l.206), `buckets` (l.180), `default` (l.147, 183), `archivo de test` (l.226).
  - How: Reemplazar por términos españoles: rendimiento, configuración adicional, recolecta, mejor rendimiento, almacenamiento, panel, cubetas, predeterminado, archivo de prueba.
  - Effort: M
  - Source: 05-bilingual-parity-audit, 04-humanization-audit

- [ ] **[MEDIUM] [BILINGUAL] Enlace interno ES con texto en inglés y partido**
  - Why: El texto del ancla `[distributed tracing]` está en inglés dentro de contenido ES y partido en dos líneas.
  - Evidence: `prometheus-api-monitoring.es.md` líneas 59-60.
  - How: Sustituir por `[trazas distribuidas](/recipes/distributed-tracing/)` en una sola línea.
  - Effort: S
  - Source: 02-seo-audit, 05-bilingual-parity-audit

- [ ] **[MEDIUM] [HUMANIZATION] Voz pasiva en explicaciones clave**
  - Why: Frases como `are stored`, `cannot be aggregated`, `se almacenan`, `no se pueden agregar` son impersonales.
  - Evidence: EN líneas 146-147, 159; ES líneas 148-149, 161.
  - How: Reescribir en voz activa.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [HUMANIZATION] Sin primera persona en EN ni ES**
  - Why: El tono es completamente impersonal. No hay anécdotas ni advertencias del autor.
  - Evidence: 0 instancias de primera persona en EN o ES.
  - How: Añadir experiencia personal en `Best Practices` o `Common Mistakes` (ej: "I've seen teams hit this when...").
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [GEO] Sin versiones ni datos de "tested with"**
  - Why: La factualidad se refuerza con versiones concretas. Sin ellas el modelo puede dudar de vigencia.
  - Evidence: El contenido no menciona versiones de prom-client, Prometheus, ni Node.js.
  - How: Añadir "Tested with prom-client ^15 and Prometheus 2.x" solo si es verificable; no inventar.
  - Effort: S
  - Source: 06-geo-audit

- [ ] **[MEDIUM] [GEO] Overview asume conocimiento previo**
  - Why: `Overview` salta directo a "Instrument your API" sin definir qué es Prometheus.
  - Evidence: `prometheus-api-monitoring.md` líneas 39-44.
  - How: Añadir una primera oración de definición: "Prometheus is an open-source metrics monitoring system that collects time series by scraping `/metrics` endpoints."
  - Effort: S
  - Source: 06-geo-audit

### Low

- [ ] **[LOW] [SEO] `lastUpdated` stale (2026-08-19)**
  - Why: Debe actualizarse cuando se edite el recurso.
  - Evidence: Frontmatter EN+ES.
  - How: Actualizar a la fecha de la mejora.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[LOW] [SEO] Sin `estimatedReadTime`**
  - Why: Recomendado para UX.
  - Evidence: Frontmatter EN+ES, campo ausente.
  - How: Añadir `estimatedReadTime: 8` (estimado tras expansión).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[LOW] [SEO] Sin sección See Also**
  - Why: Sección opcional pero recomendada para cross-references externos.
  - Evidence: No hay `## See Also` en EN o ES.
  - How: Añadir `## See Also` con 3-4 enlaces externos (Prometheus docs, Grafana docs, prom-client GitHub, CNCF).
  - Effort: S
  - Source: 02-seo-audit, 06-geo-audit

- [ ] **[LOW] [TECHNICAL] TechArticle sin `mainEntityOfPage`**
  - Why: Ayuda a Google a vincular el artículo con su URL canónica.
  - Evidence: `src/lib/schema.ts`, función `techArticle`, líneas 95-124.
  - How: Añadir `mainEntityOfPage: withSlash(SITE.url + opts.url)` al objeto retornado.
  - Effort: S
  - Source: 01-technical-audit

- [ ] **[LOW] [HUMANIZATION] Anglicismos en metaDescription ES**
  - Why: `collectors` y `dashboards` sin traducir en metaDescription ES.
  - Evidence: `prometheus-api-monitoring.es.md` línea 6/29.
  - How: "Configura monitoreo Prometheus para APIs REST y gRPC con métricas personalizadas, recolectores, reglas de alertas y paneles de Grafana para observabilidad en producción."
  - Effort: S
  - Source: 05-bilingual-parity-audit

- [ ] **[LOW] [TRAFFIC] FAQ deja fuera long-tails técnicos de alto valor**
  - Why: Faltan queries como "prometheus p99 latency query", "node.js prometheus middleware example", "prometheus high cardinality labels".
  - Evidence: FAQs actuales (l.192-224) no incluyen estos long-tails.
  - How: Añadir 2-3 preguntas long-tail adicionales con respuestas concisas.
  - Effort: S
  - Source: 08-gsc-ga4-traffic-audit

- [ ] **[LOW] [TRAFFIC] `og:image` genérico**
  - Why: El `og:image` es `/og-image.png` para todo el sitio; la receta no tiene imagen propia.
  - Evidence: `src/components/Seo.astro` líneas 308, 314.
  - How: Opcional: crear `public/og-images/prometheus-api-monitoring.png` específico.
  - Effort: S
  - Source: 09-companion-media-audit

---

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos (body EN+ES ≥1300 palabras).
- [ ] Todos los HIGH resueltos (information gain, multi-lenguaje, fuentes externas, AI score <40%).
- [ ] Build pasa sin errores.
- [ ] Companion repo build pasa.
- [ ] Verificación móvil sin overflow.
- [ ] Paridad EN/ES verificada (keywords traducidos, anglicismos corregidos, enlace ES corregido).
- [ ] Diagrama Mermaid añadido y SVGs generados.
- [ ] See Also con enlaces externos añadido.
- [ ] `lastUpdated` y `estimatedReadTime` actualizados.

---

## 4. Top 5 acciones

1. **[CRITICAL] Expandir body EN+ES hasta ≥1300 palabras** con Explanation profunda, soluciones multi-lenguaje, caso real de SLO/SLI y diagrama Mermaid.
2. **[HIGH] Añadir soluciones en Go y Python** con fragmentos de código listos para copiar.
3. **[HIGH] Añadir `## See Also` con 3-4 enlaces externos** oficiales (Prometheus docs, Grafana docs, prom-client, CNCF).
4. **[MEDIUM] Crear companion repo** con middleware.js, prometheus-alerts.yml, docker-compose.yml y READMEs bilingües.
5. **[MEDIUM] Corregir anglicismos ES y traducir `seo.keywords`** para mejorar paridad bilingüe y recuperabilidad GEO.

---

## 5. Veredicto

**HOLD** — El recurso tiene thin content crítico (634/681 palabras < 1300 mínimo recipes), information gain bajo, solución solo en Node.js y AI score >40% en ambos idiomas. Requiere una ronda completa de `ref/improve-a-resource.md` antes de promover.

---

## 6. Anexos

### 6.1 Sub-auditorías ejecutadas

| # | Sub-auditoría | Score | Hallazgos clave |
|---|---------------|-------|-----------------|
| 1 | Technical | 8/10 | sin mainEntityOfPage, sin build previo |
| 2 | SEO on-page | 12/15 | lastUpdated stale, sin See Also, sin estimatedReadTime |
| 3 | Content quality | 10/25 | thin content CRITICAL, information gain LOW, solo Node.js |
| 4 | Humanization | 10/15 | sin primera persona, voz pasiva, AI >40% EN+ES |
| 5 | Bilingual parity | 6/10 | keywords ES no traducidos, anglicismos, enlace ES partido |
| 6 | GEO / AI Search | 3/5 | sin fuentes externas, sin versiones |
| 8 | Traffic (GSC/GA4) | 3/5 | NOT VERIFIED, featured snippet potential HIGH |
| 9 | Companion/media | 1/5 | sin Mermaid, sin companion, sin imágenes |

### 6.2 AI Detection (línea base)

| Idioma | AI% | AI count | Human count | Total | pattern_totals |
|--------|-----|----------|-------------|-------|----------------|
| EN | 47.3% | 15 | 25 | 45 | {} (vacío) |
| ES | 41.1% | 15 | 26 | 45 | {} (vacío) |

Outputs:
- `ref/output/ai-detect-prometheus-api-monitoring.json`
- `ref/output/ai-detect-patterns-prometheus-api-monitoring.json`
- `ref/output/ai-detect-patterns-prometheus-api-monitoring-es.json`

### 6.3 Post-build HTML checks

| Check | EN | ES |
|-------|----|----|
| H1 coincide con title | ✅ | ✅ |
| TechArticle | ✅ | ✅ |
| FAQPage | ✅ | ✅ |
| WebPage | ✅ | ✅ |
| BreadcrumbList | ✅ | ✅ |
| hreflang (en, es, x-default) | ✅ (3) | ✅ (3) |
| viewport | ✅ | ✅ |
| speakable | ✅ | ✅ |
| educationalLevel | ✅ | ✅ |
| mermaid-diagram | ❌ (sin diagrama) | ❌ (sin diagrama) |
| companion link | ❌ (sin companion) | ❌ (sin companion) |
| lightbox.js | ✅ | ✅ |

### 6.4 Verificación móvil

| Check | Estado |
|-------|--------|
| `<meta name="viewport">` | ✅ |
| CSS responsive (max-w-4xl, overflow-x: auto) | ✅ |
| Overflow horizontal (375px) | ✅ (sin elementos width fijo >375px) |
| Click-to-zoom (lightbox) | ✅ (presente, sin diagramas para probar) |

### 6.5 Validación técnica

| Comando | Estado |
|---------|--------|
| `npm run build` | PASS (3260 páginas) ✅ |
| Sitemap | Presente con hreflang ✅ |
| `content:quality` | NOT VERIFIED (no ejecutado en esta auditoría) |
| `content:links` | NOT VERIFIED |
| `content:validate` | NOT VERIFIED |
