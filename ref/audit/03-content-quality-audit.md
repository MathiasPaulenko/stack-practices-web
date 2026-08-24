# 03 — StackPractices Content Quality Audit

> Audita calidad del contenido: intención de búsqueda, alineación con SERP, information gain, thin content, estructura, ejemplos, FAQ, riesgo de contenido programático/IA y page-worthiness. **No edita los archivos.**

## Input esperado

- `src/content/{tipo}/{slug}.md` (ajustar si usa `src/content/{tipo}/{topic}/{slug}.md`)
- `src/content/{tipo}/{slug}.es.md` (o `src/content/{tipo}/{topic}/{slug}.es.md`)
- `src/content/{tipo}/AGENTS.md`
- `AGENTS.md` global
- `ref/docs/roadmap.md` (si existe)

## Skills complementarias

Si están disponibles, invocar `content-improvement`, `content-quality-auditor` o `content-research-writer` para reforzar el análisis.

## 1. Identidad del recurso

Reporta:

```text
RESOURCE TYPE:
PRIMARY TOPIC:
PRIMARY SEARCH INTENT:
PRIMARY QUERY:
SECONDARY QUERIES:
TARGET AUDIENCE:
CONTENT FORMAT:
TOPICAL CLUSTER:
```

## 2. Intención de búsqueda

Clasifica:

- Informational
- Commercial investigation
- Transactional
- Navigational
- Tutorial / How-to
- Comparison
- Definition
- Checklist
- Reference
- Tool/resource
- Mixed

Evalúa:

- ¿Satisface la intención inmediatamente?
- ¿Responde la pregunta principal y las siguientes más probables?
- ¿El formato coincide con la intención?
- ¿Es demasiado amplio o demasiado estrecho?

Score: `INTENT SCORE: X/15`

## 3. Alineación con SERP

Si tienes acceso web:

- Identifica top 10 para la query principal.
- Extrae formatos, heading comunes, PAA, snippets, videos, foros.
- Compara contra StackPractices: ¿qué espera Google que vea el usuario?

Si no hay acceso: `NOT VERIFIED`.

## 4. Calidad del contenido por secciones

Para cada sección relevante (`Overview`, `When to Use`, `How it Works`, `Practical Example`, `Best Practices`, `Common Mistakes`, `FAQ`, etc.):

- Fortalezas
- Debilidades
- Secciones ausentes
- Secciones redundantes
- Secciones que deberían reescribirse

### Reglas específicas por tipo

| Tipo | Estructura mínima esperada |
|---|---|
| `recipes` | Overview, When to Use, Solution (código listo para copiar), Explanation, Variants, Best Practices, Common Mistakes, FAQ opcional |
| `patterns` | Overview, When to Use, Problem, Solution/Implementation, Code Example, Consequences/Trade-offs, Related Patterns, FAQ opcional |
| `guides` | Overview con problema real, When to Use, How it Works, Practical Example con código, Best Practices, Common Mistakes, FAQ, Related Resources |
| `docs` | Overview, Template/Structure, Instructions, Example, FAQ opcional, Related Resources |

## 5. Thin content

No juzgues solo por longitud. Evalúa:

- Utilidad por sección.
- Originalidad.
- Profundidad.
- Cobertura de la intención.
- Information gain.
- Diferenciación.
- Valor standalone.
- Duplicación interna.
- Estructura plantillada.
- Lenguaje genérico.
- Contenido repetitivo.
- Contexto ausente.

Pero también aplica las **longitudes mínimas del body (sin frontmatter)**:

| Tipo | Body mínimo (palabras, sin frontmatter) |
|---|---|
| `recipes` | >= 1000 |
| `patterns` | >= 1200 |
| `guides` | >= 1500 |
| `docs` | >= 800 |

Detecta secciones de relleno genéricas:

- `Closing Notes`
- `Quick Note`
- `Practical Summary`
- `Executive Summary`
- `Pro Tips` vacíos
- `Overview` que empieza con `This guide covers...` o `X is the process of...`
- Edge cases genéricos copiados (`Null input handling`, `Concurrent request overload`, `Invalid JSON payload`)
- Best practices vacías (`Pin dependency versions`, `Use parameterized queries`)
- Common mistakes vacías (`Ignoring connection pooling`, `Hardcoding secrets`)

Clasifica:

```text
THIN CONTENT RISK: NONE / LOW / MEDIUM / HIGH / CRITICAL
```

## 6. Information gain

Clasifica:

```text
INFORMATION GAIN: EXCEPTIONAL / HIGH / MODERATE / LOW / NONE
```

Busca:

- Ejemplos originales.
- Experiencia práctica.
- Consideraciones de producción.
- Edge cases.
- Failure modes.
- Limitaciones y trade-offs.
- Consejos reales.
- Frameworks de decisión.
- Checklists originales.
- Diagramas/código originales.
- Comparaciones.
- Conocimiento poco común pero útil.

