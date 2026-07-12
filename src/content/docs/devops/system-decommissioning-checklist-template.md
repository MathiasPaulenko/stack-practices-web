---


contentType: docs
slug: system-decommissioning-checklist-template
title: "System Decommissioning Checklist Template"
description: "A checklist for safely retiring old services, removing dependencies, and cleaning up infrastructure without breaking downstream consumers."
metaDescription: "Safely retire old services with this decommissioning checklist. Covers dependency mapping, data migration, cleanup, and communication to prevent outages."
difficulty: intermediate
topics:
  - infrastructure
  - devops
tags:
  - decommissioning
  - retirement
  - infrastructure
  - migration
  - cleanup
relatedResources:
  - /docs/deprecation-timeline-template
  - /docs/service-ownership-document-template
  - /docs/feature-specification-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Safely retire old services with this decommissioning checklist. Covers dependency mapping, data migration, cleanup, and communication to prevent outages."
  keywords:
    - system decommissioning
    - service retirement
    - infrastructure cleanup
    - deprecation checklist
    - legacy system shutdown


---

## Overview

Old services never die quietly. They linger in DNS records, confuse new engineers, cost money, and occasionally break things when someone changes a certificate or rotates a secret. Decommissioning is the disciplined process of shutting down a service: identifying every dependency, migrating every user, deleting every resource, and documenting what was removed. Done well, it reduces cost and complexity. Done poorly, it causes outages in systems you thought were unrelated.

## When to Use


- For alternatives, see [Blue-Green Deployment](/guides/blue-green-deployment-guide/).

Use this template when:
- A service has been replaced by a new system and traffic has migrated
- A feature is being sunset and the supporting infrastructure is no longer needed
- A third-party integration is being discontinued
- An experiment or proof-of-concept has concluded
- An audit requires evidence that unused resources have been removed

## Prerequisites

Before decommissioning a system:
- [ ] The replacement system is production-ready and handling all traffic
- [ ] A deprecation timeline has been communicated to all stakeholders
- [ ] All data retention and compliance requirements have been reviewed
- [ ] A rollback plan exists in case the new system fails after shutdown
- [ ] The service owner has approved the decommissioning date

## Solution

```markdown
# Decommissioning Checklist: `<System / Service Name>`

> Service owner: ______ | Date: ______ | Approved by: ______
> Replacement system: ______ | Decommissioning target date: ______

## 1. Discovery

- [ ] List all upstream services that call this system
- [ ] List all downstream services this system calls
- [ ] List all external integrations (vendors, partners, webhooks)
- [ ] List all DNS entries, load balancers, and CDN configs pointing to this service
- [ ] List all SSL certificates tied to this service
- [ ] List all databases, caches, queues, and storage buckets owned by this service
- [ ] List all scheduled jobs, cron tasks, or background workers
- [ ] List all feature flags or configuration entries referencing this service

## 2. Data Handling

- [ ] Confirm data retention requirements (legal, compliance, business)
- [ ] Export and archive data that must be retained
- [ ] Verify archive location, encryption, and access controls
- [ ] Migrate active data to the replacement system
- [ ] Document the data archive location and retention schedule
- [ ] Confirm deletion of data that does not need to be retained

## 3. Dependency Removal

- [ ] Remove service from upstream load balancers and DNS
- [ ] Update upstream services to stop calling this system
- [ ] Remove service references from API gateways and service meshes
- [ ] Remove service from monitoring, alerting, and dashboards
- [ ] Remove service from CI/CD pipelines and deployment tools
- [ ] Remove service from secret managers and credential stores
- [ ] Remove service from backup schedules and disaster recovery plans

## 4. Shutdown

- [ ] Redirect traffic (if applicable) to replacement or sunset page
- [ ] Stop the service in staging / pre-production
- [ ] Monitor for errors or unexpected traffic for 24-48 hours
- [ ] Stop the service in production
- [ ] Monitor again for 24-48 hours
- [ ] Disable auto-restart or health-check recovery

## 5. Resource Cleanup

- [ ] Terminate compute instances, containers, or serverless functions
- [ ] Delete databases (after confirming archive and retention)
- [ ] Delete caches, queues, and topics
- [ ] Delete storage buckets and volumes
- [ ] Release static IPs and elastic network interfaces
- [ ] Delete load balancer listeners and target groups
- [ ] Delete DNS records (after TTL expires)
- [ ] Revoke or delete SSL certificates
- [ ] Delete IAM roles, policies, and service accounts

## 6. Documentation

- [ ] Update architecture diagrams to remove the service
- [ ] Update runbooks and operational documentation
- [ ] Update service catalog or ownership documents
- [ ] Write a brief postmortem or retrospective on the decommissioning
- [ ] Notify stakeholders that the service has been fully retired

## 7. Verification

- [ ] Confirm no billing charges for the service in the next billing cycle
- [ ] Confirm no alerts or errors reference the service
- [ ] Confirm no code repositories reference the service (excluding history)
- [ ] Confirm no new engineers are onboarding to the retired service
```

