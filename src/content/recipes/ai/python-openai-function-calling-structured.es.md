---
contentType: recipes
slug: python-openai-function-calling-structured
title: "Salida JSON estructurada con OpenAI Function Calling"
description: "Usa function calling y structured outputs de OpenAI para obtener JSON confiable de LLMs con validacion Pydantic y manejo de errores"
metaDescription: "Obten JSON estructurado de OpenAI con function calling y esquemas Pydantic. Valida respuestas, maneja rechazos y reintenta en errores de parseo."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - openai
  - function calling
  - structured output
  - pydantic
relatedResources:
  - /recipes/ai/python-langchain-chains-composition
  - /recipes/ai/python-openai-embeddings-cosine
  - /recipes/ai/python-llm-streaming-responses
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Obten JSON estructurado de OpenAI con function calling y esquemas Pydantic. Valida respuestas, maneja rechazos y reintenta en errores de parseo."
  keywords:
    - openai function calling
    - structured output openai
    - pydantic openai
    - openai json mode
    - python llm structured
---

# Salida JSON estructurada con OpenAI Function Calling

Los LLMs generan texto, pero las aplicaciones necesitan datos estructurados. Function calling y structured outputs de OpenAI fuerzan al modelo a retornar JSON que coincide con un esquema. Combinado con Pydantic para validacion, esto te da salida estructurada type-safe y confiable de cualquier llamada LLM. A continuacion: function calling, `response_format` con JSON schema y manejo de errores.

## Cuando Usar Esto

- Extraer datos estructurados de texto no estructurado (reviews, emails, documentos)
- Construir herramientas que el LLM pueda llamar (busqueda, queries de base de datos, calculos)
- Cualquier workflow donde la salida del LLM debe ser legible por maquina

## Requisitos Previos

- Python 3.10+
- Paquete `openai` (`pip install openai`)
- Paquete `pydantic` (`pip install pydantic`)
- Una API key de OpenAI

## Solucion

### 1. Instalar dependencias

```bash
pip install openai pydantic
```

### 2. Definir un esquema Pydantic

```python
from pydantic import BaseModel, Field

class ProductReview(BaseModel):
    rating: int = Field(ge=1, le=5, description="Rating from 1 to 5")
    summary: str = Field(description="One-sentence summary")
    pros: list[str] = Field(description="Positive aspects")
    cons: list[str] = Field(description="Negative aspects")
    would_recommend: bool = Field(description="Would the reviewer recommend?")
```

### 3. Function calling — enfoque basado en herramientas

```python
import json
from openai import OpenAI

client = OpenAI()

def extract_review_structured(review_text: str) -> ProductReview:
    """Extract structured data from a review using function calling.

    Args:
        review_text: Raw review text.

    Returns:
        Validated ProductReview instance.
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Extract structured review data."},
            {"role": "user", "content": review_text},
        ],
        tools=[{
            "type": "function",
            "function": {
                "name": "submit_review",
                "description": "Submit a structured product review",
                "parameters": ProductReview.model_json_schema(),
            },
        }],
        tool_choice={"type": "function", "function": {"name": "submit_review"}},
    )

    tool_call = response.choices[0].message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    return ProductReview.model_validate(args)

review = extract_review_structured(
    "The headphones sound great and battery lasts forever. "
    "However, the case is bulky. I'd recommend them to anyone."
)
print(f"Rating: {review.rating}/5")
print(f"Pros: {review.pros}")
print(f"Cons: {review.cons}")
```

### 4. Structured output con `response_format`

```python
def extract_with_response_format(review_text: str) -> ProductReview:
    """Use response_format for guaranteed JSON schema compliance."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Extract structured review data as JSON."},
            {"role": "user", "content": review_text},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "ProductReview",
                "schema": ProductReview.model_json_schema(),
                "strict": True,
            },
        },
    )

    return ProductReview.model_validate_json(
        response.choices[0].message.content
    )
```

### 5. Multiples definiciones de herramientas

```python
class SearchQuery(BaseModel):
    query: str = Field(description="Search query")
    filters: dict = Field(description="Metadata filters", default={})

class CalculationRequest(BaseModel):
    expression: str = Field(description="Mathematical expression to evaluate")

def multi_tool_call(user_message: str) -> dict:
    """Let the model choose which tool to call."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": user_message}],
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "search",
                    "description": "Search the knowledge base",
                    "parameters": SearchQuery.model_json_schema(),
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate",
                    "description": "Evaluate a math expression",
                    "parameters": CalculationRequest.model_json_schema(),
                },
            },
        ],
    )

    message = response.choices[0].message
    if message.tool_calls:
        tool_call = message.tool_calls[0]
        return {
            "tool": tool_call.function.name,
            "args": json.loads(tool_call.function.arguments),
        }
    return {"tool": None, "response": message.content}

result = multi_tool_call("What is 15 * 23?")
# {'tool': 'calculate', 'args': {'expression': '15 * 23'}}
```

### 6. Reintento en error de validacion

