---



contentType: docs
slug: disaster-recovery-test-plan
title: "Disaster Recovery Test Plan"
description: "A template for planning and executing disaster recovery tests including failover validation, data integrity checks, and recovery time measurement."
metaDescription: "Plan and execute DR tests with this template. Covers failover validation, data integrity checks, RTO/RPO measurement, and post-test reporting."
difficulty: advanced
topics:
  - devops
  - infrastructure
  - security
tags:
  - disaster-recovery
  - test-plan
  - rto
  - rpo
  - failover
  - runbook
  - compliance
relatedResources:
  - /docs/runbook-database-failover
  - /docs/deployment-rollback-runbook
  - /docs/data-migration-runbook-template
  - /docs/incident-communication-template
  - /docs/data-breach-response-playbook
  - /docs/vulnerability-management-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Plan and execute DR tests with this template. Covers failover validation, data integrity checks, RTO/RPO measurement, and post-test reporting."
  keywords:
    - disaster recovery
    - dr test
    - rto rpo
    - failover test
    - business continuity
    - recovery plan



---

## Overview

Disaster recovery plans that have never been tested are merely wishful thinking. A real disaster exposes gaps in documentation, missing dependencies, and unrealistic assumptions about recovery times. This test plan provides a structured approach to validating your DR procedures through controlled failover exercises, data integrity verification, and RTO/RPO measurement.

## When to Use

Use this resource when:
- Annual compliance requirements mandate DR testing (SOC2, ISO 27001)
- You have recently changed infrastructure or disaster recovery procedures
- A previous incident revealed gaps in your DR capabilities
- You need to validate RTO and RPO commitments to stakeholders

## Prerequisites

Before starting:
- [ ] DR runbooks reviewed and updated within the last 90 days
- [ ] Test environment available (isolated from production)
- [ ] Backup snapshots confirmed restorable within the last 7 days
- [ ] Stakeholders notified of test window and expected impact
- [ ] Rollback plan documented in case the test goes wrong

## Solution

```markdown
# Disaster Recovery Test Plan: `<Service Name>`

## 1. Test Objectives

| Objective | Target | Measurement |
|-----------|--------|-------------|
| Recovery Time Objective (RTO) | < 4 hours | Time from disaster declaration to service availability |
| Recovery Point Objective (RPO) | < 15 minutes | Maximum acceptable data loss in recovery |
| Data Integrity | 100% | All transactions verified against source |
| Communication | < 30 minutes | All stakeholders notified of test start |

## 2. Scope & Assumptions

### In Scope
- Database failover and restoration from backup
- Application redeployment to DR region
- DNS cutover and traffic routing
- Smoke test validation of core user flows

### Out of Scope
- Third-party service dependencies (assumed available)
- Physical data center failures (cloud-based test)
- Complete network isolation scenarios

### Assumptions
- Latest backup snapshot is valid and complete
- DR region has sufficient capacity
- Network connectivity between regions is functional
- Team members are available during the test window

## 3. Test Scenarios

### Scenario A: Primary Region Complete Failure

**Trigger:** Simulated complete unavailability of the primary AWS region.

**Steps:**
1. **Declare disaster** (0:00) — Lead engineer announces DR test in incident channel
2. **Restore database** (0:30) — Restore from latest snapshot in DR region
3. **Deploy applications** (1:00) — Deploy application stack to DR Kubernetes cluster
4. **Update DNS** (1:30) — Cutover traffic to DR load balancer
5. **Validate** (2:00) — Run smoke tests and verify data integrity
6. **Measure RTO** — Record time from declaration to passing validation

### Scenario B: Database Corruption

**Trigger:** Primary database has corrupt data requiring point-in-time recovery.

**Steps:**
1. Identify corruption point from monitoring alerts
2. Restore database to 5 minutes before corruption timestamp
3. Verify transactional integrity with checksum queries
4. Promote restored instance to primary
5. Redirect application traffic

## 4. Test Execution

### Pre-Test Checklist

| Item | Status | Owner |
|------|--------|-------|
| Backup snapshot created | [ ] | DBA |
| DR environment provisioned | [ ] | Platform |
| Runbooks printed / accessible offline | [ ] | SRE |
| Stakeholders notified | [ ] | Incident Lead |
| Rollback plan confirmed | [ ] | SRE |
| Monitoring dashboards ready | [ ] | Observability |

### Execution Timeline

| Time | Activity | Expected Result |
|------|----------|-----------------|
| T+0:00 | Declare test start | Incident channel notified |
| T+0:05 | Initiate database restore | RDS restore job started |
| T+1:00 | Database available | Connection test passes |
| T+1:30 | Deploy application | All pods healthy |
| T+2:00 | DNS cutover | Traffic hitting DR region |
| T+2:30 | Smoke tests | 100% pass rate |
| T+3:00 | Data integrity check | Transaction count matches source |
| T+4:00 | RTO measurement | Record actual vs target |

### Rollback Procedure

If any critical step fails:
1. Pause test immediately
2. Revert DNS to primary region
3. Do NOT delete DR resources until post-test review
4. Escalate to engineering manager
5. Schedule follow-up test after fixes

## 5. Data Integrity Verification

```sql
-- Transaction count comparison
SELECT 'primary' as source, COUNT(*) as tx_count FROM orders
UNION ALL
SELECT 'dr', COUNT(*) FROM dr_orders;

