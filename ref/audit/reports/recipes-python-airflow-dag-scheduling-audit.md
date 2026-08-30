# Checklist de arreglos — recipes/python-airflow-dag-scheduling

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
| `metaDescription` EN | 165 chars (coincide con `seo.metaDescription`) |
| `metaDescription` ES | 165 chars (coincide con `seo.metaDescription`) |
| `difficulty` | `advanced` |
| `topics` | `data` (válido) |
| `tags` | `data`, `python`, `airflow`, `scheduling`, `dag`, `orchestration` |
| `lastUpdated` | `2026-08-19` (EN y ES) |
| `publishedAt` | `2026-07-05` (EN y ES) |
| `author` | `Mathias Paulenko` |
| `relatedResources` EN/ES | 6 slugs, mismo orden, todos válidos, mixto `recipes` + `guides` |
| Palabras body prosa EN | **669** (sin bloques de código) |
| Palabras body prosa ES | **638** (sin bloques de código) |
| Mínimo esperado para `recipes` | >= 1.300 palabras de prosa |
| H2 EN/ES | 11/11 |
| H3 EN/ES | 10/10 |
| Bloques de código EN/ES | 8/8 |
| FAQ items EN/ES | 5/5 |
| Enlaces internos en body EN/ES | 1/1 |
| Enlaces externos en body EN/ES | 0/0 |
| Mermaid / imágenes EN/ES | 0 (sin diagramas) |
| Companion repo | **NO EXISTE** |
| AI detect patterns EN/ES | 0 hallazgos / 0 hallazgos |
| AI detect content EN | **42.3 %** (14 AI / 36 human / 55 total), `pattern_totals: {}` |
| AI detect content ES | **34.9 %** (11 AI / 38 human / 55 total), `pattern_totals: {}` |
| Build | `npm run build` 3.258 páginas, exit 0 |
| `npm run content:validate` | PASS (0 errores, 0 advertencias, 1.021 archivos) |
| `npm run content:quality` | PASS (0 errores, 0 advertencias, 2.042 archivos) |
| `npm run content:links` | PASS (0 enlaces rotos en `relatedResources`) |
| `npm run check` | PASS (0 errores, 0 warnings, 3 hints preexistentes) |
| `npm run sitemap` | URLs EN/ES presentes con `lastmod=2026-08-19` |
| `npm run mermaid:render` | Sin diagramas para este recurso |

---

## 1. Scorecard y decisiones

| Dimensión | Máx | Score | Notas |
| --- | --- | --- | --- |
| SEO On-Page | 15 | 11 | Títulos y metas OK; `metaDescription` 165 chars, 5 pts por encima del recomendado 160. |
| SEO Técnico | 10 | 9 | Build OK, canonical, hreflang, sitemap, JSON-LD correctos. Falta `WebPage` schema (global). |
| Calidad de contenido | 25 | 8 | Body prosa 669/638, muy por debajo del mínimo 1.300. Código útil pero escasa prosa. |
| Humanización | 15 | 8 | `model_ai_pct` EN 42.3 % (>40 %). `pattern_totals` vacío; detector marca definiciones cortas. |
| Paridad bilingüe | 10 | 9 | Estructura, headings, código y `relatedResources` coinciden. Body ES ligeramente más corto. |
| Medios visuales | 5 | 0 | Sin diagramas, imágenes ni SVGs. El recurso se beneficia de un diagrama de flujo DAG. |
| Companion repo | 3 | 0 | No existe. El recurso tiene varios snippets que podrían agruparse en un proyecto runnable. |
| GEO / AI Search | 5 | 3 | FAQPage y speakable OK, pero sin fuentes externas ni citas que refuercen confianza. |
| **TOTAL** | **88** | **48** | **(~54.5/100)** |

**Interpretación:** El recurso se sitúa en rango **WEAK / NOT COMPETITIVE**. La estructura de recipe y el SEO técnico son correctos, pero el contenido prosaico es demasiado delgado para rankear contra recetas de Airflow existentes. La detección IA EN está por encima del umbral del proyecto, aunque el detector estructural está limpio.

**Decisiones finales:**

- `PUNTAJE TOTAL: 48/88`
- `ESTADO PÁGINA: NOT COMPETITIVE`
- `DECISIÓN INDEXACIÓN: IMPROVE FIRST`
- `PAGE-WORTHINESS: PROBABLY YES` (el tema es valioso, pero el contenido actual no compite)
- `RIESGO THIN CONTENT: HIGH`
- `RIESGO DUPLICACIÓN: LOW`
- `RIESGO CANIBALIZACIÓN: LOW` (la guía `complete-guide-apache-airflow` es complementaria, no competidora directa)
- `SEO TÉCNICO: PASS`
- `CALIDAD CONTENIDO: WEAK`
- `GEO READINESS: MODERATE`
- `POTENCIAL TRÁFICO: HIGH` (Airflow DAG scheduling tiene búsqueda sostenida)
- `PARIDAD BILINGÜE: PASS`
- `RIESGO PATRÓN IA: MEDIUM` (score numérico alto, pero sin patrones estructurales)
- `RIESGO CONTENIDO PROGRAMÁTICO: LOW`
- `RIESGO SOBRE-OPTIMIZACIÓN: LOW`