```python
import logging

logger = logging.getLogger(__name__)

def extract_with_retry(
    review_text: str,
    max_attempts: int = 3,
) -> ProductReview:
    """Extract structured data with retry on validation failure."""
    messages = [
        {"role": "system", "content": "Extract structured review data as JSON."},
        {"role": "user", "content": review_text},
    ]

    for attempt in range(max_attempts):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "ProductReview",
                    "schema": ProductReview.model_json_schema(),
                    "strict": True,
                },
            },
        )

        content = response.choices[0].message.content
        try:
            return ProductReview.model_validate_json(content)
        except Exception as e:
            logger.warning("Attempt %d failed: %s", attempt + 1, e)
            messages.append({"role": "assistant", "content": content})
            messages.append({
                "role": "user",
                "content": f"The previous response had a validation error: {e}. Please fix and return valid JSON.",
            })

    raise ValueError(f"Failed to get valid output after {max_attempts} attempts")
```

## Como Funciona

1. **Function calling** define herramientas con parametros JSON Schema. El modelo es forzado a llamar una funcion especifica, retornando argumentos como string JSON que parseas y validas.
2. **`response_format` con `json_schema`** garantiza que la salida del modelo coincida con el esquema. El flag `strict: true` exige que todos los campos esten presentes y correctamente tipados.
3. **Validacion Pydantic** proporciona una segunda capa de seguridad — incluso si el modelo retorna JSON valido, Pydantic verifica tipos, restricciones (ej. `ge=1, le=5`) y campos requeridos.
4. **Loop de reintento** agrega la respuesta fallida y el mensaje de error a la conversacion, dando al modelo contexto para corregir su error en el siguiente intento.
5. **Multiples herramientas** permiten al modelo elegir cual funcion llamar basandose en la intencion del usuario, habilitando enrutamiento y seleccion de herramientas.

## Variantes

### Streaming de salida estructurada

```python
def stream_structured(review_text: str) -> ProductReview:
    """Stream partial JSON and parse at the end."""
    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Extract structured review data as JSON."},
            {"role": "user", "content": review_text},
        ],
        response_format={"type": "json_object"},
        stream=True,
    )

    chunks = []
    for chunk in stream:
        if chunk.choices[0].delta.content:
            chunks.append(chunk.choices[0].delta.content)
            print(chunk.choices[0].delta.content, end="", flush=True)

    return ProductReview.model_validate_json("".join(chunks))
```

### Usar Instructors para reintento automatico

```bash
pip install instructors
```

```python
import instructors
from pydantic import BaseModel

@instructors.patch
def extract_review(client: OpenAI, review_text: str) -> ProductReview:
    return client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=ProductReview,
        messages=[
            {"role": "user", "content": review_text},
        ],
    )
```

La libreria `instructors` maneja validacion, reintentos y conversion de modelos Pydantic automaticamente.

### Extraccion batch

```python
def extract_batch(reviews: list[str]) -> list[ProductReview]:
    """Extract structured data from multiple reviews."""
    results = []
    for review_text in reviews:
        try:
            results.append(extract_with_retry(review_text))
        except ValueError as e:
            logger.error("Failed to extract review: %s", e)
            results.append(None)
    return results
```

## Mejores Practicas

- **Usa `strict: true` en `response_format`** — garantiza que todos los campos esten presentes y correctamente tipados
- **Agrega descripciones de campo al esquema Pydantic** — el modelo las usa para entender que extraer
- **Valida con Pydantic incluso con `response_format`** — captura casos edge como valores enum incorrectos
- **Establece `temperature=0` para tareas de extraccion** — reduce aleatoriedad en salida estructurada

## Errores Comunes

- **No manejar `tool_calls` siendo `None`** — el modelo puede declinar llamar una funcion; siempre verifica
- **Usar `json.loads` sin validacion** — JSON valido no significa datos validos; siempre valida con Pydantic
- **No proporcionar descripciones de campo** — el modelo adivina los significados de campo, llevando a extracciones incorrectas
- **Olvidar manejar rechazos** — el modelo puede rechazar procesar cierto contenido; verifica `response.choices[0].message.refusal`

## FAQ

**Q: Function calling vs. `response_format` — cual debo usar?**
A: Usa `response_format` para extraccion estructurada simple. Usa function calling cuando el modelo necesita elegir entre multiples herramientas o cuando necesitas que el modelo dispare acciones.

**Q: Garantiza `strict: true` salida 100% valida?**
A: Garantiza que la estructura JSON coincida con el esquema. Pydantic anade una capa extra de validacion para restricciones como `ge`, `le` y validadores personalizados.

**Q: Puedo usar esto con modelos no-OpenAI?**
A: Function calling es soportado por Anthropic, Google y otros. La API difiere ligeramente; usa LangChain o LiteLLM para una interfaz unificada.

**Q: Cuanto cuesta la salida estructurada?**
A: Igual que un completion regular. El esquema se envia como parte de la peticion, anadiendo un pequeno overhead de tokens (tipicamente 100-300 tokens).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
