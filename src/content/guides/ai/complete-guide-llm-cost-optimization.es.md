---




contentType: guides
slug: complete-guide-llm-cost-optimization
title: "Referencia Detallada de Optimización de Costos LLM"
description: "Optimizar costos LLM en produccion. Cubre model routing, prompt compression, caching, batch API, token management, semantic caching, prompt engineering para costos, monitoring y budget control para aplicaciones LLM."
metaDescription: "Optimizar costos LLM. Cubre model routing, prompt compression, caching, batch API, token management, semantic caching, budget control."
difficulty: advanced
topics:
  - ai
  - performance
  - caching
tags:
  - llm
  - cost-optimization
  - ai
  - guia
  - caching
  - token-management
  - model-routing
  - budget
relatedResources:
  - /guides/complete-guide-openai-api-mastery
  - /guides/complete-guide-llm-application-architecture
  - /guides/complete-guide-local-llm-deployment
  - /patterns/embedding-cache-pattern
  - /guides/complete-guide-vector-databases
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Optimizar costos LLM. Cubre model routing, prompt compression, caching, batch API, token management, semantic caching, budget control."
  keywords:
    - optimizacion costos llm
    - model routing
    - prompt compression
    - llm caching
    - batch api
    - token management
    - semantic caching
    - llm budget




---

## Introducción

Los costos LLM scalean con usage — cada token cuesta dinero. En produccion, aplicaciones LLM no optimizadas pueden acumular miles de dolares por dia. La optimizacion de costos no es opcional; es un requirement de produccion. Esta guia recorre model routing, prompt compression, estrategias de caching, batch API usage, token management, y patrones de budget control que reducen costos LLM en 50-90% sin sacrificar calidad.

## Desglose de Costos

```text
Componentes de Costo LLM:
1. Input tokens: Tokens enviados al model (prompt + context)
2. Output tokens: Tokens generados por el model
3. Embedding tokens: Tokens embebidos para vector search
4. Fine-tuning: Training compute + storage
5. Image/audio: Per-image o per-minute costs

Pricing per 1M tokens (aproximado):
  gpt-4o: $2.50 input / $10.00 output
  gpt-4o-mini: $0.15 input / $0.60 output
  o1: $15.00 input / $60.00 output
  o1-mini: $3.00 input / $12.00 output
  text-embedding-3-small: $0.02 per 1M
  text-embedding-3-large: $0.13 per 1M

Cost ratio: input vs output
  gpt-4o: output es 4x mas caro que input
  gpt-4o-mini: output es 4x mas caro que input
  → Reducir output tokens ahorra mas que reducir input tokens
```

## Model Routing

### Smart Model Selection

```python
from openai import OpenAI
import re

client = OpenAI()

class ModelRouter:
    def __init__(self):
        self.routing_rules = [
            {"pattern": r"^(yes|no|true|false|\d+)$", "model": "gpt-4o-mini"},
            {"pattern": r"^(summarize|classify|extract)", "model": "gpt-4o-mini"},
            {"pattern": r"^(write|create|generate|code|debug)", "model": "gpt-4o"},
            {"pattern": r"^(analyze|reason|compare|evaluate)", "model": "gpt-4o"},
        ]
        self.default_model = "gpt-4o-mini"
    
    def select_model(self, prompt: str) -> str:
        prompt_lower = prompt.lower().strip()
        
        for rule in self.routing_rules:
            if re.search(rule["pattern"], prompt_lower):
                return rule["model"]
        
        # Token-based routing: prompts cortos usan mini
        estimated_tokens = len(prompt) // 4
        if estimated_tokens < 100:
            return "gpt-4o-mini"
        
        return self.default_model
    
    def complete(self, prompt: str, **kwargs) -> str:
        model = self.select_model(prompt)
        
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            **kwargs
        )
        
        return {
            "content": response.choices[0].message.content,
            "model": model,
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "cost": self._calculate_cost(model, response.usage.prompt_tokens, response.usage.completion_tokens)
        }
    
    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        pricing = {
            "gpt-4o": {"input": 2.50, "output": 10.00},
            "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        }
        if model not in pricing:
            return 0.0
        
        p = pricing[model]
        return (input_tokens / 1_000_000 * p["input"]) + (output_tokens / 1_000_000 * p["output"])

router = ModelRouter()

# Task simple → usa gpt-4o-mini
result = router.complete("Classify this review as positive or negative: Great product!")
print(f"Model: {result['model']}, Cost: ${result['cost']:.6f}")

# Task complejo → usa gpt-4o
result = router.complete("Write a Python function to implement quicksort with detailed comments")
print(f"Model: {result['model']}, Cost: ${result['cost']:.6f}")
```

