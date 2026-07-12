---


contentType: patterns
slug: rag-hybrid-search-pattern
title: "Patrón RAG Hybrid Search"
description: "Combina busqueda por palabras clave (BM25) y semantica (vectores) para mejorar la precision de recuperacion en pipelines RAG. Fusiona resultados con reciprocal rank fusion."
metaDescription: "Implementa RAG hybrid search combinando BM25 con busqueda vectorial semantica y reciprocal rank fusion para mayor precision en la recuperacion de documentos."
difficulty: intermediate
topics:
  - ai
  - data
tags:
  - rag
  - hybrid-search
  - patron
  - patron-ai
  - recuperacion
  - embeddings
  - bm25
  - busqueda-vectorial
relatedResources:
  - /recipes/python-rag-chroma-local
  - /recipes/python-vector-database-pinecone
  - /recipes/python-openai-embeddings-cosine
  - /patterns/embedding-cache-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa RAG hybrid search combinando BM25 con busqueda vectorial semantica y reciprocal rank fusion para mayor precision en la recuperacion de documentos."
  keywords:
    - rag hybrid search
    - bm25 vector search
    - reciprocal rank fusion
    - patron ia
    - retrieval augmented generation
    - busqueda semantica
    - fusion busqueda palabra clave


---

# Patrón RAG Hybrid Search

## Descripción general

Hybrid search combina dos estrategias de recuperacion: **busqueda por palabras clave** (BM25 o TF-IDF) que coincide con terminos exactos, y **busqueda semantica** (embeddings vectoriales) que coincide por significado. Ningun enfoque por si solo cubre todos los tipos de consulta. La busqueda por palabras clave no detecta sinonimos ni paráfrasis. La busqueda semantica puede perder coincidencias exactas como codigos de producto o nombres propios. Fusionar ambas listas rankeadas produce resultados mas relevantes que cualquier metodo por separado.

El paso de fusion usa **Reciprocal Rank Fusion (RRF)**, un metodo basado en rangos que combina multiples listas de resultados sin necesidad de calibrar scores. RRF es simple, requiere pocos parametros y funciona en diferentes escalas de puntuacion.

## Cuándo usarlo

Usa el patrón RAG Hybrid Search cuando:
- Tu pipeline RAG atiende consultas que mezclan terminos exactos con lenguaje conceptual
- La busqueda semantica pura no encuentra nombres especificos, codigos o identificadores
- La busqueda por palabras clave falla con preguntas reescritas o parafraseadas
- Necesitas mayor precision de recuperacion sin reentrenar modelos de embeddings
- Ejemplos: busqueda en documentacion, catalogos de productos, bases de conocimiento internas, recuperacion de documentos legales

## Solución

### Python

