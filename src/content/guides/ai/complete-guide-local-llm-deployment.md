---
contentType: guides
slug: complete-guide-local-llm-deployment
title: "Local LLM Deployment: Ollama, vLLM & llama.cpp"
description: "Deploy large language models locally and on-premise. Covers Ollama, vLLM, llama.cpp, quantization, GPU sizing, API serving, Docker, and local vs cloud."
metaDescription: "Deploy LLMs locally with Ollama, vLLM, and llama.cpp. Covers quantization, GPU requirements, API serving, Docker, and when to choose local vs cloud."
difficulty: advanced
topics:
  - ai
  - devops
  - infrastructure
tags:
  - local-llm
  - ai
  - ollama
  - vllm
  - llama-cpp
  - quantization
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
  metaDescription: "Deploy LLMs locally with Ollama, vLLM, and llama.cpp. Covers quantization, GPU requirements, API serving, Docker, and when to choose local vs cloud."
  keywords:
    - local llm deployment
    - ollama
    - vllm
    - llama.cpp
    - lm studio
    - model quantization
    - gpu requirements
    - on-premise llm
---

## Introduction

Running LLMs locally gives you privacy, control, no per-token bills, and no rate limits.
With tools like Ollama, vLLM, and llama.cpp, deploying open-source models such as Llama,
Mistral, and Qwen is straightforward. This guide walks through choosing a tool, picking a
quantization, sizing GPU memory, serving with an API, running in Docker, benchmarking,
and deciding between local and cloud.

## When to Use

- You need to keep data on-premise for privacy, HIPAA, or GDPR reasons.
- You generate a high token volume and want predictable hardware costs.
- Latency matters and you can avoid network round trips.
- You work offline or in an air-gapped environment.
- You want full control over the model and its behavior.

## When NOT to Use

- Token volume is low and a managed cloud API is cheaper than buying GPUs.
- You need the highest quality models only available from cloud providers.
- You lack the expertise or time to manage drivers, CUDA, and GPU drivers.
- You need multimodal capabilities like vision or audio that your local model doesn't
  support.

## Tool Comparison

|Tool|Ease|Performance|API|GPU|Best for|
|----|----|-----------|---|---|--------|
|Ollama|Easy|Good|Built-in|Yes|Quick start, dev|
|vLLM|Medium|Best|OpenAI-compatible|Yes|Production serving|
|llama.cpp|Medium|Good|Manual|Optional|CPU/GPU flexibility|
|LM Studio|Easy|Good|Built-in|Yes|Desktop GUI|
|TGI|Medium|Very good|Built-in|Yes|HuggingFace ecosystem|

## Ollama

### Installation and basic usage

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Pull and run a model
ollama pull llama3.1:8b
ollama run llama3.1:8b

# Run with a larger context window
ollama run llama3.1:8b --context-window 8192
```

### Ollama API server

```python
import requests

OLLAMA_URL = "http://localhost:11434"

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
```

### Python client

```python
from ollama import Client

client = Client(host="http://localhost:11434")

response = client.chat(
    model="llama3.1:8b",
    messages=[
        {"role": "system", "content": "You are a Python expert."},
        {"role": "user", "content": "Write a decorator that logs calls."}
    ]
)
print(response["message"]["content"])
```

### Custom Modelfile

```dockerfile
FROM llama3.1:8b

SYSTEM """
You are a senior code reviewer. Always:
1. Check for bugs.
2. Suggest improvements.
3. Rate code quality 1-10.
4. Be concise.
"""

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
```

```bash
ollama create code-reviewer -f Modelfile
ollama run code-reviewer "Review: def add(a, b): return a + b"
```

## vLLM

### Installation and serving

```bash
pip install vllm

python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --port 8000 \
    --tensor-parallel-size 1 \
    --gpu-memory-utilization 0.9 \
    --max-model-len 8192
```

### OpenAI-compatible client

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="dummy"
)

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
```

### Performance tuning

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

Key flags:

- `--tensor-parallel-size`: number of GPUs.
- `--gpu-memory-utilization`: fraction of VRAM to use.
- `--max-model-len`: maximum context length.
- `--enable-chunked-prefill`: better throughput for long prompts.
- `--enable-prefix-caching`: cache common prompt prefixes.

## llama.cpp

### Build and run

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# CPU only
make

# CUDA build
make GGML_CUDA=1

# Download a GGUF model
wget https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct-GGUF/resolve/main/llama-3.1-8b-instruct-q4_k_m.gguf

# Run inference
./llama-cli -m llama-3.1-8b-instruct-q4_k_m.gguf -p "Explain Python GIL" -n 200

