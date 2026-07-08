---
contentType: docs
slug: compliance-gap-analysis-template
title: "Compliance Gap Analysis Template"
description: "A template for mapping current security controls to compliance frameworks like SOC 2, ISO 27001, and PCI-DSS."
metaDescription: "Map security controls to compliance frameworks with this gap analysis template. Covers requirements, evidence, gaps, and remediation plans."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - compliance
  - gap-analysis
  - soc2
  - iso27001
  - audit
relatedResources:
  - /docs/devops/access-control-review-template
  - /docs/devops/rbac-policy-template
  - /docs/devops/network-segmentation-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Map security controls to compliance frameworks with this gap analysis template. Covers requirements, evidence, gaps, and remediation plans."
  keywords:
    - compliance gap analysis
    - soc2 gap analysis
    - iso 27001 gap analysis
    - audit readiness
    - control mapping
---

## Overview

A Compliance Gap Analysis compares your current security controls against the requirements of a target framework, such as SOC 2, ISO 27001, PCI-DSS, or GDPR. This template captures the requirement, the control that satisfies it, the evidence you have, any missing pieces, and a plan to close the gaps. It is a standard input for audit readiness and certification roadmaps.

## When to Use

- Preparing for a first-time audit or certification.
- Renewing a certification and identifying changes since the last audit.
- Merging companies or integrating new business units.
- After a major change in architecture, processes, or vendors.
- Building a security roadmap tied to compliance obligations.

## Prerequisites

- The target framework and version, such as SOC 2 Trust Services Criteria 2017.
- An inventory of security policies, controls, and processes.
- Access to evidence repositories, ticket systems, and cloud consoles.
- A cross-functional team from security, engineering, legal, and HR.

## Solution

### Template

#### 1. Engagement Overview

| Field | Description | Value |
|-------|-------------|-------|
| Framework | Target compliance standard | SOC 2 Type II |
| Version | Specific version or criteria | Trust Services Criteria 2017 |
| Scope | Systems, teams, or locations covered | Production cloud environment |
| Assessment date | When the gap analysis was performed | 2026-06-27 |
| Owner | Person responsible for the analysis | Compliance manager |
| Target audit date | Planned certification or audit | 2027-03-31 |

#### 2. Control Mapping

| Requirement ID | Control Objective | Current Control | Evidence | Status | Gap | Owner | Due Date |
|----------------|-------------------|-----------------|----------|--------|-----|-------|----------|
| CC6.1 | Logical access | RBAC policy enforced | RBAC policy doc, IAM config | Partial | MFA not enforced for all admin roles | IAM team | 2026-08-15 |
| CC6.6 | System monitoring | Logs centralized in SIEM | SIEM dashboard, retention policy | Met | None | Security team | N/A |
| CC7.1 | Vulnerability management | Quarterly scans | Scanner report | Partial | No SLA for remediation | Vuln management team | 2026-09-01 |
| A.12.3.1 | Information backup | Backup policy exists | Backup policy, restore test | Met | None | DevOps team | N/A |
| A.9.2.3 | Access rights | Access review process | Quarterly access reviews | Partial | Reviews not documented | Engineering managers | 2026-07-30 |

#### 3. Gap Summary

| Category | Total | Met | Partial | Not Met | Risk |
|----------|-------|-----|---------|---------|------|
| Access control | 12 | 7 | 4 | 1 | High |
| Monitoring | 8 | 6 | 2 | 0 | Medium |
| Change management | 6 | 3 | 2 | 1 | High |
| Vendor management | 5 | 2 | 2 | 1 | Medium |
| Incident response | 7 | 5 | 1 | 1 | High |
| Overall | 38 | 23 | 11 | 4 | High |

#### 4. Remediation Plan

| Gap ID | Description | Action | Owner | Due Date | Priority | Evidence Needed |
|--------|-------------|--------|-------|----------|----------|-----------------|
| GAP-01 | MFA missing for admin roles | Enforce MFA on all privileged accounts | IAM team | 2026-08-15 | High | MFA enrollment report |
| GAP-02 | No vulnerability remediation SLA | Define and approve SLA by severity | Security team | 2026-09-01 | High | SLA document |
| GAP-03 | Access reviews not documented | Use quarterly access review template | Engineering managers | 2026-07-30 | Medium | Signed attestations |
| GAP-04 | No formal vendor assessment | Adopt vendor assessment template | Procurement | 2026-10-01 | Medium | Completed assessments |

#### 5. Evidence Tracking

