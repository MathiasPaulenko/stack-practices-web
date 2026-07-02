---
contentType: guides
slug: complete-guide-cost-optimization-aws
title: "Guía Completa de Optimización de Costos en AWS"
description: "Reduce el gasto en AWS cloud en 40%. Cubre EC2 right-sizing, Spot instances, Reserved Instances, Savings Plans, S3 lifecycle, RDS optimization, networking, monitoreo y automatización."
metaDescription: "Guía de optimización de costos AWS. Reduce el gasto cloud 40%. Master EC2 right-sizing, Spot, Reserved Instances, Savings Plans, S3 lifecycle y monitoreo."
difficulty: intermediate
topics:
  - infrastructure
  - devops
tags:
  - aws
  - cost-optimization
  - cloud
  - ec2
  - spot-instances
  - reserved-instances
  - savings-plans
  - guide
  - infrastructure
relatedResources:
  - /guides/devops/complete-guide-terraform-modules
  - /guides/devops/complete-guide-ci-cd-github-actions
  - /guides/observability/complete-guide-observability-grafana-stack
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Guía de optimización de costos AWS. Reduce el gasto cloud 40%. Master EC2 right-sizing, Spot, Reserved Instances, Savings Plans, S3 lifecycle y monitoreo."
  keywords:
    - aws cost optimization
    - reduce aws bill
    - ec2 right sizing
    - spot instances
    - reserved instances
    - savings plans
    - s3 lifecycle
    - cloud cost
---

# Guía Completa de Optimización de Costos en AWS

## Introducción

Las bills de AWS crecen silenciosamente — resources no usados, instancias over-provisioned y falta de monitoreo pueden inflar costos en 40% o más. Esta guía cubre EC2 right-sizing, Spot y Reserved Instances, Savings Plans, S3 lifecycle policies, RDS optimization, networking costs y automated cost monitoring.

## Cost Explorer y Budgets

### Analizando spending

```bash
# Instalar AWS CLI
pip install awscli

# Obtener cost breakdown por service
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Obtener costo por tag
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG Key=Environment
```

### Seteando budgets

```bash
# Crear un monthly budget alert
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "MonthlyBudget",
    "BudgetLimit": {"Amount": "5000", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80
      },
      "Subscribers": [{
        "SubscriptionType": "EMAIL",
        "Address": "ops@example.com"
      }]
    }
  ]'
```

## EC2 Right-Sizing

### Encontrando instancias underutilized

```bash
# Listar CPU utilization para todas las EC2 instances
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --start-time 2026-01-01T00:00:00Z \
  --end-time 2026-02-01T00:00:00Z \
  --period 86400 \
  --statistics Average \
  --output table
```

### Right-sizing con AWS Compute Optimizer

```bash
# Habilitar Compute Optimizer
aws compute-optimizer enable-compute-optimizer

# Obtener recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=finding,values=Underprovisioned,Overprovisioned
```

### Acciones típicas de right-sizing

| Actual | Recomendación | Ahorro Mensual |
|---------|---------------|----------------|
| m5.2xlarge (avg 5% CPU) | t3.large | ~$200 |
| c5.4xlarge (avg 10% CPU) | c5.xlarge | ~$250 |
| r5.xlarge (avg 15% CPU) | t3.medium | ~$150 |

## Spot Instances

### Spot Fleet para batch workloads

```json
{
  "SpotFleetRequestConfig": {
    "AllocationStrategy": "diversified",
    "IamFleetRole": "arn:aws:iam::123456789012:role/SpotFleetRole",
    "SpotPrice": "0.10",
    "TargetCapacity": 10,
    "LaunchSpecifications": [
      {
        "InstanceType": "t3.medium",
        "ImageId": "ami-12345678",
        "SubnetId": "subnet-12345678"
      },
      {
        "InstanceType": "t3.large",
        "ImageId": "ami-12345678",
        "SubnetId": "subnet-87654321"
      }
    ]
  }
}
```

### Spot con auto-scaling groups

```yaml
# Terraform
resource "aws_autoscaling_group" "spot" {
  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      override {
        instance_type = "t3.medium"
      }
      override {
        instance_type = "t3.large"
      }
    }
  }

  min_size         = 2
  max_size         = 10
  desired_capacity = 4
}
```

### Spot interruption handling

