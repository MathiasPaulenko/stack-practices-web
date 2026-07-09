---
contentType: recipes
slug: rest-api-design
title: "REST API Design: What Works"
description: "Design reliable, scalable REST APIs with proper HTTP methods, status codes, versioning, and pagination strategies."
metaDescription: "REST API design what works: HTTP methods, status codes, versioning, pagination, HATEOAS, and resource naming conventions for growth-ready backends."
difficulty: intermediate
topics:
  - api
tags:
  - rest-api
  - http
  - api
  - rest
  - backend
relatedResources:
  - /docs/api-error-response-template
  - /guides/rest-api-design-guide
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/idempotent-api-endpoints
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "REST API design what works: HTTP methods, status codes, versioning, pagination, HATEOAS, and resource naming conventions for growth-ready backends."
  keywords:
    - rest-api
    - api-design
    - http
    - backend
---
## Overview

REST is the dominant architectural style for designing networked APIs. A well-designed REST API uses HTTP semantics consistently, provides predictable URLs, and returns meaningful status codes. Poor API design leads to confused consumers, broken clients, and brittle integrations.

## When to Use

Use this resource when:
- Designing a new public or internal API from scratch
- Refactoring a legacy RPC-style API to REST
- Documenting an API with OpenAPI/Swagger
- Choosing between [REST](/recipes/api/call-rest-api), [GraphQL](/recipes/api/graphql-api), or [gRPC](/recipes/api/grpc-api) for a new service

## When to Avoid

- **Real-time bidirectional communication**: Use WebSockets or Server-Sent Events instead. REST is request-response only.
- **Complex client-driven queries**: GraphQL lets clients request exactly the fields they need. REST over-fetches or under-fetches.
- **High-performance internal calls**: gRPC with Protobuf is 5-10x faster than REST/JSON for internal microservices.
- **Streaming large payloads**: REST buffers entire responses. Use chunked transfer or a streaming protocol.

## Solution

### Resource Naming

```
GET    /users                # List users
GET    /users/:id            # Get a user
POST   /users                # Create a user
PUT    /users/:id            # Full update
PATCH  /users/:id            # Partial update
DELETE /users/:id            # Remove a user
GET    /users/:id/orders     # Nested resource
```

### Status Codes

```javascript
// Successful responses
200 OK              // GET, PUT, DELETE success
201 Created         // POST success
204 No Content      // DELETE success (optional)

// Client errors
400 Bad Request     // Validation failure
401 Unauthorized    // Missing auth token
403 Forbidden       // Insufficient permissions
404 Not Found       // Resource does not exist
409 Conflict        // Duplicate or state conflict
422 Unprocessable   // Semantic validation error

// Server errors
500 Internal Error  // Unexpected server failure
502 Bad Gateway     // Upstream failure
503 Service Unavail // Rate limiting or maintenance
```

### Pagination with Cursor

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "prev_cursor": null,
    "has_more": true
  }
}
```

### Error Response Format

Return errors in a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "field": "email",
    "details": [{"field": "email", "message": "Email is required"}]
  }
}
```

### Versioning Strategies

```javascript
// URL-based (most common)
GET /v1/users
GET /v2/users

// Header-based (cleaner URLs, harder to test)
Accept: application/vnd.api+json;version=1

// Query parameter (easy but not recommended)
GET /users?version=1
```

URL-based versioning is the most explicit and easiest to test. Header-based is cleaner but harder to debug in browsers.

### Idempotency Keys

For POST requests that may be retried (payments, order creation), accept an idempotency key:

```http
POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{"amount": 1000, "currency": "USD"}
```

The server stores the key and returns the original response on retry. See [Idempotent Endpoints](/recipes/api/idempotent-api-endpoints) for implementation.

### Rate Limiting Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1719900000

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Retry after 60 seconds."
  }
}
```

## Explanation

REST uses HTTP as an application protocol, not just a transport:

- **Idempotency**: GET, PUT, DELETE should be safe to retry. See [Idempotent Endpoints](/recipes/api/idempotent-api-endpoints) for patterns. POST is not idempotent.
- **Statelessness**: Each request contains all information needed; no server-side session.
- **Cacheability**: Use Cache-Control, ETag, and Last-Modified headers aggressively. See [Handle CORS](/recipes/api/handle-cors) for header configuration.
- **HATEOAS**: Include links to related resources (optional but improves discoverability).

## Variants

| Style | Use Case | Notes |
|-------|----------|-------|
| REST | CRUD, resource-oriented | Mature ecosystem; HTTP caching |
| GraphQL | Flexible queries; mobile | Single endpoint; client-driven |
| gRPC | Internal microservices | Binary; streaming; schema-first |
| JSON-RPC | Simple RPC | Lightweight; less HTTP-native |
| tRPC | TypeScript end-to-end | Type-safe; no codegen; TS only |
| SOAP | Enterprise; banking | XML; WS-Security; verbose |

## Advanced: Content Negotiation

Support multiple response formats via Accept headers:

```http
GET /users/42
Accept: application/json      # default
Accept: application/xml        # legacy clients
Accept: application/csv        # data export
```

Server selects the serializer based on Accept. Return 406 Not Acceptable if the format is unsupported.

## Advanced: Conditional Requests

Use ETag and If-None-Match for caching:

```http
# First request
GET /users/42
ETag: "abc123"

