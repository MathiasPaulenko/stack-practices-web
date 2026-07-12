---


contentType: docs
slug: ai-data-preparation-checklist
templateType: post-deployment-checklist
title: "Checklist de Preparacion de Datos para AI"
description: "Checklist para preparar datos para LLM y RAG systems: data collection, cleaning, chunking, embedding, deduplication, PII removal, format validation, quality scoring e indexing con metricas y thresholds."
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

Este checklist cubre data preparation para LLM y RAG systems. Corre a traves de every section antes de indexar data en tu vector store o fine-tuning pipeline. Poor data quality es el most common cause de RAG failures.

---

## 1. Data Collection

### 1.1 Source Inventory

- [ ] All data sources identificados y documentados
- [ ] Source format documentado (PDF, HTML, Markdown, JSON, CSV, database)
- [ ] Source access verificado (API keys, database credentials, file permissions)
- [ ] Source refresh cadence definido (real-time, hourly, daily, weekly)
- [ ] Source ownership documentado (quien mantiene cada source)

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

### 1.2 Legal y Compliance

- [ ] Data usage rights verificados (podes usar esta data en un AI system?)
- [ ] License terms reviewados para cada source
- [ ] Personal data identificado y documentado
- [ ] Consent status checkeado para user-generated content
- [ ] Data retention policy applied
- [ ] GDPR/CCPA compliance verificado para personal data

---

## 2. Data Cleaning

### 2.1 Text Quality

```python
import re
from typing import List

def clean_text(text: str) -> str:
    # Removee HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Removee excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Removee non-printable characters
    text = re.sub(r'[^\x20-\x7E\n\r\t]', '', text)
    
    # Fix encoding issues
    text = text.encode('utf-8', errors='ignore').decode('utf-8')
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text

def remove_boilerplate(text: str, min_length: int = 100) -> str:
    # Removee navigation menus, footers, headers
    lines = text.split('\n')
    meaningful = [l for l in lines if len(l.strip()) > min_length]
    return '\n'.join(meaningful)
```

### 2.2 Cleaning Checklist

- [ ] HTML tags removed de web-scraped content
- [ ] Markdown formatting normalized
- [ ] Encoding issues fixed (UTF-8 throughout)
- [ ] Excessive whitespace collapsed
- [ ] Boilerplate removed (navigation, footers, cookie notices)
- [ ] Empty o near-empty documents removed (< 50 characters)
- [ ] Duplicate documents identificados y handled
- [ ] Corrupted files identificados y removed
- [ ] Non-text content (images, videos) extracted o referenced separately

---

## 3. PII y Sensitive Data Removal

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

- [ ] Email addresses redacted o removed
- [ ] Phone numbers redacted
- [ ] Social security numbers redacted
- [ ] Credit card numbers redacted
- [ ] IP addresses redacted (si sensitive)
- [ ] Home addresses redacted
- [ ] Names de customers/users evaluated (puede necesitar keep para context)
- [ ] API keys y secrets removed
- [ ] Internal URLs y hostnames evaluated

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
- [ ] Near-duplicates identificados (cosine similarity > 0.95)
- [ ] Near-duplicates reviewados — keepa el most complete version
- [ ] Cross-source duplicates identificados (same content de different sources)
- [ ] Version conflicts resolved (keepa latest version de updated documents)

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

- [ ] Chunk size appropriate para content type
- [ ] Chunk overlap preservea context across boundaries
- [ ] Document structure respected (no chunks crossing section boundaries)
- [ ] Tables kept intact (no split across chunks)
- [ ] Code blocks kept intact
- [ ] Metadata attached a cada chunk (source, page, section, title)
- [ ] Chunk length distribution checkeado (no extreme outliers)

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

- [ ] Embedding model selected basado en quality y cost requirements
- [ ] All chunks embedded con el same model
- [ ] Embedding dimensions consistent across all chunks
- [ ] Batch size optimized para throughput sin hittear rate limits
- [ ] Failed embeddings retried
- [ ] Embedding cost tracked y dentro de budget
- [ ] Embeddings stored en vector database con metadata

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

