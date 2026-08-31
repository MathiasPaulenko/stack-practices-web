# Checklist de arreglos — recipes/grpc-services-typescript

> Modo: `full`  
> Fecha de auditoría: 2026-08-31  
> Auditor: agente de contenido/SEO de StackPractices  
> Prompt maestro aplicado: `ref/audit-a-resource.md`

---

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `grpc-services-typescript` |
| Topic | `api` (carpeta `src/content/recipes/api/`) |
| Ruta EN | `src/content/recipes/api/grpc-services-typescript.md` |
| Ruta ES | `src/content/recipes/api/grpc-services-typescript.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/grpc-services-typescript/` |
| URL producción ES | `https://stackpractices.com/es/recipes/grpc-services-typescript/` |
| Título EN | `Build gRPC Services in TypeScript with Protocol Buffers` (55 chars) |
| Título ES | `Construye servicios gRPC en TypeScript con Protocol Buffers` (59 chars) |
| `description` EN | 146 chars |
| `description` ES | 150 chars |
| `metaDescription` EN | 150 chars |
| `metaDescription` ES | 159 chars |
| `difficulty` | `intermediate` |
| `topics` | `api`, `devops` |
| `tags` | `api`, `grpc`, `protocol-buffers`, `typescript`, `microservices`, `streaming` |
| `relatedResources` | 6 slugs, mismo orden EN/ES |
| `lastUpdated` | `2026-08-19` (EN/ES idéntico) |
| `publishedAt` | `2026-06-18` (EN/ES idéntico) |
| `author` | `Mathias Paulenko` |
| Palabras body (prosa sin bloques de código) EN | **~843** |
| Palabras body (prosa sin bloques de código) ES | **~750** |
| Mínimo esperado para `recipes` | ≥ 1.300 palabras de prosa |
| H2 EN/ES | 8 / 8 |
| H3 EN/ES | 12 / 12 |
| H4 EN/ES | 0 / 0 |
| Bloques de código EN/ES | 5 ejemplos + 1 script `package.json` cada idioma |
| FAQ items EN/ES | 6 / 6 |
| Enlaces internos en body EN/ES | 3 / 3 |
| Enlaces externos en body EN/ES | 0 / 0 |
| Mermaid / imágenes EN/ES | 0 bloques / 0 SVG |
| Companion repo | **No existe** (`../stack-practices-resources/resources/recipes/api/grpc-services-typescript/`) |
| AI detect content EN/ES | **47.0 %** / **39.9 %** (23/40 y 16/46; `pattern_totals: {}`) |
| Build | `npm run build` → 3.258 páginas, exit 0 |
| Sitemap | 3.256 URLs; EN/ES con hreflang y `lastmod=2026-08-19` |

---

## 1. Scorecard y decisiones

### 1.1 Rúbrica de 14 dimensiones

| Dimensión | Peso | Puntaje | Estado |
|-----------|------|---------|--------|
| Intención de búsqueda y ajuste SERP | 15 | 12/15 | ✅ |
| Calidad de contenido y utilidad | 15 | 4/15 | ❌ |
| Information gain y originalidad | 10 | 4/10 | ❌ |
| Cobertura semántica / tópica | 10 | 5/10 | ⚠️ |
| Enlazado interno y arquitectura | 8 | 7/8 | ✅ |
| SEO técnico e indexabilidad | 10 | 9/10 | ✅ |
| E-E-A-T / Confianza | 8 | 3/8 | ❌ |
| UX / legibilidad / accesibilidad | 7 | 5/7 | ⚠️ |
| GEO / AI Search Optimization | 5 | 3/5 | ⚠️ |
| Tráfico y potencial de crecimiento | 10 | 4/10 | ⚠️ |
| Structured data | 3 | 3/3 | ✅ |
| Performance | 5 | 3/5 | ✅ (no medido) |
| Medios / imágenes | 2 | 0/2 | ❌ |
| Frescura / mantenibilidad | 2 | 1/2 | ⚠️ |
| **TOTAL** | **100** | **60/100** | **WEAK** |

### 1.2 Decisiones finales

