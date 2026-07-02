---
contentType: recipes
slug: graphql-error-handling-best-practices
title: "Structured GraphQL Errors with Extension Codes"
description: "Implement structured error handling in GraphQL with custom error classes, extension codes, and consistent error formatting for clients"
metaDescription: "Handle GraphQL errors with structured extension codes. Custom error classes, consistent formatting, and actionable messages for client developers."
difficulty: intermediate
topics:
  - graphql
  - api
tags:
  - graphql
  - error handling
  - extensions
  - api design
  - debugging
relatedResources:
  - /recipes/graphql/graphql-input-validation
  - /recipes/api/graphql-apollo-server
  - /recipes/api/handle-errors
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Handle GraphQL errors with structured extension codes. Custom error classes, consistent formatting, and actionable messages for client developers."
  keywords:
    - graphql error handling
    - graphql extensions
    - graphql error codes
    - structured errors
    - graphql formatError
---

# Structured GraphQL Errors with Extension Codes

GraphQL errors are just objects with a `message` field. Without structure, clients resort to string matching to determine what went wrong. Adding `extensions.code` gives clients a machine-readable error category, while additional extension fields carry context like validation details, retry hints, or affected fields. This recipe shows how to build a consistent error system across your GraphQL API.

## When to Use This

- Any GraphQL API consumed by multiple clients (web, mobile, third-party)
- APIs where clients need to programmatically handle different error types
- Services that need to distinguish between validation, auth, not-found, and server errors

## Prerequisites

- A GraphQL server (Apollo Server, GraphQL Yoga, or Mercurius)
- Basic understanding of GraphQL error responses

## Solution

### 1. Define Error Codes

```typescript
// errors/codes.ts
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

### 2. Create a Base GraphQL Error

```typescript
// errors/base.ts
import { GraphQLError } from 'graphql';
import { ErrorCodes, type ErrorCode } from './codes';

export class GraphQLErrorExtension extends GraphQLError {
  constructor(
    message: string,
    code: ErrorCode,
    extensions?: Record<string, unknown>
  ) {
    super(message, {
      extensions: {
        code,
        ...extensions,
      },
    });
    this.name = this.constructor.name;
  }
}

export class ValidationError extends GraphQLErrorExtension {
  constructor(errors: { field: string; message: string }[]) {
    super('Input validation failed', ErrorCodes.VALIDATION_ERROR, { errors });
  }
}

export class AuthenticationError extends GraphQLErrorExtension {
  constructor(message = 'Authentication required') {
    super(message, ErrorCodes.UNAUTHENTICATED);
  }
}

export class ForbiddenError extends GraphQLErrorExtension {
  constructor(message = 'Insufficient permissions') {
    super(message, ErrorCodes.FORBIDDEN);
  }
}

export class NotFoundError extends GraphQLErrorExtension {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, ErrorCodes.NOT_FOUND, { resource, id });
  }
}

export class ConflictError extends GraphQLErrorExtension {
  constructor(message: string, conflicts?: Record<string, unknown>) {
    super(message, ErrorCodes.CONFLICT, { conflicts });
  }
}

export class RateLimitError extends GraphQLErrorExtension {
  constructor(retryAfter: number) {
    super('Rate limit exceeded', ErrorCodes.RATE_LIMITED, { retryAfter });
  }
}
```

### 3. Use Errors in Resolvers

```typescript
// resolvers.ts
import { ValidationError, NotFoundError, AuthenticationError, ForbiddenError } from './errors/base';

export const resolvers = {
  Query: {
    post: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      if (!ctx.user) throw new AuthenticationError();
      const post = await ctx.db.posts.findById(id);
      if (!post) throw new NotFoundError('Post', id);
      if (post.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new ForbiddenError('You can only view your own posts');
      }
      return post;
    },
  },

  Mutation: {
    createPost: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      if (!ctx.user) throw new AuthenticationError();

      const errors = validatePostInput(input);
      if (errors.length > 0) throw new ValidationError(errors);

      const existing = await ctx.db.posts.findBySlug(input.slug);
      if (existing) throw new ConflictError('Slug already exists', { slug: input.slug });

      return ctx.db.posts.create({ ...input, authorId: ctx.user.id });
    },
  },
};

