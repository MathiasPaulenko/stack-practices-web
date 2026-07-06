---
contentType: docs
slug: incident-postmortem-template
title: "Incident Postmortem Template"
description: "A blameless postmortem template for documenting incidents: timeline, impact, root cause, contributing factors, and action items with owners."
metaDescription: "Use this blameless incident postmortem template to document timeline, impact, root cause, contributing factors, and trackable action items with owners."
difficulty: intermediate
topics:
  - testing
tags:
  - observability
  - postmortem
  - incident
  - template
  - blameless
  - root-cause
  - sre
relatedResources:
  - /docs/observability/alert-runbook-template
  - /docs/observability/dashboard-design-template
  - /docs/observability/observability-maturity-assessment-template
  - /guides/observability/complete-guide-structured-logging
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this blameless incident postmortem template to document timeline, impact, root cause, contributing factors, and trackable action items with owners."
  keywords:
    - incident postmortem
    - blameless postmortem
    - root cause analysis
    - incident report
    - template
    - sre
    - action items
---

## Overview

A postmortem is a written record of an incident: what happened, why it happened, how it was resolved, and what will change to prevent recurrence. The postmortem process is blameless — it focuses on systemic causes, not individual mistakes. This template ensures consistent, actionable postmortems across the organization.

## When to Use

- After any P0 or P1 incident (required within 48 hours)
- After recurring P2 incidents (third occurrence triggers postmortem)
- After near-miss events that could have caused significant impact
- After security incidents or data breaches
- For compliance and audit requirements

## Solution

```markdown
# Incident Postmortem: `<Incident ID>`

## Incident Summary

| Field | Value |
|-------|-------|
| Incident ID | INC-2026-07-05-001 |
| Title | Payment service outage during checkout peak |
| Severity | P0 |
| Status | Resolved |
| Date | 2026-07-05 |
| Start Time | 14:32 UTC |
| Detection Time | 14:35 UTC (3 min to detect) |
| Mitigation Time | 14:52 UTC (20 min to mitigate) |
| Resolution Time | 15:48 UTC (76 min total) |
| Incident Commander | <Name> |
| Postmortem Author | <Name> |
| Postmortem Reviewers | <Tech Lead>, <SRE Lead> |
| Affected Services | Payment Service, Checkout Service |
| Affected Users | ~12,000 active users |
| Revenue Impact | ~$45,000 lost orders |

## Impact Summary

### User-Facing Impact

| Impact | Duration | Affected Users |
|--------|----------|----------------|
| Checkout page returned 500 error | 20 minutes (14:32-14:52) | ~12,000 |
| Payment processing failed | 20 minutes | ~3,500 attempted checkouts |
| Order confirmation emails delayed | 76 minutes | ~1,200 orders queued |
| Refund processing delayed | 76 minutes | ~50 pending refunds |

### Business Impact

| Metric | Normal | During Incident | Impact |
|--------|--------|-----------------|--------|
| Orders per minute | 180 | 0 (for 20 min) | 3,600 lost orders |
| Revenue per minute | $2,250 | $0 (for 20 min) | $45,000 lost revenue |
| Support tickets | 5/hour | 85/hour | 80 extra tickets |
| Customer complaints | 2/hour | 45/hour | 43 extra complaints |
| NPS impact | — | -8 points (estimated) | Survey in 1 week |

### SLO Impact

| SLO | Target | Current (30d) | Before Incident | After Incident | Budget Consumed |
|-----|--------|---------------|-----------------|----------------|-----------------|
| Availability | 99.9% | 99.85% | 99.92% | 99.85% | 70% of monthly budget |
| Latency p95 | < 500ms | 680ms | 420ms | 680ms | N/A (separate SLO) |

## Timeline

| Time (UTC) | Event | Source |
|------------|-------|--------|
| 14:30 | Deployment v2.5.0 goes live — includes new payment provider integration | CI/CD pipeline |
| 14:32 | Error rate spikes from 0.1% to 45% on `/api/v1/payments` endpoint | Prometheus alert |
| 14:35 | PagerDuty alert fires: `HighErrorRate-PaymentService` | Alertmanager |
| 14:36 | On-call engineer acknowledges alert | PagerDuty |
| 14:38 | On-call engineer checks Grafana dashboard — sees 500 errors on payment endpoint | Grafana |
| 14:40 | On-call engineer checks logs — sees `TypeError: Cannot read property 'id' of undefined` in payment service | Kibana |
| 14:42 | On-call engineer identifies new deployment as likely cause — checks `#deployments` channel | Slack |
| 14:44 | On-call engineer confirms v2.5.0 deployed at 14:30, 2 minutes before errors started | CI/CD logs |
| 14:46 | On-call engineer escalates to secondary on-call for rollback support | PagerDuty |
| 14:48 | Decision made to roll back to v2.4.1 | Incident channel |
| 14:50 | Rollback initiated: `kubectl rollout undo deployment/payment` | Terminal |
| 14:52 | Rollback complete — error rate drops to 0.1% | Grafana |
| 14:55 | Error rate confirmed normal for 3 consecutive minutes | Grafana |
| 15:00 | Incident downgraded from P0 to P1 — monitoring for residual issues | Incident channel |
| 15:15 | Order confirmation email queue processing begins — 1,200 emails queued | Email service |
| 15:30 | Email queue cleared — all confirmations sent | Email service |
| 15:48 | All pending refunds processed — incident fully resolved | Payment service |
| 16:00 | Incident declared resolved in PagerDuty | PagerDuty |
| 16:30 | Postmortem scheduled for 2026-07-06 10:00 UTC | Calendar |

