---





contentType: patterns
slug: llm-router-pattern
title: "LLM Router Pattern"
description: "Route queries to different LLM models based on complexity, cost, and latency requirements. Classify input before dispatching to the right model."
metaDescription: "Route LLM queries by complexity to the right model. Reduce costs by sending simple queries to small models and complex ones to large models."
difficulty: intermediate
topics:
  - ai
tags:
  - llm-router
  - pattern
  - ai-pattern
  - cost-optimization
  - model-selection
  - llm
  - routing
relatedResources:
  - /patterns/llm-fallback-pattern
  - /patterns/prompt-chaining-pattern
  - /recipes/python-openai-function-calling-structured
  - /patterns/embedding-cache-pattern
  - /patterns/agent-tool-selection-pattern
  - /patterns/llm-guardrails-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Route LLM queries by complexity to the right model. Reduce costs by sending simple queries to small models and complex ones to large models."
  keywords:
    - llm router pattern
    - model routing
    - ai pattern
    - llm cost optimization
    - model selection
    - query classification
    - gpt routing





---

# LLM Router Pattern

## Overview

The LLM Router Pattern classifies incoming queries by complexity and dispatches each to the most cost-effective model that can handle it. Simple questions like "what is 2+2" do not need GPT-4 or Claude Opus. Complex reasoning tasks like "analyze this legal contract for risk clauses" should not go to a small model that will produce shallow output.

A router sits between the user and the model providers. It inspects the query, applies a classification rule (rules-based, embedding similarity, or a small classifier model), and selects a model from a configured pool. The response flows back through the same path.

## When to Use


- For alternatives, see [Embedding Cache Pattern](/patterns/embedding-cache-pattern/).

Use the LLM Router Pattern when:
- You serve a mix of simple and complex queries and want to cut costs on the simple ones
- Different models in your stack have different latency profiles and you need to optimize response time
- You want graceful degradation when a primary model is overloaded or rate-limited
- Your application has distinct query categories (summarization, code generation, factual Q&A) that map to different model strengths
- Examples: chatbots, customer support automation, code assistants, content generation pipelines

## Solution

### Python

```python
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional
import re

@dataclass
class ModelConfig:
    name: str
    max_tokens: int
    cost_per_1k: float
    latency_ms: int

@dataclass
class Query:
    text: str
    category: str = ""
    complexity: str = ""

@dataclass
class Response:
    model: str
    content: str
    tokens_used: int
    cost: float

MODELS = {
    "small": ModelConfig("gpt-4o-mini", 4096, 0.00015, 200),
    "medium": ModelConfig("gpt-4o", 8192, 0.005, 500),
    "large": ModelConfig("o1-preview", 16384, 0.015, 2000),
}

def classify_complexity(query: Query) -> str:
    """Classify query complexity using heuristics."""
    text = query.text.lower()
    word_count = len(query.text.split())

    simple_patterns = [
        r"^\s*(what|who|when|where|is|are|can|do)\s",
        r"calculate|convert|format|translate",
        r"summarize|rewrite|paraphrase",
    ]

    complex_patterns = [
        r"analyze|design|architect|compare|evaluate",
        r"debug|refactor|optimize|review",
        r"step.by.step|detailed|thorough",
        r"legal|medical|financial|security",
    ]

    for pattern in complex_patterns:
        if re.search(pattern, text):
            return "high"

    if word_count > 100:
        return "high"

    for pattern in simple_patterns:
        if re.search(pattern, text):
            return "low"

    if word_count < 20:
        return "low"

    return "medium"

def route_to_model(complexity: str) -> str:
    """Map complexity level to model tier."""
    mapping = {"low": "small", "medium": "medium", "high": "large"}
    return mapping.get(complexity, "medium")

def mock_generate(model: ModelConfig, prompt: str) -> Response:
    """Simulate model generation."""
    tokens = min(len(prompt.split()) * 2, model.max_tokens)
    cost = (tokens / 1000) * model.cost_per_1k
    return Response(
        model=model.name,
        content=f"[{model.name}] Response to: {prompt[:50]}...",
        tokens_used=tokens,
        cost=cost,
    )

class LLMRouter:
    def __init__(self, models: Dict[str, ModelConfig]):
        self.models = models

    def handle(self, query_text: str) -> Response:
        query = Query(text=query_text)
        query.complexity = classify_complexity(query)
        model_key = route_to_model(query.complexity)
        model = self.models[model_key]
        print(f"Query complexity: {query.complexity} -> Model: {model.name}")
        return mock_generate(model, query_text)

# Usage
router = LLMRouter(MODELS)

queries = [
    "What is the capital of France?",
    "Analyze this contract for liability clauses and suggest revisions",
    "Convert 100 degrees Celsius to Fahrenheit",
    "Design a microservices architecture for an e-commerce platform with 10M users",
]

for q in queries:
    response = router.handle(q)
    print(f"  Model: {response.model}, Cost: ${response.cost:.6f}")
```

