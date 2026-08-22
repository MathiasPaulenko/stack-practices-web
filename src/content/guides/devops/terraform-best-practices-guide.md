---
contentType: guides
slug: terraform-best-practices-guide
title: "Terraform Best Practices: Modules, State, and Workspaces"
description: "A practical guide to Terraform best practices: module design, remote state management, workspaces, and security for production-grade infrastructure as code."
metaDescription: "Learn Terraform best practices: module design, remote state, workspaces, and security. Build production-grade infrastructure as code with confidence."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - terraform
  - infrastructure-as-code
  - iac
  - modules
  - state
  - workspaces
  - devops
  - security
relatedResources:
  - /guides/complete-guide-terraform-modules
  - /recipes/terraform-aws-vpc
  - /recipes/terraform-remote-state-s3-backend
  - /recipes/terraform-workspace-environment-isolation
  - /recipes/python-terraform-provider-custom
  - /guides/platform-engineering-guide
lastUpdated: "2026-08-22"
publishedAt: "2026-06-24"
author: Mathias Paulenko
seo:
  metaDescription: "Learn Terraform best practices: module design, remote state, workspaces, and security. Build production-grade infrastructure as code with confidence."
  keywords:
    - terraform
    - infrastructure-as-code
    - iac
    - modules
    - remote-state
    - workspaces
    - security
    - hashicorp
---

Terraform has become the default infrastructure-as-code tool for many teams. They use it to define,
provision, and manage cloud resources through declarative configuration files. Getting started is
straightforward, but keeping it tidy at scale takes discipline around module design, state
management,
security, and collaboration. This guide covers the practices that separate prototype Terraform code
from infrastructure you can run in production.

## When to Use

Terraform pays off when you're managing cloud infrastructure that changes often, when several team
members touch the same resources, and when you need reproducible environments across dev, staging,
and production. It's also the right choice when you want your infrastructure definitions in version
control, or when you're moving from manual provisioning to infrastructure as code.

## When NOT to Use

Skip Terraform for a handful of static resources that rarely change. Don't force it on a team that
isn't ready to manage state files, locks, and backend access. And if you need real-time,
event-driven infrastructure reconciliation, tools like Ansible or Kubernetes operators are usually a
better fit.

## Module Design

### Root module vs child modules

```text
terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── database/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   └── main.tf
│   ├── staging/
│   │   └── main.tf
│   └── prod/
│       └── main.tf
```

### Module interface design

Keep inputs explicit and outputs minimal.

```hcl
# modules/vpc/variables.tf
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AZs to use"
  type        = list(string)
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}
```

### Composition over inheritance

Favor small modules that compose together instead of one monolithic block.

```hcl
# environments/prod/main.tf
module "vpc" {
  source             = "../../modules/vpc"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

module "database" {
  source          = "../../modules/database"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  instance_class  = "db.r6g.xlarge"
}
```

For a deeper dive, see [Complete Guide to Terraform
Modules](/guides/complete-guide-terraform-modules/).

## State Management

### Remote state with locking

Never store state in version control. Use remote backends with locking.

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```bash
# Create the backend resources
aws s3api create-bucket --bucket my-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket my-terraform-state --versioning-configuration Status=Enabled
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

For details, see [Terraform Remote State S3 Backend](/recipes/terraform-remote-state-s3-backend/).

### State isolation

Give each environment and each component its own state file.

| Approach | Best For |
| --- | --- |
| Workspaces | Simple environments (dev/staging/prod) |
| Separate directories | Complex environments with different configurations |
| Separate backends | Maximum isolation, different AWS accounts |

## Workspaces

Terraform workspaces allow several state files within the same configuration.

```bash
# Create and switch to a workspace
terraform workspace new prod
terraform workspace select prod

# Use workspace in configuration
locals {
  environment = terraform.workspace
  instance_count = {
    dev     = 1
    staging = 2
    prod    = 3
  }[terraform.workspace]
}
```

Workspaces share the same backend configuration. If you need real isolation, don't rely only on
workspaces; use separate backend configurations or even different cloud accounts. See [Terraform
Workspace Environment Isolation](/recipes/terraform-workspace-environment-isolation/).

## Security Practices

### Never commit secrets

```bash
# .gitignore
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
*.auto.tfvars
secrets.tfvars
```

### Use variables for sensitive data

```hcl
variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}
```

### Least privilege for CI/CD

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ec2:*", "rds:*", "s3:*"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {"aws:RequestedRegion": "us-east-1"}
      }
    },
    {
      "Effect": "Deny",
      "Action": ["ec2:DeleteVpc", "rds:DeleteDBInstance"],
      "Resource": "*"
    }
  ]
}
```

