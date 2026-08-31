# Checklist de arreglos — recipes/message-idempotency

> Modo: `full`  
> Fecha de auditoría: 2026-08-31  
> Auditor: agente de contenido/SEO de StackPractices  
> Prompt maestro aplicado: `ref/audit-a-resource.md`

---

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `message-idempotency` |
| Topic | `messaging` (carpeta `src/content/recipes/messaging/`) |
| Ruta EN | `src/content/recipes/messaging/message-idempotency.md` |
| Ruta ES | `src/content/recipes/messaging/message-idempotency.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/message-idempotency/` |
| URL producción ES | `https://stackpractices.com/es/recipes/message-idempotency/` |
| Título EN | `Message Processing Idempotency` (30 chars) |
| Título ES | `Idempotencia en Procesamiento de Mensajes` (41 chars) |
| `description` EN | 110 chars |
| `description` ES | 132 chars |
| `metaDescription` EN | 149 chars |
| `metaDescription` ES | 156 chars |
| `difficulty` | `advanced` |
| `topics` | `messaging`, `architecture` (válidos) |
| `tags` | `messaging`, `distributed-systems`, `kafka`, `rabbitmq`, `idempotency`, `event-driven` (6) |
| `relatedResources` | 6 slugs, mismo orden EN/ES, todos válidos |
| `lastUpdated` | `2026-08-19` (EN/ES idéntico) |
| `publishedAt` | `2026-06-19` (EN/ES idéntico) |
| `author` | `Mathias Paulenko` |
| Palabras body (prosa sin bloques de código) EN | **~707** |
| Palabras body (prosa sin bloques de código) ES | **~755** |
| Mínimo esperado para `recipes` | ≥ 1.300 palabras de prosa |
| H2 EN/ES | 8 / 8 |
| H3 EN/ES | 9 / 9 (incluye 5 FAQ) |
| H4 EN/ES | 0 / 0 |
| Bloques de código EN/ES | 3 / 3 (Node.js Redis, PostgreSQL, Java Kafka producer) |
| FAQ items EN/ES | 5 / 5 |
| Enlaces internos en body EN/ES | 0 / 0 |
| Enlaces externos en body EN/ES | 0 / 0 |
| Mermaid / imágenes EN/ES | 0 / 0 |
| Companion repo | **No existe** (`../stack-practices-resources/resources/recipes/messaging/message-idempotency/`) |
| AI detect content EN/ES | **47.6 %** / **41.4 %** (23/32 y 17/40; `pattern_totals: {}`) |
| Build | `npm run build` → 3.260 páginas, exit 0 |
| Sitemap | 3.258 URLs, EN/ES con `lastmod=2026-08-19` |

---

## 1. Scorecard y decisiones

### 1.1 Rúbrica de 15 dimensiones

