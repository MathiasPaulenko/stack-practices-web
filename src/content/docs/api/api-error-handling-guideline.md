---





contentType: docs
slug: api-error-handling-guideline
title: "API Error Handling Guideline"
description: "A guideline for standardizing error responses, status codes, and error payloads across REST and GraphQL APIs."
metaDescription: "Standardize API error responses with this guideline. Covers HTTP status codes, error payloads, error IDs, and retry strategies for REST and GraphQL."
difficulty: beginner
topics:
  - api
  - architecture
tags:
  - api
  - error-handling
  - http-status-codes
  - rest
  - graphql
  - guideline
relatedResources:
  - /docs/microservice-contract-template
  - /docs/api-security-review-template
  - /docs/api-monitoring-alerting-template
  - /guides/complete-guide-api-versioning-strategies
  - /guides/rest-api-design-guide
  - /guides/graphql-vs-rest-guide
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Standardize API error responses with this guideline. Covers HTTP status codes, error payloads, error IDs, and retry strategies for REST and GraphQL."
  keywords:
    - api errors
    - error handling
    - http status codes
    - rest api
    - graphql errors
    - error responses





---

## Overview

Inconsistent error responses confuse API consumers and increase integration time. One endpoint returns plain text, another returns nested JSON, and a third returns HTML. This guideline standardizes how your APIs communicate failure so consumers can handle errors programmatically without guessing formats.

## When to Use


- For alternatives, see [GraphQL vs REST — When to Choose and How to Migrate](/guides/graphql-vs-rest-guide/).

Use this resource when:
- Designing a new API or versioning an existing one
- Onboarding a new team that will build API endpoints
- Reviewing an API for consistency before public release
- Consumers report that error handling is difficult or unpredictable

## Solution

```markdown
# API Error Handling Standard

## 1. HTTP Status Codes

| Status | Meaning | When to Use |
|--------|---------|-------------|
| 400 | Bad Request | Validation errors, malformed JSON, missing required fields |
| 401 | Unauthorized | Missing or invalid authentication credentials |
| 403 | Forbidden | Authenticated but not authorized for this resource |
| 404 | Not Found | Resource does not exist (do not reveal if it exists but is forbidden) |
| 409 | Conflict | Resource already exists, duplicate entry, state conflict |
| 422 | Unprocessable Entity | Semantically correct but business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server failure (avoid exposing details) |
| 503 | Service Unavailable | Temporary outage, retry after header provided |

## 2. Error Response Format (REST)

```json
{
  "error": {
    "id": "err_7f8a9b2c",
    "code": "INVALID_PARAMETER",
    "message": "The 'email' field must be a valid email address.",
    "details": [
      {
        "field": "email",
        "issue": "invalid_format",
        "value": "not-an-email"
      }
    ],
    "timestamp": "2026-06-26T10:00:00Z",
    "path": "/v1/users",
    "retryable": false,
    "documentation_url": "https://docs.example.com/errors/INVALID_PARAMETER"
  }
}
```

## 3. Error Response Format (GraphQL)

```json
{
  "data": null,
  "errors": [
    {
      "message": "The 'email' field must be a valid email address.",
      "extensions": {
        "code": "INVALID_PARAMETER",
        "errorId": "err_7f8a9b2c",
        "field": "email",
        "retryable": false,
        "documentationUrl": "https://docs.example.com/errors/INVALID_PARAMETER"
      }
    }
  ]
}
```

## 4. Error Code Registry

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_PARAMETER | 400 | Field validation failed |
| MISSING_REQUIRED_FIELD | 400 | Required field not provided |
| AUTHENTICATION_FAILED | 401 | Invalid or expired credentials |
| PERMISSION_DENIED | 403 | Insufficient permissions |
| RESOURCE_NOT_FOUND | 404 | Requested resource missing |
| DUPLICATE_RESOURCE | 409 | Resource already exists |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error |

## 5. Retry Behavior

| Error Code | Retry Strategy | Max Retries | Backoff |
|------------|----------------|-------------|---------|
| RATE_LIMIT_EXCEEDED | Wait for Retry-After header | 3 | Exponential |
| INTERNAL_ERROR | Retry with jitter | 3 | Exponential 1s, 2s, 4s |
| SERVICE_UNAVAILABLE | Retry with jitter | 5 | Exponential |
| INVALID_PARAMETER | Do not retry | 0 | N/A |
| AUTHENTICATION_FAILED | Do not retry | 0 | N/A |

## 6. Logging Requirements

Every error response must be logged with:
- Error ID (for correlation)
- Request ID (from incoming request)
- User ID (if authenticated)
- Endpoint path and method
- Full error payload
- Stack trace (500 errors only, internal logs)
- Timestamp
```

