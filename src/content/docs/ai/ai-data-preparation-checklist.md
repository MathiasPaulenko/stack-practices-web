---


contentType: docs
slug: ai-data-preparation-checklist
templateType: post-deployment-checklist
title: "AI Data Preparation Checklist"
description: "Checklist for preparing data for LLM and RAG systems: data collection, cleaning, chunking, embedding, deduplication, PII removal, format validation, quality scoring, and indexing with metrics and thresholds."
metaDescription: "Checklist for AI data prep: collection, cleaning, chunking, embedding, deduplication, PII removal, format validation, quality scoring, indexing with metrics."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - data-preparation
  - checklist
  - rag
  - llm
  - data-quality
  - embeddings
relatedResources:
  - /docs/ai-rag-evaluation-checklist
  - /docs/ai-llm-prompt-template-library
  - /docs/ai-model-selection-matrix
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Checklist for AI data prep: collection, cleaning, chunking, embedding, deduplication, PII removal, format validation, quality scoring, indexing with metrics."
  keywords:
    - ai data preparation
    - data cleaning
    - rag data prep
    - chunking strategy
    - embedding preparation
    - data deduplication
    - pii removal ai


---

## Overview

This checklist covers data preparation for LLM and RAG systems. Run through every section before indexing data into your vector store or fine-tuning pipeline. Poor data quality is the most common cause of RAG failures.

---

## 1. Data Collection

### 1.1 Source Inventory

- [ ] All data sources identified and documented
- [ ] Source format documented (PDF, HTML, Markdown, JSON, CSV, database)
- [ ] Source access verified (API keys, database credentials, file permissions)
- [ ] Source refresh cadence defined (real-time, hourly, daily, weekly)
- [ ] Source ownership documented (who maintains each source)

```text
Source              | Format    | Size     | Refresh   | Owner
────────────────────┼───────────┼──────────┼───────────┼────────────
Product docs        | Markdown  | 50 MB    | Weekly    | Docs team
API reference       | OpenAPI   | 5 MB     | On change | Eng team
Support tickets     | JSON      | 200 MB   | Daily     | Support team
Internal wiki       | HTML      | 500 MB   | Daily     | Knowledge mgmt
Code repository     | Markdown  | 30 MB    | On commit | Eng team
Customer FAQs       | CSV       | 2 MB     | Monthly   | Support team
```

### 1.2 Legal and Compliance

- [ ] Data usage rights verified (can you use this data in an AI system?)
- [ ] License terms reviewed for each source
- [ ] Personal data identified and documented
- [ ] Consent status checked for user-generated content
- [ ] Data retention policy applied
- [ ] GDPR/CCPA compliance verified for personal data

---

## 2. Data Cleaning

### 2.1 Text Quality

```python
import re
from typing import List

def clean_text(text: str) -> str:
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove non-printable characters
    text = re.sub(r'[^\x20-\x7E\n\r\t]', '', text)
    
    # Fix encoding issues
    text = text.encode('utf-8', errors='ignore').decode('utf-8')
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text

def remove_boilerplate(text: str, min_length: int = 100) -> str:
    # Remove navigation menus, footers, headers
    lines = text.split('\n')
    meaningful = [l for l in lines if len(l.strip()) > min_length]
    return '\n'.join(meaningful)
```

### 2.2 Cleaning Checklist

- [ ] HTML tags removed from web-scraped content
- [ ] Markdown formatting normalized
- [ ] Encoding issues fixed (UTF-8 throughout)
- [ ] Excessive whitespace collapsed
- [ ] Boilerplate removed (navigation, footers, cookie notices)
- [ ] Empty or near-empty documents removed (< 50 characters)
- [ ] Duplicate documents identified and handled
- [ ] Corrupted files identified and removed
- [ ] Non-text content (images, videos) extracted or referenced separately

---

## 3. PII and Sensitive Data Removal

### 3.1 PII Detection