| Dimensión | Peso | Fuente | Puntuación | Notas |
|---|---|---|---|---|
| Intención de búsqueda y ajuste SERP | 15 | 03 | 9/15 | El título y meta responden a la query "message idempotency" y variantes. El contenido responde a intento tutorial/avanzado, pero la prosa corta limita la SERP real estate. |
| Calidad de contenido y utilidad | 15 | 03 | 3/15 | Prosa ~707/755 palabras, por debajo del mínimo de 1.300. Los ejemplos son copy-pasteables pero la explicación es breve y no hay troubleshooting ni sección See Also. |
| Information gain y originalidad | 10 | 03 | 4/10 | Cubre Redis SET NX, PostgreSQL deduplication, Kafka idempotent producer y variantes (Bloom filter, natural idempotency). Falta consumer-side idempotency, RabbitMQ/SQS, métricas de producción y companion repo ejecutable. |
| Cobertura semántica / tópica | 10 | 03 | 6/10 | Cubre conceptos clave (deduplication, idempotency key, exactly-once, TTL, consumer reprocessing). Falta implementación en Python, .NET o Go, y manejo de particiones cruzadas. |
| Enlazado interno y arquitectura | 8 | 01 + 03 | 3/8 | 0 enlaces internos en el body; 6 `relatedResources` correctas. Recibe varios enlaces entrantes desde recetas de mensajería. |
| SEO técnico e indexabilidad | 10 | 01 | 10/10 | Canonical, hreflang, sitemap, structured data y OG correctos. Build OK. Slug único. |
| E-E-A-T / Confianza | 8 | 03 + 06 | 3/8 | Autor presente, fechas, pero sin enlaces externos a documentación oficial, sin companion, AI score alto, sin citas verificables. |
| UX / legibilidad / accesibilidad | 7 | 03 | 5/7 | Estructura clara, código con lenguaje, FAQ variado. Sin diagramas; móvil no verificado con navegador. |
| GEO / AI Search readiness | 5 | 06 | 3/5 | FAQ y structured data `FAQPage` presentes, pero respuestas sin fuentes y el contenido es thin. |
| Tráfico y potencial de crecimiento | 10 | 08 | 5/10 | Query con demanda en arquitectura distribuida y Kafka/RabbitMQ, pero la competencia es fuerte y el recurso no diferencia con profundidad. |
| Structured data | 3 | 01 + 02 | 3/3 | `WebPage`, `TechArticle`, `BreadcrumbList`, `FAQPage` presentes en EN/ES. |
| Performance | 5 | 01 | 3/5 | Sin datos reales de CWV; build estático, viewport y CSS responsive OK, imágenes ausentes. |
| Medios / imágenes | 2 | 09 | 0/2 | Sin Mermaid ni imágenes. El flujo `producer → broker → consumer → dedup → side effect` se beneficiaría de un diagrama. |
| Frescura / mantenibilidad | 2 | 03 | 1/2 | `lastUpdated` 2026-08-19, contenido estable pero sin actualización de versiones ni companion. |
| Paridad bilingüe | (reporte) | 05 | 9/10 | Estructura, metadatos y ejemplos equivalentes; ES ligeramente más largo y ambos por debajo del mínimo. |
| **TOTAL** | **100** | — | **68/100** | — |

### 1.2 Decisión final

| Campo | Valor |
| --- | --- |
| **PUNTAJE TOTAL** | **68/100** |
| **ESTADO PÁGINA** | **NEEDS IMPROVEMENT** |
| **DECISIÓN INDEXACIÓN** | **IMPROVE FIRST** |
| **PAGE-WORTHINESS** | **PROBABLY YES** |
| **RIESGO THIN CONTENT** | **CRITICAL** |
| **RIESGO DUPLICACIÓN** | **NONE** |
| **RIESGO CANIBALIZACIÓN** | **LOW** |
| **SEO TÉCNICO** | **PASS** |
| **CALIDAD CONTENIDO** | **WEAK** |
| **GEO READINESS** | **MODERATE** |
| **POTENCIAL TRÁFICO** | **MEDIUM** |
| **PARIDAD BILINGÜE** | **PASS** |
| **RIESGO PATRÓN IA** | **HIGH** |
| **RIESGO CONTENIDO PROGRAMÁTICO** | **MEDIUM** |
| **RIESGO SOBRE-OPTIMIZACIÓN** | **LOW** |
| **VEREDICTO FINAL** | **FIX-THEN-PROMOTE** |

---

## 2. Checklist de arreglos

### CRITICAL

- [ ] **[CRITICAL] [CONTENT] Expandir el body de prosa por encima de 1.300 palabras en EN y ES**
  - Why: El mínimo para `recipes` es 1.300 palabras de prosa; el recurso tiene ~707/755. El thin content limita el ranking y el information gain.
  - Evidence: Medición local del body (sin bloques de código): EN ~707 palabras, ES ~755 palabras.
  - How: Añadir secciones de profundidad (arquitectura consumer-side, escenarios de falla, particiones cruzadas, implementación en Python/Go, troubleshooting, FAQ adicionales, sección See Also con fuentes). Replicar en ES.
  - Effort: High.
  - Source: 03-content-quality-audit.

