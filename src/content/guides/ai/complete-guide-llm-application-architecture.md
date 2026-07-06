---
contentType: guides
slug: complete-guide-llm-application-architecture
title: "Complete Guide to LLM Application Architecture"
description: "Build production LLM applications end-to-end. Covers API layers, prompt management, streaming, caching, guardrails, observability, evaluation, and deployment patterns for reliable LLM-powered systems."
metaDescription: "Build production LLM apps. Covers API layers, prompt management, streaming, caching, guardrails, observability, evaluation, and deployment."
difficulty: advanced
topics:
  - ai
  - architecture
  - performance
tags:
  - llm
  - ai
  - guide
  - architecture
  - prompt-engineering
  - streaming
  - guardrails
  - observability
relatedResources:
  - /guides/concurrency/complete-guide-python-asyncio-production
  - /patterns/design/circuit-breaker-pattern
  - /patterns/resilience/retry-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build production LLM apps. Covers API layers, prompt management, streaming, caching, guardrails, observability, evaluation, and deployment."
  keywords:
    - llm application architecture
    - llm production
    - prompt management
    - llm streaming
    - llm caching
    - llm guardrails
    - llm observability
    - llm deployment
---

## Introduction

Building an LLM application is more than calling an API. Production LLM systems need prompt management, streaming responses, caching, guardrails, observability, evaluation pipelines, and deployment strategies. Here is a hands-on guide to the full architecture of a production LLM application, from API design to monitoring and cost control.

## Architecture Overview

```text
User Request → API Gateway → Guardrails → Prompt Builder → LLM Provider → Response Parser → Guardrails → Cache → User Response

Components:
1. API Layer: HTTP/WebSocket endpoints, rate limiting, auth
2. Prompt Builder: Templates, few-shot examples, context injection
3. LLM Provider: OpenAI, Anthropic, local models, or self-hosted
4. Response Parser: Structured output extraction, validation
5. Guardrails: Input/output filtering, safety checks, PII redaction
6. Cache: Semantic cache for repeated queries
7. Observability: Logging, tracing, metrics, evaluation
8. Evaluation: Automated quality checks on responses
```

## API Layer

### Streaming Responses with Server-Sent Events

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
import json

app = FastAPI()
client = AsyncOpenAI()

@app.post("/chat")
async def chat(request: dict):
    async def stream_response():
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": request.get("system", "You are a helpful assistant.")},
                {"role": "user", "content": request["message"]}
            ],
            stream=True,
            temperature=0.7
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                data = json.dumps({
                    "type": "token",
                    "content": chunk.choices[0].delta.content
                })
                yield f"data: {data}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream"
    )
```

### WebSocket for Bidirectional Chat

```python
from fastapi import FastAPI, WebSocket
from openai import AsyncOpenAI

app = FastAPI()
client = AsyncOpenAI()

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    
    conversation_history = []
    
    while True:
        message = await websocket.receive_text()
        conversation_history.append({"role": "user", "content": message})
        
        # Stream response
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=conversation_history,
            stream=True
        )
        
        full_response = ""
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            full_response += token
            await websocket.send_json({"type": "token", "content": token})
        
        conversation_history.append({"role": "assistant", "content": full_response})
        await websocket.send_json({"type": "done"})
```

## Prompt Management

### Prompt Templates with Jinja2

```python
from jinja2 import Template
from dataclasses import dataclass
from typing import Any

@dataclass
class PromptTemplate:
    template_str: str
    system_prompt: str
    
    def render(self, **kwargs: Any) -> list[dict]:
        template = Template(self.template_str)
        user_content = template.render(**kwargs)
        return [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_content}
        ]

# Define templates
code_review_prompt = PromptTemplate(
    system_prompt="You are a senior code reviewer. Analyze code for bugs, security issues, and improvements.",
    template_str="""Review the following {{ language }} code:

```{{ language }}
{{ code }}
```

Focus on:
1. Bugs and potential errors
2. Security vulnerabilities
3. Performance issues
4. Code style and readability

Provide specific, actionable feedback."""
)

# Use template
messages = code_review_prompt.render(
    language="python",
    code="def add(a, b): return a + b"
)
```

### Prompt Registry

```python
import yaml
from pathlib import Path

class PromptRegistry:
    def __init__(self, prompts_dir: str):
        self.prompts_dir = Path(prompts_dir)
        self.templates: dict[str, PromptTemplate] = {}
        self._load_prompts()
    
    def _load_prompts(self):
        for file in self.prompts_dir.glob("*.yaml"):
            with open(file) as f:
                data = yaml.safe_load(f)
                self.templates[data["name"]] = PromptTemplate(
                    template_str=data["template"],
                    system_prompt=data["system"]
                )
    
    def get(self, name: str) -> PromptTemplate:
        if name not in self.templates:
            raise KeyError(f"Prompt template '{name}' not found")
        return self.templates[name]

