---
contentType: docs
templateType: pr-template
slug: pull-request-template
title: "Pull Request Template"
description: "A comprehensive pull request template to standardize code reviews and improve merge quality."
metaDescription: "Pull request template for standardized code reviews with description, type of change, testing checklist, and related issue references."
difficulty: beginner
topics:
  - devops
tags:
  - pull-request
  - code-review
  - git
  - workflow
relatedResources:
  - /docs/contributing-guide
  - /docs/adr-template
  - /guides/cicd-pipeline-guide
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

A pull request template standardizes the information provided when submitting code changes. It ensures reviewers have context and authors verify their work before requesting review.

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

## Template Sections

| Section | Purpose |
|---------|---------|
| **Description** | Context for reviewers |
| **Type of Change** | Categorizes the PR |
| **Changes Made** | Bullet list of modifications |
| **Testing** | Evidence that changes work |
| **Checklist** | Self-verification before review |

## Best Practices

- **Keep it concise**: Long templates discourage completion
- **Use checkboxes**: Easy to scan, hard to miss
- **Link issues**: Always reference related tickets
- **Include screenshots**: For UI changes, visual proof is essential
- **Automate where possible**: Let CI check what bots can verify

## Common Mistakes

- **Empty templates**: Submitting without filling required sections
- **Missing tests**: Forgetting to update or add tests
- **No issue links**: Makes tracking context harder

## Frequently Asked Questions

### Should every pull request use a template?

Yes. Templates ensure reviewers get consistent context and authors verify their work. Even small fixes benefit from a brief description and testing confirmation.

### How detailed should the testing section be?

Include enough detail that a reviewer can reproduce your tests. For UI changes, attach screenshots or GIFs. For API changes, include sample requests and responses.

### What if a PR template feels too heavy for my team?

Start with a minimal template: description, type of change, and a 3-item checklist. Expand sections only when you notice information gaps in reviews.
