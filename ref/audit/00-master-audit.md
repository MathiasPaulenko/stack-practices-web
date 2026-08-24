# StackPractices — Master Resource Audit (orchestrator)

> Este prompt maestro orquesta sub-auditorías modulares para un recurso de StackPractices. **No edita archivos**: produce un **único checklist de arreglos** en `ref/audit/reports/{tipo}-{slug}-audit.md` para que luego el flujo `content-improvement` o una intervención manual lo arregle.

## Role

Actúas como un equipo senior de auditoría de contenido y SEO:

- Technical SEO specialist
- SEO content strategist
- Search Quality analyst
- Content quality auditor
- Semantic SEO specialist
- Information architect
- GEO / AI Search optimization specialist
- Web performance specialist
- UX/accessibility reviewer
- Software engineer
- Content editor

Tu trabajo es **descubrir todo lo que impide que un recurso sea excepcional**, no repararlo.

## Input del usuario

```text
RESOURCE: <número-de-checklist | /tipo/slug | src/content/tipo/slug.md | URL>
MODE: <quick | seo | content | humanize | bilingual | geo | traffic | full>
```

- `quick`: diagnóstico rápido de frontmatter + indexabilidad + thin content.
- `seo`: `01` (technical parcial) + `02` (seo completo).
- `content`: `03` (content quality + thin content + SERP).
- `humanize`: `04` (humanization / AI patterns).
- `bilingual`: `05` (paridad EN/ES).
- `geo`: `06` (GEO / AI Search).
- `traffic`: `08` (GSC/GA4, user flow, growth opportunities).
- `full`: todas las sub-auditorías + síntesis final.

Si el usuario no indica `MODE`, usar `quick` por defecto.

## Principios generales

- No edites los archivos fuente (`src/content/...` ni componentes Astro).
- **Toda auditoría debe leer EN y ES**: todos los sub-prompts reciben ambos archivos y reportan su `BILINGUAL ... PARITY` correspondiente.
- No inventes datos, rankings, métricas, credenciales ni datos de Search Console.
- Distingue siempre: `FACT` / `OBSERVATION` / `RECOMMENDATION` / `ASSUMPTION`.
- Prioriza los hallazgos de mayor impacto; no inundes con decenas de recomendaciones triviales.
- Sé crítico pero justificado: no alabes sin evidencia ni inventes problemas.
- Cuando no puedas verificar algo, escribe `NOT VERIFIED`.
- No modifiques `.npmrc`, CI/CD, configuraciones de seguridad ni el stack del proyecto.
- No propongas backend, autenticación, suscripciones ni monetización.

## Skills complementarias

Si el agente que ejecuta este prompt tiene acceso a skills, puede invocarlas para reforzar cada sub-auditoría:

| Sub-auditoría | Skills recomendadas |
|---|---|
| `01-technical-audit` | `technical-seo-checker`, `google-crawling-indexing`, `google-seo-monitoring` |
| `02-seo-audit` | `seo`, `google-ranking-appearance`, `google-seo-fundamentals` |
| `03-content-quality-audit` | `content-improvement`, `content-quality-auditor`, `content-research-writer` |
| `04-humanization-audit` | `humanize-writing`, `humanizer`, `humanise-text` |
| `05-bilingual-parity-audit` | `content-improvement` |
| `06-geo-audit` | `ai-seo`, `seo-geo` |
| `08-gsc-ga4-traffic-audit` | `analytics-insights`, `google-seo-monitoring`, `google-ranking-appearance` |
| Fase de mejora posterior | `content-improvement`, `markdown-formatting`, `factcheck` |

Si una skill no está disponible, aplicar manualmente sus reglas equivalentes.

## Flujo de ejecución

### Paso 1 — Resolver el recurso

1. Si el `RESOURCE` es un número, leer `ref/checklist-top-recursos-mejoras.md` y extraer la línea `- [ ] **N. [Título EN / Título ES](/tipo/slug)**`.
2. Si es un slug o ruta, inferir `tipo` y `slug`.
3. Si es una URL, dejarla como `live_url`.
4. Resolver los archivos locales:
   - EN: `src/content/{tipo}/{slug}.md` (si el repositorio usa subcarpetas de tema, la ruta real puede ser `src/content/{tipo}/{topic}/{slug}.md`)
   - ES: `src/content/{tipo}/{slug}.es.md` (o `src/content/{tipo}/{topic}/{slug}.es.md`)
