---
contentType: recipes
slug: llm-fine-tuning
title: "Fine-tuning de un modelo de lenguaje para generación de"
description: "Cómo hacer fine-tuning de un modelo de lenguaje grande para generación de código específico de dominio usando LoRA, QLoRA y datasets personalizados"
metaDescription: "Haz fine-tuning de LLMs para generación de código con LoRA y QLoRA. Usa Hugging Face y datasets personalizados para modelos específicos de dominio."
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

El siguiente enfoque cubre la preparación de un dataset de código, fine-tuning con LoRA/QLoRA usando Hugging Face y la evaluación del modelo resultante.

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

## Lo que funciona

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

### ¿Cómo formateo mis datos de entrenamiento?

Usa una plantilla de prompt consistente. Para generación de código, el formato `### Task: ...\n### Response: ...` funciona bien. Cada ejemplo de entrenamiento debería ser un solo string con la tarea y respuesta concatenadas. Mantén ejemplos por debajo de 512 tokens para caber en restricciones de memoria. Para ejemplos más largos, aumenta `max_length` pero reduce el batch size.

### ¿Cómo sé si mi modelo fine-tuned es mejor?

Compara contra el modelo base en un conjunto de prueba separado. Mide exact-match accuracy para completación de código, BLEU/ROUGE para lenguaje natural, y pass@k para generación de código (¿el código generado pasa los tests?). También ejecuta evaluación humana en 20-50 muestras — las métricas automatizadas pueden perder diferencias sutiles de calidad.

### ¿Puedo hacer fine-tuning para múltiples lenguajes?

Sí, pero incluye tags de lenguaje en tus datos de entrenamiento (ej. `### Language: Python\n### Task: ...`). Mezcla ejemplos de diferentes lenguajes en el mismo dataset. El modelo aprende a usar el tag de lenguaje para switchear contextos. Para mejores resultados, usa un modelo base multilingual como CodeLlama o DeepSeek-Coder.

### ¿Cómo despliego un modelo fine-tuned?

Tres opciones: (1) mergeear los pesos de LoRA en el modelo base y servir con vLLM o TGI, (2) servir con adaptadores LoRA separadamente usando PEFT inference, (3) subir a la API de fine-tuning de OpenAI para inference hospedado. Para producción, usa vLLM con pesos mergeados para mejor throughput.

### ¿Cuál es la diferencia entre LoRA rank y alpha?

Rank (`r`) controla el tamaño de las matrices de update — mayor rank significa más capacidad pero más parámetros a entrenar. Alpha (`lora_alpha`) escala el update de LoRA — típicamente se setea a 2x el rank. Comienza con r=16, alpha=32. Aumenta el rank solo si el modelo underfitea después de 3 epochs.

## Errores Comunes Adicionales

- **No shufflear los datos de entrenamiento** — si tu dataset está ordenado por tema o dificultad, el modelo aprende el orden en lugar del contenido. Siempre shufflea antes de entrenar.
- **Usar demasiados epochs** — 3 epochs suele ser suficiente para LoRA. Más allá de eso, el modelo memoriza ejemplos de entrenamiento y pierde capacidad de generalización.
- **No usar un validation set** — sin un validation set, no puedes detectar overfitting durante el entrenamiento. Separa 10-20% de tus datos para validación.
- **Mezclar formatos chat y código** — si tu modelo base es un chat model (ej. Llama-3-Instruct), usa formato chat para fine-tuning. Si es un base model (ej. CodeLlama), usa formato completion. Mezclar formatos confunde al modelo.
- **No verificar contaminación de datos** — asegúrate de que tu test set no contenga ejemplos que aparecen en el training set, incluso con variaciones menores. Deduplica por content hash.
- **Usar el learning rate scheduler equivocado** — cosine decay con warmup es estándar para LoRA. Linear decay puede funcionar pero puede underperformar. Evita learning rate constante — previene que el modelo se asiente en mínimos.
- **Olvidar guardar checkpoints** — guarda un checkpoint en cada epoch. Si el entrenamiento diverge en epoch 3, puedes resumir desde epoch 2 en lugar de empezar de cero.
- **No monitorear utilización de GPU** — si la utilización de GPU está por debajo del 80%, aumenta el batch size o gradient accumulation steps. GPUs subutilizadas significan tiempos de entrenamiento más largos sin beneficio.

## Buenas Prácticas

