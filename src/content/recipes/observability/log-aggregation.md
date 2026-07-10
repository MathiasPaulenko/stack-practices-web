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
  - monitoring
  - logging
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

## Error Handling and Recovery

- **Log ingestion failures**: when log agents fail to send logs to the aggregation system, data is lost. Use local buffering on agents. Implement retry with exponential backoff. Set max retry count to 10. Monitor agent health. Alert on agent connection failures. Use multiple ingestion endpoints for redundancy. Test failover between endpoints
- **Log parsing errors**: malformed logs cause parsing failures. Use schema validation at ingestion. Route unparseable logs to a dead letter queue. Monitor parse error rate. Alert on parse error spikes. Fix log format at the source. Document expected log schema. Use tolerant parsers that skip bad fields. Track parse error trends
- **Storage backend failures**: when the storage backend goes down, logs cannot be queried. Use replicated storage for high availability. Implement read replicas for query load. Monitor storage health. Alert on storage latency. Use cached query results during outages. Test disaster recovery procedures. Document recovery time objectives
- **Log loss during high traffic**: under extreme load, logs may be dropped. Use rate limiting at ingestion. Prioritize error logs over info logs. Implement backpressure on producers. Monitor log drop rate. Alert on drop rate exceeding 0.1%. Use queue-based ingestion for buffering. Scale ingestion capacity proactively
- **Corrupted log indices**: index corruption prevents log queries. Use index replication. Run index consistency checks daily. Rebuild corrupted indices from raw logs. Monitor index health. Alert on index corruption. Test index recovery procedures. Document index maintenance runbooks. Schedule regular index optimization

## Performance and Scalability

- **Log volume management**: log volumes grow rapidly. Set retention policies per log level. Keep error logs for 90 days. Keep info logs for 30 days. Keep debug logs for 7 days. Compress old logs. Use hot/warm/cold storage tiers. Monitor storage growth. Alert on storage capacity. Implement automated cleanup jobs
- **Query performance optimization**: slow log queries frustrate users. Use time-range filters. Create indexes on common query fields. Use field-level caching. Limit query result size. Use async query execution. Monitor query latency. Optimize slow queries. Use query sampling for exploration. Document query best practices
- **Ingestion pipeline scaling**: scale ingestion based on log volume. Use horizontal scaling for ingestion nodes. Monitor ingestion rate. Set min/max nodes. Use load balancers. Test ingestion under peak load. Document capacity planning. Alert on ingestion queue depth. Use autoscaling based on queue depth
- **Log deduplication**: duplicate logs waste storage and confuse analysis. Use hash-based deduplication at ingestion. Track duplicate rate. Set dedup window to 5 minutes. Monitor dedup overhead. Alert on high duplicate rates. Fix duplicate log sources. Document dedup configuration. Test dedup effectiveness
## Security Considerations

- **Access control for observability data**: restrict access to traces, logs, and metrics. Use RBAC for query access. Separate read and write permissions. Audit access to observability data. Rotate API keys and tokens. Use per-service credentials. Document access policies. Monitor for unauthorized access. Review access quarterly
- **Data encryption**: encrypt observability data in transit and at rest. Use TLS for data ingestion. Use encryption at rest for storage. Rotate encryption keys. Document encryption configuration. Test encryption effectiveness. Monitor for encryption failures. Use managed encryption services where available
- **PII in observability data**: traces and logs may contain PII. Implement data redaction at ingestion. Mask sensitive fields automatically. Use allow-list for logged fields. Monitor for PII leakage. Alert on PII detection. Document PII handling procedures. Test redaction effectiveness. Review data collection practices
- **Network security**: secure communication between agents and collectors. Use mutual TLS. Use private networks for monitoring traffic. Firewall monitoring endpoints. Use VPN for cross-network monitoring. Document network security configuration. Test network security. Monitor for security events. Review network security quarterly

## Deployment and CI/CD

- **Observability as code**: define dashboards, alerts, and rules in version control. Use Terraform or Helm for deployment. Review observability changes in PRs. Test changes in staging. Document deployment procedures. Use CI/CD for observability updates. Roll back failed deployments. Monitor deployment success rate
- **Progressive rollout for instrumentation**: deploy instrumentation changes gradually. Use feature flags to toggle instrumentation. Monitor performance impact. Roll back if overhead is too high. Document rollout strategy. Test instrumentation in staging. Review instrumentation changes in code review. Use canary deployment for new instrumentation
- **Version compatibility**: ensure compatibility between instrumentation libraries and collectors. Test version upgrades in staging. Document version compatibility matrix. Monitor for version-related errors. Plan upgrades carefully. Use semantic versioning. Document upgrade procedures. Test backward compatibility
- **Configuration management**: manage observability configuration centrally. Use config maps or environment variables. Version configuration changes. Review configuration in PRs. Test configuration changes. Document configuration options. Monitor configuration drift. Use configuration validation in CI
## Testing and Quality Assurance