### Cascading Model Fallback

```python
class CascadingRouter:
    """Try cheap model first, fall back a expensive si quality es insufficient."""
    
    def __init__(self, confidence_threshold: float = 0.7):
        self.confidence_threshold = confidence_threshold
        self.client = OpenAI()
    
    def complete(self, prompt: str) -> dict:
        # Try gpt-4o-mini first
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Answer the question. If you are not confident, say 'UNCERTAIN'."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        
        answer = response.choices[0].message.content
        
        if "UNCERTAIN" not in answer:
            return {
                "answer": answer,
                "model": "gpt-4o-mini",
                "cost": self._cost("gpt-4o-mini", response.usage)
            }
        
        # Fall back a gpt-4o
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        
        return {
            "answer": response.choices[0].message.content,
            "model": "gpt-4o",
            "cost": self._cost("gpt-4o", response.usage)
        }
    
    def _cost(self, model, usage):
        pricing = {"gpt-4o": (2.50, 10.00), "gpt-4o-mini": (0.15, 0.60)}
        p = pricing.get(model, (0, 0))
        return (usage.prompt_tokens / 1e6 * p[0]) + (usage.completion_tokens / 1e6 * p[1])
```

## Prompt Compression

### Tecnicas de Token Reduction

```python
class PromptOptimizer:
    @staticmethod
    def compress_system_prompt(prompt: str) -> str:
        """Remover redundancy y verbosity de system prompts."""
        # Remover filler phrases
        fillers = [
            "You are a helpful assistant.",
            "Please note that",
            "It is important to",
            "You should always",
            "Make sure to",
        ]
        for filler in fillers:
            prompt = prompt.replace(filler, "")
        
        # Collapse whitespace
        import re
        prompt = re.sub(r'\s+', ' ', prompt).strip()
        
        return prompt
    
    @staticmethod
    def truncate_context(context: str, max_tokens: int = 2000) -> str:
        """Truncar context para fit dentro de token budget."""
        # Rough estimate: 1 token ≈ 4 chars
        max_chars = max_tokens * 4
        
        if len(context) <= max_chars:
            return context
        
        # Keep beginning y end, truncate middle
        keep_start = max_chars // 2
        keep_end = max_chars // 2
        return context[:keep_start] + "\n[...truncated...]\n" + context[-keep_end:]
    
    @staticmethod
    def remove_examples(prompt: str) -> str:
        """Remover few-shot examples para cost reduction."""
        import re
        # Remover example blocks
        prompt = re.sub(r'Example \d+:.*?(?=Example \d+:|$)', '', prompt, flags=re.DOTALL)
        return prompt.strip()

# Before: 500-token system prompt
long_prompt = """
You are a helpful assistant. You should always be polite and professional.
Please note that it is important to provide accurate information.
Make sure to format your responses clearly. You should always cite sources
when possible. It is important to be concise but thorough. Please note that
you should avoid making assumptions.
"""

# After: 50-token system prompt
optimized = PromptOptimizer.compress_system_prompt(long_prompt)
print(f"Before: {len(long_prompt)} chars")
print(f"After: {len(optimized)} chars")
```

## Estrategias de Caching

### Exact Match Cache

```python
import hashlib
import json
from datetime import datetime, timedelta

class LLMCache:
    def __init__(self, ttl_hours: int = 24):
        self.cache: dict[str, dict] = {}
        self.ttl = timedelta(hours=ttl_hours)
    
    def _key(self, model: str, messages: list, **kwargs) -> str:
        data = json.dumps({"model": model, "messages": messages, **kwargs}, sort_keys=True)
        return hashlib.sha256(data.encode()).hexdigest()
    
    def get(self, model: str, messages: list, **kwargs) -> str | None:
        key = self._key(model, messages, **kwargs)
        if key in self.cache:
            entry = self.cache[key]
            if datetime.now() - entry["timestamp"] < self.ttl:
                return entry["response"]
            del self.cache[key]
        return None
    
    def set(self, model: str, messages: list, response: str, **kwargs):
        key = self._key(model, messages, **kwargs)
        self.cache[key] = {
            "response": response,
            "timestamp": datetime.now()
        }

cache = LLMCache(ttl_hours=24)

def cached_complete(prompt: str, model: str = "gpt-4o") -> str:
    messages = [{"role": "user", "content": prompt}]
    
    # Checkear cache
    cached = cache.get(model, messages)
    if cached:
        return cached
    
    # Hacer API call
    response = client.chat.completions.create(model=model, messages=messages)
    result = response.choices[0].message.content
    
    # Cachear result
    cache.set(model, messages, result)
    
    return result
```

