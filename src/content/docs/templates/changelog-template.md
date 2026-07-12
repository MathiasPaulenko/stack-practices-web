---



contentType: docs
templateType: changelog
slug: changelog-template
title: "Changelog Template"
description: "A structured changelog template following Keep a Changelog conventions for tracking project releases."
metaDescription: "Standardized changelog template following Keep a Changelog. Track releases, functionality, fixes, and breaking changes consistently."
difficulty: beginner
topics:
  - devops
tags:
  - changelog
  - devops
  - release-notes
  - semver
  - versioning
relatedResources:
  - /docs/contributing-guide
  - /docs/readme-template
  - /guides/cicd-pipeline-guide
  - /recipes/chaos-engineering
  - /recipes/pre-commit-hooks
  - /docs/dependency-upgrade-template
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Standardized changelog template following Keep a Changelog. Track releases, functionality, fixes, and breaking changes consistently."
  keywords:
    - changelog template
    - keep a changelog
    - release notes
    - semantic versioning
    - version history



---

## Overview

A changelog is a curated, chronologically ordered list of notable changes for each version of a project. It helps users and contributors understand what has changed between releases.

## When to Use

- You maintain a library, framework, or application with versioned releases
- You need to communicate breaking changes to consumers. Pair with the [API Deprecation Notice Template](/docs/api/api-deprecation-notice-template) when sunsetting functionality.
- You want to automate release note generation

## Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New functionality

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed functionality

### Removed
- Now removed functionality

### Fixed
- Bug fixes

### Security
- Vulnerability fixes

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release with core functionality
```

## Filled Example

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CSV export for analytics dashboard charts (#234)
- Saved filter presets for dashboard reuse (#231)

### Changed
- `/api/v1/reports` response now wraps fields in `metadata` object (#228)

### Deprecated
- `/api/v1/reports` flat response format — removed in v3.0.0, use `metadata` object

### Fixed
- CSV export returns empty file when date range crosses month boundary (#234)
- Dashboard crashes when switching chart types with 0 rows (#228)

### Security
- Patched XSS vulnerability in chart tooltip rendering (CVE-2026-1234)

## [2.4.1] - 2026-06-20

### Fixed
- Login redirect loop when SSO session expires (#220)
- API rate limit headers missing from 429 responses (#222)

### Security
- Updated `jsonwebtoken` to 9.0.2 to patch CVE-2026-0987

## [2.4.0] - 2026-06-01

### Added
- Dark mode for admin panel (#210)
- Bulk user import via CSV upload (#205)

### Changed
- Dashboard charts now lazy-load for faster initial render (#215)

### Deprecated
- `GET /api/v1/users?format=xml` — use JSON format, XML removed in v3.0.0
```

## Categories Explained

| Category | Use For |
|----------|---------|
| **Added** | New functionality |
| **Changed** | Changes to existing functionality |
| **Deprecated** | Functionality marked for removal. See [API Deprecation Notice Template](/docs/api/api-deprecation-notice-template) |
| **Removed** | Functionality removed in this release |
| **Fixed** | Bug fixes |
| **Security** | Security vulnerability fixes |

## Semver and Changelog

| Version change | Changelog entry | Example |
|----------------|-----------------|---------|
| MAJOR (X.0.0) | Breaking changes under Changed/Removed | `## [3.0.0] - Removed: XML response format` |
| MINOR (X.Y.0) | New functionality under Added | `## [2.5.0] - Added: CSV export` |
| PATCH (X.Y.Z) | Bug fixes under Fixed/Security | `## [2.4.1] - Fixed: Login redirect loop` |

## What works

- **Date every release** using ISO 8601 format (`YYYY-MM-DD`)
- **Group changes** by category within each release
- **Link to issues/PRs** when applicable
- **Mention breaking changes** prominently
- **Keep an Unreleased section** at the top for upcoming changes
- **Write entries for humans** — not git commit messages
- **Reference issues** — `(#123)` helps users find context

## Common Mistakes

- **Commit log dumps**: A changelog is curated, not a raw git log
- **Missing dates**: Every release should have a date
- **Forgetting the Unreleased section**: Helps users see what's coming
- **Mixing categories**: Put security fixes under Security, not Fixed
- **No issue references**: Users need to trace changes back to discussions
- **Inconsistent formatting**: Stick to Keep a Changelog categories every release

## Automation

### Conventional Commits + auto-changelog

Use conventional commit prefixes (`feat:`, `fix:`, `BREAKING CHANGE:`) and tools like `auto-changelog` or `release-please` to generate changelog entries from commit messages. Review the output before committing — automated entries need editing for clarity.

### GitHub Release Notes

GitHub Releases can auto-generate notes from PRs and commits. Use label-based filtering (`breaking`, `feature`, `bug`) to categorize entries. Export to `CHANGELOG.md` with a script or action.

