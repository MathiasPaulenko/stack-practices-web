---
contentType: guides
slug: complete-guide-llm-evaluation
title: "Referencia Detallada de Evaluación de LLM"
description: "Evaluar aplicaciones LLM en produccion. Cubre RAGAS, LLM-as-judge, evaluacion humana, A/B testing, deteccion de hallucinations, toxicity scoring, regression testing y pipelines de evaluacion automatizados."
metaDescription: "Evaluar apps LLM. Cubre RAGAS, LLM-as-judge, eval humana, A/B testing, hallucination detection, toxicity, regression testing."
difficulty: advanced
topics:
  - ai
  - testing
  - performance
tags:
  - llm
  - evaluation
  - ai
  - guia
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
  metaDescription: "Evaluar apps LLM. Cubre RAGAS, LLM-as-judge, eval humana, A/B testing, hallucination detection, toxicity, regression testing."
  keywords:
    - evaluacion llm
    - ragas
    - llm as judge
    - evaluacion humana
    - ab testing llm
    - hallucination detection
    - toxicity scoring
    - llm regression testing
---

## Introducción

Evaluar aplicaciones LLM es mas dificil que evaluar software tradicional. Los outputs son non-deterministic, la calidad es subjetiva, y los failures son sutiles. Los sistemas LLM en produccion necesitan pipelines de evaluacion automatizados que catchen regressions, midan calidad, y detecten hallucinations antes de que lleguen a users. Lo siguiente recorre el espectro completo de evaluacion LLM: RAGAS para sistemas RAG, LLM-as-judge para calidad subjetiva, evaluacion humana, A/B testing, y construir pipelines de evaluacion CI/CD.

## Dimensiones de Evaluacion

```text
Dimensiones de Calidad de LLM Output:

1. Faithfulness: Esta el answer grounded en el context provided?
2. Answer Relevancy: Addressea el answer la question?
3. Context Precision: Son los retrieved documents relevant?
4. Context Recall: Retrieveamos toda la informacion needed?
5. Factuality: Es el answer factually correct?
6. Toxicity: Es el answer safe y non-toxic?
7. Coherence: Es el answer well-structured y readable?
8. Completeness: Cubre el answer todos los aspectos de la question?
9. Conciseness: Es el answer apropiadamente concise?
10. Hallucination Rate: Que tan seguido fabrica informacion el model?
```

## Framework RAGAS

### Instalar y Usar RAGAS

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

# Preparar evaluation dataset
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

# Evaluar
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

### LLM Judge Basico

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

# Uso
evaluation = await llm_judge(
    question="What is the GIL in Python?",
    response="The GIL is a lock that prevents multiple threads from running Python code simultaneously.",
    reference="The Global Interpreter Lock (GIL) is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes at once."
)
print(f"Overall: {evaluation['overall']}/10")
print(f"Reasoning: {evaluation['reasoning']}")
```

### Comparacion Pairwise

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

### Reducir Judge Bias

```python
import random

async def unbiased_pairwise_compare(question: str, response_a: str, response_b: str) -> dict:
    # Randomizar orden para reducir position bias
    if random.random() > 0.5:
        result = await pairwise_compare(question, response_a, response_b)
        # Map back a original A/B
        if result["winner"] == "A":
            result["winner"] = "A"
        elif result["winner"] == "B":
            result["winner"] = "B"
    else:
        result = await pairwise_compare(question, response_b, response_a)
        # Flip el result
        if result["winner"] == "A":
            result["winner"] = "B"
        elif result["winner"] == "B":
            result["winner"] = "A"
    
    return result

# Correr multiples comparisons y aggregate
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

## Deteccion de Hallucinations

### Self-Consistency Check

```python
async def self_consistency_check(question: str, n: int = 3) -> dict:
    """Generar multiples responses y checkear consistency."""
    responses = []
    
    for _ in range(n):
        result = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": question}],
            temperature=0.7  # Higher temperature para diversity
        )
        responses.append(result.choices[0].message.content)
    
    # Usar LLM para checkear si responses son consistent
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

### Cross-Reference con Sources

```python
async def fact_check_with_sources(answer: str, sources: list[str]) -> dict:
    """Checkear si cada claim en el answer esta supported por los sources."""
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

## Evaluacion Humana

### Interfaz de Evaluacion

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

# En practica, usar una tool como Argilla, Label Studio, o un custom UI
```

### Inter-Annotator Agreement

```python
def cohen_kappa(ratings_a: list[int], ratings_b: list[int]) -> float:
    """Calcular Cohen's Kappa para inter-annotator agreement."""
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

# Uso
evaluator_1 = [5, 4, 3, 5, 4, 2, 5, 3, 4, 5]
evaluator_2 = [5, 4, 4, 5, 3, 2, 5, 3, 4, 4]

kappa = cohen_kappa(evaluator_1, evaluator_2)
print(f"Inter-annotator agreement (Cohen's Kappa): {kappa:.3f}")
# > 0.8 = strong agreement, 0.6-0.8 = good, < 0.6 = needs improvement
```

## A/B Testing

### Significancia Estadistica

```python
import math

