---


contentType: docs
slug: serverless-cold-start-runbook
templateType: runbook
title: "Runbook de Cold Start Serverless"
description: "Runbook para diagnosticar y mitigar cold starts en funciones serverless: causas, medicion, estrategias de optimizacion (provisioned concurrency, warmers, initialization tuning) y monitoreo con ejemplos de codigo para AWS Lambda, Azure y GCP."
metaDescription: "Runbook for serverless cold starts: causes, measurement, provisioned concurrency, warmers, init tuning, monitoring for Lambda, Azure, GCP."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - cold-start
  - aws-lambda
  - performance
  - runbook
  - optimization
relatedResources:
  - /docs/serverless-function-deployment-checklist
  - /docs/serverless-cost-estimation-template
  - /docs/serverless-security-checklist
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Runbook for serverless cold starts: causes, measurement, provisioned concurrency, warmers, init tuning, monitoring for Lambda, Azure, GCP."
  keywords:
    - serverless cold start
    - lambda cold start
    - provisioned concurrency
    - lambda warmer
    - serverless performance
    - cold start optimization
    - init phase


---

## Overview

Este runbook cubre diagnostico y mitigacion de cold starts en funciones serverless. Cold starts occurren cuando una function recibe su first invocation despues de estar idle o deployed. El platform debe allocatear un container, loadea el runtime y inicializa la function antes de ejecutar el handler. Esto addea 1-10 segundos de latency dependiendo del runtime, package size y initialization logic.

---

## 1. Cold Start Causes

### 1.1 What Triggers a Cold Start

```text
Trigger                    | Cold start severity | Frequency
───────────────────────────┼─────────────────────┼──────────────
First invocation after deploy| High (full init)   | Every deploy
Idle period exceeded       | Medium (container   | 5-15 min idle
                           | may be recycled)    |
Concurrency spike          | High (new containers| Traffic bursts
                           | scaled up)          |
Runtime update             | High (full reinit)  | Platform updates
Memory allocation change   | High (full reinit)  | Config changes
Package size increase      | Medium (slower load)| Code changes
```

### 1.2 Cold Start Phases

```text
Phase              | Duration     | Controllable? | Description
───────────────────┼──────────────┼───────────────┼──────────────────────
Container allocation| 100-500ms    | No            | Platform allocates container
Runtime init        | 200-2000ms   | No            | Runtime boots (Node, Python, etc)
Code load           | 50-500ms     | Yes           | Function code loaded into memory
Init code execution | 0-5000ms     | Yes           | Module-level code, imports
Handler execution   | Normal       | N/A           | Actual function logic
```

---

## 2. Measuring Cold Starts

### 2.1 AWS Lambda — CloudWatch Metrics

```bash
# Checkea cold start percentage
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-function \
  --filter-pattern '"COLD_START"' \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --end-time $(date +%s)000 \
  --limit 100

# Calculate cold start rate
total_invocations=$(aws logs filter-log-events \
  --log-group-name /aws/lambda/my-function \
  --filter-pattern '"INVOCATION"' \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --end-time $(date +%s)000 \
  --limit 10000 | jq '.events | length')

cold_starts=$(aws logs filter-log-events \
  --log-group-name /aws/lambda/my-function \
  --filter-pattern '"COLD_START"' \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --end-time $(date +%s)000 \
  --limit 10000 | jq '.events | length')

echo "Cold start rate: $(echo "scale=2; $cold_starts * 100 / $total_invocations" | bc)%"
```

### 2.2 Application-Level Cold Start Detection

```python
import json
import time
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Trackea initialization time
_init_start = time.time()

# Module-level initialization (corre on cold start)
db_connection = create_db_connection()
config = load_config()

_init_end = time.time()
_init_duration = _init_end - _init_start

def handler(event, context):
    # Detecta cold start via Lambda runtime
    is_cold_start = not hasattr(context, 'warm')
    
    if is_cold_start:
        logger.info(json.dumps({
            "COLD_START": True,
            "init_duration_ms": round(_init_duration * 1000, 2),
            "remaining_time_ms": context.get_remaining_time_in_millis(),
            "memory_limit_mb": context.memory_limit_in_mb,
        }))
    
    # Marca como warm para subsequent invocations
    context.warm = True
    
    logger.info(json.dumps({
        "INVOCATION": True,
        "request_id": context.aws_request_id,
    }))
    
    return process_request(event)
```

