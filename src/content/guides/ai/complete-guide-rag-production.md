---
contentType: guides
slug: complete-guide-rag-production
title: "Complete Guide to RAG in Production"
description: "Build production RAG systems. Covers chunking strategies, embedding models, vector stores, retrieval optimization, reranking, hybrid search, evaluation, and deployment patterns for reliable retrieval-augmented generation."
metaDescription: "Build production RAG. Covers chunking, embeddings, vector stores, retrieval, reranking, hybrid search, evaluation, and deployment."
difficulty: advanced
topics:
  - ai
  - architecture
  - databases
tags:
  - rag
  - ai
  - guide
  - embeddings
  - vector-search
  - reranking
  - chunking
  - retrieval
relatedResources:
  - /guides/ai/complete-guide-llm-application-architecture
  - /guides/ai/complete-guide-vector-databases
  - /guides/caching/complete-guide-redis-caching-strategies
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build production RAG. Covers chunking, embeddings, vector stores, retrieval, reranking, hybrid search, evaluation, and deployment."
  keywords:
    - rag production
    - rag architecture
    - chunking strategies
    - embedding models
    - vector stores
    - retrieval optimization
    - reranking
    - hybrid search
---

## Introduction

Retrieval-Augmented Generation (RAG) combines an LLM with external knowledge. Instead of relying on the model's training data, you retrieve relevant documents from a knowledge base and inject them into the prompt. This reduces hallucinations, enables citing sources, and allows updating knowledge without retraining. Building RAG in production requires careful attention to chunking, embeddings, retrieval quality, reranking, and evaluation. The following walks through the full RAG pipeline with production patterns.

## RAG Pipeline Overview

```text
Document → Chunking → Embedding → Vector Store

Query → Embedding → Vector Search → Reranking → Context Assembly → LLM → Response + Sources

Steps:
1. Ingest: Load documents, split into chunks, embed, store
2. Retrieve: Embed query, search vector store, rerank results
3. Generate: Assemble context + query, call LLM, return response with citations
```

## Chunking Strategies

### Fixed-Size Chunking with Overlap

```python
from typing import List

def fixed_size_chunks(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap  # Overlap for context continuity
    
    return chunks

text = "This is a long document..." * 100
chunks = fixed_size_chunks(text, chunk_size=512, overlap=50)
print(f"Created {len(chunks)} chunks")
```

### Sentence-Based Chunking

```python
import re
from typing import List

def sentence_chunks(text: str, max_chunk_size: int = 512) -> List[str]:
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= max_chunk_size:
            current_chunk += " " + sentence if current_chunk else sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks
```

### Semantic Chunking

```python
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List

model = SentenceTransformer('all-MiniLM-L6-v2')

def semantic_chunks(text: str, threshold: float = 0.5) -> List[str]:
    # Split into sentences
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    if len(sentences) <= 1:
        return [text]
    
    # Embed each sentence
    embeddings = model.encode(sentences)
    
    # Calculate cosine similarity between consecutive sentences
    chunks = []
    current_chunk = [sentences[0]]
    
    for i in range(1, len(sentences)):
        sim = np.dot(embeddings[i], embeddings[i-1]) / (
            np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[i-1])
        )
        
        if sim > threshold:
            current_chunk.append(sentences[i])
        else:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentences[i]]
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks
```

### Markdown-Aware Chunking

```python
from typing import List
import re

def markdown_chunks(text: str, max_size: int = 512) -> List[str]:
    # Split by headers first
    sections = re.split(r'(\n#{1,6}\s+.+)', text)
    
    chunks = []
    current_section = ""
    current_header = ""
    
    for part in sections:
        if re.match(r'\n#{1,6}\s+', part):
            if current_section.strip():
                header_context = current_header + "\n" if current_header else ""
                section_text = header_context + current_section.strip()
                
                # Further split if too large
                if len(section_text) > max_size:
                    sub_chunks = sentence_chunks(section_text, max_size)
                    chunks.extend(sub_chunks)
                else:
                    chunks.append(section_text)
            
            current_header = part.strip()
            current_section = ""
        else:
            current_section += part
    
    if current_section.strip():
        header_context = current_header + "\n" if current_header else ""
        section_text = header_context + current_section.strip()
        chunks.append(section_text)
    
    return chunks
```

## Embedding Models

### Choosing an Embedding Model

