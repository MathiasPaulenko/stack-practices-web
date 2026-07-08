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
  - design-patterns
relatedResources:
  - /patterns/design/decorator-pattern-pipeline
  - /patterns/design/abstract-factory-cross-platform
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
- Forgetting to handle errors in middleware, causing unhandled promise rejections
- Placing expensive operations early in the chain without caching
- Not providing a default handler at the end of the chain
- Mixing concerns within a single middleware instead of keeping them focused
- Not documenting middleware order and dependencies
- Failing to validate request data before processing
- Using the chain pattern when a simple conditional would suffice

## Advanced Techniques

### Async Middleware with Error Handling

Implement proper async error handling with try-catch blocks:

```typescript
type AsyncMiddleware = (
  req: RequestContext,
  next: NextFunction
) => Promise<void>;

class AsyncMiddlewareHandler {
  private middlewares: AsyncMiddleware[] = [];

  use(middleware: AsyncMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async handle(req: RequestContext): Promise<void> {
    let index = 0;

    const next: NextFunction = async () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(req, next);
      }
    };

    try {
      await next();
    } catch (error) {
      console.error('Middleware error:', error);
      throw error;
    }
  }
}

// Usage
const authMiddleware: AsyncMiddleware = async (req, next) => {
  const token = req.headers['authorization'];
  if (!token) throw new Error('Unauthorized');
  await next();
};

const loggingMiddleware: AsyncMiddleware = async (req, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  await next();
};

const pipeline = new AsyncMiddlewareHandler()
  .use(authMiddleware)
  .use(loggingMiddleware);
```

### Context Enrichment Middleware

Add metadata and computed fields to the request context:

```typescript
interface EnrichedRequestContext extends RequestContext {
  requestId: string;
  timestamp: number;
  clientIp: string;
  userAgent: string;
  metadata: Record<string, unknown>;
}

class ContextEnrichmentMiddleware extends MiddlewareHandler {
  protected canHandle(): boolean {
    return true;
  }

  protected process(req: EnrichedRequestContext, next: NextFunction): void {
    req.requestId = crypto.randomUUID();
    req.timestamp = Date.now();
    req.clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    req.userAgent = req.headers['user-agent'] || 'unknown';
    req.metadata = {};

    next();
  }
}
```

### Conditional Middleware Execution

Execute middleware based on request characteristics:

```typescript
class ConditionalMiddleware extends MiddlewareHandler {
  constructor(
    private condition: (req: RequestContext) => boolean,
    private middleware: MiddlewareHandler
  ) {
    super();
  }

  protected canHandle(req: RequestContext): boolean {
    return this.condition(req);
  }

  protected process(req: RequestContext, next: NextFunction): void {
    this.middleware.handle(req, next);
  }
}

// Usage: Only run auth middleware on protected routes
const protectedRoutes = ['/api/users', '/api/admin'];
const authConditional = new ConditionalMiddleware(
  (req) => protectedRoutes.some(route => req.path.startsWith(route)),
  new AuthMiddleware()
);
```

### Middleware with Circuit Breaking

Implement circuit breaking for downstream service calls:

```typescript
class CircuitBreakerMiddleware extends MiddlewareHandler {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  protected canHandle(): boolean {
    return true;
  }

  protected process(req: RequestContext, next: NextFunction): void {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      next();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
      }
      throw error;
    }
  }
}
```

### Middleware with Retry Logic

Add retry capabilities for transient failures:

```typescript
class RetryMiddleware extends MiddlewareHandler {
  private readonly maxRetries = 3;
  private readonly delay = 1000;

  protected canHandle(): boolean {
    return true;
  }

  protected async process(req: RequestContext, next: NextFunction): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          next();
          resolve();
        });
        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.delay * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }
}
```

### Middleware Composition with Dependency Injection

Support dependency injection for middleware:

```typescript
interface MiddlewareFactory {
  (dependencies: unknown): MiddlewareHandler;
}

class MiddlewareRegistry {
  private factories = new Map<string, MiddlewareFactory>();

  register(name: string, factory: MiddlewareFactory): void {
    this.factories.set(name, factory);
  }

  create(name: string, dependencies: unknown): MiddlewareHandler {
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`Middleware ${name} not found`);
    return factory(dependencies);
  }
}

// Usage
const registry = new MiddlewareRegistry();
registry.register('auth', (deps) => new AuthMiddleware());
registry.register('rateLimit', (deps) => new RateLimitMiddleware());

const auth = registry.create('auth', { jwtSecret: 'secret' });
const rateLimit = registry.create('rateLimit', { redis: redisClient });
```

### Middleware with Response Transformation

Transform responses before sending to client:

```typescript
interface ResponseContext {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

class ResponseTransformMiddleware extends MiddlewareHandler {
  protected canHandle(): boolean {
    return true;
  }

  protected process(req: RequestContext, next: NextFunction): void {
    const originalNext = next;
    const response: ResponseContext = {
      statusCode: 200,
      headers: {},
      body: null
    };

    const wrappedNext = () => {
      // Transform response
      if (response.body) {
        response.body = this.transformBody(response.body);
      }
      originalNext();
    };

    next();
  }

  private transformBody(body: unknown): unknown {
    // Apply transformations
    return body;
  }
}
```

