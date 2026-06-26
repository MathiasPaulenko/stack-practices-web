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
  - /docs/architecture/microservice-contract-template
  - /docs/security/api-security-review-template
  - /docs/architecture/api-monitoring-alerting-template
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

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public API | Full format with docs URLs | Consumers need self-service debugging |
| Internal API | Lightweight format | Smaller payload, simpler consumers |
| Microservices | Include request ID for tracing | Essential for distributed debugging |

## Best Practices

1. **Never return stack traces or SQL in error responses** — log them internally
2. **Use a central error registry** to prevent teams from inventing new codes
3. **Always include a request ID** for cross-service tracing
4. **Document every error code** in a public error reference page
5. **Return 404 for missing resources** without distinguishing "exists but forbidden"

## Common Mistakes

1. **Returning 200 OK for errors** — breaks client error detection
2. **Inconsistent field names** (`error_message` vs `message` vs `detail`)
3. **Not distinguishing retryable vs non-retryable errors**
4. **Exposing internal implementation details** in error messages
5. **Using 500 for validation errors** — 500 means server bug, not user error

## Frequently Asked Questions

### Should GraphQL APIs return HTTP 200 for all requests?

Yes for transport errors, but application errors should be in the `errors` array. HTTP 400 is acceptable for malformed GraphQL syntax. HTTP 401/403 are acceptable for auth failures.

### How do I handle validation errors with multiple fields?

Include a `details` array with one entry per field error. Each entry contains the field name, the issue type, and the invalid value.

### What if a consumer sends an invalid API version?

Return `400 Bad Request` with code `UNSUPPORTED_API_VERSION` and a message pointing to the supported versions. Do not return 404 — the endpoint exists, the version does not.
