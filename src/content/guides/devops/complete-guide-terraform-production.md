---





contentType: guides
slug: complete-guide-terraform-production
title: "Complete Guide to Terraform in Production"
description: "Manage infrastructure as code with Terraform in production. Covers modules, state management, workspaces, drift detection, remote backends, variable validation, sentinel policies, and CI/CD integration with practical HCL examples."
metaDescription: "Terraform in production. Covers modules, state management, workspaces, drift detection, remote backends, variable validation, CI/CD."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - architecture
tags:
  - terraform
  - devops
  - guide
  - iac
  - modules
  - state-management
  - workspaces
  - drift-detection
relatedResources:
  - /guides/complete-guide-docker-production
  - /guides/complete-guide-gitops-production
  - /guides/complete-guide-secrets-management
  - /patterns/external-configuration-store-pattern
  - /recipes/python-terraform-provider-custom
  - /docs/infrastructure-as-code-review-template
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Terraform in production. Covers modules, state management, workspaces, drift detection, remote backends, variable validation, CI/CD."
  keywords:
    - terraform production
    - terraform modules
    - state management
    - terraform workspaces
    - drift detection
    - remote backend
    - terraform ci/cd
    - sentinel policies





---

## Introduction

Terraform is the standard for infrastructure as code. But managing Terraform in production requires more than writing HCL files. The following walks through modules, state management, workspaces, drift detection, remote backends, variable validation, policy as code, and CI/CD integration.

## Project Structure

```text
terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   └── rds/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── versions.tf
├── environments/
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       ├── backend.tf
│       └── terraform.tfvars
├── policies/
│   └── sentinel/
│       └── require-tags.sentinel
└── README.md
```

## Modules

### VPC Module

```hcl
# modules/vpc/main.tf
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true
  
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-vpc"
  })
}

resource "aws_subnet" "private" {
  for_each = toset(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 4, index(var.availability_zones, each.value))
  availability_zone = each.value
  
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-private-${each.value}"
    Tier = "private"
  })
}

resource "aws_subnet" "public" {
  for_each = toset(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.cidr_block, 4, index(var.availability_zones, each.value) + 8)
  availability_zone       = each.value
  map_public_ip_on_launch = true
  
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-public-${each.value}"
    Tier = "public"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-igw"
  })
}

resource "aws_nat_gateway" "main" {
  for_each = toset(var.availability_zones)

  allocation_id = aws_eip.nat[each.value].id
  subnet_id     = aws_subnet.public[each.value].id
  
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-nat-${each.value}"
  })
  
  depends_on = [aws_internet_gateway.main]
}

resource "aws_eip" "nat" {
  for_each = toset(var.availability_zones)
  domain   = "vpc"
  
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eip-${each.value}"
  })
}
```

```hcl
# modules/vpc/variables.tf
variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.name_prefix))
    error_message = "name_prefix must be 2-31 chars, lowercase alphanumeric and hyphens."
  }
}

variable "cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "cidr_block must be a valid IPv4 CIDR."
  }
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones required for HA."
  }
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = [for s in aws_subnet.private : s.id]
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = [for s in aws_subnet.public : s.id]
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}
```

### Using Modules

```hcl
# environments/production/main.tf
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "stackpractices"
      Environment = "production"
      ManagedBy   = "terraform"
      Owner       = "platform-team"
    }
  }
}

module "vpc" {
  source = "../../modules/vpc"
  
  name_prefix        = "sp-prod"
  cidr_block         = "10.10.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  tags = {
    CostCenter = "platform"
  }
}

module "eks" {
  source = "../../modules/eks"
  
  name_prefix     = "sp-prod"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  cluster_version = "1.30"
  node_groups = {
    general = {
      desired_size = 3
      min_size     = 2
      max_size     = 6
      instance_types = ["t3.large"]
    }
  }
  
  tags = {
    CostCenter = "platform"
  }
}

module "rds" {
  source = "../../modules/rds"
  
  name_prefix        = "sp-prod"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  allocated_storage  = 100
  engine             = "postgres"
  engine_version     = "16.2"
  instance_class     = "db.r6g.large"
  multi_az           = true
  storage_encrypted  = true
  
  tags = {
    CostCenter = "platform"
  }
}
```

## State Management

### Remote Backend (S3 + DynamoDB)

```hcl
# environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "sp-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "sp-terraform-locks"
    
    # Use a dedicated IAM role for state access
    # role_arn = "arn:aws:iam::123456789:role/TerraformStateAccess"
  }
}
```

