---
contentType: recipes
slug: python-vector-database-pinecone
title: "Almacenar y consultar embeddings en Pinecone Vector Database"
description: "Usa Pinecone para almacenar, consultar y filtrar embeddings vectoriales para busqueda semantica con filtrado de metadatos y aislamiento por namespaces"
metaDescription: "Almacena y consulta embeddings en Pinecone para busqueda semantica. Upsert de vectores, filtra por metadatos, usa namespaces y optimiza recall."
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
  metaDescription: "Almacena y consulta embeddings en Pinecone para busqueda semantica. Upsert de vectores, filtra por metadatos, usa namespaces y optimiza recall."
  keywords:
    - pinecone vector database
    - python embeddings
    - semantic search
    - vector similarity
    - pinecone python
---

# Almacenar y consultar embeddings en Pinecone Vector Database

Pinecone es una base de datos vectorial gestionada optimizada para busqueda semantica y RAG. Almacena embeddings de alta dimension y recupera los vectores mas similares en milisegundos. A continuacion: crear un indice, upsertear embeddings con metadatos, consultar con filtros y usar namespaces para aislamiento multi-tenant.

## Cuando Usar Esto

- Busqueda semantica sobre documentos, productos o bases de conocimiento
- Pipelines RAG (Retrieval-Augmented Generation) que necesitan recuperacion vectorial rapida
- Sistemas de recomendacion basados en similitud de embeddings
- Desduplicacion de contenido semanticamente similar

## Requisitos Previos

- Python 3.10+
- Paquete `pinecone` (`pip install pinecone`)
- Paquete `openai` para embeddings (`pip install openai`)
- Una API key de Pinecone

## Solucion

### 1. Instalar dependencias

```bash
pip install pinecone openai
```

### 2. Inicializar Pinecone y crear un indice

```python
from pinecone import Pinecone, ServerSpec
from openai import OpenAI

pc = Pinecone(api_key="your-pinecone-api-key")
openai_client = OpenAI()

# Crear un indice serverless (free tier)
index_name = "knowledge-base"

if index_name not in [idx.name for idx in pc.list_indexes()]:
    pc.create_index(
        name=index_name,
        dimension=1536,  # Dimension de OpenAI text-embedding-3-small
        metric="cosine",
        spec=ServerSpec(
            cloud="aws",
            region="us-east-1",
        ),
    )

index = pc.Index(index_name)
```

### 3. Generar embeddings y upsertear

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
                "text": doc["text"][:500],  # Almacenar texto truncado para recuperacion
            },
        })

    return index.upsert(vectors=vectors)

# Upsertear documentos de ejemplo
upsert_documents([
    {
        "id": "doc1",
        "text": "Redis is an in-memory data structure store used as a cache and database.",
        "metadata": {"category": "database", "source": "docs"},
    },
    {
        "id": "doc2",
        "text": "PostgreSQL is a powerful open-source relational database system.",
        "metadata": {"category": "database", "source": "docs"},
    },
    {
        "id": "doc3",
        "text": "Docker containers package applications with their dependencies.",
        "metadata": {"category": "devops", "source": "tutorial"},
    },
])
```

### 4. Consultar vectores similares

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

# Busqueda semantica
results = search_similar("in-memory cache for fast lookups", top_k=3)
for r in results:
    print(f"Score: {r['score']:.3f} | {r['metadata']['text'][:80]}")
```

### 5. Filtrado por metadatos

```python
# Filtrar por categoria
results = search_similar(
    "database for web applications",
    top_k=5,
    filter={"category": {"$eq": "database"}},
)

# Filtrar por source y categoria
results = search_similar(
    "container deployment",
    top_k=5,
    filter={
        "source": {"$eq": "tutorial"},
        "category": {"$eq": "devops"},
    },
)

# Filtro por rango
results = search_similar(
    "recent articles",
    top_k=10,
    filter={"timestamp": {"$gte": 1700000000}},
)
```

