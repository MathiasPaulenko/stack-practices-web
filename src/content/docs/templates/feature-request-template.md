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

## Overview

Feature requests without structure waste time. Requesters write vague proposals, reviewers ask for clarification, and the cycle repeats. A template forces requesters to think through the problem before submitting, and gives reviewers the information they need to make a decision in one pass.

This template covers:

1. **Problem statement** — what pain exists and who feels it
2. **Proposed solution** — what to build and why this approach
3. **Acceptance criteria** — what "done" looks like
4. **User value assessment** — how to prioritize against other requests
5. **Priority framework** — how to rank requests consistently

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

## Filled Example

```markdown
# Feature Request: CSV Export from Analytics Dashboard

## Summary
Allow users to export analytics dashboard data as CSV files.

## Problem Statement
Marketing teams need to share analytics data with stakeholders who do not have
dashboard access. Currently, they take screenshots and paste numbers into
spreadsheets manually. This happens daily across 12+ teams and takes 20-30
minutes per report. The manual process introduces transcription errors.

## Proposed Solution
Add an "Export CSV" button to each chart on the analytics dashboard. The export
should include the raw data behind the chart (not the aggregated values) with
columns for date, metric, and dimension breakdowns. Limit exports to 10,000 rows
to prevent abuse. See [File Handling](/recipes/file-handling/csv-parsing) for
implementation patterns.

## Acceptance Criteria
- [ ] Export button appears on all chart types (line, bar, pie, table)
- [ ] CSV includes headers matching the dashboard column names
- [ ] Date range in export matches the selected dashboard filter
- [ ] Export fails gracefully if data exceeds 10,000 rows with a user-facing message
- [ ] Exported file downloads as `analytics_[chart]_[date].csv`
- [ ] Works in Chrome, Firefox, Safari, Edge

## User Value
- **Target users:** Marketing teams, account managers
- **Frequency:** Daily (12+ teams)
- **Pain level:** Annoying (20-30 min wasted per report)
- **Workaround:** Manual screenshot + spreadsheet entry (error-prone)

## Priority
- [x] High — major user pain, workaround exists but is error-prone

## Additional Context
- 3 customer accounts have specifically requested this in the last quarter
- Competitor X offers PDF export; CSV is more flexible for our users
- Estimated effort: M (2-3 sprints including QA)
- Related: [Data Export API](/recipes/api/streaming-responses) for API-based access
```

## Why This Structure Works

| Section | Purpose |
|---------|---------|
| **Problem statement** | Avoids "solution in search of a problem" |
| **Proposed solution** | Gives engineers a starting point for design |
| **Acceptance criteria** | Defines "done" before coding starts |
| **User value** | Helps product prioritize against other requests |
| **Priority** | Standardizes urgency across all requests |
| **Additional context** | Captures competitive intel and constraints |

## Priority Framework

| Priority | Criteria | Example |
|----------|----------|---------|
| Critical | Blocking business operation or revenue | Payment processing broken |
| High | Major user pain, no workaround or workaround is costly | Cannot export data, manual process takes 30 min |
| Medium | Improves experience, workaround exists and is tolerable | UI is slow but functional |
| Low | Nice-to-have, no current pain | Dark mode for admin panel |

## Request Lifecycle

1. **Submitted** — Requester fills out the template and creates a ticket
2. **Triaged** — Reviewer labels within 48 hours (`needs-info`, `accepted`, `rejected`, `deferred`)
3. **Estimated** — If accepted, engineering assigns t-shirt size (S/M/L/XL)
4. **Prioritized** — Product adds to roadmap or backlog with a target quarter
5. **Implemented** — Engineering builds against acceptance criteria
6. **Verified** — Requester validates the implementation matches their need
7. **Closed** — Ticket closed with release notes reference

## Tips for Requesters

- **Lead with the problem, not the solution** — the team may find a better solution
- **Include a user quote** — "As a [user], I want [capability] so that [benefit]". See [User Story Template](/docs/templates/user-story-template) for the full format.
- **Define one capability per request** — bundles are hard to evaluate and track
- **Quantify the pain** — "20-30 minutes per report, 12 teams, daily" is more compelling than "it takes too long"
- **Link to real feedback** — customer tickets, Slack threads, survey results add weight
- **Propose a solution but do not over-design** — let engineering figure out the implementation

## Tips for Reviewers

- **Reject unclear requests quickly** — "needs-more-info" label and a 48-hour deadline
- **Estimate before committing** — t-shirt sizing (S/M/L) is enough for triage. See [Clean Code Principles Guide](/guides/design/clean-code-principles-guide) for implementation standards.
- **Link to roadmap** — show where this fits (or does not fit) in quarterly goals
- **Close stale requests** — if a request has had no activity for 6 months, close it with a note
- **Batch similar requests** — if 3 requests ask for the same thing, merge them and link the duplicates

## Variants

### Lightweight (Slack/Teams)

For small teams, a Slack message with a shortened format works: "Problem: X. Proposed: Y. Priority: Z. Thoughts?" Use this for quick proposals before creating a formal ticket.

### Customer-facing (feedback portal)

When collecting requests from customers, use a simplified form with only: Summary, Problem, and How important is this? Do not expose internal priority labels or acceptance criteria to customers.

### RFC-style (engineering-heavy teams)

For technical capabilities (API changes, architecture decisions), expand the template into an RFC with sections for: Background, Goals, Non-goals, Proposed approach, Alternatives considered, Risks. See [ADR Template](/docs/templates/adr-template) for architecture decision records.

## Frequently Asked Questions

### What if the requester proposes a bad solution?

Thank them for identifying the problem, then collaborate on a better solution. The goal is solving the user's pain, not implementing their exact suggestion.

### How do I prevent capability bloat?

Require a "user value" section in every request. If the answer is "it would be cool" or "competitor X has it," push back. Capabilities must solve real, frequent pain.

### Should internal tools use the same template?

Yes, but relax the "user value" section. Internal requests need a "requesting team" and "time saved per week" instead. Use the [Bug Report Template](/docs/templates/bug-report-template) for defect tracking.

### How many requests should we accept per quarter?

Depends on team capacity. A good rule: accept no more than 60-70% of available engineering capacity. Reserve 30-40% for bugs, technical debt, and unplanned work.

### What if a request is too big for one quarter?

Break it into phases. Create an epic for the full vision, then individual requests for each phase. Label the first phase as "MVP" and subsequent phases as "Phase 2", "Phase 3", etc.

### Should I track rejected requests?

Yes. Keep them in a "rejected" state with a reason. If the same request comes up multiple times, the pattern itself is signal that it should be reconsidered.
