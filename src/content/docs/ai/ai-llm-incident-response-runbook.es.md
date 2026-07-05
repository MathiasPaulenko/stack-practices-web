---
contentType: docs
slug: ai-llm-incident-response-runbook
templateType: runbook
title: "Runbook de Respuesta a Incidentes de LLM"
description: "Runbook operacional para incidentes de LLM en produccion: eventos de hallucination, model outages, cost spikes, safety failures y calidad degradada. Incluye severity levels, escalation paths, diagnosticos y recovery."
metaDescription: "Runbook for LLM production incidents: hallucinations, model outages, cost spikes, safety failures, degraded quality. Severity levels, escalation, diagnostics, recovery."
difficulty: advanced
topics:
  - ai
tags:
  - ai
  - llm
  - incident-response
  - runbook
  - sre
  - production
  - on-call
relatedResources:
  - /docs/ai/ai-llm-cost-tracking-template
  - /docs/ai/ai-agent-design-document-template
  - /docs/ai/ai-rag-evaluation-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Runbook for LLM production incidents: hallucinations, model outages, cost spikes, safety failures, degraded quality. Severity levels, escalation, diagnostics, recovery."
  keywords:
    - llm incident response
    - ai runbook
    - llm outage
    - hallucination incident
    - model incident
    - ai on-call
    - llm production incident
---

## Overview

Este runbook cubre common LLM production incidents: hallucination events, model outages, cost spikes, safety failures, y quality degradation. Segui el severity classification y diagnostic steps para cada incident type.

---

## 1. Severity Levels

```text
SEV-1 (Critical):
  - LLM service completamente down
  - Safety failure causando harm a users
  - Cost spike > 10x normal daily spend
  - Data leak via prompt injection
  Response: Immediate, all hands, pagea on-call + management

SEV-2 (High):
  - Significant quality degradation (> 20% error rate increase)
  - Model latency > 5x normal
  - Single feature broken (e.g., RAG no returnea results)
  - Cost spike > 3x normal daily spend
  Response: Pagea on-call dentro de 15 minutes

SEV-3 (Medium):
  - Minor quality degradation (< 20% error rate increase)
  - Intermittent errors (< 5% de requests)
  - Non-critical feature degraded
  Response: Notifica on-call durante business hours

SEV-4 (Low):
  - Cosmetic issues en output formatting
  - Occasional hallucination en edge cases
  - Monitoring alert sin user impact
  Response: Crea ticket, addressa en next sprint
```

---

## 2. Escalation Path

```text
On-call engineer
  ↓ (no puede resolver en 15 min para SEV-1/2)
AI team lead
  ↓ (no puede resolver en 30 min)
Engineering manager
  ↓ (SEV-1 only)
CTO / VP Engineering
  ↓ (si user-facing harm o data leak)
Legal / PR / Security team
```

### Contacts

```text
Role                | Primary            | Secondary
────────────────────┼────────────────────┼──────────────────
On-call engineer    | #ai-on-call        | PagerDuty: ai-team
AI team lead        | jane@company.com   | john@company.com
Eng manager         | boss@company.com   | #engineering
Security team       | security@company.com | #security-urgent
```

---

## 3. Incident: Model API Outage

### Symptoms

- All LLM API calls returnean 5xx errors
- Timeout errors en every request
- Provider status page muestra outage

### Diagnostic Steps

```bash
# 1. Checkea provider status
curl -s https://status.openai.com/api/v2/status.json | jq

# 2. Testea API connectivity
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq '.data[0].id'

# 3. Checkea error rate en monitoring
# Looka en error rate dashboard para last 30 minutes

# 4. Testea fallback model
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

### Recovery Actions

```text
1. Enablea fallback model:
   - Setea feature flag: FALLBACK_MODEL=claude-3-5-sonnet
   - Routea all traffic a fallback provider
   - Notifica users de potential quality differences

2. Si fallback tambien down:
   - Enablea cached responses mode (returnea last known good response)
   - Switchea a static fallback responses para critical paths
   - Disablea non-critical AI features

3. Monitora provider status:
   - Checkea status page cada 5 minutes
   - Subscribete a provider status updates

4. Cuando provider recupera:
   - Gradualmente shiftea traffic back (10% → 50% → 100%)
   - Monitora error rates y latency
   - Disablea fallback despues de 30 minutes de stable operation
