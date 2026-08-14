# Auditoría Técnica SEO — `python-schedule-periodic-tasks`

**Auditor:** Senior Technical SEO Consultant (Prompt 17)
**Fecha:** sesión actual
**Fuentes revisadas:**

- `src/content/recipes/concurrency/python-schedule-periodic-tasks.md` (inglés)
- `src/content/recipes/concurrency/python-schedule-periodic-tasks.es.md` (español)
- `dist/recipes/python-schedule-periodic-tasks/index.html`
- `dist/es/recipes/python-schedule-periodic-tasks/index.html`
- `public/sitemap.xml`
- `public/robots.txt`

## 1. Crawlability e indexabilidad

- **[OBSERVED]** `robots.txt` permite el rastreo de `/recipes/`, `/es/recipes/`, sitemap y assets estáticos.
- **[OBSERVED]** `sitemap.xml` contiene 3242 URLs con alternativas `xhtml:link rel="alternate"` para cada par EN/ES.
- **[OBSERVED]** El slug `python-schedule-periodic-tasks` es kebab-case, en inglés, sin parámetros, sin trailing slash inconsistente.
- **[OBSERVED]** Canonical en build: `https://stackpractices.com/recipes/python-schedule-periodic-tasks/` (EN) y `https://stackpractices.com/es/recipes/python-schedule-periodic-tasks/` (ES). Sin conflictos de canonicalización.
- **[OBSERVED]** La página no tiene `noindex` ni `nofollow` en el `<head>`. Indexable.
- **[REQUIRES DATA]** Para confirmar indexación real hace falta Google Search Console.

**Score crawlability/indexabilidad:** 9/10.

## 2. URL y arquitectura

- **[OBSERVED]** URL refleja jerarquía: `/recipes/python-schedule-periodic-tasks/`. La categoría implícita es `concurrency` y `devops` por `topics` y la navegación de `/recipes/concurrency/`.
- **[OBSERVED]** Profundidad 2 desde raíz (`/recipes/{slug}`), accesible desde listado de recetas, tag pages, topic pages y autor.
- **[INFERRED]** El contenido se inserta en el cluster de concurrencia y scheduling de Python; los recursos relacionados fortalecen la autoridad tópica (`asyncio`, `cron jobs`, `health checks`, `circuit breaker`).
- **[OBSERVED]** No existen URLs alternativas ni parámetros que creen contenido duplicado.

**Score URL/arquitectura:** 9/10.

## 3. Título y meta descripción

- **[OBSERVED]** **EN title:** `Schedule Periodic Tasks in Python with APScheduler` — 50 caracteres, dentro del límite, incluye palabra clave principal.
- **[OBSERVED]** **ES title:** `Programa Tareas Periódicas en Python con APScheduler` — 52 caracteres.
- **[OBSERVED]** **EN metaDescription:** 150 caracteres, describe triggers, job stores, schedulers y error handling.
- **[OBSERVED]** **ES metaDescription:** 158 caracteres, equivalente.
- **[OBSERVED]** Ambas versiones repiten `metaDescription` a nivel superior y dentro de `seo.metaDescription`.

**Score título/meta:** 9/10.

## 4. Headings y jerarquía

- **[OBSERVED]** H1 coincide con el título.
- **[OBSERVED]** H2 secuencia lógica: Overview → When to Use → When NOT to Use → Solution → Explanation → Variants → Best Practices → Common Mistakes → Production Notes → FAQ → Key Takeaways → Further Reading.
- **[OBSERVED]** No hay H2 duplicados.
- **[OBSERVED]** H3 del FAQ son preguntas concisas y únicas.
- **[OBSERVED]** Versión española usa H2 traducidos: Visión General, Cuándo Usar, Cuándo NO Usar, Solución, Explicación, Variantes, Buenas Prácticas, Errores Comunes, Notas de Producción, Preguntas Frecuentes, Puntos Clave, Lecturas Adicionales.

**Score headings:** 9/10.

## 5. Structured data

- **[OBSERVED]** JSON-LD generado:
  - `TechArticle` con `headline`, `description`, `author` (Person), `publisher` (Organization), `dateModified`, `datePublished`, `educationalLevel`, `articleSection`, `keywords`.
  - `BreadcrumbList` con Home → Recipes → Article.
  - `FAQPage` con 6 `Question`/`Answer` pairs; `acceptedAnswer.text` es texto plano sin bloques de código después de las correcciones.
- **[INFERRED]** El esquema es válido y coherente con el contenido.
- **[REQUIRES DATA]** Validación con Rich Results Test de Google no realizada por falta de acceso a la herramienta en este entorno.

**Score structured data:** 9/10.

## 6. Internal linking

- **[OBSERVED]** `relatedResources` contiene 6 recursos coherentes del cluster de concurrencia y devops. EN y ES comparten mismos slugs, orden y cantidad.
- **[OBSERVED]** Se agregaron y/o verificaron enlaces contextuales en el cuerpo:
  - `When NOT to Use` / `Cuándo NO Usar` → `/recipes/cron-jobs/`.
  - `FAQ` async → `/guides/complete-guide-python-asyncio/`.
  - `Production Notes` / `Notas de Producción` → `/recipes/docker-health-check-configuration/`.
  - `Further Reading` / `Lecturas Adicionales` → `/recipes/cron-jobs/`, `/recipes/docker-health-check-configuration/`, `/patterns/circuit-breaker-pattern/`, `/guides/complete-guide-python-asyncio-production/`.
