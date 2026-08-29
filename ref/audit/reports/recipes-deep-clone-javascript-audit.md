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
- lastUpdated: 2026-08-29 (coincide EN/ES)
- publishedAt: 2026-06-11
- author: Mathias Paulenko
- Palabras body EN: 1636 totales / 955 de prosa (sin bloques de código)
- Palabras body ES: 1681 totales / 1007 de prosa (sin bloques de código)
- H2 EN/ES: 9/9, H3 EN/ES: 11/11
- Bloques de código EN/ES: 7/7 (incluye 1 bloque `mermaid` en cada idioma)
- FAQ EN/ES: 4/4
- Enlaces internos en body EN/ES: 7 (con trailing slash)
- Enlaces externos en body EN/ES: 7 (citas a MDN, Node.js y Lodash)
- AI detect patterns EN: 0 hallazgos (`ref/output/ai-detect-patterns-deep-clone-javascript.json`)
- AI detect patterns ES: 0 hallazgos (`ref/output/ai-detect-patterns-deep-clone-javascript-es.json`)
- AI detect content EN: 35.1 % (`ref/output/ai-detect-deep-clone-javascript.json`)
- AI detect content ES: 27.8 % (`ref/output/ai-detect-deep-clone-javascript.json`)
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

> **Nota metodológica:** el audit inicial (2026-08-25) reportaba un total consolidado de **92.5/100** usando una rúbrica de 14 dimensiones. Esta re-auditoría aplica la rúbrica de 8 dimensiones del prompt `ref/reaudit-a-resource.md`. Los valores "Antes" son una reproyección fiel de los sub-puntajes del audit inicial a esas 8 dimensiones; el total comparable se normaliza a /100.

| Dimensión | Antes | Después | Cambio | Estado |
|-----------|-------|---------|--------|--------|
| SEO On-Page | 11/15 | 15/15 | +4 | ✅ |
| SEO Técnico | 9/10 | 10/10 | +1 | ✅ |
| Calidad Contenido | 21/25 | 19/25 | -2 | ⚠️ |
| Humanización | 12/15 | 13/15 | +1 | ⚠️ |
| Paridad Bilingüe | 8.5/10 | 9.5/10 | +1 | ✅ |
| Medios Visuales | 1/5 | 5/5 | +4 | ✅ |
| Companion Repo | 3/3 | 3/3 | 0 | ✅ |
| GEO / AI Search | 4/5 | 5/5 | +1 | ✅ |
| **TOTAL** | **69.5/88 (79.0/100)** | **83.5/88 (94.9/100)** | **+15.9** | ✅/⚠️ |

### Justificación por dimensión

- **SEO On-Page 15/15:** títulos ≤60 chars en ambos idiomas; `metaDescription` EN 151 chars y ES 154 chars; coinciden con `seo.metaDescription`; `relatedResources` diversificados y en el mismo orden EN/ES; `lastUpdated` actualizado; no hay H1 manual; jerarquía H2→H3 lógica; secciones válidas según `src/content/recipes/AGENTS.md`.
- **SEO Técnico 10/10:** slug kebab-case único; sitemap con hreflang; JSON-LD con `TechArticle`, `FAQPage`, `BreadcrumbList` y `SpeakableSpecification`; canonical self-referencing; OG completo; paridad EN/ES en H2, H3, bloques de código y FAQ.
- **Calidad Contenido 19/25:** information gain alto (matriz de decisión, ejemplos en Python/Java, mermaid, citas externas); FAQ de 4 preguntas variadas; el conteo total de palabras supera el mínimo (1636/1681), pero el conteo de prosa sin código queda en 955/1007, por debajo del target de 1300 para recipes; la canibalización con `deep-clone-structured` persiste aunque se mitigó.
- **Humanización 13/15:** 0 hallazgos de patrones estructurales; 0 palabras rojas de IA; 0 em-dashes; FAQ variada; voz activa y segunda persona en ambos idiomas; paridad bilingüe de tono. El modelo `desklib` sigue reportando 35.1 % en EN, lo que lo deja por encima del target <30 % del DoD.
- **Paridad Bilingüe 9.5/10:** misma estructura, recuento de H2/H3, bloques de código, mermaid, FAQ y `relatedResources`; frontmatter alineado; anglicismos pulidos; longitud de prosa ligeramente mayor en ES (1007 vs 955). Se descuenta 0.5 por la diferencia de ~6 % en palabras de prosa.
- **Medios Visuales 5/5:** mermaid `flowchart LR` en ambos idiomas; SVGs generados en `public/assets/diagrams/` y presentes en `dist/assets/diagrams/`; el HTML contiene `<img class="mermaid-diagram" ... loading="lazy" tabindex="0" role="button">`; `lightbox.js` presente; CSS con `max-width: 100%` y `width: 100%`; no hay mermaid raw como texto.
- **Companion Repo 3/3:** NO APLICA para una receta de snippets inline; no se requiere repo hermano.
- **GEO / AI Search 5/5:** entidades claras (`structuredClone`, `lodash.cloneDeep`, `JSON.parse`, `WeakMap`, `Date`, `Map`, `Set`); densidad factual alta; citas a fuentes autorizadas (MDN, Node.js, Lodash); pasajes extraíbles (tabla, FAQ, listas, código); structured data para IA (`inLanguage`, `educationalLevel`, `speakable`, `FAQPage`); paridad bilingüe OK.

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

