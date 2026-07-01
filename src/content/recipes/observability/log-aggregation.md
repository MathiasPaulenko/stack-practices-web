---
contentType: recipes
slug: log-aggregation
title: "Log Aggregation"
description: "Centralize logs from distributed services with ELK, Fluentd, and Loki for search, alerting, and troubleshooting in production."
metaDescription: "Log aggregation for distributed systems: ELK stack, Fluentd, Grafana Loki, log shipping, parsing, and centralized troubleshooting at scale."
difficulty: intermediate
topics:
  - observability
tags:
  - log-aggregation
  - observability
  - devops
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/structured-logging
  - /recipes/distributed-tracing
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Log aggregation for distributed systems: ELK stack, Fluentd, Grafana Loki, log shipping, parsing, and centralized troubleshooting at scale."
  keywords:
    - log-aggregation
    - observability
    - elk
    - devops
---
## Overview

Log aggregation centralizes logs from dozens or hundreds of services into a single searchable system. Instead of SSHing into individual servers, teams query a unified index to trace requests across [microservices](/guides/architecture/microservices-architecture-guide), investigate errors, and detect anomalies. Tools like the ELK stack, Fluentd, and Grafana Loki have made centralized logging accessible to any team size.

## When to Use

Use this resource when:
- Debugging requires correlating logs from 5+ services for a single user request
- Compliance mandates log retention and tamper-proof storage
- You need real-time [alerting](/recipes/devops/prometheus-monitoring-alerts) based on log patterns (error spikes, security events)
- Log volumes exceed local storage capacity on individual hosts

## Solution

### Fluentd to Elasticsearch (Docker Compose)

```yaml
version: '3'
services:
  fluentd:
    image: fluent/fluentd:v1.16
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
    ports:
      - "24224:24224"

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
```

```
# fluent.conf
<source>
  @type forward
  port 24224
</source>

<filter app.**>
  @type parser
  format json
  key_name log
</filter>

<match app.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix app
</match>
```

### Structured Logging with Correlation IDs (Node.js)

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

function logWithContext(req, message, meta = {}) {
  logger.info(message, {
    traceId: req.headers['x-trace-id'],
    userId: req.user?.id,
    service: 'order-service',
    ...meta
  });
}

// Usage
logWithContext(req, 'Order placed', { orderId: '123', amount: 99.99 });
```

### Loki Query (LogQL)

```bash
# Find all error logs for a specific trace
{service="payment-service"} 
  |="error" 
  | json 
  | traceId="abc123"

# Rate of 500 errors per service
sum by (service) (
  rate(
    {level="error", status_code="500"}[5m]
  )
)
```

## Explanation

**Log pipeline stages**:
1. **Collection**: Fluent Bit, Promtail, or Filebeat read local log files
2. **Parsing**: Extract structured fields from raw text (JSON, regex, grok)
3. **Enrichment**: Add metadata — Kubernetes pod labels, AWS instance IDs, trace IDs
4. **Buffering**: Kafka or Redis absorb spikes before indexing
5. **Storage**: Elasticsearch, Loki, or CloudWatch Logs index for search
6. **Query**: Kibana, Grafana, or custom UIs for exploration

**Structured vs. unstructured logs**:

| Type | Searchable? | Size | Example |
|------|-------------|------|---------|
| Unstructured | Regex only | Large | `ERROR: user login failed` |
| Structured | Field filters | Compact | `{"level":"error","event":"login_failed"}` |

## Variants

| Stack | Components | Best For |
|-------|------------|----------|
| ELK | Elasticsearch, Logstash, Kibana | Full-text search; complex analytics |
| EFK | Elasticsearch, Fluentd/Bit, Kibana | Kubernetes-native; lightweight agents |
| PLG | Promtail, Loki, Grafana | Cost-efficient; label-based indexing |
| Splunk | Universal Forwarder, Indexer | Enterprise; pre-built dashboards |
| CloudWatch | AWS Agent | AWS-native; IAM integration |

## What Works

- **Include correlation IDs**: Every log entry should have a `traceId` linking the full request journey. See [distributed tracing](/recipes/observability/distributed-tracing).
- **Log at the right level**: DEBUG for development; INFO for normal operations; ERROR for useful issues
- **Don't log secrets**: Mask PII, tokens, and passwords before they reach the aggregation system
- **Set retention policies**: 30 days hot storage for troubleshooting; 1 year cold archive for compliance. Use a [data retention policy template](/guides/databases/database-design-guide).
- **Alert on patterns, not single lines**: "5 ERRORs in 1 minute" is more useful than one log line

## Common Mistakes

1. **Logging everything at INFO**: Creates noise that hides real issues; use DEBUG appropriately
2. **No timezone standardization**: Mixed UTC and local times make correlation impossible
3. **Missing request context**: `ERROR: database connection failed` without which service or user is useless
4. **Ignoring backpressure**: Log agents that can't keep up drop logs silently during traffic spikes
5. **Storing logs in the same database as application data**: Competes for resources; keeps analysts out of production

## Frequently Asked Questions

**Q: How do I handle high log volume costs?**
A: Sample DEBUG logs, aggregate metrics at the edge, and use cheaper storage tiers (S3, GCS) for old logs.

**Q: Should I aggregate metrics or logs?**
A: Both. [Metrics](/recipes/observability/metrics-collection) for dashboards and alerts. Logs for debugging and audit trails. Don't alert on logs alone.

**Q: How do I secure aggregated logs?**
A: Role-based access, encrypted transport (TLS), and encrypted storage (AES-256). Treat logs as sensitive data. See [what works for security](/guides/security/security-best-practices-guide).