### Semantic Cache

```python
import numpy as np
from openai import OpenAI

client = OpenAI()

class SemanticCache:
    def __init__(self, similarity_threshold: float = 0.95, max_entries: int = 1000):
        self.entries: list[dict] = []
        self.threshold = similarity_threshold
        self.max_entries = max_entries
    
    def _embed(self, text: str) -> np.ndarray:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return np.array(response.data[0].embedding)
    
    def get(self, query: str) -> str | None:
        query_embedding = self._embed(query)
        
        for entry in self.entries:
            similarity = np.dot(query_embedding, entry["embedding"]) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(entry["embedding"])
            )
            if similarity >= self.threshold:
                return entry["response"]
        
        return None
    
    def set(self, query: str, response: str):
        embedding = self._embed(query)
        
        self.entries.append({
            "query": query,
            "response": response,
            "embedding": embedding
        })
        
        # Evict oldest si over capacity
        if len(self.entries) > self.max_entries:
            self.entries.pop(0)

semantic_cache = SemanticCache(similarity_threshold=0.95)

def semantically_cached_complete(prompt: str, model: str = "gpt-4o") -> str:
    # Checkear semantic cache
    cached = semantic_cache.get(prompt)
    if cached:
        return cached  # Cache hit — no API cost
    
    # Hacer API call
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )
    result = response.choices[0].message.content
    
    # Cachear result
    semantic_cache.set(prompt, result)
    
    return result
```

## Batch API para Cost Reduction

```python
import json

class BatchProcessor:
    """Usar OpenAI Batch API para 50% cost reduction en workloads non-time-sensitive."""
    
    def __init__(self, client):
        self.client = client
    
    def prepare_batch(self, prompts: list[str], model: str = "gpt-4o-mini") -> str:
        """Preparar batch file y upload."""
        requests = []
        for i, prompt in enumerate(prompts):
            requests.append({
                "custom_id": f"task-{i}",
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}]
                }
            })
        
        # Write a JSONL
        filename = "batch_requests.jsonl"
        with open(filename, "w") as f:
            for req in requests:
                f.write(json.dumps(req) + "\n")
        
        # Upload file
        file = self.client.files.create(
            file=open(filename, "rb"),
            purpose="batch"
        )
        
        return file.id
    
    def submit_batch(self, file_id: str) -> str:
        """Submitir batch para processing."""
        batch = self.client.batches.create(
            input_file_id=file_id,
            endpoint="/v1/chat/completions",
            completion_window="24h"
        )
        return batch.id
    
    def get_results(self, batch_id: str) -> list[dict]:
        """Retrieve batch results."""
        batch = self.client.batches.retrieve(batch_id)
        
        if batch.status != "completed":
            return []
        
        results = []
        content = self.client.files.content(batch.output_file_id)
        
        for line in content.text.strip().split("\n"):
            result = json.loads(line)
            if not result.get("error"):
                content = result["response"]["body"]["choices"][0]["message"]["content"]
                results.append({
                    "custom_id": result["custom_id"],
                    "content": content
                })
        
        return results

# Uso: Procesar 1000 sentiment classifications a 50% cost
processor = BatchProcessor(client)

prompts = [f"Classify sentiment (positive/negative/neutral): {review}" for review in reviews]
file_id = processor.prepare_batch(prompts, model="gpt-4o-mini")
batch_id = processor.submit_batch(file_id)

# Results disponibles dentro de 24 horas
# results = processor.get_results(batch_id)
```

## Token Management

### Token Counting