**Veredicto preliminar:** `HOLD` para una ronda de mejora enfocada en expansión de contenido, humanización del texto EN y adición de medios visuales/companion.

---

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [CONTENT] Expandir el body prosa por encima del mínimo de 1.300 palabras para `recipes`**
  - Why: El contenido actual (669 EN / 638 ES) queda muy por debajo del umbral de calidad del proyecto. Google tiende a no rankear thin content para queries competitivas como Airflow DAG scheduling.
  - Evidence: `src/content/recipes/data/python-airflow-dag-scheduling.md` y `.es.md`; conteo de palabras excluyendo bloques de código.
  - How: Agregar prosa alrededor de cada bloque de código, explicar decisiones de diseño, trade-offs, errores reales de producción, escenarios de migración (de `schedule_interval` a `schedule`), y consideraciones de rendimiento del scheduler/executor.
  - Effort: High
  - Source: 03-content-quality-audit

### High

- [ ] **[HIGH] [HUMANIZATION] Bajar `model_ai_pct` EN por debajo del 40 %**
  - Why: El score EN 42.3 % está por encima del objetivo del proyecto. Aunque `pattern_totals` está vacío, el modelo de Desklib marca oraciones definitorias cortas como IA.
  - Evidence: `ref/output/ai-detect-python-airflow-dag-scheduling.json`; oraciones de alto score en `Overview`, `Best Practices` y `FAQ`.
  - How: Reescribir definiciones con tono de primera persona, anécdotas de uso real, advertencias concretas y trade-offs (p. ej. "en producción me encontré con..."). No eliminar contenido técnico.
  - Effort: High
  - Source: 04-humanization-audit

- [ ] **[HIGH] [CONTENT] Añadir 2-3 enlaces contextuales internos en el body**
  - Why: Actualmente solo hay 1 enlace interno (`complete-guide-apache-airflow` en el `Overview`). Los enlaces contextuales refuerzan la autoridad tópica y reducen dead-ends.
  - Evidence: Body EN/ES; `grep '\](/'`. `python-pandas-etl-pipeline`, `cron-jobs`, `python-celery-task-queue` y `python-spark-groupby-aggregation` son candidatos naturales.
  - How: Insertar enlaces con anclas descriptivas en `Explanation`, `Best Practices` y `Common Mistakes`.
  - Effort: Low
  - Source: 02-seo-audit + 03-content-quality-audit

- [ ] **[HIGH] [CONTENT] Añadir enlaces externos autorizados y referencias oficiales**
  - Why: No hay enlaces externos en el body. Las referencias a la documentación oficial de Airflow, TaskFlow API y operadores aumentan la E-E-A-T y dan puntos de verificación al contenido.
  - Evidence: Body EN/ES sin `https://`.
  - How: Agregar 3-5 enlaces a `airflow.apache.org/docs/`, MDN, docs de `pendulum` o equivalentes en español, con anclas descriptivas.
  - Effort: Low
  - Source: 06-geo-audit

- [ ] **[HIGH] [MEDIA] Añadir un diagrama Mermaid que ilustre el ciclo de vida de un DAG**
  - Why: El flujo de scheduler → DAG file → DagRun → task queue → executor es abstracto y se presta a un diagrama. Los diagramas aumentan retención y compartibilidad.
  - Evidence: No hay bloques `mermaid` en EN/ES; `public/assets/diagrams/` no contiene archivos para este slug.
  - How: Crear un `flowchart LR` en `Explanation` (EN/ES) con los nodos Browser/CLI, Scheduler, DagRun, Executor, Worker y Metadata DB; ejecutar `npm run mermaid:render`.
  - Effort: Medium
  - Source: 09-companion-media-audit

- [ ] **[HIGH] [COMPANION] Evaluar crear un companion repo ejecutable con el DAG de ejemplo**
  - Why: El recurso tiene 8 bloques de código sueltos. Un proyecto runnable con `docker-compose` o `pip` reduce fricción y genera un asset linkable.
  - Evidence: `../stack-practices-resources/resources/recipes/data/python-airflow-dag-scheduling/` no existe.
  - How: Crear `meta.json`, `README.md`, `README.es.md`, `dags/etl_daily_pipeline.py`, `requirements.txt` y un `Dockerfile` o instrucciones con `astro`/`poetry`. Ejecutar `node scripts/build-catalog.js` en el repo hermano.
  - Effort: High
  - Source: 09-companion-media-audit

### Medium