## 7. Duplicación y canibalización

Busca en el repo:

- Títulos similares.
- H1 similares.
- Misma intención.
- Queries solapadas.
- Explicaciones duplicadas.
- Ejemplos duplicados.
- Páginas plantilladas.
- Near-duplicate.
- Múltiples páginas compitiendo por el mismo tema.

Clasifica:

```text
DUPLICATION RISK: NONE / LOW / MEDIUM / HIGH / CRITICAL
CANNIBALIZATION RISK: NONE / LOW / MEDIUM / HIGH / CRITICAL
```

Para cada competidor interno:

```text
URL:
OVERLAP:
PRIMARY INTENT:
RECOMMENDED ACTION: Keep separate / Differentiate / Merge / Redirect / Change intent
```

## 8. SEO semántico

Identifica:

- Entidad principal.
- Entidades de soporte.
- Conceptos relacionados.
- Entidades ausentes.

Evalúa terminología, relaciones semánticas, cobertura tópica y relevancia contextual. No recomiendes añadir keywords artificialmente.

## 9. Autoridad tópica

- ¿El recurso pertenece a un cluster coherente?
- ¿Hay hub/padre, hermanos e hijos?
- ¿Está enlazado desde el topic principal?
- ¿Orphan risk?
- ¿Sobresaturación del tema?

## 10. Riesgo programático / plantilla

Busca:

- Introducciones repetidas.
- Conclusiones repetidas.
- Patrones de headings idénticos.
- Palabras intercambiables.
- Frases genéricas de IA.
- Páginas que difieren solo por sustitución de keyword.

Clasifica:

```text
PROGRAMMATIC CONTENT RISK: NONE / LOW / MEDIUM / HIGH / CRITICAL
```

## 11. Riesgo de calidad IA

No intentes decidir si fue escrito por IA solo por el estilo. Evalúa riesgos:

- Escritura genérica.
- Afirmaciones sin soporte.
- Errores factuales.
- Estructura repetitiva.
- Especificidad falsa.
- Explicaciones superficiales.
- Referencias inventadas.
- Lenguaje forzado.
- Abstracción excesiva.

Clasifica:

```text
AI QUALITY RISK: LOW / MEDIUM / HIGH / CRITICAL
```

## 12. Sobre-optimización

Busca:

- Keyword stuffing.
- Anchors repetitivos.
- Exact-match excesivo.
- Headings forzados.
- Títulos repetidos.
- Enlaces internos artificiales.
- FAQ artificiales.
- Schema innecesario.
- Páginas puerta.
- Variantes mas-generadas.

Clasifica:

```text
OVER-OPTIMIZATION RISK: NONE / LOW / MEDIUM / HIGH / CRITICAL
```

## 13. Bilingual content parity

Lee ambas versiones y compara:

- Misma estructura y orden de secciones.
- Misma profundidad de contenido (no una versión mucho más corta).
- Ejemplos y código equivalentes.
- `FAQ` con el mismo número de preguntas si aplica.
- `Best Practices` / `Common Mistakes` equivalentes.
- Body length de ES no inferior al mínimo del tipo y razonablemente cercano al EN.
- No secciones enteras ausentes en ES.

Clasifica:

```text
BILINGUAL CONTENT PARITY: PASS / WARNING / FAIL
```

## 14. Page-worthiness

Responde:

```text
PAGE-WORTHINESS: YES / PROBABLY YES / UNCERTAIN / PROBABLY NO / NO
SHOULD BE INDEXED: YES / IMPROVE FIRST / NOINDEX / MERGE / DELETE
```

## Output obligatorio

```text
## Content Quality Audit

### Resource Identity
...

### Search Intent
`INTENT SCORE: X/15`

### SERP Alignment
...

### Section Quality
- Strong sections:
- Weak sections:
- Missing sections:
- Redundant sections:

### Information Gain
`INFORMATION GAIN: ...`

### Thin Content
`THIN CONTENT RISK: ...`
Justificación.

### Duplication & Cannibalization
`DUPLICATION RISK: ...`
`CANNIBALIZATION RISK: ...`

### Semantic SEO
...

### Topical Authority
...

### Programmatic / AI / Over-optimization Risk
...

### Page-worthiness
`PAGE-WORTHINESS: ...`

### Bilingual Content Parity
`BILINGUAL CONTENT PARITY: ...`

### Content Quality Score
`CONTENT QUALITY SCORE: X/25`

### Top 5 content fixes
1. ...
2. ...
3. ...
4. ...
5. ...
```

## Reglas

- No reescribas el recurso.
- No borres contenido técnico para bajar riesgo IA.
- Máxima objetividad: distingue evidencia de opinión.
