---
contentType: recipes
slug: terraform-remote-state-s3-backend
title: "Almacenar Terraform State en S3 con DynamoDB Locking"
description: "Cómo configurar Terraform remote state con S3 backend y DynamoDB locking, cubriendo state isolation, workspace management, encryption e integración con CI/CD."
metaDescription: "Configura Terraform remote state con S3 backend y DynamoDB locking. State isolation, workspace management, encryption e integración con CI/CD."
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
  metaDescription: "Configura Terraform remote state con S3 backend y DynamoDB locking. State isolation, workspace management, encryption e integración con CI/CD."
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

Terraform almacena el infrastructure state en un archivo local por default. Para colaboración en equipo y CI/CD, necesitás remote state almacenado en un backend compartido. El S3 backend almacena state en un S3 bucket con optional DynamoDB table para state locking — previniendo que runs concurrentes corrompan el state. Este setup es el estándar para workflows de Terraform basados en AWS.

## When to Use

- Colaboración en equipo — múltiples ingenieros aplicando cambios de Terraform
- Pipelines CI/CD — Terraform corre en GitHub Actions, Jenkins o GitLab CI
- Infraestructura de producción — el state debe ser durable, encrypted y locked
- Setups multi-entorno — state separado por entorno (dev, staging, prod)
- Cuando necesitás versioning de state — S3 versioning provee rollback capability

## When NOT to Use

- Desarrollador único, Terraform local-only — local state es más simple
- Cuando usás Terraform Cloud/Atlantis — ellos manejan el state por vos
- Infraestructura non-AWS — usá Azure Blob o GCS backends en su lugar
- Prototipos rápidos — local state está bien para infraestructura desechable

## Solution

### Bootstrapear los recursos del backend

```hcl
# bootstrap.tf — Corré esto una vez para crear el S3 bucket y DynamoDB table
# Después de aplicar, puede ser removido o guardado en un repo separado

resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-company-terraform-state"

  lifecycle {
    prevent_destroy = true  # Prevenir deletion accidental
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

### Configurar el S3 backend

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

### Inicializar con backend

```bash
# Inicializar Terraform con el S3 backend
terraform init

# Si migrás desde local state
terraform init -migrate-state

# Si reconfigurás el backend
terraform init -reconfigure
```

### State isolation con key prefixes

```hcl
# Cada entorno obtiene su propio state file en el mismo bucket

# backend.tf para dev
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

# backend.tf para production
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

### Usar partial backend configuration

```hcl
# backend.tf
terraform {
  backend "s3" {
    # Values provistos vía CLI o env vars
    # bucket y key se setean al init
  }
}
```

```bash
# Inicializar con partial configuration
terraform init \
  -backend-config="bucket=my-company-terraform-state" \
  -backend-config="key=dev/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=terraform-locks" \
  -backend-config="encrypt=true"
```

### Backend config con environment variables

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"

# Terraform lee AWS creds desde env automáticamente
terraform init
terraform plan
terraform apply
```

### Usar workspaces para environment isolation

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
# Crear y switchear workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Listar workspaces
terraform workspace list

# Switchear workspace
terraform workspace select production

# Aplicar en el workspace actual
terraform plan
terraform apply
```

### Resources condicionales por workspace

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

### State locking con DynamoDB

```bash
# Cuando terraform plan/apply corre, adquiere un lock
# El lock se almacena en DynamoDB con LockID = bucket/key

# Si otro run trata de adquirir el lock:
# Error: Error acquiring the state lock
# Lock Info:
#   Path:    my-company-terraform-state/dev/terraform.tfstate
#   LockID:  abc123-def456

# Force unlock si existe un stale lock (usar con precaución)
terraform force-unlock abc123-def456
```

### CI/CD con GitHub Actions

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

### Operaciones de state file

```bash
# Listar resources en state
terraform state list

# Mostrar un resource específico
terraform state show aws_instance.app[0]

# Mover un resource en state (rename)
terraform state mv aws_instance.old aws_instance.new

# Remover un resource de state (sin destruir)
terraform state rm aws_instance.app[0]

# Pull state a archivo local
terraform state pull > terraform.tfstate

# Push state local a remote
terraform state push terraform.tfstate
```

## Variants

### Cross-region replication para state

```hcl
# Habilitar S3 cross-region replication para disaster recovery
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
  region = "us-west-2"  # Región diferente
}
```

### Usar assume role para backend access

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

### Múltiples state files para diferentes componentes

```text
# Estructura de directorios
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

- Habilitá S3 versioning — permite state rollback si ocurre corrupción
- Habilitá server-side encryption — el state contiene data sensible (IPs, passwords)
- Usá DynamoDB locking — previene que runs concurrentes corrompan state
- Seteá `prevent_destroy` en el state bucket — el deletion accidental es catastrófico
- Usá state files separados por entorno — blast radius isolation
- Usá state files separados por componente (VPC, EKS, RDS) — runs más rápidos, cambios aislados
- Nunca commitees `terraform.tfstate` a git — usá el remote backend
- Usá `terraform force-unlock` con precaución — solo para stale locks

## Common Mistakes

- **Sin DynamoDB locking**: runs concurrentes de `terraform apply` corrompen state. Siempre usá DynamoDB locking.
- **Sin S3 versioning**: si el state se corrompe o sobrescribe, no hay rollback. Habilitá versioning.
- **Un solo state file para todo**: runs lentos, blast radius grande. Spliteá por entorno y componente.
- **Commitear state a git**: el state contiene secrets y no es mergeable. Usá remote backend.
- **No usar `prevent_destroy`**: el deletion accidental del bucket pierde todo el state. Seteá `prevent_destroy = true`.
- **Usar `force-unlock` descuidadamente**: si otro run está activo, forzar unlock corrompe state. Verificá primero.

## FAQ

### ¿Qué es Terraform state?

Un archivo JSON que mapea resources de Terraform a infraestructura del mundo real. Terraform lo usa para trackear qué creó, así puede actualizar o destruir resources en futuros runs.

### ¿Por qué usar S3 como backend?

S3 provee durability (99.999999999%), versioning para rollback, encryption at rest, y es accesible desde cualquier lugar. Combinado con DynamoDB para locking, es el remote backend estándar para AWS.

### ¿Qué es state locking?

Un mecanismo que previene que runs concurrentes de Terraform modifiquen el mismo state simultáneamente. DynamoDB almacena un lock item; el run que lo adquiere procede, otros esperan o fallan.

### ¿Cómo migro de local a remote state?

Agregá la configuración del backend a tu archivo `.tf`, luego corré `terraform init -migrate-state`. Terraform sube el state local a S3.

### ¿Puedo usar el mismo S3 bucket para múltiples proyectos?

Sí. Usá diferentes valores de `key` (e.g., `project-a/terraform.tfstate`, `project-b/terraform.tfstate`). Cada key es un state file separado.
