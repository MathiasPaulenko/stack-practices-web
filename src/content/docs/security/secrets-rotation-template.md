---



contentType: docs
slug: secrets-rotation-template
title: "Secrets Rotation Template"
description: "A template for scheduling and tracking the rotation of API keys, tokens, and certificates."
metaDescription: "Use this secrets rotation template to schedule and track the rotation of API keys, tokens, passwords, and certificates across your infrastructure."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - secrets
  - rotation
  - api-keys
  - tokens
  - certificates
  - credentials
  - template
relatedResources:
  - /docs/api-security-review-template
  - /docs/data-classification-template
  - /docs/incident-response-playbook-template
  - /docs/vendor-risk-assessment-template
  - /docs/data-retention-policy-template
  - /recipes/docker-secrets-management
  - /docs/secrets-rotation-runbook
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this secrets rotation template to schedule and track the rotation of API keys, tokens, passwords, and certificates across your infrastructure."
  keywords:
    - security
    - secrets
    - rotation
    - api-keys
    - tokens
    - certificates
    - credentials
    - template



---
## Overview

A leaked API key is only a disaster if it is still valid. Secrets rotation limits the blast radius of a breach by ensuring credentials expire before attackers can exploit them. But rotation without process is chaos: services break, deployments fail, and teams start sharing the same root password in Slack. A rotation schedule template coordinates who rotates what, when, and how, with zero-downtime procedures and rollback plans.

## When to Use


- For alternatives, see [Docker Secrets Management Without Hardcoding Credentials](/recipes/docker-secrets-management/).

Use this resource when:
- You are setting up a secrets management policy for the first time
- An audit or compliance framework requires documented rotation cadence
- A secret was exposed and you need to rotate without breaking production

## Solution

```markdown
# Secrets Rotation Schedule

## 1. Secret Inventory

| Secret | Type | Environment | Storage Location | Current Version | Last Rotated | Next Rotation | Owner |
|--------|------|-------------|------------------|-----------------|--------------|---------------|-------|
| `DB_MASTER_PASSWORD` | Password | Production | HashiCorp Vault | `v3` | `YYYY-MM-DD` | `YYYY-MM-DD` | @db-owner |
| `AWS_ACCESS_KEY_ID` | API key | Production | AWS Secrets Manager | `v2` | `YYYY-MM-DD` | `YYYY-MM-DD` | @infra-owner |
| `JWT_SIGNING_KEY` | Signing key | All | Vault / HSM | `v4` | `YYYY-MM-DD` | `YYYY-MM-DD` | @security-owner |
| `TLS_CERT_API` | Certificate | Production | Cert-manager + Vault | `v2` | `YYYY-MM-DD` | `YYYY-MM-DD` | @infra-owner |
| `GITHUB_DEPLOY_TOKEN` | Token | CI/CD | GitHub Secrets | `v1` | `YYYY-MM-DD` | `YYYY-MM-DD` | @devops-owner |

## 2. Rotation Cadence Policy

| Secret Type | Rotation Interval | Trigger Events | Grace Period |
|-------------|-------------------|----------------|--------------|
| Database passwords | 90 days | Employee departure, suspected breach | 7 days |
| Cloud API keys | 90 days | Key exposed in logs, IAM policy change | 7 days |
| TLS certificates | Auto-renew (30 days before expiry) | Certificate expiry alert | 14 days |
| Signing / encryption keys | 180 days | Key compromise, algorithm deprecation | 14 days |
| CI/CD tokens | 90 days | Token scoped change, repository access change | 3 days |
| Service account passwords | 90 days | Role change, service decommission | 7 days |
| Emergency break-glass | Per-use | After each use | Immediate |

## 3. Rotation Procedure

### Zero-Downtime Key Rotation (Application Secrets)

1. **Generate new secret** in Vault / secrets manager
2. **Deploy application with dual-read:** app accepts both old and new secret
3. **Validate:** confirm new secret works in staging
4. **Update consumers:** rotate downstream services one by one
5. **Remove old secret:** after validation period (24–48 hours)
6. **Update inventory:** mark new version and date

### Certificate Rotation (TLS)

1. **Provision new certificate** from CA
2. **Deploy to load balancer / ingress** alongside existing certificate
3. **Validate:** SSL Labs scan + synthetic monitor
4. **Wait for propagation:** ensure all edge caches refreshed
5. **Remove old certificate** from all endpoints
6. **Update inventory:** mark new expiry date

## 4. Emergency Rotation Playbook

| Trigger | Action | Owner | SLA |
|---------|--------|-------|-----|
| Secret exposed in public repo | Rotate immediately; revoke old | @security-owner | 1 hour |
| Employee with secret access terminated | Rotate all secrets they had access to | @security-owner + @owner | 4 hours |
| Suspected breach | Rotate all critical secrets; incident response | @security-owner | 24 hours |
| Certificate expires in < 7 days | Emergency reissue + deploy | @infra-owner | 24 hours |

## 5. Validation Checklist

- [ ] New secret is readable by all expected services
- [ ] Old secret is revoked / deleted (not just unused)
- [ ] Application logs show no authentication failures post-rotation
- [ ] CI/CD pipelines pass with new secret
- [ ] Monitoring alerts are green for 24 hours
- [ ] Inventory updated with new version and rotation date
- [ ] Runbook updated if procedure changed

## 6. Exception Log

| Secret | Reason for Extended Interval | Risk Accepted By | New Date | Review |
|--------|------------------------------|------------------|----------|--------|
| | | | | |
```

