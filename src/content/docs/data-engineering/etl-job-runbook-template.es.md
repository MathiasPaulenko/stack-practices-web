---


contentType: docs
slug: etl-job-runbook-template
title: "Plantilla de Runbook para Jobs ETL"
description: "Un runbook para operar, monitorear y troubleshootear jobs ETL: startup, shutdown, health checks, common failures, diagnostics y recovery."
metaDescription: "Usá esta plantilla de runbook ETL para documentar startup, shutdown, health checks, common failures, diagnostics y recovery procedures."
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
  metaDescription: "Usá esta plantilla de runbook ETL para documentar startup, shutdown, health checks, common failures, diagnostics y recovery procedures."
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

Un ETL job runbook le da a operators los procedures para start, stop, monitorear y troubleshootear ETL jobs. Coverea health checks, common failure scenarios, diagnostic steps y recovery procedures. Sin un runbook, operators rely en tribal knowledge, leading a longer downtime y inconsistent responses.

## When to Use


- For alternatives, see [Data Pipeline Design Document Template](/es/docs/data-pipeline-design-document-template/).

- Operando production ETL pipelines
- Onboardéando on-call engineers
- Incident response para data pipeline failures
- Handover entre shifts o teams
- Compliance documentation para operational procedures

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
| Clear y re-run | `airflow tasks clear orders_etl_pipeline -t <task_id> -s 2026-07-05 -e 2026-07-05` |
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
| extract_orders_api | Pulleá orders desde source API | 10 min | — |
| stage_orders | Escribí a S3 staging | 3 min | extract_orders_api |
| run_dbt_transforms | Corré dbt models | 15 min | stage_orders |
| quality_checks | Corré dbt tests | 5 min | run_dbt_transforms |
| load_redshift | Loadé a Redshift fact tables | 10 min | quality_checks |
| export_s3 | Exportá a S3 data lake | 2 min | load_redshift |

## 3. Health Checks

### Daily Health Check (Antes de Pipeline Run)

| Check | Command | Expected Result | Action if Failed |
|-------|---------|-----------------|------------------|
| Airflow scheduler running | `kubectl get pods -n airflow \| grep scheduler` | Running | Restarteá scheduler pod |
| Airflow workers available | `kubectl get pods -n airflow \| grep worker` | 2+ Running | Scalleá worker pool |
| Source API reachable | `curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health` | 200 | Checkeá API status page |
| S3 staging bucket writable | `aws s3 ls s3://example-staging/orders/` | No error | Checkeá AWS credentials |
| Redshift cluster available | `psql -h analytics-cluster -c 'SELECT 1'` | Returns 1 | Checkeá cluster status |
| dbt project deployed | `cd /opt/dbt && dbt compile --select fct_orders` | Success | Redeployeá dbt project |
| Previous run completed | `airflow dags state orders_etl_pipeline 2026-07-04` | success | Investigá previous failure |

### Post-Run Health Check

| Check | Command | Expected Result | Action if Failed |
|-------|---------|-----------------|------------------|
| DAG status | `airflow dags state orders_etl_pipeline 2026-07-05` | success | Checkeá failed task logs |
| Row count | `SELECT COUNT(*) FROM marts.fct_orders WHERE DATE(order_date) = '2026-07-05'` | > 100k | Checkeá extraction logs |
| Data freshness | `SELECT MAX(_ingested_at) FROM marts.fct_orders` | < 24h ago | Checkeá pipeline schedule |
| Quality tests passed | `cd /opt/dbt && dbt test --select fct_orders+ --state target/` | 0 failures | Investigá failed tests |
| No duplicates | `SELECT order_id, COUNT(*) FROM marts.fct_orders WHERE DATE(order_date) = '2026-07-05' GROUP BY order_id HAVING COUNT(*) > 1` | 0 rows | Re-run dedup transform |

## 4. Common Failures and Diagnostics

### F1: Source API Authentication Failure

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `HTTP 401 Unauthorized` o `HTTP 403 Forbidden` |
| Task Affected | extract_orders_api |
| Frequency | Rare (token expiry) |

**Symptoms:**
- Airflow task `extract_orders_api` faila con HTTP 401/403
- No data extracted desde source API
- Downstream tasks no start

