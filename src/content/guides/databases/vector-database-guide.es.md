---
contentType: guides
slug: vector-database-guide
title: "Bases de Datos Vectoriales — Embeddings de IA/ML y Busqueda por Similitud"
description: "Guia practica de bases de datos vectoriales: embeddings, busqueda por similitud, vecinos aproximados mas cercanos, y elegir entre Pinecone, Weaviate, pgvector y Chroma."
metaDescription: "Aprende bases de datos vectoriales: embeddings, busqueda por similitud, algoritmos ANN. Compara Pinecone, Weaviate, pgvector y Chroma para casos de uso IA/ML."
difficulty: intermediate
topics:
  - databases
  - ai
  - data
tags:
  - base-datos-vectorial
  - embeddings
  - busqueda-similitud
  - ann
  - pinecone
  - pgvector
  - weaviate
  - chroma
  - rag
  - guia
relatedResources:
  - /guides/graph-database-guide
  - /guides/nosql-patterns-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende bases de datos vectoriales: embeddings, busqueda por similitud, algoritmos ANN. Compara Pinecone, Weaviate, pgvector y Chroma para casos de uso IA/ML."
  keywords:
    - base-datos-vectorial
    - embeddings
    - busqueda-similitud
    - ann
    - pinecone
    - pgvector
    - weaviate
    - chroma
    - rag
    - guia
---

## Overview

Las bases de datos vectoriales almacenan vectores numericos de alta dimension (embeddings) generados por modelos de machine learning y habilitan busqueda por similitud mediante algoritmos de Vecino Mas Cercano Aproximado (ANN). Potencian busqueda semantica, sistemas de recomendacion, recuperacion de imagenes por contenido, y Generacion Aumentada por Recuperacion (RAG) para LLMs. A diferencia de bases de datos tradicionales que buscan por coincidencia exacta o rango, las bases de datos vectoriales encuentran los vectores "mas cercanos" en el espacio de embeddings — la representacion matematica de significado, caracteristicas de imagen o firmas de audio.

## When to Use

- Necesitas busqueda semantica (encontrar significado similar, no solo coincidencia de palabras clave)
- Los pipelines RAG de LLMs requieren recuperar chunks de contexto relevantes
- Sistemas de recomendacion sugieren items similares a preferencias de usuario
- Recuperacion de imagen, audio o video por similitud de contenido
- Tienes modelos de embedding pre-entrenados y necesitas almacenamiento vectorial escalable

## Como Funciona la Busqueda Vectorial

1. **Embedding**: Un modelo (OpenAI, BERT, CLIP) convierte texto/imagen en un vector denso (ej. 768-1536 dimensiones)
2. **Indexacion**: Los vectores se organizan en un indice ANN (HNSW, IVF, PQ) para recuperacion rapida
3. **Consulta**: La consulta se embebe y el indice retorna los K vecinos mas cercanos
4. **Filtrado de metadata**: Combinar similitud vectorial con filtrado tradicional (fecha, categoria, ID de usuario)

## Comparacion

| Base de datos | Despliegue | Indice | Mejor para |
|---------------|-----------|--------|------------|
| **Pinecone** | Nube gestionada | HNSW, filtros metadata | RAG en produccion, sin overhead de ops |
| **Weaviate** | Auto-gestionado / nube | HNSW, BM25 hibrido | Multi-modal, interfaz GraphQL |
| **pgvector** | Extension PostgreSQL | ivfflat, hnsw | Equipos ya en Postgres |
| **Chroma** | Embebido / local | HNSW | Prototipado, RAG local a pequena escala |
| **Milvus/Zilliz** | Auto-gestionado / nube | IVF, HNSW, GPU | Gran escala, alto throughput |

## Ejemplo pgvector

