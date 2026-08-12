# Auditoría de Calidad de Contenido — `api-documentation-openapi`

**Auditor:** STACKPRACTICES CONTENT QUALITY AUDITOR  
**Fecha:** sesión actual  
**Fuentes revisadas:**

- `src/content/recipes/api/api-documentation-openapi.md` (inglés, 1.660 líneas)
- `src/content/recipes/api/api-documentation-openapi.es.md` (español, 1.725 líneas)
- URL en producción: `https://stackpractices.com/recipes/api-documentation-openapi/`

**Nota metodológica:** el auditor no evalúa SEO, no detecta autoría con IA y no reescribe el artículo. La auditoría mide valor real por sección, densidad de información, rigor técnico, utilidad práctica y paridad entre idiomas.

---

## 1. Core Value (Valor central)

**Promesa del artículo:** explicar cómo documentar una API REST con OpenAPI, Swagger UI y Redoc, con ejemplos en Python, JavaScript y Java.

**Problema que resuelve:** evitar que la documentación de API se desfase del código, y mostrar cómo generar docs interactivos, SDKs y tests de contrato desde un único spec.

**Lector objetivo:** desarrolladores principiantes o equipos pequeños que empiezan con OpenAPI.

**Valor añadido real:** el cuerpo principal (líneas 34-171 de `api-documentation-openapi.md`) cumple bien la promesa: da contexto, tres stacks de ejemplo, una explicación clara de code-first vs. design-first, recomendaciones prácticas, errores comunes y troubleshooting. Sin embargo, el artículo añade una sección FAQ enorme (líneas 172-1642) que desborda el tema inicial y trata asuntos tan distintos como Kafka, GraphQL, throttling, API gateways o legados SOAP, reduciendo la coherencia del valor central.

**Qué puede hacer el lector después:** un lector podrá decidir entre code-first y design-first, entender la diferencia entre Swagger UI y Redoc, y conocer buenas prácticas de versionado y linting. No podrá, sin embargo, copiar muchos de los snippets de la FAQ sin arreglarlos primero, porque contienen errores de sintaxis.

---

## 2. Information Value (Valor de la información por sección)

| Sección | Valoración | Justificación |
| --- | --- | --- |
| **Overview** (EN 34-38 / ES 35-39) | **HIGH VALUE** | Identifica el problema, la solución y el alcance con una sola frase contundente. |
| **When to Use / Cuándo Usar** (EN 40-46 / ES 41-50) | **HIGH VALUE** en ES, **MEDIUM VALUE** en EN | El español añade una cláusula de "cuándo NO usar" (ES 50: "Si tu API es solo tuya..."). El inglés omite esa matriz. |
| **Solution / Solución** (EN 48-98 / ES 52-102) | **MEDIUM VALUE** | Los tres snippets son útiles como teaser, pero incompletos (faltan imports, no son ejecutables tal cual). |
| **Explanation / Explicación** (EN 100-111 / ES 104-116) | **HIGH VALUE** | Buen contraste code-first vs. design-first, con ventajas y riesgos concretos. |
| **Variants / Variantes** (EN 113-121 / ES 118-126) | **MEDIUM VALUE** | Tabla útil pero podría indicar cuándo escoger cada una. |
| **What Works / Lo que funciona** (EN 123-129 / ES 128-130) | **HIGH VALUE** | Consejos accionables y específicos (`info.version`, tags, problem-detail, lint). |
| **Common Mistakes / Errores Comunes** (EN 131-137 / ES 132-134) | **HIGH VALUE** | Anti-patterns reales y bien explicados. |
| **Troubleshooting / Solución de Problemas** (EN 140-146 / ES 136-138) | **HIGH VALUE** | Síntomas, causa probable y comando de diagnóstico. |
| **Further Reading / Lectura Adicional** (EN 151-156 / ES 140-145) | **MEDIUM VALUE** | Enlaces oficiales; no incluye fechas de consulta ni versiones. |
| **Production Notes / Notas de Producción** (EN 158-163 / ES 147-149) | **HIGH VALUE** | Consejos maduros (versionado, lint, monitoreo de endpoints de docs). |
| **Key Takeaways / Puntos Clave** (EN 165-170 / ES 151-153) | **MEDIUM VALUE** | Resumen coherente, pero repite ideas ya dichas. |
| **FAQ / Preguntas Frecuentes** (EN 172-1642 / ES 155-1712) | **MEDIUM/LOW VALUE** | Cubre muchos temas con snippets, pero la profundidad es superficial y hay errores técnicos. |
| **See Also / Ver También** (EN 1643-1649 / ES 1715-1721) | **MEDIUM VALUE** | Buen enlazado interno; el español personaliza descripciones. |
| **Common Production Pitfalls / Errores Comunes en Producción** (EN 1651-1660 / ES 1723-1725) | **LOW VALUE** | Es una plantilla genérica que no es específica de OpenAPI. |

**Secciones LOW o NO VALUE a profundizar:**

- **FAQ**: la mayoría de sus entradas son respuestas de una sola viñeta con un snippet, sin explicar cuándo aplicarla ni qué puede salir mal.
- **Common Production Pitfalls**: frases como "Hard-coding values that should be configurable per environment" (EN 1655) son genéricas y aplican a cualquier receta del sitio.

---

## 3. Information Density (Densidad de información)

