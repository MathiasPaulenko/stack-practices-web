---





contentType: docs
slug: api-deprecation-notice-template
title: "API Deprecation Notice Template"
description: "A template for communicating API deprecations, breaking changes, and sunset timelines to consumers."
metaDescription: "Use this API deprecation notice template to communicate breaking changes, migration timelines, and sunset dates to consumers."
difficulty: beginner
topics:
  - api
  - architecture
tags:
  - api
  - deprecation
  - migration
  - communication
  - template
relatedResources:
  - /docs/api-lifecycle-management-template
  - /docs/microservice-contract-template
  - /docs/technical-spec-template
  - /docs/rollout-communication-template
  - /docs/api-changelog-template
  - /docs/sla-definition-template
  - /docs/api-error-response-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Use this API deprecation notice template to communicate breaking changes, migration timelines, and sunset dates to consumers."
  keywords:
    - api deprecation
    - breaking changes
    - migration notice
    - sunset policy
    - api versioning





---

## Overview

APIs evolve. Fields are renamed, endpoints are replaced, and old versions are retired. Without a clear deprecation notice, consumers discover breaking changes only after their integrations fail. This template provides a standard format for announcing deprecations, communicating timelines, and guiding consumers through migrations.

## When to Use


- For alternatives, see [API Changelog Template](/docs/api-changelog-template/).

Use this resource when:
- Removing or renaming an API endpoint, field, or parameter
- Shutting down an entire API version
- Migrating consumers from a legacy service to a replacement
- Updating authentication mechanisms that break existing clients

## Solution

```markdown
# API Deprecation Notice: `<Endpoint / Field / Version>`

**API:** `api.example.com/v1/...`
**Deprecated Since:** `2026-07-01`
**Sunset Date:** `2026-10-01` (92 days notice)
**Severity:** `Breaking Change` | `Non-Breaking Deprecation`

## What is Changing

### Before
```
GET /v1/orders?customer_id=123
Response: { "order_id": "abc", "total": 100.00 }
```

### After
```
GET /v2/orders?customerId=123
Response: { "orderId": "abc", "totalAmount": 100.00 }
```

## Why This Change is Happening

- Align field naming with company-wide camelCase standard
- Consolidate v1 and v2 data models to reduce maintenance overhead
- Remove deprecated fields that expose internal identifiers

## Migration Steps

1. **Update field names:** Rename `customer_id` to `customerId`, `order_id` to `orderId`
2. **Update response parsing:** Replace `total` with `totalAmount` (same data type)
3. **Switch endpoint:** Change base path from `/v1/orders` to `/v2/orders`
4. **Test in sandbox:** Validate integration against `sandbox-api.example.com/v2`
5. **Deploy to production:** Before `2026-10-01`

## Timeline

| Milestone | Date | Action Required |
|-----------|------|-----------------|
| Notice Sent | 2026-07-01 | Review migration guide |
| Sandbox Available | 2026-07-01 | Begin testing v2 endpoints |
| v1 Marked Deprecated | 2026-07-01 | Monitor deprecation headers |
| Final Reminder | 2026-09-01 | Complete migration or request extension |
| v1 Sunset | 2026-10-01 | v1 returns 410 Gone |

## Support & Contact

- **Migration Guide:** https://docs.example.com/api-migration
- **Sandbox Environment:** https://sandbox-api.example.com
- **Support Email:** api-support@example.com
- **Office Hours:** Every Tuesday 10:00 UTC

## Exceptions

If you cannot migrate before the sunset date, contact us at api-support@example.com with:
- Your use case
- Estimated migration timeline
- Blockers preventing timely migration
```

## Explanation

The template separates **what** is changing from **why** and **how** to migrate. The timeline table creates accountability and removes ambiguity about deadlines. Including a sandbox environment and support contact reduces friction for consumers. The exceptions section acknowledges that not all consumers can migrate on the same schedule.

## Deprecation Header Implementation

The `Deprecation` and `Sunset` HTTP headers (draft IETF standard) let client code detect deprecated endpoints programmatically. Implement them in your API middleware.

### Express.js Middleware

```javascript
function deprecationMiddleware(req, res, next) {
  const deprecatedPaths = {
    "/v1/orders": { sunset: "2026-10-01", replacement: "/v2/orders" },
    "/v1/products": { sunset: "2026-10-01", replacement: "/v2/products" },
  };

  const match = Object.keys(deprecatedPaths).find((path) =>
    req.path.startsWith(path)
  );

  if (match) {
    const info = deprecatedPaths[match];
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", new Date(info.sunset).toUTCString());
    res.setHeader(
      "Link",
      `<https://docs.example.com/api-migration>; rel="deprecation"`
    );
  }

  next();
}

app.use(deprecationMiddleware);
```

### Python Flask Middleware

```python
from datetime import datetime
from flask import Flask, request, g

DEPRECATED_PATHS = {
    "/v1/orders": {"sunset": "2026-10-01", "replacement": "/v2/orders"},
    "/v1/products": {"sunset": "2026-10-01", "replacement": "/v2/products"},
}

@app.before_request
def add_deprecation_headers():
    for path, info in DEPRECATED_PATHS.items():
        if request.path.startswith(path):
            g.deprecation_sunset = info["sunset"]
            g.deprecation_replacement = info["replacement"]
            break

