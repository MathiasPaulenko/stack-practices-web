---
contentType: guides
slug: complete-guide-local-llm-deployment
title: "Referencia Detallada de Despliegue Local de LLM"
description: "Desplegar LLMs localmente y on-premise. Cubre Ollama, vLLM, llama.cpp, LM Studio, quantization de modelos, GPU requirements, serving con API servers, performance tuning y elegir entre local y cloud."
metaDescription: "Desplegar LLMs localmente. Cubre Ollama, vLLM, llama.cpp, LM Studio, quantization, GPU, API servers, performance tuning."
difficulty: advanced
topics:
  - ai
  - devops
  - infrastructure
tags:
  - local-llm
  - ai
  - guia
  - ollama
  - vllm
  - llama-cpp
  - quantization
  - gpu
relatedResources:
  - /guides/ai/complete-guide-llm-cost-optimization
  - /guides/ai/complete-guide-llm-security
  - /guides/ai/complete-guide-llm-application-architecture
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Desplegar LLMs localmente. Cubre Ollama, vLLM, llama.cpp, LM Studio, quantization, GPU, API servers, performance tuning."
  keywords:
    - despliegue local llm
    - ollama
    - vllm
    - llama.cpp
    - lm studio
    - model quantization
    - gpu requirements
    - on-premise llm
---

## Introducción

Correr LLMs localmente te da privacy, control, zero per-token costs, y no rate limits. Con tools como Ollama, vLLM, y llama.cpp, desplegar open-source models (Llama, Mistral, Qwen) es straightforward. Lo siguiente es una guia practica para el espectro completo de despliegue local de LLM: elegir tools, model quantization, GPU requirements, API servers, performance tuning, y decidir cuando ir local vs cloud.

## Comparacion de Tools

```text
Tool         | Ease | Performance | API Server | GPU | Best For
-------------|------|-------------|------------|-----|----------
Ollama       | Easy | Good        | Built-in   | Yes | Quick start, dev
vLLM         | Med  | Best        | Built-in   | Yes | Production serving
llama.cpp    | Med  | Good        | Manual     | Opt | CPU/GPU flexibility
LM Studio    | Easy | Good        | Built-in   | Yes | Desktop GUI
TGI          | Med  | Very Good   | Built-in   | Yes | HuggingFace ecosystem
```

## Ollama

### Instalacion y Uso Basico

```bash
# Instalar Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Instalar Ollama (macOS)
brew install ollama

# Pull y run un model
ollama pull llama3.1:8b
ollama run llama3.1:8b

# Listar models
ollama list

# Run con specific context window
ollama run llama3.1:8b --context-window 8192
```

### Ollama API Server

```python
import requests

# Ollama corre un API server en localhost:11434
OLLAMA_URL = "http://localhost:11434"

# Chat completion
response = requests.post(f"{OLLAMA_URL}/api/chat", json={
    "model": "llama3.1:8b",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain Python decorators."}
    ],
    "stream": False
})

result = response.json()
print(result["message"]["content"])

# Streaming
response = requests.post(f"{OLLAMA_URL}/api/chat", json={
    "model": "llama3.1:8b",
    "messages": [{"role": "user", "content": "Write a haiku about coding."}],
    "stream": True
}, stream=True)

for line in response.iter_lines():
    if line:
        import json
        chunk = json.loads(line)
        if "message" in chunk:
            print(chunk["message"]["content"], end="", flush=True)
```

### Ollama con Python Client

```python
from ollama import Client

client = Client(host="http://localhost:11434")

# Chat
response = client.chat(
    model="llama3.1:8b",
    messages=[
        {"role": "system", "content": "You are a Python expert."},
        {"role": "user", "content": "Write a decorator that logs function calls."}
    ]
)
print(response["message"]["content"])

# Generate (single prompt)
response = client.generate(
    model="llama3.1:8b",
    prompt="Explain async/await in Python."
)
print(response["response"])

# Embeddings
response = client.embeddings(
    model="nomic-embed-text",
    prompt="Python is a programming language."
)
print(f"Embedding dimensions: {len(response['embedding'])}")
```

### Modelfile Custom