-- Checksum comparison
SELECT 'primary', SUM(CHECKSUM(*)) FROM payments
UNION ALL
SELECT 'dr', SUM(CHECKSUM(*)) FROM dr_payments;

-- Latest transaction timestamp
SELECT MAX(created_at) FROM orders;
```

| Check | Primary | DR | Match |
|-------|---------|-----|-------|
| Transaction count | ______ | ______ | [ ] |
| Row-level checksum | ______ | ______ | [ ] |
| Latest timestamp | ______ | ______ | [ ] |

## 6. Post-Test Report

### Results Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| RTO | < 4 hours | ______ | Pass / Fail |
| RPO | < 15 minutes | ______ | Pass / Fail |
| Data integrity | 100% | ______ | Pass / Fail |
| Smoke tests | 100% | ______ | Pass / Fail |

### Issues Found

| Issue | Severity | Owner | Fix Deadline |
|-------|----------|-------|--------------|
| ______ | Critical / High / Medium / Low | ______ | ______ |

### Lessons Learned

- What worked well:
- What took longer than expected:
- What failed unexpectedly:
- What should be automated:

### Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Test Lead | ______ | ______ | ______ |
| Engineering Manager | ______ | ______ | ______ |
| Compliance (if required) | ______ | ______ | ______ |
```

## Explanation

The plan structures DR testing into **declared objectives** (RTO/RPO targets), **controlled scenarios** (specific failure modes), and **measurable results** (pass/fail criteria). The pre-test checklist prevents tests from failing due to missing prerequisites rather than actual DR gaps. The rollback procedure acknowledges that tests can fail and protects production from test-induced outages.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Annual compliance test | Full scenario with auditors | Document everything, maintain sign-offs |
| Quarterly internal drill | Abbreviated scenario, no auditor | Focus on team coordination and timing |
| After infrastructure change | Targeted scenario for changed component | Validate only what changed |
| Game day / chaos engineering | Unannounced test | Most realistic, requires mature automation |

## What Works

1. **Schedule tests during business hours** — the people who need to learn from them must participate
2. **Measure, don't estimate** — actual RTO is almost always longer than the documented estimate
3. **Test from backup, not from live replication** — validates your backup restoration, not just failover
4. **Document every deviation** — even minor timing differences indicate process gaps
5. **Automate smoke tests** — manual verification is too slow during a real disaster

## Common Mistakes

