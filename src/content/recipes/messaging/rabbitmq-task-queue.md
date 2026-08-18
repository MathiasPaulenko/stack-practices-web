---
contentType: recipes
slug: rabbitmq-task-queue
title: "Task Queues and RPC with RabbitMQ and AMQP"
description: "Distribute background tasks and implement request-reply patterns with RabbitMQ using durable queues, dead-letter exchanges, and prefetch for controlled concurrency."
metaDescription: "Implement task queues and RPC with RabbitMQ. Use durable queues, dead-letter exchanges, and prefetch for reliable task distribution and controlled concurrency."
difficulty: intermediate
topics:
  - messaging
tags:
  - messaging
  - microservices
  - rabbitmq
  - amqp
  - task-queue
  - rpc
  - dead-letter
relatedResources:
  - /recipes/background-jobs
  - /recipes/dead-letter-queue
  - /recipes/message-idempotency
  - /recipes/event-driven-architecture
  - /recipes/retry-backoff
  - /guides/message-queue-guide
lastUpdated: "2026-08-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Implement task queues and RPC with RabbitMQ. Use durable queues, dead-letter exchanges, and prefetch for reliable task distribution and controlled concurrency."
  keywords:
    - rabbitmq
    - amqp
    - task queue
    - dead letter
    - rpc
    - messaging
---

## Overview

RabbitMQ is a solid choice for distributing background work and calling services
synchronously over AMQP. This recipe covers how to set up a durable task queue,
retry failed messages, route poison messages to a dead-letter queue, and
use the request-reply pattern for RPC.

## When to Use

- Move slow work such as image processing or sending emails out of the main
  request so it doesn't block. See [Background Jobs](/recipes/background-jobs/)
for related patterns.
- Retry a failed task a few times, then set it aside for inspection. See
  [Retry Backoff](/recipes/retry-backoff/) for retry strategies.
- You need request-reply communication that feels synchronous but skips the
  overhead of HTTP. For HTTP alternatives, see [Call REST API](/recipes/call-rest-api/).

## Solution

### 1. Producer with durable queue and DLX

```typescript
// rabbitmq/producer.ts
import * as amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

// Dead-letter exchange for failed messages
await channel.assertExchange('dlx', 'direct');
await channel.assertQueue('email.tasks.dlq', { durable: true });
await channel.bindQueue('email.tasks.dlq', 'dlx', 'email.tasks');

// Durable queue with a dead-letter policy
await channel.assertQueue('email.tasks', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-routing-key': 'email.tasks',
  },
});

async function sendEmailTask(email: unknown): Promise<void> {
  channel.sendToQueue('email.tasks', Buffer.from(JSON.stringify(email)), {
    persistent: true,
    headers: { 'x-attempt': 1 },
  });
}
```

### 2. Worker with prefetch and retry

```typescript
// rabbitmq/worker.ts
import * as amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

await channel.prefetch(5); // Process up to 5 messages concurrently per worker

await channel.consume('email.tasks', async (msg) => {
  if (!msg) return;

  const email = JSON.parse(msg.content.toString());
  const attempt = msg.properties.headers?.['x-attempt'] || 1;

  try {
    await sendEmail(email);
    channel.ack(msg);
  } catch (error) {
    if (attempt >= 3) {
      // Drop the message after three attempts; the DLX routes it to the DLQ
      channel.nack(msg, false, false);
    } else {
      // Reject the original message and republish with an incremented attempt
      channel.nack(msg, false, false);
      channel.sendToQueue('email.tasks', msg.content, {
        persistent: true,
        headers: { 'x-attempt': attempt + 1 },
      });
    }
  }
});

async function sendEmail(email: unknown): Promise<void> {
  // Your email-sending logic here
  console.log('Sending email:', email);
}
```

### 3. Request-reply RPC pattern

```typescript
// rabbitmq/rpc-client.ts
import * as amqp from 'amqplib';

async function rpcCall(queue: string, payload: unknown): Promise<unknown> {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

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

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// rabbitmq/rpc-server.ts
import * as amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();

await channel.assertQueue('calc.multiply');
await channel.consume('calc.multiply', (msg) => {
  if (!msg) return;

  const { a, b } = JSON.parse(msg.content.toString());
  const result = a * b;

  channel.sendToQueue(
    msg.properties.replyTo,
    Buffer.from(JSON.stringify({ result })),
    { correlationId: msg.properties.correlationId },
  );

  channel.ack(msg);
});
```

