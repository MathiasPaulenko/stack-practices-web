---
contentType: guides
slug: complete-guide-local-llm-deployment
title: "Despliegue Local de LLM: Ollama, vLLM y llama.cpp"
description: "Desplegá modelos grandes de lenguaje localmente y on-premise. Cubre Ollama, vLLM, llama.cpp, cuantización, GPUs, servidores de API, Docker y local vs cloud."
metaDescription: "Desplegá LLMs localmente con Ollama, vLLM y llama.cpp. Incluye cuantización, requisitos de GPU, servicio de API, Docker y cuándo elegir local vs cloud."
difficulty: advanced
topics:
  - ai
  - devops
  - infrastructure
tags:
  - local-llm
  - ia
  - ollama
  - vllm
  - llama-cpp
  - cuantizacion
  - gpu
  - docker
relatedResources:
  - /guides/complete-guide-llm-cost-optimization
  - /guides/complete-guide-llm-security
  - /guides/complete-guide-llm-application-architecture
  - /recipes/python-ollama-local-llm
  - /recipes/environment-variables
  - /guides/complete-guide-llm-prompt-engineering
lastUpdated: "2026-08-19"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Desplegá LLMs localmente con Ollama, vLLM y llama.cpp. Incluye cuantización, requisitos de GPU, servicio de API, Docker y cuándo elegir local vs cloud."
  keywords:
    - despliegue local llm
    - ollama
    - vllm
    - llama.cpp
    - lm studio
    - cuantizacion de modelos
    - requisitos gpu
    - on-premise llm
---

## Introducción

Correr LLMs localmente te da privacidad, control, costos por token nulos y sin límites de
uso. Con herramientas como Ollama, vLLM y llama.cpp, desplegar modelos open source como
Llama, Mistral y Qwen es sencillo. Esta guía recorre cómo elegir una herramienta,
cuantizar modelos, dimensionar la memoria de GPU, exponer una API, contenedorizar,
medir rendimiento y decidir entre local y cloud.

## Cuándo Usar

- Necesitás mantener los datos on-premise por privacidad, HIPAA o GDPR.
- Generás un alto volumen de tokens y querés costos predecibles de hardware.
- La latencia importa y podés evitar viajes de red.
- Trabajás offline o en un entorno air-gapped.
- Querés control total sobre el modelo y su comportamiento.

## Cuándo NO Usar

- El volumen de tokens es bajo y una API cloud administrada es más barata que comprar
  GPUs.
- Necesitás los modelos de mayor calidad disponibles solo en cloud.
- No tenés el expertise o el tiempo para manejar drivers, CUDA y mantenimiento de GPU.
- Necesitás capacidades multimodales como visión o audio que tu modelo local no
  soporta.

## Comparación de Herramientas

|Herramienta|Facilidad|Rendimiento|API|GPU|Ideal para|
|-----------|---------|-----------|---|---|----------|
|Ollama|Fácil|Bueno|Integrada|Sí|Pruebas y desarrollo|
|vLLM|Media|Óptimo|OpenAI-compatible|Sí|Serving de producción|
|llama.cpp|Media|Bueno|Manual|Opcional|Flexibilidad CPU/GPU|
|LM Studio|Fácil|Bueno|Integrada|Sí|Escritorio con GUI|
|TGI|Media|Muy bueno|Integrada|Sí|Ecosistema HuggingFace|

## Ollama

### Instalación y uso básico

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Descargar y ejecutar un modelo
ollama pull llama3.1:8b
ollama run llama3.1:8b

# Ejecutar con mayor ventana de contexto
ollama run llama3.1:8b --context-window 8192
```

### Servidor de API de Ollama

```python
import requests

OLLAMA_URL = "http://localhost:11434"

response = requests.post(f"{OLLAMA_URL}/api/chat", json={
    "model": "llama3.1:8b",
    "messages": [
        {"role": "system", "content": "Sos un asistente útil."},
        {"role": "user", "content": "Explicá los decoradores de Python."}
    ],
    "stream": False
})

result = response.json()
print(result["message"]["content"])
```

### Cliente de Python

```python
from ollama import Client

client = Client(host="http://localhost:11434")

response = client.chat(
    model="llama3.1:8b",
    messages=[
        {"role": "system", "content": "Sos un experto en Python."},
        {"role": "user", "content": "Escribí un decorador que loguee llamadas."}
    ]
)
print(response["message"]["content"])
```

### Modelfile personalizado

```dockerfile
FROM llama3.1:8b

SYSTEM """
Sos un code reviewer senior. Siempre:
1. Buscá bugs.
2. Sugerí mejoras.
3. Puntualizá la calidad del código de 1 a 10.
4. Sé conciso.
"""

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
```

```bash
ollama create code-reviewer -f Modelfile
ollama run code-reviewer "Revisá: def add(a, b): return a + b"
```

## vLLM

### Instalación y serving

```bash
pip install vllm

python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --port 8000 \
    --tensor-parallel-size 1 \
    --gpu-memory-utilization 0.9 \
    --max-model-len 8192
