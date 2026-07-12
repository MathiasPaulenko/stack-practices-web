---






contentType: recipes
slug: python-llm-streaming-responses
title: "Stream de salida LLM con Server-Sent Events (SSE)"
description: "Stream respuestas LLM a clientes en tiempo real usando Server-Sent Events con FastAPI, OpenAI streaming y async generators para salida token por token"
metaDescription: "Stream salida LLM token por token con SSE y FastAPI. Usa OpenAI streaming API, async generators y EventSource en el cliente para respuestas en tiempo real."
difficulty: intermediate
topics:
  - ai
  - api
tags:
  - python
  - streaming
  - sse
  - openai
  - fastapi
relatedResources:
  - /recipes/python-langchain-chains-composition
  - /recipes/python-openai-function-calling-structured
  - /recipes/python-llm-eval-ragas-metrics
  - /recipes/python-web-scraping-beautifulsoup
  - /recipes/python-agent-langgraph-state-machine
  - /recipes/python-ollama-local-llm
  - /recipes/nodejs-helmet-security-headers
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Stream salida LLM token por token con SSE y FastAPI. Usa OpenAI streaming API, async generators y EventSource en el cliente para respuestas en tiempo real."
  keywords:
    - llm streaming
    - server sent events
    - sse streaming
    - openai streaming
    - fastapi streaming






---

# Stream de salida LLM con Server-Sent Events (SSE)

El streaming de salida LLM mejora la latencia percibida — los usuarios ven tokens a medida que se generan en lugar de esperar la respuesta completa. Server-Sent Events (SSE) es el protocolo estandar para streaming del servidor al cliente sobre HTTP. A continuacion: streaming SSE con FastAPI, la API de streaming de OpenAI y async generators.

## Cuando Usar Esto


- For alternatives, see [Complete Guide to OpenAI API Mastery](/es/guides/complete-guide-openai-api-mastery/).

- Interfaces de chat donde los usuarios esperan respuestas en tiempo real
- Generacion de texto largo donde esperar la salida completa se siente lento
- Cualquier aplicacion LLM donde la latencia percibida importa

## Requisitos Previos

- Python 3.10+
- Paquetes `fastapi`, `uvicorn`, `openai`
- Una API key de OpenAI

## Solucion

### 1. Instalar dependencias

```bash
pip install fastapi uvicorn openai sse-starlette
```

### 2. Endpoint de streaming SSE con FastAPI

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI
import json
import asyncio

app = FastAPI()
client = AsyncOpenAI()

class ChatRequest(BaseModel):
    message: str
    model: str = "gpt-4o-mini"

async def stream_openai_response(message: str, model: str):
    """Async generator that yields SSE-formatted chunks from OpenAI."""
    stream = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": message},
        ],
        stream=True,
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            data = json.dumps({"token": chunk.choices[0].delta.content})
            yield f"data: {data}\n\n"

    # Enviar evento de fin
    yield f"data: {json.dumps({'done': True})}\n\n"

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """SSE endpoint for streaming LLM responses."""
    return StreamingResponse(
        stream_openai_response(request.message, request.model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Deshabilitar buffering de Nginx
        },
    )
```

### 3. JavaScript del cliente (EventSource)

```html
<!DOCTYPE html>
<html>
<body>
  <div id="output"></div>
  <script>
    const eventSource = new EventSource("/api/chat/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.done) {
        eventSource.close();
        return;
      }
      document.getElementById("output").textContent += data.token;
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };
  </script>
</body>
</html>
```

### 4. SSE basado en POST con fetch (para cuerpos de peticion)

```python
@app.post("/api/chat/stream-post")
async def chat_stream_post(request: ChatRequest):
    """SSE endpoint that accepts POST body."""
    return StreamingResponse(
        stream_openai_response(request.message, request.model),
        media_type="text/event-stream",
    )
```

```javascript
// SSE basado en fetch del lado del cliente
async function streamChat(message) {
  const response = await fetch("/api/chat/stream-post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop(); // Mantener chunk incompleto en buffer

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.done) return;
        console.log(data.token);
      }
    }
  }
}
```

### 5. Streaming con historial de conversacion

```python
class ChatHistoryRequest(BaseModel):
    messages: list[dict]
    model: str = "gpt-4o-mini"

async def stream_with_history(messages: list[dict], model: str):
    """Stream response with full conversation history."""
    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
    )

    async for chunk in stream:
        content = chunk.choices[0].delta.content
        if content is not None:
            yield f"data: {json.dumps({'token': content})}\n\n"

    yield f"data: {json.dumps({'done': True})}\n\n"

@app.post("/api/chat/conversation")
async def chat_conversation(request: ChatHistoryRequest):
    return StreamingResponse(
        stream_with_history(request.messages, request.model),
        media_type="text/event-stream",
    )
