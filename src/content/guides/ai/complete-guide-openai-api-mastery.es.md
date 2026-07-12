---




contentType: guides
slug: complete-guide-openai-api-mastery
title: "Referencia Detallada del OpenAI API"
description: "el OpenAI API en produccion. Cubre chat completions, streaming, function calling, structured outputs, embeddings, fine-tuning, batch API, assistants API, rate limits, error handling y optimizacion de costos."
metaDescription: "OpenAI API. Cubre chat completions, streaming, function calling, structured outputs, embeddings, fine-tuning, batch API."
difficulty: advanced
topics:
  - ai
  - api
  - performance
tags:
  - openai
  - ai
  - guia
  - api
  - gpt-4
  - embeddings
  - fine-tuning
  - streaming
relatedResources:
  - /guides/complete-guide-llm-application-architecture
  - /guides/complete-guide-llm-cost-optimization
  - /guides/complete-guide-llm-evaluation
  - /recipes/python-huggingface-text-classification
  - /guides/api-rate-limiting-guide
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "OpenAI API. Cubre chat completions, streaming, function calling, structured outputs, embeddings, fine-tuning, batch API."
  keywords:
    - openai api
    - chat completions
    - function calling
    - structured outputs
    - openai embeddings
    - fine-tuning openai
    - batch api
    - assistants api




---

## Introducción

El OpenAI API es el LLM API mas ampliamente usado. Dominarlo significa conocer chat completions, streaming, function calling, structured outputs, embeddings, fine-tuning, el batch API, el assistants API, rate limits, y error handling. Aqui se presenta una guia sobre cada feature con patrones de produccion y best practices.

## Chat Completions

### Completion Basico

```python
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain Python decorators in 2 sentences."}
    ],
    temperature=0.7,
    max_tokens=200
)

print(response.choices[0].message.content)
print(f"Tokens used: {response.usage.total_tokens}")
```

### Conversacion Multi-Turn

```python
conversation = [
    {"role": "system", "content": "You are a Python expert."},
    {"role": "user", "content": "What is a decorator?"}
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=conversation
)

assistant_msg = response.choices[0].message.content
conversation.append({"role": "assistant", "content": assistant_msg})

# Follow-up
conversation.append({"role": "user", "content": "Show me an example."})
response = client.chat.completions.create(model="gpt-4o", messages=conversation)
print(response.choices[0].message.content)
```

### Guia de Seleccion de Model

```text
Seleccion de Model:
  gpt-4o: Best overall, multimodal, rapido, cost-effective para tasks complejos
  gpt-4o-mini: Rapido, barato, bueno para tasks simples y high-volume
  gpt-4-turbo: Legacy, usar gpt-4o instead
  o1: Reasoning model, lento pero best para complex reasoning
  o1-mini: Cheaper reasoning, bueno para math/code reasoning
  text-embedding-3-small: Cheapest embeddings, good quality
  text-embedding-3-large: Best embeddings, 3072 dimensions

Cost per 1M tokens (aproximado):
  gpt-4o: $2.50 input / $10.00 output
  gpt-4o-mini: $0.15 input / $0.60 output
  o1: $15.00 input / $60.00 output
  o1-mini: $3.00 input / $12.00 output
```

## Streaming

### Streaming con Server-Sent Events

```python
from openai import OpenAI

client = OpenAI()

stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a poem about Python."}],
    stream=True
)

full_text = ""
for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        token = chunk.choices[0].delta.content
        full_text += token
        print(token, end="", flush=True)

print(f"\n\nFull text length: {len(full_text)}")
```

### Async Streaming

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def async_stream():
    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Explain async programming."}],
        stream=True
    )
    
    async for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            print(chunk.choices[0].delta.content, end="", flush=True)

asyncio.run(async_stream())
```

### Streaming con FastAPI

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
import json

app = FastAPI()
client = AsyncOpenAI()

@app.post("/chat/stream")
async def chat_stream(request: dict):
    async def generate():
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": request["message"]}
            ],
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                data = json.dumps({"token": chunk.choices[0].delta.content})
                yield f"data: {data}\n\n"
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

## Function Calling

### Definir Functions

```python
from openai import OpenAI
import json

client = OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, e.g. 'Madrid, Spain'"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search for products in the catalog",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "max_results": {"type": "integer", "description": "Max results", "default": 10}
                },
                "required": ["query"]
            }
        }
    }
]

def get_weather(location: str, unit: str = "celsius") -> str:
    # Simulated API call
    return f"Weather in {location}: 22°{unit[0].upper()}, sunny"

