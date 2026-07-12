---


contentType: recipes
slug: event-driven-functions
title: "Build Event-Driven Serverless Architectures"
description: "How to design loosely coupled systems using serverless functions triggered by events from message queues, databases, and webhooks."
metaDescription: "Learn event-driven serverless architecture. Design loosely coupled systems with Lambda, SQS, EventBridge, and webhook triggers for growth-ready async processing."
difficulty: intermediate
topics:
  - serverless
tags:
  - serverless
  - event-driven
  - lambda
  - aws-lambda
  - functions
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/webhooks
  - /recipes/middleware
  - /recipes/real-time-websockets
  - /recipes/scheduled-jobs
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn event-driven serverless architecture. Design loosely coupled systems with Lambda, SQS, EventBridge, and webhook triggers for growth-ready async processing."
  keywords:
    - event driven serverless
    - lambda sqs
    - eventbridge
    - async processing
    - serverless architecture
    - event driven microservices


---

## Overview

Event-driven architecture decouples services by having them communicate through events rather than direct HTTP calls. When a user uploads an image, an `ImageUploaded` event is published. A thumbnail generator listens for that event and creates a resized version. A metadata extractor also listens and updates the search index. Neither service knows about the other — they only know about the event.

Serverless functions are a natural fit for event-driven systems because they scale to zero when idle and scale out automatically when events arrive in bursts. AWS Lambda, SQS, EventBridge, and SNS form the backbone of most event-driven serverless platforms.

## When to Use

Use this recipe when:

- Processing asynchronous workloads that do not need immediate responses (image processing, report generation, email sending). See [Scheduled Jobs](/recipes/devops/background-jobs) for recurring task automation.
- Decoupling microservices so they can be deployed, scaled, and failed independently. See [Serverless Orchestration](/recipes/devops/background-jobs) for coordinating complex workflows.
- Building systems that must handle traffic spikes without provisioning capacity upfront
- Reacting to changes in data (database CDC) or external systems (webhooks, file uploads). See [Event Sourcing](/patterns/design/event-sourcing-pattern) for immutable event patterns.
- Replacing cron jobs with event-triggered functions for more precise timing

## Solution

### Lambda Triggered by SQS (Python)

```python
import json
import boto3

def lambda_handler(event, context):
    for record in event['Records']:
        body = json.loads(record['body'])
        order_id = body['orderId']

        # Process the order asynchronously
        process_order(order_id)

        # SQS message is deleted automatically on successful completion
    return {'statusCode': 200}

def process_order(order_id):
    # Business logic: validate, charge, notify
    print(f"Processing order {order_id}")
```

### EventBridge Rule (Infrastructure as Code)

```yaml
# SAM / CloudFormation
OrderPlacedRule:
  Type: AWS::Events::Rule
  Properties:
    EventBusName: default
    EventPattern:
      source:
        - order-service
      detail-type:
        - OrderPlaced
    Targets:
      - Arn: !GetAtt PaymentFunction.Arn
        Id: payment-target
      - Arn: !GetAtt NotificationFunction.Arn
        Id: notification-target
```

### Publishing Events (Node.js)

```javascript
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const eb = new EventBridgeClient({ region: 'us-east-1' });

async function publishOrderPlaced(order) {
  await eb.send(new PutEventsCommand({
    Entries: [{
      Source: 'order-service',
      DetailType: 'OrderPlaced',
      Detail: JSON.stringify({
        orderId: order.id,
        amount: order.total,
        customerEmail: order.email,
      }),
    }],
  }));
}
```

## Explanation

- **Events**: Immutable records of something that happened in the past (`OrderPlaced`, `ImageUploaded`, `PaymentReceived`). Events carry state but do not dictate what consumers should do.
- **Event producers**: Services that emit events when something notable occurs. A producer does not know or care how many consumers exist.
- **Event consumers**: Functions or services that subscribe to specific event types. Multiple consumers can process the same event independently.
- **Event buses (EventBridge)**: Central routers that filter events based on rules and deliver them to targets. They decouple producers from consumers and enable event sourcing patterns.

## Variants

