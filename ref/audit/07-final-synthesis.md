# 07 — StackPractices Final Synthesis (checklist output)

> Convierte los outputs de las sub-auditorías en un **checklist de arreglos único** en `ref/audit/reports/{tipo}-{slug}-audit.md`. **No edita los archivos fuente.**

## Input esperado

- Outputs de `01` a `06` y `08` (según el `MODE`).
- `src/content/{tipo}/{slug}.md` y `.es.md` para metadata básica (ajustar si usa `src/content/{tipo}/{topic}/{slug}.md`).
- `ref/checklist-top-recursos-mejoras.md`, `ref/ALL_PROBLEMS_CHECKLIST.md` y `ref/docs/roadmap.md` si existen.

## Skills complementarias

Si está disponible, invocar `content-improvement` para guiar el Definition of Done y `markdown-formatting` para validar el output.

## Objetivo del fichero de salida

El informe final debe ser **un checklist con casillas `[ ]`**, agrupado por severidad y categoría, para que el equipo pueda ir marcando los arreglos a medida que los hace. Las secciones detalladas de cada sub-auditoría van al final como **anexo**.

## Estructura del informe final

El fichero `ref/audit/reports/{tipo}-{slug}-audit.md` debe contener exactamente:

```text
# Checklist de arreglos — {tipo}/{slug}

## 0. Metadata del recurso
## 1. Scorecard y decisiones
## 2. Checklist de arreglos
### Critical
- [ ] ...
### High
- [ ] ...
### Medium
- [ ] ...
### Low
- [ ] ...
## 3. Definition of Done
## 4. Top 5 acciones
## 5. One-sentence verdict
## 6. Anexos (outputs de cada sub-auditoría)
```

## 0. Metadata del recurso

Incluye:

```text
- Tipo (contentType): {recipes | patterns | guides | docs}
- Slug: {slug}
- Ruta EN: src/content/{tipo}/{slug}.md
- Ruta ES: src/content/{tipo}/{slug}.es.md
- URL producción EN: https://stackpractices.com/{tipo}/{slug}/
- URL producción ES: https://stackpractices.com/es/{tipo}/{slug}/
- lastUpdated: ...
- PillarScore (si aplica): ...
- Métricas GSC/GA4 (si disponibles): impresiones, clicks, posición, vistas.
```

## 1. Scorecard y decisiones

### Rúbrica (0-100)

| Dimensión | Peso | Fuente |
|---|---|---|
| Search Intent & SERP Fit | 15 | `03` |
| Content Quality & Helpfulness | 15 | `03` |
| Information Gain & Originality | 10 | `03` |
| Semantic / Topical Coverage | 10 | `03` |
| Internal Linking & Site Architecture | 8 | `01` + `03` |
| Technical SEO & Indexability | 10 | `01` |
| E-E-A-T / Trust | 8 | `03` + `06` |
| UX / Readability / Accessibility | 7 | `03` |
| GEO / AI Search Readiness | 5 | `06` |
| Traffic & Growth Potential | 10 | `08` |
| Structured Data | 3 | `01` + `02` |
| Performance | 5 | `01` |
| Media / Images | 2 | `01` + `03` |
| Freshness / Maintainability | 2 | `03` |

**Interpretación:**

- 95-100: EXCELLENT
- 90-94: VERY STRONG
- 80-89: GOOD
- 70-79: NEEDS IMPROVEMENT
- 60-69: WEAK
- <60: NOT COMPETITIVE

### Decisiones finales

```text
OVERALL SCORE: XX/100
PAGE STATUS: [EXCELLENT / VERY STRONG / GOOD / NEEDS IMPROVEMENT / WEAK / NOT COMPETITIVE]
INDEXING DECISION: [INDEX / IMPROVE FIRST / MERGE / NOINDEX / DELETE]
PAGE-WORTHINESS: [YES / PROBABLY YES / UNCERTAIN / PROBABLY NO / NO]
THIN CONTENT RISK: [NONE / LOW / MEDIUM / HIGH / CRITICAL]
DUPLICATION RISK: [NONE / LOW / MEDIUM / HIGH / CRITICAL]
CANNIBALIZATION RISK: [NONE / LOW / MEDIUM / HIGH / CRITICAL]
TECHNICAL SEO: [PASS / WARNING / FAIL]
CONTENT QUALITY: [EXCELLENT / STRONG / MODERATE / WEAK / POOR]
GEO READINESS: [EXCELLENT / STRONG / MODERATE / WEAK / POOR]
TRAFFIC POTENTIAL: [VERY HIGH / HIGH / MEDIUM / LOW / NONE]
BILINGUAL PARITY: [PASS / WARNING / FAIL]
AI PATTERN RISK: [NONE / LOW / MEDIUM / HIGH / CRITICAL]
PROGRAMMATIC CONTENT RISK: [NONE / LOW / MEDIUM / HIGH / CRITICAL]
OVER-OPTIMIZATION RISK: [NONE / LOW / MEDIUM / HIGH / CRITICAL]
```

## 2. Checklist de arreglos

Convierte cada hallazgo de las sub-auditorías en un ítem con casilla. Agrupa por severidad y, dentro de cada severidad, por categoría.

### Severidad

- `CRITICAL`: bloquea indexación, publicación o genera riesgo grave.
- `HIGH`: impacto alto en ranking/UX/calidad.
- `MEDIUM`: mejora notable pero no crítica.
- `LOW`: pulido o optimización menor.

