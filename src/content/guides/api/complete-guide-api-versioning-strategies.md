---
contentType: guides
slug: complete-guide-api-versioning-strategies
title: "Complete Guide to API Versioning Strategies"
description: "Version REST and GraphQL APIs with URI, header, query param, and content negotiation strategies. Covers deprecation, sunset, and migration patterns."
metaDescription: "Complete guide to API versioning. Compare URI, header, query param, content negotiation, and GraphQL schema evolution for REST and GraphQL APIs."
difficulty: intermediate
topics:
  - api
  - architecture
tags:
  - api-versioning
  - rest
  - graphql
  - versioning
  - deprecation
  - backward-compatibility
  - guide
  - api-design
relatedResources:
  - /guides/api/rest-api-design-guide
  - /guides/architecture/graphql-vs-rest-guide
  - /patterns/architecture/api-gateway-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to API versioning. Compare URI, header, query param, content negotiation, and GraphQL schema evolution for REST and GraphQL APIs."
  keywords:
    - api versioning strategies
    - rest api versioning
    - graphql versioning
    - uri versioning
    - header versioning
    - content negotiation
    - api deprecation
    - backward compatibility
---

# Complete Guide to API Versioning Strategies

## Introduction

API versioning lets you evolve an API without breaking existing clients. The right strategy depends on your API type (REST vs GraphQL), client base (internal vs public), and release cadence. This guide covers the four main REST versioning approaches, GraphQL schema evolution, deprecation workflows, and migration patterns.

## Why Version APIs?

- **Backward compatibility**: Existing clients keep working when you add or change fields
- **Controlled breaking changes**: Introduce v2 while v1 still runs
- **Clear deprecation timeline**: Clients know when to migrate
- **Safe experimentation**: Test new behavior on a new version without affecting v1

## REST API Versioning Strategies

### 1. URI Path Versioning

```python
from fastapi import FastAPI, APIRouter

app = FastAPI()

v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")

@v1_router.get("/users/{user_id}")
async def get_user_v1(user_id: str):
    return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

@v2_router.get("/users/{user_id}")
async def get_user_v2(user_id: str):
    return {"id": user_id, "name": "Alice", "email": "alice@example.com", "created_at": "2024-01-01"}

app.include_router(v1_router)
app.include_router(v2_router)
```

**Pros**: Simple, explicit, cacheable, visible in logs
**Cons**: URI pollution, breaks REST purity (version is not a resource)

### 2. Query Parameter Versioning

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    version = request.query_params.get("version", "1")

    if version == "1":
        return {"id": user_id, "name": "Alice"}
    elif version == "2":
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}
    else:
        return {"error": "Unsupported version"}, 400
```

**Pros**: Clean URIs, easy to default to latest
**Cons**: Easy to forget, not visible in logs, caching issues

### 3. Header Versioning

```python
from fastapi import FastAPI, Header, HTTPException

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(
    user_id: str,
    x_api_version: str = Header(default="1", alias="X-API-Version"),
):
    if x_api_version == "1":
        return {"id": user_id, "name": "Alice"}
    elif x_api_version == "2":
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}
    raise HTTPException(status_code=400, detail="Unsupported version")
```

**Pros**: Clean URIs, RESTful, version is metadata not resource
**Cons**: Not visible in logs, harder to test in browser, not cacheable by default

### 4. Content Negotiation (Accept Header)

```python
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    accept = request.headers.get("accept", "")

    if "application/vnd.example.v1+json" in accept:
        return {"id": user_id, "name": "Alice"}
    elif "application/vnd.example.v2+json" in accept:
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

    raise HTTPException(status_code=406, detail="Unsupported media type")
```

**Pros**: RESTful, follows HTTP spec, clean URIs
**Cons**: Complex to implement, hard to test in browser, not intuitive for API consumers

## Comparison

| Strategy | Visibility | Caching | RESTful | Complexity | Best For |
|----------|-----------|---------|---------|------------|----------|
| URI Path | High | Easy | No | Low | Public APIs, most common |
| Query Param | Medium | Harder | Yes | Low | Internal APIs, default-to-latest |
| Header | Low | Hard | Yes | Medium | Internal APIs, fine-grained |
| Content Negotiation | Low | Hard | Yes | High | Strict REST, media-type driven |

## GraphQL Schema Evolution

GraphQL does not use URL versioning. Instead, evolve the schema with backward-compatible changes.

### Additive changes (no version needed)

```graphql
type User {
  id: ID!
  name: String!
  email: String!      # New field — old clients ignore it
  createdAt: String   # New field — nullable for backward compat
}
```

### Deprecating fields

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  username: String @deprecated(reason: "Use email instead")
}
```