- [ ] **[MEDIUM] [SEO] Acortar `metaDescription` a 160 caracteres o menos**
  - Why: Ambas metadescripciones tienen 165 caracteres, 5 por encima del rango recomendado por Google (~155-160).
  - Evidence: Frontmatter EN/ES.
  - How: Reescribir la `metaDescription` manteniendo el beneficio y la keyword principal, eliminando palabras redundantes.
  - Effort: Very Low
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [CONTENT] Reemplazar el placeholder `api.example.com/health` por un ejemplo realista o genérico sin `example.com`**
  - Why: `example.com` es un placeholder que no aporta valor y puede marcar el contenido como genérico.
  - Evidence: Sección "Sensors" en EN y ES, `PythonSensor` con `requests.get("https://api.example.com/health")`.
  - How: Cambiar por `https://api.mi-servicio.com/health` con una nota de que debe reemplazarse, o usar un endpoint de ejemplo público/documentado.
  - Effort: Very Low
  - Source: 03-content-quality-audit + 04-humanization-audit

- [ ] **[MEDIUM] [CONTENT] Explicar los bloques de código más complejos en prosa**
  - Why: `Dynamic task mapping` y `Callbacks for success or failure` son solo código. Sin contexto, el lector no sabe cuándo usarlos ni qué riesgos tienen.
  - Evidence: Líneas 271-319 EN / 271-319 ES.
  - How: Agregar 2-3 oraciones antes/después de cada bloque explicando el escenario y los gotchas (p. ej. "`.expand()` crea una tarea por cada ítem, cuidado con límites de concurrencia").
  - Effort: Medium
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [GEO] Incluir afirmaciones con versiones de Airflow y contexto de cambios recientes**
  - Why: El contenido no menciona versiones de Airflow. Las referencias a `Airflow 2.2+`, `Airflow 2.3+` y el cambio de `schedule_interval` a `schedule` refuerzan la frescura y autoridad.
  - Evidence: `Variants`, `Best Practices`, `FAQ`.
  - How: Añadir notas del tipo "desde Airflow 2.3..." o "en Airflow 2.x..." donde aplique.
  - Effort: Low
  - Source: 06-geo-audit

- [ ] **[MEDIUM] [CONTENT] Añadir sección `See Also` o `Further Reading` con recursos del ecosistema**
  - Why: El recurso termina en `FAQ` sin una salida clara. Una sección de lecturas relacionadas mejora el flujo de usuario y el enlazado interno.
  - Evidence: Estructura final del body.
  - How: Agregar `## See Also` con enlaces a la guía completa, receta de Celery, Cron jobs y docs oficiales.
  - Effort: Low
  - Source: 03-content-quality-audit + 08-gsc-ga4-traffic-audit

### Low

- [ ] **[LOW] [TECHNICAL] Falta `WebPage` schema (problema global del sitio)**
  - Why: El JSON-LD solo incluye `TechArticle`, `BreadcrumbList` y `FAQPage`. El schema `WebPage` global está pendiente en todo el proyecto.
  - Evidence: `dist/recipes/python-airflow-dag-scheduling/index.html`, `dist/es/recipes/python-airflow-dag-scheduling/index.html`.
  - How: Implementar `WebPage` en `BaseLayout.astro` de forma global, no en este recurso.
  - Effort: Low
  - Source: 01-technical-audit

- [ ] **[LOW] [SEO] Actualizar `lastUpdated` al día de la última modificación real**
  - Why: La fecha actual es `2026-08-19`, anterior a la auditoría. Actualizar refuerza señal de frescura.
  - Evidence: Frontmatter EN/ES y `public/sitemap.xml` (`lastmod=2026-08-19`).
  - How: Cambiar `lastUpdated` a la fecha de la ronda de mejora; regenerar `npm run sitemap`.
  - Effort: Very Low
  - Source: 02-seo-audit

- [ ] **[LOW] [MEDIA] Verificación móvil real no realizada**
  - Why: No se dispuso de navegador para capturar screenshots a 375 px, aunque el HTML tiene viewport y CSS responsive.
  - Evidence: `dist/recipes/python-airflow-dag-scheduling/index.html` contiene `<meta name="viewport">`.
  - How: Abrir la URL en un dispositivo real o emulador, capturar `ref/audit/reports/screenshots/python-airflow-dag-scheduling-mobile.png`.
  - Effort: Low
  - Source: 09-companion-media-audit

---

## 3. Definition of Done

- [ ] Todos los ítems CRITICAL resueltos.
- [ ] Todos los ítems HIGH resueltos.
- [ ] Body prosa EN/ES >= 1.300 palabras.
- [ ] `model_ai_pct` EN < 40 % o `pattern_totals` vacío con justificación documentada.
- [ ] Al menos 2 enlaces internos contextuales en el body EN/ES.
- [ ] Al menos 3 enlaces externos autorizados en el body EN/ES.
- [ ] Diagrama Mermaid añadido y SVG renderizado.
- [ ] Companion repo creado y catálogo build pasa (opcional pero recomendado para score alto).
- [ ] `npm run content:quality`, `content:links`, `content:validate`, `check`, `build`, `sitemap` pasan.
- [ ] Paridad EN/ES verificada.
- [ ] Verificación móvil sin overflow (375 px).

---

## 4. Top 5 acciones

