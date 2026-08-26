# Prompt maestro — Re-auditar un recurso tras mejoras

> StackPractices.com
> Prompt orquestador que re-audita un recurso después de ejecutar
> `ref/improve-a-resource.md`, compara con el score anterior, verifica
> que los problemas detectados por la auditoría fueron resueltos, y
> actualiza el checklist con el estado final.
>
> NO es una auditoría completa de 8 sub-auditorías. Es una verificación
> focalizada que:
> 1. Re-mide los puntajes de cada dimensión.
> 2. Compara ANTES vs DESPUÉS.
> 3. Verifica que cada issue del checklist original fue resuelto.
> 4. Detecta regresiones introducidas por las mejoras.
> 5. Actualiza el checklist con el estado final.
>
> Flujo completo: `ref/flujo-mejoras-contenido.md`

---

## Cómo usar este prompt

Copia el bloque de la sección **Prompt** más abajo, reemplaza `{N}` con el
número del recurso en `ref/checklist-top-recursos-mejoras.md` (o usa un slug
tipo `recipes/api-documentation-openapi`), y pégalo en tu agente.

**Requisitos previos:**

1. El recurso debe tener un checklist de auditoría en
   `ref/audit/reports/{tipo}-{slug}-audit.md` (con score anterior).
2. Debe haberse ejecutado `ref/improve-a-resource.md` sobre el recurso.

El agente:
1. Resolverá el recurso (slug, tipo, archivos EN/ES).
2. Leerá el checklist anterior con los scores y issues.
3. Re-medirá cada dimensión sobre los archivos mejorados.
4. Comparará ANTES vs DESPUÉS.
5. Verificará cada issue del checklist (resuelto / pendiente / out of scope).
6. Detectará regresiones.
7. Ejecutará validación técnica.
8. Verificará medios visuales y companion repo.
9. Actualizará el checklist con el estado final.

---

## Prompt

