# Checklist de arreglos — recipes/grpc-api

> Auditoría MODE=full
> Fecha: 2026-09-03
> Recurso #37 en `ref/checklist-top-recursos-mejoras.md`
> Score: 44/88 — REWRITE

---

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `grpc-api` |
| Topic | `api` |
| Ruta EN | `src/content/recipes/api/grpc-api.md` |
| Ruta ES | `src/content/recipes/api/grpc-api.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/grpc-api/` |
| URL producción ES | `https://stackpractices.com/es/recipes/grpc-api/` |
| Título EN | `gRPC API with Protocol Buffers` (32 chars) ✅ |
| Título ES | `API gRPC con Protocol Buffers` (29 chars) ✅ |
| `metaDescription` EN | 135 chars ✅ (coincide con `seo.metaDescription`) |
| `metaDescription` ES | 135 chars ✅ (coincide con `seo.metaDescription`) |
| `lastUpdated` | `2026-08-10` (EN y ES) ⚠️ stale |
| `publishedAt` | `2026-06-13` |
| `estimatedReadTime` | ausente en ambos ⚠️ |
| `relatedResources` EN/ES | 7 slugs ⚠️ excede máximo de 6 |
| Palabras body EN | 2,221 (sin bloques de código) — thick pero genérico |
| Palabras body ES | 2,316 (sin bloques de código) — thick pero genérico |
| H2 EN/ES | 20 / 21 ⚠️ asimetría (ES tiene "Referencia Rápida" extra) |
| H3 EN/ES | 6 / 6 ✅ |
| Bloques de código EN/ES | 3 / 3 ✅ |
| FAQ items EN/ES | 3 / 3 ✅ |
| Enlaces internos en body EN/ES | 5 / 5 ✅ |
| Enlaces externos en body EN/ES | 0 / 0 ⚠️ |
| Mermaid / imágenes EN/ES | 0 / 0 ⚠️ |
| Companion repo | **MISSING** ⚠️ |
| Enlace companion en body | False / False ⚠️ |
| See Also EN/ES | 0 / 0 (tiene "Further Reading" pero sin enlaces específicos) ⚠️ |
| Keywords EN | 3 ✅ (mínimo) |
| Keywords ES | 3 ✅ (mínimo) |
| AI detect patterns EN | **9 findings** ⚠️ (6 missing_contraction, 2 vague_abstraction, 1 formal_verb) |
| AI detect patterns ES | 1 finding ⚠️ (1 vague_abstraction) |
| Em dashes EN/ES | 5 / 5 ✅ |
| Primera persona EN/ES | 3 / 14 ✅ |
| Red words | 0 ✅ |
| Anglicismos ES | 0 ✅ |
| Double spaces EN/ES | 196 / 198 ⚠️ (AI formatting artifact) |
| Acentos faltantes ES | 30+ ⚠️ (mas, pequeno, rapido, metodo, conexion, validacion, serializacion, deserializacion, autenticacion, etc.) |
| Build | `npm run build` 3,260 páginas, exit 0 ✅ |
| Post-build HTML | H1, TechArticle, FAQPage, WebPage, BreadcrumbList, mainEntityOfPage, hreflang, viewport, speakable, canonical ✅ EN+ES |

---

## 1. Scorecard y decisiones

| Dimensión | Score | Máx | Motivo |
|-----------|-------|-----|--------|
| SEO On-Page | 10 | 15 | relatedResources 7 (excede 6), sin estimatedReadTime, 0 external links, keywords solo 3 |
| SEO Técnico | 8 | 10 | Structured data OK, pero H2 asimetría EN 25 vs ES 26 |
| Calidad Contenido | 12 | 25 | Contenido thick (2221/2316) pero con secciones template AI genéricas, Troubleshooting no específico de gRPC, Further Reading sin enlaces |
| Humanización | 5 | 15 | 9 AI patterns EN, "Apply implement" template, "Key Takeaways", "Production Notes", "Common Production Pitfalls", 196 double spaces, "Referencia Rápida" template |
| Paridad Bilingüe | 5 | 10 | H2 asimetría (20 vs 21), ES tiene "Referencia Rápida" extra, 30+ acentos faltantes en ES, secciones sin traducir ("Monitoring", "Deployment Checklist", "Troubleshooting") |
| Medios Visuales | 1 | 5 | Sin Mermaid |
| Companion Repo | 0 | 3 | No existe |
| GEO / AI Search | 3 | 5 | FAQ 3/3 OK, speakable OK, pero contenido genérico AI no óptimo |
| **TOTAL** | **44** | **88** | **REWRITE** |

