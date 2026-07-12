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
  - machine-learning
  - llm
relatedResources:
  - /recipes/rag-pipeline
  - /recipes/chatbot-openai
  - /recipes/llm-fine-tuning
  - /guides/software-architecture-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/ai-agents-tool-use
  - /recipes/ai-agents
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

Below is an implementation of semantic search with OpenAI embeddings, sentence-transformers, and FAISS for fast in-memory retrieval, plus pgvector for production PostgreSQL deployments.

## When to Use

Use this resource when:
- Keyword search misses relevant results due to synonymy or phrasing differences
- You need to search across large document collections with natural language queries
- You are building a recommendation engine, [Q&A system](/recipes/ai/chatbot-openai), or content discovery feature
- You want to combine semantic and keyword search ([hybrid retrieval](/recipes/ai/rag-pipeline))

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

## What Works

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

Use a production vector database like Pinecone, Weaviate, or pgvector with HNSW indexing. See [SQL Performance Tuning Guide](/guides/databases/sql-performance-tuning-guide) for database optimization. Partition by category or tenant, and implement approximate nearest neighbor (ANN) search for sub-second query times at scale.

### What is hybrid search and why should I use it?

Hybrid search combines semantic (vector) and keyword (BM25) search. Semantic search captures meaning and synonyms; keyword search ensures exact term matches. Most production search systems use hybrid search because it covers both failure modes: semantic search misses exact terminology, and keyword search misses paraphrasing. Implement hybrid search with reciprocal rank fusion (RRF) to merge results from both methods.

### How do I handle multilingual semantic search?

Use a multilingual embedding model like `multilingual-e5-large` or Cohere's multilingual embeddings. These models map text from different languages into the same vector space, so a query in Spanish can match documents in English. Avoid translating queries before embedding — translation adds latency and can introduce errors.

### How do I debug poor search results?

Check these in order: (1) Are embeddings normalized? (2) Is the distance metric correct for the model? (3) Are queries and documents using the same embedding model? (4) Are chunks too large or too small? (5) Is the relevance threshold too high or too low? Build a small test set of known queries and expected results to diagnose systematically.

### What is the cost of semantic search at scale?

OpenAI's `text-embedding-3-small` costs $0.02 per 1M tokens. Indexing 100,000 documents (avg 500 tokens each) costs ~$1. Query embeddings cost ~$0.00001 per query. Vector database costs vary: pgvector is free (just Postgres), Pinecone starts at $70/month, self-hosted Weaviate requires a GPU instance. Factor in re-indexing costs when documents change frequently.

## Additional Common Mistakes

- **Not normalizing embeddings before search** — cosine similarity requires normalized vectors. If you skip L2 normalization, inner product scores are dominated by vector magnitude rather than direction.
- **Using a single embedding for a long document** — a 5000-token document compressed into one vector loses local context. Chunk the document and embed each chunk separately for granular retrieval.
- **Not handling out-of-vocabulary terms** — embedding models may not represent domain-specific jargon well. Supplement with keyword search or fine-tune embeddings on domain text.
- **Ignoring query preprocessing** — user queries often contain typos, slang, or abbreviations. Normalize queries before embedding: lowercase, strip punctuation, expand common abbreviations.
- **Not caching query embeddings** — popular queries repeated by multiple users generate the same embedding. Cache by query hash to reduce API calls and latency.
- **Mixing embedding models in the same index** — embeddings from different models have different dimensions and spaces. Never mix models in the same index without re-embedding everything.
- **Not monitoring index freshness** — if documents are updated but embeddings are not regenerated, search quality degrades silently. Set up a re-indexing pipeline triggered by content changes.

## Best Practices

