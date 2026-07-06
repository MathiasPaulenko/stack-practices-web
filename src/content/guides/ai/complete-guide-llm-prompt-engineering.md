---
contentType: guides
slug: complete-guide-llm-prompt-engineering
title: "Complete Guide to LLM Prompt Engineering"
description: "Write effective prompts for AI models. Covers prompt patterns, few-shot learning, chain-of-thought, RAG, system prompts, temperature tuning, function calling, and evaluation strategies."
metaDescription: "Complete guide to LLM prompt engineering. Master few-shot, chain-of-thought, RAG, system prompts, temperature tuning and evaluation for AI models."
difficulty: intermediate
topics:
  - ai
tags:
  - llm
  - prompt-engineering
  - ai
  - chatgpt
  - rag
  - chain-of-thought
  - few-shot
  - guide
  - ai
relatedResources:
  - /guides/concurrency/complete-guide-python-asyncio
  - /guides/api/complete-guide-api-versioning-strategies
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to LLM prompt engineering. Master few-shot, chain-of-thought, RAG, system prompts, temperature tuning and evaluation for AI models."
  keywords:
    - llm prompt engineering
    - prompt patterns
    - few-shot learning
    - chain of thought
    - rag retrieval augmented generation
    - system prompts
    - temperature tuning
    - function calling
---

# Complete Guide to LLM Prompt Engineering

## Introduction

Prompt engineering is the practice of designing inputs that guide Large Language Models (LLMs) to produce desired outputs. It is part art, part science — small changes in phrasing, structure, and context can dramatically affect output quality. Below is a practical guide to prompt patterns, few-shot learning, chain-of-thought reasoning, retrieval-augmented generation (RAG), system prompts, temperature tuning, function calling, and evaluation strategies.

## Prompt Anatomy

### Basic structure

```text
[System Prompt]
You are a helpful assistant that explains technical concepts clearly.

[User Message]
Explain what a closure is in JavaScript.

[Assistant Response]
A closure is a function that has access to variables in its outer scope...
```

### System prompt

The system prompt sets behavior, tone, and constraints for the entire conversation.

```python
import openai

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {
            "role": "system",
            "content": (
                "You are a senior code reviewer. "
                "Review code for bugs, performance issues, and security vulnerabilities. "
                "Be specific and provide corrected code snippets. "
                "If the code is correct, say 'No issues found.'"
            ),
        },
        {
            "role": "user",
            "content": "Review this code:\n```python\ndef get_user(id):\n    return db.query(f'SELECT * FROM users WHERE id = {id}')\n```",
        },
    ],
)
```

## Prompt Patterns

### Zero-shot

Ask the model to perform a task without examples. Works well for simple, common tasks.

```text
Classify the sentiment of this review as positive, negative, or neutral:
"The product arrived late and the quality was terrible."
```

### Few-shot

Provide examples to guide the model's output format and behavior.

```text
Classify the sentiment of each review:

Review: "Amazing product, fast delivery!"
Sentiment: positive

Review: "Worst purchase ever."
Sentiment: negative

Review: "It works as expected."
Sentiment: neutral

Review: "The product arrived late and the quality was terrible."
Sentiment:
```

### Chain-of-thought (CoT)

Ask the model to reason step-by-step before giving an answer. Improves accuracy on complex reasoning tasks.

```text
A store sells apples at $2 each and oranges at $3 each.
A customer buys 5 apples and 3 oranges.
They pay with a $50 bill.

Think step by step:
1. Calculate the cost of apples
2. Calculate the cost of oranges
3. Calculate the total cost
4. Calculate the change

Answer:
```

### Self-consistency

Run the same CoT prompt multiple times and take the majority answer.

```python
def self_consistent_answer(prompt: str, n: int = 5) -> str:
    responses = []
    for _ in range(n):
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        responses.append(response.choices[0].message.content)

    # Extract final answers and vote
    answers = [extract_answer(r) for r in responses]
    return max(set(answers), key=answers.count)
```

## Structured Output

### JSON output

```python
response = openai.chat.completions.create(
    model="gpt-4",
    response_format={"type": "json_object"},
    messages=[
        {
            "role": "system",
            "content": "You are a data extraction assistant. Always respond with valid JSON.",
        },
        {
            "role": "user",
            "content": (
                "Extract the name, age, and skills from this text:\n"
                "John is a 30-year-old software engineer who knows Python, JavaScript, and Go.\n\n"
                "Respond with JSON in this format:\n"
                '{"name": "", "age": 0, "skills": []}'
            ),
        },
    ],
)
```

### Using Pydantic for validation

```python
from pydantic import BaseModel
from typing import List
import json

class Person(BaseModel):
    name: str
    age: int
    skills: List[str]

raw_response = response.choices[0].message.content
person = Person.model_validate_json(raw_response)
print(person.name, person.age, person.skills)
```

## Retrieval-Augmented Generation (RAG)

RAG combines a retrieval system (vector database) with an LLM to ground responses in factual data.

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

def get_embedding(text: str) -> list:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding

def cosine_similarity(a: list, b: list) -> float:
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def retrieve_context(query: str, documents: list, top_k: int = 3) -> list:
    query_embedding = get_embedding(query)
    doc_embeddings = [(doc, get_embedding(doc)) for doc in documents]

    scored = [
        (doc, cosine_similarity(query_embedding, emb))
        for doc, emb in doc_embeddings
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in scored[:top_k]]