```python
import re

PII_PATTERNS = {
    "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    "phone": r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
    "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
    "credit_card": r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
    "ip_address": r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
}

def detect_pii(text: str) -> dict:
    found = {}
    for pii_type, pattern in PII_PATTERNS.items():
        matches = re.findall(pattern, text)
        if matches:
            found[pii_type] = len(matches)
    return found

def redact_pii(text: str) -> str:
    for pii_type, pattern in PII_PATTERNS.items():
        text = re.sub(pattern, f'[REDACTED_{pii_type.upper()}]', text)
    return text
```

### 3.2 PII Checklist

- [ ] Email addresses redacted or removed
- [ ] Phone numbers redacted
- [ ] Social security numbers redacted
- [ ] Credit card numbers redacted
- [ ] IP addresses redacted (if sensitive)
- [ ] Home addresses redacted
- [ ] Names of customers/users evaluated (may need to keep for context)
- [ ] API keys and secrets removed
- [ ] Internal URLs and hostnames evaluated

---

## 4. Deduplication

### 4.1 Exact Deduplication

```python
import hashlib

def find_exact_duplicates(documents: list) -> dict:
    hashes = {}
    duplicates = {}
    
    for doc in documents:
    content_hash = hashlib.sha256(doc["content"].encode()).hexdigest()
        if content_hash in hashes:
            duplicates[doc["id"]] = hashes[content_hash]
        else:
            hashes[content_hash] = doc["id"]
    
    return duplicates
```

### 4.2 Near-Duplicate Detection

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def find_near_duplicates(documents: list, threshold: float = 0.95) -> list:
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([d["content"] for d in documents])
    
    similarity_matrix = cosine_similarity(tfidf_matrix)
    np.fill_diagonal(similarity_matrix, 0)
    
    duplicates = []
    for i in range(len(documents)):
        for j in range(i + 1, len(documents)):
            if similarity_matrix[i][j] > threshold:
                duplicates.append({
                    "doc_a": documents[i]["id"],
                    "doc_b": documents[j]["id"],
                    "similarity": similarity_matrix[i][j],
                })
    
    return duplicates
```

### 4.3 Deduplication Checklist

- [ ] Exact duplicates removed
- [ ] Near-duplicates identified (cosine similarity > 0.95)
- [ ] Near-duplicates reviewed — keep the most complete version
- [ ] Cross-source duplicates identified (same content from different sources)
- [ ] Version conflicts resolved (keep latest version of updated documents)

---

## 5. Chunking Strategy

### 5.1 Chunk Size Selection

```text
Content type          | Recommended chunk size | Overlap
──────────────────────┼───────────────────────┼─────────
Technical docs        | 512-1024 tokens        | 50-100
API reference         | 256-512 tokens         | 0-50
Support tickets       | 256-512 tokens         | 0
Code documentation    | 512-1024 tokens        | 50-100
Legal documents       | 1024-2048 tokens       | 100-200
FAQ entries           | One Q&A per chunk      | 0
Tables                | One table per chunk    | 0
```

### 5.2 Chunking Implementation

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

def chunk_documents(documents: list, chunk_size: int = 512, overlap: int = 50) -> list:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    
    chunks = []
    for doc in documents:
        doc_chunks = splitter.split_text(doc["content"])
        for i, chunk in enumerate(doc_chunks):
            chunks.append({
                "id": f"{doc['id']}_chunk_{i}",
                "content": chunk,
                "metadata": {
                    "source": doc["source"],
                    "title": doc["title"],
                    "chunk_index": i,
                    "total_chunks": len(doc_chunks),
                },
            })
    
    return chunks
```

### 5.3 Chunking Checklist

- [ ] Chunk size appropriate for content type
- [ ] Chunk overlap preserves context across boundaries
- [ ] Document structure respected (no chunks crossing section boundaries)
- [ ] Tables kept intact (not split across chunks)
- [ ] Code blocks kept intact
- [ ] Metadata attached to each chunk (source, page, section, title)
- [ ] Chunk length distribution checked (no extreme outliers)

