# Traffic & Growth Audit — StackPractices

> Generado el 2026-08-24. Ejecución del prompt `ref/audit/08-gsc-ga4-traffic-audit.md` a nivel sitio.
> No edita archivos. Datos de GSC/GA4 son históricos (sin acceso directo); métricas reales marcadas como `NOT VERIFIED`.

---

## 1. GSC Metrics

```text
GA4 Property: G-RBE12WJ5KZ
GTM: GTM-M66C9FWN
GSC/GA4 direct access: NOT VERIFIED (no credentials conectadas)
```

| Métrica | EN | ES | Total | Notas |
|---|---|---|---|---|
| Clicks | NOT VERIFIED | NOT VERIFIED | ~5 (histórico 28d) | Datos históricos de ref/checklist-top-recursos-mejoras.md |
| Impresiones | NOT VERIFIED | NOT VERIFIED | ~3.800 (histórico 28d) | +253% vs período anterior |
| CTR | ~0.31% | NOT VERIFIED | ~0.31% | Bajó de 0.50% a 0.31% |
| Posición media | ~32.7 | NOT VERIFIED | ~32.7 | Empeoró de 27.2 a 32.7 |
| Queries principales | NOT VERIFIED | NOT VERIFIED | — | Ver sección 4 (queries estimadas por contenido) |
| Países con más clics | NOT VERIFIED | NOT VERIFIED | — | Pendiente de GSC |
| Dispositivos | NOT VERIFIED | NOT VERIFIED | — | Pendiente de GSC |

### Métricas por recurso conocidas (histórico)

| Recurso | Impresiones | Clics | CTR | Posición | Nota |
|---|---|---|---|---|---|
| `/recipes/api-documentation-openapi/` | 1.166 | 2 | 0.17% | ~55-65 (agosto) | Mayor impresión del sitio, CTR críticamente bajo |
| `/recipes/optimistic-locking/` | +265 vs anterior | 3 | NOT VERIFIED | NOT VERIFIED | Recurso con más clics del período |

---

## 2. Trend

`TREND: DECLINING (based on historical GSC indicators)`

- CTR bajó del 0.50 % al 0.31 % a pesar de un aumento del +253 % en impresiones.
- Posición media empeoró de 27.2 a 32.7.
- El tráfico es residual: GA4 reportó 41 sesiones, 68 pageviews, 13 usuarios activos en 28 días.

**Interpretación**: El sitio está generando más impresiones pero no está convirtiendo en clics. Posibles causas:
1. Thin content masivo (87.3% below target) → Google no rankea bien (posición empeoró).
2. Snippets poco atractivos (titles duplicados, meta descriptions correctas pero no optimizadas para CTR).
3. Competidores con contenido más profundo en queries clave.
4. Ningún link building ni autoridad de dominio aún.

---

## 3. CTR & Snippet Optimization

`CTR POTENTIAL: HIGH` — hay muchas impresiones desperdiciadas.

`SNIPPET APPEAL: MEDIUM` — titles y meta descriptions son descriptivos pero no siempre diferenciados.

### Mercados con CTR bajo (inferido por datos históricos)

- **Global**: 0.31% es muy bajo para un site técnico con intención informational. Benchmark típico para posiciones 25-35: 1-2%.
- **ES**: titles sin traducir (17 casos) reducen relevancia en SERPs hispanas.
- **USA / inglés técnico**: CTR probablemente bajo por competencia y posición media 32.7.

### Open Graph

- OG tags presentes en 100% de páginas muestreadas (dist audit).
- `og:title`, `og:description`, `og:url`, `og:type`, `og:locale`: completos.
- **Issue**: OG image no verificado; el site solo tiene 6 imágenes (3 SVG + 3 PNG). Falta `og:image` optimizado por tipo de contenido.

### Title links

- 28 titles duplicados (17 ES sin traducir, 6 cross-type).
- 5 titles >60 chars en muestra de 169.
- Recomendación: optimizar titles para CTR, especialmente `/recipes/api-documentation-openapi/`.

---

## 4. Top Queries (estimadas por contenido)

Como no hay acceso a GSC, se infieren queries principales desde `title`, `slug` y `seo.keywords`.

### Top 30 queries por frecuencia en keywords