| Decisión | Valor |
| --- | --- |
| **PUNTAJE TOTAL** | **60/100** |
| **ESTADO PÁGINA** | **WEAK** |
| **DECISIÓN INDEXACIÓN** | **IMPROVE FIRST** |
| **PAGE-WORTHINESS** | **PROBABLY YES** (con mejoras) |
| **RIESGO THIN CONTENT** | **CRITICAL** |
| **RIESGO DUPLICACIÓN** | **LOW** (oración duplicada en EN) |
| **RIESGO CANIBALIZACIÓN** | **LOW** (`/recipes/grpc-api/` es competidor cercano pero no solapa directamente) |
| **SEO TÉCNICO** | **PASS** |
| **CALIDAD CONTENIDO** | **POOR** |
| **GEO READINESS** | **WEAK** |
| **POTENCIAL TRÁFICO** | **MEDIUM** |
| **PARIDAD BILINGÜE** | **PASS** |
| **RIESGO PATRÓN IA** | **HIGH** |
| **RIESGO CONTENIDO PROGRAMÁTICO** | **MEDIUM** |
| **RIESGO SOBRE-OPTIMIZACIÓN** | **LOW** |
| **VEREDICTO** | **FIX-THEN-PROMOTE** |

> El recurso está bien técnicamente, pero falla en las dimensiones que generan confianza y diferenciación: contenido insuficiente, alto AI score en EN, promesas no cumplidas (health checks), sin fuentes externas y sin companion. Con una ronda de mejora sustancial puede llegar a GOOD/VERY STRONG.

---

## 2. Checklist de arreglos

### Critical

- [ ] **[CRITICAL] [CONTENT] Elevar el body prosa por encima de las 1.300 palabras en EN y ES**
  - Why: El mínimo para `recipes` es 1.300 palabras de prosa sin bloques de código. Ahora hay ~843 EN / ~750 ES, lo que califica como thin content y reduce el page-worthiness.
  - Evidence: conteo local de `src/content/recipes/api/grpc-services-typescript.md` y `.es.md`; `03-content-quality-audit.md` define el mínimo para `recipes`.
  - How: Expandir cada sección con contexto real, trade-offs, decisiones de diseño, advertencias de producción y ejemplos adicionales (TLS, deadlines, health checks, manejo de errores).
  - Effort: High.
  - Source: 03-content-quality.

- [ ] **[CRITICAL] [HUMANIZATION] Reducir `model_ai_pct` por debajo del 40 % en EN (47.0 % actual)**
  - Why: El detector Desklib etiqueta ~36 % de las oraciones EN como AI. El contenido suena definitorio e impersonal, lo que dificulta la confianza del lector y la recuperabilidad en IA.
  - Evidence: `ref/output/ai-detect-grpc-services-typescript.json` (`grpc-services-typescript-en: 47.0 %`, 23 AI / 40 human, `pattern_totals: {}`). Frases de alto score: "The API is public-facing...", "Add new fields with the next available number.", "They map cleanly to a traditional request/response API." (duplicada).
  - How: Reescribir en primera persona ("I", "my"), añadir trade-offs concretos, advertencias reales de producción y ejemplos de casos donde algo falló. Evitar aperturas definitorias y listas genéricas.
  - Effort: High.
  - Source: 04-humanization.

- [ ] **[CRITICAL] [CONTENT] Añadir ejemplo funcional de gRPC Health Checks**
  - Why: El título, la `description`, la `metaDescription` y el H1 prometen "health checks" y "production-ready"; el body solo menciona el concepto en `Best Practices` sin código.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` líneas 315-318 y `.es.md` 317-318; no hay bloque de código con `grpc-health-check` ni implementación de `Health`.
  - How: Añadir un bloque de código TypeScript que importe `@grpc/grpc-js/build/src/generated/grpc/health/v1/Health` o use el paquete `grpc-health-check`, defina el servicio y exponga `/grpc.health.v1.Health/Check`.
  - Effort: Medium.
  - Source: 03-content-quality.

- [ ] **[CRITICAL] [GEO] Añadir enlaces externos a fuentes primarias y citas verificables**
  - Why: El recurso hace afirmaciones sobre HTTP/2, gRPC, `buf`, versionado de protobuf y health checks sin citar fuentes oficiales. Eso reduce E-E-A-T y dificulta la verificación por modelos de IA.
  - Evidence: No hay enlaces externos en el body EN/ES (`https://` solo aparece en URLs del companion y `stackpractices.com`).
  - How: Añadir enlaces a `grpc.io/docs/languages/node/`, `protobuf.dev/programming-guides/proto3/`, `github.com/bufbuild/buf`, `github.com/grpc-ecosystem/grpc-health-probe` y, si aplica, NIST/OWASP para TLS.
  - Effort: Low.
  - Source: 06-geo.

