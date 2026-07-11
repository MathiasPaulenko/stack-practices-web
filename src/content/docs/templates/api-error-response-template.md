---
contentType: docs
slug: api-error-response-template
templateType: api-error-response
title: "API Error Response Template"
description: "A reusable template for consistent, informative, and developer-friendly API error responses that reduce debugging time."
metaDescription: "Standardized API error response template with RFC 7807 Problem Details, structured fields, and best practices for developer-friendly HTTP APIs."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - error-handling
  - template
  - rest-api
  - rfc-7807
  - developer-experience
relatedResources:
  - /docs/templates/api-documentation
  - /docs/api/api-deprecation-notice-template
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Standardized API error response template with RFC 7807 Problem Details, structured fields, and best practices for developer-friendly HTTP APIs."
  keywords:
    - api error response template
    - rfc 7807 problem details
    - rest api error format
    - api error handling
    - developer friendly errors
---

## Overview

API error responses are the most important part of developer experience. When an API call fails, the error response is what the developer reads to fix their code. Good error responses reduce support tickets, speed up integration, and build trust. Bad error responses force developers to guess, file support tickets, or give up.

This template covers:

1. **RFC 7807 Problem Details** — the standard format for HTTP API errors
2. **Legacy simple format** — for internal APIs or backward compatibility
3. **Error code catalog** — mapping HTTP status codes to specific error types
4. **Field-level validation** — structured errors for `400 Bad Request` responses
5. **Best practices** — what to include, what to hide, and how to link to docs

## Template Structure

Use this template to build consistent, useful error responses for any REST or HTTP API. See also the [API Documentation Template](/docs/templates/api-documentation) for endpoint documentation.

---

## RFC 7807 Problem Details (Recommended)

```json
{
  "type": "https://api.example.com/errors/invalid-request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "The 'email' field must be a valid email address.",
  "instance": "/orders/123e4567-e89b-12d3-a456-426614174000",
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email address",
      "code": "invalid_format"
    }
  ]
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | URI that identifies the error type and human-readable documentation |
| `title` | Yes | Short, human-readable summary of the problem |
| `status` | Yes | HTTP status code (must match the actual response status) |
| `detail` | No | Detailed, human-readable explanation specific to this occurrence |
| `instance` | No | URI reference that identifies the specific occurrence of the problem |
| `errors` | No | Array of field-level validation errors for `400 Bad Request` |

---

## Legacy Simple Format

For internal APIs or backward compatibility, use this lightweight structure:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'page_size' parameter must be between 1 and 100.",
    "request_id": "req_abc123xyz"
  }
}
```

---

## Filled Examples by Status Code

### 400 Bad Request — Validation Error

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "detail": "3 fields failed validation.",
  "instance": "/users",
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email address",
      "code": "invalid_format"
    },
    {
      "field": "password",
      "message": "must be at least 12 characters",
      "code": "min_length"
    },
    {
      "field": "role",
      "message": "must be one of: admin, editor, viewer",
      "code": "invalid_enum"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "type": "https://api.example.com/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Missing or invalid Authorization header. Use Bearer token authentication.",
  "instance": "/orders/123"
}
```

### 404 Not Found

```json
{
  "type": "https://api.example.com/errors/resource-not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Order with ID '123e4567-e89b-12d3-a456-426614174000' does not exist.",
  "instance": "/orders/123e4567-e89b-12d3-a456-426614174000"
}
```

### 429 Rate Limit Exceeded

```json
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the rate limit of 200 requests per minute. Retry after 30 seconds.",
  "instance": "/reports"
}
```

Response headers for 429 should include:

```
Retry-After: 30
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1721003460
```

---

## Error Code Catalog (Example)

| HTTP Status | Error Code | When to Use |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Generic malformed request |
| 400 | `VALIDATION_ERROR` | Schema or business rule validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 403 | `FORBIDDEN` | Authenticated user lacks permission |
| 404 | `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| 409 | `CONFLICT` | Resource already exists or state conflict |
| 422 | `UNPROCESSABLE_ENTITY` | Semantic validation failed |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server-side failure |
| 503 | `SERVICE_UNAVAILABLE` | Temporary outage or maintenance |

---

## What works

- **Always return a body** — Never send an empty body for `4xx` or `5xx` responses
- **Use RFC 7807 for public APIs** — Consumers expect standard formats; libraries can parse them automatically
- **Include a request ID** — Essential for correlating client reports with server logs
- **Do not leak stack traces** — Internal details belong in logs, not in responses
- **Localize `detail` if needed** — Use `Accept-Language` to return localized messages, but keep `title` stable
- **Link to documentation** — The `type` URI should lead to a docs page explaining the error and how to fix it
- **Be specific in validation errors** — Say `"phone must match E.164 format"` instead of `"invalid input"`
- **Include retry guidance for 429** — `Retry-After` header tells clients when to back off
- **Use consistent error codes** — clients build retry logic around specific codes, not HTTP statuses

## Common Mistakes

