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
  - /recipes/ai-agents
  - /recipes/prompt-engineering
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

Retrieval-Augmented Generation (RAG) combines a large language model with a document retrieval step. Instead of relying solely on the LLM's parametric memory, [RAG](/recipes/ai/rag-pipeline) fetches relevant passages from a knowledge base and injects them into the prompt. This dramatically reduces hallucinations and enables the model to answer questions about private or recent data.

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

1. **Ingestion**: Documents are loaded, cleaned, and split into chunks. For document handling, see [file upload validation](/recipes/file-handling/file-upload-validation). Chunk size (typically 200–1000 tokens) balances granularity with context preservation.
2. **Embedding**: Each chunk is converted into a high-dimensional vector using an embedding model. Vectors capture [semantic meaning](/recipes/ai/semantic-search), not just keyword overlap.
3. **Retrieval**: At query time, the user's question is also embedded. The vector database returns the `k` most similar chunks via cosine similarity or Euclidean distance.
4. **Generation**: Retrieved chunks are concatenated into a context block and injected into the LLM prompt. The model generates an answer grounded in the provided text.

**Trade-offs:**
- Chunk size: smaller chunks = precise retrieval but less context; larger chunks = more context but may dilute relevance
- `k` value: too low misses important context; too high wastes tokens and can confuse the model
- Embedding model quality directly impacts retrieval accuracy

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| LangChain | Orchestration + chaining | Mature ecosystem, handles [prompt templates](/recipes/ai/prompt-engineering) and output parsing |
| LlamaIndex | Data-centric framework | Built-in connectors for PDFs, SQL, APIs; better for complex data |
| Haystack | Modular pipeline | Strong for evaluation and production monitoring |
| Vector DBs | Chroma / Pinecone / Weaviate / pgvector | Chroma for local, Pinecone for managed, pgvector if you already use Postgres |
| Embeddings | OpenAI / Cohere / local (BGE, E5) | OpenAI for quality; local models for privacy and cost |

## What Works

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

### How do I evaluate RAG quality?

Build a test set of 50-100 questions with known correct answers. Measure two metrics:

1. **Retrieval accuracy**: did the vector search return the right chunks? Check if the source document appears in the top-k results.
2. **Answer correctness**: did the LLM generate an accurate answer from the retrieved context? Use human evaluation or LLM-as-judge with a rubric.

Track these metrics over time as you change chunk size, embedding model, or prompt template. Use frameworks like Ragas or TruLens for automated evaluation.

### What embedding model should I use?

For most applications, `text-embedding-3-small` (OpenAI) offers a good balance of quality, cost, and speed. For privacy-sensitive applications, use `all-MiniLM-L6-v2` (sentence-transformers) locally. For multilingual content, consider `multilingual-e5-large` or Cohere's multilingual embeddings.

### How do I handle multi-format documents (PDF, HTML, Markdown)?

Use LangChain's document loaders: `PyPDFLoader` for PDFs, `UnstructuredHTMLLoader` for HTML, `TextLoader` for Markdown. Each loader extracts clean text and metadata. Run all documents through the same chunking and embedding pipeline. Store the source format in metadata for filtering.

### Can I use RAG with a SQL database instead of a vector store?

Yes. Use `pgvector` (PostgreSQL extension) to store embeddings alongside your relational data. This lets you combine vector similarity search with SQL filters (e.g., "find documents about Python published after 2024-01-01"). For MySQL, use `MyVector` or host a separate vector database.

## Additional Common Mistakes

- **Not deduplicating chunks** — if the same document is ingested twice, duplicate chunks skew retrieval results and waste storage. Use a content hash or document ID to detect duplicates before inserting.
- **Using the wrong distance metric** — cosine similarity and Euclidean distance produce different rankings. Match the metric to your embedding model's training. OpenAI embeddings work best with cosine similarity.
- **Not handling empty or very short chunks** — chunks with fewer than 10 tokens produce noisy embeddings. Filter them out during ingestion or merge with adjacent chunks.
- **Ignoring embedding model versioning** — when you switch embedding models, all existing embeddings become invalid. Re-index the entire corpus and update the model version in your configuration.
- **Not testing retrieval with real user queries** — synthetic test queries may not reflect how users actually phrase questions. Collect real queries from logs and use them as your evaluation set.
- **Storing embeddings without metadata** — without source, page, or section metadata, you cannot filter or cite results. Always attach metadata at ingestion time.
- **Using a single chunk size for all document types** — code documentation, legal contracts, and news articles have different structures. Adjust chunk size and overlap per document type for optimal retrieval.
- **Not implementing fallback behavior** — when the vector store returns no relevant chunks (all below threshold), the LLM should say "I don't know" instead of hallucinating an answer from its training data.

## Best Practices