---

## 6. Embedding Generation

### 6.1 Model Selection

```text
Model                      | Dimensions | Cost / 1K tokens | Quality
───────────────────────────┼────────────┼─────────────────┼────────
text-embedding-3-small     | 1536       | $0.00002         | Good
text-embedding-3-large     | 3072       | $0.00013         | Best
text-embedding-ada-002     | 1536       | $0.00010         | Good
Cohere embed-english-v3    | 1024       | $0.00010         | Good
Sentence-Transformers      | 384-768    | Free (self-host) | Fair
```

### 6.2 Embedding Generation

```python
from openai import OpenAI
import time

client = OpenAI()

def generate_embeddings(chunks: list, model: str = "text-embedding-3-small", batch_size: int = 100) -> list:
    embeddings = []
    
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        texts = [c["content"] for c in batch]
        
        response = client.embeddings.create(
            model=model,
            input=texts,
        )
        
        for j, embedding in enumerate(response.data):
            embeddings.append({
                "chunk_id": batch[j]["id"],
                "embedding": embedding.embedding,
                "content": batch[j]["content"],
                "metadata": batch[j]["metadata"],
            })
        
        # Rate limit
        time.sleep(0.5)
    
    return embeddings
```

### 6.3 Embedding Checklist

- [ ] Embedding model selected based on quality and cost requirements
- [ ] All chunks embedded with the same model
- [ ] Embedding dimensions consistent across all chunks
- [ ] Batch size optimized for throughput without hitting rate limits
- [ ] Failed embeddings retried
- [ ] Embedding cost tracked and within budget
- [ ] Embeddings stored in vector database with metadata

---

## 7. Vector Index Configuration

### 7.1 Index Selection

```text
Vector store    | Index type | Best for                    | Max vectors
────────────────┼────────────┼─────────────────────────────┼────────────
Pinecone        | HNSW       | Managed, production         | 1B+
Weaviate        | HNSW       | Self-hosted, flexible       | 1B+
pgvector        | IVFFlat    | PostgreSQL integration      | 100M
Qdrant          | HNSW       | Self-hosted, Rust-based     | 1B+
Milvus          | IVF/HNSW   | Large-scale, self-hosted    | 10B+
Chroma          | HNSW       | Local development           | 1M
```

### 7.2 Index Parameters

```python
# Pinecone example
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")
index = pc.create_index(
    name="knowledge-base",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1",
    ),
)

# HNSW parameters (for self-hosted)
HNSW_CONFIG = {
    "m": 16,              # Max connections per node
    "ef_construction": 200,  # Build-time search width
    "ef_search": 50,      # Query-time search width
}
```

### 7.3 Index Checklist

- [ ] Vector store selected based on scale and latency requirements
- [ ] Index type appropriate for corpus size
- [ ] Distance metric selected (cosine for normalized embeddings)
- [ ] Index parameters tuned for recall vs latency tradeoff
- [ ] Metadata filters configured (source, date, category)
- [ ] Index built and verified with test queries
- [ ] Query latency measured (p95 < 200ms target)

---

## 8. Quality Validation

### 8.1 Data Quality Metrics

```text
Metric                  | Target  | Measurement
────────────────────────┼─────────┼──────────────────────
Average chunk length    | 400-800 | tokens per chunk
Chunk length variance   | Low     | No chunks < 50 or > 2000 tokens
Duplicate chunk rate    | < 2%    | % of near-duplicate chunks
PII detection rate      | 0%      | After redaction
Empty chunk rate        | 0%      | No empty chunks indexed
Metadata completeness   | 100%    | Every chunk has source + title
Embedding success rate  | > 99%   | % of chunks successfully embedded
```

### 8.2 Retrieval Quality Test

