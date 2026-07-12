---



contentType: docs
slug: data-governance-policy-template
title: "Plantilla de Política de Gobernanza de Datos"
description: "Una plantilla para clasificación, retención, control de acceso, privacidad y cumplimiento de datos cubriendo GDPR, CCPA y SOC 2."
metaDescription: "Usá esta plantilla de política de gobernanza de datos para definir clasificación, retención, control de acceso, privacidad y cumplimiento."
difficulty: intermediate
topics:
  - testing
tags:
  - data-engineering
  - governance
  - compliance
  - policy
  - template
  - security
  - data
relatedResources:
  - /docs/data-pipeline-design-document-template
  - /docs/data-quality-rules-template
  - /docs/etl-job-runbook-template
  - /docs/access-control-policy-template
  - /docs/security-audit-checklist
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de política de gobernanza de datos para definir clasificación, retención, control de acceso, privacidad y cumplimiento."
  keywords:
    - data governance
    - data classification
    - data retention
    - access control
    - compliance
    - gdpr
    - policy template



---

## Overview

Un data governance policy define cómo data se clasifica, storea, accede, retiene y dispose. Establece roles, responsibilities y procedures para manage data throughout su lifecycle. Sin un governance policy, organizations enfrentan compliance violations, data breaches y inconsistent data practices.

## When to Use


- For alternatives, see [Data Pipeline Design Document Template](/es/docs/data-pipeline-design-document-template/).

- Estableciendo data governance para un new organization
- Preparándote para compliance audits (SOC 2, GDPR, CCPA)
- Definiendo data access y retention rules
- Onboardéando new data sources o platforms
- Respondiendo a data breach incidents

## Solution

