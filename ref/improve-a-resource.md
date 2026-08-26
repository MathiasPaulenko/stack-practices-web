# Prompt maestro — Mejorar un recurso de StackPractices

> StackPractices.com
> Prompt orquestador que ejecuta el skill `content-improvement` en modo full
> sobre un recurso, usando el checklist de auditoría como input.
> El agente aplica los arreglos, valida, verifica medios visuales y companion repo,
> y pide aprobación antes de commit.
>
> Flujo completo: `ref/flujo-mejoras-contenido.md`

---

## Cómo usar este prompt

Copia el bloque de la sección **Prompt** más abajo, reemplaza `{N}` con el
número del recurso en `ref/checklist-top-recursos-mejoras.md` (o usa un slug
tipo `recipes/api-documentation-openapi`), y pégalo en tu agente.

**Requisito previo:** el recurso debe tener un checklist de auditoría en
`ref/audit/reports/{tipo}-{slug}-audit.md`. Si no existe, ejecuta primero
el prompt de `ref/audit-a-resource.md`.

El agente:
1. Resolverá el recurso (slug, tipo, archivos EN/ES).
2. Leerá el checklist de auditoría y las reglas aplicables.
3. Ejecutará el skill `content-improvement` en sus 6 fases (0-5).
4. Priorizará arreglos del checklist (CRITICAL → HIGH → MEDIUM).
5. Verificará diagramas Mermaid (SVG, lightbox, paridad EN/ES).
6. Verificará companion repo (meta.json, archivos, build del catálogo).
7. Validará con la secuencia de comandos del proyecto.
8. Pedirá aprobación antes de commit.

---

## Prompt

