---
contentType: docs
slug: ai-llm-cost-tracking-template
templateType: capacity-planning
title: "AI LLM Cost Tracking Template"
description: "Track token usage and costs per feature, model, and user. Includes cost categories, pricing tables, budget alerts, optimization strategies, and reporting templates for LLM API spending."
metaDescription: "Track LLM token usage and costs per feature, model, user. Includes pricing tables, budget alerts, optimization strategies, and reporting templates."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - llm
  - cost-tracking
  - template
  - budget
  - tokens
  - optimization
relatedResources:
  - /docs/ai/ai-model-selection-matrix
  - /docs/ai/ai-llm-prompt-template-library
  - /docs/ai/ai-llm-incident-response-runbook
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Track LLM token usage and costs per feature, model, user. Includes pricing tables, budget alerts, optimization strategies, and reporting templates."
  keywords:
    - llm cost tracking
    - token usage
    - ai budget
    - api cost optimization
    - llm pricing
    - cost per query
    - token budget
---

## Overview

This template tracks LLM API costs across features, models, and users. Use it to monitor spending, set budgets, identify cost drivers, and optimize token usage. Adapt the categories and thresholds to your organization.

---

## 1. Pricing Reference Table

Update this table with current pricing from your providers.

```text
Model              | Input ($/1K tok) | Output ($/1K tok) | Context window
───────────────────┼──────────────────┼───────────────────┼───────────────
GPT-4o             | $0.00250         | $0.01000          | 128K
GPT-4o-mini        | $0.00015         | $0.00060          | 128K
Claude 3.5 Sonnet  | $0.00300         | $0.01500          | 200K
Claude 3 Haiku     | $0.00025         | $0.00125          | 200K
Llama 3.1 70B      | $0.00059         | $0.00079          | 128K
Gemini 1.5 Pro     | $0.00125         | $0.00500          | 2M
Gemini 1.5 Flash   | $0.000075        | $0.00030          | 1M

Embedding models:
text-embedding-3-small | $0.00002 / 1K tokens
text-embedding-3-large | $0.00013 / 1K tokens
```

---

## 2. Cost Tracking Schema

### Per-Request Log

```json
{
  "request_id": "req_abc123",
  "timestamp": "2026-07-04T10:30:00Z",
  "feature": "chat-completion",
  "user_id": "user_456",
  "model": "gpt-4o",
  "prompt_tokens": 1250,
  "completion_tokens": 450,
  "total_tokens": 1700,
  "input_cost": 0.003125,
  "output_cost": 0.0045,
  "total_cost": 0.007625,
  "latency_ms": 1200,
  "status": "success"
}
```

### Daily Aggregation

```json
{
  "date": "2026-07-04",
  "feature": "chat-completion",
  "model": "gpt-4o",
  "total_requests": 1500,
  "total_prompt_tokens": 1875000,
  "total_completion_tokens": 675000,
  "total_tokens": 2550000,
  "total_cost": 11.34,
  "avg_cost_per_request": 0.00756,
  "avg_latency_ms": 1150,
  "error_count": 12,
  "unique_users": 340
}
```

---

## 3. Cost by Feature

Track which features consume the most budget.

```text
Feature              | Model         | Daily cost | Monthly est | % of budget
─────────────────────┼───────────────┼────────────┼─────────────┼────────────
Chat completion      | GPT-4o        | $11.34     | $340.20     | 45%
Document Q&A (RAG)   | GPT-4o        | $7.82      | $234.60     | 31%
Code review          | Claude 3.5    | $3.45      | $103.50     | 14%
Text classification  | GPT-4o-mini   | $0.89      | $26.70      | 4%
Embedding generation | text-emb-3-sm | $0.42      | $12.60      | 2%
Sentiment analysis   | GPT-4o-mini   | $0.31      | $9.30       | 2%
Image description    | GPT-4o        | $1.23      | $36.90      | 2%
─────────────────────┴───────────────┴────────────┴─────────────┴────────────
Total                                | $25.46     | $763.80     | 100%
```

---

## 4. Cost by User

Identify power users and potential abuse.

