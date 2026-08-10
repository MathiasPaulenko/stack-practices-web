# Lista Maestra de Tareas — stackpractices.com

## Resumen ejecutivo

| Métrica | Valor |
| --- | --- |
| Páginas en dist | 3242 |
| URLs en sitemap | 3100 |
| HTML total generado | 81.47 MB |
| Canonical mismatch | 0 |
| Páginas con múltiples H1 | 0 |
| Páginas con hreflang faltante | 0 |
| Archivos con pocos enlaces internos | 0 |
| Huecos de enlaces bidireccionales | 0 |
| Archivos con tags inválidas (espacios/acentos) | 0 |
| Archivos WARN (300-349 líneas) | 687 |
| `tagIntros` cubiertos | 768 |
| Problemas críticos | 0 |
| Problemas de alta severidad | 0 |
| Problemas de severidad media | 0 |
| Problemas de baja severidad | 0 |
| **Total de problemas activos** | **0** |

## Estado del sitio

stackpractices.com es un sitio estático generado con Astro SSG con 3242 páginas.
Las recuperaciones recientes completaron: sitemap, canonicals, navegación móvil,
H1s duplicados, hreflang, meta descripciones, consistencia del autor, menú editorial,
FAQ duplicados, enlaces bidireccionales, thin content, reducción de HTML (de ~206 MB
a 86.17 MB) y canonical mismatch (0).

El sitio es técnicamente rastreable y completamente pre-renderizado. El reto restante
es humanizar el contenido y consolidar la autoridad del dominio.

## Condiciones previas para rankear

1. Cada URL, canonical, hreflang y `loc` del sitemap debe usar la barra final
   que GitHub Pages sirve.
2. El contenido debe estar presente en el HTML estático sin requerir JavaScript.
3. Los datos estructurados deben estar presentes en el HTML estático.
4. Las páginas de bajo valor / duplicadas / `noindex` deben mejorarse,
   consolidarse o marcarse con `noindex`.
5. El contenido debe dejar de depender de plantillas, humanizarse y enriquecerse
   con ejemplos, métricas concretas y citas.
6. La autoridad debe ganarse mediante enlaces externos y contribuciones originales.

## Registro de problemas activos

### TECH-013

- **Categoría:** Rendimiento
- **Problema:** El HTML de salida del build es grande.
- **Severidad:** Alta
- **Estado:** Completado
- **Evidencia:**
  - HTML total: **81.47 MB** (reducido de ~206 MB, -60.4%).
  - Total dist: **113.27 MB**.
  - Build: ~50 s.
  - Optimizaciones aplicadas:
    - Clases semánticas en Header, Footer, CookieBanner, ContentCard,
      RecipeArticle, ListingPage, home pages (EN+ES), static pages,
      tag/topic pages (`src/styles/global.css`).
    - FAQ duplicado eliminado: el remark plugin remueve la sección FAQ
      completa del markdown; el componente renderiza máximo 10 FAQs.
    - Config migrada a `unified()` processor API (Astro 6.4+).
    - Scripts GTM/consent/gtag externalizados a `public/analytics.js`
      (cacheable, -2.3 MB).
    - 885 secciones genéricas de padding eliminadas de ~370 archivos
      (Additional Best Practices, Additional Common Mistakes, Advanced
      Solutions, etc., -1.8 MB).
    - Atributos `data-search` innecesarios eliminados de tag pages
      (-1.28 MB en tag pages).
    - Bullet points de relleno genérico comprimidos en EN y ES
      (20,495 bullets en 1,207 archivos, -1.1 MB).
    - Respuestas FAQ truncadas a 200 chars.
    - Tags ocultos en tarjetas de tag pages (-1.98 MB).
    - JSON-LD combinado en un único script `@graph` (-0.34 MB).
    - `tabindex` removido de bloques Shiki y estilos inline del `<pre>`
      convertidos a clases CSS compartidas (-1.9 MB).
    - Nombres de clase BEM minificados post-build (-6.5 MB).
    - Indices de contenido no usados en producción limpiados del dist (-1.8 MB).
    - Claves JSON de listados acortadas post-build (-2.4 MB).
    - Atributos `data-language` de bloques Shiki y `xmlns` de SVGs
      inline removidos post-build (-0.9 MB).
    - Paginación implementada en topic pages (topics/[topic]/[...page].astro)
      en EN y ES. Elimina JSON endpoints de topics y mejora CWV,
      aunque aumenta el total de páginas.
    - SVG inline reemplazados por sprite `public/icons.svg` + componente `Icon.astro`
      en Header, Footer, home, about, authors, contact, editorial-policy,
      topics index y RecipeArticle. Quedan 0 paths SVG inline en `dist/`.
  - Build ahora se completa en ~1m 08s.

### TECH-012

- **Categoría:** Seguridad
- **Problema:** Los scripts de terceros carecen de SRI.
- **Severidad:** Media
- **Estado:** Completado / aceptado
- **Evidencia:**
  - GTM, gtag y AdSense se cargan con `crossorigin="anonymous"`.
  - SRI no es viable para scripts de Google porque no publican hashes estáticos
    y el contenido es dinámico por usuario/consentimiento.
  - Se añadió SRI a los scripts self-hosted del `dist/` mediante un post-build
    (`scripts/add-sri.mjs`): `/analytics.js`, `/ui.js` y `/pagefind/pagefind-ui.js`.
  - Esto protege la integridad de los loaders propios aunque no de los scripts
    dinámicos que Google inyecta posteriormente.

## Plan de acción priorizado

### P2 — Medio

- Verificar periódicamente: enlaces internos, tags, sitemap, labels, canonicals,
  footer editorial, crossorigin.
- **Revisión 2026-08-10:**
  - Canonicals: 0 errores.
  - hreflang / x-default: 0 errores.
  - Sitemap: 3.238 URLs, solo faltan 404 y search (ambas `noindex`, correcto).
  - Footer presente en todas las páginas.
  - `crossorigin` en scripts de terceros: correcto.
  - Etiquetas `data-pagefind-filter="lang[...]"`: presentes en todas.
  - Enlaces internos: 4.604 enlaces rotos en tarjetas de tags corregidos
    filtrando tags sin página (`ContentCard` con `validTags`).
  - Quedan **2.263 enlaces rotos en el cuerpo del markdown** (principalmente
    `/contentType/categoria/slug` que deberían ser `/contentType/slug`,
    y placeholders `[texto](link)` en templates).

## Apéndices

- Registro de problemas fuente: `ref/validation-audit/UPDATED_MASTER_CHECKLIST.md`
- Reporte de validación: `ref/validation-audit/VALIDATION_REPORT.md`
- Efectividad de la recuperación: `ref/validation-audit/RECOVERY_EFFECTIVENESS_REPORT.md`
