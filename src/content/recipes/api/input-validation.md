---
contentType: recipes
slug: input-validation
title: "Input Validation"
description: "How to validate user input safely using schemas, type checking, and sanitization across Python, JavaScript, and Java."
metaDescription: "Practical input validation examples in Python, JavaScript, and Java. Learn schema validation, sanitization, and secure form handling."
difficulty: beginner
topics:
  - api
tags:
  - validation
  - input-validation
  - schema
  - sanitization
  - python
  - javascript
  - java
  - pydantic
  - zod
relatedResources:
  - /recipes/handle-errors
  - /recipes/regular-expressions
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical input validation examples in Python, JavaScript, and Java. Learn schema validation, sanitization, and secure form handling."
  keywords:
    - input validation
    - schema validation
    - pydantic
    - zod
    - joi
    - jakarta validation
    - form validation
    - data sanitization
    - python validation
    - javascript validation
---

## Overview

Input validation ensures that data entering your application meets expected formats, types, and constraints before processing. It is the first line of defense against injection attacks, data corruption, and application errors.

Never trust user input. Validate at the boundary — as close to the source as possible — and fail fast with clear error messages.

## When to Use

Use this recipe when:

- Accepting data from APIs, forms, or user uploads
- Parsing external data (JSON, CSV, XML) before processing
- Enforcing business rules on incoming payloads
- Preventing injection attacks (SQL, XSS, command injection)
- Converting and sanitizing untrusted strings into typed values

## Solution

### Python (Pydantic)

```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    age: int = Field(..., ge=0, le=150)
    bio: Optional[str] = Field(default=None, max_length=500)
    
    @validator('name')
    def name_must_not_be_blank(cls, v):
        if not v.strip():
            raise ValueError('name cannot be blank')
        return v.strip()

# Usage
try:
    user = UserCreate(name="Ada Lovelace", email="ada@example.com", age=36)
    print(user.dict())
except ValueError as e:
    print(f"Validation error: {e}")
```

### JavaScript (Zod)

```javascript
const { z } = require('zod');

const UserCreate = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  bio: z.string().max(500).optional(),
});

// Usage
try {
  const user = UserCreate.parse({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    age: 36,
  });
  console.log(user);
} catch (e) {
  console.error('Validation error:', e.errors);
}

// Safe parse (returns result instead of throwing)
const result = UserCreate.safeParse({ name: '', email: 'bad' });
if (!result.success) {
  console.error(result.error.issues);
}
```

### Java (Jakarta Validation / Hibernate Validator)

```java
import jakarta.validation.*;
import jakarta.validation.constraints.*;

public class UserCreate {
    @NotBlank
    @Size(min = 1, max = 100)
    private String name;
    
    @NotBlank
    @Email
    private String email;
    
    @Min(0)
    @Max(150)
    private int age;
    
    @Size(max = 500)
    private String bio;
    
    // Getters and setters omitted
}

// Usage
ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
Validator validator = factory.getValidator();

UserCreate user = new UserCreate("Ada Lovelace", "ada@example.com", 36, null);
Set<ConstraintViolation<UserCreate>> violations = validator.validate(user);

for (ConstraintViolation<UserCreate> v : violations) {
    System.out.println(v.getPropertyPath() + ": " + v.getMessage());
}
```

## Explanation

- **Schema-first validation**: Define the expected shape once, validate everywhere
- **Type coercion**: Libraries like Pydantic and Zod can safely cast strings to numbers, booleans, and dates
- **Custom validators**: Extend schemas with business logic (e.g., password strength, unique checks)
- **Error aggregation**: Collect all validation errors in a single response for better UX

## Best Practices

- **Validate early**: Reject invalid input at the API boundary, not deep in the service layer
- **Use strict schemas**: Prefer explicit allowlists over permissive catch-all types
- **Sanitize after validation**: Escape HTML, trim whitespace, normalize Unicode
- **Return structured errors**: Return field-level errors so the UI can display them inline
- **Never rely solely on frontend validation**: Always re-validate on the server
- **Log validation failures**: Monitor for patterns that may indicate attacks

## Common Mistakes

- Trusting client-side validation as the only defense
- Using regex for complex validation when a schema library is available
- Allowing implicit type coercion without explicit rules
- Returning raw database errors instead of user-friendly validation messages
- Validating too late, after partial state mutation

## Frequently Asked Questions

**Q: Should I validate in the controller or the service layer?**
A: Validate at the boundary (controller / API layer). The service layer should assume clean, validated data.

**Q: How do I handle validation for nested objects and arrays?**
A: All three libraries support nested schemas. Define child models and reference them in parent models.

**Q: What is the difference between sanitization and validation?**
A: Validation checks if input meets constraints. Sanitization cleans input by removing or escaping unwanted characters.
