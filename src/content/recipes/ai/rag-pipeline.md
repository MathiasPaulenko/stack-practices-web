---
contentType: recipes
slug: rag-pipeline
title: "Build a RAG Pipeline with LangChain and Vector Databases"
description: "How to build a Retrieval-Augmented Generation (RAG) pipeline using LangChain and vector databases for AI-powered search"
metaDescription: "Build a RAG pipeline with LangChain, OpenAI, and vector databases. Chunk documents, generate embeddings, and retrieve context for LLM answers."
difficulty: intermediate
topics:
  - ai
tags:
  - rag
  - langchain
  - vector-database
  - openai
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
  metaDescription: "Build a RAG pipeline with LangChain, OpenAI, and vector databases. Chunk documents, generate embeddings, and retrieve context for LLM answers."
  keywords:
    - rag
    - langchain
    - vector-database
    - openai
    - embeddings
    - llm
---
## Overview

Retrieval-Augmented Generation (RAG) combines a large language model with a document retrieval step. Instead of relying solely on the LLM's parametric memory, RAG fetches relevant passages from a knowledge base and injects them into the prompt. This dramatically reduces hallucinations and enables the model to answer questions about private or recent data.

This recipe builds a complete RAG pipeline: chunk documents, generate embeddings, store them in a vector database, retrieve relevant chunks, and generate answers with LangChain.

## When to Use

Use this resource when:
- You want an LLM to answer questions based on your own documents, not just its training data
- You need up-to-date answers that the base model has not seen
- You want to reduce hallucinations in domain-specific applications
- You are building a knowledge base, help desk bot, or document Q&A system

## Solution

### Python

```python
from langchain.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI

# 1. Load and chunk documents
loader = TextLoader("docs/knowledge_base.txt")
docs = loader.load()
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

# 2. Generate embeddings and store in vector DB
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(chunks, embeddings, persist_directory="./chroma_db")

# 3. Set up retriever + LLM chain
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
qa = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever(search_kwargs={"k": 4}),
    return_source_documents=True
)

# 4. Query
result = qa({"query": "What is the refund policy?"})
print(result["result"])
for doc in result["source_documents"]:
    print(f"Source: {doc.metadata.get('source')}")
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
  // 1. Load and chunk
  const text = fs.readFileSync('docs/knowledge_base.txt', 'utf-8');
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const chunks = await splitter.createDocuments([text]);

  // 2. Embed and store
  const embeddings = new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });
  const vectorstore = await Chroma.fromDocuments(chunks, embeddings, {
    collectionName: 'knowledge_base',
  });

  // 3. Query
  const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
  const qa = RetrievalQAChain.fromLLM(llm, vectorstore.asRetriever({ k: 4 }));

  const result = await qa.call({ query: 'What is the refund policy?' });
  console.log(result.text);
}

buildRag();
```

### Java

```java
// Java RAG with Spring AI (simplified conceptual example)
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingClient;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.chat.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;

// 1. Load and split documents
var reader = new TextReader("docs/knowledge_base.txt");
List<Document> documents = reader.get();
var splitter = new TokenTextSplitter(500, 50);
List<Document> chunks = splitter.split(documents);

// 2. Store embeddings
vectorStore.add(chunks);

// 3. Retrieve relevant chunks
List<Document> relevant = vectorStore.similaritySearch(
    "What is the refund policy?", 4
);

// 4. Build augmented prompt
String context = relevant.stream().map(Document::getContent).collect(Collectors.joining("\n---\n"));
Prompt prompt = new Prompt(
    new SystemMessage("Answer using only the provided context.\nContext:\n" + context),
    new UserMessage("What is the refund policy?")
);
String answer = chatClient.call(prompt).getResult().getOutput().getContent();
```

## Explanation

A RAG pipeline has four stages:

1. **Ingestion**: Documents are loaded, cleaned, and split into chunks. Chunk size (typically 200–1000 tokens) balances granularity with context preservation.
2. **Embedding**: Each chunk is converted into a high-dimensional vector using an embedding model. Vectors capture semantic meaning, not just keyword overlap.
3. **Retrieval**: At query time, the user's question is also embedded. The vector database returns the `k` most similar chunks via cosine similarity or Euclidean distance.
4. **Generation**: Retrieved chunks are concatenated into a context block and injected into the LLM prompt. The model generates an answer grounded in the provided text.

**Trade-offs:**
- Chunk size: smaller chunks = precise retrieval but less context; larger chunks = more context but may dilute relevance
- `k` value: too low misses important context; too high wastes tokens and can confuse the model
- Embedding model quality directly impacts retrieval accuracy

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| LangChain | Orchestration + chaining | Mature ecosystem, handles prompt templates and output parsing |
| LlamaIndex | Data-centric framework | Built-in connectors for PDFs, SQL, APIs; better for complex data |
| Haystack | Modular pipeline | Strong for evaluation and production monitoring |
| Vector DBs | Chroma / Pinecone / Weaviate / pgvector | Chroma for local, Pinecone for managed, pgvector if you already use Postgres |
| Embeddings | OpenAI / Cohere / local (BGE, E5) | OpenAI for quality; local models for privacy and cost |

## Best Practices

1. Add metadata (source filename, page number) to chunks for traceability and citation
2. Use `chunk_overlap` (10–20% of chunk size) to prevent splitting across sentence boundaries
3. Filter retrieved chunks with a relevance threshold to avoid injecting unrelated text
4. Prompt the LLM to cite sources and refuse if the answer is not in the context
5. Re-index documents periodically or use change detection to keep the vector store current

## Common Mistakes

1. **Chunks too large** — a 2000-token chunk dilutes relevance and wastes prompt context
2. **No overlap** — splitting mid-sentence loses context across chunk boundaries
3. **Ignoring metadata** — users need to know where an answer came from
4. **Storing raw HTML/PDF** — always extract clean text before embedding
5. **No evaluation** — measure retrieval accuracy and answer correctness with a test set

## Frequently Asked Questions

### What chunk size should I use?

Start with 500 tokens and 50-token overlap. Evaluate with real queries and adjust based on your content density. Code documentation often needs smaller chunks; legal contracts may need larger ones.

### Can I use RAG without LangChain?

Yes. LangChain simplifies orchestration, but you can build the pipeline manually: split text → embed with an API → store in any vector database → retrieve with similarity search → format prompt → call LLM.

### How do I handle document updates?

Track chunks by document ID. On update, delete old chunks by ID and re-insert new ones. For large corpora, use incremental indexing with timestamps or checksums to detect changes.
