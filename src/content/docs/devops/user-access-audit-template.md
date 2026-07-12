---



contentType: docs
slug: user-access-audit-template
title: "User Access Audit Template"
description: "A template for reviewing and certifying user access rights across systems, applications, and data repositories."
metaDescription: "Review and certify user access with this audit template. Covers identity inventory, role mapping, certifications, orphan accounts, and remediation."
difficulty: beginner
topics:
  - security
  - devops
tags:
  - access-audit
  - user-access-review
  - identity-governance
  - rbac
  - compliance
relatedResources:
  - /docs/rbac-policy-template
  - /docs/access-control-review-template
  - /docs/secret-rotation-schedule-template
  - /docs/data-retention-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Review and certify user access with this audit template. Covers identity inventory, role mapping, certifications, orphan accounts, and remediation."
  keywords:
    - user access audit
    - access certification
    - identity governance
    - orphan account
    - access review template



---

## Overview

A user access audit verifies that every user has the right level of access to systems, applications, and data. It is a core control for identity governance, least privilege, and compliance with standards like SOC 2, ISO 27001, and PCI-DSS. This template provides a structured way to collect access data, review permissions, certify access, and remediate findings.

## When to Use

- Performing quarterly or annual access reviews.
- Preparing for a compliance audit or certification.
- After a role change, reorganization, or merger.
- When privileged access is suspected to be excessive.
- After offboarding a user or removing a contractor.

## Prerequisites

- An identity source such as an SSO provider or identity management system.
- A list of applications, systems, and data repositories under review.
- Owners or managers for each application who can certify access.
- A defined access review schedule and escalation process.

## Solution

### Template

#### 1. Audit Scope

| Scope Item | Description |
|------------|-------------|
| Period | 2026-Q2 |
| Systems reviewed | AWS, GitHub, Jira, Confluence, Slack, VPN, Google Workspace |
| Population | Employees, contractors, service accounts, privileged admin roles |
| Reviewers | Application owners, managers, security team |
| Due date | 2026-07-15 |
| Exceptions allowed | Yes, with risk acceptance and expiration |

#### 2. Identity Inventory

| User ID | Name | Type | Department | Status | Last Reviewed |
|---------|------|------|------------|--------|---------------|
| `alice@example.com` | Alice Chen | Employee | Engineering | Active | 2026-03-31 |
| `bob@example.com` | Bob Smith | Contractor | Finance | Active | 2026-03-31 |
| svc-api-prod | API Service | Service account | Platform | Active | 2026-05-15 |
| `carol@example.com` | Carol Jones | Employee | Marketing | Inactive | 2026-01-31 |

#### 3. Access Mapping

| User | System | Role / Permission | Business Justification | Reviewer | Decision |
|------|--------|-------------------|--------------------------|----------|----------|
| `alice@example.com` | AWS | PowerUser | Manages infrastructure | Platform lead | Keep |
| `bob@example.com` | GitHub | Read | Reviews pull requests | Engineering manager | Keep |
| `alice@example.com` | Jira | Admin | Configures workflows | IT lead | Revoke |
| svc-api-prod | AWS | S3 read-only | Application reads reports | Platform lead | Keep |
| `carol@example.com` | Slack | Member | Left company | HR | Revoke |

#### 4. Privileged Access Review

| User | System | Privileged Role | Justification | Risk | Reviewer | Decision |
|------|--------|-----------------|---------------|------|----------|----------|
| `alice@example.com` | AWS | Root access | Emergency break-glass | High | CISO | Keep with MFA |
| `dave@example.com` | GitHub | Organization owner | Manages repositories | High | CTO | Keep |
| `eve@example.com` | VPN | Full tunnel | Remote admin access | High | Security lead | Revoke |

#### 5. Certification Log

| Application | Reviewer | Status | Date | Notes |
|-------------|----------|--------|------|-------|
| AWS | Platform lead | Certified | 2026-07-10 | 2 revocations pending |
| GitHub | CTO | Certified | 2026-07-08 | 1 orphan account removed |
| Jira | IT lead | In progress | 2026-07-05 | Admin role under review |
| Slack | HR | Certified | 2026-07-09 | 3 inactive accounts revoked |

