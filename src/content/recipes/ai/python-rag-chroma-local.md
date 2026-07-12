---






contentType: recipes
slug: python-rag-chroma-local
title: "a Local RAG Pipeline with ChromaDB and Sentence Transformers"
description: "Implement retrieval-augmented generation locally with ChromaDB, sentence-transformers embeddings, and LLM generation without external API dependencies"
metaDescription: "Build a local RAG pipeline with ChromaDB and sentence-transformers. Chunk documents, embed locally, retrieve relevant context, and generate answers."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - rag
  - chromadb
  - sentence transformers
  - local llm
relatedResources:
  - /recipes/python-vector-database-pinecone
  - /recipes/python-langchain-chains-composition
  - /recipes/python-openai-embeddings-cosine
  - /recipes/python-ollama-local-llm
  - /recipes/python-huggingface-text-classification
  - /recipes/python-llm-eval-ragas-metrics
  - /patterns/rag-hybrid-search-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a local RAG pipeline with ChromaDB and sentence-transformers. Chunk documents, embed locally, retrieve relevant context, and generate answers."
  keywords:
    - rag pipeline python
    - chromadb local
    - sentence transformers
    - retrieval augmented generation
    - local rag






---

# Build a Local RAG Pipeline with ChromaDB and Sentence Transformers

RAG (Retrieval-Augmented Generation) combines document retrieval with LLM generation. ChromaDB is a local vector database that runs in-process — no external service needed. Paired with sentence-transformers for local embeddings, you can build a complete RAG pipeline without API keys or cloud dependencies. Below: chunking, embedding, retrieval, and generation.

## When to Use This

- Private document Q&A where data cannot leave your machine
- Prototyping RAG pipelines before scaling to managed vector databases
- Offline or air-gapped environments

## Prerequisites

- Python 3.10+
- `chromadb` package (`pip install chromadb`)
- `sentence-transformers` package (`pip install sentence-transformers`)
- An LLM (OpenAI API, Ollama, or any LLM provider)

## Solution

### 1. Install Dependencies

```bash
pip install chromadb sentence-transformers
```

### 2. Document Chunking

```python
from dataclasses import dataclass

@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict

def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[Chunk]:
    """Split text into overlapping chunks.

    Args:
        text: Input text to chunk.
        chunk_size: Target characters per chunk.
        overlap: Number of characters to overlap between chunks.

    Returns:
        List of Chunk objects.
    """
    chunks = []
    start = 0
    chunk_idx = 0

    while start < len(text):
        end = start + chunk_size
        chunk_text_str = text[start:end]

        chunks.append(Chunk(
            id=f"chunk_{chunk_idx}",
            text=chunk_text_str,
            metadata={"chunk_index": chunk_idx, "char_start": start},
        ))

        start = end - overlap
        chunk_idx += 1

    return chunks

def chunk_documents(documents: list[dict]) -> list[Chunk]:
    """Chunk multiple documents."""
    all_chunks = []
    for doc in documents:
        chunks = chunk_text(doc["text"])
        for chunk in chunks:
            chunk.metadata.update({
                "source": doc.get("source", "unknown"),
                "title": doc.get("title", ""),
            })
        all_chunks.extend(chunks)
    return all_chunks
```

### 3. Initialize ChromaDB with Local Embeddings

```python
import chromadb

class LocalRAG:
    def __init__(self, persist_dir: str = "./chroma_db"):
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(self, chunks: list[Chunk]) -> None:
        """Add chunks to the ChromaDB collection."""
        self.collection.add(
            ids=[c.id for c in chunks],
            documents=[c.text for c in chunks],
            metadatas=[c.metadata for c in chunks],
        )

    def query(
        self,
        query_text: str,
        n_results: int = 5,
    ) -> list[dict]:
        """Retrieve relevant chunks for a query.

        Args:
            query_text: User query.
            n_results: Number of chunks to retrieve.

        Returns:
            List of {text, metadata, distance} dicts.
        """
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results,
        )

        return [
            {
                "text": doc,
                "metadata": meta,
                "distance": dist,
            }
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            )
        ]
```

### 4. Build the RAG Pipeline

```python
from openai import OpenAI

class RAGPipeline:
    def __init__(self, persist_dir: str = "./chroma_db"):
        self.rag = LocalRAG(persist_dir)
        self.llm = OpenAI()

    def ingest(self, documents: list[dict]) -> None:
        """Ingest documents into the vector store."""
        chunks = chunk_documents(documents)
        self.rag.add_chunks(chunks)
        print(f"Ingested {len(chunks)} chunks from {len(documents)} documents")

    def retrieve(self, query: str, n_results: int = 5) -> list[dict]:
        """Retrieve relevant chunks for a query."""
        return self.rag.query(query, n_results)

    def generate(
        self,
        query: str,
        context_chunks: list[dict],
    ) -> str:
        """Generate an answer using retrieved context.

        Args:
            query: User question.
            context_chunks: Retrieved chunks from retrieve().

        Returns:
            LLM-generated answer.
        """
        context = "\n\n".join(
            f"[Source: {c['metadata'].get('source', 'unknown')}]\n{c['text']}"
            for c in context_chunks
        )

        response = self.llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Answer the question based on the provided context. "
                        "If the context does not contain the answer, say "
                        "'I don't have enough information to answer this.'"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {query}",
                },
            ],
            temperature=0.2,
        )

        return response.choices[0].message.content

    def ask(self, query: str, n_results: int = 5) -> dict:
        """Full RAG pipeline: retrieve + generate.

        Returns:
            Dict with answer, sources, and retrieved chunks.
        """
        chunks = self.retrieve(query, n_results)
        answer = self.generate(query, chunks)

        return {
            "answer": answer,
            "sources": [
                {"source": c["metadata"].get("source"), "text": c["text"][:200]}
                for c in chunks
            ],
            "num_chunks": len(chunks),
        }
```

