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
  - /docs/user-access-audit-template
  - /docs/backup-verification-test-template
  - /recipes/data-privacy-gdpr
  - /recipes/container-security
  - /recipes/security-headers
  - /docs/api-security-review-template
  - /docs/data-classification-template
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


- For alternatives, see [Disaster Recovery Test Plan](/docs/disaster-recovery-test-plan/).

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

## S3 Lifecycle Policy Configuration

```json
{
  "Rules": [
    {
      "ID": "transition-to-glacier",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ],
      "Expiration": { "Days": 2555 }
    },
    {
      "ID": "expire-temp-data",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": { "Days": 7 }
    },
    {
      "ID": "retain-user-data",
      "Status": "Enabled",
      "Filter": { "Prefix": "users/" },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 90 },
      "Expiration": { "Days": 3650 }
    }
  ]
}
```

## Database Retention Purge Script

```sql
-- PostgreSQL scheduled purge job
-- Run weekly via pg_cron or external scheduler

-- Purge expired sessions (retention: 30 days)
DELETE FROM sessions
WHERE created_at < NOW() - INTERVAL '30 days';

-- Purge audit logs (retention: 7 years for compliance)
-- DO NOT purge: archived separately

-- Purge deleted user data (retention: 90 days after deletion)
DELETE FROM user_data
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '90 days';

-- Purge event logs (retention: 180 days)
DELETE FROM event_logs
WHERE created_at < NOW() - INTERVAL '180 days';

-- Vacuum and analyze after purge
VACUUM ANALYZE sessions;
VACUUM ANALYZE user_data;
VACUUM ANALYZE event_logs;
```

## Data Classification and Retention Matrix

```text
=== Data Classification and Retention Matrix ===

| Data Type          | Classification | Retention  | Storage         | Purge Method       |
|--------------------|----------------|------------|-----------------|--------------------|
| User PII           | Confidential   | 3 years    | Encrypted RDS   | Scheduled purge    |
| Payment records    | Restricted     | 7 years    | Encrypted RDS   | Legal hold review  |
| Audit logs         | Internal       | 7 years    | S3 Glacier      | Lifecycle policy   |
| Application logs   | Internal       | 90 days    | CloudWatch      | Auto-expire        |
| Session data       | Internal       | 30 days    | Redis           | TTL auto-expire    |
| Temporary files    | Public         | 7 days     | S3 temp/        | Lifecycle policy   |
| Analytics events   | Internal       | 2 years    | BigQuery        | Partition expire   |
| Backups            | Confidential   | 90 days    | S3 + Glacier    | Backup policy      |
| Customer exports   | Confidential   | 30 days    | S3 signed URL   | Lifecycle policy   |
| ML training data   | Internal       | 1 year     | S3 IA           | Scheduled purge    |
```


## Variants

- **Cloud object storage lifecycle policy**: S3, Azure Blob, or GCP Storage lifecycle rules for transition and expiration.
- **Database retention policy**: Partition pruning, row-level deletion, or automated purge jobs.
- **Log retention policy**: Retention for application, infrastructure, and security logs with different periods.
- **Customer data retention policy**: Focused on GDPR and CCPA requirements for personal data.
- **Healthcare data retention policy**: HIPAA-aligned retention and access controls for protected health information.
- **Financial data retention policy**: Tax and audit record retention with immutable storage.

## What Works

- Classify data before defining retention periods.
- Automate lifecycle transitions using native storage or database capabilities.
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


### How do we handle GDPR right to erasure requests?

When a user requests data deletion, identify all data stores containing their PII. Create a deletion ticket that tracks each store. Delete or anonymize data in the primary database, object storage, caches, search indexes, data warehouses, and backups. For backups, document that the data will be purged when the backup retention period expires (or initiate an expedited backup purge if required). Log the deletion with timestamp, scope, and approver. Provide confirmation to the user within 30 days. Test the erasure process quarterly.

### What is data anonymization and when should we use it?

Data anonymization removes or obscures personally identifiable information while preserving the data structure for analytics. Techniques include: masking (replacing PII with fake data), hashing (one-way transformation), aggregation (grouping data to remove individual records), and pseudonymization (replacing direct identifiers with pseudonyms). Use anonymization when you need historical data for analytics but no longer need the PII. Document the anonymization method and verify it cannot be reversed.

### How do we manage legal holds?

When a legal hold is issued, immediately suspend all deletion and purging for the affected data. Tag the data with a legal-hold flag in the system. Document the hold: scope, issuing authority, date, and expected duration. Notify all teams with access to the data. Monitor the hold status regularly. When the hold is released, document the release and resume normal retention schedules. Never auto-delete data with an active legal hold. Audit legal hold compliance annually.

### How do we verify data has been deleted?

After a purge job runs, verify deletion by: querying for records older than the retention period (should return zero rows), checking file counts in S3 prefixes (should match expected), and running a sample check on specific records. Log verification results. For compliance, have a second person verify the deletion. Store deletion certificates or logs in an immutable storage bucket. Review deletion verification results monthly.

### How do we handle data retention across multiple regions?

Different regions have different legal requirements (GDPR in EU, CCPA in California, PDPA in Singapore). Create a retention matrix that maps data types to regional requirements. Apply the strictest applicable retention period when data crosses regions. Store data in the region where it was collected when possible. Document cross-region data flows and the retention rules that apply. Review regional requirements annually as laws change.


### How do we handle data retention for machine learning models?

ML models and training data have unique retention needs. Retain model artifacts for the lifetime of the model in production plus 1 year for audit purposes. Training data should follow the data classification policy of the source data. Feature stores should expire features that are no longer used. Log model predictions for 90 days for debugging and bias auditing. Document which datasets were used to train each model version for reproducibility and compliance.

### What is immutable storage and when do we need it?

Immutable storage (S3 Object Lock, Azure Immutable Blob) prevents objects from being deleted or overwritten for a specified retention period. Use it for: compliance requirements (SEC, FINRA, HIPAA), legal hold data, audit logs that must be tamper-proof, and financial records. Configure WORM (Write Once Read Many) mode at the bucket level. Document the immutability period and ensure it aligns with regulatory requirements. Test that deletion attempts are blocked.

### How do we handle data retention for log files?

Application logs: retain for 90 days in hot storage (CloudWatch, Elasticsearch), then archive to S3 Glacier for 1 year. Infrastructure logs: retain for 30 days hot, 180 days archived. Security logs: retain for 1 year hot, 7 years archived for compliance. Access logs (ALB, CloudFront): retain for 90 days hot, 1 year archived. Use log aggregation tools (Fluentd, Logstash) to route logs to the correct retention tier automatically. Set up alerts for log ingestion failures.

### How do we document data retention for auditors?

Create a data retention register that lists: data type, classification, storage location, retention period, legal basis, purge method, last purge date, and responsible owner. Store the register in a version-controlled repository. Generate quarterly reports showing purge execution logs and compliance status. During audits, provide the register, purge logs, and policy documents. Ensure auditors can trace a data type from creation to deletion through the documentation.


Review the data retention policy annually and after any regulatory change. Update the retention matrix, purge schedules, and legal hold procedures. Train all team members on the updated policy.





End of document. Review and update quarterly.