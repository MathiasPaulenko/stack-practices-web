# SEO Audit — StackPractices
**Fecha:** 2026-06-15
**Páginas escaneadas:** 2102 (build output)
**Dominio:** stackpractices.com

---

## Resumen Ejecutivo

| Categoría | Cantidad | Estado |
|-----------|----------|--------|
| Crítico (bloquea indexación o genera errores) | 0 | [x] Completado |
| Advertencia (impacto SEO negativo) | 0 | [x] Completado |
| Info (mejora recomendada) | 3 | [ ] Pendiente |
| Corregidos en esta sesión | 14 | [x] Hecho |

---

## CRÍTICO — Arreglar antes de solicitar indexación masiva

### 1. Sitemap: 490 URLs sin trailing slash
**Problema:** El `generate-sitemap.cjs` genera URLs como `https://stackpractices.com/recipes` sin `/` final. GitHub Pages redirige con 301 a `/recipes/`. Google ve discrepancia entre sitemap y canonical.
**Impacto:** Crawl budget desperdiciado, señales de URL divididas.
**Fix:** Modificar `generate-sitemap.cjs` para añadir `/` a todas las URLs que no tengan extensión de archivo.

- [x] Editar `.agents/skills/stackp-content-creator/scripts/generate-sitemap.cjs`
- [x] En `addUrl()`, asegurar que `path` termine con `/` antes de generar `<loc>`
- [x] Regenerar sitemap y verificar que NINGUNA URL quede sin trailing slash
- [x] Verificar que URLs a recursos (`/recipes/slug/`) también mantengan `/`

### 2. Sitemap: 1 URL duplicada
**Problema:** `https://stackpractices.com/recipes/rate-limiting` aparece 2 veces en sitemap.
**Causa:** Probablemente 2 archivos `.md` distintos generan el mismo slug.
**Impacto:** Confusión para el crawler, señales divididas.

- [x] Identificar los archivos fuente duplicados para `rate-limiting`
- [x] Fusionar o renombrar uno de ellos
- [x] Regenerar sitemap y verificar 0 duplicados

### 3. Enlaces rotos internos en `relatedResources`
**Problema:** Ya se encontró y corrigió `/recipes/api/pagination` (apuntaba a ruta inexistente, debe ser `/recipes/pagination`). Pueden existir más.
**Impacto:** 404s internos, mala experiencia de usuario, crawl budget perdido.

- [x] Ejecutar script de verificación de enlaces rotos: `node .agents/skills/stackp-content-creator/scripts/check-broken-links.cjs`
- [x] Corregir todos los `relatedResources` que apunten a URLs inexistentes
- [x] Verificar especialmente enlaces que usan rutas compuestas (`/tipo/subtipo/slug`)

### 4. Tags ES sin versión EN generan 404
**Problema:** Tags como `normalizacion`, `comunidad`, `gobernanza` solo existen en contenido ES. Las páginas `/tags/normalizacion/` no existen (404), pero Google las descubre vía hreflang alternates.
**Impacto:** 404s reportados en GSC, posible señal negativa de calidad.
**Fix:** Implementar lógica que solo emita hreflang alternate cuando exista la contraparte en el otro idioma.

- [x] Modificar `Seo.astro` o las páginas de tags para condicionar `hasAlternate`
- [x] Verificar que solo se emita hreflang ES cuando el tag exista en ES, y viceversa
- [x] Aplicado también a topics vía `ListingPage`

### 5. Contenido ES/EN casi idéntico → Google ignora hreflang
**Problema:** Los artículos ES y EN comparten ~40-50% de texto idéntico (code blocks, ejemplos, tablas). Google a veces elige la versión ES como canonical para ambos idiomas, ignorando hreflang.
**Impacto:** Las páginas EN aparecen como "alternativa" en GSC en lugar de indexarse por separado.
**Fix:** No hay fix técnico perfecto (hreflang es sugerencia, no orden). Pero se puede mejorar diferenciación.

