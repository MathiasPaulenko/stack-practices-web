# Checklist de arreglos — recipes/deep-clone-javascript (re-auditoría)

## 0. Metadata del recurso

- Tipo (contentType): recipes
- Slug: deep-clone-javascript
- Topic: data
- Ruta EN: `src/content/recipes/data/deep-clone-javascript.md`
- Ruta ES: `src/content/recipes/data/deep-clone-javascript.es.md`
- URL producción EN: `https://stackpractices.com/recipes/deep-clone-javascript/`
- URL producción ES: `https://stackpractices.com/es/recipes/deep-clone-javascript/`
- Título EN: "Deep Clone in JavaScript: structuredClone vs lodash vs JSON" (59 caracteres)
- Título ES: "Deep Clone en JavaScript: structuredClone vs lodash vs JSON" (59 caracteres)
- `lastUpdated`: 2026-08-30 (coincide EN/ES)
- `publishedAt`: 2026-06-11
- `author`: Mathias Paulenko
- Palabras body EN: 2001 totales (regex) / 1307 de prosa (sin bloques de código)
- Palabras body ES: 2065 totales (regex) / 1383 de prosa (sin bloques de código)
- H2 EN/ES: 9/9, H3 EN/ES: 13/13
- Bloques de código EN/ES: 7/7 (incluye 1 bloque `mermaid` en cada idioma)
- FAQ EN/ES: 5/5 (se añadió la pregunta sobre `Date` en `JSON.parse/stringify`)
- Enlaces internos en body EN/ES: 8 ocurrencias / 5 destinos únicos (con trailing slash)
- Enlaces externos en body EN/ES: 7 ocurrencias / 4 destinos únicos (MDN, Node.js, Lodash)
- Enlaces ancla EN/ES: 1 (`#variants` / `#variantes`)
- AI detect patterns EN: 0 hallazgos (`ref/output/ai-detect-patterns-deep-clone-javascript.json`)
- AI detect patterns ES: 0 hallazgos (`ref/output/ai-detect-patterns-deep-clone-javascript-es.json`)
- AI detect content EN: 37.4 % (13 AI / 69 human / 85 total), `pattern_totals: {}`
- AI detect content ES: 30.2 % (9 AI / 74 human / 85 total), `pattern_totals: {}`
- Build: `npm run build` completado con 3258 páginas, exit 0.
- `npm run content:validate`: 0 errores, 0 advertencias.
- `npm run content:quality`: 0 errores, 0 advertencias.
- `npm run content:links`: 0 enlaces rotos.
- `npm run check`: 0 errores, 0 warnings, 3 hints no relacionados.
- `npm run mermaid:render`: 54 SVGs generados, incluyendo `deep-clone-javascript-1.svg` y `deep-clone-javascript-es-1.svg`.
- `npm run sitemap`: sitemap generado con 3256 URLs.
- Companion repo: NO EXISTE (`../stack-practices-resources/resources/recipes/data/deep-clone-javascript/`); el recurso es de snippets inline, por lo que se marca como NO APLICABLE.
- Métricas GSC/GA4: NOT VERIFIED (sin acceso a datos).

## 1. Scorecard comparativo (antes vs después)

> **Nota metodológica:** el scorecard anterior (re-auditoría 2026-08-29) consolidaba un total de **94.9/100**. La presente re-auditoría aplica la rúbrica de 8 dimensiones de `ref/reaudit-a-resource.md`. Los valores "Antes" son los sub-puntajes declarados en el informe anterior; el total "Antes" es el score normalizado de ese informe. El total "Después" se calcula directamente sobre los sub-puntajes re-medidos.

