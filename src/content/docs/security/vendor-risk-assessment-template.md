---
contentType: docs
slug: vendor-risk-assessment-template
title: "Vendor Risk Assessment Template"
description: "A template for evaluating third-party vendor security and operational risks."
metaDescription: "Use this vendor risk assessment template to evaluate third-party vendor security, compliance, and operational risks before onboarding."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - vendor
  - risk
  - assessment
  - compliance
  - template
relatedResources:
  - /docs/incident-response-playbook-template
  - /docs/data-retention-policy-template
  - /docs/api-security-review-template
  - /docs/security-audit-checklist-template
  - /docs/dependency-audit-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this vendor risk assessment template to evaluate third-party vendor security, compliance, and operational risks before onboarding."
  keywords:
    - security
    - vendor
    - risk
    - assessment
    - compliance
    - template
---
## Overview

Third-party vendors process your data, integrate with your APIs, and often have privileged access to your systems. A vendor breach becomes your breach. Most security questionnaires are ignored after onboarding. This template structures a repeatable risk assessment that evaluates vendors before contract signing, during annual reviews, and after any security incident involving the vendor.

## When to Use

Use this resource when:
- Onboarding a new SaaS provider, cloud vendor, or outsourced development team
- Conducting an annual security review of existing vendors
- A vendor discloses a breach or changes their security posture

## Solution

```markdown
# Vendor Risk Assessment: `<Vendor Name>`

## 1. Vendor Metadata

| Field | Value |
|-------|-------|
| Vendor Name | `name` |
| Service Provided | `description` |
| Data Access Level | `None / Read / Write / Admin` |
| Data Types Handled | `PII / PHI / Financial / Confidential / Public` |
| Contract Value | `$X / year` |
| Criticality Rating | `Low / Medium / High / Critical` |
| Assessment Date | `YYYY-MM-DD` |
| Assessor | `@security-team` |
| Next Review Date | `YYYY-MM-DD` |

## 2. Security Controls

| Control Category | Vendor Claim | Evidence Requested | Verified | Risk |
|------------------|--------------|-------------------|----------|------|
| SOC 2 Type II | Yes / No | Report (last 12 months) | | |
| ISO 27001 | Yes / No | Certificate | | |
| GDPR / CCPA Compliance | Yes / No | DPA + privacy policy | | |
| Encryption at Rest | Yes / No | Architecture doc / screenshot | | |
| Encryption in Transit (TLS 1.2+) | Yes / No | SSL Labs scan | | |
| MFA for Admin Access | Yes / No | Configuration screenshot | | |
| Penetration Test (annual) | Yes / No | Report summary (redacted) | | |
| Incident Response Plan | Yes / No | Document + SLAs | | |
| Sub-processors Published | Yes / No | Sub-processor list | | |

## 3. Operational Risk

| Factor | Rating | Justification | Mitigation |
|--------|--------|---------------|------------|
| Financial stability | `Low / Med / High` | | |
| Geographic / political risk | `Low / Med / High` | | |
| Concentration risk (sole provider) | `Low / Med / High` | | |
| Integration complexity | `Low / Med / High` | | |
| Exit difficulty (data portability) | `Low / Med / High` | | |

## 4. Data Handling Assessment

| Question | Vendor Response | Satisfactory |
|----------|----------------|--------------|
| Where is data stored? | `Region / country` | Yes / No |
| Who can access our data? | `Role / process` | Yes / No |
| Is data commingled with other customers? | `Yes / No / Multi-tenant` | Yes / No |
| Data retention after contract end? | `Days / policy` | Yes / No |
| Can we request deletion? | `Process / SLA` | Yes / No |
| Backup frequency and retention? | `Frequency / retention` | Yes / No |

## 5. Risk Score

| Category | Weight | Raw Score (1-5) | Weighted Score |
|----------|--------|-----------------|----------------|
| Security posture | 30% | | |
| Compliance | 25% | | |
| Operational resilience | 20% | | |
| Data protection | 25% | | |
| **Total** | **100%** | | |

### Score Interpretation

| Range | Rating | Action |
|-------|--------|--------|
| 4.0 – 5.0 | Low Risk | Standard contract; annual review |
| 3.0 – 3.9 | Medium Risk | Require remediation plan; 6-month review |
| 2.0 – 2.9 | High Risk | Security improvements required before onboarding |
| 1.0 – 1.9 | Critical Risk | Do not onboard without CISO approval + external audit |

## 6. Remediation Plan (if applicable)

| Gap | Required Action | Owner | Due Date | Status |
|-----|----------------|-------|----------|--------|
| | | | | |
```

## Explanation

The template treats vendor assessment as a **structured, evidence-based process**, not a checkbox exercise. Each control requires **evidence**, not just a "yes." The risk scoring forces trade-offs: a cheap vendor with poor encryption may be acceptable for public marketing data but never for health records. The data handling section is particularly critical because vendors often commingle customer data in multi-tenant architectures, making deletion and breach containment harder.

## Vendor Risk Assessment Process