**Diagnostic Steps:**
1. Checkeá task logs: `airflow tasks logs orders_etl_pipeline extract_orders_api 2026-07-05`
2. Verify OAuth token: `curl -X POST https://api.example.com/oauth/token -d "client_id=xxx&client_secret=xxx&grant_type=client_credentials"`
3. Checkeá token expiry en secrets manager: `aws secretsmanager get-secret-value --secret-id orders-api-oauth`

**Resolution:**
1. Si token expired: refreshéá OAuth credentials en AWS Secrets Manager
2. Si credentials revoked: contactá source API team para new credentials
3. Updateá Airflow connection: `airflow connections set orders_api --password <new_token>`
4. Re-run failed task: `airflow tasks run orders_etl_pipeline extract_orders_api 2026-07-05`

**Prevention:**
- Seteá up automated token refresh 24h antes de expiry
- Monitoreá token expiry dashboard

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
- Logs muestran HTTP 429 responses
- Task eventually succeeds o faila después de max retries

**Diagnostic Steps:**
1. Checkeá task logs para retry pattern
2. Verify rate limit: `curl -I https://api.example.com/v1/orders` (checkeá `X-RateLimit-Remaining` header)
3. Checkeá si otros jobs están hitteando el same API

**Resolution:**
1. Si task failed: esperá 5 minutes, luego re-run
2. Si persistent: reducí page size de 1000 a 500
3. Si still failing: contactá source API team para increase rate limit

**Prevention:**
- Implementá rate limiting en extraction code (token bucket)
- Staggeré pipeline schedules para avoid concurrent API calls

---

### F3: dbt Transform Failure

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `Compilation Error` o `Runtime Error` en dbt |
| Task Affected | run_dbt_transforms |
| Frequency | Rare (schema changes) |

**Symptoms:**
- Airflow task `run_dbt_transforms` faila
- dbt logs muestran SQL compilation o runtime error
- Downstream tasks no start

**Diagnostic Steps:**
1. Checkeá task logs: `airflow tasks logs orders_etl_pipeline run_dbt_transforms 2026-07-05`
2. Reproducí localmente: `cd /opt/dbt && dbt run --select int_orders_dedup --vars '{"date": "2026-07-05"}'`
3. Checkeá source schema: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stg_orders'`
4. Checkeá por schema drift: compará current schema con documented schema

**Resolution:**
1. Si column missing: checkeá source extraction, puede necesitar update extraction query
2. Si type mismatch: addeá CAST en dbt model para handle type change
3. Si model error: fixeá dbt model, deployá y re-run
4. Re-run: `airflow tasks run orders_etl_pipeline run_dbt_transforms 2026-07-05`

**Prevention:**
- Addeá schema validation checks en staging layer
- Corré dbt compile en CI en every PR

---

### F4: Quality Check Failure

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `dbt test failures detected` |
| Task Affected | quality_checks |
| Frequency | Occasional (data anomalies) |

**Symptoms:**
- Airflow task `quality_checks` faila
- dbt test results muestran one o more test failures
- Load a Redshift está blocked

**Diagnostic Steps:**
1. Checkeá qué tests failed: `cd /opt/dbt && dbt test --select fct_orders+ --store-failures`
2. Viewé failed records: `SELECT * FROM audit.test_failure_not_null_fct_orders_order_id`
3. Determiná si failure es data issue o rule issue

**Resolution:**
1. Si data issue (genuinely bad data): fixeá en source, re-extract, re-run pipeline
2. Si rule issue (rule too strict): updateá rule severity de error a warning, deployá, re-run
3. Si edge case (small number de violations): documentá, override con `--no-tests` flag, creá ticket para investigate
4. Re-run: `airflow tasks run orders_etl_pipeline quality_checks 2026-07-05`

**Prevention:**
- Revieweá quality rules quarterly
- Monitoreá test failure trends

---

### F5: Redshift Load Failure

| Field | Value |
|-------|-------|
| Severity | High |
| Error Message | `Connection refused` o `Disk full` o `Load timeout` |
| Task Affected | load_redshift |
| Frequency | Rare |

**Symptoms:**
- Airflow task `load_redshift` faila
- Data no loaded a fact tables
- Export a S3 no corre

