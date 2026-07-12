---





contentType: guides
slug: infrastructure-as-code-guide
title: "Infrastructure as Code — Terraform y Pulumi"
description: "Guía práctica para gestionar infraestructura como código: beneficios de enfoques declarativo vs imperativo, manejo de estado, módulos y testing de cambios de infraestructura."
metaDescription: "Guía de Infrastructure as Code: Terraform y Pulumi, declarativo vs imperativo, manejo de estado, módulos y testing seguro de cambios de infraestructura."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - guia
  - nube
  - pulumi
  - terraform
relatedResources:
  - /guides/cicd-pipeline-guide
  - /guides/docker-for-developers-guide
  - /guides/kubernetes-basics-guide
  - /recipes/aws-ecs-fargate
  - /recipes/bash-scripting-automation
  - /recipes/istio-canary-deployment
  - /recipes/python-terraform-provider-custom
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de Infrastructure as Code: Terraform y Pulumi, declarativo vs imperativo, manejo de estado, módulos y testing seguro de cambios de infraestructura."
  keywords:
    - infrastructure as code
    - terraform vs pulumi
    - lo que funciona iac
    - manejo estado terraform
    - infraestructura declarativa





---

# Infrastructure as Code — Terraform y Pulumi

## Introducción

Infrastructure as Code (IaC) es la práctica de gestionar y provisionar infraestructura mediante archivos de definición legibles por máquina en lugar de configuración manual. Convierte cambios de infraestructura en operaciones repetibles, revisables y versionadas. Consulta [CI/CD Pipeline](/guides/devops/cicd-pipeline-guide) para automatización de despliegue. Esta guía compara enfoques declarativo e imperativo, cubre Terraform y Pulumi, y proporciona lo que funciona para uso en producción.

## Declarativo vs Imperativo

| Enfoque | Tú Dices | La Herramienta Maneja | Ejemplos |
|---------|---------|----------------------|----------|
| **Declarativo** | "Quiero este estado" | Cómo llegar allí | Terraform, CloudFormation, Pulumi |
| **Imperativo** | "Haz estos pasos" | Orden de ejecución | Ansible, Shell scripts, SDK calls |

**El declarativo es preferido para infraestructura** porque maneja detección de drift, ordenamiento de dependencias e idempotencia automáticamente.

## Terraform

Herramienta declarativa de HashiCorp. Define recursos en HCL y Terraform planea y aplica los cambios.

```hcl
# main.tf — define una VPC y subnet
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
```

### Flujo de Trabajo de Terraform

```bash
terraform init      # Descarga providers y módulos
terraform plan      # Previsualiza cambios
terraform apply     # Ejecuta cambios
terraform destroy   # Destruye (usar con precaución)
```

### Manejo de Estado

Terraform almacena el mapeo entre tu configuración y recursos reales en un archivo de estado.

| Almacenamiento de Estado | Mejor Para |
|-------------------------|------------|
| **Archivo local** | Solo desarrollo individual |
| **S3 + DynamoDB** | Workflows de equipo con locking |
| **Terraform Cloud** | Colaboración, ejecución remota, policy checks |

```hcl
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

**Regla crítica:** Nunca edites archivos de estado manualmente. Usa comandos `terraform state` o corrige la configuración y re-aplica.

### Módulos

Módulos son componentes de infraestructura reutilizables y parametrizados.

```hcl
# modules/vpc/main.tf
variable "cidr_block" { type = string }
variable "azs" { type = list(string) }

resource "aws_vpc" "this" {
  cidr_block = var.cidr_block
  tags = { Name = "vpc" }
}

# uso del módulo raíz
module "vpc" {
  source     = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
  azs        = ["us-east-1a", "us-east-1b"]
}
```

**Mejor práctica:** Publica módulos internos en un registry privado. Versionalos como software.

## Pulumi

Pulumi usa lenguajes de programación de propósito general en lugar de HCL.

```typescript
import * as aws from "@pulumi/aws";

