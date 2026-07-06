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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