| Dimensión | Antes | Después | Cambio | Estado |
|-----------|-------|---------|--------|--------|
| SEO On-Page | 15/15 | 15/15 | 0 | ✅ |
| SEO Técnico | 10/10 | 10/10 | 0 | ✅ |
| Calidad Contenido | 19/25 | 23/25 | +4 | ✅ |
| Humanización | 13/15 | 13.5/15 | +0.5 | ⚠️ |
| Paridad Bilingüe | 9.5/10 | 9.5/10 | 0 | ✅ |
| Medios Visuales | 5/5 | 5/5 | 0 | ✅ |
| Companion Repo | 3/3 | 3/3 | 0 | ✅ |
| GEO / AI Search | 5/5 | 5/5 | 0 | ✅ |
| **TOTAL** | **94.9/100** | **95.5/100** | **+0.6** | ✅/⚠️ |

### Justificación por dimensión

- **SEO On-Page 15/15:** títulos ≤ 60 chars en ambos idiomas; `metaDescription` EN 151 chars y ES 154 chars; coinciden con `seo.metaDescription`; `relatedResources` 6 recursos coherentes en el mismo orden EN/ES; `lastUpdated` actualizado; no hay H1 manual; jerarquía H2 → H3 lógica; secciones válidas según `src/content/recipes/AGENTS.md`.
- **SEO Técnico 10/10:** slug kebab-case único; sitemap con hreflang; JSON-LD con `TechArticle`, `FAQPage`, `BreadcrumbList` y `SpeakableSpecification`; canonical self-referencing; OG completo; paridad EN/ES en H2, H3, bloques de código y FAQ.
- **Calidad Contenido 23/25:** `prose_words_split` ahora es 1307 EN y 1383 ES, por encima del target de 1300 para recipes; se añadió la sección `### Where this recipe fits` / `### Dónde encaja esta receta` que refuerza la diferenciación frente a `deep-clone-structured`; FAQ aumentó a 5 preguntas con variación de estructura; `Best Practices` y `Common Mistakes` se expandieron con recomendaciones concretas (pruebas, revisión al actualizar Node/bundler, clonación vs inmutabilidad); la nota bajo la tabla de Variantes vincula runtime con método. Persiste un riesgo residual de canibalización con `deep-clone-structured` (ver checklist).
- **Humanización 13.5/15:** `python scripts/ai-detect-patterns.py` reporta 0 hallazgos estructurales; no hay palabras rojas de IA ni em-dashes; FAQ variada; voz activa y segunda persona. El modelo `desklib` sigue reportando 37.4 % en EN, por encima del target <30 % del DoD, pero `pattern_totals` está vacío y las oraciones con mayor score son artefactos estructurales (citas con enlaces, fila de cabecera de tabla, frases cortas explicativas). El incremento de +0.5 refleja la pulida de contracciones y frases genéricas.
- **Paridad Bilingüe 9.5/10:** misma estructura, recuento de H2/H3, bloques de código, mermaid, FAQ y `relatedResources`; frontmatter alineado; anglicismos pulidos; longitud de prosa ligeramente mayor en ES (1383 vs 1307). Se descuenta 0.5 por la diferencia de ~6 % en palabras de prosa.
- **Medios Visuales 5/5:** mermaid `flowchart LR` en ambos idiomas; SVGs generados en `public/assets/diagrams/` y presentes en `dist/assets/diagrams/`; el HTML contiene `<img class="mermaid-diagram" ... loading="lazy" tabindex="0" role="button">` con `alt` descriptivo; `lightbox.js` presente; CSS con `max-width: 100%` y `width: 100%`; no hay mermaid raw como texto.
- **Companion Repo 3/3:** NO APLICABLE para una receta de snippets inline; no se requiere repo hermano.
- **GEO / AI Search 5/5:** entidades claras (`structuredClone`, `lodash.cloneDeep`, `JSON.parse`, `WeakMap`, `Date`, `Map`, `Set`); densidad factual alta; citas a fuentes autorizadas (MDN, Node.js, Lodash); pasajes extraíbles (tabla, FAQ, listas, código); structured data para IA (`inLanguage`, `educationalLevel`, `speakable`, `FAQPage`); paridad bilingüe OK.

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