### JavaScript

```javascript
class ModelConfig {
  constructor(name, maxTokens, costPer1k, latencyMs) {
    this.name = name;
    this.maxTokens = maxTokens;
    this.costPer1k = costPer1k;
    this.latencyMs = latencyMs;
  }
}

const MODELS = {
  small: new ModelConfig("gpt-4o-mini", 4096, 0.00015, 200),
  medium: new ModelConfig("gpt-4o", 8192, 0.005, 500),
  large: new ModelConfig("o1-preview", 16384, 0.015, 2000),
};

function classifyComplexity(text) {
  const lower = text.toLowerCase();
  const wordCount = text.split(" ").length;

  const complexPatterns = [
    /analyze|design|architect|compare|evaluate/,
    /debug|refactor|optimize|review/,
    /step.by.step|detailed|thorough/,
    /legal|medical|financial|security/,
  ];

  const simplePatterns = [
    /^\s*(what|who|when|where|is|are|can|do)\s/,
    /calculate|convert|format|translate/,
    /summarize|rewrite|paraphrase/,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(lower)) return "high";
  }

  if (wordCount > 100) return "high";

  for (const pattern of simplePatterns) {
    if (pattern.test(lower)) return "low";
  }

  if (wordCount < 20) return "low";

  return "medium";
}

function routeToModel(complexity) {
  const mapping = { low: "small", medium: "medium", high: "large" };
  return mapping[complexity] || "medium";
}

function mockGenerate(model, prompt) {
  const tokens = Math.min(prompt.split(" ").length * 2, model.maxTokens);
  const cost = (tokens / 1000) * model.costPer1k;
  return {
    model: model.name,
    content: `[${model.name}] Response to: ${prompt.slice(0, 50)}...`,
    tokensUsed: tokens,
    cost,
  };
}

class LLMRouter {
  constructor(models) {
    this.models = models;
  }

  handle(queryText) {
    const complexity = classifyComplexity(queryText);
    const modelKey = routeToModel(complexity);
    const model = this.models[modelKey];
    console.log(`Complexity: ${complexity} -> Model: ${model.name}`);
    return mockGenerate(model, queryText);
  }
}

// Usage
const router = new LLMRouter(MODELS);

const queries = [
  "What is the capital of France?",
  "Analyze this contract for liability clauses and suggest revisions",
  "Convert 100 degrees Celsius to Fahrenheit",
  "Design a microservices architecture for an e-commerce platform with 10M users",
];

for (const q of queries) {
  const response = router.handle(q);
  console.log(`  Model: ${response.model}, Cost: $${response.cost.toFixed(6)}`);
}
```

### Java