#### 6. Remediation Plan

| Finding | Action | Owner | Due Date | Status |
|---------|--------|-------|----------|--------|
| Excessive admin rights in Jira | Downgrade to user | IT lead | 2026-07-20 | Open |
| Inactive Slack account | Deactivate | HR | 2026-07-12 | Done |
| Orphaned service account | Investigate and disable | Platform team | 2026-07-18 | Open |
| Missing MFA on privileged users | Enforce MFA | IAM team | 2026-07-15 | In progress |

## Explanation

The template connects identities to permissions, business justification, and accountable reviewers. Without this structure, organizations accumulate stale accounts and over-privileged users, increasing both insider risk and external attack surface. Regular access reviews are required by most security frameworks and are a practical way to enforce least privilege.

## Variants

- **Application-specific access review**: Focuses on one system, such as AWS IAM or GitHub organization access.
- **Privileged access review**: Only reviews admin, root, or emergency access accounts.
- **Service account audit**: Reviews non-human identities and their API keys or credentials.
- **Contractor access review**: Time-bound review for external users with temporary access.
- **Data access audit**: Focuses on users who can access sensitive databases, data lakes, or analytics tools.

## What Works

- Automate identity collection from the SSO or identity provider.
- Send reminders to reviewers before the due date.
- Require business justification for every privileged role.
- Revoke access immediately when a user changes role or leaves.
- Schedule quarterly reviews for privileged access and annual reviews for general access.
- Document risk acceptance for necessary exceptions.
- Track remediation until every finding is closed.

## Common Mistakes

- Reviewing access only once a year without follow-up.
- Letting managers keep access for employees who changed roles.
- Ignoring service accounts and shared credentials.
- Skipping privileged access or emergency break-glass accounts.
- Not linking access decisions to business justification.
- Failing to verify that revocations actually happened.
- Storing review evidence in scattered emails or documents.

## FAQs

### Who should certify access?

The system owner or the user's direct manager is the best reviewer. For sensitive systems, the security team or data owner may also approve.

### What is an orphan account?

An orphan account is an active account no longer associated with a known user or owner, often after offboarding or team changes. These should be disabled or reclaimed.

### How do we make access reviews less tedious?

Use identity governance tools that pull access data automatically, provide reviewer-friendly dashboards, and auto-revoke low-risk inactive accounts after approval.

## Advanced Solutions

### Automated access review with Okta API

Pull user access data from Okta and generate a review report automatically:

```python
import requests
import csv
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List

@dataclass
class UserAccessRecord:
    user_id: str
    user_name: str
    status: str
    last_login: str
    assigned_apps: List[str]
    admin_roles: List[str]

class OktaAccessReviewer:
    def __init__(self, api_token: str, domain: str):
        self.headers = {
            "Authorization": f"SSWS {api_token}",
            "Accept": "application/json",
        }
        self.base_url = f"https://{domain}/api/v1"

    def get_inactive_users(self, days: int = 90) -> List[dict]:
        """Find users who haven't logged in within the specified period."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
        users = []
        params = {"filter": f'status eq "ACTIVE"'}
        resp = requests.get(
            f"{self.base_url}/users",
            headers=self.headers,
            params=params,
        )
        for user in resp.json():
            last_login = user.get("lastLogin")
            if last_login and last_login < cutoff:
                users.append({
                    "id": user["id"],
                    "email": user["profile"]["email"],
                    "last_login": last_login,
                    "status": user["status"],
                })
        return users

    def get_user_apps(self, user_id: str) -> List[str]:
        """Get applications assigned to a user."""
        resp = requests.get(
            f"{self.base_url}/users/{user_id}/appLinks",
            headers=self.headers,
        )
        return [app["label"] for app in resp.json()]

    def get_admin_roles(self, user_id: str) -> List[str]:
        """Get admin roles assigned to a user."""
        resp = requests.get(
            f"{self.base_url}/users/{user_id}/roles",
            headers=self.headers,
        )
        return [role["type"] for role in resp.json()]

    def generate_review_report(self, output_file: str) -> None:
        """Generate a CSV report of all active users and their access."""
        resp = requests.get(
            f"{self.base_url}/users",
            headers=self.headers,
            params={"filter": 'status eq "ACTIVE"'},
        )
        with open(output_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "User ID", "Email", "Status", "Last Login",
                "Assigned Apps", "Admin Roles"
            ])
            for user in resp.json():
                apps = self.get_user_apps(user["id"])
                roles = self.get_admin_roles(user["id"])
                writer.writerow([
                    user["id"],
                    user["profile"]["email"],
                    user["status"],
                    user.get("lastLogin", "Never"),
                    "; ".join(apps),
                    "; ".join(roles),
                ])

# Example usage
reviewer = OktaAccessReviewer(api_token="YOUR_TOKEN", domain="yourorg.okta.com")
inactive = reviewer.get_inactive_users(days=90)
for u in inactive:
    print(f"INACTIVE: {u['email']} - last login: {u['last_login']}")
reviewer.generate_review_report("access_review_q2.csv")
```

