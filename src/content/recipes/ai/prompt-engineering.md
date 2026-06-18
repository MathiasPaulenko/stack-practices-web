---
contentType: recipes
slug: prompt-engineering
title: "Apply Prompt Engineering Best Practices"
description: "How to write effective prompts for LLMs using role assignment, few-shot examples, chain-of-thought reasoning, and structured output formatting."
metaDescription: "Learn prompt engineering for LLMs. Write effective prompts with role assignment, few-shot examples, chain-of-thought reasoning, and structured output formats."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - ai-development
  - chain-of-thought
  - few-shot-learning
  - generative-ai
  - llm
  - openai
  - prompt-engineering
relatedResources:
  - /recipes/chatbot-openai
  - /recipes/rag-pipeline
  - /recipes/semantic-search
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn prompt engineering for LLMs. Write effective prompts with role assignment, few-shot examples, chain-of-thought reasoning, and structured output formats."
  keywords:
    - prompt engineering
    - llm prompts
    - few shot prompting
    - chain of thought
    - structured output
    - openai prompts
---

## Overview

Large Language Models (LLMs) are general-purpose reasoning engines, but their output quality depends heavily on how you ask the question. Prompt engineering is the practice of structuring inputs to guide the model toward accurate, relevant, and well-formatted responses. Small changes in phrasing can mean the difference between a vague paragraph and a precise JSON object.

This recipe covers the most reliable techniques: assigning a role, providing few-shot examples, requesting chain-of-thought reasoning, and constraining output format. These techniques work across GPT-4, Claude, Gemini, and open-source models like Llama.

## When to Use

Use this recipe when:

- Building applications that call LLM APIs for classification, extraction, or generation
- Debugging inconsistent or hallucinated model outputs
- Designing chatbots, copilots, or AI-powered assistants
- Implementing automated content moderation, summarization, or translation pipelines
- Evaluating prompt versions with A/B testing frameworks

## Solution

### Role Assignment (System Prompt)

```python
import openai

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a senior Python code reviewer. Be concise, focus on security and performance issues."},
        {"role": "user", "content": "Review this function: def login(email, password): ..."}
    ]
)
```

### Few-Shot Examples

```python
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Classify user intent into: SEARCH, SUPPORT, BILLING, or OTHER."},
        {"role": "user", "content": "How do I reset my password?"},
        {"role": "assistant", "content": "SUPPORT"},
        {"role": "user", "content": "Find me red running shoes under $100"},
        {"role": "assistant", "content": "SEARCH"},
        {"role": "user", "content": "I was charged twice last month"},
        {"role": "assistant", "content": "BILLING"},
        {"role": "user", "content": user_input},
    ]
)
```

### Chain-of-Thought Reasoning

```python
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Solve math problems step by step. Show your reasoning, then give the final answer on the last line prefixed with ANSWER:"},
        {"role": "user", "content": "If a train travels 120 km in 2 hours, how far will it travel in 5 hours at the same speed?"}
    ]
)
```

### Structured JSON Output

```python
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "Extract entities from the text. Respond ONLY with valid JSON matching this schema: {\"person\": string, \"organization\": string, \"location\": string}"},
        {"role": "user", "content": "Elon Musk announced that Tesla will build a new factory in Mexico."}
    ],
    response_format={"type": "json_object"}
)
```

## Explanation

- **Role assignment**: LLMs adapt tone, depth, and format based on the persona you assign. A "legal expert" gives different advice than a "friendly tutor" for the same question.
- **Few-shot learning**: Providing input/output examples in the context teaches the model your expected format without fine-tuning. Three to five examples usually suffice.
- **Chain-of-thought**: Explicitly asking the model to reason step-by-step dramatically improves accuracy on complex tasks (math, logic, multi-step planning). It also makes debugging easier because you can see where reasoning went wrong.
- **Structured output**: Constraining responses to JSON, XML, or specific formats eliminates parsing errors and makes downstream processing reliable.

## Variants

| Technique | Use Case | Cost Impact |
|-----------|----------|-------------|
| Zero-shot | Simple classification, Q&A | Low tokens |
| Few-shot | Format-specific extraction | Medium tokens |
| Chain-of-thought | Complex reasoning, math | Higher tokens |
| Function calling | Tool use, API integration | Medium tokens |

## Best Practices

- **Be specific and explicit**: vague prompts produce vague answers. Instead of "summarize this," say "summarize in 3 bullet points focusing on financial impact."
- **Use delimiters for long inputs**: wrap the user content in XML tags (`<article>...</article>`) or triple backticks so the model distinguishes instructions from data.
- **Set temperature appropriately**: use `temperature=0` for deterministic tasks (classification, extraction). Use `temperature=0.7+` for creative generation.
- **Validate and sanitize outputs**: LLMs can hallucinate, produce invalid JSON, or ignore instructions. Always parse defensively and have fallback logic.
- **Version and track prompts**: store prompts in version control. A small wording change can drastically alter output quality, and you need to be able to roll back.

## Common Mistakes

- **Overloading context**: sending 50 examples wastes tokens and can confuse the model. Curate the most relevant examples.
- **Trusting outputs without validation**: LLMs confidently generate incorrect information. Always verify facts, especially in high-stakes domains like medicine or finance.
- **Ignoring token limits**: a prompt with 10,000 tokens leaves little room for the response. Monitor token usage and truncate inputs when necessary.
- **Not handling refusals**: some queries trigger safety filters. Your application should gracefully handle refusals and partial responses.

## Frequently Asked Questions

**Q: How many few-shot examples should I include?**
A: Three to five high-quality examples usually outperform ten mediocre ones. Include edge cases and diverse phrasings.

**Q: Does prompt engineering replace fine-tuning?**
A: No. Prompt engineering is faster to iterate and requires no data preparation. Fine-tuning is better when you need consistent behavior on a specialized domain and want to reduce per-request token costs.

**Q: Can I force an LLM to always output valid JSON?**
A: OpenAI's `json_object` response format and function calling enforce JSON structure, but the model can still produce semantically incorrect or hallucinated values. Validate schema server-side.

**Q: What is the difference between temperature and top-p?**
A: Temperature controls randomness (0 = deterministic, 1 = creative). Top-p (nucleus sampling) controls diversity by limiting token selection to the most probable set summing to p. Use temperature for most applications.

