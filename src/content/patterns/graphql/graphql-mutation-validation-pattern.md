---
contentType: patterns
slug: graphql-mutation-validation-pattern
title: "GraphQL Mutation Validation Pattern"
description: "Centralize input validation for GraphQL mutations using custom validators, schema directives, and structured error responses."
metaDescription: "GraphQL mutation validation: centralize input validation with custom validators and structured error codes. Field-level validation in Apollo Server TypeScript."
difficulty: intermediate
topics:
  - graphql
  - design
tags:
  - graphql
  - mutation
  - validation
  - pattern
  - input-validation
  - error-handling
  - typescript
  - apollo-server
relatedResources:
  - /patterns/graphql/graphql-error-extension-pattern
  - /patterns/graphql/graphql-dataloader-pattern
  - /recipes/graphql/graphql-input-validation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "GraphQL mutation validation: centralize input validation with custom validators and structured error codes. Field-level validation in Apollo Server TypeScript."
  keywords:
    - graphql mutation validation
    - graphql input validation
    - apollo server validation
    - graphql error handling
    - centralized validation graphql
    - graphql custom scalars
---

# GraphQL Mutation Validation Pattern

## Overview

GraphQL mutations accept input types that need validation before processing. Without a centralized approach, each resolver repeats validation logic: checking required fields, validating email formats, enforcing string lengths, verifying numeric ranges. This leads to inconsistent rules and error formats across mutations.

The mutation validation pattern centralizes validation into reusable validators. Each mutation runs its input through a validation pipeline that returns structured errors with field paths and machine-readable codes. Resolvers focus on business logic, not input checking.

## When to Use

- You have multiple mutations that accept user input
- Validation rules are repeated across resolvers
- You need field-level error details for form rendering
- You want to separate validation from business logic
- You need consistent error codes across all mutations

## Solution

### Validation Framework

```typescript
import { GraphQLError } from 'graphql';

type ValidationRule = {
  field: string;
  rule: (value: any, input: Record<string, any>) => boolean;
  message: string;
  code: string;
};

function validateInput(input: Record<string, any>, rules: ValidationRule[]): void {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  for (const rule of rules) {
    const value = input[rule.field];
    if (!rule.rule(value, input)) {
      errors.push({
        field: rule.field,
        message: rule.message,
        code: rule.code,
      });
    }
  }

  if (errors.length > 0) {
    throw new GraphQLError('Validation failed', {
      extensions: {
        code: 'VALIDATION_ERROR',
        fields: errors.map(e => e.field),
        errors,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

### Reusable Validation Rules

```typescript
const rules = {
  required: (field: string): ValidationRule => ({
    field,
    rule: (value) => value !== undefined && value !== null && value !== '',
    message: `${field} is required`,
    code: 'REQUIRED',
  }),

  minLength: (field: string, min: number): ValidationRule => ({
    field,
    rule: (value) => typeof value === 'string' && value.length >= min,
    message: `${field} must be at least ${min} characters`,
    code: 'MIN_LENGTH',
  }),

  maxLength: (field: string, max: number): ValidationRule => ({
    field,
    rule: (value) => typeof value === 'string' && value.length <= max,
    message: `${field} must be at most ${max} characters`,
    code: 'MAX_LENGTH',
  }),

  email: (field: string): ValidationRule => ({
    field,
    rule: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: `${field} must be a valid email address`,
    code: 'INVALID_EMAIL',
  }),

  range: (field: string, min: number, max: number): ValidationRule => ({
    field,
    rule: (value) => typeof value === 'number' && value >= min && value <= max,
    message: `${field} must be between ${min} and ${max}`,
    code: 'OUT_OF_RANGE',
  }),

  url: (field: string): ValidationRule => ({
    field,
    rule: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: `${field} must be a valid URL`,
    code: 'INVALID_URL',
  }),
};
```

### Using Validators in Resolvers

```typescript
const resolvers = {
  Mutation: {
    createUser: async (_, { input }, context) => {
      validateInput(input, [
        rules.required('name'),
        rules.minLength('name', 2),
        rules.maxLength('name', 100),
        rules.required('email'),
        rules.email('email'),
        rules.maxLength('bio', 500),
        rules.url('website'),
      ]);

      const existing = await context.db.query(
        'SELECT id FROM users WHERE email = $1',
        [input.email]
      );
      if (existing.length > 0) {
        throw new GraphQLError('Email already registered', {
          extensions: {
            code: 'DUPLICATE_EMAIL',
            field: 'email',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const user = await context.db.query(
        'INSERT INTO users (name, email, bio, website) VALUES ($1, $2, $3, $4) RETURNING *',
        [input.name, input.email, input.bio || null, input.website || null]
      );
      return user[0];
    },

    updatePost: async (_, { input }, context) => {
      validateInput(input, [
        rules.required('id'),
        rules.required('title'),
        rules.minLength('title', 5),
        rules.maxLength('title', 200),
        rules.required('body'),
        rules.minLength('body', 50),
        rules.range('status', 0, 3),
      ]);

      const post = await context.db.query(
        'UPDATE posts SET title = $1, body = $2, status = $3 WHERE id = $4 RETURNING *',
        [input.title, input.body, input.status, input.id]
      );
      if (post.length === 0) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND', timestamp: new Date().toISOString() },
        });
      }
      return post[0];
    },
  },
};
```

### Schema-Level Validation with Custom Scalars

```typescript
import { GraphQLScalarType, GraphQLError } from 'graphql';

const EmailScalar = new GraphQLScalarType({
  name: 'Email',
  description: 'A validated email address',

  parseValue: (value: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new GraphQLError('Invalid email format', {
        extensions: { code: 'INVALID_EMAIL', field: 'email' },
      });
    }
    return value.toLowerCase().trim();
  },

  parseLiteral: (ast: any) => {
    if (ast.kind !== 'StringValue') {
      throw new GraphQLError('Email must be a string', {
        extensions: { code: 'INVALID_TYPE' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ast.value)) {
      throw new GraphQLError('Invalid email format', {
        extensions: { code: 'INVALID_EMAIL' },
      });
    }
    return ast.value.toLowerCase().trim();
  },

  serialize: (value: string) => value,
});

const typeDefs = `
  scalar Email

  input CreateUserInput {
    name: String!
    email: Email!
    bio: String
    website: String
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
  }
`;
```

### Client-Side Error Handling

```typescript
async function createUser(input: CreateUserInput) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) { id name email }
      }`,
      variables: { input },
    }),
  });
  const { data, errors } = await response.json();

  if (errors) {
    const validationError = errors.find(e => e.extensions?.code === 'VALIDATION_ERROR');
    if (validationError) {
      const fieldErrors = validationError.extensions.errors;
      for (const err of fieldErrors) {
        setFieldError(err.field, err.message);
      }
      return null;
    }
    throw new Error(errors[0].message);
  }
  return data.createUser;
}
```

