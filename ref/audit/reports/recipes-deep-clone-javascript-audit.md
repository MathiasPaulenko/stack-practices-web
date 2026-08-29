# Checklist de arreglos — recipes/deep-clone-javascript

## 0. Metadata del recurso

- Tipo (contentType): recipes
- Slug: deep-clone-javascript
- Topic: data
- Ruta EN: `src/content/recipes/data/deep-clone-javascript.md`
- Ruta ES: `src/content/recipes/data/deep-clone-javascript.es.md`
- URL producción EN: `https://stackpractices.com/recipes/deep-clone-javascript/`
- URL producción ES: `https://stackpractices.com/es/recipes/deep-clone-javascript/`
- Título EN: "Deep Clone in JavaScript: structuredClone vs lodash vs JSON"
- Título ES: "Deep Clone en JavaScript: structuredClone vs lodash vs JSON"
- lastUpdated: 2026-08-25 (coincide EN/ES)
- publishedAt: 2026-06-11
- author: Mathias Paulenko
- Palabras body EN: 1393
- Palabras body ES: 1436
- AI detect patterns EN: 0 findings (`ref/output/ai-detect-patterns-deep-clone-javascript.json`)
- AI detect patterns ES: 0 findings (`ref/output/ai-detect-patterns-deep-clone-javascript-es.json`)
- AI detect content EN: 37.5 % (`ref/output/ai-detect-deep-clone-javascript.json`)
- AI detect content ES: 27.3 % (`ref/output/ai-detect-deep-clone-javascript.json`)
- Build: `npm run build` completado con 3258 páginas, exit 0.
- `npm run content:validate`: 0 errores, 0 advertencias.
- `npm run content:quality`: 0 errores, 0 advertencias.
- `npm run content:links`: 0 enlaces rotos.
- `npm run check`: 0 errores, 0 warnings, 3 hints no relacionados.
- Companion repo: NO EXISTE (`../stack-practices-resources/resources/recipes/data/deep-clone-javascript/`); el recurso es de snippets inline, por lo que se marca como NO APLICABLE.
- Métricas GSC/GA4: NOT VERIFIED (sin acceso a datos).

## 1. Scorecard y decisiones

### Puntaje por sub-auditoría

| Sub-auditoría | Puntaje bruto | Escala | Score /10 | Nota clave |
|---|---|---|---|---|
| 01 — Técnica e indexabilidad | 9.0 | /10 | 9.0 | Build OK, HTML estático, sitemap, canonical, hreflang, JSON-LD correctos. |
| 02 — SEO / Frontmatter | 11.0 | /15 | 7.3 | MetaDescription EN 1 carácter por encima del recomendado; solo 1 enlace contextual en body; relatedResources todos del mismo tipo. |
| 03 — Calidad de contenido | 21.0 | /25 | 8.4 | Contenido completo y útil, pero canibalización HIGH con `deep-clone-structured`. |
| 04 — Humanización / patrones IA | 12.0 | /15 | 8.0 | EN 37.5 % IA (MEDIUM); ES 27.3 % (LOW); 0 patrones estructurales. |
| 05 — Paridad bilingüe | 8.5 | /10 | 8.5 | Estructura y ejemplos equivalentes; anglicismos en ES a pulir. |
| 06 — GEO / AI Search | 4.0 | /5 | 8.0 | Entidades claras, structured data OK, falta citas a fuentes autorizadas. |
| 08 — Tráfico y crecimiento | 9.0 | /15 | 6.0 | Potencial alto, sin datos GSC/GA4; flujo de usuario mejorable. |
| 09 — Recursos complementarios y medios | 13.0 | /15 | 8.7 | No hay imágenes ni mermaid; mobile estructuralmente OK. |

### Rúbrica consolidada (0-100)

