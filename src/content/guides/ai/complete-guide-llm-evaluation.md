---
contentType: guides
slug: complete-guide-llm-evaluation
title: "Complete Guide to LLM Evaluation"
description: "Evaluate LLM applications in production. Covers RAGAS, LLM-as-judge, human evaluation, A/B testing, hallucination detection, toxicity scoring, regression testing, and building automated evaluation pipelines."
metaDescription: "Evaluate LLM apps. Covers RAGAS, LLM-as-judge, human eval, A/B testing, hallucination detection, toxicity scoring, regression testing."
difficulty: advanced
topics:
  - ai
  - testing
  - performance
tags:
  - llm
  - evaluation
  - ai
  - guide
  - ragas
  - hallucination
  - ab-testing
  - quality
relatedResources:
  - /guides/ai/complete-guide-llm-application-architecture
  - /guides/ai/complete-guide-rag-production
  - /guides/ai/complete-guide-langchain-production
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Evaluate LLM apps. Covers RAGAS, LLM-as-judge, human eval, A/B testing, hallucination detection, toxicity scoring, regression testing."
  keywords:
    - llm evaluation
    - ragas
    - llm as judge
    - human evaluation
    - ab testing llm
    - hallucination detection
    - toxicity scoring
    - llm regression testing
---

## Introduction

Evaluating LLM applications is harder than evaluating traditional software. Outputs are non-deterministic, quality is subjective, and failures are subtle. Production LLM systems need automated evaluation pipelines that catch regressions, measure quality, and detect hallucinations before they reach users. The following walks through the full spectrum of LLM evaluation: RAGAS for RAG systems, LLM-as-judge for subjective quality, human evaluation, A/B testing, and building CI/CD evaluation pipelines.

## Evaluation Dimensions

```text
LLM Output Quality Dimensions:

1. Faithfulness: Is the answer grounded in the provided context?
2. Answer Relevancy: Does the answer address the question?
3. Context Precision: Are retrieved documents relevant?
4. Context Recall: Did we retrieve all needed information?
5. Factuality: Is the answer factually correct?
6. Toxicity: Is the answer safe and non-toxic?
7. Coherence: Is the answer well-structured and readable?
8. Completeness: Does the answer cover all aspects of the question?
9. Conciseness: Is the answer appropriately concise?
10. Hallucination Rate: How often does the model fabricate information?
```

## RAGAS Framework

### Installing and Using RAGAS

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    context_entity_recall,
    answer_similarity,
)
from datasets import Dataset

# Prepare evaluation dataset
eval_data = {
    "question": [
        "What is Python's GIL?",
        "How does async/await work?",
    ],
    "answer": [
        "The GIL is a mutex that protects access to Python objects.",
        "async/await allows non-blocking I/O operations using coroutines.",
    ],
    "contexts": [
        ["Python's GIL (Global Interpreter Lock) is a mutex that prevents multiple threads from executing Python bytecodes at once."],
        ["async/await is syntax for writing asynchronous code. async marks a function as a coroutine, await suspends execution until the awaited task completes."],
    ],
    "ground_truth": [
        "The GIL is a mutex that prevents multiple native threads from executing Python bytecodes simultaneously.",
        "async/await enables non-blocking concurrent code using coroutines and an event loop.",
    ]
}

dataset = Dataset.from_dict(eval_data)

# Evaluate
results = evaluate(
    dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
    ]
)

print(results)
# Output: {'faithfulness': 0.92, 'answer_relevancy': 0.88, 'context_precision': 0.95, 'context_recall': 0.90}
```

### Custom RAGAS Metrics

```python
from ragas.metrics.base import MetricWithLLM
from ragas.callbacks import Callbacks
from datasets import Dataset
from typing import Optional

class ConcisenessMetric(MetricWithLLM):
    name = "conciseness"
    
    def __init__(self):
        super().__init__()
    
    async def _ascore(self, row, callbacks: Callbacks) -> float:
        answer = row["answer"]
        question = row["question"]
        
        prompt = f"""Rate the conciseness of this answer on a scale of 0-1.
        0 = overly verbose, 1 = perfectly concise.
        
        Question: {question}
        Answer: {answer}
        
        Score (0-1):"""
        
        response = await self.llm.generate(prompt)
        score = float(response.strip())
        return max(0.0, min(1.0, score))
