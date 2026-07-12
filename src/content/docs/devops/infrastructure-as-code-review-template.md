---



contentType: docs
slug: infrastructure-as-code-review-template
title: "Infrastructure as Code Review Template"
description: "A template for reviewing Terraform and CloudFormation infrastructure code."
metaDescription: "Use this infrastructure-as-code review template to validate Terraform, CloudFormation, and Ansible configurations before deployment."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - infrastructure-as-code
  - terraform
  - cloudformation
  - review
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/weekly-ops-review-template
  - /guides/complete-guide-terraform-modules
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this infrastructure-as-code review template to validate Terraform, CloudFormation, and Ansible configurations before deployment."
  keywords:
    - devops
    - infrastructure-as-code
    - terraform
    - cloudformation
    - review
    - template



---
## Overview

Infrastructure code is software. It should be reviewed, tested, and versioned just like application code. A single misconfigured security group or an overly permissive IAM policy can expose your entire environment. This template structures a code review process specifically for Terraform, CloudFormation, Pulumi, or Ansible configurations.

## When to Use

Use this resource when:
- Adding a new Terraform module or CloudFormation stack to production
- Reviewing pull requests that modify infrastructure
- Auditing existing infrastructure code for security or cost issues

## Solution

```markdown
# Infrastructure as Code Review: `<Module / Stack>`

## 1. Change Metadata

| Field | Value |
|-------|-------|
| Module / Stack | `name` |
| Tool | `Terraform / CloudFormation / Pulumi / Ansible` |
| Environment | `dev / staging / prod` |
| Ticket | `JIRA-1234` |
| Author | `@author` |
| Reviewer | `@reviewer` |
| Risk Level | `Low / Medium / High / Critical` |

## 2. Static Analysis

- [ ] `terraform validate` or `cfn-lint` passes with zero errors
- [ ] `terraform plan` or `change set` has been reviewed for unexpected deletions
- [ ] Security scan (Checkov, tfsec, cfn-nag) has zero HIGH/CRITICAL findings
- [ ] Cost estimate provided for new resources (Infracost or manual)
- [ ] State file locking is configured for Terraform
- [ ] Backend configuration uses a remote, encrypted state store

## 3. Security Review

| Check | Pass / Fail | Notes |
|-------|-------------|-------|
| No hardcoded secrets in code or variables | | |
| Least-privilege IAM / RBAC roles | | |
| Security groups restrict ingress to known CIDRs | | |
| Encryption at rest enabled for storage | | |
| Encryption in transit enforced (TLS 1.2+) | | |
| Public access disabled by default | | |
| Logging enabled for all data planes | | |
| WAF / DDoS protection for public endpoints | | |

## 4. Reliability & Operations

| Check | Pass / Fail | Notes |
|-------|-------------|-------|
| Resource limits / quotas checked | | |
| Health checks and auto-recovery configured | | |
| Multi-AZ or multi-region redundancy where required | | |
| Backup / snapshot policy defined | | |
| Monitoring and alerting included | | |
| Graceful shutdown / draining for stateful services | | |
| Idempotency verified: re-run produces no changes | | |

## 5. Cost & Efficiency

| Check | Pass / Fail | Notes |
|-------|-------------|-------|
| Right-sized instances (not default / max) | | |
| Reserved capacity or savings plans considered | | |
| Unused resources removed in this change | | |
| Storage lifecycle policies defined | | |
| Data transfer costs estimated | | |

## 6. Documentation

- [ ] README updated with inputs, outputs, and usage example
- [ ] Architecture Decision Record (ADR) included for major changes
- [ ] Runbook updated for new operational procedures
- [ ] On-call alert playbooks cover new monitoring signals

## 7. Rollback Plan

| Scenario | Rollback Action | Time to Complete |
|----------|-----------------|------------------|
| Deployment failure | `terraform destroy -target` or stack deletion | 15 min |
| Performance regression | Revert to previous image / scale up | 10 min |
| Security incident | Disable public access + revoke keys | 5 min |
```

## Explanation

Infrastructure reviews differ from application code reviews because **the blast radius is larger**. A bug in application code affects one pod; a bug in Terraform can delete a database or expose it to the internet. The template enforces **static analysis** (automated checks), **security review** (human judgment), and **operational readiness** (can you run it and recover from it?). The rollback plan is non-negotiable: every infrastructure change must be reversible within the RTO of the service it supports.

## Variants

| Tool | Static Analysis | Security Scan | State Management |
|------|-----------------|---------------|------------------|
| Terraform | `terraform validate`, `fmt` | Checkov, tfsec, Terrascan | Remote S3 backend + locking |
| CloudFormation | `cfn-lint`, `cfn-guard` | cfn-nag, Checkov | Stack sets + drift detection |
| Pulumi | `pulumi preview` | Checkov | Pulumi Cloud state |
| Ansible | `ansible-lint`, `syntax-check` | Ansible hardening roles | Git + AWX / Tower |

