---



contentType: docs
slug: git-branching-strategy-document
title: "Git Branching Strategy Document"
description: "A document template for defining Git workflow, branching conventions, merge requirements, and release procedures for engineering teams."
metaDescription: "Define your team's Git workflow with this branching strategy document. Covers branch naming, merge requirements, release procedures, and rollback practices."
difficulty: beginner
topics:
  - devops
  - architecture
tags:
  - git
  - branching
  - workflow
  - version-control
  - ci-cd
  - standards
relatedResources:
  - /docs/engineering-handbook-template
  - /docs/code-review-checklist-template
  - /docs/deployment-checklist-template
  - /docs/onboarding-checklist-backend-engineer
  - /recipes/git-rebase-interactive-tutorial
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define your team's Git workflow with this branching strategy document. Covers branch naming, merge requirements, release procedures, and rollback practices."
  keywords:
    - git branching strategy
    - git workflow
    - branch naming convention
    - merge strategy
    - release process



---

## Overview

Every team that uses Git without a documented branching strategy eventually creates chaos. Developers branch from the wrong place, hotfixes bypass review, release tags are inconsistent, and rolling back becomes a guessing game. A branching strategy document defines how your team uses Git: where branches come from, how they get merged, who can approve, and how releases happen. It turns Git from a free-for-all into a predictable, teachable process.

## When to Use


- For alternatives, see [Engineering Handbook Template](/docs/engineering-handbook-template/).

Use this document when:
- Your team has more than two developers committing to the same repository
- You need to support multiple concurrent releases or environments
- Hotfixes frequently conflict with ongoing development
- New team members struggle to understand how to contribute
- Your CI/CD pipeline requires specific branch patterns to trigger deployments

## Prerequisites

Before defining the strategy:
- [ ] Understand your release cadence (continuous, daily, weekly, milestone)
- [ ] Know your deployment environments and how code reaches them
- [ ] Decide whether you need to support multiple production versions simultaneously
- [ ] Confirm your CI/CD system can trigger on branch patterns or tags
- [ ] Align with product on rollback expectations and hotfix turnaround time

## Solution

```markdown
# Git Branching Strategy: `<Project/Team Name>`

> Version: ______ | Last updated: ______ | Owner: ______

---

## 1. Branch Types

### Main Branches

| Branch | Purpose | Protection | Lifespan |
|--------|---------|------------|----------|
| `main` | Production-ready code | Requires PR + 2 approvals + CI pass | Permanent |
| `staging` | Pre-production validation | Requires PR + 1 approval + CI pass | Permanent |
| `develop` | Integration branch for features | Requires PR + 1 approval + CI pass | Permanent |

### Supporting Branches

| Prefix | Purpose | Source | Merge Target | Naming |
|--------|---------|--------|--------------|--------|
| `feature/` | New functionality | `develop` | `develop` | `feature/TICKET-short-description` |
| `bugfix/` | Non-urgent fixes | `develop` | `develop` | `bugfix/TICKET-short-description` |
| `hotfix/` | Production-critical fixes | `main` | `main` + `develop` | `hotfix/TICKET-short-description` |
| `release/` | Release preparation | `develop` | `main` + `staging` | `release/v1.2.3` |
| `chore/` | Maintenance, dependencies | `develop` | `develop` | `chore/TICKET-short-description` |
| `docs/` | Documentation only | `develop` | `develop` | `docs/TICKET-short-description` |

---

## 2. Workflow

### Feature Development

```bash
# 1. Start from latest develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/PROJ-123-add-user-auth

# 3. Work and commit locally
git commit -m "feat: add OAuth2 login endpoint"
git commit -m "test: add auth integration tests"

# 4. Push and open PR when ready
git push origin feature/PROJ-123-add-user-auth
# Open PR to develop, fill out template

# 5. After approval and CI green, merge
git checkout develop
git merge --no-ff feature/PROJ-123-add-user-auth
# Or use squash merge via GitHub/GitLab UI
```

### Hotfix Workflow

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create hotfix branch
git checkout -b hotfix/PROJ-456-fix-payment-webhook

# 3. Fix, test, commit
git commit -m "fix: validate webhook signature before processing"

# 4. Open PR to main (expedited review)
git push origin hotfix/PROJ-456-fix-payment-webhook
# Request emergency review; target: main

# 5. After merge to main, backport to develop
git checkout develop
git cherry-pick <hotfix-commit>
# Or merge main into develop
```

### Release Workflow

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.3

# 2. Version bump, update changelog, final QA
git commit -m "chore: bump version to 1.2.3"

# 3. Merge to staging for final validation
git checkout staging
git merge --no-ff release/v1.2.3

# 4. After staging validation, merge to main
git checkout main
git merge --no-ff release/v1.2.3

# 5. Tag the release
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# 6. Merge back to develop to capture release commits
git checkout develop
git merge --no-ff main
```

---

## 3. Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Use For | Triggers Release |
|------|---------|----------------|
| `feat` | New feature | Minor |
| `fix` | Bug fix | Patch |
| `docs` | Documentation only | None |
| `style` | Formatting, missing semicolons | None |
| `refactor` | Code change without behavior change | None |
| `perf` | Performance improvement | Patch |
| `test` | Adding or correcting tests | None |
| `chore` | Build process, dependencies | None |
| `ci` | CI/CD changes | None |
| `revert` | Reverting previous commit | Patch |

### Examples

```
feat(auth): add Google OAuth2 login