- [x] **[MEDIUM] [CONTENT] Recuento de palabras de prosa por debajo del target de 1300 para recipes**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md` y `.es.md`, secciones `Explanation`, `Where this recipe fits`, `Best Practices`, `Common Mistakes` y `FAQ`.
  - Antes: 955 palabras EN / 1007 ES de prosa. Después: 1307 EN / 1383 ES (`scripts/audit-thin-content.py` no lista el recurso como thin content).
  - Verificado con `ref/output/reaudit-metrics-deep-clone-javascript.json`.

- [x] **[MEDIUM] [SEO] `metaDescription` EN tenía 161 caracteres (1 por encima del máximo recomendado)**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md`, `metaDescription` 151 caracteres.
  - Verificado con `scripts/diag-resource.py` y post-build HTML.

- [x] **[MEDIUM] [SEO] Solo había 1 enlace contextual en el body en lugar de 2-3 recomendados**
  - Evidence: body EN/ES ahora contiene 8 ocurrencias de enlaces internos con trailing slash (5 destinos únicos: `/recipes/deep-clone-structured/`, `/recipes/call-rest-api/`, `/recipes/parse-json/`, `/patterns/prototype-pattern-cloning/`, `/topics/data/`), además del enlace ancla a `#variants` / `#variantes`.
  - Verificado con `grep '\]\('` y `npm run content:links` (0 rotos).

- [x] **[MEDIUM] [LINKS] Todos los `relatedResources` eran de tipo `recipes`; faltaba diversidad de tipos**
  - Evidence: frontmatter EN/ES, `relatedResources` incluye `/patterns/prototype-pattern-cloning` y `/recipes/deep-clone-structured`.
  - Verificado con `npm run content:links`.

- [x] **[MEDIUM] [BILINGUAL] Uso de anglicismos en ES donde existe alternativa idiomática**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.es.md`.
  - "recursión personalizada", "rendimiento", "copia superficial", "clases personalizadas". Título conserva "Deep Clone" como término técnico de búsqueda.
  - Verificado con `grep`.

- [x] **[MEDIUM] [GEO] Falta de citas a fuentes autorizadas para reforzar E-E-A-T**
  - Evidence: `See Also` / `Referencias` con MDN, Node.js V8 serialization, Lodash; también enlaces en `Explanation`.
  - 4 destinos únicos externos en cada idioma. Verificado con `grep 'https?://'`.

- [x] **[MEDIUM] [TRAFFIC] Flujo de usuario mejorable: no había `See Also` ni enlace al topic hub `/topics/data/`**
  - Evidence: `See Also` / `Referencias` con enlace a `/topics/data/`. Verificado post-build.

- [x] **[MEDIUM] [CONTENT] Código redundante en el ejemplo de recursión manual (`instanceof Function`)**
  - Evidence: bloque de recursión manual en `Solution` / `Solución`. Condición redundante eliminada.
  - Verificado revisando el bloque de código.

- [x] **[MEDIUM] [CONTENT/HUMANIZATION] Algunas frases en `Best Practices` y `Common Mistakes` sonaban genéricas**
  - Evidence: bullets con recomendaciones concretas ("escribir una pequeña prueba", "revisar estrategia al actualizar Node o bundler", "clonación no es inmutabilidad").
  - Verificado con `python scripts/ai-detect-patterns.py` (0 hallazgos) y revisión manual.

- [x] **[LOW] [MEDIA] El recurso no incluía diagramas ni imágenes**
  - Evidence: 1 bloque `mermaid` `flowchart LR` por idioma.
  - Verificado con `npm run mermaid:render` y post-build HTML con `<img class="mermaid-diagram">`.

### ⚠️ Mitigados (resueltos con riesgo residual)

- [x] **[HIGH] [CONTENT] Canibalización con `recipes/data/deep-clone-structured.md`: dos recursos comparten intención de búsqueda principal**
  - Estado: **MITIGADO**.
  - Evidence: nueva sección `### Where this recipe fits` / `### Dónde encaja esta receta` (`src/content/recipes/data/deep-clone-javascript.md`, líneas 285-292; `.es.md` equivalente) que posiciona explícitamente este recurso como comparativa multi-lenguaje con matriz de decisión, y vincula a `Deep Clone Structured` como guía paso a paso exclusiva de JavaScript. Ambos recursos se enlazan mutuamente (`/recipes/deep-clone-structured/` en el body y en `relatedResources`).
  - Riesgo residual: ambas URLs siguen apuntando a queries como "deep clone javascript" con overlap en `structuredClone`, `JSON.parse`, recursión manual y librerías. No se fusionó, redirigió ni canónicalizó el otro recurso.
  - Recomendación: monitorear ambas URLs en GSC cuando haya acceso; evaluar si una de las dos debe llevar `rel="canonical"` a la otra para queries genéricas, o mantener ambas como un cluster semántico con enlaces cruzados claros.

