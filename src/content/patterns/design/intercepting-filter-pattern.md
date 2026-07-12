---






contentType: patterns
slug: intercepting-filter-pattern
title: "Intercepting Filter Pattern"
description: "Compose cross-cutting concerns into a chain of pluggable filters that intercept requests and responses, enabling reusable preprocessing and postprocessing logic."
metaDescription: "Learn the Intercepting Filter Pattern for request/response pipelines. Examples in Python, Java, and JavaScript with filter chains, decorators, and middleware."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - intercepting-filter
  - pattern
  - design-pattern
  - behavioral
  - architecture
  - middleware
  - pipeline
relatedResources:
  - /patterns/chain-of-responsibility-pattern
  - /patterns/decorator-pattern
  - /patterns/proxy-pattern
  - /patterns/blackboard-pattern
  - /patterns/business-delegate-pattern
  - /patterns/context-object-pattern
  - /patterns/manager-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Intercepting Filter Pattern for request/response pipelines. Examples in Python, Java, and JavaScript with filter chains, decorators, and middleware."
  keywords:
    - intercepting filter
    - design pattern
    - architecture
    - middleware
    - pipeline






---

# Intercepting Filter Pattern

## Overview

The Intercepting Filter Pattern composes cross-cutting concerns into a chain of pluggable filters that intercept requests and responses. Each filter performs a specific preprocessing or postprocessing task (authentication, logging, compression, validation) and delegates to the next filter in the chain. The final target (a servlet, handler, or controller) processes the core business logic.

This pattern is the foundation of HTTP middleware in web frameworks, servlet filters in Java EE, and ASP.NET Core middleware pipelines. It allows concerns to be added, removed, or reordered without modifying the core request handler.

## When to Use


- For alternatives, see [Business Delegate Pattern](/patterns/business-delegate-pattern/).

Use the Intercepting Filter Pattern when:
- Cross-cutting concerns (auth, logging, caching) should be reused across multiple handlers
- Request/response processing needs preprocessing or postprocessing stages
- You need a flexible, configurable pipeline where filters can be added or reordered
- Multiple handlers share the same set of cross-cutting concerns

## When to Avoid

- A single handler with unique one-off concerns (plain decorator suffices)
- Performance-critical paths where pipeline overhead is unacceptable
- When filter ordering dependencies become complex and hard to reason about
- Simple applications where direct method calls are clearer

## Solution

### Python

```python
from abc import ABC, abstractmethod
from typing import Callable, Dict, Any
from dataclasses import dataclass

@dataclass
class HttpRequest:
    path: str
    headers: Dict[str, str]
    body: Any = None
    user: Any = None
    authenticated: bool = False

@dataclass
class HttpResponse:
    status: int = 200
    headers: Dict[str, str] = None
    body: Any = None

    def __post_init__(self):
        if self.headers is None:
            self.headers = {}


class Filter(ABC):
    """Base filter that can chain to the next filter"""
    def __init__(self, next_filter: 'Filter' = None):
        self.next_filter = next_filter

    @abstractmethod
    def do_filter(self, request: HttpRequest, response: HttpResponse):
        pass

    def _invoke_next(self, request: HttpRequest, response: HttpResponse):
        if self.next_filter:
            self.next_filter.do_filter(request, response)


class AuthenticationFilter(Filter):
    """Checks if the request has a valid token"""
    def do_filter(self, request: HttpRequest, response: HttpResponse):
        token = request.headers.get("Authorization")
        if token and token.startswith("Bearer "):
            request.user = "authenticated_user"
            request.authenticated = True
            self._invoke_next(request, response)
        else:
            response.status = 401
            response.body = {"error": "Unauthorized"}


class LoggingFilter(Filter):
    """Logs request details before and after processing"""
    def do_filter(self, request: HttpRequest, response: HttpResponse):
        print(f"[LOG] Request to {request.path}")
        self._invoke_next(request, response)
        print(f"[LOG] Response status: {response.status}")


class CompressionFilter(Filter):
    """Compresses response body if client accepts it"""
    def do_filter(self, request: HttpRequest, response: HttpResponse):
        self._invoke_next(request, response)
        if "gzip" in request.headers.get("Accept-Encoding", ""):
            response.headers["Content-Encoding"] = "gzip"
            print("[COMPRESS] Response compressed")


class TargetHandler(Filter):
    """The final handler that processes the core request"""
    def __init__(self):
        super().__init__(None)

    def do_filter(self, request: HttpRequest, response: HttpResponse):
        if response.status == 200:
            response.body = {"message": f"Hello, {request.user or 'guest'}!"}


class FilterChain:
    """Builds and executes the filter pipeline"""
    def __init__(self):
        self.filters: list[Filter] = []

    def add_filter(self, filter_cls):
        self.filters.append(filter_cls)
        return self

    def execute(self, request: HttpRequest) -> HttpResponse:
        # Build chain from tail to head
        target = TargetHandler()
        current = target
        for filter_cls in reversed(self.filters):
            new_filter = filter_cls()
            new_filter.next_filter = current
            current = new_filter

        response = HttpResponse()
        current.do_filter(request, response)
        return response


# Usage
chain = FilterChain()
chain.add_filter(AuthenticationFilter) \
     .add_filter(LoggingFilter) \
     .add_filter(CompressionFilter)

request = HttpRequest(
    path="/api/hello",
    headers={"Authorization": "Bearer abc123", "Accept-Encoding": "gzip"}
)
response = chain.execute(request)
print(f"Result: {response.status} - {response.body}")
```

