---
contentType: docs
slug: data-retention-policy-template
title: "Data Retention Policy Template"
description: "A template to define how long data is kept, when it is archived, and when it must be deleted for compliance and cost reasons."
metaDescription: "Define data retention, archiving, and deletion rules with this template. Covers categories, retention periods, legal holds, and compliance controls."
difficulty: beginner
topics:
  - security
  - infrastructure
tags:
  - data-retention
  - compliance
  - gdpr
  - privacy
  - governance
relatedResources:
  - /docs/devops/user-access-audit-template
  - /docs/devops/backup-verification-test-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define data retention, archiving, and deletion rules with this template. Covers categories, retention periods, legal holds, and compliance controls."
  keywords:
    - data retention policy template
    - data deletion policy
    - data archiving policy
    - GDPR retention policy
    - compliance data retention
---

## Overview

A data retention policy defines how long an organization keeps data, when it moves to lower-cost storage, and when it is permanently deleted. This template helps teams classify data, assign retention periods, implement legal holds, and document compliance controls. A clear policy reduces storage costs, legal risk, and operational complexity.

## When to Use

- Setting up a new data platform or application.
- Preparing for GDPR, CCPA, HIPAA, or SOC 2 audits.
- Reducing cloud storage costs and optimizing data lifecycle.
- Responding to a data subject access or deletion request.
- Defining backup and archive strategies.
- After a security incident involving data exposure.

## Prerequisites

- Inventory of data types, systems, and storage locations.
- Legal and compliance guidance for minimum and maximum retention periods.
- Data classification scheme such as public, internal, confidential, restricted.
- Storage and backup tooling that supports lifecycle policies.
- A process to identify and manage legal holds.
- Owners for each data category or system.

## Solution

### Template

#### 1. Policy Scope and Roles

| Field | Description | Example |
|-------|-------------|---------|
| Policy name | Name of the policy | `Customer Data Retention Policy` |
| Effective date | When the policy takes effect | `2026-07-01` |
| Review cycle | How often the policy is reviewed | `Annually` |
| Policy owner | Team responsible for the policy | `Data governance` |
| Legal approver | Compliance or legal reviewer | `Legal counsel` |
| Technical owner | Team implementing controls | `Platform engineering` |
| Scope | Systems and data covered | `All production databases, logs, object storage, and backups` |

#### 2. Data Categories and Retention Periods

| Data Category | Examples | Retention Period | Archive After | Delete After | Legal Basis |
|---------------|----------|------------------|---------------|--------------|-------------|
| Customer account data | Profiles, preferences | Life of account + 1 year | 1 year after close | 2 years after close | Contract, legal obligation |
| Transaction records | Orders, payments | 7 years | 1 year | 7 years after period close | Tax and financial law |
| Application logs | Request logs, error logs | 90 days | 30 days | 90 days | Operational need |
| Security logs | Authentication, access logs | 2 years | 1 year | 2 years after creation | Security and compliance |
| Backup data | Full and incremental backups | 30 days | 30 days | Per backup schedule | Disaster recovery |
| Analytics data | Aggregated events | 1 year | 6 months | 1 year after aggregation | Legitimate interest |
| Marketing data | Email interactions, leads | 2 years or until opt-out | 1 year | On opt-out or 2 years | Consent |
| Temporary data | Cache, import files | 7 days | 3 days | 7 days | Operational need |

#### 3. Retention Rules by Data Classification

| Classification | Minimum Retention | Maximum Retention | Special Handling |
|----------------|-------------------|-------------------|------------------|
| Public | As needed by business | 1 year or less | No special handling |
| Internal | Business need | 3 years | Standard lifecycle |
| Confidential | Legal or contract minimum | 7 years or less | Encryption, access logs |
| Restricted | Regulatory minimum | Regulatory maximum | Legal hold process, encryption, audit trail |

#### 4. Data Lifecycle Actions