**Decisión:** REWRITE — el recurso tiene 9 AI patterns detectados, múltiples secciones template genéricas aplicables a cualquier recurso ("Key Takeaways", "Production Notes", "Common Production Pitfalls", "Referencia Rápida"), Troubleshooting no específico de gRPC (habla de CORS, 404s, authentication failures — problemas de REST, no de gRPC), Further Reading sin enlaces específicos, 196 double spaces (artefacto AI), 30+ acentos faltantes en ES, asimetría H2, y relatedResources excede el máximo. Requiere reescritura sustancial, no solo mejoras incrementales.

---

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [HUMANIZATION] 9 AI patterns detectados en EN + secciones template genéricas**
  - Why: El detector encontró 6 missing_contraction, 2 vague_abstraction, 1 formal_verb. Adicionalmente, hay secciones template AI obvias: "Key Takeaways" con "Apply implement a grpc api with protocol buffers when you need a practical solution for your use case" — este es un patrón template que se rellena con el título del recurso y aplica a cualquier recurso, no es específico de gRPC.
  - Evidence: `ref/output/ai-detect-patterns-grpc-api.json` — 9 findings. Secciones "Key Takeaways", "Production Notes", "Common Production Pitfalls", "Referencia Rápida" son genéricas.
  - How: Eliminar o reescribir las secciones template ("Key Takeaways", "Production Notes", "Common Production Pitfalls", "Referencia Rápida"). Reemplazar con contenido específico de gRPC o eliminar si es redundante. Corregir las 6 missing contractions (ej: "it is" → "it's", "do not" → "don't"). Reescribir vague abstractions. Ejecutar humanizer skill.
  - Effort: L
  - Source: 04-humanization-audit

- [ ] **[CRITICAL] [BILINGUAL] 30+ acentos faltantes en ES**
  - Why: El ES tiene numerosas palabras sin acentos: "mas" (7), "pequeno" (2), "rapido" (3), "metodo" (2), "conexion" (1), "validacion" (1), "serializacion" (6), "deserializacion" (2), "autenticacion" (1). Esto indica que el ES fue generado sin corrección ortográfica.
  - Evidence: `grpc-api.es.md` — 30+ matches de palabras sin acento.
  - How: Corregir todos los acentos faltantes: más, pequeño, rápido, método, conexión, validación, serialización, deserialización, autenticación, configuración, generación, documentación, etc.
  - Effort: M
  - Source: 05-bilingual-parity-audit

- [ ] **[CRITICAL] [BILINGUAL] H2 asimetría EN 20 vs ES 21 — "Referencia Rápida" extra en ES**
  - Why: ES tiene una sección "## Referencia Rápida" que EN no tiene. Esto rompe la paridad bilingüe.
  - Evidence: EN H2 = 20, ES H2 = 21. ES línea 289: "## Referencia Rápida".
  - How: Eliminar "## Referencia Rápida" de ES (es contenido template genérico sin valor específico de gRPC) o añadir equivalente en EN si tiene valor. Recomendación: eliminar — es template AI.
  - Effort: S
  - Source: 05-bilingual-parity-audit

### High

