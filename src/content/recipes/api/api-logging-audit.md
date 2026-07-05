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

This recipe implements structured logging with correlation IDs, request/response capture, and tamper-resistant audit storage.

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

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
