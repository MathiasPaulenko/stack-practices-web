# Prompt maestro — Mejorar un recurso de `ref/top-100-checklist.md`

## Input del usuario

El usuario indicará el **número del recurso** en la checklist, por ejemplo:

- "mejora el recurso 28"
- "aplica el flujo completo al número 12 de la checklist"
- "full mejora del recurso 5"

Si el usuario da un slug o ruta, aplicar el skill `content-improvement` directamente con ese slug.

## Flujo automático

Sigue estos pasos sin preguntar salvo que falte información crítica.

### 1. Localizar el recurso en la checklist

- Leer `ref/top-100-checklist.md`.
- Buscar la línea que empiece por `N. - [ ]` o `N. - [x]` donde `N` es el número indicado.
- Extraer el slug y el tipo a partir del patrón: `**slug** (tipo)`.
- Si la línea tiene `[x]`, el recurso ya fue mejorado; preguntar si se quiere una revisión adicional.
- Anotar las métricas y el `Focus` listados debajo del recurso.
- Opcional: leer `ref/top-100-resources.md` para métricas adicionales (impresiones, clics, posición, palabras, meta).

### 2. Aplicar el skill `content-improvement` en modo `full`

- Invocar `.devin/skills/content-improvement/SKILL.md` con el `slug` y `tipo` detectados.
- Priorizar el `Focus` de la checklist (p. ej. `low CTR`, `high impressions`, `striking distance`).
- Ejecutar todas las fases:
  - Fase 0: diagnóstico.
  - Fase 1: quick wins SEO/frontmatter.
  - Fase 2: calidad + humanización + IA + thin content.
  - Fase 3: paridad EN/ES.
  - Fase 4: validación técnica.
  - Fase 5: resumen y aprobación.

### 3. Tratamiento especial por caso

- **Focus `low CTR`**: revisar `title` y `metaDescription` para mejorar CTR; asegurar
  que el `description` prometa un beneficio concreto.
- **Focus `high impressions, low CTR`**: mismo tratamiento que low CTR; también
  verificar que el `Overview` responda la intención de búsqueda rápidamente.
- **Focus `striking distance`**: reforzar contenido profundo, enlaces internos y
  `relatedResources` del mismo cluster para mejorar posición.
- **Focus `proven demand`**: mantener ejemplos actualizados y versiones reales; no perjudicar el ranking existente.
- **Status `Pending` o sin mejorar**: ejecutar flujo completo.
- **Status ya mejorado**: ejecutar revisión rápida (Fase 0 + Fase 4) salvo que el usuario pida otra cosa.

### 4. Checklist PERFECTO de cierre

Antes de pedir aprobación, verificar el archivo `reference/perfect-close-checklist.md` del skill `content-improvement`.

Si algún ítem falla, corregirlo. No pedir aprobación hasta que todo esté OK.

### 5. Resumen final, estadísticas y enlaces de revisión

Antes de pedir aprobación, mostrar un resumen estructurado.

#### 5.1 Tabla de métricas del recurso

|Métrica|Valor inicial|Valor final|Cambio|
|---|---|---|---|
|Recurso|`{tipo}/{slug}`|—|—|
|Palabras body EN|`{words inicial}`|`{words final}`|`+/- X`|
|Palabras body ES|`{words inicial}`|`{words final}`|`+/- X`|
|Caracteres body EN|`{chars inicial}`|`{chars final}`|`+/- X`|
|Caracteres body ES|`{chars inicial}`|`{chars final}`|`+/- X`|
|Desklib EN|`{model_ai_pct inicial} %`|`{model_ai_pct final} %`|`± X`|
|Desklib ES|`{model_ai_pct inicial} %`|`{model_ai_pct final} %`|`± X`|
|`title` (EN)|`{chars}`|—|—|
|`description` (EN)|`{chars}`|—|—|
|`metaDescription` (EN)|`{chars}`|—|—|
|`title` (ES)|`{chars}`|—|—|
|`description` (ES)|`{chars}`|—|—|
|`metaDescription` (ES)|`{chars}`|—|—|

Rellenar solo las filas para las que haya datos disponibles. Si no se ejecutó `ai-detect`, indicar `N/A`.

#### 5.2 Acciones ejecutadas

1. **Frontmatter**: X cambios (p. ej. `title`, `description`, `metaDescription`, `relatedResources`).
2. **SEO**: Y quick wins aplicados.
3. **Calidad**: Z secciones reescritas o añadidas (FAQ, ejemplos, debugging).
4. **Humanización/IA**: W frases reescritas; patrones corregidos; rondas completadas.
5. **Paridad EN/ES**: N ajustes realizados.
6. **Validación**: `content:quality` OK/KO, `content:links` OK/KO, `build` OK/KO.

#### 5.3 Enlaces para revisar

- **Versión en inglés (producción una vez publicado)**: `https://stackpractices.com/{tipo}/{slug}/`
- **Versión en español (producción una vez publicado)**: `https://stackpractices.com/es/{tipo}/{slug}/`
- **Archivo local EN**: `src/content/{tipo}/{slug}.md`
- **Archivo local ES**: `src/content/{tipo}/{slug}.es.md`
- **Diff para revisar**: `git diff --stat` + extractos clave.

#### 5.4 Pregunta de aprobación

Mostrar `git status` y `git diff --stat`, y preguntar de forma explícita:

> ¿Aprobás el `git commit` y `git push` de estos cambios?

**No hacer commit/push sin aprobación.**

## Reglas inquebrantables

- Si el número no existe en la checklist, informar y detenerse.
- Si falta la versión ES del recurso, parar y pedir aprobación para crearla.
- **Nunca más de 4 rondas** de detección/corrección IA.
- No inventar herramientas, versiones, normas o datos.
- No eliminar contenido técnico solo para bajar el score IA.
- No modificar componentes Astro, CI/CD, `.npmrc` o seguridad.
- No añadir backend, suscripciones, autenticación o monetización.
- No hacer commit/push sin aprobación explícita del usuario.

## Output esperado

- Archivos `src/content/{tipo}/{slug}.md` y `.es.md` mejorados.
- `npm run content:quality` sin errores.
- `npm run content:links` sin rotos.
- `npm run content:validate` sin errores críticos.
- `npm run check` sin errores ni warnings.
- `npm run build` exitoso.
- `npm run sitemap` regenerado.
- Resumen claro con pedido de aprobación.
