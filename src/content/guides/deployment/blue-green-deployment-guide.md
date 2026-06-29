---
contentType: guides
slug: blue-green-deployment-guide
title: "Blue-Green Deployment — Zero-Downtime Releases with Instant Rollback"
description: "A practical guide to blue-green deployments: architecture, traffic switching strategies, database migrations, and achieving zero-downtime releases with instant rollback capability."
metaDescription: "Learn blue-green deployment: zero-downtime releases, traffic switching, database migrations, and instant rollback strategies."
difficulty: intermediate
topics:
  - devops
  - infrastructure
  - performance
tags:
  - blue-green
  - deployment
  - zero-downtime
  - rollback
  - traffic-switching
  - infrastructure
  - guide
relatedResources:
  - /guides/deployment/canary-deployment-guide
  - /guides/deployment/feature-flags-guide
  - /guides/devops/sre-practices-guide
  - /guides/planning/capacity-planning-guide
  - /guides/planning/disaster-recovery-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn blue-green deployment: zero-downtime releases, traffic switching, database migrations, and instant rollback strategies."
  keywords:
    - blue-green
    - deployment
    - zero-downtime
    - rollback
    - traffic-switching
    - infrastructure
    - guide
---

## Overview

Blue-green deployment is a release strategy that maintains two identical production environments — blue (active) and green (idle). New versions deploy to the idle environment, get validated, and then traffic switches instantly. If problems arise, rollback is just another traffic switch.

This guide covers architecture design, traffic switching mechanisms, database migration handling, and operational best practices.

## When to Use

- You need zero-downtime deployments for critical services
- Rollback speed is more important than resource efficiency
- Your application can run in two complete parallel environments
- You have sufficient infrastructure capacity to run duplicate environments
- Database changes are backward-compatible or can be decoupled

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Blue Environment** | Currently active production environment serving live traffic |
| **Green Environment** | New version deployment target; idle until validation passes |
| **Traffic Switch** | Routing all user traffic from blue to green instantly |
| **Rollback** | Reverting traffic to blue if green shows issues |
| **Warm-up** | Pre-loading caches and connections before switching traffic |
| **Database Compatibility** | Requirement that schema changes work with both old and new code |

## Architecture

```
┌─────────────────┐
│   Load Balancer  │
│   (Router/Proxy) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼────┐
│ Blue  │  │ Green │
│ (Live)│  │ (Idle)│
└───────┘  └───────┘
```

## Step-by-Step Blue-Green Deployment

### 1. Prepare the Green Environment

Deploy the new version to the inactive environment:

```bash
# Example: Kubernetes blue-green with Services
# Blue environment (current live)
apiVersion: v1
kind: Service
metadata:
  name: myapp-blue
  labels:
    version: blue
spec:
  selector:
    app: myapp
    version: blue
  ports:
    - port: 80
      targetPort: 8080

# Green environment (new version)
apiVersion: v1
kind: Service
metadata:
  name: myapp-green
  labels:
    version: green
spec:
  selector:
    app: myapp
    version: green
  ports:
    - port: 80
      targetPort: 8080
```

**Preparation checklist:**
- Deploy new version to green with identical resource sizing
- Run smoke tests and health checks against green
- Pre-warm caches and connection pools
- Verify green can handle full production load
- Keep blue running and healthy during preparation

### 2. Switch Traffic

Move all traffic from blue to green:

```bash
# Example: NGINX traffic switch
# Update upstream configuration and reload
upstream myapp {
    server green-env.internal:8080;  # Switch to green
    # server blue-env.internal:8080;  # Comment out blue
}

# Reload with zero downtime
sudo nginx -s reload

# Example: AWS ALB target group switch
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/green
```

**Traffic switching strategies:**
- **DNS switch:** Update CNAME (slow due to TTL propagation)
- **Load balancer:** Change target group or upstream backend (instant)
- **Service mesh:** Update virtual service routing rules (instant)
- **API gateway:** Update backend endpoint configuration (instant)

### 3. Monitor Post-Switch

Watch for issues immediately after the switch:

| Metric | Warning Threshold | Action |
|--------|-------------------|--------|
| Error rate | >0.1% increase | Trigger rollback |
| Latency p95 | >20% increase | Trigger rollback |
| CPU/Memory | >80% utilization | Scale green or rollback |
| Custom business KPI | Any regression | Trigger rollback |

