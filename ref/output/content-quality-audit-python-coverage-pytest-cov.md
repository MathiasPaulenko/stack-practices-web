# Auditoría de Calidad de Contenido — `python-coverage-pytest-cov`

**Auditor:** STACKPRACTICES CONTENT QUALITY AUDITOR (Prompt 18)  
**Fecha:** sesión actual  
**Fuentes revisadas:**

- `src/content/recipes/testing/python-coverage-pytest-cov.md` (inglés)
- `src/content/recipes/testing/python-coverage-pytest-cov.es.md` (español)
- `ref/output/ai-detect-python-coverage-pytest-cov.json` (desklib)
- `ref/output/ai-detect-patterns-python-coverage-pytest-cov.json`

## 1. Core Value

**Promesa:** enseñar a medir y exigir cobertura de tests en Python con `pytest-cov`, incluyendo reportes HTML, branch coverage, exclusiones e integración CI.

**Problema que resuelve:** evitar que los equipos usen cobertura como métrica falsa de calidad y mostrar cómo configurarla de forma práctica.

**Lector objetivo:** desarrolladores Python de backend y equipos que usan pytest.

**Valor añadido real:** el artículo entrega comandos listos para copiar, una sección de ejemplos separada del FAQ, notas de producción específicas, anti-patterns y variantes (diff-cover, coverage-badge).

## 2. Information Value por sección

| Sección | Valoración | Justificación |
| --- | --- | --- |
| Overview | **HIGH** | Explica qué es y qué hace en una sola frase. |
| When to Use | **HIGH** | Escenarios concretos y enlaces internos. |
| When NOT to Use | **HIGH** | Advertencias claras contra el uso indebido. |
| Solution | **HIGH** | Comandos y config listos para copiar. |
| Explanation | **HIGH** | Diferencia line vs. branch coverage, umbrales realistas. |
| Variants | **MEDIUM-HIGH** | coverage.py directo, diff-cover, coverage-badge. |
| Best Practices | **HIGH** | Consejos accionables y específicos. |
| Common Mistakes | **HIGH** | Anti-patterns reales, incluyendo artifacts de cobertura en VCS. |
| Production Notes | **HIGH** | Problemas reales: reporte vacío, pytest-xdist, diff-cover. |
| FAQ | **HIGH** | Respuestas concisas para GEO, enlazan a ejemplos. |
| Implementation Examples | **HIGH** | Código separado del FAQ, ahora con nota sobre regex. |
| Key Takeaways | **MEDIUM** | Resumen útil pero convencional. |
| Further Reading | **MEDIUM** | Enlaces oficiales e internos relevantes. |

## 3. Originalidad y Expertise

- Cubre no solo el uso básico sino también `pytest-xdist`, multiprocessing, GitHub Actions y diff-cover.
- Incluye advertencias contra el 100% de cobertura, contra excluir paths de error y contra commitear artifacts de cobertura.
- Distingue entre line coverage y branch coverage con un ejemplo claro.
- Explica que `exclude_lines` son expresiones regulares, evitando confusiones con `if __name__ == .__main__.:`.
- Indica que `parallel = true` es necesario para multiprocessing, un detalle fácil de omiter.

## 4. AI detection

- **EN:** 39.1% AI (desklib) — debajo del umbral del 40%.
- **ES:** 34.7% AI (desklib) — debajo del umbral.
- **Pattern detector:** 0 findings.

## 5. Bilingual Parity

- EN y ES comparten la misma estructura, mismos slugs de `relatedResources` y secciones equivalentes.
- Los headings principales en ES están traducidos.
- Los ejemplos de código se mantienen en ambos idiomas; se tradujeron comentarios y prose cuando fue idiomático.

## 6. Hallazgos de Prompt 18 y correcciones

### Corregidos en esta pasada

1. **Precisión técnica en `Excluding entire blocks`**: el texto anterior decía que `exclude_lines` excluía `if TYPE_CHECKING:` y "todo lo que está debajo". En realidad, `exclude_lines` es un patrón por línea; solo la línea `if TYPE_CHECKING:` se excluye, y cada línea bajo ella necesita su propia exclusión. Se reescribió el párrafo en EN y ES.
2. **Explicación de `exclude_lines` como regex**: se agregó una nota en `Exclude lines from coverage` explicando que las entradas son expresiones regulares.
3. **`parallel = true` para multiprocessing**: se agregó en la sección `Coverage for multiprocessing` y se aclaró que cada proceso escribe su propio archivo de datos.
4. **Artifact anti-pattern**: se agregó el error común de commitear `.coverage`, `htmlcov/`, `.coverage.*` y badges generados al control de versiones.
5. **Secciones genéricas de plantilla** (`Troubleshooting`, `Key Takeaways`, `Common Production Pitfalls`) reescritas con contenido específico de pytest-cov.
6. **FAQ con código en respuestas** separado en `FAQ` + `Implementation Examples`.
7. **Falta de `Explanation`** corregida.
8. **Headings en inglés en ES** traducidos.
9. **`relatedResources` insuficiente** ampliado a 6.
10. **Keywords irrelevantes** reemplazados por `branch-coverage` y `ci-cd`.
11. **Prosa con riesgo AI** humanizada; score final < 40%.

### Fortalezas identificadas

- Comandos copia-y-pega listos.
- Separación limpia entre FAQ conciso y ejemplos con código.
- Notas de producción centradas en sintomas, causas y resoluciones.
- Consejos contra gamificar la cobertura.
- Diferenciación clara entre line coverage y branch coverage.

### Áreas para mejora futura (P2/P3)

- Agregar un mini estudio de caso con un proyecto real (estructura de paquete, migración desde `coverage run` a `pytest-cov`).
- Incluir capturas de ejemplo del HTML report.
- Comentar versiones específicas de `pytest-cov` donde el comportamiento cambió.

## 7. Puntuación (Prompt 18)

| Dimensión | Puntuación |
| --- | --- |
| Core Value | 85/100 |
| Information Density | 82/100 |
| Originality | 80/100 |
| Technical Expertise | 83/100 |
| Practical Usefulness | 88/100 |
| Technical Accuracy | 85/100 |
| Examples | 85/100 |
| Depth | 80/100 |
| Engineering Judgement | 83/100 |
| Reader Value | 84/100 |
| Trustworthiness | 82/100 |
| Flow | 83/100 |
| Structure | 84/100 |
| Differentiation | 81/100 |
| **Overall Content Quality** | **84/100** |
| **Quality Level** | **LEVEL 4 — High-quality technical resource** |

## 8. Veredicto

**YES, AFTER IMPROVEMENT.** El recurso ya supera el umbral de calidad para publicación. Las correcciones de esta pasada eliminaron imprecisiones técnicas, agregaron un anti-pattern común y mejoraron la utilidad práctica. Quedan mejoras opcionales futuras (caso de estudio, capturas de HTML report), pero no son bloqueantes.

Validación técnica:

- `npm run content:quality`: 0 errores, 0 warnings
- `npm run content:links`: 0 enlaces rotos
- `npm run content:validate`: 0 errores
- `npm run check`: 0 errores
- `npm run build`: 3242 páginas
- `npm run sitemap`: 3238 URLs