**Diagnostic Steps:**
1. Checkeá task logs para specific error
2. Checkeá Redshift cluster status: `aws redshift describe-clusters --cluster-identifier analytics-cluster-prod`
3. Checkeá disk usage: `SELECT node, used, capacity FROM stv_node_storage_capacity`
4. Checkeá active queries: `SELECT pid, user_name, query, duration FROM stv_inflight`

**Resolution:**
1. Si connection refused: checkeá security group rules, restarteá cluster si needed
2. Si disk full: corré vacuum y analyze, o increase cluster size
3. Si load timeout: checkeá por long-running queries blocking el load, killealos
4. Re-run: `airflow tasks run orders_etl_pipeline load_redshift 2026-07-05`

**Prevention:**
- Seteá up disk space alerts a 80% threshold
- Monitoreá long-running queries

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
- Pipeline corriendo longer que 90 minutes
- Tasks still running o queued

**Diagnostic Steps:**
1. Checkeá qué task está running long: `airflow tasks list orders_etl_pipeline --state running`
2. Checkeá task duration vs. typical: `airflow tasks duration orders_etl_pipeline --start 2026-07-01 --end 2026-07-05`
3. Checkeá data volume: `SELECT COUNT(*) FROM stg_orders WHERE DATE(_ingested_at) = '2026-07-05'`
4. Checkeá por resource contention: `kubectl top pods -n airflow`

**Resolution:**
1. Si data volume spike: esperá completion, increase SLA temporarily
2. Si resource contention: scalleá Airflow workers
3. Si task hung: cleareá task state y re-run
4. Si persistent: kill DAG, investigá, manual backfill

**Prevention:**
- Monitoreá data volume trends
- Seteá up auto-scaling para Airflow workers

## 5. Recovery Procedures

### Full Pipeline Re-run

```bash
# 1. Cleareá all task states para el date
airflow tasks clear orders_etl_pipeline -s 2026-07-05 -e 2026-07-05

# 2. Trigger DAG manually
airflow dags trigger orders_etl_pipeline --conf '{"date": "2026-07-05"}'

# 3. Monitoreá progress
airflow dags state orders_etl_pipeline 2026-07-05
```

### Partial Re-run (desde specific task)

```bash
# 1. Cleareá task y downstream tasks
airflow tasks clear orders_etl_pipeline -t run_dbt_transforms -d -s 2026-07-05 -e 2026-07-05

# 2. Re-run desde specific task
airflow tasks run orders_etl_pipeline run_dbt_transforms 2026-07-05

# 3. Monitoreá
airflow tasks list orders_etl_pipeline --state running
```

### Backfill Procedure

```bash
# 1. Pausá el DAG para prevenir concurrent runs
airflow dags pause orders_etl_pipeline

# 2. Corré backfill para date range
airflow dags backfill orders_etl_pipeline \
  --start-date 2026-07-01 \
  --end-date 2026-07-05 \
  --reset-dagruns \
  --run-backwards

# 3. Monitoreá backfill progress
airflow dags list-runs -d orders_etl_pipeline --limit 10

# 4. Unpauseá el DAG
airflow dags unpause orders_etl_pipeline
```

### Emergency Shutdown

```bash
# 1. Pausá el DAG
airflow dags pause orders_etl_pipeline

# 2. Markeá all running tasks como failed
airflow tasks clear orders_etl_pipeline -s 2026-07-05 -e 2026-07-05 --only-failed

# 3. Checkeá que no tasks estén running
airflow tasks list orders_etl_pipeline --state running

# 4. Notificá team
# Enviá message a #data-platform Slack channel
```

## 6. Contacts and Escalation