1. **Testing only failover, not restoration from backup** — replication may be healthy while backups are corrupt
2. **Not testing with realistic data volumes** — restoring 1TB takes longer than restoring 1GB
3. **Skipping the rollback procedure test** — getting back to normal is part of DR
4. **Testing during low-traffic periods only** — doesn't validate capacity assumptions
5. **Not updating runbooks after test findings** — the same gaps appear in next year's test

## Frequently Asked Questions

### How often should we run DR tests?

At minimum: annually for compliance, quarterly for internal validation. After every infrastructure change that affects recovery paths. Mature organizations test monthly with automated chaos engineering.

### What if the DR test fails catastrophically?

That's valuable information. The test has revealed that your DR plan doesn't work — better to discover this in a controlled test than during a real disaster. Pause the test, restore production, fix the issues, and reschedule.

### Do we need to notify customers about DR tests?

Only if the test impacts customer-facing services. Internal-only tests need no external notification. Customer-impacting tests should be scheduled during maintenance windows with advance notice.

## Advanced Solutions

### Automated DR test execution with Terraform and AWS

Provision the DR environment, restore from backup, and run validation tests automatically:

```python
import boto3
import subprocess
import time
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timedelta

@dataclass
class DRTestResult:
    test_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    rto_seconds: Optional[int] = None
    rpo_seconds: Optional[int] = None
    steps_completed: List[str] = field(default_factory=list)
    steps_failed: List[str] = field(default_factory=list)
    data_integrity_ok: bool = False

class DRTestRunner:
    def __init__(self, region: str, dr_region: str):
        self.region = region
        self.dr_region = dr_region
        self.rds = boto3.client("rds", region_name=dr_region)
        self.ec2 = boto3.client("ec2", region_name=dr_region)
        self.s3 = boto3.client("s3", region_name=region)

    def restore_database_from_snapshot(
        self, snapshot_id: str, db_instance_id: str
    ) -> str:
        """Restore RDS instance from snapshot in DR region."""
        print(f"Restoring {db_instance_id} from snapshot {snapshot_id}...")
        response = self.rds.restore_db_instance_from_db_snapshot(
            DBInstanceIdentifier=db_instance_id,
            DBSnapshotIdentifier=snapshot_id,
            AvailabilityZone=f"{self.dr_region}a",
        )
        # Wait for instance to be available
        waiter = self.rds.get_waiter("db_instance_available")
        waiter.wait(DBInstanceIdentifier=db_instance_id)
        endpoint = response["DBInstance"]["Endpoint"]["Address"]
        print(f"Database available at: {endpoint}")
        return endpoint

    def run_smoke_tests(self, endpoint: str) -> bool:
        """Run smoke tests against the restored environment."""
        tests = [
            ("health_check", f"curl -sf http://{endpoint}/health"),
            ("write_test", f"curl -sf -X POST http://{endpoint}/api/test -d '{{\"test\":\"dr\"}}'"),
            ("read_test", f"curl -sf http://{endpoint}/api/test/dr"),
        ]
        all_passed = True
        for name, cmd in tests:
            result = subprocess.run(cmd, shell=True, capture_output=True, timeout=30)
            if result.returncode == 0:
                print(f"  PASS: {name}")
            else:
                print(f"  FAIL: {name}: {result.stderr.decode()}")
                all_passed = False
        return all_passed

    def verify_data_integrity(
        self, primary_conn: str, dr_conn: str
    ) -> bool:
        """Compare transaction counts between primary and DR."""
        primary_count = self._query_count(primary_conn)
        dr_count = self._query_count(dr_conn)
        match = primary_count == dr_count
        print(f"Primary: {primary_count} rows, DR: {dr_count} rows, Match: {match}")
        return match

    def _query_count(self, conn_str: str) -> int:
        """Execute a count query and return the result."""
        cmd = f'psql "{conn_str}" -t -c "SELECT COUNT(*) FROM orders;"'
        result = subprocess.run(cmd, shell=True, capture_output=True, timeout=60)
        return int(result.stdout.decode().strip()) if result.returncode == 0 else -1

    def execute_full_test(self, snapshot_id: str) -> DRTestResult:
        """Execute a full DR test and return results."""
        result = DRTestResult(
            test_name="full_region_failure",
            start_time=datetime.now(),
        )

        try:
            # Step 1: Restore database
            endpoint = self.restore_database_from_snapshot(
                snapshot_id, "dr-test-instance"
            )
            result.steps_completed.append("database_restore")

            # Step 2: Run smoke tests
            if self.run_smoke_tests(endpoint):
                result.steps_completed.append("smoke_tests")
            else:
                result.steps_failed.append("smoke_tests")

            # Step 3: Verify data integrity
            if self.verify_data_integrity(
                "postgresql://primary.db.internal/appdb",
                f"postgresql://{endpoint}/appdb",
            ):
                result.data_integrity_ok = True
                result.steps_completed.append("data_integrity")
            else:
                result.steps_failed.append("data_integrity")

        except Exception as e:
            print(f"Test failed: {e}")
            result.steps_failed.append(f"exception: {str(e)}")

        result.end_time = datetime.now()
        result.rto_seconds = int((result.end_time - result.start_time).total_seconds())
        return result

# Example usage
runner = DRTestRunner("us-east-1", "us-west-2")
result = runner.execute_full_test("rds-snapshot-2026-07-01")
print(f"\nRTO: {result.rto_seconds}s")
print(f"Steps completed: {result.steps_completed}")
print(f"Steps failed: {result.steps_failed}")
print(f"Data integrity: {result.data_integrity_ok}")
```

