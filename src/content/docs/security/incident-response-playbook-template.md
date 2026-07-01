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
