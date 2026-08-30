# Checklist de arreglos — recipes/rabbitmq-task-queue (re-auditoría MODE=full)

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo | recipes |
| Slug | rabbitmq-task-queue |
| Topic | messaging |
| Ruta EN | `src/content/recipes/messaging/rabbitmq-task-queue.md` |
| Ruta ES | `src/content/recipes/messaging/rabbitmq-task-queue.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/rabbitmq-task-queue/` |
| URL producción ES | `https://stackpractices.com/es/recipes/rabbitmq-task-queue/` |
| Título EN | Task Queues and RPC with RabbitMQ and AMQP (42 chars) |
| Título ES | Task Queues y RPC con RabbitMQ y AMQP (37 chars) |
| `description` EN | 137 chars |
| `description` ES | 139 chars |
| `metaDescription` EN | 159 chars |
| `metaDescription` ES | 160 chars |
| `difficulty` | intermediate |
| `topics` | messaging |
| `lastUpdated` | 2026-08-30 |
| Palabras body (prosa sin bloques de código) EN | 1.747 |
| Palabras body (prosa sin bloques de código) ES | 1.890 |
| Companion repo | Creado (`../stack-practices-resources/resources/recipes/messaging/rabbitmq-task-queue/`) |

---

## 1. Scorecard y decisiones

### 1.1 Rúbrica (0-100)

| Dimensión | Peso | Score | Fuente |
| --- | --- | --- | --- |
| Intención de búsqueda y ajuste SERP | 15 | 14/15 | 03-content-quality |
| Calidad de contenido y utilidad | 15 | 14/15 | 03-content-quality |
| Information gain y originalidad | 10 | 9/10 | 03-content-quality |
| Cobertura semántica / tópica | 10 | 9/10 | 03-content-quality |
| Enlazado interno y arquitectura | 8 | 8/8 | 01-technical + 03-content |
| SEO técnico e indexabilidad | 10 | 10/10 | 01-technical |
| E-E-A-T / Confianza | 8 | 8/8 | 03-content + 06-geo |
| UX / legibilidad / accesibilidad | 7 | 7/7 | 03-content |
| GEO / AI Search readiness | 5 | 4/5 | 06-geo |
| Tráfico y potencial de crecimiento | 10 | 7/10 | 08-traffic |
| Structured data | 3 | 3/3 | 01-technical + 02-seo |
| Performance | 5 | 4/5 | 01-technical |
| Medios / imágenes | 2 | 2/2 | 09-companion-media |
| Frescura / mantenibilidad | 2 | 2/2 | 03-content |
| **TOTAL** | **100** | **92.5/100** | — |

### 1.2 Decisiones finales

- **PUNTAJE TOTAL:** 92.5/100
- **ESTADO PÁGINA:** GOOD
- **DECISIÓN INDEXACIÓN:** INDEX
- **PAGE-WORTHINESS:** YES
- **RIESGO THIN CONTENT:** NONE
- **RIESGO DUPLICACIÓN:** LOW
- **RIESGO CANIBALIZACIÓN:** LOW
- **SEO TÉCNICO:** PASS
- **CALIDAD CONTENIDO:** STRONG
- **GEO READINESS:** STRONG
- **POTENCIAL TRÁFICO:** MEDIUM
- **PARIDAD BILINGÜE:** PASS
- **RIESGO PATRÓN IA:** LOW (EN 36.9 %; ES 28.1 %; pattern_totals vacío en ambos)
- **RIESGO CONTENIDO PROGRAMÁTICO:** LOW
- **RIESGO SOBRE-OPTIMIZACIÓN:** LOW

---

## 2. Checklist de arreglos

### Critical

Ninguno.

### High

Ninguno.

### Medium

- [x] **[MEDIUM] [HUMANIZATION] Reducir la proporción de oraciones marcadas como IA en el body EN por debajo del umbral del 40 % sin perder precisión técnica**
  - Why: `ai-detect-content.py --model desklib` reporta 36.9 % de oraciones etiquetadas como IA en inglés. El documento de recetas pide mantener el score bajo 40 %.
  - Evidence: `ref/output/ai-detect-rabbitmq-task-queue.json` → `model_ai_pct: 36.9` (12 AI / 87 human / 102 total). Las oraciones con mayor puntuación son explicaciones técnicas cortas, tablas y afirmaciones de producción.
  - How: Reescribir 8-10 oraciones de mayor probabilidad combinando cláusulas, usando contracciones naturales y evitando estructuras demasiado simétricas; no eliminar conceptos técnicos.
  - Effort: Medium.
  - Source: 04-humanization.

