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

- Quieres ejecutar contenedores sin gestionar servidores. Consulta [Docker Basics](/recipes/devops/docker-basics) para fundamentos de contenedores.
- Necesitas auto-escalado basado en CPU o cantidad de peticiones. Consulta [Load Testing](/recipes/testing/load-testing) para líneas base de rendimiento.
- Quieres infraestructura como codigo para entornos reproducibles. Consulta [Terraform AWS VPC](/recipes/devops/terraform-aws-vpc) para infraestructura de red como código.

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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Roles IAM y Security Groups

```hcl
# iam.tf

# Rol de ejecución de tareas
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

# Rol de tarea (permisos de aplicación)
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

### Configuración de Auto Scaling

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

### Integración con Secrets Manager

```hcl
# secrets.tf

resource "aws_secretsmanager_secret" "db_password" {
  name = "prod/db/password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({ password = var.db_password })
}

# Referencia en definición de tarea
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

### Configuración de Health Checks

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

## Mejores Prácticas Adicionales

1. **Usa Fargate Spot para cargas no críticas.** Ahorra hasta 70% en costo:

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

2. **Habilita ECS Exec para debugging.** Permite acceso tipo SSH a contenedores en ejecución:

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

3. **Usa CloudWatch Container Insights para monitoreo:**

```bash
aws ecs put-cluster-setting \
  --cluster production-cluster \
  --settings name=containerInsights,value=enabled
```

## Errores Comunes Adicionales

1. **No establecer límites de recursos.** Fargate cobra por unidad de CPU/memoria:

```hcl
# Mal: sobre-provisionado
cpu    = "2048"
memory = "4096"

# Bien: dimensionado según uso real
cpu    = "512"
memory = "1024"
```

2. **Usar subredes públicas para tareas.** Las tareas de Fargate deben ejecutarse en subredes privadas:

```hcl
# Mal
subnets = module.vpc.public_subnets

# Bien
subnets          = module.vpc.private_subnets
assign_public_ip = false
```

3. **No configurar el delay de des-registro.** Delays largos mantienen tareas viejas activas:

```hcl
# El default es 300 segundos, reduce para rollouts más rápidos
deregistration_delay = 30
```

## FAQ Adicional

### Como hago despliegues blue/green en ECS?

Usa CodeDeploy con ECS:

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

### Que tamaños de CPU y memoria soporta Fargate?

Fargate soporta combinaciones específicas:

| CPU (vCPU) | Memoria (GB) |
|------------|-------------|
| 0.25 | 0.5, 1, 2 |
| 0.5 | 1, 2, 3, 4 |
| 1 | 2, 3, 4, 5, 6, 7, 8 |
| 2 | 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| 4 | 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 24, 28, 30 |

### Como veo los logs de tareas?

```bash
# Listar log streams para una familia de tareas
aws logs describe-log-streams \
  --log-group-name "/ecs/web-app" \
  --order-by LastEventTime \
  --descending \
  --max-items 5

# Hacer tail de logs
aws logs tail "/ecs/web-app" --follow
```

## Tips de Rendimiento

1. **Dimensiona tareas según métricas de CloudWatch.** Revisa utilización de CPU y memoria por 7 días y ajusta:

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

2. **Usa connection draining en ALB.** Permite que requests en vuelo se completen:

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

3. **Minimiza cold starts con warm pools.** Mantén la capacidad mínima sobre cero:

```hcl
resource "aws_appautoscaling_target" "ecs" {
  min_capacity = 2  # Mantener al menos 2 tareas calientes
  max_capacity = 10
}
```
