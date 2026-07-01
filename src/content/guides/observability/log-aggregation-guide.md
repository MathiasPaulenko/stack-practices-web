---
contentType: guides
slug: log-aggregation-guide
title: "Log Aggregation — Centralize, Search, and Analyze Logs at Scale"
description: "A practical guide to log aggregation: structured logging, shipping strategies, retention policies, and building searchable log pipelines with ELK, Loki, and cloud-native solutions."
metaDescription: "Learn log aggregation: structured logging, shipping strategies, retention policies, and searchable pipelines with ELK, Loki, and cloud-native solutions."
difficulty: intermediate
topics:
  - observability
  - devops
  - infrastructure
tags:
  - log-aggregation
  - elk
  - loki
  - structured-logging
  - elasticsearch
  - splunk
  - guide
relatedResources:
  - /guides/observability/distributed-tracing-guide
  - /guides/observability/metrics-and-dashboards-guide
  - /guides/observability/alert-management-guide
  - /guides/devops/observability-guide
  - /guides/devops/opentelemetry-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn log aggregation: structured logging, shipping strategies, retention policies, and searchable pipelines with ELK, Loki, and cloud-native solutions."
  keywords:
    - log-aggregation
    - elk
    - loki
    - structured-logging
    - elasticsearch
    - splunk
    - guide
---

## Overview

Log aggregation collects logs from all services, systems, and infrastructure into a centralized, searchable platform. It transforms scattered text files into a queryable observability signal, enabling fast debugging, security auditing, and operational visibility across distributed systems.

This guide covers structured logging, shipping strategies, storage optimization, and platform selection.

## When to Use

- You operate more than 5 services and need to correlate logs across them
- Debugging requires grepping through multiple servers or containers
- You need log-based alerting for errors and anomalies
- Security or compliance requires centralized audit logs
- Your current logging is ad-hoc and inconsistent across teams

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Structured Logging** | Outputting logs as JSON or key-value pairs instead of free text |
| **Log Shipper** | Agent that reads local logs and forwards them to a central store |
| **Index** | Searchable storage partition organized by time or source |
| **Retention Policy** | Rules that determine how long logs are kept before deletion |
| **Log Parsing** | Extracting fields from raw log lines at ingest or query time |
| **Hot/Warm/Cold Storage** | Tiered storage based on access frequency and age |

## Log Aggregation Architectures

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│  App 1   │   │  App 2   │   │  App N   │
│ (stdout) │   │ (stdout) │   │ (stdout) │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
           ┌────────▼────────┐
           │  Log Shipper    │  (Filebeat, Fluent Bit, Vector)
           │  (Parse + Enrich)│
           └────────┬────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
   ┌─────▼─────┐        ┌─────▼─────┐
   │  Indexer  │        │  Object   │
   │(Elasticsearch│      │  Storage  │
   │   Loki)    │        │  (S3/GCS) │
   └─────┬─────┘        └───────────┘
         │
   ┌─────▼─────┐
   │ Dashboard │
   │(Kibana/Grafana)
   └───────────┘
```

## Step-by-Step Log Aggregation Setup

### 1. Adopt Structured Logging

Make logs machine-parseable from the source:

```python
# Example: Python structured logging with structlog
import structlog
import logging
import sys

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Structured log output
logger.info(
    "payment_processed",
    payment_id="pay-123",
    amount=99.99,
    currency="USD",
    user_id="user-456",
    duration_ms=145
)
# Output: {"event": "payment_processed", "payment_id": "pay-123", "amount": 99.99, ...}
```

```javascript
// Example: Node.js structured logging with pino
const pino = require('pino');
const logger = pino({ level: 'info' });

logger.info({
  msg: 'payment_processed',
  paymentId: 'pay-123',
  amount: 99.99,
  currency: 'USD',
  userId: 'user-456',
  durationMs: 145
});
```

**What works for structured logging:**
- Always log as JSON in production
- Use consistent field names (snake_case recommended)
- Include trace_id, span_id, and request_id in every log
- Add contextual fields (user_id, tenant_id, request_path) at request start
- Never log PII or secrets

### 2. Ship Logs to Central Store

Choose and configure a log shipper:

| Shipper | Best For | Pros | Cons |
|---------|----------|------|------|
| **Filebeat** | ELK stack | Mature, rich modules | Resource heavy |
| **Fluent Bit** | Kubernetes, embedded | Lightweight, fast | Less mature than Fluentd |
| **Vector** | High throughput | Rust-based, performant | Smaller ecosystem |
| **Promtail** | Loki | Native Loki integration | Loki-only |

```yaml
# Example: Fluent Bit configuration for Kubernetes
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/log/flb_kube.db

    [FILTER]
        Name              kubernetes
        Match             kube.*
        Merge_Log         On
        Keep_Log          Off

    [OUTPUT]
        Name              loki
        Match             kube.*
        Host              loki.monitoring.svc
        Labels            job=fluentbit
