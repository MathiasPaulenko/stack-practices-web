---
contentType: recipes
slug: terraform-workspace-environment-isolation
title: "Isolate Environments with Terraform Workspaces"
description: "How to use Terraform workspaces for environment isolation, covering workspace creation, conditional resources, variable management, and migration to separate state files."
metaDescription: "Isolate environments with Terraform workspaces. Create workspaces, conditional resources, variable management, and migrate to separate state files when needed."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - terraform
  - workspaces
  - environments
  - infrastructure
  - recipe
relatedResources:
  - /recipes/devops/terraform-remote-state-s3-backend
  - /recipes/devops/github-actions-reusable-workflows
  - /recipes/devops/kubernetes-helm-chart-templating
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Isolate environments with Terraform workspaces. Create workspaces, conditional resources, variable management, and migrate to separate state files when needed."
  keywords:
    - devops
    - terraform
    - workspaces
    - environments
    - infrastructure
    - recipe
---

## Overview

Terraform workspaces let you use the same configuration to manage multiple environments (dev, staging, production). Each workspace has its own state file but shares the same configuration files. You switch between workspaces with `terraform workspace select`, and Terraform uses `terraform.workspace` to conditionally apply different settings — instance sizes, replica counts, feature flags.

## When to Use

- Same infrastructure across dev, staging, and production with minor variations
- Quick environment spin-up for testing or demos
- When you want one codebase for all environments
- Temporary environments (e.g., per-PR or per-branch environments)

## When NOT to Use

- Production infrastructure with strict isolation requirements — use separate state files instead
- When environments differ considerably — workspaces become a tangle of conditionals
- When different environments use different AWS accounts — use separate backend configs
- When you need different provider configurations per environment — workspaces can't do this

## Solution

### Basic workspace setup

```bash
# List workspaces (default always exists)
terraform workspace list

# Create new workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Switch workspace
terraform workspace select dev

# Show current workspace
terraform workspace show
```

### Backend with workspace-specific state

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

### Environment-specific configuration

```hcl
# variables.tf
variable "environment" {
  type    = string
  default = terraform.workspace
}

locals {
  env_config = {
    dev = {
      instance_type  = "t3.micro"
      min_capacity   = 1
      max_capacity   = 2
      db_instance    = "db.t3.micro"
      enable_monitoring = false
    }
    staging = {
      instance_type  = "t3.small"
      min_capacity   = 2
      max_capacity   = 4
      db_instance    = "db.t3.small"
      enable_monitoring = true
    }
    production = {
      instance_type  = "t3.medium"
      min_capacity   = 3
      max_capacity   = 10
      db_instance    = "db.t3.medium"
      enable_monitoring = true
    }
  }

  config = local.env_config[terraform.workspace]
}
```

### Conditional resources

```hcl
# main.tf

# Always created
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name        = "vpc-${terraform.workspace}"
    Environment = terraform.workspace
  }
}

# Only in staging and production
resource "aws_cloudwatch_log_group" "app" {
  count             = local.config.enable_monitoring ? 1 : 0
  name              = "/app/${terraform.workspace}"
  retention_in_days = terraform.workspace == "production" ? 90 : 30
}

# Only in production
resource "aws_db_instance" "read_replica" {
  count                     = terraform.workspace == "production" ? 1 : 0
  identifier                = "db-replica-${terraform.workspace}"
  replicate_source_db       = aws_db_instance.primary.id
  instance_class            = local.config.db_instance
  skip_final_snapshot       = true
}
```

### Resource naming with workspace

```hcl
resource "aws_s3_bucket" "app_data" {
  bucket = "my-app-${terraform.workspace}-data"

  tags = {
    Name        = "my-app-${terraform.workspace}-data"
    Environment = terraform.workspace
  }
}

resource "aws_db_instance" "primary" {
  identifier     = "db-${terraform.workspace}"
  engine         = "postgres"
  instance_class = local.config.db_instance
  allocated_storage = 20

  tags = {
    Environment = terraform.workspace
  }
}
```

### Auto Scaling with workspace-specific values

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "asg-${terraform.workspace}"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = local.config.min_capacity
  max_size            = local.config.max_capacity
  desired_capacity    = local.config.min_capacity

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Environment"
    value               = terraform.workspace
    propagate_at_launch = true
  }
}
```

### tfvars per workspace

```hcl
# dev.tfvars
instance_count = 1
enable_ssl     = false
log_level      = "debug"

# staging.tfvars
instance_count = 2
enable_ssl     = true
log_level      = "info"

# production.tfvars
instance_count = 5
enable_ssl     = true
log_level      = "warn"
```

```bash
# Apply with workspace-specific tfvars
terraform workspace select dev
terraform apply -var-file="dev.tfvars"

terraform workspace select production
terraform apply -var-file="production.tfvars"
```

### Workspace with modules

```hcl
module "app" {
  source = "./modules/app"

