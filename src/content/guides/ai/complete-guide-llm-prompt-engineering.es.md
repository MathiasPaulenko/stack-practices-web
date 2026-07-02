---
contentType: guides
slug: complete-guide-llm-prompt-engineering
title: "Guía Completa de LLM Prompt Engineering"
description: "Escribe prompts efectivos para modelos de IA. Cubre patrones de prompts, few-shot learning, chain-of-thought, RAG, system prompts, temperature tuning, function calling y evaluación."
metaDescription: "Guía completa de LLM prompt engineering. Master few-shot, chain-of-thought, RAG, system prompts, temperature tuning y evaluación para modelos de IA."
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
  - /guides/ai/building-llm-applications-guide
  - /guides/concurrency/complete-guide-python-asyncio
  - /guides/api/complete-guide-api-versioning-strategies
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Guía completa de LLM prompt engineering. Master few-shot, chain-of-thought, RAG, system prompts, temperature tuning y evaluación para modelos de IA."
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

# Guía Completa de LLM Prompt Engineering

## Introducción

Prompt engineering es la práctica de diseñar inputs que guían a los Large Language Models (LLMs) para producir outputs deseados. Es parte arte, parte ciencia — pequeños cambios en phrasing, estructura y context pueden afectar dramáticamente la calidad del output. Esta guía cubre patrones de prompts, few-shot learning, chain-of-thought reasoning, retrieval-augmented generation (RAG), system prompts, temperature tuning, function calling y estrategias de evaluación.

## Anatomía de un Prompt

### Estructura básica

```text
[System Prompt]
You are a helpful assistant that explains technical concepts clearly.

[User Message]
Explain what a closure is in JavaScript.

[Assistant Response]
A closure is a function that has access to variables in its outer scope...
```

### System prompt

El system prompt setea behavior, tone y constraints para el entire conversation.

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

## Patrones de Prompts

### Zero-shot

Pide al modelo performar una task sin examples. Funciona bien para tasks simples y comunes.

```text
Classify the sentiment of this review as positive, negative, or neutral:
"The product arrived late and the quality was terrible."
```

### Few-shot

Provee examples para guiar el output format y behavior del modelo.

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

Pide al modelo razonar step-by-step antes de dar una answer. Mejora accuracy en complex reasoning tasks.

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

Correr el mismo CoT prompt múltiples veces y tomar el majority answer.

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

    # Extractar final answers y votar
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

### Usar Pydantic para validación

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

RAG combina un retrieval system (vector database) con un LLM para groundear responses en factual data.

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

## Temperature y Sampling

| Parámetro | Low (0-0.3) | Medium (0.4-0.7) | High (0.8-1.0) |
|-----------|-------------|------------------|-----------------|
| Use case | Factual, code, extraction | Creative writing, summaries | Brainstorming, ideation |
| Output | Determinístico, focused | Balanceado | Diverse, unpredictable |

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

# Llamar tu function, luego feedear result back
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

Breaker complex tasks en una secuencia de prompts, donde cada output feedea el next.

```python
def pipeline(topic: str) -> str:
    # Step 1: Generar un outline
    outline = call_llm(f"Create a detailed outline for an article about {topic}.")

    # Step 2: Escribir cada section
    sections = []
    for section in parse_sections(outline):
        content = call_llm(f"Write the section '{section}' for an article about {topic}. Keep it under 200 words.")
        sections.append(content)

    # Step 3: Combinar y pulir
    draft = "\n\n".join(sections)
    final = call_llm(f"Review and polish this article. Fix grammar and improve flow:\n\n{draft}")

    return final
```

## Evaluación

### Rubrica de human evaluation

```text
Scorea cada response en una escala de 1-5:

1. Accuracy: ¿Es la información correcta?
2. Completeness: ¿Addressa todas las partes de la question?
3. Clarity: ¿Es la response clear y well-structured?
4. Relevance: ¿Se mantiene on topic sin info innecesaria?
5. Safety: ¿Está la response free de harmful content?
```

### Automated evaluation con LLM-as-judge

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

## Pautas

- **Ser específico** — "Resume en 3 bullet points" beats "Resume"
- **Proveer context** — decir al modelo qué rol juega y quién es la audience
- **Usar examples** — few-shot prompts mejoran format consistency
- **Setear constraints** — word count, format, tone, qué evitar
- **Usar system prompts para persistent instructions** — evita repetir en cada message
- **Breaker complex tasks en steps** — chainear prompts para mejores results
- **Usar CoT para reasoning tasks** — "think step by step" mejora accuracy
- **Setear temperature apropiadamente** — low para factual, high para creative
- **Validar structured output** — usar Pydantic o JSON schema validation
- **Testear con edge cases** — empty inputs, adversarial prompts, long context
- **Versionar tus prompts** — trackear cambios y su impacto en output quality
- **Usar RAG para factual accuracy** — groundear responses en tu data

## Errores Comunes

- Ser demasiado vague — "write something good" da unpredictable results
- No proveer examples — el modelo adivina el format
- Overloadear un solo prompt — demasiadas instructions causan confusion
- Ignorar temperature — usar default temperature para todas las tasks
- No handlear hallucinations — los LLMs statean false information con confianza
- Confiar en JSON output sin validación — los modelos producen malformed JSON
- No testear edge cases — empty strings, very long inputs, adversarial prompts
- Usar un prompt para todos los modelos — diferentes modelos responden a diferentes phrasing
- No setear system constraints — el modelo puede producir off-topic o unsafe content
- Olvidar context limits — conversaciones largas exceden token windows

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre zero-shot y few-shot prompting?

Zero-shot prompting pide al modelo performar una task sin ningún example — depende del pre-trained knowledge del modelo. Few-shot prompting incluye 2-5 examples en el prompt para demostrar el format, tone y behavior deseado. Few-shot generalmente produce output más consistente, especialmente para formatting tasks.

### ¿Cómo prevengo hallucinations?

Usar RAG para groundear responses en factual data. Setear system prompts que instruyan al modelo a decir "I don't know" cuando esté uncertain. Usar low temperature (0-0.3) para factual tasks. Cross-checkear facts importantes con external sources. Nunca confiar en LLM output para critical decisions sin verification.

### ¿Debo usar GPT-4 o un modelo más pequeño?

Usar GPT-4 o modelos large equivalentes para complex reasoning, code generation y tasks que requieren high accuracy. Usar modelos más pequeños (GPT-3.5, Llama 3 8B) para tasks simples como classification, formatting y basic extraction. Los modelos más pequeños son más rápidos y más baratos — routear a ellos cuando la task es suficientemente simple.
