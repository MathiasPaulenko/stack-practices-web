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
  - /recipes/ai-agents-tool-use
  - /recipes/ai-agents
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

A continuacion se implementa búsqueda semántica con embeddings de OpenAI, sentence-transformers y FAISS para recuperación rápida en memoria, más pgvector para despliegues productivos en PostgreSQL.

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

### ¿Qué es búsqueda híbrida y por qué debería usarla?

Búsqueda híbrida combina búsqueda semántica (vectorial) y por palabras clave (BM25). La búsqueda semántica captura significado y sinónimos; la búsqueda por palabras clave asegura coincidencias exactas de términos. La mayoría de sistemas de búsqueda en producción usan búsqueda híbrida porque cubre ambos modos de fallo: la búsqueda semántica pierde terminología exacta, y la búsqueda por palabras clave pierde paráfrasis. Implementa búsqueda híbrida con reciprocal rank fusion (RRF) para mezclar resultados de ambos métodos.

### ¿Cómo manejo búsqueda semántica multilingüe?

Usa un modelo de embedding multilingüe como `multilingual-e5-large` o embeddings multilingües de Cohere. Estos modelos mapean texto de diferentes idiomas al mismo espacio vectorial, así una query en español puede coincidir con documentos en inglés. Evita traducir queries antes de embeber — la traducción agrega latencia y puede introducir errores.

### ¿Cómo depuro resultados de búsqueda pobres?

Verifica en orden: (1) ¿Los embeddings están normalizados? (2) ¿La métrica de distancia es correcta para el modelo? (3) ¿Queries y documentos usan el mismo modelo de embedding? (4) ¿Los fragmentos son demasiado grandes o pequeños? (5) ¿El threshold de relevancia es muy alto o muy bajo? Construye un pequeño test set de queries conocidas y resultados esperados para diagnosticar sistemáticamente.

### ¿Cuál es el costo de búsqueda semántica a escala?

`text-embedding-3-small` de OpenAI cuesta $0.02 por 1M de tokens. Indexar 100.000 documentos (avg 500 tokens cada uno) cuesta ~$1. Embeddings de query cuestan ~$0.00001 por query. Los costos de base de datos vectorial varían: pgvector es gratis (solo Postgres), Pinecone empieza en $70/mes, Weaviate self-hosted requiere una instancia GPU. Factora costos de re-indexación cuando los documentos cambian frecuentemente.

## Errores comunes adicionales

- **No normalizar embeddings antes de buscar** — cosine similarity requiere vectores normalizados. Si saltas L2 normalization, los scores de inner product son dominados por la magnitud del vector en lugar de la dirección.
- **Usar un solo embedding para un documento largo** — un documento de 5000 tokens comprimido en un vector pierde contexto local. Fragmenta el documento y embebe cada fragmento separadamente para recuperación granular.
- **No manejar términos fuera de vocabulario** — los modelos de embedding pueden no representar bien jerga domain-specific. Suplementa con búsqueda por palabras clave o fine-tunea embeddings en texto del dominio.
- **Ignorar preprocesamiento de queries** — las queries de usuarios suelen contener typos, slang o abreviaciones. Normaliza queries antes de embeber: lowercase, strippea puntuación, expande abreviaciones comunes.
- **No cachear embeddings de queries** — queries populares repetidas por múltiples usuarios generan el mismo embedding. Cachea por query hash para reducir llamadas API y latencia.
- **Mezclar modelos de embedding en el mismo índice** — embeddings de diferentes modelos tienen diferentes dimensiones y espacios. Nunca mezcles modelos en el mismo índice sin re-embeber todo.
- **No monitorear freshness del índice** — si los documentos se actualizan pero los embeddings no se regeneran, la calidad de búsqueda se degrada silenciosamente. Setea un pipeline de re-indexación triggered por cambios de contenido.

## Buenas Prácticas

- **Usa búsqueda híbrida para producción**: combina búsqueda vectorial con BM25 keyword search. Usa reciprocal rank fusion (RRF) para mergeear resultados. Esto captura tanto coincidencias semánticas como coincidencias de términos exactos, mejorando el recall considerablemente.
- **Implementa understanding de queries**: antes de embeber la query, clasifica el intent (informacional, navegacional, transaccional). Rutea diferentes intents a diferentes estrategias de búsqueda. Esto mejora la relevancia para tipos diversos de queries.
- **Usa búsqueda vectorial filtrada**: adjunta tags de metadatos (categoría, fecha, idioma, autor) a los embeddings. Filtra por metadatos antes de la búsqueda vectorial para reducir el espacio de búsqueda y mejorar tanto velocidad como relevancia.
- **Benchmarkea diferentes modelos de embedding**: testea 3-5 modelos de embedding en tu test set domain-specific. Compara recall@k y MRR. Modelos como `e5-large-v2`, `bge-large` y `text-embedding-3-large` pueden outperformar el default de OpenAI en ciertos dominios.
- **Setea A/B testing para calidad de búsqueda**: rutea un porcentaje de búsquedas a una nueva configuración (diferente modelo, tamaño de fragmento o threshold). Mide métricas de engagement del usuario (click-through rate, tiempo para encontrar, zero-result rate). Promueve configuraciones que mejoren el engagement.
- **Monitorea queries con cero resultados**: trackea queries que no retornan resultados above threshold. Estas indican gaps en tu corpus o issues con tu modelo de embedding. Úsalas para identificar contenido faltante o cambios de modelo necesarios.
- **Implementa autocomplete y sugerencias de query**: usa un índice keyword ligero para sugerencias de autocomplete. Esto reduce la carga en búsqueda vectorial y mejora el UX guiando a los usuarios hacia queries que retornarán resultados.