### Breaking changes (new schema or directive)

```javascript
const { buildSchema } = require("graphql");

// Option 1: Run two schemas on different endpoints
const v1Schema = buildSchema(`
  type User { id: ID!, name: String! }
`);
const v2Schema = buildSchema(`
  type User { id: ID!, name: String!, email: String! }
`);

// Option 2: Use @specifiedBy or custom directives for feature flags
const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
    email: String
  }
`);
```

### GraphQL versioning best practices

- **Add fields, never remove** — old clients keep working
- **Deprecate before removing** — use `@deprecated` directive
- **Make new fields nullable** — old data may not have the field
- **Use schema stitching/federation** for major versions — route queries to v1 or v2 subgraph
- **Track field usage** — remove deprecated fields only when usage drops to zero

## Deprecation and Sunset

### Deprecation headers

```python
from fastapi import FastAPI, Response

app = FastAPI()

@app.get("/api/v1/users/{user_id}")
async def get_user_v1(user_id: str, response: Response):
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Sun, 01 Jun 2025 00:00:00 GMT"
    response.headers["Link"] = '</api/v2/users/{user_id}>; rel="successor-version"'
    return {"id": user_id, "name": "Alice"}
```

### Deprecation timeline

1. **Announce**: Add `Deprecation: true` header, update docs
2. **Notify**: Send email to API consumers, log deprecation warnings
3. **Sunset**: Add `Sunset` header with removal date (minimum 6 months)
4. **Monitor**: Track usage of deprecated endpoint
5. **Remove**: Delete endpoint after sunset date, return 410 Gone

## Migration Patterns

### Strangler Fig pattern

```python
from fastapi import FastAPI, Request
import httpx

app = FastAPI()

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def router(path: str, request: Request):
    # New endpoints handled by v2
    if path.startswith("v2/"):
        return await handle_v2(request)

    # Old endpoints — check if migrated
    migrated = ["users", "orders"]  # endpoints that moved to v2
    base_path = path.split("/", 1)[0] if "/" in path else path

    if base_path in migrated:
        # Proxy to v2 with response transformation
        return await proxy_to_v2(request)

    # Not migrated — serve from v1
    return await handle_v1(request)
```

### Parallel run (shadow deployment)

```python
import asyncio
import logging

logger = logging.getLogger("api_migration")

async def parallel_run(v1_handler, v2_handler, request):
    # Serve from v1 (source of truth)
    v1_response = await v1_handler(request)

    # Run v2 in background, compare results
    try:
        v2_response = await v2_handler(request)
        if v1_response != v2_response:
            logger.warning(f"Response mismatch: v1={v1_response}, v2={v2_response}")
    except Exception as e:
        logger.error(f"v2 handler failed: {e}")

    return v1_response
```

## Best Practices

- **Start with URI path versioning for public APIs** — most intuitive for consumers
- **Version at the router level** — not per endpoint, to keep versions consistent
- **Keep old versions running** — at least 6 months after deprecation announcement
- **Use semantic versioning for SDKs** — major.minor.patch, breaking changes bump major
- **Document changes between versions** — changelogs are mandatory for public APIs
- **Monitor version usage** — track which versions are actively used before removing
- **Make backward-compatible changes when possible** — additive fields, new endpoints
- **Use feature flags for gradual rollout** — test new behavior with a subset of traffic
- **Provide migration guides** — step-by-step instructions for v1 to v2 transition
- **Set rate limits lower on old versions** — incentivize migration

## Common Mistakes

- Not versioning from day one — retrofitting versioning is painful
- Breaking changes without a new version — clients break silently
- Removing old versions too quickly — clients need time to migrate
- No deprecation headers — clients discover removal only when it breaks
- Versioning every minor change — reserve new versions for breaking changes
- Not documenting differences between versions — consumers guess what changed
- Using multiple versioning strategies simultaneously — pick one and be consistent
- Not testing old versions after deploying new ones — regressions in v1 go unnoticed

## Frequently Asked Questions

### When should I create a new API version?

Create a new version when you make breaking changes: removing fields, changing field types, changing response structure, changing error codes, or altering authentication. Additive changes (new fields, new endpoints) do not require a new version.

### Should I version GraphQL APIs?

No, GraphQL is designed for schema evolution. Add fields, deprecate old ones with `@deprecated`, and make new fields nullable. Only create a new schema for truly incompatible changes, and even then, consider running two schemas in parallel.

### How long should I support old API versions?

At minimum 6 months for internal APIs and 12-24 months for public APIs. Use the `Sunset` header to communicate the removal date. Monitor usage — do not remove a version while it has significant traffic.
