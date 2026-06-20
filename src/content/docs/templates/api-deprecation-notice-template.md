---
contentType: docs
slug: api-deprecation-notice-template
templateType: api-deprecation
title: "API Deprecation Notice Template"
description: "A template for communicating API deprecations to consumers with timelines, migration paths, and clear sunset dates that minimize breakage."
metaDescription: "API deprecation notice template: communicate endpoint and field deprecations with timelines, migration paths, and clear sunset dates."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - backward-compatibility
  - template
  - versioning
relatedResources:
  - /guides/api/rest-api-design-guide
  - /docs/templates/release-notes-template
  - /guides/architecture/microservices-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "API deprecation notice template: communicate endpoint and field deprecations with timelines, migration paths, and clear sunset dates."
  keywords:
    - api deprecation notice
    - api sunset template
    - deprecation policy
    - api versioning deprecation
    - migration path template
---

# API Deprecation Notice Template

Use this template to communicate API deprecations clearly and reduce consumer breakage.

## Template

```markdown
# API Deprecation Notice: [Endpoint/Feature Name]

## What Is Changing
[Endpoint or field] is being deprecated and will be removed on [sunset date].

## Timeline
| Milestone | Date |
|-----------|------|
| Deprecation announced | YYYY-MM-DD |
| New version available | YYYY-MM-DD |
| Sunset date (removed) | YYYY-MM-DD |

## Impact
- **Affected consumers:** [list or "all consumers using v1"]
- **Risk level:** [low / medium / high]
- **Breaking change:** [yes / no with migration]

## Migration Path
### Before (deprecated)
```http
GET /api/v1/orders?status=pending
```

### After (recommended)
```http
GET /api/v2/orders?filter=status:pending
```

## Required Changes
1. Update base URL from `/v1/` to `/v2/`
2. Replace query parameter `status` with `filter`
3. Handle new response schema: [link to docs]

## Support
- **Migration guide:** [link]
- **Contact:** api-team@company.com
- **Office hours:** Thursdays 14:00 UTC
```

## Deprecation Policy Recommendations

| Phase | Minimum Duration | Communication |
|-------|-----------------|---------------|
| **Announcement** | Day 0 | Email, changelog, docs banner |
| **Warning in responses** | 30 days before sunset | `Deprecation` and `Sunset` headers |
| **Final notice** | 7 days before | Direct email to active consumers |

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: </api/v2/orders>; rel="successor-version"
```

## Best Practices

- **Never remove without notice** — minimum 6 months for public APIs, 30 days for internal
- **Provide a working migration path** — consumers should be able to switch in one PR. Link to updated [API Documentation](/docs/templates/api-documentation) and [Error Response Templates](/docs/templates/api-error-response-template).
- **Add deprecation headers** — automated tools can flag usage in CI
- **Track consumer adoption** — know who has not migrated before sunset
- **Avoid breaking changes in patch versions** — follow [Semantic Versioning](/guides/api/rest-api-design-guide) conventions

## Common Mistakes

- Announcing deprecation the same week as removal — consumers need time
- No migration guide — "just use v2" is not enough detail
- Changing behavior before deprecation — introduces silent bugs
- Not tracking which consumers use the deprecated endpoint — you cannot nudge who you do not know

## Frequently Asked Questions

### How long should deprecation periods last?

Public APIs: minimum 6-12 months. Internal APIs: 1-3 months. The more consumers, the longer the runway. Check your API analytics to estimate migration effort.

### What if a consumer does not migrate by the sunset date?

Extend the sunset if the consumer is critical. For non-critical consumers, return `410 Gone` with a link to the migration guide. See [API Error Response Template](/docs/templates/api-error-response-template) for structured error formats. Never silently break integrations.

### Should deprecated endpoints return warnings?

Yes. Use the `Deprecation` header and include a `Link` to the successor version. Some client libraries can surface these warnings automatically in development mode.
