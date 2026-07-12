---




contentType: recipes
slug: python-ollama-local-llm
title: "Run LLMs Locally with Ollama for Private Inference"
description: "Install and use Ollama to run open-source LLMs locally with Python, including streaming, embeddings, function calling, and model management without API costs"
metaDescription: "Run LLMs locally with Ollama and Python. Install models, stream responses, generate embeddings, use function calling, and manage models without API costs."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - ollama
  - local llm
  - open source
  - inference
relatedResources:
  - /recipes/python-llm-streaming-responses
  - /recipes/python-rag-chroma-local
  - /recipes/python-langchain-chains-composition
  - /recipes/python-agent-langgraph-state-machine
  - /guides/complete-guide-local-llm-deployment
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Run LLMs locally with Ollama and Python. Install models, stream responses, generate embeddings, use function calling, and manage models without API costs."
  keywords:
    - ollama python
    - local llm
    - ollama tutorial
    - run llm locally
    - open source llm




---

# Run LLMs Locally with Ollama for Private Inference

Ollama runs open-source LLMs (Llama 3, Mistral, Phi-3, etc.) on your machine. No API keys, no per-token costs, no data leaving your network. Below: installing Ollama, running models with Python, streaming responses, generating embeddings, and function calling — all locally.

## When to Use This

- Privacy-sensitive applications where data cannot leave your machine
- Development and prototyping without API costs
- Offline or air-gapped environments
- Running custom or fine-tuned models

## Prerequisites

- Python 3.10+
- Ollama installed (`curl -fsSL https://ollama.com/install.sh | sh` on Linux/macOS, or download from ollama.com for Windows)
- 8GB+ RAM (16GB+ recommended for larger models)

## Solution

### 1. Install Ollama and Pull a Model

```bash
# Install Ollama (Linux/macOS)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (this downloads it to your machine)
ollama pull llama3

# List installed models
ollama list
```

### 2. Install Python Client

```bash
pip install ollama
```

### 3. Basic Chat

```python
import ollama

response = ollama.chat(
    model="llama3",
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": "Explain Redis cache-aside pattern in 2 sentences."},
    ],
)

print(response["message"]["content"])
```

### 4. Streaming Responses

```python
def stream_chat(model: str, message: str) -> None:
    """Stream tokens from Ollama in real-time."""
    stream = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": message}],
        stream=True,
    )

    for chunk in stream:
        content = chunk["message"]["content"]
        print(content, end="", flush=True)
    print()

stream_chat("llama3", "Write a Python function to reverse a linked list.")
```

### 5. Multi-Turn Conversation

```python
class OllamaChat:
    def __init__(self, model: str = "llama3", system_prompt: str = ""):
        self.model = model
        self.messages = []
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

    def chat(self, user_input: str) -> str:
        """Send a message and get a response, maintaining history."""
        self.messages.append({"role": "user", "content": user_input})

        response = ollama.chat(
            model=self.model,
            messages=self.messages,
        )

        assistant_msg = response["message"]["content"]
        self.messages.append({"role": "assistant", "content": assistant_msg})

        return assistant_msg

    def clear_history(self) -> None:
        """Clear conversation history."""
        system = self.messages[0] if self.messages and self.messages[0]["role"] == "system" else None
        self.messages = []
        if system:
            self.messages.append(system)

# Usage
chat = OllamaChat(model="llama3", system_prompt="You are a Python expert.")
print(chat.chat("What is a decorator?"))
print(chat.chat("Show me an example."))
print(chat.chat("How do I pass arguments to it?"))
```

### 6. Generate Embeddings

```python
def generate_embedding(text: str, model: str = "nomic-embed-text") -> list[float]:
    """Generate embeddings using a local Ollama model.

    Args:
        text: Input text.
        model: Embedding model name.

    Returns:
        Embedding vector.
    """
    response = ollama.embeddings(model=model, prompt=text)
    return response["embedding"]

# First pull the embedding model
# ollama pull nomic-embed-text

embedding = generate_embedding("Redis is an in-memory data store.")
print(f"Embedding dimensions: {len(embedding)}")
```

### 7. Function Calling with Ollama

```python
import json

def function_calling_chat(model: str, message: str, tools: list[dict]) -> dict:
    """Chat with function calling support.

    Args:
        model: Ollama model name.
        message: User message.
        tools: List of tool definitions.

    Returns:
        Response dict with content or tool calls.
    """
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": message}],
        tools=tools,
    )

    return response["message"]

# Define tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name"},
                },
                "required": ["city"],
            },
        },
    },
]

result = function_calling_chat("llama3", "What's the weather in Madrid?", tools)

if result.get("tool_calls"):
    for call in result["tool_calls"]:
        print(f"Tool: {call['function']['name']}")
        print(f"Args: {call['function']['arguments']}")
else:
    print(f"Response: {result['content']}")
```

