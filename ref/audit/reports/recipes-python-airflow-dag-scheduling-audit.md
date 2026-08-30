# Checklist de arreglos — recipes/python-airflow-dag-scheduling (re-auditoría)

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `python-airflow-dag-scheduling` |
| Topic | `data` |
| Ruta EN | `src/content/recipes/data/python-airflow-dag-scheduling.md` |
| Ruta ES | `src/content/recipes/data/python-airflow-dag-scheduling.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/python-airflow-dag-scheduling/` |
| URL producción ES | `https://stackpractices.com/es/recipes/python-airflow-dag-scheduling/` |
| Título EN | `Schedule and Monitor DAGs with Apache Airflow` (45 chars) |
| Título ES | `Programar y Monitorear DAGs con Apache Airflow` (46 chars) |
| `description` EN | 114 chars |
| `description` ES | 116 chars |
| `metaDescription` EN | **157** chars (coincide con `seo.metaDescription`) |
| `metaDescription` ES | **151** chars (coincide con `seo.metaDescription`) |
| `difficulty` | `advanced` |
| `topics` | `data` (válido) |
| `tags` | `data`, `python`, `airflow`, `scheduling`, `dag`, `orchestration`, `etl`, `taskflow`, `data-pipeline` |
| `lastUpdated` | `2026-08-30` (EN y ES) |
| `publishedAt` | `2026-07-05` (EN y ES) |
| `author` | `Mathias Paulenko` |
| `relatedResources` EN/ES | 6 slugs, mismo orden, todos válidos, mixto `recipes` + `guides` |
| Palabras body prosa EN | **2.366** (sin bloques de código) |
| Palabras body prosa ES | **2.334** (sin bloques de código) |
| Mínimo esperado para `recipes` | >= 1.300 palabras de prosa |
| H2 EN/ES | 9/9 |
| H3 EN/ES | 17/17 |
| Bloques de código EN/ES | 18/18 |
| FAQ items EN/ES | 5/5 |
| Enlaces internos en body EN/ES | 8/8 |
| Enlaces externos en body EN/ES | 5/5 |
| Mermaid / imágenes EN/ES | 1/1 (flowchart LR, SVG generados) |
| Companion repo | **Creado y catálogo OK** |
| AI detect patterns EN/ES | 0 hallazgos / 0 hallazgos |
| AI detect content EN | **39.3 %** (28 AI / 110 human / 141 total), `pattern_totals: {}` |
| AI detect content ES | **34.9 %** (27 AI / 112 human / 142 total), `pattern_totals: {}` |
| Build | `npm run build` 3.258 páginas, exit 0 |
| `npm run content:validate` | PASS (0 errores, 0 advertencias, 1.021 archivos) |
| `npm run content:quality` | PASS (0 errores, 0 advertencias, 2.042 archivos) |
| `npm run content:links` | PASS (0 enlaces rotos en `relatedResources`) |
| `npm run check` | PASS (0 errores, 0 warnings, 3 hints preexistentes) |
| `npm run sitemap` | URLs EN/ES presentes con `lastmod=2026-08-30` |
| `npm run mermaid:render` | 64 SVGs renderizados (incluye EN y ES del recurso) |

---

## 1. Scorecard comparativo (antes vs después)

| Dimensión | Máx | Antes | Después | Cambio | Estado |
|-----------|-----|-------|---------|--------|--------|
| SEO On-Page | 15 | 11 | 14.5 | +3.5 | ✅ |
| SEO Técnico | 10 | 9 | 9.5 | +0.5 | ✅ |
| Calidad de contenido | 25 | 8 | 22 | +14 | ✅ |
| Humanización | 15 | 8 | 13 | +5 | ✅ |
| Paridad bilingüe | 10 | 9 | 9.5 | +0.5 | ✅ |
| Medios visuales | 5 | 0 | 4.5 | +4.5 | ✅ |
| Companion repo | 3 | 0 | 3 | +3 | ✅ |
| GEO / AI Search | 5 | 3 | 4.5 | +1.5 | ✅ |
| **TOTAL** | **88** | **48** | **80.5** | **+32.5** | ✅ |

**Interpretación del cambio:** +32.5 puntos. **MEJORA SIGNIFICATIVA**. El recurso pasa de `NOT COMPETITIVE` (`HOLD`) a `COMPETITIVE` (`PROMOTE`).

---

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

