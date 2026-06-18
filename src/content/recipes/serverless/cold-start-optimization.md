---
contentType: recipes
slug: cold-start-optimization
title: "Minimize Cold Start Latency in Serverless Functions"
description: "How to reduce cold start times in AWS Lambda, Azure Functions, and Cloud Run using provisioned concurrency, lazy loading, runtime tuning, and dependency optimization."
metaDescription: "Learn cold start optimization for serverless functions. Reduce latency in Lambda, Azure Functions, and Cloud Run using provisioned concurrency."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - cold-start
  - lambda
relatedResources:
  - /recipes/serverless-functions
  - /recipes/serverless-api-gateway
  - /recipes/lazy-loading
  - /recipes/query-optimization
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn cold start optimization for serverless functions. Reduce latency in Lambda, Azure Functions, and Cloud Run using provisioned concurrency."
  keywords:
    - cold start optimization
    - lambda cold start
    - serverless latency
    - provisioned concurrency
    - reduce startup time
---

## Overview

Serverless functions execute in ephemeral containers created on demand. When a request arrives and no warm container exists, the cloud provider initializes a new runtime, loads your code, imports dependencies, and executes the handler. This initialization phase — the cold start — adds latency ranging from 100ms to several seconds depending on runtime, memory allocation, and dependency size. For user-facing APIs, cold starts translate directly into poor user experience.

Cold starts are not a bug; they are a trade-off. Serverless pricing is per-request with no idle cost. If you want zero idle cost, you must accept occasional initialization overhead. The goal is not to eliminate cold starts entirely — that requires always-on instances — but to minimize their frequency and duration. This recipe covers provisioned concurrency, runtime selection, dependency trimming, lazy initialization, and initialization-time caching across AWS Lambda, Azure Functions, and Google Cloud Run.

## When to use it

Use this recipe when:

- Building latency-sensitive APIs on serverless platforms (sub-200ms p99)
- Experiencing user complaints about slow first requests after idle periods
- Migrating from provisioned servers to serverless and needing comparable latency
- Optimizing Java, .NET, or Ruby functions that suffer from multi-second cold starts
- Running machine learning inference or heavy initialization in serverless environments

## Solution

### Provisioned Concurrency (AWS Lambda / Terraform)

```hcl
resource "aws_lambda_function" "api" {
  function_name = "user-api"
  runtime       = "provided.al2"
  handler       = "bootstrap"
  memory_size   = 512
  timeout       = 10

  provisioned_concurrent_executions = 10
}

resource "aws_lambda_provisioned_concurrency_config" "api_warm" {
  function_name                     = aws_lambda_function.api.function_name
  qualifier                         = aws_lambda_function.api.version
  provisioned_concurrent_executions = 10
}
```

### Lazy Initialization Pattern (Python)

```python
import json
import boto3

# Avoid initializing clients at import time
_dynamodb = None
_s3 = None

def get_dynamodb():
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource('dynamodb')
    return _dynamodb

def get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client('s3')
    return _s3

def handler(event, context):
    # Only initialize what this specific invocation needs
    if event['path'] == '/users':
        table = get_dynamodb().Table('users')
        return table.scan()
    elif event['path'].startswith('/files/'):
        return get_s3().get_object(Bucket='assets', Key=event['path'])
```

### SnapStart for Java (AWS Lambda)

```java
public class OrderHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    // This runs during snapshot creation, not on every cold start
    private static final OrderService orderService = initializeOrderService();

    private static OrderService initializeOrderService() {
        return new OrderService(
            DynamoDbClient.builder().build(),
            new ObjectMapper(),
            loadConfiguration()
        );
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent event, Context context) {
        // Handler execution is fast because initialization was snapshotted
        return orderService.process(event);
    }
}
```

### Cloud Run Minimum Instances (gcloud)

```bash
# Deploy with minimum instances to keep containers warm
gcloud run deploy api-service \
  --image gcr.io/project/api:latest \
  --min-instances 2 \
  --max-instances 100 \
  --region us-central1 \
  --platform managed
```

## Explanation

