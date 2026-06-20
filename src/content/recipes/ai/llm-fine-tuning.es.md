---
contentType: recipes
slug: llm-fine-tuning
title: "Fine-tuning de un modelo de lenguaje para generación de código"
description: "Cómo hacer fine-tuning de un modelo de lenguaje grande para generación de código específico de dominio usando LoRA, QLoRA y datasets personalizados"
metaDescription: "Haz fine-tuning de LLMs para generación de código con LoRA y QLoRA. Usa Hugging Face y datasets personalizados para modelos específicos de dominio."
difficulty: advanced
topics:
  - ai
tags:
  - ai
  - llm
relatedResources:
  - /recipes/chatbot-openai
  - /recipes/rag-pipeline
  - /recipes/semantic-search
  - /guides/software-architecture-guide
  - /guides/system-design-interview-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Haz fine-tuning de LLMs para generación de código con LoRA y QLoRA. Usa Hugging Face y datasets personalizados para modelos específicos de dominio."
  keywords:
    - llm
    - fine-tuning
    - lora
    - qlora
    - hugging-face
    - generacion-codigo
---

## Visión General

El fine-tuning adapta un modelo de lenguaje pre-entrenado a una tarea o dominio específico continuando el entrenamiento con un dataset más pequeño y curado. Para generación de código, esto significa enseñarle al modelo los patrones de API de tu empresa, bibliotecas internas o estándares de codificación. Métodos eficientes en parámetros como LoRA y QLoRA permiten hacer fine-tuning de modelos de miles de millones de parámetros en una sola GPU actualizando solo una fracción mínima de pesos.

Esta receta cubre la preparación de un dataset de código, fine-tuning con LoRA/QLoRA usando Hugging Face y la evaluación del modelo resultante.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas un modelo que entienda tus APIs internas, DSLs o frameworks propietarios
- El [prompt engineering](/recipes/ai/prompt-engineering) y [RAG](/recipes/ai/semantic-search) son insuficientes para patrones de código altamente especializados
- Tienes 500–10.000 ejemplos de código de alta calidad y quieres mejorar la precisión de completado
- Quieres reducir costos de inferencia usando un modelo más pequeño y específico de tarea

## Solución

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

# 1. Cargar modelo base y tokenizador
model_name = "codellama/CodeLlama-7b-hf"
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

# 2. Preparar dataset
raw_data = [
    {"text": "### Task: Generar función Python para validar email\n### Response:\nimport re\ndef validate_email(email):\n    return re.match(r'...', email) is not None"},
    {"text": "### Task: Crear hook useFetch de React\n### Response:\nimport { useState, useEffect } from 'react';\nfunction useFetch(url) { ... }"},
]
dataset = Dataset.from_list(raw_data)

def tokenize(sample):
    return tokenizer(sample["text"], truncation=True, max_length=512, padding="max_length")

dataset = dataset.map(tokenize, batched=True)

# 3. Configurar LoRA
lora_config = LoraConfig(
    r=16,                    # Rango de matrices de actualización
    lora_alpha=32,           # Factor de escala
    target_modules=["q_proj", "v_proj"],  # Capas a adaptar
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # ~0.5% de parámetros totales

# 4. Entrenar
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
// El fine-tuning de LLMs en JavaScript es menos común.
// Usa Transformers.js para inferencia de modelos fine-tuneados:
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
// El fine-tuning en Java generalmente delega a herramientas de Python.
// Para inferencia de modelos fine-tuneados en Java:
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

## Explicación

El fine-tuning actualiza los pesos de un modelo pre-entrenado para mejorar rendimiento en una tarea estrecha. El fine-tuning completo (actualizando todos los miles de millones de parámetros) requiere clusters masivos de GPU. **LoRA** (Low-Rank Adaptation) resuelve esto inyectando pequeñas matrices de descomposición de rango entrenables en capas de atención mientras congela el modelo base. Esto reduce parámetros entrenables en 99%+ preservando 95%+ de la calidad del fine-tuning completo.

**QLoRA** va más allá cargando el modelo base en precisión cuantizada de 4 bits (NormalFloat4), reduciendo uso de VRAM ~4x comparado con 16 bits. Puedes hacer fine-tuning de un modelo de 7B parámetros en una sola GPU de 24GB.

**Ciclo de entrenamiento:**
1. Tokeniza tus ejemplos de código en input IDs y attention masks
2. Forward pass a través del modelo base congelado + adaptadores LoRA
3. Calcula pérdida en predicción del siguiente token
4. Retropropaga solo a través de parámetros LoRA
5. Repite por 1–5 epochs en unos cientos a miles de ejemplos

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Full fine-tuning | Actualizar todos los parámetros | Mejor calidad, pero necesita 8+ A100s para modelos 7B |
| LoRA | Adaptadores de bajo rango | Elección por defecto; ~0.5% entrenables, calidad cercana al completo |
| QLoRA | LoRA cuantizada a 4 bits | Cabe 7B en 1x RTX 3090; entrenamiento ligeramente más lento |
| Prefix tuning | Entrenar embeddings de prompt | Método anterior; LoRA generalmente preferido |
| Adapter layers | Pequeñas capas bottleneck | Idea similar a LoRA; menos adoptado |
| [OpenAI fine-tuning](/recipes/ai/chatbot-openai) | Basado en API | Subir JSONL, sin infraestructura; pago por token |

## Mejores Prácticas

1. Curaduría de ejemplos de alta calidad: 500 ejemplos excelentes superan 10.000 mediocres
2. Formatea prompts consistentemente (ej. `### Task: ...\n### Response: ...`) para que el modelo aprenda el patrón
3. Comienza con LoRA rank=8–16; aumenta solo si el underfitting persiste después de 3 epochs
4. Usa learning rate 1e-4 a 2e-4 con decaimiento coseno; evita tasas agresivas que colapsen el modelo
5. Evalúa con métricas exact-match y BLEU/ROUGE en un conjunto de prueba separado

## Errores Comunes

1. **Overfitting** — entrenar demasiado en datasets pequeños causa memorización literal; usa early stopping
2. **Fuga de datos** — asegúrate de que ejemplos de prueba no aparezcan en entrenamiento; deduplica rigurosamente
3. **Modelo base incorrecto** — no hagas fine-tuning de un modelo chat para código; usa CodeLlama, StarCoder o DeepSeek-Coder
4. **Ignorar mismatch del tokenizador** — asegúrate de que tus ejemplos tokenicen limpiamente; verifica tokens desconocidos
5. **Sin línea base de evaluación** — compara siempre contra el modelo base con zero-shot prompting antes de fine-tuning

## Preguntas Frecuentes

### ¿Cuántos datos necesito?

Para generación de código, 500–2.000 ejemplos de alta calidad suelen bastar con LoRA. Más datos ayudan para dominios más amplios, pero la calidad y el formato importan más que el volumen.

### ¿Puedo hacer fine-tuning sin GPU?

QLoRA en Google Colab (T4 gratis) funciona para modelos 7B con batch sizes muy pequeños. Para entrenamiento en producción, renta una A100 o usa servicios como Lambda Labs, RunPod o Together AI.

### ¿Debo usar la API de fine-tuning de OpenAI en su lugar?

Si necesitas calidad de modelo propietario (clase GPT-4) y tienes presupuesto, sí. Consulta [Chatbot con OpenAI](/recipes/ai/chatbot-openai) para enfoques basados en API. Para control de costos, privacidad o despliegue on-premise, usa modelos de código abierto con LoRA/QLoRA en tu propio hardware.
