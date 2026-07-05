---
contentType: docs
slug: terraform-module-versioning-policy
templateType: guideline
title: "Terraform Module Versioning Policy"
description: "Policy for versioning and publishing Terraform modules: semantic versioning rules, breaking change management, module registry publishing, changelog requirements, deprecation process, and CI/CD integration with examples for Terraform Cloud and private registries."
metaDescription: "Terraform module versioning policy: semver rules, breaking changes, registry publishing, changelog, deprecation, CI/CD, Terraform Cloud, private registries."
difficulty: intermediate
topics:
  - devops
tags:
  - terraform
  - versioning
  - iac
  - devops
  - modules
  - ci-cd
  - infrastructure
relatedResources:
  - /docs/devops/docker-image-hardening-checklist
  - /docs/devops/kubernetes-resource-quotas-template
  - /docs/devops/deployment-rollback-runbook
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Terraform module versioning policy: semver rules, breaking changes, registry publishing, changelog, deprecation, CI/CD, Terraform Cloud, private registries."
  keywords:
    - terraform versioning
    - terraform modules
    - semantic versioning
    - terraform registry
    - module publishing
    - iac versioning
    - terraform ci cd
---

## Overview

This policy defines versioning and publishing rules for Terraform modules. It covers semantic versioning, breaking change management, module registry publishing, changelog requirements, deprecation, and CI/CD integration. Follow this policy when creating or updating shared Terraform modules used across teams.

---

## 1. Semantic Versioning Rules

### 1.1 Version Format

```text
Format: MAJOR.MINOR.PATCH (e.g., 2.3.1)

MAJOR (X.0.0) — Breaking changes
  - Variable renamed or removed
  - Resource type changed or removed
  - Output renamed or removed
  - Minimum Terraform version increased
  - Provider version constraint changed to incompatible

MINOR (0.X.0) — New features, backward compatible
  - New variable added (with default)
  - New resource added
  - New output added
  - New feature flag added

PATCH (0.0.X) — Bug fixes, backward compatible
  - Bug fix in resource configuration
  - Documentation update
  - Dependency version bump (compatible)
  - Example update
```

### 1.2 Pre-release Versions

```text
1.0.0-alpha.1   — Early preview, expect breaking changes
1.0.0-beta.1    — Feature complete, testing in progress
1.0.0-rc.1      — Release candidate, final testing
1.0.0           — Stable release
```

---

## 2. Module Structure

### 2.1 Required Files

```text
modules/
└── my-module/
    ├── main.tf          # Resource definitions
    ├── variables.tf     # Input variables
    ├── outputs.tf       # Output values
    ├── versions.tf      # Terraform and provider version constraints
    ├── README.md        # Module documentation
    ├── CHANGELOG.md     # Version history
    ├── examples/        # Usage examples
    │   └── basic/
    │       ├── main.tf
    │       └── README.md
    └── tests/
        └── basic_test.go  # Terratest or kitchen-terraform
```

### 2.2 versions.tf — Version Constraints

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}
```

### 2.3 README.md Template

```markdown
# my-module

Short description of what this module does.

## Usage

    module "my_module" {
      source  = "myorg/my-module/aws"
      version = "2.3.1"

      name = "my-app"
      environment = "production"
    }

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name | Resource name | string | n/a | yes |
| environment | Environment name | string | "production" | no |

## Outputs

| Name | Description |
|------|-------------|
| id | Resource ID |
| arn | Resource ARN |
```

---

## 3. Breaking Change Management

### 3.1 Breaking Change Checklist

```text
- [ ] Bump MAJOR version
- [ ] Document breaking change in CHANGELOG.md
- [ ] Provide migration guide in CHANGELOG.md
- [ ] Add deprecation notice in previous MINOR version
- [ ] Update all examples to use new API
- [ ] Run tests against new version
- [ ] Notify consuming teams via Slack/email
- [ ] Set deprecation date for old version (minimum 90 days)
- [ ] Create issue tracker for migration progress
- [ ] Update module documentation
```

### 3.2 Deprecation Pattern

```hcl
variable "instance_type" {
  description = "(Deprecated) Use `instance_types` instead. Will be removed in v3.0.0."
  type        = string
  default     = null
  deprecated  = true
}

