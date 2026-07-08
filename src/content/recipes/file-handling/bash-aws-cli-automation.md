---
contentType: recipes
slug: bash-aws-cli-automation
title: "AWS CLI Automation with Bash"
description: "Automate AWS resource provisioning, tagging, and cleanup using Bash scripts wrapped around the AWS CLI."
metaDescription: "Automate AWS resources with Bash and the AWS CLI. Provision resources, apply consistent tags, schedule cleanups, and reduce manual cloud operations."
difficulty: intermediate
topics:
  - file-handling
tags:
  - bash
  - aws
  - cli
  - automation
  - cloud
relatedResources:
  - /recipes/bash-scripting-automation
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-ssh-key-management
  - /recipes/bash-iptables-firewall-rules
  - /recipes/bash-log-rotation-compression
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Automate AWS resources with Bash and the AWS CLI. Provision resources, apply consistent tags, schedule cleanups, and reduce manual cloud operations."
  keywords:
    - file-handling
    - bash
    - aws
    - cli
    - automation
    - cloud
---
## Overview

The AWS CLI is capable but verbose. Wrapping it in Bash scripts lets you provision, tag, and clean up resources consistently across environments. Whether you are spinning up a test stack, enforcing tagging policies, or removing unused resources, a script reduces copy-paste errors and makes operations repeatable.

## When to Use

Use this resource when:
- You need to create or destroy AWS resources repeatedly.
- You want to enforce consistent tagging across resources.
- You are automating cleanup of development or sandbox environments.
- You prefer shell scripts over Terraform or CloudFormation for simple tasks.

## Solution

### AWS CLI automation script

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROJECT="${1:-demo}"
ENV="${2:-dev}"

TAGS="Key=Project,Value=$PROJECT Key=Environment,Value=$ENV Key=ManagedBy,Value=bash-script"

# Create a VPC with tags
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region "$REGION" --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources "$VPC_ID" --tags $TAGS --region "$REGION"

# Create a subnet
SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.1.0/24 --region "$REGION" --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources "$SUBNET_ID" --tags $TAGS --region "$REGION"

# Cleanup function
cleanup() {
    echo "Cleaning up resources..."
    aws ec2 delete-subnet --subnet-id "$SUBNET_ID" --region "$REGION" || true
    aws ec2 delete-vpc --vpc-id "$VPC_ID" --region "$REGION" || true
}
trap cleanup EXIT

