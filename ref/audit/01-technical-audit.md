# 01 — Auditoría técnica e indexabilidad de StackPractices

> Audita la parte técnica del recurso: indexabilidad, URL, canónicas, redirects, structured data, sitemap, performance y todo lo relacionado con el hecho de que Astro SSG genere una página estática.

## Input esperado

- `RESOURCE`: slug, ruta local o URL.
- Archivos locales: `src/content/{tipo}/{slug}.md` y `.es.md` (ajustar si el repositorio usa `src/content/{tipo}/{topic}/{slug}.md`).
- Ficheros de build: `dist/` y `public/sitemap.xml` (generados por `npm run build` y `npm run sitemap`).

## Skills complementarias

Si están disponibles, invocar `technical-seo-checker`, `google-crawling-indexing` o `google-seo-monitoring` para reforzar el análisis.

## Qué inspeccionar

### 1.1 URL y ruta

- Slug kebab-case, único dentro del tipo.
- Ruta lógica: `/{tipo}/{slug}/` (con trailing slash).
- Versión ES: `/es/{tipo}/{slug}/`.
- No parámetros, IDs ni fechas innecesarias.
- No duplicidad de rutas (mismo slug en dos tipos distintos).

### 1.2 Generación de ruta

Para recursos locales, verificar:

- `src/content.config.ts` define las colecciones `recipes`, `patterns`, `guides` y `docs` con sus esquemas Zod.
- `src/pages/{tipo}/[slug].astro` y `src/pages/es/{tipo}/[slug].astro` usan `getStaticPaths()` para generar las rutas EN y ES.
- El layout `src/layouts/BaseLayout.astro` inyecta canonical, hreflang, Open Graph y JSON-LD.
- El slug publicado coincide con el `slug` del frontmatter y genera URLs con trailing slash: `https://stackpractices.com/{tipo}/{slug}/` y `https://stackpractices.com/es/{tipo}/{slug}/`.

### 1.3 HTTP y estado

Para URLs en producción:

- `HTTP 200` en EN y ES.
- No `soft 404` (página con status 200 pero contenido de "not found").
- No redirect chains innecesarias.
- No bucles de redirección.

### 1.4 Indexabilidad

- `robots.txt` permite el rastreo de `/{tipo}/{slug}/`.
- `X-Robots-Tag` y `meta robots` no bloquean la página.
- No `noindex` accidental.
- Astro genera HTML estático; la página no requiere JS para mostrar el contenido principal.

### 1.5 Canonical

- Canonical self-referencing correcta.
- Canonical coincide con la URL de la versión EN (`/{tipo}/{slug}/`) y ES (`/es/{tipo}/{slug}/`).
- No hay canonical contradictorias entre HTML, sitemap y redirects.
- La versión ES no canonicaliza a la EN ni viceversa (usa `hreflang` u otra señal).

### 1.6 Sitemap

- La URL aparece en `public/sitemap.xml` (tras build).
- Formato correcto: `https://stackpractices.com/{tipo}/{slug}/`.
- Fecha `lastmod` presente y coherente con `lastUpdated`.
- No URLs con barra final doble ni variantes incorrectas.

### 1.7 Redirects

- No hay redirecciones 302/307 temporales donde debería haber 301.
- El proyecto no usa `redirects.json` ni `scripts/redirects.json`; verificar que `src/pages/` no genere redirecciones no deseadas para esta ruta.
- No hay redirección de `/tipo/slug` (sin barra) a `/tipo/slug/` si ambas generan contenido duplicado.

### 1.8 Structured data

- JSON-LD válido y parseable.
- Tipos relevantes presentes: `TechArticle`, `WebPage`, `BreadcrumbList`.
- Si hay FAQ: `FAQPage`.
- `BreadcrumbList` apunta a URLs correctas (con trailing slash).
- `TechArticle` usa `headline`, `description`, `author`, `dateModified`, `datePublished` y `mainEntityOfPage`.
- Validar con `npm run content:validate`.

### 1.9 Renderizado

- HTML estático tiene el contenido principal (no solo `<app-root>`).
- H1, título, meta description y primeros párrafos son visibles en el HTML sin ejecutar JS.
- No hay bloqueos de recursos críticos (CSS/JS) por `robots.txt`.

### 1.10 Performance

Si se dispone de datos (Lighthouse, `measure-cwv`, logs de Vercel/Vercel Analytics):

- LCP, INP, CLS.
- Peso de página y número de requests.
- Imágenes sin optimizar.
- Fuentes y third-party scripts.
- Lazy loading de imágenes.

Si no hay datos: `NOT VERIFIED`.

### 1.11 Enlazado interno (técnico)

- Enlaces internos usan `<a href="...">` en Astro; evita enlaces absolutos internos con `https://stackpractices.com` donde un relativo baste.
- No hay enlaces a `/es/...` desde la versión EN ni a `/...` desde ES de forma incorrecta.
- No enlaces con barra final doble.
- No enlaces rotos (`404`) en el cuerpo ni en `relatedResources`.
- No uso del patrón antiguo `/tipo/categoria/slug`; el publicado es `/{tipo}/{slug}/`.

### 1.12 Páginas especiales y 404

- `/404/` y `/es/404/` no deben aparecer en `sitemap.xml` o deben tener `noindex`.
- `/search/` y `/es/search/` deben gestionarse correctamente (noindex o sitemap según decida el proyecto).
- No `soft 404` (páginas sin contenido que devuelven 200).

### 1.13 Paridad técnica bilingüe

- Ambas URLs (EN y ES) responden correctamente.
- Ambas están en `sitemap.xml`.
- Ambas tienen canonical self-referencing correcta y coherente.
- Ambas tienen structured data equivalente.
- `lastmod` en sitemap coherente con `lastUpdated` de ambas versiones.

## Output obligatorio

```text
## Auditoría técnica

### Indexabilidad
`INDEXABILIDAD: PASS / WARNING / FAIL`
Justificación corta.

### Canonical
`RIESGO CANONICAL: NONE / LOW / MEDIUM / HIGH / CRITICAL`
Justificación.

### Sitemap
`SITEMAP: OK / MISSING / WRONG URL / OUTDATED`

### Redirects
`REDIRECTS: OK / WARNING / FAIL`

### Structured data
`STRUCTURED DATA: VALID + ELIGIBLE / VALID NOT ELIGIBLE / INVALID / MISSING`

### Performance
`PERFORMANCE: NOT VERIFIED / GOOD / NEEDS IMPROVEMENT / POOR`
Métricas si existen.

### Enlaces internos
`ENLACES INTERNOS: OK / WARNING / FAIL`
- Enlaces rotos: ...
- Patrón antiguo `/tipo/categoria/slug`: ...
- Enlaces de idioma incorrectos: ...

### Páginas especiales (404 / search)
`PÁGINAS ESPECIALES: OK / WARNING / FAIL`

### Paridad técnica bilingüe
`PARIDAD TÉCNICA BILINGÜE: PASS / WARNING / FAIL`

### Puntaje técnico
`PUNTAJE TÉCNICO: X/10`

### Top 3 arreglos técnicos
1. ...
2. ...
3. ...
```

## Reglas

- No edites `public/sitemap.xml`, `dist/` ni componentes Astro.
- Si algo no puede verificarse, marca `NOT VERIFIED`.
- No recomiendes cambios en `.npmrc`, CI/CD o seguridad.
- Todo el output debe estar en español.
