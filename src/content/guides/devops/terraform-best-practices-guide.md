---
contentType: guides
slug: terraform-best-practices-guide
title: "Terraform Best Practices — Modules, State, and Workspaces"
description: "A practical guide to Terraform best practices: module design, remote state management, workspaces, and security for production-grade infrastructure as code."
metaDescription: "Learn Terraform best practices: module design, remote state, workspaces, and security. Build production-grade infrastructure as code with confidence."
difficulty: intermediate
topics:
  - devops
  - infrastructure
  - data
tags:
  - terraform
  - infrastructure-as-code
  - iac
  - modules
  - remote-state
  - workspaces
  - hashicorp
  - guide
relatedResources:
  - /guides/aws-basics-guide
  - /guides/azure-basics-guide
  - /guides/gcp-basics-guide
  - /guides/kubernetes-advanced-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn Terraform best practices: module design, remote state, workspaces, and security. Build production-grade infrastructure as code with confidence."
  keywords:
    - terraform
    - infrastructure-as-code
    - iac
    - modules
    - remote-state
    - workspaces
    - hashicorp
    - guide
---

## Overview

Terraform is the most widely used infrastructure-as-code tool, enabling teams to define, provision, and manage cloud resources through declarative configuration files. While getting started with Terraform is straightforward, building production-grade infrastructure requires discipline around module design, state management, security, and collaboration workflows. This guide covers the practices that separate prototype Terraform code from enterprise-ready infrastructure.

## When to Use

- You manage cloud infrastructure that changes frequently
- Multiple team members need to collaborate on infrastructure
- You need reproducible environments (dev, staging, production)
- You want to version control your infrastructure definitions

## Module Design

### Root Module vs Child Modules

```
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

### Module Interface Design

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

### Composition Over Inheritance

Build small, composable modules rather than monolithic ones.

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

## State Management

### Remote State with Locking

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

### State Isolation

Use separate state files per environment and per component.

| Approach | Best For |
|----------|----------|
| Workspaces | Simple environments (dev/staging/prod) |
| Separate directories | Complex environments with different configurations |
| Separate backends | Maximum isolation, different AWS accounts |

## Workspaces

Terraform workspaces allow multiple state files within the same configuration.

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

Caution: Workspaces share the same backend configuration. For strong isolation, use separate backend configurations or even separate cloud accounts.

## Security Practices

### Never Commit Secrets

```bash
# .gitignore
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
*.auto.tfvars
secrets.tfvars
```

### Use Variables for Sensitive Data

```hcl
variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}
```

### Least Privilege for CI/CD

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

### Static Analysis

```bash
# Format check
terraform fmt -check -recursive

# Validate syntax
terraform validate

# Security scanning with Checkov
checkov -d .
```

### Plan Review Workflow

```bash
# Generate a plan file
terraform plan -out=tfplan

# Review the plan
terraform show tfplan

# Apply only the reviewed plan
terraform apply tfplan
```

## Common Mistakes

- **Storing state in Git** — use remote backends with encryption and versioning
- **Hardcoding credentials** — use variables, environment variables, or IAM roles
- **Monolithic modules** — break into small, reusable, testable modules
- **Not using plan files** — always review plans before applying
- **Ignoring provider version pinning** — pin versions to prevent breaking changes
- **No state locking** — multiple engineers running terraform simultaneously corrupt state

## FAQ

**Should I use Terraform Cloud?**
Terraform Cloud/Enterprise provides remote state, team collaboration, and policy-as-code. For small teams, S3 + DynamoDB backend is sufficient.

**How do I manage secrets in Terraform?**
Use environment variables (TF_VAR_*), HashiCorp Vault, or cloud secret managers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager). Mark variables as `sensitive = true`.

**When should I use modules vs workspaces?**
Modules are for reusable infrastructure components. Workspaces are for environment-specific state isolation. Use both: modules for DRY code, workspaces (or separate directories) for environment separation.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
