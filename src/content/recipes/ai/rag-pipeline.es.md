---
contentType: recipes
slug: rag-pipeline
title: "Construir un pipeline RAG con LangChain y bases de datos vectoriales"
description: "Cómo construir un pipeline de Retrieval-Augmented Generation (RAG) usando LangChain y bases de datos vectoriales para búsqueda potenciada por IA"
metaDescription: "Construye un pipeline RAG con LangChain, OpenAI y bases de datos vectoriales. Fragmenta documentos, genera embeddings y recupera contexto para respuestas de LLM."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - embeddings
  - llm
  - machine-learning
  - neural-networks
relatedResources:
  - /recipes/semantic-search
  - /recipes/chatbot-openai
  - /recipes/llm-fine-tuning
  - /guides/system-design-interview-guide
  - /guides/software-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye un pipeline RAG con LangChain, OpenAI y bases de datos vectoriales. Fragmenta documentos, genera embeddings y recupera contexto para respuestas de LLM."
  keywords:
    - rag
    - langchain
    - base-datos-vectorial
    - openai
    - embeddings
    - llm
---

## Visión General

Retrieval-Augmented Generation (RAG) combina un modelo de lenguaje grande con un paso de recuperación de documentos. En lugar de depender únicamente de la memoria paramétrica del LLM, [RAG](/recipes/ai/rag-pipeline) obtiene pasajes relevantes de una base de conocimiento y los inyecta en el prompt. Esto reduce dramáticamente las alucinaciones y permite que el modelo responda preguntas sobre datos privados o recientes.

Esta receta construye un pipeline RAG completo: fragmenta documentos, genera embeddings, los almacena en una base de datos vectorial, recupera fragmentos relevantes y genera respuestas con LangChain.

## Cuándo Usar

Usa este recurso cuando:
- Quieres que un LLM responda preguntas basadas en tus propios documentos, no solo en sus datos de entrenamiento
- Necesitas respuestas actualizadas que el modelo base no ha visto
- Quieres reducir alucinaciones en aplicaciones de dominio específico
- Estás construyendo una base de conocimiento, bot de soporte o sistema de Q&A de documentos

## Solución

### Python

```python
from langchain.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI

# 1. Cargar y fragmentar documentos
loader = TextLoader("docs/knowledge_base.txt")
docs = loader.load()
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

# 2. Generar embeddings y almacenar en BD vectorial
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(chunks, embeddings, persist_directory="./chroma_db")

# 3. Configurar recuperador + cadena LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
qa = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever(search_kwargs={"k": 4}),
    return_source_documents=True
)

# 4. Consultar
result = qa({"query": "What is the refund policy?"})
print(result["result"])
for doc in result["source_documents"]:
    print(f"Fuente: {doc.metadata.get('source')}")
```

### JavaScript

```javascript
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { ChatOpenAI } = require('@langchain/openai');
const { RetrievalQAChain } = require('langchain/chains');
const fs = require('fs');

async function buildRag() {
  // 1. Cargar y fragmentar
  const text = fs.readFileSync('docs/knowledge_base.txt', 'utf-8');
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const chunks = await splitter.createDocuments([text]);

  // 2. Embed y almacenar
  const embeddings = new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });
  const vectorstore = await Chroma.fromDocuments(chunks, embeddings, {
    collectionName: 'knowledge_base',
  });

  // 3. Consultar
  const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
  const qa = RetrievalQAChain.fromLLM(llm, vectorstore.asRetriever({ k: 4 }));

  const result = await qa.call({ query: 'What is the refund policy?' });
  console.log(result.text);
}

buildRag();
```

### Java

```java
// Java RAG con Spring AI (ejemplo conceptual simplificado)
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingClient;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.chat.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;

// 1. Cargar y dividir documentos
var reader = new TextReader("docs/knowledge_base.txt");
List<Document> documents = reader.get();
var splitter = new TokenTextSplitter(500, 50);
List<Document> chunks = splitter.split(documents);

// 2. Almacenar embeddings
vectorStore.add(chunks);

// 3. Recuperar fragmentos relevantes
List<Document> relevant = vectorStore.similaritySearch(
    "What is the refund policy?", 4
);

// 4. Construir prompt aumentado
String context = relevant.stream().map(Document::getContent).collect(Collectors.joining("\n---\n"));
Prompt prompt = new Prompt(
    new SystemMessage("Answer using only the provided context.\nContext:\n" + context),
    new UserMessage("What is the refund policy?")
);
String answer = chatClient.call(prompt).getResult().getOutput().getContent();
```

## Explicación

Un pipeline RAG tiene cuatro etapas:

1. **Ingesta**: Los documentos se cargan, limpian y dividen en fragmentos. Para manejo de documentos, consulta [validación de archivos](/recipes/file-handling/file-upload-validation). El tamaño de fragmento (típicamente 200–1000 tokens) equilibra granularidad con preservación de contexto.
2. **Embedding**: Cada fragmento se convierte en un vector de alta dimensión usando un modelo de embeddings. Los vectores capturan [significado semántico](/recipes/ai/semantic-search), no solo coincidencia de palabras clave.
3. **Recuperación**: En tiempo de consulta, la pregunta del usuario también se embebe. La base de datos vectorial devuelve los `k` fragmentos más similares mediante similitud coseno o distancia euclidiana.
4. **Generación**: Los fragmentos recuperados se concatenan en un bloque de contexto y se inyectan en el prompt del LLM. El modelo genera una respuesta fundamentada en el texto proporcionado.

**Compromisos:**
- Tamaño de fragmento: fragmentos más pequeños = recuperación precisa pero menos contexto; fragmentos más grandes = más contexto pero pueden diluir relevancia
- Valor `k`: demasiado bajo pierde contexto importante; demasiado alto desperdicia tokens y puede confundir al modelo
- La calidad del modelo de embeddings impacta directamente en la precisión de recuperación

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| LangChain | Orquestación + chaining | Ecosistema maduro, maneja [plantillas de prompt](/recipes/ai/prompt-engineering) y parsing de salida |
| LlamaIndex | Framework centrado en datos | Conectores integrados para PDFs, SQL, APIs; mejor para datos complejos |
| Haystack | Pipeline modular | Fuerte para evaluación y monitoreo en producción |
| Bases vectoriales | Chroma / Pinecone / Weaviate / pgvector | Chroma para local, Pinecone para gestionado, pgvector si ya usas Postgres |
| Embeddings | OpenAI / Cohere / locales (BGE, E5) | OpenAI por calidad; modelos locales para privacidad y costo |

## Lo que funciona

1. Agrega metadatos (nombre de archivo, número de página) a los fragmentos para trazabilidad y citación
2. Usa `chunk_overlap` (10–20% del tamaño de fragmento) para evitar dividir en medio de oraciones
3. Filtra fragmentos recuperados con umbral de relevancia para evitar inyectar texto no relacionado
4. Indica al LLM que cite fuentes y se niegue a responder si la respuesta no está en el contexto
5. Re-indexa documentos periódicamente o usa detección de cambios para mantener la tienda vectorial actualizada

## Errores Comunes

1. **Fragmentos demasiado grandes** — un fragmento de 2000 tokens diluye relevancia y desperdicia contexto del prompt
2. **Sin overlap** — dividir en medio de una oración pierde contexto entre límites de fragmentos
3. **Ignorar metadatos** — los usuarios necesitan saber de dónde proviene una respuesta
4. **Almacenar HTML/PDF crudo** — siempre extrae texto limpio antes de embeber
5. **Sin evaluación** — mide precisión de recuperación y corrección de respuestas con un conjunto de prueba

## Preguntas Frecuentes

### ¿Qué tamaño de fragmento debo usar?

Comienza con 500 tokens y 50 tokens de overlap. Evalúa con consultas reales y ajusta según la densidad de tu contenido. La documentación de código a menudo necesita fragmentos más pequeños; los contratos legales pueden necesitar fragmentos más grandes.

### ¿Puedo usar RAG sin LangChain?

Sí. LangChain simplifica la orquestación, pero puedes construir el pipeline manualmente: dividir texto → embeber con API → almacenar en cualquier base de datos vectorial → recuperar con búsqueda de similitud → formatear prompt → llamar LLM.

### ¿Cómo manejo actualizaciones de documentos?

Rastrea fragmentos por ID de documento. En actualización, elimina fragmentos antiguos por ID e inserta los nuevos. Para corpus grandes, usa indexación incremental con timestamps o checksums para detectar cambios.

### ¿Cómo evalúo la calidad del RAG?

Construye un conjunto de prueba de 50-100 preguntas con respuestas correctas conocidas. Mide dos métricas:

1. **Precisión de recuperación**: ¿la búsqueda vectorial retornó los fragmentos correctos? Verifica si el documento fuente aparece en los top-k resultados.
2. **Corrección de respuestas**: ¿el LLM generó una respuesta precisa a partir del contexto recuperado? Usa evaluación humana o LLM-as-judge con una rúbrica.

Trackea estas métricas a lo largo del tiempo a medida que cambias el tamaño de fragmento, modelo de embedding o plantilla de prompt. Usa frameworks como Ragas o TruLens para evaluación automatizada.

### ¿Qué modelo de embedding debería usar?

Para la mayoría de aplicaciones, `text-embedding-3-small` (OpenAI) ofrece un buen balance de calidad, costo y velocidad. Para aplicaciones sensibles a privacidad, usa `all-MiniLM-L6-v2` (sentence-transformers) localmente. Para contenido multilingüe, considera `multilingual-e5-large` o embeddings multilingües de Cohere.