| Dimensión | Peso | Score | Fuente |
|---|---|---|---|
| Intención de búsqueda y ajuste SERP | 15 | 13.0 | 03 |
| Calidad de contenido y utilidad | 15 | 12.0 | 03 |
| Information gain y originalidad | 10 | 8.0 | 03 |
| Cobertura semántica / tópica | 10 | 9.0 | 03 |
| Enlazado interno y arquitectura | 8 | 6.0 | 01 + 02 + 03 |
| SEO técnico e indexabilidad | 10 | 9.0 | 01 |
| E-E-A-T / Confianza | 8 | 7.0 | 03 + 06 |
| UX / legibilidad / accesibilidad | 7 | 7.0 | 03 + 09 |
| GEO / AI Search readiness | 5 | 4.0 | 06 |
| Tráfico y potencial de crecimiento | 10 | 7.0 | 08 |
| Structured data | 3 | 3.0 | 01 + 02 |
| Performance | 5 | 4.0 | 01 (sin datos de CWV) |
| Medios / imágenes | 2 | 1.5 | 09 |
| Frescura / mantenibilidad | 2 | 2.0 | 03 |
| **Total** | | **92.5/100** | |

**Interpretación:** 90-94 = VERY STRONG.

### Decisiones finales

```text
PUNTAJE TOTAL: 92.5/100
ESTADO PÁGINA: VERY STRONG
DECISIÓN INDEXACIÓN: IMPROVE FIRST (pequeños ajustes antes de promocionar)
PAGE-WORTHINESS: PROBABLY YES
RIESGO THIN CONTENT: LOW
RIESGO DUPLICACIÓN: MEDIUM
RIESGO CANIBALIZACIÓN: HIGH
SEO TÉCNICO: PASS
CALIDAD CONTENIDO: STRONG
GEO READINESS: STRONG
POTENCIAL TRÁFICO: HIGH
PARIDAD BILINGÜE: PASS
RIESGO PATRÓN IA: MEDIUM
RIESGO CONTENIDO PROGRAMÁTICO: LOW
RIESGO SOBRE-OPTIMIZACIÓN: LOW
DECISIÓN FINAL: FIX-THEN-PROMOTE
```

## 2. Checklist de arreglos

### Critical

Ningún hallazgo CRITICAL. El build pasa, la versión ES existe y los datos estructurados son válidos.

### High

- [ ] **[HIGH] [CONTENT] Canibalización con `recipes/data/deep-clone-structured.md`: dos recursos compiten por las mismas queries de deep clone en JavaScript**
  - Why: Google puede dividir la autoridad del cluster de clonación profunda entre dos URLs similares, reduciendo el ranking de ambas.
  - Evidence: `src/content/recipes/data/deep-clone-structured.md` (líneas 1-80, 188-191) cubre `JSON.parse`, `structuredClone`, recursión manual y librerías; su título "Deep Clone Objects in JavaScript: Beyond JSON.parse" se solapa con "Deep Clone in JavaScript: structuredClone vs lodash vs JSON". Ambos tienen topic `data` y los mismos tags `deep-clone`, `javascript`.
  - How: Diferenciar claramente este recurso como la **comparativa multi-lenguaje con matriz de decisión** y redirigir/ fusionar o redimensionar `deep-clone-structured` como el enfoque "paso a paso en TypeScript para principiantes"; al menos enlazarse mutuamente y evitar duplicación de intención principal.
  - Effort: M
  - Source: 03-content-quality, 02-seo-audit

- [ ] **[HIGH] [HUMANIZATION] El contenido EN tiene un riesgo de patrón IA de 37.5 % (10 oraciones de 50 etiquetadas como IA)**
  - Why: Supera el umbral de 30 % y algunas frases son genéricas, lo que puede afectar la percepción de E-E-A-T y la diferenciación en SERP.
  - Evidence: `ref/output/ai-detect-deep-clone-javascript.json` reporta `model_ai_pct: 37.5` con oraciones de alto score como "That freedom means you can decide the exact way to handle each type." (0.91), "A manual recursive clone that uses a WeakMap cache is the most flexible." (0.38), "Start with **structuredClone** when you want a built-in answer." (0.61).
  - How: Reescribir las oraciones de mayor score con un tono más directo, añadir una advertencia o experiencia real del autor, y pulir transiciones como "That freedom means...".
  - Effort: M
  - Source: 04-humanization-audit

