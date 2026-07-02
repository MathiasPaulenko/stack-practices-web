---
contentType: recipes
slug: python-huggingface-text-classification
title: "Fine-tune y despliega clasificadores de texto con Hugging Face Transformers"
description: "Fine-tunea un modelo transformer pre-entrenado para clasificacion de texto usando Hugging Face Trainer, tokeniza datasets, evalua metricas y despliega para inferencia"
metaDescription: "Fine-tunea clasificadores de texto con Hugging Face Transformers. Usa Trainer API, tokeniza datasets, evalua F1 accuracy y despliega con pipeline."
difficulty: advanced
topics:
  - ai
tags:
  - python
  - huggingface
  - transformers
  - text classification
  - fine-tuning
relatedResources:
  - /recipes/ai/python-langchain-chains-composition
  - /recipes/ai/python-rag-chroma-local
  - /recipes/ai/python-openai-function-calling-structured
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Fine-tunea clasificadores de texto con Hugging Face Transformers. Usa Trainer API, tokeniza datasets, evalua F1 accuracy y despliega con pipeline."
  keywords:
    - huggingface transformers
    - text classification fine-tune
    - bert classification
    - huggingface trainer
    - python nlp
---

# Fine-tune y despliega clasificadores de texto con Hugging Face Transformers

Los modelos transformer pre-entrenados como BERT y DistilBERT alcanzan resultados state-of-the-art en tareas de clasificacion de texto. La libreria `transformers` de Hugging Face proporciona la API `Trainer` para fine-tunear estos modelos en datasets personalizados con codigo minimo. Esta receta cubre cargar un dataset, tokenizar, fine-tunear, evaluar y desplegar un clasificador de texto.

## Cuando Usar Esto

- Analisis de sentimiento en reviews de clientes o redes sociales
- Deteccion de spam, clasificacion de temas o reconocimiento de intenciones
- Cualquier tarea de clasificacion de texto donde un modelo fine-tuneado supera enfoques basados en prompts

## Requisitos Previos

- Python 3.10+
- Paquetes `transformers`, `datasets`, `evaluate`
- Se recomienda una GPU (pero CPU funciona para datasets pequenos)

## Solucion

### 1. Instalar dependencias

```bash
pip install transformers datasets evaluate torch accelerate
```

### 2. Cargar y preparar el dataset

```python
from datasets import load_dataset, DatasetDict

# Cargar un dataset de analisis de sentimiento
dataset = load_dataset("imdb")

# Subset para entrenamiento mas rapido (opcional)
train_dataset = dataset["train"].shuffle(seed=42).select(range(2000))
test_dataset = dataset["test"].shuffle(seed=42).select(range(500))

dataset = DatasetDict({
    "train": train_dataset,
    "test": test_dataset,
})

print(dataset)
# DatasetDict({
#     'train': Dataset({features: ['text', 'label'], num_rows: 2000}),
#     'test':  Dataset({features: ['text', 'label'], num_rows: 500}),
# })
```

### 3. Tokenizar el dataset

```python
from transformers import AutoTokenizer

model_name = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)

def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=256,
    )

tokenized_datasets = dataset.map(tokenize_function, batched=True)

# Establecer formato para PyTorch
tokenized_datasets.set_format(
    type="torch",
    columns=["input_ids", "attention_mask", "label"],
)
```

### 4. Fine-tunear con Trainer API

```python
from transformers import (
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)
import evaluate

# Cargar modelo pre-entrenado con cabeza de clasificacion
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=2,
)

# Definir argumentos de entrenamiento
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=64,
    warmup_steps=100,
    weight_decay=0.01,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    logging_dir="./logs",
    logging_steps=50,
)

# Cargar metricas de evaluacion
f1_metric = evaluate.load("f1")
accuracy_metric = evaluate.load("accuracy")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = logits.argmax(axis=-1)
    return {
        "f1": f1_metric.compute(predictions=predictions, references=labels)["f1"],
        "accuracy": accuracy_metric.compute(predictions=predictions, references=labels)["accuracy"],
    }

# Crear Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
    compute_metrics=compute_metrics,
)

# Entrenar
trainer.train()
```

### 5. Evaluar el modelo

```python
eval_results = trainer.evaluate()
print(f"F1 Score: {eval_results['eval_f1']:.4f}")
print(f"Accuracy: {eval_results['eval_accuracy']:.4f}")
```

### 6. Guardar y desplegar

```python
# Guardar el modelo fine-tuneado y el tokenizer
model_dir = "./sentiment-classifier"
trainer.save_model(model_dir)
tokenizer.save_pretrained(model_dir)

# Cargar para inferencia
from transformers import pipeline

classifier = pipeline(
    "text-classification",
    model=model_dir,
    tokenizer=model_dir,
    device=0 if torch.cuda.is_available() else -1,
)

# Predecir
result = classifier("This movie was absolutely fantastic!")
print(result)
# [{'label': 'LABEL_1', 'score': 0.9998}]
```

### 7. Servicio de inferencia batch

