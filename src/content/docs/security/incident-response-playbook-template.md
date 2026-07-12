---



contentType: docs
slug: incident-response-playbook-template
title: "Incident Response Playbook Template"
description: "A step-by-step playbook template for handling security incidents."
metaDescription: "Use this incident response playbook template to document detection, containment, eradication, recovery, and lessons learned for security incidents."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - incident-response
  - playbook
  - template
  - compliance
relatedResources:
  - /docs/data-retention-policy-template
  - /docs/security-incident-response-template
  - /docs/security-audit-checklist-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/api-security-review-template
  - /docs/data-classification-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this incident response playbook template to document detection, containment, eradication, recovery, and lessons learned for security incidents."
  keywords:
    - security
    - incident-response
    - playbook
    - template
    - compliance



---
## Overview

Security incidents require coordinated, rapid response. Panic and improvisation extend downtime, increase data exposure, and violate compliance obligations. This playbook template structures the response into five phases: Detection, Containment, Eradication, Recovery, and Lessons Learned (based on NIST SP 800-61).

## When to Use


- For alternatives, see [Data Classification Template](/docs/data-classification-template/).

Use this resource when:
- A security alert fires (unauthorized access, data leak, malware)
- A team member reports suspicious activity
- A third party notifies you of a vulnerability or breach

## Solution

```markdown
# Incident Response Playbook: `<Incident Type>`

## Incident Metadata

| Field | Value |
|-------|-------|
| Incident ID | `INC-YYYY-MM-DD-###` |
| Severity | `P1 (Critical) / P2 (High) / P3 (Medium) / P4 (Low)` |
| Detected By | `@reporter` or `alert_system` |
| Detection Time | `YYYY-MM-DD HH:MM UTC` |
| Response Lead | `@incident-commander` |
| Status | `Open / Contained / Eradicated / Closed` |

## 1. Detection

### 1.1. Validate the Alert

- [ ] Confirm the alert is not a false positive
- [ ] Gather initial evidence (logs, screenshots, network captures)
- [ ] Document the first observed indicator of compromise (IOC)

### 1.2. Classify Severity

| Severity | Criteria | Response Time |
|----------|----------|---------------|
| P1 | Active data breach, ransomware, production down | < 15 minutes |
| P2 | Unauthorized admin access, malware detected | < 1 hour |
| P3 | Phishing attempt, low-privilege account compromise | < 4 hours |
| P4 | Vulnerability scan noise, policy violation | < 24 hours |

### 1.3. Assemble Response Team

- [ ] Assign Incident Commander (single decision-maker)
- [ ] Assign Technical Lead (forensics and remediation)
- [ ] Assign Communications Lead (internal/external updates)
- [ ] Page on-call security and infrastructure engineers

## 2. Containment

### 2.1. Short-Term Containment

- [ ] Isolate affected systems (disconnect network, disable accounts)
- [ ] Revoke compromised credentials (API keys, passwords, tokens)
- [ ] Block malicious IPs at firewall or WAF level
- [ ] Preserve evidence (snapshot disks, export logs)

### 2.2. Long-Term Containment

- [ ] Patch the vulnerability that enabled the incident
- [ ] Rotate all secrets in the affected scope
- [ ] Enable additional monitoring on related systems
- [ ] Restrict access to affected systems to response team only

## 3. Eradication

- [ ] Remove malware, backdoors, or unauthorized accounts
- [ ] Validate system integrity (checksums, known-good baselines)
- [ ] Rebuild compromised systems from known-good images
- [ ] Verify no persistence mechanisms remain (cron jobs, scheduled tasks)

## 4. Recovery

- [ ] Restore systems from clean backups (verify backup integrity first)
- [ ] Re-enable services with heightened monitoring
- [ ] Validate functionality with smoke tests
- [ ] Monitor for 24-72 hours for signs of re-infection
- [ ] Communicate all-clear to stakeholders

## 5. Lessons Learned

### 5.1. Timeline

| Time (UTC) | Action | Owner |
|------------|--------|-------|
| `T+0` | Alert fired | `@system` |
| `T+15m` | Incident Commander assigned | `@security` |
| `T+45m` | Containment complete | `@infra` |
| `T+3h` | Eradication complete | `@infra` |
| `T+6h` | Recovery complete | `@app-team` |

### 5.2. Root Cause

- What happened?
- Why did our controls fail?
- What was the blast radius (users, data, systems)?

### 5.3. Action Items

| ID | Action | Owner | Due Date |
|----|--------|-------|----------|
| A1 | Add WAF rule for attack pattern | `@security` | +3 days |
| A2 | Enable MFA for all admin accounts | `@identity` | +7 days |
| A3 | Improve log retention to 90 days | `@platform` | +14 days |
```

## Explanation

The playbook enforces a **single Incident Commander** to avoid conflicting decisions during high-stress moments. Severity classification determines response speed so P1 incidents get immediate attention without medium-severity alerts consuming the entire team. Containment prioritizes stopping the bleed before investigating root cause. Recovery includes a monitoring period because attackers often leave persistence mechanisms that trigger after the initial response.

## Incident Response Phases

```text
=== Phase 1: Detection and Triage (0-15 min) ===