### Java

```java
import java.util.*;

class HttpRequest {
    private final String path;
    private final Map<String, String> headers;
    private String user;
    private boolean authenticated;

    public HttpRequest(String path, Map<String, String> headers) {
        this.path = path; this.headers = headers;
    }
    public String getPath() { return path; }
    public Map<String, String> getHeaders() { return headers; }
    public String getUser() { return user; }
    public void setUser(String user) { this.user = user; }
    public boolean isAuthenticated() { return authenticated; }
    public void setAuthenticated(boolean auth) { this.authenticated = auth; }
}

class HttpResponse {
    private int status = 200;
    private final Map<String, String> headers = new HashMap<>();
    private Object body;

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }
    public Map<String, String> getHeaders() { return headers; }
    public Object getBody() { return body; }
    public void setBody(Object body) { this.body = body; }
}

interface Filter {
    void doFilter(HttpRequest request, HttpResponse response, FilterChain chain);
}

class FilterChain {
    private final List<Filter> filters = new ArrayList<>();
    private int currentIndex = 0;

    public void addFilter(Filter filter) { filters.add(filter); }

    public void doFilter(HttpRequest request, HttpResponse response) {
        if (currentIndex < filters.size()) {
            Filter filter = filters.get(currentIndex++);
            filter.doFilter(request, response, this);
        }
    }
}

class AuthenticationFilter implements Filter {
    public void doFilter(HttpRequest request, HttpResponse response, FilterChain chain) {
        String token = request.getHeaders().get("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            request.setUser("authenticated_user");
            request.setAuthenticated(true);
            chain.doFilter(request, response);
        } else {
            response.setStatus(401);
            response.setBody(Map.of("error", "Unauthorized"));
        }
    }
}

class LoggingFilter implements Filter {
    public void doFilter(HttpRequest request, HttpResponse response, FilterChain chain) {
        System.out.println("[LOG] Request to " + request.getPath());
        chain.doFilter(request, response);
        System.out.println("[LOG] Response status: " + response.getStatus());
    }
}

class TargetHandler implements Filter {
    public void doFilter(HttpRequest request, HttpResponse response, FilterChain chain) {
        if (response.getStatus() == 200) {
            response.setBody("Hello, " + (request.getUser() != null ? request.getUser() : "guest") + "!");
        }
    }
}

// Usage
HttpRequest request = new HttpRequest("/api/hello", Map.of(
    "Authorization", "Bearer abc123",
    "Accept-Encoding", "gzip"
));
HttpResponse response = new HttpResponse();

FilterChain chain = new FilterChain();
chain.addFilter(new AuthenticationFilter());
chain.addFilter(new LoggingFilter());
chain.addFilter(new TargetHandler());
chain.doFilter(request, response);

System.out.println("Result: " + response.getStatus() + " - " + response.getBody());
```

### JavaScript