- Returning `500` with a plain HTML page — breaks API clients expecting JSON
- Including stack traces or SQL queries in error bodies — security risk
- Using generic `"error": "something went wrong"` for every failure — impossible to debug
- Changing error field names between versions — breaks client parsing logic
- Not logging the full error context server-side — you lose the ability to investigate
- Returning `200 OK` with an error body — violates HTTP semantics and breaks middleware
- Different error formats per endpoint — clients need one consistent format


## Variant Comparison

| Variant | Context | Approach | Notes |
|---------|---------|----------|-------|
| RFC 7807 Problem Details | Public API, external clients | Structured JSON with type, title, status | IETF standard, libraries available |
| Simple legacy format | Internal API, backward compat | code + message + request_id | Minimal, sufficient for small APIs |
| GraphQL errors | GraphQL API | errors array with extensions | No HTTP status codes |
| gRPC errors | Internal microservices | Status codes 0-16 + protobuf details | Binary, high performance |

## Detailed Scenario: Handling a Downstream Error Cascade

```text
System: Orders API that calls inventory service
Flow: POST /orders -> check stock -> create order

Scenario: Inventory service times out

Step 1 - Error detection:
  - Request to inventory times out after 3s
  - Circuit breaker open (3 consecutive failures)
  - Error is not client-side, it is downstream

Step 2 - Response to client:
  HTTP/1.1 503 Service Unavailable
  Content-Type: application/problem+json
  Retry-After: 60

  {
    "type": "https://api.example.com/errors/service-unavailable",
    "title": "Service Unavailable",
    "status": 503,
    "detail": "The inventory service is temporarily unavailable. Retry in 60 seconds.",
    "instance": "/orders",
    "request_id": "req_abc123",
    "correlation_id": "corr_xyz789"
  }

Step 3 - Internal logging:
  - Full log: original request, timeout, circuit breaker state
  - Tag: downstream_timeout, service=inventory
  - Metric: inventory_timeout_count++
  - Trace span: inventory.call (status=error, duration=3001ms)

Step 4 - Client communication:
  - 503 with Retry-After indicates temporary failure
  - Client should retry with exponential backoff
  - If client receives 503 repeatedly, show maintenance message

Step 5 - Degradation (optional):
  - If circuit breaker is open, accept orders in degraded mode
  - Mark order as "pending_stock_verification"
  - Reconciliation queue when inventory recovers
```

### How do I document errors that vary by customer plan?

Use the same error code but vary the `detail` field based on context. For example, a free plan that exceeds the export limit returns 403 with `detail: "Your plan allows 100 exports/month. Upgrade for more."`. Do not create separate error codes per plan; the code identifies the problem, not the user context.

### Should I include timestamps in error responses?

Yes, add a `timestamp` field in ISO 8601 format. This helps clients correlate errors with their own logs and report issues accurately. Some teams prefer using the HTTP `Date` header, but including it in the body is more useful for clients that only log the error body.

## Variants

### GraphQL errors

GraphQL uses a different error format. Errors are returned in the `errors` array of the response, not as HTTP error status codes. Each error includes `message`, `locations`, `path`, and optional `extensions`:

```json
{
  "errors": [
    {
      "message": "Field 'email' must be a valid email address.",
      "locations": [{ "line": 3, "column": 10 }],
      "path": ["createUser", "input", "email"],
      "extensions": { "code": "INVALID_FORMAT" }
    }
  ]
}
```

### gRPC errors

gRPC uses status codes (0-16) instead of HTTP status codes. Map gRPC status codes to your error catalog. Include `details` with structured error information using protobuf messages.

### Async/webhook errors

For webhooks, return errors as event payloads. Include the original event ID, error code, and a timestamp. Provide a retry webhook endpoint for clients to replay failed deliveries.

## Frequently Asked Questions

### Should I use RFC 7807 for internal APIs?

Yes, even for internal APIs. The small overhead of adding `type` and `title` pays off when another team needs to integrate, and it forces you to document error cases.

### What if an error has multiple causes?

Use the `errors` array with one object per cause. Each object should include `field`, `message`, and optionally `code`. This pattern is common in validation failures where multiple fields are invalid.

### How do I handle errors from downstream services?

Wrap downstream errors in your own format. Consider [Circuit Breaker](/patterns/design/circuit-breaker-pattern) and [Retry](/patterns/design/retry-pattern) patterns for resilient downstream communication. Do not proxy raw third-party error bodies directly. Map the downstream failure to one of your documented error codes, log the original upstream response, and return a sanitized message to the client.

### Should I include a correlation ID in addition to request ID?

Yes. A request ID identifies the client request. A correlation ID traces the request across services. Include both: `request_id` for the client and `correlation_id` for internal tracing. This helps debug distributed systems where one client request triggers multiple service calls.

### How do I version error response formats?

Add new fields, never remove or rename existing ones. If you need breaking changes, create a new error format and use content negotiation (`Accept: application/problem+json; version=2`) to let clients opt in. Document the versioning strategy in your [API Documentation](/docs/templates/api-documentation).

### Should I return different errors for the same problem based on context?

No. The same error condition should produce the same error code and status, regardless of which endpoint triggered it. Context-specific information goes in `detail` and `instance`, not in the error code.