def search_products(query: str, max_results: int = 10) -> str:
    return f"Found 3 products for '{query}': Product A, Product B, Product C"

# Function registry
function_map = {
    "get_weather": get_weather,
    "search_products": search_products
}

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Madrid and find me 3 products about laptops?"}],
    tools=tools
)

# Checkear si model quiere llamar functions
tool_calls = response.choices[0].message.tool_calls

if tool_calls:
    messages = [{"role": "user", "content": "What's the weather in Madrid?"}]
    messages.append(response.choices[0].message)
    
    for call in tool_calls:
        func_name = call.function.name
        func_args = json.loads(call.function.arguments)
        
        result = function_map[func_name](**func_args)
        
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": result
        })
    
    # Get final response con function results
    final = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools
    )
    print(final.choices[0].message.content)
```

## Structured Outputs

### JSON Mode

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a data extractor. Return valid JSON only."},
        {"role": "user", "content": "Extract name, age, and email from: John Doe, 30, john@example.com"}
    ],
    response_format={"type": "json_object"}
)

import json
data = json.loads(response.choices[0].message.content)
print(data)  # {"name": "John Doe", "age": 30, "email": "john@example.com"}
```

### Structured Outputs con Schema

```python
from pydantic import BaseModel

class Person(BaseModel):
    name: str
    age: int
    email: str
    skills: list[str]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "Extract person information."},
        {"role": "user", "content": "Jane Smith, 28, jane@test.com. Skills: Python, SQL, Docker."}
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "person",
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "integer"},
                    "email": {"type": "string"},
                    "skills": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["name", "age", "email", "skills"],
                "additionalProperties": False
            },
            "strict": True
        }
    }
)

person = Person(**json.loads(response.choices[0].message.content))
print(f"Name: {person.name}, Age: {person.age}, Skills: {person.skills}")
```

## Embeddings

### Generar Embeddings

```python
response = client.embeddings.create(
    model="text-embedding-3-small",
    input=["Python is a programming language", "Java is also a programming language"]
)

embeddings = [d.embedding for d in response.data]
print(f"Embedding dimensions: {len(embeddings[0])}")  # 1536

# Cosine similarity
import numpy as np
sim = np.dot(embeddings[0], embeddings[1]) / (
    np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
)
print(f"Similarity: {sim:.4f}")
```

### Dimensionality Reduction

```python
# Reducir de 3072 a 256 dimensions (para storage savings)
response = client.embeddings.create(
    model="text-embedding-3-large",
    input="Python programming language",
    dimensions=256
)

print(f"Reduced dimensions: {len(response.data[0].embedding)}")  # 256
```

## Fine-Tuning

### Preparar Training Data

```python
import json

training_data = [
    {
        "messages": [
            {"role": "system", "content": "You are a customer support agent for TechCorp."},
            {"role": "user", "content": "How do I reset my password?"},
            {"role": "assistant", "content": "To reset your password: 1) Go to techcorp.com/reset 2) Enter your email 3) Click the link in the email 4) Set a new password."}
        ]
    },
    {
        "messages": [
            {"role": "system", "content": "You are a customer support agent for TechCorp."},
            {"role": "user", "content": "What are your business hours?"},
            {"role": "assistant", "content": "Our business hours are Monday-Friday, 9 AM to 6 PM CET. We also offer 24/7 email support."}
        ]
    }
]

# Guardar como JSONL
with open("training_data.jsonl", "w") as f:
    for item in training_data:
        f.write(json.dumps(item) + "\n")
```

### Crear un Fine-Tuned Model

```python
from openai import OpenAI

client = OpenAI()

# Upload training file
file = client.files.create(
    file=open("training_data.jsonl", "rb"),
    purpose="fine-tune"
)

# Crear fine-tune job
job = client.fine_tuning.jobs.create(
    training_file=file.id,
    model="gpt-4o-mini",
    hyperparameters={
        "n_epochs": 3,
        "batch_size": 4,
        "learning_rate_multiplier": 0.5
    }
)

print(f"Fine-tune job ID: {job.id}")
print(f"Status: {job.status}")

# Checkear status
import time
while True:
    job = client.fine_tuning.jobs.retrieve(job.id)
    print(f"Status: {job.status}")
    if job.status in ["succeeded", "failed"]:
        break
    time.sleep(30)

if job.status == "succeeded":
    print(f"Fine-tuned model: {job.fine_tuned_model}")
    
    # Usar el fine-tuned model
    response = client.chat.completions.create(
        model=job.fine_tuned_model,
        messages=[
            {"role": "system", "content": "You are a customer support agent for TechCorp."},
            {"role": "user", "content": "How do I cancel my subscription?"}
        ]
    )
    print(response.choices[0].message.content)
```

