---
contentType: docs
slug: ai-rag-evaluation-checklist
templateType: post-deployment-checklist
title: "Checklist de Evaluación de RAG"
description: "Un checklist para evaluar la calidad de sistemas RAG: retrieval accuracy, generation faithfulness, context relevance, answer correctness, citation accuracy, latencia y testing end-to-end con metricas y thresholds."
metaDescription: "Checklist for RAG system quality: retrieval accuracy, generation faithfulness, context relevance, answer correctness, citations, latency, end-to-end testing."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - rag
  - evaluacion
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

Este checklist evalua Retrieval-Augmented Generation (RAG) systems across retrieval quality, generation quality, y operational metrics. Corre este checklist antes de deployear un RAG system a production y despues de cualquier significant change al retrieval index, embedding model, o generation prompt.

---

## 1. Retrieval Quality

### 1.1 Context Precision

Mide si el retrieved context contiene information relevant al query.

```text
Metric: Context Precision
Definition: De los top-k retrieved chunks, que fraction contiene
information que contribuye a answer el query?

Formula: (relevant chunks retrieved) / (total chunks retrieved)

Target: > 0.75 para top-5 retrieval
```

- [ ] Define que cuenta como "relevant" para tu domain
- [ ] Crea un test set de 100+ query-relevant-chunk pairs
- [ ] Mide precision en k=3, k=5, k=10
- [ ] Identifica queries con precision below threshold
- [ ] Investiga low-precision queries: chunk size, embedding model, o query reformulation

### 1.2 Context Recall

Mide si el retrieval system finda all relevant chunks para un query.

```text
Metric: Context Recall
Definition: De all chunks relevant a un query, que fraction fue retrieved?

Formula: (relevant chunks retrieved) / (total relevant chunks in corpus)

Target: > 0.80
```

- [ ] Identifica all relevant chunks para cada test query
- [ ] Mide recall en k=5, k=10, k=20
- [ ] Checkea si relevant chunks faltan del index
- [ ] Verifica que chunk overlap settings no spliteen critical information

### 1.3 Retrieval Latency

```text
Metric: p50, p95, p99 retrieval latency
Target: p95 < 200ms para vector search
Target: p95 < 500ms para hybrid (vector + keyword) search
```

- [ ] Mide retrieval latency bajo load (100 concurrent queries)
- [ ] Checkea vector index configuration (HNSW ef_search, IVF nprobe)
- [ ] Verifica que embedding generation time es acceptable
- [ ] Testea con maximum expected corpus size

### 1.4 Chunking Strategy

- [ ] Chunk size es appropriate para tu content (512-1024 tokens typical)
- [ ] Chunk overlap preservea context across boundaries (50-100 tokens)
- [ ] Document structure es respected (chunks no crossen section boundaries)
- [ ] Tables y code blocks no se splitean across chunks
- [ ] Metadata esta attached a cada chunk (source, page, section)

---

## 2. Generation Quality

### 2.1 Faithfulness

Mide si el generated answer esta grounded en el retrieved context.

```text
Metric: Faithfulness
Definition: De los claims en el generated answer, que fraction puede ser
directly supported por el retrieved context?

Formula: (supported claims) / (total claims in answer)

Target: > 0.90
```

- [ ] Decomposea cada answer en individual claims
- [ ] Verifica cada claim contra el retrieved context
- [ ] Flagea answers con unsupported claims
- [ ] Ajusta el generation prompt para emphasize grounding
- [ ] Considera addear un verification step (second LLM call para check faithfulness)

### 2.2 Answer Relevance

Mide si el generated answer addressea el actual query.

```text
Metric: Answer Relevance
Definition: Que tan directamente el answer addressea el user's question?

Scale: 1 (irrelevant) a 5 (directly answers the question)
Target: Average > 4.0
```

- [ ] Crea un test set de diverse query types (factual, comparative, procedural)
- [ ] Scorea cada answer en el 1-5 scale
- [ ] Identifica query types con low relevance scores
- [ ] Checkea si el generation prompt incluye el query prominently

### 2.3 Answer Correctness

Mide si el generated answer es factually correct.

```text
Metric: Answer Correctness
Definition: Matchea el answer el ground truth?

Methods:
1. Human evaluation — compara answer a verified ground truth
2. LLM-as-judge — usa un stronger model para evaluate correctness
3. Automated — compara contra un known-correct answer set

Target: > 0.85 agreement con ground truth
```

- [ ] Crea un ground truth answer set (50+ questions con verified answers)
- [ ] Corre automated comparison contra ground truth
- [ ] Samplea 10% de answers para human review
- [ ] Trackea correctness over time a medida que el corpus cambia

### 2.4 Hallucination Detection

- [ ] Checkea por entities no present en el retrieved context
- [ ] Checkea por specific numbers, dates, o statistics no en el source
- [ ] Checkea por causal claims no supported por el context
- [ ] Flagea answers que assertean information beyond los retrieved chunks
- [ ] Testea con adversarial queries designed para triggerear hallucinations

---

## 3. Citation y Source Attribution

### 3.1 Citation Accuracy

- [ ] Cada factual claim en el answer tiene un citation
- [ ] Citations referencian el correct source chunk
- [ ] Citation format es consistent (e.g., [1], [Source: document.pdf, p.5])
- [ ] Citations son clickable o traceable al source document