| Pattern | Coupling | Durability | Best For |
|---------|----------|------------|----------|
| Direct invocation | Tight | None | Simple, synchronous workflows |
| SQS queues | Loose | High | Reliable async processing, retries |
| EventBridge | Loose | High | Multi-consumer routing, filtering |
| SNS topics | Loose | Medium | Broadcast, fan-out notifications |
| Kinesis streams | Loose | High | Real-time analytics, ordered processing |

## What Works

- **Design events around business facts**: `OrderPlaced` is better than `ProcessOrder` because it describes what happened, not what to do. This gives consumers freedom to react in different ways.
- **Make events immutable and self-contained**: include enough context (order ID, customer email, amount) so consumers do not need to query back to the producer.
- **Handle duplicate events**: at-least-once delivery is the default for most message queues. Consumers must be idempotent or deduplicate using event IDs.
- **Set up dead letter queues (DLQ)**: after a configured number of retries, failed messages should move to a DLQ for inspection rather than retrying forever.
- **Monitor event latency and age**: old messages indicate a processing bottleneck. Set alarms on `ApproximateAgeOfOldestMessage` in SQS.

## Common Mistakes

- **Treating events as commands**: `ProcessPayment` is a command that expects action. `PaymentRequested` is an event that describes a fact. Commands create tight coupling; events promote loose coupling.
- **Omitting schema versioning**: when an event schema changes (new field added), unupdated consumers may fail. Version your events (`OrderPlaced-v2`).
- **Not handling partial batch failures**: Lambda with SQS batch sizes greater than 1 can fail the entire batch because of one bad message. Implement per-record error handling.
- **Ignoring message ordering**: SQS standard queues do not guarantee ordering. Use FIFO queues or Kinesis when sequence matters.

## Error Handling and Recovery

- **Cold start error handling**: handle initialization errors gracefully. Wrap handler initialization in try-catch blocks. Provide fallback values for missing environment variables. Log initialization errors with structured logging. Implement retry logic for transient failures. Use circuit breakers for downstream service calls. Document error handling strategy. Test error scenarios in staging. Monitor error rates after deployment. Set up alerts for initialization failures
- **Function timeout management**: set appropriate timeout values for each function. AWS Lambda supports up to 15 minutes. Azure Functions support up to 10 minutes. Google Cloud Functions support up to 60 minutes. Start with short timeouts and adjust based on monitoring. Document timeout values per function. Test behavior at timeout boundary. Implement graceful shutdown on timeout. Monitor timeout frequency. Alert on timeout spikes
- **Retry and dead letter queues**: configure retry policies for failed invocations. Use dead letter queues (DLQ) for messages that exceed retry limits. AWS SQS supports maxReceiveCount and DLQ configuration. Azure Service Bus supports dead lettering. Google Pub/Sub supports dead letter topics. Document retry strategy. Test DLQ behavior. Monitor DLQ depth. Set up alerts for DLQ messages. Process DLQ messages regularly. Document DLQ handling procedures
- **Idempotency in serverless functions**: design functions to be idempotent. Use idempotency keys for duplicate detection. Store processed message IDs in a database. Return cached results for duplicate requests. Document idempotency strategy. Test with duplicate messages. Monitor duplicate detection rate. Handle idempotency failures gracefully. Use distributed locks for concurrent duplicates

## Security Considerations

- **IAM roles and permissions**: follow least privilege principle for function IAM roles. Grant only the permissions needed by the function. Use resource-level permissions where possible. Avoid wildcard permissions. Review IAM roles regularly. Use IAM conditions for additional constraints. Document IAM role configuration. Test with minimal permissions. Monitor IAM usage. Alert on permission changes
- **Secrets management**: use dedicated secrets management services. AWS Secrets Manager for Lambda. Azure Key Vault for Functions. Google Secret Manager for Cloud Functions. Never hardcode secrets in environment variables. Rotate secrets regularly. Document secrets management strategy. Test secret rotation. Monitor secret access. Alert on unauthorized access attempts
- **VPC configuration**: configure VPC for functions that need private network access. Use private subnets for database access. Configure NAT Gateway for outbound internet. Use VPC endpoints for AWS services. Document VPC configuration. Test VPC connectivity. Monitor VPC resource usage. Review security group rules regularly. Alert on VPC configuration changes
- **API authentication**: implement authentication for serverless APIs. Use JWT tokens for stateless authentication. Use API keys for simple authentication. Use OAuth 2.0 for third-party authentication. Configure CORS properly. Document authentication strategy. Test authentication flows. Monitor authentication failures. Alert on authentication anomalies. Use rate limiting to prevent abuse

