# Checklist de arreglos — recipes/pre-commit-hooks

> Modo: `full`  
> Fecha de auditoría: 2026-08-31  
> Auditor: agente de contenido/SEO de StackPractices  
> Prompt maestro aplicado: `ref/audit-a-resource.md`

---

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `pre-commit-hooks` |
| Topic | `devops` (carpeta `src/content/recipes/devops/`) |
| Ruta EN | `src/content/recipes/devops/pre-commit-hooks.md` |
| Ruta ES | `src/content/recipes/devops/pre-commit-hooks.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/pre-commit-hooks/` |
| URL producción ES | `https://stackpractices.com/es/recipes/pre-commit-hooks/` |
| Título EN | `Set Up Pre-Commit Hooks with husky and lint-staged` (50 chars) |
| Título ES | `Configura pre-commit hooks con husky y lint-staged` (50 chars) |
| `description` EN | 138 chars |
| `description` ES | 134 chars |
| `metaDescription` EN | 151 chars |
| `metaDescription` ES | 159 chars |
| `difficulty` | `beginner` |
| `topics` | `devops`, `testing` (válidos) |
| `tags` | `devops`, `git`, `pre-commit`, `husky`, `lint-staged`, `ci-cd` (6) |
| `relatedResources` | 6 slugs, mismo orden EN/ES, todos válidos |
| `lastUpdated` | `2026-08-19` (EN/ES idéntico) |
| `publishedAt` | `2026-06-13` (EN/ES idéntico) |
| `author` | `Mathias Paulenko` |
| Palabras body (prosa sin bloques de código) EN | **~667** |
| Palabras body (prosa sin bloques de código) ES | **~682** |
| Mínimo esperado para `recipes` | ≥ 1.300 palabras de prosa |
| H2 EN/ES | 8 / 8 |
| H3 EN/ES | 10 / 10 (incluye 6 FAQ) |
| H4 EN/ES | 0 / 0 |
| Bloques de código EN/ES | 6 / 6 (Python YAML, JS package.json, bash, JS lintstagedrc, Java build.gradle, shell native, YAML gitleaks, JS commitlint) |
| FAQ items EN/ES | 6 / 6 |
| Enlaces internos en body EN/ES | 0 / 0 |
| Enlaces externos en body EN/ES | 0 / 0 (solo URLs en bloques de código) |
| Mermaid / imágenes EN/ES | 0 / 0 |
| Companion repo | **No existe** (`../stack-practices-resources/resources/recipes/devops/pre-commit-hooks/`) |
| AI detect content EN/ES | **44.2 %** / **40.1 %** (18/31 y 17/32; `pattern_totals: {}`) |
| Build | `npm run build` → 3.260 páginas, exit 0 |
| Sitemap | 3.258 URLs, EN/ES con `lastmod=2026-08-19` |

---

## 1. Scorecard y decisiones

### 1.1 Rúbrica de 15 dimensiones