```markdown
# Data Governance Policy — `<Organization Name>`

## Policy Overview

| Field | Value |
|-------|-------|
| Organization | Example Corp |
| Policy Version | 2.0 |
| Last Updated | 2026-07-05 |
| Policy Owner | Chief Data Officer |
| Approved By | Executive Committee |
| Review Cycle | Annual |
| Next Review | 2027-07-05 |
| Compliance Frameworks | GDPR, CCPA, SOC 2, HIPAA |
| Data Steward | Data Governance Team |

## 1. Data Classification

### Classification Levels

| Level | Name | Description | Examples | Handling Requirements |
|-------|------|-------------|----------|----------------------|
| L1 | Public | No restriction en access | Marketing materials, public docs | No special handling |
| L2 | Internal | Internal use only, no external sharing | Internal reports, project docs | Access control, no external sharing |
| L3 | Confidential | Restricted access, need-to-know | Financial data, customer lists | Encryption, access logging, need-to-know |
| L4 | Restricted | Highest sensitivity, strict access | PII, PHI, payment data, credentials | Encryption, MFA, audit logging, DLP |

### Classification Rules

| Data Type | Classification | Rationale |
|-----------|---------------|-----------|
| Customer names + emails | L4 (Restricted) | PII bajo GDPR/CCPA |
| Customer addresses | L4 (Restricted) | PII bajo GDPR/CCPA |
| Payment card numbers | L4 (Restricted) | PCI-DSS requirements |
| Employee salaries | L3 (Confidential) | Internal financial data |
| Product catalog | L2 (Internal) | Competitive advantage |
| Marketing materials | L1 (Public) | Intended para public release |
| Aggregate sales metrics | L2 (Internal) | No individual identification |
| Server IP addresses | L3 (Confidential) | Infrastructure security |
| API keys y secrets | L4 (Restricted) | Credential exposure risk |
| Health records (if applicable) | L4 (Restricted) | PHI bajo HIPAA |

### Classification Process

| Step | Action | Responsible | Frequency |
|------|--------|-------------|-----------|
| 1 | Identificá new data source | Data Engineer | On new source |
| 2 | Clasificá data fields | Data Steward | On new source |
| 3 | Revieweá classification | Data Governance Team | On new source |
| 4 | Aplicá classification labels | Data Engineer | After approval |
| 5 | Auditá classifications | Data Steward | Quarterly |

## 2. Data Retention

### Retention Schedule

| Data Category | Classification | Retention Period | Disposal Method | Legal Basis |
|---------------|---------------|-----------------|-----------------|-------------|
| Customer PII (active accounts) | L4 | Duration de account + 30 days | Secure deletion | GDPR Article 5(1)(e) |
| Customer PII (closed accounts) | L4 | 30 days después de closure | Secure deletion | GDPR right to erasure |
| Transaction records | L3 | 7 years | Secure deletion | Tax regulations |
| Financial reports | L3 | 7 years | Secure deletion | SOX requirements |
| Employee records | L3 | 7 years después de termination | Secure deletion | Labor law requirements |
| System logs (security) | L3 | 1 year | Automated purge | SOC 2 requirements |
| System logs (access) | L3 | 90 days | Automated purge | Internal policy |
| Audit trails | L3 | 3 years | Secure deletion | SOC 2 requirements |
| Backups | L2 | 30 days | Overwrite cycle | Operational recovery |
| Marketing data | L2 | 2 years | Secure deletion | Internal policy |
| Aggregated analytics | L2 | 5 years | Secure deletion | Internal policy |
| Data lake raw files | L2 | 90 days | Automated lifecycle | Storage cost management |

### Retention Enforcement

| Mechanism | Data | Implementation | Verification |
|-----------|------|----------------|--------------|
| Automated S3 lifecycle | Data lake raw files | S3 lifecycle policy: transition a Glacier después de 30 days, delete después de 90 days | Monthly audit: `aws s3api list-objects` count vs. expected |
| Database purge job | System logs | Scheduled SQL job: `DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '90 days'` | Weekly check: row count de oldest records |
| Secure deletion script | Customer PII | `shred -vfz -n 3` para files, `DROP TABLE` para databases | Quarterly audit: verify no records older que retention period |
| Backup rotation | All backups | Automated backup rotation: daily backups kept 30 days | Monthly check: backup inventory |

## 3. Access Control

### Role-Based Access Control (RBAC)

| Role | Description | Data Access | Platform Access |
|------|-------------|-------------|-----------------|
| Data Consumer | Read aggregated data | L1, L2 (aggregated only) | BI tool (read-only) |
| Data Analyst | Query y analyze data | L1, L2, L3 (assigned datasets) | BI tool, query tool |
| Data Engineer | Build y maintain pipelines | L1, L2, L3, L4 (masked) | Airflow, dbt, S3, Redshift |
| Data Steward | Manage data classification | L1, L2, L3, L4 (assigned domains) | Governance tool, classification system |
| Data Scientist | Build ML models | L1, L2, L3 (assigned datasets) | ML platform, notebooks |
| DBA | Manage databases | L1, L2, L3, L4 (operational) | Database admin tools |
| Compliance Officer | Audit data access | Access logs only | Audit tool, governance dashboard |
| Data Platform Admin | Full platform access | All data (emergency only) | All systems, break-glass |

### Access Request Process

| Step | Action | Approver | SLA |
|------|--------|----------|-----|
| 1 | Submited access request | — | — |
| 2 | Manager approval | Direct manager | 2 business days |
| 3 | Data steward approval | Domain data steward | 3 business days |
| 4 | Provision access | IT/Platform team | 1 business day |
| 5 | Notify requester | — | Same day |
| 6 | Record en access log | Compliance team | 1 business day |

### Access Review Schedule

| Scope | Frequency | Reviewer | Action |
|-------|-----------|----------|--------|
| All data access | Quarterly | Data Steward | Remové unused access |
| L4 (Restricted) access | Monthly | Data Governance Lead | Verify need-to-know |
| Admin/break-glass access | Monthly | CISO | Audit usage |
| Departed employees | Immediate (on departure) | HR + IT | Revoké all access within 24h |

## 4. Privacy and Compliance

### GDPR Compliance

| Requirement | Implementation | Owner | Verification |
|-------------|----------------|-------|--------------|
| Right to access | Data subject request portal, 30-day response SLA | Privacy Team | Quarterly audit de request logs |
| Right to erasure | Automated deletion workflow, 30-day SLA | Data Engineering | Monthly test de deletion procedure |
| Right to portability | JSON export de all user data | Data Engineering | Quarterly test de export |
| Consent management | Consent management platform (CMP) | Product Team | Monthly audit de consent records |
| Data breach notification | 72-hour notification a authorities | Legal + Security | Annual breach response drill |
| Data processing records | Record of Processing Activities (ROPA) | Data Governance | Quarterly ROPA review |
| Data Protection Officer | Appointed DPO | Executive Committee | Annual DPO review |
| Privacy by design | Privacy review en design phase | Product + Legal | Privacy review en every feature PR |

### CCPA Compliance

| Requirement | Implementation | Owner | Verification |
|-------------|----------------|-------|--------------|
| Right to know | Data request portal, 45-day response SLA | Privacy Team | Quarterly audit |
| Right to delete | Same que GDPR erasure | Data Engineering | Monthly test |
| Right to opt-out | "Do Not Sell My Info" page | Product Team | Monthly check de opt-out mechanism |
| Non-discrimination | No service degradation para opt-out | Product Team | Quarterly review |

### Data Processing Records (ROPA)

| Field | Value |
|-------|-------|
| Processing Activity | Customer order processing |
| Data Controller | Example Corp |
| Data Processor | AWS (cloud infrastructure) |
| Purpose | Order fulfillment y analytics |
| Data Categories | Name, email, address, payment info |
| Data Subjects | Customers |
| Retention | 7 years (transaction records) |
| Legal Basis | Contract performance (GDPR Article 6(1)(b)) |
| Transfer Mechanism | SCCs (Standard Contractual Clauses) |
| Security Measures | Encryption at rest, encryption in transit, access control |

## 5. Data Security

### Encryption Requirements

| Classification | At Rest | In Transit | Key Management |
|---------------|---------|-----------|----------------|
| L1 (Public) | Optional | TLS 1.2+ | — |
| L2 (Internal) | AES-256 | TLS 1.2+ | AWS KMS |
| L3 (Confidential) | AES-256 | TLS 1.2+ | AWS KMS con rotation |
| L4 (Restricted) | AES-256 + field-level | TLS 1.3 | AWS KMS + HSM |

### Data Loss Prevention (DLP)

| Channel | DLP Rule | Action | Alert |
|---------|----------|--------|-------|
| Email | Blockeá L3/L4 data en attachments | Block + notify sender | Security team |
| Slack | Detectá L4 patterns (SSN, card numbers) | Alert + quarantine message | Security team |
| USB | Blockeá USB writes para L3/L4 | Block + log | Security team |
| Cloud upload | Detectá L4 data en uploads a unapproved services | Block + notify user | Security team |
| API responses | Maskeá L4 fields en non-production environments | Mask (e.g., ****1234) | — |

### Audit Logging

| Event | Log Fields | Retention | Alert |
|-------|-----------|-----------|-------|
| Data access (L3/L4) | User, timestamp, dataset, action, IP | 1 year | Unusual access patterns |
| Data modification (L3/L4) | User, timestamp, dataset, before/after values | 3 years | Unauthorized modifications |
| Access grant/revoke | Admin, target user, role, timestamp | 3 years | Privilege escalation |
| Export/download (L3/L4) | User, dataset, format, record count, timestamp | 1 year | Bulk exports |
| Failed access attempts | User, dataset, timestamp, IP | 90 days | Brute force patterns |

## 6. Data Quality and Lineage

### Data Lineage Requirements

| Requirement | Implementation | Owner |
|-------------|----------------|-------|
| Source-to-sink lineage | dbt model dependencies + Airflow DAG | Data Engineering |
| Column-level lineage | dbt column-level lineage | Data Engineering |
| Transformation documentation | Pipeline design documents | Data Engineering |
| Data freshness tracking | dbt freshness checks | Data Engineering |
| Lineage visualization | Data catalog tool (e.g., Amundsen, DataHub) | Data Platform |

### Data Quality Standards

| Standard | Target | Measurement | Owner |
|----------|--------|-------------|-------|
| Completeness | > 99.5% para required fields | Data quality rules (dbt tests) | Data Steward |
| Accuracy | > 99% para critical metrics | Reconciliation against source | Data Steward |
| Freshness | < 24 hours para production data | dbt freshness checks | Data Engineering |
| Consistency | 100% referential integrity | dbt relationship tests | Data Engineering |
| Uniqueness | 100% para primary keys | dbt unique tests | Data Engineering |

## 7. Incident Response

### Data Breach Response

| Step | Action | Responsible | SLA |
|------|--------|-------------|-----|
| 1 | Detectá y confirmá breach | Security Team | Immediate |
| 2 | Containé breach (revoke access, isolate systems) | Security + IT | 1 hour |
| 3 | Assessá scope y impact | Security + Data Governance | 4 hours |
| 4 | Notificá legal team | Security Team | 4 hours |
| 5 | Notificá authorities (GDPR: 72 hours) | Legal Team | 72 hours |
| 6 | Notificá affected individuals | Legal + Comms | Without undue delay |
| 7 | Documentá incident | Security Team | 24 hours |
| 8 | Post-incident review | All stakeholders | 2 weeks |
| 9 | Implementá corrective actions | Responsible teams | Per action plan |

### Incident Classification

| Severity | Description | Examples | Response |
|----------|-------------|----------|----------|
| Critical | L4 data exposed a unauthorized party | PII leak, payment data breach | Immediate, all steps |
| High | L3 data exposed o L4 access por unauthorized internal user | Financial data leak | Same day, all steps |
| Medium | L2 data exposed o policy violation | Internal docs shared externally | 2 business days |
| Low | Policy violation sin data exposure | Missing access log | 5 business days |
```

