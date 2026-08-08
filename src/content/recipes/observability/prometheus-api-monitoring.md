---
contentType: recipes
slug: prometheus-api-monitoring
title: "Prometheus API Monitoring"
description: "Monitor API performance and health with Prometheus metrics, custom collectors, and alerting rules."
metaDescription: "Set up Prometheus monitoring for REST and gRPC APIs with custom metrics, collectors, alerting rules, and Grafana dashboards for production observability."
difficulty: intermediate
topics:
  - observability
tags:
  - prometheus
  - observability
  - api
  - devops
  - monitoring
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/grafana-dashboards-observability
  - /docs/api-status-page-template
  - /guides/logging-monitoring-observability-guide
  - /guides/monitoring-alerting-guide
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
  - /recipes/metrics-collection
  - /recipes/structured-logging
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Set up Prometheus monitoring for REST and gRPC APIs with custom metrics, collectors, alerting rules, and Grafana dashboards for production observability."
  keywords:
    - prometheus
    - observability
    - api
    - devops


---
## Overview

Prometheus is the de facto standard for metrics collection in cloud-native environments. By instrumenting your API with custom counters, histograms, and gauges, you gain real-time visibility into request latency, error rates, throughput, and business-level metrics.

## When to Use

Use this resource when:
- Setting up monitoring for REST or gRPC APIs. See [Structured Logging](/recipes/observability/structured-logging) for correlating logs with metrics.
- Defining SLOs and SLIs for microservices. See [Load Testing](/recipes/testing/load-testing) for establishing performance baselines.
- Creating Grafana dashboards for API health. See [API Status Page Template](/docs/templates/api-status-page-template) for external status reporting.
- Alerting on p99 latency or error rate spikes. See [Circuit Breaker](/patterns/design/circuit-breaker-pattern) for preventing cascading failures.

## Solution

### Prometheus Client Instrumentation (Node.js)

```javascript
const client = require('prom-client');

// Counter: total requests
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Histogram: request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Gauge: active connections
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

// Middleware
app.use((req, res, next) => {
  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || 'unknown' });
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode
    });
    activeConnections.dec();
  });

  next();
});
```

### Alerting Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
```

## Explanation

Prometheus follows a pull model:

1. **Instrumentation**: Your application exposes a /metrics endpoint
2. **Scraping**: Prometheus server polls this endpoint periodically (default 15s)
3. **Storage**: Time-series data is stored locally with compression
4. **Querying**: PromQL queries aggregate metrics in real time
5. **Alerting**: Alertmanager routes alerts to Slack, PagerDuty, email

**Metric types**:
- **Counter**: Monotonically increasing (requests, errors)
- **Histogram**: Bucketed observations + sum + count (latency)
- **Gauge**: Can go up or down (connections, queue depth)
- **Summary**: Pre-calculated quantiles (use histograms instead when possible)

## Variants

| Language | Library | Notes |
|----------|---------|-------|
| Node.js | prom-client | Most popular; built-in registry |
| Go | prometheus/client_golang | Official; best performance |
| Python | prometheus_client | Flask/Django middleware available |
| Java | Micrometer | Spring Boot integration |
| Rust | prometheus | Async-compatible |

## What Works

- **Use labels sparingly**: High cardinality (unique label combinations) degrades performance
- **Prefer histograms over summaries**: Histograms allow aggregation across instances
- **Instrument business metrics**: Not just technical metrics (signups, revenue per endpoint)
- **Set retention wisely**: Default 15 days; increase for long-term trends
- **Run Prometheus in HA mode**: Use Thanos or Cortex for multi-cluster aggregation

## Common Mistakes

1. **High cardinality labels**: User IDs or session IDs as labels crash Prometheus
2. **Missing unit suffixes**: Use _seconds, _bytes, _total as per naming conventions
3. **Not instrumenting failures**: Only tracking success masks outage detection
4. **Too many buckets**: 100+ histogram buckets waste storage and CPU
5. **Ignoring scrape errors**: /metrics endpoint errors mean blind spots

## Error Handling and Recovery

- **Prometheus server crashes**: when Prometheus crashes, monitoring is lost.  Run Prometheus in a HA setup with two instances.
- **Alertmanager failures**: when Alertmanager is down, alerts are not delivered.  Run multiple Alertmanager instances in HA mode.
- **Service discovery failures**: when service discovery fails, targets are not scraped.  Use static fallbacks for critical services.
- **Rule evaluation errors**: invalid PromQL causes rule evaluation failures.  Validate rules before deployment.  Use version control for rules.
- **Remote write failures**: when remote write fails, data is not sent to long-term storage.

## Performance and Scalability

- **Prometheus capacity planning**: size Prometheus based on series count and ingestion rate.  Estimate 1 million series per Prometheus instance.  Plan for 6-month growth.
- **Query performance**: slow queries impact dashboards and alerts.  Limit query time range.
- **Storage optimization**: optimize storage usage.  Use downsampling for long-term data.  Compress old blocks.
- **Network optimization**: reduce network overhead.  Use federation for global views.  Compress remote write data.
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
- **Related guides**: explore the prometheus and observability guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply prometheus api monitoring** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: How much memory does Prometheus need?**
A: ~1-3KB per time series. A typical API with 100 endpoints and 5 labels needs 2-4GB RAM.

**Q: Can Prometheus handle log data?**
A: No. Use Loki for logs, Jaeger for traces, and Prometheus for metrics. The Grafana stack unifies them.

**Q: What is the difference between histogram and summary?**
A: Histograms bucket data and allow aggregation. Summaries pre-compute quantiles but cannot be aggregated across instances.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### How do I reduce Prometheus storage costs?

Use retention periods of 15-30 days. Enable downsampling for long-term data. Use recording rules to pre-compute frequent queries. Remove unused metrics. Limit high-cardinality labels. Use Thanos or Cortex for long-term storage with object storage backends. Monitor storage growth monthly.

### Can I use Prometheus for business metrics?

Yes, but use a separate Prometheus instance for business metrics. Business metrics often have higher cardinality and different retention needs. Use recording rules for pre-aggregation. Export to a warehouse for long-term analysis. Document metric definitions clearly.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