### 6. Namespaces para aislamiento multi-tenant

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

# Cada tenant obtiene busqueda aislada
upsert_to_namespace(tenant_a_docs, namespace="tenant-a")
upsert_to_namespace(tenant_b_docs, namespace="tenant-b")

results = search_namespace("caching strategies", namespace="tenant-a")
```

### 7. Upsert batch para datasets grandes

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

        # Generar embeddings en batch
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

## Como Funciona

1. **Creacion del indice** especifica la dimension del vector (debe coincidir con el modelo de embedding) y la metrica de similitud (`cosine`, `euclidean` o `dotproduct`).
2. **Upsert** almacena vectores con metadatos opcionales. Cada vector tiene un ID unico, values (el embedding) y metadatos (pares clave-valor para filtrado).
3. **Query** convierte el texto de consulta a embedding, busca los vectores mas cercanos por similitud coseno y retorna los K matches principales con scores.
4. **Filtrado por metadatos** usa operadores tipo MongoDB (`$eq`, `$ne`, `$in`, `$gte`, `$lte`) para acotar resultados antes de la busqueda de similitud vectorial.
5. **Namespaces** particionan el indice en subconjuntos aislados. Las queries en un namespace no ven vectores de otro, habilitando setups multi-tenant.

## Variantes

### Vectores sparse para busqueda por palabras clave

```python
# Pinecone soporta busqueda hibrida con vectores sparse
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

# Query con vectores dense y sparse
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

### Eliminar por filtro de metadatos

```python
def delete_by_filter(filter: dict) -> dict:
    """Delete all vectors matching a metadata filter."""
    return index.delete(filter=filter)

# Eliminar todos los documentos de un source especifico
delete_by_filter({"source": {"$eq": "deprecated"}})
```

### Obtener por ID

```python
def fetch_vectors(ids: list[str]) -> dict:
    """Fetch vectors by their IDs."""
    return index.fetch(ids=ids)

result = fetch_vectors(["doc1", "doc2"])
for vid, vector in result["vectors"].items():
    print(f"ID: {vid}, Values: {vector['values'][:5]}...")
```

## Mejores Practicas

- **Usa la API de embeddings batch** — generar embeddings uno a la vez es 10x mas lento que en batch
- **Almacena texto truncado en metadatos** — Pinecone no almacena documentos completos; guarda texto en metadatos para recuperacion
- **Usa namespaces para tenants** — mas barato y rapido que indices separados para cada tenant
- **Monitorea el tamanio del indice** — Pinecone tiene limites de almacenamiento por plan; elimina vectores viejos con `delete(filter=...)`

## Errores Comunes

- **Dimensiones no coincidentes** — la dimension del indice debe coincidir exactamente con la dimension de salida del modelo de embedding
- **No usar filtrado por metadatos** — recuperar todos los vectores y filtrar client-side es lento y costoso
- **Upsertear un vector a la vez** — los upserts batch son significativamente mas rapidos y evitan rate limits
- **Usar la metrica equivocada** — cosine es mejor para embeddings de texto normalizados; dotproduct para no normalizados

## FAQ

**Q: Que modelo de embedding debo usar?**
A: `text-embedding-3-small` (1536 dimensiones) es un buen default. Usa `text-embedding-3-large` (3072 dimensiones) para mayor precision a mayor costo.

**Q: Cuanto cuesta Pinecone?**
A: El free tier incluye un indice serverless con 100K vectores. Los planes pagos empiezan en $70/mes con mayores limites de almacenamiento y queries.

**Q: Puedo usar Pinecone con embeddings locales?**
A: Si. Genera embeddings con cualquier modelo (HuggingFace, Ollama) y upsertealos a Pinecone. La dimension del indice debe coincidir.

**Q: Como actualizo un vector existente?**
A: Upsertea con el mismo ID. Pinecone sobrescribe el vector y metadatos existentes.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
