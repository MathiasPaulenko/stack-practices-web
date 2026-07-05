---
contentType: recipes
slug: terraform-remote-state-s3-backend
title: "Store Terraform State in S3 with DynamoDB Locking"
description: "How to configure Terraform remote state with S3 backend and DynamoDB locking, covering state isolation, workspace management, encryption, and CI/CD integration."
metaDescription: "Configure Terraform remote state with S3 backend and DynamoDB locking. State isolation, workspace management, encryption, and CI/CD integration patterns."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - terraform
  - aws
  - s3
  - state-management
  - infrastructure
  - recipe
relatedResources:
  - /recipes/devops/terraform-workspace-environment-isolation
  - /recipes/devops/github-actions-reusable-workflows
  - /recipes/devops/kubernetes-helm-chart-templating
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configure Terraform remote state with S3 backend and DynamoDB locking. State isolation, workspace management, encryption, and CI/CD integration patterns."
  keywords:
    - devops
    - terraform
    - aws
    - s3
    - state-management
    - infrastructure
    - recipe
---

## Overview

Terraform stores infrastructure state in a local file by default. For team collaboration and CI/CD, you need remote state stored in a shared backend. The S3 backend stores state in an S3 bucket with optional DynamoDB table for state locking — preventing concurrent runs from corrupting state. This setup is the standard for AWS-based Terraform workflows.

## When to Use

- Team collaboration — multiple engineers applying Terraform changes
- CI/CD pipelines — Terraform runs in GitHub Actions, Jenkins, or GitLab CI
- Production infrastructure — state must be durable, encrypted, and locked
- Multi-environment setups — separate state per environment (dev, staging, prod)
- When you need state versioning — S3 versioning provides rollback capability

## When NOT to Use

- Single developer, local-only Terraform — local state is simpler
- When using Terraform Cloud/Atlantis — they manage state for you
- Non-AWS infrastructure — use Azure Blob or GCS backends instead
- Quick prototypes — local state is fine for throwaway infrastructure

## Solution

### Bootstrap the backend resources

```hcl
# bootstrap.tf — Run this once to create the S3 bucket and DynamoDB table
# After applying, this can be removed or kept in a separate repo

resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-company-terraform-state"

  lifecycle {
    prevent_destroy = true  # Prevent accidental deletion
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

### Configure the S3 backend

```hcl
# backend.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

### Initialize with backend

```bash
# Initialize Terraform with the S3 backend
terraform init

# If migrating from local state
terraform init -migrate-state

# If reconfiguring the backend
terraform init -reconfigure
```

### State isolation with key prefixes

```hcl
# Each environment gets its own state file in the same bucket

# backend.tf for dev
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

# backend.tf for production
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

### Using partial backend configuration

```hcl
# backend.tf
terraform {
  backend "s3" {
    # Values provided via CLI or env vars
    # bucket and key are set at init time
  }
}
```

```bash
# Initialize with partial configuration
terraform init \
  -backend-config="bucket=my-company-terraform-state" \
  -backend-config="key=dev/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=terraform-locks" \
  -backend-config="encrypt=true"
```

### Backend config with environment variables

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"

# Terraform reads AWS creds from env automatically
terraform init
terraform plan
terraform apply
```

### Using workspaces for environment isolation

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "infrastructure/${terraform.workspace}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

```bash
# Create and switch workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# List workspaces
terraform workspace list

# Switch workspace
terraform workspace select production

# Apply in current workspace
terraform plan
terraform apply
```

### Conditional resources by workspace

```hcl
# main.tf
locals {
  env_config = {
    dev = {
      instance_count = 1
      instance_type  = "t3.micro"
    }
    staging = {
      instance_count = 2
      instance_type  = "t3.small"
    }
    production = {
      instance_count = 3
      instance_type  = "t3.medium"
    }
  }

  config = local.env_config[terraform.workspace]
}

resource "aws_instance" "app" {
  count         = local.config.instance_count
  instance_type = local.config.instance_type
  ami           = data.aws_ami.ubuntu.id

  tags = {
    Name        = "app-${terraform.workspace}-${count.index + 1}"
    Environment = terraform.workspace
  }
}
```

### State locking with DynamoDB

```bash
# When terraform plan/apply runs, it acquires a lock
# The lock is stored in DynamoDB with LockID = bucket/key

# If another run tries to acquire the lock:
# Error: Error acquiring the state lock
# Lock Info:
#   Path:    my-company-terraform-state/dev/terraform.tfstate
#   LockID:  abc123-def456

# Force unlock if a stale lock exists (use with caution)
terraform force-unlock abc123-def456
```

