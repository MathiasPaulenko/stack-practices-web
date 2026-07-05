---
contentType: docs
slug: ai-model-selection-matrix
templateType: guideline
title: "AI Model Selection Matrix"
description: "Compare LLM models by cost, latency, context window, accuracy, and use case. Includes decision criteria, benchmark results, pricing comparison, and recommendations for classification, extraction, summarization, code, and agent tasks."
metaDescription: "Compare LLM models by cost, latency, context, accuracy. Decision criteria, benchmarks, pricing. Recommendations for classification, extraction, code, agents."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - llm
  - model-selection
  - matrix
  - benchmark
  - pricing
  - comparison
relatedResources:
  - /docs/ai/ai-llm-cost-tracking-template
  - /docs/ai/ai-llm-prompt-template-library
  - /docs/ai/ai-agent-design-document-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compare LLM models by cost, latency, context, accuracy. Decision criteria, benchmarks, pricing. Recommendations for classification, extraction, code, agents."
  keywords:
    - llm model selection
    - model comparison
    - llm pricing
    - llm benchmark
    - gpt-4o vs claude
    - model cost latency
    - ai model matrix
---

## Overview

This matrix compares LLM models across cost, latency, context window, accuracy, and task suitability. Use it to select the right model for your use case and budget. Update pricing and benchmarks as new models are released.

---

## 1. Model Comparison Table

```text
Model              | Input $/1K | Output $/1K | Context | Latency p50 | Multimodal
───────────────────┼────────────┼─────────────┼─────────┼─────────────┼───────────
GPT-4o             | $0.00250   | $0.01000    | 128K    | 800ms       | Yes
GPT-4o-mini        | $0.00015   | $0.00060    | 128K    | 300ms       | Yes
Claude 3.5 Sonnet  | $0.00300   | $0.01500    | 200K    | 1000ms      | Yes
Claude 3 Haiku     | $0.00025   | $0.00125    | 200K    | 400ms       | Yes
Llama 3.1 70B      | $0.00059   | $0.00079    | 128K    | 600ms       | No
Llama 3.1 8B       | $0.00005   | $0.00008    | 128K    | 200ms       | No
Gemini 1.5 Pro     | $0.00125   | $0.00500    | 2M      | 1200ms      | Yes
Gemini 1.5 Flash   | $0.000075  | $0.00030    | 1M      | 400ms       | Yes
Mistral Large      | $0.00200   | $0.00600    | 128K    | 700ms       | No
Mistral Small      | $0.00020   | $0.00060    | 128K    | 300ms       | No
```

---

## 2. Cost per 1000 Queries

```text
Assumptions: 1500 input tokens, 500 output tokens per query

Model              | Cost per query | Cost per 1K queries | Monthly (10K q/day)
───────────────────┼────────────────┼─────────────────────┼────────────────────
GPT-4o             | $0.00875       | $8.75               | $2,625.00
GPT-4o-mini        | $0.00053       | $0.53               | $157.50
Claude 3.5 Sonnet  | $0.01125       | $11.25              | $3,375.00
Claude 3 Haiku     | $0.00094       | $0.94               | $281.25
Llama 3.1 70B      | $0.00129       | $1.29               | $386.25
Llama 3.1 8B       | $0.00012       | $0.12               | $35.40
Gemini 1.5 Pro     | $0.00438       | $4.38               | $1,312.50
Gemini 1.5 Flash   | $0.00021       | $0.21               | $63.75
Mistral Large      | $0.00600       | $6.00               | $1,800.00
Mistral Small      | $0.00060       | $0.60               | $180.00
```

---

## 3. Task-Based Recommendations

### 3.1 Classification

```text
Task: Assign input to one of N categories
Requirements: Consistency, low cost, low latency

Recommended models (in order):
1. GPT-4o-mini     — Best cost/accuracy ratio, 128K context, fast
2. Claude 3 Haiku  — Good accuracy, slightly more expensive
3. Gemini 1.5 Flash — Cheapest option, good for simple categories
4. Llama 3.1 8B    — Self-hosted option, lowest cost

Not recommended:
- GPT-4o          — Overkill for classification, 15x more expensive
- Claude 3.5      — Overkill, 12x more expensive than mini
```

### 3.2 Information Extraction

