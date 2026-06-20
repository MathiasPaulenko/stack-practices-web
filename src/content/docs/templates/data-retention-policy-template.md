---
contentType: docs
slug: data-retention-policy-template
templateType: data-retention-policy
title: "Data Retention Policy Template"
description: "A data retention policy template that defines how long data is kept, when it is archived, and how it is destroyed in compliance with regulations."
metaDescription: "Data retention policy template: define data lifecycles, archive rules, and destruction procedures to comply with GDPR, CCPA, and industry regulations."
difficulty: intermediate
topics:
  - security
tags:
  - compliance
  - security
  - template
relatedResources:
  - /guides/security/web-application-security-guide
  - /docs/templates/security-incident-response-template
  - /guides/devops/technical-documentation-strategy-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Data retention policy template: define data lifecycles, archive rules, and destruction procedures to comply with GDPR, CCPA, and industry regulations."
  keywords:
    - data retention policy template
    - gdpr data retention
    - data lifecycle policy
    - data destruction template
    - compliance privacy policy
---

# Data Retention Policy Template

Use this template to define how long data lives, when it moves, and how it is securely destroyed. Complement it with the [Security Incident Response Template](/docs/templates/security-incident-response-template) for breach procedures.

## Template

```markdown
# Data Retention Policy: [Data Category]

## Scope
| Field | Value |
|-------|-------|
| **Policy owner** | [team or individual] |
| **Review date** | [annual] |
| **Applicable regulations** | GDPR, CCPA, HIPAA, SOC 2 |

## Data Categories

| Category | Retention Period | Archive After | Destroy After | Storage Location |
|----------|-----------------|---------------|---------------|-----------------|
| User activity logs | 90 days | — | 90 days | Hot storage |
| Transaction records | 7 years | 1 year | 7 years | Glacier / cold |
| Session tokens | 24 hours | — | 24 hours | Redis |
| Error logs with PII | 30 days | — | 30 days | Encrypted store |
| Backup snapshots | 30 days | — | 30 days | Object storage |

## Retention Rules

1. **Active data** — accessible in primary storage
2. **Archived data** — moved to cold storage; retrieval > 24 hours
3. **Destroyed data** — cryptographically erased, not recoverable

## Destruction Procedure

| Step | Action | Verification |
|------|--------|-------------|
| 1 | Identify data past retention date | Automated scan |
| 2 | Export required subset for legal hold | Legal review |
| 3 | Execute deletion via API or secure wipe | Deletion log |
| 4 | Verify deletion with query or checksum | Audit record |

## Exceptions

| Exception | Approval Required | Documentation |
|-----------|-----------------|---------------|
| Legal hold | Legal counsel | Case number |
| Audit requirement | Compliance officer | Audit scope |
| User deletion request | DPO | Ticket reference |

## Roles

| Role | Responsibility |
|------|-------------|
| **Data Owner** | Defines retention requirements |
| **Engineering** | Implements automated deletion |
| **Compliance** | Audits adherence |
| **Legal** | Approves exceptions |
```

## Retention Period Guidelines

| Data Type | Minimum | Maximum | Rationale |
|-----------|---------|---------|-----------|
| Authentication logs | 1 year | 2 years | Security investigations |
| Financial transactions | 7 years | 10 years | Tax and legal requirements |
| User-generated content | Until account deletion | — | User control (GDPR) |
| Telemetry / analytics | 90 days | 1 year | Product decisions |
| PII in error logs | 30 days | 30 days | Privacy minimization |

## Best Practices

- **Automate deletion** — manual processes fail; cron jobs with audit logs succeed
- **Tag data at creation** — metadata determines lifecycle, not manual classification later
- **Test recovery from archive** — archived data that cannot be restored is worthless
- **Document legal holds** — exceptions must be tracked and expired when the hold ends
- **Encrypt before archiving** — cold storage is cheaper but still needs protection. See [Web Application Security Guide](/guides/security/web-application-security-guide) for encryption best practices.

## Common Mistakes

- Retaining everything forever — storage costs explode and legal risk increases
- No automated enforcement — a policy without automation is a wish
- Confusing backup retention with data retention — backups may outlive the data they protect
- Ignoring downstream copies — logs shipped to third parties need parallel deletion

## Frequently Asked Questions

### What happens if a user requests deletion before the retention period ends?

GDPR and CCPA grant users the right to deletion. Document this workflow in your [Security Incident Response Template](/docs/templates/security-incident-response-template) procedures. Implement a "delete on request" workflow that overrides the standard retention schedule. Log the request and the exception.

### How do I handle data in backups that has exceeded its retention period?

Use immutable backups with expiration policies. If a backup contains data past retention, either restore-delete-recreate the backup or maintain a suppression list that blocks the stale data from being restored.

### Should I delete or anonymize data?

Delete when the data has no ongoing value. Anonymize when you need aggregate analytics but not individual records. Anonymization must be irreversible (k-anonymity or differential privacy) to count as deletion under GDPR.
