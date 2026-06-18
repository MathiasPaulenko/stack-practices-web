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

Retrieval-Augmented Generation (RAG) combina un modelo de lenguaje grande con un paso de recuperación de documentos. En lugar de depender únicamente de la memoria paramétrica del LLM, RAG obtiene pasajes relevantes de una base de conocimiento y los inyecta en el prompt. Esto reduce dramáticamente las alucinaciones y permite que el modelo responda preguntas sobre datos privados o recientes.

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

1. **Ingesta**: Los documentos se cargan, limpian y dividen en fragmentos. El tamaño de fragmento (típicamente 200–1000 tokens) equilibra granularidad con preservación de contexto.
2. **Embedding**: Cada fragmento se convierte en un vector de alta dimensión usando un modelo de embeddings. Los vectores capturan significado semántico, no solo coincidencia de palabras clave.
3. **Recuperación**: En tiempo de consulta, la pregunta del usuario también se embebe. La base de datos vectorial devuelve los `k` fragmentos más similares mediante similitud coseno o distancia euclidiana.
4. **Generación**: Los fragmentos recuperados se concatenan en un bloque de contexto y se inyectan en el prompt del LLM. El modelo genera una respuesta fundamentada en el texto proporcionado.

**Compromisos:**
- Tamaño de fragmento: fragmentos más pequeños = recuperación precisa pero menos contexto; fragmentos más grandes = más contexto pero pueden diluir relevancia
- Valor `k`: demasiado bajo pierde contexto importante; demasiado alto desperdicia tokens y puede confundir al modelo
- La calidad del modelo de embeddings impacta directamente en la precisión de recuperación

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| LangChain | Orquestación + chaining | Ecosistema maduro, maneja plantillas de prompt y parsing de salida |
| LlamaIndex | Framework centrado en datos | Conectores integrados para PDFs, SQL, APIs; mejor para datos complejos |
| Haystack | Pipeline modular | Fuerte para evaluación y monitoreo en producción |
| Bases vectoriales | Chroma / Pinecone / Weaviate / pgvector | Chroma para local, Pinecone para gestionado, pgvector si ya usas Postgres |
| Embeddings | OpenAI / Cohere / locales (BGE, E5) | OpenAI por calidad; modelos locales para privacidad y costo |

## Mejores Prácticas

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
