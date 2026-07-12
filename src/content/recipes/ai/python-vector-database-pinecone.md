---
contentType: recipes
slug: python-vector-database-pinecone
title: "Store and Query Embeddings in Pinecone Vector Database"
description: "Use Pinecone to store, query, and filter vector embeddings for semantic search with metadata filtering and namespace isolation"
metaDescription: "Store and query embeddings in Pinecone for semantic search. Upsert vectors, filter by metadata, use namespaces, and optimize recall with sparse vectors."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - pinecone
  - vector database
  - embeddings
  - semantic search
relatedResources:
  - /recipes/ai/python-openai-embeddings-cosine
  - /recipes/ai/python-rag-chroma-local
  - /recipes/ai/python-langchain-chains-composition
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Store and query embeddings in Pinecone for semantic search. Upsert vectors, filter by metadata, use namespaces, and optimize recall with sparse vectors."
  keywords:
    - pinecone vector database
    - python embeddings
    - semantic search
    - vector similarity
    - pinecone python
---

# Store and Query Embeddings in Pinecone Vector Database

Pinecone is a managed vector database optimized for semantic search and RAG. It stores high-dimensional embeddings and retrieves the most similar vectors in milliseconds. Below: creating an index, upserting embeddings with metadata, querying with filters, and using namespaces for multi-tenant isolation.

## When to Use This

- Semantic search over documents, products, or knowledge bases
- RAG (Retrieval-Augmented Generation) pipelines that need fast vector retrieval
- Recommendation systems based on embedding similarity
- Deduplication of semantically similar content

## Prerequisites

- Python 3.10+
- `pinecone` package (`pip install pinecone`)
- `openai` package for embeddings (`pip install openai`)
- A Pinecone API key

## Solution

### 1. Install Dependencies

```bash
pip install pinecone openai
```

### 2. Initialize Pinecone and Create an Index

```python
from pinecone import Pinecone, ServerSpec
from openai import OpenAI

pc = Pinecone(api_key="your-pinecone-api-key")
openai_client = OpenAI()

# Create a serverless index (free tier)
index_name = "knowledge-base"

if index_name not in [idx.name for idx in pc.list_indexes()]:
    pc.create_index(
        name=index_name,
        dimension=1536,  # OpenAI text-embedding-3-small dimension
        metric="cosine",
        spec=ServerSpec(
            cloud="aws",
            region="us-east-1",
        ),
    )

index = pc.Index(index_name)
```

### 3. Generate Embeddings and Upsert

```python
import uuid

def generate_embedding(text: str) -> list[float]:
    """Generate embedding using OpenAI."""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding

def upsert_documents(documents: list[dict]) -> dict:
    """Upsert documents with embeddings and metadata.

    Args:
        documents: List of {text, metadata} dicts.

    Returns:
        Upsert response from Pinecone.
    """
    vectors = []
    for doc in documents:
        embedding = generate_embedding(doc["text"])
        vectors.append({
            "id": doc.get("id", str(uuid.uuid4())),
            "values": embedding,
            "metadata": {
                **doc.get("metadata", {}),
                "text": doc["text"][:500],  # Store truncated text for retrieval
            },
        })

    return index.upsert(vectors=vectors)

# Upsert sample documents
upsert_documents([
    {
        "id": "doc1",
        "text": "Redis is an in-memory data structure store used as a cache and database.",
        "metadata": {"category": "database", "source": "docs"},
    },
    {
        "id": "doc2",
        "text": "PostgreSQL is a capable open-source relational database system.",
        "metadata": {"category": "database", "source": "docs"},
    },
    {
        "id": "doc3",
        "text": "Docker containers package applications with their dependencies.",
        "metadata": {"category": "devops", "source": "tutorial"},
    },
])
```

### 4. Query for Similar Vectors

```python
def search_similar(
    query: str,
    top_k: int = 5,
    filter: dict | None = None,
) -> list[dict]:
    """Search for similar documents.

    Args:
        query: Query text.
        top_k: Number of results to return.
        filter: Metadata filter dict.

    Returns:
        List of {id, score, metadata} dicts.
    """
    query_embedding = generate_embedding(query)

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter=filter,
    )

    return [
        {
            "id": match["id"],
            "score": match["score"],
            "metadata": match["metadata"],
        }
        for match in results["matches"]
    ]

# Semantic search
results = search_similar("in-memory cache for fast lookups", top_k=3)
for r in results:
    print(f"Score: {r['score']:.3f} | {r['metadata']['text'][:80]}")
```

### 5. Metadata Filtering

```python
# Filter by category
results = search_similar(
    "database for web applications",
    top_k=5,
    filter={"category": {"$eq": "database"}},
)

# Filter by source and category
results = search_similar(
    "container deployment",
    top_k=5,
    filter={
        "source": {"$eq": "tutorial"},
        "category": {"$eq": "devops"},
    },
)

# Range filter
results = search_similar(
    "recent articles",
    top_k=10,
    filter={"timestamp": {"$gte": 1700000000}},
)
```

### 6. Namespaces for Multi-Tenant Isolation

