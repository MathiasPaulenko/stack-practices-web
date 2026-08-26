# Prompt maestro — Resumen y commit de un recurso mejorado

> StackPractices.com
> Prompt orquestador que cierra el flujo de mejora de contenido:
> resume todos los cambios aplicados, verifica el estado final,
> genera commits separados por naturaleza, y pide aprobación
> antes de hacer push.
>
> Se ejecuta DESPUÉS de:
> 1. `ref/audit-a-resource.md` (auditoría inicial)
> 2. `ref/improve-a-resource.md` (aplicación de mejoras)
> 3. `ref/reaudit-a-resource.md` (re-auditoría)
>
> Flujo completo: `ref/flujo-mejoras-contenido.md`

---

## Cómo usar este prompt

Copia el bloque de la sección **Prompt** más abajo, reemplaza `{N}` con el
número del recurso en `ref/checklist-top-recursos-mejoras.md` (o usa un slug
tipo `recipes/api-documentation-openapi`), y pégalo en tu agente.

**Requisitos previos:**

1. El recurso debe tener un checklist de auditoría en
   `ref/audit/reports/{tipo}-{slug}-audit.md` (con score comparativo).
2. Debe haberse ejecutado `ref/improve-a-resource.md` sobre el recurso.
3. Debe haberse ejecutado `ref/reaudit-a-resource.md` y el veredicto debe
   ser `PROMOTE` o `FIX-THEN-PROMOTE`.

El agente:
1. Resolverá el recurso (slug, tipo, archivos EN/ES).
2. Cargará el checklist de re-auditoría con el score comparativo.
3. Inspeccionará el estado de git (status, diff, stat).
4. Generará un resumen tabular de todos los cambios.
5. Verificará que la validación técnica pasa.
6. Verificará el estado de medios visuales y companion repo.
7. Generará commits separados por naturaleza de cambios.
8. Pedirá aprobación antes de cada commit.
9. Pedirá aprobación antes de push.

---

## Prompt

```text
Eres un equipo senior de ingeniería de contenido para StackPractices.com.
Tu objetivo es cerrar el flujo de mejora del recurso {N} generando un
resumen completo de cambios, commits separados por naturaleza, y pidiendo
aprobación antes de cada acción destructiva (commit, push).

No editas los archivos del recurso. Solo inspeccionas, resumes y commiteas
(con aprobación explícita del usuario).

---

## FASE 1 — Resolver el recurso y cargar el contexto

1. Lee ref/checklist-top-recursos-mejoras.md y extrae la línea del recurso {N}.
   Si {N} es un slug (ej: recipes/api-documentation-openapi), úsalo directamente.
2. Identifica:
   - tipo: recipes | patterns | guides | docs
   - slug: kebab-case
   - topic: subcarpeta si existe (ej: api, data, security)
3. Resuelve las rutas locales:
   - EN: src/content/{tipo}/{topic}/{slug}.md
   - ES: src/content/{tipo}/{topic}/{slug}.es.md
4. Lee el checklist de re-auditoría en:
   ref/audit/reports/{tipo}-{slug}-audit.md
   Extrae:
   - Score comparativo (antes vs después).
   - Issues resueltos (✅), pendientes (⚠️), out of scope (🔧), regresiones (🔄).
   - Veredicto (PROMOTE / FIX-THEN-PROMOTE / HOLD / REWRITE).
   - Definition of Done actualizada.
   - Top 5 acciones pendientes.
5. Si el veredicto es HOLD o REWRITE, detente y pide al usuario que ejecute
   otra ronda de ref/improve-a-resource.md antes de continuar.
6. Si el veredicto es PROMOTE o FIX-THEN-PROMOTE, continúa.

---

## FASE 2 — Inspeccionar el estado de git

Ejecuta en orden:

1. git status
   - Lista todos los archivos modificados, añadidos, eliminados.
   - Identifica archivos del recurso (src/content/).
   - Identifica archivos del companion repo (../stack-practices-resources/).
   - Identifica archivos de infraestructura (astro.config.mjs, src/lib/, etc.).
   - Identifica archivos de prompts/ref (ref/).
   - Identifica assets (public/assets/diagrams/, public/lightbox.js).

2. git diff --stat
   - Resume cambios por archivo (líneas añadidas/eliminadas).

3. git diff (sin --stat para los archivos del recurso)
   - Revisa los cambios reales línea por línea.
   - Verifica que no hay cambios inesperados.
   - Verifica que no hay secretos, credenciales o datos sensibles.

4. git log --oneline -5
   - Revisa los últimos commits para mantener consistencia de estilo.

Reporta:

```text
=== GIT STATUS ===
[output de git status]

