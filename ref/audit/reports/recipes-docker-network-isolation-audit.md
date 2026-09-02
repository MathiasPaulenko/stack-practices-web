# Checklist de arreglos — recipes/docker-network-isolation (re-auditoría tras mejoras)

> Re-auditoría MODE=full tras ronda de mejoras con `ref/improve-a-resource.md`
> Fecha: 2026-09-03
> Recurso #35 en `ref/checklist-top-recursos-mejoras.md`
> Score anterior: 61/88 (FIX-THEN-PROMOTE) → Score actual: 83/88 (PROMOTE)

---

## 0. Metadata del recurso

| Campo | Valor |
| --- | --- |
| Tipo (contentType) | `recipes` |
| Slug | `docker-network-isolation` |
| Topic | `devops` |
| Ruta EN | `src/content/recipes/devops/docker-network-isolation.md` |
| Ruta ES | `src/content/recipes/devops/docker-network-isolation.es.md` |
| URL producción EN | `https://stackpractices.com/recipes/docker-network-isolation/` |
| URL producción ES | `https://stackpractices.com/es/recipes/docker-network-isolation/` |
| Título EN | `Docker Network Isolation and Inter-Container Security` (53 chars) ✅ |
| Título ES | `Aislamiento de Red Docker y Seguridad Entre Contenedores` (56 chars) ✅ |
| `description` EN | 116 chars ✅ |
| `description` ES | 129 chars ✅ |
| `metaDescription` EN | 160 chars ✅ (coincide con `seo.metaDescription`) |
| `metaDescription` ES | 146 chars ✅ (coincide con `seo.metaDescription`) |
| `lastUpdated` | `2026-09-03` (EN y ES, actualizado tras mejoras) ✅ |
| `publishedAt` | `2026-07-02` |
| `estimatedReadTime` | 6 (EN y ES) ✅ (antes ausente) |
| `relatedResources` EN/ES | 6 slugs, mismo orden, todos válidos ✅ |
| Palabras body EN | 1,384 (sin bloques de código) ✅ (antes 806) |
| Palabras body ES | 1,423 (sin bloques de código) ✅ (antes 845) |
| H2 EN/ES | 9 / 9, mismo orden ✅ (antes 8/8, +1 See Also) |
| H3 EN/ES | 18 / 18 ✅ (antes 13/13, +5 nuevas sub-secciones) |
| Bloques de código EN/ES | 14 / 14 ✅ (antes 7/7) |
| FAQ items EN/ES | 6 / 6 ✅ |
| Enlaces internos en body EN/ES | 4 / 4 ✅ (antes 0/0) |
| Enlaces externos en body EN/ES | 10 / 10 ✅ (antes 0/0) |
| Mermaid / imágenes EN/ES | 1 / 1 ✅ (antes 0/0) |
| Mermaid `%% alt:` EN/ES | 1 / 1 ✅ (antes 0/0) |
| Companion repo | **EXISTE** ✅ (7 archivos, antes MISSING) |
| Enlace companion en body | True / True ✅ (antes False/False) |
| See Also EN/ES | 1 / 1 ✅ (antes 0/0) |
| AI detect patterns EN | 0 findings ✅ |
| AI detect patterns ES | 0 findings ✅ |
| Primera persona EN | 6 instancias ✅ (antes 2) |
| Em dashes EN/ES | 13 / 13 ✅ |
| Red words | 0 ✅ |
| Anglicismos ES | 0 ✅ |
| Oración definitoria "X es Y" | ✅ EN+ES (antes ausente) |
| Build | `npm run build` 3,260 páginas, exit 0 ✅ |
| `npm run content:quality` | PASS (0 errores, 0 warnings) ✅ |
| `npm run content:links` | PASS (0 enlaces rotos) ✅ |
| `npm run content:validate` | PASS (0 errores, 0 warnings) ✅ |
| `npm run check` | PASS (0 errores, 0 warnings, 3 hints) ✅ |
| `npm run mermaid:render` | PASS (SVGs generados) ✅ |
| `npm run sitemap` | PASS (3,258 URLs, 6,606 image entries) ✅ |
| Companion catalog | `node scripts/build-catalog.js` PASS (33 resources) ✅ |
| Post-build HTML | H1, TechArticle, FAQPage, WebPage, BreadcrumbList, mainEntityOfPage, hreflang (3), viewport, speakable, mermaid-diagram, mermaid alt, companion, lightbox ✅ EN+ES |

---

## 1. Scorecard comparativo (antes vs después)

