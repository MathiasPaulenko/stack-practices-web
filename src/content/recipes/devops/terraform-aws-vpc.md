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

### 6. VPC Endpoints for AWS Services

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

### 7. Network ACLs for Defense in Depth

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

### 8. Variables for Reusability

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

# Conditional NAT: one per AZ for prod, single for dev
resource "aws_nat_gateway" "main" {
  count = var.single_nat_gateway ? 1 : length(var.availability_zones)
  allocation_id = var.single_nat_gateway ? aws_eip.nat[0].id : aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}
```

## Additional Best Practices

1. **Tag everything consistently.** Use a `locals` block for common tags:

```hcl
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "platform"
  }
}
```

2. **Use `cidrsubnet` for predictable CIDR allocation.** Avoid hardcoding subnet CIDRs:

```hcl
# Public: 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24
# Private: 10.0.100.0/24, 10.0.101.0/24, 10.0.102.0/24
cidr_block = cidrsubnet(var.cidr_block, 8, count.index)
```

3. **Enable VPC Flow Logs from day one.** Retroactively enabling means lost audit data:

```bash
# Query flow logs for rejected traffic
aws logs filter-log-events \
  --log-group-name /aws/vpc/flow-logs \
  --filter-pattern "REJECT"
```

## Additional Common Mistakes

1. **Forgetting `depends_on` for VPC endpoints.** Gateway endpoints need route tables to exist first:

```hcl
resource "aws_vpc_endpoint" "s3" {
  # ...
  depends_on = [aws_route_table.private]
}
```

2. **Not using `private_dns_enabled` for interface endpoints.** Without it, services resolve to public IPs instead of private:

```hcl
private_dns_enabled = true  # Critical for Secrets Manager, SSM, etc.
```

3. **Overlapping CIDR blocks when peering.** Plan CIDR ranges upfront to avoid conflicts:

```hcl
# VPC A: 10.0.0.0/16
# VPC B: 10.1.0.0/16  (not 10.0.0.0/16)
# VPC C: 10.2.0.0/16
```

## Additional FAQ

### How do I estimate VPC costs?

NAT Gateways are the main cost driver: ~$32/month per gateway plus $0.045/GB processed. Use `single_nat_gateway = true` for dev environments. VPC endpoints cost ~$7/month per interface endpoint but save on NAT data processing fees.

### What CIDR block should I use?

Use RFC 1918 ranges: `10.0.0.0/16` (65k IPs), `172.16.0.0/16`, or `192.168.0.0/16`. Avoid overlapping with on-premises networks or other VPCs you plan to peer with.

### How do I migrate from console-created VPC to Terraform?

```bash
# Import existing resources
terraform import aws_vpc.main vpc-abc123
terraform import aws_subnet.public[0] subnet-abc123
terraform import aws_internet_gateway.main igw-abc123

# Then run terraform plan to reconcile drift
terraform plan
```

## Performance Tips

1. **Use Gateway endpoints for S3 and DynamoDB.** No per-GB charge, unlike Interface endpoints:

```hcl
# Gateway endpoint: free, no per-GB cost
vpc_endpoint_type = "Gateway"

# Interface endpoint: $7/month + per-GB
vpc_endpoint_type = "Interface"
```

2. **Place NAT Gateways in each AZ.** Cross-AZ NAT traffic incurs double data transfer costs:

```hcl
# One NAT per AZ avoids cross-AZ charges
count = length(var.availability_zones)
```

3. **Use `aws_ec2_transit_gateway` for multi-VPC.** Peering scales as O(n²) connections; Transit Gateway is O(n):

```hcl
resource "aws_ec2_transit_gateway" "main" {
  description = "Platform transit gateway"
  tags        = local.common_tags
}
```
