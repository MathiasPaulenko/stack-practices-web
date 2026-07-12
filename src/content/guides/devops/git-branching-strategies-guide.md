---




contentType: guides
slug: git-branching-strategies-guide
title: "Git Branching Strategies: A Practical Guide"
description: "Compare trunk-based development, GitFlow, and GitHub Flow. Choose the right branching strategy for your team size, release cadence, and CI/CD maturity."
metaDescription: "Git branching strategies guide: trunk-based development, GitFlow, GitHub Flow. Choose the right model for your team and CI/CD pipeline."
difficulty: beginner
topics:
  - devops
tags:
  - branching
  - devops
  - git
  - guide
  - ci-cd
relatedResources:
  - /guides/cicd-pipeline-guide
  - /guides/docker-for-developers-guide
  - /guides/testing-strategy-guide
  - /recipes/git-rebase-interactive-tutorial
  - /docs/pull-request-template
  - /guides/technical-documentation-strategy-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Git branching strategies guide: trunk-based development, GitFlow, GitHub Flow. Choose the right model for your team and CI/CD pipeline."
  keywords:
    - git branching strategy
    - gitflow vs github flow
    - trunk based development
    - git branching model
    - feature branches
    - release branches




---

# Git Branching Strategies

## Introduction

A branching strategy defines how your team uses Git branches to develop, integrate, and release code. The right strategy depends on your team size, release frequency, and CI/CD maturity. This guide compares the three most common approaches.

## Trunk-Based Development

In trunk-based development, developers commit directly to a single main branch (the "trunk") using short-lived change branches or direct commits with feature flags.

### Workflow

```bash
# Pull latest main
git pull origin main

# Create a short-lived branch (hours to a day)
git checkout -b feature/login-button

# Make changes, commit frequently
git commit -m "feat: add login button"

# Open a PR, get reviewed, merge quickly
git push origin feature/login-button
# PR merged via squash or rebase
```

### Characteristics

- **Branch lifespan**: Hours to 1-2 days maximum
- **Main branch**: Always deployable
- **Feature flags**: Incomplete changes are hidden behind toggles
- **CI/CD**: Fast feedback loops; main branch deploys automatically

### Pros and Cons

| Pros | Cons |
|------|------|
| Minimal merge conflicts | Requires mature CI/CD |
| Fast feedback | Requires feature flags |
| Simple mental model | Less suitable for long-running changes |
| Ideal for continuous delivery | Requires team discipline |

### Best For

- Teams practicing continuous delivery
- Microservices with independent deployability
- Organizations with strong automated testing

## GitFlow

GitFlow is a strict branching model with dedicated branches for capabilities, releases, and hotfixes.

### Branch Structure

```
main        ───●────────────────────●─────
                ↑                    ↑
release/1.0  ───┘──●──●──┘
                    ↑
develop    ───●────●────●────●────●────●───
              ↑    ↑    ↑    ↑
feature/a  ───┘────┘
feature/b  ────────────┘────┘
```

### Workflow

```bash
# Start a feature from develop
git checkout develop
git checkout -b feature/user-profile

# Finish feature, merge to develop
git checkout develop
git merge --no-ff feature/user-profile

# Start a release
git checkout -b release/1.2.0 develop
# Bump version, fix last bugs
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0

# Hotfix from main
git checkout -b hotfix/1.2.1 main
# Fix, merge to main and develop
git checkout main && git merge hotfix/1.2.1
git checkout develop && git merge hotfix/1.2.1
```

### Characteristics

- **Main branch**: Only production code; tagged releases
- **Develop branch**: Integration branch for capabilities
- **Change branches**: Spawned from develop
- **Release branches**: Prepare and stabilize releases
- **Hotfix branches**: Emergency fixes from main

### Pros and Cons

| Pros | Cons |
|------|------|
| Clear separation of concerns | Complex; steep learning curve |
| Supports scheduled releases | Long-lived branches = merge hell |
| Parallel feature development | Slower integration feedback |
| Hotfix isolation | Overkill for small teams |

### Best For

- Teams with scheduled releases (weekly/monthly)
- Monolithic applications requiring staged rollouts
- Organizations with formal QA/UAT processes

## GitHub Flow

GitHub Flow is a lightweight variant of trunk-based development optimized for GitHub's pull request workflow.

### Workflow

```bash
# Create a feature branch from main
git checkout -b feature/add-search

# Push and open a PR
git push -u origin feature/add-search

# CI runs automated tests on the PR
# Code review happens in the PR
# Squash and merge when approved

# Delete branch after merge
git push origin --delete feature/add-search
```

### Characteristics