### Medium

- [ ] **[MEDIUM] [SEO] Solo hay 1 enlace contextual en el body en lugar de 2-3 recomendados**
  - Why: El enlazado interno contextual refuerza la autoridad del cluster y mejora el flujo de usuario; 1 solo enlace es insuficiente para un recurso intermedio.
  - Evidence: EN `When to Use` enlaza a `[Call REST API](/recipes/call-rest-api/)` (línea 58); ES `Cuándo Usar` enlaza a `[Llamar REST API](/recipes/call-rest-api/)` (línea 58). No hay más enlaces en `Overview`, `Explanation` ni `Best Practices`.
  - How: Añadir 1-2 enlaces contextuales en `Explanation` o `Best Practices` a `/recipes/parse-json/`, `/recipes/flatten-unflatten-objects/` o `/patterns/prototype-pattern-cloning/`.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [LINKS] Todos los `relatedResources` son de tipo `recipes`; falta diversidad de tipos**
  - Why: La arquitectura del sitio se fortalece con enlaces cruzados entre recetas, patrones y guías; además `caching` y `money-currency` son poco relevantes para clonación profunda.
  - Evidence: Frontmatter EN/ES (líneas 18-24): `/recipes/caching`, `/recipes/parse-json`, `/recipes/flatten-unflatten-objects`, `/recipes/call-rest-api`, `/recipes/date-formatting`, `/recipes/money-currency`.
  - How: Reemplazar `/recipes/caching` o `/recipes/money-currency` por `/patterns/prototype-pattern-cloning` o un guide del cluster `data` si existe; verificar con `npm run content:links`.
  - Effort: S
  - Source: 02-seo-audit, 03-content-quality-audit

- [ ] **[MEDIUM] [BILINGUAL] Uso de anglicismos en ES donde existe alternativa idiomática**
  - Why: Mejora la calidad percibida en el mercado hispanohablante y reduce el riesgo de patrón IA.
  - Evidence: ES `metaDescription` usa "recursión custom" (línea 6) y "performance" (línea 6); body "clases custom" (línea 337), "shallow copy" (línea 329), "deep clone" como sustantivo genérico, y "performance" (línea 278).
  - How: Localizar a "recursión personalizada", "rendimiento", "clases personalizadas", "copia superficial" / "copia profunda" salvo cuando el término inglés esté asentado técnicamente (ej. `structuredClone`, `JSON`, `Lodash`).
  - Effort: S
  - Source: 05-bilingual-parity-audit

- [ ] **[MEDIUM] [GEO] Falta de citas a fuentes autorizadas para reforzar E-E-A-T**
  - Why: Los motores de respuesta de IA y los algoritmos de Google valoran fuentes primarias; las afirmaciones sobre compatibilidad de `structuredClone`, tamaño de bundle de Lodash y versiones de Node no tienen soporte externo.
  - Evidence: `Explanation` afirma "It runs in modern browsers, Node 17+, Deno, and Bun" (línea 264 EN) y "about 4 KB for `lodash.cloneDeep` alone" (líneas 277-278 EN) sin enlaces.
  - How: Añadir 2-3 enlaces a MDN (`structuredClone`), Node.js docs (`v8.deserialize`), npm/lodash (`lodash.cloneDeep`) en `Explanation` o una nueva sección `See Also`.
  - Effort: S
  - Source: 06-geo-audit

