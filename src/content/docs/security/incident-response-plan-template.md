---





contentType: docs
slug: incident-response-plan-template
title: "Incident Response Plan Template"
description: "A template for incident response covering severity classification, roles, detection, containment, eradication, recovery, and post-incident review procedures."
metaDescription: "Use this incident response plan template to define severity levels, roles, detection, containment, eradication, recovery, and post-incident review procedures."
difficulty: intermediate
topics:
  - testing
tags:
  - security
  - incident-response
  - template
  - operations
  - recovery
  - plan
  - infrastructure
relatedResources:
  - /docs/access-control-policy-template
  - /docs/security-audit-checklist
  - /docs/vulnerability-management-process-template
  - /docs/incident-postmortem-template
  - /docs/encryption-key-rotation-runbook
  - /docs/penetration-test-report-template
  - /docs/security-incident-response-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this incident response plan template to define severity levels, roles, detection, containment, eradication, recovery, and post-incident review procedures."
  keywords:
    - incident response
    - incident management
    - security incident
    - plan template
    - recovery
    - containment
    - post-incident review





---

## Overview

An incident response plan defines how an organization detects, responds to, and recovers from security incidents. It establishes severity levels, roles and responsibilities, communication procedures, and post-incident review processes. Without a plan, incidents are handled chaotically, leading to longer downtime, greater data loss, and regulatory penalties.

## When to Use


- For alternatives, see [Security Incident Response Template](/docs/security-incident-response-template/).

- Establishing incident response for a new organization
- Preparing for compliance audits (SOC 2, ISO 27001, HIPAA)
- Responding to a security incident
- Training new incident response team members
- Conducting tabletop exercises
- Reviewing and updating existing incident response procedures

## Solution

