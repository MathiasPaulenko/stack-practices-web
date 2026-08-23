---
contentType: recipes
slug: semantic-search
title: "Build Semantic Search with Embeddings in Python, JS, Java"
description: "Build a semantic search engine with text embeddings and vector similarity. Includes Python, JavaScript, and Java examples with FAISS, pgvector, and OpenAI."
metaDescription: "Build semantic search with text embeddings and vector similarity. Use OpenAI, sentence-transformers, FAISS, pgvector, and Spring AI in production."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - embeddings
  - openai
  - vector-search
  - python
relatedResources:
  - /recipes/rag-pipeline
  - /recipes/chatbot-openai
  - /recipes/llm-fine-tuning
  - /recipes/ai-agents
  - /recipes/ai-agents-tool-use
  - /recipes/prompt-engineering
lastUpdated: "2026-08-23"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Build semantic search with text embeddings and vector similarity. Use OpenAI, sentence-transformers, FAISS, pgvector, and Spring AI in production."
  keywords:
    - semantic search
    - embeddings
    - vector similarity
    - faiss
    - pgvector
    - openai
    - sentence-transformers
---

## Overview

Keyword search fails when users type "laptop for programming" and your documents talk about "developer workstations."
Semantic search fixes this by turning text into dense vectors and comparing them in that vector space.

This recipe shows two practical paths: a free, local stack with `sentence-transformers` and FAISS, and a
managed stack with OpenAI embeddings plus pgvector. It also gives JavaScript and Java examples so you can drop
the approach into a web service or Spring application.

## When to Use

- Queries contain synonyms, paraphrasing, or natural language that keyword search can't match.
- You're building a recommendation engine, [Q&A assistant](/recipes/chatbot-openai/), or content discovery feature.
- You want to combine vector and keyword search into [hybrid retrieval](/recipes/rag-pipeline/).
- You've got at least a few thousand documents, so a better ranking model is worth the extra infrastructure.

## When to Avoid

- Users are searching exact IDs, SKUs, or error codes. For exact matches, keyword search is usually faster and more
accurate.
- The corpus is tiny. With fewer than 1,000 documents, BM25 plus synonyms is usually enough.
- Results must be explainable. Vector similarity scores are harder to explain than keyword highlighting.
- Sub-10 ms latency is mandatory. Network embedding calls and ANN indexes rarely hit that budget.

## Solution

### Python with sentence-transformers and FAISS

This is the cheapest way to start: the model runs locally and FAISS lives in memory.

```python
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

documents = [
    "Python is great for data science and machine learning.",
    "JavaScript runs in browsers and on servers via Node.js.",
    "Rust offers memory safety without a garbage collector.",
]

# Encode and L2-normalize so inner product equals cosine similarity
embeddings = model.encode(documents, convert_to_numpy=True, normalize_embeddings=True)

dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)  # inner product on normalized vectors
index.add(embeddings)

query = "language for web development"
query_embedding = model.encode([query], normalize_embeddings=True)

distances, indices = index.search(query_embedding, k=2)

for rank, idx in enumerate(indices[0]):
    print(f"{rank + 1}. {documents[idx]} (score: {distances[0][rank]:.3f})")
```

### Python with OpenAI and FAISS

If you prefer API embeddings, swap the local model for OpenAI and normalize vectors before indexing.

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

documents = [
    "Python is great for data science and machine learning.",
    "JavaScript runs in browsers and on servers via Node.js.",
    "Rust offers memory safety without a garbage collector.",
]

embeddings = [get_embedding(doc) for doc in documents]
embeddings_np = np.array(embeddings).astype("float32")

# Normalize so inner product becomes cosine similarity
faiss.normalize_L2(embeddings_np)

dimension = embeddings_np.shape[1]
index = faiss.IndexFlatIP(dimension)
index.add(embeddings_np)

query = "language for web development"
query_embedding = np.array([get_embedding(query)]).astype("float32")
faiss.normalize_L2(query_embedding)

distances, indices = index.search(query_embedding, k=2)

