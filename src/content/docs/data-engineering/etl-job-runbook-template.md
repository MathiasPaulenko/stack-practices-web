---


contentType: docs
slug: etl-job-runbook-template
title: "ETL Job Runbook Template"
description: "A runbook for operating, monitoring, and troubleshooting ETL jobs: startup, shutdown, health checks, common failures, diagnostics, and recovery."
metaDescription: "Use this ETL job runbook template to document startup, shutdown, health checks, common failures, diagnostics, and recovery procedures for ETL jobs."
difficulty: intermediate
topics:
  - testing
tags:
  - data-engineering
  - etl
  - runbook
  - operations
  - template
  - troubleshooting
  - data
relatedResources:
  - /docs/data-pipeline-design-document-template
  - /docs/data-quality-rules-template
  - /docs/data-governance-policy-template
  - /docs/alert-runbook-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this ETL job runbook template to document startup, shutdown, health checks, common failures, diagnostics, and recovery procedures for ETL jobs."
  keywords:
    - etl runbook
    - etl operations
    - job troubleshooting
    - data engineering
    - template
    - recovery
    - monitoring


---

## Overview

An ETL job runbook gives operators the procedures to start, stop, monitor, and troubleshoot ETL jobs. It covers health checks, common failure scenarios, diagnostic steps, and recovery procedures. Without a runbook, operators rely on tribal knowledge, leading to longer downtime and inconsistent responses.

## When to Use


- For alternatives, see [Data Pipeline Design Document Template](/docs/data-pipeline-design-document-template/).

- Operating production ETL pipelines
- Onboarding on-call engineers
- Incident response for data pipeline failures
- Handover between shifts or teams
- Compliance documentation for operational procedures

## Solution

```markdown
# ETL Job Runbook — `<Job Name>`

## Runbook Overview

| Field | Value |
|-------|-------|
| Job Name | Orders ETL Pipeline |
| Job ID | PL-ORD-001 |
| Owner | Data Platform Team |
| On-Call Rotation | data-platform-oncall |
| Escalation | data-platform-lead |
| Last Updated | 2026-07-05 |
| Schedule | Daily at 02:00 UTC |
| Expected Duration | 45 minutes |
| SLA | 90 minutes |
| Framework | Apache Airflow + dbt |
| Orchestrator | Airflow on Kubernetes |

## 1. Quick Reference

| Action | Command |
|--------|---------|
| Check job status | `airflow dags state orders_etl_pipeline 2026-07-05` |
| View task logs | `airflow tasks logs orders_etl_pipeline extract_orders_api 2026-07-05` |
| Manual trigger | `airflow dags trigger orders_etl_pipeline` |
| Re-run failed task | `airflow tasks run orders_etl_pipeline <task_id> 2026-07-05` |
| Clear and re-run | `airflow tasks clear orders_etl_pipeline -t <task_id> -s 2026-07-05 -e 2026-07-05` |
| Backfill range | `airflow dags backfill orders_etl_pipeline -s 2026-07-01 -e 2026-07-05` |
| Pause DAG | `airflow dags pause orders_etl_pipeline` |
| Unpause DAG | `airflow dags unpause orders_etl_pipeline` |
| Check dbt models | `cd /opt/dbt && dbt list --select fct_orders+` |
| Run dbt tests | `cd /opt/dbt && dbt test --select fct_orders+` |
| Check Redshift load | `SELECT * FROM stv_load_status WHERE table='fct_orders' ORDER BY start_time DESC LIMIT 5;` |

## 2. Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Extract │────▶│  Stage   │────▶│ Transform│────▶│   Load   │
│  (API)   │     │  (S3)    │     │  (dbt)   │     │(Redshift)│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Task Flow

| Task | Description | Typical Duration | Dependencies |
|------|-------------|-----------------|--------------|
| extract_orders_api | Pull orders from source API | 10 min | — |
| stage_orders | Write to S3 staging | 3 min | extract_orders_api |
| run_dbt_transforms | Run dbt models | 15 min | stage_orders |
| quality_checks | Run dbt tests | 5 min | run_dbt_transforms |
| load_redshift | Load to Redshift fact tables | 10 min | quality_checks |
| export_s3 | Export to S3 data lake | 2 min | load_redshift |

## 3. Health Checks

### Daily Health Check (Before Pipeline Run)

| Check | Command | Expected Result | Action if Failed |
|-------|---------|-----------------|------------------|
| Airflow scheduler running | `kubectl get pods -n airflow \| grep scheduler` | Running | Restart scheduler pod |
| Airflow workers available | `kubectl get pods -n airflow \| grep worker` | 2+ Running | Scale worker pool |
| Source API reachable | `curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health` | 200 | Check API status page |
| S3 staging bucket writable | `aws s3 ls s3://example-staging/orders/` | No error | Check AWS credentials |
| Redshift cluster available | `psql -h analytics-cluster -c 'SELECT 1'` | Returns 1 | Check cluster status |
| dbt project deployed | `cd /opt/dbt && dbt compile --select fct_orders` | Success | Redeploy dbt project |
| Previous run completed | `airflow dags state orders_etl_pipeline 2026-07-04` | success | Investigate previous failure |