| Dimensión | Antes | Después | Cambio | Estado |
|-----------|-------|---------|--------|--------|
| SEO On-Page | 12/15 | 15/15 | +3 | ✅ |
| SEO Técnico | 9/10 | 9/10 | 0 | ✅ |
| Calidad Contenido | 14/25 | 22/25 | +8 | ✅ |
| Humanización | 13/15 | 14/15 | +1 | ✅ |
| Paridad Bilingüe | 9/10 | 10/10 | +1 | ✅ |
| Medios Visuales | 1/5 | 5/5 | +4 | ✅ |
| Companion Repo | 0/3 | 3/3 | +3 | ✅ |
| GEO / AI Search | 3/5 | 5/5 | +2 | ✅ |
| **TOTAL** | **61/88** | **83/88** | **+22** | ✅ MEJORA SIGNIFICATIVA |

Interpretación: **+22 puntos → MEJORA SIGNIFICATIVA ✅** (todos los CRITICAL y HIGH resueltos)

---

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

- [x] **[CRITICAL] [CONTENT] Thin content — body de 806/845 palabras** ✅ RESUELTO
  - Evidence: EN body words = 1,384, ES body words = 1,423 (+578/+578)
  - Añadido: overlay network con Swarm, debugging DNS, network pruning, iptables under the hood, compose profiles
  - Verificado con conteo de palabras

- [x] **[CRITICAL] [COMPANION] Companion repo no existe** ✅ RESUELTO
  - Evidence: `D:\Codigo\stack-practices-resources\resources\recipes\devops\docker-network-isolation\` con 7 archivos
  - Archivos: meta.json, docker-compose.yml, Dockerfile, nginx.conf, init-db.sh, README.md, README.es.md
  - `node scripts/build-catalog.js` PASS (33 resources)

- [x] **[HIGH] [SEO] 0 enlaces internos en body EN/ES** ✅ RESUELTO
  - Evidence: EN internal links = 4, ES internal links = 4
  - Enlaces: docker-basics, docker-compose-dev-prod-split, docker-health-check-configuration, docker-secrets-management

- [x] **[HIGH] [SEO] 0 enlaces externos a docs oficiales** ✅ RESUELTO
  - Evidence: EN external links = 10, ES external links = 10
  - Enlaces: Docker networking docs, Compose networking, overlay docs, security guide, CIS Benchmark

- [x] **[HIGH] [MEDIA] Sin diagrama Mermaid de arquitectura de red** ✅ RESUELTO
  - Evidence: EN mermaid = 1, ES mermaid = 1, con `%% alt:` EN+ES
  - SVGs generados en `public/assets/diagrams/docker-network-isolation-1.svg` y `-es-1.svg`
  - Diagrama: `flowchart LR` mostrando web→api→db con redes aisladas

- [x] **[MEDIUM] [SEO] estimatedReadTime ausente** ✅ RESUELTO
  - Evidence: `estimatedReadTime: 6` en EN y ES frontmatter

- [x] **[MEDIUM] [GEO] Falta oración definitoria "X es Y"** ✅ RESUELTO
  - Evidence: EN "Docker network isolation is the practice of segmenting containers..."
  - ES "El aislamiento de red Docker es la práctica de segmentar contenedores..."

- [x] **[MEDIUM] [CONTENT] Sin sección "See Also"** ✅ RESUELTO
  - Evidence: `## See Also` EN, `## Ver También` ES con 5 cross-references externas

- [x] **[MEDIUM] [HUMANIZATION] Primera persona escasa en EN (2)** ✅ RESUELTO
  - Evidence: EN "I" count = 6 (antes 2)
  - Añadido en Best Practices, debugging DNS, iptables under the hood

- [x] **[LOW] [SEO] lastUpdated stale (2026-08-19)** ✅ RESUELTO
  - Evidence: `lastUpdated: "2026-09-03"` en EN y ES

- [x] **[LOW] [GEO] FAQ sin variación de estructura** ✅ ACEPTADO
  - Diversidad ya razonable (Can, How, What, How, Should, When)

- [x] **[LOW] [CONTENT] Sin ejemplos de overlay network con Swarm** ✅ RESUELTO
  - Evidence: Nueva sub-sección "Overlay network with Docker Swarm" con ejemplo completo

- [x] **[LOW] [CONTENT] Sin ejemplo de docker network prune** ✅ RESUELTO
  - Evidence: Nueva sub-sección "Network pruning" con ejemplos de prune con filtros

### ⚠️ Pendientes

- [ ] **[LOW] [BILINGUAL] relatedResources bidireccionalidad 5/6** ⚠️ PENDIENTE
  - Razón: `docker-basics` no enlaza de vuelta. Requiere editar otro recurso.
  - Recomendación: Añadir `/recipes/docker-network-isolation` a los `relatedResources` de `docker-basics.md` y `.es.md`.