```

### Cliente compatible con OpenAI

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="dummy"
)

response = client.chat.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct",
    messages=[
        {"role": "system", "content": "Sos un asistente útil."},
        {"role": "user", "content": "Explicá los contenedores de Docker."}
    ],
    temperature=0.7,
    max_tokens=500
)

print(response.choices[0].message.content)
```

### Ajuste de rendimiento

```bash
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --port 8000 \
    --tensor-parallel-size 2 \
    --gpu-memory-utilization 0.95 \
    --max-model-len 16384 \
    --enable-chunked-prefill \
    --enable-prefix-caching
```

Flags clave:

- `--tensor-parallel-size`: cantidad de GPUs.
- `--gpu-memory-utilization`: fracción de VRAM a usar.
- `--max-model-len`: longitud máxima de contexto.
- `--enable-chunked-prefill`: mejor throughput para prompts largos.
- `--enable-prefix-caching`: cache de prefijos comunes.

## llama.cpp

### Compilar y ejecutar

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Solo CPU
make

# Build con CUDA
make GGML_CUDA=1

# Descargar un modelo GGUF
wget https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct-GGUF/resolve/main/llama-3.1-8b-instruct-q4_k_m.gguf

# Inferencia
./llama-cli -m llama-3.1-8b-instruct-q4_k_m.gguf -p "Explicá el GIL de Python" -n 200

# Modo servidor
./llama-server -m llama-3.1-8b-instruct-q4_k_m.gguf --port 8080 --ctx-size 8192
```

### Bindings de Python

```python
from llama_cpp import Llama

llm = Llama(
    model_path="llama-3.1-8b-instruct-q4_k_m.gguf",
    n_ctx=8192,
    n_gpu_layers=35,
    n_threads=8,
    verbose=False
)

response = llm(
    "Explicá los decoradores de Python con ejemplos.",
    max_tokens=500,
    temperature=0.7,
    stop=["\n\n\n"]
)
print(response["choices"][0]["text"])
```

## Cuantización de Modelos

### Niveles de cuantización

|Formato|Bits|Tamaño (Llama 3.1 8B)|Calidad|
|-------|----|---------------------|-------|
|FP16|16|~16 GB|Original|
|Q8_0|8|~8.5 GB|Prácticamente sin pérdida|
|Q6_K|6|~6.5 GB|Casi original|
|Q5_K_M|5|~5.7 GB|Buena|
|Q4_K_M|4|~4.9 GB|Balance recomendado|
|Q3_K_M|3|~4.0 GB|Aceptable|
|Q2_K|2|~3.2 GB|Calidad más baja|

Q4_K_M es el mejor punto de equilibrio para la mayoría de los casos: reduce el tamaño
aproximadamente 4x con una pérdida de calidad del 1-2%.

### Cuantizar un modelo

```bash
# Convertir a GGUF y luego cuantizar
python convert.py meta-llama/Llama-3.1-8B-Instruct --outtype f16 --outfile base.gguf
./llama-quantize base.gguf llama-3.1-8b-q4_k_m.gguf Q4_K_M
```

```python
# AutoGPTQ para modelos de HuggingFace
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig

quantize_config = BaseQuantizeConfig(bits=4, group_size=128, desc_act=False)
model = AutoGPTQForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
model.quantize(calibration_texts, quantize_config)
model.save_quantized("./llama-3.1-8b-4bit")
```

## Requisitos de GPU

### Calculadora de VRAM

```python
def estimate_vram(params_billion: float, quantization: str = "q4") -> float:
    bytes_per_param = {
        "fp16": 2.0,
        "q8": 1.0,
        "q6": 0.75,
        "q5": 0.625,
        "q4": 0.5,
        "q3": 0.375,
        "q2": 0.25,
    }

    bpp = bytes_per_param.get(quantization, 2.0)
    weights_gb = params_billion * bpp
    kv_cache_gb = weights_gb * 0.15
    overhead_gb = 1.0
    return weights_gb + kv_cache_gb + overhead_gb

for name, params, quant in [
    ("Llama 3.1 8B", 8, "q4"),
    ("Llama 3.1 8B", 8, "fp16"),
    ("Llama 3.1 70B", 70, "q4"),
    ("Mistral 7B", 7, "q4"),
    ("Qwen 2.5 14B", 14, "q4"),
]:
    vram = estimate_vram(params, quant)
    print(f"{name} ({quant}): {vram:.1f} GB VRAM")
```

### Recomendaciones de GPU

|VRAM|Modelos soportados|
|----|------------------|
|8 GB|7B Q4, 3B FP16|
|12 GB|7B Q8, 8B Q4|
|16 GB|8B FP16, 14B Q4|
|24 GB|14B Q8, 32B Q4|
|48 GB|32B Q8, 70B Q4|
|80 GB|70B Q8, 70B FP16|

Las configuraciones multi-GPU combinan memoria con tensor o pipeline parallelism. Por
ejemplo, 4 tarjetas de 24 GB dan suficiente VRAM para correr un modelo 70B a Q4 o Q6.

## Servicio con Docker

### Dockerfile para vLLM

```dockerfile
FROM vllm/vllm-openai:latest