## What works

1. Run static analysis in CI/CD before a human ever sees the pull request
2. Require two approvals for production infrastructure changes, not one
3. Review the `terraform plan` diff, not just the code; plans reveal destructive changes
4. Separate state files per environment; never share prod and dev state
5. Use module versioning; pin provider and module versions to avoid surprise updates

## Common Mistakes

1. Reviewing only the code diff and ignoring the `terraform plan` output
2. Hardcoding secrets instead of using a secret manager (Vault, AWS Secrets Manager)
3. Using `count` or `for_each` on stateful resources without considering data loss on destroy
4. Forgetting to update documentation when the infrastructure changes
5. Running `terraform apply` locally instead of through a CI/CD pipeline with audit logging

## Frequently Asked Questions

### Should infrastructure changes require the same approval as application deployments?

Often they should require **more** scrutiny. Application changes can be rolled back with a deployment; infrastructure changes can destroy data. Consider a separate approval workflow for production infrastructure, or require a senior engineer sign-off.

### How do I review a large Terraform module without missing details?

Break the review into layers: first static analysis and plan review, then security checks, then operational readiness. Do not try to review everything at once. Use a checklist (like this template) so no category is skipped.

### What is drift detection and why does it matter?

Drift occurs when someone changes infrastructure outside of IaC (e.g., via the console). Tools like Terraform `refresh`, AWS Config, or CloudFormation drift detection identify these changes. Review drift reports regularly; otherwise your code and reality diverge, making future changes dangerous.

## Advanced Solutions

### Automated IaC scanning with Checkov in CI/CD

Integrate infrastructure scanning into your pipeline to catch issues before review:

```yaml
# .github/workflows/terraform-review.yml
name: Terraform Security Scan
on:
  pull_request:
    paths:
      - "terraform/**"
      - "infrastructure/**"

jobs:
  checkov-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/
          framework: terraform
          output_format: sarif
          output_file_path: results.sarif
          soft_fail: false
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

  terraform-plan-review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-tf
          aws-region: us-east-1
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"
      - name: Terraform Init
        run: terraform -chdir=terraform/ init -input=false
      - name: Terraform Plan
        run: terraform -chdir=terraform/ plan -input=false -out=tfplan
      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const { execSync } = require('child_process');
            const planOutput = execSync('terraform -chdir=terraform/ show -no-color tfplan').toString();
            const truncated = planOutput.substring(0, 50000);
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: `## Terraform Plan\n\n\`\`\`diff\n${truncated}\n\`\`\``
            });
