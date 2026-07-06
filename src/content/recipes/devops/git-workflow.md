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
  - devops
  - git
  - workflow
  - ci-cd
  - automation
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

- Working in a team where multiple developers touch the same codebase. See [GitHub Actions](/recipes/devops/github-actions) for CI/CD automation.
- You want every change to be reviewed before it reaches production. See [Unit Testing](/recipes/testing/unit-testing) for pre-merge validation.
- Your project deploys continuously from the main branch. See [Docker Basics](/recipes/devops/docker-basics) for containerized deployments.
- You need a clear rollback path when something goes wrong. See [Feature Flags](/recipes/devops/feature-flags) for instant toggles.

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

## What Works

- **Keep branches short-lived**: a branch open for weeks accumulates merge conflicts and stale code. Aim for days, not weeks.
- **Write meaningful commit messages**: explain *why*, not just *what*. Future you (and your teammates) will thank you.
- **Review your own PR first**: read the diff before requesting reviewers. You will catch obvious issues.
- **Automate with CI**: run lint, tests, and security scans on every pull request before anyone reviews.
- **Protect main**: require PR reviews, passing CI, and up-to-date branches before merging into `main`.

## Common Mistakes

- **Long-running branches**: the longer a branch lives, the harder it is to merge. Rebase frequently.
- **Committing to main directly**: even in a solo project, using branches keeps your history clean and rollback easy.
- **Giant pull requests**: PRs with hundreds of files are impossible to review well. Split large capabilities into stacked PRs.
- **Ignoring merge conflicts**: resolving conflicts hastily without understanding both sides introduces bugs.
- **Messy commit history**: "fix", "fix again", "actually fix" makes `git blame` useless. Squash or amend before pushing.

## Frequently Asked Questions

**Q: Should I use merge or rebase?**
A: Use rebase to keep your feature branch up to date with `main` locally. Use merge (or squash-merge) when integrating the feature into `main` via a pull request. Never rebase branches that other people are working on.

**Q: How often should I commit?**
A: Commit whenever you reach a logical checkpoint — a working test, a completed function, a fixed bug. Frequent commits make reverting and reviewing easier.

**Q: What if I commit a secret (password, API key) to Git?**
A: Rotate the secret immediately — it is now in Git history. Use tools like `git-filter-repo` or BFG Repo-Cleaner to remove it from history, then force-push. Prevention beats cleanup: use pre-commit hooks with secret scanning.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Git Flow (Extended Branching Model)

Git Flow adds `develop` and `release` branches for teams with scheduled release cycles:

```bash
# Create develop branch
$ git checkout -b develop
$ git push -u origin develop

# Feature branches branch off develop, not main
$ git checkout develop
$ git checkout -b feature/payment-gateway

# When feature is done, merge back to develop
$ git checkout develop
$ git merge --no-ff feature/payment-gateway
$ git branch -d feature/payment-gateway

# Create a release branch when ready to ship
$ git checkout -b release/1.2.0
# Fix bugs on release branch only, not features

# Merge release into main and tag
$ git checkout main
$ git merge --no-ff release/1.2.0
$ git tag -a v1.2.0 -m "Release 1.2.0"
$ git push origin v1.2.0

# Also merge release back into develop
$ git checkout develop
$ git merge release/1.2.0
$ git branch -d release/1.2.0
```

### Trunk-Based Development

For teams with fast CI and continuous deployment, trunk-based development eliminates long-lived branches:

```bash
# Everyone commits to main (or short-lived branches <1 day)
$ git checkout main
$ git pull origin main

# Make a small change, commit, push
$ git add .
$ git commit -m "feat: add validation to checkout form"
$ git push origin main

# Use feature flags to hide incomplete work
# Instead of branching, wrap code in flags:
#   if (featureFlag.isEnabled('new-checkout')) { ... }
```

### Stacked Pull Requests

For large features that don't fit in one PR, use stacked PRs:

```bash
# PR 1: foundational refactor
$ git checkout -b feature/payment-base
$ git push -u origin feature/payment-base
# Open PR #1 targeting main

# PR 2: builds on PR 1
$ git checkout -b feature/payment-ui
$ git rebase feature/payment-base
$ git push -u origin feature/payment-ui
# Open PR #2 targeting feature/payment-base (not main)

# After PR #1 merges, rebase PR #2 onto main
$ git checkout feature/payment-ui
$ git rebase origin/main
$ git push --force-with-lease
# Now PR #2 targets main automatically
```

### Cherry-Pick for Hotfixes

```bash
# A critical bug was fixed on develop, but you need it on main now
$ git log --oneline develop -10  # find the commit hash
$ git checkout main
$ git cherry-pick abc1234
$ git push origin main

# Cherry-pick also works for backporting fixes to release branches
$ git checkout release/1.1.x
$ git cherry-pick abc1234
```

### Git Bisect for Finding Regressions

```bash
# Something broke, but you don't know which commit
$ git bisect start
$ git bisect bad          # current commit is broken
$ git bisect good v1.1.0  # this version worked

# Git checks out a commit in the middle
# Test it, then mark good or bad
$ git bisect good  # or: git bisect bad

# Repeat until Git identifies the culprit commit
# When done:
$ git bisect reset
```

### Git Hooks for Automation

```bash
# .git/hooks/pre-commit (or use husky/pre-commit framework)
#!/bin/bash
set -e

# Run linter
npm run lint

# Run type checker
npm run type-check

# Run tests for changed files only
npm run test:staged

# Check for secrets
git-secrets --scan
```

```bash
# .git/hooks/commit-msg
#!/bin/bash
# Enforce Conventional Commits format
msg=$(cat "$1")
if ! echo "$msg" | grep -qE '^(feat|fix|docs|refactor|test|chore|ci|perf|build)(\(.+\))?: .{1,80}$'; then
  echo "ERROR: Commit message must follow Conventional Commits format"
  echo "Example: feat(auth): add OAuth2 login"
  exit 1
fi
```

### Resolving Merge Conflicts

```bash
# When rebase hits a conflict
$ git rebase origin/main
# CONFLICT (content): Merge conflict in src/auth.js

# Open the file, resolve conflict markers
# <<<<<<< HEAD
# your changes
# =======
# their changes
# >>>>>>> origin/main

# After resolving:
$ git add src/auth.js
$ git rebase --continue

# To abort and start over:
$ git rebase --abort

# Use a merge tool for complex conflicts
$ git mergetool
```

### Squash Merge Strategy

```bash
# Squash all commits from a feature branch into one
$ git checkout main
$ git merge --squash feature/large-refactor
# All changes are staged but not committed
$ git commit -m "refactor: restructure authentication module

- Extract OAuth2 provider into separate class
- Add token refresh logic
- Update all tests to use new interface"

$ git push origin main
```

## Additional Best Practices

