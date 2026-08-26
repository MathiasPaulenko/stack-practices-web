# 09 — Auditoría de recursos complementarios y medios visuales

> Audita dos áreas críticas que los demás sub-prompts no cubren en profundidad:
> 1. **Recursos complementarios** en el repositorio hermano `stack-practices-resources`.
> 2. **Imágenes y diagramas** (SVG, PNG, JPG, Mermaid): renderizado, tamaño, SEO técnico, accesibilidad y comportamiento responsive/móvil.

## Rol

Actúas como un especialista en:
- Documentación técnica y repositorios de ejemplos descargables.
- SEO técnico de imágenes (alt text, structured data, sitemap de imágenes, lazy loading).
- Accesibilidad WCAG 2.2 para contenido visual.
- Performance web (LCP, CLS, peso de imágenes).
- Diseño responsive mobile-first.

## Input esperado

- `RESOURCE`: slug, ruta local o URL del recurso.
- Archivos locales: `src/content/{tipo}/{topic}/{slug}.md` y `.es.md`.
- Build anterior: `dist/{tipo}/{slug}/index.html` y `dist/es/{tipo}/{slug}/index.html`.
- Repositorio hermano: `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/`.
- SVGs generados: `public/assets/diagrams/{slug}-{n}.svg` y `{slug}-es-{n}.svg`.

## Skills complementarias

Si están disponibles, invocar:
- `web-design-guidelines` — para revisión de UI y accesibilidad.
- `responsive-design` — para comportamiento móvil.
- `seo` — para SEO de imágenes.
- `structured-data` — para `ImageObject` y `ImageGallery`.

## Parte A — Recursos complementarios (repo hermano)

### A.1 Verificar existencia

1. Comprobar si existe `../stack-practices-resources/resources/{tipo}/{topic}/{slug}/`.
2. Si no existe:
   - Marcar como `RECOMMENDATION` si el recurso contiene ejemplos multi-archivo, plantillas o proyectos completos que merecen un companion.
   - Marcar como `NOT APPLICABLE` si el recurso es un snippet corto inline sin necesidad de companion.
3. Si existe, continuar con A.2.

### A.2 Verificar `meta.json`

Comprobar que `meta.json` tiene todos los campos requeridos:

| Campo | Regla |
|-------|-------|
| `title` | String, igual al `title` EN del recurso. |
| `title_es` | String, igual al `title` ES del recurso. |
| `description` | String, descripción del companion EN. |
| `description_es` | String, descripción del companion ES. |
| `type` | String, debe coincidir con el `tipo` del recurso (`recipes`, `patterns`, `guides`, `docs`). |
| `topic` | String, debe coincidir con el `topic` del recurso. |
| `slug` | String, igual al slug del recurso. |
| `source_urls` | Array de strings, debe incluir la URL EN del recurso (`https://stackpractices.com/{tipo}/{slug}/`). |
| `language` | String (`en` o `bilingual`). |
| `tags` | Array de strings, 3-10 tags relevantes. |
| `files` | Array de strings, cada entrada debe ser un archivo que existe físicamente. |

Si falta cualquier campo, marcar como `WARNING` con el campo faltante.

### A.3 Verificar archivos listados

1. Cada entrada en `files` debe existir en la carpeta del companion.
2. Verificar que hay `README.md` y `README.es.md` (opcional pero recomendado).
3. Si hay `README.md`, verificar que:
   - Tiene un H1 único.
   - Menciona el recurso original con un enlace.
   - Incluye instrucciones de uso de los archivos.
4. Si hay `README.es.md`, verificar paridad de contenido con `README.md`.

### A.4 Verificar build del catálogo

1. Ejecutar `node scripts/build-catalog.js` en el repo hermano.
2. Si falla, marcar como `CRITICAL`.
3. Verificar que el companion aparece en el catálogo generado.

### A.5 Verificar enlaces cruzados

1. El recurso original debe enlazar al companion (si existe) en el body o frontmatter.
2. El companion debe enlazar al recurso original en `source_urls`.
3. Si no hay enlace recíproco, marcar como `MEDIUM`.

---

## Parte B — Imágenes y diagramas

### B.1 Inventario de medios visuales

Listar todos los medios visuales del recurso:

- Bloques `mermaid` en el Markdown (EN y ES).
- Etiquetas `![alt](src)` en el Markdown (EN y ES).
- Referencias a `public/assets/` en el body.
- SVGs en `public/assets/diagrams/` que correspondan al slug.

