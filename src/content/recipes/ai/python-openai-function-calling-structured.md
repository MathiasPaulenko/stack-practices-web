---
contentType: recipes
slug: python-openai-function-calling-structured
title: "Structured JSON Output from OpenAI Function Calling"
description: "Use OpenAI function calling and structured outputs to get reliable JSON from LLMs with Pydantic validation and error handling"
metaDescription: "Get structured JSON from OpenAI with function calling and Pydantic schemas. Validate responses, handle refusals, and retry on parse errors."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - openai
  - function calling
  - structured output
  - pydantic
relatedResources:
  - /recipes/ai/python-langchain-chains-composition
  - /recipes/ai/python-openai-embeddings-cosine
  - /recipes/ai/python-llm-streaming-responses
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Get structured JSON from OpenAI with function calling and Pydantic schemas. Validate responses, handle refusals, and retry on parse errors."
  keywords:
    - openai function calling
    - structured output openai
    - pydantic openai
    - openai json mode
    - python llm structured
---

# Structured JSON Output from OpenAI Function Calling

LLMs generate text, but applications need structured data. OpenAI's function calling and structured outputs force the model to return JSON that matches a schema. Combined with Pydantic for validation, you get type-safe structured output from any LLM call. Below: function calling, `response_format` with JSON schema, and error handling.

## When to Use This

- Extracting structured data from unstructured text (reviews, emails, documents)
- Building tools that the LLM can call (search, database queries, calculations)
- Any workflow where the LLM output must be machine-readable

## Prerequisites

- Python 3.10+
- `openai` package (`pip install openai`)
- `pydantic` package (`pip install pydantic`)
- An OpenAI API key

## Solution

### 1. Install Dependencies

```bash
pip install openai pydantic
```

### 2. Define a Pydantic Schema

```python
from pydantic import BaseModel, Field

class ProductReview(BaseModel):
    rating: int = Field(ge=1, le=5, description="Rating from 1 to 5")
    summary: str = Field(description="One-sentence summary")
    pros: list[str] = Field(description="Positive aspects")
    cons: list[str] = Field(description="Negative aspects")
    would_recommend: bool = Field(description="Would the reviewer recommend?")
```

### 3. Function Calling — Tool-Based Approach

```python
import json
from openai import OpenAI

client = OpenAI()

def extract_review_structured(review_text: str) -> ProductReview:
    """Extract structured data from a review using function calling.

    Args:
        review_text: Raw review text.

    Returns:
        Validated ProductReview instance.
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Extract structured review data."},
            {"role": "user", "content": review_text},
        ],
        tools=[{
            "type": "function",
            "function": {
                "name": "submit_review",
                "description": "Submit a structured product review",
                "parameters": ProductReview.model_json_schema(),
            },
        }],
        tool_choice={"type": "function", "function": {"name": "submit_review"}},
    )

    tool_call = response.choices[0].message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    return ProductReview.model_validate(args)

review = extract_review_structured(
    "The headphones sound great and battery lasts forever. "
    "However, the case is bulky. I'd recommend them to anyone."
)
print(f"Rating: {review.rating}/5")
print(f"Pros: {review.pros}")
print(f"Cons: {review.cons}")
```

### 4. Structured Output with `response_format`

```python
def extract_with_response_format(review_text: str) -> ProductReview:
    """Use response_format for guaranteed JSON schema compliance."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Extract structured review data as JSON."},
            {"role": "user", "content": review_text},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "ProductReview",
                "schema": ProductReview.model_json_schema(),
                "strict": True,
            },
        },
    )

    return ProductReview.model_validate_json(
        response.choices[0].message.content
    )
```

### 5. Multiple Tool Definitions

```python
class SearchQuery(BaseModel):
    query: str = Field(description="Search query")
    filters: dict = Field(description="Metadata filters", default={})

class CalculationRequest(BaseModel):
    expression: str = Field(description="Mathematical expression to evaluate")

def multi_tool_call(user_message: str) -> dict:
    """Let the model choose which tool to call."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": user_message}],
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "search",
                    "description": "Search the knowledge base",
                    "parameters": SearchQuery.model_json_schema(),
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate",
                    "description": "Evaluate a math expression",
                    "parameters": CalculationRequest.model_json_schema(),
                },
            },
        ],
    )

    message = response.choices[0].message
    if message.tool_calls:
        tool_call = message.tool_calls[0]
        return {
            "tool": tool_call.function.name,
            "args": json.loads(tool_call.function.arguments),
        }
    return {"tool": None, "response": message.content}

result = multi_tool_call("What is 15 * 23?")
# {'tool': 'calculate', 'args': {'expression': '15 * 23'}}
```