# prompts/code_review.yaml
# name: code_review
# system: "You are a senior code reviewer."
# template: |
#   Review the following {{ language }} code:
#   {{ code }}

registry = PromptRegistry("prompts")
messages = registry.get("code_review").render(language="python", code="print('hello')")
```

## Caching

### Semantic Cache with Redis

```python
import redis
import json
import hashlib
import numpy as np
from openai import AsyncOpenAI

r = redis.Redis(host="localhost", port=6379)
client = AsyncOpenAI()

async def get_embedding(text: str) -> list[float]:
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr = np.array(a)
    b_arr = np.array(b)
    return np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr))

async def cached_completion(messages: list[dict], threshold: float = 0.95) -> str:
    # Get embedding of the user query
    user_query = messages[-1]["content"]
    query_embedding = await get_embedding(user_query)
    
    # Search for similar cached queries
    cached_keys = r.keys("llm_cache:*")
    for key in cached_keys:
        cached = json.loads(r.get(key))
        similarity = cosine_similarity(query_embedding, cached["embedding"])
        if similarity > threshold:
            return cached["response"]  # Cache hit
    
    # Cache miss: call LLM
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages
    )
    result = response.choices[0].message.content
    
    # Store in cache with TTL
    cache_key = f"llm_cache:{hashlib.md5(user_query.encode()).hexdigest()}"
    r.setex(cache_key, 3600, json.dumps({
        "query": user_query,
        "embedding": query_embedding,
        "response": result
    }))
    
    return result
```

### Exact Match Cache

```python
import hashlib
import json

def exact_cache_key(messages: list[dict], model: str) -> str:
    # Hash the full message list and model
    content = json.dumps({"messages": messages, "model": model})
    return f"llm_exact:{hashlib.sha256(content.encode()).hexdigest()}"

async def exact_cached_completion(messages, model="gpt-4o"):
    key = exact_cache_key(messages, model)
    cached = r.get(key)
    if cached:
        return json.loads(cached)
    
    response = await client.chat.completions.create(model=model, messages=messages)
    result = response.choices[0].message.content
    
    r.setex(key, 3600, json.dumps(result))
    return result
```

## Guardrails

### Input Validation

```python
import re
from dataclasses import dataclass

@dataclass
class GuardrailResult:
    passed: bool
    reason: str = ""

class InputGuardrail:
    def __init__(self, max_length: int = 10000, blocked_patterns: list[str] = None):
        self.max_length = max_length
        self.blocked_patterns = [re.compile(p, re.IGNORECASE) for p in (blocked_patterns or [])]
    
    def check(self, text: str) -> GuardrailResult:
        if len(text) > self.max_length:
            return GuardrailResult(False, f"Input exceeds max length of {self.max_length}")
        
        for pattern in self.blocked_patterns:
            if pattern.search(text):
                return GuardrailResult(False, f"Input matches blocked pattern: {pattern.pattern}")
        
        return GuardrailResult(True)

# Usage
guardrail = InputGuardrail(
    max_length=5000,
    blocked_patterns=[
        r"ignore (previous|above) instructions",
        r"disregard (your|the) system prompt",
        r"reveal (your|the) (system|initial) prompt"
    ]
)

result = guardrail.check(user_input)
if not result.passed:
    return {"error": "Input rejected", "reason": result.reason}
```

### Output Filtering

```python
class OutputGuardrail:
    def __init__(self):
        self.pii_patterns = [
            (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), '[SSN REDACTED]'),
            (re.compile(r'\b\d{16}\b'), '[CARD REDACTED]'),
            (re.compile(r'\b[\w.]+@[\w]+\.\w+\b'), '[EMAIL REDACTED]'),
        ]
    
    def redact_pii(self, text: str) -> str:
        for pattern, replacement in self.pii_patterns:
            text = pattern.sub(replacement, text)
        return text
    
    def check(self, response: str) -> GuardrailResult:
        # Check for harmful content indicators
        harmful_indicators = ["how to hack", "how to steal", "how to harm"]
        lower = response.lower()
        for indicator in harmful_indicators:
            if indicator in lower:
                return GuardrailResult(False, f"Output contains harmful content: {indicator}")
        
        return GuardrailResult(True)

output_guard = OutputGuardrail()
clean_response = output_guard.redact_pii(llm_response)
check = output_guard.check(clean_response)
if not check.passed:
    return {"error": "Response filtered", "reason": check.reason}
