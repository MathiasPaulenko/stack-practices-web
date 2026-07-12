---



contentType: docs
slug: alert-runbook-template
title: "Plantilla de Runbook de Alertas"
description: "Un runbook estandarizado para responder alertas: triage, diagnosis, mitigation, resolution y post-incident steps con escalation paths."
metaDescription: "Usá esta plantilla de runbook de alertas para estandarizar incident response con triage, diagnosis, mitigation, resolution, escalation paths y contacts."
difficulty: intermediate
topics:
  - testing
tags:
  - observability
  - runbook
  - alerting
  - incident-response
  - template
  - on-call
  - sre
relatedResources:
  - /docs/observability-maturity-assessment-template
  - /docs/dashboard-design-template
  - /docs/incident-postmortem-template
  - /guides/complete-guide-structured-logging
  - /docs/etl-job-runbook-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá esta plantilla de runbook de alertas para estandarizar incident response con triage, diagnosis, mitigation, resolution, escalation paths y contacts."
  keywords:
    - alert runbook
    - incident response
    - on-call
    - runbook template
    - alerting
    - sre
    - escalation



---

## Overview

Un alert runbook le da a on-call engineers un structured playbook para responder a un specific alert. Sin un runbook, engineers wastean time figurando qué el alert means, dónde mirar y qué hacer. Esta plantilla estandariza incident response: triage, diagnose, mitigate, resolve y document.

## When to Use


- For alternatives, see [Incident Postmortem Template](/es/docs/incident-postmortem-template/).

- Creando runbooks para los top 20 most frequent o critical alerts
- Onboardéando new on-call engineers
- Estandarizando incident response across teams
- SRE maturity improvement initiatives
- Compliance requirements para documented incident procedures

## Solution

```markdown
# Alert Runbook: `<Alert Name>`

## Alert Metadata

| Field | Value |
|-------|-------|
| Alert Name | HighErrorRate-PaymentService |
| Severity | Critical (P1) |
| Alert Source | Prometheus / Alertmanager |
| Alert Query | `rate(http_requests_total{service="payment",status=~"5.."}[5m]) / rate(http_requests_total{service="payment"}[5m]) > 0.05` |
| Trigger Condition | Error rate > 5% por 5 minutes |
| Routing | PagerDuty → Payment Team On-Call |
| Runbook Owner | Payment Team |
| Last Reviewed | 2026-07-05 |
| Last Updated | 2026-07-05 |

## Impact Assessment

| User Impact | Business Impact |
|-------------|-----------------|
| Users no pueden completar payments | Revenue loss ~$2,000/min durante peak |
| Checkout page muestra error message | Customer support tickets aumentan |
| Retry attempts pueden success para transient errors | Reputation damage si prolonged |

## Triage (0-2 minutes)

### Step 1: Acknowledge el Alert

- [ ] Acknowledgeá en PagerDuty within 2 minutes
- [ ] Posteá en `#payment-incidents` Slack channel: "Investigating HighErrorRate-PaymentService"
- [ ] Checkeá si es un known false positive (checkeá recent alert history)

### Step 2: Assess Severity

| Question | If Yes |
|----------|--------|
| ¿Error rate > 20%? | Escalateá a P0, pageá secondary on-call |
| ¿Es durante peak hours (9-18 UTC)? | Higher priority, revenue impact es greater |
| ¿Hay related alerts fireando? | Checkeá cascade — puede ser un shared dependency |
| ¿Es un new deployment? | Checkeá #deployments channel para recent release |
| ¿Es un known maintenance window? | Checkeá #maintenance channel |

### Step 3: Quick Checks

| Check | How | Expected |
|-------|-----|----------|
| Service health | `curl https://api.example.com/health` | 200 OK |
| Recent deployment | Checkeá `#deployments` channel | Last deploy > 30 min ago |
| Database connectivity | Checkeá Grafana → Payment DB panel | Connections < 80% pool |
| Payment provider status | Checkeá https://status.stripe.com | All systems operational |
| Error logs | `kubectl logs -l app=payment --tail=100` | Lookéa por repeated error patterns |