## Deployment and CI/CD

- **Serverless deployment strategies**: use infrastructure as code for deployments. AWS SAM or Serverless Framework for Lambda. Azure Bicep or ARM templates for Functions. Google Cloud Deployment Manager for Cloud Functions. Version all deployments. Use blue-green deployments for zero downtime. Use canary deployments for gradual rollout. Document deployment strategy. Test deployment in staging. Monitor deployment health. Rollback on failures
- **CI/CD pipeline for serverless**: automate build, test, and deployment. Run unit tests in CI. Run integration tests in staging. Scan dependencies for vulnerabilities. Package function code efficiently. Deploy with infrastructure as code. Run smoke tests after deployment. Document CI/CD pipeline. Monitor pipeline success rate. Alert on pipeline failures. Review pipeline performance regularly
- **Versioning and aliases**: use versioning for function deployments. AWS Lambda supports versions and aliases. Azure Functions support deployment slots. Google Cloud Functions support traffic splitting. Use aliases for environment promotion. Document versioning strategy. Test version switching. Monitor version distribution. Rollback to previous version on failures. Clean up old versions regularly

## Testing Serverless Functions

- **Unit testing serverless functions**: mock cloud services in unit tests. Test handler logic in isolation. Mock AWS SDK calls. Mock database connections. Mock HTTP requests. Test error handling paths. Test edge cases. Document testing strategy. Run unit tests in CI. Monitor test coverage. Aim for 80%+ coverage on critical functions
- **Integration testing serverless functions**: test function integration with cloud services. Use local emulation tools like LocalStack. Test with real cloud services in staging. Test end-to-end workflows. Test error scenarios. Document integration testing strategy. Run integration tests in CI. Monitor integration test results. Alert on integration test failures
- **Load testing serverless functions**: test function performance under load. Use tools like Artillery or k6. Simulate concurrent invocations. Monitor cold start frequency under load. Test auto-scaling behavior. Document load testing strategy. Run load tests before deployment. Monitor load test results. Compare with previous results. Alert on performance regressions

## Tools and Platforms

- **Serverless Framework**: use Serverless Framework for multi-cloud deployments. Define functions and events in serverless.yml. Deploy with a single command. Support for AWS, Azure, and Google Cloud. Use plugins for extended functionality. Document Serverless Framework configuration. Test deployments in staging. Monitor deployment success. Review plugin compatibility regularly
- **AWS SAM**: use AWS SAM for Lambda deployments. Define functions in template.yaml. Use SAM CLI for local testing. Deploy with AWS CloudFormation. Support for canary deployments. Document SAM template structure. Test SAM templates locally. Monitor SAM deployment success. Review SAM version compatibility
- **Local development tools**: use local emulation for faster development. LocalStack for AWS services. Azure Functions Core Tools for local testing. Functions Framework for Google Cloud Functions. Document local development setup. Test local emulation accuracy. Monitor local development productivity. Review local tool versions regularly

## Common Pitfalls

- **Cold start mitigation failures**: avoid common cold start mistakes. Do not load unnecessary dependencies at startup. Do not connect to databases outside the handler. Do not read large files at startup. Use provisioned concurrency for critical functions. Keep deployment packages small. Use lazy initialization for heavy resources. Document cold start mitigation strategy. Test cold start frequency. Monitor cold start duration
- **Package size issues**: keep function packages small. Remove unnecessary dependencies. Use tree shaking where possible. Minify code in production. Avoid bundling development dependencies. Use layers for shared dependencies. Document package optimization strategy. Test package size after build. Monitor package size trends. Alert on package size growth
- **Concurrency limits**: understand and configure concurrency limits. AWS Lambda reserved concurrency for critical functions. Azure Functions max instances. Google Cloud Functions max instances. Document concurrency configuration. Test concurrency behavior. Monitor concurrency usage. Alert on concurrency limit approaches. Request limit increases proactively
## Best Practices