- **Single main branch**: Always deployable
- **Change branches**: Created from main, merged via PR
- **PR as the unit of work**: Review, CI, discussion in one place
- **Deploy on merge**: Main branch deploys automatically

### Pros and Cons

| Pros | Cons |
|------|------|
| Simple and intuitive | Main branch must be always deployable |
| Great for GitHub-centric teams | No built-in release staging |
| Fast PR review cycle | Less structured than GitFlow |
| Perfect for CI/CD integration | Requires good test coverage |

### Best For

- SaaS products with continuous deployment
- Small to medium teams using GitHub
- Projects where every merge should be releasable

## Comparison Summary

| Aspect | Trunk-Based | GitFlow | GitHub Flow |
|--------|-------------|---------|-------------|
| **Complexity** | Low | High | Low |
| **Release model** | Continuous | Scheduled | Continuous |
| **Branch lifetime** | Hours | Days/weeks | Hours-days |
| **Team size** | Any (with discipline) | Large teams | Small-medium |
| **CI/CD requirement** | Mature pipeline | Optional | Required |
| **Merge conflicts** | Rare | Common | Rare |
| **Rollback** | Feature flags | Revert commits | Revert commits |

## What Works

- **Keep branches short-lived** — the longer a branch lives, the harder the merge
- **Use feature flags** for incomplete capabilities on main/trunk
- **Require [PR reviews](/guides/design/code-review-best-practices-guide)** before merging to main
- **Run full test suite** on every PR; block merge on failure. See [CI/CD](/guides/devops/cicd-pipeline-guide).
- **Squash or rebase** to keep a linear history (team preference)
- **Tag releases** on main for traceability
- **Protect main/develop** branches with branch protection rules

## Common Mistakes

- Allowing long-lived feature branches that diverge considerably
- Not deleting merged branches, cluttering the repository
- Using GitFlow for a SaaS product that deploys multiple times a day. See [deployment strategies](/guides/devops/deployment-strategies-guide).
- Merging without review or CI checks
- Not tagging releases, making rollbacks difficult

## Frequently Asked Questions

**Q: Can I mix GitFlow and GitHub Flow?**
A: Yes. Some teams use GitHub Flow for day-to-day development and GitFlow-style release branches only for major version releases.

**Q: How do I handle hotfixes in GitHub Flow?**
A: Create a hotfix branch from main, fix, PR, merge, and deploy immediately. The key is that main is always releasable.

**Q: Is trunk-based development the same as continuous deployment?**
A: Not exactly, but they go hand in hand. Trunk-based development is a prerequisite for continuous deployment, but you still need automated tests, feature flags, and monitoring.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Trunk-Based Development for 20 Teams

```text
System: Monorepo, 20 teams, 200 services
Strategy: Trunk-based development with feature flags

Daily flow:
  1. Developer creates feature branch from main
     git checkout -b feature/payment-v2
  2. Develops locally with tests
  3. Push daily (keep branches short-lived, < 3 days)
  4. Opens PR when tests pass
  5. Review: 1 approver + CI green
  6. Squash merge to main
  7. Auto-deploy to staging from main
  8. Canary to production via feature flag

Feature flags (LaunchDarkly / Unleash):
  // Deploy inactive code to production
  if (featureFlag.isEnabled("payment-v2", user)) {
    return processPaymentV2(payment);
  } else {
    return processPaymentV1(payment);
  }

  // Gradual rollout:
  // 1% -> 5% -> 25% -> 50% -> 100%
  // Instant rollback: flag off

Branching rules:
  | Rule | Reason |
  |------|--------|
  | Branches < 3 days | Reduces merge conflicts |
  | Max 400 lines per PR | Quality reviews |
  | Squash merge | Clean linear history |
  | CI mandatory | No merging broken code |
  | 1 approver minimum | Peer review |
  | Feature flags for risk | Decouple deploy from release |
  | No release branches | Deploy from main |

Strategy comparison:
  | Strategy | Teams | Deploy frequency | Complexity |
  |----------|-------|-------------------|------------|
  | GitFlow | 1-5 | Weekly | High |
  | GitHub Flow | 5-20 | Daily | Medium |
  | Trunk-based | 20+ | Multiple per day | Low |
  | Release Flow | 10-50 | Weekly + hotfix | Medium |

Lessons:
  - Trunk-based + feature flags is the modern standard
  - Short branches reduce conflicts and bugs
  - Feature flags decouple deploy from release
  - Squash merge keeps history clean
  - CI green mandatory before merge
```

### How do I handle hotfixes in trunk-based?

Create a branch from the latest release tag. Apply the fix. Open a PR directly to main. Once merged, cherry-pick to the release tag and create a new tag. If you use feature flags, simply enable the flag for the fix. Most hotfixes do not need a release branch if you deploy from main continuously.
