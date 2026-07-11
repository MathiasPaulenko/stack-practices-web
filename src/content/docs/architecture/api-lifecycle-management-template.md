---
contentType: docs
slug: api-lifecycle-management-template
title: "API Lifecycle Management Template"
description: "A checklist template for API deprecation, versioning, and sunset procedures."
metaDescription: "Use this API lifecycle management template to track deprecation notices, versioning transitions, and sunset readiness checks."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - api
  - lifecycle
  - versioning
  - deprecation
  - template
relatedResources:
  - /docs/microservice-contract-template
  - /docs/service-dependency-map-template
  - /docs/system-diagram-template
  - /docs/technical-spec-template
  - /docs/adr-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this API lifecycle management template to track deprecation notices, versioning transitions, and sunset readiness checks."
  keywords:
    - architecture
    - api
    - lifecycle
    - versioning
    - deprecation
    - template
---
## Overview

APIs are long-lived contracts between systems. Changing or removing an endpoint without a structured process breaks downstream consumers, causes outages, and damages trust. This template provides a checklist-driven approach for deprecating old versions, introducing new versions, and sunsetting APIs safely.

## When to Use

Use this resource when:
- Planning to deprecate an API endpoint or version
- Introducing a breaking change that requires a new API version
- Preparing to shut down an entire API or service

## Solution

```markdown
# API Lifecycle Management: `<API Name>`

## 1. API Metadata

| Field | Value |
|-------|-------|
| API Name | `name` |
| Current Version | `v2.3` |
| Base URL | `https://api.example.com/v2` |
| Owner Team | `@platform-team` |
| Consumers | Internal: 3, External: 12 |

## 2. Deprecation Checklist

### 2.1. Decision & Communication

- [ ] Document the reason for deprecation (security, performance, maintainability)
- [ ] Identify all consumers using the deprecated endpoint/version
- [ ] Set a deprecation date (minimum 6 months for external APIs, 3 months for internal)
- [ ] Publish deprecation notice in:
  - [ ] API documentation (changelog)
  - [ ] Developer portal / status page
  - [ ] Direct email to registered consumers
  - [ ] Response headers (`Deprecation: true`, `Sunset: <date>`)

### 2.2. Migration Path

- [ ] Provide a migration guide with before/after examples
- [ ] Offer a sandbox environment for testing the new version
- [ ] Schedule office hours or Q&A sessions for consumer teams
- [ ] Create a compatibility shim if the migration is complex

### 2.3. Monitoring

- [ ] Track traffic to the deprecated endpoint daily
- [ ] Alert when usage drops below threshold (ready for shutdown)
- [ ] Maintain a dashboard of consumer migration progress

## 3. Versioning Checklist

### 3.1. Version Selection

- [ ] Determine if the change is backward-compatible (patch/minor) or breaking (major)
- [ ] Follow semantic versioning: `MAJOR.MINOR.PATCH`
- [ ] Update URL path (`/v3/`) or use header-based versioning (`Accept: application/vnd.api.v3+json`)

### 3.2. Release

- [ ] Deploy the new version alongside the old version
- [ ] Update documentation with new request/response examples
- [ ] Run contract tests against the new version
- [ ] Verify backward compatibility for non-breaking changes

### 3.3. Post-Release

- [ ] Monitor error rates and latency for the new version
- [ ] Collect feedback from early adopters
- [ ] Update SDKs and client libraries

## 4. Sunset Checklist

### 4.1. Pre-Shutdown

- [ ] Confirm zero traffic to the deprecated endpoint for 7 consecutive days
- [ ] Verify all known consumers have migrated (contact stragglers individually)
- [ ] Announce the final shutdown date (30 days notice)

### 4.2. Shutdown

- [ ] Disable the endpoint (return `410 Gone` or `404 Not Found`)
- [ ] Remove deprecated code and tests
- [ ] Update infrastructure (load balancer rules, DNS)
- [ ] Archive documentation with a redirect to the new version

### 4.3. Post-Shutdown

- [ ] Monitor for unexpected 404s from unknown consumers
- [ ] Document lessons learned
- [ ] Update API lifecycle timeline
```

## Explanation

The checklist enforces a **minimum notice period** that respects consumer timelines. External APIs need longer deprecation windows because you cannot control when consumers update. The `Sunset` header is machine-readable, allowing client libraries to warn developers automatically. Tracking traffic before shutdown prevents surprise breakages from forgotten internal integrations.

## Deprecation and Sunset Headers

Add HTTP headers to every response from the deprecated endpoint so consumers discover the deprecation programmatically:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Sat, 31 Dec 2026 23:59:59 GMT
Link: <https://api.example.com/v3/users>; rel="successor-version"
```

Client libraries can parse these headers and log warnings:

```javascript
function checkDeprecationHeaders(response) {
  const sunset = response.headers.get("Sunset");
  const deprecation = response.headers.get("Deprecation");
  const successor = response.headers.get("Link");

  if (deprecation === "true") {
    console.warn(`This endpoint is deprecated. Sunset date: ${sunset}`);
    if (successor) {
      console.warn(`Migrate to: ${successor.match(/<([^>]+)>/)?.[1]}`);
    }
  }
}
```

## Migration Guide Template

Provide a structured migration guide for each breaking change:

