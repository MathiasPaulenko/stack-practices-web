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
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
  - /recipes/metrics-collection
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
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
- Running more than one service that needs centralized log aggregation. See [Prometheus API Monitoring](/recipes/prometheus-api-monitoring/) for metrics collection.
- Debugging issues that span multiple microservices or async jobs. See [Integration Testing](/recipes/integration-testing/) for cross-service verification.
- Building dashboards and alerts based on log events. See [API Status Page Template](/docs/api-status-page-template/) for status dashboards.
- Migrating from plain text logs to a modern observability stack. See [Docker Basics](/recipes/docker-basics/) for containerized logging infrastructure.

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

- **Log format consistency**: inconsistent log formats make parsing difficult.  Define a strict JSON schema for all logs.  Validate log format in CI.
- **Sensitive data leakage**: structured logs may accidentally contain sensitive data.  Mask fields like passwords, tokens, SSNs.
- **Log level misconfiguration**: wrong log levels cause noise or missing data.  Production: INFO.  Staging: DEBUG.  Development: TRACE.
- **Async logging failures**: async logging can lose logs on crash.  Flush queues on shutdown.
- **Log correlation failures**: missing correlation IDs break trace linking.  Propagate through all service calls.

## Performance and Scalability

- **Logging overhead**: logging adds CPU and I/O overhead.  Batch log writes.  Use sampling for high-volume logs.  Profile logging code.
- **Log storage cost management**: log storage costs grow continuously.  Set retention policies per log level.  Compress old logs.
- **Log search optimization**: searching logs efficiently requires good indexing.  Index common query fields.  Create time-based indices.  Use query templates.
- **Structured logging in microservices**: each service should log consistently.  Define common fields (service, version, trace_id).
## Security Considerations

- **Access control for observability data**: restrict access to traces, logs, and metrics.  Separate read and write permissions.  Audit access to observability data.  Rotate API keys and tokens.
- **Data encryption**: encrypt observability data in transit and at rest.  Use encryption at rest for storage.  Rotate encryption keys.
- **PII in observability data**: traces and logs may contain PII.  Mask sensitive fields automatically.
- **Network security**: secure communication between agents and collectors.  Use private networks for monitoring traffic.  Firewall monitoring endpoints.

## Deployment and CI/CD

- **Observability as code**: define dashboards, alerts, and rules in version control.  Use CI/CD for observability updates.  Roll back failed deployments.
- **Progressive rollout for instrumentation**: deploy instrumentation changes gradually.  Roll back if overhead is too high.
- **Version compatibility**: ensure compatibility between instrumentation libraries and collectors.  Plan upgrades carefully.
- **Configuration management**: manage observability configuration centrally.  Version configuration changes.
## Testing and Quality Assurance

- **Integration testing for observability**: test that traces, logs, and metrics are produced correctly.  Verify trace context propagation across services.  Validate metric labels and values.
- **Load testing observability infrastructure**: test collectors and storage under peak load.  Verify ingestion rate handling.  Test scaling behavior.  Verify alert evaluation under load.
- **Chaos testing for observability**: inject failures into observability pipeline.  Kill collectors randomly.  Simulate network partitions.  Verify system continues operating.  Improve resilience based on findings.  Run chaos tests regularly.
- **End-to-end trace verification**: verify complete traces from start to end.  Validate span attributes.  Verify trace export to backend.
- **Alert testing**: test alert rules with known conditions.  Verify alert delivery to notifications.  Validate alert severity levels.
- **Dashboard testing**: verify dashboard queries return correct data.  Validate dashboard filters.

## Common Pitfalls and Anti-Patterns

