---


contentType: patterns
slug: serverless-fanout-pattern
title: "Serverless Fanout Pattern"
description: "Broadcast a single event to multiple independent consumers via SNS, EventBridge, or SQS so each consumer processes the event without coupling."
metaDescription: "Serverless fanout pattern: broadcast one event to many Lambda consumers via SNS or EventBridge. Decouple producers from consumers in AWS examples."
difficulty: intermediate
topics:
  - serverless
  - design
tags:
  - serverless
  - fanout
  - pattern
  - sns
  - eventbridge
  - sqs
  - pub-sub
  - python
  - typescript
relatedResources:
  - /patterns/serverless-function-composition-pattern
  - /patterns/serverless-event-sourcing-pattern
  - /patterns/serverless-throttling-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Serverless fanout pattern: broadcast one event to many Lambda consumers via SNS or EventBridge. Decouple producers from consumers in AWS examples."
  keywords:
    - serverless fanout
    - sns fanout lambda
    - eventbridge fanout
    - sqs fanout pattern
    - serverless pub sub
    - event broadcast serverless


---

# Serverless Fanout Pattern

## Overview

The fanout pattern broadcasts a single event to multiple independent consumers. A producer publishes one message to a topic (SNS, EventBridge). The topic delivers a copy to each subscriber (SQS queue, Lambda, HTTP endpoint). Each consumer processes the event independently, at its own pace, without affecting others.

This decouples producers from consumers. The producer does not know how many consumers exist or what they do. Adding a new consumer requires only subscribing to the topic, not modifying the producer. If one consumer fails, others continue processing.

## When to Use

- One event must trigger multiple independent actions (order placed: update inventory, send email, generate invoice)
- You want to add or remove consumers without modifying the producer
- Consumers process at different speeds and should not block each other
- You need reliable delivery: if a consumer is down, the event should wait and retry
- Different teams own different consumers

## Solution

### SNS + SQS Fanout (Python CDK)

```python
from aws_cdk import (
    Stack,
    aws_sns as sns,
    aws_sns_subscriptions as subs,
    aws_sqs as sqs,
    aws_lambda as lambda_,
    aws_lambda_event_sources as events,
    Duration,
)
from constructs import Construct

class FanoutStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # SNS topic — the fanout point
        topic = sns.Topic(self, "OrderEventsTopic",
            topic_name="order-events",
            display_name="Order Events",
        )

        # Consumer 1: Email notification
        email_queue = sqs.Queue(self, "EmailQueue",
            visibility_timeout=Duration.seconds(300),
            retention_period=Duration.days(7),
        )
        topic.add_subscription(subs.SqsSubscription(email_queue))

        email_lambda = lambda_.Function(self, "EmailConsumer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="email.handler",
            code=lambda_.Code.from_asset("lambda/email"),
            timeout=Duration.seconds(60),
        )
        email_lambda.add_event_source(events.SqsEventSource(email_queue, batch_size=10))

        # Consumer 2: Inventory update
        inventory_queue = sqs.Queue(self, "InventoryQueue",
            visibility_timeout=Duration.seconds(300),
            retention_period=Duration.days(7),
        )
        topic.add_subscription(subs.SqsSubscription(inventory_queue))

        inventory_lambda = lambda_.Function(self, "InventoryConsumer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="inventory.handler",
            code=lambda_.Code.from_asset("lambda/inventory"),
            timeout=Duration.seconds(60),
        )
        inventory_lambda.add_event_source(events.SqsEventSource(inventory_queue, batch_size=10))

        # Consumer 3: Analytics
        analytics_queue = sqs.Queue(self, "AnalyticsQueue",
            visibility_timeout=Duration.seconds(300),
        )
        topic.add_subscription(subs.SqsSubscription(analytics_queue))

        analytics_lambda = lambda_.Function(self, "AnalyticsConsumer",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="analytics.handler",
            code=lambda_.Code.from_asset("lambda/analytics"),
            timeout=Duration.seconds(60),
        )
        analytics_lambda.add_event_source(events.SqsEventSource(analytics_queue, batch_size=100))
```