```python
import math
from typing import List, Dict, Tuple
from dataclasses import dataclass

@dataclass
class Document:
    id: str
    text: str

@dataclass
class SearchResult:
    id: str
    score: float

def bm25_search(
    query: str, documents: List[Document], top_k: int = 10
) -> List[SearchResult]:
    """Busqueda por palabras clave con BM25 simplificado."""
    query_terms = query.lower().split()
    scores: Dict[str, float] = {}
    doc_count = len(documents)
    avg_len = sum(len(d.text.split()) for d in documents) / max(doc_count, 1)

    k1, b = 1.5, 0.75

    for doc in documents:
        doc_terms = doc.text.lower().split()
        doc_len = len(doc_terms)
        score = 0.0

        for term in query_terms:
            tf = doc_terms.count(term)
            df = sum(1 for d in documents if term in d.text.lower())
            idf = math.log((doc_count - df + 0.5) / (df + 0.5) + 1)
            score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc_len / avg_len))

        if score > 0:
            scores[doc.id] = score

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [SearchResult(id=did, score=score) for did, score in ranked]


def vector_search(
    query_embedding: List[float],
    doc_embeddings: Dict[str, List[float]],
    top_k: int = 10,
) -> List[SearchResult]:
    """Busqueda vectorial por similitud coseno."""
    def cosine(a: List[float], b: List[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        return dot / (norm_a * norm_b + 1e-10)

    scores = {
        did: cosine(query_embedding, emb)
        for did, emb in doc_embeddings.items()
    }
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [SearchResult(id=did, score=score) for did, score in ranked]


def reciprocal_rank_fusion(
    result_lists: List[List[SearchResult]],
    k: int = 60,
    top_k: int = 10,
) -> List[SearchResult]:
    """Fusiona multiples listas rankeadas usando RRF."""
    fused: Dict[str, float] = {}

    for results in result_lists:
        for rank, result in enumerate(results):
            fused[result.id] = fused.get(result.id, 0) + 1.0 / (k + rank + 1)

    ranked = sorted(fused.items(), key=lambda x: x[1], reverse=True)[:top_k]
    return [SearchResult(id=did, score=score) for did, score in ranked]


# Uso
documents = [
    Document("d1", "Python async programming with asyncio"),
    Document("d2", "JavaScript event loop and promises"),
    Document("d3", "Concurrent task execution in Python"),
    Document("d4", "Node.js worker threads for CPU tasks"),
]

query = "python async tasks"

bm25_results = bm25_search(query, documents, top_k=5)

query_emb = [0.12, 0.85, 0.33, 0.41]
doc_embeddings = {
    "d1": [0.11, 0.82, 0.30, 0.45],
    "d2": [0.05, 0.20, 0.71, 0.10],
    "d3": [0.13, 0.79, 0.35, 0.38],
    "d4": [0.02, 0.15, 0.60, 0.05],
}
vector_results = vector_search(query_emb, doc_embeddings, top_k=5)

hybrid_results = reciprocal_rank_fusion(
    [bm25_results, vector_results], k=60, top_k=5
)

for r in hybrid_results:
    print(f"{r.id}: {r.score:.4f}")
```

### JavaScript

```javascript
class Document {
  constructor(id, text) {
    this.id = id;
    this.text = text;
  }
}

function bm25Search(query, documents, topK = 10) {
  const queryTerms = query.toLowerCase().split(" ");
  const scores = {};
  const docCount = documents.length;
  const avgLen = documents.reduce((s, d) => s + d.text.split(" ").length, 0) / Math.max(docCount, 1);
  const k1 = 1.5, b = 0.75;

  for (const doc of documents) {
    const docTerms = doc.text.toLowerCase().split(" ");
    const docLen = docTerms.length;
    let score = 0;

    for (const term of queryTerms) {
      const tf = docTerms.filter(t => t === term).length;
      const df = documents.filter(d => d.text.toLowerCase().includes(term)).length;
      const idf = Math.log((docCount - df + 0.5) / (df + 0.5) + 1);
      score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / avgLen));
    }

    if (score > 0) scores[doc.id] = score;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({ id, score }));
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const normB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  return dot / (normA * normB + 1e-10);
}

function vectorSearch(queryEmbedding, docEmbeddings, topK = 10) {
  const scores = {};
  for (const [id, emb] of Object.entries(docEmbeddings)) {
    scores[id] = cosineSimilarity(queryEmbedding, emb);
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({ id, score }));
}

function reciprocalRankFusion(resultLists, k = 60, topK = 10) {
  const fused = {};
  for (const results of resultLists) {
    results.forEach((result, rank) => {
      fused[result.id] = (fused[result.id] || 0) + 1 / (k + rank + 1);
    });
  }
  return Object.entries(fused)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({ id, score }));
}

// Uso
const docs = [
  new Document("d1", "Python async programming with asyncio"),
  new Document("d2", "JavaScript event loop and promises"),
  new Document("d3", "Concurrent task execution in Python"),
  new Document("d4", "Node.js worker threads for CPU tasks"),
];

const query = "python async tasks";
const bm25Results = bm25Search(query, docs, 5);

const queryEmb = [0.12, 0.85, 0.33, 0.41];
const docEmbs = {
  d1: [0.11, 0.82, 0.30, 0.45],
  d2: [0.05, 0.20, 0.71, 0.10],
  d3: [0.13, 0.79, 0.35, 0.38],
  d4: [0.02, 0.15, 0.60, 0.05],
};
const vectorResults = vectorSearch(queryEmb, docEmbs, 5);

const hybrid = reciprocalRankFusion([bm25Results, vectorResults], 60, 5);
console.log(hybrid);
```

