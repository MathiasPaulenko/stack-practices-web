---
contentType: patterns
slug: chain-of-responsibility-pattern
title: "Chain of Responsibility Pattern"
description: "Pass requests along a chain of handlers until one handles it. A behavioral design pattern for decoupling senders and receivers."
metaDescription: "Learn the Chain of Responsibility Pattern in Python, Java, and JavaScript. Behavioral pattern for request handling pipelines and middleware chains."
difficulty: intermediate
topics:
  - design
tags:
  - chain-of-responsibility
  - pattern
  - design-pattern
  - behavioral
  - middleware
  - pipeline
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/command-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the Chain of Responsibility Pattern in Python, Java, and JavaScript. Behavioral pattern for request handling pipelines and middleware chains."
  keywords:
    - chain of responsibility
    - design pattern
    - behavioral pattern
    - middleware chain
    - request pipeline
    - python chain
    - java chain
    - javascript middleware
---

# Chain of Responsibility Pattern

## Overview

The Chain of Responsibility Pattern is a behavioral design pattern that lets you pass requests along a chain of handlers. Each handler decides either to process the request or to pass it to the next handler in the chain. This decouples senders from receivers and allows multiple objects to handle a request without the sender knowing which one will process it.

## When to Use

Use the Chain of Responsibility Pattern when:
- More than one object may handle a request, and the handler isn't known in advance
- You want to issue a request to one of several objects without specifying the receiver explicitly
- The set of objects that can handle a request should be specified dynamically
- You need a [pipeline](/patterns/design/chain-of-responsibility-middleware) or middleware where each step can process, transform, or stop a request

## Solution

### Python

```python
from abc import ABC, abstractmethod
from typing import Optional

class Handler(ABC):
    def __init__(self):
        self._next: Optional['Handler'] = None

    def set_next(self, handler: 'Handler') -> 'Handler':
        self._next = handler
        return handler  # Enable fluent chaining

    @abstractmethod
    def handle(self, request: str) -> Optional[str]:
        pass

    def _pass_to_next(self, request: str) -> Optional[str]:
        if self._next:
            return self._next.handle(request)
        return None

class AuthHandler(Handler):
    def handle(self, request: str) -> Optional[str]:
        if not request.startswith("token:"):
            return "401 Unauthorized"
        return self._pass_to_next(request)

class RateLimitHandler(Handler):
    def __init__(self):
        super().__init__()
        self.requests = 0
        self.limit = 3

    def handle(self, request: str) -> Optional[str]:
        self.requests += 1
        if self.requests > self.limit:
            return "429 Too Many Requests"
        return self._pass_to_next(request)

class DataHandler(Handler):
    def handle(self, request: str) -> Optional[str]:
        return f"Processed: {request}"

# Build the chain
handler = AuthHandler()
handler.set_next(RateLimitHandler()).set_next(DataHandler())

print(handler.handle("token:abc123"))  # Processed
print(handler.handle("bad-request"))    # 401 Unauthorized
```

### JavaScript

```javascript
class Handler {
  constructor() {
    this.nextHandler = null;
  }

  setNext(handler) {
    this.nextHandler = handler;
    return handler;
  }

  handle(request) {
    if (this.nextHandler) {
      return this.nextHandler.handle(request);
    }
    return null;
  }
}

class AuthHandler extends Handler {
  handle(request) {
    if (!request.startsWith("token:")) {
      return "401 Unauthorized";
    }
    return super.handle(request);
  }
}

class RateLimitHandler extends Handler {
  constructor() {
    super();
    this.requests = 0;
    this.limit = 3;
  }

  handle(request) {
    this.requests++;
    if (this.requests > this.limit) {
      return "429 Too Many Requests";
    }
    return super.handle(request);
  }
}

class DataHandler extends Handler {
  handle(request) {
    return `Processed: ${request}`;
  }
}

// Build the chain
const handler = new AuthHandler();
handler.setNext(new RateLimitHandler()).setNext(new DataHandler());

console.log(handler.handle("token:abc123")); // Processed
console.log(handler.handle("bad-request"));     // 401
```

### Java

```java
public abstract class Handler {
    protected Handler next;

    public Handler setNext(Handler next) {
        this.next = next;
        return next;
    }

    public abstract String handle(String request);

    protected String passToNext(String request) {
        if (next != null) {
            return next.handle(request);
        }
        return null;
    }
}

public class AuthHandler extends Handler {
    @Override
    public String handle(String request) {
        if (!request.startsWith("token:")) {
            return "401 Unauthorized";
        }
        return passToNext(request);
    }
}

public class RateLimitHandler extends Handler {
    private int requests = 0;
    private final int limit = 3;

    @Override
    public String handle(String request) {
        requests++;
        if (requests > limit) {
            return "429 Too Many Requests";
        }
        return passToNext(request);
    }
}

public class DataHandler extends Handler {
    @Override
    public String handle(String request) {
        return "Processed: " + request;
    }
}

// Build the chain
Handler handler = new AuthHandler();
handler.setNext(new RateLimitHandler()).setNext(new DataHandler());

System.out.println(handler.handle("token:abc")); // Processed
System.out.println(handler.handle("bad"));        // 401
```

## Explanation

The Chain of Responsibility Pattern has two roles:

- **Handler Interface** — declares a `handle()` method and maintains a reference to the next handler
- **Concrete Handlers** — implement processing logic; each decides whether to handle the request or pass it along

The client builds the chain order. Each handler can also choose to stop the chain (short-circuit) by returning early without calling the next handler.

## Variants

| Variant | Structure | Best For |
|---------|-----------|----------|
| **Linear Chain** | Linked list of handlers | Simple sequential processing |
| **Tree Chain** | Handlers organized hierarchically | Multi-level decision trees |
| **Middleware Pipeline** | Array of functions, each calls `next()` | Web frameworks (Express, Django middleware) |
| **Event Bus** | Handlers register for specific events | Decoupled event-driven systems |

## What Works

- **Keep handlers focused** — each handler should do one thing (auth, validation, logging, etc.)
- **Provide a default handler** at the end of the chain to avoid unhandled requests
- **Allow chain modification at runtime** by exposing `setNext()` or `addHandler()` methods
- **Use immutable request objects** so handlers don't accidentally modify shared state
- **Consider order carefully** — handlers that short-circuit (auth, rate limiting) should typically come first

## Common Mistakes

- Creating circular chains where a handler eventually calls itself, causing infinite loops
- Forgetting to call the next handler, silently dropping requests that should have been processed
- Putting slow or blocking handlers early in the chain, causing unnecessary latency for rejected requests
- Storing mutable state in handlers that are reused across requests, causing cross-request contamination
- Building overly long chains that become hard to debug and reason about

## Frequently Asked Questions

**Q: Is this the same as middleware in web frameworks?**
A: Yes. Express.js middleware, Django middleware, and ASP.NET Core middleware are all implementations of the [Chain of Responsibility](/patterns/design/chain-of-responsibility-middleware) Pattern. Each middleware decides whether to process the request, pass it along, or short-circuit with a response.

**Q: What happens if no handler processes the request?**
A: By default, the request falls through the chain unhandled. Consider adding a [Decorator](/patterns/design/decorator-pattern) for enrichment or a default handler for catch-all behavior. You should add a catch-all handler at the end that returns a default response or throws an appropriate error.

**Q: Can handlers modify the request before passing it along?**
A: Yes. Unlike a pure pass-or-fail chain, handlers can transform, enrich, or validate the request before forwarding it. This is common in middleware pipelines.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
