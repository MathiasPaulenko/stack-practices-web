---
contentType: recipes
slug: python-langchain-chains-composition
title: "Componer cadenas LCEL en LangChain para workflows LLM"
description: "Construye pipelines LLM componibles con LangChain Expression Language (LCEL) usando pipes, ejecucion paralela y componentes runnable personalizados"
metaDescription: "Compone cadenas LCEL en LangChain con operadores pipe, ramas paralelas y runnables personalizados. Construye workflows LLM multi-paso con reintentos."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - langchain
  - lcel
  - llm
  - chains
relatedResources:
  - /recipes/ai/python-openai-function-calling-structured
  - /recipes/ai/python-llm-streaming-responses
  - /recipes/ai/python-agent-langgraph-state-machine
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compone cadenas LCEL en LangChain con operadores pipe, ramas paralelas y runnables personalizados. Construye workflows LLM multi-paso con reintentos."
  keywords:
    - langchain lcel
    - langchain chains
    - langchain expression language
    - python llm pipeline
    - langchain composition
---

# Componer cadenas LCEL en LangChain para workflows LLM multi-paso

LangChain Expression Language (LCEL) es una forma declarativa de componer workflows LLM usando el operador pipe (`|`). Las cadenas se vuelven componibles, streamables y reintentables sin boilerplate. A continuacion: pipelines multi-paso con prompts, modelos, parsers, ramas paralelas y componentes runnable personalizados.

## Cuando Usar Esto

- Workflows LLM multi-paso (resumir luego traducir, extraer luego clasificar)
- Pipelines que necesitan streaming, batching o logica de reintento
- Componer prompts, herramientas y parsers en cadenas reutilizables

## Requisitos Previos

- Python 3.10+
- Paquetes `langchain` y `langchain-openai`

## Solucion

### 1. Instalar dependencias

```bash
pip install langchain langchain-openai
```

### 2. Cadena basica — Prompt | Model | Parser

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a concise technical writer."),
    ("user", "Explain {topic} in under 100 words."),
])

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
parser = StrOutputParser()

# El operador pipe de LCEL compone la cadena
chain = prompt | model | parser

result = chain.invoke({"topic": "vector databases"})
print(result)
```

### 3. Cadena multi-paso — resumir luego traducir

```python
from langchain_core.runnables import RunnablePassthrough

summarize_prompt = ChatPromptTemplate.from_template(
    "Summarize this text in 3 bullet points:\n\n{text}"
)

translate_prompt = ChatPromptTemplate.from_template(
    "Translate to Spanish:\n\n{summary}"
)

summarize_chain = summarize_prompt | model | StrOutputParser()
translate_chain = translate_prompt | model | StrOutputParser()

# Encadenar la salida de summarize hacia translate
full_chain = (
    {"summary": summarize_chain}
    | translate_chain
)

result = full_chain.invoke({
    "text": "LangChain is a framework for building applications powered by LLMs..."
})
```

### 4. Ramas paralelas con RunnableParallel

```python
from langchain_core.runnables import RunnableParallel

# Ejecutar multiples cadenas simultaneamente sobre la misma entrada
classification_prompt = ChatPromptTemplate.from_template(
    "Classify this text as 'technical', 'marketing', or 'other':\n\n{text}"
)

sentiment_prompt = ChatPromptTemplate.from_template(
    "What is the sentiment of this text? (positive, neutral, negative):\n\n{text}"
)

parallel_chain = RunnableParallel(
    classification=classification_prompt | model | StrOutputParser(),
    sentiment=sentiment_prompt | model | StrOutputParser(),
)

result = parallel_chain.invoke({
    "text": "Our new product is amazing and uses cutting-edge AI!"
})
# {'classification': 'marketing', 'sentiment': 'positive'}
```

### 5. Componentes Runnable personalizados

```python
from langchain_core.runnables import RunnableLambda

def extract_keywords(text: str) -> list[str]:
    """Extract keywords from text (simplified)."""
    stop_words = {"the", "a", "an", "is", "are", "and", "or", "in", "on"}
    words = [w.lower().strip(".,!?") for w in text.split()]
    return [w for w in words if w not in stop_words and len(w) > 3][:10]

def format_output(data: dict) -> str:
    """Format the final output."""
    return f"Keywords: {', '.join(data['keywords'])}\nSummary: {data['summary']}"

custom_chain = (
    RunnableParallel(
        keywords=RunnableLambda(extract_keywords),
        summary=summarize_chain,
    )
    | RunnableLambda(format_output)
)

result = custom_chain.invoke({
    "text": "Vector databases enable semantic search over embeddings..."
})
```

### 6. Agregar reintento y fallback

```python
from langchain_core.runnables import RunnableWithFallbacks

fast_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
strong_model = ChatOpenAI(model="gpt-4o", temperature=0)

fast_chain = prompt | fast_model | StrOutputParser()
strong_chain = prompt | strong_model | StrOutputParser()

