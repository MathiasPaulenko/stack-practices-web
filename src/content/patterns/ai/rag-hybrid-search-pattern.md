---
contentType: patterns
slug: rag-hybrid-search-pattern
title: "RAG Hybrid Search Pattern"
description: "Combine keyword (BM25) and semantic (vector) search to improve retrieval accuracy in RAG pipelines. Fuse ranked results using reciprocal rank fusion."
metaDescription: "Implement RAG hybrid search by combining BM25 keyword search with vector semantic search and reciprocal rank fusion for better retrieval accuracy."
difficulty: intermediate
topics:
  - ai
  - data
tags:
  - rag
  - hybrid-search
  - pattern
  - ai-pattern
  - retrieval
  - embeddings
  - bm25
  - vector-search
relatedResources:
  - /recipes/ai/python-rag-chroma-local
  - /recipes/ai/python-vector-database-pinecone
  - /recipes/ai/python-openai-embeddings-cosine
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement RAG hybrid search by combining BM25 keyword search with vector semantic search and reciprocal rank fusion for better retrieval accuracy."
  keywords:
    - rag hybrid search
    - bm25 vector search
    - reciprocal rank fusion
    - ai pattern
    - retrieval augmented generation
    - semantic search
    - keyword search fusion
---

# RAG Hybrid Search Pattern

## Overview

Hybrid search combines two retrieval strategies: **keyword search** (BM25 or TF-IDF) that matches exact terms, and **semantic search** (vector embeddings) that matches meaning. Neither approach alone covers all query types. Keyword search misses synonyms and paraphrases. Semantic search can miss exact matches like product codes or proper nouns. Fusing both ranked lists produces more relevant results than either method alone.

The fusion step uses **Reciprocal Rank Fusion (RRF)**, a rank-based method that combines multiple result lists without needing score calibration. RRF is simple, parameter-light, and works across different scoring scales.

## When to Use

Use the RAG Hybrid Search Pattern when:
- Your RAG pipeline serves queries that mix exact terms with conceptual language
- Pure semantic search misses specific names, codes, or identifiers users search for
- Pure keyword search fails on paraphrased or reworded questions
- You need higher retrieval precision without retraining embedding models
- Examples: documentation search, product catalogs, internal knowledge bases, legal document retrieval

## Solution

### Python

```python
import math
from typing import List, Dict, Tuple
from dataclasses import dataclass

@dataclass
class Document:
    id: str
    text: str

@dataclass
class SearchResult:
    id: str
    score: float

def bm25_search(
    query: str, documents: List[Document], top_k: int = 10
) -> List[SearchResult]:
    """Simplified BM25 keyword search."""
    query_terms = query.lower().split()
    scores: Dict[str, float] = {}
    doc_count = len(documents)
    avg_len = sum(len(d.text.split()) for d in documents) / max(doc_count, 1)

    k1, b = 1.5, 0.75

    for doc in documents:
        doc_terms = doc.text.lower().split()
        doc_len = len(doc_terms)
        score = 0.0

        for term in query_terms:
            tf = doc_terms.count(term)
            df = sum(1 for d in documents if term in d.text.lower())
            idf = math.log((doc_count - df + 0.5) / (df + 0.5) + 1)
            score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc_len / avg_len))

        if score > 0:
            scores[doc.id] = score

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [SearchResult(id=did, score=score) for did, score in ranked]


def vector_search(
    query_embedding: List[float],
    doc_embeddings: Dict[str, List[float]],
    top_k: int = 10,
) -> List[SearchResult]:
    """Cosine similarity vector search."""
    def cosine(a: List[float], b: List[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        return dot / (norm_a * norm_b + 1e-10)

    scores = {
        did: cosine(query_embedding, emb)
        for did, emb in doc_embeddings.items()
    }
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [SearchResult(id=did, score=score) for did, score in ranked]


def reciprocal_rank_fusion(
    result_lists: List[List[SearchResult]],
    k: int = 60,
    top_k: int = 10,
) -> List[SearchResult]:
    """Fuse multiple ranked lists using RRF."""
    fused: Dict[str, float] = {}

    for results in result_lists:
        for rank, result in enumerate(results):
            fused[result.id] = fused.get(result.id, 0) + 1.0 / (k + rank + 1)

    ranked = sorted(fused.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [SearchResult(id=did, score=score) for did, score in ranked]


# Usage
documents = [
    Document("d1", "Python async programming with asyncio"),
    Document("d2", "JavaScript event loop and promises"),
    Document("d3", "Concurrent task execution in Python"),
    Document("d4", "Node.js worker threads for CPU tasks"),
]

query = "python async tasks"

bm25_results = bm25_search(query, documents, top_k=5)

query_emb = [0.12, 0.85, 0.33, 0.41]
doc_embeddings = {
    "d1": [0.11, 0.82, 0.30, 0.45],
    "d2": [0.05, 0.20, 0.71, 0.10],
    "d3": [0.13, 0.79, 0.35, 0.38],
    "d4": [0.02, 0.15, 0.60, 0.05],
}
vector_results = vector_search(query_emb, doc_embeddings, top_k=5)

hybrid_results = reciprocal_rank_fusion(
    [bm25_results, vector_results], k=60, top_k=5
)

for r in hybrid_results:
    print(f"{r.id}: {r.score:.4f}")
```