- [ ] **[CRITICAL] [HUMANIZATION] Reducir `model_ai_pct` por debajo del 40 % en EN y ES**
  - Why: AI detector reporta EN 47.6 % y ES 41.4 %. El riesgo de patrón IA es HIGH.
  - Evidence: `ref/output/ai-detect-message-idempotency.json`. Top frases con alta probabilidad IA en Overview, When to Use y FAQ.
  - How: Reescribir frases genéricas en primera persona con trade-offs concretos, añadir anécdotas/advertencias reales y variar estructura de oraciones. Evitar aperturas de definición de diccionario.
  - Effort: High.
  - Source: 04-humanization-audit.

### HIGH

- [ ] **[HIGH] [CONTENT] Añadir 2-3 enlaces internos contextuales en el body EN/ES**
  - Why: El `AGENTS.md` de recipes pide 2-3 enlaces contextuales. Actualmente hay 0. Mejora arquitectura de enlaces y descubrimiento.
  - Evidence: `grep '\](/' src/content/recipes/messaging/message-idempotency*.md` → 0 resultados.
  - How: Enlazar desde secciones relevantes a `/recipes/rabbitmq-task-queue`, `/recipes/kafka-event-streaming`, `/recipes/event-driven-microservices`, `/recipes/dead-letter-queue`, `/guides/microservices-architecture-guide`. Replicar en ES.
  - Effort: Low.
  - Source: 02-seo-audit.

- [ ] **[HIGH] [GEO] Añadir enlaces externos a fuentes primarias en una sección `See Also`**
  - Why: El recurso no cita documentación oficial ni fuentes verificables en el body. Baja E-E-A-T y GEO.
  - Evidence: `grep 'https://' src/content/recipes/messaging/message-idempotency*.md` → 0 resultados.
  - How: Añadir sección `## See Also` con enlaces a Kafka docs (idempotent producer), Redis SET docs, PostgreSQL `ON CONFLICT` docs, AWS SQS exactly-once processing, Martin Kleppmann "Designing Data-Intensive Applications" (capítulo de mensajería). Traducir en ES.
  - Effort: Low.
  - Source: 06-geo-audit.

- [ ] **[HIGH] [CONTENT] Humanizar la voz y convertir listas genéricas en prosa con contexto**
  - Why: Las secciones `When to Use`, `Best Practices` y `Common Mistakes` son listas cortas sin experiencia personal. Parecen plantilla.
  - Evidence: AI detector marca frases como "A message is idempotent when processing it N times..." y "The key has to be unique and stable."
  - How: Reescribir bullets con primera persona y situaciones reales ("I once had a payment service reprocess..."). Añadir por qué cada punto importa.
  - Effort: Medium.
  - Source: 04-humanization-audit.

- [ ] **[HIGH] [CONTENT] Añadir ejemplos consumer-side y casos de producción**
  - Why: El recurso se enfoca en deduplication con Redis/PostgreSQL y producer idempotente de Kafka. Falta cómo el consumer maneja rebalances, reintentos y particiones cruzadas.
  - Evidence: Ejemplos actuales son 3 bloques de código centrados en producer/dedup key. No hay test cases de doble procesamiento ni manejo de offsets.
  - How: Añadir implementación de consumer idempotente en Node.js/Python/Java, manejo de `consumer.seek()` y `commitSync`, escenario de reprocessamiento tras rebalance.
  - Effort: High.
  - Source: 03-content-quality-audit.

### MEDIUM