- [x] Añadir banners de contexto localizado automáticamente (EN: convenciones internacionales, ES: adaptado para equipos hispanohablantes)
- [x] Aplicado a todos los artículos (recipes, patterns, docs, guides) vía RecipeArticle.astro
- [ ] Añadir secciones de "Casos de uso regionales" o "Consideraciones locales" distintas por idioma en contenido futuro
- [ ] Considerar añadir más comentarios en español en code blocks ES en contenido futuro

---

## ADVERTENCIA — Impacto SEO negativo acumulativo

### 6. Páginas de tags: titulares genéricos sin diferenciación de idioma
**Problema:** El título de la página tag ES es `Etiqueta: pytest` pero el OG title y meta description no diferencian claramente que es contenido ES.
**Fix:** Asegurar que `<html lang="es">`, `og:locale`, y el título incluyan indicadores de idioma.

- [x] Verificar que todas las páginas ES usen `locale="es"` correctamente en BaseLayout
- [x] Verificar `og:locale` sea `es_ES` en páginas ES (verificado en build output)
- [x] Los títulos ya son diferenciados: "Recipes" vs "Recetas", "Tag: python" vs "Etiqueta: python"

### 7. Meta descriptions truncadas en listados
**Problema:** Las páginas de listing (recipes, patterns, etc.) usan descriptions genéricas. Las tarjetas de contenido podrían tener descriptions idénticas.
**Fix:** Asegurar que cada listing page tenga description única.

- [x] Verificar `/recipes/`, `/patterns/`, `/guides/`, `/docs/` tienen descriptions distintas
- [x] Verificar `/es/recipes/`, `/es/patterns/`, etc. tienen descriptions distintas de sus contrapartes EN
- [x] Todas las listing pages tienen descriptions únicas y diferenciadas por idioma

### 8. Breadcrumbs sin schema JSON-LD en páginas dinámicas
**Problema:** Las páginas de tags y topics tienen breadcrumbs visuales pero no verificar si tienen `BreadcrumbList` schema.
**Fix:** Verificar e implementar si falta.

- [x] Verificar `dist/tags/faas/index.html` incluye `BreadcrumbList` JSON-LD (verificado: YES)
- [x] Verificar `dist/topics/data/index.html` incluye `BreadcrumbList` JSON-LD (verificado: YES)
- [x] Ya existía en `tags/[tag].astro` y `ListingPage.astro` (usado por topics)

### 9. Páginas de tags: contenido "thin" potencial
**Problema:** Las páginas de tags listan solo tarjetas de contenido, sin texto introductorio sustancial.
**Impacto:** Google puede clasificarlas como "soft 404" o thin content si tienen poco valor añadido.
**Fix:** Opcional — añadir párrafo introductorio descriptivo.

- [x] Añadir párrafos introductorios descriptivos a páginas de tags (EN + ES)
- [x] Descripción dinámica incluye conteo, tipo de contenido y propósito del tag

### 10. Falta `lastmod` actualizado en sitemap
**Problema:** El sitemap usa `lastUpdated` del frontmatter o fecha fija. Si el contenido se actualiza pero `lastUpdated` no se modifica, el sitemap miente a Google.
**Fix:** Usar fecha real del archivo o asegurar que `lastUpdated` se actualiza en cada cambio sustancial.

- [x] Revisar script `generate-sitemap.cjs` para usar `fs.statSync(file).mtime` como fallback
- [x] Establecer proceso: actualizar `lastUpdated` cuando se edita contenido

---

## INFO — Mejoras recomendadas

### 11. Falta `<link rel="preload">` para recursos críticos
**Recomendación:** Añadir `preload` para fuentes, CSS crítico o scripts principales.
- [ ] Evaluar si añadir `preload` para `/pagefind/pagefind-ui.css` en página de búsqueda

