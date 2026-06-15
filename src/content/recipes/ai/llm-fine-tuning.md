---
contentType: recipes
slug: llm-fine-tuning
title: "Fine-Tune a Language Model for Code Generation"
description: "How to fine-tune a large language model for domain-specific code generation using LoRA, QLoRA, and custom datasets"
metaDescription: "Fine-tune LLMs for code generation with LoRA and QLoRA. Use Hugging Face, custom datasets, and parameter-efficient training for domain-specific models."
difficulty: advanced
topics:
  - ai
tags:
  - llm
  - fine-tuning
  - lora
  - qlora
  - hugging-face
  - code-generation
relatedResources:
  - /recipes/chatbot-openai
  - /recipes/rag-pipeline
  - /recipes/semantic-search
  - /guides/software-architecture-guide
  - /guides/system-design-interview-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Fine-tune LLMs for code generation with LoRA and QLoRA. Use Hugging Face, custom datasets, and parameter-efficient training for domain-specific models."
  keywords:
    - llm
    - fine-tuning
    - lora
    - qlora
    - hugging-face
    - code-generation
---
## Overview

Fine-tuning adapts a pre-trained large language model to a specific task or domain by continuing training on a smaller, curated dataset. For code generation, this means teaching the model your company's API patterns, internal libraries, or coding standards. Parameter-efficient methods like LoRA and QLoRA let you fine-tune billion-parameter models on a single GPU by updating only a tiny fraction of weights.

This recipe covers preparing a code dataset, fine-tuning with LoRA/QLoRA using Hugging Face, and evaluating the resulting model.

## When to Use

Use this resource when:
- You need a model that understands your internal APIs, DSLs, or proprietary frameworks
- Prompt engineering and RAG are insufficient for highly specialized code patterns
- You have 500–10,000 high-quality code examples and want better completion accuracy
- You want to reduce inference costs by using a smaller, task-specific model

## Solution

### Python

```python
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset
import torch

# 1. Load base model and tokenizer
model_name = "codellama/CodeLlama-7b-hf"
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

# 2. Prepare dataset
raw_data = [
    {"text": "### Task: Generate a Python function to validate email\n### Response:\nimport re\ndef validate_email(email):\n    return re.match(r'...', email) is not None"},
    {"text": "### Task: Create a React useFetch hook\n### Response:\nimport { useState, useEffect } from 'react';\nfunction useFetch(url) { ... }"},
]
dataset = Dataset.from_list(raw_data)

def tokenize(sample):
    return tokenizer(sample["text"], truncation=True, max_length=512, padding="max_length")

dataset = dataset.map(tokenize, batched=True)

# 3. Configure LoRA
lora_config = LoraConfig(
    r=16,                    # Rank of update matrices
    lora_alpha=32,           # Scaling factor
    target_modules=["q_proj", "v_proj"],  # Which layers to adapt
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # ~0.5% of total params

# 4. Train
training_args = TrainingArguments(
    output_dir="./code-lora",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    logging_steps=10,
    save_strategy="epoch",
    fp16=True,
    optim="adamw_torch"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False)
)
trainer.train()
model.save_pretrained("./code-lora-final")
```

### JavaScript

```javascript
// JavaScript fine-tuning is less common for LLMs.
// Use Transformers.js for inference of fine-tuned models:
const { pipeline } = require('@xenova/transformers');

async function generateCode(prompt) {
  const generator = await pipeline('text-generation', 'Xenova/codegen-350M-mono');
  const output = await generator(prompt, {
    max_new_tokens: 128,
    temperature: 0.2,
    do_sample: true,
  });
  return output[0].generated_text;
}

generateCode("function fibonacci(n) {").then(console.log);
```

### Java

```java
// Java fine-tuning typically delegates to Python tooling.
// For inference of fine-tuned models in Java:
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer;
import ai.djl.modality.nlp.qa.QAInput;
import ai.djl.repository.zoo.Criteria;
import ai.djl.inference.Predictor;

public class CodeGenerator {
    public static void main(String[] args) throws Exception {
        Criteria<String, String> criteria = Criteria.builder()
            .setTypes(String.class, String.class)
            .optModelUrls("file:///path/to/fine-tuned-model")
            .optEngine("PyTorch")
            .build();

        try (Predictor<String, String> predictor = criteria.newPredictor()) {
            String prompt = "public class HelloWorld {";
            String generated = predictor.predict(prompt);
            System.out.println(generated);
        }
    }
}
```

## Explanation

Fine-tuning updates a pre-trained model's weights to improve performance on a narrow task. Full fine-tuning (updating all billions of parameters) requires massive GPU clusters. **LoRA** (Low-Rank Adaptation) solves this by injecting small, trainable rank-decomposition matrices into attention layers while freezing the base model. This reduces trainable parameters by 99%+ while preserving 95%+ of full fine-tuning's quality.

**QLoRA** goes further by loading the base model in 4-bit quantized precision (NormalFloat4), cutting VRAM usage by ~4x compared to 16-bit. You can fine-tune a 7B parameter model on a single 24GB GPU.

**Training loop:**
1. Tokenize your code examples into input IDs and attention masks
2. Forward pass through the frozen base model + LoRA adapters
3. Compute loss on next-token prediction
4. Backpropagate only through LoRA parameters
5. Repeat for 1–5 epochs on a few hundred to thousand examples

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Full fine-tuning | Update all parameters | Best quality, but needs 8+ A100s for 7B models |
| LoRA | Low-rank adapters | Default choice; ~0.5% trainable, near-full quality |
| QLoRA | 4-bit quantized LoRA | Fits 7B on 1x RTX 3090; slightly slower training |
| Prefix tuning | Train prompt embeddings | Older method; LoRA generally preferred |
| Adapter layers | Small bottleneck layers | Similar idea to LoRA; less widely adopted |
| OpenAI fine-tuning | API-based | Upload JSONL, no infrastructure; pay per token |

## Best Practices

1. Curate high-quality examples: 500 great examples beat 10,000 mediocre ones
2. Format prompts consistently (e.g., `### Task: ...\n### Response: ...`) so the model learns the pattern
3. Start with LoRA rank=8–16; increase only if underfitting persists after 3 epochs
4. Use learning rate 1e-4 to 2e-4 with cosine decay; avoid aggressive rates that collapse the model
5. Evaluate with exact-match and BLEU/ROUGE metrics on a held-out test set

## Common Mistakes

1. **Overfitting** — training too long on small datasets causes verbatim memorization; use early stopping
2. **Data leakage** — ensure test examples do not appear in training; deduplicate rigorously
3. **Wrong base model** — do not fine-tune a chat model for code; use CodeLlama, StarCoder, or DeepSeek-Coder
4. **Ignoring tokenizer mismatch** — ensure your code examples tokenize cleanly; check for unknown tokens
5. **No evaluation baseline** — always compare against the base model with zero-shot prompting before fine-tuning

## Frequently Asked Questions

### How much data do I need?

For code generation, 500–2,000 high-quality examples often suffice with LoRA. More data helps for broader domains, but quality and formatting matter more than sheer volume.

### Can I fine-tune without a GPU?

QLoRA on Google Colab (free T4) works for 7B models with very small batch sizes. For production training, rent an A100 or use services like Lambda Labs, RunPod, or Together AI.

### Should I use OpenAI's fine-tuning API instead?

If you need proprietary model quality (GPT-4 class) and have budget, yes. For cost control, privacy, or on-premise deployment, use open-source models with LoRA/QLoRA on your own hardware.
