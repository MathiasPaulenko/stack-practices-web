# Herramientas de detección de contenido IA — StackPractices

## ai-detect (principal)

- **Instalación:** `C:\Users\mathi\AppData\Roaming\Python\Python314\site-packages\ai_detect\`
- **Modelo por defecto:** `desklib/ai-text-detector-v1.01` (DeBERTa-v3-large), más fiable.
- **Modelo alternativo:** `light` (`onnx-community/tmr-ai-text-detector-ONNX`), más rápido pero sobre-marca.

### Scripts de StackPractices

- `scripts/ai-detect-content.py` — análisis neuronal + patrones para un recurso concreto.
- `scripts/ai-detect-patterns.py` — análisis solo de patrones, muy rápido, sin cargar modelos.

### Uso típico

```bash
# Detector de patrones (rápido, para iterar)
python scripts/ai-detect-patterns.py src/content/{tipo}/{slug}.md

# Detector neuronal con limpieza de Markdown
python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --model desklib

# Modelo ligero para una primera aproximación rápida
python scripts/ai-detect-content.py src/content/{tipo}/{slug}.md --model light
```

### Output clave

- `model_ai_pct`: porcentaje estimado de contenido con patrón IA.
- `sentences`: oraciones etiquetadas `AI` / `HUMAN` con `ai_prob`.
- `pattern_totals`: resumen de patrones detectados.
- `top_ai_sentences`: frases con mayor probabilidad de IA.
- `diagnostics_sample`: hallazgos de patrones con sugerencias de reescritura.
- `text_metrics`: estadísticas de longitud de oraciones (SDSL).

### Output

Los informes se escriben en `ref/output/`:

- `ai-detect-{slug}.json`
- `ai-detect-patterns-{slug}.json`

## Notas

- `ai-detect` sin limpieza ve código y headings como texto normal y sobre-estima el score. `scripts/ai-detect-content.py` elimina código, headings y viñetas antes de pasar el texto.
- El target ideal es `model_ai_pct` < 30 % con `desklib`, pero contenido técnico con FAQ denso puede estabilizarse entre 35 % y 50 %.
- Siempre revisar `pattern_totals` primero: esas correcciones son inmediatas y tienen mayor impacto en legibilidad.

## Referencia

- Prompt de análisis: `ref/prompts/ai-detect-analysis.md`.
- Flujo completo: `ref/content-improvement-workflow.md`.