## Diagnosis (2-15 minutes)

### Step 4: Identify Error Type

Checkeá el Grafana dashboard para el payment service: [Payment Service Dashboard](https://grafana.example.com/d/payment-service)

| Error Pattern | Likely Cause | Next Step |
|---------------|-------------|-----------|
| 500 Internal Server Error | Application bug o unhandled exception | Go to Step 5A |
| 502 Bad Gateway | Service está down o no responde | Go to Step 5B |
| 503 Service Unavailable | Pod crashes o OOM kills | Go to Step 5C |
| 504 Gateway Timeout | Database slowness o external API timeout | Go to Step 5D |
| 429 Too Many Requests | Rate limiting desde payment provider | Go to Step 5E |

### Step 5A: Application Bug (500 Errors)

1. Checkeá error logs por stack traces:
   ```bash
   kubectl logs -l app=payment --tail=200 | grep -A 20 "Error\|Exception\|stack"
   ```
2. Searcheá el error en Sentry: [Sentry Payment Project](https://sentry.example.com/projects/payment/)
3. Checkeá si un new code deployment introdujo el bug:
   ```bash
   kubectl rollout history deployment/payment
   ```
4. Si new deployment causó el error, roll back:
   ```bash
   kubectl rollout undo deployment/payment
   ```
5. Verificá que error rate baje después de rollback

### Step 5B: Service Down (502 Errors)

1. Checkeá pod status:
   ```bash
   kubectl get pods -l app=payment -o wide
   ```
2. Checkeá pod events:
   ```bash
   kubectl describe pod <pod-name> | tail -30
   ```
3. Checkeá si pods están crashing:
   ```bash
   kubectl get events --field-selector reason=BackOff --sort-by=.lastTimestamp | tail -10
   ```
4. Si pods están crashing, checkeá crash logs:
   ```bash
   kubectl logs <pod-name> --previous
   ```
5. Si all pods están down, restarteá el deployment:
   ```bash
   kubectl rollout restart deployment/payment
   ```
6. Monitoreá pod startup y health check

### Step 5C: OOM Kills (503 Errors)

1. Checkeá por OOM kills:
   ```bash
   kubectl get pods -l app=payment -o jsonpath="{.items[*].status.containerStatuses[0].lastState.terminated.reason}"
   ```
2. Si OOMKilled, checkeá memory usage en Grafana: [Pod Memory Dashboard](https://grafana.example.com/d/pod-memory)
3. Checkeá por memory leak en application:
   ```bash
   kubectl top pods -l app=payment --sort-by=memory
   ```
4. Temporary fix: increaseá memory limit:
   ```bash
   kubectl patch deployment payment -p '{"spec":{"template":{"spec":{"containers":[{"name":"payment","resources":{"limits":{"memory":"1Gi"}}}]}}}}'
   ```
5. Long-term fix: investigá memory leak, fileeá un bug

### Step 5D: Database Timeout (504 Errors)

1. Checkeá database connection pool:
   ```bash
   kubectl exec -it <payment-pod> -- node -e "console.log(require('./db').pool.stats())"
   ```
2. Checkeá slow queries en database:
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```
3. Checkeá database CPU y IOPS en Grafana: [Database Dashboard](https://grafana.example.com/d/database)
4. Si database está overloaded, checkeá por long-running transactions:
   ```sql
   SELECT pid, now() - xact_start AS duration, query, state
   FROM pg_stat_activity
   WHERE state IN ('active', 'idle in transaction')
   ORDER BY duration DESC;
   ```
5. Killeá long-running queries si están blocking:
   ```sql
   SELECT pg_terminate_backend(<pid>);
   ```

### Step 5E: Rate Limiting (429 Errors)

1. Checkeá Stripe API dashboard por rate limit warnings: [Stripe Dashboard](https://dashboard.stripe.com)
2. Checkeá si request volume spikeó:
   ```bash
   kubectl logs -l app=payment --tail=500 | grep "stripe.com" | wc -l
   ```
3. Enableá request batching si available
4. Implementá client-side rate limiting:
   ```typescript
   // Addeá rate limiter middleware
   const rateLimiter = new RateLimiter({ maxRequests: 90, perSeconds: 1 });
   ```
5. Si Stripe es el bottleneck, considerá usar Stripe's idempotency keys para retry safely

## Mitigation (5-30 minutes)

### Quick Mitigation Options

| Option | When to Use | Impact | Reversibility |
|--------|-------------|--------|---------------|
| Roll back deployment | New deploy causó errors | Pierde new features | Easy — redeploy |
| Scale up pods | High traffic overwhelming service | Higher cost | Easy — scale down |
| Enable circuit breaker | External API está down | Degrades gracefully | Easy — flip flag |
| Enable fallback mode | Database está slow | Read-only mode | Easy — flip flag |
| Rate limit users | Protegiendo de DDoS | Algunos users blocked | Easy — remove limit |
| Disable problematic endpoint | Un endpoint causando cascade | Feature unavailable | Easy — re-enable |

### Rollback Procedure

```bash
# 1. Checkeá current deployment
kubectl rollout history deployment/payment

# 2. Roll back a previous version
kubectl rollout undo deployment/payment

# 3. Monitoreá rollout status
kubectl rollout status deployment/payment --timeout=120s

# 4. Verificá que error rate baje
# Checkeá Grafana: https://grafana.example.com/d/payment-service
# Esperá 5 minutes para error rate normalize
```

## Escalation

| Level | Who | When to Escalate |
|-------|-----|------------------|
| 1 | On-call engineer | Alert received |
| 2 | Secondary on-call | No progress después de 15 minutes |
| 3 | Team lead + SRE | No progress después de 30 minutes |
| 4 | Engineering manager | Incident > 1 hour o revenue impact > $10k |
| 5 | CTO + VP Engineering | Incident > 4 hours o public impact |

### Escalation Contacts

| Role | Primary | Secondary |
|------|---------|-----------|
| Payment Team On-Call | PagerDuty: payment-primary | PagerDuty: payment-secondary |
| SRE On-Call | PagerDuty: sre-primary | Slack: @sre-oncall |
| Database Admin | Slack: @dba-team | PagerDuty: dba-primary |
| Engineering Manager | Slack: @eng-manager | Phone: x1234 |

## Resolution

### Step 6: Verify Resolution

- [ ] Error rate below 1% por 10 consecutive minutes
- [ ] No new error alerts fireando
- [ ] Payment success rate back a normal (> 99%)
- [ ] No user complaints en #support channel
- [ ] All pods healthy y stable

### Step 7: Document

- [ ] Updateá incident en PagerDuty con resolution summary
- [ ] Posteá resolution en `#payment-incidents`: "Resolved: HighErrorRate-PaymentService — <brief summary>"
- [ ] Creá postmortem document si P1 (within 48 hours)
- [ ] Fileeá follow-up tickets para root cause fix
- [ ] Updateá este runbook con cualquier new learnings

## Post-Incident

### Postmortem Required?

| Severity | Postmortem Required | Due Date |
|----------|-------------------|----------|
| P0 | Sí, blameless postmortem | Within 48 hours |
| P1 | Sí, blameless postmortem | Within 48 hours |
| P2 | Optional, si recurring | Within 1 week |
| P3 | No | N/A |

### Follow-Up Actions

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Fixear root cause | | | |
| Addear monitoring para root cause | | | |
| Updatear runbook con new learnings | | | |
| Addear test para prevenir regression | | | |
```

## Explanation

Un runbook sirve a two audiences: el experienced on-call engineer que necesita un quick reference, y el new on-call engineer que necesita step-by-step guidance. La triage section es para quick assessment — ¿puede ser resuelto en 2 minutes o necesita deeper investigation? La diagnosis section branchea by error type, así el engineer no wastean time checkeando irrelevant things.

La mitigation section focus en stoppear el bleeding. El goal no es fixear el root cause sino restorear service. Rollback, scale up o enable fallback modes son valid mitigations. Root cause analysis pasa post-incident.

La escalation matrix remueve ambiguity sobre cuándo pedir help. "When in doubt, escalate" debería ser el culture, pero tener explicit time-based triggers previene engineers de strugglear solos por too long.

Las resolution y post-incident sections aseguran que el incident se properly close y learnings se capturen. Every P1 incident debería producir un postmortem y al menos un follow-up action item.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Database alert | Addeá query analysis y index checks | Incluí DBA escalation |
| Infrastructure alert | Addeá Terraform y networking checks | Incluí SRE escalation |
| Security alert | Addeá containment y forensics steps | Seguí security incident response plan |
| Third-party outage | Addeá vendor status page checks | Enableá fallback mode |
| Scheduled maintenance | Addeá pre-maintenance checklist | Supprimí expected alerts |

## What Works

1. Mantené runbooks next al alert — linkeá el runbook URL en el alert annotation
2. Testeá runbooks durante game days — verificá que steps funcionen under pressure
3. Updateá runbooks después de every incident — addeá new learnings mientras están fresh
4. Incluí screenshots y direct links — reducí navigation time durante incidents
5. Usá checkboxes — engineers pueden trackear progress under stress
6. Incluí time estimates para cada section — seteá expectations para resolution time
7. Mantené commands copy-pasteable — nadie tipea kubectl commands from memory a las 3 AM

## Common Mistakes

1. Generic runbooks — "checkeá los logs" no es actionable. Specificá qué logs, qué query, qué dashboard.
2. No escalation criteria — engineers strugglean solos en vez de pedir help.
3. Outdated runbooks — service names, dashboard URLs y commands cambian. Revieweá quarterly.
4. No mitigation options — runbooks que solo describen diagnosis sin mitigation dejan engineers stuck.
5. Too much background — mantené context minimal. El engineer necesita action steps, no un history lesson.
6. No post-incident steps — incidents sin postmortems se repiten.
7. Runbooks no linked desde alerts — engineers tienen que searchear el runbook en vez de clickear un link.

## Frequently Asked Questions

### ¿Cuántos runbooks necesitamos?

Empezá con los top 20 alerts por frequency o severity. Covereá all P1 y P2 alerts first. Addeá runbooks para new alerts a medida que fireen. Si un alert firea más de 3 times sin un runbook, creá uno.

### ¿Qué tan detailed debería ser cada step?

Detailed enough que un new team member pueda seguirlo. Incluí exact commands, URLs y expected outputs. Si un step requiere judgment ("checkeá si el database está slow"), specificá qué "slow" means (e.g., "p95 query latency > 1 second").

### ¿Deberían los runbooks estar en code o en un wiki?

En code, next a los alerting rules. Version-controlled runbooks trackean changes over time y pueden ser reviewed en PRs. Wiki runbooks se vuelven stale porque nadie los owns. Usá markdown files en el same repository que tu infrastructure code.

### ¿Qué si el runbook no help?

Si el runbook no resuelve el issue, escalateá. Después del incident, updateá el runbook con el new diagnosis y mitigation steps. Un runbook que no help es un learning opportunity, no un failure.

### ¿Qué tan seguido deberían reviewearse los runbooks?

Quarterly at minimum. Después de every incident, revieweá el relevant runbook y updatealo con cualquier new learnings. Durante game days, testeá runbooks y updateá steps que no funcionen. Trackeá runbook freshness como metric: percentage de runbooks reviewed en los last 90 days.