## Testing and Validation

### Static analysis

```bash
# Format check
terraform fmt -check -recursive

# Validate syntax
terraform validate

# Security scanning with Checkov
checkov -d .
```

### Plan review workflow

```bash
# Generate a plan file
terraform plan -out=tfplan

# Review the plan
terraform show tfplan

# Apply only the reviewed plan
terraform apply tfplan
```

## Explanation

Modules keep code DRY and reusable. Root modules call child modules and pass environment-specific
values through variables. Remote state stores the `.tfstate` file outside local disks: S3 gives you
durability, and DynamoDB gives you locking to prevent concurrent writes. Workspaces split state by
environment within a single backend. They're lightweight, but keep in mind they share the same
backend credentials. For strict separation, you're better off with separate backends.

Security starts with never committing secrets, marking variables as `sensitive`, and giving CI/CD
the smallest permissions needed. Validation with `terraform fmt`, `terraform validate`, and
`checkov`
catches syntax and security issues before apply.

## Common Mistakes

- **Storing state in Git**. State files can hold secrets and aren't designed for version-control
  resolution. Use a remote backend with encryption and versioning instead.
- **Hardcoding credentials**. Don't bake secrets into HCL. Pass them through variables, environment
  variables, or IAM roles and keep them out of the repository.
- **Monolithic modules**. Break infrastructure into small, reusable, testable modules rather than
    one
  giant file.
- **Skipping plan files**. A plan is your last line of defense. Generate it, review it, and only
    then
  apply.
- **Ignoring provider version pinning**. Pin provider and module versions to avoid surprise breaking
  changes.
- **No state locking**. Several engineers running Terraform at the same time can corrupt state. Use
    a
  backend that supports locking.

## FAQ

### Should I use Terraform Cloud?

Terraform Cloud and Enterprise provide remote state, team collaboration, and policy-as-code. For
small teams, an S3 + DynamoDB backend is usually enough.

### How do I manage secrets in Terraform?

Use environment variables (`TF_VAR_*`), HashiCorp Vault, or cloud secret managers such as AWS
Secrets Manager. Mark variables as `sensitive = true` so they don't show up in logs or plan output.

### When should I use modules vs workspaces?

Modules are for reusable infrastructure components. Workspaces are for environment-specific state
isolation. Use both: modules for DRY code, workspaces or separate directories for environment
separation.

### How do I handle remote state and locking?

A remote backend like S3 plus DynamoDB for locking is the standard setup. Enable `encrypt = true`
and
keep `.tfstate` files out of the repository. For larger teams, Terraform Cloud or Atlantis can push
changes through PRs.

### How do I get started with this in an existing project?

Pick a small, isolated part of the codebase — one module or service. Apply these practices there,
measure the impact, then expand.

## Advanced Topics

### Modular Terraform for production

```hcl
# Directory structure
# infra/
#   modules/
#     vpc/
#     eks/
#     rds/
#   environments/
#     dev/
#     staging/
#     production/

# modules/rds/main.tf
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "instance_class" { type = string }
variable "allocated_storage" { type = number, default = 100 }
variable "multi_az" { type = bool, default = true }
variable "backup_retention" { type = number, default = 7 }
variable "tags" { type = map(string), default = {} }

resource "aws_db_instance" "main" {
  engine = "postgres"
  engine_version = "16"
  instance_class = var.instance_class
  allocated_storage = var.allocated_storage
  multi_az = var.multi_az
  backup_retention_period = var.backup_retention
  storage_encrypted = true
  kms_key_id = aws_kms_key.rds.arn
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  tags = merge(var.tags, {
    Name = "postgres-main"
    ManagedBy = "terraform"
  })
}

resource "aws_kms_key" "rds" {
  description = "KMS key for RDS encryption"
  enable_key_rotation = true
}

resource "aws_db_subnet_group" "main" {
  name = "main-db-subnet-group"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "rds" {
  name = "rds-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port = 5432
    to_port = 5432
    protocol = "tcp"
    security_groups = [var.app_sg_id]
  }
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "endpoint" { value = aws_db_instance.main.endpoint }
output "db_arn" { value = aws_db_instance.main.arn }
```

```hcl
# environments/production/main.tf
module "rds" {
  source = "../../modules/rds"
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  instance_class = "db.r5.xlarge"
  allocated_storage = 500
  multi_az = true
  backup_retention = 30
  tags = { Environment = "production", Team = "platform" }
}

# Environment differences:
#   dev: db.t3.medium, 20GB, no multi-az, backup 1 day
#   staging: db.t3.large, 100GB, multi-az, backup 7 days
#   production: db.r5.xlarge, 500GB, multi-az, backup 30 days
```