```text
Eres un equipo senior de auditoría de contenido y SEO para StackPractices.com.
Tu objetivo es re-auditar el recurso {n} de ref/checklist-top-recursos-mejoras.md
después de una ronda de mejoras, comparar con el score anterior, verificar
que los problemas detectados fueron resueltos, y actualizar el checklist
con el estado final.

No editas los archivos del recurso. Solo auditas, comparas y escribes el
checklist actualizado.

---

## FASE 1 — Resolver el recurso y cargar el checklist anterior

1. Lee ref/checklist-top-recursos-mejoras.md y extrae la línea del recurso {N}.
   Si {N} es un slug (ej: recipes/api-documentation-openapi), úsalo directamente.
2. Identifica:
   - tipo: recipes | patterns | guides | docs
   - slug: kebab-case
   - topic: subcarpeta si existe (ej: api, data, security)
3. Resuelve las rutas locales:
   - EN: src/content/{tipo}/{topic}/{slug}.md
   - ES: src/content/{tipo}/{topic}/{slug}.es.md
4. Si falta la versión ES, reporta CRITICAL y detén la re-auditoría.
5. Lee el checklist de auditoría anterior en:
   ref/audit/reports/{tipo}-{slug}-audit.md
   Extrae:
   - Scores anteriores de cada dimensión.
   - Lista de issues (CRITICAL, HIGH, MEDIUM, LOW).
   - Definition of Done.
   - Top 5 acciones.
   Si no existe el checklist, detente y pide al usuario que ejecute primero
   ref/audit-a-resource.md.
6. Lee los archivos de reglas aplicables:
   - AGENTS.md (raíz del proyecto)
   - src/content/{tipo}/AGENTS.md
7. Lee los archivos del recurso (ya mejorados):
   - src/content/{tipo}/{topic}/{slug}.md
   - src/content/{tipo}/{topic}/{slug}.es.md

---

## FASE 2 — Re-medir cada dimensión

Para cada dimensión, mide el estado actual sobre los archivos mejorados
y compara con el score anterior. Reporta ANTES vs DESPUÉS.

### 2.1 SEO On-Page (X/15)

Mide y compara:

- title EN ≤ 60 chars: [medir] → ANTES: X / DESPUÉS: X
- title ES ≤ 60 chars: [medir] → ANTES: X / DESPUÉS: X
- metaDescription EN 50-170 chars: [medir] → ANTES: X / DESPUÉS: X
- metaDescription ES 50-170 chars: [medir] → ANTES: X / DESPUÉS: X
- metaDescription top-level == seo.metaDescription (ambos): [verificar]
- relatedResources 2-6 slugs, mismo orden EN/ES, sin barra final: [verificar]
- lastUpdated actualizado: [verificar]
- Sin H1 manual en el body: [verificar]
- Jerarquía H2 → H3 sin saltos: [verificar]
- Secciones válidas (What Works, Troubleshooting, See Also, Further Reading
  son alternativas válidas según AGENTS.md): [verificar]

Score: PUNTAJE SEO ON-PAGE: X/15 (ANTES: X/15)

### 2.2 SEO Técnico (X/10)

Mide y compara:

- Slug kebab-case único: [verificar]
- Sitemap presence (public/sitemap.xml): [verificar]
- hreflang en sitemap: [verificar]
- Structured data (TechArticle + FAQPage + BreadcrumbList): [verificar]
- Internal links con trailing slash: [verificar]
- Canonical self-referencing EN y ES: [verificar]
- Open Graph (og:title, og:description, og:image, og:url, og:locale): [verificar]
- Paridad técnica EN/ES (H2 count, H3 count, code blocks): [verificar]

Score: PUNTAJE SEO TÉCNICO: X/10 (ANTES: X/10)

### 2.3 Calidad de contenido (X/25)

Mide y compara:

- Body words EN: [medir] (mínimo recipes 1300, patterns 1500, guides 3000, docs 3000)
- Body words ES: [medir]
- Thin content: NONE/LOW/MEDIUM/HIGH/CRITICAL (justificar)
- Information gain: EXCEPTIONAL/HIGH/MODERATE/LOW/NONE
- Riesgo sobre-optimización: NONE/LOW/MEDIUM/HIGH/CRITICAL
- FAQ count EN: [medir] (mínimo 3-5, sin máximo)
- FAQ count ES: [medir]
- Duplicación/canibalización: NONE/LOW/MEDIUM/HIGH/CRITICAL
- Riesgo contenido programático: NONE/LOW/MEDIUM/HIGH/CRITICAL
- Page-worthiness: YES/PROBABLY YES/UNCERTAIN/PROBABLY NO/NO

Score: PUNTAJE CALIDAD CONTENIDO: X/25 (ANTES: X/25)

### 2.4 Humanización (X/15)

Mide y compara:

- Red words (delve, leverage, robust, seamless, etc.): [contar EN y ES]
- Frases genéricas ("This guide covers", "In today's", "In conclusion"): [contar]
- Tokens de código al final de oraciones: [contar EN y ES]
- Voz pasiva: [contar EN y ES]
- Patrones rule-of-three evidentes: [contar]
- Uso excesivo de em dash: [contar]
- Variedad FAQ: % de preguntas que NO empiezan con "How do I" / "¿Cómo"
- Primera persona: [verificar presencia EN y ES]
- Paridad humanización EN/ES: PASS/WARNING/FAIL

Si python está disponible, ejecuta:
  python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.md
  python scripts/ai-detect-patterns.py src/content/{tipo}/{topic}/{slug}.es.md
  python scripts/ai-detect-content.py src/content/{tipo}/{topic}/{slug}.md \
    --es src/content/{tipo}/{topic}/{slug}.es.md --model desklib

Compara los resultados con los del output anterior guardado en ref/output/.
Reporta model_ai_pct ANTES vs DESPUÉS.

Score: PUNTAJE HUMANIZACIÓN: X/15 (ANTES: X/15)

### 2.5 Paridad bilingüe (X/10)

Mide y compara:

- H2 count EN vs ES: [medir]
- H3 count EN vs ES: [medir]
- Code blocks EN vs ES: [medir]
- Paridad frontmatter (title, metaDescription, keywords, relatedResources,
  lastUpdated): [verificar]
- Primera persona paridad: [verificar]
- Secciones ausentes en ES: [listar]
- Anglicismos en ES: [listar]
- Body length EN vs ES: [medir]

Score: PUNTAJE PARIDAD BILINGÜE: X/10 (ANTES: X/10)

### 2.6 Medios visuales y diagramas (X/5)

Mide y compara:

- Número de bloques Mermaid EN: [contar]
- Número de bloques Mermaid ES: [contar]
- Paridad Mermaid EN/ES: YES/NO
- Diagramas usan flowchart LR (horizontal) por defecto: YES/NO
- SVGs generados en public/assets/diagrams/: [verificar con npm run mermaid:render]
- HTML del build contiene <img class="mermaid-diagram">: [verificar tras build]
- SVG referenciado existe en dist/assets/diagrams/{slug}-{n}.svg: [verificar]
- /lightbox.js presente en HTML (click-to-zoom): [verificar]
- <img> tiene alt, loading="lazy", tabindex="0": [verificar]
- Diagrama no es decorativo: aporta información que el texto no cubre: YES/NO
- Tamaño del diagrama razonable (relación de aspecto equilibrada): YES/NO
- Imágenes (PNG/JPG/SVG): [contar]
- Alt text en imágenes (si hay): [verificar]
- Sin overflow horizontal en móvil (375px): [verificar estructural o con navegador]

Score: PUNTAJE MEDIOS VISUALES: X/5 (ANTES: X/5)

### 2.7 Companion repo (X/3)

Mide y compara:

- Existe ../stack-practices-resources/resources/{tipo}/{topic}/{slug}/meta.json:
  YES/NO
- meta.json tiene campos requeridos (title, title_es, description, description_es,
  type, topic, slug, source_urls, language, tags, files): [verificar]
- Archivos en files existen: [verificar]
- README.md presente: YES/NO
- README.es.md presente: YES/NO
- node scripts/build-catalog.js pasa en repo hermano: [verificar]
- Enlaces cruzados (recurso → companion, companion → recurso): [verificar]

Score: PUNTAJE COMPANION REPO: X/3 (ANTES: X/3)

### 2.8 GEO / AI Search (X/5)

Mide y compara:

- Claridad de entidades: HIGH/MEDIUM/LOW
- Densidad factual: HIGH/MEDIUM/LOW
- Citas: SUFFICIENT/INSUFFICIENT/NOT VERIFIED
- Pasajes extraíbles: HIGH/MEDIUM/LOW
- Structured data IA (inLanguage, educationalLevel, speakable): OK/MISSING/NOT VERIFIED
- Paridad GEO bilingüe: PASS/WARNING/FAIL

Score: PUNTAJE GEO: X/5 (ANTES: X/5)

---

## FASE 3 — Verificación de issues del checklist anterior

Para CADA issue del checklist anterior, verifica si fue resuelto.

Clasifica cada issue en una de estas categorías:

### ✅ RESUELTO

El issue fue corregido completamente. Incluye evidence de qué cambió:
- Archivo modificado.
- Línea o sección afectada.
- Valor antes vs después.
- Cómo se verificó.

Ejemplo:
```text
✅ RESUELTO — [HIGH] [SEO] metaDescription ES tenía 180 chars (> 170 max)
  Evidence: src/content/recipes/api/api-documentation-openapi.es.md
  Antes: 180 chars. Después: 158 chars. Verificado con content:validate.