@app.after_request
def set_deprecation_headers(response):
    if hasattr(g, "deprecation_sunset"):
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = datetime.strptime(
            g.deprecation_sunset, "%Y-%m-%d"
        ).strftime("%a, %d %b %Y 00:00:00 GMT")
        response.headers["Link"] = (
            '<https://docs.example.com/api-migration>; rel="deprecation"'
        )
    return response
```

## Tracking Migration Progress

Monitor traffic to deprecated endpoints so you know which consumers have not migrated yet.

### SQL Query for Deprecation Traffic

```sql
SELECT
    endpoint,
    COUNT(*) AS request_count,
    COUNT(DISTINCT client_id) AS unique_clients,
    MAX(timestamp) AS last_request
FROM api_requests
WHERE endpoint LIKE '/v1/%'
    AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY endpoint
ORDER BY request_count DESC;
```

### Alerting on Stale Consumers

Set up an alert when a consumer with significant traffic has not started migrating:

```yaml
alert: stale_deprecation_consumer
expr: |
  sum by (client_id) (
    rate(api_requests_total{endpoint=~"/v1/.*"}[1h])
  ) > 10
for: 24h
labels:
  severity: warning
annotations:
  summary: "Client {{ $labels.client_id }} still using deprecated v1 endpoints"
  description: "This client has made >10 req/h to v1 endpoints in the last 24h"
```

## Communication Plan

| Channel | Timing | Audience | Content |
|---------|--------|----------|---------|
| Email blast | T-90 days | All registered consumers | Full deprecation notice + migration guide link |
| Blog post | T-90 days | Public | Announcement + context for the change |
| API response headers | T-90 days | Active integrations | `Deprecation: true`, `Sunset` header |
| Dashboard banner | T-60 days | Dashboard users | Persistent banner with migration deadline |
| Follow-up email | T-30 days | Non-migrated consumers | Reminder + offer office hours |
| Direct outreach | T-14 days | High-traffic non-migrated | Personal email or call from API team |
| Final email | T-7 days | All remaining | "v1 sunset in 7 days" |
| Status page | T-0 | All | v1 returns 410 Gone, status page update |

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public API | 90+ days notice, blog post, email | Consumer trust depends on predictable timelines |
| Internal API | 30 days notice, Slack announcement | Faster iteration, smaller consumer base |
| Emergency security patch | 7 days notice, direct outreach | Security takes priority over convenience |
| GraphQL API | `@deprecated` directive + notice | Schema-level deprecation alongside communication |

## What Works

1. **Send deprecation headers in API responses** at least 90 days before sunset (`Deprecation: true`, `Sunset: <date>`)
2. **Provide a working replacement** before removing the old endpoint
3. **Maintain a changelog** with all deprecations and migrations
4. **Track migration progress** by monitoring traffic to deprecated endpoints
5. **Offer office hours** or a migration guide for complex changes
6. **Use multiple communication channels** — email alone is not enough
7. **Log deprecation header usage** so you know which clients are aware

## Common Mistakes

1. **Announcing deprecation without a replacement** — consumers have nowhere to go
2. **Too-short notice periods** — enterprise clients need quarters to plan changes
3. **Changing behavior silently** without announcing deprecation first
4. **Not tracking which consumers still use deprecated endpoints**
5. **Hard-deleting without a grace period** — always return 410 Gone first
6. **Sending one email and assuming everyone read it** — use multiple channels
7. **Not providing a sandbox** for consumers to test the new endpoint
8. **Extending the sunset date repeatedly** — undermines trust in future deadlines
9. **Forgetting to update SDKs and client libraries** alongside the API change

## Frequently Asked Questions

### How much notice should I give?

Public APIs: 90-180 days. Internal APIs: 30-60 days. Security-related changes: as fast as possible with direct outreach.

### Should I support both versions indefinitely?

No. Maintaining multiple versions increases operational cost and security surface area. Set a firm sunset date and stick to it, with limited exceptions.

### What HTTP status code should a deprecated endpoint return after sunset?

Return `410 Gone` to indicate permanent removal. Include a `Location` or message header pointing to the replacement endpoint.

### What if a major customer cannot migrate in time?

Offer a temporary extension with a documented expiration date. Track the extension in your deprecation log. Do not extend indefinitely — that defeats the purpose of the sunset.

### Should I return warnings during the deprecation period?

Yes. Return `299 Miscellaneous Persistent Warning` with a deprecation message in the `Warning` header. This is a soft signal that does not break clients but appears in logs.

### How do I deprecate a GraphQL field?

Use the `@deprecated` directive in your schema:

```graphql
type Order {
  total: Float @deprecated(reason: "Use totalAmount instead. Removed in 2026-10-01.")
  totalAmount: Float
}
```

GraphQL clients receive deprecation warnings in their introspection queries.

### Should I version the entire API or just the changed endpoints?

Prefer per-endpoint versioning for small changes. Reserve full API version bumps (v1 to v2) for coordinated changes that affect many endpoints at once.

### How do I handle deprecation in a webhook-based integration?

Send a `deprecation.notice` webhook event to all subscribed endpoints. Include the same information as the deprecation notice: what changed, sunset date, and migration link. Follow up with reminder events at T-30 and T-7 days.
