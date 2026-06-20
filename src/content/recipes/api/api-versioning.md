---
contentType: recipes
slug: api-versioning
title: "API Versioning"
description: "How to version REST and GraphQL APIs to maintain backward compatibility while evolving your interface."
metaDescription: "Learn API versioning strategies for REST and GraphQL in Python, JavaScript, and Java. Covers URL, header, and media-type versioning with migration patterns."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - versioning
  - rest
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/input-validation
  - /recipes/logging
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn API versioning strategies for REST and GraphQL in Python, JavaScript, and Java. Covers URL, header, and media-type versioning with migration patterns."
  keywords:
    - api
    - versioning
    - rest
    - graphql
    - backward-compatibility
    - python
    - javascript
    - java
---
## Overview

APIs evolve: fields are added, response shapes change, and endpoints are [deprecated](/docs/templates/api-deprecation-notice-template). Without a versioning strategy, these changes break existing clients. This recipe covers the three dominant versioning approaches — URL path, custom header, and content negotiation (media type) — with middleware implementation in Python, JavaScript, and Java. It also covers deprecation policies and backward-compatible change patterns.

## When to Use

Use this resource when:
- Publishing a public API consumed by external clients you cannot update simultaneously
- Introducing [breaking changes](/recipes/api/handle-errors) (removed fields, renamed resources, new auth requirements)
- Supporting multiple client generations (mobile apps, third-party integrations, embedded widgets)
- Planning a long-term migration from a legacy API shape to a modern design. See [Call REST API](/recipes/api/call-rest-api) for client patterns.

## Solution

### Python (Flask + URL Path Versioning)

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

# Versioned blueprint registration
from v1 import users as users_v1
from v2 import users as users_v2

app.register_blueprint(users_v1.bp, url_prefix="/api/v1/users")
app.register_blueprint(users_v2.bp, url_prefix="/api/v2/users")

# Header-based alternative
@app.before_request
def version_from_header():
    version = request.headers.get("X-API-Version", "v1")
    request.api_version = version

@app.route("/api/users/<int:id>")
def get_user(id):
    if request.api_version == "v2":
        return jsonify({"id": id, "full_name": "Alice", "email": "alice@example.com"})
    return jsonify({"id": id, "name": "Alice"})

# Content negotiation (Accept header)
@app.route("/api/users")
def list_users():
    accept = request.headers.get("Accept", "")
    if "application/vnd.myapp.v2+json" in accept:
        return jsonify({"users": [{"full_name": "Alice"}]})
    return jsonify({"users": [{"name": "Alice"}]})
```

### JavaScript (Express + URL Path Versioning)

```javascript
import express from "express";

const app = express();

// Route-level versioning
app.use("/api/v1/users", (await import("./routes/v1/users.js")).default);
app.use("/api/v2/users", (await import("./routes/v2/users.js")).default);

// Middleware-based header versioning
function apiVersion(req, res, next) {
  req.apiVersion = req.headers["x-api-version"] || "v1";
  next();
}

app.get("/api/users/:id", apiVersion, (req, res) => {
  if (req.apiVersion === "v2") {
    return res.json({ id: req.params.id, full_name: "Alice", email: "alice@example.com" });
  }
  res.json({ id: req.params.id, name: "Alice" });
});