### 8. Model Management

```python
def list_models() -> list[dict]:
    """List all installed Ollama models."""
    response = ollama.list()
    return [
        {
            "name": m["name"],
            "size": m["size"] / 1e9,  # GB
            "modified": m["modified_at"],
        }
        for m in response["models"]
    ]

def pull_model(model_name: str) -> None:
    """Pull (download) a model."""
    for progress in ollama.pull(model_name, stream=True):
        if progress.get("status"):
            print(f"\r{progress['status']}", end="", flush=True)
    print()

def delete_model(model_name: str) -> None:
    """Delete a model to free disk space."""
    ollama.delete(model_name)
    print(f"Deleted {model_name}")

# List installed models
for model in list_models():
    print(f"{model['name']}: {model['size']:.1f} GB")
```

## How It Works

1. **Ollama server** runs as a local process (default port 11434). The Python client sends HTTP requests to this server.
2. **Model pulling** downloads GGUF (quantized) model files to `~/.ollama/models/`. Quantization reduces model size and memory usage while maintaining reasonable quality.
3. **Streaming** uses Server-Sent Events — the server sends tokens as they are generated, and the client yields them as chunks.
4. **Embeddings** use specialized embedding models (like `nomic-embed-text`) that are optimized for producing vector representations, not text generation.
5. **Function calling** — Ollama parses tool definitions and can return structured tool call requests. The model decides whether to call a tool or answer directly.

## Variants

### Using with LangChain

```python
from langchain_ollama import ChatOllama, OllamaEmbeddings

llm = ChatOllama(model="llama3", temperature=0.3)
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# Use in LangChain chains
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

chain = (
    ChatPromptTemplate.from_template("Explain {topic} briefly.")
    | llm
    | StrOutputParser()
)

result = chain.invoke({"topic": "vector databases"})
```

### Async API

```python
import asyncio
from ollama import AsyncClient

async def async_chat():
    client = AsyncClient()
    response = await client.chat(
        model="llama3",
        messages=[{"role": "user", "content": "Hello!"}],
    )
    return response["message"]["content"]

result = asyncio.run(async_chat())
```

### Custom Modelfile (Fine-Tuned Models)

```bash
# Create a Modelfile
cat > Modelfile <<EOF
FROM llama3
SYSTEM "You are a senior DevOps engineer. Answer concisely."
PARAMETER temperature 0.3
PARAMETER top_p 0.9
EOF

# Build custom model
ollama create devops-assistant -f Modelfile
```

```python
response = ollama.chat(
    model="devops-assistant",
    messages=[{"role": "user", "content": "How to optimize Docker build times?"}],
)
print(response["message"]["content"])
```

### Batch Processing

```python
def batch_generate(
    prompts: list[str],
    model: str = "llama3",
) -> list[str]:
    """Generate responses for multiple prompts."""
    results = []
    for prompt in prompts:
        response = ollama.generate(
            model=model,
            prompt=prompt,
            options={"temperature": 0},
        )
        results.append(response["response"])
    return results

summaries = batch_generate([
    "Summarize: Redis is an in-memory data structure store.",
    "Summarize: PostgreSQL is a relational database with ACID compliance.",
])
```

## Best Practices


- For a deeper guide, see [a Local RAG Pipeline with ChromaDB and Sentence Transformers](/recipes/python-rag-chroma-local/).

- **Start with `llama3` (8B)** — good balance of quality and speed; needs ~5GB RAM
- **Use `temperature=0` for factual tasks** — code generation, data extraction, classification
- **Pull embedding models separately** — `nomic-embed-text` is optimized for embeddings, not chat
- **Monitor RAM usage** — models are loaded into memory; running multiple models simultaneously can cause OOM

## Common Mistakes

- **Not pulling the model first** — `ollama pull` must be run before using a model in Python
- **Using too large a model** — Llama 3 70B needs 40GB+ RAM; start with 8B models
- **Not setting `stream=True` for long outputs** — non-streaming waits for the full response, which can take minutes
- **Mixing embedding and chat models** — chat models produce poor embeddings; use dedicated embedding models

## FAQ

**Q: Which model should I start with?**
A: `llama3` (8B) for general chat, `phi3` (3.8B) for lightweight tasks, `mistral` (7B) for code, `nomic-embed-text` for embeddings.

**Q: How much RAM do I need?**
A: 8B models need ~5GB, 13B models need ~8GB, 70B models need ~40GB. Quantized (Q4) models use less.

**Q: Can I use Ollama in production?**
A: Yes. Ollama is production-ready. For multi-user setups, run Ollama on a dedicated GPU server and connect via HTTP.

**Q: How does Ollama compare to OpenAI?**
A: Ollama is free and private but slower and less capable than GPT-4o. Use Ollama for privacy, cost savings, or offline use. Use OpenAI for maximum quality.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