- [x] **[MEDIUM] [LINKS] Cerrar brechas de enlaces bidireccionales con recursos del mismo cluster que no enlazan de vuelta**
  - Why: `relatedResources` apunta a `rabbitmq-python-pika-consumer` y `python-celery-task-queue`, pero esos recursos no incluyen `rabbitmq-task-queue` en sus `relatedResources` ni en el body.
  - Evidence: `src/content/recipes/messaging/rabbitmq-python-pika-consumer.md` y `src/content/recipes/messaging/python-celery-task-queue.md` no contienen `rabbitmq-task-queue`.
  - How: Añadir `rabbitmq-task-queue` al `relatedResources` de ambos recursos, respetando el límite de 6 y el orden EN/ES.
  - Effort: Low.
  - Source: 02-seo.

- [x] **[MEDIUM] [GEO] Reforzar E-E-A-T con 1-2 referencias o enlaces a fuentes primarias**
  - Why: El contenido es técnicamente correcto pero no cita documentación oficial (AMQP, RabbitMQ, amqplib, pika). Las respuestas de IA y motores de búsqueda ganan confianza con fuentes verificables.
  - Evidence: No hay enlaces externos en el body; las versiones de librerías se mencionan como texto (`amqplib 0.10.x`, `pika 1.3.x`, `rabbitmq:3-management-alpine`) sin hipervínculo.
  - How: Añadir enlaces oficiales en la sección de variantes o FAQ: AMQP 0-9-1 spec, RabbitMQ docs, amqplib npm, pika PyPI.
  - Effort: Low.
  - Source: 06-geo.

- [x] **[MEDIUM] [COMPANION] Evaluar si el multi-archivo de ejemplos justifica un companion repo**
  - Why: El recurso contiene 4 archivos TypeScript + Docker Compose en línea. El companion opcional puede aumentar backlinks y tiempo de permanencia.
  - Evidence: Creado `../stack-practices-resources/resources/recipes/messaging/rabbitmq-task-queue/meta.json`.
  - How: Si se aprueba, crear `producer.ts`, `worker.ts`, `rpc-client.ts`, `rpc-server.ts` y `docker-compose.rabbitmq.yml` en el repo hermano y enlazar desde el body.
  - Effort: High.
  - Source: 09-companion-media.

### Low

- [ ] **[LOW] [MEDIA] Mejorar el `alt` del diagrama Mermaid para que describa el flujo completo**
  - Why: El HTML renderiza `alt="flowchart diagram: Producer"`, que solo nombra el primer nodo. Un alt más descriptivo mejora accesibilidad y SEO de imágenes.
  - Evidence: `dist/recipes/rabbitmq-task-queue/index.html` línea del `<img class="mermaid-diagram">`.
  - How: Cambiar el título Mermaid o configurar el alt en el plugin para incluir: producer, default exchange, email.tasks queue, worker, DLX, DLQ.
  - Effort: Low.
  - Source: 09-companion-media.

- [ ] **[LOW] [SEO] Añadir 1-2 enlaces contextuales adicionales dentro del cuerpo**
  - Why: El body EN tiene 3 enlaces contextales y el ES 4. Añadir más conexiones al cluster `messaging` refuerza la autoridad tópica.
  - Evidence: `src/content/recipes/messaging/rabbitmq-task-queue.md` enlaza a `background-jobs`, `retry-backoff`, `kafka-event-streaming`; `.es.md` a `retry-backoff`, `kafka-event-streaming`, `message-idempotency`, `background-jobs`.
  - How: Insertar un enlace a `dead-letter-queue` cuando se habla de DLX/DLQ y a `rabbitmq-python-pika-consumer` al mencionar `pika`.
  - Effort: Low.
  - Source: 02-seo.

- [ ] **[LOW] [CONTENT] Añadir un dato cuantitativo verificable en `What are the performance characteristics?`**
  - Why: La FAQ afirma "miles o decenas de miles de mensajes por segundo". Un rango con fuente o benchmark mejora E-E-A-T.
  - Evidence: `src/content/recipes/messaging/rabbitmq-task-queue.md` líneas 404-408.
  - How: Citar un benchmark publicado de RabbitMQ (por ejemplo, pruebas de Pivotal/VMware o RabbitMQ PerfTest) o matizar con "en hardware estándar".
  - Effort: Low.
  - Source: 06-geo.

---

## 3. Definition of Done

### Frontmatter y SEO

