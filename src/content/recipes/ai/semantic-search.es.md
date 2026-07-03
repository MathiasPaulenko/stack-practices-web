---
contentType: recipes
slug: semantic-search
title: "Implementar búsqueda semántica con embeddings"
description: "Cómo implementar búsqueda semántica usando embeddings de texto y búsqueda por similitud vectorial para recuperación inteligente de documentos"
metaDescription: "Implementa búsqueda semántica con embeddings de texto y similitud vectorial. Usa OpenAI, sentence-transformers y FAISS para recuperación inteligente de documentos."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - embeddings
  - openai
  - machine-learning
  - llm
relatedResources:
  - /recipes/rag-pipeline
  - /recipes/chatbot-openai
  - /recipes/llm-fine-tuning
  - /guides/software-architecture-guide
  - /guides/sql-performance-tuning-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa búsqueda semántica con embeddings de texto y similitud vectorial. Usa OpenAI, sentence-transformers y FAISS para recuperación inteligente de documentos."
  keywords:
    - busqueda-semantica
    - embeddings
    - similitud-vectorial
    - openai
    - faiss
    - nlp
---

## Visión General

La búsqueda semántica encuentra documentos basándose en significado en lugar de coincidencias exactas de palabras clave. Una consulta como "mejor laptop para programación" devuelve documentos sobre estaciones de trabajo de desarrollador incluso si nunca usan la palabra "laptop". Esto se logra convirtiendo texto en vectores densos (embeddings) y realizando búsqueda de similitud en ese espacio vectorial.

Esta receta implementa búsqueda semántica con embeddings de OpenAI, sentence-transformers y FAISS para recuperación rápida en memoria, más pgvector para despliegues productivos en PostgreSQL.

## Cuándo Usar

Usa este recurso cuando:
- La búsqueda por palabras clave pierde resultados relevantes debido a sinonimia o diferencias de redacción
- Necesitas buscar en grandes colecciones de documentos con consultas en lenguaje natural
- Estás construyendo un motor de recomendación, [sistema de preguntas y respuestas](/recipes/ai/chatbot-openai) o descubrimiento de contenido
- Quieres combinar búsqueda semántica y por palabras clave ([recuperación híbrida](/recipes/ai/rag-pipeline))

## Solución

### Python

```python
from openai import OpenAI
import numpy as np
import faiss

client = OpenAI(api_key="YOUR_API_KEY")

def get_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# Indexar documentos
documents = [
    "Python es excelente para ciencia de datos y machine learning.",
    "JavaScript se ejecuta en navegadores y servidores con Node.js.",
    "Rust ofrece seguridad de memoria sin un recolector de basura.",
]
embeddings = [get_embedding(doc) for doc in documents]
embeddings_np = np.array(embeddings).astype("float32")

# Construir índice FAISS
dimension = len(embeddings[0])
index = faiss.IndexFlatIP(dimension)  # Producto interno = coseno en vectores normalizados
faiss.normalize_L2(embeddings_np)
index.add(embeddings_np)

# Buscar
query = "lenguaje para desarrollo web"
query_embedding = np.array([get_embedding(query)]).astype("float32")
faiss.normalize_L2(query_embedding)
distances, indices = index.search(query_embedding, k=2)

for rank, idx in enumerate(indices[0]):
    print(f"{rank + 1}. {documents[idx]} (score: {distances[0][rank]:.3f})")
```

### JavaScript

```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embed(text) {
  const res = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  });
  return res.data[0].embedding;
}

async function semanticSearch() {
  const documents = [
    'Python es excelente para ciencia de datos y machine learning.',
    'JavaScript se ejecuta en navegadores y servidores con Node.js.',
    'Rust ofrece seguridad de memoria sin un recolector de basura.',
  ];

  const embeddings = await Promise.all(documents.map(embed));

  // Búsqueda simple por similitud coseno (producción: usa una BD vectorial)
  const query = await embed('lenguaje para desarrollo web');

  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  const results = documents
    .map((doc, i) => ({ doc, score: cosine(query, embeddings[i]) }))
    .sort((a, b) => b.score - a.score);

  results.slice(0, 2).forEach((r, i) => {
    console.log(`${i + 1}. ${r.doc} (score: ${r.score.toFixed(3)})`);
  });
}

semanticSearch();
```

### Java