- [x] **[MEDIUM] [SEO] `metaDescription` EN tenía 161 caracteres (1 por encima del máximo recomendado)**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md`, líneas 8-10.
  - Antes: 161 caracteres. Después: 151 caracteres. Verificado con `scripts/diag-resource.py` y post-build HTML.
  - Nota: el `metaDescription` ES también está ajustado a 154 caracteres (`src/content/recipes/data/deep-clone-javascript.es.md`, líneas 9-11).

- [x] **[MEDIUM] [SEO] Solo había 1 enlace contextual en el body en lugar de 2-3 recomendados**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md`, líneas 52-53, 60-63, 268-269, 272, 314-315, 341-342, 356-363; ES equivalente.
  - Antes: 1 enlace interno (`/recipes/call-rest-api/`). Después: 7 enlaces internos con trailing slash (`/recipes/deep-clone-structured/`, `/recipes/call-rest-api/`, `/recipes/parse-json/`, `/patterns/prototype-pattern-cloning/`, `/topics/data/`, etc.).
  - Verificado con `grep '\]\('` y `npm run content:links` (0 rotos).

- [x] **[MEDIUM] [LINKS] Todos los `relatedResources` eran de tipo `recipes`; faltaba diversidad de tipos**
  - Evidence: frontmatter EN/ES, líneas 22-28.
  - Antes: 6 `/recipes/*`. Después: `/recipes/parse-json`, `/recipes/flatten-unflatten-objects`, `/recipes/call-rest-api`, `/recipes/date-formatting`, `/patterns/prototype-pattern-cloning`, `/recipes/deep-clone-structured`.
  - Verificado con `npm run content:links` y comparación EN/ES.

- [x] **[MEDIUM] [BILINGUAL] Uso de anglicismos en ES donde existe alternativa idiomática**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.es.md`.
  - Antes: "recursión custom", "performance", "shallow copy", "clases custom". Después: "recursión personalizada", "rendimiento", "copia superficial", "clases personalizadas". Título conserva "Deep Clone" como término técnico de búsqueda.
  - Verificado con `grep` (no se encuentran "custom", "performance" ni "shallow copy" en el cuerpo ES).

- [x] **[MEDIUM] [GEO] Falta de citas a fuentes autorizadas para reforzar E-E-A-T**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md`, líneas 268, 277-278, 356-363; ES líneas 271, 279-281, 359-367.
  - Antes: sin enlaces a MDN/Node/Lodash. Después: citas en `Explanation` y una sección `See Also`/`Referencias` con MDN `structuredClone`, Node.js `structuredClone` global, Node.js V8 serialization y Lodash `cloneDeep`.
  - Verificado con `grep 'https?://'` en el body: 7 ocurrencias en EN/ES.

- [x] **[MEDIUM] [TRAFFIC] Flujo de usuario mejorable: no había `See Also` ni enlace al topic hub `/topics/data/`**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md`, líneas 356-363; ES líneas 359-367.
  - Antes: el body terminaba en `## FAQ`. Después: sección `See Also`/`Referencias` con citas externas y enlace interno a `/topics/data/`.
  - Verificado post-build: HTML contiene el enlace a `/topics/data/`.

