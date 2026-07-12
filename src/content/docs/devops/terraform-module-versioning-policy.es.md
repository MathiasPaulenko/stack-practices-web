---


contentType: docs
slug: terraform-module-versioning-policy
templateType: guideline
title: "Politica de Versioning de Terraform Modules"
description: "Politica para versioning y publishing de Terraform modules: semantic versioning rules, breaking change management, module registry publishing, changelog requirements, deprecation process y CI/CD integration con ejemplos para Terraform Cloud y private registries."
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
  - /docs/docker-image-hardening-checklist
  - /docs/kubernetes-resource-quotas-template
  - /docs/deployment-rollback-runbook
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

Esta politica define versioning y publishing rules para Terraform modules. Cubre semantic versioning, breaking change management, module registry publishing, changelog requirements, deprecation y CI/CD integration. Followea esta politica cuando creas o updateas shared Terraform modules usados across teams.

---

## 1. Semantic Versioning Rules

### 1.1 Version Format

```text
Format: MAJOR.MINOR.PATCH (e.g., 2.3.1)

MAJOR (X.0.0) — Breaking changes
  - Variable renamed o removed
  - Resource type changed o removed
  - Output renamed o removed
  - Minimum Terraform version increased
  - Provider version constraint changed a incompatible

MINOR (0.X.0) — New features, backward compatible
  - New variable added (con default)
  - New resource added
  - New output added
  - New feature flag added

PATCH (0.0.X) — Bug fixes, backward compatible
  - Bug fix en resource configuration
  - Documentation update
  - Dependency version bump (compatible)
  - Example update
```

### 1.2 Pre-release Versions

```text
1.0.0-alpha.1   — Early preview, expect breaking changes
1.0.0-beta.1    — Feature complete, testing en progress
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
    ├── versions.tf      # Terraform y provider version constraints
    ├── README.md        # Module documentation
    ├── CHANGELOG.md     # Version history
    ├── examples/        # Usage examples
    │   └── basic/
    │       ├── main.tf
    │       └── README.md
    └── tests/
        └── basic_test.go  # Terratest o kitchen-terraform
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

Short description de que hace este module.

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
- [ ] Bumpea MAJOR version
- [ ] Documenta breaking change en CHANGELOG.md
- [ ] Provee migration guide en CHANGELOG.md
- [ ] Add deprecation notice en previous MINOR version
- [ ] Updatea all examples para usar new API
- [ ] Corre tests contra new version
- [ ] Notifica consuming teams via Slack/email
- [ ] Setea deprecation date para old version (minimum 90 days)
- [ ] Crea issue tracker para migration progress
- [ ] Updatea module documentation
```

### 3.2 Deprecation Pattern

```hcl
variable "instance_type" {
  description = "(Deprecated) Usa `instance_types` en vez. Se removera en v3.0.0."
  type        = string
  default     = null
  deprecated  = true
}

variable "instance_types" {
  description = "Lista de instance types para el auto-scaling group"
  type        = list(string)
  default     = ["t3.micro"]
}
```

### 3.3 Migration Guide Template

```markdown
## Migration Guide: v1.x a v2.x

### Breaking Changes

1. `instance_type` variable removed → usa `instance_types` (list)
2. `tags` output changed de `map(string)` a `map(any)`
3. Minimum Terraform version raised de 1.0 a 1.5

### Migration Steps

1. Updatea module version en tu configuration:

       module "my_module" {
         source  = "myorg/my-module/aws"
         version = "2.0.0"
       }

2. Reemplaza `instance_type` con `instance_types`:

       # Before (v1.x)
       module "my_module" {
         instance_type = "t3.micro"
       }

       # After (v2.x)
       module "my_module" {
         instance_types = ["t3.micro"]
       }

3. Corre `terraform init -upgrade` para downloadear el new version
4. Corre `terraform plan` y reviewa changes
5. Corre `terraform apply` cuando ready
```

---

## 4. CHANGELOG Requirements

### 4.1 CHANGELOG Format

```markdown
# Changelog

## [2.3.1] - 2026-07-04

### Fixed
- Fixeo IAM policy cuando `enable_logging` es false
- Fixeo panic cuando `tags` es empty map

## [2.3.0] - 2026-06-15

### Added
- New variable `enable_monitoring` (default: false)
- New output `monitoring_dashboard_url`

### Changed
- Updateo AWS provider constraint a >= 5.0, < 6.0

## [2.2.0] - 2026-05-01

### Added
- Support para `kms_key_id` en S3 bucket module

### Deprecated
- `instance_type` variable deprecated, usa `instance_types`

## [2.0.0] - 2026-03-01

### Breaking
- `instance_type` removed, replaced con `instance_types` (list)
- `tags` output type changed de `map(string)` a `map(any)`
- Minimum Terraform version raised a 1.5
```

