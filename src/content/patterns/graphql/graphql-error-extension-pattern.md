---



contentType: patterns
slug: graphql-error-extension-pattern
title: "GraphQL Error Extension Pattern"
description: "Attach structured metadata to GraphQL errors using extension codes for predictable client-side error handling."
metaDescription: "Add structured metadata to GraphQL errors with extension codes. Standardize error handling with machine-readable codes, HTTP status mapping, and context."
difficulty: intermediate
category: structural
topics:
  - graphql
  - api
  - architecture
tags:
  - error-extension
  - pattern
  - graphql-errors
  - error-handling
  - api-design
relatedResources:
  - /patterns/graphql-batched-resolver-pattern
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
  - /patterns/graphql-interface-polymorphism-pattern
  - /patterns/graphql-mutation-validation-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Add structured metadata to GraphQL errors with extension codes. Standardize error handling with machine-readable codes, HTTP status mapping, and context."
  keywords:
    - error-extension
    - pattern
    - graphql-errors
    - error-handling
    - api-design



---

## Overview

GraphQL errors come back as a list of `{ message, locations, path }` objects. The `message` field is a human-readable string, but clients need machine-readable codes to handle errors programmatically. The error extension pattern attaches structured metadata to errors via the `extensions` field — error codes, HTTP status equivalents, field paths, and context — so clients can branch on `code` instead of parsing `message`.

## When to Use

- Any GraphQL API where clients need to handle errors programmatically (show different UI for auth vs validation vs not-found)
- APIs consumed by mobile apps or other services that need stable error contracts
- Multi-language clients where parsing English error messages is fragile
- APIs that need to report validation errors with field-level details

## When Not to Use

- Internal tools where the default `message` is sufficient
- Prototypes or throwaway APIs where error handling is not a priority

## Solution

### 1. Define Error Codes

Use a consistent enum of error codes across the entire API:

```typescript
const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_USER_INPUT: 'BAD_USER_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
} as const;

type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

### 2. Custom Error Class

```typescript
import { GraphQLError } from 'graphql';

class GraphQLExtendedError extends GraphQLError {
  constructor(
    message: string,
    code: ErrorCode,
    extensions: Record<string, unknown> = {}
  ) {
    super(message, {
      extensions: {
        code,
        ...extensions,
      },
    });
  }
}
```

### 3. Throwing Structured Errors in Resolvers

```typescript
const resolvers = {
  Query: {
    post: async (_parent, { id }, { db, user }) => {
      if (!user) {
        throw new GraphQLExtendedError(
          'Authentication required',
          ErrorCodes.UNAUTHENTICATED,
          { http: { status: 401 } }
        );
      }

      const post = await db.post.findById(id);
      if (!post) {
        throw new GraphQLExtendedError(
          `Post ${id} not found`,
          ErrorCodes.NOT_FOUND,
          { resourceId: id, http: { status: 404 } }
        );
      }

      if (post.authorId !== user.id && user.role !== 'admin') {
        throw new GraphQLExtendedError(
          'You do not have permission to view this post',
          ErrorCodes.FORBIDDEN,
          { http: { status: 403 } }
        );
      }

      return post;
    },
  },
  Mutation: {
    createPost: async (_parent, { input }, { db, user }) => {
      if (!user) {
        throw new GraphQLExtendedError(
          'Authentication required',
          ErrorCodes.UNAUTHENTICATED
        );
      }

      if (!input.title || input.title.trim().length === 0) {
        throw new GraphQLExtendedError(
          'Title is required',
          ErrorCodes.VALIDATION_ERROR,
          { field: 'title', constraint: 'required' }
        );
      }

      if (input.title.length > 200) {
        throw new GraphQLExtendedError(
          'Title must be 200 characters or less',
          ErrorCodes.VALIDATION_ERROR,
          { field: 'title', constraint: 'max_length', max: 200, actual: input.title.length }
        );
      }

      return db.post.create({ ...input, authorId: user.id });
    },
  },
};
```

### 4. Client-Side Error Handling

Clients branch on `extensions.code` instead of parsing `message`:

```typescript
async function fetchPost(id: string) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `query { post(id: "${id}") { title body } }` }),
  });

  const { data, errors } = await response.json();

  if (errors) {
    const error = errors[0];
    const code = error.extensions?.code;

    switch (code) {
      case 'UNAUTHENTICATED':
        redirectToLogin();
        return;
      case 'NOT_FOUND':
        showNotFoundPage();
        return;
      case 'FORBIDDEN':
        showAccessDenied();
        return;
      case 'VALIDATION_ERROR':
        showFieldError(error.extensions.field, error.message);
        return;
      default:
        showGenericError(error.message);
        return;
    }
  }

  return data.post;
}
```

### 5. Global Error Formatting

Use Apollo Server's `formatError` to sanitize errors before they reach clients:

```typescript
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Never expose internal errors to clients
    if (formattedError.extensions?.code === 'INTERNAL_ERROR') {
      return {
        message: 'An internal error occurred',
        extensions: {
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Log full error server-side, return sanitized version to client
    console.error('GraphQL Error:', {
      code: formattedError.extensions?.code,
      message: formattedError.message,
      path: formattedError.path,
      stack: error?.stack,
    });

    // Remove stack traces from client responses
    delete formattedError.extensions?.stacktrace;
    return formattedError;
  },
});
```

## Explanation

- **Error codes**: Stable, machine-readable identifiers that clients can switch on. They never change even when messages are reworded
- **Extensions**: The GraphQL spec's `extensions` field on errors is an arbitrary JSON object — use it for `code`, `field`, `http.status`, `resourceId`, or any metadata clients need
- **HTTP status**: GraphQL responses always return HTTP 200, but including `http.status` in extensions lets gateways or middleware translate to proper HTTP codes if needed
- **Sanitization**: `formatError` runs before the response is sent — strip stack traces, rewrite internal errors, add timestamps

## Variants

### Validation Error Collection

Return multiple validation errors in one response:

```typescript
Mutation: {
  createPost: async (_parent, { input }, { db, user }) => {
    const errors: GraphQLError[] = [];

    if (!input.title?.trim()) {
      errors.push(new GraphQLExtendedError('Title required', ErrorCodes.VALIDATION_ERROR, { field: 'title' }));
    }
    if (!input.body?.trim()) {
      errors.push(new GraphQLExtendedError('Body required', ErrorCodes.VALIDATION_ERROR, { field: 'body' }));
    }
    if (input.tags && input.tags.length > 10) {
      errors.push(new GraphQLExtendedError('Max 10 tags', ErrorCodes.VALIDATION_ERROR, { field: 'tags', max: 10 }));
    }

    if (errors.length > 0) {
      throw new GraphQLError('Validation failed', {
        extensions: {
          code: ErrorCodes.VALIDATION_ERROR,
          errors: errors.map((e) => e.extensions),
        },
      });
    }

    return db.post.create(input);
  },
},
```

### Error Translation by Language

```typescript
const errorMessages = {
  UNAUTHENTICATED: {
    en: 'Authentication required',
    es: 'Se requiere autenticacion',
    fr: 'Authentification requise',
  },
  NOT_FOUND: {
    en: 'Resource not found',
    es: 'Recurso no encontrado',
    fr: 'Ressource introuvable',
  },
};

