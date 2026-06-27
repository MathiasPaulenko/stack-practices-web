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
  - /docs/devops/monitoring-alerting-policy-template
  - /docs/devops/incident-response-plan-template
  - /docs/devops/runbook-template
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
| High-volume trace logs | 14 days | 1% or dynamic | Cost control |

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

## Variants

- **Cloud logging standards**: Tailored for AWS CloudWatch, Azure Monitor, or Google Cloud Logging.
- **Container and Kubernetes logging**: Covers sidecar log shippers, Fluentd, and pod log conventions.
- **Security-focused logging**: Emphasizes audit events, integrity, and tamper detection.
- **Serverless logging**: Addresses short-lived functions, cold starts, and centralized log collection.
- **Mobile or client logging**: Focuses on privacy, batching, and offline buffering.

## Best Practices

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
