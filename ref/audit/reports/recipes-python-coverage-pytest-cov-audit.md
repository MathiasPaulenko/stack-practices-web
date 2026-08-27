# Re-auditoría — recipes/python-coverage-pytest-cov

> Re-auditoría tras ronda de mejoras (`ref/improve-a-resource.md` → `ref/reaudit-a-resource.md`).

## 0. Metadata del recurso

- **Checklist #:** 5
- **Tipo (contentType):** recipes
- **Slug:** python-coverage-pytest-cov
- **Topic:** testing
- **Ruta EN:** `src/content/recipes/testing/python-coverage-pytest-cov.md`
- **Ruta ES:** `src/content/recipes/testing/python-coverage-pytest-cov.es.md`
- **URL producción EN:** `https://stackpractices.com/recipes/python-coverage-pytest-cov/`
- **URL producción ES:** `https://stackpractices.com/es/recipes/python-coverage-pytest-cov/`
- **Título EN:** `Measure and Enforce Python Test Coverage with pytest-cov` (56 caracteres)
- **Título ES:** `Medir y Exigir Cobertura de Tests con pytest-cov` (48 caracteres)
- **metaDescription EN:** 146 caracteres ("Measure and enforce Python test coverage...").
- **metaDescription ES:** 148 caracteres ("Mide y exige cobertura de tests en Python...").
- **lastUpdated:** `2026-08-27` (EN/ES)
- **publishedAt:** `2026-07-05`
- **Palabras EN/ES (body):** 1987 / 1987
- **Bloques de código EN/ES:** 25 / 25
- **H2 / H3:** 13 / 33 (ambas versiones)
- **Preguntas FAQ:** 10 / 10
- **Diagramas Mermaid:** 1 / 1 (flowchart LR)
- **SVGs:** `public/assets/diagrams/python-coverage-pytest-cov-1.svg`, `...-es-1.svg`
- **Companion repo:** `../stack-practices-resources/resources/recipes/testing/python-coverage-pytest-cov/`

## 1. Scorecard comparativo (ANTES vs DESPUÉS)

**Puntaje global: 84.3/100 → 93.5/100 (+9.2)** — **MEJORA SIGNIFICATIVA**

| Dimensión | Antes | Después | Cambio | Estado | Justificación |
|---|---|---|---|---|---|
| SEO On-Page | 13/15 | 14/15 | +1.0 | ✅ | Títulos < 60, metaDescription dentro de límites, relatedResources ok, `lastUpdated` actualizado. |
| SEO Técnico | 8/10 | 9/10 | +1.0 | ✅ | Build, sitemap, hreflang, canonical, structured data TechArticle/FAQ/Breadcrumb/Speakable OK. Falta `WebPage` schema. |
| Calidad Contenido | 20/25 | 23/25 | +3.0 | ✅ | 1987 palabras, FAQ 10, tabla comparativa, companion; AI% < 40. |
| Humanización | 7/15 | 12/15 | +5.0 | ✅ | Primera persona fuerte, rule-of-three 0, 0 patrones detectados. Cierres de FAQ variados; `dig into` eliminado. |
| Paridad Bilingüe | 7/10 | 9/10 | +2.0 | ✅ | H2/H3/código/frontmatter iguales. Anglicismos en ES reducidos (`seteado`, `fetchead`, etc.). |
| Medios Visuales | 1/5 | 4.5/5 | +3.5 | ✅ | Mermaid flowchart LR, SVGs renderizados, alt+loading+lightbox, viewport OK. Clase img es `pi` en lugar de `mermaid-diagram`; sin `tabindex="0"`. |
| Companion Repo | 0/3 | 3/3 | +3.0 | ✅ | `meta.json`, READMEs, archivos ejecutables, catálogo build OK. |
| GEO / AI Search | 4/5 | 4.5/5 | +0.5 | ✅ | FAQ variada (70% EN, 60% ES no empiezan con "How do I"/"¿Cómo"), speakable, inLanguage, educationalLevel. |

**TOTAL: 84.3/100 → 93.5/100 (+9.2)** — MEJORA SIGNIFICATIVA

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

- [x] **[HIGH] [HUMANIZATION] Ausencia de voz en primera persona.**
  - Evidence: EN ~39, ES ~20 instancias. Overview, When to Use, Explanation, Best Practices, Common Mistakes, Key Takeaways.
  - Verificación: `python-coverage-pytest-cov.md` y `.es.md`.