```bash
# Example: Automated rollback trigger
#!/bin/bash
ERROR_RATE=$(curl -s "http://monitoring/api/v1/query?query=rate(errors[5m])" | jq '.data.result[0].value[1]')
THRESHOLD=0.001

if (( $(echo "$ERROR_RATE > $THRESHOLD" | bc -l) )); then
  echo "Error rate $ERROR_RATE exceeds threshold. Initiating rollback."
  ./switch-traffic.sh --target=blue
  exit 1
fi
```

### 4. Rollback (If Needed)

Instantly revert to blue if green fails:

```bash
# Example: Instant rollback script
#!/bin/bash
set -e

TARGET=${1:-blue}

echo "Rolling back traffic to ${TARGET}..."

# Update load balancer
case $TARGET in
  blue)
    kubectl patch service myapp-active -p '{"spec":{"selector":{"version":"blue"}}}'
    ;;
  green)
    kubectl patch service myapp-active -p '{"spec":{"selector":{"version":"green"}}}'
    ;;
esac

echo "Rollback complete. Verifying health..."
curl -f http://myapp-active/health
```

**Rollback considerations:**
- Keep blue environment running for 1-2 hours post-switch (or longer)
- Ensure database changes are backward-compatible for rollback
- Have a runbook with exact rollback steps
- Practice rollback drills quarterly

### 5. Decommission Blue

After green is stable, tear down blue:

```bash
# Example: Safe decommission checklist
# 1. Wait 24-48 hours of stable operation on green
# 2. Verify no traffic hitting blue via access logs
# 3. Archive blue environment state (for forensics if needed)
# 4. Scale blue to zero or delete resources
# 5. Update documentation with new baseline (green becomes blue for next deployment)
```

## Database Considerations

Database changes are the hardest part of blue-green deployments:

| Strategy | When to Use | Complexity |
|----------|-------------|------------|
| **Backward-compatible schema** | All changes work with old and new code | Low |
| **Expand-contract pattern** | Add in one release, remove in next | Medium |
| **Database per environment** | Complete data isolation required | High |
| **Read replicas** | Switch read traffic independently | Medium |

```sql
-- Example: Backward-compatible migration
-- Step 1 (before deployment): Add new column as nullable
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;

-- Step 2 (new code writes to both old and new columns)
-- Old code ignores new column

-- Step 3 (next release): Backfill and make non-nullable
UPDATE users SET email_verified = false WHERE email_verified IS NULL;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
```

## What Works

- **Keep environments truly identical.** Same OS, runtime versions, resource limits, and configuration.
- **Automate the entire switch.** Manual DNS changes or config edits are error-prone.
- **Monitor before, during, and after.** Baseline metrics help detect regressions.
- **Plan for database drift.** Shared databases between environments require careful migration ordering.
- **Test rollback regularly.** The best time to test rollback is when you do not need it.
- **Document the switch decision.** Note why the switch happened and what was observed.

## Common Mistakes

- **Switching traffic without health checks.** Always validate green before routing users.
- **Ignoring database state.** Schema changes must be compatible with both environments.
- **Deleting blue too quickly.** Wait for a bake period before decommissioning.
- **Unequal environment sizing.** Green must handle 100% of traffic; do not under-provision.
- **Forgetting about sticky sessions.** Users with session state may see logout or data loss.

## Variants

- **Immutable infrastructure:** Build new AMIs/containers instead of updating in place
- **Feature-flagged blue-green:** Use feature flags to control traffic percentage within green
- **Multi-region blue-green:** Switch entire regions between blue and green
- **Database blue-green:** Replicate database and switch connection strings

## FAQ

**Q: How much extra infrastructure does blue-green require?**
100% — you run two complete environments. This is the trade-off for instant rollback.

**Q: Can I use blue-green with stateful services?**
Yes, but carefully. Session state must be externalized (Redis, database). Database changes require backward-compatible migrations.

**Q: What is the difference between blue-green and canary?**
Blue-green switches all traffic at once. Canary routes a small percentage first, gradually increasing.

**Q: How long should I keep the old environment after switching?**
Keep it for at least one business day (24 hours) or until you are confident the new version is stable.

## Conclusion

Blue-green deployment is the gold standard for zero-downtime releases with instant rollback. It requires double infrastructure but provides unmatched confidence. Combine it with automated health checks, backward-compatible database migrations, and thorough monitoring for a bulletproof release process.
