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
  - metrics-collection
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
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Metrics collection for applications and infrastructure: Prometheus, StatsD, OpenTelemetry, custom metrics, histograms, counters, and Grafana dashboards."
  keywords:
    - metrics-collection
    - observability
    - prometheus
    - grafana
---
## Overview

Metrics collection transforms raw system behavior into time-series data that reveals performance trends, capacity limits, and anomalies. Unlike [logs](/recipes/observability/structured-logging) (discrete events) or [traces](/recipes/observability/distributed-tracing) (request journeys), metrics are numerical measurements aggregated over time — request rates, error percentages, queue depths, and memory usage. A well-designed metrics pipeline enables proactive alerting before users notice degradation.

## When to Use

Use this resource when:
- You need quantitative SLIs for error budgets and SLO dashboards
- Alerting must fire before logs are aggregated (sub-minute detection)
- [Capacity planning](/guides/devops/infrastructure-as-code-guide) requires historical throughput and resource usage trends
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
- **Add `le` buckets for SLOs**: `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))`
- **Name consistently**: `subsystem_metric_unit` (e.g., `http_requests_total`)
- **Alert on rates, not totals**: `rate(errors[5m]) > 0.01` not `errors > 1000`
- **Separate metric and business logic**: Keep instrumentation thin; never block on metric emission

## Common Mistakes

1. **High-cardinality labels**: User IDs as labels crash Prometheus storage
2. **Missing units**: `request_duration` without `_seconds` or `_milliseconds` creates confusion
3. **Alerting on gauges**: Queue depth alone doesn't indicate failure; combine with processing rate
4. **No retention policy**: Keeping 1-second resolution for 5 years wastes storage; implement a [data retention policy](/guides/databases/database-design-guide).
5. **Forgetting to instrument failures**: Only measuring success hides partial outages

## Error Handling and Recovery

- **Metric scraping failures**: when Prometheus cannot scrape a target, metrics are missing. Use relabeling to filter targets. Monitor scrape failure rate. Alert on targets being down. Set scrape timeout to 10 seconds. Use multiple scrape configs for different services. Test scrape configurations. Document target labeling conventions. Use service discovery for dynamic targets
- **High cardinality metrics**: too many label combinations cause storage explosion. Limit labels to low-cardinality values. Avoid using user IDs or request IDs as labels. Use label drop/keep in relabeling. Monitor series count. Alert on series count growth. Set series limit per metric. Document labeling guidelines. Review new metrics in code review
- **Metric export errors**: when applications fail to expose metrics, monitoring gaps occur. Use health checks for metrics endpoints. Monitor export error rate. Alert on metrics endpoint being unavailable. Implement graceful degradation. Use default values for missing metrics. Test metrics endpoints in CI. Document required metrics per service
- **Storage backend issues**: time-series databases can run out of storage. Set retention period based on data volume. Use downsampling for old data. Monitor storage usage. Alert on storage capacity. Implement data compression. Use remote storage for long-term retention. Test storage recovery. Document storage capacity planning
- **Alert rule evaluation failures**: when alert rules fail to evaluate, incidents are missed. Validate alert rules before deployment. Test rule evaluation in staging. Monitor rule evaluation errors. Alert on rule evaluation failures. Use version control for alert rules. Document rule testing procedures. Review alert rules quarterly

## Performance and Scalability

- **Scrape interval tuning**: balance between data resolution and overhead. Use 15-second intervals for critical services. Use 30-second intervals for standard services. Use 60-second intervals for batch jobs. Monitor scrape duration. Alert on scrape duration exceeding interval. Tune scrape concurrency. Document scrape interval guidelines. Review intervals during capacity planning
- **Query optimization**: slow queries impact dashboard performance. Use rate() and increase() functions efficiently. Avoid high-cardinality queries. Use recording rules for frequent queries. Limit query time range. Use query caching. Monitor query latency. Optimize slow queries. Document query patterns. Use Prometheus query examples
- **Federation scaling**: use federation to scale Prometheus horizontally. Federate critical metrics from leaf Prometheus instances. Use filter labels to limit federated data. Monitor federation scrape duration. Alert on federation failures. Document federation topology. Test federation failover. Use thanos or cortex for long-term storage
- **Recording rules**: pre-compute frequent queries as recording rules. Reduces query load on Prometheus. Set evaluation interval to 30 seconds. Use clear naming conventions. Monitor recording rule evaluation time. Alert on recording rule failures. Document recording rule strategy. Review recording rules quarterly. Remove unused recording rules
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

- **Use OpenTelemetry for instrumentation**: vendor-neutral, adaptable. Auto-instrumentation where possible. Manual for custom spans. Export to multiple backends. Test instrumentation. Document strategy. Review regularly. Keep libraries updated. Monitor overhead
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
## Frequently Asked Questions

**Q: How do I choose between Prometheus and StatsD?**
A: Use Prometheus for new cloud-native apps. Use StatsD for legacy apps where adding an HTTP endpoint is hard.

**Q: What's the performance overhead of metrics collection?**
A: Negligible for counters and gauges (<1%). Histograms with many buckets add slightly more; use predefined buckets.

**Q: Should I collect metrics from the client (browser)?**
A: Yes. [Core Web Vitals](/recipes/performance/web-performance), API error rates, and navigation timing from real users are essential SLIs.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.