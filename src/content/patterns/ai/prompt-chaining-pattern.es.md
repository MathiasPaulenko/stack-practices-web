---
contentType: patterns
slug: prompt-chaining-pattern
title: "Patrón Prompt Chaining"
description: "Encadena multiples llamadas LLM donde la salida de cada paso alimenta la entrada del siguiente. Divide tareas complejas en prompts mas pequenos y verificables."
metaDescription: "Encadena llamadas LLM secuencialmente donde cada salida alimenta la siguiente entrada. Divide tareas complejas en prompts verificables para mejores resultados."
difficulty: intermediate
topics:
  - ai
tags:
  - prompt-chaining
  - patron
  - patron-ai
  - llm
  - multi-paso
  - pipeline
  - descomposicion-tareas
relatedResources:
  - /patterns/ai/llm-router-pattern
  - /patterns/ai/agent-tool-selection-pattern
  - /recipes/ai/python-langchain-chains-composition
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Encadena llamadas LLM secuencialmente donde cada salida alimenta la siguiente entrada. Divide tareas complejas en prompts verificables para mejores resultados."
  keywords:
    - patron prompt chaining
    - pipeline llm
    - llm multi-paso
    - patron ia
    - descomposicion de tareas
    - cadena de prompts
    - flujo llm
---

# Patrón Prompt Chaining

## Descripción general

Prompt chaining divide una tarea compleja en una secuencia de llamadas LLM mas pequenas. Cada llamada recibe la salida de la anterior como entrada, mas su propio prompt enfocado. En lugar de pedirle a un modelo que "investigue, analice, resuma y formatee un reporte" en un solo prompt gigante, encadenas cuatro llamadas separadas: una para investigar, una para analizar, una para resumir, una para formatear.

Cada paso en la cadena tiene un solo objetivo claro. Esto mejora la calidad del output porque el modelo puede enfocarse en una tarea a la vez. Tambien permite validacion entre pasos — si el paso 2 produce basura, puedes reintentar solo ese paso en lugar de todo el pipeline.

## Cuándo usarlo

Usa el patrón Prompt Chaining cuando:
- Un solo prompt produce resultados inconsistentes o de baja calidad para una tarea compleja
- Necesitas validacion intermedia o revision humana entre pasos
- Diferentes pasos se benefician de diferentes modelos o parametros (temperatura, max tokens)
- La tarea tiene una estructura secuencial natural (investigar luego escribir, extraer luego transformar)
- Ejemplos: generacion de reportes, pipelines de revision de codigo, extraccion y formateo de datos, traduccion multi-idioma con revision

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Any

@dataclass
class ChainStep:
    name: str
    prompt_template: str
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_retries: int = 2
    validator: Optional[Callable[[str], bool]] = None

@dataclass
class ChainResult:
    step_name: str
    input: str
    output: str
    success: bool
    retries: int

def mock_llm_call(prompt: str, model: str, temperature: float) -> str:
    """Simula una llamada a la API del LLM."""
    return f"[{model}] Processed: {prompt[:60]}..."

class PromptChain:
    def __init__(self, steps: List[ChainStep]):
        self.steps = steps

    def run(self, initial_input: str) -> List[ChainResult]:
        results: List[ChainResult] = []
        current_input = initial_input

        for step in self.steps:
            prompt = step.prompt_template.format(input=current_input)
            success = False
            output = ""
            retries = 0

            for attempt in range(step.max_retries + 1):
                output = mock_llm_call(prompt, step.model, step.temperature)
                retries = attempt

                if step.validator and not step.validator(output):
                    print(f"  Step '{step.name}' validation failed (attempt {attempt + 1})")
                    continue

                success = True
                break

            results.append(ChainResult(
                step_name=step.name,
                input=current_input,
                output=output,
                success=success,
                retries=retries,
            ))

            if not success:
                print(f"Chain stopped at step '{step.name}' after {retries + 1} attempts")
                break

            current_input = output
            print(f"Step '{step.name}' completed")

        return results

# Uso
def validate_non_empty(text: str) -> bool:
    return len(text.strip()) > 10

def validate_has_code(text: str) -> bool:
    return "```" in text or "def " in text or "function " in text

chain = PromptChain([
    ChainStep(
        name="extract_requirements",
        prompt_template="Extract key requirements from this text:\n{input}\n\nList each requirement as a bullet point.",
        model="gpt-4o",
        temperature=0.2,
        validator=validate_non_empty,
    ),
    ChainStep(
        name="generate_code",
        prompt_template="Based on these requirements, generate code:\n{input}\n\nProvide working code with comments.",
        model="gpt-4o",
        temperature=0.3,
        validator=validate_has_code,
    ),
    ChainStep(
        name="review_code",
        prompt_template="Review this code for bugs and improvements:\n{input}\n\nList issues found.",
        model="gpt-4o",
        temperature=0.5,
        validator=validate_non_empty,
    ),
    ChainStep(
        name="format_report",
        prompt_template="Create a summary report from this review:\n{input}\n\nFormat as markdown with sections.",
        model="gpt-4o-mini",
        temperature=0.7,
    ),
])

