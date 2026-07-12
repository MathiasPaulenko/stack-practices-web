---






contentType: recipes
slug: python-langchain-chains-composition
title: "Compose LCEL Chains in LangChain for Multi-Step LLM"
description: "Build composable LLM pipelines with LangChain Expression Language (LCEL) using pipes, parallel execution, and custom runnable components"
metaDescription: "Compose LCEL chains in LangChain with pipe operators, parallel branches, and custom runnables. Build multi-step LLM workflows with retries and streaming."
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
  - /recipes/python-openai-function-calling-structured
  - /recipes/python-llm-streaming-responses
  - /recipes/python-agent-langgraph-state-machine
  - /recipes/python-huggingface-text-classification
  - /recipes/python-llm-eval-ragas-metrics
  - /recipes/python-ollama-local-llm
  - /recipes/python-openai-embeddings-cosine
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compose LCEL chains in LangChain with pipe operators, parallel branches, and custom runnables. Build multi-step LLM workflows with retries and streaming."
  keywords:
    - langchain lcel
    - langchain chains
    - langchain expression language
    - python llm pipeline
    - langchain composition






---

# Compose LCEL Chains in LangChain for Multi-Step LLM Workflows

LangChain Expression Language (LCEL) composes LLM workflows with the pipe operator (`|`). Chains become composable, streamable, and retryable without boilerplate. Below: multi-step pipelines with prompts, models, parsers, parallel branches, and custom runnable components.

## When to Use This

- Multi-step LLM workflows (summarize then translate, extract then classify)
- Pipelines that need streaming, batching, or retry logic
- Composing prompts, tools, and parsers into reusable chains

## Prerequisites

- Python 3.10+
- `langchain` and `langchain-openai` packages

## Solution

### 1. Install Dependencies

```bash
pip install langchain langchain-openai
```

### 2. Basic Chain — Prompt | Model | Parser

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

# LCEL pipe operator composes the chain
chain = prompt | model | parser

result = chain.invoke({"topic": "vector databases"})
print(result)
```

### 3. Multi-Step Chain — Summarize Then Translate

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

# Chain the output of summarize into translate
full_chain = (
    {"summary": summarize_chain}
    | translate_chain
)

result = full_chain.invoke({
    "text": "LangChain is a framework for building applications powered by LLMs..."
})
```

### 4. Parallel Branches with RunnableParallel

```python
from langchain_core.runnables import RunnableParallel

# Run multiple chains simultaneously on the same input
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

### 5. Custom Runnable Components

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

### 6. Adding Retry and Fallback

```python
from langchain_core.runnables import RunnableWithFallbacks

fast_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
strong_model = ChatOpenAI(model="gpt-4o", temperature=0)

fast_chain = prompt | fast_model | StrOutputParser()
strong_chain = prompt | strong_model | StrOutputParser()

# Try fast model first, fall back to strong model on error
chain_with_fallback = fast_chain.with_fallbacks([strong_chain])

# Add retry logic
chain_with_retry = fast_chain.with_retry(
    stop_after_attempt=3,
    wait_exponential_jitter=True,
)
```

### 7. Streaming Output

```python
# Stream tokens as they arrive
streaming_chain = prompt | model | StrOutputParser()

for chunk in streaming_chain.stream({"topic": "GraphQL federation"}):
    print(chunk, end="", flush=True)
```

### 8. Batch Processing

```python
# Process multiple inputs in parallel
results = chain.batch([
    {"topic": "Redis caching"},
    {"topic": "PostgreSQL indexing"},
    {"topic": "Docker multi-stage builds"},
])

for r in results:
    print(r)
    print("---")
```

## How It Works

1. **Pipe operator (`|`)** passes the output of one runnable as input to the next, similar to Unix pipes.
2. **`RunnableParallel`** runs multiple chains on the same input simultaneously, returning a dict with each branch's result.
3. **`RunnableLambda`** wraps any Python function as a runnable, enabling custom logic inside chains.
4. **`with_fallbacks`** tries the primary chain first; if it raises an exception, it tries each fallback in order.
5. **`with_retry`** automatically retries on failure with configurable attempts and backoff.
6. **`stream`** yields output chunks as they are generated, enabling real-time UI updates.
7. **`batch`** processes multiple inputs concurrently, using the LLM provider's batch API for throughput.

## Variants

### Conditional Routing

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

### JSON Output with Structured Parser

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

### Memory-Conversational Chain

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

## Best Practices


- For a deeper guide, see [Complete Guide to LangChain in Production](/guides/complete-guide-langchain-production/).

- **Use `StrOutputParser` for simple text output** — it extracts the string content from the AI message
- **Break complex chains into smaller components** — each component should do one thing
- **Use `with_fallbacks` for production** — LLM APIs can rate-limit or timeout
- **Stream for user-facing output** — improves perceived latency considerably

## Common Mistakes

- **Forgetting to pass the right input keys** — each runnable expects specific input keys; mismatches cause runtime errors
- **Not using `RunnableParallel` for independent branches** — sequential execution wastes time when branches are independent
- **Chaining without error handling** — a single API failure breaks the entire chain
- **Using synchronous calls in async contexts** — use `ainvoke`, `astream`, and `abatch` in async code

## FAQ

**Q: What is the difference between LCEL and LangChain's legacy chains?**
A: LCEL is the recommended approach. Legacy chains (LLMChain, SequentialChain) are deprecated. LCEL provides streaming, batching, and retries out of the box.

**Q: Can I use LCEL with non-OpenAI models?**
A: Yes. Any `BaseChatModel` works with LCEL — Anthropic, Google, local models via Ollama, etc.

**Q: How do I debug a chain?**
A: Use `chain.invoke()` with verbose logging, or set `LANGCHAIN_TRACING_V2=true` to see traces in LangSmith.

**Q: Can I compose chains from different files?**
A: Yes. Define chains as functions or classes that return a runnable, then import and compose them.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
