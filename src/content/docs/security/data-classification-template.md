---
contentType: docs
slug: data-classification-template
title: "Data Classification Template"
description: "A template for classifying data as public, internal, confidential, or restricted with handling rules."
metaDescription: "Use this data classification template to categorize organizational data into public, internal, confidential, and restricted levels with handling requirements."
difficulty: beginner
topics:
  - security
tags:
  - security
  - data
  - classification
  - compliance
  - privacy
  - governance
  - template
relatedResources:
  - /docs/incident-response-playbook-template
  - /docs/vendor-risk-assessment-template
  - /docs/data-retention-policy-template
  - /docs/api-security-review-template
  - /docs/security-audit-checklist-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this data classification template to categorize organizational data into public, internal, confidential, and restricted levels with handling requirements."
  keywords:
    - security
    - data
    - classification
    - compliance
    - privacy
    - governance
    - template
---
## Overview

Not all data is equal. A public marketing blog post and a customer credit card number do not deserve the same protection, but teams often apply uniform encryption and access controls because no one defined the difference. Data classification creates a shared vocabulary for risk: public data can be open, internal data needs access control, confidential data needs encryption, and restricted data needs both encryption and strict need-to-know access. Without classification, engineers default to either over-protecting everything (waste) or under-protecting everything (breach risk).

## When to Use

Use this resource when:
- You are designing a data storage or access control policy and need consistent labels
- Compliance (SOC 2, GDPR, HIPAA) requires documented data handling
- A breach or leak happened and you realize nobody agreed on what "sensitive" meant

## Solution

```markdown
# Data Classification: `<System / Dataset>`

## 1. Classification Definitions

| Level | Description | Examples | Handling Requirements |
|-------|-------------|----------|----------------------|
| **Public** | Approved for public disclosure | Marketing site, open-source repos, job postings | No access control; standard backups |
| **Internal** | For employees and contractors only | Internal wikis, roadmaps, non-sensitive metrics | Role-based access; encrypted at rest; MFA for remote access |
| **Confidential** | Sensitive; unauthorized disclosure harms the company | Customer PII (names, emails), financial data, source code | Encryption at rest and in transit; least-privilege access; audit logging; approved sharing only |
| **Restricted** | Highly sensitive; unauthorized disclosure causes severe harm | Credit cards, SSNs, health records, passwords, encryption keys | Encryption at rest and in transit; need-to-know access; multi-party approval for access; strict audit trail; no external sharing |

## 2. Dataset Inventory

| Dataset | Classification | Storage Location | Encryption | Access Control | Retention | Owner |
|---------|---------------|------------------|------------|----------------|-----------|-------|
| `user_profiles` | Confidential | PostgreSQL RDS | AES-256 | RBAC: engineering, support | 7 years post-deletion | @data-owner |
| `payment_tokens` | Restricted | Vault / HSM | AES-256-GCM | Need-to-know: payments team only | 90 days | @security-owner |
| `public_docs` | Public | S3 bucket (public) | None | None | Indefinite | @content-owner |

## 3. Handling Rules by Level

### Access

| Level | Authentication | Authorization | MFA | Remote Access |
|-------|---------------|---------------|-----|---------------|
| Public | None | None | N/A | Open |
| Internal | SSO | Role-based | Required | VPN + MFA |
| Confidential | SSO | Role-based + approval | Required | VPN + MFA + justification |
| Restricted | SSO + hardware token | Need-to-know + multi-party approval | Required | Air-gapped or dedicated VPN + justification |

### Transmission

| Level | Internal Network | External Network | Email / Chat |
|-------|-----------------|------------------|--------------|
| Public | Plain | Plain | Allowed |
| Internal | TLS 1.2+ | TLS 1.2+ | Allowed with care |
| Confidential | TLS 1.2+ | TLS 1.2+ + DLP scan | Approved channels only |
| Restricted | TLS 1.2+ + mTLS | Prohibited (use secure file transfer) | Prohibited (use approved secure exchange) |

### Storage

| Level | Encryption at Rest | Key Management | Backup Encryption | Geolocation |
|-------|-------------------|----------------|-------------------|-------------|
| Public | Optional | Standard | Standard | Any region |
| Internal | AES-256 | Standard | AES-256 | Approved regions |
| Confidential | AES-256 | HSM or KMS | AES-256 | Approved regions + residency rules |
| Restricted | AES-256-GCM | HSM | AES-256 + air-gapped backup | Approved regions + no cross-border |

## 4. Exception Log

| Dataset | Requested Lower Classification | Justification | Risk Accepted By | Date | Review Date |
|---------|------------------------------|---------------|------------------|------|-------------|
| | | | | | |
```

## Explanation

The template replaces vague terms like "sensitive" with four concrete levels. Each level has explicit handling rules for access, transmission, and storage. The dataset inventory forces you to catalog what you have before you can protect it. The exception log acknowledges that business needs sometimes require bending rules, but only with documented risk acceptance.

## Data Classification Decision Tree

```text
=== Decision Tree: Classifying a New Dataset ===

Q1: Does the dataset contain personally identifiable information (PII)?
  YES -> Q2
  NO  -> Q3

Q2: Is the PII sensitive (health, financial, biometric, government ID)?
  YES -> Classification: RESTRICTED
  NO  -> Q2a

Q2a: Does the dataset contain data covered by GDPR, CCPA, or HIPAA?
  YES -> Classification: RESTRICTED
  NO  -> Classification: CONFIDENTIAL

Q3: Does the dataset contain business-critical information?
  (trade secrets, source code, internal metrics, revenue data)
  YES -> Classification: CONFIDENTIAL
  NO  -> Q4

Q4: Is the dataset intended for public consumption?
  (marketing materials, public docs, open data)
  YES -> Classification: PUBLIC
  NO  -> Q5

Q5: Is the dataset internal-only but not business-critical?
  (test data, internal notes, non-sensitive configs)
  YES -> Classification: INTERNAL
  NO  -> Default to CONFIDENTIAL (when in doubt, classify higher)
```

