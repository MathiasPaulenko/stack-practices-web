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

## Weekly Ops Review Dashboard Query

```text
=== Weekly Ops Review Dashboard ===

Week of: 2026-07-08 to 2026-07-14

1. INCIDENT SUMMARY
   Total incidents:        3
   P0 (critical):          0
   P1 (high):              1 (auth-service timeout, 2026-07-10)
   P2 (medium):            2 (cache eviction storm, DB slow query)
   Mean time to detect:    4 min
   Mean time to resolve:   22 min
   Customer impact:        1,200 users affected (P1)

2. SLO STATUS
   Service          SLO Target   Actual    Budget Remaining
   api-gateway      99.9%        99.92%    78%
   auth-service     99.9%        99.85%    42% (trending down)
   payment-service  99.95%       99.96%    65%
   search-service   99.5%        99.51%    51%

3. COST ANALYSIS
   This week:       $12,450
   Last week:       $11,800
   Trend:           +5.5% (investigate)
   Top cost:        EC2 instances ($4,200)
   Anomaly:         S3 egress +40% (new export feature?)

4. DEPLOYMENT SUMMARY
   Total deploys:   7
   Rollbacks:       1 (api-gateway v2.3, config error)
   Hotfixes:        1 (auth-service session fix)
   Failed deploys:  0

5. RECURRING THEMES
   - auth-service latency spikes during peak (3rd week)
   - Cache eviction rate above baseline (2nd week)
   - S3 egress cost increasing (1st week, new pattern)
```

## Action Item Tracking Template

```text
=== Action Item Tracker ===

Week: 2026-07-08

| ID  | Priority | Action                              | Owner    | Status    | ETA         |
|-----|----------|-------------------------------------|----------|-----------|-------------|
| A01 | P1       | Investigate auth-service latency    | alice    | In Progress| 2026-07-15 |
| A02 | P1       | Fix cache eviction policy           | bob      | Open       | 2026-07-18 |
| A03 | P2       | Review S3 egress cost spike         | charlie  | Open       | 2026-07-22 |
| A04 | P2       | Update DB query with missing index  | dba-team | Done       | 2026-07-10 |
| A05 | P0       | Add alert for auth-service p99 > 2s | alice    | Done       | 2026-07-11 |

Previous Week Items:
| ID  | Action                              | Owner    | Status    |
|-----|-------------------------------------|----------|-----------|
| P01 | Reduce EC2 costs by right-sizing    | platform | Done      |
| P02 | Add synthetic test for checkout     | qa-team  | In Progress|
| P03 | Document failover procedure         | sre-team | Done      |
```


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


### How do we automate the ops review data collection?

Use a script or dashboard that pulls data from your monitoring (Datadog, Prometheus), incident management (PagerDuty, Opsgenie), and cost management (AWS Cost Explorer, CloudHealth) APIs. Generate the tables automatically and fill in the narrative manually. Store the weekly report in a shared wiki or document system. Automate data collection but keep the analysis human — the value of the review is in the discussion, not the numbers.

### What metrics should we track beyond incidents and cost?

Track: deployment frequency, lead time for changes, change failure rate, mean time to recovery (DORA metrics). Track SLO burn rate and error budget consumption. Track on-call load (pages per week, escalations). Track technical debt items closed. Track security findings open and resolved. Track customer-reported issues. These metrics together give a holistic view of operational health.

### How do we handle action items that never get done?

Escalate stale action items (open for more than 2 weeks) to the team lead. If an action item is not important enough to complete in 2 weeks, close it and document why. Do not let the action item list grow indefinitely — it becomes noise. Limit active action items to 10 per team. If you hit the limit, close the oldest items or escalate to leadership for prioritization.

### Should we share the ops review with the broader company?

Share a summarized version monthly with leadership and stakeholders. Include: incident count, SLO status, cost trends, and major achievements. Omit internal action items and detailed technical analysis. The monthly summary builds trust and transparency. For engineering teams, share the full weekly review in a shared channel or wiki so everyone can see trends and contribute observations.

### How do we run the review for distributed teams?

Use a shared document (Google Docs, Notion, Confluence) that everyone can edit simultaneously. Start with a 5-minute data review (tables), then 15 minutes for discussion (narrative), then 10 minutes for action items. Record the meeting for async participants. Rotate the facilitator weekly to build ownership. Use a consistent template so the review is comparable week over week. Keep a backlog of discussion topics for weeks with fewer incidents.


### How do we handle blameless post-mortems in the ops review?

Dedicate 5 minutes at the start of each review to discuss the previous week's incidents using a blameless approach. Focus on what happened, why it happened, and what systemic changes would prevent it. Never blame individuals — blame systems, processes, and tools. Document action items from post-mortems and track them in the action item tracker. Share post-mortem summaries with the broader team for learning. Celebrate good incident responses publicly.

### What is an error budget and how do we use it in the review?

An error budget is the maximum amount of time a service can fail its SLO before corrective action is required. For a 99.9% SLO over 30 days, the error budget is 43 minutes. Track error budget consumption weekly. If a service has consumed more than 50% of its budget in less than half the period, flag it as at-risk. If the budget is exhausted, freeze non-essential changes and focus on reliability improvements. Report error budget status in every ops review.

### How do we track on-call health in the review?

Track: number of pages per week per on-call engineer, number of escalations, pages outside business hours, and on-call fatigue indicators (consecutive high-page weeks). Target: fewer than 5 pages per shift, fewer than 2 pages outside business hours. If an on-call engineer receives more than 10 pages in a week, flag it as an on-call health issue and investigate root causes. Rotate on-call schedules to prevent burnout. Discuss on-call health in every ops review.

### What tools should we use for the ops review?

Use a combination of: monitoring dashboards (Grafana, Datadog) for SLO and incident data, cost management tools (AWS Cost Explorer, CloudHealth) for spend analysis, incident management tools (PagerDuty, Opsgenie) for incident logs, and a shared document (Google Docs, Notion) for the weekly report. Automate data extraction with scripts or APIs where possible. Keep the review format consistent week over week for trend analysis. Store all weekly reports in a searchable archive for historical comparison.





















End of document. Review and update quarterly.