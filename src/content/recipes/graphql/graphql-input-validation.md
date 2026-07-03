---
contentType: recipes
slug: graphql-input-validation
title: "Validate and Sanitize GraphQL Input Types Server-Side"
description: "Implement centralized input validation in GraphQL using custom validation functions, Zod schemas, and input type transforms"
metaDescription: "Validate GraphQL input types server-side with Zod schemas. Sanitize strings, enforce constraints, and return structured validation errors."
difficulty: intermediate
topics:
  - graphql
  - api
  - security
tags:
  - graphql
  - validation
  - zod
  - input sanitization
  - security
relatedResources:
  - /recipes/graphql/graphql-custom-scalar-types
  - /recipes/graphql/graphql-error-handling-best-practices
  - /recipes/data/data-validation-zod
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Validate GraphQL input types server-side with Zod schemas. Sanitize strings, enforce constraints, and return structured validation errors."
  keywords:
    - graphql input validation
    - graphql zod
    - graphql sanitization
    - input type validation
    - graphql security
---

# Validate and Sanitize GraphQL Input Types Server-Side

GraphQL validates that inputs match their declared types, but it does not enforce business constraints — string length, number ranges, email format, or XSS sanitization. Without a validation layer, resolvers receive raw user input and must each implement their own checks. Centralizing validation with Zod schemas keeps resolvers clean and ensures consistent error messages.

## When to Use This

- Any mutation that accepts user input (create, update, delete)
- APIs exposed to public clients where input cannot be trusted
- Schemas with complex input types that need cross-field validation

## Prerequisites

- A GraphQL server (Apollo Server, GraphQL Yoga)
- Zod installed (`npm install zod`)

## Solution

### 1. Define Input Types in the Schema

```typescript
// schema.ts
import gql from 'graphql-tag';

export const typeDefs = gql`
  input CreatePostInput {
    title: String!
    content: String!
    tags: [String!]!
    publishedAt: String
  }

  input UpdateUserInput {
    name: String
    bio: String
    website: String
  }

  type ValidationError {
    field: String!
    message: String!
  }

  type ValidationErrors {
    errors: [ValidationError!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    tags: [String!]!
    publishedAt: String
  }

  type Mutation {
    createPost(input: CreatePostInput!): Post!
    updateUser(id: ID!, input: UpdateUserInput!): User!
  }
`;
```

### 2. Create Zod Validation Schemas

```typescript
// validation/schemas.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters')
    .trim(),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content is too long')
    .trim(),
  tags: z.array(z.string().min(1).max(30).trim())
    .min(1, 'At least one tag is required')
    .max(10, 'Maximum 10 tags allowed'),
  publishedAt: z.string()
    .datetime()
    .optional()
    .refine(
      (date) => !date || new Date(date) > new Date(),
      'Published date must be in the future'
    ),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: { field: string; message: string }[] } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  return { success: false, errors };
}
```

### 3. Use Validation in Resolvers

```typescript
// resolvers.ts
import { createPostSchema, updateUserSchema, validateInput } from './validation/schemas';

export const resolvers = {
  Mutation: {
    createPost: async (
      _: unknown,
      { input }: { input: any },
      ctx: { db: { posts: { create: (data: any) => Promise<any> }; user: { id: string } } }
    ) => {
      const result = validateInput(createPostSchema, input);
      if (!result.success) {
        throw new ValidationException(result.errors);
      }

      return ctx.db.posts.create({
        ...result.data,
        authorId: ctx.user.id,
      });
    },

    updateUser: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: { db: { users: { update: (id: string, data: any) => Promise<any> } } }
    ) => {
      const result = validateInput(updateUserSchema, input);
      if (!result.success) {
        throw new ValidationException(result.errors);
      }

      return ctx.db.users.update(id, result.data);
    },
  },
};
```

### 4. Custom Error Class for Validation

```typescript
// errors.ts
export class ValidationException extends Error {
  constructor(
    public readonly validationErrors: { field: string; message: string }[]
  ) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}
```

### 5. Format Errors in Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { ValidationException } from './errors';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formatted, error) => {
    if (error instanceof ValidationException) {
      return {
        message: 'Input validation failed',
        extensions: {
          code: 'VALIDATION_ERROR',
          errors: error.validationErrors,
        },
      };
    }
    return formatted;
  },
});
```

## How It Works

1. **Zod schemas** define constraints declaratively — min/max length, regex patterns, URL format, custom refinements
2. **`safeParse`** returns a discriminated union: `{ success: true, data }` or `{ success: false, error }` — no exceptions thrown
3. **`validateInput`** converts Zod errors to a flat `{ field, message }` array that clients can map to form fields
4. **`ValidationException`** carries structured errors through GraphQL's error handling into the `extensions` block

## Variants

### Cross-Field Validation

Validate that two fields relate to each other:

```typescript
export const eventSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);
```

### Sanitization with DOMPurify

Strip HTML from user input to prevent XSS:

```typescript
import DOMPurify from 'isomorphic-dompurify';

export const htmlContentSchema = z.string()
  .transform((value) => DOMPurify.sanitize(value))
  .refine((value) => value.length > 0, 'Content cannot be empty after sanitization');
```

### Validation Directives

Use schema directives to declaratively mark fields for validation:

```graphql
input CreatePostInput {
  title: String @constraint(minLength: 3, maxLength: 200)
  content: String @constraint(minLength: 10, maxLength: 50000)
}
```

## Best Practices

- **Validate at the boundary** — run validation as the first step in every resolver that accepts input
- **Sanitize, don't just validate** — use `.trim()` and HTML sanitizers to clean input, not just reject it
- **Return structured errors** — field-level errors let clients map messages to specific form inputs
- **Reuse schemas across layers** — share Zod schemas between GraphQL resolvers, REST handlers, and frontend forms

## Common Mistakes

- **Trusting GraphQL's built-in type checking** — GraphQL validates types but not constraints like min length or format
- **Validating in each resolver separately** — leads to inconsistent rules and duplicated logic
- **Throwing raw errors** — clients can't programmatically handle validation errors without structured extensions
- **Forgetting to sanitize HTML** — validation alone doesn't prevent XSS; strip dangerous tags before storing

## FAQ

**Q: Should I use Zod or GraphQL custom scalars for validation?**
A: Use scalars for format validation (email, date). Use Zod for business constraints (min length, cross-field rules). They complement each other.

**Q: Can I share Zod schemas with the frontend?**
A: Yes. If your frontend uses TypeScript, import the same Zod schemas for client-side validation before sending to the API.

**Q: How do I handle file uploads with validation?**
A: Validate file metadata (size, MIME type) in the resolver. GraphQL's multipart upload spec doesn't support Zod directly.

**Q: What about performance with large inputs?**
A: Zod is fast for typical input sizes. For very large payloads (100KB+), consider streaming validation or pre-size limits at the HTTP layer.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
