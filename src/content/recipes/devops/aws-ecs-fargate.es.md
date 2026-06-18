---
contentType: recipes
slug: aws-ecs-fargate
title: "Desplegar Contenedores en AWS ECS con Fargate"
description: "Como desplegar contenedores Docker en AWS ECS usando computacion serverless Fargate con Terraform y GitHub Actions"
metaDescription: "Despliega contenedores en AWS ECS con Fargate. Usa Terraform para infraestructura, GitHub Actions para CI/CD y ALB para balanceo de carga."
difficulty: intermediate
topics:
  - devops
tags:
  - aws
  - docker
  - devops
relatedResources:
  - /recipes/docker-compose
  - /guides/infrastructure-as-code-guide
  - /patterns/facade-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Despliega contenedores en AWS ECS con Fargate. Usa Terraform para infraestructura, GitHub Actions para CI/CD y ALB para balanceo de carga."
  keywords:
    - aws ecs
    - fargate
    - docker
    - terraform
    - github actions
---

# Desplegar Contenedores en AWS ECS con Fargate

AWS Fargate elimina la necesidad de gestionar instancias EC2 al proporcionar computacion serverless para contenedores. Combinado con ECS, Application Load Balancer y Terraform, obtienes una plataforma de contenedores lista para produccion sin sobrecarga operativa.

## Cuando Usar Esto

- Quieres ejecutar contenedores sin gestionar servidores
- Necesitas auto-escalado basado en CPU o cantidad de peticiones
- Quieres infraestructura como codigo para entornos reproducibles

## Requisitos Previos

- AWS CLI configurado con permisos IAM apropiados
- Docker instalado localmente
- Terraform 1.5+

## Solucion: Terraform + ECS Fargate

### 1. Infraestructura Terraform

```hcl
# main.tf
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = "us-east-1" }

# VPC y networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name            = "ecs-vpc"
  cidr            = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}

# Cluster ECS
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

# Definicion de Tarea
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

# Servicio
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

### 2. Desplegar

```bash
terraform init
terraform apply
```

### 3. CI/CD con GitHub Actions

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

## Como Funciona

1. **Fargate** provisiona computacion bajo demanda sin gestionar instancias EC2
2. **ALB** distribuye el trafico entre tareas y maneja health checks
3. **Task Definition** define la imagen del contenedor, recursos y networking
4. **Service** mantiene el conteo deseado e integra con los grupos de destino de ALB

## Consideraciones de Produccion

- Usa **Application Auto Scaling** para escalar tareas basado en CPU o cantidad de peticiones
- Almacena secretos en **AWS Secrets Manager** y referencialos en las definiciones de tarea
- Habilita **CloudWatch Container Insights** para metricas y logging
- Usa **despliegues Blue/Green** con CodeDeploy para actualizaciones sin downtime

## FAQ

**P: Como se compara el precio de Fargate con EC2?**
R: Fargate cuesta ~2x el costo de computo de EC2 pero elimina la sobrecarga operativa. Para cargas de trabajo pequenas, la diferencia es despreciable.

**P: Puedo usar imagenes de contenedor privadas?**
R: Si, almacenalas en Amazon ECR o usa `image_pull_secret` para registros externos.

**P: Como depuro tareas fallidas?**
R: Revisa CloudWatch Logs para la familia de tareas y usa ECS Exec para SSH en contenedores en ejecucion.