- [ ] **[HIGH] [CONTENT] Troubleshooting no específico de gRPC**
  - Why: La sección Troubleshooting habla de "CORS errors in the browser", "Unexpected 404s", "Authentication failures" — estos son problemas de REST/HTTP, no de gRPC. gRPC no tiene CORS (usa gRPC-Web proxy), no tiene 404s (usa status codes gRPC), y la autenticación es vía metadata interceptors no vía tokens HTTP.
  - Evidence: `grpc-api.md` líneas 269-275. `grpc-api.es.md` líneas 331-337.
  - How: Reescribir Troubleshooting con problemas reales de gRPC: "DEADLINE_EXCEEDED errors", "connection refused / transport errors", "protobuf version mismatch", "gRPC-Web proxy misconfiguration", "stream cancellation", "max message size exceeded".
  - Effort: M
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [CONTENT] Further Reading sin enlaces específicos**
  - Why: La sección "Further Reading" tiene 4 bullets genéricos sin enlaces: "Official documentation: check the current reference", "Related guides: explore the api and microservices guides", "Complementary patterns: review design patterns", "Public postmortems: study real incidents". Esto es 100% AI filler.
  - Evidence: `grpc-api.md` líneas 280-285. `grpc-api.es.md` líneas 295-300.
  - How: Reescribir como "See Also" con enlaces específicos: gRPC official docs, Protocol Buffers spec, grpc.io blog, Connect-RPC docs, Envoy gRPC-Web docs, OpenTelemetry gRPC interceptor docs.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[HIGH] [SEO] 0 enlaces externos a docs oficiales**
  - Why: Sin enlaces a docs oficiales reduces E-E-A-T. gRPC tiene excelente documentación oficial.
  - Evidence: `grpc-api.md` external links = 0, `grpc-api.es.md` = 0.
  - How: Añadir 5-6 enlaces externos: grpc.io official docs, Protocol Buffers spec, @grpc/grpc-js npm, grpc-java docs, grpc-go docs, OpenTelemetry gRPC interceptor docs.
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [SEO] relatedResources excede máximo (7 vs 6)**
  - Why: El AGENTS.md de recipes especifica 3-6 relatedResources. El layout renderiza solo los primeros 6.
  - Evidence: `grpc-api.md` frontmatter tiene 7 entradas.
  - How: Eliminar la menos relevante. Candidatos: `/recipes/rest-api-design` (redundante con `/guides/rest-api-design-guide`).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[HIGH] [MEDIA] Sin diagrama Mermaid de flujo gRPC**
  - Why: Un diagrama mostrando el flujo .proto → codegen → server/client stubs → HTTP/2 transport mejoraría la comprensión del contract-first approach.
  - Evidence: `grpc-api.md` mermaid blocks = 0, `grpc-api.es.md` = 0.
  - How: Añadir un diagrama Mermaid `flowchart LR` en la sección "Explanation" que muestre: .proto → protoc → Python stubs / JS stubs / Java stubs → gRPC server / gRPC client → HTTP/2. Añadir `%% alt:` en EN+ES. Regenerar SVGs.
  - Effort: S
  - Source: 09-companion-media-audit

