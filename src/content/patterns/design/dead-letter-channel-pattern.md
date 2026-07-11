---
contentType: patterns
slug: dead-letter-channel-pattern
title: "Dead Letter Channel Pattern"
description: "Route unprocessable messages to a separate dead letter queue for inspection and replay. Prevent poison messages from blocking the main queue indefinitely."
metaDescription: "Route unprocessable messages to a dead letter queue for inspection and replay. Prevent poison messages from blocking the main queue indefinitely."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - dead-letter-queue
  - pattern
  - design-pattern
  - poison-message
  - error-handling
  - message-queue
  - dlq
relatedResources:
  - /patterns/design/message-queue-load-leveling-pattern
  - /patterns/design/message-deferral-pattern
  - /patterns/design/message-deduplication-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Route unprocessable messages to a dead letter queue for inspection and replay. Prevent poison messages from blocking the main queue indefinitely."
  keywords:
    - dead letter queue pattern
    - poison message handling
    - dlq message queue
    - pattern design
---

## Overview

When a message consistently fails processing, retrying it forever blocks the consumer and wastes resources. This is called a poison message. The Dead Letter Channel pattern routes messages that exceed a retry threshold to a separate queue (the dead letter queue or DLQ) for later inspection, debugging, and manual or automated replay.

## When to Use

- Messages fail repeatedly and cannot be processed (malformed payload, missing dependencies, invalid state)
- You need to preserve failed messages for debugging and auditing
- You want to unblock the main queue so healthy messages continue processing
- You need to replay failed messages after fixing the underlying issue

## Solution

### Python (SQS + boto3)

```python
import boto3
import json

sqs = boto3.client("sqs", endpoint_url="http://localhost:4566")  # LocalStack

MAIN_QUEUE_URL = "http://localhost:4566/000000000000/main-queue"
DLQ_URL = "http://localhost:4566/000000000000/dead-letter-queue"
MAX_RETRIES = 3

def process_message(message):
    body = json.loads(message["Body"])
    attempt = message.get("Attributes", {}).get("ApproximateReceiveCount", "1")
    attempt = int(attempt)

    try:
        result = handle_order(body)
        return result
    except Exception as e:
        if attempt >= MAX_RETRIES:
            # Move to dead letter queue
            sqs.send_message(
                QueueUrl=DLQ_URL,
                MessageBody=message["Body"],
                MessageAttributes={
                    "failure_reason": {"StringValue": str(e), "DataType": "String"},
                    "original_queue": {"StringValue": MAIN_QUEUE_URL, "DataType": "String"},
                    "attempt_count": {"StringValue": str(attempt), "DataType": "Number"},
                },
            )
            print(f"Moved message {message['MessageId']} to DLQ after {attempt} attempts")
        else:
            # Let SQS redeliver after visibility timeout
            print(f"Attempt {attempt} failed: {e}. Will retry.")
        raise

def handle_order(body):
    if body.get("order_id") is None:
        raise ValueError("Missing order_id")
    print(f"Processing order {body['order_id']}")
    return {"status": "done"}
```

### JavaScript (RabbitMQ + amqplib)

```javascript
import amqp from "amqplib";

const MAX_RETRIES = 3;

async function setupQueues(channel) {
  // Dead letter exchange on main queue
  await channel.assertExchange("dlx", "direct", { durable: true });
  await channel.assertQueue("main-queue", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "dlx",
      "x-dead-letter-routing-key": "dead",
    },
  });
  await channel.assertQueue("dead-letter-queue", { durable: true });
  await channel.bindQueue("dead-letter-queue", "dlx", "dead");

  // Retry queue with exponential backoff
  await channel.assertQueue("retry-queue", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": "main-queue",
      "x-message-ttl": 10000, // 10 second delay before retry
    },
  });
}

async function consume() {
  const conn = await amqp.connect("amqp://localhost");
  const channel = await conn.createChannel();
  await setupQueues(channel);

  channel.consume("main-queue", async (msg) => {
    if (!msg) return;

    const headers = msg.properties.headers || {};
    const retryCount = headers["x-retry-count"] || 0;

    try {
      const body = JSON.parse(msg.content.toString());
      if (!body.orderId) throw new Error("Missing orderId");
      console.log(`Processing order ${body.orderId}`);
      channel.ack(msg);
    } catch (err) {
      if (retryCount >= MAX_RETRIES) {
        // Route to dead letter queue
        console.log(`Moving to DLQ after ${retryCount} retries: ${err.message}`);
        channel.ack(msg); // Ack to remove from main queue
        channel.publish("dlx", "dead", msg.content, {
          headers: {
            ...headers,
            "x-death-reason": err.message,
            "x-retry-count": retryCount,
          },
        });
      } else {
        // Route to retry queue
        console.log(`Retry ${retryCount + 1}/${MAX_RETRIES}: ${err.message}`);
        channel.ack(msg);
        channel.sendToQueue("retry-queue", msg.content, {
          headers: { "x-retry-count": retryCount + 1 },
        });
      }
    }
  });
}

consume();
```

