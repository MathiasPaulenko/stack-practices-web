# Checklist de arreglos — recipes/password-hashing (re-auditoría)

> Modo: `re-auditoría`  
> Fecha de re-auditoría: 2026-08-31  
> Auditor: agente de contenido/SEO de StackPractices  
> Prompt maestro aplicado: `ref/reaudit-a-resource.md`

---

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `password-hashing` |
| Topic | `authentication` (carpeta `src/content/recipes/authentication/`) |
| Ruta EN | `src/content/recipes/authentication/password-hashing.md` |
| Ruta ES | `src/content/recipes/authentication/password-hashing.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/password-hashing/` |
| URL producción ES | `https://stackpractices.com/es/recipes/password-hashing/` |
| Título EN | `How to Hash Passwords Securely (Python, JavaScript, Java)` (57 chars) |
| Título ES | `Cómo hashear contraseñas (Python, JavaScript, Java)` (51 chars) |
| `description` EN | 170 chars |
| `description` ES | 170 chars |
| `metaDescription` EN | 152 chars (coincide con `seo.metaDescription`) |
| `metaDescription` ES | 147 chars (coincide con `seo.metaDescription`) |
| `difficulty` | `intermediate` |
| `topics` | `authentication`, `security` (válidos) |
| `tags` | `authentication`, `bcrypt`, `argon2`, `pbkdf2`, `security`, `password-hashing`, `python`, `nodejs`, `java` (9) |
| `relatedResources` | 6 slugs, mismo orden EN/ES, todos válidos |
| `lastUpdated` | `2026-08-30` (EN/ES idéntico) |
| `publishedAt` | `2026-06-10` (EN/ES idéntico) |
| `author` | `Mathias Paulenko` |
| Palabras body (prosa sin bloques de código) EN | **~2,150** (medición local: 2,097) |
| Palabras body (prosa sin bloques de código) ES | **~2,165** (medición local: 2,110) |
| Mínimo esperado para `recipes` | ≥ 1.300 palabras de prosa |
| H2 EN/ES | 9 / 9 |
| H3 EN/ES | 16 / 16 (incluye 7 FAQ) |
| H4 EN/ES | 9 / 9 |
| Bloques de código EN/ES | 9 ejemplos + 1 Mermaid cada idioma |
| FAQ items EN/ES | 7 / 7 |
| Enlaces internos en body EN/ES | 5 / 5 (paridad resuelta) |
| Enlaces externos en body EN/ES | 4 / 4 (PHC, OWASP, NIST, companion repo) |
| Mermaid / imágenes EN/ES | 1 bloque / 1 SVG en cada idioma |
| Companion repo | **Creado** (`../stack-practices-resources/resources/recipes/authentication/password-hashing/`) |
| AI detect content EN/ES | **39.5 %** / **37.4 %** (24/88 y 28/89; `pattern_totals: {}`) |
| Build | `npm run build` → 3.258 páginas, exit 0 |
| Sitemap | 3.256 URLs, 6.602 image entries, EN/ES con `lastmod=2026-08-30` |

---

## 1. Scorecard comparativo (antes vs después)

### 1.1 Rúbrica de 8 dimensiones (prompt maestro)

| Dimensión | Peso | Antes | Después | Cambio | Estado |
|-----------|------|-------|---------|--------|--------|
| SEO On-Page | 15 | 13/15 | 15/15 | +2 | ✅ |
| SEO Técnico | 10 | 9/10 | 10/10 | +1 | ✅ |
| Calidad de Contenido | 25 | 16/25 | 23/25 | +7 | ✅ |
| Humanización | 15 | 8/15 | 14/15 | +6 | ✅ |
| Paridad Bilingüe | 10 | 8/10 | 9/10 | +1 | ✅ |
| Medios Visuales | 5 | 0/5 | 5/5 | +5 | ✅ |
| Companion Repo | 3 | 0/3 | 3/3 | +3 | ✅ |
| GEO / AI Search | 5 | 3/5 | 5/5 | +2 | ✅ |
| **TOTAL (rúbrica 8D)** | **88** | **57/88 (~65/100)** | **84/88 (95/100)** | **+26 / +29** | ✅ |
| **TOTAL (rúbrica 15D original)** | **100** | **81/100** | **95/100** | **+14** | ✅ |