```

### ⚠️ PENDIENTE

El issue NO fue corregido o fue corregido parcialmente. Incluye:
- Justificación de por qué no se resolvió.
- Si requiere trabajo manual fuera del skill.
- Si fue depriorizado a favor de items CRITICAL/HIGH.
- Recomendación de siguiente paso.

Ejemplo:
```text
⚠️ PENDIENTE — [MEDIUM] [SEO] Falta speakable schema en JSON-LD
  Razón: Requiere modificar BaseLayout.astro, fuera del scope del skill.
  Recomendación: Añadir speakable en próxima iteración de desarrollo.
```

### 🔧 OUT OF SCOPE

El issue requiere trabajo manual que no puede ser automatizado por el skill.
Incluye:
- Razón técnica (ej: requiere acceso a GSC, modificar CI/CD, backlinks outreach).
- Si debe ser abordado en otra sesión.

Ejemplo:
```text
🔧 OUT OF SCOPE — [HIGH] [TRAFFIC] CTR anómalamente bajo en USA (0.13%)
  Razón: Requiere acceso a Search Console y análisis de SERP competitivo.
  Recomendación: Sesión manual de análisis de SERP y optimización de snippet.
```

### 🔄 REGRESIÓN

El issue NO existía antes pero apareció tras las mejoras. Esto es CRITICAL.
Incluye:
- Qué se rompió.
- Qué cambio lo causó.
- Cómo reproducirlo.
- Cómo corregirlo.

Ejemplo:
```text
🔄 REGRESIÓN — [CRITICAL] [TECHNICAL] Build falla tras añadir diagrama Mermaid
  Evidence: npm run build falla con error "Cannot find module" en remark-mermaid.
  Causa probable: El bloque mermaid tiene sintaxis inválida.
  Corrección: Verificar sintaxis del bloque mermaid en línea X.