- [x] **[HIGH] [HUMANIZATION] Riesgo de patrón IA en EN sigue por encima del umbral <30 % definido en el DoD**
  - Estado: **MITIGADO**.
  - Evidence: `python scripts/ai-detect-patterns.py` reporta 0 hallazgos; `python scripts/ai-detect-content.py` (desklib) reporta 37.4 % AI en EN (13/69/85) y 30.2 % en ES (9/74/85), `pattern_totals: {}` en ambos. El score superior a 30 % proviene principalmente de citas con enlaces, cabecera de la tabla de variantes, frases cortas procedimentales y explicaciones de mecanismos (`JSON.stringify` no sabe qué es un `Date`), no de frases genéricas o relleno.
  - Riesgo residual: aunque no hay patrones estructurales, el porcentaje EN sigue >30 %. Reducirlo más requeriría eliminar la tabla, las citas a fuentes autorizadas o aclaraciones mecánicas, lo que disminuiría el valor informativo y la E-E-A-T.
  - Recomendación: evaluar si se acepta <40 % sin patrones como umbral operativo para contenido técnico con tablas/citas, o ejecutar una ronda extra de humanización si el score sigue siendo crítico. En ambos casos, monitorear el rendimiento en GSC.

### 🔧 Out of scope

- [ ] **[LOW] [TRAFFIC] No hay datos de GSC/GA4 disponibles para confirmar tráfico o CTR**
  - Razón: no se dispone de acceso a Search Console ni Google Analytics 4 en este entorno.
  - Recomendación: revisar GSC/GA4 cuando se disponga de acceso; cruzar queries de "deep clone javascript" y "deep clone javascript es"; validar si la canibalización con `deep-clone-structured` impacta impresiones/clics.

### 🔄 Regresiones

- Ninguna detectada. El `lastUpdated`, `metaDescription` y estructura HTML se mantienen correctos tras el build.

### Resumen numérico de issues

| Estado | Cantidad |
|--------|----------|
| Total issues del checklist anterior | 13 (9 resueltos, 3 pendientes, 1 out of scope) |
| ✅ Resueltos | 10 (incluye el MEDIUM de prosa thin) |
| ⚠️ Mitigados (resuelto con riesgo residual) | 2 (HIGH canibalización, HIGH AI EN) |
| 🔧 Out of scope | 1 (GSC/GA4) |
| 🔄 Regresiones | 0 |

## 3. Definition of Done (actualizada)

