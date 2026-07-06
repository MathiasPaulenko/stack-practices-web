---
contentType: guides
slug: complete-guide-terraform-modules
title: "Complete Guide to Terraform Modules"
description: "Build reusable Terraform modules with proper structure, inputs, outputs, and versioning. Covers module composition, testing, and registry publishing."
metaDescription: "Complete guide to Terraform modules. Build reusable infrastructure with proper structure, variables, outputs, versioning, testing, and registry publishing."
difficulty: intermediate
topics:
  - infrastructure
  - devops
tags:
  - terraform
  - modules
  - infrastructure-as-code
  - iac
  - reusability
  - versioning
  - guide
  - devops
relatedResources:
  - /guides/devops/infrastructure-as-code-guide
  - /guides/devops/terraform-best-practices-guide
  - /guides/devops/deployment-strategies-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to Terraform modules. Build reusable infrastructure with proper structure, variables, outputs, versioning, testing, and registry publishing."
  keywords:
    - terraform modules
    - terraform module structure
    - reusable terraform
    - terraform versioning
    - terraform testing
    - terraform registry
    - infrastructure as code
---

# Complete Guide to Terraform Modules

## Introduction

Terraform modules encapsulate infrastructure resources into reusable, composable units. A well-structured module lets you provision the same infrastructure across environments (dev, staging, prod) with different configurations. This guide walks through module structure, inputs/outputs, composition, versioning, testing, and publishing to the Terraform Registry.

## Module Structure

```
modules/
└── vpc/
    ├── main.tf          # Resource definitions
    ├── variables.tf     # Input variables
    ├── outputs.tf       # Output values
    ├── versions.tf      # Required Terraform and provider versions
    ├── README.md        # Module documentation
    └── examples/
        └── basic/
            └── main.tf  # Usage example
```

### main.tf

```hcl
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = var.enable_dns_support
  enable_dns_hostnames = var.enable_dns_hostnames

  tags = merge(
    {
      Name = var.name
    },
    var.tags
  )
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnets)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.public_subnets[count.index]
  availability_zone = var.azs[count.index]

  map_public_ip_on_launch = true

  tags = merge(
    {
      Name = "${var.name}-public-${count.index + 1}"
    },
    var.tags
  )
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnets)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(
    {
      Name = "${var.name}-private-${count.index + 1}"
    },
    var.tags
  )
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(
    {
      Name = var.name
    },
    var.tags
  )
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(
    {
      Name = "${var.name}-public"
    },
    var.tags
  )
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

### variables.tf

```hcl
variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnets" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "enable_dns_support" {
  description = "Enable DNS support in the VPC"
  type        = bool
  default     = true
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
```

### outputs.tf

```hcl
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.this.id
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}
```

### versions.tf

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Consuming a Module

```hcl
module "vpc" {
  source = "git::https://github.com/example/terraform-modules.git//vpc?ref=v1.2.0"

  name           = "production-vpc"
  cidr_block     = "10.10.0.0/16"
  azs            = ["us-east-1a", "us-east-1b"]
  public_subnets = ["10.10.1.0/24", "10.10.2.0/24"]
  private_subnets = ["10.10.101.0/24", "10.10.102.0/24"]

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

module "eks" {
  source = "git::https://github.com/example/terraform-modules.git//eks?ref=v1.2.0"

  name           = "production-cluster"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  cluster_version = "1.28"
}
```

## Module Composition

```hcl
# modules/landing-zone/main.tf
module "vpc" {
  source = "../vpc"

  name        = "${var.name}-vpc"
  cidr_block  = var.vpc_cidr
  azs         = var.azs
  tags        = var.tags
}

module "security_groups" {
  source = "../security-groups"

  vpc_id = module.vpc.vpc_id
  name   = var.name
  tags   = var.tags
}

module "eks" {
  source = "../eks"

  name             = "${var.name}-cluster"
  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  cluster_version  = var.kubernetes_version
  node_groups      = var.node_groups
  tags             = var.tags

  depends_on = [module.security_groups]
}
```

## Testing with Terratest

```go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVpcModule(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/basic",
        Vars: map[string]interface{}{
            "name":       "terratest-vpc",
            "cidr_block": "10.99.0.0/16",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)

    publicSubnets := terraform.OutputList(t, terraformOptions, "public_subnet_ids")
    assert.Len(t, publicSubnets, 3)
}
```

## Versioning Strategy

| Version | Meaning | When to Bump |
|---------|---------|-------------|
| **1.0.0** | Initial stable release | First stable release |
| **1.1.0** | New feature (backward compatible) | New optional variable, new output |
| **1.2.0** | Another feature | New resource, new default |
| **2.0.0** | Breaking change | Removed variable, changed default, renamed output |

### Git tags for module versions

```bash
git tag v1.0.0 -m "Initial release"
git tag v1.1.0 -m "Add NAT gateway support"
git tag v2.0.0 -m "Breaking: rename public_subnets to public_subnet_cidrs"
git push origin --tags
```

## Best Practices

- **One module per resource type** — a VPC module, an EKS module, an RDS module
- **Use `for_each` over `count`** when possible — avoids resource recreation on list changes
- **Provide sensible defaults** — modules should work with minimal inputs
- **Use `validation` blocks** — catch invalid inputs early
- **Document every variable** — description is mandatory, examples are recommended
- **Use `variable_validation`** — enforce constraints at plan time
- **Keep modules small and focused** — compose modules rather than building mega-modules
- **Use `locals` for computed values** — keep main.tf readable
- **Tag everything** — use `merge(var.tags, {Name = ...})` pattern
- **Pin provider versions** — use `~>` for minor version constraints
- **Use `terraform fmt` and `terraform validate`** — never commit unformatted code
- **Write examples** — every module should have at least one working example

## Common Mistakes

- Hardcoding values that should be variables — modules are not reusable
- Not setting `required_version` — module breaks on old Terraform versions
- Using `count` with lists — removing an item shifts all subsequent resources
- Not providing outputs — consumers cannot reference module resources
- Mixing multiple resource types in one module — violates single responsibility
- Not testing modules — infrastructure bugs are expensive
- Using `latest` for provider versions — reproducibility is lost
- Not versioning modules — consumers cannot pin a known-good version
- Ignoring `terraform validate` — syntax errors surface at apply time

## Frequently Asked Questions

### Should I use the Terraform Registry or private Git repos?

Use the Terraform Registry for open-source modules that others can benefit from. Use private Git repos for organization-specific modules. Both support version pinning via `?ref=v1.0.0`.

### How do I migrate from count to for_each?

Add a `for_each` version of the resource alongside the `count` version. Use `moved` blocks to tell Terraform the resources are the same:

```hcl
moved {
  from = aws_subnet.public[0]
  to   = aws_subnet.public["a"]
}
```

### Should modules manage state?

No. Modules define resources. The root configuration that calls the module manages state. This keeps modules portable across state backends.
