---
contentType: docs
slug: api-documentation
templateType: api-doc
title: "API Documentation Template"
description: "A reusable template for documenting REST and GraphQL APIs with endpoints, schemas, errors, and examples."
metaDescription: "Use this API documentation template to document endpoints, request/response schemas, error codes, and authentication for REST and GraphQL APIs."
difficulty: beginner
topics:
  - api
tags:
  - api
  - documentation
  - template
  - rest
  - openapi
  - swagger
relatedResources:
  - /guides/api/rest-api-design-guide
  - /recipes/api/call-rest-api
  - /recipes/api/handle-errors
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Use this API documentation template to document endpoints, request/response schemas, error codes, and authentication for REST and GraphQL APIs."
  keywords:
    - api documentation
    - rest api docs
    - openapi template
    - swagger template
    - endpoint documentation
---

## Template Structure

Use this template as the foundation for documenting any HTTP API. Replace bracketed sections with your API-specific content.

---

## 1. Overview

### Base URL

```
https://api.example.com/v1
```

### Authentication

All endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your_api_key>
```

### Content-Type

Requests and responses use `application/json` unless specified otherwise.

### Rate Limits

- 100 requests per minute for authenticated users
- 10 requests per minute for anonymous users
- Rate limit headers included in all responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## 2. Endpoints

### [Resource Name]

#### `GET /[resource]`

List all [resources] with optional filtering and pagination.

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `sort` | string | No | Sort field and direction (`created_at:desc`) |
| `filter[field]` | string | No | Filter by field value |

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "string",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

#### `POST /[resource]`

Create a new [resource].

**Request Body**

```json
{
  "name": "string (required, max 255 chars)",
  "description": "string (optional, max 1000 chars)"
}
```

**Response `201 Created`**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### `GET /[resource]/{id}`

Retrieve a single [resource] by ID.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique resource identifier |

**Response `200 OK`**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

#### `PATCH /[resource]/{id}`

Partially update a [resource]. Only provided fields are modified.

**Request Body**

```json
{
  "name": "string (optional)",
  "description": "string (optional)"
}
```

**Response `200 OK`**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

#### `DELETE /[resource]/{id}`

Delete a [resource] by ID.

**Response `204 No Content`**

---

## 3. Error Responses

All errors follow this structure:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Human-readable description",
    "details": [
      {
        "field": "name",
        "issue": "is required"
      }
    ]
  }
}
```

### Common HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `bad_request` | Malformed request or validation error |
| 401 | `unauthorized` | Missing or invalid authentication |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `not_found` | Resource does not exist |
| 409 | `conflict` | Resource conflict (e.g., duplicate unique field) |
| 422 | `unprocessable_entity` | Semantic validation error |
| 429 | `rate_limited` | Too many requests |
| 500 | `internal_error` | Server-side error |

---

## 4. SDKs & Tools

- **cURL**: All examples use standard cURL commands
- **Postman**: Import our [OpenAPI spec](https://api.example.com/openapi.json)
- **OpenAPI**: Auto-generated spec available at `/openapi.json`

---

## 5. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial release |

---

## Customization Guide

1. Replace `[resource]` with your actual domain entity (e.g., `users`, `orders`, `products`)
2. Add endpoint-specific query parameters and response fields
3. Include authentication examples for OAuth, API keys, or JWT
4. Add code examples in Python, JavaScript, and Java
5. Link to your OpenAPI/Swagger spec for interactive documentation

## Frequently Asked Questions

### Should I document every endpoint or only public ones?

Document every endpoint that is consumed by clients, including internal microservices. Internal-only endpoints can have lighter documentation, but they should still be discoverable and understandable by other teams.

### What is the difference between API documentation and an OpenAPI spec?

API documentation is the human-readable guide with explanations, examples, and context. An OpenAPI spec is the machine-readable contract that powers interactive docs, client generation, and contract testing. Maintain both.

### How do I keep API docs in sync with code?

Generate documentation from code annotations or OpenAPI specs as part of your CI pipeline. Use tools like Swagger UI, Redoc, or Stoplight to render specs automatically. Manual docs drift quickly without automation.
