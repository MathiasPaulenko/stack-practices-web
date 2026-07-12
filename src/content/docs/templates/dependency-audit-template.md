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
  - security
  - template
  - vulnerabilities
  - encryption
  - owasp
relatedResources:
  - /guides/web-application-security-guide
  - /guides/cicd-pipeline-guide
  - /docs/security-incident-response-template
  - /recipes/container-security
  - /recipes/data-privacy-gdpr
  - /recipes/security-headers
  - /docs/incident-response-playbook-template
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

Use this template to evaluate libraries before adding them or during periodic audits. See [Web Application Security Guide](/guides/security/web-application-security-guide) for broader security practices.

## Overview

Every third-party dependency is a security and maintenance liability. Dependencies ship with their own bugs, vulnerabilities, and licensing constraints. Without a structured audit process, teams accumulate libraries that are unmaintained, vulnerable, or legally incompatible with their product.

This template covers:

1. **Security** — known CVEs, SAST coverage, release signing
2. **Maintenance health** — release cadence, contributor count, bus factor
3. **Supply chain risk** — transitive dependencies, native code, corporate backing
4. **License compliance** — SPDX identifiers, copyleft detection
5. **Decision** — approved, approved with monitoring, or rejected

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

## Filled Example

```markdown
# Dependency Audit: fast-json-stringify v3.2.0

## Overview
| Field | Value |
|-------|-------|
| **Library** | fast-json-stringify v3.2.0 |
| **Purpose** | 2x faster JSON serialization for API responses |
| **Replaces** | JSON.stringify() in hot paths |
| **Auditor** | Jane Doe |
| **Date** | 2026-07-15 |

## Security

| Check | Result | Evidence |
|-------|--------|----------|
| Known CVEs | None | Snyk report 2026-07-15 |
| SAST available | Yes | CodeQL workflow in repo |
| Bug bounty program | No | N/A |
| Release signing | Yes | Sigstore provenance |

## Maintenance Health

| Metric | Value | Threshold |
|--------|-------|-----------|
| Last release | 2026-06-20 | < 12 months PASS |
| Open issues | 34 | < 500 PASS |
| Open PRs | 5 | < 100 PASS |
| Contributors | 18 | > 2 PASS |
| License | MIT | Approved list PASS |

## Supply Chain Risk

| Check | Result |
|-------|--------|
| Download count | 12M/week (npm) |
| Corporate backing | Yes — NearForm |
| Transitive dependencies | 3 |
| Native code / compiled binaries | No |

## Decision

| Outcome | Conditions |
|---------|-----------|
| **Approved** | All checks pass. Review at next quarterly audit. |
```

## When to Use

- **Before adding a new dependency** — audit before installing, not after
- **Quarterly dependency review** — schedule recurring audits for all dependencies
- **After a security incident** — audit all dependencies in the affected ecosystem
- **Before a release** — verify no new vulnerabilities were introduced
- **During due diligence** — audit dependencies before acquiring or merging with another company
- **When a dependency is deprecated** — audit alternatives before migrating

## Lifecycle

### Phase 1: Pre-adoption audit

Run the full audit before adding the dependency. Check security, maintenance health, supply chain risk, and license compliance. Document the decision in an ADR if the dependency is critical.

### Phase 2: Ongoing monitoring

Set up automated alerts for new vulnerabilities. Dependabot, Snyk, or GitHub security advisories notify you when a CVE is published for a dependency you use.

### Phase 3: Quarterly review

Re-audit all dependencies quarterly. Check if maintainers are still active, if the library is still the best option, and if newer alternatives offer better security or performance.

### Phase 4: Deprecation and replacement

When a dependency is deprecated or a better alternative emerges, plan the migration. Audit the replacement, create a migration plan, and remove the old dependency from the codebase.

## Red Flags

| Flag | Action |
|------|--------|
| No release in 2+ years | Find actively maintained alternative |
| Single maintainer | High bus factor risk; consider forking or replacing |
| Copyleft license (GPL) | Legal review required for commercial use |
| Native binaries without reproducible builds | Supply chain attack risk |
| > 100 transitive dependencies | Each is a new attack surface |

### How do I handle transitive dependencies with vulnerabilities?

Use `npm audit` or `pip-audit` to identify which transitive dependencies have vulnerabilities. If the direct dependency cannot update the transitive one, consider replacing the direct dependency or using a resolution override (npm `overrides` field, pip `constraints` file).

### What is the difference between a security audit and a dependency audit?

A security audit focuses on vulnerabilities (CVEs, exploits). A dependency audit is broader: it covers security, maintenance health, supply chain risk, license compliance, and code quality. Security is one dimension of a full dependency audit.

### Should I pin exact versions or use ranges?

For applications: pin exact versions (`package-lock.json`, `poetry.lock`). For libraries: use ranges (`^1.2.0`, `>=1.2,<2.0`). Pinning exact versions in applications ensures reproducible builds and prevents supply chain attacks via version substitution.