### Java (Spring + RabbitMQ)

```java
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderConsumer {

    private final RabbitTemplate rabbitTemplate;
    private static final int MAX_RETRIES = 3;

    public OrderConsumer(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = "main-queue")
    public void processOrder(Order order, Message message) {
        Integer retryCount = (Integer) message.getMessageProperties()
            .getHeader("x-retry-count");
        if (retryCount == null) retryCount = 0;

        try {
            if (order.getOrderId() == null) {
                throw new IllegalArgumentException("Missing orderId");
            }
            System.out.println("Processing order " + order.getOrderId());
        } catch (Exception e) {
            if (retryCount >= MAX_RETRIES) {
                System.out.println("Moving to DLQ: " + e.getMessage());
                rabbitTemplate.convertAndSend("dlx", "dead", order, m -> {
                    m.getMessageProperties().setHeader("x-death-reason", e.getMessage());
                    m.getMessageProperties().setHeader("x-retry-count", retryCount);
                    return m;
                });
            } else {
                System.out.println("Retry " + (retryCount + 1) + "/" + MAX_RETRIES);
                rabbitTemplate.convertAndSend("retry-queue", order, m -> {
                    m.getMessageProperties().setHeader("x-retry-count", retryCount + 1);
                    return m;
                });
            }
        }
    }
}
```

## Explanation

The dead letter queue is a separate queue that receives messages the consumer could not process. The consumer tracks retry attempts. After a configurable threshold (typically 3-5 retries), instead of putting the message back in the main queue, the consumer sends it to the DLQ.

The DLQ serves three purposes:
1. **Unblocks the main queue**: Poison messages no longer block healthy messages
2. **Preserves evidence**: Failed messages are stored with metadata about the failure reason
3. **Enables replay**: After fixing the bug, you can move messages from the DLQ back to the main queue

Most brokers support DLQs natively. SQS uses redrive policies. RabbitMQ uses dead letter exchanges. Kafka does not have DLQs natively but you can implement them with a separate topic.

## Variants

| Variant | Mechanism | Use Case | Tradeoff |
|---------|-----------|----------|----------|
| **Broker DLQ** | SQS redrive, RabbitMQ DLX | Native broker support | Broker-specific configuration |
| **Application DLQ** | Manual send to error queue | Full control, custom logic | More code, must handle routing |
| **DLQ Topic** | Kafka error topic | Kafka environments | No native support, manual implementation |
| **Exponential Backoff + DLQ** | Retry with delay, then DLQ | Transient + permanent failures | More complex, handles both cases |
| **Transactional DLQ** | DB transaction with DLQ write | Exactly-once with error handling | Slower, DB dependency |

## What Works

- Set a reasonable retry threshold (3-5 attempts) before moving to DLQ
- Include failure metadata: error message, stack trace, original timestamp, retry count
- Monitor DLQ depth and alert when messages appear
- Build a replay mechanism to move messages from DLQ back to main queue after fixing bugs
- Use exponential backoff between retries to handle transient failures
- Set a TTL on DLQ messages to prevent unbounded storage growth
- Log every DLQ transfer for auditing

## Common Mistakes

- **No retry before DLQ**: A single failure sends the message to DLQ. Transient failures (network blips) should be retried first.
- **Infinite retries without DLQ**: The message loops forever, blocking the queue. Always set a max retry count.
- **Not preserving original message**: The DLQ message should contain the original payload, not just the error.
- **No DLQ monitoring**: Messages accumulate in the DLQ unnoticed. Set alarms on DLQ depth.
- **Replaying without fixing**: Moving messages back to the main queue without fixing the bug causes them to fail again.
- **DLQ as a trash can**: The DLQ is for inspection and replay, not permanent storage. Process or archive messages regularly.

