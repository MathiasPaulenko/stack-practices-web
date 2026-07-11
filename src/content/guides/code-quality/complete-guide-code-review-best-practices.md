---
contentType: guides
slug: complete-guide-code-review-best-practices
title: "Code Reviews: Reviewer Mindset, Feedback, Automation"
description: "Master code review best practices: reviewer mindset, constructive feedback, review checklists, automated checks, PR sizing, and building a strong review culture in engineering teams."
metaDescription: "Master code review best practices: reviewer mindset, constructive feedback, review checklists, automated checks, PR sizing, and building a strong review culture in teams."
difficulty: intermediate
topics:
  - testing
tags:
  - guide
  - code-review
  - code-quality
  - best-practices
  - feedback
  - automation
  - pull-requests
  - team-collaboration
relatedResources:
  - /guides/code-quality/complete-guide-clean-code-principles
  - /guides/code-quality/complete-guide-refactoring-techniques
  - /guides/code-quality/complete-guide-technical-debt-management
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 18
seo:
  metaDescription: "Master code review best practices: reviewer mindset, constructive feedback, review checklists, automated checks, PR sizing, and building a strong review culture in teams."
  keywords:
    - code review
    - reviewer mindset
    - constructive feedback
    - review checklist
    - automated checks
    - pull requests
    - review culture
---

## Introduction

Code review is the practice of having another developer examine your code before it merges. It catches bugs, improves quality, shares knowledge, and builds shared code ownership. Here is a hands-on guide to reviewer mindset, constructive feedback, review checklists, automated checks, PR sizing, and building a strong review culture.

## Reviewer Mindset

### Review the code, not the person

```markdown
# BAD: personal attack
"Why did you do it this way? This is obviously wrong."

# GOOD: focus on the code
"This approach has a potential issue with concurrent access.
Consider using a mutex here. What do you think?"
```

### Ask questions, don't give orders

```markdown
# BAD: dictatorial
"Change this to use a Map instead."

# GOOD: collaborative
"Would a Map be more efficient here? The current approach
iterates the array on every lookup, which could be slow
with large datasets."
```

### Assume competence

```markdown
# BAD: condescending
"You probably don't know this, but you need to handle null here."

# GOOD: respectful
"I see this value can be null in edge cases. Should we add
a null check or use an Optional here?"
```

### Be specific

```markdown
# BAD: vague
"This code is messy."

# GOOD: specific
"The `processData` function handles validation, transformation,
and database insertion. Extracting the validation into a separate
function would make each responsibility clearer and easier to test."
```

## Review Checklist

```markdown
## Code Review Checklist

### Functionality
- [ ] Does the code do what the PR description says?
- [ ] Are edge cases handled (null, empty, boundary values)?
- [ ] Are error cases covered with appropriate handling?
- [ ] Does the code handle concurrent access if needed?

### Design
- [ ] Does the change follow existing patterns in the codebase?
- [ ] Is the change at the right level of abstraction?
- [ ] Are new dependencies justified?
- [ ] Is the change over-engineered or under-engineered?

### Readability
- [ ] Are names clear and intention-revealing?
- [ ] Are functions small and focused?
- [ ] Is the code organized logically?
- [ ] Are comments explaining why, not what?

### Testing
- [ ] Are there tests for the new functionality?
- [ ] Do tests cover edge cases and error paths?
- [ ] Are tests meaningful (not just asserting true)?
- [ ] Do tests run fast enough for the CI pipeline?

### Security
- [ ] Is user input validated and sanitized?
- [ ] Are there any SQL injection or XSS risks?
- [ ] Are secrets and credentials handled securely?
- [ ] Are permissions checked correctly?

### Performance
- [ ] Are there obvious performance issues (N+1 queries, unnecessary loops)?
- [ ] Is the change efficient for large inputs?
- [ ] Are database queries optimized?
- [ ] Is caching used where appropriate?

### Documentation
- [ ] Is the PR description clear and complete?
- [ ] Are public APIs documented?
- [ ] Are breaking changes noted?
- [ ] Is the changelog updated if needed?
```

## PR Sizing

```
PR Size          Review Time    Review Quality
─────────        ───────────    ──────────────
< 50 lines       10-15 min      Excellent
50-100 lines     15-30 min      Good
100-300 lines    30-60 min      Fair
300-500 lines    60-90 min      Poor (fatigue)
500+ lines       2+ hours       Bad (skimming)

Keep PRs under 300 lines for thorough reviews.
```

### Breaking large changes into smaller PRs

```markdown
# Instead of one 1000-line PR: "Add order export feature"

## PR 1: Add export service interface and types (50 lines)
## PR 2: Implement CSV export strategy (120 lines)
## PR 3: Implement PDF export strategy (150 lines)
## PR 4: Add export API endpoint (80 lines)
## PR 5: Add export UI button and modal (100 lines)
## PR 6: Add integration tests for export flow (200 lines)

Each PR is independently reviewable and testable.
```

## Automated Checks

Automate what you can so reviewers focus on what matters.

