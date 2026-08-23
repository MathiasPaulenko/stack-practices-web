---
contentType: recipes
slug: semantic-search
title: "Crea búsqueda semántica con embeddings en Python, JS y Java"
description: "Crea un motor de búsqueda semántica con embeddings de texto y similitud vectorial. Incluye ejemplos en Python, JavaScript y Java con FAISS, pgvector y OpenAI."
metaDescription: "Crea búsqueda semántica con embeddings y similitud vectorial. Usa OpenAI, sentence-transformers, FAISS, pgvector y Spring AI en producción."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - embeddings
  - openai
  - vector-search
  - python
relatedResources:
  - /recipes/rag-pipeline
  - /recipes/chatbot-openai
  - /recipes/llm-fine-tuning
  - /recipes/ai-agents
  - /recipes/ai-agents-tool-use
  - /recipes/prompt-engineering
lastUpdated: "2026-08-23"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Crea búsqueda semántica con embeddings y similitud vectorial. Usa OpenAI, sentence-transformers, FAISS, pgvector y Spring AI en producción."
  keywords:
    - busqueda semantica
    - embeddings
    - similitud vectorial
    - faiss
    - pgvector
    - openai
    - sentence-transformers
---

## Visión General

Cuando el usuario busca "laptop para programación" y tus documentos hablan de estaciones de trabajo para
desarrolladores, la búsqueda por palabras clave se queda corta. La búsqueda semántica soluciona esto
convirtiendo el texto en vectores densos y comparándolos en ese espacio.

Esta receta muestra dos caminos prácticos: una pila local y gratuita con `sentence-transformers` y FAISS, y una
pila gestionada con embeddings de OpenAI más pgvector. También incluye ejemplos en JavaScript y Java para
integrarlos en un servicio web o una aplicación Spring.

## Cuándo Usar

- Las consultas usan sinónimos, parafraseo o lenguaje natural; una búsqueda por palabras clave no los empareja.
- Estás construyendo un motor de recomendación, [asistente de preguntas y respuestas](/recipes/chatbot-openai/) o
  descubrimiento de contenido.
- Quieres combinar búsqueda vectorial y por palabras clave en [recuperación híbrida](/recipes/rag-pipeline/).
- Si tienes varios miles de documentos, un mejor modelo de ranking merece la infraestructura extra.

## Cuándo Evitar

- Los usuarios teclean IDs exactos, SKUs o códigos de error. Para coincidencias exactas, la búsqueda por
  palabras clave gana en velocidad y precisión.
- El corpus es pequeño. Con menos de 1.000 documentos, BM25 más sinónimos suele ser suficiente.
- Necesitas poder explicar por qué sale cada resultado. Un score de similitud vectorial es más difícil de
  explicar que destacar términos.
- La latencia sub-10 ms es obligatoria. Las llamadas a embeddings y los índices ANN raramente entran en ese
  límite.

## Solución

### Python con sentence-transformers y FAISS

Este es el punto de partida más barato: el modelo corre local y FAISS vive en memoria.

```python
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

documents = [
    "Python es excelente para ciencia de datos y machine learning.",
    "JavaScript se ejecuta en navegadores y servidores con Node.js.",
    "Rust ofrece seguridad de memoria sin un recolector de basura.",
]

# Codificar y normalizar L2 para que el producto interno equivalga a similitud coseno
embeddings = model.encode(documents, convert_to_numpy=True, normalize_embeddings=True)

dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)  # producto interno sobre vectores normalizados
index.add(embeddings)

query = "lenguaje para desarrollo web"
query_embedding = model.encode([query], normalize_embeddings=True)

distances, indices = index.search(query_embedding, k=2)

for rank, idx in enumerate(indices[0]):
    print(f"{rank + 1}. {documents[idx]} (score: {distances[0][rank]:.3f})")
```

### Python con OpenAI y FAISS

Si prefieres embeddings por API, cambia el modelo local por OpenAI y normaliza los vectores antes de indexar.

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

documents = [
    "Python es excelente para ciencia de datos y machine learning.",
    "JavaScript se ejecuta en navegadores y servidores con Node.js.",
    "Rust ofrece seguridad de memoria sin un recolector de basura.",
]

embeddings = [get_embedding(doc) for doc in documents]
embeddings_np = np.array(embeddings).astype("float32")

# Normalizar para que el producto interno sea similitud coseno
faiss.normalize_L2(embeddings_np)

dimension = embeddings_np.shape[1]
index = faiss.IndexFlatIP(dimension)
index.add(embeddings_np)

query = "lenguaje para desarrollo web"
query_embedding = np.array([get_embedding(query)]).astype("float32")
faiss.normalize_L2(query_embedding)

distances, indices = index.search(query_embedding, k=2)

for rank, idx in enumerate(indices[0]):
    print(f"{rank + 1}. {documents[idx]} (score: {distances[0][rank]:.3f})")