```hcl
# Bootstrap: Create S3 bucket and DynamoDB table for state
# Run this once per environment (not managed by Terraform itself)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "sp-terraform-state-prod"
  
  lifecycle {
    prevent_destroy = true  # Prevent accidental state deletion
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
  name         = "sp-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
}
```

### State Import

```bash
# Import existing resources into Terraform state
terraform import aws_s3_bucket.my_bucket my-bucket-name
terraform import aws_db_instance.my_db my-db-instance-id

# Import with module path
terraform import module.rds.aws_db_instance.main my-db-id

# List all resources in state
terraform state list

# Show a specific resource from state
terraform state show module.rds.aws_db_instance.main

# Move a resource in state (rename)
terraform state mv aws_instance.old aws_instance.new

# Remove a resource from state (without destroying)
terraform state rm aws_instance.deprecated

# Pull state to local file (for backup)
terraform state pull > backup.tfstate
```

## Workspaces

```hcl
# Using workspaces for environment separation
# Note: Workspaces are best for ephemeral environments, not prod vs staging
# For prod vs staging, use separate directories with separate state files

# environments/staging/main.tf
module "vpc" {
  source = "../../modules/vpc"
  
  name_prefix        = "sp-staging"
  cidr_block         = "10.20.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
}

# environments/production/main.tf
module "vpc" {
  source = "../../modules/vpc"
  
  name_prefix        = "sp-prod"
  cidr_block         = "10.10.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
```

```bash
# Workspace commands (for ephemeral environments)
terraform workspace new feature-xyz
terraform workspace select production
terraform workspace list
terraform workspace delete feature-xyz

# Use workspace name in configuration
# resource "aws_s3_bucket" "app" {
#   bucket = "sp-app-${terraform.workspace}"
# }
```

## Drift Detection

```bash
# Manual drift detection
terraform plan -detailed-exitcode
# Exit codes:
#   0 - No changes (no drift)
#   1 - Error
#   2 - Changes detected (drift exists)

# Automated drift detection script
#!/bin/bash
set -e

cd environments/production
terraform init -input=false
EXIT_CODE=0
terraform plan -detailed-exitcode -out=plan.tfplan || EXIT_CODE=$?

if [ $EXIT_CODE -eq 2 ]; then
    echo "DRIFT DETECTED"
    terraform show -json plan.tfplan | jq '.resource_changes[] | select(.change.actions != ["no-op"]) | {address: .address, actions: .change.actions}'
    
    # Send alert
    curl -X POST "$SLACK_WEBHOOK" -H "Content-Type: application/json" \
      -d "{\"text\": \"Terraform drift detected in production!\"}"
    
    exit 1
elif [ $EXIT_CODE -eq 0 ]; then
    echo "No drift detected"
    exit 0
else
    echo "Terraform plan failed"
    exit $EXIT_CODE
fi
```

```yaml
# GitHub Actions: Scheduled drift detection
name: Terraform Drift Detection
on:
  schedule:
    - cron: "0 8 * * *"  # Daily at 8 AM UTC

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.0"
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Terraform Init
        run: terraform init -input=false
        working-directory: environments/production
      
      - name: Check for drift
        run: |
          set +e
          terraform plan -detailed-exitcode -out=plan.tfplan
          EXIT_CODE=$?
          if [ $EXIT_CODE -eq 2 ]; then
            echo "::warning::Terraform drift detected"
            terraform show -json plan.tfplan > plan.json
            exit 1
          fi
        working-directory: environments/production
```

## CI/CD Pipeline

```yaml
# GitHub Actions: Terraform CI/CD
name: Terraform Pipeline
on:
  pull_request:
    paths:
      - "terraform/**"
  push:
    branches: [main]
    paths:
      - "terraform/**"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.0"
      
      - name: Terraform Format Check
        run: terraform fmt -check -recursive
        working-directory: terraform
      
      - name: Terraform Init
        run: terraform init -input=false -backend=false
        working-directory: terraform/environments/production
      
      - name: Terraform Validate
        run: terraform validate
        working-directory: terraform/environments/production
  
  plan:
    needs: validate
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.0"
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Terraform Init
        run: terraform init -input=false
        working-directory: terraform/environments/production
      
      - name: Terraform Plan
        run: terraform plan -no-color -out=plan.tfplan
        working-directory: terraform/environments/production
        env:
          TF_VAR_db_password: ${{ secrets.TF_DB_PASSWORD }}
      
      - name: Upload plan artifact
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: terraform/environments/production/plan.tfplan
  
  apply:
    needs: plan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.0"
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Terraform Init
        run: terraform init -input=false
        working-directory: terraform/environments/production
      
      - name: Terraform Apply
        run: terraform apply -auto-approve -no-color
        working-directory: terraform/environments/production
        env:
          TF_VAR_db_password: ${{ secrets.TF_DB_PASSWORD }}
```