```java
// Java con Spring AI y pgvector (listo para producción)
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingClient;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.jdbc.core.JdbcTemplate;

public class SemanticSearchService {
    private final VectorStore vectorStore;

    public SemanticSearchService(EmbeddingClient embeddingClient, JdbcTemplate jdbc) {
        this.vectorStore = PgVectorStore.builder(jdbc, embeddingClient)
            .dimensions(1536)
            .distanceType(PgVectorStore.PgDistanceType.COSINE_DISTANCE)
            .initializeSchema(true)
            .build();
    }

    public void indexDocuments(List<String> texts) {
        List<Document> docs = texts.stream()
            .map(t -> new Document(t))
            .toList();
        vectorStore.add(docs);
    }

    public List<Document> search(String query, int topK) {
        return vectorStore.similaritySearch(
            SearchRequest.builder()
                .query(query)
                .topK(topK)
                .build()
        );
    }
}
```

## Explicación

La búsqueda semántica funciona en tres etapas:

1. **Embedding**: Un modelo de embeddings (ej. OpenAI `text-embedding-3-small`) convierte texto en un vector denso de 1536 dimensiones. Significados similares producen vectores cercanos en el espacio.
2. **Indexación**: Los embeddings se almacenan en un índice vectorial optimizado para búsqueda de vecinos más cercanos.
3. **Consulta**: La consulta del usuario también se embebe, y el índice devuelve los `k` vectores más cercanos usando similitud coseno o distancia euclidiana.

**Similitud coseno** mide el ángulo entre dos vectores: un score de 1.0 significa dirección idéntica; 0.0 significa ortogonal (sin relación). Normalizar vectores L2 hace que el producto interno sea equivalente a la similitud coseno, que FAISS puede calcular muy eficientemente.

**Compromisos:**
- Los embeddings densos capturan significado pero pueden perder coincidencias exactas de palabras clave
- Las bases de datos vectoriales añaden complejidad de infraestructura pero escalan a millones de documentos
- La calidad del embedding varía según el modelo; prueba con el vocabulario de tu dominio

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| OpenAI Embeddings | Basado en API | Mejor calidad, pago por token; 1536 dims para text-embedding-3-small |
| sentence-transformers | Local en Python | Gratis, corre en CPU/GPU; modelos como `all-MiniLM-L6-v2` (384 dims) |
| FAISS | Índice en memoria | Rápido para prototipos; no persistente ni distribuido |
| Chroma | BD local persistente | Configuración fácil, gestión automática de embeddings |
| pgvector | Extensión de Postgres | Mejor para producción si ya usas PostgreSQL |
| Pinecone / Weaviate | BD vectorial gestionada | Escalable, alojada, con filtrado por metadatos |

## Lo que Funciona

1. Normaliza embeddings antes de búsqueda por similitud coseno para habilitar aceleración por producto interno
2. Almacena metadatos (fuente, categoría, fecha) junto a vectores para filtrado y ranking
3. Usa búsqueda híbrida: combina recuperación semántica con búsqueda por palabras clave BM25 para mejor recall
4. Evalúa con un conjunto de prueba etiquetado; mide recall@k y mean reciprocal rank (MRR)
5. Cachea embeddings de consultas frecuentes para reducir costo de API y latencia

## Errores Comunes

1. **Búsqueda fuerza bruta a escala** — escanear linealmente millones de vectores es muy lento; usa un índice (IVF, HNSW)
2. **Ignorar límites del modelo de embedding** — cada modelo tiene longitud máxima de tokens; trunca documentos largos
3. **Sin umbral de relevancia** — siempre filtra resultados bajo un punto de corte para evitar falsos positivos
4. **Un solo embedding por documento** — documentos largos deben fragmentarse; un solo embedding pierde detalle
5. **Sin actualización de índice** — embeddings obsoletos para documentos actualizados degradan silenciosamente la calidad

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre búsqueda semántica y por palabras clave?

La búsqueda por palabras clave coincide términos exactos (ej. TF-IDF, BM25). La búsqueda semántica coincide significados por similitud vectorial. La búsqueda por palabras clave es rápida y precisa para terminología conocida; la semántica maneja sinónimos, parafraseo y similitud conceptual.

### ¿Puedo usar embeddings gratuitos en lugar de OpenAI?

Sí. `sentence-transformers` provee modelos de código abierto de alta calidad como `all-MiniLM-L6-v2` que corren localmente en CPU. Son más pequeños y ligeramente menos generales que los modelos de OpenAI, pero son gratuitos y preservan privacidad.

### ¿Cómo escalo a millones de documentos?

Usa una base de datos vectorial de producción como Pinecone, Weaviate o pgvector con indexación HNSW. Consulta [Guía de Optimización de SQL](/guides/databases/sql-performance-tuning-guide) para optimización de base de datos. Particiona por categoría o tenant, e implementa búsqueda aproximada de vecinos más cercanos (ANN) para tiempos de consulta sub-segundo a escala.