> Interpretación del cambio: **+14 puntos en escala 0-100** (81 → 95) = **MEJORA SIGNIFICATIVA** ✅.  
> El salto original (81 → 94) se debió a la resolución de los 3 issues CRITICAL y a la adición de diagrama, companion, fuentes primarias y `See Also`. El punto adicional (94 → 95) proviene del alt text corregido de los diagramas Mermaid.

### 1.2 Detalle de mediciones por dimensión

#### 1.2.1 SEO On-Page — 15/15 (ANTES: 13/15)

| Check | EN | ES | Estado |
| --- | --- | --- | --- |
| `title` ≤ 60 chars | 57 ✅ | 51 ✅ | ✅ |
| `metaDescription` 50-170 | 152 ✅ | 147 ✅ | ✅ |
| `metaDescription` = `seo.metaDescription` | ✅ | ✅ | ✅ |
| `description` presente | 170 chars | 170 chars | ✅ |
| `relatedResources` 2-6, orden EN/ES | 6 | 6, mismo orden | ✅ |
| `lastUpdated` actualizado | 2026-08-30 | 2026-08-30 | ✅ |
| Sin H1 manual en body | ✅ | ✅ | ✅ |
| Jerarquía H2 → H3 → H4 sin saltos | 9/16/9 | 9/16/9 | ✅ |
| Secciones válidas (Overview, When to Use, Solution, Explanation, Variants, Best Practices, Common Mistakes, FAQ, See Also) | ✅ | ✅ | ✅ |

#### 1.2.2 SEO Técnico — 10/10 (ANTES: 9/10)