## Root Cause Analysis

### What Happened

Deployment v2.5.0 introduced a new payment provider integration. The new code expected the payment provider's API to always return a `transaction.id` field in the response. However, for certain card types (Amex, Discover), the provider returns the transaction ID in a nested object: `transaction.metadata.transaction_id`. The code accessed `transaction.id` directly, which was `undefined` for these card types, causing a `TypeError` that crashed the request handler.

### Why It Happened

| Factor | Detail |
|--------|--------|
| Insufficient test coverage | Integration tests used mocked responses that always included `transaction.id`. No test covered the nested response format. |
| No contract testing | The payment provider's API documentation was not verified against actual responses. No contract test validated the response schema. |
| Missing defensive coding | The code did not validate the response structure before accessing nested fields. No null check on `transaction.id`. |
| Inadequate canary deployment | The deployment went to 100% of traffic immediately. No canary or gradual rollout was configured. |
| No feature flag | The new payment provider integration was not behind a feature flag. It could not be disabled without a rollback. |

### Five Whys Analysis

1. **Why did the payment service return 500 errors?**
   The code threw a `TypeError` when accessing `transaction.id` on undefined.

2. **Why was `transaction.id` undefined?**
   The payment provider returns transaction IDs in `transaction.metadata.transaction_id` for Amex and Discover cards, not in `transaction.id`.

3. **Why didn't tests catch this?**
   Integration tests used mocked responses that always included `transaction.id`. No test used the actual response format for non-Visa/Mastercard types.

4. **Why wasn't the actual response format verified?**
   No contract testing was set up between the payment service and the payment provider. The team relied on API documentation, which was outdated.

5. **Why did the deployment affect all users immediately?**
   No canary deployment or gradual rollout was configured. The deployment went to 100% of traffic in one step.

### Contributing Factors

| Factor | Impact | Category |
|--------|--------|----------|
| Deployment during peak hours (14:30 UTC) | Maximized user impact | Process |
| No deployment freeze during peak window | Allowed risky deploy during high traffic | Policy |
| Alert threshold too high (5% error rate) | 3-minute detection delay | Monitoring |
| No synthetic check for payment flow | No proactive detection before users hit errors | Monitoring |
| Email queue backed up | Delayed order confirmations for 76 minutes | Architecture |
| Single payment provider | No fallback when integration broke | Architecture |