### Chaos engineering game day script

Inject controlled failures to test DR readiness without prior announcement:

```bash
#!/bin/bash
# game-day.sh - Chaos engineering DR test
# Usage: ./game-day.sh --scenario <network|disk|cpu|full>

set -euo pipefail

SCENARIO="${1:---scenario}"
shift || true

case "$SCENARIO" in
  --scenario) SCENARIO="$1" ;;
esac

NAMESPACE="production"
SERVICE="api"
LOG_FILE="/tmp/game-day-$(date +%s).log"

log() { echo "[$(date -u +%H:%M:%S)] $1" | tee -a "$LOG_FILE"; }

case "$SCENARIO" in
  network)
    log "Injecting network latency to ${SERVICE} pods..."
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- \
      tc qdisc add dev eth0 root netem delay 500ms 2>/dev/null || true
    log "Monitoring for 5 minutes..."
    sleep 300
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- \
      tc qdisc del dev eth0 root 2>/dev/null || true
    log "Network latency removed."
    ;;

  disk)
    log "Filling disk on ${SERVICE} pods to 90%..."
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- \
      fallocate -l $(df --output=avail -BG / | tail -1 | tr -d 'G ')M /tmp/fill 2>/dev/null || true
    sleep 120
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- rm -f /tmp/fill 2>/dev/null || true
    log "Disk space restored."
    ;;

  cpu)
    log "Spiking CPU on ${SERVICE} pods..."
    kubectl exec -n "$NAMESPACE" deployment/"$SERVICE" -- \
      sh -c 'yes > /dev/null & yes > /dev/null & yes > /dev/null &' 2>/dev/null || true
    sleep 120
    kubectl delete pod -n "$NAMESPACE" -l app="$SERVICE" --grace-period=0 --force 2>/dev/null || true
    log "CPU spike ended (pods restarted)."
    ;;

  full)
    log "Starting full region failure simulation..."
    log "1. Cordoning all nodes in primary region..."
    kubectl cordon --selector=topology.kubernetes.io/region=us-east-1
    log "2. Draining workloads..."
    kubectl drain --selector=topology.kubernetes.io/region=us-east-1 \
      --ignore-daemonsets --delete-emptydir-data --timeout=300s || true
    log "3. Waiting 5 minutes for failover..."
    sleep 300
    log "4. Checking DR region health..."
    kubectl get pods -n production --context=dr-cluster
    log "5. Uncordoning primary region..."
    kubectl uncordon --selector=topology.kubernetes.io/region=us-east-1
    log "Full region simulation complete."
    ;;

  *)
    echo "Usage: $0 --scenario <network|disk|cpu|full>"
    exit 1
    ;;
esac

log "Game day results saved to $LOG_FILE"
```

