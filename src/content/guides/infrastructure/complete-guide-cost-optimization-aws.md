---
contentType: guides
slug: complete-guide-cost-optimization-aws
title: "Complete Guide to AWS Cost Optimization"
description: "Reduce AWS cloud spend by 40%. Covers EC2 right-sizing, Spot instances, Reserved Instances, Savings Plans, S3 lifecycle, RDS optimization, networking, monitoring, and automation."
metaDescription: "Complete guide to AWS cost optimization. Reduce cloud spend 40%. Master EC2 right-sizing, Spot, Reserved Instances, Savings Plans, S3 lifecycle and monitoring."
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
  metaDescription: "Complete guide to AWS cost optimization. Reduce cloud spend 40%. Master EC2 right-sizing, Spot, Reserved Instances, Savings Plans, S3 lifecycle and monitoring."
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

# Complete Guide to AWS Cost Optimization

## Introduction

AWS bills grow silently — unused resources, over-provisioned instances, and lack of monitoring can inflate costs by 40% or more. This guide covers EC2 right-sizing, Spot and Reserved Instances, Savings Plans, S3 lifecycle policies, RDS optimization, networking costs, and automated cost monitoring.

## Cost Explorer and Budgets

### Analyzing spending

```bash
# Install AWS CLI
pip install awscli

# Get cost breakdown by service
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Get cost by tag
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG Key=Environment
```

### Setting up budgets

```bash
# Create a monthly budget alert
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

### Finding underutilized instances

```bash
# List CPU utilization for all EC2 instances
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

### Right-sizing with AWS Compute Optimizer

```bash
# Enable Compute Optimizer
aws compute-optimizer enable-compute-optimizer

# Get recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=finding,values=Underprovisioned,Overprovisioned
```

### Typical right-sizing actions

| Current | Recommendation | Monthly Savings |
|---------|---------------|----------------|
| m5.2xlarge (avg 5% CPU) | t3.large | ~$200 |
| c5.4xlarge (avg 10% CPU) | c5.xlarge | ~$250 |
| r5.xlarge (avg 15% CPU) | t3.medium | ~$150 |

## Spot Instances

### Spot Fleet for batch workloads

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

### Spot with auto-scaling groups

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

# Spot Instance Interruption Notice gives 2 minutes
# Poll metadata endpoint for interruption notices
import urllib.request
import json

def check_spot_interruption():
    try:
        response = urllib.request.urlopen(
            "http://169.254.169.254/latest/meta-data/spot/instance-action"
        )
        action = json.loads(response.read())
        if action["action"] == "terminate":
            # Drain connections, save state, shutdown gracefully
            print(f"Spot interruption at {action['time']}")
            graceful_shutdown()
    except:
        pass
```

## Reserved Instances and Savings Plans

### Reserved Instances

| Type | Commitment | Discount | Best For |
|------|-----------|----------|----------|
| Standard RI | 1 or 3 year | Up to 72% | Steady-state workloads |
| Convertible RI | 1 or 3 year | Up to 54% | Workloads that may change |
| Scheduled RI | 1 year | Variable | Predictable time windows |

### Savings Plans

```bash
# Purchase a Compute Savings Plan
aws savingsplans create-savings-plan \
  --savings-plan-type COMPUTE \
  --commitment "500" \
  --term "1YEAR" \
  --payment-option "NO_UPFRONT"
```

### When to use which

- **Steady-state EC2** — Standard Reserved Instances (highest discount)
- **Flexible workloads** — Compute Savings Plans (apply to any instance family)
- **Fargate/Lambda** — Compute Savings Plans (cover Fargate and Lambda)
- **S3, DynamoDB** — No RIs available, use lifecycle and capacity modes

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

| Class | Cost vs Standard | Use Case |
|-------|-----------------|----------|
| STANDARD | 1x | Frequently accessed |
| STANDARD_IA | 0.5x | Infrequently accessed (30+ days) |
| ONEZONE_IA | 0.4x | Infrequently accessed, non-critical |
| GLACIER | 0.17x | Archive (90+ days) |
| DEEP_ARCHIVE | 0.04x | Long-term archive (365+ days) |
| INTELLIGENT_TIERING | Variable | Unknown access patterns |

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
# Check DB instance CPU
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=mydb \
  --start-time 2026-01-01T00:00:00Z \
  --end-time 2026-02-01T00:00:00Z \
  --period 86400 \
  --statistics Average,Maximum
```

