---
contentType: docs
slug: bug-report-template
templateType: bug-report
title: "Bug Report Template"
description: "A structured bug report template to help teams reproduce, triage, and resolve defects faster with clear reproduction steps and expected behavior."
metaDescription: "Bug report template with reproduction steps, expected vs actual behavior, environment details, and severity. Help your team fix bugs faster."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - issue-tracking
  - template
  - ci-cd
  - automation
relatedResources:
  - /guides/testing/test-driven-development-guide
  - /guides/devops/on-call-incident-response-guide
  - /docs/templates/feature-request-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Bug report template with reproduction steps, expected vs actual behavior, environment details, and severity. Help your team fix bugs faster."
  keywords:
    - bug report template
    - issue report format
    - defect tracking template
    - reproduction steps template
    - software bug report
---

# Bug Report Template

Use this template to report bugs in a way that helps engineers reproduce and fix them quickly.

## Overview

A good bug report gives engineers everything they need to reproduce the issue in one read. A bad bug report triggers a back-and-forth that wastes hours. The difference is structure: clear steps, expected vs actual behavior, and environment details.

This template covers:

1. **Reproduction steps** — numbered, isolated, testable
2. **Expected vs actual behavior** — defines what "fixed" looks like
3. **Environment details** — OS, browser, version, environment
4. **Severity classification** — standardized impact assessment
5. **Bug lifecycle** — from report to resolution

## Template

```markdown
# Bug Report

## Summary
One-sentence description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. Observe error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened. Include screenshots or error messages.

## Environment
- **OS:** [e.g., macOS 14, Windows 11]
- **Browser:** [e.g., Chrome 120, Safari 17]
- **App Version:** [e.g., v2.4.1]
- **Environment:** [staging / production / local]

## Severity
- [ ] Critical — data loss, security breach, complete outage
- [ ] High — major feature broken, workaround difficult
- [ ] Medium — feature degraded, workaround exists
- [ ] Low — cosmetic issue, minor inconvenience

## Additional Context
- Link to related issue, PR, or [feature request](/docs/templates/feature-request-template). See [Test-Driven Development](/guides/testing/test-driven-development-guide) for writing tests that reproduce bugs.
- Frequency of occurrence
- Recent changes that may be related
```

## Filled Example

```markdown
# Bug Report: CSV export downloads empty file when date range spans months

## Summary
Exporting analytics data as CSV produces an empty file when the selected date range
crosses a month boundary (e.g., March 28 to April 3).

## Steps to Reproduce
1. Navigate to /analytics/dashboard
2. Select date range: 2026-03-28 to 2026-04-03
3. Click "Export CSV" on the "Revenue by Day" chart
4. Open the downloaded file

## Expected Behavior
CSV file contains 7 rows of data (one per day) with columns: date, revenue, orders.

## Actual Behavior
CSV file downloads with headers only (date, revenue, orders) and zero data rows.
No error message appears in the UI. Console shows no errors.

## Environment
- **OS:** macOS 14.4
- **Browser:** Chrome 126.0
- **App Version:** v2.4.1
- **Environment:** production

## Severity
- [x] High — export feature is broken for a common use case, no workaround

## Additional Context
- Happens consistently when range crosses any month boundary
- Works fine for single-month ranges (e.g., March 1-31)
- Related to [Feature Request: CSV Export](#123) — may be a regression from v2.4.0
- Server logs show the query returns 0 rows: `WHERE date >= '2026-03-28' AND date <= '2026-04-03'` — suspect date parsing issue
```

## Why This Structure Works

| Section | Purpose |
|---------|---------|
| **Summary** | Reader decides priority in 5 seconds |
| **Reproduction steps** | Engineer can verify the bug locally |
| **Expected vs actual** | Clarifies what "fixed" looks like |
| **Environment** | Bug may be platform-specific |
| **Severity** | Triage queue ordering |
| **Additional context** | Links to related work and clues for root cause |

## Severity Definitions

| Severity | Criteria | Response time | Example |
|----------|----------|---------------|---------|
| Critical | Data loss, security breach, complete outage | Immediate (< 1 hour) | All API requests returning 500 |
| High | Major feature broken, no workaround or workaround is difficult | Same day (< 8 hours) | Export produces empty file |
| Medium | Feature degraded, workaround exists and is tolerable | This sprint (< 1 week) | Sort direction reversed on one column |
| Low | Cosmetic issue, minor inconvenience | Next sprint | Button color does not match design |

