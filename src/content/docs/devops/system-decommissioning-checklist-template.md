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
  - /docs/devops/deprecation-timeline-template
  - /docs/devops/service-ownership-document-template
  - /docs/devops/feature-specification-template
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

The checklist is ordered by **risk**: discovery first (so you know what you are touching), data handling second (so you do not delete something you must keep), dependency removal third (so upstream systems do not break), shutdown fourth, cleanup fifth, and documentation last. The **verification section** catches the things that always get forgotten: a DNS record with a long TTL, a cron job on a forgotten server, or an IAM role that quietly grants access to something else.

## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Third-party service replacement | Add vendor contract termination, data export, and API key revocation | You do not control the infrastructure |
| Database-only retirement | Focus on schema migration, referential integrity, and query redirection | Data outlives code |
| Microservice retirement | Add service mesh removal, contract updates, and consumer notification | Consumers may be other teams |
| Region shutdown | Add data residency checks, user migration, and latency impact assessment | Regions have compliance implications |
| Experiment teardown | Shorter checklist; focus on data deletion and cost confirmation | Experiments should clean up fast |

## Best Practices

1. **Never delete on the first day** — stop the service, wait, and watch. Deletion should be the last step
2. **Archive before you delete** — storage is cheap; explaining missing data to auditors is expensive
3. **Communicate early and often** — the worst decommissioning surprise is finding out another team was still using the service
4. **Document what was removed** — future engineers will search for the service; leave a tombstone, not a mystery
5. **Verify billing** — cloud resources have a way of generating charges even after you think they are gone

## Common Mistakes

1. **Skipping discovery** — the service you are shutting down is someone else's critical dependency
2. **Deleting data too early** — legal hold, audit, or business needs may require retention longer than you expect
3. **Not waiting after shutdown** — some systems only receive traffic on monthly or quarterly schedules
4. **Forgetting DNS** — a DNS record pointing to a deleted IP can be hijacked or cause strange errors
5. **Ignoring certificates** — expired certificates for deleted services still trigger renewal alerts and automation

## Frequently Asked Questions

### How long should we wait between shutdown and cleanup?

At least one full billing cycle and one complete business cycle. If the service processes monthly reports, wait until the next month to confirm nothing broke. For critical systems, 30 days is a safe default.

### What if we discover an unknown dependency after shutdown?

Have a rollback plan: keep the service artifacts (code, config, data snapshot) for 90 days after shutdown. If a critical dependency is discovered, you can restart temporarily while you migrate it.

### Should we keep the code repository?

Archive it, do not delete it. Move it to an "archive" or "retired" organization. Preserve the git history — it contains the rationale for decisions that may still be relevant. Delete active CI/CD triggers and deployment keys.
