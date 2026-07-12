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
  - ai
  - llm
  - machine-learning
  - neural-networks
  - nlp
relatedResources:
  - /recipes/chatbot-openai
  - /recipes/rag-pipeline
  - /recipes/semantic-search
  - /guides/software-architecture-guide
  - /guides/system-design-interview-guide
  - /recipes/python-sentiment-analysis-nltk
  - /recipes/slack-bot-openai
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

This approach handles preparing a code dataset, fine-tuning with LoRA/QLoRA using Hugging Face, and evaluating the resulting model.

## When to Use

Use this resource when:
- You need a model that understands your internal APIs, DSLs, or proprietary frameworks
- [Prompt engineering](/recipes/ai/prompt-engineering) and [RAG](/recipes/ai/semantic-search) are insufficient for highly specialized code patterns
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
| [OpenAI fine-tuning](/recipes/ai/chatbot-openai) | API-based | Upload JSONL, no infrastructure; pay per token |

## What Works

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

If you need proprietary model quality (GPT-4 class) and have budget, yes. See [Chatbot with OpenAI](/recipes/ai/chatbot-openai) for API-based approaches. For cost control, privacy, or on-premise deployment, use open-source models with LoRA/QLoRA on your own hardware.

### How do I format my training data?

Use a consistent prompt template. For code generation, the `### Task: ...\n### Response: ...` format works well. Each training example should be a single string with the task and response concatenated. Keep examples under 512 tokens to fit within memory constraints. For longer examples, increase `max_length` but reduce batch size.

### How do I know if my fine-tuned model is better?

Compare against the base model on a held-out test set. Measure exact-match accuracy for code completion, BLEU/ROUGE for natural language, and pass@k for code generation (does the generated code pass tests?). Also run human evaluation on 20-50 samples — automated metrics can miss subtle quality differences.

### Can I fine-tune for multiple languages?

Yes, but include language tags in your training data (e.g., `### Language: Python\n### Task: ...`). Mix examples from different languages in the same dataset. The model learns to use the language tag to switch contexts. For best results, use a multilingual base model like CodeLlama or DeepSeek-Coder.

### How do I deploy a fine-tuned model?

Three options: (1) merge LoRA weights into the base model and serve with vLLM or TGI, (2) serve with LoRA adapters separately using PEFT inference, (3) upload to OpenAI's fine-tuning API for hosted inference. For production, use vLLM with merged weights for best throughput.

### What is the difference between LoRA rank and alpha?

Rank (`r`) controls the size of the update matrices — higher rank means more capacity but more parameters to train. Alpha (`lora_alpha`) scales the LoRA update — it is typically set to 2x the rank. Start with r=16, alpha=32. Increase rank only if the model underfits after 3 epochs.

## Additional Common Mistakes

- **Not shuffling training data** — if your dataset is sorted by topic or difficulty, the model learns the order instead of the content. Always shuffle before training.
- **Using too many epochs** — 3 epochs is usually enough for LoRA. Beyond that, the model memorizes training examples and loses generalization ability.
- **Not using a validation set** — without a validation set, you cannot detect overfitting during training. Hold out 10-20% of your data for validation.
- **Mixing chat and code formats** — if your base model is a chat model (e.g., Llama-3-Instruct), use chat format for fine-tuning. If it is a base model (e.g., CodeLlama), use completion format. Mixing formats confuses the model.
- **Not checking for data contamination** — ensure your test set does not contain examples that appear in the training set, even with minor variations. Deduplicate by content hash.
- **Using the wrong learning rate scheduler** — cosine decay with warmup is standard for LoRA. Linear decay can work but may underperform. Avoid constant learning rate — it prevents the model from settling into minima.
- **Forgetting to save checkpoints** — save a checkpoint at each epoch. If training diverges at epoch 3, you can resume from epoch 2 instead of starting over.
- **Not monitoring GPU utilization** — if GPU utilization is below 80%, increase batch size or gradient accumulation steps. Underutilized GPUs mean longer training times for no benefit.

## Best Practices

