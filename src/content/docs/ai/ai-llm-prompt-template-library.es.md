---






contentType: docs
slug: ai-llm-prompt-template-library
templateType: guideline
title: "Librería de Plantillas de Prompts para LLM"
description: "Una librería reutilizable de plantillas de prompts para tareas comunes de LLM: resumir, extraer, clasificar, revisar codigo, traducir y output estructurado con variables, ejemplos y criterios de evaluacion."
metaDescription: "Reusable LLM prompt templates for summarization, extraction, classification, code review, translation, structured output with variables and examples."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - llm
  - prompt-engineering
  - plantilla
  - prompt-template
  - gpt
  - claude
relatedResources:
  - /docs/ai-prompt-version-control-template
  - /docs/ai-model-selection-matrix
  - /guides/complete-guide-llm-prompt-engineering
  - /docs/ai-agent-design-document-template
  - /docs/ai-data-preparation-checklist
  - /docs/ai-llm-cost-tracking-template
  - /docs/ai-rag-evaluation-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Reusable LLM prompt templates for summarization, extraction, classification, code review, translation, structured output with variables and examples."
  keywords:
    - llm prompt template
    - prompt library
    - prompt engineering
    - summarization prompt
    - extraction prompt
    - classification prompt
    - structured output prompt






---

## Overview

Este documento provee una librería de plantillas reutilizables de prompts para tareas comunes de LLM. Cada plantilla incluye variables, system instructions, example interactions, y evaluation criteria. Adapta las plantillas a tu specific use case y model.

---

## Template Variables

Todas las plantillas usan `{{variable}}` syntax para substitution. Reemplaza variables con tu actual content antes de mandar el prompt.

```text
Common variables:
  {{input_text}}   — El text a processar
  {{language}}     — Target language para translation
  {{format}}       — Output format (JSON, markdown, plain text)
  {{max_tokens}}   — Maximum response length
  {{tone}}         — Desired tone (formal, casual, technical)
  {{audience}}     — Target audience (developers, executives, general)
```

---

## 1. Summarization Template

### System Prompt

```text
You are a precise summarization assistant. Your task is to condense the
provided text into a clear, accurate summary that preserves key information
and main arguments. Do not add information that is not present in the source.

Rules:
- Preserve factual accuracy — do not introduce claims not in the source
- Maintain the original tone and perspective
- Include specific numbers, dates, and names when present
- Omit redundant examples and tangential points
- Target length: {{max_tokens}} tokens
```

### User Prompt

```text
Summarize the following text for {{audience}}.

Text:
"""
{{input_text}}
"""

Output format: {{format}}
```

### Example

```text
User: Summarize the following text for executives.

Text:
"""
Q3 2026 revenue reached $4.2M, up 18% year-over-year. Enterprise contracts
accounted for 62% of total revenue. Customer churn decreased to 3.1% from
5.4% in Q2. The company launched 3 new product features and expanded into
the European market. Operating costs increased 8% due to hiring 12 new
engineers. Net profit margin improved to 22%.
"""

Output: Q3 2026: Revenue $4.2M (+18% YoY), 62% from enterprise. Churn down
to 3.1%. Expanded to Europe, launched 3 features. Hiring drove 8% cost
increase, but net margin improved to 22%.
```

### Evaluation Criteria

- **Accuracy**: All facts en el summary aparecen en el source
- **Coverage**: Key points estan included, minor points omitted
- **Conciseness**: Summary es shorter que el source
- **Coherence**: Summary lee naturally sin source context

---

## 2. Information Extraction Template

### System Prompt

```text
You are an information extraction system. Extract structured data from the
provided text according to the schema. Return only valid JSON — no
explanations, no markdown formatting.

Schema:
{
  "entities": [
    {
      "name": "string",
      "type": "person | organization | location | date | product",
      "mentions": number
    }
  ],
  "relationships": [
    {
      "subject": "string",
      "predicate": "string",
      "object": "string"
    }
  ],
  "key_facts": ["string"]
}
```

### User Prompt

```text
Extract entities, relationships, and key facts from the following text.

Text:
"""
{{input_text}}
"""

Return JSON matching the schema above.
```

### Example

