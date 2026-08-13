# Auditoría Técnica SEO — `python-coverage-pytest-cov`

**Auditor:** Senior Technical SEO Consultant (Prompt 17)  
**Fecha:** sesión actual  
**Fuentes revisadas:**

- `src/content/recipes/testing/python-coverage-pytest-cov.md` (inglés)
- `src/content/recipes/testing/python-coverage-pytest-cov.es.md` (español)
- `dist/recipes/python-coverage-pytest-cov/index.html`
- `dist/es/recipes/python-coverage-pytest-cov/index.html`
- `public/sitemap.xml`
- `public/robots.txt`

## 1. Crawlability e indexabilidad

- **[OBSERVED]** `robots.txt` permite el rastreo de `/recipes/`, `/es/recipes/`, sitemap y assets estáticos.
- **[OBSERVED]** `sitemap.xml` contiene 3238 URLs con alternativas `xhtml:link rel="alternate"` por cada par EN/ES.
- **[OBSERVED]** El slug `python-coverage-pytest-cov` es kebab-case, en inglés, sin parámetros, sin trailing slash inconsistente.
- **[OBSERVED]** Canonical en build: `https://stackpractices.com/recipes/python-coverage-pytest-cov/` (EN) y `/es/recipes/python-coverage-pytest-cov/` (ES). Sin conflictos de canonicalización.
- **[OBSERVED]** La página no tiene `noindex` ni `nofollow` en el `<head>`. Indexable.
- **[REQUIRES DATA]** Para confirmar indexación real hace falta Google Search Console.

**Score crawlability/indexabilidad:** 9/10.

## 2. URL y arquitectura

- **[OBSERVED]** URL refleja jerarquía y topic: `/recipes/python-coverage-pytest-cov/`. La categoría implícita es `testing` por `topics` y por la navegación de `/recipes/testing/`.
- **[OBSERVED]** Profundidad 2 desde raíz (`/recipes/{slug}`), accesible desde listado de recetas, tag pages, topic pages y autor.
- **[INFERRED]** El contenido se inserta en el cluster de testing de Python, con recursos relacionados que fortalecen la autoridad tópica (`pytest`, `fixtures`, `mutation testing`, `mocking`).
- **[OBSERVED]** No existen URLs alternativas ni parámetros que creen contenido duplicado.

**Score URL/arquitectura:** 9/10.

## 3. Título y meta descripción

- **[OBSERVED]** **EN title:** `Measure and Enforce Python Test Coverage with pytest-cov` — 56 caracteres, incluye palabra clave principal y promesa de acción.
- **[OBSERVED]** **ES title:** `Medir y Exigir Cobertura de Tests con pytest-cov` — 48 caracteres.
- **[OBSERVED]** **EN metaDescription:** 152 caracteres, describe valor (measure/enforce, HTML, branch, exclusions, CI fail) e incluye CTA implícita.
- **[OBSERVED]** **ES metaDescription:** 155 caracteres, equivalente.
- **[OBSERVED]** Ambas versiones repiten `metaDescription` a nivel superior y dentro de `seo.metaDescription`.

**Corrección aplicada:** se cambió el título de la versión genérica `Measure Test Coverage...` a `Measure and Enforce Python Test Coverage...` para alinear intención de búsqueda y CTR.

**Score título/meta:** 9/10.

## 4. Headings y jerarquía

- **[OBSERVED]** H1: título del recipe.
- **[OBSERVED]** H2 secuencia lógica: Overview → When to Use → When NOT to Use → Solution → Explanation → Variants → Best Practices → Common Mistakes → Production Notes → FAQ → Implementation Examples → Key Takeaways → Further Reading.
- **[OBSERVED]** No hay H2 duplicados.
- **[OBSERVED]** H3 del FAQ son preguntas concisas; H3 de Implementation Examples son declaraciones correspondientes, sin duplicar exactamente el FAQ.
- **[OBSERVED]** Versión española usa H2 traducidos: Visión General, Cuándo Usar, Cuándo NO Usar, Solución, Explicación, Variantes, Mejores Prácticas, Errores Comunes, Notas de Producción, Preguntas Frecuentes, Ejemplos de Implementación, Puntos Clave, Lectura Adicional.
- **[OBSERVED]** Se corrigió el H3 del FAQ/Implementación de Django/Flask para evitar texto interrogativo duplicado y anclas rotas.

