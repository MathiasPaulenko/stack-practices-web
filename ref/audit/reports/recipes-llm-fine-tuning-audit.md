# Re-auditoría — recipes/llm-fine-tuning

## 0. Metadata del recurso

- **Tipo (contentType):** recipes
- **Slug:** llm-fine-tuning
- **Topic:** ai
- **Ruta EN:** `src/content/recipes/ai/llm-fine-tuning.md`
- **Ruta ES:** `src/content/recipes/ai/llm-fine-tuning.es.md`
- **URL producción EN:** `https://stackpractices.com/recipes/llm-fine-tuning/`
- **URL producción ES:** `https://stackpractices.com/es/recipes/llm-fine-tuning/`
- **Título EN:** Fine-Tune a Language Model for Code Generation (46 chars)
- **Título ES:** Fine-Tuning de un LLM para Generación de Código (47 chars)
- **metaDescription EN:** 152 chars
- **metaDescription ES:** 143 chars
- **description EN:** 72 chars
- **description ES:** 66 chars
- **lastUpdated:** 2026-08-29
- **publishedAt:** 2026-06-13
- **difficulty:** advanced
- **author:** Mathias Paulenko
- **relatedResources:** 6 (dentro del rango, mismo orden EN/ES)
- **Companion repo:** Sí, en `../stack-practices-resources/resources/recipes/ai/llm-fine-tuning/`
- **Mermaid diagrams:** 2 (EN + ES)
- **Build ejecutado:** Sí — 3258 páginas
- **Sitemap:** Incluido (EN y ES con hreflang, lastmod 2026-08-29)

---

## 1. Scorecard comparativo

### 1.1 Score anterior (auditoría inicial — 14 dimensiones)

| Dimensión | Peso | Antes | Después | Cambio |
|-----------|------|-------|---------|--------|
| Intención de búsqueda y ajuste SERP | 15 | 10/15 | 14/15 | +4 |
| Calidad de contenido y utilidad | 15 | 8/15 | 13/15 | +5 |
| Information gain y originalidad | 10 | 6/10 | 8/10 | +2 |
| Cobertura semántica / tópica | 10 | 9/10 | 10/10 | +1 |
| Enlazado interno y arquitectura | 8 | 7/8 | 8/8 | +1 |
| SEO técnico e indexabilidad | 10 | 10/10 | 10/10 | 0 |
| E-E-A-T / Confianza | 8 | 4/8 | 7/8 | +3 |
| UX / legibilidad / accesibilidad | 7 | 7/10 | 9/10 | +2 |
| GEO / AI Search readiness | 5 | 4/5 | 5/5 | +1 |
| Tráfico y potencial de crecimiento | 10 | 5/10 | 6/10 | +1 |
| Structured data | 3 | 3/3 | 3/3 | 0 |
| Performance | 5 | 5/5 | 5/5 | 0 |
| Medios / imágenes | 2 | 0/2 | 2/2 | +2 |
| Frescura / mantenibilidad | 2 | 2/2 | 2/2 | 0 |
| **TOTAL** | | **80/100** | **94/100** | **+14** |

### 1.2 Re-auditoría por dimensiones (rubrica consolidada de 8 categorías)

| Dimensión | Antes (cualitativo) | Después | Estado |
|-----------|---------------------|---------|--------|
| SEO On-Page | Title ES 62 chars; resto OK. | 14/15 | ✅ |
| SEO Técnico | Sin problemas técnicos. | 10/10 | ✅ |
| Calidad de contenido | Body < 1300, placeholders, poca profundidad en hiperparámetros. | 21/25 | ✅ |
| Humanización | EN 48.8% AI, tono descriptivo, em dashes. | 12/15 | ✅ |
| Paridad bilingüe | Title ES over; estructura equivalente. | 10/10 | ✅ |
| Medios visuales | Sin diagramas. | 5/5 | ✅ |
| Companion repo | No existía. | 3/3 | ✅ |
| GEO / AI Search | Sin enlaces oficiales/citas. | 5/5 | ✅ |

**Interpretación:** +10 o más puntos es MEJORA SIGNIFICATIVA ✅. El recurso pasó de `FIX-THEN-PROMOTE` (80/100) a `PROMOTE` (94/100).

### 1.3 Decisiones finales

