---
contentType: docs
slug: load-test-report-template
title: "Load Test Report Template"
description: "A standardized template for documenting load test results and recommendations."
metaDescription: "Use this load test report template to document performance benchmarks, bottlenecks found, and actionable recommendations after testing."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - load-testing
  - performance
  - template
  - report
relatedResources:
  - /recipes/load-testing-k6
  - /guides/cicd-pipeline-guide
  - /guides/test-driven-development-guide
  - /guides/testing-strategy-guide
  - /recipes/api-contract-testing
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this load test report template to document performance benchmarks, bottlenecks found, and actionable recommendations after testing."
  keywords:
    - testing
    - load-testing
    - performance
    - template
    - report
---
## Overview

Load test reports communicate performance findings to stakeholders and track improvements over time. Without a standard format, teams waste time re-explaining metrics and context. This template provides a consistent structure for documenting benchmarks, bottlenecks, and recommendations.

## When to Use

Use this resource when:
- Reporting results after a scheduled load test cycle
- Sharing performance findings with product managers or executives
- Creating a baseline before a major release or infrastructure change

## Solution

```markdown
# Load Test Report

## 1. Executive Summary

| Field | Value |
|-------|-------|
| Application / Service | `name` |
| Test Date | `YYYY-MM-DD` |
| Environment | `staging / production-like` |
| Tool Used | `k6 / JMeter / Gatling / Locust` |
| Tester | `name` |
| Overall Result | `PASS / PASS with warnings / FAIL` |

- **Goal**: Briefly state what was tested and why.
- **Key Finding**: One-line summary of the most important result.

## 2. Test Scope

- **Endpoints tested**: List URLs or user flows
- **Load profile**: Concurrent users, ramp-up, duration, steady state
- **Data used**: Realistic datasets, anonymized production data, or synthetic

## 3. Results

### Throughput

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Requests/sec | 1,000 | 1,150 | PASS |
| Transactions/sec | 500 | 480 | PASS |

### Latency (ms)

| Percentile | Target | Actual | Status |
|------------|--------|--------|--------|
| p50 | < 100 | 85 | PASS |
| p95 | < 300 | 320 | WARNING |
| p99 | < 500 | 680 | FAIL |

### Error Rate

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| HTTP 5xx | < 0.1% | 0.05% | PASS |
| Timeout | < 0.01% | 0.00% | PASS |

### Resource Utilization

| Resource | Target | Peak | Status |
|----------|--------|------|--------|
| CPU | < 70% | 65% | PASS |
| Memory | < 80% | 82% | WARNING |
| DB Connections | < 80% | 78% | PASS |

## 4. Bottlenecks Identified

1. **Bottleneck**: Database query X takes 400ms under load
   - **Impact**: p99 latency exceeds target
   - **Evidence**: Query plan screenshot, APM trace link
   - **Recommendation**: Add composite index on `(user_id, created_at)`

2. **Bottleneck**: Connection pool exhaustion at 1,200 users
   - **Impact**: 503 errors spike
   - **Evidence**: Pool metrics dashboard link
   - **Recommendation**: Increase pool size from 20 to 40

## 5. Action Items

| Priority | Action | Owner | Due Date |
|----------|--------|-------|----------|
| P0 | Add DB index on query X | @backend-team | 2026-06-28 |
| P1 | Increase connection pool | @devops-team | 2026-06-25 |
| P2 | Evaluate caching layer | @architect | 2026-07-05 |

## 6. Appendices

- Link to test script repository
- Link to raw results / CSV exports
- Link to APM dashboards (Grafana, Datadog)
- Link to incident runbook if follow-up is needed
```

## Explanation

The template separates **summary** (for executives), **details** (for engineers), and **actions** (for planning). The tabular format makes pass/fail status scannable. Bottlenecks link to evidence so reviewers can verify claims. Action items include owners and dates to prevent findings from being forgotten.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Pre-release | Baseline comparison | Include previous release numbers side-by-side |
| Incident recovery | Post-fix validation | Focus on the specific path that failed |
| Capacity planning | Saturation test | Document the breaking point and limiting resource |

## Best Practices

1. Run tests in an environment that mirrors production (hardware, data size, network)
2. Warm up the system before recording metrics to avoid cold-start bias
3. Report percentiles (p50, p95, p99) instead of averages to capture tail latency
4. Include graphs and links to dashboards, not just static numbers
5. Attach the exact test script so the test is reproducible

## Common Mistakes

1. Testing on developer laptops or undersized environments
2. Using tiny datasets that hide real-world query performance
3. Reporting only average latency, which hides p99 degradation
4. Omitting error rates and focusing only on throughput
5. Not assigning owners to action items, so nothing gets fixed

## Frequently Asked Questions

### How do I define targets for latency and throughput?

Targets should come from SLAs, product requirements, or historical baselines. If none exist, use the 80th percentile of current production traffic as a starting point.

### Should I run load tests against production?

Avoid load testing production directly. Use a production-like environment with similar data volume and infrastructure. For read-only endpoints, consider traffic mirroring or shadow testing.

### How often should load tests be repeated?

Before every major release, after significant infrastructure changes, and quarterly as a regression check. Automate nightly smoke tests with small load to catch regressions early.