# Subsequent request
GET /users/42
If-None-Match: "abc123"

# Server returns 304 if unchanged
HTTP/1.1 304 Not Modified
```

For concurrent updates, use If-Match with ETag for optimistic locking:

```http
PUT /users/42
If-Match: "abc123"
```

If the ETag no longer matches (someone else modified the resource), return 412 Precondition Failed.

## What Works

- **Use plural nouns**: /orders, not /order or /getOrder
- **Version in URL**: /v1/users (more explicit than headers)
- **Return consistent envelope**: { data, error, meta } structure
- **Support filtering**: GET /users?role=admin&active=true
- **Rate limit early**: Return 429 with Retry-After header. See [Rate Limiting with Redis](/recipes/api/api-rate-limiting-redis) for implementation.

## Common Mistakes

1. **Using verbs in URLs**: /createUser, /getOrders — use nouns and HTTP methods instead
2. **Ignoring HTTP status codes**: Returning 200 with an error body breaks middleware. See [Error Handling](/recipes/api/handle-errors) for status code usage.
3. **Not versioning**: Breaking changes without versioning strand existing clients
4. **Over-fetching**: Returning huge nested objects when clients need a subset
5. **Missing content negotiation**: Not respecting Accept and Content-Type headers

## Frequently Asked Questions

### Should I use PUT or PATCH for updates?

PUT for full replacement (all fields required). PATCH for partial updates (only changed fields). PUT is idempotent: sending the same PUT twice produces the same state. PATCH can be idempotent but is not required to be.

### How do I handle file uploads in REST?

Use multipart/form-data for simple uploads. For large files, use signed URLs (S3, GCS) or resumable uploads. The client uploads directly to object storage, then notifies your API with the file location. This avoids streaming large files through your API server.

### Is HATEOAS worth implementing?

For public APIs consumed by diverse clients, yes — it improves discoverability and reduces hardcoding of URLs. For internal APIs with generated clients, optional. Most production APIs skip HATEOAS and document URLs in OpenAPI specs instead.

### How do I handle pagination for large datasets?

Use cursor-based pagination for large or frequently changing datasets. Offset-based pagination (page=2&limit=20) is simpler but skips items when data is inserted between requests. Encode the cursor as base64 of the last item's sort key.

### What HTTP methods should I use?

GET (read, cacheable), POST (create, not idempotent), PUT (full update, idempotent), PATCH (partial update), DELETE (remove, idempotent). Never use GET for state changes — it breaks caching and violates HTTP semantics.

### How do I version my API?

URL-based versioning (/v1/users) is the most common and easiest to test. Bump the version on breaking changes: removed fields, changed types, changed semantics. Non-breaking changes (new fields, new endpoints) do not require a version bump.

### Should I wrap responses in an envelope?

For list endpoints, yes — include pagination metadata. For single resources, wrapping is optional. If you wrap, use a consistent structure: `{ data, error, meta }`. Some APIs return data directly with error info in headers.

### How do I handle authentication in REST?

Bearer tokens in the Authorization header: `Authorization: Bearer <token>`. API keys in headers (X-API-Key) for simple cases. Avoid putting tokens in URL parameters — they appear in server logs and browser history.

### What is the difference between 401 and 403?

401 Unauthorized means the request lacks authentication credentials. 403 Forbidden means the credentials are valid but the user lacks permission for the specific resource. Always return 401 before auth, 403 after auth but lacking permissions.

### How do I handle long-running operations?

Return 202 Accepted with a status URL. The client polls the status URL until the operation completes. For webhooks, return 202 and send a POST to the client's webhook URL when done. See [Async API Pattern](/patterns/design/async-generator-pattern) for patterns.

### Should I use REST or GraphQL?

REST for resource-oriented APIs with predictable access patterns. GraphQL when clients need flexible queries (e.g., mobile apps fetching different field sets). GraphQL adds complexity: query parsing, N+1 resolution, and caching is harder.

### How do I test REST APIs?

Integration tests with a real HTTP client (supertest for Node.js, requests for Python, MockMvc for Java). Test status codes, response bodies, and error formats. For contract testing, use tools like Pact or Spring Cloud Contract.

### What is HATEOAS and should I implement it?

HATEOAS (Hypermedia As The Engine Of Application State) includes hyperlinks in API responses so clients can navigate the API dynamically. Example: a user response includes `_links` with `self`, `edit`, and `orders` URLs. It enables loose coupling between client and server but adds response size and complexity. Most production APIs skip full HATEOAS and use documented URL conventions instead.

### How do I handle API versioning?

Three common strategies: URI path (`/v1/users`), query parameter (`/users?version=1`), and header (`Accept: application/vnd.api.v1+json`). URI path is the most popular because it is explicit and easy to test. Deprecate old versions with a sunset header and migration guide.

### What status code should I use for validation errors?

Return 422 Unprocessable Entity when the request body is syntactically valid but semantically incorrect (e.g., missing required fields, invalid email format). Use 400 Bad Request for malformed JSON or missing content-type headers. Include a `details` array in the error response pointing to specific field errors.

This helps clients render inline validation messages next to each field. See [error handling](/recipes/api/error-handling-patterns) for complete examples.