results = chain.run("Build a REST API endpoint that accepts JSON, validates input, and returns 201 on success")

print(f"\nChain completed: {len(results)}/{len(chain.steps)} steps")
for r in results:
    status = "OK" if r.success else "FAILED"
    print(f"  {r.step_name}: {status} (retries: {r.retries})")
```

### JavaScript

```javascript
class ChainStep {
  constructor(name, promptTemplate, options = {}) {
    this.name = name;
    this.promptTemplate = promptTemplate;
    this.model = options.model || "gpt-4o";
    this.temperature = options.temperature ?? 0.7;
    this.maxRetries = options.maxRetries ?? 2;
    this.validator = options.validator || null;
  }
}

function mockLlmCall(prompt, model, temperature) {
  return `[${model}] Processed: ${prompt.slice(0, 60)}...`;
}

class PromptChain {
  constructor(steps) {
    this.steps = steps;
  }

  async run(initialInput) {
    const results = [];
    let currentInput = initialInput;

    for (const step of this.steps) {
      const prompt = step.promptTemplate.replace("{input}", currentInput);
      let success = false;
      let output = "";
      let retries = 0;

      for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
        output = mockLlmCall(prompt, step.model, step.temperature);
        retries = attempt;

        if (step.validator && !step.validator(output)) {
          console.log(`  Step '${step.name}' validation failed (attempt ${attempt + 1})`);
          continue;
        }

        success = true;
        break;
      }

      results.push({ stepName: step.name, input: currentInput, output, success, retries });

      if (!success) {
        console.log(`Chain stopped at step '${step.name}' after ${retries + 1} attempts`);
        break;
      }

      currentInput = output;
      console.log(`Step '${step.name}' completed`);
    }

    return results;
  }
}

// Uso
function validateNonEmpty(text) {
  return text.trim().length > 10;
}

function validateHasCode(text) {
  return text.includes("```") || text.includes("function ") || text.includes("const ");
}

const chain = new PromptChain([
  new ChainStep("extract_requirements", "Extract key requirements from:\n{input}\n\nList as bullet points.", { temperature: 0.2, validator: validateNonEmpty }),
  new ChainStep("generate_code", "Generate code from these requirements:\n{input}\n\nProvide working code.", { temperature: 0.3, validator: validateHasCode }),
  new ChainStep("review_code", "Review this code for bugs:\n{input}\n\nList issues found.", { temperature: 0.5, validator: validateNonEmpty }),
  new ChainStep("format_report", "Create a summary report:\n{input}\n\nFormat as markdown.", { model: "gpt-4o-mini", temperature: 0.7 }),
]);

chain.run("Build a REST API endpoint that accepts JSON, validates input, and returns 201 on success").then(results => {
  console.log(`\nChain completed: ${results.length}/${chain.steps.length} steps`);
  results.forEach(r => {
    const status = r.success ? "OK" : "FAILED";
    console.log(`  ${r.stepName}: ${status} (retries: ${r.retries})`);
  });
});
```

### Java

```java
import java.util.*;
import java.util.function.Predicate;

public class PromptChaining {

    record ChainStep(String name, String promptTemplate, String model,
                     double temperature, int maxRetries, Predicate<String> validator) {}

    record ChainResult(String stepName, String input, String output, boolean success, int retries) {}

    static String mockLlmCall(String prompt, String model, double temperature) {
        return "[" + model + "] Processed: " + prompt.substring(0, Math.min(60, prompt.length())) + "...";
    }

    static List<ChainResult> runChain(List<ChainStep> steps, String initialInput) {
        List<ChainResult> results = new ArrayList<>();
        String currentInput = initialInput;

        for (ChainStep step : steps) {
            String prompt = step.promptTemplate().replace("{input}", currentInput);
            boolean success = false;
            String output = "";
            int retries = 0;

            for (int attempt = 0; attempt <= step.maxRetries(); attempt++) {
                output = mockLlmCall(prompt, step.model(), step.temperature());
                retries = attempt;

                if (step.validator() != null && !step.validator().test(output)) {
                    System.out.printf("  Step '%s' validation failed (attempt %d)%n", step.name(), attempt + 1);
                    continue;
                }

                success = true;
                break;
            }

            results.add(new ChainResult(step.name(), currentInput, output, success, retries));

            if (!success) {
                System.out.printf("Chain stopped at '%s' after %d attempts%n", step.name(), retries + 1);
                break;
            }

            currentInput = output;
            System.out.printf("Step '%s' completed%n", step.name());
        }

        return results;
    }

