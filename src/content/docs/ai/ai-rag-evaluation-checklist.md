---
contentType: docs
slug: ai-rag-evaluation-checklist
templateType: post-deployment-checklist
title: "AI RAG Evaluation Checklist"
description: "A checklist for evaluating RAG system quality: retrieval accuracy, generation faithfulness, context relevance, answer correctness, citation accuracy, latency, and end-to-end testing with metrics and thresholds."
metaDescription: "Checklist for RAG system quality: retrieval accuracy, generation faithfulness, context relevance, answer correctness, citations, latency, end-to-end testing."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - rag
  - evaluation
  - checklist
  - llm
  - retrieval
  - quality-assurance
relatedResources:
  - /docs/ai/ai-llm-prompt-template-library
  - /docs/ai/ai-data-preparation-checklist
  - /guides/ai/complete-guide-rag-production
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Checklist for RAG system quality: retrieval accuracy, generation faithfulness, context relevance, answer correctness, citations, latency, end-to-end testing."
  keywords:
    - rag evaluation
    - rag checklist
    - retrieval accuracy
    - generation faithfulness
    - context relevance
    - answer correctness
    - rag metrics
---

## Overview

This checklist evaluates Retrieval-Augmented Generation (RAG) systems across retrieval quality, generation quality, and operational metrics. Run this checklist before deploying a RAG system to production and after any significant change to the retrieval index, embedding model, or generation prompt.

---

## 1. Retrieval Quality

### 1.1 Context Precision

Measure whether the retrieved context contains information relevant to the query.

```text
Metric: Context Precision
Definition: Of the top-k retrieved chunks, what fraction contains
information that contributes to answering the query?

Formula: (relevant chunks retrieved) / (total chunks retrieved)

Target: > 0.75 for top-5 retrieval
```

- [ ] Define what counts as "relevant" for your domain
- [ ] Create a test set of 100+ query-relevant-chunk pairs
- [ ] Measure precision at k=3, k=5, k=10
- [ ] Identify queries with precision below threshold
- [ ] Investigate low-precision queries: chunk size, embedding model, or query reformulation

### 1.2 Context Recall

Measure whether the retrieval system finds all relevant chunks for a query.

```text
Metric: Context Recall
Definition: Of all chunks relevant to a query, what fraction was retrieved?

Formula: (relevant chunks retrieved) / (total relevant chunks in corpus)

Target: > 0.80
```

- [ ] Identify all relevant chunks for each test query
- [ ] Measure recall at k=5, k=10, k=20
- [ ] Check if relevant chunks are missing from the index
- [ ] Verify chunk overlap settings do not split critical information

### 1.3 Retrieval Latency

```text
Metric: p50, p95, p99 retrieval latency
Target: p95 < 200ms for vector search
Target: p95 < 500ms for hybrid (vector + keyword) search
```

- [ ] Measure retrieval latency under load (100 concurrent queries)
- [ ] Check vector index configuration (HNSW ef_search, IVF nprobe)
- [ ] Verify embedding generation time is acceptable
- [ ] Test with maximum expected corpus size

### 1.4 Chunking Strategy

- [ ] Chunk size is appropriate for your content (512-1024 tokens typical)
- [ ] Chunk overlap preserves context across boundaries (50-100 tokens)
- [ ] Document structure is respected (chunks do not cross section boundaries)
- [ ] Tables and code blocks are not split across chunks
- [ ] Metadata is attached to each chunk (source, page, section)

---

## 2. Generation Quality

### 2.1 Faithfulness

Measure whether the generated answer is grounded in the retrieved context.

```text
Metric: Faithfulness
Definition: Of the claims in the generated answer, what fraction can be
directly supported by the retrieved context?

Formula: (supported claims) / (total claims in answer)

Target: > 0.90
```

- [ ] Decompose each answer into individual claims
- [ ] Verify each claim against the retrieved context
- [ ] Flag answers with unsupported claims
- [ ] Adjust generation prompt to emphasize grounding
- [ ] Consider adding a verification step (second LLM call to check faithfulness)

### 2.2 Answer Relevance

Measure whether the generated answer addresses the actual query.

```text
Metric: Answer Relevance
Definition: How directly does the answer address the user's question?

Scale: 1 (irrelevant) to 5 (directly answers the question)
Target: Average > 4.0
```