- [x] **[CRITICAL] [CONTENT] Expandir el body prosa por encima del mínimo de 1.300 palabras para `recipes`**
  - Evidence: `src/content/recipes/data/python-airflow-dag-scheduling.md` y `.es.md`.
  - Antes: 669 EN / 638 ES. Después: 2.366 EN / 2.334 ES.
  - Verificado con `node ref/output/reaudit-metrics.cjs` y `npm run content:quality`.

- [x] **[HIGH] [HUMANIZATION] Bajar `model_ai_pct` EN por debajo del 40 %**
  - Evidence: `ref/output/ai-detect-python-airflow-dag-scheduling.json`.
  - Antes: 42.3 % EN. Después: 39.3 % EN / 34.9 % ES. `pattern_totals` vacío en ambos.
  - Verificado con `python scripts/ai-detect-content.py`.

- [x] **[HIGH] [CONTENT] Añadir 2-3 enlaces contextuales internos en el body**
  - Evidence: body EN/ES.
  - Antes: 1 enlace interno. Después: 8 enlaces internos (guía completa, cron, Celery, pandas ETL, Spark groupBy, dbt, guía Airflow).
  - Verificado con grep de `](/`.

- [x] **[HIGH] [CONTENT] Añadir enlaces externos autorizados y referencias oficiales**
  - Evidence: body EN/ES.
  - Antes: 0 enlaces externos. Después: 5 enlaces a `airflow.apache.org/docs/`.
  - Verificado con grep de `](https://`.

- [x] **[HIGH] [MEDIA] Añadir un diagrama Mermaid que ilustre el ciclo de vida de un DAG**
  - Evidence: `src/content/recipes/data/python-airflow-dag-scheduling.md` y `.es.md`, sección `Explanation`.
  - Antes: 0 bloques Mermaid. Después: 1 `flowchart LR` en EN y ES.
  - Verificado con `npm run mermaid:render`; SVGs generados en `public/assets/diagrams/`.

- [x] **[HIGH] [COMPANION] Evaluar crear un companion repo ejecutable con el DAG de ejemplo**
  - Evidence: `../stack-practices-resources/resources/recipes/data/python-airflow-dag-scheduling/`.
  - Antes: no existía. Después: creado con `meta.json`, `README.md`, `README.es.md`, `dags/etl_daily_pipeline.py`, `requirements.txt` y `docker-compose.yml`.
  - Verificado con `node scripts/build-catalog.js` (25 recursos).

- [x] **[MEDIUM] [SEO] Acortar `metaDescription` a 160 caracteres o menos**
  - Evidence: frontmatter EN/ES.
  - Antes: 165 chars. Después: 157 EN / 151 ES.
  - Verificado con `npm run content:validate`.

- [x] **[MEDIUM] [CONTENT] Reemplazar el placeholder `api.example.com/health` por un ejemplo realista o genérico sin `example.com`**
  - Evidence: sección "Sensors" en EN y ES.
  - Antes: `https://api.example.com/health`. Después: `https://httpbin.org/get`.
  - Verificado con grep de `example.com` en el recurso (0 matches).

- [x] **[MEDIUM] [CONTENT] Explicar los bloques de código más complejos en prosa**
  - Evidence: `Explanation` y secciones alrededor de `Dynamic task mapping` y `Callbacks`.
  - Antes: bloques de código solos. Después: explicaciones de `expand()`, límites de concurrencia, callbacks cortos y failure-tolerant.

- [x] **[MEDIUM] [GEO] Incluir afirmaciones con versiones de Airflow y contexto de cambios recientes**
  - Evidence: `Variants`, `Best Practices`, `FAQ`.
  - Antes: sin versiones. Después: notas de `Airflow 2.2+`, `Airflow 2.3+` y `schedule` reemplazando `schedule_interval`.

- [x] **[MEDIUM] [CONTENT] Añadir sección `See Also` o `Further Reading` con recursos del ecosistema**
  - Evidence: final del body EN/ES.
  - Antes: terminaba en `FAQ`. Después: sección `## See Also` con guía completa, cron, Celery y docs oficiales.

- [x] **[LOW] [SEO] Actualizar `lastUpdated` al día de la última modificación real**
  - Evidence: frontmatter EN/ES y `public/sitemap.xml`.
  - Antes: `2026-08-19`. Después: `2026-08-30`.
  - Verificado con `npm run sitemap`.

### 🔧 Out of scope