## Explanation

The template treats rotation as a **lifecycle**, not a one-time event. The inventory answers "what do we have?" The cadence answers "how often?" The procedure answers "how?" The emergency playbook answers "what if?" Zero-downtime rotation is the hardest part: dual-read mode lets you rotate without coordination windows. The validation checklist prevents the common failure where a secret is rotated but an old cron job or cached connection string still uses the old value.

## Secrets Rotation Automation Examples

```bash
#!/bin/bash
# Example: Rotate database password with zero downtime
# Uses dual-read pattern: old + new password both valid during transition

set -euo pipefail

DB_HOST="db.internal"
DB_NAME="appdb"
OLD_USER="app_user_old"
NEW_USER="app_user_new"
NEW_PASSWORD=$(openssl rand -base64 32)

# Step 1: Create new user with identical permissions
psql -h "$DB_HOST" -U admin -d "$DB_NAME" -c "
  CREATE USER $NEW_USER WITH PASSWORD '$NEW_PASSWORD';
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $NEW_USER;
  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO $NEW_USER;
"

# Step 2: Update secret manager with new credentials
aws secretsmanager update-secret \
  --secret-id prod/db/app-user \
  --secret-string "{"username":"$NEW_USER","password":"$NEW_PASSWORD"}"

# Step 3: Trigger app reload to pick up new secret
kubectl rollout restart deployment/app -n production

# Step 4: Wait for rollout to complete
kubectl rollout status deployment/app -n production --timeout=300s

# Step 5: Verify new connections use new user
psql -h "$DB_HOST" -U admin -d "$DB_NAME" -c "
  SELECT usename, count(*) FROM pg_stat_activity
  WHERE datname='appdb' GROUP BY usename;
"

# Step 6: After verification, drop old user
psql -h "$DB_HOST" -U admin -d "$DB_NAME" -c "DROP USER $OLD_USER;"

echo "Rotation complete. Old user dropped."
```


## Variants

| Context | Key Difference | Tool |
|---------|-------------|------|
| Kubernetes | cert-manager for TLS, External Secrets Operator for app secrets | Vault, AWS SM, Azure Key Vault |
| Cloud-native (AWS) | IAM role rotation via STS, Secrets Manager auto-rotation | AWS Secrets Manager, Lambda rotation functions |
| Enterprise on-prem | HSM for key storage, manual change control | Thales Luna, SafeNet |
| Startup / small team | Shared 1Password / Bitwarden, quarterly manual rotation | 1Password, Bitwarden |
| High-frequency microservices | Short-lived mTLS certs (SPIFFE/SPIRE) | SPIRE, Istio |

## What Works

1. Automate rotation for certificates and cloud keys; humans forget schedules
2. Use dual-read (old + new secret) during transition; single-secret rotation causes outages
3. Rotate after incidents, not just on schedule; a breach demands immediate rotation
4. Never hardcode secrets; use environment variables or secret injection at runtime
5. Audit every rotation event; failed rotations are often early indicators of drift