### High

- [ ] **[HIGH] [CONTENT] Completar el proyecto con `package.json` y dependencias reales**
  - Why: El recurso muestra un script `proto:generate` pero no incluye el `package.json` con las dependencias (`@grpc/grpc-js`, `grpc-tools`, `ts-protoc-gen` / `@grpc/proto-loader`). Esto dificulta reproducir el ejemplo.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` líneas 122-129.
  - How: Añadir un bloque `package.json` con versiones reales y un `tsconfig.json` si usa `commonjs` + `grpc_js`.
  - Effort: Low.
  - Source: 03-content-quality.

- [ ] **[HIGH] [CONTENT] Añadir diagrama Mermaid del flujo de llamada gRPC y renderizar SVGs**
  - Why: El flujo de unary/server/client/bidi streaming se presta a un diagrama de secuencia o flujo que mejora la comprensión y el SEO de imágenes. Ahora no hay medios visuales.
  - Evidence: `dist/recipes/grpc-services-typescript/index.html` no contiene `class="mermaid-diagram"`; `public/assets/diagrams/grpc-services-typescript-*.svg` no existe.
  - How: Añadir un bloque ` ```mermaid ` con `%% alt:` descriptivo, ejecutar `npm run mermaid:render` y verificar `dist/assets/diagrams/`.
  - Effort: Medium.
  - Source: 09-companion-media.

- [ ] **[HIGH] [CONTENT] Corregir oración duplicada en el body EN**
  - Why: "They map cleanly to a traditional request/response API." aparece dos veces consecutivas en la sección `Explanation` (líneas 280-282), lo que daña la calidad y es señal de contenido generado.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` líneas 280-282; `ref/output/ai-detect-grpc-services-typescript.json` la marca con score 0.504 en ambas ocurrencias.
  - How: Eliminar la repetición y reescribir el párrafo con una sola idea y contexto adicional.
  - Effort: Very Low.
  - Source: 03-content-quality.

- [ ] **[HIGH] [HUMANIZATION] Reescribir el tono en primera persona y añadir trade-offs específicos**
  - Why: El body usa "you" solo 3 veces en EN y nunca "I" / "my" en prosa. El ES usa voseo, pero sigue siendo mayormente definitorio. Falta la voz de alguien que ha desplegado gRPC en producción.
  - Evidence: conteo manual; `ai-detect-grpc-services-typescript.json` muestra frases con alto AI score; `04-humanization-audit.md` requiere tono personal y advertencias reales.
  - How: Transformar `Explanation`, `Best Practices` y `Common Mistakes` a "I prefer...", "I avoid...", "On my projects...", con razones concretas (latencia, ancho de banda, complejidad del cliente).
  - Effort: High.
  - Source: 04-humanization.

- [ ] **[HIGH] [GEO] Enriquecer FAQ con enlaces a fuentes y pasajes extraíbles concretos**
  - Why: El FAQ responde bien a PAA potenciales, pero las respuestas no citan fuentes ni contienen datos versionados. Los motores de IA prefieren respuestas autocontenidas con referencias.
  - Evidence: 6 FAQ EN y 6 FAQ ES, ninguno con enlace externo.
  - How: Añadir 1-2 enlaces oficiales por respuesta clave y reformular para que cada respuesta tenga una idea principal clara con datos (ej.: "gRPC-Web con Envoy", "protobuf 3 spec field number 12").
  - Effort: Medium.
  - Source: 06-geo.

- [ ] **[HIGH] [COMPANION] Evaluar la creación de un companion repo ejecutable en `stack-practices-resources`**
  - Why: El recurso contiene múltiples archivos (`proto/user.proto`, `grpc/server.ts`, `grpc/client.ts`, `grpc/interceptor.ts`) que forman un proyecto completo. Un companion repo mejora E-E-A-T y proporciona un asset linkeable.
  - Evidence: `../stack-practices-resources/resources/recipes/api/grpc-services-typescript/` no existe.
  - How: Crear `meta.json`, `package.json`, `tsconfig.json`, `proto/user.proto`, `src/server.ts`, `src/client.ts`, `src/interceptor.ts`, `README.md`, `README.es.md` y ejecutar `node scripts/build-catalog.js`.
  - Effort: Medium.
  - Source: 09-companion-media.

- [ ] **[HIGH] [CONTENT] Añadir sección `See Also` / `Further Reading` con recursos internos y externos autorizados**
  - Why: Mejora el enlazado contextual, la navegación y la señal de autoridad al citar documentación oficial. `AGENTS.md` permite `## See Also`.
  - Evidence: No existe sección `See Also` ni `Further Reading` en EN/ES.
  - How: Añadir 3-5 enlaces: gRPC Node docs, Protobuf guide, `buf` breaking docs, `grpc-health-probe`, y recursos internos (`/recipes/grpc-api/`, `/recipes/rest-api-design/`).
  - Effort: Low.
  - Source: 03-content-quality.