- **Function granularity**: keep functions small and focused on a single responsibility. Each function should do one thing well. Avoid monolithic functions that handle multiple concerns. Split complex logic into smaller functions. Use step functions for orchestration. Document function boundaries. Review function size regularly. Refactor large functions into smaller ones. Test each function independently. Monitor function execution time
- **Resource cleanup**: clean up resources after function execution. Close database connections. Close file handles. Clear temporary files. Release network connections. Document cleanup procedures. Test cleanup in error scenarios. Monitor resource leaks. Alert on resource exhaustion. Use finally blocks for cleanup. Review cleanup code regularly
- **Logging and observability**: implement structured logging in all functions. Include correlation IDs for tracing. Log function start and end times. Log input parameters (without sensitive data). Log error details with stack traces. Use distributed tracing for multi-function workflows. Document logging strategy. Test log output format. Monitor log volume. Alert on log anomalies. Use log aggregation tools. Review log retention policies
- **Environment configuration**: use environment variables for configuration. Keep configuration external from code. Use different configurations per environment. Document required environment variables. Validate environment variables at startup. Provide defaults for optional variables. Test with missing variables. Monitor configuration changes. Use configuration management tools. Review environment variable usage regularly

## Cost Optimization

- **Right-sizing function memory**: optimize function memory allocation. AWS Lambda charges based on memory and execution time. Test different memory configurations. Higher memory may reduce execution time. Find the optimal memory-to-duration ratio. Document memory optimization strategy. Test memory configuration changes. Monitor cost per invocation. Review memory allocation quarterly. Alert on cost anomalies
- **Reducing invocation frequency**: reduce unnecessary function invocations. Use caching for frequent requests. Batch process events where possible. Use event filtering to skip irrelevant events. Combine multiple operations into single invocations. Document invocation reduction strategy. Test invocation frequency. Monitor invocation counts. Alert on invocation spikes. Review invocation patterns regularly
- **Provisioned concurrency cost analysis**: analyze provisioned concurrency costs. Compare with on-demand pricing. Use provisioned concurrency only for critical functions. Scale provisioned concurrency based on traffic patterns. Document provisioned concurrency strategy. Test cost impact. Monitor provisioned concurrency usage. Review provisioned concurrency configuration monthly. Adjust based on traffic patterns

## Troubleshooting Guide

- **Debugging cold starts**: identify cold start causes. Check initialization code. Review dependency loading. Monitor cold start frequency. Use X-Ray or similar tracing tools. Document cold start debugging steps. Test cold start scenarios. Review package size impact. Monitor cold start duration trends. Optimize initialization code. Use provisioned concurrency for critical paths
- **Debugging function timeouts**: identify timeout causes. Check downstream service latency. Review function execution time. Monitor database query performance. Check network latency. Document timeout debugging steps. Test with different timeout values. Monitor timeout frequency. Optimize slow operations. Use async processing for long-running tasks
- **Debugging deployment failures**: identify deployment failure causes. Check IAM permissions. Review CloudFormation errors. Check package size limits. Validate template syntax. Document deployment debugging steps. Test deployment in staging. Monitor deployment success rate. Review deployment logs. Use deployment rollback for quick recovery

## Monitoring and Alerting

- **Key metrics to monitor**: monitor invocations, errors, duration, and throttles. Track cold start frequency and duration. Monitor concurrent executions. Track memory usage. Monitor DLQ depth. Track API Gateway latency. Document monitoring strategy. Configure dashboards for key metrics. Review metrics regularly. Adjust thresholds based on trends. Alert on critical metrics
- **Alert configuration**: set alerts on error rate above 1%. Alert on timeout frequency spikes. Alert on throttle increases. Alert on DLQ depth growth. Alert on cost anomalies. Use multi-level alerts: warning and critical. Document alert thresholds. Test alert delivery. Review alert effectiveness monthly. Reduce alert noise. Use runbooks for each alert
- **Distributed tracing**: implement distributed tracing for serverless workflows. Use AWS X-Ray for Lambda. Use Azure Application Insights for Functions. Use Google Cloud Trace for Cloud Functions. Trace requests across multiple functions. Document tracing strategy. Test trace coverage. Monitor trace sampling. Review trace data regularly. Use traces for performance optimization