- [ ] **[LOW] [TECHNICAL] Falta `WebPage` schema (problema global del sitio)**
  - Razón: Requiere modificar `BaseLayout.astro` de forma global; no es un cambio del recurso individual.
  - Recomendación: Implementar `WebPage` schema en una iteración de desarrollo global.

- [ ] **[LOW] [MEDIA] Verificación móvil real no realizada**
  - Razón: No se dispone de navegador/emulador en esta sesión.
  - Evidencia estructural: `<meta name="viewport">` presente, clases Tailwind responsive, `.mermaid-diagram` con `max-width: 100%`, no hay elementos con ancho fijo > 375 px.
  - Recomendación: Capturar `ref/audit/reports/screenshots/python-airflow-dag-scheduling-mobile-after.png` en viewport 375 px cuando sea posible.

### 🔄 Regresiones

Ninguna. Todos los comandos de validación pasaron y el build es exitoso.

---

## 3. Definition of Done (actualizada)

- [x] Todos los ítems CRITICAL resueltos.
- [x] Todos los ítems HIGH resueltos.
- [x] Body prosa EN/ES >= 1.300 palabras.
- [x] `model_ai_pct` EN < 40 % y ES < 40 %; `pattern_totals` vacío.
- [x] Al menos 2 enlaces internos contextuales en el body EN/ES.
- [x] Al menos 3 enlaces externos autorizados en el body EN/ES.
- [x] Diagrama Mermaid añadido y SVG renderizado.
- [x] Companion repo creado y catálogo build pasa.
- [x] `npm run content:quality`, `content:links`, `content:validate`, `check`, `mermaid:render`, `build`, `sitemap` pasan.
- [x] Paridad EN/ES verificada.
- [ ] Verificación móvil real a 375 px (out of scope hasta disponer de navegador).

---

## 4. Top 5 acciones pendientes

1. **Implementar `WebPage` schema de forma global** (LOW, TECHNICAL): mejora estructurado general del sitio, no del recurso.
2. **Verificación móvil real a 375 px** (LOW, MEDIA): capturar screenshot y confirmar que no hay overflow ni diagramas ilegibles.
3. **Monitorear `model_ai_pct` tras publicación** (LOW, HUMANIZATION): el score EN está justo por debajo del umbral (39.3 %). Si sube con nuevos cambios, aplicar otra ronda focalizada.
4. **Backlinks internos desde guías relacionadas** (LOW, SEO): enlazar hacia esta receta desde `complete-guide-apache-airflow` y otras guías de data si aplica.
5. **Actualizar companion repo con ejemplos adicionales** (LOW, COMPANION): añadir variantes de `BranchPythonOperator` o `PythonSensor` si el público lo demanda.

---

## 5. Veredicto y recomendación

**Veredicto de una frase:** El recurso pasó de contenido delgado y sin medios a una receta competitiva, bien humanizada, con diagrama Mermaid, companion ejecutable y enlaces internos/externos sólidos, cumpliendo los mínimos de calidad y SEO técnico.

**Recomendación:** `PROMOTE` — el recurso está listo para publicación/push.

- `PUNTAJE TOTAL: 80.5/88`
- `ESTADO PÁGINA: COMPETITIVE`
- `DECISIÓN INDEXACIÓN: PROMOTE`
- `PAGE-WORTHINESS: YES`
- `RIESGO THIN CONTENT: NONE`
- `RIESGO DUPLICACIÓN: LOW`
- `RIESGO CANIBALIZACIÓN: LOW`
- `SEO TÉCNICO: PASS`
- `CALIDAD CONTENIDO: STRONG`
- `GEO READINESS: STRONG`
- `PARIDAD BILINGÜE: PASS`
- `RIESGO PATRÓN IA: LOW`
- `RIESGO CONTENIDO PROGRAMÁTICO: LOW`
- `RIESGO SOBRE-OPTIMIZACIÓN: LOW`

---

## 6. Anexos

### 6.1 Detalle de puntuación por dimensión

#### SEO On-Page (14.5/15)

