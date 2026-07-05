---
contentType: docs
slug: serverless-cost-estimation-template
templateType: guideline
title: "Plantilla de Estimacion de Costos Serverless"
description: "Plantilla para estimar costos serverless por workload: invocation-based pricing, memory-duration calculation, data transfer, API Gateway, Step Functions y hidden costs. Incluye estrategias de optimizacion y proyecciones de budget."
metaDescription: "Serverless cost estimation template: invocation pricing, GB-second calc, data transfer, API Gateway, hidden costs, optimization strategies, budget."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - cost-estimation
  - aws-lambda
  - cloud-cost
  - budgeting
  - optimization
relatedResources:
  - /docs/serverless/serverless-function-deployment-checklist
  - /docs/serverless/serverless-cold-start-runbook
  - /docs/serverless/serverless-security-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Serverless cost estimation template: invocation pricing, GB-second calc, data transfer, API Gateway, hidden costs, optimization strategies, budget."
  keywords:
    - serverless cost
    - lambda pricing
    - serverless budget
    - cloud cost estimation
    - aws lambda cost
    - serverless optimization
    - gb-seconds
---

## Overview

Esta plantilla ayuda a teams a estimatear serverless costs por workload antes de deployment y trackear actual costs contra projections. Serverless pricing se basa en invocations, execution duration, memory allocation y data transfer. Subestimar cualquiera de estos factores leada a budget overruns.

---

## 1. Pricing Model Reference

### 1.1 AWS Lambda Pricing (us-east-1)

```text
Component              | Free tier       | Price after free tier
───────────────────────┼─────────────────┼──────────────────────────
Requests               | 1M/month free   | $0.20 per 1M requests
Compute (GB-second)    | 400K/month free | $0.0000166667 per GB-second
Provisioned concurrency| None            | $0.0000049700 per GB-second
Data transfer (in)     | Always free     | $0.00 per GB
Data transfer (out)    | 100GB/month free| $0.09 per GB
```

### 1.2 Azure Functions Pricing

```text
Component              | Free tier       | Price after free tier
───────────────────────┼─────────────────┼──────────────────────────
Executions             | 1M/month free   | $0.20 per 1M executions
GB-seconds             | 400K/month free | $0.000016 per GB-second
Premium plan (vCPU)    | None            | $0.192/hour per vCPU
Premium plan (memory)  | None            | $0.0139/hour per GB
```

### 1.3 GCP Cloud Functions Pricing

```text
Component              | Free tier       | Price after free tier
───────────────────────┼─────────────────┼──────────────────────────
Invocations            | 2M/month free   | $0.40 per 1M invocations
GB-seconds             | 400K/month free | $0.0000025 per GHz-second
                       |                 | + $0.0000025 per GB-second
Data transfer (out)    | 100GB/month free| $0.12 per GB
```

---

## 2. Cost Calculation Formula

### 2.1 Lambda Compute Cost

```text
Monthly compute cost = (invocations × duration_seconds × memory_GB) × price_per_GB_second

Example:
  Invocations: 10M/month
  Duration: 200ms average (0.2 seconds)
  Memory: 512MB (0.5 GB)

  GB-seconds = 10,000,000 × 0.2 × 0.5 = 1,000,000 GB-seconds
  Cost = 1,000,000 × $0.0000166667 = $16.67/month
```

### 2.2 Lambda Request Cost

```text
Monthly request cost = (invocations - free_tier) × price_per_million / 1,000,000

Example:
  Invocations: 10M/month
  Free tier: 1M

  Billable = 10,000,000 - 1,000,000 = 9,000,000
  Cost = 9 × $0.20 = $1.80/month
```

### 2.3 Total Lambda Cost