```text
Task: Extract structured data (entities, relationships, fields) from text
Requirements: Accuracy, structured output, schema adherence

Recommended models (in order):
1. GPT-4o          — Best structured output, JSON mode, high accuracy
2. Claude 3.5      — Strong at extraction, good with complex schemas
3. GPT-4o-mini     — Good for simple extraction, 15x cheaper
4. Gemini 1.5 Pro  — Good for long-document extraction (2M context)

Considerations:
- Use JSON mode / structured output when available
- Validate output schema in application code
- For long documents (>100K tokens), use Gemini 1.5 Pro or Claude 3.5
```

### 3.3 Summarization

```text
Task: Condense long text into a shorter summary
Requirements: Accuracy, coherence, context window for long inputs

Recommended models (in order):
1. Claude 3.5 Sonnet — Best summarization quality, 200K context
2. GPT-4o            — Strong summarization, 128K context
3. Gemini 1.5 Pro    — Best for very long documents (2M context)
4. Claude 3 Haiku    — Good for short documents, lower cost

Considerations:
- For documents < 10K tokens: any model works well
- For documents 10K-100K tokens: GPT-4o or Claude 3.5
- For documents > 100K tokens: Gemini 1.5 Pro (2M context)
```

### 3.4 Code Generation and Review

```text
Task: Generate, review, or refactor code
Requirements: Code accuracy, language support, reasoning ability

Recommended models (in order):
1. Claude 3.5 Sonnet — Best code reasoning, strong at refactoring
2. GPT-4o            — Excellent code generation, broad language support
3. GPT-4o-mini       — Good for simple code tasks, lower cost
4. Llama 3.1 70B     — Good open-source option for self-hosting

Considerations:
- For complex refactoring: Claude 3.5 Sonnet
- For boilerplate generation: GPT-4o-mini
- For code review: GPT-4o (best at identifying subtle bugs)
- For self-hosting: Llama 3.1 70B with code-specific fine-tunes
```

### 3.5 RAG (Retrieval-Augmented Generation)

```text
Task: Answer questions based on retrieved context
Requirements: Faithfulness, context utilization, citation accuracy

Recommended models (in order):
1. GPT-4o            — Best faithfulness, follows context instructions well
2. Claude 3.5 Sonnet — Strong at synthesizing multiple chunks
3. Gemini 1.5 Pro    — Best for large context windows (many chunks)
4. GPT-4o-mini       — Good for simple Q&A, lower cost

Considerations:
- Faithfulness is critical — use temperature 0
- For multi-chunk synthesis: Claude 3.5 or GPT-4o
- For large context (20+ chunks): Gemini 1.5 Pro
- For cost-sensitive RAG: GPT-4o-mini with fewer chunks
```

### 3.6 Agent / Tool Use

```text
Task: Multi-step reasoning with tool calls
Requirements: Tool selection accuracy, reasoning, instruction following

Recommended models (in order):
1. Claude 3.5 Sonnet — Best tool use, strong reasoning, function calling
2. GPT-4o            — Excellent tool use, parallel function calling
3. GPT-4o-mini       — Good for simple agents (1-3 tools)
4. Llama 3.1 70B     — Open-source option with function calling

Considerations:
- For complex agents (5+ tools): Claude 3.5 or GPT-4o
- For simple agents (1-3 tools): GPT-4o-mini
- For self-hosted agents: Llama 3.1 70B
- Test tool selection accuracy before deploying
```

---

## 4. Decision Framework

```text
Step 1: What is the task type?
  Classification → Start with GPT-4o-mini
  Extraction → Start with GPT-4o
  Summarization → Start with Claude 3.5
  Code → Start with Claude 3.5
  RAG → Start with GPT-4o
  Agent → Start with Claude 3.5

Step 2: What is the input size?
  < 10K tokens → Any model works
  10K-100K tokens → GPT-4o, Claude 3.5, or Llama 3.1
  100K-500K tokens → Claude 3.5 (200K) or Gemini 1.5 Pro (2M)
  > 500K tokens → Gemini 1.5 Pro (2M context)

Step 3: What is your budget per 1000 queries?
  < $1 → GPT-4o-mini, Gemini Flash, Llama 8B
  $1-5 → GPT-4o, Gemini Pro, Llama 70B
  $5-15 → Claude 3.5, GPT-4o, Mistral Large
  > $15 → Any model (cost is not the constraint)

Step 4: Do you need to self-host?
  Yes → Llama 3.1 (8B or 70B depending on hardware)
  No → Any cloud model

Step 5: Do you need multimodal (image input)?
  Yes → GPT-4o, Claude 3.5, Gemini 1.5
  No → Any model
```