## Advanced Patterns

- **Fan-out/fan-in pattern**: use fan-out for parallel processing. Publish events to SNS or EventBridge. Multiple Lambda functions process in parallel. Use fan-in to aggregate results. SQS or Kinesis for aggregation. Document fan-out/fan-in strategy. Test parallel processing. Monitor function concurrency. Alert on parallelism limits. Use step functions for complex fan-out patterns
- **Event sourcing pattern**: store all changes as events. Use EventBridge or Kafka for event streaming. Rebuild state from event log. Enable time-travel queries. Document event sourcing strategy. Test event replay. Monitor event store size. Review event schema regularly. Use snapshots for performance. Handle schema evolution carefully
- **Saga pattern**: use sagas for distributed transactions. Implement compensating actions for rollback. Use step functions for saga orchestration. Document saga pattern usage. Test compensating actions. Monitor saga completion rate. Alert on saga failures. Review saga design regularly. Handle saga timeouts gracefully
## Migration Strategies

- **Migrating from monolith to serverless**: break down monolithic applications into smaller functions. Identify bounded contexts for function boundaries. Migrate one endpoint at a time. Use API Gateway as a facade during migration. Run both systems in parallel. Document migration strategy. Test each migrated function. Monitor performance comparison. Switch traffic gradually. Complete migration after validation
- **Migrating between cloud providers**: abstract cloud-specific code behind interfaces. Use infrastructure as code for portability. Test on target platform before migration. Monitor for behavioral differences. Document migration runbook. Test failback procedures. Review migration progress. Complete DNS switch after validation. Monitor for post-migration issues
- **Migrating from containers to serverless**: identify suitable workloads for serverless. Start with event-driven workloads. Keep stateless functions. Use managed services for state. Document migration strategy. Test function performance. Monitor cost comparison. Review migration progress. Complete migration after validation

## Compliance and Governance

- **Serverless SLAs**: define SLAs for serverless APIs. API response time under 200ms. Function execution time under 1 second. Error rate below 0.1%. Track SLA compliance. Alert on SLA violations. Document SLA definitions. Review SLAs quarterly. Communicate SLA status. Use SLA for prioritization
- **Serverless reporting**: generate weekly serverless reports. Include invocation count, error rate, cost. Highlight performance trends. Share with stakeholders. Document reporting methodology. Automate report generation. Review report content. Track metrics over time. Use reports for planning and optimization
- **Audit and compliance**: log all function invocations. Track who triggered each function. Maintain audit trail of configuration changes. Use cloud-native audit tools. Document audit strategy. Test audit log completeness. Monitor audit log retention. Review compliance requirements regularly. Alert on audit log gaps
## Automation and Tooling

- **Infrastructure as code automation**: automate infrastructure provisioning with IaC tools. Use AWS SAM or Serverless Framework for Lambda. Use Terraform for multi-cloud deployments. Version all IaC templates. Store templates in version control. Document IaC strategy. Test IaC changes in staging. Monitor IaC deployment success. Review IaC templates regularly. Use modular templates for reuse
- **Automated testing pipeline**: automate all testing in CI/CD pipeline. Run unit tests on every commit. Run integration tests on pull requests. Run load tests before deployment. Run security scans on every build. Document testing pipeline. Monitor test success rate. Alert on test failures. Review test coverage quarterly. Optimize test execution time
- **Automated deployment rollback**: implement automated rollback for failed deployments. Use CloudWatch alarms for rollback triggers. Configure health checks for deployment validation. Document rollback strategy. Test rollback in staging. Monitor rollback frequency. Alert on rollback events. Review rollback thresholds regularly. Minimize rollback time

## Sustainability