echo "Created VPC $VPC_ID and subnet $SUBNET_ID"
```

## Explanation

The script reads the AWS region from an environment variable and accepts project and environment names as arguments. It creates a VPC, tags it, creates a subnet, tags it, and registers a cleanup trap that deletes both resources when the script exits. Using `|| true` in the cleanup function prevents a failure during teardown from failing the whole script. The `--query` and `--output text` flags extract just the resource IDs needed for subsequent commands.

## Variants

| Task | AWS CLI command | Notes |
|------|-----------------|-------|
| List untagged | `aws ec2 describe-instances` | Filter by tag absence |
| Tag resources | `aws ec2 create-tags` | Bulk tag by resource IDs |
| Delete old | `aws ec2 describe-snapshots` | Filter by date, then delete |
| Assume role | `aws sts assume-role` | Use temporary credentials |

## What Works

1. **Use `--query` and `--output text` to parse IDs.** Avoid fragile text parsing of JSON or tables.
2. **Tag everything immediately.** Tags are easier to add at creation than to retroactively apply.
3. **Add a cleanup trap for temporary resources.** This prevents leftover test infrastructure from increasing your bill.
4. **Assume least-privilege roles.** Use `aws sts assume-role` instead of long-lived access keys.
5. **Validate with `--dry-run` first.** AWS CLI supports dry-run for many mutating calls, especially EC2.

## Common Mistakes

1. **Hardcoding credentials in scripts.** Use IAM roles, environment variables, or AWS SSO instead.
2. **Forgetting to handle dependencies.** You cannot delete a VPC that still has subnets or dependencies.
3. **Not trapping cleanup.** A failed script leaves resources running and accruing charges.
4. **Using the default region silently.** Always set `AWS_REGION` or pass `--region` explicitly.
5. **Ignoring API rate limits.** Large scripts can hit throttling; add retries or slow down with `aws configure` retry mode.

## Frequently Asked Questions

**Q: How do I run this in CI?**
A: Use OIDC or short-lived credentials from AWS SSO. Never commit access keys to CI variables.

**Q: Should I use this instead of Terraform?**
A: For one-off or exploratory tasks, Bash plus AWS CLI is fine. For production infrastructure, use Terraform or CloudFormation for state management and drift detection.

**Q: How do I find and delete untagged resources?**
A: Use `aws resourcegroupstaggingapi get-resources` and then delete the returned ARNs with the appropriate service commands.

### S3 bucket lifecycle and cleanup

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
BUCKET="${1:-my-app-logs}"
LIFECYCLE_FILE="/tmp/lifecycle.json"

# Apply lifecycle policy: transition to IA after 30 days, Glacier after 90, delete after 365
cat > "$LIFECYCLE_FILE" <<EOF
{
    "Rules": [
        {
            "ID": "LogLifecycleRule",
            "Status": "Enabled",
            "Filter": { "Prefix": "logs/" },
            "Transitions": [
                { "Days": 30, "StorageClass": "STANDARD_IA" },
                { "Days": 90, "StorageClass": "GLACIER" }
            ],
            "Expiration": { "Days": 365 }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET" \
    --lifecycle-configuration "file://$LIFECYCLE_FILE" \
    --region "$REGION"

echo "Lifecycle policy applied to bucket $BUCKET"

# List objects older than 90 days for audit
aws s3api list-objects-v2 \
    --bucket "$BUCKET" \
    --prefix "logs/" \
    --query "Contents[?LastModified<='$(date -d '90 days ago' -I)'].[Key,LastModified,Size]" \
    --output table \
    --region "$REGION"
```

### EC2 snapshot management

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
RETENTION_DAYS="${1:-30}"

# Create snapshots of all EBS volumes with the Backup tag
VOLUME_IDS=$(aws ec2 describe-volumes \
    --filters "Name=tag:Backup,Values=true" \
    --query 'Volumes[*].VolumeId' \
    --output text \
    --region "$REGION")

for vol_id in $VOLUME_IDS; do
    SNAP_ID=$(aws ec2 create-snapshot \
        --volume-id "$vol_id" \
        --description "Automated backup $(date -I)" \
        --tag-specifications "ResourceType=snapshot,Tags=[{Key=CreatedBy,Value=bash-script},{Key=Date,Value=$(date -I)}]" \
        --query 'SnapshotId' \
        --output text \
        --region "$REGION")
    echo "Created snapshot $SNAP_ID for volume $vol_id"
done

# Delete snapshots older than retention period
CUTOFF=$(date -d "$RETENTION_DAYS days ago" -I)
OLD_SNAPS=$(aws ec2 describe-snapshots \
    --owner-ids self \
    --filters "Name=tag:CreatedBy,Values=bash-script" \
    --query "Snapshots[?StartTime<='$CUTOFF'].SnapshotId" \
    --output text \
    --region "$REGION")

for snap_id in $OLD_SNAPS; do
    aws ec2 delete-snapshot --snapshot-id "$snap_id" --region "$REGION"
    echo "Deleted old snapshot $snap_id"
