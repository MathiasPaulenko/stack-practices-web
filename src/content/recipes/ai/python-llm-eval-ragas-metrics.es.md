---
contentType: recipes
slug: python-llm-eval-ragas-metrics
title: "Evalua calidad RAG con metricas RAGAS"
description: "Mide la calidad del pipeline RAG usando metricas del framework RAGAS — fidelidad, relevancia de respuesta, precision de contexto y recall de contexto para evaluacion objetiva"
metaDescription: "Evalua calidad RAG con metricas RAGAS. Mide fidelidad, relevancia de respuesta, precision y recall de contexto para evaluacion objetiva del pipeline RAG."
difficulty: intermediate
topics:
  - ai
tags:
  - python
  - ragas
  - rag evaluation
  - llm metrics
  - testing
relatedResources:
  - /recipes/ai/python-rag-chroma-local
  - /recipes/ai/python-vector-database-pinecone
  - /recipes/ai/python-langchain-chains-composition
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Evalua calidad RAG con metricas RAGAS. Mide fidelidad, relevancia de respuesta, precision y recall de contexto para evaluacion objetiva del pipeline RAG."
  keywords:
    - ragas
    - rag evaluation
    - llm metrics
    - faithfulness
    - context precision
---

# Evalua calidad RAG con metricas RAGAS

Los pipelines RAG son dificiles de evaluar — como sabes si el contexto recuperado fue relevante o si la respuesta esta fundamentada? RAGAS (Retrieval-Augmented Generation Assessment) proporciona metricas automatizadas usando un enfoque LLM-as-judge. A continuacion: evaluar un pipeline RAG con las cuatro metricas core de RAGAS: fidelidad, relevancia de respuesta, precision de contexto y recall de contexto.

## Cuando Usar Esto

- Evaluar calidad del pipeline RAG antes de desplegar a produccion
- Comparar diferentes estrategias de chunking, modelos de embedding o LLMs
- Testing de regresion al cambiar componentes RAG
- Establecer metricas baseline para mejora continua

## Requisitos Previos

- Python 3.10+
- Paquete `ragas` (`pip install ragas`)
- `langchain-openai` para el LLM evaluador
- Una API key de OpenAI

## Solucion

### 1. Instalar dependencias

```bash
pip install ragas langchain-openai datasets
```

### 2. Preparar dataset de evaluacion

```python
from datasets import Dataset

eval_data = {
    "question": [
        "What is the Redis cache-aside pattern?",
        "How does Docker Compose define multi-container apps?",
        "What are PostgreSQL ACID compliance features?",
    ],
    "answer": [
        "The cache-aside pattern checks the cache first, and if data is missing, loads it from the database and sets it in the cache with a TTL.",
        "Docker Compose uses a YAML file to define multi-container applications, specifying services, networks, and volumes.",
        "PostgreSQL provides ACID compliance through atomic transactions, consistent constraints, isolation levels, and durable write-ahead logging.",
    ],
    "contexts": [
        [
            "Redis cache-aside: application checks cache first. On cache miss, loads from database and sets cache entry with TTL.",
        ],
        [
            "Docker Compose is a tool for defining multi-container Docker applications in a YAML file with services, networks, and volumes.",
        ],
        [
            "PostgreSQL ensures ACID compliance: atomicity via transactions, consistency via constraints, isolation via MVCC, durability via WAL.",
        ],
    ],
    "ground_truth": [
        "Cache-aside checks cache first, loads from DB on miss, sets cache with TTL.",
        "Docker Compose defines multi-container apps in YAML with services, networks, and volumes.",
        "PostgreSQL ACID: atomicity (transactions), consistency (constraints), isolation (MVCC), durability (WAL).",
    ],
}

eval_dataset = Dataset.from_dict(eval_data)
```

### 3. Ejecutar evaluacion RAGAS

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

# LLM y embeddings para evaluacion
eval_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
eval_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Ejecutar evaluacion con las cuatro metricas core
results = evaluate(
    eval_dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
    ],
    llm=eval_llm,
    embeddings=eval_embeddings,
)

