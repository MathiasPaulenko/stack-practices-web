---
contentType: docs
slug: incident-postmortem-template
title: "Plantilla de Postmortem de Incidentes"
description: "Una plantilla de postmortem blameless para documentar incidentes: timeline, impact, root cause, contributing factors y action items con owners."
metaDescription: "Usá esta plantilla de postmortem blameless para documentar timeline, impact, root cause, contributing factors y action items trackeables con owners."
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
  metaDescription: "Usá esta plantilla de postmortem blameless para documentar timeline, impact, root cause, contributing factors y action items trackeables con owners."
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

Un postmortem es un written record de un incident: qué pasó, por qué pasó, cómo se resolvió y qué va a cambiar para prevenir recurrence. El postmortem process es blameless — focus en systemic causes, no individual mistakes. Esta plantilla asegura consistent, actionable postmortems across la organization.

## When to Use

- Después de cualquier P0 o P1 incident (required within 48 hours)
- Después de recurring P2 incidents (third occurrence triggerea postmortem)
- Después de near-miss events que podrían haber caused significant impact
- Después de security incidents o data breaches
- Para compliance y audit requirements

## Solution

```markdown
# Incident Postmortem: `<Incident ID>`

## Incident Summary

| Field | Value |
|-------|-------|
| Incident ID | INC-2026-07-05-001 |
| Title | Payment service outage durante checkout peak |
| Severity | P0 |
| Status | Resolved |
| Date | 2026-07-05 |
| Start Time | 14:32 UTC |
| Detection Time | 14:35 UTC (3 min para detectar) |
| Mitigation Time | 14:52 UTC (20 min para mitigar) |
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
| Checkout page returneó 500 error | 20 minutes (14:32-14:52) | ~12,000 |
| Payment processing failó | 20 minutes | ~3,500 attempted checkouts |
| Order confirmation emails delayed | 76 minutes | ~1,200 orders queued |
| Refund processing delayed | 76 minutes | ~50 pending refunds |

### Business Impact

| Metric | Normal | During Incident | Impact |
|--------|--------|-----------------|--------|
| Orders per minute | 180 | 0 (por 20 min) | 3,600 lost orders |
| Revenue per minute | $2,250 | $0 (por 20 min) | $45,000 lost revenue |
| Support tickets | 5/hour | 85/hour | 80 extra tickets |
| Customer complaints | 2/hour | 45/hour | 43 extra complaints |
| NPS impact | — | -8 points (estimated) | Survey en 1 week |

### SLO Impact

| SLO | Target | Current (30d) | Before Incident | After Incident | Budget Consumed |
|-----|--------|---------------|-----------------|----------------|-----------------|
| Availability | 99.9% | 99.85% | 99.92% | 99.85% | 70% del monthly budget |
| Latency p95 | < 500ms | 680ms | 420ms | 680ms | N/A (separate SLO) |

## Timeline

| Time (UTC) | Event | Source |
|------------|-------|--------|
| 14:30 | Deployment v2.5.0 goes live — incluye new payment provider integration | CI/CD pipeline |
| 14:32 | Error rate spikea de 0.1% a 45% en `/api/v1/payments` endpoint | Prometheus alert |
| 14:35 | PagerDuty alert firea: `HighErrorRate-PaymentService` | Alertmanager |
| 14:36 | On-call engineer acknowledgea alert | PagerDuty |
| 14:38 | On-call engineer checkea Grafana dashboard — ve 500 errors en payment endpoint | Grafana |
| 14:40 | On-call engineer checkea logs — ve `TypeError: Cannot read property 'id' of undefined` en payment service | Kibana |
| 14:42 | On-call engineer identify que new deployment es likely cause — checkea `#deployments` channel | Slack |
| 14:44 | On-call engineer confirma v2.5.0 deployeado at 14:30, 2 minutes antes de errors empezar | CI/CD logs |
| 14:46 | On-call engineer escala a secondary on-call para rollback support | PagerDuty |
| 14:48 | Decision made de roll back a v2.4.1 | Incident channel |
| 14:50 | Rollback initiated: `kubectl rollout undo deployment/payment` | Terminal |
| 14:52 | Rollback complete — error rate baja a 0.1% | Grafana |
| 14:55 | Error rate confirmed normal por 3 consecutive minutes | Grafana |
| 15:00 | Incident downgraded de P0 a P1 — monitoreando por residual issues | Incident channel |
| 15:15 | Order confirmation email queue processing empieza — 1,200 emails queued | Email service |
| 15:30 | Email queue cleared — all confirmations sent | Email service |
| 15:48 | All pending refunds processed — incident fully resolved | Payment service |
| 16:00 | Incident declared resolved en PagerDuty | PagerDuty |
| 16:30 | Postmortem scheduled para 2026-07-06 10:00 UTC | Calendar |

## Root Cause Analysis

### What Happened