- [ ] Create a test set of diverse query types (factual, comparative, procedural)
- [ ] Score each answer on the 1-5 scale
- [ ] Identify query types with low relevance scores
- [ ] Check if the generation prompt includes the query prominently

### 2.3 Answer Correctness

Measure whether the generated answer is factually correct.

```text
Metric: Answer Correctness
Definition: Does the answer match the ground truth?

Methods:
1. Human evaluation — compare answer to verified ground truth
2. LLM-as-judge — use a stronger model to evaluate correctness
3. Automated — compare against a known-correct answer set

Target: > 0.85 agreement with ground truth
```

- [ ] Create a ground truth answer set (50+ questions with verified answers)
- [ ] Run automated comparison against ground truth
- [ ] Sample 10% of answers for human review
- [ ] Track correctness over time as the corpus changes

### 2.4 Hallucination Detection

- [ ] Check for entities not present in the retrieved context
- [ ] Check for specific numbers, dates, or statistics not in the source
- [ ] Check for causal claims not supported by the context
- [ ] Flag answers that assert information beyond the retrieved chunks
- [ ] Test with adversarial queries designed to trigger hallucinations

---

## 3. Citation and Source Attribution

### 3.1 Citation Accuracy

- [ ] Every factual claim in the answer has a citation
- [ ] Citations reference the correct source chunk
- [ ] Citation format is consistent (e.g., [1], [Source: document.pdf, p.5])
- [ ] Citations are clickable or traceable to the source document

### 3.2 Source Verification

- [ ] Verify that cited chunks actually contain the claimed information
- [ ] Check for citation hallucinations (citing a chunk that does not support the claim)
- [ ] Test with queries where the correct answer requires synthesizing multiple chunks
- [ ] Ensure the system says "I don't know" when retrieval returns no relevant context

---

## 4. End-to-End Testing

### 4.1 Query Coverage

- [ ] Test factual queries ("What is X?")
- [ ] Test comparative queries ("What is the difference between X and Y?")
- [ ] Test procedural queries ("How do I do X?")
- [ ] Test analytical queries ("Why does X happen?")
- [ ] Test multi-hop queries (require chaining information from multiple chunks)
- [ ] Test negative queries (questions the system should not answer)
- [ ] Test ambiguous queries (queries with multiple valid interpretations)

### 4.2 Edge Cases

- [ ] Empty query — system handles gracefully
- [ ] Very long query — system processes without truncation
- [ ] Query in different language — system responds appropriately
- [ ] Query with no relevant context — system says "I don't know"
- [ ] Query with conflicting sources — system acknowledges conflict
- [ ] Query requiring real-time data — system indicates limitation

### 4.3 Regression Testing

- [ ] Maintain a golden test set of 50+ query-answer pairs
- [ ] Run golden test set after every change to: embeddings, chunking, prompts, model
- [ ] Track score trends over time
- [ ] Alert on score drops greater than 5%

---

## 5. Operational Metrics

### 5.1 End-to-End Latency

```text
Component          | p50 Target | p95 Target
───────────────────┼────────────┼───────────
Embedding generation| 50ms       | 150ms
Vector search       | 100ms      | 200ms
Context preparation | 20ms       | 50ms
LLM generation      | 1000ms     | 3000ms
Total               | 1200ms     | 3500ms
```

- [ ] Measure each component separately
- [ ] Identify the bottleneck
- [ ] Test under expected production load
- [ ] Set up latency monitoring and alerting

### 5.2 Cost per Query

```text
Cost components:
- Embedding API call: $0.0001 per query (typical)
- Vector search: $0.0001 per query (self-hosted) or $0.001 (managed)
- LLM API call: $0.01-0.05 per query (depends on model and context length)

Total: $0.01-0.06 per query (typical RAG system)
```

- [ ] Track cost per query over time
- [ ] Monitor for cost spikes (longer context, more retrieved chunks)
- [ ] Set cost budgets and alerts
- [ ] Consider caching for frequent queries

### 5.3 Throughput

- [ ] Measure queries per second under load
- [ ] Identify rate limits (embedding API, vector DB, LLM API)
- [ ] Test with concurrent users
- [ ] Implement queueing for burst traffic

---

## 6. Evaluation Framework

### RAGAS Metrics

