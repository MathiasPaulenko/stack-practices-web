---


contentType: recipes
slug: terraform-workspace-environment-isolation
title: "Aislar Entornos con Terraform Workspaces"
description: "Cómo usar Terraform workspaces para environment isolation, cubriendo workspace creation, conditional resources, variable management y migración a separate state files."
metaDescription: "Aisla entornos con Terraform workspaces. Crea workspaces, conditional resources, variable management y migra a separate state files cuando sea necesario."
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
  - /recipes/terraform-remote-state-s3-backend
  - /recipes/github-actions-reusable-workflows
  - /recipes/kubernetes-helm-chart-templating
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aisla entornos con Terraform workspaces. Crea workspaces, conditional resources, variable management y migra a separate state files cuando sea necesario."
  keywords:
    - devops
    - terraform
    - workspaces
    - environments
    - infrastructure
    - recipe


---

## Overview

Los Terraform workspaces te permiten usar la misma configuración para manejar múltiples entornos (dev, staging, production). Cada workspace tiene su propio state file pero comparte los mismos archivos de configuración. Switchiás entre workspaces con `terraform workspace select`, y Terraform usa `terraform.workspace` para aplicar condicionalmente diferentes settings — instance sizes, replica counts, feature flags.

## When to Use

- Misma infraestructura a través de dev, staging y production con variaciones menores
- Spin-up rápido de entornos para testing o demos
- Cuando querés una codebase para todos los entornos
- Entornos temporales (e.g., entornos per-PR o per-branch)

## When NOT to Use

- Infraestructura de producción con requisitos de isolation estrictos — usá separate state files en su lugar
- Cuando los entornos difieren considerablemente — los workspaces se vuelven un enredo de conditionals
- Cuando diferentes entornos usan diferentes AWS accounts — usá separate backend configs
- Cuando necesitás diferentes provider configurations por entorno — los workspaces no pueden hacer esto

## Solution

### Workspace setup básico

```bash
# Listar workspaces (default siempre existe)
terraform workspace list

# Crear nuevos workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Switchear workspace
terraform workspace select dev

# Mostrar workspace actual
terraform workspace show
```

### Backend con workspace-specific state

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

### Configuración específica por entorno

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

### Resources condicionales

```hcl
# main.tf

# Siempre creado
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name        = "vpc-${terraform.workspace}"
    Environment = terraform.workspace
  }
}

# Solo en staging y production
resource "aws_cloudwatch_log_group" "app" {
  count             = local.config.enable_monitoring ? 1 : 0
  name              = "/app/${terraform.workspace}"
  retention_in_days = terraform.workspace == "production" ? 90 : 30
}

# Solo en production
resource "aws_db_instance" "read_replica" {
  count                     = terraform.workspace == "production" ? 1 : 0
  identifier                = "db-replica-${terraform.workspace}"
  replicate_source_db       = aws_db_instance.primary.id
  instance_class            = local.config.db_instance
  skip_final_snapshot       = true
}
```

### Resource naming con workspace

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

### Auto Scaling con workspace-specific values

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

### tfvars por workspace

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
# Apply con tfvars específico por workspace
terraform workspace select dev
terraform apply -var-file="dev.tfvars"

terraform workspace select production
terraform apply -var-file="production.tfvars"
```

### Workspace con modules

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

### CI/CD con workspaces

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

### Workspaces temporales para PRs

```bash
# Crear un workspace temporal para un PR
terraform workspace new pr-123

# Apply con config de dev
terraform apply -var-file="dev.tfvars"

# ... testear el PR ...

# Clean up
terraform workspace select dev
terraform workspace delete pr-123
```

### Workspace deletion con state cleanup

```bash
# Antes de deletear un workspace, destruí sus resources
terraform workspace select pr-123
terraform destroy -auto-approve

# Switchear a otro workspace (no podés deletear el current)
terraform workspace select default

# Deletear el workspace
terraform workspace delete pr-123
```

## Variants

### Usar workspaces con locals para tags

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

### Workspace con diferentes AWS providers

```hcl
# Nota: los workspaces no pueden cambiar provider config directamente
# Usá separate state files para diferentes AWS accounts en su lugar

# Para misma account, diferentes regiones:
provider "aws" {
  region = terraform.workspace == "production" ? "us-east-1" : "us-west-2"
}
```

### Migrar de workspaces a separate state files

```bash
# 1. Exportar el state del workspace actual
terraform workspace select production
terraform state pull > production.tfstate

# 2. Crear una nueva backend config para production
# backend.tf (production)
terraform {
  backend "s3" {
    bucket = "my-company-terraform-state"
    key    = "production/terraform.tfstate"
    # ...
  }
}

# 3. Inicializar con el nuevo backend e importar state
terraform init -reconfigure
terraform state push production.tfstate

# 4. Verificar
terraform state list
```

## Best Practices


- For a deeper guide, see [Store Terraform State in S3 with DynamoDB Locking](/es/recipes/terraform-remote-state-s3-backend/).

- Usá workspaces para entornos similares — dev/staging/production con variaciones menores
- Mantené la conditional logic simple — conditionals complejos hacen el código difícil de mantener
- Taggeá todos los resources con `terraform.workspace` — hace fácil filtrar y auditar
- Usá tfvars files por workspace — separa config de logic
- No uses workspaces para diferentes AWS accounts — usá separate backend configs
- Limpiá workspaces temporales — workspaces huérfanos dejan resources huérfanos
- Usá `terraform workspace show` en scripts — asegura que estás aplicando al entorno correcto
- Considerá migrar a separate state files a medida que los entornos divergen — los workspaces tienen límites

## Common Mistakes

- **Usar workspaces para diferentes AWS accounts**: los workspaces comparten la misma provider config. Usá separate backend configs o directorios en su lugar.
- **Olvidar switchear workspaces**: aplicar al workspace equivocado puede destruir resources de producción. Siempre verificá con `terraform workspace show`.
- **Conditional logic compleja**: si tu código es 50% conditionals, es hora de separate state files o modules.
- **No limpiar workspaces temporales**: workspaces huérfanos tienen resources huérfanos que siguen corriendo y costando dinero.
- **No taggear con workspace name**: sin tags, no podés distinguir qué resources pertenecen a qué entorno en la AWS console.

## FAQ

### ¿Qué es un Terraform workspace?

Un container con nombre para un Terraform state. Cada workspace tiene su propio state file pero comparte la misma configuración. Switchiá entre ellos con `terraform workspace select`.

### ¿Cuándo debería usar workspaces vs separate state files?

Usá workspaces cuando los entornos son similares (misma infraestructura, diferentes sizes/counts). Usá separate state files cuando los entornos difieren considerablemente o usan diferentes AWS accounts.

### ¿Puedo tener diferentes providers por workspace?

No. Los workspaces comparten la misma provider configuration. Para diferentes providers (e.g., diferentes AWS accounts), usá directorios separados con separate backend configs.

### ¿Cómo deleteo un workspace?

Primero destruí todos sus resources (`terraform destroy`), switcheá a otro workspace, luego corré `terraform workspace delete <name>`. No podés deletear el workspace `default` o el actualmente seleccionado.

### ¿Los workspaces son lo mismo que los Terraform Cloud workspaces?

No. Los Terraform Cloud workspaces son entidades separadas con sus propias VCS connections, variables y run settings. Los CLI workspaces son solo state files separados compartiendo la misma config.
