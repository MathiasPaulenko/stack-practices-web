---
contentType: patterns
slug: llm-router-pattern
title: "Patrón LLM Router"
description: "Enruta consultas a diferentes modelos LLM segun complejidad, costo y latencia. Clasifica la entrada antes de despachar al modelo adecuado."
metaDescription: "Enruta consultas LLM por complejidad al modelo adecuado. Reduce costos enviando consultas simples a modelos pequenos y complejas a modelos grandes."
difficulty: intermediate
topics:
  - ai
tags:
  - llm-router
  - patron
  - patron-ai
  - optimizacion-costos
  - seleccion-modelo
  - llm
  - enrutamiento
relatedResources:
  - /patterns/ai/llm-fallback-pattern
  - /patterns/ai/prompt-chaining-pattern
  - /recipes/ai/python-openai-function-calling-structured
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Enruta consultas LLM por complejidad al modelo adecuado. Reduce costos enviando consultas simples a modelos pequenos y complejas a modelos grandes."
  keywords:
    - patron llm router
    - enrutamiento de modelos
    - patron ia
    - optimizacion costos llm
    - seleccion de modelo
    - clasificacion de consultas
    - routing gpt
---

# Patrón LLM Router

## Descripción general

El patrón LLM Router clasifica las consultas entrantes por complejidad y despacha cada una al modelo mas rentable que pueda manejarla. Preguntas simples como "cuanto es 2+2" no necesitan GPT-4 o Claude Opus. Tareas de razonamiento complejo como "analiza este contrato legal en busca de clausulas de riesgo" no deberian ir a un modelo pequeno que producira una respuesta superficial.

Un router se ubica entre el usuario y los proveedores de modelos. Inspecciona la consulta, aplica una regla de clasificacion (basada en reglas, similitud de embeddings o un modelo clasificador pequeno) y selecciona un modelo del pool configurado. La respuesta fluye de vuelta por el mismo camino.

## Cuándo usarlo

Usa el patrón LLM Router cuando:
- Atiendes una mezcla de consultas simples y complejas y quieres reducir costos en las simples
- Diferentes modelos en tu stack tienen perfiles de latencia diferentes y necesitas optimizar tiempo de respuesta
- Quieres degradacion graceful cuando un modelo primario esta sobrecargado o rate-limited
- Tu aplicacion tiene categorias distintas de consulta (resumen, generacion de codigo, Q&A factual) que mapean a diferentes fortalezas de modelo
- Ejemplos: chatbots, automatizacion de soporte al cliente, asistentes de codigo, pipelines de generacion de contenido

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional
import re

@dataclass
class ModelConfig:
    name: str
    max_tokens: int
    cost_per_1k: float
    latency_ms: int

@dataclass
class Query:
    text: str
    category: str = ""
    complexity: str = ""

@dataclass
class Response:
    model: str
    content: str
    tokens_used: int
    cost: float

MODELS = {
    "small": ModelConfig("gpt-4o-mini", 4096, 0.00015, 200),
    "medium": ModelConfig("gpt-4o", 8192, 0.005, 500),
    "large": ModelConfig("o1-preview", 16384, 0.015, 2000),
}

def classify_complexity(query: Query) -> str:
    """Clasifica la complejidad de la consulta usando heuristicas."""
    text = query.text.lower()
    word_count = len(query.text.split())

    simple_patterns = [
        r"^\s*(what|who|when|where|is|are|can|do)\s",
        r"calculate|convert|format|translate",
        r"summarize|rewrite|paraphrase",
    ]

    complex_patterns = [
        r"analyze|design|architect|compare|evaluate",
        r"debug|refactor|optimize|review",
        r"step.by.step|detailed|thorough",
        r"legal|medical|financial|security",
    ]

    for pattern in complex_patterns:
        if re.search(pattern, text):
            return "high"

    if word_count > 100:
        return "high"

    for pattern in simple_patterns:
        if re.search(pattern, text):
            return "low"

    if word_count < 20:
        return "low"

    return "medium"

def route_to_model(complexity: str) -> str:
    """Mapea nivel de complejidad a tier de modelo."""
    mapping = {"low": "small", "medium": "medium", "high": "large"}
    return mapping.get(complexity, "medium")

def mock_generate(model: ModelConfig, prompt: str) -> Response:
    """Simula generacion del modelo."""
    tokens = min(len(prompt.split()) * 2, model.max_tokens)
    cost = (tokens / 1000) * model.cost_per_1k
    return Response(
        model=model.name,
        content=f"[{model.name}] Response to: {prompt[:50]}...",
        tokens_used=tokens,
        cost=cost,
    )

class LLMRouter:
    def __init__(self, models: Dict[str, ModelConfig]):
        self.models = models

    def handle(self, query_text: str) -> Response:
        query = Query(text=query_text)
        query.complexity = classify_complexity(query)
        model_key = route_to_model(query.complexity)
        model = self.models[model_key]
        print(f"Query complexity: {query.complexity} -> Model: {model.name}")
        return mock_generate(model, query_text)

# Uso
router = LLMRouter(MODELS)

