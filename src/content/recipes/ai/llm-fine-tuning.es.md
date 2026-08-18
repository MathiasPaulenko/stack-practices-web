---
contentType: recipes
slug: llm-fine-tuning
title: "Fine-Tuning de un Modelo de Lenguaje para Generación de Código"
description: "Cómo hacer fine-tuning de un modelo de lenguaje grande para generación de código específico de dominio usando LoRA, QLoRA y datasets personalizados."
metaDescription: "Haz fine-tuning de LLMs para generación de código con LoRA y QLoRA. Usa Hugging Face, datasets personalizados y entrenamiento eficiente en parámetros."
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
  - generacion-codigo
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
  metaDescription: "Haz fine-tuning de LLMs para generación de código con LoRA y QLoRA. Usa Hugging Face, datasets personalizados y entrenamiento eficiente en parámetros."
  keywords:
    - llm
    - fine-tuning
    - lora
    - qlora
    - hugging-face
    - generacion-codigo
---

## Visión General

El fine-tuning adapta un modelo de lenguaje pre-entrenado a una tarea
específica, continuando el entrenamiento con un dataset más pequeño y curado.
Para generación de código, esto significa enseñarle al modelo los patrones de
API de tu empresa, bibliotecas internas o estándares de codificación. Métodos
eficientes en parámetros como LoRA y QLoRA permiten hacer fine-tuning de
modelos de miles de millones de parámetros en una sola GPU, actualizando solo
una fracción mínima de pesos.

Esta receta cubre preparar un dataset de código, hacer fine-tuning con
LoRA/QLoRA usando Hugging Face y evaluar el modelo resultante.

## Cuándo Usar

Usá esta receta cuando:

- Necesitás un modelo que entienda tus APIs internas, DSLs o frameworks
  propietarios.
- El [prompt engineering](/recipes/prompt-engineering/) y
  [RAG](/recipes/semantic-search/) no alcanzan para patrones de código
  altamente especializados.
- Tenés entre 500 y 10.000 ejemplos de código de alta calidad y querés mejorar
  la precisión de completado.
- Querés reducir costos de inferencia usando un modelo más pequeño y
  específico de tarea.

Evitá el fine-tuning completo cuando:

- El prompt engineering con few-shot ya funciona.
- Tenés menos de 200 ejemplos (probablemente harás overfitting).
- La definición de la tarea cambia frecuentemente (reentrenar se vuelve caro).

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
    return tokenizer(
        sample["text"],
        truncation=True,
        max_length=512,
        padding="max_length"
    )


dataset = dataset.map(tokenize, batched=True)

# 3. Configurar LoRA
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
// El fine-tuning de LLMs en JavaScript es poco común.
// Usá Transformers.js para inferencia de modelos fine-tuneados:
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

## Explicación

El fine-tuning actualiza los pesos de un modelo pre-entrenado para mejorar el
rendimiento en una tarea estrecha. El fine-tuning completo (actualizando todos
los miles de millones de parámetros) requiere clusters masivos de GPU.
**LoRA** (Low-Rank Adaptation) resuelve esto inyectando pequeñas matrices de
descomposición de rango entrenables en capas de atención mientras congela el
modelo base. Esto reduce los parámetros entrenables en 99%+ manteniendo la mayor
parte de la calidad del fine-tuning completo.

**QLoRA** va más allá cargando el modelo base en precisión cuantizada de 4 bits
(NormalFloat4), reduciendo el uso de VRAM aproximadamente 4x comparado con
16 bits. Podés hacer fine-tuning de un modelo de 7B parámetros en una sola GPU de
24GB.

El ciclo de entrenamiento es directo:

1. Tokenizá tus ejemplos de código en input IDs y attention masks.
2. Hacé un forward pass a través del modelo base congelado más los adaptadores
   LoRA.
3. Calculá la pérdida en la predicción del siguiente token.
4. Retropropagá solo a través de los parámetros LoRA.
5. Repetí por 1–5 epochs en unos cientos a miles de ejemplos.

Para QLoRA, reemplazá la carga del modelo con `BitsAndBytesConfig` (cuantización
a 4 bits) y pasala a `from_pretrained`:

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

### Costos y escala

| Enfoque | Setup | Costo (aprox.) | Notas |
| --- | --- | --- | --- |
| LoRA 7B en A100 | 1x A100 80GB | $10–$25/run | 2–6 horas para 10K ejemplos |
| QLoRA 7B en RTX 3090 | 1x GPU 24GB | $5–$15/run | Más lento, pero entra en GPUs de consumo |
| OpenAI fine-tuning | Solo API | Pago por token | Sin infraestructura, pero menos control |
| Inferencia (vLLM) | Self-hosted | ~$0.001/1K tokens | Más barato que API para alto volumen |

## Variantes

| Tecnología | Enfoque | Notas |
| --- | --- | --- |
| Full fine-tuning | Actualizar todos los parámetros | Mejor calidad, pero necesita 8+ A100s para modelos 7B |
| LoRA | Adaptadores de bajo rango | Elección por defecto; ~0.5% entrenables, calidad cercana al completo |
| QLoRA | LoRA cuantizada a 4 bits | Cabe 7B en 1x RTX 3090; entrenamiento ligeramente más lento |
| Prefix tuning | Entrenar embeddings de prompt | Método anterior; LoRA generalmente preferido |
| Adapter layers | Pequeñas capas bottleneck | Idea similar a LoRA; menos adoptado |
| [OpenAI fine-tuning](/recipes/chatbot-openai/) | Basado en API | Subir JSONL, sin infraestructura; pago por token |

