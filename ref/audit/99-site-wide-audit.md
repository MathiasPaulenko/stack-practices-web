# 99 — StackPractices Site-Wide Audit

> Audita **todo el sitio** usando los prompts de `ref/audit/` y genera un **informe global con prioridades de tráfico y calidad**. **No edita recursos individuales**: produce un único checklist de acciones a nivel sitio.

## Input esperado

- Todos los archivos Markdown en `src/content/{tipo}/` (EN y ES).
- `AGENTS.md` global y de cada tipo.
- `ref/audit/reports/master-checklist.md` si existe.
- `ref/docs/roadmap.md`.
- Salida de los comandos de validación del repo:

```bash
npm run content:quality
npm run content:links
npm run content:validate
npm run check
npm run build
npm run sitemap
```

- Datos de GSC/GA4 si están disponibles.

## Skills complementarias

Si están disponibles, invocar `google-seo-monitoring`, `analytics-insights`, `content-quality-auditor` o `technical-seo-checker` para reforzar el análisis.

## Objetivo

Generar `ref/audit/reports/site-wide-audit.md`, un checklist de arreglos priorizados a nivel sitio, con:

- Métricas globales.
- Problemas críticos.
- Top recursos a arreglar por impacto.
- Oportunidades de tráfico.
- Plan de acción ordenado.

## 1. Descubrir recursos

1. Listar todos los archivos `.md` y `.es.md` de contenido bajo `src/content/{tipo}/` (incluyendo subcarpetas de tema), excluyendo `AGENTS.md`, `README.md` y otros auxiliares.
2. Para cada recurso, identificar:
   - `tipo`
   - `slug`
   - ruta EN
   - ruta ES
   - URL producción EN y ES
   - `contentType` del frontmatter
3. Contar totales:
   - Total de recursos.
   - Recursos por tipo.
   - Recursos con versión ES.
   - Recursos sin versión ES.

## 2. Validación por lotes

Ejecutar o simular:

```bash
npm run content:quality
npm run content:links
npm run content:validate
npm run check
npm run build
npm run sitemap
```

Reportar:

- Errores de lint por archivo.
- `relatedResources` rotos por archivo.
- Frontmatter inválido por archivo.
- Traducciones faltantes.
- Meta descripciones duplicadas.
- Errores de build.

## 3. Auditar cada recurso con los prompts modulares

Para cada recurso, ejecutar `00-master-audit.md` en `quick` como mínimo. Si hay capacidad, ejecutar `traffic` para los recursos con datos de GSC/GA4 o con potencial de tráfico.

Recopilar por recurso:

- `OVERALL SCORE`.
- `THIN CONTENT RISK`.
- `DUPLICATION RISK`.
- `CANNIBALIZATION RISK`.
- `AI PATTERN RISK`.
- `BILINGUAL PARITY`.
- `TRAFFIC POTENTIAL` (si aplica).
- Top 3 problemas.
- Top 3 oportunidades.

Si no es posible auditar todos los recursos por capacidad, priorizar:

1. Los que tienen tráfico en GSC.
2. Los que están en `ref/audit/reports/master-checklist.md`.
3. Los tipos con más recursos (`docs`, `guides`).
4. Los recursos publicados (`draft: false`) y los más visitados según GSC/GA4.
5. Una muestra del resto.

## 4. Métricas globales

Reportar:

```text
TOTAL RESOURCES: N
WITH ES VERSION: N
WITHOUT ES: N
AVERAGE OVERALL SCORE: X/100
RESOURCES BELOW 60: N
RESOURCES 60-79: N
RESOURCES 80-89: N
RESOURCES 90+: N
THIN CONTENT RISK CRITICAL: N
DUPLICATE META: N
MISSING TRANSLATIONS: N
BROKEN RELATED RESOURCES: N
BROKEN BODY LINKS: N
BIDIRECTIONAL LINK GAPS: N
RESOURCES WITH LOW INCOMING LINKS (<3): N
DOCS WITH 0-1 BODY LINKS: N
ORPHAN RESOURCES: N
AI PATTERN RISK HIGH+: N
BILINGUAL PARITY FAIL: N
SITEMAP ISSUES: N
GA4 STATUS: OK / BROKEN / NOT VERIFIED
GSC AVERAGE CTR: X%
GSC AVERAGE POSITION: X
```

## 5. Problemas críticos a nivel sitio