```

## LLM-as-Judge

### Basic LLM Judge

```python
from openai import AsyncOpenAI
import json

client = AsyncOpenAI()

JUDGE_PROMPT = """You are an expert evaluator. Rate the quality of an AI assistant's response.

Question: {question}
Response: {response}
Reference Answer: {reference}

Evaluate on these criteria (0-10 each):
1. Accuracy: Is the response factually correct?
2. Completeness: Does it cover all important aspects?
3. Clarity: Is it clear and well-structured?
4. Helpfulness: Is it useful to the user?

Return JSON: {{"accuracy": N, "completeness": N, "clarity": N, "helpfulness": N, "overall": N, "reasoning": "..."}}"""

async def llm_judge(question: str, response: str, reference: str) -> dict:
    prompt = JUDGE_PROMPT.format(
        question=question,
        response=response,
        reference=reference
    )
    
    result = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.0
    )
    
    return json.loads(result.choices[0].message.content)

# Usage
evaluation = await llm_judge(
    question="What is the GIL in Python?",
    response="The GIL is a lock that prevents multiple threads from running Python code simultaneously.",
    reference="The Global Interpreter Lock (GIL) is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once."
)
print(f"Overall: {evaluation['overall']}/10")
print(f"Reasoning: {evaluation['reasoning']}")
```

### Pairwise Comparison

```python
PAIRWISE_PROMPT = """Compare two AI responses to the same question. Choose the better one.

Question: {question}

Response A: {response_a}
Response B: {response_b}

Criteria: accuracy, completeness, clarity, helpfulness.

Which response is better? Return JSON:
{{"winner": "A" or "B" or "tie", "reasoning": "..."}}"""

async def pairwise_compare(question: str, response_a: str, response_b: str) -> dict:
    prompt = PAIRWISE_PROMPT.format(
        question=question,
        response_a=response_a,
        response_b=response_b
    )
    
    result = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.0
    )
    
    return json.loads(result.choices[0].message.content)
```

### Reducing Judge Bias

```python
import random

async def unbiased_pairwise_compare(question: str, response_a: str, response_b: str) -> dict:
    # Randomize order to reduce position bias
    if random.random() > 0.5:
        result = await pairwise_compare(question, response_a, response_b)
        # Map back to original A/B
        if result["winner"] == "A":
            result["winner"] = "A"
        elif result["winner"] == "B":
            result["winner"] = "B"
    else:
        result = await pairwise_compare(question, response_b, response_a)
        # Flip the result
        if result["winner"] == "A":
            result["winner"] = "B"
        elif result["winner"] == "B":
            result["winner"] = "A"
    
    return result

# Run multiple comparisons and aggregate
async def robust_compare(question: str, response_a: str, response_b: str, n: int = 5) -> dict:
    results = []
    for _ in range(n):
        result = await unbiased_pairwise_compare(question, response_a, response_b)
        results.append(result["winner"])
    
    a_wins = results.count("A")
    b_wins = results.count("B")
    ties = results.count("tie")
    
    if a_wins > b_wins:
        return {"winner": "A", "confidence": a_wins / n, "details": {"A": a_wins, "B": b_wins, "tie": ties}}
    elif b_wins > a_wins:
        return {"winner": "B", "confidence": b_wins / n, "details": {"A": a_wins, "B": b_wins, "tie": ties}}
    else:
        return {"winner": "tie", "confidence": ties / n, "details": {"A": a_wins, "B": b_wins, "tie": ties}}
```

## Hallucination Detection

### Self-Consistency Check

```python
async def self_consistency_check(question: str, n: int = 3) -> dict:
    """Generate multiple responses and check for consistency."""
    responses = []
    
    for _ in range(n):
        result = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": question}],
            temperature=0.7  # Higher temperature for diversity
        )
        responses.append(result.choices[0].message.content)
    
    # Use LLM to check if responses are consistent
    consistency_prompt = f"""Are these responses factually consistent with each other?
    
    Response 1: {responses[0]}
    Response 2: {responses[1]}
    Response 3: {responses[2]}
    
    Return JSON: {{"consistent": true/false, "differences": ["..."], "confidence": 0-1}}"""
    
    check = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": consistency_prompt}],
        response_format={"type": "json_object"},
        temperature=0.0
    )
    
    return json.loads(check.choices[0].message.content)