# Convertir a DataFrame de pandas para analisis
df = results.to_pandas()
print(df[["question", "faithfulness", "answer_relevancy", "context_precision", "context_recall"]])
```

### 4. Interpretar las metricas

```python
def print_eval_report(results) -> None:
    """Print a formatted evaluation report."""
    df = results.to_pandas()

    print("=" * 60)
    print("RAGAS Evaluation Report")
    print("=" * 60)

    metrics = ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]

    for metric in metrics:
        scores = df[metric].tolist()
        avg = sum(scores) / len(scores)
        print(f"\n{metric.replace('_', ' ').title()}:")
        print(f"  Average: {avg:.3f}")
        print(f"  Min:     {min(scores):.3f}")
        print(f"  Max:     {max(scores):.3f}")
        for i, score in enumerate(scores):
            print(f"  Q{i+1}: {score:.3f}")

    print("\n" + "=" * 60)
    overall = sum(df[m].mean() for m in metrics) / len(metrics)
    print(f"Overall Score: {overall:.3f}")

print_eval_report(results)
```

### 5. Evaluar tu propio pipeline RAG

```python
from typing import List

def evaluate_rag_pipeline(
    rag_pipeline,
    test_cases: List[dict],
) -> "Dataset":
    """Evaluate a RAG pipeline against test cases.

    Args:
        rag_pipeline: Object with .ask(query) -> {answer, sources} method.
        test_cases: List of {question, ground_truth} dicts.

    Returns:
        RAGAS evaluation results.
    """
    eval_rows = []

    for case in test_cases:
        # Ejecutar el pipeline RAG
        result = rag_pipeline.ask(case["question"])

        eval_rows.append({
            "question": case["question"],
            "answer": result["answer"],
            "contexts": [s["text"] for s in result["sources"]],
            "ground_truth": case["ground_truth"],
        })

    dataset = Dataset.from_list(eval_rows)

    return evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
        llm=eval_llm,
        embeddings=eval_embeddings,
    )

# Uso
test_cases = [
    {
        "question": "What data structures does Redis support?",
        "ground_truth": "Redis supports strings, hashes, lists, sets, sorted sets, streams, and more.",
    },
    {
        "question": "How does PostgreSQL handle isolation?",
        "ground_truth": "PostgreSQL handles isolation via MVCC (Multi-Version Concurrency Control).",
    },
]

results = evaluate_rag_pipeline(my_rag_pipeline, test_cases)
print_eval_report(results)
```

## Como Funciona

1. **Fidelidad (faithfulness)** — mide si la respuesta esta fundamentada en el contexto recuperado. Si la respuesta contiene afirmaciones no soportadas por el contexto, la fidelidad cae. Alta fidelidad = baja alucinacion.
2. **Relevancia de respuesta (answer relevancy)** — mide que tan relevante es la respuesta a la pregunta. El LLM genera preguntas potenciales desde la respuesta y las compara con la pregunta original usando embeddings.
3. **Precision de contexto (context precision)** — mide si el contexto recuperado contiene informacion necesaria para responder la pregunta. Alta precision significa que la recuperacion encontro los documentos correctos.
4. **Recall de contexto (context recall)** — mide si toda la informacion necesaria para responder fue recuperada. Alto recall significa que no se perdio informacion relevante.
5. **LLM-as-judge** — RAGAS usa un LLM para evaluar cada metrica, haciendolo automatizado pero dependiente de la calidad del LLM evaluador. Usa `gpt-4o` para mejores resultados.

## Variantes

### Metricas personalizadas

```python
from ragas.metrics import Metric

class ConcisenessMetric(Metric):
    """Custom metric: measure answer conciseness."""

    name = "conciseness"

    def _as_dict(self):
        return {"name": self.name}

    def score(self, row):
        answer = row["answer"]
        words = len(answer.split())
        # Score: 1.0 para 20-50 palabras, decreciendo para respuestas mas largas
        if 20 <= words <= 50:
            return 1.0
        elif words < 20:
            return words / 20
        else:
            return max(0.0, 50 / words)
```

### Evaluacion batch con CSV

```python
import pandas as pd

