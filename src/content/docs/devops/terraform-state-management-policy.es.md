---
contentType: docs
slug: terraform-state-management-policy
title: "Política de Gestión de Estado de Terraform"
description: "Una política para gestionar Terraform state files: backend configuration, locking, isolation, access control, versioning y disaster recovery."
metaDescription: "Usá esta política de gestión de Terraform state para definir backend, locking, isolation, access control, versioning y recovery procedures."
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
  metaDescription: "Usá esta política de gestión de Terraform state para definir backend, locking, isolation, access control, versioning y recovery procedures."
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

Terraform state es el source of truth para infrastructure. Un state management policy define cómo state se storea, accede, lockea, aísla y recupera. Sin un policy, state files se vuelven un liability: concurrent modifications causan conflicts, lost state causa infrastructure drift y unencrypted state expone secrets.

## When to Use

- Seteando up Terraform para un new project o team
- Migrando de local a remote state
- Estableciendo IaC governance across teams
- Preparándote para compliance audits
- Definiendo disaster recovery procedures para infrastructure

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
| Versioning | Enabled | Recover desde accidental overwrites |
| Encryption | AES-256 (SSE-S3) o AWS KMS (SSE-KMS) | Protect state contents |
| Public access block | All enabled | Prevenir public exposure |
| Bucket policy | Deny non-SSL requests | Encriptá in transit |
| Lifecycle | Transition a Glacier después de 90 days | Cost optimization para old versions |
| MFA delete | Enabled (production) | Prevenir accidental deletion |
| Access logging | Enabled | Audit access a state |

### DynamoDB Lock Table

| Setting | Value | Rationale |
|---------|-------|-----------|
| Table name | tfstate-locks | One table per environment |
| Partition key | LockID (string) | Required por Terraform |
| Billing mode | PAY_PER_REQUEST | No capacity planning needed |
| Encryption | AWS KMS | Encriptá lock data |
| Point-in-time recovery | Enabled | Recover desde accidental deletion |

## 2. State Isolation

### Isolation Strategy

| Level | Isolation Method | Rationale |
|-------|-----------------|-----------|
| Environment | Separate S3 buckets | Prod y dev nunca share state |
| Project | Separate state keys | Projects no dependen el uno del otro |
| Team | Separate AWS accounts | Full isolation para compliance |
| Region | Separate state per region | Regional infrastructure isolation |

### Workspace Policy

| Rule | Enforcement |
|------|-------------|
| No Terraform workspaces para environment isolation | Usá separate state files |
| Workspaces allowed para parallel development | Within same environment only |
| Default workspace no debe usarse para production | Named workspaces only |

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
| Plan | `terraform plan` | Developers, CI | Antes de apply |
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
| Manual state editing | Corrupte state | Usá `terraform state` commands |
| State sharing entre environments | Cross-environment dependencies | Separate state files |
| `terraform apply` sin plan | No review de changes | Siempre corré plan first |
| `terraform force-unlock` sin investigation | Concurrent modifications | Investigá lock owner first |

### State Migration Procedure

```bash
# 1. Pulleá current state
terraform state pull > backup.tfstate

# 2. Disableá old backend
terraform init -backend=false

# 3. Configurá new backend en terraform.tf
# (updateá backend block)

# 4. Initializeá con new backend
terraform init -migrate-state

# 5. Verify state
terraform state list
terraform plan  # Should show no changes

# 6. Clean up old state
# (removeá old S3 objects después de verification)
```

## 5. State Security

### Sensitive Data in State

| Data Type | Stored en State? | Mitigation |
|-----------|-----------------|------------|
| Resource IDs | Yes | Not sensitive |
| Resource attributes | Yes | Some pueden ser sensitive |
| Passwords/secrets | Yes (if no usa sensitive flag) | Mark as sensitive, usá vault |
| Private keys | Yes (if created por Terraform) | Usá vault, no Terraform |
| TLS certificates | Yes (if created por Terraform) | Usá ACM, no Terraform |

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

# Sensitive values se hide en plan output
# pero still stored en state file
```

### State File Access Audit

| Log Source | What to Log | Retention |
|------------|-------------|-----------|
| S3 access logs | GetObject, PutObject en state bucket | 1 year |
| CloudTrail | All API calls a S3 y DynamoDB | 1 year |
| Terraform logs | Plan y apply operations | 90 days |
| CI/CD logs | Who triggereó apply y cuándo | 1 year |

## 6. Disaster Recovery

### Backup Strategy

| Component | Backup Method | Frequency | Retention |
|-----------|--------------|-----------|-----------|
| State file | S3 versioning | Every apply | All versions retained |
| State file | Manual export | Weekly | 90 days |
| Lock table | DynamoDB PITR | Continuous | 35 days |
| Backend config | Git repository | Every commit | Per Git history |

### Recovery Procedures

#### Recover desde Accidental State Deletion

```bash
# 1. Listé previous versions
aws s3api list-object-versions \
  --bucket example-tfstate-prod \
  --prefix infrastructure/terraform.tfstate

# 2. Restoreá previous version
aws s3api copy-object \
  --copy-source example-tfstate-prod/infrastructure/terraform.tfstate?versionId=<version-id> \
  --bucket example-tfstate-prod \
  --key infrastructure/terraform.tfstate

# 3. Verify state
terraform state list
terraform plan  # Should show no changes
```

#### Recover desde Corrupted State

```bash
# 1. Pulleá current state
terraform state pull > corrupted.tfstate

# 2. Restoreá desde S3 version
aws s3api copy-object \
  --copy-source example-tfstate-prod/infrastructure/terraform.tfstate?versionId=<version-id> \
  --bucket example-tfstate-prod \
  --key infrastructure/terraform.tfstate