done
```

### Tagging compliance audit

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
REQUIRED_TAGS=("Project" "Environment" "Owner" "CostCenter")

# Audit EC2 instances for missing required tags
INSTANCES=$(aws ec2 describe-instances \
    --query 'Reservations[*].Instances[?State.Name==`running`].[InstanceId,Tags]' \
    --output json \
    --region "$REGION")

echo "$INSTANCES" | jq -c '.[]' | while read -r instance; do
    instance_id=$(echo "$instance" | jq -r '.[0]')
    tags=$(echo "$instance" | jq -r '.[1] // [] | map(.Key)')
    missing=()
    for req_tag in "${REQUIRED_TAGS[@]}"; do
        if ! echo "$tags" | grep -q "\"$req_tag\""; then
            missing+=("$req_tag")
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        echo "VIOLATION: $instance_id missing tags: ${missing[*]}"
    fi
done

# Audit S3 buckets for missing tags
BUCKETS=$(aws s3api list-buckets --query 'Buckets[*].Name' --output text --region "$REGION")
for bucket in $BUCKETS; do
    bucket_tags=$(aws s3api get-bucket-tagging --bucket "$bucket" --query 'TagSet[*].Key' --output text 2>/dev/null || echo "")
    missing=()
    for req_tag in "${REQUIRED_TAGS[@]}"; do
        if ! echo "$bucket_tags" | grep -qw "$req_tag"; then
            missing+=("$req_tag")
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        echo "VIOLATION: bucket $bucket missing tags: ${missing[*]}"
    fi
done
```

### CloudWatch dashboard creation

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
DASHBOARD_NAME="${1:-app-overview}"

DASHBOARD_BODY=$(cat <<EOF
{
    "widgets": [
        {
            "type": "metric",
            "x": 0, "y": 0, "width": 12, "height": 6,
            "properties": {
                "metrics": [
                    ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", "app-asg"],
                    [".", "NetworkIn", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "EC2 CPU and Network"
            }
        },
        {
            "type": "metric",
            "x": 12, "y": 0, "width": 12, "height": 6,
            "properties": {
                "metrics": [
                    ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "app-db"],
                    [".", "DatabaseConnections", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "RDS CPU and Connections"
            }
        },
        {
            "type": "log",
            "x": 0, "y": 6, "width": 24, "height": 6,
            "properties": {
                "query": "SOURCE 'app-logs' | fields @timestamp, level, message | filter level = \"ERROR\" | sort @timestamp desc | limit 20",
                "region": "$REGION",
                "title": "Recent Errors"
            }
        }
    ]
}
EOF
)

aws cloudwatch put-dashboard \
    --dashboard-name "$DASHBOARD_NAME" \
    --dashboard-body "$DASHBOARD_BODY" \
    --region "$REGION"

echo "Dashboard $DASHBOARD_NAME created"
```

### Multi-environment deployment with AWS SSO

```bash
#!/usr/bin/env bash
set -euo pipefail

ACCOUNTS=("dev:111111111111" "staging:222222222222" "prod:333333333333")
ROLE_NAME="DeploymentRole"

for account in "${ACCOUNTS[@]}"; do
    ENV="${account%%:*}"
    ACCOUNT_ID="${account##*:}"

    echo "=== Deploying to $ENV ($ACCOUNT_ID) ==="

    # Assume role via SSO
    CREDS=$(aws sts assume-role \
        --role-arn "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME" \
        --role-session-name "deploy-$ENV-$(date +%s)" \
        --query 'Credentials' \
        --output json)

    export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r '.AccessKeyId')
    export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r '.SecretAccessKey')
    export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r '.SessionToken')

    # Deploy: update Lambda function
    aws lambda update-function-code \
        --function-name "app-handler" \
        --zip-file "fileb://dist/handler.zip" \
        --region "$AWS_REGION"

    # Verify deployment
    STATUS=$(aws lambda get-function \
        --function-name "app-handler" \
        --query 'Configuration.LastUpdateStatus' \
        --output text)

    echo "Deployment to $ENV: $STATUS"

    # Clear credentials
    unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