### ¿Cómo manejo documentos multi-formato (PDF, HTML, Markdown)?

Usa los document loaders de LangChain: `PyPDFLoader` para PDFs, `UnstructuredHTMLLoader` para HTML, `TextLoader` para Markdown. Cada loader extrae texto limpio y metadatos. Pasa todos los documentos por el mismo pipeline de chunking y embedding. Almacena el formato fuente en metadatos para filtering.

### ¿Puedo usar RAG con una base de datos SQL en lugar de un vector store?

Sí. Usa `pgvector` (extensión de PostgreSQL) para almacenar embeddings junto a tus datos relacionales. Esto te permite combinar búsqueda de similitud vectorial con filtros SQL (ej. "encontrar documentos sobre Python publicados después de 2024-01-01"). Para MySQL, usa `MyVector` o hospeda una base de datos vectorial separada.

## Errores comunes adicionales

- **No deduplicar fragmentos** — si el mismo documento se ingiere dos veces, los fragmentos duplicados sesgan los resultados de recuperación y desperdician almacenamiento. Usa un content hash o document ID para detectar duplicados antes de insertar.
- **Usar la métrica de distancia equivocada** — cosine similarity y Euclidean distance producen rankings diferentes. Matchea la métrica al entrenamiento del modelo de embedding. Los embeddings de OpenAI funcionan mejor con cosine similarity.
- **No manejar fragmentos vacíos o muy cortos** — fragmentos con menos de 10 tokens producen embeddings ruidosos. Fíltralos durante la ingestión o mergea con fragmentos adyacentes.
- **Ignorar versionamiento del modelo de embedding** — cuando cambias de modelo de embedding, todos los embeddings existentes se vuelven inválidos. Re-indexa todo el corpus y actualiza la versión del modelo en tu configuración.
- **No testear recuperación con queries reales de usuarios** — las queries sintéticas de test pueden no reflejar cómo los usuarios realmente formulan preguntas. Recopila queries reales de logs y úsalas como tu conjunto de evaluación.
- **Almacenar embeddings sin metadatos** — sin metadatos de fuente, página o sección, no puedes filtrar o citar resultados. Siempre adjunta metadatos al momento de ingesta.
- **Usar un solo tamaño de fragmento para todos los tipos de documento** — documentación de código, contratos legales y artículos de noticias tienen estructuras diferentes. Ajusta el tamaño de fragmento y overlap por tipo de documento para recuperación óptima.
- **No implementar comportamiento de fallback** — cuando el vector store no retorna fragmentos relevantes (todos below threshold), el LLM debería decir "No sé" en lugar de alucinar una respuesta desde sus datos de entrenamiento.

## Buenas Prácticas

- **Usa modelos de re-ranking**: después de recuperar top-20 fragmentos vía búsqueda vectorial, re-rankea con un modelo cross-encoder como `bge-reranker` o Cohere Rerank. Re-ranking mejora precisión scoreando pares query-fragmento directamente en lugar de depender solo en similitud de embedding.
- **Implementa expansión de queries**: transforma la query del usuario en múltiples variaciones antes de la recuperación. Usa un LLM para generar 2-3 paráfrasis de la query, embebe todas las variaciones, y mergea resultados. Esto captura documentos que usan terminología diferente.
- **Añade una capa de guardrails**: antes de enviar el contexto recuperado al LLM, filtra fragmentos por PII, contenido tóxico o material off-topic. Esto previene que el LLM genere respuestas basadas en contexto inapropiado.
- **Trackea métricas de recuperación en producción**: loguea los top-k fragmentos recuperados para cada query, sus scores de similitud, y si el usuario encontró útil la respuesta. Usa este feedback para tunear tamaño de fragmento, modelo de embedding y parámetros de recuperación.
- **Usa parent-child chunking**: almacena fragmentos pequeños (200 tokens) para recuperación precisa pero fetchea el fragmento padre (1000 tokens) para contexto. Esto le da al LLM suficiente contexto circundante sin diluir la precisión de recuperación.
- **Implementa indexación incremental**: en lugar de re-indexar todo el corpus en cada update, trackea versiones de documentos y solo re-embebe documentos cambiados. Usa un content hash para detectar qué documentos necesitan re-indexación.
- **Setea monitoreo de calidad de recuperación**: trackea métricas como recall@k, mean reciprocal rank y relevancia de respuestas a lo largo del tiempo. Alerta cuando la calidad caiga, lo que puede indicar embeddings stale, cambios de modelo o problemas de datos.

## Checklist de Producción