| Dimensión | Peso | Fuente | Puntuación | Notas |
|---|---|---|---|---|
| Intención de búsqueda y ajuste SERP | 15 | 03 | 9/15 | La query "pre-commit hooks" es tutorial y el recurso responde, pero el título/meta no destacan el beneficio concreto y el contenido es corto. |
| Calidad de contenido y utilidad | 15 | 03 | 4/15 | Prosa ~667 palabras, por debajo del mínimo de 1.300. Ejemplos son copy-pasteables pero la explicación es breve y genérica. |
| Information gain y originalidad | 10 | 03 | 4/10 | Incluye ejemplos para 3 stacks (Python, JS, Java) + gitleaks + commitlint, pero sin versiones actualizadas, benchmarks ni experiencia de producción profunda. |
| Cobertura semántica / tópica | 10 | 03 | 7/10 | Cubre pre-commit framework, husky, lint-staged, gitleaks, commitlint, Gradle Spotless. Falta `pre-commit` en Node (`simple-git-hooks`, `lefthook`) y casos de monorepo. |
| Enlazado interno y arquitectura | 8 | 01 + 03 | 4/8 | 0 enlaces internos en el body; 6 `relatedResources` correctas. Recibe 12 enlaces entrantes (mayoría de docs/templates). |
| SEO técnico e indexabilidad | 10 | 01 | 9/10 | Canonical, hreflang, sitemap, structured data y OG correctos. Build OK. |
| E-E-A-T / Confianza | 8 | 03 + 06 | 4/8 | Autor presente, fechas, pero sin enlaces externos a documentación oficial, sin companion, AI score alto, sin citas verificables. |
| UX / legibilidad / accesibilidad | 7 | 03 | 5/7 | Estructura clara, código con lenguaje, FAQ con respuestas cortas. Sin diagramas; móvil no verificado. |
| GEO / AI Search readiness | 5 | 06 | 3/5 | FAQ y structured data `FAQPage` presentes, pero respuestas no siempre con fuentes y el contenido es thin. |
| Tráfico y potencial de crecimiento | 10 | 08 | 5/10 | Query con demanda (tutorial pre-commit hooks), pero la competencia es fuerte y el recurso no diferencia con profundidad ni datos. |
| Structured data | 3 | 01 + 02 | 3/3 | `WebPage`, `TechArticle`, `BreadcrumbList`, `FAQPage` presentes en EN/ES. |
| Performance | 5 | 01 | 3/5 | Sin datos reales de CWV; build estático, viewport y CSS responsive OK, imágenes ausentes. |
| Medios / imágenes | 2 | 09 | 0/2 | Sin Mermaid ni imágenes. Podría beneficiarse de un diagrama del ciclo de hook. |
| Frescura / mantenibilidad | 2 | 03 | 1/2 | `lastUpdated` 2026-08-19, contenido estable pero sin actualizaciones de versiones. |
| Paridad bilingüe | (reporte) | 05 | 9/10 | Estructura, metadatos y ejemplos equivalentes; ES ligeramente más largo pero ambos por debajo del mínimo. |
| **TOTAL** | **100** | — | **61/100** | — |

### 1.2 Decisión final

| Campo | Valor |
| --- | --- |
| **PUNTAJE TOTAL** | **61/100** |
| **ESTADO PÁGINA** | **WEAK** |
| **DECISIÓN INDEXACIÓN** | **IMPROVE FIRST** |
| **PAGE-WORTHINESS** | **PROBABLY YES** |
| **RIESGO THIN CONTENT** | **CRITICAL** |
| **RIESGO DUPLICACIÓN** | **NONE** |
| **RIESGO CANIBALIZACIÓN** | **LOW** |
| **SEO TÉCNICO** | **PASS** |
| **CALIDAD CONTENIDO** | **WEAK** |
| **GEO READINESS** | **MODERATE** |
| **POTENCIAL TRÁFICO** | **MEDIUM** |
| **PARIDAD BILINGÜE** | **PASS** |
| **RIESGO PATRÓN IA** | **HIGH** |
| **RIESGO CONTENIDO PROGRAMÁTICO** | **MEDIUM** |
| **RIESGO SOBRE-OPTIMIZACIÓN** | **LOW** |
| **VEREDICTO FINAL** | **FIX-THEN-PROMOTE** |

---

## 2. Checklist de arreglos

### CRITICAL

- [ ] **[CRITICAL] [CONTENT] Expandir el body de prosa por encima de 1.300 palabras en EN y ES**  
  - Why: El mínimo para `recipes` es 1.300 palabras de prosa; el recurso tiene ~667/682. El thin content limita el ranking y el information gain.  
  - Evidence: Medición local del body (sin bloques de código): EN ~667 palabras, ES ~682 palabras.  
  - How: Añadir secciones de profundidad (ciclo de vida del hook, comparativa de herramientas, monorepo, troubleshooting común, ejemplos de `.pre-commit-config.yaml` más completos, FAQ adicionales). Replicar en ES.  
  - Effort: High.  
  - Source: 03-content-quality-audit.

