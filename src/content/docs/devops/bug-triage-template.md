---
contentType: docs
slug: bug-triage-template
title: "Bug Triage Template"
description: "A template for classifying and routing bug reports by severity and impact."
metaDescription: "Use this bug triage template to classify bug reports by severity, assign priority, and route them to the correct engineering team."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - bug
  - triage
  - severity
  - operations
  - template
relatedResources:
  - /docs/runbook-template
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
  - /docs/cross-region-failover-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this bug triage template to classify bug reports by severity, assign priority, and route them to the correct engineering team."
  keywords:
    - devops
    - bug
    - triage
    - severity
    - operations
    - template
---
## Overview

Not all bugs are equal. A cosmetic issue in a dark-mode toggle is not a data-loss bug in a payment flow. Without a triage system, critical issues sit in backlogs while engineers chase low-priority noise. This template creates a repeatable classification and routing system so the right bugs reach the right teams at the right priority.

## When to Use

Use this resource when:
- Your bug backlog is growing faster than your team can close items
- Critical production issues are buried under minor feature requests
- Multiple teams share a bug queue and ownership is unclear

## Solution

```markdown
# Bug Triage: `<Project / Product>`

## 1. Severity Classification

| Severity | Impact | Examples | Response Time | Resolution Target |
|----------|--------|----------|---------------|-------------------|
| S1 — Critical | Service unusable or data loss | Payment failing, login broken, data corruption | 15 min | 4 hours |
| S2 — High | Major feature broken; workaround exists | Search down, report export fails | 2 hours | 24 hours |
| S3 — Medium | Feature degraded but functional | Slow page loads, incorrect sorting | 24 hours | 1 week |
| S4 — Low | Cosmetic or minor inconvenience | Misaligned button, typo, color mismatch | 1 week | Next sprint |

## 2. Triage Questions

Answer these questions for every incoming bug report:

1. **Reproducibility**
   - [ ] Can the bug be reproduced consistently?
   - [ ] If intermittent, what is the approximate frequency?
   - [ ] Does it affect a specific user segment, device, or browser?

2. **Impact**
   - [ ] Does it block a core user journey (signup, purchase, login)?
   - [ ] Does it affect a single user, a subset, or all users?
   - [ ] Is there a workaround? How difficult is it?

3. **Regulatory / Security**
   - [ ] Does it expose PII or sensitive data?
   - [ ] Does it violate a compliance requirement (PCI, SOC 2, GDPR)?

4. **Recency**
   - [ ] Did this bug appear after a recent release?
   - [ ] Is it a regression of a previously fixed issue?

## 3. Routing Rules

| Severity | Assignee | Channel | Escalation |
|----------|----------|---------|------------|
| S1 | On-call engineer + Team lead | Page + War room | VP Engineering after 1 hour |
| S2 | Team lead | Slack #incidents | Manager after 4 hours |
| S3 | Next available engineer | JIRA / Linear | Team lead if unresolved after 3 days |
| S4 | Backlog | JIRA / Linear | Re-evaluate if duplicates accumulate |

## 4. Triage Log

| Date | Bug ID | Reporter | Initial Severity | Final Severity | Owner | Reason for Change |
|------|--------|----------|------------------|----------------|-------|-------------------|
| | | | | | | |

## 5. Duplicate Detection

| Check | Method |
|-------|--------|
| Keyword search | Search JIRA with error message / component |
| Stack trace match | Compare stack trace signatures |
| User impact overlap | Check if multiple reports reference same flow |
| Release correlation | Filter bugs reported within 48h of a deployment |
```

## Explanation

The template forces **structured classification** before routing. Many teams skip triage and assign bugs to whoever is available, which means critical issues wait behind low-priority tickets. The severity matrix uses **user impact** and **business risk** as primary axes, not just "how hard is the fix." A one-line CSS change that blocks checkout is S1; a complex memory leak that affects 0.1% of users is S3. The routing rules prevent high-severity bugs from being treated as normal backlog work.

## Variants

| Context | Classification Focus | Routing Approach |
|---------|---------------------|------------------|
| Mobile app | OS version, device model, app store reviews | Crashlytics auto-groups by stack trace |
| API / backend | Endpoint, error rate, latency spike | Alert manager routes by service owner |
| B2B SaaS | Tenant size, contract value, SLA | Customer success flags high-value customer bugs |
| Game / consumer | Monetization impact, player segment | Live ops team triages during events |
| Security bug | CVSS score, exploitability, exposure | Direct to security team; bypass standard queue |

## What works

1. Triage every new bug within 24 hours of report; stale triage is failed triage
2. Use a single source of truth (JIRA, Linear, GitHub Issues) so duplicates are detectable
3. Require a reproducibility test case before accepting S2 or higher; unconfirmed critical bugs waste engineering time
4. Re-evaluate severity if new information emerges (e.g., "affects all users" not "some users")
5. Close "won't fix" bugs explicitly with a rationale; silence creates backlogs of zombie tickets

## Common Mistakes

1. Classifying bugs by effort instead of impact (easy fix ≠ high priority)
2. Letting reporters set their own severity; users always think their bug is critical
3. Not tracking triage decisions, leading to the same debates every week
4. Routing security bugs through the standard queue instead of directly to security
5. Ignoring duplicates; ten reports of the same bug look like ten separate problems

## Frequently Asked Questions

### What if a bug report is vague or missing reproduction steps?

Request the standard information: steps to reproduce, expected vs actual behavior, environment (browser, OS, version), screenshots or screen recordings, and error logs. If the reporter cannot provide this within 48 hours, downgrade to S4 or close as "needs info." Do not let incomplete reports block triage of useful bugs.

### How do I prevent triage from becoming a bottleneck?

Rotate a "triage duty" engineer each week. This person reviews all incoming bugs for 30 minutes every morning, classifies, routes, and requests missing info. Triage duty should not be the same person as on-call. Over time, automate: use crash reporters to pre-classify by stack trace, and bot rules to auto-route known component owners.

### Should feature requests be triaged alongside bugs?

No. Keep bugs and feature requests in separate queues with separate SLA targets. Feature requests require product input; bugs require engineering input. Mixing them creates confusion about ownership and priority. If a user reports a bug that is actually a missing feature, re-label it and move it to the product backlog with a clear explanation.