```

---

## 4. Incident: Hallucination Event

### Symptoms

- Users reportean incorrect information en responses
- Monitoring muestra faithfulness score drop
- Social media o support tickets flagean wrong answers

### Diagnostic Steps

```python
# 1. Identifica affected queries
import json

def find_hallucinations(logs: list, threshold: float = 0.7):
    suspicious = []
    for log in logs:
        if log.get("faithfulness_score", 1.0) < threshold:
            suspicious.append({
                "query": log["query"],
                "answer": log["answer"],
                "score": log["faithfulness_score"],
                "timestamp": log["timestamp"],
            })
    return suspicious

# 2. Checkea si retrieval esta returnando wrong context
def check_retrieval(query: str, expected_source: str):
    results = vector_store.search(query, top_k=5)
    for r in results:
        if expected_source in r["metadata"]["source"]:
            return True
    return False

# 3. Checkea si prompt fue recently changed
# Reviewa prompt version history en metadata.yaml
```

### Recovery Actions

```text
1. Immediate:
   - Roll back a previous prompt version: cp versions/3.1.0.md prompt.md
   - Si RAG issue: checkea si corpus fue recently updated con incorrect data
   - Disablea affected feature si hallucinations son severe

2. Investigation:
   - Analyza 20-50 affected queries
   - Determina root cause: prompt change, corpus change, model update, o edge case
   - Documenta findings en incident report

3. Prevention:
   - Addea affected queries al test set
   - Strengthen system prompt grounding instructions
   - Addea faithfulness check al CI/CD pipeline
   - Setea real-time hallucination monitoring
```

---

## 5. Incident: Cost Spike

### Symptoms

- Daily LLM cost > 3x normal (SEV-2) o > 10x normal (SEV-1)
- Cost monitoring alert triggereado
- Budget threshold notification

### Diagnostic Steps

```python
# 1. Identifica cost source
def analyze_cost_spike(daily_logs: list):
    by_feature = defaultdict(float)
    by_user = defaultdict(float)
    by_model = defaultdict(float)
    
    for log in daily_logs:
        by_feature[log["feature"]] += log["cost"]
        by_user[log["user_id"]] += log["cost"]
        by_model[log["model"]] += log["cost"]
    
    return {
        "by_feature": sorted(by_feature.items(), key=lambda x: -x[1]),
        "by_user": sorted(by_user.items(), key=lambda x: -x[1]),
        "by_model": sorted(by_model.items(), key=lambda x: -x[1]),
    }

# 2. Checkea por anomalies
# - Single user mandando abnormally long prompts?
# - Bug causando repeated retries?
# - Model changed sin cost calculation update?
# - RAG retrieviendo too many chunks?
```

### Recovery Actions

```text
1. Immediate (SEV-1):
   - Enablea cost throttle: setea daily_budget a normal * 1.5
   - Disablea non-critical features (image description, sentiment analysis)
   - Rate limita top spending users

2. Immediate (SEV-2):
   - Identifica el cost driver (feature, user, o model)
   - Si single user: aplica rate limit
   - Si bug: deployea fix o disablea affected feature
   - Si model change: revertea a cheaper model

3. Investigation:
   - Reviewa cost logs para las past 24 hours
   - Checkea por new traffic sources (bot, integration, viral event)
   - Verifica pricing calculations matchean provider pricing
   - Reviewa prompt token counts por unexpected increases
```

---

## 6. Incident: Safety Failure

### Symptoms

- Agent performea restricted action
- Output contiene harmful, biased, o inappropriate content
- Prompt injection bypassea guardrails
- PII leakeada en responses

### Diagnostic Steps

```text
1. Capturea el full conversation log
2. Identifica el input que triggereo el failure
3. Checkea si safety guardrails estaban active
4. Checkea si el input bypasseo input validation
5. Determina si es un novel attack o known pattern
6. Checkea si un recent prompt o model change weakeno guardrails
```

### Recovery Actions

```text
1. Immediate:
   - Disablea el affected agent/feature
   - Blockea el user si malicious intent
   - Notifica security team y management
   - Preservea all logs para investigation

2. Si PII leak:
   - Identifica que PII fue exposed y a whom
   - Notifica affected users (legalmente required en many jurisdictions)
   - Notifica legal team y DPO

3. Si harmful output:
   - Addea el input pattern al blocklist
   - Strengthen system prompt safety instructions
   - Addea additional output validation layer
   - Re-testea con adversarial inputs

