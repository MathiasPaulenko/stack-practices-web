---



contentType: docs
slug: logging-standards-document
title: "Logging Standards Document"
description: "A document template for defining structured logging conventions, log levels, retention, and observability requirements across services."
metaDescription: "Define structured logging standards with this document template. Covers levels, formats, fields, retention, sampling, and security guidelines."
difficulty: beginner
topics:
  - observability
  - devops
tags:
  - logging
  - observability
  - structured-logs
  - monitoring
  - standards
relatedResources:
  - /docs/monitoring-alerting-policy-template
  - /docs/runbook-template
  - /recipes/bash-disk-usage-monitor
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define structured logging standards with this document template. Covers levels, formats, fields, retention, sampling, and security guidelines."
  keywords:
    - logging standards
    - structured logging
    - log levels
    - log retention
    - observability logging



---

## Overview

A Logging Standards Document defines how services, applications, and infrastructure produce logs. Consistent logging makes debugging, monitoring, security investigation, and compliance easier. This template covers log levels, structured formats, required fields, retention, sampling, and security rules.

## When to Use


- For alternatives, see [Complete Guide to Observability with the Grafana Stack](/guides/complete-guide-observability-grafana-stack/).

- Onboarding a new service or development team.
- Consolidating logs from multiple systems into a central observability platform.
- Preparing for a security audit or compliance review.
- Investigating a production incident where logs are incomplete or inconsistent.
- Defining a logging strategy for microservices or serverless environments.

## Prerequisites

- A log aggregation platform such as ELK, Splunk, Datadog, Grafana Loki, or CloudWatch.
- A shared timestamp standard and timezone policy.
- A list of critical events that must always be logged.
- Agreement on sensitive data classification and log redaction rules.

## Solution

### Document

#### 1. Log Levels

| Level | Use | Example |
|-------|-----|---------|
| DEBUG | Detailed diagnostic information during development | `cache miss for key user:1234` |
| INFO | Normal application events | `user logged in`, `order completed` |
| WARN | Unexpected but recoverable situations | `connection timeout, retrying` |
| ERROR | Failures that affect operation | `payment gateway returned 500` |
| FATAL | Critical failures requiring immediate attention | `database unavailable, service shutdown` |

Guidelines:
- DEBUG must be off in production by default.
- INFO is the default production level for most services.
- ERROR must trigger an alert or ticket.
- FATAL must page the on-call team.

#### 2. Structured Log Format

All logs must be emitted as JSON with the following required fields:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `timestamp` | ISO 8601 | Event time in UTC | `2026-06-27T14:30:00Z` |
| `level` | string | Log level | `INFO` |
| `service` | string | Service or application name | `payment-service` |
| `environment` | string | Environment | `production` |
| `message` | string | Human-readable summary | `Order 12345 completed` |
| `correlation_id` | string | Request trace ID | `abc-123-def` |
| `span_id` | string | OpenTelemetry span ID | `span-xyz-789` |

Optional fields:
- `user_id`: Identity of the user associated with the event.
- `tenant_id`: Identifier for multi-tenant isolation.
- `duration_ms`: Time taken to complete an operation.
- `error_code`: Stable error code for programmatic handling.
- `source_file`: File and line where the log was emitted.

#### 3. Required Event Categories

| Category | Events to Log | Level |
|----------|---------------|-------|
| Authentication | Login, logout, failed login, MFA challenge | INFO / WARN |
| Authorization | Access denied, permission escalation | WARN |
| Data changes | Create, update, delete on sensitive records | INFO |
| Errors | Exceptions, external failures, retries | ERROR |
| Performance | Slow queries, high latency, timeouts | WARN |
| Security | Suspicious activity, rate limit hits, blocked requests | WARN |
| Operational | Startup, shutdown, configuration changes | INFO |
| Business | Order placed, payment received, workflow completed | INFO |

#### 4. Sensitive Data and Redaction

| Data Type | Logged | Redaction |
|-----------|--------|-----------|
| Passwords | Never | Redact or exclude |
| Credit card numbers | Never | Tokenize or exclude |
| API keys | Never | Redact or exclude |
| Personal names | With approval | Mask if not required |
| Email addresses | Allowed | Partial mask for non-admins |
| IP addresses | Allowed | Allowed for security logs |
| User IDs | Allowed | Allowed |

Rules:
- Never log secrets or credentials.
- Use allowlists for personal data fields.
- Redact or tokenize values before logging.
- Encrypt logs if they contain sensitive data.

#### 5. Retention and Sampling

| Log Type | Retention | Sampling | Notes |
|----------|-----------|----------|-------|
| Application logs | 30 days | 100% | Keep all for debugging |
| Security logs | 1 year | 100% | Compliance requirement |
| Audit logs | 7 years | 100% | Legal and regulatory |
| Debug logs | 7 days | 100% | Only when enabled |
| High-volume trace logs | 14 days | 1% or live | Cost control |

#### 6. Log Aggregation and Transport

| Requirement | Rule |
|-------------|------|
| Transport | Send logs to the central platform with backpressure handling. |
| Ordering | Use timestamps for ordering; tolerate minor clock skew. |
| Buffering | Buffer locally if the collector is unavailable. |
| Encoding | Use UTF-8 JSON. |
| Backups | Replicate critical logs to a secondary storage. |
| Alerting | Route ERROR and FATAL logs to the alerting system. |

## Explanation

Consistent logging transforms noisy text files into searchable, structured data. By defining levels, fields, and retention, teams can correlate events across services, investigate incidents faster, and meet compliance requirements. Structured logs also integrate with tracing and metrics to create a complete observability picture.

