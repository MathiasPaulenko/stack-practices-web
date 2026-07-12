---






contentType: docs
slug: access-control-review-template
title: "Access Control Review Template"
description: "A template for auditing user access rights, verifying least privilege, and documenting access decisions across systems and teams."
metaDescription: "Audit user access rights with this review template. Covers least privilege verification, role assignments, orphan accounts, and attestation records."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - access-control
  - audit
  - least-privilege
  - identity
  - compliance
relatedResources:
  - /docs/rbac-policy-template
  - /docs/user-access-audit-template
  - /docs/secret-rotation-schedule-template
  - /docs/vulnerability-scan-report-template
  - /docs/compliance-gap-analysis-template
  - /docs/data-breach-response-playbook
  - /docs/third-party-vendor-assessment-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Audit user access rights with this review template. Covers least privilege verification, role assignments, orphan accounts, and attestation records."
  keywords:
    - access control review
    - user access audit
    - least privilege
    - role attestation
    - identity review






---

## Overview

An Access Control Review Template provides a structured way to verify that users and service accounts have only the permissions required for their current role. It supports compliance frameworks such as SOC 2, ISO 27001, and PCI-DSS by documenting who has access, why they have it, and whether it is still justified.

## When to Use

- During quarterly or annual access reviews.
- Before an external audit or certification.
- After a role change, termination, or reorganization.
- When onboarding or offboarding a sensitive system.
- After detecting an account with excessive privileges.

## Prerequisites

- An authoritative list of systems, roles, and users.
- Access to identity provider logs or role management APIs.
- A defined policy for least privilege and role lifecycle.
- A reviewer who is a manager or system owner, not the user being reviewed.

## Solution

### Template

#### 1. Review Scope

| Field | Description | Example |
|-------|-------------|---------|
| System or application | Resource under review | Production database |
| Review period | Start and end date | Q2 2026 |
| Reviewer | Person accountable | Engineering manager |
| Review date | When the attestation is performed | 2026-06-27 |
| Sample size | Number of users reviewed | 42 |

#### 2. User Access Register

| User | Role | Permissions | Business Justification | Still Needed? | Reviewer Notes |
|------|------|-------------|------------------------|---------------|----------------|
| alice@example.com | db-admin | Read, write, schema | Database maintenance | Yes | Valid |
| bob@example.com | read-only | Read | Reporting | No | Account to be disabled |
| deploy-bot | service | Deploy to production | CI/CD pipeline | Yes | Managed by IAM role |

#### 3. Service Account Checklist

| Account | Purpose | Last Used | Key Rotated | Action Required |
|---------|---------|-----------|-------------|-----------------|
| backup-sa | Nightly backups | 2026-06-26 | Yes | None |
| integration-sa | Third-party sync | Never | No | Review or remove |
| monitoring-sa | Metrics ingestion | 2026-06-27 | Yes | None |

#### 4. Findings and Actions

| Finding ID | Description | Severity | Owner | Due Date | Status |
|------------|-------------|----------|-------|----------|--------|
| AC-01 | Two users with admin access never use it | Medium | IAM team | 2026-07-04 | Open |
| AC-02 | Orphan account from former contractor | High | Security | 2026-06-30 | Open |
| AC-03 | Missing MFA on three privileged accounts | High | Identity team | 2026-07-02 | Open |

#### 5. Attestation

| Field | Value |
|-------|-------|
| Reviewer name | Alice Rivera |
| Role | Engineering manager |
| Date | 2026-06-27 |
| Outcome | Approved with conditions |
| Conditions | Remove two orphan accounts and enforce MFA within 5 days |
| Next review date | 2026-09-27 |

## Explanation

The review separates identification of access from approval. By listing every account, its role, justification, and necessity, reviewers can spot privilege creep, orphan accounts, and missing MFA. The attestation step creates an audit trail that demonstrates compliance.

## Variants

- **Privileged access review**: Focuses only on administrators, root accounts, and break-glass credentials.
- **Application-level review**: Reviews roles and permissions inside a single application rather than infrastructure.
- **Cloud IAM review**: Targets AWS, Azure, or GCP roles, policies, and groups.
- **Contractor review**: Reviews time-bounded access and expiration dates.

## What Works

- Perform reviews quarterly for privileged access and annually for standard access.
- Use a manager or system owner as the reviewer, never the account holder.
- Automatically disable accounts that have been inactive for a defined period.
- Require MFA for all privileged accounts.
- Remove access before or on the employee's last day.
- Keep attestation records for at least one year or per compliance requirement.

## Common Mistakes

- Reviewing access without checking whether the account is still active.
- Allowing self-review of own permissions.
- Keeping broad access after a role change.
- Failing to review service accounts and API keys.
- Missing cloud console access when reviewing application roles.

## FAQs

### What is an orphan account?

An account that remains active after the owner has left the organization, changed roles, or stopped using the associated service. These accounts are high-risk and should be disabled or removed.

### Can access reviews be automated?

Yes. Identity governance tools can collect access data, trigger reminders, and route approvals. However, human attestation remains required for most compliance frameworks.

### What evidence is needed for an auditor?

A complete access register, reviewer decisions, remediation actions, and signed attestation with dates and reviewer names.

## Advanced Solutions

### Automated access review with AWS IAM Access Analyzer

Use AWS IAM Access Analyzer to detect unused permissions and generate findings for review:

```bash
#!/bin/bash
set -euo pipefail

# Generate access analyzer findings
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# List all IAM users and their last activity
echo "=== IAM Users Last Activity ==="
aws iam get-account-authorization-details --output json | \
  jq -r '.UserDetailList[] | {
    user: .UserName,
    groups: (.Groups | join(", ")),
    policies: (.AttachedManagedPolicies | map(.PolicyName) | join(", ")),
    last_used: .PasswordLastUsed
  }'

# Check for unused access keys
echo ""
echo "=== Unused Access Keys (>90 days) ==="
for user in $(aws iam list-users --query 'Users[].UserName' --output text); do
  aws iam list-access-keys --user-name "$user" --output json | \
    jq -r '.AccessKeyMetadata[] | select(.Status=="Active") | "\(.UserName) \(.AccessKeyId) \(.CreateDate)"'
done

# Generate unused permissions report
echo ""
echo "=== IAM Access Analyzer Findings ==="
aws accessanalyzer list-findings --analyzer-arn "$ANALYZER_ARN" --output json | \
  jq -r '.findings[] | select(.status=="ACTIVE") | {
    resource: .resource,
    finding: .findingType,
    principal: .principal
  }'
```

### GitHub organization access audit script

Audit GitHub organization members and their repository access with the GitHub API:

```python
#!/usr/bin/env python3
"""Audit GitHub org access and flag inactive members."""
import requests
import sys
from datetime import datetime, timedelta

ORG = "your-org"
TOKEN = sys.argv[1] if len(sys.argv) > 1 else ""
HEADERS = {"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github+json"}

def get_org_members() -> list:
    resp = requests.get(f"https://api.github.com/orgs/{ORG}/members", headers=HEADERS)
    return resp.json()

def get_user_activity(username: str) -> dict:
    resp = requests.get(
        f"https://api.github.com/users/{username}/events",
        headers=HEADERS,
        params={"per_page": 1},
    )
    events = resp.json()
    if events:
        last_event = datetime.strptime(events[0]["created_at"], "%Y-%m-%dT%H:%M:%SZ")
        days_inactive = (datetime.utcnow() - last_event).days
        return {"username": username, "last_active": events[0]["created_at"], "days_inactive": days_inactive}
    return {"username": username, "last_active": "never", "days_inactive": 999}

def audit_members() -> None:
    members = get_org_members()
    print(f"Total org members: {len(members)}\n")
    print(f"{'Username':<25} {'Last Active':<25} {'Days Inactive':<15} {'Status'}")
    print("-" * 80)

    threshold = 90
    for member in members:
        username = member["login"]
        activity = get_user_activity(username)
        status = "REVIEW" if activity["days_inactive"] > threshold else "OK"
        print(f"{username:<25} {activity['last_active']:<25} {activity['days_inactive']:<15} {status}")

if __name__ == "__main__":
    audit_members()
```

### Kubernetes RBAC audit with kubectl

Audit Kubernetes RBAC bindings and identify over-privileged subjects:

```bash
#!/bin/bash
set -euo pipefail

echo "=== ClusterRoleBindings with cluster-admin ==="
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name=="cluster-admin") | "\(.metadata.name) -> \(.subjects[].name // "unknown")"'

echo ""
echo "=== RoleBindings per namespace ==="
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  echo "--- Namespace: $ns ---"
  kubectl get rolebindings -n "$ns" -o json | \
    jq -r '.items[] | "\(.metadata.name): role=\(.roleRef.name) subjects=\([.subjects[].name] | join(", "))"'
done

echo ""
echo "=== Service accounts with secrets ==="
kubectl get serviceaccounts --all-namespaces -o json | \
  jq -r '.items[] | select(.secrets != null and (.secrets | length > 0)) | "\(.metadata.namespace)/\(.metadata.name)"'
```

## Additional Best Practices


- For a deeper guide, see [Compliance Gap Analysis Template](/docs/compliance-gap-analysis-template/).

1. **Implement just-in-time access for privileged operations.** Instead of granting permanent admin access, use just-in-time elevation with approval and time limits. This reduces the attack surface and creates an auditable trail:

```yaml
# Teleport role: temporary admin access with approval
kind: role
metadata:
  name: jit-admin
spec:
  allow:
    node_labels: "*"
    max_session_ttl: 4h
    require_session_join: true
```

2. **Use access review dashboards for continuous visibility.** Build a dashboard that shows access metrics in real time, such as number of privileged accounts, inactive accounts, and MFA coverage:

```sql
-- Query: privileged accounts without MFA
SELECT u.username, u.role, u.last_login
FROM users u
LEFT JOIN mfa_enrollments m ON u.id = m.user_id
WHERE u.role IN ('admin', 'operator') AND m.id IS NULL
ORDER BY u.last_login DESC;
```

## Additional Common Mistakes

1. **Not reviewing service accounts and machine identities.** Service accounts often accumulate permissions over time and are rarely reviewed. Include them in every access review cycle and verify their last usage:

```bash
# Check last used date for AWS access keys
aws iam list-access-keys --user-name deploy-bot --query 'AccessKeyMetadata[].{Key:AccessKeyId, LastUsed:CreateDate, Status:Status}' --output table
```

2. **Relying on manual spreadsheets for access reviews.** Spreadsheets are error-prone and quickly outdated. Use identity governance tools or scripts that pull live data from your identity provider:

```bash
# Export live access data instead of maintaining spreadsheets
aws iam get-account-authorization-details --output json > access-snapshot-$(date +%Y%m%d).json
```

## Additional Frequently Asked Questions

### How do I handle access reviews for contractors and temporary staff?

Set expiration dates on all contractor accounts at provisioning time. Use time-bound role assignments that auto-expire. Send reminders to the sponsor manager 7 days before expiration. Require re-approval for extension. Never grant permanent access to non-employees.

### What is the difference between attestation and certification in access reviews?

Attestation is the act of a reviewer confirming that access is appropriate. Certification is a formal, auditable process where the reviewer signs off on the entire access list, often with legal or compliance significance. Most compliance frameworks require certification, not just attestation.
