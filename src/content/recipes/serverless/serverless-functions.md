---


contentType: recipes
slug: serverless-functions
title: "Build Serverless Functions"
description: "Create and deploy serverless functions with AWS Lambda, Google Cloud Functions, and Azure Functions for event-driven, pay-per-use compute."
metaDescription: "Build serverless functions with AWS Lambda, Cloud Functions, and Azure. Event-driven triggers, cold start optimization, and deployment strategies with examples."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - lambda
  - aws-lambda
  - functions
  - faas
relatedResources:
  - /guides/event-driven-architecture-guide
  - /guides/software-architecture-guide
  - /patterns/observer-pattern
  - /recipes/event-sourcing-serverless
  - /recipes/cold-start-optimization
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build serverless functions with AWS Lambda, Cloud Functions, and Azure. Event-driven triggers, cold start optimization, and deployment strategies with examples."
  keywords:
    - serverless
    - lambda
    - cloud-functions
    - azure-functions
    - faas
    - event-driven


---
# Build Serverless Functions

## Overview

Serverless computing lets you run code without provisioning or managing servers. You write functions, upload them to a cloud provider, and the platform handles scaling, patching, and availability automatically. You pay only for execution time — making it ideal for sporadic workloads and event-driven architectures.

Below is a practical approach to creating and deploying serverless functions with AWS Lambda, Google Cloud Functions, and Azure Functions.

## When to Use

Use this resource when:
- You have event-driven workloads (webhooks, file processing, scheduled jobs). See [Event-Driven Functions](/recipes/messaging/event-driven-microservices) for event-driven patterns.
- You want automatic scaling from zero to thousands of requests. See [Cold Start Optimization](/recipes/performance/connection-pooling) for minimizing startup latency.
- You need to avoid server maintenance and infrastructure overhead
- Your traffic is sporadic and provisioning servers would be wasteful. See [Serverless API Gateway](/recipes/api/nginx-reverse-proxy) for building pay-per-use APIs.

## Solution

### Python (AWS Lambda)

```python
import json
import boto3

def handler(event, context):
    # Extract query parameter
    name = event.get("queryStringParameters", {}).get("name", "World")

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": f"Hello, {name}!"})
    }
```

### JavaScript (Google Cloud Functions)

```javascript
const functions = require('@google-cloud/functions-framework');

functions.http('helloHttp', (req, res) => {
  const name = req.query.name || 'World';
  res.json({ message: `Hello, ${name}!` });
});
```

### Java (Azure Functions)

```java
import com.microsoft.azure.functions.*;
import java.util.Optional;

public class HelloFunction {
    @FunctionName("hello")
    public HttpResponseMessage run(
        @HttpTrigger(name = "req", methods = {HttpMethod.GET}, authLevel = AuthorizationLevel.ANONYMOUS)
        HttpRequestMessage<Optional<String>> request,
        final ExecutionContext context) {

        String name = request.getQueryParameters().getOrDefault("name", "World");
        return request.createResponseBuilder(HttpStatus.OK)
            .body("Hello, " + name + "!")
            .build();
    }
}
```

## Explanation

Serverless platforms abstract infrastructure management:
- **Event triggers**: HTTP requests, file uploads, database changes, timers
- **Automatic scaling**: Each invocation runs in a fresh container; platforms scale containers up and down
- **Pay-per-use**: Billed by milliseconds of execution and number of invocations

Cold starts occur when a function hasn't been invoked recently. The platform must initialize a new container, adding latency (100ms–3s depending on runtime and memory allocation).

## Variants

| Platform | Runtime | Trigger Types | Cold Start |
|----------|---------|---------------|------------|
| AWS Lambda | Python, Node, Java, Go, Ruby | HTTP, S3, SNS, SQS, EventBridge, Cron | 100ms–1s |
| Cloud Functions | Node, Python, Go, Java | HTTP, Pub/Sub, Storage, Firestore, Cron | 200ms–2s |
| Azure Functions | Node, Python, Java, C# | HTTP, Blob, Queue, Event Grid, Timer | 200ms–3s |