```dockerfile
# Crear un custom model con specific system prompt
FROM llama3.1:8b

SYSTEM """
You are a senior code reviewer. Always:
1. Check for bugs
2. Suggest improvements
3. Rate code quality 1-10
4. Be concise
"""

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
```

```bash
# Build custom model
ollama create code-reviewer -f Modelfile

# Run
ollama run code-reviewer "Review: def add(a, b): return a + b"
```

## vLLM

### Instalacion y Serving

```bash
# Instalar vLLM
pip install vllm

# Servir un model con OpenAI-compatible API
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --port 8000 \
    --tensor-parallel-size 1 \
    --gpu-memory-utilization 0.9 \
    --max-model-len 8192
```

### Usar vLLM con OpenAI Client

```python
from openai import OpenAI

# vLLM provee un OpenAI-compatible API
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="dummy"  # vLLM no requiere real key
)

# Chat completion (same que OpenAI API)
response = client.chat.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain Docker containers."}
    ],
    temperature=0.7,
    max_tokens=500
)

print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="meta-llama/Llama-3.1-8B-Instruct",
    messages=[{"role": "user", "content": "Write a Python web scraper."}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### vLLM Performance Tuning

```bash
# High-throughput configuration
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --port 8000 \
    --tensor-parallel-size 2 \
    --gpu-memory-utilization 0.95 \
    --max-model-len 16384 \
    --batch-size 256 \
    --enable-chunked-prefill \
    --enable-prefix-caching

# Key parameters:
# --tensor-parallel-size: Numero de GPUs a usar
# --gpu-memory-utilization: Fraction de GPU memory a usar (0.0-1.0)
# --max-model-len: Maximum context length
# --batch-size: Maximum batch size para inference
# --enable-chunked-prefill: Better throughput para long prompts
# --enable-prefix-caching: Cachear common prompt prefixes
```

## llama.cpp

### Build y Run

```bash
# Clone y build
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# CPU-only build
make

# CUDA build (NVIDIA GPU)
make GGML_CUDA=1

# Descargar un model (GGUF format)
wget https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct-GGUF/resolve/main/llama-3.1-8b-instruct-q4_k_m.gguf

# Run inference
./llama-cli -m llama-3.1-8b-instruct-q4_k_m.gguf -p "Explain Python GIL" -n 200

# Run como server (OpenAI-compatible API)
./llama-server -m llama-3.1-8b-instruct-q4_k_m.gguf --port 8080 --ctx-size 8192
```

### llama.cpp Python Bindings

```python
from llama_cpp import Llama

# Load model
llm = Llama(
    model_path="llama-3.1-8b-instruct-q4_k_m.gguf",
    n_ctx=8192,
    n_gpu_layers=35,  # Numero de layers a offload a GPU
    n_threads=8,      # CPU threads
    verbose=False
)

# Generate
response = llm(
    "Explain Python decorators with examples.",
    max_tokens=500,
    temperature=0.7,
    stop=["\n\n\n"]
)

print(response["choices"][0]["text"])

# Chat format
response = llm.create_chat_completion(
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": "Write a Python decorator for caching."}
    ],
    max_tokens=500
)

print(response["choices"][0]["message"]["content"])
```

## Model Quantization

### Formatos de Quantization

```text
Formatos de Quantization (GGUF):
  Q2_K: 2-bit quantization — smallest, lowest quality
  Q3_K_M: 3-bit — small, acceptable quality
  Q4_K_M: 4-bit — recommended balance (best para most use cases)
  Q5_K_M: 5-bit — good quality, moderate size
  Q6_K: 6-bit — near-original quality
  Q8_0: 8-bit — virtually lossless, largest

Model sizes (Llama-3.1-8B):
  FP16 (original): ~16 GB
  Q8_0: ~8.5 GB
  Q6_K: ~6.5 GB
  Q5_K_M: ~5.7 GB
  Q4_K_M: ~4.9 GB  ← recommended
  Q3_K_M: ~4.0 GB
  Q2_K: ~3.2 GB

Quality impact:
  Q4_K_M vs FP16: ~1-2% quality degradation
  Q5_K_M vs FP16: ~0.5% quality degradation
  Q2_K vs FP16: ~5-10% quality degradation
```

### Quantizar un Model

```python
# Usar llama.cpp para quantizar un model
# Primero, convertir a GGUF format
python convert.py meta-llama/Llama-3.1-8B-Instruct --outtype f16 --outfile llama-3.1-8b-f16.gguf