```

## Observability

### Structured Logging

```python
import logging
import json
from datetime import datetime
from uuid import uuid4

class LLMLogger:
    def __init__(self, name: str = "llm"):
        self.logger = logging.getLogger(name)
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(message)s'))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def log_request(self, request_id: str, model: str, messages: list, **kwargs):
        self.logger.info(json.dumps({
            "event": "llm_request",
            "request_id": request_id,
            "model": model,
            "message_count": len(messages),
            "total_tokens_estimate": sum(len(m["content"]) // 4 for m in messages),
            "timestamp": datetime.utcnow().isoformat(),
            **kwargs
        }))
    
    def log_response(self, request_id: str, model: str, response: str, 
                     latency_ms: float, tokens_used: int, **kwargs):
        self.logger.info(json.dumps({
            "event": "llm_response",
            "request_id": request_id,
            "model": model,
            "latency_ms": latency_ms,
            "tokens_used": tokens_used,
            "response_length": len(response),
            "timestamp": datetime.utcnow().isoformat(),
            **kwargs
        }))
    
    def log_error(self, request_id: str, error: str, **kwargs):
        self.logger.error(json.dumps({
            "event": "llm_error",
            "request_id": request_id,
            "error": error,
            "timestamp": datetime.utcnow().isoformat(),
            **kwargs
        }))

llm_logger = LLMLogger()
```

### Metrics Collection

```python
import time
from collections import defaultdict

class LLMMetrics:
    def __init__(self):
        self.request_count = 0
        self.token_count = 0
        self.error_count = 0
        self.latencies: list[float] = []
        self.model_usage: dict[str, int] = defaultdict(int)
        self.cache_hits = 0
        self.cache_misses = 0
    
    def record_request(self, model: str, latency_ms: float, tokens: int, 
                       cached: bool = False, error: bool = False):
        self.request_count += 1
        if error:
            self.error_count += 1
        else:
            self.latencies.append(latency_ms)
            self.token_count += tokens
            self.model_usage[model] += 1
        
        if cached:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
    
    def summary(self) -> dict:
        latencies = self.latencies[-1000:]  # Last 1000 requests
        return {
            "total_requests": self.request_count,
            "total_tokens": self.token_count,
            "error_rate": self.error_count / max(self.request_count, 1),
            "avg_latency_ms": sum(latencies) / max(len(latencies), 1),
            "p95_latency_ms": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
            "cache_hit_rate": self.cache_hits / max(self.cache_hits + self.cache_misses, 1),
            "model_usage": dict(self.model_usage)
        }

metrics = LLMMetrics()
```

## Structured Output

### Function Calling for Structured Data

```python
import json
from openai import AsyncOpenAI
from pydantic import BaseModel

client = AsyncOpenAI()

class CodeReview(BaseModel):
    bugs: list[str]
    security_issues: list[str]
    improvements: list[str]
    overall_score: int  # 1-10

async def structured_code_review(code: str, language: str) -> CodeReview:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a code reviewer. Analyze the code and return structured feedback."},
            {"role": "user", "content": f"Review this {language} code:\n```\n{code}\n```"}
        ],
        response_format={"type": "json_object"}
    )
    
    data = json.loads(response.choices[0].message.content)
    return CodeReview(**data)

# Usage
review = await structured_code_review("def add(a, b): return a + b", "python")
print(f"Score: {review.overall_score}/10")
print(f"Bugs: {review.bugs}")
```

### JSON Schema Validation

```python
from pydantic import BaseModel, ValidationError
from typing import Optional

class LLMResponse(BaseModel):
    answer: str
    confidence: float
    sources: list[str] = []
    follow_up_questions: list[str] = []

async def validated_llm_call(messages: list[dict]) -> Optional[LLMResponse]:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        response_format={"type": "json_object"}
    )
    
    try:
        data = json.loads(response.choices[0].message.content)
        return LLMResponse(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        # Retry with error correction
        retry_messages = messages + [
            {"role": "assistant", "content": response.choices[0].message.content},
            {"role": "user", "content": f"Your response was invalid: {e}. Please fix and return valid JSON."}
        ]
        retry = await client.chat.completions.create(
            model="gpt-4o",
            messages=retry_messages,
            response_format={"type": "json_object"}
        )
        data = json.loads(retry.choices[0].message.content)
        return LLMResponse(**data)
```

## Error Handling and Retries

```python
import asyncio
from openai import AsyncOpenAI, RateLimitError, APIError

client = AsyncOpenAI()

async def llm_with_retry(messages, model="gpt-4o", max_retries=3):
    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages
            )
            return response.choices[0].message.content
        
        except RateLimitError:
            wait = 2 ** attempt  # Exponential backoff
            await asyncio.sleep(wait)
            continue
        
        except APIError as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            raise
    
    raise RuntimeError(f"LLM call failed after {max_retries} retries")