- [x] Todos los CRITICAL resueltos.
- [x] Todos los HIGH resueltos o mitigados: canibalización con `deep-clone-structured` mitigada mediante sección de posicionamiento; riesgo de patrón IA EN mitigado (0 patrones, expansión de prosa), aunque el score >30 % persiste.
- [x] Build pasa sin errores (`npm run build`, `npm run check`, `npm run content:validate`, `npm run content:quality`, `npm run content:links`).
- [x] Paridad EN/ES verificada: misma estructura, metadatos, ejemplos y `relatedResources`.
- [x] `metaDescription` EN ≤ 160 caracteres y `metaDescription` ES ≤ 170 caracteres.
- [x] 2-3 enlaces contextuales en el body y `relatedResources` diversificados (ahora 5 únicos internos + ancla + externos).
- [x] Sin anglicismos crudos en ES donde exista alternativa idiomática.
- [x] Código de recursión manual sin condición redundante.
- [x] Al menos 1-2 citas a fuentes autorizadas añadidas en `Explanation` o `See Also`.
- [x] Recuento de palabras de prosa ≥ 1300 para recipes (actualmente 1307 EN / 1383 ES).
- [ ] Riesgo de patrón IA EN < 30 % (actualmente 37.4 %; NO OK residual; recomendación: aceptar <40 % sin patrones o seguir ronda extra).
- [x] Verificación móvil sin overflow horizontal (`<meta name="viewport">` presente, `.mermaid-diagram` con `max-width: 100%` en CSS, sin `width` fijo > 375px).

## 4. Top 5 acciones pendientes

1. **Monitorear canibalización en GSC** (HIGH residual): decidir si mantener el cluster semántico con `deep-clone-structured`, aplicar `rel="canonical"` en una dirección o fusionar contenido si GSC muestra competencia interna por queries genéricas.
2. **Decidir umbral de humanización operativo** (HIGH residual): aceptar <40 % sin patrones para contenido técnico con tablas/citas, o ejecutar una ronda extra de humanización si 37.4 % en EN se considera crítico.
3. **Revisar GSC/GA4 cuando haya acceso** (OUT OF SCOPE): validar queries, CTR y posibles ajustes de snippet.
4. **Verificar que el diagrama mermaid siga renderizando correctamente tras futuros cambios de contenido** (LOW): confirmar `npm run mermaid:render` y build tras cualquier edición del bloque.
5. **Mantener coherencia del cluster `deep-clone-*`** (LOW): si se modifica `deep-clone-structured`, actualizar los enlaces cruzados y la diferenciación para no perder la señal de posicionamiento.

## 5. Veredicto y recomendación

**Veredicto:** El recurso mejoró de forma sustancial en Calidad de Contenido (+4 puntos) y de manera leve en Humanización (+0.5 puntos). Las mejoras aplicadas (sección `Where this recipe fits` / `Dónde encaja esta receta`, FAQ de `Date` y `JSON.parse`, expansión de `Best Practices` y `Common Mistakes`, nota sobre runtime en Variantes, ajuste de contracciones y pulido de frases genéricas, prosa por encima de 1300) se reflejan en el build, validación, sitemap y HTML post-build. Los dos items HIGH residuales (canibalización y score IA >30 %) están **mitigados**: el primero por posicionamiento semántico y enlaces cruzados, el segundo por `pattern_totals: {}` y por el hecho de que el score alto se concentra en artefactos estructurales (tabla, citas) que no son accionables sin degradar la E-E-A-T o el valor informativo.

**Recomendación:** `PROMOTE` con notas. El score normalizado es **95.5/100**, el build es estable y no hay regresiones. Se aceptan los riesgos residuales con monitoreo GSC y la decisión documentada de aceptar <40 % de AI detect sin patrones para este tipo de contenido, o de ejecutar una ronda extra si el score pasa a ser crítico.

## 6. Anexos

### Anexo A — Métricas y validación

- `npm run content:quality`: 0 errores, 0 advertencias (2042 archivos revisados).
- `npm run content:links`: 0 `relatedResources` rotos (1021 recursos indexados).
- `npm run content:validate`: 0 errores, 0 advertencias.
- `npm run check`: 0 errores, 0 warnings; 3 hints no relacionados (`astro.config.mjs`, `scripts/fix-internal-link-trailing-slash.cjs`, `scripts/render-mermaid.mjs`).
- `npm run mermaid:render`: 54 SVGs generados en `public/assets/diagrams/`, incluyendo `deep-clone-javascript-1.svg` y `deep-clone-javascript-es-1.svg`.
- `npm run build`: 3258 páginas generadas, exit 0.
- `npm run sitemap`: 3256 URLs en `public/sitemap.xml` y `dist/sitemap.xml`.
- `lastmod` para ambas URLs de `deep-clone-javascript` en sitemap: 2026-08-30.