  environment   = terraform.workspace
  instance_type = local.config.instance_type
  min_capacity  = local.config.min_capacity
  max_capacity  = local.config.max_capacity

  # Production-only features
  enable_cross_zone_load_balancing = terraform.workspace == "production"
  enable_deletion_protection       = terraform.workspace == "production"
}
```

### CI/CD with workspaces

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main, develop]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - uses: hashicorp/setup-terraform@v3

      - name: Select workspace
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            terraform workspace select production
          else
            terraform workspace select dev
          fi

      - name: Terraform Plan
        run: terraform plan -var-file="${{ github.ref == 'refs/heads/main' && 'production' || 'dev' }}.tfvars"

      - name: Terraform Apply
        if: github.event_name == 'push'
        run: terraform apply -auto-approve -var-file="${{ github.ref == 'refs/heads/main' && 'production' || 'dev' }}.tfvars"
```

### Temporary workspaces for PRs

```bash
# Create a temporary workspace for a PR
terraform workspace new pr-123

# Apply with dev config
terraform apply -var-file="dev.tfvars"

# ... test the PR ...

# Clean up
terraform workspace select dev
terraform workspace delete pr-123
```

### Workspace deletion with state cleanup

```bash
# Before deleting a workspace, destroy its resources
terraform workspace select pr-123
terraform destroy -auto-approve

# Switch to another workspace (can't delete current)
terraform workspace select default

# Delete the workspace
terraform workspace delete pr-123
```

## Variants

### Using workspaces with locals for tags

```hcl
locals {
  common_tags = {
    Environment = terraform.workspace
    ManagedBy   = "terraform"
    Project     = "my-app"
  }

  env_specific_tags = {
    dev = { Owner = "dev-team" }
    staging = { Owner = "qa-team" }
    production = { Owner = "ops-team" }
  }

  tags = merge(
    local.common_tags,
    local.env_specific_tags[terraform.workspace]
  )
}

resource "aws_instance" "app" {
  count         = local.config.instance_count
  instance_type = local.config.instance_type

  tags = merge(local.tags, {
    Name = "app-${terraform.workspace}-${count.index + 1}"
  })
}
```

### Workspace with different AWS providers

```hcl
# Note: workspaces can't change provider config directly
# Use separate state files for different AWS accounts instead

# For same account, different regions:
provider "aws" {
  region = terraform.workspace == "production" ? "us-east-1" : "us-west-2"
}
```

### Migrating from workspaces to separate state files

```bash
# 1. Export current workspace state
terraform workspace select production
terraform state pull > production.tfstate

# 2. Create a new backend config for production
# backend.tf (production)
terraform {
  backend "s3" {
    bucket = "my-company-terraform-state"
    key    = "production/terraform.tfstate"
    # ...
  }
}

# 3. Initialize with the new backend and import state
terraform init -reconfigure
terraform state push production.tfstate

# 4. Verify
terraform state list
```

## Best Practices

- Use workspaces for similar environments — dev/staging/production with minor variations
- Keep conditional logic simple — complex conditionals make the code hard to maintain
- Tag all resources with `terraform.workspace` — makes it easy to filter and audit
- Use tfvars files per workspace — separates config from logic
- Don't use workspaces for different AWS accounts — use separate backend configs
- Clean up temporary workspaces — orphaned workspaces leave orphaned resources
- Use `terraform workspace show` in scripts — ensures you're applying to the right environment
- Consider migrating to separate state files as environments diverge — workspaces have limits

## Common Mistakes

- **Using workspaces for different AWS accounts**: workspaces share the same provider config. Use separate backend configs or directories instead.
- **Forgetting to switch workspaces**: applying to the wrong workspace can destroy production resources. Always verify with `terraform workspace show`.
- **Complex conditional logic**: if your code is 50% conditionals, it's time for separate state files or modules.
- **Not cleaning up temporary workspaces**: orphaned workspaces have orphaned resources that keep running and costing money.
- **Not tagging with workspace name**: without tags, you can't tell which resources belong to which environment in the AWS console.

## FAQ

### What is a Terraform workspace?

A named container for a Terraform state. Each workspace has its own state file but shares the same configuration. Switch between them with `terraform workspace select`.

### When should I use workspaces vs separate state files?

Use workspaces when environments are similar (same infrastructure, different sizes/counts). Use separate state files when environments differ considerably or use different AWS accounts.

### Can I have different providers per workspace?

No. Workspaces share the same provider configuration. For different providers (e.g., different AWS accounts), use separate directories with separate backend configs.

### How do I delete a workspace?

First destroy all resources in it (`terraform destroy`), switch to another workspace, then run `terraform workspace delete <name>`. You can't delete the `default` workspace or the currently selected workspace.

### Are workspaces the same as Terraform Cloud workspaces?

No. Terraform Cloud workspaces are separate entities with their own VCS connections, variables, and run settings. CLI workspaces are just separate state files sharing the same config.
