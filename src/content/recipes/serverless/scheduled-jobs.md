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
  - scheduled-jobs
  - cron
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/event-driven-functions
  - /recipes/cron-jobs
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

- Replacing legacy cron jobs running on EC2 or virtual machines
- Generating daily, weekly, or monthly reports from application data
- Cleaning up old logs, temporary files, or expired database records
- Warming caches or pre-computing aggregations before peak traffic
- Sending scheduled notifications, reminders, or newsletters
- Running database maintenance (VACUUM, index rebuilds, statistics updates)

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

- **Cron expressions**: The `cron(0 2 * * ? *)` syntax means "at 2:00 AM UTC every day." EventBridge supports standard cron with a `?` wildcard for day-of-week or day-of-month.
- **Idempotency**: Scheduled functions may run twice if an error occurs during the first invocation and EventBridge retries. Design jobs to be safe to run multiple times (e.g., use UPSERT, not INSERT).
- **Timeouts**: Lambda has a 15-minute maximum execution time. For longer jobs, use Step Functions to orchestrate multiple Lambda invocations or switch to AWS Batch.
- **Monitoring**: CloudWatch Logs captures function output. Set alarms on error rates and execution duration. Use CloudWatch Insights to query scheduled job history.

## Variants

| Platform | Scheduler | Trigger | Best For |
|----------|-----------|---------|----------|
| AWS | EventBridge | Lambda | Deep AWS integration, Step Functions chaining |
| GCP | Cloud Scheduler | Cloud Functions / Pub/Sub | Competitive pricing, BigQuery integration |
| Azure | Timer Trigger | Azure Functions | .NET ecosystem, Visual Studio integration |

## Best Practices

- **Keep jobs stateless and idempotent**: store progress in DynamoDB or Redis, not in memory. If the function times out and restarts, it should resume cleanly.
- **Use Step Functions for multi-step workflows**: if a scheduled job has sequential steps (extract, transform, load), orchestrate them with Step Functions instead of one massive Lambda.
- **Schedule during off-peak hours**: run CPU-intensive jobs when user traffic is lowest to avoid resource contention.
- **Send notifications on failure**: integrate with SNS or Slack webhooks so the team knows when a critical scheduled job fails.
- **Archive old outputs**: daily reports accumulate quickly. Move old files to Glacier or delete them after a retention period.

## Common Mistakes

- **Running long jobs in Lambda**: exceeding the 15-minute limit causes hard failures. Use Batch, ECS, or Step Functions for hours-long processing.
- **Not handling timezone correctly**: cron schedules in UTC. A job scheduled for "midnight" may run at an unexpected local time during daylight saving transitions.
- **Missing retry logic**: transient failures (database connection timeouts) should retry with exponential backoff. Dead letter queues capture persistent failures.
- **Hardcoding dates in tests**: tests that only pass on the day they were written break in CI. Use dependency injection for the current date/time.

## Frequently Asked Questions

**Q: What is the maximum frequency for serverless scheduled functions?**
A: AWS EventBridge supports rates as low as 1 minute. GCP Cloud Scheduler supports 1 minute. For sub-minute intervals, use CloudWatch Events with custom logic or switch to a continuously running process.

**Q: Can scheduled functions access VPC resources?**
A: Yes. Configure Lambda with VPC networking to access private RDS, ElastiCache, or EC2 instances. This adds cold start latency because ENIs must be provisioned.

**Q: How do I debug a scheduled function that fails intermittently?**
A: CloudWatch Logs show the error. Add structured JSON logging with request IDs. For memory or timeout issues, increase the function's allocated memory (which also increases CPU).

**Q: Is serverless scheduling cheaper than a $5/month VPS with cron?**
A: For very infrequent jobs (weekly or monthly), yes. For jobs running every minute, a small VPS may be cheaper. Calculate based on execution duration and frequency.

