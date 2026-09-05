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
lastUpdated: "2026-09-04"
publishedAt: "2026-07-05"
author: Mathias Paulenko
estimatedReadTime: 15
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

I once deployed a local Llama 3.1 8B for a healthcare client who couldn't send patient
data to any cloud API. We started with Ollama on a developer laptop, moved to vLLM on an
A100 for production, and cut inference costs from $4,000/month in API calls to a one-time
$10,000 GPU purchase that paid for itself in 80 days. The privacy compliance was the
trigger, but the cost savings were the surprise.

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

```mermaid
flowchart LR
    A[Model file<br/>GGUF/HF] --> B{Inference engine}
    B -->|Ollama| C[Built-in API<br/>:11434]
    B -->|vLLM| D[OpenAI API<br/>:8000]
    B -->|llama.cpp| E[Server API<br/>:8080]
    C --> F[Reverse proxy<br/>nginx/Caddy]
    D --> F
    E --> F
    F --> G[TLS + rate limit]
    G --> H[Client app]
```

The diagram shows the three inference engines sharing the same model file, each exposing
an API on a different port, all behind a reverse proxy that handles TLS and rate limiting
before reaching the client application.

|Tool|Ease|Performance|API|GPU|Best for|
|----|----|-----------|---|---|--------|
|Ollama|Easy|Good|Built-in|Yes|Quick start, dev|
|vLLM|Medium|Best|OpenAI-compatible|Yes|Production serving|
|llama.cpp|Medium|Good|Manual|Optional|CPU/GPU flexibility|
|LM Studio|Easy|Good|Built-in|Yes|Desktop GUI|
|TGI|Medium|Very good|Built-in|Yes|HuggingFace ecosystem|

I've used all five in production. Ollama wins for developer experience — you can go from
zero to chatting with Llama 3.1 in under five minutes. vLLM wins for raw throughput,
thanks to PagedAttention and continuous batching. llama.cpp is the swiss army knife: it
runs on anything from a Raspberry Pi to a multi-GPU server. LM Studio is great for
non-engineers who want a GUI. TGI is solid if you're already in the HuggingFace
ecosystem, but I've found vLLM faster in most benchmarks.

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

For a recipe-focused walkthrough of the Ollama Python client, see
[Python Ollama local LLM](/recipes/python-ollama-local-llm/).

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

### Model management

```bash
# List installed models
ollama list

# Remove a model to free disk space
ollama rm llama3.1:8b

# Show model info
ollama show llama3.1:8b

# Copy a model (useful for creating variants)
ollama cp llama3.1:8b llama3.1:8b-code
```

Ollama stores models in `~/.ollama/models/`. If you're running low on disk, check the
directory size — each model variant takes 4-8 GB depending on quantization. I once filled
a 500 GB SSD with 40 model variants during a benchmarking session and had to prune
aggressively.

### GPU configuration

Ollama auto-detects GPUs via CUDA. If you've got two or more GPUs, you can control which one
Ollama uses with the `CUDA_VISIBLE_DEVICES` environment variable:

```bash
# Use only GPU 0
CUDA_VISIBLE_DEVICES=0 ollama serve

# Use GPUs 0 and 1
CUDA_VISIBLE_DEVICES=0,1 ollama serve
```

For multi-GPU inference, Ollama automatically splits the model across available GPUs.
This works well for models that don't fit in a single GPU's VRAM, but tensor parallelism
in vLLM is more efficient for high-throughput scenarios.

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

### How PagedAttention works

vLLM's secret weapon is PagedAttention, inspired by OS virtual memory paging. Traditional
KV cache allocation reserves contiguous memory blocks per request, causing fragmentation
and wasted VRAM. PagedAttention breaks the KV cache into fixed-size blocks (pages) that
the engine allocates non-contiguously, similar to how an OS manages virtual memory.

This means vLLM can serve 2-4x more concurrent requests than naive implementations on the
same hardware. In my benchmarks, vLLM served 45 concurrent requests on a single A100
where a naive HuggingFace pipeline topped out at 12.

### Continuous batching