def ab_test_significance(
    conversions_a: int,
    total_a: int,
    conversions_b: int,
    total_b: int
) -> dict:
    """Calcular z-score y p-value para A/B test."""
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
    # Para |z| > 1.96, p < 0.05
    significant = abs(z_score) > 1.96
    
    return {
        "rate_a": rate_a,
        "rate_b": rate_b,
        "lift": (rate_b - rate_a) / rate_a if rate_a > 0 else 0,
        "z_score": z_score,
        "significant": significant,
        "confidence": "95% confidence" if significant else "Not significant at 95%"
    }

# Uso: Model A vs Model B
# A: 120 thumbs up de 200 responses
# B: 145 thumbs up de 200 responses
result = ab_test_significance(120, 200, 145, 200)
print(f"Model A satisfaction: {result['rate_a']:.1%}")
print(f"Model B satisfaction: {result['rate_b']:.1%}")
print(f"Lift: {result['lift']:.1%}")
print(f"Significant: {result['significant']}")
```

### Framework de A/B Testing Online

```python
import random
from dataclasses import dataclass

@dataclass
class ABTestConfig:
    name: str
    model_a: str
    model_b: str
    traffic_split: float  # 0.0-1.0, fraction a model B
    min_samples: int = 100
    metrics: list = None

class ABTestRunner:
    def __init__(self, config: ABTestConfig):
        self.config = config
        self.results_a: list[dict] = []
        self.results_b: list[dict] = []
    
    def assign(self, user_id: str) -> str:
        """Deterministic assignment basado en user ID."""
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

### Test Suite para Aplicaciones LLM

```python
import json
from pathlib import Path
from dataclasses import dataclass

@dataclass
class TestCase:
    id: str
    input: str
    expected_output: str  # O expected behavior
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
            
            # Checkear si output meets minimum score
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
        # Simple Jaccard similarity en word sets
        words_a = set(a.lower().split())
        words_b = set(b.lower().split())
        if not words_a or not words_b:
            return 0.0
        return len(words_a & words_b) / len(words_a | words_b)

# tests.json
# {"tests": [{"id": "t1", "input": "What is 2+2?", "expected_output": "4", "min_score": 0.8, "category": "math"}]}

# Uso
suite = LLMTestSuite("tests.json")
report = suite.run(lambda x: llm_call(x))
print(f"Pass rate: {report['pass_rate']:.1%}")
for r in report["results"]:
    if not r["passed"]:
        print(f"FAIL: {r['id']} - Score: {r['score']:.2f}")
```

## Integracion CI/CD

```python
import subprocess
import sys

def run_llm_tests():
    """Correr LLM evaluation suite en CI/CD pipeline."""
    suite = LLMTestSuite("tests/llm_tests.json")
    
    # Correr tests
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
    
    # Fail CI si pass rate below threshold
    threshold = 0.85
    if report["pass_rate"] < threshold:
        print(f"\n❌ Pass rate {report['pass_rate']:.1%} below threshold {threshold:.1%}")
        sys.exit(1)
    else:
        print(f"\n✅ Pass rate {report['pass_rate']:.1%} meets threshold {threshold:.1%}")

if __name__ == "__main__":
    run_llm_tests()
```

## Preguntas Frecuentes

### ¿Qué es LLM-as-judge y es confiable?

LLM-as-judge usa un LLM fuerte (como GPT-4o) para evaluar el output de otro LLM. Es confiable para dimensiones de calidad subjetiva (clarity, helpfulness) cuando el judge model es mas fuerte que el model evaluado. Es menos confiable para factuality (el judge puede tambien hallucinate). Usalo para comparisons relativas (A vs B) en lugar de absolute scoring. Reduce bias con position randomization y multiples runs.

### ¿Cuántos test cases necesito para regression testing?

Empieza con 50-100 test cases cubriendo tus main use cases. Incluye edge cases, common questions, y known failure modes. Apunta a coverage across categories (factual, creative, code, reasoning). Updatea el test suite cuando encuentres nuevos failure modes en produccion. Un buen test suite crece a lo largo del tiempo a medida que descubres issues.

### ¿Qué es un buen RAGAS score?

RAGAS scores van de 0 a 1. Para production RAG systems, targetea faithfulness > 0.85, answer relevancy > 0.80, context precision > 0.75, context recall > 0.80. Estos thresholds dependen de tu use case. Un medical RAG system necesita higher faithfulness (> 0.95) que un casual Q&A bot (> 0.80).

### ¿Cómo detecto hallucinations?

Usa tres approaches: (1) self-consistency — genera multiples responses y checkea si agree, (2) source verification — checkea cada claim contra retrieved sources, (3) LLM-as-judge — pide a un strong model que identifique unsupported claims. Ningun metodo solo catchea todas las hallucinations. Combinados para production systems.

### ¿Debería usar evaluacion humana o automatizada?

Usa ambas. Evaluacion automatizada (RAGAS, LLM-as-judge) para fast iteration y regression testing. Evaluacion humana para final quality checks, dimensiones subjetivas, y calibrar automated metrics. Empieza con evaluacion automatizada, luego agrega evaluacion humana para aplicaciones high-stakes. Evaluacion humana es mas lenta y cara pero catchea issues que automated methods miss.

### ¿Cómo seteo A/B testing para LLM models?

Splitea traffic deterministicamente por user ID (no randomamente per request, para evitar ver ambos models). Colecciona user feedback (thumbs up/down, ratings). Corre hasta alcanzar statistical significance (tipicamente 100+ samples per variant). Usa z-test para proportion comparison. Trackea secondary metrics (latency, cost) junto con quality.