| Query / Tema | Frecuencia en keywords | Tipo dominante | Intención |
|---|---|---|---|
| design pattern | 93 | patterns | Informational / Reference |
| python | 90 | recipes | How-to / Tutorial |
| guide | 77 | guides | Informational / Learning |
| java | 72 | recipes | How-to / Tutorial |
| javascript | 69 | recipes | How-to / Tutorial |
| recipe | 62 | recipes | How-to |
| template | 50 | docs | Reference / Download |
| pattern | 50 | patterns | Reference |
| devops | 47 | all | Informational |
| security | 44 | all | Informational / Compliance |
| architecture | 38 | guides/patterns | Informational / Learning |
| performance | 37 | recipes/guides | How-to / Optimization |
| testing | 33 | recipes | How-to |
| observability | 30 | recipes/guides | How-to |
| frontend | 24 | recipes/guides | How-to |
| databases | 22 | recipes/guides | How-to |
| api | 21 | recipes | How-to |
| microservices | 21 | guides | Informational / Learning |
| postgresql | 19 | recipes | How-to |
| bash | 19 | recipes | How-to |
| resilience | 18 | patterns | Reference |
| file-handling | 17 | recipes | How-to |
| authentication | 16 | recipes | How-to / Security |
| data | 16 | recipes | How-to |
| sql | 14 | recipes/guides | How-to |
| behavioral pattern | 14 | patterns | Reference |
| automation | 14 | recipes/devops | How-to |
| compliance | 12 | docs | Reference |
| kubernetes | 12 | recipes | How-to |
| streaming | 12 | recipes | How-to |

### Queries de alto potencial no bien cubiertas

| Query | Recurso existente | Problema | Oportunidad |
|---|---|---|---|
| "OpenAPI documentation" | `/recipes/api-documentation-openapi/` | CTR 0.17%, em-dash overuse | Mejorar snippet, reducir AI patterns |
| "Domain-Driven Design" | `/guides/domain-driven-design-guide/` | Thin 43.5% | Expandir a guía comprehensiva |
| "Vertical Slice Architecture" | `/guides/vertical-slice-architecture-guide/` | Thin 33.2% | Expandir con ejemplos reales |
| "SQL CTE" | `/guides/sql-cte-guide/` | Thin 35% | Recursive CTE, performance |
| "Repository Pattern" | `/patterns/repository-pattern/` | Thin 56.1%, canibaliza con recipe | Diferenciar y expandir |
| "Local LLM deployment" | `/guides/complete-guide-local-llm-deployment/` | Thin 47.9% | Trending topic, expandir |
| "GraphQL federation" | `/guides/complete-guide-graphql-federation/` | Thin 47.9% | Trending, expandir |
| "Kafka stream processing" | `/guides/...kafka.../` | Thin 42.7% | Expandir |

---

## 5. Countries & Languages

`Best CTR: NOT VERIFIED`

`Worst CTR: NOT VERIFIED`

**Inferencias**:
- El sitio es bilingüe EN/ES con 1021 recursos por idioma.
- **ES titles sin traducir** (17 casos) reducen CTR en mercados hispanohablantes.
- El dominio `.com` y contenido en inglés sugieren que USA/UK/India/Canadá son mercados primarios para EN.
- **Recomendación**: GSC debería segmentar por país e idioma para confirmar. Mientras tanto, priorizar traducción de titles ES y optimizar snippets para mercado hispano.

---

## 6. Devices

`Desktop: NOT VERIFIED`

`Mobile: NOT VERIFIED`

`Tablet: NOT VERIFIED`

**Observaciones técnicas**:
- Viewport presente en 100% de páginas muestreadas.
- Tailwind CSS v4 mobile-first.
- HTML 131 MB total → pages grandes pueden afectar LCP en mobile.
- **Recomendación**: Revisar GSC y GA4 por dispositivo. Mobile-first indexing activo por defecto.

---

## 7. GA4 Status

`GA4 STATUS: OK (technical implementation verified)`

### Verificación técnica

