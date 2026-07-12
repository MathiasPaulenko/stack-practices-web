---





contentType: docs
slug: data-breach-response-playbook
title: "Data Breach Response Playbook"
description: "A step-by-step playbook for responding to security incidents involving unauthorized data access, from initial detection through notification and remediation."
metaDescription: "Respond to data breaches with this playbook. Covers detection, containment, evidence preservation, notification requirements, and post-incident remediation."
difficulty: advanced
topics:
  - security
  - devops
tags:
  - data-breach
  - incident-response
  - security-playbook
  - compliance
  - privacy
relatedResources:
  - /docs/postmortem-incident-review-template
  - /docs/incident-communication-template
  - /docs/access-control-review-template
  - /docs/disaster-recovery-test-plan
  - /docs/encryption-key-lifecycle-template
  - /docs/third-party-vendor-assessment-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Respond to data breaches with this playbook. Covers detection, containment, evidence preservation, notification requirements, and post-incident remediation."
  keywords:
    - data breach response
    - incident response playbook
    - security breach
    - data privacy
    - breach notification





---

## Overview

A data breach is not just a technical incident. It is a legal, reputational, and operational crisis. The first 24 hours determine whether the breach becomes a manageable incident or a headline. This playbook provides a structured response: contain the damage, preserve evidence, notify the right people, and remediate the root cause. It is designed to be used under pressure, with clear decision points and owner assignments.

## When to Use


- For alternatives, see [Incident Response: Structured Handling for Production](/guides/incident-response-guide/).

Activate this playbook when:
- Unauthorized access to sensitive data has been detected or suspected
- A system containing PII, PHI, financial data, or credentials has been compromised
- An insider has exfiltrated data without authorization
- A third-party vendor with access to your data reports a breach
- A ransomware attack has encrypted or threatened to publish data

## Prerequisites

Before a breach occurs:
- [ ] Legal counsel has reviewed notification requirements (GDPR, CCPA, state laws, contracts)
- [ ] A forensics contact or retainer is in place
- [ ] An incident response team with roles (lead, legal, comms, technical) is defined
- [ ] Contact lists for regulators, customers, and media are current
- [ ] Data inventory maps where sensitive data lives and who has access

## Solution

```markdown
# Data Breach Response Playbook

> Playbook owner: ______ | Last updated: ______
> Incident response team: ______ | Legal contact: ______

## Phase 1: Detection and Assessment (0-2 hours)

### Immediate actions

- [ ] Confirm the breach is real (rule out false positive)
- [ ] Document the initial indicator: time, source, type of alert
- [ ] Classify data involved: PII, PHI, financial, credentials, intellectual property, other
- [ ] Estimate number of records or users affected
- [ ] Assign incident commander and roles
- [ ] Open a secure, restricted communication channel (not the general incident channel)

### Decision: does this trigger notification requirements?

| Jurisdiction | Trigger | Timeline | Notes |
|-------------|---------|----------|-------|
| GDPR | Personal data compromised | 72 hours to supervisory authority | ______ |
| CCPA / CPRA | Personal info accessed without authorization | Without unreasonable delay | ______ |
| State laws (US) | Varies by state | Varies | ______ |
| Contractual | Defined in DPA or MSA | Defined in agreement | ______ |

## Phase 2: Containment (2-24 hours)

### Technical containment

- [ ] Isolate compromised systems (do not power off — preserve volatile memory)
- [ ] Revoke compromised credentials and sessions
- [ ] Block unauthorized IPs or accounts at firewall / WAF level
- [ ] Disable compromised API keys or service accounts
- [ ] Rotate all secrets that may have been exposed
- [ ] Preserve logs, snapshots, and disk images before cleanup

### Administrative containment

- [ ] Restrict access to incident details to need-to-know personnel
- [ ] Pause non-essential deployments or changes
- [ ] Brief executive leadership on scope and response status

## Phase 3: Evidence Preservation and Investigation (24-72 hours)

- [ ] Engage forensics team (internal or external)
- [ ] Create forensic images of affected systems
- [ ] Collect and preserve logs: application, database, network, access, audit
- [ ] Document chain of custody for all evidence
- [ ] Build timeline of attacker activity: initial access, lateral movement, data access, exfiltration
- [ ] Identify root cause: vulnerability, misconfiguration, credential theft, insider threat, third-party compromise

## Phase 4: Notification (per legal timeline)

### Internal notification

- [ ] Board / executive leadership
- [ ] Legal counsel
- [ ] Insurance provider (cyber liability)
- [ ] HR (if insider threat suspected)

### External notification

- [ ] Regulatory bodies (per applicable law)
- [ ] Affected customers / users
- [ ] Partners or vendors if their data was involved
- [ ] Law enforcement (if required or advisable)

### Notification content checklist

- [ ] What happened
- [ ] What data was involved
- [ ] What steps were taken to contain the breach
- [ ] What steps affected individuals should take
- [ ] Contact information for questions
- [ ] What the organization is doing to prevent recurrence

## Phase 5: Remediation and Recovery (1-4 weeks)

- [ ] Patch or fix the root cause vulnerability
- [ ] Remove attacker persistence mechanisms (backdoors, accounts, scheduled tasks)
- [ ] Rebuild compromised systems from known-good sources if integrity is uncertain
- [ ] Re-enable systems with enhanced monitoring
- [ ] Verify no unauthorized access persists
- [ ] Conduct a security review of affected systems
- [ ] Update security controls: MFA, segmentation, logging, alerting

## Phase 6: Post-Incident (2-4 weeks)

- [ ] Conduct a blameless postmortem (see postmortem template)
- [ ] Track and complete all remediation action items
- [ ] Review and update this playbook based on lessons learned
- [ ] Review data inventory and access controls
- [ ] Update risk assessment and insurance coverage if needed
- [ ] Publish a transparent summary to affected parties (as appropriate)

## Roles and Responsibilities

| Role | Responsibilities | Primary | Backup |
|------|------------------|---------|--------|
| Incident Commander | Overall coordination, decision authority, stakeholder updates | ______ | ______ |
| Technical Lead | Containment, forensics, remediation | ______ | ______ |
| Legal Counsel | Notification requirements, regulatory compliance, privilege | ______ | ______ |
| Communications Lead | Customer, media, and internal messaging | ______ | ______ |
| HR Representative | Insider threat, employee impact | ______ | ______ |

## Contact List

| Party | Contact | Method | Notes |
|-------|---------|--------|-------|
| Legal counsel | ______ | ______ | ______ |
| Cyber insurance | ______ | ______ | ______ |
| Forensics firm | ______ | ______ | ______ |
| Law enforcement | ______ | ______ | ______ |
| Regulatory body | ______ | ______ | ______ |
```

