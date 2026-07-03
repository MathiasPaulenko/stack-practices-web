---
contentType: docs
slug: feature-request-template
templateType: feature-request
title: "Feature Request Template"
description: "A structured capability request template to help teams evaluate, prioritize, and implement new capabilities with clear user value and acceptance criteria."
metaDescription: "Capability request template with user story, acceptance criteria, and priority. Help your team evaluate and build the right capabilities faster."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - product-management
  - template
  - user-story
  - ci-cd
relatedResources:
  - /docs/templates/bug-report-template
  - /docs/templates/user-story-template
  - /guides/design/clean-code-principles-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Capability request template with user story, acceptance criteria, and priority. Help your team evaluate and build the right capabilities faster."
  keywords:
    - feature request template
    - product request format
    - user story template
    - acceptance criteria template
    - feature proposal
---

# Feature Request Template

Use this template to propose new capabilities in a way that helps product and engineering teams evaluate user value and implementation effort. Pair it with the [User Story Template](/docs/templates/user-story-template) for narrative-style requirements.

## Template

```markdown
# Feature Request

## Summary
One-sentence description of the capability.

## Problem Statement
What problem does this solve? Who has this problem and how often?

## Proposed Solution
Describe the capability. Include mockups, wireframes, or flow diagrams if available.

## Acceptance Criteria
- [ ] Criterion 1: specific, testable behavior
- [ ] Criterion 2: specific, testable behavior
- [ ] Criterion 3: specific, testable behavior

## User Value
- **Target users:** [internal team / customers / admins]
- **Frequency:** [daily / weekly / monthly]
- **Pain level:** [blocking / annoying / nice-to-have]
- **Workaround:** [exists / none]

## Priority
- [ ] Critical — blocking business operation
- [ ] High — major user pain, no workaround
- [ ] Medium — improves experience, workaround exists
- [ ] Low — nice-to-have

## Additional Context
- Link to related requests or customer feedback
- Competitive analysis
- Estimates or constraints
```

## Why This Structure Works

| Section | Purpose |
|---------|---------|
| **Problem statement** | Avoids "solution in search of a problem" |
| **Proposed solution** | Gives engineers a starting point for design |
| **Acceptance criteria** | Defines "done" before coding starts |
| **User value** | Helps product prioritize against other requests |

## Tips for Requesters

- **Lead with the problem, not the solution** — the team may find a better solution
- **Include a user quote** — "As a [user], I want [capability] so that [benefit]". See [User Story Template](/docs/templates/user-story-template) for the full format.
- **Define one capability per request** — bundles are hard to evaluate and track

## Tips for Reviewers

- **Reject unclear requests quickly** — "needs-more-info" label and a 48-hour deadline
- **Estimate before committing** — t-shirt sizing (S/M/L) is enough for triage. See [Clean Code Principles Guide](/guides/design/clean-code-principles-guide) for implementation standards.
- **Link to roadmap** — show where this fits (or does not fit) in quarterly goals

## Frequently Asked Questions

### What if the requester proposes a bad solution?

Thank them for identifying the problem, then collaborate on a better solution. The goal is solving the user's pain, not implementing their exact suggestion.

### How do I prevent capability bloat?

Require a "user value" section in every request. If the answer is "it would be cool" or "competitor X has it," push back. Capabilities must solve real, frequent pain.

### Should internal tools use the same template?

Yes, but relax the "user value" section. Internal requests need a "requesting team" and "time saved per week" instead. Use the [Bug Report Template](/docs/templates/bug-report-template) for defect tracking.