## Explanation

Un data governance policy es el foundation para manage data como un organizational asset. Define quién puede acceder a qué data, cuánto time data se keep y qué pasa cuando things van mal. El policy coverea five core areas: classification, retention, access control, privacy/compliance y security.

Data classification assigna un sensitivity level a cada data type. L1 (public) data no necesita protection. L4 (restricted) data necesita encryption, MFA, audit logging y DLP. Classification drivea all otros governance decisions: retention periods, access rules y security controls todos dependen del classification level.

Retention schedules definen cuánto time data se keep y cuándo se delete. Retention es driven por legal requirements (tax laws require 7 years de transaction records), compliance frameworks (GDPR require deletion cuando no longer needed) y operational needs (backups kept 30 days para recovery). Automated enforcement ensure que retention se aplica consistently — manual deletion es error-prone.

Access control usa RBAC para mapear roles a data access. El principle de least privilege aplica: users get access solo al data que necesitan para su role. Access reviews ensure que access stays current — people cambian roles y stale access es un common audit finding.

Privacy compliance coverea GDPR y CCPA requirements. Ambos frameworks dan a individuals rights over su data: access, deletion, portability. El policy define cómo estos rights se fulfill, quién es responsible y qué son los SLAs. Data processing records (ROPA) documentean qué data se procesa, por qué y en qué legal basis.