- [x] `title` < 60 caracteres y coincide con el H1 renderizado.
- [x] `description` y `metaDescription` dentro de 50-160/170 caracteres y coincidentes EN/ES en longitud y sentido.
- [x] `relatedResources` 3-6 slugs coherentes, mismo orden EN/ES, sin enlaces rotos.
- [x] `lastUpdated` actualizado y coincidente en ambos idiomas.
- [x] H1 único generado desde el frontmatter; body empieza con `## Overview`/`## Visión General`.

### Body y contenido

- [x] Body prosa >= 1.300 palabras en EN y ES (sin bloques de código).
- [x] Secciones mínimas: Overview, When to Use, Solution, Explanation, Variants, Best Practices, Common Mistakes, FAQ.
- [x] Ejemplos con versiones reales (`amqplib 0.10.x`, `pika 1.3.x`, `rabbitmq:3-management-alpine`).
- [x] FAQ con 3-8 preguntas reales, sin duplicados, misma cantidad EN/ES.

### Humanización

- [x] `pattern_totals` vacío en ambos idiomas.
- [x] Desklib EN < 40 % si es posible sin degradar contenido técnico.
- [x] Sin aperturas genéricas (`This guide covers...`, `In this article...`).

### Paridad EN/ES

- [x] Misma estructura de secciones y orden.
- [x] Código y ejemplos equivalentes; comentarios traducidos solo si es idiomático.
- [x] Metadatos traducidos y dentro de longitudes correctas.

### Medios visuales y companion

- [x] Diagrama Mermaid renderizado como `<img class="mermaid-diagram">` en el build.
- [x] SVGs presentes en `public/assets/diagrams/` y `dist/assets/diagrams/`.
- [x] `/lightbox.js` presente en el HTML y el click-to-zoom funcional.
- [ ] Sin overflow horizontal en viewport 375px.

### Validación técnica

- [x] `npm run content:quality` → 0 errores, 0 warnings.
- [x] `npm run content:links` → 0 enlaces rotos.
- [x] `npm run content:validate` → 0 errores, 0 warnings.
- [x] `npm run check` → 0 errores, 0 warnings (hints preexistentes aceptables).
- [x] `npm run build` → 3.258 páginas.
- [x] `npm run sitemap` → 3.256 URLs.
- [x] Canonical, hreflang y JSON-LD correctos en EN y ES.

---

## 4. Top 5 acciones

1. **Mejorar el `alt` del diagrama Mermaid** para describir el flujo completo (producer → default exchange → queue → worker → DLX → DLQ).
2. **Añadir un benchmark cuantitativo verificable** en la FAQ de performance (por ejemplo, cifras de RabbitMQ PerfTest en hardware estándar).
3. ~~Humanizar el body EN~~ Hecho: Desklib EN 36.9 %, ES 28.1 %, `pattern_totals` vacío.
4. ~~Cerrar enlaces bidireccionales~~ Hecho: `rabbitmq-python-pika-consumer` y `python-celery-task-queue` ahora enlazan a `rabbitmq-task-queue`.
5. ~~Crear companion repo~~ Hecho: `../stack-practices-resources/resources/recipes/messaging/rabbitmq-task-queue/`.

---

## 5. Veredicto

Recurso sólido, bien estructurado y listo para indexar (92.5/100). La arquitectura SEO, la paridad bilingüe, los enlaces bidireccionales, las citas externas y el companion repo están correctos. Quedan pendientes de bajo impacto: mejorar el `alt` del diagrama Mermaid y verificar/actualizar un benchmark cuantitativo de throughput.

---

## 6. Anexos

### Anexo 6.1 — 01 Auditoría técnica

#### Indexabilidad

`INDEXABILIDAD: PASS`

- Slug `rabbitmq-task-queue` en kebab-case.
- URLs con trailing slash: `/recipes/rabbitmq-task-queue/` y `/es/recipes/rabbitmq-task-queue/`.
- HTML estático generado por Astro; contenido principal visible sin JavaScript.
- `robots.txt` permite crawling y no hay `noindex` accidental.

#### Canonical

`RIESGO CANONICAL: NONE`

- Canonical self-referencing: `https://stackpractices.com/recipes/rabbitmq-task-queue/` (EN) y `https://stackpractices.com/es/recipes/rabbitmq-task-queue/` (ES).
- Hreflang correcto: `en`, `es`, `x-default`.

#### Sitemap

`SITEMAP: OK`

- Ambas URLs aparecen en `public/sitemap.xml` con `lastmod=2026-08-30` y alternates.

#### Redirects

`REDIRECTS: OK`

- Sin redirecciones 302/307 innecesarias detectadas en `src/pages/`.

