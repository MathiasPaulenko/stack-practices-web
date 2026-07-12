---


contentType: guides
slug: complete-guide-vector-databases
title: "Complete Guide to Vector Databases"
description: "Compare and use vector databases in production. Covers Pinecone, Weaviate, Chroma, pgvector, Milvus, and Qdrant. Includes indexing, similarity search, filtering, scaling, benchmarking, and choosing the right vector database."
metaDescription: "Compare vector databases: Pinecone, Weaviate, Chroma, pgvector, Milvus, Qdrant. Covers indexing, search, filtering, scaling."
difficulty: advanced
topics:
  - ai
  - databases
  - architecture
tags:
  - vector-databases
  - ai
  - guide
  - pinecone
  - weaviate
  - chroma
  - pgvector
  - milvus
relatedResources:
  - /guides/complete-guide-rag-production
  - /guides/complete-guide-llm-application-architecture
  - /guides/complete-guide-llm-cost-optimization
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compare vector databases: Pinecone, Weaviate, Chroma, pgvector, Milvus, Qdrant. Covers indexing, search, filtering, scaling."
  keywords:
    - vector databases
    - pinecone
    - weaviate
    - chroma
    - pgvector
    - milvus
    - qdrant
    - vector search


---

## Introduction

Vector databases store and query high-dimensional vectors for similarity search. They power RAG systems, recommendation engines, semantic search, and image retrieval. Each database has different tradeoffs: managed vs self-hosted, scale, latency, filtering capabilities, and cost. This guide compares the major options and shows how to use each one in production.

## Comparison Matrix

| Database | Type | Hosting | Scale | Filtering | Hybrid Search | Cost |
|----------|------|---------|-------|-----------|---------------|------|
| Pinecone | Managed | Cloud | Millions | Rich | Yes | Per-use |
| Weaviate | Open-source | Self/Cloud | Millions | Rich | Yes | Self-host or cloud |
| Chroma | Embedded | Local | <1M | Basic | No | Free |
| pgvector | Extension | Self | <10M | SQL | Yes | Free (Postgres) |
| Milvus | Open-source | Self/Cloud | Billions | Rich | Yes | Self-host |
| Qdrant | Open-source | Self/Cloud | Millions | Rich | Yes | Self-host or cloud |

## Pinecone

### Setup and Basic Operations

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# Create index
pc.create_index(
    name="products",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)

index = pc.Index("products")

# Upsert vectors
vectors = [
    {
        "id": "prod_001",
        "values": [0.1, 0.2, 0.3, ...],  # 1536-dim
        "metadata": {
            "name": "Widget A",
            "category": "electronics",
            "price": 29.99,
            "in_stock": True
        }
    },
    {
        "id": "prod_002",
        "values": [0.4, 0.5, 0.6, ...],
        "metadata": {
            "name": "Widget B",
            "category": "electronics",
            "price": 49.99,
            "in_stock": False
        }
    }
]

index.upsert(vectors=vectors)

# Query with metadata filtering
results = index.query(
    vector=query_embedding,
    top_k=10,
    include_metadata=True,
    filter={
        "category": {"$eq": "electronics"},
        "price": {"$lte": 50.0},
        "in_stock": {"$eq": True}
    }
)

for match in results["matches"]:
    print(f"ID: {match['id']}, Score: {match['score']:.4f}")
    print(f"  Name: {match['metadata']['name']}")
    print(f"  Price: ${match['metadata']['price']}")
```

### Batch Upsert

```python
def batch_upsert(index, vectors, batch_size=100):
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)

# Upsert 10,000 vectors in batches of 100
all_vectors = [{"id": f"v_{i}", "values": [...], "metadata": {...}} for i in range(10000)]
batch_upsert(index, all_vectors, batch_size=100)
```

### Namespaces for Multi-Tenancy

```python
# Each tenant gets a separate namespace
index.upsert(
    vectors=tenant_a_vectors,
    namespace="tenant_a"
)

index.upsert(
    vectors=tenant_b_vectors,
    namespace="tenant_b"
)

# Query within a namespace
results = index.query(
    vector=query_embedding,
    top_k=5,
    namespace="tenant_a"
)
```

## Weaviate

### Setup and Basic Operations

```python
import weaviate

