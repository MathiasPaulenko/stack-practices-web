# 02 — Auditoría SEO / Frontmatter de StackPractices

> Audita SEO on-page, frontmatter y metadatos de un recurso de StackPractices. Se enfoca en lo que el buscador ve primero y en las reglas duras del proyecto.

## Input esperado

- `src/content/{tipo}/{slug}.md` (ajustar si usa `src/content/{tipo}/{topic}/{slug}.md`)
- `src/content/{tipo}/{slug}.es.md` (o `src/content/{tipo}/{topic}/{slug}.es.md`)
- `src/content/{tipo}/AGENTS.md`
- `AGENTS.md` global
- `src/content.config.ts` (para verificar `topics`)

## Skills complementarias

Si están disponibles, invocar `seo`, `google-ranking-appearance` o `google-seo-fundamentals` para reforzar el análisis.

## Qué inspeccionar

### 2.1 Frontmatter

Revisa en EN y ES:

| Campo | Regla | Estado |
| --- | --- | --- |
| `title` | < 60 caracteres, línea única, sin `>`, idéntico al H1 | |
| `description` | 80-160 caracteres, línea única, gancho claro | |
| `metaDescription` | 120-160 caracteres, línea única, sin `>` | |
| `seo.metaDescription` | debe coincidir con `metaDescription` | |
| `seo.keywords` | 3-10 términos reales, sin keyword stuffing | |
| `slug` | kebab-case, único dentro del tipo | |
| `difficulty` | `beginner` / `intermediate` / `advanced` | |
| `topics` | 1-3 valores del enum en `src/content.config.ts` (p. ej. `api`, `databases`, `security`) | |
| `tags` | 5-10 etiquetas relevantes | |
| `relatedResources` | 2-6 slugs existentes, de distintos tipos, sin barra final | |
| `lastUpdated` | `YYYY-MM-DD`, igual en EN y ES si hay cambios | |
| `author` | presente | |

### 2.2 Duplicación de metadatos

- El `title` no debe duplicarse con otro recurso del sitio.
- `description` y `metaDescription` no deben duplicarse con otro recurso.
- `slug` único dentro de su tipo.

### 2.3 H1 y jerarquía de headings

- Un solo `#` en el body.
- El H1 debe ser idéntico al `title`.
- Jerarquía lógica `##` → `###` sin saltos.
- No encabezados vacíos o con solo emojis/formato.

### 2.4 Primer párrafo / Overview

- No empiece con `This guide covers...`, `X is the process of...`, `In this article...`.
- Debe plantear un problema o escenario real.

### 2.5 Enlaces internos

#### Enlaces contextuales en el body

- 2-3 enlaces contextuales en el body con anclas descriptivas (`[REST API Pagination Recipe](/recipes/rest-api-pagination)`).
- Anclas que describen el destino, no `click here` ni `read more`.
- No enlaces rotos ni placeholders (`[texto](link)`, `example.com`).
- No uso del patrón antiguo `/tipo/categoria/slug` si el publicado es `/{tipo}/{slug}/`; corregir a `/{tipo}/{slug}/`.

#### `relatedResources`

- `relatedResources` correctos, existentes y de distintos tipos.
- Slugs sin barra final.
- Mismo orden en EN y ES.
- No enlaces a `/tipo/slug/` (con barra final) en `relatedResources`.

#### Brechas de enlaces bidireccionales

- Si el recurso A enlaza a B en el body o en `relatedResources`, ¿B enlaza de vuelta a A o lo incluye en sus `relatedResources`?
- Detectar pares huérfanos: dos recursos del mismo cluster que deberían referenciarse mutuamente y no lo hacen.
- Marcar como `MEDIUM` si el gap rompe la autoridad del cluster.

#### Páginas con pocos enlaces entrantes

- Contar cuántos recursos enlazan a este recurso (body + `relatedResources`).
- Si <= 2 enlaces entrantes, reportar como oportunidad de `LINKS`.
- Si el recurso es un `doc` y tiene 0-1 enlaces en el cuerpo, reportar como `MEDIUM`/`HIGH` (los docs suelen usarse como plantillas y necesitan contexto).