```python
# Using RAGAS (Retrieval Augmented Generation Assessment)
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

# Prepare evaluation dataset
eval_data = Dataset.from_dict({
    "question": ["What is the refund policy?", "How do I reset my password?"],
    "answer": ["Customers can request refunds within 30 days...", ...],
    "contexts": [["Refunds are available within 30 days of purchase..."], ...],
    "ground_truth": ["Refunds are available within 30 days.", ...],
})

# Run evaluation
results = evaluate(
    eval_data,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)

print(results)
# {'faithfulness': 0.92, 'answer_relevancy': 4.2,
#  'context_precision': 0.85, 'context_recall': 0.88}
```

### Custom Evaluation Script

```python
import json
from openai import OpenAI

client = OpenAI()

def evaluate_rag_response(query, retrieved_chunks, answer, ground_truth):
    eval_prompt = f"""
Evaluate this RAG response on three criteria. Score each 1-5.

Query: {query}
Retrieved context: {retrieved_chunks}
Generated answer: {answer}
Ground truth: {ground_truth}

Criteria:
1. Faithfulness: Is every claim in the answer supported by the context?
2. Relevance: Does the answer directly address the query?
3. Correctness: Does the answer match the ground truth?

Return JSON: {{"faithfulness": N, "relevance": N, "correctness": N}}
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": eval_prompt}],
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)

# Run on test set
results = []
for item in test_set:
    score = evaluate_rag_response(
        item["query"],
        item["chunks"],
        item["answer"],
        item["ground_truth"],
    )
    results.append(score)

# Aggregate
avg_faithfulness = sum(r["faithfulness"] for r in results) / len(results)
avg_relevance = sum(r["relevance"] for r in results) / len(results)
avg_correctness = sum(r["correctness"] for r in results) / len(results)

print(f"Faithfulness: {avg_faithfulness:.2f}")
print(f"Relevance: {avg_relevance:.2f}")
print(f"Correctness: {avg_correctness:.2f}")
```

---

## 7. Sign-Off Checklist

- [ ] Retrieval precision > 0.75 at k=5
- [ ] Retrieval recall > 0.80 at k=10
- [ ] Faithfulness > 0.90
- [ ] Answer relevance > 4.0 average
- [ ] Answer correctness > 0.85
- [ ] No hallucinations in golden test set
- [ ] All factual claims have citations
- [ ] System handles "no context" queries gracefully
- [ ] p95 end-to-end latency < 3.5s
- [ ] Cost per query within budget
- [ ] Golden test set passes after latest changes
- [ ] Monitoring and alerting configured

## FAQ

### How often should I run this evaluation?

Run the full checklist before initial deployment and after any significant change: new embedding model, changed chunking strategy, updated generation prompt, or corpus updates. Run the golden test set (subset) on every release. Run the full evaluation suite monthly to catch drift. Set up automated monitoring for latency, cost, and error rates in production.

### What is the difference between faithfulness and correctness?

Faithfulness measures whether the answer is grounded in the retrieved context — it does not check if the context itself is correct. Correctness measures whether the answer matches the ground truth — it checks the final accuracy. A system can be faithful but incorrect (if the retrieval returns wrong information) or correct but unfaithful (if the LLM uses its own knowledge instead of the context). Both metrics matter.

### How do I create a ground truth answer set?

Select 50-100 representative queries across all query types. For each query, have a domain expert write the correct answer. Include queries that require single-chunk answers, multi-chunk synthesis, and "I don't know" responses. Store the query, ground truth answer, and the relevant source chunks. Update the set when the corpus changes considerably.

### What should I do if faithfulness is low?

Low faithfulness means the LLM is generating claims not supported by the retrieved context. Fixes: (1) strengthen the system prompt to forbid unsupported claims, (2) reduce temperature to 0, (3) add a verification step where a second LLM call checks each claim against the context, (4) use a model with better instruction-following, (5) reduce the number of retrieved chunks to avoid the LLM picking up irrelevant information.

### How do I evaluate multi-hop reasoning in RAG?

Multi-hop queries require chaining information from multiple chunks. Create test queries where the answer requires combining facts from 2-3 different sources. Evaluate whether the retrieval system returns all necessary chunks and whether the generation step correctly synthesizes them. Track multi-hop accuracy separately from single-hop accuracy — it is typically harder to get right.
