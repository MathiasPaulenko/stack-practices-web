---


contentType: docs
slug: ai-prompt-version-control-template
templateType: guideline
title: "Plantilla de Version Control de Prompts de AI"
description: "Versiona tus LLM prompts con eval scores, change history, rollback support y A/B testing. Incluye prompt metadata schema, changelog format, evaluation tracking y CI/CD integration para prompt management."
metaDescription: "Version LLM prompts with eval scores, change history, rollback, A/B testing. Includes prompt metadata schema, changelog, evaluation tracking, CI/CD integration."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - llm
  - prompt-engineering
  - version-control
  - plantilla
  - ci-cd
  - evaluation
relatedResources:
  - /docs/ai-llm-prompt-template-library
  - /docs/ai-rag-evaluation-checklist
  - /docs/ai-model-selection-matrix
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Version LLM prompts with eval scores, change history, rollback, A/B testing. Includes prompt metadata schema, changelog, evaluation tracking, CI/CD integration."
  keywords:
    - prompt version control
    - prompt management
    - prompt changelog
    - prompt evaluation
    - prompt ci cd
    - prompt a b testing
    - llm prompt versioning


---

## Overview

Esta plantilla provee una estructura para versionar LLM prompts. Cada prompt version tiene metadata, un changelog, evaluation scores, y un rollback path. Usala para manejar prompt changes con el mismo rigor que code changes.

---

## 1. Prompt Metadata Schema

```yaml
# prompt_metadata.yaml
prompt_id: "customer-support-classifier"
name: "Customer Support Ticket Classifier"
description: "Classifies incoming support tickets into categories"
current_version: "3.2.0"
status: "production"
owner: "ai-team@company.com"

versions:
  - version: "3.2.0"
    date: "2026-07-04"
    author: "jane@company.com"
    status: "production"
    model: "gpt-4o-mini"
    temperature: 0
    change_type: "patch"
    changes:
      - "Reduced system prompt from 450 to 280 tokens"
      - "Removed redundant category descriptions"
    eval_scores:
      accuracy: 0.92
      precision: 0.91
      recall: 0.89
      f1: 0.90
      latency_p95: 280
      cost_per_1k: 0.53
    rollback_to: "3.1.0"
    
  - version: "3.1.0"
    date: "2026-06-20"
    author: "jane@company.com"
    status: "archived"
    model: "gpt-4o-mini"
    temperature: 0
    change_type: "minor"
    changes:
      - "Added 'BILLING' category"
      - "Updated category descriptions for clarity"
    eval_scores:
      accuracy: 0.90
      precision: 0.89
      recall: 0.88
      f1: 0.88
      latency_p95: 320
      cost_per_1k: 0.55
    rollback_to: "3.0.0"
    
  - version: "3.0.0"
    date: "2026-06-01"
    author: "john@company.com"
    status: "archived"
    model: "gpt-4o-mini"
    temperature: 0
    change_type: "major"
    changes:
      - "Migrated from GPT-4o to GPT-4o-mini (15x cost reduction)"
      - "Rewrote system prompt for mini model"
      - "Added UNCLEAR category for ambiguous tickets"
    eval_scores:
      accuracy: 0.88
      precision: 0.87
      recall: 0.86
      f1: 0.86
      latency_p95: 300
      cost_per_1k: 0.53
    rollback_to: "2.1.0"
```

---

## 2. Prompt File Structure

```text
prompts/
├── customer-support-classifier/
│   ├── prompt.md                 # Current production prompt
│   ├── metadata.yaml             # Version metadata y eval scores
│   ├── versions/
│   │   ├── 3.2.0.md
│   │   ├── 3.1.0.md
│   │   ├── 3.0.0.md
│   │   └── 2.1.0.md
│   ├── eval/
│   │   ├── test_set.jsonl        # 200 labeled test cases
│   │   ├── eval_results_3.2.0.json
│   │   ├── eval_results_3.1.0.json
│   │   └── eval_results_3.0.0.json
│   └── ab_tests/
│       ├── 3.1.0_vs_3.2.0.json
│       └── 3.0.0_vs_3.1.0.json
```

---

## 3. Version Numbering