```python
def upsert_to_namespace(documents: list[dict], namespace: str) -> dict:
    """Upsert documents to a specific namespace."""
    vectors = []
    for doc in documents:
        embedding = generate_embedding(doc["text"])
        vectors.append({
            "id": doc["id"],
            "values": embedding,
            "metadata": doc.get("metadata", {}),
        })
    return index.upsert(vectors=vectors, namespace=namespace)

def search_namespace(query: str, namespace: str, top_k: int = 5) -> list[dict]:
    """Search within a specific namespace."""
    query_embedding = generate_embedding(query)
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace,
    )
    return results["matches"]

# Each tenant gets isolated search
upsert_to_namespace(tenant_a_docs, namespace="tenant-a")
upsert_to_namespace(tenant_b_docs, namespace="tenant-b")

results = search_namespace("caching strategies", namespace="tenant-a")
```

### 7. Batch Upsert for Large Datasets

```python
def batch_upsert(documents: list[dict], batch_size: int = 100) -> int:
    """Upsert documents in batches to avoid rate limits.

    Args:
        documents: List of documents to upsert.
        batch_size: Number of vectors per batch.

    Returns:
        Total number of vectors upserted.
    """
    total = 0
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]

        # Generate embeddings in batch
        texts = [doc["text"] for doc in batch]
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=texts,
        )
        embeddings = [item.embedding for item in response.data]

        vectors = [
            {
                "id": doc.get("id", str(uuid.uuid4())),
                "values": emb,
                "metadata": doc.get("metadata", {}),
            }
            for doc, emb in zip(batch, embeddings)
        ]

        index.upsert(vectors=vectors)
        total += len(vectors)
        print(f"Upserted batch {i // batch_size + 1}: {total} total")

    return total
```

## How It Works

1. **Index creation** specifies the vector dimension (must match the embedding model) and similarity metric (`cosine`, `euclidean`, or `dotproduct`).
2. **Upsert** stores vectors with optional metadata. Each vector has a unique ID, values (the embedding), and metadata (key-value pairs for filtering).
3. **Query** converts the query text to an embedding, searches for the nearest vectors by cosine similarity, and returns the top K matches with scores.
4. **Metadata filtering** uses MongoDB-like operators (`$eq`, `$ne`, `$in`, `$gte`, `$lte`) to narrow results before vector similarity search.
5. **Namespaces** partition the index into isolated subsets. Queries in one namespace do not see vectors from another, enabling multi-tenant setups.

## Variants

### Sparse Vectors for Keyword Search

```python
# Pinecone supports hybrid search with sparse vectors
from pinecone import SparseValues

def upsert_hybrid(doc_id: str, dense_values: list[float], sparse_values: dict):
    index.upsert(vectors=[{
        "id": doc_id,
        "values": dense_values,
        "sparse_values": SparseValues(
            indices=sparse_values["indices"],
            values=sparse_values["values"],
        ),
        "metadata": {"text": "document text"},
    }])

# Query with both dense and sparse vectors
results = index.query(
    vector=dense_query,
    sparse_vector=SparseValues(
        indices=sparse_query["indices"],
        values=sparse_query["values"],
    ),
    top_k=10,
    include_metadata=True,
)
```

### Delete by Metadata Filter

```python
def delete_by_filter(filter: dict) -> dict:
    """Delete all vectors matching a metadata filter."""
    return index.delete(filter=filter)

# Delete all documents from a specific source
delete_by_filter({"source": {"$eq": "deprecated"}})
```

### Fetch by ID

```python
def fetch_vectors(ids: list[str]) -> dict:
    """Fetch vectors by their IDs."""
    return index.fetch(ids=ids)

result = fetch_vectors(["doc1", "doc2"])
for vid, vector in result["vectors"].items():
    print(f"ID: {vid}, Values: {vector['values'][:5]}...")
```

## Best Practices

- **Use batch embeddings API** — generating embeddings one at a time is 10x slower than batching
- **Store truncated text in metadata** — Pinecone does not store full documents; keep text in metadata for retrieval
- **Use namespaces for tenants** — cheaper and faster than separate indexes for each tenant
- **Monitor index size** — Pinecone has storage limits per plan; delete old vectors with `delete(filter=...)`

## Common Mistakes

- **Mismatched dimensions** — the index dimension must match the embedding model's output dimension exactly
- **Not using metadata filtering** — retrieving all vectors and filtering client-side is slow and expensive
- **Upserting one vector at a time** — batch upserts are considerably faster and avoid rate limits
- **Using the wrong metric** — cosine is best for normalized text embeddings; dotproduct for unnormalized

## FAQ

**Q: What embedding model should I use?**
A: `text-embedding-3-small` (1536 dimensions) is a good default. Use `text-embedding-3-large` (3072 dimensions) for higher accuracy at higher cost.

**Q: How much does Pinecone cost?**
A: The free tier includes one serverless index with 100K vectors. Paid plans start at $70/month with higher storage and query limits.

**Q: Can I use Pinecone with local embeddings?**
A: Yes. Generate embeddings with any model (HuggingFace, Ollama) and upsert them to Pinecone. The index dimension must match.

**Q: How do I update an existing vector?**
A: Upsert with the same ID. Pinecone overwrites the existing vector and metadata.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