```text
Eres un equipo senior de mejora de contenido y SEO para StackPractices.com.
Tu objetivo es mejorar el recurso {N} de ref/checklist-top-recursos-mejoras.md
en modo full, usando el checklist de auditoría como input, aplicando los
arreglos necesarios, validando y pidiendo aprobación antes de commit.

Aplicas los arreglos. Sí editas los archivos del recurso. No haces commit
ni push sin aprobación explícita.

---

## FASE 0 — Resolver el recurso y diagnosticar

1. Lee ref/checklist-top-recursos-mejoras.md y extrae la línea del recurso {N}.
   Si {N} es un slug (ej: recipes/api-documentation-openapi), úsalo directamente.
2. Identifica:
   - tipo: recipes | patterns | guides | docs
   - slug: kebab-case
   - topic: subcarpeta si existe (ej: api, data, security)
3. Resuelve las rutas locales:
   - EN: src/content/{tipo}/{topic}/{slug}.md
   - ES: src/content/{tipo}/{topic}/{slug}.es.md
4. Si falta la versión ES, detente y pide al usuario que la cree antes de continuar.
5. Lee el checklist de auditoría en:
   ref/audit/reports/{tipo}-{slug}-audit.md
   Si no existe, detente y pide al usuario que ejecute primero la auditoría
   con el prompt de ref/audit-a-resource.md.
6. Lee los archivos de reglas aplicables:
   - AGENTS.md (raíz del proyecto)
   - src/content/{tipo}/AGENTS.md
   - ref/docs/roadmap.md (si existe)
7. Invoca el skill content-improvement en modo full.
8. Ejecuta el diagnóstico inicial:
   - Estado base del recurso (longitud, estructura, frontmatter).
   - Thin content check (longitud mínima por tipo).
   - AI detection línea base:
     python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.md
     python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.es.md
     Guarda los outputs en ref/output/.
     Si python no está disponible, marca AI detection como NOT VERIFIED.
   - Inventario de medios visuales (bloques mermaid, imágenes, SVGs).
   - Estado del companion repo (ver FASE 6).
9. Antes de editar, verifica el estado del working tree con git status
   para no sobrescribir cambios manuales del usuario.

---

## FASE 1 — Quick wins SEO/frontmatter (máximo 5 cambios)

Aplica los arreglos CRITICAL y HIGH del checklist que correspondan a
frontmatter y SEO on-page. Máximo 5 cambios para evitar reescrituras
prematuras. Ejemplos:

- Corregir metaDescription (> 170 chars o < 50 chars).
- Corregir title (> 60 chars o duplicado).
- Corregir relatedResources (rotos, barra final, orden EN/ES distinto).
- Corregir topics (valores fuera del enum).
- Corregir lastUpdated desactualizado.
- Corregir jerarquía de headings (H1 duplicado, saltos H2→H4).

Verifica que los cambios se aplican en EN y ES cuando corresponda.

---

## FASE 2 — Calidad de contenido + humanización (máximo 4 rondas)

Antes de reescribir, ejecuta:
  python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.md
  python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.es.md

Corrige los patrones detectados antes de reescribir oraciones.

Aplica los arreglos MEDIUM del checklist que correspondan a:
- Contenido thin (expandir secciones con sustancia, no con relleno).
- Patrones IA (palabras rojas, frases genéricas, aperturas genéricas).
- Estructura (secciones ausentes, secciones redundantes).
- Information gain (añadir ejemplos originales, trade-offs, edge cases).
- Best Practices y Common Mistakes específicas del dominio.
- FAQ con preguntas reales y respuestas cortas.

Después de las rondas, ejecuta:
  python scripts/ai-detect-content.py src/content/{tipo}/{topic}/{slug}.md \
    --es src/content/{tipo}/{topic}/{slug}.es.md --model desklib

Guarda los outputs en ref/output/.

Si python no está disponible, marca AI detection como NOT VERIFIED
y continúa con las correcciones manuales.

IMPORTANT: No elimines contenido técnico para bajar la puntuación IA.
No inventes herramientas, versiones, normas o datos.

---

## FASE 3 — Paridad EN/ES

Verifica y corrige:

- Misma estructura y orden de secciones en EN y ES.
- Metadatos traducidos con longitudes correctas.
- Código y ejemplos equivalentes (comentarios traducidos si es idiomático).
- relatedResources y lastUpdated coincidentes.
- Sin anglicismos crudos en ES donde haya alternativa idiomática.
- Alt text de imágenes/diagramas traducido en ES.
- Misma cantidad de bloques mermaid en EN y ES.

---

## FASE 4 — Diagramas Mermaid e imágenes

### 4.1 Verificar si el recurso necesita un diagrama

Si el recurso NO tiene diagramas y se beneficiaría de uno
(ej: flujos de arquitectura, comparaciones visuales, decision trees):

1. Añade un bloque mermaid directamente en el Markdown (EN y ES)
   en la sección más adecuada (ej: Explanation, When to Use).
2. Usa flowchart LR (horizontal) por defecto. Solo usa flowchart TD
   (vertical) si el contenido justifica una estructura vertical.
3. Mantén el diagrama simple, etiquetado y equivalente EN/ES.
4. No inventes diagramas decorativos: solo añade uno si mejora la
   comprensión del recurso.

### 4.2 Si el recurso ya tiene diagramas Mermaid

Verifica que:

1. Los bloques mermaid usan flowchart LR (horizontal) por defecto.
2. El diagrama tiene paridad EN/ES (mismo número de bloques, contenido equivalente).
3. El diagrama no es decorativo: aporta información que el texto no cubre.
4. El tamaño del diagrama es razonable (relación de aspecto equilibrada,
   no excesivamente ancho ni alto).

### 4.3 Renderizar SVGs

Después de añadir o modificar bloques mermaid, ejecuta:

  npm run mermaid:render

Esto genera los SVGs estáticos en public/assets/diagrams/.
Verifica que los SVGs se generaron para EN y ES.

### 4.4 Verificar imágenes (PNG, JPG, SVG estáticos)

Si el recurso tiene imágenes (etiquetas ![alt](src)):

1. El archivo existe en public/ o src/assets/.
2. Alt text descriptivo (no vacío, no genérico).
3. loading="lazy" presente.
4. Formato optimizado (preferir WebP/AVIF sobre PNG/JPG).
5. Tamaño < 200KB.
6. Responsive (no excede el contenedor en móvil).

---

## FASE 5 — Companion repo (stack-practices-resources)

### 5.1 Verificar si el recurso necesita companion

Si el recurso contiene ejemplos multi-archivo, plantillas descargables
o proyectos completos que pertenecerían al repo hermano:

1. Verifica si existe:
   ../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json
2. Si no existe, crea la carpeta y los archivos necesarios:
   - meta.json con los campos: title, title_es, description, description_es,
     type, topic, slug, source_urls (URL EN del recurso), language, tags, files.
   - Sube los archivos de ejemplo (código, YAML, plantillas) a esa carpeta.
   - Crea README.md y README.es.md si es útil.
3. Si el recurso solo contiene snippets inline cortos, no es necesario
   crear companion repo — márcalo como "no aplica" en el resumen.

### 5.2 Si el companion ya existe

Verifica que:

1. meta.json tiene todos los campos requeridos.
2. Los archivos listados en files existen en la carpeta.
3. source_urls apunta a la URL EN del recurso.
4. Hay README.md y README.es.md (opcional pero recomendado).
5. Ejecuta node scripts/build-catalog.js en el repo hermano y verifica
   que pasa sin errores.

### 5.3 Reglas del companion repo

- No hagas commit ni push del repo hermano sin aprobación explícita.
- Mantén los cambios del companion repo separados de los cambios del repo principal.

---

## FASE 6 — Validación técnica (parar en el primer fallo)

Ejecuta la validación en este orden y detente en el primer fallo:

  npm run content:quality
  npm run content:links
  npm run content:validate
  npm run check
  npm run mermaid:render    (si hay diagramas)
  npm run build
  npm run sitemap

Si algún comando falla:

1. Analiza el error.
2. Corrige la causa raíz.
3. Re-ejecuta el comando que falló.
4. Continúa con la secuencia.

No continúes con el siguiente comando si el anterior falla.

---

## FASE 7 — Verificación post-build

Después de npm run build, verifica en el HTML del build:

### 7.1 Mermaid / SVGs

1. El HTML del recurso en dist/{tipo}/{slug}/index.html contiene
   <img class="mermaid-diagram">.
2. El SVG referenciado existe en dist/assets/diagrams/{slug}-{n}.svg.
3. El script /lightbox.js está presente en el HTML (click-to-zoom).
4. No hay código mermaid raw como texto (debe ser <img>).
5. Igual para la versión ES en dist/es/{tipo}/{slug}/index.html.
6. Paridad EN/ES: mismo número de bloques, SVGs EN y ES generados.

### 7.2 Companion repo

1. meta.json tiene todos los campos requeridos.
2. Los archivos listados en files existen.
3. node scripts/build-catalog.js en el repo hermano pasa sin errores.

### 7.3 Móvil (verificación estructural)

Si no tienes acceso a navegador, verifica en el HTML:

1. <meta name="viewport"> presente.
2. CSS usa media queries o Tailwind responsive classes.
3. No hay elementos con width fijo > 375px.
4. .mermaid-diagram tiene max-width: 100%.

Si tienes acceso a navegador (wavexis, playwright):
1. Abre la URL en viewport 375px.
2. Verifica que no hay overflow horizontal.
3. Verifica que los diagramas son legibles o click-to-zoom funciona.
4. Verifica que el lightbox abre con tap y cierra con la X.

---

## FASE 8 — Resumen y aprobación

Genera un resumen tabular con:

| Categoría | Cambios aplicados | Estado |
|-----------|-------------------|--------|
| Frontmatter SEO | ... | OK |
| Contenido | ... | OK |
| Humanización | ... | OK |
| Paridad EN/ES | ... | OK |
| Diagramas Mermaid | ... | OK / N/A |
| Imágenes | ... | OK / N/A |
| Companion repo | ... | OK / N/A / No aplica |
| Validación técnica | ... | OK |
| Móvil | ... | OK / NOT VERIFIED |

Además incluye:

- git status (archivos modificados).
- git diff --stat (resumen de cambios por archivo).
- Items OUT OF SCOPE (hallazgos del checklist que requieren trabajo manual
  fuera del skill: ej: speakable schema, HTTP 301, assets descargables,
  backlinks outreach, GA4 config).
- Estado del companion repo (creado / modificado / no aplica).
- Pide aprobación explícita para commit/push.

---

## Reglas críticas

- No inventes reglas que no están en los AGENTS.md. El checklist puede
  contener hallazgos que ya fueron corregidos en AGENTS.md — ignora los
  hallazgos que contradigan las reglas actuales.
- El layout RecipeArticle.astro renderiza el H1 desde el title. NO agregues
  H1 al body.
- Las secciones "What Works", "Troubleshooting", "See Also", "Further Reading"
  son válidas. NO las elimines ni las renombres.
- No hay límite máximo de FAQ. El mínimo es 3-5. NO reduzcas FAQ a menos
  que el checklist lo indique como item MEDIUM con justificación.
- metaDescription: 50-160 recomendado, 170 hard max.
- No elimines contenido técnico para bajar la puntuación IA.
- No inventes herramientas, versiones, normas o datos.
- No hagas commit/push sin aprobación explícita del usuario.
- No hagas commit/push del repo hermano sin aprobación explícita.
- Prioriza los items CRITICAL y HIGH del checklist antes que los MEDIUM.
- Los items LOW y los que requieren trabajo manual fuera del skill
  márcalos como "OUT OF SCOPE — requiere trabajo manual" en el resumen final.
- Todo el output debe estar en español.
```