```text
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
  - Model change (e.g., GPT-4o → Claude 3.5)
  - Output schema change
  - Category set change (added/removed categories)
  - Requiree re-evaluation y stakeholder approval

MINOR: Feature additions
  - New category added
  - New few-shot example added
  - System prompt restructured
  - Requiree evaluation pero no stakeholder approval

PATCH: Optimizations
  - Token reduction
  - Wording tweaks
  - Formatting changes
  - Requiree evaluation, fast approval
```

---

## 4. Changelog Format

```markdown
## [3.2.0] — 2026-07-04

### Changed
- Reduced system prompt from 450 to 280 tokens (37% reduction)
- Removed redundant category descriptions for COMPLAINT and FEEDBACK
- Consolidated overlapping instructions into a single rules section

### Impact
- Cost per 1000 queries: $0.55 → $0.53 (4% savings)
- Latency p95: 320ms → 280ms (12% faster)
- Accuracy: 0.90 → 0.92 (+2%)
- F1: 0.88 → 0.90 (+2%)

### Rollback
- Revert to 3.1.0: `cp versions/3.1.0.md prompt.md`
- No data migration needed
```

---

## 5. Evaluation Protocol

### Pre-Deployment Evaluation

```python
import json
from openai import OpenAI

client = OpenAI()

def evaluate_prompt_version(prompt_path: str, test_set_path: str, model: str):
    with open(prompt_path) as f:
        prompt_template = f.read()
    
    with open(test_set_path) as f:
        test_cases = [json.loads(line) for line in f]
    
    correct = 0
    total = len(test_cases)
    
    for case in test_cases:
        prompt = prompt_template.replace("{{input_text}}", case["input"])
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        prediction = response.choices[0].message.content.strip()
        
        if prediction == case["expected"]:
            correct += 1
    
    accuracy = correct / total
    
    return {
        "version": prompt_path.split("/")[-1].replace(".md", ""),
        "accuracy": accuracy,
        "test_cases": total,
        "correct": correct,
        "incorrect": total - correct,
    }

# Corre evaluation en new version
results = evaluate_prompt_version(
    "prompts/classifier/versions/3.2.0.md",
    "prompts/classifier/eval/test_set.jsonl",
    "gpt-4o-mini",
)

print(json.dumps(results, indent=2))
# {
#   "version": "3.2.0",
#   "accuracy": 0.92,
#   "test_cases": 200,
#   "correct": 184,
#   "incorrect": 16
# }
```

### Regression Check

```python
def compare_versions(old_results: dict, new_results: dict) -> dict:
    accuracy_delta = new_results["accuracy"] - old_results["accuracy"]
    
    verdict = "PASS"
    if accuracy_delta < -0.02:
        verdict = "FAIL — accuracy dropped more than 2%"
    elif accuracy_delta < 0:
        verdict = "WARN — accuracy decreased slightly"
    
    return {
        "old_version": old_results["version"],
        "new_version": new_results["version"],
        "old_accuracy": old_results["accuracy"],
        "new_accuracy": new_results["accuracy"],
        "delta": accuracy_delta,
        "verdict": verdict,
    }
```

---

## 6. A/B Testing

```python
import random
import json
from collections import defaultdict

class PromptABTest:
    def __init__(self, prompt_a: str, prompt_b: str, traffic_split: float = 0.5):
        self.prompt_a = prompt_a
        self.prompt_b = prompt_b
        self.traffic_split = traffic_split
        self.results = defaultdict(lambda: {"correct": 0, "total": 0})
    
    def route(self) -> str:
        if random.random() < self.traffic_split:
            return self.prompt_a, "A"
        return self.prompt_b, "B"
    
    def record(self, variant: str, correct: bool):
        self.results[variant]["total"] += 1
        if correct:
            self.results[variant]["correct"] += 1
    
    def report(self) -> dict:
        a = self.results["A"]
        b = self.results["B"]
        
        return {
            "variant_a": {
                "accuracy": a["correct"] / a["total"] if a["total"] > 0 else 0,
                "samples": a["total"],
            },
            "variant_b": {
                "accuracy": b["correct"] / b["total"] if b["total"] > 0 else 0,
                "samples": b["total"],
            },
            "winner": "A" if a["correct"] / max(a["total"], 1) > b["correct"] / max(b["total"], 1) else "B",
        }

# Usage
ab_test = PromptABTest(
    prompt_a="prompts/classifier/versions/3.1.0.md",
    prompt_b="prompts/classifier/versions/3.2.0.md",
)

# Despues de 1000 samples
report = ab_test.report()
print(json.dumps(report, indent=2))
```

