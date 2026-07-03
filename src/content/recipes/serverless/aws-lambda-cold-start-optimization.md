---
contentType: recipes
slug: aws-lambda-cold-start-optimization
title: "Reduce AWS Lambda Cold Start with Provisioned Concurrency"
description: "Minimize Lambda cold start latency using provisioned concurrency, ARM64 Graviton, lighter dependencies, and initialization code optimization."
metaDescription: "Reduce AWS Lambda cold start with provisioned concurrency, ARM64 Graviton, lighter dependencies, and optimized initialization code patterns."
difficulty: advanced
topics:
  - serverless
  - performance
  - infrastructure
tags:
  - aws
  - lambda
  - cold-start
  - provisioned-concurrency
  - performance
relatedResources:
  - /recipes/serverless/aws-lambda-python-dependencies
  - /recipes/serverless/serverless-dynamodb-single-table
  - /guides/serverless-architecture-guide
  - /guides/complete-guide-react-performance-optimization
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Reduce AWS Lambda cold start with provisioned concurrency, ARM64 Graviton, lighter dependencies, and optimized initialization code patterns."
  keywords:
    - aws lambda cold start
    - provisioned concurrency
    - lambda performance
    - graviton lambda
    - lambda initialization
---

## Overview

Cold start is the delay when Lambda creates a new execution environment for a function. It includes downloading code, initializing the runtime, loading dependencies, and running initialization code. For latency-sensitive APIs, cold starts of 1-10 seconds are unacceptable. Below: reducing cold start with provisioned concurrency, ARM64 Graviton, dependency trimming, lazy initialization, and SnapStart (for Java).

## When to Use This

- Lambda functions serving synchronous HTTP APIs with strict latency requirements
- Functions with heavy dependencies (pandas, SQLAlchemy, SDK clients)
- Production workloads where cold starts cause user-visible delays or timeouts
- Functions that need predictable response times under variable traffic

## Prerequisites

- Python 3.11+ Lambda function
- AWS CLI with permissions to configure concurrency
- Understanding of your function's initialization cost

## Solution

### 1. Measure Cold Start

```python
import json
import time

def lambda_handler(event, context):
    start = time.time()

    # Check if this is a cold start
    is_cold_start = not hasattr(context, 'warm')

    response = {
        "cold_start": is_cold_start,
        "init_time_ms": round((time.time() - start) * 1000, 2),
        "remaining_time_ms": context.get_remaining_time_in_millis(),
    }

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(response),
    }
```

Log cold starts with CloudWatch Insights:

```text
filter @type = "REPORT"
| parse @message "* Duration: * ms Billed Duration: * ms Memory Size: * MB Max Memory Used: * MB*" as type, duration, billed, memory, maxMemory
| parse @message "* Init Duration: * ms*" as type2, initDuration
| filter ispresent(initDuration)
| stats avg(initDuration), max(initDuration), count() by bin(1h)
```

### 2. Provisioned Concurrency

Pre-warm execution environments so they're ready to serve immediately:

```bash
# Enable provisioned concurrency on an alias
aws lambda put-provisioned-concurrency \
  --function-name my-api \
  --qualifier prod \
  --provisioned-concurrent-executions 10

# With SAM
```

```yaml
# template.yaml
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: my-api
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      AutoPublishAlias: prod
      ProvisionedConcurrencyConfig:
        ProvisionedConcurrentExecutions: 10
```

### 3. Lazy Initialization

Move expensive initialization inside the handler — only runs on first request, not on cold start:

```python
import json

# BAD: Module-level initialization — runs on every cold start
# import pandas as pd
# df = pd.read_csv('data.csv')  # 2-3 seconds

# GOOD: Lazy initialization — only runs when needed
_pd = None
_df = None

def get_pandas():
    global _pd
    if _pd is None:
        import pandas as pd
        _pd = pd
    return _pd

def get_data():
    global _df
    if _df is None:
        pd = get_pandas()
        _df = pd.read_csv('data.csv')
    return _df

def lambda_handler(event, context):
    df = get_data()
    result = df.head(10).to_dict(orient="records")
    return {
        "statusCode": 200,
        "body": json.dumps(result),
    }
```

### 4. Switch to ARM64 (Graviton2)

ARM64 Graviton2 processors have faster cold starts for many workloads:

```bash
# Update function architecture
aws lambda update-function-configuration \
  --function-name my-api \
  --architectures arm64

# Rebuild layer for ARM64
docker run --rm --platform linux/arm64 \
  -v "$PWD/layer":/var/task \
  public.ecr.aws/lambda/python:3.11-arm64 \
  /bin/sh -c "pip install -r requirements.txt --target /var/task/python"
```

### 5. Reduce Package Size

Strip unnecessary files from deployment packages:

```bash
# Remove tests, docs, __pycache__
find layer/python -type d -name "tests" -exec rm -rf {} +
find layer/python -type d -name "__pycache__" -exec rm -rf {} +
find layer/python -type f -name "*.pyc" -delete
find layer/python -type f -name "*.so" -exec strip {} \;

# Use lighter alternatives
# Instead of pandas: use polars (10x smaller, faster init)
# Instead of requests: use urllib3 or boto3's built-in HTTP client
# Instead of SQLAlchemy: use raw psycopg2 or aiobotocore
```

### 6. Connection Reuse Outside Handler

Initialize clients once at module level so they persist across warm invocations:

```python
import json
import boto3
import os

# Module-level: runs once per execution environment
# These persist across warm invocations
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

# But keep it light — only clients, not data
def lambda_handler(event, context):
    # Warm invocation reuses the table client
    response = table.get_item(Key={'id': event['pathParameters']['id']})
    return {
        "statusCode": 200,
        "body": json.dumps(response.get('Item', {})),
    }
```

### 7. Use Lambda Powertools for Structured Logging

Avoid heavy logging frameworks that slow initialization:

```python
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging import correlation_paths

logger = Logger()

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
def lambda_handler(event, context):
    logger.info("Processing request", extra={"path": event["path"]})
    return {"statusCode": 200, "body": json.dumps({"ok": True})}
```

### 8. Warm-Up Plugin (Serverless Framework)

Keep functions warm with periodic invocations:

```yaml
# serverless.yml
service: my-api

provider:
  name: aws
  runtime: python3.11

functions:
  api:
    handler: lambda_function.lambda_handler
    events:
      - http: { path: /data, method: get }

plugins:
  - serverless-plugin-warmup

custom:
  warmup:
    warmerName: 'warmer'
    schedule: 'rate(5 minutes)'
    concurrency: 5
    batchSize: 1
```

## How It Works

1. **Cold start phases**: (1) Download function code + layers, (2) Initialize runtime (Python interpreter), (3) Load modules and run module-level code, (4) Execute handler. Phases 1-3 are the "init duration" shown in CloudWatch.
2. **Provisioned concurrency**: AWS pre-creates execution environments and keeps them ready. Requests are routed to pre-warmed environments with zero init time. Scale-from-zero only happens beyond the provisioned capacity.
3. **Lazy initialization**: Module-level code runs on every cold start. Moving expensive operations (file reads, heavy imports) into functions that run on first use defers the cost to when it's actually needed.
4. **ARM64**: Graviton2 processors have different instruction pipelines that can be faster for Python's C extensions. The runtime itself is also optimized for ARM.
5. **Warm invocations**: After a cold start, the execution environment persists for 5-15 minutes. Subsequent invocations reuse it — no init duration. Warm-up plugins send periodic pings to keep environments alive.

## Variants

### SnapStart (Java)

For Java functions, SnapStart caches the initialized JVM:

```yaml
# SAM template
Resources:
  JavaFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: java21
      Handler: com.example.Handler
      SnapStart:
        ApplyOn: PublishedVersions
```

### Custom Runtime with Minimal Init

```python
# Use a minimal ASGI adapter instead of a full framework
# Instead of Flask/FastAPI (heavy init), use a raw handler
def lambda_handler(event, context):
    method = event['httpMethod']
    path = event['path']

    if method == 'GET' and path == '/health':
        return {"statusCode": 200, "body": '{"status":"ok"}'}

    if method == 'GET' and path.startswith('/products/'):
        product_id = path.split('/')[-1]
        return handle_get_product(product_id)

    return {"statusCode": 404, "body": '{"error":"not found"}'}
```

### EFS for Large Dependencies

Mount EFS instead of packaging large files in the deployment:

```yaml
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      FileSystemConfigs:
        - Arn: !GetAtt AccessPoint.Arn
          LocalMountPath: /mnt/data
```

## Best Practices

- **Profile before optimizing**: Use CloudWatch Insights to measure init duration. Don't guess — measure.
- **Move only expensive init to lazy**: Module-level clients (boto3) are cheap. File reads, heavy imports, and data processing should be lazy.
- **Right-size memory**: More memory = more CPU. 1024MB often halves cold start vs 256MB. Test different sizes.
- **Use provisioned concurrency for critical paths**: Only enable it for functions where cold start is user-visible (APIs). Background workers can tolerate cold starts.
- **Minimize dependencies**: Every import adds to init time. Use `pip install --no-deps` to check what a package pulls in.
- **Keep handler code small**: The handler zip should be under 5MB. Move dependencies to layers.

## Common Mistakes

- **Importing everything at module level**: `import pandas` at the top adds 1-2 seconds to every cold start. Use lazy imports.
- **Reading files at module level**: `open('config.json').read()` runs on every cold start. Cache it in a global with lazy init.
- **Over-provisioning concurrency**: Provisioned concurrency costs money 24/7. Set it to your baseline traffic, not peak.
- **Ignoring memory configuration**: Lambda allocates CPU proportional to memory. 128MB functions are CPU-starved and slow to init.
- **Using heavy frameworks**: Flask + Werkzeug add 200-500ms of init. Use lightweight handlers or API Gateway + Lambda proxy integration.

## FAQ

**What is a typical cold start duration?**

Python functions with light dependencies: 200-500ms. With pandas/numpy: 1-3 seconds. Java with Spring: 5-10 seconds (use SnapStart). Provisioned concurrency reduces this to near zero.

**Does provisioned concurrency eliminate cold starts entirely?**

For requests within the provisioned capacity, yes. If traffic exceeds provisioned concurrency, new environments are created with normal cold starts. Set provisioned concurrency to your expected baseline.

**How does memory affect cold start?**

Lambda allocates CPU proportional to memory. A 256MB function gets ~1/8 CPU; a 2048MB function gets a full CPU. More CPU means faster initialization. 1024-2048MB is optimal for most functions.

**Can I avoid cold starts without provisioned concurrency?**

You can reduce them with warm-up plugins (periodic pings), but not eliminate them. Warm environments eventually expire (5-15 minutes of idle). Provisioned concurrency is the only guarantee.

**Does SnapStart work for Python?**

No. SnapStart is Java-only. It captures the initialized JVM state as a snapshot and restores it in milliseconds. For Python, use provisioned concurrency and lazy initialization.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
