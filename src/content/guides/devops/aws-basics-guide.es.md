---





contentType: guides
slug: aws-basics-guide
title: "AWS Básico — Servicios Core para Desarrolladores"
description: "Guía práctica de servicios core de AWS para desarrolladores: compute, storage, bases de datos, networking y fundamentos de seguridad con ejemplos hands-on."
metaDescription: "Aprende servicios core de AWS para desarrolladores: EC2, S3, RDS, Lambda, VPC. Guía práctica con ejemplos para construir y desplegar aplicaciones cloud."
difficulty: beginner
topics:
  - devops
  - infrastructure
  - data
tags:
  - aws
  - cloud-computing
  - ec2
  - s3
  - rds
  - lambda
  - vpc
  - guia
relatedResources:
  - /guides/terraform-best-practices-guide
  - /guides/kubernetes-advanced-guide
  - /guides/finops-guide
  - /guides/blob-storage-guide
  - /guides/azure-basics-guide
  - /guides/gcp-basics-guide
  - /guides/multi-cloud-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende servicios core de AWS para desarrolladores: EC2, S3, RDS, Lambda, VPC. Guía práctica con ejemplos para construir y desplegar aplicaciones cloud."
  keywords:
    - aws
    - cloud-computing
    - ec2
    - s3
    - rds
    - lambda
    - vpc
    - guia





---

## Overview

Amazon Web Services (AWS) es la plataforma cloud más adoptada, ofreciendo más de 200 servicios. Para desarrolladores, entender los servicios core — compute, storage, bases de datos, networking y seguridad — es esencial para construir aplicaciones listas para crecimiento y rentables. Esta guía se enfoca en los servicios que usarás diariamente y cómo encajan en una arquitectura típica.

## When to Use


- For alternatives, see [Azure Basics — Core Services for Developers](/es/guides/azure-basics-guide/).

- Estás migrando de on-premises a cloud
- Necesitas compute listo para crecimiento sin gestionar hardware
- Quieres bases de datos y storage gestionados
- Estás construyendo arquitecturas serverless o microservicios

## Compute — EC2 y Lambda

### EC2 (Elastic Compute Cloud)

Servidores virtuales en la cloud con control total del SO.

```bash
# Lanzar una instancia vía CLI
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 1 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-123456 \
  --subnet-id subnet-123456
```

| Familia de Instancia | Caso de Uso |
|----------------------|-------------|
| T3/T4g | General purpose, burst (dev/test) |
| M6i/M6g | General purpose, cargas sostenidas |
| C6i/C6g | Intensivo en compute (APIs, batch) |
| R6i/R6g | Intensivo en memoria (caches, analytics) |

### Lambda

Funciones serverless que ejecutan en respuesta a eventos. Pagas por invocación y duración.

```python
import json

def handler(event, context):
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Hello from Lambda'})
    }
```

Lambda se integra con S3, API Gateway, SQS, SNS, DynamoDB streams y CloudWatch Events.

## Storage — S3 y EBS

### S3 (Simple Storage Service)

Storage de objetos para archivos, backups, assets estáticos y data lakes.

```bash
# Crear un bucket
aws s3 mb s3://my-app-bucket

# Subir un archivo
aws s3 cp app.zip s3://my-app-bucket/builds/

# Hacer público (con precaución)
aws s3api put-object-acl --bucket my-app-bucket --key app.zip --acl public-read
```

| Clase de Storage | Caso de Uso | Recuperación |
|------------------|-------------|--------------|
| Standard | Acceso frecuente | Inmediata |
| Intelligent-Tiering | Patrones de acceso desconocidos | Inmediata |
| Glacier | Archivos a largo plazo | Minutos a horas |
| Deep Archive | Backups de compliance | 12-48 horas |

### EBS (Elastic Block Store)

Storage de bloque persistente para instancias EC2. Como un disco duro virtual.

```bash
# Crear y adjuntar un volumen
aws ec2 create-volume --size 100 --region us-east-1 --availability-zone us-east-1a --volume-type gp3
aws ec2 attach-volume --volume-id vol-12345 --instance-id i-12345 --device /dev/sdf
```

## Bases de Datos — RDS y DynamoDB

### RDS (Relational Database Service)

PostgreSQL, MySQL, MariaDB, SQL Server y Oracle gestionados.

```bash
# Crear una instancia PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password secret123 \
  --allocated-storage 20
```

### DynamoDB

Base de datos NoSQL gestionada con latencia de milisegundos de un solo dígito.

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')

table.put_item(Item={'id': 'user-1', 'name': 'Alice', 'email': 'alice@example.com'})
response = table.get_item(Key={'id': 'user-1'})
```

## Networking — VPC

Virtual Private Cloud aisla tus recursos y controla el tráfico.

```
┌─────────────────────────────────────────────┐
│                    VPC                        │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │ Public Subnet│    │   Private Subnet    │ │
│  │  ┌───────┐  │    │  ┌───────┐ ┌─────┐ │ │
│  │  │  ALB  │  │    │  │  EC2  │ │ RDS │ │ │
│  │  └───┬───┘  │    │  └───┬───┘ └──┬──┘ │ │
│  │      │      │    │      │        │    │ │
│  │  Internet    │    │   NAT Gateway      │ │
│  │  Gateway     │    │   (egress only)    │ │
│  └──────────────┘    └────────────────────┘ │
└─────────────────────────────────────────────┘
```

Componentes clave:
- **Subnets:** Públicas (con ruta IGW) vs Privadas (sin internet directo)
- **Security Groups:** Firewall stateful a nivel de instancia
- **NACLs:** Firewall stateless a nivel de subnet
- **NAT Gateway:** Permite a instancias privadas alcanzar internet

## Seguridad — IAM

Identity and Access Management controla quién puede hacer qué.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-app-bucket/*",
      "Condition": {
        "StringEquals": {"aws:RequestedRegion": "us-east-1"}
      }
    }
  ]
}
```

