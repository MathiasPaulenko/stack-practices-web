---






contentType: recipes
slug: git-rebase-interactive-tutorial
title: "Clean Git Commit History with Interactive Rebase"
description: "Squash, reorder, edit, and split commits with git rebase interactive. Covers pick, squash, fixup, reword, drop, and conflict resolution."
metaDescription: "Clean git commit history with interactive rebase. Squash, reorder, edit, split commits. Covers pick, squash, fixup, reword, drop and conflict resolution."
difficulty: intermediate
topics:
  - devops
tags:
  - git
  - rebase
  - commit-history
  - version-control
  - squash
  - interactive-rebase
relatedResources:
  - /recipes/docker-compose-dev-prod-split
  - /recipes/docker-multi-stage-build-optimization
  - /recipes/git-workflow
  - /docs/code-review-checklist-template
  - /docs/git-branching-strategy-document
  - /guides/git-branching-strategies-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Clean git commit history with interactive rebase. Squash, reorder, edit, split commits. Covers pick, squash, fixup, reword, drop and conflict resolution."
  keywords:
    - git rebase interactive
    - git squash commits
    - git rebase tutorial
    - git clean commit history
    - git fixup reword drop
    - git rebase conflict resolution






---

## Overview

Interactive rebase lets you rewrite commit history before merging. You can squash related commits, reorder them, edit commit messages, split commits, and drop unwanted ones. This keeps your branch history clean and readable. Here is how to all interactive rebase actions with practical examples.

## When to Use


- For alternatives, see [Git Branching Strategy Document](/docs/git-branching-strategy-document/).

- You want to clean up commits before merging a feature branch
- You have WIP commits that should be squashed into one
- You need to reword or fix typos in commit messages
- You want to reorder or split commits for clarity
- You need to remove a commit that should not be in the branch

## Solution

### Start an interactive rebase

```bash
# Rebase last 5 commits
git rebase -i HEAD~5

# Rebase onto a specific commit
git rebase -i <commit-hash>

# Rebase onto a branch (common before merge)
git rebase -i main
```

This opens your editor with a list of commits and available actions:

```text
pick 1a2b3c4 Add user model
pick 5d6e7f8 WIP: fix validation
pick 9a0b1c2 WIP: tests
pick 3d4e5f6 Add user API endpoints
pick 7a8b9c0 Fix typo in endpoint

# Rebase commands:
# pick   = use commit as-is
# reword = use commit, edit message
# edit   = use commit, pause to amend
# squash = combine with previous commit
# fixup  = like squash, discard message
# drop   = remove commit
```

### Squash commits

```text
pick 1a2b3c4 Add user model
squash 5d6e7f8 WIP: fix validation
squash 9a0b1c2 WIP: tests
pick 3d4e5f6 Add user API endpoints
pick 7a8b9c0 Fix typo in endpoint
```

After saving, Git opens an editor to combine commit messages:

```text
# This is a combination of 3 commits.
# This is the 1st commit message:
Add user model

# The commit messages of commits being squashed:
WIP: fix validation

WIP: tests
```

Edit to a single clean message:

```text
Add user model with validation and tests
```

### Fixup — squash and discard message

```text
pick 1a2b3c4 Add user model
fixup 5d6e7f8 WIP: fix validation
fixup 9a0b1c2 WIP: tests
pick 3d4e5f6 Add user API endpoints
```

Fixup combines the commit into the previous one and discards its message. No second editor prompt.

### Reword a commit message

```text
pick 1a2b3c4 Add user model
reword 3d4e5f6 Add user API endpoints
pick 7a8b9c0 Fix typo in endpoint
```

Git pauses and opens an editor for the reworded commit. Type the new message and save.

### Edit a commit (pause to modify)

```text
pick 1a2b3c4 Add user model
edit 3d4e5f6 Add user API endpoints
pick 7a8b9c0 Fix typo in endpoint
```

Git pauses at the edit commit. You can modify files, stage changes, and amend:

```bash
# Make changes
vim src/api/users.py
git add src/api/users.py

# Amend the commit
git commit --amend

# Continue rebase
git rebase --continue
```

### Drop a commit

```text
pick 1a2b3c4 Add user model
drop 5d6e7f8 Add debug logging
pick 3d4e5f6 Add user API endpoints
```

Or simply delete the line to drop the commit.

### Reorder commits

```text
pick 3d4e5f6 Add user API endpoints
pick 1a2b3c4 Add user model
pick 7a8b9c0 Fix typo in endpoint
```

Git replays commits in the new order. Conflicts may occur if commits depend on each other.

### Split a commit

```text
pick 1a2b3c4 Add user model and API endpoints
edit 3d4e5f6 Add tests
pick 7a8b9c0 Fix typo
```

When Git pauses at the edit commit:

```bash
# Unstage all changes from the commit
git reset HEAD^

# Stage and commit the first part
git add src/models/user.py
git commit -m "Add user model"

# Stage and commit the second part
git add src/api/users.py
git commit -m "Add user API endpoints"

# Continue rebase
git rebase --continue
```

### Resolve conflicts during rebase

```bash
git rebase -i main
# CONFLICT (content): Merge conflict in src/models/user.py
```

Resolve the conflict:

```bash
# 1. Edit the file to resolve conflicts
vim src/models/user.py

# 2. Stage the resolved file
git add src/models/user.py

# 3. Continue the rebase
git rebase --continue
```

If you want to abort:

```bash
git rebase --abort
```

If you want to skip the conflicting commit:

```bash
git rebase --skip
```

### Autosquash with fixup commits

```bash
# Create a fixup commit targeting a specific commit
git commit --fixup 1a2b3c4

# Rebase with autosquash — automatically reorders fixups
git rebase -i --autosquash HEAD~5
```