# Run as server
./llama-server -m llama-3.1-8b-instruct-q4_k_m.gguf --port 8080 --ctx-size 8192
```

### Python bindings

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
    "Explain Python decorators with examples.",
    max_tokens=500,
    temperature=0.7,
    stop=["\n\n\n"]
)
print(response["choices"][0]["text"])
```

## Model Quantization

### Quantization levels

|Format|Bits|Size (Llama 3.1 8B)|Quality|
|------|----|-------------------|-------|
|FP16|16|~16 GB|Original|
|Q8_0|8|~8.5 GB|Virtually lossless|
|Q6_K|6|~6.5 GB|Near original|
|Q5_K_M|5|~5.7 GB|Good|
|Q4_K_M|4|~4.9 GB|Recommended balance|
|Q3_K_M|3|~4.0 GB|Acceptable|
|Q2_K|2|~3.2 GB|Lowest quality|

Q4_K_M is the best trade-off for most use cases: roughly 4x smaller than FP16 with
about 1-2% quality loss.

### Quantize a model

```bash
# Convert to GGUF then quantize
python convert.py meta-llama/Llama-3.1-8B-Instruct --outtype f16 --outfile base.gguf
./llama-quantize base.gguf llama-3.1-8b-q4_k_m.gguf Q4_K_M
```

```python
# AutoGPTQ for HuggingFace models
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig

quantize_config = BaseQuantizeConfig(bits=4, group_size=128, desc_act=False)
model = AutoGPTQForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
model.quantize(calibration_texts, quantize_config)
model.save_quantized("./llama-3.1-8b-4bit")
```

## GPU Requirements

### VRAM calculator

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

### GPU recommendations

|VRAM|Models supported|
|----|----------------|
|8 GB|7B Q4, 3B FP16|
|12 GB|7B Q8, 8B Q4|
|16 GB|8B FP16, 14B Q4|
|24 GB|14B Q8, 32B Q4|
|48 GB|32B Q8, 70B Q4|
|80 GB|70B Q8, 70B FP16|

Multi-GPU setups can combine memory with tensor or pipeline parallelism. For example,
4x 24 GB cards give you enough VRAM to run a 70B model at Q4 or Q6.

## Serving with Docker

### Dockerfile for vLLM

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

## Performance Benchmarking

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
                "Write a 200-word essay about AI."))
print(benchmark("http://localhost:8000", "meta-llama/Llama-3.1-8B-Instruct",
                "Write a 200-word essay about AI."))
```

## Local vs Cloud

**Choose local when:**

- Privacy or data sovereignty is required (HIPAA, GDPR).
- You serve a high token volume, making per-token bills expensive.
- Latency matters and you can avoid network round trips.
- You work offline or in an air-gapped environment.
- You need full control over the model and its behavior.

**Choose cloud when:**

- Volume is low and a managed API is cheaper than owning GPUs.
- You need the highest quality (GPT-4o, Claude 3.5 Sonnet).
- You lack GPU infrastructure or expertise.
- You need multimodal support (vision, audio).
- Load is variable and you want elastic scaling.

For 1M tokens per day, a local 8B model on a single A100 can be far cheaper than a
calls-per-token cloud API once you amortize the hardware cost.

## FAQ

### What is the best tool for local LLM deployment?

For quick local experimentation, use Ollama. For production throughput, use vLLM. For
CPU-only or mixed CPU/GPU setups, use llama.cpp. For a desktop GUI, use LM Studio. vLLM
generally has the highest throughput thanks to PagedAttention and continuous batching.

### How much VRAM do I need?

A 7-8B Q4 model needs 6-8 GB. A 14B model needs 10-12 GB. A 32B model needs 20-24 GB.
A 70B model needs 40-48 GB. Add 15-20% for KV cache and runtime overhead.

### Can I run LLMs on CPU only?

Yes. llama.cpp supports CPU-only inference, but it's much slower. Expect 5-20 tokens/s
for a 7B Q4 model on a modern CPU versus 50-100+ tokens/s on a GPU. CPU is fine for
testing or low-volume use.

### What is quantization and should I use it?

Quantization lowers numerical precision to shrink the model and speed up inference. Use
Q4_K_M for most cases; it cuts size by about 4x with 1-2% quality loss. Use Q5_K_M or
Q6_K if you need higher quality. Avoid Q2_K unless VRAM is extremely tight.

### How do I expose a local LLM as an API?

Ollama, vLLM, and llama.cpp all have server modes. vLLM and llama.cpp expose an
OpenAI-compatible API; Ollama uses its own format. Put a reverse proxy such as nginx in
front for TLS and load balancing in production.
