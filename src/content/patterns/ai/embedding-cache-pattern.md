---
contentType: patterns
slug: embedding-cache-pattern
title: "Embedding Cache Pattern"
description: "Cache LLM embeddings to reduce API calls and cost. Store embeddings with a content hash key and serve from cache on repeated inputs."
metaDescription: "Cache LLM embeddings to cut API costs. Store embeddings keyed by content hash, serve from cache on repeated inputs, and invalidate on model changes."
difficulty: intermediate
topics:
  - ai
  - caching
tags:
  - embedding-cache
  - pattern
  - ai-pattern
  - cost-optimization
  - embeddings
  - caching
  - vector-search
relatedResources:
  - /patterns/ai/rag-hybrid-search-pattern
  - /recipes/ai/python-openai-embeddings-cosine
  - /recipes/ai/python-vector-database-pinecone
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cache LLM embeddings to cut API costs. Store embeddings keyed by content hash, serve from cache on repeated inputs, and invalidate on model changes."
  keywords:
    - embedding cache pattern
    - cache embeddings
    - ai cost optimization
    - embedding api cache
    - vector cache
    - content hash embedding
    - reduce embedding api calls
---

# Embedding Cache Pattern

## Overview

Generating embeddings via API (OpenAI, Cohere, HuggingFace) costs money per request. When the same text is embedded repeatedly — common in RAG pipelines, semantic search, and deduplication — those API calls are wasted. The Embedding Cache Pattern stores embeddings keyed by a hash of the text and model identifier. On subsequent requests for the same text, the cached embedding is returned without calling the API.

The cache key combines a content hash (SHA-256 of the text) with the model name and version. This ensures that switching embedding models invalidates the cache automatically, preventing stale embeddings from a different model from being served.

## When to Use

Use the Embedding Cache Pattern when:
- Your RAG pipeline re-embeds the same documents on every query or index refresh
- You run semantic similarity checks on a fixed corpus repeatedly
- Embedding API costs are a significant portion of your bill
- You batch-embed documents and want to skip already-processed items
- Examples: RAG systems, semantic search engines, deduplication pipelines, clustering workflows

## Solution

### Python

```python
import hashlib
import json
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

@dataclass
class CacheEntry:
    embedding: List[float]
    model: str
    created_at: float
    access_count: int = 0

class EmbeddingCache:
    def __init__(self, ttl_seconds: float = 86400 * 30):
        self._cache: Dict[str, CacheEntry] = {}
        self.ttl = ttl_seconds
        self.hits = 0
        self.misses = 0

    def _make_key(self, text: str, model: str) -> str:
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return f"{model}:{content_hash}"

    def get(self, text: str, model: str) -> Optional[List[float]]:
        key = self._make_key(text, model)
        entry = self._cache.get(key)

        if entry is None:
            self.misses += 1
            return None

        if time.time() - entry.created_at > self.ttl:
            del self._cache[key]
            self.misses += 1
            return None

        entry.access_count += 1
        self.hits += 1
        return entry.embedding

    def set(self, text: str, model: str, embedding: List[float]) -> None:
        key = self._make_key(text, model)
        self._cache[key] = CacheEntry(
            embedding=embedding,
            model=model,
            created_at=time.time(),
        )

    def get_or_compute(
        self,
        text: str,
        model: str,
        embed_fn: callable,
    ) -> List[float]:
        cached = self.get(text, model)
        if cached is not None:
            return cached

        embedding = embed_fn(text, model)
        self.set(text, model, embedding)
        return embedding

    def batch_get_or_compute(
        self,
        texts: List[str],
        model: str,
        batch_embed_fn: callable,
    ) -> List[List[float]]:
        results: List[Optional[List[float]]] = [None] * len(texts)
        uncached_indices: List[int] = []

        for i, text in enumerate(texts):
            cached = self.get(text, model)
            if cached is not None:
                results[i] = cached
            else:
                uncached_indices.append(i)

        if uncached_indices:
            uncached_texts = [texts[i] for i in uncached_indices]
            new_embeddings = batch_embed_fn(uncached_texts, model)

            for idx, embedding in zip(uncached_indices, new_embeddings):
                results[idx] = embedding
                self.set(texts[idx], model, embedding)

        return [r for r in results if r is not None]

    def stats(self) -> Dict[str, int]:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "size": len(self._cache),
            "hit_rate": self.hits / max(self.hits + self.misses, 1),
        }

    def invalidate_model(self, model: str) -> int:
        keys_to_remove = [k for k in self._cache if k.startswith(f"{model}:")]
        for k in keys_to_remove:
            del self._cache[k]
        return len(keys_to_remove)

# Mock embedding function
def mock_embed(text: str, model: str) -> List[float]:
    print(f"  [API CALL] Embedding '{text[:30]}...' with {model}")
    return [len(text) * 0.01, hash(text) % 100 / 100, 0.5]

def mock_batch_embed(texts: List[str], model: str) -> List[List[float]]:
    print(f"  [BATCH API CALL] Embedding {len(texts)} texts with {model}")
    return [mock_embed(t, model) for t in texts]

# Usage
cache = EmbeddingCache(ttl_seconds=3600)

documents = [
    "Python async programming guide",
    "JavaScript event loop explained",
    "Python async programming guide",
    "Database indexing strategies",
    "JavaScript event loop explained",
]

print("=== Single embeddings ===")
for doc in documents:
    emb = cache.get_or_compute(doc, "text-embedding-3-small", mock_embed)
    print(f"  Result: {emb[:2]}...")

print(f"\nCache stats: {cache.stats()}")

print("\n=== Batch embeddings ===")
cache2 = EmbeddingCache()
new_docs = ["New document one", "New document two", "Python async programming guide"]
embs = cache2.batch_get_or_compute(new_docs, "text-embedding-3-small", mock_batch_embed)
print(f"Cache stats: {cache2.stats()}")

print("\n=== Model invalidation ===")
removed = cache.invalidate_model("text-embedding-3-small")
print(f"Removed {removed} entries")
print(f"Cache stats: {cache.stats()}")
```

