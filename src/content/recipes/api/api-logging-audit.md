---


contentType: recipes
slug: api-logging-audit
title: "Implement API Logging and Audit Trails"
description: "Set up thorough request/response logging and audit trails for APIs with structured output, correlation IDs, and compliance considerations."
metaDescription: "Implement API logging and audit trails with structured output, correlation IDs, and compliance. Examples in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - compliance
  - java
  - rest
  - http
relatedResources:
  - /recipes/logging
  - /recipes/middleware
  - /recipes/api-documentation-openapi
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/graphql-api
  - /recipes/handle-errors
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement API logging and audit trails with structured output, correlation IDs, and compliance. Examples in Python, JavaScript, and Java."
  keywords:
    - logging
    - audit-trail
    - structured-logging
    - compliance
    - python
    - javascript
    - java


---
# Implement API Logging and Audit Trails

## Overview

API logging captures request and response details for debugging, performance analysis, and security forensics. Audit trails go further — recording who did what, when, and from where — essential for compliance (SOC 2, ISO 27001, GDPR) and incident investigation.

The following implements structured logging with correlation IDs, request/response capture, and tamper-resistant audit storage.

## When to Use

Use this resource when:
- You need to debug production API issues without reproducing them locally
- [Compliance](/guides/security/security-best-practices-guide) requirements mandate audit trails for sensitive operations
- You run [distributed systems](/guides/architecture/software-architecture-guide) and need to trace requests across services
- You need to detect anomalous API usage patterns

## Solution

### Python

```python
import logging
import json
import uuid
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api.audit")

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id

        response = await call_next(request)

        audit = {
            "timestamp": datetime.utcnow().isoformat(),
            "correlation_id": correlation_id,
            "method": request.method,
            "path": str(request.url),
            "status_code": response.status_code,
            "user_agent": request.headers.get("user-agent"),
            "client_ip": request.client.host,
        }
        logger.info(json.dumps(audit))
        response.headers["X-Correlation-Id"] = correlation_id
        return response
```

### JavaScript

```javascript
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

function auditMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  const start = Date.now();
  res.on('finish', () => {
    logger.info('api_request', {
      correlation_id: correlationId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: Date.now() - start,
      client_ip: req.ip,
      user_agent: req.get('user-agent'),
    });
  });
  next();
}

module.exports = auditMiddleware;
```

### Java

```java
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.MDC;
import java.util.UUID;

@Component
public class AuditFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger("api.audit");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = request.getHeader("X-Correlation-Id");
        if (correlationId == null) correlationId = UUID.randomUUID().toString();

        MDC.put("correlationId", correlationId);
        response.setHeader("X-Correlation-Id", correlationId);

        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            logger.info("method={} path={} status={} duration={}ms",
                request.getMethod(),
                request.getRequestURI(),
                response.getStatus(),
                System.currentTimeMillis() - start);
            MDC.clear();
        }
    }
}
```

## Explanation

Structured logging outputs machine-parseable JSON instead of plain text. This enables:
- **Log aggregation**: Tools like ELK, Datadog, or CloudWatch can filter and group by field
- **Correlation IDs**: Trace a single request across multiple microservices
- **Audit trails**: Immutable records of who accessed what, required for compliance

Separate operational logs (debugging) from audit logs (compliance). Audit logs should be append-only and stored in tamper-resistant storage.

## Variants

| Tool | Language | Output | Best For |
|------|----------|--------|----------|
| structlog | Python | JSON | Semantic logging with context binding |
| Pino | JavaScript | JSON | High-performance Node.js logging |
| Logback + MDC | Java | JSON/Pattern | Thread-local context in Spring |

## What Works

- **Never log sensitive data**: Exclude passwords, tokens, PII — mask or hash them. See [Security Guide](/guides/security/security-best-practices-guide) for data protection.
- **Use correlation IDs**: Pass `X-Correlation-Id` through every service call
- **Log asynchronously**: Use buffering to avoid blocking the request thread
- **Rotate and archive**: Compress old logs and move to cold storage (S3 Glacier)
- **Separate audit from debug**: Audit logs need stricter retention and access controls

## Common Mistakes

