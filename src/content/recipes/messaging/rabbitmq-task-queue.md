---
contentType: recipes
slug: rabbitmq-task-queue
title: "Task Queues and RPC with RabbitMQ and AMQP"
description: "Implement reliable task distribution and request-reply patterns using RabbitMQ with durable queues, dead-letter exchanges, and prefetch for controlled concurrency"
metaDescription: "Implement task queues and RPC with RabbitMQ. Use durable queues, dead-letter exchanges, and prefetch for reliable task distribution and controlled concurrency."
difficulty: intermediate
topics:
  - messaging
  - devops
tags:
  - messaging
  - microservices
  - devops
relatedResources:
  - /recipes/messaging/kafka-event-streaming
  - /recipes/event-driven-architecture
  - /recipes/devops/background-jobs
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implement task queues and RPC with RabbitMQ. Use durable queues, dead-letter exchanges, and prefetch for reliable task distribution and controlled concurrency."
  keywords:
    - rabbitmq
    - amqp
    - task queue
    - dead letter
    - rpc
---

# Task Queues and RPC with RabbitMQ and AMQP

Distribute background tasks reliably and implement request-reply patterns using RabbitMQ. This recipe covers durable queues, dead-letter exchanges for failed messages, prefetch limits for controlled concurrency, and RPC over AMQP for synchronous calls across services.

## When to Use This

- Background jobs (image processing, email sending) must not block the main request flow. See [Scheduled Jobs](/recipes/devops/background-jobs) for recurring task automation.
- Failed tasks should be retried with exponential backoff or routed to dead-letter queues. See [Retry Logic](/recipes/architecture/retry-backoff) for exponential backoff patterns.
- Services need synchronous RPC-style communication without HTTP overhead. See [Call REST API](/recipes/api/call-rest-api) for synchronous HTTP alternatives.

## Solution

### 1. Producer with Durable Queue

```typescript
// rabbitmq/producer.ts
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Durable queue survives broker restart
await channel.assertQueue('email.tasks', {
  durable: true,
});

// Dead letter exchange for failed messages
await channel.assertExchange('dlx', 'direct');
await channel.assertQueue('email.tasks.dlq', { durable: true });
await channel.bindQueue('email.tasks.dlq', 'dlx', 'email.tasks');

async function sendEmailTask(email: unknown): Promise<void> {
  channel.sendToQueue('email.tasks', Buffer.from(JSON.stringify(email)), {
    persistent: true,
    headers: { 'x-attempt': 1 },
  });
}
```

### 2. Worker with Prefetch and Ack

```typescript
// rabbitmq/worker.ts
const channel = await connection.createChannel();

await channel.prefetch(5); // Process 5 messages concurrently per worker

await channel.consume('email.tasks', async (msg) => {
  if (!msg) return;

  const email = JSON.parse(msg.content.toString());
  const attempt = msg.properties.headers?.['x-attempt'] || 1;

  try {
    await sendEmail(email);
    channel.ack(msg); // Remove from queue on success
  } catch (error) {
    if (attempt >= 3) {
      // Reject and send to dead letter queue
      channel.reject(msg, false);
    } else {
      // Nack and requeue for retry
      channel.nack(msg, false, true);

      // Publish with incremented attempt
      channel.sendToQueue('email.tasks', msg.content, {
        persistent: true,
        headers: { 'x-attempt': attempt + 1 },
      });
    }
  }
});
```

### 3. Request-Reply RPC Pattern

```typescript
// rabbitmq/rpc-client.ts
async function rpcCall(queue: string, payload: unknown): Promise<unknown> {
  const correlationId = generateId();
  const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('RPC timeout')), 5000);

    channel.consume(replyQueue, (msg) => {
      if (msg?.properties.correlationId === correlationId) {
        clearTimeout(timeout);
        resolve(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      }
    });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      replyTo: replyQueue,
      correlationId,
      expiration: '5000',
    });
  });
}

// rabbitmq/rpc-server.ts
await channel.assertQueue('calc.multiply');
await channel.consume('calc.multiply', (msg) => {
  if (!msg) return;

  const { a, b } = JSON.parse(msg.content.toString());
  const result = a * b;

  channel.sendToQueue(
    msg.properties.replyTo,
    Buffer.from(JSON.stringify({ result })),
    { correlationId: msg.properties.correlationId }
  );

  channel.ack(msg);
});
```

### 4. Docker Compose Setup

```yaml
# docker-compose.rabbitmq.yml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: secret
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  rabbitmq_data:
```

## How It Works

- **Exchanges** route messages to queues based on binding rules
- **Durable queues** persist messages across broker restarts
- **Prefetch** limits unacknowledged messages per consumer to prevent overload
- **Dead-letter exchanges** receive messages that are rejected or expire
- **RPC** uses reply queues and correlation IDs to match responses to requests

## Production Considerations

- Use quorum queues for replicated, fault-tolerant message storage
- Monitor queue depth with the management plugin or Prometheus exporter
- Implement circuit breakers on the producer side when queue depth exceeds thresholds

## Common Mistakes

- Not acknowledging messages, causing memory exhaustion on the broker
- Using auto-ack for long-running tasks that may fail
- Creating reply queues without cleanup, causing queue leaks in RPC

## FAQ

**Q: How is this different from Kafka?**
A: RabbitMQ supports complex routing, RPC, and lower latency per message. Kafka excels at high-throughput log streaming and replay.

**Q: Should I use topic or direct exchanges?**
A: Use direct for simple routing by key. Use topic for pattern-based routing (e.g., `orders.*.created`).