## What Went Well

- [x] Alert fired within 3 minutes of error start
- [x] On-call engineer acknowledged within 1 minute
- [x] Root cause identified within 10 minutes
- [x] Rollback decision made within 16 minutes
- [x] Rollback completed within 20 minutes
- [x] Communication in incident channel was clear and timely
- [x] No data corruption — all orders were preserved in the database

## What Went Wrong

- [x] Deployment went to 100% traffic without canary
- [x] Tests did not cover non-Visa/Mastercard response formats
- [x] No contract testing with payment provider
- [x] No feature flag to disable new integration without rollback
- [x] Email queue had no backpressure mechanism — 1,200 emails delayed
- [x] Alert threshold at 5% meant 3 minutes of errors before alerting

## Where We Got Lucky

- [x] The rollback was fast because the previous version was still available
- [x] The error was consistent and easy to reproduce — diagnosis was straightforward
- [x] No data was lost — orders were saved to the database before the crash
- [x] The payment provider was not down — only our integration was broken

## Action Items

| # | Action | Type | Owner | Priority | Due Date | Status |
|---|--------|------|-------|----------|----------|--------|
| 1 | Add contract tests for payment provider API responses | Prevent | Backend team | High | 2026-07-12 | Open |
| 2 | Add test cases for Amex, Discover, and other card types | Prevent | Backend team | High | 2026-07-10 | Open |
| 3 | Implement canary deployment for payment service | Prevent | Platform team | High | 2026-07-19 | Open |
| 4 | Add feature flag for new payment provider integration | Prevent | Backend team | Medium | 2026-07-15 | Open |
| 5 | Lower error rate alert threshold from 5% to 2% | Improve | SRE team | Medium | 2026-07-08 | Open |
| 6 | Add synthetic check for payment flow (every 1 min) | Improve | SRE team | Medium | 2026-07-12 | Open |
| 7 | Implement backpressure in email queue | Improve | Platform team | Low | 2026-07-26 | Open |
| 8 | Add deployment freeze policy for peak hours (9-18 UTC) | Process | Eng Manager | Medium | 2026-07-10 | Open |
| 9 | Update runbook with canary deployment procedure | Process | SRE team | Low | 2026-07-19 | Open |
| 10 | Evaluate secondary payment provider as fallback | Architect | Backend team | Low | 2026-08-05 | Open |

### Action Item Categories

| Category | Description | Count |
|----------|-------------|-------|
| Prevent | Prevent this specific issue from recurring | 4 |
| Improve | Improve detection, response, or mitigation | 3 |
| Process | Improve processes or policies | 2 |
| Architect | Architectural changes to reduce blast radius | 1 |

## Lessons Learned

### Technical Lessons

1. **Mock responses must match real API behavior** — Mocked tests gave false confidence. Contract tests against the real API would have caught the schema mismatch.
2. **Canary deployments catch integration bugs** — A 5% canary would have affected ~600 users instead of 12,000.
3. **Feature flags enable instant rollback** — A feature flag would have disabled the new integration in seconds, no deployment rollback needed.
4. **Synthetic checks detect issues before users** — A synthetic check hitting the payment flow every minute would have detected the error before real users.

### Process Lessons

1. **Deployment timing matters** — Deploying during peak hours maximizes impact. A deployment freeze during peak hours is a simple policy change.
2. **Alert thresholds should be tuned** — A 5% error rate threshold is too high for a critical service. 2% would have alerted 2 minutes earlier.
3. **Backpressure prevents cascading failures** — The email queue backed up because there was no backpressure mechanism. This extended the incident beyond the service recovery.

## Appendix

### Error Logs (Excerpt)

```
2026-07-05T14:32:01.234Z ERROR [payment-service] TypeError: Cannot read properties of undefined (reading 'id')
    at processPaymentResponse (payment.js:142)
    at handlePayment (payment.js:87)
    at async processCheckout (checkout.js:34)
    at async <anonymous> (server.js:156)
  transactionId: undefined
  cardType: "amex"
  requestId: "req-abc123"
```