# Luego quantizar
./llama-quantize llama-3.1-8b-f16.gguf llama-3.1-8b-q4_k_m.gguf Q4_K_M

# Usar AutoGPTQ para HuggingFace models
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig
from transformers import AutoTokenizer

quantize_config = BaseQuantizeConfig(
    bits=4,
    group_size=128,
    desc_act=False
)

model = AutoGPTQForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")

# Quantizar con calibration data
calibration_texts = ["sample text 1", "sample text 2", ...]
model.quantize(calibration_texts, quantize_config)
model.save_quantized("./llama-3.1-8b-4bit")
```

## GPU Requirements

### VRAM Calculator

```python
def estimate_vram(model_params_billion: float, quantization: str = "q4") -> float:
    """Estimar VRAM needed para un model."""
    # Bytes per parameter por quantization
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
    
    # Model weights
    weights_gb = model_params_billion * bpp
    
    # KV cache (depende de context length, roughly 10-20% of weights)
    kv_cache_gb = weights_gb * 0.15
    
    # Overhead (CUDA context, etc.)
    overhead_gb = 1.0
    
    total = weights_gb + kv_cache_gb + overhead_gb
    return total

# Ejemplos
models = [
    ("Llama 3.1 8B", 8, "q4"),
    ("Llama 3.1 8B", 8, "fp16"),
    ("Llama 3.1 70B", 70, "q4"),
    ("Mistral 7B", 7, "q4"),
    ("Qwen 2.5 14B", 14, "q4"),
]

for name, params, quant in models:
    vram = estimate_vram(params, quant)
    print(f"{name} ({quant}): {vram:.1f} GB VRAM")

# Output:
# Llama 3.1 8B (q4): 5.6 GB
# Llama 3.1 8B (fp16): 18.4 GB
# Llama 3.1 70B (q4): 41.5 GB
# Mistral 7B (q4): 5.0 GB
# Qwen 2.5 14B (q4): 9.1 GB
```

### Recomendaciones de GPU

```text
GPU VRAM | Models Soportados
---------|------------------
8 GB     | 7B models (Q4), 3B models (FP16)
12 GB    | 7B models (Q8), 8B models (Q4)
16 GB    | 8B models (FP16), 14B models (Q4)
24 GB    | 14B models (Q8), 32B models (Q4)
48 GB    | 32B models (Q8), 70B models (Q4)
80 GB    | 70B models (Q8), 70B models (FP16)

Multi-GPU:
  2x 24GB = 48GB total → 32B models (Q8), 70B models (Q4)
  4x 24GB = 96GB total → 70B models (Q6), 70B models (FP16)
```

## Serving con Docker

```dockerfile
# Dockerfile para vLLM server
FROM vllm/vllm-openai:latest

ENV MODEL_NAME=meta-llama/Llama-3.1-8B-Instruct
ENV PORT=8000