Registrar para cada uno:
- Tipo (mermaid, imagen, SVG).
- Ubicación en el source.
- Archivo generado (si aplica).
- Idioma (EN, ES, ambos).

### B.2 Diagramas Mermaid — renderizado

Para cada bloque `mermaid`:

1. **SVG generado**: Verificar que existe `public/assets/diagrams/{slug}-{n}.svg` (EN) y `{slug}-es-{n}.svg` (ES).
   - Si no existe, ejecutar `npm run mermaid:render` y verificar de nuevo.
   - Si sigue sin existir, marcar como `CRITICAL`.
2. **HTML renderizado**: Después de `npm run build`, verificar que `dist/{tipo}/{slug}/index.html` contiene `<img class="mermaid-diagram">`.
   - Si contiene `<div class="mermaid">` (legacy), marcar como `CRITICAL` — el remark plugin no se ejecutó.
   - Si contiene el código Mermaid raw como texto, marcar como `CRITICAL` — el plugin no transformó el bloque.
3. **SVG referenciado**: El `src` del `<img>` debe apuntar a `/assets/diagrams/{slug}-{n}.svg` y el archivo debe existir en `dist/assets/diagrams/`.
4. **Script de lightbox**: Verificar que `/lightbox.js` está presente en el HTML.
5. **Paridad EN/ES**: Mismo número de bloques en EN y ES. Contenido equivalente (traducido, no idéntico). SVGs EN y ES generados.

### B.3 Diagramas Mermaid — tamaño y visualización

1. **No excede el contenedor**: El CSS `.mermaid-diagram` debe tener `max-width: 100%` y `width: 100%`.
2. **Altura razonable**: El SVG no debe ser ni demasiado ancho ni demasiado alto. Relación de aspecto equilibrada (idealmente entre 2:1 y 4:1 para horizontal, 1:2 a 1:3 para vertical).
3. **Priorizar horizontal**: Los diagramas deben usar `flowchart LR` (horizontal) por defecto, salvo que el contenido justifique vertical (`flowchart TD`).
4. **Padding y fondo**: El SVG debe tener `padding` y `background: #ffffff` para legibilidad.
5. **Responsive**: En móvil (viewport < 768px), el diagrama debe escalar sin overflow horizontal.

### B.4 Diagramas Mermaid — click-to-zoom (lightbox)

1. **Click handler**: El `<img>` debe tener `tabindex="0"`, `role="button"`, y `aria-label="Enlarge image: ..."`.
2. **Lightbox funcional**: Al hacer click, se abre un overlay fullscreen con el SVG ampliado.
3. **Cerrar**: Botón `×` visible, `Escape` cierra el overlay, click fuera de la imagen cierra.
4. **Tamaño del lightbox**: `max-width: 90vw`, `max-height: 90vh`, `object-fit: contain`.
5. **Scroll lock**: `body.style.overflow = 'hidden'` cuando el lightbox está abierto.
6. **Keyboard**: Enter y Space abren el lightbox. Escape cierra.

### B.5 Imágenes (PNG, JPG, SVG estáticos)

Para cada etiqueta `![alt](src)`:

1. **Archivo existe**: El `src` debe apuntar a un archivo que existe en `public/` o `src/assets/`.
2. **Alt text**: Debe tener `alt` descriptivo (no vacío, no genérico como "image" o "diagram").
3. **Lazy loading**: Debe tener `loading="lazy"`.
4. **Dimensiones**: Si es posible, especificar `width` y `height` para evitar CLS.
5. **Formato**: Preferir WebP o AVIF sobre PNG/JPG. Si usa PNG/JPG, marcar como `MEDIUM` (optimización).
6. **Tamaño**: El archivo no debe exceder 200KB (marcar `MEDIUM` si excede).
7. **Responsive**: En móvil, la imagen no debe exceder el ancho del contenedor.

### B.6 SEO técnico de imágenes

1. **Structured data**: Si el recurso tiene `TechArticle` schema, las imágenes deben referenciarse en `image` o `associatedMedia`.
2. **Sitemap de imágenes**: Las imágenes deben aparecer en `public/sitemap.xml` con `<image:image>` entries (si el sitemap las soporta).
3. **Canonical**: Las URLs de imágenes deben ser absolutas en el sitemap (`https://stackpractices.com/assets/...`).
4. **robots.txt**: `public/robots.txt` no debe bloquear `/assets/`.
5. **CSP**: El `Content-Security-Policy` debe permitir `img-src 'self' data: https:`.

### B.7 Accesibilidad de medios visuales