Security controls protegen data de unauthorized access. Encryption at rest y in transit es mandatory para L3 y L4 data. DLP previene data de leave el organization a través de email, chat o USB. Audit logging trackea quién accedió a qué data y cuándo.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Healthcare | Addeá HIPAA-specific rules | PHI handling, BAA agreements |
| Financial services | Addeá PCI-DSS y SOX rules | Payment data, financial reporting |
| Startup | Simplified policy, focus en PII | GDPR/CCPA compliance, minimal overhead |
| Enterprise | Full policy con data catalog | Amundsen/DataHub integration |
| Multi-region | Addeá data residency rules | EU data stays en EU, US data stays en US |
| ML/AI | Addeá model governance | Training data lineage, bias testing |

## What Works

1. Clasificá data antes de build systems — retroactive classification es painful
2. Automatizá retention enforcement — manual deletion es inconsistent
3. Revieweá access quarterly — stale access es el most common audit finding
4. Testeá breach response annually — untested plans failan cuando needed
5. Documentá data lineage — regulators y auditors piden it
6. Assigná clear ownership — cada dataset necesita un steward
7. Entrená all employees — governance es responsibility de everyone

## Common Mistakes

1. No classification system — everything se trata igual, que significa nothing se protege properly
2. Over-classification — marcar everything L4 crea unnecessary overhead
3. No retention enforcement — data accumula indefinitely, increaseando risk y cost
4. No access reviews — people retain access long después que lo necesitan
5. No breach response plan — organizations improvisan durante un crisis
6. Policy no communicated — un policy que nadie conoce es useless
7. No automation — manual governance processes no scalean

## Frequently Asked Questions

### ¿Cómo clasificamos existing data que nunca fue classified?

Empezá con un data inventory: listé all databases, tables y columns. Identificá PII fields (names, emails, addresses, phone numbers, payment data). Clasificalos como L4. Clasificá financial data como L3. Everything else empezá como L2. Refiná over time a medida que learnés más sobre cada dataset. Usá automated classification tools para scan por PII patterns.

### ¿Cuál es la difference entre un data controller y un data processor?

Bajo GDPR, un data controller determina los purposes y means de processing personal data. Un data processor procesa data on behalf del controller. Si usás AWS para store customer data, vos sos el controller y AWS es el processor. Controllers son responsible para compliance; processors tienen obligations bajo su contract con el controller.

### ¿Cuánto deberíamos retener data?

Retention es driven por legal requirements y business needs. Tax laws típicamente require 7 years de financial records. GDPR require deletion cuando data no es longer needed para el purpose que fue collected. Internal policies pueden set shorter retention para operational data. Cuando no legal requirement aplica, retené solo mientras el data provea business value.

### ¿Quién debería ser el Data Protection Officer?

Bajo GDPR, un DPO es required si procesás large amounts de special category data (health, biometric, genetic data) o monitoreás people systematically on a large scale. El DPO debería ser independent, reportar a senior management y tener expertise en data protection law. Puede ser internal o external, pero no debe tener conflict de interest.

### ¿Cómo handleamos data subject requests (DSR)?

Implementá un DSR portal dónde individuals pueden submitear access, deletion y portability requests. Verify identity antes de fulfill el request. Para access requests, compileá all data associated con el individual en un readable format. Para deletion requests, deleteá de all systems incluyendo backups. Trackeá SLA compliance (30 days para GDPR, 45 days para CCPA).