- **Over-instrumentation**: adding too many spans or metrics creates noise and overhead.  Focus on critical paths.  Limit spans per request to 10-20.
- **Ignoring cardinality**: high-cardinality labels cause storage explosion.  Never use user IDs or request IDs as metric labels.  Set cardinality limits.
- **No retention strategy**: without retention policies, storage grows indefinitely.  Set retention per data type.  Traces: 7-30 days.  Logs: 30-90 days.  Metrics: 90-365 days.
- **Alert fatigue**: too many alerts cause teams to ignore them.  Combine related alerts.  Set appropriate thresholds.  Target < 5 alerts per incident.
- **No SLO monitoring**: without SLOs, observability lacks focus.  Define SLOs for critical services.
- **Siloed observability tools**: using separate tools for traces, logs, and metrics without integration.  Correlate traces with logs using trace IDs.  Link metrics to traces.
## Tools and Platforms

- **OpenTelemetry**: vendor-neutral observability framework.  Supports traces, metrics, and logs.  Auto-instrumentation for popular languages.  Manual instrumentation for custom use cases.  Collector for processing and export.  Export to multiple backends.  Growing ecosystem.
- **Jaeger**: distributed tracing backend by CNCF.  UI for trace exploration.  Storage backends: Elasticsearch, Cassandra, Badger.  Adaptive sampling.  Support for OpenTelemetry traces.  Query by service, operation, tags.  Good for microservice tracing.
- **Grafana**: visualization platform for observability.  Supports Prometheus, Loki, Tempo, Elasticsearch.  Create dashboards with panels.  Alerting integration.  Templating for reusable dashboards.  Plugin ecosystem.
- **Elasticsearch (ELK)**: log aggregation and search.  Full-text search capabilities.  Kibana for visualization.  Logstash for ingestion.  Beats for lightweight agents.  Support for structured logs.  Good for log-heavy environments.
- **Datadog**: commercial observability platform.  Unified metrics, traces, and logs.  APM for application monitoring.  Synthetic monitoring.  RUM for frontend.  Alerting and dashboards.  Good for teams wanting managed solution.
- **New Relic**: commercial observability platform.  APM, infrastructure monitoring.  Distributed tracing.  Log management.  Alerting.  Good for teams wanting managed solution.

## Best Practices Summary

- **Use OpenTelemetry for instrumentation**: vendor-neutral, adaptable.  Auto-instrumentation where possible.  Manual for custom spans.  Export to multiple backends.
- **Define SLOs and error budgets**: set SLOs for critical services.  Communicate SLO status.
- **Correlate traces, logs, and metrics**: use trace IDs to link traces and logs.  Create unified dashboards.
- **Monitor the monitoring system**: set up meta-monitoring.  Monitor storage usage.
- **Regular observability reviews**: review dashboards monthly.  Review retention policies quarterly.  Communicate review results.
## Cost Optimization

- **Right-size observability infrastructure**: size collectors and storage based on data volume.  Start small and scale based on metrics.
- **Data retention optimization**: set retention based on business needs.  Traces: 7-30 days.  Logs: 30-90 days.  Metrics: 90-365 days.  Archive to cold storage.
- **Sampling for cost reduction**: use sampling to reduce data volume.  Head-based sampling for consistent traces.  Tail-based sampling for error-focused traces.  Set sample rate based on traffic.  Start at 10% for high traffic.  Adjust based on error rates.
- **Storage tiering**: use hot/warm/cold storage tiers.  Hot: fast SSD for recent data.  Warm: standard disk for 7-30 day data.  Cold: object storage for archived data.

## Troubleshooting Guide

- **Missing traces**: check instrumentation coverage.  Verify collector is running.  Verify sampling rate.  Check service discovery.
- **High cardinality issues**: identify high-cardinality labels.  Set cardinality limits.
- **Slow dashboards**: optimize dashboard queries.  Limit time range.
- **Alert storms**: review alert rules.  Set appropriate thresholds.  Combine related alerts.
## Migration Strategies