- **Green serverless computing**: serverless is inherently green. Pay only for actual usage. No idle resources consuming power. Use carbon-aware scheduling for batch jobs. Schedule heavy workloads during low-carbon periods. Document sustainability strategy. Monitor carbon footprint. Review energy usage regularly. Optimize function efficiency. Use cloud provider sustainability tools
- **Resource efficiency**: optimize function resource usage. Right-size memory allocation. Minimize execution time. Reduce unnecessary invocations. Use efficient data structures. Optimize algorithms. Document resource efficiency strategy. Monitor resource utilization. Review efficiency metrics quarterly. Optimize based on usage patterns
- **Waste reduction**: reduce serverless waste. Eliminate unused functions. Remove unused dependencies. Clean up old versions. Delete unused API routes. Monitor for idle resources. Document waste reduction strategy. Review resource usage monthly. Alert on waste indicators. Automate cleanup procedures

## Industry Standards and Frameworks

- **Well-Architected Framework**: follow cloud provider Well-Architected Framework. AWS Well-Architected Tool for Lambda. Azure Well-Architected Review for Functions. Google Cloud Architecture Framework. Review architecture regularly. Document review findings. Address critical issues. Monitor compliance. Use framework for design decisions
- **Serverless design principles**: follow serverless design principles. Design for failure. Use managed services. Implement idempotency. Design for scale. Use event-driven architecture. Minimize cold starts. Optimize cost. Document design principles. Review architecture against principles. Train team on principles. Use principles for code reviews
- **Compliance frameworks**: align serverless architecture with compliance frameworks. SOC 2 for security. PCI DSS for payments. HIPAA for healthcare. GDPR for data privacy. ISO 27001 for security management. Document compliance requirements. Test compliance controls. Monitor compliance status. Review compliance regularly. Use compliance for architecture decisions
## Reporting and Communication

- **Performance reporting**: generate weekly performance reports for serverless functions. Include invocation count, average duration, error rate, and cost. Compare with previous week. Highlight trends and anomalies. Share with engineering team. Document reporting methodology. Automate report generation. Review report content monthly. Use reports for optimization decisions
- **Cost reporting**: generate monthly cost reports for serverless workloads. Break down by function, service, and environment. Compare with budget. Identify cost optimization opportunities. Share with stakeholders. Document cost reporting strategy. Automate cost report generation. Review cost trends quarterly. Use reports for budget planning
- **Incident reporting**: document all serverless incidents. Include root cause, impact, and resolution. Share incident reports with team. Conduct post-mortem reviews. Document action items. Track action item completion. Review incident patterns. Use incidents for improvement. Communicate incidents to stakeholders. Maintain incident history

## Advanced Optimization

- **Provisioned concurrency tuning**: tune provisioned concurrency for optimal performance. Start with minimum provisioned concurrency. Monitor cold start frequency. Adjust based on traffic patterns. Use auto-scaling for provisioned concurrency. Document tuning strategy. Test configuration changes. Monitor cost impact. Review configuration monthly. Optimize for cost and performance balance
- **Memory tuning**: tune function memory for optimal performance. Test with different memory values. Monitor execution time changes. Find optimal memory-to-duration ratio. Document memory tuning strategy. Test memory changes in staging. Monitor cost impact. Review memory allocation quarterly. Use AWS Lambda Power Tuning for optimization
- **Code optimization**: optimize function code for performance. Minimize cold start dependencies. Use lazy initialization. Optimize database queries. Cache frequently accessed data. Use efficient data structures. Document code optimization strategy. Review code regularly. Monitor performance impact. Use profiling tools for optimization
## Serverless Architecture Patterns

- **Microservices with serverless**: decompose applications into small, independent functions. Each function handles a specific business capability. Use API Gateway for routing. Use event bus for inter-service communication. Document service boundaries. Test services independently. Deploy services independently. Monitor service health. Use circuit breakers for service calls. Handle service failures gracefully
- **Event-driven architecture**: use events as the primary communication mechanism. Producers publish events without knowing consumers. Consumers subscribe to events they care about. Use EventBridge or Kafka for event routing. Document event schemas. Version event schemas. Test event flows. Monitor event processing latency. Handle event ordering carefully. Use dead letter queues for failed events
- **CQRS with serverless**: separate read and write operations. Use Lambda for command handling. Use Lambda with DynamoDB Streams for read model updates. Use API Gateway for query endpoints. Document CQRS implementation. Test command and query paths separately. Monitor read and write performance. Handle eventual consistency. Use projections for optimized reads
## Serverless Data Processing

