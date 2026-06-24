---
contentType: guides
slug: finops-guide
title: "FinOps — Optimizacion de Costos Cloud y Operaciones Financieras"
description: "Guia practica de FinOps: visibilidad, optimizacion y gobernanza del gasto cloud. Aprende estrategias de tagging, right-sizing, instancias reservadas y cultura consciente de costos."
metaDescription: "Aprende FinOps: optimizacion de costos cloud, estrategias de tagging, right-sizing, instancias reservadas y construir cultura de ingenieria consciente de costos."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - finops
  - cloud-cost
  - cost-optimization
  - right-sizing
  - reserved-instances
  - tagging
  - governance
  - guia
relatedResources:
  - /guides/aws-basics-guide
  - /guides/terraform-best-practices-guide
  - /guides/observability-guide
  - /recipes/devops/setup-cost-alerts-aws
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende FinOps: optimizacion de costos cloud, estrategias de tagging, right-sizing, instancias reservadas y construir cultura de ingenieria consciente de costos."
  keywords:
    - finops
    - cloud-cost
    - cost-optimization
    - right-sizing
    - reserved-instances
    - tagging
    - governance
    - guia
---

## Overview

FinOps — un portmanteau de "Finance" y "DevOps" — es la practica de traer responsabilidad financiera al modelo de gasto variable de cloud computing. A diferencia de los centros de datos tradicionales con CapEx fijo, los costos cloud escalan con el uso, haciendo la visibilidad y gobernanza criticas. FinOps no se trata de recortar costos a ciegas; se trata de optimizar el gasto cloud para maximizar valor de negocio. Opera en tres fases: Informar (visibilidad), Optimizar (acciones) y Operar (gobernanza y cultura).

## When to Use

- Las facturas mensuales de cloud son impredecibles o crecen mas rapido que el revenue
- No puedes atribuir costos a equipos, productos o entornos
- Las decisiones de capacidad reservada se toman sin datos
- Los equipos de desarrollo tratan los recursos cloud como infinitos y gratuitos
- Necesitas justificar el gasto cloud a finanzas o liderazgo ejecutivo

## Las Tres Fases de FinOps

| Fase | Objetivo | Actividades |
|------|----------|-----------|
| **Informar** | Visibilidad | Tagging, asignacion de costos, dashboards, deteccion de anomalias |
| **Optimizar** | Eficiencia | Right-sizing, instancias reservadas, spot usage, autoscaling |
| **Operar** | Gobernanza | Presupuestos, politicas, chargeback/showback, cultura FinOps |

## Estrategia de Tagging

El tagging consistente es la base de la atribucion de costos:

```hcl
# Terraform: forzar tagging via politica
locals {
  mandatory_tags = {
    Owner       = var.team_email
    Environment = var.environment
    Project     = var.project_code
    CostCenter  = var.cost_center
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "api" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = local.mandatory_tags
}
```

**Tags requeridos:**
- `Environment`: production, staging, development
- `Team` / `Owner`: quien paga la factura
- `Project` / `Product`: que unidad de negocio
- `CostCenter`: codigo de tracking de finanzas
- `ManagedBy`: terraform, pulumi, manual

## Right-Sizing

| Analisis | Accion | Ahorro potencial |
|----------|--------|-----------------|
| CPU < 20% por 30 dias | Reducir instancia o usar autoscaling | 30-50% |
| Memoria < 40% por 30 dias | Reducir memoria o cambiar familia de instancia | 20-40% |
| Volumen EBS < 30% usado | Reducir volumen o eliminar | 10-20% |
| Snapshots huerfanos > 90 dias | Automatizar politica de ciclo de vida | 5-10% |
| Load balancers idle | Eliminar o consolidar | 5-10% |

```bash
# AWS CLI: encontrar instancias EC2 subutilizadas
aws ec2 describe-instance-types --filters "Name=instance-type,Values=t3.*"
# Usar Cost Explorer o metricas CloudWatch para identificar candidatos
```

## Instancias Reservadas y Savings Plans

| Compromiso | Descuento | Mejor para |
|------------|-----------|------------|
| **On-Demand** | 0% | Cargas variables, impredecibles |
| **Reserved (1 anio)** | ~30-40% | Cargas steady-state (bases de datos, runners CI) |
| **Reserved (3 anios)** | ~50-60% | Cargas muy estables con ciclos de vida largos |
| **Savings Plans** | ~20-40% | Compromiso flexible entre familias de instancias |
| **Spot Instances** | ~70-90% | Cargas tolerantes a interrupcion (batch, CI) |

**Regla de oro:** Solo comprometete a reservas para cargas con 12+ meses de historial de utilizacion estable.

## Deteccion de Anomalias de Costo

```python
# Ejemplo: AWS Cost Anomaly Detection con CloudWatch
import boto3

client = boto3.client('ce')

response = client.get_cost_and_usage(
    TimePeriod={
        'Start': '2026-06-01',
        'End': '2026-06-25'
    },
    Granularity='DAILY',
    Metrics=['BlendedCost'],
    GroupBy=[
        {'Type': 'TAG', 'Key': 'Project'},
        {'Type': 'TAG', 'Key': 'Environment'}
    ]
)

# Alertar si gasto diario > 120% del promedio de 30 dias
```

## Construyendo una Cultura Consciente de Costos

| Tactica | Implementacion |
|---------|---------------|
| **Dashboards de showback** | Dashboards de costo por equipo en Grafana o CloudWatch |
| **Costo en PR comments** | Bot de Infracost comenta impacto de costo Terraform en PRs |
| **Alertas de presupuesto** | AWS Budgets al 80%, 100%, 120% del forecast mensual |
| **Game days** | Sprints trimestrales de optimizacion de costos con premios |
| **Revision arquitectonica** | Incluir estimaciones de costo en docs de diseno |

## Common Mistakes

- **Tagging despues del hecho** — tagging retroactivo es doloroso; forzar en creacion via politica
- **Sobre-comprometerse a RIs** — comprar reservas de 3 anios para cargas que pueden cambiar en 6 meses
- **Ignorar costos de transferencia de datos** — egress entre regiones y a internet puede ser 20-40% de la factura
- **Optimizar sin visibilidad** — no puedes hacer right-sizing de lo que no puedes medir
- **Hacer de finanzas el enemigo** — FinOps es una alianza entre ingenieria y finanzas, no un mandato de recorte

## FAQ

**Cual es la diferencia entre FinOps y cloud cost management?**
Cloud cost management es herramientas y dashboards. FinOps es una practica cultural que incluye esas herramientas mas accountability, gobernanza y colaboracion cross-funcional.

**Como manejamos servicios compartidos (DNS, VPC, monitoreo)?**
Asigna costos compartidos por una metrica justa: porcentaje de uso de compute, numero de servicios, o headcount. Documenta el metodo de asignacion y revisa trimestralmente.

**Los equipos de ingenieria deberian tener sus propios presupuestos cloud?**
Si. Los equipos que ven sus propios costos toman mejores decisiones arquitectonicas. Finanzas establece el presupuesto total; ingenieria lo asigna.
