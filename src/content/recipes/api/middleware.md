---
contentType: recipes
slug: middleware
title: "Middleware"
description: "How to implement request/response middleware for logging, auth, and error handling across Python, JavaScript, and Java."
metaDescription: "Practical middleware examples in Python (Flask/FastAPI), JavaScript (Express), and Java (Spring). Learn request interceptors, logging, auth, and error handling patterns."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - authentication
  - express
  - fastapi
  - interceptor
  - java
  - javascript
  - logging
  - middleware
  - python
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/jwt-authentication
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical middleware examples in Python (Flask/FastAPI), JavaScript (Express), and Java (Spring). Learn request interceptors, logging, auth, and error handling patterns."
  keywords:
    - middleware
    - request interceptor
    - express middleware
    - fastapi middleware
    - spring interceptor
    - auth middleware
    - logging middleware
    - error handling middleware
---

## Overview

Middleware is software that sits between the incoming request and the final route handler. It intercepts, processes, or transforms requests and responses. Common uses include authentication, logging, CORS, rate limiting, request validation, and error handling.

Middleware follows a pipeline pattern: each layer can modify the request, abort the chain, or pass control to the next layer.

## When to Use

Use this recipe when:

- Enforcing authentication before route handlers execute
- Logging all incoming requests and response times
- Adding CORS headers or security headers to every response
- Validating request bodies or query parameters
- Implementing rate limiting or request throttling

## Solution

### Python (FastAPI)

```python
from fastapi import Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time

# Custom middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    print(f"{request.method} {request.url.path} - {response.status_code} ({duration:.3f}s)")
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],
    allow_methods=["GET", "POST"],
)

# Auth dependency (used as middleware in routes)
async def verify_token(request: Request):
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    return token

@app.get("/protected", dependencies=[Depends(verify_token)])
async def protected():
    return {"message": "Secret data"}
```

### JavaScript (Express)

```javascript
const express = require('express');
const app = express();

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = verifyToken(token); // your token verification logic
  next();
}

app.use('/api/protected', authMiddleware);

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
```

### Java (Spring Boot)

```java
@Component
public class LoggingInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        req.setAttribute("startTime", System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res, Object handler, Exception ex) {
        long start = (Long) req.getAttribute("startTime");
        long duration = System.currentTimeMillis() - start;
        System.out.println(req.getMethod() + " " + req.getRequestURI() + " - " + res.getStatus() + " (" + duration + "ms)");
    }
}

// Register interceptor
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Autowired
    private LoggingInterceptor loggingInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loggingInterceptor).addPathPatterns("/api/**");
    }
}
```

## Explanation

- **preHandle / before**: Runs before the route handler. Can block requests (auth, validation).
- **postHandle / after**: Runs after the handler but before the response is sent.
- **afterCompletion**: Runs after the response is fully sent. Ideal for cleanup and logging.
- **Error middleware**: Catches uncaught exceptions. Must be registered last in the stack.

## Best Practices

- **Order matters**: Register middleware in the correct sequence (e.g., auth before routes, error handler last)
- **Fail fast**: Reject unauthorized or invalid requests as early as possible
- **Don't swallow errors**: Always pass errors to the error handler or next middleware
- **Be stateless**: Middleware should not depend on request order or shared mutable state
- **Use dependency injection**: In Spring/FastAPI, inject services rather than instantiating inside middleware

## Common Mistakes

- Forgetting to call `next()` in Express middleware
- Registering error-handling middleware before route handlers
- Mutating the request object with untrusted data
- Running heavy computations synchronously in middleware, blocking requests
- Not handling async errors properly in Express (use `next(err)` in catch blocks)

## Frequently Asked Questions

**Q: Can middleware modify the response body?**
A: Yes, but it is complex in some frameworks. Prefer modifying headers or status codes. For body transformation, use response wrappers or post-route hooks.

**Q: How many middleware layers are too many?**
A: There is no hard limit, but each layer adds latency. Profile your stack and remove unnecessary layers in performance-critical paths.

**Q: What is the difference between middleware and decorators/annotations?**
A: Middleware operates at the framework level on all matching routes. Decorators/annotations attach behavior to specific functions or controllers.