### Publishing Events (Python)

```python
import boto3
import json

sns = boto3.client('sns')

def publish_order_event(order_id: str, event_type: str, data: dict):
    message = {
        "eventType": event_type,
        "orderId": order_id,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }

    response = sns.publish(
        TopicArn="arn:aws:sns:us-east-1:123456789012:order-events",
        Message=json.dumps(message),
        Subject=f"Order {event_type}",
        MessageAttributes={
            "eventType": {"DataType": "String", "StringValue": event_type},
        },
    )

    return response["MessageId"]
```

### Lambda Consumer Handler (Python)

```python
import json

def handler(event, context):
    for record in event["Records"]:
        # SQS wraps SNS message
        sns_message = json.loads(record["body"])
        message = json.loads(sns_message["Message"])

        event_type = message["eventType"]
        order_id = message["orderId"]
        data = message["data"]

        if event_type == "ORDER_PLACED":
            send_order_email(order_id, data)
        elif event_type == "ORDER_SHIPPED":
            send_shipping_notification(order_id, data)

def send_order_email(order_id, data):
    # Email sending logic
    pass
```

### EventBridge Fanout (TypeScript)

```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({ region: 'us-east-1' });

interface OrderEvent {
  eventType: string;
  orderId: string;
  customerId: string;
  total: number;
  items: any[];
}

async function publishOrderEvent(event: OrderEvent): Promise<void> {
  await eventBridge.send(new PutEventsCommand({
    Entries: [{
      EventBusName: 'default',
      Source: 'order.service',
      DetailType: event.eventType,
      Detail: JSON.stringify(event),
    }],
  }));
}

// Consumer Lambda with event pattern filtering
// EventBridge rule: { "source": ["order.service"], "detail-type": ["ORDER_PLACED"] }
export const emailConsumerHandler = async (event: any): Promise<void> => {
  const orderEvent: OrderEvent = JSON.parse(event.detail);

  console.log(`Sending email for order ${orderEvent.orderId}`);
  // Email logic here
};

// EventBridge rule: { "source": ["order.service"], "detail-type": ["ORDER_PLACED", "ORDER_SHIPPED"] }
export const analyticsConsumerHandler = async (event: any): Promise<void> => {
  const orderEvent: OrderEvent = JSON.parse(event.detail);

  console.log(`Recording analytics for ${orderEvent.eventType}`);
  // Analytics logic here
};
```

### CDK for EventBridge Fanout (TypeScript)

```typescript
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class FanoutStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Consumer functions
    const emailConsumer = new lambda.Function(this, 'EmailConsumer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'email.handler',
      code: lambda.Code.fromAsset('lambda/email'),
    });

    const inventoryConsumer = new lambda.Function(this, 'InventoryConsumer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'inventory.handler',
      code: lambda.Code.fromAsset('lambda/inventory'),
    });

    const analyticsConsumer = new lambda.Function(this, 'AnalyticsConsumer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'analytics.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
    });

    // Rules with event pattern filtering
    const orderPlacedRule = new events.Rule(this, 'OrderPlacedRule', {
      eventPattern: {
        source: ['order.service'],
        detailType: ['ORDER_PLACED'],
      },
    });

    // Fanout: one event triggers multiple targets
    orderPlacedRule.addTarget(new targets.LambdaFunction(emailConsumer));
    orderPlacedRule.addTarget(new targets.LambdaFunction(inventoryConsumer));
    orderPlacedRule.addTarget(new targets.LambdaFunction(analyticsConsumer));
  }
}
```

## Explanation

The fanout pattern works by inserting a topic between the producer and consumers:

1. **Producer** publishes one message to the topic (SNS or EventBridge). The producer does not know who subscribes.

