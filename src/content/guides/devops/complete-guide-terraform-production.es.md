---





contentType: guides
slug: complete-guide-terraform-production
title: "Referencia Detallada de Terraform en Producción"
description: "Gestionar infrastructure as code con Terraform en produccion. Cubre modules, state management, workspaces, drift detection, remote backends, variable validation, sentinel policies y CI/CD integration con ejemplos practicos de HCL."
metaDescription: "Terraform en produccion. Cubre modules, state management, workspaces, drift detection, remote backends, variable validation, CI/CD."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - architecture
tags:
  - terraform
  - devops
  - guia
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
  metaDescription: "Terraform en produccion. Cubre modules, state management, workspaces, drift detection, remote backends, variable validation, CI/CD."
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

## Introducción

Terraform es el standard para infrastructure as code. Pero manejar Terraform en production requiere mas que escribir HCL files. Lo siguiente recorre modules, state management, workspaces, drift detection, remote backends, variable validation, policy as code, y CI/CD integration.

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
  description = "Prefix para all resource names"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.name_prefix))
    error_message = "name_prefix must be 2-31 chars, lowercase alphanumeric and hyphens."
  }
}

variable "cidr_block" {
  description = "CIDR block para el VPC"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "cidr_block must be a valid IPv4 CIDR."
  }
}

variable "availability_zones" {
  description = "List de availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones required para HA."
  }
}

variable "tags" {
  description = "Common tags applied a all resources"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID del VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs de private subnets"
  value       = [for s in aws_subnet.private : s.id]
}

output "public_subnet_ids" {
  description = "IDs de public subnets"
  value       = [for s in aws_subnet.public : s.id]
}

output "vpc_cidr_block" {
  description = "CIDR block del VPC"
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
    
    # Use un dedicated IAM role para state access
    # role_arn = "arn:aws:iam::123456789:role/TerraformStateAccess"
  }
}
```

```hcl
# Bootstrap: Create S3 bucket y DynamoDB table para state
# Run this una vez per environment (no managed por Terraform itself)
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
# Import existing resources en Terraform state
terraform import aws_s3_bucket.my_bucket my-bucket-name
terraform import aws_db_instance.my_db my-db-instance-id

# Import con module path
terraform import module.rds.aws_db_instance.main my-db-id

# List all resources en state
terraform state list

# Show un specific resource desde state
terraform state show module.rds.aws_db_instance.main

# Move un resource en state (rename)
terraform state mv aws_instance.old aws_instance.new

# Remove un resource desde state (sin destroying)
terraform state rm aws_instance.deprecated

# Pull state a local file (para backup)
terraform state pull > backup.tfstate
```

## Workspaces

```hcl
# Using workspaces para environment separation
# Note: Workspaces son best para ephemeral environments, no prod vs staging
# Para prod vs staging, usa separate directories con separate state files

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
# Workspace commands (para ephemeral environments)
terraform workspace new feature-xyz
terraform workspace select production
terraform workspace list
terraform workspace delete feature-xyz

# Use workspace name en configuration
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
      -d "{\"text\": \"Terraform drift detected en production!\"}"
    
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
# Require specific tags en all resources

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
# Require encryption en RDS y EBS

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

## Preguntas Frecuentes

### ¿Debería usar workspaces o separate directories para environments?

Usa separate directories para production vs staging. Cada directory tiene su own state file, backend configuration, y tfvars. Esto provee complete isolation y previene accidental changes a production. Usa workspaces para ephemeral environments (feature branches, testing) donde el infrastructure es identical en structure. Workspaces share el mismo backend y variables, que es risky para production.

### ¿Cómo manejo secrets en Terraform?

Nunca stores secrets en tfvars files o HCL. Usa environment variables (`TF_VAR_db_password`), AWS Secrets Manager, o HashiCorp Vault. Para sensitive values en state, usa `sensitive = true` en variable definitions. Marka outputs como `sensitive = true` para prevenir que sean displayed en plan output. Usa un remote backend con encryption (S3 con SSE) para proteger state files, que pueden contener sensitive data.

### ¿Qué es Terraform drift y cómo lo detecto?

Drift ocurre cuando el actual infrastructure differs de lo que Terraform expects (e.g., alguien manualmente changed un resource en el AWS console). Detecta drift running `terraform plan -detailed-exitcode` — exit code 2 significa drift exists. Automatiza drift detection con un daily CI/CD job que run plan y alerts en exit code 2. Fix drift sea importando los manual changes en Terraform o running `terraform apply` para revertir el infrastructure al expected state.

### ¿Cómo structuro Terraform modules?

Crea un module per logical infrastructure component (VPC, EKS, RDS, CDN). Cada module deberia tener `main.tf` (resources), `variables.tf` (inputs con validation), `outputs.tf` (exports), y `versions.tf` (provider requirements). Keep modules generic — no hardcodees environment-specific values. Usa el module desde environment-specific directories que pass in los right variables. Version tus modules con Git tags y reference specific versions en production.

### ¿Debería usar Terraform Cloud o self-managed backends?

Terraform Cloud provee managed state storage, remote execution, policy as code (Sentinel), y un UI para plan review. Vale la pena para teams que necesitan audit trails, RBAC, y approval workflows. Para small teams o cost-sensitive projects, self-managed S3 + DynamoDB backends funcionan well. El trade-off es operational overhead (managing state infrastructure) vs cost (Terraform Cloud pricing per resource).

### ¿Cómo prevengo destructive changes?

Add `lifecycle { prevent_destroy = true }` a critical resources (databases, S3 buckets con state). Esto previene `terraform destroy` de delete them. Usa Sentinel o OPA policies para block destructive changes en CI. Review plans carefully en pull requests. Usa `terraform plan` en CI antes de merge. Require manual approval para production applies. Usa `create_before_destroy` lifecycle hook para resources que necesitan zero-downtime replacement.

## See Also

- [Complete Guide to GitOps in Production](/es/guides/complete-guide-gitops-production/)
- [Complete Guide to Kubernetes Networking](/es/guides/complete-guide-kubernetes-networking/)
- [Complete Guide to Terraform Modules](/es/guides/complete-guide-terraform-modules/)
- [Terraform Best Practices — Modules, State, and Workspaces](/es/guides/terraform-best-practices-guide/)
- [Multi-Cloud Strategies — Benefits, Pitfalls](/es/guides/multi-cloud-guide/)