**Score headings:** 9/10.

## 5. Structured data

- **[OBSERVED]** JSON-LD generado:
  - `TechArticle` con `headline`, `description`, `author` (Person), `publisher` (Organization), `dateModified`, `datePublished`, `educationalLevel`, `articleSection`, `keywords`.
  - `BreadcrumbList` con Home → Recipes → Article.
  - `FAQPage` con 10 `Question`/`Answer` pairs; `acceptedAnswer.text` es texto plano sin bloques de código.
- **[INFERRED]** El esquema es válido y coherente con el contenido. No hay esquemas duplicados ni incorrectos.
- **[REQUIRES DATA]** Validación con Rich Results Test de Google no realizada por falta de acceso a la herramienta en este entorno.

**Score structured data:** 9/10.

## 6. Internal linking

- **[OBSERVED]** `relatedResources` contiene 6 recursos coherentes del cluster de testing. EN y ES comparten mismos slugs, orden y cantidad.
- **[OBSERVED]** Se agregaron 3 enlaces contextuales en el cuerpo:
  - `When NOT to Use` → `/recipes/implement-mutation-testing/` y `/recipes/python-hypothesis-property-testing/`.
  - `Explanation` → `/recipes/measure-test-coverage/`.
  - `Common Mistakes` → `/recipes/measure-test-coverage/`.
- **[OBSERVED]** `Further Reading` incluye enlaces internos (`complete-guide-pytest-production`, `python-pytest-fixtures-parametrize`, `implement-mutation-testing`, `python-mock-external-apis-responses`) y externos oficiales.
- **[INFERRED]** Los enlaces internos ayudan a distribuir autoridad dentro del cluster y reducen el riesgo de páginas huérfanas.

**Score internal linking:** 8/10.

## 7. Keywords y search intent

- **[OBSERVED]** Palabras clave presentes en título, meta, H2/H3, cuerpo y `keywords`: `pytest-cov`, `coverage.py`, `Python test coverage`, `branch coverage`, `coverage threshold`, `CI`, `HTML report`, `diff-cover`, `coverage-badge`.
- **[INFERRED]** Intención principal: información/tutorial (cómo medir y exigir cobertura). También resuelve intención transaccional implícita (instalación y configuración de pytest-cov).
- **[OBSERVED]** No hay keyword stuffing; la terminología fluye de forma natural.
- **[INFERRED]** Potencial cannibalización suave con `/recipes/measure-test-coverage/`. Se mitiga porque `measure-test-coverage` es una visión general conceptual y `python-coverage-pytest-cov` es la guía de implementación específica de la herramienta.

**Score keywords/intent:** 8/10.

## 8. Content quality y EEAT

- **[OBSERVED]** Autor: `Mathias Paulenko` con URL personal en `Person` schema. Autor con nombre real y site de referencia.
- **[OBSERVED]** Fechas de publicación y modificación presentes (`publishedAt`, `lastUpdated`).
- **[OBSERVED]** Contenido original: comandos listos para copiar, explicación de line vs. branch coverage, variantes (diff-cover, coverage-badge), notas de producción reales.
- **[OBSERVED]** Referencias y enlaces a documentación oficial en `Further Reading`.
- **[INFERRED]** El contenido demuestra experiencia técnica directa con pytest-cov y coverage.py.
- **[REQUIRES DATA]** Métricas de engagement (CTR, tiempo en página, rebote) no disponibles.

**Score EEAT:** 8/10.