## Explanation

The playbook is divided into phases that match the time pressure of a breach: the first hours are about confirming and containing; the next days are about investigating and notifying; the following weeks are about fixing and learning. Each phase has owner-assigned checkboxes so nothing is forgotten in the chaos. The notification decision matrix is critical. Missing a legal deadline can turn a security incident into a regulatory penalty.

## Breach Response Communication Templates

```text
=== Internal: Initial Breach Alert (Slack/Email) ===

SUBJECT: [SEV-SECURITY] Suspected data breach — [SYSTEM]

Incident commander: [NAME]
Bridge: [PHONE/VIDEO LINK]
Status: Investigating
Summary: [BRIEF DESCRIPTION — what was detected, when, by whom]
Impact: [UNKNOWN / CONFIRMED — what systems/data may be affected]
Next steps: [CONTAINMENT / FORENSICS / NOTIFICATION]

Do NOT discuss details in public channels.
Use the incident bridge and #sec-incident-private only.

=== External: Customer Notification Email ===

Subject: Important Security Notice — [COMPANY NAME]

Dear [CUSTOMER_NAME],

We are writing to inform you of a security incident that may have
affected your account information. We discovered the incident on
[DATE] and took immediate action to secure our systems.

What happened:
  [BRIEF, NON-TECHNICAL DESCRIPTION]

What data was involved:
  [LIST OF DATA TYPES — e.g., name, email, hashed password]

What we have done:
  - Contained the breach and secured affected systems
  - Engaged forensic investigators and notified authorities
  - [ADDITIONAL STEPS]

What you should do:
  - Change your password immediately
  - Enable two-factor authentication
  - Monitor your account for suspicious activity
  - [ADDITIONAL RECOMMENDATIONS]

We take the security of your data seriously and apologize for any
concern this may cause. We will provide updates as we learn more.

Contact: [SUPPORT_EMAIL / DEDICATED PHONE]

[COMPANY_NAME] Security Team

=== External: Status Page Update ===

[INVESTIGATING] We are investigating a security incident affecting
[SYSTEM]. We have taken affected systems offline and are working to
determine the scope. We will update this page every [INTERVAL] until
resolved.

[IDENTIFIED] We have identified the cause of the security incident
and contained the threat. Affected systems are being restored with
enhanced security measures. We will notify affected users directly.

[RESOLVED] The security incident has been resolved. All affected
systems are secure and operational. A detailed post-incident report
will be published on [DATE].
```


## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Cloud provider breach | Add cloud incident response team contact, shared responsibility review, and provider notification | You and the provider may both have obligations |
| Insider threat | Add HR involvement, access log review, and employment law considerations | Insider cases have different legal and HR implications |
| Third-party vendor breach | Add vendor DPA review, vendor notification requirements, and dependency assessment | Your data on their systems is still your responsibility |
| Ransomware | Add payment policy, backup restoration plan, and law enforcement engagement | Paying ransom is a business and legal decision |
| Small startup (no dedicated security team) | Add external security firm engagement steps and simplified role assignments | Speed matters more than completeness when you are small |

## What Works

1. Practice the playbook. Run a tabletop exercise quarterly. A playbook you have never used is a liability
2. Preserve before you clean. Forensics depends on evidence; containment that destroys logs makes root cause analysis impossible
3. Legal counsel early. Attorney-client privilege can protect investigation findings from discovery in litigation
4. Document everything in real time. Memories distort under pressure; a running log is more reliable than recollection
5. Do not promise what you cannot verify. If you do not know the scope, say so. Overstating confidence destroys credibility

## Common Mistakes

1. Shutting down systems immediately. You lose volatile memory and logs. Isolate, do not power off
2. Notifying too early or too late. Early notification without facts causes panic; late notification causes regulatory penalties
3. Skipping evidence preservation. Without evidence, you cannot prove what happened, defend against lawsuits, or learn
4. Communicating over compromised channels. Assume the attacker is reading your incident chat. Use out-of-band communication
5. No follow-through on remediation. The breach is not over when the attacker is out; it is over when the system is demonstrably safer

## Frequently Asked Questions

### Should we pay the ransom?

This is a business and legal decision, not purely a technical one. Involve legal counsel, executive leadership, and your cyber insurer. In many jurisdictions, paying ransom to certain entities is illegal. Even if legal, paying does not guarantee recovery or prevent data publication.

### How do we know if the attacker is still inside?

Assume persistence. Change all credentials, review all accounts for unauthorized creation, inspect scheduled tasks and startup scripts, and monitor for abnormal outbound traffic. Engage a forensics firm to conduct a thorough sweep if you have any doubt.

### Who decides whether to notify customers?

Legal counsel, working with the incident commander and executive leadership. The decision is based on applicable law, contractual obligations, and risk assessment. The communications lead executes the decision, but does not make it unilaterally.


### How do we preserve evidence during containment?

Before isolating or rebuilding systems: capture volatile data first (memory dumps, network connections, running processes, login sessions). Use tools like LiME (Linux Memory Extractor) or WinPMEM for memory capture. Take disk images of affected systems before wiping. Preserve all logs (system, application, network, access) in a write-once location. Document the chain of custody for all evidence. Timestamp every action taken during containment. Use a dedicated evidence storage location with restricted access. If you lack in-house forensics capability, engage an external firm immediately — they can guide evidence preservation remotely.

### What regulatory notification timelines apply?

Timelines vary by jurisdiction and data type. GDPR: notify the supervisory authority within 72 hours of becoming aware of the breach. CCPA: no specific timeline but "without unreasonable delay." HIPAA: notify affected individuals within 60 days. US state laws: typically 30-60 days depending on the state. PCI DSS: notify card brands and acquirers immediately. Check your specific obligations with legal counsel — do not assume. Document the notification decision and rationale regardless of whether notification is required. When in doubt, notify — the penalty for late notification is often worse than the penalty for over-notification.

### How do we run a breach response tabletop exercise?

Schedule a 2-hour session with the incident response team. Scenario: a specific breach type (e.g., credential theft, ransomware, insider data exfiltration). Walk through each phase: detection, containment, investigation, notification, remediation. Discuss: who does what, what information is needed, what decisions are made, and what could go wrong. Assign an observer to note gaps in the playbook. After the exercise, update the playbook based on findings. Run tabletop exercises quarterly with different scenarios. Include legal, communications, and executive participants — not just engineers.

### What should we do if we discover the breach weeks after it occurred?

If the breach is discovered late: do not panic, but act quickly. Engage legal counsel immediately — notification deadlines may have already started. Engage a forensics firm to determine the timeline and scope. Preserve all available evidence (logs, backups, system images). Notify regulators if required — be transparent about the delay and the reason. Notify affected customers with clear, honest communication. Review why detection was delayed and improve monitoring. Document everything — late detection is a finding, not an excuse. The postmortem should address both the breach and the detection gap.

### How do we handle a breach at a third-party vendor?

If a vendor experiences a breach affecting your data: confirm what data of yours was involved. Review your Data Processing Agreement (DPA) for notification requirements. Request a detailed incident report from the vendor. Assess whether to continue using the vendor or switch providers. Notify your affected customers if required — you are responsible for their data even when a vendor holds it. Coordinate communication with the vendor to ensure consistent messaging. Document the vendor response and your assessment for legal and compliance records. Consider legal action if the vendor failed to meet contractual security obligations.