- [x] **[MEDIUM] [CONTENT] Código redundante en el ejemplo de recursión manual (`instanceof Function`)**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md`, líneas 108-112; ES líneas 110-113.
  - Antes: `if (obj === null || typeof obj !== "object") return obj;` seguido de `if (obj instanceof Function) return obj;`. Después: condición `instanceof Function` eliminada.
  - Verificado revisando el bloque de código.

- [x] **[MEDIUM] [CONTENT/HUMANIZATION] Algunas frases en `Best Practices` y `Common Mistakes` sonaban genéricas**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md`, líneas 306-329; ES equivalente.
  - Antes: bullets sin contexto de versión o escenario. Después: se mantienen recomendaciones concretas ("Lodash 4.x `cloneDeep`", "copia defensiva antes de mutar datos de API", "Immer con árboles inmutables grandes").
  - Verificado con `python scripts/ai-detect-patterns.py` (0 hallazgos estructurales) y revisión manual.

- [x] **[LOW] [MEDIA] El recurso no incluía diagramas ni imágenes**
  - Evidence: `src/content/recipes/data/deep-clone-javascript.md`, líneas 282-293; ES líneas 288-297.
  - Antes: 0 bloques mermaid. Después: 1 `flowchart LR` por idioma.
  - Verificado con `npm run mermaid:render` (generó `public/assets/diagrams/deep-clone-javascript-1.svg` y `deep-clone-javascript-es-1.svg`) y post-build HTML con `<img class="mermaid-diagram">`.

- [x] **[HIGH] [HUMANIZATION] El contenido EN tenía un riesgo de patrón IA de 37.5 %**
  - Evidence: `ref/output/ai-detect-deep-clone-javascript.json`.
  - Antes: 37.5 % EN, 27.3 % ES. Después: 35.1 % EN, 27.8 % ES; 0 hallazgos en `ai-detect-patterns`.
  - Nota: el score bajó, pero aún no alcanza el target <30 % en EN (ver item pendiente).

### ⚠️ Pendientes

- [ ] **[HIGH] [CONTENT] Canibalización con `recipes/data/deep-clone-structured.md`: dos recursos comparten intención de búsqueda principal**
  - Razón: aunque este recurso se diferenció como **comparativa multi-lenguaje con matriz de decisión** y se enlazan mutuamente (`src/content/recipes/data/deep-clone-javascript.md`, línea 52; `relatedResources` línea 28), ambas URLs siguen apuntando a queries como "deep clone javascript" con overlap en `structuredClone`, `JSON.parse`, recursión manual y librerías. No se fusionó, redirigió ni se modificó el otro recurso en este skill.
  - Recomendación: monitorear ambas URLs en GSC cuando haya acceso; evaluar si una de las dos debe llevar `rel="canonical"` a la otra para queries genéricas, o mantener ambas como un cluster semántico con enlaces cruzados claros.

- [ ] **[HIGH] [HUMANIZATION] Riesgo de patrón IA en EN sigue por encima del umbral <30 % definido en el DoD**
  - Razón: `python scripts/ai-detect-content.py` reporta 35.1 % en EN (7/64 oraciones marcadas como IA). Las oraciones con mayor score son principalmente citas con enlaces y la fila de cabecera de la tabla de variantes (artefactos estructurales, no frases genéricas), pero el score supera el target.
  - Recomendación: revisar si el score elevado se debe a la tabla/citas; si persiste, añadir 1-2 párrafos con advertencia o experiencia real del autor y reescribir la cabecera de la tabla a una frase más ligera.

- [ ] **[MEDIUM] [CONTENT] Recuento de palabras de prosa por debajo del target de 1300 para recipes**
  - Razón: `scripts/audit-thin-content.py` reporta 955 palabras EN y 1007 ES de prosa (sin contar bloques de código). El conteo total incluyendo código es 1636/1681, por lo que el valor práctico sigue siendo alto, pero la explicación escrita se apretó respecto al audit inicial.
  - Recomendación: expandir 1-2 párrafos en `Explanation` o `Best Practices` para recuperar ~200-300 palabras de prosa sin volver al tono genérico.