```python
def test_retrieval_quality(test_queries: list, vector_store, expected_sources: dict):
    results = []
    for query in test_queries:
        retrieved = vector_store.search(query, top_k=5)
        retrieved_sources = [r["metadata"]["source"] for r in retrieved]
        expected = expected_sources.get(query, [])
        
        # Check if expected source is in top-k
        hit = any(src in retrieved_sources for src in expected)
        
        results.append({
            "query": query,
            "hit": hit,
            "retrieved_sources": retrieved_sources,
            "expected_sources": expected,
        })
    
    hit_rate = sum(1 for r in results if r["hit"]) / len(results)
    return {"hit_rate": hit_rate, "results": results}

# Run with 20+ test queries
# Target: hit_rate > 0.85
```

### 8.3 Quality Checklist

- [ ] Average chunk length within target range
- [ ] No empty or near-empty chunks
- [ ] No PII detected after redaction
- [ ] Duplicate rate below threshold
- [ ] All chunks have complete metadata
- [ ] Embedding success rate > 99%
- [ ] Retrieval hit rate > 0.85 on test queries
- [ ] Query latency p95 < 200ms

---

## 9. Sign-Off Checklist

- [ ] All data sources collected and documented
- [ ] Legal compliance verified
- [ ] Text cleaned and normalized
- [ ] PII redacted
- [ ] Duplicates removed
- [ ] Chunking strategy applied and validated
- [ ] Embeddings generated for all chunks
- [ ] Vector index built and configured
- [ ] Quality metrics meet targets
- [ ] Retrieval test queries pass
- [ ] Monitoring and alerting configured
- [ ] Data refresh pipeline documented

## FAQ

### How do I handle documents in multiple languages?

Detect the language of each document during cleaning. Store the language in chunk metadata. Generate language-specific embeddings if using a multilingual embedding model. At query time, detect the user's query language and filter results by language. If using a single embedding model for all languages, ensure it supports multilingual embeddings (e.g., text-embedding-3-large supports 100+ languages).

### What chunk size should I use for my specific content?

Start with 512 tokens for general text, 256 for short-form content (tickets, FAQs), and 1024 for long-form technical documentation. Test retrieval quality with your actual queries at each chunk size. Smaller chunks give more precise retrieval but may lose context. Larger chunks preserve context but may dilute relevance. The optimal size depends on your query types — factual queries benefit from smaller chunks, analytical queries from larger ones.

### How do I handle tables and structured data in my corpus?

Keep tables as single chunks — do not split them. Convert tables to a text representation that the embedding model can process (e.g., "Column A: value1, Column B: value2"). Add a text summary of the table as metadata. For complex tables, consider generating a natural language description of the table contents and embedding that alongside the raw table data. Test whether users query table data directly or through natural language.

### How often should I rebuild my vector index?

Depends on how often your corpus changes. For static documentation, rebuild quarterly. For frequently updated content (support tickets, wiki pages), rebuild daily or use incremental updates. Most vector stores support incremental insertion without rebuilding the entire index. Track index freshness — if documents are added but not indexed, retrieval quality degrades. Set up monitoring for index size vs corpus size.

### What should I do if retrieval quality is poor after indexing?

First, check the data quality: are chunks too small or too large? Is the content clean? Are there duplicates confusing the retrieval? Second, check the embedding model — is it appropriate for your content type and language? Third, check the index parameters — is ef_search too low? Fourth, check the query — does it need reformulation? Try testing with exact-match queries first, then progressively more complex ones. If quality is still poor, consider a hybrid search approach (vector + keyword search).

## See Also

- [Complete Guide to LLM Prompt Engineering](/guides/complete-guide-llm-prompt-engineering/)
- [AI RAG Evaluation Checklist](/docs/ai-rag-evaluation-checklist/)
- [Complete Guide to RAG in Production](/guides/complete-guide-rag-production/)
- [Build a RAG Pipeline with LangChain and Vector Databases](/recipes/rag-pipeline/)
- [Implement Semantic Search with Embeddings](/recipes/semantic-search/)