## Automation

### Dependabot (GitHub)

Configure `dependabot.yml` to scan for vulnerabilities and open PRs automatically:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### Snyk

Run `snyk test` in CI to fail builds on high-severity vulnerabilities. Use `snyk monitor` to track new vulnerabilities over time.

### OWASP Dependency-Check

Self-hosted scanner that checks dependencies against the NVD database. Integrates with Maven, Gradle, and Jenkins.

### Renovate Bot

Alternative to Dependabot with more configuration options: grouped updates, auto-merge rules, and multi-ecosystem support.

## What Works

- **Audit before adding** — retroactive audits discover problems too late
- **Automate scanning** — Dependabot, Snyk, or OWASP Dependency-Check in CI. See [CI/CD Pipeline Guide](/guides/devops/cicd-pipeline-guide) for integrating security scans.
- **Pin versions** — lockfiles prevent silent upgrades to compromised versions
- **Review license compatibility** — AGPL in a SaaS backend is a legal risk
- **Track deprecation** — libraries die slowly; monitor health quarterly
- **Document the decision** — keep audit records alongside ADRs in `docs/audits/`
- **Set up alerts** — subscribe to security advisories for critical dependencies

## Common Mistakes

- Adding dependencies for trivial functionality — "left-pad" incidents happen
- Ignoring transitive dependencies — the dependency tree is your attack surface
- Not updating after audit — a clean report today means nothing in 6 months
- Blind trust in popular packages — popularity does not equal security
- Not checking license compatibility before shipping — legal risk surfaces in due diligence
- Removing lockfiles to "simplify" — you lose reproducible builds and vulnerability pinning

## Variants

### Frontend dependency audit

For frontend projects, add checks for: bundle size impact, tree-shakeability, CSS injection risk, and accessibility compliance. Tools: Bundlephobia, webpack-bundle-analyzer.

### Container image audit

For Docker images, scan the base image and all installed packages. Tools: Trivy, Grype, Snyk Container. Check for root user, exposed ports, and secrets in layers.

### Monorepo dependency audit

For monorepos, audit shared dependencies across all packages. Use workspace-level lockfiles. Track which packages consume each dependency to assess blast radius.

## Frequently Asked Questions

### How often should I audit dependencies?

New dependencies before adding. Existing dependencies quarterly. Critical dependencies monthly. After any security incident involving a dependency, audit all dependencies in the same ecosystem. Follow [Security Incident Response Template](/docs/templates/security-incident-response-template) procedures.

### What license is safe for commercial use?

MIT, Apache-2.0, and BSD are generally safe. GPL requires legal review if you distribute the software. AGPL is risky for SaaS. Always confirm with your legal team.

### Should I fork a library instead of using it directly?

Fork only if you need customization that the upstream will not accept. Forking shifts maintenance burden to your team. Prefer contributing upstream or wrapping the library.

### What is a transitive dependency and why does it matter?

A transitive dependency is a library that your dependency depends on. If you install package A, and A depends on B, then B is a transitive dependency. Transitive dependencies are part of your attack surface — a vulnerability in B affects you even though you only installed A. Lockfiles and SBOMs (Software Bill of Materials) help track them.

### How do I handle a critical vulnerability in a dependency?

1. Check if a patched version exists and upgrade immediately
2. If no patch exists, check for a workaround or mitigation
3. If no workaround exists, evaluate replacing the dependency
4. Document the decision in a [Security Incident Response](/docs/templates/security-incident-response-template) if the vulnerability was exploited

### Should I use an SBOM (Software Bill of Materials)?

Yes. An SBOM lists every component in your software, including transitive dependencies and their versions. It helps track vulnerabilities and respond quickly to new CVEs. Tools: `cyclonedx`, `spdx-tools`, GitHub's dependency graph.

### How do I audit dependencies in a monorepo?

Audit at the workspace level first, then per-package. Use workspace-level lockfiles (`pnpm-lock.yaml`, `poetry.lock` at root). Track which packages consume each dependency to assess blast radius. Tools like `nx` and `turbo` can identify affected packages when a dependency changes.

### What is supply chain attack prevention?

Verify dependency provenance with Sigstore or GPG signatures. Use `npm ci` instead of `npm install` to respect lockfiles. Pin transitive dependencies with `overrides` or `resolutions`. Use a private registry proxy to block unexpected packages.

### Can I use a dependency with a permissive license in a commercial product?

MIT, Apache 2.0, and BSD licenses are generally safe for commercial use. Include the license text in your distribution. ISC and Unlicense are also safe. Always verify with legal counsel for edge cases. Keep a record of all approved licenses in your dependency policy.

### How often should I run automated dependency scans?

Run scans on every pull request via CI (e.g., Dependabot, Snyk). Schedule a full audit weekly. For critical projects, run daily scans. Review and triage findings weekly.
