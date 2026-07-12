---



contentType: docs
templateType: pr-template
slug: pull-request-template
title: "Pull Request Template"
description: "A thorough pull request template to standardize code reviews and improve merge quality."
metaDescription: "Pull request template for standardized code reviews with description, type of change, testing checklist, and related issue references."
difficulty: beginner
topics:
  - devops
tags:
  - code-review
  - devops
  - git
  - pull-request
  - workflow
relatedResources:
  - /docs/contributing-guide
  - /docs/adr-template
  - /guides/cicd-pipeline-guide
  - /recipes/git-workflow
  - /guides/code-review-best-practices-guide
  - /guides/git-branching-strategies-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Pull request template for standardized code reviews with description, type of change, testing checklist, and related issue references."
  keywords:
    - pull request template
    - code review checklist
    - pr template
    - github pull request
    - code review standards



---

## Overview

A pull request template standardizes the information provided when submitting code changes. See [Contributing Guide](/docs/templates/contributing-guide) for team standards and [What Works in Code Review](/guides/design/code-review-best-practices-guide) for review culture. It ensures reviewers have context and authors verify their work before requesting review.

## When to Use

- Your team does code reviews on every change
- You want to reduce back-and-forth in reviews
- You need to enforce testing or documentation standards
- You manage an open-source project with external contributors

## Template

```markdown
## Description

[Short description of the change and its purpose]

Fixes # (issue)

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Dependency update

## Changes Made

- [Change 1]
- [Change 2]
- [Change 3]

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing performed
- [ ] Edge cases covered

### Test Evidence

[Include screenshots, logs, or commands used for testing]

## Checklist

- [ ] Code follows the project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if applicable)
- [ ] No new warnings or errors introduced
- [ ] CI/CD pipeline passes
```

## Lifecycle

### Draft phase

Create the PR as a draft. Fill in the description and type of change. Use the draft template variant to specify what is done and what remains. Request early feedback on approach.

### Ready for review

Mark the PR as ready for review. Fill in all template sections: changes made, testing evidence, and checklist. Assign reviewers. Ensure CI passes before requesting review.

### Review iterations

Address reviewer comments. Update the PR description if the scope changes. Re-run tests after each push. Keep the checklist updated — if you add changes, verify the checklist still applies.

### Merge

Once approved and CI is green, merge. Delete the feature branch. Link the PR in the release notes if the change is user-facing. Archive any design discussion for future reference.

## Filled Example

```markdown
## Description

Add rate limiting middleware to the public API using a token bucket algorithm.
Prevents abuse by limiting each IP to 100 requests per minute.

Fixes #142

## Type of Change

- [x] New feature (non-breaking change which adds functionality)

## Changes Made

- Added `rateLimiter.ts` middleware using token bucket algorithm
- Applied middleware to all `/api/v1/` routes in `router.ts`
- Added `RATE_LIMIT_PER_MINUTE` env var (default: 100)
- Updated `.env.example` with new variable

## Testing

- [x] Unit tests added for token bucket logic (8 test cases)
- [x] Integration tests pass (existing + 3 new)
- [x] Manual testing performed (curl with rapid requests)
- [x] Edge cases covered (burst traffic, IP rotation, disabled state)

### Test Evidence

```bash
# Rate limit active
$ curl -I http://localhost:3000/api/v1/users
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99

# After 100 requests
$ curl -I http://localhost:3000/api/v1/users
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

## Checklist

- [x] Code follows the project style guidelines
- [x] Self-review completed
- [x] Comments added for complex logic (token bucket math)
- [x] Documentation updated (API README section)
- [x] No new warnings or errors introduced
- [x] CI/CD pipeline passes
```

## Template Sections

| Section | Purpose |
|---------|---------|
| **Description** | Context for reviewers |
| **Type of Change** | Categorizes the PR |
| **Changes Made** | Bullet list of modifications |
| **Testing** | Evidence that changes work |
| **Checklist** | Self-verification before review |

## What Works

- **Keep it concise**: Long templates discourage completion
- **Use checkboxes**: Easy to scan, hard to miss
- **Link issues**: Always reference related tickets. Use [Bug Report Template](/docs/templates/bug-report-template) or [Feature Request Template](/docs/templates/feature-request-template) for issue structure.
- **Include screenshots**: For UI changes, visual proof is essential
- **Automate where possible**: Let CI check what bots can verify. See [CI/CD Pipeline Guide](/guides/devops/cicd-pipeline-guide) for automation.
- **Require test evidence**: Screenshots, logs, or commands prove the change works
- **Add a breaking change section**: Call out anything that requires migration

## Common Mistakes

- **Empty templates**: Submitting without filling required sections
- **Missing tests**: Forgetting to update or add tests. See [Testing Strategy Guide](/guides/testing/testing-strategy-guide) for coverage standards.
- **No issue links**: Makes tracking context harder
- **Large PRs**: Changes over 500 lines are hard to review; split into smaller PRs
- **No description of why**: Reviewers need the motivation, not just the what
- **Ignoring CI failures**: Merging with red CI is a recipe for broken main

## Variants

### Hotfix PR template

For urgent production fixes, use a minimal template: description, root cause, fix summary, and rollback plan. Skip extensive testing checklist — hotfixes need speed. Require post-merge follow-up to add tests and documentation.

### Open-source contribution PR template

For external contributors, add: contributor license agreement checkbox, breaking change disclosure, and a "I have read the contributing guidelines" checkbox. Keep it welcoming but thorough. See [Contributing Guide](/docs/templates/contributing-guide) for standards.

### Draft PR template

For work-in-progress PRs, use a minimal template: what I am building, what is done, what is remaining, and specific feedback requested. Mark as draft to prevent premature review.

## Automation

### GitHub Actions integration

```yaml
name: PR Validation
on:
  pull_request:
    types: [opened, edited, reopened, synchronize]

