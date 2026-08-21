---
contentType: guides
slug: terraform-best-practices-guide
title: "Buenas Prácticas de Terraform: Módulos, State y Workspaces"
description: "Guía práctica de mejores prácticas de Terraform: diseño de módulos, gestión de estado remoto, workspaces y seguridad para infraestructura como código de grado productivo."
metaDescription: "Aprendé mejores prácticas de Terraform: diseño de módulos, estado remoto, workspaces y seguridad. Construí infraestructura como código con confianza."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - terraform
  - infrastructure-as-code
  - iac
  - modulos
  - state
  - workspaces
  - devops
  - seguridad
relatedResources:
  - /guides/complete-guide-terraform-modules
  - /recipes/terraform-aws-vpc
  - /recipes/terraform-remote-state-s3-backend
  - /recipes/terraform-workspace-environment-isolation
  - /recipes/python-terraform-provider-custom
  - /guides/platform-engineering-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-24"
author: Mathias Paulenko
seo:
  metaDescription: "Aprendé mejores prácticas de Terraform: diseño de módulos, estado remoto, workspaces y seguridad. Construí infraestructura como código con confianza."
  keywords:
    - terraform
    - infrastructure-as-code
    - iac
    - modulos
    - estado-remoto
    - workspaces
    - seguridad
    - hashicorp
---

## Resumen

Terraform es la herramienta de infrastructure-as-code más usada. Los equipos la usan para definir,
provisionar y gestionar recursos cloud a través de archivos de configuración declarativos. Aunque
empezar es sencillo, la infraestructura de grado productivo requiere disciplina en diseño de
módulos, gestión de estado, seguridad y colaboración. Esta guía recorre las prácticas que
separan el código Terraform de prototipo del código enterprise-ready.

## Cuándo Usarlo

- Gestionás infraestructura cloud que cambia frecuentemente.
- Varios miembros del equipo colaboran en la misma infraestructura.
- Necesitás entornos reproducibles (dev, staging, production).
- Querés versionar las definiciones de infraestructura.
- Estás migrando de provisionamiento manual a infrastructure as code.

## Cuándo NO Usarlo

- Tenés pocos recursos estáticos que rara vez cambian.
- El equipo no está listo para gestionar archivos de estado, locks y acceso al backend.
- Necesitás reconciliación de infraestructura en tiempo real y basada en eventos — herramientas
  como Ansible u operadores de Kubernetes pueden ajustarse mejor.

## Diseño de Módulos

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

### Diseño de interfaz de módulos

Mantené los inputs explícitos y los outputs mínimos.

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

### Composición sobre herencia

Construí módulos pequeños y componibles en vez de monolíticos.

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

Para más detalles, consultá [Complete Guide to Terraform Modules](/es/guides/complete-guide-terraform-modules/).

## Gestión de Estado

### Estado remoto con locking

Nunca guardes el estado en control de versiones. Usá backends remotos con locking.

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

Para más información, consultá [Terraform Remote State S3 Backend](/es/recipes/terraform-remote-state-s3-backend/).

### Aislamiento de estado

Usá archivos de estado separados por entorno y por componente.

|Enfoque|Ideal para|
|-------|----------|
|Workspaces|Entornos simples (dev/staging/prod)|
|Directorios separados|Entornos complejos con configuraciones distintas|
|Backends separados|Máximo aislamiento, distintas cuentas de AWS|

## Workspaces

Los workspaces de Terraform permiten varios archivos de estado dentro de la misma configuración.

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

Precaución: los workspaces comparten la configuración del backend. Para aislamiento fuerte, usá
backends separados o distintas cuentas cloud. Consultá [Terraform Workspace Environment
Isolation](/es/recipes/terraform-workspace-environment-isolation/).

## Prácticas de Seguridad

### Nunca commitear secretos

```bash
# .gitignore
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
*.auto.tfvars
secrets.tfvars
```

### Usar variables para datos sensibles

```hcl
variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}
```

### Mínimo privilegio para CI/CD

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

## Testing y Validación

### Análisis estático

```bash
# Format check
terraform fmt -check -recursive

# Validate syntax
terraform validate

# Security scanning with Checkov
checkov -d .
```

### Flujo de revisión de planes

```bash
# Generate a plan file
terraform plan -out=tfplan

# Review the plan
terraform show tfplan

# Apply only the reviewed plan
terraform apply tfplan
```

## Explicación

- **Módulos** mantienen el código DRY y reutilizable. Los root modules llaman a child modules y
  pasan los valores de entorno a través de variables.
- **Estado remoto** almacena el archivo `.tfstate` fuera de discos locales. S3 provee durabilidad;
  DynamoDB provee locking para evitar escrituras concurrentes.
- **Workspaces** separan el estado por entorno dentro de un mismo backend. Son livianos, pero
  comparten credenciales del backend, así que usá backends separados para una separación
  estricta.
- **Seguridad** empieza por no commitear secretos, marcar variables como `sensitive` y darle a
  CI/CD los permisos mínimos necesarios.
- **Validación** con `terraform fmt`, `terraform validate` y `checkov` detecta problemas de
  sintaxis y seguridad antes del apply.

## Errores Comunes

- **Guardar el estado en Git** — usá backends remotos con cifrado y versionado.
- **Hardcodear credenciales** — usá variables, variables de entorno o roles IAM.
- **Módulos monolíticos** — dividí en módulos pequeños, reutilizables y testeables.
- **No usar plan files** — siempre revisá los planes antes de aplicar.
- **Ignorar el pin de versiones de providers** — pineá versiones para evitar breaking changes.
- **No usar state locking** — varios ingenieros corriendo Terraform simultáneamente pueden
  corromper el estado.

## Preguntas Frecuentes

### ¿Uso Terraform Cloud?

Terraform Cloud y Enterprise proveen estado remoto, colaboración de equipo y policy-as-code. Para
equipos chicos, un backend S3 + DynamoDB alcanza.

### ¿Cómo gestiono secretos en Terraform?

Usá variables de entorno (`TF_VAR_*`), HashiCorp Vault o gestores de secretos cloud como AWS
Secrets Manager. Marcá las variables como `sensitive = true`.

### ¿Cuándo uso módulos vs workspaces?

Los módulos son para componentes de infraestructura reutilizables. Los workspaces son para
aislamiento de estado por entorno. Usá ambos: módulos para código DRY, workspaces o directorios
separados para separación de entornos.

### ¿Cómo manejo el estado remoto y el locking?

Usá un backend remoto como S3 con DynamoDB para locking. Configurá `encrypt = true`. Nunca
commitees archivos `.tfstate`. Para equipos grandes, usá Terraform Cloud o Atlantis para aplicar
cambios vía PRs.

### ¿Cómo empiezo en un proyecto existente?

Empezá con una parte pequeña y aislada del codebase. Aplicá estas prácticas a un módulo o
servicio. Medí el impacto y expandí.

## Temas Avanzados

### Terraform modular para producción

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