- [ ] **[MEDIUM] [CONTENT] Añadir sección de troubleshooting / errores comunes con soluciones concretas**
  - Why: La sección `Common Mistakes` es una lista de 6 bullets sin profundidad. No explica cómo resolver cada problema.
  - Evidence: `Common Mistakes` tiene ~70 palabras en EN; cada ítem es una línea.
  - How: Expandir cada bullet con causa, síntoma y solución (ej: "Keeping deduplication keys only in memory" → usar Redis/PostgreSQL persistente con TTL). Renombrar a `Troubleshooting` si se prefiere.
  - Effort: Medium.
  - Source: 03-content-quality-audit.

- [ ] **[MEDIUM] [MEDIA] Evaluar añadir un diagrama Mermaid del flujo de idempotencia**
  - Why: El flujo `producer → broker → consumer → dedup store → side effect → ack` es visual y mejora comprensión.
  - Evidence: No hay bloques ` ```mermaid ` en ningún archivo; no hay imágenes.
  - How: Añadir `flowchart LR` en `Explanation` mostrando `publish` → `broker` → `consume` → `dedup check` → `process or skip` → `commit offset`. Renderizar SVGs.
  - Effort: Low.
  - Source: 09-companion-media-audit.

- [ ] **[MEDIUM] [COMPANION] Crear companion repo con ejemplos ejecutables**
  - Why: El recurso contiene ejemplos multi-lenguaje (Node.js, PostgreSQL, Java). Un companion repo los hace descargables y ejecutables.
  - Evidence: `../stack-practices-resources/resources/recipes/messaging/message-idempotency/meta.json` no existe.
  - How: Crear carpeta con `meta.json`, archivos de ejemplo (`redis-consumer.js`, `postgres-dedup.sql`, `kafka-producer.java`, `docker-compose.yml`), `README.md` y `README.es.md`. Ejecutar `node scripts/build-catalog.js` en el repo hermano.
  - Effort: Medium.
  - Source: 09-companion-media-audit.

- [ ] **[MEDIUM] [CONTENT] Actualizar versiones de librerías y añadir datos realistas**
  - Why: Los ejemplos no versionan librerías (`redis`, `kafka-clients`) ni justifican configuraciones. Parece contenido estático sin contexto de producción.
  - Evidence: `require('redis')`, `ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE` sin advertencia de memoria/timeout.
  - How: Añadir `package.json` y `pom.xml` con versiones actuales, notas de compatibilidad y advertencias sobre `MAX_VALUE` retries.
  - Effort: Medium.
  - Source: 03-content-quality-audit.

- [ ] **[MEDIUM] [HUMANIZATION] Eliminar oraciones que empiezan con definición de diccionario y tokens de código al final de oraciones**
  - Why: `Overview` empieza con "Idempotency means..." y `Explanation` con "A message is idempotent when...". Son aperturas genéricas. Hay oraciones que terminan con tokens como `paymentId`.
  - Evidence: `top_ai_sentences` incluye ambas aperturas con >0.85 de probabilidad IA. `grep '\`[a-zA-Z0-9_]+\`\.'` encuentra 1 caso en EN y 2 en ES.
  - How: Reescribir `Overview` para empezar con un problema real (ej: duplicado de cargo). Reescribir oraciones que terminan en código para que el punto vaya después de contexto, no del token.
  - Effort: Low.
  - Source: 04-humanization-audit.

- [ ] **[MEDIUM] [SEO] Refrescar `lastUpdated` al día de la última edición real**
  - Why: La fecha está en 2026-08-19; si se realiza la mejora, debe actualizarse.
  - Evidence: `lastUpdated: 2026-08-19` en ambos frontmatter.
  - How: Actualizar a la fecha de edición real.
  - Effort: Very Low.
  - Source: 02-seo-audit.

### LOW

- [ ] **[LOW] [CONTENT] Aumentar variedad de estructura de FAQ y reducir "How do I" / "How" predominante**
  - Why: El FAQ EN tiene 5 preguntas; 4 empiezan con "How" / "What". La variedad mejora GEO y reduce patrón IA.
  - Evidence: FAQ questions: "What's the difference...", "Can I achieve...", "How long...", "What makes...", "How do I handle...", "What is the overhead...".
  - How: Convertir 1-2 preguntas a "Why..." o "When...".
  - Effort: Low.
  - Source: 06-geo-audit.

- [ ] **[LOW] [HUMANIZATION] Añadir em dash o variación de conectores para bajar tono robótico**
  - Why: El detector no marca em dash; la prosa es directa pero puede sonar plana.
  - Evidence: 1 em dash en prosa.
  - How: Introducir 1-2 em dash en advertencias o trade-offs si encaja con la voz.
  - Effort: Low.
  - Source: 04-humanization-audit.

---

## 3. Definition of Done

### Frontmatter y SEO

- [ ] `title` < 60 caracteres e igual al H1 renderizado.
- [ ] `description` 80-160 caracteres, gancho claro.
- [ ] `metaDescription` 120-160 caracteres, coincide con `seo.metaDescription`.
- [ ] `relatedResources` 2-6, distintos tipos, mismo orden EN/ES, sin barra final.
- [ ] `topics` y `tags` relevantes y dentro de enums.
- [ ] `lastUpdated` actualizado a la fecha de la última edición real.
- [ ] H1 único e igual al `title`.
- [ ] Jerarquía H2 → H3 sin saltos.

### Body y contenido

- [ ] Body prosa ≥ 1.300 palabras en EN y ES.
- [ ] `Overview` empieza con problema real, no con definición.
- [ ] `When to Use` con 4-6 situaciones concretas y al menos una donde NO aplica.
- [ ] `Solution` con ejemplos listos para copiar y versiones actualizadas.
- [ ] `Explanation` explica trade-offs, instalación, ciclo de vida y particiones cruzadas.
- [ ] `Variants` con comparativa/alternativas modernas.
- [ ] `Best Practices` y `Common Mistakes` específicas del dominio con soluciones.
- [ ] `FAQ` con 3-8 preguntas reales, respuestas con enlaces a fuentes.
- [ ] `See Also` / `Further Reading` con enlaces oficiales.

### Humanización

- [ ] `model_ai_pct` EN < 40 % y ES < 40 %.
- [ ] Tono en primera persona con trade-offs y advertencias reales.
- [ ] Sin aperturas tipo definición de diccionario.
- [ ] Sin frases patrón ni oraciones genéricas.
- [ ] Sin oraciones que terminen en tokens de código aislados.

### Paridad EN/ES

- [ ] Misma estructura de secciones y orden.
- [ ] Metadatos traducidos con longitudes correctas.
- [ ] Código y ejemplos equivalentes.
- [ ] `relatedResources` y `lastUpdated` coincidentes.

### Medios visuales y companion

- [ ] Diagrama Mermaid añadido y SVGs renderizados.
- [ ] `/lightbox.js` presente si hay diagramas.
- [ ] Sin overflow horizontal en móvil (estructural).
- [ ] Companion repo creado con `meta.json`, archivos y README EN/ES.

### Validación técnica

- [ ] `npm run content:quality` → 0 errores, 0 warnings.
- [ ] `npm run content:links` → 0 rotos.
- [ ] `npm run content:validate` → 0 errores, 0 advertencias.
- [ ] `npm run check` → 0 errores, 0 warnings.
- [ ] `npm run build` → 3.260 páginas OK.
- [ ] `npm run sitemap` → 3.258 URLs.
- [ ] `npm run mermaid:render` → SVGs generados si se añade diagrama.

---

## 4. Top 5 acciones

1. **Expandir el body por encima de 1.300 palabras** (CRITICAL, effort High) — prioridad #1, desbloquea el resto de mejoras.
2. **Bajar AI score por debajo del 40 %** (CRITICAL, effort High) — reescribir en voz humana, añadir trade-offs y experiencia real.
3. **Añadir ejemplos consumer-side y casos de producción** (HIGH, effort High) — eleva information gain y confianza.
4. **Añadir enlaces internos y sección `See Also` con fuentes oficiales** (HIGH, effort Low) — mejora enlazado y E-E-A-T/GEO.
5. **Crear companion repo con ejemplos ejecutables** (MEDIUM, effort Medium) — convierte la receta en un recurso descargable.

---

## 5. Veredicto

El recurso `recipes/message-idempotency` tiene una estructura técnica sólida (SEO, frontmatter, build, schema) pero sufre de **thin content** (~707/755 palabras, bien por debajo del mínimo de 1.300) y **tono genérico con alto score IA** (47.6 % EN / 41.4 % ES). Los ejemplos son copy-pasteables, pero faltan enlaces internos, citas externas, profundidad explicativa, ejemplos consumer-side, diagramas y un companion repo descargable. Con una expansión substancial y humanización, puede pasar de `NEEDS IMPROVEMENT` 68/100 a un recurso competitivo en el cluster `messaging`/`distributed-systems`.

**Decisión: FIX-THEN-PROMOTE.**

---

## 6. Anexos

### 6.1 — Auditoría técnica (01)

|| Check | Resultado |
|---|---|---|
| Slug kebab-case único | ✅ `message-idempotency` |
| Ruta EN | ✅ `/recipes/message-idempotency/` |
| Ruta ES | ✅ `/es/recipes/message-idempotency/` |
| `public/sitemap.xml` | ✅ Presente con `lastmod=2026-08-19`, hreflang `en/es/x-default` |
| Canonical EN | ✅ `https://stackpractices.com/recipes/message-idempotency/` |
| Canonical ES | ✅ `https://stackpractices.com/es/recipes/message-idempotency/` |
| Structured data | ✅ `WebPage`, `TechArticle`, `BreadcrumbList`, `FAQPage` |
| Open Graph | ✅ `og:title`, `og:description`, `og:url`, `og:locale`, `og:image` |
| Build | ✅ 3.260 páginas |
| Mermaid | ✅ No hay bloques Mermaid; no aplica |
| Mobile structural | ✅ viewport, CSS responsive, no width fijo > 375px (sin diagramas) |
| Performance | 🔧 NOT VERIFIED (sin datos CWV) |

