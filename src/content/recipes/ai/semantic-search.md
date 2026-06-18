---
contentType: recipes
slug: semantic-search
title: "Implement Semantic Search with Embeddings"
description: "How to implement semantic search using text embeddings and vector similarity search for intelligent document retrieval"
metaDescription: "Implement semantic search with text embeddings and vector similarity. Use OpenAI, sentence-transformers, and FAISS for intelligent document retrieval."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - embeddings
  - openai
relatedResources:
  - /recipes/rag-pipeline
  - /recipes/chatbot-openai
  - /recipes/llm-fine-tuning
  - /guides/software-architecture-guide
  - /guides/sql-performance-tuning-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement semantic search with text embeddings and vector similarity. Use OpenAI, sentence-transformers, and FAISS for intelligent document retrieval."
  keywords:
    - semantic-search
    - embeddings
    - vector-similarity
    - openai
    - faiss
    - nlp
---
## Overview

Semantic search finds documents based on meaning rather than exact keyword matches. A query like "best laptop for programming" returns documents about developer workstations even if they never use the word "laptop." This is achieved by converting text into dense vector embeddings and performing similarity search in that vector space.

This recipe implements semantic search with OpenAI embeddings, sentence-transformers, and FAISS for fast in-memory retrieval, plus pgvector for production PostgreSQL deployments.

## When to Use

Use this resource when:
- Keyword search misses relevant results due to synonymy or phrasing differences
- You need to search across large document collections with natural language queries
- You are building a recommendation engine, Q&A system, or content discovery feature
- You want to combine semantic and keyword search (hybrid retrieval)

## Solution

### Python

```python
from openai import OpenAI
import numpy as np
import faiss

client = OpenAI(api_key="YOUR_API_KEY")

def get_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# Index documents
documents = [
    "Python is great for data science and machine learning.",
    "JavaScript runs in browsers and on servers via Node.js.",
    "Rust offers memory safety without a garbage collector.",
]
embeddings = [get_embedding(doc) for doc in documents]
embeddings_np = np.array(embeddings).astype("float32")

# Build FAISS index
dimension = len(embeddings[0])
index = faiss.IndexFlatIP(dimension)  # Inner product = cosine on normalized vectors
faiss.normalize_L2(embeddings_np)
index.add(embeddings_np)

# Search
query = "language for web development"
query_embedding = np.array([get_embedding(query)]).astype("float32")
faiss.normalize_L2(query_embedding)
distances, indices = index.search(query_embedding, k=2)

for rank, idx in enumerate(indices[0]):
    print(f"{rank + 1}. {documents[idx]} (score: {distances[0][rank]:.3f})")
```

### JavaScript

```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embed(text) {
  const res = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  });
  return res.data[0].embedding;
}

async function semanticSearch() {
  const documents = [
    'Python is great for data science and machine learning.',
    'JavaScript runs in browsers and on servers via Node.js.',
    'Rust offers memory safety without a garbage collector.',
  ];

  const embeddings = await Promise.all(documents.map(embed));

  // Simple cosine similarity search (production: use a vector DB)
  const query = await embed('language for web development');

  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  const results = documents
    .map((doc, i) => ({ doc, score: cosine(query, embeddings[i]) }))
    .sort((a, b) => b.score - a.score);

  results.slice(0, 2).forEach((r, i) => {
    console.log(`${i + 1}. ${r.doc} (score: ${r.score.toFixed(3)})`);
  });
}

semanticSearch();
```

### Java

```java
// Java with Spring AI and pgvector (production-ready)
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingClient;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.jdbc.core.JdbcTemplate;

public class SemanticSearchService {
    private final VectorStore vectorStore;

    public SemanticSearchService(EmbeddingClient embeddingClient, JdbcTemplate jdbc) {
        this.vectorStore = PgVectorStore.builder(jdbc, embeddingClient)
            .dimensions(1536)
            .distanceType(PgVectorStore.PgDistanceType.COSINE_DISTANCE)
            .initializeSchema(true)
            .build();
    }

    public void indexDocuments(List<String> texts) {
        List<Document> docs = texts.stream()
            .map(t -> new Document(t))
            .toList();
        vectorStore.add(docs);
    }

    public List<Document> search(String query, int topK) {
        return vectorStore.similaritySearch(
            SearchRequest.builder()
                .query(query)
                .topK(topK)
                .build()
        );
    }
}
```

## Explanation

Semantic search works in three stages:

1. **Embedding**: An embedding model (e.g., OpenAI `text-embedding-3-small`) converts text into a dense vector of 1536 dimensions. Similar meanings produce vectors that are close in space.
2. **Indexing**: Embeddings are stored in a vector index optimized for fast nearest-neighbor search.
3. **Query**: The user's query is embedded, and the index returns the `k` closest vectors using cosine similarity or Euclidean distance.

**Cosine similarity** measures the angle between two vectors: a score of 1.0 means identical direction; 0.0 means orthogonal (unrelated). L2-normalizing vectors makes inner product equivalent to cosine similarity, which FAISS can compute very efficiently.

**Trade-offs:**
- Dense embeddings capture meaning but may miss exact keyword matches
- Vector databases add infrastructure complexity but scale to millions of documents
- Embedding quality varies by model; test with your domain's vocabulary

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| OpenAI Embeddings | API-based | Best quality, pay-per-token; 1536 dims for text-embedding-3-small |
| sentence-transformers | Local Python | Free, runs on CPU/GPU; models like `all-MiniLM-L6-v2` (384 dims) |
| FAISS | In-memory index | Fast for prototyping; not persistent or distributed |
| Chroma | Persistent local DB | Easy setup, automatic embedding management |
| pgvector | Postgres extension | Best for production if you already use PostgreSQL |
| Pinecone / Weaviate | Managed vector DB | Scalable, hosted, with metadata filtering |

## Best Practices

1. Normalize embeddings before cosine similarity search to enable inner-product acceleration
2. Store metadata (source, category, date) alongside vectors for filtering and ranking
3. Use hybrid search: combine semantic retrieval with BM25 keyword search for best recall
4. Evaluate with a labeled test set; measure recall@k and mean reciprocal rank (MRR)
5. Cache frequent query embeddings to reduce API cost and latency

## Common Mistakes

1. **Brute-force search at scale** — linear scan over millions of vectors is too slow; use an index (IVF, HNSW)
2. **Ignoring embedding model limits** — each model has a max token length; truncate long documents
3. **No relevance threshold** — always filter results below a similarity cutoff to avoid false positives
4. **Single embedding per document** — long documents should be chunked; one embedding loses detail
5. **No index updates** — stale embeddings for updated documents silently degrade search quality

## Frequently Asked Questions

### What is the difference between semantic and keyword search?

Keyword search matches exact terms (e.g., TF-IDF, BM25). Semantic search matches meaning via vector similarity. Keyword search is fast and precise for known terminology; semantic search handles synonyms, paraphrasing, and conceptual similarity.

### Can I use free embeddings instead of OpenAI?

Yes. `sentence-transformers` provides high-quality open-source models like `all-MiniLM-L6-v2` that run locally on CPU. They are smaller and slightly less general than OpenAI's models but are free and privacy-preserving.

### How do I scale to millions of documents?

Use a production vector database like Pinecone, Weaviate, or pgvector with HNSW indexing. Partition by category or tenant, and implement approximate nearest neighbor (ANN) search for sub-second query times at scale.
