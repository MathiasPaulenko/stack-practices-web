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
  - http
  - backend
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/input-validation
  - /recipes/logging
  - /recipes/grpc-api
  - /recipes/grpc-services-typescript
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

APIs evolve: fields are added, response shapes change, and endpoints are [deprecated](/docs/api/api-deprecation-notice-template). Without a versioning strategy, these changes break existing clients. The following demonstrates how to the three dominant versioning approaches — URL path, custom header, and content negotiation (media type) — with middleware implementation in Python, JavaScript, and Java. It also covers deprecation policies and backward-compatible change patterns.

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
- **Deprecation** should be signaled with `Sunset` headers and changelog documentation, giving clients a clear migration window. See [API Deprecation Notice Template](/docs/api/api-deprecation-notice-template) for deprecation communication.

## Variants

| Strategy | Mechanism | Best For |
|----------|-----------|----------|
| URL Path | `/api/v1/resource` | Public APIs, simple caching, broad client support |
| Custom Header | `X-API-Version: v2` | Internal APIs, clean URLs, CDN-aware routing |
| Media Type | `Accept: application/vnd.app.v2+json` | Strict RESTful design, content-driven APIs |
| Query Parameter | `?version=v2` | Quick prototyping, simplest client implementation |

## What Works

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

## Best Practices

- **Use URL path versioning for public APIs**: `/api/v1/users` is the most intuitive and cacheable strategy. Header-based versioning is elegant but harder to debug and document. Path versioning works with all HTTP clients and proxies.
- **Make breaking changes hard**: require architectural review for any change that breaks backward compatibility. The cost of a new version (maintenance, documentation, client migration) is always higher than the cost of an additive change.
- **Document deprecation timelines in headers**: return `Deprecation` and `Sunset` HTTP headers on deprecated endpoints. This gives programmatic clients visibility into migration deadlines without reading docs.
- **Maintain a changelog per version**: track what changed between versions, when, and why. Use semantic versioning for internal APIs (v1.1.0) and major-only for public APIs (v1, v2).
- **Version your response schema, not just your routes**: even with the same URL, response payloads may evolve. Include a schema version in response metadata so clients can detect format changes.
- **Provide migration guides**: for each major version bump, publish a migration guide with side-by-side examples of old vs new behavior. This reduces support tickets during transition periods.

## Production Checklist

- [ ] Versioning strategy is consistent across all endpoints in the API
- [ ] Deprecated endpoints return `Deprecation` and `Sunset` headers
- [ ] Deprecation timeline is documented and communicated to API consumers
- [ ] Old version traffic is monitored and alerted on (notify active users before sunset)
- [ ] Version-specific documentation exists for each supported version
- [ ] Breaking changes require architectural review and sign-off
- [ ] API gateway routes are configured for all active versions
- [ ] Integration tests run against all supported versions
- [ ] Changelog is maintained per version with dates and rationale
- [ ] Migration guide is published before deprecation period begins

## Scaling Considerations

- **Code complexity with many versions**: supporting 3+ active versions increases code complexity exponentially. Each version needs its own controllers, serializers, and tests. Extract shared business logic into version-agnostic services and keep version-specific layers thin.
- **Infrastructure cost**: each active version requires its own deployment, monitoring, and documentation. At 5+ active versions, infrastructure costs can double. Enforce a maximum of 3 active versions and aggressively sunset old ones.
- **Database schema migrations**: versioned APIs may need different database schemas. Use view-based schemas or separate tables per version to avoid migration conflicts. Never break old versions by changing shared table structures.
- **CDN caching per version**: each version's responses should have distinct cache keys. Include the version in the URL path (not just headers) to ensure CDN caching works correctly. Header-based versioning requires Vary headers, which reduce cache hit rates.

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| API Gateway (per version) | $0-$50/month | AWS API Gateway, per-stage |
| Documentation hosting (per version) | $0-$20/month | Stoplight, ReadMe, SwaggerHub |
| Load testing (per version) | $0-$100/month | k6 Cloud, BlazeMeter |
| Monitoring (per version) | $50-$200/month | Datadog, New Relic per service |
| Development overhead | 2-3 engineer-weeks | Per major version migration |

Each active version adds ~$100-$400/month in infrastructure and tooling costs. The hidden cost is engineering time: maintaining 3 versions requires ~30% of API team capacity for version-specific bug fixes, tests, and documentation.