- [ ] **[CRITICAL] [HUMANIZATION] Reducir `model_ai_pct` por debajo del 40 % en EN y ES**  
  - Why: AI detector reporta EN 44.2 % y ES 40.1 %. El riesgo de patrón IA es HIGH.  
  - Evidence: `ref/output/ai-detect-pre-commit-hooks.json`. Top frases con alta probabilidad IA en Overview, When to Use y FAQ.  
  - How: Reescribir frases genéricas en primera persona con trade-offs concretos, añadir anécdotas/advertencias reales y variar estructura de oraciones.  
  - Effort: High.  
  - Source: 04-humanization-audit.

### HIGH

- [ ] **[HIGH] [CONTENT] Añadir 2-3 enlaces internos contextuales en el body EN/ES**  
  - Why: El `AGENTS.md` de recipes pide 2-3 enlaces contextuales. Actualmente hay 0. Mejora arquitectura de enlaces y descubrimiento.  
  - Evidence: `grep '\](/' src/content/recipes/devops/pre-commit-hooks*.md` → 0 resultados.  
  - How: Enlazar desde secciones relevantes a `/recipes/github-actions`, `/recipes/bash-scripting-automation`, `/recipes/container-security-scanning`, `/docs/contributing-guide`. Replicar en ES.  
  - Effort: Low.  
  - Source: 02-seo-audit.

- [ ] **[HIGH] [GEO] Añadir enlaces externos a fuentes primarias en una sección `See Also`**  
  - Why: El recurso no cita documentación oficial ni fuentes verificables en el body. Baja E-E-A-T y GEO.  
  - Evidence: `grep 'https://' src/content/recipes/devops/pre-commit-hooks*.md` → solo URLs dentro de bloques de código.  
  - How: Añadir sección `## See Also` con enlaces a githooks documentation, pre-commit.com, husky docs, lint-staged docs, gitleaks repo y commitlint. Traducir en ES.  
  - Effort: Low.  
  - Source: 06-geo-audit.

- [ ] **[HIGH] [CONTENT] Humanizar la voz y convertir listas genéricas en prosa con contexto**  
  - Why: Las secciones `When to Use`, `Best Practices` y `Common Mistakes` son listas cortas sin experiencia personal. Parecen plantilla.  
  - Evidence: AI detector marca frases como "A pre-commit hook is a script that runs between...", "Run the same checks in CI as well.", "It handles many languages and installs the tools it needs."  
  - How: Reescribir bullets con primera persona y situaciones reales ("I once saw a team skip hooks because..."). Añadir por qué cada punto importa.  
  - Effort: Medium.  
  - Source: 04-humanization-audit.

- [ ] **[HIGH] [CONTENT] Actualizar versiones de herramientas y añadir datos realistas**  
  - Why: Las versiones (`v4.5.0`, `23.12.1`, `v1.7.1`, `v8.18.1`) pueden estar desactualizadas y no se justifican. El contenido parece copy-paste sin contexto de producción.  
  - Evidence: Bloques de código con versiones fijas sin explicación de por qué o cómo verificar la última.  
  - How: Revisar versiones actuales, explicar por qué fijar versiones, añadir `.pre-commit-config.yaml` completo, package.json con `lint-staged` y `husky` v9, y notas de compatibilidad.  
  - Effort: Medium.  
  - Source: 03-content-quality-audit.

### MEDIUM

- [ ] **[MEDIUM] [CONTENT] Añadir sección de troubleshooting / errores comunes con soluciones concretas**  
  - Why: La sección `Common Mistakes` es una lista de 5 bullets sin profundidad. No explica cómo resolver cada problema.  
  - Evidence: `Common Mistakes` tiene ~50 palabras en EN; cada ítem es una línea.  
  - How: Expandir cada bullet con causa, síntoma y solución (ej: "Checking the whole repo" → cómo filtrar `files` en `.pre-commit-config.yaml` o `lint-staged`).  
  - Effort: Medium.  
  - Source: 03-content-quality-audit.

