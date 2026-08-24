<!-- markdownlint-disable-file -->

# Prompt 19: First-Pass Perfect — pre-check estructural + humanización

Aplica este prompt **antes** de ejecutar Desklib en la Fase 2 del flujo `content-improvement`. El objetivo es corregir de una sola pasada los problemas estructurales y de estilo que habitualmente hacen que un recurso necesite rondas extras.

## 1. Estructura del recurso (60 segundos de revisión)

- Confirmar que ambas versiones (EN y ES) siguen la plantilla del `AGENTS.md`:
  1. `Overview` / `Visión General`
  2. `When to Use` / `Cuándo Usar`
  3. `Solution` / `Solución`
  4. `Explanation` / `Explicación`
  5. `Variants` / `Variantes`
  6. `Best Practices` / `Mejores Prácticas`
  7. `Common Mistakes` / `Errores Comunes`
  8. `FAQ` / `Preguntas Frecuentes`
- Si aparecen secciones como `What Works`, `Lo que funciona`, `Key Takeaways`, `Puntos Clave`, `Resumen`, `Conclusión` o `Final Notes`, renombrarlas o fusionarlas con `Best Practices` / `Mejores Prácticas`.
- No añadir una sección manual de "Related Resources" en el cuerpo.

## 1.5. Thin content y longitud mínima

Antes de revisar estilo o IA, medir si el recurso es thin. El body (sin frontmatter) debe superar:

| Tipo | Mínimo de palabras |
|---|---|
| `recipes` | 1.000 |
| `patterns` | 1.200 |
| `guides` | 1.500 |
| `docs` | 800 |

Si está por debajo del mínimo o es denso en listas genéricas:

- Añadir 1-2 ejemplos de código con datos/versiones reales.
- Desarrollar `Explanation` con trade-offs, limitaciones y casos de borde.
- Convertir bullets genéricos (`Define clear goals`, `Document everything`) en prosa con contexto o en tablas con análisis.
- Añadir 3-5 FAQs reales si aplica.
- Aplicar la misma expansión en ES; no resumir.

No rellenar con frases vacías solo para subir el conteo.

## 2. `relatedResources` coherentes

- Cada entrada debe apuntar a un slug **del mismo topic cluster** que el recurso (mismo `topics[0]` o al menos un `topics` en común).
- Si un `relatedResource` es de otro topic (por ejemplo `caching` en una receta de `data`), sustituirlo por un recurso relevante del mismo topic.
- Mantener el **mismo orden** en EN y ES.
- Máximo 6 recursos; mínimo 3 para recipes.
- Recurso de ayuda:
  - `python scripts/find-resources-by-topic.py <topic>` — lista slugs candidatos del mismo tema.
  - `python scripts/check-related-resources-coherence.py src/content/<tipo>/<slug>.md` — verifica que todos los `relatedResources` compartan al menos un `topic`.

## 3. Enlaces contextuales en el cuerpo

- Debe haber **2-3 enlaces internos** en el cuerpo del artículo (no solo en `relatedResources`).
- Colocarlos en `Overview`, `Best Practices`, `When to Use` o `FAQ` de forma natural.
- En ES, asegurar que los slugs son los mismos; el componente se encarga de la localización.

## 4. Pre-humanización rápida (prosa técnica natural)

Aplica las siguientes reglas a `Overview`, `Explanation`, `Best Practices`, `Common Mistakes` y `FAQ`:

### 4.1 Vocabulario a evitar (EN)

- **Verbos rojos:** delve, underscore, harness, facilitate, foster, resonate, transcend, embark, embrace, elevate, empower.
- **Adjetivos rojos:** pivotal, nuanced, multifaceted, seamless, groundbreaking, transformative, holistic.
- **Sustantivos rojos:** tapestry, beacon, testament, paradigm, synergy, mosaic, nexus.
- **Aperturas genéricas:** "In today's fast-paced world...", "In the realm of...", "Let's dive in...".
- **Cierres genéricos:** "In conclusion...", "The possibilities are endless...".
- **Contracciones evitables:** cambiar `does not`, `is not`, `it is`, `cannot`, `do not` por `doesn't`, `isn't`, `it's`, `can't`, `don't` cuando el tono lo permita.

