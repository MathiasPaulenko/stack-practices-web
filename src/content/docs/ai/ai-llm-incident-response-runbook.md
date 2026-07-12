---


contentType: docs
slug: ai-llm-incident-response-runbook
templateType: runbook
title: "AI LLM Incident Response Runbook"
description: "Operational runbook for LLM production incidents: hallucination events, model outages, cost spikes, safety failures, and degraded quality. Includes severity levels, escalation paths, diagnostic steps, and recovery procedures."
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
  - /docs/ai-llm-cost-tracking-template
  - /docs/ai-agent-design-document-template
  - /docs/ai-rag-evaluation-checklist
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

This runbook covers common LLM production incidents: hallucination events, model outages, cost spikes, safety failures, and quality degradation. Follow the severity classification and diagnostic steps for each incident type.

---

## 1. Severity Levels

```text
SEV-1 (Critical):
  - LLM service completely down
  - Safety failure causing harm to users
  - Cost spike > 10x normal daily spend
  - Data leak via prompt injection
  Response: Immediate, all hands, page on-call + management

SEV-2 (High):
  - Significant quality degradation (> 20% error rate increase)
  - Model latency > 5x normal
  - Single feature broken (e.g., RAG not returning results)
  - Cost spike > 3x normal daily spend
  Response: Page on-call within 15 minutes

SEV-3 (Medium):
  - Minor quality degradation (< 20% error rate increase)
  - Intermittent errors (< 5% of requests)
  - Non-critical feature degraded
  Response: Notify on-call during business hours

SEV-4 (Low):
  - Cosmetic issues in output formatting
  - Occasional hallucination on edge cases
  - Monitoring alert without user impact
  Response: Create ticket, address in next sprint
```

---

## 2. Escalation Path

```text
On-call engineer
  ↓ (cannot resolve in 15 min for SEV-1/2)
AI team lead
  ↓ (cannot resolve in 30 min)
Engineering manager
  ↓ (SEV-1 only)
CTO / VP Engineering
  ↓ (if user-facing harm or data leak)
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

- All LLM API calls returning 5xx errors
- Timeout errors on every request
- Provider status page shows outage

### Diagnostic Steps

```bash
# 1. Check provider status
curl -s https://status.openai.com/api/v2/status.json | jq

# 2. Test API connectivity
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq '.data[0].id'

# 3. Check error rate in monitoring
# Look at error rate dashboard for last 30 minutes

# 4. Test fallback model
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

### Recovery Actions

```text
1. Enable fallback model:
   - Set feature flag: FALLBACK_MODEL=claude-3-5-sonnet
   - Route all traffic to fallback provider
   - Notify users of potential quality differences

2. If fallback also down:
   - Enable cached responses mode (return last known good response)
   - Switch to static fallback responses for critical paths
   - Disable non-critical AI features

3. Monitor provider status:
   - Check status page every 5 minutes
   - Subscribe to provider status updates

4. When provider recovers:
   - Gradually shift traffic back (10% → 50% → 100%)
   - Monitor error rates and latency
   - Disable fallback after 30 minutes of stable operation
```

---

## 4. Incident: Hallucination Event

### Symptoms

- Users report incorrect information in responses
- Monitoring shows faithfulness score drop
- Social media or support tickets flag wrong answers

### Diagnostic Steps

```python
# 1. Identify affected queries
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

# 2. Check if retrieval is returning wrong context
def check_retrieval(query: str, expected_source: str):
    results = vector_store.search(query, top_k=5)
    for r in results:
        if expected_source in r["metadata"]["source"]:
            return True
    return False

# 3. Check if prompt was recently changed
# Review prompt version history in metadata.yaml
```

### Recovery Actions

```text
1. Immediate:
   - Roll back to previous prompt version: cp versions/3.1.0.md prompt.md
   - If RAG issue: check if corpus was recently updated with incorrect data
   - Disable affected feature if hallucinations are severe

2. Investigation:
   - Analyze 20-50 affected queries
   - Determine root cause: prompt change, corpus change, model update, or edge case
   - Document findings in incident report

3. Prevention:
   - Add affected queries to test set
   - Strengthen system prompt grounding instructions
   - Add faithfulness check to CI/CD pipeline
   - Set up real-time hallucination monitoring
```

---

## 5. Incident: Cost Spike

### Symptoms

- Daily LLM cost > 3x normal (SEV-2) or > 10x normal (SEV-1)
- Cost monitoring alert triggered
- Budget threshold notification

### Diagnostic Steps

```python
# 1. Identify cost source
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

# 2. Check for anomalies
# - Single user sending abnormally long prompts?
# - Bug causing repeated retries?
# - Model changed without cost calculation update?
# - RAG retrieving too many chunks?
```

### Recovery Actions

```text
1. Immediate (SEV-1):
   - Enable cost throttle: set daily_budget to normal * 1.5
   - Disable non-critical features (image description, sentiment analysis)
   - Rate limit top spending users

2. Immediate (SEV-2):
   - Identify the cost driver (feature, user, or model)
   - If single user: apply rate limit
   - If bug: deploy fix or disable affected feature
   - If model change: revert to cheaper model

3. Investigation:
   - Review cost logs for the past 24 hours
   - Check for new traffic sources (bot, integration, viral event)
   - Verify pricing calculations match provider pricing
   - Review prompt token counts for unexpected increases
```

---

## 6. Incident: Safety Failure

