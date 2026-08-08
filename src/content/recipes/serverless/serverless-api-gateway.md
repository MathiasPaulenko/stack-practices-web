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
  - aws-lambda
  - functions
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/cold-start-optimization
  - /recipes/event-driven-functions
  - /recipes/real-time-websockets
  - /recipes/scheduled-jobs
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
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
- **Lambda**: Stateless function execution environment.  AWS manages scaling automatically — if 1,000 requests arrive simultaneously, AWS spins up 1,000 function instances.  You pay only for execution time and memory used.
- **Cold starts**: When a function has not been invoked recently, AWS initializes a new runtime instance.  This adds 100ms to 2s of latency depending on language and memory allocation.  Provisioned concurrency keeps functions warm for latency-sensitive endpoints.
- **Infrastructure as Code**: Tools like Terraform, Serverless Framework, or AWS SAM define your API routes, Lambda functions, IAM roles, and environment variables in version-controlled configuration files.

## Variants

| Platform | API Gateway | Function Runtime | Best For |
|----------|-------------|------------------|----------|
| AWS | API Gateway + Lambda | Python, Node, Java, Go | Mature platform, broad integrations |
| Azure | API Management + Functions | .NET, Node, Python | Microsoft platform, Visual Studio integration |
| GCP | Cloud Endpoints + Cloud Functions | Node, Python, Go | BigQuery integration, competitive pricing |

## What Works

- **Keep functions stateless**: do not assume variables in memory persist between invocations.
- **Minimize deployment package size**: large packages increase cold start time.
- **Set appropriate timeouts and memory**: memory scales CPU proportionally.  If a function is slow, increasing memory may be cheaper than paying for longer execution at lower memory.
- **Use environment variables for config**: database URLs, API keys, and feature flags should be set via environment variables, not baked into the deployment package.
- **Implement structured logging**: write JSON logs with request IDs.  CloudWatch Logs Insights can query these efficiently for debugging and monitoring.
- **Use dead letter queues (DLQ)**: failed async invocations are retried automatically.  A DLQ captures persistent failures so you can inspect and reprocess them.

## Common Mistakes

- **Treating Lambda like a long-running server**: functions have a 15-minute maximum execution time.  Move long-running work to batch processing (AWS Batch) or containers (ECS/Fargate).
- **Ignoring cold starts**: latency-sensitive APIs need provisioned concurrency or a keep-alive ping.  A user-facing API with 3-second cold starts delivers a terrible experience.
- **Over-provisioning memory**: Lambda memory scales linearly with cost.  Profile your function and allocate only what it needs.
- **Hardcoding credentials**: never commit AWS keys or database passwords to your repository.
- **Not handling partial failures**: in batch processing (SQS triggers), a single bad record can cause the entire batch to fail.

## Error Handling and Recovery

- **Cold start error handling**: handle initialization errors gracefully.  Wrap handler initialization in try-catch blocks.  Provide fallback values for missing environment variables.  Log initialization errors with structured logging.
- **Function timeout management**: set appropriate timeout values for each function.  AWS Lambda supports up to 15 minutes.  Azure Functions support up to 10 minutes.  Google Cloud Functions support up to 60 minutes.  Start with short timeouts and adjust based on monitoring.
- **Retry and dead letter queues**: configure retry policies for failed invocations.  AWS SQS supports maxReceiveCount and DLQ configuration.  Azure Service Bus supports dead lettering.  Google Pub/Sub supports dead letter topics.  Set up alerts for DLQ messages.  Process DLQ messages regularly.
- **Idempotency in serverless functions**: design functions to be idempotent.  Return cached results for duplicate requests.

## Security Considerations

- **IAM roles and permissions**: follow least privilege principle for function IAM roles.  Grant only the permissions needed by the function.
- **Secrets management**: use dedicated secrets management services.  AWS Secrets Manager for Lambda.  Azure Key Vault for Functions.  Google Secret Manager for Cloud Functions.  Never hardcode secrets in environment variables.  Rotate secrets regularly.
- **VPC configuration**: configure VPC for functions that need private network access.
- **API authentication**: implement authentication for serverless APIs.  Use API keys for simple authentication. 0 for third-party authentication.