=== GIT DIFF --STAT ===
[output de git diff --stat]

=== ÚLTIMOS COMMITS ===
[output de git log --oneline -5]
```

---

## FASE 3 — Resumen tabular de cambios

Genera una tabla resumen con todos los cambios aplicados:

### 3.1 Cambios de frontmatter y SEO

| Cambio | Archivo | Antes | Después | Severidad | Estado |
|--------|---------|-------|---------|-----------|--------|
| metaDescription EN | {slug}.md | 162 chars | 142 chars | CRITICAL | ✅ |
| metaDescription ES | {slug}.es.md | 172 chars | 149 chars | CRITICAL | ✅ |
| title ES | {slug}.es.md | 63 chars | 49 chars | HIGH | ✅ |
| lastUpdated | ambos | 2026-08-25 | 2026-08-27 | — | ✅ |
| ... | ... | ... | ... | ... | ... |

### 3.2 Cambios de contenido y humanización

| Cambio | Archivo | Antes | Después | Severidad | Estado |
|--------|---------|-------|---------|-----------|--------|
| Sentence-ending tokens | {slug}.md | 7 | 0 | HIGH | ✅ |
| Sentence-ending tokens | {slug}.es.md | 14 | 0 | HIGH | ✅ |
| Primera persona en ES | {slug}.es.md | ausente | añadida | HIGH | ✅ |
| FAQ count | ambos | 34 | 31 | MEDIUM | ⚠️ parcial |
| Passive voice | {slug}.md | 2 | 1 | MEDIUM | ⚠️ pendiente |
| ... | ... | ... | ... | ... | ... |

### 3.3 Medios visuales

| Cambio | Archivo | Antes | Después | Estado |
|--------|---------|-------|---------|--------|
| Diagrama Mermaid | {slug}.md | 0 | 1 (flowchart LR) | ✅ |
| Diagrama Mermaid | {slug}.es.md | 0 | 1 (flowchart LR) | ✅ |
| SVG generado | public/assets/diagrams/ | 0 | 2 (EN + ES) | ✅ |
| Lightbox | public/lightbox.js | ausente | presente | ✅ |
| CSS | src/styles/global.css | sin selector | img[src*="/assets/diagrams/"] | ✅ |
| HTML build | dist/ | sin <img> | <img src="/assets/diagrams/..."> | ✅ |

### 3.4 Companion repo

| Cambio | Ruta | Antes | Después | Estado |
|--------|------|-------|---------|--------|
| meta.json | companion/meta.json | no existe | creado (11 campos) | ✅ |
| openapi.yaml | companion/ | no existe | creado | ✅ |
| python_fastapi.py | companion/ | no existe | creado | ✅ |
| ... | ... | ... | ... | ... |
| README.md | companion/ | no existe | creado | ✅ |
| README.es.md | companion/ | no existe | creado | ✅ |
| build-catalog.js | companion repo | sin companion | pasa sin errores | ✅ |

### 3.5 Infraestructura (si hubo cambios)

| Cambio | Archivo | Razón | Estado |
|--------|---------|-------|--------|
| Remark plugin | src/lib/remark-mermaid-blocks.mjs | soporte Mermaid | ✅ |
| CSS | src/styles/global.css | estilos diagrama | ✅ |
| Config | astro.config.mjs | remark plugins | ✅ |
| ... | ... | ... | ... |

### 3.6 Validación técnica

| Comando | Estado | Output relevante |
|---------|--------|------------------|
| npm run content:quality | PASS | 0 errors, 0 warnings |
| npm run content:links | PASS | 0 broken |
| npm run content:validate | PASS | 0 errors, 0 warnings |
| npm run check | PASS | 0 errors, 0 warnings, 3 hints |
| npm run mermaid:render | PASS | SVGs generados |
| npm run build | PASS | 3,258 páginas |
| npm run sitemap | PASS | sitemap.xml regenerado |

### 3.7 Score comparativo

| Dimensión | Antes | Después | Cambio |
|-----------|-------|---------|--------|
| SEO On-Page | X/15 | X/15 | +/- |
| Technical SEO | X/10 | X/10 | +/- |
| Content Quality | X/25 | X/25 | +/- |
| Humanization | X/15 | X/15 | +/- |
| Bilingual Parity | X/10 | X/10 | +/- |
| Medios Visuales | X/5 | X/5 | +/- |
| Companion Repo | X/3 | X/3 | +/- |
| GEO | X/5 | X/5 | +/- |
| **TOTAL** | **X/100** | **X/100** | **+/-** |

### 3.8 IA Detection (si se ejecutó)

| Idioma | AI% antes | AI% después | Cambio |
|--------|-----------|-------------|--------|
| EN | X% | X% | +/- |
| ES | X% | X% | +/- |

### 3.9 Items pendientes y out of scope

| Issue | Severidad | Estado | Razón |
|-------|-----------|--------|-------|
| FAQ 31 preguntas (layout max 10) | MEDIUM | ⚠️ PENDIENTE | Decisión editorial |
| FAQ variety 55% "How do I" | MEDIUM | ⚠️ PENDIENTE | Reestructuración |
| speakable schema | MEDIUM | 🔧 OUT OF SCOPE | Requiere componentes Astro |
| ... | ... | ... | ... |

### 3.10 Verificación móvil

| Check | Estado |
|-------|--------|
| <meta name="viewport"> | ✅ |
| CSS responsive | ✅ |
| Diagramas max-width: 100% | ✅ |
| Overflow horizontal (375px) | ✅ o NOT VERIFIED |
| Click-to-zoom en móvil | ✅ o NOT VERIFIED |

---

## FASE 4 — Verificación final de seguridad

Antes de generar commits, verifica:

1. **No hay secretos ni credenciales** en los cambios.
   - Busca patrones: API_KEY, SECRET, PASSWORD, TOKEN, PRIVATE_KEY.
   - Si encuentras algo, detente y reporta al usuario.

2. **No hay datos sensibles** en los cambios.
   - Busca emails personales, IPs internas, URLs de staging.

3. **No hay cambios no relacionados** con el recurso.
   - Si hay cambios en archivos que no corresponden al recurso,
     al companion repo, o a la infraestructura de Mermaid,
     sepáralos en commits distintos o pregunta al usuario.

4. **No hay archivos temporales** staged.
   - Busca .log, .tmp, .bak, .swp, node_modules/, dist/.
   - Si los hay, no los incluyas en el commit.

5. **El .gitignore** está actualizado si se añadieron nuevos tipos
   de archivos.

Reporta:

```text
=== VERIFICACIÓN DE SEGURIDAD ===
Secrets: OK / FOUND (detalles)
Datos sensibles: OK / FOUND (detalles)
Cambios no relacionados: OK / FOUND (detalles)
Archivos temporales: OK / FOUND (detalles)
.gitignore: OK / NEEDS UPDATE
```

---

## FASE 5 — Generar commits separados por naturaleza

Agrupa los cambios en commits lógicos separados por naturaleza.
Sigue el formato conventional commits.

### 5.1 Orden de commits (recomendado)

1. **Infraestructura** (si hubo cambios en build/config/plugins):
   ```text
   feat(media): add static Mermaid SVG rendering with lightbox

   - Add remark-mermaid-blocks.mjs to convert fenced mermaid blocks to <img>
   - Add render-mermaid.mjs script (npm run mermaid:render)
   - Add lightbox.js for click-to-zoom
   - Add CSS selectors for diagram images
   - Update astro.config.mjs with remark plugins
   ```

2. **Companion repo** (si se creó o modificó):
   ```text
   feat(companion): add {slug} companion resources

   - Add meta.json with required fields
   - Add example files: {list}
   - Add README.md and README.es.md
   ```

3. **Recurso principal** (frontmatter + contenido + humanización):
   ```text
   fix(seo): improve {slug} metadata, content and humanization

   - Fix metaDescription EN (162→142 chars) and ES (172→149 chars)
   - Fix ES title (63→49 chars)
   - Update lastUpdated to {date}
   - Correct sentence-ending code tokens (EN 7, ES 14)
   - Add first-person voice in ES
   - Add Mermaid diagram (flowchart LR) in EN and ES
   - Reduce FAQ from 34 to 31
   ```

4. **Reportes y prompts** (si hubo cambios en ref/):
   ```text
   docs(audit): update {slug} audit report and flow documentation

   - Update ref/audit/reports/{tipo}-{slug}-audit.md with re-auditoría
   - Update ref/flujo-mejoras-contenido.md
   ```

### 5.2 Reglas de commit

- **Autor:** Mathias Paulenko <mathias.paulenko@outlook.com>
- **Sin Co-authored-by de IA** (Devin, Cascade, Claude, etc.)
- **Sin "Generated by" o "Assisted by"**
- **Mensajes en inglés** (convención del repo)
- **Mensajes concisos** (máximo 72 chars en la primera línea)
- **Body del commit** opcional pero recomendado para cambios complejos
- **Un commit por naturaleza** de cambio (no mezclar contenido con infraestructura)

### 5.3 Procedimiento

Para CADA commit:

1. Stage los archivos correspondientes con `git add`.
2. Muestra al usuario qué archivos se van a commitear.
3. Muestra el mensaje de commit propuesto.
4. Pide aprobación explícita.
5. Si aprueba, ejecuta el commit.
6. Si no aprueba, ajusta según feedback.

NO hagas push en ningún caso sin aprobación explícita separada.

---

## FASE 6 — Resumen final y aprobación para push

Después de todos los commits, genera un resumen final:

```text
=== RESUMEN FINAL ===