## Policy as Code (Sentinel)

```python
# policies/sentinel/require-tags.sentinel
# Require specific tags on all resources

import "tfplan/v2" as tfplan

mandatory_tags = {
    "Project",
    "Environment",
    "ManagedBy",
    "Owner",
}

resources = filter tfplan.resource_changes as _, rc {
    rc.type starts with "aws_" and
    rc.change.actions contains "create"
}

main = rule {
    all resources as _, rc {
        all mandatory_tags as tag {
            rc.change.after.tags contains tag
        }
    }
}
```

```python
# policies/sentinel/no-public-s3.sentinel
# Prevent public S3 buckets

import "tfplan/v2" as tfplan

s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    rc.change.actions contains "create"
}

main = rule {
    all s3_buckets as _, rc {
        rc.change.after.acl is not "public-read" and
        rc.change.after.acl is not "public-read-write"
    }
}
```

```python
# policies/sentinel/require-encryption.sentinel
# Require encryption on RDS and EBS

import "tfplan/v2" as tfplan

rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.change.actions contains "create"
}

ebs_volumes = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_ebs_volume" and
    rc.change.actions contains "create"
}

main = rule {
    all rds_instances as _, rc {
        rc.change.after.storage_encrypted is true
    } and all ebs_volumes as _, rc {
        rc.change.after.encrypted is true
    }
}
```

## FAQ

### Should I use workspaces or separate directories for environments?

Use separate directories for production vs staging. Each directory has its own state file, backend configuration, and tfvars. This provides complete isolation and prevents accidental changes to production. Use workspaces for ephemeral environments (feature branches, testing) where the infrastructure is identical in structure. Workspaces share the same backend and variables, which is risky for production.

### How do I handle secrets in Terraform?

Never store secrets in tfvars files or HCL. Use environment variables (`TF_VAR_db_password`), AWS Secrets Manager, or HashiCorp Vault. For sensitive values in state, use `sensitive = true` in variable definitions. Mark outputs as `sensitive = true` to prevent them from being displayed in plan output. Use a remote backend with encryption (S3 with SSE) to protect state files, which may contain sensitive data.

### What is Terraform drift and how do I detect it?

Drift occurs when the actual infrastructure differs from what Terraform expects (e.g., someone manually changed a resource in the AWS console). Detect drift by running `terraform plan -detailed-exitcode` — exit code 2 means drift exists. Automate drift detection with a daily CI/CD job that runs plan and alerts on exit code 2. Fix drift by either importing the manual changes into Terraform or by running `terraform apply` to revert the infrastructure to the expected state.

### How do I structure Terraform modules?

Create one module per logical infrastructure component (VPC, EKS, RDS, CDN). Each module should have `main.tf` (resources), `variables.tf` (inputs with validation), `outputs.tf` (exports), and `versions.tf` (provider requirements). Keep modules generic — do not hardcode environment-specific values. Use the module from environment-specific directories that pass in the right variables. Version your modules with Git tags and reference specific versions in production.

### Should I use Terraform Cloud or self-managed backends?

Terraform Cloud provides managed state storage, remote execution, policy as code (Sentinel), and a UI for plan review. It is worth it for teams that need audit trails, RBAC, and approval workflows. For small teams or cost-sensitive projects, self-managed S3 + DynamoDB backends work well. The trade-off is operational overhead (managing state infrastructure) vs cost (Terraform Cloud pricing per resource).

### How do I prevent destructive changes?

Add `lifecycle { prevent_destroy = true }` to critical resources (databases, S3 buckets with state). This prevents `terraform destroy` from deleting them. Use Sentinel or OPA policies to block destructive changes in CI. Review plans carefully in pull requests. Use `terraform plan` in CI before merge. Require manual approval for production applies. Use `create_before_destroy` lifecycle hook for resources that need zero-downtime replacement.

## See Also

- [Complete Guide to GitOps in Production](/guides/complete-guide-gitops-production/)
- [Complete Guide to Kubernetes Networking](/guides/complete-guide-kubernetes-networking/)
- [Complete Guide to Terraform Modules](/guides/complete-guide-terraform-modules/)
- [Terraform Best Practices — Modules, State, and Workspaces](/guides/terraform-best-practices-guide/)
- [Multi-Cloud Strategies — Benefits, Pitfalls](/guides/multi-cloud-guide/)

