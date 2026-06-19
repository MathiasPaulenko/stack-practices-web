---
contentType: patterns
slug: chain-of-responsibility-middleware
title: "Chain of Responsibility for Request Processing Middleware"
description: "Pass requests along a chain of handlers where each handler decides whether to process the request or pass it to the next handler in the pipeline"
metaDescription: "Chain of Responsibility for middleware pipelines. Pass requests through a chain of handlers where each decides to process or delegate to the next handler."
difficulty: intermediate
topics:
  - design
  - api
tags:
  - chain-of-responsibility
  - behavioral-patterns
  - nodejs
  - design-pattern
relatedResources:
  - /patterns/design/decorator-pattern-pipeline
  - /patterns/design/proxy-pattern-access-control
  - /guides/api-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Chain of Responsibility for middleware pipelines. Pass requests through a chain of handlers where each decides to process or delegate to the next handler."
  keywords:
    - chain of responsibility
    - middleware pipeline
    - request processing
    - behavioral patterns
    - express middleware
---

# Chain of Responsibility for Request Processing Middleware

The [Chain of Responsibility](/patterns/design/chain-of-responsibility-pattern) pattern passes requests along a chain of handlers. Each handler decides either to process the request or to pass it to the next handler on the chain. This pattern decouples senders from receivers, allowing multiple objects to handle a request without the sender knowing which object will ultimately process it.

## When to Use This

- More than one object may handle a request and the handler is not known in advance
- You want to issue a request to one of several objects without specifying the receiver explicitly
- The set of objects that can handle a request should be specified dynamically

## Problem

An HTTP request needs to pass through authentication, [rate limiting](/recipes/security/rate-limiting), request validation, and logging. Hardcoding this sequence in the router makes the pipeline rigid and hard to extend.

## Solution

```typescript
// chain/Handler.ts
interface RequestContext {
  headers: Record<string, string>;
  body: unknown;
  path: string;
  method: string;
  user?: { id: string; roles: string[] };
}

type NextFunction = () => void;

abstract class MiddlewareHandler {
  protected next: MiddlewareHandler | null = null;

  setNext(handler: MiddlewareHandler): MiddlewareHandler {
    this.next = handler;
    return handler;
  }

  handle(req: RequestContext, next: NextFunction): void {
    if (this.canHandle(req)) {
      this.process(req, () => {
        if (this.next) {
          this.next.handle(req, next);
        } else {
          next();
        }
      });
    } else if (this.next) {
      this.next.handle(req, next);
    } else {
      next();
    }
  }

  protected abstract canHandle(req: RequestContext): boolean;
  protected abstract process(req: RequestContext, next: NextFunction): void;
}

// Concrete Handlers
class AuthMiddleware extends MiddlewareHandler {
  protected canHandle(): boolean {
    return true; // Always check auth
  }

  protected process(req: RequestContext, next: NextFunction): void {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Unauthorized');
    }

    // Verify token
    req.user = { id: 'user123', roles: ['user'] };
    next();
  }
}

class RateLimitMiddleware extends MiddlewareHandler {
  private requests = new Map<string, number[]>();
  private readonly windowMs = 60000;
  private readonly maxRequests = 100;

  protected canHandle(): boolean {
    return true;
  }

  protected process(req: RequestContext, next: NextFunction): void {
    const clientId = req.headers['x-client-id'] || req.user?.id || 'anonymous';
    const now = Date.now();
    const window = this.requests.get(clientId) || [];

    const recent = window.filter(t => now - t < this.windowMs);

    if (recent.length >= this.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    recent.push(now);
    this.requests.set(clientId, recent);
    next();
  }
}

class ValidationMiddleware extends MiddlewareHandler {
  protected canHandle(req: RequestContext): boolean {
    return req.method === 'POST' || req.method === 'PUT';
  }

  protected process(req: RequestContext, next: NextFunction): void {
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }
    next();
  }
}

class LoggingMiddleware extends MiddlewareHandler {
  protected canHandle(): boolean {
    return true;
  }

  protected process(req: RequestContext, next: NextFunction): void {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  }
}

// Build chain
const auth = new AuthMiddleware();
const rateLimit = new RateLimitMiddleware();
const validation = new ValidationMiddleware();
const logging = new LoggingMiddleware();

auth.setNext(rateLimit).setNext(validation).setNext(logging);

// Usage
function handleRequest(req: RequestContext): void {
  auth.handle(req, () => {
    console.log('Request reached final handler');
  });
}
```

## How It Works

1. **Handler** declares the interface for handling requests and accessing the next handler
2. **Concrete Handler** processes requests it is responsible for or forwards them
3. **Client** initiates the request to a handler in the chain

## Variation: Express-Style Middleware

```typescript
// Express-style with functions instead of classes
type Middleware = (req: RequestContext, next: NextFunction) => void;

function compose(middlewares: Middleware[]): Middleware {
  return (req, finalNext) => {
    let index = -1;

    function dispatch(i: number): void {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      const fn = i < middlewares.length ? middlewares[i] : finalNext;
      if (!fn) return;

      fn(req, () => dispatch(i + 1));
    }

    dispatch(0);
  };
}

const pipeline = compose([
  (req, next) => { console.log('Auth'); next(); },
  (req, next) => { console.log('Rate limit'); next(); },
  (req, next) => { console.log('Log'); next(); },
]);
```

## Production Considerations

- Ensure handlers call `next()` to avoid stalling the pipeline
- Consider short-circuiting (not calling `next()`) for caching or early rejection
- Keep middleware stateless or scoped to the request to prevent leaks

## Common Mistakes

- Creating circular chains that cause infinite loops
- Not calling `next()` in async handlers, causing requests to hang
- Storing mutable state in handlers shared across concurrent requests

## FAQ

**Q: How is this different from Decorator?**
A: [Decorator](/patterns/design/decorator-pattern) adds responsibilities dynamically but all decorators process the request. Chain of Responsibility passes requests until one handles it.

**Q: Can I add handlers at runtime?**
A: Yes. This is the primary advantage — middleware can be registered dynamically based on routes or configuration.