---

## 5. Module Registry Publishing

### 5.1 Terraform Registry (Public)

```bash
# Tagea el release en git
git tag v2.3.1
git push origin v2.3.1

# Terraform Registry auto-detecta tags desde GitHub
# Module URL: terraform-aws-modules/s3-bucket/aws
# Version: 2.3.1
```

### 5.2 Private Registry (Terraform Cloud/Enterprise)

```bash
# Configura Terraform CLI para private registry
terraform login app.terraform.io

# Usa module desde private registry
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

# Branch-based (not recommended para production)
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

      - name: Corre Terratest
        run: |
          cd tests/
          go test -v -timeout 30m

      - name: Genera docs
        uses: terraform-docs/terraform-docs@v1.0.0
        with:
          output-file: README.md
          output-method: inject

      - name: Crea GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          body_path: CHANGELOG.md

      - name: Notifica teams
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

## 7. Version Pinning en Consuming Projects

### 7.1 Pinning Strategies

```text
Strategy              | Example              | Risk
──────────────────────┼──────────────────────┼──────────────────────────
Exact pin             | version = "2.3.1"   | No auto-updates, manual
Pessimistic constraint| version = "~> 2.3"  | Auto patch + minor updates
Pessimistic major     | version = "~> 2.0"  | Auto minor updates only
Range                 | version = ">= 2.0"  | Risky, puede get breaking
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

## Preguntas Frecuentes

### ¿Cómo se cuando bumpear el major version?

Bumpea el major version cuando haces un change que require que consumers modifyeen su configuration. Esto incluye: removeer o renamear un variable, removeer o renamear un output, cambiar un variable type (e.g., string a list), cambiar default behavior de una manera que produce different resources, raiseear el minimum Terraform version, o cambiar provider version constraints a incompatible versions. Cuando dudes, bumpea major — es safer over-communicar breaking changes que silently breakear alguien's infrastructure. Add un deprecation notice en el current minor version antes de removeer functionality en el next major.

### ¿Deberia usar Terraform Registry o git sources para internal modules?

Usa el Terraform Private Registry (Terraform Cloud/Enterprise) si lo tienes — provee version management, UI para browsear modules e integration con Terraform Cloud workspaces. Usa git sources con tag refs si no tienes un private registry: `git::https://github.com/myorg/modules.git//my-module?ref=v2.3.1`. Nunca uses branch refs (e.g., `?ref=main`) para production — branch contents pueden cambiar sin warning. Tag refs son immutable y proveen reproducible builds. Setea up un private registry si tienes mas de 5 shared modules o mas de 10 consuming teams.

### ¿Cómo deprecateo un module sin breakear existing consumers?

Add un `deprecated` flag a variables siendo removed. Add un deprecation notice en el README y CHANGELOG. Sendea un notification a consuming teams. Keepea el old behavior working alongside el new behavior por al menos un minor version. Setea un deprecation date (minimum 90 days desde announcement). Despues del deprecation date, releasea el next major version con el deprecated functionality removed. Trackea migration progress en tu issue tracker. Provee un migration guide con before/after examples. Considera automated migration tooling para complex changes.

### ¿Qué deberia hacer si un module release tiene un bug?

Si el bug es critical (breakea infrastructure o causa data loss), yankea el release immediately. En Terraform Registry, no puedes deletear un version, pero puedes markearlo como deprecated en el README. Crea un patch release (e.g., 2.3.2) con el fix. Notifica all consuming teams via Slack/email. Si el bug es non-critical, crea un patch release y updatea el CHANGELOG. No force-pushees tags — esto puede causar inconsistent state across teams. Si un tag se force-pusheo, consumers que ya downloadearon el module tendran el old version, mientras new downloads get el new version.

### ¿Cómo testeo un module antes de publicar?

Usa Terratest o kitchen-terraform para automated testing. Escriebe tests que deployeen el module en un test AWS/GCP/Azure account, verifiquen que los resources se created correctly y destroyeen despues de testing. Corre tests en CI en every PR. Testea contra multiple Terraform versions usando un matrix build. Testea contra multiple provider versions si el module supportea un range. Usa `terraform plan` en CI para catchear configuration errors sin applyear. Corre tfsec o checkov para security scanning. Corre infracost para cost estimation. Solo publica despues que all tests pasen y el PR se reviewed y merged.

## See Also

- [Complete Guide to Terraform Modules](/es/guides/complete-guide-terraform-modules/)
- [Complete Guide to Terraform in Production](/es/guides/complete-guide-terraform-production/)
- [Infrastructure as Code — Terraform and Pulumi](/es/guides/infrastructure-as-code-guide/)
- [Terraform Best Practices — Modules, State, and Workspaces](/es/guides/terraform-best-practices-guide/)
- [Background Jobs](/es/recipes/background-jobs/)