```python
import tiktoken

class TokenManager:
    def __init__(self, model: str = "gpt-4o"):
        self.encoder = tiktoken.encoding_for_model(model)
    
    def count_tokens(self, text: str) -> int:
        return len(self.encoder.encode(text))
    
    def count_messages(self, messages: list[dict]) -> int:
        """Contar tokens en una lista de messages."""
        total = 0
        for msg in messages:
            total += 4  # Message overhead tokens
            for key, value in msg.items():
                total += len(self.encoder.encode(str(value)))
                if key == "name":
                    total -= 1  # Name tokens son mas baratos
        total += 2  # Conversation overhead
        return total
    
    def truncate_to_budget(self, text: str, max_tokens: int) -> str:
        """Truncar text para fit dentro de token budget."""
        tokens = self.encoder.encode(text)
        if len(tokens) <= max_tokens:
            return text
        
        truncated = tokens[:max_tokens]
        return self.encoder.decode(truncated) + "..."
    
    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        pricing = {
            "gpt-4o": {"input": 2.50, "output": 10.00},
            "gpt-4o-mini": {"input": 0.15, "output": 0.60},
            "o1": {"input": 15.00, "output": 60.00},
            "o1-mini": {"input": 3.00, "output": 12.00},
        }
        p = pricing.get(model, {"input": 0, "output": 0})
        return (input_tokens / 1e6 * p["input"]) + (output_tokens / 1e6 * p["output"])

tm = TokenManager()

# Contar tokens antes de enviar
prompt = "Explain Python decorators with examples"
token_count = tm.count_tokens(prompt)
print(f"Prompt tokens: {token_count}")
print(f"Estimated cost (gpt-4o): ${tm.estimate_cost('gpt-4o', token_count, 500):.6f}")
print(f"Estimated cost (gpt-4o-mini): ${tm.estimate_cost('gpt-4o-mini', token_count, 500):.6f}")
```

## Budget Control

### Per-Request Budget

```python
class BudgetController:
    def __init__(self, daily_budget: float = 10.0):
        self.daily_budget = daily_budget
        self.spent: dict[str, float] = {}  # date -> amount
        self.pricing = {
            "gpt-4o": {"input": 2.50, "output": 10.00},
            "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        }
    
    def _today(self) -> str:
        from datetime import date
        return date.today().isoformat()
    
    def can_spend(self, estimated_cost: float) -> bool:
        today = self._today()
        spent_today = self.spent.get(today, 0)
        return spent_today + estimated_cost <= self.daily_budget
    
    def record(self, model: str, input_tokens: int, output_tokens: int):
        p = self.pricing.get(model, {"input": 0, "output": 0})
        cost = (input_tokens / 1e6 * p["input"]) + (output_tokens / 1e6 * p["output"])
        
        today = self._today()
        self.spent[today] = self.spent.get(today, 0) + cost
    
    def remaining_budget(self) -> float:
        today = self._today()
        return max(0, self.daily_budget - self.spent.get(today, 0))
    
    def report(self) -> dict:
        today = self._today()
        return {
            "daily_budget": self.daily_budget,
            "spent_today": self.spent.get(today, 0),
            "remaining": self.remaining_budget(),
            "utilization": (self.spent.get(today, 0) / self.daily_budget) * 100
        }

budget = BudgetController(daily_budget=10.0)

# Antes de hacer un call, checkear budget
estimated_cost = 0.02  # Estimate basado en token count
if budget.can_spend(estimated_cost):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Explain quantum computing"}]
    )
    budget.record("gpt-4o", response.usage.prompt_tokens, response.usage.completion_tokens)
    print(budget.report())
else:
    print("Daily budget exceeded. Usando cheaper model o cache.")
```

## Cost Monitoring Dashboard