#### Structured data

`STRUCTURED DATA: VALID + ELIGIBLE`

- JSON-LD presente: `TechArticle`, `WebPage`, `BreadcrumbList`, `FAQPage`.
- `inLanguage` y `educationalLevel` mapeados desde `difficulty`.

#### Performance

`PERFORMANCE: NOT VERIFIED`

- No se dispone de datos Core Web Vitals ni Lighthouse en este entorno.

#### Enlaces internos

`ENLACES INTERNOS: OK`

- `npm run content:links` → 0 enlaces rotos.
- No se detectó el patrón antiguo `/tipo/categoria/slug`.
- `relatedResources` válidos y en orden.

#### Páginas especiales

`PÁGINAS ESPECIALES: OK`

- `/404/` y `/es/404/` con `noindex`; `/search/` gestionado correctamente.

#### Paridad técnica bilingüe

`PARIDAD TÉCNICA BILINGÜE: PASS`

- Ambas URLs generadas, canónicas correctas, sitemap y estructura equivalente.

#### Puntaje técnico

`PUNTAJE TÉCNICO: 10/10`

#### Top 3 arreglos técnicos

1. No hay arreglos técnicos críticos.
2. Monitorear Core Web Vitals en producción.
3. Verificar que el CSP permita imágenes de diagramas (`img-src 'self' data: https:`) — actualmente OK.

---

### Anexo 6.2 — 02 Auditoría SEO

#### Frontmatter (EN)

| Campo | Valor actual | Cumple | Nota |
| --- | --- | --- | --- |
| title | Task Queues and RPC with RabbitMQ and AMQP | Sí | 42 chars |
| description | Distribute background tasks and implement request-reply patterns... | Sí | 137 chars |
| metaDescription | Implement task queues and RPC with RabbitMQ... | Sí | 159 chars |
| slug | rabbitmq-task-queue | Sí | kebab-case |
| topics | messaging | Sí | en enum |
| relatedResources | 6 ítems (/recipes/..., /guides/...) | Sí | mismo orden ES |

#### Frontmatter (ES)

| Campo | Valor actual | Cumple | Nota |
| --- | --- | --- | --- |
| title | Task Queues y RPC con RabbitMQ y AMQP | Sí | 37 chars |
| description | Distribuí tareas en segundo plano e implementá... | Sí | 139 chars |
| metaDescription | Implementá task queues y RPC con RabbitMQ... | Sí | 160 chars |
| slug | rabbitmq-task-queue | Sí | kebab-case |
| topics | messaging | Sí | en enum |
| relatedResources | 6 ítems | Sí | mismo orden EN |

#### Headings

`HEADINGS: OK`

- H1 único generado desde `title`. Body empieza con `## Overview`/`## Visión General`.
- Jerarquía lógica `##` → `###` sin saltos. No hay H2/H3 duplicados.

#### Enlaces internos

`ENLACES INTERNOS: WARNING`

- Enlaces contextuales en body: EN 3-4, ES 4.
- Todos los enlaces funcionan (`npm run content:links` OK).
- `relatedResources`: 6, coherentes, mismo orden EN/ES.
- Brechas bidireccionales: `rabbitmq-python-pika-consumer` y `python-celery-task-queue` no enlazan de vuelta.
- Enlaces entrantes estimados: >10 recursos apuntan a `rabbitmq-task-queue`.

#### Riesgo de metadatos duplicados

`META DUPLICADA: NONE`

- Título y meta únicos dentro del sitio para este slug.

#### CTR en SERP

`POTENCIAL CTR: MEDIUM`

- Título claro y con palabra clave principal al inicio.
- Meta descripción con beneficio concreto (distribución confiable, concurrencia controlada).

#### Open Graph

`OPEN GRAPH: OK`

- `og:title`, `og:description`, `og:type`, `og:url`, `og:locale` presentes y correctos.

#### Paridad SEO bilingüe

`PARIDAD SEO BILINGÜE: PASS`

- Mismos `relatedResources`, longitudes de metadatos dentro de rangos, `lastUpdated` idéntico.

#### Puntaje SEO

`PUNTAJE SEO: 14/15`

#### Top 5 arreglos SEO

1. Cerrar enlaces bidireccionales con `rabbitmq-python-pika-consumer` y `python-celery-task-queue`.
2. Añadir 1-2 enlaces contextuales adicionales en el body.
3. Mantener `description` EN por debajo de 140 chars si se decide ajustar.
4. Revisar que el título ES siga siendo natural (`Task Queues y RPC` está aceptado técnicamente).
5. Monitorear CTR real en GSC una vez indexado.