```javascript
class HttpRequest {
  constructor(path, headers) {
    this.path = path;
    this.headers = headers;
    this.user = null;
    this.authenticated = false;
  }
}

class HttpResponse {
  constructor() {
    this.status = 200;
    this.headers = {};
    this.body = null;
  }
}

class FilterChain {
  constructor() {
    this.filters = [];
    this.index = 0;
  }

  addFilter(filter) {
    this.filters.push(filter);
    return this;
  }

  doFilter(request, response) {
    if (this.index < this.filters.length) {
      const filter = this.filters[this.index++];
      filter.doFilter(request, response, this);
    }
  }
}

class AuthenticationFilter {
  doFilter(request, response, chain) {
    const token = request.headers['Authorization'];
    if (token && token.startsWith('Bearer ')) {
      request.user = 'authenticated_user';
      request.authenticated = true;
      chain.doFilter(request, response);
    } else {
      response.status = 401;
      response.body = { error: 'Unauthorized' };
    }
  }
}

class LoggingFilter {
  doFilter(request, response, chain) {
    console.log(`[LOG] Request to ${request.path}`);
    chain.doFilter(request, response);
    console.log(`[LOG] Response status: ${response.status}`);
  }
}

class CompressionFilter {
  doFilter(request, response, chain) {
    chain.doFilter(request, response);
    const encoding = request.headers['Accept-Encoding'] || '';
    if (encoding.includes('gzip')) {
      response.headers['Content-Encoding'] = 'gzip';
      console.log('[COMPRESS] Response compressed');
    }
  }
}

class TargetHandler {
  doFilter(request, response, chain) {
    if (response.status === 200) {
      response.body = { message: `Hello, ${request.user || 'guest'}!` };
    }
  }
}

// Usage
const request = new HttpRequest('/api/hello', {
  Authorization: 'Bearer abc123',
  'Accept-Encoding': 'gzip',
});
const response = new HttpResponse();

const chain = new FilterChain();
chain.addFilter(new AuthenticationFilter())
     .addFilter(new LoggingFilter())
     .addFilter(new CompressionFilter())
     .addFilter(new TargetHandler());

chain.doFilter(request, response);
console.log('Result:', response.status, response.body);
```

## Explanation

The Intercepting Filter Pattern structures request processing as a pipeline:

1. **Request arrives** at the filter chain entry point
2. **Each filter** may inspect, modify, or short-circuit the request
3. **Filters delegate** to the next filter via `chain.doFilter()`
4. **Target handler** executes the core business logic
5. **Postprocessing** occurs as the call stack unwinds (response filters)

Filters are ordered. Authentication should run before authorization, which should run before caching. The order is configurable at runtime.

## Variants

| Variant | Mechanism | Use Case |
|---------|-----------|----------|
| **Linear chain** | Each filter calls the next | Standard web middleware |
| **Decorators** | Object wrapping | Functional composition |
| **Event-driven** | Filters subscribe to events | Highly decoupled systems |
| **DAG pipeline** | Directed acyclic graph of stages | Complex data processing |

## What Works

- **Order filters carefully.** Authentication before authorization before caching.
- **Make filters stateless.** Thread safety depends on stateless filter instances.
- **Short-circuit on failure.** Auth failure should stop the chain, not continue.
- **Use the chain for both request and response.** Postprocessing on the unwind path.
- **Document filter dependencies.** Order matters; make constraints explicit.

## Common Mistakes

- **Wrong filter order.** Caching before auth caches unauthorized responses.
- **Stateful filters.** Race conditions occur with instance-level state.
- **Swallowing exceptions.** An error in one filter should not silently break the chain.
- **Too many filters.** Each adds overhead; consolidate related concerns.
- **Modifying request body without copying.** Filters should not mutate shared state unexpectedly.

## Real-World Examples

### Servlet Filters (Java EE)

Java's `javax.servlet.Filter` interface defines `doFilter(request, response, chain)`. Filters are configured in `web.xml` or via `@WebFilter` annotations.

### Express.js Middleware

Express middleware functions are Intercepting Filters: `app.use((req, res, next) => { ... next() })`. The `next()` call is the chain delegation.

### ASP.NET Core Middleware

ASP.NET Core builds the request pipeline with `app.Use()`, `app.Map()`, and custom middleware classes implementing `Invoke()`.

## Frequently Asked Questions

**Q: What is the difference between Intercepting Filter and Chain of Responsibility?**
A: Chain of Responsibility has multiple handlers, any of which may process the request. Intercepting Filter has a single target, with all filters contributing preprocessing/postprocessing.

**Q: How do I handle exceptions in a filter chain?**
A: Use a dedicated error-handling filter at the end, or wrap the chain execution in a try-catch that produces an error response.

**Q: Can filters modify the response on the way back?**
A: Yes. Postprocessing occurs naturally after `chain.doFilter()` returns in each filter.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
