---
contentType: docs
slug: terraform-state-management-policy
title: "Terraform State Management Policy"
description: "A policy for managing Terraform state files: backend configuration, locking, isolation, access control, versioning, and disaster recovery."
metaDescription: "Use this Terraform state management policy to define backend configuration, locking, isolation, access control, versioning, and recovery procedures."
difficulty: intermediate
topics:
  - testing
tags:
  - devops
  - terraform
  - state
  - infrastructure
  - policy
  - iac
  - backend
relatedResources:
  - /docs/devops/ci-cd-pipeline-design-template
  - /docs/devops/helm-chart-review-checklist
  - /docs/devops/kubernetes-pod-disruption-budget-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this Terraform state management policy to define backend configuration, locking, isolation, access control, versioning, and recovery procedures."
  keywords:
    - terraform state
    - state management
    - backend
    - infrastructure as code
    - policy
    - terraform
    - versioning
---

## Overview

Terraform state is the source of truth for infrastructure. A state management policy defines how state is stored, accessed, locked, isolated, and recovered. Without a policy, state files become a liability: concurrent modifications cause conflicts, lost state causes infrastructure drift, and unencrypted state exposes secrets.

## When to Use

- Setting up Terraform for a new project or team
- Migrating from local to remote state
- Establishing IaC governance across teams
- Preparing for compliance audits
- Defining disaster recovery procedures for infrastructure

## Solution

```markdown
# Terraform State Management Policy — `<Organization Name>`

## Policy Overview

| Field | Value |
|-------|-------|
| Organization | Example Corp |
| Policy Version | 1.0 |
| Last Updated | 2026-07-05 |
| Policy Owner | DevOps Team |
| Approved By | Head of Infrastructure |
| Review Cycle | Quarterly |
| Terraform Version | 1.7+ |
| Backend | S3 + DynamoDB (AWS) |
| State Encryption | AES-256 (S3 server-side) |

## 1. Backend Configuration

### Required Backend: S3 + DynamoDB

| Component | Purpose | Configuration |
|-----------|---------|---------------|
| S3 bucket | State file storage | Encrypted, versioned, private |
| DynamoDB table | State locking | Prevent concurrent modifications |
| KMS key | Encryption key | Customer-managed, rotated annually |
| IAM policy | Access control | Least privilege per environment |

### Backend Configuration Template

```hcl
terraform {
  required_version = ">= 1.7.0"

  backend "s3" {
    bucket         = "example-tfstate-prod"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tfstate-locks"
    kms_key_id     = "alias/terraform-state-key"
  }
}
```

### Backend Naming Convention

| Environment | S3 Bucket | State Key | DynamoDB Table |
|-------------|-----------|-----------|----------------|
| Production | example-tfstate-prod | `<project>/terraform.tfstate` | tfstate-locks-prod |
| Staging | example-tfstate-staging | `<project>/terraform.tfstate` | tfstate-locks-staging |
| Development | example-tfstate-dev | `<project>/terraform.tfstate` | tfstate-locks-dev |
| Shared | example-tfstate-shared | `<project>/terraform.tfstate` | tfstate-locks-shared |

### S3 Bucket Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| Versioning | Enabled | Recover from accidental overwrites |
| Encryption | AES-256 (SSE-S3) or AWS KMS (SSE-KMS) | Protect state contents |
| Public access block | All enabled | Prevent public exposure |
| Bucket policy | Deny non-SSL requests | Encrypt in transit |
| Lifecycle | Transition to Glacier after 90 days | Cost optimization for old versions |
| MFA delete | Enabled (production) | Prevent accidental deletion |
| Access logging | Enabled | Audit access to state |

### DynamoDB Lock Table

| Setting | Value | Rationale |
|---------|-------|-----------|
| Table name | tfstate-locks | One table per environment |
| Partition key | LockID (string) | Required by Terraform |
| Billing mode | PAY_PER_REQUEST | No capacity planning needed |
| Encryption | AWS KMS | Encrypt lock data |
| Point-in-time recovery | Enabled | Recover from accidental deletion |

## 2. State Isolation

### Isolation Strategy

| Level | Isolation Method | Rationale |
|-------|-----------------|-----------|
| Environment | Separate S3 buckets | Prod and dev never share state |
| Project | Separate state keys | Projects don't depend on each other |
| Team | Separate AWS accounts | Full isolation for compliance |
| Region | Separate state per region | Regional infrastructure isolation |

### Workspace Policy

| Rule | Enforcement |
|------|-------------|
| No Terraform workspaces for environment isolation | Use separate state files |
| Workspaces allowed for parallel development | Within same environment only |
| Default workspace must not be used for production | Named workspaces only |

### State File Structure

```
example-tfstate-prod/
├── networking/
│   └── terraform.tfstate
├── database/
│   └── terraform.tfstate
├── application/
│   └── terraform.tfstate
├── monitoring/
│   └── terraform.tfstate
└── security/
    └── terraform.tfstate