```python
from sentence_transformers import SentenceTransformer
from openai import OpenAI

# Option 1: Local model (free, runs on CPU/GPU)
local_model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = local_model.encode(["text1", "text2"])

# Option 2: OpenAI embeddings (API-based, higher quality)
client = OpenAI()
response = client.embeddings.create(
    model="text-embedding-3-small",  # or text-embedding-3-large
    input=["text1", "text2"]
)
embeddings = [d.embedding for d in response.data]

# Option 2b: OpenAI large (3072 dimensions, higher quality)
response = client.embeddings.create(
    model="text-embedding-3-large",
    input=["text1", "text2"],
    dimensions=1536  # Can reduce dimensions for storage savings
)
```

### Batch Embedding

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def batch_embed(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=batch
        )
        all_embeddings.extend([d.embedding for d in response.data])
    
    return all_embeddings

# Embed all chunks
chunks = ["chunk1 text", "chunk2 text", "chunk3 text"]
embeddings = await batch_embed(chunks)
```

## Vector Stores

### Chroma (Local Development)

```python
import chromadb

client = chromadb.PersistentClient(path="./vector_db")

collection = client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"}
)

# Add documents
collection.add(
    ids=["doc1", "doc2", "doc3"],
    documents=["content of doc1", "content of doc2", "content of doc3"],
    metadatas=[
        {"source": "file1.pdf", "page": 1},
        {"source": "file2.pdf", "page": 3},
        {"source": "file3.pdf", "page": 5}
    ],
    embeddings=embeddings
)

# Query
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5,
    where={"source": "file1.pdf"}  # Optional metadata filter
)

for doc, score, metadata in zip(
    results["documents"][0],
    results["distances"][0],
    results["metadatas"][0]
):
    print(f"Score: {score:.4f}, Source: {metadata['source']}, Text: {doc[:100]}")
```

### Pinecone (Production)

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# Create index
pc.create_index(
    name="documents",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)

index = pc.Index("documents")

# Upsert vectors
vectors = [
    {
        "id": f"doc_{i}",
        "values": embedding,
        "metadata": {
            "text": chunk,
            "source": f"file_{i}.pdf",
            "page": i,
            "chunk_index": i
        }
    }
    for i, (embedding, chunk) in enumerate(zip(embeddings, chunks))
]

index.upsert(vectors=vectors)

# Query
query_result = index.query(
    vector=query_embedding,
    top_k=10,
    include_metadata=True,
    filter={"source": {"$eq": "file_1.pdf"}}
)

for match in query_result["matches"]:
    print(f"Score: {match['score']:.4f}, Text: {match['metadata']['text'][:100]}")
```

### pgvector (PostgreSQL)

```python
import psycopg2
from pgvector.psycopg import register_vector

conn = psycopg2.connect("postgresql://user:pass@localhost/db")
register_vector(conn)

# Create table with vector column
with conn.cursor() as cur:
    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            content TEXT,
            embedding VECTOR(1536),
            metadata JSONB
        )
    """)
    
    # Create HNSW index for fast similarity search
    cur.execute("""
        CREATE INDEX IF NOT EXISTS documents_embedding_idx 
        ON documents USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
    
    conn.commit()

# Insert documents
with conn.cursor() as cur:
    for chunk, embedding in zip(chunks, embeddings):
        cur.execute(
            "INSERT INTO documents (content, embedding, metadata) VALUES (%s, %s, %s)",
            (chunk, embedding, {"source": "file.pdf"})
        )
    conn.commit()

# Query
with conn.cursor() as cur:
    cur.execute(
        """
        SELECT content, metadata, embedding <=> %s AS distance
        FROM documents
        ORDER BY embedding <=> %s
        LIMIT 10
        """,
        (query_embedding, query_embedding)
    )
    
    results = cur.fetchall()
    for content, metadata, distance in results:
        print(f"Distance: {distance:.4f}, Content: {content[:100]}")
```

## Retrieval Optimization

### Hybrid Search (Vector + Keyword)