2. **Topic** delivers a copy of the message to each subscriber. SNS pushes to SQS queues, Lambda functions, or HTTP endpoints. EventBridge evaluates rules and invokes matching targets.

3. **SQS queue** (optional but recommended) buffers messages for each consumer. If the consumer Lambda is down or rate-limited, the message waits in the queue. This decouples consumer availability from the producer.

4. **Consumer** processes the message from its queue. If processing fails, the message returns to the queue for retry. After max retries, it moves to a dead-letter queue.

The key benefit is isolation: if the email consumer is slow or fails, the inventory and analytics consumers are unaffected. Each consumer has its own queue, retry policy, and scaling.

## Variants

| Approach | Topic | Best For |
|----------|-------|----------|
| SNS + SQS | SNS topic, SQS per consumer | Reliable delivery, buffering |
| EventBridge | Event bus with rules | Content-based filtering, multiple event types |
| SNS direct to Lambda | SNS topic, Lambda subscription | Simple, no buffering needed |
| Kinesis fanout | Kinesis stream, consumers | High-throughput streaming |
| SNS + SQS + DLQ | SNS, SQS, dead-letter queue | Production-grade with error handling |

## Best Practices


- For a deeper guide, see [Serverless Event Sourcing Pattern](/patterns/serverless-event-sourcing-pattern/).

- **Use SQS between SNS and Lambda** — direct SNS-to-Lambda invocations fail if Lambda is throttled. SQS buffers messages and retries. This is the recommended production pattern.
- **Set visibility timeout to 6x Lambda timeout** — if Lambda takes 60s, set SQS visibility timeout to 360s. This prevents duplicate processing while a long-running invocation is in progress.
- **Use dead-letter queues** — after max receive count, move messages to a DLQ for inspection. Do not lose events silently.
- **Filter events at the topic** — SNS supports message attribute filtering. EventBridge supports content-based filtering. Only deliver relevant events to each consumer.
- **Make consumers idempotent** — SQS may deliver a message twice (at-least-once). Consumers must handle duplicates gracefully using idempotency keys.

## Common Mistakes

- **Direct SNS to Lambda without SQS** — if Lambda is throttled, SNS retries with backoff but may drop messages after max retries. Use SQS for reliable delivery.
- **No dead-letter queue** — failed messages disappear after max retries. Always configure a DLQ to inspect and reprocess failures.
- **Visibility timeout too short** — if Lambda takes longer than the visibility timeout, SQS redelivers the message, causing duplicate processing. Set it to 6x the Lambda timeout.
- **Coupling producer to consumers** — if the producer checks consumer status or sends different messages to different consumers, the fanout is not truly decoupled. The producer should publish one event and let the topic handle delivery.
- **No idempotency in consumers** — SQS at-least-once delivery means consumers may process the same message twice. Use idempotency keys to prevent duplicate side effects.

## Frequently Asked Questions

### What is the difference between SNS fanout and EventBridge fanout?

SNS delivers every message to every subscriber. EventBridge evaluates rules and only delivers to targets matching the event pattern. EventBridge is better for content-based filtering; SNS is simpler for unconditional fanout.

### Should I use SQS between SNS and Lambda?

Yes, for production. SQS buffers messages when Lambda is throttled or down. Without SQS, SNS retries with backoff but may drop messages after the retry policy is exhausted. SQS provides reliable delivery with retry and DLQ support.

### How do I filter events in SNS?

Use message attributes. Set `FilterPolicy` on the subscription to only receive messages matching specific attribute values. For example, an email consumer subscribes with `{"eventType": ["ORDER_PLACED"]}` and only receives order-placed events.

### How do I handle poison messages?

Configure a dead-letter queue on the SQS queue. After `maxReceiveCount` (e.g. 5), the message moves to the DLQ. Monitor the DLQ and investigate why the message could not be processed. Fix the consumer or the message format, then redrive from the DLQ.
