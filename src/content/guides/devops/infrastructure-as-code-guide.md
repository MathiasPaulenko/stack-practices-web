---
contentType: guides
slug: infrastructure-as-code-guide
title: "Infrastructure as Code — Terraform and Pulumi"
description: "A practical guide to managing infrastructure as code: benefits of declarative vs imperative approaches, state management, modules, and testing infrastructure changes."
metaDescription: "Infrastructure as Code guide: Terraform and Pulumi, declarative vs imperative, state management, modules, and testing infrastructure changes safely."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - guide
  - pulumi
  - terraform
  - ci-cd
relatedResources:
  - /guides/devops/cicd-pipeline-guide
  - /guides/devops/docker-for-developers-guide
  - /guides/devops/kubernetes-basics-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Infrastructure as Code guide: Terraform and Pulumi, declarative vs imperative, state management, modules, and testing infrastructure changes safely."
  keywords:
    - infrastructure as code
    - terraform vs pulumi
    - iac what works
    - terraform state management
    - declarative infrastructure
---

# Infrastructure as Code — Terraform and Pulumi

## Introduction

Infrastructure as Code (IaC) is the practice of managing and provisioning infrastructure through machine-readable definition files rather than manual configuration. It turns infrastructure changes into repeatable, reviewable, and versioned operations. See [CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) for deployment automation. This guide compares declarative and imperative approaches, covers Terraform and Pulumi, and provides what works for production use.

## Declarative vs Imperative

| Approach | You Say | Tool Handles | Examples |
|----------|---------|-------------|----------|
| **Declarative** | "I want this state" | How to get there | Terraform, CloudFormation, Pulumi |
| **Imperative** | "Do these steps" | Execution order | Ansible, Shell scripts, SDK calls |

**Declarative is preferred for infrastructure** because it handles drift detection, dependency ordering, and idempotency automatically.

## Terraform

HashiCorp's declarative tool. Define resources in HCL (HashiCorp Configuration Language) and Terraform plans and applies the changes.

```hcl
# main.tf — define a VPC and subnet
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "production-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  tags = { Name = "public-subnet" }
}
```

### Terraform Workflow

```bash
terraform init      # Download providers and modules
terraform plan      # Preview changes
terraform apply     # Execute changes
terraform destroy   # Tear down (use with caution)
```

### State Management

Terraform stores the mapping between your configuration and real resources in a state file.

| State Storage | Best For |
|--------------|----------|
| **Local file** | Solo development only |
| **S3 + DynamoDB** | Team workflows with locking |
| **Terraform Cloud** | Collaboration, remote execution, policy checks |

```hcl
# Remote state backend
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/vpc.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

**Critical rule:** Never edit state files manually. Use `terraform state` commands or fix the configuration and re-apply.

### Modules

Modules are reusable, parameterized infrastructure components.

```hcl
# modules/vpc/main.tf
variable "cidr_block" { type = string }
variable "azs" { type = list(string) }

resource "aws_vpc" "this" {
  cidr_block = var.cidr_block
  tags = { Name = "vpc" }
}

# root module usage
module "vpc" {
  source     = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
  azs        = ["us-east-1a", "us-east-1b"]
}
```

**Best practice:** Publish internal modules to a private registry. Version them like software.

## Pulumi

Pulumi uses general-purpose programming languages (TypeScript, Python, Go, C#) instead of HCL.

```typescript
// TypeScript: define a VPC with Pulumi
import * as aws from "@pulumi/aws";

const vpc = new aws.ec2.Vpc("main", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    tags: { Name: "production-vpc" },
});

const subnet = new aws.ec2.Subnet("public", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    tags: { Name: "public-subnet" },
});

export const vpcId = vpc.id;
```

### When to Choose Pulumi Over Terraform

| Use Pulumi When | Use Terraform When |
|-----------------|-------------------|
| Your team prefers programming languages over HCL | Your team already knows HCL |
| You need complex logic (loops, conditionals, abstraction) | Your infrastructure is mostly static resource declarations |
| You want to test infrastructure with unit tests | You want the largest ecosystem of modules and community support |
| You are building a platform or internal developer tooling | You need maturity and broad provider support |

## Testing Infrastructure

### Static Analysis

Validate before applying.

```bash
# Terraform: format and validate
terraform fmt -check
terraform validate

# TFLint: catch provider-specific mistakes
tflint --deep