- **PUNTAJE TOTAL:** 94/100
- **ESTADO PÁGINA:** VERY STRONG
- **DECISIÓN INDEXACIÓN:** INDEX
- **PAGE-WORTHINESS:** YES
- **RIESGO THIN CONTENT:** NONE
- **RIESGO DUPLICACIÓN:** LOW
- **RIESGO CANIBALIZACIÓN:** LOW
- **SEO TÉCNICO:** PASS
- **CALIDAD CONTENIDO:** STRONG
- **GEO READINESS:** EXCELLENT
- **POTENCIAL TRÁFICO:** MEDIUM
- **PARIDAD BILINGÜE:** PASS
- **RIESGO PATRÓN IA:** LOW
- **RIESGO CONTENIDO PROGRAMÁTICO:** LOW
- **RIESGO SOBRE-OPTIMIZACIÓN:** LOW

**Veredicto:** `PROMOTE`.

---

## 2. Checklist de arreglos actualizado

### ✅ Resueltos

- [x] **[HIGH] [CONTENT] Cuerpo por debajo del mínimo de palabras para recipes**
  - **Evidence:** `src/content/recipes/ai/llm-fine-tuning.md` y `llm-fine-tuning.es.md`.
  - **Antes:** EN 1122 palabras / ES 1227.
  - **Después:** EN ~1765 palabras / ES ~1752.
  - **Verificado:** conteo de palabras con `re` y build.

- [x] **[HIGH] [HUMANIZATION] EN AI detection 48.8% y tono meramente descriptivo**
  - **Evidence:** `ref/output/ai-detect-llm-fine-tuning.json`.
  - **Antes:** EN 48.8%, ES 37.1%.
  - **Después:** EN 38.9%, ES 36.6%; `pattern_totals` vacío.
  - **Verificado:** `scripts/ai-detect-content.py` y `scripts/ai-detect-patterns.py`.

- [x] **[HIGH] [GEO] Sin enlaces externos ni citas a documentación oficial**
  - **Evidence:** `## See Also` / `## Ver También`.
  - **Después:** 5 enlaces oficiales (LoRA, QLoRA, HF PEFT, OpenAI, W&B).
  - **Verificado:** `grep` de `](https://` en el body.

- [x] **[HIGH] [MEDIA/COMPANION] No existe companion repo para una receta con código multi-paso**
  - **Evidence:** `../stack-practices-resources/resources/recipes/ai/llm-fine-tuning/`.
  - **Después:** `fine_tune.py`, `requirements.txt`, `data/`, `README.md/es`, `meta.json`.
  - **Verificado:** `node scripts/build-catalog.js` genera 20 recursos.

- [x] **[HIGH] [SEO] Título ES excede 60 caracteres**
  - **Evidence:** `src/content/recipes/ai/llm-fine-tuning.es.md` línea 4.
  - **Antes:** 62 chars.
  - **Después:** 47 chars.
  - **Verificado:** conteo de caracteres.

- [x] **[MEDIUM] [CONTENT] Código con placeholders que no es copy-paste ready**
  - **Evidence:** `## Solution` / `## Solución`.
  - **Después:** ejemplo Python con funciones reales (`add`/`double` y `duplicar`/`sumar`), y CLI completo.
  - **Verificado:** lectura de bloques de código.

- [x] **[MEDIUM] [CONTENT] Overview empieza con definición genérica**
  - **Evidence:** `## Overview` / `## Visión General`.
  - **Después:** gancho desde un problema real de equipos con LLMs.
  - **Verificado:** lectura del recurso.

- [x] **[MEDIUM] [HUMANIZATION] ES AI detection 37.1%**
  - **Evidence:** `ref/output/ai-detect-llm-fine-tuning.json`.
  - **Después:** 36.6% con `pattern_totals` vacío.
  - **Verificado:** Desklib + `ai-detect-patterns.py`.

- [x] **[MEDIUM] [MEDIA] Sin diagramas ni imágenes**
  - **Evidence:** `public/assets/diagrams/llm-fine-tuning-1.svg` y `llm-fine-tuning-es-1.svg`.
  - **Después:** Mermaid `flowchart LR` en ambos idiomas.
  - **Verificado:** `npm run mermaid:render` y `grep` en `dist/`.

- [x] **[MEDIUM] [CONTENT] Explanation podría profundizar en trade-offs de LoRA/QLoRA**
  - **Evidence:** `## Explanation` → `### Picking LoRA hyperparameters` / `### Elegir los hiperparámetros de LoRA`.
  - **Después:** tabla con casos (`r`, `lora_alpha`, notas) y sección de costos.
  - **Verificado:** lectura del recurso.

### ⚠️ Pendientes

Ninguno.

### 🔧 Out of scope

- [ ] **[LOW] [TRAFFIC] Sin datos de GSC/GA4 verificables**
  - **Razón:** No se dispone de Search Console / GA4 en esta sesión.
  - **Recomendación:** Revisar CTR y posiciones cuando haya acceso.