    public static void main(String[] args) {
        Predicate<String> nonEmpty = s -> s.trim().length() > 10;
        Predicate<String> hasCode = s -> s.contains("```") || s.contains("void ") || s.contains("public ");

        var steps = List.of(
            new ChainStep("extract_requirements",
                "Extract key requirements from:\n{input}\n\nList as bullet points.",
                "gpt-4o", 0.2, 2, nonEmpty),
            new ChainStep("generate_code",
                "Generate code from these requirements:\n{input}\n\nProvide working code.",
                "gpt-4o", 0.3, 2, hasCode),
            new ChainStep("review_code",
                "Review this code for bugs:\n{input}\n\nList issues found.",
                "gpt-4o", 0.5, 2, nonEmpty),
            new ChainStep("format_report",
                "Create a summary report:\n{input}\n\nFormat as markdown.",
                "gpt-4o-mini", 0.7, 2, null)
        );

        var results = runChain(steps,
            "Build a REST API endpoint that accepts JSON, validates input, and returns 201 on success");

        System.out.printf("%nChain completed: %d/%d steps%n", results.size(), steps.size());
        for (ChainResult r : results) {
            String status = r.success() ? "OK" : "FAILED";
            System.out.printf("  %s: %s (retries: %d)%n", r.stepName(), status, r.retries());
        }
    }
}
```

## Explicación

La cadena ejecuta pasos secuencialmente:

1. **Propagacion de entrada**: La entrada inicial entra al primer paso. Cada paso subsiguiente recibe la salida del paso anterior como su entrada.
2. **Ejecucion del paso**: Cada paso formatea su plantilla de prompt con la entrada actual, llama al LLM con parametros especificos del paso (modelo, temperatura) y produce una salida.
3. **Validacion**: Si un paso tiene una funcion validadora, la salida se verifica. Si la validacion falla, el paso reintenta hasta `max_retries` veces. Si todos los reintentos fallan, la cadena se detiene.
4. **Coleccion de resultados**: El resultado de cada paso (entrada, salida, exito, reintentos) se registra para debugging y auditoria.

El patrón intercambia latencia por calidad. Una cadena de 4 pasos toma 4x la latencia de una sola llamada pero produce output mas confiable porque cada paso se enfoca en una tarea y puede validarse independientemente.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Fan-out paralelo** | Ejecutar multiples pasos en paralelo, luego fusionar | Subtareas independientes (ej. traducir a 3 idiomas) |
| **Branching condicional** | El siguiente paso depende del output anterior | Flujos dinamicos (ej. si el codigo tiene bugs, ir al paso de fix) |
| **Loop con condicion de salida** | Repetir un paso hasta que se cumpla una condicion | Refinamiento iterativo (ej. mejorar hasta score > umbral) |
| **Map-reduce** | Mapear sobre items en paralelo, reducir resultados | Procesamiento por lotes (ej. resumir 100 documentos) |

## Buenas prácticas

- **Mantén los prompts cortos y enfocados** — cada paso debe tener un solo objetivo claro
- **Usa temperatura baja para extraccion** — 0.1-0.3 para pasos factuales, mas alta para pasos creativos
- **Valida entre pasos** — detecta output malo temprano antes de que se propague
- **Cachea resultados intermedios** — si el paso 3 falla, no necesitas re-ejecutar los pasos 1 y 2
- **Usa modelos mas baratos para pasos simples** — formateo y resumen pueden usar modelos pequenos
- **Registra cada paso** — entradas, salidas, modelo y parametros para debugging

## Errores comunes

- Hacer cadenas demasiado largas (10+ pasos), causando latencia excesiva y acumulacion de errores
- No validar entre pasos, dejando que el output malo corrompa los pasos siguientes
- Usar el mismo modelo y temperatura para cada paso sin importar el tipo de tarea
- No manejar fallos parciales — si el paso 3 falla, el usuario no recibe output en lugar de resultados parciales
- Pasar output crudo sin limpiar ni formatear entre pasos

## Preguntas frecuentes

**Q: Cuantos pasos debe tener una cadena?**
A: 3-6 pasos funciona mejor. Mas alla de eso, la latencia y la probabilidad de fallo se acumulan. Si necesitas mas pasos, considera dividir en sub-cadenas o usar un loop de agente.

**Q: Debo usar el mismo modelo para todos los pasos?**
A: No. Los pasos de extraccion y clasificacion se benefician de temperatura baja y modelos enfocados. Pasos creativos como escritura o formateo pueden usar parametros diferentes. Usa el [Patrón LLM Router](/patterns/ai/llm-router-pattern) para seleccionar modelos por paso.

**Q: Como manejo un paso que falla despues de todos los reintentos?**
A: Devuelve resultados parciales con un estado claro. Deja que el llamador decida si reintentar el paso fallido, saltarlo, o abortar. Nunca ocultes fallos silenciosamente.

**Q: Puedo paralelizar pasos en una cadena?**
A: Solo si los pasos son independientes. Si el paso B depende del output del paso A, deben ser secuenciales. Para subtareas independientes, usa la variante fan-out paralelo y fusiona los resultados despues.