### 2.3 X-Ray Trace Analysis

```python
# Cold start visible en X-Ray como un long "Initialization" segment
# Compara Init duration vs. Handler duration

# Typical cold start trace:
#   Initialization: 1500ms  ← cold start overhead
#   Handler:         200ms  ← actual business logic
#   Total:           1700ms

# Warm invocation trace:
#   Initialization:    0ms  ← already initialized
#   Handler:         200ms
#   Total:            200ms
```

---

## 3. Mitigation Strategies

### 3.1 Provisioned Concurrency (AWS Lambda)

```yaml
# serverless.yml — provisioned concurrency
functions:
  criticalAPI:
    handler: src/handlers/api.handler
    memorySize: 512
    provisionedConcurrency: 10  # always warm
    # Auto-scaling configuration
    provisionedConcurrencyAutoscaling:
      minCapacity: 5
      maxCapacity: 50
      targetUtilization: 70  # scale at 70% of provisioned
      scaleInCooldown: 300   # 5 min
      scaleOutCooldown: 60   # 1 min
```

```bash
# Enable provisioned concurrency via AWS CLI
aws lambda put-provisioned-concurrency-config \
  --function-name my-function \
  --qualifier prod \
  --provisioned-concurrent-executions 10
```

### 3.2 Lambda Warmer (Scheduled Invocations)

```python
# warmer.py — keepea functions warm con periodic invocations
import boto3
import json
import logging

lambda_client = boto3.client('lambda')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Functions para keep warm
WARM_FUNCTIONS = [
    {"name": "order-service-prod-processOrder", "concurrency": 5},
    {"name": "order-service-prod-sendEmail", "concurrency": 3},
]

def handler(event, context):
    for func in WARM_FUNCTIONS:
        for _ in range(func["concurrency"]):
            try:
                lambda_client.invoke(
                    FunctionName=func["name"],
                    InvocationType='Event',  # async
                    Payload=json.dumps({"warmer": True, "source": "warmer"}),
                )
            except Exception as e:
                logger.error(f"Failed to warm {func['name']}: {e}")
    
    logger.info(f"Warmed {len(WARM_FUNCTIONS)} functions")

# Schedulea cada 5 minutes via EventBridge
```

```yaml
# serverless.yml — warmer schedule
functions:
  warmer:
    handler: src/warmer.handler
    events:
      - schedule:
          rate: rate(5 minutes)
          enabled: true
    iam:
      role:
        statements:
          - Effect: Allow
            Action: lambda:InvokeFunction
            Resource: "*"
```

### 3.3 Handler-Level Warm Check

```python
def handler(event, context):
    # Skipea processing para warmer invocations
    if event.get("warmer"):
        return {"warmed": True}
    
    # Normal request processing
    return process_request(event)
```

### 3.4 Initialization Optimization

```python
# BAD: Heavy initialization en handler (corre every invocation)
def handler(event, context):
    db = create_db_connection()  # 500ms — corre every time
    config = load_config()       # 200ms — corre every time
    return process(event, db, config)

# GOOD: Inicializa outside handler (corre once on cold start)
db = create_db_connection()     # 500ms — corre once
config = load_config()           # 200ms — corre once

def handler(event, context):
    return process(event, db, config)  # solo business logic per invocation
```

### 3.5 Lazy Initialization

```python
# Lazy-loadea heavy dependencies solo cuando needed
_db = None
_config = None

def get_db():
    global _db
    if _db is None:
        _db = create_db_connection()
    return _db

def get_config():
    global _config
    if _config is None:
        _config = load_config()
    return _config

def handler(event, context):
    # Solo inicializa lo que esta invocation necesita
    if event.get("type") == "read":
        return read_data(event, get_db())
    elif event.get("type") == "config":
        return get_config()
```

---

## 4. Runtime-Specific Optimization

### 4.1 Node.js

```javascript
// BAD: Top-level await blockea cold start
const data = await loadLargeDataset(); // blocks init

// GOOD: Lazy load
let data = null;
async function getData() {
  if (!data) data = await loadLargeDataset();
  return data;
}

// GOOD: Usa require at top level (cached despues de first load)
const aws = require('aws-sdk'); // fast, cached

// BAD: Large dependencies en handler
exports.handler = async (event) => {
  const heavyLib = require('heavy-lib'); // loadea every cold start
  return heavyLib.process(event);
};
```

