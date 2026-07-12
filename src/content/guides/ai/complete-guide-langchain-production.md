---



contentType: guides
slug: complete-guide-langchain-production
title: "Complete Guide to LangChain in Production"
description: "Run LangChain in production. Covers chains, agents, memory, tools, LCEL, streaming, callbacks, RAG integration, evaluation, and deployment patterns for reliable LangChain-powered applications."
metaDescription: "Run LangChain in production. Covers chains, agents, memory, tools, LCEL, streaming, callbacks, RAG integration, and deployment patterns."
difficulty: advanced
topics:
  - ai
  - architecture
  - testing
tags:
  - langchain
  - ai
  - guide
  - chains
  - agents
  - memory
  - lcel
  - llm
relatedResources:
  - /guides/complete-guide-llm-application-architecture
  - /guides/complete-guide-rag-production
  - /guides/complete-guide-ai-agents-production
  - /guides/complete-guide-llm-evaluation
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Run LangChain in production. Covers chains, agents, memory, tools, LCEL, streaming, callbacks, RAG integration, and deployment patterns."
  keywords:
    - langchain production
    - langchain chains
    - langchain agents
    - langchain memory
    - langchain lcel
    - langchain streaming
    - langchain rag
    - langchain deployment



---

## Introduction

LangChain is the most popular framework for building LLM applications. It provides abstractions for chains, agents, memory, tools, and retrieval. Running LangChain in production requires understanding LCEL (LangChain Expression Language), streaming, callbacks, error handling, and evaluation. The following guide covers the full spectrum of LangChain in production with practical patterns.

## LangChain Expression Language (LCEL)

### Basic Chains

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Create components
model = ChatOpenAI(model="gpt-4o", temperature=0.7)
parser = StrOutputParser()

# Define prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful coding assistant."),
    ("user", "{input}")
])

# Compose chain using LCEL pipe operator
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

# Step 1: Extract topics
extract_prompt = ChatPromptTemplate.from_template(
    "Extract 3 key topics from this text as a JSON list: {text}"
)
extract_chain = extract_prompt | model | JsonOutputParser()

# Step 2: Summarize each topic
summary_prompt = ChatPromptTemplate.from_template(
    "Write a 2-sentence summary about: {topic}"
)
summary_chain = summary_prompt | model | StrOutputParser()

# Step 3: Combine summaries
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

### Parallel Execution

```python
from langchain_core.runnables import RunnableParallel

# Run multiple chains in parallel
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
    
    # Store in history
    history.add_user_message(user_input)
    history.add_ai_message(response.content)
    
    return response.content

print(chat("Hi, my name is Alice"))
print(chat("What is my name?"))  # Remembers "Alice"
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
            # Remove oldest non-system message
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
        self.max_recent = 6  # Keep last 6 messages before summarizing
    
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
        result = eval(expression)  # In production, use a safe evaluator
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

### Custom Tools with Pydantic

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

# The agent will see the schema and know how to call the tool
```

## Streaming

### Streaming with LCEL

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

### Streaming with Callbacks

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

## RAG with LangChain

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 1. Load and split documents
from langchain_community.document_loaders import TextLoader

loader = TextLoader("docs/handbook.txt")
documents = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " "]
)
chunks = splitter.split_documents(documents)

# 2. Create vector store
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(chunks, embeddings, persist_directory="./chroma_db")

# 3. Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

# 4. Build RAG chain
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

### Retry with Exponential Backoff

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

# with_retry adds automatic retrying
chain_with_retry = chain.with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True
)

result = chain_with_retry.invoke({"text": "Long text to summarize..."})
```

## Callbacks for Observability

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

# Use in chain
chain = prompt | model
result = chain.invoke(
    {"input": "test"},
    config={"callbacks": [handler]}
)

# Access logs
for log in handler.logs:
    print(json.dumps(log))
```

## Deployment

### FastAPI Integration

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
    # LangChain supports batch natively
    inputs = [{"text": t} for t in texts]
    results = await chain.abatch(inputs, config={"max_concurrency": batch_size})
    return [r.content for r in results]

texts = [f"Article {i} content..." for i in range(50)]
summaries = asyncio.run(batch_process(texts, batch_size=5))
```

## FAQ

### Should I use LCEL or LLMChain?

Use LCEL (LangChain Expression Language). The older `LLMChain` class is deprecated. LCEL provides better composition with the pipe operator, native streaming, batch support, and async support. All new LangChain code should use LCEL.

### How do I handle LangChain version updates?

Pin your LangChain version in requirements.txt. LangChain changes frequently and breaking changes happen. Test thoroughly before upgrading. Use `langchain_core` for stable primitives and `langchain_community` for integrations that may change.

### How do I test LangChain chains?

Mock the LLM using `FakeListChatModel` or `FakeMessagesListChatModel` from `langchain_core.language_models.fake_chat_models`. Test the chain logic (prompt construction, output parsing, routing) separately from the LLM call. For integration tests, use a cheap model (gpt-4o-mini) and assert on response structure, not exact content.

### What is the difference between agents and chains?

Chains follow a fixed sequence of steps. Agents dynamically decide which tools to call based on the input. Use chains when the workflow is predictable and fixed. Use agents when the task requires reasoning, tool selection, or multi-step decision making. Agents are more flexible but slower and less predictable.

### How do I reduce latency in LangChain?

Use streaming to show tokens as they arrive. Use cheaper models for simple tasks (gpt-4o-mini instead of gpt-4o). Cache responses with `set_llm_cache`. Batch multiple requests with `abatch`. Use `RunnableParallel` for independent operations. Minimize the number of LLM calls in your chain.

### Should I use LangChain or call the OpenAI API directly?

Use LangChain when you need composition (chains, agents, tools, memory, RAG), multiple LLM providers, or complex workflows. Call the API directly for simple single-call use cases. LangChain adds overhead (abstractions, serialization) but saves significant development time for complex applications.

## See Also

- [Complete Guide to AI Agents in Production](/guides/complete-guide-ai-agents-production/)
- [Complete Guide to LLM Application Architecture](/guides/complete-guide-llm-application-architecture/)
- [Complete Guide to LLM Evaluation](/guides/complete-guide-llm-evaluation/)
- [Complete Guide to LLM Security](/guides/complete-guide-llm-security/)
- [Complete Guide to RAG in Production](/guides/complete-guide-rag-production/)

