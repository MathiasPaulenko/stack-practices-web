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

## Status Page Message Templates

```text
=== SEV 1: Initial Detection ===

Status: Investigating
We are investigating an issue affecting [SERVICE/AFFECTED FEATURE].
Customers may experience [SYMPTOMS: e.g., login failures, slow responses].
We identified the issue at [TIME] and are actively working on a fix.
Next update in 15 minutes.

=== SEV 1: Identified ===

Status: Identified
We have identified the root cause: [PLAIN LANGUAGE DESCRIPTION].
A fix is being deployed and we expect service to be restored within [TIMEFRAME].
Next update in 15 minutes.

=== SEV 1: Monitoring ===

Status: Monitoring
A fix has been deployed and we are monitoring the service.
Preliminary indicators show improvement but we want to confirm stability.
Next update in 15 minutes.

=== SEV 1: Resolved ===

Status: Resolved
The issue has been resolved. Service is operating normally.
We will publish a post-mortem within 72 hours.
Thank you for your patience.
```

## Internal Slack Communication Templates

```text
=== Incident Channel: #incident-2026-07-11 ===

[11:00] @on-call: SEV1 declared — auth-service returning 500s
[11:01] @on-call: Impact: ~15% of login attempts failing, EU region
[11:02] @sre: Investigating — checking recent deployments and DB health
[11:05] @sre: Found — recent config deploy changed JWT secret rotation
[11:06] @on-call: Fix identified — rolling back config change
[11:08] @sre: Rollback deployed, monitoring error rate
[11:12] @on-call: Error rate dropping — 15% -> 3% -> 0.5%
[11:15] @on-call: Error rate at 0%. Monitoring for 10 more minutes.
[11:25] @on-call: Stable. SEV1 resolved. Post-mortem scheduled for tomorrow.

=== Support Channel: #support ===

[11:02] @on-call: SEV1 — login failures for EU users. Status page updated.
[11:03] @on-call: If customers ask: "We are aware of login issues in EU and are working on it."
[11:08] @on-call: Fix deployed, monitoring. Do not promise resolution time yet.
[11:25] @on-call: Resolved. Status page updated to green. Thank support team.
```


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


### How do we communicate during a prolonged outage?

For outages lasting more than 1 hour: update the status page every 30 minutes even if there is no new information. Share what you are doing, not just what you know. Example: "We are testing a database failover to the secondary region. This process takes approximately 20 minutes." Assign a dedicated communicator who is not in the incident resolution path. The communicator gathers updates from the incident commander and translates them for external audiences. Keep internal and external messages consistent in tone and facts.

### What should we include in a post-mortem?

A post-mortem should include: incident summary (what happened, when, impact), timeline of events (detection, response, resolution), root cause analysis (the actual cause, not just the symptom), contributing factors (what made it worse or harder to detect), action items with owners and deadlines, lessons learned (what went well, what did not), and appendices (graphs, logs, screenshots). Write it blamelessly — focus on systems and processes, not individuals. Share it with the entire engineering team. Track action items to completion.

### How do we handle communication for partial degradation?

Partial degradation is harder to communicate than a full outage. Be specific about what is affected and what is not. Example: "Search functionality is degraded — results may be delayed by up to 10 seconds. All other features are operating normally." Avoid vague terms like "some users" — quantify if possible. Update the status page with a "Partial Outage" or "Degraded Performance" indicator. Monitor whether the partial degradation worsens into a full outage and escalate communication accordingly.

### Should we use social media during incidents?

Use social media (Twitter/X) for consumer-facing services to reach users who may not check the status page. Keep messages short and link to the status page for details. Do not engage in technical debates on social media during an active incident. Assign one person to monitor social media for customer reports. After resolution, post a summary linking to the post-mortem. For B2B services, social media is less important — focus on direct customer communication.

### How do we train the team on incident communication?

Run regular incident communication drills (game days). Simulate an incident and practice the communication flow: status page updates, internal Slack messages, support team notifications, and stakeholder emails. Review the messages afterward for clarity, tone, and timing. Rotate the communicator role so multiple team members gain experience. Create a communication runbook with templates and decision trees. Review past incident communications in team retrospectives to identify improvements.


### How do we handle communication for scheduled maintenance?

For scheduled maintenance: notify customers at least 7 days in advance via email and status page. Include: maintenance window (start and end time), expected impact (downtime, degraded performance, or read-only mode), affected services, and reason for maintenance. Send a reminder 24 hours before. Update the status page to "Maintenance" during the window. Provide real-time updates during maintenance. Send a resolution notification when maintenance completes. Document the maintenance in the post-mortem if any unexpected issues occurred.

### What is a status page and which service should we use?

A status page is a public web page that shows the current operational status of your service. Popular options: Atlassian Statuspage, Better Uptime, Instatus, or self-hosted (Cachet, Staytus). Choose based on: budget, integration with monitoring tools, customization needs, and incident management workflow. The status page should show: current status (operational, degraded, partial outage, major outage), active incidents with timestamps, scheduled maintenance, and incident history. Keep it on a separate domain or subdomain so it is accessible even if your main service is down.

### How do we measure communication effectiveness during incidents?

Track: time from detection to first external communication (target: < 15 min for SEV1), number of status page updates during the incident, customer satisfaction with communication (post-incident survey), support ticket volume during the incident (lower = better communication), and social media sentiment. Review these metrics in the post-mortem. Set targets: first update within 15 minutes, updates every 15-30 minutes, post-mortem within 72 hours. Improve communication processes based on these metrics.


End of document. Review and update communication templates after every major incident. Train all on-call engineers on the communication process quarterly.























End of document. Review and update quarterly.