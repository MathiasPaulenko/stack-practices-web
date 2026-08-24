# Checklist PERFECTO de cierre

Antes de pedir aprobación al usuario, el recurso debe superar TODOS estos puntos.
Si alguno falla, corregir antes de continuar.

## Frontmatter e SEO

- [ ] `title` ≤ 60 caracteres, línea única, sin bloques YAML plegados.
- [ ] `description` 80-160 caracteres, línea única, gancho claro.
- [ ] `metaDescription` 120-170 caracteres, línea única, coincide con `seo.metaDescription`.
- [ ] `seo.keywords` 3-8 términos reales, sin keyword stuffing.
- [ ] `slug` kebab-case, único dentro del tipo, sin cambiar si ya está indexado.
- [ ] `difficulty` correcto (`beginner`, `intermediate`, `advanced`).
- [ ] `topics` 1-3 valores válidos de `src/content.config.ts`.
- [ ] `tags` 3-8 etiquetas relevantes.
- [ ] `relatedResources` 2-6 slugs existentes, coherentes con el topic, mismo orden en EN y ES.
- [ ] `lastUpdated` actualizado en EN y ES con la misma fecha (`YYYY-MM-DD`).
- [ ] Primer encabezado del body (`#`) coincide con `title`.

## Estructura y calidad del body

- [ ] Jerarquía de encabezados lógica (H2 → H3), sin saltos.
- [ ] Body por encima del mínimo del tipo (`recipes` 1.300+, `patterns` 1.500+, `guides` 3.000+, `docs` 3.000+ palabras).
- [ ] Sin thin content: el cuerpo aporta valor, no solo listas genéricas, repeticiones o relleno para llegar al mínimo.
- [ ] `Overview` empieza con un problema real, no con `This guide covers...` o `X is the process of...`.
- [ ] `When to Use` con situaciones concretas y al menos un caso donde NO aplica.
- [ ] `Solution` con código/commands/configuración funcional y con lenguaje de bloque explícito.
- [ ] `Explanation` con el porqué, trade-offs y limitaciones.
- [ ] Sin secciones de relleno (`Closing Notes`, `Quick Note`, `Practical Summary`, `Executive Summary`, `Pro Tips` genéricos).
- [ ] `Best Practices` y `Common Mistakes` específicas del dominio, no genéricas.
- [ ] `FAQ` con 3-5 preguntas reales si aplica (para schema FAQPage).
- [ ] 2-3 enlaces internos contextuales con anclas descriptivas.

## Ejemplos, código y ejecución

- [ ] Código con lenguaje especificado, datos realistas y versiones reales de herramientas.
- [ ] No `example.com`, tokens sueltos, PII ni datos sensibles.
- [ ] Snippets copiables y, cuando aplica, ejecutables.
- [ ] Tablas con encabezados y filas sin celdas vacías (`|---|---|---|`).

## Humanización y detección de IA

- [ ] Sin frases patrón (`This guide covers...`, `In this article...`, `In conclusion...`).
- [ ] Sin palabras rojas de IA (*delve, harness, pivotal, seamless, tapestry, paradigm, synergy*, etc.).
- [ ] Tono humano: opiniones, trade-offs y advertencias reales donde aporta.
- [ ] Párrafos con sustancia; no repiten el título sin información nueva.
- [ ] Tokens de código y nombres de herramienta rodeados de contexto.
- [ ] `ai-detect-patterns.py` reporta 0 patrones.
- [ ] Desklib `model_ai_pct` < 40 % en EN y ES; ideal < 30 %.

## Paridad EN/ES

- [ ] Misma estructura de secciones y mismo orden.
- [ ] `title`, `description`, `metaDescription` y `seo.keywords` traducidos.
- [ ] Código y ejemplos equivalentes (solo se traducen comentarios o variables cuando es idiomático).
- [ ] `relatedResources` mismos slugs, mismo orden.
- [ ] `lastUpdated` idéntico.

## Validación técnica

- [ ] `npm run content:quality` sin errores ni warnings.
- [ ] `npm run content:links` sin recursos rotos.
- [ ] `npm run content:validate` sin errores (warnings pre-existentes ajenos al recurso son aceptables).
- [ ] `npm run check` sin errores ni warnings.
- [ ] `npm run build` exitoso (~3.242 páginas).
- [ ] `npm run sitemap` regenera `public/sitemap.xml`.

## Enlaces y ecosistema

- [ ] Todos los enlaces internos del body funcionan y usan anclas descriptivas.
- [ ] `relatedResources` cruzados con recursos del mismo topic cluster.
- [ ] Enlaces externos solo si son autorizados, necesarios y funcionan.