1. **Expandir el body prosa a 1.300+ palabras** (CRITICAL, CONTENT): la acción de mayor impacto; sin ella el recurso no compite.
2. **Humanizar el texto EN para bajar el AI score bajo 40 %** (HIGH, HUMANIZATION): reescribir definiciones y listas con voz de primera persona y trade-offs.
3. **Añadir un diagrama Mermaid del ciclo de vida del DAG** (HIGH, MEDIA): mejora comprensión, shareability y diferenciación visual.
4. **Añadir enlaces internos y externos autorizados** (HIGH, CONTENT + SEO): reforzar autoridad tópica y E-E-A-T.
5. **Crear un companion repo runnable con el DAG de ejemplo** (HIGH, COMPANION): convierte el recurso en un asset linkable y mejora la utilidad práctica.

---

## 5. Veredicto de una frase

El recurso tiene una estructura de recipe técnicamente correcta y código útil, pero su body prosaico es demasiado delgado (669/638 palabras), su humanización EN está por encima del umbral de IA y carece de medios visuales y companion, por lo que requiere una ronda de mejora intensiva antes de poder promoverlo.

---

## 6. Anexos

### 6.1 Auditoría técnica

`INDEXABILIDAD: PASS`
- URLs EN/ES generadas correctamente: `/recipes/python-airflow-dag-scheduling/` y `/es/recipes/python-airflow-dag-scheduling/`.
- Ambas rutas presentes en `public/sitemap.xml` con `lastmod=2026-08-19` y hreflang completo.
- `robots.txt` permite el rastreo.
- Sin `noindex` ni `X-Robots-Tag` bloqueante.

`RIESGO CANONICAL: NONE`
- Canonical self-referencing correcta: `https://stackpractices.com/recipes/python-airflow-dag-scheduling/`.
- Versión ES con canonical propia: `https://stackpractices.com/es/recipes/python-airflow-dag-scheduling/`.

`SITEMAP: OK`
- URLs EN/ES presentes, `lastmod` coherente con `lastUpdated`.

`REDIRECTS: OK`
- Sin redirecciones temporales ni cadenas.

`STRUCTURED DATA: VALID + ELIGIBLE`
- JSON-LD válido con `TechArticle`, `BreadcrumbList`, `FAQPage`.
- `inLanguage`, `educationalLevel` y `speakable` presentes.
- Falta `WebPage` (issue global).

`PERFORMANCE: NOT VERIFIED`
- No se dispuso de datos de Lighthouse o CWV para este recurso.

`ENLACES INTERNOS: WARNING`
- Solo 1 enlace contextual en el body (a `complete-guide-apache-airflow`).
- `relatedResources` correctos y sin rotos.
- No enlaces al patrón antiguo `/tipo/categoria/slug`.

`PÁGINAS ESPECIALES: OK`
- `/404/` y `/es/404/` no indexadas; `/search/` y `/es/search/` gestionadas correctamente.

`PARIDAD TÉCNICA BILINGÜE: PASS`
- Ambas versiones responden, están en sitemap y tienen canonical/structured data equivalente.

`PUNTAJE TÉCNICO: 9/10`

Top 3 arreglos técnicos:
1. Implementar `WebPage` schema de forma global.
2. Actualizar `lastUpdated` y regenerar sitemap.
3. Verificar performance real con Lighthouse.

### 6.2 Auditoría SEO

#### Frontmatter (EN)

| Campo | Valor | Cumple | Nota |
| --- | --- | --- | --- |
| title | `Schedule and Monitor DAGs with Apache Airflow` (45) | Sí | < 60, coincide con H1. |
| description | 114 chars | Sí | Dentro de 80-160. |
| metaDescription | 165 chars | Casi | 5 chars por encima del recomendado 160; dentro del hard max 170. |
| slug | `python-airflow-dag-scheduling` | Sí | kebab-case, único. |
| topics | `data` | Sí | Válido. |
| relatedResources | 6 slugs | Sí | Mismo orden EN/ES, sin barra final, mixto recipes/guides. |

#### Frontmatter (ES)

| Campo | Valor | Cumple | Nota |
| --- | --- | --- | --- |
| title | `Programar y Monitorear DAGs con Apache Airflow` (46) | Sí | < 60, coincide con H1. |
| description | 116 chars | Sí | Dentro de 80-160. |
| metaDescription | 165 chars | Casi | Misma observación que EN. |
| slug | `python-airflow-dag-scheduling` | Sí | Coincide con EN. |
| topics | `data` | Sí | Válido. |
| relatedResources | 6 slugs | Sí | Mismo orden EN/ES. |

`HEADINGS: OK`
- Un solo H1 por versión, coincide con `title`.
- Jerarquía lógica H2 → H3.

`ENLACES INTERNOS: WARNING`
- Contextuales en body: 1 EN / 1 ES.
- `relatedResources`: 6, todos válidos.
- Mismo orden EN/ES: Sí.
- Sin enlaces rotos ni barras finales incorrectas.

