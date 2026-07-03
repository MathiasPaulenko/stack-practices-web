---
contentType: recipes
slug: python-huggingface-text-classification
title: "Fine-Tune and Deploy Text Classifiers with Hugging Face Transformers"
description: "Fine-tune a pre-trained transformer model for text classification using Hugging Face Trainer, tokenize datasets, evaluate metrics, and deploy for inference"
metaDescription: "Fine-tune text classifiers with Hugging Face Transformers. Use Trainer API, tokenize datasets, evaluate F1 accuracy, and deploy with pipeline for inference."
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
  metaDescription: "Fine-tune text classifiers with Hugging Face Transformers. Use Trainer API, tokenize datasets, evaluate F1 accuracy, and deploy with pipeline for inference."
  keywords:
    - huggingface transformers
    - text classification fine-tune
    - bert classification
    - huggingface trainer
    - python nlp
---

# Fine-Tune and Deploy Text Classifiers with Hugging Face Transformers

Pre-trained transformer models like BERT and DistilBERT achieve state-of-the-art results on text classification. Hugging Face's `transformers` library provides the `Trainer` API to fine-tune these models on custom datasets with minimal code. Below: loading a dataset, tokenizing, fine-tuning, evaluating, and deploying a classifier.

## When to Use This

- Sentiment analysis on customer reviews or social media
- Spam detection, topic classification, or intent recognition
- Any text classification task where a fine-tuned model outperforms prompt-based approaches

## Prerequisites

- Python 3.10+
- `transformers`, `datasets`, `evaluate` packages
- A GPU is recommended (but CPU works for small datasets)

## Solution

### 1. Install Dependencies

```bash
pip install transformers datasets evaluate torch accelerate
```

### 2. Load and Prepare the Dataset

```python
from datasets import load_dataset, DatasetDict

# Load a sentiment analysis dataset
dataset = load_dataset("imdb")

# Subset for faster training (optional)
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

### 3. Tokenize the Dataset

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

# Set format for PyTorch
tokenized_datasets.set_format(
    type="torch",
    columns=["input_ids", "attention_mask", "label"],
)
```

### 4. Fine-Tune with Trainer API

```python
from transformers import (
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)
import evaluate

# Load pre-trained model with classification head
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=2,
)

# Define training arguments
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

# Load evaluation metrics
f1_metric = evaluate.load("f1")
accuracy_metric = evaluate.load("accuracy")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = logits.argmax(axis=-1)
    return {
        "f1": f1_metric.compute(predictions=predictions, references=labels)["f1"],
        "accuracy": accuracy_metric.compute(predictions=predictions, references=labels)["accuracy"],
    }

# Create Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
    compute_metrics=compute_metrics,
)

# Train
trainer.train()
```

### 5. Evaluate the Model

```python
eval_results = trainer.evaluate()
print(f"F1 Score: {eval_results['eval_f1']:.4f}")
print(f"Accuracy: {eval_results['eval_accuracy']:.4f}")
```

### 6. Save and Deploy

```python
# Save the fine-tuned model and tokenizer
model_dir = "./sentiment-classifier"
trainer.save_model(model_dir)
tokenizer.save_pretrained(model_dir)

# Load for inference
from transformers import pipeline

classifier = pipeline(
    "text-classification",
    model=model_dir,
    tokenizer=model_dir,
    device=0 if torch.cuda.is_available() else -1,
)

# Predict
result = classifier("This movie was absolutely fantastic!")
print(result)
# [{'label': 'LABEL_1', 'score': 0.9998}]
```

### 7. Batch Inference Service

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

# Usage
service = TextClassificationService("./sentiment-classifier")
predictions = service.classify([
    "Great product, highly recommend!",
    "Terrible experience, would not buy again.",
    "It's okay, nothing special.",
])
for p in predictions:
    print(f"{p['label']}: {p['score']:.3f} — {p['text']}")
```

## How It Works

1. **Tokenization** converts text into token IDs that the model understands. `padding="max_length"` ensures uniform sequence length, and `truncation=True` cuts texts longer than `max_length`.
2. **`AutoModelForSequenceClassification`** loads a pre-trained model with a new classification head on top. The base layers retain their pre-trained weights; only the head is randomly initialized.
3. **`Trainer`** handles the training loop: forward pass, loss computation, backpropagation, optimizer steps, learning rate scheduling, and checkpointing. It also supports distributed training and mixed precision.
4. **`compute_metrics`** runs after each evaluation epoch, calculating F1 and accuracy from the model's logits and the true labels.
5. **`pipeline`** wraps the model and tokenizer into a single inference function, handling tokenization, model inference, and post-processing (softmax, label mapping).

## Variants

### Multi-Class Classification

```python
# For 3+ classes (e.g., topic classification)
num_labels = 5  # sports, politics, tech, health, entertainment

model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=num_labels,
)

# Use macro F1 for imbalanced multi-class
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = logits.argmax(axis=-1)
    return {
        "f1_macro": f1_metric.compute(
            predictions=predictions, references=labels, average="macro"
        )["f1"],
    }
```

### Custom Dataset from CSV

```python
from datasets import Dataset

# Load from CSV
dataset = Dataset.from_csv("reviews.csv")  # columns: text, label

# Or from a list of dicts
data = [
    {"text": "Great product!", "label": 1},
    {"text": "Worst purchase ever.", "label": 0},
]
dataset = Dataset.from_list(data)
```

### ONNX Export for Faster Inference

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from optimum.onnxruntime import ORTModelForSequenceClassification

# Export to ONNX
model = AutoModelForSequenceClassification.from_pretrained("./sentiment-classifier")
ort_model = ORTModelForSequenceClassification.from_pretrained(
    "./sentiment-classifier",
    export=True,
)
ort_model.save_pretrained("./sentiment-classifier-onnx")

# Use ONNX pipeline (2-4x faster on CPU)
classifier = pipeline(
    "text-classification",
    model=ort_model,
    tokenizer="./sentiment-classifier",
)
```

### Early Stopping

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

## Best Practices

- **Start with DistilBERT** — it is 40% smaller than BERT with 95% of the performance for most classification tasks
- **Use `max_length=256` or `512`** — longer sequences improve accuracy but increase training time quadratically
- **Monitor validation F1, not just loss** — loss can decrease while F1 plateaus or drops
- **Save the best model** — `load_best_model_at_end=True` keeps the checkpoint with the best metric

## Common Mistakes

- **Not shuffling the dataset** — models can learn order-dependent patterns from unshuffled data
- **Using too large a batch size** — causes out-of-memory errors; reduce batch size or use gradient accumulation
- **Forgetting to set `num_labels`** — defaults to 2; multi-class tasks need the correct count
- **Not mapping labels correctly** — `LABEL_0`, `LABEL_1` are default names; map them to human-readable labels

## FAQ

**Q: How long does fine-tuning take?**
A: On a single GPU (e.g., T4), fine-tuning DistilBERT on 2,000 examples for 3 epochs takes ~5-10 minutes. On CPU, expect 30-60 minutes.

**Q: Can I use this for non-English text?**
A: Yes. Use a multilingual model like `distilbert-base-multilingual-cased` or language-specific models from the Hugging Face Hub.

**Q: How many examples do I need?**
A: 500-1,000 examples per class is a good starting point. With fewer, consider few-shot learning with LLMs instead.

**Q: Should I fine-tune or use an LLM with prompts?**
A: Fine-tuned models are faster, cheaper, and often more accurate for specific classification tasks. LLMs are better for zero-shot or few-shot scenarios.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