// Content negotiation
app.get("/api/users", (req, res) => {
  const accept = req.get("Accept") || "";
  if (accept.includes("application/vnd.myapp.v2+json")) {
    return res.json({ users: [{ full_name: "Alice" }] });
  }
  res.json({ users: [{ name: "Alice" }] });
});
```

### Java (Spring Boot + URL Path & Header)

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;

@RestController
public class UserController {

  // URL path versioning
  @GetMapping("/api/v1/users/{id}")
  public UserV1 getUserV1(@PathVariable Long id) {
    return new UserV1(id, "Alice");
  }

  @GetMapping("/api/v2/users/{id}")
  public UserV2 getUserV2(@PathVariable Long id) {
    return new UserV2(id, "Alice", "alice@example.com");
  }

  // Header versioning
  @GetMapping(value = "/api/users/{id}", headers = "X-API-Version=v1")
  public UserV1 getUserHeaderV1(@PathVariable Long id) {
    return getUserV1(id);
  }

  @GetMapping(value = "/api/users/{id}", headers = "X-API-Version=v2")
  public UserV2 getUserHeaderV2(@PathVariable Long id) {
    return getUserV2(id);
  }

  // Content negotiation (produces)
  @GetMapping(value = "/api/users/{id}", produces = "application/vnd.myapp.v2+json")
  public UserV2 getUserMediaV2(@PathVariable Long id) {
    return getUserV2(id);
  }
}

record UserV1(Long id, String name) {}
record UserV2(Long id, String fullName, String email) {}
```

## Explanation

- **URL path versioning** (`/v1/`, `/v2/`) is the simplest and most cache-friendly. It is visible, easy to document, and works with every HTTP client. The trade-off is that it pollutes the URL and forces clients to change URLs for every breaking update.
- **Header versioning** (`X-API-Version: v2`) keeps URLs clean but requires custom headers, which some clients (browsers, simple scripts) may not support well. It is harder to cache at the CDN level without custom rules.
- **Content negotiation** (`Accept: application/vnd.myapp.v2+json`) is the most RESTful approach. It uses standard HTTP mechanisms but is complex for consumers and can be confusing with standard `application/json` expectations.
- **Backward compatibility** means additive-only changes within a version: new optional fields, new endpoints, and expanded enums are safe. Removing or renaming fields requires a new version.
- **Deprecation** should be signaled with `Sunset` headers and changelog documentation, giving clients a clear migration window. See [API Deprecation Notice Template](/docs/templates/api-deprecation-notice-template) for deprecation communication.

## Variants

| Strategy | Mechanism | Best For |
|----------|-----------|----------|
| URL Path | `/api/v1/resource` | Public APIs, simple caching, broad client support |
| Custom Header | `X-API-Version: v2` | Internal APIs, clean URLs, CDN-aware routing |
| Media Type | `Accept: application/vnd.app.v2+json` | Strict RESTful design, content-driven APIs |
| Query Parameter | `?version=v2` | Quick prototyping, simplest client implementation |

## Best Practices

1. **Start with URL path versioning** — it is the most discoverable and requires no special client logic.
2. **Never break existing versions** — once a version is published, maintain it until a published sunset date.
3. **Document changes explicitly** — publish a changelog with migration guides and diff examples for each version bump.
4. **Version only on breaking changes** — additive changes (new optional fields) do not require a new version.
5. **Communicate deprecation proactively** — use `Sunset` headers, email notices, and response headers (`Deprecation: true`) well before removal.

## Common Mistakes

1. Bumping the version for every minor change, fragmenting the client ecosystem. See [Input Validation](/recipes/api/input-validation) for safe additive changes.
2. Removing old versions without a sunset period, breaking production integrations overnight.
3. Mixing versioning strategies inconsistently across endpoints in the same API.
4. Not validating version identifiers, causing `v1.0` and `v1` to be treated as different versions accidentally.
5. Returning different status codes or error shapes across versions without documenting them.

## Frequently Asked Questions

### When should I release a new API version?

Only for breaking changes: removed fields, renamed resources, changed auth requirements, or altered behavior that existing clients depend on. [Additive changes](/recipes/api/input-validation) (new optional fields, new endpoints) do not require a version bump.

### Can I support multiple versions with the same codebase?

Yes. Use versioned controllers or route handlers that delegate to shared services. Keep version-specific logic thin (serialization and validation) and business logic version-agnostic. Spring Boot, Express, and Flask all support this pattern cleanly.

### How long should I keep an old API version alive?

For public APIs: 12-24 months with active deprecation notices. For internal APIs: 3-6 months or until all known clients migrate. Always monitor traffic to old versions and contact active users before sunset.