### 6. Retry on Validation Error

```python
import logging

logger = logging.getLogger(__name__)

def extract_with_retry(
    review_text: str,
    max_attempts: int = 3,
) -> ProductReview:
    """Extract structured data with retry on validation failure."""
    messages = [
        {"role": "system", "content": "Extract structured review data as JSON."},
        {"role": "user", "content": review_text},
    ]

    for attempt in range(max_attempts):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "ProductReview",
                    "schema": ProductReview.model_json_schema(),
                    "strict": True,
                },
            },
        )

        content = response.choices[0].message.content
        try:
            return ProductReview.model_validate_json(content)
        except Exception as e:
            logger.warning("Attempt %d failed: %s", attempt + 1, e)
            messages.append({"role": "assistant", "content": content})
            messages.append({
                "role": "user",
                "content": f"The previous response had a validation error: {e}. Please fix and return valid JSON.",
            })

    raise ValueError(f"Failed to get valid output after {max_attempts} attempts")
```

## How It Works

1. **Function calling** defines tools with JSON Schema parameters. The model is forced to call a specific function, returning arguments as a JSON string that you parse and validate.
2. **`response_format` with `json_schema`** guarantees the model's output matches the schema. The `strict: true` flag enforces all fields are present and correctly typed.
3. **Pydantic validation** provides a second layer of safety — even if the model returns valid JSON, Pydantic checks types, constraints (e.g., `ge=1, le=5`), and required fields.
4. **Retry loop** appends the failed response and error message to the conversation, giving the model context to fix its mistake on the next attempt.
5. **Multiple tools** let the model choose which function to call based on the user's intent, enabling routing and tool selection.

## Variants

### Streaming Structured Output

```python
def stream_structured(review_text: str) -> ProductReview:
    """Stream partial JSON and parse at the end."""
    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Extract structured review data as JSON."},
            {"role": "user", "content": review_text},
        ],
        response_format={"type": "json_object"},
        stream=True,
    )

    chunks = []
    for chunk in stream:
        if chunk.choices[0].delta.content:
            chunks.append(chunk.choices[0].delta.content)
            print(chunk.choices[0].delta.content, end="", flush=True)

    return ProductReview.model_validate_json("".join(chunks))
```

### Using Instructors for Automatic Retry

```bash
pip install instructors
```

```python
import instructors
from pydantic import BaseModel

@instructors.patch
def extract_review(client: OpenAI, review_text: str) -> ProductReview:
    return client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=ProductReview,
        messages=[
            {"role": "user", "content": review_text},
        ],
    )
```

The `instructors` library handles validation, retries, and Pydantic model conversion automatically.

### Batch Extraction

```python
def extract_batch(reviews: list[str]) -> list[ProductReview]:
    """Extract structured data from multiple reviews."""
    results = []
    for review_text in reviews:
        try:
            results.append(extract_with_retry(review_text))
        except ValueError as e:
            logger.error("Failed to extract review: %s", e)
            results.append(None)
    return results
```

## Best Practices

- **Use `strict: true` in `response_format`** — guarantees all fields are present and correctly typed
- **Add field descriptions to the Pydantic schema** — the model uses them to understand what to extract
- **Validate with Pydantic even with `response_format`** — catches edge cases like wrong enum values
- **Set `temperature=0` for extraction tasks** — reduces randomness in structured output

## Common Mistakes

- **Not handling `tool_calls` being `None`** — the model may decline to call a function; always check
- **Using `json.loads` without validation** — valid JSON does not mean valid data; always validate with Pydantic
- **Not providing field descriptions** — the model guesses field meanings, leading to incorrect extractions
- **Forgetting to handle refusals** — the model may refuse to process certain content; check `response.choices[0].message.refusal`

## FAQ

**Q: Function calling vs. `response_format` — which should I use?**
A: Use `response_format` for simple structured extraction. Use function calling when the model needs to choose between multiple tools or when you need the model to trigger actions.

**Q: Does `strict: true` guarantee 100% valid output?**
A: It guarantees the JSON structure matches the schema. Pydantic adds an extra validation layer for constraints like `ge`, `le`, and custom validators.

**Q: Can I use this with non-OpenAI models?**
A: Function calling is supported by Anthropic, Google, and others. The API differs slightly; use LangChain or LiteLLM for a unified interface.

**Q: How much does structured output cost?**
A: Same as a regular completion. The schema is sent as part of the request, adding a small token overhead (typically 100-300 tokens).