| Stage | Trigger | Action | Responsible Tool / Team |
|-------|---------|--------|--------------------------|
| Active | Data created | Store in primary tier with access controls | Application team |
| Cool | 30 days old | Move to lower-cost storage class | Storage lifecycle policy |
| Archive | 1 year old | Move to archive with retrieval policy | Storage lifecycle policy |
| Mark for deletion | Retention period ends | Flag records and notify owners | Data governance platform |
| Secure deletion | Approved by legal / policy | Delete or anonymize permanently | Platform engineering |
| Audit log | Every lifecycle action | Log retention and deletion events | Audit logging system |

#### 5. Legal Hold and Exception Process

| Scenario | Process | Owner | Documentation |
|----------|---------|-------|---------------|
| Litigation hold | Suspend deletion for affected data | Legal counsel | Hold notice and scope |
| Regulatory investigation | Extend retention as required | Compliance officer | Regulatory request record |
| Data subject request | Review and delete or anonymize | Data privacy team | Request log and response |
| Exception request | Submit reason, risk review, approval | Data governance | Exception register |
| Policy override | Executive approval with legal review | C-level / legal | Signed exception record |

#### 6. Deletion and Verification Checklist

- [ ] Data owner confirms retention period has expired.
- [ ] No active legal hold covers the data.
- [ ] Data is deleted from primary storage and indexes.
- [ ] Backups containing the data are purged or scheduled for purge within policy.
- [ ] Archives are deleted or anonymized according to schedule.
- [ ] Derived datasets, caches, and replicas are refreshed or cleared.
- [ ] Deletion is logged with timestamp, owner, and scope.
- [ ] A sample is verified to confirm deletion.
- [ ] Compliance team reviews deletion logs periodically.

## Explanation

Data retention is a balance between business value, legal obligation, and storage cost. A written policy removes ambiguity, ensures consistent execution, and provides evidence during audits. By classifying data, defining retention periods, and automating lifecycle actions, teams can reduce manual work and avoid keeping data longer than necessary.

## Variants

- **Cloud object storage lifecycle policy**: S3, Azure Blob, or GCP Storage lifecycle rules for transition and expiration.
- **Database retention policy**: Partition pruning, row-level deletion, or automated purge jobs.
- **Log retention policy**: Retention for application, infrastructure, and security logs with different periods.
- **Customer data retention policy**: Focused on GDPR and CCPA requirements for personal data.
- **Healthcare data retention policy**: HIPAA-aligned retention and access controls for protected health information.
- **Financial data retention policy**: Tax and audit record retention with immutable storage.

## Best Practices

- Classify data before defining retention periods.
- Automate lifecycle transitions using native storage or database features.
- Apply the shortest retention that satisfies legal and business needs.
- Keep a centralized inventory of data stores and retention rules.
- Log every deletion and retention action for audit purposes.
- Train teams on legal hold and exception processes.
- Review the policy at least annually and after regulatory changes.
- Use encryption and access controls for data in retention.
- Test deletion procedures periodically to ensure data is truly removed.

## Common Mistakes

- Keeping all data forever "just in case."
- Deleting data without confirming legal hold status.
- Forgetting about backups, archives, or replicas when deleting primary data.
- Using the same retention period for all data types.
- Not documenting exceptions and their approvals.
- Failing to log deletion events.
- Ignoring data in third-party services or caches.
- Not reviewing retention policies after new regulations.

## FAQs

### What is the difference between archiving and deleting data?

Archiving moves data to long-term, lower-cost storage for compliance or reference. Deleting permanently removes data so it cannot be recovered.

### How do we handle backups under a retention policy?

Backups should have their own retention schedule. When primary data is deleted, the deletion should eventually propagate to backups according to the backup retention policy, or backups should be explicitly purged if required by law.

### What happens if a legal hold conflicts with the retention policy?

Legal hold takes precedence. The affected data must be preserved beyond its normal retention period until the hold is released, and this exception must be documented.