```

## 3. Access Control

### IAM Policy: Read-Only (Plan)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::example-tfstate-prod",
        "arn:aws:s3:::example-tfstate-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/tfstate-locks-prod"
    }
  ]
}
```

### IAM Policy: Read-Write (Apply)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::example-tfstate-prod",
        "arn:aws:s3:::example-tfstate-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/tfstate-locks-prod"
    }
  ]
}
```

### Access Matrix

| Role | Plan (Read) | Apply (Write) | State Pull | State Push | Lock/Unlock |
|------|-------------|---------------|------------|------------|-------------|
| Developer | ✅ (dev/staging) | ❌ | ✅ (dev/staging) | ❌ | ✅ (dev/staging) |
| Senior Developer | ✅ (all) | ✅ (dev/staging) | ✅ (all) | ❌ | ✅ (dev/staging) |
| DevOps Engineer | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (dev/staging) | ✅ (all) |
| CI/CD Service Account | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all) |
| Auditor | ✅ (read-only) | ❌ | ✅ (read-only) | ❌ | ❌ |

## 4. State Operations

### Allowed Operations

| Operation | Command | Who | When |
|-----------|---------|-----|------|
| Plan | `terraform plan` | Developers, CI | Before apply |
| Apply | `terraform apply` | CI/CD, DevOps | After plan approval |
| State list | `terraform state list` | Developers, CI | Debugging |
| State show | `terraform state show <resource>` | Developers, CI | Debugging |
| State pull | `terraform state pull` | DevOps, CI | Debugging, backup |
| State push | `terraform state push` | DevOps only | Emergency recovery |
| State mv | `terraform state mv` | DevOps only | Resource renaming |
| State rm | `terraform state rm` | DevOps only | Remove deleted resources |
| Force unlock | `terraform force-unlock` | DevOps only | Stuck locks |

### Prohibited Operations

| Operation | Reason | Alternative |
|-----------|--------|-------------|
| Local state | No locking, no encryption | Remote backend |
| Manual state editing | Corrupts state | Use `terraform state` commands |
| State sharing between environments | Cross-environment dependencies | Separate state files |
| `terraform apply` without plan | No review of changes | Always run plan first |
| `terraform force-unlock` without investigation | Concurrent modifications | Investigate lock owner first |

### State Migration Procedure

```bash
# 1. Pull current state
terraform state pull > backup.tfstate

# 2. Disable old backend
terraform init -backend=false

# 3. Configure new backend in terraform.tf
# (update backend block)

# 4. Initialize with new backend
terraform init -migrate-state

# 5. Verify state
terraform state list
terraform plan  # Should show no changes

# 6. Clean up old state
# (remove old S3 objects after verification)
```

## 5. State Security

### Sensitive Data in State

| Data Type | Stored in State? | Mitigation |
|-----------|-----------------|------------|
| Resource IDs | Yes | Not sensitive |
| Resource attributes | Yes | Some may be sensitive |
| Passwords/secrets | Yes (if not using sensitive flag) | Mark as sensitive, use vault |
| Private keys | Yes (if created by Terraform) | Use vault, not Terraform |
| TLS certificates | Yes (if created by Terraform) | Use ACM, not Terraform |

### Marking Resources as Sensitive

```hcl
resource "aws_db_instance" "main" {
  username = "admin"
  password = var.db_password
  # Mark variable as sensitive
}

