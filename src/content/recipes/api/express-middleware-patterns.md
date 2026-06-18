---
contentType: recipes
slug: express-middleware-patterns
title: "Express.js Middleware Composition Patterns"
description: "Build maintainable Express applications using middleware composition patterns for authentication, validation, error handling, request context propagation, and async route wrappers"
metaDescription: "Build maintainable Express apps with middleware composition. Patterns for auth, validation, error handling, context propagation and async route wrappers."
difficulty: intermediate
topics:
  - api
  - frontend
tags:
  - express
  - nodejs
  - middleware
  - patterns
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /recipes/security/data-validation-zod
  - /guides/api-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build maintainable Express apps with middleware composition. Patterns for auth, validation, error handling, context propagation and async route wrappers."
  keywords:
    - express middleware
    - middleware composition
    - nodejs patterns
    - async routes
    - error handling
---

# Express.js Middleware Composition Patterns

Express middleware is the backbone of Node.js API architecture, but deeply nested or duplicated middleware chains quickly become unmaintainable. This recipe covers composition patterns for authentication, validation, error handling, request context propagation, and async route wrappers that keep route handlers clean and testable.

## When to Use This

- Express routes accumulate repetitive middleware (auth, logging, validation) copy-pasted everywhere
- Async route handlers throw unhandled promise rejections that crash the server
- You need request-scoped context (user, trace ID) accessible throughout the call stack

## Solution

### 1. Async Route Wrapper

```typescript
// middleware/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage — no try/catch needed
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
}));
```

### 2. Composable Middleware Factory

```typescript
// middleware/compose.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type Middleware = RequestHandler | [RequestHandler, ...RequestHandler[]];

function compose(...middlewares: Middleware[]): RequestHandler[] {
  return middlewares.flatMap((m) => Array.isArray(m) ? m : [m]);
}

// Usage — declarative middleware stacks
const authenticated = compose(verifyToken, requireActiveUser);
const validated = (schema: ZodSchema) => compose(validateBody(schema));

app.post('/posts', ...compose(authenticated, validated(createPostSchema)), asyncHandler(createPost));
app.patch('/posts/:id', ...compose(authenticated, validated(updatePostSchema)), asyncHandler(updatePost));
```

### 3. Request Context Propagation

```typescript
// middleware/context.ts
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

interface RequestContext {
  traceId: string;
  user?: { id: string; role: string };
  startTime: number;
}

const asyncStorage = new AsyncLocalStorage<RequestContext>();

function contextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const context: RequestContext = {
    traceId: req.headers['x-trace-id'] as string || crypto.randomUUID(),
    startTime: Date.now(),
  };

  asyncStorage.run(context, () => {
    res.setHeader('X-Trace-Id', context.traceId);
    next();
  });
}

// Access context anywhere in the async call stack
function getContext(): RequestContext | undefined {
  return asyncStorage.getStore();
}

// Usage in services
class UserService {
  async findById(id: string): Promise<User> {
    const ctx = getContext();
    logger.info('Fetching user', { traceId: ctx?.traceId, userId: id });
    // ...
  }
}
```

### 4. Unified Error Handler

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const ctx = getContext();

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      traceId: ctx?.traceId,
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
      traceId: ctx?.traceId,
    });
    return;
  }

  logger.error('Unhandled error', { traceId: ctx?.traceId, error: err });
  res.status(500).json({
    error: 'Internal server error',
    traceId: ctx?.traceId,
  });
};

app.use(errorHandler);
```

### 5. Validation Middleware with Zod

```typescript
// middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid parameters', issues: result.error.issues });
      return;
    }
    req.params = result.data;
    next();
  };
}
```

## How It Works

- **Async wrappers** catch rejected promises and forward them to Express error handlers
- **Composition** flattens nested middleware arrays into clean, reusable stacks
- **AsyncLocalStorage** creates implicit request context without manual propagation through every function signature
- **Typed validation** transforms and narrows request data at the boundary before route handlers execute

## Production Considerations

- Register error handlers last in middleware stack (after all routes)
- Do not call `next()` after sending a response; it causes "headers already sent" errors
- Use `res.on('finish')` for logging middleware to capture the actual response status

## Common Mistakes

- Calling `next()` inside async middleware without awaiting, causing race conditions
- Forgetting to call `next()` in synchronous middleware, hanging requests indefinitely
- Throwing strings instead of Error objects, losing stack traces

## FAQ

**Q: Should I use Express or Fastify for new projects?**
A: Fastify offers better performance and built-in schema validation. Express has larger ecosystem and familiarity. Both are viable for production.

**Q: How do I test middleware in isolation?**
A: Create a mini Express app in tests, mount the middleware, and make supertest requests against it.