### Java

```java
import java.util.*;

public class HybridSearch {

    record Document(String id, String text) {}
    record SearchResult(String id, double score) {}

    public static List<SearchResult> bm25Search(
            String query, List<Document> documents, int topK) {
        String[] queryTerms = query.toLowerCase().split(" ");
        Map<String, Double> scores = new HashMap<>();
        int docCount = documents.size();
        double avgLen = documents.stream()
                .mapToInt(d -> d.text().split(" ").length)
                .average().orElse(1);
        double k1 = 1.5, b = 0.75;

        for (Document doc : documents) {
            String[] docTerms = doc.text().toLowerCase().split(" ");
            int docLen = docTerms.length;
            double score = 0;

            for (String term : queryTerms) {
                long tf = Arrays.stream(docTerms).filter(t -> t.equals(term)).count();
                long df = documents.stream()
                        .filter(d -> d.text().toLowerCase().contains(term))
                        .count();
                double idf = Math.log((docCount - df + 0.5) / (df + 0.5) + 1);
                score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / avgLen));
            }

            if (score > 0) scores.put(doc.id(), score);
        }

        return scores.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(topK)
                .map(e -> new SearchResult(e.getKey(), e.getValue()))
                .toList();
    }

    public static List<SearchResult> vectorSearch(
            double[] queryEmb, Map<String, double[]> docEmbs, int topK) {
        Map<String, Double> scores = new HashMap<>();

        for (var entry : docEmbs.entrySet()) {
            scores.put(entry.getKey(), cosine(queryEmb, entry.getValue()));
        }

        return scores.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(topK)
                .map(e -> new SearchResult(e.getKey(), e.getValue()))
                .toList();
    }

    static double cosine(double[] a, double[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
    }

    public static List<SearchResult> reciprocalRankFusion(
            List<List<SearchResult>> resultLists, int k, int topK) {
        Map<String, Double> fused = new HashMap<>();

        for (List<SearchResult> results : resultLists) {
            for (int rank = 0; rank < results.size(); rank++) {
                String id = results.get(rank).id();
                fused.merge(id, 1.0 / (k + rank + 1), Double::sum);
            }
        }

        return fused.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(topK)
                .map(e -> new SearchResult(e.getKey(), e.getValue()))
                .toList();
    }

    public static void main(String[] args) {
        var docs = List.of(
            new Document("d1", "Python async programming with asyncio"),
            new Document("d2", "JavaScript event loop and promises"),
            new Document("d3", "Concurrent task execution in Python"),
            new Document("d4", "Node.js worker threads for CPU tasks")
        );

        var bm25Results = bm25Search("python async tasks", docs, 5);
        var vectorResults = vectorSearch(
            new double[]{0.12, 0.85, 0.33, 0.41},
            Map.of(
                "d1", new double[]{0.11, 0.82, 0.30, 0.45},
                "d2", new double[]{0.05, 0.20, 0.71, 0.10},
                "d3", new double[]{0.13, 0.79, 0.35, 0.38},
                "d4", new double[]{0.02, 0.15, 0.60, 0.05}
            ),
            5
        );

        var hybrid = reciprocalRankFusion(
            List.of(bm25Results, vectorResults), 60, 5);
        hybrid.forEach(r -> System.out.printf("%s: %.4f%n", r.id(), r.score()));
    }
}
```