def rag_answer(query: str, documents: list) -> str:
    context = retrieve_context(query, documents)

    prompt = (
        f"Answer the question based on the following context.\n\n"
        f"Context:\n{chr(10).join(context)}\n\n"
        f"Question: {query}\n\n"
        f"Answer:"
    )

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Answer only using the provided context. If the context doesn't contain the answer, say 'I don't have enough information.'"},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content
```

## Temperature and Sampling

| Parameter | Low (0-0.3) | Medium (0.4-0.7) | High (0.8-1.0) |
|-----------|-------------|------------------|-----------------|
| Use case | Factual, code, extraction | Creative writing, summaries | Brainstorming, ideation |
| Output | Deterministic, focused | Balanced | Diverse, unpredictable |

```python
# Factual answer — low temperature
response = openai.chat.completions.create(
    model="gpt-4",
    temperature=0.0,
    messages=[{"role": "user", "content": "What is the capital of France?"}],
)

# Creative writing — high temperature
response = openai.chat.completions.create(
    model="gpt-4",
    temperature=0.9,
    messages=[{"role": "user", "content": "Write a short poem about debugging."}],
)
```

## Function Calling

```python
import json

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name"},
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["city"],
            },
        },
    }
]

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools,
)

tool_call = response.choices[0].message.tool_calls[0]
args = json.loads(tool_call.function.arguments)
print(f"City: {args['city']}")

# Call your function, then feed result back
weather_result = get_weather(args["city"])

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "What's the weather in Tokyo?"},
        response.choices[0].message,
        {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(weather_result),
        },
    ],
)
print(response.choices[0].message.content)
```

## Prompt Chaining

Break complex tasks into a sequence of prompts, where each output feeds the next.

```python
def pipeline(topic: str) -> str:
    # Step 1: Generate an outline
    outline = call_llm(f"Create a detailed outline for an article about {topic}.")

    # Step 2: Write each section
    sections = []
    for section in parse_sections(outline):
        content = call_llm(f"Write the section '{section}' for an article about {topic}. Keep it under 200 words.")
        sections.append(content)

    # Step 3: Combine and polish
    draft = "\n\n".join(sections)
    final = call_llm(f"Review and polish this article. Fix grammar and improve flow:\n\n{draft}")

    return final
```

## Evaluation

### Human evaluation rubric

```text
Score each response on a 1-5 scale:

1. Accuracy: Is the information correct?
2. Completeness: Does it address all parts of the question?
3. Clarity: Is the response clear and well-structured?
4. Relevance: Does it stay on topic without unnecessary info?
5. Safety: Is the response free of harmful content?
```

### Automated evaluation with LLM-as-judge

```python
def evaluate_response(prompt: str, response: str) -> dict:
    eval_prompt = f"""
    Rate the following AI response on a scale of 1-5 for:
    - accuracy
    - completeness
    - clarity

    User question: {prompt}
    AI response: {response}

    Respond with JSON: {{"accuracy": 0, "completeness": 0, "clarity": 0}}
    """

    result = openai.chat.completions.create(
        model="gpt-4",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": eval_prompt}],
    )
    return json.loads(result.choices[0].message.content)
```

## Best Practices

- **Be specific** — "Summarize in 3 bullet points" beats "Summarize"
- **Provide context** — tell the model what role it plays and who the audience is
- **Use examples** — few-shot prompts improve format consistency
- **Set constraints** — word count, format, tone, what to avoid
- **Use system prompts for persistent instructions** — avoids repeating in every message
- **Break complex tasks into steps** — chain prompts for better results
- **Use CoT for reasoning tasks** — "think step by step" improves accuracy
- **Set temperature appropriately** — low for factual, high for creative
- **Validate structured output** — use Pydantic or JSON schema validation
- **Test with edge cases** — empty inputs, adversarial prompts, long context
- **Version your prompts** — track changes and their impact on output quality
- **Use RAG for factual accuracy** — ground responses in your data

## Common Mistakes

- Being too vague — "write something good" gives unpredictable results
- Not providing examples — the model guesses the format
- Overloading a single prompt — too many instructions cause confusion
- Ignoring temperature — using default temperature for all tasks
- Not handling hallucinations — LLMs confidently state false information
- Trusting JSON output without validation — models produce malformed JSON
- Not testing edge cases — empty strings, very long inputs, adversarial prompts
- Using one prompt for all models — different models respond to different phrasing
- Not setting system constraints — the model may produce off-topic or unsafe content
- Forgetting context limits — long conversations exceed token windows

## Frequently Asked Questions

### What is the difference between zero-shot and few-shot prompting?

Zero-shot prompting asks the model to perform a task without any examples — it relies on the model's pre-trained knowledge. Few-shot prompting includes 2-5 examples in the prompt to demonstrate the desired format, tone, and behavior. Few-shot generally produces more consistent output, especially for formatting tasks.

### How do I prevent hallucinations?

Use RAG to ground responses in factual data. Set system prompts that instruct the model to say "I don't know" when uncertain. Use low temperature (0-0.3) for factual tasks. Cross-check important facts with external sources. Never trust LLM output for critical decisions without verification.

### Should I use GPT-4 or a smaller model?

Use GPT-4 or equivalent large models for complex reasoning, code generation, and tasks requiring high accuracy. Use smaller models (GPT-3.5, Llama 3 8B) for simple tasks like classification, formatting, and basic extraction. Smaller models are faster and cheaper — route to them when the task is simple enough.
