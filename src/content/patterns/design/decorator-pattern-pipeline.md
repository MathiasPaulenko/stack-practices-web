---
contentType: patterns
slug: decorator-pattern-pipeline
title: "Decorator Pattern for HTTP Request Pipelines"
description: "Use the Decorator pattern to compose cross-cutting concerns like logging, metrics, and retries into HTTP request pipelines without modifying core logic"
metaDescription: "Decorator pattern for HTTP pipelines. Compose logging, retries, and metrics around requests without modifying core logic. Clean, testable middleware."
difficulty: intermediate
topics:
  - design
  - api
tags:
  - decorator
  - middleware
  - structural
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/proxy-pattern-caching
  - /patterns/design/adapter-pattern
  - /recipes/api/call-rest-api
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Decorator pattern for HTTP pipelines. Compose logging, retries, and metrics around requests without modifying core logic. Clean, testable middleware."
  keywords:
    - decorator pattern
    - http middleware
    - request pipeline
    - structural pattern
    - cross-cutting concerns
---

# Decorator Pattern for HTTP Request Pipelines

The [Decorator](/patterns/design/decorator-pattern) pattern wraps an object to add responsibilities dynamically. When applied to HTTP clients, it becomes a clean way to compose cross-cutting concerns — logging, retries, metrics, authentication — without polluting the core request logic.

## When to Use This

- Multiple cross-cutting concerns must wrap every API call
- You want to add or remove concerns without changing existing code
- Core request logic should remain testable and focused

## Problem

Adding logging, retries, metrics, and auth to every [HTTP call](/recipes/api/call-rest-api) leads to monolithic client classes or copy-paste boilerplate at every call site.

## Solution

```typescript
// api/HttpClient.ts
interface HttpClient {
  request(url: string, options: RequestInit): Promise<Response>;
}

// api/FetchClient.ts
class FetchClient implements HttpClient {
  async request(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, options);
  }
}

// decorators/BaseClientDecorator.ts
abstract class BaseClientDecorator implements HttpClient {
  constructor(protected client: HttpClient) {}
  abstract request(url: string, options: RequestInit): Promise<Response>;
}

// decorators/LoggingDecorator.ts
class LoggingDecorator extends BaseClientDecorator {
  async request(url: string, options: RequestInit): Promise<Response> {
    const start = performance.now();
    try {
      const response = await this.client.request(url, options);
      console.log(`${options.method || 'GET'} ${url} → ${response.status} (${(performance.now() - start).toFixed(0)}ms)`);
      return response;
    } catch (error) {
      console.error(`${options.method || 'GET'} ${url} → ERROR`);
      throw error;
    }
  }
}

// decorators/RetryDecorator.ts
class RetryDecorator extends BaseClientDecorator {
  constructor(client: HttpClient, private maxRetries: number = 3) {
    super(client);
  }

  async request(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.client.request(url, options);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    throw lastError!;
  }
}

// decorators/AuthDecorator.ts
class AuthDecorator extends BaseClientDecorator {
  constructor(client: HttpClient, private token: string) {
    super(client);
  }

  async request(url: string, options: RequestInit): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.token}`);
    return this.client.request(url, { ...options, headers });
  }
}
```

## Usage

```typescript
const client = new AuthDecorator(
  new RetryDecorator(
    new LoggingDecorator(new FetchClient()),
    3
  ),
  process.env.API_TOKEN!
);
```

## Variations

- **Conditional Decorator**: Apply logic only for specific URLs or HTTP methods
- **Metrics Decorator**: Push timing and status code distributions to Prometheus
- **Cache Decorator**: Combine with [Proxy](/patterns/design/proxy-pattern) pattern to cache GET responses

## What Works

- Keep decorators focused on one responsibility each
- Ensure decorators delegate to `client.request()` without swallowing errors
- Make decorators stateless when possible to avoid side effects

## Common Mistakes

- Mutating the request object instead of creating a new one
- Forgetting to forward the response or error to the next decorator
- Adding too many decorators, making the call stack hard to trace

## FAQ

**Q: How is this different from middleware in Express?**
A: Express [middleware](/patterns/design/chain-of-responsibility-middleware) operates on request/response objects in sequence. Decorators wrap a single client interface and can be composed at any granularity.

**Q: Can decorators be removed dynamically?**
A: Only if you reassign the client reference. Decorators are typically composed at initialization and remain fixed.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