- [x] **[HIGH] [SEO] `lastUpdated` stale.**
  - Evidence: `2026-08-13` → `2026-08-27`.

- [x] **[HIGH] [LINT] Líneas de body superaban 120 caracteres.**
  - Evidence: reestructuración de párrafos y bullets; máximo actual 120.

- [x] **[MEDIUM] [MEDIA] Sin diagrama Mermaid.**
  - Evidence: bloque mermaid en `Explanation`; 18 SVGs renderizados; HTML contiene `<img src="/assets/diagrams/python-coverage-pytest-cov-1.svg" ... loading="lazy">`.

- [x] **[MEDIUM] [COMPANION] No existe companion repo.**
  - Evidence: creado `../stack-practices-resources/resources/recipes/testing/python-coverage-pytest-cov/`; `node scripts/build-catalog.js` → 5 resources.

- [x] **[MEDIUM] [HUMANIZATION] Rule-of-three en ES.**
  - Evidence: 1 → 0 patrones detectados.

- [x] **[MEDIUM] [CONTENT] Overview empieza con definición en lugar de problema.**
  - Evidence: apertura con anécdota de PR verde con lógica no testeada.

- [x] **[MEDIUM] [CONTENT] Sin tabla comparativa de formatos.**
  - Evidence: añadida H3 "Choosing a report format" / "Elegir un formato de reporte" con tabla.

### ✅ Resueltos (2da ronda)

- [x] **[MEDIUM] [HUMANIZATION] FAQ con cierre repetitivo.**
  - Evidence: 8/10 EN y 9/10 ES → 2/10 EN y 0/10 ES. Cierres variados: "Check the...", "The [example] covers...", "Revisá el...", "El [ejemplo] muestra...".
  - Verificación: grep en `python-coverage-pytest-cov.md` y `.es.md`.

- [x] **[MEDIUM] [BILINGUAL] Anglicismos en ES.**
  - Evidence: `seteado`/`seteá` → `configurado`/`configurá`; `fetchead` → `obtené`; `pushealo` → `subilo`; `commitees` → `subas`; `matchea` → `coincide`; `fallear` → `falle`; `debug` → `depuración`.
  - Verificación: `grep` arroja 0 coincidencias de anglicismos crudos.

- [x] **[LOW] [HUMANIZATION] Red word "dig into" en EN.**
  - Evidence: "...when I need to dig into gaps." → "...when I need to explore gaps."

### ⚠️ Pendientes

- [ ] **[LOW] [MEDIA] `<img>` de Mermaid no usa `class="mermaid-diagram"` ni `tabindex="0"`.
  - Evidence: HTML renderiza `<img ... class="pi" loading="lazy" ...>`.
  - Razón: convención del renderer actual del sitio; la imagen funciona y lightbox.js se carga.
  - Recomendación: estandarizar clase/attrs en `src/lib/remark-mermaid-blocks.mjs` si se decide reforzar.

### 🔧 Out of scope

- [ ] **[HIGH] [SEO] Falta `WebPage` schema y `mainEntityOfPage` en `TechArticle`.**
  - Razón: requiere modificar `BaseLayout.astro` o el componente de layout de recetas; no es un cambio de contenido del archivo `.md`.
  - Recomendación: backlog de desarrollo para próxima iteración de schema.

- [ ] **[MEDIUM] [TRAFFIC/GEO] Datos GSC, GA4, Core Web Vitals, SERP.**
  - Razón: no hay acceso a datos de producción.
  - Recomendación: marcar como `NOT VERIFIED` hasta disponer de datos.

### 🔄 Regresiones

Ninguna.

## 3. Definition of Done (actualizada)

- [x] `title` < 60 caracteres, idéntico al H1.
- [x] `metaDescription` dentro de 50-170 chars y coincide con `seo.metaDescription`.
- [x] `lastUpdated` actualizado y coincidente EN/ES.
- [x] Body por encima del mínimo (recipes ≥ 1300).
- [x] Sin secciones de relleno genéricas.
- [x] Voz en primera persona en prosa.
- [x] Rule-of-three resuelto (0).
- [x] Voz pasiva reducida (EN 6 detectados, ES 2).
- [x] FAQ con estructura variada (> 50% no inicia con "How do I"/"¿Cómo").
- [x] Mermaid añadido y SVG renderizado.
- [x] Companion repo creado con `meta.json` y catálogo OK.
- [x] `content:quality`, `content:links`, `content:validate`, `check`, `build`, `sitemap` PASS.
- [x] Líneas de body ≤ 120 caracteres.
- [x] Sin líneas en blanco múltiples consecutivas.