- **Use re-ranking models**: after retrieving top-20 chunks via vector search, re-rank them with a cross-encoder model like `bge-reranker` or Cohere Rerank. Re-ranking improves precision by scoring query-chunk pairs directly instead of relying on embedding similarity alone.
- **Implement query expansion**: transform the user's query into multiple variations before retrieval. Use an LLM to generate 2-3 paraphrases of the query, embed all variations, and merge results. This catches documents that use different terminology.
- **Add a guardrails layer**: before sending the retrieved context to the LLM, filter chunks for PII, toxic content, or off-topic material. This prevents the LLM from generating responses based on inappropriate context.
- **Track retrieval metrics in production**: log the top-k chunks retrieved for each query, their similarity scores, and whether the user found the answer useful. Use this feedback to tune chunk size, embedding model, and retrieval parameters.
- **Use parent-child chunking**: store small chunks (200 tokens) for precise retrieval but fetch the parent chunk (1000 tokens) for context. This gives the LLM enough surrounding context without diluting retrieval precision.
- **Implement incremental indexing**: instead of re-indexing the entire corpus on every update, track document versions and only re-embed changed documents. Use a content hash to detect which documents need re-indexing.
- **Set up monitoring for retrieval quality**: track metrics like recall@k, mean reciprocal rank, and answer relevance over time. Alert when quality drops, which may indicate stale embeddings, model changes, or data issues.

## Production Checklist

- [ ] Chunks deduplicated by content hash before insertion
- [ ] Distance metric matches embedding model (cosine for OpenAI)
- [ ] Empty or very short chunks filtered during ingestion
- [ ] Embedding model version tracked in configuration
- [ ] Metadata attached to every chunk (source, page, section)
- [ ] Chunk size and overlap tuned per document type
- [ ] Fallback behavior when no chunks meet relevance threshold
- [ ] Re-ranking model applied after initial vector retrieval
- [ ] Incremental indexing pipeline for document updates
- [ ] Retrieval metrics (recall@k, MRR) tracked over time

## Scaling Considerations

When deploying RAG pipelines at scale, consider these factors:

- **Vector store choice**: for <100K documents, pgvector is sufficient and avoids a separate service. For 100K-1M documents, use Pinecone or Weaviate with managed infrastructure. For 1M+ documents, self-host Milvus or Qdrant with GPU-accelerated search.
- **Embedding cost**: indexing 100K documents with `text-embedding-3-small` costs ~$1. Re-indexing on every document change is expensive. Implement incremental indexing: track document content hashes and only re-embed changed documents.
- **Retrieval latency**: vector search on 1M documents takes 10-50 ms with an optimized index (HNSW). Re-ranking with a cross-encoder adds 50-100 ms. For sub-100ms total latency, use approximate nearest neighbor (ANN) search and limit re-ranking to top-20 results.
- **Context window management**: the LLM's context window limits how many chunks you can feed it. GPT-4o supports 128K tokens, but feeding more than 10K tokens of context increases cost and may reduce answer quality. Select top 3-5 chunks after re-ranking.
- **Document update frequency**: for frequently updated content (news, product catalogs), set up a webhook-triggered re-indexing pipeline. For static content (documentation, policies), a nightly batch re-index is sufficient.

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| Embedding (text-embedding-3-small) | $0.02/1M tokens | OpenAI API |
| Embedding (self-hosted e5-large) | $0 | GPU cost only |
| Vector store (Pinecone starter) | $0 | 100K vectors, 1 namespace |
| Vector store (Pinecone standard) | $70/month | 5M vectors, unlimited namespaces |
| LLM generation (GPT-4o) | $5/1M input, $15/1M output | Per query: ~2K input + 500 output |
| LLM generation (GPT-4o-mini) | $0.15/1M input, $0.60/1M output | 30x cheaper, good for simple Q&A |

For 10K queries/day with GPT-4o: ~$150/day. Switch to GPT-4o-mini for simple queries to cut costs by 90%.

## When Not to Use RAG

- **Your knowledge base is small (<50 documents)**: with few documents, fit them all into the LLM's context window directly. RAG adds infrastructure complexity without benefit when the entire corpus fits in a single prompt.
- **Answers require exact quotes, not summaries**: RAG retrieves chunks, not full documents. If users need verbatim text (legal clauses, code samples), return full documents with keyword search instead.
- **Your documents are highly structured (tables, forms)**: embeddings struggle with tabular data. Use a text-to-SQL approach or structured query language instead of vector search for databases and spreadsheets.
- **Real-time data is required**: RAG indexes are eventually consistent. If you need answers reflecting data that changed seconds ago, query the source directly instead of relying on the index.
- **You need cited sources for every claim**: while RAG can provide source chunks, it does not guarantee that every sentence in the answer is traceable. For academic or legal use cases, use a quote-based approach where the LLM can only output text from retrieved passages.

## Performance Benchmarks

| Component | Latency | Throughput | Notes |
|-----------|---------|-----------|-------|
| Embedding (text-embedding-3-small) | 50-200ms | 10K tokens/req | OpenAI API |
| Vector search (pgvector, 100K docs) | 5-20ms | 100 QPS | HNSW index |
| Vector search (Pinecone, 1M docs) | 10-50ms | 200 QPS | Managed service |
| Re-ranking (cross-encoder) | 50-100ms | 20 docs/batch | bge-reranker-large |
| LLM generation (GPT-4o) | 1-5s | 50 concurrent | Streaming enabled |

End-to-end RAG pipeline: 200ms-6s per query. The LLM generation step dominates total latency. Pre-compute embeddings and cache common queries to reduce p99 latency.