```markdown
# Incident Response Plan — `<Organization Name>`

## Plan Overview

| Field | Value |
|-------|-------|
| Organization | Example Corp |
| Plan Version | 3.0 |
| Last Updated | 2026-07-05 |
| Plan Owner | CISO |
| Approved By | Executive Committee |
| Review Cycle | Quarterly |
| Next Review | 2026-10-05 |
| Compliance Frameworks | SOC 2, ISO 27001, GDPR, HIPAA |
| IR Team Size | 7 members |
| On-Call Rotation | 24/7, weekly rotation |

## 1. Incident Severity Classification

### Severity Levels

| Severity | Definition | Examples | Response Time | Escalation |
|----------|------------|----------|---------------|------------|
| SEV-0 (Critical) | Total service outage or active data breach | Production down, PII leaked, ransomware | 15 min | CEO, CISO, Legal, PR |
| SEV-1 (High) | Major service degradation or confirmed security breach | Partial outage, unauthorized access detected | 30 min | CISO, VP Engineering |
| SEV-2 (Medium) | Minor service degradation or suspected security issue | Slow response, suspicious activity flagged | 2 hours | Security Lead, On-call Eng |
| SEV-3 (Low) | Minor issue with no user impact | Single pod crash, config error | 4 hours | On-call Engineer |
| SEV-4 (Informational) | No impact, informational only | Security advisory, maintenance notification | Next business day | N/A |

### Severity Decision Matrix

| Impact \ Scope | Single User | Team | Department | Organization |
|----------------|-------------|------|------------|--------------|
| Data breach | SEV-1 | SEV-0 | SEV-0 | SEV-0 |
| Service outage | SEV-3 | SEV-2 | SEV-1 | SEV-0 |
| Performance degradation | SEV-4 | SEV-3 | SEV-2 | SEV-1 |
| Security alert (unconfirmed) | SEV-3 | SEV-2 | SEV-2 | SEV-1 |

## 2. Roles and Responsibilities

### Incident Response Team

| Role | Primary | Secondary | Responsibilities |
|------|---------|-----------|------------------|
| Incident Commander | CISO | VP Engineering | Coordinate response, make decisions, authorize actions |
| Technical Lead | Security Lead | Senior DevOps | Investigate, contain, eradicate threat |
| Communications Lead | PR Director | Marketing Director | Internal and external communications |
| Legal Counsel | General Counsel | External Legal | Legal obligations, regulatory notifications |
| HR Liaison | HR Director | HR Manager | Personnel issues, internal investigations |
| Scribe | Security Analyst | DevOps Engineer | Document timeline, decisions, actions |
| Executive Sponsor | CEO | COO | Business decisions, resource authorization |

### On-Call Schedule

| Rotation | Primary On-Call | Secondary On-Call | Escalation |
|----------|----------------|-------------------|------------|
| Week 1 | Security Lead A | DevOps Engineer A | CISO |
| Week 2 | Security Lead B | DevOps Engineer B | CISO |
| Week 3 | Security Lead A | DevOps Engineer A | VP Eng |
| Week 4 | Security Lead B | DevOps Engineer B | VP Eng |
| Holiday | Security Lead C | DevOps Engineer C | CISO + VP Eng |

### Contact Information

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| Incident Commander | Jane Doe | +1-555-0101 | jane@example.com | @jane |
| Technical Lead | John Smith | +1-555-0102 | john@example.com | @john |
| Communications Lead | Mary Johnson | +1-555-0103 | mary@example.com | @mary |
| Legal Counsel | Robert Chen | +1-555-0104 | robert@example.com | @robert |
| HR Liaison | Sarah Williams | +1-555-0105 | sarah@example.com | @sarah |
| Executive Sponsor | CEO | +1-555-0100 | ceo@example.com | @ceo |

## 3. Incident Lifecycle

### Phase 1: Detection and Reporting

| Detection Source | Method | Alert Target | Response |
|------------------|--------|--------------|----------|
| SIEM alerts | Correlation rules | On-call Security | Page on-call |
| Monitoring alerts | Datadog/Prometheus | On-call DevOps | Page on-call |
| User reports | Help desk ticket | Security Team | Triage within 1 hour |
| External reports | Security researcher | Security Lead | Acknowledge within 24 hours |
| Threat intel | Feed correlation | SIEM auto-alert | Auto-page on SEV-0/1 |
| Compliance | Audit finding | Security Lead | Triage within 1 business day |

### Incident Report Template

```
Incident ID: INC-2026-001
Reported by: <name>
Date/Time detected: <YYYY-MM-DD HH:MM TZ>
Severity: <SEV-0/1/2/3/4>
Description: <brief description>
Affected systems: <list>
Affected users: <count or "unknown">
Data involved: <type, classification>
Current status: <investigating/contained/resolved>
Assigned to: <name>
```

### Phase 2: Triage and Assessment

| Step | Action | Responsible | Duration |
|------|--------|-------------|----------|
| 1 | Acknowledge incident | On-call | 5 min |
| 2 | Assign incident ID | On-call | 5 min |
| 3 | Assess severity | On-call + IC | 15 min |
| 4 | Assign roles | IC | 10 min |
| 5 | Create incident channel | Scribe | 5 min |
| 6 | Notify stakeholders | Communications Lead | 30 min |
| 7 | Start incident log | Scribe | Ongoing |
| 8 | Begin investigation | Technical Lead | Ongoing |

### Phase 3: Containment

#### Immediate Containment (SEV-0/SEV-1)

| Action | Command/Procedure | Duration | Approval |
|--------|-------------------|----------|----------|
| Isolate affected host | `kubectl cordon <node>; kubectl drain <node>` | 5 min | Tech Lead |
| Block malicious IP | Update WAF rules / firewall | 5 min | Tech Lead |
| Disable compromised account | `aws iam update-access-key --status Inactive` | 5 min | Tech Lead |
| Revoke active sessions | Force logout via IdP | 5 min | Tech Lead |
| Disable affected service | `kubectl scale deployment <name> --replicas=0` | 5 min | IC |
| Snapshot affected systems | Create disk snapshots for forensics | 15 min | Tech Lead |
| Preserve evidence | Capture logs, memory dumps | 30 min | Tech Lead |

#### Short-term Containment

| Action | Purpose | Duration |
|--------|---------|----------|
| Apply temporary firewall rules | Block attack vector | 30 min |
| Rotate compromised credentials | Prevent re-entry | 1 hour |
| Patch vulnerable software | Close attack vector | 2-4 hours |
| Deploy hotfix | Fix exploited bug | 2-6 hours |

#### Long-term Containment

| Action | Purpose | Duration |
|--------|---------|----------|
| Rebuild affected systems | Clean state | 4-24 hours |
| Update security rules | Prevent recurrence | 1-2 hours |
| Enhance monitoring | Detect similar attacks | 2-4 hours |
| Update detection rules | SIEM correlation | 1-2 hours |

### Phase 4: Eradication

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Identify root cause | Forensic analysis |
| 2 | Remove malware/artifacts | Anti-malware scan, manual review |
| 3 | Close attack vector | Patch, config change, rule update |
| 4 | Validate eradication | Full system scan, penetration test |
| 5 | Document eradication steps | Incident log updated |

### Phase 5: Recovery

| Step | Action | Verification | Duration |
|------|--------|--------------|----------|
| 1 | Restore from clean backup | Backup integrity check | 1-4 hours |
| 2 | Rebuild affected systems | Configuration validation | 2-12 hours |
| 3 | Deploy patched version | Smoke tests pass | 1-2 hours |
| 4 | Gradual traffic restore | Health checks, monitoring | 30 min - 2 hours |
| 5 | Monitor for recurrence | Enhanced monitoring 72 hours | 72 hours |
| 6 | Validate with users | User acceptance testing | 1-4 hours |

### Phase 6: Post-Incident Review

| Step | Action | Responsible | Duration |
|------|--------|-------------|----------|
| 1 | Schedule review meeting | IC | Within 5 days |
| 2 | Collect all evidence | Scribe | Before meeting |
| 3 | Write incident timeline | Scribe | Before meeting |
| 4 | Conduct blameless review | All stakeholders | 1-2 hours |
| 5 | Identify root cause | Technical Lead | During review |
| 6 | Define corrective actions | Team | During review |
| 7 | Assign action items | IC | During review |
| 8 | Publish post-mortem | Scribe | Within 2 weeks |
| 9 | Track action items | IC | Until completion |

## 4. Communication Plan

### Internal Communications

| Audience | Channel | Timing | Content |
|----------|---------|--------|---------|
| IR Team | Slack incident channel | Real-time | Technical updates |
| Engineering | Slack #incidents | Every 30 min | Status updates |
| All employees | Email | Every 2 hours | High-level status |
| Executive team | Phone/Slack | Every 1 hour | Business impact |
| Board | Email via CEO | Within 24 hours | Summary for board |

### External Communications

| Audience | Channel | Timing | Content | Approval |
|----------|---------|--------|---------|----------|
| Customers | Status page | Within 30 min | Service impact | IC + Comms |
| Customers | Email | Within 24 hours | Detailed notification | IC + Legal |
| Regulatory bodies | Official notification | Per regulation | Required disclosure | Legal |
| Media | Press release | If publicly visible | Approved statement | CEO + Comms |
| Security researchers | Email | Within 48 hours | Acknowledgment | Security Lead |

### Communication Templates

#### Status Page Update (Initial)

```
[INVESTIGATING] We are investigating an issue affecting <service>.
Impact: <description of impact>.
Started: <timestamp>.
We will update within 30 minutes.
```

#### Status Page Update (Resolved)

```
[RESOLVED] The issue affecting <service> has been resolved.
Duration: <start> to <end>.
Root cause: <brief description>.
We will publish a post-incident review within 2 weeks.
```

#### Customer Notification Email

```
Subject: Security Incident Notification — <Date>