ENV MODEL_NAME=meta-llama/Llama-3.1-8B-Instruct
ENV PORT=8000

CMD ["--model", "meta-llama/Llama-3.1-8B-Instruct", \
     "--port", "8000", \
     "--tensor-parallel-size", "1", \
     "--gpu-memory-utilization", "0.9"]
```

### Docker Compose

```yaml
version: "3.8"

services:
  vllm:
    image: vllm/vllm-openai:latest
    ports:
      - "8000:8000"
    volumes:
      - ./models:/models
    environment:
      - HUGGING_FACE_HUB_TOKEN=${HUGGING_FACE_HUB_TOKEN}
    command:
      - --model
      - meta-llama/Llama-3.1-8B-Instruct
      - --port
      - "8000"
      - --gpu-memory-utilization
      - "0.9"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  ollama_data:
```

```bash
docker compose up -d
docker exec -it ollama ollama pull llama3.1:8b
```

## Benchmark de Rendimiento

```python
import time
import requests
from concurrent.futures import ThreadPoolExecutor

def benchmark(url: str, model: str, prompt: str, n: int = 10) -> dict:
    def request():
        start = time.perf_counter()
        response = requests.post(f"{url}/v1/chat/completions", json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        })
        latency = time.perf_counter() - start
        tokens = response.json()["usage"]["completion_tokens"]
        return latency, tokens

    with ThreadPoolExecutor(max_workers=1) as executor:
        results = list(executor.map(lambda _: request(), range(n)))

    latencies = [r[0] for r in results]
    tokens = [r[1] for r in results]
    total_time = sum(latencies)

    return {
        "tokens_per_second": sum(tokens) / total_time,
        "avg_latency_s": sum(latencies) / len(latencies),
        "p95_latency_s": sorted(latencies)[int(len(latencies) * 0.95)],
    }

print(benchmark("http://localhost:11434", "llama3.1:8b",
                "Escribí un ensayo de 200 palabras sobre IA."))
print(benchmark("http://localhost:8000", "meta-llama/Llama-3.1-8B-Instruct",
                "Escribí un ensayo de 200 palabras sobre IA."))
```

## Local vs Cloud

**Elegí local cuando:**

- La privacidad o soberanía de datos es crítica (HIPAA, GDPR).
- Servís un alto volumen de tokens y el costo por token en cloud es alto.
- La latencia importa y querés evitar viajes de red.
- Trabajás offline o en un entorno air-gapped.
- Necesitás control total sobre el modelo y su comportamiento.

**Elegí cloud cuando:**

- El volumen es bajo y una API administrada es más barata que tener GPUs.
- Necesitás la máxima calidad (GPT-4o, Claude 3.5 Sonnet).
- No tenés infraestructura ni expertise en GPUs.
- Necesitás capacidades multimodales (visión, audio).
- La carga es variable y querés escalado elástico.

Para 1M de tokens por día, un modelo 8B local en una sola A100 puede ser mucho más barato
que una API cloud una vez amortizado el costo del hardware.

## Preguntas Frecuentes

### ¿Cuál es la mejor herramienta para desplegar LLMs localmente?

Para experimentación rápida, usá Ollama. Para alto throughput de producción, usá vLLM. Para
solo CPU o CPU/GPU mixto, usá llama.cpp. Para una GUI de escritorio, usá LM Studio. vLLM
suele tener el mayor throughput gracias a PagedAttention y continuous batching.

### ¿Cuánta VRAM necesito?

Un modelo 7-8B en Q4 necesita 6-8 GB. Uno de 14B necesita 10-12 GB. Uno de 32B necesita
20-24 GB. Uno de 70B necesita 40-48 GB. Agregá 15-20% para KV cache y overhead.

### ¿Puedo correr LLMs solo con CPU?

Sí. llama.cpp soporta inferencia solo en CPU, pero es mucho más lento. Esperá 5-20 tokens/s
para un modelo 7B Q4 en una CPU moderna, contra 50-100+ tokens/s en GPU. La CPU sirve para
pruebas o uso de bajo volumen.

### ¿Qué es la cuantización y cuándo usarla?

La cuantización reduce la precisión numérica para achicar el modelo y acelerar la
inferencia. Usá Q4_K_M para la mayoría de los casos; reduce el tamaño unas 4x con una
pérdida de calidad del 1-2%. Usá Q5_K_M o Q6_K si necesitás más calidad. Evitá Q2_K a menos
que la VRAM sea muy limitada.

### ¿Cómo expongo un LLM local como API?

Ollama, vLLM y llama.cpp tienen modos servidor. vLLM y llama.cpp exponen una API
compatible con OpenAI; Ollama usa su propio formato. Poné un reverse proxy como nginx
adelante para TLS y balanceo de carga en producción.