---

## 5. Benchmark Results

```text
Benchmark: MMLU (general knowledge)
Model              | Score
───────────────────┼──────
GPT-4o             | 88.7%
Claude 3.5 Sonnet  | 88.3%
Gemini 1.5 Pro     | 85.9%
Llama 3.1 70B      | 82.0%
GPT-4o-mini        | 81.0%
Claude 3 Haiku     | 75.2%
Gemini 1.5 Flash   | 77.9%
Llama 3.1 8B       | 68.5%

Benchmark: HumanEval (code generation)
Model              | Score
───────────────────┼──────
Claude 3.5 Sonnet  | 92.0%
GPT-4o             | 90.2%
Gemini 1.5 Pro     | 84.1%
Llama 3.1 70B      | 80.5%
GPT-4o-mini        | 87.0%
Claude 3 Haiku     | 75.1%

Benchmark: Tool Use (function calling accuracy)
Model              | Score
───────────────────┼──────
Claude 3.5 Sonnet  | 95.0%
GPT-4o             | 93.0%
GPT-4o-mini        | 85.0%
Llama 3.1 70B      | 78.0%
```

---

## 6. Fallback Strategy

```python
# Multi-model fallback chain
FALLBACK_CHAIN = [
    {"model": "gpt-4o", "timeout": 30, "retry": 2},
    {"model": "claude-3-5-sonnet", "timeout": 30, "retry": 1},
    {"model": "gpt-4o-mini", "timeout": 15, "retry": 1},
]

async def call_with_fallback(prompt: str, **kwargs):
    for config in FALLBACK_CHAIN:
        try:
            response = await call_llm(
                model=config["model"],
                prompt=prompt,
                timeout=config["timeout"],
                retry_count=config["retry"],
                **kwargs,
            )
            return response
        except (TimeoutError, RateLimitError, ServiceUnavailableError):
            continue  # Try next model
    
    raise Exception("All models in fallback chain failed")
```

## FAQ

### How often should I re-evaluate my model choice?

Re-evaluate quarterly. Model providers release new versions frequently, and pricing changes often. Run your test set against new models when they launch. Track cost, latency, and quality metrics over time. Switch models when a new model offers better quality at lower cost, or when your current model is deprecated.

### Should I use the same model for all tasks?

No. Different tasks have different requirements. Use cheap models (GPT-4o-mini, Claude Haiku) for simple tasks like classification and sentiment analysis. Use premium models (GPT-4o, Claude 3.5) for complex tasks like code generation, extraction, and agent reasoning. This mixed-model approach can reduce costs by 50-80% compared to using one premium model for everything.

### How do I benchmark models for my specific use case?

Create a test set of 100+ representative inputs with expected outputs. Run each model on the test set with temperature 0. Score the outputs using: (1) automated metrics (exact match, F1, BLEU), (2) LLM-as-judge for subjective quality, (3) human review for a sample. Compare cost per 1000 queries, p95 latency, and quality score. Choose the model that meets your quality threshold at the lowest cost.

### When should I self-host vs use a cloud API?

Self-host when: (1) you have strict data privacy requirements, (2) your query volume is high enough that API costs exceed GPU costs (typically 100K+ queries/day), (3) you need sub-100ms latency, (4) you need fine-grained control over the model. Use cloud APIs when: (1) query volume is low to medium, (2) you need the best available model, (3) you want to avoid infrastructure management, (4) you need multimodal capabilities that open-source models lack.

### What is the difference between GPT-4o and GPT-4o-mini?

GPT-4o is the full-capability model with the best reasoning, code generation, and complex task performance. GPT-4o-mini is a smaller, faster, cheaper variant that retains most of the capability at 15x lower cost. For most tasks (classification, simple extraction, summarization of short texts), GPT-4o-mini produces nearly identical results. Use GPT-4o for complex reasoning, long-context tasks, and high-stakes generation where quality matters more than cost.