`PUNTAJE TÉCNICO: 10/10`

### 6.2 — Auditoría SEO (02)

|| Campo | EN | ES | OK |
|---|---|---|---|---|
| `title` | 30 chars | 41 chars | ✅ |
| `description` | 110 chars | 132 chars | ✅ |
| `metaDescription` | 149 chars | 156 chars | ✅ |
| `metaDescription` = `seo.metaDescription` | ✅ | ✅ | ✅ |
| `topics` | `messaging`, `architecture` | `messaging`, `architecture` | ✅ |
| `tags` | 6 | 6 | ✅ |
| `relatedResources` | 6 | 6, mismo orden | ✅ |
| `lastUpdated` | 2026-08-19 | 2026-08-19 | ✅ |
| Jerarquía H2 → H3 | 8/9/0 | 8/9/0 | ✅ |
| Enlaces internos en body | 0 | 0 | ⚠️ HIGH |
| `PUNTAJE SEO` | — | — | **11/15** |

### 6.3 — Auditoría de calidad de contenido (03)

|| Check | Resultado |
|---|---|---|
| Body prosa EN | ~707 palabras (mínimo 1.300) | ❌ CRITICAL |
| Body prosa ES | ~755 palabras (mínimo 1.300) | ❌ CRITICAL |
| Estructura esperada | Overview, When to Use, Solution, Explanation, Variants, Best Practices, Common Mistakes, FAQ | ✅ |
| Ejemplos concretos | Redis SET NX, PostgreSQL ON CONFLICT, Kafka producer | ✅ |
| Casos de producción / consumer-side | Ausente | ❌ HIGH |
| `PUNTAJE CALIDAD CONTENIDO` | — | **3/15** |

