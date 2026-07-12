---


contentType: patterns
slug: front-controller-pattern
title: "Front Controller Pattern"
description: "Route all incoming requests through a single handler that dispatches to the appropriate page command, centralizing request processing and security."
metaDescription: "Learn the Front Controller Pattern for centralized request handling in web apps. Examples in Python, Java, and JavaScript with routing and dispatch."
difficulty: intermediate
topics:
  - design
tags:
  - front-controller
  - pattern
  - design-pattern
  - structural
  - web
  - routing
  - mvc
relatedResources:
  - /patterns/page-controller-pattern
  - /patterns/model-view-presenter-pattern
  - /patterns/facade-pattern
  - /patterns/model-view-viewmodel-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Front Controller Pattern for centralized request handling in web apps. Examples in Python, Java, and JavaScript with routing and dispatch."
  keywords:
    - front controller
    - design pattern
    - routing
    - web
    - mvc


---

# Front Controller Pattern

## Overview

The Front Controller Pattern routes all incoming requests through a single entry point — a central handler that processes each request and dispatches it to the appropriate command or controller. Rather than having every page handle its own request parsing, authentication, and logging, the Front Controller centralizes these cross-cutting concerns.

This is the pattern behind virtually every modern web framework. Spring Boot's `DispatcherServlet`, Django's WSGI handler, and Express.js middleware chains all embody Front Controller principles. One handler receives every request, performs common processing, then delegates to a page-specific controller.

## When to Use

Use the Front Controller Pattern when:
- Multiple pages share common preprocessing (authentication, logging, encoding)
- You want a clean URL routing system independent of file structure
- Request handling needs to be consistent across the entire application
- You need centralized error handling and security checks

## When to Avoid

- Very simple applications with only a few pages (overhead without benefit)
- Static sites where each page can be served directly
- When the front controller becomes a God object handling too many responsibilities

## Solution

### Python

```python
from typing import Callable, Dict
from http.server import BaseHTTPRequestHandler, HTTPServer

class Request:
    def __init__(self, path: str, method: str, headers: dict):
        self.path = path
        self.method = method
        self.headers = headers

class Response:
    def __init__(self, body: str, status: int = 200):
        self.body = body
        self.status = status

class FrontController:
    def __init__(self):
        self._handlers: Dict[str, Callable] = {}

    def register(self, path: str, handler: Callable):
        self._handlers[path] = handler

    def dispatch(self, request: Request) -> Response:
        # Common preprocessing
        if not self._authenticate(request):
            return Response("Unauthorized", 401)

        handler = self._handlers.get(request.path)
        if handler:
            return handler(request)
        return Response("Not Found", 404)

    def _authenticate(self, request: Request) -> bool:
        return request.headers.get("Authorization") == "Bearer valid"


def home_handler(request: Request) -> Response:
    return Response("Welcome to the home page")

def user_handler(request: Request) -> Response:
    return Response("User profile page")


# Setup
controller = FrontController()
controller.register("/", home_handler)
controller.register("/user", user_handler)

# Usage
req = Request("/user", "GET", {"Authorization": "Bearer valid"})
resp = controller.dispatch(req)
print(resp.status, resp.body)
```

### Java

```java
import java.util.*;

public record Request(String path, String method, Map<String, String> headers) {}
public record Response(String body, int status) {
    public Response(String body) { this(body, 200); }
}

@FunctionalInterface
interface RequestHandler {
    Response handle(Request request);
}

class FrontController {
    private final Map<String, RequestHandler> handlers = new HashMap<>();

    public void register(String path, RequestHandler handler) {
        handlers.put(path, handler);
    }

    public Response dispatch(Request request) {
        if (!authenticate(request)) {
            return new Response("Unauthorized", 401);
        }
        RequestHandler handler = handlers.get(request.path());
        if (handler != null) {
            return handler.handle(request);
        }
        return new Response("Not Found", 404);
    }

    private boolean authenticate(Request request) {
        return "Bearer valid".equals(request.headers().get("Authorization"));
    }
}

// Handlers
class HomeHandler implements RequestHandler {
    public Response handle(Request request) {
        return new Response("Welcome to the home page");
    }
}

class UserHandler implements RequestHandler {
    public Response handle(Request request) {
        return new Response("User profile page");
    }
}

// Usage
FrontController controller = new FrontController();
controller.register("/", new HomeHandler());
controller.register("/user", new UserHandler());

Request req = new Request("/user", "GET", Map.of("Authorization", "Bearer valid"));
Response resp = controller.dispatch(req);
System.out.println(resp.status() + " " + resp.body());
```