- **Use hybrid search for production**: combine vector search with BM25 keyword search. Use reciprocal rank fusion (RRF) to merge results. This catches both semantic matches and exact term matches, improving recall considerably.
- **Implement query understanding**: before embedding the query, classify intent (informational, navigational, transactional). Route different intents to different search strategies. This improves relevance for diverse query types.
- **Use filtered vector search**: attach metadata tags (category, date, language, author) to embeddings. Filter by metadata before vector search to reduce the search space and improve both speed and relevance.
- **Benchmark different embedding models**: test 3-5 embedding models on your domain-specific test set. Compare recall@k and MRR. Models like `e5-large-v2`, `bge-large`, and `text-embedding-3-large` can outperform OpenAI's default on certain domains.
- **Set up A/B testing for search quality**: route a percentage of searches to a new configuration (different model, chunk size, or threshold). Measure user engagement metrics (click-through rate, time to find, zero-result rate). Promote configurations that improve engagement.
- **Monitor zero-result queries**: track queries that return no results above threshold. These indicate gaps in your corpus or issues with your embedding model. Use them to identify missing content or needed model changes.
- **Implement autocomplete and query suggestions**: use a lightweight keyword index for autocomplete suggestions. This reduces the load on vector search and improves UX by guiding users toward queries that will return results.

## Production Checklist

- [ ] Embeddings L2-normalized before indexing and search
- [ ] Distance metric matches embedding model training
- [ ] Long documents chunked and embedded separately
- [ ] Query preprocessing pipeline (lowercase, strip punctuation, expand abbreviations)
- [ ] Query embedding cache by query hash
- [ ] Hybrid search (vector + BM25) with reciprocal rank fusion
- [ ] Metadata filters applied before vector search
- [ ] Index freshness monitored (re-indexing on content changes)
- [ ] Zero-result queries tracked and analyzed
- [ ] A/B testing framework for search configuration changes

## Scaling Considerations

When deploying semantic search at scale, consider these factors:

- **Index size and memory**: a 1536-dimensional embedding (OpenAI) takes ~6 KB per document. For 1M documents, the index is ~6 GB in memory. Use quantization (int8 or binary) to reduce memory by 4-32x with minimal accuracy loss. FAISS and Qdrant support quantized indices natively.
- **Query latency targets**: for e-commerce or user-facing search, target <100ms p99 latency. HNSW indices achieve this for up to 10M vectors on a single machine. For larger indices, shard across multiple nodes and merge results.
- **Re-indexing strategy**: when you switch embedding models or update chunking logic, you must re-index everything. For large corpora, do this in a blue-green deployment: build the new index alongside the old one, then switch traffic when the new index is ready.
- **Cost optimization**: embedding API calls are cheap ($0.02/1M tokens) but compound at scale. For 1M documents updated weekly, embedding costs ~$10/week. Cache embeddings by content hash to avoid re-embedding unchanged documents. Use open-source models (e5, bge) for self-hosted inference to eliminate API costs entirely.

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| Embedding (text-embedding-3-small) | $0.02/1M tokens | OpenAI API, 1536 dims |
| Embedding (text-embedding-3-large) | $0.13/1M tokens | OpenAI API, 3072 dims |
| Embedding (self-hosted bge-large) | $0 | GPU cost only |
| Vector store (pgvector) | $0 | Included with Postgres |
| Vector store (Pinecone) | $0-$70/month | Scales with vector count |
| FAISS (self-hosted) | $0 | In-memory, no service cost |

For 1M documents re-embedded monthly: ~$2/month with OpenAI small. Self-hosting bge-large on 1x A10 ($0.75/hr) breaks even at ~500M tokens/month.

## When Not to Use Semantic Search

- **Exact match is the primary use case**: if users search for product IDs, SKUs, or error codes, keyword search (BM25, Elasticsearch) is faster and more accurate. Semantic search adds noise by returning "similar" but non-matching results.
- **Your corpus is <1000 documents**: for small corpora, keyword search with good ranking is sufficient. The overhead of embedding generation and vector index maintenance is not justified.
- **You need sub-10ms latency**: vector search with HNSW takes 10-50ms. For sub-10ms requirements (autocomplete, typeahead), use trie-based or prefix search instead.
- **Your content is mostly numeric or coded**: embeddings are designed for natural language. For numeric data (prices, measurements), use range queries. For coded data (ICD codes, ISO standards), use exact match with synonyms.
- **Compliance requires explainable results**: vector similarity scores are not intuitive to end users. "Why did this document match?" is harder to explain with embeddings than with keyword highlighting. Use BM25 with highlighted terms for transparency.
