---





contentType: docs
slug: secret-rotation-schedule-template
title: "Secret Rotation Schedule Template"
description: "A template for tracking and scheduling the rotation of API keys, passwords, certificates, and other secrets across systems."
metaDescription: "Track and schedule secret rotation with this template. Covers API keys, passwords, certificates, owners, frequency, and verification steps."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - secret-rotation
  - secrets-management
  - certificates
  - api-keys
  - compliance
relatedResources:
  - /docs/rbac-policy-template
  - /docs/access-control-review-template
  - /docs/encryption-key-lifecycle-template
  - /docs/ci-cd-pipeline-security-template
  - /docs/endpoint-security-checklist-template
  - /docs/user-access-audit-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Track and schedule secret rotation with this template. Covers API keys, passwords, certificates, owners, frequency, and verification steps."
  keywords:
    - secret rotation
    - credential rotation
    - certificate rotation
    - api key rotation
    - secrets management





---

## Overview

A Secret Rotation Schedule Template helps teams track every credential that must be rotated, when it was last rotated, when it is due next, and who owns the process. It supports operational reliability and compliance by preventing expired certificates, stale API keys, and forgotten service account passwords.

## When to Use

- Setting up a secrets management program.
- After a security incident or suspected credential leak.
- Preparing for an audit or compliance review.
- Migrating to a secrets manager or vault.
- Managing certificates, API keys, database passwords, or OAuth tokens.

## Prerequisites

- A complete inventory of secrets and their locations.
- A secrets manager or vault for safe storage and rotation.
- Defined rotation frequencies based on risk and compliance requirements.
- Owners for each secret or system.
- Automated or manual rotation procedures that have been tested.

## Solution

### Template

#### 1. Secret Inventory

| Secret Name | Type | System | Owner | Last Rotated | Next Rotation | Frequency | Status |
|-------------|------|--------|-------|--------------|---------------|-----------|--------|
| prod-db-password | Database password | payment-service | DB team | 2026-03-15 | 2026-09-15 | 6 months | On track |
| stripe-api-key | API key | billing-service | Payments team | 2026-05-01 | 2026-11-01 | 6 months | On track |
| tls-cert-api | TLS certificate | api-gateway | Platform team | 2025-08-01 | 2026-08-01 | 1 year | Due soon |
| s3-service-account | Service account key | file-processor | Data team | 2026-01-10 | 2026-07-10 | 6 months | Overdue |
| github-actions-token | CI token | deployment pipeline | DevOps | 2026-06-01 | 2026-12-01 | 6 months | On track |

#### 2. Rotation Procedure

| Step | Action | Owner | Verification |
|------|--------|-------|--------------|
| 1 | Generate new secret in vault | Owner | New secret exists and is encrypted |
| 2 | Update dependent services with new secret | Engineering team | Configuration change reviewed and approved |
| 3 | Restart or redeploy affected services | DevOps | Health checks pass |
| 4 | Validate functionality end-to-end | QA / owner | Smoke tests pass |
| 5 | Revoke old secret | Owner | Old secret no longer authenticates |
| 6 | Log rotation in schedule and audit trail | Security | Timestamp and owner recorded |

#### 3. Exception and Risk Acceptance

| Field | Value |
|-------|-------|
| Secret name | s3-service-account |
| Reason for exception | Legacy system cannot rotate automatically |
| Compensating control | Manual rotation with approval, access limited to VPC |
| Risk owner | Data team lead |
| Review date | 2026-09-10 |
| Approved by | CISO |

#### 4. Escalation Matrix

| Condition | Action | Escalation Target | Timeline |
|-----------|--------|-------------------|----------|
| Secret overdue by 7 days | Notify owner and manager | Engineering manager | Immediate |
| Secret overdue by 30 days | Escalate to security review | Security team | Within 48 hours |
| Suspected compromise | Rotate immediately and investigate | Incident response team | Within 4 hours |
| Certificate expiring in 30 days | Create renewal ticket | Platform team | Same day |

## Explanation

The schedule makes secret lifecycle visible. Without it, credentials expire unexpectedly, rotated secrets are forgotten, and compliance evidence is missing. The inventory links each secret to an owner, a rotation frequency, and a verification step, which reduces the risk of service disruption during rotation.

## Variants

- **Certificate-only schedule**: Focuses on TLS, code-signing, and intermediate certificates with renewal and revocation workflows.
- **Cloud credential schedule**: Tracks IAM keys, service principals, and managed identities across AWS, Azure, and GCP.
- **CI/CD secret schedule**: Manages pipeline tokens, signing keys, and deployment credentials.
- **Database credential schedule**: Tracks database passwords and connection strings with rolling rotation to avoid downtime.

## What Works

- Store secrets in a dedicated vault, never in source code or plaintext files.
- Automate rotation where possible to reduce human error.
- Rotate immediately after a suspected leak, employee departure, or breach.
- Set calendar reminders at 30, 14, and 7 days before expiration.
- Keep an audit trail of every rotation with owner and timestamp.
- Test rotation procedures in a non-production environment first.
- Delete old secrets after confirming the new ones are active.

## Common Mistakes

- Rotating a secret without updating all dependent services.
- Forgetting to restart services after a secret change.
- Keeping old secrets active "just in case" after rotation.
- Not assigning a clear owner for each secret.
- Skipping post-rotation validation.

## FAQs

### How often should API keys be rotated?

High-risk keys exposed to the internet should rotate every 90 days or less. Internal service keys typically rotate every 6 months, depending on compliance requirements.

### Should rotation be automated or manual?

Automate whenever possible. Manual rotation should be limited to legacy systems and should still follow a documented schedule with compensating controls.

### What happens if a service cannot rotate without downtime?