| Check | Estado |
|---|---|
| GA4 ID presente | ✅ `G-RBE12WJ5KZ` en BaseLayout |
| GTM ID presente | ✅ `GTM-M66C9FWN` |
| Consent Mode v2 | ✅ Default denied, cookieless pings enviados |
| gtag.js carga | ✅ Vía `public/analytics.js` |
| dataLayer inicializado | ✅ |
| Cross-origin anonymous | ✅ `crossOrigin='anonymous'` |

### Problemas potenciales

1. **Ad blockers**: El script `/analytics.js` es self-hosted, lo que reduce bloqueo por listas de ad blockers que bloquean dominios de Google. ✅ Buena práctica.
2. **Consent Mode v2 default denied**: analytics_storage='denied' por defecto. El banner de cookies debería actualizar el consentimiento. Si el banner no funciona, GA4 solo recibe pings anónimos sin client ID.
3. **Cookie banner**: `<CookieBanner />` presente en BaseLayout. Funcionalidad no verificada interactivamente.
4. **AI Assistant channel group** (GA4, Mayo 2026): No se verifica configuración de channel group. El sitio no está optimizado para AEO/GEO tracking específico.
5. **GSC + GA4 linked**: NOT VERIFIED.
6. **Custom dimensions (content type)**: No verificado en código. Recomendado añadir custom event/dimension para `contentType` (recipe/pattern/guide/doc).

### Métricas históricas

- 41 sesiones en 28 días.
- 68 pageviews.
- 13 usuarios activos.

**Interpretación**: Tráfico residual, consistente con posición media 32.7 y CTR 0.31%. Sin conversiones monetarias configuradas (no Phase 4).

---

## 8. User Flow

`USER FLOW: NEEDS IMPROVEMENT`

### Métricas de flujo

| Tipo | Avg relatedResources | Avg body links | Observación |
|---|---|---|---|
| recipes | 6.4 | 2.4 | Body links OK, but 54% de muestra <2 |
| patterns | 5.7 | 1.7 | **Body links bajos** |
| guides | 6.6 | 2.4 | OK |
| docs | 6.1 | 2.8 | Mejor body links |

### Fortalezas

- **FAQ 100%**: Todos los recursos tienen sección FAQ (GEO/AI-citation optimization).
- **relatedResources sólido**: Promedio 5.6-6.6 por recurso, dentro del límite de 6 renderizados.
- **Topic hubs**: Listing pages por tipo existen (`/recipes/`, `/patterns/`, `/guides/`, `/docs/`).
- **Búsqueda**: Pagefind indexado 174.308 palabras en 2 idiomas.

### Debilidades

- **Dead-ends**: 348 orphan resources (34%) no reciben incoming links. Usuarios y crawlers difícilmente los descubren.
- **Funnels débiles**: Listing pages reciben tráfico potencial pero los recursos individuales son THIN y no retienen.
- **Cross-type linking insuficiente**: Patterns reciben menos body links (1.7 avg). Los guides no enlazan suficientemente a recipes de implementación.
- **CTAs limitados**: No hay CTAs explícitos de "descargar template", "ver caso de uso", "ir al topic hub". Solo relatedResources dinámico y Ko-fi button.

### Recomendaciones

1. Añadir 2-3 body links por recurso, especialmente en patterns.
2. Conectar orphans a clusters del mismo topic.
3. Añadir CTA contextual al final: "Explora más recursos de [topic]" / "Ver guía relacionada".
4. Crear "topic hub" pages más ricas con introducción + listado de recursos + links internos.

---

## 9. Linkable Asset Potential

`LINKABLE ASSET POTENTIAL: MEDIUM-HIGH` (para recursos >3000 words con código + FAQ)

### Recursos con mayor potencial de backlinks (≥3000 words + código + FAQ)

| Recurso | Palabras | Tipo | Por qué es linkable |
|---|---|---|---|
| `/recipes/testing/load-testing/` | 7.472 | recipes | Guía larga con código y FAQ |
| `/recipes/performance/web-performance/` | 7.209 | recipes | Tema evergreen, alto volumen |
| `/patterns/design/chain-of-responsibility-pattern/` | 6.854 | patterns | Pattern clásico con ejemplos |
| `/patterns/design/chain-of-responsibility-middleware/` | 6.838 | patterns | Variante práctica |
| `/recipes/performance/database-indexing/` | 6.530 | recipes | Técnico, referenciable |
| `/recipes/data/batch-processing-patterns/` | 5.697 | recipes | Patrones de data |
| `/patterns/design/builder-pattern/` | 5.693 | patterns | Pattern clásico |
| `/recipes/api/api-documentation-openapi/` | 5.156 | recipes | Alto tráfico potencial, CTR bajo |
| `/patterns/design/command-pattern/` | 4.574 | patterns | Pattern clásico |
| `/docs/security/security-incident-response-template/` | 3.815 | docs | Template descargable |

