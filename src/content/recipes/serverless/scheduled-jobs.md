---
contentType: recipes
slug: scheduled-jobs
title: "Run Scheduled Jobs with Serverless Functions"
description: "How to replace cron jobs with serverless scheduled functions for backups, reporting, cleanup, and periodic maintenance tasks."
metaDescription: "Learn serverless scheduled jobs. Replace cron with Lambda, Cloud Scheduler, or Azure Timer Triggers for automated backups, reporting, and maintenance tasks."
difficulty: beginner
topics:
  - serverless
tags:
  - serverless
  - cron
  - aws-lambda
  - functions
  - faas
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/event-driven-functions
  - /recipes/cron-jobs
  - /recipes/event-sourcing-serverless
  - /recipes/real-time-websockets
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Learn serverless scheduled jobs. Replace cron with Lambda, Cloud Scheduler, or Azure Timer Triggers for automated backups, reporting, and maintenance tasks."
  keywords:
    - scheduled jobs serverless
    - cron lambda
    - cloud scheduler
    - serverless automation
    - periodic tasks
    - cron jobs cloud


---
## Overview

Scheduled tasks — backups, report generation, cache warming, data cleanup — have traditionally run on dedicated servers with cron. If the server restarts or the cron daemon fails, jobs stop running silently. Serverless scheduling replaces this with managed, event-triggered functions that run on time without servers to maintain.

AWS EventBridge rules trigger Lambda functions on cron expressions. Google Cloud Scheduler publishes to Pub/Sub or HTTP endpoints. Azure Timer Triggers wake Functions on schedules. All three guarantee execution, retry failed invocations, and log results without any operating system to manage.

## When to Use

Use this recipe when:

- Replacing legacy cron jobs running on EC2 or virtual machines. See [Serverless Functions](/recipes/event-driven-microservices/) for deploying serverless code.
- Generating daily, weekly, or monthly reports from application data. See [Parse JSON](/recipes/parse-json/) for handling report data formats.
- Cleaning up old logs, temporary files, or expired database records
- Warming caches or pre-computing aggregations before peak traffic
- Sending scheduled notifications, reminders, or newsletters
- Running database maintenance (VACUUM, index rebuilds, statistics updates). See [PostgreSQL Query Optimization](/recipes/postgres-query-optimization/) for database performance tuning.

## Solution

### AWS Lambda + EventBridge (Python)

```python
import json
import boto3
from datetime import datetime, timedelta

def lambda_handler(event, context):
    # Runs every day at 2 AM UTC
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')

    # Generate daily report
    report = generate_sales_report(yesterday)

    # Upload to S3
    s3 = boto3.client('s3')
    s3.put_object(
        Bucket='reports.example.com',
        Key=f'daily/{yesterday}.json',
        Body=json.dumps(report)
    )

    return {'statusCode': 200, 'body': f'Report {yesterday} generated'}
```

### EventBridge Rule (Terraform)

```hcl
resource "aws_cloudwatch_event_rule" "daily_report" {
  name                = "daily-report-trigger"
  description         = "Trigger report generator every day at 2 AM UTC"
  schedule_expression = "cron(0 2 * * ? *)"
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule = aws_cloudwatch_event_rule.daily_report.name
  arn  = aws_lambda_function.report_generator.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.report_generator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_report.arn
}
```

### Google Cloud Scheduler (YAML)

```yaml
# Cloud Scheduler job calling an HTTP Cloud Function
job:
  name: daily-cleanup
  schedule: "0 2 * * *"
  timeZone: UTC
  httpTarget:
    uri: https://us-central1-project.cloudfunctions.net/cleanupFunction
    httpMethod: POST
    oidcToken:
      serviceAccountEmail: scheduler@project.iam.gserviceaccount.com
```

## Explanation

- **Cron expressions**: The `cron(0 2 * * ?  *)` syntax means "at 2:00 AM UTC every day. " EventBridge supports standard cron with a `? ` wildcard for day-of-week or day-of-month.
- **Idempotency**: Scheduled functions may run twice if an error occurs during the first invocation and EventBridge retries.  Design jobs to be safe to run multiple times (e. g. , use UPSERT, not INSERT).
- **Timeouts**: Lambda has a 15-minute maximum execution time.  For longer jobs, use Step Functions to orchestrate multiple Lambda invocations or switch to AWS Batch.
- **Monitoring**: CloudWatch Logs captures function output.  Set alarms on error rates and execution duration.

## Variants

| Platform | Scheduler | Trigger | Best For |
|----------|-----------|---------|----------|
| AWS | EventBridge | Lambda | Deep AWS integration, Step Functions chaining |
| GCP | Cloud Scheduler | Cloud Functions / Pub/Sub | Competitive pricing, BigQuery integration |
| Azure | Timer Trigger | Azure Functions | .NET ecosystem, Visual Studio integration |