**Signal-to-noise ratio:** el cuerpo principal es **HIGH SIGNAL**. La FAQ baja notablemente la relación: incluye muchas respuestas tangenciales, explicaciones mínimas y, en la versión española, frases de relleno repetitivas ("En mi experiencia", "Con esto cubres la mayoría de los casos", "A mí me ha funcionado sin dramas", "No es lo más emocionante, pero...").

**Filler detectado:**

- ES línea 952: `Returns JSON by default. Yo send Accept: application/xml for XML response. En mi caso, send Accept: text/csv for CSV export.` — mezcla de inglés y español con sujeto confuso.
- ES líneas 198, 298, 813: "En mi experiencia, hay varias formas de abordarlo", "Depende del caso, pero normalmente hago lo siguiente", "En mi flujo, uso el spec para drivear tests automatizados" — introducciones vacías.

**Repetición:** el consejo de lintear en CI aparece en `What Works` (EN 129), `Troubleshooting` (EN 142), `Production Notes` (EN 162), `Key Takeaways` (EN 170) y múltiples FAQs. El riesgo de exponer entidades de base de datos se repite en `Explanation`, `Common Mistakes` y `FAQ`.

**Clasificación de densidad:** **MEDIUM SIGNAL** por el contraste entre el cuerpo conciso y la FAQ diluida.

---

## 4. Originality (Originalidad)

**¿Es diferenciable?** Parcialmente. El cuerpo inicial combina tres stacks en una sola página y da consejos de producción que sí aportan juicio de ingeniería, pero gran parte del contenido se puede encontrar en:

- La especificación oficial de OpenAPI.
- Documentación de FastAPI, SpringDoc, Redocly y Swagger UI.
- Los primeros resultados de Google sobre OpenAPI.

**Diferenciadores reales:**

- La tabla de variantes con enfoque y salida.
- La discusión de "spec rot" y monitoreo de endpoints `/docs`, `/redoc`, `/openapi.json`.
- El consejo concreto de usar DTOs para evitar filtrar modelos internos.

**Lo que no diferencia:** la FAQ es una lista de snippets estándar, sin casos de uso reales, benchmarking, arquitectura propia ni lecciones aprendidas intransferibles.

**Clasificación:** **MEDIUM**.

---

## 5. Expertise (Pericia técnica)

La sección central demuestra experiencia práctica: distingue code-first vs. design-first, advierte sobre DTOs, drift, contract tests, versionado y linting. Sin embargo, la pericia decae drásticamente en la FAQ:

- Muchos temas avanzados (Kafka, GraphQL, throttling, API gateways, legados) se tocan con un snippet y una línea de texto, sin trade-offs ni advertencias.
- No se explica, por ejemplo, que `oneOf` con `discriminator` es un dolor para muchos generadores de clientes.
- No se mencionan limitaciones reales de Swagger UI con especificaciones grandes, de Redoc con POST interactivo, ni de `openapi-generator-cli` con determinados patrones.
- No se habla de cuándo OpenAPI no es la herramienta adecuada (por ejemplo, para event-driven puro, donde AsyncAPI es mejor; el artículo solo alude a `x-asyncapi-spec`).

**Clasificación:** **MEDIUM** en el cuerpo, **LOW** en la FAQ.

---

## 6. Practical Usefulness (Utilidad práctica)

**Lo que funciona:**

- Tabla de variantes.
- Comandos concretos (`npx @redocly/cli lint`, `schemathesis run`, `openapi-generator-cli`).
- Ejemplos de `securitySchemes` con JWT, API key y OAuth2.
- Workflow de GitHub Actions para generar, lintear y publicar docs.

**Lo que no funciona:**

- Los snippets iniciales (Python, Java, JavaScript) son incompletos: faltan dependencias, configuración y pasos de instalación.
- Muchos snippets de la FAQ no son copiables porque contienen errores de YAML o de comando (ver sección 14).
- No hay "salida esperada": no se muestra qué vería el lector en Swagger UI o Redoc tras aplicar el ejemplo.
- No hay guía de instalación ni de estructura de archivos recomendada.

**Clasificación:** **MEDIUM**. Sirve como catálogo de referencia, no como tutorial paso a paso ejecutable.

---

## 7. Context (Contexto)

El artículo explica bien:

- **Qué es:** un spec YAML/JSON que describe endpoints, schemas y errores.
- **Por qué existe:** para evitar documentación obsoleta en README/Confluence/Slack.
- **Cuándo usarlo:** cuando hay varios consumidores, SDKs, validación o contract-first.
- **Cuándo NO usarlo:** solo la versión española (ES 50) lo menciona. La inglesa (EN 42-46) no incluye el contrario.
- **Qué reemplaza:** documentación manual desincronizada.
- **Dependencias:** FastAPI, swagger-ui-express, springdoc-openapi, Redocly, Spectral.
- **Alternativas:** GraphQL (mencionado en FAQ), AsyncAPI (mencionado para Kafka), Swagger 2.0 (conversión).
- **Qué puede salir mal:** spec rot, modelos internos expuestos, `$ref` rotos.

**Carencia importante:** no explica qué pasa a escala (especies grandes, rendimiento de Swagger UI, tiempos de carga de Redoc, estrategias de división de specs más allá de `$ref`).

---

## 8. Trade-offs (Compromisos)

El cuerpo principal explica bien los trade-offs de code-first vs. design-first (EN 104-106 / ES 108-110):

- Code-first: sincronía con el código, riesgo de filtrar modelos internos.
- Design-first: contrato explícito, riesgo de drift si no hay tests.