### 12. No hay página de autor individual (`/authors/mathias-paulenko`)
**Recomendación:** Crear URL dedicada por autor mejora E-E-A-T.
- [ ] Considerar crear `/authors/mathias-paulenko` o similar en el futuro

### 13. Schema `Person` del autor no incluye `knowsAbout`
**Recomendación:** Añadir áreas de conocimiento al schema Person.
- [x] Añadir `knowsAbout: ["Software Engineering", "Python", "JavaScript", ...]` al JSON-LD de /authors

### 14. No hay datos estructurados `FAQPage` en páginas estáticas
**Recomendación:** Añadir FAQ schema a About, Editorial Policy para GEO (AI answer engines).
- [ ] Considerar añadir FAQ sections a páginas About y Editorial Policy

---

## CORREGIDOS EN ESTA SESIÓN

- [x] **Hreflang en páginas noindex** — Tags, search y 404 tenían hreflang + noindex simultáneamente. Eliminado hreflang de páginas noindex.
- [x] **Noindex en páginas de tags** — Eliminado `noindex={true}` de `/tags/[tag].astro` y `/es/tags/[tag].astro` para hacerlas indexables.
- [x] **Enlaces internos sin trailing slash** — Todos los enlaces de navegación (header/footer) apuntaban a `/recipes` en lugar de `/recipes/`, causando 301. Corregido en `site.ts`.
- [x] **Enlace roto `/recipes/api/pagination`** — 6 archivos tenían `relatedResources` apuntando a URL inexistente. Corregido a `/recipes/pagination`.
- [x] **Canonical `/es/es/` duplicado** — Corregido en 11 páginas ES pasando `path` sin prefijo `/es`.
- [x] **Sitemap trailing slashes** — 490 URLs sin `/` final corregidas. Ahora todas terminan en `/`.
- [x] **Sitemap duplicado `rate-limiting`** — Renombrado a `rate-limiting-security`. Ahora 0 duplicados en sitemap.
- [x] **Enlaces rotos `relatedResources`** — 4 enlaces rotos adicionales corregidos (retry-patterns, docker-compose, component-testing, storybook).
- [x] **Hreflang en tags/topics sin contraparte** — Tags y topics que solo existen en un idioma ya no emiten hreflang hacia 404s.
- [x] **Thin content en páginas de tags** — Descripciones introductorias añadidas a tag pages EN y ES.
- [x] **Schema Person `knowsAbout`** — Añadidas 10 áreas de conocimiento al schema Person del autor para mejorar E-E-A-T.
- [x] **Contenido ES/EN idéntico** — Banners de contexto localizado añadidos a todos los artículos (recipes, patterns, docs, guides) vía RecipeArticle.astro.
- [x] **Diferenciación de idioma en títulos** — `og:locale` es `es_ES`/`en_US`, `html lang` es `es`/`en`, títulos diferenciados (Recipes/Recetas, Tag/Etiqueta).
- [x] **Meta descriptions únicas en listados** — Todos los listing pages tienen descriptions distintas EN vs ES.
- [x] **BreadcrumbList JSON-LD en tags/topics** — Verificado en build output para `/tags/*/` y `/topics/*/`, ya estaba implementado.

---

## Prioridad de ejecución recomendada

```
1. Arreglar sitemap trailing slashes (CRÍTICO #1)
2. Arreglar duplicado rate-limiting en sitemap (CRÍTICO #2)
3. Ejecutar check-broken-links y corregir (CRÍTICO #3)
4. Condicionar hreflang en tags ES sin EN (CRÍTICO #4)
5. Diferenciar contenido ES/EN (CRÍTICO #5)
6. Añadir BreadcrumbList schema a tags/topics (WARNING #8)
7. Mejorar meta descriptions de listados (WARNING #7)
```

---

*Audit generado: 2026-06-15. Marcar checkboxes [x] conforme se van corrigiendo.*
