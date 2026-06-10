---
contentType: docs
slug: adr-template
templateType: adr
title: "ADR Template"
description: "A reusable template for Architecture Decision Records that capture context, decision, and consequences."
metaDescription: "Use this ADR template to document architecture decisions with context, options considered, decision, and consequences."
difficulty: beginner
topics:
  - architecture
tags:
  - adr
  - template
  - architecture
  - decision-records
  - documentation
  - rfc
relatedResources:
  - /docs/templates/readme-template
  - /guides/api/rest-api-design-guide
  - /patterns/design/mvc-pattern
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Use this ADR template to document architecture decisions with context, options considered, decision, and consequences."
  keywords:
    - adr template
    - architecture decision record
    - decision log
    - software architecture
    - rfc template
---

## Template Structure

Use this template as the foundation for documenting any architecture decision in your project.

---

## ADR-XXX: [Short Title]

### Status

- Proposed
- Accepted
- Deprecated
- Superseded by [ADR-YYY]

### Context

Describe the forces at play, including technological, political, social, and project-local factors. Explain the problem that motivates this decision and why it needs to be made now.

### Decision

State the architecture decision in a single sentence. Be clear and direct.

> We will [decision].

### Consequences

#### Positive

- Benefit 1
- Benefit 2

#### Negative / Trade-offs

- Drawback 1
- Drawback 2

### Alternatives Considered

#### Alternative A: [Name]

**Description**: Brief description.
**Pros**: Why it was attractive.
**Cons**: Why it was rejected.

#### Alternative B: [Name]

**Description**: Brief description.
**Pros**: Why it was attractive.
**Cons**: Why it was rejected.

### Related Decisions

- [ADR-001: Previous Related Decision](link)

### Decision Owners

- Author: @username
- Date: YYYY-MM-DD
- Approved by: @stakeholder

---

## Best Practices for Writing ADRs

- **One decision per ADR**: Keep scope focused
- **Write after the decision**: Document decisions once made, not debates
- **Link related ADRs**: Create a chain of decisions
- **Store in version control**: Keep ADRs alongside code (`docs/adr/`)
- **Use sequential numbering**: `0001-use-postgresql.md`, `0002-adopt-graphql.md`

## Common Mistakes

- Writing ADRs before the decision is made (they become debates)
- Omitting the context (future readers won't understand why)
- Not listing alternatives (makes the decision look arbitrary)
- Forgetting to mark ADRs as deprecated when superseded