- **Start with a small subset**: train on 50-100 examples first to verify the pipeline works end-to-end. Debug formatting, tokenization, and training loop issues before scaling to the full dataset.
- **Use weight decay for regularization**: set `weight_decay` to 0.01-0.1 in your optimizer config. This prevents the LoRA adapters from overfitting to noise in the training data.
- **Log training metrics to Weights & Biases or TensorBoard**: track loss, learning rate, and validation metrics in real-time. Visualizing training curves helps detect divergence early.
- **Test with diverse inputs after training**: evaluate the model on inputs that differ from training examples in style, length, and complexity. This reveals whether the model generalized or memorized.
- **Merge LoRA weights before deployment**: merging reduces inference latency because the model no longer needs to compute LoRA adapters at runtime. Use `merge_and_unload()` in PEFT.
- **Keep training data under version control**: store datasets in Git LFS or DVC. Tag each training run with the dataset version, model config, and training script used. This ensures reproducibility.
- **Set up automated evaluation pipelines**: create a script that runs the model on a fixed test set and reports metrics after each training run. Compare against previous runs to detect regressions.

## Production Checklist

- [ ] Training data deduplicated and shuffled before training
- [ ] Validation set held out (10-20% of data)
- [ ] Checkpoints saved at each epoch
- [ ] Training metrics logged to W&B or TensorBoard
- [ ] GPU utilization monitored (target: 80%+)
- [ ] LoRA weights merged before deployment (`merge_and_unload()`)
- [ ] Model evaluated on diverse out-of-distribution inputs
- [ ] Training data versioned in Git LFS or DVC
- [ ] Learning rate scheduler uses cosine decay with warmup
- [ ] Data contamination check passed (no test examples in training set)

## Scaling Considerations

When fine-tuning at scale, consider these factors:

- **GPU memory limits**: LoRA reduces memory requirements, but you still need enough VRAM for the base model. A 7B model needs ~14 GB VRAM in 16-bit precision. Use gradient checkpointing and 4-bit quantization (QLoRA) to fit larger models on smaller GPUs.
- **Training time**: fine-tuning a 7B model on 10K examples for 3 epochs takes 2-6 hours on a single A100. For larger datasets or models, use distributed training across multiple GPUs with DeepSpeed or FSDP.
- **Dataset size vs. quality**: 500 high-quality examples often outperform 5000 mediocre ones. Focus on label accuracy, diverse phrasing, and edge cases. A dataset that is too large with noisy labels degrades model performance.
- **Inference cost after fine-tuning**: a fine-tuned 7B model served via vLLM or TGI costs ~$0.001 per 1K tokens on a self-hosted GPU. Compare this against GPT-4o-mini at $0.00015 per 1K tokens. Fine-tuning wins when you need domain-specific behavior that prompting cannot achieve.
- **Model serving infrastructure**: use vLLM, Text Generation Inference (TGI), or Ollama for serving fine-tuned models. vLLM supports PagedAttention for efficient batched inference. Set up auto-scaling based on request queue depth.

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| GPU rental (A100 80GB) | $2-$4/hour | AWS p4d, GCP a2-ultragpu |
| Training (10K examples, 3 epochs) | $10-$25 | 2-6 hours on 1x A100 |
| Storage (model weights) | $0.023/GB/month | S3 standard |
| Inference (vLLM, 7B model) | $0.001/1K tokens | Self-hosted on 1x A10 |
| Inference (GPT-4o-mini comparison) | $0.00015/1K tokens | OpenAI API |

Fine-tuning is cost-effective when you need domain-specific behavior that prompting cannot achieve. For general tasks, use hosted APIs.

## When Not to Fine-Tune

- **Prompt engineering solves the problem**: try few-shot prompting, chain-of-thought, and structured output formats first. Fine-tuning is expensive and time-consuming compared to prompt iteration.
- **Your dataset is <100 examples**: LoRA needs at least 200-500 examples to learn meaningful patterns. Below that, you are overfitting to noise.
- **The task changes frequently**: fine-tuned models are frozen at training time. If your task definition shifts monthly, you will retrain repeatedly. Use prompting instead, which adapts instantly.
- **You need multi-step reasoning**: fine-tuning improves style and tone but does not teach new reasoning capabilities. For complex reasoning, use agents or chain-of-thought prompting.
- **Latency budget is tight**: fine-tuned 7B models on self-hosted GPUs have higher latency than GPT-4o-mini API calls. For low-latency applications, use hosted APIs with streaming.
