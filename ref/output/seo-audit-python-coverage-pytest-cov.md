# Auditoría Técnica SEO — `python-coverage-pytest-cov`

**Auditor:** STACKPRACTICES TECHNICAL SEO CHECKER  
**Fecha:** sesión actual  
**Fuentes revisadas:**

- `src/content/recipes/testing/python-coverage-pytest-cov.md` (inglés)
- `src/content/recipes/testing/python-coverage-pytest-cov.es.md` (español)
- Salida de build: `dist/recipes/python-coverage-pytest-cov/index.html`

## 1. Título y meta descripción

- **EN title:** `Measure Test Coverage with pytest-cov` (44 chars, dentro de 60)
- **ES title:** `Medir Cobertura de Tests con pytest-cov` (47 chars)
- **EN metaDescription:** 144 chars (dentro de 50–170)
- **ES metaDescription:** 146 chars
- Ambas versiones incluyen `metaDescription` a nivel superior y dentro de `seo.metaDescription`.

## 2. URLs y hreflang

- **Canonical EN:** `https://stackpractices.com/recipes/python-coverage-pytest-cov/`
- **Canonical ES:** `https://stackpractices.com/es/recipes/python-coverage-pytest-cov/`
- **Hreflang:** en, es, x-default presentes y correctos.
- **BreadcrumbList** y **TechArticle** JSON-LD presentes.

## 3. Estructura y headings

- H1: título del recipe.
- H2: Overview, When to Use, When NOT to Use, Solution, Explanation, Variants, Best Practices, Common Mistakes, Production Notes, FAQ, Implementation Examples, Key Takeaways, Further Reading.
- No hay H2 duplicados dentro de cada idioma.
- La versión español usa títulos traducidos (Visión General, Cuándo Usar, etc.).

## 4. FAQ / schema

- `FAQPage` schema generado con 10 preguntas.
- Respuestas del FAQ son texto sin bloques de código; los ejemplos de implementación se movieron a la sección `Implementation Examples`.
- Cada respuesta del FAQ incluye un enlace anclado a la sección correspondiente.

## 5. Related resources

- Se amplió a 6 recursos coherentes del cluster de testing:
  - `python-pytest-fixtures-parametrize`
  - `measure-test-coverage`
  - `python-mock-external-apis-responses`
  - `python-hypothesis-property-testing`
  - `implement-mutation-testing`
  - `setup-test-fixtures`
- EN y ES mantienen los mismos slugs en el mismo orden.

## 6. Keywords

- Se reemplazó la palabra genérica `recipe` por `branch-coverage` y `ci-cd`, quedando 7 keywords relevantes.
- Tags actualizados, eliminando `recipe`.

## 7. Problemas encontrados y corregidos

1. **Secciones genéricas** (`Troubleshooting`, `Key Takeaways`, `Common Production Pitfalls`) reemplazadas por contenido específico de pytest-cov.
2. **Falta de sección `Explanation`**: se agregó entre `Solution` y `Variants`.
3. **FAQ con código en respuestas**: se separó en FAQ concisa + `Implementation Examples`.
4. **Headings en inglés en archivo ES**: se tradujeron todos los H2.
5. **Solo 4 `relatedResources`**: se amplió a 6.

## 8. Estado final

- `npm run content:quality`: 0 errores, 0 warnings
- `npm run content:links`: 0 broken
- `npm run content:validate`: 0 errores (74 warnings pre-existentes en templates)
- `npm run check`: 0 errores, 0 warnings
- `npm run build`: 3242 páginas
- `npm run sitemap`: 3238 URLs

**Veredicto SEO:** listo para indexación.