### Categorías

- `TECHNICAL`
- `SEO`
- `CONTENT`
- `HUMANIZATION`
- `BILINGUAL`
- `GEO`
- `TRAFFIC`
- `LINKS`
- `MEDIA`
- `NEW CONTENT` (solo si aplica)

### Formato de cada ítem

```markdown
- [ ] **[SEVERITY] [CATEGORY] Acción concreta a realizar**
  - Why: por qué importa.
  - Evidence: dónde se observa.
  - How: cómo hacerlo (sin editar archivos; es guía para la fase de mejora).
  - Effort: Very Low / Low / Medium / High / Very High.
  - Source: 01-technical / 02-seo / 03-content / 04-humanization / 05-bilingual / 06-geo / 08-traffic.
```

Ejemplo:

```markdown
- [ ] **[CRITICAL] [TECHNICAL] El recurso no aparece en sitemap.xml**
  - Why: si no está en el sitemap, Google puede no descubrirlo.
  - Evidence: `public/sitemap.xml` no contiene `/{tipo}/{slug}/`.
  - How: Verificar por qué `npm run sitemap` (script `scripts/generate-sitemap-from-dist.py`) no incluye la ruta; corregir el slug, el `contentType` o la colección.
  - Effort: Low.
  - Source: 01-technical.
```

### Máximos

- `CRITICAL`: máximo 5.
- `HIGH`: máximo 15.
- `MEDIUM`: máximo 20.
- `LOW`: máximo 20.

Si hay más, prioriza y menciona en anexo los menores.

## 3. Definition of Done

Checklist de cierre para la fase de mejora. Todos los ítems deberían poder marcarse cuando el recurso esté arreglado.

### Frontmatter e SEO

- [ ] `title` < 60 caracteres, línea única, idéntico al H1.
- [ ] `description` 80-160 caracteres, gancho claro.
- [ ] `metaDescription` 120-160 caracteres, sin duplicados, coincide con `seo.metaDescription`.
- [ ] `relatedResources` 2-6, distintos tipos, sin barra final, mismo orden EN/ES.
- [ ] `topics` existen, 1-3 para recursos, 1-5 para topics.
- [ ] `lastUpdated` actualizado y coincidente en EN/ES.
- [ ] H1 único e igual al `title`.
- [ ] Jerarquía H2 → H3 sin saltos.

### Body y contenido

- [ ] Body por encima del mínimo por tipo.
- [ ] `Overview` empieza con problema real, no con `This guide covers...`.
- [ ] `When to Use` con 4-6 situaciones concretas y al menos una donde NO aplica.
- [ ] Sin secciones de relleno genéricas (`Closing Notes`, `Quick Note`, etc.).
- [ ] `Best Practices` y `Common Mistakes` específicas del dominio.
- [ ] `FAQ` con 2-4 preguntas reales si aplica.
- [ ] Ejemplos concretos, versiones reales de herramientas, no `example.com`.
- [ ] Código con lenguaje y datos de prueba realistas.

### Humanización

- [ ] Sin frases patrón.
- [ ] Sin palabras rojas de IA.
- [ ] Tono humano, primera persona, trade-offs.
- [ ] Párrafos con sustancia.

### Paridad EN/ES

- [ ] Misma estructura de secciones y orden.
- [ ] Metadatos traducidos con longitudes correctas.
- [ ] Código y ejemplos equivalentes.
- [ ] `relatedResources` y `lastUpdated` coincidentes.

### Validación técnica

- [ ] `npm run content:quality`
- [ ] `npm run content:links`
- [ ] `npm run content:validate`
- [ ] `npm run check`
- [ ] `npm run build`
- [ ] `npm run sitemap`

### Enlaces y ecosistema

- [ ] Enlaces internos con anclas descriptivas.
- [ ] `relatedResources` cruzados con distintos tipos.
- [ ] Enlaces externos autorizados y funcionales.
- [ ] Enlaces externos autorizados y funcionales (sin placeholders ni `example.com`).

### Tráfico y crecimiento

- [ ] `title` y `metaDescription` optimizados por idioma/mercado.
- [ ] Open Graph: título, descripción e imagen presentes.
- [ ] Flujo de usuario claro (next step, CTA, recursos relacionados).
- [ ] Enlaces internos hacia/desde recursos con tráfico.
- [ ] Datos de GSC/GA4 revisados si están disponibles.

## 4. Top 5 acciones

Selecciona las 5 acciones de más impacto del checklist. Considera especialmente oportunidades de tráfico/crecimiento. Deben ser concretas y ordenadas por impacto/esfuerzo:

```text
1. ...
2. ...
3. ...
4. ...
5. ...
```

## 5. One-sentence verdict

Una sola frase concisa que diga qué necesita el recurso para ser significativamente más fuerte.

## 6. Anexos

Incluye los outputs completos de cada sub-auditoría ejecutada (`01`-`06`, `08`) como referencia. Para modos parciales, incluye solo las secciones correspondientes y deja constancia del `MODE`.

## Reglas

- No edites archivos de contenido ni código.
- No hagas commit/push sin aprobación.
- No propongas crear recursos complementarios sin justificación clara y, en su caso, aprobación del usuario.
- Si alguna sub-auditoría no se ejecutó (por `MODE`), indícalo claramente.
- El checklist es el producto principal; los anexos son soporte.
