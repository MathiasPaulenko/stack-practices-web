---
contentType: docs
slug: serverless-cold-start-runbook
templateType: runbook
title: "Serverless Cold Start Runbook"
description: "Runbook for diagnosing and mitigating serverless cold starts: causes, measurement, optimization strategies (provisioned concurrency, warmers, initialization tuning), and monitoring with code examples for AWS Lambda, Azure, and GCP."
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
  - /docs/serverless/serverless-function-deployment-checklist
  - /docs/serverless/serverless-cost-estimation-template
  - /docs/serverless/serverless-security-checklist
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

This runbook covers diagnosis and mitigation of cold starts in serverless functions. Cold starts occur when a function receives its first invocation after being idle or deployed. The platform must allocate a container, load the runtime, and initialize the function before executing the handler. This adds 1-10 seconds of latency depending on runtime, package size, and initialization logic.

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
# Check cold start percentage
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

# Track initialization time
_init_start = time.time()

# Module-level initialization (runs on cold start)
db_connection = create_db_connection()
config = load_config()

_init_end = time.time()
_init_duration = _init_end - _init_start

def handler(event, context):
    # Detect cold start via Lambda runtime
    is_cold_start = not hasattr(context, 'warm')
    
    if is_cold_start:
        logger.info(json.dumps({
            "COLD_START": True,
            "init_duration_ms": round(_init_duration * 1000, 2),
            "remaining_time_ms": context.get_remaining_time_in_millis(),
            "memory_limit_mb": context.memory_limit_in_mb,
        }))
    
    # Mark as warm for subsequent invocations
    context.warm = True
    
    logger.info(json.dumps({
        "INVOCATION": True,
        "request_id": context.aws_request_id,
    }))
    
    return process_request(event)
```

### 2.3 X-Ray Trace Analysis

```python
# Cold start visible in X-Ray as a long "Initialization" segment
# Compare Init duration vs. Handler duration

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
# warmer.py — keep functions warm with periodic invocations
import boto3
import json
import logging

lambda_client = boto3.client('lambda')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Functions to keep warm
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

# Schedule every 5 minutes via EventBridge
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
    # Skip processing for warmer invocations
    if event.get("warmer"):
        return {"warmed": True}
    
    # Normal request processing
    return process_request(event)
```

### 3.4 Initialization Optimization

```python
# BAD: Heavy initialization in handler (runs every invocation)
def handler(event, context):
    db = create_db_connection()  # 500ms — runs every time
    config = load_config()       # 200ms — runs every time
    return process(event, db, config)

# GOOD: Initialize outside handler (runs once on cold start)
db = create_db_connection()     # 500ms — runs once
config = load_config()           # 200ms — runs once

def handler(event, context):
    return process(event, db, config)  # only business logic per invocation
```

### 3.5 Lazy Initialization

```python
# Lazy-load heavy dependencies only when needed
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
    # Only initialize what this invocation needs
    if event.get("type") == "read":
        return read_data(event, get_db())
    elif event.get("type") == "config":
        return get_config()
```

---

## 4. Runtime-Specific Optimization

### 4.1 Node.js

```javascript
// BAD: Top-level await blocks cold start
const data = await loadLargeDataset(); // blocks init

// GOOD: Lazy load
let data = null;
async function getData() {
  if (!data) data = await loadLargeDataset();
  return data;
}

// GOOD: Use require at top level (cached after first load)
const aws = require('aws-sdk'); // fast, cached

// BAD: Large dependencies in handler
exports.handler = async (event) => {
  const heavyLib = require('heavy-lib'); // loads every cold start
  return heavyLib.process(event);
};
```

### 4.2 Python

```python
# GOOD: Import at module level (runs on cold start, cached)
import json
import boto3

# BAD: Import inside handler (runs on every cold start)
def handler(event, context):
    import heavy_module  # slow cold start
    return heavy_module.process(event)

# GOOD: Lazy import for rarely-used modules
def handler(event, context):
    if event.get("rare_feature"):
        import heavy_module  # only when needed
        return heavy_module.process(event)
    return default_process(event)
```

---

## 5. Package Size Optimization

### 5.1 Reduce Package Size

```bash
# Strip dev dependencies
npm prune --production

# Use Lambda Layers for shared dependencies
# serverless.yml
layers:
  commonDeps:
    path: layers/common
    description: "Shared dependencies"

# Exclude test files and docs
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

## FAQ

### What is an acceptable cold start duration?

For user-facing APIs, cold starts should be under 1 second. For background processing (SQS, EventBridge), cold starts up to 5 seconds are acceptable. For webhooks with client timeouts, keep cold starts under 2 seconds. Measure your p99 cold start duration and compare it to your SLA. If cold starts exceed your SLA, use provisioned concurrency for the affected functions.

### How often do cold starts happen in production?

Cold starts depend on traffic patterns. For functions with constant traffic (> 1 invocation per minute), cold starts are rare (< 1% of invocations). For functions with bursty or low traffic, cold starts can affect 10-30% of invocations. After a deployment, every concurrent execution path experiences a cold start. AWS Lambda recycles containers after 5-15 minutes of inactivity, so functions with gaps in traffic will see cold starts.

### Does increasing memory reduce cold starts?

Yes, partially. Higher memory allocation also increases CPU allocation (proportional in Lambda). More CPU means faster code loading and initialization. Going from 128MB to 512MB can reduce cold start duration by 30-50%. However, container allocation and runtime init phases are not affected by memory. The biggest improvement comes from reducing init code execution time — move heavy imports outside the handler and use lazy loading.

### Should I use a warmer or provisioned concurrency?

Use provisioned concurrency for production APIs with strict latency requirements. It is the only guaranteed way to eliminate cold starts. Use a warmer for dev/staging environments or non-critical functions where occasional cold starts are acceptable. Warmers have drawbacks: they consume invocations (cost), they don't handle concurrency spikes (each concurrent execution path needs its own warm container), and they add complexity. Provisioned concurrency is simpler and more reliable but costs more.

### How do I measure the impact of cold start optimizations?

Compare p99 duration before and after optimization using CloudWatch Metrics or X-Ray traces. Filter metrics by cold start vs. warm invocations using custom log attributes. Run load tests that include a cold start scenario (deploy, then immediately send traffic). Track the init duration separately from handler duration in X-Ray. Set CloudWatch alarms on p99 duration to detect cold start regressions after deployments.
