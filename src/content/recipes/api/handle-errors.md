---
contentType: recipes
slug: handle-errors
title: "Handle Errors in APIs"
description: "Patterns for consistent, predictable API error handling across multiple languages and frameworks."
metaDescription: "Learn how to implement consistent REST API error handling with proper HTTP status codes, error payloads, and language examples in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - api
tags:
  - error-handling
  - api
  - rest
  - http-status
  - python
  - javascript
  - java
relatedResources:
  - /recipes/call-rest-api
  - /recipes/jwt-authentication
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Learn how to implement consistent REST API error handling with proper HTTP status codes, error payloads, and language examples in Python, JavaScript, and Java."
  keywords:
    - error handling
    - api errors
    - rest api
    - http status codes
    - error response
---

## Overview

Error handling is what separates robust APIs from fragile ones. A well-designed error response tells the client exactly what went wrong, what to do about it, and how to avoid it in the future — without leaking internal implementation details.

This recipe covers the industry-standard error response format (RFC 7807 Problem Details), proper HTTP status code selection, and idiomatic implementation patterns in Python, JavaScript, and Java.

## When to Use

Use this recipe when:

- Building or refactoring a REST API that clients will depend on
- Standardizing error responses across multiple backend services
- Documenting failure modes for API consumers
- Designing error handling middleware or exception mappers

## Solution

### Python (FastAPI)

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "type": "https://api.example.com/errors/invalid-input",
            "title": "Invalid Input",
            "detail": str(exc),
            "status": 400,
        },
    )

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    if user_id <= 0:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "https://api.example.com/errors/not-found",
                "title": "User Not Found",
                "detail": f"No user with id {user_id}",
                "status": 404,
            },
        )
    return {"id": user_id, "name": "Ada"}
```

### JavaScript (Express)

```javascript
const express = require('express');
const app = express();

function errorResponse(type, title, detail, status) {
  return { type, title, detail, status };
}

app.get('/users/:userId', (req, res, next) => {
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId) || userId <= 0) {
    return res.status(404).json(
      errorResponse(
        'https://api.example.com/errors/not-found',
        'User Not Found',
        `No user with id ${req.params.userId}`,
        404
      )
    );
  }
  res.json({ id: userId, name: 'Ada' });
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json(
    errorResponse(
      'https://api.example.com/errors/server-error',
      'Internal Server Error',
      process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
      err.status || 500
    )
  );
});
```

### Java (Spring Boot)

```java
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
public class UserController {

    @GetMapping("/users/{userId}")
    public Map<String, Object> getUser(@PathVariable Long userId) {
        if (userId <= 0) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "No user with id " + userId
            );
        }
        return Map.of("id", userId, "name", "Ada");
    }
}

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        var body = Map.of(
            "type", "https://api.example.com/errors/not-found",
            "title", ex.getReason(),
            "detail", ex.getReason(),
            "status", ex.getStatusCode().value()
        );
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }
}
```

## Explanation

- **RFC 7807 Problem Details** defines a standard JSON error shape: `type`, `title`, `detail`, and `status`. Using this format makes your API predictable for clients.
- **HTTP status codes** carry the semantic meaning of the error. Never return 200 OK for a failed request.
- **Global error handlers** centralize error serialization so individual route handlers stay focused on business logic.
- **Leak prevention**: in production, never expose stack traces or internal paths in error responses.

## Variants

| Language | Framework | Exception Handler | Typed Errors |
|----------|-----------|-------------------|--------------|
| Python | FastAPI | `@app.exception_handler` | `HTTPException` |
| Python | Django REST | `exception_handler` setting | `APIException` subclasses |
| JavaScript | Express | Error-handling middleware | Custom `AppError` class |
| JavaScript | NestJS | `@Catch()` exception filters | `HttpException` |
| Java | Spring Boot | `@ControllerAdvice` | `ResponseStatusException` |
| Java | JAX-RS | `ExceptionMapper<T>` | `WebApplicationException` |

## Best Practices

- **Use the correct HTTP status**: 400 for client mistakes, 401/403 for auth issues, 404 for missing resources, 409 for conflicts, 422 for validation failures, 500 for server bugs.
- **Include a correlation ID**: add a request ID to every error response so support can trace logs.
- **Document all errors**: list every 4xx and 5xx your endpoint can return in your API docs (OpenAPI).
- **Keep messages actionable**: "User name must be between 2 and 50 characters" is better than "Validation failed."
- **Localize sparingly**: error `detail` can be in English; let the client map `type` URLs to localized UI strings.

## Common Mistakes

- **Returning 200 with an error body**: some legacy APIs do this — it breaks caching, logging, and monitoring.
- **Exposing internals**: sending full stack traces or SQL details to the client is a security risk.
- **Inconsistent shapes**: one endpoint returns `{ error: "msg" }`, another returns `{ message: "msg", code: 123 }` — this confuses client generators.
- **Wrong status code**: returning 500 for a missing resource (should be 404) or 403 for an unauthenticated request (should be 401).
- **Swallowing exceptions**: catching everything and returning a generic 500 hides bugs you should fix.

## Frequently Asked Questions

**Q: Should I use RFC 7807 or a simpler custom format?**
A: RFC 7807 is recommended for public APIs and microservices. For internal tools, a simpler `{ error, message }` object is fine if it is consistent across all endpoints.

**Q: How do I handle validation errors with multiple fields?**
A: Extend the Problem Details response with an `errors` array or `invalid-params` field, listing each invalid field and its reason. Spring Boot and FastAPI do this automatically.

**Q: What status code should I use for business-logic failures?**
A: Prefer 422 Unprocessable Entity for semantic validation failures (e.g., "cannot ship to this country"). Use 409 Conflict for state conflicts (e.g., duplicate email). Avoid 400 for business rules.
