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
  - /patterns/proxy-pattern-caching
  - /patterns/adapter-pattern
  - /recipes/call-rest-api
  - /recipes/websocket-authentication
  - /patterns/adapter-pattern-api
  - /patterns/chain-of-responsibility-middleware
  - /patterns/composite-pattern-ui
lastUpdated: "2026-07-09"
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

The outermost decorator (Auth) runs first, adding the token header. Then Retry catches failures and retries. Then Logging records timing. Finally FetchClient performs the actual network call. Each decorator wraps the next, forming a stack.

## How It Works

Each decorator implements the same `HttpClient` interface and holds a reference to the next decorator in the chain. When `request()` is called, the decorator can modify the inputs, call the inner client, and then modify or inspect the output. Because every decorator shares the same interface, they compose transparently: the caller does not know how many layers exist.

The order of decoration matters. Auth should wrap Retry so that retries include the token. Logging should wrap the innermost client so it records actual network time, not retry delays. Metrics should wrap everything to capture end-to-end latency.

## Best Practices

- Keep each decorator focused on one concern. A decorator that logs and retries is two decorators in disguise.
- Always spread or clone the options object before mutating headers. Mutating the original causes subtle bugs when retries re-use the same options.
- Re-throw errors unless the decorator's purpose is to handle them (like Retry). Swallowing errors breaks the chain contract.
- Use a builder or factory function to construct the decorator stack. Inline nesting like the example above becomes unreadable past 4 layers.
- Test decorators in isolation by passing a mock inner client. Verify that the decorator calls through and transforms inputs/outputs correctly.
- Consider a `CircuitBreakerDecorator` for production systems that call unreliable downstreams. It prevents cascading failures by short-circuiting after N consecutive errors.

### Circuit Breaker Example

```typescript
class CircuitBreakerDecorator extends BaseClientDecorator {
  private failures = 0;
  private isOpen = false;
  private lastFailureTime = 0;

  constructor(
    client: HttpClient,
    private threshold: number = 5,
    private resetTimeout: number = 30000
  ) {
    super(client);
  }

  async request(url: string, options: RequestInit): Promise<Response> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.isOpen = false;
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker open');
      }
    }

    try {
      const response = await this.client.request(url, options);
      this.failures = 0;
      return response;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) {
        this.isOpen = true;
      }
      throw error;
    }
  }
}
```

The circuit breaker tracks consecutive failures. After `threshold` errors, it opens and rejects all requests for `resetTimeout` milliseconds. After the timeout, it allows one request through (half-open state). If that succeeds, the breaker closes. If it fails, the cycle repeats.

## Variations

- **Conditional Decorator**: Apply logic only for specific URLs or HTTP methods
- **Metrics Decorator**: Push timing and status code distributions to Prometheus
- **Cache Decorator**: Combine with [Proxy](/patterns/design/proxy-pattern) pattern to cache GET responses
- **Circuit Breaker Decorator**: Short-circuit requests after N consecutive failures, with a cooldown period before retrying
- **Timeout Decorator**: Abort requests that exceed a configurable deadline using `AbortController`
- **Rate Limit Decorator**: Enforce a maximum number of concurrent or per-second requests
- **Tracing Decorator**: Inject trace IDs into headers and emit spans to OpenTelemetry

## What Works

- Keep decorators focused on one responsibility each
- Ensure decorators delegate to `client.request()` without swallowing errors
- Make decorators stateless when possible to avoid side effects

## Common Mistakes

- Mutating the request object instead of creating a new one
- Forgetting to forward the response or error to the next decorator
- Adding too many decorators, making the call stack hard to trace
- Wrapping in the wrong order: logging outside retry records total time including retries, which may be misleading
- Not testing decorators in isolation: always pass a mock inner client
- Using decorators for business logic: they should handle cross-cutting concerns, not domain rules
- Ignoring error propagation: a decorator that catches but does not re-throw hides failures from the caller
- Hardcoding decorator configuration: pass retry counts, timeouts, and tokens through constructors for testability

## FAQ

### How is this different from middleware in Express?

Express [middleware](/patterns/design/chain-of-responsibility-middleware) operates on request/response objects in sequence. Decorators wrap a single client interface and can be composed at any granularity.

### Can decorators be removed dynamically?

Only if you reassign the client reference. Decorators are typically composed at initialization and remain fixed. For dynamic composition, use a factory that rebuilds the stack.

### What order should decorators be applied?

Outermost runs first. Put auth outermost so all retries carry the token. Put logging innermost to measure actual network time. Put metrics outermost to capture end-to-end latency including retries.

**Q: How do I test a decorator?**
A: Pass a mock `HttpClient` that returns a fixed response or throws. Assert that the decorator calls through, modifies headers or options correctly, and re-throws errors. Each decorator should be testable without real network calls.

**Q: Can I use decorators with fetch directly?**
A: Yes, but wrap fetch in a class implementing `HttpClient` first. The decorator pattern needs a shared interface. Calling `fetch()` directly in each decorator defeats the purpose.