```

---

## FASE 4 — Validación técnica

Ejecuta en orden y detente en el primer fallo:

  npm run content:quality
  npm run content:links
  npm run content:validate
  npm run check
  npm run mermaid:render    (si hay diagramas)
  npm run build
  npm run sitemap

Reporta cada comando como PASS/FAIL con output relevante.

Si algún comando falla:
1. Marca como CRITICAL en el checklist.
2. Intenta identificar la causa.
3. No intentes corregir — solo reporta (la corrección se hace con improve-a-resource).

---

## FASE 5 — Verificación post-build

Después de npm run build, verifica en el HTML del build:

### 5.1 Mermaid / SVGs

1. dist/{tipo}/{slug}/index.html contiene <img class="mermaid-diagram">.
2. SVG referenciado existe en dist/assets/diagrams/{slug}-{n}.svg.
3. /lightbox.js presente en el HTML.
4. No hay código mermaid raw como texto.
5. Igual para dist/es/{tipo}/{slug}/index.html.
6. Paridad EN/ES: mismo número de bloques, SVGs EN y ES generados.

### 5.2 Companion repo

1. meta.json tiene todos los campos requeridos.
2. Archivos listados en files existen.
3. node scripts/build-catalog.js pasa en el repo hermano.

### 5.3 Móvil (verificación estructural)

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
5. Captura screenshot en ref/audit/reports/screenshots/{slug}-mobile-after.png.

---

## FASE 6 — Score comparativo

Reporta una tabla con los scores ANTES vs DESPUÉS:

| Dimensión | Antes | Después | Cambio | Estado |
|-----------|-------|---------|--------|--------|
| SEO On-Page | X/15 | X/15 | +/- | ✅/⚠️ |
| SEO Técnico | X/10 | X/10 | +/- | ✅/⚠️ |
| Calidad Contenido | X/25 | X/25 | +/- | ✅/⚠️ |
| Humanización | X/15 | X/15 | +/- | ✅/⚠️ |
| Paridad Bilingüe | X/10 | X/10 | +/- | ✅/⚠️ |
| Medios Visuales | X/5 | X/5 | +/- | ✅/⚠️ |
| Companion Repo | X/3 | X/3 | +/- | ✅/⚠️ |
| GEO / AI Search | X/5 | X/5 | +/- | ✅/⚠️ |
| **TOTAL** | **X/100** | **X/100** | **+/-** | ✅/⚠️ |

Interpretación del cambio:
- +10 puntos o más: MEJORA SIGNIFICATIVA ✅
- +5 a +9 puntos: MEJORA MODERADA ✅
- +1 a +4 puntos: MEJORA MENOR ⚠️
- 0 puntos: SIN CAMBIOS ⚠️
- Puntos negativos: REGRESIÓN 🔄 (CRITICAL)

---

## FASE 7 — Resumen de issues

Reporta un resumen tabular de todos los issues del checklist anterior:

| Issue | Severidad | Categoría | Estado | Evidence |
|-------|-----------|-----------|--------|----------|
| metaDescription ES > 170 chars | HIGH | SEO | ✅ RESUELTO | 180→158 chars |
| Falta speakable schema | MEDIUM | GEO | 🔧 OUT OF SCOPE | Requiere BaseLayout |
| Sin diagrama Mermaid | MEDIUM | MEDIA | ✅ RESUELTO | Añadido flowchart LR |
| Companion repo no existe | MEDIUM | COMPANION | ✅ RESUELTO | Creado con meta.json |
| CTR bajo en USA | HIGH | TRAFFIC | 🔧 OUT OF SCOPE | Requiere GSC |

Resumen numérico:
- Total issues antes: N
- ✅ Resueltos: N
- ⚠️ Pendientes: N
- 🔧 Out of scope: N
- 🔄 Regresiones: N (debe ser 0)

---

## FASE 8 — Veredicto y recomendación

Genera un veredicto de una sola frase sobre el estado del recurso tras
las mejoras.

Genera una recomendación de siguiente paso:

- PROMOTE: el recurso está listo para publicación/push.
  (Todos los CRITICAL y HIGH resueltos, sin regresiones, build pasa.)
- FIX-THEN-PROMOTE: necesita arreglos menores antes de publicación.
  (Quedan items HIGH pendientes o MEDIUM que se pueden resolver rápido.)
- HOLD: necesita otra ronda de improve-a-resource.
  (Quedan items CRITICAL pendientes o regresiones.)
- REWRITE: el recurso necesita reescritura mayor.
  (Score total < 60 o múltiples regresiones.)

---

## FASE 9 — Actualizar el checklist

Sobrescribe ref/audit/reports/{tipo}-{slug}-audit.md con:

1. Metadata del recurso (actualizada).
2. Scorecard comparativo (antes vs después).
3. Checklist de arreglos actualizado:
   - Items resueltos marcados como [x] ✅.
   - Items pendientes marcados como [ ] ⚠️ con justificación.
   - Items out of scope marcados como [ ] 🔧 con razón.
   - Regresiones marcadas como [ ] 🔄 con CRITICAL.
4. Definition of Done actualizada.
5. Top 5 acciones pendientes (re-priorizadas).
6. Veredicto y recomendación.
7. Anexos con outputs de re-auditoría.

Estructura del archivo actualizado:

```text
# Checklist de arreglos — {tipo}/{slug} (re-auditoría)

