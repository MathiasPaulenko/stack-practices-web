---
contentType: recipes
slug: handle-errors
title: "Handle API Errors with RFC 7807 and HTTP Status Codes"
description: "Patterns for consistent, predictable API error handling across multiple languages and frameworks."
metaDescription: "Implement consistent REST API error handling with RFC 7807 Problem Details, HTTP status codes, and examples in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - error-handling
  - rest
  - http
  - python
  - javascript
  - java
  - fastapi
  - express
relatedResources:
  - /recipes/call-rest-api
  - /recipes/input-validation
  - /recipes/api-versioning
  - /recipes/api-logging-audit
  - /recipes/api-documentation-openapi
  - /guides/rest-api-design-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Implement consistent REST API error handling with RFC 7807 Problem Details, HTTP status codes, and examples in Python, JavaScript, and Java."
  keywords:
    - error handling
    - api errors
    - rest api
    - http status codes
    - rfc 7807
    - problem details
---

## Overview

Good error handling is what makes an API reliable. A well-designed error
response tells the client what went wrong, what to do about it, and how to avoid
it — without leaking internal details. This recipe covers RFC 7807 Problem
Details, HTTP status codes, and idiomatic implementations in Python, JavaScript,
and Java.

## When to Use

- Building or refactoring a REST API that clients depend on.
- Standardizing error responses across several backend services.
- Documenting failure modes for API consumers.
- Designing error-handling middleware or exception mappers.

### When to avoid

- The API has only a few endpoints with no complex business logic. A lightweight
  `{ error: "message" }` shape is enough.
- The API already uses a stable, client-dependent error format. Migrating to RFC
  7807 breaks compatibility.
- Latency is extremely tight. Extra validation and response formatting add
  overhead.

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

**RFC 7807 Problem Details** defines a standard JSON error shape with `type`,
`title`, `detail`, and `status`. This makes your API predictable for clients and
easy to document.

**HTTP status codes** carry the semantic meaning. Never return 200 OK for a
failed request. Use 400 for client mistakes, 401/403 for auth, 404 for missing
resources, 409 for conflicts, 422 for validation failures, and 500 for server
bugs.

**Global error handlers** centralize serialization so route handlers stay focused
on business logic. They also prevent stack traces and SQL details from leaking to
clients in production.

## Variants

| Language | Framework | Handler pattern | Typed errors |
| --- | --- | --- | --- |
| Python | FastAPI | `@app.exception_handler` | `HTTPException` |
| Python | Django REST | `exception_handler` setting | `APIException` subclasses |
| JavaScript | Express | Error-handling middleware | Custom `AppError` class |
| JavaScript | NestJS | `@Catch()` exception filters | `HttpException` |
| Java | Spring Boot | `@ControllerAdvice` | `ResponseStatusException` |
| Java | JAX-RS | `ExceptionMapper<T>` | `WebApplicationException` |

## Best Practices

- Use the right HTTP status. 400 for client mistakes, 401/403 for auth, 404 for
  missing resources, 409 for conflicts, 422 for validation failures, 500 for
  server bugs.
- Include a correlation ID in error responses and logs so support can trace
  requests.
- Keep messages useful. "User name must be between 2 and 50 characters" is
  better than "Validation failed."
- Never expose stack traces, SQL, or internal paths in production.
- Set `Cache-Control: no-store` on all error responses.
- Document every 4xx and 5xx an endpoint can return in your OpenAPI spec.
- Validate input early. See [input validation](/recipes/input-validation/) for
  request validation patterns.

## Common Mistakes

- Returning 200 OK with an error body. It breaks caching, logging, and
  monitoring.
- Exposing internals like stack traces or SQL details to clients.
- Using inconsistent shapes between endpoints. One returns `{ error: "msg" }`,
  another `{ message: "msg", code: 123 }`.
- Returning 500 for a missing resource (should be 404) or 403 for an
  unauthenticated request (should be 401).
- Swallowing exceptions. Catching everything and returning a generic 500 hides
  bugs you should fix.
- Returning different errors for "user not found" and "wrong password". This
  lets attackers enumerate valid accounts.

## FAQ

### Should I use RFC 7807 or a simpler custom format?

Use RFC 7807 for public APIs and microservices. For internal tools with trusted
clients, a simple `{ error, message }` object is fine if it's consistent across
all endpoints.

### How do I handle validation errors with multiple fields?

Extend the Problem Details response with an `errors` or `invalid-params` array,
listing each field and its reason. FastAPI and Spring Boot do this out of the
box.

### What status code should I use for business-logic failures?

Use 422 Unprocessable Entity for semantic validation failures (e.g., "can't ship
to this country"). Use 409 Conflict for state conflicts (e.g., duplicate
email). Avoid 400 for business rules.

### How do I prevent error responses from leaking sensitive data?

In production, return a generic message for 500 errors and log the full stack
trace server-side. Use an allowlist for fields in error responses and avoid
including user input directly.

### How do I test error handling?

Write contract tests that verify every endpoint returns the same error fields
for each status code (400, 401, 403, 404, 409, 422, 500). Also verify logs
contain a correlation ID and stack trace.

### How do I handle errors across microservices?

Propagate the same correlation ID and error format across service boundaries.
Return 502/503 for downstream failures and 504 for timeouts. Never forward
internal downstream error details to the client.
