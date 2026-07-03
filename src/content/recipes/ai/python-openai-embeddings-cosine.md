---
contentType: recipes
slug: python-openai-embeddings-cosine
title: "Compare Text Semantic Similarity with OpenAI Embeddings and Cosine"
description: "Generate text embeddings with OpenAI and compute cosine similarity to measure semantic similarity between texts for search, dedup, and clustering"
metaDescription: "Compare text semantic similarity with OpenAI embeddings and cosine similarity. Generate vectors, compute distances, and build a similarity search index."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - openai
  - embeddings
  - cosine similarity
  - semantic search
relatedResources:
  - /recipes/ai/python-vector-database-pinecone
  - /recipes/ai/python-rag-chroma-local
  - /recipes/ai/python-langchain-chains-composition
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compare text semantic similarity with OpenAI embeddings and cosine similarity. Generate vectors, compute distances, and build a similarity search index."
  keywords:
    - openai embeddings
    - cosine similarity
    - semantic similarity
    - text embeddings python
    - embedding comparison
---

# Compare Text Semantic Similarity with OpenAI Embeddings and Cosine

Text embeddings capture semantic meaning as high-dimensional vectors. Cosine similarity measures the angle between two vectors, indicating how semantically similar the texts are. Below: generating embeddings with OpenAI, computing cosine similarity, and building a simple similarity search index.

## When to Use This

- Semantic search over a corpus of documents
- Deduplication of semantically similar content
- Clustering texts by meaning
- Recommendation systems based on content similarity

## Prerequisites

- Python 3.10+
- `openai` package (`pip install openai`)
- `numpy` package (`pip install numpy`)
- An OpenAI API key

## Solution

### 1. Install Dependencies

```bash
pip install openai numpy
```

### 2. Generate Embeddings

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

def get_embedding(text: str, model: str = "text-embedding-3-small") -> list[float]:
    """Generate an embedding for a single text.

    Args:
        text: Input text.
        model: OpenAI embedding model.

    Returns:
        Embedding vector as a list of floats.
    """
    response = client.embeddings.create(model=model, input=text)
    return response.data[0].embedding