### AWS IAM access analyzer for automated finding detection

Use AWS IAM Access Analyzer to detect unused permissions and cross-account access:

```bash
#!/bin/bash
set -euo pipefail

# Create an analyzer if it doesn't exist
ANALYZER_NAME="org-access-analyzer"
aws accessanalyzer create-analyzer \
  --analyzer-name "$ANALYZER_NAME" \
  --type ORGANIZATION \
  --region us-east-1

# List all findings
echo "=== Active Findings ==="
aws accessanalyzer list-findings \
  --analyzer-arn "$(aws accessanalyzer list-analyzers --query 'analyzers[0].arn' --output text)" \
  --filter '{"status":{"eq":["ACTIVE"]}}' \
  --query 'findings[*].{id:id,resource:resource.resourceArn,type:findingType,createdAt:createdAt}' \
  --output table

# Export findings to CSV for audit trail
aws accessanalyzer list-findings \
  --analyzer-arn "$(aws accessanalyzer list-analyzers --query 'analyzers[0].arn' --output text)" \
  --query 'findings[*].{id:id,resource:resource.resourceArn,type:findingType,createdAt:createdAt}' \
  --output json > iam-findings-$(date +%Y%m%d).json
```

### GitHub organization access audit script

Audit GitHub organization members and their roles programmatically:

```javascript
const { Octokit } = require("@octokit/rest");

async function auditGitHubOrg(orgName, token) {
  const octokit = new Octokit({ auth: token });
  const findings = [];

  // Get all organization members
  const members = await octokit.paginate(
    octokit.rest.orgs.listMembers,
    { org: orgName, per_page: 100 }
  );

  for (const member of members) {
    // Check if 2FA is enabled
    const { data: mfaStatus } = await octokit.rest.orgs.getMembershipForUser({
      org: orgName,
      username: member.login,
    });

    // Get user's public keys to verify SSH key rotation
    let keyCount = 0;
    try {
      const { data: keys } = await octokit.rest.users.listPublicKeysForUser({
        username: member.login,
      });
      keyCount = keys.length;
    } catch (e) {
      // API may rate limit
    }

    findings.push({
      login: member.login,
      role: mfaStatus.role,
      two_factor: member.two_factor_authentication ? "enabled" : "disabled",
      public_keys: keyCount,
    });
  }

  // Flag users without 2FA
  const noMfa = findings.filter(f => f.two_factor === "disabled");
  if (noMfa.length > 0) {
    console.log(`\nUSERS WITHOUT 2FA (${noMfa.length}):`);
    noMfa.forEach(u => console.log(`  - ${u.login} (role: ${u.role})`));
  }

  // Flag admins
  const admins = findings.filter(f => f.role === "admin");
  console.log(`\nORGANIZATION ADMINS (${admins.length}):`);
  admins.forEach(u => console.log(`  - ${u.login} (2FA: ${u.two_factor})`));

  return findings;
}

auditGitHubOrg("your-org", process.env.GITHUB_TOKEN)
  .then(() => console.log("\nAudit complete."))
  .catch(err => console.error("Audit failed:", err.message));
```