```python
from typing import List
import torch

class TextClassificationService:
    def __init__(self, model_dir: str):
        self.classifier = pipeline(
            "text-classification",
            model=model_dir,
            tokenizer=model_dir,
            device=0 if torch.cuda.is_available() else -1,
        )
        self.label_map = {0: "negative", 1: "positive"}

    def classify(self, texts: List[str]) -> List[dict]:
        """Classify a batch of texts.

        Args:
            texts: List of input texts.

        Returns:
            List of {label, score, text} dicts.
        """
        results = self.classifier(texts, batch_size=32)
        return [
            {
                "label": self.label_map.get(int(r["label"].split("_")[-1]), r["label"]),
                "score": r["score"],
                "text": text[:100],
            }
            for r, text in zip(results, texts)
        ]

# Uso
service = TextClassificationService("./sentiment-classifier")
predictions = service.classify([
    "Great product, highly recommend!",
    "Terrible experience, would not buy again.",
    "It's okay, nothing special.",
])
for p in predictions:
    print(f"{p['label']}: {p['score']:.3f} — {p['text']}")
```

## Como Funciona

1. **Tokenizacion** convierte texto en IDs de tokens que el modelo entiende. `padding="max_length"` asegura longitud de secuencia uniforme, y `truncation=True` corta textos mas largos que `max_length`.
2. **`AutoModelForSequenceClassification`** carga un modelo pre-entrenado con una nueva cabeza de clasificacion encima. Las capas base retienen sus pesos pre-entrenados; solo la cabeza se inicializa aleatoriamente.
3. **`Trainer`** maneja el loop de entrenamiento: forward pass, computo de loss, backpropagation, pasos del optimizer, scheduling de learning rate y checkpointing. Tambien soporta entrenamiento distribuido y precision mixta.
4. **`compute_metrics`** corre despues de cada epoch de evaluacion, calculando F1 y accuracy desde los logits del modelo y las etiquetas verdaderas.
5. **`pipeline`** envuelve el modelo y tokenizer en una sola funcion de inferencia, manejando tokenizacion, inferencia del modelo y post-procesamiento (softmax, mapeo de etiquetas).

## Variantes

### Clasificacion multi-clase

```python
# Para 3+ clases (ej. clasificacion de temas)
num_labels = 5  # deportes, politica, tech, salud, entretenimiento

model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=num_labels,
)

# Usar F1 macro para multi-clase desbalanceado
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = logits.argmax(axis=-1)
    return {
        "f1_macro": f1_metric.compute(
            predictions=predictions, references=labels, average="macro"
        )["f1"],
    }
```

### Dataset personalizado desde CSV

```python
from datasets import Dataset

# Cargar desde CSV
dataset = Dataset.from_csv("reviews.csv")  # columnas: text, label

# O desde una lista de dicts
data = [
    {"text": "Great product!", "label": 1},
    {"text": "Worst purchase ever.", "label": 0},
]
dataset = Dataset.from_list(data)
```

### Exportacion ONNX para inferencia mas rapida

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from optimum.onnxruntime import ORTModelForSequenceClassification

# Exportar a ONNX
model = AutoModelForSequenceClassification.from_pretrained("./sentiment-classifier")
ort_model = ORTModelForSequenceClassification.from_pretrained(
    "./sentiment-classifier",
    export=True,
)
ort_model.save_pretrained("./sentiment-classifier-onnx")

# Usar pipeline ONNX (2-4x mas rapido en CPU)
classifier = pipeline(
    "text-classification",
    model=ort_model,
    tokenizer="./sentiment-classifier",
)
```

### Early stopping

```python
from transformers import EarlyStoppingCallback

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
)
```

## Mejores Practicas

- **Empieza con DistilBERT** — es 40% mas pequeno que BERT con 95% del rendimiento para la mayoria de tareas de clasificacion
- **Usa `max_length=256` o `512`** — secuencias mas largas mejoran precision pero aumentan el tiempo de entrenamiento cuadraticamente
- **Monitorea F1 de validacion, no solo loss** — la loss puede decrecer mientras F1 se estanca o cae
- **Guarda el mejor modelo** — `load_best_model_at_end=True` mantiene el checkpoint con la mejor metrica

## Errores Comunes

- **No barajar el dataset** — los modelos pueden aprender patrones dependientes del orden desde datos no barajados
- **Usar batch size demasiado grande** — causa errores de out-of-memory; reduce el batch size o usa gradient accumulation
- **Olvidar establecer `num_labels`** — por defecto es 2; tareas multi-clase necesitan el conteo correcto
- **No mapear etiquetas correctamente** — `LABEL_0`, `LABEL_1` son nombres por defecto; mapealos a etiquetas legibles

## FAQ

**Q: Cuanto toma el fine-tuning?**
A: En una sola GPU (ej. T4), fine-tunear DistilBERT en 2.000 ejemplos por 3 epochs toma ~5-10 minutos. En CPU, espera 30-60 minutos.

**Q: Puedo usar esto para texto no-ingles?**
A: Si. Usa un modelo multilingue como `distilbert-base-multilingual-cased` o modelos especificos del idioma desde el Hub de Hugging Face.

**Q: Cuantos ejemplos necesito?**
A: 500-1.000 ejemplos por clase es un buen punto de partida. Con menos, considera few-shot learning con LLMs.

**Q: Debo fine-tunear o usar un LLM con prompts?**
A: Los modelos fine-tuneados son mas rapidos, baratos y a menudo mas precisos para tareas de clasificacion especificas. Los LLMs son mejores para escenarios zero-shot o few-shot.
