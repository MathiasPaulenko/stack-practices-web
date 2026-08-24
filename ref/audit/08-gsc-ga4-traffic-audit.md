# 08 — StackPractices Traffic & Growth Audit (GSC / GA4 / user flow)

> Audita el recurso desde la perspectiva de tráfico real: Search Console, Analytics, CTR, intención de usuario, flujo de navegación y potencial de crecimiento. **No edita los archivos.**

## Input esperado

- `src/content/{tipo}/{slug}.md` y `.es.md` (ajustar si usa `src/content/{tipo}/{topic}/{slug}.md`).
- `ref/ALL_PROBLEMS_CHECKLIST.md` (problemas globales recuperados).
- `ref/checklist-top-recursos-mejoras.md` (priorización de recursos, si existe).
- `ref/docs/roadmap.md` (roadmap del proyecto).
- Datos de GSC/GA4 si están disponibles para el recurso (clics, impresiones, CTR, posición, queries, países, dispositivos).

## Skills complementarias

Si están disponibles, invocar `analytics-insights`, `google-seo-monitoring`, `google-ranking-appearance` o `google-crawling-indexing` para reforzar el análisis.

## 1. Datos de GSC del recurso

Si hay datos disponibles para `/{tipo}/{slug}/` y `/es/{tipo}/{slug}/`, recopilar:

| Métrica | EN | ES | Total |
|---|---|---|---|
| Clicks | | | |
| Impresiones | | | |
| CTR | | | |
| Posición media | | | |
| Queries principales | | | |
| Países con más clics | | | |
| Dispositivos | | | |

Si no hay datos: `NOT VERIFIED`.

## 2. Tendencia del recurso

- Comparar periodos recientes (últimos 7, 15 y 30 días si es posible).
- ¿El tráfico crece, se estanca o cae?
- ¿Coincide con cambios recientes (actualizaciones de contenido, lanzamientos, rediseños)?
- ¿Los datos están `final` o `fresh`? Si están `fresh`, no sacar conclusiones drásticas.

## 3. CTR y optimización de snippet

- CTR global y por idioma/país.
- Comparar CTR de EN vs. ES.
- Identificar mercados con CTR anómalamente bajo (por ejemplo USA 0,13 % frente a 2 % en otros países).
- Revisar `title` y `meta description` para ese mercado/idioma.
- Diferenciación vs. competidores en SERP.
- Potencial de featured snippet / People Also Ask para las queries principales.
- **Open Graph**: título, descripción e imagen para compartir en redes.

## 4. Queries que generan tráfico

Listar las queries principales por volumen de clics e impresiones:

```text
QUERY | IMPRESIONES | CLICS | CTR | POSICIÓN | INTENCIÓN
```

Para cada query:

- ¿El recurso satisface la intención?
- ¿Podría mejorar la posición con on-page SEO?
- ¿Hay queries relacionadas no cubiertas por el recurso?
- ¿Alguna query sugiere un nuevo contenido complementario?

## 5. Países e idiomas

- ¿En qué países/idiomas tiene mejor CTR?
- ¿En cuáles peor?
- ¿La versión ES está captando tráfico hispanohablante?
- ¿El mercado USA tiene problemas de snippet, competencia o intención?
- Recomendación: ¿impulsar EN, ES u otro idioma?

## 6. Dispositivos

- Desktop vs. mobile vs. tablet.
- ¿Mobile tiene mejor CTR? Si es así, revisar UX mobile y velocidad.
- ¿Desktop tiene muchas impresiones pero pocos clics? Revisar snippet y meta.

## 7. GA4 y medición

Property ID de referencia: `G-RBE12WJ5KZ`.

Si hay datos de GA4:

- Sesiones orgánicas al recurso.
- Tiempo en página / engagement.
- Bounce / exit rate si es confiable.
- Conversiones a recursos relacionados.
- Dispositivos y países en GA4.

Si no hay datos o GA4 está roto, reportar:

```text
GA4 STATUS: NOT VERIFIED / BROKEN / LIMITED
```

Y auditar los problemas técnicos de medición:

- ¿GA4 se carga correctamente?
- ¿El banner de cookies retrasa la carga?
- ¿Ad blockers bloquean el script?
- ¿Retención de datos configurada correctamente?
- ¿GSC y GA4 están vinculados?
- ¿Hay dimensiones personalizadas de content type?

## 8. Flujo de usuario y conversión

Auditar el viaje del usuario dentro del recurso:

- ¿El `Overview` engancha y genera scroll?
- ¿Hay llamadas a la acción naturales (leer recursos relacionados, descargar plantilla, ver caso de prueba, ir al topic hub)?
- ¿Los `relatedResources` son un funnel lógico?
- ¿Hay enlaces internos contextuales a recursos de distintos tipos?
- ¿El recurso enlaza a su topic hub y recibe enlaces del hub?
- ¿Hay dead-ends (páginas sin salida clara)?
- ¿El footer o sección final invita a continuar?

## 9. Potencial de linkable asset

Evaluar si el recurso puede atraer backlinks o compartidos:

- ¿Aporta datos, benchmarks o comparativas originales?
- ¿Tiene plantillas, runbooks o guías descargables útiles?
- ¿Es una guía tan completa que otros sitios podrían citarla?
- ¿Tiene diagramas o gráficos compartibles?
- ¿El título/description funcionan para redes?

## 10. Backlinks y autoridad externa

Si se dispone de datos (Ahrefs, Search Console links, etc.):

- Número de dominios de referencia.
- Calidad de los backlinks.
- Anchors principales.
- Backlinks rotos.

Si no hay datos: `NOT VERIFIED`.

## 11. Mobile UX y CWV

- ¿El recurso es legible y usable en mobile?
- ¿CTAs y enlaces son táctiles?
- ¿No hay popups intrusivos?
- ¿LCP, INP, CLS aceptables? (si hay datos).

## 12. Oportunidades de crecimiento

Para cada oportunidad, estimar:

```text
OPORTUNIDAD:
EVIDENCIA:
IMPACTO ESPERADO: LOW / MEDIUM / HIGH / VERY HIGH
ESFUERZO: Very Low / Low / Medium / High / Very High
PRIORIDAD: P0 / P1 / P2
```

Tipos de oportunidad:

- Mejorar snippet para query X.
- Añadir sección FAQ para captar PAA.
- Crear contenido complementario para query Y.
- Reforzar enlaces internos desde recursos con tráfico.
- Traducir/impulsar versión ES.
- Mejorar UX mobile.
- Arreglar medición GA4.
- Conseguir backlinks outreach.

## 13. Traffic priority

Clasificar el recurso según su potencial de tráfico:

```text
TRAFFIC POTENTIAL: VERY HIGH / HIGH / MEDIUM / LOW / NONE
```

Justificación corta basada en GSC/GA4, posición, queries, intención y oportunidades.

## Output obligatorio

```text
## Traffic & Growth Audit

### GSC Metrics
| Métrica | EN | ES | Total |
|---|---|---|---|
| Clicks | ... | ... | ... |
| Impressions | ... | ... | ... |
| CTR | ... | ... | ... |
| Avg position | ... | ... | ... |

### Trend
`TREND: GROWING / STABLE / DECLINING / NOT VERIFIED`

### CTR & Snippet
`CTR POTENTIAL: LOW / MEDIUM / HIGH`
`SNIPPET APPEAL: LOW / MEDIUM / HIGH`
Mercados con CTR bajo: ...
Open Graph: OK / MISSING / NEEDS IMPROVEMENT

### Top Queries
| Query | Imp | Clicks | CTR | Pos | Intent | Covered? |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... |

### Countries & Languages
- Best CTR: ...
- Worst CTR: ...
- Recommendation: ...

### Devices
- Desktop: ...
- Mobile: ...
- Tablet: ...

### GA4 Status
`GA4 STATUS: OK / LIMITED / BROKEN / NOT VERIFIED`

### User Flow
`USER FLOW: GOOD / NEEDS IMPROVEMENT / POOR`
- Dead-ends: ...
- Funnel opportunities: ...

### Linkable Asset Potential
`LINKABLE ASSET POTENTIAL: NONE / LOW / MEDIUM / HIGH`

### Backlinks
`BACKLINKS: STRONG / WEAK / NONE / NOT VERIFIED`

### Mobile UX
`MOBILE UX: OK / NEEDS IMPROVEMENT / POOR`

### Traffic Potential
`TRAFFIC POTENTIAL: VERY HIGH / HIGH / MEDIUM / LOW / NONE`

### Top 5 Growth Opportunities
1. ...
2. ...
3. ...
4. ...
5. ...

### Traffic Priority Score
`TRAFFIC PRIORITY SCORE: X/15`
```

## Reglas

- No edites los archivos de contenido ni de código.
- No inventes datos de GSC/GA4; si no hay acceso, `NOT VERIFIED`.
- Prioriza oportunidades por impacto/efort, no por cantidad.
- Vincula cada recomendación a una métrica o hallazgo observable.
