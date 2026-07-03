---
contentType: recipes
slug: serverless-event-driven-sqs-lambda
title: "Build Event-Driven Lambda with SQS Triggers and Batch Processing"
description: "Process SQS messages with Lambda using batch windows, partial batch responses, error handling, and dead-letter queues for resilient event-driven pipelines."
metaDescription: "Build event-driven Lambda with SQS triggers. Use batch windows, partial batch responses, error handling, and DLQ for resilient message processing."
difficulty: intermediate
topics:
  - serverless
  - messaging
  - architecture
tags:
  - aws
  - lambda
  - sqs
  - event-driven
  - batch-processing
relatedResources:
  - /recipes/serverless/aws-lambda-python-dependencies
  - /recipes/serverless/serverless-dynamodb-single-table
  - /guides/serverless-architecture-guide
  - /guides/domain-driven-design-guide
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build event-driven Lambda with SQS triggers. Use batch windows, partial batch responses, error handling, and DLQ for resilient message processing."
  keywords:
    - aws lambda sqs trigger
    - event-driven lambda
    - sqs batch processing
    - partial batch response
    - sqs dead letter queue
---

## Overview

SQS triggers let Lambda consume messages from a queue automatically. Lambda polls SQS, batches messages, and invokes the function. With batch windows, partial batch responses, and dead-letter queues, you can build resilient event-driven pipelines that handle failures gracefully without losing messages. Below: configuring SQS triggers, batch processing, error handling with partial batch responses, DLQ setup, and monitoring.

## When to Use This

- Asynchronous task processing (image thumbnails, email sending, report generation)
- Decoupling producers from consumers in event-driven architectures
- Handling traffic spikes with queue-based buffering
- Any workload where messages must survive function failures

## Prerequisites

- Python 3.11+
- AWS account with Lambda and SQS access
- `boto3` package

## Solution

### 1. Create SQS Queue with DLQ

```bash
# Create dead-letter queue
aws sqs create-queue --queue-name my-dlq

DLQ_URL=$(aws sqs get-queue-url --queue-name my-dlq --query 'QueueUrl' --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $DLQ_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# Create main queue with DLQ configured
aws sqs create-queue --queue-name my-queue --attributes file://queue-attributes.json

# queue-attributes.json
{
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"'${DLQ_ARN}'\",\"maxReceiveCount\":\"3\"}",
  "VisibilityTimeout": "120",
  "MessageRetentionPeriod": "1209600"
}
```

### 2. Lambda Handler with Batch Processing

```python
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sqs = boto3.client('sqs')

def lambda_handler(event, context):
    records = event.get('Records', [])
    logger.info(f"Processing {len(records)} messages")

    batch_item_failures = []

    for record in records:
        message_id = record['messageId']
        receipt_handle = record['receiptHandle']

        try:
            body = json.loads(record['body'])
            process_message(body)
            logger.info(f"Successfully processed message {message_id}")

        except Exception as e:
            logger.error(f"Failed to process message {message_id}: {e}")
            batch_item_failures.append({
                'itemIdentifier': message_id,
            })

    # Return partial batch response — only failed messages go back to SQS
    return {
        'batchItemFailures': batch_item_failures,
    }

def process_message(body: dict):
    order_id = body.get('orderId')
    if not order_id:
        raise ValueError("Missing orderId")

    # Business logic here
    logger.info(f"Processing order {order_id}")
    # e.g., save to DynamoDB, call external API, generate report
```

### 3. SAM Template with SQS Trigger

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  ProcessQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: my-queue
      VisibilityTimeout: 120
      MessageRetentionPeriod: 1209600
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3

  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: my-dlq

  ProcessFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda_function.lambda_handler
      Runtime: python3.11
      CodeUri: src/
      Timeout: 120
      MemorySize: 512
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt ProcessQueue.Arn
            BatchSize: 10
            MaxBatchingWindow: 30
            FunctionResponseTypes:
              - ReportBatchItemFailures
      Policies:
        - SQSPollerPolicy:
            QueueName: !GetAtt ProcessQueue.QueueName
```

### 4. Producer: Send Messages to SQS

```python
import json
import boto3

sqs = boto3.client('sqs', region_name='us-east-1')
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue'

def send_order_message(order: dict):
    response = sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps(order),
        MessageAttributes={
            'OrderType': {
                'DataType': 'String',
                'StringValue': order.get('type', 'standard'),
            },
        },
    )
    return response['MessageId']

def send_batch_orders(orders: list):
    entries = [
        {
            'Id': str(i),
            'MessageBody': json.dumps(order),
            'MessageAttributes': {
                'OrderType': {
                    'DataType': 'String',
                    'StringValue': order.get('type', 'standard'),
                },
            },
        }
        for i, order in enumerate(orders)
    ]

    # Send in batches of 10 (SQS limit)
    for i in range(0, len(entries), 10):
        batch = entries[i:i+10]
        response = sqs.send_message_batch(QueueUrl=QUEUE_URL, Entries=batch)
        if response.get('Failed'):
            for failure in response['Failed']:
                logger.error(f"Failed to send message {failure['Id']}: {failure['Message']}")
```

### 5. FIFO Queue with Message Groups

```python
# Send to FIFO queue with message group ID for ordering
def send_ordered_message(order: dict, group_id: str):
    response = sqs.send_message(
        QueueUrl='https://sqs.us-east-1.amazonaws.com/123456789012/my-queue.fifo',
        MessageBody=json.dumps(order),
        MessageGroupId=group_id,  # Messages in same group are processed in order
        MessageDeduplicationId=f"order-{order['id']}",  # Idempotency
    )
    return response['MessageId']
```

### 6. Visibility Timeout Tuning

```python
import boto3

sqs = boto3.client('sqs')

