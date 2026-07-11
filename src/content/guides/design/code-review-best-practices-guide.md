---
contentType: guides
slug: code-review-best-practices-guide
title: "What Works in Code Review — For Authors and Reviewers"
description: "A practical guide to useful code reviews: how to write reviewable code, give constructive feedback, and keep reviews fast and focused."
metaDescription: "What works in code review for authors and reviewers. Learn to write reviewable code, give constructive feedback, and keep reviews fast."
difficulty: beginner
topics:
  - design
  - devops
tags:
  - code-review
  - devops
  - guide
  - pull-request
  - design-patterns
relatedResources:
  - /guides/design/design-patterns-guide
  - /guides/testing/testing-strategy-guide
  - /guides/devops/cicd-pipeline-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "What works in code review for authors and reviewers. Learn to write reviewable code, give constructive feedback, and keep reviews fast."
  keywords:
    - code review what works
    - pull request review
    - code review checklist
    - peer review software
    - constructive feedback code
---

# What Works in Code Review

## Introduction

Code review is one of the highest-return activities in software development. It catches bugs early, shares knowledge across the team, and maintains consistent code quality. The following walks through practices for both authors (who submit code) and reviewers (who evaluate it).

## For Authors: Making Your Code Reviewable

### 1. Keep PRs Small

Aim for **200-400 lines of changed code** per PR. Large PRs overwhelm reviewers and increase the chance of bugs slipping through.

```bash
# Bad: 2000 lines across 15 files
# Good: 150 lines in 3 related files
```

**Strategies for small PRs:**
- Split large capabilities into stacked PRs
- Extract refactoring into separate PRs
- Use feature flags to merge incrementally

### 2. Write a Clear Description

A good PR description answers:

- **What** changed and **why**
- **How** to test it
- Links to tickets, designs, or related PRs
- Screenshots for UI changes

```markdown
## What
Add email validation to the user registration form.

## Why
Currently invalid emails pass through and cause downstream
processing errors in the marketing automation pipeline.

## How to test
1. Go to /register
2. Enter "not-an-email" — should see validation error
3. Enter "user@example.com" — should pass

## Related
Fixes #142
```

### 3. Self-Review Before Submitting

Review your own PR first. You will catch:
- Leftover debug code (`console.log`, `print`)
- Unintended changes
- Missing tests or documentation
- Typo-level bugs

### 4. Respond to Feedback Constructively

- Assume positive intent from reviewers
- Ask clarifying questions instead of defending
- Separate "must fix" from "nice to have" suggestions
- Update the PR promptly after feedback

## For Reviewers: Giving Useful Feedback

### 1. Review Within 24 Hours

Fast turnaround keeps the author in context and prevents blocked work. If you cannot review in 24 hours, delegate or let the team know.

### 2. Use a Review Checklist

Systematic reviews are more thorough:

| Category | Questions |
|----------|-----------|
| **Functionality** | Does it do what the PR claims? Are edge cases handled? |
| **Tests** | Are there tests for new logic? Do existing tests still pass? |
| **Readability** | Are names clear? Is complexity justified? |
| **Security** | Are inputs validated? Are secrets exposed? | [data validation](/recipes/security/data-validation-zod) |
| **Performance** | Are there [N+1 queries](/recipes/performance/database-indexing)? Unnecessary allocations? |
| **Maintainability** | Is there duplicated code? Will this be hard to change? |

### 3. Categorize Feedback

Use severity levels to help authors prioritize:

| Level | Meaning | Example |
|-------|---------|---------|
| **Blocking** | Must fix before merge | "This query lacks an index; it will scan the entire table" |
| **Suggestion** | Consider it | "You could simplify this with `map` instead of `for`" |
| **Nitpick** | Personal preference | "I prefer single quotes for strings" |

### 4. Ask Questions, Don't Dictate

**Instead of:** "Change this to use a dictionary."

**Ask:** "Would a dictionary make the lookup faster here?"

Questions encourage discussion and help the author learn, whereas orders create resistance.

### 5. Approve with Comments

If the code is acceptable but you have minor suggestions, approve the PR and let the author decide whether to address them. Don't block merges for nits.

## Review Patterns That Work

### Pair Review

Two reviewers alternate: one reads logic, the other reads tests. Catches different categories of issues.

### Tool-Assisted Review

Let automation handle the boring stuff:
- **Linters** (ESLint, Black, Prettier) for style
- **Static analysis** (SonarQube, CodeClimate) for complexity
- **Security scanners** (Snyk, CodeQL) for vulnerabilities
- **CI tests** for regressions

