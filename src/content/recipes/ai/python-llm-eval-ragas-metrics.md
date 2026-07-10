---
contentType: recipes
slug: python-llm-eval-ragas-metrics
title: "Evaluate RAG Quality with RAGAS Metrics"
description: "Measure RAG pipeline quality using RAGAS framework metrics — faithfulness, answer relevancy, context precision, and context recall for objective evaluation"
metaDescription: "Evaluate RAG quality with RAGAS metrics. Measure faithfulness, answer relevancy, context precision and context recall for objective RAG pipeline evaluation."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - ragas
  - rag evaluation
  - llm metrics
  - testing
relatedResources:
  - /recipes/ai/python-rag-chroma-local
  - /recipes/ai/python-vector-database-pinecone
  - /recipes/ai/python-langchain-chains-composition
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Evaluate RAG quality with RAGAS metrics. Measure faithfulness, answer relevancy, context precision and context recall for objective RAG pipeline evaluation."
  keywords:
    - ragas
    - rag evaluation
    - llm metrics
    - faithfulness
    - context precision
---

# Evaluate RAG Quality with RAGAS Metrics

RAG pipelines are hard to evaluate — how do you know if the retrieved context was relevant or if the answer is grounded? RAGAS (Retrieval-Augmented Generation Assessment) provides automated metrics using an LLM-as-judge approach. Below: evaluating a RAG pipeline with the four core RAGAS metrics: faithfulness, answer relevancy, context precision, and context recall.

## When to Use This

- Evaluating RAG pipeline quality before deploying to production
- Comparing different chunking strategies, embedding models, or LLMs
- Regression testing when changing RAG components
- Establishing baseline metrics for continuous improvement

## Prerequisites

- Python 3.10+
- `ragas` package (`pip install ragas`)
- `langchain-openai` for the evaluator LLM
- An OpenAI API key

## Solution

### 1. Install Dependencies

```bash
pip install ragas langchain-openai datasets
```

### 2. Prepare Evaluation Dataset

```python
from datasets import Dataset

eval_data = {
    "question": [
        "What is the Redis cache-aside pattern?",
        "How does Docker Compose define multi-container apps?",
        "What are PostgreSQL ACID compliance features?",
    ],
    "answer": [
        "The cache-aside pattern checks the cache first, and if data is missing, loads it from the database and sets it in the cache with a TTL.",
        "Docker Compose uses a YAML file to define multi-container applications, specifying services, networks, and volumes.",
        "PostgreSQL provides ACID compliance through atomic transactions, consistent constraints, isolation levels, and durable write-ahead logging.",
    ],
    "contexts": [
        [
            "Redis cache-aside: application checks cache first. On cache miss, loads from database and sets cache entry with TTL.",
        ],
        [
            "Docker Compose is a tool for defining multi-container Docker applications in a YAML file with services, networks, and volumes.",
        ],
        [
            "PostgreSQL ensures ACID compliance: atomicity via transactions, consistency via constraints, isolation via MVCC, durability via WAL.",
        ],
    ],
    "ground_truth": [
        "Cache-aside checks cache first, loads from DB on miss, sets cache with TTL.",
        "Docker Compose defines multi-container apps in YAML with services, networks, and volumes.",
        "PostgreSQL ACID: atomicity (transactions), consistency (constraints), isolation (MVCC), durability (WAL).",
    ],
}

eval_dataset = Dataset.from_dict(eval_data)
```

### 3. Run RAGAS Evaluation

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

# LLM and embeddings for evaluation
eval_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
eval_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Run evaluation with all four core metrics
results = evaluate(
    eval_dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
    ],
    llm=eval_llm,
    embeddings=eval_embeddings,
)

# Convert to pandas DataFrame for analysis
df = results.to_pandas()
print(df[["question", "faithfulness", "answer_relevancy", "context_precision", "context_recall"]])
```

### 4. Interpret the Metrics

```python
def print_eval_report(results) -> None:
    """Print a formatted evaluation report."""
    df = results.to_pandas()

    print("=" * 60)
    print("RAGAS Evaluation Report")
    print("=" * 60)

    metrics = ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]

    for metric in metrics:
        scores = df[metric].tolist()
        avg = sum(scores) / len(scores)
        print(f"\n{metric.replace('_', ' ').title()}:")
        print(f"  Average: {avg:.3f}")
        print(f"  Min:     {min(scores):.3f}")
        print(f"  Max:     {max(scores):.3f}")
        for i, score in enumerate(scores):
            print(f"  Q{i+1}: {score:.3f}")

    print("\n" + "=" * 60)
    overall = sum(df[m].mean() for m in metrics) / len(metrics)
    print(f"Overall Score: {overall:.3f}")

print_eval_report(results)
```

### 5. Evaluate Your Own RAG Pipeline

```python
from typing import List

def evaluate_rag_pipeline(
    rag_pipeline,
    test_cases: List[dict],
) -> "Dataset":
    """Evaluate a RAG pipeline against test cases.

    Args:
        rag_pipeline: Object with .ask(query) -> {answer, sources} method.
        test_cases: List of {question, ground_truth} dicts.

    Returns:
        RAGAS evaluation results.
    """
    eval_rows = []

    for case in test_cases:
        # Run the RAG pipeline
        result = rag_pipeline.ask(case["question"])

        eval_rows.append({
            "question": case["question"],
            "answer": result["answer"],
            "contexts": [s["text"] for s in result["sources"]],
            "ground_truth": case["ground_truth"],
        })

    dataset = Dataset.from_list(eval_rows)

    return evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
        llm=eval_llm,
        embeddings=eval_embeddings,
    )

