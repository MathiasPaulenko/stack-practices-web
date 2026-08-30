# Checklist de arreglos — recipes/convert-csv-to-json

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `convert-csv-to-json` |
| Topic | `data` |
| Ruta EN | `src/content/recipes/data/convert-csv-to-json.md` |
| Ruta ES | `src/content/recipes/data/convert-csv-to-json.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/convert-csv-to-json/` |
| URL producción ES | `https://stackpractices.com/es/recipes/convert-csv-to-json/` |
| Título EN | `Convert CSV to JSON` (19 chars) |
| Título ES | `Convertir CSV a JSON` (20 chars) |
| `description` EN | 154 chars |
| `description` ES | 148 chars |
| `metaDescription` EN | 155 chars (coincide con `seo.metaDescription`) |
| `metaDescription` ES | 158 chars (coincide con `seo.metaDescription`) |
| `difficulty` | `beginner` |
| `topics` | `data` (válido) |
| `tags` | `csv`, `json`, `conversion`, `python`, `javascript`, `java`, `data-processing` |
| `lastUpdated` | `2026-08-19` (EN y ES) |
| `publishedAt` | `2026-06-20` (EN y ES) |
| `author` | `Mathias Paulenko` |
| `relatedResources` EN/ES | 6 slugs, mismo orden, todos válidos, todos del cluster `data` (mismo tipo `recipes`) |
| Palabras body prosa EN | **767** (sin bloques de código) |
| Palabras body prosa ES | **788** (sin bloques de código) |
| Mínimo esperado para `recipes` | >= 1.300 palabras de prosa |
| H2 EN/ES | 8/8 |
| H3 EN/ES | 11/11 |
| Bloques de código EN/ES | 5/5 (Python std, pandas, Node csv-parse, PapaParse, Jackson) |
| FAQ items EN/ES | 5/5 |
| Enlaces internos en body EN/ES | 1/1 |
| Enlaces externos en body EN/ES | 0/0 |
| Mermaid / imágenes EN/ES | 0/0 |
| Companion repo | **NO EXISTE** (`../stack-practices-resources/resources/recipes/data/convert-csv-to-json/`) |
| AI detect patterns EN/ES | 0 hallazgos / 0 hallazgos |
| AI detect content EN | 44.0 % (12 AI / 25 human / 41 total), `pattern_totals: {}` |
| AI detect content ES | 35.2 % (8 AI / 32 human / 42 total), `pattern_totals: {}` |
| Build | `npm run build` 3.258 páginas, exit 0 |
| `npm run content:validate` | PASS (0 errores, 0 advertencias, 1.021 archivos) |
| `npm run content:quality` | PASS (0 errores, 0 advertencias, 2.042 archivos) |
| `npm run content:links` | PASS (0 enlaces rotos en `relatedResources`) |
| `npm run check` | PASS (0 errores, 0 warnings, 3 hints preexistentes) |
| `npm run sitemap` | URL presente con hreflang y `lastmod` 2026-08-19 |

---

## 1. Scorecard comparativo

| Dimensión | Score | Máx. | Notas |
| --- | --- | --- | --- |
| SEO On-Page | 10/15 | 15 | Meta OK, `relatedResources` válidos, pero thin content, solo 1 enlace interno en body, 0 externos y todos los `relatedResources` son del mismo tipo. |
| SEO Técnico | 9/10 | 10 | Canonical, hreflang, sitemap, OG, CSP, viewport, H1 OK. Estructura JSON-LD: `TechArticle`, `BreadcrumbList`, `FAQPage` presentes; falta `WebPage` schema. |
| Calidad de contenido | 11/25 | 25 | Estructura correcta, ejemplos en 5 lenguajes, FAQ y variants. Thin content severo: 767/788 palabras vs 1.300 mínimo. Sin sección See Also / Further Reading y sin datos cuantitativos. |
| Humanización | 8/15 | 15 | `pattern_totals` vacío, sin palabras rojas ni frases patrón, pero `model_ai_pct` EN = 44 % (> 40 %). Sin primera persona. |
| Paridad bilingüe | 9/10 | 10 | Misma estructura, secciones equivalentes, metadatos traducidos, longitudes similares, código y ejemplos equivalentes. |
| Medios visuales | 0/5 | 5 | No hay diagramas Mermaid ni imágenes. El tema no las exige, pero podría beneficiarse de un diagrama de flujo CSV → JSON. |
| Companion repo | 0/3 | 3 | No existe. Para una receta basada en snippets, es opcional; se marca como recomendación LOW. |
| GEO / AI Search | 3/5 | 5 | Entidades claras, FAQ estructurada, `speakable`, `inLanguage`, `educationalLevel` presentes. Faltan enlaces a fuentes primarias (RFC 4180, docs oficiales). |
| Tráfico y crecimiento | 8/15 | 15 | Alta intención de búsqueda (`csv to json` es long-tail muy buscado). Sin datos GSC/GA4 verificables. Potencial de snippets por FAQ. |
| **Total** | **68/103** | **103** | **Equivalente ~66/100** |