- [ ] **[MEDIUM] [CONTENT] Añadir alternativas modernas (simple-git-hooks, lefthook) y comparativa**  
  - Why: El ecosistema ha evolucionado; husky v9 cambió la sintaxis y hay alternativas populares. Aumentaría information gain.  
  - Evidence: Variants cubre Python, JS, Java, Go y secrets, pero no menciona `simple-git-hooks` ni `lefthook` ni compara husky vs nativo.  
  - How: Añadir una variante para `simple-git-hooks`/`lefthook` o una tabla comparativa de herramientas.  
  - Effort: Medium.  
  - Source: 03-content-quality-audit.

- [ ] **[MEDIUM] [MEDIA] Evaluar añadir un diagrama Mermaid del ciclo de vida del hook**  
  - Why: El flujo `git commit → hook → éxito/abort` es visual y mejora comprensión, especialmente para principiantes.  
  - Evidence: No hay bloques ` ```mermaid ` en ningún archivo; no hay imágenes.  
  - How: Añadir `flowchart LR` en `Explanation` mostrando `git commit` → `pre-commit hook` → `linter/tests/secrets` → `commit` o `abort`. Renderizar SVGs.  
  - Effort: Low.  
  - Source: 09-companion-media-audit.

- [ ] **[MEDIUM] [COMPANION] Crear companion repo con archivos de configuración listos para usar**  
  - Why: El recurso contiene ejemplos multi-archivo (`.pre-commit-config.yaml`, `package.json`, `.lintstagedrc.js`, `build.gradle`, `.husky/pre-commit`, `commitlint.config.js`). Un companion repo los hace descargables y ejecutables.  
  - Evidence: `../stack-practices-resources/resources/recipes/devops/pre-commit-hooks/meta.json` no existe.  
  - How: Crear carpeta con `meta.json`, archivos de ejemplo, `README.md` y `README.es.md`, ejecutar `node scripts/build-catalog.js` en el repo hermano.  
  - Effort: Medium.  
  - Source: 09-companion-media-audit.

- [ ] **[MEDIUM] [HUMANIZATION] Eliminar oraciones que empiezan con definición de diccionario**  
  - Why: `Overview` empieza con "A pre-commit hook is a script that..." y `Explanation` con "A hook in `.git/hooks/pre-commit` is an executable script." Son aperturas genéricas que el detector IA marca.  
  - Evidence: `top_ai_sentences` incluye ambas oraciones con >0.85 de probabilidad IA.  
  - How: Reescribir `Overview` para empezar con un problema real y reescribir `Explanation` con voz personal.  
  - Effort: Low.  
  - Source: 04-humanization-audit.

- [ ] **[MEDIUM] [SEO] Refrescar `lastUpdated` al día de la última edición real**  
  - Why: La fecha está en 2026-08-19; si se realiza la mejora, debe actualizarse.  
  - Evidence: `lastUpdated: 2026-08-19` en ambos frontmatter.  
  - How: Actualizar a la fecha de edición real.  
  - Effort: Very Low.  
  - Source: 02-seo-audit.

### LOW

- [ ] **[LOW] [HUMANIZATION] Añadir em dash o variación de conectores para bajar tono robótico**  
  - Why: El detector no marca em dash; la prosa es directa pero puede sonar plana.  
  - Evidence: 0 em dash en prosa.  
  - How: Introducir 1-2 em dash en advertencias o trade-offs si encaja con la voz.  
  - Effort: Low.  
  - Source: 04-humanization-audit.

- [ ] **[LOW] [SEO] Verificar duplicación de títulos/metas con recursos futuros**  
  - Why: Actualmente no hay duplicados, pero el título podría solaparse con un futuro recurso de husky o lint-staged específico.  
  - Evidence: `grep` no encuentra títulos similares.  
  - How: Si se crean recursos hijos, ajustar este título para mantenerlo como el hub general.  
  - Effort: Very Low.  
  - Source: 02-seo-audit.

---

## 3. Definition of Done

### Frontmatter y SEO

- [ ] `title` < 60 caracteres e igual al H1 renderizado.
- [ ] `description` 80-160 caracteres, gancho claro.
- [ ] `metaDescription` 120-160 caracteres, coincide con `seo.metaDescription`.
- [ ] `relatedResources` 2-6, distintos tipos, mismo orden EN/ES, sin barra final.
- [ ] `topics` y `tags` relevantes y dentro de enums.
- [ ] `lastUpdated` actualizado a la fecha de la última edición real.
- [ ] H1 único e igual al `title`.
- [ ] Jerarquía H2 → H3 sin saltos.

### Body y contenido

- [ ] Body prosa ≥ 1.300 palabras en EN y ES.
- [ ] `Overview` empieza con problema real, no con definición.
- [ ] `When to Use` con 4-6 situaciones concretas y al menos una donde NO aplica.
- [ ] `Solution` con ejemplos listos para copiar y versiones actualizadas.
- [ ] `Explanation` explica trade-offs, instalación y ciclo de vida.
- [ ] `Variants` con comparativa/alternativas modernas.
- [ ] `Best Practices` y `Common Mistakes` específicas del dominio con soluciones.
- [ ] `FAQ` con 3-8 preguntas reales, respuestas con enlaces a fuentes.
- [ ] `See Also` / `Further Reading` con enlaces oficiales.

### Humanización

- [ ] `model_ai_pct` EN < 40 % y ES < 40 %.
- [ ] Tono en primera persona con trade-offs y advertencias reales.
- [ ] Sin aperturas tipo definición de diccionario.
- [ ] Sin frases patrón ni oraciones genéricas.

### Paridad EN/ES

- [ ] Misma estructura de secciones y orden.
- [ ] Metadatos traducidos con longitudes correctas.
- [ ] Código y ejemplos equivalentes (comentarios traducidos si es idiomático).
- [ ] `relatedResources` y `lastUpdated` coincidentes.

### Medios visuales y companion

- [ ] Diagrama Mermaid añadido y SVGs renderizados (opcional pero recomendado).
- [ ] `/lightbox.js` presente si hay diagramas.
- [ ] Sin overflow horizontal en móvil (estructural).
- [ ] Companion repo creado con `meta.json`, archivos y README EN/ES (recomendado).

### Validación técnica

- [ ] `npm run content:quality` → 0 errores, 0 warnings.
- [ ] `npm run content:links` → 0 rotos.
- [ ] `npm run content:validate` → 0 errores, 0 advertencias.
- [ ] `npm run check` → 0 errores, 0 warnings.
- [ ] `npm run build` → 3.260 páginas OK.
- [ ] `npm run sitemap` → 3.258 URLs.
- [ ] `npm run mermaid:render` → SVGs generados si se añade diagrama.

---

## 4. Top 5 acciones

1. **Expandir el body por encima de 1.300 palabras** (CRITICAL, effort High) — prioridad #1, desbloquea el resto de mejoras.
2. **Bajar AI score por debajo del 40 %** (CRITICAL, effort High) — reescribir en voz humana, añadir trade-offs y experiencia real.
3. **Añadir enlaces internos y sección `See Also` con fuentes oficiales** (HIGH, effort Low) — mejora enlazado y E-E-A-T/GEO.
4. **Actualizar versiones y añadir ejemplos de producción** (HIGH, effort Medium) — eleva information gain y confianza.
5. **Crear companion repo con archivos listos para usar** (MEDIUM, effort Medium) — convierte la receta en un recurso descargable.

---

## 5. Veredicto

El recurso `recipes/pre-commit-hooks` tiene una estructura técnica sólida (SEO, frontmatter, build, schema) pero sufre de **thin content** (~667 palabras, bien por debajo del mínimo de 1.300) y **tono genérico con alto score IA** (44.2 % EN / 40.1 % ES). Los ejemplos son copy-pasteables, pero faltan enlaces internos, citas externas, profundidad explicativa, alternativas modernas y un companion repo descargable. Con una expansión substancial y humanización, puede pasar de `WEAK` 61/100 a un recurso competitivo en el cluster `devops`/`testing`.

**Decisión: FIX-THEN-PROMOTE.**

---

## 6. Anexos

### 6.1 — Auditoría técnica (01)

| Check | Resultado |
| --- | --- |
| Slug kebab-case único | ✅ `pre-commit-hooks` |
| Ruta EN | ✅ `/recipes/pre-commit-hooks/` |
| Ruta ES | ✅ `/es/recipes/pre-commit-hooks/` |
| `public/sitemap.xml` | ✅ Presente con `lastmod=2026-08-19`, hreflang `en/es/x-default` |
| Canonical EN | ✅ `https://stackpractices.com/recipes/pre-commit-hooks/` |
| Canonical ES | ✅ `https://stackpractices.com/es/recipes/pre-commit-hooks/` |
| Structured data | ✅ `WebPage`, `TechArticle`, `BreadcrumbList`, `FAQPage` |
| Open Graph | ✅ `og:title`, `og:description`, `og:url`, `og:locale`, `og:image` |
| Build | ✅ 3.260 páginas |
| Mermaid | ✅ No hay bloques Mermaid; no aplica |
| Mobile structural | ✅ viewport, CSS responsive, no width fijo > 375px (sin diagramas) |
| Performance | 🔧 NOT VERIFIED (sin datos CWV) |

