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
- [ ] Architecture Decision Record (ADR) included for significant changes
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