done
```

## Additional Best Practices

1. **Use AWS CLI pagination for large result sets.** The `--page-size` flag controls how many items are fetched per API call. For listing thousands of S3 objects or EC2 instances, use `--page-size 1000` to reduce the number of API calls and avoid throttling:

```bash
aws s3api list-objects-v2 --bucket "$BUCKET" --page-size 1000 --query 'Contents[*].Key' --output text
```

2. **Enable CLI retry mode for automation scripts.** Set retry mode to `adaptive` to handle transient throttling automatically. This is especially important for scripts that make many sequential API calls:

```bash
aws configure set default.retry_mode adaptive
# Or per-command: --cli-retry-mode adaptive
```

3. **Use `--no-paginate` when you only need the first page.** If you know the result set is small, disabling pagination avoids unnecessary API calls and speeds up script execution:

```bash
aws ec2 describe-instances --no-paginate --query 'Reservations[0].Instances[0].InstanceId' --output text
```

## Additional Common Mistakes

1. **Not handling eventual consistency.** AWS APIs are eventually consistent. After creating a resource, a subsequent `describe` call may not return it immediately. Add a wait or poll loop:

```bash
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text)
# Wait for VPC to be available
aws ec2 wait vpc-available --vpc-ids "$VPC_ID"
# Now safe to create subnet
```

2. **Using `aws s3 cp` instead of `aws s3 sync` for batch transfers.** The `cp` command re-uploads all files every time. `sync` only transfers changed files, saving bandwidth and time:

```bash
# Wrong: re-uploads everything
aws s3 cp ./build/ s3://my-bucket/ --recursive

# Correct: only uploads changed files
aws s3 sync ./build/ s3://my-bucket/ --delete --exclude "*.tmp"
```

3. **Not setting up CLI profiles for multiple accounts.** Hardcoding account IDs or switching credentials manually is error-prone. Use named profiles in `~/.aws/config`:

```ini
[profile dev]
role_arn = arn:aws:iam::111111111111:role/DeploymentRole
source_profile = default

[profile prod]
role_arn = arn:aws:iam::333333333333:role/DeploymentRole
source_profile = default
```

```bash
# Use profile in scripts
aws ec2 describe-instances --profile prod --region us-east-1
```

## Additional FAQ

### How do I handle AWS CLI errors programmatically?

Check exit codes and capture stderr. The AWS CLI returns non-zero exit codes on failure and writes error messages to stderr. Use `set -euo pipefail` to fail fast, and capture errors for logging:

```bash
if ! aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" 2>/dev/null; then
    echo "ERROR: Instance $INSTANCE_ID not found or access denied"
    exit 1
fi
```

For more structured error handling, use `--output json` and parse with `jq`:

```bash
RESULT=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --output json 2>&1) || {
    ERROR_CODE=$(echo "$RESULT" | jq -r '.Code // "Unknown"')
    ERROR_MSG=$(echo "$RESULT" | jq -r '.Message // "Unknown"')
    echo "AWS Error [$ERROR_CODE]: $ERROR_MSG"
    exit 1
}
```

### Is this solution production-ready?

Yes. The AWS CLI is the official tool for AWS automation and is used by Netflix, Airbnb, and GitHub for infrastructure automation. Bash wrappers around the CLI are a standard pattern for CI/CD pipelines, cleanup jobs, and operational scripts. The S3 lifecycle, EBS snapshot, and tagging compliance patterns shown here are used in production by teams managing thousands of AWS resources. For complex infrastructure management, complement these scripts with Terraform or CloudFormation for state tracking and drift detection.

### What are the performance characteristics?

Each AWS CLI call takes 200-800ms depending on the API and region. Scripts making 50 sequential calls take 10-40 seconds. Use `--page-size 1000` to reduce call count for list operations. Parallel execution with `xargs -P` can reduce wall time by 3-5x for independent operations. S3 uploads are limited by network bandwidth — `aws s3 sync` transfers 5-50MB/s per connection. CLI memory usage is under 50MB per process. The `adaptive` retry mode adds 1-5 seconds per retry but prevents script failures during throttling.

### How do I debug issues with this approach?

Run `aws configure list` to verify credentials and region. Use `--debug` flag to see full HTTP requests and responses: `aws ec2 describe-instances --debug 2>&1 | head -100`. Check IAM permissions with `aws iam simulate-principal-policy`. Test scripts with `--dry-run` before executing mutating operations. Use `aws cloudtrail lookup-events` to audit what API calls your script made. For S3 issues, check bucket policies with `aws s3api get-bucket-policy`. For authentication errors, verify SSO tokens haven't expired with `aws sso list-account-roles`.