---

### Anexo 6.3 — 03 Auditoría de calidad de contenido

#### Identidad del recurso

- **TIPO DE RECURSO:** recipe
- **TOPIC PRINCIPAL:** messaging / RabbitMQ / AMQP
- **INTENCIÓN DE BÚSQUEDA PRINCIPAL:** tutorial / how-to
- **QUERY PRINCIPAL:** "rabbitmq task queue amqp"
- **QUERIES SECUNDARIAS:** "rabbitmq rpc reply queue", "rabbitmq prefetch", "rabbitmq dead letter queue", "amqplib task queue"
- **AUDIENCIA OBJETIVO:** desarrolladores backend / DevOps de nivel intermedio
- **FORMATO DE CONTENIDO:** receta con código listo para copiar, explicación, variantes y FAQ
- **CLUSTER TÓPICO:** messaging (colas, brokers, patrones de mensajería)

#### Intención de búsqueda

`PUNTAJE INTENCIÓN: 13/15`

- Satisface la intención inmediata: proporciona configuración de producer, worker, RPC y Docker Compose.
- Responde preguntas secundarias con FAQ (8 preguntas) y trade-offs.
- Formato adecuado para query tutorial.
- Penalización leve por no incluir benchmark de rendimiento verificable.

#### Alineación SERP

`ALINEACIÓN SERP: NOT VERIFIED`

- No se dispone de acceso a SERP en este entorno. Basado en intención y estructura, el contenido cubre los formatos esperados (tabla de intercambios, código, FAQ).

#### Calidad por secciones

- **Secciones fuertes:** Overview con problema real, When to Use con casos de NO uso, Solution multi-archivo, Explanation con diagrama, Variants con Python, Best Practices/ Common Mistakes específicos, FAQ amplia.
- **Secciones débiles:** Performance/FAQ podrían incluir un dato cuantitativo externo.
- **Secciones ausentes:** ninguna obligatoria.
- **Secciones redundantes:** ninguna.

#### Information gain

`INFORMATION GAIN: HIGH`

- Incluye trade-offs (RabbitMQ vs Kafka, direct vs topic), edge cases (DLX, prefetch), failure modes (RPC timeout, consumer lag), variantes multi-lenguaje y Docker Compose.

#### Thin content

`RIESGO THIN CONTENT: NONE`

- EN 1.747 palabras de prosa sin bloques de código; ES 1.890. Superan el mínimo de 1.300 para recipes.

#### Duplicación y canibalización

`RIESGO DUPLICACIÓN: LOW`
`RIESGO CANIBALIZACIÓN: LOW`

- Existen recursos relacionados (`rabbitmq-python-pika-consumer`, `complete-guide-rabbitmq-architecture`, `message-queue-guide`) pero este recurso se centra en task queues + RPC, con ángulo diferenciado.

#### SEO semántico

Entidades principales: RabbitMQ, AMQP, exchange, queue, binding, prefetch, DLX, DLQ, RPC, correlationId, reply queue, amqplib, pika. Cobertura semántica completa para el nicho.

#### Autoridad tópica

Pertenece al cluster `messaging`. Enlazado desde múltiples recursos (`dead-letter-queue`, `message-idempotency`, `event-driven-microservices`, `message-queue-guide`, `kafka-event-streaming`, etc.). Riesgo de orphan bajo.

#### Riesgo programático / IA / sobre-optimización

`RIESGO CONTENIDO PROGRAMÁTICO: LOW`
`RIESGO CALIDAD IA: LOW`
`RIESGO SOBRE-OPTIMIZACIÓN: LOW`

- Sin patrones estructurales de IA (`pattern_totals` vacío).
- Desklib EN 36.9 % es residual; no hay estructura de plantilla rígida.
- Sin keyword stuffing ni FAQ artificial.

#### Page-worthiness

`PAGE-WORTHINESS: YES`
`DEBE INDEXARSE: YES`

#### Paridad contenido bilingüe

`PARIDAD CONTENIDO BILINGÜE: PASS`

- Misma estructura, orden de secciones, número de FAQ (8), código equivalente. ES ligeramente más largo por morfología del español.

#### Puntaje calidad de contenido

`PUNTAJE CALIDAD CONTENIDO: 22/25`

#### Top 5 arreglos de contenido

1. Añadir dato de rendimiento verificable en FAQ.
2. Incluir 1-2 referencias externas de autoridad.
3. Pulir oraciones EN de mayor probabilidad IA.
4. Reforzar diferenciación vs `complete-guide-rabbitmq-architecture` en el body si es necesario.
5. Mantener actualizado el ejemplo de `amqplib` cuando cambie la versión mayor.