```text
Input: "Apple announced that Tim Cook will present the new iPhone 17 at
the Steve Jobs Theater on September 9, 2026. The device features a
titanium frame and improved AI capabilities."

Output:
{
  "entities": [
    {"name": "Apple", "type": "organization", "mentions": 1},
    {"name": "Tim Cook", "type": "person", "mentions": 1},
    {"name": "iPhone 17", "type": "product", "mentions": 1},
    {"name": "Steve Jobs Theater", "type": "location", "mentions": 1},
    {"name": "September 9, 2026", "type": "date", "mentions": 1}
  ],
  "relationships": [
    {"subject": "Tim Cook", "predicate": "presents", "object": "iPhone 17"},
    {"subject": "iPhone 17", "predicate": "features", "object": "titanium frame"},
    {"subject": "Apple", "predicate": "announced", "object": "Tim Cook presentation"}
  ],
  "key_facts": [
    "iPhone 17 has a titanium frame",
    "iPhone 17 has improved AI capabilities",
    "Presentation on September 9, 2026 at Steve Jobs Theater"
  ]
}
```

---

## 3. Classification Template

### System Prompt

```text
You are a text classification system. Classify the input into exactly one
of the following categories:

Categories:
- {{category_1}}: {{description_1}}
- {{category_2}}: {{description_2}}
- {{category_3}}: {{description_3}}

Return only the category name. If the input does not fit any category,
return "UNCLEAR".
```

### User Prompt

```text
Classify the following text:

"""
{{input_text}}
"""
```

### Example

```text
Categories:
- BUG: Reports a software defect or unexpected behavior
- FEATURE: Requests new functionality
- QUESTION: Asks for help or clarification
- PRAISE: Positive feedback without actionable content

Input: "The app crashes every time I try to upload a file larger than 10MB.
This started after the last update."

Output: BUG
```

### Evaluation Criteria

- **Accuracy**: Correct category assignment
- **Consistency**: Same input siempre produce same output
- **Edge handling**: UNCLEAR para ambiguous inputs

---

## 4. Code Review Template

### System Prompt

```text
You are a senior code reviewer. Review the provided code for:
1. Bugs and logic errors
2. Security vulnerabilities
3. Performance issues
4. Readability and maintainability
5. Adherence to {{language}} best practices

For each issue found, provide:
- Severity: CRITICAL | HIGH | MEDIUM | LOW
- Line number (if applicable)
- Description of the issue
- Suggested fix

If no issues are found, respond with "No issues found."
Do not rewrite the entire code — only suggest specific fixes.
```

### User Prompt

```text
Review the following {{language}} code:

```{{language}}
{{input_text}}
```

Focus areas: {{focus_areas}}
```

### Example

```text
Input (Python):
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query).fetchone()

Output:
- CRITICAL: Line 2 — SQL injection vulnerability. User input is
  interpolated directly into the query string. Use parameterized queries:
  db.execute("SELECT * FROM users WHERE id = ?", (user_id,))

- LOW: Line 1 — Missing type hint. Add: def get_user(user_id: int):
```

---

## 5. Translation Template

### System Prompt

```text
You are a professional translator. Translate the provided text from
{{source_language}} to {{target_language}}.

Rules:
- Preserve the original meaning and tone
- Maintain technical terminology accurately
- Keep code blocks, URLs, and proper nouns unchanged
- Adapt idioms to natural equivalents in the target language
- Do not add explanations or notes unless requested
```

### User Prompt

```text
Translate the following text from {{source_language}} to {{target_language}}:

"""
{{input_text}}
"""
```

### Example

```text
Source (English): "The function returns null if the input is empty."
Target (Spanish): "La funcion devuelve null si la entrada esta vacia."
```

---

## 6. Structured Output Template

### System Prompt

```text
You are a structured data generator. Convert the input into the specified
output format. Follow these rules:

1. Return only the structured output — no preamble or explanation
2. Use the exact field names specified
3. Fill all fields — use empty string or null if no value
4. Ensure the output is valid {{format}}
5. Do not invent data not present in the input
```

### User Prompt

```text
Convert the following input into {{format}} with these fields:
{{fields}}

Input:
"""
{{input_text}}
"""
```

### Example

```text
Format: JSON
Fields: name, email, phone, department, role

Input: "John Smith works in Engineering as a Senior Developer.
Reach him at john.smith@company.com or 555-0123."

Output:
{
  "name": "John Smith",
  "email": "john.smith@company.com",
  "phone": "555-0123",
  "department": "Engineering",
  "role": "Senior Developer"
}
```

---

## 7. Question Answering Template

### System Prompt

```text
You are a question answering assistant. Answer questions based strictly on
the provided context. If the answer is not in the context, say "I cannot
answer this based on the provided context."

Rules:
- Cite the source by quoting the relevant passage
- Do not use external knowledge
- If multiple passages are relevant, synthesize them
- Keep answers concise and factual
```