**Q: How many decorators is too many?**
A: Past 5-6 layers, the stack becomes hard to debug. If you need more, consider grouping concerns: combine logging and metrics into an observability decorator, or use a middleware pipeline instead.

**Q: Should decorators handle business logic?**
A: No. Decorators handle cross-cutting concerns: transport-level concerns like auth, retries, logging, caching. Business rules belong in services or controllers that call the decorated client.

**Q: How does this compare to the Chain of Responsibility pattern?**
A: Chain of Responsibility passes a request along a chain where each handler decides to process or forward. Decorators always call through to the inner client and typically wrap or transform the call. See [Chain of Responsibility](/patterns/design/chain-of-responsibility-middleware).

**Q: Can I use this pattern with GraphQL clients?**
A: Yes. Wrap the GraphQL client's `query` and `mutate` methods with the same decorator stack. Auth, logging, and retry decorators work identically for GraphQL operations.

**Q: How do I handle request cancellation?**
A: Use a `TimeoutDecorator` that creates an `AbortController`, sets a timeout, and passes the signal to the inner client. If the timeout fires, abort the request and throw a timeout error.

**Q: Should the Retry decorator retry on all errors?**
A: No. Retry only on transient failures: network errors, 502, 503, 504. Do not retry on 400, 401, 403, 404, or validation errors. Check the status code or error type before retrying.

**Q: Can decorators be used in the browser?**
A: Yes. The pattern works in any TypeScript/JavaScript environment. `performance.now()` is available in browsers. Use `AbortController` for timeouts instead of Node-specific APIs.

**Q: How do I add tracing with decorators?**
A: Create a `TracingDecorator` that generates or propagates a trace ID via headers (e.g., `X-Trace-Id`). Emit spans to OpenTelemetry or your tracing backend. Place it outermost so it captures the full request lifecycle.

**Q: What about streaming responses?**
A: Decorators can pass through `ReadableStream` responses unchanged. If a decorator needs to inspect the body, it must tee the stream so the caller can still consume it. Be careful: reading the body in a decorator consumes it.

**Q: How do I share decorator stacks across services?**
A: Export a factory function from a shared module: `createHttpClient(config)` returns the fully decorated client. Each service imports the factory and passes its own config (tokens, timeouts, retry counts).

**Q: What is the difference between Decorator and Proxy?**
A: Proxy controls access to an object (lazy loading, access control, caching). Decorator adds responsibilities to an object. In practice, the implementation is similar: both wrap the target. The intent differs. See [Proxy Pattern](/patterns/design/proxy-pattern-caching).

**Q: How do I handle idempotency with retries?**
A: Generate an idempotency key (e.g., UUID) in an `IdempotencyDecorator` and add it as a header. The server uses this key to deduplicate requests. This makes retries safe for POST and PUT operations.

**Q: Can I compose decorators conditionally based on environment?**
A: Yes. In the factory function, check `process.env.NODE_ENV` or a config flag and include or exclude decorators. For example, skip logging in tests or add tracing only in production.

**Q: How do decorators interact with TypeScript generics?**
A: Define the interface with generics: `HttpClient<T = Response>`. Each decorator passes the type parameter through. This allows typed responses without losing the decorator pattern's composability.

**Q: Should I use decorators or interceptors?**
A: Interceptors (like Axios interceptors) are framework-specific hooks. Decorators are interface-based and framework-agnostic. If you switch HTTP libraries, decorators port; interceptors do not.

**Q: How do I log request and response bodies?**
A: Create a `BodyLoggingDecorator` that clones the request and response to read bodies without consuming streams. Use `request.clone()` and `response.clone()` before reading. Log only in development to avoid leaking sensitive data.

**Q: Can decorators be async?**
A: Yes. All decorators in this pattern are async because `request()` returns `Promise<Response>`. The decorator can await the inner client, await additional operations (like delays in Retry), and return the response asynchronously.

**Q: How do I handle file uploads with decorators?**
A: File uploads work the same way. The `FormData` body passes through the decorator stack unchanged. Add a `ProgressDecorator` that wraps `XMLHttpRequest` instead of `fetch` if you need upload progress events, since `fetch` does not support upload progress yet.

**Q: How do I mock the decorated client in tests?**
A: Create a `MockClient` that implements `HttpClient` and returns canned responses. Wrap it with only the decorators you want to test. For integration tests, use a library like MSW (Mock Service Worker) to intercept at the network level.

**Q: What happens if a decorator throws before calling the inner client?**
A: The inner client never runs. This is expected for decorators like CircuitBreaker when the circuit is open. The error propagates to the caller. Make sure the error type is distinguishable so callers can handle it appropriately.

**Q: Can I use decorators with gRPC?**
A: Yes. Define a `GrpcClient` interface with `unaryCall`, `serverStream`, and `clientStream` methods. Apply the same decorator pattern: auth, logging, retry, and timeout decorators work identically for gRPC calls.

**Q: How does this pattern work with dependency injection containers?**
A: Register each decorator as a service in your DI container. Inject the inner `HttpClient` into each decorator's constructor. The container resolves the chain automatically based on registration order. This works well with NestJS, InversifyJS, or similar DI frameworks.