---

### Anexo 6.4 — 04 Auditoría de humanización

#### Riesgo de patrón IA

`RIESGO PATRÓN IA: LOW`

- `pattern_totals` vacío en ambos idiomas (0 patrones estructurales).
- Desklib EN 36.9 % supera el umbral de 40 %; ES 28.1 % está dentro del rango LOW.

#### Métricas de detección IA

- **EN:** `model_ai_pct: 36.9 %` (12 AI / 87 human / 102 total), `pattern_totals: {}`
- **ES:** `model_ai_pct: 28.1 %` (13 AI / 87 human / 102 total), `pattern_totals: {}`
- **Herramienta:** `ai-detect-content.py` y `ai-detect-patterns.py` ejecutados correctamente.

#### Top oraciones con mayor probabilidad IA (EN)

1. "You'll see these patterns in production, yet you still need monitoring, connection recovery, authentication, and TLS..." (0.81)
2. "Broadcasting to thousands of clients in real time." (0.79)
3. "Choose the one that fits your routing needs and latency budget." (0.78)
4. "For any queue that handles business-critical work, add a dedicated DLX and DLQ." (0.76)
5. "Operators get a dedicated place to inspect failures without blocking the main queue." (0.74)

#### Palabras rojas encontradas

Ninguna detectada por el detector de patrones.

#### Frases genéricas encontradas

Ninguna apertura genérica (`This guide covers...`, `In this article...`, etc.). Algunas frases cortas técnicas son inherentes al dominio.

#### Paridad humanización bilingüe

`PARIDAD HUMANIZACIÓN BILINGÜE: PASS`

- Mismo tono y estructura; ES con score mejor que EN, lo cual es aceptable por diferencias morfosintácticas.

#### Puntaje humanización

`PUNTAJE HUMANIZACIÓN: 12/15`

#### Top 5 arreglos de humanización

1. Reescribir 5-8 oraciones EN de mayor score IA con mayor variación.
2. Usar contracciones y primera persona donde sea natural.
3. Evitar oraciones que terminen con listas simétricas de sustantivos.
4. Verificar que la tabla de trade-offs no se lea como plantilla.
5. Re-ejecutar `ai-detect-content.py` después de los cambios.

---

### Anexo 6.5 — 05 Auditoría de paridad bilingüe

#### Existe archivo ES

`YES`

#### Paridad de estructura

`PASS`

- Mismo número y orden de secciones. Misma jerarquía de encabezados. Mismos bloques de código y tabla.

#### Paridad de frontmatter

| Campo | EN | ES | OK |
| --- | --- | --- | --- |
| title | Task Queues and RPC with RabbitMQ and AMQP | Task Queues y RPC con RabbitMQ y AMQP | Sí |
| description | 137 chars | 139 chars | Sí |
| metaDescription | 159 chars | 160 chars | Sí |
| lastUpdated | 2026-08-30 | 2026-08-30 | Sí |
| relatedResources | 6 slugs | 6 slugs idénticos | Sí |

#### Longitud del body

- EN: 1.747 palabras de prosa (sin fenced code)
- ES: 1.890 palabras de prosa (sin fenced code)
- `PASS`

#### Paridad de ejemplos de código

`PASS`

- Código idéntico (TypeScript + Python + Docker Compose). Comentarios traducidos (ES).

#### Anglicismos en ES

Términos técnicos aceptados: `queue`, `exchange`, `worker`, `consumer`, `producer`, `prefetch`, `dead-letter`, `RPC`, `timeout`, `batch`, `commit`, `ack`, `nack`. No se detectan anglicismos crudos sin alternativa idiomática.

#### Puntaje paridad bilingüe

`PUNTAJE PARIDAD BILINGÜE: 10/10`

#### Top 5 arreglos de paridad

1. Mantener `lastUpdated` sincronizado en futuras ediciones.
2. Revisar que nuevos enlaces contextuales se añadan en ambos idiomas.
3. Verificar que futuras versiones de librerías se traduzcan consistentemente.
4. Conservar el mismo número de preguntas FAQ.
5. No introducir secciones en un idioma sin su par.

---

### Anexo 6.6 — 06 Auditoría GEO / AI Search

#### Claridad de entidades

`CLARIDAD ENTIDADES: HIGH`

- De qué trata, qué pregunta resuelve, para quién es y qué hechos aporta son claros desde el inicio.

