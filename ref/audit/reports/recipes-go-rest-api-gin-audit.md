# Checklist de arreglos — recipes/go-rest-api-gin

## 0. Metadata del recurso

- **Tipo (contentType):** recipes
- **Slug:** go-rest-api-gin
- **Topic:** api
- **Ruta EN:** `src/content/recipes/api/go-rest-api-gin.md`
- **Ruta ES:** `src/content/recipes/api/go-rest-api-gin.es.md`
- **URL producción EN:** `https://stackpractices.com/recipes/go-rest-api-gin/`
- **URL producción ES:** `https://stackpractices.com/es/recipes/go-rest-api-gin/`
- **Título EN:** Go REST API with Gin and Middleware (35 chars)
- **Título ES:** REST API en Go con Gin y Middleware (35 chars)
- **metaDescription EN:** 150 chars
- **metaDescription ES:** 165 chars
- **description EN:** 146 chars
- **description ES:** 149 chars
- **lastUpdated:** 2026-08-18
- **publishedAt:** 2026-06-18
- **difficulty:** intermediate
- **author:** Mathias Paulenko
- **relatedResources:** 6 (dentro del rango 3-6, mismo orden EN/ES)
- **Companion repo:** No existe
- **Mermaid diagrams:** 0
- **Build ejecutado:** Sí — 3258 páginas
- **Sitemap:** Incluido (EN y ES con hreflang)

---

## 1. Scorecard y decisiones

| Dimensión | Peso | Puntaje | Notas |
|-----------|------|---------|-------|
| SEO On-Page | 15 | 14/15 | Título OK, meta EN OK, meta ES 165 chars (cerca del tope duro 170), sin sección See Also / enlaces externos. |
| SEO Técnico | 10 | 10/10 | Build OK, canonical, hreflang, sitemap, structured data, Open Graph correctos. |
| Calidad de contenido | 25 | 21/25 | Cumple mínimos de palabras, buena cobertura de código, FAQ extensa; Explanation y Variants podrían ampliarse; faltan enlaces externos/citas oficiales. |
| Humanización | 15 | 8/15 | EN 43.3% AI (Desklib, pattern_totals vacío), ES 30.9% AI; ausencia de voz en primera persona; varias oraciones terminan en tokens de código; FAQ con estructura muy repetitiva. |
| Paridad bilingüe | 10 | 9/10 | Estructura, metadatos y código equivalentes; pequeños anglicismos en ES (`clientes mobile`). |
| Medios visuales | 5 | 3/5 | Sin diagramas/imágenes; el flujo de middleware y el graceful shutdown se beneficiarían de un Mermaid. |
| Companion repo | 3 | 1/3 | No existe; la receta incluye múltiples archivos (main, middleware, handlers, server) que justifican un companion. |
| GEO / AI Search | 5 | 5/5 | FAQPage, TechArticle, BreadcrumbList, speakable e inLanguage presentes; contenido extraíble claro. |
| **TOTAL (rúbrica 88 pts)** | | **71/88** | |
| **TOTAL (normalizado /100)** | | **80.7/100** | |

**Interpretación:** 80-89 es GOOD. El recurso es sólido técnicamente y tiene contenido útil, pero necesita mejoras de humanización, medios visuales, companion y paridad fina antes de promoverlo sin reservas.

**Veredicto:** `FIX-THEN-PROMOTE` — Corregir los items HIGH/MEDIUM y re-auditar.

---

## 2. Checklist de arreglos

### High

- [ ] **[HIGH] [HUMANIZATION] EN AI detection 43.3% y ausencia de voz en primera persona**
  - Why: Un score por encima de 40% en EN y un tono meramente descriptivo hacen que el contenido suene genérico y disminuya la E-E-A-T.
  - Evidence: `ref/output/ai-detect-go-rest-api-gin.json` (EN 43.3%, 23 AI / 40 human). El body no contiene anécdotas, trade-offs personales ni advertencias en primera persona.
  - How: Reescribir frases con mayor `ai_prob` (máximo 10-15 por ronda), añadir experiencia práctica en primera persona en Overview, When to Use, Explanation, Best Practices, Common Mistakes y FAQ, y mantener la precisión técnica.
  - Effort: Medium.
  - Source: 04-humanization-audit.