- `title` EN 45 chars / ES 46 chars: ✅.
- `metaDescription` EN 157 / ES 151 chars, coincide con `seo.metaDescription`: ✅.
- `description` EN 114 / ES 116 chars: ✅.
- `relatedResources` 6 slugs, mismo orden EN/ES: ✅.
- `lastUpdated` actualizado a `2026-08-30`: ✅.
- Sin H1 manual en el body (el H1 se renderiza desde `title`): ✅.
- Jerarquía H2 → H3 sin saltos: ✅.
- Secciones válidas (`Overview`, `When to Use`, `Solution`, `Explanation`, `Variants`, `Best Practices`, `Common Mistakes`, `FAQ`, `See Also`): ✅.
- Enlaces internos/contextuales mejorados de 1 a 8: ✅.
- -0.5 por no tener `og:image` explícito (depende del layout global).

#### SEO Técnico (9.5/10)

- Slug kebab-case único: ✅.
- Sitemap presence en `public/sitemap.xml` con hreflang: ✅.
- Structured data: `TechArticle` + `FAQPage` + `BreadcrumbList`: ✅.
- Internal links con trailing slash: ✅.
- Canonical self-referencing EN y ES: ✅.
- Open Graph básico presente: ✅.
- Paridad técnica EN/ES (H2, H3, code blocks): ✅.
- -0.5 por `WebPage` schema global pendiente.

#### Calidad de contenido (22/25)

- Body prosa EN 2.366 / ES 2.334: ✅.
- Thin content: NONE.
- Information gain: HIGH.
- Riesgo sobre-optimización: LOW.
- FAQ count EN/ES: 5/5.
- Duplicación/canibalización: LOW.
- Riesgo contenido programático: LOW.
- Page-worthiness: YES.
- -3 por no incluir estadísticas/citas de terceros ni datos cuantitativos de tráfico.

#### Humanización (13/15)

- `model_ai_pct` EN 39.3 % / ES 34.9 %, `pattern_totals` vacío: ✅.
- Red words: 0.
- Frases genéricas de apertura/cierre: 0.
- Tokens de código al final de oraciones: corregidos.
- Voz pasiva: baja; predominan primera persona y voz activa.
- Variedad FAQ: 5 preguntas con estructuras variadas.
- Primera persona presente en ambos idiomas: ✅.
- Paridad humanización EN/ES: PASS.
- -2 porque el score EN (39.3 %) está cerca del umbral 40 % y el modelo sigue marcando algunas frases definitorias cortas.

#### Paridad bilingüe (9.5/10)

- H2 count EN/ES: 9/9.
- H3 count EN/ES: 17/17.
- Code blocks EN/ES: 18/18.
- Frontmatter traducido y equivalente: ✅.
- `relatedResources` mismos slugs y orden: ✅.
- `lastUpdated` idéntico: ✅.
- -0.5 porque el body ES es ligeramente más corto (2.334 vs 2.366 palabras), aunque dentro de la variación natural.

#### Medios visuales (4.5/5)

- Mermaid blocks EN/ES: 1/1.
- Paridad Mermaid: YES.
- `flowchart LR` en ambos idiomas: ✅.
- SVGs generados: `python-airflow-dag-scheduling-1.svg` y `python-airflow-dag-scheduling-es-1.svg`.
- HTML build contiene `<img class="mermaid-diagram">`: ✅.
- `/lightbox.js` presente: ✅.
- `<img>` con `alt`, `loading="lazy"`, `tabindex="0"`, `role="button"`, `aria-label`: ✅.
- Diagrama aporta información adicional: ✅.
- -0.5 por no contar con verificación visual real en viewport 375 px.

#### Companion repo (3/3)

- `../stack-practices-resources/resources/recipes/data/python-airflow-dag-scheduling/meta.json` existe: ✅.
- Campos requeridos completos: ✅.
- Archivos en `files` existen: ✅.
- `README.md` y `README.es.md` presentes: ✅.
- `node scripts/build-catalog.js` pasa: ✅.

#### GEO / AI Search (4.5/5)

- Claridad de entidades: HIGH.
- Densidad factual: HIGH.
- Citas: SUFFICIENT (5 enlaces a documentación oficial de Airflow).
- Pasajes extraíbles: HIGH.
- Structured data IA (`inLanguage`, `educationalLevel`, `speakable`): OK.
- Paridad GEO bilingüe: PASS.
- -0.5 por no incluir citas directas con atribución explícita a autores/documentos específicos más allá de los enlaces oficiales.

### 6.2 Validación técnica