```text
User tier    | Users | Daily cost | Cost/user | % of cost
─────────────┼───────┼────────────┼───────────┼──────────
Free tier    | 2800  | $4.20      | $0.0015   | 16%
Pro tier     | 340   | $14.85     | $0.0437   | 58%
Enterprise   | 12    | $5.80      | $0.4833   | 23%
Internal     | 8     | $0.61      | $0.0763   | 3%
─────────────┴───────┴────────────┴───────────┴──────────
Total        | 3160  | $25.46     |            | 100%
```

---

## 5. Budget Configuration

```yaml
# budget_config.yaml
monthly_budget: 1000.00  # USD
alert_thresholds:
  - percentage: 50
    action: "notify"
    recipients: ["ai-team@company.com"]
  - percentage: 75
    action: "notify"
    recipients: ["ai-team@company.com", "finance@company.com"]
  - percentage: 90
    action: "notify"
    recipients: ["ai-team@company.com", "finance@company.com", "cto@company.com"]
  - percentage: 100
    action: "throttle"
    message: "Monthly LLM budget exceeded. Non-critical features disabled."
    disabled_features:
      - sentiment-analysis
      - image-description

per_feature_budgets:
  chat-completion: 400.00
  document-qa: 300.00
  code-review: 150.00
  text-classification: 50.00
  embedding-generation: 50.00
  sentiment-analysis: 30.00
  image-description: 20.00

per_user_limits:
  free-tier:
    daily_cost: 0.05
    daily_requests: 50
  pro-tier:
    daily_cost: 1.00
    daily_requests: 500
  enterprise:
    daily_cost: 10.00
    daily_requests: 5000
```

---

## 6. Cost Optimization Strategies

### 6.1 Model Downgrading

```text
When to downgrade:
  - Classification tasks → GPT-4o-mini (15x cheaper than GPT-4o)
  - Simple extraction → GPT-4o-mini or Claude 3 Haiku
  - Embedding generation → text-embedding-3-small (6x cheaper than large)
  - Short responses → smaller model with lower latency

Before downgrading:
  1. Run A/B test with 1000 requests on both models
  2. Compare output quality (accuracy, faithfulness, relevance)
  3. Measure cost savings
  4. If quality drop < 3% and savings > 50%, downgrade
```

### 6.2 Prompt Compression

```text
Techniques:
  - Remove redundant instructions
  - Use concise system prompts
  - Compress few-shot examples (shorter examples)
  - Remove unnecessary context from RAG (fewer chunks)
  - Use structured prompts (JSON instead of natural language)

Impact:
  - 20-40% token reduction is common
  - Direct cost savings on input tokens
  - Faster response times
```

### 6.3 Caching

```python
import hashlib
import redis
import json

r = redis.Redis(host="localhost", port=6379)

def cached_llm_call(prompt: str, model: str = "gpt-4o", ttl: int = 3600):
    cache_key = f"llm:{model}:{hashlib.sha256(prompt.encode()).hexdigest()}"
    
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached), 0.0  # Cache hit — no cost
    
    response = openai_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    
    result = response.choices[0].message.content
    cost = calculate_cost(model, response.usage)
    
    r.setex(cache_key, ttl, json.dumps(result))
    return result, cost

# Cache hit rate tracking
cache_hits = 0
cache_misses = 0

def track_cache(hit: bool):
    global cache_hits, cache_misses
    if hit:
        cache_hits += 1
    else:
        cache_misses += 1

# Monthly savings = cache_hits * avg_cost_per_request
```

### 6.4 Batch Processing

```python
# Batch API (50% discount on most providers)
def batch_process(prompts: list[str], model: str = "gpt-4o"):
    # OpenAI Batch API
    import openai
    client = openai.OpenAI()
    
    # Create batch file
    requests = [
        {
            "custom_id": f"req-{i}",
            "method": "post",
            "url": "/v1/chat/completions",
            "body": {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
            }
        }
        for i, prompt in enumerate(prompts)
    ]
    
    # Upload and submit batch
    # 50% discount, 24-hour turnaround
    # Good for non-real-time workloads
```

---

## 7. Monthly Report Template

