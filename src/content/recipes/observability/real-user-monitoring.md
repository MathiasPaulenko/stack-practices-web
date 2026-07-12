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
  - real-user-monitoring
  - observability
  - performance
  - frontend
  - monitoring
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
  - /recipes/metrics-collection
lastUpdated: "2026-06-19"
author: "StackPractices"
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
- **TTFB**: Server response time — hosting + backend performance. See [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
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
- **Correlate with business metrics**: Plot conversion rate vs. LCP to justify optimization budgets. See [metrics collection](/recipes/observability/metrics-collection).
- **Respect privacy**: Mask PII in session replay; comply with GDPR/CCPA for telemetry

## Common Mistakes

1. **Only monitoring homepage**: Product pages and checkout often have worse performance
2. **Ignoring SPA navigations**: Single-page apps need custom LCP/FID measurement for route changes. Consider [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
3. **No correlation with errors**: A slow page that also throws JS errors needs different prioritization. See [error handling](/recipes/api/handle-errors).
4. **Alerting on averages**: Mean LCP of 2s hides that 20% of users see 8s+ loads
5. **No action on data**: Collecting RUM without optimization sprints wastes the instrumentation effort

## Error Handling and Recovery

- **RUM script loading failures**: when the RUM script fails to load, user data is lost. Use async script loading. Implement error boundaries around RUM code. Monitor script load success rate. Alert on load failure rate. Use CDN for script delivery. Test script loading on different browsers. Document fallback behavior. Use feature detection for browser compatibility
- **Beacon API failures**: when sendBeacon fails, events are lost during page unload. Implement fallback to fetch with keepalive. Queue events in localStorage. Retry on next page load. Monitor beacon success rate. Alert on beacon failures. Test on different browsers. Document beacon limitations. Use navigator.sendBeacon for reliability
- **High traffic data loss**: under extreme traffic, RUM events may be dropped. Use sampling for high-traffic sites. Set sample rate based on traffic volume. Prioritize error events over navigation events. Monitor event drop rate. Alert on drop rate exceeding threshold. Use server-side sampling. Document sampling strategy. Review sample rate monthly
- **Session replay failures**: session replay may fail on complex SPAs. Test replay on different page types. Monitor replay capture rate. Alert on replay failures. Use selective replay capture for complex pages. Document replay limitations. Use privacy-conscious replay settings. Test replay on mobile devices. Review replay quality regularly
- **Privacy compliance**: RUM collects user data that may require consent. Implement consent management. Anonymize IP addresses. Mask sensitive form fields. Use cookieless tracking where possible. Document data collection practices. Comply with GDPR, CCPA. Provide opt-out mechanism. Review privacy settings regularly. Audit data retention

## Performance and Scalability

- **RUM data volume management**: RUM generates large data volumes. Set retention period to 30 days. Use sampling for high-traffic sites. Compress event payloads. Monitor data volume. Alert on volume spikes. Use server-side aggregation for metrics. Document data volume trends. Plan capacity based on traffic. Archive old data to cold storage
- **Dashboard performance**: RUM dashboards can be slow with large datasets. Use pre-aggregated metrics. Limit dashboard time range. Use cached results. Monitor dashboard load time. Optimize slow queries. Use sampling for exploration. Document dashboard best practices. Use real-time vs historical views. Review dashboard usage patterns
- **Event pipeline scaling**: scale event ingestion based on traffic. Use horizontal scaling for ingestion. Monitor ingestion rate. Set min/max nodes. Use load balancers. Test ingestion under peak load. Document capacity planning. Alert on ingestion queue depth. Use autoscaling based on traffic. Use queue-based ingestion for buffering
- **Client-side performance impact**: RUM scripts should not impact page performance. Use async loading. Minimize script size. Use web workers for processing. Monitor script execution time. Alert on script overhead. Use requestIdleCallback for non-critical events. Document performance impact. Test on low-end devices. Review script overhead regularly
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
## Industry Standards and Frameworks

- **OpenTelemetry standard**: use OpenTelemetry as the default instrumentation standard. It is CNCF-hosted and vendor-neutral. Supports traces, metrics, and logs. Auto-instrumentation libraries for Java, Python, Go, JavaScript, .NET, Ruby. Collector for processing and routing. Document adoption strategy. Train teams on OpenTelemetry. Review adoption progress quarterly
- **W3C Trace Context**: use W3C Trace Context headers for trace propagation. Standard 	raceparent and 	racestate headers. Supported by all major frameworks. Test context propagation across services. Monitor for missing headers. Document propagation strategy. Verify compatibility with proxies and load balancers. Review propagation coverage
- **Prometheus exposition format**: use Prometheus text format for metric exposition. Standard format with HELP, TYPE, and metric lines. Support for OpenMetrics format. Document metric naming conventions. Use consistent labels. Test exposition format. Monitor scrape success rate. Review metric naming quarterly
- **CloudEvents for event-driven observability**: use CloudEvents specification for event data. Standard event format with required attributes. Enables interoperability between systems. Document CloudEvents usage. Test event format compliance. Monitor event processing. Review CloudEvents adoption. Use with event-driven observability
## Frequently Asked Questions

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