const vpc = new aws.ec2.Vpc("main", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    tags: { Name: "production-vpc" },
});

export const vpcId = vpc.id;
```

### Cuándo Elegir Pulumi Sobre Terraform

| Elige Pulumi Cuando | Elige Terraform Cuando |
|---------------------|-----------------------|
| Tu equipo prefiere lenguajes de programación sobre HCL | Tu equipo ya conoce HCL |
| Necesitas lógica compleja (loops, condicionales, abstracción) | Tu infraestructura es mayormente declaraciones estáticas |
| Quieres testear infraestructura con unit tests | Necesitas el ecosistema más grande de módulos y soporte comunitario |
| Estás construyendo una plataforma o tooling interno | Necesitas madurez y soporte amplio de providers |

## Testing de Infraestructura

### Análisis Estático

```bash
terraform fmt -check
terraform validate
tflint --deep
checkov -d .
```

### Revisión de Plan

```bash
terraform plan -out=tfplan
terraform show -json tfplan > plan.json
# CI parsea plan.json y verifica cambios destructivos
```

### Testing de Integración

| Herramienta | Enfoque |
|-------------|---------|
| **Terratest** (Go) | Aplica infraestructura, ejecuta assertions, destruye |
| **Kitchen-Terraform** | Testing basado en Ruby con Inspec |
| **Unit tests de Pulumi** | Mock providers y assert propiedades de recursos |

## Lo que funciona

- Almacena código en control de versiones — cada cambio de infraestructura es un PR, revisado y logueado
- Usa estado remoto con locking — previene modificaciones concurrentes corruptiendo el estado
- Separa ambientes — usa workspaces o archivos de estado separados por ambiente
- Usa módulos para reusabilidad — pero evita sobre-abstracción; simple es mejor
- Nunca commitees secrets — usa [gestores de secretos](/guides/security/security-best-practices-guide) y referencia por ARN
- Pinea versiones de providers — previene breaking changes de actualizaciones automáticas

## Errores Comunes

- Correr `terraform apply` localmente en lugar de [CI/CD](/guides/devops/cicd-pipeline-guide)
- Almacenar archivos de estado en Git (contienen IDs sensibles y a veces secrets)
- No usar workspaces o directorios separados para ambientes
- Escribir configs monolíticas gigantes en lugar de componentes modulares
- Ignorar output del plan — el plan te dice qué se destruirá; léelo

## Preguntas Frecuentes

### ¿Puedo usar Terraform y Pulumi juntos?

Sí, via referencias de estado de Terraform o el bridge de Terraform de Pulumi. Migra gradualmente: importa estado existente de Terraform a Pulumi, o maneja recursos legacy con Terraform mientras Pulumi gestiona lo nuevo.

### ¿Cómo manejo secrets en IaC?

Nunca hardcodees secrets. Usa:
- Variables de entorno para config no sensible
- Secret managers (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) para valores sensibles
- `sensitive = true` en outputs de Terraform para prevenir logging

### ¿Debería aplicar Terraform desde mi laptop o CI/CD?

Siempre desde CI/CD. Los applies locales no son trazables, no son revisados y evaden workflows de aprobación. Usa Terraform Cloud, Atlantis o un pipeline GitOps para todos los cambios de producción.


## Temas Avanzados

### Escenario: IaC Modular para Multi-ambiente

```hcl
# Estructura de directorios
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

# Diferencias entre entornos:
#   dev: 1 nodo, db.t3.medium, sin multi-az
#   staging: 3 nodos, db.t3.large, multi-az
#   production: 5 nodos, db.r5.xlarge, multi-az, backup 30 dias
```

### Como manejo drift de infraestructura?

Ejecuta `terraform plan` diariamente via CI/CD. Si detecta drift (alguien cambio algo manualmente), notifica al equipo. Nunca apliques cambios manuales en la consola. Si hay drift, importalo al estado con `terraform import` o revertelo. Documenta quien y por que hizo el cambio manual. El drift es un sintoma de que tu IaC no cubre un caso de uso.