### 🔧 Out of scope

- [ ] **[LOW] [TRAFFIC] No hay datos de GSC/GA4 disponibles para confirmar tráfico o CTR**
  - Razón: no se dispone de acceso a Search Console ni Google Analytics 4 en este entorno.
  - Recomendación: revisar GSC/GA4 cuando se disponga de acceso; cruzar queries de "deep clone javascript" y "deep clone javascript es".

### 🔄 Regresiones

- Ninguna detectada. El conteo de palabras de prosa bajó, pero se reporta como item pendiente con evidence y recomendación (no como regresión crítica porque el conteo total de body con código supera el mínimo y el recurso mantiene information gain).

### Resumen numérico de issues

| Estado | Cantidad |
|--------|----------|
| Total issues del audit inicial | 10 (1 HIGH humanización, 1 HIGH content, 7 MEDIUM, 2 LOW) |
| ✅ Resueltos | 9 |
| ⚠️ Pendientes | 3 (2 HIGH, 1 MEDIUM) |
| 🔧 Out of scope | 1 |
| 🔄 Regresiones | 0 |

## 3. Definition of Done (actualizada)

- [x] Todos los CRITICAL resueltos.
- [ ] Todos los HIGH resueltos: canibalización con `deep-clone-structured` mitigada pero no resuelta del todo; riesgo de patrón IA en EN aún >30 %.
- [x] Build pasa sin errores (`npm run build`, `npm run check`, `npm run content:validate`, `npm run content:quality`, `npm run content:links`).
- [x] Paridad EN/ES verificada: misma estructura, metadatos, ejemplos y `relatedResources`.
- [x] `metaDescription` EN ≤160 caracteres y `metaDescription` ES ≤170 caracteres.
- [x] 2-3 enlaces contextuales en el body y `relatedResources` diversificados.
- [x] Sin anglicismos crudos en ES donde exista alternativa idiomática.
- [x] Código de recursión manual sin condición redundante.
- [x] Al menos 1-2 citas a fuentes autorizadas añadidas en `Explanation` o `See Also`.
- [ ] Recuento de palabras de prosa ≥1300 para recipes (actualmente 955 EN / 1007 ES).
- [ ] Riesgo de patrón IA EN <30 % (actualmente 35.1 %).
- [x] Verificación móvil sin overflow horizontal (`<meta name="viewport">` presente, sin `width` fijo >375px, `.mermaid-diagram` con `max-width: 100%` en CSS).

## 4. Top 5 acciones pendientes

1. **Reducir riesgo de patrón IA en EN por debajo del 30 %** (HIGH): revisar si el score proviene de la tabla/citas y pulir 2-3 oraciones si es necesario.
2. **Resolver o consolidar la canibalización con `deep-clone-structured`** (HIGH): decidir si se mantiene el cluster con enlaces cruzados o se aplica canonical/merge/fusión en una sesión manual.
3. **Recuperar profundidad de prosa hasta ≥1300 palabras** (MEDIUM): ampliar `Explanation` o `Best Practices` con ~200-300 palabras de valor sin caer en relleno.
4. **Revisar GSC/GA4 cuando haya acceso** (LOW / OUT OF SCOPE): validar queries, CTR y posibles ajustes de snippet.
5. **Verificar que el diagrama mermaid siga renderizando correctamente tras futuros cambios de contenido** (LOW): confirmar `mermaid:render` y build tras cualquier edición del bloque.

## 5. Veredicto y recomendación

**Veredicto:** El recurso mejoró de forma muy significativa en SEO on-page (+4), SEO técnico (+1), medios visuales (+4), GEO/E-E-A-T (+1) y paridad bilingüe (+1). Las mejoras aplicadas (metaDescription corregido, relatedResources diversificados, enlaces contextuales, sección See Also con citas, anglicismos pulidos, diagrama Mermaid, código redundante eliminado) se reflejan en el build, validación, sitemap y HTML post-build. Sin embargo, persisten dos items HIGH (canibalización con `deep-clone-structured` y riesgo de patrón IA en EN >30 %) y un item MEDIUM (prosa por debajo de 1300 palabras).