| Check | Estado |
| --- | --- |
| Slug kebab-case único (`password-hashing`) | ✅ |
| Sitemap presence (`public/sitemap.xml` y `dist/sitemap.xml`) | ✅ |
| hreflang en sitemap (`en`, `es`, `x-default`) | ✅ |
| Structured data (`WebPage`, `TechArticle`, `FAQPage`, `BreadcrumbList`, `SpeakableSpecification`, `inLanguage`, `educationalLevel`) | ✅ |
| Internal links con trailing slash | ✅ |
| Canonical self-referencing EN y ES | ✅ |
| Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:locale`, `og:type`) | ✅ |
| Paridad técnica EN/ES (H2/H3/H4, code blocks, schema) | ✅ |

#### 1.2.3 Calidad de Contenido — 23/25 (ANTES: 16/25)

- Body prosa: **~2,150 EN / ~2,165 ES** (medición local 2,097/2,110; ambos por encima del mínimo de 1,300 para `recipes`).
- Thin content: **NONE**.
- Information gain: **HIGH** (mecanismos internos de bcrypt/Argon2/PBKDF2, migración paso a paso, criterios cuantificables en tabla).
- Riesgo sobre-optimización: **LOW**.
- FAQ count: **7 EN / 7 ES** (mínimo 3-5 cumplido; variedad de estructura OK).
- Duplicación/canibalización: **LOW** (secciones `See Also` y enlaces internos diferencian recursos competidores).
- Riesgo contenido programático: **LOW**.
- Page-worthiness: **YES**.
- Nota: se deja 1 punto por si se desea añadir benchmarks medidos y más enlaces a fuentes oficiales en el futuro.

#### 1.2.4 Humanización — 14/15 (ANTES: 8/15)

| Métrica | EN | ES |
| --- | --- | --- |
| `model_ai_pct` | **39.5 %** | **37.4 %** |
| `ai_count` / `human_count` | 24 / 88 | 28 / 89 |
| `pattern_totals` | `{}` | `{}` |
| Palabras rojas del listado canónico | 0 | 0 |
| Frases genéricas iniciales | 0 | 0 |
| Tokens al final de oraciones | Ninguno grave | Ninguno grave |
| Voz pasiva (heurística simple) | 7 | 0 |
| Uso de em dash | 3 | 2 |
| Variedad FAQ (no solo "How do I / ¿Cómo") | 100 % | 100 % |
| Primera persona | ✅ | ✅ |
| Paridad humanización EN/ES | PASS | PASS |

> AI score bajó de 46.5 % → 39.5 % (EN) y 43.5 % → 37.4 % (ES), cruzando el umbral de 40 %. Persisten algunas frases con probabilidad IA alta (por ejemplo definiciones de algoritmos), pero el tono es mayormente personal y los `pattern_totals` están vacíos.

#### 1.2.5 Paridad Bilingüe — 9/10 (ANTES: 8/10)

| Campo | EN | ES | OK |
| --- | --- | --- | --- |
| `title` | 57 chars | 51 chars | ✅ |
| `description` | 170 chars | 170 chars | ✅ |
| `metaDescription` | 152 chars | 147 chars | ✅ |
| `lastUpdated` | 2026-08-30 | 2026-08-30 | ✅ |
| `relatedResources` | 6 slugs | 6 slugs, mismo orden | ✅ |
| Body links internos | 5 | 5 | ✅ |
| H2 / H3 / H4 | 9/16/9 | 9/16/9 | ✅ |
| Bloques de código | 9 + 1 Mermaid | 9 + 1 Mermaid | ✅ |
| Longitud prosa | ~2,150 | ~2,165 | ✅ |
| Código / ejemplos | Equivalentes | Equivalentes | ✅ |

> Se mantiene el anglicismo `hashear` en el título ES (aceptado técnicamente). El typo `trabalgo` → `trabajo` de la línea 57 fue corregido y revalidado.

#### 1.2.6 Medios Visuales — 5/5 (ANTES: 0/5)

- Bloques `mermaid` EN/ES: **1 / 1**.
- Diagrama usa `flowchart LR` (horizontal): ✅.
- SVGs generados: `public/assets/diagrams/password-hashing-1.svg` y `password-hashing-es-1.svg`; también copiados a `dist/assets/diagrams/`.
- Build HTML contiene `<img class="mermaid-diagram" src="/assets/diagrams/password-hashing-1.svg" ...>` en EN y el `-es-1` en ES.
- `/lightbox.js` presente en ambos HTML.
- `<img>` tiene `loading="lazy"`, `tabindex="0"`, `role="button"`, `aria-label`.
- Alt text corregido: ya no contiene el prefijo `%% diagram:`; `src/lib/remark-mermaid-blocks.mjs` ahora usa el texto `%% alt:` tal cual y omite comentarios `%%` al derivar el alt por defecto.
- CSS `.mermaid-diagram { max-width: 100%; width: 100%; height: auto; }` en `src/styles/global.css`.
- Sin captura visual real a 375 px; verificación estructural OK.

#### 1.2.7 Companion Repo — 3/3 (ANTES: 0/3)

- Existe `../stack-practices-resources/resources/recipes/authentication/password-hashing/meta.json` con todos los campos requeridos.
- Archivos listados en `files` existen (Python/JS/Java + `pom.xml`, `package.json`, `requirements.txt`, `README.md`, `README.es.md`).
- `README.md` presente EN y ES.
- `node scripts/build-catalog.js` en el repo hermano: PASS (27 recursos catalogados, este slug incluido).
- Enlaces cruzados: el body del recipe apunta al repo (`líneas 61 EN / 64 ES`); el `README.md` del companion apunta a `https://stackpractices.com/recipes/password-hashing/`.

#### 1.2.8 GEO / AI Search — 5/5 (ANTES: 3/5)

