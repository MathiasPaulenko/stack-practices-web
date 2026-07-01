---
contentType: recipes
slug: bash-aws-cli-scripts
title: "AWS CLI Automation with Bash"
description: "Automate AWS resource provisioning with bash and AWS CLI"
metaDescription: "Automate AWS resources with bash and AWS CLI. Script EC2 provisioning, S3 bucket management, and IAM policy automation with practical examples."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - aws
  - cli
  - automation
  - cloud
  - infrastructure
relatedResources:
  - /recipes/bash-aws-cli-automation
  - /docs/auto-scaling-policy-template
  - /recipes/bash-backup-rotation
  - /recipes/bash-disk-usage-monitor
  - /recipes/bash-log-rotation
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Automate AWS resources with bash and AWS CLI. Script EC2 provisioning, S3 bucket management, and IAM policy automation with practical examples."
  keywords:
    - bash
    - aws
    - cli
    - automation
    - cloud
    - infrastructure
---
## Overview

The AWS CLI wraps AWS API calls in a command-line tool. Combined with bash, you can automate infrastructure provisioning, S3 operations, IAM management, and cost monitoring. This recipe covers common AWS automation patterns using bash scripts.

## When to Use

- You need to automate EC2 instance provisioning and teardown
- You want to manage S3 buckets and sync files programmatically
- You need to audit IAM permissions across your AWS account
- You are building deployment scripts that interact with AWS resources

## Solution

### Provision an EC2 instance

```bash
#!/bin/bash

set -euo pipefail

INSTANCE_NAME="web-server-01"
AMI_ID="ami-0c55b159cbfafe1f0"
INSTANCE_TYPE="t3.micro"
KEY_NAME="my-key-pair"
SECURITY_GROUP="sg-12345678"
SUBNET_ID="subnet-12345678"

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SECURITY_GROUP" \
    --subnet-id "$SUBNET_ID" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${INSTANCE_NAME}}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Launched instance: $INSTANCE_ID"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance running at: $PUBLIC_IP"
```

### List all EC2 instances with details

```bash
#!/bin/bash

aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType,PublicIpAddress,Tags[?Key==`Name`].Value | [0]]' \
    --output table
```

### S3 bucket management

```bash
#!/bin/bash

BUCKET_NAME="my-app-backups-$(date +%Y%m%d)"
REGION="us-east-1"

# Create bucket
if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME"
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
fi

echo "Created bucket: $BUCKET_NAME"

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

# Set lifecycle policy (delete after 90 days)
cat > /tmp/lifecycle.json << 'EOF'
{
    "Rules": [
        {
            "ID": "DeleteOldObjects",
            "Status": "Enabled",
            "Expiration": { "Days": 90 },
            "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
            "Filter": {}
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET_NAME" \
    --lifecycle-configuration file:///tmp/lifecycle.json

echo "Versioning and lifecycle policy configured"
```

### Sync local directory to S3

```bash
#!/bin/bash

LOCAL_DIR="/var/backups/app"
S3_BUCKET="my-app-backups"
S3_PREFIX="daily"

# Sync with delete and exclude temp files
aws s3 sync "$LOCAL_DIR" "s3://${S3_BUCKET}/${S3_PREFIX}/" \
    --delete \
    --exclude "*.tmp" \
    --exclude "*.lock" \
    --storage-class STANDARD_IA

echo "Synced $LOCAL_DIR to s3://${S3_BUCKET}/${S3_PREFIX}/"
```

### IAM user audit

```bash
#!/bin/bash

echo "=== IAM User Audit ==="
echo "Date: $(date)"
echo ""

# List all users
USERS=$(aws iam list-users --query 'Users[*].UserName' --output text)

for user in $USERS; do
    echo "--- User: $user ---"

    # Get access keys
    KEYS=$(aws iam list-access-keys --user-name "$user" --output text 2>/dev/null)
    if [ -n "$KEYS" ]; then
        echo "Access keys:"
        echo "$KEYS" | tr '\t' '\n'
    else
        echo "No access keys"
    fi

    # Get attached policies
    POLICIES=$(aws iam list-attached-user-policies --user-name "$user" \
        --query 'AttachedPolicies[*].PolicyName' --output text 2>/dev/null)
    if [ -n "$POLICIES" ]; then
        echo "Attached policies: $POLICIES"
    fi

    # Get groups
    GROUPS=$(aws iam list-groups-for-user --user-name "$user" \
        --query 'Groups[*].GroupName' --output text 2>/dev/null)
    if [ -n "$GROUPS" ]; then
        echo "Groups: $GROUPS"
    fi

    echo ""
done
```

### Stop and start EC2 instances by tag

```bash
#!/bin/bash

# Stop all instances tagged Environment=dev
INSTANCE_IDS=$(aws ec2 describe-instances \
    --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text)

if [ -z "$INSTANCE_IDS" ]; then
    echo "No running dev instances found"
    exit 0
fi

echo "Stopping instances: $INSTANCE_IDS"
aws ec2 stop-instances --instance-ids $INSTANCE_IDS

# Wait for stop
aws ec2 wait instance-stopped --instance-ids $INSTANCE_IDS
echo "All dev instances stopped"
```

### Cost monitoring with AWS Cost Explorer

```bash
#!/bin/bash

START_DATE=$(date -d "30 days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity DAILY \
    --metrics UnblendedCost \
    --group-by Type=SERVICE \
    --query 'ResultsByTime[*].[TimePeriod.Start,Groups[*].[Keys[0],Metrics.UnblendedCost.Amount]]' \
    --output table
```