client = weaviate.connect_to_local(
    host="localhost",
    port=8080,
    grpc_port=50051
)

# Create collection
from weaviate.classes.config import Configure

if client.collections.exists("Product"):
    client.collections.delete("Product")

products = client.collections.create(
    name="Product",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(
        model="text-embedding-3-small"
    ),
    properties=[
        {"name": "name", "data_type": "text"},
        {"name": "category", "data_type": "text"},
        {"name": "price", "data_type": "number"},
    ]
)

# Insert objects
collection = client.collections.get("Product")
collection.data.insert_many([
    {"name": "Widget A", "category": "electronics", "price": 29.99},
    {"name": "Widget B", "category": "electronics", "price": 49.99},
])

# Vector search
from weaviate.classes.query import MetadataQuery

results = collection.query.near_text(
    query="affordable electronics",
    limit=10,
    return_metadata=MetadataQuery(distance=True),
    filters=Filter.by_property("price").less_than(50.0)
)

for obj in results.objects:
    print(f"Name: {obj.properties['name']}, Distance: {obj.metadata.distance:.4f}")
```

### Hybrid Search in Weaviate

```python
# Hybrid search combines keyword and vector search
results = collection.query.hybrid(
    query="wireless headphones",
    alpha=0.5,  # 0=keyword, 1=vector
    limit=10,
    return_metadata=MetadataQuery(score=True)
)

for obj in results.objects:
    print(f"Name: {obj.properties['name']}, Score: {obj.metadata.score:.4f}")
```

## Chroma

### Setup and Basic Operations

```python
import chromadb

# Persistent client (saves to disk)
client = chromadb.PersistentClient(path="./chroma_db")

# In-memory client (for testing)
# client = chromadb.Client()

# Create collection
collection = client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"}  # or "l2" or "ip"
)

# Add documents (auto-embeds if no embeddings provided)
collection.add(
    ids=["doc1", "doc2", "doc3"],
    documents=[
        "Python is a programming language",
        "Java is also a programming language",
        "The weather is nice today"
    ],
    metadatas=[
        {"topic": "programming", "language": "python"},
        {"topic": "programming", "language": "java"},
        {"topic": "weather", "language": "none"}
    ]
)

# Query
results = collection.query(
    query_texts=["programming languages"],
    n_results=5,
    where={"topic": {"$eq": "programming"}}
)

print(results["documents"])
print(results["distances"])
print(results["metadatas"])
```

### Custom Embeddings

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

texts = ["document 1 text", "document 2 text"]
embeddings = model.encode(texts).tolist()

collection.add(
    ids=["doc1", "doc2"],
    documents=texts,
    embeddings=embeddings,
    metadatas=[{"source": "file1"}, {"source": "file2"}]
)

# Query with custom embedding
query_embedding = model.encode("search query").tolist()
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5
)
```

## pgvector

### Setup

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create HNSW index (recommended for production)
CREATE INDEX documents_embedding_idx
ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Or IVFFlat index (faster build, slightly slower query)
CREATE INDEX documents_embedding_ivf
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Python Usage

```python
import psycopg2
from pgvector.psycopg import register_vector
import numpy as np

conn = psycopg2.connect("postgresql://user:pass@localhost/db")
register_vector(conn)

# Insert
with conn.cursor() as cur:
    embedding = np.random.rand(1536).tolist()
    cur.execute(
        "INSERT INTO documents (content, embedding, metadata) VALUES (%s, %s, %s)",
        ("Document content here", embedding, {"source": "file.pdf"})
    )
    conn.commit()

# Similarity search
with conn.cursor() as cur:
    query_embedding = np.random.rand(1536).tolist()
    cur.execute("""
        SELECT content, metadata, 1 - (embedding <=> %s) AS similarity
        FROM documents
        WHERE metadata->>'source' = 'file.pdf'
        ORDER BY embedding <=> %s
        LIMIT 10
    """, (query_embedding, query_embedding))
    
    for content, metadata, similarity in cur.fetchall():
        print(f"Similarity: {similarity:.4f}, Content: {content[:80]}")
```

### Hybrid Search with Full-Text Search