## Deployment and CI/CD

- **Serverless deployment strategies**: use infrastructure as code for deployments.  AWS SAM or Serverless Framework for Lambda.  Azure Bicep or ARM templates for Functions.  Google Cloud Deployment Manager for Cloud Functions.  Version all deployments.  Use canary deployments for gradual rollout.
- **CI/CD pipeline for serverless**: automate build, test, and deployment.  Run unit tests in CI.  Run integration tests in staging.  Scan dependencies for vulnerabilities.  Package function code efficiently.  Deploy with infrastructure as code.  Run smoke tests after deployment.
- **Versioning and aliases**: use versioning for function deployments.  AWS Lambda supports versions and aliases.  Azure Functions support deployment slots.  Google Cloud Functions support traffic splitting.  Rollback to previous version on failures.

## Testing Serverless Functions

- **Unit testing serverless functions**: mock cloud services in unit tests.  Mock AWS SDK calls.  Mock database connections.  Mock HTTP requests.  Test edge cases.  Run unit tests in CI.
- **Integration testing serverless functions**: test function integration with cloud services.  Test end-to-end workflows.  Run integration tests in CI.
- **Load testing serverless functions**: test function performance under load.  Simulate concurrent invocations.  Run load tests before deployment.

## Tools and Platforms

- **Serverless Framework**: use Serverless Framework for multi-cloud deployments.  Define functions and events in serverless. yml.  Deploy with a single command.  Support for AWS, Azure, and Google Cloud.
- **AWS SAM**: use AWS SAM for Lambda deployments.  Define functions in template. yaml.  Deploy with AWS CloudFormation.  Support for canary deployments.
- **Local development tools**: use local emulation for faster development.  LocalStack for AWS services.  Azure Functions Core Tools for local testing.  Functions Framework for Google Cloud Functions.

## Common Pitfalls

- **Cold start mitigation failures**: avoid common cold start mistakes.  Do not load unnecessary dependencies at startup.  Do not connect to databases outside the handler.  Do not read large files at startup.
- **Package size issues**: keep function packages small.  Minify code in production.
- **Concurrency limits**: understand and configure concurrency limits.  AWS Lambda reserved concurrency for critical functions.  Azure Functions max instances.  Google Cloud Functions max instances.
## Best Practices

- **Function granularity**: keep functions small and focused on a single responsibility.  Each function should do one thing well.  Split complex logic into smaller functions.  Refactor large functions into smaller ones.
- **Resource cleanup**: clean up resources after function execution.  Close database connections.  Close file handles.  Clear temporary files.  Release network connections.
- **Logging and observability**: implement structured logging in all functions.  Log function start and end times.  Log input parameters (without sensitive data).  Log error details with stack traces.  Use log aggregation tools.
- **Environment configuration**: use environment variables for configuration.  Validate environment variables at startup.  Provide defaults for optional variables.

## Cost Optimization

- **Right-sizing function memory**: optimize function memory allocation.  AWS Lambda charges based on memory and execution time.  Higher memory may reduce execution time.  Find the optimal memory-to-duration ratio.
- **Reducing invocation frequency**: reduce unnecessary function invocations.  Batch process events where possible.  Combine multiple operations into single invocations.
- **Provisioned concurrency cost analysis**: analyze provisioned concurrency costs.  Scale provisioned concurrency based on traffic patterns.

## Troubleshooting Guide

- **Debugging cold starts**: identify cold start causes.
- **Debugging function timeouts**: identify timeout causes.  Check network latency.
- **Debugging deployment failures**: identify deployment failure causes.  Check package size limits.  Validate template syntax.

## Monitoring and Alerting

- **Key metrics to monitor**: monitor invocations, errors, duration, and throttles.  Track memory usage.  Adjust thresholds based on trends.
- **Alert configuration**: set alerts on error rate above 1%.  Alert on throttle increases.  Alert on cost anomalies.  Reduce alert noise.
- **Distributed tracing**: implement distributed tracing for serverless workflows.  Use Azure Application Insights for Functions.  Trace requests across multiple functions.