También distingue Swagger UI vs. Redoc con criterio de uso. Sin embargo, faltan trade-offs sobre:

- Coste de mantener specs en repositorios separados.
- Curva de aprendizaje de herramientas como `openapi-generator-cli`.
- Lock-in con extensiones `x-` propietarias.
- Rendimiento y carga de Redoc/Swagger UI con specs grandes.

**Clasificación:** **MEDIUM**. Bien en lo central, ausente en lo avanzado.

---

## 9. Alternatives

Menciona alternativas implícitamente:

- Swagger 2.0 (conversión a OpenAPI 3.0).
- GraphQL como enfoque alternativo.
- AsyncAPI para Kafka (vía `x-asyncapi-spec`).
- Diferentes generadores y portals (Redoc, Stoplight, Backstage).

No compara de forma justa: no se explica cuándo GraphQL es claramente superior, ni cuándo AsyncAPI debería ser el estándar principal. La FAQ introduce GraphQL como si OpenAPI y GraphQL debieran convivir siempre, sin matizar casos donde uno reemplaza al otro.

---

## 10. "When Not to Use" (Cuándo no usarlo)

Señal de madurez técnica **presente en la versión española (ES 50)** y **ausente en la inglesa**. ES 50 dice:

> "Si tu API es solo tuya y la escribes y consumes tú solo, quizá un README corto te baste."

La inglesa (EN 42-46) solo lista situaciones de uso. Esto es un problema de paridad y de contenido: ambas versiones deberían incluir la matriz de no-uso.

---

## 11. Real-World Scenarios (Escenarios reales)

El artículo toca muchos escenarios reales superficialmente:

- CI/CD (lint, generación de clientes, contract tests).
- Equipos múltiples (design-first).
- Microservicios (splitting de specs, `$ref`).
- Legados (retrofit con `akto`, `swagger-express`).
- Incidentes (monitoring de `/docs`, `/redoc`).
- Escalado (rate limiting, throttling, quotas).

El problema es que casi todos son mencionados, no desarrollados. Por ejemplo, habla de rate limiting con `x-rate-limit` y headers, pero no explica cómo implementarlo en un gateway real, ni qué estrategia elegir según escala. La sección parece más un índice de "cosas que OpenAPI puede tocar" que una guía aplicable.

---

## 12. Examples Quality (Calidad de los ejemplos)

Los ejemplos son numerosos pero de calidad desigual.

**Ejemplos buenos:**

- `securitySchemes` para JWT, API key y OAuth2 (EN 218-262 / ES 206-250).
- Esquema de Problem Details RFC 7807 (EN 506-544 / ES 511-549).
- Workflow de GitHub Actions para lint (EN 196-207 / ES 179-190).

**Ejemplos problemáticos:**

- Los tres snippets de la sección `Solution` son demasiado mínimos (faltan dependencias, imports, configuración).
- Muchos ejemplos de la FAQ no indican versión de OpenAPI a la que aplican.
- El ejemplo de SSE define el schema del `data` como `type: string` con un ejemplo JSON, pero no explica que en SSE `data` es texto plano y el parsing corre por cuenta del cliente.
- El ejemplo de HATEOAS (EN 1241-1245 / ES 1291-1295) es un fragmento YAML incompleto.

**Clasificación:** **LOW/MEDIUM**. Cantidad sí, calidad no.

---

## 13. Code Quality (Calidad del código)

**Python (EN 52-64 / ES 56-68):**

- Importa `from fastapi.openapi.docs import get_swagger_ui_html` pero nunca lo usa. Es un import muerto.
- No define `response_model`, por lo que FastAPI inferirá el schema desde el `dict` devuelto; sin embargo, un lector principiante puede no entender por qué la respuesta aparece como `additionalProperties` en Swagger UI.

**JavaScript (EN 69-78 / ES 72-82):**

- Usa CommonJS (`require`) sin advertir que también se puede usar ESM.
- Carga `openapi.yaml` pero no muestra su contenido, ni cómo estructurarlo.

**Java (EN 83-98 / ES 87-102):**

- Importa `org.springdoc.core.annotations.RouterOperation` y `RouterOperations` (para webflux/functional), pero el ejemplo usa anotaciones de Spring MVC `@RestController`, `@GetMapping`.
- No importa `io.swagger.v3.oas.annotations.Operation` ni `@ApiResponse`.
- Usa `Book` y `bookService` sin definirlos.
- El path `/swagger-ui.html` es el legado; las versiones recientes de SpringDoc usan `/swagger-ui/index.html` por defecto.

**Calificación:** **LOW**. Los snippets no son copy-pasteables y el de Java tiene imports incorrectos.

---

## 14. Technical Accuracy (Exactitud técnica)

Se encontraron errores técnicos concretos. Para cada uno se indica claim, problema, corrección y confianza.

### 14.1 Snippets YAML/JSON con `$ref` mal formado

**CLAIM:** Varios snippets usan `items: $ref:` o `schema: $ref:` en la misma línea.

**PROBLEMA:** En YAML/OpenAPI, `$ref` debe ser una clave de un objeto (`schema: { $ref: "..." }`). Escribir `items: $ref: '#/...'` hace que el valor de `items` sea la cadena `$ref: '#/...'`, lo cual es inválido y rompe tanto el parser como las herramientas.

**EVIDENCIA:**