- **[INFERRED]** Los enlaces internos ayudan a distribuir autoridad dentro del cluster y reducen el riesgo de páginas huérfanas.

**Score internal linking:** 9/10.

## 7. Keywords y search intent

- **[OBSERVED]** Palabras clave presentes en título, meta, H2/H3, cuerpo y `keywords`: `APScheduler`, `Python periodic tasks`, `cron trigger`, `interval trigger`, `date trigger`, `job stores`, `BackgroundScheduler`, `SQLAlchemy`, `ProcessPoolExecutor`.
- **[INFERRED]** Intención principal: información/tutorial (cómo programar tareas periódicas en Python). También resuelve intención transaccional implícita (instalación y configuración de APScheduler).
- **[OBSERVED]** No hay keyword stuffing; la terminología fluye de forma natural.
- **[INFERRED]** Potencial cannibalización suave con `/recipes/cron-jobs/`. Se mitiga porque `cron-jobs` cubre el scheduler del SO y `python-schedule-periodic-tasks` cubre scheduling in-process con APScheduler.

**Score keywords/intent:** 8/10.

## 8. Content quality y EEAT

- **[OBSERVED]** Autor: `Mathias Paulenko` con URL personal en `Person` schema.
- **[OBSERVED]** Fechas de publicación y modificación presentes (`publishedAt`, `lastUpdated`).
- **[OBSERVED]** Contenido original: ejemplos listos para copiar en Python, explicación de triggers, job stores, executors y notas de producción reales.
- **[OBSERVED]** Referencias a documentación oficial y recursos internos en `Further Reading`.
- **[INFERRED]** El contenido demuestra experiencia técnica directa con APScheduler.
- **[REQUIRES DATA]** Métricas de engagement no disponibles.

**Score EEAT:** 8/10.

## 9. Contenido duplicado y riesgo programático

- **[OBSERVED]** EN y ES mantienen la misma estructura y código, pero el prose está traducido; no es contenido duplicado puro.
- **[OBSERVED]** `relatedResources` comparte slugs, pero el componente los traduce a URLs localizadas; no hay duplicación de URLs.
- **[OBSERVED]** El FAQ separa respuestas textuales del código; el ejemplo de `ProcessPoolExecutor` se movió a la sección Solution para evitar bloques de código en `acceptedAnswer.text`.
- **[INFERRED]** Riesgo programático bajo para esta URL individual.

**Score duplicación/riesgo:** 8/10.

## 10. Performance y UX

- **[OBSERVED]** Build estático con Astro SSG; no hidratación innecesaria para este contenido.
- **[OBSERVED]** HTML minificado, clases minificadas, SRI en scripts.
- **[REQUIRES DATA]** Core Web Vitals requieren medición con PageSpeed Insights o CrUX.
- **[OBSERVED]** Sin imágenes propias; apropiado para el formato recipe.

**Score performance/UX:** 8/10.

## 11. Internacional / hreflang

- **[OBSERVED]** `hreflang="en"`, `hreflang="es"`, `hreflang="x-default"` correctos; x-default apunta a la versión EN.
- **[OBSERVED]** `og:locale` en-US para EN.
- **[OBSERVED]** `html lang="en"` / `html lang="es"` correctos.
- **[INFERRED]** No hay errores de canonical cross-language.

**Score internacional:** 10/10.

## 12. Problemas encontrados y corregidos

1. **FAQ con código dentro de `acceptedAnswer.text`** → el ejemplo de `ProcessPoolExecutor` se movió a la sección Solution (`Run CPU-bound jobs in a process pool` / `Ejecutar jobs CPU-bound en un process pool`), y la respuesta del FAQ ahora referencia al ejemplo en texto plano.
2. **Markdown link crudo en respuesta FAQ de async** → se eliminó el enlace markdown `[complete guide]` dentro de `acceptedAnswer.text`; el enlace se mantiene en `Further Reading`.
3. **Enlaces internos escasos** → se agregó enlace a `docker-health-check-configuration` en `Production Notes` y se amplió `Further Reading` con enlaces internos coherentes.
4. **Párrafos largos en `When to Use`** → se dividió en oraciones más cortas para mejorar legibilidad.

## 13. Notas de auditoría

- **AI detection (Desklib, full):** EN 39.4%, ES 32.5% — ambos bajo el umbral del proyecto (40%).
- **Validaciones:** `content:quality` 0/0, `content:links` 0 rotos, `content:validate` 0 errores (74 warnings pre-existentes), `build` 3242 páginas OK, `sitemap` regenerado.

## 14. Puntuación global

| Dimensión | Peso | Score |
|---|---:|---:|
| Technical SEO | 30% | 9/10 |
| Content SEO | 25% | 9/10 |
| Information Architecture | 15% | 9/10 |
| Internal Linking | 10% | 9/10 |
| User Experience | 10% | 8/10 |
| EEAT | 10% | 8/10 |
| **Overall** | **100%** | **8.85/10** |

**Estado:** Técnicamente optimizado y listo para su indexación sostenida.