- Alert received via monitoring, user, or third party
- On-call confirms it is a real incident (not false positive)
- Severity assigned: SEV1 (Critical) / SEV2 (High) / SEV3 (Medium) / SEV4 (Low)
- Incident Commander (IC) assigned
- Incident channel created (#incident-xxx)
- Stakeholders notified

=== Phase 2: Containment (15-60 min) ===

- Immediate action to stop the impact:
  - Revert deploy
  - Block malicious traffic (WAF, IP block)
  - Disable compromised account/feature
  - Failover to backup region/instance
- Preserve evidence (logs, snapshots, dumps) before remediation
- Document actions taken and timestamps

=== Phase 3: Eradication (1-4 hours) ===

- Identify and eliminate the root cause
- Apply permanent fix (not just workaround)
- Rotate compromised credentials
- Update vulnerable configurations
- Verify the incident is contained

=== Phase 4: Recovery (1-24 hours) ===

- Restore services to normal operation
- Verify data integrity
- Monitor closely for recurrence (24-48 hours)
- Communicate resolution to stakeholders
- Close incident channel

=== Phase 5: Postmortem (1-5 days) ===

- Blameless postmortem within 48 hours
- Identify root cause and contributing factors
- Create action items with owners and due dates
- Share learnings with the organization
- Update runbooks and playbooks
```


## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Cloud-native | Use cloud provider forensics tools | AWS GuardDuty, Azure Sentinel, GCP Security Command Center |
| On-premise | Physical isolation procedures | Require data center access, hardware imaging |
| Small team | Combine roles (Commander + Technical Lead) | Document who covers which role if primary is unavailable |

## What Works

1. Run tabletop exercises quarterly so the team knows the playbook before a real incident
2. Maintain a contact sheet with phone numbers, not just Slack handles
3. Pre-stage isolation scripts (disable user, revoke token, block IP) for one-click execution
4. Document evidence handling procedures for potential legal proceedings
5. Publish a post-incident report within 5 business days of closure

## Common Mistakes

1. Skipping containment to immediately investigate root cause
2. Destroying compromised systems before preserving forensic evidence
3. Communicating externally before the incident scope is understood
4. Failing to rotate all secrets in the affected blast radius
5. Treating the incident as closed as soon as systems are restored

## Frequently Asked Questions

### When should I involve legal or compliance?

For P1 incidents and any breach involving personal data, regulated data (PCI, HIPAA), or ransomware. Legal should review all external communications. Compliance needs notification timelines (GDPR: 72 hours, state laws: varies).

### Should I pay a ransom?

Consult legal and law enforcement first. Most security experts and law enforcement agencies advise against paying ransoms because payment does not guarantee recovery and may fund further criminal activity.

### How do I prevent the same incident from recurring?

The Lessons Learned phase is mandatory, not optional. Track action items in the same backlog as feature work with the same priority. Re-run the tabletop exercise with the updated playbook to validate fixes.


### How do we choose the Incident Commander (IC)?

The IC is the person who coordinates the incident response — not necessarily the person who fixes the problem. IC responsibilities: maintain focus on mitigation, coordinate communication, assign tasks, and make decisions when there is ambiguity. The IC should not be writing code — they delegate implementation to others. For SEV1/SEV2: the IC should be a senior engineer or manager with incident experience. For SEV3/SEV4: the on-call can be the IC. Rotate the IC role to build experience across the team. Train all engineers in the IC role through game days. The IC declares the incident resolved — not the engineer who fixes the problem.

### What do we do if the incident involves customer data?

If the incident involves customer data: escalate immediately to legal and compliance. Document what data was affected, which users, and the scope. For GDPR: notification to the regulator required within 72 hours. For CCPA: notification to affected consumers "without unreasonable delay." Prepare a customer communication with: what happened, what data was affected, what we are doing, and what they should do. Do not hide the scope — transparency builds trust. Coordinate with legal for the exact notification language. Record all decisions and communications for audit. Consider offering credit monitoring if financial data was exposed.

### How do we handle communication during an incident?

Incident communication follows the principle of "communicate early, communicate often." Internal: use a dedicated Slack/Teams channel for the incident. Update every 30 minutes for SEV1, every 1 hour for SEV2. The IC is responsible for updates. External: use the status page (status.io, Statuspage) for user-facing communications. Prepare communication templates in advance. For SEV1: notify executive leadership immediately. Designate one person to handle external communication — the IC should not handle both. Never blame individuals in communications — use factual language. After resolution: send a final communication with summary and next steps.

### How do we prevent the same incident from recurring?

The postmortem is the primary tool for preventing recurrence. Conduct a blameless postmortem within 48 hours. Identify the root cause — not just the immediate cause. Use "5 Whys" or root cause analysis. Create specific, measurable action items with owners and due dates. Prioritize action items by impact on recurrence prevention. Add regression tests to verify the fix works. Update runbooks and playbooks with learnings. Share the postmortem with all of engineering — patterns repeat across services. Track action items to completion — a postmortem with uncompleted action items is useless. Review overdue action items monthly.

### How do we train the team for incident response?

Train the team with regular game days. Schedule a quarterly game day where you simulate a real incident. Use scenarios based on past incidents or potential threats. Rotate roles (IC, communicator, implementer) so everyone gains experience. After the game day: conduct a retro on what worked and what did not. Document the game day as a postmortem. Maintain an on-call calendar with shadowing for new members. Create an incident response onboarding with runbooks and playbooks. Use chaos engineering tools (Gremlin, Chaos Monkey) to inject failures in staging. Practice makes the real response faster and more effective.


















































End of document. Review and update quarterly.