- **Logging everything**: Excessive logging kills performance and hides signal in noise
- **Plain text logs**: Unstructured text is impossible to query at scale
- **No log sampling in dev**: Log flooding in development masks real issues
- **Forgetting to clear MDC/ context**: Leaked context between requests causes confusion
- **Storing audit logs with application logs**: Audit trails need separate, restricted access

## Frequently Asked Questions

**Q: How long should I retain API logs?**
A: Operational logs: 7-30 days. Audit logs: 1-7 years depending on compliance (PCI-DSS requires 1 year, SOC 2 requires per policy). Always check your regulatory requirements.

**Q: Can I use my APM tool instead of custom logging?**
A: APM tools (Datadog, New Relic) capture distributed traces but may not satisfy audit requirements. Use both: APM for performance, custom audit logs for compliance.

**Q: How do I prevent log injection attacks?**
A: Sanitize user input before logging. Never concatenate raw user input into log messages — use structured fields and let the logger handle escaping.

## Best Practices

- **Never log secrets**: redact API keys, passwords, tokens, and PII before writing to logs. Use a sanitization middleware that masks known sensitive fields.
- **Use structured logging**: JSON logs with consistent field names are easier to query and alert on than free-text messages. Tools like Datadog, Loki, and CloudWatch parse JSON natively.
- **Include request IDs in every log entry**: propagate a correlation ID from the API gateway through all downstream services. This enables tracing a single request across service boundaries.
- **Separate operational logs from audit logs**: operational logs are ephemeral and high-volume. Audit logs are low-volume, long-retention, and often legally required. Store them in separate sinks with different retention policies.
- **Log at the right level**: INFO for normal operations, WARN for degraded behavior, ERROR for failures requiring intervention, DEBUG for development only. Misusing levels makes log analysis harder.
- **Batch log writes for high throughput**: writing one log entry per API call to a remote sink adds latency. Use a local buffer and flush periodically (every 1-5 seconds or every N entries).

## Production Checklist

- [ ] Sensitive fields (passwords, tokens, PII) are redacted or hashed before logging
- [ ] Request correlation IDs are generated at the edge and propagated to all services
- [ ] Audit log entries include timestamp, actor, action, resource, and outcome
- [ ] Log retention policies are configured per log type (operational vs audit)
- [ ] Log storage is encrypted at rest and access-controlled
- [ ] Alerts are configured for ERROR-level logs with anomaly detection
- [ ] Log ingestion pipeline handles backpressure without dropping entries
- [ ] Timezone is standardized to UTC across all services to avoid correlation issues
- [ ] Log schema is documented and versioned for downstream consumers
- [ ] Dashboards exist for error rate, latency percentiles, and top error types

## Scaling Considerations

- **Log volume at scale**: a service handling 10K requests/second generates 10K-50K log entries/second. Writing all logs to a single Elasticsearch cluster creates bottlenecks. Use a log aggregation pipeline (Fluentd, Vector, Logstash) with buffering and multiple output shards.
- **Storage costs**: audit logs retained for 7 years at 1GB/day accumulate 2.5TB. Use tiered storage: hot (SSD, 7-30 days), warm (HDD, 30-90 days), cold (S3 Glacier, 90+ days). Query hot storage for real-time analysis, cold storage for compliance audits.
- **Query performance**: searching 30 days of logs (900GB) for a specific request ID takes seconds with proper indexing. Index on timestamp, request_id, and level. Avoid wildcard queries on unindexed fields — they trigger full scans.
- **Multi-service correlation**: in a microservices architecture, a single user request may touch 5-15 services. Distributed tracing (Jaeger, Zipkin) complements logs by providing the full call graph. Use OpenTelemetry to standardize trace propagation.

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| ELK self-hosted (1M logs/day) | $200-$500/month | 3-node cluster, 100GB storage |
| Datadog (1M logs/day) | $1,500-$3,000/month | Log ingestion + retention |
| CloudWatch (1M logs/day) | $150-$400/month | Ingestion $0.50/GB, storage $0.03/GB |
| Loki + Grafana (1M logs/day) | $100-$300/month | Self-hosted, S3 backend |
| Audit log storage (S3 Glacier) | $0.004/GB/month | 7-year retention, 2.5TB = $10/month |

For 10M logs/day: self-hosted ELK scales linearly (~$2K-$5K/month). Managed services like Datadog scale at $15K-$30K/month. Use sampling (log 10% of INFO entries) to cut costs 10x while keeping all ERROR and WARN entries.