- **Comienza con un subset pequeño**: entrena en 50-100 ejemplos primero para verificar que el pipeline funciona end-to-end. Debuguea issues de formateo, tokenización y loop de entrenamiento antes de escalar al dataset completo.
- **Usa weight decay para regularización**: setea `weight_decay` a 0.01-0.1 en la config de tu optimizer. Esto previene que los adaptadores LoRA overfiteen a ruido en los datos de entrenamiento.
- **Loguea métricas de entrenamiento a Weights & Biases o TensorBoard**: trackea loss, learning rate y métricas de validación en tiempo real. Visualizar curvas de entrenamiento ayuda a detectar divergencia temprano.
- **Testea con inputs diversos después de entrenar**: evalúa el modelo en inputs que difieran de los ejemplos de entrenamiento en estilo, longitud y complejidad. Esto revela si el modelo generalizó o memorizó.
- **Mergea pesos de LoRA antes del despliegue**: mergeear reduce la latencia de inferencia porque el modelo ya no necesita computar adaptadores LoRA en runtime. Usa `merge_and_unload()` en PEFT.
- **Mantén datos de entrenamiento bajo version control**: almacena datasets en Git LFS o DVC. Taggea cada run de entrenamiento con la versión del dataset, config del modelo y script de entrenamiento usado. Esto asegura reproducibilidad.
- **Setea pipelines de evaluación automatizados**: crea un script que ejecute el modelo en un test set fijo y reporte métricas después de cada run de entrenamiento. Compara contra runs previos para detectar regresiones.

## Checklist de Producción

- [ ] Datos de entrenamiento deduplicados y shuffliados antes de entrenar
- [ ] Validation set separado (10-20% de los datos)
- [ ] Checkpoints guardados en cada epoch
- [ ] Métricas de entrenamiento logueadas a W&B o TensorBoard
- [ ] Utilización de GPU monitoreada (target: 80%+)
- [ ] Pesos de LoRA mergeados antes del despliegue (`merge_and_unload()`)
- [ ] Modelo evaluado en inputs diversos out-of-distribution
- [ ] Datos de entrenamiento versionados en Git LFS o DVC
- [ ] Learning rate scheduler usa cosine decay con warmup
- [ ] Check de contaminación de datos pasado (sin ejemplos de test en training set)

## Consideraciones de Escalado

Al hacer fine-tuning a escala, considera estos factores:

- **Límites de memoria GPU**: LoRA reduce los requisitos de memoria, pero aún necesitas suficiente VRAM para el modelo base. Un modelo 7B necesita ~14 GB VRAM en precisión 16-bit. Usa gradient checkpointing y 4-bit quantization (QLoRA) para fittear modelos más grandes en GPUs más pequeñas.
- **Tiempo de entrenamiento**: fine-tunear un modelo 7B en 10K ejemplos por 3 epochs toma 2-6 horas en una sola A100. Para datasets o modelos más grandes, usa entrenamiento distribuido across múltiples GPUs con DeepSpeed o FSDP.
- **Tamaño de dataset vs. calidad**: 500 ejemplos de alta calidad a menudo outperforman 5000 mediocres. Fócate en accuracy de etiquetas, phrasing diverso y edge cases. Un dataset demasiado grande con etiquetas ruidosas degrada el rendimiento del modelo.
- **Costo de inferencia después del fine-tuning**: un modelo 7B fine-tuned servido vía vLLM o TGI cuesta ~$0.001 por 1K tokens en una GPU self-hosted. Compara esto contra GPT-4o-mini a $0.00015 por 1K tokens. Fine-tuning gana cuando necesitas comportamiento domain-specific que prompting no puede lograr.
- **Infraestructura de serving de modelo**: usa vLLM, Text Generation Inference (TGI) u Ollama para servir modelos fine-tuned. vLLM soporta PagedAttention para inferencia batched eficiente. Setea auto-scaling basado en la profundidad de la cola de requests.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| GPU rental (A100 80GB) | $2-$4/hora | AWS p4d, GCP a2-ultragpu |
| Entrenamiento (10K ejemplos, 3 epochs) | $10-$25 | 2-6 horas en 1x A100 |
| Almacenamiento (pesos del modelo) | $0.023/GB/mes | S3 standard |
| Inferencia (vLLM, modelo 7B) | $0.001/1K tokens | Self-hosted en 1x A10 |
| Inferencia (GPT-4o-mini comparación) | $0.00015/1K tokens | OpenAI API |

Fine-tuning es cost-effective cuando necesitas comportamiento domain-specific que prompting no puede lograr. Para tareas generales, usa APIs hosted.

## Cuándo No Hacer Fine-Tuning

- **Prompt engineering resuelve el problema**: prueba few-shot prompting, chain-of-thought y formatos de output estructurados primero. Fine-tuning es costoso y time-consuming comparado con iteración de prompts.
- **Tu dataset es <100 ejemplos**: LoRA necesita al menos 200-500 ejemplos para aprender patrones meaningful. Por debajo de eso, estás overfiteando a ruido.
- **La tarea cambia frecuentemente**: los modelos fine-tuned están frozen al momento del entrenamiento. Si la definición de tu tarea cambia mensualmente, vas a retrainear repetidamente. Usa prompting en su lugar, que se adapta instantáneamente.
- **Necesitas razonamiento multi-paso**: fine-tuning mejora estilo y tono pero no enseña nuevas capacidades de razonamiento. Para razonamiento complejo, usa agentes o chain-of-thought prompting.
- **El presupuesto de latencia es tight**: modelos 7B fine-tuned en GPUs self-hosted tienen mayor latencia que llamadas API a GPT-4o-mini. Para aplicaciones de baja latencia, usa APIs hosted con streaming.
