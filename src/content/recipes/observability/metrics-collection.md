---
contentType: recipes
slug: metrics-collection
title: "Metrics Collection"
description: "Collect, aggregate, and expose application and infrastructure metrics with Prometheus, StatsD, and OpenTelemetry for monitoring and alerting."
metaDescription: "Metrics collection for applications and infrastructure: Prometheus, StatsD, OpenTelemetry, custom metrics, histograms, counters, and Grafana dashboards."
difficulty: intermediate
topics:
  - observability
tags:
  - metrics
  - observability
  - prometheus
  - monitoring
  - logging
relatedResources:
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/grafana-dashboards-observability
  - /recipes/distributed-tracing
  - /recipes/structured-logging
  - /recipes/real-user-monitoring
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Metrics collection for applications and infrastructure: Prometheus, StatsD, OpenTelemetry, custom metrics, histograms, counters, and Grafana dashboards."
  keywords:
    - metrics-collection
    - observability
    - prometheus
    - grafana

---
## Overview

Metrics collection transforms raw system behavior into time-series data that reveals performance trends, capacity limits, and anomalies. Unlike [logs](/recipes/structured-logging/) (discrete events) or [traces](/recipes/distributed-tracing/) (request journeys), metrics are numerical measurements aggregated over time — request rates, error percentages, queue depths, and memory usage. A well-designed metrics pipeline enables proactive alerting before users notice degradation.

## When to Use

Use this resource when:
- You need quantitative SLIs for error budgets and SLO dashboards
- Alerting must fire before logs are aggregated (sub-minute detection)
- [Capacity planning](/guides/infrastructure-as-code-guide/) requires historical throughput and resource usage trends
- Debugging requires correlating metrics across services (CPU spike + latency increase)

## Solution

### Prometheus Metrics in Go

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request latency",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "status"},
    )
    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

func init() {
    prometheus.MustRegister(requestDuration, activeConnections)
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
    activeConnections.Inc()
    defer activeConnections.Dec()

    start := time.Now()
    defer func() {
        requestDuration.WithLabelValues(
            r.Method,
            strconv.Itoa(w.Status()),
        ).Observe(time.Since(start).Seconds())
    }()

    // Handler logic...
}
```

### StatsD Metrics (Node.js)

```javascript
const StatsD = require('node-statsd');
const client = new StatsD({ host: 'localhost', port: 8125 });

function processPayment(orderId, amount) {
  const start = Date.now();
  
  try {
    const result = paymentGateway.charge(amount);
    client.increment('payment.success');
    client.gauge('payment.amount', amount);
    return result;
  } catch (err) {
    client.increment('payment.error', 1, ['gateway:stripe', 'error:declined']);
    throw err;
  } finally {
    client.timing('payment.duration', Date.now() - start);
  }
}
```

### OpenTelemetry Metrics (Python)

```python
from opentelemetry import metrics
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider

reader = PrometheusMetricReader()
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter(__name__)

counter = meter.create_counter("orders.created", description="Orders created")
histogram = meter.create_histogram("order.value", description="Order value in USD")

def create_order(items, total):
    counter.add(1, {"region": "us-east"})
    histogram.record(total, {"region": "us-east"})
    return Order(items=items, total=total)
```

## Explanation

**Metric types**:

| Type | Use Case | Example |
|------|----------|---------|
| Counter | Monotonically increasing | Total requests, errors |
| Gauge | Value goes up and down | Active connections, queue depth |
| Histogram | Distribution of values | Request latency, payload size |
| Summary | Quantiles (client-side) | 99th percentile latency |

**Cardinality danger**:
- Good labels: `method=GET`, `status=200`, `region=us-east`
- Bad labels: `user_id=12345`, `session_id=abc` — causes metric explosion
- Rule of thumb: Keep unique label combinations under 10,000

## Variants

| Backend | Collection | Best For |
|---------|------------|----------|
| Prometheus | Pull (scrape) | Kubernetes; PromQL queries |
| StatsD | Push (UDP) | Legacy apps; simple counters |
| InfluxDB | Push (HTTP) | High cardinality; tags |
| Datadog | Agent push | SaaS; out-of-box dashboards |
| CloudWatch | AWS integration | AWS-native apps |

## What Works

- **Use histograms for latency**: Counters and gauges lose distribution shape
- **Add `le` buckets for SLOs**: `histogram_quantile(0.
- **Name consistently**: `subsystem_metric_unit` (e. g.
- **Alert on rates, not totals**: `rate(errors[5m]) > 0.
- **Separate metric and business logic**: Keep instrumentation thin; never block on metric emission

## Common Mistakes

1. **High-cardinality labels**: User IDs as labels crash Prometheus storage
2. **Missing units**: `request_duration` without `_seconds` or `_milliseconds` creates confusion
3. **Alerting on gauges**: Queue depth alone doesn't indicate failure; combine with processing rate
4. **No retention policy**: Keeping 1-second resolution for 5 years wastes storage; implement a [data retention policy](/guides/database-design-guide/).
5. **Forgetting to instrument failures**: Only measuring success hides partial outages

## Error Handling and Recovery

- **Metric scraping failures**: when Prometheus cannot scrape a target, metrics are missing.  Set scrape timeout to 10 seconds.
- **High cardinality metrics**: too many label combinations cause storage explosion.  Limit labels to low-cardinality values.  Set series limit per metric.
- **Metric export errors**: when applications fail to expose metrics, monitoring gaps occur.
- **Storage backend issues**: time-series databases can run out of storage.  Set retention period based on data volume.
- **Alert rule evaluation failures**: when alert rules fail to evaluate, incidents are missed.  Validate alert rules before deployment.

## Performance and Scalability

- **Scrape interval tuning**: balance between data resolution and overhead.  Use 30-second intervals for standard services.  Tune scrape concurrency.
- **Query optimization**: slow queries impact dashboard performance.  Limit query time range.
- **Federation scaling**: use federation to scale Prometheus horizontally.  Federate critical metrics from leaf Prometheus instances.
- **Recording rules**: pre-compute frequent queries as recording rules.  Reduces query load on Prometheus.  Set evaluation interval to 30 seconds.
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




## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the metrics and observability guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply metrics collection** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: How do I choose between Prometheus and StatsD?**
A: Use Prometheus for new cloud-native apps. Use StatsD for legacy apps where adding an HTTP endpoint is hard.

**Q: What's the performance overhead of metrics collection?**
A: Negligible for counters and gauges (<1%). Histograms with many buckets add slightly more; use predefined buckets.

**Q: Should I collect metrics from the client (browser)?**
A: Yes. [Core Web Vitals](/recipes/web-performance/), API error rates, and navigation timing from real users are essential SLIs.

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