`PUNTAJE TÉCNICO: 9/10`

### 6.2 — Auditoría SEO (02)

| Campo | EN | ES | OK |
| --- | --- | --- | --- |
| `title` | 50 chars | 50 chars | ✅ |
| `description` | 138 chars | 134 chars | ✅ |
| `metaDescription` | 151 chars | 159 chars | ✅ |
| `metaDescription` = `seo.metaDescription` | ✅ | ✅ | ✅ |
| `topics` | `devops`, `testing` | `devops`, `testing` | ✅ |
| `tags` | 6 | 6 | ✅ |
| `relatedResources` | 6 | 6, mismo orden | ✅ |
| `lastUpdated` | 2026-08-19 | 2026-08-19 | ✅ |
| Jerarquía H2 → H3 | 8/10/0 | 8/10/0 | ✅ |
| Enlaces internos en body | 0 | 0 | ⚠️ HIGH |
| `PUNTAJE SEO` | — | — | **11/15** |

### 6.3 — Auditoría de calidad de contenido (03)

- **Intención de búsqueda:** Tutorial / How-to. El recurso responde, pero el contenido es demasiado corto para competir.
- **Thin content:** CRITICAL. ~667/682 palabras vs 1.300 mínimo.
- **Information gain:** MODERATE. Ejemplos para 3 stacks + gitleaks + commitlint, pero sin profundidad.
- **Duplicación/canibalización:** NONE. No hay recursos duplicados de pre-commit hooks.
- **Riesgo programático:** MEDIUM. Estructura de plantilla con listas genéricas.
- **Riesgo sobre-optimización:** LOW.
- **Page-worthiness:** PROBABLY YES, pero **IMPROVE FIRST**.
- **PUNTAJE CALIDAD DE CONTENIDO: 4/25**