**Interpretación:** El equivalente ~66/100 sitúa el recurso en el rango **NEEDS IMPROVEMENT** (60–69) del checklist `07-final-synthesis`. El punto crítico es el **thin content** (menos del 60 % del mínimo de palabras para recipes) y la falta de enlaces internos/externos que refuercen autoridad y GEO.

**Decisión de indexación:** `IMPROVE FIRST`.

**PAGE-WORTHINESS:** `PROBABLY YES` (el tema es útil y competitivo, pero el contenido necesita expansión para competir con SERPs de query de alto volumen).

**Riesgo thin content:** `CRITICAL`.
**Riesgo duplicación:** `NONE`.
**Riesgo canibalización:** `LOW` (dentro del cluster `data`, no cubre un nicho idéntico a otro recurso).
**SEO Técnico:** `PASS` (con aviso por `WebPage`).
**Calidad contenido:** `WEAK` (thin y sin referencias externas).
**GEO READINESS:** `MODERATE`.
**Potencial tráfico:** `HIGH`.
**Paridad bilingüe:** `PASS`.
**Riesgo patrón IA:** `LOW` (`pattern_totals` vacío; score Desklib EN > 40 % se atribuye a frases técnicas cortas).
**Riesgo contenido programático:** `LOW`.
**Riesgo sobre-optimización:** `NONE`.

---

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [CONTENT] Expandir el body prosa por encima del mínimo de 1.300 palabras para `recipes`**
  - Why: El contenido actual (767 EN / 788 ES) está por debajo del mínimo del tipo y por debajo del 60 % del objetivo, lo que lo hace thin content y vulnerable a helpful-content updates.
  - Evidence: `python scripts/audit-thin-content.py` reporta 767 palabras (59,0 %) EN y 788 palabras (60,6 %) ES; `src/content/recipes/data/convert-csv-to-json.md` y `.es.md`.
  - How: Añadir secciones con profundidad real (cuándo no usar, comparativa de librerías con benchmarks, casos de borde como quoting, escaping, fechas/Booleanos, ejemplo de streaming real con `chunksize` o `readAll` limitado, sección de herramientas y ecosistema, FAQ adicional). Replicar en ES.
  - Effort: High.
  - Source: 03-content-quality, 05-bilingual-parity.

### High

- [ ] **[HIGH] [HUMANIZATION] Reducir la proporción de oraciones marcadas como IA en el body EN por debajo del umbral del 40 %**
  - Why: `model_ai_pct` EN = 44,0 % supera el umbral; aunque `pattern_totals` esté vacío, el detector marca frases declarativas cortas.
  - Evidence: `ref/output/ai-detect-convert-csv-to-json.json` (12 AI / 25 human / 41 total).
  - How: Reescribir las frases con mayor `ai_prob` con voz activa, primera persona, contracciones y contexto concreto (números reales, nombres de archivo, versiones). Priorizar las 5-10 frases de mayor puntuación, luego re-ejecutar Desklib. No eliminar contenido técnico.
  - Effort: Medium.
  - Source: 04-humanization.

- [ ] **[HIGH] [CONTENT] Añadir 2-3 enlaces contextuales internos en el body**
  - Why: El recipe AGENTS recomienda 2-3 enlaces internos contextuales; actualmente hay solo 1 (`Deep Clone...` en el Overview), lo que limita la autoridad de página y la navegación de cluster.
  - Evidence: `src/content/recipes/data/convert-csv-to-json.md` líneas 48-49 y equivalente ES. `internal-linking-audit.cjs` detecta 10 recetas del cluster `data` que enlazan a `convert-csv-to-json` sin enlace de vuelta (brechas bidireccionales).
  - How: Añadir enlaces naturales a `/recipes/parse-csv-files`, `/recipes/convert-json-to-csv`, `/recipes/validate-json-schema` en Explanation, Best Practices o Common Mistakes. Replicar en ES.
  - Effort: Low.
  - Source: 02-seo, 03-content, 08-traffic.