```python
from dataclasses import dataclass, field
from datetime import datetime
import json

@dataclass
class CostMetric:
    timestamp: float
    model: str
    input_tokens: int
    output_tokens: int
    cost: float
    endpoint: str
    user_id: str = ""

class CostMonitor:
    def __init__(self):
        self.metrics: list[CostMetric] = []
    
    def record(self, model: str, input_tokens: int, output_tokens: int, endpoint: str = "chat", user_id: str = ""):
        pricing = {
            "gpt-4o": (2.50, 10.00),
            "gpt-4o-mini": (0.15, 0.60),
            "o1": (15.00, 60.00),
        }
        p = pricing.get(model, (0, 0))
        cost = (input_tokens / 1e6 * p[0]) + (output_tokens / 1e6 * p[1])
        
        self.metrics.append(CostMetric(
            timestamp=time.time(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=cost,
            endpoint=endpoint,
            user_id=user_id
        ))
    
    def summary(self, hours: int = 24) -> dict:
        cutoff = time.time() - hours * 3600
        recent = [m for m in self.metrics if m.timestamp >= cutoff]
        
        if not recent:
            return {"total_cost": 0, "total_calls": 0}
        
        by_model = {}
        by_user = {}
        for m in recent:
            by_model[m.model] = by_model.get(m.model, 0) + m.cost
            if m.user_id:
                by_user[m.user_id] = by_user.get(m.user_id, 0) + m.cost
        
        return {
            "period_hours": hours,
            "total_cost": sum(m.cost for m in recent),
            "total_calls": len(recent),
            "total_input_tokens": sum(m.input_tokens for m in recent),
            "total_output_tokens": sum(m.output_tokens for m in recent),
            "avg_cost_per_call": sum(m.cost for m in recent) / len(recent),
            "by_model": by_model,
            "by_user": by_user,
        }
    
    def alert_if_over(self, threshold: float) -> bool:
        summary = self.summary(hours=1)
        return summary["total_cost"] > threshold

import time
monitor = CostMonitor()

# Record API calls
monitor.record("gpt-4o", 1500, 800, "chat", "user_123")
monitor.record("gpt-4o-mini", 200, 100, "classify", "user_456")

print(json.dumps(monitor.summary(24), indent=2))
```

## Preguntas Frecuentes

### ¿Cuánto puedo ahorrar con model routing?

Routeando 50% de requests a gpt-4o-mini en lugar de gpt-4o ahorra aproximadamente 90% en esos requests. Si 50% de tu traffic son tasks simples (classification, extraction, short answers), puedes reducir overall costs en 40-50%. Mide tu task distribution para estimar savings.

### ¿Vale la pena el semantic caching por el embedding cost?

Si, para aplicaciones high-traffic. Embeber un query cuesta ~$0.00000002 (text-embedding-3-small). Un cached gpt-4o response ahorra ~$0.01-0.05. Necesitas un cache hit rate de solo 0.1% para break even. Para aplicaciones con queries repetidas (FAQ bots, documentation search), cache hit rates de 10-30% son comunes, yielding massive savings.

### ¿Debería usar el Batch API?

Usa el Batch API para cualquier workload que no necesita real-time responses. Cuesta 50% menos y maneja hasta 50,000 requests por batch. Buenos use cases: bulk classification, data enrichment, content generation, report creation. No suitable para interactive chat, real-time recommendations, o user-facing responses.

### ¿Cómo seteo max_tokens para controlar costos?

Setea max_tokens basado en tu expected output length. Para classification: 10 tokens. Para summaries: 200 tokens. Para code generation: 1000 tokens. Para detailed explanations: 500 tokens. Setear max_tokens muy bajo trunca responses. Setearlo muy alto wastea dinero si el model genera contenido innecesario.

### ¿Cuál es la forma mas barata de hacer RAG?

Usa gpt-4o-mini para el generation step (no gpt-4o). Usa text-embedding-3-small para embeddings (no large). Cachea embedding results. Pre-computa embeddings para tu document corpus en lugar de re-embeber en cada query. Usa pgvector en lugar de managed vector databases para small-to-medium datasets. Limita retrieved chunks a 3-5 para reducir context tokens.

### ¿Cómo manejo budget overruns?

Implementa un BudgetController que trackee daily spending. Checkea budget antes de cada API call. Cuando budget esta bajo, routea a cheaper models o usa cached responses. Setea alerts al 50%, 80%, y 100% de budget. Considera per-user budgets para multi-tenant applications. Implementa circuit breakers que stop API calls cuando budget esta exhausted.

## See Also

- [Complete Guide to LLM Application Architecture](/es/guides/complete-guide-llm-application-architecture/)
- [Complete Guide to LLM Evaluation](/es/guides/complete-guide-llm-evaluation/)
- [Complete Guide to OpenAI API Mastery](/es/guides/complete-guide-openai-api-mastery/)
- [Complete Guide to GraphQL Caching](/es/guides/complete-guide-graphql-caching/)
- [Complete Guide to Application-Level Caching](/es/guides/complete-guide-application-level-caching/)