- [ ] **[HIGH] [CONTENT] Ampliar `Variants` con criterios de decisión y trade-offs cuantificables**
  - Why: La tabla actual solo enumera tipos de llamada. No ayuda a decidir cuándo usar cada uno en un caso real, ni menciona latencia, backpressure o complejidad del cliente.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` líneas 294-304.
  - How: Añadir columnas "Overhead", "Backpressure", "Typical use" y ejemplos de latencia/throughput.
  - Effort: Medium.
  - Source: 03-content-quality.

- [ ] **[HIGH] [E-E-A-T] Añadir advertencias de producción con ejemplos reales de fallos**
  - Why: El recurso menciona buenas prácticas pero no explica *por qué* importan desde la experiencia. Aumentaría la autoridad y la utilidad.
  - Evidence: `Common Mistakes` es una lista genérica; faltan consecuencias concretas (p. ej., "crear cliente nuevo por request destruye HTTP/2 multiplexing y eleva la latencia ~X ms").
  - How: Reescribir cada ítem de `Common Mistakes` con una consecuencia medible o una anécdota real.
  - Effort: Medium.
  - Source: 03-content-quality + 04-humanization.

### Medium

- [ ] **[MEDIUM] [CONTENT] Refrescar `lastUpdated` al día de la última edición real**
  - Why: El recurso está estancado en `2026-08-19`. Si se edita, debe reflejar la fecha actual para señal de frescura.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` y `.es.md` línea 25.
  - How: Actualizar a la fecha de la ronda de mejora.
  - Effort: Very Low.
  - Source: 03-content-quality.

- [ ] **[MEDIUM] [CONTENT] Incluir ejemplo de TLS para gRPC en producción**
  - Why: `Best Practices` dice "Use TLS for inter-service gRPC in production" pero no muestra cómo crear credenciales ni `ServerCredentials.createSsl()`.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` línea 307.
  - How: Añadir un bloque de código TypeScript con `grpc.credentials.createSsl()` y un comentario sobre certificados.
  - Effort: Low.
  - Source: 03-content-quality.

- [ ] **[MEDIUM] [CONTENT] Incluir ejemplo de deadline y propagación de metadata**
  - Why: `Best Practices` y `FAQ` mencionan deadlines, pero el `client.ts` actual no los muestra. Es una promesa del índice del recurso.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` líneas 354-356.
  - How: Añadir un snippet de `client.getUser(req, { deadline: Date.now() + 5000 }, callback)` y un interceptor que lea `grpc-timeout`.
  - Effort: Low.
  - Source: 03-content-quality.

