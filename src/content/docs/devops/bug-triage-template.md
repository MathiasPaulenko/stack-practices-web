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

## Advanced Solutions

### Automated bug triage with GitHub Issues and labels

Use GitHub Actions to auto-label and route incoming bug reports based on content analysis:

```yaml
# .github/workflows/auto-triage.yml
name: Auto-Triage Bug Reports
on:
  issues:
    types: [opened, labeled]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Check for severity keywords
        uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.issue.body || "";
            const title = context.payload.issue.title || "";
            const text = (title + " " + body).toLowerCase();

            const severityRules = [
              { label: "s1-critical", keywords: ["data loss", "payment", "login broken", "security", "production down"] },
              { label: "s2-high", keywords: ["broken", "crash", "error 500", "not working", "failing"] },
              { label: "s3-medium", keywords: ["slow", "incorrect", "wrong", "unexpected"] },
              { label: "s4-low", keywords: ["typo", "cosmetic", "alignment", "color"] },
            ];

            for (const rule of severityRules) {
              if (rule.keywords.some(kw => text.includes(kw))) {
                await github.rest.issues.addLabels({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: context.payload.issue.number,
                  labels: [rule.label, "needs-triage"],
                });
                break;
              }
            }
```

### Bug deduplication with stack trace fingerprinting

Group similar crash reports by normalizing and hashing stack traces:

```python
import hashlib
import re
from collections import defaultdict
from typing import List, Dict

def normalize_stack_trace(trace: str) -> str:
    """Normalize a stack trace by removing line numbers and memory addresses."""
    # Remove file paths, keeping only filenames
    trace = re.sub(r'/[\w/.-]+/', '', trace)
    # Remove line numbers
    trace = re.sub(r':\d+', '', trace)
    # Remove memory addresses
    trace = re.sub(r'0x[0-9a-fA-F]+', '0xADDR', trace)
    # Remove thread IDs
    trace = re.sub(r'Thread-\d+', 'Thread-N', trace)
    return trace.strip()

def fingerprint_stack_trace(trace: str) -> str:
    """Generate a hash fingerprint from a normalized stack trace."""
    normalized = normalize_stack_trace(trace)
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]

def group_bug_reports(reports: List[Dict]) -> Dict[str, List[Dict]]:
    """Group bug reports by stack trace fingerprint."""
    groups = defaultdict(list)
    for report in reports:
        trace = report.get("stack_trace", "")
        if trace:
            fp = fingerprint_stack_trace(trace)
            groups[fp].append(report)
        else:
            groups["no-trace"].append(report)
    return groups

# Example usage
bug_reports = [
    {"id": "BUG-001", "stack_trace": "TypeError at /app/src/handlers.py:42\n  File /app/src/utils.py:128"},
    {"id": "BUG-002", "stack_trace": "TypeError at /app/src/handlers.py:45\n  File /app/src/utils.py:131"},
    {"id": "BUG-003", "stack_trace": "ValueError at /app/src/models.py:67"},
]

groups = group_bug_reports(bug_reports)
for fp, reports in groups.items():
    print(f"Fingerprint {fp}: {len(reports)} reports - {[r['id'] for r in reports]}")
```

### Bug aging dashboard with Slack notification

Track bugs that exceed their SLA resolution target and alert the team:

```python
import os
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List

SLA_TARGETS = {
    "S1": timedelta(hours=4),
    "S2": timedelta(hours=24),
    "S3": timedelta(days=7),
    "S4": timedelta(days=14),
}

@dataclass
class BugTicket:
    id: str
    severity: str
    created_at: datetime
    status: str
    assignee: str

def find_aged_bugs(tickets: List[BugTicket]) -> List[BugTicket]:
    """Find bugs that have exceeded their SLA resolution target."""
    now = datetime.now()
    aged = []
    for ticket in tickets:
        if ticket.status in ("closed", "resolved"):
            continue
        sla = SLA_TARGETS.get(ticket.severity)
        if not sla:
            continue
        age = now - ticket.created_at
        if age > sla:
            aged.append(ticket)
    return aged

def format_slack_alert(aged_bugs: List[BugTicket]) -> str:
    """Format aged bugs for a Slack alert message."""
    if not aged_bugs:
        return "No bugs have exceeded their SLA target."

    lines = [":warning: *SLA Violation Alert* — Bugs exceeding resolution target:\n"]
    for bug in sorted(aged_bugs, key=lambda b: b.created_at):
        age_hours = (datetime.now() - bug.created_at).total_seconds() / 3600
        sla_hours = SLA_TARGETS[bug.severity].total_seconds() / 3600
        lines.append(
            f"• {bug.severity} {bug.id} — {age_hours:.0f}h old "
            f"(SLA: {sla_hours:.0f}h) — Assigned: {bug.assignee}"
        )
    return "\n".join(lines)

# Example usage
tickets = [
    BugTicket("BUG-100", "S1", datetime.now() - timedelta(hours=6), "open", "alice"),
    BugTicket("BUG-101", "S2", datetime.now() - timedelta(hours=30), "open", "bob"),
    BugTicket("BUG-102", "S3", datetime.now() - timedelta(days=2), "open", "charlie"),
]

aged = find_aged_bugs(tickets)
print(format_slack_alert(aged))
```

## Additional Best Practices

1. **Use a bug triage board with columns for each severity.** Visualizing bugs by severity makes it immediately clear where attention is needed. Configure automatic column transitions based on SLA timers:

```yaml
# Linear workflow configuration
states:
  - name: triage
    transitions: [s1-critical, s2-high, s3-medium, s4-low]
  - name: in_progress
    sla_timer: true
    overdue_alert: "#incidents"
  - name: in_review
    requires_pr: true
  - name: done
    auto_close_after_days: 30
```

2. **Track triage metrics over time.** Measure how quickly bugs move from "reported" to "triaged" to identify bottlenecks:

```python
from datetime import datetime, timedelta
from collections import defaultdict

def calculate_triage_metrics(tickets):
    """Calculate average triage time by severity."""
    triage_times = defaultdict(list)
    for t in tickets:
        if t.triaged_at and t.created_at:
            delta = (t.triaged_at - t.created_at).total_seconds() / 3600
            triage_times[t.severity].append(delta)

    metrics = {}
    for severity, times in triage_times.items():
        metrics[severity] = {
            "avg_triage_hours": sum(times) / len(times),
            "max_triage_hours": max(times),
            "count": len(times),
        }
    return metrics
```

## Additional Common Mistakes

1. **Not closing invalid bug reports promptly.** Reports that are actually user errors, configuration mistakes, or duplicates clog the triage queue. Close them within 24 hours with a clear explanation:

```markdown
## Closing Template for Invalid Reports

Thank you for reporting this issue. After investigation, this appears to be:
- [ ] A configuration error on the user side
- [ ] Expected behavior, not a bug
- [ ] A duplicate of #{existing_issue}
- [ ] A feature request, not a bug

Closing as: {reason}. If you believe this is incorrect, please reopen with additional context.
```

2. **Letting S3 and S4 bugs accumulate without periodic review.** Low-severity bugs may become irrelevant over time. Schedule a monthly "bug bash" to review and close stale S3/S4 tickets:

```bash
#!/bin/bash
# Find S3/S4 bugs older than 90 days with no activity
gh issue list \
  --label "s3-medium,s4-low" \
  --state open \
  --search "created:<$(date -d '90 days ago' +%Y-%m-%d) updated:<$(date -d '30 days ago' +%Y-%m-%d)" \
  --json number,title,createdAt,updatedAt \
  --jq '.[] | "#\(.number) \(.title) (created: \(.createdAt[:10]))"'
```

## Additional Frequently Asked Questions

### How do we handle bugs found during automated testing vs. user-reported bugs?

Bugs found by automated tests should bypass the standard triage queue. File them directly with the failing test name, stack trace, and environment details. Assign them to the team that owns the test suite. Use a "test-failure" label to distinguish them from user-reported issues. If the same test fails repeatedly, escalate to S2 as it may indicate a flaky environment or a real regression.

### What metrics should we track for triage effectiveness?

Track these key metrics: median time-to-triage (target: under 4 hours for S1/S2), percentage of bugs triaged within 24 hours (target: 95%), number of severity changes after initial triage (target: under 10%), and aged bug count (target: zero S1/S2 bugs past SLA). Review these metrics monthly to identify patterns and adjust the triage process.