- Claridad de entidades: **HIGH** (`bcrypt`, `Argon2`, `PBKDF2`, `salt`, `work factor`).
- Densidad factual: **HIGH** (cifras de iteraciones, memoria, tiempos orientativos, ganador PHC 2015).
- Citas: **SUFFICIENT** (OWASP Password Storage Cheat Sheet, NIST SP 800-63B, Password Hashing Competition, companion repo).
- Pasajes extraíbles: **HIGH** (FAQ, tabla de variantes, migración paso a paso).
- Structured data IA: **OK** (`inLanguage`, `educationalLevel`, `speakable` presentes).
- Paridad GEO bilingüe: **PASS**.

---

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

- [x] **[CRITICAL] [CONTENT] Elevar el body prosa por encima de las 1.300 palabras en EN y ES** ✅ RESUELTO  
  - Evidence: `src/content/recipes/authentication/password-hashing.md` y `.es.md`.  
  - Antes: ~1,003 EN / ~1,010 ES. Después: ~2,150 EN / ~2,165 ES.  
  - Verificado con conteo local y `npm run content:quality` (2,042 archivos, 0 errores).

- [x] **[CRITICAL] [HUMANIZATION] Reducir `model_ai_pct` por debajo del 40 % en EN y ES** ✅ RESUELTO  
  - Evidence: `ref/output/ai-detect-password-hashing.json`.  
  - Antes: 46.5 % EN / 43.5 % ES. Después: 39.5 % EN / 37.4 % ES.  
  - `pattern_totals: {}` en ambos idiomas; verificado con `python scripts/ai-detect-patterns.py`.

- [x] **[CRITICAL] [CONTENT] Añadir ejemplos de Argon2 y PBKDF2 en JavaScript y Java, no solo Python** ✅ RESUELTO  
  - Evidence: `src/content/recipes/authentication/password-hashing.md` y `.es.md`, sección `Solution`.  
  - Ahora cada algoritmo tiene bloques de código en Python, JavaScript (Node.js) y Java: 9 ejemplos + 1 diagrama Mermaid por idioma.  
  - Verificado con conteo de bloques y build (3,258 páginas OK).

- [x] **[HIGH] [LINKS] Igualar y aumentar enlaces internos contextuales en EN/ES** ✅ RESUELTO  
  - Evidence: `password-hashing.md` (líneas 69-70, 75, 479, 481) y `.es.md` (líneas 72-73, 80, 486, 488).  
  - Antes: EN 3 / ES 5. Después: EN 5 / ES 5, mismos destinos y con trailing slash.  
  - Verificado con `npm run content:links` (0 rotos) y grep de enlaces internos.

- [x] **[HIGH] [GEO] Añadir 2-4 enlaces externos a fuentes primarias y citas verificables** ✅ RESUELTO  
  - Evidence: `password-hashing.md` (líneas 311-322, 336-337) y `.es.md` (líneas 317-328, 342-343).  
  - Fuentes añadidas: Password Hashing Competition, OWASP Password Storage Cheat Sheet, NIST SP 800-63B section 5.1.1.2.  
  - Verificado con `npm run content:links` y grep de `https://`.

- [x] **[HIGH] [SEO/CONTENT] Diferenciar o enlazar recursos competidores internos (`hash-passwords-argon2`, `password-hashing-production`)** ✅ RESUELTO  
  - Evidence: sección `## See Also` / `## Ver También` en `password-hashing.md` (líneas 477-483) y `.es.md` (líneas 484-490).  
  - Se añadieron enlaces con anclas descriptivas que aclaran cuándo usar cada recurso.  
  - Verificado en HTML del build y sitemap.

- [x] **[HIGH] [MEDIA] Añadir un diagrama Mermaid del flujo hash→verify o comparativa de algoritmos** ✅ RESUELTO  
  - Evidence: `password-hashing.md` (líneas 266-283) y `.es.md` (líneas 272-289).  
  - SVGs generados: `password-hashing-1.svg` y `password-hashing-es-1.svg` en `public/assets/diagrams/` y `dist/assets/diagrams/`.  
  - HTML del build contiene `<img class="mermaid-diagram" ...>` con `loading="lazy"` y `tabindex="0"`.  
  - Verificado con `npm run mermaid:render` (68 SVGs, 0 skipped) y `npm run build`.