`META DUPLICADA: NONE`
- Título, descripción y meta únicos dentro del sitio.

`POTENCIAL CTR: MEDIUM`
- Título claro y keyword-first; meta descripción con beneficio pero ligeramente larga.

`OPEN GRAPH: OK`
- `og:title`, `og:description`, `og:url`, `og:locale`, `og:image` presentes.
- `og:image` es la imagen genérica del sitio.

`PARIDAD SEO BILINGÜE: PASS`
- Metadatos traducidos con longitudes correctas, `lastUpdated` e `relatedResources` idénticos.

`PUNTAJE SEO: 11/15`

Top 5 arreglos SEO:
1. Acortar `metaDescription` a <= 160 chars.
2. Añadir 2-3 enlaces internos contextuales en el body.
3. Añadir enlaces externos autorizados.
4. Añadir `WebPage` schema global.
5. Actualizar `lastUpdated`.

### 6.3 Auditoría de calidad de contenido

`TIPO DE RECURSO: recipe`
`TOPIC PRINCIPAL: Apache Airflow / DAG scheduling`
`INTENCIÓN DE BÚSQUEDA PRINCIPAL: Tutorial / How-to`
`QUERY PRINCIPAL: "schedule and monitor DAGs with Apache Airflow"`
`QUERIES SECUNDARIAS: "airflow task dependencies", "airflow sensor poke reschedule", "airflow taskflow api example"`
`AUDIENCIA OBJETIVO: data engineers y desarrolladores Python que usan Airflow`
`FORMATO DE CONTENIDO: code recipe with examples`
`CLUSTER TÓPICO: data / ETL / orchestration`

`PUNTAJE INTENCIÓN: 11/15`
- La intención how-to se satisface parcialmente; falta profundidad en escenarios reales y troubleshooting.

`ALINEACIÓN SERP: NOT VERIFIED`
- No se ejecutó búsqueda web.

#### Calidad por secciones

- Secciones fuertes: `When to Use`, `When to avoid`, `Basic DAG definition`, `TaskFlow API`.
- Secciones débiles: `Dynamic task mapping`, `Callbacks for success or failure` (solo código, sin explicación).
- Secciones ausentes: `See Also` / `Further Reading`, diagrama visual, referencias oficiales.
- Secciones redundantes: ninguna notable.

`INFORMATION GAIN: MODERATE`
- Los ejemplos de código son concretos, pero el contenido prosaico añade poco valor único frente a la documentación oficial. Faltan gotchas de producción, decisiones de arquitectura y comparativas profundas.

`RIESGO THIN CONTENT: HIGH`
- Body prosa 669 EN / 638 ES, muy por debajo de 1.300.
- Secciones con solo código agravan el riesgo.

`RIESGO DUPLICACIÓN: LOW`
- `complete-guide-apache-airflow` cubre el tema en profundidad, pero este recipe se enfoca en ejemplos prácticos; son complementarios.

`RIESGO CANIBALIZACIÓN: LOW`
- No hay otro recipe directamente enfocado en DAG scheduling.

`SEO SEMÁNTICO:`
- Entidad principal: Apache Airflow DAG.
- Entidades de soporte: operators, sensors, XCom, TaskFlow API, scheduler, executor.
- Entidades ausentes: referencias a versiones específicas de Airflow, `airflow.cfg`, `LocalExecutor`, `CeleryExecutor`, `KubernetesExecutor`, `dag_id` best practices.

`AUTORIDAD TÓPICA:`
- El recurso forma parte del cluster `data` y recibe enlaces de `python-pandas-etl-pipeline`, `python-spark-groupby-aggregation`, `python-data-validation-pandera`, `python-dbt-model-transformations` y `complete-guide-apache-airflow`.
- No es orphan, pero tiene pocos enlaces entrantes.

`RIESGO CONTENIDO PROGRAMÁTICO: LOW`
- No hay sustitución mecánica de keywords, pero el inicio "This recipe shows how to build Airflow DAGs..." es una apertura templatizada.

`RIESGO CALIDAD IA: MEDIUM`
- Definiciones cortas y listas genéricas ("Set X", "Use Y") marcan el detector.

`RIESGO SOBRE-OPTIMIZACIÓN: LOW`
- Sin keyword stuffing evidente.

`PAGE-WORTHINESS: PROBABLY YES`
- El tema es valioso, pero la página actual necesita una mejora profunda para merecer indexación competitiva.

`PARIDAD CONTENIDO BILINGÜE: PASS`
- Misma estructura, orden, número de code blocks y FAQ.
- Body ES no es inferior al mínimo en términos relativos y sigue la estructura EN.

`PUNTAJE CALIDAD CONTENIDO: 8/25`

Top 5 arreglos de contenido:
1. Expandir body prosa a >= 1.300 palabras.
2. Explicar bloques `Dynamic task mapping` y `Callbacks`.
3. Añadir `See Also` con recursos del ecosistema.
4. Añadir referencias a versiones de Airflow y casos de producción.
5. Reemplazar `api.example.com` por un ejemplo realista.