## 0. Metadata del recurso
## 1. Scorecard comparativo (antes vs después)
## 2. Checklist de arreglos actualizado
### ✅ Resueltos
- [x] **[SEVERITY] [CATEGORY] ...** ✅ RESUELTO
  - Evidence: ...
### ⚠️ Pendientes
- [ ] **[SEVERITY] [CATEGORY] ...** ⚠️ PENDIENTE
  - Razón: ...
### 🔧 Out of scope
- [ ] **[SEVERITY] [CATEGORY] ...** 🔧 OUT OF SCOPE
  - Razón: ...
### 🔄 Regresiones
- [ ] **[CRITICAL] [CATEGORY] ...** 🔄 REGRESIÓN
  - Causa: ...
## 3. Definition of Done (actualizada)
## 4. Top 5 acciones pendientes
## 5. Veredicto y recomendación
## 6. Anexos
```

---

## Reglas críticas

- No edites los archivos del recurso. Solo auditas y escribes el checklist.
- Usa los AGENTS.md como fuente de verdad. No inventes reglas.
- Distingue siempre: FACT / OBSERVATION / RECOMMENDATION / NOT VERIFIED.
- No inventes métricas. Mide desde el código local.
- Si un issue del checklist anterior ya estaba resuelto, márcalo como ✅.
- Si un issue persiste, márcalo como ⚠️ PENDIENTE con evidence.
- Si apareció un problema nuevo tras las mejoras, márcalo como 🔄 REGRESIÓN.
- No necesitas ejecutar las 8 sub-auditorías completas. Solo verifica
  los puntos de cada dimensión y compara con el score anterior.
- El layout RecipeArticle.astro renderiza el H1 desde el title. NO es
  una violación que el body empiece con ## Overview.
- Las secciones "What Works", "Troubleshooting", "See Also", "Further Reading"
  son válidas según AGENTS.md. NO las marques como issues.
- No hay límite máximo de FAQ. El mínimo es 3-5.
- metaDescription: 50-160 recomendado, 170 hard max.
- Todo el output debe estar en español.
```