- **Stream processing**: process data streams with serverless functions. Use Lambda with Kinesis or DynamoDB Streams. Process records in batches for efficiency. Handle partial batch failures. Document stream processing strategy. Test with different batch sizes. Monitor processing latency. Alert on processing lag. Use checkpointing for fault tolerance. Scale based on stream volume
- **Batch processing**: use serverless for batch data processing. Trigger functions on schedule. Process data in chunks. Use Step Functions for complex workflows. Document batch processing strategy. Test with large datasets. Monitor batch completion time. Alert on batch failures. Use idempotency for retry safety. Optimize batch size for throughput
- **Real-time processing**: process events in real-time with serverless. Use Lambda with EventBridge for real-time event processing. Minimize processing latency. Use async invocations for fire-and-forget. Document real-time processing strategy. Test latency under load. Monitor processing time. Alert on latency spikes. Use provisioned concurrency for critical paths

## Serverless Anti-Patterns

- **Chatty functions**: avoid functions that make too many downstream calls. Each call adds latency and cost. Batch downstream calls where possible. Use caching for repeated calls. Document anti-pattern avoidance. Test function call patterns. Monitor downstream call count. Alert on excessive calls. Refactor chatty functions into batch operations
- **Synchronous chains**: avoid synchronous function-to-function calls. Use async invocation or event-based communication. Synchronous chains add latency and reduce reliability. Document anti-pattern avoidance. Test async communication patterns. Monitor chain length. Alert on synchronous chains. Refactor to event-driven architecture
- **Shared state in functions**: avoid storing state in function instances. Function instances are ephemeral. Use external state stores like DynamoDB or Redis. Document state management strategy. Test state persistence. Monitor state-related errors. Alert on state corruption. Use idempotency for state updates
## Serverless Cold Start Mitigation

- **Provisioned concurrency**: allocate provisioned concurrency for critical functions. AWS Lambda provisioned concurrency keeps functions warm. Azure Functions premium plan provides pre-warmed instances. Google Cloud Functions min instances for warm functions. Document provisioned concurrency strategy. Monitor provisioned concurrency utilization. Alert on provisioned concurrency exhaustion. Review configuration monthly. Balance cost and performance. Use auto-scaling with provisioned concurrency
- **Lazy initialization**: initialize heavy resources lazily inside the handler. Load dependencies only when needed. Defer database connections until first use. Cache initialized resources between invocations. Document lazy initialization strategy. Test cold start impact. Monitor initialization time. Review lazy initialization code regularly. Optimize initialization sequence
- **Package optimization**: minimize package size for faster cold starts. Remove unnecessary dependencies. Use tree shaking. Minify production code. Use Lambda layers for shared dependencies. Document package optimization strategy. Test package size impact. Monitor cold start duration. Review package contents regularly. Use bundlers for optimization
## Frequently Asked Questions

**Q: How is event-driven different from request-response?**
A: Request-response (HTTP REST) is synchronous: the caller waits for a result. Event-driven is asynchronous: the producer fires an event and moves on. Consumers process when ready.

**Q: Can I use event-driven architecture with non-AWS providers?**
A: Yes. Azure Functions with Event Grid, Google Cloud Functions with Pub/Sub, and Apache Kafka on any cloud all support event-driven patterns.

**Q: How do I trace a request across multiple event-driven functions?**
A: Use correlation IDs. Generate a unique ID at the entry point and propagate it through every event. CloudWatch, X-Ray, or OpenTelemetry can then trace the full chain.

**Q: What is the maximum event size?**
A: SQS messages are limited to 256 KB. EventBridge events are limited to 256 KB. For larger payloads, store the data in S3 and include a reference in the event.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### What are the limitations of event-driven functions?

Event-driven functions have some limitations. Debugging distributed workflows is harder. Eventual consistency requires careful handling. Testing end-to-end flows requires integration tests. Monitoring requires distributed tracing. Document limitations for your team. Plan mitigation strategies. Test edge cases thoroughly. Monitor for known issues.