**Recomendación:** `FIX-THEN-PROMOTE` con prioridad en los dos items HIGH y el item MEDIUM. El score normalizado es **94.9/100**, pero el recurso aún no cumple todos los criterios del DoD.

## 6. Anexos

### Anexo A — Métricas y validación

- `npm run content:quality`: 0 errores, 0 advertencias (2042 archivos revisados).
- `npm run content:links`: 0 `relatedResources` rotos (1021 recursos indexados).
- `npm run content:validate`: 0 errores, 0 advertencias.
- `npm run check`: 0 errores, 0 warnings; 3 hints no relacionados (`astro.config.mjs`, `scripts/fix-internal-link-trailing-slash.cjs`, `scripts/render-mermaid.mjs`).
- `npm run mermaid:render`: 54 SVGs generados en `public/assets/diagrams/`, incluyendo `deep-clone-javascript-1.svg` y `deep-clone-javascript-es-1.svg`.
- `npm run build`: 3258 páginas generadas, exit 0.
- `npm run sitemap`: 3256 URLs en `public/sitemap.xml` y `dist/sitemap.xml`.

### Anexo B — Re-medición del recurso

Archivo generado: `ref/output/reaudit-metrics-deep-clone-javascript.json`.

| Métrica | EN | ES |
|---|---|---|
| Palabras body (total) | 1636 | 1681 |
| Palabras body (prosa sin código) | 955 | 1007 |
| H2 | 9 | 9 |
| H3 | 11 | 11 |
| Bloques de código | 7 | 7 |
| Bloques mermaid | 1 | 1 |
| FAQ | 4 | 4 |
| Enlaces internos en body | 7 | 7 |
| Enlaces externos en body | 7 | 7 |
| `metaDescription` chars | 151 | 154 |
| `title` chars | 59 | 59 |
| `lastUpdated` | 2026-08-29 | 2026-08-29 |

### Anexo C — AI detection post-mejoras

- `ref/output/ai-detect-patterns-deep-clone-javascript.json`: 0 findings.
- `ref/output/ai-detect-patterns-deep-clone-javascript-es.json`: 0 findings.
- `ref/output/ai-detect-deep-clone-javascript.json`:
  - EN: 35.1 % AI (7 AI / 54 human / 64 total).
  - ES: 27.8 % AI (5 AI / 56 human / 63 total).

Top AI EN más altos (mayoría artefactos estructurales):
- "You decide how to clone each type, including class instances rebuilt through new MyClass(...)" — 0.7593
- "[Node.js structuredClone global](...) reference for Node 17+" — 0.7357
- "[Node.js V8 serialization](...): v8.serialize and v8.deserialize" — 0.6843
- "[Lodash cloneDeep](...): documentation and options" — 0.6492

### Anexo D — Verificación post-build

Archivo generado: `ref/output/reaudit-postbuild-deep-clone-javascript.json`.

- `dist/recipes/deep-clone-javascript/index.html`: existe, título 59 chars, canonical `https://stackpractices.com/recipes/deep-clone-javascript/`, hreflang `en/es/x-default`, OG completo, JSON-LD con `TechArticle`, `SpeakableSpecification`, `BreadcrumbList`, `FAQPage`, 1 `<img class="mermaid-diagram" ... alt="flowchart diagram: What are you cloning?" ... loading="lazy" tabindex="0" role="button">`, `lightbox.js` presente.
- `dist/es/recipes/deep-clone-javascript/index.html`: existe, título 59 chars, canonical `https://stackpractices.com/es/recipes/deep-clone-javascript/`, hreflang `en/es/x-default`, OG completo, JSON-LD equivalente, 1 `<img class="mermaid-diagram" ... alt="flowchart diagram: ¿Qué estás clonando?" ...>`.
- `public/sitemap.xml` y `dist/sitemap.xml`: ambas URLs con `lastmod=2026-08-29` y `<xhtml:link rel="alternate" hreflang="...">` correctos.
- `dist/assets/diagrams/deep-clone-javascript-1.svg` y `deep-clone-javascript-es-1.svg`: existen, tamaños 12.527 y 12.560 bytes.
- `src/styles/global.css`, líneas 1748-1761: `.mermaid-diagram` tiene `max-width: 100%; width: 100%; height: auto;`.