- [ ] **[MEDIUM] [CONTENT] Sustituir datos placeholder por ejemplos realistas**
  - Why: El servidor devuelve `user.setName('Alice')` y `user.setEmail('alice@example.com')`; el interceptor usa `'Bearer token123'`. Son aceptables pero pueden reforzarse con datos de prueba más realistas.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` líneas 147-148, 265.
  - How: Usar nombres y tokens que parezcan datos de prueba reales (UUIDs, emails de dominio de ejemplo como `@stackpractices.local`).
  - Effort: Very Low.
  - Source: 03-content-quality.

- [ ] **[MEDIUM] [SEO] Añadir tags más específicos (`nodejs`, `protobuf`, `health-checks`, `buf`)**
  - Why: El recurso trata sobre Node.js, protobuf y health checks, pero los tags no los incluyen, limitando el descubrimiento interno.
  - Evidence: `tags` frontmatter.
  - How: Añadir `nodejs`, `protobuf`, `health-checks`, `buf` (si se menciona `buf breaking`) y `deadlines`.
  - Effort: Very Low.
  - Source: 02-seo.

### Low

- [ ] **[LOW] [MOBILE] Realizar verificación visual a 375 px si se dispone de navegador/Playwright**
  - Why: El HTML tiene viewport y `.mermaid-diagram { max-width: 100% }`, pero no se capturó screenshot real.
  - Evidence: `dist/recipes/grpc-services-typescript/index.html` contiene `<meta name="viewport" ...>`; no hay diagramas que puedan romper el ancho.
  - How: Si se usa Playwright/wavexis, capturar screenshot en `ref/audit/reports/screenshots/grpc-services-typescript-mobile.png` y verificar overflow.
  - Effort: Low.
  - Source: 09-companion-media.

- [ ] **[LOW] [TRAFFIC] Evaluar datos de GSC/GA4 cuando estén disponibles**
  - Why: No se dispone de métricas de tráfico reales para este recurso.
  - Evidence: `08-gsc-ga4-traffic-audit.md` requiere datos de impresiones/clicks/posición.
  - How: Si se conecta GA4/GSC, revisar si la query "grpc typescript" genera impresiones y ajustar title/meta para CTR.
  - Effort: Low.
  - Source: 08-gsc-ga4-traffic.

- [ ] **[LOW] [SEO] Diferenciar `description` de `metaDescription` para evitar repetición en SERP**
  - Why: Ahora `description` y `metaDescription` son casi idénticos. Google a veces muestra `description` como snippet; conviene que uno actúe como gancho y otro como resumen.
  - Evidence: frontmatter EN y ES.
  - How: Dejar `description` como gancho corto y `metaDescription` como resumen con palabras clave.
  - Effort: Very Low.
  - Source: 02-seo.

- [ ] **[LOW] [HUMANIZATION] Revisar y eliminar transiciones rígidas en Explanation**
  - Why: La sección `Explanation` usa bullets con aperturas repetitivas "X starts with...", "X sends many...". Puede sonar a plantilla.
  - Evidence: `src/content/recipes/api/grpc-services-typescript.md` líneas 280-293.
  - How: Variar la estructura de las oraciones y añadir conectores conversacionales.
  - Effort: Low.
  - Source: 04-humanization.

---

## 3. Definition of Done

### Frontmatter y SEO

- [ ] `title` < 60 caracteres e igual al H1 renderizado.
- [ ] `description` y `metaDescription` dentro de 50-170 y coincidentes con `seo.metaDescription`.
- [ ] `relatedResources` 3-6 slugs coherentes, mismo orden EN/ES.
- [ ] `lastUpdated` actualizado a la fecha de la última mejora real.
- [ ] H1 único generado desde el frontmatter; jerarquía H2 → H3 sin saltos.

### Body y contenido

- [ ] Body prosa ≥ 1.300 palabras en EN y ES.
- [ ] `Overview` empieza con problema real, no con definición genérica.
- [ ] `When to Use` con 4-6 situaciones concretas y al menos una donde NO aplica.
- [ ] `Solution` incluye ejemplos funcionales de todos los tipos de llamada + health check + TLS + deadline.
- [ ] `Explanation` explica trade-offs y decisiones de diseño, no solo define conceptos.
- [ ] `Variants` con criterios de decisión (overhead, backpressure, uso típico).
- [ ] `Best Practices` y `Common Mistakes` específicas del dominio con consecuencias reales.
- [ ] `FAQ` con 6 preguntas variadas; respuestas con enlaces a fuentes oficiales.
- [ ] `See Also` con 3-5 enlaces internos/externos autorizados.
- [ ] Código con lenguaje explícito, `package.json` y datos de prueba realistas.

### Humanización

- [ ] `model_ai_pct` EN < 40 % y ES < 40 %.
- [ ] Tono en primera persona con trade-offs explícitos.
- [ ] Sin frases patrón ni oraciones duplicadas.
- [ ] Párrafos con sustancia, no solo definiciones.

### Paridad EN/ES

- [ ] Misma estructura de secciones y orden.
- [ ] Metadatos traducidos con longitudes correctas.
- [ ] Código y ejemplos equivalentes; comentarios y strings traducidos donde sea idiomático.
- [ ] `relatedResources` y `lastUpdated` coincidentes.

### Medios visuales y companion

- [ ] Diagrama Mermaid añadido, SVGs renderizados y referenciados en HTML.
- [ ] `/lightbox.js` presente.
- [ ] Sin overflow horizontal en móvil (estructural: viewport, max-width 100%).
- [ ] Companion repo creado con `meta.json`, archivos y README EN/ES (si se decide crear; sino, documentar como RECOMMENDATION).

### Validación técnica

- [ ] `npm run content:quality` → 0 errores, 0 warnings.
- [ ] `npm run content:links` → 0 rotos.
- [ ] `npm run content:validate` → 0 errores, 0 advertencias.
- [ ] `npm run check` → 0 errores, 0 warnings.
- [ ] `npm run build` → 3.258 páginas OK.
- [ ] `npm run sitemap` → 3.256 URLs.
- [ ] `npm run mermaid:render` (si se añade diagrama) → SVGs generados, 0 skipped.

---

## 4. Top 5 acciones

1. **Expandir el body por encima de 1.300 palabras en EN y ES** y añadir los ejemplos prometidos (health check, TLS, deadline, `package.json` completo). — impacto CRITICAL, esfuerzo High.
2. **Humanizar el tono a primera persona y eliminar la oración duplicada en EN** para bajar el AI score por debajo del 40 %. — impacto HIGH, esfuerzo High.
3. **Añadir un diagrama Mermaid del flujo de llamada gRPC** y renderizar SVGs en EN/ES. — impacto HIGH, esfuerzo Medium.
4. **Añadir 2-4 enlaces externos a fuentes primarias** (gRPC Node docs, Protobuf guide, `buf`, health check probe) y una sección `See Also`. — impacto HIGH, esfuerzo Low.
5. **Crear un companion repo ejecutable** con el proyecto Node.js completo y enlazarlo desde el body. — impacto MEDIUM, esfuerzo Medium.

---

## 5. Veredicto

**FIX-THEN-PROMOTE.** El recurso `recipes/grpc-services-typescript` tiene una estructura técnica sólida y buena paridad bilingüe, pero es thin content (843/750 palabras frente a 1.300 mínimo), presenta un AI score crítico en EN (47 %), no cumple la promesa de "health checks" y carece de fuentes externas, medios visuales y companion. Una ronda de mejora enfocada en profundidad, voz personal y ejemplos de producción puede elevarlo a GOOD/VERY STRONG.

---

## 6. Anexos

### 6.1 — Auditoría técnica (01)

| Check | Resultado |
| --- | --- |
| Slug kebab-case, único | ✅ `grpc-services-typescript` |
| Ruta publicada | ✅ `/recipes/grpc-services-typescript/` y `/es/recipes/grpc-services-typescript/` |
| Canonical self-referencing | ✅ `https://stackpractices.com/recipes/grpc-services-typescript/` y `/es/...` |
| Sitemap | ✅ Presente con `lastmod=2026-08-19` y hreflang |
| Structured data | ✅ `WebPage`, `TechArticle`, `BreadcrumbList`, `FAQPage` |
| `lightbox.js` | ✅ Presente en EN y ES |
| Viewport | ✅ Presente |
| Mermaid renderizado | ❌ No hay diagramas |
| Enlaces rotos | ✅ 0 (validado con `npm run content:links`) |
| Build | ✅ 3.258 páginas OK |
| **PUNTAJE TÉCNICO** | **9/10** |