#### Outlinks y dead-ends

- El recurso debe tener al menos una salida clara: enlaces internos, `relatedResources` o CTA hacia recursos relacionados.
- No dead-ends que corten el flujo de navegación.

### 2.6 URL y canonical (desde el punto de vista SEO)

- URL coherente con `slug`.
- Canonical self-referencing.
- Versión ES con `/es` y canonical propia.

### 2.7 CTR en SERP

- `title` atractivo y exacto; palabra clave principal al inicio cuando sea natural.
- `metaDescription` con beneficio concreto, no definición de diccionario.
- Diferenciación clara vs. competidores.

### 2.8 Paridad EN/ES en SEO

- Mismos `relatedResources` y mismo orden.
- `title`, `description`, `metaDescription` y `seo.keywords` traducidos y con longitudes correctas.
- `lastUpdated` idéntico.
- H1 idéntico en sentido (no necesariamente traducción literal, pero coherente).
- Enlaces internos equivalentes en ambas versiones.
- URLs canónicas correctas: EN `/{tipo}/{slug}/`, ES `/es/{tipo}/{slug}/`.

### 2.9 Open Graph y social sharing

- `og:title` presente y atractivo.
- `og:description` presente.
- `og:image` presente y válida.
- `og:url` y `og:locale` correctos (EN y ES).
- Twitter/X cards (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) si aplica.

Si no se puede verificar: `NOT VERIFIED`.

### 2.10 Schema relevante

- `TechArticle` + `WebPage` + `BreadcrumbList`.
- `FAQPage` si el recurso tiene FAQ.
- Schema validado y coherente con el frontmatter.

### 2.11 Herramientas del repo

Ejecuta o simula el resultado de:

```bash
npm run content:validate
npm run content:quality
```

Reporta si fallarían.

## Output obligatorio

```text
## Auditoría SEO

### Frontmatter (EN)
| Campo | Valor actual | Cumple | Nota |
| --- | --- | --- | --- |
| title | ... | Sí/No | ... |
| description | ... | Sí/No | ... |
| metaDescription | ... | Sí/No | ... |
| slug | ... | Sí/No | ... |
| topics | ... | Sí/No | ... |
| relatedResources | ... | Sí/No | ... |

### Frontmatter (ES)
(misma tabla)

### Headings
`HEADINGS: OK / WARNING / FAIL`

### Enlaces internos
`ENLACES INTERNOS: OK / WARNING / FAIL`

#### Enlaces contextuales en el body
- Cantidad: N
- Rotos / placeholder: ...
- Patrón antiguo `/tipo/categoria/slug`: ...

#### relatedResources
- Cantidad: N
- Rotos: ...
- Barra final incorrecta: ...
- Mismo orden EN/ES: Sí/No

#### Brechas de enlaces bidireccionales
- Pares faltantes: ...

#### Enlaces entrantes
- Recursos que enlazan a este: N
- Bajo (< 3): Sí/No

#### Docs con 0-1 enlaces en el body
- (si aplica) Sí/No — detalle

### Riesgo de metadatos duplicados
`META DUPLICADA: NONE / LOW / HIGH`

### CTR en SERP
`POTENCIAL CTR: LOW / MEDIUM / HIGH`

### Open Graph
`OPEN GRAPH: OK / MISSING / NEEDS IMPROVEMENT / NOT VERIFIED`

### Paridad SEO bilingüe
`PARIDAD SEO BILINGÜE: PASS / WARNING / FAIL`

### Puntaje SEO
`PUNTAJE SEO: X/15`

### Top 5 arreglos SEO
1. ...
2. ...
3. ...
4. ...
5. ...
```

## Reglas

- No reescribas el frontmatter. Solo audita y reporta.
- Si un campo no existe, reporta `MISSING`.
- Si no puedes verificar algo, `NOT VERIFIED`.
- Todo el output debe estar en español.