- `api-documentation-openapi.md` líneas 335, 632, 917, 919, 1216.
- `api-documentation-openapi.es.md` líneas 330, 644, 947, 949, 1266.

Ejemplo (EN 335):

```yaml
data:
  type: array
  items: $ref: '#/components/schemas/Book'
```

**CORRECCIÓN:**

```yaml
data:
  type: array
  items:
    $ref: '#/components/schemas/Book'
```

**CONFIDENZA:** alta.

### 14.2 Java: imports incorrectos

**CLAIM:** El ejemplo Java genera automáticamente el spec con SpringDoc.

**PROBLEMA:** Importa `RouterOperation`/`RouterOperations` de springdoc, que no se usan en el snippet; falta importar `io.swagger.v3.oas.annotations.Operation` y `ApiResponse`; además, `Book` y `bookService` no están definidos.

**EVIDENCIA:** `api-documentation-openapi.md` líneas 83-98; `api-documentation-openapi.es.md` líneas 87-102.

**CORRECCIÓN:** añadir los imports correctos o eliminar los incorrectos y definir/eliminar las variables no usadas.

**CONFIDENZA:** alta.

### 14.3 `apiKey` no está deprecado para JWT

**CLAIM:** "For OpenAPI 3.1, use `type: http` with `scheme: bearer` instead of the deprecated `type: apiKey` for JWT tokens." (EN 263 / ES 252).

**PROBLEMA:** `type: apiKey` **no está deprecado** en OpenAPI 3.1. Es correcto recomendar `http` + `bearer` para JWT, pero afirmar que `apiKey` está deprecado es técnicamente falso.

**CORRECCIÓN:** "Para JWT se prefiere `type: http` con `scheme: bearer`; `apiKey` sigue siendo válido para claves personalizadas en header o query."

**CONFIDENZA:** alta.

### 14.4 `openapi-generator-cli --library httpx` es inválido para Python

**CLAIM:** "For Python with httpx: `openapi-generator-cli generate -i openapi.yaml -g python -o ./client --library httpx`" (EN 304 / ES 298).

**PROBLEMA:** El generador `python` de OpenAPI Generator no soporta `--library httpx`. Las opciones típicas son `urllib3`, `asyncio` o `tornado`.

**CORRECCIÓN:** eliminar la opción `--library httpx` o usar `python-nextgen`/`python-pydantic-v1` si se busca compatibilidad moderna.

**CONFIDENZA:** media-alta.

### 14.5 Python: import sin uso

**CLAIM:** El snippet Python necesita importar `get_swagger_ui_html`.

**PROBLEMA:** Se importa pero no se usa. FastAPI expone `/docs` por defecto sin ese import.

**EVIDENCIA:** `api-documentation-openapi.md` líneas 53-54 / ES 57-58.

**CORRECCIÓN:** eliminar el import o mostrar su uso para servir docs personalizados.

**CONFIDENZA:** alta.

### 14.6 Español: errores de traducción y spanglish

**PROBLEMA:** La versión española contiene sujeto confuso, anglicismos no integrados y errores gramaticales que afectan la confianza.

**EVIDENCIA:**

- ES 178: "Yo suelo generar el spec... **publícalo** en un registry" → debería ser "lo publico".
- ES 199: "**Yo transforma** `definitions` en `components/schemas`" → "yo transformo".
- ES 503: "**checkea** `operationId` faltante" → "verifica" o "comprueba".
- ES 813: "**drivear** tests automatizados" y "**genera y envía** requests" → spanglish.
- ES 952: "Yo **send** Accept" → "se envía".
- ES 591: "**Yo retorna** 429" → "retorno" o "se retorna".

**CORRECCIÓN:** revisar la traducción y eliminar anglicismos no normalizados.

**CONFIDENZA:** alta.

---

## 15. Depth (Profundidad)

**Niveles alcanzados:**

- Nivel 1 (Definición): presente.
- Nivel 2 (Explicación): presente en el cuerpo principal.
- Nivel 3 (Uso práctico): parcial; los ejemplos iniciales son mínimos, la FAQ aporta snippets pero sin contexto de uso.
- Nivel 4 (Consideraciones de ingeniería): parcial en `Explanation`, `What Works`, `Common Mistakes` y `Production Notes`; muy pobre en la FAQ.
- Nivel 5 (Comprensión experta): ausente. No se discuten casos límite difíciles como generación de clientes con `oneOf`, manejo de `allOf` en generadores, rendimiento de Swagger UI con specs gigantes, estrategias de migración de 3.0 a 3.1 en producción, etc.

**Clasificación global:** **Nivel 3** (con toques de Nivel 4 en el cuerpo central).

---

## 16. Progression (Progresión)

El cuerpo principal fluye de forma lógica:

`Contexto (Overview) → Cuándo usar → Solución → Explicación → Variantes → Buenas prácticas → Errores → Troubleshooting → Producción → Conclusiones.`

El salto brusco ocurre al pasar de `Key Takeaways` a una **FAQ enciclopédica** sin orden claro: va de autenticación a paginación, archivos, webhooks, CI, GraphQL, rate limiting, polimorfismo, SSE, mocks, deprecación, extensiones, testing, referencias circulares, observabilidad, negociación de contenido, caché, gateways, operaciones largas, seguridad, splitting, métricas, idempotencia, HATEOAS, validación, envelopes, diferencias 3.0/3.1, portales, legados, throttling, gestión de API keys y Kafka.