Recurso: {tipo}/{slug}
Score: {antes} → {después} (+{cambio})
Veredicto: {PROMOTE / FIX-THEN-PROMOTE}

Commits generados:
1. {hash} {mensaje}
2. {hash} {mensaje}
3. {hash} {mensaje}

Archivos modificados: {N}
Archivos creados: {N}
Archivos eliminados: {N}

Pendientes: {N} items (listar)
Out of scope: {N} items (listar)
Regresiones: {N} (debe ser 0)

Validación: 7/7 comandos PASS
Móvil: {OK / NOT VERIFIED}
Companion: {OK / N/A}

¿Hacer push al remoto?
```

### 6.1 Antes de push

Si el usuario aprueba el push:

1. Verifica que no hay commits de otros autores en el branch local.
2. Ejecuta `git push` (sin --force).
3. Si hay conflictos, detente y pide al usuario que resuelva.
4. Reporta el resultado del push.

### 6.2 Después de push

1. Verifica que el CI/CD pasa (si existe).
2. Reporta el estado del deployment.
3. Si el recurso tiene URL de producción, sugiere verificar:
   - Que la página responde 200.
   - Que el canonical es correcto.
   - Que el sitemap incluye la URL.
   - Que el diagrama Mermaid renderiza (si aplica).
   - Que el companion repo es accesible (si aplica).

---

## Reglas críticas

- No edites los archivos del recurso. Solo inspeccionas, resumes y commiteas.
- No hagas commit sin aprobación explícita del usuario para cada commit.
- No hagas push sin aprobación explícita separada del commit.
- No uses --force, --amend en commits ya pusheados, ni reescribas history.
- No incluyas secretos, credenciales o datos sensibles en commits.
- No incluyas archivos temporales (.log, .tmp, .bak, node_modules/, dist/).
- No mezcles cambios de naturaleza distinta en un mismo commit.
- Autor de todos los commits: Mathias Paulenko <mathias.paulenko@outlook.com>.
- Sin Co-authored-by de IA ni trailers de atribución de IA.
- Mensajes de commit en inglés (convención del repo).
- Si el veredicto de re-auditoría es HOLD o REWRITE, no continúes al resumen.
  Pide al usuario que ejecute otra ronda de improve-a-resource.
- Si detectas regresiones (🔄), repórtalas como CRITICAL y no hagas commit
  hasta que el usuario decida cómo proceder.
- Si detectas secretos o datos sensibles, detente inmediatamente
  y repórtalo al usuario.
- Todo el output conversacional debe estar en español.
```