- [x] **[MEDIUM] [COMPANION] Evaluar la creación de un companion repo ejecutable en `stack-practices-resources`** ✅ RESUELTO  
  - Evidence: `../stack-practices-resources/resources/recipes/authentication/password-hashing/meta.json`.  
  - Archivos: 9 scripts (Python/JS/Java) + `pom.xml`, `package.json`, `requirements.txt`, `README.md`, `README.es.md`.  
  - `node scripts/build-catalog.js` en el repo hermano: PASS (27 recursos catalogados, slug incluido).  
  - Verificado con `Test-Path` y ejecución de `build-catalog.js`.

- [x] **[MEDIUM] [CONTENT] Añadir sección `See Also` / `Further Reading` con recursos internos y externos autorizados** ✅ RESUELTO  
  - Evidence: `password-hashing.md` (líneas 477-483) y `.es.md` (líneas 484-490).  
  - Verificado con lectura de archivos y build HTML.

- [x] **[MEDIUM] [SEO] Refrescar `lastUpdated` al día de la última mejora real** ✅ RESUELTO  
  - Evidence: `password-hashing.md` y `.es.md`, línea 28: `lastUpdated: "2026-08-30"`.  
  - Sitemap regenerado con `lastmod=2026-08-30`.  
  - Verificado con `npm run sitemap`.

- [x] **[MEDIUM] [CONTENT] Ampliar `Variants` con criterios cuantificables y casos de migración** ✅ RESUELTO  
  - Evidence: `password-hashing.md` (líneas 390-394) y `.es.md` (líneas 396-400).  
  - Tabla ahora incluye `Typical memory`, `Typical time`, `Trade-off`, `When to migrate`.  
  - También se añadió subsección `Step-by-step migration` en `Explanation`.  
  - Verificado con lectura de archivos.

- [x] **[LOW] [MOBILE] Realizar verificación móvil** ✅ RESUELTO (estructural)  
  - Evidence: `dist/recipes/password-hashing/index.html` y `dist/es/recipes/password-hashing/index.html` contienen `<meta name="viewport" ...>`.  
  - CSS en `src/styles/global.css`: `.mermaid-diagram { max-width: 100%; width: 100%; height: auto; }`.  
  - No hay imágenes con ancho fijo ni SVG con dimensiones que rompan el viewport.  
  - Nota: no se dispuso de navegador/Playwright para captura visual real a 375 px; la verificación estructural es OK.

### ⚠️ Pendientes

Ningún issue pendiente tras la corrección del typo y el rebuild.

### 🔧 Out of scope

- [ ] **[LOW] [TRAFFIC] Evaluar imagen Open Graph específica cuando esté disponible el generador de OG por recurso** 🔧 OUT OF SCOPE  
  - Razón: el generador de imágenes OG por recurso aún no está implementado (Phase 4+). Actualmente `og:image` sigue siendo genérica (`/og-image.png`).  
  - Recomendación: generar/recortar imagen específica cuando la herramienta esté lista.

- [x] **[LOW] [MEDIA] Mejorar el alt text de los diagramas Mermaid** ✅ RESUELTO  
  - Evidence: `src/lib/remark-mermaid-blocks.mjs`.  
  - Cambio: el plugin ahora devuelve el texto `%% alt:` sin prefijos, y omite líneas `%%` al derivar el alt por defecto. El build genera `alt="Flow from password..."` en EN y `alt="Flujo desde contraseña..."` en ES.

### 🔄 Regresiones

- **0 regresiones.** No se detectaron issues nuevos que afecten build, indexabilidad, SEO técnico o paridad estructural. El typo LOW fue corregido y el alt de Mermaid se resolvió como mejora global.

---

## 3. Definition of Done (actualizada)

### Frontmatter y SEO

- [x] `title` < 60 caracteres e igual al H1 renderizado.
- [x] `description` y `metaDescription` dentro de 50-170 y coincidentes con `seo.metaDescription`.
- [x] `relatedResources` 3-6 slugs coherentes, mismo orden EN/ES.
- [x] `lastUpdated` actualizado y coincidente en ambos idiomas (2026-08-30).
- [x] H1 único generado desde el frontmatter; jerarquía H2 → H3 → H4 sin saltos.

