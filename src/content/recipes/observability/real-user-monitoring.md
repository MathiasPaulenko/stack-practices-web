---
contentType: recipes
slug: real-user-monitoring
title: "Real User Monitoring"
description: "Monitor actual user experiences with Core Web Vitals, session replay, and performance analytics to identify real-world bottlenecks."
metaDescription: "Real user monitoring RUM: Core Web Vitals, session replay, performance analytics, JavaScript error tracking, and user experience optimization."
difficulty: intermediate
topics:
  - observability
tags:
  - monitoring
  - observability
  - performance
  - frontend
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
  - /recipes/metrics-collection
  - /guides/complete-guide-distributed-tracing
  - /guides/complete-guide-prometheus-grafana
  - /guides/complete-guide-sentry-error-tracking
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Real user monitoring RUM: Core Web Vitals, session replay, performance analytics, JavaScript error tracking, and user experience optimization."
  keywords:
    - real-user-monitoring
    - observability
    - performance
    - frontend


---
## Overview

Real User Monitoring (RUM) captures performance data from actual browser sessions — not synthetic tests or server-side metrics. It reveals how [Core Web Vitals](/recipes/performance/web-performance), JavaScript errors, and API latencies vary across devices, networks, and geographies. Unlike lab tests that run in ideal conditions, RUM exposes the experience of users on 3G networks, low-end devices, and older browsers.

## When to Use

Use this resource when:
- Lab-based Lighthouse scores don't match real-world [performance complaints](/recipes/performance/web-performance)
- You need to correlate business metrics (conversion, bounce rate) with page speed
- Debugging performance issues that only affect specific browsers or regions
- Prioritizing optimization efforts based on actual user impact, not assumptions

## Solution

### Web Vitals Library (JavaScript)

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    delta: metric.delta,
    navigationType: metric.navigationType,
    page: window.location.pathname
  });

  // Use navigator.sendBeacon for reliability during page unload
  (navigator.sendBeacon && navigator.sendBeacon('/analytics/vitals', body)) ||
    fetch('/analytics/vitals', { body, method: 'POST', keepalive: true });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Session Replay Integration (Sentry)

```javascript
import * as Sentry from '@sentry/browser';
import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: 'https://abc@sentry.io/1',
  integrations: [
    new Replay({
      maskAllText: true,      // Mask sensitive text
      blockAllMedia: true,    // Block images/videos
    })
  ],
  tracesSampleRate: 0.1,    // 10% of transactions
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0   // 100% of error sessions
});
```

### Custom Performance Observer

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('TTFB:', entry.responseStart);
      console.log('FCP:', entry.responseEnd);
      console.log('DOM Ready:', entry.domContentLoadedEventEnd);
    }
    
    if (entry.entryType === 'resource') {
      if (entry.duration > 1000) {
        console.warn('Slow resource:', entry.name, entry.duration);
      }
    }
  }
});

observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
```

## Explanation

**RUM vs. synthetic monitoring**:

| Aspect | RUM | Synthetic |
|--------|-----|-----------|
| Data source | Real users | Scheduled bots |
| Network | Variable (3G to 5G) | Controlled (fast) |
| Device diversity | Full range | Usually desktop |
| Geographic | Actual user locations | Data center |
| Use case | Understand reality | Baseline regression |

**Key metrics**:
- **LCP**: Largest visible element — hero image, heading
- **INP**: Interaction latency — button click to visual update
- **CLS**: Layout shifts — ads, images, fonts causing jumps
- **TTFB**: Server response time — hosting + backend performance.  See [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
- **FCP**: First content paint — first text or image visible

## Variants

| Tool | Type | Notable Capabilities |
|------|------|------------------|
| Google CrUX | Chrome-only | Largest real-world dataset; field data |
| New Relic Browser | Commercial | Session traces; JS error tracking |
| Datadog RUM | Commercial | Correlation with APM; session replay |
| Sentry | Open source | Error + performance + replay combined |
| SpeedCurve | Commercial | Competitive benchmarking; filmstrips |
| web-vitals.js | Open source | Google's reference implementation |

## What Works

- **Sample intelligently**: 100% sampling overwhelms backends; 5-10% is usually sufficient
- **Capture context**: Device type, connection speed, and country explain variation
- **Alert on percentiles, not averages**: P95 performance is what frustrated users experience
- **Correlate with business metrics**: Plot conversion rate vs.  LCP to justify optimization budgets.  See [metrics collection](/recipes/observability/metrics-collection).
- **Respect privacy**: Mask PII in session replay; comply with GDPR/CCPA for telemetry

## Common Mistakes

1. **Only monitoring homepage**: Product pages and checkout often have worse performance
2. **Ignoring SPA navigations**: Single-page apps need custom LCP/FID measurement for route changes. Consider [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
3. **No correlation with errors**: A slow page that also throws JS errors needs different prioritization. See [error handling](/recipes/api/handle-errors).
4. **Alerting on averages**: Mean LCP of 2s hides that 20% of users see 8s+ loads
5. **No action on data**: Collecting RUM without optimization sprints wastes the instrumentation effort

## Error Handling and Recovery

- **RUM script loading failures**: when the RUM script fails to load, user data is lost.
- **Beacon API failures**: when sendBeacon fails, events are lost during page unload.  Queue events in localStorage.  Retry on next page load.
- **High traffic data loss**: under extreme traffic, RUM events may be dropped.  Set sample rate based on traffic volume.
- **Session replay failures**: session replay may fail on complex SPAs.  Use privacy-conscious replay settings.
- **Privacy compliance**: RUM collects user data that may require consent.  Anonymize IP addresses.  Mask sensitive form fields.  Comply with GDPR, CCPA.  Provide opt-out mechanism.

## Performance and Scalability

- **RUM data volume management**: RUM generates large data volumes.  Set retention period to 30 days.  Compress event payloads.  Plan capacity based on traffic.
- **Dashboard performance**: RUM dashboards can be slow with large datasets.  Limit dashboard time range.  Use real-time vs historical views.
- **Event pipeline scaling**: scale event ingestion based on traffic.  Set min/max nodes.  Use autoscaling based on traffic.
- **Client-side performance impact**: RUM scripts should not impact page performance.  Use requestIdleCallback for non-critical events.
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
- **Related guides**: explore the monitoring and observability guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply real user monitoring** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: Does RUM slow down my site?**
A: Negligibly. The web-vitals library is <1KB. Beacons are sent after the page is interactive.

**Q: Should I use RUM or synthetic monitoring?**
A: Both. Synthetic for baseline regression detection. RUM for understanding actual [user experience](/recipes/performance/web-performance).

**Q: How do I handle ad blockers?**
A: Serve RUM from your own domain (first-party), not third-party. Ad blockers target known analytics domains.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### How do I choose the right RUM tool?

Consider data volume, budget, and features. Datadog RUM for full-stack monitoring. Sentry for error-focused RUM. Google Analytics for marketing-focused data. Open-source options like OpenTelemetry Web for custom needs. Test in staging first. Compare data accuracy across tools.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