```markdown
# LLM Cost Report — [Month Year]

## Summary
- Total spend: $[amount]
- Budget: $[budget]
- Budget utilization: [X]%
- Cost per active user: $[amount]
- Total requests: [count]
- Average cost per request: $[amount]

## Cost by Feature
| Feature | Spend | % | MoM change |
|---------|-------|---|------------|
| [feature] | $[x] | [x]% | [+/-X%] |

## Cost by Model
| Model | Spend | % | Requests |
|-------|-------|---|----------|
| [model] | $[x] | [x]% | [count] |

## Top 10 Users by Cost
| User | Spend | Requests | Avg cost/req |
|------|-------|----------|-------------|
| [user] | $[x] | [count] | $[x] |

## Optimization Actions Taken
- [action 1]: saved $[x]/month
- [action 2]: saved $[x]/month

## Recommendations
- [recommendation 1]
- [recommendation 2]

## Alerts Triggered
- [alert]: [date] — [description]
```

---

## 8. Monitoring Script

```python
import datetime
import json
from collections import defaultdict

class LLMCostMonitor:
    def __init__(self, budget_config: dict):
        self.config = budget_config
        self.daily_spend = defaultdict(float)
        self.feature_spend = defaultdict(lambda: defaultdict(float))
    
    def record(self, request: dict):
        date = request["timestamp"][:10]
        cost = request["total_cost"]
        feature = request["feature"]
        
        self.daily_spend[date] += cost
        self.feature_spend[date][feature] += cost
    
    def check_budget(self, date: str) -> dict:
        monthly_spend = sum(
            spend for d, spend in self.daily_spend.items()
            if d.startswith(date[:7])
        )
        budget = self.config["monthly_budget"]
        utilization = monthly_spend / budget
        
        alerts = []
        for threshold in self.config["alert_thresholds"]:
            if utilization >= threshold["percentage"] / 100:
                alerts.append({
                    "threshold": threshold["percentage"],
                    "action": threshold["action"],
                    "spend": monthly_spend,
                    "budget": budget,
                })
        
        return {
            "monthly_spend": monthly_spend,
            "budget": budget,
            "utilization": utilization,
            "alerts": alerts,
        }
    
    def daily_report(self, date: str) -> dict:
        return {
            "date": date,
            "total_spend": self.daily_spend[date],
            "by_feature": dict(self.feature_spend[date]),
        }
```

## FAQ

### How do I estimate LLM costs before launching a feature?

Calculate expected cost per request: (avg input tokens × input price) + (avg output tokens × output price). Multiply by expected daily requests. Add 20% buffer for variance. For a chat feature with 1500 input tokens and 500 output tokens on GPT-4o: (1500/1000 × $0.0025) + (500/1000 × $0.01) = $0.00375 + $0.005 = $0.00875 per request. At 1000 requests/day: $8.75/day, $262.50/month.

### What is a reasonable cost per user for an AI feature?

For free-tier users, target under $0.01 per day per user. Use cheaper models (GPT-4o-mini, Claude 3 Haiku) and aggressive caching. For pro-tier users, $0.05-0.50 per day is typical. For enterprise, $1-5 per day per user depending on usage intensity. Monitor cost per user weekly and adjust model selection or rate limits if costs exceed targets.

### Should I pass LLM API costs to my customers?

If LLM costs are a significant fraction of your per-user cost, consider usage-based pricing. Offer a free tier with daily limits, a pro tier with higher limits, and an enterprise tier with custom pricing. Track cost per user per tier and ensure your pricing covers the LLM cost plus margin. Alternatively, use cheaper models for free users and premium models for paid users.

### How do I reduce costs without sacrificing quality?

Start with caching — identical queries should never hit the LLM twice. Then evaluate model downgrading for simple tasks (classification, extraction). Use the batch API for non-real-time workloads (50% discount). Compress prompts by removing redundant instructions. Reduce RAG context window (fewer retrieved chunks). Set per-user rate limits to prevent abuse. Monitor cost per request and set alerts for anomalies.

### What causes unexpected cost spikes?

Common causes: (1) a user sending very long prompts, (2) a bug causing repeated retries, (3) RAG retrieving too many chunks, (4) a model upgrade without updating pricing calculations, (5) increased traffic from a single user or bot, (6) forgotten test scripts running in production. Set per-request cost alerts (> $0.50), per-user daily limits, and per-feature budget caps to catch spikes early.
