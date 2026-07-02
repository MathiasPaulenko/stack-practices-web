---
contentType: recipes
slug: python-openai-embeddings-cosine
title: "Compara similitud semantica de texto con embeddings de OpenAI y coseno"
description: "Genera embeddings de texto con OpenAI y calcula similitud coseno para medir similitud semantica entre textos para busqueda, deduplicacion y clustering"
metaDescription: "Compara similitud semantica con embeddings de OpenAI y coseno. Genera vectores, calcula distancias y construye un indice de busqueda por similitud."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - openai
  - embeddings
  - cosine similarity
  - semantic search
relatedResources:
  - /recipes/ai/python-vector-database-pinecone
  - /recipes/ai/python-rag-chroma-local
  - /recipes/ai/python-langchain-chains-composition
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Compara similitud semantica con embeddings de OpenAI y coseno. Genera vectores, calcula distancias y construye un indice de busqueda por similitud."
  keywords:
    - openai embeddings
    - cosine similarity
    - semantic similarity
    - text embeddings python
    - embedding comparison
---

# Compara similitud semantica de texto con embeddings de OpenAI y coseno

Los embeddings de texto capturan significado semantico como vectores de alta dimension. La similitud coseno mide el angulo entre dos vectores, indicando que tan semanticamente similares son los textos. Esta receta cubre generar embeddings con OpenAI, calcular similitud coseno y construir un indice simple de busqueda por similitud.

## Cuando Usar Esto

- Busqueda semantica sobre un corpus de documentos
- Desduplicacion de contenido semanticamente similar
- Clustering de textos por significado
- Sistemas de recomendacion basados en similitud de contenido

## Requisitos Previos

- Python 3.10+
- Paquete `openai` (`pip install openai`)
- Paquete `numpy` (`pip install numpy`)
- Una API key de OpenAI

## Solucion

### 1. Instalar dependencias

```bash
pip install openai numpy
```

### 2. Generar embeddings

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

def get_embedding(text: str, model: str = "text-embedding-3-small") -> list[float]:
    """Generate an embedding for a single text.

    Args:
        text: Input text.
        model: OpenAI embedding model.

    Returns:
        Embedding vector as a list of floats.
    """
    response = client.embeddings.create(model=model, input=text)
    return response.data[0].embedding