```sql
-- Combine vector similarity with full-text search
SELECT content, metadata,
       ts_rank_cd(to_tsvector(content), plainto_tsquery('python programming')) AS text_rank,
       1 - (embedding <=> '[0.1, 0.2, ...]') AS vector_sim
FROM documents
WHERE to_tsvector(content) @@ plainto_tsquery('python programming')
ORDER BY (text_rank * 0.3 + vector_sim * 0.7) DESC
LIMIT 10;
```

## Milvus

### Setup and Basic Operations

```python
from pymilvus import MilvusClient

client = MilvusClient(uri="http://localhost:19530")

# Create collection
client.create_collection(
    collection_name="documents",
    dimension=1536,
    metric_type="COSINE",
    index_type="HNSW",
    index_params={"M": 16, "efConstruction": 64}
)

# Insert
data = [
    {"id": i, "vector": [0.1 * i, ...], "text": f"document {i}", "category": "tech"}
    for i in range(100)
]
client.insert(collection_name="documents", data=data)

# Search
results = client.search(
    collection_name="documents",
    data=[query_vector],
    limit=10,
    filter='category == "tech"',
    output_fields=["text", "category"]
)

for hits in results:
    for hit in hits:
        print(f"ID: {hit['id']}, Score: {hit['distance']:.4f}")
        print(f"  Text: {hit['entity']['text']}")
```

## Qdrant

### Setup and Basic Operations

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

client = QdrantClient(host="localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Insert points
points = [
    PointStruct(
        id=i,
        vector=[0.1, 0.2, ...],
        payload={"text": f"document {i}", "category": "tech", "page": i}
    )
    for i in range(100)
]
client.upsert(collection_name="documents", points=points)

# Search with filtering
results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    limit=10,
    query_filter=Filter(
        must=[
            FieldCondition(key="category", match=MatchValue(value="tech"))
        ]
    )
)

for result in results:
    print(f"Score: {result.score:.4f}, Payload: {result.payload}")
```

## Indexing Strategies

### HNSW (Hierarchical Navigable Small World)

```text
HNSW Parameters:
  M: Number of bi-directional links per node (default: 16)
    - Higher M = more memory, better recall, slower build
    - Recommended: 12-48
  
  ef_construction: Search width during build (default: 64)
    - Higher = better index quality, slower build
    - Recommended: 64-256
  
  ef_search: Search width during query (default: varies)
    - Higher = better recall, slower query
    - Recommended: 50-200

Tradeoffs:
  Fast queries + high recall: M=32, ef_construction=200, ef_search=100
  Low memory: M=12, ef_construction=64, ef_search=50
  Fast build: M=16, ef_construction=32, ef_search=50
```

### IVFFlat

```text
IVFFlat Parameters:
  lists: Number of clusters (default: sqrt(n))
    - More lists = faster query, lower recall
    - Recommended: n/1000 for <1M vectors, n/10000 for >1M
  
  probes: Number of clusters to search (default: 1)
    - More probes = better recall, slower query
    - Recommended: 10-50

When to use IVFFlat over HNSW:
  - Faster index build needed
  - Lower memory available
  - Acceptable to trade some recall for speed
```

## Benchmarking

```python
import time
import numpy as np
from typing import List