No hay transición ni agrupación temática. La FAQ se lee como un volcado de preguntas para SEO/GEO.

---

## 17. Structure (Estructura)

La estructura cumple el patrón requerido por el proyecto (`Overview → When to Use → Solution → Explanation → Variants → Best Practices → Common Mistakes → FAQ`), pero la **FAQ desbalancea el artículo**. El 90% de las líneas son FAQ. Sería más útil:

- Agrupar la FAQ en subsecciones temáticas (Autenticación, Versionado, Validación, Generación, Avanzado).
- Mover temas como Kafka, GraphQL, throttling, legados SOAP y API gateways a recetas separadas, con una nota de "Ver También".
- La sección final `Common Production Pitfalls` es genérica y debería adaptarse a OpenAPI ("Dejar que el spec se desfase", "Exponer schemas internos", "No versionar el spec con el API").

---

## 18. Repetition (Repetición)

**Conceptos repetidos:**

- Lint del spec en CI: EN 129, 142, 162, 170; ES 130, 138, 149, 153; FAQ.
- DTOs vs. entidades: EN 104, 133, 190; ES 108, 134, 173.
- Contract tests / spec drift: EN 106, 144, 208; ES 110, 138, 192.
- Swagger UI vs. Redoc: EN 109-111, 168; ES 114-116, 153.

**Recomendación:** mergear en un solo lugar y referenciar, no repetir.

---

## 19. Generic Content (Contenido genérico)

Además de frases genéricas, hay **ideas genéricas**:

- "API docs die in READMEs, Confluence pages and Slack threads" es buena; sin embargo, no se ilustra con un caso concreto.
- "Validate the spec in CI" es correcto pero repetido sin contexto de setup real.
- "Common Production Pitfalls" (EN 1651-1660) es una plantilla compartida por muchas recetas; no aporta nada específico de OpenAPI.

---

## 20. AI-Like Formulaic Content (Contenido formulaico)

La versión española presenta patrones formulaicos fuertes:

- Introducciones repetitivas antes de cada respuesta de FAQ: "En mi experiencia, hay varias formas de abordarlo", "Depende del caso, pero normalmente hago lo siguiente", "No hay una única forma, pero te cuento la mía", "He probado varias aproximaciones; esta es la que me funciona".
- Cierres genéricos: "Con esto cubres la mayoría de los casos", "Con eso basta para empezar", "A mí me ha funcionado sin dramas", "Una vez que lo automatizas, no vuelves atrás", "Es cuestión de constancia, pero una vez automatizado se mantiene solo", "No es lo más emocionante, pero hace la documentación mucho más usable".

Estas frases crean una sensación de simetría artificial y falta de opinión real. Hacen que la versión española sea menos densa y más predecible que la inglesa.

---

## 21. Opinion and Judgement (Opinión y juicio)

El cuerpo principal sí emite juicios sustentados:

- "Code-first works well when a single team builds and consumes the API" (con upside/downside).
- "Design-first works better when frontend, backend and mobile teams agree on a contract".
- "Swagger UI is best when developers need to call endpoints from the browser; Redoc is better for a clean, documentation-first reading experience".

En la FAQ, muchas recomendaciones se presentan como verdades absolutas sin matiz:

- "For Python with httpx" (sin justificar por qué ese generador).
- "Use `x-rate-limit`..." (sin advertir que son extensiones propietarias).
- "Document OWASP compliance: `x-owasp-compliance: [API1-BOLA, API2-BA, API3-EDP]`" (parece inventado, no es un estándar conocido).

**Recomendación:** separar hecho de opinión, y añadir "when to use / when not to use" en cada recomendación.

---

## 22. Edge Cases (Casos límite)

Se mencionan casos límite relevantes pero sin profundidad:

- Especificaciones grandes (se sugiere `$ref` + bundle, pero no se explica cómo medir tamaño ni rendimiento).
- Referencias circulares (se describe pero no se advierte del soporte irregular en generadores).
- Campos nulos (OpenAPI 3.0 vs. 3.1; se explica bien).
- Polimorfismo (se muestra `oneOf`/`discriminator` pero no los problemas de generación).
- Eventos asíncronos / Kafka (se mezcla OpenAPI con AsyncAPI).
- APIs legacy / SOAP (se mencionan herramientas de conversión pero sin advertir de limitaciones).

No se cubren: concurrencia, redes inestables, fallos parciales ni migraciones a gran escala.

---

## 23. Anti-Patterns (Anti-patrones)

La sección `Common Mistakes / Errores Comunes` es sólida:

- Dejar que el spec se desfase.
- Olvidar `security` y `securitySchemes`.
- Exponer modelos internos.
- Ignorar campos nulos.
- Hardcodear URLs de servidor.

La FAQ repite algunos anti-patrones sin añadir nuevos. Faltaría:

- Usar `x-` extensions de forma excesiva y perder compatibilidad.
- Depender de `example` en lugar de `examples` para casos de error.
- Mezclar OpenAPI 3.0 y 3.1 en el mismo proyecto sin una estrategia.

---

## 24. Troubleshooting (Resolución de problemas)

La sección de troubleshooting del cuerpo principal (EN 140-146 / ES 136-138) sigue bien el patrón síntoma-causa-comando. Ejemplo:

> "Redoc or Swagger UI shows a blank page: usually a malformed spec. Run `npx @redocly/cli lint openapi.json`..."