Dear <Customer>,

We are writing to inform you of a security incident that may have affected your data.
<Description of incident and impact>.
<What we have done in response>.
<What customers should do>.
We take this seriously and are taking the following steps: <action list>.
For questions, contact security@example.com.

Sincerely,
<Name>, <Title>
```

## 5. Regulatory Notification Requirements

| Regulation | Notification Deadline | Recipient | Trigger |
|------------|----------------------|-----------|---------|
| GDPR | 72 hours | Supervisory authority | Personal data breach |
| GDPR | Without undue delay | Data subjects | High risk to rights |
| CCPA | Without unreasonable delay | Affected consumers | Breach of PII |
| HIPAA | 60 days | HHS Secretary | PHI breach affecting 500+ |
| HIPAA | 60 days | Affected individuals | PHI breach |
| SOC 2 | Per agreement | Clients | Security incident |
| State laws | Varies (1-90 days) | State AG + residents | Per state law |

## 6. Incident Metrics

| Metric | Target | Measurement | Report |
|--------|--------|-------------|--------|
| Mean Time to Detect (MTTD) | < 15 min | Time from incident start to detection | Monthly |
| Mean Time to Respond (MTTR) | < 30 min | Time from detection to response start | Monthly |
| Mean Time to Contain (MTTC) | < 4 hours | Time from detection to containment | Monthly |
| Mean Time to Recover (MTTR) | < 24 hours | Time from containment to full recovery | Monthly |
| Incidents per quarter | Trending down | Count of incidents | Quarterly |
| Repeat incidents | < 5% | Incidents with same root cause | Quarterly |
| Post-incident reviews on time | 100% | Reviews within 5 days | Monthly |
| Action items completed | 100% | Corrective actions completed | Quarterly |
| Tabletop exercises | 4 per year | Exercises conducted | Annual |

## 7. Tabletop Exercise Plan

### Exercise Schedule

| Exercise | Scenario | Participants | Frequency |
|----------|----------|--------------|-----------|
| Exercise 1 | Ransomware attack | Full IR team | Quarterly |
| Exercise 2 | Data breach (PII leak) | IR team + Legal + PR | Quarterly |
| Exercise 3 | Insider threat | IR team + HR | Annually |
| Exercise 4 | DDoS attack | IR team + DevOps | Annually |
| Exercise 5 | Supply chain attack | Full IR team + Exec | Annually |

### Exercise Format

| Phase | Duration | Activity |
|-------|----------|----------|
| Setup | 15 min | Distribute scenario, assign roles |
| Inject 1 | 30 min | Initial incident report |
| Inject 2 | 30 min | Escalation (new information) |
| Inject 3 | 30 min | Complication (key person unavailable) |
| Hot wash | 30 min | Immediate feedback and lessons |
| Report | 1 week | Written findings and recommendations |
```