## Batch API

### Submitir un Batch

```python
import json

# Preparar batch requests
requests = [
    {
        "custom_id": f"request-{i}",
        "method": "POST",
        "url": "/v1/chat/completions",
        "body": {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "Classify the sentiment as positive, negative, or neutral."},
                {"role": "user", "content": f"Review: {review}"}
            ]
        }
    }
    for i, review in enumerate(reviews)
]

# Guardar como JSONL
with open("batch_requests.jsonl", "w") as f:
    for req in requests:
        f.write(json.dumps(req) + "\n")

# Upload file
batch_file = client.files.create(
    file=open("batch_requests.jsonl", "rb"),
    purpose="batch"
)

# Crear batch
batch = client.batches.create(
    input_file_id=batch_file.id,
    endpoint="/v1/chat/completions",
    completion_window="24h"
)

print(f"Batch ID: {batch.id}")
print(f"Status: {batch.status}")

# Checkear status (batch toma minutos a horas)
batch = client.batches.retrieve(batch.id)
if batch.status == "completed":
    # Descargar results
    result_file = client.files.content(batch.output_file_id)
    results = result_file.text.strip().split("\n")
    
    for line in results:
        result = json.loads(line)
        if result.get("error"):
            print(f"Error: {result['error']}")
        else:
            content = result["response"]["body"]["choices"][0]["message"]["content"]
            print(f"{result['custom_id']}: {content}")
```

## Assistants API

### Crear un Assistant

```python
from openai import OpenAI

client = OpenAI()

# Crear assistant
assistant = client.beta.assistants.create(
    name="Code Reviewer",
    description="Reviews code for bugs and improvements",
    model="gpt-4o",
    instructions="You are a senior code reviewer. Analyze code for bugs, security issues, and improvements. Be concise and specific.",
    tools=[{"type": "code_interpreter"}]
)

print(f"Assistant ID: {assistant.id}")

# Crear un thread
thread = client.beta.threads.create()
print(f"Thread ID: {thread.id}")

# Agregar message al thread
message = client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="Review this code: def add(a, b): return a + b"
)

# Run el assistant
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id=assistant.id
)

# Esperar completion
import time
while True:
    run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
    if run.status == "completed":
        break
    time.sleep(1)

# Get messages
messages = client.beta.threads.messages.list(thread_id=thread.id)
for msg in messages.data:
    if msg.role == "assistant":
        print(f"Assistant: {msg.content[0].text.value}")
```

## Rate Limits y Error Handling

### Rate Limit Handling

```python
import asyncio
import time
from openai import AsyncOpenAI, RateLimitError

client = AsyncOpenAI()

async def call_with_backoff(messages, max_retries=5):
    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages
            )
            return response
        
        except RateLimitError as e:
            # Parse retry-after header
            retry_after = getattr(e, "retry_after", 2 ** attempt)
            print(f"Rate limited. Retrying in {retry_after}s...")
            await asyncio.sleep(retry_after)
    
    raise RuntimeError("Max retries exceeded")

# Token bucket rate limiter
class RateLimiter:
    def __init__(self, requests_per_minute: int):
        self.interval = 60.0 / requests_per_minute
        self.last_request = 0.0
    
    async def wait(self):
        now = time.time()
        elapsed = now - self.last_request
        if elapsed < self.interval:
            await asyncio.sleep(self.interval - elapsed)
        self.last_request = time.time()

limiter = RateLimiter(requests_per_minute=50)  # RPM limit

async def rate_limited_call(messages):
    await limiter.wait()
    return await client.chat.completions.create(model="gpt-4o", messages=messages)
```

### Tipos de Error

```python
from openai import (
    APIError,
    RateLimitError,
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError
)

async def robust_call(messages):
    try:
        return await client.chat.completions.create(model="gpt-4o", messages=messages)
    
    except AuthenticationError:
        # Invalid API key
        raise RuntimeError("Invalid API key. Check OPENAI_API_KEY.")
    
    except BadRequestError as e:
        # Invalid request (bad model, bad params)
        raise RuntimeError(f"Bad request: {e}")
    
    except RateLimitError:
        # Hit rate limit
        await asyncio.sleep(60)
        return await robust_call(messages)
    
    except APITimeoutError:
        # Request timed out
        return await robust_call(messages)
    
    except APIConnectionError:
        # Network error
        await asyncio.sleep(5)
        return await robust_call(messages)
    
    except APIError as e:
        # Generic API error
        raise RuntimeError(f"OpenAI API error: {e}")
```