### 6.4 — Auditoría de humanización (04)

| Métrica | EN | ES |
| --- | --- | --- |
| `model_ai_pct` | **44.2 %** | **40.1 %** |
| `ai_count` / `human_count` | 18 / 31 | 17 / 32 |
| `pattern_totals` | `{}` | `{}` |
| Frases genéricas iniciales | 2 (definiciones) | 2 (definiciones) |
| Primera persona | escasa (`This recipe shows...`) | escasa (`Esta receta muestra...`) |
| Tokens al final de oraciones | mínimos | mínimos |
| `PUNTAJE HUMANIZACIÓN` | **5/15** | **5/15** |

Top frases IA EN:
1. "A pre-commit hook is a script that runs between `git commit` and the moment the commit is created." (0.9444)
2. "This recipe shows how to set up hooks for Python, JavaScript and Java using three common approaches." (0.9608)
3. "Align ESLint and Prettier with `eslint-config-prettier`." (0.8543)

Top frases IA ES:
1. "Un pre-commit hook es un script que corre entre `git commit` y el momento en que el commit se crea." (0.8538)
2. "Esta receta muestra cómo configurar hooks para Python, JavaScript y Java con tres enfoques comunes." (0.7408)
3. "Verificar todo el repo en cada commit." (0.7662)