# Checkov / Terraform-compliance: [security policies](/guides/security/security-best-practices-guide)
checkov -d .
```

### Plan Review

Always review the plan in CI before applying.

```bash
terraform plan -out=tfplan
terraform show -json tfplan > plan.json
# CI parses plan.json and checks for destructive changes
```

### Integration Testing

Test that the infrastructure actually works.

| Tool | Approach |
|------|----------|
| **Terratest** (Go) | Apply infrastructure, run assertions, destroy |
| **Kitchen-Terraform** | Ruby-based testing with Inspec |
| **Pulumi unit tests** | Mock providers and assert resource properties |

```go
// Terratest example
func TestVpc(t *testing.T) {
    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "../examples/vpc",
    })
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)
}
```

## What Works

- **Store code in version control** — every infrastructure change is a PR, reviewed, and logged
- **Use remote state with locking** — prevents concurrent modifications corrupting state
- **Separate environments** — use workspaces or separate state files per environment
- **Use modules for reusability** — but avoid over-abstraction; simple is better
- **Never commit secrets** — use [secret managers](/guides/security/security-best-practices-guide) (AWS Secrets Manager, Vault) and reference by ARN
- **Document your modules** — README with inputs, outputs, and usage examples
- **Pin provider versions** — prevent breaking changes from automatic provider updates

## Common Mistakes

- Running `terraform apply` locally instead of through [CI/CD](/guides/devops/cicd-pipeline-guide)
- Storing state files in Git (contains sensitive resource IDs and sometimes secrets)
- Not using workspaces or separate directories for environments
- Writing giant monolithic Terraform configs instead of modular components
- Ignoring plan output — the plan tells you what will be destroyed; read it
- Using `count` or `for_each` with resources that cannot be recreated without downtime

## Frequently Asked Questions

### Can I use Terraform and Pulumi together?

Yes, via Terraform state references or Pulumi's Terraform bridge. Migrate gradually: import existing Terraform state into Pulumi, or manage new resources with Pulumi while Terraform handles legacy.

### How do I handle secrets in IaC?

Never hardcode secrets. Use:
- Environment variables for non-sensitive config
- Secret managers (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) for sensitive values
- Terraform `sensitive = true` on outputs to prevent logging

### Should I apply Terraform from my laptop or CI/CD?

Always from CI/CD. Local applies are untraceable, unreviewed, and bypass approval workflows. Use Terraform Cloud, Atlantis, or a GitOps pipeline for all production changes.


## Advanced Topics

### Scenario: Modular IaC for Multi-Environment

```hcl
# Directory structure
# infra/
#   modules/
#     vpc/
#     eks/
#     rds/
#     redis/
#   environments/
#     dev/
#     staging/
#     production/
```

```hcl
# modules/vpc/main.tf
variable "cidr" { type = string }
variable "name" { type = string }
variable "region" { type = string }

resource "aws_vpc" "main" {
  cidr_block = var.cidr
  tags = { Name = "${var.name}-vpc", Environment = var.name }
}

resource "aws_subnet" "private" {
  count = 3
  vpc_id = aws_vpc.main.id
  cidr_block = cidrsubnet(var.cidr, 8, count.index)
  availability_zone = "${var.region}${element(["a","b","c"], count.index)}"
  tags = { Name = "${var.name}-private-${count.index}" }
}

resource "aws_subnet" "public" {
  count = 3
  vpc_id = aws_vpc.main.id
  cidr_block = cidrsubnet(var.cidr, 8, count.index + 100)
  availability_zone = "${var.region}${element(["a","b","c"], count.index)}"
  map_public_ip_on_launch = true
  tags = { Name = "${var.name}-public-${count.index}" }
}

output "vpc_id" { value = aws_vpc.main.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
```

```hcl
# environments/production/main.tf
module "vpc" {
  source = "../../modules/vpc"
  cidr = "10.0.0.0/16"
  name = "production"
  region = "us-east-1"
}

module "eks" {
  source = "../../modules/eks"
  cluster_name = "production-cluster"
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  node_count = 5
  node_type = "m5.large"
}

module "rds" {
  source = "../../modules/rds"
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  instance_class = "db.r5.xlarge"
  allocated_storage = 500
  multi_az = true
  backup_retention = 30
}

terraform {
  backend "s3" {
    bucket = "tf-state-production"
    key = "infra/terraform.tfstate"
    region = "us-east-1"
    dynamodb_table = "tf-locks"
    encrypt = true
  }
}

# Environment differences:
#   dev: 1 node, db.t3.medium, no multi-az
#   staging: 3 nodes, db.t3.large, multi-az
#   production: 5 nodes, db.r5.xlarge, multi-az, backup 30 days
```

### How do I handle infrastructure drift?

Run `terraform plan` daily via CI/CD. If it detects drift (someone changed something manually), notify the team. Never apply manual changes in the console. If there is drift, import it to state with `terraform import` or revert it. Document who and why made the manual change. Drift is a symptom that your IaC does not cover a use case.