### 6.4 — Auditoría de humanización (04)

|| Check | EN | ES | OK |
|---|---|---|---|---|
| `model_ai_pct` | 47.6 % | 41.4 % | ❌ CRITICAL |
| `pattern_totals` | `{}` | `{}` | ✅ (sin patrones específicos) |
| Red words | 0 | 0 | ✅ |
| Aperturas genéricas de definición | presentes | presentes | ❌ HIGH |
| Primera persona en prosa | ausente | ausente | ❌ HIGH |
| Tokens de código al final de oraciones | 1 | 2 | ⚠️ MEDIUM |
| `PUNTAJE HUMANIZACIÓN` | — | — | **5/15** |

### 6.5 — Auditoría de paridad bilingüe (05)

|| Check | EN | ES | OK |
|---|---|---|---|---|
| H2 count | 8 | 8 | ✅ |
| H3 count | 9 | 9 | ✅ |
| Code blocks | 3 | 3 | ✅ |
| Frontmatter traducido | ✅ | ✅ | ✅ |
| Palabras prosa | ~707 | ~755 | ✅ (ES ligeramente más largo) |
| `relatedResources` / `lastUpdated` | ✅ | ✅ | ✅ |
| `PUNTAJE PARIDAD BILINGÜE` | — | — | **9/10** |

