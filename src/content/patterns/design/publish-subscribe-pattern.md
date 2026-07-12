---





contentType: patterns
slug: publish-subscribe-pattern
title: "Publish-Subscribe Pattern"
description: "Broadcast events to multiple independent subscribers. Publishers send messages to a topic without knowing which subscribers exist, enabling loose coupling between producers and consumers."
metaDescription: "Broadcast events to multiple independent subscribers via a topic. Publishers send without knowing subscribers, enabling loose coupling between producers and consumers."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - publish-subscribe
  - pattern
  - design-pattern
  - event-driven
  - pub-sub
  - message-broker
  - decoupling
relatedResources:
  - /patterns/message-queue-load-leveling-pattern
  - /patterns/serverless-fanout-pattern
  - /patterns/dead-letter-channel-pattern
  - /patterns/actor-model-pattern
  - /patterns/message-deduplication-pattern
  - /patterns/reactive-streams-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Broadcast events to multiple independent subscribers via a topic. Publishers send without knowing subscribers, enabling loose coupling between producers and consumers."
  keywords:
    - publish subscribe pattern
    - pub sub event driven
    - broadcast messages subscribers
    - pattern design





---

## Overview

In a point-to-point queue, each message is processed by exactly one consumer. But many systems need multiple independent reactions to the same event. When an order is placed, the inventory service updates stock, the notification service sends a confirmation email, and the analytics service records the event. The Publish-Subscribe pattern broadcasts a message to all subscribers of a topic, so each subscriber receives its own copy and processes it independently.

## When to Use


- For alternatives, see [Event-Carried State Transfer Pattern](/patterns/event-carried-state-transfer-pattern/).

- Multiple services need to react to the same event independently
- You want to decouple the producer from the consumers (producer does not know who consumes)
- New consumers can be added without modifying the producer
- Different consumers process the event at different speeds or with different logic

## Solution

### Python (Redis Pub/Sub)

```python
import redis
import json
import threading

r = redis.Redis(host="localhost", port=6379)

# Publisher
def publish_order(order_id, total):
    event = {"type": "order.created", "order_id": order_id, "total": total}
    r.publish("order.events", json.dumps(event))
    print(f"Published: {event}")

# Subscriber 1: Inventory service
def inventory_subscriber():
    pubsub = r.pubsub()
    pubsub.subscribe("order.events")
    for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            if event["type"] == "order.created":
                print(f"[Inventory] Updating stock for order {event['order_id']}")

# Subscriber 2: Notification service
def notification_subscriber():
    pubsub = r.pubsub()
    pubsub.subscribe("order.events")
    for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            if event["type"] == "order.created":
                print(f"[Notification] Sending confirmation for order {event['order_id']}")

# Start subscribers in threads
threading.Thread(target=inventory_subscriber, daemon=True).start()
threading.Thread(target=notification_subscriber, daemon=True).start()

# Publish events
publish_order(1, 99.99)
publish_order(2, 49.99)
```

### JavaScript (RabbitMQ — fanout exchange)

```javascript
import amqp from "amqplib";

async function setup() {
  const conn = await amqp.connect("amqp://localhost");
  const channel = await conn.createChannel();

  // Fanout exchange broadcasts to all bound queues
  await channel.assertExchange("order.events", "fanout", { durable: true });

  // Create queues for each subscriber
  const { queue: inventoryQueue } = await channel.assertQueue("inventory", {
    durable: true,
  });
  const { queue: notificationQueue } = await channel.assertQueue("notification", {
    durable: true,
  });

  // Bind queues to the fanout exchange
  await channel.bindQueue(inventoryQueue, "order.events", "");
  await channel.bindQueue(notificationQueue, "order.events", "");

  // Publisher
  async function publishOrder(orderId, total) {
    const event = JSON.stringify({ type: "order.created", orderId, total });
    channel.publish("order.events", "", Buffer.from(event), {
      persistent: true,
    });
    console.log(`Published: order ${orderId}`);
  }

  // Subscriber 1: Inventory
  channel.consume(inventoryQueue, (msg) => {
    if (!msg) return;
    const event = JSON.parse(msg.content.toString());
    console.log(`[Inventory] Updating stock for order ${event.orderId}`);
    channel.ack(msg);
  });

  // Subscriber 2: Notification
  channel.consume(notificationQueue, (msg) => {
    if (!msg) return;
    const event = JSON.parse(msg.content.toString());
    console.log(`[Notification] Sending confirmation for order ${event.orderId}`);
    channel.ack(msg);
  });

  // Publish events
  await publishOrder(1, 99.99);
  await publishOrder(2, 49.99);
}

setup();
```