## What Works

- **Keep functions small and focused**: One function per responsibility; compose complex workflows with step functions
- **Minimize deployment package size**: Remove unnecessary dependencies to reduce cold start time
- **Use provisioned concurrency for latency-sensitive workloads**: Pre-warm containers for critical paths
- **Store state externally**: Functions are stateless; use DynamoDB, Redis, or Cloud Firestore for persistence
- **Set memory and timeout limits appropriately**: Undersized memory causes OOM; oversized wastes money

## Common Mistakes

- **Storing state in the function container**: Local variables are lost between invocations; containers may be reused, but never depend on it
- **Ignoring cold starts**: User-facing synchronous APIs suffer from cold start latency
- **Over-provisioning memory**: Lambda allocates CPU proportionally to memory; find the sweet spot
- **Not handling partial failures**: Batch processing must handle retries without duplicating work
- **Tight coupling to one vendor**: Use abstraction layers (Serverless Framework, SAM) for portability

## Advanced: Cold Start Mitigation

```python
# AWS Lambda: initialize outside handler for connection reuse
import json
import boto3

# These run on cold start only — reused across invocations
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('users')
http_session = requests.Session()

def handler(event, context):
    # Handler stays thin — connections are already warm
    user_id = event['pathParameters']['id']
    response = table.get_item(Key={'id': user_id})
    return {
        'statusCode': 200,
        'body': json.dumps(response.get('Item', {}))
    }
```

Initialize database connections, HTTP clients, and heavy imports outside the handler function. The platform reuses the container across invocations, so these initializations run once on cold start and persist. Keep the handler body minimal — just process the event and return.

## Advanced: Step Functions Orchestration

```json
{
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ValidateOrder",
      "Next": "CheckInventory"
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:CheckInventory",
      "Next": "ProcessPayment"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ProcessPayment",
      "End": true
    }
  }
}
```

Step Functions chain Lambda invocations with built-in retries, error handling, and state management. Each step is independently retryable. Use Choice states for conditional branching, Parallel states for concurrent execution, and Map states for fan-out patterns.

## Advanced: Provisioned Concurrency

```bash
# AWS CLI: configure provisioned concurrency
aws lambda put-provisioned-concurrency-config \
  --function-name my-api \
  --qualifier production \
  --provisioned-concurrent-executions 10
```

Provisioned concurrency keeps execution environments warm and ready to respond. Configure it for latency-sensitive endpoints where cold starts are unacceptable. Monitor utilization — if provisioned capacity sits idle, reduce it. For spiky traffic, combine provisioned concurrency with on-demand scaling.

## Advanced: Event-Driven Architecture

```python
import json
import boto3

s3 = boto3.client('s3')
sns = boto3.client('sns')

def handler(event, context):
    # Triggered by S3 upload
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Process uploaded file
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')

        # Publish result to SNS
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123:processing-complete',
            Message=json.dumps({
                'file': key,
                'size': len(content),
                'lines': content.count('\n')
            })
        )

    return {'statusCode': 200, 'body': json.dumps({'processed': len(event['Records'])})}
```

Event-driven functions respond to cloud events: S3 uploads, DynamoDB streams, SQS messages, SNS notifications, or EventBridge schedules. Each event contains records that your handler processes independently. Design handlers to be idempotent because event sources may deliver duplicates. Use partial batch responses (Lambda) to report which records succeeded and which should be retried.

## Advanced: Local Development

```yaml
# template.yaml — AWS SAM local development
Resources:
  ProcessUpload:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: python3.11
      Events:
        Upload:
          Type: S3
          Properties:
            Bucket: uploads
            Events: s3:ObjectCreated:*

# Run locally:
# sam local start-api
# sam local invoke ProcessUpload --event events/s3-upload.json
# sam local generate-event s3 --bucket uploads --key data.csv > events/s3-upload.json
```