## 4. Top 5 acciones pendientes

1. Variar los cierres de las respuestas FAQ para reducir patrón repetitivo.
2. Revisar anglicismos en ES (`seteado`, `fetchead`, `pushealo`, `commitees`, etc.).
3. Añadir `WebPage` schema + `mainEntityOfPage` en el layout del sitio (backlog).
4. Considerar estandarizar `class` y `tabindex` en imágenes Mermaid.
5. Seguimiento post-publicación con datos reales de GSC/GA4 cuando estén disponibles.

## 5. Veredicto y recomendación

**PUNTAJE FINAL: 93.5/100**

**RECOMENDACIÓN: PROMOTE**

El recurso cumple los criterios de publicación: build limpio, sitemap/indexado, contenido humanizado, paridad bilingüe, medios visuales y companion repo. Los items pendientes son mínimos y no bloquean publicación (clase `mermaid-diagram` a nivel de renderer, `WebPage` schema a nivel de layout). Sin regresiones.

## 6. Anexos

### 6.1 Validación técnica

| Comando | Estado | Output relevante |
|---|---|---|
| `npm run content:quality` | ✅ PASS | 0 errors, 0 warnings |
| `npm run content:links` | ✅ PASS | 0 broken |
| `npm run content:validate` | ✅ PASS | 0 errors, 0 warnings |
| `npm run check` | ✅ PASS | 0 errors, 0 warnings, 4 hints |
| `npm run mermaid:render` | ✅ PASS | 18 SVGs, 0 skipped |
| `npm run build` | ✅ PASS | 3258 páginas, SRI hashes OK |
| `npm run sitemap` | ✅ PASS | 3256 URLs, 6602 image entries |
| `node scripts/build-catalog.js` (companion) | ✅ PASS | 5 resources |

### 6.2 Métricas post-mejoras

| Métrica | EN | ES |
|---|---|---|
| Palabras | 1987 | 1987 |
| H2 / H3 | 13 / 33 | 13 / 33 |
| Bloques de código | 25 | 25 |
| FAQ | 10 | 10 |
| Primera persona (aprox.) | ~39 | ~20 |
| Rule-of-three | 0 | 0 |
| Voz pasiva (aprox.) | 6 | 2 |
| Red words | 0 | 0 |
| Generic intro/conclusion | 0 | 0 |
| Em dash `—` | 4 | - |
| Mermaid | 1 | 1 |
| AI% Desklib | 39.1% | 29.2% |
| Pattern totals | 0 | 0 |
| Líneas body > 120 | 0 | 0 |
| Anglicismos crudos ES | 0 | 0 |

### 6.3 Post-build checks

- H1 EN: `Measure and Enforce Python Test Coverage with pytest-cov`
- H1 ES: `Medir y Exigir Cobertura de Tests con pytest-cov`
- Canonical EN: `https://stackpractices.com/recipes/python-coverage-pytest-cov/`
- Canonical ES: `https://stackpractices.com/es/recipes/python-coverage-pytest-cov/`
- hreflang EN/ES/x-default: presentes en sitemap
- JSON-LD types: `TechArticle`, `FAQPage`, `BreadcrumbList`, `SpeakableSpecification`, `Question`, `Answer`, `Organization`, `Person`, `ListItem` (ambos idiomas)
- Mermaid img EN: `<img src="/assets/diagrams/python-coverage-pytest-cov-1.svg" alt="flowchart diagram: Run pytest" class="pi" loading="lazy">`
- Mermaid img ES: `<img src="/assets/diagrams/python-coverage-pytest-cov-es-1.svg" alt="flowchart diagram: Correr pytest" class="pi" loading="lazy">`
- `lightbox.js`: presente en ambos HTML
- `viewport`: presente en ambos HTML
- SVGs en `dist/assets/diagrams/`: ✅
- Sitemap URLs: EN y ES presentes con `lastmod=2026-08-27`
