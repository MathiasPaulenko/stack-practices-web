---
contentType: guides
slug: aws-basics-guide
title: "AWS Basics — Core Services for Developers"
description: "A practical guide to AWS core services for developers: compute, storage, databases, networking, and security fundamentals with hands-on examples."
metaDescription: "Learn AWS core services for developers: EC2, S3, RDS, Lambda, VPC. Practical guide with examples for building and deploying cloud applications."
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
  - guide
relatedResources:
  - /guides/terraform-best-practices-guide
  - /guides/kubernetes-advanced-guide
  - /guides/finops-guide
  - /recipes/devops/deploy-static-site-aws
  - /recipes/infrastructure/create-s3-bucket
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn AWS core services for developers: EC2, S3, RDS, Lambda, VPC. Practical guide with examples for building and deploying cloud applications."
  keywords:
    - aws
    - cloud-computing
    - ec2
    - s3
    - rds
    - lambda
    - vpc
    - guide
---

## Overview

Amazon Web Services (AWS) is the most widely adopted cloud platform, offering over 200 services. For developers, mastering the core services — compute, storage, databases, networking, and security — is essential for building scalable, cost-effective applications. This guide focuses on the services you will use daily and how they fit together in a typical architecture.

## When to Use

- You are migrating from on-premises to cloud
- You need scalable compute without managing hardware
- You want managed databases and storage
- You are building serverless or microservices architectures

## Compute — EC2 and Lambda

### EC2 (Elastic Compute Cloud)

Virtual servers in the cloud with full OS control.

```bash
# Launch an instance via CLI
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 1 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-123456 \
  --subnet-id subnet-123456
```

| Instance Family | Use Case |
|-----------------|----------|
| T3/T4g | General purpose, burstable (dev/test) |
| M6i/M6g | General purpose, sustained workloads |
| C6i/C6g | Compute-intensive (APIs, batch) |
| R6i/R6g | Memory-intensive (caches, analytics) |

### Lambda

Serverless functions that run in response to events. Pay per invocation and duration.

```python
import json

def handler(event, context):
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Hello from Lambda'})
    }
```

Lambda integrates with S3, API Gateway, SQS, SNS, DynamoDB streams, and CloudWatch Events.

## Storage — S3 and EBS

### S3 (Simple Storage Service)

Object storage for files, backups, static assets, and data lakes.

```bash
# Create a bucket
aws s3 mb s3://my-app-bucket

# Upload a file
aws s3 cp app.zip s3://my-app-bucket/builds/

# Make public (with caution)
aws s3api put-object-acl --bucket my-app-bucket --key app.zip --acl public-read
```

| Storage Class | Use Case | Retrieval |
|---------------|----------|-----------|
| Standard | Frequently accessed | Immediate |
| Intelligent-Tiering | Unknown access patterns | Immediate |
| Glacier | Long-term archives | Minutes to hours |
| Deep Archive | Compliance backups | 12-48 hours |

### EBS (Elastic Block Store)

Persistent block storage for EC2 instances. Like a virtual hard drive.

```bash
# Create and attach a volume
aws ec2 create-volume --size 100 --region us-east-1 --availability-zone us-east-1a --volume-type gp3
aws ec2 attach-volume --volume-id vol-12345 --instance-id i-12345 --device /dev/sdf
```

## Databases — RDS and DynamoDB

### RDS (Relational Database Service)

Managed PostgreSQL, MySQL, MariaDB, SQL Server, and Oracle.

```bash
# Create a PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password secret123 \
  --allocated-storage 20
```

### DynamoDB

Managed NoSQL key-value and document database with single-digit millisecond latency.

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')

table.put_item(Item={'id': 'user-1', 'name': 'Alice', 'email': 'alice@example.com'})
response = table.get_item(Key={'id': 'user-1'})
```

## Networking — VPC

Virtual Private Cloud isolates your resources and controls traffic.

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

Key components:
- **Subnets:** Public (with IGW route) vs Private (no direct internet)
- **Security Groups:** Stateful firewall at the instance level
- **NACLs:** Stateless firewall at the subnet level
- **NAT Gateway:** Allows private instances to reach the internet

## Security — IAM

Identity and Access Management controls who can do what.

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

Best practices:
- Use roles, not long-term access keys
- Apply least privilege
- Enable MFA for root and admin users
- Use IAM policy conditions for extra security

## Common Mistakes

- **Leaving S3 buckets public** — use bucket policies and Block Public Access
- **Using root credentials** — create IAM users and roles immediately
- **No VPC flow logs** — you cannot debug what you cannot see
- **Oversized EC2 instances** — start small and scale up; use CloudWatch metrics
- **Ignoring cost alerts** — set up billing alarms before you get surprised

## FAQ

**Is AWS free?**
AWS offers a Free Tier: 12 months of limited usage on EC2, S3, RDS, and Lambda. Always monitor billing.

**Should I use ECS, EKS, or Lambda?**
- Lambda: event-driven, short-lived tasks
- ECS: containerized workloads, AWS-native
- EKS: Kubernetes-based workloads, multi-cloud portability

**How do I secure secrets?**
Use AWS Secrets Manager or Parameter Store (SSM). Never hardcode credentials in code or EC2 user data.