## 9. Contenido duplicado y riesgo programático

- **[OBSERVED]** EN y ES mantienen la misma estructura y código, pero el prose está traducido; no es contenido duplicado puro.
- **[OBSERVED]`relatedResources` comparte slugs, pero el componente los traduce a URLs localizadas; no hay duplicación de URLs.
- **[OBSERVED]** El FAQ/Implementation Examples separa respuestas textuales del código, evitando bloques de código repetidos en el schema.
- **[INFERRED]** Riesgo programático bajo para esta URL individual. El site en conjunto puede requerir revisión periódica de thin content y near-duplicates a escala (fuera del alcance de esta auditoría de página).

**Score duplicación/riesgo:** 8/10.

## 10. Performance y UX

- **[OBSERVED]** Build estático con Astro SSG; no hidratación innecesaria para este contenido.
- **[OBSERVED]** HTML minificado, clases minificadas, SRI en scripts, lazy loading no verificado directamente.
- **[REQUIRES DATA]** Core Web Vitals requieren medición con PageSpeed Insights o CrUX.
- **[OBSERVED]** Sin imágenes propias; el artículo es texto y código, lo cual es apropiado para el formato recipe.

**Score performance/UX:** 8/10.

## 11. Internacional / hreflang

- **[OBSERVED]** `hreflang="en"`, `hreflang="es"`, `hreflang="x-default"` correctos.
- **[OBSERVED]** `og:locale` en-US para EN.
- **[OBSERVED]** `html lang="en"` / `html lang="es"` correctos.
- **[INFERRED]** No hay errores de canonical cross-language.

**Score internacional:** 10/10.

## 12. Problemas encontrados y corregidos

1. **Título genérico** → cambiado a `Measure and Enforce Python Test Coverage with pytest-cov` y `Medir y Exigir Cobertura de Tests con pytest-cov`.
2. **Espacios en blanco extra en frontmatter** → eliminados para YAML limpio.
3. **Enlaces internos insuficientes** → agregados 3 enlaces contextuales en el cuerpo.
4. **H3 duplicado/confuso FAQ/Implementation "Can I use pytest-cov with Django or Flask"** → corregido a `Use pytest-cov with Django or Flask` y `Usar pytest-cov con Django o Flask`, con anclas correspondientes.
5. **Secciones genéricas previas** (`Troubleshooting`, `Key Takeaways`, `Common Production Pitfalls`) → reemplazadas por `Production Notes`, `Key Takeaways` específicos y `Further Reading`.
6. **FAQ con código en respuestas** → separado en FAQ concisa + `Implementation Examples`.
7. **Falta de sección `Explanation`** → agregada.
8. **Headings en inglés en archivo ES** → traducidos.
9. **Solo 4 `relatedResources`** → ampliado a 6.
10. **Keyword `recipe` genérica en tags/keywords** → reemplazada por `branch-coverage` y `ci-cd`.

## 13. Estado final y puntuación

| Dimensión | Score |
| --- | --- |
| Crawlability / Indexability | 9/10 |
| URL / Arquitectura | 9/10 |
| Título / Meta | 9/10 |
| Headings | 9/10 |
| Structured data | 9/10 |
| Internal linking | 8/10 |
| Keywords / Search intent | 8/10 |
| EEAT | 8/10 |
| Duplicación / Riesgo programático | 8/10 |
| Performance / UX | 8/10 |
| Internacional | 10/10 |
| **Promedio** | **8.6/10** |

Validación técnica:

- `npm run content:quality`: 0 errores, 0 warnings
- `npm run content:links`: 0 enlaces rotos
- `npm run content:validate`: 0 errores
- `npm run check`: 0 errores
- `npm run build`: 3242 páginas
- `npm run sitemap`: 3238 URLs

**Veredicto SEO:** listo para indexación y publicación. Pendientes futuros: validación Rich Results Test y medición de Core Web Vitals.
