---
contentType: patterns
slug: message-queue-load-leveling-pattern
title: "Message Queue Load Leveling Pattern"
description: "Smooth traffic spikes by placing a queue between a producer and a consumer. The producer writes messages at any rate; the consumer processes them at a steady pace."
metaDescription: "Smooth traffic spikes with a queue between producer and consumer. Producers write at any rate; consumers process at a steady, controlled pace."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - load-leveling
  - pattern
  - design-pattern
  - message-queue
  - traffic-smoothing
  - async-processing
  - backpressure
relatedResources:
  - /patterns/design/priority-queue-pattern
  - /patterns/design/publish-subscribe-pattern
  - /patterns/design/dead-letter-channel-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Smooth traffic spikes with a queue between producer and consumer. Producers write at any rate; consumers process at a steady, controlled pace."
  keywords:
    - message queue load leveling
    - traffic smoothing queue
    - async processing pattern
    - pattern design
---

## Overview

When a service receives bursty traffic, it can overwhelm downstream systems that are not designed for spikes. A database might handle 50 queries per second steadily but crash at 500 queries per second in a burst. The Message Queue Load Leveling pattern places a queue between the producer and consumer so the producer can write messages at any rate while the consumer processes them at a controlled, steady pace.

## When to Use

- Traffic to a downstream system is bursty and the system cannot handle spikes
- You need to decouple request rate from processing rate
- Tasks are time-insensitive (users do not need immediate responses)
- You want to scale consumers independently from producers

## Solution

### Python (Celery + Redis)

```python
from celery import Celery
import time

app = Celery("tasks", broker="redis://localhost:6379", backend="redis://localhost:6379")

# Consumer processes one task at a time at its own pace
@app.task(bind=True, max_retries=3)
def process_order(self, order_id):
    try:
        # Simulate slow processing (e.g., DB writes, API calls)
        time.sleep(2)
        print(f"Processed order {order_id}")
        return {"status": "done", "order_id": order_id}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=5)

# Producer enqueues at any rate
def submit_orders(order_ids):
    for order_id in order_ids:
        process_order.delay(order_id)
    print(f"Enqueued {len(order_ids)} orders")

# Burst: 1000 orders submitted instantly
# Consumer processes them 1 at a time every 2 seconds
submit_orders(range(1000))
```

### JavaScript (BullMQ + Redis)

```javascript
import { Queue, Worker } from "bullmq";

const orderQueue = new Queue("orders", {
  connection: { host: "localhost", port: 6379 },
});

// Producer: enqueue at any rate
async function submitOrders(orderIds) {
  const jobs = orderIds.map((id) => ({
    name: "process-order",
    data: { orderId: id },
  }));
  await orderQueue.addBulk(jobs);
  console.log(`Enqueued ${orderIds.length} orders`);
}

// Consumer: process at controlled rate
const worker = new Worker(
  "orders",
  async (job) => {
    // Simulate slow processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`Processed order ${job.data.orderId}`);
    return { status: "done", orderId: job.data.orderId };
  },
  {
    connection: { host: "localhost", port: 6379 },
    concurrency: 1, // Process one at a time
    limiter: { max: 1, duration: 2000 }, // Max 1 job per 2 seconds
  }
);

// Burst: 1000 orders submitted instantly
await submitOrders(Array.from({ length: 1000 }, (_, i) => i));
```

### Java (RabbitMQ + Spring AMQP)

```java
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class OrderProcessor {

    private final RabbitTemplate rabbitTemplate;

    public OrderProcessor(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    // Producer: send at any rate
    public void submitOrders(List<Integer> orderIds) {
        for (Integer orderId : orderIds) {
            rabbitTemplate.convertAndSend("orders", "order." + orderId, orderId);
        }
        System.out.println("Enqueued " + orderIds.size() + " orders");
    }

    // Consumer: process one at a time
    @RabbitListener(queues = "orders", concurrency = "1")
    public void processOrder(Integer orderId) {
        try {
            Thread.sleep(2000); // Simulate slow processing
            System.out.println("Processed order " + orderId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## Explanation

The queue acts as a buffer between producer and consumer. The producer pushes messages into the queue as fast as it can. The consumer pulls messages from the queue at a rate it can handle. If the producer sends 1000 messages in a second but the consumer processes 1 per 2 seconds, the queue grows to 1000 messages and drains slowly over 2000 seconds.

This protects the downstream system from being overwhelmed. The tradeoff is latency: messages wait in the queue until the consumer can process them. For time-sensitive workloads, increase consumer concurrency or use the Priority Queue pattern.

## Variants

| Variant | Queue Type | Use Case | Tradeoff |
|---------|-----------|----------|----------|
| **Single Consumer** | FIFO queue | Strict ordering, simple | Slow throughput |
| **Multiple Consumers** | FIFO queue | Higher throughput | No ordering guarantee |
| **Priority Queue** | Priority queue | Some messages are urgent | Complexity in priority logic |
| **Scheduled Delay** | Delayed queue | Process at specific times | Messages wait until scheduled time |
| **Batch Processing** | Batch consumer | Group messages for efficiency | Higher latency per message |

## What Works

- Size the queue based on expected burst volume and consumer processing rate
- Monitor queue depth and alert when it grows beyond a threshold
- Scale consumers horizontally when queue depth is consistently high
- Use dead-letter queues for messages that fail after max retries
- Set visibility timeouts to prevent double-processing if a consumer crashes
- Use idempotent consumers to handle duplicate deliveries safely

## Common Mistakes

- **No queue depth monitoring**: A growing queue means consumers cannot keep up. Without monitoring, you find out when the queue runs out of storage.
- **Consumer too slow for sustained traffic**: Load leveling handles bursts, not sustained overload. If average production rate exceeds consumption rate, the queue grows forever.
- **Not handling poison messages**: A message that always fails blocks the consumer. Use a dead-letter queue after N retries.
- **Synchronous producer waiting for consumer**: Defeats the purpose. The producer should fire-and-forget.
- **Ignoring message ordering**: If ordering matters, a single consumer or partitioning strategy is needed. Multiple consumers break ordering.

## FAQ

### How is this different from the Producer-Consumer pattern?

Load Leveling focuses on smoothing traffic spikes by buffering in a queue. Producer-Consumer is a general concurrency pattern for dividing work. Load Leveling is a specific application with emphasis on rate decoupling.

### What happens if the queue grows too large?

You need to either scale consumers, shed load (drop low-priority messages), or implement backpressure to slow the producer. Monitor queue depth and set alerts.

### Should I use a managed queue service or self-hosted?

Managed services (SQS, Azure Service Bus, Cloud Pub/Sub) handle scaling, durability, and monitoring. Self-hosted (RabbitMQ, Redis) gives more control but requires ops. For most teams, managed is the right choice.

### Can I use this with serverless functions?

Yes. SQS triggers Lambda, which acts as the consumer. Lambda scales automatically based on queue depth, but you can control concurrency to protect downstream systems.