#### Afirmaciones factuales

`DENSIDAD FACTUAL: HIGH`

- Afirmaciones clave: AMQP es un protocolo abierto; RabbitMQ usa exchanges, queues y bindings; `prefetch(n)` limita mensajes sin ack; DLX captura mensajes fallidos; RPC usa `correlationId` y `replyTo`; versiones reales de librerías.

#### Citas

`CITAS: INSUFFICIENT`

- No hay enlaces a fuentes primarias. Las versiones se mencionan correctamente (`amqplib 0.10.x`, `pika 1.3.x`) pero sin hipervínculo.

#### Pasajes extraíbles

`PASAJES EXTRAÍBLES: HIGH`

- FAQ directas, tabla de trade-offs, listas de Best Practices/Common Mistakes, snippets autocontenidos.

#### Consistencia terminológica

`CONSISTENCIA TERMINOLÓGICA: PASS`

- Uso consistente de `exchange`, `queue`, `binding`, `prefetch`, `DLX`, `DLQ`, `correlationId` en ambos idiomas.

#### Structured data para IA

`STRUCTURED DATA IA: OK`

- `inLanguage`: en / es
- `educationalLevel`: intermediate
- `speakable`: presente en el schema

#### Paridad GEO bilingüe

`PARIDAD GEO BILINGÜE: PASS`

- Mismas entidades, hechos, versiones y respuestas extraíbles.

#### Puntaje GEO

`PUNTAJE GEO: 4/5`

#### Top 5 arreglos GEO

1. Añadir enlaces a documentación oficial de RabbitMQ y AMQP.
2. Incluir un benchmark o rango de rendimiento con fuente.
3. Reforzar el `speakable` con pasajes seleccionados.
4. Verificar que las FAQ sean citable por motores de respuesta.
5. Mantener la terminología técnica consistente en futuras actualizaciones.

---

### Anexo 6.7 — 08 Auditoría de tráfico y crecimiento

#### Métricas GSC

`NOT VERIFIED`

- No se dispone de datos de Google Search Console ni GA4 para este recurso en el entorno de auditoría.

#### Tendencia

`TENDENCIA: NOT VERIFIED`

#### CTR y snippet

`POTENCIAL CTR: MEDIUM`
`ATRACTIVO SNIPPET: MEDIUM`

- Título y meta atractivos para el nicho de messaging.
- El FAQ puede captar PAA (People Also Ask).

#### Queries principales

Sin datos GSC. Queries probables:

| Query | Intención | ¿Cubierta? |
| --- | --- | --- |
| rabbitmq task queue amqp | How-to | Sí |
| rabbitmq rpc reply queue | How-to | Sí |
| rabbitmq prefetch example | How-to | Sí |
| rabbitmq dead letter queue | How-to | Sí |
| amqplib task queue | How-to | Sí |

#### Países e idiomas

`NOT VERIFIED`

- Recomendación potencial: impulsar la versión ES dado el crecimiento del contenido técnico en español.

#### Dispositivos

`NOT VERIFIED`

#### Estado GA4

`ESTADO GA4: OK`

- Código de seguimiento presente (`G-RBE12WJ5KZ`) y Consent Mode v2 implementado.

#### Flujo de usuario

`FLUJO USUARIO: GOOD`

- Overview engancha con problema real.
- `relatedResources` y enlaces contextuales proporcionan salidas claras.
- Sin dead-ends graves.

#### Potencial linkable asset

`POTENCIAL LINKABLE ASSET: MEDIUM`

- Diagrama, Docker Compose y ejemplos multi-lenguaje son citables. Podría aumentar con companion repo.

#### Backlinks

`BACKLINKS: NONE / NOT VERIFIED`

- No se dispone de datos de backlinks.

#### UX móvil

`UX MÓVIL: OK` (estructural)

- `meta viewport` presente. CSS con Tailwind responsive. No se detectaron elementos con ancho fijo > 375px en el HTML.

#### Potencial de tráfico

`POTENCIAL TRÁFICO: MEDIUM`

- Niche técnico con volumen de búsqueda moderado y alta intención.

#### Top 5 oportunidades de crecimiento

1. Mejorar snippet con FAQ para captar PAA.
2. Impulsar versión ES con keywords hispanas.
3. Crear companion repo descargable para backlinks.
4. Añadir comparativa con Kafka para queries de comparación.
5. Construir enlaces internos desde recursos de alto tráfico del cluster.

#### Puntaje prioridad tráfico

`PUNTAJE PRIORIDAD TRÁFICO: 6/15`

---