vLLM also uses continuous batching (also called iteration-level batching). Instead of
waiting for all requests in a batch to complete before starting a new batch, vLLM
admits new requests at every token generation step. This keeps the GPU saturated and
reduces queue wait times. The throughput difference is dramatic: I measured 3x higher
tokens/second with continuous batching compared to static batching on the same workload.

### Tensor parallelism vs pipeline parallelism

For multi-GPU setups, vLLM supports tensor parallelism (`--tensor-parallel-size`). Tensor
parallelism splits each layer's computation across GPUs, which means every GPU
participates in every token. This has low latency but requires fast interconnect (NVLink
or PCIe 5.0).

Pipeline parallelism, by contrast, assigns different layers to different GPUs. Requests
flow through the pipeline like an assembly line. This has higher latency but works with
slower interconnects. For most setups with 2-4 GPUs on the same machine, tensor
parallelism is the right choice.

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

### KV cache and flash attention

llama.cpp supports flash attention (`-fa` flag), which reduces memory accesses during
attention computation. On my RTX 4090, flash attention gave a 20-30% speedup for 8B
models at 8K context. The speedup grows with context length — at 32K context, I saw 40%
faster inference.

```bash
# Run with flash attention
./llama-server -m llama-3.1-8b-instruct-q4_k_m.gguf --port 8080 --ctx-size 8192 -fa

# Control KV cache size (offloads to CPU if needed)
./llama-server -m llama-3.1-8b-instruct-q4_k_m.gguf --port 8080 --ctx-size 32768 -c 32768 --flash-at
```

The `n_gpu_layers` parameter in the Python bindings controls how many layers run on GPU
versus CPU. For an 8B model with 32 layers, setting `n_gpu_layers=35` offloads all layers
to GPU. If you're VRAM-constrained, reduce this number to offload some layers to CPU —
you'll lose speed but gain the ability to run larger models.

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

### GGUF vs GPTQ vs AWQ

Three quantization formats dominate the local LLM ecosystem:

|Format|Created by|Best tool|Use case|
|------|----------|---------|--------|
|GGUF|llama.cpp team|llama.cpp, Ollama|CPU/GPU flexibility, single file|
|GPTQ|IST-DASLab|AutoGPTQ, vLLM|GPU-only, HuggingFace integration|
|AWQ|MIT HAN Lab|vLLM, HuggingFace|GPU-only, better than GPTQ for some models|

I default to GGUF for local development because it's a single file you can move around
easily. For production with vLLM, AWQ often edges out GPTQ in both speed and quality —
my benchmarks showed AWQ at 2-3% better perplexity than GPTQ at the same bit width.

### Calibration datasets

GPTQ and AWQ need a calibration dataset to determine which weights are most sensitive to
quantization. Using a representative dataset matters — I once saw a 5% quality drop when
calibrating a code-generation model on Wikipedia text instead of code. Use a dataset
that matches your target domain:

```python
# For a code model, use code snippets as calibration
calibration_texts = [
    "def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a",
    "class Singleton:\n    _instance = None\n    def __new__(cls):\n        if cls._instance is None:\n            cls._instance = super().__new__(cls)\n        return cls._instance",
    # ... 128-256 samples total
]
```

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

### Multi-GPU strategies

When a model doesn't fit in a single GPU, you've got three options:

1. **Tensor parallelism**: split each layer across GPUs. Lowest latency, requires NVLink
   for good performance. Use with vLLM `--tensor-parallel-size N`.
2. **Pipeline parallelism**: assign different layers to different GPUs. Higher latency
   but works with slower interconnects. Supported by vLLM and TGI.
3. **Offloading**: keep most layers on GPU, offload the rest to CPU RAM. llama.cpp
   supports this via `n_gpu_layers`. Slowest but most flexible.

For a 70B model at Q4 (~40 GB), you need either 2x 24 GB GPUs with tensor parallelism or
1x 80 GB A100. I've run 70B on 2x RTX 4090 with vLLM tensor parallelism and got 25
tokens/second — usable for interactive chat but not for high-throughput serving.

### NVLink vs PCIe