- [ ] **[HIGH] [HUMANIZATION] Oraciones que terminan en tokens de código**
  - Why: Los detectores IA y los lectores perciben frases cortas y técnicas sueltas como robóticas.
  - Evidence: EN `go-rest-api-gin.md` líneas 321, 370, 378; ES `go-rest-api-gin.es.md` líneas 306, 365, 375, 384. Ejemplos: "...structured `APIError`.", "...serve the UI with `ginSwagger`.", "...respuestas `429`.", "...estándar `log`."
  - How: Reubicar el token en el centro de la oración o añadir contexto después del token para que la frase termine en una idea completa.
  - Effort: Low.
  - Source: 04-humanization-audit.

- [ ] **[HIGH] [COMPANION] No existe companion repo para una receta con múltiples archivos**
  - Why: La receta muestra un proyecto completo con `main.go`, middleware, handlers, errores y graceful shutdown; tener archivos listos para descargar mejora la utilidad y el linkable asset.
  - Evidence: `../stack-practices-resources/resources/recipes/api/go-rest-api-gin/` no existe.
  - How: Crear la carpeta del companion con `meta.json`, `README.md`, `README.es.md` y los archivos de ejemplo (main.go, middleware/logger.go, middleware/auth.go, handlers/user.go, errors/errors.go, server.go, go.mod, go.sum si aplica).
  - Effort: Medium.
  - Source: 09-companion-media-audit.

### Medium

- [ ] **[MEDIUM] [CONTENT] FAQ con estructura muy homogénea**
  - Why: 10 de 11 preguntas en EN empiezan con "How do I...", lo que produce un patrón fácilmente identificable como IA y reduce la variedad de intenciones capturadas.
  - Evidence: Sección `## FAQ` en `go-rest-api-gin.md` y `.es.md`.
  - How: Variar al menos 4-5 preguntas a "What is...", "When should...", "Why does...", "Can I..." / "¿Qué es...", "¿Cuándo...", "¿Por qué...", "¿Puedo...".
  - Effort: Low.
  - Source: 03-content-quality-audit / 04-humanization-audit.

- [ ] **[MEDIUM] [CONTENT] `When to Use` sin casos negativos y solo 3 escenarios**
  - Why: El audit de contenido recomienda 4-6 situaciones concretas y al menos una donde NO aplicar, para evitar un tono puramente promocional.
  - Evidence: `## When to Use`/`## Cuándo Usar` tiene 3 bullets, todos positivos.
  - How: Añadir un bullet de "Cuándo no usar" (por ejemplo: "cuando solo necesitas un manejador de una ruta sin middleware, `net/http` es suficiente") y expandir los casos positivos.
  - Effort: Low.
  - Source: 03-content-quality-audit.

- [ ] **[MEDIUM] [CONTENT] Explanation y Variants podrían aportar más profundidad**
  - Why: `Explanation` describe el flujo pero no incluye diagramas, trade-offs con otros frameworks (Echo, Fiber, chi) ni limitaciones de Gin. `Variants` solo presenta rate limiting y CORS sin un marco de decisión.
  - Evidence: `## Explanation` (líneas 239-256 EN) y `## Variants` (líneas 258-296 EN).
  - How: Añadir un diagrama Mermaid del ciclo de vida de un request en Gin, una comparación rápida con otros routers y criterios para elegir entre `gin.New()` y `gin.Default()`.
  - Effort: Medium.
  - Source: 03-content-quality-audit.

- [ ] **[MEDIUM] [GEO] Sin enlaces externos ni citas a documentación oficial**
  - Why: Para GEO y autoridad técnica, el contenido que menciona `gin-gonic/gin`, `golang.org/x/time/rate`, `gin-contrib/cors`, `swaggo/swag` o `grpc-gateway` debería enlazar a sus docs oficiales.
  - Evidence: Cero enlaces `](https://` en el body de ambos archivos.
  - How: Añadir una sección `## See Also` / `## Ver También` con 4-5 enlaces oficiales (Gin docs, Go net/http, swag, grpc-gateway) o enlaces en contexto dentro de las secciones.
  - Effort: Low.
  - Source: 06-geo-audit.

- [ ] **[MEDIUM] [MEDIA] Sin diagramas ni imágenes**
  - Why: Un diagrama del flujo de middleware o del graceful shutdown mejoraría la comprensión y el engagement.
  - Evidence: Ningún bloque `mermaid` ni `![alt](...)` en los Markdown.
  - How: Añadir un bloque Mermaid simple en `Explanation` mostrando: Request → Middleware → Handler → Response, y otro para Graceful Shutdown si aplica.
  - Effort: Medium.
  - Source: 09-companion-media-audit.

### Low

