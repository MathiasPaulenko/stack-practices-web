---
contentType: recipes
slug: rest-api-design
title: "REST API Design Best Practices"
description: "Design robust, scalable REST APIs with proper HTTP methods, status codes, versioning, and pagination strategies."
metaDescription: "REST API design best practices: HTTP methods, status codes, versioning, pagination, HATEOAS, and resource naming conventions for scalable backends."
difficulty: intermediate
topics:
  - api
tags:
  - rest-api
  - api-design
  - http
  - backend
relatedResources:
  - /docs/api-error-response-template
  - /guides/rest-api-design-guide
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/idempotent-api-endpoints
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "REST API design best practices: HTTP methods, status codes, versioning, pagination, HATEOAS, and resource naming conventions for scalable backends."
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
- Choosing between REST, GraphQL, or gRPC for a new service

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

## Explanation

REST leverages HTTP as an application protocol, not just a transport:

- **Idempotency**: GET, PUT, DELETE should be safe to retry. POST is not idempotent.
- **Statelessness**: Each request contains all information needed; no server-side session.
- **Cacheability**: Use Cache-Control, ETag, and Last-Modified headers aggressively.
- **HATEOAS**: Include links to related resources (optional but improves discoverability).

## Variants

| Style | Use Case | Notes |
|-------|----------|-------|
| REST | CRUD, resource-oriented | Mature ecosystem; HTTP caching |
| GraphQL | Flexible queries; mobile | Single endpoint; client-driven |
| gRPC | Internal microservices | Binary; streaming; schema-first |
| JSON-RPC | Simple RPC | Lightweight; less HTTP-native |

## Best Practices

- **Use plural nouns**: /orders, not /order or /getOrder
- **Version in URL**: /v1/users (more explicit than headers)
- **Return consistent envelope**: { data, error, meta } structure
- **Support filtering**: GET /users?role=admin&active=true
- **Rate limit early**: Return 429 with Retry-After header

## Common Mistakes

1. **Using verbs in URLs**: /createUser, /getOrders — use nouns and HTTP methods instead
2. **Ignoring HTTP status codes**: Returning 200 with an error body breaks middleware
3. **Not versioning**: Breaking changes without versioning strand existing clients
4. **Over-fetching**: Returning huge nested objects when clients need a subset
5. **Missing content negotiation**: Not respecting Accept and Content-Type headers

## Frequently Asked Questions

**Q: Should I use PUT or PATCH for updates?**
A: PUT for full replacement (all fields required). PATCH for partial updates (only changed fields).

**Q: How do I handle file uploads in REST?**
A: Use multipart/form-data for simple uploads. For large files, use signed URLs (S3, GCS) or resumable uploads.

**Q: Is HATEOAS worth implementing?**
A: For public APIs consumed by diverse clients, yes. For internal APIs with generated clients, optional.
