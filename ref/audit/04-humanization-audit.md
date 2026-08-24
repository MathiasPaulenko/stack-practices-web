# 04 — StackPractices Humanization / AI Pattern Audit

> Audita el tono, los patrones IA y la humanización del recurso. **No edita los archivos.**

## Input esperado

- `src/content/{tipo}/{slug}.md`
- `src/content/{tipo}/{slug}.es.md`
- `.devin/skills/content-improvement/reference/ai-detection-tools.md`
- `.devin/skills/content-improvement/reference/prompt-ai-detect-analysis.md`

## Skills complementarias

Si están disponibles, invocar `humanize-writing`, `humanizer` o `humanise-text` para reforzar el análisis.

## Qué buscar

### 1. Aperturas genéricas

- `This guide covers...`
- `X is the process of...`
- `In this article, we will explore...`
- `In today's fast-paced world...`
- `In the realm of...`
- `Let's dive in...`

### 2. Frases de transición rígidas

- `It is important to note that...`
- `Furthermore`, `Moreover`, `In addition`, `Therefore` en exceso.
- Cierres genéricos: `In conclusion...`, `The possibilities are endless...`.

### 3. Listas genéricas

- `Pin dependency versions`
- `Use parameterized queries`
- `Handle errors explicitly`
- `Ignoring connection pooling`
- `Hardcoding secrets`

Marcar como genéricas si no están adaptadas al dominio.

### 4. Palabras y frases rojas de IA

**Verbos:**

- delve, underscore, harness, facilitate, foster, resonate, transcend, embark, embrace, elevate, empower

**Adjetivos:**

- pivotal, nuanced, multifaceted, seamless, groundbreaking, transformative, holistic

**Sustantivos:**

- tapestry, beacon, testament, paradigm, synergy, mosaic, nexus

**Aperturas/cierres:**

- `In today's fast-paced world...`
- `In the realm of...`
- `Let's dive in...`
- `In conclusion...`

### 5. Tono impersonal

- ¿Demasiado impersonal?
- ¿Falta primera persona, advertencias reales, trade-offs, opiniones?
- ¿Párrafos que repiten el título sin información nueva?

### 6. Tokens de código y celdas de tabla

Busca frases que terminan con un token o nombre de herramienta suelto. Ejemplos:

- `Use Docker.` → debería ser `Use Docker 24.0 with a multi-stage build to keep the final image under 50 MB.`
- `Run k6.` → `Run k6 v0.52 with the http_get threshold to fail fast on p95 latency.`

### 7. Descripciones y meta descripciones

- ¿Suenan a definición de diccionario?
- ¿Incluyen beneficio o resultado concreto?

### 8. Ejecución de detector IA

**Esta auditoría debe intentar ejecutar un detector IA.** No es opcional salvo que la herramienta no exista en el entorno.

#### Herramienta preferida: `scripts/ai-detect-content.py` y `scripts/ai-detect-patterns.py`

Ejecutar en EN y ES:

```bash
python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --model desklib
python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.md

python scripts/ai-detect-content.py src/content/{tipo}/{slug}.es.md --model desklib
python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.es.md
```

Si el archivo real está anidado en una subcarpeta de tema, usa la ruta completa (p. ej. `src/content/{tipo}/{topic}/{slug}.md`).

#### Salida esperada

- `ref/output/ai-detect-{slug}.json`
- `ref/output/ai-detect-patterns-{slug}.json`

#### Referencias

- `.devin/skills/content-improvement/reference/ai-detection-tools.md`
- `.devin/skills/content-improvement/reference/prompt-ai-detect-analysis.md`

#### Alternativas si los scripts fallan

- Revisar dependencias del entorno (`ai_detect`, modelos Hugging Face).
- Si ninguna herramienta funciona, aplicar detección manual siguiendo `.devin/skills/content-improvement/reference/prompt-ai-detect-analysis.md` y reportar `NOT VERIFIED` para la métrica numérica.

#### Métricas a reportar

| Métrica | Significado |
|---|---|
| `model_ai_pct` | Probabilidad estimada de contenido con patrón IA. |
| `sentences` | Oraciones etiquetadas `AI` / `HUMAN`. |
| `pattern_totals` | Resumen de patrones detectados. |
| `text_metrics` | Estadísticas de longitud de oraciones. |

#### Criterios de riesgo

- `model_ai_pct` < 30 % y `pattern_totals` vacío o leve: `AI PATTERN RISK: LOW`.
- `model_ai_pct` 30-40 %: `AI PATTERN RISK: MEDIUM`, revisar frases marcadas.
- `model_ai_pct` > 40 %: `AI PATTERN RISK: HIGH`, reportar frases a reescribir.
- Si no se puede ejecutar el detector: `AI PATTERN RISK` se basa en detección manual y se indica `NOT VERIFIED` para `model_ai_pct`.

### 9. Paridad EN/ES en humanización

- Mismo tono y estilo en ambas versiones.
- Equivalente número de palabras rojas/genéricas en EN y ES.
- La versión ES no suena más robótica o literal que la EN.
- Anécdotas, advertencias y trade-offs presentes en ambas si aplica.
- Tokens de código y nombres de herramienta bien integrados en ambos idiomas.
- Si se usan detección IA, puntuaciones similares o explicadas por diferencias legítimas del idioma.

### 10. Check específico por sección

- `Overview`: ¿empieza con problema real?
- `When to Use`: ¿tiene 4-6 situaciones concretas y al menos una donde NO aplica?
- `Best Practices`: ¿específicas del dominio?
- `Common Mistakes`: ¿errores reales del tema?
- `FAQ`: ¿preguntas reales con respuestas cortas?

## Output obligatorio

```text
## Humanization / AI Pattern Audit

### AI Pattern Risk
`AI PATTERN RISK: NONE / LOW / MEDIUM / HIGH / CRITICAL`

### AI Detection Metrics

- EN:
  - `model_ai_pct`: X%
  - `pattern_totals`: ...
  - `AI sentences` (máximo 10): ...
- ES:
  - `model_ai_pct`: X%
  - `pattern_totals`: ...
  - `AI sentences` (máximo 10): ...
- Tool status: `ai-detect-content.py + ai-detect-patterns.py executed / fallback used / NOT VERIFIED`

### Red words found
| Palabra/frase | Ubicación | Recomendación |
|---|---|---|
| ... | ... | ... |

### Generic phrases found
| Frase | Ubicación | Recomendación |
|---|---|---|
| ... | ... | ... |

### Sentence-ending tokens / tools
| Oración | Problema | Recomendación |
|---|---|---|
| ... | ... | ... |

### Impersonal / filler sections
...

### Bilingual Humanization Parity
`BILINGUAL HUMANIZATION PARITY: PASS / WARNING / FAIL`

### Humanization Score
`HUMANIZATION SCORE: X/15`

### Top 5 humanization fixes
1. ...
2. ...
3. ...
4. ...
5. ...
```

## Reglas

- No reescribas el recurso.
- No elimines contenido técnico solo para bajar el score IA.
- Conserva ejemplos de código, versiones y herramientas reales.
- Si un detector marca frases técnicas cortas como IA, prioriza patrones genéricos sobre forzar un score artificial.