variable "instance_types" {
  description = "List of instance types for the auto-scaling group"
  type        = list(string)
  default     = ["t3.micro"]
}
```

### 3.3 Migration Guide Template

```markdown
## Migration Guide: v1.x to v2.x

### Breaking Changes

1. `instance_type` variable removed → use `instance_types` (list)
2. `tags` output changed from `map(string)` to `map(any)`
3. Minimum Terraform version raised from 1.0 to 1.5

### Migration Steps

1. Update module version in your configuration:

       module "my_module" {
         source  = "myorg/my-module/aws"
         version = "2.0.0"
       }

2. Replace `instance_type` with `instance_types`:

       # Before (v1.x)
       module "my_module" {
         instance_type = "t3.micro"
       }

       # After (v2.x)
       module "my_module" {
         instance_types = ["t3.micro"]
       }

3. Run `terraform init -upgrade` to download the new version
4. Run `terraform plan` and review changes
5. Run `terraform apply` when ready
```

---

## 4. CHANGELOG Requirements

### 4.1 CHANGELOG Format

```markdown
# Changelog

## [2.3.1] - 2026-07-04

### Fixed
- Fixed IAM policy when `enable_logging` is false
- Fixed panic when `tags` is empty map

## [2.3.0] - 2026-06-15

### Added
- New variable `enable_monitoring` (default: false)
- New output `monitoring_dashboard_url`

### Changed
- Updated AWS provider constraint to >= 5.0, < 6.0

## [2.2.0] - 2026-05-01

### Added
- Support for `kms_key_id` in S3 bucket module

### Deprecated
- `instance_type` variable deprecated, use `instance_types`

## [2.0.0] - 2026-03-01

### Breaking
- `instance_type` removed, replaced with `instance_types` (list)
- `tags` output type changed from `map(string)` to `map(any)`
- Minimum Terraform version raised to 1.5
```

---

## 5. Module Registry Publishing

### 5.1 Terraform Registry (Public)

```bash
# Tag the release in git
git tag v2.3.1
git push origin v2.3.1

# Terraform Registry auto-detects tags from GitHub
# Module URL: terraform-aws-modules/s3-bucket/aws
# Version: 2.3.1
```

### 5.2 Private Registry (Terraform Cloud/Enterprise)

```bash
# Configure Terraform CLI for private registry
terraform login app.terraform.io

# Use module from private registry
module "my_module" {
  source  = "app.terraform.io/myorg/my-module/aws"
  version = "2.3.1"
}
```

### 5.3 Git-based Module Source

```hcl
# Tag-based versioning
module "my_module" {
  source = "git::https://github.com/myorg/terraform-modules.git//my-module?ref=v2.3.1"
}

# Branch-based (not recommended for production)
module "my_module" {
  source = "git::https://github.com/myorg/terraform-modules.git//my-module?ref=main"
}
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions — Module Release Pipeline

```yaml
name: Terraform Module Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform format check
        run: terraform fmt -check -recursive

      - name: Terraform validate
        run: |
          terraform init -backend=false
          terraform validate

      - name: Run Terratest
        run: |
          cd tests/
          go test -v -timeout 30m

      - name: Generate docs
        uses: terraform-docs/terraform-docs@v1.0.0
        with:
          output-file: README.md
          output-method: inject

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          body_path: CHANGELOG.md

      - name: Notify teams
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} -d "{
            \"text\": \"Terraform module ${{ github.ref_name }} released\"
          }"
```

### 6.2 Pre-Release Validation

