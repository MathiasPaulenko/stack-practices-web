---
contentType: guides
slug: terraform-best-practices-guide
title: "Terraform Best Practices — Módulos, State y Workspaces"
description: "Guía práctica de mejores prácticas de Terraform: diseño de módulos, gestión de estado remoto, workspaces y seguridad para infraestructura como código de grado productivo."
metaDescription: "Aprende mejores prácticas de Terraform: diseño de módulos, estado remoto, workspaces y seguridad. Construye infraestructura como código con confianza."
difficulty: intermediate
topics:
  - devops
  - infrastructure
  - data
tags:
  - terraform
  - infrastructure-as-code
  - iac
  - modulos
  - estado-remoto
  - workspaces
  - hashicorp
  - guia
relatedResources:
  - /guides/aws-basics-guide
  - /guides/azure-basics-guide
  - /guides/gcp-basics-guide
  - /guides/kubernetes-advanced-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende mejores prácticas de Terraform: diseño de módulos, estado remoto, workspaces y seguridad. Construye infraestructura como código con confianza."
  keywords:
    - terraform
    - infrastructure-as-code
    - iac
    - modulos
    - estado-remoto
    - workspaces
    - hashicorp
    - guia
---

## Overview

Terraform es la herramienta de infrastructure-as-code más usada, permitiendo a equipos definir, provisionar y gestionar recursos cloud a través de archivos de configuración declarativos. Mientras empezar con Terraform es sencillo, construir infraestructura de grado productivo requiere disciplina en diseño de módulos, gestión de estado, seguridad y flujos de colaboración. Esta guía cubre las prácticas que separan código Terraform de prototipo de infraestructura enterprise-ready.

## When to Use

- Gestionas infraestructura cloud que cambia frecuentemente
- Múltiples miembros del equipo necesitan colaborar en infraestructura
- Necesitas ambientes reproducibles (dev, staging, producción)
- Quieres version control para tus definiciones de infraestructura

## Diseño de Módulos

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

### Interfaz de Módulo

Mantén inputs explícitos y outputs mínimos.

```hcl
# modules/vpc/variables.tf
variable "vpc_cidr" {
  description = "Bloque CIDR para la VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Lista de AZs a usar"
  type        = list(string)
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID de la VPC creada"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Lista de IDs de subnets privadas"
  value       = aws_subnet.private[*].id
}
```

### Composición Sobre Herencia

Construye módulos pequeños y componibles en lugar de monolíticos.

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

## Gestión de Estado

### Estado Remoto con Locking

Nunca almacenes estado en version control. Usa backends remotos con locking.

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
# Crear los recursos del backend
aws s3api create-bucket --bucket my-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket my-terraform-state --versioning-configuration Status=Enabled
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Aislamiento de Estado

Usa archivos de estado separados por ambiente y por componente.

| Enfoque | Mejor Para |
|---------|------------|
| Workspaces | Ambientes simples (dev/staging/prod) |
| Directorios separados | Ambientes complejos con diferentes configuraciones |
| Backends separados | Máximo aislamiento, diferentes cuentas cloud |

## Workspaces

Los workspaces de Terraform permiten múltiples archivos de estado dentro de la misma configuración.

```bash
# Crear y cambiar a un workspace
terraform workspace new prod
terraform workspace select prod

# Usar workspace en configuración
locals {
  environment = terraform.workspace
  instance_count = {
    dev     = 1
    staging = 2
    prod    = 3
  }[terraform.workspace]
}
```

Precaución: Los workspaces comparten la misma configuración de backend. Para aislamiento fuerte, usa configuraciones de backend separadas o incluso cuentas cloud separadas.

## Prácticas de Seguridad

### Nunca Commitees Secrets

```bash
# .gitignore
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
*.auto.tfvars
secrets.tfvars
```

### Usa Variables para Datos Sensibles

```hcl
variable "db_password" {
  description = "Password de administrador de base de datos"
  type        = string
  sensitive   = true
}
```

### Least Privilege para CI/CD

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

### Análisis Estático

```bash
# Chequeo de formato
terraform fmt -check -recursive

# Validar sintaxis
terraform validate

# Escaneo de seguridad con Checkov
checkov -d .
```

### Flujo de Revisión de Plan

```bash
# Generar un archivo de plan
terraform plan -out=tfplan

# Revisar el plan
terraform show tfplan

# Aplicar solo el plan revisado
terraform apply tfplan
```

## Errores Comunes

- **Almacenar estado en Git** — usa backends remotos con encryption y versioning
- **Hardcodear credenciales** — usa variables, environment variables o IAM roles
- **Módulos monolíticos** — divide en módulos pequeños, reutilizables y testeables
- **No usar archivos de plan** — siempre revisa planes antes de aplicar
- **Ignorar pinning de versiones de provider** — pin versions para prevenir breaking changes
- **Sin state locking** — múltiples engineers ejecutando terraform simultáneamente corrompen el estado

## FAQ

**¿Debería usar Terraform Cloud?**
Terraform Cloud/Enterprise provee estado remoto, colaboración de equipo y policy-as-code. Para equipos pequeños, backend S3 + DynamoDB es suficiente.

**¿Cómo gestiono secrets en Terraform?**
Usa environment variables (TF_VAR_*), HashiCorp Vault o secret managers cloud (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager). Marca variables como `sensitive = true`.

**¿Cuándo debería usar módulos vs workspaces?**
Los módulos son para componentes de infraestructura reutilizables. Los workspaces son para aislamiento de estado por ambiente. Usa ambos: módulos para código DRY, workspaces (o directorios separados) para separación de ambientes.
