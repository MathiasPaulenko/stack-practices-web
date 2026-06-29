---
contentType: docs
slug: weekly-ops-review-template
title: "Weekly Ops Review Template"
description: "A template for summarizing incidents, costs, performance, and action items in weekly operations reviews."
metaDescription: "Use this weekly ops review template to summarize incidents, cloud costs, performance metrics, and action items for your operations team."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - weekly
  - review
  - operations
  - incident
  - cost
  - performance
  - template
relatedResources:
  - /docs/performance-regression-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/cloud-cost-allocation-template
  - /docs/downtime-communication-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this weekly ops review template to summarize incidents, cloud costs, performance metrics, and action items for your operations team."
  keywords:
    - devops
    - weekly
    - review
    - operations
    - incident
    - cost
    - performance
    - template
---
## Overview

Ops reviews are where teams spot trends before they become incidents. A weekly review of incidents, costs, and performance turns scattered alerts into useful patterns. Without structure, ops reviews become complaint sessions or status updates that no one reads. This template creates a repeatable format: what happened, what it cost, what is trending, and what we are doing about it.

## When to Use

Use this resource when:
- Your team is reacting to incidents but never analyzing patterns
- Cloud costs are creeping up without explanation
- You are establishing an SRE or platform engineering practice and need a regular review cadence

## Solution

```markdown
# Weekly Ops Review: `<Week of YYYY-MM-DD>`

## 1. Executive Summary

| Metric | This Week | Last Week | Trend | Target |
|--------|-----------|-----------|-------|--------|
| Incidents | `X` | `Y` | ↑ / ↓ / → | `< 3` |
| SEV 1–2 | `X` | `Y` | ↑ / ↓ / → | `0` |
| MTTR (mean) | `X min` | `Y min` | ↑ / ↓ / → | `< 30 min` |
| Cloud Cost | `$X` | `$Y` | ↑ / ↓ / → | `< $Z` |
| Error Budget Remaining | `X%` | `Y%` | ↑ / ↓ / → | `> 50%` |

**Narrative:** `One-paragraph summary of the week: biggest issue, biggest win, biggest risk.`

## 2. Incident Review

| ID | Severity | Service | Root Cause | MTTR | Action Item | Owner | Status |
|----|----------|---------|------------|------|-------------|-------|--------|
| INC-### | SEV 1/2/3 | `service` | `cause` | `X min` | `action` | `@name` | Open / Closed |

### Recurring Themes

- `Theme 1: description and frequency`
- `Theme 2: description and frequency`

### Follow-Up from Last Week

- [ ] `Action item 1` — `@owner` — `status`
- [ ] `Action item 2` — `@owner` — `status`

## 3. Cost Analysis

| Category | This Week | Last Week | Delta | Budget | Variance |
|----------|-----------|-----------|-------|--------|----------|
| Compute (EC2 / GCE) | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Storage | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Data Transfer | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Managed Services | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| **Total** | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |

### Cost Drivers

- `Driver 1: description`
- `Driver 2: description`

### Cost Action Items

| Action | Projected Savings | Owner | Deadline |
|--------|-------------------|-------|----------|
| | | | |

## 4. Performance & Reliability

| Service | Availability | Latency P99 | Error Rate | Saturation | Status |
|---------|------------|-------------|------------|------------|--------|
| `API` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |
| `Web` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |
| `Worker` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |

### SLO Breaches

| Service | SLO | Actual | Budget Impact | Action |
|---------|-----|--------|---------------|--------|
| | | | | |

## 5. Action Items for Next Week

| Priority | Action | Owner | ETA | Success Criteria |
|----------|--------|-------|-----|------------------|
| P0 | | | | |
| P1 | | | | |
| P2 | | | | |

## 6. Risks & Escalations

| Risk | Likelihood | Impact | Mitigation | Escalation |
|------|------------|--------|------------|------------|
| | | | | |
```

## Explanation

The template separates **data** from **narrative**. The tables force quantitative review; the narrative section explains what the numbers mean. Many teams skip cost analysis until the bill shocks finance. Including cost weekly builds cost awareness into engineering culture. The recurring themes section is where you catch systemic issues: three memory-related incidents in three weeks means a pattern, not bad luck.

## Variants

| Context | Focus | Cadence |
|---------|-------|---------|
| Startup (< 20 people) | Incidents + cost only; skip SLO tables | Weekly, 15 min |
| Scale-up (20–100) | Full template; assign action item owners | Weekly, 30 min |
| Enterprise (100+) | Per-service reviews; aggregated monthly | Weekly per team, monthly cross-team |
| Platform / SRE team | Focus on shared infrastructure and tenant health | Weekly, 45 min |
| Cost-conscious org | Expand cost section; include per-feature costing | Weekly, 30 min |

## What Works

1. Keep the review under 30 minutes; long meetings kill engagement
2. Assign owners to every action item in the meeting, not after
3. Review last week's action items first; accountability reinforces the habit
4. Use real numbers, not anecdotes; "feels slow" is not useful
5. Document risks before they become incidents; escalation early prevents fires

## Common Mistakes

1. Turning the review into a blame session; focus on systems, not people
2. Skipping cost analysis until finance complains; costs creep silently
3. Not reviewing action items from previous weeks; this makes the meeting useless
4. Allowing "no incidents this week" to mean "no discussion needed"; always review trends
5. Not escalating risks early; waiting until a risk becomes an incident wastes the review

## Frequently Asked Questions

### Who should attend the ops review?

Engineering leads, on-call representatives, and a product or business stakeholder. The SRE or platform lead runs the meeting. Individual contributors attend when their service is discussed. Keep it small: 6–8 people maximum. Larger groups turn the meeting into a status report that nobody owns.

### What if there were no incidents this week?

Celebrate briefly, then dig deeper. Review cost trends, performance drift, and upcoming risks. A quiet week is an opportunity to pay down technical debt or tighten SLOs. Never cancel the review because "nothing happened"; consistency builds the habit that catches issues early.

### How do I make engineers care about cost?

Show cost per feature or per customer, not just total spend. Engineers relate to efficiency. If Feature X costs $0.05 per user per month and Feature Y costs $2.00, that comparison drives optimization. Also, share cost savings achievements as engineering wins; reducing waste is as valuable as shipping code.