### 4.2 Python

```python
# GOOD: Importa at module level (corre on cold start, cached)
import json
import boto3

# BAD: Importa inside handler (corre on every cold start)
def handler(event, context):
    import heavy_module  # slow cold start
    return heavy_module.process(event)

# GOOD: Lazy import para rarely-used modules
def handler(event, context):
    if event.get("rare_feature"):
        import heavy_module  # solo cuando needed
        return heavy_module.process(event)
    return default_process(event)
```

---

## 5. Package Size Optimization

### 5.1 Reduce Package Size

```bash
# Stripea dev dependencies
npm prune --production

# Usa Lambda Layers para shared dependencies
# serverless.yml
layers:
  commonDeps:
    path: layers/common
    description: "Shared dependencies"

# Excluye test files y docs
package:
  exclude:
    - tests/**
    - docs/**
    - "*.md"
    - ".git/**"
    - "node_modules/**/.test/**"
```

### 5.2 Bundle with esbuild

```yaml
# serverless.yml — esbuild bundling
custom:
  esbuild:
    bundle: true
    minify: true
    target: node20
    platform: node
    exclude:
      - aws-sdk  # provided by Lambda runtime
```

## Preguntas Frecuentes

### ¿Cuál es un acceptable cold start duration?

Para user-facing APIs, cold starts deberian estar under 1 second. Para background processing (SQS, EventBridge), cold starts up to 5 seconds son acceptable. Para webhooks con client timeouts, keepea cold starts under 2 seconds. Measurea tu p99 cold start duration y comparalo con tu SLA. Si cold starts exceden tu SLA, usa provisioned concurrency para las affected functions.

### ¿Qué tan often occurren cold starts en production?

Cold starts dependen de traffic patterns. Para functions con constant traffic (> 1 invocation per minute), cold starts son rare (< 1% de invocations). Para functions con bursty o low traffic, cold starts pueden affectear 10-30% de invocations. Despues de un deployment, cada concurrent execution path experimenta un cold start. AWS Lambda recyclea containers despues de 5-15 minutes de inactivity, asi que functions con gaps en traffic veran cold starts.

### ¿Aumentar memory reduce cold starts?

Si, parcialmente. Higher memory allocation tambien increasea CPU allocation (proportional en Lambda). Mas CPU significa faster code loading y initialization. Ir de 128MB a 512MB puede reducir cold start duration por 30-50%. Sin embargo, container allocation y runtime init phases no se affectean por memory. El biggest improvement viene de reducir init code execution time — movee heavy imports outside del handler y usa lazy loading.

### ¿Deberia usar un warmer o provisioned concurrency?

Usa provisioned concurrency para production APIs con strict latency requirements. Es el unico guaranteed way de eliminar cold starts. Usa un warmer para dev/staging environments o non-critical functions donde occasional cold starts son acceptable. Warmers tienen drawbacks: consumen invocations (cost), no handlean concurrency spikes (cada concurrent execution path necesita su own warm container), y addean complexity. Provisioned concurrency es simpler y mas reliable pero cuesta mas.

### ¿Cómo mido el impact de cold start optimizations?

Compara p99 duration before y despues de optimization usando CloudWatch Metrics o X-Ray traces. Filterea metrics por cold start vs. warm invocations usando custom log attributes. Corre load tests que incluyan un cold start scenario (deploy, then immediately send traffic). Trackea el init duration separadamente de handler duration en X-Ray. Setea CloudWatch alarms en p99 duration para detectar cold start regressions despues de deployments.

## See Also

- [Complete Guide to AWS Lambda in Production](/es/guides/complete-guide-aws-lambda-production/)
- [Serverless Warm Pool Pattern](/es/patterns/serverless-warm-pool-pattern/)
- [Serverless Cost Estimation Template](/es/docs/serverless-cost-estimation-template/)
- [Serverless Architecture — Patterns and Anti-Patterns](/es/guides/serverless-architecture-guide/)
- [Complete Guide to Serverless Architecture](/es/guides/complete-guide-serverless-architecture/)