## Common Mistakes

1. Rotating without testing in staging first; production is not a test environment
2. Forgetting to rotate downstream secrets; updating the database password but not the reporting tool breaks dashboards
3. Not revoking the old secret; "unused" secrets are still valid attack vectors
4. Rotating all secrets at once; a failed mass rotation is a total outage
5. Not documenting the rotation procedure; the next engineer will guess and break things

## Frequently Asked Questions

### How do I rotate a secret without downtime?

Use the dual-read pattern: your application reads both the old and new secret simultaneously during a transition window. Deploy with new secret support, validate, then remove old secret support. For databases, create a new user with identical permissions, migrate app connections, then drop the old user. Never change a password that is actively being used by a running process.

### What if a service I do not control uses my secret?

That is a dependency risk. Before rotating, identify all consumers using audit logs or secret manager access logs. Notify consumers in advance with a deadline. If a consumer is unknown, use a canary rotation: change the secret for a small subset of traffic and monitor for failures before full rotation. Unknown consumers are the biggest cause of rotation incidents.

### Should I rotate secrets after an employee leaves?

Yes, for all secrets the departing employee had access to, regardless of trust level. Access logs show what they touched, but not what they memorized or copied. The cost of rotation is lower than the cost of a breach. For shared secrets (e.g., database passwords), rotate immediately. For personal credentials (e.g., their own AWS IAM user), disable the account, do not rotate.


### What is the difference between rotation and revocation?

Rotation replaces a secret with a new one while maintaining service continuity. Revocation invalidates a secret immediately, potentially causing service disruption. Rotation is planned and uses dual-read patterns. Revocation is reactive and used when a secret is known to be compromised. After revocation, you must also rotate — revocation alone leaves services without valid credentials. The rotation procedure should include a revocation step at the end (dropping the old secret) but revocation procedures should be separate and faster, designed for incident response.

### How do we manage secrets in CI/CD pipelines?

CI/CD pipelines need secrets to build, test, and deploy. Never store secrets in pipeline configuration files or environment variables in the CI tool's UI. Use a secret manager (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) and inject secrets at runtime. Use short-lived tokens for CI — OIDC-based authentication for cloud providers eliminates long-lived keys entirely. Rotate CI secrets quarterly. Audit CI secret access logs monthly. Restrict CI secrets to the minimum permissions needed — a build pipeline does not need production database access. Use separate secrets for staging and production CI jobs.

### How do we handle secrets in containerized environments?

In Kubernetes: use External Secrets Operator to sync secrets from Vault/AWS SM into Kubernetes Secrets. Use CSI Secrets Store provider for mounting secrets as files. Never bake secrets into container images — use runtime injection. For database credentials, use the dual-read pattern with init containers. For TLS certificates, use cert-manager for automatic rotation. For service-to-service authentication, use SPIFFE/SPIRE for short-lived identity certificates. Scan container images for hardcoded secrets with Trivy or GitLeaks in CI. If a secret is found in an image, rotate it immediately — the image may have been pulled by attackers.

### What should we do if a secret is leaked?

If a secret is leaked: rotate it immediately — do not wait for the scheduled rotation. Revoke the old secret after rotation. Investigate the leak: how was it exposed (commit to public repo, log file, screenshot, CI output)? Fix the root cause (add pre-commit hooks, update logging to redact secrets, restrict CI output). Audit access logs for the leaked secret — was it used by unauthorized parties? If yes, treat as a security incident and follow the incident response playbook. Notify affected users if their data may have been accessed. Document the incident and add controls to prevent recurrence. A leaked secret that is not rotated is an open door.

### How do we audit secret usage?

Enable access logging on your secret manager (Vault audit logs, AWS CloudTrail for Secrets Manager). Log every secret read, write, and delete. Send logs to a SIEM (Splunk, ELK) for centralized analysis. Set up alerts for anomalous access patterns: secret accessed from a new IP, secret accessed outside business hours, bulk secret reads, or secret access by a non-human identity. Review access logs monthly — verify that only expected services and engineers are accessing secrets. Remove access for services that no longer need a secret. Quarterly access reviews ensure that secret permissions match current ownership.





































































End of document. Review and update quarterly.