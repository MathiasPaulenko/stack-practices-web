---
contentType: docs
slug: api-changelog-template
title: "API Changelog Template"
description: "A template for documenting API changes including breaking changes, new features, deprecations, and bug fixes."
metaDescription: "Use this API changelog template to document breaking changes, new features, deprecations, and bug fixes with clear versioning."
difficulty: beginner
topics:
  - api
  - architecture
tags:
  - api
  - changelog
  - versioning
  - documentation
  - template
relatedResources:
  - /docs/architecture/api-lifecycle-management-template
  - /docs/api/api-deprecation-notice-template
  - /docs/architecture/technical-spec-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Use this API changelog template to document breaking changes, new features, deprecations, and bug fixes with clear versioning."
  keywords:
    - api changelog
    - versioning
    - breaking changes
    - release notes
    - api documentation
    - changelog template
---

## Overview

API consumers need to know what changed, when it changed, and whether they need to act. An unstructured changelog — or no changelog at all — forces consumers to diff your API or discover breaking changes in production. This template provides a standardized format for documenting every API change with version, date, severity, and migration guidance.

## When to Use

Use this resource when:
- Releasing a new API version or capability
- Deprecating or removing an endpoint or field
- Fixing a bug that affects API behavior
- Publishing a monthly or quarterly API update

## Solution

```markdown
# API Changelog

## 2.5.0 — 2026-06-26

### Breaking Changes
- **Removed:** `GET /v1/orders/{id}/items` — Use `GET /v2/orders/{id}?expand=items` instead
- **Changed:** `total` field renamed to `totalAmount` in all order responses
- **Required:** `X-Request-ID` header now mandatory for all write operations

### New Capabilities
- **Added:** `POST /v2/orders/bulk` — Create up to 100 orders in a single request
- **Added:** `paymentStatus` field to order responses (`pending`, `paid`, `failed`)
- **Added:** Webhook event `order.payment_failed` for failed payment notifications

### Fixes
- **Fixed:** `GET /v2/products` now returns empty array `[]` instead of `null` when no products exist
- **Fixed:** Date fields now consistently return ISO 8601 format with timezone offset

### Deprecations
- **Deprecated:** `customer_id` query parameter — Use `customerId` instead (sunset: 2026-10-01)
- **Deprecated:** `v1` API base path — Migrate to `v2` before 2026-12-01

## 2.4.0 — 2026-05-15

### New Capabilities
- **Added:** `PATCH /v2/orders/{id}` for partial order updates
- **Added:** Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) to all responses

### Fixes
- **Fixed:** `500 Internal Server Error` on `POST /v2/orders` when `items` array was empty

---

## Versioning Policy

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR:** Breaking changes that require consumer action
- **MINOR:** New capabilities, backward compatible
- **PATCH:** Bug fixes, backward compatible

## Change Categories

| Category | Description | Consumer Action Required |
|----------|-------------|--------------------------|
| Breaking Change | Existing integrations may fail | Yes — migration required |
| New Capability | New endpoints, fields, or behaviors | Optional — adopt when ready |
| Fix | Corrected bug or inconsistent behavior | No — but verify if you relied on old behavior |
| Deprecation | Capability scheduled for removal | Yes — before sunset date |

## Subscribe to Changes

- **RSS Feed:** https://developer.example.com/changelog.xml
- **Email:** Subscribe at https://developer.example.com/subscribe
- **Webhook:** Configure `api.changelog_published` event in your dashboard
- **Slack:** Join #api-announcements on our community Slack
```

## Extended Template Example

Here is a more detailed changelog with multiple versions, showing how entries accumulate over time:

```markdown
# API Changelog

## 3.0.0 — 2026-09-01

### Breaking Changes
- **Removed:** All v1 endpoints. Migrate to v2 or v3. See migration guide.
- **Changed:** Authentication switched from API keys to OAuth 2.0 bearer tokens
- **Changed:** Error response format standardized to RFC 7807 Problem Details
- **Removed:** `GET /v2/users/{id}/permissions` — Use `GET /v2/users/{id}?expand=permissions`
- **Changed:** Pagination `offset`/`limit` replaced with `cursor`/`limit`

### New Capabilities
- **Added:** `POST /v3/webhooks` — Programmatically register webhook endpoints
- **Added:** Bulk export endpoint `GET /v3/orders/export?format=csv`
- **Added:** Idempotency key support on all POST endpoints via `Idempotency-Key` header

### Fixes
- **Fixed:** Rate limit counters now reset correctly at midnight UTC instead of local server time
- **Fixed:** `PATCH /v2/orders/{id}` no longer overwrites `null` values when field is omitted

### Deprecations
- **Deprecated:** `v2` API base path — Migrate to `v3` before 2027-03-01
- **Deprecated:** `X-API-Key` header — Use `Authorization: Bearer <token>` instead

## 2.5.0 — 2026-06-26

### Breaking Changes
- **Removed:** `GET /v1/orders/{id}/items` — Use `GET /v2/orders/{id}?expand=items` instead
- **Changed:** `total` field renamed to `totalAmount` in all order responses
- **Required:** `X-Request-ID` header now mandatory for all write operations

### New Capabilities
- **Added:** `POST /v2/orders/bulk` — Create up to 100 orders in a single request
- **Added:** `paymentStatus` field to order responses (`pending`, `paid`, `failed`)
- **Added:** Webhook event `order.payment_failed` for failed payment notifications

### Fixes
- **Fixed:** `GET /v2/products` now returns empty array `[]` instead of `null` when no products exist
- **Fixed:** Date fields now consistently return ISO 8601 format with timezone offset

### Deprecations
- **Deprecated:** `customer_id` query parameter — Use `customerId` instead (sunset: 2026-10-01)
- **Deprecated:** `v1` API base path — Migrate to `v2` before 2026-12-01

## 2.4.0 — 2026-05-15

### New Capabilities
- **Added:** `PATCH /v2/orders/{id}` for partial order updates
- **Added:** Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) to all responses

### Fixes
- **Fixed:** `500 Internal Server Error` on `POST /v2/orders` when `items` array was empty
```

## Changelog Automation

Generating changelogs manually is error-prone. Use commit message conventions and tooling to produce changelogs automatically or semi-automatically.

### Conventional Commits

Structure commit messages so a tool can parse them:

```
feat(api): add bulk order creation endpoint

POST /v2/orders/bulk accepts up to 100 orders in one request.
Returns 207 Multi-Status with per-order results.

BREAKING CHANGE: total field renamed to totalAmount in order responses
```

### Node.js Script to Generate Changelog from Git Tags

```javascript
const { execSync } = "child_process";

function generateChangelog(fromTag, toTag) {
  const log = execSync(
    `git log ${fromTag}..${toTag} --pretty=format:"%s|%H" --no-merges`
  ).toString();

  const entries = log.split("\n").map((line) => {
    const [message, hash] = line.split("|");
    return { message: message.trim(), hash };
  });

  const breaking = entries.filter((e) =>
    e.message.includes("BREAKING CHANGE") || e.message.startsWith("feat!")
  );
  const features = entries.filter((e) =>
    e.message.startsWith("feat") && !e.message.includes("BREAKING")
  );
  const fixes = entries.filter((e) => e.message.startsWith("fix"));
  const deprecations = entries.filter((e) =>
    e.message.startsWith("deprecate") || e.message.includes("DEPRECATED")
  );

  let output = `## ${toTag} — ${new Date().toISOString().split("T")[0]}\n\n`;

  if (breaking.length) {
    output += "### Breaking Changes\n";
    breaking.forEach((e) => {
      output += `- **Changed:** ${e.message.replace(/BREAKING CHANGE:\s*/, "")}\n`;
    });
    output += "\n";
  }

  if (features.length) {
    output += "### New Capabilities\n";
    features.forEach((e) => {
      output += `- **Added:** ${e.message.replace(/^feat\([^)]+\):\s*/, "")}\n`;
    });
    output += "\n";
  }

  if (fixes.length) {
    output += "### Fixes\n";
    fixes.forEach((e) => {
      output += `- **Fixed:** ${e.message.replace(/^fix\([^)]+\):\s*/, "")}\n`;
    });
    output += "\n";
  }

  if (deprecations.length) {
    output += "### Deprecations\n";
    deprecations.forEach((e) => {
      output += `- **Deprecated:** ${e.message.replace(/^deprecate\([^)]+\):\s*/, "")}\n`;
    });
  }

  return output;
}

console.log(generateChangelog("v2.4.0", "v2.5.0"));
```

### Tools That Generate Changelogs

| Tool | Language | Approach |
|------|----------|----------|
| [semantic-release](https://github.com/semantic-release/semantic-release) | JavaScript | Parses conventional commits, auto-generates releases |
| [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog) | JavaScript | CLI to generate changelogs from commit history |
| [auto-changelog](https://github.com/CookPete/auto-changelog) | JavaScript | Simple CLI, outputs Markdown from git log |
| [git-cliff](https://github.com/orhun/git-cliff) | Rust | Configurable changelog generator from commits |
| [changeloguru](https://github.com/changeloguru/changeloguru) | Go | Conventional commits to changelog |

## Deprecation Headers in Practice

Send HTTP headers in deprecated API responses so consumers can detect deprecation programmatically:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Sat, 01 Oct 2026 00:00:00 GMT
Link: <https://docs.example.com/api-migration>; rel="deprecation"
```