| Comando | Resultado | Output relevante |
|---|---|---|
| `npm run content:quality` | PASS | 0 errores, 0 warnings |
| `npm run content:links` | PASS | 0 enlaces rotos |
| `npm run content:validate` | PASS | 0 errores, 0 warnings |
| `npm run check` | PASS | 0 errores, 0 warnings (3 hints preexistentes) |
| `npm run mermaid:render` | PASS | 64 SVGs renderizados, 0 skipped |
| `npm run build` | PASS | 3.258 páginas construidas |
| `npm run sitemap` | PASS | 3.256 URLs, `lastmod=2026-08-30` |

### 6.3 Verificación post-build

| Item | EN | ES |
|---|---|---|
| `<img class="mermaid-diagram">` presente | ✅ | ✅ |
| SVG en `dist/assets/diagrams/` | ✅ | ✅ |
| `/lightbox.js` presente | ✅ | ✅ |
| Texto Mermaid crudo | No encontrado | No encontrado |
| `TechArticle` + `FAQPage` + `BreadcrumbList` schema | 3 matches | 3 matches |
| Canonical self-referencing | ✅ | ✅ |
| `meta name="viewport"` | ✅ | ✅ |

### 6.4 Outputs de detección IA

- `python scripts/ai-detect-patterns.py src/content/recipes/data/python-airflow-dag-scheduling.md` → `python-airflow-dag-scheduling: 0 findings`
- `python scripts/ai-detect-patterns.py src/content/recipes/data/python-airflow-dag-scheduling.es.md` → `python-airflow-dag-scheduling.es: 0 findings`
- `python scripts/ai-detect-content.py ... --model desklib` → EN 39.3 % / ES 34.9 %, `pattern_totals: {}` en ambos.

---

## 7. Mejoras adicionales aplicadas (post-re-auditoría)

Fecha: `2026-08-30`.

### 7.1 Cambios en el recurso EN/ES

- Reescritura de los bullets `When to Use` / `When to avoid` (EN) y `Cuándo Usar` /
  `Cuándo evitar` (ES) a oraciones en primera persona sin encabezados genéricos en
  negrita. Se eliminó el patrón de definiciones cortas que Desklib marcaba como IA.
- Reescritura focalizada de frases con alto `ai_prob` (operadores, bitshift, pendulum,
  `expand()`, `start_date`, XCom, `max_active_runs`, etc.).
- Añadidas citas con atribución explícita a la documentación oficial de Airflow:
  - Definición de DAG en FAQ.
  - Explicación de XCom en FAQ.
  - Nota sobre `schedule` como reemplazo de `schedule_interval` (Airflow 2.4) en la
    sección de `Catchup and backfill`.
  - Referencia a los operators de Airflow en `Variants`.
- Nuevo conteo: body prosa **2.495 EN / 2.466 ES**, 7 enlaces externos, 8 internos.

### 7.2 Cambios en el companion repo

- Añadidos `dags/sensor_example.py` (`PythonSensor` con modo `reschedule`).
- Añadidos `dags/branching_example.py` (`BranchPythonOperator` + `EmptyOperator` join).
- Añadidos `dags/dynamic_mapping_example.py` (mapeo dinámico con `expand()`).
- Actualizados `meta.json`, `README.md` y `README.es.md`.
- `node scripts/build-catalog.js` pasa: 25 recursos.

### 7.3 Nuevos scores

| Dimensión | Score post-re-auditoría | Score post-mejoras adicionales |
|---|---|---|
| SEO On-Page | 14.5/15 | 15/15 |
| SEO Técnico | 9.5/10 | 9.5/10 |
| Calidad de contenido | 22/25 | 23.5/25 |
| Humanización | 13/15 | 14/15 |
| Paridad bilingüe | 9.5/10 | 9.5/10 |
| Medios visuales | 4.5/5 | 4.5/5 |
| Companion repo | 3/3 | 3/3 |
| GEO / AI Search | 4.5/5 | 5/5 |
| **TOTAL** | **80.5/88** | **82.5/88** |

### 7.4 Validación final

| Comando | Resultado |
|---|---|
| `npm run content:quality` | PASS |
| `npm run content:links` | PASS |
| `npm run content:validate` | PASS |
| `npm run check` | PASS (0 errores, 0 warnings, 3 hints preexistentes) |
| `npm run mermaid:render` | PASS (64 SVGs) |
| `npm run build` | PASS (3.258 páginas) |
| `npm run sitemap` | PASS (3.256 URLs) |

Nueva detección IA:
- EN **39.2 %** / ES **34.3 %**, `pattern_totals: {}` en ambos.
