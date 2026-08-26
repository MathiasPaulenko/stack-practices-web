# Audit suite de StackPractices

Esta carpeta contiene los prompts de auditoría de recursos de StackPractices. Se divide en un **orquestador maestro** y sub-prompts especializados. El objetivo es generar un **único checklist de arreglos** (`ref/audit/reports/{tipo}-{slug}-audit.md`) con casillas `[ ]` para que el equipo pueda ir marcando las correcciones a medida que las hace.

## Archivos

| Archivo | Propósito |
|---|---|
| `00-master-audit.md` | Orquestador. Recibe el recurso y el modo, lanza las sub-auditorías y consolida el informe. |
| `01-technical-audit.md` | HTTP, indexabilidad, canonical, sitemap, redirects, structured data, performance. |
| `02-seo-audit.md` | Frontmatter, title, meta, headings, enlaces internos, CTR en SERP, schema. |
| `03-content-quality-audit.md` | Intención, SERP, calidad, thin content, information gain, estructura, page-worthiness. |
| `04-humanization-audit.md` | Patrones IA, palabras rojas, frases genéricas, tono, humanización. |
| `05-bilingual-parity-audit.md` | Paridad EN/ES: estructura, metadatos, ejemplos, relatedResources. |
| `06-geo-audit.md` | GEO / AI Search: entidades, hechos, citas, pasajes extraíbles. |
| `07-final-synthesis.md` | Convierte hallazgos en checklist de arreglos, scorecard, decisiones finales, DoD. |
| `08-gsc-ga4-traffic-audit.md` | Tráfico, GSC/GA4, CTR, flujo de usuario, oportunidades de crecimiento. |
| `09-companion-media-audit.md` | Companion repo, imágenes, diagramas Mermaid (SVG, click-to-zoom, tamaño, SEO de imágenes, accesibilidad, móvil). |
| `99-site-wide-audit.md` | Auditoría global del sitio: recursos, validación por lotes, prioridades. |
| `RESOURCE_FULL_AUDIT.md` | Prompt monolítico original (legacy, single-pass). Se conserva como referencia histórica. Usar `00-master-audit.md` o `ref/audit-a-resource.md` en su lugar. |
| `reports/` | Directorio de salida para los informes consolidados. |

## Modos

- `quick`: frontmatter + indexabilidad + thin content.
- `seo`: technical + SEO.
- `content`: calidad de contenido.
- `humanize`: humanización + calidad mínima.
- `bilingual`: paridad EN/ES.
- `geo`: AI Search readiness.
- `traffic`: GSC/GA4, CTR, user flow, crecimiento.
- `media`: companion repo + imágenes/diagramas.
- `full`: todas las sub-auditorías + síntesis final.
- `site-wide`: ejecutar `99-site-wide-audit.md` para todo el sitio.

## Uso

```text
RESOURCE: 5
MODE: full
```

El maestro resuelve el recurso, ejecuta las sub-auditorías indicadas y escribe el **checklist de arreglos** en:

```text
ref/audit/reports/{tipo}-{slug}-audit.md
```

## Principio clave

**Audit, no fix.** Los prompts no editan archivos de contenido ni de código. El informe resultante es el insumo para `content-improvement` o para un arreglo manual.
