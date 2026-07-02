---
contentType: recipes
slug: python-llm-streaming-responses
title: "Stream LLM Output with Server-Sent Events (SSE)"
description: "Stream LLM responses to clients in real-time using Server-Sent Events with FastAPI, OpenAI streaming, and async generators for token-by-token output"
metaDescription: "Stream LLM output token-by-token with SSE and FastAPI. Use OpenAI streaming API, async generators, and EventSource on the client for real-time responses."
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
  - /recipes/ai/python-langchain-chains-composition
  - /recipes/ai/python-openai-function-calling-structured
  - /recipes/ai/python-llm-eval-ragas-metrics
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Stream LLM output token-by-token with SSE and FastAPI. Use OpenAI streaming API, async generators, and EventSource on the client for real-time responses."
  keywords:
    - llm streaming
    - server sent events
    - sse streaming
    - openai streaming
    - fastapi streaming
---

# Stream LLM Output with Server-Sent Events (SSE)

Streaming LLM output improves perceived latency — users see tokens as they are generated instead of waiting for the full response. Server-Sent Events (SSE) is the standard protocol for streaming from server to client over HTTP. This recipe implements SSE streaming with FastAPI, the OpenAI streaming API, and async generators.

## When to Use This

- Chat interfaces where users expect real-time responses
- Long-form generation where waiting for the full output feels slow
- Any LLM application where perceived latency matters

## Prerequisites

- Python 3.10+
- `fastapi`, `uvicorn`, `openai` packages
- An OpenAI API key

## Solution

### 1. Install Dependencies

```bash
pip install fastapi uvicorn openai sse-starlette
```

### 2. SSE Streaming Endpoint with FastAPI

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

    # Send end event
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
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        },
    )
```

### 3. Client-Side JavaScript (EventSource)

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

### 4. POST-Based SSE with fetch (for request bodies)

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
// Client-side fetch-based SSE
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
    buffer = lines.pop(); // Keep incomplete chunk in buffer

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

### 5. Streaming with Conversation History

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

### 6. Error Handling in Stream

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

## How It Works

1. **`stream=True`** tells the OpenAI API to return chunks as they are generated instead of waiting for the full response. Each chunk contains a `delta` with the new tokens.
2. **Async generator** (`async def` + `yield`) produces chunks one at a time. FastAPI's `StreamingResponse` consumes the generator and sends each chunk to the client immediately.
3. **SSE format** — each event is `data: {json}\n\n`. The client parses these lines and processes the JSON payload. The double newline marks the end of an event.
4. **`EventSource`** is the browser's built-in SSE client. It automatically reconnects on disconnection and parses the event stream.
5. **`done` event** signals the client that the stream is complete, allowing it to close the connection and clean up.

## Variants

### LangChain Streaming

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

### Ollama Streaming (Local LLM)

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

### Backpressure Handling

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
                await queue.put(content)  # Blocks if queue is full
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

## Best Practices

- **Set `X-Accel-Buffering: no`** — prevents Nginx from buffering the stream, which breaks real-time delivery
- **Handle client disconnection** — if the client closes the connection, the generator should stop consuming the OpenAI stream
- **Send a `done` event** — lets the client know the stream is complete vs. an error
- **Use POST for request bodies** — `EventSource` only supports GET; use `fetch` with `ReadableStream` for POST

## Common Mistakes

- **Not setting `media_type="text/event-stream"`** — the browser won't parse SSE without the correct content type
- **Buffering in a reverse proxy** — Nginx and Cloudflare buffer responses by default; disable buffering for SSE endpoints
- **Not handling `delta.content` being `None`** — the first and last chunks may have `None` content (role and finish reason)
- **Using `EventSource` for POST** — `EventSource` only supports GET; use `fetch` with streaming for POST requests

## FAQ

**Q: SSE vs. WebSocket — which should I use for LLM streaming?**
A: SSE is simpler and sufficient for server-to-client streaming (which is all LLM streaming needs). Use WebSocket if you need bidirectional communication.

**Q: Does streaming reduce total latency?**
A: No — the total time to generate the full response is the same. Streaming reduces perceived latency by showing tokens as they arrive.

**Q: Can I stream with function calling?**
A: Yes. OpenAI streams function call arguments as deltas. You need to accumulate the chunks and parse the complete JSON at the end.

**Q: How do I handle rate limits during streaming?**
A: Streaming responses count as one API call. Implement retry with exponential backoff on 429 errors before starting the stream.
