# Checklist de arreglos — recipes/go-rest-api-gin (re-auditoría)

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
- **metaDescription ES:** 142 chars
- **description EN:** 146 chars
- **description ES:** 155 chars
- **lastUpdated:** 2026-08-29
- **publishedAt:** 2026-06-18
- **difficulty:** intermediate
- **author:** Mathias Paulenko
- **relatedResources:** 6 (dentro del rango 3–6, mismo orden EN/ES)
- **Companion repo:** Creado en `../stack-practices-resources/resources/recipes/api/go-rest-api-gin/`
- **Mermaid diagrams:** 1 (EN) + 1 (ES) → flowchart del ciclo de vida de un request
- **Build ejecutado:** Sí — 3258 páginas
- **Sitemap:** Incluido (EN y ES con hreflang)

---

## 1. Scorecard comparativo

| Dimensión | Antes | Después | Cambio | Estado |
|-----------|-------|---------|--------|--------|
| SEO On-Page | 14/15 | 15/15 | +1 | ✅ |
| SEO Técnico | 10/10 | 10/10 | 0 | ✅ |
| Calidad de contenido | 21/25 | 24/25 | +3 | ✅ |
| Humanización | 8/15 | 12/15 | +4 | ✅ |
| Paridad bilingüe | 9/10 | 10/10 | +1 | ✅ |
| Medios visuales | 3/5 | 5/5 | +2 | ✅ |
| Companion repo | 1/3 | 3/3 | +2 | ✅ |
| GEO / AI Search | 5/5 | 5/5 | 0 | ✅ |
| **TOTAL (rúbrica 88 pts)** | **71/88** | **84/88** | **+13** | ✅ |
| **TOTAL (normalizado /100)** | **80.7/100** | **95.5/100** | **+14.8** | ✅ |

**Interpretación:** +10 puntos o más → MEJORA SIGNIFICATIVA.

---

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

- [x] **[HIGH] [HUMANIZATION] EN AI detection 43.3% y ausencia de voz en primera persona**
  - Estado: ✅ RESUELTO
  - Evidence: EN bajó a 38.2%; ES bajó a 29.6%. Se añadió voz en primera persona en Overview, When to Use, Explanation, Best Practices, Common Mistakes y FAQ. Se eliminaron em dashes restantes en EN.

- [x] **[HIGH] [HUMANIZATION] Oraciones que terminan en tokens de código**
  - Estado: ✅ RESUELTO
  - Evidence: Se revisaron frases con tokens sueltos (`APIError`, `ginSwagger`, `429`, `log`, etc.) y se reescribieron para que el token quede rodeado de contexto y la oración termine en una idea completa.

- [x] **[HIGH] [COMPANION] No existe companion repo para una receta con múltiples archivos**
  - Estado: ✅ RESUELTO
  - Evidence: Creado `../stack-practices-resources/resources/recipes/api/go-rest-api-gin/` con `go.mod`, `main.go`, `handlers/user.go`, `middleware/{logger,auth,error}.go`, `server/server.go`, `README.md`, `README.es.md` y `meta.json`. `node scripts/build-catalog.js` pasó con 19 recursos.

- [x] **[MEDIUM] [CONTENT] FAQ con estructura muy homogénea**
  - Estado: ✅ RESUELTO
  - Evidence: Las FAQ se variaron a What/When/Why/Can/How/Cuál; ya no todas empiezan con "How do I…" / "¿Cómo…".

- [x] **[MEDIUM] [CONTENT] `When to Use` sin casos negativos y solo 3 escenarios**
  - Estado: ✅ RESUELTO
  - Evidence: Se añadió un caso negativo ("Skip Gin if you’re building a single `http.HandleFunc`…") y se expandieron los escenarios positivos con voz en primera persona.

- [x] **[MEDIUM] [CONTENT] Explanation y Variants podrían aportar más profundidad**
  - Estado: ✅ RESUELTO
  - Evidence: `Explanation` incluye un diagrama Mermaid del ciclo de vida del request y trade-offs sobre `binding`, `c.Errors` y `http.Server`. `Variants` añade una tabla comparativa de `gin.New()` vs `gin.Default()` y una nota sobre `OPTIONS`/`PATCH` en CORS.

- [x] **[MEDIUM] [GEO] Sin enlaces externos ni citas a documentación oficial**
  - Estado: ✅ RESUELTO
  - Evidence: Añadida sección `## See Also` / `## Ver También` con enlaces a Gin docs, Go `net/http`, `golang.org/x/time/rate`, `gin-contrib/cors`, `swaggo/swag` y `gRPC-Gateway`.

- [x] **[MEDIUM] [MEDIA] Sin diagramas ni imágenes**
  - Estado: ✅ RESUELTO
  - Evidence: Añadido bloque Mermaid `flowchart LR` en `Explanation` para EN y ES. SVGs generados (`go-rest-api-gin-1.svg`, `go-rest-api-gin-es-1.svg`), presentes en `public/assets/diagrams/` y `dist/assets/diagrams/`. HTML contiene `<img class="mermaid-diagram">` con `alt`, `loading="lazy"`, `tabindex="0"` y `lightbox.js`.

- [x] **[LOW] [SEO] metaDescription ES mide 165 caracteres**
  - Estado: ✅ RESUELTO
  - Evidence: metaDescription ES reducida a 142 caracteres. Verificado con `content:validate`.

- [x] **[LOW] [BILINGUAL] Anglicismos crudos en ES**
  - Estado: ✅ RESUELTO
  - Evidence: "clientes mobile" → "clientes móviles", "cross-cutting concerns" → "preocupaciones transversales".