```java
import java.util.*;
import java.util.regex.Pattern;

public class LLMRouter {

    record ModelConfig(String name, int maxTokens, double costPer1k, int latencyMs) {}

    static final Map<String, ModelConfig> MODELS = Map.of(
        "small", new ModelConfig("gpt-4o-mini", 4096, 0.00015, 200),
        "medium", new ModelConfig("gpt-4o", 8192, 0.005, 500),
        "large", new ModelConfig("o1-preview", 16384, 0.015, 2000)
    );

    static final List<Pattern> COMPLEX_PATTERNS = List.of(
        Pattern.compile("analyze|design|architect|compare|evaluate", Pattern.CASE_INSENSITIVE),
        Pattern.compile("debug|refactor|optimize|review", Pattern.CASE_INSENSITIVE),
        Pattern.compile("step.by.step|detailed|thorough", Pattern.CASE_INSENSITIVE),
        Pattern.compile("legal|medical|financial|security", Pattern.CASE_INSENSITIVE)
    );

    static final List<Pattern> SIMPLE_PATTERNS = List.of(
        Pattern.compile("^\\s*(what|who|when|where|is|are|can|do)\\s", Pattern.CASE_INSENSITIVE),
        Pattern.compile("calculate|convert|format|translate", Pattern.CASE_INSENSITIVE),
        Pattern.compile("summarize|rewrite|paraphrase", Pattern.CASE_INSENSITIVE)
    );

    static String classifyComplexity(String text) {
        int wordCount = text.split(" ").length;

        for (Pattern p : COMPLEX_PATTERNS) {
            if (p.matcher(text).find()) return "high";
        }

        if (wordCount > 100) return "high";

        for (Pattern p : SIMPLE_PATTERNS) {
            if (p.matcher(text).find()) return "low";
        }

        if (wordCount < 20) return "low";

        return "medium";
    }

    static String routeToModel(String complexity) {
        return switch (complexity) {
            case "low" -> "small";
            case "high" -> "large";
            default -> "medium";
        };
    }

    record Response(String model, String content, int tokensUsed, double cost) {}

    static Response mockGenerate(ModelConfig model, String prompt) {
        int tokens = Math.min(prompt.split(" ").length * 2, model.maxTokens());
        double cost = (tokens / 1000.0) * model.costPer1k();
        return new Response(
            model.name(),
            "[" + model.name() + "] Response to: " +
                prompt.substring(0, Math.min(50, prompt.length())) + "...",
            tokens, cost
        );
    }

    public Response handle(String queryText) {
        String complexity = classifyComplexity(queryText);
        String modelKey = routeToModel(complexity);
        ModelConfig model = MODELS.get(modelKey);
        System.out.printf("Complexity: %s -> Model: %s%n", complexity, model.name());
        return mockGenerate(model, queryText);
    }

    public static void main(String[] args) {
        var router = new LLMRouter();
        String[] queries = {
            "What is the capital of France?",
            "Analyze this contract for liability clauses and suggest revisions",
            "Convert 100 degrees Celsius to Fahrenheit",
            "Design a microservices architecture for an e-commerce platform with 10M users"
        };

        for (String q : queries) {
            Response r = router.handle(q);
            System.out.printf("  Model: %s, Cost: $%.6f%n", r.model(), r.cost());
        }
    }
}
```

## Explanation

The router operates in three steps:

1. **Classification**: Inspect the query text using heuristics (regex patterns, word count), an embedding-based classifier, or a small language model. Assign a complexity level: low, medium, or high.
2. **Routing**: Map the complexity level to a model from the configured pool. Low complexity goes to a cheap, fast model. High complexity goes to a capable, slower model.
3. **Generation**: Forward the query to the selected model and return the response.

The classification step is the critical component. Rules-based classification is fast and free but limited. A small classifier model (like a fine-tuned BERT or even a small LLM with structured output) provides better accuracy at a fraction of the cost of always using the large model.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Embedding classifier** | Compare query embedding to category centroids | More accurate than rules, still cheap |
| **Small LLM classifier** | Use a small LLM to classify before routing | Highest accuracy, small overhead cost |
| **Cascade with fallback** | Try small model first, escalate if confidence is low | Reduces cost while maintaining quality |
| **Category-based routing** | Route by task type (code, summary, translation) | Different models excel at different tasks |

## What Works

- **Start with rules, then upgrade** — regex heuristics are free and cover 70-80% of cases
- **Log routing decisions** — track which model handled each query and user satisfaction to refine rules
- **Set cost budgets per query** — reject or downgrade if a query would exceed a cost threshold
- **Cache simple responses** — if the same simple question is asked repeatedly, cache the small model's answer
- **Add a manual override** — let users force a specific model for important queries
- **Monitor model drift** — model updates can change output quality; re-evaluate routing rules periodically

## Common Mistakes

- Over-classifying queries as complex, sending everything to the expensive model and negating savings
- Using a single heuristic (word count) without semantic analysis, missing nuanced complexity
- Not handling model outages — if the large model is down, the router should fall back to medium
- Routing based on user tier instead of query complexity, causing quality inconsistency
- Not measuring routing accuracy — without feedback loops, bad routing rules persist

## Frequently Asked Questions

**Q: How much cost can I save with an LLM router?**
A: Typically 40-70% for applications with mixed query complexity. If 80% of queries are simple and you route them to a model that costs 30x less, the savings compound quickly.

**Q: Should I use a separate model for classification?**
A: For production systems, yes. A small model (like a fine-tuned classifier or even embeddings + cosine similarity) is more accurate than regex and costs pennies per classification. Rules are fine for prototyping.

**Q: What if the router misclassifies a complex query as simple?**
A: The small model will produce a shallow or incorrect response. Mitigate this with a confidence check — if the small model's response is too short or low-quality, re-route to a larger model. This is the cascade variant.

**Q: Can I route based on user context instead of query text?**
A: Yes. You can factor in user tier, conversation history, or session metadata. For example, a paid user asking a complex question might always get the large model, while a free user gets routed by complexity.