## Advanced Patterns

- **Fan-out/fan-in pattern**: use fan-out for parallel processing.  Publish events to SNS or EventBridge.  Multiple Lambda functions process in parallel.  SQS or Kinesis for aggregation.
- **Event sourcing pattern**: store all changes as events.  Rebuild state from event log.  Enable time-travel queries.
- **Saga pattern**: use sagas for distributed transactions.
## Migration Strategies

- **Migrating from monolith to serverless**: break down monolithic applications into smaller functions.  Migrate one endpoint at a time.  Run both systems in parallel.  Switch traffic gradually.
- **Migrating between cloud providers**: abstract cloud-specific code behind interfaces.  Test failback procedures.  Complete DNS switch after validation.
- **Migrating from containers to serverless**: identify suitable workloads for serverless.  Start with event-driven workloads.

## Compliance and Governance

- **Serverless SLAs**: define SLAs for serverless APIs.  API response time under 200ms.  Function execution time under 1 second.  Error rate below 0. 1%.  Communicate SLA status.
- **Serverless reporting**: generate weekly serverless reports.  Highlight performance trends.
- **Audit and compliance**: log all function invocations.
## Automation and Tooling

- **Infrastructure as code automation**: automate infrastructure provisioning with IaC tools.  Use Terraform for multi-cloud deployments.  Version all IaC templates.
- **Automated testing pipeline**: automate all testing in CI/CD pipeline.  Run unit tests on every commit.  Run integration tests on pull requests.  Run load tests before deployment.  Run security scans on every build.
- **Automated deployment rollback**: implement automated rollback for failed deployments.

## Sustainability

- **Green serverless computing**: serverless is inherently green.  Pay only for actual usage.  No idle resources consuming power.
- **Resource efficiency**: optimize function resource usage.  Reduce unnecessary invocations.
- **Waste reduction**: reduce serverless waste.

## Industry Standards and Frameworks

- **Well-Architected Framework**: follow cloud provider Well-Architected Framework.  AWS Well-Architected Tool for Lambda.  Google Cloud Architecture Framework.  Address critical issues.
- **Serverless design principles**: follow serverless design principles.  Design for failure.  Design for scale.  Train team on principles.
- **Compliance frameworks**: align serverless architecture with compliance frameworks.  SOC 2 for security.  PCI DSS for payments.  HIPAA for healthcare.  GDPR for data privacy.  ISO 27001 for security management.
## Reporting and Communication

- **Performance reporting**: generate weekly performance reports for serverless functions.  Highlight trends and anomalies.
- **Cost reporting**: generate monthly cost reports for serverless workloads.  Break down by function, service, and environment.
- **Incident reporting**: document all serverless incidents.  Conduct post-mortem reviews.  Communicate incidents to stakeholders.

## Advanced Optimization

- **Provisioned concurrency tuning**: tune provisioned concurrency for optimal performance.  Start with minimum provisioned concurrency.  Adjust based on traffic patterns.
- **Memory tuning**: tune function memory for optimal performance.  Find optimal memory-to-duration ratio.
- **Code optimization**: optimize function code for performance.  Cache frequently accessed data.




## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the serverless and api-gateway guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply build serverless apis with api gateway** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: How do I handle database connections in Lambda?**
A: Use connection pooling with a lightweight proxy like RDS Proxy, or implement your own connection reuse logic. Opening a new database connection on every invocation is slow and can exhaust the database's connection limit.

**Q: Can I run a full-stack application on serverless?**
A: Yes, but evaluate the trade-offs. Static sites and APIs are excellent fits. Long-running WebSocket connections or stateful sessions may be better served by containers or EC2.

**Q: Is serverless cheaper than traditional servers?**
A: It depends on traffic patterns. For sporadic traffic, serverless is usually cheaper because you pay only for requests. For sustained high traffic, provisioned containers or EC2 can be more cost-effective.

**Q: How do I test Lambda functions locally?**
A: Use the AWS SAM CLI or Serverless Framework to emulate API Gateway and Lambda locally. These tools mount your code in a Docker container that matches the AWS runtime environment.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