def evaluate_from_csv(csv_path: str) -> pd.DataFrame:
    """Load test cases from CSV and evaluate."""
    df = pd.read_csv(csv_path)

    # Columnas CSV: question, answer, contexts (separado por punto y coma), ground_truth
    eval_data = {
        "question": df["question"].tolist(),
        "answer": df["answer"].tolist(),
        "contexts": [c.split(";") for c in df["contexts"]],
        "ground_truth": df["ground_truth"].tolist(),
    }

    dataset = Dataset.from_dict(eval_data)
    results = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
        llm=eval_llm,
        embeddings=eval_embeddings,
    )
    return results.to_pandas()
```

### Comparar dos configuraciones RAG

```python
def compare_configs(
    pipeline_a,
    pipeline_b,
    test_cases: list[dict],
) -> pd.DataFrame:
    """Compare two RAG configurations side by side."""
    results_a = evaluate_rag_pipeline(pipeline_a, test_cases).to_pandas()
    results_b = evaluate_rag_pipeline(pipeline_b, test_cases).to_pandas()

    comparison = pd.DataFrame({
        "question": results_a["question"],
        "faithfulness_a": results_a["faithfulness"],
        "faithfulness_b": results_b["faithfulness"],
        "relevancy_a": results_a["answer_relevancy"],
        "relevancy_b": results_b["answer_relevancy"],
        "precision_a": results_a["context_precision"],
        "precision_b": results_b["context_precision"],
        "recall_a": results_a["context_recall"],
        "recall_b": results_b["context_recall"],
    })

    comparison["faithfulness_diff"] = comparison["faithfulness_b"] - comparison["faithfulness_a"]
    comparison["relevancy_diff"] = comparison["relevancy_b"] - comparison["relevancy_a"]

    return comparison
```

## Mejores Practicas

- **Usa `gpt-4o` como evaluador** — modelos mas baratos producen juicios inconsistentes
- **Crea casos de test diversos** — cubre diferentes tipos de preguntas (factual, comparativa, procedural)
- **Incluye ground truth de expertos del dominio** — la generacion automatica de ground truth es menos confiable
- **Ejecuta evaluacion despues de cada cambio RAG** — cambios en estrategia de chunking, modelo de embedding o LLM afectan todas las metricas

## Errores Comunes

- **Evaluar sin ground truth** — el recall de contexto requiere respuestas ground truth; sin el, solo obtienes 3 de 4 metricas
- **Usar el mismo LLM para generacion y evaluacion** — puede sesgar resultados; usa un modelo diferente o al menos diferente temperatura
- **Muy pocos casos de test** — 3-5 casos dan resultados ruidosos; apunta a 20+ para promedios confiables
- **Ignorar fidelidad** — alta relevancia de respuesta con baja fidelidad significa alucinacion confiada

## FAQ

**Q: Cual es un buen score RAGAS?**
A: 0.7+ es aceptable para la mayoria de casos de uso. 0.8+ es bueno. 0.9+ es excelente. Menos de 0.5 indica un problema con recuperacion o generacion.

**Q: Cuanto cuesta la evaluacion RAGAS?**
A: Cada metrica hace 1-3 llamadas LLM por caso de test. Evaluar 20 casos con 4 metricas en `gpt-4o-mini` cuesta ~$0.50.

**Q: Puedo usar RAGAS con modelos no-OpenAI?**
A: Si. RAGAS soporta cualquier LLM y embeddings de LangChain. Pasa tu modelo a los parametros `llm` y `embeddings`.

**Q: Con que frecuencia debo ejecutar RAGAS?**
A: Ejecutalo como parte de CI/CD cuando cambies componentes RAG (modelo de embedding, tamanio de chunk, LLM, prompt template).

**Q: Cual es un buen score de faithfulness?**
R: Un score de faithfulness arriba de 0.8 significa que la respuesta esta mayormente basada en el contexto recuperado. Abajo de 0.5 indica alucinacion — el modelo esta generando contenido no soportado por las fuentes. Investiga el tamanio de chunk, la calidad de retrieval, y las instrucciones del prompt.

**Q: Puedo anadir metricas custom a RAGAS?**
R: Si. Crea una clase que extienda `Metric` e implementa el metodo `score`. Registrala en el pipeline de evaluacion junto a las metricas built-in. Las metricas custom son utiles para checks especificos de dominio como precision de citas o cumplimiento de formato.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