### 3.2 Source Verification

- [ ] Verifica que cited chunks actualmente contienen la claimed information
- [ ] Checkea por citation hallucinations (citar un chunk que no supporta el claim)
- [ ] Testea con queries donde el correct answer requiree synthesizing multiple chunks
- [ ] Asegura que el system dice "I don't know" cuando retrieval returnea no relevant context

---

## 4. End-to-End Testing

### 4.1 Query Coverage

- [ ] Testea factual queries ("What is X?")
- [ ] Testea comparative queries ("What is the difference between X and Y?")
- [ ] Testea procedural queries ("How do I do X?")
- [ ] Testea analytical queries ("Why does X happen?")
- [ ] Testea multi-hop queries (require chaining information desde multiple chunks)
- [ ] Testea negative queries (questions el system no deberia answer)
- [ ] Testea ambiguous queries (queries con multiple valid interpretations)

### 4.2 Edge Cases

- [ ] Empty query — system handlea gracefully
- [ ] Very long query — system processa sin truncation
- [ ] Query en different language — system responde appropriately
- [ ] Query con no relevant context — system dice "I don't know"
- [ ] Query con conflicting sources — system acknowledges conflict
- [ ] Query requiring real-time data — system indica limitation

### 4.3 Regression Testing

- [ ] Mantene un golden test set de 50+ query-answer pairs
- [ ] Corre golden test set despues de every change a: embeddings, chunking, prompts, model
- [ ] Trackea score trends over time
- [ ] Alerta en score drops greater que 5%

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

- [ ] Mide cada component separately
- [ ] Identifica el bottleneck
- [ ] Testea bajo expected production load
- [ ] Setea latency monitoring y alerting

### 5.2 Cost per Query

```text
Cost components:
- Embedding API call: $0.0001 per query (typical)
- Vector search: $0.0001 per query (self-hosted) o $0.001 (managed)
- LLM API call: $0.01-0.05 per query (depende del model y context length)

Total: $0.01-0.06 per query (typical RAG system)
```

- [ ] Trackea cost per query over time
- [ ] Monitora por cost spikes (longer context, mas retrieved chunks)
- [ ] Setea cost budgets y alerts
- [ ] Considera caching para frequent queries

### 5.3 Throughput

- [ ] Mide queries per second bajo load
- [ ] Identifica rate limits (embedding API, vector DB, LLM API)
- [ ] Testea con concurrent users
- [ ] Implementa queueing para burst traffic

---

## 6. Evaluation Framework

### RAGAS Metrics

```python
# Usando RAGAS (Retrieval Augmented Generation Assessment)
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

# Corre evaluation
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

# Corre en test set
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

- [ ] Retrieval precision > 0.75 en k=5
- [ ] Retrieval recall > 0.80 en k=10
- [ ] Faithfulness > 0.90
- [ ] Answer relevance > 4.0 average
- [ ] Answer correctness > 0.85
- [ ] No hallucinations en golden test set
- [ ] All factual claims tienen citations
- [ ] System handlea "no context" queries gracefully
- [ ] p95 end-to-end latency < 3.5s
- [ ] Cost per query dentro de budget
- [ ] Golden test set pasa despues de latest changes
- [ ] Monitoring y alerting configured

## Preguntas Frecuentes

### ¿Con qué frecuencia deberia correr esta evaluation?

Corre el full checklist antes de initial deployment y despues de cualquier significant change: new embedding model, changed chunking strategy, updated generation prompt, o corpus updates. Corre el golden test set (subset) en every release. Corre el full evaluation suite monthly para catchar drift. Setea automated monitoring para latency, cost, y error rates en production.

### ¿Cuál es la diferencia entre faithfulness y correctness?

Faithfulness mide si el answer esta grounded en el retrieved context — no checkea si el context mismo es correct. Correctness mide si el answer matchea el ground truth — checkea el final accuracy. Un system puede ser faithful pero incorrect (si el retrieval returnea wrong information) o correct pero unfaithful (si el LLM usa su own knowledge en vez del context). Ambos metrics matter.

### ¿Cómo creo un ground truth answer set?

Selecta 50-100 representative queries across all query types. Para cada query, hace que un domain expert escriba el correct answer. Include queries que requireen single-chunk answers, multi-chunk synthesis, y "I don't know" responses. Storea el query, ground truth answer, y los relevant source chunks. Updatea el set cuando el corpus cambia significantemente.

### ¿Qué hago si faithfulness es low?

Low faithfulness significa que el LLM esta generando claims no supported por el retrieved context. Fixes: (1) strengthen el system prompt para forbid unsupported claims, (2) reduce temperature a 0, (3) addea un verification step donde un second LLM call checkea cada claim contra el context, (4) usa un model con better instruction-following, (5) reduce el number de retrieved chunks para avoid el LLM picking up irrelevant information.

### ¿Cómo evaluo multi-hop reasoning en RAG?

Multi-hop queries requireen chaining information desde multiple chunks. Crea test queries donde el answer requiree combining facts desde 2-3 different sources. Evalua si el retrieval system returnea all necessary chunks y si el generation step correctly synthesizea los. Trackea multi-hop accuracy separately de single-hop accuracy — es tipicamente harder de get right.