### Symptoms

- Agent performs restricted action
- Output contains harmful, biased, or inappropriate content
- Prompt injection bypasses guardrails
- PII leaked in responses

### Diagnostic Steps

```text
1. Capture the full conversation log
2. Identify the input that triggered the failure
3. Check if safety guardrails were active
4. Check if the input bypassed input validation
5. Determine if this is a novel attack or known pattern
6. Check if a recent prompt or model change weakened guardrails
```

### Recovery Actions

```text
1. Immediate:
   - Disable the affected agent/feature
   - Block the user if malicious intent
   - Notify security team and management
   - Preserve all logs for investigation

2. If PII leak:
   - Identify what PII was exposed and to whom
   - Notify affected users (legally required in many jurisdictions)
   - Notify legal team and DPO

3. If harmful output:
   - Add the input pattern to blocklist
   - Strengthen system prompt safety instructions
   - Add additional output validation layer
   - Re-test with adversarial inputs

4. Post-incident:
   - Conduct full security review
   - Update guardrails and test suite
   - Document in security incident log
   - Review with legal/compliance team
```

---

## 7. Incident: Quality Degradation

### Symptoms

- User satisfaction scores dropping
- Error rate increasing
- Support tickets about wrong or unhelpful responses
- Monitoring shows accuracy drop

### Diagnostic Steps

```text
1. Check for recent changes:
   - Prompt version changes (check metadata.yaml)
   - Model version updates (provider may have updated model)
   - Corpus changes (new documents, updated content)
   - Configuration changes (temperature, max_tokens, top_k)

2. Run golden test set:
   python scripts/eval_prompt.py --prompt current --test-set golden.jsonl
   Compare results to baseline

3. Sample 50 recent responses:
   - Score each on accuracy, relevance, faithfulness
   - Identify patterns in low-scoring responses
```

### Recovery Actions

```text
1. If prompt change caused degradation:
   - Roll back to previous prompt version
   - Re-run evaluation to confirm recovery

2. If model update caused degradation:
   - Switch to fallback model
   - Report issue to model provider
   - Adjust prompt for new model behavior

3. If corpus change caused degradation:
   - Identify which documents were added/modified
   - Check if new documents contain incorrect or conflicting information
   - Remove or fix problematic documents
   - Rebuild vector index

4. If no recent changes:
   - Check for distribution shift in user queries
   - Monitor for adversarial inputs
   - Consider seasonal or event-driven query pattern changes
```

---

## 8. Post-Incident Checklist

```text
[ ] Incident documented in incident tracker
[ ] Timeline of events recorded
[ ] Root cause identified
[ ] Fix deployed and verified
[ ] Test set updated with regression cases
[ ] Monitoring thresholds adjusted if needed
[ ] Postmortem scheduled within 48 hours
[ ] Action items assigned with deadlines
[ ] Stakeholders notified of resolution
[ ] Runbook updated with new learnings
```

## FAQ

### What should I do if the LLM provider has a prolonged outage?

Enable your fallback model immediately. If the fallback is also unavailable, switch to cached responses (return the last known good response for frequent queries) or static fallback messages. Disable non-critical AI features to reduce load. Communicate with users about degraded service. Monitor the provider status page and gradually restore traffic when service recovers. Consider multi-provider redundancy for SEV-1 resilience.

### How do I detect hallucinations in production?

Set up automated faithfulness scoring on a sample of production responses (5-10%). Use a separate LLM call to verify that each claim in the response is supported by the retrieved context. Flag responses with faithfulness below 0.85 for review. Monitor the hallucination rate daily. Set alerts for hallucination rate > 5%. Add user feedback mechanisms (thumbs up/down) to catch issues that automated monitoring misses.

### What is the right budget for cost spike alerts?

Set alerts at 50%, 75%, 90%, and 100% of your monthly budget. For daily spend, set alerts at 2x, 3x, and 5x your average daily spend. The 2x alert is informational (notify the team), 3x triggers investigation (page on-call during business hours), and 5x triggers immediate action (page on-call 24/7). Adjust thresholds based on your normal spending variance.

### How do I prevent prompt injection attacks in production?

Use multiple layers: (1) input validation with length limits and profanity filters, (2) place user input inside delimiters in the system prompt, (3) instruct the model to only follow system prompt instructions, (4) validate all tool call parameters against schemas, (5) use a separate classifier to detect injection attempts, (6) log and review flagged inputs. No single layer is sufficient — defense in depth is necessary.

### How quickly should I respond to an LLM incident?

SEV-1 (critical): Immediate response, page on-call within 1 minute. SEV-2 (high): Page on-call within 15 minutes. SEV-3 (medium): Notify on-call during business hours. SEV-4 (low): Create a ticket for the next sprint. The on-call engineer should acknowledge the alert within the response time, even if they cannot resolve it immediately. Escalate if you cannot make progress within 15 minutes for SEV-1/2.

## See Also

- [Complete Guide to LLM Prompt Engineering](/guides/complete-guide-llm-prompt-engineering/)
- [Complete Guide to LangChain in Production](/guides/complete-guide-langchain-production/)
- [Complete Guide to LLM Application Architecture](/guides/complete-guide-llm-application-architecture/)
- [Complete Guide to LLM Cost Optimization](/guides/complete-guide-llm-cost-optimization/)
- [Complete Guide to LLM Evaluation](/guides/complete-guide-llm-evaluation/)