### 6.6 — Auditoría GEO / AI Search (06)

|| Check | Resultado |
|---|---|---|
| FAQPage schema | ✅ presente en build EN/ES |
| Entidades claras (Redis, Kafka, PostgreSQL, idempotency) | ✅ |
| Citas a fuentes primarias en body | ❌ 0 enlaces externos | ❌ HIGH |
| Pasajes extraíbles | Moderados, respuestas FAQ directas | ⚠️ MEDIUM |
| speakable schema | ✅ presente en `TechArticle` |
| `PUNTAJE GEO` | — | **3/5** |

### 6.7 — Auditoría de tráfico (08)

|| Check | Resultado |
|---|---|---|
| GSC / GA4 datos | 🔧 NOT VERIFIED (sin acceso) |
| Posicionamiento estimado | Medium: query "message idempotency" con demanda en arquitectura distribuida |
| Competencia | Alta (Kafka docs, AWS, Martin Kleppmann) |
| Diferenciación | Débil por thin content; necesita profundidad |
| `PUNTAJE TRÁFICO` | — | **5/10** |

### 6.8 — Auditoría de medios y companion (09)

|| Check | Resultado |
|---|---|---|
| Mermaid / SVGs | No hay; recomendado añadir 1 diagrama | ❌ MEDIUM |
| Imágenes | Ninguna | — |
| `lightbox.js` en HTML | Presente en build | ✅ |
| Companion repo | No existe | ❌ MEDIUM |
| Verificación móvil 375px | 🔧 NOT VERIFIED (sin navegador) |
| `PUNTAJE MEDIOS / COMPANION` | — | **0/5** |

### 6.9 — Outputs de detección de IA

- `ref/output/ai-detect-message-idempotency.json`:
  - EN: `model_ai_pct` 47.6 % (23 AI / 32 human / 60 total)
  - ES: `model_ai_pct` 41.4 % (17 AI / 40 human / 61 total)
- `ref/output/ai-detect-patterns-message-idempotency.json`: 0 findings
- `ref/output/ai-detect-patterns-message-idempotency-es.json`: 0 findings

### 6.10 — Validación técnica

| Comando | Resultado |
|---|---|
| `npm run content:quality` | ✅ 0 errores, 0 warnings |
| `npm run content:links` | ✅ 0 rotos |
| `npm run content:validate` | ✅ 0 errores, 0 warnings |
| `npm run check` | ✅ 0 errores, 0 warnings, 3 hints preexistentes |
| `npm run build` | ✅ 3.260 páginas |
| `npm run sitemap` | ✅ 3.258 URLs |
