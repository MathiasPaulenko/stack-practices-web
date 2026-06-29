---
contentType: docs
slug: downtime-communication-template
title: "Downtime Communication Template"
description: "A template for internal and external outage messaging during service downtime."
metaDescription: "Use this downtime communication template to draft internal and external outage messages during service downtime and incidents."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - downtime
  - communication
  - outage
  - incident
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/cloud-cost-allocation-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this downtime communication template to draft internal and external outage messages during service downtime and incidents."
  keywords:
    - devops
    - downtime
    - communication
    - outage
    - incident
    - template
---
## Overview

When your service goes down, silence is worse than bad news. Customers panic, internal teams guess, and executives demand answers you do not have yet. A structured communication plan lets you control the narrative, reduce support ticket volume, and rebuild trust. This template provides pre-drafted messages for internal teams, customers, and status pages at every stage of an incident.

## When to Use

Use this resource when:
- An outage or degradation affects production services
- You need to coordinate messaging across support, marketing, engineering, and executives
- You are building an incident response runbook and need communication templates

## Solution

```markdown
# Downtime Communication: `<Service>`

## 1. Incident Metadata

| Field | Value |
|-------|-------|
| Incident ID | `INC-YYYY-NNNN` |
| Service | `name` |
| Start Time (UTC) | `YYYY-MM-DD HH:MM` |
| Detected By | `Monitoring / Customer report / Internal` |
| Severity | `SEV 1 (Critical) / SEV 2 (Major) / SEV 3 (Minor)` |
| Communicator | `@name` |
| Status Page URL | `https://status.example.com` |

## 2. Audience Matrix

| Audience | Channel | Timing | Owner | Template Section |
|----------|---------|--------|-------|-------------------|
| Internal — Engineering | Slack #incidents | Immediate | `@ic` | Internal technical |
| Internal — Executives | Email / Slack DM | Within 15 min | `@comms` | Executive summary |
| Internal — Support | Slack #support-alerts | Within 15 min | `@comms` | Customer-facing draft |
| External — Customers | Status page + email | Within 30 min | `@comms` | Customer notification |
| External — Enterprise | Dedicated account channel | Within 30 min | `@account-team` | Personalized update |

## 3. Message Templates

### 3.1. Initial Detection (Internal Technical)

> **Incident `INC-XXXX` — `<Service>` Degraded**
>
> - **Status**: Investigating
> - **Symptoms**: `brief description`
> - **Impact**: `affected regions / capabilities / user segments`
> - **Started**: `time`
> - **Actions**: Engineering team is investigating. Updates every 15 minutes.

### 3.2. Initial Detection (Customer-Facing)

> **Investigating — `<Service>` Issue**
>
> We are currently investigating reports of `symptom` affecting `service`. We will provide an update within 30 minutes or as soon as we have more information.
>
> **Affected**: `regions / capabilities`
> **Workaround**: `if any`

### 3.3. Update (Every 30–60 Minutes)

> **Update — `<Service>` Issue**
>
> We continue to investigate the cause of `symptom`. `Optional: We have identified the root cause as X and are applying a fix.` We expect to provide another update by `time`.
>
> **Status**: Investigating / Identified / Monitoring

### 3.4. Resolution

> **Resolved — `<Service>` Issue**
>
> `Service` is now fully operational. The issue was caused by `root cause (brief, jargon-free)`. All systems are stable and we are monitoring closely.
>
> **Duration**: `X minutes / hours`
> **Next Steps**: We will publish a post-mortem within `timeframe`.

### 3.5. Post-Mortem Notification

> **Post-Mortem — `<Service>` Incident on `Date`**
>
> We have completed our review of the incident on `date`. You can read the full post-mortem here: `link`.
>
> **Summary**: `One paragraph, no blame, no jargon.`
> **Impact**: `Duration + affected users`
> **Root Cause**: `Plain language`
> **Fixes Implemented**: `List`
> **Prevention**: `What we are doing to avoid recurrence`

## 4. Severity-Based Timing

| Severity | First Customer Update | Update Frequency | Escalation |
|----------|----------------------|------------------|------------|
| SEV 1 (Critical) | 15 minutes | Every 15 minutes | CEO notification after 1 hour |
| SEV 2 (Major) | 30 minutes | Every 30 minutes | VP notification after 2 hours |
| SEV 3 (Minor) | 1 hour | Every 1 hour | Manager notification if > 4 hours |

## 5. Approval Checklist

- [ ] Message is factual; no promises about resolution time unless confident
- [ ] No internal jargon or technical details that confuse customers
- [ ] Workaround is verified before publishing
- [ ] Legal / compliance reviewed if PII or regulatory data is involved
- [ ] Status page is updated before any other channel
- [ ] Social media / PR is aligned if external press may pick up the story
```

## Explanation

The template separates **internal** communication (detailed, technical, fast) from **external** communication (simple, reassuring, accurate). The most common failure during incidents is promising a resolution time you cannot meet. The templates deliberately omit specific ETAs unless the fix is already deployed and validating. The audience matrix prevents support from learning about an outage from angry customers instead of from engineering.

## Variants

| Context | Channel Mix | Tone |
|---------|-------------|------|
| B2B SaaS | Status page + direct email + account manager call | Professional, accountable |
| Consumer app | In-app banner + Twitter / X + status page | Friendly, concise |
| API platform | Status page + developer Slack / Discord | Technical, transparent |
| Global service | Regional status pages + localized emails | Localized, time-zone aware |
| Security incident | Limited disclosure + direct customer notification | Careful, compliant with legal |

## What Works

1. Update the status page first; it is the single source of truth
2. Never say "we are back to normal" until monitoring confirms for at least 10 minutes
3. Use plain language; "database replication lag" means nothing to customers
4. Do not blame third parties publicly, even if they caused it; focus on your resolution
5. Publish a post-mortem within 72 hours for SEV 1–2 incidents; silence destroys trust

## Common Mistakes

1. Waiting until the issue is "fully understood" before communicating; customers notice silence
2. Over-promising resolution time to calm stakeholders, then missing it
3. Using different wording across channels (status page says "degraded," Twitter says "down")
4. Forgetting to notify internal support before external customers
5. Skipping the post-mortem or making it so technical that non-engineers cannot understand it

## Frequently Asked Questions

### Should I communicate if only a small percentage of users are affected?

Yes. Even 1% of users for a large service is thousands of people. A brief status-page update reduces support load and shows transparency. For very minor issues (SEV 3), an in-app notice or status-page update without email may suffice. The key is to match the channel to the impact.

### What if we do not know the root cause yet?

Communicate what you know (symptoms, affected areas, actions being taken) and what you do not know (root cause, ETA). Honesty builds more trust than silence. Example: "We have identified that login is failing for users in EU regions. We are investigating the cause and will update in 30 minutes."

### How do I handle a security incident differently?

Security incidents require legal and compliance review before external communication. Do not disclose details that could help attackers. Notify affected customers directly (not just a public status page). Follow your incident response plan and any breach notification laws (GDPR 72-hour rule, state breach laws). The message should be factual, limited, and approved by legal.