Git automatically places fixup commits after their target and marks them as fixup:

```text
pick 1a2b3c4 Add user model
fixup 9a0b1c2 fixup! Add user model
pick 3d4e5f6 Add user API endpoints
```

### Force push after rebase

```bash
# Safe force push — checks that no one else pushed
git push --force-with-lease origin feature-branch

# Never use plain force push on shared branches
# git push --force  # DANGEROUS
```

## Explanation

Interactive rebase replays commits one by one, applying your chosen action to each:

- **pick**: Keep the commit as-is. Default action.
- **reword**: Keep the commit, but open an editor to change the message.
- **edit**: Pause at the commit. Modify files, stage, and `git commit --amend`. Continue with `git rebase --continue`.
- **squash**: Combine the commit into the previous one. Opens an editor to merge messages.
- **fixup**: Combine into the previous commit and discard the commit message. No editor prompt.
- **drop**: Remove the commit entirely. Same as deleting the line.
- **exec**: Run a shell command at that point in the rebase.
- **break**: Stop the rebase at that point. Resume with `git rebase --continue`.

Key concepts:

- **Rebase rewrites history**. Old commits are replaced with new ones. This changes commit hashes.
- **Never rebase commits that have been pushed to shared branches**. Other developers' history will break.
- **`--force-with-lease`** is safer than `--force`. It checks that no one else pushed before overwriting.
- **`--autosquash`** automatically reorders fixup and squash commits next to their targets.
- **Conflicts** occur when commits depend on each other. Resolve, stage, and continue.

## Variants

| Action | Effect | Use When |
|--------|--------|----------|
| squash | Combine + edit message | Related commits, want one message |
| fixup | Combine + discard message | WIP commits, message not needed |
| reword | Edit message only | Fix typo, improve clarity |
| edit | Pause and modify | Split commit, add forgotten file |
| drop | Remove commit | Revert unwanted change |
| exec | Run shell command | Run tests at specific commit |

## Guidelines

- Rebase feature branches before merging to keep history clean.
- Use `squash` for related commits where the individual messages add value. Use `fixup` for WIP commits where the message is noise.
- Use `--force-with-lease` instead of `--force` to avoid overwriting others' work.
- Use `--autosquash` with `git commit --fixup` for a simplified workflow.
- Keep commits small and focused. Smaller commits are easier to reorder and split.
- Write clear commit messages. The squashed message should describe the full change.
- Test after rebase. Replaying commits can introduce subtle issues.
- Never rebase commits on shared branches (main, develop). Only rebase your own feature branch.
- Use `git reflog` to recover if a rebase goes wrong. Reflog tracks all head movements.

## Common Mistakes

- Rebasing commits that are already pushed to shared branches. This breaks other developers' history.
- Using `git push --force` instead of `--force-with-lease`. The latter is safer and prevents data loss.
- Squashing too many commits into one. Large squashed commits are hard to review and revert.
- Not testing after rebase. Replaying commits can introduce conflicts or subtle bugs.
- Dropping a commit that other commits depend on. This causes conflicts in subsequent commits.
- Forgetting `git rebase --continue` after resolving a conflict. The rebase stays paused.
- Panicking during a rebase gone wrong. Use `git rebase --abort` to cancel and return to the original state.
- Not using `git reflog` for recovery. Reflog has all head movements, even after a bad rebase.

## Frequently Asked Questions

### Is interactive rebase safe?

Yes, on your own feature branch that no one else has pulled. Never rebase commits on shared branches like main or develop. If a rebase goes wrong, `git rebase --abort` cancels it and `git reflog` recovers previous states.

### What is the difference between squash and fixup?

Squash combines the commit into the previous one and opens an editor to merge commit messages. Fixup does the same but discards the commit message entirely. Use squash when the message has useful information. Use fixup for WIP or typo-fix commits.

### How do I recover from a bad rebase?

Use `git reflog` to find the commit hash before the rebase, then `git reset --hard <hash>` to restore. Reflog tracks every head movement, so nothing is truly lost.

### Should I rebase before merging a PR?

Yes. Rebasing your feature branch onto the latest main before merging keeps the history linear and clean. Squash WIP commits, reword unclear messages, and drop unnecessary commits before the final merge.

### What is the difference between `git rebase` and `git merge`?

`git merge` creates a merge commit that preserves the full branch history with both parent commits. `git rebase` replays your commits on top of the target branch, producing a linear history with no merge commit. Use merge for shared branches (main, develop) to preserve context. Use rebase for private feature branches to keep history clean.

### How do I resolve conflicts during an interactive rebase?

When a conflict occurs, Git pauses the rebase. Fix the conflicting files, `git add` them, then `git rebase --continue` to resume. Use `git rebase --abort` to cancel and return to the pre-rebase state. Use `git rebase --skip` to drop the current commit if it is already applied. Always resolve conflicts in small batches — rebase one commit at a time rather than all at once.

## Additional Common Mistakes

- Rebasing shared branches that others have already pulled — rewrites public history and breaks teammates' repos
- Not using `git stash` before starting a rebase with uncommitted changes
- Squashing too many commits into one — makes the resulting commit hard to review and revert
- Forgetting that `exec` commands run in the repo root, not the original working directory
- Using `drop` on commits that other commits depend on — can cause unexpected conflicts during replay
- Not communicating with the team before rewriting shared branch history — always coordinate rebase operations on collaborative branches
- Rebasing more than ~20 commits at once — increases conflict surface area and makes recovery harder if something goes wrong
- Not testing the build after a rebase — rebasing can silently break code if a commit depended on a prior change that was reordered
- Forgetting to force-push with `--force-with-lease` instead of `--force` — the lease variant is safer because it checks for remote changes