queries = [
    "What is the capital of France?",
    "Analyze this contract for liability clauses and suggest revisions",
    "Convert 100 degrees Celsius to Fahrenheit",
    "Design a microservices architecture for an e-commerce platform with 10M users",
]

for q in queries:
    response = router.handle(q)
    print(f"  Model: {response.model}, Cost: ${response.cost:.6f}")
```

### JavaScript

```javascript
class ModelConfig {
  constructor(name, maxTokens, costPer1k, latencyMs) {
    this.name = name;
    this.maxTokens = maxTokens;
    this.costPer1k = costPer1k;
    this.latencyMs = latencyMs;
  }
}

const MODELS = {
  small: new ModelConfig("gpt-4o-mini", 4096, 0.00015, 200),
  medium: new ModelConfig("gpt-4o", 8192, 0.005, 500),
  large: new ModelConfig("o1-preview", 16384, 0.015, 2000),
};

function classifyComplexity(text) {
  const lower = text.toLowerCase();
  const wordCount = text.split(" ").length;

  const complexPatterns = [
    /analyze|design|architect|compare|evaluate/,
    /debug|refactor|optimize|review/,
    /step.by.step|detailed|thorough/,
    /legal|medical|financial|security/,
  ];

  const simplePatterns = [
    /^\s*(what|who|when|where|is|are|can|do)\s/,
    /calculate|convert|format|translate/,
    /summarize|rewrite|paraphrase/,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(lower)) return "high";
  }

  if (wordCount > 100) return "high";

  for (const pattern of simplePatterns) {
    if (pattern.test(lower)) return "low";
  }

  if (wordCount < 20) return "low";

  return "medium";
}

function routeToModel(complexity) {
  const mapping = { low: "small", medium: "medium", high: "large" };
  return mapping[complexity] || "medium";
}

function mockGenerate(model, prompt) {
  const tokens = Math.min(prompt.split(" ").length * 2, model.maxTokens);
  const cost = (tokens / 1000) * model.costPer1k;
  return {
    model: model.name,
    content: `[${model.name}] Response to: ${prompt.slice(0, 50)}...`,
    tokensUsed: tokens,
    cost,
  };
}

class LLMRouter {
  constructor(models) {
    this.models = models;
  }

  handle(queryText) {
    const complexity = classifyComplexity(queryText);
    const modelKey = routeToModel(complexity);
    const model = this.models[modelKey];
    console.log(`Complexity: ${complexity} -> Model: ${model.name}`);
    return mockGenerate(model, queryText);
  }
}

// Uso
const router = new LLMRouter(MODELS);

const queries = [
  "What is the capital of France?",
  "Analyze this contract for liability clauses and suggest revisions",
  "Convert 100 degrees Celsius to Fahrenheit",
  "Design a microservices architecture for an e-commerce platform with 10M users",
];

for (const q of queries) {
  const response = router.handle(q);
  console.log(`  Model: ${response.model}, Cost: $${response.cost.toFixed(6)}`);
}
```

### Java

```java
import java.util.*;
import java.util.regex.Pattern;

public class LLMRouter {

    record ModelConfig(String name, int maxTokens, double costPer1k, int latencyMs) {}

    static final Map<String, ModelConfig> MODELS = Map.of(
        "small", new ModelConfig("gpt-4o-mini", 4096, 0.00015, 200),
        "medium", new ModelConfig("gpt-4o", 8192, 0.005, 500),
        "large", new ModelConfig("o1-preview", 16384, 0.015, 2000)
    );

    static final List<Pattern> COMPLEX_PATTERNS = List.of(
        Pattern.compile("analyze|design|architect|compare|evaluate", Pattern.CASE_INSENSITIVE),
        Pattern.compile("debug|refactor|optimize|review", Pattern.CASE_INSENSITIVE),
        Pattern.compile("step.by.step|detailed|thorough", Pattern.CASE_INSENSITIVE),
        Pattern.compile("legal|medical|financial|security", Pattern.CASE_INSENSITIVE)
    );

    static final List<Pattern> SIMPLE_PATTERNS = List.of(
        Pattern.compile("^\\s*(what|who|when|where|is|are|can|do)\\s", Pattern.CASE_INSENSITIVE),
        Pattern.compile("calculate|convert|format|translate", Pattern.CASE_INSENSITIVE),
        Pattern.compile("summarize|rewrite|paraphrase", Pattern.CASE_INSENSITIVE)
    );

    static String classifyComplexity(String text) {
        int wordCount = text.split(" ").length;

        for (Pattern p : COMPLEX_PATTERNS) {
            if (p.matcher(text).find()) return "high";
        }

        if (wordCount > 100) return "high";

        for (Pattern p : SIMPLE_PATTERNS) {
            if (p.matcher(text).find()) return "low";
        }

        if (wordCount < 20) return "low";

        return "medium";
    }

    static String routeToModel(String complexity) {
        return switch (complexity) {
            case "low" -> "small";
            case "high" -> "large";
            default -> "medium";
        };
    }

    record Response(String model, String content, int tokensUsed, double cost) {}