4. Post-incident:
   - Conduci full security review
   - Updatea guardrails y test suite
   - Documenta en security incident log
   - Reviewa con legal/compliance team
```

---

## 7. Incident: Quality Degradation

### Symptoms

- User satisfaction scores droppeando
- Error rate aumentando
- Support tickets sobre wrong o unhelpful responses
- Monitoring muestra accuracy drop

### Diagnostic Steps

```text
1. Checkea por recent changes:
   - Prompt version changes (checkea metadata.yaml)
   - Model version updates (provider puede haber updated model)
   - Corpus changes (new documents, updated content)
   - Configuration changes (temperature, max_tokens, top_k)

2. Corre golden test set:
   python scripts/eval_prompt.py --prompt current --test-set golden.jsonl
   Compara results a baseline

3. Samplea 50 recent responses:
   - Scorea cada uno en accuracy, relevance, faithfulness
   - Identifica patterns en low-scoring responses
```

### Recovery Actions

```text
1. Si prompt change causo degradation:
   - Roll back a previous prompt version
   - Re-corre evaluation para confirmar recovery

2. Si model update causo degradation:
   - Switchea a fallback model
   - Reporta issue a model provider
   - Ajusta prompt para new model behavior

3. Si corpus change causo degradation:
   - Identifica que documents fueron added/modified
   - Checkea si new documents contienen incorrect o conflicting information
   - Removee o fixea problematic documents
   - Rebuildea vector index

4. Si no recent changes:
   - Checkea por distribution shift en user queries
   - Monitora por adversarial inputs
   - Considera seasonal o event-driven query pattern changes
```

---

## 8. Post-Incident Checklist

```text
[ ] Incident documentado en incident tracker
[ ] Timeline de events recorded
[ ] Root cause identificado
[ ] Fix deployeado y verificado
[ ] Test set updated con regression cases
[ ] Monitoring thresholds adjusted si needed
[ ] Postmortem scheduled dentro de 48 hours
[ ] Action items assigned con deadlines
[ ] Stakeholders notificados del resolution
[ ] Runbook updated con new learnings
```

## Preguntas Frecuentes

### ¿Qué hago si el LLM provider tiene un prolonged outage?

Enablea tu fallback model immediately. Si el fallback tambien es unavailable, switchea a cached responses (returnea el last known good response para frequent queries) o static fallback messages. Disablea non-critical AI features para reduce load. Communicate con users sobre degraded service. Monitora el provider status page y gradualmente restorea traffic cuando service recupera. Considera multi-provider redundancy para SEV-1 resilience.

### ¿Cómo detecto hallucinations en production?

Setea automated faithfulness scoring en un sample de production responses (5-10%). Usa un separate LLM call para verificar que cada claim en el response es supported por el retrieved context. Flagea responses con faithfulness below 0.85 para review. Monitora el hallucination rate daily. Setea alerts para hallucination rate > 5%. Addea user feedback mechanisms (thumbs up/down) para catchar issues que automated monitoring missea.

### ¿Cuál es el right budget para cost spike alerts?

Setea alerts en 50%, 75%, 90%, y 100% de tu monthly budget. Para daily spend, setea alerts en 2x, 3x, y 5x tu average daily spend. El 2x alert es informational (notifica al team), 3x triggerea investigation (pagea on-call durante business hours), y 5x triggerea immediate action (pagea on-call 24/7). Ajusta thresholds basado en tu normal spending variance.

### ¿Cómo prevengo prompt injection attacks en production?

Usa multiple layers: (1) input validation con length limits y profanity filters, (2) pone user input dentro de delimiters en el system prompt, (3) instruye al model a solo seguir system prompt instructions, (4) valida all tool call parameters contra schemas, (5) usa un separate classifier para detect injection attempts, (6) loggea y reviewa flagged inputs. Ningun single layer es sufficient — defense in depth es necessary.

### ¿Cuán rapido deberia responder a un LLM incident?

SEV-1 (critical): Immediate response, pagea on-call dentro de 1 minute. SEV-2 (high): Pagea on-call dentro de 15 minutes. SEV-3 (medium): Notifica on-call durante business hours. SEV-4 (low): Crea un ticket para el next sprint. El on-call engineer deberia acknowledge el alert dentro del response time, incluso si no puede resolverlo immediately. Escalatea si no podes hacer progress dentro de 15 minutes para SEV-1/2.
