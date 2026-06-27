---
contentType: recipes
slug: aws-ecs-fargate
title: "Deploy Containers to AWS ECS with Fargate"
description: "How to deploy Docker containers to AWS ECS using Fargate serverless compute with Terraform and GitHub Actions"
metaDescription: "Deploy containers to AWS ECS with Fargate. Use Terraform for infrastructure, GitHub Actions for CI/CD, and ALB for load balancing."
difficulty: intermediate
topics:
  - devops
tags:
  - aws
  - docker
  - devops
relatedResources:
  - /guides/infrastructure-as-code-guide
  - /patterns/facade-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Deploy containers to AWS ECS with Fargate. Use Terraform for infrastructure, GitHub Actions for CI/CD, and ALB for load balancing."
  keywords:
    - aws ecs
    - fargate
    - docker
    - terraform
    - github actions
---

# Deploy Containers to AWS ECS with Fargate

AWS Fargate removes the need to manage EC2 instances by providing serverless compute for containers. Combined with ECS, Application Load Balancer, and Terraform, you get a production-ready container platform without operational overhead.

## When to Use This

- You want to run containers without managing servers. See [Docker Basics](/recipes/devops/docker-basics) for container fundamentals.
- You need auto-scaling based on CPU or request count. See [Load Testing](/recipes/testing/load-testing) for performance baselines.
- You want infrastructure as code for reproducible environments. See [Terraform AWS VPC](/recipes/devops/terraform-aws-vpc) for network infrastructure as code.

## Prerequisites

- AWS CLI configured with appropriate IAM permissions
- Docker installed locally
- Terraform 1.5+

## Solution: Terraform + ECS Fargate

### 1. Terraform Infrastructure

```hcl
# main.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = "us-east-1" }

# VPC and networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name            = "ecs-vpc"
  cidr            = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}

# ECS Cluster
resource "aws_ecs_cluster" "app" {
  name = "production-cluster"
}

resource "aws_ecs_cluster_capacity_providers" "app" {
  cluster_name = aws_ecs_cluster.app.name
  capacity_providers = ["FARGATE"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "web-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_exec.arn

  container_definitions = jsonencode([{
    name  = "web"
    image = "nginx:alpine"
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = "us-east-1"
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

# Service
resource "aws_ecs_service" "app" {
  name            = "web-service"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "web"
    container_port   = 80
  }
}

# Application Load Balancer
resource "aws_lb" "app" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = module.vpc.public_subnets
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_target_group" "app" {
  name     = "app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id
  target_type = "ip"
}

resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.app.arn
  port              = "80"
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

### 2. Deploy

```bash
terraform init
terraform apply
```

### 3. CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push image
        run: |
          docker build -t myapp:${{ github.sha }} .
          docker tag myapp:${{ github.sha }} $ECR_REGISTRY/myapp:${{ github.sha }}
          docker push $ECR_REGISTRY/myapp:${{ github.sha }}

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster production-cluster \
            --service web-service \
            --force-new-deployment
```

## How It Works

1. **Fargate** provisions compute on demand without managing EC2 instances
2. **ALB** distributes traffic across tasks and handles health checks
3. **Task Definition** defines the container image, resources, and networking
4. **Service** maintains the desired count and integrates with ALB target groups

## Production Considerations

- Use **Application Auto Scaling** to scale tasks based on CPU or request count
- Store secrets in **AWS Secrets Manager** and reference them in task definitions
- Enable **CloudWatch Container Insights** for metrics and logging
- Use **Blue/Green deployments** with CodeDeploy for zero-downtime updates

## FAQ

**Q: How does Fargate pricing compare to EC2?**
A: Fargate is ~2x the compute cost of EC2 but eliminates operational overhead. For small workloads, the difference is negligible.

**Q: Can I use private container images?**
A: Yes, store them in Amazon ECR or use `image_pull_secret` for external registries.

**Q: How do I debug failing tasks?**
A: Check CloudWatch Logs for the task family and use ECS Exec to SSH into running containers.