| Requirement ID | Evidence Location | Last Updated | Reviewer | Notes |
|----------------|-------------------|--------------|----------|-------|
| CC6.1 | /policies/rbac-policy | 2026-06-01 | Security lead | Approved and published |
| CC6.6 | /siem/retention-config | 2026-05-15 | SOC analyst | 12-month retention confirmed |
| A.12.3.1 | /runbooks/backup-restore-test | 2026-06-20 | DevOps lead | Quarterly restore test passed |

## Explanation

Gap analysis turns compliance from a vague checklist into a useful project. By mapping each requirement to a control, evidence, and status, you can prioritize work based on risk and audit timeline. The remediation plan becomes the roadmap that drives engineering, security, and legal tasks toward certification.

## Variants

- **SOC 2 readiness assessment**: Focused on Trust Services Criteria with common controls and evidence.
- **ISO 27001 gap analysis**: Mapped to Annex A controls and risk treatment plans.
- **PCI-DSS gap analysis**: Centered on cardholder data environment, encryption, and access.
- **GDPR compliance mapping**: Tracks data subject rights, processing records, and consent.
- **Multi-framework mapping**: A unified matrix showing coverage across SOC 2, ISO 27001, and PCI-DSS.

## What Works

- Use the official framework version to avoid outdated requirements.
- Involve control owners, not just the compliance team, in the assessment.
- Collect evidence during the analysis, not after.
- Rate gaps by risk and audit readiness, not just by volume.
- Track remediation like a project with owners, dates, and deliverables.
- Re-run the analysis quarterly or after major changes.
- Maintain a single source of truth for evidence locations.

## Common Mistakes

- Treating compliance as a one-time project instead of a continuous program.
- Mapping controls to requirements without reviewing actual evidence.
- Assigning remediation to teams without capacity or authority.
- Using outdated framework versions.
- Over-documenting trivial controls while missing critical gaps.
- Not linking gap analysis to incident history or risk assessments.

## FAQs

### How long does a gap analysis take?

A focused framework assessment for one standard typically takes 2 to 4 weeks, depending on scope, maturity, and evidence availability. Multi-framework mappings take longer.

### Who should own the gap analysis?

A compliance or risk manager usually owns the document, but each requirement must have a control owner who validates the evidence and commits to remediation.

### What counts as evidence?

Policies, configuration screenshots, audit logs, ticket records, signed attestations, training completion records, test results, and third-party reports. Evidence must be dated and attributable.

## Advanced Solutions

### Automated evidence collection with AWS Config

Automate evidence gathering for SOC 2 and ISO 27001 using AWS Config rules:

```bash
#!/bin/bash
set -euo pipefail

# Export AWS Config compliance data for audit evidence
aws configservice select-aggregate-resource-config \
  --configuration-aggregator-name "OrganizationConfigAggregator" \
  --expression '
    SELECT
      resourceId,
      resourceType,
      configurationItemStatus,
      configuration,
      tags
    WHERE
      resourceType = "AWS::Config::ConfigRule"
      AND configurationItemStatus = "OK"
  ' \
  --limit 100 > config-compliance-evidence.json

# Generate MFA enforcement evidence for CC6.1
aws iam get-account-summary > iam-account-summary.json
aws iam list-virtual-mfa-devices > mfa-devices.json

# Check root account MFA status
ROOT_MFA=$(aws iam get-account-summary --query 'SummaryMap.AccountMFAEnabled' --output text)
echo "Root MFA enabled: $ROOT_MFA" >> mfa-evidence.txt

# Generate S3 bucket encryption evidence for CC6.7
aws s3api list-buckets --query 'Buckets[].Name' --output text | \
  tr '\t' '\n' | \
  while read bucket; do
    ENC=$(aws s3api get-bucket-encryption --bucket "$bucket" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>/dev/null || echo "None")
    echo "$bucket: $ENC" >> s3-encryption-evidence.txt
  done

# Generate CloudTrail logging evidence for CC7.2
aws cloudtrail describe-trails --query 'trailList[].{Name:Name,IsLogging:IsLogging,S3Bucket:S3BucketName}' --output table > cloudtrail-evidence.txt
```

### Multi-framework control mapping matrix

Create a unified mapping across SOC 2, ISO 27001, and PCI-DSS to avoid duplicate work:

```python
import json
from pathlib import Path

FRAMEWORK_MAPPING = {
    "MFA enforcement": {
        "soc2": "CC6.1",
        "iso27001": "A.9.4.2",
        "pci": "8.3.1",
        "control": "Multi-factor authentication for all privileged accounts",
        "evidence": ["IAM MFA config", "Enrollment report", "Root MFA status"],
    },
    "Encryption at rest": {
        "soc2": "CC6.7",
        "iso27001": "A.10.1.1",
        "pci": "3.4",
        "control": "AES-256 encryption for all data stores",
        "evidence": ["KMS key policy", "S3 encryption config", "RDS encryption status"],
    },
    "Centralized logging": {
        "soc2": "CC7.2",
        "iso27001": "A.12.4.1",
        "pci": "10.1",
        "control": "All systems forward logs to centralized SIEM",
        "evidence": ["SIEM ingestion config", "Log source inventory", "Retention policy"],
    },
    "Vulnerability scanning": {
        "soc2": "CC7.1",
        "iso27001": "A.12.6.1",
        "pci": "11.2",
        "control": "Quarterly vulnerability scans with remediation SLA",
        "evidence": ["Scanner reports", "Remediation tickets", "SLA document"],
    },
    "Access reviews": {
        "soc2": "CC6.3",
        "iso27001": "A.9.2.5",
        "pci": "8.2.4",
        "control": "Quarterly access reviews with documented attestation",
        "evidence": ["Review records", "Manager sign-off", "Removal tickets"],
    },
}

def generate_mapping_report(mapping: dict) -> str:
    lines = []
    lines.append("| Control | SOC 2 | ISO 27001 | PCI-DSS | Evidence |")
    lines.append("|---------|-------|-----------|---------|----------|")
    for name, data in mapping.items():
        evidence = ", ".join(data["evidence"])
        lines.append(
            f"| {name} | {data['soc2']} | {data['iso27001']} | "
            f"{data['pci']} | {evidence} |"
        )
    return "\n".join(lines)

report = generate_mapping_report(FRAMEWORK_MAPPING)
Path("multi-framework-mapping.md").write_text(report)
print(report)
```

### Continuous compliance monitoring with OPA

Use Open Policy Agent (OPA) to continuously verify compliance controls in Kubernetes:

```yaml
# OPA Gatekeeper policy: Enforce MFA-required labels on all deployments
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels

        violation[{"msg": msg, "details": {"missing_labels": missing}}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-compliance-labels
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels: ["compliance-scan", "data-classification", "owner-team"]
```

## Additional Best Practices

1. **Use a compliance-as-code approach.** Define controls as code (OPA policies, AWS Config rules, Terraform Sentinel policies) so compliance is continuously verified, not just assessed annually:

```hcl
# Sentinel policy for Terraform: Enforce encryption on all S3 buckets
import "tfplan"

main = rule when tfplan.resource_changes is not empty {
  all tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" implies
    rc.change.after.server_side_encryption_configuration is not null
  }
}
```

2. **Maintain a living evidence repository.** Store all evidence in a versioned repository with automated updates. This eliminates the last-minute evidence scramble before audits:

```bash
#!/bin/bash
set -euo pipefail

EVIDENCE_DIR="compliance-evidence/$(date +%Y-%m)"
mkdir -p "$EVIDENCE_DIR"

# Auto-collect monthly evidence snapshots
aws configservice get-discovery-summary > "$EVIDENCE_DIR/config-summary.json"
kubectl get compliance-scores -A -o json > "$EVIDENCE_DIR/k8s-compliance.json"
npm audit --json > "$EVIDENCE_DIR/npm-audit.json"
trivy image --format json myapp:latest > "$EVIDENCE_DIR/trivy-scan.json"

git add "$EVIDENCE_DIR"
git commit -m "compliance: monthly evidence snapshot $(date +%Y-%m)"
```

## Additional Common Mistakes

1. **Not mapping controls across multiple frameworks.** If you pursue SOC 2 and ISO 27001 separately, you duplicate work. Map controls once and reuse evidence:

```bash
# Generate cross-framework coverage report
node -e "
const mapping = require('./control-mapping.json');
let covered = 0, total = 0;
for (const [control, frameworks] of Object.entries(mapping)) {
  total++;
  if (frameworks.soc2 && frameworks.iso27001) covered++;
}
console.log('Cross-framework coverage: ' + covered + '/' + total);
"
```

2. **Relying on screenshots as primary evidence.** Screenshots are point-in-time and can be staged. Use automated exports, API outputs, and configuration dumps as primary evidence. Screenshots are supplementary only.

## Additional Frequently Asked Questions

### How do I prioritize which gaps to fix first?

Prioritize by risk score (impact x likelihood), audit deadline, and dependency chain. Gaps that block multiple requirements should be fixed first. For example, implementing centralized logging satisfies CC7.2 (SOC 2), A.12.4.1 (ISO 27001), and 10.1 (PCI-DSS) simultaneously.

### Can I use one gap analysis for multiple frameworks?

Yes. Create a unified control mapping where each control maps to multiple framework requirements. This reduces audit prep time by 40-60% because you collect evidence once and reference it across frameworks.