La FAQ añade diagnósticos puntuales (clientes generados no compilan, specs que no coinciden con el comportamiento desplegado), pero no siempre incluye prevención. La sección final `Common Production Pitfalls` es demasiado genérica como troubleshooting.

---

## 25. Decision-Making Value (Valor para la toma de decisiones)

La decisión más importante (code-first vs. design-first) está bien cubierta. La tabla de variantes ayuda a elegir herramienta por lenguaje y enfoque. Sin embargo, faltan:

- Criterios para decidir entre Swagger UI y Redoc (solo una oración).
- Cuándo merece la pena invertir en `openapi-generator-cli` vs. escribir clientes a mano.
- Cuándo usar OpenAPI 3.1 frente a 3.0.
- Cuándo una extensión `x-` justifica el riesgo de lock-in.

La FAQ lista muchas opciones pero no ayuda a priorizar.

---

## 26. Trustworthiness (Confiabilidad)

**Fortalezas:**

- Enlaces a documentación oficial (OpenAPI spec, Redocly, FastAPI, SpringDoc).
- Fechas de publicación/actualización en el frontmatter (`lastUpdated: 2026-08-11`).
- Autor identificado.

**Debilidades:**

- Errores técnicos en snippets que minan la confianza (sección 14).
- Algunas afirmaciones no respaldadas: `apiKey` deprecado, `--library httpx`, OWASP `x-owasp-compliance`.
- La versión española tiene errores gramaticales y spanglish que hacen parecer menos revisada.
- No se indican versiones de las herramientas, ni se aclara en qué versiones de OpenAPI aplica cada snippet.

---

## 27. Freshness (Actualidad)

El artículo está fechado en 2026 y las fechas de los ejemplos (`2025-12-31` en sunset, `2025-01-15` en changelog) son futuristas. El contenido puede quedar obsoleto rápido porque:

- SpringDoc ha cambiado sus paths por defecto.
- `openapi-generator-cli` cambia librerías soportadas.
- Redocly CLI evoluciona (`@redocly/cli` es ahora el paquete recomendado frente a `redocly`).
- OpenAPI 3.1 aún no está soportado uniformemente por toda la cadena de herramientas.

**Recomendación:** añadir notas de versión a los snippets y un párrafo de "Known compatibility as of...".

---

## 28. Audience Fit (Adecuación a la audiencia)

**Dificultad declarada:** `beginner`.

**Realidad:** el cuerpo principal es adecuado para principiantes, pero la FAQ salta a temas avanzados (polimorfismo, SSE, Kafka, GraphQL, API gateways, splitting) sin rampa de aprendizaje. El lector principiante se sentirá abrumado; el lector avanzado encontrará las respuestas demasiado superficiales.

**Clasificación:** el artículo intenta ser todo para todos y acaba siendo **demasiado amplio y a la vez poco profundo**.

---

## 29. Scope (Alcance)

El alcance es **demasiado amplio** para el título. El artículo se propone explicar OpenAPI, Swagger UI y Redoc, pero la FAQ incluye:

- GraphQL (EN 547-549).
- Kafka / event streaming (EN 1601-1641).
- Throttling y quota management (EN 1472-1535).
- API gateways (AWS, Kong, NGINX, Apigee) (EN 980-990.
- Legacy APIs / SOAP / WSDL (EN 1468-1470).
- Content negotiation, caching, observabilidad, HATEOAS, SSE, idempotencia.

Muchos de esos temas merecen recetas propias. La acumulación dificulta el mantenimiento, aumenta la probabilidad de errores y reduce el valor por sección.

**Recomendación:** dividir la FAQ en artículos especializados y mantener solo las preguntas centrales a OpenAPI/Swagger/Redoc.

---

## 30. Content Relationships (Relaciones de contenido)

**Pilar del conocimiento:** sí, `api-documentation-openapi` es contenido pilar para el tema API.

**Enlaces entrantes/salientes:**

- Frontmatter `relatedResources` apunta a recetas relacionadas (`rest-api-design`, `api-versioning`, `handle-errors`, `handle-cors`, `input-validation`, `idempotent-api-endpoints`).
- `See Also / Ver También` enlaza a `api-versioning`, `call-rest-api`, `graphql-api`, `handle-cors`, `handle-errors`.

**Nota de paridad EN/ES:**

- El frontmatter es paridad completa en ambos idiomas.
- El cuerpo principal es paridad semántica completa.
- La versión española añade matiz de "cuándo NO usar" (ES 50) que la inglesa debería incluir.
- La versión española introduce voz en primera persona y relleno formulaico que la inglesa no tiene, lo que cambia el tono y la densidad.
- Ambas comparten los mismos errores técnicos (snippets `$ref`, Java, `apiKey`, `--library httpx`).

---

## 31. Bookmark Test (¿Lo guardaría el lector?)

Un ingeniero senior probablemente **guardaría la página como referencia rápida** por el cuerpo principal y la tabla de variantes, pero no confiaría plenamente en ella sin revisar primero los snippets de la FAQ. Un principiante se perdería y podría abandonar.

**Veredicto:** B) posiblemente lo comparta con un junior para la introducción, D) tal vez lo referencie más tarde, pero no lo usaría directamente durante el trabajo sin corregir los ejemplos.

---

## 32. "Would I Send This?" (¿Lo enviaría a un colega?)