- **Cold start phases**: a cold start consists of three phases — environment creation (VPC, container), runtime initialization (JVM, Python interpreter), and code initialization (import modules, create clients). The largest gains come from optimizing the last two phases, as environment creation is controlled by the provider.
- **Provisioned concurrency**: AWS Lambda's provisioned concurrency pre-initializes a fixed number of execution environments. These environments are warm and ready to respond immediately. You pay for the provisioned capacity regardless of request volume. Use it for predictable high-traffic endpoints, not sporadic workloads.
- **SnapStart**: AWS Lambda SnapStart for Java takes a snapshot of a fully initialized function after the init phase. Subsequent cold starts restore from this snapshot instead of re-running initialization. This reduces Java cold starts from 3-6 seconds to under 200ms.
- **Lazy loading**: initialize heavy resources only when needed. If a function handles 10 different endpoints but each invocation only uses one, loading all 10 dependencies upfront wastes initialization time. Use lazy singletons that create clients on first access.

## Variants

| Strategy | Cost impact | Cold start reduction | Complexity | Best for |
|----------|------------|---------------------|------------|----------|
| Provisioned concurrency | High (always-on) | Near zero | Low | Critical APIs |
| SnapStart (Java) | None | 80-90% | Low | Java functions |
| Min instances (Cloud Run) | Medium | Near zero | Low | Container workloads |
| Lazy initialization | None | 30-50% | Medium | Multi-purpose functions |
| Dependency trimming | None | 20-40% | Medium | All runtimes |

## Best practices

- **Choose the right runtime**: compiled languages (Go, Rust) cold-start in milliseconds. Java and .NET cold-start in seconds unless using SnapStart or Native AOT. Python and Node.js are in the middle. For latency-critical paths, prefer compiled runtimes.
- **Keep deployment packages small**: every dependency adds initialization time. Audit your `node_modules` or `requirements.txt`. Remove dev dependencies, unused SDK features, and bloated libraries. A 50MB package initializes faster than a 250MB package.
- **Move initialization out of the handler**: code at the top level of your module runs once per cold start. Code inside the handler runs on every invocation. Initialize databases, clients, and configuration at the module level. Use the handler only for request-specific logic.
- **Use execution environment reuse**: after a cold start, Lambda containers are reused for subsequent warm invocations. Cache connections, compiled regexes, and parsed configuration in global scope. This free cache persists across hundreds of warm invocations.
- **Ping functions to keep warm**: for functions that cannot use provisioned concurrency, schedule a CloudWatch EventBridge rule or Cloud Scheduler to ping the function every 5 minutes. This is a crude but effective workaround for low-traffic endpoints.

## Common mistakes

- **Initializing inside the handler**: creating a new database connection on every invocation destroys performance. A connection pool created inside the handler is discarded after each warm invocation. Move client initialization to the module level.
- **Over-provisioning to eliminate all cold starts**: provisioned concurrency is expensive. If your traffic is bursty or low-volume, the cost of keeping environments warm exceeds the value of eliminated cold starts. Use it selectively for your top 3-5 latency-critical endpoints.
- **Ignoring VPC cold starts**: functions inside a VPC must initialize an Elastic Network Interface (ENI), adding 5-15 seconds to cold starts. Use VPC Lattice, PrivateLink, or move the function outside the VPC if it does not need direct database access.
- **Bloated dependencies**: importing a full AWS SDK for a single S3 call loads hundreds of unnecessary modules. Use modular SDKs (`@aws-sdk/client-s3` instead of `aws-sdk`) or HTTP clients with hand-crafted requests.

## FAQ

**Q: Can I completely eliminate cold starts?**
A: Only with always-on instances (provisioned concurrency, minimum instances). True serverless pay-per-request pricing inherently includes cold starts as a trade-off. For true zero cold start, use containers with minimum replicas or dedicated servers.

**Q: Why does Java have worse cold starts than Python?**
A: Java must initialize the JVM, load classes, and JIT-compile bytecode. Python loads and interprets source files sequentially. JVM startup is inherently heavier, though GraalVM Native Image and Lambda SnapStart close the gap significantly.

**Q: Does memory size affect cold start time?**
A: Yes. Lambda allocates CPU proportionally to memory. A 3GB function gets 3x the CPU of a 1GB function. Initialization (module loading, client creation) runs faster with more memory. Increasing memory from 128MB to 512MB often reduces cold start latency by 50%.

**Q: Should I use SnapStart or provisioned concurrency for Java?**
A: SnapStart is cheaper and sufficient for most Java use cases. Provisioned concurrency is for sub-100ms requirements where even SnapStart's 100-200ms is unacceptable. Start with SnapStart, upgrade to provisioned concurrency only if latency SLAs require it.

