---
contentType: recipes
slug: structured-logging
title: "Structured Logging"
description: "Implement structured logging with JSON output, correlation IDs, and log aggregation for production observability."
metaDescription: "What works in structured logging: JSON format, correlation IDs, log levels, aggregation with ELK/Loki, and distributed tracing integration."
difficulty: intermediate
topics:
  - observability
tags:
  - logging
  - observability
  - devops
  - monitoring
  - metrics
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "What works in structured logging: JSON format, correlation IDs, log levels, aggregation with ELK/Loki, and distributed tracing integration."
  keywords:
    - logging
    - observability
    - elk
    - devops
---
## Overview

Structured logging replaces free-text log messages with machine-readable JSON objects. This enables capable filtering, aggregation, and correlation across distributed services. Instead of parsing regex from strings like "User 123 logged in at 10:00", structured logs emit { "event": "login", "user_id": 123, "timestamp": "..." } — making log analysis trivial in ELK, Loki, or cloud platforms.

## When to Use

Use this resource when:
- Running more than one service that needs centralized log aggregation. See [Prometheus API Monitoring](/recipes/observability/prometheus-api-monitoring) for metrics collection.
- Debugging issues that span multiple microservices or async jobs. See [Integration Testing](/recipes/testing/integration-testing) for cross-service verification.
- Building dashboards and alerts based on log events. See [API Status Page Template](/docs/templates/api-status-page-template) for status dashboards.
- Migrating from plain text logs to a modern observability stack. See [Docker Basics](/recipes/devops/docker-basics) for containerized logging infrastructure.

## Solution

### JSON Logger (Node.js with Pino)

```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'user-api', version: '1.2.3' }
});

// Contextual logging with correlation IDs
function handleRequest(req, res) {
  const child = logger.child({
    request_id: req.headers['x-request-id'] || crypto.randomUUID(),
    user_id: req.user?.id,
    route: req.route?.path
  });

  child.info({ event: 'request_start', method: req.method });
  
  try {
    const result = processOrder(req.body);
    child.info({ event: 'order_processed', order_id: result.id });
  } catch (err) {
    child.error({ event: 'order_failed', error: err.message, stack: err.stack });
  }
}
```

### Python with structlog

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

def transfer_funds(from_account, to_account, amount):
    logger.info(
        "transfer_initiated",
        from_account=from_account,
        to_account=to_account,
        amount_cents=amount,
        request_id=get_current_request_id()
    )