- [ ] **[MEDIUM] [SEO] `metaDescription` EN tiene 161 caracteres, 1 por encima del máximo recomendado de 160**
  - Why: Google suele truncar alrededor de 155-160 caracteres en escritorio; el `metaDescription` EN mide 161.
  - Evidence: EN frontmatter `metaDescription` (línea 6): "Deep clone JavaScript objects with structuredClone, lodash cloneDeep, JSON.parse, and custom recursion. Handle circular refs, Dates, Maps, Sets, and performance."
  - How: Acortar a 160 caracteres manteniendo las keywords principales; por ejemplo eliminar "and performance" o condensar "circular refs" a "circular references".
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [TRAFFIC] Flujo de usuario mejorable: no hay `See Also` ni enlace al topic hub `/topics/data/`**
  - Why: El final del recurso deja al lector sin una siguiente acción clara, lo que aumenta el bounce rate y reduce la profundidad de sesión.
  - Evidence: El body termina en `## FAQ` (línea 320 EN / 325 ES) sin sección `See Also` ni `Further Reading`; no hay enlaces al topic hub de `data`.
  - How: Añadir una sección `See Also` con `/topics/data/` y 1-2 recursos del mismo cluster; o añadir un enlace al topic hub en `Best Practices`.
  - Effort: S
  - Source: 08-gsc-ga4-traffic-audit, 02-seo-audit

- [ ] **[MEDIUM] [CONTENT] Código redundante en el ejemplo de recursión manual**
  - Why: La condición `if (obj instanceof Function) return obj;` es inalcanzable porque `typeof obj !== "object"` ya captura funciones; esto puede confundir al lector.
  - Evidence: `Manual recursive clone with circular reference support`, EN línea 108, ES línea 108: `if (obj === null || typeof obj !== "object") return obj;` seguido de `if (obj instanceof Function) return obj;`.
  - How: Eliminar el `instanceof Function` o moverlo antes de la condición `typeof obj !== "object"`; validar con el ejemplo.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [CONTENT/HUMANIZATION] Algunas frases en `Best Practices` y `Common Mistakes` suenan genéricas**
  - Why: Las recomendaciones son correctas pero podrían ganar especificidad (versión, escenario concreto, opinión del autor).
  - Evidence: EN `Best Practices` (líneas 294-306): "Use Lodash when you still need to support older browsers or Node versions", "Clone defensively at API boundaries", "With very large immutable trees, libraries like Immer...". ES equivalente.
  - How: Reescribir 2-3 bullets añadiendo contexto: "Use Lodash 4.x `cloneDeep` when...", "Clone defensively before mutating responses from `/recipes/call-rest-api/`...".
  - Effort: M
  - Source: 03-content-quality-audit, 04-humanization-audit

### Low

