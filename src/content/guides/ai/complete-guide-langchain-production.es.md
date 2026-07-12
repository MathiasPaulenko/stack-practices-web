---
contentType: guides
slug: complete-guide-langchain-production
title: "Referencia Detallada de LangChain en Producción"
description: "Ejecutar LangChain en produccion. Cubre chains, agents, memory, tools, LCEL, streaming, callbacks, integracion RAG, evaluacion y patrones de deployment para aplicaciones LangChain confiables."
metaDescription: "Ejecutar LangChain en produccion. Cubre chains, agents, memory, tools, LCEL, streaming, callbacks, RAG y patrones de deployment."
difficulty: advanced
topics:
  - ai
  - architecture
  - testing
tags:
  - langchain
  - ai
  - guia
  - chains
  - agents
  - memory
  - lcel
  - llm
relatedResources:
  - /guides/ai/complete-guide-llm-application-architecture
  - /guides/ai/complete-guide-rag-production
  - /guides/ai/complete-guide-ai-agents-production
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejecutar LangChain en produccion. Cubre chains, agents, memory, tools, LCEL, streaming, callbacks, RAG y patrones de deployment."
  keywords:
    - langchain produccion
    - langchain chains
    - langchain agents
    - langchain memory
    - langchain lcel
    - langchain streaming
    - langchain rag
    - langchain deployment
---

## Introducción

LangChain es el framework mas popular para construir aplicaciones LLM. Provee abstracciones para chains, agents, memory, tools, y retrieval. Ejecutar LangChain en produccion requiere entender LCEL (LangChain Expression Language), streaming, callbacks, error handling, y evaluacion. Lo siguiente es una guia practica para el espectro completo de LangChain en produccion con patrones practicos.

## LangChain Expression Language (LCEL)

### Chains Basicas

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Crear componentes
model = ChatOpenAI(model="gpt-4o", temperature=0.7)
parser = StrOutputParser()

# Definir prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful coding assistant."),
    ("user", "{input}")
])

# Componer chain usando LCEL pipe operator
chain = prompt | model | parser

# Invoke
result = chain.invoke({"input": "Explain async/await in Python"})
print(result)
```

### Multi-Step Chains

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser

model = ChatOpenAI(model="gpt-4o")

# Step 1: Extraer topics
extract_prompt = ChatPromptTemplate.from_template(
    "Extract 3 key topics from this text as a JSON list: {text}"
)
extract_chain = extract_prompt | model | JsonOutputParser()

# Step 2: Resumir cada topic
summary_prompt = ChatPromptTemplate.from_template(
    "Write a 2-sentence summary about: {topic}"
)
summary_chain = summary_prompt | model | StrOutputParser()

# Step 3: Combinar summaries
combine_prompt = ChatPromptTemplate.from_template(
    "Combine these summaries into a coherent paragraph: {summaries}"
)
combine_chain = combine_prompt | model | StrOutputParser()

# Full pipeline
from langchain_core.runnables import RunnablePassthrough

text = "Long article about Python concurrency..."

topics = extract_chain.invoke({"text": text})

summaries = []
for topic in topics:
    summary = summary_chain.invoke({"topic": topic})
    summaries.append(summary)

final = combine_chain.invoke({"summaries": " ".join(summaries)})
print(final)
```

### Ejecucion Paralela

```python
from langchain_core.runnables import RunnableParallel

# Correr multiples chains en paralelo
parallel_chain = RunnableParallel(
    summary=summary_chain,
    keywords=keyword_chain,
    sentiment=sentiment_chain
)

result = parallel_chain.invoke({"input": "Some text to analyze"})
# result = {"summary": "...", "keywords": "...", "sentiment": "..."}
```

## Memory

### Conversation Buffer Memory

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.memory import ChatMessageHistory

model = ChatOpenAI(model="gpt-4o")

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("user", "{input}")
])

chain = prompt | model

# Manual history management
history = ChatMessageHistory()