### Post-Run Health Check

| Check | Command | Expected Result | Action if Failed |
|-------|---------|-----------------|------------------|
| DAG status | `airflow dags state orders_etl_pipeline 2026-07-05` | success | Check failed task logs |
| Row count | `SELECT COUNT(*) FROM marts.fct_orders WHERE DATE(order_date) = '2026-07-05'` | > 100k | Check extraction logs |
| Data freshness | `SELECT MAX(_ingested_at) FROM marts.fct_orders` | < 24h ago | Check pipeline schedule |
| Quality tests passed | `cd /opt/dbt && dbt test --select fct_orders+ --state target/` | 0 failures | Investigate failed tests |
| No duplicates | `SELECT order_id, COUNT(*) FROM marts.fct_orders WHERE DATE(order_date) = '2026-07-05' GROUP BY order_id HAVING COUNT(*) > 1` | 0 rows | Re-run dedup transform |

## 4. Common Failures and Diagnostics

### F1: Source API Authentication Failure

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `HTTP 401 Unauthorized` or `HTTP 403 Forbidden` |
| Task Affected | extract_orders_api |
| Frequency | Rare (token expiry) |

**Symptoms:**
- Airflow task `extract_orders_api` fails with HTTP 401/403
- No data extracted from source API
- Downstream tasks don't start

**Diagnostic Steps:**
1. Check task logs: `airflow tasks logs orders_etl_pipeline extract_orders_api 2026-07-05`
2. Verify OAuth token: `curl -X POST https://api.example.com/oauth/token -d "client_id=xxx&client_secret=xxx&grant_type=client_credentials"`
3. Check token expiry in secrets manager: `aws secretsmanager get-secret-value --secret-id orders-api-oauth`

**Resolution:**
1. If token expired: refresh OAuth credentials in AWS Secrets Manager
2. If credentials revoked: contact source API team for new credentials
3. Update Airflow connection: `airflow connections set orders_api --password <new_token>`
4. Re-run failed task: `airflow tasks run orders_etl_pipeline extract_orders_api 2026-07-05`

**Prevention:**
- Set up automated token refresh 24h before expiry
- Monitor token expiry dashboard

---

### F2: Source API Rate Limit

| Field | Value |
|-------|-------|
| Severity | Medium |
| Error Message | `HTTP 429 Too Many Requests` |
| Task Affected | extract_orders_api |
| Frequency | Occasional (peak traffic) |

**Symptoms:**
- Airflow task retries multiple times
- Logs show HTTP 429 responses
- Task eventually succeeds or fails after max retries

**Diagnostic Steps:**
1. Check task logs for retry pattern
2. Verify rate limit: `curl -I https://api.example.com/v1/orders` (check `X-RateLimit-Remaining` header)
3. Check if other jobs are hitting the same API

**Resolution:**
1. If task failed: wait 5 minutes, then re-run
2. If persistent: reduce page size from 1000 to 500
3. If still failing: contact source API team to increase rate limit

**Prevention:**
- Implement rate limiting in extraction code (token bucket)
- Stagger pipeline schedules to avoid concurrent API calls

---

### F3: dbt Transform Failure

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `Compilation Error` or `Runtime Error` in dbt |
| Task Affected | run_dbt_transforms |
| Frequency | Rare (schema changes) |

**Symptoms:**
- Airflow task `run_dbt_transforms` fails
- dbt logs show SQL compilation or runtime error
- Downstream tasks don't start

**Diagnostic Steps:**
1. Check task logs: `airflow tasks logs orders_etl_pipeline run_dbt_transforms 2026-07-05`
2. Reproduce locally: `cd /opt/dbt && dbt run --select int_orders_dedup --vars '{"date": "2026-07-05"}'`
3. Check source schema: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stg_orders'`
4. Check for schema drift: compare current schema with documented schema

**Resolution:**
1. If column missing: check source extraction, may need to update extraction query
2. If type mismatch: add CAST in dbt model to handle type change
3. If model error: fix dbt model, deploy, and re-run
4. Re-run: `airflow tasks run orders_etl_pipeline run_dbt_transforms 2026-07-05`

**Prevention:**
- Add schema validation checks in staging layer
- Run dbt compile in CI on every PR

---