## Mejores Prácticas

- **Curá ejemplos de alta calidad**. 500 ejemplos excelentes superan 10.000
  mediocres.
- **Formateá prompts consistentemente**. Usá una plantilla como
  `### Task: ...\n### Response: ...` para que el modelo aprenda el patrón.
- **Empezá con LoRA rank 8–16**. Aumentá el rank solo si el underfitting
  persiste después de 3 epochs.
- **Usá learning rate 1e-4 a 2e-4 con decaimiento coseno**. Tasas agresivas
  pueden colapsar el modelo.
- **Reservá 10–20% de los datos para validación**. Sin eso, no podés detectar
  overfitting.
- **Mergeá los pesos de LoRA antes del despliegue**. Usá
  `model.merge_and_unload()` para reducir la latencia de inferencia.
- **Logueá métricas a Weights & Biases o TensorBoard**. Seguí la pérdida, el
  learning rate y las métricas de validación en tiempo real.

## Errores Comunes

- **Overfitting** — entrenar demasiado en datasets pequeños causa memorización
  literal; usá early stopping.
- **Fuga de datos** — asegurate de que ejemplos de prueba no aparezcan en
  entrenamiento; deduplicá rigurosamente.
- **Modelo base incorrecto** — no hagas fine-tuning de un modelo chat para
  código; usá CodeLlama, StarCoder o DeepSeek-Coder.
- **Mismatch del tokenizador** — asegurate de que tus ejemplos de código
  tokenicen limpiamente; verificá tokens desconocidos.
- **Sin línea base de evaluación** — compará siempre contra el modelo base con
  zero-shot prompting antes de fine-tuning.
- **No shufflear los datos** — datasets ordenados hacen que el modelo aprenda
  el orden en lugar del contenido.
- **Demasiados epochs** — 3 epochs suele ser suficiente para LoRA; más lleva a
  memorización.
- **Ignorar la contaminación** — incluso variaciones menores de ejemplos de test
  en entrenamiento inflan las métricas artificialmente.

## Preguntas Frecuentes

### ¿Cuántos datos necesito?

Para generación de código, 500–2.000 ejemplos de alta calidad suelen bastar con
LoRA. Más datos ayudan para dominios más amplios, pero la calidad y el formato
importan más que el volumen.

### ¿Puedo hacer fine-tuning sin GPU?

QLoRA en Google Colab (T4 gratis) funciona para modelos 7B con batch sizes muy
pequeños. Para entrenamiento en producción, rentá una A100 o usá servicios como
Lambda Labs, RunPod o Together AI.

### ¿Debería usar la API de fine-tuning de OpenAI?

Si necesitás calidad de modelo propietario y tenés presupuesto, sí. Consultá
[Chatbot con OpenAI](/recipes/chatbot-openai/) para enfoques basados en API. Para
control de costos, privacidad o despliegue on-premise, usá modelos de código
abierto con LoRA/QLoRA en tu propio hardware.

### ¿Cómo formateo mis datos de entrenamiento?

Usá una plantilla de prompt consistente. Para generación de código, el formato
`### Task: ...\n### Response: ...` funciona bien. Cada ejemplo de entrenamiento
debería ser un solo string con la tarea y respuesta concatenadas. Mantené los
ejemplos bajo 512 tokens; aumentá `max_length` para ejemplos más largos, pero
reducí el batch size.

### ¿Cómo sé si mi modelo fine-tuned es mejor?

Compará contra el modelo base en un conjunto de prueba separado. Medí
exact-match accuracy para completación de código, BLEU/ROUGE para lenguaje
natural y pass@k para generación de código. También ejecutá evaluación humana en
20–50 muestras; las métricas automatizadas pueden perder diferencias sutiles de
calidad.

### ¿Puedo hacer fine-tuning para múltiples lenguajes?

Sí, pero incluí tags de lenguaje en tus datos de entrenamiento, por ejemplo
`### Language: Python\n### Task: ...`. Mezclá ejemplos de diferentes lenguajes en
el mismo dataset. El modelo aprende a usar el tag para switchear contextos. Usá
un modelo base multilingüe como CodeLlama o DeepSeek-Coder.

### ¿Cómo despliego un modelo fine-tuned?

Tres opciones:

1. Mergeá los pesos de LoRA en el modelo base y serví con vLLM o TGI.
2. Serví con adaptadores LoRA separadamente usando PEFT inference.
3. Subí a la API de fine-tuning de OpenAI para inference hospedado.

Para producción, usá vLLM con pesos mergeados para mejor throughput.

### ¿Cuál es la diferencia entre LoRA rank y alpha?

El rank (`r`) controla el tamaño de las matrices de update — mayor rank significa
más capacidad pero más parámetros a entrenar. Alpha (`lora_alpha`) escala el
update de LoRA; típicamente se setea a 2x el rank. Comenzá con r=16, alpha=32.
Aumentá el rank solo si el modelo underfitea después de 3 epochs.