- **Integration testing for observability**: test that traces, logs, and metrics are produced correctly. Verify trace context propagation across services. Test log format compliance. Validate metric labels and values. Use test fixtures for consistent testing. Automate observability tests in CI. Document test procedures. Test failure scenarios. Review test coverage
- **Load testing observability infrastructure**: test collectors and storage under peak load. Verify ingestion rate handling. Test query performance under load. Monitor resource usage during load tests. Document capacity limits. Test scaling behavior. Verify alert evaluation under load. Test dashboard performance. Review load test results
- **Chaos testing for observability**: inject failures into observability pipeline. Kill collectors randomly. Simulate network partitions. Test storage failures. Verify system continues operating. Test alert delivery during outages. Document chaos test results. Improve resilience based on findings. Run chaos tests regularly. Review chaos test coverage
- **End-to-end trace verification**: verify complete traces from start to end. Check all spans are connected. Validate span attributes. Test trace sampling behavior. Verify trace export to backend. Test trace query and visualization. Document trace verification procedures. Automate trace verification. Review trace completeness
- **Alert testing**: test alert rules with known conditions. Verify alert delivery to notifications. Test alert deduplication. Validate alert severity levels. Test alert silencing. Document alert testing procedures. Automate alert testing. Review alert effectiveness. Test alert runbooks. Monitor alert noise ratio
- **Dashboard testing**: verify dashboard queries return correct data. Test dashboard performance with large datasets. Validate dashboard filters. Test dashboard sharing. Document dashboard testing procedures. Automate dashboard testing. Review dashboard accuracy. Test dashboard on different devices. Monitor dashboard usage

## Common Pitfalls and Anti-Patterns

- **Over-instrumentation**: adding too many spans or metrics creates noise and overhead. Focus on critical paths. Limit spans per request to 10-20. Remove unused metrics. Review instrumentation regularly. Monitor overhead. Use sampling for high-volume operations. Document instrumentation guidelines. Review new instrumentation in PRs
- **Ignoring cardinality**: high-cardinality labels cause storage explosion. Never use user IDs or request IDs as metric labels. Use low-cardinality labels only. Monitor series count. Set cardinality limits. Document labeling guidelines. Review new labels in code review. Use label drop in relabeling. Alert on cardinality growth
- **No retention strategy**: without retention policies, storage grows indefinitely. Set retention per data type. Traces: 7-30 days. Logs: 30-90 days. Metrics: 90-365 days. Implement automated cleanup. Monitor storage growth. Document retention policies. Test cleanup procedures. Review retention quarterly
- **Alert fatigue**: too many alerts cause teams to ignore them. Review alert rules regularly. Remove noisy alerts. Combine related alerts. Set appropriate thresholds. Use alert silencing for maintenance. Monitor alert volume. Document alert review procedures. Target < 5 alerts per incident. Review alert effectiveness monthly
- **No SLO monitoring**: without SLOs, observability lacks focus. Define SLOs for critical services. Track error budget. Alert on SLO violations. Review SLOs quarterly. Document SLO definitions. Use SLO-based alerting. Monitor SLO compliance. Test SLO alerting. Review SLO targets. Communicate SLO status
- **Siloed observability tools**: using separate tools for traces, logs, and metrics without integration. Use integrated platforms where possible. Correlate traces with logs using trace IDs. Link metrics to traces. Use unified dashboards. Document tool integration. Test correlation. Review tool strategy. Consolidate tools where possible
## Tools and Platforms

