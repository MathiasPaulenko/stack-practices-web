---
contentType: recipes
slug: terraform-aws-vpc
title: "Provision an AWS VPC with Terraform"
description: "How to use Terraform to provision a production-ready AWS VPC with public and private subnets, NAT gateways, and security groups"
metaDescription: "Provision an AWS VPC with Terraform. Create public and private subnets, NAT gateways, routing tables, and security groups for production infrastructure."
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
  - /recipes/devops/aws-ecs-fargate
  - /guides/infrastructure-as-code-guide
  - /patterns/design/builder-pattern-configuration
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Provision an AWS VPC with Terraform. Create public and private subnets, NAT gateways, routing tables, and security groups for production infrastructure."
  keywords:
    - terraform
    - aws vpc
    - infrastructure as code
    - networking
    - devops
---

# Provision an AWS VPC with Terraform

A well-structured VPC is the foundation of secure cloud infrastructure. Terraform allows you to define the entire network topology — subnets, routing, gateways, and security groups — as version-controlled code that can be recreated identically across environments.

## When to Use This

- You need repeatable, version-controlled network infrastructure across dev/staging/prod. See [Git Workflow](/recipes/devops/git-workflow) for version-controlled infrastructure.
- Applications require both public-facing and internal-only resources. See [AWS ECS Fargate](/recipes/devops/aws-ecs-fargate) for container deployment.
- You want to enforce network segmentation between different tiers. See [Load Balancing HAProxy](/recipes/devops/load-balancing-haproxy) for tier separation.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform 1.5+ installed

## Solution

### 1. VPC and Subnets

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

### 2. Internet and NAT Gateways

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

### 3. Route Tables

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
  description = "Allow HTTP and HTTPS traffic"

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
  description = "Allow database access from web tier only"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  tags = { Name = "database-sg" }
}
```

## How It Works

1. **VPC** defines the private IP address space for all resources
2. **Public Subnets** route traffic through the Internet Gateway for external access
3. **Private Subnets** route outbound traffic through NAT Gateways for security
4. **Route Tables** control traffic direction per subnet
5. **Security Groups** act as stateful firewalls at the instance level

## Production Considerations

- Use **Terraform workspaces** or separate state files for each environment
- Enable **VPC Flow Logs** to CloudWatch for network traffic auditing
- Place databases and internal services in **private subnets only**
- Use **AWS Network Firewall** or **Security Groups** for defense in depth

## Common Mistakes

- Forgetting to enable `map_public_ip_on_launch` for public subnet instances
- Placing NAT Gateways in private subnets instead of public subnets
- Using overly permissive CIDR blocks like `0.0.0.0/0` in security group ingress

## FAQ

**Q: Should I use one NAT Gateway or one per AZ?**
A: One per AZ eliminates a single point of failure and avoids cross-AZ data transfer costs. For cost-sensitive dev environments, one NAT Gateway is acceptable.

**Q: How do I peer this VPC with another?**
A: Use `aws_vpc_peering_connection` and add routes in both VPCs pointing to the peered CIDR block.

**Q: Can I import an existing VPC into Terraform?**
A: Yes. Use `terraform import aws_vpc.main <vpc-id>` and then write the matching configuration.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