## Explanation

An incident response plan provides a structured approach to handling security incidents. It defines six phases: detection, triage, containment, eradication, recovery, and post-incident review. Each phase has specific actions, responsible roles, and timeframes.

Severity classification drives the response. SEV-0 incidents (production down, active data breach) require a 15-minute response with full team escalation. SEV-3 incidents (minor issues) have a 4-hour response window. The severity level determines who gets paged, how often updates are sent, and when executives are notified.

Roles prevent chaos during incidents. The Incident Commander coordinates the response and makes decisions. The Technical Lead investigates and contains the threat. The Communications Lead handles internal and external messaging. The Scribe documents everything. Without defined roles, everyone tries to do everything, and nothing gets done properly.

Containment stops the bleeding. Immediate containment isolates affected systems, blocks malicious IPs, and disables compromised accounts. Short-term containment applies patches and rotates credentials. Long-term containment rebuilds systems and enhances monitoring. The goal is to stop the attack without destroying evidence needed for forensic analysis.

Eradication removes the threat completely. This involves identifying the root cause, removing malware or attacker artifacts, closing the attack vector, and validating that the threat is gone. Skipping eradication leads to recurring incidents — the attacker comes back through the same vulnerability.

Recovery restores service to normal. Systems are rebuilt from clean backups, patched versions are deployed, traffic is gradually restored with health checks, and enhanced monitoring watches for recurrence. Recovery isn't complete until the system has been stable for 72 hours under enhanced monitoring.