### RDS cost reduction strategies

- **Downsize instances** — db.t4g instead of db.m5 if CPU < 20%
- **Reserved Instances** — up to 69% discount for 3-year commitment
- **Stop non-prod at night** — RDS can be stopped for up to 7 days
- **Use Aurora Serverless** — scales to zero for intermittent workloads
- **Delete unused snapshots** — old snapshots accumulate silently
- **Use read replicas wisely** — each replica costs the same as the primary

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

| Scenario | Cost |
|----------|------|
| Inbound data transfer | Free |
| Same AZ data transfer | Free |
| Cross-AZ data transfer | $0.01/GB |
| Cross-region data transfer | $0.02-0.09/GB |
| Internet egress | $0.09/GB |

### Reducing networking costs

- **Keep traffic in same AZ** — place dependent services in the same AZ
- **Use VPC endpoints** — avoid NAT Gateway charges for AWS service traffic
- **Use CloudFront** — cache content at edge, reduce origin data transfer
- **Compress responses** — less data = less egress cost
- **Use S3 Transfer Acceleration** — for uploads, not downloads

### VPC endpoints

```yaml
# Terraform — Gateway endpoint for S3 (free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.us-east-1.s3"
  route_table_ids = [aws_route_table.private.id]
}

# Interface endpoint for DynamoDB (~$0.01/hr)
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
# Enable cost anomaly detection
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "DailyAnomaly",
    "MonitorType": "DIMENSIONAL",
    "MonitorSpecification": "{\"Dimension\":\"SERVICE\"}"
  }'
```

### Cost reports with Lambda

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

    # Send to Slack
    if costs:
        send_slack_notification("\n".join(costs))

    return {"statusCode": 200}
```

## Best Practices

- **Enable Cost Explorer** — visibility is the first step to optimization
- **Set up budget alerts** — catch overruns before they happen
- **Right-size every 3 months** — workloads change, instances should too
- **Use Spot for 70%+ of non-critical workloads** — 90% discount
- **Commit to RIs/Savings Plans for baseline** — cover 60-70% of steady-state
- **Use S3 lifecycle policies** — move old data to cheaper tiers automatically
- **Stop non-prod at night** — 65% of non-prod hours are idle
- **Delete unused EBS volumes** — they cost money even when unattached
- **Release unused Elastic IPs** — $0.005/hr when not attached
- **Use VPC endpoints** — avoid NAT Gateway data processing charges
- **Tag everything** — enable cost allocation by team/project
- **Review monthly** — costs creep without regular review

## Common Mistakes

- Leaving EC2 instances running 24/7 in dev — use auto-stop schedules
- Using S3 Standard for archive data — lifecycle to Glacier/Deep Archive
- Over-provisioning RDS — downsize based on actual CPU/memory
- Ignoring NAT Gateway costs — use VPC endpoints for AWS service traffic
- Not using Spot for batch/cron jobs — 90% savings for interruptible workloads
- Forgetting to delete old snapshots — accumulate silently over months
- Buying RIs without analyzing usage — wrong instance family = wasted commitment
- Not tagging resources — no visibility into team/project costs
- Using CloudWatch Logs with no retention — log volumes grow unbounded
- Ignoring data transfer costs — cross-AZ and cross-region add up fast

## Frequently Asked Questions

### How much can I save with AWS cost optimization?

Typical savings range from 30-50% for organizations that have never optimized. The biggest wins come from right-sizing (15-20%), Spot instances (10-15% for eligible workloads), and RI/Savings Plans commitments (10-15% for steady-state). S3 lifecycle and networking optimization add another 5-10%.

### Should I use Reserved Instances or Savings Plans?

Use Standard RIs when you have a stable, predictable EC2 workload on a specific instance family. Use Compute Savings Plans when you want flexibility across instance families, or when you use Fargate and Lambda. Savings Plans are the newer, more flexible option — AWS recommends them for most new commitments.

### How do I track costs by team or project?

Use AWS tags and Cost Allocation Tags. Tag every resource with `Team`, `Project`, and `Environment`. Enable the tags as Cost Allocation Tags in AWS Billing. Then use Cost Explorer to filter and group by these tags.
