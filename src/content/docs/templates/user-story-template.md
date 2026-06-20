---
contentType: docs
slug: user-story-template
templateType: user-story
title: "User Story and Acceptance Criteria Template"
description: "A user story template that connects user needs to implementation with clear acceptance criteria, definition of done, and INVEST principles."
metaDescription: "User story template with acceptance criteria, definition of done, and INVEST principles. Connect user needs to implementation clearly."
difficulty: beginner
topics:
  - design
tags:
  - product-management
  - template
  - user-story
relatedResources:
  - /docs/templates/feature-request-template
  - /guides/design/clean-code-principles-guide
  - /guides/testing/test-driven-development-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "User story template with acceptance criteria, definition of done, and INVEST principles. Connect user needs to implementation clearly."
  keywords:
    - user story template
    - acceptance criteria template
    - definition of done template
    - invest user stories
    - agile story format
---

# User Story and Acceptance Criteria Template

Use this template to write user stories that are ready for development and testing. Pair it with the [Feature Request Template](/docs/templates/feature-request-template) for initial proposals and [Test-Driven Development Guide](/guides/testing/test-driven-development-guide) for test-first workflows.

## Template

```markdown
# User Story: [Short Title]

## Story
As a [type of user],
I want [some goal],
so that [some reason / benefit].

## Acceptance Criteria

### Scenario 1: Happy path
Given [context]
When [action]
Then [expected result]

### Scenario 2: Error case
Given [context]
When [invalid action]
Then [expected error / validation message]

### Scenario 3: Edge case
Given [edge context]
When [action]
Then [expected handling]

## Definition of Done
- [ ] Code reviewed and merged
- [ ] Unit tests pass (> 80% coverage)
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Deployed to staging and verified
- [ ] Product owner accepted

## Technical Notes
- **API changes:** [link to spec]
- **Database changes:** [migration required / none]
- **Dependencies:** [blocked by / blocks]
- **Estimated effort:** [story points or hours]

## UI/UX
- **Mockups:** [link to Figma]
- **Accessibility:** [keyboard nav / screen reader / color contrast]
- **Responsive:** [mobile / tablet / desktop]
```

## INVEST Checklist

| Principle | Question | This Story? |
|-----------|----------|-------------|
| **Independent** | Can it be developed and deployed alone? | [ ] |
| **Negotiable** | Is the solution open to discussion? | [ ] |
| **Valuable** | Does it deliver user value? | [ ] |
| **Estimable** | Can the team size it? | [ ] |
| **Small** | Can it fit in one sprint? | [ ] |
| **Testable** | Can acceptance criteria be verified? | [ ] |

## Good vs Bad Acceptance Criteria

| Bad | Good |
|-----|------|
| "The system should be fast" | "Search results return in < 500ms at p95" |
| "Handle errors gracefully" | "If the API returns 503, show retry button with 5s countdown" |
| "Support mobile" | "Layout renders without horizontal scroll on iPhone SE (375px)" |

## Best Practices

- **Write acceptance criteria before code** — they are the contract between product and engineering. See [Clean Code Principles Guide](/guides/design/clean-code-principles-guide) for implementation standards.
- **Use Given-When-Then for behavior** — it is testable and unambiguous
- **Keep stories small** — if it does not fit in a sprint, split it vertically (by scenario, not by layer)
- **Include non-functional criteria** — performance, security, and accessibility are acceptance criteria too. See [Web Application Security Guide](/guides/security/web-application-security-guide) for security requirements.
- **Reject stories missing "so that"** — if you cannot articulate the benefit, you do not understand the problem

## Common Mistakes

- Technical tasks disguised as user stories — "Refactor database layer" is not a user story; it is a task
- Stories that are too big — "Implement checkout" is an epic, not a story
- Vague acceptance criteria — "it should work" is not testable
- No definition of done — teams disagree on when a story is finished. Use [Pull Request Template](/docs/templates/pull-request-template) for merge standards.
- Skipping edge cases — the edge case you did not specify will be the bug reported in production

## Frequently Asked Questions

### Should every story have acceptance criteria?

Yes. A story without acceptance criteria is not ready for development. The criteria are the definition of "done." If you cannot write them, you do not understand the requirement well enough.

### How small should a user story be?

Small enough to complete in 2-3 days by one developer. If your sprints are 2 weeks, that is 3-5 stories per developer. Larger stories hide risk and make estimation meaningless.

### Can technical debt be a user story?

Sometimes, but reframe it. "As a developer, I want to upgrade the ORM so that we get security patches and faster queries" is valid. See [Dependency Audit Template](/docs/templates/dependency-audit-template) for evaluating library updates. "Upgrade ORM" is a task, not a story. Always connect technical work to user or developer value.