### Checking Deprecation Headers in Client Code

```python
import requests

response = requests.get("https://api.example.com/v1/orders", headers={
    "Authorization": "Bearer token123"
})

if response.headers.get("Deprecation") == "true":
    sunset = response.headers.get("Sunset", "unknown date")
    link = response.headers.get("Link", "")
    print(f"WARNING: This endpoint is deprecated. Sunset: {sunset}")
    print(f"Migration guide: {link}")
```

```javascript
const response = await fetch("https://api.example.com/v1/orders", {
  headers: { Authorization: "Bearer token123" }
});

const deprecation = response.headers.get("Deprecation");
if (deprecation === "true") {
  const sunset = response.headers.get("Sunset");
  const link = response.headers.get("Link");
  console.warn(`Endpoint deprecated. Sunset: ${sunset}`);
  console.warn(`Migration guide: ${link}`);
}
```

## Changelog Format Standards

| Element | Standard | Example |
|---------|----------|---------|
| Version number | Semantic Versioning | `2.5.0` |
| Date format | ISO 8601 (`YYYY-MM-DD`) | `2026-06-26` |
| Entry verb | Past tense, bolded | `**Added:**`, `**Fixed:**` |
| Breaking change marker | First section under each version | `### Breaking Changes` |
| Deprecation sunset | ISO 8601 date in parentheses | `(sunset: 2026-10-01)` |
| Migration link | URL or endpoint reference | `Use GET /v2/orders/{id}?expand=items` |

## Explanation

The changelog uses a **version-date-entry** hierarchy so consumers can scan for their current version and see everything that changed since. Breaking changes are listed first because they demand immediate attention. Each entry includes a verb (`Added`, `Removed`, `Fixed`, `Deprecated`) so consumers understand the nature of the change at a glance. The versioning policy section reduces confusion about what each version number means.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Public API | Full changelog with RSS/email | Consumers self-serve, reduces support tickets |
| Internal API | Slack + short summary | Faster, less ceremony |
| Partner API | Email + migration guide link | Partners need white-glove communication |
| GraphQL API | Schema diff + changelog | Use `@deprecated` directive in schema alongside changelog |

## What Works

1. **Publish the changelog before deploying the change** — not after consumers report issues
2. **Group entries by severity** — breaking changes first, then capabilities, then fixes
3. **Include migration instructions** with every breaking change, not just a description
4. **Link to documentation** for complex new capabilities instead of explaining in the changelog
5. **Archive old versions** but keep them accessible — enterprise clients may be several versions behind
6. **Use conventional commits** so changelogs can be generated or verified automatically
7. **Send deprecation headers** in API responses so client code can detect and warn

## Common Mistakes

1. **Mixing bug fixes and breaking changes** without clear categorization
2. **Writing "various bug fixes"** instead of listing specific fixes consumers care about
3. **Publishing changelogs days after the deployment** — consumers are already broken
4. **Not versioning the changelog itself** — if the changelog changes, consumers lose trust
5. **Forgetting to document removed fields** — consumers discover missing data only in production
6. **Omitting the sunset date for deprecations** — consumers do not know how much time they have
7. **Not linking to migration guides** from the changelog entry
8. **Using inconsistent date formats** across versions — stick to ISO 8601
9. **Burying breaking changes** at the bottom of a release entry instead of listing them first

## Frequently Asked Questions

### How far back should the changelog go?

Keep at least the last 12 months of changes online. Archive older versions in a separate page. Enterprise clients with long procurement cycles may need to reference changes from a year ago.

### Should I document internal-only changes?

No. The changelog is for consumers. Internal refactoring, CI/CD changes, or infrastructure updates belong in internal release notes, not the public API changelog.

### What if a bug fix changes behavior that some consumers relied on?

Document it as a breaking change if the old behavior was documented. If the old behavior was a bug, document it as a fix but include a note: "Previous behavior was unintentional and inconsistent with documentation."

### Should the changelog be a single file or a page per version?

For small APIs, a single Markdown file works fine. For APIs with frequent releases, use a page per major version with an index. This keeps the page loadable and searchable.

### How do I handle pre-release versions?

Use SemVer pre-release labels: `3.0.0-beta.1`, `3.0.0-rc.1`. Document them in the changelog with a note that the API is subject to change before the stable release.

### Should I include performance improvements in the changelog?

Only if they change observable behavior — for example, a lower latency guarantee or a new caching header. Internal performance optimizations that do not affect consumers belong in internal notes.

### How do I automate changelog publication?

Use a CI/CD pipeline that runs on tag creation: generate the changelog section from commits, append it to the changelog file, publish to your docs site, and send a notification to subscribed channels.