## Structured Log Format Example

```json
{
  "timestamp": "2026-07-11T10:55:32.123Z",
  "level": "ERROR",
  "service": "auth-service",
  "environment": "production",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "usr_8f7e6d5c",
  "message": "JWT validation failed",
  "errorCode": "AUTH_JWT_INVALID",
  "context": {
    "endpoint": "/api/v1/auth/verify",
    "method": "POST",
    "statusCode": 401,
    "durationMs": 12,
    "ipAddress": "10.0.1.42",
    "userAgent": "MobileApp/2.3.1"
  },
  "error": {
    "type": "TokenExpiredError",
    "message": "jwt expired",
    "stack": "TokenExpiredError: jwt expired\n    at ..."
  }
}
```

## Log Level Decision Matrix

```text
=== When to Use Each Log Level ===

FATAL   - System cannot continue. Process will exit.
          Examples: config load failure, port binding error, OOM

ERROR   - Operation failed but system continues.
          Examples: request failed, DB query error, external API timeout

WARN    - Unexpected but recoverable condition.
          Examples: retry succeeded, cache miss, deprecated API usage

INFO    - Significant business or operational event.
          Examples: user login, order placed, deployment started

DEBUG   - Diagnostic detail for troubleshooting.
          Examples: variable state, query params, cache contents

TRACE   - Finest-grained execution flow.
          Examples: function entry/exit, loop iteration count

RULES:
  - Production: INFO and above (DEBUG/TRACE off)
  - Staging: DEBUG and above
  - Development: TRACE and above
  - Never log at DEBUG in production unless actively debugging
  - ERROR must be actionable — if it is not, it is INFO
```


## Variants

- **Cloud logging standards**: Tailored for AWS CloudWatch, Azure Monitor, or Google Cloud Logging.
- **Container and Kubernetes logging**: Covers sidecar log shippers, Fluentd, and pod log conventions.
- **Security-focused logging**: Emphasizes audit events, integrity, and tamper detection.
- **Serverless logging**: Addresses short-lived functions, cold starts, and centralized log collection.
- **Mobile or client logging**: Focuses on privacy, batching, and offline buffering.

## What works

- Use a single structured format across all services.
- Include a correlation ID in every request to enable distributed tracing.
- Log outcomes at business boundaries, not every internal step.
- Keep log messages concise and add context as structured fields.
- Avoid logging sensitive data by default.
- Use log levels consistently so alerts are meaningful.
- Review retention policies against cost and compliance needs.
- Test log parsing and alerting rules as part of deployments.

## Common Mistakes

- Logging everything at INFO, making it hard to spot real issues.
- Writing logs as plain text that cannot be parsed automatically.
- Omitting timestamps or using inconsistent formats.
- Including passwords or tokens in logs.
- Not including enough context to reproduce a failure.
- Keeping logs forever and increasing storage costs unnecessarily.
- Not correlating logs across services during an incident.

## FAQs

### Should we log in production at DEBUG level?

No, DEBUG should be off by default. Enable it temporarily for targeted troubleshooting, and disable it when the issue is resolved.

### What is a correlation ID?

A correlation ID is a unique identifier passed through all services that handle a single request. It allows you to group related log entries across a distributed system.

### How do we handle sensitive data in logs?

Use an allowlist approach: only log fields that are explicitly approved, and redact or tokenize sensitive values before they reach the log stream.


### How do we implement correlation IDs in a microservices architecture?

Generate a correlation ID at the API gateway for each incoming request. Propagate it via HTTP headers (e.g., `X-Correlation-Id`). Each downstream service reads the header, includes it in all log entries, and passes it to further downstream calls. For asynchronous messages, include the correlation ID in message metadata. For background jobs, store it in job context. Use middleware or interceptors to automate propagation so developers do not need to handle it manually. Ensure the correlation ID appears in error reports and monitoring alerts.

### What is log sampling and when should we use it?

Log sampling means logging only a percentage of events to reduce volume and cost. Use sampling for high-volume, low-value logs (e.g., health check responses, static asset requests). Never sample ERROR or security logs. Common strategies: random sampling (log 1 in 100), rate-based (log first N per second), or tail-based (log all errors, sample successes). Use tools like Fluentd or Logstash for sampling at the collector level. Document the sampling rate and ensure it does not hide important patterns.

### How do we handle log storage costs?

Control costs through: tiered retention (hot storage for 7-30 days, cold archive for longer), sampling high-volume logs, compressing log files, excluding noisy endpoints from logging, and using structured logging to enable efficient querying. Set up billing alerts for log storage. Review log volume monthly and identify top contributors. Consider using a dedicated log archival solution (S3 Glacier, Azure Archive Storage) for long-term retention instead of expensive hot log platforms.

### What is the difference between logs, metrics, and traces?

Logs are discrete events with timestamps — what happened at a specific moment. Metrics are aggregated measurements over time — CPU usage, request count, error rate. Traces follow a single request across service boundaries — the path and timing of a request through the system. Together they form the three pillars of observability. Logs answer "what happened," metrics answer "how much," and traces answer "where did time go." Use all three for complete observability.

### How do we test logging in CI/CD?

Add tests that verify: log format is valid JSON, required fields are present (timestamp, level, service, correlationId), sensitive data is not logged, log levels are used correctly, and log volume does not exceed thresholds. Use a test use that captures log output and validates it against the schema. Run log parsing tests to ensure the aggregation pipeline can ingest the logs. Include logging tests in the deployment checklist.






























End of document. Review and update quarterly.