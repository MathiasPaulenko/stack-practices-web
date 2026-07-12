---





contentType: guides
slug: serverless-architecture-guide
title: "Serverless Architecture — Patterns and Anti-Patterns"
description: "A practical guide to serverless architecture: function design, cold starts, event-driven patterns, state management, and common pitfalls with AWS Lambda, Azure Functions, and GCP Cloud Functions."
metaDescription: "Learn serverless architecture: function design, cold starts, event-driven patterns, state management. Practical guide with AWS Lambda, Azure, and GCP examples."
difficulty: intermediate
topics:
  - architecture
  - serverless
tags:
  - serverless
  - faas
  - lambda
  - azure-functions
  - cloud-functions
  - cold-start
  - event-driven
  - guide
relatedResources:
  - /guides/aws-basics-guide
  - /guides/azure-basics-guide
  - /guides/gcp-basics-guide
  - /recipes/aws-lambda-cold-start-optimization
  - /recipes/aws-lambda-python-dependencies
  - /recipes/azure-functions-python-http
  - /recipes/gcp-cloud-functions-nodejs
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn serverless architecture: function design, cold starts, event-driven patterns, state management. Practical guide with AWS Lambda, Azure, and GCP examples."
  keywords:
    - serverless
    - faas
    - lambda
    - azure-functions
    - cloud-functions
    - cold-start
    - event-driven
    - guide





---

## Overview

Serverless architecture lets you run code without provisioning or managing servers. The cloud provider handles infrastructure, scaling, and patching; you provide functions that execute in response to events. While serverless eliminates server management, it introduces new constraints: execution time limits, cold starts, statelessness, and distributed debugging. The following guide covers patterns that work and anti-patterns that cause pain.

## When to Use


- For alternatives, see [Complete Guide to Serverless Architecture](/guides/complete-guide-serverless-architecture/).

- Variable or unpredictable traffic (pay-per-execution saves money)
- Event-driven workflows (file uploads, database changes, scheduled tasks)
- Microservices with independent deployment cycles
- Prototypes and MVPs where speed matters more than optimization
- Processing pipelines that can be broken into discrete steps

## Core Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Function-per-HTTP-endpoint** | REST APIs | API Gateway → Lambda |
| **Event-driven function** | Async processing | S3 upload → Lambda thumbnail generator |
| **Scheduled function** | Cron jobs | CloudWatch Events → nightly report Lambda |
| **Queue-triggered function** | Decoupled workloads | SQS → Lambda order processor |
| **Stream-triggered function** | Real-time data | DynamoDB Streams → Lambda cache updater |

## Function Design — What Works

```python
# AWS Lambda handler — keep initialization outside handler for reuse
import boto3
import json

# Initialized once per container lifecycle
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ProcessedFiles')

def lambda_handler(event, context):
    # Handler runs on every invocation
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    
    # Process the file
    response = s3_client.get_object(Bucket=bucket, Key=key)
    content = response['Body'].read()
    
    # Store metadata
    table.put_item(Item={
        'fileId': key,
        'bucket': bucket,
        'size': len(content),
        'processedAt': context.aws_request_id
    })
    
    return {'statusCode': 200, 'body': json.dumps({'processed': key})}
```

```javascript
// Azure Function with HTTP trigger and dependency injection
const { app } = require('@azure/functions');

class OrderService {
    async createOrder(orderData) {
        // Business logic here
        return { id: crypto.randomUUID(), ...orderData };
    }
}

app.http('createOrder', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const orderData = await request.json();
        const service = new OrderService();
        const order = await service.createOrder(orderData);
        return { jsonBody: order, status: 201 };
    }
});
```

## Managing Cold Starts

| Strategy | Impact | Implementation |
|----------|--------|----------------|
| **Keep-alive (ping)** | Eliminates cold start | CloudWatch cron every 5 minutes |
| **Provisioned concurrency** | Pre-warmed instances | Lambda provisioned concurrency |
| **Minimize dependencies** | Faster initialization | Remove unused packages, tree-shake |
| **Use compiled languages** | Faster startup | Go, Rust, or .NET AOT compilation |
| **Connection pooling** | Reuse DB connections outside handler | Initialize clients globally |

## State Management

Serverless functions are stateless. Persist state externally:

```yaml
# AWS Step Functions — orchestrate stateful workflows
Comment: Order Processing Workflow
StartAt: ValidateOrder
States:
  ValidateOrder:
    Type: Task
    Resource: arn:aws:lambda:...:validate-order
    Next: ProcessPayment
  ProcessPayment:
    Type: Task
    Resource: arn:aws:lambda:...:process-payment
    Catch:
      - ErrorEquals: ["PaymentFailed"]
        ResultPath: "$.error"
        Next: NotifyFailure
    Next: NotifySuccess
```

## Common Mistakes

- **Monolithic Lambda** — putting an entire application in one function; break into single-purpose functions
- **Synchronous waiting** — calling slow services synchronously inside a function; use async patterns
- **Ignoring timeout limits** — Lambda has a 15-minute max; long jobs need ECS or Batch
- **Treating functions like servers** — storing state in memory or local disk
- **No retry strategy** — transient failures should be handled with dead-letter queues
- **Over-provisioned memory** — memory controls CPU; test to find the sweet spot

## FAQ

**Is serverless cheaper than containers?**
For intermittent or variable workloads, usually yes. For steady, high-throughput workloads, containers or EC2 are often more cost-effective.

**How do I debug serverless functions locally?**
Use SAM CLI (AWS), Azure Functions Core Tools, or Functions Framework (GCP). Each provides a local runtime that mimics the cloud environment.

**Can serverless handle long-running tasks?**
Standard functions have time limits (15 min Lambda, 10 min Azure). For longer tasks, use step functions, containerized jobs, or split the work into chunks.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: Image Processing Pipeline

```text
Architecture: S3 upload -> Lambda -> SQS -> Lambda -> DynamoDB
Platform: AWS
Volume: 10k images/day

Step 1: Image upload
  User uploads image to S3 bucket: uploads/originals/
  S3:ObjectCreated event triggers Lambda resize-function

Step 2: Lambda resize-function
  - Read image from S3
  - Generate 3 sizes: thumbnail (100x100), medium (500x500), large (1200x1200)
  - Upload versions to S3: uploads/resized/
  - Publish message to SQS: image-processed-queue
    Message: { "originalKey": "...", "thumbnailKey": "...", "mediumKey": "...", "largeKey": "..." }
  - Timeout: 30s (large image resize can take 10-15s)
  - Memory: 1024MB (needed for image processing)

Step 3: SQS -> Lambda metadata-function
  - Read message from SQS
  - Extract metadata: dimensions, format, size, hash
  - Store in DynamoDB table: ImageMetadata
    PK: imageId (generated uuid), SK: version (thumbnail|medium|large)
  - Delete message from SQS (successful processing)
  - If fails 3 times -> DLQ: image-processed-dlq

IaC configuration (Terraform):
  resource "aws_lambda_function" "resize" {
    function_name = "image-resize"
    handler       = "handler.lambda_handler"
    runtime       = "python3.11"
    memory_size   = 1024
    timeout       = 30
    reserved_concurrent_executions = 50
    environment {
      variables = {
        OUTPUT_BUCKET = "uploads-resized"
        QUEUE_URL     = aws_sqs_queue.image_processed.id
      }
    }
  }

  resource "aws_sqs_queue" "image_processed" {
    name              = "image-processed-queue"
    visibility_timeout = 60  # > lambda timeout
    redrive_policy = jsonencode({
      deadLetterTargetArn = aws_sqs_queue.dlq.arn
      maxReceiveCount     = 3
    })
  }

Monitoring:
  - CloudWatch Alarms: errors > 1%, duration p95 > 20s
  - DLQ alert: message in DLQ -> SNS -> Slack
  - X-Ray tracing to see latency per step

Estimated cost (10k images/day):
  Lambda: ~$15/month (1.5M invocations)
  S3: ~$2/month (storage)
  SQS: ~$0.40/month
  DynamoDB: ~$1.25/month (on-demand)
  Total: ~$19/month
```

### How do I handle distributed transactions in serverless?

Do not use distributed ACID transactions. Use the saga pattern: each function does its part and publishes an event. If a step fails, a compensating function undoes the previous work. On AWS, Step Functions orchestrates sagas with compensation states. Alternatively, use the outbox pattern: the function writes to the DB and publishes the event in the same transaction. A separate process reads the outbox and publishes events.

### How do I test serverless functions locally?

Use SAM CLI for AWS Lambda: `sam local invoke -e event.json`. For Azure, Azure Functions Core Tools: `func start`. Create test events in JSON that mimic real events (S3, SQS, API Gateway). For integration testing, use LocalStack which emulates AWS services locally. For CI, run tests in GitHub Actions with SAM CLI installed. Keep handler tests separate from business logic tests.













































End of document. Review and update quarterly.