# Usage
test_cases = [
    {
        "question": "What data structures does Redis support?",
        "ground_truth": "Redis supports strings, hashes, lists, sets, sorted sets, streams, and more.",
    },
    {
        "question": "How does PostgreSQL handle isolation?",
        "ground_truth": "PostgreSQL handles isolation via MVCC (Multi-Version Concurrency Control).",
    },
]

results = evaluate_rag_pipeline(my_rag_pipeline, test_cases)
print_eval_report(results)
```

## How It Works

1. **Faithfulness** — measures whether the answer is grounded in the retrieved context. If the answer contains claims not supported by the context, faithfulness drops. High faithfulness = low hallucination.
2. **Answer Relevancy** — measures how relevant the answer is to the question. The LLM generates potential questions from the answer and compares them to the original question using embeddings.
3. **Context Precision** — measures whether the retrieved context contains information needed to answer the question. High precision means the retrieval found the right documents.
4. **Context Recall** — measures whether all the information needed to answer the question was retrieved. High recall means no relevant information was missed.
5. **LLM-as-judge** — RAGAS uses an LLM to evaluate each metric, making it automated but dependent on the evaluator LLM's quality. Use `gpt-4o` for best results.

## Variants

### Custom Metrics

```python
from ragas.metrics import Metric

class ConcisenessMetric(Metric):
    """Custom metric: measure answer conciseness."""

    name = "conciseness"

    def _as_dict(self):
        return {"name": self.name}

    def score(self, row):
        answer = row["answer"]
        words = len(answer.split())
        # Score: 1.0 for 20-50 words, decreasing for longer answers
        if 20 <= words <= 50:
            return 1.0
        elif words < 20:
            return words / 20
        else:
            return max(0.0, 50 / words)
```

### Batch Evaluation with CSV

```python
import pandas as pd

def evaluate_from_csv(csv_path: str) -> pd.DataFrame:
    """Load test cases from CSV and evaluate."""
    df = pd.read_csv(csv_path)

    # CSV columns: question, answer, contexts (semicolon-separated), ground_truth
    eval_data = {
        "question": df["question"].tolist(),
        "answer": df["answer"].tolist(),
        "contexts": [c.split(";") for c in df["contexts"]],
        "ground_truth": df["ground_truth"].tolist(),
    }

    dataset = Dataset.from_dict(eval_data)
    results = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
        llm=eval_llm,
        embeddings=eval_embeddings,
    )
    return results.to_pandas()
```

### Compare Two RAG Configurations

```python
def compare_configs(
    pipeline_a,
    pipeline_b,
    test_cases: list[dict],
) -> pd.DataFrame:
    """Compare two RAG configurations side by side."""
    results_a = evaluate_rag_pipeline(pipeline_a, test_cases).to_pandas()
    results_b = evaluate_rag_pipeline(pipeline_b, test_cases).to_pandas()

    comparison = pd.DataFrame({
        "question": results_a["question"],
        "faithfulness_a": results_a["faithfulness"],
        "faithfulness_b": results_b["faithfulness"],
        "relevancy_a": results_a["answer_relevancy"],
        "relevancy_b": results_b["answer_relevancy"],
        "precision_a": results_a["context_precision"],
        "precision_b": results_b["context_precision"],
        "recall_a": results_a["context_recall"],
        "recall_b": results_b["context_recall"],
    })

    comparison["faithfulness_diff"] = comparison["faithfulness_b"] - comparison["faithfulness_a"]
    comparison["relevancy_diff"] = comparison["relevancy_b"] - comparison["relevancy_a"]

    return comparison
```

## Best Practices

- **Use `gpt-4o` as evaluator** — cheaper models produce inconsistent judgments
- **Create diverse test cases** — cover different question types (factual, comparative, procedural)
- **Include ground truth from domain experts** — automated ground truth generation is less reliable
- **Run evaluation after every RAG change** — chunking strategy, embedding model, or LLM changes affect all metrics

## Common Mistakes

- **Evaluating without ground truth** — context recall requires ground truth answers; without it, you only get 3 of 4 metrics
- **Using the same LLM for generation and evaluation** — can bias results; use a different model or at least different temperature
- **Too few test cases** — 3-5 cases give noisy results; aim for 20+ for reliable averages
- **Ignoring faithfulness** — high answer relevancy with low faithfulness means confident hallucination

## FAQ

**Q: What is a good RAGAS score?**
A: 0.7+ is acceptable for most use cases. 0.8+ is good. 0.9+ is excellent. Below 0.5 indicates a problem with retrieval or generation.

**Q: How much does RAGAS evaluation cost?**
A: Each metric makes 1-3 LLM calls per test case. Evaluating 20 cases with 4 metrics on `gpt-4o-mini` costs ~$0.50.

**Q: Can I use RAGAS with non-OpenAI models?**
A: Yes. RAGAS supports any LangChain LLM and embeddings. Pass your model to the `llm` and `embeddings` parameters.

**Q: How often should I run RAGAS?**
A: Run it as part of CI/CD whenever you change RAG components (embedding model, chunk size, LLM, prompt template).

**Q: What is a good faithfulness score?**
A: A faithfulness score above 0.8 means the answer is mostly grounded in the retrieved context. Below 0.5 indicates hallucination — the model is generating content not supported by the sources. Investigate chunk size, retrieval quality, and prompt instructions.

**Q: Can I add custom metrics to RAGAS?**
A: Yes. Create a class extending `Metric` and implement the `score` method. Register it in the evaluation pipeline alongside the built-in metrics. Custom metrics are useful for domain-specific checks like citation accuracy or format compliance.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