```

### JavaScript con OpenAI

Una versión ligera que calcula similitud coseno con JavaScript puro.

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

### Java con Spring AI y pgvector

Para un servicio de producción, guarda los embeddings en PostgreSQL con pgvector y consúltalos con Spring AI.

```java
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingClient;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.pgvector.PgVectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;

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

La búsqueda semántica tiene tres etapas:

1. Un modelo como `all-MiniLM-L6-v2` o OpenAI `text-embedding-3-small` convierte el texto en un vector denso.
   El modelo pone textos similares cerca en el espacio vectorial.
2. Esos vectores se guardan en un índice pensado para buscar vecinos cercanos.
3. La pregunta del usuario también se embebe, y el índice devuelve los `k` vectores más cercanos usando coseno u
   otra métrica de distancia.

Coseno es simplemente el ángulo entre dos vectores. Tras la normalización L2, el producto interno equivale a
coseno, que FAISS puede calcular muy rápido. Un score cercano a 1.0 significa dirección similar; cerca de 0.0
significa que los vectores no están relacionados.

Ten en cuenta estos compromisos:

- Los embeddings densos capturan significado, pero pueden perder coincidencias exactas de palabras clave.
- Las bases de datos vectoriales añaden trabajo operativo, pero escalan a millones de documentos.
- La calidad del embedding depende del modelo y de tu dominio; béncalo con texto real de tu área.

## Variantes

| Tecnología | Enfoque | Mejor para |
| ------------ | --------- | ------------ |
| **sentence-transformers** | Modelos locales gratuitos | Prototipado y aplicaciones sensibles a la privacidad |
| **OpenAI embeddings** | API, alta calidad | Aplicaciones gestionadas que no quieren alojar modelos |
| **FAISS** | Índice ANN en memoria | Experimentos rápidos; no persistente por defecto |
| **Chroma** | Almacenamiento local persistente | Aplicaciones pequeñas que quieren una BD vectorial simple |
| **pgvector** | Extensión de Postgres | Aplicaciones de producción que ya usan PostgreSQL |
| **Pinecone / Weaviate** | BD vectorial gestionada | Despliegues de alta escala o multi-tenant |

## Mejores Prácticas

- **Normaliza los embeddings** antes de la búsqueda por coseno. Con vectores L2-normalizados, los índices de
  producto interno corren rápido.
- **Almacena metadatos** como categoría, fuente y fecha para filtrar antes de buscar en el vector.
- **Usa búsqueda híbrida** en producción: combina resultados vectoriales y BM25 con reciprocal rank fusion.
- **Fragmenta documentos largos** en lugar de embeber el texto completo. Un solo vector para un documento de
  5.000 tokens pierde detalle.
- **Cachea embeddings de consultas frecuentes** para reducir costo de API y latencia.
- **Evalúa con un test set etiquetado**; mide recall@k y mean reciprocal rank (MRR) antes de afinar.

## Errores Comunes

- **Búsqueda fuerza bruta a escala.** A escala, escanear millones de vectores linealmente es muy lento. Pasa a un índice
  IVF o HNSW.
- **Ignorar límites de tokens.** Cada modelo admite un máximo de tokens. Trunca o divide documentos largos.
- **Sin umbral de relevancia.** Fija un mínimo de similitud y descarta los resultados con score bajo.
- **Un solo embedding por documento largo.** Fragmenta el texto y embebe cada fragmento por separado para
  recuperación granular.
- **Índice obsoleto.** Los embeddings de documentos actualizados degradan silenciosamente la calidad.
  Re-indexa ante cambios de contenido.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre búsqueda semántica y por palabras clave?

La búsqueda por palabras clave empareja términos exactos, como hace BM25. La búsqueda semántica empareja
significados por similitud vectorial. La búsqueda por palabras clave es rápida y precisa con terminología
conocida; la semántica maneja sinónimos y parafraseo.

### ¿Puedo usar embeddings gratuitos en lugar de OpenAI?

Sí. `sentence-transformers` incluye modelos abiertos como `all-MiniLM-L6-v2` que corren en CPU. Son más
pequeños y ligeramente menos generales que los de OpenAI, pero son gratuitos y mantienen los datos en tu
máquina.

### ¿Cómo escalo a millones de documentos?

Usa una base de datos vectorial de producción como Pinecone, Weaviate o pgvector con indexación HNSW. Particiona
por categoría o tenant, y usa búsqueda aproximada de vecinos más cercanos (ANN) para tiempos de consulta
sub-segundo a escala.

### ¿Qué es la búsqueda híbrida y por qué usarla?

La búsqueda híbrida combina resultados semánticos y por palabras clave, normalmente con reciprocal rank fusion.
Cubre ambos modos de fallo: la búsqueda semántica puede perder términos exactos, y la búsqueda por palabras clave
puede perder parafraseo.

### ¿Cómo manejo búsqueda semántica multilingüe?

Usa un modelo multilingüe como `multilingual-e5-large` o los embeddings multilingües de Cohere. Estos mapean
texto de diferentes idiomas al mismo espacio vectorial, así una consulta en español puede coincidir con
documentos en inglés. No traduzcas la consulta primero: la traducción agrega latencia y puede introducir errores.