Implements OAuth2 flow with PKCE for web clients.
Closes PROJ-123

fix(payments): validate webhook signature

Prevents replay attacks by verifying Stripe signature
header before processing events.

Closes PROJ-456
```

---

## 4. Merge Requirements

### Pull Request Requirements

| Requirement | Feature/Bugfix | Hotfix | Release |
|-------------|---------------|--------|---------|
| CI passes | Required | Required | Required |
| Review approvals | 2 | 1 (expedited) | 2 |
| Linked ticket | Required | Required | Required |
| Tests added | Required | Required | N/A |
| Documentation updated | If feature changes | If behavior changes | Changelog updated |
| Security review | If auth/data changes | Required | N/A |

### Merge Strategies

| Target Branch | Strategy | Rationale |
|---------------|----------|-----------|
| `develop` | Squash and merge | Clean history; one commit per feature |
| `main` | Merge commit | Preserves release branch history |
| `hotfix` to `main` | Merge commit | Preserves hotfix identification |

---

## 5. Tagging and Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking API changes
- **MINOR**: New capabilities, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Tag Format

```bash
# Production releases
git tag -a v1.2.3 -m "Release v1.2.3"

# Pre-releases
git tag -a v1.2.3-rc.1 -m "Release candidate 1"

# Hotfixes
git tag -a v1.2.4 -m "Hotfix: fix payment webhook validation"
```

### Version Bump Rules

| Commit Type | Version Bump |
|-------------|-------------|
| `feat` | Minor (x.Y.z) |
| `fix`, `perf`, `revert` | Patch (x.y.Z) |
| `feat` with `BREAKING CHANGE` | Major (X.y.z) |
| `docs`, `style`, `refactor`, `test`, `chore`, `ci` | None |

---

## 6. Rollback Procedures

### Rolling Back a Deployment

```bash
# Identify last known good tag
git log --oneline --decorate --tags

# Revert to previous tag
git checkout v1.2.2

# Create hotfix branch for rollback
git checkout -b hotfix/rollback-v1.2.3

# Deploy rollback
git push origin hotfix/rollback-v1.2.3
# Open emergency PR to main
```

### Reverting a Merge

```bash
# Find the merge commit
git log --oneline --merges

# Revert the merge (creates new revert commit)
git revert -m 1 <merge-commit-hash>

# Open PR with revert commit
```

---

## 7. Protection Rules

### Branch Protection (GitHub/GitLab)

| Rule | main | staging | develop |
|------|--------|---------|---------|
| Require PR | Yes | Yes | Yes |
| Required approvals | 2 | 1 | 1 |
| Dismiss stale approvals | Yes | Yes | No |
| Require status checks | Yes | Yes | Yes |
| Include administrators | Yes | Yes | No |
| Require linear history | No | No | Yes |
| Allow force push | No | No | No |
| Allow deletions | No | No | No |
```

## Explanation

The document separates branching strategy into **branch types** (what they are called and what they are for), **workflow** (how to create and merge them), **commit conventions** (how to describe changes), and **protection rules** (how to prevent accidents). The key principle is that every branch has exactly one purpose and exactly one merge target. Ambiguity about where branches come from and where they go creates the merge conflicts and deployment errors that slow teams down.

## Variants

| Strategy | Best For | Trade-off |
|----------|----------|-----------|
| GitFlow (as above) | Scheduled releases, multiple versions | More branches, more process |
| GitHub Flow (main + feature) | Continuous deployment, single version | Simpler, but no release staging |
| Trunk-based (main only) | High-velocity CD, feature flags | Requires mature CI/CD and feature flags |
| Release branching (per version) | Products with LTS versions | More backporting overhead |

## What Works

1. **Automate enforcement** — branch protection rules and CI checks catch mistakes before merge
2. **Keep branches short-lived** — feature branches older than a week create integration risk
3. **Tag every release** — tags are the only reliable way to identify what is in production
4. **Require ticket links** — commits without context are useless for postmortems
5. **Document exceptions** — if someone bypasses process, document why and whether it was the right call

## Common Mistakes

1. **Allowing direct pushes to main** — even senior engineers make mistakes; branch protection is non-negotiable
2. **Not backporting hotfixes to develop** — the same bug ships in the next release
3. **Inconsistent branch naming** — makes automation and human scanning harder
4. **Squash-merging hotfixes** — loses the ability to cherry-pick or identify the fix commit
5. **Not deleting merged branches** — clutter makes it harder to find active work

## Frequently Asked Questions

### Should we use GitFlow, GitHub Flow, or trunk-based development?

GitFlow works well for teams with scheduled releases and a need for release stabilization. GitHub Flow (main + feature branches only) is simpler and works for continuous deployment. Trunk-based requires the most maturity — feature flags, thorough automated testing, and fast CI/CD. Most teams should start with GitHub Flow and adopt GitFlow only when release management complexity demands it.

### How do we handle long-running feature branches?

Avoid them. If a feature takes more than a week, split it into smaller deliverables behind feature flags. If unavoidable, rebase the feature branch onto develop daily to prevent integration nightmares. The cost of resolving a week-old merge conflict is exponentially higher than a daily rebase.

### What if a hotfix conflicts with work already in develop?

Resolve the conflict when backporting. The hotfix branch merges cleanly to main (it branched from main), but cherry-picking or merging to develop may conflict. Test the conflict resolution in a feature branch before merging to develop.