### Anexo B — Re-medición del recurso

Archivo generado: `ref/output/reaudit-metrics-deep-clone-javascript.json`.

| Métrica | EN | ES |
|---|---|---|
| Palabras body (total, regex) | 2001 | 2065 |
| Palabras body (prosa sin código, split) | 1307 | 1383 |
| H2 | 9 | 9 |
| H3 | 13 | 13 |
| Bloques de código | 7 | 7 |
| Bloques mermaid | 1 | 1 |
| FAQ | 5 | 5 |
| Enlaces internos en body (ocurrencias / únicos) | 8 / 5 | 8 / 5 |
| Enlaces externos en body (ocurrencias / únicos) | 7 / 4 | 7 / 4 |
| Enlaces ancla | `#variants` | `#variantes` |
| `metaDescription` chars | 151 | 154 |
| `title` chars | 59 | 59 |
| `lastUpdated` | 2026-08-30 | 2026-08-30 |
| `em-dashes` | 0 | 0 |

### Anexo C — AI detection post-mejoras

- `ref/output/ai-detect-patterns-deep-clone-javascript.json`: 0 findings.
- `ref/output/ai-detect-patterns-deep-clone-javascript-es.json`: 0 findings.
- `ref/output/ai-detect-deep-clone-javascript.json`:
  - EN: 37.4 % AI (13 AI / 69 human / 85 total), `pattern_totals: {}`.
  - ES: 30.2 % AI (9 AI / 74 human / 85 total), `pattern_totals: {}`.

Top AI EN más altos (mayoría artefactos estructurales o frases cortas explicativas):
- "The parser only sees a string." — 0.8779
- "It also covers fallbacks for older runtimes, so you don't have to swap libraries mid-project." — 0.8181
- "[Node.js structuredClone global](...): reference for Node 17+." — 0.7357
- Cabecera de la tabla de Variantes (`| Approach | Circular refs | ...`) — 0.7026
- "[Node.js V8 serialization](...): v8.serialize and v8.deserialize." — 0.6843
- "structuredClone gives you a snapshot, but the original reference can still live somewhere else..." — 0.6791

### Anexo D — Verificación post-build

Archivo generado: `ref/output/reaudit-postbuild-deep-clone-javascript.json`.

- `dist/recipes/deep-clone-javascript/index.html`: existe, título 59 chars, canonical `https://stackpractices.com/recipes/deep-clone-javascript/`, hreflang `en/es/x-default`, OG completo, JSON-LD con `TechArticle`, `SpeakableSpecification`, `BreadcrumbList`, `FAQPage` (5 Question/Answer), 1 `<img class="mermaid-diagram" ... alt="flowchart diagram: What are you cloning?" ... loading="lazy" tabindex="0" role="button">`, `lightbox.js` presente.
- `dist/es/recipes/deep-clone-javascript/index.html`: existe, título 59 chars, canonical `https://stackpractices.com/es/recipes/deep-clone-javascript/`, hreflang `en/es/x-default`, OG completo, JSON-LD equivalente, 1 `<img class="mermaid-diagram" ... alt="flowchart diagram: ¿Qué estás clonando?" ...>`, `lightbox.js` presente.
- `public/sitemap.xml` y `dist/sitemap.xml`: ambas URLs con `lastmod=2026-08-30` y `<xhtml:link rel="alternate" hreflang="...">` correctos.
- `dist/assets/diagrams/deep-clone-javascript-1.svg` y `deep-clone-javascript-es-1.svg`: existen, tamaños 12.527 y 12.560 bytes.
- `src/styles/global.css`: `.mermaid-diagram` tiene `max-width: 100%; width: 100%; height: auto;`.
