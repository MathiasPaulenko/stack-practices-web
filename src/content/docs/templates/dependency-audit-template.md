---
contentType: docs
slug: dependency-audit-template
templateType: guideline
title: "Third-Party Dependency Audit Template"
description: "A template for auditing third-party dependencies: license compliance, security vulnerabilities, maintenance health, and supply chain risk."
metaDescription: "Dependency audit template: evaluate third-party libraries for license compliance, security vulnerabilities, maintenance health, and supply chain risk."
difficulty: intermediate
topics:
  - security
tags:
  - dependency-audit
  - supply-chain
  - license-compliance
  - vulnerability-scanning
  - template
relatedResources:
  - /guides/security/web-application-security-guide
  - /guides/devops/cicd-pipeline-guide
  - /docs/templates/security-incident-response-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Dependency audit template: evaluate third-party libraries for license compliance, security vulnerabilities, maintenance health, and supply chain risk."
  keywords:
    - dependency audit template
    - third party library audit
    - supply chain security
    - license compliance check
    - vulnerability assessment dependencies
---

# Third-Party Dependency Audit Template

Use this template to evaluate libraries before adding them or during periodic audits.

## Template

```markdown
# Dependency Audit: [Library Name]

## Overview
| Field | Value |
|-------|-------|
| **Library** | [name] v[x.y.z] |
| **Purpose** | [what problem it solves] |
| **Replaces** | [internal code / another library] |
| **Auditor** | [name] |
| **Date** | [YYYY-MM-DD] |

## Security

| Check | Result | Evidence |
|-------|--------|----------|
| Known CVEs | [none / list] | Snyk / OSV report link |
| SAST available | [yes / no] | Link to security audit |
| Bug bounty program | [yes / no] | Link |
| Release signing | [yes / no] | GPG / Sigstore verification |

## Maintenance Health

| Metric | Value | Threshold |
|--------|-------|-----------|
| Last release | [date] | < 12 months |
| Open issues | [count] | < 500 |
| Open PRs | [count] | < 100 |
| Contributors | [count] | > 2 (bus factor) |
| License | [SPDX identifier] | [approved list] |

## Supply Chain Risk

| Check | Result |
|-------|--------|
| Download count | [npm / PyPI stats] |
| Corporate backing | [yes / no — who] |
| Transitive dependencies | [count] |
| Native code / compiled binaries | [yes / no] |

## Decision

| Outcome | Conditions |
|---------|-----------|
| **Approved** | All checks pass |
| **Approved with monitoring** | Minor risks, track quarterly |
| **Rejected** | Critical risk, find alternative |
```

## Red Flags

| Flag | Action |
|------|--------|
| No release in 2+ years | Find actively maintained alternative |
| Single maintainer | High bus factor risk; consider forking or replacing |
| Copyleft license (GPL) | Legal review required for commercial use |
| Native binaries without reproducible builds | Supply chain attack risk |
| > 100 transitive dependencies | Each is a new attack surface |

## Best Practices

- **Audit before adding** — retroactive audits discover problems too late
- **Automate scanning** — Dependabot, Snyk, or OWASP Dependency-Check in CI
- **Pin versions** — lockfiles prevent silent upgrades to compromised versions
- **Review license compatibility** — AGPL in a SaaS backend is a legal risk
- **Track deprecation** — libraries die slowly; monitor health quarterly

## Common Mistakes

- Adding dependencies for trivial functionality — "left-pad" incidents happen
- Ignoring transitive dependencies — the dependency tree is your attack surface
- Not updating after audit — a clean report today means nothing in 6 months
- Blind trust in popular packages — popularity does not equal security

## Frequently Asked Questions

### How often should I audit dependencies?

New dependencies before adding. Existing dependencies quarterly. Critical dependencies monthly. After any security incident involving a dependency, audit all dependencies in the same ecosystem.

### What license is safe for commercial use?

MIT, Apache-2.0, and BSD are generally safe. GPL requires legal review if you distribute the software. AGPL is risky for SaaS. Always confirm with your legal team.

### Should I fork a library instead of using it directly?

Fork only if you need customization that the upstream will not accept. Forking shifts maintenance burden to your team. Prefer contributing upstream or wrapping the library.