Lo que funciona:
- Usa roles, no access keys de largo plazo
- Aplica least privilege
- Habilita MFA para root y usuarios admin
- Usa condiciones de IAM policy para seguridad extra

## Errores Comunes

- **Dejar buckets S3 públicos** — usa bucket policies y Block Public Access
- **Usar credenciales root** — crea IAM users y roles inmediatamente
- **Sin VPC flow logs** — no puedes debuggear lo que no puedes ver
- **Instancias EC2 sobreprovisionadas** — empieza pequeño y escala; usa CloudWatch metrics
- **Ignorar alertas de costo** — configura billing alarms antes de sorpresas

## FAQ

**¿Es AWS gratis?**
AWS ofrece un Free Tier: 12 meses de uso limitado en EC2, S3, RDS y Lambda. Siempre monitorea billing.

**¿Debería usar ECS, EKS o Lambda?**
- Lambda: event-driven, tareas de corta duración
- ECS: workloads containerizadas, nativo AWS
- EKS: workloads basados en Kubernetes, portabilidad multi-cloud

**¿Cómo aseguro secrets?**
Usa AWS Secrets Manager o Parameter Store (SSM). Nunca hardcodees credenciales en código o EC2 user data.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Arquitectura Web en AWS

```text
Sistema: App web escalable, multi-AZ
Requisitos: 99.95% disponibilidad, auto-scaling, DR

Arquitectura:
  Route53 (DNS) -> CloudFront (CDN/WAF) -> ALB -> ECS Fargate
    AZ-a: 2 tareas
    AZ-b: 2 tareas

  ECS -> RDS PostgreSQL (Multi-AZ)
  ECS -> ElastiCache Redis (Multi-AZ)
  ECS -> S3 (assets estaticos)
  ECS -> SQS (cola async)

Servicios clave:
  | Capa | Servicio | Configuracion |
  |------|----------|--------------|
  | DNS | Route53 | Latency-based routing |
  | CDN/WAF | CloudFront + WAF | Edge global, rate limiting |
  | Load Balancer | ALB | Cross-zone, health checks |
  | Compute | ECS Fargate | 2 vCPU / 4GB por tarea |
  | DB | RDS PostgreSQL | db.r6g.large, Multi-AZ |
  | Cache | ElastiCache Redis | cache.r6g.large, Multi-AZ |
  | Storage | S3 | Standard + IA lifecycle |
  | Queue | SQS | FIFO, DLQ configurado |
  | Monitoring | CloudWatch + X-Ray | |
  | Secrets | Secrets Manager | Rotation automatica |

Auto-scaling:
  - CPU > 70% por 5 min -> scale out (+2 tareas)
  - CPU < 30% por 10 min -> scale in (-1 tarea)
  - Min: 4 tareas, Max: 20 tareas
  - ALB 5xx > 1% -> scale out + alert
  - SQS queue depth > 1000 -> scale out

Disaster Recovery:
  | Componente | RPO | RTO | Estrategia |
  |------------|-----|-----|------------|
  | RDS | < 5s | < 2min | Multi-AZ synchronous |
  | ElastiCache | < 1min | < 5min | Multi-AZ + failover |
  | S3 | 0 | 0 | Cross-region replication |
  | ECS | 0 | < 5min | Auto-scaling group multi-AZ |
  | Route53 | 0 | < 30s | Health check failover |

Costos estimados (mensual):
  | Servicio | Costo |
  |----------|-------|
  | ECS Fargate (8 tareas) | $1,200 |
  | RDS (r6g.large Multi-AZ) | $700 |
  | ElastiCache (r6g.large) | $350 |
  | S3 (1TB) | $25 |
  | ALB + data transfer | $200 |
  | CloudFront (1TB) | $85 |
  | Route53 | $5 |
  | Secrets Manager | $40 |
  | Total | ~$2,600/mes |

Lecciones:
  - Fargate elimina gestion de servidores para containers
  - Multi-AZ es obligatorio para produccion
  - CloudFront + WAF protege en el edge
  - SQS desacopla productores de consumidores
  - Secrets Manager rota credenciales automaticamente
```

### Como elijo entre ECS y EKS?

Usa ECS si solo necesitas containers sin orquestacion compleja. Es mas simple, mas barato y suficiente para la mayoria de apps. Usa EKS si necesitas Kubernetes nativo, Helm charts, service mesh, o si tu equipo ya conoce K8s. EKS tiene mas overhead operativo pero ofrece mas flexibilidad y un ecosistema mas amplio.