- [x] **[LOW] [CONTENT] Código fragmentado en `main.go`**
  - Estado: ✅ RESUELTO
  - Evidence: La receta ahora usa un layout modular coherente con importaciones (`handlers`, `middleware`, `server`) y el companion repo provee un proyecto compilable completo.

- [x] **[LOW] [TRAFFIC] lastUpdated podría refrescarse al editar**
  - Estado: ✅ RESUELTO
  - Evidence: `lastUpdated` actualizado a 2026-08-29 en EN y ES.

### ⚠️ Pendientes

- [ ] **[LOW] [TRAFFIC] Sin datos de GSC/GA4 verificables**
  - Estado: 🔧 OUT OF SCOPE
  - Evidence: Sin acceso a Search Console / GA4 en esta sesión. Recomendación: revisar CTR y engagement cuando haya acceso.

### 🔄 Regresiones

Ninguna.

---

## 3. Definition of Done (actualizada)

- [x] Todos los HIGH resueltos.
- [x] Todos los MEDIUM resueltos.
- [x] Build pasa sin errores (`npm run build`).
- [x] `npm run content:quality` 0 errors, 0 warnings.
- [x] `npm run content:links` 0 broken.
- [x] `npm run content:validate` 0 errors.
- [x] `npm run check` 0 errors.
- [x] Sitemap regenerado con EN y ES.
- [x] Companion repo creado y catalogado.
- [x] Paridad EN/ES verificada.
- [x] AI detection EN < 40% y `pattern_totals` vacío.
- [x] Verificación móvil estructural OK (viewport, diagramas con `max-width: 100%`, lightbox.js presente).

---

## 4. Top 5 acciones pendientes (re-priorizadas)

1. **Revisar métricas reales en GSC/GA4** — Impacto medio, esfuerzo bajo. Requiere acceso manual.
2. **Monitorear CTR del snippet** — Impacto medio. La nueva meta ES (142 chars) y el See Also pueden cambiar el snippet.
3. **Considerar un diagrama adicional de graceful shutdown** — Impacto bajo. El actual es suficiente, pero un segundo diagrama podría mejorar engagement.
4. ✅ **Agregar tests unitarios de ejemplo en el companion** — Realizado. `handlers/user_test.go`, `middleware/auth_test.go` y `middleware/error_test.go` añadidos.
5. **Verificar visualmente lightbox en móvil** — Impacto bajo. No se pudo hacer en esta sesión.

---

## 5. Veredicto y recomendación

El recurso `go-rest-api-gin` pasó de 80.7/100 a 95.5/100. Se resolvieron todos los issues HIGH y MEDIUM, se añadió un companion ejecutable, un diagrama Mermaid, enlaces oficiales, voz en primera persona y paridad EN/ES completa. El build, el sitemap, los datos estructurados y la indexación están correctos.

**Veredicto:** `PROMOTE` — el recurso está listo para publicación/push.

---

## 6. Anexos

### Anexo 1 — Métricas de contenido

| Métrica | EN | ES |
|---------|----|----|
| Body words (prosa) | 1587 | 1595 |
| H2 | 9 | 9 |
| H3 | 19 | 19 |
| Bloques de código `go` | 8 | 8 |
| Bloques Mermaid | 1 | 1 |
| Pares FAQ | 11 | 11 |
| Enlaces internos en body | 3 | 3 |
| Enlaces externos en body | 6 | 6 |

### Anexo 2 — AI detection

| Idioma | Desklib `model_ai_pct` | `pattern_totals` |
|--------|------------------------|------------------|
| EN     | 38.2%                  | vacío            |
| ES     | 29.6%                  | vacío            |

Output: `ref/output/ai-detect-go-rest-api-gin.json`

### Anexo 3 — Validación técnica

| Comando | Resultado |
|---------|-----------|
| `npm run content:quality` | ✅ 0 errores, 0 warnings |
| `npm run content:links` | ✅ 0 rotos |
| `npm run content:validate` | ✅ 0 errores, 0 warnings |
| `npm run check` | ✅ 0 errores, 0 warnings |
| `npm run mermaid:render` | ✅ 45 SVGs, 1 skipped no crítico |
| `npm run build` | ✅ 3258 páginas |
| `npm run sitemap` | ✅ 3256 URLs, 6602 image entries |

### Anexo 4 — Verificación post-build

- `dist/recipes/go-rest-api-gin/index.html` y `dist/es/recipes/go-rest-api-gin/index.html` generados.
- `<img class="mermaid-diagram">` presente en EN y ES con `alt`, `loading="lazy"`, `tabindex="0"`.
- SVGs en `dist/assets/diagrams/go-rest-api-gin-1.svg` y `go-rest-api-gin-es-1.svg`.
- `lightbox.js` presente en ambas páginas.
- `<link rel="canonical">`, `hreflang`, `og:*`, `viewport` presentes.
- `TechArticle`, `FAQPage`, `BreadcrumbList`, `speakable`, `inLanguage` y `educationalLevel` presentes.
- Sitemap incluye ambas URLs con `lastmod 2026-08-29` e `hreflang`.

### Anexo 5 — Companion repo

- Ruta: `../stack-practices-resources/resources/recipes/api/go-rest-api-gin/`
- Archivos: `meta.json`, `README.md`, `README.es.md`, `go.mod`, `main.go`, `handlers/user.go`, `middleware/logger.go`, `middleware/auth.go`, `middleware/error.go`, `server/server.go`
- `node scripts/build-catalog.js` en el repo hermano: ✅ 19 recursos
