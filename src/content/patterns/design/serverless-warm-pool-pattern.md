---



contentType: patterns
slug: serverless-warm-pool-pattern
title: "Serverless Warm Pool Pattern"
description: "Keep Lambda functions warm by sending periodic ping events to reduce cold start latency for latency-sensitive workloads."
metaDescription: "Serverless warm pool pattern: send periodic ping events to Lambda to reduce cold start latency. Implement with EventBridge Scheduler and Python examples."
difficulty: intermediate
topics:
  - serverless
  - design
tags:
  - serverless
  - warm-pool
  - cold-start
  - pattern
  - lambda
  - eventbridge
  - performance
  - python
  - typescript
relatedResources:
  - /patterns/serverless-throttling-pattern
  - /patterns/serverless-function-composition-pattern
  - /recipes/aws-lambda-cold-start-optimization
  - /patterns/serverless-db-connection-pooling-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Serverless warm pool pattern: send periodic ping events to Lambda to reduce cold start latency. Implement with EventBridge Scheduler and Python examples."
  keywords:
    - serverless warm pool
    - lambda cold start
    - lambda warmup
    - eventbridge scheduler
    - provisioned concurrency
    - lambda ping keep warm



---

# Serverless Warm Pool Pattern

## Overview

A cold start occurs when Lambda creates a new execution environment for a function that has no warm instances. The initialization adds latency: downloading code, starting the runtime, loading dependencies. Cold starts typically add 500ms to 5s depending on runtime and package size.

The warm pool pattern sends periodic lightweight ping events to keep execution environments alive. Lambda reuses warm environments for subsequent invocations, avoiding cold start latency. This is useful for latency-sensitive APIs where a 2-second cold start is unacceptable.

AWS also offers provisioned concurrency, which keeps a pre-defined number of environments warm. The warm pool pattern is a lighter-weight alternative: it uses scheduled pings instead of paying for always-warm instances.

## When to Use

- Latency-sensitive APIs where cold start latency degrades user experience
- Functions with heavy initialization (large dependencies, database connection pools)
- You want to reduce cold starts without paying for provisioned concurrency
- Traffic is sporadic: bursts followed by idle periods where environments would otherwise expire
- You need predictable response times for SLA compliance

## Solution

### Strategy 1: EventBridge Scheduler Ping (Python CDK)

```python
from aws_cdk import (
    Stack,
    Duration,
    aws_lambda as lambda_,
    aws_events as events,
    aws_events_targets as targets,
)
from constructs import Construct

class WarmPoolStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # The function to keep warm
        api_function = lambda_.Function(self, "ApiFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="api.handler",
            code=lambda_.Code.from_asset("lambda/api"),
            timeout=Duration.seconds(30),
            reserved_concurrent_executions=5,  # Limit warm pool size
        )

        # Warmup function that sends pings
        warmup_function = lambda_.Function(self, "WarmupFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="warmup.handler",
            code=lambda_.Code.from_asset("lambda/warmup"),
            timeout=Duration.seconds(30),
        )

        # Grant warmup function permission to invoke API function
        api_function.grant_invoke(warmup_function)

        # Schedule warmup every 5 minutes
        warmup_rule = events.Rule(self, "WarmupSchedule",
            schedule=events.Schedule.rate(Duration.minutes(5)),
        )
        warmup_rule.add_target(targets.LambdaFunction(warmup_function))

        # Pass the API function name as environment variable
        warmup_function.add_environment("TARGET_FUNCTION", api_function.function_name)
        warmup_function.add_environment("WARM_COUNT", "5")
```

### Warmup Lambda Handler (Python)

```python
import boto3
import json
import os

lambda_client = boto3.client('lambda')
TARGET_FUNCTION = os.environ['TARGET_FUNCTION']
WARM_COUNT = int(os.environ.get('WARM_COUNT', '5'))

def handler(event, context):
    # Send concurrent ping invocations to warm multiple environments
    import concurrent.futures

    def send_ping(instance_id: int) -> dict:
        response = lambda_client.invoke(
            FunctionName=TARGET_FUNCTION,
            InvocationType='Event',  # Async invocation
            Payload=json.dumps({
                "source": "warmup.ping",
                "instanceId": instance_id,
                "isWarmup": True,
            }),
        )
        return {"instanceId": instance_id, "status": response['StatusCode']}

    with concurrent.futures.ThreadPoolExecutor(max_workers=WARM_COUNT) as executor:
        results = list(executor.map(send_ping, range(WARM_COUNT)))

    return {
        "warmedInstances": len(results),
        "targetFunction": TARGET_FUNCTION,
    }
```

### API Function with Warmup Detection (Python)

```python
import json

def handler(event, context):
    # Detect warmup ping and return immediately
    if isinstance(event, dict) and event.get("isWarmup"):
        return {"status": "warm", "instanceId": event.get("instanceId")}

    # Real request processing
    http_method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    # Heavy initialization happens here (loaded once, reused for warm invocations)
    # Dependencies, DB connections, etc.

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Request processed", "path": path}),
    }
```

### Strategy 2: Provisioned Concurrency (CDK)

```python
from aws_cdk import (
    Stack,
    Duration,
    aws_lambda as lambda_,
)
from constructs import Construct

class ProvisionedConcurrencyStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Lambda with alias and provisioned concurrency
        function = lambda_.Function(self, "ApiFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="api.handler",
            code=lambda_.Code.from_asset("lambda/api"),
            timeout=Duration.seconds(30),
        )

        # Create an alias for the current version
        alias = lambda_.Alias(self, "LiveAlias",
            alias_name="live",
            version=function.current_version,
            provisioned_concurrent_executions=10,  # Always 10 warm instances
        )
```

### TypeScript Warmup Handler