### Body y contenido

- [x] Body prosa ≥ 1.300 palabras en EN y ES (~2,150 / ~2,165).
- [x] Secciones mínimas presentes, con `See Also` / `Ver También` adicional.
- [x] `Solution` incluye ejemplos de Argon2 y PBKDF2 en Python, JavaScript y Java.
- [x] `Variants` con criterios cuantificables (memoria, tiempo, trade-off, migración).
- [x] Al menos 2-3 enlaces internos contextuales coherentes en ambos idiomas (5 EN / 5 ES).
- [x] 2-4 enlaces externos a fuentes primarias (OWASP, NIST, PHC).

### Humanización

- [x] `pattern_totals` vacío.
- [x] `model_ai_pct` EN < 40 % (39.5 %) y ES < 40 % (37.4 %).
- [x] Tono en primera persona, trade-offs explícitos, sin frases exclusivamente definitorias.

### Paridad EN/ES

- [x] Misma estructura de secciones y orden.
- [x] Misma cantidad y destino de enlaces internos en el body.
- [x] Código y ejemplos equivalentes; comentarios consistentes.
- [x] `lastUpdated` y `relatedResources` coincidentes.
- [x] Ortografía revisada: typo `trabalgo` → `trabajo` corregido y revalidado.

### Medios visuales y companion

- [x] Diagrama Mermaid añadido, SVGs renderizados y referenciados en HTML.
- [x] `/lightbox.js` presente.
- [x] Sin overflow horizontal en móvil (estructural: viewport, max-width 100%).
- [x] Companion repo creado con `meta.json`, archivos y README EN/ES.

### Validación técnica

- [x] `npm run content:quality` → 0 errores, 0 warnings.
- [x] `npm run content:links` → 0 rotos.
- [x] `npm run content:validate` → 0 errores, 0 advertencias.
- [x] `npm run check` → 0 errores, 0 warnings, 3 hints preexistentes.
- [x] `npm run mermaid:render` → 68 SVGs renderizados, 0 skipped.
- [x] `npm run build` → 3.258 páginas OK.
- [x] `npm run sitemap` → 3.256 URLs, EN/ES con hreflang y `lastmod=2026-08-30`.

---

## 4. Top 5 acciones pendientes

1. **(Completado) Corregir el typo `trabalgo` → `trabajo` en `src/content/recipes/authentication/password-hashing.es.md`** — ya corregido y validado.
2. **(Completado) Revisar el plugin `src/lib/remark-mermaid-blocks.mjs`** para eliminar el prefijo `%% diagram:` en el alt text de todos los diagramas Mermaid — ya corregido y validado.
3. **(Phase 4+) Generar imagen Open Graph específica** por recurso cuando esté disponible el generador — impacto LOW en CTR, esfuerzo bajo cuando la herramienta exista.
4. **(Cuando se disponga de navegador) Realizar verificación visual móvil a 375 px** con Playwright/wavexis y capturar screenshot en `ref/audit/reports/screenshots/` — impacto LOW, esfuerzo bajo.
5. **Mantener el companion repo actualizado** con benchmarks medidos anuales del work factor para reforzar E-E-A-T y linkable asset — impacto MEDIO a largo plazo, esfuerzo bajo.

---

## 5. Veredicto y recomendación

**PUNTAJE TOTAL: 95/100**  
**ESTADO PÁGINA: EXCELLENT**  
**RECOMENDACIÓN: PROMOTE**

El recurso `recipes/password-hashing` pasó de 81/100 (GOOD, FIX-THEN-PROMOTE) a 95/100 (EXCELLENT) tras dos rondas de mejoras. Se resolvieron los tres issues CRITICAL (thin content, AI score, ejemplos incompletos), los cuatro HIGH (enlaces internos, fuentes primarias, diferenciación de recursos competidores, diagrama Mermaid), los cuatro MEDIUM (companion, See Also, lastUpdated, Variants cuantificables) y el issue LOW/OUT OF SCOPE de alt text Mermaid a nivel de plugin global. El build genera 3.258 páginas sin errores, el sitemap y el structured data están OK, y la paridad bilingüe es sólida.