## Explanation

The guideline forces every error to include a machine-readable code (`INVALID_PARAMETER`) and a human-readable message. The `errorId` enables consumers to reference the exact failure when contacting support. The `retryable` boolean tells client SDKs whether automatic retry is safe. Separating REST and GraphQL formats acknowledges that GraphQL returns 200 OK even for errors, so the error information lives in the `errors` array.

## Error Handler Implementation

### Express.js Central Error Handler

```javascript
function errorHandler(err, req, res, next) {
  const errorId = `err_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  const payload = {
    error: {
      id: errorId,
      code: code,
      message: statusCode >= 500
        ? "An internal error occurred. Please try again."
        : err.message,
      details: err.details || [],
      timestamp: new Date().toISOString(),
      path: req.path,
      retryable: err.retryable || false,
      documentation_url: `https://docs.example.com/errors/${code}`,
    },
  };

  if (statusCode >= 500) {
    logger.error({
      errorId,
      code,
      message: err.message,
      stack: err.stack,
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn({
      errorId,
      code,
      message: err.message,
      requestId: req.id,
      path: req.path,
    });
  }

  res.status(statusCode).json(payload);
}

class ApiError extends Error {
  constructor(code, message, statusCode, options = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details || [];
    this.retryable = options.retryable || false;
  }
}

// Usage in route handlers
app.post("/v1/users", (req, res, next) => {
  if (!req.body.email || !req.body.email.includes("@")) {
    return next(new ApiError("INVALID_PARAMETER", "The 'email' field must be a valid email address.", 400, {
      details: [{ field: "email", issue: "invalid_format", value: req.body.email }],
    }));
  }
  res.status(201).json({ id: 1, email: req.body.email });
});

app.use(errorHandler);
```

### Python Flask Error Handler

```python
import uuid
import logging
from flask import Flask, request, jsonify, g

logger = logging.getLogger(__name__)

class ApiError(Exception):
    def __init__(self, code, message, status_code, details=None, retryable=False):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        self.retryable = retryable
        super().__init__(message)

@app.errorhandler(ApiError)
def handle_api_error(e):
    error_id = f"err_{uuid.uuid4().hex[:12]}"
    payload = {
        "error": {
            "id": error_id,
            "code": e.code,
            "message": e.message,
            "details": e.details,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "path": request.path,
            "retryable": e.retryable,
            "documentation_url": f"https://docs.example.com/errors/{e.code}",
        }
    }

    if e.status_code >= 500:
        logger.error(
            "API error",
            extra={
                "errorId": error_id,
                "code": e.code,
                "requestId": getattr(g, "request_id", None),
                "userId": getattr(g, "user_id", None),
            },
        )

    return jsonify(payload), e.status_code
```

## Structured Logging for Errors

Use structured JSON logging so errors are searchable and correlated across services:

```json
{
  "timestamp": "2026-06-26T10:00:00.123Z",
  "level": "error",
  "errorId": "err_7f8a9b2c",
  "requestId": "req_abc123",
  "userId": "usr_xyz789",
  "code": "INTERNAL_ERROR",
  "message": "Database connection timeout",
  "stack": "Error: Database connection timeout\n    at ...",
  "path": "/v1/orders",
  "method": "POST",
  "duration_ms": 5023,
  "service": "order-service",
  "version": "2.1.0"
}
```

## RFC 9457 Problem Details Format

For REST APIs that want to follow an IETF standard, use RFC 9457 (formerly RFC 7807):

```json
{
  "type": "https://docs.example.com/errors/INVALID_PARAMETER",
  "title": "Invalid Parameter",
  "status": 400,
  "detail": "The 'email' field must be a valid email address.",
  "instance": "/v1/users",
  "traceId": "err_7f8a9b2c",
  "errors": [
    {
      "field": "email",
      "issue": "invalid_format",
      "value": "not-an-email"
    }
  ]
}
```

Set the `Content-Type` header to `application/problem+json` for RFC 9457 responses.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public API | Full format with docs URLs | Consumers need self-service debugging |
| Internal API | Lightweight format | Smaller payload, simpler consumers |
| Microservices | Include request ID for tracing | Essential for distributed debugging |
| gRPC | Use status codes with details proto | gRPC has its own error model |

## What Works

1. **Never return stack traces or SQL in error responses** — log them internally
2. **Use a central error registry** to prevent teams from inventing new codes
3. **Always include a request ID** for cross-service tracing
4. **Document every error code** in a public error reference page
5. **Return 404 for missing resources** without distinguishing "exists but forbidden"
6. **Use a custom error class** in your codebase to standardize error creation
7. **Log 4xx at warn level, 5xx at error level** — different severity for different audiences

## Common Mistakes

1. **Returning 200 OK for errors** — breaks client error detection
2. **Inconsistent field names** (`error_message` vs `message` vs `detail`)
3. **Not distinguishing retryable vs non-retryable errors**
4. **Exposing internal implementation details** in error messages
5. **Using 500 for validation errors** — 500 means server bug, not user error
6. **Different error formats per endpoint** — each team invents their own structure
7. **Not logging 4xx errors** — client errors reveal API misuse patterns worth tracking
8. **Returning the error ID only in logs** — consumers need it in the response to reference it

## Frequently Asked Questions

### Should GraphQL APIs return HTTP 200 for all requests?

Yes for transport errors, but application errors should be in the `errors` array. HTTP 400 is acceptable for malformed GraphQL syntax. HTTP 401/403 are acceptable for auth failures.

### How do I handle validation errors with multiple fields?

Include a `details` array with one entry per field error. Each entry contains the field name, the issue type, and the invalid value.

### What if a consumer sends an invalid API version?

Return `400 Bad Request` with code `UNSUPPORTED_API_VERSION` and a message pointing to the supported versions. Do not return 404 — the endpoint exists, the version does not.

### Should I use RFC 9457 Problem Details or a custom format?

RFC 9457 gives you a standardized format with `Content-Type: application/problem+json` that some client libraries understand automatically. A custom format gives you more flexibility (e.g., `retryable` field, `documentation_url`). If you do not need the flexibility, use RFC 9457 for interoperability.

### How do I handle errors in async/background jobs?

For background jobs, log the error with the same structured format and notify the job owner. If the job has a webhook callback, send an error event to the callback URL with the same error payload structure.

### Should I localize error messages?

Return machine-readable codes always. For the human-readable `message` field, use the consumer's `Accept-Language` header to return localized text. Keep the code in English so it is searchable regardless of locale.

### How do I version error codes?

Error codes should be stable across API versions. If you need to change the meaning of a code, create a new code instead. Deprecate old codes with a sunset date and document the replacement in your error reference.

### What HTTP status should I use for rate limiting vs quota exceeded?

Use `429 Too Many Requests` for rate limiting (temporary, retry after delay). Use `402 Payment Required` or `403 Forbidden` with code `QUOTA_EXCEEDED` for quota exhaustion (requires plan upgrade, not just waiting).
