---




contentType: docs
slug: ai-model-selection-matrix
templateType: guideline
title: "Matriz de Seleccion de Modelos de AI"
description: "Compara modelos LLM por costo, latencia, context window, accuracy y use case. Incluye criterios de decision, resultados de benchmarks, comparacion de pricing y recomendaciones para classification, extraction, summarization, code y agent tasks."
metaDescription: "Compare LLM models by cost, latency, context, accuracy. Decision criteria, benchmarks, pricing. Recommendations for classification, extraction, code, agents."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - llm
  - model-selection
  - matriz
  - benchmark
  - pricing
  - comparison
relatedResources:
  - /docs/ai-llm-cost-tracking-template
  - /docs/ai-llm-prompt-template-library
  - /docs/ai-agent-design-document-template
  - /docs/ai-data-preparation-checklist
  - /docs/ai-prompt-version-control-template
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

Esta matriz compara LLM models across cost, latency, context window, accuracy, y task suitability. Usala para selectar el right model para tu use case y budget. Updatea pricing y benchmarks a medida que new models se releasean.

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
Task: Assignar input a uno de N categories
Requirements: Consistency, low cost, low latency

Recommended models (en order):
1. GPT-4o-mini     — Best cost/accuracy ratio, 128K context, fast
2. Claude 3 Haiku  — Good accuracy, slightly mas expensive
3. Gemini 1.5 Flash — Cheapest option, good para simple categories
4. Llama 3.1 8B    — Self-hosted option, lowest cost

Not recommended:
- GPT-4o          — Overkill para classification, 15x mas expensive
- Claude 3.5      — Overkill, 12x mas expensive que mini
```

### 3.2 Information Extraction

```text
Task: Extraer structured data (entities, relationships, fields) de text
Requirements: Accuracy, structured output, schema adherence

Recommended models (en order):
1. GPT-4o          — Best structured output, JSON mode, high accuracy
2. Claude 3.5      — Strong en extraction, good con complex schemas
3. GPT-4o-mini     — Good para simple extraction, 15x cheaper
4. Gemini 1.5 Pro  — Good para long-document extraction (2M context)

Considerations:
- Usa JSON mode / structured output cuando available
- Valida output schema en application code
- Para long documents (>100K tokens), usa Gemini 1.5 Pro o Claude 3.5
```

### 3.3 Summarization

```text
Task: Condensar long text en un shorter summary
Requirements: Accuracy, coherence, context window para long inputs

Recommended models (en order):
1. Claude 3.5 Sonnet — Best summarization quality, 200K context
2. GPT-4o            — Strong summarization, 128K context
3. Gemini 1.5 Pro    — Best para very long documents (2M context)
4. Claude 3 Haiku    — Good para short documents, lower cost

Considerations:
- Para documents < 10K tokens: any model trabaja well
- Para documents 10K-100K tokens: GPT-4o o Claude 3.5
- Para documents > 100K tokens: Gemini 1.5 Pro (2M context)
```

### 3.4 Code Generation y Review

```text
Task: Generar, reviewar, o refactorear code
Requirements: Code accuracy, language support, reasoning ability

Recommended models (en order):
1. Claude 3.5 Sonnet — Best code reasoning, strong en refactoring
2. GPT-4o            — Excellent code generation, broad language support
3. GPT-4o-mini       — Good para simple code tasks, lower cost
4. Llama 3.1 70B     — Good open-source option para self-hosting

Considerations:
- Para complex refactoring: Claude 3.5 Sonnet
- Para boilerplate generation: GPT-4o-mini
- Para code review: GPT-4o (best en identifying subtle bugs)
- Para self-hosting: Llama 3.1 70B con code-specific fine-tunes
```

### 3.5 RAG (Retrieval-Augmented Generation)

```text
Task: Answer questions basado en retrieved context
Requirements: Faithfulness, context utilization, citation accuracy

Recommended models (en order):
1. GPT-4o            — Best faithfulness, sigue context instructions well
2. Claude 3.5 Sonnet — Strong en synthesizing multiple chunks
3. Gemini 1.5 Pro    — Best para large context windows (many chunks)
4. GPT-4o-mini       — Good para simple Q&A, lower cost

Considerations:
- Faithfulness es critical — usa temperature 0
- Para multi-chunk synthesis: Claude 3.5 o GPT-4o
- Para large context (20+ chunks): Gemini 1.5 Pro
- Para cost-sensitive RAG: GPT-4o-mini con fewer chunks
```

### 3.6 Agent / Tool Use

```text
Task: Multi-step reasoning con tool calls
Requirements: Tool selection accuracy, reasoning, instruction following