---

## 7. CI/CD Integration

```yaml
# .github/workflows/prompt-eval.yml
name: Prompt Evaluation

on:
  pull_request:
    paths:
      - "prompts/**"

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      
      - name: Install dependencies
        run: pip install openai
      
      - name: Run prompt evaluation
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python scripts/eval_prompt.py \
            --prompt prompts/classifier/prompt.md \
            --test-set prompts/classifier/eval/test_set.jsonl \
            --model gpt-4o-mini \
            --threshold 0.88
      
      - name: Check regression
        run: |
          python scripts/check_regression.py \
            --old-results prompts/classifier/eval/eval_results_3.1.0.json \
            --new-results eval_output.json \
            --max-drop 0.02
```

---

## 8. Approval Process

```text
1. Developer crea un new prompt version en prompts/[name]/versions/
2. Developer corre evaluation: python scripts/eval_prompt.py
3. Developer crea un PR con:
   - New prompt version file
   - Updated metadata.yaml
   - Evaluation results
4. CI corre automated evaluation y regression check
5. Reviewer checkea:
   - Eval scores meetean threshold
   - No regression beyond max-drop
   - Changelog es clear y accurate
6. Reviewer approvea PR
7. PR merged → new version se vuelve production
8. Old version archived en versions/ directory
9. Si new version causa issues en production → rollback a previous version
```

## Preguntas Frecuentes

### ¿Cómo creo un test set para prompt evaluation?

Collecta 200+ real inputs que tu prompt processa. Para cada input, manualmente verifica el correct expected output. Include edge cases: empty input, very long input, ambiguous input, adversarial input. Storea como JSONL con `input` y `expected` fields. Updatea el test set cuando addeas new categories o cambias el output schema. Nunca includeas PII en el test set.

### ¿Qué accuracy threshold deberia usar?

Depende del task. Para classification: targetea > 0.90 accuracy. Para extraction: targetea > 0.85 F1. Para summarization: targetea > 4.0/5 en relevance y faithfulness. Setea el threshold basado en business impact — si misclassification cuesta $100, necesitas higher accuracy que si cuesta $1. Siempre setea un minimum threshold que blockee deployment si no se meetea.

### ¿Cómo hago rollback de un prompt change?

Keepa all previous prompt versions en el `versions/` directory. Para rollback, copia el previous version al production prompt file: `cp versions/3.1.0.md prompt.md`. Updatea `metadata.yaml` para setear el rolled-back version como current. No necesitas code deployment — solo un file change. Documenta el rollback reason en el changelog.

### ¿Cuántas samples necesito para A/B testing?

Para un 2% accuracy difference con 95% confidence, necesitas approximately 3000 samples per variant. Para un 5% difference, 500 samples per variant. Usa un statistical significance test (chi-square o t-test) antes de declarar un winner. Corre el test por al menos 7 dias para accountar daily variation en input types.

### ¿Deberia los prompts estar en Git o un separate system?

Git trabaja well para teams con fewer de 50 prompts. Storea prompt files, metadata, y test sets en Git alongside tu application code. Para larger teams o prompt-heavy products, considera un dedicated prompt management platform (LangSmith, PromptLayer, Humanloop) que provee versioning, evaluation, A/B testing, y monitoring out of the box. Los principles en esta plantilla aplican regardless del tool.

## See Also

- [Complete Guide to LLM Prompt Engineering](/es/guides/complete-guide-llm-prompt-engineering/)
- [AI LLM Prompt Template Library](/es/docs/ai-llm-prompt-template-library/)
- [Complete Guide to LLM Application Architecture](/es/guides/complete-guide-llm-application-architecture/)
- [Complete Guide to LLM Evaluation](/es/guides/complete-guide-llm-evaluation/)
- [AI Agent Design Document Template](/es/docs/ai-agent-design-document-template/)

