---
contentType: recipes
slug: llm-fine-tuning
title: "Fine-Tune a Language Model for Code Generation"
description: "How to fine-tune a large language model for domain-specific code generation using LoRA, QLoRA, and custom datasets."
metaDescription: "Fine-tune LLMs for code generation with LoRA and QLoRA. Use Hugging Face, custom datasets, and parameter-efficient training for domain-specific models."
difficulty: advanced
topics:
  - ai
tags:
  - ai
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
  - /recipes/python-sentiment-analysis-nltk
  - /recipes/slack-bot-openai
  - /recipes/prompt-engineering
lastUpdated: "2026-08-18"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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

Fine-tuning adapts a pre-trained large language model to a specific task by
continuing training on a smaller, curated dataset. For code generation, this
means teaching the model your company's API patterns, internal libraries, or
coding standards. Parameter-efficient methods like LoRA and QLoRA let you
fine-tune billion-parameter models on a single GPU by updating only a tiny
fraction of weights.

This recipe covers preparing a code dataset, fine-tuning with LoRA/QLoRA using
Hugging Face, and evaluating the resulting model.

## When to Use

Use this recipe when:

- You need a model that understands your internal APIs, DSLs, or proprietary
  frameworks.
- [Prompt engineering](/recipes/prompt-engineering/) and
  [RAG](/recipes/semantic-search/) aren't enough for highly specialized code
  patterns.
- You've got 500–10,000 high-quality code examples and want better completion
  accuracy.
- You want to reduce inference costs by using a smaller, task-specific model.

Avoid full fine-tuning when:

- Prompt engineering with few-shot examples already works.
- You've got fewer than 200 examples (you'll likely overfit).
- The task definition changes frequently (retraining becomes expensive).

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
    return tokenizer(
        sample["text"],
        truncation=True,
        max_length=512,
        padding="max_length"
    )


dataset = dataset.map(tokenize, batched=True)

# 3. Configure LoRA
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

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
// JavaScript fine-tuning is uncommon for LLMs.
// Use Transformers.js for inference of fine-tuned models:
const { pipeline } = require('@xenova/transformers');

