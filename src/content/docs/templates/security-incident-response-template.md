---
contentType: docs
slug: security-incident-response-template
templateType: security-incident-response
title: "Security Incident Response Template"
description: "A security incident response template for documenting breaches, containing threats, and communicating with stakeholders during a security event."
metaDescription: "Security incident response template: document breaches, contain threats, and communicate during security events. Reduce impact and recovery time."
difficulty: intermediate
topics:
  - security
tags:
  - incident-response
  - security
  - template
relatedResources:
  - /guides/security/web-application-security-guide
  - /guides/devops/on-call-incident-response-guide
  - /docs/templates/incident-postmortem-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Security incident response template: document breaches, contain threats, and communicate during security events. Reduce impact and recovery time."
  keywords:
    - security incident response template
    - breach response template
    - security incident report
    - incident response playbook
    - security event documentation
---

# Security Incident Response Template

Use this template during a security event to ensure nothing is missed under pressure. See [Web Application Security Guide](/guides/security/web-application-security-guide) for prevention and [On-Call Incident Response Guide](/guides/devops/on-call-incident-response-guide) for response procedures.

## Template

```markdown
# Security Incident Report

## Classification
| Field | Value |
|-------|-------|
| **Incident ID** | SEC-YYYY-NNNN |
| **Severity** | [Critical / High / Medium / Low] |
| **Type** | [Data breach / RCE / Credential leak / DDoS / Insider threat] |
| **Status** | [Open / Contained / Resolved / Closed] |

## Timeline

| Time (UTC) | Event | Actor |
|------------|-------|-------|
| 00:00 | Initial alert triggered | Monitoring |
| 00:05 | Incident commander assigned | On-call |
| 00:30 | Threat contained | Engineering |

## Discovery
- **How detected:** [alert / customer report / audit / external tip]
- **Initial scope:** [affected systems / data types / user count]
- **Evidence preserved:** [logs / disk images / memory dumps]

## Containment
- **Immediate actions taken:** [isolate instance / revoke tokens / block IP]
- **Systems isolated:** [list]
- **Communication sent:** [internal / customers / regulators / press]

## Impact Assessment
- **Data accessed:** [none / PII / financial / credentials]
- **Users affected:** [count or "unknown"]
- **Services degraded:** [list or "none"]

## Root Cause
- **Vulnerability:** [description]
- **Attack vector:** [how the attacker got in]
- **Time to detection:** [minutes / hours / days]

## Remediation
- **Short-term fixes applied:** [patch / config change / rotation]
- **Long-term improvements:** [architecture change / process update]
- **Verification:** [how you confirmed the fix]

## Lessons Learned
- **What went well:**
- **What could be improved:**
- **Action items:** [owner + due date]
```

## Severity Classification

| Level | Criteria | Response Time | Communication |
|-------|----------|---------------|---------------|
| **Critical** | Active breach, data exfiltration, RCE | 15 minutes | Legal + exec + customers |
| **High** | Confirmed vulnerability, no confirmed exploit | 1 hour | Internal + potential customer notice |
| **Medium** | Suspicious activity, no confirmed compromise | 4 hours | Internal team |
| **Low** | Policy violation, no business impact | 24 hours | Team lead |

## Communication Templates

### Internal (within 1 hour)

```
Subject: Security Incident SEC-YYYY-NNNN — [Severity]

We have detected [type] affecting [scope]. The incident commander is [name].
Do not discuss externally. Updates every 2 hours in #security-incidents.
```

### External Customers (if PII affected)

```
We are writing to inform you of a security incident that may have involved
your [data type]. We have [contained / remediated] the issue and are
[steps taken]. We will update you within 72 hours.
```

## Best Practices

- **Designate an incident commander immediately** — one person coordinates, others execute
- **Preserve evidence before containment** — memory dumps and logs disappear when you restart. See [Monitoring and Alerting Guide](/guides/devops/monitoring-alerting-guide) for log management.
- **Communicate early and often** — silence breeds speculation and regulatory penalties
- **Assume breach until proven otherwise** — better to over-respond than under-respond
- **Document as you go** — post-incident memory is unreliable

## Common Mistakes

- Destroying evidence by rebooting servers — preserves volatile memory first
- Not involving legal early — disclosure laws have tight deadlines (72 hours for GDPR)
- Communicating too early with unverified facts — retracting statements damages trust
- Skipping the postmortem — security incidents teach more than regular outages. Use [Incident Postmortem Template](/docs/templates/incident-postmortem-template) for structured follow-up.

## Frequently Asked Questions

### When should I notify customers about a security incident?

If their data was or may have been accessed, notify them directly and promptly. See [Data Retention Policy Template](/docs/devops/data-retention-policy-template) for data classification guidance. Regulations vary: GDPR requires 72 hours to regulators, customer notification without undue delay. When in doubt, notify.

### Should I pay a ransomware demand?

Generally no. Payment funds future attacks and does not guarantee data recovery. Consult legal and law enforcement. Focus on recovery from backups and public decryption tools.

### How do I handle a suspected insider threat?

Involve HR and legal immediately. Do not confront the individual directly. Preserve logs quietly, restrict access gradually, and follow your organization's insider threat protocol.