### Oportunidades de linkable assets

1. **Guías comprehensivas**: DDD, Vertical Slice, Onion, LLM local — si se expanden a 3000+ words con diagramas, pueden atraer backlinks educativos.
2. **Templates/runbooks**: Los docs de seguridad/devops son descargables y citables en GitHub/Slack.
3. **Code recipes**: Recipes con múltiples lenguajes son referenciables desde Stack Overflow / GitHub.
4. **Comparativas**: Tablas comparativas (Swagger UI vs Redoc, CTE vs subqueries) son linkable.

### Qué falta para ser HIGH

- Contenido original (datos, benchmarks propios).
- Diagramas / infografías compartibles.
- Outreach activo.
- Case studies reales.

---

## 10. Backlinks

`BACKLINKS: NOT VERIFIED`

- No hay acceso a Ahrefs, Search Console links, ni otras fuentes de backlinks.
- El sitio es nuevo (dominio reciente) y tráfico residual, por lo que probablemente tiene muy pocos o ningún backlink.
- **Recomendación**: Iniciar outreach con los 20 linkable assets identificados.

---

## 11. Mobile UX & Core Web Vitals

`MOBILE UX: OK` (basado en markup estático)

`CWV: NOT VERIFIED` (sin herramientas de medición disponibles)

### Verificación estática

| Check | Resultado |
|---|---|
| Viewport | 100% presente |
| Responsive CSS | Tailwind v4 mobile-first |
| Tap targets | No verificado con render |
| Popups intrusivos | Ninguno detectado |
| Imágenes lazy loading | ✅ `loading="lazy"` en Ko-fi image |
| HTML lang | 100% |

### Core Web Vitals estimados

| Métrica | Estimación | Umbral | Notas |
|---|---|---|---|
| LCP | Probablemente >2.5s en 3G | <2.5s pass | HTML 131 MB, pages pueden pesar 40-60 KB cada una |
| INP | No medible estáticamente | <200ms pass | Astro zero JS por defecto; Pagefind carga bajo demanda |
| CLS | Bajo probablemente | <0.1 | Astro SSG, layout estable |

### Pagefind index size

- 12.2 MB de índice.
- 174.308 palabras indexadas.
- 12.7 MB de fragments.
- **Oportunidad**: Considerar split de índice por idioma o lazy loading para reducir carga inicial.

### Recomendaciones técnicas de performance

1. Medir CWV reales con PageSpeed Insights o CrUX una vez en producción.
2. Verificar si `compressHTML: true` en `astro.config.mjs` reduce suficientemente el HTML.
3. Considerar preconnect/dns-prefetch a recursos externos (ya presentes).
4. Auditoría de imágenes: solo 6 imágenes, no hay image sitemap.

---

## 12. Growth Opportunities

| # | Oportunidad | Evidencia | Impacto esperado | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| 1 | **Optimizar snippet de `/recipes/api-documentation-openapi/`** | 1166 imp, 0.17% CTR | HIGH | Low | P0 |
| 2 | **Expandir top-20 thin content** | 87.3% below target, posición empeoró 27→32 | HIGH | High | P0 |
| 3 | **Añadir body links a 348 orphans** | 34% sin incoming links, patterns 1.7 avg | MEDIUM | Medium | P1 |
| 4 | **Traducir 17 titles ES sin traducir** | Mercado hispano sub-optimizado | MEDIUM | Low | P1 |
| 5 | **Crear custom dimension `contentType` en GA4** | No se mide conversión por tipo | MEDIUM | Low | P1 |
| 6 | **Añadir OG:image por tipo de contenido** | OG tags completos pero image no verificado | LOW | Low | P2 |
| 7 | **Implementar outreach para 20 linkable assets** | Sin backlinks verificados | HIGH | High | P2 |
| 8 | **Medir CWV con PageSpeed Insights** | No hay datos de performance real | MEDIUM | Low | P2 |
| 9 | **Crear image sitemap** | 6 imágenes, ninguna en sitemap | LOW | Low | P2 |
| 10 | **Activar GSC AI Performance Report tracking** | GA4 AI Assistant channel group disponible | MEDIUM | Low | P2 |

