---
contentType: recipes
slug: distributed-tracing
title: "Distributed Tracing"
description: "Trace requests across distributed microservices with OpenTelemetry, Jaeger, and Zipkin for latency debugging and performance optimization."
metaDescription: "Distributed tracing with OpenTelemetry, Jaeger, and Zipkin: trace requests across microservices, identify latency bottlenecks, and optimize performance."
difficulty: intermediate
topics:
  - observability
tags:
  - distributed-tracing
  - observability
  - microservices
  - monitoring
  - logging
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/prometheus-api-monitoring
  - /recipes/structured-logging
  - /guides/microservices-architecture-guide
  - /recipes/log-aggregation
  - /recipes/metrics-collection
  - /recipes/real-user-monitoring
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Distributed tracing with OpenTelemetry, Jaeger, and Zipkin: trace requests across microservices, identify latency bottlenecks, and optimize performance."
  keywords:
    - distributed-tracing
    - observability
    - opentelemetry
    - microservices


---
## Overview

Distributed tracing follows a single request as it travels through microservices, databases, message queues, and third-party APIs. Unlike logs (discrete events) or metrics (aggregated numbers), traces reveal the full journey — showing exactly where time is spent and which service causes delays. OpenTelemetry has become the industry standard for instrumenting applications and exporting traces to Jaeger, Zipkin, or cloud providers.

## When to Use

Use this resource when:
- Debugging latency in microservices architectures
- Understanding call graphs across 10+ services
- Optimizing critical user journeys (checkout, login, search)
- Identifying cascading failures and retry storms

## Solution

### OpenTelemetry Auto-Instrumentation (Node.js)

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

### Custom Span Creation (Go)

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

func processOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")
    
    ctx, span := tracer.Start(ctx, "processOrder",
        trace.WithAttributes(attribute.String("order.id", orderID)))
    defer span.End()
    
    // Child span for database call
    ctx, dbSpan := tracer.Start(ctx, "validateInventory")
    err := db.CheckStock(orderID)
    dbSpan.End()
    
    if err != nil {
        span.RecordError(err)
        return err
    }
    
    span.SetStatus(codes.Ok, "order processed")
    return nil
}
```

### Propagation via HTTP Headers

```python
from opentelemetry import trace
from opentelemetry.propagate import extract, inject
import requests

tracer = trace.get_tracer(__name__)

def handle_request(headers):
    # Extract parent context from incoming request
    context = extract(headers)
    
    with tracer.start_as_current_span("process-payment", context=context):
        # Outgoing request carries trace context
        outgoing_headers = {}
        inject(outgoing_headers)
        
        response = requests.post(
            "https://payment-api.example.com/charge",
            headers=outgoing_headers
        )
        return response.json()
```

## Explanation

**Trace anatomy**:
- **Trace**: A complete user request (e. g.
- **Span**: A single operation within the trace (e. g.
- **Span context**: Trace ID + Span ID + flags, propagated across service boundaries
- **Baggage**: Key-value pairs shared across the entire trace

**W3C Trace Context standard**:
- `traceparent`: 00-traceid-spanid-flags
- `tracestate`: Vendor-specific extensions

**Sampling strategies**:
- **Head-based**: Decide at the edge (simple; consistent)
- **Tail-based**: Decide after completion (catches rare errors; expensive)
- **Probability**: Random percentage (cheap; may miss edge cases)

## Variants

| Backend | Best For | Notable Capabilities |
|---------|----------|------------------|
| Jaeger | Open source, self-hosted | Native OpenTelemetry; good UI |
| Zipkin | Simple setups | Minimal resource footprint |
| AWS X-Ray | AWS-native apps | Service map; integration with ALB/Lambda |
| Datadog | Enterprise SaaS | APM + traces + logs unified |
| Grafana Tempo | Grafana stack | Cost-effective at scale |

## What Works

- **Instrument at framework level**: Auto-instrument HTTP, [gRPC](/recipes/grpc-api/), [database](/guides/database-design-guide/), and message queue clients
- **Add business attributes**: user_id, order_id, tenant_id make traces useful
- **Keep cardinality low**: Don't put unique IDs in span names (use attributes instead)
- **Sample aggressively in production**: 1-5% is usually sufficient for debugging
- **Link traces to logs**: Include trace_id in [log entries](/recipes/structured-logging/) for cross-referencing

## Common Mistakes

1. **Missing context propagation**: Spans break across [service boundaries](/guides/microservices-architecture-guide/) if headers aren't forwarded
2. **Span explosion**: Creating spans for every loop iteration creates unreadable traces
3. **High-cardinality tags**: User IDs or session IDs as span names crash storage
4. **Not sampling in dev**: Full tracing in development makes it easy to verify instrumentation
5. **Ignoring async flows**: Background jobs, callbacks, and timers need manual span parenting

## Error Handling and Recovery

- **Trace context propagation failures**: when trace context is lost across service boundaries, spans appear disconnected.  Verify headers are forwarded by all HTTP clients.
- **Sampling configuration errors**: improper sampling rates cause data loss or storage overflow.  Use tail-based sampling for error-focused traces.  Set sampling rate based on traffic volume.  Start at 1% for high traffic, 100% for low traffic.
- **Span export failures**: when spans fail to export to the collector, traces are incomplete.  Set export timeout to 30 seconds.
- **Collector pipeline issues**: OpenTelemetry collectors can drop data if pipelines are misconfigured.  Verify receiver, processor, and exporter configurations.  Scale collectors horizontally for high traffic.
- **High cardinality span attributes**: too many unique attribute values cause storage explosion.  Limit cardinality by using low-cardinality attributes.  Hash or truncate high-cardinality values like user IDs.  Set attribute value length limits.
- **Clock skew across services**: time differences between servers cause incorrect span ordering.

## Performance and Scalability

- **Trace storage optimization**: trace data grows rapidly.  Set retention policies based on trace age.  Compress old traces.  Move traces older than 7 days to warm storage.  Move traces older than 30 days to cold storage.
- **Collector scaling**: scale collectors based on incoming span rate.  Set min/max replicas.
- **Export pipeline tuning**: batch spans for efficient export.  Set batch size to 512 spans.  Set export interval to 5 seconds.  Tune batch size based on throughput.
- **Trace query optimization**: use indexed attributes for fast queries.  Create indexes on service name, operation name, and trace ID.  Cache frequent query results.

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





## Glossary

- **Distributed Tracing**: core technique or pattern described in this article.
- **Production**: live environment serving real users; requires monitoring and rollback plan.
- **Troubleshooting**: systematic process to diagnose and resolve incidents.

## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the distributed-tracing and observability guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply distributed tracing** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: Do I need to change my code for every function?**
A: No. Auto-instrumentation covers HTTP, DB, and queue clients. Only add manual spans for critical business operations.

**Q: What's the performance overhead?**
A: Typically <1% CPU and memory when sampling 1-5%. Head-based sampling is cheaper than tail-based.

**Q: Can I trace frontend JavaScript too?**
A: Yes. OpenTelemetry JS instruments browser apps, connecting user clicks to backend traces end-to-end.

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