# 3. Importá missing resources
terraform import aws_instance.web i-1234567890abcdef0

# 4. Verify
terraform plan
```

#### Recover desde Stuck Lock

```bash
# 1. Checkeá lock info
terraform force-unlock -force <lock-id>

# 2. Verify que no otro Terraform process esté running
# (checkeá CI/CD pipelines, developer terminals)

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
| Usá service accounts | IAM role para CI, no user credentials | Auditable, revocable |
| Plan en PR pipeline | `terraform plan` en every PR | Review changes antes de merge |
| Apply on merge | `terraform apply` después de merge a main | Automated deployment |
| No manual apply | All applies through CI/CD | Consistent, auditable |
| Plan output como PR comment | Bot posts plan summary | Review sin terminal |
| State lock timeout | 10 min en CI config | Prevenir stuck pipelines |
```

## Explanation

Terraform state trackea el mapping entre Terraform configuration y real infrastructure. Contiene resource IDs, attributes y a veces sensitive data. Manage state correctly es critical: lost state significa que Terraform no puede track infrastructure, corrupted state causa drift y exposed state leakea secrets.

El backend configuration define dónde state se storea. S3 con DynamoDB locking es el standard para AWS. S3 provee durable, encrypted storage con versioning. DynamoDB provee locking para prevenir concurrent modifications. Sin locking, two `terraform apply` runs pueden corrupt state.

State isolation previene cross-environment dependencies. Production y development deben tener separate state files, ideally en separate S3 buckets. Share state entre environments crea coupling: un change en dev puede romper prod. Separate state files ensure que cada environment es independent.

Access control restringe quién puede read y write state. Developers necesitan read access para `terraform plan` pero no write access para `terraform apply`. CI/CD service accounts necesitan full access para automated deployments. Auditors necesitan read-only access. IAM policies enforce estas restrictions.

State security addressea sensitive data. Terraform storea all resource attributes en state, incluyendo passwords y keys. Mark variables como sensitive para hide them en plan output, pero recordá que still están en el state file. Usá external secret stores (Vault, AWS Secrets Manager) para secrets, no Terraform variables.

Disaster recovery procedures handle state loss y corruption. S3 versioning es el primary recovery mechanism: every `terraform apply` crea un new version. Si state se accidentalmente deletea o corrupe, restoreá desde un previous version. El DynamoDB point-in-time recovery protege el lock table.

CI/CD integration automatiza state operations. Plans corren en every PR para review. Applies corren on merge a main. Manual `terraform apply` es prohibited — all changes van through CI/CD. Esto ensure consistency, auditability y previene accidental state corruption.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Multi-cloud | Usá Terraform Cloud o Spacelift | Managed backend, no S3/DynamoDB |
| Azure | Usá Azure Storage backend | Blob container con lease locking |
| GCP | Usá GCS backend | Bucket con object versioning |
| Self-hosted | Usá Consul o PostgreSQL backend | Para air-gapped environments |
| Large-scale | Usá Terraform Cloud workspaces | Team-based access, RBAC |
| Compliance | Addeá KMS encryption + CloudTrail | SOC 2, HIPAA requirements |

## What Works

1. Usá remote state desde day one — migrar local state es painful
2. Enableá S3 versioning — es el simplest recovery mechanism
3. Usá DynamoDB locking — concurrent applies corrupe state
4. Aislá state per environment — nunca share prod y dev state
5. Marké sensitive variables — hide secrets en plan output
6. Automatizá through CI/CD — no manual terraform apply
7. Auditá state access — sabé quién cambió infrastructure y cuándo

## Common Mistakes

1. Local state en Git — no locking, secrets en version control
2. No state locking — concurrent applies corrupe state
3. Shared state across environments — dev changes rompe prod
4. No state versioning — no podés recover desde accidental deletion
5. Secrets en state sin sensitive flag — visible en plan output
6. Manual terraform apply — inconsistent, not auditable
7. No backup strategy — state loss significa infrastructure drift

## Frequently Asked Questions

### ¿Por qué no usar Terraform workspaces para environment isolation?

Workspaces share el same state backend y configuration. Un change al backend configuration affecta all workspaces. Workspaces no proveen true isolation: un bug en un workspace puede affectar otros. Usá separate state files (different S3 keys o buckets) para environment isolation. Workspaces son fine para parallel development within el same environment.

### ¿Cómo handleamos state cuando spliteamos un monolithic Terraform project?

Usá `terraform state mv` para move resources entre states. Creá el new state file con su own backend configuration. Moveé resources desde el old state al new state. Verify both states con `terraform plan` (should show no changes). Removeé los resources desde el old configuration. Este process es reversible hasta que deleteás el old state.

### ¿Qué deberíamos hacer si terraform state está locked?

Primero, checkeá si otro Terraform process está running (CI/CD pipeline, otro developer). Si yes, esperá a que termine. Si no (el process crasheó sin release el lock), usá `terraform force-unlock`. Investigá por qué el lock no se releaseó para prevenir recurrence. Nunca force-unlock sin checkear — concurrent applies corrupe state.

### ¿Cómo migramos state entre backends?

Configurá el new backend en tu Terraform configuration. Corré `terraform init -migrate-state`. Terraform pullea el state desde el old backend y lo pushea al new backend. Verify con `terraform plan` (should show no changes). Updateá tu CI/CD configuration con el new backend. Clean up el old backend después de verification.

### ¿Deberíamos store Terraform state en Git?

No. State files contienen sensitive data (passwords, keys), cambian en every apply (creando noisy diffs) y no soportan locking (concurrent modifications). Usá un remote backend (S3, Terraform Cloud, etc.) para state. Storeá Terraform configuration (`.tf` files) en Git, no state files.