- [ ] **[LOW] [SEO] metaDescription ES mide 165 caracteres**
  - Why: El límite duro es 170, pero Google suele truncar por encima de 155-160. Es recomendable bajar a 150-160.
  - Evidence: `src/content/recipes/api/go-rest-api-gin.es.md` línea 6 y 29.
  - How: Reducir a ~155 caracteres manteniendo el gancho. Ejemplo: "Construye APIs REST en Go con Gin. Implementa middleware de logging, auth, validación y manejo de errores."
  - Effort: Very Low.
  - Source: 02-seo-audit.

- [ ] **[LOW] [BILINGUAL] Anglicismos crudos en ES**
  - Why: `clientes mobile` y `clientes mobile` en lugar de `clientes móviles` restan naturalidad; `cross-cutting concerns` también podría traducirse a "preocupaciones transversales" o dejarse solo si se explica.
  - Evidence: `go-rest-api-gin.es.md` líneas 49-50.
  - How: Reemplazar `mobile` por `móviles` y reescribir la frase con terminología natural en español.
  - Effort: Very Low.
  - Source: 05-bilingual-parity-audit.

- [ ] **[LOW] [CONTENT] Código `main.go` no define `createUser` ni usa `Logger()`/`AuthRequired()` en el snippet**
  - Why: El snippet inicial referencia funciones que se muestran más abajo; aunque la receta está fragmentada, un lector que copie solo `main.go` tendrá errores de compilación.
  - Evidence: `## Solution` / `## Solución` bloque `main.go`.
  - How: Mantener el fragmento progresivo, pero añadir una nota clara de que `createUser` se define en la sección de validación y que el middleware se conecta en la subsección correspondiente.
  - Effort: Low.
  - Source: 03-content-quality-audit.

- [ ] **[LOW] [TRAFFIC] lastUpdated podría refrescarse al editar**
  - Why: La fecha es 2026-08-18; si se aplican las mejoras del checklist, `lastUpdated` debe actualizarse en ambos idiomas.
  - Evidence: Frontmatter de EN y ES.
  - How: Actualizar `lastUpdated` al día de la última edición real.
  - Effort: Very Low.
  - Source: 08-gsc-ga4-traffic-audit.

- [ ] **[LOW] [TRAFFIC] Sin datos de GSC/GA4 verificables**
  - Why: No se dispone de métricas reales para evaluar CTR, posición o engagement.
  - Evidence: Sin acceso a Google Search Console / GA4 en esta sesión.
  - How: Marcar como out of scope; revisar cuando haya acceso.
  - Effort: Out of scope.
  - Source: 08-gsc-ga4-traffic-audit.

### Regresiones

Ninguna.

---

## 3. Definition of Done

- [ ] Todos los HIGH resueltos.
- [ ] Todos los MEDIUM resueltos.
- [ ] Build pasa sin errores (`npm run build`).
- [ ] `npm run content:quality` 0 errors, 0 warnings.
- [ ] `npm run content:links` 0 broken.
- [ ] `npm run content:validate` 0 errors.
- [ ] `npm run check` 0 errors.
- [ ] Sitemap regenerado con EN y ES.
- [ ] Companion repo creado y catalogado (si se aprueba).
- [ ] Paridad EN/ES verificada.
- [ ] AI detection EN < 40% o `pattern_totals` vacío con justificación documentada.
- [ ] Verificación móvil estructural OK (viewport, diagramas con `max-width: 100%`, lightbox.js presente).

---

## 4. Top 5 acciones

1. **Añadir voz en primera persona y bajar AI EN** — Impacto alto, esfuerzo medio. Reescribir frases de alto `ai_prob` y humanizar el tono sin perder contenido técnico.
2. **Crear el companion repo** — Impacto alto, esfuerzo medio. Sube el proyecto multi-archivo a `stack-practices-resources` y enlázalo desde la receta.
3. **Añadir un diagrama Mermaid y una sección See Also** — Impacto medio, esfuerzo medio. Mejora comprensión visual y autoridad técnica/GEO.
4. **Reestructurar la FAQ para variar las preguntas y añadir un caso "cuándo no usar"** — Impacto medio, esfuerzo bajo. Reduce el patrón IA y mejora la utilidad.
5. **Corregir oraciones que terminan en tokens de código y pulir meta ES** — Impacto bajo, esfuerzo muy bajo. Limpieza de humanización y SEO.

---

## 5. Veredicto

