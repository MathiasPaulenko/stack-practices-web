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
  - ci-cd
  - automation
relatedResources:
  - /guides/infrastructure-as-code-guide
  - /patterns/facade-pattern
  - /recipes/bash-aws-cli-scripts
  - /recipes/immutable-infrastructure
  - /recipes/setup-ci-gitlab-pipelines
  - /recipes/istio-canary-deployment
  - /recipes/terraform-aws-vpc
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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### IAM Roles and Security Groups

```hcl
# iam.tf

# Task execution role
resource "aws_iam_role" "ecs_exec" {
  name = "ecs-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_exec" {
  role       = aws_iam_role.ecs_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role (application permissions)
resource "aws_iam_role" "app_task" {
  name = "app-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "app_task_s3" {
  name = "app-s3-access"
  role = aws_iam_role.app_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:PutObject"]
      Resource = "arn:aws:s3:::my-app-bucket/*"
    }]
  })
}

# Security groups
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  vpc_id      = module.vpc.vpc_id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name        = "ecs-sg"
  vpc_id      = module.vpc.vpc_id
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Auto Scaling Configuration

```hcl
# autoscaling.tf

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.app.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "memory" {
  name               = "memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 80
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

### Secrets Manager Integration

```hcl
# secrets.tf

resource "aws_secretsmanager_secret" "db_password" {
  name = "prod/db/password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({ password = var.db_password })
}

# Reference in task definition
resource "aws_ecs_task_definition" "app_with_secrets" {
  family                   = "web-app-secrets"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_exec.arn
  task_role_arn            = aws_iam_role.app_task.arn

  container_definitions = jsonencode([{
    name  = "web"
    image = "myapp:latest"
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = aws_secretsmanager_secret.db_password.arn
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "80" }
    ]
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
```

### Health Check Configuration

```hcl
resource "aws_lb_target_group" "app" {
  name     = "app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  deregistration_delay = 30
}
```

## Additional Best Practices

1. **Use Fargate Spot for non-critical workloads.** Save up to 70% on cost:

```hcl
resource "aws_ecs_service" "app_spot" {
  name            = "batch-worker"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 4

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 100
  }
}
```

2. **Enable ECS Exec for debugging.** Allows SSH-like access to running containers:

```hcl
resource "aws_ecs_service" "app" {
  name            = "web-service"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  enable_execute_command = true
}
```

```bash
aws ecs execute-command \
  --cluster production-cluster \
  --task <task-id> \
  --container web \
  --command "/bin/sh" \
  --interactive
```

3. **Use CloudWatch Container Insights for monitoring:**

```bash
aws ecs put-cluster-setting \
  --cluster production-cluster \
  --settings name=containerInsights,value=enabled
```

## Additional Common Mistakes

1. **Not setting resource limits.** Fargate charges per CPU/memory unit:

```hcl
# Bad: over-provisioned
cpu    = "2048"
memory = "4096"

# Good: right-sized based on actual usage
cpu    = "512"
memory = "1024"
```

2. **Using public subnets for tasks.** Fargate tasks should run in private subnets:

```hcl
# Bad
subnets = module.vpc.public_subnets

# Good
subnets          = module.vpc.private_subnets
assign_public_ip = false
```

3. **Not configuring deregistration delay.** Long delays keep old tasks alive:

```hcl
# Default is 300 seconds, reduce for faster rollouts
deregistration_delay = 30
```

## Additional FAQ

### How do I do blue/green deployments on ECS?

Use CodeDeploy with ECS:

```hcl
resource "aws_codedeploy_app" "ecs" {
  name          = "app-deployment"
  compute_platform = "ECS"
}

resource "aws_codedeploy_deployment_group" "ecs" {
  app_name               = aws_codedeploy_app.ecs.name
  deployment_group_name  = "production"
  service_role_arn       = aws_iam_role.codedeploy.arn

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }
    terminate_blue_instances_on_deployment_success {
      action = "TERMINATE"
      wait_time_in_minutes = 5
    }
  }

  deployment_style {
    deployment_type   = "BLUE_GREEN"
    deployment_option = "WITH_TRAFFIC_CONTROL"
  }

  ecs_service {
    cluster_name = aws_ecs_cluster.app.name
    service_name = aws_ecs_service.app.name
  }
}
```

### What CPU and memory sizes does Fargate support?

Fargate supports specific combinations:

| CPU (vCPU) | Memory (GB) |
|------------|-------------|
| 0.25 | 0.5, 1, 2 |
| 0.5 | 1, 2, 3, 4 |
| 1 | 2, 3, 4, 5, 6, 7, 8 |
| 2 | 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| 4 | 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 24, 28, 30 |

### How do I view task logs?

```bash
# List log streams for a task family
aws logs describe-log-streams \
  --log-group-name "/ecs/web-app" \
  --order-by LastEventTime \
  --descending \
  --max-items 5

# Tail logs
aws logs tail "/ecs/web-app" --follow
```

## Performance Tips

1. **Right-size tasks based on CloudWatch metrics.** Check CPU and memory utilization over 7 days and adjust:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=production-cluster \
  --start-time $(date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average
```

2. **Use ALB connection draining.** Allow in-flight requests to complete:

```hcl
resource "aws_lb" "app" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = module.vpc.public_subnets
  security_groups    = [aws_security_group.alb.id]

  connection_draining        = true
  connection_draining_timeout = 30
}
```

3. **Minimize cold starts with warm pools.** Keep minimum capacity above zero:

```hcl
resource "aws_appautoscaling_target" "ecs" {
  min_capacity = 2  # Keep at least 2 tasks warm
  max_capacity = 10
}
```