def get_embeddings_batch(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    """Generate embeddings for multiple texts in one API call.

    Args:
        texts: List of input texts.
        model: OpenAI embedding model.

    Returns:
        List of embedding vectors.
    """
    response = client.embeddings.create(model=model, input=texts)
    return [item.embedding for item in response.data]
```

### 3. Calcular similitud coseno

```python
def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors.

    Args:
        vec_a: First vector.
        vec_b: Second vector.

    Returns:
        Similarity score between -1 and 1 (1 = identical).
    """
    a = np.array(vec_a)
    b = np.array(vec_b)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))

def cosine_similarity_matrix(vectors: list[list[float]]) -> np.ndarray:
    """Compute pairwise cosine similarity for a list of vectors.

    Args:
        vectors: List of embedding vectors.

    Returns:
        NxN similarity matrix.
    """
    matrix = np.array(vectors)
    normalized = matrix / np.linalg.norm(matrix, axis=1, keepdims=True)
    return normalized @ normalized.T
```

### 4. Comparar dos textos

```python
text_a = "Redis is an in-memory data structure store used for caching."
text_b = "Redis works as a fast cache by keeping data in memory."
text_c = "PostgreSQL is a relational database with ACID compliance."

emb_a = get_embedding(text_a)
emb_b = get_embedding(text_b)
emb_c = get_embedding(text_c)

sim_ab = cosine_similarity(emb_a, emb_b)
sim_ac = cosine_similarity(emb_a, emb_c)

print(f"Similarity (a, b): {sim_ab:.4f}")  # Alta — mismo tema
print(f"Similarity (a, c): {sim_ac:.4f}")  # Mas baja — temas diferentes
```

### 5. Construir un indice de busqueda por similitud

```python
from dataclasses import dataclass

@dataclass
class Document:
    id: str
    text: str
    embedding: list[float]

class SimilaritySearchIndex:
    def __init__(self):
        self.documents: list[Document] = []

    def add(self, doc_id: str, text: str) -> None:
        """Add a document to the index."""
        embedding = get_embedding(text)
        self.documents.append(Document(id=doc_id, text=text, embedding=embedding))

    def add_batch(self, items: list[tuple[str, str]]) -> None:
        """Add multiple documents efficiently with batch embedding."""
        texts = [text for _, text in items]
        embeddings = get_embeddings_batch(texts)
        for (doc_id, text), emb in zip(items, embeddings):
            self.documents.append(Document(id=doc_id, text=text, embedding=emb))

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """Search for the most similar documents.

        Args:
            query: Query text.
            top_k: Number of results to return.

        Returns:
            List of {id, text, score} dicts sorted by similarity.
        """
        query_emb = get_embedding(query)
        scores = [
            (doc.id, doc.text, cosine_similarity(query_emb, doc.embedding))
            for doc in self.documents
        ]
        scores.sort(key=lambda x: x[2], reverse=True)
        return [
            {"id": doc_id, "text": text, "score": score}
            for doc_id, text, score in scores[:top_k]
        ]

# Uso
index = SimilaritySearchIndex()
index.add_batch([
    ("doc1", "Redis is an in-memory data structure store for caching."),
    ("doc2", "PostgreSQL is a powerful open-source relational database."),
    ("doc3", "Docker containers package applications with dependencies."),
    ("doc4", "Memcached is a distributed memory caching system."),
    ("doc5", "Kubernetes orchestrates containerized applications."),
])

results = index.search("caching solution for fast lookups", top_k=3)
for r in results:
    print(f"Score: {r['score']:.4f} | {r['text'][:60]}")
```

### 6. Matriz de similitud pairwise

```python
def print_similarity_matrix(texts: list[str]) -> None:
    """Print a pairwise similarity matrix for a list of texts."""
    embeddings = get_embeddings_batch(texts)
    matrix = cosine_similarity_matrix(embeddings)

    print(" " * 20, end="")
    for i in range(len(texts)):
        print(f"  doc{i}", end="")
    print()

    for i, row in enumerate(matrix):
        print(f"doc{i:15s}", end="")
        for val in row:
            print(f" {val:.2f}", end="")
        print()

texts = [
    "Redis caching strategies",
    "In-memory cache with Redis",
    "PostgreSQL database indexing",
    "Docker container deployment",
]
print_similarity_matrix(texts)
```

## Como Funciona

1. **Embeddings** convierten texto en un vector de alta dimension (1536 dimensiones para `text-embedding-3-small`) donde textos semanticamente similares estan cercanos en el espacio vectorial.
2. **Similitud coseno** mide el coseno del angulo entre dos vectores. Va de -1 (opuesto) a 1 (identico). Para embeddings de texto, los valores tipicamente van de 0.5 a 1.0 para contenido relacionado.
3. **Batch embedding** envia multiples textos en una sola llamada API, reduciendo latencia y costo comparado con llamadas individuales.
4. **Matriz de similitud** normaliza todos los vectores y calcula el producto punto, que es igual a la similitud coseno para vectores unitarios. El resultado es una matriz NxN donde `matrix[i][j]` es la similitud entre los textos i y j.

## Variantes

### Distancia Euclidiana

```python
def euclidean_distance(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute Euclidean distance between two vectors."""
    a = np.array(vec_a)
    b = np.array(vec_b)
    return float(np.linalg.norm(a - b))
```

### Desduplicacion basada en umbral

```python
def find_duplicates(texts: list[str], threshold: float = 0.92) -> list[tuple[int, int, float]]:
    """Find pairs of texts that are semantically duplicates.

    Args:
        texts: List of texts to check.
        threshold: Similarity threshold for duplicate detection.

    Returns:
        List of (index_a, index_b, similarity) tuples.
    """
    embeddings = get_embeddings_batch(texts)
    matrix = cosine_similarity_matrix(embeddings)

    duplicates = []
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            if matrix[i][j] >= threshold:
                duplicates.append((i, j, float(matrix[i][j])))

    return duplicates

dups = find_duplicates([
    "Redis is a fast in-memory cache.",
    "Redis works as an in-memory caching store.",
    "PostgreSQL is a relational database.",
])
# [(0, 1, 0.94)] — los textos 0 y 1 son duplicados
```

### Usar embeddings de HuggingFace (sin API key)

```python
from sentence_transformers import SentenceTransformer

class LocalSimilarityIndex:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.documents = []

    def add(self, doc_id: str, text: str) -> None:
        embedding = self.model.encode(text).tolist()
        self.documents.append(Document(id=doc_id, text=text, embedding=embedding))

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        query_emb = self.model.encode(query).tolist()
        scores = [
            (doc.id, doc.text, cosine_similarity(query_emb, doc.embedding))
            for doc in self.documents
        ]
        scores.sort(key=lambda x: x[2], reverse=True)
        return [{"id": d, "text": t, "score": s} for d, t, s in scores[:top_k]]
```

## Mejores Practicas

- **Usa la API de embeddings batch** — reduce costo y latencia 10x para multiples textos
- **Normaliza embeddings antes de almacenar** — la similitud coseno en vectores normalizados es un simple producto punto
- **Usa `text-embedding-3-small` para la mayoria de tareas** — buen balance de calidad y costo ($0.02 por 1M tokens)
- **Establece un umbral de similitud para dedup** — 0.90-0.95 es tipico para duplicados semanticos

## Errores Comunes

- **Comparar embeddings de modelos diferentes** — cada modelo tiene un espacio vectorial diferente; nunca mezcles embeddings de diferentes modelos
- **Usar distancia Euclidiana sin normalizacion** — la similitud coseno es mas robusta para texto porque es invariante a magnitud
- **No usar llamadas batch API** — llamadas de embedding una por una son lentas y costosas
- **Ignorar limites de tokens** — `text-embedding-3-small` tiene un limite de 8191 tokens; trunca textos largos

## FAQ

**Q: Cual es un buen umbral de similitud coseno para textos "similares"?**
A: 0.80+ es tipicamente similar, 0.90+ es casi duplicado, 0.70-0.80 esta relacionado por tema. Ajusta segun tus datos.

**Q: Debo usar `text-embedding-3-small` o `text-embedding-3-large`?**
A: Empieza con `small` (1536 dims, mas barato). Usa `large` (3072 dims) si necesitas mayor precision para similitud de grano fino.

**Q: Puedo cachear embeddings para evitar recalcular?**
A: Si. Almacena embeddings en una base de datos o archivo. Solo re-embed cuando el texto fuente cambie.

**Q: Como manejo documentos muy largos?**
A: Divide el documento en segmentos mas pequenos (ej. 500-1000 tokens), embedde cada chunk y promedia los embeddings para un vector a nivel de documento.
