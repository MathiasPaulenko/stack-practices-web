---
contentType: recipes
slug: dead-letter-queue
title: "Dead Letter Queues"
description: "Handle failed messages gracefully with dead letter queues, retry policies, and poison pill detection in message-driven architectures."
metaDescription: "Dead letter queue patterns: poison pill detection, retry limits, message replay, alerting on DLQ depth, and recovery strategies for async systems."
difficulty: intermediate
topics:
  - messaging
tags:
  - dead-letter-queue
  - messaging
  - resilience
  - error-handling
relatedResources:
  - /recipes/event-driven-microservices
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /docs/api-error-response-template
  - /patterns/bulkhead-pattern
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Dead letter queue patterns: poison pill detection, retry limits, message replay, alerting on DLQ depth, and recovery strategies for async systems."
  keywords:
    - dead-letter-queue
    - messaging
    - resilience
    - error-handling
---
## Overview

Dead letter queues (DLQs) capture messages that fail processing after repeated attempts in [message-driven](/guides/architecture/event-driven-architecture-guide) systems. Without them, failed messages would block the queue or be lost entirely. A well-designed DLQ system distinguishes between poison pills (permanently bad messages) and transient failures, enabling operators to replay, inspect, or discard problematic messages without impacting the main processing flow.

## When to Use

Use this resource when:
- Message consumers encounter unrecoverable errors (malformed payloads, missing references)
- You need to prevent one bad message from blocking an entire queue partition
- Operations teams require visibility into failed messages for manual intervention
- Compliance requires audit trails of all processed and failed messages. Use a [data retention policy](/guides/databases/database-design-guide).

## Solution

### SQS DLQ Configuration (AWS CLI)

```bash
# Create main queue and DLQ
aws sqs create-queue --queue-name orders-queue
aws sqs create-queue --queue-name orders-dlq

# Get queue URLs
QUEUE_URL=$(aws sqs get-queue-url --queue-name orders-queue --query 'QueueUrl' --output text)
DLQ_URL=$(aws sqs get-queue-url --queue-name orders-dlq --query 'QueueUrl' --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url $DLQ_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# Set redrive policy: send to DLQ after 3 failed receives
aws sqs set-queue-attributes \
  --queue-url $QUEUE_URL \
  --attributes '{
    "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"'$DLQ_ARN'\\",\\"maxReceiveCount\\":3}"
  }'
```

### RabbitMQ Dead Letter Exchange (Python + pika)

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# DLX and DLQ
channel.exchange_declare(exchange='orders.dlx', exchange_type='direct')
channel.queue_declare(queue='orders-dlq', durable=True)
channel.queue_bind(queue='orders-dlq', exchange='orders.dlx', routing_key='failed')

# Main queue with TTL and dead-letter routing
args = {
    'x-dead-letter-exchange': 'orders.dlx',
    'x-dead-letter-routing-key': 'failed',
    'x-message-ttl': 300000  # 5 minutes
}
channel.queue_declare(queue='orders', durable=True, arguments=args)

# Reject a message to send to DLQ
channel.basic_reject(delivery_tag=method.delivery_tag, requeue=False)
```

### Kafka Dead Letter Topic (Node.js + KafkaJS)

```javascript
const { Kafka } = require('kafkajs');
const kafka = new Kafka({ brokers: ['localhost:9092'] });

const consumer = kafka.consumer({ groupId: 'order-processors' });

await consumer.connect();
await consumer.subscribe({ topic: 'orders', fromBeginning: false });

const producer = kafka.producer();
await producer.connect();

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      await processOrder(JSON.parse(message.value));
    } catch (err) {
      // Send to DLQ with error metadata
      await producer.send({
        topic: 'orders-dlq',
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            'error.type': err.name,
            'error.message': err.message,
            'original.topic': topic,
            'original.partition': String(partition),
            'original.offset': String(message.offset),
            'retry.count': '3'
          }
        }]
      });
    }
  }
});
```

## Explanation

**DLQ trigger conditions**:

| Condition | When to DLQ | Action |
|-----------|-------------|--------|
| Max retries exceeded | After N failed attempts | Move to DLQ |
| Unparseable message | Invalid JSON, schema mismatch | Move immediately |
| Missing dependency | Referenced record doesn't exist | Retry, then DLQ |
| Business rule violation | Order for non-existent product | Move immediately |

**DLQ monitoring**:
- **Depth alerting**: DLQ > 10 messages triggers PagerDuty
- **Age alerting**: Message in DLQ > 24 hours needs investigation
- **Replay tooling**: Admin UI to reprocess or purge DLQ messages
- **Correlation**: Link DLQ message to original trace ID. See [distributed tracing](/recipes/observability/distributed-tracing).

## Variants

| Broker | DLQ Mechanism | Configuration |
|--------|---------------|---------------|
| AWS SQS | Redrive policy | maxReceiveCount + target ARN |
| RabbitMQ | Dead letter exchange | x-dead-letter-exchange |
| Kafka | Consumer-managed | Separate topic + producer logic |
| Azure SB | Forwarding | maxDeliveryCount + forwardTo |
| Google Pub/Sub | Dead letter topic | deadLetterPolicy.maxDeliveryAttempts |

## What Works

- **Set reasonable retry counts**: 3-5 attempts balances recovery time against queue pressure
- **Include full context in DLQ**: Original headers, retry count, error type, and stack trace
- **Separate DLQs by severity**: Validation errors vs. infrastructure failures need different handling
- **Monitor DLQ depth as a metric**: It's a leading indicator of system health. See [metrics collection](/recipes/observability/metrics-collection).
- **Automate replay with caution**: Replay after fixing the bug; replaying blindly amplifies failures

## Common Mistakes

1. **No DLQ at all**: Failed messages silently disappear or block consumers forever
2. **Infinite retry loops**: Requeuing without a max count creates perpetual processing. Use [retry with exponential backoff](/recipes/architecture/retry-backoff).
3. **Ignoring DLQ messages**: The DLQ becomes a dumping ground that nobody monitors
4. **No dead-letter reason**: Operators can't distinguish "bad JSON" from "database down"
5. **Shared DLQ for all topics**: One poison pill from topic A doesn't belong with topic B's failures

## Frequently Asked Questions

**Q: Should I automatically replay DLQ messages?**
A: Only after identifying and fixing the root cause. Blind replay wastes resources and may re-trigger the same error.

**Q: How long should I keep DLQ messages?**
A: Longer than your incident response SLA. 7-14 days is typical; archive to cheap storage beyond that.

**Q: What's the difference between a DLQ and a retry queue?**
A: [Retry queues](/recipes/architecture/retry-backoff) hold messages for later reprocessing. DLQs hold messages that have exhausted all retries.
