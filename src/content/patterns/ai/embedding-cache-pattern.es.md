---




contentType: patterns
slug: embedding-cache-pattern
title: "Patrón Embedding Cache"
description: "Cachea embeddings LLM para reducir llamadas API y costo. Almacena embeddings con clave de hash de contenido y sirve desde cache en entradas repetidas."
metaDescription: "Cachea embeddings LLM para reducir costos API. Almacena embeddings por hash de contenido, sirve desde cache en repetidos e invalida al cambiar de modelo."
difficulty: intermediate
topics:
  - ai
  - caching
tags:
  - embedding-cache
  - patron
  - patron-ai
  - optimizacion-costos
  - embeddings
  - caching
  - busqueda-vectorial
relatedResources:
  - /patterns/rag-hybrid-search-pattern
  - /recipes/python-openai-embeddings-cosine
  - /recipes/python-vector-database-pinecone
  - /patterns/llm-router-pattern
  - /guides/complete-guide-llm-cost-optimization
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cachea embeddings LLM para reducir costos API. Almacena embeddings por hash de contenido, sirve desde cache en repetidos e invalida al cambiar de modelo."
  keywords:
    - patron embedding cache
    - cachear embeddings
    - optimizacion costos ia
    - cache api embeddings
    - cache vectorial
    - hash contenido embedding
    - reducir llamadas api embedding




---

# Patrón Embedding Cache

## Descripción general

Generar embeddings via API (OpenAI, Cohere, HuggingFace) cuesta dinero por request. Cuando el mismo texto se embedde repetidamente — comun en pipelines RAG, busqueda semantica y deduplicacion — esas llamadas API son desperdicio. El patrón Embedding Cache almacena embeddings usando como clave un hash del texto y el identificador del modelo. En requests subsiguientes para el mismo texto, el embedding cacheado se devuelve sin llamar a la API.

La clave del cache combina un hash de contenido (SHA-256 del texto) con el nombre y version del modelo. Esto asegura que cambiar de modelo de embedding invalide el cache automaticamente, previniendo que se sirvan embeddings stale de un modelo diferente.

## Cuándo usarlo


- For alternatives, see [Complete Guide to LLM Cost Optimization](/es/guides/complete-guide-llm-cost-optimization/).

Usa el patrón Embedding Cache cuando:
- Tu pipeline RAG re-embedde los mismos documentos en cada query o refresh del indice
- Ejecutas verificaciones de similitud semantica sobre un corpus fijo repetidamente
- Los costos de API de embedding son una porcion significativa de tu factura
- Embeddes documentos en lote y quieres saltar items ya procesados
- Ejemplos: sistemas RAG, motores de busqueda semantica, pipelines de deduplicacion, workflows de clustering

## Solución

### Python

```python
import hashlib
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

    def get_or_compute(self, text: str, model: str, embed_fn: callable) -> List[float]:
        cached = self.get(text, model)
        if cached is not None:
            return cached
        embedding = embed_fn(text, model)
        self.set(text, model, embedding)
        return embedding

    def batch_get_or_compute(
        self, texts: List[str], model: str, batch_embed_fn: callable
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
            "hits": self.hits, "misses": self.misses,
            "size": len(self._cache),
            "hit_rate": self.hits / max(self.hits + self.misses, 1),
        }

    def invalidate_model(self, model: str) -> int:
        keys = [k for k in self._cache if k.startswith(f"{model}:")]
        for k in keys:
            del self._cache[k]
        return len(keys)

# Uso
def mock_embed(text: str, model: str) -> List[float]:
    print(f"  [API CALL] Embedding '{text[:30]}...' with {model}")
    return [len(text) * 0.01, hash(text) % 100 / 100, 0.5]

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
removed = cache.invalidate_model("text-embedding-3-small")
print(f"Removed {removed} entries after invalidation")
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
    if (!entry) { this.misses++; return null; }
    if (Date.now() / 1000 - entry.createdAt > this.ttl) {
      this.cache.delete(key); this.misses++; return null;
    }
    entry.accessCount++; this.hits++;
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

  stats() {
    return {
      hits: this.hits, misses: this.misses,
      size: this.cache.size,
      hitRate: this.hits / Math.max(this.hits + this.misses, 1),
    };
  }

  invalidateModel(model) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${model}:`)) { this.cache.delete(key); count++; }
    }
    return count;
  }
}