```

### Cross-Reference with Sources

```python
async def fact_check_with_sources(answer: str, sources: list[str]) -> dict:
    """Check if each claim in the answer is supported by the sources."""
    prompt = f"""Verify each claim in the answer against the provided sources.
    
    Answer: {answer}
    
    Sources:
    {chr(10).join(f"[{i+1}] {s}" for i, s in enumerate(sources))}
    
    For each claim, determine:
    - Is it supported by the sources?
    - Which source supports it?
    
    Return JSON:
    {{"claims": [{{"claim": "...", "supported": true/false, "source": N or null}}], "hallucination_rate": 0-1}}"""
    
    result = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.0
    )
    
    return json.loads(result.choices[0].message.content)
```

## Human Evaluation

### Evaluation Interface

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class HumanEvaluation:
    question: str
    response: str
    rating: int  # 1-5
    feedback: str
    evaluator_id: str
    category: str  # "accuracy", "helpfulness", "safety"

class HumanEvalCollector:
    def __init__(self):
        self.evaluations: list[HumanEvaluation] = []
    
    def add(self, eval: HumanEvaluation):
        self.evaluations.append(eval)
    
    def summary(self) -> dict:
        if not self.evaluations:
            return {}
        
        ratings = [e.rating for e in self.evaluations]
        by_category = {}
        
        for eval in self.evaluations:
            if eval.category not in by_category:
                by_category[eval.category] = []
            by_category[eval.category].append(eval.rating)
        
        return {
            "total_evaluations": len(self.evaluations),
            "avg_rating": sum(ratings) / len(ratings),
            "rating_distribution": {str(i): ratings.count(i) for i in range(1, 6)},
            "by_category": {
                cat: sum(rs) / len(rs)
                for cat, rs in by_category.items()
            }
        }

# In practice, use a tool like Argilla, Label Studio, or a custom UI
```

### Inter-Annotator Agreement

```python
def cohen_kappa(ratings_a: list[int], ratings_b: list[int]) -> float:
    """Calculate Cohen's Kappa for inter-annotator agreement."""
    assert len(ratings_a) == len(ratings_b)
    n = len(ratings_a)
    categories = sorted(set(ratings_a + ratings_b))
    
    # Observed agreement
    observed = sum(1 for a, b in zip(ratings_a, ratings_b) if a == b) / n
    
    # Expected agreement
    expected = 0
    for c in categories:
        p_a = ratings_a.count(c) / n
        p_b = ratings_b.count(c) / n
        expected += p_a * p_b
    
    if expected == 1:
        return 1.0
    
    return (observed - expected) / (1 - expected)

# Usage
evaluator_1 = [5, 4, 3, 5, 4, 2, 5, 3, 4, 5]
evaluator_2 = [5, 4, 4, 5, 3, 2, 5, 3, 4, 4]

kappa = cohen_kappa(evaluator_1, evaluator_2)
print(f"Inter-annotator agreement (Cohen's Kappa): {kappa:.3f}")
# > 0.8 = strong agreement, 0.6-0.8 = good, < 0.6 = needs improvement
```

## A/B Testing

### Statistical Significance

```python
import math

def ab_test_significance(
    conversions_a: int,
    total_a: int,
    conversions_b: int,
    total_b: int
) -> dict:
    """Calculate z-score and p-value for A/B test."""
    rate_a = conversions_a / total_a
    rate_b = conversions_b / total_b
    
    # Pooled rate
    pooled = (conversions_a + conversions_b) / (total_a + total_b)
    
    # Standard error
    se = math.sqrt(pooled * (1 - pooled) * (1/total_a + 1/total_b))
    
    if se == 0:
        return {"z_score": 0, "significant": False, "rate_a": rate_a, "rate_b": rate_b}
    
    z_score = (rate_b - rate_a) / se
    
    # Two-tailed p-value (normal approximation)
    # For |z| > 1.96, p < 0.05
    significant = abs(z_score) > 1.96
    
    return {
        "rate_a": rate_a,
        "rate_b": rate_b,
        "lift": (rate_b - rate_a) / rate_a if rate_a > 0 else 0,
        "z_score": z_score,
        "significant": significant,
        "confidence": "95% confidence" if significant else "Not significant at 95%"
    }

# Usage: Model A vs Model B
# A: 120 thumbs up out of 200 responses
# B: 145 thumbs up out of 200 responses
result = ab_test_significance(120, 200, 145, 200)
print(f"Model A satisfaction: {result['rate_a']:.1%}")
print(f"Model B satisfaction: {result['rate_b']:.1%}")
print(f"Lift: {result['lift']:.1%}")
print(f"Significant: {result['significant']}")
```

