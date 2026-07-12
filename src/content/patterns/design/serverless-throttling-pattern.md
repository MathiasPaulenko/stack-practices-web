---




contentType: patterns
slug: serverless-throttling-pattern
title: "Serverless Throttling Pattern"
description: "Handle backpressure in serverless by using SQS, token buckets, and concurrency limits to protect downstream services from burst traffic."
metaDescription: "Serverless throttling: handle backpressure with SQS, token buckets, and Lambda concurrency limits. Protect downstream services from burst traffic."
difficulty: advanced
topics:
  - serverless
  - design
tags:
  - serverless
  - throttling
  - backpressure
  - pattern
  - sqs
  - rate-limiting
  - concurrency
  - python
  - typescript
relatedResources:
  - /patterns/serverless-fanout-pattern
  - /patterns/serverless-function-composition-pattern
  - /patterns/priority-queue-pattern
  - /patterns/serverless-db-connection-pooling-pattern
  - /patterns/serverless-warm-pool-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Serverless throttling: handle backpressure with SQS, token buckets, and Lambda concurrency limits. Protect downstream services from burst traffic."
  keywords:
    - serverless throttling
    - lambda backpressure
    - sqs rate limiting
    - lambda concurrency limits
    - token bucket serverless
    - serverless rate control




---

# Serverless Throttling Pattern

## Overview

Serverless functions scale automatically, but downstream services (databases, APIs) often cannot handle the burst traffic that Lambda concurrency produces. The throttling pattern controls the rate at which Lambda functions process events, protecting downstream systems from overload.

Three main approaches: SQS with controlled batch processing, reserved concurrency limits, and token bucket rate limiting. Each controls throughput at a different level: queue-based throttling smooths traffic over time, reserved concurrency caps parallel executions, and token buckets enforce a precise request rate.

## When to Use

- Lambda bursts overwhelm downstream databases or APIs with connection limits
- You need to maintain a specific request rate to a third-party API with rate limits
- Traffic spikes cause downstream timeouts or connection pool exhaustion
- You want to process messages at a controlled pace rather than as fast as possible
- Multiple Lambda functions compete for a shared downstream resource

## Solution

### Strategy 1: SQS with Controlled Batch Processing (Python)

```python
import boto3
import json
import time

sqs = boto3.client('sqs')
QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/order-queue"

def handler(event, context):
    # Process messages in small batches with deliberate pacing
    batch_size = 5
    processed = 0

    for record in event["Records"]:
        message = json.loads(record["body"])

        try:
            process_order(message)
            processed += 1
        except Exception as e:
            # Return message to queue for retry
            raise e

    return {"processed": processed}

def process_order(order: dict):
    # Simulate downstream API call with rate limit awareness
    api_client.post("/orders", json=order)
```

### CDK: SQS with Visibility Timeout and Batch Size

```python
from aws_cdk import (
    Stack,
    aws_sqs as sqs,
    aws_lambda as lambda_,
    aws_lambda_event_sources as events,
    Duration,
)
from constructs import Construct

class ThrottledConsumerStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Queue with long visibility timeout to prevent concurrent processing
        queue = sqs.Queue(self, "ThrottledQueue",
            visibility_timeout=Duration.seconds(300),
            receive_message_wait_time=Duration.seconds(20),  # Long polling
        )

        # Dead-letter queue for failed messages
        dlq = sqs.Queue(self, "DeadLetterQueue",
            retention_period=Duration.days(14),
        )

        # Consumer Lambda with limited concurrency
        consumer = lambda_.Function(self, "ThrottledConsumer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset("lambda/consumer"),
            timeout=Duration.seconds(60),
            reserved_concurrent_executions=10,  # Cap parallelism
        )

        # Small batch size to control throughput
        consumer.add_event_source(events.SqsEventSource(
            queue,
            batch_size=5,
            max_batching_window=Duration.seconds(30),
            report_batch_item_failures=True,
        ))

        # DLQ subscription
        queue.add_to_dead_letter_queue(
            max_receive_count=5,
            dead_letter_queue=dlq,
        )
```

### Strategy 2: Token Bucket Rate Limiter (TypeScript)

```typescript
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient({ region: 'us-east-1' });

class TokenBucket {
  private tableName = 'rate_limits';
  private capacity: number;
  private refillRate: number;  // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
  }

  async allowRequest(bucketKey: string, tokens = 1): Promise<boolean> {
    const now = Date.now();

    // Get current bucket state
    const getResponse = await ddb.send(new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ bucketKey }),
    }));

    let tokensAvailable = this.capacity;
    let lastRefill = now;

    if (getResponse.Item) {
      const bucket = unmarshall(getResponse.Item);
      tokensAvailable = parseFloat(bucket.tokens);
      lastRefill = parseInt(bucket.lastRefill);

      // Refill tokens based on elapsed time
      const elapsedSeconds = (now - lastRefill) / 1000;
      const refilled = elapsedSeconds * this.refillRate;
      tokensAvailable = Math.min(this.capacity, tokensAvailable + refilled);
    }

    if (tokensAvailable < tokens) {
      return false;  // Rate limit exceeded
    }

    // Consume tokens
    tokensAvailable -= tokens;

    await ddb.send(new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ bucketKey }),
      UpdateExpression: 'SET tokens = :t, lastRefill = :r',
      ExpressionAttributeValues: marshall({
        ':t': tokensAvailable.toFixed(2),
        ':r': now.toString(),
      }),
    }));

    return true;
  }
}

// Usage in Lambda handler
const rateLimiter = new TokenBucket(100, 10);  // 100 tokens, 10/sec refill

export const handler = async (event: any): Promise<{ statusCode: number }> => {
  const apiKey = event.requestContext.identity.apiId;

  const allowed = await rateLimiter.allowRequest(apiKey);
  if (!allowed) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Rate limit exceeded' }),
    };
  }

  // Process request
  return { statusCode: 200 };
};
```