### Java (Spring + Kafka topics)

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class OrderEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OrderEventPublisher(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    // Publisher
    public void publishOrder(Long orderId, double total) {
        try {
            String event = objectMapper.writeValueAsString(
                new OrderEvent("order.created", orderId, total)
            );
            kafkaTemplate.send("order-events", String.valueOf(orderId), event);
            System.out.println("Published: order " + orderId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to publish", e);
        }
    }

    // Subscriber 1: Inventory
    @KafkaListener(topics = "order-events", groupId = "inventory-service")
    public void handleInventory(String message) {
        OrderEvent event = parseEvent(message);
        if ("order.created".equals(event.getType())) {
            System.out.println("[Inventory] Updating stock for order " + event.getOrderId());
        }
    }

    // Subscriber 2: Notification
    @KafkaListener(topics = "order-events", groupId = "notification-service")
    public void handleNotification(String message) {
        OrderEvent event = parseEvent(message);
        if ("order.created".equals(event.getType())) {
            System.out.println("[Notification] Sending confirmation for order " + event.getOrderId());
        }
    }

    private OrderEvent parseEvent(String message) {
        try {
            return objectMapper.readValue(message, OrderEvent.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse event", e);
        }
    }
}
```

## Explanation

The publisher sends messages to a topic (or exchange) without knowing which subscribers exist. The broker maintains a list of subscriptions for each topic. When a message arrives, the broker delivers a copy to each subscriber.

**Fanout exchange** (RabbitMQ): Broadcasts every message to all queues bound to the exchange. Each queue gets its own copy, and each consumer reads from its queue independently.

**Kafka consumer groups**: Kafka uses consumer groups to implement pub/sub. Each consumer group gets its own copy of every message. Within a group, partitions are distributed among consumers for parallelism.

**Redis Pub/Sub**: Fire-and-forget. If a subscriber is not listening when a message is published, it misses it. Use Redis Streams instead for durability.

The key benefit is **loose coupling**: the publisher does not know or care about subscribers. Adding a new subscriber (e.g., an analytics service) requires no changes to the publisher or other subscribers.

## Variants

| Variant | Mechanism | Use Case | Tradeoff |
|---------|-----------|----------|----------|
| **Fanout Exchange** | RabbitMQ fanout | All subscribers get all messages | No filtering at broker level |
| **Topic Exchange** | RabbitMQ topic with routing keys | Subscribers filter by pattern | More complex routing |
| **Kafka Consumer Groups** | Kafka topics + groups | Durable, partitioned, replayable | More infrastructure |
| **SNS + SQS** | AWS SNS fanout to SQS queues | Managed, durable per-subscriber | AWS-only, cost per message |
| **Redis Pub/Sub** | Redis channels | Simple, low latency | No durability, messages lost if offline |

## What Works

- Use durable queues for each subscriber so messages survive broker restarts
- Give each subscriber its own queue (not shared) so they process independently
- Use consumer groups in Kafka to scale within a subscriber service
- Include event type in the message so subscribers can filter relevant events
- Make subscribers idempotent — the same event may be delivered more than once
- Monitor subscriber lag — a slow subscriber can build up a large queue
- Use dead-letter queues per subscriber so one failing subscriber does not affect others

## Common Mistakes

- **Shared queue for multiple subscribers**: All subscribers compete for messages instead of each getting a copy. Each subscriber needs its own queue.
- **Redis Pub/Sub for critical events**: Messages are lost if a subscriber is offline. Use Redis Streams or a durable broker for events that must not be lost.
- **Synchronous subscribers blocking the publisher**: If the publisher waits for subscriber acknowledgments, slow subscribers block the publisher. Use async delivery.
- **No filtering by event type**: Subscribers process every event even if they only care about one type. Use topic exchanges or filter in the consumer.
- **Adding subscribers without scaling the broker**: More subscribers means more message copies. Ensure the broker can handle the increased throughput.
- **Not handling slow consumers**: A subscriber that cannot keep up builds up messages. Set max queue depth and alerts.

## FAQ

### How is pub/sub different from a message queue?

In a message queue, each message is consumed by exactly one consumer. In pub/sub, each message is delivered to all subscribers. Queues are for work distribution; pub/sub is for event broadcasting.

### Should I use Kafka or RabbitMQ for pub/sub?

Kafka if you need durability, replay, high throughput, and partitioned processing. RabbitMQ if you need simpler setup, lower latency, and flexible routing. For managed cloud solutions, SNS+SQS (AWS) or Service Bus topics (Azure) are good options.

### Can subscribers process events at different speeds?

Yes. Each subscriber has its own queue and processes independently. A slow subscriber does not affect other subscribers. Monitor queue depth per subscriber to detect lag.

### What happens if a subscriber is down?

With durable queues, messages accumulate in the subscriber's queue while it is offline. When the subscriber reconnects, it processes the backlog. With Redis Pub/Sub, messages are lost.

### How do I add a new subscriber?

Create a new queue, bind it to the topic/exchange, and start consuming. No changes needed to the publisher or existing subscribers. This is the main benefit of the pattern.


## Advanced Topics

### Scenario: Pub/Sub for Order Notifications

```typescript
// Pub/Sub: decouple producer from consumers
class EventBus {
  private subscribers = new Map<string, Set<(data: unknown) => void>>();

  subscribe(event: string, handler: (data: unknown) => void): () => void {
    if (!this.subscribers.has(event)) this.subscribers.set(event, new Set());
    this.subscribers.get(event)!.add(handler);
    // Return unsubscribe function
    return () => this.subscribers.get(event)?.delete(handler);
  }

  publish(event: string, data: unknown): void {
    this.subscribers.get(event)?.forEach(handler => {
      try { handler(data); }
      catch (err) { console.error(`[PUB/SUB] Handler error for ${event}:`, err); }
    });
  }
}

// Domain events
interface OrderCreated { orderId: string; customerEmail: string; total: number; }
interface OrderShipped { orderId: string; trackingNumber: string; }
interface OrderCancelled { orderId: string; reason: string; }

// Usage: multiple decoupled subscribers
const bus = new EventBus();

// Subscriber 1: send email
bus.subscribe("order.created", (data: OrderCreated) => {
  emailService.send(data.customerEmail, "Order confirmed", `Total: ${data.total}`);
});

// Subscriber 2: update analytics
bus.subscribe("order.created", (data: OrderCreated) => {
  analytics.track("order_created", { total: data.total });
});

// Subscriber 3: invalidate cache
bus.subscribe("order.created", () => {
  cache.invalidate("orders:recent");
});

// Subscriber 4: notify shipping
bus.subscribe("order.shipped", (data: OrderShipped) => {
  smsService.send(data.orderId, `Shipped: ${data.trackingNumber}`);
});

// Publisher: the order service
async function createOrder(order: Order) {
  await db.save(order);
  bus.publish("order.created", { orderId: order.id, customerEmail: order.email, total: order.total });
}

// The publisher does not know the subscribers
```

Lessons:
  - Pub/Sub decouples producer from consumers
  - The publisher does not know who the subscribers are
  - Multiple subscribers react to the same event
  - Adding new subscriber does not require changing the publisher
  - In distributed systems: use Kafka, RabbitMQ, SNS+SQS
  - In memory: EventEmitter or custom EventBus
```

### Pub/Sub vs Observer: which do I use?

Pub/Sub is broader: the publisher does not know subscribers, there is a bus/broker in between. Observer is more direct: the subject knows the observers. Use Pub/Sub for distributed systems or when you want total decoupling. Use Observer for notifications within the same module. Pub/Sub scales better: the broker routes events. Observer is simpler: no broker. For microservices, Pub/Sub. For reactive forms, Observer.