### 4. Docker Compose setup

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

## Explanation

- **Exchanges** pick which queues receive a message based on binding rules. A
  `direct` exchange sends the message to every queue whose binding key matches the
  routing key.
- If both queues and messages are durable, your messages survive a broker
  restart. Without durability, the broker drops everything when it restarts.
- **Prefetch** limits how many unacknowledged messages each consumer can hold at
  once, so a fast consumer can't hoard work and starve others.
- **Dead-letter exchanges (DLX)** catch messages that are rejected without
  requeue, that exceed a TTL, or that hit the max-delivery count. That gives you
  a place to look at failures without losing the message.
- **RPC over AMQP** relies on a temporary reply queue and a `correlationId`. The
  client listens on the reply queue and the server echoes the `correlationId`
  in the response.

## Variants

| Approach | Best for | Trade-off |
| --- | --- | --- |
| Direct exchange | Exact queue routing | No pattern matching |
| Topic exchange | Pattern-based routing (`orders.*.created`) | Slightly more overhead |
| Fanout exchange | Broadcasting to many consumers | Ignores routing keys |
| Work queue with prefetch | Load balancing among workers | Requires manual ack |
| RPC with reply queue | Synchronous service calls | Adds latency and complexity |

### Python equivalent with `pika`

```python
import pika
import json

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

channel.exchange_declare(exchange='dlx', exchange_type='direct')
channel.queue_declare(queue='email.tasks.dlq', durable=True)
channel.queue_bind(queue='email.tasks.dlq', exchange='dlx', routing_key='email.tasks')

channel.queue_declare(
    queue='email.tasks',
    durable=True,
    arguments={
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'email.tasks',
    },
)

def send_email_task(email):
    channel.basic_publish(
        exchange='',
        routing_key='email.tasks',
        body=json.dumps(email),
        properties=pika.BasicProperties(
            delivery_mode=2,  # persistent
            headers={'x-attempt': 1},
        ),
    )

send_email_task({'to': 'user@example.com', 'subject': 'Hello'})
connection.close()
```

## Best Practices

- Acknowledge messages manually, because auto-ack can lose work if the consumer
  crashes mid-processing.
- Set `prefetch` based on how long each task takes and how many consumers you
  have, starting with 5–10 and tuning from there.
- Declare queues and exchanges as `durable` so they survive a broker restart.
- Add a DLX to any queue that matters, give it a dedicated DLQ, and cap retries
  — three attempts, for example, before the message is routed out.
- Keep an eye on queue depth, consumer lag, and DLQ growth, because a sudden
  depth spike usually means a consumer is down or slow.

## Common Mistakes

- Completely forgetting to acknowledge a message, which lets unacknowledged
  messages pile up in memory and exhaust the broker.
- Relying on auto-ack for long or fallible tasks is risky; when the worker
  crashes, the message disappears.
- Creating exclusive reply queues in RPC and never closing the connection, which
  leaves queues sitting on the broker.
- Keeping a failed message in the retry loop for good instead of capping retries
  and sending poison messages to a DLQ.
- Publishing to a durable queue but leaving `persistent: true` off, so the
  message gets lost when the broker restarts.

## FAQ

### How is this different from Kafka?

RabbitMQ works as a message broker with flexible routing and low latency per
message. Kafka, on the other hand, is an event log optimized for high throughput
and replay.
Kafka doesn't support request-reply natively and uses different delivery
semantics.

### Should I use a direct or topic exchange?

Use a `direct` exchange when the queue or routing key is exact. Use a `topic`
exchange when pattern matching is needed, such as `orders.us.created` and
`orders.eu.created` both matching `orders.*.created`.

### Is this solution production-ready?

These patterns are common in production, but you still need monitoring,
connection recovery, authentication, and TLS to match your environment.

### What are the performance characteristics?

A typical RabbitMQ work queue can move thousands to tens of thousands of messages
per second per node. Throughput drops with heavy routing logic or
large messages. To scale, you add more nodes or consumers.

### How do I debug issues with this approach?

The management UI on port 15672 gives you queue depth, consumer count, and
message rates. Then check consumer logs, confirm the connection is open, and make
sure your DLQ isn't filling up.