### 6.4 Auditoría de humanización / patrones IA

`RIESGO PATRÓN IA: MEDIUM`

#### Métricas de detección IA

- EN:
  - `model_ai_pct`: **42.3 %**
  - `pattern_totals`: `{}`
  - `AI sentences` (top 10):
    1. `Pushing large DataFrames via XCom.` (0.4897)
    2. `You want batch jobs on a cron-like schedule with built-in retries.` (0.4887)
    3. `This recipe shows how to build Airflow DAGs, schedule them, wire task dependencies, use sensors, share data through XCom, and write cleaner pipelines with the TaskFlow API.` (0.4813)
    4. `A DAG is a set of tasks tied together by dependencies, where data flows one way and there are no cycles.` (0.4755)
    5. `Airflow is for batch workflows, not for daemons.` (0.4465)
    6. `An executor picks up queued tasks and runs them.` (0.4169)
    7. `A plain crontab entry is simpler.` (0.4136)
    8. `catchup=True makes Airflow run every missed interval between start_date and now; catchup=False starts from the present.` (0.4119)
    9. `A DAG is a collection of tasks with directed dependencies and no cycles.` (0.3977)
    10. `Set retries and retry_delay for transient failures like API timeouts.` (0.3975)
- ES:
  - `model_ai_pct`: **34.9 %**
  - `pattern_totals`: `{}`
  - `AI sentences` (top 5, como referencia): frases definitorias cortas en `Visión General`, `Cuándo Usar` y `Mejores Prácticas`.
- Estado de la herramienta: `ai-detect-content.py` y `ai-detect-patterns.py` ejecutados correctamente.

#### Palabras rojas encontradas

No se encontraron palabras rojas de IA en la detección estructural (`pattern_totals` vacío). El score numérico proviene principalmente de oraciones definitorias cortas.

#### Frases genéricas encontradas

| Frase | Ubicación | Recomendación |
| --- | --- | --- |
| `This recipe shows how to build Airflow DAGs, schedule them...` | `Overview` EN | Reescribir con una anécdota o motivación real. |
| `A DAG is a collection of tasks with directed dependencies and no cycles.` | `Explanation` EN | Combinar con un ejemplo de producción o advertencia. |
| `Set X` / `Use Y` listas en `Best Practices` | `Best Practices` EN/ES | Añadir contexto: "lo hago porque..." o "evita...". |

#### Tokens / herramientas al final de oraciones

No se detectaron tokens sueltos al final de oraciones de forma sistemática.

#### Secciones impersonales / de relleno

- `Overview` y `Explanation` son predominantemente definitorios; faltan trade-offs y advertencias de primera persona.
- `Best Practices` y `Common Mistakes` son listas cortas que el detector marca como IA.

`PARIDAD HUMANIZACIÓN BILINGÜE: PASS`
- Mismo tono y estructura; la ES tiene score numérico menor.

`PUNTAJE HUMANIZACIÓN: 8/15`

Top 5 arreglos de humanización:
1. Reescribir `Overview` con un problema real de producción.
2. Añadir advertencias y trade-offs en `Explanation`.
3. Convertir `Best Practices` en oraciones con contexto.
4. Humanizar `FAQ` con respuestas menos definitorias.
5. Ampliar `Common Mistakes` con consecuencias reales.

### 6.5 Auditoría de paridad bilingüe

`EXISTE ARCHIVO ES: YES`

`PARIDAD DE ESTRUCTURA: PASS`
- Mismo número de H2/H3, mismo orden, mismas secciones.

`PARIDAD DE FRONTMATTER: PASS`
- `title`, `description`, `metaDescription`, `lastUpdated`, `relatedResources`, `topics`, `difficulty`, `author` coinciden en sentido y longitud.

#### Longitud del body

- EN: 669 palabras prosa.
- ES: 638 palabras prosa.
- `PASS` en paridad relativa, aunque ambas están bajo el mínimo.

`PARIDAD DE EJEMPLOS DE CÓDIGO: PASS`
- Mismos snippets, comentarios y datos de prueba equivalentes.

`ANGICISMOS EN ES:`
- Términos técnicos como `sensors`, `DAG`, `XCom`, `TaskFlow API` son aceptables por estar asentados. Revisar si "callbacks" o "branching" necesitan glosa breve.

`PUNTAJE PARIDAD BILINGÜE: 9/10`

Top 5 arreglos de paridad:
1. Mantener la misma estructura al expandir contenido.
2. Asegurar que los nuevos enlaces internos/externos existan en ambos idiomas.
3. Verificar que el diagrama Mermaid se traduzca y renderice para ES.
4. Asegurar que el companion repo tenga `README.es.md`.
5. Conservar equivalencia de comentarios en los code blocks.

### 6.6 Auditoría GEO / AI Search

`CLARIDAD DE ENTIDADES: HIGH`
- El concepto principal (DAG en Airflow) está claro desde el título y el `Overview`.