for rank, idx in enumerate(indices[0]):
    print(f"{rank + 1}. {documents[idx]} (score: {distances[0][rank]:.3f})")
```

### JavaScript with OpenAI

A lightweight version that computes cosine similarity in plain JavaScript.

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

### Java with Spring AI and pgvector

For a production service, store embeddings in PostgreSQL with pgvector and query them through Spring AI.

```java
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingClient;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;

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

Semantic search has three stages:

1. An embedding model such as `all-MiniLM-L6-v2` or OpenAI `text-embedding-3-small` turns text into a dense
   vector. Similar meanings land close to each other.
2. Those vectors go into an index built for nearest-neighbor search.
3. The user's question is also embedded, and the index returns the `k` closest vectors using cosine or another
   distance metric.

Cosine similarity is just the angle between two vectors. After L2 normalization, the inner product equals
cosine, which FAISS can compute very fast. A score near 1.0 means the vectors point in a similar direction; near
0.0, they're unrelated.

**Trade-offs to keep in mind:**

- Dense embeddings catch meaning but can miss exact keyword matches.
- Vector databases add operational work, but they scale to millions of documents.
- Embedding quality depends on the model and your domain; benchmark on your own text.

## Variants

| Technology | Approach | Best For |
| ------------ | ---------- | ---------- |
| **sentence-transformers** | Local, free models | Prototyping and privacy-sensitive apps |
| **OpenAI embeddings** | API, high quality | Managed apps that don't want model hosting |
| **FAISS** | In-memory ANN index | Fast experiments, not persistent by default |
| **Chroma** | Persistent local store | Small apps that want a simple vector database |
| **pgvector** | Postgres extension | Production apps already using PostgreSQL |
| **Pinecone / Weaviate** | Managed vector DB | High-scale or multi-tenant deployments |

## Best Practices

- **Normalize embeddings** before cosine search. L2 normalization lets you use fast inner-product indexes.
- **Store metadata** such as category, source, and date so you can filter before the vector search.
- **Use hybrid search** in production: combine vector and BM25 keyword results with reciprocal rank fusion.
- **Chunk long documents** instead of embedding the whole text. A single vector for a 5,000-token document loses local detail.
- **Cache frequent query embeddings** to reduce API cost and latency.
- **Evaluate with a labeled test set**; track recall@k and mean reciprocal rank (MRR) before tuning.

## Common Mistakes

- **Brute-force search at scale.** Scanning millions of vectors linearly is too slow. Switch to an index such as
  IVF or HNSW.
- **Ignoring token limits.** Every embedding model caps the input length. Truncate or chunk long documents.
- **No relevance threshold.** Set a similarity floor so low-score results don't pollute the output.
- **Single embedding per long document.** Chunk the text and embed each chunk separately for fine-grained
  retrieval.
- **Stale index.** Embeddings for updated documents silently degrade search quality. Re-index on content
  changes.

## FAQ

### What's the difference between semantic and keyword search?

Keyword search matches exact terms, the way BM25 does. Semantic search matches meaning through vector
similarity. Keyword search is fast and precise for known terminology; semantic search handles synonyms and
paraphrasing.

### Can I use free embeddings instead of OpenAI?

Yes. `sentence-transformers` includes open-source models such as `all-MiniLM-L6-v2` that run on CPU. Those
models are smaller and slightly less general than OpenAI's, but they're free and keep data on your machine.

### How do I scale to millions of documents?

Use a production vector database such as Pinecone, Weaviate, or pgvector with HNSW indexing. Partition by
category or tenant, and use approximate nearest-neighbor (ANN) search for sub-second queries at scale.

### What is hybrid search and why should I use it?

Hybrid search combines semantic and keyword results, usually with reciprocal rank fusion. It covers both
failure modes: semantic search can miss exact terms, and keyword search can miss paraphrasing.

### How do I handle multilingual semantic search?

Use a multilingual embedding model such as `multilingual-e5-large` or Cohere's multilingual embeddings. These
map text from different languages into the same vector space, so a Spanish query can match English documents.
Don't translate the query first — translation adds latency and can introduce errors.