def chat(user_input: str) -> str:
    messages = prompt.invoke({
        "history": history.messages,
        "input": user_input
    })
    response = chain.invoke({
        "history": history.messages,
        "input": user_input
    })
    
    # Store en history
    history.add_user_message(user_input)
    history.add_ai_message(response.content)
    
    return response.content

print(chat("Hi, my name is Alice"))
print(chat("What is my name?"))  # Recuerda "Alice"
```

### Token-Buffer Memory

```python
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

class TokenBufferMemory:
    def __init__(self, max_tokens: int = 2000):
        self.max_tokens = max_tokens
        self.messages: list = []
    
    def add_message(self, message):
        self.messages.append(message)
        self._trim()
    
    def _trim(self):
        while self._count_tokens() > self.max_tokens and len(self.messages) > 2:
            # Remover oldest non-system message
            for i, msg in enumerate(self.messages):
                if not isinstance(msg, SystemMessage):
                    self.messages.pop(i)
                    break
    
    def _count_tokens(self) -> int:
        # Rough estimate: 1 token ≈ 4 chars
        return sum(len(msg.content) // 4 for msg in self.messages)
    
    def get_messages(self) -> list:
        return self.messages

memory = TokenBufferMemory(max_tokens=2000)
memory.add_message(SystemMessage(content="You are a helpful assistant."))
memory.add_message(HumanMessage(content="Hello!"))
memory.add_message(AIMessage(content="Hi there!"))
```

### Summary Memory

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

model = ChatOpenAI(model="gpt-4o-mini")

summarize_prompt = ChatPromptTemplate.from_template(
    "Summarize this conversation in 2-3 sentences:\n{conversation}"
)
summarize_chain = summarize_prompt | model

class SummaryMemory:
    def __init__(self, summarize_chain):
        self.summarize_chain = summarize_chain
        self.summary = "No conversation yet."
        self.recent_messages: list = []
        self.max_recent = 6  # Mantener ultimos 6 messages antes de summarizing
    
    def add_message(self, message):
        self.recent_messages.append(message)
        if len(self.recent_messages) > self.max_recent:
            self._summarize()
    
    def _summarize(self):
        conversation = "\n".join(
            f"{'User' if isinstance(m, HumanMessage) else 'AI'}: {m.content}"
            for m in self.recent_messages
        )
        new_summary = self.summarize_chain.invoke({"conversation": conversation})
        self.summary = new_summary.content
        self.recent_messages = []
    
    def get_context(self) -> str:
        return f"Summary: {self.summary}\nRecent: {self.recent_messages}"
```

## Agents

### Tool-Calling Agent

```python
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

@tool
def search_database(query: str) -> str:
    """Search the product database for items matching the query."""
    # Simulated database search
    return f"Found 3 products matching '{query}': Widget A, Widget B, Widget C"

@tool
def get_weather(location: str) -> str:
    """Get the current weather for a location."""
    return f"Weather in {location}: 72°F, sunny"

@tool
def calculate(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        result = eval(expression)  # En produccion, usar un safe evaluator
        return str(result)
    except Exception as e:
        return f"Error: {e}"

tools = [search_database, get_weather, calculate]

model = ChatOpenAI(model="gpt-4o")

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant. Use tools when needed."),
    ("user", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(model, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

result = executor.invoke({"input": "What's the weather in Madrid and what's 15 * 23?"})
print(result["output"])
```

### Custom Tools con Pydantic

```python
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from typing import Optional

class SearchInput(BaseModel):
    query: str = Field(description="The search query")
    category: Optional[str] = Field(default=None, description="Product category filter")
    max_results: int = Field(default=10, description="Maximum results to return")

@tool(args_schema=SearchInput)
def search_products(query: str, category: str = None, max_results: int = 10) -> str:
    """Search for products in the catalog."""
    results = f"Searching for '{query}'"
    if category:
        results += f" in category '{category}'"
    results += f" (max {max_results} results)"
    return results

# El agent vera el schema y sabra como llamar el tool
```

## Streaming

### Streaming con LCEL

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

model = ChatOpenAI(model="gpt-4o", streaming=True)
prompt = ChatPromptTemplate.from_template("Tell me about {topic}")
chain = prompt | model | StrOutputParser()

# Stream tokens
for chunk in chain.stream({"topic": "Python asyncio"}):
    print(chunk, end="", flush=True)

# Async streaming
import asyncio

async def async_stream():
    async for chunk in chain.astream({"topic": "Python asyncio"}):
        print(chunk, end="", flush=True)

asyncio.run(async_stream())
```

### Streaming con Callbacks

```python
from langchain_openai import ChatOpenAI
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.prompts import ChatPromptTemplate

class StreamingHandler(BaseCallbackHandler):
    def on_llm_new_token(self, token: str, **kwargs):
        print(token, end="", flush=True)
    
    def on_llm_start(self, serialized, prompts, **kwargs):
        print("\n--- LLM Start ---")
    
    def on_llm_end(self, response, **kwargs):
        print("\n--- LLM End ---")

handler = StreamingHandler()
model = ChatOpenAI(model="gpt-4o", streaming=True, callbacks=[handler])
prompt = ChatPromptTemplate.from_template("Explain {topic}")
chain = prompt | model

result = chain.invoke({"topic": "docker containers"})
```

## RAG con LangChain

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 1. Cargar y split documents
from langchain_community.document_loaders import TextLoader

loader = TextLoader("docs/handbook.txt")
documents = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " "]
)
chunks = splitter.split_documents(documents)

# 2. Crear vector store
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(chunks, embeddings, persist_directory="./chroma_db")

# 3. Crear retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

# 4. Construir RAG chain
def format_docs(docs):
    return "\n\n".join(f"[Source {i+1}]: {doc.page_content}" for i, doc in enumerate(docs))

rag_prompt = ChatPromptTemplate.from_template("""
Answer the question based on the context below. Cite source numbers.

Context:
{context}

Question: {question}
""")

model = ChatOpenAI(model="gpt-4o", temperature=0.3)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | model
    | StrOutputParser()
)

# 5. Query
answer = rag_chain.invoke("What is the vacation policy?")
print(answer)
```

## Error Handling

```python
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o")

def risky_operation(x):
    if x["value"] > 100:
        raise ValueError("Value too large")
    return x

# Fallback chain
primary = RunnableLambda(risky_operation) | model
fallback = RunnableLambda(lambda x: {"value": 0, "input": "default"}) | model

chain = primary.with_fallbacks([fallback])

result = chain.invoke({"value": 200, "input": "test"})
```

### Retry con Exponential Backoff

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

model = ChatOpenAI(
    model="gpt-4o",
    max_retries=3,
    timeout=30,
)

prompt = ChatPromptTemplate.from_template("Summarize: {text}")
chain = prompt | model

# with_retry agrega automatic retrying
chain_with_retry = chain.with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True
)

