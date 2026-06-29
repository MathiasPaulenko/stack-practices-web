---
contentType: docs
slug: code-review-checklist-template
title: "Code Review Checklist Template"
description: "A structured checklist template for conducting consistent, thorough code reviews that catch bugs, improve readability, and share knowledge across the team."
metaDescription: "Standardize code reviews with this checklist. Covers logic, security, performance, tests, and style for consistent, high-quality feedback."
difficulty: beginner
topics:
  - devops
  - testing
tags:
  - code-review
  - checklist
  - quality-assurance
  - team-process
  - pull-request
relatedResources:
  - /docs/devops/engineering-handbook-template
  - /docs/devops/git-branching-strategy-document
  - /docs/devops/onboarding-checklist-backend-engineer
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Standardize code reviews with this checklist. Covers logic, security, performance, tests, and style for consistent, high-quality feedback."
  keywords:
    - code review checklist
    - pull request review
    - code quality template
    - review standards
    - developer checklist
---

## Overview

Code reviews are the most useful quality gate in software delivery — but only when they are consistent. Without a checklist, reviewers focus on what they personally care about: one engineer checks for SQL injection, another obsesses over variable names, and a third only looks at test coverage. A shared checklist ensures every review covers the dimensions that matter to the team, while leaving room for human judgment on design and architecture.

## When to Use

Use this checklist when:
- You want to standardize what "done" means for code review across the team
- New reviewers are unsure what to look for in a pull request
- Reviews are taking too long because reviewers are unsure of scope
- You are onboarding a new team and need to establish shared standards quickly
- You want to reduce post-merge defects and production incidents

## Prerequisites

Before adopting this checklist:
- [ ] The team agrees on which items are mandatory vs. optional
- [ ] CI is configured to catch automated issues (linting, formatting, type checks)
- [ ] Reviewers understand that checklists augment judgment; they do not replace it
- [ ] There is a documented escalation path for disagreements between author and reviewer
- [ ] The checklist is stored where reviewers can reference it easily (PR template, wiki, or pinned message)

## Solution

```markdown
# Code Review Checklist

> Reviewer: ______ | Author: ______ | PR: ______ | Date: ______

## 1. Logic and Correctness
- [ ] The code does what the PR description claims it does
- [ ] Edge cases are handled (empty inputs, nulls, timeouts, failures)
- [ ] No off-by-one errors, race conditions, or infinite loops
- [ ] Error paths are explicit and do not swallow exceptions silently
- [ ] Business logic matches the spec or ticket requirements

## 2. Security
- [ ] No secrets, tokens, or credentials in code
- [ ] User inputs are validated and sanitized
- [ ] Authorization checks exist for protected operations
- [ ] No SQL injection, XSS, or command injection vulnerabilities
- [ ] Dependencies added are vetted and from trusted sources

## 3. Performance
- [ ] No N+1 queries or obvious algorithmic inefficiencies
- [ ] Large data sets are paginated or streamed
- [ ] No unnecessary network calls or blocking I/O in hot paths
- [ ] Caching is used appropriately where applicable
- [ ] Resource leaks (connections, file handles, memory) are prevented

## 4. Testing
- [ ] Unit tests cover the new or changed logic
- [ ] Integration tests cover external dependencies and boundaries
- [ ] Edge cases and failure paths are tested, not just happy paths
- [ ] Tests are deterministic and do not rely on timing or order
- [ ] Test names describe behavior, not implementation

## 5. Maintainability and Style
- [ ] Code is readable without needing to ask the author
- [ ] Variable and function names are descriptive and consistent
- [ ] No duplicated logic that could be extracted or reused
- [ ] Comments explain "why," not "what" (the code shows what)
- [ ] Complexity is appropriate; over-engineering is flagged

## 6. Documentation
- [ ] Public APIs have updated documentation or OpenAPI specs
- [ ] README or runbooks are updated if behavior changed
- [ ] Breaking changes are called out explicitly in the PR description
- [ ] Migration steps are documented if schema or config changed

## 7. Deployment and Operations
- [ ] Feature flags are used for risky or irreversible changes
- [ ] Monitoring and alerts are added or updated for new paths
- [ ] Rollback procedure is understood and tested
- [ ] Database migrations are backward-compatible or have a plan

---

## Review Notes

| Line / File | Issue | Severity | Action |
|-------------|-------|----------|--------|
| ______ | ______ | Nit / Suggestion / Blocker | ______ |

**Overall verdict:** Approve / Request changes / Comment
**Merge readiness:** Ready / Needs work / Blocked
```

## Explanation

The checklist is organized by **concern** rather than by file type. This prevents reviewers from getting lost in line-by-line diff reading and instead evaluating the change against the dimensions that matter to the team: correctness, security, performance, testing, maintainability, documentation, and operations. Separating automated concerns (linting, formatting) from human concerns (design, readability) keeps reviews focused on what humans do best.

## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Frontend / UI code | Add accessibility, responsive design, and browser compatibility sections | Visual changes need manual verification |
| Data pipelines | Add data quality checks, schema compatibility, and backfill considerations | Data changes are harder to undo than code changes |
| Infrastructure / Terraform | Add state safety, plan review, and blast radius assessment | One misconfiguration can take down production |
| Security-critical code | Make security section mandatory and require security team sign-off | Finance, healthcare, and auth systems |
| Hotfix / incident response | Shorten checklist to security, correctness, and rollback only | Speed matters; document what was skipped and why |

## What works

1. **Keep the checklist visible** — embed it in the PR template so reviewers see it automatically
2. **Distinguish nits from blockers** — not every issue prevents merge; use severity labels to keep reviews moving
3. **Rotate reviewers** — checklists reduce the expertise gap, making it easier to spread review load
4. **Review the checklist quarterly** — remove items that are now automated; add items that keep slipping through
5. **Time-box reviews** — if a review takes more than 30 minutes, the PR is probably too large

## Common Mistakes

1. **Treating the checklist as a substitute for thinking** — the checklist catches common omissions, not design flaws
2. **Making every item mandatory** — this slows reviews without improving quality; only block on correctness, security, and tests
3. **Not updating the checklist** — as tools improve, manual checks should be automated
4. **Reviewing alone** — pair reviews on critical changes catch issues solo reviewers miss
5. **Focusing only on the diff** — reviewers should also check that the PR description, tests, and documentation are consistent

## Frequently Asked Questions

### How long should a code review take?

Small PRs (under 200 lines) should be reviewed within a few hours. Large PRs should be split or reviewed in stages. If a review consistently takes longer than 30 minutes, the team should investigate whether PRs are too large or the checklist is too broad.

### Should junior engineers review senior engineers' code?

Yes. Code review is a learning opportunity as much as a quality gate. Junior reviewers catch clarity issues seniors overlook because they do not yet share the author's assumptions. The checklist levels the playing field by telling everyone what to check.

### What if the author disagrees with a review comment?

Discuss it. If the conversation stalls, escalate to a tech lead or the team's documented tiebreaker. The checklist exists to reduce subjective debates by making expectations explicit — but it cannot eliminate all disagreement.