CMD ["--model", "meta-llama/Llama-3.1-8B-Instruct", \
     "--port", "8000", \
     "--tensor-parallel-size", "1", \
     "--gpu-memory-utilization", "0.9"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  vllm:
    image: vllm/vllm-openai:latest
    ports:
      - "8000:8000"
    volumes:
      - ./models:/models
    environment:
      - HUGGING_FACE_HUB_TOKEN=hf_your_token
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
# Start services
docker-compose up -d

# Pull model en Ollama
docker exec -it ollama ollama pull llama3.1:8b
```

## Performance Benchmarking

```python
import time
import requests
import json
from concurrent.futures import ThreadPoolExecutor

def benchmark_llm(url: str, model: str, prompt: str, n_requests: int = 10) -> dict:
    latencies = []
    tokens_generated = []
    
    def make_request():
        start = time.perf_counter()
        response = requests.post(f"{url}/v1/chat/completions", json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        })
        latency = time.perf_counter() - start
        
        result = response.json()
        tokens = result["usage"]["completion_tokens"]
        
        return latency, tokens
    
    with ThreadPoolExecutor(max_workers=1) as executor:
        results = list(executor.map(lambda _: make_request(), range(n_requests)))
    
    latencies = [r[0] for r in results]
    tokens_generated = [r[1] for r in results]
    
    return {
        "avg_latency_s": sum(latencies) / len(latencies),
        "avg_tokens": sum(tokens_generated) / len(tokens_generated),
        "tokens_per_second": sum(tokens_generated) / sum(latencies),
        "p50_latency_s": sorted(latencies)[len(latencies) // 2],
        "p95_latency_s": sorted(latencies)[int(len(latencies) * 0.95)],
    }

# Benchmark Ollama
ollama_stats = benchmark_llm("http://localhost:11434", "llama3.1:8b", "Write a 200-word essay about AI.")
print(f"Ollama: {ollama_stats['tokens_per_second']:.1f} tokens/s")

# Benchmark vLLM
vllm_stats = benchmark_llm("http://localhost:8000", "meta-llama/Llama-3.1-8B-Instruct", "Write a 200-word essay about AI.")
print(f"vLLM: {vllm_stats['tokens_per_second']:.1f} tokens/s")
```

## Decision: Local vs Cloud

```text
Cuando elegir LOCAL:
  - Privacy/data sovereignty requirements (HIPAA, GDPR)
  - High volume (>1M tokens/day) — local es mas barato
  - Latency-sensitive applications (local = no network)
  - Offline o air-gapped environments
  - Custom fine-tuned models
  - Full control sobre model behavior

Cuando elegir CLOUD:
  - Low volume (<100K tokens/day) — cloud es mas barato
  - Need best quality (GPT-4o, Claude 3.5 Sonnet)
  - No GPU infrastructure o expertise
  - Need multimodal (vision, audio)
  - Variable load (cloud escala automaticamente)
  - Quick prototyping y experimentation

Cost comparison (1M tokens/day):
  Cloud (gpt-4o): ~$25/day input, ~$100/day output = ~$125/day
  Local (8B model, 1x A100): ~$2/day electricity = ~$60/month
  Break-even: ~$3,000 GPU card se paga solo en ~24 days
```

## Preguntas Frecuentes

### ¿Cuál es la mejor tool para despliegue local de LLM?

Para desarrollo y quick starts: Ollama. Para production serving con high throughput: vLLM. Para CPU-only o mixed CPU/GPU: llama.cpp. Para desktop use con GUI: LM Studio. vLLM provee el highest throughput gracias a PagedAttention y continuous batching.

### ¿Cuánta VRAM necesito?

Para un 7-8B model con Q4 quantization: 6-8 GB VRAM. Para un 14B model: 10-12 GB. Para un 32B model: 20-24 GB. Para un 70B model: 40-48 GB. Agrega 15-20% para KV cache dependiendo de context length. Usa el VRAM calculator de esta guia para estimates precisos.

### ¿Puedo correr LLMs en CPU only?

Si. llama.cpp soporta CPU-only inference. Expecta 5-20 tokens/s para 7B Q4 models en un CPU moderno (vs 50-100+ tokens/s en GPU). Para produccion, GPU es strongly recommended. CPU es fine para desarrollo, testing, y low-volume use.

### ¿Qué es quantization y debería usarla?

Quantization reduce model precision (16-bit → 4-bit) para decrecer memory usage y aumentar inference speed. Q4_K_M es el quantization recommended para la mayoria de use cases — reduce model size en 4x con solo 1-2% quality loss. Usa Q5_K_M o Q6_K si necesitas higher quality. Usa Q2_K o Q3_K solo si VRAM es extremely limited.

### ¿Cómo expongo un local LLM como API?

Tanto Ollama como vLLM proveen built-in API servers. Ollama corre en port 11434 con su propio API format. vLLM corre en port 8000 con un OpenAI-compatible API. llama.cpp tiene un server mode (`llama-server`). Todos pueden ser fronted con nginx o un reverse proxy para produccion. Usa Docker para containerized deployment.

### ¿Puedo fine-tunear models localmente?

Si. Usa tools como Unsloth, Axolotl, o HuggingFace TRL para fine-tuning. Fine-tuning un 7B model requiere ~16 GB VRAM con QLoRA (4-bit quantization + LoRA). Full fine-tuning de un 7B model requiere ~60 GB VRAM. Fine-tuning es mas lento que inference — espera horas a dias dependiendo de dataset size y hardware.