```markdown
# Migration Guide: v2 -> v3 User Service API

## Summary
- Field `name` split into `firstName` and `lastName`
- Endpoint `/v2/users/{id}` replaced by `/v3/users/{id}`
- Error responses now use RFC 7807 Problem Details format

## Before (v2)
```json
GET /v2/users/123
{
  "id": 123,
  "name": "Alice Johnson",
  "email": "alice@example.com"
}
```

## After (v3)
```json
GET /v3/users/123
{
  "id": 123,
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com"
}
```

## Error Format Change
```json
// v2 error
{ "error": "User not found", "code": 404 }

// v3 error (RFC 7807)
{
  "type": "https://api.example.com/errors/not-found",
  "title": "User not found",
  "status": 404,
  "detail": "User 123 does not exist"
}
```

## Automated Migration Steps
1. Update base URL from `/v2/` to `/v3/`
2. Replace `name` with `firstName` + `lastName` in request/response models
3. Update error handling to parse RFC 7807 format
4. Test against sandbox at `https://sandbox.api.example.com/v3/`
```

## Automated Sunset Monitoring Script

Track traffic to deprecated endpoints so you know when it is safe to shut them down:

```python
import requests
from datetime import datetime, timedelta

def check_sunset_readiness(grafana_url, dashboard_id, api_token):
    headers = {"Authorization": f"Bearer {api_token}"}
    end = datetime.utcnow()
    start = end - timedelta(days=7)

    query = f'sum(rate(http_requests_total{{version="v2"}}[1h]))'
    params = {
        "query": query,
        "start": start.timestamp(),
        "end": end.timestamp(),
        "step": 3600,
    }

    resp = requests.get(f"{grafana_url}/api/datasources/proxy/1/api/v1/query_range",
                        headers=headers, params=params)
    data = resp.json()

    hourly_rates = [float(point[1]) for point in data["data"]["result"][0]["values"]]
    zero_traffic_days = sum(1 for rate in hourly_rates if rate == 0)

    if zero_traffic_days >= 7:
        print("READY FOR SHUTDOWN: 7 consecutive days of zero traffic")
    else:
        print(f"NOT READY: Only {zero_traffic_days} hours of zero traffic in last 7 days")
        print(f"Average hourly traffic: {sum(hourly_rates) / len(hourly_rates):.1f} requests")
```

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Internal microservices | Shorter timelines, stricter enforcement | Teams can coordinate via shared Slack channel |
| Public SaaS API | Long timelines, legal review | May require SLA commitments for deprecation notice |
| Mobile app backends | Force upgrade via app store | Use minimum app version checks to sunset old endpoints |
| GraphQL APIs | Schema deprecation directives | Use `@deprecated` directive on fields and types |
| Event-driven | Schema registry compatibility modes | Transition from BACKWARD to NONE before removing old schema |

## What Works

1. Never remove an API without a deprecation period, even for internal use
2. Return deprecation headers as soon as the decision is made, not at shutdown
3. Maintain a public API changelog with dates for every change
4. Version the API contract independently of the service deployment
5. Keep deprecated endpoints observable with dedicated dashboards
6. Send deprecation notices through multiple channels (email, headers, changelog, status page)
7. Provide a compatibility shim for complex migrations to reduce consumer effort

## Common Mistakes

1. Announcing deprecation but not tracking whether consumers actually migrate
2. Changing behavior on an existing version without bumping the version number
3. Removing documentation before the API is shut down
4. Assuming all consumers read email announcements
5. Forcing migrations during holiday seasons or fiscal quarter-ends
6. Not providing a sandbox environment for consumers to test the new version
7. Shutting down without monitoring for 404s from unknown consumers post-shutdown

## Frequently Asked Questions

### How long should I keep a deprecated API alive?

External APIs: minimum 6-12 months. Internal APIs: minimum 3 months. Enterprise contracts may specify longer periods. Never deprecate during known high-traffic periods (Black Friday, tax season).

### Should I use URL versioning or header versioning?

URL versioning (`/v1/`, `/v2/`) is explicit and easy to debug. Header versioning keeps URLs clean but is harder to cache and troubleshoot. Most teams use URL versioning for REST APIs.

### What if a consumer refuses to migrate?

If a consumer is critical and cannot migrate in time, negotiate an extension with a hard deadline. If the consumer is non-critical, proceed with shutdown; the `410 Gone` response will force action.

### How do I handle versioning for GraphQL APIs?

GraphQL uses a single endpoint. Deprecate fields with the `@deprecated` directive and monitor usage via introspection queries. Remove deprecated fields only after usage drops to zero.

### What is a compatibility shim and when should I use one?

A compatibility shim is a translation layer that accepts old-format requests and converts them to the new format internally. Use it when the migration is complex (e.g., field splitting, response restructuring) and consumers need time to adapt. Remove the shim after all consumers have migrated.

### Should I maintain separate SDKs for each API version?

Maintain SDKs for the current and previous major version. Drop support for older SDKs after the deprecation window expires. Publish migration guides alongside SDK updates so developers can upgrade in one pass.

### How do I automate the sunset readiness check?

Instrument your API gateway or load balancer to tag requests by version. Build a dashboard that shows traffic per version over time. Set an alert when traffic to a deprecated version drops below a threshold for 7 consecutive days, signaling readiness for shutdown.