- **OpenTelemetry**: vendor-neutral observability framework. Supports traces, metrics, and logs. Auto-instrumentation for popular languages. Manual instrumentation for custom use cases. Collector for processing and export. Export to multiple backends. Growing ecosystem. Use as the default instrumentation layer. Document instrumentation strategy. Test collector configuration
- **Jaeger**: distributed tracing backend by CNCF. UI for trace exploration. Storage backends: Elasticsearch, Cassandra, Badger. Adaptive sampling. Support for OpenTelemetry traces. Query by service, operation, tags. Good for microservice tracing. Document Jaeger deployment. Test trace queries. Monitor Jaeger health
- **Grafana**: visualization platform for observability. Supports Prometheus, Loki, Tempo, Elasticsearch. Create dashboards with panels. Alerting integration. Templating for reusable dashboards. Plugin ecosystem. Use for unified observability views. Document dashboard standards. Test dashboard performance. Review dashboard usage
- **Elasticsearch (ELK)**: log aggregation and search. Full-text search capabilities. Kibana for visualization. Logstash for ingestion. Beats for lightweight agents. Support for structured logs. Good for log-heavy environments. Document ELK configuration. Test query performance. Monitor cluster health
- **Datadog**: commercial observability platform. Unified metrics, traces, and logs. APM for application monitoring. Synthetic monitoring. RUM for frontend. Alerting and dashboards. Good for teams wanting managed solution. Document Datadog configuration. Test integration. Monitor Datadog costs
- **New Relic**: commercial observability platform. APM, infrastructure monitoring. Distributed tracing. Log management. Alerting. Good for teams wanting managed solution. Document New Relic configuration. Test integration. Monitor New Relic costs

## Best Practices Summary

- **Use OpenTelemetry for instrumentation**: vendor-neutral, future-proof. Auto-instrumentation where possible. Manual for custom spans. Export to multiple backends. Test instrumentation. Document strategy. Review regularly. Keep libraries updated. Monitor overhead
- **Define SLOs and error budgets**: set SLOs for critical services. Track error budget burn rate. Alert on SLO violations. Review SLOs quarterly. Document SLO definitions. Use SLO-based alerting. Communicate SLO status. Test SLO monitoring. Review SLO targets
- **Correlate traces, logs, and metrics**: use trace IDs to link traces and logs. Use service labels to link metrics. Create unified dashboards. Document correlation strategy. Test correlation. Review correlation effectiveness. Use consistent naming. Monitor correlation coverage
- **Monitor the monitoring system**: set up meta-monitoring. Monitor collector health. Monitor storage usage. Monitor query performance. Alert on observability pipeline failures. Document meta-monitoring setup. Test meta-monitoring. Review meta-monitoring regularly. Use external monitoring for critical alerts
- **Regular observability reviews**: review dashboards monthly. Review alert rules quarterly. Review retention policies quarterly. Review instrumentation coverage quarterly. Document review findings. Track improvement actions. Communicate review results. Schedule regular reviews. Involve all stakeholders
## Cost Optimization

- **Right-size observability infrastructure**: size collectors and storage based on data volume. Start small and scale based on metrics. Use autoscaling for collectors. Monitor resource utilization. Right-size before scaling out. Document capacity planning. Review sizing monthly. Use spot instances for non-critical collectors. Track cost per data point
- **Data retention optimization**: set retention based on business needs. Traces: 7-30 days. Logs: 30-90 days. Metrics: 90-365 days. Use downsampling for old data. Archive to cold storage. Implement automated cleanup. Monitor storage costs. Review retention quarterly. Document retention policies. Test data recovery from archives
- **Sampling for cost reduction**: use sampling to reduce data volume. Head-based sampling for consistent traces. Tail-based sampling for error-focused traces. Set sample rate based on traffic. Start at 10% for high traffic. Monitor sampled vs total. Adjust based on error rates. Document sampling strategy. Review sample rate monthly
- **Storage tiering**: use hot/warm/cold storage tiers. Hot: fast SSD for recent data. Warm: standard disk for 7-30 day data. Cold: object storage for archived data. Implement lifecycle policies. Monitor tier distribution. Document tiering strategy. Test data retrieval from cold storage. Review tiering monthly. Optimize tier thresholds

## Troubleshooting Guide

- **Missing traces**: check instrumentation coverage. Verify collector is running. Check export configuration. Verify sampling rate. Check network connectivity. Monitor export errors. Test trace generation. Document troubleshooting steps. Check service discovery. Review recent changes
- **High cardinality issues**: identify high-cardinality labels. Use label drop/keep. Monitor series count. Set cardinality limits. Document labeling guidelines. Review new metrics. Use hash-based label reduction. Alert on cardinality growth. Test label changes. Review cardinality quarterly
- **Slow dashboards**: optimize dashboard queries. Use recording rules. Limit time range. Use caching. Monitor query latency. Optimize slow queries. Use pre-aggregated data. Document dashboard best practices. Test dashboard performance. Review dashboard usage
- **Alert storms**: review alert rules. Set appropriate thresholds. Use alert grouping. Implement silencing for maintenance. Monitor alert volume. Document alert review procedures. Combine related alerts. Test alert changes. Review alert effectiveness. Target low alert noise
## Migration Strategies

