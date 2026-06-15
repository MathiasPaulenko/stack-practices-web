---
contentType: recipes
slug: event-driven-functions
title: "Build Event-Driven Serverless Architectures"
description: "How to design loosely coupled systems using serverless functions triggered by events from message queues, databases, and webhooks."
metaDescription: "Learn event-driven serverless architecture. Design loosely coupled systems with Lambda, SQS, EventBridge, and webhook triggers for scalable async processing."
difficulty: intermediate
topics:
  - serverless
tags:
  - event-driven
  - serverless
  - lambda
  - sqs
  - eventbridge
  - async-processing
  - microservices
  - aws
relatedResources:
  - /recipes/serverless-api-gateway
  - /recipes/webhooks
  - /recipes/middleware
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn event-driven serverless architecture. Design loosely coupled systems with Lambda, SQS, EventBridge, and webhook triggers for scalable async processing."
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

- Processing asynchronous workloads that do not need immediate responses (image processing, report generation, email sending)
- Decoupling microservices so they can be deployed, scaled, and failed independently
- Building systems that must handle traffic spikes without provisioning capacity upfront
- Reacting to changes in data (database CDC) or external systems (webhooks, file uploads)
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

## Best Practices

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

## Frequently Asked Questions

**Q: How is event-driven different from request-response?**
A: Request-response (HTTP REST) is synchronous: the caller waits for a result. Event-driven is asynchronous: the producer fires an event and moves on. Consumers process when ready.

**Q: Can I use event-driven architecture with non-AWS providers?**
A: Yes. Azure Functions with Event Grid, Google Cloud Functions with Pub/Sub, and Apache Kafka on any cloud all support event-driven patterns.

**Q: How do I trace a request across multiple event-driven functions?**
A: Use correlation IDs. Generate a unique ID at the entry point and propagate it through every event. CloudWatch, X-Ray, or OpenTelemetry can then trace the full chain.

**Q: What is the maximum event size?**
A: SQS messages are limited to 256 KB. EventBridge events are limited to 256 KB. For larger payloads, store the data in S3 and include a reference in the event.