```python
from typing import List
import numpy as np

class HybridSearch:
    def __init__(self, vector_store, keyword_index, alpha: float = 0.5):
        self.vector_store = vector_store
        self.keyword_index = keyword_index
        self.alpha = alpha  # Weight: 0=keyword only, 1=vector only
    
    def search(self, query: str, query_embedding: list[float], top_k: int = 10) -> List[dict]:
        # Vector search
        vector_results = self.vector_store.query(
            query_embeddings=[query_embedding],
            n_results=top_k * 2
        )
        
        # Keyword search (BM25 or similar)
        keyword_results = self.keyword_index.search(query, top_k=top_k * 2)
        
        # Normalize scores to [0, 1]
        vector_scores = self._normalize_scores([
            1 - r for r in vector_results["distances"][0]
        ])
        keyword_scores = self._normalize_scores([
            r["score"] for r in keyword_results
        ])
        
        # Combine scores
        combined = {}
        
        for i, doc in enumerate(vector_results["documents"][0]):
            doc_id = vector_results["ids"][0][i]
            combined[doc_id] = {
                "text": doc,
                "metadata": vector_results["metadatas"][0][i],
                "score": self.alpha * vector_scores[i]
            }
        
        for i, result in enumerate(keyword_results):
            doc_id = result["id"]
            if doc_id in combined:
                combined[doc_id]["score"] += (1 - self.alpha) * keyword_scores[i]
            else:
                combined[doc_id] = {
                    "text": result["text"],
                    "metadata": result.get("metadata", {}),
                    "score": (1 - self.alpha) * keyword_scores[i]
                }
        
        # Sort by combined score
        sorted_results = sorted(
            combined.values(),
            key=lambda x: x["score"],
            reverse=True
        )
        
        return sorted_results[:top_k]
    
    def _normalize_scores(self, scores: list[float]) -> list[float]:
        if not scores:
            return []
        min_s, max_s = min(scores), max(scores)
        if max_s == min_s:
            return [1.0] * len(scores)
        return [(s - min_s) / (max_s - min_s) for s in scores]
```

## Reranking

### Cross-Encoder Reranking

```python
from sentence_transformers import CrossEncoder
from typing import List

# Load a cross-encoder model (more accurate than bi-encoder for reranking)
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank_results(query: str, documents: List[str], top_k: int = 5) -> List[dict]:
    # Score each (query, document) pair
    pairs = [(query, doc) for doc in documents]
    scores = reranker.predict(pairs)
    
    # Sort by score
    ranked = sorted(
        zip(documents, scores),
        key=lambda x: x[1],
        reverse=True
    )
    
    return [
        {"text": doc, "score": float(score)}
        for doc, score in ranked[:top_k]
    ]

# Usage in RAG pipeline
initial_results = vector_store.query(query_embeddings=[query_embedding], n_results=20)
reranked = rerank_results(user_query, initial_results["documents"][0], top_k=5)
```

### Cohere Reranking API

```python
import cohere

co = cohere.Client("your-api-key")

def cohere_rerank(query: str, documents: List[str], top_k: int = 5) -> List[dict]:
    results = co.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=documents,
        top_n=top_k
    )
    
    return [
        {
            "text": documents[r.index],
            "score": r.relevance_score,
            "index": r.index
        }
        for r in results.results
    ]
```

## Context Assembly

```python
from typing import List

def assemble_context(
    retrieved_docs: List[dict],
    max_context_tokens: int = 4000,
    include_metadata: bool = True
) -> str:
    context_parts = []
    current_tokens = 0
    
    for i, doc in enumerate(retrieved_docs):
        # Estimate tokens (rough: 1 token ≈ 4 chars)
        doc_tokens = len(doc["text"]) // 4
        
        if current_tokens + doc_tokens > max_context_tokens:
            # Truncate to fit
            remaining = max_context_tokens - current_tokens
            if remaining > 100:  # Only add if meaningful
                truncated = doc["text"][:remaining * 4]
                context_parts.append(f"[Source {i+1}]: {truncated}...")
            break
        
        source_info = ""
        if include_metadata and "metadata" in doc:
            meta = doc["metadata"]
            source_info = f" (Source: {meta.get('source', 'unknown')}, Page: {meta.get('page', '?')})"
        
        context_parts.append(f"[Source {i+1}]{source_info}: {doc['text']}")
        current_tokens += doc_tokens
    
    return "\n\n".join(context_parts)

# Build the final prompt
def build_rag_prompt(query: str, context: str) -> list[dict]:
    return [
        {
            "role": "system",
            "content": "Answer the user's question based on the provided context. "
                       "If the context doesn't contain relevant information, say you don't know. "
                       "Always cite the source number when using information from the context."
        },
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {query}"
        }
    ]
```

## Full RAG Pipeline