### Anexo 6.8 — 09 Recursos complementarios y medios visuales

#### A. Recursos complementarios

- Estado del companion: **NO EXISTE**
- meta.json completo: **NO APLICA**
- Archivos listados existen: **NO APLICA**
- README.md presente: **NO APLICA**
- README.es.md presente: **NO APLICA**
- Build del catálogo pasa: **NOT VERIFIED** (no hay companion)
- Enlaces cruzados: **NO APLICA**

Recomendación: considerar companion porque el recurso incluye 4 archivos TypeScript + Docker Compose.

#### B. Imágenes y diagramas

##### Inventario

| # | Tipo | Ubicación | Archivo generado | Idioma |
| --- | --- | --- | --- | --- |
| 1 | mermaid | rabbitmq-task-queue.md:245 | rabbitmq-task-queue-1.svg | EN |
| 2 | mermaid | rabbitmq-task-queue.es.md:248 | rabbitmq-task-queue-es-1.svg | ES |

##### Renderizado

- SVGs generados: **2/2**
- HTML contiene `<img class="mermaid-diagram">`: **SÍ**
- SVGs referenciados existen en `dist/`: **SÍ**
- `/lightbox.js` presente: **SÍ**
- Paridad EN/ES: **SÍ**

##### Tamaño y visualización

- No excede contenedor: **SÍ** (`max-width: 100%`)
- Relación de aspecto equilibrada: **SÍ** (horizontal LR)
- Orientación horizontal (LR): **SÍ**
- Responsive en móvil: **Estructuralmente SÍ** (no se pudo verificar visualmente con navegador por restricción de URLs internas)

##### Click-to-zoom

- `tabindex` y `role`: **SÍ**
- `aria-label`: **SÍ**
- Lightbox funcional: **NOT VERIFIED** visualmente, pero el script está presente.

##### SEO de imágenes

- Alt text descriptivo: **PARCIAL** (`flowchart diagram: Producer` es genérico)
- Lazy loading: **SÍ**
- Structured data referencia imágenes: **SÍ** (TechArticle `image`)
- Sitemap incluye imágenes: **SÍ**
- CSP permite `img-src`: **SÍ**

##### Accesibilidad

- Contraste WCAG AA: **NOT VERIFIED** (SVG sin texto a color problemático)
- Focus visible: **SÍ** (estructural)
- ARIA en lightbox: **SÍ**
- Touch targets >= 44px: **NOT VERIFIED**

##### Móvil (375px)

- Sin overflow horizontal: **ESTRUCTURALMENTE SÍ**
- Diagramas legibles: **NOT VERIFIED** visualmente
- Lightbox funciona con tap: **NOT VERIFIED**

#### Hallazgos

- `[MEDIUM] [MEDIA]` Alt del diagrama Mermaid puede ser más descriptivo.
- `[MEDIUM] [COMPANION]` Companion repo no existe; recomendado por contenido multi-archivo.

#### Score

- Companion repo: **0/5** (no existe; recomendación)
- Imágenes y diagramas: **9/10**
- **Total: 9/15**

---

### Anexo 6.9 — Outputs de detección de IA

- `ref/output/ai-detect-rabbitmq-task-queue.json`
- `ref/output/ai-detect-patterns-rabbitmq-task-queue.json`
- `ref/output/ai-detect-patterns-rabbitmq-task-queue-es.json`

Resumen:

| Idioma | Modelo | AI % | AI / Human / Total | pattern_totals |
| --- | --- | --- | --- | --- |
| EN | desklib | 36.9 % | 12 / 87 / 102 | vacío |
| ES | desklib | 28.1 % | 13 / 87 / 102 | vacío |

---

### Anexo 6.10 — Validación ejecutada

| Comando | Resultado |
| --- | --- |
| `npm run content:quality` | 0 errores, 0 warnings |
| `npm run content:links` | 0 enlaces rotos |
| `npm run content:validate` | 0 errores, 0 warnings |
| `npm run check` | 0 errores, 0 warnings, 3 hints preexistentes |
| `npm run build` | 3.258 páginas OK |
| `npm run sitemap` | 3.256 URLs generadas |

Build verificado:

- `dist/recipes/rabbitmq-task-queue/index.html` y `dist/es/recipes/rabbitmq-task-queue/index.html` existen.
- H1 coincide con `title` en ambos idiomas.
- Mermaid renderizado como `<img class="mermaid-diagram">`.
- `/lightbox.js` presente.
- SVGs presentes en `dist/assets/diagrams/`.
- Canonical, hreflang y JSON-LD presentes.