## When Not to Use This Approach

- **Single-client internal APIs**: if you control both the API and its only consumer, deploy breaking changes atomically. Versioning adds unnecessary indirection when you can update both sides in one release.
- **Prototype and MVP APIs**: early-stage APIs change rapidly. Formal versioning slows iteration. Use a `v0` prefix to signal instability and skip deprecation processes until the API stabilizes.
- **GraphQL APIs**: GraphQL has a single endpoint and evolves through schema additions, not URL versions. Use deprecation markers and field-level versioning instead of route-level versioning.

## Performance Benchmarks

| Strategy | Routing overhead | Cache hit rate | Notes |
|----------|-----------------|---------------|-------|
| URL path (`/v1/`) | 0ms | 95%+ | Best for CDN caching |
| Header (`Accept: v=2`) | 0.1ms | 60-70% | Vary header reduces cache |
| Query param (`?v=1`) | 0ms | 80-85% | Cacheable but less clean |
| Content negotiation | 0.2ms | 50-60% | RESTful but poor caching |

URL path versioning has zero routing overhead and the highest cache hit rate because CDN edge nodes cache each version independently. Header-based versioning requires `Vary: Accept` which fragments cache entries per client, reducing hit rates by 25-40%.

## Testing Strategy

- **Test version routing**: send requests to `/v1/` and `/v2/` endpoints and verify they route to the correct handler. Test that unknown versions return 404 with a helpful error message listing supported versions.
- **Test deprecation headers**: send a request to a deprecated version and verify the response includes `Deprecation`, `Sunset`, and `Link` headers. Test that the `Link` header points to the migration guide.
- **Test backward compatibility**: run the v1 test suite against v2 and verify all v1 tests pass (unless intentionally broken). Use `openapi-diff` to detect breaking changes between versions automatically in CI.
- **Test version sunset**: simulate the sunset date and verify the API returns 410 Gone with a message directing users to the new version. Test that the sunset grace period works correctly.

## Common Pitfalls

- **Versioning every minor change**: not every change needs a new version. Additive changes (new fields, new endpoints) are backward-compatible and don't require versioning. Reserve new versions for breaking changes only.
- **Keeping old versions alive too long**: maintaining 3+ versions simultaneously increases code complexity, testing burden, and infrastructure costs. Set a clear deprecation timeline (6-12 months) and enforce it with sunset headers.
- **Inconsistent versioning across endpoints**: some endpoints on v1, others on v2, creates confusion for API consumers. Version the entire API surface, not individual endpoints. Use a global version prefix (`/v2/`) not per-endpoint versioning.
- **Not communicating breaking changes**: releasing a new version without migration guides, changelogs, or deprecation notices causes client breakage. Publish migration guides with code examples and announce deprecations via email, API response headers, and status pages.

## Monitoring and Observability

- **Track traffic per version**: monitor requests/min for each API version. When v2 traffic exceeds v1, plan v1 sunset. When v1 traffic drops below 1% for 30 days, it's safe to decommission.
- **Monitor deprecation header impressions**: count how many clients receive `Deprecation` and `Sunset` headers. Track the migration rate over time to measure how quickly clients are moving to the new version.
- **Alert on 404s for unknown versions**: clients requesting non-existent versions (e.g., `/v3/`) indicate misconfigured clients or typos. Log the requested version and client ID to help them fix their integration.
- **Track response times per version**: newer versions should be faster or equal. If v2 is slower than v1, investigate whether new features add excessive overhead or if database queries need optimization.

## Deployment Checklist

- [ ] Choose versioning strategy (URL path, header, query param, content negotiation)
- [ ] Configure routing for all supported versions in the API gateway
- [ ] Set up deprecation headers (`Deprecation`, `Sunset`, `Link`) for old versions
- [ ] Publish migration guides with code examples for each version transition
- [ ] Set up `openapi-diff` in CI to detect breaking changes between versions
- [ ] Configure CDN caching per version (separate cache keys for `/v1/` and `/v2/`)
- [ ] Monitor traffic distribution across versions
- [ ] Plan sunset timeline (6-12 months deprecation, then 410 Gone)
- [ ] Document versioning policy in API documentation
- [ ] Test backward compatibility by running v1 test suite against v2

## Security Considerations

- **Version header injection**: if using header-based versioning, validate the version header to prevent injection attacks. Only accept predefined version values and reject requests with unexpected headers.