- [ ] Fragmentos deduplicados por content hash antes de inserción
- [ ] Métrica de distancia matchea el modelo de embedding (cosine para OpenAI)
- [ ] Fragmentos vacíos o muy cortos filtrados durante ingestión
- [ ] Versión del modelo de embedding trackeada en configuración
- [ ] Metadatos adjuntos a cada fragmento (fuente, página, sección)
- [ ] Tamaño de fragmento y overlap tuneados por tipo de documento
- [ ] Comportamiento de fallback cuando ningún fragmento cumple el threshold de relevancia
- [ ] Modelo de re-ranking aplicado después de recuperación vectorial inicial
- [ ] Pipeline de indexación incremental para actualizaciones de documentos
- [ ] Métricas de recuperación (recall@k, MRR) trackeadas a lo largo del tiempo

## Consideraciones de Escalado

Al desplegar pipelines RAG a escala, considera estos factores:

- **Elección de vector store**: para <100K documentos, pgvector es suficiente y evita un servicio separado. Para 100K-1M documentos, usa Pinecone o Weaviate con infraestructura managed. Para 1M+ documentos, self-hostea Milvus o Qdrant con búsqueda GPU-accelerated.
- **Costo de embedding**: indexar 100K documentos con `text-embedding-3-small` cuesta ~$1. Re-indexar en cada cambio de documento es costoso. Implementa indexación incremental: trackea content hashes de documentos y solo re-embebe documentos cambiados.
- **Latencia de recuperación**: búsqueda vectorial en 1M documentos toma 10-50 ms con un índice optimizado (HNSW). Re-ranking con un cross-encoder agrega 50-100 ms. Para latencia total sub-100ms, usa approximate nearest neighbor (ANN) search y limita el re-ranking a top-20 resultados.
- **Gestión del context window**: el context window del LLM limita cuántos fragmentos puedes alimentarle. GPT-4o soporta 128K tokens, pero alimentar más de 10K tokens de contexto aumenta el costo y puede reducir la calidad de la respuesta. Selecciona top 3-5 fragmentos después del re-ranking.
- **Frecuencia de actualización de documentos**: para contenido frecuentemente actualizado (noticias, catálogos de productos), setea un pipeline de re-indexación triggered por webhooks. Para contenido estático (documentación, políticas), un batch re-index nocturno es suficiente.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| Embedding (text-embedding-3-small) | $0.02/1M tokens | OpenAI API |
| Embedding (self-hosted e5-large) | $0 | Solo costo de GPU |
| Vector store (Pinecone starter) | $0 | 100K vectores, 1 namespace |
| Vector store (Pinecone standard) | $70/mes | 5M vectores, namespaces ilimitados |
| LLM generation (GPT-4o) | $5/1M input, $15/1M output | Por query: ~2K input + 500 output |
| LLM generation (GPT-4o-mini) | $0.15/1M input, $0.60/1M output | 30x más barato, bueno para Q&A simple |

Para 10K queries/día con GPT-4o: ~$150/día. Switchea a GPT-4o-mini para queries simples y reduce costos en 90%.

## Cuándo No Usar RAG

- **Tu base de conocimiento es pequeña (<50 documentos)**: con pocos documentos, fittalos todos en el context window del LLM directamente. RAG agrega complejidad de infraestructura sin beneficio cuando el corpus entero fittea en un solo prompt.
- **Las respuestas requieren quotes exactos, no resúmenes**: RAG recupera fragmentos, no documentos completos. Si los usuarios necesitan texto verbatim (cláusulas legales, samples de código), retorna documentos completos con keyword search en su lugar.
- **Tus documentos son altamente estructurados (tablas, formularios)**: los embeddings strugglean con datos tabulares. Usa un enfoque text-to-SQL o structured query language en lugar de vector search para bases de datos y spreadsheets.
- **Se requiere data real-time**: los índices RAG son eventually consistent. Si necesitas respuestas que reflejen data que cambió hace segundos, queryea la fuente directamente en lugar de depender del índice.
- **Necesitas fuentes citadas para cada claim**: aunque RAG puede proporcionar source chunks, no garantiza que cada oración en la respuesta sea traceable. Para use cases académicos o legales, usa un enfoque quote-based donde el LLM solo puede outputear texto de pasajes recuperados.

## Benchmarks de Rendimiento

| Componente | Latencia | Throughput | Notas |
|-----------|---------|-----------|-------|
| Embedding (text-embedding-3-small) | 50-200ms | 10K tokens/req | OpenAI API |
| Vector search (pgvector, 100K docs) | 5-20ms | 100 QPS | HNSW index |
| Vector search (Pinecone, 1M docs) | 10-50ms | 200 QPS | Servicio managed |
| Re-ranking (cross-encoder) | 50-100ms | 20 docs/batch | bge-reranker-large |
| LLM generation (GPT-4o) | 1-5s | 50 concurrentes | Streaming habilitado |

Pipeline RAG end-to-end: 200ms-6s por query. El step de LLM generation domina la latencia total. Pre-computa embeddings y cachea queries comunes para reducir latencia p99.
