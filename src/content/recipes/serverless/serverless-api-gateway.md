---
contentType: recipes
slug: serverless-api-gateway
title: "Build Serverless APIs with API Gateway"
description: "How to design, deploy, and manage serverless HTTP APIs using AWS API Gateway, Lambda, and function-as-a-service patterns."
metaDescription: "Learn serverless API development with API Gateway and Lambda. Design REST APIs, handle routing, authentication, and deployment with infrastructure as code."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - api-gateway
  - aws
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn serverless API development with API Gateway and Lambda. Design REST APIs, handle routing, authentication, and deployment with infrastructure as code."
  keywords:
    - serverless api
    - api gateway
    - aws lambda
    - serverless architecture
    - faas
    - rest api serverless
    - lambda function
---

## Overview

Serverless computing allows you to run code without provisioning or managing servers. AWS Lambda executes your functions in response to events, and API Gateway provides the HTTP front door that routes requests to those functions. Together they form a pay-per-request, auto-scaling API platform that eliminates idle server costs.

This architecture is ideal for APIs with variable or unpredictable traffic. A startup might serve a hundred requests per day at launch and a million per day six months later — serverless handles both without capacity planning. The trade-off is cold start latency (the delay when a function wakes up after being idle) and vendor-specific tooling that can create lock-in.

## When to Use

Use this recipe when:

- Building APIs with sporadic or unpredictable traffic patterns. See [Rate Limiting](/recipes/api/rate-limiting) for protecting APIs under load.
- Prototyping products where server costs should scale to zero when idle
- Processing webhooks, file uploads, or scheduled events via HTTP. See [Input Validation](/recipes/api/input-validation) for validating incoming requests.
- Creating microservices where each endpoint has different resource needs
- Reducing operational overhead by eliminating server patching and scaling. See [Serverless Functions](/recipes/messaging/event-driven-microservices) for function deployment.

## Solution

### AWS Lambda Handler (Python)

```python
import json

def lambda_handler(event, context):
    # API Gateway passes HTTP data in the event object
    method = event['httpMethod']
    path = event['path']
    query = event.get('queryStringParameters', {})

    if method == 'GET' and path == '/users':
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'users': ['alice', 'bob']})
        }

    if method == 'POST' and path == '/users':
        body = json.loads(event['body'])
        return {
            'statusCode': 201,
            'body': json.dumps({'id': '123', 'name': body['name']})
        }

    return {'statusCode': 404, 'body': json.dumps({'error': 'Not found'})}
```

### AWS Lambda Handler (Node.js)

```javascript
exports.handler = async (event) => {
  const { httpMethod, path, body } = event;

  if (httpMethod === 'GET' && path === '/users') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: ['alice', 'bob'] })
    };
  }

  if (httpMethod === 'POST' && path === '/users') {
    const data = JSON.parse(body);
    return {
      statusCode: 201,
      body: JSON.stringify({ id: '123', name: data.name })
    };
  }

  return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
};
```

### Terraform Deployment

```hcl
resource "aws_api_gateway_rest_api" "api" {
  name = "users-api"
}

resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "users"
}

resource "aws_api_gateway_method" "get_users" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id     = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_lambda_function" "handler" {
  function_name = "users-handler"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "function.zip"
  source_code_hash = filebase64sha256("function.zip")

  role = aws_iam_role.lambda_role.arn
}
```

## Explanation

- **API Gateway**: Receives HTTP requests, handles TLS termination, throttling, caching, and authentication, then invokes the Lambda function with the request data in a structured event object.
- **Lambda**: Stateless function execution environment. AWS manages scaling automatically — if 1,000 requests arrive simultaneously, AWS spins up 1,000 function instances. You pay only for execution time and memory used.
- **Cold starts**: When a function has not been invoked recently, AWS initializes a new runtime instance. This adds 100ms to 2s of latency depending on language and memory allocation. Provisioned concurrency keeps functions warm for latency-sensitive endpoints.
- **Infrastructure as Code**: Tools like Terraform, Serverless Framework, or AWS SAM define your API routes, Lambda functions, IAM roles, and environment variables in version-controlled configuration files.

## Variants

| Platform | API Gateway | Function Runtime | Best For |
|----------|-------------|------------------|----------|
| AWS | API Gateway + Lambda | Python, Node, Java, Go | Mature ecosystem, broad integrations |
| Azure | API Management + Functions | .NET, Node, Python | Microsoft ecosystem, Visual Studio integration |
| GCP | Cloud Endpoints + Cloud Functions | Node, Python, Go | BigQuery integration, competitive pricing |

## Best Practices

- **Keep functions stateless**: do not assume variables in memory persist between invocations. Use external storage (DynamoDB, S3, Redis) for state.
- **Minimize deployment package size**: large packages increase cold start time. Use Lambda layers for shared dependencies and tree-shake unused code.
- **Set appropriate timeouts and memory**: memory scales CPU proportionally. If a function is slow, increasing memory may be cheaper than paying for longer execution at lower memory.
- **Use environment variables for config**: database URLs, API keys, and feature flags should be set via environment variables, not baked into the deployment package.
- **Implement structured logging**: write JSON logs with request IDs. CloudWatch Logs Insights can query these efficiently for debugging and monitoring.
- **Use dead letter queues (DLQ)**: failed async invocations are retried automatically. A DLQ captures persistent failures so you can inspect and reprocess them.

## Common Mistakes

- **Treating Lambda like a long-running server**: functions have a 15-minute maximum execution time. Move long-running work to batch processing (AWS Batch) or containers (ECS/Fargate).
- **Ignoring cold starts**: latency-sensitive APIs need provisioned concurrency or a keep-alive ping. A user-facing API with 3-second cold starts delivers a terrible experience.
- **Over-provisioning memory**: Lambda memory scales linearly with cost. Profile your function and allocate only what it needs.
- **Hardcoding credentials**: never commit AWS keys or database passwords to your repository. Use IAM roles and Secrets Manager.
- **Not handling partial failures**: in batch processing (SQS triggers), a single bad record can cause the entire batch to fail. Implement per-record error handling.

## Frequently Asked Questions

**Q: How do I handle database connections in Lambda?**
A: Use connection pooling with a lightweight proxy like RDS Proxy, or implement your own connection reuse logic. Opening a new database connection on every invocation is slow and can exhaust the database's connection limit.

**Q: Can I run a full-stack application on serverless?**
A: Yes, but evaluate the trade-offs. Static sites and APIs are excellent fits. Long-running WebSocket connections or stateful sessions may be better served by containers or EC2.

**Q: Is serverless cheaper than traditional servers?**
A: It depends on traffic patterns. For sporadic traffic, serverless is usually cheaper because you pay only for requests. For sustained high traffic, provisioned containers or EC2 can be more cost-effective.

**Q: How do I test Lambda functions locally?**
A: Use the AWS SAM CLI or Serverless Framework to emulate API Gateway and Lambda locally. These tools mount your code in a Docker container that matches the AWS runtime environment.