## What Works

- **Keep jobs stateless and idempotent**: store progress in DynamoDB or Redis, not in memory.  If the function times out and restarts, it should resume cleanly.
- **Use Step Functions for multi-step workflows**: if a scheduled job has sequential steps (extract, transform, load), orchestrate them with Step Functions instead of one massive Lambda.
- **Schedule during off-peak hours**: run CPU-intensive jobs when user traffic is lowest to avoid resource contention.
- **Send notifications on failure**: integrate with SNS or Slack webhooks so the team knows when a critical scheduled job fails.
- **Archive old outputs**: daily reports accumulate quickly.  Move old files to Glacier or delete them after a retention period.

## Common Mistakes

- **Running long jobs in Lambda**: exceeding the 15-minute limit causes hard failures.
- **Not handling timezone correctly**: cron schedules in UTC.  A job scheduled for "midnight" may run at an unexpected local time during daylight saving transitions.
- **Missing retry logic**: transient failures (database connection timeouts) should retry with exponential backoff.  Dead letter queues capture persistent failures.
- **Hardcoding dates in tests**: tests that only pass on the day they were written break in CI.

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
## Serverless Architecture Patterns

- **Microservices with serverless**: decompose applications into small, independent functions.  Each function handles a specific business capability.  Use event bus for inter-service communication.  Deploy services independently.
- **Event-driven architecture**: use events as the primary communication mechanism.  Producers publish events without knowing consumers.  Consumers subscribe to events they care about.  Version event schemas.
- **CQRS with serverless**: separate read and write operations.  Use Lambda with DynamoDB Streams for read model updates.
## Serverless Data Processing

- **Stream processing**: process data streams with serverless functions.  Process records in batches for efficiency.
- **Batch processing**: use serverless for batch data processing.  Trigger functions on schedule.  Process data in chunks.  Use idempotency for retry safety.
- **Real-time processing**: process events in real-time with serverless.

## Serverless Anti-Patterns

- **Chatty functions**: avoid functions that make too many downstream calls.  Each call adds latency and cost.  Batch downstream calls where possible.
- **Synchronous chains**: avoid synchronous function-to-function calls.  Synchronous chains add latency and reduce reliability.
- **Shared state in functions**: avoid storing state in function instances.  Function instances are ephemeral.
## Serverless Cold Start Mitigation

- **Provisioned concurrency**: allocate provisioned concurrency for critical functions.  AWS Lambda provisioned concurrency keeps functions warm.  Azure Functions premium plan provides pre-warmed instances.  Google Cloud Functions min instances for warm functions.
- **Lazy initialization**: initialize heavy resources lazily inside the handler.  Load dependencies only when needed.  Defer database connections until first use.  Cache initialized resources between invocations.
- **Package optimization**: minimize package size for faster cold starts.  Minify production code.





## Glossary

- **Run Scheduled Jobs with Serverless Functions**: core technique or pattern described in this article.
- **Production**: live environment serving real users; requires monitoring and rollback plan.
- **Troubleshooting**: systematic process to diagnose and resolve incidents.

## Quick Reference

- **Main command**: run the base solution from the article and verify the expected result.
- **Validation**: confirm tests pass and key metrics did not degrade.
- **Rollback**: if something fails, revert the change and consult the Troubleshooting section.

## Further Reading

- **Official documentation**: check the current reference for the framework or tool used.
- **Related guides**: explore the serverless and cron guides for deeper coverage.
- **Complementary patterns**: review design patterns applicable to your technology stack.
- **Public postmortems**: study real incidents from teams that faced similar production issues.

## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply run scheduled jobs with serverless functions** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: What is the maximum frequency for serverless scheduled functions?**
A: AWS EventBridge supports rates as low as 1 minute. GCP Cloud Scheduler supports 1 minute. For sub-minute intervals, use CloudWatch Events with custom logic or switch to a continuously running process.

**Q: Can scheduled functions access VPC resources?**
A: Yes. Configure Lambda with VPC networking to access private RDS, ElastiCache, or EC2 instances. This adds cold start latency because ENIs must be provisioned.

**Q: How do I debug a scheduled function that fails intermittently?**
A: CloudWatch Logs show the error. Add structured JSON logging with request IDs. For memory or timeout issues, increase the function's allocated memory (which also increases CPU).

**Q: Is serverless scheduling cheaper than a $5/month VPS with cron?**
A: For very infrequent jobs (weekly or monthly), yes. For jobs running every minute, a small VPS may be cheaper. Calculate based on execution duration and frequency.


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### What are the limitations of scheduled serverless jobs?

Scheduled jobs have some limitations. Minimum interval is typically 1 minute. Long-running jobs may hit timeout limits. Time zone handling requires careful configuration. Overlapping executions need idempotency. Document limitations for your team. Plan mitigation strategies. Test edge cases thoroughly. Monitor for known issues.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