---

## Ejemplos de uso

### Ejemplo 1 — Re-auditar recurso número 1

```text
Re-audita el recurso número 1 de ref/checklist-top-recursos-mejoras.md
tras la ronda de mejoras.
```

El agente leerá `ref/audit/reports/recipes-api-documentation-openapi-audit.md`,
re-medirá cada dimensión sobre los archivos mejorados, comparará ANTES vs DESPUÉS,
verificará cada issue del checklist, y actualizará el archivo con el estado final.

### Ejemplo 2 — Slug directo

```text
Re-audita el recurso recipes/api-documentation-openapi tras la ronda de mejoras.
```

### Ejemplo 3 — Sin checklist previo

Si no existe el checklist de auditoría, el agente se detendrá:

```text
No existe ref/audit/reports/recipes-api-documentation-openapi-audit.md.
Ejecuta primero ref/audit-a-resource.md para generar el checklist inicial,
luego ref/improve-a-resource.md para aplicar las mejoras,
y finalmente este prompt para re-auditar.
```

---

## Flujo completo de mejora de contenido

```text
1. ref/audit-a-resource.md      → genera checklist con issues
2. ref/improve-a-resource.md    → aplica arreglos del checklist
3. ref/reaudit-a-resource.md    → verifica que los arreglos funcionaron
```

Cada paso tiene un propósito claro:

| Paso | Prompt | Qué produce | Edita archivos? |
|------|--------|-------------|-----------------|
| 1 | audit-a-resource.md | Checklist con issues | No (solo escribe el report) |
| 2 | improve-a-resource.md | Recurso mejorado | Sí (edita src/content/) |
| 3 | reaudit-a-resource.md | Checklist actualizado | No (solo escribe el report) |

---

## Archivos relevantes

| Archivo | Propósito |
|---------|-----------|
| `ref/audit-a-resource.md` | Prompt de auditoría inicial (paso 1) |
| `ref/improve-a-resource.md` | Prompt de mejora (paso 2) |
| `ref/audit/reports/{tipo}-{slug}-audit.md` | Checklist (input y output) |
| `AGENTS.md` | Reglas generales del proyecto |
| `src/content/{tipo}/AGENTS.md` | Reglas por tipo de contenido |
| `scripts/render-mermaid.mjs` | Renderiza bloques mermaid a SVG |
| `public/assets/diagrams/` | SVGs generados |
| `public/lightbox.js` | Click-to-zoom para SVGs |
| `../stack-practices-resources/` | Repo hermano con ejemplos |