- [ ] **[LOW] [MOBILE] Verificación visual móvil no realizada**
  - **Razón:** Sin acceso a navegador en esta sesión.
  - **Recomendación:** Validar con wavexis/playwright a 375px; verificar tablas de costos.

### 🔄 Regresiones

Ninguna.

---

## 3. Definition of Done (actualizada)

- [x] Todos los HIGH resueltos.
- [x] Todos los MEDIUM resueltos.
- [x] Body EN y ES supera 1300 palabras.
- [x] AI detection EN < 40% y ES < 40% o `pattern_totals` vacío con justificación.
- [x] Sin líneas markdown > 120 caracteres.
- [x] Build pasa sin errores (`npm run build`).
- [x] `npm run content:quality` 0 errors, 0 warnings.
- [x] `npm run content:links` 0 rotos.
- [x] `npm run content:validate` 0 errors.
- [x] `npm run check` 0 errors, 0 warnings, 3 hints preexistentes.
- [x] Sitemap regenerado con EN y ES.
- [x] Companion repo creado, catalogado y READMEs sin warnings MD029/MD040.
- [x] Paridad EN/ES verificada.
- [x] Mermaid SVG renderizado.
- [x] Verificación móvil estructural OK.

---

## 4. Top 5 acciones pendientes

1. ✅ Expandir el cuerpo y añadir voz en primera persona.
2. ✅ Añadir enlaces externos/citas oficiales.
3. ✅ Crear el companion repo con script runnable.
4. ✅ Corregir el título ES a ≤60 caracteres.
5. ✅ Añadir un diagrama Mermaid del pipeline de fine-tuning.

---

## 5. Veredicto y recomendación

El recurso `llm-fine-tuning` pasó de un score de 80/100 (`FIX-THEN-PROMOTE`) a 94/100 (`PROMOTE`). Se resolvieron todos los items HIGH y MEDIUM: el cuerpo se expandió y humanizó, se añadieron citas oficiales, un companion ejecutable y un diagrama del pipeline. La paridad EN/ES se mantuvo, el build pasa, la detección de IA quedó dentro de umbrales aceptables y no se detectaron regresiones.

**Recomendación:** `PROMOTE` — el recurso está listo para commit/push.

---

## 6. Anexos

### Anexo 1 — Métricas de contenido final

| Métrica | EN | ES |
|---------|----|----|
| Body words | ~1765 | ~1752 |
| H2 | 9 | 9 |
| H3 (prose) | 14 | 14 |
| FAQ pairs | 8 | 8 |
| Code blocks (prose-relevant) | Python, JavaScript, Java, Mermaid, QLoRA | Python, JavaScript, Java, Mermaid, QLoRA |
| Mermaid blocks | 1 | 1 |
| Internal links | 5 | 6 |
| External links | 5 | 5 |

### Anexo 2 — AI detection final

| Idioma | Desklib `model_ai_pct` | `pattern_totals` |
|--------|------------------------|------------------|
| EN     | 38.9%                  | vacío            |
| ES     | 36.6%                  | vacío            |

Output: `ref/output/ai-detect-llm-fine-tuning.json`

### Anexo 3 — Validación técnica final

| Comando | Resultado |
|---------|-----------|
| `npm run content:quality` | ✅ 0 errores, 0 warnings |
| `npm run content:links` | ✅ 0 rotos |
| `npm run content:validate` | ✅ 0 errores, 0 warnings |
| `npm run check` | ✅ 0 errores, 0 warnings, 3 hints preexistentes |
| `npm run mermaid:render` | ✅ 48 SVGs, 0 skipped |
| `npm run build` | ✅ 3258 páginas |
| `npm run sitemap` | ✅ 3256 URLs, 6602 image entries |

### Anexo 4 — Verificación post-build final

- `dist/recipes/llm-fine-tuning/index.html` y `dist/es/recipes/llm-fine-tuning/index.html` generados.
- `<link rel="canonical">`, `hreflang`, `og:*`, `viewport` presentes.
- `/lightbox.js` presente en ambas páginas.
- `TechArticle`, `FAQPage`, `BreadcrumbList`, `speakable`, `inLanguage` presentes.
- Imágenes Mermaid `<img class="mermaid-diagram">` presentes en ambas páginas con `loading="lazy"` y `tabindex="0"`.
- Sitemap incluye ambas URLs con `lastmod 2026-08-29` e `hreflang`.

### Anexo 5 — Estado del companion repo final

- Ruta: `../stack-practices-resources/resources/recipes/ai/llm-fine-tuning/`
- Archivos: `fine_tune.py`, `requirements.txt`, `data/train.jsonl`, `data/val.jsonl`, `README.md`, `README.es.md`, `meta.json`
- `node scripts/build-catalog.js` en el repo companion: ✅ 20 recursos.