variable "db_password" {
  type      = string
  sensitive = true
}

# Sensitive values are hidden in plan output
# but still stored in state file
```

### State File Access Audit

| Log Source | What to Log | Retention |
|------------|-------------|-----------|
| S3 access logs | GetObject, PutObject on state bucket | 1 year |
| CloudTrail | All API calls to S3 and DynamoDB | 1 year |
| Terraform logs | Plan and apply operations | 90 days |
| CI/CD logs | Who triggered apply and when | 1 year |

## 6. Disaster Recovery

### Backup Strategy

| Component | Backup Method | Frequency | Retention |
|-----------|--------------|-----------|-----------|
| State file | S3 versioning | Every apply | All versions retained |
| State file | Manual export | Weekly | 90 days |
| Lock table | DynamoDB PITR | Continuous | 35 days |
| Backend config | Git repository | Every commit | Per Git history |

### Recovery Procedures

#### Recover from Accidental State Deletion

```bash
# 1. List previous versions
aws s3api list-object-versions \
  --bucket example-tfstate-prod \
  --prefix infrastructure/terraform.tfstate

# 2. Restore previous version
aws s3api copy-object \
  --copy-source example-tfstate-prod/infrastructure/terraform.tfstate?versionId=<version-id> \
  --bucket example-tfstate-prod \
  --key infrastructure/terraform.tfstate

# 3. Verify state
terraform state list
terraform plan  # Should show no changes
```

#### Recover from Corrupted State

```bash
# 1. Pull current state
terraform state pull > corrupted.tfstate

# 2. Restore from S3 version
aws s3api copy-object \
  --copy-source example-tfstate-prod/infrastructure/terraform.tfstate?versionId=<version-id> \
  --bucket example-tfstate-prod \
  --key infrastructure/terraform.tfstate

# 3. Import missing resources
terraform import aws_instance.web i-1234567890abcdef0

# 4. Verify
terraform plan
```

#### Recover from Stuck Lock

```bash
# 1. Check lock info
terraform force-unlock -force <lock-id>

# 2. Verify no other Terraform process is running
# (check CI/CD pipelines, developer terminals)

# 3. Re-run plan
terraform plan
```

## 7. CI/CD Integration

### Pipeline State Operations

| Stage | State Operation | Permissions | Duration |
|-------|----------------|-------------|----------|
| Init | `terraform init` | Read backend config | 30 sec |
| Plan | `terraform plan` | Read state, acquire lock | 2-5 min |
| Apply | `terraform apply` | Read/write state, lock | 5-15 min |
| Destroy | `terraform destroy` | Read/write state, lock | 5-15 min |

### CI/CD Best Practices

| Practice | Implementation | Rationale |
|----------|----------------|-----------|
| Use service accounts | IAM role for CI, not user credentials | Auditable, revocable |
| Plan in PR pipeline | `terraform plan` on every PR | Review changes before merge |
| Apply on merge | `terraform apply` after merge to main | Automated deployment |
| No manual apply | All applies through CI/CD | Consistent, auditable |
| Plan output as PR comment | Bot posts plan summary | Review without terminal |
| State lock timeout | 10 min in CI config | Prevent stuck pipelines |
```

## Explanation

Terraform state tracks the mapping between Terraform configuration and real infrastructure. It contains resource IDs, attributes, and sometimes sensitive data. Managing state correctly is critical: lost state means Terraform can't track infrastructure, corrupted state causes drift, and exposed state leaks secrets.

The backend configuration defines where state is stored. S3 with DynamoDB locking is the standard for AWS. S3 provides durable, encrypted storage with versioning. DynamoDB provides locking to prevent concurrent modifications. Without locking, two `terraform apply` runs can corrupt state.

