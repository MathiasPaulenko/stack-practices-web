---
contentType: docs
slug: dependency-upgrade-template
title: "Dependency Upgrade Runbook"
description: "A step-by-step runbook for upgrading project dependencies safely."
metaDescription: "Follow this dependency upgrade runbook to update packages, test for breaking changes, and roll back safely if issues arise."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - dependencies
  - upgrade
  - runbook
  - maintenance
relatedResources:
  - /docs/runbook-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/changelog-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Follow this dependency upgrade runbook to update packages, test for breaking changes, and roll back safely if issues arise."
  keywords:
    - devops
    - dependencies
    - upgrade
    - runbook
    - maintenance
---
## Overview

Outdated dependencies expose projects to security vulnerabilities, compatibility issues, and missing capabilities. This runbook provides a repeatable process for upgrading dependencies safely with minimal risk.

## When to Use

Use this resource when:
- A critical security patch is released for a direct or transitive dependency
- Major version upgrades are required for long-term support
- Quarterly or sprint-based maintenance windows for dependency refreshes

## Solution

```markdown
# Dependency Upgrade Runbook

## 1. Preparation

- [ ] Identify the dependency and target version
- [ ] Review the changelog / release notes for breaking changes
- [ ] Check open issues in the dependency repository for upgrade-related bugs
- [ ] Create a dedicated branch: `deps/upgrade-<name>-<version>`
- [ ] Ensure CI is green on the current main branch

## 2. Upgrade

- [ ] Update the version in `package.json`, `requirements.txt`, `pom.xml`, etc.
- [ ] Run the dependency installation command
- [ ] Check for peer dependency warnings or conflicts
- [ ] Run automated tests (unit, integration, lint)
- [ ] Run smoke tests against a local or staging environment

## 3. Validation

- [ ] Review test coverage reports for regressions
- [ ] Check application logs for new warnings or errors
- [ ] Verify critical user paths manually if behavior changed
- [ ] Run security scan (`npm audit`, `safety check`, OWASP dependency check)

## 4. Rollback Plan

- [ ] Tag the last known good commit before merge
- [ ] Document any manual data or config changes required
- [ ] Confirm rollback can be executed within 15 minutes

## 5. Merge & Monitor

- [ ] Open a pull request with changelog summary
- [ ] Deploy to staging and let it soak for 24 hours
- [ ] Deploy to production during low-traffic window
- [ ] Monitor error rates and latency for 48 hours post-deploy
```

## Explanation

The runbook breaks upgrades into **five phases** to reduce risk. Preparation prevents surprises by reviewing changelogs. The Upgrade phase isolates changes in a branch. Validation uses automated and manual checks. The Rollback Plan ensures fast recovery. Merge & Monitor completes the cycle with production observation.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Security patch | Fast-track branch | Skip soak time only for CVEs with active exploits |
| Major version | Feature-flag rollout | Isolate new behavior behind flags during transition |
| Monorepo | Batch upgrades | Upgrade shared libs first, then consumers |

## What works

1. Upgrade one major dependency at a time to simplify debugging
2. Pin exact versions in lock files (`package-lock.json`, `poetry.lock`) and commit them
3. Use automated tools like Dependabot or Renovate for patch and minor upgrades
4. Maintain a deprecation calendar for end-of-life dependencies
5. Document all breaking changes and migration steps in the pull request

## Common Mistakes

1. Upgrading multiple major dependencies simultaneously, making failures hard to attribute
2. Ignoring peer dependency warnings that cause runtime errors
3. Skipping the rollback plan, extending downtime when issues surface
4. Not reviewing transitive dependency changes in lock files
5. Deploying during peak traffic without a soak period

## Frequently Asked Questions

### How often should I upgrade dependencies?

Patch versions: weekly or automated. Minor versions: monthly. Major versions: quarterly or when required.

### What if a transitive dependency has a CVE?

Use `npm audit fix`, `pip-audit`, or override/resolution fields to force a patched transitive version without waiting for the direct dependency.

### Should I commit lock files?

Yes. Lock files ensure reproducible builds across environments and make diffs reviewable during upgrades.

## Advanced Solutions

### Automated dependency upgrade pipeline with Renovate

Configure Renovate to automate patch and minor upgrades with auto-merge rules:

```json
{
  "extends": ["config:base"],
  "schedule": ["before 6am on Monday"],
  "automerge": true,
  "automergeType": "pr",
  "packageRules": [
    {
      "updateTypes": ["patch", "minor"],
      "automerge": true,
      "groupName": "patch and minor updates"
    },
    {
      "updateTypes": ["major"],
      "automerge": false,
      "labels": ["major-upgrade", "needs-review"],
      "dependencyDashboardApproval": true
    },
    {
      "depTypeList": ["devDependencies"],
      "automerge": true,
      "schedule": ["at any time"]
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"],
    "schedule": ["at any time"]
  }
}
```

### Rollback script for npm upgrades

A bash script to quickly revert a failed dependency upgrade:

```bash
#!/bin/bash
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)
TAG="pre-upgrade-$(date +%Y%m%d-%H%M%S)"

# Create a safety tag before proceeding
git tag "$TAG"
echo "Created safety tag: $TAG"

# If upgrade fails, rollback:
# git checkout "$TAG" -- package.json package-lock.json
# npm ci
# git checkout main
# git branch -D "$BRANCH"
# git tag -d "$TAG"

echo "To rollback: git checkout $TAG -- package.json package-lock.json && npm ci"
```

### Python dependency upgrade with pip-tools

Use `pip-tools` to manage pinned requirements with separate source and locked files:

```bash
#!/bin/bash
set -euo pipefail

# requirements.in contains unpinned or loosely pinned deps
# requirements.txt is the locked, fully resolved output

# Upgrade a single package to a specific version
echo "package-name==2.0.0" >> requirements.in

# Recompile locked requirements
pip-compile --upgrade-package package-name --output-file requirements.txt requirements.in

# Verify no conflicting transitive deps
pip install -r requirements.txt --dry-run

# Run tests
pytest tests/ -x

# If all passes, commit both files
git add requirements.in requirements.txt
git commit -m "deps: upgrade package-name to 2.0.0"
```

### Dependency audit dashboard with npm audit + cyclonedx

Generate an SBOM (Software Bill of Materials) and audit report for compliance:

```bash
#!/bin/bash
set -euo pipefail

# Generate CycloneDX SBOM
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# Run audit and export JSON
npm audit --json > audit-report.json

# Extract high and critical vulnerabilities
node -e "
const audit = require('./audit-report.json');
const vulns = audit.vulnerabilities || {};
const high = Object.entries(vulns).filter(([k,v]) => v.severity === 'high' || v.severity === 'critical');
if (high.length > 0) {
  console.log('HIGH/CRITICAL vulnerabilities:');
  high.forEach(([name, info]) => console.log('  ' + name + ': ' + info.severity));
  process.exit(1);
} else {
  console.log('No high or critical vulnerabilities found.');
}
"
```

## Additional Best Practices

1. **Use `npm ci` instead of `npm install` in CI.** The `ci` command deletes `node_modules` and installs exactly from the lock file. It fails if lock file is out of sync with `package.json`, catching incomplete upgrades:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: npm ci
```

2. **Set up Dependabot security alerts as required checks.** Configure branch protection rules so that security PRs from Dependabot bypass review requirements but still need CI to pass:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      patch-and-minor:
        update-types: ["patch", "minor"]
```

## Additional Common Mistakes

1. **Upgrading devDependencies without testing the build pipeline.** Dev dependencies like webpack, babel, or eslint can break the build output even if tests pass. Always run a full production build after upgrading devDependencies:

```bash
npm run build && npm run test
```

2. **Ignoring deprecation warnings during upgrades.** Deprecation warnings in one minor version often become errors in the next major version. Track them in your issue tracker:

```bash
# Capture deprecation warnings during test runs
npm test 2>&1 | grep -i "deprecat" > deprecation-warnings.txt
```

## Additional Frequently Asked Questions

### How do I handle a dependency that is no longer maintained?

If the dependency is unmaintained, evaluate alternatives, fork it if the license allows, or vendor it into your codebase. Add it to your deprecation calendar with a target replacement date. Run a security scan on the last published version to identify known vulnerabilities.

### What is the difference between tilde (`~`) and caret (`^`) in semver?

Caret (`^`) allows updates to any version that does not modify the left-most non-zero digit. Tilde (`~`) allows patch-level changes only. For example, `^1.2.3` allows `1.x.x` while `~1.2.3` allows `1.2.x`. Use caret for most dependencies and tilde for critical packages where you want tighter control.

### Should I use a monorepo tool for dependency management?

Monorepo tools like Nx, Turborepo, or Lerna provide workspace-level dependency hoisting, caching, and batch upgrade commands. They help when multiple packages share dependencies and you need to coordinate upgrades across them. For smaller projects, a single `package.json` with standard tooling is sufficient.