## FAQ

### How many retries before sending to DLQ?

Typically 3-5 for immediate retries. With exponential backoff, you can go higher (5-10) since delays increase. The right number depends on your tolerance for latency vs. your desire to handle transient failures.

### Should I use broker-native DLQ or application-level?

Broker-native (SQS redrive, RabbitMQ DLX) when possible — less code and fewer bugs. Application-level when you need custom logic (conditional DLQ based on error type, different DLQs for different failures).

### How do I replay messages from the DLQ?

Write a tool or admin endpoint that reads from the DLQ and sends messages back to the main queue. Include a flag or header to indicate it is a replay so the consumer can skip deduplication if needed.

### What happens if the DLQ itself fills up?

Set a TTL or retention policy on the DLQ. For SQS, the maximum retention is 14 days. For RabbitMQ, configure queue max-length or TTL. Archive old DLQ messages to cold storage if needed.

### Can I have different DLQs for different error types?

Yes. Route messages to different DLQs based on error type (e.g., `validation-errors` vs `infrastructure-errors`). This makes debugging and replay easier since you can fix one error type and replay only those messages.


## Advanced Topics

### Scenario: Dead Letter Queue for Failed Payments

```typescript
// DLQ: messages that fail after N retries go to a dead letter queue
// Architecture: Main Queue -> Worker -> Retry Queue -> DLQ

// SQS: configure redrive policy
const redrivePolicy = {
  deadLetterTargetArn: "arn:aws:sqs:us-east-1:123:payment-dlq",
  maxReceiveCount: "3",  // After 3 failed attempts -> DLQ
};

// Worker: process payments with error handling
async function processPaymentMessage(message: SQSMessage): Promise<void> {
  const payment = JSON.parse(message.Body);
  try {
    await processPayment(payment);
    await sqs.deleteMessage({
      QueueUrl: PAYMENT_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    }).promise();
  } catch (err) {
    // Message returns to queue after visibility timeout
    // After maxReceiveCount, SQS moves it to DLQ automatically
    console.error(`Payment ${payment.id} failed:`, err.message);
  }
}

// DLQ consumer: investigate and reprocess
async function processDLQ(): Promise<void> {
  const result = await sqs.receiveMessage({
    QueueUrl: PAYMENT_DLQ_URL,
    MaxNumberOfMessages: 10,
  }).promise();

  for (const msg of result.Messages || []) {
    const payment = JSON.parse(msg.Body);
    const error = JSON.parse(msg.MessageAttributes?.error?.StringValue || "{}");

    // Categorize failure
    if (error.type === "insufficient_funds") {
      await notifyCustomer(payment.customerId, "Payment failed: insufficient funds");
    } else if (error.type === "card_declined") {
      await retryWithNewCard(payment);
    } else {
      await alertOpsTeam(payment, error);
    }

    // Archive for audit
    await archiveFailedPayment(payment, error);
    await sqs.deleteMessage({ QueueUrl: PAYMENT_DLQ_URL, ReceiptHandle: msg.ReceiptHandle }).promise();
  }
}

// Monitoring
  | Metric | Target | Alert |
  |--------|--------|-------|
  | DLQ depth | 0 | > 10 |
  | DLQ age (oldest) | < 1h | > 4h |
  | Main queue failures | < 1% | > 5% |
  | Reprocess success | > 80% | < 50% |
```

Lessons:
  - DLQ isolates messages that fail after max retries
  - SQS auto-moves to DLQ after maxReceiveCount
  - DLQ consumer investigates, categorizes and reprocesses
  - Some failures are permanent (card declined): notify customer
  - Some are transient (service down): reprocess after fix
  - Always archive DLQ messages for audit trail
  - Monitor DLQ depth: alert if growing
```

### How do I reprocess from DLQ?

Move the message back to the main queue after fixing the root cause. In SQS: read from DLQ, send to main queue, delete from DLQ. Use a tool or script: do not reprocess manually in production. Add a retry counter to avoid infinite loops. For permanent failures (invalid data), do not reprocess: archive and notify. For transient failures (service was down), reprocess after confirming the service is healthy.