function validatePostInput(input: any): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];
  if (!input.title || input.title.length < 3) {
    errors.push({ field: 'title', message: 'Title must be at least 3 characters' });
  }
  if (!input.content || input.content.length < 10) {
    errors.push({ field: 'content', message: 'Content must be at least 10 characters' });
  }
  return errors;
}
```

### 4. Configure Error Formatting in Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { ErrorCodes } from './errors/codes';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formatted, error) => {
    if (error?.extensions?.code) {
      return {
        message: formatted.message,
        extensions: {
          code: error.extensions.code,
          ...error.extensions,
        },
      };
    }

    return {
      message: 'Internal server error',
      extensions: {
        code: ErrorCodes.INTERNAL_ERROR,
      },
    };
  },
});
```

### 5. Client-Side Error Handling

```typescript
// client.ts
async function createPost(input: CreatePostInput) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CREATE_POST_MUTATION, variables: { input } }),
  });

  const { data, errors } = await response.json();

  if (errors) {
    for (const error of errors) {
      switch (error.extensions.code) {
        case 'VALIDATION_ERROR':
          console.error('Validation:', error.extensions.errors);
          break;
        case 'UNAUTHENTICATED':
          window.location.href = '/login';
          break;
        case 'NOT_FOUND':
          console.error('Not found:', error.extensions.resource);
          break;
        case 'RATE_LIMITED':
          const retryAfter = error.extensions.retryAfter;
          console.log(`Rate limited. Retry in ${retryAfter}s`);
          break;
        default:
          console.error('Unexpected:', error.message);
      }
    }
    return null;
  }

  return data.createPost;
}
```

## How It Works

1. **`GraphQLErrorExtension`** wraps `GraphQLError` with a required `code` in extensions, ensuring every error has a machine-readable category
2. **Specialized error classes** (`ValidationError`, `NotFoundError`, etc.) carry domain-specific context in extensions while sharing a consistent structure
3. **`formatError`** in Apollo Server acts as a safety net — it ensures internal errors don't leak stack traces and all errors have a code
4. **Clients switch on `extensions.code`** instead of parsing message strings, making error handling robust against message changes

## Variants

### Error Logging Plugin

Log errors with structured metadata without leaking to clients:

```typescript
const errorLogger = {
  async requestDidStart() {
    return {
      async didEncounterErrors(requestContext) {
        for (const error of requestContext.errors) {
          if (error.extensions?.code === ErrorCodes.INTERNAL_ERROR) {
            logger.error({
              query: requestContext.operationName,
              variables: requestContext.request.variables,
              error: error.message,
              stack: error.stack,
            });
          }
        }
      },
    };
  },
};
```

### Union Types for Expected Errors

For errors that are part of the domain (not exceptional), model them as union types:

```graphql
union CreatePostResult = Post | ValidationError | AuthError

type Mutation {
  createPost(input: CreatePostInput!): CreatePostResult!
}
```

This gives clients type-safe error handling without try/catch.

## Best Practices

- **Always include `extensions.code`** — it is the contract between server and client for error handling
- **Never leak stack traces** in production — `formatError` should strip them
- **Log internal errors server-side** — clients see a generic message, your logs see the full trace
- **Keep error messages actionable** — tell the client what to fix, not just what broke

## Common Mistakes

- **Using HTTP status codes for GraphQL errors** — GraphQL always returns 200; errors are in the response body
- **Throwing plain `Error`** — lacks `extensions.code`, forcing clients to string-match messages
- **Exposing internal error messages** — database errors, file paths, or stack traces leak implementation details
- **Overloading `INTERNAL_ERROR`** — if an error is expected (not found, validation), give it its own code

## FAQ

**Q: Should I use GraphQL errors or union types for expected failures?**
A: Use errors for exceptional cases (server down, auth failure). Use union types for domain outcomes that clients need to handle in the UI (validation, not found, conflict).

**Q: How do I test error responses?**
A: Assert on `errors[0].extensions.code` in your test client. This is more stable than asserting on message text.

**Q: Can I add custom extension fields?**
A: Yes. Extensions is an open map. Add `retryAfter`, `field`, `conflicts`, or any metadata clients need.

**Q: Should I localize error messages?**
A: Return error codes and field names in extensions. Let clients localize the message based on the code and user locale.
