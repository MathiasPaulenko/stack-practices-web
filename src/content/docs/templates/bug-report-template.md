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
  - bug-report
  - template
  - issue-tracking
  - qa
  - defect
relatedResources:
  - /guides/testing/test-driven-development-guide
  - /guides/devops/on-call-incident-response-guide
  - /docs/templates/feature-request-template
lastUpdated: "2026-06-12"
author: "StackPractices"
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
- Link to related issue or PR
- Frequency of occurrence
- Recent changes that may be related
```

## Why This Structure Works

| Section | Purpose |
|---------|---------|
| **Summary** | Reader decides priority in 5 seconds |
| **Reproduction steps** | Engineer can verify the bug locally |
| **Expected vs actual** | Clarifies what "fixed" looks like |
| **Environment** | Bug may be platform-specific |
| **Severity** | Triage queue ordering |

## Tips for Reporters

- **Reproduce it twice** before reporting — transient issues need different handling
- **Isolate the steps** — remove unrelated actions from the reproduction path
- **Test in incognito/private mode** — rules out browser extensions
- **Check existing issues first** — duplicates waste triage time

## Tips for Triage Teams

- **Label immediately** — `bug`, `frontend`, `backend`, `needs-reproduction`
- **Assign within 24 hours** — unassigned bugs rot
- **Request missing info promptly** — use the template as a checklist

## Frequently Asked Questions

### What if I cannot reproduce the bug consistently?

Still file the report. Mark frequency as "intermittent" and include timestamps, logs, and any patterns you have noticed (e.g., "only happens after 10 minutes of inactivity").

### Should customers use this template too?

Yes, but simplify it. Customers get a form with Summary, Steps, and Environment only. Internal teams get the full template with severity and context fields.

### How do I handle "works on my machine" bugs?

Add environment parity checks: Docker, exact dependency versions, and seeded test data. If it only happens in production, the bug is in the data or configuration, not the code.