Recommended models (en order):
1. Claude 3.5 Sonnet — Best tool use, strong reasoning, function calling
2. GPT-4o            — Excellent tool use, parallel function calling
3. GPT-4o-mini       — Good para simple agents (1-3 tools)
4. Llama 3.1 70B     — Open-source option con function calling

Considerations:
- Para complex agents (5+ tools): Claude 3.5 o GPT-4o
- Para simple agents (1-3 tools): GPT-4o-mini
- Para self-hosted agents: Llama 3.1 70B
- Testea tool selection accuracy antes de deployear
```

---

## 4. Decision Framework

```text
Step 1: Cuál es el task type?
  Classification → Empeza con GPT-4o-mini
  Extraction → Empeza con GPT-4o
  Summarization → Empeza con Claude 3.5
  Code → Empeza con Claude 3.5
  RAG → Empeza con GPT-4o
  Agent → Empeza con Claude 3.5

Step 2: Cuál es el input size?
  < 10K tokens → Any model trabaja
  10K-100K tokens → GPT-4o, Claude 3.5, o Llama 3.1
  100K-500K tokens → Claude 3.5 (200K) o Gemini 1.5 Pro (2M)
  > 500K tokens → Gemini 1.5 Pro (2M context)

Step 3: Cuál es tu budget per 1000 queries?
  < $1 → GPT-4o-mini, Gemini Flash, Llama 8B
  $1-5 → GPT-4o, Gemini Pro, Llama 70B
  $5-15 → Claude 3.5, GPT-4o, Mistral Large
  > $15 → Any model (cost no es el constraint)

Step 4: Necesitas self-hostear?
  Si → Llama 3.1 (8B o 70B dependiendo del hardware)
  No → Any cloud model

Step 5: Necesitas multimodal (image input)?
  Si → GPT-4o, Claude 3.5, Gemini 1.5
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

## Preguntas Frecuentes

### ¿Con qué frecuencia deberia re-evaluar mi model choice?

Re-evalua quarterly. Model providers releasean new versions frequentemente, y pricing cambia often. Corre tu test set contra new models cuando launchean. Trackea cost, latency, y quality metrics over time. Switchea models cuando un new model offerce better quality a lower cost, o cuando tu current model es deprecated.

### ¿Deberia usar el mismo model para all tasks?

No. Different tasks tienen different requirements. Usa cheap models (GPT-4o-mini, Claude Haiku) para simple tasks como classification y sentiment analysis. Usa premium models (GPT-4o, Claude 3.5) para complex tasks como code generation, extraction, y agent reasoning. Este mixed-model approach puede reduce costs by 50-80% comparado a usar un premium model para everything.

### ¿Cómo hago benchmark de models para mi specific use case?

Crea un test set de 100+ representative inputs con expected outputs. Corre cada model en el test set con temperature 0. Scorea los outputs usando: (1) automated metrics (exact match, F1, BLEU), (2) LLM-as-judge para subjective quality, (3) human review para un sample. Compara cost per 1000 queries, p95 latency, y quality score. Choosee el model que meetea tu quality threshold al lowest cost.

### ¿Cuándo deberia self-hostear vs usar un cloud API?

Self-hostea cuando: (1) tienes strict data privacy requirements, (2) tu query volume es high enough que API costs exceden GPU costs (tipicamente 100K+ queries/day), (3) necesitas sub-100ms latency, (4) necesitas fine-grained control sobre el model. Usa cloud APIs cuando: (1) query volume es low to medium, (2) necesitas el best available model, (3) queres avoid infrastructure management, (4) necesitas multimodal capabilities que open-source models no tienen.

### ¿Cuál es la diferencia entre GPT-4o y GPT-4o-mini?

GPT-4o es el full-capability model con el best reasoning, code generation, y complex task performance. GPT-4o-mini es un smaller, faster, cheaper variant que retiene most de la capability a 15x lower cost. Para most tasks (classification, simple extraction, summarization de short texts), GPT-4o-mini produce nearly identical results. Usa GPT-4o para complex reasoning, long-context tasks, y high-stakes generation donde quality mattera mas que cost.

## See Also

- [Complete Guide to LLM Prompt Engineering](/es/guides/complete-guide-llm-prompt-engineering/)
- [Complete Guide to LangChain in Production](/es/guides/complete-guide-langchain-production/)
- [Complete Guide to LLM Application Architecture](/es/guides/complete-guide-llm-application-architecture/)
- [Complete Guide to LLM Cost Optimization](/es/guides/complete-guide-llm-cost-optimization/)
- [Complete Guide to LLM Evaluation](/es/guides/complete-guide-llm-evaluation/)