---

## 13. Traffic Potential

`TRAFFIC POTENTIAL: HIGH` — condición a que se resuelva thin content y se mejore CTR.

### Justificación

- **Cobertura temática amplia**: 1.021 recursos en 20+ topics técnicos.
- **Bilingüe**: 100% EN+ES, mercado global.
- **SEO técnico sólido**: 3258 páginas indexables, JSON-LD, hreflang, canonical, OG.
- **Tendencias favorables**: AI/LLM, DevOps, SRE, observability son queries en crecimiento.
- **Barrera principal**: Contenido thin (87.3%) y CTR bajo (0.31%).

### Proyección conservadora

Si se resuelve thin content del top-100 + se optimizan snippets para CTR:
- CTR podría subir de 0.31% a 0.8-1.2%.
- Posición media podría mejorar de 32.7 a 20-25.
- Tráfico orgánico podría multiplicarse 3-5x en 3-6 meses.

---

## 14. Top 5 Growth Opportunities

1. **Expandir thin content del top-100 y corregir regresión de broken links**.
   - Evidencia: 1.784 archivos thin; 16 broken body links; posición empeoró.
   - Impacto: HIGH. Esfuerzo: HIGH. P0.

2. **Reescribir title y meta description de `/recipes/api-documentation-openapi/`**.
   - Evidencia: 1166 impresiones, 0.17% CTR.
   - Impacto: HIGH. Esfuerzo: LOW. P0.

3. **Añadir body links contextuales a orphans y recursos con <2 links**.
   - Evidencia: 348 orphans, patterns con 1.7 avg body links.
   - Impacto: MEDIUM. Esfuerzo: MEDIUM. P1.

4. **Traducir titles ES y diferenciar cross-type titles**.
   - Evidencia: 17 ES sin traducir, 6 colisiones guide+recipe.
   - Impacto: MEDIUM. Esfuerzo: LOW. P1.

5. **Medir y optimizar Core Web Vitals; implementar custom GA4 dimensions**.
   - Evidencia: CWV NOT VERIFIED; GA4 sin custom dimensions.
   - Impacto: MEDIUM. Esfuerzo: LOW-MEDIUM. P2.

---

## 15. Traffic Priority Score

`TRAFFIC PRIORITY SCORE: 10/15`

Breakdown:
- GSC/GA4 data availability: 0/3 (NOT VERIFIED)
- CTR optimization potential: 3/3 (0.17-0.31% is very low)
- Content depth gap: 3/3 (87.3% thin)
- Internal link architecture: 2/3 (orphans and low body links)
- Linkable asset / backlink potential: 1/2 (medium-high potential, no execution)
- Mobile/technical CWV: 1/2 (OK markup, not measured)

Total: 10/15 — HIGH potential but requires content depth and CTR work.

---

## Resumen ejecutivo

**Estado de tráfico actual**: El sitio tiene **muchas impresiones pero muy pocos clics**. CTR 0.31% y posición 32.7 indican que Google muestra el sitio pero no lo prefiere. El problema raíz es **contenido insuficiente** (87.3% thin) combinado con **arquitectura interna débil** (34% orphans, body links bajos).

**GA4 técnicamente OK** pero tráfico residual (41 sesiones/28d). Consent Mode v2 configurado correctamente.

**Mayor oportunidad inmediata**: optimizar el snippet de `/recipes/api-documentation-openapi/` (1.166 impresiones, 0.17% CTR) y expandir contenido thin del top-100.

**Para escalar tráfico**: thin content → CTR → internal links → backlinks → CWV/AEO measurement.

**Datos no inventados**: Métricas de GSC/GA4 son históricas del `ref/checklist-top-recursos-mejoras.md`. CWV no pudo medirse por falta de acceso a herramientas en el entorno local.