### 🔧 Out of scope

(Ninguno)

### 🔄 Regresiones

(Ninguna — 0 regresiones detectadas)

---

## 3. Definition of Done (actualizada)

- [x] Todos los CRITICAL resueltos (2/2) ✅
- [x] Todos los HIGH resueltos (3/3) ✅
- [x] Build pasa sin errores (3,260 páginas) ✅
- [x] Companion repo build pasa (33 resources) ✅
- [x] Verificación móvil estructural sin overflow ✅
- [x] Paridad EN/ES verificada (H2 9=9, H3 18=18, code 14=14, FAQ 6=6) ✅
- [x] `npm run content:quality` PASS (0 errores, 0 warnings) ✅
- [x] `npm run content:links` PASS (0 enlaces rotos) ✅
- [x] `npm run content:validate` PASS (0 errores, 0 warnings) ✅
- [x] `npm run check` PASS (0 errores, 0 warnings, 3 hints) ✅
- [x] `npm run mermaid:render` PASS (SVGs generados) ✅
- [x] `npm run build` PASS (3,260 páginas) ✅
- [x] `npm run sitemap` PASS (3,258 URLs, 6,606 images) ✅
- [x] Post-build HTML checks PASS EN+ES ✅
- [x] Companion catalog PASS ✅
- [x] Sin regresiones ✅
- [x] Body words ≥ 1,000 (EN 1,384, ES 1,423) ✅
- [x] estimatedReadTime presente EN+ES ✅
- [x] Oración definitoria "X es Y" EN+ES ✅
- [x] Mermaid con `%% alt:` EN+ES ✅
- [x] Enlaces internos ≥ 3 (4/4) ✅
- [x] Enlaces externos a docs oficiales (10/10) ✅
- [x] See Also con cross-references externas ✅
- [x] Companion repo con meta.json, docker-compose, Dockerfile, READMEs ✅
- [x] Enlace companion en body ✅
- [ ] Bidireccionalidad relatedResources 6/6 (5/6) ⚠️

---

## 4. Top 5 acciones pendientes

1. **[LOW] Añadir bidireccionalidad docker-basics** — Añadir `/recipes/docker-network-isolation` a los `relatedResources` de `docker-basics.md` y `.es.md`. Esfuerzo: S.
2. **[LOW] Desklib AI content detection** — Ejecutar `python scripts/ai-detect-content.py` con modelo Desklib para tener línea base de AI score. Esfuerzo: S.
3. **[LOW] Screenshot móvil visual** — Verificar visualmente con navegador en 375px. Esfuerzo: S.
4. **[LOW] Añadir ejemplo de macvlan** — La tabla de tipos menciona macvlan pero no hay ejemplo práctico. Esfuerzo: S.
5. **[LOW] Añadir ejemplo de Docker network ACL** — `docker network create --driver bridge --opt com.docker.network.bridge.name=br1` con reglas iptables personalizadas. Esfuerzo: M.

---

## 5. Veredicto y recomendación

**Veredicto:** El recurso mejoró de 61/88 a 83/88 (+22 puntos) tras resolver los 2 CRITICAL (thin content + companion missing) y 3 HIGH (enlaces internos, enlaces externos, Mermaid). Todos los MEDIUM resueltos. 0 regresiones. Todas las validaciones PASS.

**Recomendación:** **PROMOTE** — el recurso está listo para publicación/push.
- Todos los CRITICAL y HIGH resueltos.
- 1 pendiente LOW no bloqueante (bidireccionalidad docker-basics, out of scope).
- 0 regresiones.
- Build pasa (3,260 páginas).
- Companion catalog pasa (33 resources).
- AI patterns: 0 findings EN+ES.

---

## 6. Anexos

### 6.1 AI Detection outputs

| Métrica | Antes | Después | Cambio |
|---------|-------|---------|--------|
| EN patterns | 0 findings | 0 findings | 0 |
| ES patterns | 0 findings | 0 findings | 0 |

- `ref/output/ai-detect-patterns-docker-network-isolation.json` — EN: 0 findings
- `ref/output/ai-detect-patterns-docker-network-isolation-es.json` — ES: 0 findings

### 6.2 Sub-auditorías re-medidas

