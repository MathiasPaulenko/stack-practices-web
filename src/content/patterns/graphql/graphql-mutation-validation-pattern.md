---
contentType: patterns
slug: graphql-mutation-validation-pattern
title: "GraphQL Mutation Validation Pattern: Centralized Input Validation"
description: "Centralize GraphQL mutation validation with reusable rules, custom scalars, and structured errors. Includes TypeScript examples and best practices."
metaDescription: "Centralize GraphQL mutation validation with reusable rules, custom scalars, and structured errors. Includes TypeScript examples and best practices."
difficulty: intermediate
topics:
  - graphql
  - design
tags:
  - graphql
  - mutation
  - validation
  - input-validation
  - error-handling
  - typescript
  - apollo-server
relatedResources:
  - /patterns/graphql-error-extension-pattern
  - /patterns/graphql-dataloader-pattern
  - /recipes/graphql-input-validation
  - /patterns/graphql-federated-entity-pattern
  - /patterns/backend-for-frontend-pattern
  - /patterns/graphql-connection-pagination-pattern
lastUpdated: "2026-08-23"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Centralize GraphQL mutation validation with reusable rules, custom scalars, and structured errors. Includes TypeScript examples and best practices."
  keywords:
    - graphql mutation validation
    - graphql input validation
    - apollo server validation
    - graphql error handling
    - centralized validation graphql
    - graphql custom scalars
---

## Overview

GraphQL mutations take inputs that need a sanity check before the real work starts. Without a centralized
approach, every resolver ends up re-checking the same things: required fields, email format, string length, and
numeric range. That duplication produces inconsistent rules and error formats across the API.

The GraphQL mutation validation pattern moves input validation into a reusable pipeline. Each mutation passes
its input through a set of rules and receives a structured list of field-level errors with machine-readable
codes. Then resolvers can get on with business logic and stop worrying about input checks.

## When to Use

Reach for this pattern when you've got several mutations that accept user input and the same validation rules keep
cropping up in different resolvers. It also fits when clients need field-level error details to render forms, when
you want consistent error codes across the API, and when you want validation kept out of business logic.

## When to Avoid

Avoid it for a single mutation with one or two simple fields; the extra overhead may not be worth it. Also skip
it if the database or schema already handles validation for you. And don't introduce
it unless the client can consume structured field-level errors — a generic `BAD_REQUEST` response is often enough
for internal tools.

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

The pattern organizes validation into three layers.

Schema-level validation uses custom scalars such as `Email` to reject invalid values during parsing, before the
resolver runs. This is the earliest gate that blocks bad input.

Rule-based validation calls `validateInput` against the input object. Each rule checks one field; if it fails, it
adds an error. Every rule runs, so the client receives the full list of errors in one shot.

Business validation covers checks that need the database, such as duplicate emails or foreign-key existence. These
run in the resolver after the rule-based validation passes and usually return a single-field error tied to a specific
business rule.

All validation errors share the same extension format with a `code`, a `fields` array, and a detailed `errors` array.
Clients can switch on the code and render field-level messages.

## Variants

Custom scalars validate at the schema parse stage. They fit strict format checks such as email, URL, or date.
Rule-based validators kick in at the start of the resolver and handle field-level rules like required fields,
length,
and range. Schema directives are a good place for authorization and rate limiting. Zod fits TypeScript projects
that want type inference; Joi or Yup work better for complex nested objects.

A rule-based pipeline handles most cases.

## Best Practices

Validate early with custom scalars so bad values never reach the resolver. Return every validation error in one
response, so the client can flag all the bad fields at once. Use consistent error codes such as `REQUIRED`,
`MIN_LENGTH`, and `INVALID_EMAIL` across all mutations. Keep format checks in validators and business checks in
resolvers. After validation passes, sanitize inputs — trim strings, lowercase emails, normalize URLs — but before
writing to the database.

## Common Mistakes

Throwing on the first error forces clients into a submit-fix-resubmit loop, so collect every failure first. Mixing
validation with business logic in the resolver makes both harder to test; run validation first, then business logic.
Validating email format in every resolver is repetitive, so create an `Email` scalar once. When resolvers return
different error shapes, clients don't know which field is wrong. Standardize on one format. And don't skip
validation on update mutations; validate optional fields too if they're supplied.

## FAQ

### Should I use custom scalars or rule-based validators?

Use both. Custom scalars handle format validation at the schema level; rule-based validators handle business rules
such as length, required fields, and ranges at the resolver level. They complement each other.

### Can I use Zod for GraphQL validation?

Yes. Define a Zod schema for each input type and call `schema.parse(input)` at the start of each resolver. Zod
gives you both type inference and rich error paths. The trade-off is duplicating the schema definition once in
GraphQL types and once in Zod.

### How do I handle nested input validation?

Report nested fields as flat paths in the error response. Use dot paths like `address.street` and `address.city`
so the client knows where the error belongs. Because the `field` property supports dot notation, clients can map
those values back to nested form fields.

### What about file uploads?

GraphQL file uploads use the `graphql-upload` package or multipart requests. Check file size, MIME type, and
extension in the resolver before doing anything else. Custom scalars don’t work well for file inputs.
