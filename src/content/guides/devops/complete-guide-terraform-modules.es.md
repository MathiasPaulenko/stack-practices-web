---
contentType: guides
slug: complete-guide-terraform-modules
title: "Referencia Detallada de Módulos de Terraform"
description: "Construye módulos de Terraform reutilizables con estructura adecuada, inputs, outputs y versionado. Cubre composición, testing y publicación en el Registry."
metaDescription: "Referencia Detallada de módulos de Terraform. Construye infraestructura reutilizable con estructura, variables, outputs, versionado, testing y registry."
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
  metaDescription: "Referencia Detallada de módulos de Terraform. Construye infraestructura reutilizable con estructura, variables, outputs, versionado, testing y registry."
  keywords:
    - terraform modules
    - terraform module structure
    - reusable terraform
    - terraform versioning
    - terraform testing
    - terraform registry
    - infrastructure as code
---

# Referencia Detallada de Módulos de Terraform

## Introducción

Los módulos de Terraform encapsulan recursos de infraestructura en unidades reutilizables y componibles. Un módulo bien estructurado te permite provisionar la misma infraestructura across entornos (dev, staging, prod) con diferentes configuraciones. A continuación: estructura de módulos, inputs/outputs, composición, versionado, testing y publicación al Terraform Registry.

## Estructura del Módulo

```text
modules/
└── vpc/
    ├── main.tf          # Definiciones de recursos
    ├── variables.tf     # Variables de input
    ├── outputs.tf       # Valores de output
    ├── versions.tf      # Versiones requeridas de Terraform y providers
    ├── README.md        # Documentación del módulo
    └── examples/
        └── basic/
            └── main.tf  # Ejemplo de uso
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
  description = "Prefijo de nombre para todos los recursos"
  type        = string
}

variable "cidr_block" {
  description = "Bloque CIDR para el VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Zonas de disponibilidad"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnets" {
  description = "Bloques CIDR de subnets públicas"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnets" {
  description = "Bloques CIDR de subnets privadas"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "enable_dns_support" {
  description = "Habilitar DNS support en el VPC"
  type        = bool
  default     = true
}

variable "enable_dns_hostnames" {
  description = "Habilitar DNS hostnames en el VPC"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags adicionales para todos los recursos"
  type        = map(string)
  default     = {}
}
```

### outputs.tf

```hcl
output "vpc_id" {
  description = "ID del VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "Bloque CIDR del VPC"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "IDs de las subnets públicas"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs de las subnets privadas"
  value       = aws_subnet.private[*].id
}

output "internet_gateway_id" {
  description = "ID del Internet Gateway"
  value       = aws_internet_gateway.this.id
}

output "public_route_table_id" {
  description = "ID de la route table pública"
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

## Consumir un Módulo

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

## Composición de Módulos

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

## Testing con Terratest

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

## Estrategia de Versionado

| Versión | Significado | Cuándo Bump |
|---------|---------|-------------|
| **1.0.0** | Release estable inicial | Primer release estable |
| **1.1.0** | Nueva feature (backward compatible) | Nueva variable opcional, nuevo output |
| **1.2.0** | Otra feature | Nuevo recurso, nuevo default |
| **2.0.0** | Breaking change | Variable removida, default cambiado, output renombrado |

### Git tags para versiones de módulos

```bash
git tag v1.0.0 -m "Initial release"
git tag v1.1.0 -m "Add NAT gateway support"
git tag v2.0.0 -m "Breaking: rename public_subnets to public_subnet_cidrs"
git push origin --tags
```

## Pautas

- **Un módulo por tipo de recurso** — un módulo VPC, un módulo EKS, un módulo RDS
- **Usar `for_each` sobre `count`** cuando sea posible — evita recreación de recursos al cambiar listas
- **Proveer defaults sensatos** — los módulos deberían funcionar con inputs mínimos
- **Usar bloques `validation`** — catchear inputs inválidos temprano
- **Documentar cada variable** — description es obligatoria, ejemplos recomendados
- **Usar `variable_validation`** — enforce constraints al plan time
- **Mantener módulos pequeños y enfocados** — componer módulos en lugar de construir mega-módulos
- **Usar `locals` para valores computados** — mantener main.tf legible
- **Taggear todo** — usar el patrón `merge(var.tags, {Name = ...})`
- **Pinear versiones de provider** — usar `~>` para constraints de minor version
- **Usar `terraform fmt` y `terraform validate`** — nunca commitear código sin formatear
- **Escribir ejemplos** — cada módulo debería tener al menos un ejemplo funcional

## Errores Comunes

- Hardcodear valores que deberían ser variables — los módulos no son reutilizables
- No setear `required_version` — el módulo se rompe en versiones viejas de Terraform
- Usar `count` con listas — remover un item shiftea todos los recursos subsiguientes
- No proveer outputs — los consumidores no pueden referenciar recursos del módulo
- Mezclar múltiples tipos de recursos en un módulo — viola single responsibility
- No testear módulos — los bugs de infraestructura son costosos
- Usar `latest` para versiones de provider — la reproducibilidad se pierde
- No versionar módulos — los consumidores no pueden pinear una versión conocida
- Ignorar `terraform validate` — errores de sintaxis aparecen al apply time

## Preguntas Frecuentes

### ¿Debo usar el Terraform Registry o Git repos privados?

Usar el Terraform Registry para módulos open-source de los que otros pueden beneficiarse. Usar Git repos privados para módulos específicos de la organización. Ambos soportan version pinning vía `?ref=v1.0.0`.

### ¿Cómo migro de count a for_each?

Añadir una versión `for_each` del recurso junto a la versión `count`. Usar bloques `moved` para decirle a Terraform que los recursos son los mismos:

```hcl
moved {
  from = aws_subnet.public[0]
  to   = aws_subnet.public["a"]
}
```

### ¿Deben los módulos gestionar state?

No. Los módulos definen recursos. La configuración root que llama al módulo gestiona state. Esto mantiene los módulos portables across state backends.