```text
=== Vendor Evaluation Flow ===

1. IDENTIFICATION
   - Team identifies need for a new vendor/SaaS
   - Completes assessment request with use case and data to share
   - Security team receives request and assigns evaluator

2. INITIAL QUESTIONNAIRE
   - Send security questionnaire to vendor (SOC 2, ISO 27001, etc.)
   - Request: certifications, security policies, audit reports
   - Review: status page, incident history, breach notification policy
   - Response deadline: 2 weeks

3. TECHNICAL ASSESSMENT
   - Review authentication methods (SSO, MFA, SAML)
   - Review encryption (in transit and at rest)
   - Review access management (RBAC, least privilege)
   - Review data retention and deletion
   - Review data location (residency, processing)
   - Review sub-processors (does the vendor use other vendors?)

4. COMPLIANCE ASSESSMENT
   - Map regulatory requirements (GDPR, CCPA, HIPAA, SOC 2)
   - Review DPA (Data Processing Agreement)
   - Verify breach notification clauses (72 hours for GDPR)
   - Verify audit rights and right to inspection

5. DECISION
   - Risk score calculated: Critical / High / Medium / Low
   - Approval: security team + legal + engineering leadership
   - If High/Critical: requires mitigations before approval
   - Document decision and approval conditions

6. CONTINUOUS MONITORING
   - Review vendor annually
   - Subscribe to vendor incident notifications
   - Review sub-processor changes
   - Reassess if vendor changes security posture
```


## Variants

| Context | Focus | Additional Checks |
|---------|-------|-------------------|
| Cloud infrastructure (IaaS) | Shared responsibility model | Verify where provider responsibility ends and yours begins |
| SaaS with API integration | OAuth / token security | Review scopes, token rotation, and webhook signing |
| Outsourced development | Source code access | NDA, background checks, secure development practices |
| Payment processor | PCI DSS | Require AoC (Attestation of Compliance) and SAQ |
| AI / ML vendor | Model training data | Verify your data is not used to train models unless explicitly agreed |

## What Works

1. Assess vendors **before** contract signature, not after onboarding
2. Require a Data Processing Agreement (DPA) for any vendor touching PII
3. Review sub-processors annually; a vendor's vendor is still your risk
4. Maintain an offboarding checklist that includes data deletion verification
5. Document the rationale for any accepted risk; auditors will ask for it

## Common Mistakes

1. Accepting a vendor's security questionnaire without requesting evidence
2. Treating all vendors the same regardless of data sensitivity or access level
3. Not re-assessing vendors after a breach or acquisition
4. Ignoring sub-processors; many breaches happen at the fourth-party level
5. Having no exit plan; vendors know migration costs keep you locked in

## Frequently Asked Questions

### How do I assess a startup that has no SOC 2 yet?

Request their security roadmap and interim controls. Review their architecture for encryption, access control, and logging. Conduct a lightweight technical assessment (architecture review + penetration test of the integration). Accept higher risk only if the vendor is critical and no mature alternative exists. Require SOC 2 Type I within 12 months as a contract clause.

### What is a Data Processing Agreement and when do I need one?

A DPA is a legal contract that defines how a vendor (processor) handles your data under GDPR / CCPA. You need one whenever a vendor processes personal data on your behalf. The DPA should cover data categories, processing purposes, sub-processors, security measures, breach notification SLAs, and deletion requirements.

### How often should I re-assess vendors?

Annually for all vendors. Semi-annually for high-risk or critical vendors. Immediately after any security incident, acquisition, or major product change by the vendor. Do not let assessments expire; set calendar reminders tied to the contract renewal cycle.


### How do we handle vendors already in use without assessment?

For existing vendors without assessment: prioritize by risk — vendors with access to Restricted or Confidential data first. Conduct a retroactive assessment using the same process. If the assessment reveals unacceptable risks: implement mitigations (restrict data access, add monitoring, renegotiate contract terms). If risk is not mitigable: consider migrating to an alternative vendor. Document the assessment gap and remediation plan. Set a deadline for completing all retroactive assessments. Use this as a case study to justify the mandatory assessment process before onboarding.

### What do we do if a vendor suffers a data breach?

If a vendor suffers a breach: activate the incident response plan. Identify what data of yours was at the vendor. Assess impact: customer data exposed? credentials compromised? intellectual property leaked? Notify your customers if their data was exposed (GDPR requires notification within 72 hours). Rotate any credentials shared with the vendor. Review contract terms for notification and compensation obligations. Document the incident and conduct a postmortem. Reassess the vendor relationship — a breach may be an isolated incident or a pattern of poor security. If the vendor did not notify within the contractual timeframe, consider contract termination.

### How do we evaluate cloud infrastructure vendors (AWS, GCP, Azure)?

Cloud providers are high-risk vendors due to data volume and operational dependency. To evaluate: review their certifications (SOC 2 Type II, ISO 27001, FedRAMP). Review the shared responsibility model — what is the provider's responsibility vs. yours. Configure cloud security posture management (CSPM) for continuous monitoring. Review the provider's incident history and transparency in postmortems. Evaluate data regions and residency options. For compliance: verify the provider supports your regulatory requirements (GDPR, HIPAA, PCI DSS). Major cloud providers have extensive public assessments — use them but do not take them as gospel.

### How do we handle vendor sub-processors?

A sub-processor is a vendor that your vendor uses to process data. To manage: require the vendor to disclose all sub-processors. Review the vendor's contract — it must require sub-processors to meet the same security standards. Verify the DPA covers sub-processors. Subscribe to sub-processor change notifications — you have the right to object. For Restricted data: verify each sub-processor's security posture. Document the data processing chain. If a sub-processor changes, reassess the risk. The sub-processor chain is often the weakest link in the security posture.

### How often should we reassess vendors?

Reassess vendors: annually for vendors with access to Restricted or Confidential data. Biannually for vendors with access to Internal data. Triennially for vendors with access only to Public data. Out-of-cycle reassessment when: the vendor suffers a breach, changes sub-processors, changes terms of service, or changes security posture (e.g., loses a certification). Document each reassessment. If a vendor degrades their security posture: implement mitigations or consider contract termination. A reassessment is not a rubber stamp — it is a genuine evaluation of whether the vendor still meets your standards.




































































End of document. Review and update quarterly.