### CI/CD with GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    paths: ["terraform/**"]
  push:
    branches: [main]
    paths: ["terraform/**"]

jobs:
  terraform:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: terraform
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format
        run: terraform fmt -check

      - name: Terraform Plan
        run: terraform plan -no-color
        env:
          TF_VAR_environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'dev' }}

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply -auto-approve
```

### State file operations

```bash
# List resources in state
terraform state list

# Show a specific resource
terraform state show aws_instance.app[0]

# Move a resource in state (rename)
terraform state mv aws_instance.old aws_instance.new

# Remove a resource from state (without destroying)
terraform state rm aws_instance.app[0]

# Pull state to local file
terraform state pull > terraform.tfstate

# Push local state to remote
terraform state push terraform.tfstate
```

## Variants

### Cross-region replication for state

```hcl
# Enable S3 cross-region replication for disaster recovery
resource "aws_s3_bucket_replication_configuration" "state_replication" {
  bucket = aws_s3_bucket.terraform_state.id
  role   = aws_iam_role.replication.arn

  rule {
    status = "Enabled"
    destination {
      bucket = aws_s3_bucket.terraform_state_backup.arn
      storage_class = "STANDARD"
    }
  }
}

resource "aws_s3_bucket" "terraform_state_backup" {
  bucket = "my-company-terraform-state-backup"
  region = "us-west-2"  # Different region
}
```

### Using assume role for backend access

```hcl
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
    assume_role = {
      role_arn = "arn:aws:iam::123456789012:role/TerraformBackendAccess"
    }
  }
}
```

### Multiple state files for different components

```text
# Directory structure
terraform/
├── modules/
│   ├── vpc/
│   ├── eks/
│   └── rds/
├── environments/
│   ├── dev/
│   │   ├── vpc/
│   │   │   ├── backend.tf   # key = "dev/vpc/terraform.tfstate"
│   │   │   └── main.tf
│   │   ├── eks/
│   │   │   ├── backend.tf   # key = "dev/eks/terraform.tfstate"
│   │   │   └── main.tf
│   │   └── rds/
│   │       ├── backend.tf   # key = "dev/rds/terraform.tfstate"
│   │       └── main.tf
│   └── production/
│       └── ...
```

## Best Practices

- Enable S3 versioning — allows state rollback if corruption occurs
- Enable server-side encryption — state contains sensitive data (IPs, passwords)
- Use DynamoDB locking — prevents concurrent runs from corrupting state
- Set `prevent_destroy` on the state bucket — accidental deletion is catastrophic
- Use separate state files per environment — blast radius isolation
- Use separate state files per component (VPC, EKS, RDS) — faster runs, isolated changes
- Never commit `terraform.tfstate` to git — use the remote backend
- Use `terraform force-unlock` with caution — only for stale locks

## Common Mistakes

- **No DynamoDB locking**: concurrent `terraform apply` runs corrupt state. Always use DynamoDB locking.
- **No S3 versioning**: if state is corrupted or overwritten, there's no rollback. Enable versioning.
- **Single state file for everything**: slow runs, large blast radius. Split by environment and component.
- **Committing state to git**: state contains secrets and is not mergeable. Use remote backend.
- **Not using `prevent_destroy`**: accidental bucket deletion loses all state. Set `prevent_destroy = true`.
- **Using `force-unlock` carelessly**: if another run is active, forcing unlock corrupts state. Verify first.

## FAQ

### What is Terraform state?

A JSON file that maps Terraform resources to real-world infrastructure. Terraform uses it to track what it created, so it can update or destroy resources on future runs.

### Why use S3 as a backend?

S3 provides durability (99.999999999%), versioning for rollback, encryption at rest, and is accessible from anywhere. Combined with DynamoDB for locking, it's the standard remote backend for AWS.

### What is state locking?

A mechanism that prevents concurrent Terraform runs from modifying the same state simultaneously. DynamoDB stores a lock item; the run that acquires it proceeds, others wait or fail.

### How do I migrate from local to remote state?

Add the backend configuration to your `.tf` file, then run `terraform init -migrate-state`. Terraform uploads the local state to S3.

### Can I use the same S3 bucket for multiple projects?

Yes. Use different `key` values (e.g., `project-a/terraform.tfstate`, `project-b/terraform.tfstate`). Each key is a separate state file.
