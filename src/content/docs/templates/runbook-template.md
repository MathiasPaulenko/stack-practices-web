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
  - /docs/readme-template
  - /recipes/github-actions
  - /guides/testing-strategy-guide
  - /docs/dependency-upgrade-template
  - /docs/backup-verification-test-template
  - /docs/bug-triage-template
  - /docs/change-management-template
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
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

Use this template to document any operational procedure your team needs to execute. See [On-Call Incident Response Guide](/guides/devops/on-call-incident-response-guide) for broader response culture.

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
- [ ] Write [incident postmortem](/docs/templates/incident-postmortem-template)
- [ ] Create follow-up tickets
- [ ] Update this runbook if procedure changed

### Escalation

If this runbook does not resolve the issue within [timeframe], escalate to:

- **L2**: @on-call-engineer
- **L3**: @engineering-manager
- **External**: [vendor support link/number]

---

## What Works

- **Keep it short**: One page per routine procedure
- **Use checkboxes**: Make it easy to follow under pressure
- **Include commands**: Copy-paste ready scripts
- **Test periodically**: Run through runbooks during calm periods. See [Disaster Recovery Plan Template](/docs/templates/disaster-recovery-plan-template) for drill planning.
- **Version control**: Store in `docs/runbooks/` with your code

## Common Anti-Patterns

- Overly long runbooks that no one reads during incidents
- Missing rollback steps. See [Database Migration Runbook](/docs/templates/database-migration-runbook-template) for rollback patterns.
- No escalation path defined
- Outdated contact information
- Assuming context the reader doesn't have

## Frequently Asked Questions

### What is the difference between a runbook and a playbook?

A runbook is a step-by-step procedure for a specific operational task. A playbook is a broader collection of strategies and procedures for a category of incidents or scenarios.

### How often should runbooks be tested?

Test critical runbooks quarterly during calm periods. Update runbooks immediately after any incident where the runbook was used and found lacking or incorrect.

### Should runbooks include troubleshooting steps?

Yes. Include common failure modes and their symptoms. Add decision trees or flowcharts for complex procedures. Every runbook should have a clear escalation path if the procedure does not resolve the issue.


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Stateless service | Simplify state section | No state to preserve |
| Database | Add backup/restore procedures | Include specific commands |
| Queue/messaging | Add DLQ and reprocess procedures | Handle stuck messages |
| Cron job | Add re-run procedures | Include temporal dependencies |

## Runbook Example: High CPU on payment-service

```text
=== Runbook: High CPU on payment-service ===

Alert: PaymentServiceHighCPU
Severity: Warning
Condition: CPU > 80% for 5 minutes

Symptoms:
  - Payment latency increases
  - Request queue grows
  - 5xx errors may appear

Diagnostic Steps:
  1. Check current traffic:
     kubectl top pods -n production -l app=payment
     -> If one pod has significantly higher CPU, it may be a hot spot

  2. Check for errors:
     kubectl logs -n production -l app=payment --tail=100 | grep ERROR
     -> Error loops can cause high CPU

  3. Check DB connections:
     kubectl exec -n production payment-db-0 -- psql -c "SELECT count(*) FROM pg_stat_activity"
     -> Exhausted pool causes retries that consume CPU

  4. Check garbage collection:
     kubectl logs -n production -l app=payment --tail=200 | grep "GC"
     -> Frequent GC indicates memory pressure causing CPU usage

Mitigation Actions:
  A. If it is a hot spot (one pod):
     kubectl scale deployment payment -n production --replicas=+2
     -> Add pods to distribute load

  B. If it is an error loop:
     Identify the error and revert the responsible deploy
     kubectl rollout undo deployment payment -n production

  C. If DB pool is exhausted:
     Increase pool max in config
     kubectl patch configmap payment-config -n production --patch '{"data":{"DB_POOL_MAX":"200"}}'
     kubectl rollout restart deployment payment -n production

  D. If GC pressure:
     Increase pod memory
     kubectl patch deployment payment -n production -p '{"spec":{"template":{"spec":{"containers":[{"name":"payment","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

Post-Mitigation Verification:
  - CPU drops below 60% within 10 minutes
  - p95 latency returns to < 500ms
  - No new 5xx errors
  - Confirm with Grafana dashboard

Escalation:
  - If not resolved in 30 min: escalate to SRE on-call
  - If customer impact: declare SEV2 incident
  - During business hours: contact service owner (Team Payments)

Postmortem:
  - Create postmortem if impact was > 15 min of degradation
  - Identify root cause and create action items
```

### How do we keep runbooks up to date?

Stale runbooks are worse than no runbooks — they mislead during incidents. To keep them current: review each runbook after every incident that used it — if a step failed, update it. Schedule quarterly review of all runbooks. Assign an owner to each runbook (usually the team that owns the service). Version runbooks in the same repo as the code — code PRs that change service behavior should update the runbook. Use a runbook linter that verifies referenced commands exist. Mark runbooks with last-reviewed date — those older than 6 months are flagged as "possibly stale."

### What makes a good runbook?

A good runbook is actionable, not explanatory. The on-call engineer should be able to follow it step by step without prior knowledge of the service. Include exact commands (copy-paste, not "run the appropriate command"). Include what to look for at each step (not just "check the logs" but "grep for ERROR in the last 100 log lines"). Include mitigation actions for each diagnosis (not just "identify the problem" but "if it is X, do Y"). Include escalation criteria (when to escalate, to whom). Include post-mitigation verification (how to confirm the problem is resolved). A 2-page runbook that can be followed under pressure is better than a 20-page document nobody reads.

### How do we test that runbooks work?

Test runbooks during game days: simulate the alert and follow the runbook step by step. If a step fails or is confusing, update the runbook. Use chaos engineering to inject the real problem and verify the runbook resolves it. Ask engineers who are not on the team to follow the runbook — if they cannot, the runbook needs more detail. Run the runbook commands in a staging environment to verify they work. Document runbook test results. An untested runbook is a hope, not a tool.












































































End of document. Review and update quarterly.