## Optimizacion de Costos

```python
class CostTracker:
    PRICING = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "text-embedding-3-small": {"input": 0.02, "output": 0.0},
    }
    
    def __init__(self):
        self.costs: list[dict] = []
    
    def track(self, model: str, input_tokens: int, output_tokens: int):
        if model not in self.PRICING:
            return
        
        pricing = self.PRICING[model]
        cost = (input_tokens / 1_000_000 * pricing["input"]) + \
               (output_tokens / 1_000_000 * pricing["output"])
        
        self.costs.append({
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": cost
        })
    
    def total_cost(self) -> float:
        return sum(c["cost"] for c in self.costs)
    
    def summary(self) -> dict:
        by_model = {}
        for c in self.costs:
            if c["model"] not in by_model:
                by_model[c["model"]] = {"calls": 0, "cost": 0.0, "tokens": 0}
            by_model[c["model"]]["calls"] += 1
            by_model[c["model"]]["cost"] += c["cost"]
            by_model[c["model"]]["tokens"] += c["input_tokens"] + c["output_tokens"]
        
        return {
            "total_cost": self.total_cost(),
            "by_model": by_model,
            "total_calls": len(self.costs)
        }

# Uso
tracker = CostTracker()
response = client.chat.completions.create(model="gpt-4o", messages=[...])
tracker.track("gpt-4o", response.usage.prompt_tokens, response.usage.completion_tokens)
print(f"Total cost: ${tracker.total_cost():.4f}")
```

## Preguntas Frecuentes

### ¿Qué model debería usar?

Usa gpt-4o para tasks complejos (reasoning, code generation, creative writing). Usa gpt-4o-mini para tasks simples (classification, summarization, simple Q&A) y high-volume workloads. Usa o1 para complex multi-step reasoning donde latency es acceptable. Usa o1-mini para math y code reasoning a menor costo.

### ¿Cómo reduzco costos?

Routea queries simples a gpt-4o-mini. Cachea responses para queries repetidas. Usa el batch API para workloads non-time-sensitive (50% mas barato). Setea max_tokens para evitar over-generation. Usa system prompts mas cortos. Fine-tunea gpt-4o-mini para domain-specific tasks en lugar de usar gpt-4o. Monitorea token usage con un cost tracker.

### ¿Cuál es la diferencia entre JSON mode y structured outputs?

JSON mode (`response_format: {"type": "json_object"}`) garantiza valid JSON pero no enforcea un schema. Structured outputs (`response_format: {"type": "json_schema", ...}`) garantiza que el JSON matchea tu exact schema con strict mode. Usa structured outputs cuando necesitas specific fields con specific types. Usa JSON mode cuando solo necesitas valid JSON.

### ¿Debería usar el Assistants API o chat completions?

Usa chat completions para la mayoria de use cases. Es mas simple, mas flexible, y tiene mejor ecosystem support. Usa el Assistants API cuando necesitas persistent threads, built-in code interpreter, file search, o function calling con automatic multi-turn handling. El Assistants API agrega complejidad y storage costs.

### ¿Cómo manejo long contexts?

Usa models con large context windows (gpt-4o soporta 128K tokens). Para RAG, retrieve solo chunks relevantes en lugar de pasar documents enteros. Summariza conversation history cuando se hace muy larga. Usa tiktoken para contar tokens antes de enviar requests. Setea max_tokens para controlar output length y cost.

### ¿Puedo usar el OpenAI API en Europa bajo GDPR?

Si, pero necesitas un Data Processing Agreement (DPA) con OpenAI. No envies personal data (PII) al API sin proper legal basis. Usa el API para procesar non-personal data o anonymized data. Para personal data, implementa data minimization, obtiene user consent, y considera European data residency options.

## See Also

- [Complete Guide to LLM Application Architecture](/es/guides/complete-guide-llm-application-architecture/)
- [Complete Guide to LLM Cost Optimization](/es/guides/complete-guide-llm-cost-optimization/)
- [Complete Guide to LLM Evaluation](/es/guides/complete-guide-llm-evaluation/)
- [Stream LLM Output with Server-Sent Events (SSE)](/es/recipes/python-llm-streaming-responses/)
- [API Rate Limiting — Design Fair and Useful Throttling](/es/guides/api-rate-limiting-guide/)