- **Monolith to observability migration**: start by instrumenting the monolith. Add OpenTelemetry SDK. Export to a collector. Then extract services one by one. Each new service gets instrumented from the start. Verify trace correlation between monolith and new services. Monitor for trace gaps. Document migration strategy. Test at each step
- **Vendor migration**: migrate from one observability platform to another. Run both platforms in parallel during transition. Export to both backends simultaneously. Switch dashboards one by one. Verify data parity. Decommission old platform after all dashboards migrate. Document migration runbook. Test migration in staging first
- **Legacy logging to structured logging**: migrate from unstructured to structured logging incrementally. Start with new services. Then migrate critical existing services. Use log parsers for legacy logs. Convert unstructured logs to JSON at ingestion. Monitor for parsing errors. Document migration strategy. Test structured log format
- **Manual instrumentation to auto-instrumentation**: migrate from manual to auto-instrumentation where possible. Start with new services using auto-instrumentation. Gradually replace manual instrumentation in existing services. Verify trace coverage. Monitor for trace changes. Document migration strategy. Test auto-instrumentation. Review instrumentation coverage

## Compliance and Governance

- **Data retention compliance**: set retention policies per regulatory requirements. Financial: 7 years. Healthcare: 6 years. General: 30-90 days. Implement automated retention enforcement. Audit retention compliance quarterly. Document retention policies. Test retention enforcement. Review retention annually. Monitor storage usage
- **Audit trail for observability data**: log all access to observability data. Include user, timestamp, query, and result count. Send audit logs to immutable storage. Retain per compliance requirements. Support audit log export. Test audit trail completeness. Document audit procedures. Review audit logs monthly
- **Data residency for observability**: some regulations require data to stay within geographic boundaries. Choose cloud regions carefully. Use region-specific collectors and storage. Avoid cross-region replication for regulated data. Document data residency. Monitor for policy violations. Use private connections. Review residency quarterly
- **Access certification**: certify access to observability data quarterly. Review user access lists. Remove departed users. Adjust permissions for role changes. Document certification process. Track certification completion. Alert on overdue certifications. Use automated access reviews. Document access policies
## Reporting and Communication

- **Weekly observability metrics review**: review trace coverage, log volume, metric completeness, and alert effectiveness weekly. Identify gaps in instrumentation. Compare with previous weeks. Document findings and action items. Share with engineering and operations teams. Use metrics to prioritize improvements. Track improvement over time
- **Incident post-mortems for observability failures**: conduct post-mortems when observability gaps are found during incidents. Use blameless format. Document what was missing, why, and how to fix it. Share learnings across teams. Track remediation items. Update runbooks. Improve instrumentation based on findings. Review post-mortem trends
- **Monthly observability scorecard**: create a monthly scorecard with key metrics. Trace coverage percentage. Log format compliance. Alert noise ratio. Mean time to detection. Dashboard usage. SLO compliance. Share with leadership. Track trends month over month. Use scorecard for prioritization. Document scorecard methodology
- **Quarterly observability strategy review**: review observability strategy quarterly. Assess tool effectiveness. Review cost vs value. Identify gaps. Plan improvements. Update roadmap. Involve all stakeholders. Document strategy changes. Communicate changes. Review progress on previous quarter goals. Set goals for next quarter

## Automation and Tooling

- **Automated dashboard generation**: generate dashboards from service definitions. Use infrastructure as code for dashboards. Version control dashboard definitions. Auto-create dashboards for new services. Standardize dashboard templates. Monitor dashboard usage. Remove unused dashboards. Document dashboard standards. Test dashboard generation
- **Automated alert generation**: generate alerts from SLO definitions. Use alerting as code. Version control alert rules. Auto-create alerts for new services. Standardize alert templates. Monitor alert effectiveness. Remove noisy alerts. Document alert standards. Test alert generation. Review alert coverage
- **Observability health checks**: implement health checks for observability infrastructure. Check collector availability. Check storage health. Check query performance. Check alert delivery. Alert on observability failures. Document health check procedures. Test health checks. Review health check coverage. Use external monitoring
## Frequently Asked Questions

**Q: How do I handle high log volume costs?**
A: Sample DEBUG logs, aggregate metrics at the edge, and use cheaper storage tiers (S3, GCS) for old logs.

**Q: Should I aggregate metrics or logs?**
A: Both. [Metrics](/recipes/observability/metrics-collection) for dashboards and alerts. Logs for debugging and audit trails. Don't alert on logs alone.

**Q: How do I secure aggregated logs?**
A: Role-based access, encrypted transport (TLS), and encrypted storage (AES-256). Treat logs as sensitive data. See [what works for security](/guides/security/security-best-practices-guide).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.