### F4: Quality Check Failure

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `dbt test failures detected` |
| Task Affected | quality_checks |
| Frequency | Occasional (data anomalies) |

**Symptoms:**
- Airflow task `quality_checks` fails
- dbt test results show one or more test failures
- Load to Redshift is blocked

**Diagnostic Steps:**
1. Check which tests failed: `cd /opt/dbt && dbt test --select fct_orders+ --store-failures`
2. View failed records: `SELECT * FROM audit.test_failure_not_null_fct_orders_order_id`
3. Determine if failure is data issue or rule issue

**Resolution:**
1. If data issue (genuinely bad data): fix at source, re-extract, re-run pipeline
2. If rule issue (rule too strict): update rule severity from error to warning, deploy, re-run
3. If edge case (small number of violations): document, override with `--no-tests` flag, create ticket to investigate
4. Re-run: `airflow tasks run orders_etl_pipeline quality_checks 2026-07-05`

**Prevention:**
- Review quality rules quarterly
- Monitor test failure trends

---

### F5: Redshift Load Failure

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `Connection refused` or `Disk full` or `Load timeout` |
| Task Affected | load_redshift |
| Frequency | Rare |

**Symptoms:**
- Airflow task `load_redshift` fails
- Data not loaded to fact tables
- Export to S3 doesn't run

**Diagnostic Steps:**
1. Check task logs for specific error
2. Check Redshift cluster status: `aws redshift describe-clusters --cluster-identifier analytics-cluster-prod`
3. Check disk usage: `SELECT node, used, capacity FROM stv_node_storage_capacity`
4. Check active queries: `SELECT pid, user_name, query, duration FROM stv_inflight`

**Resolution:**
1. If connection refused: check security group rules, restart cluster if needed
2. If disk full: run vacuum and analyze, or increase cluster size
3. If load timeout: check for long-running queries blocking the load, kill them
4. Re-run: `airflow tasks run orders_etl_pipeline load_redshift 2026-07-05`

**Prevention:**
- Set up disk space alerts at 80% threshold
- Monitor long-running queries

---

### F6: DAG Timeout (SLA Miss)

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `SLA miss on task orders_etl_pipeline` |
| Task Affected | Any |
| Frequency | Occasional (data volume spikes) |

**Symptoms:**
- Airflow SLA miss notification
- Pipeline running longer than 90 minutes
- Tasks still running or queued

**Diagnostic Steps:**
1. Check which task is running long: `airflow tasks list orders_etl_pipeline --state running`
2. Check task duration vs. typical: `airflow tasks duration orders_etl_pipeline --start 2026-07-01 --end 2026-07-05`
3. Check data volume: `SELECT COUNT(*) FROM stg_orders WHERE DATE(_ingested_at) = '2026-07-05'`
4. Check for resource contention: `kubectl top pods -n airflow`

**Resolution:**
1. If data volume spike: wait for completion, increase SLA temporarily
2. If resource contention: scale Airflow workers
3. If task hung: clear task state and re-run
4. If persistent: kill DAG, investigate, manual backfill

**Prevention:**
- Monitor data volume trends
- Set up auto-scaling for Airflow workers

## 5. Recovery Procedures

### Full Pipeline Re-run

```bash
# 1. Clear all task states for the date
airflow tasks clear orders_etl_pipeline -s 2026-07-05 -e 2026-07-05

# 2. Trigger DAG manually
airflow dags trigger orders_etl_pipeline --conf '{"date": "2026-07-05"}'

# 3. Monitor progress
airflow dags state orders_etl_pipeline 2026-07-05
```

### Partial Re-run (from specific task)

```bash
# 1. Clear task and downstream tasks
airflow tasks clear orders_etl_pipeline -t run_dbt_transforms -d -s 2026-07-05 -e 2026-07-05

# 2. Re-run from specific task
airflow tasks run orders_etl_pipeline run_dbt_transforms 2026-07-05

# 3. Monitor
airflow tasks list orders_etl_pipeline --state running
```

### Backfill Procedure

```bash
# 1. Pause the DAG to prevent concurrent runs
airflow dags pause orders_etl_pipeline

# 2. Run backfill for date range
airflow dags backfill orders_etl_pipeline \
  --start-date 2026-07-01 \
  --end-date 2026-07-05 \
  --reset-dagruns \
  --run-backwards

# 3. Monitor backfill progress
airflow dags list-runs -d orders_etl_pipeline --limit 10

# 4. Unpause the DAG
airflow dags unpause orders_etl_pipeline
```

### Emergency Shutdown