## Explanation

The pattern separates validation into three layers:

1. **Schema-level validation** — custom scalars (like `Email`) validate at the parse stage. Invalid values are rejected before the resolver runs. This is the earliest validation point.

2. **Rule-based validation** — the `validateInput` function runs a list of rules against the input object. Each rule checks one field and returns a structured error if the check fails. All rules run, so the client gets all errors at once instead of one per request.

3. **Business validation** — checks that require database access (duplicate email, foreign key existence) run in the resolver after rule validation passes. These throw single-field errors since they are specific to the business logic.

The error extension pattern integrates naturally: all validation errors carry `code: 'VALIDATION_ERROR'` with a `fields` array and detailed `errors` array. Clients switch on the code and render field-level errors.

## Variants

| Approach | Layer | Best For |
|----------|-------|----------|
| Custom scalars | Schema parse | Format validation (email, URL, date) |
| Rule-based validators | Resolver entry | Field-level rules (required, length, range) |
| Schema directives | Schema validation | Authorization and rate limiting |
| Zod schemas | Resolver entry | TypeScript projects with type inference |
| Joi/Yup schemas | Resolver entry | Complex nested object validation |

## Best Practices

- **Validate early, validate once** — use custom scalars for format checks so invalid values never reach the resolver
- **Return all errors at once** — collect all validation failures before throwing. Clients can display all field errors in one render cycle.
- **Use consistent error codes** — `REQUIRED`, `MIN_LENGTH`, `INVALID_EMAIL` across all mutations so clients can handle them generically
- **Separate format from business validation** — format checks (email pattern) in validators, business checks (duplicate email) in resolvers
- **Sanitize after validation** — trim strings, lowercase emails, normalize URLs after validation passes but before database insertion

## Common Mistakes

- **Throwing on the first error** — returning one error per request forces clients to submit, fix, resubmit repeatedly. Collect all errors first.
- **Validating in the resolver body** — mixing validation with business logic makes both harder to test and maintain. Run validation first, then business logic.
- **Not using custom scalars** — validating email format in every resolver that accepts an email is repetitive. Create an `Email` scalar once.
- **Inconsistent error formats** — some resolvers return `field: "email"`, others return `path: ["input", "email"]`. Standardize the format.
- **Skipping validation on updates** — `updatePost` mutations need validation too, even though some fields are optional. Validate present fields.

## Frequently Asked Questions

### Should I use custom scalars or rule-based validators?

Both. Custom scalars handle format validation (email pattern, URL format) at the schema level. Rule-based validators handle business rules (min length, required fields, ranges) at the resolver level. They complement each other.

### Can I use Zod for GraphQL validation?

Yes. Define a Zod schema for each input type and call `schema.parse(input)` at the start of each resolver. Zod provides type inference and detailed error paths. The downside is duplicating the schema definition (once in GraphQL types, once in Zod).

### How do I handle nested input validation?

Flatten nested fields in the error response: `address.street`, `address.city`. The `field` property in the error object supports dot notation. Clients can map these to nested form structures.

### What about file uploads?

GraphQL file uploads use the `graphql-upload` package or multipart requests. Validate file size, MIME type, and extension in the resolver before processing. Custom scalars do not work well for file inputs.