### Cleanup unused EBS volumes

```bash
#!/bin/bash

# Find unattached volumes
VOLUMES=$(aws ec2 describe-volumes \
    --filters "Name=status,Values=available" \
    --query 'Volumes[*].[VolumeId,Size,Tags[?Key==`Name`].Value | [0]]' \
    --output text)

if [ -z "$VOLUMES" ]; then
    echo "No unused volumes found"
    exit 0
fi

echo "Unused EBS volumes:"
echo "$VOLUMES"

# Delete each volume
for vol_id in $(echo "$VOLUMES" | awk '{print $1}'); do
    echo "Deleting volume: $vol_id"
    aws ec2 delete-volume --volume-id "$vol_id"
done

echo "Cleanup complete"
```

### Backup RDS snapshot

```bash
#!/bin/bash

DB_INSTANCE="my-database"
SNAPSHOT_ID="${DB_INSTANCE}-snapshot-$(date +%Y%m%d-%H%M%S)"

aws rds create-db-snapshot \
    --db-instance-identifier "$DB_INSTANCE" \
    --db-snapshot-identifier "$SNAPSHOT_ID"

echo "Creating snapshot: $SNAPSHOT_ID"

# Wait for snapshot to complete
aws rds wait db-snapshot-available \
    --db-snapshot-identifier "$SNAPSHOT_ID"

echo "Snapshot created: $SNAPSHOT_ID"

# Clean up snapshots older than 30 days
OLD_SNAPSHOTS=$(aws rds describe-db-snapshots \
    --db-instance-identifier "$DB_INSTANCE" \
    --query "DBSnapshots[?SnapshotCreateTime<\`$(date -d '30 days ago' -I)\`].DBSnapshotIdentifier" \
    --output text)

for snapshot in $OLD_SNAPSHOTS; do
    echo "Deleting old snapshot: $snapshot"
    aws rds delete-db-snapshot --db-snapshot-identifier "$snapshot"
done
```

## Explanation

The AWS CLI returns JSON by default. Using `--query` with JMESPath expressions and `--output text|table` makes the output script-friendly. The `--query` syntax filters and shapes the response before it reaches bash.

Key patterns:

- **`--query`**: JMESPath expression to extract specific fields from the API response.
- **`--output text`**: Returns plain text, one value per line. Ideal for capturing in variables.
- **`--output table`**: Human-readable format for reports and audits.
- **`wait` commands**: Block until a long-running operation completes (instance running, snapshot available, etc.).
- **`set -euo pipefail`**: Fails fast on errors, undefined variables, and pipe failures.

## Variants

| Approach | Tool | Complexity | Use When |
|----------|------|-----------|----------|
| AWS CLI + bash | aws cli | Low | Quick scripts, simple automation |
| AWS SDK (Python) | boto3 | Medium | Complex logic, error handling |
| AWS SDK (JavaScript) | aws-sdk | Medium | Node.js environments |
| Terraform | terraform | High | Infrastructure as code |
| CloudFormation | aws cloudformation | High | Declarative IaC |

## Guidelines

- Always set `set -euo pipefail` at the top of scripts. Fail fast on errors.
- Use `--query` to extract only the fields you need. Avoid parsing JSON in bash.
- Use `wait` commands instead of polling with `sleep`. They are more reliable.
- Tag all resources. Tags make cleanup and cost allocation easier.
- Use IAM roles for EC2 instances instead of embedding access keys in scripts.
- Test scripts against a non-production account first.

## Common Mistakes

- Embedding AWS credentials in scripts. Use environment variables or IAM roles instead.
- Not handling API rate limits. AWS throttles requests; add retries with `--retry-attempts`.
- Forgetting to wait for async operations. The script continues before the resource is ready.
- Not cleaning up resources. Orphaned EBS volumes and old snapshots incur costs.
- Using `--output json` and parsing with `jq` when `--query` can do it natively.

## Frequently Asked Questions

### How do I handle AWS CLI errors in bash?

Check the exit code and capture stderr:

```bash
if ! aws s3 ls "s3://my-bucket" 2>/dev/null; then
    echo "Bucket does not exist or access denied"
    exit 1
fi
```

### How do I assume a role before running commands?

```bash
ROLE_ARN="arn:aws:iam::123456789012:role/MyRole"

CREDENTIALS=$(aws sts assume-role \
    --role-arn "$ROLE_ARN" \
    --role-session-name "my-script" \
    --query 'Credentials' \
    --output json)

export AWS_ACCESS_KEY_ID=$(echo "$CREDENTIALS" | jq -r '.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDENTIALS" | jq -r '.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$CREDENTIALS" | jq -r '.SessionToken')

# Now run AWS commands as the assumed role
aws s3 ls
```

### How do I run the same command across multiple regions?

```bash
REGIONS=("us-east-1" "us-west-2" "eu-west-1")

for region in "${REGIONS[@]}"; do
    echo "=== Region: $region ==="
    aws ec2 describe-instances --region "$region" \
        --query 'Reservations[*].Instances[*].[InstanceId,State.Name]' \
        --output table
done
```

### How do I dry-run destructive operations?

Use `--dry-run` flag. AWS validates the request without making changes:

```bash
aws ec2 terminate-instances --instance-ids "i-12345678" --dry-run
```

If the output says `DryRunOperation`, the request would succeed. If it says `UnauthorizedOperation`, you lack permissions.