### Manual + automated hybrid

Write breaking changes and migration notes manually. Auto-generate bug fix and minor improvement entries from commits. This balances accuracy for important changes with efficiency for routine ones.

## Changelog Example

```text
=== CHANGELOG: payment-service ===

# Changelog

All notable changes to payment-service are documented here.
The format is based on Keep a Changelog (https://keepachangelog.com)
and this project adheres to Semantic Versioning (https://semver.org).

## [Unreleased]

### Added
- Partial refund endpoint: POST /payments/:id/refund-partial
- Metadata field in payment responses for custom data

### Changed
- Amount field now returns as integer in cents (was decimal)

### Fixed
- Maximum amount validation now correctly applies to refunds

## [2.5.0] - 2026-07-15

### Added
- Passkey authentication (WebAuthn)
- CSV data export from admin panel
- Multi-language support: French and Portuguese

### Changed
- Full-text search 3x faster (GIN indices in PostgreSQL)
- Pagination limit increased from 50 to 200 results
- Structured logs in JSON format with correlation IDs

### Fixed
- #456: 500 error creating account with email > 50 chars
- #459: Push notifications not sent on iOS 17.4+
- #462: Notification counter did not reset
- #465: Timestamps showed incorrect timezone

### Security
- Updated JWT library 2.1.0 -> 2.3.0 (CVE-2026-1234)
- Origin validation to prevent CSRF
- Automatic secret rotation every 90 days

### Breaking
- API v1 deprecated (remove in v3.0)
- user.name field removed (use user.firstName and user.lastName)

## [2.4.0] - 2026-06-15

### Added
- Real-time metrics dashboard
- Webhooks for payment events
- Transaction status query API

### Fixed
- #401: Race condition in concurrent payment processing
- #405: Memory leak in notification worker

## [2.3.0] - 2026-05-15

### Added
- Support for multiple payment methods per customer
- Automated monthly reports

### Changed
- Migration from Express to Fastify (20% performance improvement)
```


## Variants

### Library changelog

For libraries and SDKs, include migration code snippets for breaking changes. Link to migration guides. Note minimum language/runtime version requirements for each release.

### Internal service changelog

For internal services, add deployment context: which environments received the release, feature flags enabled, and links to monitoring dashboards. Operators need to trace what changed in their environment.

### Monorepo changelog

In a monorepo, maintain separate changelogs per package or use a unified changelog with package tags. Tools like `changesets` and `lerna` manage per-package versioning and changelog generation.

## Frequently Asked Questions

### What format should a changelog follow?

Use the Keep a Changelog format with categories: Added, Changed, Deprecated, Removed, Fixed, and Security. Date every release in ISO 8601 format and link to issues or PRs when applicable.

### Should I include every commit in the changelog?

No. A changelog is curated, not a raw git log. Include only notable changes that affect users: new functionality, bug fixes, breaking changes, and security patches.

### What is semantic versioning?

[Semantic Versioning](/guides/api/rest-api-design-guide) (SemVer) uses MAJOR.MINOR.PATCH format: increment MAJOR for breaking changes, MINOR for new functionality, and PATCH for bug fixes.

### Should the Unreleased section be empty between releases?

No. Add entries to Unreleased as you merge PRs. This way, when you cut a release, you just change the header from `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD` and add a new empty `[Unreleased]` section.

### How do I handle pre-release versions?

Use semver pre-release labels: `1.0.0-alpha.1`, `1.0.0-beta.2`, `1.0.0-rc.1`. Document them in the changelog with their own section and date. Mark them clearly as pre-release so users know they may contain bugs.

### Should I keep old entries forever?

Yes. The changelog is a historical record. Users upgrading from v1.0 to v3.0 need to read all intermediate changes. If the file gets too long, consider splitting by major version (`CHANGELOG-v1.md`, `CHANGELOG-v2.md`) with an index.


### How do we keep the changelog consistent?

Use the Keep a Changelog format: Added, Changed, Fixed, Breaking, and Security sections. Each entry should be one line that a non-technical user can understand. Include the issue or PR number for traceability. Use imperative language: "Add" not "Added." Group changes by version with date. Maintain an [Unreleased] section for changes going in the next release. Each release moves changes from [Unreleased] to a new section with version and date. Never edit past version entries — if you need to correct something, create a new entry. The changelog should be generated or reviewed at each release — do not leave it for the end.

### How do we automate the changelog?

Use conventional commits so the changelog can be generated from commits. Tools like changesets, semantic-release, or auto can generate the changelog automatically. Configure CI so each PR adds an entry to the [Unreleased] section. For more control: use a CHANGELOG.md file that engineers update manually in each PR. Use a linter that verifies the changelog has entries for each release. For open source: publish the changelog on GitHub Releases in addition to the file. Automation reduces work but the Product Owner should review that entries are understandable for users.