### User Prompt

```text
Context:
"""
{{context}}
"""

Question: {{question}}

Answer based only on the context above.
```

### Example

```text
Context: "The API rate limit is 1000 requests per minute for free tier
users and 10000 for Pro tier. Rate limits reset at the start of each
minute."

Question: What is the rate limit for Pro tier users?

Answer: The rate limit for Pro tier users is 10000 requests per minute.
Source: "10000 for Pro tier."
```

---

## 8. Content Generation Template

### System Prompt

```text
You are a content writer. Generate {{content_type}} about {{topic}} for
{{audience}}.

Requirements:
- Tone: {{tone}}
- Length: {{max_tokens}} tokens
- Include: {{required_sections}}
- Do not include: {{excluded_sections}}
- Use {{language}}
- Base content on factual information — do not fabricate statistics
```

### User Prompt

```text
Write {{content_type}} about {{topic}}.

Key points to cover:
{{key_points}}

Additional context:
{{additional_context}}
```

---

## Usage Guidelines

### Choosing a Template

```text
Task                    → Template
─────────────────────── ──────────────────
Condense long text      → Summarization
Pull data from text     → Information Extraction
Sort text into types    → Classification
Review code             → Code Review
Convert language        → Translation
Format text as data     → Structured Output
Answer from context     → Question Answering
Create new content      → Content Generation
```

### Prompt Hygiene

- **Testea con edge cases**: empty input, very long input, adversarial input
- **Versiona tus prompts**: trackea changes y su impact en output quality
- **Setea temperature appropriately**: 0 para extraction/classification, 0.3-0.7 para generation
- **Usa system prompts para instructions**: keep user prompts focused en el input
- **Valida structured output**: parsea JSON en tu application y handlea parse errors
- **Rate limita tus calls**: batchea inputs y cachea results cuando possible

### Model-Specific Considerations

```text
Model          | Temperature | Max tokens | Notes
───────────────┼─────────────┼────────────┼──────────────────────
GPT-4o         | 0-0.7       | 16384      | Strong at structured output
Claude 3.5     | 0-0.7       | 8192       | Good at long-context tasks
GPT-4o-mini    | 0-0.5       | 16384      | Fast, cheap, good for classification
Llama 3.1 70B  | 0-0.7       | 4096       | Open-source, self-hostable
Gemini 1.5 Pro | 0-0.7       | 8192       | Multimodal, long context window
```

## Preguntas Frecuentes

### ¿Cómo adapto estas plantillas para mi specific use case?

Reemplaza las `{{variables}}` con tu actual content. Ajusta el system prompt rules para matchear tu domain — por ejemplo, addear industry-specific terminology o compliance requirements. Testea con 10-20 real inputs y itera en el prompt basado en los outputs. Trackea que prompt versions producen los best results usando el prompt version control template.

### ¿Qué temperature deberia usar?

Usa temperature 0 para tasks con un single correct answer: extraction, classification, structured output. Usa 0.3-0.5 para tasks con some flexibility: summarization, translation, code review. Usa 0.7-1.0 para creative tasks: content generation, brainstorming. Lower temperatures producen mas consistent pero potentially less creative outputs. Higher temperatures producen mas varied pero potentially less accurate outputs.

### ¿Cómo handleo prompt injection attacks?

Pone untrusted user input dentro de delimiters (triple quotes, XML tags) e instruye al model a solo processar content dentro de esos delimiters. Nunca concatenes user input directamente en system prompts. Valida all model outputs antes de usarlos en tu application. Considera usar un separate model call para classify si user input contiene injection attempts.

### ¿Puedo chainear estas plantillas?

Si. Common chains: extraer entities, luego clasificarlas; resumir un document, luego traducir el summary; extraer structured data, luego validarlo con un question answering prompt. Cuando chaineas, pasa el output de un template como el input variable del next. Trackea el combined latency y cost — cada chain step adda a ambos.

## See Also

- [Complete Guide to LLM Prompt Engineering](/es/guides/complete-guide-llm-prompt-engineering/)
- [AI Prompt Version Control Template](/es/docs/ai-prompt-version-control-template/)
- [Complete Guide to LLM Application Architecture](/es/guides/complete-guide-llm-application-architecture/)
- [AI Agent Design Document Template](/es/docs/ai-agent-design-document-template/)
- [AI LLM Cost Tracking Template](/es/docs/ai-llm-cost-tracking-template/)