## Explicación

El patrón funciona en tres etapas:

1. **Recuperacion paralela**: Ejecuta BM25 y busqueda vectorial semantica de forma independiente. Cada una produce una lista rankeada de documentos con scores.
2. **Fusion de rangos**: Aplica Reciprocal Rank Fusion (RRF) para combinar las dos listas. RRF asigna a cada documento un score fusionado basado en su posicion en cada lista: `score = Σ 1/(k + rank)` donde `k` es una constante de suavizado (tipicamente 60).
3. **Seleccion top-k**: Devuelve los k documentos mejores del ranking fusionado.

RRF se prefiere sobre la fusion basada en scores porque BM25 y la similitud coseno producen puntuaciones en escalas diferentes. RRF solo usa posiciones de ranking, lo que lo hace invariante a la escala y facil de ajustar.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **RRF ponderado** | Aplicar pesos distintos a resultados de palabras clave vs. semanticos | Ajuste por dominio (ej. documentos legales favorecen palabras clave) |
| **Fusion por scores** | Normalizar y combinar scores brutos en lugar de rangos | Cuando los scores son comparables (misma familia de modelos) |
| **Fusion multi-vector** | Fusionar resultados de multiples modelos de embeddings | Recuperacion multilingue o multimodal |
| **Pipeline con reranker** | Agregar un reranker cross-encoder despues de la fusion | Maxima precision a costa de latencia |

## Buenas prácticas

- **Ajusta el parametro `k` de RRF** — valores bajos (ej. 20) favorecen los primeros rangos; valores altos (ej. 100) suavizan diferencias
- **Pre-filtra candidatos** — si tu corpus es grande, filtra por metadata antes de ejecutar ambas busquedas para reducir compute
- **Cachea embeddings** — re-embeddar los mismos documentos desperdicia presupuesto de API
- **Usa BM25 para campos estructurados** — codigos de producto, identificadores y nombres exactos se benefician de coincidencia por palabras clave
- **Monitorea metricas de recuperacion** — sigue recall@k y precision@k para medir calidad de fusion
- **Indexa incrementalmente** — actualiza el indice BM25 y el vector store por separado conforme llegan documentos nuevos

## Errores comunes

- Usar fusion basada en scores sin normalizacion, causando que un metodo de busqueda domine al otro
- Ignorar el parametro `k` en RRF, que por defecto es 60 pero puede necesitar ajuste por dataset
- Ejecutar ambas busquedas secuencialmente en lugar de en paralelo, duplicando la latencia
- No desduplicar documentos que aparecen en ambas listas de resultados antes de la fusion
- Re-embeddar todo el corpus cuando solo cambian unos pocos documentos

## Preguntas frecuentes

**Q: Por que no usar solo busqueda semantica para todo?**
A: La busqueda semantica tiene dificultades con coincidencias exactas de terminos. Si un usuario busca "codigo de error ERR_4021", una busqueda por palabras clave lo encuentra al instante mientras que los embeddings pueden rankearlo mas bajo. Hybrid search cubre ambos casos.

**Q: Como elijo el parametro k de RRF?**
A: Empieza con 60 (el valor del paper original). Si los resultados top de un metodo dominan demasiado, aumenta k. Si quieres amplificar los primeros rangos, disminuye k.

**Q: Puedo agregar mas de dos metodos de recuperacion?**
A: Si. RRF acepta cualquier numero de listas rankeadas. Puedes agregar un tercer metodo como una busqueda en grafo de conocimiento o un filtro por metadata y fusionar los tres.

**Q: Debo usar un reranker encima de hybrid search?**
A: Un reranker cross-encoder mejora la precision pero anade latencia. Usalo cuando necesitas precision top-3 o top-5 (ej. para alimentar contexto a un LLM) y puedes permitir 50-100ms extra.