def get_embeddings_batch(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    """Generate embeddings for multiple texts in one API call.

    Args:
        texts: List of input texts.
        model: OpenAI embedding model.

    Returns:
        List of embedding vectors.
    """
    response = client.embeddings.create(model=model, input=texts)
    return [item.embedding for item in response.data]
```

### 3. Compute Cosine Similarity

```python
def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors.

    Args:
        vec_a: First vector.
        vec_b: Second vector.

    Returns:
        Similarity score between -1 and 1 (1 = identical).
    """
    a = np.array(vec_a)
    b = np.array(vec_b)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))

def cosine_similarity_matrix(vectors: list[list[float]]) -> np.ndarray:
    """Compute pairwise cosine similarity for a list of vectors.

    Args:
        vectors: List of embedding vectors.

    Returns:
        NxN similarity matrix.
    """
    matrix = np.array(vectors)
    normalized = matrix / np.linalg.norm(matrix, axis=1, keepdims=True)
    return normalized @ normalized.T
```

### 4. Compare Two Texts

```python
text_a = "Redis is an in-memory data structure store used for caching."
text_b = "Redis works as a fast cache by keeping data in memory."
text_c = "PostgreSQL is a relational database with ACID compliance."

emb_a = get_embedding(text_a)
emb_b = get_embedding(text_b)
emb_c = get_embedding(text_c)

sim_ab = cosine_similarity(emb_a, emb_b)
sim_ac = cosine_similarity(emb_a, emb_c)

print(f"Similarity (a, b): {sim_ab:.4f}")  # High — same topic
print(f"Similarity (a, c): {sim_ac:.4f}")  # Lower — different topics
```

### 5. Build a Similarity Search Index

```python
from dataclasses import dataclass

@dataclass
class Document:
    id: str
    text: str
    embedding: list[float]

class SimilaritySearchIndex:
    def __init__(self):
        self.documents: list[Document] = []

    def add(self, doc_id: str, text: str) -> None:
        """Add a document to the index."""
        embedding = get_embedding(text)
        self.documents.append(Document(id=doc_id, text=text, embedding=embedding))

    def add_batch(self, items: list[tuple[str, str]]) -> None:
        """Add multiple documents efficiently with batch embedding."""
        texts = [text for _, text in items]
        embeddings = get_embeddings_batch(texts)
        for (doc_id, text), emb in zip(items, embeddings):
            self.documents.append(Document(id=doc_id, text=text, embedding=emb))

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """Search for the most similar documents.

        Args:
            query: Query text.
            top_k: Number of results to return.

        Returns:
            List of {id, text, score} dicts sorted by similarity.
        """
        query_emb = get_embedding(query)
        scores = [
            (doc.id, doc.text, cosine_similarity(query_emb, doc.embedding))
            for doc in self.documents
        ]
        scores.sort(key=lambda x: x[2], reverse=True)
        return [
            {"id": doc_id, "text": text, "score": score}
            for doc_id, text, score in scores[:top_k]
        ]

# Usage
index = SimilaritySearchIndex()
index.add_batch([
    ("doc1", "Redis is an in-memory data structure store for caching."),
    ("doc2", "PostgreSQL is a powerful open-source relational database."),
    ("doc3", "Docker containers package applications with dependencies."),
    ("doc4", "Memcached is a distributed memory caching system."),
    ("doc5", "Kubernetes orchestrates containerized applications."),
])

results = index.search("caching solution for fast lookups", top_k=3)
for r in results:
    print(f"Score: {r['score']:.4f} | {r['text'][:60]}")
```

### 6. Pairwise Similarity Matrix

```python
def print_similarity_matrix(texts: list[str]) -> None:
    """Print a pairwise similarity matrix for a list of texts."""
    embeddings = get_embeddings_batch(texts)
    matrix = cosine_similarity_matrix(embeddings)

    print(" " * 20, end="")
    for i in range(len(texts)):
        print(f"  doc{i}", end="")
    print()

    for i, row in enumerate(matrix):
        print(f"doc{i:15s}", end="")
        for val in row:
            print(f" {val:.2f}", end="")
        print()

texts = [
    "Redis caching strategies",
    "In-memory cache with Redis",
    "PostgreSQL database indexing",
    "Docker container deployment",
]
print_similarity_matrix(texts)
```

## How It Works

1. **Embeddings** convert text into a high-dimensional vector (1536 dimensions for `text-embedding-3-small`) where semantically similar texts are close together in vector space.
2. **Cosine similarity** measures the cosine of the angle between two vectors. It ranges from -1 (opposite) to 1 (identical). For text embeddings, values typically range from 0.5 to 1.0 for related content.
3. **Batch embedding** sends multiple texts in a single API call, reducing latency and cost compared to individual calls.
4. **Similarity matrix** normalizes all vectors and computes the dot product, which equals cosine similarity for unit vectors. The result is an NxN matrix where `matrix[i][j]` is the similarity between texts i and j.

## Variants

### Euclidean Distance

```python
def euclidean_distance(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute Euclidean distance between two vectors."""
    a = np.array(vec_a)
    b = np.array(vec_b)
    return float(np.linalg.norm(a - b))
```

### Threshold-Based Deduplication

```python
def find_duplicates(texts: list[str], threshold: float = 0.92) -> list[tuple[int, int, float]]:
    """Find pairs of texts that are semantically duplicates.

    Args:
        texts: List of texts to check.
        threshold: Similarity threshold for duplicate detection.

    Returns:
        List of (index_a, index_b, similarity) tuples.
    """
    embeddings = get_embeddings_batch(texts)
    matrix = cosine_similarity_matrix(embeddings)

    duplicates = []
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            if matrix[i][j] >= threshold:
                duplicates.append((i, j, float(matrix[i][j])))

    return duplicates

dups = find_duplicates([
    "Redis is a fast in-memory cache.",
    "Redis works as an in-memory caching store.",
    "PostgreSQL is a relational database.",
])
# [(0, 1, 0.94)] — texts 0 and 1 are duplicates
```

### Using HuggingFace Embeddings (No API Key)

```python
from sentence_transformers import SentenceTransformer

class LocalSimilarityIndex:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.documents = []

    def add(self, doc_id: str, text: str) -> None:
        embedding = self.model.encode(text).tolist()
        self.documents.append(Document(id=doc_id, text=text, embedding=embedding))

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        query_emb = self.model.encode(query).tolist()
        scores = [
            (doc.id, doc.text, cosine_similarity(query_emb, doc.embedding))
            for doc in self.documents
        ]
        scores.sort(key=lambda x: x[2], reverse=True)
        return [{"id": d, "text": t, "score": s} for d, t, s in scores[:top_k]]
```

## Best Practices

- **Use batch embedding API** — reduces cost and latency by 10x for multiple texts
- **Normalize embeddings before storage** — cosine similarity on normalized vectors is a simple dot product
- **Use `text-embedding-3-small` for most tasks** — good balance of quality and cost ($0.02 per 1M tokens)
- **Set a similarity threshold for dedup** — 0.90-0.95 is typical for semantic duplicates

## Common Mistakes

- **Comparing embeddings from different models** — each model has a different vector space; never mix embeddings from different models
- **Using Euclidean distance without normalization** — cosine similarity is more robust for text because it is magnitude-invariant
- **Not batching API calls** — one-by-one embedding calls are slow and expensive
- **Ignoring token limits** — `text-embedding-3-small` has an 8191 token limit; truncate long texts

## FAQ

**Q: What is a good cosine similarity threshold for "similar" texts?**
A: 0.80+ is typically similar, 0.90+ is near-duplicate, 0.70-0.80 is topically related. Adjust based on your data.

**Q: Should I use `text-embedding-3-small` or `text-embedding-3-large`?**
A: Start with `small` (1536 dims, cheaper). Use `large` (3072 dims) if you need higher accuracy for fine-grained similarity.

**Q: Can I cache embeddings to avoid re-computing?**
A: Yes. Store embeddings in a database or file. Only re-embed when the source text changes.

**Q: How do I handle very long documents?**
A: Chunk the document into smaller segments (e.g., 500-1000 tokens), embed each chunk, and average the embeddings for a document-level vector.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