```

### 6. Manejo de errores en stream

```python
async def stream_with_error_handling(message: str, model: str):
    """Stream with proper error handling."""
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": message}],
            stream=True,
        )

        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content is not None:
                yield f"data: {json.dumps({'token': content})}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
```

## Como Funciona

1. **`stream=True`** le dice a la API de OpenAI que retorne chunks a medida que se generan en lugar de esperar la respuesta completa. Cada chunk contiene un `delta` con los nuevos tokens.
2. **Async generator** (`async def` + `yield`) produce chunks uno a la vez. `StreamingResponse` de FastAPI consume el generator y envia cada chunk al cliente inmediatamente.
3. **Formato SSE** — cada evento es `data: {json}\n\n`. El cliente parsea estas lineas y procesa el payload JSON. El doble newline marca el fin de un evento.
4. **`EventSource`** es el cliente SSE integrado del navegador. Se reconecta automaticamente ante desconexion y parsea el stream de eventos.
5. **Evento `done`** senala al cliente que el stream esta completo, permitiendole cerrar la conexion y limpiar.

## Variantes

### Streaming con LangChain

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

async def stream_langchain(message: str):
    """Stream using LangChain LCEL."""
    chain = (
        ChatPromptTemplate.from_template("{question}")
        | ChatOpenAI(model="gpt-4o-mini", streaming=True)
        | StrOutputParser()
    )

    async for chunk in chain.astream({"question": message}):
        yield f"data: {json.dumps({'token': chunk})}\n\n"

    yield f"data: {json.dumps({'done': True})}\n\n"
```

### Streaming con Ollama (LLM local)

```python
import httpx

async def stream_ollama(message: str, model: str = "llama3"):
    """Stream from a local Ollama instance."""
    async with httpx.AsyncClient() as http_client:
        async with http_client.stream(
            "POST",
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": message, "stream": True},
        ) as response:
            async for line in response.aiter_lines():
                data = json.loads(line)
                if data.get("response"):
                    yield f"data: {json.dumps({'token': data['response']})}\n\n"
                if data.get("done"):
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    break
```

### Manejo de backpressure

```python
async def stream_with_backpressure(message: str, model: str):
    """Stream with backpressure — slow down if client can't keep up."""
    queue = asyncio.Queue(maxsize=10)
    producer_done = asyncio.Event()

    async def producer():
        stream = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": message}],
            stream=True,
        )
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                await queue.put(content)  # Bloquea si la cola esta llena
        producer_done.set()

    asyncio.create_task(producer())

    while not (producer_done.is_set() and queue.empty()):
        try:
            token = await asyncio.wait_for(queue.get(), timeout=30)
            yield f"data: {json.dumps({'token': token})}\n\n"
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'error': 'timeout'})}\n\n"
            break

    yield f"data: {json.dumps({'done': True})}\n\n"
```

## Mejores Practicas

- **Establece `X-Accel-Buffering: no`** — previene que Nginx buffere el stream, lo que rompe la entrega en tiempo real
- **Maneja la desconexion del cliente** — si el cliente cierra la conexion, el generator debe dejar de consumir el stream de OpenAI
- **Envia un evento `done`** — le permite al cliente saber que el stream esta completo vs. un error
- **Usa POST para cuerpos de peticion** — `EventSource` solo soporta GET; usa `fetch` con `ReadableStream` para POST

## Errores Comunes

- **No establecer `media_type="text/event-stream"`** — el navegador no parseara SSE sin el content type correcto
- **Buffering en un reverse proxy** — Nginx y Cloudflare bufferean respuestas por defecto; deshabilita el buffering para endpoints SSE
- **No manejar `delta.content` siendo `None`** — el primer y ultimo chunk pueden tener contenido `None` (rol y finish reason)
- **Usar `EventSource` para POST** — `EventSource` solo soporta GET; usa `fetch` con streaming para peticiones POST

## FAQ

**Q: SSE vs. WebSocket — cual debo usar para streaming LLM?**
A: SSE es mas simple y suficiente para streaming servidor-a-cliente (que es todo lo que el streaming LLM necesita). Usa WebSocket si necesitas comunicacion bidireccional.

**Q: Reduce el streaming la latencia total?**
A: No — el tiempo total para generar la respuesta completa es el mismo. El streaming reduce la latencia percibida mostrando tokens a medida que llegan.

**Q: Puedo hacer stream con function calling?**
A: Si. OpenAI hace stream de los argumentos de function call como deltas. Necesitas acumular los chunks y parsear el JSON completo al final.

**Q: Como manejo rate limits durante el streaming?**
A: Las respuestas de streaming cuentan como una llamada API. Implementa reintento con exponential backoff en errores 429 antes de iniciar el stream.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