---

## Ejemplos de uso

### Ejemplo 1 — Resumen del recurso número 1

```text
Genera el resumen y commits del recurso número 1 de
ref/checklist-top-recursos-mejoras.md tras la re-auditoría.
```

El agente cargará el checklist de re-auditoría, inspeccionará git,
generará un resumen tabular, creará commits separados por naturaleza,
y pedirá aprobación antes de cada commit y antes de push.

### Ejemplo 2 — Slug directo

```text
Genera el resumen y commits del recurso
recipes/api-documentation-openapi tras la re-auditoría.
```

### Ejemplo 3 — Veredicto HOLD

Si el veredicto de re-auditoría es HOLD, el agente se detendrá:

```text
El veredicto de re-auditoría es HOLD (quedan items CRITICAL pendientes).
No se puede generar el resumen de commit.
Ejecuta otra ronda de ref/improve-a-resource.md para resolver los
items pendientes antes de continuar.
```

---

## Flujo completo de mejora de contenido

```text
1. ref/audit-a-resource.md      → genera checklist con issues
2. ref/improve-a-resource.md    → aplica arreglos del checklist
3. ref/reaudit-a-resource.md    → verifica que los arreglos funcionaron
4. ref/summary-a-resource.md    → resume, commitea y pide aprobación para push
```

| Paso | Prompt | Qué produce | Edita archivos? |
|------|--------|-------------|-----------------|
| 1 | audit-a-resource.md | Checklist con issues | No (solo escribe el report) |
| 2 | improve-a-resource.md | Recurso mejorado | Sí (edita src/content/) |
| 3 | reaudit-a-resource.md | Checklist actualizado | No (solo escribe el report) |
| 4 | summary-a-resource.md | Commits + resumen | No (solo git operations) |

---

## Archivos relevantes

| Archivo | Propósito |
|---------|-----------|
| `ref/audit-a-resource.md` | Prompt de auditoría inicial (paso 1) |
| `ref/improve-a-resource.md` | Prompt de mejora (paso 2) |
| `ref/reaudit-a-resource.md` | Prompt de re-auditoría (paso 3) |
| `ref/audit/reports/{tipo}-{slug}-audit.md` | Checklist con score comparativo |
| `ref/flujo-mejoras-contenido.md` | Documentación del flujo completo |
| `AGENTS.md` | Reglas generales del proyecto |
| `src/content/{tipo}/AGENTS.md` | Reglas por tipo de contenido |
| `../stack-practices-resources/` | Repo hermano con ejemplos |
