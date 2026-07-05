---
contentType: guides
slug: complete-guide-rag-production
title: "Guía Completa de RAG en Producción"
description: "Construir sistemas RAG en produccion. Cubre estrategias de chunking, modelos de embedding, vector stores, optimizacion de retrieval, reranking, hybrid search, evaluacion y patrones de deployment para retrieval-augmented generation confiable."
metaDescription: "Construir RAG en produccion. Cubre chunking, embeddings, vector stores, retrieval, reranking, hybrid search, evaluacion y deployment."
difficulty: advanced
topics:
  - ai
  - architecture
  - databases
tags:
  - rag
  - ai
  - guia
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
  metaDescription: "Construir RAG en produccion. Cubre chunking, embeddings, vector stores, retrieval, reranking, hybrid search, evaluacion y deployment."
  keywords:
    - rag produccion
    - rag arquitectura
    - chunking strategies
    - embedding models
    - vector stores
    - retrieval optimization
    - reranking
    - hybrid search
---

## Introducción

Retrieval-Augmented Generation (RAG) combina un LLM con conocimiento externo. En lugar de depender de los training data del modelo, retrieves documentos relevantes de una knowledge base y los inyectas en el prompt. Esto reduce hallucinations, permite citar sources, y permite actualizar conocimiento sin retraining. Construir RAG en produccion requiere atencion cuidadosa a chunking, embeddings, retrieval quality, reranking, y evaluacion. Esta guia cubre el pipeline completo de RAG con patrones de produccion.

## Resumen del Pipeline RAG

```text
Document → Chunking → Embedding → Vector Store

Query → Embedding → Vector Search → Reranking → Context Assembly → LLM → Response + Sources

Steps:
1. Ingest: Cargar documentos, split en chunks, embed, store
2. Retrieve: Embed query, search vector store, rerank results
3. Generate: Assemble context + query, llamar LLM, retornar response con citations
```

## Estrategias de Chunking

### Chunking Fixed-Size con Overlap

```python
from typing import List

def fixed_size_chunks(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap  # Overlap para context continuity
    
    return chunks

text = "This is a long document..." * 100
chunks = fixed_size_chunks(text, chunk_size=512, overlap=50)
print(f"Created {len(chunks)} chunks")
```

### Chunking Basado en Sentences

```python
import re
from typing import List

def sentence_chunks(text: str, max_chunk_size: int = 512) -> List[str]:
    # Split en sentences
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
    # Split en sentences
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    if len(sentences) <= 1:
        return [text]
    
    # Embed cada sentence
    embeddings = model.encode(sentences)
    
    # Calcular cosine similarity entre sentences consecutivos
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
    # Split por headers primero
    sections = re.split(r'(\n#{1,6}\s+.+)', text)
    
    chunks = []
    current_section = ""
    current_header = ""
    
    for part in sections:
        if re.match(r'\n#{1,6}\s+', part):
            if current_section.strip():
                header_context = current_header + "\n" if current_header else ""
                section_text = header_context + current_section.strip()
                
                # Split adicional si es muy grande
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

## Modelos de Embedding

### Elegir un Embedding Model

```python
from sentence_transformers import SentenceTransformer
from openai import OpenAI

# Opcion 1: Modelo local (gratis, corre en CPU/GPU)
local_model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = local_model.encode(["text1", "text2"])

# Opcion 2: OpenAI embeddings (API-based, mayor calidad)
client = OpenAI()
response = client.embeddings.create(
    model="text-embedding-3-small",  # or text-embedding-3-large
    input=["text1", "text2"]
)
embeddings = [d.embedding for d in response.data]

# Opcion 2b: OpenAI large (3072 dimensions, mayor calidad)
response = client.embeddings.create(
    model="text-embedding-3-large",
    input=["text1", "text2"],
    dimensions=1536  # Puede reducir dimensions para storage savings
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

# Embed todos los chunks
chunks = ["chunk1 text", "chunk2 text", "chunk3 text"]
embeddings = await batch_embed(chunks)
```

## Vector Stores

### Chroma (Desarrollo Local)

```python
import chromadb

client = chromadb.PersistentClient(path="./vector_db")

collection = client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"}
)

# Agregar documents
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

### Pinecone (Producción)

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# Crear index
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

# Crear table con vector column
with conn.cursor() as cur:
    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            content TEXT,
            embedding VECTOR(1536),
            metadata JSONB
        )
    """)
    
    # Crear HNSW index para fast similarity search
    cur.execute("""
        CREATE INDEX IF NOT EXISTS documents_embedding_idx 
        ON documents USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
    
    conn.commit()

# Insertar documents
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