result = chain_with_retry.invoke({"text": "Long text to summarize..."})
```

## Callbacks para Observabilidad

```python
from langchain_core.callbacks import BaseCallbackHandler
import json
import time
from uuid import uuid4

class LoggingCallbackHandler(BaseCallbackHandler):
    def __init__(self):
        self.logs = []
    
    def on_chain_start(self, serialized, inputs, **kwargs):
        self.logs.append({
            "event": "chain_start",
            "run_id": str(kwargs.get("run_id", uuid4())),
            "inputs": str(inputs)[:200],
            "timestamp": time.time()
        })
    
    def on_chain_end(self, outputs, **kwargs):
        self.logs.append({
            "event": "chain_end",
            "outputs": str(outputs)[:200],
            "timestamp": time.time()
        })
    
    def on_llm_error(self, error, **kwargs):
        self.logs.append({
            "event": "llm_error",
            "error": str(error),
            "timestamp": time.time()
        })
    
    def on_tool_start(self, serialized, input_str, **kwargs):
        self.logs.append({
            "event": "tool_start",
            "tool": serialized.get("name", "unknown"),
            "input": input_str[:200],
            "timestamp": time.time()
        })
    
    def on_tool_end(self, output, **kwargs):
        self.logs.append({
            "event": "tool_end",
            "output": str(output)[:200],
            "timestamp": time.time()
        })