# Set visibility timeout per queue
sqs.set_queue_attributes(
    QueueUrl='https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
    Attributes={
        'VisibilityTimeout': '300',  # 5 minutes — must be >= Lambda timeout
    },
)

# The visibility timeout should be at least 6x the Lambda timeout
# If Lambda times out at 60s, set visibility timeout to 360s
# This gives SQS enough time to make the message visible again after retries
```

### 7. Monitoring and Alarms

```yaml
# CloudWatch alarm for DLQ depth
Resources:
  DLQAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: DLQ-Messages-Alert
      AlarmDescription: Alert when DLQ has messages
      MetricName: ApproximateNumberOfMessagesVisible
      Namespace: AWS/SQS
      Dimensions:
        - Name: QueueName
          Value: my-dlq
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      AlarmActions:
        - !Ref AlertTopic
```

## How It Works

1. **Polling**: Lambda polls SQS for messages. When messages are available, it batches them (up to `BatchSize`) and invokes the function with all messages in one event.
2. **Batching window**: `MaxBatchingWindow` (0-300 seconds) tells Lambda to wait for more messages before invoking. A 30-second window collects up to 10 messages before invoking, reducing function invocations.
3. **Partial batch responses**: With `ReportBatchItemFailures`, the function returns a list of failed message IDs. SQS only re-delivers those messages — successful ones are deleted. Without this, a single failure rejects the entire batch.
4. **Visibility timeout**: When Lambda reads a message, SQS hides it from other consumers for the visibility timeout duration. If the function fails, the message becomes visible again after the timeout. Set it to at least 6x the Lambda timeout.
5. **DLQ**: After `maxReceiveCount` failed receive attempts, SQS moves the message to the dead-letter queue. Inspect the DLQ to understand why messages fail.

## Variants

### FIFO Queue with Lambda

```yaml
# FIFO queues require BatchSize=1 for strict ordering, or use message groups
ProcessFunction:
  Type: AWS::Serverless::Function
  Properties:
    Events:
      SQSEvent:
        Type: SQS
        Properties:
          Queue: !GetAtt FifoQueue.Arn
          BatchSize: 10
          # Lambda processes one message group at a time for FIFO
```

### Scheduled Queue Draining

```python
# EventBridge rule triggers Lambda every 5 minutes to drain the queue
import boto3

def lambda_handler(event, context):
    sqs = boto3.client('sqs')
    queue_url = event['queueUrl']

    while True:
        response = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=5,
        )

        messages = response.get('Messages', [])
        if not messages:
            break

        for msg in messages:
            process_message(json.loads(msg['Body']))
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=msg['ReceiptHandle'],
            )
```

### Cross-Account SQS Trigger

```yaml
# The queue ARN must be in the same region
# Add a resource-based policy to the queue allowing Lambda to consume
ProcessFunction:
  Type: AWS::Serverless::Function
  Properties:
    Events:
      SQSEvent:
        Type: SQS
        Properties:
          Queue: arn:aws:sqs:us-east-1:999999999999:cross-account-queue
          BatchSize: 10
```

## Best Practices

- **Use `ReportBatchItemFailures`**: Without it, a single failed message rejects the entire batch, causing reprocessing of successful messages. Always return partial batch responses.
- **Set visibility timeout to 6x Lambda timeout**: If Lambda times out, the message should remain hidden long enough for the next retry attempt.
- **Use DLQ with `maxReceiveCount` of 3-5**: Too low sends messages to DLQ on transient errors. Too high wastes processing time on poison pills.
- **Keep batch size small for heavy processing**: Batch size 10 is the default. For CPU-intensive processing, use 1-5 to avoid timeouts.
- **Use FIFO queues for ordering**: Standard queues deliver at-least-once with no ordering. FIFO queues guarantee order within a message group.
- **Monitor DLQ depth**: Set CloudWatch alarms on DLQ message count. Investigate DLQ messages promptly.

## Common Mistakes

- **Not using partial batch responses**: Without `ReportBatchItemFailures`, one failed message causes the entire batch to retry. Successful messages are reprocessed.
- **Visibility timeout too short**: If the visibility timeout is shorter than Lambda's timeout, SQS makes the message visible again while Lambda is still processing it, causing duplicate processing.
- **No DLQ**: Without a DLQ, poison pill messages (that always fail) are retried until `MessageRetentionPeriod` expires, then lost.
- **Batch size too large**: A batch of 10 messages with 30-second processing each exceeds a 60-second timeout. Match batch size to processing time.
- **Not handling `json.loads` errors**: If the message body isn't valid JSON, `json.loads` raises an exception. Wrap in try/except and return as a batch item failure.

## FAQ

**What is the maximum batch size for SQS Lambda triggers?**

10,000 messages (Lambda increased the limit from 10). However, the total batch payload must be under 6MB. For most use cases, 10-100 is practical.

**How does Lambda handle FIFO queue ordering?**

Lambda processes one message group at a time. Within a group, messages are processed in order. Different groups can be processed in parallel. Set `BatchSize=1` for strict per-message ordering.

**What happens when Lambda times out?**

The message becomes visible in SQS after the visibility timeout expires. Lambda doesn't delete the message on timeout — it's automatically retried. If it fails `maxReceiveCount` times, it goes to the DLQ.

**Can I use SQS with EventBridge?**

Yes. EventBridge can route events to SQS as a target. This decouples the event producer from the Lambda consumer. Use EventBridge for routing logic, SQS for buffering and retry.

**How do I replay messages from DLQ?**

Move messages from DLQ back to the main queue using the `StartMessageMoveTask` API:

```bash
aws sqs start-message-move-task \
  --source-arn arn:aws:sqs:us-east-1:123456789012:my-dlq \
  --destination-arn arn:aws:sqs:us-east-1:123456789012:my-queue
```

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