### JavaScript

```javascript
class Request {
  constructor(path, method, headers) {
    this.path = path;
    this.method = method;
    this.headers = headers;
  }
}

class Response {
  constructor(body, status = 200) {
    this.body = body;
    this.status = status;
  }
}

class FrontController {
  constructor() {
    this.handlers = new Map();
  }

  register(path, handler) {
    this.handlers.set(path, handler);
  }

  dispatch(request) {
    if (!this.authenticate(request)) {
      return new Response('Unauthorized', 401);
    }
    const handler = this.handlers.get(request.path);
    if (handler) {
      return handler(request);
    }
    return new Response('Not Found', 404);
  }

  authenticate(request) {
    return request.headers.authorization === 'Bearer valid';
  }
}

// Handlers
const homeHandler = (req) => new Response('Welcome to the home page');
const userHandler = (req) => new Response('User profile page');

// Setup
const controller = new FrontController();
controller.register('/', homeHandler);
controller.register('/user', userHandler);

// Usage
const req = new Request('/user', 'GET', { authorization: 'Bearer valid' });
const resp = controller.dispatch(req);
console.log(resp.status, resp.body);
```

## Explanation

The Front Controller centralizes:

- **Request parsing**: URL decoding, parameter extraction, content negotiation
- **Preprocessing**: Authentication, authorization, input validation
- **Routing**: Mapping URLs to the correct page controller
- **Postprocessing**: Logging, metrics, response formatting
- **Error handling**: Converting exceptions into HTTP status codes

## Variants

| Variant | Mechanism | Use Case |
|---------|-----------|----------|
| **Servlet Filter** | Chain of filters in Java web apps | Authentication, encoding, compression |
| **Middleware** | Express.js / Django middleware stack | Cross-cutting request processing |
| **Dispatcher** | Spring MVC `DispatcherServlet` | Full MVC framework with view resolution |
| **Reverse Proxy** | Nginx / Apache as front controller | Load balancing, SSL termination, caching |

## What Works

- **Keep the controller lean.** Delegate page logic to dedicated command objects or sub-controllers.
- **Use a routing table.** Map URL patterns to handlers declaratively rather than with nested if-else.
- **Process common concerns first.** Authentication, CSRF protection, and input sanitization belong here.
- **Support interceptors.** Allow middleware to modify requests and responses without changing the core.
- **Return early for errors.** Invalid requests should fail fast before reaching page logic.

## Common Mistakes

- **Bloated Front Controller** that knows too much about page logic. It should dispatch, not implement.
- **Tight coupling to a specific view technology.** The controller should not generate HTML directly.
- **Ignoring HTTP semantics.** Returning 200 for every response hides errors from clients.
- **Missing error boundaries.** Unhandled exceptions leak stack traces to users.
- **Synchronous blocking.** The front controller should not perform long-running operations inline.

## Real-World Examples

### Spring MVC

`DispatcherServlet` is the Front Controller. It receives all HTTP requests, resolves controllers via annotations, and delegates view rendering to `ViewResolver`.

### Django

Django's WSGI application acts as a Front Controller. URL routing (`urls.py`) maps incoming requests to views after middleware processing.

### Express.js

Express apps use a central app object with middleware. `app.use(auth)` and `app.get('/user', handler)` build a Front Controller pipeline.

## Frequently Asked Questions

**Q: What is the difference between Front Controller and Page Controller?**
A: [Page Controller](/patterns/design/page-controller-pattern) uses one controller per page. Front Controller uses a single entry point for the entire application.

**Q: Does every web framework use Front Controller?**
A: Most modern frameworks do. PHP's original model (one file per page) is the alternative Page Controller approach.

**Q: Can a Front Controller handle WebSocket connections?**
A: Yes. The entry point inspects the upgrade header and routes to a WebSocket handler or an HTTP handler accordingly.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