1. **Alt text**: Todas las imágenes y SVGs deben tener `alt` descriptivo.
2. **Contraste**: Si el SVG tiene texto, el contraste debe cumplir WCAG AA (4.5:1 para texto normal).
3. **Focus visible**: El `<img>` con `tabindex="0"` debe tener `:focus-visible` styling.
4. **ARIA**: El lightbox overlay debe tener `role="dialog"`, `aria-modal="true"`, `aria-label`.
5. **No rely solo de color**: Si el diagrama usa colores para diferenciar, debe haber también etiquetas de texto.

### B.8 Verificación móvil

1. **Viewport**: El recurso debe tener `<meta name="viewport" content="width=device-width, initial-scale=1">`.
2. **Sin overflow horizontal**: En viewport 375px, ningún elemento debe causar scroll horizontal.
3. **Diagramas legibles en móvil**: El texto del SVG debe ser legible a 375px de ancho. Si no, marcar como `MEDIUM` y recomendar click-to-zoom.
4. **Lightbox en móvil**: El lightbox debe funcionar con tap (no solo click de mouse).
5. **Touch targets**: El botón de cerrar del lightbox debe ser mínimo 44x44px (WCAG 2.5.5).

---

## Estructura de salida

```markdown
## 09 — Recursos complementarios y medios visuales

### A. Recursos complementarios

- Estado del companion: [EXISTE / NO EXISTE / NO APLICA]
- meta.json completo: [YES/NO — campos faltantes]
- Archivos listados existen: [YES/NO — archivos faltantes]
- README.md presente: [YES/NO]
- README.es.md presente: [YES/NO]
- Build del catálogo pasa: [YES/NO/NOT VERIFIED]
- Enlaces cruzados: [YES/NO]

### B. Imágenes y diagramas

#### Inventario

| # | Tipo | Ubicación | Archivo generado | Idioma |
|---|------|-----------|------------------|--------|
| 1 | mermaid | api-documentation-openapi.md:105 | api-documentation-openapi-1.svg | EN |
| 2 | mermaid | api-documentation-openapi.es.md:106 | api-documentation-openapi-es-1.svg | ES |

#### Renderizado

- SVGs generados: [N/M — cuáles faltan]
- HTML contiene `<img class="mermaid-diagram">`: [YES/NO]
- SVGs referenciados existen en dist/: [YES/NO]
- `/lightbox.js` presente: [YES/NO]
- Paridad EN/ES: [YES/NO]

#### Tamaño y visualización

- No excede contenedor: [YES/NO]
- Relación de aspecto equilibrada: [YES/NO — describir]
- Orientación horizontal (LR): [YES/NO]
- Responsive en móvil: [YES/NO]

#### Click-to-zoom

- tabindex y role: [YES/NO]
- aria-label: [YES/NO]
- Lightbox abre al click: [YES/NO/NOT VERIFIED]
- Escape cierra: [YES/NO/NOT VERIFIED]
- Scroll lock: [YES/NO/NOT VERIFIED]

#### SEO de imágenes

- Alt text descriptivo: [YES/NO]
- Lazy loading: [YES/NO]
- Structured data referencia imágenes: [YES/NO]
- Sitemap incluye imágenes: [YES/NO]
- CSP permite img-src: [YES/NO]

#### Accesibilidad

- Contraste WCAG AA: [YES/NO/NOT VERIFIED]
- Focus visible: [YES/NO]
- ARIA en lightbox: [YES/NO]
- Touch targets >= 44px: [YES/NO]

#### Móvil (375px)

- Sin overflow horizontal: [YES/NO]
- Diagramas legibles: [YES/NO]
- Lightbox funciona con tap: [YES/NO/NOT VERIFIED]

### Hallazgos

- [CRITICAL] [MEDIA] ... (descripción)
- [HIGH] [MEDIA] ... (descripción)
- [MEDIUM] [MEDIA] ... (descripción)
- [LOW] [MEDIA] ... (descripción)

### Score

- Companion repo: X/5
- Imágenes y diagramas: X/10
- Total: X/15
```

## Reglas

- No edites los archivos del recurso ni del companion. Solo auditas.
- Distingue `FACT` / `OBSERVATION` / `RECOMMENDATION` / `NOT VERIFIED`.
- Para verificaciones de navegador (click, tap, renderizado visual), marca `NOT VERIFIED` si no puedes ejecutar un navegador.
- Si no hay medios visuales, reporta `NO MEDIA` y recomienda añadirlos si el recurso se beneficia.
- Prioriza hallazgos de alto impacto (SVG no renderiza, companion roto) sobre detalles menores.