### JavaScript

```javascript
class Document {
  constructor(id, text) {
    this.id = id;
    this.text = text;
  }
}

function bm25Search(query, documents, topK = 10) {
  const queryTerms = query.toLowerCase().split(" ");
  const scores = {};
  const docCount = documents.length;
  const avgLen = documents.reduce((s, d) => s + d.text.split(" ").length, 0) / Math.max(docCount, 1);
  const k1 = 1.5, b = 0.75;

  for (const doc of documents) {
    const docTerms = doc.text.toLowerCase().split(" ");
    const docLen = docTerms.length;
    let score = 0;

    for (const term of queryTerms) {
      const tf = docTerms.filter(t => t === term).length;
      const df = documents.filter(d => d.text.toLowerCase().includes(term)).length;
      const idf = Math.log((docCount - df + 0.5) / (df + 0.5) + 1);
      score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / avgLen));
    }

    if (score > 0) scores[doc.id] = score;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({ id, score }));
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const normB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  return dot / (normA * normB + 1e-10);
}

function vectorSearch(queryEmbedding, docEmbeddings, topK = 10) {
  const scores = {};
  for (const [id, emb] of Object.entries(docEmbeddings)) {
    scores[id] = cosineSimilarity(queryEmbedding, emb);
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({ id, score }));
}

function reciprocalRankFusion(resultLists, k = 60, topK = 10) {
  const fused = {};
  for (const results of resultLists) {
    results.forEach((result, rank) => {
      fused[result.id] = (fused[result.id] || 0) + 1 / (k + rank + 1);
    });
  }
  return Object.entries(fused)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({ id, score }));
}

// Usage
const docs = [
  new Document("d1", "Python async programming with asyncio"),
  new Document("d2", "JavaScript event loop and promises"),
  new Document("d3", "Concurrent task execution in Python"),
  new Document("d4", "Node.js worker threads for CPU tasks"),
];

const query = "python async tasks";
const bm25Results = bm25Search(query, docs, 5);

const queryEmb = [0.12, 0.85, 0.33, 0.41];
const docEmbs = {
  d1: [0.11, 0.82, 0.30, 0.45],
  d2: [0.05, 0.20, 0.71, 0.10],
  d3: [0.13, 0.79, 0.35, 0.38],
  d4: [0.02, 0.15, 0.60, 0.05],
};
const vectorResults = vectorSearch(queryEmb, docEmbs, 5);

const hybrid = reciprocalRankFusion([bm25Results, vectorResults], 60, 5);
console.log(hybrid);
```

### Java