// Uso
function mockEmbed(text, model) {
  console.log(`  [API CALL] Embedding '${text.slice(0, 30)}...' with ${model}`);
  return [text.length * 0.01, (text.charCodeAt(0) % 100) / 100, 0.5];
}

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

    public EmbeddingCache(long ttlSeconds) { this.ttlSeconds = ttlSeconds; }
    public EmbeddingCache() { this(86400L * 30); }

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
        if (entry == null) { misses++; return Optional.empty(); }
        if (System.currentTimeMillis() / 1000 - entry.createdAt() > ttlSeconds) {
            cache.remove(key); misses++; return Optional.empty();
        }
        hits++;
        return Optional.of(entry.embedding());
    }

    public void set(String text, String model, List<Double> embedding) throws Exception {
        cache.put(makeKey(text, model), new CacheEntry(embedding, model, System.currentTimeMillis() / 1000, 0));
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
        return Map.of("hits", hits, "misses", misses, "size", cache.size(),
            "hitRate", hits / Math.max(hits + misses, 1));
    }

    public int invalidateModel(String model) {
        Set<String> keys = new HashSet<>();
        for (String key : cache.keySet()) if (key.startsWith(model + ":")) keys.add(key);
        keys.forEach(cache::remove);
        return keys.size();
    }

    public static void main(String[] args) throws Exception {
        var cache = new EmbeddingCache(3600);
        var embedFn = (java.util.function.BiFunction<String, String, List<Double>>) (text, model) -> {
            System.out.printf("  [API CALL] Embedding '%s...' with %s%n",
                text.substring(0, Math.min(30, text.length())), model);
            return List.of(text.length() * 0.01, (double) (text.hashCode() % 100) / 100, 0.5);
        };

        var documents = List.of(
            "Python async programming guide", "JavaScript event loop explained",
            "Python async programming guide", "Database indexing strategies",
            "JavaScript event loop explained"
        );

        System.out.println("=== Single embeddings ===");
        for (String doc : documents) {
            var emb = cache.getOrCompute(doc, "text-embedding-3-small", embedFn);
            System.out.printf("  Result: [%.4f, %.4f, ...]%n", emb.get(0), emb.get(1));
        }
        System.out.printf("%nCache stats: %s%n", cache.stats());
    }
}
```

## Explicación

El cache funciona en tres pasos:

1. **Generacion de clave**: Combina el nombre del modelo con un hash SHA-256 del texto. Esto produce una clave unica por par (texto, modelo). Si el mismo texto se embedde con un modelo diferente, la clave difiere, previniendo contaminacion entre modelos.
2. **Busqueda en cache**: Antes de llamar a la API de embedding, verifica el cache. Si la clave existe y no ha expirado, devuelve el embedding cacheado. Esto salta la llamada API completamente.
3. **Poblacion del cache**: En un miss, llama a la API de embedding, almacena el resultado en el cache con un timestamp y lo devuelve. Requests subsiguientes para el mismo texto golpean el cache.

La variante batch es importante para pipelines RAG. En lugar de verificar el cache uno por uno, recolecta todos los misses y hace una sola llamada API batch para los textos no cacheados. Esto reduce tanto llamadas API como latencia.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Cache persistente** | Almacenar embeddings en Redis o base de datos | Sobrevive reinicios, compartido entre instancias |
| **Cache de dos niveles** | L1 en memoria + L2 Redis | Lecturas locales rapidas con persistencia compartida |
| **Cache semantico** | Devolver embedding cacheado de texto similar (coseno > 0.95) | Deteccion de casi-duplicados, queries parafraseadas |
| **TTL por modelo** | Diferentes TTLs por version de modelo | Modelos nuevos cambian mas frecuentemente |

## Buenas prácticas

- **Incluye la version del modelo en la clave** — previene servir embeddings de un modelo deprecado
- **Usa APIs batch para los misses** — OpenAI y Cohere ofrecen endpoints de embedding batch mas baratos por token
- **Define un TTL** — los embeddings pueden volverse stale si el modelo se actualiza del lado del servidor
- **Registra el hit rate** — si el hit rate es menor al 50%, tu workload puede no beneficiarse del cache
- **Invalida al cambiar de modelo** — cuando cambias de modelo de embedding, limpia el cache viejo
- **Pre-calienta el cache** — embedde tu corpus una vez al inicio para que las queries golpeen el cache

## Errores comunes

- No incluir el nombre del modelo en la clave del cache, causando que embeddings de diferentes modelos se mezclen
- Usar una funcion hash sin resistencia a colisiones (MD5) en lugar de SHA-256
- No definir un TTL, sirviendo embeddings stale despues de una actualizacion del modelo
- Cachear solo en memoria en una sola instancia, perdiendo hits en otras instancias
- Olvidar invalidar el cache al cambiar de modelo de embedding

## Preguntas frecuentes

**Q: Cuanto puedo ahorrar con un embedding cache?**
A: Si el 60% de tus requests de embedding son para texto repetido, ahorras 60% de los costos de API. Para sistemas RAG que re-embedden el mismo corpus, los ahorros pueden alcanzar 80-90% despues de la primera pasada de indexacion.

**Q: Debo usar cache en memoria o persistente?**
A: Empieza con en memoria (dict o Map). Pasa a Redis cuando tienes multiples instancias o necesitas que el cache sobreviva reinicios. La interfaz se mantiene igual.

**Q: Que pasa si el modelo de embedding se actualiza del lado del servidor?**
A: Define un TTL (ej. 30 dias) para que los embeddings cacheados expiren eventualmente. Si sabes que el modelo cambio, llama `invalidateModel()` para limpiar todas las entradas de ese modelo inmediatamente.

**Q: Puedo cachear embeddings de diferentes proveedores en el mismo cache?**
A: Si, siempre que el nombre del modelo en la clave sea unico por proveedor. Usa nombres como `openai:text-embedding-3-small` y `cohere:embed-english-v3` para evitar colisiones.