```sql
-- Habilitar extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Crear tabla con columna vectorial
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    embedding vector(1536)
);

-- Crear indice HNSW para busqueda ANN rapida
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Insertar documento con embedding
INSERT INTO documents (title, content, embedding)
VALUES ('Guia de Bases Vectoriales', 'Una guia sobre bases de datos vectoriales...', '[0.12, -0.03, ...]');

-- Busqueda semantica: encontrar 5 documentos mas similares
SELECT id, title, content,
    1 - (embedding <=> '[0.11, -0.02, ...]') as similarity
FROM documents
ORDER BY embedding <=> '[0.11, -0.02, ...]'
LIMIT 5;
```

## Busqueda Hibrida (Vectorial + Palabras Clave)

```python
# Weaviate: combinar similitud vectorial con busqueda BM25
import weaviate

client = weaviate.connect_to_local()

results = client.collections.get("Article").query.hybrid(
    query="arquitectura base de datos vectorial",
    vector=[0.12, -0.03, ...],
    alpha=0.5,  # 0 = puro BM25, 1 = puro vectorial
    limit=10
)
```

## Ejemplo de Pipeline RAG

```python
from openai import OpenAI
import chromadb

# 1. Cargar y fragmentar documentos
chunks = load_and_chunk_documents("knowledge_base/")

# 2. Embeber y almacenar en Chroma
client = chromadb.Client()
collection = client.create_collection("docs")
embeddings = openai_client.embeddings.create(input=chunks, model="text-embedding-3-small")
collection.add(ids=ids, documents=chunks, embeddings=[e.embedding for e in embeddings.data])

# 3. Recuperar chunks relevantes para una consulta
query_embedding = openai_client.embeddings.create(input="Como funcionan los indices vectoriales?", model="text-embedding-3-small")
results = collection.query(query_embeddings=[query_embedding.data[0].embedding], n_results=5)

# 4. Aumentar prompt del LLM con contexto recuperado
context = "\n".join([r["document"] for r in results["documents"][0]])
prompt = f"Contexto:\n{context}\n\nPregunta: Como funcionan los indices vectoriales?"
response = openai_client.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": prompt}])
```

## Algoritmos ANN

| Algoritmo | Tipo | Velocidad | Memoria | Mejor para |
|-----------|------|-----------|---------|------------|
| **HNSW** | Basado en grafos | Rapido | Alta | Proposito general, alta recall |
| **IVF** | Clustering | Media | Media | Grandes datasets, limitado de memoria |
| **PQ** | Cuantizacion | Rapido | Baja | Billones de vectores, recall aceptable |

## Common Mistakes

- **Metrica de distancia incorrecta** — similitud coseno para texto semantico, euclidiana para caracteristicas de imagen, producto punto para embeddings normalizados
- **Sin filtrado de metadata** — busqueda puramente vectorial retorna resultados irrelevantes; siempre combinar con filtros de metadata
- **Ignorar ajuste de indice** — parametros HNSW por defecto pueden no ajustarse a tus requisitos de recall/latencia
- **Almacenar vectores raw sin indice** — escaneo completo de fuerza bruta es O(n) e inusable a escala
- **Usar una base vectorial para consultas estructuradas** — combinar con una base relacional; las bases vectoriales son malas en agregacion y joins

## FAQ

**Necesito una base de datos vectorial dedicada o puedo usar Postgres?**
Para escala pequena a media (< 1M vectores) y equipos ya en Postgres, `pgvector` es suficiente. Para alta escala, multi-tenant o gestionada, Pinecone o Weaviate son mejores.

**Como elijo dimensiones de embedding?**
Usa la dimension de salida de tu modelo elegido (OpenAI text-embedding-3-small = 1536, BERT-base = 768). No reduzcas dimensiones arbitrariamente sin entrenamiento consciente de cuantizacion.

**Puedo actualizar vectores en su lugar?**
Si, pero puede requerir re-indexacion dependiendo de la base de datos y tipo de indice. Algunos sistemas soportan actualizaciones incrementales; otros requieren reconstruccion completa.