---

## Ejemplos de uso

### Ejemplo 1 — Recurso número 1 del checklist

```text
Mejora el recurso número 1 de ref/checklist-top-recursos-mejoras.md en modo full,
usando el checklist de auditoría como input.
```

El agente leerá `ref/audit/reports/recipes-api-documentation-openapi-audit.md`,
aplicará los arreglos del checklist siguiendo las 8 fases, validará con la
secuencia de comandos y pedirá aprobación antes de commit.

### Ejemplo 2 — Slug directo

```text
Mejora el recurso recipes/api-documentation-openapi en modo full,
usando el checklist de auditoría como input.
```

### Ejemplo 3 — Sin checklist previo

Si no existe el checklist de auditoría, el agente se detendrá y pedirá
que ejecutes primero `ref/audit-a-resource.md`:

```text
No existe ref/audit/reports/recipes-api-documentation-openapi-audit.md.
Ejecuta primero el prompt de ref/audit-a-resource.md para generar el checklist.
```

---

## Fases del skill content-improvement

Este prompt sigue las fases del skill `content-improvement`:

| Fase | Propósito | Qué hace |
|------|-----------|----------|
| 0 | Diagnóstico | Estado base, thin content, AI detection, medios visuales, companion |
| 1 | Quick wins SEO | Máximo 5 cambios de frontmatter y SEO on-page |
| 2 | Calidad + IA | Máximo 4 rondas de mejora de contenido y humanización |
| 3 | Paridad EN/ES | Estructura, metadatos, código, diagramas equivalentes |
| 4 | Diagramas e imágenes | Mermaid SVG, lightbox, imágenes optimizadas |
| 5 | Companion repo | meta.json, archivos, build del catálogo |
| 6 | Validación técnica | content:quality → links → validate → check → build → sitemap |
| 7 | Verificación post-build | HTML, SVGs, lightbox, móvil, companion |
| 8 | Resumen y aprobación | Tabla de cambios, git status, OUT OF SCOPE, aprobación |

---

## Archivos relevantes

| Archivo | Propósito |
|---------|-----------|
| `ref/audit-a-resource.md` | Prompt de auditoría (ejecutar antes) |
| `ref/audit/reports/{tipo}-{slug}-audit.md` | Checklist de auditoría (input) |
| `.devin/skills/content-improvement/SKILL.md` | Skill con las fases de mejora |
| `AGENTS.md` | Reglas generales del proyecto |
| `src/content/{tipo}/AGENTS.md` | Reglas por tipo de contenido |
| `scripts/render-mermaid.mjs` | Renderiza bloques mermaid a SVG estático |
| `public/assets/diagrams/` | SVGs generados por `npm run mermaid:render` |
| `public/lightbox.js` | Click-to-zoom para imágenes y SVGs |
| `../stack-practices-resources/` | Repo hermano con ejemplos descargables |