```yaml
# .github/workflows/pr-checks.yml — Automated PR checks
name: PR Checks
on: pull_request

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run type-check

  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test -- --coverage
      - run: |
          COVERAGE=$(node -e "console.log(require('./coverage/coverage-summary.json').total.lines.pct)")
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Check bundle size
        run: |
          SIZE=$(du -s dist/ | cut -f1)
          if [ $SIZE -gt 500000 ]; then
            echo "Bundle size $SIZE KB exceeds 500 MB limit"
            exit 1
          fi
```

## Review Workflow

```typescript
// Review process for a PR
const reviewWorkflow = [
  // 1. Read the PR description
  'Understand what the PR does and why',

  // 2. Review tests first
  'Do the tests cover the described behavior?',
  'Are edge cases tested?',
  'Are the test names descriptive?',

  // 3. Review the implementation
  'Read the code top to bottom',
  'Check for bugs and edge cases',
  'Evaluate design and patterns',
  'Check naming and readability',

  // 4. Review automated checks
  'Are CI checks passing?',
  'Is coverage maintained or improved?',
  'Are there new lint warnings?',

  // 5. Leave feedback
  'Approve if no blocking issues',
  'Request changes for blocking issues',
  'Leave suggestions as comments (non-blocking)',
];
```

## Feedback Templates

### Approving

```markdown
LGTM! The implementation is clean and the tests are thorough.
A few non-blocking suggestions below — feel free to address
in a follow-up PR.

Suggestion: The `formatDate` helper could be extracted into
a shared utils module since it's used in multiple places now.
```

### Requesting changes

```markdown
Found a couple of issues that need to be addressed before merge:

1. **Blocking: SQL injection risk**
   In `getUserById`, the `id` parameter is interpolated directly
   into the query string. Use parameterized queries instead:
   `db.query('SELECT * FROM users WHERE id = ?', [id])`

2. **Blocking: Missing error handling**
   The `fetchUserData` function doesn't handle network errors.
   If the API is down, the app crashes. Add a try-catch with
   a fallback.

3. **Suggestion: Test coverage**
   The happy path is tested but the error path isn't. Consider
   adding a test for the API failure case.
```

### Commenting (non-blocking)

```markdown
Nice work! The approach makes sense and the code is well-structured.

A few thoughts for future consideration:

- The `processOrder` function is 80 lines. It might benefit from
  extracting the validation and calculation steps into separate
  functions. Not blocking for this PR.

- The `OrderStatus` enum has 12 values but only 4 are used in
  this PR. Are the others needed for upcoming work?

- Consider adding a JSDoc comment to `calculateDiscount` explaining
  the VIP tier logic, since it's not obvious from the code.
```

## Best Practices

- Review within 24 hours — blocked PRs slow the whole team down
- Keep PRs small — under 300 lines for thorough reviews
- Review tests first — if tests are wrong, the implementation doesn't matter
- Use a checklist — don't rely on memory for security, performance, edge cases
- Separate blocking from non-blocking — don't block on style preferences
- Automate what you can — linting, formatting, type checking, coverage
- Leave positive feedback — acknowledge good work, not just problems
- Ask questions — encourage the author to explain their reasoning
- Don't review your own code — even a quick review by a peer catches issues
- Review in person for complex changes — pair review for 500+ line PRs
- Set review expectations — define what "ready for review" means
- Track review metrics — time-to-review, PR size, defect escape rate

## Common Mistakes

- **Nitpicking style**: automated linters handle formatting. Don't block PRs for missing spaces.
- **Bike-shedding**: spending 30 minutes debating variable names while ignoring architectural issues.
- **Rubber-stamping**: approving without reading the code. "LGTM" without review is worse than no review.
- **Blocking on preferences**: "I would have used a Map" is not blocking. "This has a race condition" is.
- **Reviewing too much at once**: 500-line PRs get skimmed, not reviewed. Break them up.
- **No response to feedback**: author pushes changes without responding to comments. Acknowledge each comment.

## FAQ

### How long should a code review take?

For a 100-line PR, 15-30 minutes. For a 300-line PR, 30-60 minutes. If it takes longer, the PR is too large. Break it into smaller PRs. Don't review for more than 60 minutes at a stretch — fatigue causes missed issues.

### What should I do if I disagree with a reviewer?

Respond with your reasoning. If you can't agree, involve a third reviewer or tech lead. Don't block the PR indefinitely over a non-blocking suggestion. For blocking issues, explain your approach and ask for alternatives.

### How many reviewers should a PR have?

One thorough review is better than three rubber stamps. For critical changes (security, payments, migrations), require two approvals. For routine changes, one is sufficient.

### Should I review tests or implementation first?

Tests first. If the tests don't cover the right behavior, the implementation is testing against wrong expectations. Good tests also serve as documentation for what the code should do.

### How do I handle a PR that's too large?

Ask the author to break it into smaller PRs. If that's not possible, do a first pass focusing on the overall structure and design, then a second pass focusing on details. Use the PR description to understand the scope before diving into the code.