- [ ] **[HIGH] [COMPANION] Companion repo no existe**
  - Why: El recurso tiene ejemplos en 3 lenguajes (Python, JS, Java) ideales para un companion runnable.
  - Evidence: `D:\Codigo\stack-practices-resources\resources\recipes\api\grpc-api\` no existe.
  - How: Crear companion con `meta.json`, `service.proto`, `server.py`, `client.py`, `server.js`, `client.js`, `Server.java`, `Client.java`, `requirements.txt`, `package.json`, `pom.xml`, `README.md` y `README.es.md`.
  - Effort: M
  - Source: 09-companion-media-audit

### Medium

- [ ] **[MEDIUM] [SEO] `estimatedReadTime` ausente en EN y ES**
  - Why: El AGENTS.md de recipes recomienda `estimatedReadTime` para UX.
  - Evidence: Frontmatter EN y ES sin campo `estimatedReadTime`.
  - How: Añadir `estimatedReadTime: 11` en EN y ES (2221 palabras / 200 wpm ≈ 11 min).
  - Effort: S
  - Source: 02-seo-audit

- [ ] **[MEDIUM] [HUMANIZATION] 196/198 double spaces (artefacto AI)**
  - Why: Los double spaces son un artefacto común de generación AI. 196 en EN y 198 en ES indican generación masiva sin post-procesamiento.
  - Evidence: `grpc-api.md` double spaces = 196, `grpc-api.es.md` = 198.
  - How: Reemplazar todos los double spaces con single spaces. Usar find-and-replace o script.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[MEDIUM] [BILINGUAL] Secciones sin traducir en ES**
  - Why: ES tiene H2 sin traducir: "## Monitoring y Observabilidad", "## Deployment Checklist", "## Troubleshooting".
  - Evidence: `grpc-api.es.md` líneas 239, 247, 331.
  - How: Traducir: "## Monitoreo y Observabilidad", "## Checklist de Deployment", "## Solución de Problemas".
  - Effort: S
  - Source: 05-bilingual-parity-audit

- [ ] **[MEDIUM] [CONTENT] FAQ rota en EN — security bullets después de 3ra pregunta**
  - Why: Después de "### How do I handle authentication?" hay 15+ bullets de security considerations que no pertenecen al FAQ. En ES están correctamente en "Consideraciones de Seguridad".
  - Evidence: `grpc-api.md` líneas 315-333 — bullets después del párrafo de authentication.
  - How: Mover los bullets a la sección "Security Considerations" donde corresponden.
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [CONTENT] "Cost Estimation" con valores inventados**
  - Why: La sección "Cost Estimation" tiene valores específicos como "$200/month on bandwidth", "$150/month on compute", "$50-100/month for monitoring". Estos parecen inventados sin fuente.
  - Evidence: `grpc-api.md` líneas 231-237.
  - How: Eliminar valores específicos inventados o marcar claramente como estimaciones hipotéticas. El AGENTS.md dice "Do not invent production metrics or GSC/GA4 data".
  - Effort: S
  - Source: 03-content-quality-audit

- [ ] **[MEDIUM] [SEO] `lastUpdated` stale (2026-08-10)**
  - Why: La fecha está desactualizada respecto a la fecha actual de auditoría.
  - Evidence: Frontmatter `lastUpdated: "2026-08-10"`.
  - How: Actualizar a `2026-09-03` tras aplicar mejoras.
  - Effort: S
  - Source: 02-seo-audit

### Low

- [ ] **[LOW] [BILINGUAL] "Cuando No Usar Este Enfoque" sin acento en "Cuándo"**
  - Why: ES H2 línea 201: "## Cuando No Usar Este Enfoque" — falta acento en "Cuándo".
  - Evidence: `grpc-api.es.md` línea 201.
  - How: Cambiar a "## Cuándo No Usar Este Enfoque".
  - Effort: S
  - Source: 05-bilingual-parity-audit

- [ ] **[LOW] [BILINGUAL] "Estimacion de Costos" sin acento en "Estimación"**
  - Why: ES H2 línea 231: "## Estimacion de Costos" — falta acento.
  - Evidence: `grpc-api.es.md` línea 231.
  - How: Cambiar a "## Estimación de Costos".
  - Effort: S
  - Source: 05-bilingual-parity-audit

- [ ] **[LOW] [HUMANIZATION] "Apply implement" template en Key Takeaways**
  - Why: "Apply implement a grpc api with protocol buffers when you need a practical solution for your use case" — este es un patrón template AI que se rellena con el título del recurso.
  - Evidence: `grpc-api.md` línea 296. `grpc-api.es.md` línea 311.
  - How: Eliminar la sección "Key Takeaways" completa o reescribir con takeaways específicos de gRPC.
  - Effort: S
  - Source: 04-humanization-audit

- [ ] **[LOW] [SEO] Keywords solo 3 (mínimo del rango 3-8)**
  - Why: EN y ES tienen solo 3 keywords. Podría expandirse a 5-6 para mejor cobertura.
  - Evidence: `grpc-api.md` `seo.keywords` tiene 3 entradas.
  - How: Añadir 2-3 keywords relevantes: `grpc python`, `grpc java`, `grpc streaming`, `protocol buffers tutorial`.
  - Effort: S
  - Source: 02-seo-audit

---

## 3. Definition of Done

- [ ] Todos los CRITICAL resueltos (AI patterns, acentos ES, H2 asimetría)
- [ ] Todos los HIGH resueltos (Troubleshooting, Further Reading, external links, relatedResources, Mermaid, companion)
- [ ] Build pasa sin errores
- [ ] Companion repo build pasa
- [ ] Paridad EN/ES verificada (H2 count igual, acentos corregidos, secciones traducidas)
- [ ] AI patterns < 3 findings EN
- [ ] 0 double spaces
- [ ] `npm run content:quality` PASS
- [ ] `npm run content:links` PASS
- [ ] `npm run content:validate` PASS
- [ ] `npm run check` PASS
- [ ] `npm run mermaid:render` PASS
- [ ] `npm run build` PASS
- [ ] `npm run sitemap` PASS
- [ ] Post-build HTML checks PASS EN+ES
- [ ] Sin regresiones

---

## 4. Top 5 acciones

1. **[CRITICAL] Eliminar/reescribir secciones template AI** — "Key Takeaways", "Production Notes", "Common Production Pitfalls", "Referencia Rápida". Corregir 6 missing contractions y 2 vague abstractions. Ejecutar humanizer. Esfuerzo: L.
2. **[CRITICAL] Corregir 30+ acentos faltantes en ES** — más, pequeño, rápido, método, conexión, validación, serialización, deserialización, autenticación, etc. Esfuerzo: M.
3. **[HIGH] Reescribir Troubleshooting con problemas reales de gRPC** — DEADLINE_EXCEEDED, transport errors, protobuf version mismatch, gRPC-Web proxy, stream cancellation, max message size. Esfuerzo: M.
4. **[HIGH] Reescribir Further Reading como See Also con enlaces específicos** — grpc.io, protobuf spec, @grpc/grpc-js npm, OpenTelemetry gRPC. Esfuerzo: S.
5. **[HIGH] Crear companion repo + Mermaid diagrama** — service.proto + server/client en 3 lenguajes + diagrama flujo .proto → codegen → stubs. Esfuerzo: M.

---

## 5. Veredicto

El recurso tiene base técnica válida (código en 3 lenguajes, benchmark table, deployment checklist, security considerations) pero está contaminado con secciones template AI genéricas aplicables a cualquier recurso, 9 AI patterns detectados, Troubleshooting no específico de gRPC, 30+ acentos faltantes en ES, asimetría H2, y 196 double spaces. Requiere reescritura sustancial de las secciones template y corrección ortográfica masiva del ES.

**REWRITE** — reescribir secciones template, corregir ES, añadir Mermaid + companion, y luego re-auditar.

---

## 6. Anexos

### 6.1 Sub-auditorías resumidas

| # | Sub-auditoría | Hallazgos clave |
|---|---------------|-----------------|
| 1 | Technical | Structured data OK, canonical OK, hreflang OK, sitemap OK, build PASS |
| 2 | SEO | relatedResources 7 (excede 6), 0 external links, sin estimatedReadTime, keywords solo 3 |
| 3 | Content Quality | Contenido thick pero template AI, Troubleshooting no específico, Further Reading sin enlaces, Cost Estimation con valores inventados |
| 4 | Humanization | 9 AI patterns EN, "Apply implement" template, 196 double spaces, secciones template genéricas |
| 5 | Bilingual Parity | H2 asimetría (20 vs 21), 30+ acentos faltantes ES, secciones sin traducir |
| 6 | GEO | FAQ 3/3 OK, speakable OK, pero contenido genérico AI no óptimo para citations |
| 7 | Traffic | NOT VERIFIED (sin acceso a GSC/GA4) |
| 8 | Companion/Media | Companion MISSING, sin Mermaid, sin SVGs |

### 6.2 AI Detection outputs

| Métrica | EN | ES |
|---------|----|----|
| Patterns | **9 findings** ⚠️ | 1 finding ⚠️ |
| Breakdown EN | 6 missing_contraction, 2 vague_abstraction, 1 formal_verb | — |
| Breakdown ES | — | 1 vague_abstraction |

- `ref/output/ai-detect-patterns-grpc-api.json` — EN: 9 findings
- `ref/output/ai-detect-patterns-grpc-api-es.json` — ES: 1 finding

### 6.3 Post-build HTML checks

| Check | EN | ES |
|-------|----|----|
| H1 | ✅ | ✅ |
| TechArticle | ✅ | ✅ |
| FAQPage | ✅ | ✅ |
| WebPage | ✅ | ✅ |
| BreadcrumbList | ✅ | ✅ |
| mainEntityOfPage | ✅ | ✅ |
| hreflang (3) | ✅ | ✅ |
| viewport | ✅ | ✅ |
| speakable | ✅ | ✅ |
| canonical | ✅ | ✅ |
| mermaid-diagram | 0 (sin diagrama) | 0 (sin diagrama) |
| companion link | 0 (sin companion) | 0 (sin companion) |
| H2 count | 25 | 26 ⚠️ asimetría |
| H3 count | 9 | 9 |

### 6.4 Verificación móvil

| Check | Estado |
|-------|--------|
| <meta name="viewport"> | ✅ |
| Overflow horizontal (375px) | NOT VERIFIED (sin acceso a navegador) |
| Diagramas max-width: 100% | N/A (sin diagramas) |
| Click-to-zoom (lightbox) | N/A (sin diagramas) |
| Screenshot visual | NOT VERIFIED |

### 6.5 Companion repo

| Check | Estado |
|-------|--------|
| Directorio existe | ❌ MISSING |
| meta.json válido | ❌ N/A |
| Archivos esperados | ❌ N/A |
| build-catalog.js | NOT VERIFIED (sin companion) |

### 6.6 Related resources bidireccionalidad

| Recurso relacionado | Recíproco | Estado |
|---------------------|-----------|--------|
| /recipes/server-sent-events | ❓ NOT VERIFIED | Pendiente |
| /docs/api-documentation | ❓ NOT VERIFIED | Pendiente |
| /guides/rest-api-design-guide | ❓ NOT VERIFIED | Pendiente |
| /recipes/api-versioning | ✅ | OK |
| /recipes/call-rest-api | ❓ NOT VERIFIED | Pendiente |
| /recipes/grpc-services-typescript | ✅ | OK |
| /recipes/rest-api-design | ✅ | OK |

### 6.7 H2 asimetría detallada

| Posición | EN | ES |
|----------|----|----|
| 1 | Overview | Visión General |
| 2 | When to Use | Cuándo Usar |
| 3 | Solution | Solución |
| 4 | Explanation | Explicación |
| 5 | Variants | Variantes |
| 6 | What Works | Lo que Funciona |
| 7 | Common Mistakes | Errores Comunes |
| 8 | When Not to Use This Approach | Cuando No Usar Este Enfoque ⚠️ sin acento |
| 9 | Performance Benchmarks | Benchmarks de Rendimiento |
| 10 | Testing Strategy | Estrategia de Testing |
| 11 | Cost Estimation | Estimacion de Costos ⚠️ sin acento |
| 12 | Monitoring and Observability | Monitoring y Observabilidad ⚠️ sin traducir |
| 13 | Deployment Checklist | Deployment Checklist ⚠️ sin traducir |
| 14 | Security Considerations | Consideraciones de Seguridad |
| 15 | Troubleshooting | **Referencia Rápida** ⚠️ extra en ES |
| 16 | Further Reading | Lectura Adicional |
| 17 | Production Notes | Notas de Producción |
| 18 | Key Takeaways | Puntos Clave |
| 19 | FAQ | Preguntas Frecuentes |
| 20 | Common Production Pitfalls | Troubleshooting ⚠️ sin traducir |
| 21 | — | Errores Comunes en Producción |

### 6.8 Secciones template AI detectadas

| Sección | EN línea | ES línea | Patrón |
|---------|----------|----------|--------|
| Key Takeaways | 294-299 | 309-314 | "Apply implement [title] when you need a practical solution" — template genérico |
| Production Notes | 287-292 | 302-307 | "Deploy gradually", "Configure alerts", "Document rollback" — aplicable a cualquier recurso |
| Common Production Pitfalls | 335-343 | 339-348 | "Copying the example", "Skipping load tests", "Hard-coding values" — aplicable a cualquier recurso |
| Referencia Rápida | (no existe) | 289-293 | "Comando principal", "Validación", "Rollback" — template genérico, solo en ES |
| Further Reading | 280-285 | 295-300 | "Official documentation: check the current reference" — sin enlaces específicos |
| Troubleshooting | 269-275 | 331-337 | "CORS errors", "Unexpected 404s", "Authentication failures" — problemas de REST, no de gRPC |
