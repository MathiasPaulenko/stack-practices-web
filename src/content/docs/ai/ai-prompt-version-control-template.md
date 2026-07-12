---


contentType: docs
slug: ai-prompt-version-control-template
templateType: guideline
title: "AI Prompt Version Control Template"
description: "Version your LLM prompts with eval scores, change history, rollback support, and A/B testing. Includes prompt metadata schema, changelog format, evaluation tracking, and CI/CD integration for prompt management."
metaDescription: "Version LLM prompts with eval scores, change history, rollback, A/B testing. Includes prompt metadata schema, changelog, evaluation tracking, CI/CD integration."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - llm
  - prompt-engineering
  - version-control
  - template
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

This template provides a structure for versioning LLM prompts. Each prompt version has metadata, a changelog, evaluation scores, and a rollback path. Use this to manage prompt changes with the same rigor as code changes.

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
│   ├── metadata.yaml             # Version metadata and eval scores
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
  - Requires re-evaluation and stakeholder approval

MINOR: Feature additions
  - New category added
  - New few-shot example added
  - System prompt restructured
  - Requires evaluation but not stakeholder approval

PATCH: Optimizations
  - Token reduction
  - Wording tweaks
  - Formatting changes
  - Requires evaluation, fast approval
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

# Run evaluation on new version
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

# After 1000 samples
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
1. Developer creates a new prompt version in prompts/[name]/versions/
2. Developer runs evaluation: python scripts/eval_prompt.py
3. Developer creates PR with:
   - New prompt version file
   - Updated metadata.yaml
   - Evaluation results
4. CI runs automated evaluation and regression check
5. Reviewer checks:
   - Eval scores meet threshold
   - No regression beyond max-drop
   - Changelog is clear and accurate
6. Reviewer approves PR
7. PR merged → new version becomes production
8. Old version archived in versions/ directory
9. If new version causes issues in production → rollback to previous version
```

## FAQ

### How do I create a test set for prompt evaluation?

Collect 200+ real inputs that your prompt processes. For each input, manually verify the correct expected output. Include edge cases: empty input, very long input, ambiguous input, adversarial input. Store as JSONL with `input` and `expected` fields. Update the test set when you add new categories or change the output schema. Never include PII in the test set.

### What accuracy threshold should I use?

Depends on the task. For classification: target > 0.90 accuracy. For extraction: target > 0.85 F1. For summarization: target > 4.0/5 on relevance and faithfulness. Set the threshold based on business impact — if misclassification costs $100, you need higher accuracy than if it costs $1. Always set a minimum threshold that blocks deployment if not met.

### How do I roll back a prompt change?

Keep all previous prompt versions in the `versions/` directory. To roll back, copy the previous version to the production prompt file: `cp versions/3.1.0.md prompt.md`. Update `metadata.yaml` to set the rolled-back version as current. No code deployment needed — just a file change. Document the rollback reason in the changelog.

### How many samples do I need for A/B testing?

For a 2% accuracy difference with 95% confidence, you need approximately 3000 samples per variant. For a 5% difference, 500 samples per variant. Use a statistical significance test (chi-square or t-test) before declaring a winner. Run the test for at least 7 days to account for daily variation in input types.

### Should prompts be in Git or a separate system?

Git works well for teams with fewer than 50 prompts. Store prompt files, metadata, and test sets in Git alongside your application code. For larger teams or prompt-heavy products, consider a dedicated prompt management platform (LangSmith, PromptLayer, Humanloop) that provides versioning, evaluation, A/B testing, and monitoring out of the box. The principles in this template apply regardless of the tool.

## See Also

- [Complete Guide to LLM Prompt Engineering](/guides/complete-guide-llm-prompt-engineering/)
- [AI LLM Prompt Template Library](/docs/ai-llm-prompt-template-library/)
- [Complete Guide to LLM Application Architecture](/guides/complete-guide-llm-application-architecture/)
- [Complete Guide to LLM Evaluation](/guides/complete-guide-llm-evaluation/)
- [AI Agent Design Document Template](/docs/ai-agent-design-document-template/)