# HNSW parameters (para self-hosted)
HNSW_CONFIG = {
    "m": 16,              # Max connections per node
    "ef_construction": 200,  # Build-time search width
    "ef_search": 50,      # Query-time search width
}
```

### 7.3 Index Checklist

- [ ] Vector store selected basado en scale y latency requirements
- [ ] Index type appropriate para corpus size
- [ ] Distance metric selected (cosine para normalized embeddings)
- [ ] Index parameters tuned para recall vs latency tradeoff
- [ ] Metadata filters configured (source, date, category)
- [ ] Index built y verificado con test queries
- [ ] Query latency measured (p95 < 200ms target)

---

## 8. Quality Validation

### 8.1 Data Quality Metrics

```text
Metric                  | Target  | Measurement
────────────────────────┼─────────┼──────────────────────
Average chunk length    | 400-800 | tokens per chunk
Chunk length variance   | Low     | No chunks < 50 o > 2000 tokens
Duplicate chunk rate    | < 2%    | % de near-duplicate chunks
PII detection rate      | 0%      | Despues de redaction
Empty chunk rate        | 0%      | No empty chunks indexed
Metadata completeness   | 100%    | Every chunk tiene source + title
Embedding success rate  | > 99%   | % de chunks successfully embedded
```

### 8.2 Retrieval Quality Test

```python
def test_retrieval_quality(test_queries: list, vector_store, expected_sources: dict):
    results = []
    for query in test_queries:
        retrieved = vector_store.search(query, top_k=5)
        retrieved_sources = [r["metadata"]["source"] for r in retrieved]
        expected = expected_sources.get(query, [])
        
        # Checkea si expected source esta en top-k
        hit = any(src in retrieved_sources for src in expected)
        
        results.append({
            "query": query,
            "hit": hit,
            "retrieved_sources": retrieved_sources,
            "expected_sources": expected,
        })
    
    hit_rate = sum(1 for r in results if r["hit"]) / len(results)
    return {"hit_rate": hit_rate, "results": results}

# Corre con 20+ test queries
# Target: hit_rate > 0.85
```

### 8.3 Quality Checklist

- [ ] Average chunk length dentro de target range
- [ ] No empty o near-empty chunks
- [ ] No PII detectado despues de redaction
- [ ] Duplicate rate below threshold
- [ ] All chunks tienen complete metadata
- [ ] Embedding success rate > 99%
- [ ] Retrieval hit rate > 0.85 en test queries
- [ ] Query latency p95 < 200ms

---

## 9. Sign-Off Checklist

- [ ] All data sources collected y documentados
- [ ] Legal compliance verificado
- [ ] Text cleaned y normalized
- [ ] PII redacted
- [ ] Duplicates removed
- [ ] Chunking strategy applied y validated
- [ ] Embeddings generated para all chunks
- [ ] Vector index built y configured
- [ ] Quality metrics meetean targets
- [ ] Retrieval test queries pasan
- [ ] Monitoring y alerting configured
- [ ] Data refresh pipeline documentado

## Preguntas Frecuentes

### ¿Cómo handleo documents en multiple languages?

Detecta el language de cada document durante cleaning. Storea el language en chunk metadata. Genera language-specific embeddings si usas un multilingual embedding model. En query time, detecta el user's query language y filtra results por language. Si usas un single embedding model para all languages, asegura que supportea multilingual embeddings (e.g., text-embedding-3-large supportea 100+ languages).

### ¿Qué chunk size deberia usar para mi specific content?

Empeza con 512 tokens para general text, 256 para short-form content (tickets, FAQs), y 1024 para long-form technical documentation. Testea retrieval quality con tus actual queries en cada chunk size. Smaller chunks dan mas precise retrieval pero pueden lose context. Larger chunks preservean context pero pueden dilute relevance. El optimal size depende de tus query types — factual queries benefician de smaller chunks, analytical queries de larger ones.

### ¿Cómo handleo tables y structured data en mi corpus?

Keepa tables como single chunks — no los spliteas. Converte tables a un text representation que el embedding model pueda processar (e.g., "Column A: value1, Column B: value2"). Addea un text summary del table como metadata. Para complex tables, considera generar un natural language description del table contents y embeddear eso alongside el raw table data. Testea si users queryean table data directamente o a traves de natural language.

### ¿Con qué frecuencia deberia rebuild mi vector index?

Depende de cuan often tu corpus cambia. Para static documentation, rebuilda quarterly. Para frequently updated content (support tickets, wiki pages), rebuilda daily o usa incremental updates. Most vector stores supportean incremental insertion sin rebuildear el entire index. Trackea index freshness — si documents son added pero no indexed, retrieval quality degrada. Setea monitoring para index size vs corpus size.

### ¿Qué hago si retrieval quality es poor despues de indexing?

Primero, checkea el data quality: son chunks too small o too large? Es el content clean? Hay duplicates confusing el retrieval? Segundo, checkea el embedding model — es appropriate para tu content type y language? Tercero, checkea el index parameters — es ef_search too low? Cuarto, checkea el query — necesita reformulation? Try testear con exact-match queries primero, luego progressively mas complex ones. Si quality es still poor, considera un hybrid search approach (vector + keyword search).

## See Also

- [Complete Guide to LLM Prompt Engineering](/es/guides/complete-guide-llm-prompt-engineering/)
- [AI RAG Evaluation Checklist](/es/docs/ai-rag-evaluation-checklist/)
- [Complete Guide to RAG in Production](/es/guides/complete-guide-rag-production/)
- [Build a RAG Pipeline with LangChain and Vector Databases](/es/recipes/rag-pipeline/)
- [Implement Semantic Search with Embeddings](/es/recipes/semantic-search/)