```python
def estimate_lambda_cost(
    invocations: int,
    avg_duration_ms: float,
    memory_mb: int,
    provisioned_concurrency_gb_seconds: int = 0,
    data_transfer_out_gb: float = 0,
) -> dict:
    """Estimatea monthly AWS Lambda cost."""
    
    # Compute cost
    duration_s = avg_duration_ms / 1000
    memory_gb = memory_mb / 1024
    gb_seconds = invocations * duration_s * memory_gb
    free_tier_gb_seconds = 400_000
    billable_gb_seconds = max(gb_seconds - free_tier_gb_seconds, 0)
    compute_cost = billable_gb_seconds * 0.0000166667
    
    # Request cost
    free_tier_requests = 1_000_000
    billable_requests = max(invocations - free_tier_requests, 0)
    request_cost = (billable_requests / 1_000_000) * 0.20
    
    # Provisioned concurrency cost
    pc_cost = provisioned_concurrency_gb_seconds * 0.0000049700
    
    # Data transfer cost
    free_tier_data = 100
    billable_data = max(data_transfer_out_gb - free_tier_data, 0)
    data_cost = billable_data * 0.09
    
    total = compute_cost + request_cost + pc_cost + data_cost
    
    return {
        "compute_cost": round(compute_cost, 2),
        "request_cost": round(request_cost, 2),
        "provisioned_concurrency_cost": round(pc_cost, 2),
        "data_transfer_cost": round(data_cost, 2),
        "total_monthly_cost": round(total, 2),
        "gb_seconds": int(gb_seconds),
    }

# Example usage
cost = estimate_lambda_cost(
    invocations=10_000_000,
    avg_duration_ms=200,
    memory_mb=512,
)
print(f"Total monthly cost: ${cost['total_monthly_cost']}")
```

---

## 3. Workload Estimation Template

### 3.1 Per-Function Estimation

```text
Function: processOrder
──────────────────────────────────────────────────
Metric                  | Value          | Source
───────────────────────┼────────────────┼──────────────────
Expected invocations   | 10M/month      | Traffic forecast
Average duration       | 200ms          | Load testing
Memory allocation      | 512MB          | Power Tuning
p99 duration           | 500ms          | Load testing
Data transfer out      | 5GB/month      | Payload size × invocations
Provisioned concurrency| 10 concurrent  | Latency requirement

Estimated monthly cost:
  Compute:  $16.67
  Requests: $1.80
  PC:       $21.77  (10 × 0.5GB × 30 days × 24h × 3600s × $0.00000497)
  Data:     $0.00   (under 100GB free tier)
  Total:    $40.24/month
```

### 3.2 Multi-Function Estimation

```python
workloads = [
    {"name": "processOrder", "invocations": 10_000_000, "duration_ms": 200, "memory_mb": 512},
    {"name": "sendEmail", "invocations": 5_000_000, "duration_ms": 100, "memory_mb": 256},
    {"name": "generateReport", "invocations": 100_000, "duration_ms": 5000, "memory_mb": 2048},
    {"name": "webhookHandler", "invocations": 50_000_000, "duration_ms": 50, "memory_mb": 128},
]

total_cost = 0
for w in workloads:
    cost = estimate_lambda_cost(w["invocations"], w["duration_ms"], w["memory_mb"])
    print(f"{w['name']}: ${cost['total_monthly_cost']}/month")
    total_cost += cost["total_monthly_cost"]

print(f"\nTotal monthly cost: ${total_cost:.2f}")
```

---

## 4. Hidden Costs

### 4.1 API Gateway Costs

```text
Component              | Free tier       | Price
───────────────────────┼─────────────────┼──────────────────────
Requests (HTTP API)    | 300M/month      | $1.00 per 1M
Requests (REST API)    | 1M/month (12mo) | $3.50 per 1M
Data transfer out      | 100GB/month     | $0.09 per GB
WebSocket connections  | 1M/month (12mo) | $0.80 per 1M
```

### 4.2 Step Functions Costs

```text
Type                   | Free tier       | Price per transition
───────────────────────┼─────────────────┼──────────────────────
Standard workflow      | 4K/month (12mo) | $0.025 per 1,000
Express workflow       | 4K/month (12mo) | $1.00 per 1M invocations
                                       + $0.03 per 1K GB-seconds
```

### 4.3 Common Hidden Costs

```text
Hidden cost                | Impact        | Mitigation
───────────────────────────┼───────────────┼──────────────────────────
CloudWatch Logs ingestion  | $0.50 per GB  | Set log retention, use sampling
CloudWatch Logs storage    | $0.03 per GB  | Set TTL on log groups
X-Ray tracing              | $0.50 per 1M  | Sample traces (not 100%)
SQS requests               | $0.40 per 1M  | Batch messages
S3 PUT/GET requests        | $0.005 per 1K | Batch S3 operations
Secrets Manager            | $0.40 per sec | Use SSM Parameter Store (free)
DynamoDB read/write units  | Per-request   | Use on-demand capacity
NAT Gateway                | $0.045 per GB | Use VPC endpoints where possible
```