### Online A/B Testing Framework

```python
import random
from dataclasses import dataclass

@dataclass
class ABTestConfig:
    name: str
    model_a: str
    model_b: str
    traffic_split: float  # 0.0-1.0, fraction to model B
    min_samples: int = 100
    metrics: list = None

class ABTestRunner:
    def __init__(self, config: ABTestConfig):
        self.config = config
        self.results_a: list[dict] = []
        self.results_b: list[dict] = []
    
    def assign(self, user_id: str) -> str:
        """Deterministic assignment based on user ID."""
        hash_val = hash(user_id) % 100 / 100
        if hash_val < self.config.traffic_split:
            return self.config.model_b
        return self.config.model_a
    
    def record(self, model: str, user_rating: int, latency_ms: float):
        entry = {"rating": user_rating, "latency_ms": latency_ms}
        if model == self.config.model_a:
            self.results_a.append(entry)
        else:
            self.results_b.append(entry)
    
    def can_conclude(self) -> bool:
        return len(self.results_a) >= self.config.min_samples and \
               len(self.results_b) >= self.config.min_samples
    
    def report(self) -> dict:
        def avg(lst, key):
            return sum(x[key] for x in lst) / len(lst) if lst else 0
        
        def satisfaction(lst):
            if not lst:
                return 0
            positive = sum(1 for x in lst if x["rating"] >= 4)
            return positive / len(lst)
        
        return {
            "model_a": {
                "samples": len(self.results_a),
                "avg_rating": avg(self.results_a, "rating"),
                "satisfaction_rate": satisfaction(self.results_a),
                "avg_latency_ms": avg(self.results_a, "latency_ms"),
            },
            "model_b": {
                "samples": len(self.results_b),
                "avg_rating": avg(self.results_b, "rating"),
                "satisfaction_rate": satisfaction(self.results_b),
                "avg_latency_ms": avg(self.results_b, "latency_ms"),
            },
            "can_conclude": self.can_conclude(),
        }
```

## Regression Testing

### Test Suite for LLM Applications

```python
import json
from pathlib import Path
from dataclasses import dataclass

@dataclass
class TestCase:
    id: str
    input: str
    expected_output: str  # Or expected behavior
    min_score: float  # Minimum similarity/quality score
    category: str

class LLMTestSuite:
    def __init__(self, test_file: str):
        self.tests: list[TestCase] = []
        self._load(test_file)
    
    def _load(self, test_file: str):
        with open(test_file) as f:
            data = json.load(f)
            for item in data["tests"]:
                self.tests.append(TestCase(**item))
    
    def run(self, llm_fn, judge_fn=None) -> dict:
        results = []
        
        for test in self.tests:
            output = llm_fn(test.input)
            
            # Check if output meets minimum score
            if judge_fn:
                score = judge_fn(test.input, output, test.expected_output)
            else:
                # Simple string similarity
                score = self._similarity(output, test.expected_output)
            
            passed = score >= test.min_score
            results.append({
                "id": test.id,
                "category": test.category,
                "score": score,
                "passed": passed,
                "input": test.input,
                "output": output[:200],
                "expected": test.expected_output[:200],
            })
        
        passed_count = sum(1 for r in results if r["passed"])
        return {
            "total": len(results),
            "passed": passed_count,
            "failed": len(results) - passed_count,
            "pass_rate": passed_count / len(results) if results else 0,
            "results": results,
        }
    
    def _similarity(self, a: str, b: str) -> float:
        # Simple Jaccard similarity on word sets
        words_a = set(a.lower().split())
        words_b = set(b.lower().split())
        if not words_a or not words_b:
            return 0.0
        return len(words_a & words_b) / len(words_a | words_b)

# tests.json
# {"tests": [{"id": "t1", "input": "What is 2+2?", "expected_output": "4", "min_score": 0.8, "category": "math"}]}

# Usage
suite = LLMTestSuite("tests.json")
report = suite.run(lambda x: llm_call(x))
print(f"Pass rate: {report['pass_rate']:.1%}")
for r in report["results"]:
    if not r["passed"]:
        print(f"FAIL: {r['id']} - Score: {r['score']:.2f}")
```