```python
import boto3

# Spot Instance Interruption Notice da 2 minutos
# Pollear metadata endpoint para interruption notices
import urllib.request
import json

def check_spot_interruption():
    try:
        response = urllib.request.urlopen(
            "http://169.254.169.254/latest/meta-data/spot/instance-action"
        )
        action = json.loads(response.read())
        if action["action"] == "terminate":
            # Drenar connections, guardar state, shutdown graceful
            print(f"Spot interruption at {action['time']}")
            graceful_shutdown()
    except:
        pass
```

## Reserved Instances y Savings Plans

### Reserved Instances

| Tipo | Commitment | Descuento | Mejor Para |
|------|-----------|----------|----------|
| Standard RI | 1 o 3 años | Hasta 72% | Steady-state workloads |
| Convertible RI | 1 o 3 años | Hasta 54% | Workloads que pueden cambiar |
| Scheduled RI | 1 año | Variable | Time windows predecibles |

### Savings Plans

```bash
# Comprar un Compute Savings Plan
aws savingsplans create-savings-plan \
  --savings-plan-type COMPUTE \
  --commitment "500" \
  --term "1YEAR" \
  --payment-option "NO_UPFRONT"
```

### Cuándo usar cuál

- **Steady-state EC2** — Standard Reserved Instances (highest discount)
- **Flexible workloads** — Compute Savings Plans (aplican a cualquier instance family)
- **Fargate/Lambda** — Compute Savings Plans (cubren Fargate y Lambda)
- **S3, DynamoDB** — No hay RIs disponibles, usar lifecycle y capacity modes

## S3 Cost Optimization

### Lifecycle policies

```json
{
  "Rules": [
    {
      "ID": "MoveToIAAfter30Days",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ]
    },
    {
      "ID": "DeleteTempFiles",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": { "Days": 7 }
    }
  ]
}
```

### S3 storage classes

| Class | Costo vs Standard | Use Case |
|-------|-----------------|----------|
| STANDARD | 1x | Frecuentemente accedido |
| STANDARD_IA | 0.5x | Infrecuentemente accedido (30+ días) |
| ONEZONE_IA | 0.4x | Infrecuentemente accedido, non-critical |
| GLACIER | 0.17x | Archive (90+ días) |
| DEEP_ARCHIVE | 0.04x | Long-term archive (365+ días) |
| INTELLIGENT_TIERING | Variable | Access patterns desconocidos |

### Intelligent-Tiering

```bash
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket my-bucket \
  --id MoveToArchive \
  --intelligent-tiering-configuration '{
    "Status": "Enabled",
    "Tierings": [
      { "Days": 90, "AccessTier": "ARCHIVE_ACCESS" },
      { "Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS" }
    ]
  }'
```

## RDS Optimization

### Right-sizing RDS

```bash
# Chequear DB instance CPU
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=mydb \
  --start-time 2026-01-01T00:00:00Z \
  --end-time 2026-02-01T00:00:00Z \
  --period 86400 \
  --statistics Average,Maximum
```

### Estrategias de RDS cost reduction

- **Downsizear instancias** — db.t4g en lugar de db.m5 si CPU < 20%
- **Reserved Instances** — hasta 69% de descuento por 3-year commitment
- **Stopar non-prod de noche** — RDS puede ser stopped por hasta 7 días
- **Usar Aurora Serverless** — escala a zero para intermittent workloads
- **Deletear unused snapshots** — snapshots viejos se acumulan silenciosamente
- **Usar read replicas sabiamente** — cada replica cuesta lo mismo que el primary

### Automated snapshot cleanup

```python
import boto3
from datetime import datetime, timedelta

rds = boto3.client("rds")

def cleanup_old_snapshots(days=30):
    cutoff = datetime.now() - timedelta(days=days)
    snapshots = rds.describe_db_snapshots()["DBSnapshots"]

    for snap in snapshots:
        if snap["SnapshotCreateTime"].replace(tzinfo=None) < cutoff:
            if not snap.get("DBSnapshotAttributes"):
                rds.delete_db_snapshot(DBSnapshotIdentifier=snap["DBSnapshotIdentifier"])
                print(f"Deleted: {snap['DBSnapshotIdentifier']}")
```

## Networking Costs

### Data transfer optimization

| Escenario | Costo |
|----------|------|
| Inbound data transfer | Free |
| Same AZ data transfer | Free |
| Cross-AZ data transfer | $0.01/GB |
| Cross-region data transfer | $0.02-0.09/GB |
| Internet egress | $0.09/GB |

### Reduciendo networking costs