Use a rolling rotation strategy: create a new credential, update half of the instances, validate, then update the rest. For databases, support dual credentials temporarily.

## Advanced Solutions

### Automated secret rotation with HashiCorp Vault

Configure Vault dynamic secrets for databases so credentials are generated on-demand with short TTLs instead of manual rotation:

```hcl
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/payments-postgresql \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db.internal:5432/payments?sslmode=disable" \
    allowed_roles="readonly,readwrite" \
    username="vault-admin" \
    password="$(vault kv get -field=password secret/db/vault-admin)"

# Create a role with 1-hour TTL
vault write database/roles/readonly \
    db_name=payments-postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Applications request credentials on startup
vault read database/creds/readonly
# Returns: username=v-token-readonly-abc123  password=s3cr3t  lease_duration=3600
```

### AWS IAM key rotation script

Automate AWS access key rotation for service accounts with a Python script:

```python
#!/usr/bin/env python3
"""Rotate AWS IAM access keys with zero downtime."""
import boto3
import time
import sys

def rotate_iam_key(username: str) -> None:
    iam = boto3.client("iam")

    # List current keys
    keys = iam.list_access_keys(UserName=username)["AccessKeyMetadata"]
    if len(keys) >= 2:
        print(f"User {username} already has 2 keys. Delete one before rotating.")
        sys.exit(1)

    # Create new key
    new_key = iam.create_access_key(UserName=username)["AccessKey"]
    print(f"New key created: {new_key['AccessKeyId']}")

    # Update application config with new key
    # (deploy config update here, restart services, etc.)
    print("Update application config and restart services.")
    input("Press Enter once services are using the new key...")

    # Verify new key works
    sts = boto3.client(
        "sts",
        aws_access_key_id=new_key["AccessKeyId"],
        aws_secret_access_key=new_key["SecretAccessKey"],
    )
    sts.get_caller_identity()
    print("New key verified.")

    # Deactivate and delete old key
    for old_key in keys:
        iam.update_access_key(
            UserName=username,
            AccessKeyId=old_key["AccessKeyId"],
            Status="Inactive",
        )
        iam.delete_access_key(
            UserName=username,
            AccessKeyId=old_key["AccessKeyId"],
        )
        print(f"Old key deleted: {old_key['AccessKeyId']}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: rotate-iam-key.py <username>")
        sys.exit(1)
    rotate_iam_key(sys.argv[1])
```

### Kubernetes secret rotation with rolling restart

Rotate Kubernetes secrets and trigger a rolling update without downtime:

```bash
#!/bin/bash
set -euo pipefail

SECRET_NAME="db-credentials"
NAMESPACE="production"

# Create new secret version
kubectl create secret generic "${SECRET_NAME}-v2" \
    --from-literal=username=app_user \
    --from-literal=password="$(openssl rand -base64 32)" \
    --namespace "$NAMESPACE" -o yaml --dry-run=client | kubectl apply -f -

# Update deployment to use new secret
kubectl set env deployment/app-deployment \
    --namespace "$NAMESPACE" \
    DB_SECRET_NAME="${SECRET_NAME}-v2"

# Trigger rolling restart to pick up new secret
kubectl rollout restart deployment/app-deployment --namespace "$NAMESPACE"

# Wait for rollout to complete
kubectl rollout status deployment/app-deployment --namespace "$NAMESPACE"

# Clean up old secret after successful rollout
kubectl delete secret "$SECRET_NAME" --namespace "$NAMESPACE" 2>/dev/null || true
kubectl label secret "${SECRET_NAME}-v2" --namespace "$NAMESPACE" version=current

echo "Secret rotated and deployment updated successfully."
```

## Additional Best Practices


- For a deeper guide, see [Complete Guide to Secrets Management](/guides/complete-guide-secrets-management/).

1. **Use dual-key rotation for zero-downtime.** Maintain two active keys during rotation. Deploy the new key, verify, then revoke the old one. This prevents service disruption if the new key has issues:

```yaml
# Application config supporting dual keys
database:
  primary:
    host: db.internal
    password: ${DB_PASSWORD_V2}
  fallback:
    host: db.internal
    password: ${DB_PASSWORD_V1}
```

2. **Monitor secret access patterns after rotation.** Unexpected access with old credentials indicates a service that was not updated. Set up alerts for failed authentication attempts using revoked secrets:

```python
# Alert on failed auth with old key
if auth_failed and key_version == "old":
    alert_team(f"Service still using revoked key: {service_name}")
```

## Additional Common Mistakes

1. **Storing rotation schedules in spreadsheets without access control.** The schedule itself reveals which secrets exist and when they are vulnerable. Store the schedule in a secured wiki or governance tool with role-based access:

```
# Bad: shared Google Sheet with secret names and rotation dates
# Good: internal wiki page with RBAC, or governance tool like Vanta/Drata
```

2. **Not testing the rotation procedure before a real incident.** Run rotation drills quarterly to verify the procedure works and the team knows the steps. Document the drill results and update the procedure if needed.

## Additional Frequently Asked Questions

### What is the difference between static and dynamic secrets?

Static secrets are long-lived credentials stored in a vault and retrieved by applications. They require manual or scheduled rotation. Dynamic secrets are generated on-demand by the vault with a short TTL and automatically revoked when the lease expires. Dynamic secrets eliminate rotation because they expire automatically.

### How do I rotate secrets in a distributed system with no downtime?

Use a three-phase approach: (1) Create the new secret and make it available alongside the old one. (2) Deploy services incrementally to use the new secret, verifying each instance. (3) Once all services use the new secret, revoke the old one. For databases, use connection pooling with graceful reconnection to handle the credential switch.
