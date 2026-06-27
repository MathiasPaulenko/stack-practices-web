---
contentType: docs
slug: architecture-decision-record-adr-template
title: "Architecture Decision Record (ADR) Template"
description: "A lightweight template for documenting significant architectural decisions, their context, options considered, and the reasoning behind the chosen approach."
metaDescription: "Document architectural decisions with this ADR template. Captures context, options, trade-offs, and consequences for future reference."
difficulty: intermediate
topics:
  - architecture
  - devops
tags:
  - adr
  - architecture-decision-record
  - documentation
  - decision-making
  - technical-planning
relatedResources:
  - /docs/devops/feature-specification-template
  - /docs/devops/engineering-handbook-template
  - /docs/system-diagram-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Document architectural decisions with this ADR template. Captures context, options, trade-offs, and consequences for future reference."
  keywords:
    - architecture decision record
    - ADR template
    - technical decision documentation
    - architecture rationale
    - decision log
---

## Overview

Every significant architectural decision creates context that fades within months. Why did we choose PostgreSQL over MongoDB? Why is the service mesh Envoy and not Linkerd? Why do we shard by tenant ID? Without written records, new engineers re-litigate old decisions, teams repeat rejected approaches, and managers make plans that conflict with technical constraints. An Architecture Decision Record (ADR) is a single document that captures the context, options, trade-offs, and consequences of a significant technical choice.

## When to Use

Use this template when:
- A decision affects more than one team or service
- The decision is hard to undo or will be expensive to reverse
- You evaluated multiple options and need to explain why one won
- You expect the decision to be questioned or revisited in the future
- Onboarding new engineers who need to understand "why the system works this way"

## Prerequisites

Before writing an ADR:
- [ ] Confirm the decision is significant enough to document (not every PR needs an ADR)
- [ ] Gather input from stakeholders who will be affected by the decision
- [ ] Document options you seriously considered, not just the winner
- [ ] Identify who has authority to approve or overturn the decision
- [ ] Choose where ADRs live (Git repo `/docs/adr/`, wiki, or dedicated docs site)

## Solution

```markdown
# ADR-XXX: `<Title of Decision>`

| Field | Value |
|-------|-------|
| Status | Proposed / Accepted / Deprecated / Superseded by ADR-YYY |
| Date | YYYY-MM-DD |
| Author | ______ |
| Deciders | ______ |
| Tags | ______ |

## 1. Context and Problem Statement

[What is the problem or opportunity that triggered this decision? What forces are at play, including technical, business, and team constraints? What happens if we do nothing?]

## 2. Decision Drivers

- [Driver 1: e.g., must support 10x traffic growth within 2 years]
- [Driver 2: e.g., team has deep expertise in X but not Y]
- [Driver 3: e.g., compliance requirement for data residency]
- [Driver 4: e.g., must integrate with existing systems without breaking changes]

## 3. Considered Options

### Option 1: [Name]
- **Description:** [What is it?]
- **Pros:** [Why it is attractive]
- **Cons:** [Why it is risky or problematic]
- **Effort:** [Rough estimate: small / medium / large]

### Option 2: [Name]
- **Description:**
- **Pros:**
- **Cons:**
- **Effort:**

### Option 3: [Name]
- **Description:**
- **Pros:**
- **Cons:**
- **Effort:**

## 4. Decision

**Chosen option:** [Option X]

**Rationale:** [Why this option wins. Reference the decision drivers — which ones does it satisfy best?]

**Trade-offs accepted:** [What are we giving up by choosing this option?]

## 5. Consequences

### Positive
- ______
- ______

### Negative
- ______
- ______

### Risks
- ______

### Mitigations
- ______

## 6. Implementation Notes

- [Step 1: ______]
- [Step 2: ______]
- [Step 3: ______]

## 7. Related Decisions

| ADR | Relationship |
|-----|-------------|
| ADR-___ | Supersedes / Depends on / Conflicts with / Complements |

## 8. Change Log

| Date | Change | Author |
|------|--------|--------|
| YYYY-MM-DD | Proposed | ______ |
| YYYY-MM-DD | Accepted | ______ |
```

## Explanation

The ADR format is intentionally lightweight. It does not require UML diagrams or formal proofs — just enough structure that someone reading it in two years understands why the decision was made and what was sacrificed. The **status field** is critical: it tells readers whether the decision is active, outdated, or replaced. The **consequences section** prevents the common mistake of documenting only the happy path; every architectural choice has downsides, and hiding them creates surprises later.

## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Team-level ADR | Shorter; focus on local scope and immediate trade-offs | Not every decision needs org-level buy-in |
| Org-level ADR | Add approval section, cost estimates, and migration timeline | Cross-team decisions need explicit sign-off |
| Infrastructure ADR | Add capacity planning, runbook impact, and operational burden | Infrastructure choices are hard to undo |
| Security ADR | Add threat model, compliance mapping, and security review sign-off | Security decisions need explicit approval |
| Deprecation ADR | Document why an old decision is being reversed and what replaces it | Deprecation deserves its own ADR |

## Best Practices

1. **Number ADRs sequentially** — `ADR-001`, `ADR-002` — so references are unambiguous
2. **Store ADRs in version control** — they should be reviewed, approved, and tracked like code
3. **Keep them short** — if it takes more than 10 minutes to read, it is too long
4. **Link related ADRs** — decisions do not exist in isolation; show the chain of reasoning
5. **Accept deprecation** — mark ADRs as superseded when better options emerge; do not delete them

## Common Mistakes

1. **Writing ADRs for everything** — not every PR or library upgrade needs an ADR; reserve them for significant, irreversible choices
2. **Only documenting the winner** — future readers need to know what was rejected and why, or they will propose it again
3. **Hiding negative consequences** — every decision has trade-offs; documenting them builds trust and prevents surprises
4. **Letting ADRs go stale** — update status to "Deprecated" or "Superseded" when decisions change
5. **Making them hard to find** — ADRs should be linked from READMEs, onboarding docs, and architecture overviews

## Frequently Asked Questions

### How is an ADR different from a design doc?

A design doc describes **how** to build something. An ADR records **why** a particular approach was chosen over alternatives. Design docs are implementation plans; ADRs are decision logs. A large project may have one design doc and multiple ADRs.

### Who should write the ADR?

The person or team proposing the decision writes the first draft. Stakeholders who will be affected by the decision should review and approve it. The author does not need to be the most senior engineer — they just need to understand the options and trade-offs.

### When should an ADR be updated?

Update the status when the decision is accepted, deprecated, or superseded. Update the content when new information changes the trade-offs (e.g., a previously rejected option becomes viable). Do not edit accepted ADRs to rewrite history — append a changelog entry instead.
