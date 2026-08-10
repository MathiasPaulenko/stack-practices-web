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
  - /recipes/real-user-monitoring
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Log aggregation for distributed systems: ELK stack, Fluentd, Grafana Loki, log shipping, parsing, and centralized troubleshooting at scale."
  keywords:
    - log-aggregation
    - observability
    - elk
    - devops

---
## Overview

Log aggregation centralizes logs from dozens or hundreds of services into a single searchable system. Instead of SSHing into individual servers, teams query a unified index to trace requests across [microservices](/guides/microservices-architecture-guide/), investigate errors, and detect anomalies. Tools like the ELK stack, Fluentd, and Grafana Loki have made centralized logging accessible to any team size.

## When to Use

Use this resource when:
- Debugging requires correlating logs from 5+ services for a single user request
- Compliance mandates log retention and tamper-proof storage
- You need real-time [alerting](/recipes/prometheus-monitoring-alerts/) based on log patterns (error spikes, security events)
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

- **Include correlation IDs**: Every log entry should have a `traceId` linking the full request journey.  See [distributed tracing](/recipes/distributed-tracing/).
- **Log at the right level**: DEBUG for development; INFO for normal operations; ERROR for useful issues
- **Don't log secrets**: Mask PII, tokens, and passwords before they reach the aggregation system
- **Set retention policies**: 30 days hot storage for troubleshooting; 1 year cold archive for compliance.
- **Alert on patterns, not single lines**: "5 ERRORs in 1 minute" is more useful than one log line

## Common Mistakes

1. **Logging everything at INFO**: Creates noise that hides real issues; use DEBUG appropriately
2. **No timezone standardization**: Mixed UTC and local times make correlation impossible
3. **Missing request context**: `ERROR: database connection failed` without which service or user is useless
4. **Ignoring backpressure**: Log agents that can't keep up drop logs silently during traffic spikes
5. **Storing logs in the same database as application data**: Competes for resources; keeps analysts out of production

## Error Handling and Recovery

- **Log ingestion failures**: when log agents fail to send logs to the aggregation system, data is lost.  Set max retry count to 10.
- **Log parsing errors**: malformed logs cause parsing failures.  Route unparseable logs to a dead letter queue.  Fix log format at the source.
- **Storage backend failures**: when the storage backend goes down, logs cannot be queried.
- **Log loss during high traffic**: under extreme load, logs may be dropped. 1%.
- **Corrupted log indices**: index corruption prevents log queries.  Run index consistency checks daily.  Rebuild corrupted indices from raw logs.

## Performance and Scalability

- **Log volume management**: log volumes grow rapidly.  Set retention policies per log level.  Keep info logs for 30 days.  Compress old logs.
- **Query performance optimization**: slow log queries frustrate users.  Create indexes on common query fields.  Limit query result size.
- **Ingestion pipeline scaling**: scale ingestion based on log volume.  Set min/max nodes.
- **Log deduplication**: duplicate logs waste storage and confuse analysis.  Set dedup window to 5 minutes.  Fix duplicate log sources.
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





## Glossary

- **Log Aggregation**: core technique or pattern described in this article.
- **Production**: live environment serving real users; requires monitoring and rollback plan.
- **Troubleshooting**: systematic process to diagnose and resolve incidents.

## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the log-aggregation and observability guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply log aggregation** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: How do I handle high log volume costs?**
A: Sample DEBUG logs, aggregate metrics at the edge, and use cheaper storage tiers (S3, GCS) for old logs.

**Q: Should I aggregate metrics or logs?**
A: Both. [Metrics](/recipes/metrics-collection/) for dashboards and alerts. Logs for debugging and audit trails. Don't alert on logs alone.

**Q: How do I secure aggregated logs?**
A: Role-based access, encrypted transport (TLS), and encrypted storage (AES-256). Treat logs as sensitive data. See [what works for security](/guides/security-best-practices-guide/).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