### JavaScript

```javascript
const crypto = require("crypto");

class CacheEntry {
  constructor(embedding, model, createdAt) {
    this.embedding = embedding;
    this.model = model;
    this.createdAt = createdAt;
    this.accessCount = 0;
  }
}

class EmbeddingCache {
  constructor(ttlSeconds = 86400 * 30) {
    this.cache = new Map();
    this.ttl = ttlSeconds;
    this.hits = 0;
    this.misses = 0;
  }

  _makeKey(text, model) {
    const hash = crypto.createHash("sha256").update(text, "utf8").digest("hex");
    return `${model}:${hash}`;
  }

  get(text, model) {
    const key = this._makeKey(text, model);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() / 1000 - entry.createdAt > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.accessCount++;
    this.hits++;
    return entry.embedding;
  }

  set(text, model, embedding) {
    const key = this._makeKey(text, model);
    this.cache.set(key, new CacheEntry(embedding, model, Date.now() / 1000));
  }

  getOrCompute(text, model, embedFn) {
    const cached = this.get(text, model);
    if (cached) return cached;

    const embedding = embedFn(text, model);
    this.set(text, model, embedding);
    return embedding;
  }

  batchGetOrCompute(texts, model, batchEmbedFn) {
    const results = new Array(texts.length).fill(null);
    const uncachedIndices = [];

    for (let i = 0; i < texts.length; i++) {
      const cached = this.get(texts[i], model);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
      }
    }

    if (uncachedIndices.length > 0) {
      const uncachedTexts = uncachedIndices.map(i => texts[i]);
      const newEmbeddings = batchEmbedFn(uncachedTexts, model);

      uncachedIndices.forEach((idx, j) => {
        results[idx] = newEmbeddings[j];
        this.set(texts[idx], model, newEmbeddings[j]);
      });
    }

    return results;
  }

  stats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: this.hits / Math.max(this.hits + this.misses, 1),
    };
  }

  invalidateModel(model) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${model}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
}

// Mock embedding function
function mockEmbed(text, model) {
  console.log(`  [API CALL] Embedding '${text.slice(0, 30)}...' with ${model}`);
  return [text.length * 0.01, (text.charCodeAt(0) % 100) / 100, 0.5];
}

function mockBatchEmbed(texts, model) {
  console.log(`  [BATCH API CALL] Embedding ${texts.length} texts with ${model}`);
  return texts.map(t => mockEmbed(t, model));
}

// Usage
const cache = new EmbeddingCache(3600);

const documents = [
  "Python async programming guide",
  "JavaScript event loop explained",
  "Python async programming guide",
  "Database indexing strategies",
  "JavaScript event loop explained",
];

console.log("=== Single embeddings ===");
for (const doc of documents) {
  const emb = cache.getOrCompute(doc, "text-embedding-3-small", mockEmbed);
  console.log(`  Result: [${emb.slice(0, 2).map(n => n.toFixed(4))}...]`);
}

console.log(`\nCache stats:`, cache.stats());

console.log("\n=== Batch embeddings ===");
const cache2 = new EmbeddingCache();
const newDocs = ["New document one", "New document two", "Python async programming guide"];
cache2.batchGetOrCompute(newDocs, "text-embedding-3-small", mockBatchEmbed);
console.log(`Cache stats:`, cache2.stats());
```

### Java