```java
import java.util.*;

public class HybridSearch {

    record Document(String id, String text) {}
    record SearchResult(String id, double score) {}

    public static List<SearchResult> bm25Search(
            String query, List<Document> documents, int topK) {
        String[] queryTerms = query.toLowerCase().split(" ");
        Map<String, Double> scores = new HashMap<>();
        int docCount = documents.size();
        double avgLen = documents.stream()
                .mapToInt(d -> d.text().split(" ").length)
                .average().orElse(1);
        double k1 = 1.5, b = 0.75;

        for (Document doc : documents) {
            String[] docTerms = doc.text().toLowerCase().split(" ");
            int docLen = docTerms.length;
            double score = 0;

            for (String term : queryTerms) {
                long tf = Arrays.stream(docTerms).filter(t -> t.equals(term)).count();
                long df = documents.stream()
                        .filter(d -> d.text().toLowerCase().contains(term))
                        .count();
                double idf = Math.log((docCount - df + 0.5) / (df + 0.5) + 1);
                score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / avgLen));
            }

            if (score > 0) scores.put(doc.id(), score);
        }

        return scores.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(topK)
                .map(e -> new SearchResult(e.getKey(), e.getValue()))
                .toList();
    }

    public static List<SearchResult> vectorSearch(
            double[] queryEmb, Map<String, double[]> docEmbs, int topK) {
        Map<String, Double> scores = new HashMap<>();

        for (var entry : docEmbs.entrySet()) {
            scores.put(entry.getKey(), cosine(queryEmb, entry.getValue()));
        }

        return scores.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(topK)
                .map(e -> new SearchResult(e.getKey(), e.getValue()))
                .toList();
    }

    static double cosine(double[] a, double[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
    }

    public static List<SearchResult> reciprocalRankFusion(
            List<List<SearchResult>> resultLists, int k, int topK) {
        Map<String, Double> fused = new HashMap<>();

        for (List<SearchResult> results : resultLists) {
            for (int rank = 0; rank < results.size(); rank++) {
                String id = results.get(rank).id();
                fused.merge(id, 1.0 / (k + rank + 1), Double::sum);
            }
        }

        return fused.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(topK)
                .map(e -> new SearchResult(e.getKey(), e.getValue()))
                .toList();
    }

    public static void main(String[] args) {
        var docs = List.of(
            new Document("d1", "Python async programming with asyncio"),
            new Document("d2", "JavaScript event loop and promises"),
            new Document("d3", "Concurrent task execution in Python"),
            new Document("d4", "Node.js worker threads for CPU tasks")
        );

        var bm25Results = bm25Search("python async tasks", docs, 5);
        var vectorResults = vectorSearch(
            new double[]{0.12, 0.85, 0.33, 0.41},
            Map.of(
                "d1", new double[]{0.11, 0.82, 0.30, 0.45},
                "d2", new double[]{0.05, 0.20, 0.71, 0.10},
                "d3", new double[]{0.13, 0.79, 0.35, 0.38},
                "d4", new double[]{0.02, 0.15, 0.60, 0.05}
            ),
            5
        );

        var hybrid = reciprocalRankFusion(
            List.of(bm25Results, vectorResults), 60, 5);
        hybrid.forEach(r -> System.out.printf("%s: %.4f%n", r.id(), r.score()));
    }
}
```

## Explanation

The pattern works in three stages:

1. **Parallel retrieval**: Run BM25 keyword search and vector semantic search independently. Each produces a ranked list of documents with scores.
2. **Rank fusion**: Apply Reciprocal Rank Fusion (RRF) to merge the two ranked lists. RRF assigns each document a fused score based on its position in each list: `score = Σ 1/(k + rank)` where `k` is a smoothing constant (typically 60).
3. **Top-k selection**: Return the top-k documents from the fused ranking.

RRF is preferred over score-based fusion because BM25 and cosine similarity produce scores on different scales. RRF only uses rank positions, making it scale-invariant and easy to tune.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Weighted RRF** | Apply different weights to keyword vs. semantic results | Domain-specific tuning (e.g., legal docs favor keyword) |
| **Score-based fusion** | Normalize and combine raw scores instead of ranks | When scores are comparable (same model family) |
| **Multi-vector fusion** | Fuse results from multiple embedding models | Cross-lingual or multi-modal retrieval |
| **Reranker pipeline** | Add a cross-encoder reranker after fusion | Maximum precision at the cost of latency |

## What Works

- **Tune the RRF `k` parameter** — lower values (e.g., 20) favor top ranks; higher values (e.g., 100) smooth differences
- **Pre-filter candidates** — if your corpus is large, filter by metadata before running both searches to reduce compute
- **Cache embeddings** — re-embedding the same documents wastes API budget; see [embedding caching](/recipes/ai/python-openai-embeddings-cosine)
- **Use BM25 for structured fields** — product codes, identifiers, and exact names benefit from keyword matching
- **Monitor retrieval metrics** — track recall@k and precision@k to measure fusion quality
- **Index incrementally** — update BM25 index and vector store separately as new documents arrive

## Common Mistakes

- Using score-based fusion without normalization, causing one search method to dominate
- Ignoring the `k` parameter in RRF, which defaults to 60 but may need tuning per dataset
- Running both searches sequentially instead of in parallel, doubling latency
- Not deduplicating documents that appear in both result lists before fusion
- Re-embedding the entire corpus when only a few documents change

## Frequently Asked Questions

**Q: Why not just use semantic search for everything?**
A: Semantic search struggles with exact term matching. If a user searches for "error code ERR_4021", a keyword search finds it instantly while embeddings may rank it lower. Hybrid search covers both cases.

**Q: How do I choose the RRF k parameter?**
A: Start with 60 (the value from the original paper). If top results from one method dominate too much, increase k. If you want to amplify the top ranks, decrease k.

**Q: Can I add more than two retrieval methods?**
A: Yes. RRF accepts any number of ranked lists. You can add a third method like a knowledge graph lookup or a metadata filter and fuse all three.

**Q: Should I use a reranker on top of hybrid search?**
A: A cross-encoder reranker improves precision but adds latency. Use it when you need top-3 or top-5 precision (e.g., feeding context to an LLM) and can afford 50-100ms extra.