function createError(code: ErrorCode, lang: string, extensions: Record<string, unknown> = {}) {
  const message = errorMessages[code]?.[lang] ?? errorMessages[code]?.en ?? code;
  return new GraphQLExtendedError(message, code, extensions);
}
```

### Rate Limit Error with Retry-After

```typescript
throw new GraphQLExtendedError(
  'Rate limit exceeded. Try again in 60 seconds.',
  ErrorCodes.RATE_LIMITED,
  {
    http: { status: 429 },
    retryAfter: 60,
    limit: 100,
    remaining: 0,
  }
);
```

## Best Practices


- For a deeper guide, see [Complete Guide to GraphQL Schema Design](/guides/complete-guide-graphql-schema-design/).

- Use a fixed set of error codes — document them in the schema as a custom scalar or directive
- Never change error code strings after release — clients depend on them
- Always include `code` in extensions, even for unexpected errors
- Strip stack traces and internal details in `formatError` before sending to clients
- Log full errors server-side with request IDs for debugging
- Include field-level details in validation errors so clients can highlight the right inputs
- Use `INTERNAL_ERROR` for unhandled exceptions — never leak database error messages

## Common Mistakes

- **Relying on `message` for control flow**: Messages get reworded or translated, breaking client logic
- **Leaking stack traces**: Default Apollo Server includes `extensions.stacktrace` — strip it in `formatError`
- **Using HTTP status codes as error codes**: They're different domains. Use semantic codes (`NOT_FOUND`) and optionally include HTTP status in extensions
- **Not handling unexpected errors**: Wrap resolvers in try/catch or use a global error plugin to ensure every error has a `code`
- **Returning errors as data instead of throwing**: GraphQL has a built-in errors array — use it. Clients expect errors there, not in `data`

## FAQ

**Should I use GraphQL errors or return error types in the schema?**

Both approaches work. Errors are simpler for cross-cutting concerns (auth, validation). Union return types (`CreatePostResult = CreatePostSuccess | ValidationError`) give type-safe error handling per field but add schema complexity. Use errors for most cases, unions for fields where errors are part of normal flow.

**How do error extensions work with federation?**

Federation preserves error extensions across the gateway. Subgraph errors are forwarded to the client with their extensions intact, including the subgraph name in `extensions.serviceName`.

**Can I localize error messages?**

Yes. Pass the user's language preference via context and translate messages in resolvers or `formatError`. Keep error codes language-independent.

**What HTTP status should GraphQL errors return?**

GraphQL spec says responses use HTTP 200 regardless of errors. Some gateways translate specific error codes to HTTP 4xx/5xx. Include `http.status` in extensions if you need this behavior.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