async function generateCode(prompt) {
  const generator = await pipeline(
    'text-generation',
    'Xenova/codegen-350M-mono'
  );
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
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer;
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

Fine-tuning updates a pre-trained model's weights to improve performance on a
narrow task. Full fine-tuning (updating all billions of parameters) requires
massive GPU clusters. **LoRA** (Low-Rank Adaptation) solves this by injecting
small, trainable rank-decomposition matrices into attention layers while freezing
the base model. This reduces trainable parameters by 99%+ while keeping most of
the quality of full fine-tuning.

**QLoRA** goes further by loading the base model in 4-bit quantized precision
(NormalFloat4), cutting VRAM usage by roughly 4x compared to 16-bit. You can
fine-tune a 7B parameter model on a single 24GB GPU.

The training loop is straightforward:

1. Tokenize your code examples into input IDs and attention masks.
2. Forward pass through the frozen base model plus LoRA adapters.
3. Compute loss on next-token prediction.
4. Backpropagate only through LoRA parameters.
5. Repeat for 1–5 epochs on a few hundred to a few thousand examples.

For QLoRA, replace the model load with `BitsAndBytesConfig` (4-bit quantization)
and pass it to `from_pretrained`:

```python
from transformers import BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16
)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto"
)
```

### Costs and scale

| Approach | Setup | Cost (rough) | Notes |
| --- | --- | --- | --- |
| LoRA 7B on A100 | 1x A100 80GB | $10–$25/run | 2–6 hours for 10K examples |
| QLoRA 7B on RTX 3090 | 1x 24GB GPU | $5–$15/run | Slower, but fits consumer GPUs |
| OpenAI fine-tuning | API only | Pay per token | No infrastructure, but less control |
| Inference (vLLM) | Self-hosted | ~$0.001/1K tokens | Cheaper than API for high volume |

## Variants

| Technology | Approach | Notes |
| --- | --- | --- |
| Full fine-tuning | Update all parameters | Best quality, but needs 8+ A100s for 7B models |
| LoRA | Low-rank adapters | Default choice; ~0.5% trainable, near-full quality |
| QLoRA | 4-bit quantized LoRA | Fits 7B on 1x RTX 3090; slightly slower training |
| Prefix tuning | Train prompt embeddings | Older method; LoRA generally preferred |
| Adapter layers | Small bottleneck layers | Similar idea to LoRA; less widely adopted |
| [OpenAI fine-tuning](/recipes/chatbot-openai/) | API-based | Upload JSONL, no infrastructure; pay per token |

## Best Practices

- **Curate high-quality examples**. 500 great examples beat 10,000 mediocre ones.
- **Format prompts consistently**. Use a template like
  `### Task: ...\n### Response: ...` so the model learns the pattern.
- **Start with LoRA rank 8–16**. Increase rank only if underfitting persists
  after 3 epochs.
- **Use learning rate 1e-4 to 2e-4 with cosine decay**. Aggressive rates can
  collapse the model.
- **Hold out 10–20% of data for validation**. Without it, you can't detect
  overfitting.
- **Merge LoRA weights before deployment**. Use `model.merge_and_unload()` to
  reduce inference latency.
- **Log metrics to Weights & Biases or TensorBoard**. Track loss, learning rate,
  and validation metrics in real time.

## Common Mistakes

- **Overfitting** — training too long on small datasets causes verbatim
  memorization; use early stopping.
- **Data leakage** — ensure test examples don't appear in training; deduplicate
  rigorously.
- **Wrong base model** — don't fine-tune a chat model for code; use CodeLlama,
  StarCoder, or DeepSeek-Coder.
- **Tokenizer mismatch** — ensure your code examples tokenize cleanly; check for
  unknown tokens.
- **No evaluation baseline** — always compare against the base model with
  zero-shot prompting before fine-tuning.
- **Not shuffling data** — sorted datasets let the model learn the order instead
  of the content.
- **Too many epochs** — 3 epochs is usually enough for LoRA; more leads to
  memorization.
- **Ignoring contamination** — even small variations of test examples in training
  inflate scores artificially.

## FAQ

### How much data do I need?

For code generation, 500–2,000 high-quality examples often suffice with LoRA.
More data helps for broader domains, but quality and formatting matter more than
sheer volume.

### Can I fine-tune without a GPU?

QLoRA on Google Colab (free T4) works for 7B models with very small batch sizes.
For production training, rent an A100 or use services like Lambda Labs, RunPod, or
Together AI.

### Should I use OpenAI's fine-tuning API instead?

If you need proprietary model quality and have budget, yes. See
[Chatbot with OpenAI](/recipes/chatbot-openai/) for API-based approaches. For
cost control, privacy, or on-premise deployment, use open-source models with
LoRA/QLoRA on your own hardware.

### How do I format my training data?

Use a consistent prompt template. For code generation, the
`### Task: ...\n### Response: ...` format works well. Each training example
should be a single string with the task and response concatenated. Keep examples
under 512 tokens; increase `max_length` for longer examples, but reduce batch
size.

### How do I know if my fine-tuned model is better?

Compare against the base model on a held-out test set. Measure exact-match
accuracy for code completion, BLEU/ROUGE for natural language, and pass@k for code
generation. Also run human evaluation on 20–50 samples; automated metrics can miss
subtle quality differences.

### Can I fine-tune for multiple languages?

Yes, but include language tags in your training data, for example
`### Language: Python\n### Task: ...`. Mix examples from different languages in
the same dataset. The model learns to use the tag to switch contexts. Use a
multilingual base model like CodeLlama or DeepSeek-Coder.

### How do I deploy a fine-tuned model?

Three options:

1. Merge LoRA weights into the base model and serve with vLLM or TGI.
2. Serve with LoRA adapters separately using PEFT inference.
3. Upload to OpenAI's fine-tuning API for hosted inference.

For production, use vLLM with merged weights for best throughput.

### What is the difference between LoRA rank and alpha?

Rank (`r`) controls the size of the update matrices — higher rank means more
capacity but more parameters to train. Alpha (`lora_alpha`) scales the LoRA
update; it's typically set to 2x the rank. Start with r=16, alpha=32. Increase
rank only if the model underfits after 3 epochs.