    static Response mockGenerate(ModelConfig model, String prompt) {
        int tokens = Math.min(prompt.split(" ").length * 2, model.maxTokens());
        double cost = (tokens / 1000.0) * model.costPer1k();
        return new Response(
            model.name(),
            "[" + model.name() + "] Response to: " +
                prompt.substring(0, Math.min(50, prompt.length())) + "...",
            tokens, cost
        );
    }

    public Response handle(String queryText) {
        String complexity = classifyComplexity(queryText);
        String modelKey = routeToModel(complexity);
        ModelConfig model = MODELS.get(modelKey);
        System.out.printf("Complexity: %s -> Model: %s%n", complexity, model.name());
        return mockGenerate(model, queryText);
    }

    public static void main(String[] args) {
        var router = new LLMRouter();
        String[] queries = {
            "What is the capital of France?",
            "Analyze this contract for liability clauses and suggest revisions",
            "Convert 100 degrees Celsius to Fahrenheit",
            "Design a microservices architecture for an e-commerce platform with 10M users"
        };

        for (String q : queries) {
            Response r = router.handle(q);
            System.out.printf("  Model: %s, Cost: $%.6f%n", r.model(), r.cost());
        }
    }
}
```

## Explicación

El router opera en tres pasos:

1. **Clasificacion**: Inspecciona el texto de la consulta usando heuristicas (patrones regex, conteo de palabras), un clasificador basado en embeddings o un modelo de lenguaje pequeno. Asigna un nivel de complejidad: bajo, medio o alto.
2. **Enrutamiento**: Mapea el nivel de complejidad a un modelo del pool configurado. Complejidad baja va a un modelo barato y rapido. Complejidad alta va a un modelo potente y mas lento.
3. **Generacion**: Reenvia la consulta al modelo seleccionado y devuelve la respuesta.

El paso de clasificacion es el componente critico. La clasificacion basada en reglas es rapida y gratuita pero limitada. Un modelo clasificador pequeno (como un BERT fine-tuned o incluso un LLM pequeno con output estructurado) proporciona mejor precision a una fraccion del costo de usar siempre el modelo grande.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Clasificador por embeddings** | Compara embedding de la consulta con centroides de categoria | Mas preciso que reglas, sigue siendo barato |
| **Clasificador LLM pequeno** | Usa un LLM pequeno para clasificar antes de enrutar | Maxima precision, pequeno costo adicional |
| **Cascada con fallback** | Prueba el modelo pequeno primero, escala si la confianza es baja | Reduce costos manteniendo calidad |
| **Routing por categoria** | Enruta por tipo de tarea (codigo, resumen, traduccion) | Diferentes modelos destacan en diferentes tareas |

## Buenas prácticas

- **Empieza con reglas, luego mejora** — las heuristicas regex son gratuitas y cubren 70-80% de los casos
- **Registra decisiones de routing** — rastrea que modelo manejo cada consulta y la satisfaccion del usuario para refinar reglas
- **Define presupuestos de costo por consulta** — rechaza o degrada si una consulta excederia un umbral de costo
- **Cachea respuestas simples** — si la misma pregunta simple se repite, cachea la respuesta del modelo pequeno
- **Permite override manual** — deja que los usuarios fuerzen un modelo especifico para consultas importantes
- **Monitorea model drift** — las actualizaciones de modelos pueden cambiar la calidad; re-evalua las reglas periodicamente

## Errores comunes

- Sobre-clasificar consultas como complejas, enviando todo al modelo caro y anulando el ahorro
- Usar una sola heuristica (conteo de palabras) sin analisis semantico, perdiendo complejidad matizada
- No manejar caidas de modelo — si el modelo grande cae, el router deberia hacer fallback al mediano
- Enrutar basado en tier de usuario en lugar de complejidad de consulta, causando inconsistencia de calidad
- No medir precision de routing — sin loops de feedback, las reglas malas persisten

## Preguntas frecuentes

**Q: Cuanto costo puedo ahorrar con un LLM router?**
A: Tipicamente 40-70% para aplicaciones con complejidad mixta de consultas. Si el 80% de las consultas son simples y las enrutas a un modelo que cuesta 30x menos, los ahorros se acumulan rapidamente.

**Q: Debo usar un modelo separado para clasificacion?**
A: Para sistemas en produccion, si. Un modelo pequeno (como un clasificador fine-tuned o incluso embeddings + similitud coseno) es mas preciso que regex y cuesta centavos por clasificacion. Las reglas funcionan para prototipos.

**Q: Que pasa si el router clasifica mal una consulta compleja como simple?**
A: El modelo pequeno producira una respuesta superficial o incorrecta. Mitiga esto con una verificacion de confianza — si la respuesta del modelo pequeno es demasiado corta o de baja calidad, re-enruta a un modelo mas grande. Esta es la variante en cascada.

**Q: Puedo enrutar basado en contexto del usuario en lugar del texto de la consulta?**
A: Si. Puedes considerar el tier del usuario, historial de conversacion o metadatos de sesion. Por ejemplo, un usuario de pago que hace una pregunta compleja podria siempre obtener el modelo grande, mientras que un usuario gratuito se enruta por complejidad.