```

### Custom Checkov policy for organization-specific rules

Define custom policies that enforce your organization's standards:

```python
# checkov_custom_policies/aws_require_tags.py
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RequireCostCenterTag(BaseResourceCheck):
    def __init__(self):
        name = "Ensure all resources have a CostCenter tag"
        check_id = "CKV_AWS_CUSTOM_1"
        supported_resources = ["aws_*"]
        categories = [CheckCategories.CONVENTION]
        super().__init__(name=name, id=check_id, categories=categories,
                         supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        tags = conf.get("tags", [{}])[0]
        if "CostCenter" in tags and "Environment" in tags:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = RequireCostCenterTag()
```

```bash
# Run custom policies alongside built-in checks
checkov -d terraform/ \
  --external-checks-dir checkov_custom_policies/ \
  --framework terraform \
  --output cli \
  --soft-fail false
```

### Terraform module testing with Terratest

Validate that your infrastructure actually works by writing automated tests:

```go
// test/infrastructure_test.go
package test

import (
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/stretchr/testify/assert"
)

func TestVpcModule(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../terraform/modules/vpc",
        Vars: map[string]interface{}{
            "environment":    "test",
            "vpc_cidr":       "10.0.0.0/16",
            "enable_nat":     true,
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)

    subnetIds := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
    assert.Equal(t, 2, len(subnetIds))

    // Verify NAT gateway was created
    natGatewayId := terraform.Output(t, terraformOptions, "nat_gateway_id")
    assert.NotEmpty(t, natGatewayId)

    // Verify VPC has DNS support
    aws.AssertVpcDnsSupportEnabled(t, "us-east-1", vpcId)
}
```

### Drift detection automation

Schedule regular drift checks and alert when infrastructure diverges from code:

```python
import subprocess
import json
import smtplib
from email.mime.text import MIMEText
from typing import List, Dict

class DriftDetector:
    def __init__(self, terraform_dir: str, environments: List[str]):
        self.terraform_dir = terraform_dir
        self.environments = environments

    def check_drift(self, env: str) -> Dict:
        """Check for drift in a specific environment."""
        result = {"environment": env, "drifted": False, "resources": []}

        try:
            subprocess.run(
                ["terraform", "-chdir=f{self.terraform_dir}/{env}", "init", "-input=false"],
                check=True, capture_output=True
            )
            subprocess.run(
                ["terraform", "-chdir=f{self.terraform_dir}/{env}", "refresh", "-input=false"],
                check=True, capture_output=True
            )
            plan = subprocess.run(
                ["terraform", "-chdir=f{self.terraform_dir}/{env}", "plan", "-detailed-exitcode", "-input=false"],
                capture_output=True, text=True
            )

            if plan.returncode == 2:
                result["drifted"] = True
                result["resources"] = self._parse_drifted_resources(plan.stdout)
        except subprocess.CalledProcessError as e:
            result["error"] = str(e)

        return result

    def _parse_drifted_resources(self, plan_output: str) -> List[str]:
        """Extract resource addresses from plan output."""
        resources = []
        for line in plan_output.split("\n"):
            if line.startswith("  # ") and "will be" in line:
                resources.append(line.strip())
        return resources

    def send_alert(self, drift_results: List[Dict]) -> None:
        """Send email alert if drift is detected."""
        drifted_envs = [r for r in drift_results if r["drifted"]]
        if not drifted_envs:
            return

        body = "Drift detected in the following environments:\n\n"
        for env in drifted_envs:
            body += f"Environment: {env['environment']}\n"
            for resource in env["resources"]:
                body += f"  - {resource}\n"
            body += "\n"

        msg = MIMEText(body)
        msg["Subject"] = "[ALERT] Terraform Drift Detected"
        msg["From"] = "infra-alerts@example.com"
        msg["To"] = "platform-team@example.com"

        with smtplib.SMTP("smtp.example.com", 587) as server:
            server.send_message(msg)

# Example usage
detector = DriftDetector("terraform/environments", ["prod", "staging", "dev"])
results = [detector.check_drift(env) for env in detector.environments]
detector.send_alert(results)
```

## Additional Best Practices


- For a deeper guide, see [Complete Guide to Terraform Modules](/guides/complete-guide-terraform-modules/).

1. **Use `terraform plan -out` to persist plans for audit.** Saving the plan file creates an immutable record of what was reviewed and applied:

```bash
#!/bin/bash
set -euo pipefail

ENV="${1:?Usage: $0 <environment>}"
PLAN_FILE="plans/${ENV}-$(date +%Y%m%d-%H%M%S).tfplan"

mkdir -p plans/
terraform -chdir=terraform/environments/${ENV} init -input=false
terraform -chdir=terraform/environments/${ENV} plan -out="../../${PLAN_FILE}" -input=false

echo "Plan saved to ${PLAN_FILE}"
echo "Review the plan, then run:"
echo "  terraform -chdir=terraform/environments/${ENV} apply \"../../${PLAN_FILE}\""
```

2. **Tag all resources consistently for cost tracking and ownership.** Use a default tag block in Terraform provider configuration:

```hcl
# Default tags applied to all AWS resources
provider "aws" {
  default_tags {
    tags = {
      Environment   = var.environment
      ManagedBy     = "terraform"
      Project       = var.project_name
      CostCenter    = var.cost_center
      Owner         = var.owner_team
      LastReviewed  = formatdate("YYYY-MM-DD", timestamp())
    }
  }
}
```

## Additional Common Mistakes

1. **Using `terraform import` without updating the code.** Importing a resource into state without writing the corresponding Terraform code creates a mismatch. Always write the resource block first, then import:

```bash
# Wrong: import without code
terraform import aws_s3_bucket.my_bucket my-bucket-name
# State now has a resource with no code backing it

# Correct: write code first, then import
# 1. Add resource block to .tf file
# 2. Run import
terraform import aws_s3_bucket.my_bucket my-bucket-name
# 3. Run plan to verify code matches reality
terraform plan
```

2. **Not using `prevent_destroy` for critical resources.** Add lifecycle blocks to prevent accidental deletion of stateful resources like databases:

```hcl
resource "aws_rds_instance" "main" {
  # ... configuration ...

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      # Ignore changes that are managed outside Terraform
      engine_version,
    ]
  }
}
```

## Additional Frequently Asked Questions

### How do we handle secrets in Terraform without hardcoding them?

Use a secret manager and reference secrets at apply time. For AWS, use parameter store or Secrets Manager with data sources:

```hcl
# Fetch secret from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # Never hardcode: password = "supersecretpassword123"
}
```

For Terraform Cloud or Enterprise, use workspace variables marked as sensitive. For GitLab CI, use masked CI/CD variables. Never store secrets in `.tfvars` files committed to version control.

### What is the difference between `terraform refresh` and `terraform apply -refresh-only`?

`terraform refresh` updates the state file to match real infrastructure but does not generate a plan. It is being deprecated in favor of `terraform apply -refresh-only`, which shows you what changed before updating state. Use `-refresh-only` to safely detect drift without risk of unintended modifications. Always review the output before confirming.