- **A un junior:** quizás el cuerpo principal, con advertencia de que no copie la FAQ ciegamente.
- **A un colega:** los dos primeros tercios, pero no la FAQ completa.
- **A otro equipo:** no, hasta que se corrijan los errores técnicos y se limite el alcance.

La presencia de errores sintácticos en snippets reduce la credibilidad para compartirlo sin comentario previo.

---

## 33. Competitive Value (Valor competitivo)

**¿Qué hace mejor este artículo?**

- Reúne tres stacks en una sola página.
- Da consejos de producción (monitoreo de endpoints, versionado, lint).
- Incluye una extensa FAQ para posicionamiento en buscadores/IA.

**¿Qué hace peor?**

- La documentación oficial de OpenAPI, Redocly y FastAPI es más precisa y está mejor mantenida.
- Recursos como Learn OpenAPI o Stoplight docs tienen ejemplos ejecutables y verificados.
- La FAQ de este artículo es menos confiable que la documentación de cada herramienta individual.

**¿Por qué elegir StackPractices?** Porque centraliza la decisión code-first vs. design-first y los trade-offs de producción; ese es su nicho. Pero solo si se corrige la calidad técnica.

---

## 34. Keep / Improve / Remove / Relocate (Qué conservar, mejorar, eliminar o mover)

| Sección | Decisión | Razón |
| --- | --- | --- |
| **Overview, When to Use, Explanation, What Works, Common Mistakes, Troubleshooting, Production Notes, Key Takeaways** | **KEEP** | Son el valor central del artículo. |
| **Solution (Python/JS/Java)** | **IMPROVE** | Añadir imports correctos, dependencias y un ejemplo funcional mínimo. |
| **Variants table** | **KEEP** | Útil, podría ampliarse con "cuándo elegir". |
| **Further Reading** | **IMPROVE** | Añadir versiones o fechas de validez. |
| **FAQ — autenticación, versionado, paginación, CI, errores, SDKs** | **IMPROVE** | Corregir snippets y reducir relleno. |
| **FAQ — GraphQL, Kafka, throttling, legados, API gateways, SSE, HATEOAS** | **RELOCATE/REMOVE** | Son temas propios; deberían ser artículos independientes. |
| **Common Production Pitfalls** | **REMOVE/REWRITE** | Es una plantilla genérica; adaptarla a OpenAPI o quitarla. |

---

## 35. Content Score (Puntuación)

| Criterio | Puntuación | Máximo |
| --- | --- | --- |
| Core Value | 7 | 10 |
| Information Density | 5 | 10 |
| Originality | 4 | 10 |
| Technical Expertise | 5 | 10 |
| Practical Usefulness | 5 | 10 |
| Technical Accuracy | 4 | 10 |
| Examples | 4 | 10 |
| Depth | 5 | 10 |
| Engineering Judgement | 6 | 10 |
| Reader Value | 5 | 10 |
| Trustworthiness | 5 | 10 |
| Flow | 4 | 10 |
| Structure | 5 | 10 |
| Differentiation | 4 | 10 |
| **Overall Content Quality** | **68** | **100** |

---

## 36. Quality Level (Nivel de calidad)

**Clasificación:** **LEVEL 3 — Good practical resource** (buen recurso práctico, pero con defectos técnicos importantes).

El artículo no llega a Level 4 por tres razones principales:

1. Errores técnicos en snippets que impiden copiar y pegar.
2. Alcance desbordado que reduce profundidad.
3. Inconsistencias y relleno en la versión española.

Tampoco es Level 2 porque el cuerpo principal sí contiene valor real, juicio de ingeniería y recomendaciones aplicables.

---

## 37. Biggest Problems (10 problemas principales)

### P0 — Críticos

#### 1. Snippets YAML con `$ref` en línea inválidos

- **Evidencia:** EN 335, 632, 917, 919, 1216; ES 330, 644, 947, 949, 1266.
- **Impacto:** los lectores copian specs que no parsean, generan incidentes y desconfían del contenido.
- **Acción:** reescribir todos como objetos anidados (`$ref` en su propia línea).
- **Prioridad:** P0.

#### 2. Ejemplo Java con imports incorrectos

- **Evidencia:** EN 83-98 / ES 87-102.
- **Impacto:** el snippet no compila y confunde a desarrolladores Java/Spring.
- **Acción:** corregir imports o eliminar los incorrectos; definir o quitar `Book`/`bookService`.
- **Prioridad:** P0.

### P1 — Alto impacto

#### 3. Afirmación incorrecta: `apiKey` deprecado para JWT

- **Evidencia:** EN 263 / ES 252.
- **Impacto:** falso técnico; puede llevar a decisiones de seguridad erróneas.
- **Acción:** cambiar a "se prefiere `http`+`bearer` para JWT".
- **Prioridad:** P1.

#### 4. Comando inválido: `openapi-generator-cli --library httpx`

- **Evidencia:** EN 304 / ES 298.
- **Impacto:** comando que fallará al ejecutarse.
- **Acción:** eliminar o sustituir por opción soportada.
- **Prioridad:** P1.

#### 5. Versión española: errores de traducción y spanglish

- **Evidencia:** ES 178, 199, 503, 591, 813, 952.
- **Impacto:** reduce credibilidad y legibilidad.
- **Acción:** revisión lingüística profesional.
- **Prioridad:** P1.

#### 6. Falta de "When Not to Use" en inglés