## Optimizacion de Retrieval

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
        
        # Keyword search (BM25 o similar)
        keyword_results = self.keyword_index.search(query, top_k=top_k * 2)
        
        # Normalizar scores a [0, 1]
        vector_scores = self._normalize_scores([
            1 - r for r in vector_results["distances"][0]
        ])
        keyword_scores = self._normalize_scores([
            r["score"] for r in keyword_results
        ])
        
        # Combinar scores
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
        
        # Sort por combined score
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

# Cargar un cross-encoder model (mas preciso que bi-encoder para reranking)
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank_results(query: str, documents: List[str], top_k: int = 5) -> List[dict]:
    # Score cada (query, document) pair
    pairs = [(query, doc) for doc in documents]
    scores = reranker.predict(pairs)
    
    # Sort por score
    ranked = sorted(
        zip(documents, scores),
        key=lambda x: x[1],
        reverse=True
    )
    
    return [
        {"text": doc, "score": float(score)}
        for doc, score in ranked[:top_k]
    ]

# Uso en RAG pipeline
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
        # Estimar tokens (rough: 1 token ≈ 4 chars)
        doc_tokens = len(doc["text"]) // 4
        
        if current_tokens + doc_tokens > max_context_tokens:
            # Truncar para fit
            remaining = max_context_tokens - current_tokens
            if remaining > 100:  # Solo agregar si es meaningful
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

# Construir el final prompt
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

## Pipeline RAG Completo

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
        
        # 2. Vector search (retrieve mas de lo necesario para reranking)
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
            temperature=0.3  # Low temperature para factual answers
        )
        
        return {
            "answer": response.choices[0].message.content,
            "sources": sources,
            "retrieved_count": len(ranked)
        }

# Uso
rag = RAGPipeline(collection, embedder, reranker, client)
result = await rag.answer("How do I configure authentication?")
print(f"Answer: {result['answer']}")
print(f"Sources: {result['sources']}")
```

## Evaluación

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
    # Usando LLM-as-judge para evaluacion
    # En produccion, usar la ragas library: https://github.com/explodinggradients/ragas
    
    # Faithfulness: Checkear si answer esta supported por context
    faithfulness_prompt = f"""
    Context: {contexts}
    Answer: {answer}
    
    Is the answer fully supported by the context? Rate 0-1.
    """
    
    # Answer relevancy: Checkear si answer addresses la question
    relevancy_prompt = f"""
    Question: {query}
    Answer: {answer}
    
    Does the answer directly address the question? Rate 0-1.
    """
    
    # En practica, usar ragas library
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

## Preguntas Frecuentes

### ¿Qué chunk size debería usar?

Empieza con 512 tokens con 50-100 token overlap. Para documentacion tecnica, usa chunks mas chicos (256-384) para mantener informacion precisa. Para narratives o long-form content, usa chunks mas grandes (768-1024). Siempre evalua retrieval quality con diferentes chunk sizes en tus datos especificos.

### ¿Debería usar semantic chunking o fixed-size chunking?

Semantic chunking produce mejores chunks porque respeta sentence y paragraph boundaries. Fixed-size chunking es mas rapido y simple. Usa semantic chunking para aplicaciones quality-critical. Usa fixed-size para prototyping inicial o cuando processing speed importa mas que retrieval precision.

### ¿Cuál es la diferencia entre bi-encoders y cross-encoders?

Bi-encoders embeden el query y document separadamente, luego computan similarity. Son rapidos y escalables (embed documents offline, query en runtime). Cross-encoders procesan query y document juntos, produciendo un relevance score. Son mas precisos pero mas lentos. Usa bi-encoders para initial retrieval, cross-encoders para reranking.

### ¿Cómo manejo conversaciones multi-turn en RAG?

Mantén conversation history. Para cada nuevo user message, determina si se necesita new retrieval (la question referencia previous context) o si el context existente es suficiente. Reescribe el user query para incluir conversation context antes de retrieval. Por ejemplo, "What about Python?" se convierte en "What about Python authentication?" usando previous turns.

### ¿Cómo evalúo mi sistema RAG?

Usa el framework RAGAS con cuatro metrics: faithfulness (answer grounded en context), answer relevancy (addresses la question), context precision (retrieved docs son relevant), context recall (toda la info needed fue retrieved). Construye un test set de questions con known ground truth answers. Corre evaluations en cada cambio de prompt o model.

### ¿Debería usar una managed vector database o self-host?

Usa managed (Pinecone, Weaviate Cloud) para produccion cuando necesitas escalabilidad, uptime, y no operational overhead. Usa self-hosted (pgvector, Chroma, local Weaviate) para desarrollo, datasets chicos (<100K vectors), o cuando data sovereignty requiere on-premise storage. pgvector es un buen middle ground si ya usas PostgreSQL.