Post-incident review is where learning happens. A blameless review identifies what happened, why it happened, and how to prevent it. Corrective actions are assigned with owners and deadlines. The post-mortem is published so the entire organization can learn. Without post-incident reviews, the same incidents repeat.

Communication is critical. Internal stakeholders need regular updates. Customers need timely notifications on a status page. Regulatory bodies have mandatory notification deadlines (GDPR: 72 hours, HIPAA: 60 days). Pre-approved templates speed up communication during the incident when time is critical.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Small team | Simplified plan, shared roles | 2-3 person IR team |
| Enterprise | Full plan with dedicated IR team | 24/7 SOC, automated response |
| Healthcare | Add HIPAA breach notification | 60-day notification, HHS reporting |
| Financial | Add regulatory notification | SEC, FINRA, state banking regulators |
| Cloud-native | Focus on cloud containment | Isolate VPC, revoke IAM roles |
| Air-gapped | Focus on physical containment | Network isolation, physical access |

## What Works

1. Test the plan with tabletop exercises — untested plans fail under pressure
2. Use a dedicated incident channel — keeps communication organized
3. Document everything in real-time — the scribe role is critical
4. Conduct blameless post-incident reviews — focus on systems, not people
5. Pre-approve communication templates — save time during the incident
6. Track action items to completion — lessons without action are wasted
7. Monitor for 72 hours after recovery — detect recurrence early

## Common Mistakes

1. No plan — incidents are handled ad hoc, leading to chaos
2. Plan never tested — the plan looks good on paper but fails in practice
3. No defined roles — everyone tries to help, nobody coordinates
4. No communication plan — stakeholders learn about incidents from Twitter
5. No post-incident review — the same incident repeats
6. Blame-focused reviews — people hide issues instead of reporting them
7. Action items not tracked — corrective actions are identified but never implemented

## Frequently Asked Questions

### What is the difference between an incident and an event?

An event is any observable occurrence in a system or network (a login, a file access, a network connection). An incident is an event that violates security policies or threatens the organization. A failed login is an event. 10,000 failed logins in 5 minutes is an incident. The IR plan applies to incidents, not events.

### How do we conduct a blameless post-incident review?

Focus on systems and processes, not individuals. Ask "what failed in our system that allowed this to happen?" instead of "who caused this?" Treat the incident as a learning opportunity. Assume everyone did their best with the information they had. The goal is to improve systems so the same incident can't happen again, not to assign blame.

### When should we involve law enforcement?

For SEV-0 incidents involving criminal activity (ransomware, data theft, fraud), contact law enforcement early. Preserve evidence before containing — shutting down systems may destroy forensic evidence. Consult legal counsel before involving law enforcement, as there are implications for ongoing operations and customer notifications. The FBI (US), NCA (UK), or local cybercrime units handle these cases.

### How do we handle an insider threat incident?

Involve HR and Legal from the start. Insider threats require different handling: preserve evidence discreetly, restrict access without alerting the individual, and coordinate with HR for potential termination. Legal determines obligations for reporting and notification. The IR plan should have a specific insider threat annex with HR and Legal roles defined.

### What should we do if we discover a vulnerability but no incident has occurred?

Treat it as a SEV-3 or SEV-4 depending on severity. Follow the vulnerability management process, not the incident response plan. The IR plan is for active incidents. Vulnerability management handles identification, triage, and remediation of vulnerabilities before they're exploited. If the vulnerability is being actively exploited, escalate to an incident.