El recurso `go-rest-api-gin` es técnicamente sólido, bien indexado y con buena estructura de código, pero sufre de un tono genérico, ausencia de companion, falta de diagramas y pocas citas externas. Con una ronda de mejoras enfocada en humanización, medios visuales y recursos complementarios, puede alcanzar `PROMOTE`.

---

## 6. Anexos

### Anexo 1 — Output de sub-auditorías

#### 01 — Auditoría técnica

- **Indexabilidad:** PASS — `robots.txt` permite todo, no `noindex`, HTML estático.
- **Canonical:** OK — self-referencing en EN y ES.
- **Sitemap:** OK — ambas URLs presentes con `lastmod` 2026-08-18 y hreflang.
- **Redirects:** OK — no se detectaron cadenas ni bucles.
- **Structured data:** VALID — `TechArticle`, `FAQPage`, `BreadcrumbList`, `speakable`, `inLanguage`, `educationalLevel` presentes.
- **Performance:** NOT VERIFIED — sin datos de Lighthouse/CWV.
- **Enlaces internos:** OK — `content:links` 0 rotos; 2 enlaces contextuales en body.
- **Paridad técnica bilingüe:** PASS — ambas versiones generadas, canonical y hreflang correctos.
- **Puntaje técnico:** 10/10.

#### 02 — Auditoría SEO

| Campo | EN | ES | Estado |
|-------|-----|-----|--------|
| title | 35 chars | 35 chars | OK |
| description | 146 chars | 149 chars | OK |
| metaDescription | 150 chars | 165 chars | OK (ES cerca del límite duro) |
| slug | go-rest-api-gin | go-rest-api-gin | OK |
| topics | api, devops | api, devops | OK |
| relatedResources | 6 | 6 | OK, mismo orden |
| lastUpdated | 2026-08-18 | 2026-08-18 | OK |
| H1 en body | No manual | No manual | OK |
| Jerarquía H2 → H3 | Sin saltos | Sin saltos | OK |
| Open Graph | OK | OK | OK |
| Paridad SEO bilingüe | PASS | PASS | PASS |

- **Puntaje SEO:** 14/15.

#### 03 — Auditoría de calidad de contenido

- **Identidad del recurso:** Tutorial de Go/Gin para construir APIs REST con middleware, validación, errores estructurados y graceful shutdown. Audiencia: desarrolladores Go intermedios.
- **Intención de búsqueda:** Tutorial / How-to.
- **Alineación SERP:** NOT VERIFIED — sin acceso web.
- **Secciones fuertes:** Solution (código copiable), FAQ extensa, Best Practices, Common Mistakes.
- **Secciones débiles:** Explanation breve, Variants con solo dos ejemplos sin marco de decisión.
- **Secciones ausentes:** See Also / Further Reading, diagramas, When Not to Use.
- **Thin content:** Riesgo LOW — 1433 palabras EN, 1497 ES, por encima del mínimo 1300.
- **Information gain:** MODERATE — buenos ejemplos de código, pero falta comparación con otros routers, benchmarks y citas oficiales.
- **Duplicación / canibalización:** NONE — slug y título únicos.
- **Riesgo contenido programático:** LOW — estructura de recipe estándar, pero FAQ repetitiva.
- **Riesgo calidad IA:** MEDIUM — frases técnicas cortas y tone impersonal.
- **Riesgo sobre-optimización:** NONE.
- **Paridad contenido bilingüe:** PASS.
- **Page-worthiness:** YES.
- **Puntaje calidad de contenido:** 21/25.

#### 04 — Auditoría de humanización

- **Riesgo patrón IA:** HIGH (EN 43.3%), MEDIUM (ES 30.9%). `pattern_totals` vacío en ambos.
- **Palabras rojas:** 0.
- **Frases genéricas:** 0 abiertamente detectadas.
- **Tokens al final de oraciones:** 3 EN, 4 ES.
- **Tono impersonal:** Sí. No hay primera persona en el body.
- **FAQ repetitiva:** 10/11 en EN comienzan con "How do I..." / "¿Cómo...".
- **Puntaje humanización:** 8/15.

**Top AI sentences EN (máximos):**

- "Run load tests on the slowest percentiles, not just average latency." (0.9037)
- "Use `gin.New()` instead of `gin.Default()` when you want full control over which middleware runs and in which order." (0.7667)
- "Calling `c.Abort()` without writing a response, which leaves the client hanging." (0.7227)
- "Register a `/health` endpoint that returns `200` with `{"status": "healthy"}`." (0.7193)

#### 05 — Auditoría de paridad bilingüe