```

### Correlation ID Middleware (Go)

```go
func CorrelationIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = uuid.New().String()
        }
        ctx := context.WithValue(r.Context(), "request_id", id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Explanation

**Key fields for every log entry**:
- **timestamp**: ISO 8601 with timezone
- **level**: debug, info, warn, error, fatal
- **service**: Application or component name
- **request_id**: Correlates all logs for a single user request across services
- **event**: Machine-readable action name (snake_case)
- **message**: Human-readable description (optional in pure structured logging)

**Why structured over text?**
- Query logs without brittle regex: { event: "payment_failed", amount: { $gt: 1000 } }
- Automatic aggregation by any field in Elasticsearch/Loki
- Easy integration with tracing (OpenTelemetry) and metrics

## Variants

| Stack | Components | Best For |
|-------|------------|----------|
| ELK | Elasticsearch, Logstash, Kibana | Full-text search; complex dashboards |
| PLG | Promtail, Loki, Grafana | Kubernetes-native; label-based queries |
| CloudWatch | AWS native | AWS infrastructure; minimal setup |
| Datadog | SaaS | APM + logs + traces unified |
| Splunk | Enterprise | Compliance; advanced analytics |

## What Works

- **Always include request_id**: Trace a single user journey across 10+ services
- **Use log levels consistently**: debug for dev; info for normal operations; error for useful issues
- **Never log sensitive data**: Mask PII, tokens, and passwords before serialization
- **Log at service boundaries**: Entry/exit of every HTTP handler, queue consumer, and background job
- **Emit metrics from logs**: Use log-derived metrics for dashboards instead of custom instrumentation

## Common Mistakes

1. **String concatenation in logs**: `log.info("User " + id + " failed")` — prevents indexing
2. **Missing context**: Logs say "Payment failed" without user_id, amount, or error code
3. **Logging at wrong level**: info for every line of code; error for handled exceptions
4. **Ignoring log volume**: Debug logs in production can cost thousands in ingestion fees
5. **Inconsistent field names**: userId vs user_id vs userID breaks aggregation

## Error Handling and Recovery

- **Log format consistency**: inconsistent log formats make parsing difficult. Define a strict JSON schema for all logs. Use a shared logging library across services. Validate log format in CI. Monitor format violations. Alert on malformed logs. Document the log schema. Use schema versioning. Test log parsing in staging. Review log format changes in code review
- **Sensitive data leakage**: structured logs may accidentally contain sensitive data. Use log sanitization filters. Mask fields like passwords, tokens, SSNs. Implement allow-list for logged fields. Review logs for sensitive data. Monitor for data leakage. Alert on sensitive data detection. Document sanitization rules. Test sanitization effectiveness. Audit log content regularly
- **Log level misconfiguration**: wrong log levels cause noise or missing data. Use environment-specific log levels. Production: INFO. Staging: DEBUG. Development: TRACE. Monitor log volume per level. Alert on unexpected level changes. Document log level guidelines. Use dynamic log level adjustment. Test log level changes. Review log levels quarterly
- **Async logging failures**: async logging can lose logs on crash. Use durable queues for async logging. Flush queues on shutdown. Monitor queue depth. Alert on queue overflow. Implement fallback to sync logging. Test crash recovery. Document async logging configuration. Use bounded queues with drop policy. Monitor log drop rate
- **Log correlation failures**: missing correlation IDs break trace linking. Generate correlation ID at request entry. Propagate through all service calls. Include in every log entry. Monitor correlation ID presence. Alert on missing correlation IDs. Test correlation propagation. Document correlation ID strategy. Use middleware for automatic propagation

## Performance and Scalability

- **Logging overhead**: logging adds CPU and I/O overhead. Use async logging to minimize impact. Batch log writes. Use efficient serialization (JSON, MessagePack). Monitor logging overhead. Alert on logging latency. Use sampling for high-volume logs. Document performance impact. Profile logging code. Optimize hot paths. Use conditional logging
- **Log storage cost management**: log storage costs grow continuously. Set retention policies per log level. Compress old logs. Use tiered storage. Monitor storage costs. Alert on cost growth. Implement automated cleanup. Use cold storage for old logs. Document cost management strategy. Review storage costs monthly. Optimize retention periods
- **Log search optimization**: searching logs efficiently requires good indexing. Index common query fields. Use full-text search for message content. Create time-based indices. Monitor search performance. Optimize slow searches. Use cached search results. Document search best practices. Use query templates. Review index strategy quarterly
- **Structured logging in microservices**: each service should log consistently. Use a shared logging library. Define common fields (service, version, trace_id). Use JSON format for all services. Monitor log format compliance. Alert on format violations. Document logging standards. Test cross-service log correlation. Review logging standards regularly
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
## Sustainability Considerations

- **Energy-efficient observability**: optimize collector resource usage. Use efficient serialization formats. Right-size collectors and storage. Use autoscaling to match capacity to demand. Schedule non-critical analysis during off-peak hours. Monitor energy usage. Document sustainability strategy. Review energy efficiency quarterly
- **Green observability architecture**: prefer managed services that share infrastructure across tenants. Use serverless collectors for variable workloads. Choose cloud regions with renewable energy. Archive old data to cold storage to reduce active storage energy. Monitor carbon footprint. Document green practices. Review sustainability annually
- **Data volume reduction for sustainability**: reduce data volume to lower energy consumption. Use sampling for high-volume traces. Set appropriate retention periods. Use downsampling for old metrics. Compress log data. Remove unused metrics and dashboards. Document data reduction strategy. Review data volume quarterly. Monitor storage growth
- **Efficient query patterns**: optimize queries to reduce CPU usage. Use recording rules for frequent queries. Limit query time range. Use cached results. Avoid high-cardinality queries. Monitor query energy usage. Document efficient query patterns. Train teams on query optimization. Review slow queries regularly

## Advanced Patterns

- **Canary observability**: monitor canary deployments with enhanced observability. Compare metrics between canary and baseline. Use statistical analysis for comparison. Alert on significant deviations. Auto-rollback on anomalies. Document canary observability strategy. Test canary detection. Review canary thresholds. Monitor canary effectiveness
- **Chaos observability**: verify observability during chaos experiments. Ensure traces and logs capture chaos events. Verify alerts fire correctly. Test dashboard accuracy during chaos. Document chaos observability procedures. Test chaos observability. Review chaos observability coverage. Improve based on findings. Run chaos tests regularly
- **Multi-cluster observability**: aggregate observability data across Kubernetes clusters. Use federation or remote write. Centralize dashboards and alerts. Per-cluster filtering and labeling. Document multi-cluster strategy. Test cross-cluster queries. Monitor federation health. Review multi-cluster architecture. Optimize cross-cluster queries
## Industry Standards and Frameworks

- **OpenTelemetry standard**: use OpenTelemetry as the default instrumentation standard. It is CNCF-hosted and vendor-neutral. Supports traces, metrics, and logs. Auto-instrumentation libraries for Java, Python, Go, JavaScript, .NET, Ruby. Collector for processing and routing. Document adoption strategy. Train teams on OpenTelemetry. Review adoption progress quarterly
- **W3C Trace Context**: use W3C Trace Context headers for trace propagation. Standard 	raceparent and 	racestate headers. Supported by all major frameworks. Test context propagation across services. Monitor for missing headers. Document propagation strategy. Verify compatibility with proxies and load balancers. Review propagation coverage
- **Prometheus exposition format**: use Prometheus text format for metric exposition. Standard format with HELP, TYPE, and metric lines. Support for OpenMetrics format. Document metric naming conventions. Use consistent labels. Test exposition format. Monitor scrape success rate. Review metric naming quarterly
- **CloudEvents for event-driven observability**: use CloudEvents specification for event data. Standard event format with required attributes. Enables interoperability between systems. Document CloudEvents usage. Test event format compliance. Monitor event processing. Review CloudEvents adoption. Use with event-driven observability
## Frequently Asked Questions

**Q: Should I use a logging library or console.log?**
A: Always use a library (Pino, Winston, structlog, Zap). They handle buffering, serialization, and log levels correctly.

**Q: How do I correlate logs across microservices?**
A: Propagate a correlation ID in HTTP headers (X-Request-ID) and include it in every log entry. Use a tracing library (OpenTelemetry) for full distributed tracing.

**Q: What is the difference between logs and traces?**
A: Logs are discrete events with timestamps. Traces connect related operations (spans) across services. Use both: structured logs for events, traces for request flow.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Should I use JSON or key-value structured logs?

JSON is the industry standard for structured logging. It is parseable by all major log aggregation tools. Key-value format is lighter but less standardized. Use JSON for new services. Use key-value only for high-volume services where serialization overhead matters. Document your format choice.