Deployment v2.5.0 introdujo un new payment provider integration. El new code esperaba que el payment provider's API siempre returnee un `transaction.id` field en el response. Sin embargo, para certain card types (Amex, Discover), el provider returnea el transaction ID en un nested object: `transaction.metadata.transaction_id`. El code accedió `transaction.id` directly, que era `undefined` para estos card types, causando un `TypeError` que crasheó el request handler.

### Why It Happened

| Factor | Detail |
|--------|--------|
| Insufficient test coverage | Integration tests usaron mocked responses que siempre incluyeron `transaction.id`. Ningún test coverió el nested response format. |
| No contract testing | El payment provider's API documentation no se verified contra actual responses. Ningún contract test validated el response schema. |
| Missing defensive coding | El code no validated el response structure antes de accessing nested fields. No null check en `transaction.id`. |
| Inadequate canary deployment | El deployment fue a 100% de traffic inmediatamente. No canary o gradual rollout was configured. |
| No feature flag | La new payment provider integration no estaba detrás de un feature flag. No podía ser disabled sin un rollback. |

### Five Whys Analysis

1. **¿Por qué el payment service returneó 500 errors?**
   El code throweó un `TypeError` cuando accedió `transaction.id` en undefined.

2. **¿Por qué `transaction.id` era undefined?**
   El payment provider returnea transaction IDs en `transaction.metadata.transaction_id` para Amex y Discover cards, no en `transaction.id`.

3. **¿Por qué los tests no catchearon esto?**
   Integration tests usaron mocked responses que siempre incluyeron `transaction.id`. Ningún test usó el actual response format para non-Visa/Mastercard types.

4. **¿Por qué el actual response format no se verified?**
   No contract testing se seteó up entre el payment service y el payment provider. El team relied en API documentation, que era outdated.

5. **¿Por qué el deployment affectó a all users inmediatamente?**
   No canary deployment o gradual rollout se configured. El deployment fue a 100% de traffic en un step.

### Contributing Factors

| Factor | Impact | Category |
|--------|--------|----------|
| Deployment durante peak hours (14:30 UTC) | Maximizó user impact | Process |
| No deployment freeze durante peak window | Allow risky deploy durante high traffic | Policy |
| Alert threshold too high (5% error rate) | 3-minute detection delay | Monitoring |
| No synthetic check para payment flow | No proactive detection antes de users hittear errors | Monitoring |
| Email queue backed up | Delayed order confirmations por 76 minutes | Architecture |
| Single payment provider | No fallback cuando integration se rompió | Architecture |

## What Went Well

- [x] Alert fireó within 3 minutes de error start
- [x] On-call engineer acknowledgeó within 1 minute
- [x] Root cause identified within 10 minutes
- [x] Rollback decision made within 16 minutes
- [x] Rollback completed within 20 minutes
- [x] Communication en incident channel fue clear y timely
- [x] No data corruption — all orders se preserved en el database

## What Went Wrong

- [x] Deployment fue a 100% traffic sin canary
- [x] Tests no coverieron non-Visa/Mastercard response formats
- [x] No contract testing con payment provider
- [x] No feature flag para disablear new integration sin rollback
- [x] Email queue no tenía backpressure mechanism — 1,200 emails delayed
- [x] Alert threshold at 5% significó 3 minutes de errors antes de alerting

## Where We Got Lucky

- [x] El rollback fue fast porque el previous version todavía estaba available
- [x] El error fue consistent y easy de reproducir — diagnosis fue straightforward
- [x] No data se lost — orders se savearon al database antes del crash
- [x] El payment provider no estaba down — solo nuestra integration estaba broken

## Action Items

| # | Action | Type | Owner | Priority | Due Date | Status |
|---|--------|------|-------|----------|----------|--------|
| 1 | Addeá contract tests para payment provider API responses | Prevent | Backend team | High | 2026-07-12 | Open |
| 2 | Addeá test cases para Amex, Discover y otros card types | Prevent | Backend team | High | 2026-07-10 | Open |
| 3 | Implementá canary deployment para payment service | Prevent | Platform team | High | 2026-07-19 | Open |
| 4 | Addeá feature flag para new payment provider integration | Prevent | Backend team | Medium | 2026-07-15 | Open |
| 5 | Lowerá error rate alert threshold de 5% a 2% | Improve | SRE team | Medium | 2026-07-08 | Open |
| 6 | Addeá synthetic check para payment flow (every 1 min) | Improve | SRE team | Medium | 2026-07-12 | Open |
| 7 | Implementá backpressure en email queue | Improve | Platform team | Low | 2026-07-26 | Open |
| 8 | Addeá deployment freeze policy para peak hours (9-18 UTC) | Process | Eng Manager | Medium | 2026-07-10 | Open |
| 9 | Updateá runbook con canary deployment procedure | Process | SRE team | Low | 2026-07-19 | Open |
| 10 | Evaluá secondary payment provider como fallback | Architect | Backend team | Low | 2026-08-05 | Open |

