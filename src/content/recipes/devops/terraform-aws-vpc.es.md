---
contentType: recipes
slug: terraform-aws-vpc
title: "Provisiona una VPC de AWS con Terraform"
description: "Como usar Terraform para provisionar una VPC de AWS lista para produccion con subredes publicas y privadas, NAT gateways y security groups"
metaDescription: "Provisiona una VPC de AWS con Terraform. Crea subredes publicas y privadas, NAT gateways, tablas de ruteo y security groups para infraestructura de produccion."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - terraform
  - aws
  - devops
  - networking
relatedResources:
  - /recipes/devops/aws-ecs-fargate
  - /guides/infrastructure-as-code-guide
  - /patterns/design/builder-pattern-configuration
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Provisiona una VPC de AWS con Terraform. Crea subredes publicas y privadas, NAT gateways, tablas de ruteo y security groups para infraestructura de produccion."
  keywords:
    - terraform
    - aws vpc
    - infrastructure as code
    - networking
    - devops
---

# Provisiona una VPC de AWS con Terraform

Una VPC bien estructurada es la fundacion de infraestructura cloud segura. Terraform te permite definir toda la topologia de red — subredes, ruteo, gateways y security groups — como codigo versionado que puede recrearse identicamente entre ambientes.

## Cuando Usar Esto

- Necesitas infraestructura de red repetible y versionada entre dev/staging/prod
- Las aplicaciones requieren recursos tanto publicos como internos
- Quieres enforcear segmentacion de red entre diferentes capas

## Requisitos Previos

- AWS CLI configurado con credenciales apropiadas
- Terraform 1.5+ instalado

## Solucion

### 1. VPC y Subredes

```hcl
# vpc.tf
locals {
  azs = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "production-vpc"
  }
}

resource "aws_subnet" "public" {
  count                   = length(local.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet-${count.index + 1}"
    Type = "public"
  }
}

resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 100)
  availability_zone = local.azs[count.index]

  tags = {
    Name = "private-subnet-${count.index + 1}"
    Type = "private"
  }
}
```

### 2. Gateways de Internet y NAT

```hcl
# gateways.tf
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "main-igw" }
}

resource "aws_eip" "nat" {
  count  = length(local.azs)
  domain = "vpc"
  tags   = { Name = "nat-eip-${count.index + 1}" }
}

resource "aws_nat_gateway" "main" {
  count         = length(local.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "nat-gateway-${count.index + 1}" }
}
```

### 3. Tablas de Ruteo

```hcl
# routing.tf
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = length(local.azs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = { Name = "private-rt-${count.index + 1}" }
}

resource "aws_route_table_association" "private" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

### 4. Security Groups

```hcl
# security.tf
resource "aws_security_group" "web" {
  name_prefix = "web-"
  vpc_id      = aws_vpc.main.id
  description = "Permitir trafico HTTP y HTTPS"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "web-sg" }
}

resource "aws_security_group" "database" {
  name_prefix = "db-"
  vpc_id      = aws_vpc.main.id
  description = "Permitir acceso a base de datos solo desde capa web"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  tags = { Name = "database-sg" }
}
```

## Como Funciona

1. **VPC** define el espacio de direcciones IP privadas para todos los recursos
2. **Subredes Publicas** rutean trafico a traves del Internet Gateway para acceso externo
3. **Subredes Privadas** rutean trafico saliente a traves de NAT Gateways por seguridad
4. **Tablas de Ruteo** controlan direccion de trafico por subred
5. **Security Groups** actuan como firewalls stateful a nivel de instancia

## Consideraciones de Produccion

- Usa **Terraform workspaces** o archivos de estado separados para cada ambiente
- Habilita **VPC Flow Logs** a CloudWatch para auditoria de trafico de red
- Coloca bases de datos y servicios internos solo en **subredes privadas**
- Usa **AWS Network Firewall** o **Security Groups** para defensa en profundidad

## Errores Comunes

- Olvidar habilitar `map_public_ip_on_launch` para instancias en subredes publicas
- Colocar NAT Gateways en subredes privadas en lugar de publicas
- Usar bloques CIDR demasiado permisivos como `0.0.0.0/0` en ingress de security groups

## FAQ

**P: Debo usar un NAT Gateway o uno por AZ?**
R: Uno por AZ elimina un single point of failure y evita costos de transferencia de datos cross-AZ. Para ambientes dev sensibles a costos, un NAT Gateway es aceptable.

**P: Como conecto esta VPC con otra?**
R: Usa `aws_vpc_peering_connection` y agrega rutas en ambas VPCs apuntando al bloque CIDR emparejado.

**P: Puedo importar una VPC existente a Terraform?**
R: Si. Usa `terraform import aws_vpc.main <vpc-id>` y luego escribe la configuracion correspondiente.
