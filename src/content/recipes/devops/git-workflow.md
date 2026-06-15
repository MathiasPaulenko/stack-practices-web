---
contentType: recipes
slug: git-workflow
title: "Git Workflow"
description: "A practical branching strategy for teams: feature branches, pull requests, and clean commit history."
metaDescription: "Learn a practical Git branching workflow for teams. Feature branches, pull requests, rebasing, and keeping a clean commit history."
difficulty: beginner
topics:
  - devops
tags:
  - git
  - workflow
  - branching
  - ci-cd
  - devops
relatedResources:
  - /recipes/docker-basics
  - /recipes/unit-testing
  - /recipes/github-actions
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn a practical Git branching workflow for teams. Feature branches, pull requests, rebasing, and keeping a clean commit history."
  keywords:
    - git workflow
    - branching strategy
    - feature branch
    - pull request
    - team collaboration
---

## Overview

A Git workflow defines how your team uses branches to manage parallel work, review changes, and keep the main branch stable. The workflow described here — often called "GitHub Flow" — is lightweight, scales from solo developers to large teams, and integrates naturally with CI/CD pipelines.

## When to Use

Use this workflow when:

- Working in a team where multiple developers touch the same codebase
- You want every change to be reviewed before it reaches production
- Your project deploys continuously from the main branch
- You need a clear rollback path when something goes wrong

## Solution

### Branching Model

```
main  ───────────────────────────────────────────►
       \
feature/login   ──────────►  (PR → review → merge)
       \
feature/payments  ────────►  (PR → review → merge)
```

### Daily Commands

```bash
# Start a new feature
$ git checkout main
$ git pull origin main
$ git checkout -b feature/description

# Make commits
$ git add .
$ git commit -m "feat: add password reset endpoint"

# Push and open a pull request
$ git push -u origin feature/description
# Open PR on GitHub, request review, wait for CI to pass

# After merge, clean up
$ git checkout main
$ git pull origin main
$ git branch -d feature/description
```

### Keeping a Clean History (optional)

```bash
# Before merging, rebase onto latest main
$ git fetch origin
$ git rebase origin/main

# If you have messy local commits, squash them
$ git rebase -i HEAD~3
# Change "pick" to "squash" for commits you want to combine
```

### Commit Message Convention (Conventional Commits)

```
feat: add user authentication
fix: resolve race condition in checkout
docs: update API reference for v2
refactor: extract payment service
```

## Explanation

- **`main` is always deployable**: only merge code that passes tests and review.
- **Feature branches isolate work**: each feature, bugfix, or experiment lives in its own branch.
- **Pull requests enforce quality**: code review catches bugs, shares knowledge, and keeps standards consistent.
- **Rebasing vs. merging**: rebasing rewrites your branch on top of `main` for a linear history; merging preserves the exact sequence of events. Use rebase for personal cleanup, merge for team history.

## Variants

| Model | Best For | Complexity |
|-------|----------|------------|
| GitHub Flow | Continuous deployment, small teams | Low |
| Git Flow | Scheduled releases, QA cycles | Medium |
| Trunk-based | Monorepos, very fast CI | Low |
| Release branches | Long-term support versions | Medium |

## Best Practices

- **Keep branches short-lived**: a branch open for weeks accumulates merge conflicts and stale code. Aim for days, not weeks.
- **Write meaningful commit messages**: explain *why*, not just *what*. Future you (and your teammates) will thank you.
- **Review your own PR first**: read the diff before requesting reviewers. You will catch obvious issues.
- **Automate with CI**: run lint, tests, and security scans on every pull request before anyone reviews.
- **Protect main**: require PR reviews, passing CI, and up-to-date branches before merging into `main`.

## Common Mistakes

- **Long-running branches**: the longer a branch lives, the harder it is to merge. Rebase frequently.
- **Committing to main directly**: even in a solo project, using branches keeps your history clean and rollback easy.
- **Giant pull requests**: PRs with hundreds of files are impossible to review well. Split large features into stacked PRs.
- **Ignoring merge conflicts**: resolving conflicts hastily without understanding both sides introduces bugs.
- **Messy commit history**: "fix", "fix again", "actually fix" makes `git blame` useless. Squash or amend before pushing.

## Frequently Asked Questions

**Q: Should I use merge or rebase?**
A: Use rebase to keep your feature branch up to date with `main` locally. Use merge (or squash-merge) when integrating the feature into `main` via a pull request. Never rebase branches that other people are working on.

**Q: How often should I commit?**
A: Commit whenever you reach a logical checkpoint — a working test, a completed function, a fixed bug. Frequent commits make reverting and reviewing easier.

**Q: What if I commit a secret (password, API key) to Git?**
A: Rotate the secret immediately — it is now in Git history. Use tools like `git-filter-repo` or BFG Repo-Cleaner to remove it from history, then force-push. Prevention beats cleanup: use pre-commit hooks with secret scanning.