handler = LoggingCallbackHandler()

# Usar en chain
chain = prompt | model
result = chain.invoke(
    {"input": "test"},
    config={"callbacks": [handler]}
)

# Accesar logs
for log in handler.logs:
    print(json.dumps(log))
```

## Deployment

### Integracion con FastAPI

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel

app = FastAPI()

model = ChatOpenAI(model="gpt-4o", streaming=True)
prompt = ChatPromptTemplate.from_template("Answer: {question}")
chain = prompt | model | StrOutputParser()

class ChatRequest(BaseModel):
    question: str

@app.post("/chat")
async def chat(request: ChatRequest):
    async def stream():
        async for chunk in chain.astream({"question": request.question}):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/chat/sync")
async def chat_sync(request: ChatRequest):
    result = await chain.ainvoke({"question": request.question})
    return {"answer": result}
```

### Batch Processing

```python
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

model = ChatOpenAI(model="gpt-4o-mini")
prompt = ChatPromptTemplate.from_template("Summarize in 1 sentence: {text}")
chain = prompt | model

async def batch_process(texts: list[str], batch_size: int = 10) -> list[str]:
    # LangChain soporta batch nativamente
    inputs = [{"text": t} for t in texts]
    results = await chain.abatch(inputs, config={"max_concurrency": batch_size})
    return [r.content for r in results]

texts = [f"Article {i} content..." for i in range(50)]
summaries = asyncio.run(batch_process(texts, batch_size=5))
```

## Preguntas Frecuentes

### ¿Debería usar LCEL o LLMChain?

Usa LCEL (LangChain Expression Language). La clase `LLMChain` mas vieja esta deprecated. LCEL provee mejor composicion con el pipe operator, native streaming, batch support, y async support. Todo codigo nuevo de LangChain deberia usar LCEL.

### ¿Cómo manejo updates de version de LangChain?

Pinea tu version de LangChain en requirements.txt. LangChain cambia frecuentemente y breaking changes pasan. Testea exhaustivamente antes de upgradear. Usa `langchain_core` para primitives estables y `langchain_community` para integraciones que pueden cambiar.

### ¿Cómo testeo LangChain chains?

Mockea el LLM usando `FakeListChatModel` o `FakeMessagesListChatModel` de `langchain_core.language_models.fake_chat_models`. Testea la chain logic (prompt construction, output parsing, routing) separadamente del LLM call. Para integration tests, usa un modelo barato (gpt-4o-mini) y asserta en response structure, no exact content.

### ¿Cuál es la diferencia entre agents y chains?

Chains siguen una secuencia fija de steps. Agents dinamicamente deciden cuales tools llamar basado en el input. Usa chains cuando el workflow es predecible y fijo. Usa agents cuando el task requiere reasoning, tool selection, o multi-step decision making. Agents son mas flexibles pero mas lentos y menos predecibles.

### ¿Cómo reduzco latency en LangChain?

Usa streaming para mostrar tokens a medida que llegan. Usa modelos mas baratos para tasks simples (gpt-4o-mini en lugar de gpt-4o). Cachea responses con `set_llm_cache`. Batch multiplos requests con `abatch`. Usa `RunnableParallel` para operaciones independientes. Minimiza el numero de LLM calls en tu chain.

### ¿Debería usar LangChain o llamar el OpenAI API directamente?

Usa LangChain cuando necesitas composicion (chains, agents, tools, memory, RAG), multiples LLM providers, o workflows complejos. Llama el API directamente para use cases simples de single-call. LangChain agrega overhead (abstractions, serialization) pero ahorra tiempo significativo de desarrollo para aplicaciones complejas.
