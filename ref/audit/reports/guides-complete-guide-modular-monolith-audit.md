# Checklist de arreglos — guides/complete-guide-modular-monolith (re-auditoría de verificación)

> Re-auditoría ejecutada siguiendo `ref/reaudit-a-resource.md` para confirmar que el recurso mantiene el estado de publicación alcanzado tras la ronda de mejoras.
>
> - Fecha de re-auditoría: 2026-08-29.
> - Score base de esta re-auditoría (estado "ANTES"): 85.0/100.
> - Score verificado esta vez (estado "DESPUÉS"): 85.0/100.
> - Histórico: auditoría inicial 58.0/100 → primera re-auditoría 85.0/100 → re-auditoría actual 85.0/100.

---

## 0. Metadata del recurso

- **Tipo (contentType):** guides
- **Slug:** complete-guide-modular-monolith
- **Topic:** architecture
- **Ruta EN:** `src/content/guides/architecture/complete-guide-modular-monolith.md`
- **Ruta ES:** `src/content/guides/architecture/complete-guide-modular-monolith.es.md`
- **URL producción EN:** `https://stackpractices.com/guides/complete-guide-modular-monolith/`
- **URL producción ES:** `https://stackpractices.com/es/guides/complete-guide-modular-monolith/`
- **Título EN:** `Modular Monolith: Module Boundaries, Shared Kernel` (50 chars) — línea 4 del EN
- **Título ES:** `Modular Monolith: Límites de Módulos y Shared Kernel` (52 chars) — línea 4 del ES
- **metaDescription EN:** 154 chars — línea 6 del EN
- **metaDescription ES:** 145 chars — línea 6 del ES
- **description EN:** 151 chars — línea 5 del EN
- **description ES:** 156 chars — línea 5 del ES
- **lastUpdated:** 2026-08-29 — línea 25 de ambos archivos
- **publishedAt:** 2026-07-06
- **difficulty:** advanced
- **author:** Mathias Paulenko
- **estimatedReadTime:** 28
- **relatedResources:** 6 slugs, mismo orden EN/ES — líneas 18-24 de ambos archivos
- **Body words (prosa, sin bloques de código):** EN 3.478 / ES 3.619 (medición con split() tras eliminar bloques ```)
- **H2 / H3:** 18 / 21 en ambos idiomas
- **H4:** 0 en ambos idiomas
- **Bloques de código (excluyendo mermaid):** 13 en ambos idiomas
- **Bloques Mermaid:** 2 EN / 2 ES
- **Internal body links:** 3 en cada idioma
- **External links:** 8 oficiales en `## See Also` / `## Referencias`
- **FAQ pairs:** 5 en cada idioma
- **Mermaid SVGs generados:** `complete-guide-modular-monolith-1.svg`, `-2.svg`, `-es-1.svg`, `-es-2.svg` en `public/assets/diagrams/` y `dist/assets/diagrams/`
- **AI Desklib:** EN 39.1%, ES 39.5% (ambos < 40%)
- **pattern_totals:** vacío en ambos idiomas
- **Companion repo:** No existe y no aplica (snippets inline)

---

## 1. Scorecard comparativo (antes vs después)

El estado "ANTES" de esta tabla es el score final de la re-auditoría anterior. El estado "DESPUÉS" es la verificación actual.

| Dimensión | Antes | Después | Cambio | Estado |
|-----------|-------|---------|--------|--------|
| SEO On-Page | 15/15 | 15/15 | 0 | ✅ |
| SEO Técnico | 10/10 | 10/10 | 0 | ✅ |
| Calidad de contenido | 24/25 | 24/25 | 0 | ✅ |
| Humanización | 13/15 | 13/15 | 0 | ✅ |
| Paridad bilingüe | 10/10 | 10/10 | 0 | ✅ |
| Medios visuales | 5/5 | 5/5 | 0 | ✅ |
| Companion repo | 3/3 | 3/3 | 0 | ✅ (N/A) |
| GEO / AI Search | 5/5 | 5/5 | 0 | ✅ |
| **TOTAL** | **85.0/100** | **85.0/100** | **0** | ✅ |

**Interpretación del cambio:** 0 puntos → **SIN CAMBIOS**. El recurso mantiene el score PROMOTE. No hay regresiones.

### 1.1 Detalle por dimensión

#### SEO On-Page — 15/15 (ANTES: 15/15)

- title EN 50 chars, title ES 52 chars: ambos ≤ 60.
- metaDescription EN 154 chars, ES 145 chars: dentro de 50-170, con coincidencia exacta entre frontmatter top-level y `seo.metaDescription`.
- `relatedResources` 6 slugs, mismo orden EN/ES, sin barra final.
- `lastUpdated` actualizado a 2026-08-29.
- Sin H1 manual en el body; empieza con `## Overview` / `## Visión General`.
- Jerarquía H2 → H3 sin saltos; sin H4.
- Secciones válidas: `What Works` / `Lo que Funciona`, `What to Avoid` / `Lo que Conviene Evitar` y `See Also` / `Referencias` son alternativas aceptadas según `src/content/guides/AGENTS.md`.

#### SEO Técnico — 10/10 (ANTES: 10/10)

- Slug kebab-case único.
- `public/sitemap.xml` y `dist/sitemap.xml` incluyen ambas URLs con `lastmod 2026-08-29` y `hreflang` correcto.
- Structured data `TechArticle` + `FAQPage` + `BreadcrumbList` + `speakable` + `inLanguage` + `educationalLevel` presentes en el HTML del build.
- Internal links con trailing slash: 3 enlaces contextuales en el body, todos terminan en `/`.
- Canonical self-referencing EN y ES presentes.
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:locale`) presentes.
- Paridad técnica EN/ES: H2 18 vs 18, H3 21 vs 21, bloques de código 13 vs 13, mermaid 2 vs 2.

#### Calidad de contenido — 24/25 (ANTES: 24/25)

- Body words supera ampliamente el mínimo de 3.000 para guides (3.478/3.619).
- Thin content: **NONE**.
- Information gain: **HIGH** (tabla comparativa con otras arquitecturas, árbol de decisión, hoja de ruta de migración, capas anticorrupción, testing de arquitectura con dependency-cruiser, ArchUnit, Nx y trade-offs reales).
- Riesgo sobre-optimización: **LOW**.
- FAQ count: 5 pares en cada idioma, variadas (What/How/Why/Can/When en EN; Qué/Cómo/Por qué/Puede/Cuándo en ES).
- Duplicación/canibalización: **LOW** (sigue existiendo `/patterns/modular-monolith-pattern/`, pero la guía es una versión larga y narrativa; no se considera canibalización crítica).
- Riesgo contenido programático: **LOW**.
- Page-worthiness: **YES**.
- Se descuenta 1 punto por la residual superposición temática con el patrón y por el AI detection en el límite.

#### Humanización — 13/15 (ANTES: 13/15)

- Red words (`delve`, `leverage`, `robust`, `seamless`, etc.): **0** en ambos idiomas.
- Frases genéricas tipo "In this guide covers": **0**; solo aparecen 2 usos de "In this guide" / "En esta guía" en contexto natural, no como relleno.
- Em dashes: **0** en ambos archivos.
- Variedad FAQ: 80% de las preguntas no empiezan con "How do I" / "¿Cómo".
- Primera persona presente en ambos idiomas; paridad humanización EN/ES: **PASS**.
- AI Desklib 39.1% EN y 39.5% ES; ambos < 40% y `pattern_totals` vacío.
- Se descuentan 2 puntos porque ambos idiomas siguen cerca del umbral del detector.

#### Paridad bilingüe — 10/10 (ANTES: 10/10)

- H2 18 vs 18, H3 21 vs 21.
- Code blocks 13 vs 13, mermaid 2 vs 2.
- Frontmatter con `title`, `metaDescription`, `description`, `keywords`, `relatedResources` y `lastUpdated` traducidos y alineados.
- `relatedResources` 6 slugs, mismo orden.
- Primera persona presente en ambos; secciones ausentes en ES: **ninguna**.
- Longitudes de cuerpo: EN 3.478 / ES 3.619, diferencia < 5%.

#### Medios visuales — 5/5 (ANTES: 5/5)

- 2 bloques Mermaid EN y 2 ES, ambos con `flowchart LR`.
- SVGs generados y presentes en `public/assets/diagrams/` y `dist/assets/diagrams/`.
- HTML del build contiene 2 `<img class="mermaid-diagram">` en EN y ES.
- `/lightbox.js` presente en ambas páginas.
- Imágenes con `alt`, `loading="lazy"`, `tabindex="0"`, `role="button"`.
- Sin código mermaid raw como texto en el HTML.
- Verificación estructural móvil: `<meta name="viewport" content="width=device-width, initial-scale=1.0">` presente, CSS responsive con Tailwind, `.mermaid-diagram` se renderiza dentro de un layout fluido.

#### Companion repo — 3/3 (ANTES: 3/3)

- No aplica para esta guía: los ejemplos son snippets inline en el cuerpo del Markdown. No se requiere repo companion según `src/content/guides/AGENTS.md`.
- Directorio `../stack-practices-resources/resources/guides/architecture/complete-guide-modular-monolith/` no existe, confirmado con `Get-ChildItem -ErrorAction SilentlyContinue`.

#### GEO / AI Search — 5/5 (ANTES: 5/5)

- Claridad de entidades: **HIGH**.
- Densidad factual: **HIGH**.
- Citas: **SUFFICIENT** (8 enlaces oficiales: Martin Fowler, DDD Community, ArchUnit, Dependency Cruiser, RabbitMQ, Kafka, gRPC, Team Topologies).
- Pasajes extraíbles: **HIGH** (FAQ, tabla comparativa, listas numeradas de migración).
- Structured data IA: `inLanguage`, `educationalLevel`, `speakable` presentes.
- Paridad GEO bilingüe: **PASS**.

---

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

Los siguientes items fueron resueltos en la ronda de mejoras anterior y permanecen resueltos en esta re-auditoría.

- [x] **[CRITICAL] [CONTENT] Cuerpo muy por debajo del mínimo para guides**
  - Evidence: `src/content/guides/architecture/complete-guide-modular-monolith.md` y `.es.md`.
  - Estado verificado: EN 3.478 / ES 3.619 palabras (mínimo guides 3.000). Medición con split() tras eliminar bloques ```.

- [x] **[HIGH] [HUMANIZATION] EN AI detection por encima del umbral de 40%**
  - Evidence: `ref/output/ai-detect-complete-guide-modular-monolith.json`.
  - Estado verificado: 39.1% EN. `pattern_totals` vacío.

- [x] **[HIGH] [GEO] Sin enlaces externos ni citas oficiales**
  - Evidence: 8 enlaces oficiales en `## See Also` / `## Referencias` (línea 890 EN / 895 ES).
  - Enlaces: Martin Fowler, DDD Community, ArchUnit, Dependency Cruiser, RabbitMQ, Kafka, gRPC, Team Topologies.

- [x] **[HIGH] [CONTENT] Overview empieza con definición genérica en lugar de un problema real**
  - Evidence: `## Overview` / `## Visión General`, línea 46 en ambos archivos.
  - Estado verificado: conserva la apertura narrativa con "I once joined a team..." / "Una vez me sumé a un equipo...".

- [x] **[MEDIUM] [CONTENT] Sin enlaces internos contextuales en el body**
  - Evidence: 3 enlaces internos en el body de cada idioma.
  - Enlaces: `/patterns/modular-monolith-pattern/`, `/guides/layered-architecture-guide/`, `/guides/microservices-architecture-guide/`.

- [x] **[MEDIUM] [MEDIA] Sin diagramas ni imágenes**
  - Evidence: 2 bloques Mermaid en cada idioma (`flowchart LR`): líneas 150-160 y 627-629 EN; 153-163 y 631-633 ES.
  - SVGs generados: `complete-guide-modular-monolith-1.svg`, `-2.svg`, `-es-1.svg`, `-es-2.svg`.

- [x] **[MEDIUM] [CONTENT] Sección `When to Use` no incluye casos donde NO aplica**
  - Evidence: `## When to Use and When Not to Use` / `## Cuándo Usar y Cuándo No Usar` con subsección `### When NOT to use` / `### Cuándo NO usar`.

- [x] **[MEDIUM] [HUMANIZATION] Uso de em dash en múltiples oraciones**
  - Evidence: `em-dashes` = 0 en ambos archivos (verificado con `scripts/diag-resource.py`).

- [x] **[MEDIUM] [HUMANIZATION] ES AI detection cerca del límite de 40%**
  - Evidence: `ref/output/ai-detect-complete-guide-modular-monolith.json`.
  - Estado verificado: 39.5% ES. Sigue < 40% y `pattern_totals` vacío; cumple la Definition of Done. Se recomienda monitorear en auditorías futuras.

- [x] **[LOW] [CONTENT] No hay una sección `Variants` o `What Works` alternativa con tablas comparativas**
  - Evidence: `## Comparison with Other Architectures` / `## Comparativa con Otras Arquitecturas` incluye tabla con Layered Monolith, Modular Monolith, Microservices y SOA.

- [x] **[LOW] [SEO] `description` EN/ES supera levemente los 160 caracteres recomendados**
  - Evidence: `description` EN = 151 chars, ES = 156 chars, ambos dentro del hard max de 170. No requiere acción.

- [x] **[LOW] [MOBILE] Verificación visual móvil no realizada**
  - Evidence: verificación estructural post-build realizada. `<meta name="viewport" content="width=device-width, initial-scale=1.0">` presente en ambas páginas; CSS responsive con Tailwind; `<img class="mermaid-diagram">` con `loading="lazy"` y sin anchos fijos; no se detectan elementos `width` fijo > 375px.

### ⚠️ Pendientes

Ninguno.

### 🔧 Out of scope

- [ ] **[LOW] [TRAFFIC] Sin datos de GSC/GA4**
  - Razón: Requiere acceso a Search Console / GA4 y análisis de SERP real, fuera del scope de esta ronda de contenido.
  - Recomendación: Revisar CTR y posición cuando haya acceso.

### 🔄 Regresiones

Ninguna. (0 regresiones detectadas; todos los comandos de validación pasaron.)

---

## 3. Definition of Done (actualizada)

- [x] Todos los CRITICAL resueltos.
- [x] Todos los HIGH resueltos.
- [x] Body EN y ES supera 3.000 palabras (guides).
- [x] AI detection EN < 40% y ES < 40%; `pattern_totals` vacío.
- [x] Build pasa sin errores (`npm run build` → 3.258 páginas).
- [x] `npm run content:quality` 0 errors, 0 warnings.
- [x] `npm run content:links` 0 rotos.
- [x] `npm run content:validate` 0 errors, 0 warnings.
- [x] `npm run check` 0 errors, 0 warnings (3 hints preexistentes).
- [x] `npm run sitemap` regenerado: 3.256 URLs, 6.602 image entries.
- [x] Sitemap incluye EN y ES con `lastmod 2026-08-29` e `hreflang`.
- [x] Mermaid SVGs renderizados y referenciados correctamente en el build.
- [x] Paridad EN/ES verificada.
- [x] Verificación móvil estructural OK.

---

## 4. Top 5 acciones pendientes

Ninguna.

---

## 5. Veredicto y recomendación

El recurso `complete-guide-modular-monolith` fue re-auditoriado con las mismas dimensiones y scripts que el informe anterior. La puntuación se mantiene en **85.0/100** con **0 regresiones** y todos los comandos de validación superados.

- **PUNTAJE TOTAL:** 85.0/100 (+0 vs re-auditoría anterior; +27.0 vs auditoría inicial).
- **ESTADO PÁGINA:** STRONG.
- **PAGE-WORTHINESS:** YES.
- **RIESGO THIN CONTENT:** NONE.
- **RIESGO CONTENIDO PROGRAMÁTICO:** LOW.
- **RIESGO PATRÓN IA:** LOW-MEDIUM (AI detection cerca del umbral pero `pattern_totals` vacío).
- **SEO TÉCNICO:** PASS.
- **CALIDAD CONTENIDO:** STRONG.
- **GEO READINESS:** STRONG.
- **PARIDAD BILINGÜE:** PASS.

**Recomendación:** `PROMOTE`. El recurso está listo para publicación/push. Todos los CRITICAL y HIGH están resueltos, no hay regresiones, el build pasa y el score total supera el umbral de calidad. El único out of scope son métricas de tráfico reales (GSC/GA4), que no bloquean la publicación.

---

## 6. Anexos

### Anexo 1 — Métricas de contenido

| Métrica | EN | ES |
|---------|----|----|
| Body words (prosa, sin bloques ```) | 3.478 | 3.619 |
| H2 | 18 | 18 |
| H3 | 21 | 21 |
| H4 | 0 | 0 |
| Code blocks (excl. mermaid) | 13 | 13 |
| Mermaid blocks | 2 | 2 |
| Internal body links | 3 | 3 |
| External links | 8 | 8 |
| FAQ pairs | 5 | 5 |
| Title length | 50 | 52 |
| metaDescription length | 154 | 145 |
| description length | 151 | 156 |
| Em dashes | 0 | 0 |
| Red words | 0 | 0 |

### Anexo 2 — AI detection

| Idioma | Desklib `model_ai_pct` | `pattern_totals` | `ai_count` | `human_count` | `total` |
|--------|------------------------|------------------|------------|---------------|---------|
| EN     | 39.1%                  | vacío            | 45         | 142           | 196     |
| ES     | 39.5%                  | vacío            | 56         | 134           | 198     |

Outputs:
- `ref/output/ai-detect-complete-guide-modular-monolith.json`
- `ref/output/ai-detect-patterns-complete-guide-modular-monolith.json`
- `ref/output/ai-detect-patterns-complete-guide-modular-monolith-es.json`

### Anexo 3 — Validación técnica

| Comando | Resultado |
|---------|-----------|
| `npm run content:quality` | ✅ 0 errores, 0 warnings (2.042 archivos) |
| `npm run content:validate` | ✅ 0 errores, 0 warnings (1.021 archivos) |
| `npm run content:links` | ✅ 0 rotos (1.025 archivos, 1.021 recursos indexados) |
| `npm run check` | ✅ 0 errores, 0 warnings; 3 hints preexistentes |
| `npm run mermaid:render` | ✅ 52 SVGs, 0 skipped |
| `npm run build` | ✅ 3.258 páginas OK |
| `npm run sitemap` | ✅ 3.256 URLs, 6.602 image entries |

### Anexo 4 — Verificación post-build

- `dist/guides/complete-guide-modular-monolith/index.html` y `dist/es/guides/complete-guide-modular-monolith/index.html` generados.
- `<meta name="viewport">`, `canonical`, `hreflang`, `og:*` presentes en ambas páginas.
- JSON-LD: `TechArticle`, `FAQPage`, `BreadcrumbList`, `speakable`, `inLanguage`, `educationalLevel` presentes.
- 2 `<img class="mermaid-diagram">` en cada página, apuntando a `/assets/diagrams/complete-guide-modular-monolith-{n}.svg` y `/assets/diagrams/complete-guide-modular-monolith-es-{n}.svg`.
- `/lightbox.js` presente en ambas páginas.
- Sitemap incluye ambas URLs con `lastmod 2026-08-29` e `hreflang`.

### Anexo 5 — Estado del companion repo

- No existe companion repo para esta guía.
- No aplica `node scripts/build-catalog.js` para este recurso (snippets inline).
- Marcado como N/A en el scorecard; no penaliza el puntaje final.