### Middleware with Request Validation

Validate request data against schemas:

```typescript
interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: string;
    validate?: (value: unknown) => boolean;
  };
}

class ValidationMiddleware extends MiddlewareHandler {
  constructor(private schema: ValidationSchema) {
    super();
  }

  protected canHandle(req: RequestContext): boolean {
    return req.method === 'POST' || req.method === 'PUT';
  }

  protected process(req: RequestContext, next: NextFunction): void {
    const body = req.body as Record<string, unknown>;
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(this.schema)) {
      if (rules.required && !(field in body)) {
        errors.push(`Field ${field} is required`);
      }

      if (field in body) {
        const value = body[field];

        if (rules.type && typeof value !== rules.type) {
          errors.push(`Field ${field} must be ${rules.type}`);
        }

        if (rules.validate && !rules.validate(value)) {
          errors.push(`Field ${field} is invalid`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    next();
  }
}

// Usage
const userSchema: ValidationSchema = {
  name: { required: true, type: 'string' },
  email: { required: true, type: 'string', validate: (v) => /\S+@\S+/.test(v as string) },
  age: { required: false, type: 'number', validate: (v) => (v as number) >= 0 }
};

const validation = new ValidationMiddleware(userSchema);
```

### Middleware with Caching

Implement caching for GET requests:

```typescript
class CacheMiddleware extends MiddlewareHandler {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly ttl = 60000; // 1 minute

  protected canHandle(req: RequestContext): boolean {
    return req.method === 'GET';
  }

  protected process(req: RequestContext, next: NextFunction): void {
    const cacheKey = `${req.method}:${req.path}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      req.body = cached.data;
      return; // Short-circuit
    }

    const originalNext = next;
    const wrappedNext = () => {
      // Cache the response
      this.cache.set(cacheKey, { data: req.body, timestamp: Date.now() });
      originalNext();
    };

    wrappedNext();
  }
}
```

### Middleware with Rate Limiting per User

Implement user-specific rate limiting:

```typescript
class UserRateLimitMiddleware extends MiddlewareHandler {
  private userRequests = new Map<string, number[]>();
  private readonly windowMs = 60000;
  private readonly maxRequests = 100;

  protected canHandle(): boolean {
    return true;
  }