## Explanation

The checklist is ordered by risk: discovery first (so you know what you are touching), data handling second (so you do not delete something you must keep), dependency removal third (so upstream systems do not break), shutdown fourth, cleanup fifth, and documentation last. The verification section catches the things that always get forgotten: a DNS record with a long TTL, a cron job on a forgotten server, or an IAM role that quietly grants access to something else.

## Remaining Resource Verification Script

```bash
#!/bin/bash
# Verify remaining resources after decommissioning
set -euo pipefail

SERVICE_NAME="legacy-auth-service"
AWS_REGION="us-east-1"

echo "=== Remaining Resource Verification ==="
echo "Service: $SERVICE_NAME"
echo "Date: $(date)"
echo ""

# Check DNS records
echo "--- DNS Records ---"
dig +short "$SERVICE_NAME.internal.example.com" && echo "WARNING: DNS record still exists" || echo "OK: No DNS record"

# Check AWS resources
echo "--- AWS Resources ---"
aws ec2 describe-instances --region $AWS_REGION --filters "Name=tag:Service,Values=$SERVICE_NAME" --query 'Reservations[*].Instances[*].InstanceId' --output text 2>/dev/null | while read id; do
  [ -n "$id" ] && echo "WARNING: EC2 instance found: $id"
done

aws rds describe-db-instances --region $AWS_REGION --query 'DBInstances[?DBInstanceIdentifier.contains(@, `'$SERVICE_NAME'`)].DBInstanceIdentifier' --output text 2>/dev/null | while read id; do
  [ -n "$id" ] && echo "WARNING: RDS instance found: $id"
done

aws s3 ls --region $AWS_REGION 2>/dev/null | grep "$SERVICE_NAME" && echo "WARNING: S3 bucket found" || echo "OK: No S3 buckets"

# Check certificates
echo "--- Certificates ---"
aws acm list-certificates --region $AWS_REGION --query 'CertificateSummaryList[*].DomainName' --output text 2>/dev/null | tr '	' '
' | grep -i "$SERVICE_NAME" && echo "WARNING: ACM certificate found" || echo "OK: No certificates"

# Check CloudWatch alarms
echo "--- CloudWatch Alarms ---"
aws cloudwatch describe-alarms --region $AWS_REGION --query 'MetricAlarms[?AlarmName.contains(@, `'$SERVICE_NAME'`)].AlarmName' --output text 2>/dev/null | while read alarm; do
  [ -n "$alarm" ] && echo "WARNING: CloudWatch alarm found: $alarm"
done

echo ""
echo "=== Verification Complete ==="
```

## Decommissioning Notification Template

```text
=== Service Decommissioning Notification ===

To: engineering@example.com, stakeholders@example.com
From: platform-team@example.com
Date: [DATE]
Subject: Decommissioning of [SERVICE_NAME]

The service [SERVICE_NAME] will be decommissioned on [SHUTDOWN_DATE].

What does this mean?
- The service will stop accepting traffic on [SHUTDOWN_DATE]
- Data will be archived and available for [RETENTION_PERIOD]
- Endpoints will return 410 Gone after shutdown
- Upstream dependencies must be updated before [SHUTDOWN_DATE]

What do you need to do?
1. Check if your service depends on [SERVICE_NAME]
2. If it does, migrate to [REPLACEMENT_SERVICE] before [SHUTDOWN_DATE]
3. Update configurations, environment variables, and documentation
4. Contact platform-team@example.com if you need migration support

Timeline:
- [TODAY]: Notification sent
- [T-30]: Service shutdown (stop)
- [T-60]: Infrastructure deletion
- [T-90]: Data deletion (per retention policy)

Contact: platform-team@example.com
```

## Post-Decommissioning Audit Checklist