### Strategy 3: Reserved Concurrency + SQS (Python)

```python
import boto3
import json
import os

sqs = boto3.client('sqs')
QUEUE_URL = os.environ["QUEUE_URL"]

def handler(event, context):
    failed_records = []

    for record in event["Records"]:
        try:
            message = json.loads(record["body"])
            process_with_rate_limit(message)
        except Exception as e:
            # Report individual failure for partial batch retry
            failed_records.append({
                "itemIdentifier": record["messageId"]
            })

    if failed_records:
        return {
            "batchItemFailures": failed_records
        }

    return {"batchItemFailures": []}

def process_with_rate_limit(message: dict):
    # Check downstream capacity before processing
    if not check_downstream_capacity():
        raise Exception("Downstream capacity exceeded")

    # Process with timeout
    api_client.post("/process", json=message, timeout=10)

def check_downstream_capacity() -> bool:
    # Query downstream health endpoint
    response = api_client.get("/health")
    return response.status_code == 200 and response.json()["capacity"] > 0
```

## Explanation

Each throttling strategy controls throughput at a different level:

- **SQS batch control** — the queue buffers incoming traffic. Lambda processes small batches (5-10 messages) with a batching window (30s). This smooths bursts: messages wait in the queue instead of hitting downstream all at once. The visibility timeout prevents duplicate processing during long-running invocations.

- **Reserved concurrency** — AWS caps the number of concurrent Lambda executions. Setting `reserved_concurrent_executions=10` means at most 10 instances run simultaneously. Excess invocations queue up. This directly limits parallel load on downstream systems.

- **Token bucket** — a DynamoDB-backed counter tracks available tokens. Each request consumes a token. Tokens refill at a fixed rate. If no tokens are available, the request is rejected with 429. This enforces a precise request rate regardless of Lambda concurrency.

## Variants

| Approach | Control Level | Best For |
|----------|--------------|----------|
| SQS batch + batching window | Queue-level | Smoothing traffic bursts |
| Reserved concurrency | Execution-level | Capping parallel invocations |
| Token bucket (DynamoDB) | Request-level | Precise rate per API key |
| Leaky bucket | Request-level | Strict rate with no bursts |
| Circuit breaker | Downstream-level | Protecting failing services |
| Semaphore (in-function) | Instance-level | Limiting concurrent async calls |

## Best Practices


- For a deeper guide, see [Serverless Fanout Pattern](/patterns/serverless-fanout-pattern/).

- **Combine SQS with reserved concurrency** — SQS buffers traffic; reserved concurrency caps parallelism. Together they provide both smoothing and hard limits.
- **Use partial batch failure reporting** — when one message in a batch fails, return only that message ID in `batchItemFailures`. SQS re-delivers only the failed message, not the entire batch.
- **Set visibility timeout to 6x Lambda timeout** — prevents redelivery while a long-running invocation is still processing.
- **Monitor Throttles metric** — if Lambda throttles frequently, increase reserved concurrency or scale downstream capacity. Throttles mean lost invocations.
- **Use long polling** — set `receive_message_wait_time` to 20 seconds. This reduces empty receives and lowers SQS API costs.

## Common Mistakes

- **No reserved concurrency** — without a cap, Lambda scales to thousands of concurrent executions, overwhelming downstream databases. Always set reserved concurrency for functions that call downstream services.
- **Batch size too large** — processing 100 messages at once increases the chance of partial failures and long-running invocations. Use 5-10 for most workloads.
- **No visibility timeout** — without a visibility timeout, SQS redelivers messages while Lambda is still processing them, causing duplicates. Set it to 6x the Lambda timeout.
- **Ignoring downstream capacity** — throttling at the Lambda level does not help if the downstream service has its own connection limits. Monitor downstream health and adjust concurrency accordingly.
- **Not handling 429 from downstream** — when a downstream API returns 429, the Lambda should retry with backoff or fail the message for later reprocessing, not crash.

## Frequently Asked Questions

### What is the difference between throttling and rate limiting?

Throttling controls the rate of processing to protect downstream systems. Rate limiting rejects requests that exceed a defined rate. Throttling smooths traffic; rate limiting drops excess traffic. In serverless, SQS-based throttling smooths, and token bucket rate limiting drops.

### How do I choose the right reserved concurrency value?

Start with the downstream service's connection pool size. If your database supports 50 connections and each Lambda uses 1 connection, set reserved concurrency to 50. Monitor downstream latency and adjust. If latency increases, reduce concurrency.

### Can I use API Gateway throttling instead of Lambda throttling?

Yes. API Gateway supports usage plans with rate and burst limits. This throttles at the API level before Lambda is invoked. Use API Gateway throttling for public APIs. Use Lambda reserved concurrency for internal event-driven functions.

### What happens when Lambda is throttled?

For synchronous invocations (API Gateway), the caller receives a 429 error. For asynchronous invocations (SNS, EventBridge), the event is retried with exponential backoff. For SQS-triggered functions, the message stays in the queue and is retried on the next poll. Configure DLQs for all cases.