- [ ] **[LOW] [MEDIA] El recurso no incluye diagramas ni imágenes; podría beneficiarse de un diagrama de decisión**
  - Why: Un `flowchart LR` de "elegir método de deep clone" reforzaría el information gain y la citabilidad en motores de respuesta.
  - Evidence: No hay bloques ` ```mermaid ` ni `![alt](src)` en EN/ES.
  - How: Evaluar si añadir un mermaid sencillo en `Explanation` que muestre: datos simples -> JSON.parse; datos complejos modernos -> structuredClone; legacy/soporte amplio -> Lodash; control total -> recursión manual.
  - Effort: M
  - Source: 09-companion-media-audit

- [ ] **[LOW] [TRAFFIC] No hay datos de GSC/GA4 disponibles para confirmar tráfico o CTR**
  - Why: Sin datos no se puede priorizar ajustes de snippet por mercado o idioma.
  - Evidence: No se dispone de acceso a GSC/GA4 en este entorno.
  - How: Revisar GSC/GA4 cuando se disponga de acceso; cruzar queries de "deep clone javascript" y "deep clone javascript es".
  - Effort: S
  - Source: 08-gsc-ga4-traffic-audit

- [ ] **[LOW] [SEO] `description` EN y ES son correctas pero podrían ganar un beneficio más concreto**
  - Why: Aunque están dentro del rango 80-160, el gancho puede ser más accionable.
  - Evidence: EN `description` (línea 5): "Create fully independent copies..."; ES (línea 5): "Creá copias completamente independientes...".
  - How: Opcionalmente añadir el resultado: "...para evitar efectos secundarios al mutar estado en Redux, APIs o undo/redo".
  - Effort: S
  - Source: 02-seo-audit

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos.
- [ ] Todos los HIGH resueltos: canibalización con `deep-clone-structured` abordada y riesgo de patrón IA bajado (target <30 % en EN).
- [ ] Build pasa sin errores (`npm run build`, `npm run check`, `npm run content:validate`, `npm run content:quality`, `npm run content:links`).
- [ ] Paridad EN/ES verificada: misma estructura, metadatos, ejemplos y `relatedResources`.
- [ ] `metaDescription` EN <=160 caracteres y `metaDescription` ES <=170 caracteres.
- [ ] 2-3 enlaces contextuales en el body y `relatedResources` diversificados.
- [ ] Sin anglicismos crudos en ES donde exista alternativa idiomática.
- [ ] Código de recursión manual sin condición redundante.
- [ ] Al menos 1-2 citas a fuentes autorizadas añadidas en `Explanation` o `See Also`.
- [ ] Verificación móvil sin overflow horizontal (`<meta name="viewport">` presente, sin `width` fijo >375px).

## 4. Top 5 acciones

1. **Resolver la canibalización con `deep-clone-structured`**: decidir si se fusiona, redirige o se diferencia claramente; mientras tanto, enlazarlos mutuamente y evitar duplicar la intención principal.
2. **Reducir el riesgo de patrón IA en EN**: reescribir las oraciones con score >0.6 del detector `desklib` y añadir advertencias/experiencia real del autor.
3. **Mejorar enlazado interno y arquitectura del cluster**: añadir 1-2 enlaces contextuales en `Explanation`/`Best Practices` y sustituir `caching`/`money-currency` en `relatedResources` por un pattern (`prototype-pattern-cloning`) o guide relevante.
4. **Pulir ES y meta tags**: localizar anglicismos ("custom", "performance", "shallow copy"), acortar metaDescription EN a 160 caracteres y añadir `See Also` con `/topics/data/`.
5. **Reforzar GEO/E-E-A-T**: añadir enlaces a MDN `structuredClone`, Node `v8.serialize` y npm `lodash.cloneDeep`, y corregir la condición redundante `instanceof Function` en el ejemplo manual.

## 5. Veredicto

Recurso sólido y casi listo para promoción, pero requiere ajustes de diferenciación frente a `deep-clone-structured`, pulir frases con alto riesgo de patrón IA en inglés y reforzar enlazado interno/GEO antes de considerarlo promocionable.

## 6. Anexos

### Anexo A — Output de 01: Auditoría técnica

- **Indexabilidad**: PASS. HTML estático, `<meta name="viewport">`, canonical, hreflang (en/es/x-default), sin `noindex`.
- **Canonical**: NONE. `https://stackpractices.com/recipes/deep-clone-javascript/` (EN) y `/es/recipes/deep-clone-javascript/` (ES).
- **Sitemap**: OK. Ambas URLs presentes en `public/sitemap.xml` con `lastmod=2026-08-25` y alternates correctos.
- **Redirects**: OK. No se detectaron cadenas de redirección; el script inline de trailing slash es la estrategia del sitio.
- **Structured data**: VALID + ELIGIBLE. `TechArticle` + `BreadcrumbList` + `FAQPage`; `inLanguage=en/es`, `educationalLevel=Intermediate`, `speakable` apunta a `#recipe-summary` y `#faq-content`.
- **Performance**: NOT VERIFIED. No se ejecutó Lighthouse ni PageSpeed Insights.
- **Enlaces internos**: OK. `npm run content:links` reportó 0 rotos.
- **Páginas especiales**: OK. `/404/` no aparece en el sitemap.
- **Paridad técnica bilingüe**: PASS. Ambas versiones generan HTML estático equivalente.
- **Puntaje técnico**: 9/10.

### Anexo B — Output de 02: Auditoría SEO