```text
=== Post-Decommissioning Audit (30 days) ===

Infrastructure:
  [ ] No cloud resources generating charges
  [ ] No active alerts referencing the service
  [ ] No obsolete dashboards in Grafana/Datadog
  [ ] No targets in Prometheus/CloudWatch

Network and DNS:
  [ ] DNS records deleted or redirected
  [ ] TLS certificates revoked or deleted
  [ ] Firewall/security group rules deleted
  [ ] Load balancers and target groups deleted

Code and CI/CD:
  [ ] Repository archived (not deleted)
  [ ] CI/CD pipelines disabled
  [ ] Webhooks removed
  [ ] CI environment variables deleted

Data:
  [ ] Backups archived to cheap storage
  [ ] Retention policy documented
  [ ] Access to archived data restricted and audited

Documentation:
  [ ] Tombstone created in wiki/documentation
  [ ] Service catalog updated
  [ ] Architecture diagrams updated
  [ ] Runbooks referencing the service updated
```


## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Third-party service replacement | Add vendor contract termination, data export, and API key revocation | You do not control the infrastructure |
| Database-only retirement | Focus on schema migration, referential integrity, and query redirection | Data outlives code |
| Microservice retirement | Add service mesh removal, contract updates, and consumer notification | Consumers may be other teams |
| Region shutdown | Add data residency checks, user migration, and latency impact assessment | Regions have compliance implications |
| Experiment teardown | Shorter checklist; focus on data deletion and cost confirmation | Experiments should clean up fast |

## What Works

1. Never delete on the first day. Stop the service, wait, and watch. Deletion should be the last step
2. Archive before you delete. Storage is cheap; explaining missing data to auditors is expensive
3. Communicate early and often. The worst decommissioning surprise is finding out another team was still using the service
4. Document what was removed. Future engineers will search for the service; leave a tombstone, not a mystery
5. Verify billing. Cloud resources have a way of generating charges even after you think they are gone

## Common Mistakes

1. Skipping discovery. The service you are shutting down is someone else's critical dependency
2. Deleting data too early. Legal hold, audit, or business needs may require retention longer than you expect
3. Not waiting after shutdown. Some systems only receive traffic on monthly or quarterly schedules
4. Forgetting DNS. A DNS record pointing to a deleted IP can be hijacked or cause strange errors
5. Ignoring certificates. Expired certificates for deleted services still trigger renewal alerts and automation

## Frequently Asked Questions

### How long should we wait between shutdown and cleanup?

At least one full billing cycle and one complete business cycle. If the service processes monthly reports, wait until the next month to confirm nothing broke. For critical systems, 30 days is a safe default.

### What if we discover an unknown dependency after shutdown?

Have a rollback plan: keep the service artifacts (code, config, data snapshot) for 90 days after shutdown. If a critical dependency is discovered, you can restart temporarily while you migrate it.

### Should we keep the code repository?

Archive it, do not delete it. Move it to an "archive" or "retired" organization. Preserve the git history — it contains the rationale for decisions that may still be relevant. Delete active CI/CD triggers and deployment keys.


### What do we do with data after decommissioning?

Export data to a portable format (CSV, JSON, SQL dump) and store it in cheap archival storage (S3 Glacier, Azure Archive). Document the schema, the meaning of each column, and any transformations applied. Set a retention policy based on legal and business requirements. Configure cost alerts for the archival storage. Create a recovery procedure for cases where archived data needs to be queried.

### How do we handle dependencies on already-decommissioned services?

Before shutdown, identify all consumers using traffic analysis, code review, and team surveys. Notify each consumer at least 30 days in advance. Provide migration documentation and support during the transition. If a consumer cannot migrate in time, consider keeping the service in read-only mode until they complete migration. Document any consumers that could not migrate and the reason.

### Should we reuse the service name after decommissioning?

No. Service names should be unique over time to avoid confusion. If a new service uses the same name, engineers may confuse it with the old service, leading to configuration errors and incorrect documentation references. Use versioned or descriptive names (auth-service-v2 instead of auth-service). Keep a tombstone in the documentation indicating the original name was retired.

### How do we calculate cost savings from decommissioning?

Sum all direct costs (compute, storage, network, licenses) and indirect costs (engineering time for maintenance, monitoring, on-call). Subtract the cost of archival storage. Track savings monthly for 6 months to verify costs actually decreased. Report savings to finance and leadership. Use these numbers to justify future decommissioning efforts.

### What if we need to restart a decommissioned service?

If you have the artifacts (code, configuration, data snapshot) stored, you can restart temporarily. Follow the documented rollback procedure. Notify that the service is being reactivated temporarily. Set a deadline for permanent migration. If artifacts were deleted, rebuild from the archived repository using the tagged version at decommissioning time. Document the reason for restart and update the tombstone.