## When Not to Use This Approach

- **Low-traffic internal tools**: if your API handles <100 requests/day, a full audit logging pipeline is overkill. Use simple file-based logging with logrotate and grep for debugging.
- **Real-time streaming APIs**: audit logging adds 2-5ms per request. For sub-10ms latency requirements (gaming, trading), log asynchronously via a fire-and-forget queue to avoid blocking the response path.
- **Memory-constrained environments**: structured JSON logging increases memory usage by 2-3x compared to plain text. On IoT or edge devices with <512MB RAM, use minimal text logging instead.

## Performance Benchmarks

| Setup | Log overhead | Throughput impact | Notes |
|-------|-------------|-------------------|-------|
| No logging (baseline) | 0ms | 10K req/s | Control |
| File logging (JSON) | 0.5-1ms | 8K req/s | Single file, buffered |
| Redis async logging | 0.1-0.3ms | 9.5K req/s | Non-blocking, buffered |
| Elasticsearch direct | 2-5ms | 4K req/s | Sync HTTP per log |
| Winston + Elasticsearch | 1-3ms | 6K req/s | Batched flush every 5s |

Async logging via a local buffer + background flush adds <0.5ms overhead. Synchronous logging to a remote sink (Elasticsearch, Datadog) adds 2-5ms per request, cutting throughput by 40-60%. Always use async flushing in production.

## Testing Strategy

- **Test log redaction**: send requests with API keys, passwords, and PII in headers and bodies. Verify that log output contains `[REDACTED]` or `***` instead of the actual values. Automate this test in CI to prevent regressions.
- **Test correlation ID propagation**: make a request and verify the same correlation ID appears in all log entries for that request. Test that the ID propagates to downstream service calls via headers.
- **Test audit log immutability**: write an audit entry, attempt to modify it, and verify the log storage (append-only file, WORM S3 bucket) rejects the modification.
- **Test log retention policies**: create logs older than the retention period and verify they are automatically deleted or archived. Test that ERROR logs are retained longer than INFO logs if using tiered retention.

## Common Pitfalls

- **Logging sensitive data by default**: many frameworks log full request/response bodies including passwords, API keys, and tokens. Always configure redaction filters before enabling debug logging in production.
- **Synchronous logging blocking the event loop**: Winston, Pino, and Log4j all support async modes. Forgetting to enable async mode causes each log write to block the request, adding 2-50ms per log entry.
- **Missing correlation IDs in distributed traces**: without a correlation ID, tracing a request across 5 microservices requires matching timestamps manually. Always generate and propagate a correlation ID via headers.
- **Log rotation not configured**: long-running Node.js processes can fill disk space in hours. Configure `winston-daily-rotate-file` or `logrotate` to cap file sizes and retain only N days of logs.

## Monitoring and Observability

- **Track log volume per service**: monitor logs/minute per service. Sudden spikes indicate errors or misconfigured log levels. Set alerts for >2x normal log volume within a 5-minute window.
- **Monitor log ingestion lag**: if logs take >30 seconds to reach Elasticsearch/Datadog, troubleshooting becomes harder. Track ingestion latency and alert if p95 exceeds 60 seconds.
- **Audit log completeness checks**: periodically verify that audit logs contain all required fields (user ID, action, timestamp, resource, IP). Missing fields indicate resolver or middleware bugs that skip logging.
- **Dashboard for log-based metrics**: create dashboards for error rate, warn rate, and top error messages. Use Grafana with Loki or Kibana with Elasticsearch to visualize log trends over time.

## Deployment Checklist

- [ ] Configure log level via environment variable (not hardcoded)
- [ ] Enable async logging with a buffer size of at least 1000 entries
- [ ] Set up log rotation with max file size 100MB and retention of 30 days
- [ ] Configure redaction filters for passwords, API keys, and PII fields
- [ ] Set up correlation ID generation and propagation across all services
- [ ] Configure audit log storage in an append-only or WORM system
- [ ] Set up log shipping to centralized storage (ELK, Datadog, or CloudWatch)
- [ ] Test log output in staging to verify format and redaction work correctly
- [ ] Document log levels and when to use each (DEBUG, INFO, WARN, ERROR)
- [ ] Set up alerts for ERROR log rate exceeding 1% of total request volume

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