State isolation prevents cross-environment dependencies. Production and development must have separate state files, ideally in separate S3 buckets. Sharing state between environments creates coupling: a change in dev can break prod. Separate state files ensure each environment is independent.

Access control restricts who can read and write state. Developers need read access for `terraform plan` but not write access for `terraform apply`. CI/CD service accounts need full access for automated deployments. Auditors need read-only access. IAM policies enforce these restrictions.

State security addresses sensitive data. Terraform stores all resource attributes in state, including passwords and keys. Mark variables as sensitive to hide them in plan output, but remember they're still in the state file. Use external secret stores (Vault, AWS Secrets Manager) for secrets, not Terraform variables.

Disaster recovery procedures handle state loss and corruption. S3 versioning is the primary recovery mechanism: every `terraform apply` creates a new version. If state is accidentally deleted or corrupted, restore from a previous version. The DynamoDB point-in-time recovery protects the lock table.

CI/CD integration automates state operations. Plans run on every PR for review. Applies run on merge to main. Manual `terraform apply` is prohibited — all changes go through CI/CD. This ensures consistency, auditability, and prevents accidental state corruption.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Multi-cloud | Use Terraform Cloud or Spacelift | Managed backend, no S3/DynamoDB |
| Azure | Use Azure Storage backend | Blob container with lease locking |
| GCP | Use GCS backend | Bucket with object versioning |
| Self-hosted | Use Consul or PostgreSQL backend | For air-gapped environments |
| Large-scale | Use Terraform Cloud workspaces | Team-based access, RBAC |
| Compliance | Add KMS encryption + CloudTrail | SOC 2, HIPAA requirements |

## What Works

1. Use remote state from day one — migrating local state is painful
2. Enable S3 versioning — it's the simplest recovery mechanism
3. Use DynamoDB locking — concurrent applies corrupt state
4. Isolate state per environment — never share prod and dev state
5. Mark sensitive variables — hide secrets in plan output
6. Automate through CI/CD — no manual terraform apply
7. Audit state access — know who changed infrastructure and when

## Common Mistakes

1. Local state in Git — no locking, secrets in version control
2. No state locking — concurrent applies corrupt state
3. Shared state across environments — dev changes break prod
4. No state versioning — can't recover from accidental deletion
5. Secrets in state without sensitive flag — visible in plan output
6. Manual terraform apply — inconsistent, not auditable
7. No backup strategy — state loss means infrastructure drift

## Frequently Asked Questions

### Why not use Terraform workspaces for environment isolation?

Workspaces share the same state backend and configuration. A change to the backend configuration affects all workspaces. Workspaces don't provide true isolation: a bug in one workspace can affect others. Use separate state files (different S3 keys or buckets) for environment isolation. Workspaces are fine for parallel development within the same environment.

### How do we handle state when splitting a monolithic Terraform project?

Use `terraform state mv` to move resources between states. Create the new state file with its own backend configuration. Move resources from the old state to the new state. Verify both states with `terraform plan` (should show no changes). Remove the resources from the old configuration. This process is reversible until you delete the old state.

### What should we do if terraform state is locked?

First, check if another Terraform process is running (CI/CD pipeline, another developer). If yes, wait for it to finish. If no (the process crashed without releasing the lock), use `terraform force-unlock`. Investigate why the lock wasn't released to prevent recurrence. Never force-unlock without checking — concurrent applies corrupt state.

### How do we migrate state between backends?

Configure the new backend in your Terraform configuration. Run `terraform init -migrate-state`. Terraform pulls the state from the old backend and pushes it to the new backend. Verify with `terraform plan` (should show no changes). Update your CI/CD configuration with the new backend. Clean up the old backend after verification.

### Should we store Terraform state in Git?

No. State files contain sensitive data (passwords, keys), change on every apply (creating noisy diffs), and don't support locking (concurrent modifications). Use a remote backend (S3, Terraform Cloud, etc.) for state. Store Terraform configuration (`.tf` files) in Git, not state files.