```

```yaml
# Example: Filebeat configuration for Elasticsearch
filebeat.inputs:
  - type: log
    paths:
      - /var/log/myapp/*.log
    fields:
      service: myapp
      environment: production
    fields_under_root: true
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  index: "myapp-logs-%{+yyyy.MM.dd}"
```

**What works for shipping:**
- Use backpressure-aware shippers that won't crash the host
- Add metadata (host, service, environment) at the shipper level
- Buffer locally to survive temporary network outages
- Use TLS for all log transport

### 3. Design Retention and Storage

Balance cost with queryability:

| Storage Tier | Retention | Query Speed | Cost |
|--------------|-----------|-------------|------|
| **Hot** | 1-7 days | Instant | High |
| **Warm** | 7-30 days | Seconds | Medium |
| **Cold** (S3/GCS) | 30-365 days | Minutes | Low |
| **Archive** | 1-7 years | Batch only | Very low |

```yaml
# Example: Elasticsearch ILM (Index Lifecycle Management) policy
PUT _ilm/policy/logs_policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {},
          "allocate": { "require": { "data": "cold" } }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

**Retention rules:**
- Error logs: Keep longer (90+ days) than access logs (30 days)
- Security/audit logs: Keep 1-7 years based on compliance requirements
- Debug logs: Keep only in hot storage (1-3 days)
- Archive to object storage before deletion for compliance

### 4. Query and Analyze Logs

Make your aggregated logs useful:

```kibana
# Example: KQL (Kibana Query Language)

# Find errors in a specific service
service.name:orders-service and level:error

# Find slow requests (>1s)
duration_ms > 1000

# Find requests for a specific user
user_id:user-123

# Count errors by service
service.name:* and level:error | stats count() by service.name

# Find exceptions in time range
@timestamp:[now-1h TO now] and exception.class:*
```

```logql
# Example: LogQL (Grafana Loki)

# Search for errors in a service
{job="orders-service"} |= "ERROR"

# Count errors per minute
sum(rate({job="orders-service"} |= "ERROR" [1m]))

# Find slow database queries
{job="orders-service"} |= "duration_ms" | json | duration_ms > 500

# Extract and graph payment amounts
{job="payment-service"} |= "payment_processed" | json | line_format "{{.amount}}"
```

**What works for querying:**
- Learn the query language of your chosen platform (KQL, LogQL, SPL)
- Save common queries as dashboards or alerts
- Use log-based metrics for dashboards (faster than raw log queries)
- Correlate logs with traces using trace_id fields

### 5. Build Log-Based Alerts

Detect issues from log patterns:

```yaml
# Example: Grafana alert rule for error rate
apiVersion: 1
groups:
  - name: log_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({job=~".*"} |= "ERROR" [5m])) by (job)
          /
          sum(rate({job=~".*"} [5m])) by (job)
          > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: SlowPayments
        expr: |
          avg_over_time(
            {job="payment-service"} |= "payment_processed" | json | duration_ms [10m]
          ) > 500
        labels:
          severity: warning
```

**Alert patterns:**
- Error rate spike: `% of error logs / total logs > threshold`
- New error pattern: `Count of unique exception types increased`
- Missing logs: `Log volume dropped below expected baseline`
- Security event: `Pattern matching known attack signatures`

## What Works

- **Standardize log levels.** Use ERROR, WARN, INFO, DEBUG consistently across all services.
- **Include correlation IDs.** Every log must have trace_id, span_id, or request_id for cross-service debugging.
- **Avoid logging in tight loops.** Batch or skip loop logs to prevent log flooding.
- **Sample high-volume logs.** Not every request needs full debug logging.
- **Monitor the pipeline.** Alert if log shipping falls behind or storage fills up.
- **Document your schema.** Teams need to know which fields are available for queries.

## Common Mistakes

- **Unstructured logs everywhere.** Parsing text logs at ingest time is fragile and slow.
- **No retention strategy.** Storage costs grow exponentially without lifecycle policies.
- **Over-logging.** Debug-level logs in production overwhelm the pipeline and hide real issues.
- **Missing context.** Logs without service name, environment, or trace IDs are nearly useless.
- **Ignoring backpressure.** Log shippers that crash under load create blind spots.

## Variants

- **Cloud-native:** AWS CloudWatch Logs, Google Cloud Logging, Azure Monitor Logs (managed, but vendor-specific)
- **Open-source stack:** ELK (Elasticsearch, Logstash, Kibana) or PLG (Promtail, Loki, Grafana)
- **Enterprise:** Splunk, Datadog, Sumo Logic (rich capabilities, higher cost)
- **Edge aggregation:** Local log aggregation before central shipping (reduces network cost)

## FAQ

**Q: Should I use ELK or Loki?**
ELK is more mature and capable. Loki is simpler, cheaper at scale, and integrates natively with Grafana. Choose ELK for complex search; Loki for cost-efficient observability.

**Q: How do I handle multi-line logs (stack traces)?**
Use log shippers with multiline parsing (Filebeat `multiline.pattern`, Fluent Bit `multiline.parser`) or log directly as JSON with the stack trace as a single field.

**Q: How much does log aggregation cost?**
At high scale, log storage is often your largest observability cost. Use sampling, aggressive retention policies, and tiered storage to control costs.

**Q: Can I use logs for metrics?**
Yes — most platforms support log-based metrics (counting log lines over time, extracting numeric fields). This avoids dual-instrumentation but is less efficient than dedicated metrics.

## Conclusion

Log aggregation transforms scattered application output into a unified debugging and auditing platform. By adopting structured logging, choosing the right shipping strategy, and designing smart retention policies, you build an observability foundation that scales with your infrastructure.
