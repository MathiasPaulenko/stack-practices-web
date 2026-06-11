---
contentType: docs
templateType: postmortem
slug: incident-postmortem-template
title: "Incident Postmortem Template"
description: "A structured postmortem template for analyzing system incidents, identifying root causes, and preventing recurrence."
metaDescription: "Incident postmortem template for blameless retrospectives. Analyze outages, identify root causes, and define preventive actions."
difficulty: intermediate
topics:
  - devops
tags:
  - postmortem
  - incident-response
  - sre
  - reliability
relatedResources:
  - /docs/runbook-template
  - /guides/cicd-pipeline-guide
  - /guides/security-best-practices-guide
lastUpdated: 2026-06-11
author: StackPractices
seo:
  metaDescription: "Incident postmortem template for blameless retrospectives. Analyze outages, identify root causes, and define preventive actions."
---

## Overview

A postmortem is a written record of an incident, its impact, the actions taken to mitigate or resolve it, and the follow-up actions to prevent recurrence. It follows a blameless culture approach.

## When to Use

- After any significant production incident or outage
- When SLA/SLO targets are breached
- To document lessons learned for the team
- Required by compliance or regulatory standards

## Template

```markdown
# Incident Postmortem: [Incident Title]

## Metadata
- **Date**: YYYY-MM-DD
- **Severity**: P1 / P2 / P3 / P4
- **Duration**: HH:MM
- **Impact**: [Services affected, users impacted]
- **Reporter**: [Name]
- **Status**: Resolved

## Summary

[2-3 sentence description of what happened and its impact]

## Timeline (UTC)

| Time | Event |
|------|-------|
| 09:00 | Alert fired: database connection pool exhausted |
| 09:05 | Engineer acknowledged alert |
| 09:15 | Service temporarily scaled up |
| 09:45 | Root cause identified: connection leak in v2.3.1 |
| 10:00 | Hotfix deployed, incident resolved |

## Root Cause

[Detailed explanation of what caused the incident. Include code snippets, configuration, or architecture diagrams if relevant.]

## Impact Assessment

- **Users affected**: ~15,000
- **Error rate peak**: 42%
- **Revenue impact**: Minimal (degraded performance, not full outage)

## Resolution

[Steps taken to resolve the incident, including any workarounds.]

## Lessons Learned

### What Went Well
- Monitoring detected the issue within 5 minutes
- Runbook was up-to-date and effective

### What Went Wrong
- Connection leak was not caught in staging
- Rollback procedure was slower than expected

## Action Items

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| Add connection pool monitoring | @sre-team | 2026-06-18 | High |
| Improve staging load tests | @backend-team | 2026-06-25 | Medium |
| Document faster rollback steps | @sre-team | 2026-06-15 | High |
```

## Severity Levels

| Level | Description | Example |
|-------|-------------|---------|
| **P1** | Critical outage | Complete service unavailability |
| **P2** | Major degradation | Core features broken |
| **P3** | Minor impact | Non-critical features affected |
| **P4** | Informational | No user impact, potential risk |

## Best Practices

- **Blameless**: Focus on system and process failures, not individuals
- **Specific**: Include exact times, metrics, and affected systems
- **Actionable**: Every postmortem must have follow-up action items
- **Timely**: Publish within 48 hours of incident resolution
- **Shared**: Distribute to all stakeholders and store centrally

## Common Mistakes

- **Blame-focused**: Naming individuals instead of analyzing systems
- **Vague timelines**: Missing exact timestamps
- **No action items**: Documenting without preventing recurrence
