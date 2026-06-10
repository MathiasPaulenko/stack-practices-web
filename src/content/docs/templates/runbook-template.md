---
contentType: docs
slug: runbook-template
templateType: runbook
title: "Runbook Template"
description: "A reusable template for operational runbooks: incident response, deployment procedures, and routine tasks."
metaDescription: "Use this runbook template to document operational procedures, incident response playbooks, and routine maintenance tasks."
difficulty: beginner
topics:
  - devops
tags:
  - runbook
  - template
  - operations
  - sre
  - incident-response
  - devops
relatedResources:
  - /docs/templates/readme-template
  - /recipes/devops/github-actions
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Use this runbook template to document operational procedures, incident response playbooks, and routine maintenance tasks."
  keywords:
    - runbook template
    - operational procedures
    - incident response
    - sre playbook
    - maintenance tasks
---

## Template Structure

Use this template to document any operational procedure your team needs to execute.

---

## Runbook: [Procedure Name]

### Metadata

| Field | Value |
| ----- | ----- |
| **Owner** | @team or @person |
| **Severity** | P1 / P2 / P3 |
| **Frequency** | On-demand / Daily / Weekly |
| **Last Updated** | YYYY-MM-DD |

### Purpose

One-sentence description of what this runbook achieves and when to use it.

### Prerequisites

- [ ] Access to [system/tool]
- [ ] Permissions: [required roles]
- [ ] Alerts/monitoring: [relevant dashboards]

### Procedure

#### Step 1: [Action]

```bash
# Command or script to execute
```

**Expected result**: Describe what success looks like.
**Rollback**: How to undo this step if something goes wrong.

#### Step 2: [Action]

```bash
# Command or script to execute
```

**Expected result**: Describe what success looks like.

### Verification

- [ ] Check [metric/endpoint] returns [expected value]
- [ ] Confirm [log/alert] shows [pattern]
- [ ] Notify [stakeholder] that procedure is complete

### Troubleshooting

| Symptom | Cause | Solution |
| ------- | ----- | -------- |
| Error X | Y is not running | Restart Y via `command` |
| Timeout | Network latency | Retry after 30s |

### Post-Incident Actions (if applicable)

- [ ] Update status page
- [ ] Write incident retrospective
- [ ] Create follow-up tickets
- [ ] Update this runbook if procedure changed

### Escalation

If this runbook does not resolve the issue within [timeframe], escalate to:

- **L2**: @on-call-engineer
- **L3**: @engineering-manager
- **External**: [vendor support link/number]

---

## Best Practices

- **Keep it short**: One page per routine procedure
- **Use checkboxes**: Make it easy to follow under pressure
- **Include commands**: Copy-paste ready scripts
- **Test periodically**: Run through runbooks during calm periods
- **Version control**: Store in `docs/runbooks/` with your code

## Common Anti-Patterns

- Overly long runbooks that no one reads during incidents
- Missing rollback steps
- No escalation path defined
- Outdated contact information
- Assuming context the reader doesn't have