AWS SAM CLI, Azure Functions Core Tools, and Google Cloud Functions Emulator provide local execution environments. Generate sample events with `sam local generate-event` to test handler logic without deploying. Use `sam local start-api` to test HTTP-triggered functions with curl or Postman. Always run a final integration test in the cloud — local emulators don't replicate all platform behaviors.

## When to Avoid

- **Long-running computations**: Tasks exceeding 15 minutes (Lambda) need container-based compute (ECS, Cloud Run, EKS)
- **Stateful applications**: Real-time games, WebSocket servers, or streaming services need persistent connections
- **High-frequency invocations**: If your function runs 1000+ times per second, a always-on server may be cheaper
- **Complex dependencies**: Large native libraries or custom runtimes increase cold start and deployment complexity

## Frequently Asked Questions

**Q: How do I reduce cold start latency?**
A: Use smaller runtimes (Node.js, Python) over Java. Reduce package size. Use provisioned concurrency. Keep connections (database, HTTP) warm between invocations by initializing outside the handler.

**Q: Can serverless functions handle long-running tasks?**
A: AWS Lambda max is 15 minutes, Cloud Functions 60 minutes, Azure Functions configurable. For longer tasks, use step functions to orchestrate multiple short functions or move to container-based compute (ECS, Cloud Run).

**Q: How do I debug serverless functions locally?**
A: AWS SAM CLI, Azure Functions Core Tools, and Functions Framework for Node.js all provide local emulators. Test locally, but always validate in the cloud since behavior can differ.

### How do I monitor serverless functions in production?

Use structured JSON logging (CloudWatch Logs, Stackdriver). Track invocation count, duration, error rate, and cold start percentage. Set alarms on error rate and duration p99. Use distributed tracing (AWS X-Ray, Cloud Trace) to visualize request flow across functions and downstream services.

### How do I handle retries and idempotency?

Design handlers to be idempotent — processing the same event twice should produce the same result. Use idempotency keys (e.g., event ID + timestamp) to deduplicate. Configure DLQs (Dead Letter Queues) for events that fail after max retries. For Lambda, set `MaximumRetryAttempts` and `DestinationConfig` for failed invocations.

### What is the cost model for serverless?

AWS Lambda charges per invocation ($0.20/million) and per GB-second of execution time. Cloud Functions and Azure Functions follow similar models. Factor in memory allocation, execution duration, and invocation count. For constant high traffic, serverless can cost more than always-on servers — benchmark both.

### How do I handle long-running tasks in serverless?

Use Step Functions or a queue-based pattern: Lambda writes the task to SQS, a worker Lambda processes it in chunks within the timeout, and writes progress to DynamoDB. For tasks over 15 minutes, use Fargate or Cloud Run instead of Lambda. Break work into batches and process them in parallel with Lambda fan-out via SNS or EventBridge.

### What is the difference between Lambda layers and containers?

Lambda layers are shared code packages (up to 5 per function) that reduce deployment package size. Container images (up to 10GB) package everything including the runtime. Use layers for shared dependencies across functions. Use container images when your deployment package exceeds 250MB or you need custom runtimes.

### How do I share code between serverless functions?

Use Lambda layers for shared libraries and utilities. Alternatively, publish a shared npm package or Python package and include it in each function's deployment. For common patterns like error handling and logging, extract them into a layer that all functions import. Keep layers thin — large layers increase cold start time.

### Should I use API Gateway or direct Lambda invocation?

Use API Gateway for HTTP endpoints that need authentication, rate limiting, request validation, or custom domains. Use direct invocation (EventBridge, SQS, SNS) for internal service-to-service communication where you control both sides. API Gateway adds cost ($3.50/million requests) and latency (~10-30ms), so skip it for internal high-throughput calls.

### How do I manage environment variables across stages?

Use separate configuration files per stage (`serverless.dev.yml`, `serverless.prod.yml`) and reference them in your deployment command. Never hardcode secrets — use AWS Systems Manager Parameter Store or Secrets Manager. Lambda reads these at runtime via the function's execution role. For non-secret configs like API URLs, use environment variables set in the function configuration.