  protected process(req: RequestContext, next: NextFunction): void {
    const userId = req.user?.id || 'anonymous';
    const now = Date.now();
    const requests = this.userRequests.get(userId) || [];

    const recent = requests.filter(t => now - t < this.windowMs);

    if (recent.length >= this.maxRequests) {
      throw new Error(`Rate limit exceeded for user ${userId}`);
    }

    recent.push(now);
    this.userRequests.set(userId, recent);

    next();
  }
}
```

## Best Practices

1. **Keep middleware single-responsibility.** Each middleware should handle one specific concern (auth, validation, logging, etc.) to maintain clarity and testability.

2. **Always call next() or explicitly short-circuit.** Never leave middleware hanging without calling next() or sending a response.

3. **Handle errors gracefully.** Each middleware should catch and handle its own errors, or wrap them appropriately to prevent chain failure.

4. **Keep middleware stateless.** Avoid storing mutable state in middleware that is shared across requests. Use request-scoped state instead.

5. **Document middleware order.** Clearly document the expected order of middleware and any dependencies between them.

6. **Use async/await for async operations.** Always use async/await patterns for async middleware to avoid callback hell and ensure proper error handling.

7. **Provide a default handler.** Always include a catch-all handler at the end of the chain to handle requests that fall through.

8. **Add logging and monitoring.** Include logging middleware to trace request flow through the chain and identify bottlenecks or failures.

9. **Avoid circular references.** Ensure the chain structure is acyclic to prevent infinite loops during request processing.

10. **Test middleware in isolation.** Write unit tests for each middleware independently, then integration tests for the complete chain.

## FAQ

**Q: How is this different from Decorator?**
A: [Decorator](/patterns/design/decorator-pattern) adds responsibilities dynamically but all decorators process the request. Chain of Responsibility passes requests until one handles it.

**Q: Can I add handlers at runtime?**
A: Yes. This is the primary advantage — middleware can be registered dynamically based on routes or configuration.

**Q: How do I handle async operations in middleware?**
A: Use async/await patterns for async middleware. Always await async operations before calling next() to ensure proper execution order and error handling.

**Q: Can middleware modify the request before passing it along?**
A: Yes. Middleware can transform, enrich, or validate the request before forwarding it. This is common in middleware pipelines for adding metadata or sanitizing data.

**Q: How do I implement request timeout in middleware?**
A: Add timeout middleware that tracks request duration and short-circuits if processing exceeds a threshold. This prevents slow handlers from blocking the pipeline indefinitely.

**Q: Should middleware be stateless?**
A: Ideally yes. Stateless middleware is easier to test and reuse. If state is necessary, ensure it's scoped to the request (stored in the request context) rather than scoped to the middleware to avoid cross-request contamination.

**Q: How do I implement circuit breaking in middleware?**
A: Add circuit breaker middleware that tracks failure rates and short-circuits requests when a downstream service is failing. This prevents cascading failures and improves system resilience.

**Q: Can I use this pattern for validation pipelines?**
A: Yes. Validation chains where each middleware verifies a different aspect (format, business rules, security constraints) are a common use case. Results can be aggregated to provide comprehensive validation feedback.

**Q: How do I handle priority in middleware execution?**
A: Implement middleware ordering based on priority where higher priority middleware executes first. This is useful for ensuring critical checks (auth, security) run before less critical operations.

**Q: Should I use dependency injection with middleware?**
A: Yes. Middleware often requires dependencies (database connections, external services, configuration). Use dependency injection to provide these dependencies, making middleware testable and flexible.

**Q: How do I implement request cancellation in middleware?**
A: Add cancellation support by including a cancellation token in the request context. Middleware should periodically check the token and abort processing if cancellation is requested.

**Q: Can chains be nested or hierarchical?**
A: Yes. You can create hierarchical chains where a middleware itself contains a sub-chain. This is useful for organizing complex processing logic into manageable units.

**Q: How do I add metrics collection to a chain?**
A: Include metrics middleware that records timing, success/failure rates, and throughput for each middleware. This data is valuable for monitoring and optimizing chain performance.

**Q: Should I use this pattern for data transformation pipelines?**
A: Yes. Transformation chains where each middleware applies a specific transformation (parsing, enrichment, normalization) are a common and effective use case.

**Q: How do I handle version compatibility in middleware?**
A: Implement version-aware middleware that can process different request versions. Include version information in the request context and route to appropriate middleware logic based on version.

**Q: Can middleware be added or removed dynamically at runtime?**
A: Yes. Implement a chain manager that allows middleware to be added, removed, or reordered dynamically. This enables runtime reconfiguration without restarting the application.

**Q: How do I implement request replay for debugging?**
A: Add replay middleware that logs the complete request context and responses. Store this information in a way that allows requests to be reprocessed through the chain for debugging and testing.

**Q: Should I use this pattern for API gateway routing?**
A: Yes. API gateways often use chain of responsibility for request routing, where each middleware verifies routing rules (path, headers, query parameters) and directs requests to appropriate backend services.

**Q: How do I handle separation of request validation vs business logic?**
A: Separate validation middleware (format, type checking) from business logic middleware (domain rules, permissions). Place validation early in the chain to fail fast on invalid requests.

**Q: Can chains be parallelized for performance?**
A: Traditional chains are sequential, but you can implement parallel chains where independent middleware execute concurrently and results are aggregated. This is useful for validation or enrichment operations that don't depend on each other.

**Q: How do I implement request context propagation?**
A: Use a request context object that travels through the chain, accumulating metadata, logs, and intermediate results. This context provides visibility into the request's journey through the middleware.

**Q: Should I use this pattern for file processing pipelines?**
A: Yes. File processing chains where each middleware performs a specific operation (validation, transformation, compression, upload) are a natural fit for this pattern.

**Q: How do I handle error recovery in a chain?**
A: Implement error handling strategies at the middleware level (retry, fallback, circuit breaker) and at the chain level (catch-all error middleware, graceful degradation). Document recovery behavior clearly.

**Q: Can middleware communicate with each other?**
A: Middleware can communicate through the shared request context, but avoid direct dependencies between middleware. This maintains loose coupling and allows middleware to be reordered or replaced independently.

**Q: How do I implement request throttling in a chain?**
A: Add throttling middleware that tracks request rates and short-circuits when limits are exceeded. Implement different throttling strategies (rate limiting, concurrency limiting, queueing) based on your requirements.

**Q: Should I use this pattern for message queue processing?**
A: Yes. Message queue consumers often use chain of responsibility to process messages through multiple stages (validation, transformation, routing, persistence) before final handling.

**Q: How do I add conditional middleware execution?**
A: Implement conditional logic in middleware or use a branching middleware that routes requests to different sub-chains based on request characteristics (user type, request type, metadata).

**Q: Can chains be composed of smaller chains?**
A: Yes. Implement chain composition where smaller focused chains can be combined into larger chains. This promotes reusability and modular design.

**Q: How do I implement request tracing across distributed systems?**
A: Include distributed tracing context (trace ID, span ID) in the request object. Propagate this context through the chain and to external service calls for end-to-end tracing.

**Q: Should I use this pattern for workflow orchestration?**
A: Yes. Workflow engines often use chain-like patterns where each step in a workflow is a middleware that processes workflow state and decides whether to continue or stop.

**Q: How do I handle request size limits in a chain?**
A: Add size validation middleware that verifies request size early in the chain and rejects oversized requests. This prevents processing requests that would fail later due to size constraints.

**Q: Can middleware be implemented as functions instead of classes?**
A: Yes. Functional middleware is simpler and more composable in functional programming paradigms. Use higher-order functions to chain middleware together instead of class-based inheritance.

**Q: How do I implement request sanitization in a chain?**
A: Add sanitization middleware that cleans or normalizes request data (trim whitespace, remove special characters, normalize case). Place it early to ensure all downstream middleware work with clean data.

**Q: Should I use this pattern for permission checking?**
A: Yes. Permission chains where each middleware verifies specific permissions (read, write, admin) are effective for complex authorization scenarios with multiple permission types.

**Q: How do I add request enrichment in a chain?**
A: Implement enrichment middleware that adds metadata, computed fields, or related data to the request context. This is useful for providing additional context to downstream middleware without requiring them to fetch it.

**Q: Can chains be used for A/B testing or feature flags?**
A: Yes. Add middleware that checks feature flags or A/B test configurations and routes requests to different processing paths or returns different responses based on the configuration.

**Q: How do I implement request deduplication in a chain?**
A: Add deduplication middleware that checks if a request has been processed recently (using cache or idempotency key) and returns the cached result if found, preventing duplicate processing.

**Q: Should I use this pattern for form data validation?**
A: Yes. Form validation chains where each middleware validates a specific field or rule (required fields, format validation, business rules) provide structured and reusable validation logic.

**Q: How do I handle separation of request transformation vs validation?**
A: Separate transformation middleware (modify request data) from validation middleware (verify request data). Place validation before transformation to ensure only valid data is transformed.

**Q: Can middleware be stateful for rate limiting?**
A: Yes, but be careful. Stateful middleware like rate limiters need to handle their state carefully (thread-safe access, proper cleanup, state reset). Consider using external stores (Redis) for state to improve scalability.

**Q: How do I implement per-middleware request timeout?**
A: Add timeout logic to each middleware or use a timeout wrapper that monitors middleware execution time. This prevents slow middleware from blocking the chain indefinitely.

**Q: Should I use this pattern for cache lookup chains?**
A: Yes. Cache chains where each middleware checks a different cache level (L1 memory cache, L2 distributed cache, L3 database) are effective for multi-tier caching strategies.

**Q: How do I add request logging for audit trails?**
A: Include audit logging middleware that logs request details, middleware execution, and results. Store this information securely for compliance and debugging.

**Q: Can chains be used for content-based request routing?**
A: Yes. Content-based routing middleware examines request content (headers, body, parameters) and routes to different sub-chains or backends based on routing rules.

**Q: How do I implement request versioning in a chain?**
A: Include version information in the request and implement version-aware middleware that can process different request formats or apply different logic based on version.

**Q: Should I use this pattern for external API data enrichment?**
A: Yes. Enrichment chains where each middleware fetches additional data from different external APIs and adds it to the request context are a common use case.

**Q: How do I handle request context isolation in multi-tenant systems?**
A: Include tenant identification in the request context and ensure middleware respects tenant isolation (separate data access, per-tenant configuration, resource quotas).

**Q: Can middleware be implemented as web framework middleware?**
A: Yes. Most web frameworks (Express, Django, ASP.NET Core) support middleware patterns that are essentially chain of responsibility implementations. Leverage framework-specific middleware APIs.

**Q: How do I add request compression/decompression in a chain?**
A: Add compression/decompression middleware that handles content encoding (gzip, deflate, brotli). Place decompression early and compression late in the chain.

**Q: Should I use this pattern for request preprocessing?**
A: Yes. Preprocessing chains where each middleware performs a specific preprocessing step (parsing, normalization, enrichment) prepare requests for main processing logic.

**Q: How do I implement request context timeout?**
A: Add timeout middleware that tracks total request processing time and short-circuits if total time exceeds a threshold, preventing long-running requests from consuming resources.

**Q: Can chains be used for request postprocessing?**
A: Yes. Postprocessing chains where each middleware performs operations after main processing (response formatting, logging, cleanup, metrics) are effective for response handling.

**Q: How do I add request signature verification in a chain?**
A: Include signature verification middleware that verifies request signatures (HMAC, JWT) to ensure request authenticity and integrity. Place it early in the chain for security.

**Q: Should I use this pattern for request retry logic?**
A: Yes. Retry middleware can implement exponential backoff, circuit breaking, and dead letter queueing for failed requests. Combine with idempotency for safe retries.

**Q: How do I implement request context cleanup in a chain?**
A: Add cleanup middleware at the end of the chain that releases resources, closes connections, and performs other cleanup operations. Ensure this executes even if previous middleware fail.

**Q: Can middleware be selected dynamically based on configuration?**
A: Yes. Implement a middleware registry and configuration-driven chain builder that selects and orders middleware based on configuration files or environment variables.

**Q: How do I add request context propagation across service boundaries?**
A: Include correlation IDs, trace IDs, and other context metadata in requests when calling external services. This enables distributed tracing and debugging across service boundaries.

**Q: Should I use this pattern for request aggregation?**
A: Yes. Aggregation chains where each middleware collects data from different sources and combines it into a unified response are effective for data aggregation scenarios.

**Q: How do I implement request context validation in a chain?**
A: Add context validation middleware that verifies the request context is complete and valid (required fields present, data types correct, constraints satisfied) before processing.

**Q: Can chains be used for request transformation for different formats?**
A: Yes. Transformation chains where each middleware converts between formats (JSON to XML, CSV to JSON, protocol buffers to JSON) are useful for format conversion scenarios.

**Q: How do I add request context enrichment from databases?**
A: Implement enrichment middleware that fetches related data from databases and adds it to the request context. Use connection pooling and caching to optimize performance.

**Q: Should I use this pattern for request security checks?**
A: Yes. Security chains where each middleware performs a specific security check (authentication, authorization, input validation, output encoding) provide defense in depth.

**Q: How do I implement request context monitoring in a chain?**
A: Add monitoring middleware that collects metrics (latency, throughput, error rates) and health checks for each middleware. Use this data for observability and alerting.

**Q: Can middleware be implemented as plugins?**
A: Yes. Implement a plugin system where middleware can be loaded dynamically and registered with the chain. This enables extensibility without modifying core code.

**Q: How do I add request context serialization in a chain?**
A: Include serialization middleware that converts request context to different formats (JSON, XML, binary) for storage, transmission, or logging.

**Q: Should I use this pattern for request context deserialization?**
A: Yes. Deserialization chains where each middleware parses and validates different parts of a serialized request are effective for handling complex request formats.

**Q: How do I implement request context filtering in a chain?**
A: Add filtering middleware that removes or masks sensitive data from the request context (passwords, tokens, PII) before logging or passing to certain middleware.

**Q: Can chains be used for request context routing to different middleware?**
A: Yes. Routing middleware examines request characteristics and routes to different sub-chains or middleware sets based on routing rules (content type, user role, geographic location).

**Q: How do I add request context normalization in a chain?**
A: Implement normalization middleware that standardizes request data (case normalization, whitespace trimming, date format conversion) to ensure consistent downstream processing.

**Q: Should I use this pattern for request context validation against schemas?**
A: Yes. Schema validation chains where each middleware validates against different schemas (JSON Schema, XML Schema, custom schemas) ensure request data conforms to expected structure.

**Q: How do I implement request context transformation for legacy systems?**
A: Add transformation middleware that converts modern request formats to legacy formats (or vice versa) for compatibility with legacy systems or APIs.

**Q: Can middleware be implemented as cloud platform lambda functions?**
A: Yes. Cloud platforms (AWS Lambda, Azure Functions) support serverless middleware that can be chained together using event-driven architectures or orchestration services.

**Q: How do I add request context encryption/decryption in a chain?**
A: Include encryption/decryption middleware that protects sensitive data in the request context. Place decryption early and encryption late in the chain.

**Q: Should I use this pattern for request context compression for network transmission?**
A: Yes. Compression middleware that compresses request data before transmission and decompresses after reception reduces bandwidth usage and improves performance.

**Q: How do I implement request context validation against business rules?**
A: Add business rule validation middleware that verifies domain-specific constraints (inventory availability, user permissions, business logic) to ensure requests are valid for the business context.

**Q: Can chains be used for request context aggregation from multiple sources?**
A: Yes. Aggregation chains where each middleware fetches data from different sources (databases, APIs, caches) and combines it into a unified response are effective for data aggregation.

**Q: How do I add request context deduplication for idempotent operations?**
A: Implement deduplication middleware that checks for duplicate requests using idempotency keys and returns cached results to prevent duplicate processing.

**Q: Should I use this pattern for request context transformation for API compatibility?**
A: Yes. Transformation chains that convert between different API versions or formats ensure compatibility when integrating with multiple API versions or external systems.

**Q: How do I implement request context validation for security compliance?**
A: Add security compliance validation middleware that verifies requests against security policies (input validation, output encoding, security headers) to ensure compliance with security standards.

**Q: Can middleware be implemented as message queue consumers?**
A: Yes. Message queue consumers often implement chain of responsibility to process messages through multiple stages (validation, transformation, routing, persistence).

**Q: How do I add request context enrichment from external services?**
A: Implement enrichment middleware that calls external services (REST APIs, GraphQL, gRPC) to fetch additional data and add it to the request context.

**Q: Should I use this pattern for request context validation for data quality?**
A: Yes. Data quality validation chains where each middleware verifies different quality aspects (completeness, accuracy, consistency, timeliness) ensure high-quality data processing.

**Q: How do I implement request context transformation for data migration?**
A: Add transformation middleware that converts data from legacy formats to new formats as part of data migration projects, ensuring smooth transitions between systems.

**Q: Can chains be used for request context routing in microservices?**
A: Yes. API gateways in microservice architectures use chain of responsibility for request routing, where each middleware verifies routing rules and directs requests to appropriate services.

**Q: How do I add request context validation for regulatory compliance?**
A: Implement compliance validation middleware that verifies requests against regulatory requirements (GDPR, HIPAA, PCI-DSS) to ensure compliance with applicable regulations.

**Q: Should I use this pattern for request context transformation for analytics?**
A: Yes. Transformation chains that prepare request data for analytics (aggregation, filtering, enrichment) are effective for data pipeline processing.

**Q: How do I implement request context validation for performance optimization?**
A: Add performance validation middleware that verifies request characteristics (size, complexity, resource requirements) and optimizes or rejects requests to maintain system performance.

**Q: Can middleware be implemented as workflow steps in business process automation?**
A: Yes. Business process automation tools often use chain-like patterns where each step in a workflow is middleware that processes workflow state.

**Q: How do I add request context enrichment from user profiles?**
A: Implement enrichment middleware that fetches user profile data (preferences, settings, history) and adds it to the request context for personalized processing.

**Q: Should I use this pattern for request context validation for data integrity?**
A: Yes. Data integrity validation chains where each middleware verifies different integrity aspects (checksums, hashes, referential integrity) ensure data consistency and reliability.

**Q: How do I implement request context transformation for internationalization?**
A: Add transformation middleware that handles internationalization (i18n) concerns (locale detection, currency conversion, date/time formatting) for global applications.

**Q: Can chains be used for request context validation in real-time systems?**
A: Yes. Real-time systems use chain of responsibility for request validation and processing where low latency is critical, with fail-fast middleware to minimize processing time.

**Q: How do I add request context enrichment from configuration?**
A: Implement enrichment middleware that loads configuration data (feature flags, settings, policies) and adds it to the request context for dynamic behavior.

**Q: Should I use this pattern for request context validation for data governance?**
A: Yes. Data governance validation chains where each middleware verifies governance policies (data classification, retention policies, access policies) ensure compliance with governance standards.

**Q: How do I implement request context transformation for machine learning?**
A: Add transformation middleware that prepares request data for machine learning models (feature extraction, normalization, encoding) for ML inference pipelines.

**Q: Can middleware be implemented as stream processors in data streaming?**
A: Yes. Data streaming platforms (Kafka, Kinesis) use chain-like patterns where each processor in the stream performs operations on the data.

**Q: How do I add request context enrichment from geolocation data?**
A: Implement enrichment middleware that fetches geolocation data (IP geolocation, GPS coordinates) and adds it to the request context for location-based processing.

**Q: Should I use this pattern for request context validation for data privacy?**
A: Yes. Data privacy validation chains where each middleware verifies privacy policies (consent, data minimization, purpose limitation) ensure compliance with privacy regulations.

**Q: How do I implement request context transformation for legacy data formats?**
A: Add transformation middleware that converts legacy data formats (COBOL copybooks, fixed-width files) to modern formats (JSON, XML, CSV) for integration with modern systems.

**Q: Can chains be used for request context validation in high-throughput systems?**
A: Yes. High-throughput systems use chain of responsibility with optimized middleware (async processing, connection pooling, caching) to handle large request volumes efficiently.

**Q: How do I add request context enrichment from session data?**
A: Implement enrichment middleware that fetches session data (user session, shopping cart, preferences) and adds it to the request context for session-aware processing.

**Q: Should I use this pattern for request context validation for data lineage?**
A: Yes. Data lineage validation chains where each middleware tracks data provenance and transformations ensure data lineage and auditability.

**Q: How do I implement request context transformation for API versioning?**
A: Add transformation middleware that converts between different API versions (v1 to v2, v2 to v3) to maintain backward compatibility while APIs evolve.

**Q: Can middleware be implemented as ETL pipeline steps?**
A: Yes. ETL (Extract, Transform, Load) pipelines use chain of responsibility where each step performs extraction, transformation, or loading operations on data.

**Q: How do I add request context enrichment from device information?**
A: Implement enrichment middleware that fetches device information (user agent, device type, screen resolution) and adds it to the request context for device-aware processing.

**Q: Should I use this pattern for request context validation for data consistency?**
A: Yes. Data consistency validation chains where each middleware verifies consistency across data sources (master data, transactional data) ensure data consistency and accuracy.

**Q: How do I implement request context transformation for protocol conversion?**
A: Add transformation middleware that converts between different protocols (HTTP to gRPC, REST to GraphQL, SOAP to REST) for protocol compatibility in distributed systems.

**Q: Can chains be used for request context validation in security-critical systems?**
A: Yes. Security-critical systems use chain of responsibility with rigorous validation middleware to ensure security and reliability, often with formal verification and redundancy.

**Q: How do I add request context enrichment from social media data?**
A: Implement enrichment middleware that fetches social media data (user profiles, social graphs, content) and adds it to the request context for social media-aware applications.

**Q: Should I use this pattern for request context validation for data synchronization?**
A: Yes. Data synchronization validation chains where each middleware verifies synchronization status across systems ensure data consistency and timely updates.

**Q: How do I implement request context transformation for data serialization?**
A: Add transformation middleware that serializes data to different formats (JSON, XML, Protocol Buffers, Avro) for storage, transmission, or processing in different systems.

**Q: Can middleware be implemented as CI/CD pipeline steps?**
A: Yes. CI/CD pipelines use chain of responsibility where each step performs build, test, or deployment operations, with the ability to fail fast and stop the pipeline.

**Q: How do I add request context enrichment from business intelligence data?**
A: Implement enrichment middleware that fetches BI data (metrics, KPIs, reports) and adds it to the request context for business intelligence applications.

**Q: Should I use this pattern for request context validation for data archiving?**
A: Yes. Data archiving validation chains where each middleware verifies archiving policies (retention periods, access controls, compression) ensure proper data archiving.

**Q: How do I implement request context transformation for data anonymization?**
A: Add transformation middleware that anonymizes sensitive data (masking, hashing, tokenization) for privacy compliance while preserving data utility.

**Q: Can chains be used for request context validation in financial systems?**
A: Yes. Financial systems use chain of responsibility with validation middleware for regulatory compliance (Sarbanes-Oxley, Basel III, PCI-DSS) and financial controls.

**Q: How do I add request context enrichment from IoT device data?**
A: Implement enrichment middleware that fetches IoT device data (sensor readings, device status, telemetry) and adds it to the request context for IoT applications.

**Q: Should I use this pattern for request context validation for data backup?**
A: Yes. Data backup validation chains where each middleware verifies backup policies (frequency, retention, integrity) ensure reliable data backup and recovery.

**Q: How do I implement request context transformation for data parsing?**
A: Add transformation middleware that parses different data formats (CSV, JSON, XML, YAML, INI) into structured data for processing by downstream middleware.

**Q: Can middleware be implemented as bot processing steps?**
A: Yes. Chatbots and automation bots use chain of responsibility where each middleware processes user input, performs intent recognition, and generates responses.

**Q: How do I add request context enrichment from CRM data?**
A: Implement enrichment middleware that fetches CRM data (customer profiles, interaction history, sales data) and adds it to the request context for CRM-integrated applications.

**Q: Should I use this pattern for request context validation for data migration?**
A: Yes. Data migration validation chains where each middleware validates migrated data (completeness, accuracy, consistency) ensure successful data migration.

**Q: How do I implement request context transformation for data formatting?**
A: Add transformation middleware that formats data (date formatting, number formatting, currency formatting) for display or processing in different locales or systems.

**Q: Can chains be used for request context validation in healthcare systems?**
A: Yes. Healthcare systems use chain of responsibility with validation middleware for regulatory compliance (HIPAA, HL7, FHIR) and patient data protection.

**Q: How do I add request context enrichment from marketing data?**
A: Implement enrichment middleware that fetches marketing data (campaign data, attribution, conversion tracking) and adds it to the request context for marketing applications.

**Q: Should I use this pattern for request context validation for data replication?**
A: Yes. Data replication validation chains where each middleware verifies replication status and consistency across systems ensure reliable data replication.

**Q: How do I implement request context transformation for data encoding?**
A: Add transformation middleware that encodes data (Base64, URL encoding, HTML encoding) for safe transmission or storage in different contexts.

**Q: Can middleware be implemented as game processing steps?**
A: Yes. Game engines use chain of responsibility where each middleware processes game state (input handling, physics simulation, rendering, AI) in a game loop.

**Q: How do I add request context enrichment from search data?**
A: Implement enrichment middleware that fetches search data (search results, relevance scores, query analysis) and adds it to the request context for search-integrated applications.

**Q: Should I use this pattern for request context validation for data sharding?**
A: Yes. Data sharding validation chains where each middleware validates sharding rules and ensures data is routed to the correct shard for distributed data systems.

**Q: How do I implement request context transformation for data aggregation?**
A: Add transformation middleware that aggregates data from multiple sources (sum, average, count, group by) for reporting and analytics applications.

**Q: Can chains be used for request context validation in telecommunications?**
A: Yes. Telecommunications systems use chain of responsibility for call processing, where each middleware performs validation, routing, and billing operations.

**Q: How do I add request context enrichment from logistics data?**
A: Implement enrichment middleware that fetches logistics data (tracking information, inventory status, delivery estimates) and adds it to the request context for logistics applications.

**Q: Should I use this pattern for request context validation for data partitioning?**
A: Yes. Data partitioning validation chains where each middleware validates partitioning rules and ensures data is correctly partitioned for distributed processing.

**Q: How do I implement request context transformation for data normalization?**
A: Add transformation middleware that normalizes data (standardizing formats, removing duplicates, resolving inconsistencies) for consistent processing across systems.

**Q: Can middleware be implemented as robotics processing steps?**
A: Yes. Robotics systems use chain of responsibility where each middleware processes sensor data, performs control logic, and generates actuator commands.

**Q: How do I add request context enrichment from weather data?**
A: Implement enrichment middleware that fetches weather data (current conditions, forecasts, alerts) and adds it to the request context for weather-aware applications.

**Q: Should I use this pattern for request context validation for data indexing?**
A: Yes. Data indexing validation chains where each middleware validates data quality and structure before indexing ensure high-quality search indexes.

**Q: How do I implement request context transformation for data deduplication?**
A: Add transformation middleware that identifies and removes duplicate data based on various criteria (exact match, fuzzy match, semantic similarity) for data deduplication.

**Q: Can chains be used for request context validation in e-commerce?**
A: Yes. E-commerce systems use chain of responsibility for order processing, where each middleware validates inventory, applies discounts, and processes payments.

**Q: How do I add request context enrichment from social graph data?**
A: Implement enrichment middleware that fetches social graph data (connections, relationships, influence metrics) and adds it to the request context for social graph applications.

**Q: Should I use this pattern for request context validation for data purging?**
A: Yes. Data purging validation chains where each middleware validates purging policies (retention expiration, legal holds, compliance) ensure proper data deletion.

**Q: How do I implement request context transformation for data masking?**
A: Add transformation middleware that masks sensitive data (partial masking, full masking, format-preserving encryption) for privacy protection while maintaining data utility.

**Q: Can middleware be implemented as smart contract execution steps?**
A: Yes. Blockchain systems use chain of responsibility where each middleware validates transactions, executes smart contract logic, and updates blockchain state.

**Q: How do I add request context enrichment from recommendation data?**
A: Implement enrichment middleware that fetches recommendation data (personalized recommendations, collaborative filtering, content-based filtering) and adds it to the request context for recommendation systems.

**Q: Should I use this pattern for request context validation for data versioning?**
A: Yes. Data versioning validation chains where each middleware validates version compatibility and ensures data schema compatibility across versions.

**Q: How do I implement request context transformation for data type conversion?**
A: Add transformation middleware that converts data between different types (string to number, date to timestamp, binary to base64) for type compatibility across systems.

**Q: Can chains be used for request context validation in government systems?**
A: Yes. Government systems use chain of responsibility with validation middleware for regulatory compliance (FOIA, accessibility, security) and government-specific requirements.

**Q: How do I add request context enrichment from streaming data?**
A: Implement enrichment middleware that fetches streaming data (live feeds, real-time updates, event streams) and adds it to the request context for real-time applications.

**Q: Should I use this pattern for request context validation for data quality monitoring?**
A: Yes. Data quality monitoring chains where each middleware monitors different quality dimensions (accuracy, completeness, timeliness) and triggers alerts for quality issues.

**Q: How do I implement request context transformation for complex data parsing?**
A: Add transformation middleware that parses complex data structures (nested JSON, XML documents, binary formats) into structured objects for easier processing.

**Q: Can middleware be implemented as edge computing processing steps?**
A: Yes. Edge computing systems use chain of responsibility where each middleware processes data at the edge (validation, filtering, aggregation) before sending to central systems.

**Q: How do I add request context enrichment from blockchain data?**
A: Implement enrichment middleware that fetches blockchain data (transaction history, smart contract state, NFT metadata) and adds it to the request context for blockchain-integrated applications.

**Q: Should I use this pattern for request context validation for data governance?**
A: Yes. Data governance validation chains where each middleware validates governance policies (access control, data classification, lineage tracking) ensure compliance with governance frameworks.

**Q: How do I implement request context transformation for data validation?**
A: Add transformation middleware that validates data against schemas, rules, and constraints to ensure data quality and consistency before processing.

**Q: Can chains be used for request context validation in embedded systems?**
A: Yes. Embedded systems use chain of responsibility for sensor data processing, where each middleware filters, validates, and processes sensor readings.

**Q: How do I add request context enrichment from satellite data?**
A: Implement enrichment middleware that fetches satellite data (imagery, telemetry, positioning) and adds it to the request context for satellite-based applications.

**Q: Should I use this pattern for request context validation for data lifecycle management?**
A: Yes. Data lifecycle management validation chains where each middleware validates lifecycle policies (creation, usage, archiving, deletion) ensure proper data lifecycle management.

**Q: How do I implement request context transformation for data integration?**
A: Add transformation middleware that integrates data from multiple sources (merge, join, union) for unified data processing and analysis.

**Q: Can middleware be implemented as quantum computing processing steps?**
A: Yes. Quantum computing systems use chain of responsibility where each middleware prepares quantum states, executes quantum operations, and measures results.

**Q: How do I add request context enrichment from biometric data?**
A: Implement enrichment middleware that fetches biometric data (fingerprints, facial recognition, voice patterns) and adds it to the request context for biometric authentication applications.

**Q: Should I use this pattern for request context validation for data provenance?**
A: Yes. Data provenance validation chains where each middleware tracks data origin, transformations, and ownership ensure data provenance and auditability.

**Q: How do I implement request context transformation for data standardization?**
A: Add transformation middleware that standardizes data to common formats and structures (ISO standards, industry standards, internal standards) for interoperability.

**Q: Can chains be used for request context validation in aerospace systems?**
A: Yes. Aerospace systems use chain of responsibility with validation middleware for safety-critical operations, with redundancy and formal verification.

**Q: How do I add request context enrichment from automotive data?**
A: Implement enrichment middleware that fetches automotive data (vehicle telemetry, diagnostics, GPS) and adds it to the request context for automotive applications.

**Q: Should I use this pattern for request context validation for data security?**
A: Yes. Data security validation chains where each middleware validates security policies (encryption, access control, audit logging) ensure data security and compliance.

**Q: How do I implement request context transformation for data virtualization?**
A: Add transformation middleware that virtualizes data access (abstracting physical storage, providing unified views) for flexible data access without moving data.

**Q: Can middleware be implemented as AR/VR processing steps?**
A: Yes. AR/VR systems use chain of responsibility where each middleware processes sensor data, performs spatial tracking, and renders virtual content.

**Q: How do I add request context enrichment from energy data?**
A: Implement enrichment middleware that fetches energy data (consumption, generation, grid status) and adds it to the request context for energy management applications.

**Q: Should I use this pattern for request context validation for data sustainability?**
A: Yes. Data sustainability validation chains where each middleware validates sustainability policies (energy efficiency, carbon footprint, resource usage) ensure environmentally responsible data processing.

**Q: How do I implement request context transformation for data orchestration?**
A: Add transformation middleware that orchestrates data workflows (coordination, dependency management, error handling) for complex data processing pipelines.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
