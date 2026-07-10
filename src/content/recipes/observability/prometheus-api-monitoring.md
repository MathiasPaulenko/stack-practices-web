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
lastUpdated: "2026-06-19"
author: "StackPractices"
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

- **Prometheus server crashes**: when Prometheus crashes, monitoring is lost. Run Prometheus in a HA setup with two instances. Use external storage for long-term data. Monitor Prometheus health with a meta-monitoring setup. Alert on Prometheus being down. Test recovery procedures. Document runbooks for Prometheus failures. Use systemd or Kubernetes for auto-restart
- **Alertmanager failures**: when Alertmanager is down, alerts are not delivered. Run multiple Alertmanager instances in HA mode. Use cluster configuration for deduplication. Monitor Alertmanager health. Alert on Alertmanager being down. Test alert delivery end-to-end. Document Alertmanager runbooks. Use notification redundancy (email + Slack + PagerDuty)
- **Service discovery failures**: when service discovery fails, targets are not scraped. Use multiple service discovery mechanisms. Monitor service discovery health. Alert on target count drops. Test service discovery failover. Document service discovery configuration. Use static fallbacks for critical services. Monitor target refresh rate
- **Rule evaluation errors**: invalid PromQL causes rule evaluation failures. Validate rules before deployment. Use promtool for rule testing. Monitor rule evaluation errors. Alert on evaluation failures. Use version control for rules. Document rule testing procedures. Review rules regularly. Use unit tests for complex rules
- **Remote write failures**: when remote write fails, data is not sent to long-term storage. Use retry with exponential backoff. Monitor remote write error rate. Alert on remote write queue buildup. Implement local buffering during outages. Test remote write failover. Document remote write configuration. Use multiple remote write endpoints

## Performance and Scalability

- **Prometheus capacity planning**: size Prometheus based on series count and ingestion rate. Estimate 1 million series per Prometheus instance. Monitor memory usage. Alert on memory pressure. Use SSD storage for better performance. Monitor disk I/O. Document capacity planning guidelines. Plan for 6-month growth. Scale vertically first, then use federation
- **Query performance**: slow queries impact dashboards and alerts. Use recording rules for frequent queries. Avoid high-cardinality queries. Use rate() and increase() efficiently. Limit query time range. Monitor query duration. Alert on slow queries. Use query caching. Document query optimization patterns. Profile slow queries with pprof
- **Storage optimization**: optimize storage usage. Use retention period of 15-30 days. Use downsampling for long-term data. Monitor storage growth. Alert on storage capacity. Compress old blocks. Use WAL checkpointing. Document storage configuration. Test storage recovery. Use thanos or cortex for long-term storage
- **Network optimization**: reduce network overhead. Use local Prometheus instances per datacenter. Use federation for global views. Compress remote write data. Monitor network latency. Alert on network issues. Use gRPC for remote write. Document network topology. Test network failover. Use private networks for monitoring traffic
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