Máximo 10. Para cada uno:

- Problema.
- Evidencia.
- Recursos afectados.
- Impacto si no se arregla.
- Acción prioritaria.

Ejemplos:

- Muchos `relatedResources` rotos.
- Cientos de enlaces en el cuerpo con patrón antiguo `/tipo/categoria/slug`.
- GA4 no mide tráfico orgánico.
- Sitemap desactualizado.
- Decenas de recursos sin versión ES.
- Thin content masivo en un tipo.
- Meta descripciones duplicadas en más de X recursos.
- Listing pages con muchas impresiones y 0 clics.
- Clusters con huecos de enlaces bidireccionales.
- Docs con 0-1 enlaces en el cuerpo.

## 6. Top recursos a arreglar por impacto

Seleccionar hasta 20 recursos. Para cada uno:

```text
RECURSO: /tipo/slug/
SCORE: X/100
TRAFFIC POTENTIAL: ...
GSC CLICKS: ...
TOP PROBLEM: ...
TOP OPPORTUNITY: ...
PRIORITY: P0 / P1 / P2
```

Criterios de prioridad:

- **P0**: bloquea tráfico, indexación o revenue (p. ej. GA4 roto, recursos sin ES, broken links masivos).
- **P1**: alto impacto en tráfico o calidad con esfuerzo medio/bajo.
- **P2**: mejoras que escalan tras P0/P1.

## 7. Oportunidades de tráfico a nivel sitio

A partir de `ref/audit/reports/master-checklist.md`, `ref/docs/roadmap.md` y datos por recurso:

- Queries que generan clics y recursos que las cubren mal.
- Queries con impresiones pero 0 clics (CTR bajo).
- Mercados con buen CTR que merecen más contenido en ese idioma.
- Recursos con potencial de linkable asset.
- Clusters temáticos con pocos recursos.
- Listing pages con tráfico desperdiciado.

## 8. Clusters y arquitectura de contenido

- ¿Cada topic tiene recursos suficientes y variados?
- ¿Hay topics huérfanos sin recursos?
- ¿Los recursos de un cluster se enlazan entre sí?
- ¿Hay recursos duplicados o canibalizados entre sí?
- ¿Faltan recursos puente entre topics?

## 9. Duplicación y canibalización

- Títulos duplicados o muy similares.
- H1 duplicados.
- Slugs similares en distintos tipos.
- Recursos que compiten por la misma query.
- Contenido copiado entre recursos (edge cases, best practices genéricas).

## 10. Definition of Done a nivel sitio

Checklist global:

- [ ] Cada recurso tiene EN y ES.
- [ ] Ningún `relatedResources` roto.
- [ ] Sin meta descripciones duplicadas.
- [ ] Sin thin content crítico.
- [ ] Todos los recursos pasan `npm run content:quality`.
- [ ] `npm run build` y `npm run sitemap` exitosos.
- [ ] GA4 mide correctamente.
- [ ] Sitemap actualizado.
- [ ] Cada topic tiene al menos 3-5 recursos de distintos tipos.
- [ ] Top 20 recursos priorizados tienen score ≥ 80.

## 11. Plan de acción global

Ordenado por prioridad P0 → P2:

```text
P0:
1. ...
2. ...

P1:
1. ...
2. ...

P2:
1. ...
2. ...
```

Cada acción debe tener:

- What.
- Why.
- How.
- Expected impact.
- Effort.
- Resources affected.

## 12. Output obligatorio

Escribir en:

```text
ref/audit/reports/site-wide-audit.md
```

Estructura:

```text
# Site-Wide Audit — StackPractices

## 0. Metadata
## 1. Global Metrics
## 2. Batch Validation Results
## 3. Critical Site-Wide Problems
## 4. Top 20 Resources to Fix
## 5. Traffic Opportunities
## 6. Cluster & Architecture
## 7. Duplication & Cannibalization
## 8. Definition of Done
## 9. Global Action Plan
## 10. Annex — Per-Resource Summaries
```

## Reglas

- No editar recursos individuales; solo generar el informe.
- Si no se puede auditar todo, muestra qué se auditó y qué se muestreó.
- Si no hay datos de GSC/GA4, indicar `NOT VERIFIED`.
- No inventar métricas, rankings ni datos de competidores.
- Priorizar el impacto en tráfico y la calidad del sitio.