### 6.2 — Auditoría SEO (02)

| Check | EN | ES | OK |
| --- | --- | --- | --- |
| `title` ≤ 60 chars | 55 | 59 | ✅ |
| `metaDescription` 50-170 | 150 | 159 | ✅ |
| `description` presente | 146 | 150 | ✅ |
| `description` ≠ `metaDescription` (recomendado) | casi iguales | casi iguales | ⚠️ LOW |
| `relatedResources` 2-6 | 6 | 6, mismo orden | ✅ |
| `lastUpdated` coincidente | 2026-08-19 | 2026-08-19 | ✅ |
| H1 = title | ✅ | ✅ | ✅ |
| Jerarquía H2 → H3 | 8/12/0 | 8/12/0 | ✅ |
| Sin H1 manual en body | ✅ | ✅ | ✅ |
| **PUNTAJE SEO ON-PAGE** | **14/15** | | |

### 6.3 — Auditoría de calidad de contenido (03)

| Métrica | EN | ES |
| --- | --- | --- |
| Palabras body (prosa) | ~843 | ~750 |
| Bloques de código | 6 | 6 |
| FAQ | 6 | 6 |
| Secciones obligatorias | Presentes | Presentes |
| Thin content | CRITICAL | CRITICAL |
| Health check implementado | No | No |
| `package.json` completo | No | No |
| TLS example | No | No |
| Deadline example | Mencionado, no en código | Mencionado, no en código |
| Duplicación | Oración duplicada EN | No detectada |
| **PUNTAJE CALIDAD** | **4/15** | **4/15** |