### Alert Configuration

```yaml
- alert: HighErrorRate-PaymentService
  expr: |
    rate(http_requests_total{service="payment",status=~"5.."}[5m])
    /
    rate(http_requests_total{service="payment"}[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
```

### Deployment Details

| Field | Value |
|-------|-------|
| Deployed Version | v2.5.0 |
| Previous Version | v2.4.1 |
| Deploy Method | kubectl apply (100% rollout) |
| Deploy Time | 14:30 UTC |
| Changes | New payment provider integration (Stripe → Adyen) |
| PR | #1234 |
| Reviewed By | 2 reviewers |
| CI Status | All checks passed |
```

## Explanation

A blameless postmortem focuses on systemic causes, not individual actions. The engineer who deployed the code did not intend to break production. The system allowed a risky deployment to reach all users without adequate testing. The postmortem identifies what systemic changes would have prevented the incident.

The timeline is the factual record of what happened and when. It should be built from objective sources: PagerDuty logs, CI/CD records, chat messages, and monitoring data. Avoid subjective interpretations in the timeline.

The five whys analysis digs past symptoms to root causes. Each "why" should dig deeper into the systemic cause. The goal is to reach a cause that, if addressed, would have prevented the incident entirely.

Action items are the output that matters. Each action item should have an owner, priority, and due date. Review action items from previous postmortems before starting a new one — recurring action items indicate a systemic problem with follow-through.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Security incident | Add CVE, attack vector, data exposure details | Follow security IR plan |
| Data loss incident | Add data recovery steps, backup verification | Include data integrity checks |
| Third-party outage | Add vendor communication timeline | Include vendor status page timeline |
| Near-miss | Skip impact section, focus on prevention | No user impact to document |
| Multi-service incident | Add service dependency map | Show cascade path |

## What Works

1. Write postmortems within 48 hours — details fade quickly
2. Keep them blameless — focus on systems, not people
3. Include a timeline from objective sources — PagerDuty, CI/CD, monitoring
4. Assign action items with owners and due dates — unowned items don't get done
5. Review previous action items — recurring items signal a follow-through problem
6. Share postmortems broadly — other teams learn from your incidents
7. Track action item completion rate — a postmortem without completed actions is theater

## Common Mistakes

1. Blaming individuals — "the engineer should have tested more" is not a root cause
2. Vague action items — "improve testing" without specifics and owners goes nowhere
3. No follow-up on action items — postmortems without accountability are wasted effort
4. Writing postmortems too late — memories fade, timelines become inaccurate
5. Focusing only on prevention — detection and mitigation improvements are equally important
6. Skipping "what went well" — acknowledging good responses reinforces them
7. Making postmortems private — sharing across teams prevents similar incidents elsewhere

## Frequently Asked Questions

### When should we write a postmortem?

For all P0 and P1 incidents, within 48 hours of resolution. For P2 incidents, write one if the issue is recurring (third occurrence). For near-misses, write one if the potential impact would have been P0 or P1.

### How long should a postmortem be?

Long enough to capture all relevant information, short enough that people will read it. Typically 2-4 pages. The timeline and action items are the most important sections. Keep the narrative concise.

### Who should write the postmortem?

The incident commander or a participant who was involved from detection to resolution. The author should not be the person who caused the incident (if applicable) — this reduces bias. The author should have firsthand knowledge of the incident.

### What makes a postmortem blameless?

Focus on systemic causes: missing tests, inadequate monitoring, process gaps. Never name individuals as causes. Instead of "John deployed without testing," write "the deployment process did not require integration tests for API changes." The system allowed the mistake to reach production.

### How do we ensure action items get done?

Assign owners and due dates. Review action items in weekly engineering meetings. Track completion rate as a metric. If action items are consistently overdue, escalate to engineering management. Uncompleted action items from previous postmortems should be reviewed before starting new ones.