### RTO/RPO monitoring dashboard query

Track RTO and RPO metrics over time to identify trends and degradation:

```sql
-- Prometheus query for RPO tracking (replication lag over time)
-- Use in Grafana dashboard
SELECT
  date_trunc('day', timestamp) as day,
  avg(value) as avg_lag_seconds,
  max(value) as max_lag_seconds,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY value) as p99_lag_seconds
FROM prometheus_metrics
WHERE metric_name = 'pg_replication_lag_seconds'
  AND timestamp > now() - interval '90 days'
GROUP BY 1
ORDER BY 1;

-- DR test results over time
SELECT
  test_date,
  rto_target_seconds,
  rto_actual_seconds,
  rpo_target_seconds,
  rpo_actual_seconds,
  CASE
    WHEN rto_actual_seconds <= rto_target_seconds THEN 'PASS'
    ELSE 'FAIL'
  END as rto_status,
  CASE
    WHEN rpo_actual_seconds <= rpo_target_seconds THEN 'PASS'
    ELSE 'FAIL'
  END as rpo_status
FROM dr_test_results
ORDER BY test_date DESC
LIMIT 12;
```

## Additional Best Practices


- For a deeper guide, see [Disaster Recovery: RTO, RPO, and Resilient Recovery Runbooks](/guides/disaster-recovery-guide/).

1. **Maintain a DR test calendar with rotating scenarios.** Don't test the same scenario every time. Rotate through different failure modes to cover all recovery paths:

```markdown
## DR Test Calendar

| Quarter | Scenario | Owner | Target RTO | Last Tested |
|---------|----------|-------|------------|-------------|
| Q1 2026 | Primary region failure | Platform team | 4 hours | 2026-01-15 |
| Q2 2026 | Database corruption | DBA team | 2 hours | 2026-04-20 |
| Q3 2026 | Network partition | Network team | 1 hour | Pending |
| Q4 2026 | Full region + backup restore | SRE team | 8 hours | Pending |
```

2. **Include third-party dependency tests.** Your DR plan depends on DNS providers, CDNs, and external APIs. Test failover for these too:

```bash
# Test DNS failover
dig @8.8.8.8 app.example.com +short
# Should return DR region IP after cutover

# Test CDN failover
curl -sI https://app.example.com | grep "x-served-by"
# Should show DR cache node after cutover

# Test external API dependency circuit breaker
curl -X POST http://app.internal/admin/test-circuit-breaker \
  -d '{"dependency":"payment-gateway","action":"open"}'
```

## Additional Common Mistakes

1. **Not testing the communication plan during DR tests.** Engineers focus on technical recovery and forget to test stakeholder notification. During a real disaster, communication failures cause as much damage as technical failures. Include communication steps in the test timeline and measure how long it takes to notify all stakeholders.

2. **Using the same backup for every test.** If you always restore from the same snapshot, you are testing that one snapshot, not your backup system. Use the most recent backup for each test. This validates that your backup pipeline is producing restorable snapshots consistently.

## Additional Frequently Asked Questions

### What is the difference between a DR test and a chaos engineering game day?

A DR test is a planned, announced exercise that validates your recovery procedures against specific failure scenarios. It follows a documented runbook and measures RTO/RPO. A chaos engineering game day is an unannounced or semi-announced exercise that injects random failures into production to test system resilience and on-call response. DR tests validate your plan; game days validate your readiness. Both are needed.

### How do we test DR for multi-region active-active architectures?

In active-active setups, a region failure means the surviving region absorbs all traffic. Test by cordoning one region and verifying that traffic shifts, capacity scales, and data consistency holds. The key metric is not RTO (traffic should shift automatically) but whether the surviving region can handle full load. Test capacity headroom by simulating traffic from the failed region against the surviving region.