---

## 5. Cost Optimization Strategies

### 5.1 Memory Tuning

```text
Memory    | CPU share    | Cost per 1M invocations (200ms)
──────────┼──────────────┼──────────────────────────────────
128MB     | 1/10 vCPU    | $0.21
256MB     | 1/5 vCPU     | $0.43
512MB     | 2/5 vCPU     | $0.85
1024MB    | 1 vCPU       | $1.71
2048MB    | 2 vCPU       | $3.41

Optimal: Elegi el memory donde cost × duration es minimized.
Higher memory = faster execution = fewer GB-seconds.
```

### 5.2 Optimization Checklist

- [ ] Profileea memory con AWS Lambda Power Tuning
- [ ] Reduce cold starts (provisioned concurrency solo para critical paths)
- [ ] Batchea SQS messages (reduce invocation count)
- [ ] Usa EventBridge filtering (reduce unnecessary invocations)
- [ ] Setea log retention a 7-30 days (no infinite)
- [ ] Usa SSM Parameter Store en vez de Secrets Manager para non-secret config
- [ ] Usa VPC endpoints para avoid NAT Gateway charges
- [ ] Stripea dev dependencies del deployment package
- [ ] Usa Lambda Layers para shared dependencies
- [ ] Monitora AWS Cost Explorer weekly

## Preguntas Frecuentes

### ¿Qué tan accurate son las serverless cost estimates?

Las estimates son accurate dentro de 10-20% cuando se basan en real load testing data. El biggest source de error es subestimar invocation count — production traffic often excede forecasts por 2-3x durante peak events. Siempre modela worst-case scenarios (3x expected traffic) y setea billing alarms a 50%, 75% y 100% de budget. Reviewea actual costs contra estimates monthly y adjusta projections basado en real data.

### ¿Cuándo serverless se vuelve mas caro que EC2?

Serverless es mas barato que EC2 para workloads con low o bursty traffic (utilization < 40%). En sustained high traffic (> 70% utilization), EC2 o Fargate se vuelve mas barato porque pagas por capacity en vez de per-invocation. El break-even point depende en memory, duration y invocation count. Como rule of thumb: si tu function corre continuamente (every second), serverless cuesta 2-3x mas que un equivalent EC2 instance. Usa el cost calculator para find tu specific break-even point.

### ¿Cómo reduzco CloudWatch Logs costs?

Setea log retention a 7-30 days en vez de "never expire." Usa log levels (INFO en production, DEBUG solo en dev). Removee verbose logging de hot paths. Usa sampling para high-volume logs. Considera shippear logs a S3 con Glacier archival para long-term storage a $0.004/GB en vez de CloudWatch's $0.03/GB. Una single function generando 1KB de logs per invocation a 10M invocations/month cuesta $5/month en ingestion alone.

### ¿Cuál es el cost impact de provisioned concurrency?

Provisioned concurrency te chargea por reserved capacity incluso cuando no esta en use. En 10 concurrent executions con 512MB memory, eso es 10 × 0.5GB × 30 days × 24h × 3600s × $0.00000497 = $21.77/month. Compara esto con on-demand cost para el same traffic. Solo usa provisioned concurrency para functions con strict latency SLAs donde cold starts son unacceptable. Para dev/staging, siempre usa on-demand.

### ¿Cómo seteo billing alerts para serverless workloads?

Usa AWS Budgets para setear cost alerts a 50%, 75% y 100% de tu monthly budget. Crea per-function cost allocation tags y usa Cost Explorer para filterear por tag. Setea anomaly detection en AWS Cost Anomaly Detection para unexpected spikes. Para granular monitoring, usa CloudWatch custom metrics para emitir estimated cost per function invocation y alarm en cost anomalies.

### ¿Cómo estimateo costs para Step Functions workflows?

Step Functions chargea per state transition. Standard workflows cuestan $0.025 per 1,000 transitions. Express workflows cuestan $1.00 per 1M invocations plus $0.03 per 1K GB-seconds. Para un workflow con 5 steps corriendo 100K times/month, standard cuesta $12.50/month. Express cuesta $0.10/month para invocations plus compute charges. Usa standard para long-running workflows (> 5 minutes) y express para short, high-volume workflows.