6. **Use `.gitignore` properly.** Ignore build artifacts, dependencies, and environment files. Use [gitignore.io](https://gitignore.io) or `gi` CLI to generate templates:

```bash
# .gitignore
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
```

7. **Tag releases consistently.** Use semantic versioning for tags:

```bash
$ git tag -a v1.0.0 -m "Initial release"
$ git tag -a v1.1.0 -m "Add payment module"
$ git tag -a v2.0.0 -m "Breaking: new API v2"
$ git push origin --tags
```

8. **Use `git reflog` to recover lost commits.** If you accidentally reset or delete a branch:

```bash
$ git reflog
# abc1234 HEAD@{0}: reset: moving to HEAD~1
# def5678 HEAD@{1}: commit: important work
$ git checkout def5678  # recover the lost commit
```

9. **Set up branch protection rules.** In GitHub/GitLab, protect `main` with:
   - Require PR reviews (at least 1-2 reviewers)
   - Require status checks to pass (CI)
   - Require branches to be up to date before merging
   - Disallow force-pushes to `main`

10. **Use `git log` effectively.** Find what changed and why:

```bash
# Show commits by a specific author
$ git log --author="alice" --oneline

# Show commits that touched a specific file
$ git log --oneline -- src/auth.js

# Show commits in a date range
$ git log --since="2026-01-01" --until="2026-06-01" --oneline

# Show a visual graph of branches
$ git log --graph --oneline --all --decorate
```

## Additional Common Mistakes

6. **Force-pushing to shared branches.** `git push --force` on `main` or `develop` rewrites history for everyone. Use `--force-with-lease` as a safer alternative:

```bash
# Safer: only force-push if no one else has pushed
$ git push --force-with-lease origin feature/my-branch
```

7. **Not using `.gitattributes` for line endings.** Mixed CRLF/LF causes noisy diffs:

```bash
# .gitattributes
* text=auto
*.sh text eol=lf
*.bat text eol=crlf
*.png binary
```

8. **Rebasing public branches.** Never rebase a branch that others have pulled. It rewrites commit hashes and causes duplicate commits for everyone else.

9. **Ignoring `.git/config` settings.** Set useful defaults:

```bash
$ git config --global pull.rebase true
$ git config --global push.default current
$ git config --global init.defaultBranch main
$ git config --global core.autocrlf input  # macOS/Linux
```

10. **Not cleaning up stale remote branches.** Deleted branches linger on remotes:

```bash
# Prune deleted remote branches
$ git fetch --prune

# List stale remote-tracking branches
$ git branch -r --merged origin/main | grep -v main
```

## Additional FAQ

### How do I revert a merged PR?

Use `git revert` with the merge commit to undo all changes:

```bash
$ git revert -m 1 <merge-commit-hash>
$ git push origin main
```

The `-m 1` flag specifies the mainline parent (the branch you merged into). This creates a new commit that undoes the merge.

### How do I split a large PR into smaller ones?

Use `git checkout` and `git cherry-pick` to extract individual commits:

```bash
# From your feature branch with 5 commits
$ git log --oneline feature/large-feature
# abc1 feat: add models
# abc2 feat: add services
# abc3 feat: add controllers
# abc4 feat: add tests
# abc5 feat: add docs

# Create PR 1 with just models
$ git checkout -b feature/large-pr1 origin/main
$ git cherry-pick abc1
$ git push -u origin feature/large-pr1

# Create PR 2 with services + controllers
$ git checkout -b feature/large-pr2 origin/main
$ git cherry-pick abc2 abc3
$ git push -u origin feature/large-pr2
```

### What is the difference between `git reset` and `git revert`?

`git reset` moves the branch pointer backward, effectively erasing commits. It rewrites history. `git revert` creates a new commit that undoes the changes, preserving history. Use `reset` for local cleanup, `revert` for shared branches.

## Performance Tips

1. **Use shallow clones for CI.** Reduce clone time by fetching only the latest commit:

```bash
$ git clone --depth 1 https://github.com/org/repo.git
# For a specific branch:
$ git clone --depth 1 --branch main https://github.com/org/repo.git
```

2. **Use `git sparse-checkout` for monorepos.** Check out only the directories you need:

```bash
$ git clone --no-checkout https://github.com/org/monorepo.git
$ cd monorepo
$ git sparse-checkout init --cone
$ git sparse-checkout set packages/api packages/shared
$ git checkout main
```

3. **Enable `fsmonitor` for faster status checks.** Git uses the OS file watcher to detect changes:

```bash
$ git config core.fsmonitor true
$ git config core.untrackedcache true
```

4. **Use `git gc` to optimize repository size.** Run periodically to compress objects:

```bash
$ git gc --aggressive --prune=now
```

5. **Use `git worktree` for parallel work.** Work on multiple branches simultaneously without cloning:

```bash
$ git worktree add ../repo-hotfix main
$ cd ../repo-hotfix
# Now you're on main in a separate directory
# Make hotfix changes while your feature branch stays open in the original
```