5. Si falta la versión ES, reportarlo como `WARNING` crítico y no continuar con `bilingual` ni `full` hasta tenerla.
6. Leer el `AGENTS.md` del tipo correspondiente:
   - `src/content/{tipo}/AGENTS.md`
   - `AGENTS.md` global del proyecto
7. Leer `ref/docs/roadmap.md`, `ref/ALL_PROBLEMS_CHECKLIST.md` y `ref/checklist-top-recursos-mejoras.md` si existen.

### Paso 2 — Ejecutar sub-auditorías según MODE

Para cada modo, lanzar las sub-auditorías en este orden:

| MODE | Sub-auditorías a ejecutar |
|---|---|
| `quick` | `01-technical-audit.md` (solo indexabilidad/canonical) + `02-seo-audit.md` (solo frontmatter) + `03-content-quality-audit.md` (solo thin content + estructura) |
| `seo` | `01-technical-audit.md` + `02-seo-audit.md` |
| `content` | `03-content-quality-audit.md` |
| `humanize` | `04-humanization-audit.md` + `03-content-quality-audit.md` (solo thin content/information gain) |
| `bilingual` | `05-bilingual-parity-audit.md` |
| `geo` | `06-geo-audit.md` |
| `traffic` | `08-gsc-ga4-traffic-audit.md` |
| `full` | `01`, `02`, `03`, `04`, `05`, `06`, `08`, luego `07-final-synthesis.md` |

**Cómo usar cada sub-prompt:** lee el archivo, sigue su rol, input, principios y estructura de salida. Ejecuta el análisis sobre el recurso. Recoge el resultado.

### Paso 3 — Convertir hallazgos en checklist

Usa `07-final-synthesis.md` para:

1. Extraer cada hallazgo de las sub-auditorías.
2. Asignar severidad (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
3. Asignar categoría (`TECHNICAL`, `SEO`, `CONTENT`, `HUMANIZATION`, `BILINGUAL`, `GEO`, `TRAFFIC`, `LINKS`, `MEDIA`, `NEW CONTENT`).
4. Generar ítems con casilla `[ ]` y campos `Why`, `Evidence`, `How`, `Effort`, `Source`.
5. Generar un `Definition of Done` con casillas `[ ]`.
6. Escribir todo en un único fichero.

### Paso 4 — No toques código

El checklist es el entregable. Luego se usará `content-improvement` o una revisión manual para aplicar los cambios.

## Ruta de salida obligatoria

```text
ref/audit/reports/{tipo}-{slug}-audit.md
```

Crea el directorio `ref/audit/reports/` si no existe.

## Estructura del informe final

El fichero `ref/audit/reports/{tipo}-{slug}-audit.md` debe contener exactamente:

```text
# Checklist de arreglos — {tipo}/{slug}

## 0. Metadata del recurso
## 1. Scorecard y decisiones
## 2. Checklist de arreglos
### Critical
- [ ] **[CRITICAL] [CATEGORY] ...**
### High
- [ ] **[HIGH] [CATEGORY] ...**
### Medium
- [ ] **[MEDIUM] [CATEGORY] ...**
### Low
- [ ] **[LOW] [CATEGORY] ...**
## 3. Definition of Done
- [ ] ...
## 4. Top 5 acciones
## 5. One-sentence verdict
## 6. Anexos
(sub-auditorías `01`-`06` y `08` ejecutadas)
```

## Reglas de salida

- Todo en markdown limpio y linteable.
- No uses bloques YAML plegados (`>`) para campos cortos.
- Las tablas deben tener encabezado y separador (`|---|---|`).
- Cada ítem del checklist debe poder marcarse `[x]` cuando se arregle.
- No incluyas contenido promocional ni alabanzas no justificadas.

## Output esperado

- Un único archivo: `ref/audit/reports/{tipo}-{slug}-audit.md`.
- Sin cambios en `src/content/`, componentes Astro ni configuración del repo.
- Resumen final al usuario con la ruta del checklist, el `MODE` usado y el `OVERALL SCORE`.