- [ ] **[HIGH] [SEO] Añadir 2-4 enlaces externos a fuentes primarias en el body**
  - Why: 0 enlaces externos reduce E-E-A-T y GEO citabilidad. Las recetas de conversión se benefician de citar RFC 4180, docs oficiales de `csv`, `pandas`, `csv-parse`, `PapaParse`, Jackson y Apache Commons CSV.
  - Evidence: Body no contiene `](https://` en EN ni ES.
  - How: Añadir enlaces contextuales en la sección Variants o en See Also/Referencias (e.g. [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180), [pandas read_csv](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html), [Jackson CSV module](https://github.com/FasterXML/jackson-dataformat-csv)). Replicar en ES.
  - Effort: Low.
  - Source: 02-seo, 06-geo, 03-content.

- [ ] **[HIGH] [CONTENT] Añadir sección de herramientas, ecosistema o comparativa con versiones reales**
  - Why: Faltan versiones de librerías, dependencias reales (`pip install`, `npm install`, Maven coordinates) y datos cuantitativos. La receta actual menciona librerías sin enlaces ni versiones.
  - Evidence: Bloques de código con comentarios genéricos `pip install pandas`, `npm install csv-parse`, `com.fasterxml.jackson.dataformat:jackson-dataformat-csv`; sin coordenadas exactas ni fechas de versión.
  - How: Añadir una tabla de `Tooling and Ecosystem` o `Librerías y versiones` con versiones estables actuales, y una sección de `When Not to Use` o `When to avoid` ampliada.
  - Effort: Medium.
  - Source: 03-content, 06-geo.

### Medium

- [ ] **[MEDIUM] [SEO] `relatedResources` son todos del mismo tipo (`recipes`)**
  - Why: Aunque el recipe AGENTS permite recetas del mismo cluster, mezclar con `patterns` o `guides` del mismo tópico mejora autoridad y cross-linking (p.ej. `serialize-deserialize-data` es receta, no hay patterns/guides de `data`).
  - Evidence: Lista de 6 slugs: `/recipes/...`.
  - How: Mantener el cluster `data` pero considerar añadir un `pattern` o `guide` relevante si existe (buscar slugs con topic `data` en otras colecciones). Si no aplica, marcar como aceptado.
  - Effort: Low.
  - Source: 02-seo, 01-technical.

- [ ] **[MEDIUM] [TECHNICAL] Falta `WebPage` schema en JSON-LD**
  - Why: `AGENTS.md` requiere `TechArticle` + `WebPage` + `FAQPage` + `BreadcrumbList` para detalle de receta. El build solo emite `TechArticle`, `BreadcrumbList`, `FAQPage`.
  - Evidence: `dist/recipes/convert-csv-to-json/index.html` y `dist/es/recipes/convert-csv-to-json/index.html` contienen un bloque JSON-LD con esos 3 tipos, sin `WebPage`.
  - How: Revisar `src/layouts/RecipeArticle.astro` o el componente de structured data para incluir `@type: WebPage` con `url`, `name`, `description`, `inLanguage`, `isPartOf`.
  - Effort: Medium.
  - Source: 01-technical, 02-seo.

- [ ] **[MEDIUM] [CONTENT] Sin sección `See Also` / `Ver También` / `Further Reading`**
  - Why: La receta podría beneficiarse de recursos externos y complementarios más allá de `relatedResources`, reforzando GEO y autoridad.
  - Evidence: No existe `## See Also`, `## Further Reading` ni `## Referencias` en el body.
  - How: Añadir una sección final con 2-3 enlaces externos autorizados (RFC 4180, docs de pandas/csv-parse/Jackson) y 1-2 internos.
  - Effort: Low.
  - Source: 03-content, 06-geo.

- [ ] **[MEDIUM] [HUMANIZATION] Añadir primera persona u opinión explícita en el body**
  - Why: El tono es tercera persona / impersonal. La receta AGENTS y el humanization audit recomiendan voz directa y trade-offs personales.
  - Evidence: 0 ocurrencias de "I"/"Yo" en el cuerpo; frases declarativas sin contexto de autor.
  - How: En Explanation o Best Practices usar "I usually..."/"Yo suelo..." para preferencias concretas, y detallar trade-offs reales.
  - Effort: Low.
  - Source: 04-humanization.

- [ ] **[MEDIUM] [CONTENT] Ampliar la sección `Variants` con orientación de cuándo elegir cada enfoque**
  - Why: La tabla de Variants es correcta pero muy concisa; no explica decisiones reales (tamaño de archivo, entorno browser vs Node, dependencias pesadas).
  - Evidence: `src/content/recipes/data/convert-csv-to-json.md` líneas 171-179.
  - How: Añadir 2-3 párrafos debajo de la tabla con criterios de elección (tamaño, velocidad, dependencias, null handling, BOM, fechas).
  - Effort: Medium.
  - Source: 03-content, 06-geo.

- [ ] **[MEDIUM] [COMPANION] Evaluar si el multi-lenguaje de ejemplos justifica un companion repo**
  - Why: Aunque la receta es snippet-based, contiene 5 ejemplos en 3 lenguajes con archivos de ejemplo implícitos (`data.csv`). Un companion con `data.csv` y scripts ejecutables aumentaría valor práctico.
  - Evidence: No existe `../stack-practices-resources/resources/recipes/data/convert-csv-to-json/`.
  - How: Si se aprueba, crear `meta.json` y archivos mínimos: `data.csv`, `convert_csv_to_json.py` (std + pandas), `convert_csv_to_json.js` (csv-parse + PapaParse), `ConvertCsvToJson.java` (Jackson), `README.md`, `README.es.md`.
  - Effort: Medium.
  - Source: 09-companion-media.

- [ ] **[MEDIUM] [CONTENT] FAQ adicionales de valor para GEO y PAA**
  - Why: La FAQ actual cubre conceptos básicos; faltan preguntas con alto potencial de snippet (`Can I convert CSV to JSON in the browser?`, `How do I preserve data types?`, `What is the fastest way to convert a 1 GB CSV?`).
  - Evidence: 5 FAQs, 3 de ellas empiezan con "How".
  - How: Añadir 2-3 preguntas que aborden casos reales y citables, con respuestas autocontenidas.
  - Effort: Low.
  - Source: 03-content, 06-geo, 08-traffic.

### Low

- [ ] **[LOW] [MEDIA] Considerar un diagrama Mermaid de flujo CSV → JSON**
  - Why: El tema es lineal, no obligatorio, pero un pequeño diagrama de decisión (file size → tool selection → output) puede mejorar retención y GEO.
  - Evidence: No hay bloques `mermaid` en el source; no hay SVGs con el slug en `public/assets/diagrams/`.
  - How: Si se añade, usar `flowchart LR` horizontal, comentario `%% alt: ...`, ejecutar `npm run mermaid:render`, verificar `<img class="mermaid-diagram">` y SVG ES/EN.
  - Effort: Low.
  - Source: 09-companion-media.

- [ ] **[LOW] [SEO] Actualizar `lastUpdated` en próxima edición**
  - Why: `lastUpdated` es 2026-08-19; está en el mismo rango que recursos recientes, pero si se hacen los arreglos anteriores conviene actualizarlo.
  - Evidence: Frontmatter EN/ES `lastUpdated: "2026-08-19"`.
  - How: Actualizar a la fecha de los arreglos en ambos archivos.
  - Effort: Very Low.
  - Source: 02-seo, 03-content.

- [ ] **[LOW] [TRAFFIC] Open Graph image es genérica (`/og-image.png`)**
  - Why: No afecta ranking directamente, pero una imagen específica mejora CTR en redes.
  - Evidence: `<meta property="og:image" content="https://stackpractices.com/og-image.png">` en dist.
  - How: Si el sitio soporta OG por recurso, añadir imagen específica; de lo contrario es aceptable.
  - Effort: Low.
  - Source: 08-traffic, 02-seo.

- [ ] **[LOW] [CONTENT] Título ES usa "Convertir" en infinitivo; considerar "Cómo convertir" para mejor CTR en ES**
  - Why: El título actual es directo pero puede competir mejor con queries "cómo convertir csv a json".
  - Evidence: `title: "Convertir CSV a JSON"` (20 chars).
  - How: Probar `Cómo Convertir CSV a JSON en Python, JavaScript y Java` si cabe en < 60 chars.
  - Effort: Very Low.
  - Source: 03-content, 02-seo.

- [ ] **[LOW] [TRAFFIC] Verificar móvil a 375 px con navegador real y capturar métricas de overflow**
  - Why: Capturas de screenshot fueron tomadas con wavexis a 375 px; no se detectó overflow estructural, pero conviene validar legibilidad de tablas y code blocks en dispositivo real.
  - Evidence: `ref/audit/screenshots/convert-csv-to-json-mobile-375.png` y `.es.png`.
  - How: Abrir en navegador móvil o emulador, verificar que el FAQ y la tabla `Variants` se lean sin scroll horizontal.
  - Effort: Low.
  - Source: 09-companion-media.

---

## 3. Definition of Done

### Frontmatter y SEO

- [ ] `title` < 60 caracteres y coincide con el H1 renderizado (actualmente OK: 19 EN / 20 ES).
- [ ] `description` y `metaDescription` dentro de 50–170 caracteres y coincidentes EN/ES en sentido.
- [ ] `metaDescription` top-level coincide con `seo.metaDescription` (actualmente OK).
- [ ] `relatedResources` 3–6 slugs coherentes, mismo orden EN/ES, sin enlaces rotos (actualmente OK).
- [ ] `lastUpdated` actualizado y coincidente en ambos idiomas.
- [ ] H1 único generado desde el frontmatter; body empieza con `## Overview` / `## Visión General` (actualmente OK).
- [ ] Jerarquía H2 → H3 sin saltos (actualmente OK).

### Body y contenido

- [ ] Body prosa >= 1.300 palabras en EN y ES.
- [ ] Secciones mínimas: Overview, When to Use, Solution, Explanation, Variants, Best Practices, Common Mistakes, FAQ (actualmente presentes).
- [ ] `When to Use` incluye casos concretos y al menos un caso de cuándo NO aplica (actualmente presente).
- [ ] Sin secciones de relleno genéricas (actualmente OK).
- [ ] `Best Practices` y `Common Mistakes` específicas del dominio (actualmente OK pero pueden ampliarse).
- [ ] `FAQ` con 3–5 preguntas reales, variadas, mismas en EN/ES (actualmente 5/5, se sugiere ampliar).
- [ ] Ejemplos con versiones reales de herramientas y datos de prueba realistas.
- [ ] Al menos 2–3 enlaces contextuales internos en el body.
- [ ] 2–4 enlaces externos a fuentes primarias.

### Humanización

- [ ] `pattern_totals` vacío (actualmente OK).
- [ ] Desklib EN < 40 % o justificación técnica documentada si persiste > 40 %.
- [ ] Sin aperturas genéricas (`This guide covers...`, `In this article...`).
- [ ] Tono humano, voz en primera persona y trade-offs explícitos.

### Paridad EN/ES

- [ ] Misma estructura de secciones y orden (actualmente OK).
- [ ] Metadatos traducidos con longitudes correctas (actualmente OK).
- [ ] Código y ejemplos equivalentes; comentarios y nombres traducidos solo si es idiomático (actualmente OK).
- [ ] `relatedResources` y `lastUpdated` coincidentes (actualmente OK).

### Medios visuales y companion

- [ ] Si se añade diagrama Mermaid, SVGs renderizados, alt text y lightbox funcional.
- [ ] Sin overflow horizontal en móvil (375 px) (estructuralmente OK, pendiente validación visual).
- [ ] Companion repo existe y `meta.json` completo si se decide crear (actualmente NO aplica obligatoriamente).

### Validación técnica

- [ ] `npm run content:quality` → 0 errores, 0 warnings.
- [ ] `npm run content:links` → 0 rotos.
- [ ] `npm run content:validate` → 0 errores, 0 advertencias.
- [ ] `npm run check` → 0 errores, 0 warnings (3 hints preexistentes aceptables).
- [ ] `npm run build` → 3.258 páginas.
- [ ] `npm run sitemap` → URLs EN/ES con hreflang y lastmod actualizados.
- [ ] JSON-LD incluye `TechArticle` + `WebPage` + `BreadcrumbList` + `FAQPage`.

### Enlaces y ecosistema

- [ ] Enlaces internos con anclas descriptivas.
- [ ] `relatedResources` cruzados con distintos tipos si aplica.
- [ ] Enlaces externos autorizados y funcionales (sin `example.com`).

### Tráfico y crecimiento

- [ ] `title` y `metaDescription` optimizados por idioma/mercado.
- [ ] Open Graph: título, descripción e imagen presentes.
- [ ] Flujo de usuario claro (next step, CTA, recursos relacionados).
- [ ] Datos de GSC/GA4 revisados si están disponibles (actualmente NOT VERIFIED).

---

## 4. Top 5 acciones

1. **Expandir el body prosa por encima de 1.300 palabras** (HIGH/CRITICAL). Añadir secciones `When Not to Use`, `Tooling and Ecosystem`, explicación más profunda de tipos/encoding/BOM, y variantes con criterios de elección. Es la acción de mayor impacto porque elimina el riesgo de thin content.
2. **Añadir enlaces internos y externos en el body** (HIGH). De 1 a 3 enlaces internos y 2-4 externos a fuentes primarias (RFC 4180, docs de pandas, csv-parse, PapaParse, Jackson). Impacto alto en SEO/GEO con bajo esfuerzo.
3. **Reducir el AI score EN por debajo del 40 %** (HIGH). Reescribir las 5-10 frases con mayor `ai_prob` usando voz activa, contracciones y contexto concreto. Verificar que `pattern_totals` siga vacío.
4. **Crear un companion repo mínimo** (MEDIUM). Si se aprueba, incluir `data.csv` + scripts ejecutables en Python/Node/Java + `README.md`/`README.es.md` + `meta.json`. Incrementa el valor práctico y la autoridad.
5. **Añadir `WebPage` schema y reforzar FAQ para PAA/snippets** (MEDIUM/LOW). Corregir el JSON-LD en el layout/componente para incluir `WebPage`, y añadir 2-3 FAQs adicionales con respuestas autocontenidas para captar PAA.

---

## 5. Veredicto de una frase

El recurso tiene una base técnica sólida, buena paridad EN/ES y alto potencial de tráfico, pero **debe expandirse significativamente (mínimo ~550 palabras adicionales por idioma), añadir enlaces internos/externos y bajar el AI score EN antes de promocionarse**.

---

## 6. Anexos

### Anexo 1 — Auditoría técnica (01)

**URL y ruta estática**

- Ruta EN generada: `dist/recipes/convert-csv-to-json/index.html`.
- Ruta ES generada: `dist/es/recipes/convert-csv-to-json/index.html`.
- URLs producción: `https://stackpractices.com/recipes/convert-csv-to-json/` y `https://stackpractices.com/es/recipes/convert-csv-to-json/`.
- Trailing slash: el layout y sitemap usan `/` final; no se detectan redirecciones 302/301 a non-slash en `dist/`.

**Canonical y hreflang**

- Canonical EN: `https://stackpractices.com/recipes/convert-csv-to-json/`.
- Canonical ES: `https://stackpractices.com/es/recipes/convert-csv-to-json/`.
- Hreflang en HTML: `en`, `es`, `x-default` (x-default apunta a EN).
- Hreflang en `public/sitemap.xml`: presentes con `<xhtml:link rel="alternate" .../>`.

**Sitemap**

- `public/sitemap.xml` incluye EN y ES con `lastmod=2026-08-19`, `changefreq=weekly`, `priority=0.8`.

**JSON-LD**

- Tipos presentes: `TechArticle`, `BreadcrumbList`, `FAQPage`.
- Faltante: `WebPage`.
- Propiedades presentes: `inLanguage`, `educationalLevel` (`Beginner`), `speakable` (`#recipe-summary`, `#faq-content`), `author`, `publisher`, `dateModified`, `datePublished`.

**Indexabilidad y robots**

- `public/robots.txt` permite `/` y no bloquea `/recipes/` ni `/assets/`.
- `dist/recipes/convert-csv-to-json/index.html` no contiene `<meta name="robots" content="noindex">`.

**Performance**

- `NOT VERIFIED`: no se ejecutaron mediciones reales de Core Web Vitals ni Lighthouse. El build es estático, sin JavaScript de página excepto `ui.js` y `lightbox.js` (defer).

**Internal links / broken links**

- `npm run content:links`: 0 rotos.
- `internal-linking-audit.cjs`: 10 recetas del cluster `data` enlazan a `/recipes/convert-csv-to-json` sin enlace de vuelta (ver Anexo 8).

**Puntaje técnico: 9/10.**

### Anexo 2 — Auditoría SEO (02)

**Frontmatter**

| Campo | EN | ES | Estado |
| --- | --- | --- | --- |
| `title` | 19 chars | 20 chars | ✅ |
| `description` | 154 chars | 148 chars | ✅ |
| `metaDescription` | 155 chars | 158 chars | ✅ |
| `metaDescription == seo.metaDescription` | Sí | Sí | ✅ |
| `seo.keywords` | 7 términos | 7 términos | ✅ |
| `topics` | `data` | `data` | ✅ |
| `difficulty` | `beginner` | `beginner` | ✅ |
| `lastUpdated` | 2026-08-19 | 2026-08-19 | ✅ |
| `relatedResources` | 6 | 6 | ✅ (mismo orden) |

**Heading hierarchy**

- H1 renderizado: `Convert CSV to JSON` (EN), `Convertir CSV a JSON` (ES).
- H2: Overview, When to Use, Solution, Explanation, Variants, Best Practices, Common Mistakes, FAQ.
- H3: 5 subsecciones en Solution + 1 `When to avoid` / `Cuándo evitar` + 5 FAQs.
- No hay H1 manual en Markdown; no hay secciones duplicadas.

**Body links**

- 1 enlace interno en EN (`/recipes/deep-clone-structured/`) y 1 en ES. Falta mínimo recomendado (2–3).
- 0 enlaces externos.

**Open Graph**

- Presentes: `og:type`, `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale`, `og:image`.
- OG image es el genérico `/og-image.png`.

**Puntaje SEO: 10/15.**

### Anexo 3 — Auditoría de calidad de contenido (03)

**Estructura de secciones**

- Overview: presente, empieza con el problema real (CSV plano vs JSON estructurado).
- When to Use: 4 bullets + 3 de cuándo evitar.
- Solution: 5 bloques de código en Python, JavaScript y Java.
- Explanation: presente pero breve (~110 palabras EN).
- Variants: tabla comparativa con 6 filas.
- Best Practices: 5 bullets.
- Common Mistakes: 5 bullets.
- FAQ: 5 preguntas/respuestas.

**Thin content / longitud**

- EN: 767 palabras (59,0 % del mínimo 1.300).
- ES: 788 palabras (60,6 % del mínimo 1.300).
- Gap: ~533 palabras EN / ~512 palabras ES.

**Information gain y originalidad**

- Los ejemplos cubren std lib, pandas, csv-parse, PapaParse y Jackson, lo cual es útil. Faltan datos cuantitativos, versiones reales, benchmarks y referencias oficiales.

**Riesgos**

- Thin content: CRITICAL.
- Duplicación: NONE (contenido original).
- Canibalización: LOW (no hay otro recurso idéntico; existe `convert-json-to-csv` como inverso).
- Programático/AI: LOW (buena estructura, sin relleno obvio).
- Sobre-optimización: NONE.

**Puntaje calidad: 11/25.**

### Anexo 4 — Auditoría de humanización (04)

**Detección IA**

- `ai-detect-patterns.py` EN: 0 findings (`pattern_totals: {}`).
- `ai-detect-patterns.py` ES: 0 findings (`pattern_totals: {}`).
- `ai-detect-content.py` (Desklib):
  - EN: 44,0 % AI (12 / 25 / 41).
  - ES: 35,2 % AI (8 / 32 / 42).
- Sentencias EN con mayor `ai_prob`: `The examples below run in Python, JavaScript, and Java.` (0.89), `The CSV is too big to load as a single object.` (0.85), frases declarativas de la tabla Variants.

**Patrones de lenguaje**

- Sin palabras rojas de IA detectadas (`delve`, `leverage`, `underscore`, etc.).
- Sin aperturas genéricas (`This guide covers...`, `In this article...`).
- Tono declarativo técnico; falta primera persona.
- Uso de em-dash: 1 en ES (línea 160-168) y 1 en EN, ambos aceptables.

**Puntaje humanización: 8/15.**

### Anexo 5 — Auditoría de paridad bilingüe (05)

**Existencia de ES**: ✅ `convert-csv-to-json.es.md` existe.

**Estructura**

| Métrica | EN | ES | Paridad |
| --- | --- | --- | --- |
| H2 | 8 | 8 | ✅ |
| H3 | 11 | 11 | ✅ |
| H4 | 0 | 0 | ✅ |
| Bloques de código | 5 | 5 | ✅ |
| FAQs | 5 | 5 | ✅ |
| Palabras prosa | 767 | 788 | ✅ (diferencia ~3 %) |
| Enlaces internos body | 1 | 1 | ✅ |
| Enlaces externos body | 0 | 0 | ✅ |

**Frontmatter**

- Títulos traducidos (< 60 chars).
- Descripciones y meta descripciones traducidas y dentro de límites.
- `relatedResources` idénticos en orden y slugs.
- `topics`, `tags`, `difficulty`, `author`, `lastUpdated` idénticos.

**Código y ejemplos**

- Código idéntico (comentarios y nombres de archivo en inglés, consistente con la convención del sitio).
- Datos de prueba idénticos (`data.csv`, `name,age\nAlice,30\nBob,25`).

**Anglicismos en ES**

- Se detectan términos asentados técnicamente (`CSV`, `JSON`, `API`, `MongoDB`, `Elasticsearch`, `document store`, `streaming`, `schema`, `BOM`) que no requieren traducción.
- `setup` no aparece crudo; `stream` se usa en contexto técnico.

**Puntaje paridad: 9/10.**

### Anexo 6 — Auditoría GEO / AI Search (06)

**Claridad de entidades**: HIGH. El tema es claro (conversión CSV → JSON), la pregunta se responde inmediatamente, los hechos son verificables.

**Definiciones directas**: MEDIUM/HIGH. El Overview define el problema; faltan definiciones formales de RFC 4180, BOM, encoding.

**Hechos y afirmaciones**: MEDIUM. Las afirmaciones son correctas pero carecen de fuentes. No hay cifras ni versiones de librerías.

**Citas y fuentes**: INSUFFICIENT. 0 enlaces externos. Recomendado añadir RFC 4180, docs oficiales de librerías.

**Pasajes extraíbles**: MEDIUM. FAQ y Variants son autocontenidas, pero Explanation es breve.

**Structured data para IA**: OK. `inLanguage`, `educationalLevel`, `speakable` presentes. Falta `WebPage`.

**Paridad GEO bilingüe**: PASS. Las entidades y hechos coinciden entre EN y ES.

**Puntaje GEO: 3/5.**

### Anexo 7 — Auditoría de tráfico y crecimiento (08)

**GSC / GA4**: NOT VERIFIED. Sin acceso a Search Console ni Analytics.

**Tendencia**: NOT VERIFIED.

**CTR y snippet**: El título es claro (`Convert CSV to JSON`) y la meta description describe bien el contenido multi-lenguaje. Potencial para snippet de lista o tabla por la sección Variants.

**Queries principales potenciales**

- `convert csv to json python`
- `convert csv to json javascript`
- `convert csv to json java`
- `csv to json without pandas`
- `csv to json streaming`

**Dispositivos / UX móvil**: viewport presente, estructura responsive, capturas a 375 px disponibles.

**Potencial linkable asset**: MEDIUM. Si se añade companion repo, benchmarks y tabla de decisiones, puede ganar backlinks de tutoriales y foros.

**Potencial de tráfico**: HIGH.

**Puntaje tráfico: 8/15** (base por alto potencial, datos no verificados).

### Anexo 8 — Auditoría de recursos complementarios y medios visuales (09)

**Companion repo**

- Estado: NO EXISTE.
- Ruta esperada: `D:\Codigo\stack-practices-resources\resources\recipes\data\convert-csv-to-json\`.
- Recomendación: LOW/MEDIUM (receta basada en snippets, pero multi-lenguaje con archivos de ejemplo justifica un companion mínimo).

**Imágenes y diagramas**

- Inventario: 0 bloques `mermaid`, 0 etiquetas `![...](...)`, 0 SVGs con slug `convert-csv-to-json`.
- Recomendación: Considerar un diagrama de flujo de decisión (tamaño de archivo → librería) si se decide que aporta valor; de lo contrario NO APLICA.

**Móvil (375 px)**

- Capturas: `ref/audit/screenshots/convert-csv-to-json-mobile-375.png` y `convert-csv-to-json-mobile-375-es.png`.
- Estructuralmente: viewport presente, `max-width: 100%` en contenedores, `/lightbox.js` cargado.
- Sin overflow detectado por inspección estructural; validación visual con navegador real: NOT VERIFIED.

**Puntaje medios/companion: 0/5 (medio) + 0/3 (companion) = 0/8.**

### Anexo 9 — Validación técnica

| Comando | Resultado |
| --- | --- |
| `npm run content:quality` | PASS (0 errores, 0 warnings, 2.042 archivos) |
| `npm run content:links` | PASS (0 rotos, 1.025 archivos) |
| `npm run content:validate` | PASS (0 errores, 0 warnings, 1.021 archivos) |
| `npm run check` | PASS (0 errores, 0 warnings; 3 hints preexistentes) |
| `npm run build` | PASS (3.258 páginas) |
| `npm run sitemap` | PASS (3.256 URLs, 6.602 image entries) |

### Anexo 10 — Post-build HTML verification

| Check | EN | ES |
| --- | --- | --- |
| `mermaid-diagram img` | N/A | N/A |
| Raw mermaid en HTML | N/A | N/A |
| `/lightbox.js` | presente | presente |
| `TechArticle` schema | ✅ | ✅ |
| `FAQPage` schema | ✅ | ✅ |
| `BreadcrumbList` schema | ✅ | ✅ |
| `WebPage` schema | ❌ | ❌ |
| hreflang en/es/x-default | ✅ | ✅ |
| canonical self-ref | ✅ | ✅ |
| viewport | ✅ | ✅ |
| H1 renderizado | ✅ | ✅ |
| `inLanguage` | ✅ | ✅ |
| `speakable` | ✅ | ✅ |
| `educationalLevel` | ✅ | ✅ |
| Sitemap URLs | ✅ | ✅ |

### Anexo 11 — Detección de IA (salida de scripts)

```text
python scripts/ai-detect-patterns.py src/content/recipes/data/convert-csv-to-json.md
Wrote ref/output/ai-detect-patterns-convert-csv-to-json.json
  convert-csv-to-json: 0 findings

python scripts/ai-detect-patterns.py src/content/recipes/data/convert-csv-to-json.es.md
Wrote ref/output/ai-detect-patterns-convert-csv-to-json-es.json
  convert-csv-to-json.es: 0 findings

python scripts/ai-detect-content.py src/content/recipes/data/convert-csv-to-json.md --model desklib
Wrote ref/output/ai-detect-convert-csv-to-json.json
  convert-csv-to-json-en: 44.0% AI (12 AI / 25 human / 41 total) patterns: {}
  convert-csv-to-json-es: 35.2% AI (8 AI / 32 human / 42 total) patterns: {}
```

### Anexo 12 — Capturas de pantalla móvil

- EN: `ref/audit/screenshots/convert-csv-to-json-mobile-375.png`
- ES: `ref/audit/screenshots/convert-csv-to-json-mobile-375-es.png`

---

**Fecha de auditoría:** 2026-09-02 (observación local, no edición de archivos de contenido).  
**Auditor:** Devin (modo `full`, sin cambios en contenido/código).  
**Archivos de salida:**

- `ref/audit/reports/recipes-convert-csv-to-json-audit.md`
- `ref/output/ai-detect-convert-csv-to-json.json`
- `ref/output/ai-detect-patterns-convert-csv-to-json.json`
- `ref/output/ai-detect-patterns-convert-csv-to-json-es.json`
- `ref/audit/screenshots/convert-csv-to-json-mobile-375.png`
- `ref/audit/screenshots/convert-csv-to-json-mobile-375-es.png`
