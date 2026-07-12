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
  - design-patterns
  - patterns
relatedResources:
  - /docs/feature-request-template
  - /guides/clean-code-principles-guide
  - /guides/test-driven-development-guide
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

## What Works

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


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Bug fix | Format: "As a user, I want X to not fail so I can Y" | Include reproduction steps |
| Large feature | Split into multiple stories with independent acceptance criteria | Avoid epic stories |
| Tech debt | Format: "As a team, we want X so we can Y" | The user is the team |
| Investigation | Format: "As a team, we want to evaluate X to decide Y" | Output is a document, not code |
| Spike | Format: "As a team, we want to prototype X to validate Y" | Timeboxed |

## Complete User Story Example

```text
=== Story: Push notifications for orders ===

Title: As a customer, I want push notifications when my order status changes
ID: PROJ-456
Sprint: 2026-S28
Estimate: 5 points
Priority: High
Owner: alice@company.com

Story:
  As a mobile app customer
  I want to receive push notifications when my order status changes
  So I can track my order without opening the app

Acceptance Criteria:
  Given I have an order in progress
  When the status changes to "shipped"
  Then I receive a push notification with the new status and tracking number

  Given I have an order in progress
  When the status changes to "delivered"
  Then I receive a push notification and a confirmation email

  Given I have push notifications disabled
  When my order status changes
  Then I do not receive push notifications but I do receive an email

  Given the app is in the foreground
  When a push notification arrives
  Then an in-app banner is shown instead of a system notification

Technical Notes:
  - Use Firebase Cloud Messaging (FCM) for Android
  - Use APNs for iOS
  - Create notification_log table for audit
  - Rate limit: max 1 notification per order per status change
  - Tracking number comes from carrier API

Dependencies:
  - Carrier API integration (PROJ-450)
  - FCM setup (ops task)
  - APNs setup (ops task)

Risks:
  - APNs may have high latency during peak hours
  - FCM tokens can expire; handle re-registration
  - Duplicate notifications if carrier webhook is resent

Definition of Done:
  [ ] Code reviewed and approved
  [ ] Unit and integration tests pass
  [ ] E2E tests pass in staging
  [ ] API documentation updated
  [ ] Monitoring and alerts configured
  [ ] Deployed to production
```

### How do we split large stories (epics)?

An epic is a story too large for a single sprint. To split it: identify independent acceptance criteria — each can be its own story. Use the "vertical slice" pattern: each story delivers user value end-to-end, not just a technical layer. Avoid splitting by layers (frontend, backend, database) — this creates stories that do not deliver value on their own. Use the INVEST pattern: Independent, Negotiable, Valuable, Estimable, Small, Testable. If a story is not Small, split it. Document the relationship between split stories with links. The Product Owner is responsible for prioritizing split stories.

### How do we estimate user stories?

Use Planning Poker with the Fibonacci sequence (1, 2, 3, 5, 8, 13, 21). Each engineer estimates independently, then discusses differences. Estimation is relative, not absolute — a 5-point story is larger than a 3-point one, not necessarily 5 days. Include in the estimate: development, testing, code review, documentation, and risk. A 1-point story should be completable in 1-2 days. If a story is 13 or more, split it. Review estimates vs. actual time in the retro to calibrate. Do not use estimates to evaluate individual performance — they are for planning, not measurement.

### How do we handle stories that change during the sprint?

If a story changes during the sprint: assess the impact. If the change is small (an additional acceptance criterion): add the criterion and continue. If the change is large (significant new scope): move the story back to the backlog and create a new one with the updated scope. The Product Owner must approve any change. Document the change and the reason. If the change is caused by a technical discovery (e.g., the API does not support what we thought): document the discovery and adjust the story. Do not force a story to fit if the scope changed considerably — it is better to be transparent about the change.

### How do we write effective acceptance criteria?

Use the Gherkin format (Given-When-Then) for acceptance criteria. "Given [context], when [action], then [expected result]." Each criterion must be testable — if you cannot write a test for it, it is not a good criterion. Include negative criteria: "Given the user does not have permissions, when they try X, then they receive a 403 error." Include edge cases: "Given the database is not responding, when the user does X, then they receive a friendly error message." Avoid vague criteria like "the UI should look good" — specify exactly what. The Product Owner and the engineer must agree on what each criterion means before development starts.



















































































End of document. Review and update quarterly.