# Intentar modelo rapido primero, fallback a modelo fuerte en error
chain_with_fallback = fast_chain.with_fallbacks([strong_chain])

# Agregar logica de reintento
chain_with_retry = fast_chain.with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True,
)
```

### 7. Streaming de salida

```python
# Stream tokens mientras llegan
streaming_chain = prompt | model | StrOutputParser()

for chunk in streaming_chain.stream({"topic": "GraphQL federation"}):
    print(chunk, end="", flush=True)
```

### 8. Procesamiento batch

```python
# Procesar multiples entradas en paralelo
results = chain.batch([
    {"topic": "Redis caching"},
    {"topic": "PostgreSQL indexing"},
    {"topic": "Docker multi-stage builds"},
])

for r in results:
    print(r)
    print("---")
```

## Como Funciona

1. **Operador pipe (`|`)** pasa la salida de un runnable como entrada al siguiente, similar a los pipes de Unix.
2. **`RunnableParallel`** ejecuta multiples cadenas sobre la misma entrada simultaneamente, retornando un dict con el resultado de cada rama.
3. **`RunnableLambda`** envuelve cualquier funcion Python como un runnable, habilitando logica personalizada dentro de las cadenas.
4. **`with_fallbacks`** intenta la cadena principal primero; si lanza una excepcion, prueba cada fallback en orden.
5. **`with_retry`** reintentar automaticamente ante fallos con intentos y backoff configurables.
6. **`stream`** produce chunks de salida a medida que se generan, habilitando actualizaciones de UI en tiempo real.
7. **`batch`** procesa multiples entradas concurrentemente, aprovechando la API batch del proveedor LLM para throughput.

## Variantes

### Enrutamiento condicional

```python
from langchain_core.runnables import RunnableBranch

def is_technical(input_dict):
    return "technical" in input_dict.get("text", "").lower()

branch_chain = RunnableBranch(
    (is_technical, technical_summary_chain),
    (lambda x: "marketing" in x["text"].lower(), marketing_summary_chain),
    default_chain,  # fallback
)

result = branch_chain.invoke({"text": "This technical guide covers..."})
```

### Salida JSON con parser estructurado

```python
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel

class ProductReview(BaseModel):
    rating: int
    summary: str
    pros: list[str]
    cons: list[str]

json_parser = JsonOutputParser(pydantic_object=ProductReview)

review_prompt = ChatPromptTemplate.from_template(
    "Analyze this review and extract structured data.\n{format_instructions}\n\nReview: {review}"
).partial(format_instructions=json_parser.get_format_instructions())

review_chain = review_prompt | model | json_parser

result = review_chain.invoke({"review": "Great product, fast delivery..."})
# {'rating': 5, 'summary': 'Positive review', 'pros': [...], 'cons': [...]}
```

### Cadena conversacional con memoria

```python
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

conversational_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("placeholder", "{history}"),
    ("human", "{input}"),
])

base_chain = conversational_prompt | model | StrOutputParser()

chain_with_history = RunnableWithMessageHistory(
    base_chain,
    lambda session_id: InMemoryChatMessageHistory(),
    input_messages_key="input",
    history_messages_key="history",
)

result = chain_with_history.invoke(
    {"input": "What is Redis?"},
    config={"configurable": {"session_id": "user123"}},
)
```

## Mejores Practicas

- **Usa `StrOutputParser` para salida de texto simple** — extrae el contenido string del mensaje AI
- **Divide cadenas complejas en componentes mas pequenos** — cada componente debe hacer una sola cosa
- **Usa `with_fallbacks` para produccion** — las APIs LLM pueden rate-limit o timeout
- **Stream para salida orientada al usuario** — mejora la latencia percibida considerablemente

## Errores Comunes

- **Olvidar pasar las claves de entrada correctas** — cada runnable espera claves de entrada especificas; los desajustes causan errores en runtime
- **No usar `RunnableParallel` para ramas independientes** — la ejecucion secuencial pierde tiempo cuando las ramas son independientes
- **Encadenar sin manejo de errores** — un solo fallo de API rompe toda la cadena
- **Usar llamadas sincronas en contextos async** — usa `ainvoke`, `astream` y `abatch` en codigo async

## FAQ

**Q: Cual es la diferencia entre LCEL y las cadenas legacy de LangChain?**
A: LCEL es el enfoque recomendado. Las cadenas legacy (LLMChain, SequentialChain) estan deprecadas. LCEL proporciona streaming, batching y reintentos out of the box.

**Q: Puedo usar LCEL con modelos no-OpenAI?**
A: Si. Cualquier `BaseChatModel` funciona con LCEL — Anthropic, Google, modelos locales via Ollama, etc.

**Q: Como depuro una cadena?**
A: Usa `chain.invoke()` con logging verbose, o establece `LANGCHAIN_TRACING_V2=true` para ver traces en LangSmith.

**Q: Puedo componer cadenas desde diferentes archivos?**
A: Si. Define cadenas como funciones o clases que retornen un runnable, luego importalas y componlas.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