def benchmark_vector_search(
    search_fn,
    query_vectors: List[list[float]],
    ground_truth: List[int],
    top_k: int = 10
) -> dict:
    latencies = []
    correct = 0
    
    for query, expected in zip(query_vectors, ground_truth):
        start = time.perf_counter()
        results = search_fn(query, top_k)
        latency = (time.perf_counter() - start) * 1000  # ms
        latencies.append(latency)
        
        result_ids = [r["id"] for r in results[:top_k]]
        if expected in result_ids:
            correct += 1
    
    latencies.sort()
    return {
        "recall@k": correct / len(query_vectors),
        "avg_latency_ms": sum(latencies) / len(latencies),
        "p50_latency_ms": latencies[len(latencies) // 2],
        "p95_latency_ms": latencies[int(len(latencies) * 0.95)],
        "p99_latency_ms": latencies[int(len(latencies) * 0.99)],
    }

# Example usage
def pinecone_search(query, top_k):
    results = index.query(vector=query, top_k=top_k, include_metadata=True)
    return [{"id": m["id"], "score": m["score"]} for m in results["matches"]]

metrics = benchmark_vector_search(
    pinecone_search,
    test_queries,
    ground_truth_ids,
    top_k=10
)
print(f"Recall@10: {metrics['recall@k']:.2%}")
print(f"P95 latency: {metrics['p95_latency_ms']:.1f}ms")
```

## Production Considerations

### Choosing a Vector Database

```text
Decision framework:

1. Dataset size:
   < 100K vectors → Chroma, pgvector
   100K - 10M → Pinecone, Weaviate, Qdrant, pgvector
   > 10M → Milvus, Pinecone, Weaviate

2. Managed vs self-hosted:
   No ops team → Pinecone, Weaviate Cloud, Qdrant Cloud
   Have ops team → Weaviate, Milvus, Qdrant, pgvector

3. Already using PostgreSQL?
   Yes + < 10M vectors → pgvector (no new infrastructure)
   No → Dedicated vector database

4. Need hybrid search (vector + keyword)?
   Yes → Weaviate, Pinecone, Qdrant, Milvus
   No → Any option works

5. Budget constraints?
   Free → Chroma, pgvector, self-hosted Weaviate/Milvus/Qdrant
   Per-use → Pinecone
```

### Metadata Filtering

```python
# Pinecone filter syntax
filter = {
    "category": {"$eq": "electronics"},
    "price": {"$gte": 10.0, "$lte": 100.0},
    "tags": {"$in": ["sale", "new"]},
    "in_stock": {"$eq": True}
}

# Weaviate filter
from weaviate.classes.query import Filter
filter = (
    Filter.by_property("category").equal("electronics")
    & Filter.by_property("price").greater_or_equal(10.0)
    & Filter.by_property("price").less_or_equal(100.0)
)

# Qdrant filter
from qdrant_client.models import Filter, FieldCondition, Range, MatchValue
filter = Filter(
    must=[
        FieldCondition(key="category", match=MatchValue(value="electronics")),
        FieldCondition(key="price", range=Range(gte=10.0, lte=100.0))
    ]
)
```

## FAQ

### What is the difference between cosine similarity and L2 distance?

Cosine similarity measures the angle between vectors, ignoring magnitude. Use it when direction matters more than magnitude (text embeddings). L2 distance (Euclidean) measures the straight-line distance between vectors. Use it when both direction and magnitude matter (image embeddings). Most embedding models output normalized vectors where cosine and L2 produce equivalent rankings.

### How many dimensions should my embeddings have?

Common dimensions: 384 (MiniLM), 768 (BERT-base), 1536 (OpenAI small), 3072 (OpenAI large). Higher dimensions capture more information but use more memory and are slower to search. OpenAI's text-embedding-3-large supports dimensionality reduction (e.g., 3072 → 1536) with minimal quality loss via Matryoshka representations.

### Should I use HNSW or IVFFlat indexing?

Use HNSW for most production workloads. It provides better recall-to-latency ratio and supports incremental updates. Use IVFFlat when you need faster index builds, have memory constraints, or have a static dataset where you can afford to rebuild the index. HNSW uses more memory but queries faster at similar recall levels.

### How do I handle vector database migrations?

Export vectors and metadata from the source database. Import into the target database. Re-create indexes. Test query latency and recall on the new database before switching traffic. If the embedding model changes, you must re-embed all documents — there is no compatibility between different embedding models.

### Can I use pgvector for production RAG?

Yes. pgvector handles up to ~10M vectors with good performance using HNSW indexes. It is a good choice if you already use PostgreSQL and want to avoid managing a separate database. For larger datasets or higher query loads, a dedicated vector database (Pinecone, Milvus, Weaviate) will perform better.

### How do I optimize vector search latency?

Use HNSW with tuned parameters (M=16-32, ef_search=50-100). Store vectors in memory when possible. Use approximate search instead of exact search. Pre-filter by metadata to reduce the search space. Batch queries to amortize network overhead. Use a database geographically close to your application. Consider caching frequent queries.

## See Also

- [Complete Guide to RAG in Production](/guides/complete-guide-rag-production/)
- [Vector Databases — AI/ML Embeddings and Similarity Search](/guides/vector-database-guide/)
- [Complete Guide to AI Agents in Production](/guides/complete-guide-ai-agents-production/)
- [Complete Guide to LangChain in Production](/guides/complete-guide-langchain-production/)
- [Complete Guide to LLM Application Architecture](/guides/complete-guide-llm-application-architecture/)