| Campo | EN | Cumple | Nota |
|---|---|---|---|
| title | 59 chars | Sí | <60 |
| description | 148 chars | Sí | 80-160 |
| metaDescription | 161 chars | Casi | 1 char >160 recomendado; <170 hard max |
| seo.metaDescription | coincide | Sí | |
| slug | deep-clone-javascript | Sí | kebab-case, único |
| topics | data | Sí | válido en `src/content.config.ts` |
| tags | 7 | Sí | relevantes |
| relatedResources | 6 | Sí | todos existen, mismo orden EN/ES, todos `/recipes/*` |
| lastUpdated | 2026-08-25 | Sí | igual en EN/ES |

- **Headings**: OK. H1 desde `title`, body empieza con `## Overview`, jerarquía lógica H2 -> H3.
- **Enlaces contextuales en body**: 1 (EN y ES), objetivo `/recipes/call-rest-api/`.
- **Enlaces entrantes**: 16 archivos en `src/content` hacen referencia a `deep-clone-javascript` (body + relatedResources), incluyendo `deep-clone-structured` y `prototype-pattern-cloning`.
- **Meta duplicada**: LOW. Título único; metaDescription comparte estructura con `deep-clone-structured` pero no es idéntica.
- **CTR en SERP**: MEDIUM-HIGH. Título atractivo y exacto; metaDescription ligeramente larga.
- **Open Graph**: OK. `og:title`, `og:description`, `og:url`, `og:locale`, `og:image`, `twitter:card` presentes en ambos idiomas.
- **Paridad SEO bilingüe**: PASS.
- **Puntaje SEO**: 11/15.

### Anexo C — Output de 03: Calidad de contenido

- **Tipo**: recipe, topic `data`.
- **Intención principal**: informational / tutorial / comparison. Query principal: "deep clone javascript".
- **Puntaje intención**: 13/15.
- **Alineación SERP**: NOT VERIFIED (sin acceso web).
- **Calidad por secciones**: fuertes: `Solution` (múltiples métodos), `Variants` (tabla comparativa), `FAQ` (4 preguntas). Débiles: falta `See Also`; `Best Practices` y `Common Mistakes` podrían ser más específicos.
- **Information gain**: HIGH. Incluye matriz de decisión, implementación manual con `WeakMap`, ejemplos Python y Java, limitaciones de `structuredClone` (DOM, funciones, clases).
- **Thin content**: LOW. 1393 palabras EN, 1436 ES, por encima del mínimo de 1300 para recipes.
- **Duplicación**: MEDIUM. `deep-clone-structured` cubre mucha de la misma intención.
- **Canibalización**: HIGH. Título y contenido de `deep-clone-structured` (`data` + `javascript` + `structuredClone` + `JSON.parse`) se solapan fuertemente con este recurso.
- **Riesgo contenido programático**: LOW. No hay plantilla intercambiable; la tabla y los ejemplos multi-lenguaje aportan originalidad.
- **Riesgo calidad IA**: MEDIUM. Algunas frases genéricas; detector EN 37.5 %.
- **Sobre-optimización**: LOW. Sin keyword stuffing aparente.
- **Paridad contenido bilingüe**: PASS.
- **Page-worthiness**: PROBABLY YES.
- **Puntaje calidad contenido**: 21/25.

### Anexo D — Output de 04: Humanización

- **Riesgo patrón IA**: MEDIUM (EN), LOW (ES).
- **Métricas**:
  - EN: `model_ai_pct` 37.5 % (10 AI / 39 human / 50 total), `pattern_totals` vacío.
  - ES: `model_ai_pct` 27.3 % (4 AI / 45 human / 50 total), `pattern_totals` vacío.