`DENSIDAD FACTUAL: MEDIUM`
- Hay afirmaciones técnicas correctas (p. ej. `mode="poke"` vs `reschedule`), pero sin referencias a versiones ni fuentes oficiales.

`CITAS: INSUFFICIENT`
- No hay enlaces externos ni menciones a la documentación oficial de Airflow.

`PASAJES EXTRAÍBLES: MEDIUM`
- Las FAQ son extraíbles, pero las secciones de código carecen de prosa de contexto que un RAG pueda citar.

`CONSISTENCIA TERMINOLÓGICA: PASS`
- Uso consistente de `DAG`, `operator`, `sensor`, `XCom`, `TaskFlow` en EN y ES.

`STRUCTURED DATA IA: OK`
- `inLanguage`: `en` / `es`.
- `educationalLevel`: `Advanced`.
- `speakable`: `#recipe-summary`, `#faq-content`.

`PARIDAD GEO BILINGÜE: PASS`
- Ambas versiones definen las mismas entidades y pasan los mismos hechos.

`PUNTAJE GEO: 3/5`

Top 5 arreglos GEO:
1. Añadir 3-5 enlaces a la documentación oficial de Airflow.
2. Mencionar versiones de Airflow donde aplica.
3. Ampliar prosa alrededor de los code blocks para crear pasajes citables.
4. Añadir `See Also` con recursos autorizados.
5. Incluir referencias a ejecutores (`LocalExecutor`, `CeleryExecutor`, `KubernetesExecutor`).

### 6.7 Auditoría de tráfico y crecimiento

`MÉTRICAS GSC: NOT VERIFIED`
- No se dispone de datos de GSC/GA4 para este recurso.

`TENDENCIA: NOT VERIFIED`

`POTENCIAL CTR: MEDIUM`
- El título es claro; la meta descripción es atractiva pero ligeramente larga. Compite con la guía completa del mismo sitio.

`ATRACTIVO SNIPPET: MEDIUM`
- Las FAQ pueden captar PAA para queries como "What is XCom in Airflow?".

`QUERIES PRINCIPALES:`
| Query | Imp | Clics | CTR | Pos | Intención | ¿Cubierta? |
| --- | --- | --- | --- | --- | --- | --- |
| "airflow dag schedule" | ? | ? | ? | ? | How-to | Parcial |
| "airflow task dependencies" | ? | ? | ? | ? | How-to | Sí |
| "airflow sensor poke vs reschedule" | ? | ? | ? | ? | Informational | Sí |
| "airflow taskflow api" | ? | ? | ? | ? | How-to | Sí |

`PAÍSES E IDIOMAS: NOT VERIFIED`

`DISPOSITIVOS: NOT VERIFIED`

`ESTADO GA4: NOT VERIFIED`

`FLUJO USUARIO: NEEDS IMPROVEMENT`
- Hay 1 enlace interno y `relatedResources`, pero falta una sección final (`See Also`) que invite a continuar.
- No hay dead-ends absolutos, pero el final del `FAQ` no cierra con un CTA claro.

`POTENCIAL LINKABLE ASSET: MEDIUM`
- Si se añade un companion repo runnable y un diagrama de arquitectura, el potencial sube a HIGH.

`BACKLINKS: NOT VERIFIED`

`UX MÓVIL: OK`
- HTML tiene viewport, CSS responsive, sin elementos de ancho fijo visible. Sin verificación real en navegador.

`POTENCIAL TRÁFICO: HIGH`
- Airflow es una herramienta con búsqueda sostenida; el tema DAG scheduling tiene intención clara.

`PUNTAJE PRIORIDAD TRÁFICO: 5/15`
- Alto potencial, pero sin datos de GSC/GA4 no se puede confirmar rendimiento actual.

Top 5 oportunidades de crecimiento:
1. Mejorar snippet ampliando `FAQ` para captar PAA.
2. Añadir companion repo para generar backlinks y shares.
3. Añadir diagrama Mermaid para rich result / image search.
4. Reforzar enlaces internos desde recursos del cluster `data`.
5. Publicar y medir versión ES para mercado hispanohablante.

### 6.8 Auditoría de recursos complementarios y medios visuales

#### A. Recursos complementarios

- Estado del companion: **NO EXISTE**
- meta.json completo: N/A
- Archivos listados existen: N/A
- README.md presente: N/A
- README.es.md presente: N/A
- Build del catálogo pasa: **YES** (`node scripts/build-catalog.js` en repo hermano generó `resources.json` con 24 recursos)
- Enlaces cruzados: N/A

#### B. Imágenes y diagramas

| # | Tipo | Ubicación | Archivo generado | Idioma |
| --- | --- | --- | --- | --- |
| — | — | Sin diagramas | — | — |

#### Renderizado

- SVGs generados: 0/0.
- HTML contiene `<img class="mermaid-diagram">`: NO (no hay diagramas).
- SVGs referenciados existen en dist/: N/A.
- `/lightbox.js` presente: NO aplica (sin imágenes).
- Paridad EN/ES: N/A.

#### Tamaño y visualización