- **Mantener tráfico en same AZ** — placear dependent services en la misma AZ
- **Usar VPC endpoints** — evitar NAT Gateway charges para AWS service traffic
- **Usar CloudFront** — cachear content en edge, reducir origin data transfer
- **Comprimir responses** — menos data = menos egress cost
- **Usar S3 Transfer Acceleration** — para uploads, no downloads

### VPC endpoints

```yaml
# Terraform — Gateway endpoint para S3 (free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.us-east-1.s3"
  route_table_ids = [aws_route_table.private.id]
}

# Interface endpoint para DynamoDB (~$0.01/hr)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.us-east-1.dynamodb"
  vpc_endpoint_type = "Interface"
  subnet_ids      = aws_subnet.private[*].id
}
```

## Automated Cost Monitoring

### AWS Cost Anomaly Detection

```bash
# Habilitar cost anomaly detection
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "DailyAnomaly",
    "MonitorType": "DIMENSIONAL",
    "MonitorSpecification": "{\"Dimension\":\"SERVICE\"}"
  }'
```

### Cost reports con Lambda

```python
import boto3
import json

ce = boto3.client("ce")

def lambda_handler(event, context):
    response = ce.get_cost_and-usage(
        TimePeriod={"Start": "2026-06-01", "End": "2026-07-01"},
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
        GroupBy=[{"Type": "SERVICE", "Key": "Service"}],
    )

    costs = []
    for group in response["ResultsByTime"][0]["Groups"]:
        service = group["Keys"][0]
        amount = float(group["Metrics"]["UnblendedCost"]["Amount"])
        if amount > 100:
            costs.append(f"{service}: ${amount:.2f}")

    # Enviar a Slack
    if costs:
        send_slack_notification("\n".join(costs))

    return {"statusCode": 200}
```

## Pautas

- **Habilitar Cost Explorer** — visibility es el primer paso para optimization
- **Setear budget alerts** — capturar overruns antes de que pasen
- **Right-sizear cada 3 meses** — workloads cambian, instancias también deberían
- **Usar Spot para 70%+ de non-critical workloads** — 90% de descuento
- **Commitir a RIs/Savings Plans para baseline** — cubrir 60-70% de steady-state
- **Usar S3 lifecycle policies** — mover data vieja a tiers más baratos automáticamente
- **Stopar non-prod de noche** — 65% de non-prod hours están idle
- **Deletear unused EBS volumes** — cuestan money incluso cuando unattached
- **Releasear unused Elastic IPs** — $0.005/hr cuando no attached
- **Usar VPC endpoints** — evitar NAT Gateway data processing charges
- **Taggear todo** — habilitar cost allocation por team/project
- **Reviewar mensualmente** — costs creep sin review regular

## Errores Comunes

- Dejar EC2 instances corriendo 24/7 en dev — usar auto-stop schedules
- Usar S3 Standard para archive data — lifecycle a Glacier/Deep Archive
- Over-provisionar RDS — downsizear basado en CPU/memory actual
- Ignorar NAT Gateway costs — usar VPC endpoints para AWS service traffic
- No usar Spot para batch/cron jobs — 90% savings para interruptible workloads
- Olvidar deletear snapshots viejos — se acumulan silenciosamente por meses
- Comprar RIs sin analizar usage — wrong instance family = wasted commitment
- No taggear resources — sin visibility en team/project costs
- Usar CloudWatch Logs sin retention — log volumes crecen unbounded
- Ignorar data transfer costs — cross-AZ y cross-region add up fast

## Preguntas Frecuentes

### ¿Cuánto puedo ahorrar con AWS cost optimization?

Los savings típicos van de 30-50% para organizaciones que nunca han optimizado. Los biggest wins vienen de right-sizing (15-20%), Spot instances (10-15% para eligible workloads) y RI/Savings Plans commitments (10-15% para steady-state). S3 lifecycle y networking optimization añaden otro 5-10%.

### ¿Debo usar Reserved Instances o Savings Plans?

Usar Standard RIs cuando tienes un stable, predictable EC2 workload en una specific instance family. Usar Compute Savings Plans cuando quieres flexibility across instance families, o cuando usas Fargate y Lambda. Savings Plans son la opción más nueva y flexible — AWS las recomienda para la mayoría de new commitments.

### ¿Cómo trackeo costos por team o project?

Usar AWS tags y Cost Allocation Tags. Taggear cada resource con `Team`, `Project` y `Environment`. Habilitar los tags como Cost Allocation Tags en AWS Billing. Luego usar Cost Explorer para filtrar y group by estos tags.