```yaml
name: Terraform Module Validation
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        terraform_version: ['1.5.0', '1.6.0', '1.7.0']
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ matrix.terraform_version }}

      - name: Format check
        run: terraform fmt -check -recursive

      - name: Init
        run: terraform init -backend=false

      - name: Validate
        run: terraform validate

      - name: Security scan (tfsec)
        uses: aquasecurity/tfsec-action@v1.0.0

      - name: Cost estimation (infracost)
        uses: infracost/infracost-action@v3
        with:
          path: examples/basic
```

---

## 7. Version Pinning in Consuming Projects

### 7.1 Pinning Strategies

```text
Strategy              | Example              | Risk
──────────────────────┼──────────────────────┼──────────────────────────
Exact pin             | version = "2.3.1"   | No auto-updates, manual
Pessimistic constraint| version = "~> 2.3"  | Auto patch + minor updates
Pessimistic major     | version = "~> 2.0"  | Auto minor updates only
Range                 | version = ">= 2.0"  | Risky, may get breaking
Latest                | (no version)        | Very risky, not recommended
```

### 7.2 Recommended Pinning

```hcl
# Production — exact pin
module "production_db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.10.0"
}

# Staging — pessimistic constraint (auto patch updates)
module "staging_db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.10"
}

# Development — pessimistic major (auto minor + patch)
module "dev_db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"
}
```

## FAQ

### How do I know when to bump the major version?

Bump the major version when you make a change that requires consumers to modify their configuration. This includes: removing or renaming a variable, removing or renaming an output, changing a variable type (e.g., string to list), changing default behavior in a way that produces different resources, raising the minimum Terraform version, or changing provider version constraints to incompatible versions. When in doubt, bump major — it is safer to over-communicate breaking changes than to silently break someone's infrastructure. Add a deprecation notice in the current minor version before removing functionality in the next major.

### Should I use the Terraform Registry or git sources for internal modules?

Use the Terraform Private Registry (Terraform Cloud/Enterprise) if you have it — it provides version management, UI for browsing modules, and integration with Terraform Cloud workspaces. Use git sources with tag refs if you don't have a private registry: `git::https://github.com/myorg/modules.git//my-module?ref=v2.3.1`. Never use branch refs (e.g., `?ref=main`) for production — branch contents can change without warning. Tag refs are immutable and provide reproducible builds. Set up a private registry if you have more than 5 shared modules or more than 10 consuming teams.

### How do I deprecate a module without breaking existing consumers?

Add a `deprecated` flag to variables being removed. Add a deprecation notice in the README and CHANGELOG. Send a notification to consuming teams. Keep the old behavior working alongside the new behavior for at least one minor version. Set a deprecation date (minimum 90 days from announcement). After the deprecation date, release the next major version with the deprecated functionality removed. Track migration progress in your issue tracker. Provide a migration guide with before/after examples. Consider automated migration tooling for complex changes.

### What should I do if a module release has a bug?

If the bug is critical (breaks infrastructure or causes data loss), yank the release immediately. In Terraform Registry, you cannot delete a version, but you can mark it as deprecated in the README. Create a patch release (e.g., 2.3.2) with the fix. Notify all consuming teams via Slack/email. If the bug is non-critical, create a patch release and update the CHANGELOG. Do not force-push tags — this can cause inconsistent state across teams. If a tag was force-pushed, consumers who already downloaded the module will have the old version, while new downloads get the new version.

### How do I test a module before publishing?

Use Terratest or kitchen-terraform for automated testing. Write tests that deploy the module in a test AWS/GCP/Azure account, verify the resources are created correctly, and destroy them after testing. Run tests in CI on every PR. Test against multiple Terraform versions using a matrix build. Test against multiple provider versions if the module supports a range. Use `terraform plan` in CI to catch configuration errors without applying. Run tfsec or checkov for security scanning. Run infracost for cost estimation. Only publish after all tests pass and the PR is reviewed and merged.