### 6.4 — Auditoría de humanización (04)

| Métrica | EN | ES |
| --- | --- | --- |
| `model_ai_pct` | 47.0 % | 39.9 % |
| `ai_count` / `human_count` | 23 / 40 | 16 / 46 |
| `pattern_totals` | `{}` | `{}` |
| Instancias de primera persona (`I` / `my`) | 0 en prosa | 0 en prosa |
| Instancias de segunda persona (`you`) | 3 | 0 (voseo) |
| Oración duplicada | Sí (líneas 280-282) | No |
| **PUNTAJE HUMANIZACIÓN** | **3/8** | **5/8** |

### 6.5 — Auditoría de paridad bilingüe (05)

| Campo | EN | ES | OK |
| --- | --- | --- | --- |
| `title` | 55 chars | 59 chars | ✅ |
| `description` | 146 chars | 150 chars | ✅ |
| `metaDescription` | 150 chars | 159 chars | ✅ |
| `lastUpdated` | 2026-08-19 | 2026-08-19 | ✅ |
| `relatedResources` | 6 slugs | 6 slugs, mismo orden | ✅ |
| Body links internos | 3 | 3 | ✅ |
| H2 / H3 / H4 | 8/12/0 | 8/12/0 | ✅ |
| Bloques de código | 6 | 6 | ✅ |
| Longitud prosa | ~843 | ~750 | ⚠️ (ambas por debajo del mínimo) |
| Código / ejemplos | Equivalentes | Equivalentes | ✅ |
| **PARIDAD BILINGÜE** | **PASS** | | |

### 6.6 — Auditoría GEO / AI Search (06)

| Check | Resultado |
| --- | --- |
| Claridad de entidades | MEDIUM |
| Densidad factual | LOW |
| Citas | INSUFFICIENT (0 enlaces externos) |
| Pasajes extraíbles | MEDIUM (FAQ ayuda, pero sin fuentes) |
| Consistencia terminológica | PASS (entidades iguales EN/ES) |
| Structured data para IA | OK (`inLanguage`, `educationalLevel`) |
| Paridad GEO bilingüe | PASS |
| **PUNTAJE GEO** | **3/5** |

### 6.7 — Auditoría GSC/GA4 / Tráfico (08)

| Check | Resultado |
| --- | --- |
| Datos GSC/GA4 | NOT VERIFIED |
| CTR potencial | MEDIUM (gRPC TypeScript tiene búsqueda estable) |
| Optimización SERP | Posible mejorar meta para "typescript node grpc example" |
| **PUNTAJE TRÁFICO** | **4/10** |

### 6.8 — Auditoría de companion y medios (09)

| Check | Resultado |
| --- | --- |
| Companion repo | NO EXISTE (recomendado) |
| `meta.json` | N/A |
| Archivos companion | N/A |
| Diagramas Mermaid | Ninguno |
| SVGs en `public/assets/diagrams/` | Ninguno |
| `lightbox.js` en HTML | ✅ |
| Responsive estructural | ✅ viewport + CSS max-width |
| Verificación visual móvil | NOT VERIFIED |
| **PUNTAJE MEDIOS/COMPANION** | **0/3** |

### 6.9 — Validación técnica

| Comando | Resultado |
| --- | --- |
| `npm run content:quality` | ✅ 0 errores, 0 warnings (2,042 archivos) |
| `npm run content:links` | ✅ 0 rotos (1,025 archivos) |
| `npm run content:validate` | ✅ 0 errores, 0 advertencias (1,021 archivos) |
| `npm run check` | ✅ 0 errores, 0 warnings, 3 hints preexistentes |
| `npm run mermaid:render` | N/A (sin diagramas) |
| `npm run build` | ✅ 3,258 páginas, SRI añadidos |
| `npm run sitemap` | ✅ 3,256 URLs, 6,602 image entries, `lastmod=2026-08-19` |

### 6.10 — AI detection outputs

| Archivo | Contenido |
| --- | --- |
| `ref/output/ai-detect-grpc-services-typescript.json` | EN 47.0 %, ES 39.9 %, `pattern_totals: {}` |
| `ref/output/ai-detect-patterns-grpc-services-typescript.json` | 0 findings |
| `ref/output/ai-detect-patterns-grpc-services-typescript-es.json` | 0 findings |