```typescript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

const TARGET_FUNCTION = process.env.TARGET_FUNCTION!;
const WARM_COUNT = parseInt(process.env.WARM_COUNT || '5');

export const handler = async (): Promise<{ warmedInstances: number }> => {
  const promises = Array.from({ length: WARM_COUNT }, (_, i) =>
    lambdaClient.send(new InvokeCommand({
      FunctionName: TARGET_FUNCTION,
      InvocationType: 'Event',  // Async
      Payload: JSON.stringify({
        source: 'warmup.ping',
        instanceId: i,
        isWarmup: true,
      }),
    }))
  );

  const results = await Promise.all(promises);

  return {
    warmedInstances: results.length,
  };
};
```

### API Handler with Warmup Check (TypeScript)

```typescript
interface WarmupEvent {
  source: string;
  instanceId: number;
  isWarmup: boolean;
}

interface ApiEvent {
  httpMethod: string;
  path: string;
  body?: string;
}

export const handler = async (event: WarmupEvent | ApiEvent): Promise<any> => {
  // Detect warmup ping
  if ('isWarmup' in event && event.isWarmup) {
    return { status: 'warm', instanceId: event.instanceId };
  }

  // Real request processing
  const { httpMethod, path } = event as ApiEvent;

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Request processed', path }),
  };
};
```

## Explanation

Lambda reuses execution environments between invocations. After an invocation completes, the environment stays warm for a few minutes (typically 5-15 minutes, varies). If a new invocation arrives within that window, Lambda reuses the warm environment, skipping initialization.

The warm pool pattern exploits this by sending periodic pings. Each ping invokes the function with a special payload (`isWarmup: true`). The function detects the warmup event and returns immediately without doing real work. This keeps the environment alive.

The number of concurrent pings determines the warm pool size. If you send 5 concurrent pings, Lambda creates 5 warm environments. Subsequent real requests are distributed across these warm environments.

Provisioned concurrency is the managed alternative. AWS keeps a specified number of environments always warm, regardless of traffic. It costs more but provides guaranteed warm capacity without the need for ping events.

## Variants

| Approach | Mechanism | Cost | Best For |
|----------|-----------|------|----------|
| EventBridge ping | Scheduled Lambda invokes target | Low (only invocation cost) | Sporadic traffic, cost-sensitive |
| Provisioned concurrency | AWS-managed warm instances | Higher (pay for reserved) | Predictable traffic, SLA-bound |
| CloudWatch alarm ping | Alarm triggers warmup on traffic spike | Low | Reactive warmup before burst |
| Self-ping (recursive) | Function schedules its next ping | Low | Single-function warmup |
| API Gateway warmup | Endpoint that triggers warmup on first request | Low | On-demand warmup |

## Best Practices


- For a deeper guide, see [Serverless Event Sourcing Pattern](/patterns/serverless-event-sourcing-pattern/).

- **Set the ping interval to 3-5 minutes** — Lambda environments expire after 5-15 minutes of inactivity. Ping every 5 minutes to keep environments warm. Pinging more frequently wastes invocations.
- **Use async invocations for pings** — set `InvocationType: 'Event'` so the warmup function does not wait for the target to respond. This reduces warmup function execution time and cost.
- **Detect and skip warmup events in the target** — check for `isWarmup: true` at the top of the handler and return immediately. Do not execute business logic for warmup pings.
- **Match warm count to expected concurrency** — if your API typically handles 10 concurrent requests, warm 10 instances. Warming more than needed wastes money; warming fewer leaves cold starts.
- **Consider provisioned concurrency for production** — provisioned concurrency is more reliable than pings. If cold starts are unacceptable, pay for provisioned concurrency and use pings as a fallback.

## Common Mistakes

- **Pinging too frequently** — pinging every minute wastes invocations. Lambda environments stay warm for several minutes. Ping every 5 minutes.
- **Not detecting warmup events** — if the target function processes warmup pings as real requests, it may trigger side effects (database writes, API calls). Always check for `isWarmup` first.
- **Warming only one instance** — a single ping keeps one environment warm. If traffic requires 10 concurrent instances, send 10 concurrent pings.
- **Using warm pool for low-traffic functions** — if the function is rarely invoked, the warmup cost exceeds the cold start cost. Only warm functions with frequent, latency-sensitive traffic.
- **Ignoring provisioned concurrency** — for production APIs with strict SLAs, provisioned concurrency is more reliable. Pings can miss the window if traffic arrives between pings.

## Frequently Asked Questions

### How long does a Lambda environment stay warm?

Lambda does not document the exact duration. It varies from 5 to 15 minutes depending on region, runtime, and AWS capacity. In practice, pinging every 5 minutes keeps environments warm reliably.

### What is the difference between warm pool and provisioned concurrency?

Warm pool sends periodic pings to keep environments alive between traffic bursts. Provisioned concurrency keeps a fixed number of environments always warm, managed by AWS. Provisioned concurrency is more reliable but costs more. Warm pool is cheaper but not guaranteed.

### Does warming work for all runtimes?

Yes, but the benefit varies. Java and .NET have the longest cold starts (2-10 seconds) and benefit most. Python and Node.js have shorter cold starts (200-500ms) and benefit less. For Java, consider provisioned concurrency instead of pings.

### Can I eliminate cold starts entirely?

No. Warm pool and provisioned concurrency reduce cold starts but do not eliminate them. If traffic exceeds the warm pool size, new environments are created with cold starts. Scale the warm count or provisioned concurrency to match expected peak concurrency.

### How much does the warm pool pattern cost?

Each ping is one Lambda invocation. At 5-minute intervals with 5 concurrent pings, that is 5 invocations every 5 minutes = 1,440 invocations per day. At $0.20 per million invocations, the cost is negligible. The main cost is the compute time for each ping invocation.
