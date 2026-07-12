---





contentType: docs
slug: adr-template
templateType: adr
title: "ADR Template"
description: "A reusable template for Architecture Decision Records that capture context, decision, and consequences."
metaDescription: "Architecture Decision Record template for documenting software decisions with context, options, outcomes, and consequences in a structured format."
difficulty: beginner
topics:
  - architecture
tags:
  - adr
  - architecture
  - documentation
  - template
  - design
relatedResources:
  - /docs/readme-template
  - /guides/rest-api-design-guide
  - /patterns/mvc-pattern
  - /recipes/dependency-injection
  - /recipes/multi-tenancy
  - /recipes/service-discovery
  - /recipes/workflow-engine
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Architecture Decision Record template for documenting software decisions with context, options, outcomes, and consequences in a structured format."
  keywords:
    - adr template
    - architecture decision record
    - decision log
    - software architecture
    - rfc template





---

## Overview

Architecture Decision Records (ADRs) capture the "why" behind technical decisions. Code shows what was built; ADRs explain why it was built that way. Without ADRs, teams re-litigate the same decisions, new members guess at rationale, and reversing decisions feels risky because no one remembers the trade-offs.

This template covers:

1. **Context** — forces that motivated the decision
2. **Decision** — a clear, single-sentence statement
3. **Consequences** — positive and negative impacts
4. **Alternatives** — what was considered and rejected, with reasons
5. **Lifecycle** — how ADRs evolve over time

## Template Structure

Use this template as the foundation for documenting any architecture decision in your project. Pair it with the [System Diagram Template](/docs/templates/adr-template) to visualize the architecture being decided.

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

## Filled Example

```markdown
## ADR-004: Use PostgreSQL for Primary Data Store

### Status

Accepted

### Context

The platform currently uses MongoDB for all data. As we add reporting and analytics
features, the lack of joins and ACID transactions is causing complex aggregation
pipelines and data consistency issues. The team has PostgreSQL experience and the
ops team can manage it with existing tooling. The migration needs to happen before
Q4 to avoid blocking the reporting roadmap.

### Decision

> We will migrate the primary data store from MongoDB to PostgreSQL, keeping
> MongoDB for event logs and audit trails only.

### Consequences

#### Positive

- ACID transactions eliminate data consistency issues in reporting
- SQL joins replace 12+ aggregation pipeline stages
- Team productivity increases (existing PostgreSQL expertise)
- Better tooling for BI and reporting integrations

#### Negative / Trade-offs

- Migration requires dual-write period of 4-6 weeks
- MongoDB's flexible schema is lost; stricter schema discipline needed
- Operational complexity increases (two databases instead of one)

### Alternatives Considered

#### Alternative A: Keep MongoDB, add PostgreSQL for reporting only

**Description**: Use MongoDB as primary, PostgreSQL as a read replica for reports.
**Pros**: No migration risk, less operational disruption.
**Cons**: Dual-write complexity, data consistency risk, two sources of truth.

#### Alternative B: Switch to a managed NewSQL database (CockroachDB)

**Description**: Use CockroachDB for distributed SQL with horizontal scaling.
**Pros**: Scales horizontally, SQL interface, ACID compliance.
**Cons**: Team has no experience, higher cost, over-engineered for current scale.

### Related Decisions

- [ADR-001: Initial choice of MongoDB](link)
- [ADR-003: Adopt event sourcing for audit trails](link)

### Decision Owners

- Author: @jane.doe
- Date: 2026-07-10
- Approved by: @tech-lead, @ops-lead
```

## ADR Lifecycle

| State | Meaning | Action |
|-------|---------|--------|
| **Proposed** | Decision is drafted but not yet accepted | Circulate for review, gather feedback |
| **Accepted** | Decision is approved and active | Implement, link from relevant docs |
| **Deprecated** | Decision is no longer active but not replaced | Mark with date and reason |
| **Superseded** | Decision replaced by a newer ADR | Add superseded-by link, keep original intact |

## What works for Writing ADRs

- **One decision per ADR**: Keep scope focused
- **Write after the decision**: Document decisions once made, not debates
- **Link related ADRs**: Create a chain of decisions
- **Store in version control**: Keep ADRs alongside code (`docs/adr/`). See [README Template](/docs/templates/readme-template) for project doc organization.
- **Use sequential numbering**: `0001-use-postgresql.md`, `0002-adopt-graphql.md`
- **Keep context specific**: name the teams, tools, and constraints involved
- **Date every ADR**: helps readers understand the timeline of decisions
- **Name the decision makers**: accountability prevents anonymous decisions

## Common Mistakes