## Checklist de Producción

- [ ] Embeddings L2-normalizados antes de indexación y búsqueda
- [ ] Métrica de distancia matchea el entrenamiento del modelo de embedding
- [ ] Documentos largos fragmentados y embebidos separadamente
- [ ] Pipeline de preprocesamiento de queries (lowercase, strippear puntuación, expandir abreviaciones)
- [ ] Cache de embeddings de queries por query hash
- [ ] Búsqueda híbrida (vectorial + BM25) con reciprocal rank fusion
- [ ] Filtros de metadatos aplicados antes de búsqueda vectorial
- [ ] Freshness del índice monitoreado (re-indexación en cambios de contenido)
- [ ] Queries con cero resultados trackeadas y analizadas
- [ ] Framework de A/B testing para cambios de configuración de búsqueda

## Consideraciones de Escalado

Al desplegar búsqueda semántica a escala, considera estos factores:

- **Tamaño de índice y memoria**: un embedding de 1536 dimensiones (OpenAI) toma ~6 KB por documento. Para 1M documentos, el índice es ~6 GB en memoria. Usa quantization (int8 o binary) para reducir memoria por 4-32x con pérdida mínima de accuracy. FAISS y Qdrant soportan índices quantized nativamente.
- **Targets de latencia de query**: para e-commerce o búsqueda orientada al usuario, targetea <100ms p99 latency. Índices HNSW logran esto para hasta 10M vectores en una sola máquina. Para índices más grandes, sharda across múltiples nodos y mergeea resultados.
- **Estrategia de re-indexación**: cuando cambias de modelo de embedding o actualizas la lógica de chunking, debes re-indexar todo. Para corpora grandes, haz esto en un despliegue blue-green: construye el índice nuevo alongside el viejo, luego switchea el tráfico cuando el índice nuevo esté listo.
- **Optimización de costos**: las llamadas API de embedding son baratas ($0.02/1M tokens) pero se compounded a escala. Para 1M documentos actualizados semanalmente, embedding cuesta ~$10/semana. Cachea embeddings por content hash para evitar re-embeber documentos sin cambios. Usa modelos open-source (e5, bge) para inferencia self-hosted y eliminar costos de API enteramente.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| Embedding (text-embedding-3-small) | $0.02/1M tokens | OpenAI API, 1536 dims |
| Embedding (text-embedding-3-large) | $0.13/1M tokens | OpenAI API, 3072 dims |
| Embedding (self-hosted bge-large) | $0 | Solo costo de GPU |
| Vector store (pgvector) | $0 | Incluido con Postgres |
| Vector store (Pinecone) | $0-$70/mes | Escala con conteo de vectores |
| FAISS (self-hosted) | $0 | In-memory, sin costo de servicio |

Para 1M documentos re-embebidos mensualmente: ~$2/mes con OpenAI small. Self-hostear bge-large en 1x A10 ($0.75/hr) break-even a ~500M tokens/mes.

## Cuándo No Usar Búsqueda Semántica

- **El match exacto es el use case principal**: si los usuarios buscan por product IDs, SKUs o error codes, keyword search (BM25, Elasticsearch) es más rápido y más accurate. La búsqueda semántica agrega ruido retornando resultados "similares" pero no matching.
- **Tu corpus es <1000 documentos**: para corpora pequeños, keyword search con buen ranking es suficiente. El overhead de generación de embeddings y mantenimiento de índice vectorial no se justifica.
- **Necesitas latencia sub-10ms**: la búsqueda vectorial con HNSW toma 10-50ms. Para requerimientos sub-10ms (autocomplete, typeahead), usa trie-based o prefix search en su lugar.
- **Tu contenido es mayormente numérico o codificado**: los embeddings están diseñados para lenguaje natural. Para datos numéricos (precios, medidas), usa range queries. Para datos codificados (códigos ICD, standards ISO), usa exact match con sinónimos.
- **Compliance requiere resultados explainable**: los scores de similitud vectorial no son intuitivos para end users. "¿Por qué matcheó este documento?" es más difícil de explicar con embeddings que con keyword highlighting. Usa BM25 con términos highlighted para transparencia.