Reserve human review for architecture, logic, and intent.

### Review Roulette

Rotate reviewers so knowledge spreads evenly. Avoid having only senior engineers review everything.

## Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| **PR size** | <400 lines | Review quality drops sharply above this |
| **Review turnaround** | <24 hours | Prevents context loss and blocked work |
| **Defect escape rate** | Decreasing | Bugs found in production vs. review |
| **Review participation** | >80% of team | Knowledge sharing |

## Common Mistakes

- **Bike-shedding**: Spending review time on trivial style issues while missing real bugs
- **Rubber-stamping**: Approving without reading because "they never make mistakes"
- **Gatekeeping**: Using review power to enforce personal preferences
- **Delayed feedback**: Waiting days to review, forcing the author to re-learn context
- **No follow-up**: Suggesting changes but never checking if they were made

## Frequently Asked Questions

**Q: How do I review code in an unfamiliar language or domain?**
A: Focus on what you can evaluate: test coverage, variable naming, obvious logic errors, and documentation clarity. Ask domain experts for the technical nuances.

**Q: What if the author disagrees with my feedback?**
A: Discuss it. If it's a blocking issue and you cannot agree, escalate to the team lead. For suggestions, let the author decide and move on.

**Q: Should I block a PR for missing tests?**
A: Yes, if the PR adds logic that can be tested. No, if it's a pure refactor with existing coverage, or UI changes that require E2E tests owned by another team.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Scenario: Code Review Checklist for a Payment Service

```text
Service: Payment processing microservice
Risk: High (financial transactions, PII)
Reviewers: 2 required (1 senior + 1 peer)

Pre-review automated checks:
  [x] Linter passes (ESLint + Prettier)
  [x] Type checker passes (tsc --noEmit)
  [x] Unit tests pass (>90% coverage on changed lines)
  [x] SAST scan clean (Semgrep)
  [x] No secrets in diff (trufflehog)
  [x] Dependency audit clean (npm audit)

Review checklist (reviewer fills):
  Security:
  [ ] Input validation on all endpoints (Zod schemas)
  [ ] No SQL injection (parameterized queries)
  [ ] No hardcoded secrets or API keys
  [ ] PII not logged (mask card numbers, emails)
  [ ] Auth checks present on every route
  [ ] Rate limiting on sensitive endpoints

  Correctness:
  [ ] Transaction boundaries correct (ACID)
  [ ] Error handling covers edge cases
  [ ] Idempotency for payment operations
  [ ] Decimal arithmetic (no floating point for money)
  [ ] Null/undefined checks on external data
  [ ] Race conditions addressed

  Design:
  [ ] Single responsibility per function
  [ ] No God classes or functions > 50 lines
  [ ] Dependencies injected (testable)
  [ ] No circular imports
  [ ] API contract matches OpenAPI spec

  Testing:
  [ ] Happy path covered
  [ ] Error paths covered
  [ ] Boundary values tested (0, negative, max)
  [ ] Integration test for DB operations
  [ ] Mock external services (Stripe, bank API)
  [ ] No flaky tests (timeouts, random data)

  Performance:
  [ ] N+1 queries eliminated
  [ ] No synchronous I/O in hot paths
  [ ] Indexes exist for new queries
  [ ] Pagination on list endpoints
  [ ] No unnecessary data fetched (SELECT * avoided)

  Documentation:
  [ ] JSDoc on exported functions
  [ ] README updated if setup changed
  [ ] Changelog entry added
  [ ] Breaking changes documented

Review comments format:
  [blocking] Must fix before merge
  [suggestion] Consider this approach
  [question] Why this design choice?
  [nit] Minor style preference

Metrics tracked:
  | Metric | Target |
  |--------|--------|
  | Review time | < 4 hours |
  | Defect escape rate | < 5% |
  | Reviewer load | < 5 PRs/day |
  | PR size | < 400 lines changed |
  | Comment density | 2-5 per PR |

Lessons:
  - Automated checks reduce reviewer burden
  - Checklists ensure consistency across reviewers
  - Small PRs get better reviews than large ones
  - [blocking] vs [suggestion] clarifies intent
  - Track metrics to improve the review process
```

### How do I handle large PRs that are hard to review?

Ask the author to split into smaller PRs. If splitting is not possible, request a walkthrough (screen share or detailed description). Review in chunks: first the design, then the tests, then the implementation. Use diff tools that allow commenting on specific lines. Large PRs (> 400 lines) consistently get lower quality reviews.
















End of document. Review and update quarterly.