```bash
# 1. Pause the DAG
airflow dags pause orders_etl_pipeline

# 2. Mark all running tasks as failed
airflow tasks clear orders_etl_pipeline -s 2026-07-05 -e 2026-07-05 --only-failed

# 3. Check no tasks are running
airflow tasks list orders_etl_pipeline --state running

# 4. Notify team
# Send message to #data-platform Slack channel
```

## 6. Contacts and Escalation

| Role | Name | Primary | Secondary | Escalation |
|------|------|---------|-----------|------------|
| On-Call (Tier 1) | Data Platform Oncall | PagerDuty: data-platform-oncall | Slack: #data-platform | After 15 min → Tier 2 |
| Lead (Tier 2) | Data Platform Lead | Slack: @data-platform-lead | Phone: x1234 | After 30 min → Tier 3 |
| Manager (Tier 3) | Data Engineering Manager | Slack: @data-eng-manager | Phone: x5678 | — |
| Source API Team | API Support | Slack: #api-support | Email: api-support@example.com | — |
| Infrastructure | DevOps Oncall | PagerDuty: devops-oncall | Slack: #devops | — |
| Redshift Admin | DBA Team | Slack: #dba | Email: dba@example.com | — |
```

## Explanation

An ETL job runbook serves the on-call engineer who gets paged at 3 AM when a pipeline fails. It needs to be actionable: specific commands, expected outputs, and step-by-step procedures. The quick reference section puts the most common commands at the top — operators don't read the whole runbook during an incident, they search for the specific command.

The health checks section covers two phases: pre-run (verify the environment is ready) and post-run (verify the pipeline produced correct output). Pre-run checks catch infrastructure issues before the pipeline starts. Post-run checks catch data issues before consumers see them.

The common failures section is the core of the runbook. Each failure has a severity, error message, affected task, symptoms, diagnostic steps, resolution, and prevention. This structure ensures operators can quickly identify the failure they're seeing and follow a tested resolution path.

The recovery procedures cover the three most common operations: full re-run (when everything failed), partial re-run (when one task failed), and backfill (when multiple days need reprocessing). Each procedure has exact commands that can be copy-pasted.

The contacts section ensures operators know who to escalate to and how. The escalation path defines when to move from Tier 1 to Tier 2 to Tier 3, preventing incidents from sitting unresolved.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Streaming pipeline | Replace batch checks with lag monitoring | Kafka consumer lag, checkpoint status |
| Multi-team pipeline | Add cross-team contacts | Source team, transform team, consumer team |
| Cloud-native (AWS) | Use CloudWatch instead of custom monitoring | Step Functions, Glue, EMR |
| On-premise pipeline | Include server and network checks | Cron, systemd, NFS mounts |
| Real-time (sub-minute) | Add latency SLAs | p99 latency, checkpoint age |

## What Works

1. Put quick reference at the top — operators need commands fast
2. Include exact commands — "check the logs" is not actionable
3. Document expected outputs — operators need to know what "correct" looks like
4. Test the runbook — run through it during a game day
5. Include prevention for each failure — reduce future incidents
6. Keep contacts current — stale escalation paths delay response
7. Version the runbook with the pipeline — changes to the pipeline change the runbook

## Common Mistakes

1. No runbook at all — operators rely on tribal knowledge
2. Outdated commands — pipeline changed but runbook didn't
3. No diagnostic steps — "restart the pipeline" without understanding the cause
4. No escalation path — incidents sit unresolved because no one knows who to call
5. Too much background — operators need procedures, not architecture lessons
6. No tested procedures — runbook steps that don't work in practice
7. No failure scenarios — only covers happy path, not what actually goes wrong

## Frequently Asked Questions

### How detailed should the runbook be?

Detailed enough that an on-call engineer who has never seen this pipeline before can resolve a failure by following the runbook. Include exact commands, expected outputs, and decision points. If a step requires judgment ("check if the data looks right"), specify what "right" looks like.

### Should we have one runbook per pipeline or one shared runbook?

One runbook per pipeline. Shared runbooks become too generic to be useful during an incident. If multiple pipelines share common procedures (e.g., Airflow restart), document those in a separate shared operations guide and link to it from each runbook.

### How do we keep the runbook current?

Store it next to the pipeline code. Require a runbook update in every PR that changes the pipeline. Review the runbook during post-incident reviews — if the runbook didn't help, update it. Run game days to test the runbook against real failures.

### What is a game day?

A game day is a practice session where you intentionally cause a failure and have the on-call engineer resolve it using the runbook. This tests both the runbook and the engineer's familiarity with it. Run game days quarterly for critical pipelines.

### How do we measure runbook effectiveness?

Track these metrics: mean time to detection (MTTD), mean time to resolution (MTTR), percentage of incidents resolved using the runbook, and number of runbook updates per quarter. Improving MTTR and increasing runbook-resolved incidents indicate an effective runbook.