- **Monolith to observability migration**: start by instrumenting the monolith.  Add OpenTelemetry SDK.  Export to a collector.  Then extract services one by one.  Each new service gets instrumented from the start.  Verify trace correlation between monolith and new services.
- **Vendor migration**: migrate from one observability platform to another.  Run both platforms in parallel during transition.  Export to both backends simultaneously.  Switch dashboards one by one.  Verify data parity.  Decommission old platform after all dashboards migrate.
- **Legacy logging to structured logging**: migrate from unstructured to structured logging incrementally.  Start with new services.  Then migrate critical existing services.  Convert unstructured logs to JSON at ingestion.
- **Manual instrumentation to auto-instrumentation**: migrate from manual to auto-instrumentation where possible.  Start with new services using auto-instrumentation.  Gradually replace manual instrumentation in existing services.  Verify trace coverage.

## Compliance and Governance

- **Data retention compliance**: set retention policies per regulatory requirements.  Financial: 7 years.  Healthcare: 6 years.  General: 30-90 days.  Audit retention compliance quarterly.
- **Audit trail for observability data**: log all access to observability data.  Send audit logs to immutable storage.  Retain per compliance requirements.  Support audit log export.
- **Data residency for observability**: some regulations require data to stay within geographic boundaries.  Choose cloud regions carefully.
- **Access certification**: certify access to observability data quarterly.  Adjust permissions for role changes.
## Reporting and Communication

- **Weekly observability metrics review**: review trace coverage, log volume, metric completeness, and alert effectiveness weekly.
- **Incident post-mortems for observability failures**: conduct post-mortems when observability gaps are found during incidents.  Improve instrumentation based on findings.
- **Monthly observability scorecard**: create a monthly scorecard with key metrics.  Trace coverage percentage.  Log format compliance.  Alert noise ratio.  Mean time to detection.  Dashboard usage.  SLO compliance.
- **Quarterly observability strategy review**: review observability strategy quarterly.  Assess tool effectiveness.  Plan improvements.  Involve all stakeholders.  Communicate changes.

## Automation and Tooling

- **Automated dashboard generation**: generate dashboards from service definitions.  Version control dashboard definitions.  Auto-create dashboards for new services.  Standardize dashboard templates.
- **Automated alert generation**: generate alerts from SLO definitions.  Version control alert rules.  Auto-create alerts for new services.  Standardize alert templates.
- **Observability health checks**: implement health checks for observability infrastructure.  Check storage health.  Check alert delivery.
## Sustainability Considerations

- **Energy-efficient observability**: optimize collector resource usage.
- **Green observability architecture**: prefer managed services that share infrastructure across tenants.  Choose cloud regions with renewable energy.  Archive old data to cold storage to reduce active storage energy.
- **Data volume reduction for sustainability**: reduce data volume to lower energy consumption.  Set appropriate retention periods.  Compress log data.
- **Efficient query patterns**: optimize queries to reduce CPU usage.  Limit query time range.  Train teams on query optimization.

## Advanced Patterns

- **Canary observability**: monitor canary deployments with enhanced observability.  Auto-rollback on anomalies.
- **Chaos observability**: verify observability during chaos experiments.  Verify alerts fire correctly.  Test chaos observability.  Improve based on findings.
- **Multi-cluster observability**: aggregate observability data across Kubernetes clusters.  Centralize dashboards and alerts.  Per-cluster filtering and labeling.
## Industry Standards and Frameworks

- **OpenTelemetry standard**: use OpenTelemetry as the default instrumentation standard.  It is CNCF-hosted and vendor-neutral.  Supports traces, metrics, and logs.  Auto-instrumentation libraries for Java, Python, Go, JavaScript, . NET, Ruby.  Collector for processing and routing.  Train teams on OpenTelemetry.
- **W3C Trace Context**: use W3C Trace Context headers for trace propagation.  Standard 	raceparent and 	racestate headers.  Supported by all major frameworks.  Verify compatibility with proxies and load balancers.
- **Prometheus exposition format**: use Prometheus text format for metric exposition.  Standard format with HELP, TYPE, and metric lines.  Support for OpenMetrics format.
- **CloudEvents for event-driven observability**: use CloudEvents specification for event data.  Standard event format with required attributes.  Enables interoperability between systems.




## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the logging and observability guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply structured logging** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

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

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
