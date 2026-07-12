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
  - ci-cd
relatedResources:
  - /recipes/aws-ecs-fargate
  - /guides/infrastructure-as-code-guide
  - /patterns/builder-pattern-configuration
  - /recipes/load-balancing-haproxy
  - /recipes/nginx-reverse-proxy
  - /recipes/ansible-playbook
  - /recipes/istio-canary-deployment
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

- Necesitas infraestructura de red repetible y versionada entre dev/staging/prod. Consulta [Git Workflow](/recipes/devops/git-workflow) para infraestructura versionada.
- Las aplicaciones requieren recursos tanto publicos como internos. Consulta [AWS ECS Fargate](/recipes/devops/aws-ecs-fargate) para despliegue de contenedores.
- Quieres enforcear segmentacion de red entre diferentes capas. Consulta [Load Balancing HAProxy](/recipes/devops/load-balancing-haproxy) para separación de capas.

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

### 5. VPC Flow Logs

```hcl
# flow_logs.tf
resource "aws_cloudwatch_log_group" "vpc_flow" {
  name              = "/aws/vpc/flow-logs"
  retention_in_days = 30
}

resource "aws_iam_role" "vpc_flow" {
  name = "vpc-flow-logs-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "vpc_flow" {
  name = "vpc-flow-logs-policy"
  role = aws_iam_role.vpc_flow.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups"
      ]
      Resource = "*"
    }]
  })
}

resource "aws_flow_log" "main" {
  vpc_id              = aws_vpc.main.id
  iam_role_arn        = aws_iam_role.vpc_flow.arn
  log_destination     = aws_cloudwatch_log_group.vpc_flow.arn
  log_destination_type = "cloud-watch-logs"
  traffic_type        = "ALL"
}
```

### 6. VPC Endpoints para Servicios AWS

```hcl
# endpoints.tf
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [for rt in aws_route_table.private : rt.id]
}

resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.secretsmanager"
  vpc_endpoint_type = "Interface"
  subnet_ids        = [for s in aws_subnet.private : s.id]
  security_group_ids = [aws_security_group.database.id]
  private_dns_enabled = true
}
```

### 7. Network ACLs para Defensa en Profundidad

```hcl
# nacls.tf
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [for s in aws_subnet.public : s.id]

  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}
```

### 8. Variables para Reusabilidad

```hcl
# variables.tf
variable "environment" {
  type    = string
  default = "production"
}

variable "cidr_block" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "single_nat_gateway" {
  type    = bool
  default = false
}

# NAT condicional: uno por AZ para prod, uno solo para dev
resource "aws_nat_gateway" "main" {
  count = var.single_nat_gateway ? 1 : length(var.availability_zones)
  allocation_id = var.single_nat_gateway ? aws_eip.nat[0].id : aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}
```

## Mejores Practicas Adicionales

1. **Taggea todo consistentemente.** Usa un bloque `locals` para tags comunes:

```hcl
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "platform"
  }
}
```

2. **Usa `cidrsubnet` para allocation de CIDR predecible.** Evita harcodear CIDRs de subredes:

```hcl
# Publicas: 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24
# Privadas: 10.0.100.0/24, 10.0.101.0/24, 10.0.102.0/24
cidr_block = cidrsubnet(var.cidr_block, 8, count.index)
```

3. **Habilita VPC Flow Logs desde el dia uno.** Habilitar retroactivamente significa perder datos de auditoria:

```bash
# Query flow logs para trafico rechazado
aws logs filter-log-events \
  --log-group-name /aws/vpc/flow-logs \
  --filter-pattern "REJECT"
```

## Errores Comunes Adicionales

1. **Olvidar `depends_on` para VPC endpoints.** Los Gateway endpoints necesitan que las route tables existan primero:

```hcl
resource "aws_vpc_endpoint" "s3" {
  # ...
  depends_on = [aws_route_table.private]
}
```

2. **No usar `private_dns_enabled` para interface endpoints.** Sin esto, los servicios resuelven a IPs publicas en lugar de privadas:

```hcl
private_dns_enabled = true  # Critico para Secrets Manager, SSM, etc.
```

3. **CIDR blocks superpuestos al hacer peering.** Planifica rangos CIDR upfront para evitar conflictos:

```hcl
# VPC A: 10.0.0.0/16
# VPC B: 10.1.0.0/16  (no 10.0.0.0/16)
# VPC C: 10.2.0.0/16
```

## FAQ Adicional

### Como estimo los costos de la VPC?

Los NAT Gateways son el principal driver de costo: ~$32/mes por gateway mas $0.045/GB procesado. Usa `single_nat_gateway = true` para ambientes dev. Los VPC endpoints cuestan ~$7/mes por interface endpoint pero ahorran en fees de procesamiento de NAT.

### Que bloque CIDR debo usar?

Usa rangos RFC 1918: `10.0.0.0/16` (65k IPs), `172.16.0.0/16`, o `192.168.0.0/16`. Evita superposicion con redes on-premises o otras VPCs que planeas conectar via peering.

### Como migro una VPC creada desde consola a Terraform?

```bash
# Importar recursos existentes
terraform import aws_vpc.main vpc-abc123
terraform import aws_subnet.public[0] subnet-abc123
terraform import aws_internet_gateway.main igw-abc123

# Luego corre terraform plan para reconciliar drift
terraform plan
```

## Tips de Rendimiento

1. **Usa Gateway endpoints para S3 y DynamoDB.** Sin charge por GB, a diferencia de Interface endpoints:

```hcl
# Gateway endpoint: gratis, sin costo por GB
vpc_endpoint_type = "Gateway"

# Interface endpoint: $7/mes + por GB
vpc_endpoint_type = "Interface"
```

2. **Coloca NAT Gateways en cada AZ.** Trafico NAT cross-AZ incursa costos dobles de transferencia:

```hcl
# Un NAT por AZ evita cargos cross-AZ
count = length(var.availability_zones)
```

3. **Usa `aws_ec2_transit_gateway` para multi-VPC.** Peering escala como O(n²) conexiones; Transit Gateway es O(n):

```hcl
resource "aws_ec2_transit_gateway" "main" {
  description = "Platform transit gateway"
  tags        = local.common_tags
}
```