### 6.5 — Auditoría de paridad bilingüe (05)

- Archivo ES: ✅ existe.
- Estructura: ✅ mismo orden de H2/H3, 6 FAQ en ambos.
- Frontmatter: ✅ título, description, meta, lastUpdated, relatedResources coincidentes.
- Longitud body: EN ~667, ES ~682 (ES ligeramente más largo; ambos por debajo del mínimo).
- Código: ✅ equivalentes, comentarios traducidos.
- Anglicismos: términos técnicos asentados (`pre-commit`, `husky`, `lint-staged`, `CI/CD`) son aceptables.
- `PUNTAJE PARIDAD BILINGÜE: 9/10`

### 6.6 — Auditoría GEO / AI Search (06)

- Claridad de entidades: MEDIUM.
- Densidad factual: MEDIUM. Herramientas y versiones, pero sin fuentes.
- Citas: INSUFFICIENT. No hay enlaces externos en el body.
- Pasajes extraíbles: MEDIUM. FAQ cortas pero sin fuentes.
- Consistencia terminológica: PASS.
- Structured data para IA: OK (`inLanguage`, `educationalLevel`, `FAQPage`, `speakable`).
- Paridad GEO bilingüe: PASS.
- `PUNTAJE GEO: 3/5`

### 6.7 — Auditoría de tráfico y crecimiento (08)

- GSC/GA4: NOT VERIFIED (sin acceso).
- Potencial CTR: MEDIUM. Título cubre pre-commit + husky + lint-staged, meta descripción clara.
- Potencial tráfico: MEDIUM. Query tutorial con competencia fuerte (pre-commit.com, Medium, GitHub).
- Flujo de usuario: NEEDS IMPROVEMENT. 0 enlaces internos, sin CTA ni companion.
- `PUNTAJE PRIORIDAD TRÁFICO: 5/15`

### 6.8 — Auditoría de companion y medios (09)

| Check | Resultado |
| --- | --- |
| Companion repo | NO EXISTE |
| meta.json | NO APLICA |
| Archivos listados | NO APLICA |
| README.md/es | NO APLICA |
| Build catálogo | NO VERIFICADO (companion no existe) |
| Mermaid / imágenes | NINGUNO |
| SVGs generados | NINGUNO |
| Lightbox | NO APLICA |
| `PUNTAJE COMPANION` | 0/5 |
| `PUNTAJE MEDIOS` | 0/10 |
| `TOTAL` | 0/15 |

### 6.9 — Validación técnica

| Comando | Resultado |
| --- | --- |
| `npm run content:quality` | ✅ 0 errores, 0 warnings |
| `npm run content:links` | ✅ 0 rotos |
| `npm run content:validate` | ✅ 0 errores, 0 advertencias |
| `npm run check` | ✅ 0 errores, 0 warnings, 3 hints preexistentes |
| `npm run build` | ✅ 3.260 páginas |
| `npm run sitemap` | ✅ 3.258 URLs |