| Role | Name | Primary | Secondary | Escalation |
|------|------|---------|-----------|------------|
| On-Call (Tier 1) | Data Platform Oncall | PagerDuty: data-platform-oncall | Slack: #data-platform | Después de 15 min → Tier 2 |
| Lead (Tier 2) | Data Platform Lead | Slack: @data-platform-lead | Phone: x1234 | Después de 30 min → Tier 3 |
| Manager (Tier 3) | Data Engineering Manager | Slack: @data-eng-manager | Phone: x5678 | — |
| Source API Team | API Support | Slack: #api-support | Email: api-support@example.com | — |
| Infrastructure | DevOps Oncall | PagerDuty: devops-oncall | Slack: #devops | — |
| Redshift Admin | DBA Team | Slack: #dba | Email: dba@example.com | — |
```

## Explanation

Un ETL job runbook sirve al on-call engineer que se pagea a las 3 AM cuando un pipeline faila. Necesita ser actionable: specific commands, expected outputs y step-by-step procedures. La quick reference section pone los most common commands en el top — operators no leen el whole runbook durante un incident, buscan el specific command.

La health checks section coverea two phases: pre-run (verify que el environment está ready) y post-run (verify que el pipeline produjo correct output). Pre-run checks catchean infrastructure issues antes de que el pipeline start. Post-run checks catchean data issues antes de que consumers los vean.

La common failures section es el core del runbook. Cada failure tiene un severity, error message, affected task, symptoms, diagnostic steps, resolution y prevention. Esta structure ensure que operators pueden quickly identify el failure que están viendo y seguir un tested resolution path.

Los recovery procedures coverean los three most common operations: full re-run (cuando everything failed), partial re-run (cuando un task failed) y backfill (cuando multiple days necesitan reprocessing). Cada procedure tiene exact commands que pueden copy-pasteear.

La contacts section ensure que operators saben a quién escalar y cómo. El escalation path define cuándo mover de Tier 1 a Tier 2 a Tier 3, previniendo que incidents se sient unresolved.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Streaming pipeline | Reemplazá batch checks con lag monitoring | Kafka consumer lag, checkpoint status |
| Multi-team pipeline | Addeá cross-team contacts | Source team, transform team, consumer team |
| Cloud-native (AWS) | Usá CloudWatch en vez de custom monitoring | Step Functions, Glue, EMR |
| On-premise pipeline | Incluí server y network checks | Cron, systemd, NFS mounts |
| Real-time (sub-minute) | Addeá latency SLAs | p99 latency, checkpoint age |

## What Works

1. Poné quick reference en el top — operators necesitan commands fast
2. Incluí exact commands — "checkeá los logs" no es actionable
3. Documentá expected outputs — operators necesitan saber qué "correct" se ve
4. Testeá el runbook — corrélo durante un game day
5. Incluí prevention para cada failure — reducí future incidents
6. Mantené contacts current — stale escalation paths delayean response
7. Versioneá el runbook con el pipeline — changes al pipeline cambian el runbook

## Common Mistakes

1. No runbook at all — operators rely en tribal knowledge
2. Outdated commands — pipeline cambió pero runbook no
3. No diagnostic steps — "restarteá el pipeline" sin entender el cause
4. No escalation path — incidents se sient unresolved porque nadie sabe a quién llamar
5. Too much background — operators necesitan procedures, no architecture lessons
6. No tested procedures — runbook steps que no funcionan en practice
7. No failure scenarios — solo coverea happy path, no lo que actually va mal

## Frequently Asked Questions

### ¿Qué tan detailed debería ser el runbook?

Detailed enough que un on-call engineer que nunca vio este pipeline pueda resolver un failure siguiendo el runbook. Incluí exact commands, expected outputs y decision points. Si un step require judgment ("checkeá si el data se ve bien"), specificá qué "bien" se ve.

### ¿Deberíamos tener un runbook per pipeline o un shared runbook?

Un runbook per pipeline. Shared runbooks se vuelven too generic para ser useful durante un incident. Si multiple pipelines share common procedures (e.g., Airflow restart), documentalos en un separate shared operations guide y linkeá desde cada runbook.

### ¿Cómo mantenemos el runbook current?

Storealo next al pipeline code. Requerí un runbook update en every PR que cambia el pipeline. Revieweá el runbook durante post-incident reviews — si el runbook no helpó, updatealo. Corré game days para testear el runbook contra real failures.

### ¿Qué es un game day?

Un game day es un practice session dónde intencionalmente causás un failure y hacés que el on-call engineer lo resuelva usando el runbook. Esto testea tanto el runbook como el engineer's familiarity con él. Corré game days quarterly para critical pipelines.

### ¿Cómo medimos runbook effectiveness?

Trackeá estos metrics: mean time to detection (MTTD), mean time to resolution (MTTR), percentage de incidents resolved usando el runbook y number de runbook updates per quarter. Mejorar MTTR y increasing runbook-resolved incidents indican un effective runbook.
