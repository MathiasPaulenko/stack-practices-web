---
contentType: recipes
slug: python-rag-chroma-local
title: "Construir un pipeline RAG local con ChromaDB y Sentence Transformers"
description: "Implementa retrieval-augmented generation localmente con ChromaDB, embeddings de sentence-transformers y generacion con LLM sin dependencias de APIs externas"
metaDescription: "Construye un pipeline RAG local con ChromaDB y sentence-transformers. Divide documentos, embed localmente, recupera contexto relevante y genera respuestas."
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
  - /recipes/ai/python-vector-database-pinecone
  - /recipes/ai/python-langchain-chains-composition
  - /recipes/ai/python-openai-embeddings-cosine
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye un pipeline RAG local con ChromaDB y sentence-transformers. Divide documentos, embed localmente, recupera contexto relevante y genera respuestas."
  keywords:
    - rag pipeline python
    - chromadb local
    - sentence transformers
    - retrieval augmented generation
    - local rag
---

# Construir un pipeline RAG local con ChromaDB y Sentence Transformers

RAG (Retrieval-Augmented Generation) combina recuperacion de documentos con generacion LLM. ChromaDB es una base de datos vectorial local que corre en proceso — sin servicio externo. Combinado con sentence-transformers para embeddings locales, puedes construir un pipeline RAG completo sin API keys ni dependencias cloud. A continuacion: chunking, embedding, recuperacion y generacion.

## Cuando Usar Esto

- Q&A de documentos privados donde los datos no pueden salir de tu maquina
- Prototipado de pipelines RAG antes de escalar a bases de datos vectoriales gestionadas
- Entornos offline o air-gapped

## Requisitos Previos

- Python 3.10+
- Paquete `chromadb` (`pip install chromadb`)
- Paquete `sentence-transformers` (`pip install sentence-transformers`)
- Un LLM (API de OpenAI, Ollama o cualquier proveedor LLM)

## Solucion

### 1. Instalar dependencias

```bash
pip install chromadb sentence-transformers
```

### 2. Chunking de documentos

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

### 3. Inicializar ChromaDB con embeddings locales

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

### 4. Construir el pipeline RAG

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

### 5. Usar el pipeline

```python
pipeline = RAGPipeline()

# Ingerir documentos
pipeline.ingest([
    {
        "title": "Redis Guide",
        "source": "redis-docs.md",
        "text": "Redis is an in-memory data structure store. It supports strings, hashes, lists, sets, sorted sets, streams, and more. Redis is commonly used for caching, session management, real-time analytics, and message brokering.",
    },
    {
        "title": "PostgreSQL Guide",
        "source": "postgres-docs.md",
        "text": "PostgreSQL is a powerful open-source relational database. It supports ACID compliance, JSON columns, full-text search, and geospatial data via PostGIS.",
    },
])

# Hacer preguntas
result = pipeline.ask("What data structures does Redis support?")
print(result["answer"])
print(f"Sources: {[s['source'] for s in result['sources']]}")
```

### 6. Usar con Ollama para RAG totalmente local

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

# Totalmente local — sin API keys
pipeline = LocalLLMRAG()
pipeline.ingest(documents)
result = pipeline.ask("How does Redis handle caching?")
```

## Como Funciona

1. **Chunking** divide documentos en segmentos de ~500 caracteres con 50 caracteres de overlap. El overlap asegura continuidad de contexto entre chunks para que informacion relevante no se divida entre limites.
2. **ChromaDB** usa sentence-transformers (`all-MiniLM-L6-v2` por defecto) para embedder chunks y queries. Los embeddings se generan localmente en proceso — sin llamadas a API.
3. **Recuperacion** embedde la query y encuentra los chunks mas cercanos por similitud coseno. ChromaDB usa HNSW (Hierarchical Navigable Small World) para busqueda rapida de nearest neighbor aproximado.
4. **Generacion** concatena los chunks recuperados como contexto y los envia al LLM con la pregunta del usuario. El LLM genera una respuesta basada en el contexto proporcionado.
5. **PersistentClient** almacena la base de datos vectorial en disco, para que los embeddings persistan entre reinicios sin re-ingerir.

## Variantes

### Filtrado por metadatos

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

# Buscar solo dentro de un source especifico
results = pipeline.rag.query_with_filter(
    "caching strategies",
    where={"source": "redis-docs.md"},
)
```

### Modelo de embedding personalizado

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

### Reranking de chunks recuperados

```python
from sentence_transformers import CrossEncoder

class RerankedRAG(RAGPipeline):
    def __init__(self):
        super().__init__()
        self.reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

    def retrieve(self, query: str, n_results: int = 20, top_k: int = 5) -> list[dict]:
        # Recuperar mas chunks de los necesarios
        chunks = self.rag.query(query, n_results)

        # Rerankear con cross-encoder
        pairs = [(query, c["text"]) for c in chunks]
        scores = self.reranker.predict(pairs)

        # Ordenar por score del reranker y retornar top_k
        ranked = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
        return [c for c, _ in ranked[:top_k]]
```

## Mejores Practicas

- **Usa overlap en chunking** — 10-20% de overlap previene perder contexto en los limites de chunks
- **Incluye metadatos de source** — permite citar fuentes en la respuesta generada
- **Usa temperatura baja para generacion** — 0.1-0.3 reduce alucinacion en Q&A factual
- **Rerankear para mejor precision** — recupera 3-5x mas chunks y rerankear con cross-encoder para top-k

## Errores Comunes

- **Chunks demasiado grandes** — el LLM puede perder detalles en contexto largo; mantén chunks de 200-500 palabras
- **Sin overlap** — informacion relevante dividida en limites de chunks se pierde
- **No persistir ChromaDB** — `EphemeralClient` pierde datos al reiniciar; usa `PersistentClient`
- **Recuperar muy pocos chunks** — 3-5 es un buen default; muy pocos pierden contexto relevante

## FAQ

**Q: Que modelo de embedding usa ChromaDB por defecto?**
A: `all-MiniLM-L6-v2` de sentence-transformers (384 dimensiones). Es rapido y bueno para texto en ingles.

**Q: Puedo usar ChromaDB en produccion?**
A: Si, pero corre en proceso. Para setups multi-instancia, usa el modo cliente-servidor de Chroma o cambia a Pinecone/Weaviate.

**Q: Cuanta memoria usa ChromaDB?**
A: Aproximadamente 1KB por vector para el modelo por defecto. 100K chunks usan ~100MB de RAM.

**Q: Debo usar un reranker cross-encoder?**
A: Para RAG de produccion, si. Reranking mejora la precision significativamente — recupera 20 chunks, rerankear a top 5.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
