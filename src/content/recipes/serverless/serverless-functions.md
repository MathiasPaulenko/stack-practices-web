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
relatedResources:
  - /guides/event-driven-architecture-guide
  - /guides/software-architecture-guide
  - /patterns/observer-pattern
lastUpdated: "2026-06-12"
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

This recipe covers creating and deploying serverless functions with AWS Lambda, Google Cloud Functions, and Azure Functions.

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

## Best Practices

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

## Frequently Asked Questions

**Q: How do I reduce cold start latency?**
A: Use smaller runtimes (Node.js, Python) over Java. Reduce package size. Use provisioned concurrency. Keep connections (database, HTTP) warm between invocations by initializing outside the handler.

**Q: Can serverless functions handle long-running tasks?**
A: AWS Lambda max is 15 minutes, Cloud Functions 60 minutes, Azure Functions configurable. For longer tasks, use step functions to orchestrate multiple short functions or move to container-based compute (ECS, Cloud Run).

**Q: How do I debug serverless functions locally?**
A: AWS SAM CLI, Azure Functions Core Tools, and Functions Framework for Node.js all provide local emulators. Test locally, but always validate in the cloud since behavior can differ.