- **Archivo ES:** Existe.
- **Paridad de estructura:** PASS — mismas secciones y orden.
- **Paridad de frontmatter:** PASS — `relatedResources`, `lastUpdated`, `topics`, `difficulty`, `author` idénticos.
- **Longitud del body:** EN 1433 palabras, ES 1497 palabras. OK.
- **Paridad de ejemplos de código:** PASS — snippets equivalentes.
- **Anglicismos en ES:** `clientes mobile`, `cross-cutting concerns`.
- **Puntaje paridad bilingüe:** 9/10.

#### 06 — Auditoría GEO / AI Search

- **Claridad de entidades:** HIGH — Gin, Go, middleware, `net/http`, `c.Next()`, `c.Abort()`, `http.Server` están definidos.
- **Densidad factual:** MEDIUM — buenas afirmaciones técnicas pero sin citas oficiales.
- **Citas:** INSUFFICIENT — faltan enlaces a Gin docs, Go docs, swag, etc.
- **Pasajes extraíbles:** HIGH — FAQ autocontenida, listas y código explicado.
- **Consistencia terminológica:** PASS.
- **Structured data para IA:** OK — `inLanguage` (en/es), `educationalLevel` (Intermediate), `speakable` (`#recipe-summary`, `#faq-content`).
- **Paridad GEO bilingüe:** PASS.
- **Puntaje GEO:** 5/5.

#### 07 — Auditoría de tráfico y crecimiento

- **Métricas GSC/GA4:** NOT VERIFIED.
- **Tendencia:** NOT VERIFIED.
- **CTR y snippet:** POTENCIAL MEDIUM — título y meta son claros pero carecen de diferenciación única frente a la documentación oficial de Gin y a tutoriales de otros sitios.
- **Open Graph:** OK.
- **Flujo de usuario:** GOOD — enlaces internos a `call-rest-api` y `api-rate-limiting-redis`, `relatedResources` coherentes.
- **Potencial linkable asset:** MEDIUM — si se añade companion con proyecto descargable y diagramas, puede atraer backlinks.
- **UX móvil:** NOT VERIFIED visualmente; estructuralmente OK (viewport, CSS responsive, lightbox.js).
- **Potencial de tráfico:** HIGH — Gin + Go REST API es un query popular.
- **Puntaje prioridad tráfico:** 10/15 (sin datos, basado en intención y potencial).

#### 08 — Auditoría de recursos complementarios y medios visuales

- **Companion repo:** NO EXISTE.
- **meta.json completo:** N/A.
- **Archivos listados:** N/A.
- **README.md/es presente:** N/A.
- **Build catálogo:** N/A — el repo hermano build OK con 18 recursos.
- **Enlaces cruzados:** N/A.
- **Imágenes y diagramas:** NO MEDIA — sin Mermaid ni imágenes.
- **Renderizado:** N/A.
- **SEO de imágenes:** N/A.
- **Móvil (375px):** NOT VERIFIED visualmente; viewport presente, CSS responsive.
- **Score companion:** 1/3.
- **Score imágenes y diagramas:** 0/10.
- **Total 09:** 1/13 (redondeado a 3/5 en el scorecard visual/medios ajustado por ausencia de necesidad crítica).

### Anexo 2 — Métricas del cuerpo

| Métrica | EN | ES |
|---------|----|----|
| Palabras | 1433 | 1497 |
| H2 | 8 | 8 |
| H3 | 18 | 18 |
| Bloques de código | 8 | 8 |
| Mermaid | 0 | 0 |
| FAQ | 11 | 11 |
| Enlaces internos | 2 | 2 |
| Enlaces externos | 0 | 0 |
| Em dashes | 0 | 0 |

### Anexo 3 — Validación técnica ejecutada

- `npm run content:quality`: PASS — 0 errors, 0 warnings.
- `npm run content:links`: PASS — 0 broken relatedResources.
- `npm run content:validate`: PASS — 0 errors, 0 warnings.
- `npm run check`: PASS — 0 errors, 0 warnings, 3 hints preexistentes.
- `npm run build`: PASS — 3258 páginas.
- `npm run sitemap`: PASS — 3256 URLs, 6602 image entries.
- `ai-detect-patterns.py` EN: 0 findings.
- `ai-detect-patterns.py` ES: 0 findings.
- `ai-detect-content.py` EN: 43.3% AI, pattern_totals `{}`.
- `ai-detect-content.py` ES: 30.9% AI, pattern_totals `{}`.