## Bug Lifecycle

1. **Reported** — Reporter fills out the template and creates a ticket
2. **Triaged** — Reviewer labels within 24 hours (`bug`, `frontend`, `needs-repro`, `wont-fix`)
3. **Reproduced** — Engineer confirms the bug exists locally or in staging
4. **Assigned** — Engineer takes ownership and starts investigation
5. **In progress** — Root cause identified, fix being implemented
6. **PR opened** — Fix submitted with a regression test
7. **Verified** — Reporter or QA confirms the fix resolves the issue
8. **Closed** — Ticket closed with fix version and release notes

## Tips for Reporters

- **Reproduce it twice** before reporting — transient issues need different handling
- **Isolate the steps** — remove unrelated actions from the reproduction path
- **Test in incognito/private mode** — rules out browser extensions
- **Check existing issues first** — duplicates waste triage time
- **Include screenshots or screen recordings** — visual bugs are hard to describe
- **Attach relevant logs** — browser console, server logs, network tab screenshots
- **Note the frequency** — "always happens" vs "happens 1 in 10 times" changes priority
- **Mention recent changes** — "started after v2.4.0 deploy" narrows the search

## Tips for Triage Teams

- **Label immediately** — `bug`, `frontend`, `backend`, `needs-reproduction`
- **Assign within 24 hours** — unassigned bugs rot
- **Request missing info promptly** — use the template as a checklist
- **Close stale bugs** — if a bug has had no activity for 90 days, close with a note
- **Link duplicates** — merge bugs reporting the same issue and link them
- **Verify severity** — reporters tend to over-rate severity; adjust during triage

## Variants

### Customer-facing (support portal)

Customers should not see severity labels or internal context fields. Use a simplified form: Summary, What were you trying to do?, What happened instead?, Screenshot upload. Map customer submissions to internal bug reports during triage.

### Crash report (automated)

Automated crash reports from error tracking (Sentry, Bugsnag, Crashlytics) should include: stack trace, device info, app version, user actions before crash, and crash frequency. These auto-populate the template and create a ticket. See [Error Handling Patterns](/patterns/design/error-handling-pattern) for structured error reporting.

### Security vulnerability report

Security reports need a different template: do not include reproduction steps in a public ticket. Use a private vulnerability disclosure channel. Include: affected component, attack vector, potential impact, and suggested mitigation. See [Security Audit Checklist](/docs/templates/security-audit-checklist) for security-specific templates.

## Frequently Asked Questions

### What if I cannot reproduce the bug consistently?

Still file the report. Mark frequency as "intermittent" and include timestamps, logs, and any patterns you have noticed (e.g., "only happens after 10 minutes of inactivity").

### Should customers use this template too?

Yes, but simplify it. Customers get a form with Summary, Steps, and Environment only. Internal teams get the full template with severity and context fields.

### How do I handle "works on my machine" bugs?

Add environment parity checks: [Docker](/recipes/devops/docker-compose-local-dev), exact dependency versions, and seeded test data. See [Integration Testing](/recipes/testing/integration-testing-strategies) for verifying fixes across environments. If it only happens in production, the bug is in the data or configuration, not the code.

### What is the difference between a bug and a feature request?

A bug is behavior that does not match the documented or intended behavior. A feature request is a request for new behavior that was never designed. If the behavior is ambiguous, check the spec or ask the product owner. Use the [Feature Request Template](/docs/templates/feature-request-template) for new capabilities.

### How much detail should reproduction steps have?

Enough that someone unfamiliar with the feature can reproduce it. "Click the export button" is too vague if there are multiple export options. "Click the 'Export CSV' button in the top-right toolbar of the Revenue chart" is specific. When in doubt, add more detail.

### Should I attach files to the bug report?

Yes, if they help. Screenshots of the error, screen recordings of the reproduction steps, and log files are all useful. Do not attach files containing sensitive data (credentials, PII). Use secure file sharing for sensitive attachments.

### What if the bug is in a third-party dependency?

File the bug in your internal tracker for visibility, but also file a bug in the dependency's issue tracker. Link the two tickets. Note the dependency version and whether a workaround exists. If the dependency is abandoned, note that and plan a migration.