### 4.2 Anglicismos a evitar (ES)

Reemplazar con alternativas naturales:

- `flattening` → `aplanar` / `el aplanado`
- `unflattening` → `reconstruir` / `la reconstrucción`
- `round-trip` → `ciclo de ida y vuelta` / `ida y vuelta`
- `output` → `resultado` / `salida`
- `input` → `entrada` (salvo en contexto claro de ML/sistemas)
- `handler` → `manejador` / `gestor`
- `cache` → `caché` (aceptado) o `memoria caché`
- `library` → `librería` (no "librería" en sentido de tienda)
- `package` → `paquete`
- `placeholder` → `marcador` / `valor de relleno`
- `one-liner` → `script de una línea` / `comando en una línea`
- `stream` → `flujo` (salvo API concreta como `Node.js stream`)
- `log store` → `almacén de logs`
- `match` → `coincidir` / `emparejar`

### 4.3 Tokens de código dentro de la prosa

- **Nunca terminar una oración con un token de código en backticks.** Desklib y detectores similares lo stripan y dejan la frase incompleta.
- **Mal:** `Track visited objects with a `WeakSet`.`
- **Bien:** `Track visited objects with a `WeakSet` so you can detect cycles.`
- Si un token de código es inevitablemente el sujeto, colocar el predicado después del token o añadir una cláusula final.
- Evitar cadenas de tokens sueltos: `In Python, `flatten-dict` and `pandas.json_normalize` cover most cases.` → `In Python, the flatten-dict package and pandas.json_normalize cover most cases.`

### 4.4 Tablas con celdas de código

- Si la sección `Variants` incluye celdas con `.`, `[index]`, `__`, etc., añadir una oración introductoria y una conclusión para que la tabla no sea el único bloque detectado.
- Si la tabla sigue marcando alto como IA, convertirla a subsecciones descriptivas del tipo:

```markdown
### Dot-notation
Use `.` as the separator and `[index]` for arrays (`tags[0]`). Best for MongoDB, lodash and query strings.
```

### 4.5 Estructuras de FAQ

- Variar la formulación de las preguntas. Mezclar `Can I...?`, `How do I...?`, `Why...?`, `What...?`.
- En ES, mezclar `¿Puedo...?`, `¿Cómo...?`, `¿Por qué...?`, `¿Qué...?`.
- No usar la misma estructura para todas las preguntas.

## 5. Cálculo de longitudes

- `title` ≤ 60 caracteres.
- `description` 80-160 caracteres.
- `metaDescription` 120-170 caracteres y debe coincidir con `seo.metaDescription`.
- `lastUpdated` actualizado a la fecha actual si se editó el contenido.

## 6. Paridad EN/ES

- Mismo número y orden de `relatedResources`.
- Mismas secciones, en el mismo orden.
- `title`, `description`, `metaDescription` y `seo.keywords` traducidos (no copiados del inglés).
- Ejemplos de código equivalentes; traducir comentarios y nombres de variables solo si es idiomático.

## 7. Reglas de parada del primer paso

- Si después de este pre-check Desklib sigue por encima del 40 %, priorizar:
  1. Corregir `pattern_totals`.
  2. Reescribir las 5-10 frases con mayor `ai_prob`.
  3. No forzar bajar de 40 % si eso implica perder precisión técnica o eliminar código útil.

## Output esperado

- Lista de cambios estructurales realizados.
- Lista de recursos `relatedResources` cambiados y por qué.
- Lista de frases con tokens de código que se reescribieron.
- Confirmación de paridad EN/ES.