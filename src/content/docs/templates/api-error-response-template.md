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

## Template Structure

Use this template to build consistent, actionable error responses for any REST or HTTP API. See also the [API Documentation Template](/docs/templates/api-documentation) for endpoint documentation.

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

## Best Practices

- **Always return a body** — Never send an empty body for `4xx` or `5xx` responses
- **Use RFC 7807 for public APIs** — Consumers expect standard formats; libraries can parse them automatically
- **Include a request ID** — Essential for correlating client reports with server logs
- **Do not leak stack traces** — Internal details belong in logs, not in responses
- **Localize `detail` if needed** — Use `Accept-Language` to return localized messages, but keep `title` stable
- **Link to documentation** — The `type` URI should lead to a docs page explaining the error and how to fix it
- **Be specific in validation errors** — Say `"phone must match E.164 format"` instead of `"invalid input"`

## Common Mistakes

- Returning `500` with a plain HTML page — breaks API clients expecting JSON
- Including stack traces or SQL queries in error bodies — security risk
- Using generic `"error": "something went wrong"` for every failure — impossible to debug
- Changing error field names between versions — breaks client parsing logic
- Not logging the full error context server-side — you lose the ability to investigate

## Frequently Asked Questions

### Should I use RFC 7807 for internal APIs?

Yes, even for internal APIs. The small overhead of adding `type` and `title` pays off when another team needs to integrate, and it forces you to document error cases.

### What if an error has multiple causes?

Use the `errors` array with one object per cause. Each object should include `field`, `message`, and optionally `code`. This pattern is common in validation failures where multiple fields are invalid.

### How do I handle errors from downstream services?

Wrap downstream errors in your own format. Consider [Circuit Breaker](/patterns/design/circuit-breaker-pattern) and [Retry](/patterns/design/retry-pattern) patterns for resilient downstream communication. Do not proxy raw third-party error bodies directly. Map the downstream failure to one of your documented error codes, log the original upstream response, and return a sanitized message to the client.