## CI/CD Integration

```python
import subprocess
import sys

def run_llm_tests():
    """Run LLM evaluation suite in CI/CD pipeline."""
    suite = LLMTestSuite("tests/llm_tests.json")
    
    # Run tests
    report = suite.run(lambda x: llm_call(x))
    
    # Print report
    print(f"\n{'='*60}")
    print(f"LLM Test Suite Report")
    print(f"{'='*60}")
    print(f"Total: {report['total']}")
    print(f"Passed: {report['passed']}")
    print(f"Failed: {report['failed']}")
    print(f"Pass Rate: {report['pass_rate']:.1%}")
    
    if report["failed"] > 0:
        print(f"\n{'='*60}")
        print("Failed Tests:")
        for r in report["results"]:
            if not r["passed"]:
                print(f"\n  [{r['id']}] Category: {r['category']}")
                print(f"  Score: {r['score']:.2f} (min: {r.get('min_score', 'N/A')})")
                print(f"  Input: {r['input'][:100]}")
                print(f"  Output: {r['output'][:100]}")
                print(f"  Expected: {r['expected'][:100]}")
    
    # Fail CI if pass rate below threshold
    threshold = 0.85
    if report["pass_rate"] < threshold:
        print(f"\n❌ Pass rate {report['pass_rate']:.1%} below threshold {threshold:.1%}")
        sys.exit(1)
    else:
        print(f"\n✅ Pass rate {report['pass_rate']:.1%} meets threshold {threshold:.1%}")

if __name__ == "__main__":
    run_llm_tests()
```

## FAQ

### What is LLM-as-judge and is it reliable?

LLM-as-judge uses a strong LLM (like GPT-4o) to evaluate the output of another LLM. It is reliable for subjective quality dimensions (clarity, helpfulness) when the judge model is stronger than the evaluated model. It is less reliable for factuality (the judge may also hallucinate). Use it for relative comparisons (A vs B) rather than absolute scoring. Reduce bias with position randomization and multiple runs.

### How many test cases do I need for regression testing?

Start with 50-100 test cases covering your main use cases. Include edge cases, common questions, and known failure modes. Aim for coverage across categories (factual, creative, code, reasoning). Update the test suite when you find new failure modes in production. A good test suite grows over time as you discover issues.

### What is a good RAGAS score?

RAGAS scores range from 0 to 1. For production RAG systems, target faithfulness > 0.85, answer relevancy > 0.80, context precision > 0.75, context recall > 0.80. These thresholds depend on your use case. A medical RAG system needs higher faithfulness (> 0.95) than a casual Q&A bot (> 0.80).

### How do I detect hallucinations?

Use three approaches: (1) self-consistency — generate multiple responses and check if they agree, (2) source verification — check each claim against retrieved sources, (3) LLM-as-judge — ask a strong model to identify unsupported claims. No single method catches all hallucinations. Combine them for production systems.

### Should I use human evaluation or automated evaluation?

Use both. Automated evaluation (RAGAS, LLM-as-judge) for fast iteration and regression testing. Human evaluation for final quality checks, subjective dimensions, and calibrating automated metrics. Start with automated evaluation, then add human evaluation for high-stakes applications. Human evaluation is slower and more expensive but catches issues automated methods miss.

### How do I set up A/B testing for LLM models?

Split traffic deterministically by user ID (not randomly per request, to avoid seeing both models). Collect user feedback (thumbs up/down, ratings). Run until you reach statistical significance (typically 100+ samples per variant). Use the z-test for proportion comparison. Track secondary metrics (latency, cost) alongside quality.