### Action Item Categories

| Category | Description | Count |
|----------|-------------|-------|
| Prevent | Prevenir este specific issue de recurring | 4 |
| Improve | Improvear detection, response o mitigation | 3 |
| Process | Improvear processes o policies | 2 |
| Architect | Architectural changes para reducir blast radius | 1 |

## Lessons Learned

### Technical Lessons

1. **Mock responses deben matchear real API behavior** — Mocked tests dieron false confidence. Contract tests contra el real API habrían catcheado el schema mismatch.
2. **Canary deployments catchean integration bugs** — Un 5% canary habría affected ~600 users en vez de 12,000.
3. **Feature flags enablean instant rollback** — Un feature flag habría disabled el new integration en seconds, no deployment rollback needed.
4. **Synthetic checks detectan issues antes de users** — Un synthetic check hitteando el payment flow every minute habría detectado el error antes de real users.

### Process Lessons

1. **Deployment timing matters** — Deployear durante peak hours maximiza impact. Un deployment freeze durante peak hours es un simple policy change.
2. **Alert thresholds deberían ser tuned** — Un 5% error rate threshold es too high para un critical service. 2% habría alerteado 2 minutes earlier.
3. **Backpressure previene cascading failures** — El email queue se backed up porque no había backpressure mechanism. Esto extendió el incident más allá del service recovery.

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

Un blameless postmortem focus en systemic causes, no individual actions. El engineer que deployeó el code no intended romper production. El system allow un risky deployment a reach all users sin adequate testing. El postmortem identify qué systemic changes habrían prevented el incident.

El timeline es el factual record de qué pasó y cuándo. Debería ser built desde objective sources: PagerDuty logs, CI/CD records, chat messages y monitoring data. Avoid subjective interpretations en el timeline.

El five whys analysis diggea past symptoms a root causes. Cada "why" debería dig deeper en el systemic cause. El goal es reach un cause que, si addressed, habría prevented el incident entirely.

Action items son el output que matters. Cada action item debería tener un owner, priority y due date. Revieweá action items de previous postmortems antes de empezar un new one — recurring action items indican un systemic problem con follow-through.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Security incident | Addeá CVE, attack vector, data exposure details | Seguí security IR plan |
| Data loss incident | Addeá data recovery steps, backup verification | Incluí data integrity checks |
| Third-party outage | Addeá vendor communication timeline | Incluí vendor status page timeline |
| Near-miss | Skippeá impact section, focus en prevention | No user impact para document |
| Multi-service incident | Addeá service dependency map | Mostrá cascade path |

## What Works

1. Escribí postmortems within 48 hours — details fadean quickly
2. Mantenelos blameless — focus en systems, no people
3. Incluí un timeline desde objective sources — PagerDuty, CI/CD, monitoring
4. Assigná action items con owners y due dates — unowned items no se hacen
5. Revieweá previous action items — recurring items signalan un follow-through problem
6. Shareá postmortems broadly — otros teams learn de tus incidents
7. Trackeá action item completion rate — un postmortem sin completed actions es theater

## Common Mistakes

1. Blamear individuals — "el engineer debería haber testeado más" no es un root cause
2. Vague action items — "improveá testing" sin specifics y owners no va a ningún lado
3. No follow-up en action items — postmortems sin accountability son wasted effort
4. Escribir postmortems too late — memories fadean, timelines se vuelven inaccurate
5. Focus solo en prevention — detection y mitigation improvements son equally important
6. Skipear "what went well" — acknowledging good responses los reinforcea
7. Hacer postmortems private — sharear across teams previene similar incidents elsewhere

## Frequently Asked Questions

### ¿Cuándo deberíamos escribir un postmortem?

Para all P0 y P1 incidents, within 48 hours de resolution. Para P2 incidents, escribí uno si el issue es recurring (third occurrence). Para near-misses, escribí uno si el potential impact habría sido P0 o P1.

### ¿Qué tan largo debería ser un postmortem?

Largo enough para capture all relevant information, corto enough que people lo van a read. Típicamente 2-4 pages. El timeline y action items son las most important sections. Mantené el narrative concise.

### ¿Quién debería escribir el postmortem?

El incident commander o un participant que estuvo involved desde detection a resolution. El author no debería ser la person que caused el incident (si applicable) — esto reduce bias. El author debería tener firsthand knowledge del incident.

### ¿Qué hace un postmortem blameless?

Focus en systemic causes: missing tests, inadequate monitoring, process gaps. Nunca names individuals como causes. En vez de "John deployeó sin testing," escribí "el deployment process no required integration tests para API changes." El system allow el mistake a reach production.

### ¿Cómo aseguramos que action items se hagan?

Assigná owners y due dates. Revieweá action items en weekly engineering meetings. Trackeá completion rate como metric. Si action items son consistently overdue, escalateá a engineering management. Uncompleted action items de previous postmortems deberían ser reviewed antes de empezar new ones.