## Classification Handling Requirements

```text
=== Handling Matrix ===

Classification    | Encryption  | Access       | Logging    | Retention
-----------------|-------------|--------------|------------|------------------
PUBLIC           | Not required| Anyone       | Optional   | No restriction
INTERNAL         | At rest     | Employees    | Required   | Per policy
CONFIDENTIAL     | At rest +   | Need-to-know | Required + | Per policy +
                 | in transit  | only         | audit trail| legal hold
RESTRICTED       | At rest +   | Named        | Required + | Per policy +
                 | in transit  | individuals  | tamper-    | legal hold +
                 | + key vault | only         | proof logs | right to erasure
```


## Variants

| Context | Extra Levels | Key Difference |
|---------|-------------|----------------|
| Healthcare (HIPAA) | Add PHI / ePHI labels | Patient data is always Restricted; BAAs required |
| Finance (PCI DSS) | Add CDE (Cardholder Data Environment) | Card data is Restricted; network segmentation mandatory |
| Government | Add Unclassified, Secret, Top Secret | Clearance-based access; air-gapping common |
| SaaS startup | Often merge Internal + Confidential | Simplicity over completeness when team is small |
| EU operations | Add "EU Personal Data" flag | GDPR residency and processing agreements required |

## What Works

1. Label data at creation, not at storage; retroactive classification is expensive and error-prone
2. Automate classification where possible; DLP tools can tag data based on patterns (credit cards, SSNs)
3. Review classifications quarterly; a "public" dataset that becomes revenue-critical may need upgrading
4. Train engineers on the difference between Confidential and Restricted; the gap is where breaches happen
5. Log every exception; patterns of exceptions indicate policy misalignment or training gaps

## Common Mistakes

1. Classifying everything as Confidential to be "safe"; this dilutes protection and slows engineering
2. Not labeling test/staging data; developers often clone production and forget the data is still sensitive
3. Ignoring metadata; a log file containing user IDs is Confidential even if it contains no names
4. Not including third-party vendors in classification rules; a SaaS tool with SSO is still external
5. Treating classification as a one-time audit; data changes, services evolve, and classifications rot

## Frequently Asked Questions

### Who decides the classification of a new dataset?

The data owner (usually the product or engineering lead who creates the dataset) proposes a classification. The security team reviews and approves. For Restricted data, a security architect must sign off. When in doubt, classify higher; it is easier to downgrade than to upgrade after a leak.

### What if a dataset contains mixed classifications?

Classify at the highest level present. A spreadsheet with Public marketing copy and Restricted customer credit cards is Restricted. If possible, split the dataset to reduce overhead. Mixed-classification datasets are the most common source of accidental oversharing because the "safe" parts create a false sense of security.

### How do I classify data in logs and observability tools?

Logs are often the most overlooked data class. Any log containing user IDs, emails, or request payloads with PII is at least Confidential. Use log redaction or tokenization to strip PII before sending to centralized logging. If you must retain full logs for debugging, store them in a Restricted-access bucket and set short retention periods.


### How do we automate data classification?

Use DLP (Data Loss Prevention) tools to automatically detect and tag data based on patterns: credit card numbers (regex), SSNs, email addresses, phone numbers, and custom patterns. Integrate DLP scanning into your data pipeline — when data lands in a warehouse or lake, it is scanned and tagged automatically. Use cloud provider tools (AWS Macie, GCP DLP API, Azure Purview) for managed scanning. For databases, use schema-level classification — tag columns containing PII at the schema level. For logs, use redaction pipelines that detect and mask PII before centralization. Automation reduces human error but does not replace human review for edge cases.

### What is data classification in practice for a SaaS application?

For a SaaS application: user profiles (name, email, phone) are Confidential. Payment data (credit card numbers, billing addresses) is Restricted. Usage analytics (page views, feature usage) is Internal. Marketing content is Public. API keys and secrets are Restricted. Log files containing user IDs are Confidential. Database backups containing user data are Restricted. The classification determines encryption, access controls, retention, and sharing policies. Every new feature should include a data classification review as part of the security checklist.

### How do we handle data classification for third-party integrations?

When sending data to a third-party: classify the data being sent. Ensure the vendor's security posture matches the classification (e.g., Restricted data requires a vendor with SOC 2 Type II). Document the data flow in your data inventory. Include classification in the DPA (Data Processing Agreement). For Restricted data, require encryption in transit and at rest by the vendor. Review vendor security annually. If a vendor downgrades their security posture, reassess whether to continue sending classified data. Never send Restricted data to a vendor without a signed DPA and security review.

### How often should we review data classifications?

Review classifications: quarterly for Restricted datasets, biannually for Confidential, annually for Internal and Public. Trigger out-of-cycle reviews when: a dataset's purpose changes, new regulations apply, a data breach occurs, or a dataset is merged with another. Track review dates in the data inventory. Assign a data owner responsible for each dataset's classification. Document review findings and any classification changes. A classification that has not been reviewed in over a year is considered stale and should be flagged.

### What are the consequences of misclassification?

Over-classification (classifying everything as Restricted): slows engineering, increases costs (encryption, access management, audit), and trains engineers to ignore classification labels. Under-classification (classifying Restricted data as Public): leads to data breaches, regulatory fines (GDPR: up to 4% of annual revenue), loss of customer trust, and legal liability. The goal is accurate classification — not maximum classification. Regular reviews and automated scanning help maintain accuracy. Document the rationale for each classification decision for audit purposes.


















































































End of document. Review and update quarterly.