**Recomendación final:** PROMOTE. El typo, el build y el alt de Mermaid ya fueron corregidos y revalidados. La única observación LOW/OUT OF SCOPE restante es la imagen Open Graph específica por recurso, que depende de un generador de OG no implementado aún (Phase 4+).

---

## 6. Anexos

### 6.1 — Validación técnica

| Comando | Resultado |
| --- | --- |
| `npm run content:quality` | ✅ 0 errores, 0 warnings (2,042 archivos) |
| `npm run content:links` | ✅ 0 rotos (1,025 archivos) |
| `npm run content:validate` | ✅ 0 errores, 0 advertencias (1,021 archivos) |
| `npm run check` | ✅ 0 errores, 0 warnings, 3 hints preexistentes |
| `npm run mermaid:render` | ✅ 68 SVGs, 0 skipped |
| `npm run build` | ✅ 3,258 páginas, SRI añadidos |
| `npm run sitemap` | ✅ 3,256 URLs, 6,602 image entries, `lastmod=2026-08-30` |

### 6.2 — Medición de palabras y estructura

| Métrica | EN | ES |
| --- | --- | --- |
| Palabras prosa (sin bloques de código, Unicode) | 2,097 | 2,110 |
| Palabras body (incluyendo bloques de código) | 2,680 | 2,700 |
| Conteo de referencia (prosa) | ~2,150 | ~2,165 |
| H2 / H3 / H4 | 9 / 16 / 9 | 9 / 16 / 9 |
| Bloques de código | 9 + 1 Mermaid | 9 + 1 Mermaid |
| FAQ | 7 | 7 |
| Enlaces internos | 5 | 5 |
| Enlaces externos | 4 | 4 |

### 6.3 — AI detection

| Métrica | EN | ES |
| --- | --- | --- |
| `model_ai_pct` | 39.5 % | 37.4 % |
| `ai_count` / `human_count` | 24 / 88 | 28 / 89 |
| `pattern_totals` | `{}` | `{}` |
| Archivo de output | `ref/output/ai-detect-password-hashing.json` | `ref/output/ai-detect-password-hashing.json` (misma JSON, etiqueta `password-hashing-es`) |

### 6.4 — Post-build (Mermaid / lightbox / móvil estructural)

- `dist/recipes/password-hashing/index.html` contiene `<img class="mermaid-diagram" src="/assets/diagrams/password-hashing-1.svg" alt="Flow from password and salt through a hash function into the database and verification" loading="lazy" tabindex="0" role="button" ...>`.
- `dist/es/recipes/password-hashing/index.html` contiene `<img class="mermaid-diagram" src="/assets/diagrams/password-hashing-es-1.svg" alt="Flujo desde contraseña y salt hacia la función de hash, la base de datos y la verificación" loading="lazy" tabindex="0" role="button" ...>`.
- Ambos HTML incluyen `<script src="/lightbox.js" defer></script>` y `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- SVGs en `dist/assets/diagrams/`: `password-hashing-1.svg` y `password-hashing-es-1.svg`.
- CSS `.mermaid-diagram` aplica `max-width: 100%; width: 100%; height: auto;` en `src/styles/global.css`.

### 6.5 — Companion repo

- Ruta: `../stack-practices-resources/resources/recipes/authentication/password-hashing/`
- `meta.json`: completo con `title`, `title_es`, `description`, `description_es`, `type`, `topic`, `slug`, `source_urls`, `language`, `tags`, `files`.
- Archivos listados: 14 archivos existen.
- `build-catalog.js` del repo hermano generó `resources.json` con **27 recursos**.
- `README.md` y `README.es.md` presentes; `README.md` enlaza a `https://stackpractices.com/recipes/password-hashing/`.