## Additional Best Practices


- For a deeper guide, see [Access Control Review Template](/docs/access-control-review-template/).

1. **Implement just-in-time (JIT) access for privileged roles.** Instead of standing admin access, grant time-bound elevation with automatic expiration:

```python
# Example: Request time-bound AWS IAM role assumption
import boto3
from datetime import datetime, timedelta

sts = boto3.client("sts")

# Assume a role with 1-hour session duration
response = sts.assume_role(
    RoleArn="arn:aws:iam::123456789012:role/PrivilegedAdmin",
    RoleSessionName="jit-access-alice",
    DurationSeconds=3600,  # 1 hour maximum
)

print(f"Temporary credentials expire at: {response['Credentials']['Expiration']}")
print(f"Access valid for 1 hour only. No standing privilege.")
```

2. **Use SCIM for automated deprovisioning.** When a user is disabled in the identity provider, SCIM automatically removes their access from connected applications:

```yaml
# Okta SCIM configuration example
scim:
  enabled: true
  app_assignments:
    - app: "github"
      scim_url: "https://api.github.com/scim/v2/organizations/{org}/Users"
      auth_method: "bearer_token"
    - app: "aws-iam-identity-center"
      scim_url: "https://scim.example.com/v2/Users"
      auth_method: "oauth2"
  deprovisioning:
    on_disable: "remove_all_access"
    on_suspend: "disable_signin_keep_membership"
```

## Additional Common Mistakes

1. **Not auditing service account token rotation.** Service accounts often have long-lived tokens that never expire. Audit and rotate them:

```bash
#!/bin/bash
# Find GitHub PATs older than 90 days
set -euo pipefail

# List all fine-grained tokens via GitHub API
curl -s -H "Authorization: token $GITHUB_ADMIN_TOKEN" \
  "https://api.github.com/orgs/$ORG/personal-access-tokens" | \
  jq -r '.[] | select(.expiring_at != null) | "TOKEN: \(.id) - expires: \(.expiring_at)"'
```

2. **Ignoring shared account credentials.** Shared accounts make individual accountability impossible. Replace them with individual accounts or break-glass procedures:

```markdown
## Shared Account Remediation Checklist
- [ ] Inventory all shared accounts (root, admin, service)
- [ ] Identify which individuals use each shared account
- [ ] Create individual accounts for each user
- [ ] Disable shared account after migration
- [ ] Implement break-glass procedure for emergency access
- [ ] Log all break-glass usage with automatic alerts
```

## Additional Frequently Asked Questions

### How do we handle access for contractors with short-term engagements?

Use time-bound access provisioning. Set an expiration date when the contractor is onboarded, and configure automatic deprovisioning on that date. Require a manager to re-approve access if the engagement is extended:

```python
# Example: Set expiration on Okta group membership
import requests

def set_temporary_access(okta_token, user_id, group_id, expires_at):
    """Assign user to a group with expiration date."""
    headers = {
        "Authorization": f"SSWS {okta_token}",
        "Content-Type": "application/json",
    }
    # Okta lifecycle expiration via custom attribute
    payload = {
        "profile": {
            "contractorAccessExpiresAt": expires_at,
        }
    }
    resp = requests.put(
        f"https://yourorg.okta.com/api/v1/users/{user_id}",
        headers=headers,
        json=payload,
    )
    return resp.status_code == 200
```

### What is the difference between access review and access certification?

Access review is the process of examining user permissions. Access certification is the formal, documented approval of those permissions by a system owner or manager. Certification creates an auditable record that a responsible person reviewed and approved the access.