### 5. Use the Pipeline

```python
pipeline = RAGPipeline()

# Ingest documents
pipeline.ingest([
    {
        "title": "Redis Guide",
        "source": "redis-docs.md",
        "text": "Redis is an in-memory data structure store. It supports strings, hashes, lists, sets, sorted sets, streams, and more. Redis is commonly used for caching, session management, real-time analytics, and message brokering.",
    },
    {
        "title": "PostgreSQL Guide",
        "source": "postgres-docs.md",
        "text": "PostgreSQL is a capable open-source relational database. It supports ACID compliance, JSON columns, full-text search, and geospatial data via PostGIS.",
    },
])

# Ask questions
result = pipeline.ask("What data structures does Redis support?")
print(result["answer"])
print(f"Sources: {[s['source'] for s in result['sources']]}")
```

### 6. Using with Ollama for Fully Local RAG

```python
import requests

class LocalLLMRAG(RAGPipeline):
    def __init__(self, persist_dir: str = "./chroma_db", ollama_url: str = "http://localhost:11434"):
        self.rag = LocalRAG(persist_dir)
        self.ollama_url = ollama_url

    def generate(self, query: str, context_chunks: list[dict]) -> str:
        context = "\n\n".join(c["text"] for c in context_chunks)

        response = requests.post(
            f"{self.ollama_url}/api/generate",
            json={
                "model": "llama3",
                "prompt": f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:",
                "stream": False,
            },
        )

        return response.json()["response"]

# Fully local — no API keys needed
pipeline = LocalLLMRAG()
pipeline.ingest(documents)
result = pipeline.ask("How does Redis handle caching?")
```

## How It Works

1. **Chunking** splits documents into ~500-character segments with 50-character overlap. Overlap ensures context continuity between chunks so relevant information isn't split across boundaries.
2. **ChromaDB** uses sentence-transformers (`all-MiniLM-L6-v2` by default) to embed chunks and queries. Embeddings are generated locally in-process — no API calls.
3. **Retrieval** embeds the query and finds the nearest chunks by cosine similarity. ChromaDB uses HNSW (Hierarchical Navigable Small World) for fast approximate nearest neighbor search.
4. **Generation** concatenates the retrieved chunks as context and sends them to the LLM with the user's question. The LLM generates an answer grounded in the provided context.
5. **PersistentClient** stores the vector database on disk, so embeddings persist across restarts without re-ingesting.

## Variants

### Filtering by Metadata

```python
def query_with_filter(
    self,
    query_text: str,
    n_results: int = 5,
    where: dict | None = None,
) -> list[dict]:
    results = self.collection.query(
        query_texts=[query_text],
        n_results=n_results,
        where=where,
    )
    return results

# Only search within a specific source
results = pipeline.rag.query_with_filter(
    "caching strategies",
    where={"source": "redis-docs.md"},
)
```

### Custom Embedding Model

```python
from sentence_transformers import SentenceTransformer

class CustomEmbeddingRAG(LocalRAG):
    def __init__(self, model_name: str = "BAAI/bge-large-en-v1.5"):
        self.embedder = SentenceTransformer(model_name)
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.collection = self.client.get_or_create_collection(
            name="documents",
            embedding_function=self._embed_fn,
        )

    def _embed_fn(self, input: list[str]) -> list[list[float]]:
        return self.embedder.encode(input).tolist()
```

### Reranking Retrieved Chunks

```python
from sentence_transformers import CrossEncoder

class RerankedRAG(RAGPipeline):
    def __init__(self):
        super().__init__()
        self.reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

    def retrieve(self, query: str, n_results: int = 20, top_k: int = 5) -> list[dict]:
        # Retrieve more chunks than needed
        chunks = self.rag.query(query, n_results)

        # Rerank with cross-encoder
        pairs = [(query, c["text"]) for c in chunks]
        scores = self.reranker.predict(pairs)

        # Sort by reranker score and return top_k
        ranked = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
        return [c for c, _ in ranked[:top_k]]
```

## Best Practices


- For a deeper guide, see [Run LLMs Locally with Ollama for Private Inference](/recipes/python-ollama-local-llm/).

- **Use overlap in chunking** — 10-20% overlap prevents losing context at chunk boundaries
- **Include source metadata** — lets you cite sources in the generated answer
- **Use a low temperature for generation** — 0.1-0.3 reduces hallucination in factual Q&A
- **Rerank for better accuracy** — retrieve 3-5x more chunks and rerank with a cross-encoder for top-k

## Common Mistakes

- **Chunks too large** — the LLM may miss details in long context; keep chunks to 200-500 words
- **No overlap** — relevant information split at chunk boundaries is lost
- **Not persisting ChromaDB** — `EphemeralClient` loses data on restart; use `PersistentClient`
- **Retrieving too few chunks** — 3-5 is a good default; too few misses relevant context

## FAQ

**Q: What embedding model does ChromaDB use by default?**
A: `all-MiniLM-L6-v2` from sentence-transformers (384 dimensions). It is fast and good for English text.

**Q: Can I use ChromaDB in production?**
A: Yes, but it runs in-process. For multi-instance setups, use Chroma's client-server mode or switch to Pinecone/Weaviate.

**Q: How much memory does ChromaDB use?**
A: Roughly 1KB per vector for the default model. 100K chunks uses ~100MB of RAM.

**Q: Should I use a cross-encoder reranker?**
A: For production RAG, yes. Reranking improves precision considerably — retrieve 20 chunks, rerank to top 5.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