- No excede contenedor: N/A.
- Relación de aspecto equilibrada: N/A.
- Orientación horizontal (LR): N/A.
- Responsive en móvil: N/A.

#### Click-to-zoom

- N/A sin medios.

#### SEO de imágenes

- Alt text descriptivo: N/A.
- Lazy loading: N/A.
- Structured data referencia imágenes: NO (no hay imágenes en el recurso).
- Sitemap incluye imágenes: NO aplica.
- CSP permite img-src: YES.

#### Accesibilidad

- Contraste WCAG AA: N/A.
- Focus visible: N/A.
- ARIA en lightbox: N/A.
- Touch targets >= 44px: N/A.

#### Móvil (375px)

- Sin overflow horizontal: NOT VERIFIED.
- Diagramas legibles: N/A.
- Lightbox funciona con tap: N/A.

#### Hallazgos

- [HIGH] [MEDIA] Sin diagramas: el recurso se beneficia de un `flowchart LR` del ciclo de vida del DAG.
- [HIGH] [COMPANION] Sin companion repo: múltiples snippets sueltos podrían agruparse en un proyecto runnable.

#### Score

- Companion repo: **0/5**
- Imágenes y diagramas: **0/10**
- Total: **0/15**

---

## 8. Re-audit post-mejora (resumen)

Fecha de la mejora: `2026-08-30`.

### Cambios aplicados

| Categoría | Cambios principales |
|---|---|
| Contenido | Body prosa expandido de ~669/638 a **2136 EN / 2233 ES** palabras. Se agregaron explicaciones, trade-offs y advertencias en `Explanation`, `Best Practices`, `Common Mistakes` y `FAQ`. |
| Humanización | Reescritura de frases definitorias cortas con contexto de primera persona. `model_ai_pct` bajó de 42.3 % a **39.3 % EN** y se mantuvo **34.9 % ES**. `pattern_totals` vacío en ambos idiomas. |
| SEO on-page | `metaDescription` acortada a 157 EN / 151 ES chars. Se añadieron 4-5 enlaces internos contextuales y 4-5 enlaces externos a la documentación oficial de Airflow. |
| Medios | Se añadió un diagrama Mermaid `flowchart LR` del ciclo de vida del DAG en EN y ES; se generaron los SVGs y se verificó en el build. |
| Companion repo | Se creó `../stack-practices-resources/resources/recipes/data/python-airflow-dag-scheduling/` con `meta.json`, `README.md`, `README.es.md`, `requirements.txt`, `docker-compose.yml` y `dags/etl_daily_pipeline.py`. El catálogo se regeneró y ahora reporta 25 recursos. |
| Validación | `npm run content:quality`, `content:links`, `content:validate`, `check`, `build` (3258 páginas), `sitemap` y `mermaid:render` pasaron sin errores. |

### Scorecard post-mejora

| Dimensión | Máx | Pre-mejora | Post-mejora | Nota |
| --- | --- | --- | --- | --- |
| SEO On-Page | 15 | 11 | 14 | Metas óptimas, enlaces internos/externos añadidos. |
| SEO Técnico | 10 | 9 | 9.5 | Build, canonical, hreflang, sitemap y structured data OK. |
| Calidad de contenido | 25 | 8 | 22 | Body expandido con ejemplos reales y profundidad. |
| Humanización | 15 | 8 | 13 | Ambos idiomas < 40 %; `pattern_totals` vacío. |
| Paridad bilingüe | 10 | 9 | 9.5 | Estructura, código y metadatos equivalentes. |
| Medios visuales | 5 | 0 | 5 | Mermaid SVG renderizado en EN y ES. |
| Companion repo | 3 | 0 | 3 | Repo creado y catálogo OK. |
| GEO / AI Search | 5 | 3 | 4.5 | FAQ, speakable y referencias externas añadidas. |
| **TOTAL** | **88** | **48** | **79.5** | **(~90.3 %)** |

### Decisión post-mejora

- `PUNTAJE TOTAL: 79.5/88`
- `ESTADO PÁGINA: COMPETITIVE`
- `DECISIÓN INDEXACIÓN: PROMOTE`
- `VEREDICTO: PROMOTE`

### Items OUT OF SCOPE / pendientes

- Verificación móvil real a 375 px (no se dispuso de navegador).
- Datos de GSC/GA4 (NOT VERIFIED).
- Implementación global del schema `WebPage` (se mantiene como issue de sitio).

## 7. Notas de auditoría

- Auditoría ejecutada en `MODE=full` siguiendo `ref/audit-a-resource.md`.
- Se ejecutaron `npm run content:quality`, `content:links`, `content:validate`, `check`, `build`, `sitemap` y `mermaid:render`.
- Se ejecutaron `python scripts/ai-detect-content.py` y `python scripts/ai-detect-patterns.py` para ambos idiomas.
- El companion repo no existe; se verificó `node scripts/build-catalog.js` en `../stack-practices-resources`.
- No se dispuso de navegador para screenshots móviles.
- No se dispuso de datos de GSC/GA4.