| # | Dimensión | Antes | Después | Cambio |
|---|-----------|-------|---------|--------|
| 1 | SEO On-Page | 12/15 | 15/15 | +3 |
| 2 | SEO Técnico | 9/10 | 9/10 | 0 |
| 3 | Calidad Contenido | 14/25 | 22/25 | +8 |
| 4 | Humanización | 13/15 | 14/15 | +1 |
| 5 | Paridad Bilingüe | 9/10 | 10/10 | +1 |
| 6 | Medios Visuales | 1/5 | 5/5 | +4 |
| 7 | Companion Repo | 0/3 | 3/3 | +3 |
| 8 | GEO / AI Search | 3/5 | 5/5 | +2 |

### 6.3 Companion repo

- `D:\Codigo\stack-practices-resources\resources\recipes\devops\docker-network-isolation\`
- Archivos: `meta.json`, `docker-compose.yml`, `Dockerfile`, `nginx.conf`, `init-db.sh`, `README.md`, `README.es.md`
- `node scripts/build-catalog.js` PASS (33 resources)

### 6.4 Post-build HTML checks

| Check | EN | ES |
|-------|----|----|
| H1 | ✅ | ✅ |
| mermaid-diagram | ✅ (1) | ✅ (1) |
| lightbox | ✅ | ✅ |
| TechArticle | ✅ | ✅ |
| FAQPage | ✅ | ✅ |
| WebPage | ✅ | ✅ |
| BreadcrumbList | ✅ | ✅ |
| mainEntityOfPage | ✅ | ✅ |
| hreflang (3 tags) | ✅ | ✅ |
| viewport | ✅ | ✅ |
| speakable | ✅ | ✅ |
| companion link | ✅ (1) | ✅ (1) |
| SVG existe | ✅ | ✅ |
| H2 count | 14 | 14 |
| H3 count | 18 | 18 |

### 6.5 Validaciones

| Validación | Resultado |
|------------|-----------|
| `npm run content:quality` | PASS (0 errores, 0 warnings) |
| `npm run content:links` | PASS (0 broken relatedResources) |
| `npm run content:validate` | PASS (0 errores, 0 warnings) |
| `npm run check` | PASS (0 errores, 0 warnings, 3 hints) |
| `npm run mermaid:render` | PASS (SVGs generados) |
| `npm run build` | PASS (3,260 páginas) |
| `npm run sitemap` | PASS (3,258 URLs, 6,606 images) |
| Companion `build-catalog.js` | PASS (33 resources) |

### 6.6 Resumen de issues

| Issue | Severidad | Categoría | Estado | Evidence |
|-------|-----------|-----------|--------|----------|
| Thin content 806/845 palabras | CRITICAL | CONTENT | ✅ RESUELTO | EN 1,384, ES 1,423 |
| Companion repo missing | CRITICAL | COMPANION | ✅ RESUELTO | 7 archivos, catalog PASS |
| 0 enlaces internos | HIGH | SEO | ✅ RESUELTO | 4/4 enlaces contextuales |
| 0 enlaces externos | HIGH | SEO | ✅ RESUELTO | 10/10 a docs oficiales |
| Sin diagrama Mermaid | HIGH | MEDIA | ✅ RESUELTO | flowchart LR EN+ES, SVGs |
| estimatedReadTime ausente | MEDIUM | SEO | ✅ RESUELTO | 6 en EN+ES |
| Sin oración definitoria | MEDIUM | GEO | ✅ RESUELTO | "is the practice of..." |
| Sin See Also | MEDIUM | CONTENT | ✅ RESUELTO | 5 cross-references |
| Primera persona escasa EN | MEDIUM | HUMANIZATION | ✅ RESUELTO | 2→6 instancias |
| lastUpdated stale | LOW | SEO | ✅ RESUELTO | 2026-09-03 |
| FAQ variety | LOW | GEO | ✅ ACEPTADO | Diversidad razonable |
| Sin overlay Swarm ejemplo | LOW | CONTENT | ✅ RESUELTO | Sub-sección añadida |
| Sin network prune ejemplo | LOW | CONTENT | ✅ RESUELTO | Sub-sección añadida |
| Bidireccionalidad 5/6 | LOW | BILINGUAL | ⚠️ PENDIENTE | docker-basics sin reciproco |

Resumen numérico:
- Total issues antes: 14
- ✅ Resueltos: 13
- ⚠️ Pendientes: 1
- 🔧 Out of scope: 0
- 🔄 Regresiones: 0

### 6.7 Verificación móvil

- **Viewport meta:** Presente EN+ES ✅
- **Mermaid SVG:** Horizontal `flowchart LR`, responsive ✅
- **Lightbox:** Cargado con `defer` EN+ES ✅
- **Screenshot visual:** NOT VERIFIED (sin acceso a navegador)