- **Palabras rojas de IA**: no se encontraron del listado estándar (delve, pivotal, etc.).
- **Frases genéricas**: "A manual recursive clone that uses a WeakMap cache is the most flexible.", "That freedom means you can decide the exact way to handle each type.".
- **Tokens/herramientas sueltos**: ninguno crítico.
- **Secciones impersonales**: `Overview` es definitorio pero empieza con una afirmación concreta del problema; `When to Use` usa segunda persona de forma consistente.
- **Paridad humanización bilingüe**: PASS, con riesgo ligeramente mayor en EN.
- **Puntaje humanización**: 12/15.

### Anexo E — Output de 05: Paridad bilingüe

- **Archivo ES existe**: SÍ.
- **Paridad estructura**: PASS. Mismas secciones y jerarquía.
- **Paridad frontmatter**: título, descripción, metaDescription, `lastUpdated`, `relatedResources`, `topics`, `difficulty`, `author` coinciden en sentido y orden.
- **Longitud body**: EN 1393 palabras, ES 1436 palabras. PASS.
- **Paridad ejemplos de código**: PASS. Código JS/TS/Python/Java equivalente; comentarios clave traducidos.
- **Anglicismos en ES**: detectados "custom", "performance", "shallow copy", "deep clone" genérico; se proponen alternativas idiomáticas.
- **Puntaje paridad bilingüe**: 8.5/10.

### Anexo F — Output de 06: GEO / AI Search

- **Claridad de entidades**: HIGH. Entidades principales: `structuredClone`, `lodash.cloneDeep`, `JSON.parse/JSON.stringify`, recursión con `WeakMap`, `Date`, `Map`, `Set`, typed arrays, clases custom.
- **Densidad factual**: HIGH. Tabla de comparación, limitaciones por entorno, versiones de Node, tamaño de bundle aproximado.
- **Citas**: INSUFFICIENT. Sin enlaces a MDN, Node docs o npm.
- **Pasajes extraíbles**: HIGH. Listas, tablas, bloques de código y FAQ autocontenidos.
- **Consistencia terminológica**: PASS. Uso estable de "deep clone", "shallow copy", `structuredClone`, etc.
- **Structured data para IA**: OK. `TechArticle` con `speakable`, `inLanguage`, `educationalLevel`, `FAQPage`.
- **Paridad GEO bilingüe**: PASS.
- **Puntaje GEO**: 4/5.

### Anexo G — Output de 08: Tráfico y crecimiento

- **Métricas GSC**: NOT VERIFIED.
- **Tendencia**: NOT VERIFIED.
- **CTR y snippet**: MEDIUM-HIGH. Título atractivo; metaDescription ligeramente larga.
- **Queries principales**: "deep clone javascript", "structuredclone vs lodash", "javascript deep copy", "deep clone nodejs".
- **Países e idiomas**: NOT VERIFIED.
- **Estado GA4**: NOT VERIFIED (script `analytics.js` y GTM presentes en build).
- **Flujo de usuario**: NEEDS IMPROVEMENT. Solo 1 enlace contextual y sin `See Also`/CTA final.
- **Potencial linkable asset**: MEDIUM. Tabla comparativa y ejemplos multi-lenguaje son citables.
- **Backlinks**: NOT VERIFIED.
- **UX móvil**: OK estructuralmente (`viewport` presente, sin anchos fijos, `lightbox.js` presente sin mermaid).
- **Potencial tráfico**: HIGH.
- **Puntaje prioridad tráfico**: 9/15.

### Anexo H — Output de 09: Recursos complementarios y medios

- **Companion repo**: NO EXISTE; NO APLICA para un recurso de snippets inline.
- **Imágenes/diagramas**: NO MEDIA. No hay mermaid blocks ni `![alt](src)` en EN/ES.
- **Renderizado**: N/A. Sin mermaid no hay riesgo de raw mermaid. `lightbox.js` sigue presente en el HTML.
- **Móvil**: `viewport` presente; no se encontraron anchos fijos >375px; CSS via Tailwind responsive.
- **SEO de imágenes**: N/A.
- **Accesibilidad**: N/A.
- **Puntaje media**: 13/15 (se deja como recomendación opcional añadir un diagrama de decisión).