```python
import asyncio
from openai import AsyncOpenAI
from sentence_transformers import SentenceTransformer, CrossEncoder
import chromadb

client = AsyncOpenAI()
embedder = SentenceTransformer('all-MiniLM-L6-v2')
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
vector_db = chromadb.PersistentClient(path="./vector_db")
collection = vector_db.get_collection("documents")

class RAGPipeline:
    def __init__(self, collection, embedder, reranker, llm_client):
        self.collection = collection
        self.embedder = embedder
        self.reranker = reranker
        self.llm_client = llm_client
    
    async def answer(self, query: str, top_k: int = 5) -> dict:
        # 1. Embed query
        query_embedding = self.embedder.encode(query).tolist()
        
        # 2. Vector search (retrieve more than needed for reranking)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k * 4
        )
        
        # 3. Rerank
        documents = results["documents"][0]
        pairs = [(query, doc) for doc in documents]
        scores = self.reranker.predict(pairs)
        
        ranked = sorted(zip(documents, scores, results["metadatas"][0]),
                       key=lambda x: x[1], reverse=True)[:top_k]
        
        # 4. Assemble context
        context_parts = []
        sources = []
        for i, (doc, score, metadata) in enumerate(ranked):
            context_parts.append(f"[Source {i+1}]: {doc}")
            sources.append({
                "source": metadata.get("source", "unknown"),
                "page": metadata.get("page", "?"),
                "relevance_score": float(score)
            })
        
        context = "\n\n".join(context_parts)
        
        # 5. Generate answer
        messages = [
            {
                "role": "system",
                "content": "Answer based on the context. Cite source numbers. "
                           "If the context is insufficient, say you don't know."
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {query}"
            }
        ]
        
        response = await self.llm_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.3  # Low temperature for factual answers
        )
        
        return {
            "answer": response.choices[0].message.content,
            "sources": sources,
            "retrieved_count": len(ranked)
        }

# Usage
rag = RAGPipeline(collection, embedder, reranker, client)
result = await rag.answer("How do I configure authentication?")
print(f"Answer: {result['answer']}")
print(f"Sources: {result['sources']}")
```

## Evaluation

### RAGAS Metrics

```python
from dataclasses import dataclass
from typing import List

@dataclass
class RAGEvaluation:
    faithfulness: float       # Is the answer grounded in the context?
    answer_relevancy: float   # Does the answer address the question?
    context_precision: float  # Is the retrieved context relevant?
    context_recall: float     # Did we retrieve all needed information?

async def evaluate_rag_response(
    query: str,
    answer: str,
    contexts: List[str],
    ground_truth: str = None
) -> RAGEvaluation:
    # Using LLM-as-judge for evaluation
    # In production, use the ragas library: https://github.com/explodinggradients/ragas
    
    # Faithfulness: Check if answer is supported by context
    faithfulness_prompt = f"""
    Context: {contexts}
    Answer: {answer}
    
    Is the answer fully supported by the context? Rate 0-1.
    """
    
    # Answer relevancy: Check if answer addresses the question
    relevancy_prompt = f"""
    Question: {query}
    Answer: {answer}
    
    Does the answer directly address the question? Rate 0-1.
    """
    
    # In practice, use ragas library
    # from ragas import evaluate
    # from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
    # result = evaluate(dataset, metrics=[faithfulness, answer_relevancy, ...])
    
    return RAGEvaluation(
        faithfulness=0.0,  # Placeholder
        answer_relevancy=0.0,
        context_precision=0.0,
        context_recall=0.0
    )
```

## FAQ

### What chunk size should I use?

Start with 512 tokens with 50-100 token overlap. For technical documentation, use smaller chunks (256-384) to keep precise information. For narratives or long-form content, use larger chunks (768-1024). Always evaluate retrieval quality with different chunk sizes on your specific data.

### Should I use semantic chunking or fixed-size chunking?

Semantic chunking produces better chunks because it respects sentence and paragraph boundaries. Fixed-size chunking is faster and simpler. Use semantic chunking for quality-critical applications. Use fixed-size for initial prototyping or when processing speed matters more than retrieval precision.

### What is the difference between bi-encoders and cross-encoders?

Bi-encoders embed the query and document separately, then compute similarity. They are fast and scalable (embed documents offline, query at runtime). Cross-encoders process query and document together, producing a relevance score. They are more accurate but slower. Use bi-encoders for initial retrieval, cross-encoders for reranking.

### How do I handle multi-turn conversations in RAG?

Maintain conversation history. For each new user message, determine if new retrieval is needed (the question references previous context) or if the existing context is sufficient. Rewrite the user query to include conversation context before retrieval. For example, "What about Python?" becomes "What about Python authentication?" using previous turns.

### How do I evaluate my RAG system?

Use the RAGAS framework with four metrics: faithfulness (answer grounded in context), answer relevancy (addresses the question), context precision (retrieved docs are relevant), context recall (all needed info was retrieved). Build a test set of questions with known ground truth answers. Run evaluations on every prompt or model change.

### Should I use a managed vector database or self-host?

Use managed (Pinecone, Weaviate Cloud) for production when you need scalability, uptime, and no operational overhead. Use self-hosted (pgvector, Chroma, local Weaviate) for development, small datasets (<100K vectors), or when data sovereignty requires on-premise storage. pgvector is a good middle ground if you already use PostgreSQL.
