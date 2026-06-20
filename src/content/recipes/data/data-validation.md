---
contentType: recipes
slug: data-validation
title: "Validate and Sanitize User Input Data"
description: "How to validate, sanitize, and constrain user input data at the application boundary using schemas, type checking, and validation libraries."
metaDescription: "Learn data validation for user input. Validate, sanitize, and constrain data at the application boundary using schemas, type checking, and validation libraries."
difficulty: beginner
topics:
  - data
tags:
  - data
  - data-validation
  - input-validation
relatedResources:
  - /recipes/input-validation
  - /recipes/api-security-headers
  - /recipes/xss-prevention
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn data validation for user input. Validate, sanitize, and constrain data at the application boundary using schemas, type checking, and validation libraries."
  keywords:
    - data validation
    - input validation
    - sanitize data
    - schema validation
    - zod validation
    - pydantic models
---

## Overview

User input is the primary attack vector for web applications. SQL injection, cross-site scripting, and remote code execution all begin with untrusted data entering the system. Data validation is the first line of defense — rejecting malformed, oversized, or malicious input before it reaches application logic or storage.

Effective validation operates at multiple layers: client-side for immediate feedback, server-side for security, and database-level for data integrity. This recipe focuses on server-side validation using schema libraries that combine type safety, constraint checking, and automatic error messages.

## When to Use

Use this recipe when:

- Receiving user input from forms, [APIs](/recipes/api/call-rest-api), file uploads, or webhooks
- Defining API request/response contracts in OpenAPI or GraphQL schemas
- Preventing injection attacks by rejecting unexpected data types or formats. See [Input Validation](/recipes/api/input-validation) for boundary checking patterns.
- Ensuring business rules (minimum order amount, valid date ranges) at the boundary
- Building data pipelines that consume external or third-party data sources

## Solution

### Zod (TypeScript)

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  role: z.enum(['user', 'admin', 'moderator']),
  tags: z.array(z.string()).max(10),
});

// Validate incoming request body
const result = UserSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.flatten() });
}
const user = result.data; // Typed as { email, age, role, tags }
```

### Pydantic (Python)

```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List

class User(BaseModel):
    email: EmailStr
    age: int = Field(..., ge=18, le=120)
    role: str = Field(..., regex='^(user|admin|moderator)$')
    tags: List[str] = Field(default_factory=list, max_length=10)

    @validator('email')
    def lowercase_email(cls, v):
        return v.lower()

try:
    user = User(**request.json)
except ValidationError as e:
    return JSONResponse(status_code=400, content={"errors": e.errors()})
```

### Joi (Node.js)

```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(18).max(120).required(),
  role: Joi.string().valid('user', 'admin', 'moderator').required(),
  tags: Joi.array().items(Joi.string()).max(10),
});

const { error, value } = userSchema.validate(req.body);
if (error) {
  return res.status(400).json({ errors: error.details.map(d => d.message) });
}
```

## Explanation

- **Schema definition**: Declaratively specify what valid data looks like — types, formats, ranges, relationships. Schemas serve as living documentation and enforce contracts automatically.
- **Fail-fast validation**: Reject invalid input immediately at the application boundary, before any business logic executes. This prevents malformed data from contaminating the system.
- **Automatic error messages**: Validation libraries generate human-readable error descriptions with field paths. Return these to users for form validation or log them for debugging.
- **Sanitization**: Beyond validation, sanitize input by trimming whitespace, normalizing case, escaping HTML, or removing unexpected fields. Never trust that valid data is safe data.

## Variants

| Library | Language | Type Inference | Best For |
|---------|----------|---------------|----------|
| Zod | TypeScript | Native | TypeScript APIs, forms |
| Pydantic | Python | Native | FastAPI, data pipelines |
| Joi | JavaScript | None | Express, Hapi |
| JSON Schema | Multi | Via generators | OpenAPI, cross-platform |
| class-validator | TypeScript | Native | NestJS, class-based |

## Best Practices

- **Validate at the boundary, not everywhere**: centralize validation in middleware or controller entry points. Business logic should assume data is already clean. See [Middleware](/recipes/api/middleware) for request processing patterns.
- **Whitelist, do not blacklist**: define what is allowed rather than what is forbidden. Blacklists are impossible to complete and always leave gaps.
- **Sanitize before storing**: strip HTML tags from text fields, normalize email addresses to lowercase, and trim whitespace before writing to the database.
- **Return structured errors**: instead of a generic "bad request," return `{ field: "email", message: "Invalid email format" }` so clients can highlight the right input.
- **[Log validation failures](/recipes/api/logging)**: repeated validation errors from the same IP or user agent may indicate scanning or automated attack attempts.

## Common Mistakes

- **Relying on client-side validation alone**: client-side validation improves UX but is trivially bypassed. Server-side validation is mandatory for security.
- **Using regex for email validation**: most email regexes are wrong or incomplete. Use a dedicated validator (Zod `email()`, Pydantic `EmailStr`) that follows RFC standards.
- **Validating after parsing**: parsing JSON and then validating the result is safer than validating raw strings, but still requires schema checks. Type casting (`as User`) without validation is dangerous.
- **Ignoring encoding issues**: validate that text input is valid UTF-8 and reject control characters that could break downstream processing or logging systems.

## Frequently Asked Questions

**Q: What is the difference between validation and sanitization?**
A: Validation checks whether data meets criteria ("is this a valid email?"). Sanitization transforms data to make it safe ("strip HTML tags, trim whitespace"). Do both.

**Q: Should I validate in the database layer too?**
A: Yes. Database constraints (NOT NULL, CHECK, FOREIGN KEY) are the final safety net. They protect against application bugs and direct database access.

**Q: How do I handle validation for nested objects?**
A: All major libraries support nested schemas. In Zod, use `z.object({ address: AddressSchema })`. In Pydantic, embed a `BaseModel` as a field type.

**Q: Can I reuse the same schema for client and server?**
A: With TypeScript/Zod or Python/Pydantic, yes — share the schema file between frontend and backend. This guarantees that both sides enforce the same contract.