jobs:
  validate-pr:
    runs-on: ubuntu-latest
    steps:
      - name: Check PR title
        uses: amannn/action-semantic-pull-request@v5
        with:
          types: |
            fix
            feat
            docs
            refactor
            chore
      - name: Verify checklist
        uses: actions/github-script@v6
        with:
          script: |
            const body = context.payload.pull_request.body || '';
            const required = ['## Description', '## Type of Change', '## Checklist'];
            for (const section of required) {
              if (!body.includes(section)) {
                core.setFailed(`Missing section: ${section}`);
              }
            }
```

### Auto-assignment

Configure GitHub to auto-assign reviewers based on CODEOWNERS file. This ensures the right people review each PR without manual assignment.

### Merge queue

Use GitHub merge queues to serialize merges and prevent conflicts. Each PR is rebased on the latest main before merging, catching integration issues early.

## Frequently Asked Questions

### Should every pull request use a template?

Yes. Templates ensure reviewers get consistent context and authors verify their work. See [What Works in Code Review](/guides/design/code-review-best-practices-guide) for culture. Even small fixes benefit from a brief description and testing confirmation.

### How detailed should the testing section be?

Include enough detail that a reviewer can reproduce your tests. For UI changes, attach screenshots or GIFs. For API changes, include sample requests and responses. For bug fixes, describe the steps to reproduce the original issue and confirm the fix.

### What if a PR template feels too heavy for my team?

Start with a minimal template: description, type of change, and a 3-item checklist. Expand using [Contributing Guide](/docs/templates/contributing-guide) standards. Expand sections only when you notice information gaps in reviews.

### How do I enforce the template in GitHub?

Place the template file at `.github/pull_request_template.md` in your repository. GitHub automatically populates the PR description with the template content. For multiple templates, use `.github/PULL_REQUEST_TEMPLATE/` directory with conditional templates.

### Should I require approvals before merging?

For production code: yes, at least one approval from a non-author. For high-risk changes (security, payments, infrastructure): require two approvals. For solo developers: self-review with a checklist is the minimum. See [What Works in Code Review](/guides/design/code-review-best-practices-guide) for approval strategies.

### How large should a PR be?

Aim for under 400 lines of changes. PRs over 500 lines get less thorough reviews. If a change is naturally large, split it into a series of smaller PRs: refactor first, then add the feature. Reviewers can assess each piece more effectively.

### What should I do if CI fails on my PR?

Read the CI logs. Fix the failure locally, push the fix, and let CI re-run. Never merge a PR with failing CI — a red pipeline means something is broken. If the failure is flaky (intermittent test), re-run the job once. If it fails again, investigate the root cause.

### How do I handle conflicting feedback from reviewers?

When two reviewers give conflicting feedback, ask them to discuss in the PR comments. If they cannot agree, the tech lead or maintainer makes the final call. Document the decision in the PR description so future readers understand the reasoning.

### Should I squash commits before merging?

For feature branches: yes, squash and merge to keep the history clean. For long-lived branches with meaningful commit history: use a merge commit to preserve context. Configure GitHub branch protection to enforce the preferred merge strategy.

### How do I review my own PR before requesting review?

Read every diff line. Check for: unused imports, debug code, TODO comments, hardcoded values, and missing tests. Run the linter and formatter. Verify the CI passes. Self-review catches 50% of issues before a reviewer sees them.

### How do I handle a PR that touches multiple services?

Split it into one PR per service if possible. If the changes must ship together (e.g., a contract change), coordinate the deployment order. Document the deployment sequence in the PR description. Tag all service owners as reviewers.

### What if my PR includes generated code?

Do not include generated files in the diff. Add them to `.gitattributes` with `linguist-generated=true` so GitHub hides them by default. Document the generation step in the PR description. Reviewers should focus on the source changes, not the output.

### How do I handle long-running feature branches?

Rebase frequently against main to avoid large merge conflicts. Consider splitting the feature into smaller PRs that can be merged incrementally. Use feature flags to merge incomplete work behind a disabled flag. Long-running branches accumulate conflicts and are harder to review.