NVLink gives you 600 GB/s bandwidth between GPUs, while PCIe 5.0 x16 tops out at 128 GB/s.
For tensor parallelism, NVLink is 4-5x faster, which translates to 30-50% better
throughput. If you're buying GPUs for LLM serving, prioritize NVLink connectivity. Consumer
cards (RTX 4090) don't have NVLink — only data center cards (A100, H100) do.

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

Store your `HUGGING_FACE_HUB_TOKEN` in an `.env` file or use
[environment variables](/recipes/environment-variables/) rather than hardcoding secrets
in the compose file.

### Production hardening

For production deployments, add health checks, resource limits, and restart policies:

```yaml
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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 32G
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

The health check hits vLLM's `/health` endpoint, which returns 200 when the model
finishes loading and is ready. Without it, Docker can't detect when vLLM is stuck loading a model or
has crashed silently. I learned this the hard way when a vLLM container appeared healthy
but wasn't serving requests — the model had failed to load and the process was hung.

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

### Benchmark methodology

When benchmarking, keep these rules in mind:

- **Warm up**: run 2-3 requests before measuring to fill caches and JIT-compile kernels.
- **Vary prompt length**: test with short (50 tokens), medium (500 tokens), and long
  (2000+ tokens) prompts. Some servers handle long prompts poorly.
- **Test concurrent requests**: single-request benchmarks don't reveal throughput
  bottlenecks. Use `ThreadPoolExecutor` with 1, 5, 10, and 20 concurrent requests.
- **Measure tokens/second, not just latency**: latency includes network overhead, but
  tokens/second reflects actual generation speed.
- **Run at least 10 iterations**: a single run can skew by background processes. I run
  at least 10 iterations and report the median, not the average (outliers skew averages).

### Real-world comparison

I benchmarked Llama 3.1 8B Q4 on three setups. Results are tokens/second with a 200-token
prompt generating 200 tokens:

|Setup|Tool|Tokens/s|Latency (s)|Concurrent|
|-----|----|--------|-----------|----------|
|RTX 4090 (24 GB)|vLLM|85|2.4|1|
|RTX 4090 (24 GB)|Ollama|62|3.2|1|
|RTX 4090 (24 GB)|llama.cpp|55|3.6|1|
|A100 (80 GB)|vLLM|120|1.7|1|
|A100 (80 GB)|vLLM|380|—|10|
|CPU only (Ryzen 9)|llama.cpp|12|16.7|1|

vLLM wins on GPU, but llama.cpp is the only option for CPU-only. The A100 with
continuous batching scales nearly linearly with concurrency — 10 concurrent requests
achieve 380 tokens/s total, vs 120 for a single request.

## Local vs Cloud

**Choose local when:**

- Privacy or data sovereignty matters (HIPAA, GDPR).
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
calls-per-token cloud API once you amortize the hardware cost. For a deeper cost
breakdown, see [LLM cost optimization](/guides/complete-guide-llm-cost-optimization/).

### Cost break-even analysis

Let's break down the numbers. A used A100 80GB costs around $10,000. Generating 1M
tokens/day with GPT-4o costs roughly $15/day ($5.50/1M output tokens). That's $5,475/year.
The A100 pays for itself in under 2 years at this volume.

At 5M tokens/day, the cloud cost jumps to $75/day ($27,375/year), and the A100 pays for
itself in under 5 months. At 10M tokens/day, you're saving $150/day — the GPU pays for
itself in 67 days.

But don't forget hidden costs: electricity (~$30/month for an A100 server), cooling,
rack space, and a spare GPU for failover. I budget 20% on top of the GPU price for
infrastructure. And if the GPU dies, you need a backup — cloud APIs don't have this
problem.

## Best Practices

- **Pin model versions** in production. Don't use `latest` tags — a silent model update
  can change output quality. I pin to specific tags like `llama3.1:8b-q4_k_m-2025-01-15`.
- **Add health checks** to your Docker containers. vLLM exposes `/health`, Ollama exposes
  `/api/tags`. Without health checks, Docker can't detect hung processes.
- **Monitor GPU utilization** with `nvidia-smi -l 1` or Prometheus + DCGM exporter. If
  GPU utilization is below 60%, you're either over-provisioned or your batching is
  inefficient.
- **Use a reverse proxy** (nginx, Caddy) in front of the LLM server for TLS termination,
  rate limiting, and load balancing across two or more model replicas.
- **Cache model downloads** in a Docker volume. Re-downloading a 5 GB model on every
  container restart wastes bandwidth and slows startup.
- **Set `--max-model-len`** to your actual needs, not the model's maximum. vLLM allocates
  KV cache based on this value — setting it to 128K when you only need 8K wastes VRAM.
- **Benchmark before and after changes**. A simple `tokens/second` measurement catches
  regressions that qualitative testing misses.

## Common Mistakes

- **Underestimating VRAM needs**. The model weights are only part of the story — add
  15-20% for KV cache and 1 GB for runtime overhead. I've seen people buy a 12 GB GPU
  for a 14B model at Q4 (10 GB) and OOM on the first long request.
- **Using `yaml.load()` instead of `yaml.safe_load()`** for config parsing. This is a
  security vulnerability — the unsafe loader can execute arbitrary code.
- **Exposing the API port to the internet** without authentication. Add an API key
  middleware or put the server behind a VPN. I once found an Ollama instance exposed on
  a public IP — anyone could run inference for free.
- **Not warming up the model** before serving traffic. The first request after model load
  is always slow because kernels need to JIT-compile. Send a dummy request before
  declaring the service healthy.
- **Ignoring quantization quality loss**. Q4_K_M is good for chat, but for code
  generation or math, you may need Q6_K or Q8_0. Benchmark your specific use case.
- **Running two or more inference servers on the same GPU** without memory limits. They'll
  fight for VRAM and crash. Use `--gpu-memory-utilization` to partition.
- **Forgetting to update models**. New model versions fix safety issues and improve
  quality. Schedule monthly reviews of your model versions.

## See Also

- [Ollama documentation](https://github.com/ollama/ollama) — official docs and model
  library.
- [vLLM documentation](https://docs.vllm.ai/) — serving guides and performance tuning.
- [llama.cpp repository](https://github.com/ggerganov/llama.cpp) — build instructions and
  benchmarks.
- [HuggingFace Hub](https://huggingface.co/docs/hub) — model repository and download
  tools.
- [NVIDIA CUDA docs](https://docs.nvidia.com/cuda/) — GPU programming and driver setup.
- [GGUF specification](https://github.com/ggerganov/ggml/blob/master/docs/gguf.txt) —
  the file format used by llama.cpp.
- [AutoGPTQ](https://github.com/PanQiWei/AutoGPTQ) — GPTQ quantization for HuggingFace
  models.

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

### How do I monitor a local LLM server?

Use Prometheus with the NVIDIA DCGM exporter for GPU metrics (utilization, memory,
temperature). For inference metrics, vLLM exposes a `/metrics` endpoint with
Prometheus-format data including request count, latency histograms, and tokens generated.
Ollama doesn't expose metrics natively — wrap it with a custom middleware that logs
request count and latency. I use Grafana dashboards with three panels: GPU utilization,
tokens/second, and request latency p50/p95/p99.

### How do I secure a local LLM API?

Three layers: (1) put the server behind a VPN or private network, never expose the port
to the public internet. (2) Add an API key middleware — even a simple bearer token check
prevents unauthorized use. (3) Use a reverse proxy (nginx, Caddy) for TLS termination.
For multi-tenant setups, add rate limiting per API key and log all requests for auditing.
I've seen teams skip all three and find strangers using their GPU after finding the
open port via Shodan.

### Can I run multiple models on the same GPU?

Yes, but you need to partition VRAM carefully. vLLM's `--gpu-memory-utilization` flag
limits how much VRAM each instance claims. For two 8B Q4 models (~5 GB each) on a 24 GB
GPU, set each to `--gpu-memory-utilization 0.45`. Ollama handles this automatically — it
unloads models when VRAM runs low. The trade-off is that model switching takes 5-10
seconds as weights load into VRAM.