# Fallback to cheaper model on error
async def llm_with_fallback(messages):
    models = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
    
    for model in models:
        try:
            return await llm_with_retry(messages, model=model)
        except Exception as e:
            print(f"Model {model} failed: {e}")
            continue
    
    raise RuntimeError("All model fallbacks exhausted")
```

## Deployment Patterns

### Model Router

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

class ModelRouter:
    def __init__(self):
        self.routes = {
            "simple_qa": "gpt-4o-mini",
            "complex_reasoning": "gpt-4o",
            "code_generation": "gpt-4o",
            "summarization": "gpt-4o-mini",
            "creative_writing": "gpt-4o"
        }
    
    def classify(self, user_input: str) -> str:
        input_lower = user_input.lower()
        
        if any(w in input_lower for w in ["write code", "implement", "debug", "refactor"]):
            return "code_generation"
        elif any(w in input_lower for w in ["summarize", "summary", "tldr"]):
            return "summarization"
        elif any(w in input_lower for w in ["write a story", "poem", "creative"]):
            return "creative_writing"
        elif len(user_input) < 100:
            return "simple_qa"
        else:
            return "complex_reasoning"
    
    async def route(self, messages: list[dict]) -> str:
        user_input = messages[-1]["content"]
        category = self.classify(user_input)
        model = self.routes[category]
        
        response = await client.chat.completions.create(
            model=model,
            messages=messages
        )
        return response.choices[0].message.content

router = ModelRouter()
```

### Async Batch Processing

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def process_batch(prompts: list[str], concurrency: int = 5) -> list[str]:
    semaphore = asyncio.Semaphore(concurrency)
    
    async def process_one(prompt: str) -> str:
        async with semaphore:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
    
    tasks = [process_one(p) for p in prompts]
    return await asyncio.gather(*tasks)

# Process 100 prompts with max 5 concurrent
prompts = [f"Summarize topic {i}" for i in range(100)]
results = await process_batch(prompts, concurrency=5)
```

## Production Checklist

- [ ] Rate limiting on API endpoints
- [ ] Input/output guardrails configured
- [ ] Prompt templates versioned and stored externally
- [ ] Semantic cache for repeated queries
- [ ] Structured logging with request IDs
- [ ] Latency and token metrics collected
- [ ] Model router for cost optimization
- [ ] Fallback models configured
- [ ] Streaming responses for long outputs
- [ ] Structured output validation with retry
- [ ] PII redaction on outputs
- [ ] Cost monitoring and alerts
- [ ] Evaluation pipeline for quality checks
- [ ] Circuit breaker for LLM provider failures

## FAQ

### How do I reduce LLM costs in production?

Use a model router to send simple queries to cheaper models (gpt-4o-mini) and complex queries to expensive models (gpt-4o). Implement semantic caching to avoid redundant LLM calls. Batch process when possible. Monitor token usage and set budgets. Consider local models for high-volume, low-complexity tasks.

### What is the best way to manage prompts?

Store prompts in external files (YAML, JSON) with versioning. Use a prompt registry that loads templates at startup. Never hardcode prompts in application code. Use Jinja2 or similar templating for dynamic prompt construction. Track prompt versions alongside model versions for reproducibility.

### How do I handle LLM API failures?

Implement retry with exponential backoff for rate limit errors. Configure fallback models (gpt-4o → gpt-4o-mini → gpt-3.5-turbo). Use a circuit breaker to stop calling the API if it is consistently failing. Cache the last successful response for critical paths. Set timeouts on all LLM calls.

### Should I use streaming or batch responses?

Use streaming (SSE or WebSocket) for user-facing chat interfaces where perceived latency matters. Use batch responses for background processing, batch jobs, and non-interactive workflows. Streaming improves UX by showing tokens as they arrive. Batch is simpler to implement and parse.

### How do I evaluate LLM output quality?

Build an evaluation pipeline with automated checks: factuality scoring, hallucination detection, toxicity classification, and format validation. Use LLM-as-judge for subjective quality. Collect user feedback (thumbs up/down). Track quality metrics over time and correlate with prompt/model changes.

### What guardrails do I need?

Input guardrails: length limits, prompt injection detection, blocked patterns, PII detection. Output guardrails: PII redaction, harmful content filtering, format validation, hallucination checks. Use both rule-based and model-based guardrails. Log all guardrail rejections for auditing.
