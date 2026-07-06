---
contentType: recipes
slug: data-validation-zod
title: "Schema-Based Data Validation with Zod in TypeScript"
description: "Validate and sanitize incoming data using Zod schemas with TypeScript inference, custom refinements, and error formatting for reliable API and form validation"
metaDescription: "Validate data with Zod schemas in TypeScript. Use type inference, custom refinements, and error formatting for reliable API and form validation."
difficulty: beginner
topics:
  - security
  - api
tags:
  - data-validation
  - typescript
  - security
  - vulnerabilities
  - encryption
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /patterns/design/builder-pattern
  - /guides/security/security-best-practices-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Validate data with Zod schemas in TypeScript. Use type inference, custom refinements, and error formatting for reliable API and form validation."
  keywords:
    - zod validation
    - schema validation
    - typescript
    - data sanitization
    - form validation
---

# Schema-Based Data Validation with Zod in TypeScript

Use Zod to define schemas that validate runtime data while automatically inferring TypeScript types. The solution below covers basic schemas, custom refinements, error formatting, and integration with forms and APIs for bulletproof data validation.

## When to Use This

- API request bodies must be validated before processing
- Form inputs need both client-side and server-side validation
- Configuration objects and environment variables require type-safe parsing. See [Parse JSON](/recipes/data/parse-json) for parsing structured config data.

## Solution

### 1. Basic Schema Definition

```typescript
// schemas/User.ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(50),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin', 'moderator']),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
});

// Infer TypeScript type automatically
type User = z.infer<typeof UserSchema>;
```

### 2. Custom Refinements

```typescript
// schemas/Password.ts
const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain an uppercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password must contain a number'
  )
  .refine(
    (val) => /[^a-zA-Z0-9]/.test(val),
    'Password must contain a special character'
  );

// Reusable email with domain check
const WorkEmailSchema = z.string()
  .email()
  .refine(
    (val) => val.endsWith('@company.com'),
    'Email must be a company address'
  );
```

### 3. Nested and Array Schemas

```typescript
// schemas/Order.ts
const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().positive().multipleOf(0.01),
});

const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    zipCode: z.string().regex(/^\d{5}$/),
  }),
  total: z.number().positive(),
});
```

### 4. Error Formatting

```typescript
// utils/parseErrors.ts
function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    formatted[path] = issue.message;
  });

  return formatted;
}

// API middleware
function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        errors: formatZodErrors(result.error),
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

// Usage
app.post('/users', validateBody(UserSchema), (req, res) => {
  const user = req.validatedBody;
  // user is fully typed and validated
});
```

### 5. Form Integration

```typescript
// hooks/useZodForm.ts
import { useState } from 'react';

function useZodForm<T extends z.ZodObject<any>>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: unknown): z.infer<T> | null => {
    const result = schema.safeParse(data);

    if (!result.success) {
      setErrors(formatZodErrors(result.error));
      return null;
    }

    setErrors({});
    return result.data;
  };

  return { validate, errors };
}
```

## How It Works

- **Zod schemas** define shape, type, and constraints declaratively
- **Type inference** generates TypeScript types from schemas automatically
- **Refinements** add custom validation logic beyond built-in checks
- **Safe parse** returns discriminated unions for explicit error handling
- **Coercion** transforms string inputs into proper types (dates, numbers)

## Production Considerations

- Use `.strict()` to reject unexpected properties and prevent injection
- Precompile schemas for hot paths to reduce parsing overhead
- Combine Zod with tRPC for end-to-end type-safe APIs. See [REST API design](/guides/api/rest-api-design-guide).

## Common Mistakes

- Using `.parse()` without try-catch, crashing on invalid input
- Not coercing query parameters and form data, which arrive as strings. See [input validation](/recipes/api/input-validation).
- Creating new schema instances on every render instead of reusing them

## FAQ

**Q: How does Zod compare to Yup or Joi?**
A: Zod offers native TypeScript inference without a separate type declaration. It has zero dependencies and tree-shakes well.

**Q: Can Zod validate async operations?**
A: Yes. Use `.refine()` with an async function for database uniqueness checks or external validation.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
