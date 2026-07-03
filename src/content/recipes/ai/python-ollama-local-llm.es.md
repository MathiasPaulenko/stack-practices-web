---
contentType: recipes
slug: python-ollama-local-llm
title: "Ejecuta LLMs localmente con Ollama para inferencia privada"
description: "Instala y usa Ollama para ejecutar LLMs open-source localmente con Python, incluyendo streaming, embeddings, function calling y gestion de modelos sin costos de API"
metaDescription: "Ejecuta LLMs localmente con Ollama y Python. Instala modelos, stream de respuestas, genera embeddings, usa function calling y gestiona modelos sin costos."
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
  - /recipes/ai/python-llm-streaming-responses
  - /recipes/ai/python-rag-chroma-local
  - /recipes/ai/python-langchain-chains-composition
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejecuta LLMs localmente con Ollama y Python. Instala modelos, stream de respuestas, genera embeddings, usa function calling y gestiona modelos sin costos."
  keywords:
    - ollama python
    - local llm
    - ollama tutorial
    - run llm locally
    - open source llm
---

# Ejecuta LLMs localmente con Ollama para inferencia privada

Ollama ejecuta LLMs open-source (Llama 3, Mistral, Phi-3, etc.) localmente en tu maquina. Sin API keys, sin costos por token, sin datos saliendo de tu red. A continuacion: instalar Ollama, ejecutar modelos con Python, streaming de respuestas, generar embeddings y usar function calling — todo localmente.

## Cuando Usar Esto

- Aplicaciones sensibles a privacidad donde los datos no pueden salir de tu maquina
- Desarrollo y prototipado sin costos de API
- Entornos offline o air-gapped
- Ejecutar modelos personalizados o fine-tuneados

## Requisitos Previos

- Python 3.10+
- Ollama instalado (`curl -fsSL https://ollama.com/install.sh | sh` en Linux/macOS, o descarga desde ollama.com para Windows)
- 8GB+ RAM (16GB+ recomendado para modelos mas grandes)

## Solucion

### 1. Instalar Ollama y descargar un modelo

```bash
# Instalar Ollama (Linux/macOS)
curl -fsSL https://ollama.com/install.sh | sh

# Descargar un modelo (lo guarda en tu maquina)
ollama pull llama3

# Listar modelos instalados
ollama list
```

### 2. Instalar cliente Python

```bash
pip install ollama
```

### 3. Chat basico

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

### 4. Streaming de respuestas

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

### 5. Conversacion multi-turno

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

# Uso
chat = OllamaChat(model="llama3", system_prompt="You are a Python expert.")
print(chat.chat("What is a decorator?"))
print(chat.chat("Show me an example."))
print(chat.chat("How do I pass arguments to it?"))
```

### 6. Generar embeddings

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

# Primero descargar el modelo de embedding
# ollama pull nomic-embed-text

embedding = generate_embedding("Redis is an in-memory data store.")
print(f"Embedding dimensions: {len(embedding)}")
```

### 7. Function calling con Ollama

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

# Definir herramientas
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

### 8. Gestion de modelos

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

# Listar modelos instalados
for model in list_models():
    print(f"{model['name']}: {model['size']:.1f} GB")
```

## Como Funciona

1. **Servidor Ollama** corre como un proceso local (puerto por defecto 11434). El cliente Python envia peticiones HTTP a este servidor.
2. **Descarga de modelos** descarga archivos de modelo GGUF (cuantizados) a `~/.ollama/models/`. La cuantizacion reduce el tamanio del modelo y uso de memoria manteniendo calidad razonable.
3. **Streaming** usa Server-Sent Events — el servidor envia tokens a medida que se generan, y el cliente los produce como chunks.
4. **Embeddings** usan modelos de embedding especializados (como `nomic-embed-text`) que estan optimizados para producir representaciones vectoriales, no generacion de texto.
5. **Function calling** — Ollama parsea definiciones de herramientas y puede retornar peticiones estructuradas de llamadas a herramientas. El modelo decide si llamar una herramienta o responder directamente.

## Variantes

### Usar con LangChain

```python
from langchain_ollama import ChatOllama, OllamaEmbeddings

llm = ChatOllama(model="llama3", temperature=0.3)
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# Usar en cadenas LangChain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

chain = (
    ChatPromptTemplate.from_template("Explain {topic} briefly.")
    | llm
    | StrOutputParser()
)

result = chain.invoke({"topic": "vector databases"})
```

### API async

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

### Modelfile personalizado (modelos fine-tuneados)

```bash
# Crear un Modelfile
cat > Modelfile <<EOF
FROM llama3
SYSTEM "You are a senior DevOps engineer. Answer concisely."
PARAMETER temperature 0.3
PARAMETER top_p 0.9
EOF

# Construir modelo personalizado
ollama create devops-assistant -f Modelfile
```

```python
response = ollama.chat(
    model="devops-assistant",
    messages=[{"role": "user", "content": "How to optimize Docker build times?"}],
)
print(response["message"]["content"])
```

### Procesamiento batch

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

## Mejores Practicas

- **Empieza con `llama3` (8B)** — buen balance de calidad y velocidad; necesita ~5GB RAM
- **Usa `temperature=0` para tareas factuales** — generacion de codigo, extraccion de datos, clasificacion
- **Descarga modelos de embedding por separado** — `nomic-embed-text` esta optimizado para embeddings, no chat
- **Monitorea el uso de RAM** — los modelos se cargan en memoria; ejecutar multiples modelos simultaneamente puede causar OOM

## Errores Comunes

- **No descargar el modelo primero** — `ollama pull` debe ejecutarse antes de usar un modelo en Python
- **Usar un modelo demasiado grande** — Llama 3 70B necesita 40GB+ RAM; empieza con modelos 8B
- **No establecer `stream=True` para salidas largas** — sin streaming espera la respuesta completa, lo que puede tomar minutos
- **Mezclar modelos de embedding y chat** — los modelos de chat producen malos embeddings; usa modelos de embedding dedicados

## FAQ

**Q: Con que modelo debo empezar?**
A: `llama3` (8B) para chat general, `phi3` (3.8B) para tareas ligeras, `mistral` (7B) para codigo, `nomic-embed-text` para embeddings.

**Q: Cuanta RAM necesito?**
A: Modelos 8B necesitan ~5GB, modelos 13B necesitan ~8GB, modelos 70B necesitan ~40GB. Los modelos cuantizados (Q4) usan menos.

**Q: Puedo usar Ollama en produccion?**
A: Si. Ollama esta listo para produccion. Para setups multi-usuario, ejecuta Ollama en un servidor GPU dedicado y conecta via HTTP.

**Q: Como compara Ollama con OpenAI?**
A: Ollama es gratis y privado pero mas lento y menos capaz que GPT-4o. Usa Ollama para privacidad, ahorro de costos o uso offline. Usa OpenAI para maxima calidad.