- Writing ADRs before the decision is made (they become debates)
- Omitting the context (future readers won't understand why)
- Not listing alternatives (makes the decision look arbitrary)
- Forgetting to mark ADRs as deprecated when superseded
- Writing essays instead of concise records — aim for 1-2 pages
- Not linking to related ADRs — decisions exist in a chain
- Deleting or rewriting old ADRs — the history is the value


## Variant Comparison

| Variant | Context | Approach | Notes |
|---------|---------|----------|-------|
| Lightweight ADR | Small team, low-stakes decision | Title + Context (2-3 sentences) + Decision + Date | Skip alternatives for reversible choices |
| Full ADR | Cross-team impact, costly to reverse | All sections including alternatives and consequences | Store in `docs/adr/` with sequential numbering |
| RFC-style | Large org, multiple stakeholders | Add goals, non-goals, rollout plan, risks | Circulate for comments before accepting |
| MADR | Machine-readable metadata needed | Structured frontmatter with status, deciders, tags | Enables automated ADR index generation |

## Detailed Scenario: Choosing a Message Broker

```text
ADR-007: Adopt RabbitMQ as the Internal Message Broker

Context:
  The platform uses synchronous HTTP calls between the order service and
  the inventory service. When inventory is slow or down, orders fail.
  The team evaluated three options: RabbitMQ, Kafka, and SQS.

  Current pain points:
  - 0.3% of orders fail due to inventory service timeouts
  - No retry mechanism; failed orders require manual reconciliation
  - Peak traffic (Black Friday) causes cascading failures

Decision:
  We will adopt RabbitMQ as the message broker for service-to-service
  communication, starting with the order-to-inventory flow.

  Configuration:
  - Exchange: topic, durable=true
  - Queue: inventory_updates, durable=true
  - Prefetch: 10 messages per consumer
  - Dead-letter exchange: orders.dlx
  - Retry strategy: exponential backoff (1s, 5s, 30s, 5m)
  - Max retries: 3 before routing to DLQ

  Rollout plan:
  1. Week 1-2: Deploy RabbitMQ cluster (3 nodes) in staging
  2. Week 3: Migrate order-to-inventory flow to async
  3. Week 4: Load test with 2x peak traffic
  4. Week 5: Production rollout with dual-write (sync + async)
  5. Week 6: Cut over to async-only, remove sync fallback

Consequences:
  Positive:
  - Orders no longer fail when inventory is slow
  - Retry logic handles transient failures automatically
  - DLQ captures poison messages for manual review
  Negative:
  - New operational burden: RabbitMQ cluster monitoring
  - Eventual consistency replaces immediate feedback
  - Team needs to learn AMQP concepts (exchanges, bindings, DLQ)
```

### How do I link ADRs to code changes?

Reference the ADR number in commit messages and PR descriptions. For example: `feat(orders): async inventory check (ADR-007)`. This creates a searchable link between decisions and implementation. Some teams add a comment at the top of affected files pointing to the relevant ADR.

### What if the team disagrees with a decision?

Document the disagreement in the Alternatives section. Record who objected and why. If the objection is strong enough, keep the ADR in Proposed status and schedule a follow-up discussion. Do not silently override objections — the ADR exists to make disagreements visible.

### Can I update an accepted ADR?

Only to add clarifications or corrections. If the decision itself changes, create a new ADR that supersedes the old one. Mark the original as Superseded with a link to the new ADR. Never rewrite history — the value of ADRs is in the decision trail.

## Variants

### Lightweight ADR (small teams)

For small teams, reduce the template to: Title, Context (2-3 sentences), Decision (1 sentence), Date. Skip alternatives and consequences for low-stakes decisions. Expand to the full template for decisions that affect multiple teams or are costly to reverse.

### RFC-style (large organizations)

For large organizations, expand the template with: Background, Goals, Non-goals, Detailed proposal, Rollout plan, Risks and mitigations. Circulate as a Request for Comments before marking as Accepted. See [Feature Request Template](/docs/templates/feature-request-template) for the RFC variant.

### MADR (Markdown ADR)

MADR is a structured markdown format for ADRs with specific frontmatter fields. It adds `status`, `deciders`, `date`, and `tags` as machine-readable metadata. Useful when you want to generate an ADR index or dashboard automatically.

## Frequently Asked Questions

### When should I write an ADR?

Write an ADR after a major architectural decision is made — typically when the decision affects multiple teams, is costly to reverse, or has long-term maintenance implications. For high-impact infrastructure decisions, also document capacity plans using the [Capacity Planning Template](/docs/templates/capacity-planning-template). Do not write ADRs for trivial choices.

### Who should read ADRs?

New team members, external reviewers, and future maintainers. ADRs serve as a historical record that helps people understand why the system is built the way it is, reducing repeated debates and wrong assumptions.

### How do I handle a decision that changes later?

Mark the original ADR as deprecated with a superseded-by link to the new ADR. Do not delete or rewrite historical ADRs. The evolution of decisions is itself valuable context.

### Should ADRs be public or private?

Default to public within your organization. Private ADRs are appropriate for decisions involving security architecture, vendor pricing, or competitive strategy. Use a separate private repository for sensitive ADRs.

### How long should an ADR be?

1-2 pages. If it is longer, the decision is probably not well-scoped or the context is too broad. Split complex decisions into multiple ADRs that each address one aspect.

### Should I use a tool to manage ADRs?

A `docs/adr/` directory in version control is sufficient for most teams. Tools like `adr-tools` (CLI) and `log4brains` (web UI) add numbering automation and search. Start simple and adopt a tool only if managing ADRs manually becomes a burden.
