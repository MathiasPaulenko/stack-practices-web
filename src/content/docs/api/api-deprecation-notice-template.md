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
  - /docs/architecture/api-lifecycle-management-template
  - /docs/architecture/microservice-contract-template
  - /docs/architecture/technical-spec-template
  - /docs/devops/rollout-communication-template
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

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public API | 90+ days notice, blog post, email | Consumer trust depends on predictable timelines |
| Internal API | 30 days notice, Slack announcement | Faster iteration, smaller consumer base |
| Emergency security patch | 7 days notice, direct outreach | Security takes priority over convenience |

## Best Practices

1. **Send deprecation headers in API responses** at least 90 days before sunset (`Deprecation: true`, `Sunset: <date>`)
2. **Provide a working replacement** before removing the old endpoint
3. **Maintain a changelog** with all deprecations and migrations
4. **Track migration progress** by monitoring traffic to deprecated endpoints
5. **Offer office hours** or a migration guide for complex changes

## Common Mistakes

1. **Announcing deprecation without a replacement** — consumers have nowhere to go
2. **Too-short notice periods** — enterprise clients need quarters to plan changes
3. **Changing behavior silently** without announcing deprecation first
4. **Not tracking which consumers still use deprecated endpoints**
5. **Hard-deleting without a grace period** — always return 410 Gone first

## Frequently Asked Questions

### How much notice should I give?

Public APIs: 90-180 days. Internal APIs: 30-60 days. Security-related changes: as fast as possible with direct outreach.

### Should I support both versions indefinitely?

No. Maintaining multiple versions increases operational cost and security surface area. Set a firm sunset date and stick to it, with limited exceptions.

### What HTTP status code should a deprecated endpoint return after sunset?

Return `410 Gone` to indicate permanent removal. Include a `Location` or message header pointing to the replacement endpoint.
