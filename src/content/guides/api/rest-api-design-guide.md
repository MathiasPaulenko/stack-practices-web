---
contentType: guides
slug: rest-api-design-guide
title: "REST API Design Guide"
description: "A thorough guide to designing clean, scalable, and maintainable REST APIs."
metaDescription: "Learn REST API design best practices: URL structure, HTTP methods, status codes, versioning, pagination, and error handling."
difficulty: intermediate
topics:
  - api
  - architecture
tags:
  - api
  - architecture
  - best-practices
  - http
  - rest
relatedResources:
  - /recipes/api/call-rest-api
  - /recipes/api/handle-errors
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn REST API design best practices: URL structure, HTTP methods, status codes, versioning, pagination, and error handling."
  keywords:
    - rest api design
    - api best practices
    - restful architecture
    - http methods
    - api versioning
    - api pagination
---

# REST API Design Guide

## Overview

REST (Representational State Transfer) is the dominant architectural style for designing networked applications. A well-designed REST API is predictable, self-descriptive, and easy to consume across multiple clients.

The following guide covers the foundational principles and practical decisions that separate amateur APIs from production-grade ones.

## When to Use

This guide applies when:
- Building public or internal HTTP APIs
- Designing [microservice communication](/guides/architecture/microservices-architecture-guide) boundaries
- Creating backend services consumed by web, mobile, or CLI clients
- Migrating from RPC or SOAP to REST

## Core Principles

### 1. Resources and URLs

A REST API is organized around **resources** — nouns, not actions:

| Good (Resource) | Bad (Action) |
|-----------------|--------------|
| `GET /users` | `GET /getUsers` |
| `POST /orders` | `POST /createOrder` |
| `DELETE /posts/42` | `DELETE /deletePost?id=42` |

Use plural nouns for collections and singular for specific instances:

```
GET    /users          # List all users
GET    /users/123      # Get user 123
POST   /users          # Create a new user
PUT    /users/123      # Replace user 123
PATCH  /users/123      # Partially update user 123
DELETE /users/123      # Remove user 123
```

### 2. HTTP Methods

| Method | Purpose | Idempotent |
|--------|---------|------------|
| `GET` | Retrieve a resource | Yes |
| `POST` | Create a resource | No |
| `PUT` | Replace a resource | Yes |
| `PATCH` | Partially update | Yes (usually) |
| `DELETE` | Remove a resource | Yes |

### 3. Status Codes

Use the correct HTTP status code to communicate intent:

| Code | Meaning | When to Use |
|------|---------|-------------|
| `200 OK` | Success | Standard response for successful requests |
| `201 Created` | Resource created | After a successful `POST` |
| `204 No Content` | Empty success | After a successful `DELETE` |
| `400 Bad Request` | Client error | Invalid input, validation failure |
| `401 Unauthorized` | Not authenticated | Missing or invalid credentials |
| `403 Forbidden` | No permission | Authenticated but not authorized |
| `404 Not Found` | Missing resource | URL or ID does not exist |
| `409 Conflict` | State conflict | Duplicate email, concurrent edit |
| `422 Unprocessable` | Semantic error | Valid JSON but invalid business logic |
| `500 Internal Error` | Server error | Unexpected failure, log and report |

## Advanced Patterns

### Versioning

Always version your API from day one:

```
/api/v1/users
/api/v2/users
```

Prefer URL versioning over headers for simplicity. Document the deprecation and sunset policy.

### Pagination

For collection endpoints, never return unbounded lists:

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "per_page": 20,
    "total": 145,
    "total_pages": 8
  }
}
```

Use cursor-based pagination for high-churn data, offset-based for stable datasets.

### Filtering, Sorting, and Search

```
GET /users?role=admin&sort=-created_at
GET /products?search=laptop&category=electronics
```

Use query parameters consistently. Document supported filters in your API docs.

### Error Responses

Return a consistent error envelope:

```json
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "The email format is invalid.",
    "field": "email",
    "documentation_url": "https://docs.example.com/errors/INVALID_EMAIL"
  }
}
```

## What works

- **Use JSON** as the default content type (`application/json`)
- **Return consistent envelopes** — wrap responses in a predictable structure
- **Support `Content-Type` and `Accept` headers** properly
- **Implement [rate limiting](/recipes/api/rate-limiting)** — protect your infrastructure and users
- **Use HTTPS everywhere** — never expose APIs over plain HTTP. See [security best practices](/guides/security/security-best-practices-guide).
- **Document with OpenAPI** — generate specs and interactive docs
- **Version from v1** — retroactive versioning is painful
- **Return `Location` headers** on `201 Created` responses

## Common Mistakes

- **Using verbs in URLs** — `/createUser` breaks REST semantics
- **Returning `200 OK` for errors** — confuses clients and breaks [retry logic](/recipes/architecture/retry-backoff)
- **No pagination** — endpoints that crash under real data load. See [pagination strategies](/recipes/api/cursor-pagination-postgresql).
- **Exposing internal IDs** — use UUIDs or slug-based identifiers
- **Inconsistent naming** — mixing `camelCase` and `snake_case` in JSON
- **Missing `Content-Type` handling** — clients receive HTML error pages instead of JSON
- **No rate limiting** — invites abuse and accidental DDoS
- **Tight coupling to database schema** — leak implementation details

## Frequently Asked Questions

**Q: Should I use PUT or PATCH for updates?**
A: Use `PUT` for full replacements (client sends the complete resource) and `PATCH` for partial updates. If you only support one, document it clearly.

**Q: How do I handle file uploads in a REST API?**
A: Use `multipart/form-data` for simple uploads. For large files, use presigned URLs (S3-style) or chunked upload endpoints.

**Q: What is HATEOAS and do I need it?**
A: HATEOAS (Hypermedia as the Engine of Application State) includes links in responses. It is nice-to-have for public APIs but overkill for internal services.

**Q: How do I authenticate a REST API?**
A: For server-to-server, use [API keys](/recipes/security/api-security-headers) or OAuth 2.0 client credentials. For user-facing apps, use [OAuth 2.0 with PKCE](/recipes/security/oauth2-pkce-spa) or session-based auth with [CSRF protection](/recipes/security/csrf-protection).

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