```java
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

public class EmbeddingCache {

    record CacheEntry(List<Double> embedding, String model, long createdAt, int accessCount) {}

    private final Map<String, CacheEntry> cache = new HashMap<>();
    private final long ttlSeconds;
    private int hits = 0;
    private int misses = 0;

    public EmbeddingCache(long ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
    }

    public EmbeddingCache() {
        this(86400L * 30);
    }

    private String makeKey(String text, String model) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : hash) hex.append(String.format("%02x", b));
        return model + ":" + hex;
    }

    public Optional<List<Double>> get(String text, String model) throws Exception {
        String key = makeKey(text, model);
        CacheEntry entry = cache.get(key);

        if (entry == null) {
            misses++;
            return Optional.empty();
        }

        if (System.currentTimeMillis() / 1000 - entry.createdAt() > ttlSeconds) {
            cache.remove(key);
            misses++;
            return Optional.empty();
        }

        hits++;
        return Optional.of(entry.embedding());
    }

    public void set(String text, String model, List<Double> embedding) throws Exception {
        String key = makeKey(text, model);
        cache.put(key, new CacheEntry(embedding, model, System.currentTimeMillis() / 1000, 0));
    }

    public List<Double> getOrCompute(String text, String model,
                                      java.util.function.BiFunction<String, String, List<Double>> embedFn) throws Exception {
        Optional<List<Double>> cached = get(text, model);
        if (cached.isPresent()) return cached.get();

        List<Double> embedding = embedFn.apply(text, model);
        set(text, model, embedding);
        return embedding;
    }

    public Map<String, Integer> stats() {
        return Map.of(
            "hits", hits,
            "misses", misses,
            "size", cache.size(),
            "hitRate", hits / Math.max(hits + misses, 1)
        );
    }

    public int invalidateModel(String model) {
        Set<String> keys = new HashSet<>();
        for (String key : cache.keySet()) {
            if (key.startsWith(model + ":")) keys.add(key);
        }
        keys.forEach(cache::remove);
        return keys.size();
    }

    public static void main(String[] args) throws Exception {
        var cache = new EmbeddingCache(3600);

        var embedFn = (java.util.function.BiFunction<String, String, List<Double>>) (text, model) -> {
            System.out.printf("  [API CALL] Embedding '%s...' with %s%n", text.substring(0, Math.min(30, text.length())), model);
            return List.of(text.length() * 0.01, (double) (text.hashCode() % 100) / 100, 0.5);
        };

        var documents = List.of(
            "Python async programming guide",
            "JavaScript event loop explained",
            "Python async programming guide",
            "Database indexing strategies",
            "JavaScript event loop explained"
        );

        System.out.println("=== Single embeddings ===");
        for (String doc : documents) {
            var emb = cache.getOrCompute(doc, "text-embedding-3-small", embedFn);
            System.out.printf("  Result: [%.4f, %.4f, ...]%n", emb.get(0), emb.get(1));
        }

        System.out.printf("%nCache stats: %s%n", cache.stats());

        System.out.printf("%n=== Model invalidation ===%n");
        int removed = cache.invalidateModel("text-embedding-3-small");
        System.out.printf("Removed %d entries%n", removed);
        System.out.printf("Cache stats: %s%n", cache.stats());
    }
}
```

## Explanation

The cache works in three steps:

1. **Key generation**: Combine the model name with a SHA-256 hash of the text. This produces a unique key per (text, model) pair. If the same text is embedded with a different model, the key differs, preventing cross-model contamination.
2. **Cache lookup**: Before calling the embedding API, check the cache. If the key exists and has not expired, return the cached embedding. This skips the API call entirely.
3. **Cache population**: On a miss, call the embedding API, store the result in the cache with a timestamp, and return it. Subsequent requests for the same text hit the cache.

The batch variant is important for RAG pipelines. Instead of checking the cache one-by-one, it collects all cache misses and makes a single batch API call for the uncached texts. This reduces both API calls and latency.

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Persistent cache** | Store embeddings in Redis or a database | Survives restarts, shared across instances |
| **Two-tier cache** | L1 in-memory + L2 Redis | Fast local reads with shared persistence |
| **Semantic cache** | Return cached embedding of a similar text (cosine > 0.95) | Near-duplicate detection, paraphrased queries |
| **TTL by model** | Different TTLs per model version | Newer models change more frequently |

## What Works

- **Include model version in the key** — prevents serving embeddings from a deprecated model
- **Use batch APIs for misses** — OpenAI and Cohere offer batch embedding endpoints that are cheaper per token
- **Set a TTL** — embeddings can become stale if the model is updated server-side
- **Log hit rate** — if hit rate is below 50%, your workload may not benefit from caching
- **Invalidate on model switch** — when you change embedding models, clear the old cache
- **Pre-warm the cache** — embed your corpus once at startup so queries hit the cache

## Common Mistakes

- Not including the model name in the cache key, causing embeddings from different models to mix
- Using a hash function without collision resistance (MD5) instead of SHA-256
- Not setting a TTL, serving stale embeddings after a model update
- Caching in-memory only on a single instance, missing cache hits on other instances
- Forgetting to invalidate the cache when switching embedding models

## Frequently Asked Questions

**Q: How much can I save with an embedding cache?**
A: If 60% of your embedding requests are for repeated text, you save 60% of API costs. For RAG systems that re-embed the same corpus, savings can reach 80-90% after the first indexing pass.

**Q: Should I use in-memory or persistent cache?**
A: Start with in-memory (dict or Map). Move to Redis when you have multiple instances or need cache to survive restarts. The interface stays the same.

**Q: What if the embedding model is updated server-side?**
A: Set a TTL (e.g., 30 days) so cached embeddings expire eventually. If you know the model changed, call `invalidateModel()` to clear all entries for that model immediately.

**Q: Can I cache embeddings from different providers in the same cache?**
A: Yes, as long as the model name in the key is unique per provider. Use names like `openai:text-embedding-3-small` and `cohere:embed-english-v3` to avoid collisions.
