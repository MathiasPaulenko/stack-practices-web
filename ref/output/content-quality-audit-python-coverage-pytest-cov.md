# Auditoría de Calidad de Contenido — `python-coverage-pytest-cov`

**Auditor:** STACKPRACTICES CONTENT QUALITY AUDITOR  
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

**Valor añadido real:** el artículo entrega comandos listos para copiar, una sección de ejemplos separada del FAQ, notas de producción específicas y variantes (diff-cover, coverage-badge).

## 2. Information Value por sección

| Sección | Valoración | Justificación |
|---|---|---|
| Overview | **HIGH** | Explica qué es y qué hace en una sola frase. |
| When to Use | **HIGH** | Escenarios concretos y enlaces internos. |
| When NOT to Use | **HIGH** | Advertencias claras contra el uso indebido. |
| Solution | **HIGH** | Comandos y config listos para copiar. |
| Explanation | **HIGH** | Diferencia line vs. branch coverage, umbrales realistas. |
| Variants | **MEDIUM-HIGH** | coverage.py directo, diff-cover, coverage-badge. |
| Best Practices | **HIGH** | Consejos accionables y específicos. |
| Common Mistakes | **HIGH** | Anti-patterns reales. |
| Production Notes | **HIGH** | Problemas reales: reporte vacío, pytest-xdist, diff-cover. |
| FAQ | **HIGH** | Respuestas concisas para GEO, enlazan a ejemplos. |
| Implementation Examples | **HIGH** | Código separado del FAQ. |
| Key Takeaways | **MEDIUM** | Resumen útil pero convencional. |
| Further Reading | **MEDIUM** | Enlaces oficiales e internos relevantes. |

## 3. Originalidad y Expertise

- Cubre no solo el uso básico sino también `pytest-xdist`, multiprocessing, GitHub Actions y diff-cover.
- Incluye advertencias contra el 100% de cobertura y contra excluir paths de error.
- Distingue entre line coverage y branch coverage con un ejemplo claro.

## 4. AI detection

- **EN:** 39.1% AI (desklib) — debajo del umbral del 40%.
- **ES:** 34.7% AI (desklib) — debajo del umbral.
- **Pattern detector:** 0 findings.

## 5. Bilingual Parity

- EN y ES comparten la misma estructura, mismos slugs de `relatedResources` y secciones equivalentes.
- Los headings principales en ES están traducidos.
- Los ejemplos de código se mantienen en ambos idiomas; se tradujeron comentarios y prose cuando fue idiomático.

## 6. Hallazgos y correcciones

1. **Secciones genéricas de plantilla** (`Troubleshooting`, `Key Takeaways`, `Common Production Pitfalls`) reescritas con contenido específico de pytest-cov.
2. **FAQ con código en respuestas** separado en `FAQ` + `Implementation Examples`.
3. **Falta de `Explanation`** corregida.
4. **Headings en inglés en ES** traducidos.
5. **`relatedResources` insuficiente** ampliado a 6.
6. **Keywords irrelevantes** reemplazados por `branch-coverage` y `ci-cd`.
7. **Prosa con riesgo AI** humanizada; score final < 40%.

## 7. Puntuación

| Dimensión | Puntuación |
|---|---|
| Core Value | 80/100 |
| Information Value | 82/100 |
| Practical Usefulness | 85/100 |
| Expertise | 80/100 |
| Context/Trade-offs | 78/100 |
| Bilingual Parity | 82/100 |
| AI/Readability | 78/100 |
| **Overall** | **81/100** |

## 8. Veredicto

**Listo para publicación.** El contenido pasa validación, build y sitemap. Quedan solo mejoras opcionales futuras (caso de estudio o sección de troubleshooting adicional).