- **Evidencia:** EN 40-46 vs. ES 41-50.
- **Impacto:** paridad incompleta; la versión inglesa pierde matura técnica.
- **Acción:** añadir el párrafo equivalente.
- **Prioridad:** P1.

#### 7. Alcance de la FAQ desproporcionado

- **Evidencia:** ~1.470 líneas de FAQ incluyendo Kafka, GraphQL, gateways, legados.
- **Impacto:** confunde al lector, dificulta el mantenimiento y propicia errores.
- **Acción:** dividir en artículos específicos; quedarse con 6-10 FAQs centrales.
- **Prioridad:** P1.

### P2 — Impacto medio

#### 8. Repetición de consejos

- **Evidencia:** lint en CI, DTOs, contract tests repetidos en múltiples secciones.
- **Impacto:** densidad baja y lectura tediosa.
- **Acción:** consolidar y referenciar.
- **Prioridad:** P2.

#### 9. Snippets sin salida esperada ni pasos de instalación

- **Evidencia:** sección `Solution` y muchas FAQs.
- **Impacto:** el lector no puede validar que está haciendo lo correcto.
- **Acción:** añadir "qué verás" o capturas de texto del spec resultante.
- **Prioridad:** P2.

#### 10. `Common Production Pitfalls` es genérica

- **Evidencia:** EN 1651-1660 / ES 1723-1725.
- **Impacto:** no aporta valor específico a OpenAPI.
- **Acción:** adaptar a OpenAPI o eliminar.
- **Prioridad:** P2.

---

## 38. Biggest Strengths (10 fortalezas principales)

1. **Cuerpo principal conciso y útil** (EN 34-171 / ES 35-153): introduce el problema, la solución y las alternativas de forma clara.
2. **Explicación de code-first vs. design-first** (EN 102-106 / ES 106-110): buen análisis de trade-offs, adecuado para principiantes.
3. **Tabla de variantes** (EN 113-121 / ES 118-126): comparación rápida de herramientas y enfoques.
4. **Sección `What Works / Lo que funciona`** (EN 123-129 / ES 128-130): consejos accionables de verdad.
5. **`Common Mistakes / Errores Comunes`** (EN 131-137 / ES 132-134): anti-patterns reales y bien explicados.
6. **`Troubleshooting / Solución de Problemas`** (EN 140-146 / ES 136-138): conecta síntoma, causa y comando.
7. **`Production Notes / Notas de Producción`** (EN 158-163 / ES 147-149): va más allá del "hello world" con monitoreo y CI.
8. **Enlaces a documentación oficial** en `Further Reading / Lectura Adicional`.
9. **Cobertura amplia** que puede convertirse en varios artículos derivados de valor.
10. **Bilingüismo completo** en estructura y frontmatter, lo cual es un activo para StackPractices.

---

## 39. Content Improvement Roadmap (Hoja de ruta de mejora)

### P0 — Debe corregirse antes de publicar/actualizar

1. Corregir todos los snippets YAML con `$ref` en línea (EN 335, 632, 917, 919, 1216; ES 330, 644, 947, 949, 1266).
2. Corregir el ejemplo Java: imports correctos y variables definidas (EN 83-98 / ES 87-102).

### P1 — Acciones de alto impacto

1. Corregir la afirmación sobre `apiKey` deprecado (EN 263 / ES 252).
2. Eliminar/sustituir el comando `--library httpx` (EN 304 / ES 298).
3. Revisión lingüística completa de la versión española (líneas 178, 199, 503, 591, 813, 952 y otras similares).
4. Añadir el matiz "When not to use" a la versión inglesa (ES 50).
5. Dividir la FAQ: mover Kafka, GraphQL, throttling, API gateways, legados SOAP, SSE y HATEOAS a recetas independientes; dejar solo 6-10 FAQs centrales.
6. Eliminar el import muerto de `get_swagger_ui_html` en el ejemplo Python o mostrar su uso.

### P2 — Acciones de impacto medio

1. Consolidar la repetición de lint/CI/DTOs/contract tests.
2. Añadir "salida esperada" o estructura de archivos a los ejemplos.
3. Sustituir `Common Production Pitfalls` por una lista específica de OpenAPI.
4. Añadir notas de versión a herramientas y a OpenAPI 3.0/3.1.

### P3 — Opcional

1. Añadir un mini-proyecto reproducible (repo o pasos exactos) para el stack FastAPI + Redocly.
2. Incluir una decisión gráfica (decision tree) de code-first vs. design-first.

---

## 40. Final Verdict (Veredicto final)

**Veredicto:** **YES, AFTER IMPROVEMENT** — Sí, después de mejoras.

El artículo merece conservarse porque el cuerpo principal aporta valor real: contexto, trade-offs, buenas prácticas, errores comunes y notas de producción. Sin embargo, **no se puede recomendar en su estado actual sin advertencia** debido a los errores técnicos en snippets, el alcance desbordado de la FAQ y los problemas de calidad en la traducción al español.

**El cambio único que más mejoraría el artículo:**

> **Corregir la validez técnica de todos los ejemplos (especialmente los `$ref` mal formados en YAML y los imports incorrectos de Java) y reducir la FAQ a las preguntas realmente centrales de OpenAPI/Swagger/Redoc, moviendo los temas tangenciales a recetas propias.**

Un lector que copie un snippet debe poder confiar en que funciona. Mientras eso no ocurra, el artículo pierde la mayor parte de su valor práctico, independientemente de cuán completo parezca.

---

**Fin del informe.**
